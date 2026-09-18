/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
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
  Download,
  Printer,
  Home,
  LogOut,
  LogIn,
  MapPin,
  FileText,
  Building,
  School,
  Sparkles,
} from 'lucide-react';
import {
  SantriPermission,
  PermissionType,
  PermissionStatus,
  Kelas,
  Kamar,
  Santri,
} from '../types';
import { getPermissions } from '../services/permissionService';
import { getTodayDateString } from '../services/attendanceService';

interface LaporanPerizinanSectionProps {
  kelasList: Kelas[];
  kamarList: Kamar[];
  santriList: Santri[];
}

export type PerizinanReportPreset =
  | 'hari_ini'
  | 'belum_kembali'
  | 'terlambat'
  | 'riwayat_santri'
  | 'berdasarkan_kamar'
  | 'berdasarkan_kelas'
  | 'periode';

export const LaporanPerizinanSection: React.FC<LaporanPerizinanSectionProps> = ({
  kelasList,
  kamarList,
  santriList,
}) => {
  const today = getTodayDateString();

  // Preset tab
  const [preset, setPreset] = useState<PerizinanReportPreset>('hari_ini');

  // Filters
  const [startDate, setStartDate] = useState<string>('2026-09-01');
  const [endDate, setEndDate] = useState<string>(today);
  const [filterJenis, setFilterJenis] = useState<PermissionType | 'SEMUA'>('SEMUA');
  const [filterStatus, setFilterStatus] = useState<PermissionStatus | 'SEMUA'>('SEMUA');
  const [filterKelas, setFilterKelas] = useState<string>('SEMUA');
  const [filterKamar, setFilterKamar] = useState<string>('SEMUA');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Data
  const [allPermissions, setAllPermissions] = useState<SantriPermission[]>([]);
  const [loading, setLoading] = useState(true);

  // Load permissions data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const data = await getPermissions();
        setAllPermissions(data);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filtered dataset based on active preset & filter inputs
  const filteredData = useMemo(() => {
    const now = new Date();

    return allPermissions.filter((item) => {
      const batasDate = new Date(item.batas_kembali);
      const isLate =
        item.status === 'TERLAMBAT' ||
        (item.status === 'SUDAH_KELUAR' && !item.waktu_kembali && now > batasDate);
      const isBelumKembali =
        (item.status === 'SUDAH_KELUAR' || item.status === 'DISETUJUI') && !item.waktu_kembali;

      // 1. Preset filter logic
      switch (preset) {
        case 'hari_ini':
          // Izin yang jadwal keluarnya hari ini atau batas kembalinya hari ini
          if (item.tanggal_keluar !== today && !item.batas_kembali.startsWith(today)) {
            return false;
          }
          break;

        case 'belum_kembali':
          if (!isBelumKembali) return false;
          break;

        case 'terlambat':
          if (!isLate) return false;
          break;

        case 'periode':
        case 'riwayat_santri':
        case 'berdasarkan_kamar':
        case 'berdasarkan_kelas':
          if (item.tanggal_keluar < startDate || item.tanggal_keluar > endDate) {
            return false;
          }
          break;
      }

      // 2. Extra dropdown filters
      if (filterJenis !== 'SEMUA' && item.jenis !== filterJenis) return false;
      if (filterStatus !== 'SEMUA' && item.status !== filterStatus) return false;
      if (filterKelas !== 'SEMUA' && item.santri?.kelas_id !== filterKelas) return false;
      if (filterKamar !== 'SEMUA' && item.santri?.kamar_id !== filterKamar) return false;

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.santri?.nama.toLowerCase().includes(q);
        const matchId = item.santri?.id_yys.toLowerCase().includes(q);
        const matchTujuan = item.tujuan.toLowerCase().includes(q);
        const matchAlasan = item.alasan.toLowerCase().includes(q);
        const matchWali = item.penanggung_jawab.toLowerCase().includes(q);
        const matchKelas = item.santri?.kelas?.nama_kelas.toLowerCase().includes(q);
        const matchKamar = item.santri?.kamar?.nama_kamar.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchTujuan && !matchAlasan && !matchWali && !matchKelas && !matchKamar) {
          return false;
        }
      }

      return true;
    });
  }, [
    allPermissions,
    preset,
    today,
    startDate,
    endDate,
    filterJenis,
    filterStatus,
    filterKelas,
    filterKamar,
    searchQuery,
  ]);

  // Summary Metrics
  const summary = useMemo(() => {
    let sedangKeluar = 0;
    let pulang = 0;
    let belumKembali = 0;
    let terlambat = 0;
    let selesai = 0;
    const now = new Date();

    filteredData.forEach((p) => {
      const batasDate = new Date(p.batas_kembali);
      const isLate =
        p.status === 'TERLAMBAT' ||
        (p.status === 'SUDAH_KELUAR' && !p.waktu_kembali && now > batasDate);

      if (p.status === 'SUDAH_KELUAR' && p.jenis === 'IZIN_KELUAR') sedangKeluar++;
      if (p.status === 'SUDAH_KELUAR' && p.jenis === 'IZIN_PULANG') pulang++;
      if ((p.status === 'SUDAH_KELUAR' || p.status === 'DISETUJUI') && !p.waktu_kembali) {
        belumKembali++;
      }
      if (isLate) terlambat++;
      if (['SUDAH_KEMBALI', 'SELESAI'].includes(p.status)) selesai++;
    });

    return {
      total: filteredData.length,
      sedangKeluar,
      pulang,
      belumKembali,
      terlambat,
      selesai,
    };
  }, [filteredData]);

  // Grouped breakdown based on Room or Class if active preset
  const groupedBreakdown = useMemo(() => {
    if (preset === 'berdasarkan_kamar') {
      const map = new Map<string, { label: string; count: number; terlambat: number; belumKembali: number }>();
      filteredData.forEach((p) => {
        const kmr = p.santri?.kamar?.nama_kamar || 'Tanpa Kamar';
        if (!map.has(kmr)) {
          map.set(kmr, { label: kmr, count: 0, terlambat: 0, belumKembali: 0 });
        }
        const row = map.get(kmr)!;
        row.count++;
        const now = new Date();
        const isLate =
          p.status === 'TERLAMBAT' ||
          (p.status === 'SUDAH_KELUAR' && !p.waktu_kembali && now > new Date(p.batas_kembali));
        if (isLate) row.terlambat++;
        if ((p.status === 'SUDAH_KELUAR' || p.status === 'DISETUJUI') && !p.waktu_kembali) {
          row.belumKembali++;
        }
      });
      return Array.from(map.values());
    }

    if (preset === 'berdasarkan_kelas') {
      const map = new Map<string, { label: string; count: number; terlambat: number; belumKembali: number }>();
      filteredData.forEach((p) => {
        const kls = p.santri?.kelas?.nama_kelas || 'Tanpa Kelas';
        if (!map.has(kls)) {
          map.set(kls, { label: kls, count: 0, terlambat: 0, belumKembali: 0 });
        }
        const row = map.get(kls)!;
        row.count++;
        const now = new Date();
        const isLate =
          p.status === 'TERLAMBAT' ||
          (p.status === 'SUDAH_KELUAR' && !p.waktu_kembali && now > new Date(p.batas_kembali));
        if (isLate) row.terlambat++;
        if ((p.status === 'SUDAH_KELUAR' || p.status === 'DISETUJUI') && !p.waktu_kembali) {
          row.belumKembali++;
        }
      });
      return Array.from(map.values());
    }

    return [];
  }, [preset, filteredData]);

  // Export CSV Handler
  const handleExportCSV = () => {
    if (filteredData.length === 0) {
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

    const rows = filteredData.map((p) => [
      p.id,
      p.santri?.id_yys || '',
      `"${p.santri?.nama || ''}"`,
      `"${p.santri?.kelas?.nama_kelas || ''}"`,
      `"${p.santri?.kamar?.nama_kamar || ''}"`,
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
      `Laporan_Perizinan_${preset}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Action Header & Presets */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wider">
            <FileCheck2 className="w-4 h-4 text-blue-600" />
            <span>Laporan Khusus Perizinan & Kedisiplinan</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            Laporan Rekapitulasi Perizinan Santri
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Monitoring izin pulang, izin keluar, keterlambatan santri, dan riwayat berdasarkan kamar & kelas.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            id="btn-export-laporan-perizinan-csv"
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Ekspor CSV</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Rekap</span>
          </button>
        </div>
      </div>

      {/* 7 Tab Presets Sesuai Spesifikasi */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 px-1">
          Kategori Laporan Perizinan:
        </span>
        <div className="flex flex-wrap gap-2">
          {/* 1. Izin Hari Ini */}
          <button
            type="button"
            onClick={() => setPreset('hari_ini')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              preset === 'hari_ini'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
            }`}
          >
            1. Izin Hari Ini
          </button>

          {/* 2. Belum Kembali */}
          <button
            type="button"
            onClick={() => setPreset('belum_kembali')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              preset === 'belum_kembali'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-orange-50 text-orange-800 hover:bg-orange-100 border border-orange-200'
            }`}
          >
            2. Belum Kembali
          </button>

          {/* 3. Terlambat */}
          <button
            type="button"
            onClick={() => setPreset('terlambat')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              preset === 'terlambat'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            3. Terlambat Kembali
          </button>

          {/* 4. Riwayat Izin Santri */}
          <button
            type="button"
            onClick={() => setPreset('riwayat_santri')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              preset === 'riwayat_santri'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            4. Riwayat Izin Santri
          </button>

          {/* 5. Riwayat Berdasarkan Kamar */}
          <button
            type="button"
            onClick={() => setPreset('berdasarkan_kamar')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
              preset === 'berdasarkan_kamar'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>5. Berdasarkan Kamar</span>
          </button>

          {/* 6. Riwayat Berdasarkan Kelas */}
          <button
            type="button"
            onClick={() => setPreset('berdasarkan_kelas')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
              preset === 'berdasarkan_kelas'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
            }`}
          >
            <School className="w-3.5 h-3.5" />
            <span>6. Berdasarkan Kelas</span>
          </button>

          {/* 7. Laporan Periode Tertentu */}
          <button
            type="button"
            onClick={() => setPreset('periode')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
              preset === 'periode'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>7. Periode Tertentu</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Izin
          </span>
          <span className="text-xl sm:text-2xl font-black text-slate-900 mt-1 block">
            {summary.total}
          </span>
          <span className="text-[10px] text-slate-400">Sesuai filter</span>
        </div>

        <div className="bg-amber-50/50 p-3.5 rounded-2xl border border-amber-200 shadow-2xs">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
            Sedang Keluar
          </span>
          <span className="text-xl sm:text-2xl font-black text-amber-700 mt-1 block">
            {summary.sedangKeluar}
          </span>
          <span className="text-[10px] text-amber-600">Izin Sementara</span>
        </div>

        <div className="bg-blue-50/50 p-3.5 rounded-2xl border border-blue-200 shadow-2xs">
          <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block">
            Santri Pulang
          </span>
          <span className="text-xl sm:text-2xl font-black text-blue-700 mt-1 block">
            {summary.pulang}
          </span>
          <span className="text-[10px] text-blue-600">Di Rumah Wali</span>
        </div>

        <div className="bg-orange-50/50 p-3.5 rounded-2xl border border-orange-200 shadow-2xs">
          <span className="text-[11px] font-bold text-orange-800 uppercase tracking-wider block">
            Belum Kembali
          </span>
          <span className="text-xl sm:text-2xl font-black text-orange-700 mt-1 block">
            {summary.belumKembali}
          </span>
          <span className="text-[10px] text-orange-600">Di Luar Pondok</span>
        </div>

        <div className="bg-rose-50/50 p-3.5 rounded-2xl border border-rose-200 shadow-2xs">
          <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block">
            Terlambat
          </span>
          <span className="text-xl sm:text-2xl font-black text-rose-700 mt-1 block">
            {summary.terlambat}
          </span>
          <span className="text-[10px] text-rose-600">Lewat Batas</span>
        </div>

        <div className="bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-200 shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
            Selesai / Kembali
          </span>
          <span className="text-xl sm:text-2xl font-black text-emerald-700 mt-1 block">
            {summary.selesai}
          </span>
          <span className="text-[10px] text-emerald-600">Tepat Waktu</span>
        </div>
      </div>

      {/* Filter Parameters */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-blue-600" />
            <span>Filter Kriteria Laporan</span>
          </span>

          {/* Quick Date Buttons for Periode */}
          {['periode', 'riwayat_santri', 'berdasarkan_kamar', 'berdasarkan_kelas'].includes(preset) && (
            <div className="flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setStartDate(today);
                  setEndDate(today);
                }}
                className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() - 7);
                  setStartDate(d.toISOString().split('T')[0]);
                  setEndDate(today);
                }}
                className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
              >
                7 Hari
              </button>
              <button
                type="button"
                onClick={() => {
                  setStartDate('2026-09-01');
                  setEndDate(today);
                }}
                className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
              >
                Bulan Ini
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Dari Tanggal */}
          {['periode', 'riwayat_santri', 'berdasarkan_kamar', 'berdasarkan_kelas'].includes(preset) && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Dari Tanggal
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Sampai Tanggal
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </>
          )}

          {/* Jenis Izin */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Jenis Izin
            </label>
            <select
              value={filterJenis}
              onChange={(e) => setFilterJenis(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="SEMUA">Semua Jenis (Pulang & Keluar)</option>
              <option value="IZIN_PULANG">Izin Pulang (Rumah)</option>
              <option value="IZIN_KELUAR">Izin Keluar (Sementara)</option>
            </select>
          </div>

          {/* Status Izin */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Status Izin
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="SEMUA">Semua Status</option>
              <option value="DIAJUKAN">Diajukan (Menunggu)</option>
              <option value="DISETUJUI">Disetujui</option>
              <option value="SUDAH_KELUAR">Sudah Keluar</option>
              <option value="SUDAH_KEMBALI">Sudah Kembali</option>
              <option value="TERLAMBAT">Terlambat</option>
              <option value="SELESAI">Selesai</option>
              <option value="DITOLAK">Ditolak</option>
            </select>
          </div>

          {/* Kelas */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Kelas
            </label>
            <select
              value={filterKelas}
              onChange={(e) => setFilterKelas(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="SEMUA">Semua Kelas</option>
              {kelasList.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama_kelas}
                </option>
              ))}
            </select>
          </div>

          {/* Kamar */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Kamar Asrama
            </label>
            <select
              value={filterKamar}
              onChange={(e) => setFilterKamar(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="SEMUA">Semua Kamar</option>
              {kamarList.map((kmr) => (
                <option key={kmr.id} value={kmr.id}>
                  {kmr.nama_kamar} - {kmr.gedung}
                </option>
              ))}
            </select>
          </div>

          {/* Search Bar */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Pencarian Kata Kunci
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama santri, ID YYS, tujuan, wali..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown Table if 'berdasarkan_kamar' or 'berdasarkan_kelas' is active */}
      {groupedBreakdown.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <BarChartIcon className="w-4 h-4 text-emerald-600" />
            <span>
              Rekapitulasi {preset === 'berdasarkan_kamar' ? 'Per Kamar Asrama' : 'Per Kelas Santri'}
            </span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {groupedBreakdown.map((item, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-800 text-xs block truncate">{item.label}</span>
                <div className="flex items-center justify-between text-xs mt-1.5">
                  <span className="text-slate-500">Total Izin:</span>
                  <span className="font-bold text-slate-900">{item.count}</span>
                </div>
                <div className="flex items-center justify-between text-xs mt-0.5">
                  <span className="text-orange-600">Belum Kembali:</span>
                  <span className="font-bold text-orange-700">{item.belumKembali}</span>
                </div>
                <div className="flex items-center justify-between text-xs mt-0.5">
                  <span className="text-rose-600">Terlambat:</span>
                  <span className="font-bold text-rose-700">{item.terlambat}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Table of Permissions */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              Detail Rekapitulasi Data Izin
            </h3>
            <p className="text-xs text-slate-500">
              Menampilkan {filteredData.length} data perizinan berdasarkan filter yang aktif.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs">Memuat laporan perizinan...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <FileText className="w-10 h-10 mx-auto text-slate-300" />
            <p className="font-bold text-sm text-slate-700">Tidak ada data perizinan</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Tidak ditemukan data izin yang sesuai dengan preset atau filter yang dipilih.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Santri</th>
                  <th className="py-3 px-4">Kelas & Kamar</th>
                  <th className="py-3 px-4">Jenis Izin</th>
                  <th className="py-3 px-4">Alasan & Tujuan</th>
                  <th className="py-3 px-4">Waktu Keluar</th>
                  <th className="py-3 px-4">Batas Kembali</th>
                  <th className="py-3 px-4">Waktu Kembali</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredData.map((item) => {
                  const now = new Date();
                  const batasDate = new Date(item.batas_kembali);
                  const isLate =
                    item.status === 'TERLAMBAT' ||
                    (item.status === 'SUDAH_KELUAR' && !item.waktu_kembali && now > batasDate);

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isLate ? 'bg-rose-50/30' : ''
                      }`}
                    >
                      {/* Santri */}
                      <td className="py-3.5 px-4">
                        <div>
                          <span className="font-bold text-slate-900 block">
                            {item.santri?.nama || 'Nama Santri'}
                          </span>
                          <span className="font-mono text-[11px] text-slate-500">
                            {item.santri?.id_yys}
                          </span>
                        </div>
                      </td>

                      {/* Kelas & Kamar */}
                      <td className="py-3.5 px-4 text-slate-700">
                        <div>
                          <span className="font-medium block">{item.santri?.kelas?.nama_kelas || '-'}</span>
                          <span className="text-[11px] text-slate-500">{item.santri?.kamar?.nama_kamar || '-'}</span>
                        </div>
                      </td>

                      {/* Jenis */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.jenis === 'IZIN_PULANG'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.jenis === 'IZIN_PULANG' ? 'Izin Pulang' : 'Izin Keluar'}
                        </span>
                      </td>

                      {/* Alasan & Tujuan */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="font-medium text-slate-800 truncate">{item.alasan}</p>
                        <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{item.tujuan} (PJ: {item.penanggung_jawab})</span>
                        </p>
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
                          {new Date(item.batas_kembali).toLocaleString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
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
                            {new Date(item.waktu_kembali).toLocaleString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Belum kembali</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isLate ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <AlertTriangle className="w-3 h-3" />
                            <span>TERLAMBAT</span>
                          </span>
                        ) : item.status === 'SUDAH_KEMBALI' || item.status === 'SELESAI' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{item.status}</span>
                          </span>
                        ) : item.status === 'SUDAH_KELUAR' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-orange-100 text-orange-800 border border-orange-200">
                            <LogOut className="w-3 h-3" />
                            <span>Sudah Keluar</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                            <span>{item.status}</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

function BarChartIcon(props: { className?: string }) {
  return (
    <svg
      className={props.className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" x2="12" y1="20" y2="10" />
      <line x1="18" x2="18" y1="20" y2="4" />
      <line x1="6" x2="6" y1="20" y2="16" />
    </svg>
  );
}
