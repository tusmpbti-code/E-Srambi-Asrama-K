/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Clock,
  QrCode,
  Camera,
  CameraOff,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  Printer,
  Sparkles,
  Plus,
  Trash2,
  Search,
  Building,
  Volume2,
  VolumeX,
  FileCheck2,
  Check,
  LogOut,
  LogIn,
  RefreshCw,
  Moon,
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  SpecialEvent,
  SpecialEventParticipant,
  SpecialAttendanceRecord,
  SpecialEventDashboardStats,
  Santri,
  Kelas,
  Kamar,
  getSantriKamarText,
  getSpecialEventAttendanceModelLabel,
} from '../../types';
import {
  getEventParticipants,
  getEventDashboardStats,
  processSpecialAttendanceScan,
  addParticipantsToEvent,
  removeParticipantFromEvent,
  ProcessSpecialAttendanceResult,
  getSpecialAttendanceStatusInfo,
} from '../../services/specialEventService';
import { getTodayDateString } from '../../services/attendanceService';
import { playSuccessChime, playWarningChime, playErrorChime } from '../../lib/sound';

interface SpecialEventDetailViewProps {
  event: SpecialEvent;
  onBack: () => void;
  santriList: Santri[];
  kelasList: Kelas[];
  kamarList: Kamar[];
  canManage: boolean;
}

