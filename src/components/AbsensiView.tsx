/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  UserCheck,
  Calendar,
  Clock,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock3,
  Users,
  Search,
  Check,
  X,
  Edit2,
  Trash2,
  RefreshCw,
  PlusCircle,
  HelpCircle,
  Sparkles,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import {
  Kegiatan,
  Santri,
  AttendanceRecord,
  AttendanceStatus,
  AttendanceSessionStats,
  Kelas,
  Kamar,
} from '../types';
import { useAuth } from '../context/AuthContext';
import {
  getKegiatanList,
  getSantriList,
  getKelasList,
  getKamarList,
  findSantriByBarcode,
} from '../services/santriService';
import {
  getAttendanceForSession,
  recordAttendance,
  updateAttendanceStatus,
  deleteAttendanceRecord,
  batchMarkAttendance,
  getTodayDateString,
  canUserManageKegiatanAttendance,
} from '../services/attendanceService';
import { AbsensiScanner } from './AbsensiScanner';

export const AbsensiView: React.FC = () => {
  const { currentRole, profile } = useAuth();

  // State master data
  const [kegiatanList, setKegiatanList] = useState<Kegiatan[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [kamarList, setKamarList] = useState<Kamar[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected session filters
  const [selectedKegiatanId, setSelectedKegiatanId] = useState<string>('');
  const [selectedTanggal, setSelectedTanggal] = useState<string>(getTodayDateString());
  const [selectedSesi, setSelectedSesi] = useState<string>('Pagi');

  // Attendance data for current session
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceSessionStats>({
    totalSantri: 0,
    hadir: 0,
    izin: 0,
    sakit: 0,
    alpa: 0,
    terlambat: 0,
    belumAbsen: 0,
    persentaseHadir: 0,
  });
  const [belumAbsenList, setBelumAbsenList] = useState<Santri[]>([]);

  // Scanner State
  const [fastScanMode, setFastScanMode] = useState(true);
  const [lastScannedSantri, setLastScannedSantri] = useState<Santri | null>(null);
  const [lastScanStatus, setLastScanStatus] = useState<{
    type: 'success' | 'duplicate' | 'error' | 'warning';
    message: string;
    waktu?: string;
  } | null>(null);
  const [scannerProcessing, setScannerProcessing] = useState(false);

  // Filter & Search inside session list
  const [activeTab, setActiveTab] = useState<'sudah' | 'belum'>('sudah');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('SEMUA');
  const [kelasFilter, setKelasFilter] = useState<string>('SEMUA');
  const [kamarFilter, setKamarFilter] = useState<string>('SEMUA');

  // Edit status modal state
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editNewStatus, setEditNewStatus] = useState<AttendanceStatus>('HADIR');
  const [editCatatan, setEditCatatan] = useState('');
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Load initial master data
  useEffect(() => {
    async function loadMaster() {
      setLoading(true);
      try {
        const [kegiatans, kelass, kamars] = await Promise.all([
          getKegiatanList(),
          getKelasList(),
          getKamarList(),
        ]);
        setKegiatanList(kegiatans);
        setKelasList(kelass);
        setKamarList(kamars);

        // Default selected kegiatan
        if (kegiatans.length > 0) {
          // Preselect based on role preference if possible
          let defaultKeg = kegiatans[0];
          if (currentRole === 'PETUGAS_SEKOLAH') {
            const found = kegiatans.find((k) => k.kategori === 'Sekolah');
            if (found) defaultKeg = found;
          } else if (currentRole === 'PETUGAS_MADIN') {
            const found = kegiatans.find((k) => k.kategori === 'Madin');
            if (found) defaultKeg = found;
          } else if (currentRole === 'PETUGAS_JAMAAH') {
            const found = kegiatans.find((k) => k.kategori === 'Jamaah');
            if (found) defaultKeg = found;
          }
          setSelectedKegiatanId(defaultKeg.id);
        }
      } catch (err) {
        console.error('Gagal memuat master data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadMaster();
  }, [currentRole]);

  // Current active kegiatan object
  const currentKegiatan = useMemo(() => {
    return kegiatanList.find((k) => k.id === selectedKegiatanId) || null;
  }, [kegiatanList, selectedKegiatanId]);

  // Check role permission for currently selected kegiatan
  const rolePermissionCheck = useMemo(() => {
    if (!currentKegiatan) return { allowed: true };
    return canUserManageKegiatanAttendance(currentRole, currentKegiatan.kategori);
  }, [currentRole, currentKegiatan]);

  // Fetch attendance records for currently selected session
  const refreshSessionData = useCallback(async () => {
    if (!selectedKegiatanId) return;
    try {
      const res = await getAttendanceForSession(selectedKegiatanId, selectedTanggal, selectedSesi);
      setAttendanceRecords(res.records);
      setStats(res.stats);
      setBelumAbsenList(res.belumAbsenList);
    } catch (err) {
      console.error('Gagal memuat data absensi sesi:', err);
    }
  }, [selectedKegiatanId, selectedTanggal, selectedSesi]);

  useEffect(() => {
    refreshSessionData();
  }, [refreshSessionData]);

  // Handler: Scan barcode (from camera, laser scanner, or preset demo)
  const handleScanBarcode = async (rawBarcode: string) => {
    if (!currentKegiatan) {
      setLastScanStatus({
        type: 'error',
        message: 'Silakan pilih kegiatan absensi terlebih dahulu.',
      });
      return;
    }

    if (!rolePermissionCheck.allowed) {
      setLastScanStatus({
        type: 'error',
        message:
          rolePermissionCheck.reason ||
          'Role Anda tidak berwenang mencatat absensi pada kegiatan ini.',
      });
      return;
    }

    setScannerProcessing(true);
    try {
      // 1. Cari santri berdasarkan ID YYS / barcode
      const santri = await findSantriByBarcode(rawBarcode);

      if (!santri) {
        setLastScannedSantri(null);
        setLastScanStatus({
          type: 'error',
          message: `Barcode "${rawBarcode}" tidak terdaftar di database santri.`,
        });
        return;
      }

      setLastScannedSantri(santri);

      // 2. Simpan absensi (Mode Fast Scan = Otomatis HADIR)
      const res = await recordAttendance({
        santri,
        kegiatan: currentKegiatan,
        tanggal: selectedTanggal,
        sesi: selectedSesi,
        status: 'HADIR',
        userRole: currentRole,
        petugasId: profile?.id || null,
        petugasNama: profile?.full_name || currentRole,
      });

      if (res.isDuplicate) {
        setLastScanStatus({
          type: 'duplicate',
          message: res.message,
          waktu: res.existingRecord?.waktu_absen,
        });
      } else if (res.success) {
        setLastScanStatus({
          type: res.statusWarning ? 'warning' : 'success',
          message: res.statusWarning
            ? `${res.message} ${res.statusWarning}`
            : `Absensi berhasil: ${santri.nama} tercatat HADIR.`,
          waktu: res.record?.waktu_absen,
        });

        // Refresh stats & list
        await refreshSessionData();
      } else {
        setLastScanStatus({
          type: 'error',
          message: res.message,
        });
      }
    } catch {
      setLastScanStatus({
        type: 'error',
        message: 'Terjadi kesalahan sistem saat memproses absensi.',
      });
    } finally {
      setScannerProcessing(false);
    }
  };

  // Handler: Manual status update
  const handleSaveStatusEdit = async () => {
    if (!editingRecord || !currentKegiatan) return;
    setSubmittingEdit(true);
    try {
      const res = await updateAttendanceStatus({
        recordId: editingRecord.id,
        newStatus: editNewStatus,
        userRole: currentRole,
        kegiatanKategori: currentKegiatan.kategori,
        catatan: editCatatan,
        petugasNama: profile?.full_name || currentRole,
      });

      if (res.success) {
        setActionMessage({ text: res.message, type: 'success' });
        setEditingRecord(null);
        await refreshSessionData();
      } else {
        setActionMessage({ text: res.message, type: 'error' });
      }
    } catch {
      setActionMessage({ text: 'Gagal memperbarui status.', type: 'error' });
    } finally {
      setSubmittingEdit(false);
      setTimeout(() => setActionMessage(null), 3500);
    }
  };

  // Handler: Delete attendance record (Admin only)
  const handleDeleteRecord = async (recordId: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus catatan absensi ini?')) {
      return;
    }
    try {
      const res = await deleteAttendanceRecord(
        recordId,
        currentRole,
        profile?.full_name || currentRole
      );
      if (res.success) {
        setActionMessage({ text: res.message, type: 'success' });
        await refreshSessionData();
      } else {
        setActionMessage({ text: res.message, type: 'error' });
      }
    } catch {
      setActionMessage({ text: 'Gagal menghapus data.', type: 'error' });
    } finally {
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  // Handler: Quick mark a student from Belum Absen list
  const handleQuickMarkSantri = async (santri: Santri, status: AttendanceStatus) => {
    if (!currentKegiatan) return;
    setLoading(true);
    try {
      const res = await recordAttendance({
        santri,
        kegiatan: currentKegiatan,
        tanggal: selectedTanggal,
        sesi: selectedSesi,
        status,
        userRole: currentRole,
        petugasId: profile?.id || null,
        petugasNama: profile?.full_name || currentRole,
      });

      if (res.success) {
        setActionMessage({
          text: `Santri ${santri.nama} berhasil dicatat ${status}`,
          type: 'success',
        });
        await refreshSessionData();
      } else {
        setActionMessage({ text: res.message, type: 'error' });
      }
    } finally {
      setLoading(false);
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  // Handler: Batch mark all remaining unrecorded santri (e.g. mark as ALPA)
  const handleBatchMarkRemaining = async (status: AttendanceStatus) => {
    if (!currentKegiatan || belumAbsenList.length === 0) return;
    const confirmText = `Tandai ${belumAbsenList.length} santri yang belum absen sebagai ${status}?`;
    if (!window.confirm(confirmText)) return;

    setLoading(true);
    try {
      const santriIds = belumAbsenList.map((s) => s.id);
      const res = await batchMarkAttendance({
        santriIds,
        kegiatan: currentKegiatan,
        tanggal: selectedTanggal,
        sesi: selectedSesi,
        status,
        userRole: currentRole,
        petugasNama: profile?.full_name || currentRole,
        catatan: `Ditandai massal ${status} oleh ${profile?.full_name || currentRole}`,
      });
      setActionMessage({ text: res.message, type: 'success' });
      await refreshSessionData();
    } catch {
      setActionMessage({ text: 'Gagal melakukan absensi massal.', type: 'error' });
    } finally {
      setLoading(false);
      setTimeout(() => setActionMessage(null), 3500);
    }
  };

  // Filtered lists
  const filteredRecords = useMemo(() => {
    return attendanceRecords.filter((r) => {
      const matchSearch =
        !searchQuery ||
        r.santri?.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.santri?.id_yys.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.santri?.nis?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus = statusFilter === 'SEMUA' || r.status === statusFilter;
      const matchKelas = kelasFilter === 'SEMUA' || r.santri?.kelas_id === kelasFilter;
      const matchKamar = kamarFilter === 'SEMUA' || r.santri?.kamar_id === kamarFilter;

      return matchSearch && matchStatus && matchKelas && matchKamar;
    });
  }, [attendanceRecords, searchQuery, statusFilter, kelasFilter, kamarFilter]);

  const filteredBelumAbsen = useMemo(() => {
    return belumAbsenList.filter((s) => {
      const matchSearch =
        !searchQuery ||
        s.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.id_yys.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.nis?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchKelas = kelasFilter === 'SEMUA' || s.kelas_id === kelasFilter;
      const matchKamar = kamarFilter === 'SEMUA' || s.kamar_id === kamarFilter;

      return matchSearch && matchKelas && matchKamar;
    });
  }, [belumAbsenList, searchQuery, kelasFilter, kamarFilter]);

  const getStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case 'HADIR':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'IZIN':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'SAKIT':
        return 'bg-cyan-100 text-cyan-800 border-cyan-300';
      case 'ALPA':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'TERLAMBAT':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Toast Action Notification */}
      {actionMessage && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 border text-xs sm:text-sm font-semibold transition-all ${
            actionMessage.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-700'
              : 'bg-rose-900 text-white border-rose-700'
          }`}
        >
          {actionMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-300 shrink-0" />
          )}
          <span>{actionMessage.text}</span>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="ml-2 text-white/70 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span>Modul Absensi Harian Terpadu</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            Absensi Kegiatan Harian Santri
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Mencakup Sekolah, Madin, dan Jamaah dengan pemindaian barcode ID YYS instan.
          </p>
        </div>

        {/* Quick Refresh Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={refreshSessionData}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Session Filter Bar (Kegiatan, Tanggal, Sesi) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-emerald-600" />
            <span>Pilih Sesi & Kegiatan Absensi</span>
          </span>
          {currentKegiatan && (
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              Kategori: {currentKegiatan.kategori}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Pilih Kegiatan */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Kegiatan
            </label>
            <select
              value={selectedKegiatanId}
              onChange={(e) => setSelectedKegiatanId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
            >
              {kegiatanList.map((k) => (
                <option key={k.id} value={k.id}>
                  [{k.kategori}] {k.nama_kegiatan}
                </option>
              ))}
            </select>
          </div>

          {/* Pilih Tanggal */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Tanggal
            </label>
            <input
              type="date"
              value={selectedTanggal}
              onChange={(e) => setSelectedTanggal(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Pilih Sesi */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Sesi Waktu
            </label>
            <select
              value={selectedSesi}
              onChange={(e) => setSelectedSesi(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
            >
              <option value="Pagi">Pagi (07:00 - 12:00)</option>
              <option value="Siang">Siang (12:00 - 15:00)</option>
              <option value="Sore">Sore (15:00 - 17:30)</option>
              <option value="Malam">Malam (19:00 - 21:30)</option>
              <option value="Subuh">Subuh (04:15 - 05:30)</option>
              <option value="Dzuhur">Dzuhur (12:00 - 13:00)</option>
              <option value="Ashar">Ashar (15:15 - 16:00)</option>
              <option value="Maghrib">Maghrib (18:00 - 19:00)</option>
              <option value="Isya">Isya (19:15 - 20:30)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Session Stats KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3">
        {/* Total Santri */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Total Santri
          </span>
          <span className="text-xl sm:text-2xl font-black text-slate-900 mt-1 block">
            {stats.totalSantri}
          </span>
          <span className="text-[10px] text-slate-400">Santri Terdaftar</span>
        </div>

        {/* Hadir */}
        <div className="bg-white p-3.5 rounded-2xl border border-emerald-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
            Hadir
          </span>
          <span className="text-xl sm:text-2xl font-black text-emerald-600 mt-1 block">
            {stats.hadir}
          </span>
          <span className="text-[10px] text-emerald-600 font-medium">Tepat Waktu</span>
        </div>

        {/* Izin */}
        <div className="bg-white p-3.5 rounded-2xl border border-amber-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block">
            Izin
          </span>
          <span className="text-xl sm:text-2xl font-black text-amber-600 mt-1 block">
            {stats.izin}
          </span>
          <span className="text-[10px] text-amber-600 font-medium">Ada Surat/Catatan</span>
        </div>

        {/* Sakit */}
        <div className="bg-white p-3.5 rounded-2xl border border-cyan-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-cyan-700 uppercase tracking-wider block">
            Sakit
          </span>
          <span className="text-xl sm:text-2xl font-black text-cyan-600 mt-1 block">
            {stats.sakit}
          </span>
          <span className="text-[10px] text-cyan-600 font-medium">Klinik/Kamar</span>
        </div>

        {/* Terlambat */}
        <div className="bg-white p-3.5 rounded-2xl border border-orange-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-orange-700 uppercase tracking-wider block">
            Terlambat
          </span>
          <span className="text-xl sm:text-2xl font-black text-orange-600 mt-1 block">
            {stats.terlambat}
          </span>
          <span className="text-[10px] text-orange-600 font-medium">Tetap Tercatat</span>
        </div>

        {/* Alpa */}
        <div className="bg-white p-3.5 rounded-2xl border border-rose-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider block">
            Alpa
          </span>
          <span className="text-xl sm:text-2xl font-black text-rose-600 mt-1 block">
            {stats.alpa}
          </span>
          <span className="text-[10px] text-rose-600 font-medium">Tanpa Keterangan</span>
        </div>

        {/* Belum Absen */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-300 shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">
            Belum Absen
          </span>
          <span className="text-xl sm:text-2xl font-black text-slate-700 mt-1 block">
            {stats.belumAbsen}
          </span>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all"
              style={{ width: `${stats.persentaseHadir}%` }}
            />
          </div>
        </div>
      </div>

      {/* BARCODE SCANNER COMPONENT (Kamera HP & Laser Scanner) */}
      <AbsensiScanner
        onScanBarcode={handleScanBarcode}
        loading={scannerProcessing}
        fastScanMode={fastScanMode}
        onToggleFastScan={() => setFastScanMode(!fastScanMode)}
        lastScannedSantri={lastScannedSantri}
        lastScanStatus={lastScanStatus}
        onClearLastScan={() => setLastScanStatus(null)}
        isAllowedKegiatan={rolePermissionCheck.allowed}
        roleWarningMessage={rolePermissionCheck.reason}
      />

      {/* Tabs & Data Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Tab Headers */}
        <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('sudah')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === 'sudah'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Sudah Absen ({attendanceRecords.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('belum')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === 'belum'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <AlertCircle className="w-4 h-4" />
              <span>Belum Absen ({belumAbsenList.length})</span>
            </button>
          </div>

          {/* Batch action for Belum Absen */}
          {activeTab === 'belum' && belumAbsenList.length > 0 && rolePermissionCheck.allowed && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleBatchMarkRemaining('ALPA')}
                className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors"
              >
                Tandai Semua ALPA
              </button>
              <button
                type="button"
                onClick={() => handleBatchMarkRemaining('IZIN')}
                className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-bold transition-colors"
              >
                Tandai Semua IZIN
              </button>
            </div>
          )}
        </div>

        {/* Filter & Search Bar */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 bg-white grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama / ID YYS..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Filter Status (Only active in Sudah Absen tab) */}
          {activeTab === 'sudah' ? (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 bg-slate-50"
            >
              <option value="SEMUA">Semua Status</option>
              <option value="HADIR">Hadir Saja</option>
              <option value="IZIN">Izin Saja</option>
              <option value="SAKIT">Sakit Saja</option>
              <option value="ALPA">Alpa Saja</option>
              <option value="TERLAMBAT">Terlambat Saja</option>
            </select>
          ) : (
            <div className="hidden sm:block" />
          )}

          {/* Filter Kelas */}
          <select
            value={kelasFilter}
            onChange={(e) => setKelasFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 bg-slate-50"
          >
            <option value="SEMUA">Semua Kelas</option>
            {kelasList.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama_kelas}
              </option>
            ))}
          </select>

          {/* Filter Kamar */}
          <select
            value={kamarFilter}
            onChange={(e) => setKamarFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 bg-slate-50"
          >
            <option value="SEMUA">Semua Kamar</option>
            {kamarList.map((km) => (
              <option key={km.id} value={km.id}>
                {km.nama_kamar}
              </option>
            ))}
          </select>
        </div>

        {/* Tab Content: SUDAH ABSEN */}
        {activeTab === 'sudah' && (
          <div className="overflow-x-auto">
            {filteredRecords.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <Users className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-xs font-semibold">
                  Belum ada catatan absensi untuk kriteria ini.
                </p>
                <p className="text-[11px] text-slate-400">
                  Gunakan kamera barcode atau scan laser di atas untuk memulai pencatatan.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Santri</th>
                    <th className="py-3 px-3">Kelas & Kamar</th>
                    <th className="py-3 px-3">Waktu Absen</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Petugas</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{item.santri?.nama}</div>
                        <div className="font-mono text-[11px] text-slate-500">
                          {item.santri?.id_yys} {item.santri?.nis && `• NIS: ${item.santri.nis}`}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800">
                          {item.santri?.kelas?.nama_kelas || '-'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {item.santri?.kamar?.nama_kamar || '-'}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold text-slate-700">
                        {item.waktu_absen ? item.waktu_absen.substring(0, 5) : '-'} WIB
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2.5 py-1 rounded-full font-bold border text-[11px] inline-block ${getStatusBadge(
                            item.status
                          )}`}
                        >
                          {item.status}
                        </span>
                        {item.catatan && (
                          <div className="text-[10px] text-slate-500 italic mt-0.5 max-w-xs truncate">
                            {item.catatan}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-600 text-[11px]">
                        {item.petugas_nama || '-'}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {/* Ubah Status Manual */}
                        {rolePermissionCheck.allowed && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRecord(item);
                              setEditNewStatus(item.status);
                              setEditCatatan(item.catatan || '');
                            }}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition-colors"
                            title="Koreksi Status"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Hapus Record (Admin only) */}
                        {(currentRole === 'SUPER_ADMIN' || currentRole === 'ADMIN') && (
                          <button
                            type="button"
                            onClick={() => handleDeleteRecord(item.id)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 transition-colors"
                            title="Hapus Data Absensi"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab Content: BELUM ABSEN */}
        {activeTab === 'belum' && (
          <div className="overflow-x-auto">
            {filteredBelumAbsen.length === 0 ? (
              <div className="p-8 text-center text-emerald-700 bg-emerald-50/50 space-y-2">
                <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-600" />
                <p className="text-xs sm:text-sm font-bold">
                  Luar Biasa! Semua Santri Sudah Tercatat Absensi.
                </p>
                <p className="text-xs text-emerald-600">
                  Tidak ada santri yang berstatus belum absen pada sesi ini.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Santri</th>
                    <th className="py-3 px-3">Kelas & Kamar</th>
                    <th className="py-3 px-3">Status Master</th>
                    <th className="py-3 px-4 text-right">Tandai Cepat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBelumAbsen.map((santri) => (
                    <tr key={santri.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{santri.nama}</div>
                        <div className="font-mono text-[11px] text-slate-500">
                          {santri.id_yys}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800">
                          {santri.kelas?.nama_kelas || '-'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {santri.kamar?.nama_kamar || '-'}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            santri.status_santri === 'Aktif'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {santri.status_santri}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {rolePermissionCheck.allowed ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleQuickMarkSantri(santri, 'HADIR')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors"
                            >
                              Hadir
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickMarkSantri(santri, 'IZIN')}
                              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] transition-colors"
                            >
                              Izin
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickMarkSantri(santri, 'SAKIT')}
                              className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-[11px] transition-colors"
                            >
                              Sakit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickMarkSantri(santri, 'ALPA')}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] transition-colors"
                            >
                              Alpa
                            </button>
                          </>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Akses Terbatas</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Modal: Edit Status Absensi */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Koreksi Status Absensi
              </h3>
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs">
              <p className="font-bold text-slate-900">{editingRecord.santri?.nama}</p>
              <p className="text-slate-500 font-mono">
                {editingRecord.santri?.id_yys} • Kelas:{' '}
                {editingRecord.santri?.kelas?.nama_kelas || '-'}
              </p>
              <p className="text-slate-500">
                Kegiatan: {editingRecord.kegiatan?.nama_kegiatan} ({editingRecord.tanggal} - Sesi{' '}
                {editingRecord.sesi})
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pilih Status Baru
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['HADIR', 'IZIN', 'SAKIT', 'ALPA', 'TERLAMBAT'] as AttendanceStatus[]).map(
                    (st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setEditNewStatus(st)}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                          editNewStatus === st
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {st}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan / Keterangan (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={editCatatan}
                  onChange={(e) => setEditCatatan(e.target.value)}
                  placeholder="Misal: Sakit flu di klinik asrama, izin keluarga..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submittingEdit}
                onClick={handleSaveStatusEdit}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
              >
                {submittingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
