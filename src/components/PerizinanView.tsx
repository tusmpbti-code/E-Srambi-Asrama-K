/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileCheck2,
  Calendar,
  Clock,
  User,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Plus,
  QrCode,
  Camera,
  CameraOff,
  Volume2,
  VolumeX,
  Printer,
  Download,
  RotateCcw,
  ArrowRight,
  Shield,
  Phone,
  MapPin,
  FileText,
  AlertCircle,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Trash2,
  Check,
  X,
  Send,
  Home,
  LogOut,
  LogIn,
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  SantriPermission,
  PermissionType,
  PermissionStatus,
  PermissionFilter,
  PermissionDashboardStats,
  Santri,
  Kelas,
  Kamar,
  ActiveNavMenu,
  getSantriKamarText,
} from '../types';
import {
  getPermissions,
  getPermissionById,
  createPermission,
  updatePermissionStatus,
  recordSantriReturnByBarcode,
  recordSantriDepartureByBarcode,
  getPermissionDashboardStats,
  deletePermission,
  CreatePermissionInput,
  getActivePermissionForSantri,
} from '../services/permissionService';
import { getSantriList, getKelasList, getKamarList, findSantriByBarcode } from '../services/santriService';
import { useAuth } from '../context/AuthContext';
import { playSuccessChime, playWarningChime, playErrorChime } from '../lib/sound';

interface PerizinanViewProps {
  onNavigate?: (menu: ActiveNavMenu) => void;
}