export const SpecialEventDetailView: React.FC<SpecialEventDetailViewProps> = ({
  event,
  onBack,
  santriList,
  kelasList,
  kamarList,
  canManage,
}) => {
  const today = getTodayDateString();

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<'scan_cepat' | 'peserta' | 'rekap'>('scan_cepat');
  const [selectedTanggal, setSelectedTanggal] = useState<string>(today);

  // Data states
  const [participants, setParticipants] = useState<SpecialEventParticipant[]>([]);
  const [stats, setStats] = useState<SpecialEventDashboardStats>({
    totalPeserta: 0,
    belumBerangkat: 0,
    tidakAbsen: 0,
    sudahBerangkat: 0,
    sudahKembali: 0,
    belumKembali: 0,
    terlambatKembali: 0,
    terlambatBerangkat: 0,
    belumKembaliList: [],
    tidakAbsenList: [],
  });
  const [loading, setLoading] = useState(true);

  // Scanner states
  const [scanMode, setScanMode] = useState<'BERANGKAT' | 'KEMBALI' | 'AUTO'>('BERANGKAT');
  const [manualCode, setManualCode] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<ProcessSpecialAttendanceResult | null>(null);

  // Add Participant Modal
  const [showAddParticipantModal, setShowAddParticipantModal] = useState(false);
  const [selectedSantriToAdd, setSelectedSantriToAdd] = useState<Santri | null>(null);
  const [newAtributKhusus, setNewAtributKhusus] = useState(
    event.jenis_kegiatan === 'PSG' ? 'PT / Tempat PSG' : ''
  );
  const [newCatatan, setNewCatatan] = useState('');
  const [addParticipantSearch, setAddParticipantSearch] = useState('');
  const [addParticipantFilterKelas, setAddParticipantFilterKelas] = useState('SEMUA');

  // Scanner Ref
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'event-camera-viewport';
  const isProcessingScan = useRef(false);

  // Load participants & stats
  const loadEventData = useCallback(async () => {
    setLoading(true);
    try {
      const [partsData, statsData] = await Promise.all([
        getEventParticipants(event.id, selectedTanggal),
        getEventDashboardStats(event.id, selectedTanggal),
      ]);
      setParticipants(partsData);
      setStats(statsData);
    } catch (err) {
      console.error('Error loading special event data:', err);
    } finally {
      setLoading(false);
    }
  }, [event.id, selectedTanggal]);

  useEffect(() => {
    loadEventData();
  }, [loadEventData]);

  // Stop camera function
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

  // Cleanup on unmount or tab switch away from scan_cepat
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  useEffect(() => {
    if (activeTab !== 'scan_cepat' && cameraActive) {
      stopCamera();
    }
  }, [activeTab, cameraActive, stopCamera]);

  // Process barcode scan
  const handleProcessScan = useCallback(
    async (code: string) => {
      if (!code || isProcessingScan.current) return;
      isProcessingScan.current = true;
      setScanLoading(true);

      try {
        const result = await processSpecialAttendanceScan({
          eventId: event.id,
          barcodeOrIdYys: code,
          action: scanMode,
          tanggal: selectedTanggal,
        });

        setScanFeedback(result);

        if (soundEnabled) {
          if (result.success) {
            playSuccessChime();
          } else if (result.message.includes('belum tercatat berangkat')) {
            playWarningChime();
          } else {
            playErrorChime();
          }
        }

        if (result.success) {
          setManualCode('');
          await loadEventData();
        }
      } catch (err) {
        console.error('Error processing special scan:', err);
      } finally {
        setScanLoading(false);
        setTimeout(() => {
          isProcessingScan.current = false;
        }, 1200);
      }
    },
    [event.id, scanMode, selectedTanggal, soundEnabled, loadEventData]
  );

  // Toggle Camera
  const toggleCamera = async () => {
    if (cameraActive) {
      await stopCamera();
      return;
    }

    setCameraActive(true);
    setScanFeedback(null);

    // Give DOM time to render container element
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode(scannerContainerId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 260, height: 260 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (!isProcessingScan.current) {
              handleProcessScan(decodedText);
            }
          },
          () => {
            // scan error ignored
          }
        );
      } catch (err) {
        console.error('Failed to start special event scanner camera:', err);
        setCameraActive(false);
        scannerRef.current = null;
        alert('Gagal mengakses kamera. Pastikan izin kamera telah diberikan pada peramban Anda.');
      }
    }, 200);
  };

  // Add Participant Submit
  const handleAddParticipantSubmit = async () => {
    if (!selectedSantriToAdd) return;

    try {
      await addParticipantsToEvent(event.id, [
        {
          santri_id: selectedSantriToAdd.id,
          atribut_khusus: newAtributKhusus.trim() || undefined,
          catatan: newCatatan.trim() || undefined,
        },
      ]);
      setShowAddParticipantModal(false);
      setSelectedSantriToAdd(null);
      setNewAtributKhusus(event.jenis_kegiatan === 'PSG' ? 'PT / Tempat PSG' : '');
      setNewCatatan('');
      await loadEventData();
    } catch (err) {
      console.error('Error adding participant:', err);
    }
  };

  // Remove Participant Submit
  const handleRemoveParticipant = async (participantId: string, nama: string) => {
    if (!window.confirm(`Hapus santri ${nama} dari daftar peserta kegiatan ini?`)) return;

    try {
      await removeParticipantFromEvent(participantId);
      await loadEventData();
    } catch (err) {
      console.error('Error removing participant:', err);
    }
  };

  // Filtered available santri to add in modal
  const availableSantriToAdd = santriList.filter((s) => {
    const isAlreadyParticipant = participants.some((p) => p.santri_id === s.id);
    if (isAlreadyParticipant) return false;

    if (addParticipantFilterKelas !== 'SEMUA' && s.kelas_id !== addParticipantFilterKelas) {
      return false;
    }

    if (addParticipantSearch.trim()) {
      const q = addParticipantSearch.toLowerCase().trim();
      return (
        s.nama.toLowerCase().includes(q) ||
        s.id_yys.toLowerCase().includes(q) ||
        (s.nis && s.nis.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Export CSV
  const handleExportCSV = () => {
    if (participants.length === 0) {
      alert('Belum ada peserta untuk diekspor.');
      return;
    }

    const headers = [
      'ID YYS',
      'Nama Santri',
      'Kelas',
      'Kamar',
      'Atribut Khusus / Tempat PSG',
      'Tanggal',
      'Waktu Berangkat',
      'Waktu Kembali',
      'Status Absensi',
      'Keterangan Batas Waktu',
      'Catatan',
    ];

    const rows = participants.map((p) => {
      const s = p.santri;
      const att = p.latest_attendance;
      const statusInfo = getSpecialAttendanceStatusInfo(event, att, selectedTanggal);
      return [
        s?.id_yys || '',
        `"${s?.nama || ''}"`,
        `"${s?.kelas?.nama_kelas || ''}"`,
        `"${getSantriKamarText(s) || ''}"`,
        `"${p.atribut_khusus || ''}"`,
        selectedTanggal,
        att?.waktu_berangkat
          ? new Date(att.waktu_berangkat).toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
            })
          : '-',
        att?.waktu_kembali
          ? new Date(att.waktu_kembali).toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
            })
          : '-',
        `"${statusInfo.label}"`,
        `"${statusInfo.detailText}"`,
        `"${att?.catatan || ''}"`,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Absensi_${event.nama_kegiatan.replace(/\s+/g, '_')}_${selectedTanggal}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Kembali ke daftar kegiatan khusus"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 uppercase tracking-wider">
                {event.jenis_kegiatan}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-semibold text-slate-600">
                Absensi: {event.jenis_absensi.replace('_', ' + ')}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
              {event.nama_kegiatan}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500 ml-2" />
            <input
              type="date"
              value={selectedTanggal}
              onChange={(e) => setSelectedTanggal(e.target.value)}
              className="bg-transparent border-0 text-xs font-bold text-slate-700 py-1 px-1 focus:outline-hidden"
            />
          </div>
          <button
            type="button"
            onClick={loadEventData}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
            title="Muat ulang data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Event Info Strip */}
      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs flex flex-wrap items-center gap-x-6 gap-y-2 text-slate-600">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-slate-700">Lokasi:</span>
          <span>{event.lokasi}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-slate-700">Periode:</span>
          <span>
            {event.tanggal_mulai} s.d. {event.tanggal_selesai}
          </span>
        </div>

        {/* Model Absensi Badge */}
        <div className="flex items-center gap-1.5 bg-purple-50 text-purple-900 px-2.5 py-1 rounded-lg border border-purple-200 font-semibold">
          <Clock className="w-3.5 h-3.5 text-purple-600" />
          <span>Model: {getSpecialEventAttendanceModelLabel(event.jenis_absensi)}</span>
        </div>

        {/* Overnight Menginap Badge */}
        {(event.is_menginap || (event.durasi_malam && event.durasi_malam >= 1)) && (
          <div className="flex items-center gap-1.5 bg-purple-100 text-purple-900 px-2.5 py-1 rounded-lg border border-purple-300 font-bold">
            <Moon className="w-3.5 h-3.5 text-purple-700" />
            <span>Menginap {event.durasi_malam ? `${event.durasi_malam} Malam` : '≥ 1 Malam'}</span>
          </div>
        )}

        {(event.jam_berangkat || event.jam_batas_berangkat) && (
          <div className="flex items-center gap-1.5 bg-purple-100/70 text-purple-900 px-2.5 py-1 rounded-lg border border-purple-200">
            <Clock className="w-3.5 h-3.5 text-purple-700" />
            <span>
              Jam Berangkat: <strong>{event.jam_berangkat || event.jam_batas_berangkat} WIB</strong>
            </span>
          </div>
        )}

        {(event.jam_kembali || event.jam_batas_kembali) && (
          <div className="flex items-center gap-1.5 bg-indigo-100/70 text-indigo-900 px-2.5 py-1 rounded-lg border border-indigo-200">
            <Clock className="w-3.5 h-3.5 text-indigo-700" />
            <span>
              Jam Kembali: <strong>{event.jam_kembali || event.jam_batas_kembali} WIB</strong>
            </span>
          </div>
        )}
        {event.keterangan && (
          <div className="flex items-center gap-1.5 text-slate-500">
            <span>•</span>
            <span className="italic truncate max-w-md">{event.keterangan}</span>
          </div>
        )}
      </div>

      {/* DASHBOARD METRICS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Peserta
          </span>
          <span className="text-xl sm:text-2xl font-black text-slate-900 mt-1 block">
            {stats.totalPeserta}
          </span>
          <span className="text-[10px] text-slate-400">Santri Terdaftar</span>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
            Belum Berangkat
          </span>
          <span className="text-xl sm:text-2xl font-black text-slate-700 mt-1 block">
            {stats.belumBerangkat}
          </span>
          <span className="text-[10px] text-slate-500">Standby di Pondok</span>
        </div>

        <div className="bg-rose-50/70 p-3.5 rounded-2xl border border-rose-200 shadow-2xs">
          <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block">
            Tidak Absen
          </span>
          <span className="text-xl sm:text-2xl font-black text-rose-700 mt-1 block">
            {stats.tidakAbsen}
          </span>
          <span className="text-[10px] text-rose-600">Lewat Batas Berangkat</span>
        </div>

        <div className="bg-blue-50/60 p-3.5 rounded-2xl border border-blue-200 shadow-2xs">
          <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block">
            Sudah Berangkat
          </span>
          <span className="text-xl sm:text-2xl font-black text-blue-700 mt-1 block">
            {stats.sudahBerangkat}
          </span>
          <span className="text-[10px] text-blue-600">Scan Keberangkatan</span>
        </div>

        <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200 shadow-2xs">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
            Belum Kembali
          </span>
          <span className="text-xl sm:text-2xl font-black text-amber-700 mt-1 block">
            {stats.belumKembali}
          </span>
          <span className="text-[10px] text-amber-600">Sedang di Lokasi</span>
        </div>

        <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
            Sudah Kembali
          </span>
          <span className="text-xl sm:text-2xl font-black text-emerald-700 mt-1 block">
            {stats.sudahKembali}
          </span>
          <span className="text-[10px] text-emerald-600">Tiba di Pesantren</span>
        </div>

        <div className="bg-rose-100/60 p-3.5 rounded-2xl border-2 border-rose-300 shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold text-rose-900 uppercase tracking-wider block">
            Terlambat Kembali
          </span>
          <span className="text-xl sm:text-2xl font-black text-rose-800 mt-1 block">
            {stats.terlambatKembali}
          </span>
          <span className="text-[10px] text-rose-700 font-semibold">Lewat Batas Kembali</span>
        </div>
      </div>

      {/* WARNING: Santri Terlambat Kembali */}
      {stats.terlambatKembali > 0 && (
        <div className="bg-rose-50 border-2 border-rose-400 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-rose-200 text-rose-900 rounded-xl shrink-0 mt-0.5 animate-pulse">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-bold text-rose-900">
                  Peringatan: {stats.terlambatKembali} Santri Terlambat Kembali ke Pondok!
                </h3>
                <span className="text-xs font-bold text-rose-900 bg-rose-200 px-2.5 py-0.5 rounded-full">
                  Batas: {event.jam_batas_kembali || '17:00'} WIB
                </span>
              </div>
              <p className="text-xs text-rose-800 mt-1">
                Santri berikut telah melewati batas waktu kepulangan ke pondok pesantren:
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {stats.belumKembaliList
                  .filter((item) => item.isTerlambat)
                  .map((item) => (
                    <div
                      key={item.participant.id}
                      className="bg-white px-3 py-1.5 rounded-xl border border-rose-300 shadow-2xs text-xs flex items-center gap-2"
                    >
                      <span className="font-bold text-rose-900">{item.santri.nama}</span>
                      <span className="text-[10px] font-mono text-slate-500">
                        ({item.santri.id_yys})
                      </span>
                      {item.participant.atribut_khusus && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold">
                          {item.participant.atribut_khusus}
                        </span>
                      )}
                      <span className="text-[10px] text-rose-700 font-bold bg-rose-100 px-2 py-0.5 rounded">
                        Belum Tiba (Lewat Batas)
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WARNING: Santri Tidak Absen Berangkat */}
      {stats.tidakAbsen > 0 && (
        <div className="bg-rose-50/80 border border-rose-300 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-rose-100 text-rose-800 rounded-xl shrink-0 mt-0.5">
              <XCircle className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-bold text-rose-900">
                  Keterangan: {stats.tidakAbsen} Santri Tidak Absen Berangkat
                </h3>
                <span className="text-xs font-bold text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-full">
                  Batas Berangkat: {event.jam_batas_berangkat || '08:00'} WIB
                </span>
              </div>
              <p className="text-xs text-rose-700 mt-1">
                Waktu keberangkatan telah melewati batas yang ditentukan. Santri berikut belum tercatat melakukan absensi:
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {stats.tidakAbsenList.map((item) => (
                  <div
                    key={item.participant.id}
                    className="bg-white px-3 py-1.5 rounded-xl border border-rose-200 shadow-2xs text-xs flex items-center gap-2"
                  >
                    <span className="font-bold text-slate-800">{item.santri.nama}</span>
                    <span className="text-[10px] font-mono text-slate-500">
                      ({item.santri.id_yys})
                    </span>
                    <span className="text-[10px] text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                      Tidak Absen
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WARNING: Santri Belum Kembali (Sedang di Luar Pondok) */}
      {stats.belumKembali > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-200 text-amber-900 rounded-xl shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-bold text-amber-900">
                  Perhatian: {stats.belumKembali} Santri {event.jenis_kegiatan} Belum Kembali
                </h3>
                <span className="text-xs font-bold text-amber-800 bg-amber-200/80 px-2.5 py-0.5 rounded-full">
                  Di Luar Pondok
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-1">
                Santri berikut telah tercatat berangkat namun belum melakukan scan kembali ke pesantren:
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {stats.belumKembaliList.map((item) => (
                  <div
                    key={item.participant.id}
                    className="bg-white px-3 py-1.5 rounded-xl border border-amber-200 shadow-2xs text-xs flex items-center gap-2"
                  >
                    <span className="font-bold text-slate-800">{item.santri.nama}</span>
                    <span className="text-[10px] font-mono text-slate-500">
                      ({item.santri.id_yys})
                    </span>
                    {item.participant.atribut_khusus && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold truncate max-w-xs">
                        {item.participant.atribut_khusus}
                      </span>
                    )}
                    {item.attendance?.waktu_berangkat && (
                      <span className="text-[10px] text-amber-700 font-mono">
                        Berangkat:{' '}
                        {new Date(item.attendance.waktu_berangkat).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB NAVIGATION */}
      <div className="bg-white rounded-2xl p-1.5 border border-slate-200 shadow-2xs flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setActiveTab('scan_cepat')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'scan_cepat'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>Mode Scan Cepat Kegiatan</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('peserta')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'peserta'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Daftar Peserta ({participants.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rekap')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'rekap'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          <span>Rekap Absensi ({selectedTanggal})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MODE SCAN CEPAT KEGIATAN */}
      {/* ========================================================================= */}
      {activeTab === 'scan_cepat' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Scanner Controls */}
          <div className="lg:col-span-6 space-y-4">
            {/* Mode Action Selector */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Mode Scan Absensi:
                </label>
                <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                  {getSpecialEventAttendanceModelLabel(event.jenis_absensi)}
                </span>
              </div>

              {event.jenis_absensi === 'SEKALI' ? (
                <div className="p-3 bg-purple-50/80 rounded-xl border border-purple-200 text-xs text-purple-900 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold block">Sekali (Cek Kehadiran Saja)</span>
                    <span className="text-[11px] text-purple-700">
                      Scan santri untuk mencatat kehadiran kegiatan khusus satu kali.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setScanMode('BERANGKAT')}
                    className={`py-3 px-3 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                      scanMode === 'BERANGKAT'
                        ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-300'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <LogOut className="w-4 h-4" />
                    <span>BERANGKAT</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScanMode('KEMBALI')}
                    className={`py-3 px-3 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                      scanMode === 'KEMBALI'
                        ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-300'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <LogIn className="w-4 h-4" />
                    <span>KEMBALI</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScanMode('AUTO')}
                    className={`py-3 px-3 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                      scanMode === 'AUTO'
                        ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-300'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>OTOMATIS</span>
                  </button>
                </div>
              )}

              <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                {event.jenis_absensi === 'SEKALI' ? (
                  <span>
                    <strong>Cek Kehadiran:</strong> Pemindaian mencatat kehadiran peserta secara langsung ke rekapitulasi.
                  </span>
                ) : scanMode === 'BERANGKAT' ? (
                  <span>
                    <strong>Mode Berangkat:</strong> Scan mencatat waktu keberangkatan santri menuju lokasi kegiatan ({event.jenis_absensi === 'BERANGKAT_KEMBALI_MENGINAP' ? 'Menginap' : 'Harian'}).
                  </span>
                ) : scanMode === 'KEMBALI' ? (
                  <span>
                    <strong>Mode Kembali:</strong> Scan mencatat kepulangan santri ke pondok pesantren. (Hanya santri yang sudah berangkat yang dapat kembali).
                  </span>
                ) : (
                  <span>
                    <strong>Mode Otomatis:</strong> Sistem otomatis mendeteksi: jika belum berangkat $\rightarrow$ BERANGKAT; jika sudah berangkat $\rightarrow$ KEMBALI.
                  </span>
                )}
              </div>
            </div>

            {/* Camera Viewport & Manual Input */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Camera className="w-4 h-4 text-purple-600" />
                  <span>Kamera Scanner Barcode ID YYS</span>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
                    title={soundEnabled ? 'Suara aktif' : 'Suara bisu'}
                  >
                    {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                  </button>

                  <button
                    type="button"
                    onClick={toggleCamera}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                      cameraActive
                        ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                        : 'bg-purple-600 text-white hover:bg-purple-700 shadow-xs'
                    }`}
                  >
                    {cameraActive ? (
                      <>
                        <CameraOff className="w-3.5 h-3.5" />
                        <span>Matikan Kamera</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-3.5 h-3.5" />
                        <span>Nyalakan Kamera</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Viewfinder element */}
              <div className="relative bg-slate-900 rounded-2xl overflow-hidden min-h-[260px] flex items-center justify-center">
                <div
                  id={scannerContainerId}
                  className={`w-full max-w-sm ${cameraActive ? 'block' : 'hidden'}`}
                />
                {!cameraActive && (
                  <div className="text-center p-6 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800 text-purple-400 flex items-center justify-center mx-auto">
                      <QrCode className="w-6 h-6" />
                    </div>
                    <p className="text-xs text-slate-300 font-semibold">
                      Kamera Scanner Belum Aktif
                    </p>
                    <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                      Klik tombol &quot;Nyalakan Kamera&quot; di atas untuk scan cepat barcode santri secara beruntun.
                    </p>
                  </div>
                )}
              </div>

              {/* Manual Input Fallback */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Atau Masukkan / Scan dengan Barcode Gun:
                </label>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (manualCode.trim()) handleProcessScan(manualCode);
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Ketik ID YYS / Scan Barcode (Contoh: YYS202600123)"
                    disabled={scanLoading}
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  />
                  <button
                    type="submit"
                    disabled={scanLoading || !manualCode.trim()}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold transition-colors"
                  >
                    {scanLoading ? 'Memproses...' : 'Proses'}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Right Column: Scan Result & Realtime Participant State */}
          <div className="lg:col-span-6 space-y-4">
            {/* Feedback Box Result */}
            {scanFeedback ? (
              <div
                className={`p-5 rounded-2xl border transition-all ${
                  scanFeedback.success
                    ? 'bg-emerald-50/70 border-emerald-300 shadow-sm'
                    : 'bg-rose-50/70 border-rose-300 shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                      scanFeedback.success
                        ? 'bg-emerald-200 text-emerald-900'
                        : 'bg-rose-200 text-rose-900'
                    }`}
                  >
                    {scanFeedback.success ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <XCircle className="w-6 h-6" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    <div>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          scanFeedback.success
                            ? 'bg-emerald-200 text-emerald-800'
                            : 'bg-rose-200 text-rose-800'
                        }`}
                      >
                        {scanFeedback.success
                          ? `Absensi ${scanFeedback.actionTaken} Berhasil`
                          : 'Validasi Absensi Gagal'}
                      </span>
                      <h4
                        className={`text-base font-bold mt-1 ${
                          scanFeedback.success ? 'text-emerald-950' : 'text-rose-950'
                        }`}
                      >
                        {scanFeedback.message}
                      </h4>
                    </div>

                    {/* Santri Details if available */}
                    {scanFeedback.santri && (
                      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1.5 text-xs">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-black text-slate-900 text-sm block">
                              {scanFeedback.santri.nama}
                            </span>
                            <span className="font-mono text-slate-500 text-[11px]">
                              {scanFeedback.santri.id_yys}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            {scanFeedback.santri.kelas?.nama_kelas || '-'}
                          </span>
                        </div>

                        {/* Atribut Khusus / Tempat PSG */}
                        {scanFeedback.participant?.atribut_khusus && (
                          <div className="p-2 rounded-lg bg-purple-50 border border-purple-100 text-purple-900">
                            <span className="text-[10px] font-bold block text-purple-700">
                              {event.jenis_kegiatan === 'PSG' ? 'Tempat PSG / Instansi:' : 'Atribut Peserta:'}
                            </span>
                            <span className="font-semibold">{scanFeedback.participant.atribut_khusus}</span>
                          </div>
                        )}

                        {/* Waktu Keberangkatan & Kepulangan */}
                        {scanFeedback.attendance && (
                          <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] font-mono">
                            <div className="p-1.5 bg-slate-50 rounded">
                              <span className="text-slate-400 block text-[10px]">Waktu Berangkat:</span>
                              <span className="font-bold text-slate-800">
                                {scanFeedback.attendance.waktu_berangkat
                                  ? new Date(scanFeedback.attendance.waktu_berangkat).toLocaleTimeString('id-ID', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      second: '2-digit',
                                    }) + ' WIB'
                                  : '-'}
                              </span>
                            </div>
                            <div className="p-1.5 bg-slate-50 rounded">
                              <span className="text-slate-400 block text-[10px]">Waktu Kembali:</span>
                              <span className="font-bold text-slate-800">
                                {scanFeedback.attendance.waktu_kembali
                                  ? new Date(scanFeedback.attendance.waktu_kembali).toLocaleTimeString('id-ID', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      second: '2-digit',
                                    }) + ' WIB'
                                  : 'Belum Kembali'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                <QrCode className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-bold text-slate-700 text-sm">Menunggu Pembacaan Barcode...</p>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Scan barcode santri peserta kegiatan {event.nama_kegiatan} untuk mencatat kehadiran.
                </p>
              </div>
            )}

            {/* Live Participant Quick Status on Selected Date */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                  Status Peserta Hari Ini ({selectedTanggal})
                </h3>
                <span className="text-xs text-slate-400">{participants.length} Total Peserta</span>
              </div>

              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {participants.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    Belum ada santri yang terdaftar dalam kegiatan ini.
                  </div>
                ) : (
                  participants.map((p) => {
                    const att = p.latest_attendance;
                    const isKembali = att?.waktu_kembali;
                    const isBerangkat = att?.waktu_berangkat && !isKembali;

                    return (
                      <div key={p.id} className="p-3 px-4 flex items-center justify-between text-xs hover:bg-slate-50">
                        <div className="min-w-0 pr-3">
                          <span className="font-bold text-slate-900 block truncate">
                            {p.santri?.nama || 'Nama Santri'}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {p.santri?.id_yys} • {p.santri?.kelas?.nama_kelas || '-'}
                          </span>
                          {p.atribut_khusus && (
                            <span className="text-[10px] text-purple-700 font-medium block truncate">
                              {p.atribut_khusus}
                            </span>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          {isKembali ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Selesai (Kembali)</span>
                            </span>
                          ) : isBerangkat ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              <LogOut className="w-3 h-3" />
                              <span>Di Luar (Berangkat)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                              Belum Berangkat
                            </span>
                          )}

                          {att?.waktu_berangkat && (
                            <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                              {new Date(att.waktu_berangkat).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                              {att.waktu_kembali &&
                                ` - ${new Date(att.waktu_kembali).toLocaleTimeString('id-ID', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}`}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DAFTAR PESERTA KEGIATAN */}
      {/* ========================================================================= */}
      {activeTab === 'peserta' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Daftar Santri Peserta {event.nama_kegiatan}
              </h3>
              <p className="text-xs text-slate-500">
                Santri yang terdaftar dapat melakukan absensi khusus kegiatan ini dengan ID YYS.
              </p>
            </div>

            {canManage && (
              <button
                type="button"
                onClick={() => setShowAddParticipantModal(true)}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Peserta Santri</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Santri</th>
                  <th className="py-3 px-4">Kelas & Kamar</th>
                  <th className="py-3 px-4">
                    {event.jenis_kegiatan === 'PSG' ? 'Tempat PSG / Instansi' : 'Atribut Khusus / Kelompok'}
                  </th>
                  <th className="py-3 px-4">Catatan</th>
                  {canManage && <th className="py-3 px-4 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {participants.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Belum ada peserta yang didaftarkan dalam kegiatan ini.
                    </td>
                  </tr>
                ) : (
                  participants.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div>
                          <span className="font-bold text-slate-900 block">{p.santri?.nama}</span>
                          <span className="font-mono text-slate-500 text-[11px]">{p.santri?.id_yys}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <span className="font-medium text-slate-800 block">
                            {p.santri?.kelas?.nama_kelas || '-'}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {getSantriKamarText(p.santri) ? (getSantriKamarText(p.santri).startsWith('Kamar') ? getSantriKamarText(p.santri) : `Kamar ${getSantriKamarText(p.santri)}`) : '-'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-purple-900 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100 inline-block">
                          {p.atribut_khusus || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{p.catatan || '-'}</td>
                      {canManage && (
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveParticipant(p.id, p.santri?.nama || '')}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                            title="Hapus peserta"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: REKAP ABSENSI EVENT */}
      {/* ========================================================================= */}
      {activeTab === 'rekap' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Rekap Absensi {event.nama_kegiatan} — {selectedTanggal}
              </h3>
              <p className="text-xs text-slate-500">
                Pencatatan waktu keberangkatan dan kepulangan santri ke pesantren.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Ekspor CSV</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Rekap</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Santri</th>
                  <th className="py-3 px-4">Kelas & Kamar</th>
                  <th className="py-3 px-4">
                    {event.jenis_kegiatan === 'PSG' ? 'Tempat PSG' : 'Atribut Peserta'}
                  </th>
                  <th className="py-3 px-4">Waktu Berangkat</th>
                  <th className="py-3 px-4">Waktu Kembali</th>
                  <th className="py-3 px-4">Status & Keterangan</th>
                  <th className="py-3 px-4">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {participants.map((p) => {
                  const att = p.latest_attendance;
                  const isKembali = !!att?.waktu_kembali;
                  const isBerangkat = !!att?.waktu_berangkat && !isKembali;
                  const statusInfo = getSpecialAttendanceStatusInfo(event, att, selectedTanggal);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <div>
                          <span className="font-bold text-slate-900 block">{p.santri?.nama}</span>
                          <span className="font-mono text-slate-500 text-[11px]">{p.santri?.id_yys}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <span className="font-medium text-slate-800 block">
                            {p.santri?.kelas?.nama_kelas || '-'}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {getSantriKamarText(p.santri) ? (getSantriKamarText(p.santri).startsWith('Kamar') ? getSantriKamarText(p.santri) : `Kamar ${getSantriKamarText(p.santri)}`) : '-'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-700">{p.atribut_khusus || '-'}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {att?.waktu_berangkat ? (
                          <div>
                            <span className="font-bold text-blue-700">
                              {new Date(att.waktu_berangkat).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}{' '}
                              WIB
                            </span>
                            {event.jam_batas_berangkat && (
                              <span className="block text-[10px] text-slate-400 font-sans">
                                Batas: {event.jam_batas_berangkat} WIB
                              </span>
                            )}
                          </div>
                        ) : (
                          <div>
                            <span className="text-slate-400 italic">Belum scan</span>
                            {event.jam_batas_berangkat && (
                              <span className="block text-[10px] text-slate-400 font-sans">
                                Batas: {event.jam_batas_berangkat} WIB
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {att?.waktu_kembali ? (
                          <div>
                            <span className="font-bold text-emerald-700">
                              {new Date(att.waktu_kembali).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}{' '}
                              WIB
                            </span>
                            {event.jam_batas_kembali && (
                              <span className="block text-[10px] text-slate-400 font-sans">
                                Batas: {event.jam_batas_kembali} WIB
                              </span>
                            )}
                          </div>
                        ) : isBerangkat ? (
                          <div>
                            <span className="text-amber-600 font-semibold italic">Belum kembali</span>
                            {event.jam_batas_kembali && (
                              <span className="block text-[10px] text-amber-700 font-sans">
                                Batas: {event.jam_batas_kembali} WIB
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] inline-block ${statusInfo.badgeClass}`}>
                            {statusInfo.label}
                          </span>
                          <span className="block text-[11px] text-slate-500">
                            {statusInfo.detailText}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                        {att?.catatan || p.catatan || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TAMBAH PESERTA KE KEGIATAN */}
      {/* ========================================================================= */}
      {showAddParticipantModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">
                Tambah Peserta ke {event.nama_kegiatan}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddParticipantModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            {/* Step 1: Search and pick santri */}
            {!selectedSantriToAdd ? (
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700">
                  Cari Santri dari Database Pesantren:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2 relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Cari nama atau ID YYS..."
                      value={addParticipantSearch}
                      onChange={(e) => setAddParticipantSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <select
                      value={addParticipantFilterKelas}
                      onChange={(e) => setAddParticipantFilterKelas(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-xl border border-slate-300 text-xs bg-white focus:ring-1 focus:ring-purple-500 focus:outline-hidden"
                    >
                      <option value="SEMUA">Semua Kelas</option>
                      {kelasList.map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.nama_kelas}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-56 overflow-y-auto">
                  {availableSantriToAdd.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      Tidak ada santri yang tersedia untuk ditambahkan.
                    </div>
                  ) : (
                    availableSantriToAdd.map((s) => (
                      <div
                        key={s.id}
                        className="p-2.5 px-3 flex items-center justify-between hover:bg-slate-50 transition-colors text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-800 block">{s.nama}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {s.id_yys} • {s.kelas?.nama_kelas || '-'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedSantriToAdd(s)}
                          className="px-3 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-700 text-xs font-bold transition-colors"
                        >
                          Pilih
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              /* Step 2: Fill in attributes and confirm */
              <div className="space-y-4">
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-purple-700 block">
                      Santri Terpilih:
                    </span>
                    <span className="font-bold text-slate-900 text-sm">{selectedSantriToAdd.nama}</span>
                    <span className="text-xs text-slate-500 block font-mono">
                      {selectedSantriToAdd.id_yys}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedSantriToAdd(null)}
                    className="text-xs font-semibold text-purple-700 hover:underline"
                  >
                    Ganti
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {event.jenis_kegiatan === 'PSG'
                      ? 'Tempat PSG / Instansi Penempatan:'
                      : 'Atribut Khusus / Penempatan / Kelompok:'}
                  </label>
                  <input
                    type="text"
                    value={newAtributKhusus}
                    onChange={(e) => setNewAtributKhusus(e.target.value)}
                    placeholder="Contoh: PT Telkom Surabaya / Regu Garuda"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Catatan Khusus (Opsional):
                  </label>
                  <textarea
                    rows={2}
                    value={newCatatan}
                    onChange={(e) => setNewCatatan(e.target.value)}
                    placeholder="Catatan guru pembimbing, nomor kontak mitra, dll..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedSantriToAdd(null)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold"
                  >
                    Kembali
                  </button>
                  <button
                    type="button"
                    onClick={handleAddParticipantSubmit}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold"
                  >
                    Simpan Peserta
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
