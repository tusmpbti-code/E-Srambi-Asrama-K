/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart3,
  Calendar,
  Filter,
  Download,
  Printer,
  Users,
  Building,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Search,
  RefreshCw,
  FileCheck2,
  BookOpen,
  Compass,
  Clock,
  Briefcase,
  Layers,
  ArrowRight,
  Shield,
  FileSpreadsheet,
} from 'lucide-react';
import {
  ReportType,
  ReportFilter,
  Kegiatan,
  Kelas,
  Kamar,
  Santri,
  getSantriMadinText,
} from '../types';
import {
  getKegiatanList,
  getKelasList,
  getKamarList,
  getSantriList,
} from '../services/santriService';
import { getTodayDateString } from '../services/attendanceService';
import {
  ComprehensiveReportItem,
  ReportSummaryStats,
  fetchAttendanceReport,
  fetchPermissionReport,
  fetchSpecialEventsReport,
  fetchRekapSantriReport,
} from '../services/reportService';
import { getAuditLogs } from '../services/auditService';
import { SantriDetailModal } from './santri/SantriDetailModal';

export const LaporanView: React.FC = () => {
  const today = getTodayDateString();

  // Active Report Category (10 Reports + Audit)
  const [activeTab, setActiveTab] = useState<ReportType>('harian');

  // Master lists
  const [kegiatanList, setKegiatanList] = useState<Kegiatan[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [kamarList, setKamarList] = useState<Kamar[]>([]);
  const [santriList, setSantriList] = useState<Santri[]>([]);

  // Filter States
  const [startDate, setStartDate] = useState<string>('2026-09-01');
  const [endDate, setEndDate] = useState<string>(today);
  const [kegiatanId, setKegiatanId] = useState<string>('SEMUA');
  const [kelasId, setKelasId] = useState<string>('SEMUA');
  const [kamarId, setKamarId] = useState<string>('SEMUA');
  const [rayon, setRayon] = useState<string>('SEMUA');
  const [statusFilter, setStatusFilter] = useState<string>('SEMUA');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSantriId, setSelectedSantriId] = useState<string>('SEMUA');

  // Report Data
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ComprehensiveReportItem[]>([]);
  const [summary, setSummary] = useState<ReportSummaryStats>({
    total: 0,
    hadir: 0,
    izin: 0,
    sakit: 0,
    alpa: 0,
    terlambat: 0,
    belumKembali: 0,
    persentase: 100,
  });

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Modal Detail Santri
  const [selectedSantriForModal, setSelectedSantriForModal] = useState<Santri | null>(null);

  const madinOptions = useMemo(() => {
    const set = new Set<string>();
    santriList.forEach((s) => {
      const m = getSantriMadinText(s);
      if (m && m !== '-') set.add(m);
    });
    return Array.from(set).sort();
  }, [santriList]);

  // Load master datasets
  useEffect(() => {
    Promise.all([
      getKegiatanList(),
      getKelasList(),
      getKamarList(),
      getSantriList(),
    ]).then(([kegs, kls, kms, snts]) => {
      setKegiatanList(kegs);
      setKelasList(kls);
      setKamarList(kms);
      setSantriList(snts);
    });
  }, []);

  // Fetch Report Data based on active tab and filters
  const loadReportData = useCallback(async () => {
    setLoading(true);
    const filter: ReportFilter = {
      startDate,
      endDate,
      kegiatanId: kegiatanId !== 'SEMUA' ? kegiatanId : undefined,
      kelasId: kelasId !== 'SEMUA' ? kelasId : undefined,
      kamarId: kamarId !== 'SEMUA' ? kamarId : undefined,
      rayon: rayon !== 'SEMUA' ? rayon : undefined,
      santriId: selectedSantriId !== 'SEMUA' ? selectedSantriId : undefined,
      status: statusFilter !== 'SEMUA' ? statusFilter : undefined,
      searchQuery: searchQuery.trim() || undefined,
    };

    try {
      if (activeTab === 'harian') {
        const res = await fetchAttendanceReport('SEMUA', filter);
        setItems(res.items);
        setSummary(res.summary);
      } else if (activeTab === 'sekolah') {
        const res = await fetchAttendanceReport('Sekolah', filter);
        setItems(res.items);
        setSummary(res.summary);
      } else if (activeTab === 'madin') {
        const res = await fetchAttendanceReport('Madin', filter);
        setItems(res.items);
        setSummary(res.summary);
      } else if (activeTab === 'jamaah') {
        const res = await fetchAttendanceReport('Jamaah', filter);
        setItems(res.items);
        setSummary(res.summary);
      } else if (activeTab === 'perizinan') {
        const res = await fetchPermissionReport(false, filter);
        setItems(res.items);
        setSummary(res.summary);
      } else if (activeTab === 'belum_kembali') {
        const res = await fetchPermissionReport(true, filter);
        setItems(res.items);
        setSummary(res.summary);
      } else if (activeTab === 'psg') {
        const res = await fetchSpecialEventsReport(true, filter);
        setItems(res.items);
        setSummary(res.summary);
      } else if (activeTab === 'kegiatan_khusus') {
        const res = await fetchSpecialEventsReport(false, filter);
        setItems(res.items);
        setSummary(res.summary);
      } else if (activeTab === 'rekap_santri') {
        const res = await fetchRekapSantriReport(filter);
        setItems(res.items);
        setSummary(res.summary);
      } else if (activeTab === 'riwayat_santri') {
        // Individual santri records
        const res = await fetchAttendanceReport('SEMUA', filter);
        setItems(res.items);
        setSummary(res.summary);
      } else if (activeTab === 'audit') {
        const logs = await getAuditLogs({ limit: 100 });
        setAuditLogs(logs);
      }
    } finally {
      setLoading(false);
    }
  }, [
    activeTab,
    startDate,
    endDate,
    kegiatanId,
    kelasId,
    kamarId,
    rayon,
    statusFilter,
    searchQuery,
    selectedSantriId,
  ]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  // Export to CSV
  const handleExportCSV = () => {
    if (items.length === 0) {
      alert('Tidak ada data untuk diekspor.');
      return;
    }

    const headers = [
      'No',
      'Tanggal',
      'ID YYS',
      'NIS',
      'Nama Santri',
      'Kelas',
      'Kamar',
      'Kelas Madin',
      'Modul / Kegiatan',
      'Kategori / Detail',
      'Status',
      'Waktu',
      'Petugas',
      'Keterangan',
    ];

    const rows = items.map((it, idx) => [
      idx + 1,
      `"${it.tanggal}"`,
      `"${it.idYys}"`,
      `"${it.nis}"`,
      `"${it.nama}"`,
      `"${it.kelas}"`,
      `"${it.kamar}"`,
      `"${it.rayon}"`,
      `"${it.kegiatanModul}"`,
      `"${it.subKategori}"`,
      `"${it.status}"`,
      `"${it.waktu}"`,
      `"${it.petugas}"`,
      `"${it.keterangan.replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_${activeTab.toUpperCase()}_${startDate}_sd_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to Excel / HTML Table Ready
  const handleExportExcel = () => {
    if (items.length === 0) {
      alert('Tidak ada data untuk diekspor.');
      return;
    }

    let tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <style>
          table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 12px; }
          th { background-color: #065f46; color: #ffffff; padding: 8px; border: 1px solid #000; text-align: left; }
          td { padding: 6px; border: 1px solid #ddd; }
          .title { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
          .subtitle { font-size: 12px; color: #666; margin-bottom: 12px; }
        </style>
      </head>
      <body>
        <div class="title">LAPORAN ${activeTab.toUpperCase().replace('_', ' ')} - PONDOK PESANTREN</div>
        <div class="subtitle">Periode: ${startDate} s/d ${endDate} | Total Data: ${items.length}</div>
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Tanggal</th>
              <th>ID YYS</th>
              <th>NIS</th>
              <th>Nama Santri</th>
              <th>Kelas</th>
              <th>Kamar</th>
              <th>Kelas Madin</th>
              <th>Modul/Kegiatan</th>
              <th>Status</th>
              <th>Waktu</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
    `;

    items.forEach((it, idx) => {
      tableHtml += `
        <tr>
          <td>${idx + 1}</td>
          <td>${it.tanggal}</td>
          <td>${it.idYys}</td>
          <td>${it.nis}</td>
          <td>${it.nama}</td>
          <td>${it.kelas}</td>
          <td>${it.kamar}</td>
          <td>${it.rayon}</td>
          <td>${it.kegiatanModul}</td>
          <td>${it.status}</td>
          <td>${it.waktu}</td>
          <td>${it.keterangan}</td>
        </tr>
      `;
    });

    tableHtml += `
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Laporan_${activeTab}_${startDate}_sd_${endDate}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const REPORT_TABS: { id: ReportType; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'harian', label: '1. Absensi Harian', icon: Calendar },
    { id: 'sekolah', label: '2. Absensi Sekolah', icon: GraduationCap },
    { id: 'madin', label: '3. Absensi Madin', icon: BookOpen },
    { id: 'jamaah', label: '4. Absensi Jamaah', icon: Compass },
    { id: 'perizinan', label: '5. Perizinan', icon: Clock },
    { id: 'belum_kembali', label: '6. Belum Kembali', icon: AlertTriangle },
    { id: 'psg', label: '7. Laporan PSG', icon: Briefcase },
    { id: 'kegiatan_khusus', label: '8. Kegiatan Khusus', icon: Sparkles },
    { id: 'rekap_santri', label: '9. Rekap Santri', icon: Users },
    { id: 'riwayat_santri', label: '10. Riwayat Individu', icon: FileText },
    { id: 'audit', label: 'Audit Log Sistem', icon: Shield },
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-zinc-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-1">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Pusat Laporan & Ekspor Data Terpadu</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-900 tracking-tight">
            Laporan Kehadiran & Kedisiplinan Santri
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Menghubungkan data produksi Supabase dengan 10 modul laporan resmi, filter multivariabel, dan ekspor CSV/Excel.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors shadow-xs flex items-center space-x-1.5"
            title="Download CSV"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor CSV</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors shadow-xs flex items-center space-x-1.5"
            title="Download Excel / Spreadsheet"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Ekspor Excel</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition-colors shadow-xs flex items-center space-x-1.5"
            title="Cetak Laporan"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / PDF</span>
          </button>
        </div>
      </div>

      {/* 10 REPORTS TABS */}
      <div className="bg-white rounded-2xl p-2 border border-zinc-200 shadow-xs overflow-x-auto">
        <div className="flex space-x-1.5 min-w-max">
          {REPORT_TABS.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                  isActive
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-zinc-500'}`} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* MULTIVARIABLE FILTERS */}
      {activeTab !== 'audit' && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-zinc-600">
              <Filter className="w-4 h-4 text-emerald-700" />
              <span>Filter Data Laporan</span>
            </div>
            <button
              onClick={() => {
                setStartDate('2026-09-01');
                setEndDate(today);
                setKegiatanId('SEMUA');
                setKelasId('SEMUA');
                setKamarId('SEMUA');
                setRayon('SEMUA');
                setStatusFilter('SEMUA');
                setSearchQuery('');
                setSelectedSantriId('SEMUA');
              }}
              className="text-xs text-zinc-500 hover:text-emerald-700 font-medium"
            >
              Reset Filter
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
            {/* Tanggal Mulai */}
            <div>
              <label className="block text-zinc-500 font-semibold mb-1">Mulai Tanggal</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-700 font-mono"
              />
            </div>

            {/* Tanggal Selesai */}
            <div>
              <label className="block text-zinc-500 font-semibold mb-1">Sampai Tanggal</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-700 font-mono"
              />
            </div>

            {/* Kegiatan */}
            {['harian', 'sekolah', 'madin', 'jamaah', 'kegiatan_khusus'].includes(activeTab) && (
              <div>
                <label className="block text-zinc-500 font-semibold mb-1">Kegiatan</label>
                <select
                  value={kegiatanId}
                  onChange={(e) => setKegiatanId(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-700 bg-white"
                >
                  <option value="SEMUA">Semua Kegiatan</option>
                  {kegiatanList.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama_kegiatan}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Kelas */}
            <div>
              <label className="block text-zinc-500 font-semibold mb-1">Kelas</label>
              <select
                value={kelasId}
                onChange={(e) => setKelasId(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-700 bg-white"
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
              <label className="block text-zinc-500 font-semibold mb-1">Kamar Asrama</label>
              <select
                value={kamarId}
                onChange={(e) => setKamarId(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-700 bg-white"
              >
                <option value="SEMUA">Semua Kamar</option>
                {kamarList.map((k) => (
                  <option key={k.id} value={k.nama_kamar}>
                    {k.nama_kamar}
                  </option>
                ))}
              </select>
            </div>

            {/* Kelas Madin */}
            <div>
              <label className="block text-zinc-500 font-semibold mb-1">Kelas Madin</label>
              <select
                value={rayon}
                onChange={(e) => setRayon(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-700 bg-white"
              >
                <option value="SEMUA">Semua Kelas Madin</option>
                {madinOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-zinc-500 font-semibold mb-1">Status Kehadiran</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-700 bg-white"
              >
                <option value="SEMUA">Semua Status</option>
                <option value="HADIR">Hadir / Disetujui</option>
                <option value="IZIN">Izin / Sedang Keluar</option>
                <option value="SAKIT">Sakit</option>
                <option value="ALPA">Alpa / Tidak Hadir</option>
                <option value="TERLAMBAT">Terlambat</option>
              </select>
            </div>

            {/* Search query */}
            <div className="col-span-1 sm:col-span-2">
              <label className="block text-zinc-500 font-semibold mb-1">Cari Santri (Nama / ID YYS / NIS)</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ketik nama atau ID..."
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUMMARY STATS BAR */}
      {activeTab !== 'audit' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          <div className="bg-white p-3 rounded-xl border border-zinc-200 text-center">
            <div className="text-base font-extrabold text-zinc-900">{summary.total}</div>
            <div className="text-[11px] font-semibold text-zinc-500">Total Baris</div>
          </div>
          <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-center">
            <div className="text-base font-extrabold text-emerald-800">{summary.hadir}</div>
            <div className="text-[11px] font-semibold text-emerald-700">Hadir / Disetujui</div>
          </div>
          <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 text-center">
            <div className="text-base font-extrabold text-amber-800">{summary.izin}</div>
            <div className="text-[11px] font-semibold text-amber-700">Izin / Keluar</div>
          </div>
          <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-center">
            <div className="text-base font-extrabold text-blue-800">{summary.sakit}</div>
            <div className="text-[11px] font-semibold text-blue-700">Sakit</div>
          </div>
          <div className="bg-rose-50 p-3 rounded-xl border border-rose-100 text-center">
            <div className="text-base font-extrabold text-rose-800">{summary.alpa}</div>
            <div className="text-[11px] font-semibold text-rose-700">Alpa</div>
          </div>
          <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 text-center">
            <div className="text-base font-extrabold text-orange-800">{summary.terlambat}</div>
            <div className="text-[11px] font-semibold text-orange-700">Terlambat</div>
          </div>
          <div className="bg-teal-50 p-3 rounded-xl border border-teal-100 text-center col-span-2 sm:col-span-1">
            <div className="text-base font-extrabold text-teal-800">{summary.persentase}%</div>
            <div className="text-[11px] font-semibold text-teal-700">% Disiplin</div>
          </div>
        </div>
      )}

      {/* TABLE CONTENT */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        {activeTab === 'audit' ? (
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-zinc-900 text-base">Audit Trail & Rekam Jejak Sistem</h3>
              <span className="text-xs text-zinc-500">Mencatat seluruh aksi login, absensi, izin, dan update status</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 text-zinc-600 font-semibold border-b border-zinc-200 uppercase">
                  <tr>
                    <th className="py-3 px-4">Waktu</th>
                    <th className="py-3 px-4">Aksi</th>
                    <th className="py-3 px-4">Tabel Terkait</th>
                    <th className="py-3 px-4">Pengguna / Petugas</th>
                    <th className="py-3 px-4">Rincian Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-zinc-400">
                        Belum ada riwayat audit tersimpan.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-zinc-50">
                        <td className="py-3 px-4 whitespace-nowrap text-zinc-500 font-mono">
                          {new Date(log.created_at).toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded font-bold bg-zinc-100 text-zinc-800">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-zinc-600">{log.table_name || '-'}</td>
                        <td className="py-3 px-4 font-semibold text-zinc-800">{log.user_email || 'System'}</td>
                        <td className="py-3 px-4 font-mono text-zinc-500 max-w-sm truncate">
                          {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : loading ? (
          <div className="py-16 text-center text-zinc-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-700 mb-2" />
            <p className="text-sm font-medium">Memuat dan menyusun data laporan...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-zinc-400">
            <FileText className="w-10 h-10 mx-auto text-zinc-300 mb-2" />
            <p className="text-base font-semibold text-zinc-700">Tidak ada data yang sesuai filter</p>
            <p className="text-xs text-zinc-400 mt-1">Coba sesuaikan rentang tanggal atau bersihkan filter pencarian.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-zinc-50 text-zinc-600 font-bold uppercase text-[11px] border-b border-zinc-200">
                <tr>
                  <th className="py-3 px-4">No</th>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Santri</th>
                  <th className="py-3 px-4">Kelas & Kamar</th>
                  <th className="py-3 px-4">Kegiatan / Modul</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">Keterangan</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {items.map((it, idx) => {
                  const sObj = santriList.find((s) => s.id === it.santriId);
                  return (
                    <tr key={`${it.id}-${idx}`} className="hover:bg-emerald-50/40 transition-colors">
                      <td className="py-3 px-4 text-zinc-400 font-mono text-xs">{idx + 1}</td>
                      <td className="py-3 px-4 whitespace-nowrap font-semibold text-zinc-800">
                        {it.tanggal}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-zinc-900">{it.nama}</div>
                        <div className="text-[11px] text-zinc-500 font-mono">
                          {it.idYys} {it.nis !== '-' ? `• NIS: ${it.nis}` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-zinc-800">{it.kelas}</div>
                        <div className="text-[11px] text-zinc-500">{it.kamar ? (it.kamar.startsWith('Kamar') ? it.kamar : `Kamar ${it.kamar}`) : '-'} • Madin: {it.rayon}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-zinc-900">{it.kegiatanModul}</div>
                        <div className="text-[11px] text-zinc-500">{it.subKategori}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                            it.status === 'HADIR' || it.status === 'DISETUJUI' || it.status === 'Aktif' || it.status === 'SUDAH_KEMBALI'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : it.status === 'IZIN' || it.status === 'DIAJUKAN' || it.status === 'SUDAH_BERANGKAT'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : it.status === 'SAKIT'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {it.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-xs font-mono text-zinc-600">
                        {it.waktu}
                      </td>
                      <td className="py-3 px-4 text-xs text-zinc-600 max-w-xs truncate">
                        {it.keterangan}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {sObj && (
                          <button
                            onClick={() => setSelectedSantriForModal(sObj)}
                            className="px-2.5 py-1 rounded bg-zinc-100 hover:bg-emerald-100 text-zinc-700 hover:text-emerald-800 text-xs font-bold transition-colors"
                          >
                            Riwayat
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer */}
        <div className="p-4 bg-zinc-50 border-t border-zinc-200 text-xs text-zinc-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span>Menampilkan {items.length} catatan terverifikasi dari server pondok pesantren.</span>
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-emerald-800">Format Siap Cetak & Ekspor Resmi</span>
          </div>
        </div>
      </div>

      {/* Santri Detail Modal */}
      <SantriDetailModal
        santri={selectedSantriForModal}
        isOpen={!!selectedSantriForModal}
        onClose={() => setSelectedSantriForModal(null)}
      />
    </div>
  );
};