export const PerizinanView: React.FC<PerizinanViewProps> = ({ onNavigate }) => {
  const { currentRole, profile, isConfigured } = useAuth();
  const canManage = ['SUPER_ADMIN', 'ADMIN', 'PENGURUS_ASRAMA', 'PETUGAS_PERIZINAN'].includes(currentRole);

  // Data states
  const [permissions, setPermissions] = useState<SantriPermission[]>([]);
  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [kamarList, setKamarList] = useState<Kamar[]>([]);
  const [stats, setStats] = useState<PermissionDashboardStats>({
    totalIzinHariIni: 0,
    sedangKeluar: 0,
    pulang: 0,
    belumKembali: 0,
    terlambat: 0,
    menungguPersetujuan: 0,
    belumKembaliList: [],
  });
  const [loading, setLoading] = useState(true);

  // Quick return barcode bar state
  const [quickReturnBarcode, setQuickReturnBarcode] = useState('');

  // ID YYS search state in Create Permission Modal
  const [inputSearchIdYys, setInputSearchIdYys] = useState('');
  const [idYysSearchError, setIdYysSearchError] = useState<string | null>(null);

  // Tab filter
  const [activeTab, setActiveTab] = useState<
    'SEMUA' | 'DIAJUKAN' | 'BELUM_KEMBALI' | 'TERLAMBAT' | 'SELESAI'
  >('SEMUA');

  // Filter criteria
  const [filterJenis, setFilterJenis] = useState<PermissionType | 'SEMUA'>('SEMUA');
  const [filterKelas, setFilterKelas] = useState<string>('SEMUA');
  const [filterKamar, setFilterKamar] = useState<string>('SEMUA');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<SantriPermission | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Alert/Toast feedback
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'warning' | 'error';
    title: string;
    message: string;
  } | null>(null);

  // Scanner States (used in check-in modal and create modal)
  const [cameraActive, setCameraActive] = useState(false);
  const [scannerMode, setScannerMode] = useState<'return' | 'create'>('return');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [modalFeedback, setModalFeedback] = useState<{
    type: 'success' | 'warning' | 'error';
    title: string;
    message: string;
  } | null>(null);
  const [scanningDetected, setScanningDetected] = useState<string | null>(null);
  const isProcessingScanRef = useRef<boolean>(false);
  const lastScannedCodeRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'perizinan-camera-viewport';

  // Load all data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [permData, santriData, klsData, kmrData, statsData] = await Promise.all([
        getPermissions(),
        getSantriList(),
        getKelasList(),
        getKamarList(),
        getPermissionDashboardStats(),
      ]);
      setPermissions(permData);
      setSantriList(santriData);
      setKelasList(klsData);
      setKamarList(kmrData);
      setStats(statsData);
    } catch (err) {
      console.error('Error loading perizinan data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Clean up scanner on unmount or modal close
  const stopCamera = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch {
        // ignore
      }
      scannerRef.current = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Filtered permission list
  const filteredPermissions = permissions.filter((p) => {
    // Tab filter
    if (activeTab === 'DIAJUKAN' && p.status !== 'DIAJUKAN') return false;
    if (activeTab === 'BELUM_KEMBALI') {
      const isBelumKembali =
        (p.status === 'SUDAH_KELUAR' || p.status === 'DISETUJUI') && !p.waktu_kembali;
      if (!isBelumKembali) return false;
    }
    if (activeTab === 'TERLAMBAT') {
      const now = new Date();
      const batasTime = new Date(p.batas_kembali);
      const isLate =
        p.status === 'TERLAMBAT' ||
        (p.status === 'SUDAH_KELUAR' && !p.waktu_kembali && now > batasTime);
      if (!isLate) return false;
    }
    if (activeTab === 'SELESAI') {
      if (!['SUDAH_KEMBALI', 'SELESAI'].includes(p.status)) return false;
    }

    // Jenis filter
    if (filterJenis !== 'SEMUA' && p.jenis !== filterJenis) return false;

    // Kelas filter
    if (filterKelas !== 'SEMUA' && p.santri?.kelas_id !== filterKelas) return false;

    // Kamar filter
    if (filterKamar !== 'SEMUA') {
      const santriKamar = getSantriKamarText(p.santri);
      if (p.santri?.kamar_id !== filterKamar && santriKamar !== filterKamar) return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = p.santri?.nama.toLowerCase().includes(q);
      const matchId = p.santri?.id_yys.toLowerCase().includes(q);
      const matchTujuan = p.tujuan.toLowerCase().includes(q);
      const matchAlasan = p.alasan.toLowerCase().includes(q);
      const matchWali = p.penanggung_jawab.toLowerCase().includes(q);
      if (!matchName && !matchId && !matchTujuan && !matchAlasan && !matchWali) return false;
    }

    return true;
  });

  // Handle Check-In Kepulangan Santri via Barcode
  const handleCheckInBarcode = async (barcodeText: string) => {
    const cleanCode = barcodeText.trim();
    if (!cleanCode) return;

    setScanLoading(true);
    try {
      const result = await recordSantriReturnByBarcode(cleanCode, profile?.email);
      if (result.success) {
        if (result.isLate) {
          if (soundEnabled) playWarningChime();
          const fb = {
            type: 'warning' as const,
            title: 'SANTRI KEMBALI TERLAMBAT',
            message: result.message,
          };
          setFeedback(fb);
          setModalFeedback(fb);
        } else {
          if (soundEnabled) playSuccessChime();
          const fb = {
            type: 'success' as const,
            title: 'KEPULANGAN TERCATAT SUKSES',
            message: result.message,
          };
          setFeedback(fb);
          setModalFeedback(fb);
        }
        await loadData();
        setBarcodeInput('');
      } else {
        if (soundEnabled) playErrorChime();
        const fb = {
          type: 'error' as const,
          title: 'GAGAL CATAT KEPULANGAN',
          message: result.message,
        };
        setFeedback(fb);
        setModalFeedback(fb);
      }
    } finally {
      setScanLoading(false);
    }
  };

  // Start Camera for scanning
  const startCamera = async (mode: 'return' | 'create') => {
    setScannerMode(mode);
    setCameraActive(true);
    setScanningDetected(null);
    setModalFeedback(null);

    // Hentikan scanner lama jika masih berjalan
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch {
        // Abaikan jika sudah dibersihkan
      }
      scannerRef.current = null;
    }

    setTimeout(async () => {
      try {
        // Konfigurasi format lengkap: 1D Barcode (CODE 128, CODE 39, EAN 13, dll) + 2D QR Code
        const supportedFormats = [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.CODABAR,
          Html5QrcodeSupportedFormats.ITF,
        ];

        const scanner = new Html5Qrcode(scannerContainerId, {
          formatsToSupport: supportedFormats,
          verbose: false,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
        });
        scannerRef.current = scanner;

        // Deteksi kamera belakang perangkat atau kamera default
        let cameraConfig: any = { facingMode: 'environment' };
        try {
          const cameras = await Html5Qrcode.getCameras();
          if (cameras && cameras.length > 0) {
            const backCam = cameras.find((c) =>
              /back|rear|environment|belakang|main/i.test(c.label)
            );
            cameraConfig = backCam ? backCam.id : cameras[0].id;
          }
        } catch {
          // Gunakan facingMode environment jika deteksi spesifik terhambat
        }

        await scanner.start(
          cameraConfig,
          {
            fps: 15,
            qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
              const width = Math.min(viewfinderWidth - 20, 360);
              const height = Math.min(Math.floor(viewfinderHeight * 0.75), 240);
              return { width, height };
            },
            aspectRatio: 1.333333,
          },
          async (decodedText) => {
            const clean = decodedText.trim();
            if (!clean) return;

            const now = Date.now();
            // Cegah duplikasi scan berturut-turut dalam 2.5 detik
            if (
              isProcessingScanRef.current ||
              (clean === lastScannedCodeRef.current && now - lastScanTimeRef.current < 2500)
            ) {
              return;
            }

            lastScannedCodeRef.current = clean;
            lastScanTimeRef.current = now;
            isProcessingScanRef.current = true;
            setScanningDetected(clean);

            try {
              if (mode === 'return') {
                await handleCheckInBarcode(clean);
              } else if (mode === 'create') {
                await handleSelectSantriByBarcode(clean);
              }
            } finally {
              setTimeout(() => {
                isProcessingScanRef.current = false;
                setScanningDetected(null);
              }, 1200);
            }
          },
          () => {
            // Frame tidak mendeteksi barcode, abaikan
          }
        );
      } catch (err) {
        console.error('Camera init error:', err);
        setCameraActive(false);
        const errFb = {
          type: 'error' as const,
          title: 'Kamera Tidak Tersedia',
          message: 'Pastikan izin kamera diizinkan di browser Anda atau gunakan input manual / USB barcode scanner.',
        };
        setFeedback(errFb);
        setModalFeedback(errFb);
      }
    }, 250);
  };

  // Select Santri by barcode for new permission
  const handleSelectSantriByBarcode = async (barcodeVal: string) => {
    const clean = barcodeVal.trim();
    if (!clean) return;

    setScanLoading(true);
    try {
      const s = await findSantriByBarcode(clean);
      if (s) {
        if (soundEnabled) playSuccessChime();
        await stopCamera();
        setShowCheckInModal(false);
        setNewPermData((prev) => ({
          ...prev,
          santri_id: s.id,
          penanggung_jawab: s.nama_wali || '',
          kontak_penanggung_jawab: s.kontak_wali || '',
        }));
        setShowCreateModal(true);
        setFeedback({
          type: 'success',
          title: 'Santri Terpilih',
          message: `Santri ${s.nama} (${s.id_yys}) berhasil dipilih dari barcode.`,
        });
      } else {
        if (soundEnabled) playErrorChime();
        const errFb = {
          type: 'error' as const,
          title: 'Santri Tidak Ditemukan',
          message: `Tidak ditemukan santri dengan Barcode / ID YYS "${clean}".`,
        };
        setFeedback(errFb);
        setModalFeedback(errFb);
      }
    } finally {
      setScanLoading(false);
    }
  };

  // State for Create Permission Form
  const [newPermData, setNewPermData] = useState<{
    santri_id: string;
    jenis: PermissionType;
    alasan: string;
    tujuan: string;
    tanggal_keluar: string;
    jam_keluar: string;
    batas_kembali_date: string;
    batas_kembali_time: string;
    penanggung_jawab: string;
    kontak_penanggung_jawab: string;
    catatan: string;
    status: PermissionStatus;
  }>({
    santri_id: '',
    jenis: 'IZIN_PULANG',
    alasan: '',
    tujuan: '',
    tanggal_keluar: new Date().toISOString().split('T')[0],
    jam_keluar: '14:00',
    batas_kembali_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    batas_kembali_time: '17:00',
    penanggung_jawab: '',
    kontak_penanggung_jawab: '',
    catatan: '',
    status: canManage ? 'DISETUJUI' : 'DIAJUKAN',
  });

  const [formSantriConflict, setFormSantriConflict] = useState<SantriPermission | null>(null);

  // Check conflicting permission whenever santri_id changes in form
  useEffect(() => {
    if (!newPermData.santri_id) {
      setFormSantriConflict(null);
      return;
    }
    const selectedS = santriList.find((s) => s.id === newPermData.santri_id);
    if (selectedS) {
      if (!newPermData.penanggung_jawab) {
        setNewPermData((prev) => ({
          ...prev,
          penanggung_jawab: selectedS.nama_wali || '',
          kontak_penanggung_jawab: selectedS.kontak_wali || '',
        }));
      }
    }

    async function checkConflict() {
      const active = await getActivePermissionForSantri(newPermData.santri_id);
      setFormSantriConflict(active);
    }
    checkConflict();
  }, [newPermData.santri_id, santriList]);

  // Cari & Pasang Santri Berdasarkan ID YYS / Barcode / NIS
  const handleApplySantriByIdYys = (rawText: string) => {
    const clean = rawText.trim().toLowerCase();
    if (!clean) {
      setIdYysSearchError('Silakan masukkan ID YYS santri.');
      return;
    }

    const exactMatch = santriList.find(
      (s) =>
        s.id_yys.toLowerCase() === clean ||
        (s.nis && s.nis.toLowerCase() === clean) ||
        (s.barcode_value && s.barcode_value.toLowerCase() === clean)
    );

    const partialMatch = !exactMatch
      ? santriList.find(
          (s) =>
            s.id_yys.toLowerCase().includes(clean) ||
            (s.nis && s.nis.toLowerCase().includes(clean)) ||
            s.nama.toLowerCase().includes(clean)
        )
      : null;

    const matched = exactMatch || partialMatch;

    if (matched) {
      setNewPermData((prev) => ({
        ...prev,
        santri_id: matched.id,
        penanggung_jawab: prev.penanggung_jawab || matched.nama_wali || '',
        kontak_penanggung_jawab: prev.kontak_penanggung_jawab || matched.kontak_wali || '',
      }));
      setInputSearchIdYys(matched.id_yys);
      setIdYysSearchError(null);
    } else {
      setIdYysSearchError(`Santri dengan ID YYS / Barcode "${rawText}" tidak ditemukan.`);
    }
  };

  // Submit New Permission
  const handleSubmitCreatePermission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPermData.santri_id) {
      setFeedback({
        type: 'error',
        title: 'Santri Belum Dipilih',
        message: 'Pilih santri terlebih dahulu.',
      });
      return;
    }
    if (!newPermData.alasan.trim() || !newPermData.tujuan.trim()) {
      setFeedback({
        type: 'error',
        title: 'Form Belum Lengkap',
        message: 'Alasan dan Tujuan izin wajib diisi.',
      });
      return;
    }

    // Combine batas kembali
    const batasKembaliIso = new Date(
      `${newPermData.batas_kembali_date}T${newPermData.batas_kembali_time}:00`
    ).toISOString();

    const payload: CreatePermissionInput = {
      santri_id: newPermData.santri_id,
      jenis: newPermData.jenis,
      alasan: newPermData.alasan,
      tujuan: newPermData.tujuan,
      tanggal_keluar: newPermData.tanggal_keluar,
      jam_keluar: newPermData.jam_keluar + ':00',
      batas_kembali: batasKembaliIso,
      penanggung_jawab: newPermData.penanggung_jawab,
      kontak_penanggung_jawab: newPermData.kontak_penanggung_jawab,
      catatan: newPermData.catatan,
      status: newPermData.status,
      dibuat_oleh: profile?.email || 'Pengurus',
      disetujui_oleh: newPermData.status === 'DISETUJUI' ? profile?.email || 'Pengurus' : undefined,
    };

    const res = await createPermission(payload, profile?.email);
    if (res.success) {
      if (soundEnabled) playSuccessChime();
      setFeedback({
        type: 'success',
        title: 'Izin Berhasil Dibuat',
        message: `Izin ${res.data?.jenis === 'IZIN_PULANG' ? 'Pulang' : 'Keluar'} untuk ${
          res.data?.santri?.nama
        } berhasil disimpan.`,
      });
      setShowCreateModal(false);
      await loadData();
    } else {
      if (soundEnabled) playErrorChime();
      setFeedback({
        type: 'error',
        title: 'Gagal Membuat Izin',
        message: res.error || 'Terjadi kesalahan saat menyimpan data izin.',
      });
    }
  };

  // Status Action Handler
  const handleUpdateStatus = async (
    id: string,
    newStatus: PermissionStatus,
    catatanTambahan?: string
  ) => {
    if (!canManage) {
      setFeedback({
        type: 'warning',
        title: 'Akses Dibatasi',
        message: 'Hanya Admin dan Pengurus Asrama yang berhak mengubah status perizinan.',
      });
      return;
    }

    const res = await updatePermissionStatus(id, newStatus, {
      catatan: catatanTambahan,
      userEmail: profile?.email,
    });

    if (res.success) {
      if (soundEnabled) playSuccessChime();
      setFeedback({
        type: 'success',
        title: 'Status Diperbarui',
        message: `Status izin berhasil diubah menjadi "${newStatus}".`,
      });
      await loadData();
      if (selectedPermission && selectedPermission.id === id) {
        setSelectedPermission(res.data || null);
      }
    } else {
      if (soundEnabled) playErrorChime();
      setFeedback({
        type: 'error',
        title: 'Gagal Memperbarui Status',
        message: res.error || 'Terjadi kesalahan.',
      });
    }
  };

  // Delete permission
  const handleDelete = async (id: string) => {
    if (!['SUPER_ADMIN', 'ADMIN'].includes(currentRole)) {
      setFeedback({
        type: 'warning',
        title: 'Akses Ditolak',
        message: 'Hanya Super Admin dan Admin yang dapat menghapus data izin.',
      });
      return;
    }

    if (!confirm('Apakah Anda yakin ingin menghapus catatan izin ini?')) return;

    const res = await deletePermission(id, profile?.email);
    if (res.success) {
      setFeedback({
        type: 'success',
        title: 'Data Dihapus',
        message: 'Catatan perizinan berhasil dihapus.',
      });
      setShowDetailModal(false);
      await loadData();
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredPermissions.length === 0) {
      alert('Tidak ada data perizinan untuk diekspor.');
      return;
    }

    const headers = [
      'ID Izin',
      'ID YYS',
      'Nama Santri',
      'Kelas',
      'Kamar',
      'Jenis Izin',
      'Alasan',
      'Tujuan',
      'Tanggal Keluar',
      'Jam Keluar',
      'Batas Kembali',
      'Waktu Kembali',
      'Penanggung Jawab',
      'Kontak Wali',
      'Status',
      'Catatan',
    ];

    const rows = filteredPermissions.map((p) => [
      p.id,
      p.santri?.id_yys || '',
      `"${p.santri?.nama || ''}"`,
      `"${p.santri?.kelas?.nama_kelas || ''}"`,
      `"${getSantriKamarText(p.santri)}"`,
      p.jenis === 'IZIN_PULANG' ? 'Izin Pulang' : 'Izin Keluar',
      `"${p.alasan.replace(/"/g, '""')}"`,
      `"${p.tujuan.replace(/"/g, '""')}"`,
      p.tanggal_keluar,
      p.jam_keluar,
      p.batas_kembali,
      p.waktu_kembali || '',
      `"${p.penanggung_jawab.replace(/"/g, '""')}"`,
      `"${p.kontak_penanggung_jawab || ''}"`,
      p.status,
      `"${(p.catatan || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Laporan_Perizinan_Santri_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper formatting
  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // Helper for Status Badge styling
  const getStatusBadge = (status: PermissionStatus, batasKembali: string, waktuKembali?: string | null) => {
    const now = new Date();
    const isOverdue =
      status === 'SUDAH_KELUAR' && !waktuKembali && now > new Date(batasKembali);

    if (status === 'TERLAMBAT' || isOverdue) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
          <AlertTriangle className="w-3 h-3" />
          <span>TERLAMBAT</span>
        </span>
      );
    }

    switch (status) {
      case 'DIAJUKAN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3" />
            <span>Diajukan</span>
          </span>
        );
      case 'DISETUJUI':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <CheckCircle2 className="w-3 h-3" />
            <span>Disetujui</span>
          </span>
        );
      case 'SUDAH_KELUAR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200">
            <LogOut className="w-3 h-3" />
            <span>Sudah Keluar</span>
          </span>
        );
      case 'SUDAH_KEMBALI':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <LogIn className="w-3 h-3" />
            <span>Sudah Kembali</span>
          </span>
        );
      case 'SELESAI':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
            <Check className="w-3 h-3" />
            <span>Selesai</span>
          </span>
        );
      case 'DITOLAK':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
            <XCircle className="w-3 h-3" />
            <span>Ditolak</span>
          </span>
        );
      case 'DIBATALKAN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <X className="w-3 h-3" />
            <span>Dibatalkan</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border flex items-start justify-between gap-3 shadow-sm transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : feedback.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-start gap-3">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : feedback.type === 'warning' ? (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <h4 className="font-bold text-sm">{feedback.title}</h4>
              <p className="text-xs mt-0.5 leading-relaxed">{feedback.message}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header View */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Modul Perizinan Santri
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Terpadu & Realtime
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Pengelolaan Izin Pulang, Izin Keluar, verifikasi batas waktu, dan check-in barcode kepulangan santri.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Tombol Check-in Kepulangan Barcode */}
            <button
              id="btn-checkin-barcode"
              type="button"
              onClick={() => {
                setShowCheckInModal(true);
                startCamera('return');
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <QrCode className="w-4 h-4 text-emerald-400" />
              <span>Scan Kepulangan Santri</span>
            </button>

            {/* Tombol Buat Izin Baru */}
            <button
              id="btn-tambah-izin"
              type="button"
              onClick={() => {
                setNewPermData({
                  santri_id: '',
                  jenis: 'IZIN_PULANG',
                  alasan: '',
                  tujuan: '',
                  tanggal_keluar: new Date().toISOString().split('T')[0],
                  jam_keluar: '14:00',
                  batas_kembali_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split('T')[0],
                  batas_kembali_time: '17:00',
                  penanggung_jawab: '',
                  kontak_penanggung_jawab: '',
                  catatan: '',
                  status: canManage ? 'DISETUJUI' : 'DIAJUKAN',
                });
                setShowCreateModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Izin Baru</span>
            </button>

            {/* Tombol Ekspor CSV */}
            <button
              id="btn-export-perizinan-csv"
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold transition-colors"
              title="Ekspor CSV"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Ekspor CSV</span>
            </button>
          </div>
        </div>

        {/* 5 Kartu Statistik Perizinan */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mt-6">
          {/* Sedang Keluar */}
          <div className="bg-amber-50/50 p-3.5 rounded-2xl border border-amber-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                Sedang Keluar
              </span>
              <LogOut className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <span className="text-2xl font-black text-amber-700 mt-1 block">
              {loading ? '...' : stats.sedangKeluar}
            </span>
            <span className="text-[10px] text-amber-600 font-medium">Izin Keluar Aktif</span>
          </div>

          {/* Santri Pulang */}
          <div className="bg-blue-50/50 p-3.5 rounded-2xl border border-blue-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">
                Santri Pulang
              </span>
              <Home className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <span className="text-2xl font-black text-blue-700 mt-1 block">
              {loading ? '...' : stats.pulang}
            </span>
            <span className="text-[10px] text-blue-600 font-medium">Izin Pulang ke Rumah</span>
          </div>

          {/* Belum Kembali */}
          <div className="bg-orange-50/50 p-3.5 rounded-2xl border border-orange-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-orange-800 uppercase tracking-wider">
                Belum Kembali
              </span>
              <Clock className="w-3.5 h-3.5 text-orange-600" />
            </div>
            <span className="text-2xl font-black text-orange-700 mt-1 block">
              {loading ? '...' : stats.belumKembali}
            </span>
            <span className="text-[10px] text-orange-600 font-medium">Di Luar Pondok</span>
          </div>

          {/* Terlambat Kembali */}
          <div className="bg-rose-50/50 p-3.5 rounded-2xl border border-rose-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">
                Terlambat
              </span>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            </div>
            <span className="text-2xl font-black text-rose-700 mt-1 block">
              {loading ? '...' : stats.terlambat}
            </span>
            <span className="text-[10px] text-rose-600 font-medium">Lewat Batas Waktu</span>
          </div>

          {/* Menunggu Persetujuan */}
          <div className="bg-purple-50/50 p-3.5 rounded-2xl border border-purple-200 shadow-2xs col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider">
                Menunggu
              </span>
              <Clock className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <span className="text-2xl font-black text-purple-700 mt-1 block">
              {loading ? '...' : stats.menungguPersetujuan}
            </span>
            <span className="text-[10px] text-purple-600 font-medium">Status Diajukan</span>
          </div>
        </div>

        {/* QUICK BARCODE & ID YYS KEPULANGAN SCANNER BAR */}
        {canManage && (
          <div className="mt-6 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 rounded-2xl p-4 sm:p-5 text-white shadow-md border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30 shrink-0">
                <QrCode className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
                    Scan Barcode / ID YYS Kepulangan Santri
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Scanner USB & Manual
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Scan barcode pada kartu santri atau ketik ID YYS lalu tekan Enter untuk langsung mencatat santri kembali.
                </p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (quickReturnBarcode.trim()) {
                  handleCheckInBarcode(quickReturnBarcode.trim());
                  setQuickReturnBarcode('');
                }
              }}
              className="flex items-center gap-2 max-w-md w-full"
            >
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={quickReturnBarcode}
                  onChange={(e) => setQuickReturnBarcode(e.target.value)}
                  placeholder="Scan barcode kartu atau isi ID YYS..."
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 focus:outline-hidden font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={scanLoading || !quickReturnBarcode.trim()}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-xs"
              >
                <LogIn className="w-4 h-4" />
                <span>{scanLoading ? '...' : 'Catat Kembali'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCheckInModal(true);
                  startCamera('return');
                }}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 transition-colors"
                title="Buka Kamera Barcode Scanner"
              >
                <Camera className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* FILTER & TABS */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
        {/* Nav Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('SEMUA')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              activeTab === 'SEMUA'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Izin ({permissions.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('BELUM_KEMBALI')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === 'BELUM_KEMBALI'
                ? 'bg-orange-600 text-white'
                : 'bg-orange-50 text-orange-800 hover:bg-orange-100 border border-orange-200'
            }`}
          >
            <span>Belum Kembali</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/30 font-black">
              {stats.belumKembali}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('TERLAMBAT')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === 'TERLAMBAT'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <span>Terlambat</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/30 font-black">
              {stats.terlambat}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('DIAJUKAN')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === 'DIAJUKAN'
                ? 'bg-purple-600 text-white'
                : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
            }`}
          >
            <span>Menunggu Persetujuan</span>
            {stats.menungguPersetujuan > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-200 text-purple-900 font-black">
                {stats.menungguPersetujuan}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SELESAI')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              activeTab === 'SELESAI'
                ? 'bg-emerald-700 text-white'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            Sudah Kembali / Selesai
          </button>
        </div>

        {/* Dropdowns and search bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-search-perizinan"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari santri, ID YYS, tujuan, wali..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* Jenis Izin */}
          <div>
            <select
              id="select-filter-jenis"
              value={filterJenis}
              onChange={(e) => setFilterJenis(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white"
            >
              <option value="SEMUA">Semua Jenis (Pulang & Keluar)</option>
              <option value="IZIN_PULANG">Izin Pulang (Rumah)</option>
              <option value="IZIN_KELUAR">Izin Keluar (Keperluan Luar)</option>
            </select>
          </div>

          {/* Kelas */}
          <div>
            <select
              id="select-filter-kelas"
              value={filterKelas}
              onChange={(e) => setFilterKelas(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white"
            >
              <option value="SEMUA">Semua Kelas</option>
              {kelasList.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama_kelas} ({k.tingkat})
                </option>
              ))}
            </select>
          </div>

          {/* Kamar */}
          <div>
            <select
              id="select-filter-kamar"
              value={filterKamar}
              onChange={(e) => setFilterKamar(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white"
            >
              <option value="SEMUA">Semua Kamar Asrama</option>
              {kamarList.map((kmr) => (
                <option key={kmr.id} value={kmr.nama_kamar}>
                  {kmr.nama_kamar}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* TABLE DAFTAR PERIZINAN */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              Daftar Riwayat Perizinan Santri
            </h3>
            <p className="text-xs text-slate-500">
              Menampilkan {filteredPermissions.length} dari total {permissions.length} perizinan.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 hidden sm:inline">Role aktif:</span>
            <span className="font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
              {currentRole}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs">Memuat data perizinan...</p>
          </div>
        ) : filteredPermissions.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <FileText className="w-10 h-10 mx-auto text-slate-300" />
            <p className="font-bold text-sm text-slate-700">Tidak ada data perizinan</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Tidak ditemukan catatan izin yang sesuai dengan filter atau kriteria pencarian yang Anda pilih.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Santri</th>
                  <th className="py-3 px-4">Jenis & Alasan</th>
                  <th className="py-3 px-4">Tujuan</th>
                  <th className="py-3 px-4">Waktu Keluar</th>
                  <th className="py-3 px-4">Batas Kembali</th>
                  <th className="py-3 px-4">Waktu Kembali</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredPermissions.map((item) => {
                  const now = new Date();
                  const batasDate = new Date(item.batas_kembali);
                  const isLate =
                    item.status === 'SUDAH_KELUAR' && !item.waktu_kembali && now > batasDate;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isLate || item.status === 'TERLAMBAT' ? 'bg-rose-50/30' : ''
                      }`}
                    >
                      {/* Santri */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0">
                            {item.santri?.nama.charAt(0) || 'S'}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">
                              {item.santri?.nama || 'Nama Santri'}
                            </span>
                            <span className="font-mono text-[11px] text-slate-500">
                              {item.santri?.id_yys} • {getSantriKamarText(item.santri) ? `Kamar ${getSantriKamarText(item.santri)}` : 'Kamar -'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Jenis & Alasan */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div>
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.jenis === 'IZIN_PULANG'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {item.jenis === 'IZIN_PULANG' ? 'Izin Pulang' : 'Izin Keluar'}
                          </span>
                          <p className="text-slate-800 font-medium truncate mt-0.5">
                            {item.alasan}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            PJ: {item.penanggung_jawab}
                          </p>
                        </div>
                      </td>

                      {/* Tujuan */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-1 text-slate-700">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                          <span className="line-clamp-2 max-w-[160px]">{item.tujuan}</span>
                        </div>
                      </td>

                      {/* Waktu Keluar */}
                      <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                        <span className="font-medium block">{item.tanggal_keluar}</span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {item.jam_keluar.substring(0, 5)} WIB
                        </span>
                      </td>

                      {/* Batas Kembali */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`font-semibold block ${
                            isLate ? 'text-rose-700 font-bold' : 'text-slate-800'
                          }`}
                        >
                          {formatDateTime(item.batas_kembali)}
                        </span>
                        {isLate && (
                          <span className="text-[10px] text-rose-600 font-bold">
                            Melewati Batas!
                          </span>
                        )}
                      </td>

                      {/* Waktu Kembali */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {item.waktu_kembali ? (
                          <span className="text-emerald-700 font-medium font-mono text-[11px]">
                            {formatDateTime(item.waktu_kembali)}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Belum kembali</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getStatusBadge(item.status, item.batas_kembali, item.waktu_kembali)}
                      </td>

                      {/* Aksi */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Tombol Setujui jika DIAJUKAN */}
                          {item.status === 'DIAJUKAN' && canManage && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(item.id, 'DISETUJUI')}
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                              title="Setujui Izin"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}

                          {/* Tombol Tolak jika DIAJUKAN */}
                          {item.status === 'DIAJUKAN' && canManage && (
                            <button
                              type="button"
                              onClick={() => {
                                const reason = prompt('Masukkan alasan penolakan:');
                                if (reason !== null) {
                                  handleUpdateStatus(item.id, 'DITOLAK', `Ditolak: ${reason}`);
                                }
                              }}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors"
                              title="Tolak Izin"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}

                          {/* Tombol Catat Keluar jika DISETUJUI */}
                          {item.status === 'DISETUJUI' && canManage && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(item.id, 'SUDAH_KELUAR')}
                              className="px-2 py-1 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-[11px] flex items-center gap-1 transition-colors"
                              title="Catat Santri Berangkat / Keluar"
                            >
                              <LogOut className="w-3 h-3" />
                              <span>Keluar</span>
                            </button>
                          )}

                          {/* Tombol Catat Kembali jika SUDAH_KELUAR */}
                          {item.status === 'SUDAH_KELUAR' && canManage && (
                            <>
                              <button
                                type="button"
                                onClick={async () => {
                                  const isOver = now > batasDate;
                                  const newSt = isOver ? 'TERLAMBAT' : 'SUDAH_KEMBALI';
                                  await handleUpdateStatus(item.id, newSt);
                                }}
                                className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 transition-colors"
                                title="Catat Santri Kembali"
                              >
                                <LogIn className="w-3 h-3" />
                                <span>Kembali</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  const code = item.santri?.barcode_value || item.santri?.id_yys || '';
                                  if (code) {
                                    handleCheckInBarcode(code);
                                  } else {
                                    setShowCheckInModal(true);
                                    startCamera('return');
                                  }
                                }}
                                className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition-colors"
                                title={`Scan Barcode Kepulangan: ${item.santri?.nama}`}
                              >
                                <QrCode className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {/* Tombol Detail */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPermission(item);
                              setShowDetailModal(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                            title="Detail & Surat Izin"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================================================== */}
      {/* MODAL 1: CHECK-IN KEPULANGAN VIA SCAN BARCODE */}
      {/* ============================================================================== */}
      {showCheckInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-slate-900 text-emerald-400">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {scannerMode === 'create'
                      ? 'Pindai Barcode / ID YYS Santri'
                      : 'Scan Barcode Kepulangan Santri'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {scannerMode === 'create'
                      ? 'Arahkan kamera ke kartu santri untuk memilih otomatis ke formulir perizinan.'
                      : 'Sistem mendeteksi izin aktif & mengevaluasi batas waktu kembali.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setShowCheckInModal(false);
                  setModalFeedback(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* In-Modal Feedback Banner */}
            {modalFeedback && (
              <div
                className={`p-3 rounded-2xl border text-xs flex items-start justify-between gap-2.5 ${
                  modalFeedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : modalFeedback.type === 'warning'
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-start gap-2">
                  {modalFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : modalFeedback.type === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-bold">{modalFeedback.title}</p>
                    <p className="mt-0.5 leading-relaxed">{modalFeedback.message}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalFeedback(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Camera Viewport */}
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-4/3 flex items-center justify-center">
                <div id={scannerContainerId} className="w-full h-full" />
                {cameraActive ? (
                  <>
                    <div className="absolute top-2.5 left-2.5 px-2.5 py-1 bg-slate-900/80 text-emerald-400 text-[10px] font-semibold rounded-lg backdrop-blur-xs flex items-center gap-1.5 shadow-sm border border-emerald-500/20">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>Kamera Aktif • Barcode 1D & QR</span>
                    </div>
                    {scanningDetected && (
                      <div className="absolute inset-x-4 bottom-4 p-2 bg-emerald-600 text-white font-bold text-xs rounded-xl text-center shadow-lg animate-pulse flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Barcode Terbaca: {scanningDetected} (Memproses...)</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                    <CameraOff className="w-10 h-10 mb-2 text-slate-500" />
                    <p className="text-xs">Kamera tidak aktif.</p>
                    <button
                      type="button"
                      onClick={() => startCamera(scannerMode)}
                      className="mt-3 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Nyalakan Kamera</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between text-xs px-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1.5"
                  >
                    {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                    <span>Suara {soundEnabled ? 'Aktif' : 'Mati'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (cameraActive) {
                        stopCamera();
                      } else {
                        startCamera(scannerMode);
                      }
                    }}
                    className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1.5"
                  >
                    {cameraActive ? <CameraOff className="w-4 h-4 text-rose-500" /> : <Camera className="w-4 h-4 text-emerald-600" />}
                    <span>{cameraActive ? 'Matikan Kamera' : 'Buka Kamera'}</span>
                  </button>
                </div>

                <div className="text-[11px] text-slate-500">
                  Barcode 1D (Code128), QR, & Scanner USB
                </div>
              </div>

              {/* Quick Barcode Testing Buttons */}
              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                <p className="text-[11px] font-semibold text-slate-600">
                  Uji Coba Cepat (Klik ID Santri untuk simulasi scan):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { code: 'YYS202600126', label: 'Zayyan (Izin Aktif)' },
                    { code: 'YYS202600123', label: 'Farhan' },
                    { code: 'YYS202600124', label: 'Dani' },
                    { code: 'YYS202600125', label: 'Nabil' },
                  ].map((demo) => (
                    <button
                      key={demo.code}
                      type="button"
                      onClick={() => {
                        setBarcodeInput(demo.code);
                        if (scannerMode === 'return') {
                          handleCheckInBarcode(demo.code);
                        } else {
                          handleSelectSantriByBarcode(demo.code);
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-slate-200 text-slate-700 text-[11px] font-mono transition-colors"
                    >
                      {demo.label} ({demo.code})
                    </button>
                  ))}
                </div>
              </div>

              {/* Manual Input Barcode Fallback */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!barcodeInput.trim()) return;
                  if (scannerMode === 'return') {
                    handleCheckInBarcode(barcodeInput);
                  } else {
                    handleSelectSantriByBarcode(barcodeInput);
                  }
                }}
                className="pt-2 border-t border-slate-100 flex gap-2"
              >
                <input
                  id="input-checkin-barcode-manual"
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder={
                    scannerMode === 'create'
                      ? 'Ketik Barcode / ID YYS santri (e.g. YYS202600123)...'
                      : 'Ketik Barcode / ID YYS santri (e.g. YYS202600126)...'
                  }
                  className="flex-1 px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
                <button
                  type="submit"
                  disabled={scanLoading || !barcodeInput.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  {scanLoading
                    ? 'Memproses...'
                    : scannerMode === 'create'
                    ? 'Pilih Santri'
                    : 'Catat'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* MODAL 2: BUAT PENGANJUAN IZIN BARU */}
      {/* ============================================================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Buat Izin Santri Baru
                  </h3>
                  <p className="text-xs text-slate-500">
                    Lengkapi formulir izin santri pulang atau izin keluar.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCreatePermission} className="space-y-4">
              {/* Input ID YYS Santri & Selector */}
              <div className="space-y-2 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <label htmlFor="input-id-yys-izin" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-emerald-600" />
                    <span>Input ID YYS Santri / Scan Barcode</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setShowCheckInModal(true);
                      startCamera('create');
                    }}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-emerald-100/70 hover:bg-emerald-200/70 px-2 py-1 rounded-lg transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Scan Kamera</span>
                  </button>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="input-id-yys-izin"
                      type="text"
                      value={inputSearchIdYys}
                      onChange={(e) => {
                        setInputSearchIdYys(e.target.value);
                        setIdYysSearchError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleApplySantriByIdYys(inputSearchIdYys);
                        }
                      }}
                      placeholder="Ketik atau scan ID YYS (contoh: YYS202600126)..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleApplySantriByIdYys(inputSearchIdYys)}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors shrink-0 shadow-xs"
                  >
                    Terapkan
                  </button>
                </div>

                {idYysSearchError && (
                  <p className="text-xs text-rose-600 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{idYysSearchError}</span>
                  </p>
                )}

                {/* Tampilan Informasi Santri Terpilih */}
                {(() => {
                  const selectedSantri = santriList.find((s) => s.id === newPermData.santri_id);
                  if (!selectedSantri) return null;
                  return (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                          {selectedSantri.nama.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs sm:text-sm text-slate-900">
                              {selectedSantri.nama}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-200/80 text-emerald-900 border border-emerald-300">
                              ID: {selectedSantri.id_yys}
                            </span>
                            {selectedSantri.nis && (
                              <span className="px-1.5 py-0.2 rounded-md text-[10px] font-mono bg-white text-slate-600 border border-slate-200">
                                NIS: {selectedSantri.nis}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-600 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                            <span>Kelas: <strong>{selectedSantri.kelas?.nama_kelas || '-'}</strong></span>
                            <span>Kamar: <strong>{getSantriKamarText(selectedSantri)}</strong></span>
                            {selectedSantri.nama_wali && (
                              <span>Wali: <strong>{selectedSantri.nama_wali}</strong> {selectedSantri.kontak_wali ? `(${selectedSantri.kontak_wali})` : ''}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        <span className="px-2 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs">
                          <Check className="w-3 h-3" />
                          <span>Santri Terpilih</span>
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Alternatif Dropdown Pilih Santri */}
                <div className="pt-2 border-t border-slate-200/70">
                  <label htmlFor="select-santri-izin" className="block text-[11px] font-medium text-slate-500 mb-1">
                    Atau pilih santri dari daftar:
                  </label>
                  <select
                    id="select-santri-izin"
                    value={newPermData.santri_id}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const s = santriList.find((item) => item.id === selectedId);
                      setNewPermData({
                        ...newPermData,
                        santri_id: selectedId,
                        penanggung_jawab: newPermData.penanggung_jawab || s?.nama_wali || '',
                        kontak_penanggung_jawab: newPermData.kontak_penanggung_jawab || s?.kontak_wali || '',
                      });
                      if (s) {
                        setInputSearchIdYys(s.id_yys);
                        setIdYysSearchError(null);
                      }
                    }}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white font-medium"
                  >
                    <option value="">-- Pilih Nama Santri --</option>
                    {santriList.map((s) => {
                      const kamarDisplay = getSantriKamarText(s);
                      const kamarLabel = kamarDisplay ? (kamarDisplay.startsWith('Kamar') ? kamarDisplay : `Kamar ${kamarDisplay}`) : 'Kamar -';
                      return (
                        <option key={s.id} value={s.id}>
                          {s.nama} ({s.id_yys}) - {s.kelas?.nama_kelas || 'Kelas -'} / {kamarLabel} [{s.status_santri}]
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Conflict Alert Warning */}
              {formSantriConflict && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-2.5 text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Peringatan: Santri Sudah Memiliki Izin Aktif!</span>
                    <p className="mt-0.5 leading-relaxed">
                      Santri ini saat ini memiliki izin berstatus{' '}
                      <strong className="underline">{formSantriConflict.status}</strong> (
                      {formSantriConflict.jenis === 'IZIN_PULANG' ? 'Izin Pulang' : 'Izin Keluar'}) hingga{' '}
                      {formatDateTime(formSantriConflict.batas_kembali)}. Selesaikan atau batalkan izin aktif sebelum membuat yang baru.
                    </p>
                  </div>
                </div>
              )}

              {/* Jenis Izin (Cards selector) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Jenis Izin <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewPermData({ ...newPermData, jenis: 'IZIN_PULANG' })}
                    className={`p-3 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                      newPermData.jenis === 'IZIN_PULANG'
                        ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-500/20'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`p-2 rounded-xl ${newPermData.jenis === 'IZIN_PULANG' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <Home className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">1. IZIN PULANG</span>
                      <span className="text-[11px] text-slate-500">Pulang ke rumah orang tua / wali santri</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewPermData({ ...newPermData, jenis: 'IZIN_KELUAR' })}
                    className={`p-3 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                      newPermData.jenis === 'IZIN_KELUAR'
                        ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-500/20'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`p-2 rounded-xl ${newPermData.jenis === 'IZIN_KELUAR' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <LogOut className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">2. IZIN KELUAR</span>
                      <span className="text-[11px] text-slate-500">Keluar area pondok sementara (pasar, dokter, dll.)</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Alasan & Tujuan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="input-alasan-izin" className="text-xs font-bold text-slate-700">
                    Alasan Izin <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="input-alasan-izin"
                    type="text"
                    required
                    value={newPermData.alasan}
                    onChange={(e) => setNewPermData({ ...newPermData, alasan: e.target.value })}
                    placeholder="Contoh: Walimah keluarga, Kontrol dokter..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="input-tujuan-izin" className="text-xs font-bold text-slate-700">
                    Tujuan Izin <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="input-tujuan-izin"
                    type="text"
                    required
                    value={newPermData.tujuan}
                    onChange={(e) => setNewPermData({ ...newPermData, tujuan: e.target.value })}
                    placeholder="Contoh: Rumah orang tua di Malang, RSUD..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Waktu Keluar & Batas Waktu Kembali */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                {/* Waktu Keluar */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Jadwal Keluar</span>
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      id="input-tanggal-keluar"
                      type="date"
                      required
                      value={newPermData.tanggal_keluar}
                      onChange={(e) => setNewPermData({ ...newPermData, tanggal_keluar: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                    />
                    <input
                      id="input-jam-keluar"
                      type="time"
                      required
                      value={newPermData.jam_keluar}
                      onChange={(e) => setNewPermData({ ...newPermData, jam_keluar: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                    />
                  </div>
                </div>

                {/* Batas Waktu Kembali */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-rose-600" />
                    <span>Batas Waktu Kembali (Wajib)</span>
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      id="input-batas-kembali-date"
                      type="date"
                      required
                      value={newPermData.batas_kembali_date}
                      onChange={(e) => setNewPermData({ ...newPermData, batas_kembali_date: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                    />
                    <input
                      id="input-batas-kembali-time"
                      type="time"
                      required
                      value={newPermData.batas_kembali_time}
                      onChange={(e) => setNewPermData({ ...newPermData, batas_kembali_time: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Penanggung Jawab & Kontak */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="input-penanggung-jawab" className="text-xs font-bold text-slate-700">
                    Penanggung Jawab <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="input-penanggung-jawab"
                    type="text"
                    required
                    value={newPermData.penanggung_jawab}
                    onChange={(e) => setNewPermData({ ...newPermData, penanggung_jawab: e.target.value })}
                    placeholder="Nama orang tua / wali / pendamping"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="input-kontak-wali" className="text-xs font-bold text-slate-700">
                    Nomor Kontak / WhatsApp
                  </label>
                  <input
                    id="input-kontak-wali"
                    type="text"
                    value={newPermData.kontak_penanggung_jawab}
                    onChange={(e) => setNewPermData({ ...newPermData, kontak_penanggung_jawab: e.target.value })}
                    placeholder="0812xxxxxxx"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Catatan */}
              <div className="space-y-1">
                <label htmlFor="input-catatan-izin" className="text-xs font-bold text-slate-700">
                  Catatan Tambahan
                </label>
                <textarea
                  id="input-catatan-izin"
                  rows={2}
                  value={newPermData.catatan}
                  onChange={(e) => setNewPermData({ ...newPermData, catatan: e.target.value })}
                  placeholder="Instruksi khusus, surat keterangan, atau nomor surat..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              {/* Status Awal (hanya jika petugas berwenang) */}
              {canManage && (
                <div className="flex items-center gap-2 pt-1 text-xs">
                  <span className="font-bold text-slate-700">Status Persetujuan Langsung:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="initial-status"
                      checked={newPermData.status === 'DISETUJUI'}
                      onChange={() => setNewPermData({ ...newPermData, status: 'DISETUJUI' })}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-semibold text-emerald-700">Langsung Disetujui</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer ml-3">
                    <input
                      type="radio"
                      name="initial-status"
                      checked={newPermData.status === 'DIAJUKAN'}
                      onChange={() => setNewPermData({ ...newPermData, status: 'DIAJUKAN' })}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <span className="font-semibold text-purple-700">Sebagai Pengajuan (Draft)</span>
                  </label>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  id="btn-submit-izin"
                  type="submit"
                  disabled={Boolean(formSantriConflict)}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs"
                >
                  Simpan & Buat Izin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* MODAL 3: DETAIL PERIZINAN & CETAK SURAT DISPENSASI */}
      {/* ============================================================================== */}
      {showDetailModal && selectedPermission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-800">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Detail Perizinan Santri
                  </h3>
                  <p className="text-xs text-slate-500">ID Izin: {selectedPermission.id}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  title="Cetak Surat Izin"
                >
                  <Printer className="w-4 h-4" />
                  <span className="hidden sm:inline">Cetak Surat</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Box */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              {/* Header Surat */}
              <div className="text-center pb-3 border-b border-slate-200">
                <h4 className="font-black text-sm text-slate-900 uppercase tracking-wide">
                  SURAT IZIN & DISPENSASI SANTRI
                </h4>
                <p className="text-xs text-slate-500 font-medium">Pondok Pesantren Terpadu</p>
                <span className="inline-block mt-1 font-mono text-[11px] bg-slate-200 text-slate-800 px-2 py-0.5 rounded">
                  {selectedPermission.jenis === 'IZIN_PULANG' ? 'IZIN PULANG' : 'IZIN KELUAR'}
                </span>
              </div>

              {/* Data Santri */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">Nama Santri:</span>
                  <span className="font-bold text-slate-900">{selectedPermission.santri?.nama}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">ID YYS / Barcode:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedPermission.santri?.id_yys}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Kelas:</span>
                  <span className="font-medium text-slate-800">{selectedPermission.santri?.kelas?.nama_kelas || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Kamar:</span>
                  <span className="font-medium text-slate-800">{getSantriKamarText(selectedPermission.santri)}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 space-y-2 text-xs">
                <div>
                  <span className="text-slate-500 block">Keperluan / Alasan:</span>
                  <span className="font-bold text-slate-900">{selectedPermission.alasan}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Tujuan:</span>
                  <span className="font-medium text-slate-800">{selectedPermission.tujuan}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Penanggung Jawab:</span>
                  <span className="font-medium text-slate-800">
                    {selectedPermission.penanggung_jawab} ({selectedPermission.kontak_penanggung_jawab || 'Tidak ada kontak'})
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">Waktu Keluar:</span>
                  <span className="font-bold text-slate-900">
                    {selectedPermission.tanggal_keluar} {selectedPermission.jam_keluar.substring(0, 5)} WIB
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Batas Kembali:</span>
                  <span className="font-bold text-rose-700">
                    {formatDateTime(selectedPermission.batas_kembali)}
                  </span>
                </div>
              </div>

              {selectedPermission.waktu_kembali && (
                <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs">
                  <span className="text-emerald-800 font-bold block">Waktu Kembali Tercatat:</span>
                  <span className="font-mono text-emerald-900">
                    {formatDateTime(selectedPermission.waktu_kembali)}
                  </span>
                </div>
              )}

              {selectedPermission.catatan && (
                <div className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="font-bold block text-slate-700">Catatan Pengurus:</span>
                  <p className="mt-0.5">{selectedPermission.catatan}</p>
                </div>
              )}

              {/* Kolom Tanda Tangan */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 text-center text-[11px]">
                <div>
                  <p className="text-slate-500">Wali Santri / Penanggung Jawab,</p>
                  <div className="h-14" />
                  <p className="font-bold text-slate-900">({selectedPermission.penanggung_jawab})</p>
                </div>
                <div>
                  <p className="text-slate-500">Pengurus Asrama Pesantren,</p>
                  <div className="h-14" />
                  <p className="font-bold text-slate-900">({selectedPermission.disetujui_oleh || 'Bag. Keamanan & Perizinan'})</p>
                </div>
              </div>
            </div>

            {/* Quick Status Modifiers */}
            {canManage && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  {selectedPermission.status === 'DIAJUKAN' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(selectedPermission.id, 'DISETUJUI')}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                    >
                      Setujui Izin
                    </button>
                  )}
                  {selectedPermission.status === 'DISETUJUI' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(selectedPermission.id, 'SUDAH_KELUAR')}
                      className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs"
                    >
                      Catat Keluar
                    </button>
                  )}
                  {selectedPermission.status === 'SUDAH_KELUAR' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(selectedPermission.id, 'SUDAH_KEMBALI')}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                    >
                      Catat Kembali
                    </button>
                  )}
                  {['SUDAH_KEMBALI', 'TERLAMBAT'].includes(selectedPermission.status) && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(selectedPermission.id, 'SELESAI')}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
                    >
                      Tandai Selesai
                    </button>
                  )}
                </div>

                {['SUPER_ADMIN', 'ADMIN'].includes(currentRole) && (
                  <button
                    type="button"
                    onClick={() => handleDelete(selectedPermission.id)}
                    className="text-rose-600 hover:text-rose-800 text-xs font-bold flex items-center gap-1 p-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Hapus Izin</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
