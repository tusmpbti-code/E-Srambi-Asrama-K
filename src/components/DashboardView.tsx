/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  Calendar,
  Activity,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Shield,
  Building,
  GraduationCap,
  Sparkles,
  QrCode,
  Layers,
  Clock,
  AlertCircle,
  BarChart3,
  FileCheck2,
  Home,
  LogOut,
  MapPin,
  ExternalLink,
  BookOpen,
  Briefcase,
  UserX,
  Compass,
  ChevronRight,
  Info,
  RefreshCw,
} from 'lucide-react';
import {
  ActiveNavMenu,
  IntegratedDashboardData,
  Santri,
  SantriPermission,
  getSantriKamarText,
} from '../types';
import { getIntegratedDashboardData } from '../services/dashboardService';
import { findSantriByBarcode } from '../services/santriService';
import { useAuth } from '../context/AuthContext';
import { ROLE_DEFINITIONS } from '../lib/roles';
import { SantriDetailModal } from './santri/SantriDetailModal';

interface DashboardViewProps {
  onNavigate: (menu: ActiveNavMenu, filterParams?: Record<string, unknown>) => void;
  onOpenBarcodeModal: () => void;
  onSelectSantri?: (santri: Santri) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenBarcodeModal,
  onSelectSantri,
}) => {
  const { currentRole, profile, isConfigured } = useAuth();
  const [data, setData] = useState<IntegratedDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // Quick lookup
  const [quickInput, setQuickInput] = useState('');
  const [lookupResult, setLookupResult] = useState<Santri | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Modal detail santri
  const [selectedSantriModal, setSelectedSantriModal] = useState<Santri | null>(null);

  // Alert detail preview modal
  const [activeAlertDetail, setActiveAlertDetail] = useState<{
    title: string;
    items: {
      id: string;
      nama: string;
      id_yys: string;
      kelas?: string;
      kamar?: string;
      keterangan?: string;
      badge?: string;
      badgeColor?: string;
      santriObj?: Santri;
    }[];
  } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getIntegratedDashboardData();
      setData(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleQuickLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;

    setLookupLoading(true);
    setLookupError(null);
    try {
      const result = await findSantriByBarcode(quickInput.trim());
      if (result) {
        setLookupResult(result);
        setSelectedSantriModal(result);
      } else {
        setLookupError(`Santri dengan ID / Barcode "${quickInput.trim()}" tidak ditemukan.`);
      }
    } finally {
      setLookupLoading(false);
    }
  };

  const openSantriDetail = (s: Santri) => {
    if (onSelectSantri) {
      onSelectSantri(s);
    } else {
      setSelectedSantriModal(s);
    }
  };

  const handleAlertClick = (alertId: string) => {
    if (!data) return;

    if (alertId === 'alert-perm-belum-kembali') {
      const items = (data.perizinan.belumKembaliList || []).map((p) => ({
        id: p.id,
        nama: p.santri?.nama || 'Santri',
        id_yys: p.santri?.id_yys || '-',
        kelas: p.santri?.kelas?.nama_kelas,
        kamar: getSantriKamarText(p.santri),
        keterangan: `Tujuan: ${p.tujuan} • Batas: ${new Date(p.batas_kembali).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`,
        badge: p.status === 'TERLAMBAT' ? 'Terlambat' : 'Sedang Keluar',
        badgeColor: p.status === 'TERLAMBAT' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800',
        santriObj: p.santri || undefined,
      }));
      setActiveAlertDetail({
        title: 'Santri Belum Kembali (Perizinan Keluar / Pulang)',
        items,
      });
    } else if (alertId === 'alert-psg-belum-kembali' || alertId === 'alert-event-belum-kembali') {
      const items = (data.kegiatanKhusus.belumKembaliList || []).map((item, idx) => ({
        id: `ev-${idx}`,
        nama: item.santri.nama,
        id_yys: item.santri.id_yys,
        kelas: item.santri.kelas?.nama_kelas,
        kamar: getSantriKamarText(item.santri),
        keterangan: `${item.eventName} (${item.eventJenis}) • Batas: ${item.batasKembali || '-'}`,
        badge: item.isTerlambat ? 'Terlambat Kembali' : 'Sedang di Luar',
        badgeColor: item.isTerlambat ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800',
        santriObj: item.santri,
      }));
      setActiveAlertDetail({
        title: 'Peserta PSG / Kegiatan Khusus Belum Kembali',
        items,
      });
    } else if (alertId === 'alert-absen-madin') {
      const items = (data.madin.belumAbsenList || []).map((s) => ({
        id: s.id,
        nama: s.nama,
        id_yys: s.id_yys,
        kelas: s.kelas?.nama_kelas,
        kamar: getSantriKamarText(s),
        keterangan: 'Belum tercatat dalam sesi Madin hari ini',
        badge: 'Belum Absen',
        badgeColor: 'bg-zinc-100 text-zinc-700',
        santriObj: s,
      }));
      setActiveAlertDetail({
        title: 'Santri Belum Absensi Madin Hari Ini',
        items,
      });
    } else if (alertId === 'alert-absen-sekolah') {
      const items = (data.sekolah.belumAbsenList || []).map((s) => ({
        id: s.id,
        nama: s.nama,
        id_yys: s.id_yys,
        kelas: s.kelas?.nama_kelas,
        kamar: getSantriKamarText(s),
        keterangan: 'Belum tercatat dalam absensi sekolah formal hari ini',
        badge: 'Belum Absen',
        badgeColor: 'bg-zinc-100 text-zinc-700',
        santriObj: s,
      }));
      setActiveAlertDetail({
        title: 'Santri Belum Absensi Sekolah Hari Ini',
        items,
      });
    } else if (alertId === 'alert-absen-jamaah') {
      const items = (data.jamaah.belumAbsenList || []).map((s) => ({
        id: s.id,
        nama: s.nama,
        id_yys: s.id_yys,
        kelas: s.kelas?.nama_kelas,
        kamar: getSantriKamarText(s),
        keterangan: 'Belum tercatat shalat fardhu berjamaah hari ini',
        badge: 'Belum Absen',
        badgeColor: 'bg-zinc-100 text-zinc-700',
        santriObj: s,
      }));
      setActiveAlertDetail({
        title: 'Santri Belum Absensi Jamaah Hari Ini',
        items,
      });
    } else if (alertId === 'alert-perm-menunggu') {
      onNavigate('perizinan', { status: 'DIAJUKAN' });
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header & Fast Barcode Scan Bar */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-2xl p-5 sm:p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-emerald-200 text-xs font-semibold uppercase tracking-wider mb-1">
            <Shield className="w-4 h-4" />
            <span>Dashboard Terpadu Pondok Pesantren</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Pusat Monitoring & Kehadiran Santri
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-xl">
            Kondisi riil terpadu hari ini: Sekolah, Madin, Jamaah, Perizinan Keluar/Pulang, serta Kegiatan Khusus & PSG.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenBarcodeModal}
            className="px-4 py-2.5 rounded-xl bg-white text-emerald-900 font-bold text-xs sm:text-sm hover:bg-emerald-50 transition-colors shadow-sm flex items-center space-x-2 shrink-0"
          >
            <QrCode className="w-4 h-4 text-emerald-700" />
            <span>Scan Barcode Cepat</span>
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Muat Ulang Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* QUICK LOOKUP BAR */}
      <div className="bg-white rounded-xl border border-zinc-200 p-3.5 sm:p-4 shadow-xs">
        <form onSubmit={handleQuickLookup} className="flex flex-col sm:flex-row gap-2.5 items-center">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              placeholder="Pencarian cepat santri: Masukkan ID YYS (YYS202600123) atau Barcode..."
              className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-700 font-mono uppercase"
            />
          </div>
          <button
            type="submit"
            disabled={lookupLoading || !quickInput.trim()}
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white text-xs font-semibold transition-colors shrink-0"
          >
            {lookupLoading ? 'Memeriksa...' : 'Buka Profil'}
          </button>
        </form>
        {lookupError && (
          <p className="text-xs text-rose-600 mt-2 font-medium flex items-center space-x-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{lookupError}</span>
          </p>
        )}
      </div>

      {/* ============================================================================== */}
      {/* 1. PANEL ALERT: PERLU PERHATIAN */}
      {/* ============================================================================== */}
      {data && data.alerts && data.alerts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-zinc-900 font-bold text-base">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span>PERLU PERHATIAN HARI INI</span>
            </div>
            <span className="text-xs text-zinc-500 font-medium">
              {data.alerts.length} item membutuhkan tindakan lanjut
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {data.alerts.map((alert) => (
              <div
                key={alert.id}
                onClick={() => handleAlertClick(alert.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md flex flex-col justify-between ${
                  alert.type === 'danger'
                    ? 'bg-rose-50/70 border-rose-200 hover:border-rose-300'
                    : alert.type === 'warning'
                    ? 'bg-amber-50/70 border-amber-200 hover:border-amber-300'
                    : 'bg-sky-50/70 border-sky-200 hover:border-sky-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        alert.type === 'danger'
                          ? 'bg-rose-600 text-white'
                          : alert.type === 'warning'
                          ? 'bg-amber-600 text-white'
                          : 'bg-sky-600 text-white'
                      }`}
                    >
                      {alert.count} Santri / Berkas
                    </span>
                    <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                      Klik untuk rincian
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-zinc-900 leading-snug">
                    {alert.title}
                  </h4>
                  <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                    {alert.description}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-zinc-200/60 flex items-center justify-between text-xs font-semibold">
                  <span
                    className={
                      alert.type === 'danger'
                        ? 'text-rose-700'
                        : alert.type === 'warning'
                        ? 'text-amber-800'
                        : 'text-sky-700'
                    }
                  >
                    {alert.actionLabel}
                  </span>
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* 2. TOTAL SANTRI BANNER */}
      {/* ============================================================================== */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-100 gap-2">
          <div>
            <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Populasi Master Santri</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-zinc-900 mt-0.5">
              {data?.totalSantri || 0}{' '}
              <span className="text-sm font-semibold text-zinc-500 font-sans">Total Santri Terdaftar</span>
            </div>
          </div>
          <button
            onClick={() => onNavigate('santri')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center space-x-1"
          >
            <span>Buka Data Master Santri</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-4 text-center">
          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
            <div className="text-lg font-extrabold text-emerald-800">{data?.santriAktif || 0}</div>
            <div className="text-xs font-semibold text-emerald-900 mt-0.5">Aktif Mukim</div>
          </div>
          <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100">
            <div className="text-lg font-extrabold text-amber-800">{data?.santriIzin || 0}</div>
            <div className="text-xs font-semibold text-amber-900 mt-0.5">Sedang Izin</div>
          </div>
          <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100">
            <div className="text-lg font-extrabold text-blue-800">{data?.santriSakit || 0}</div>
            <div className="text-xs font-semibold text-blue-900 mt-0.5">Sakit</div>
          </div>
          <div className="p-3 rounded-xl bg-zinc-100/70 border border-zinc-200">
            <div className="text-lg font-extrabold text-zinc-700">{data?.santriNonaktif || 0}</div>
            <div className="text-xs font-semibold text-zinc-800 mt-0.5">Nonaktif</div>
          </div>
          <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100 col-span-2 sm:col-span-1">
            <div className="text-lg font-extrabold text-purple-800">{data?.santriLulus || 0}</div>
            <div className="text-xs font-semibold text-purple-900 mt-0.5">Alumni / Lulus</div>
          </div>
        </div>
      </div>

      {/* ============================================================================== */}
      {/* 3. TIGA PILAR ABSENSI HARIAN: SEKOLAH, MADIN, JAMAAH */}
      {/* ============================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ABSENSI SEKOLAH */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">ABSENSI SEKOLAH</h3>
                  <div className="text-[11px] text-zinc-500">Formal Pagi (MTs / MA)</div>
                </div>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                {data?.sekolah.persentaseHadir || 0}% Hadir
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center my-3">
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-100">
                <div className="text-base font-extrabold text-emerald-800">{data?.sekolah.hadir || 0}</div>
                <div className="text-[11px] font-semibold text-emerald-700">Hadir</div>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-100">
                <div className="text-base font-extrabold text-amber-800">{data?.sekolah.izin || 0}</div>
                <div className="text-[11px] font-semibold text-amber-700">Izin</div>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-100">
                <div className="text-base font-extrabold text-blue-800">{data?.sekolah.sakit || 0}</div>
                <div className="text-[11px] font-semibold text-blue-700">Sakit</div>
              </div>
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-100">
                <div className="text-base font-extrabold text-rose-800">{data?.sekolah.alpa || 0}</div>
                <div className="text-[11px] font-semibold text-rose-700">Alpa</div>
              </div>
              <div className="p-2.5 rounded-lg bg-orange-50 border border-orange-100">
                <div className="text-base font-extrabold text-orange-800">{data?.sekolah.terlambat || 0}</div>
                <div className="text-[11px] font-semibold text-orange-700">Terlambat</div>
              </div>
              <div
                onClick={() => handleAlertClick('alert-absen-sekolah')}
                className="p-2.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 cursor-pointer transition-colors"
                title="Klik untuk melihat siapa saja yang belum absen"
              >
                <div className="text-base font-extrabold text-zinc-800">{data?.sekolah.belumAbsen || 0}</div>
                <div className="text-[11px] font-semibold text-zinc-600">Belum Absen</div>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('absensi', { kategori: 'Sekolah' })}
            className="mt-3 w-full py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold transition-colors flex items-center justify-center space-x-1.5"
          >
            <span>Buka Presensi Sekolah</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ABSENSI MADIN */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">ABSENSI MADIN</h3>
                  <div className="text-[11px] text-zinc-500">Madrasah Diniyah & Kajian Kitab</div>
                </div>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                {data?.madin.persentaseHadir || 0}% Hadir
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center my-3">
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-100">
                <div className="text-base font-extrabold text-emerald-800">{data?.madin.hadir || 0}</div>
                <div className="text-[11px] font-semibold text-emerald-700">Hadir</div>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-100">
                <div className="text-base font-extrabold text-amber-800">{data?.madin.izin || 0}</div>
                <div className="text-[11px] font-semibold text-amber-700">Izin</div>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-100">
                <div className="text-base font-extrabold text-blue-800">{data?.madin.sakit || 0}</div>
                <div className="text-[11px] font-semibold text-blue-700">Sakit</div>
              </div>
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-100">
                <div className="text-base font-extrabold text-rose-800">{data?.madin.alpa || 0}</div>
                <div className="text-[11px] font-semibold text-rose-700">Alpa</div>
              </div>
              <div className="p-2.5 rounded-lg bg-orange-50 border border-orange-100">
                <div className="text-base font-extrabold text-orange-800">{data?.madin.terlambat || 0}</div>
                <div className="text-[11px] font-semibold text-orange-700">Terlambat</div>
              </div>
              <div
                onClick={() => handleAlertClick('alert-absen-madin')}
                className="p-2.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 cursor-pointer transition-colors"
                title="Klik untuk melihat siapa saja yang belum absen"
              >
                <div className="text-base font-extrabold text-zinc-800">{data?.madin.belumAbsen || 0}</div>
                <div className="text-[11px] font-semibold text-zinc-600">Belum Absen</div>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('absensi', { kategori: 'Madin' })}
            className="mt-3 w-full py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-colors flex items-center justify-center space-x-1.5"
          >
            <span>Buka Presensi Madin</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ABSENSI JAMAAH */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">ABSENSI JAMAAH</h3>
                  <div className="text-[11px] text-zinc-500">Shalat 5 Waktu di Masjid Utama</div>
                </div>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                {data?.jamaah.persentaseHadir || 0}% Hadir
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center my-3">
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-100">
                <div className="text-base font-extrabold text-emerald-800">{data?.jamaah.hadir || 0}</div>
                <div className="text-[11px] font-semibold text-emerald-700">Hadir</div>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-100">
                <div className="text-base font-extrabold text-amber-800">{data?.jamaah.izin || 0}</div>
                <div className="text-[11px] font-semibold text-amber-700">Izin</div>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-100">
                <div className="text-base font-extrabold text-blue-800">{data?.jamaah.sakit || 0}</div>
                <div className="text-[11px] font-semibold text-blue-700">Sakit</div>
              </div>
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-100">
                <div className="text-base font-extrabold text-rose-800">{data?.jamaah.alpa || 0}</div>
                <div className="text-[11px] font-semibold text-rose-700">Alpa</div>
              </div>
              <div className="p-2.5 rounded-lg bg-orange-50 border border-orange-100">
                <div className="text-base font-extrabold text-orange-800">{data?.jamaah.terlambat || 0}</div>
                <div className="text-[11px] font-semibold text-orange-700">Terlambat</div>
              </div>
              <div
                onClick={() => handleAlertClick('alert-absen-jamaah')}
                className="p-2.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 cursor-pointer transition-colors"
                title="Klik untuk melihat siapa saja yang belum absen"
              >
                <div className="text-base font-extrabold text-zinc-800">{data?.jamaah.belumAbsen || 0}</div>
                <div className="text-[11px] font-semibold text-zinc-600">Belum Absen</div>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('absensi', { kategori: 'Jamaah' })}
            className="mt-3 w-full py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-bold transition-colors flex items-center justify-center space-x-1.5"
          >
            <span>Buka Presensi Jamaah</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ============================================================================== */}
      {/* 4. DUA MODUL PENGAWASAN: PERIZINAN & KEGIATAN KHUSUS (PSG) */}
      {/* ============================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* PERIZINAN */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900">STATUS PERIZINAN SANTRI</h3>
                  <div className="text-xs text-zinc-500">Izin Keluar Komplek & Izin Pulang ke Rumah</div>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                {data?.perizinan.sedangKeluar || 0} Sedang di Luar
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 text-center my-3">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <div className="text-lg font-extrabold text-amber-800">{data?.perizinan.menunggu || 0}</div>
                <div className="text-xs font-semibold text-amber-900">Menunggu</div>
              </div>
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                <div className="text-lg font-extrabold text-blue-800">{data?.perizinan.disetujui || 0}</div>
                <div className="text-xs font-semibold text-blue-900">Disetujui</div>
              </div>
              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200">
                <div className="text-lg font-extrabold text-indigo-800">{data?.perizinan.sedangKeluar || 0}</div>
                <div className="text-xs font-semibold text-indigo-900">Sedang Keluar</div>
              </div>
              <div
                onClick={() => handleAlertClick('alert-perm-belum-kembali')}
                className="p-3 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 cursor-pointer transition-colors"
                title="Klik untuk rincian santri belum kembali"
              >
                <div className="text-lg font-extrabold text-orange-800">{data?.perizinan.belumKembali || 0}</div>
                <div className="text-xs font-semibold text-orange-900">Belum Kembali</div>
              </div>
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                <div className="text-lg font-extrabold text-rose-800">{data?.perizinan.terlambat || 0}</div>
                <div className="text-xs font-semibold text-rose-900">Terlambat</div>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('perizinan')}
            className="mt-4 w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition-colors flex items-center justify-center space-x-2"
          >
            <span>Buka Manajemen Perizinan & Pos Jaga</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* KEGIATAN KHUSUS & PSG */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900">KEGIATAN KHUSUS & PSG</h3>
                  <div className="text-xs text-zinc-500">Pendidikan Sistem Ganda, LDKS, Perlombaan</div>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                {data?.kegiatanKhusus.peserta || 0} Peserta Aktif
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 text-center my-3">
              <div className="p-3 rounded-xl bg-zinc-100 border border-zinc-200">
                <div className="text-lg font-extrabold text-zinc-800">{data?.kegiatanKhusus.peserta || 0}</div>
                <div className="text-xs font-semibold text-zinc-700">Peserta</div>
              </div>
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                <div className="text-lg font-extrabold text-blue-800">{data?.kegiatanKhusus.sudahBerangkat || 0}</div>
                <div className="text-xs font-semibold text-blue-900">Berangkat</div>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                <div className="text-lg font-extrabold text-zinc-600">{data?.kegiatanKhusus.belumBerangkat || 0}</div>
                <div className="text-xs font-semibold text-zinc-700">Belum Berangkat</div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="text-lg font-extrabold text-emerald-800">{data?.kegiatanKhusus.sudahKembali || 0}</div>
                <div className="text-xs font-semibold text-emerald-900">Kembali</div>
              </div>
              <div
                onClick={() => handleAlertClick('alert-psg-belum-kembali')}
                className="p-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 cursor-pointer transition-colors"
                title="Klik untuk rincian peserta belum kembali"
              >
                <div className="text-lg font-extrabold text-amber-800">{data?.kegiatanKhusus.belumKembali || 0}</div>
                <div className="text-xs font-semibold text-amber-900">Belum Kembali</div>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('kegiatan_khusus')}
            className="mt-4 w-full py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold transition-colors flex items-center justify-center space-x-2"
          >
            <span>Buka Presensi Khusus & Presensi PSG</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ============================================================================== */}
      {/* ALERT DETAIL MODAL */}
      {/* ============================================================================== */}
      {activeAlertDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 bg-zinc-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">{activeAlertDetail.title}</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Total: {activeAlertDetail.items.length} santri tercatat dalam kategori ini
                </p>
              </div>
              <button
                onClick={() => setActiveAlertDetail(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <AlertCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 divide-y divide-zinc-100 space-y-1">
              {activeAlertDetail.items.length === 0 ? (
                <div className="py-12 text-center text-zinc-400">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-zinc-700">Kondisi Tuntas & Sempurna</p>
                  <p className="text-xs text-zinc-500">Tidak ada santri yang masuk dalam daftar perhatian ini.</p>
                </div>
              ) : (
                activeAlertDetail.items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (item.santriObj) {
                        openSantriDetail(item.santriObj);
                      }
                    }}
                    className="py-3 px-2 flex items-center justify-between hover:bg-zinc-50 rounded-xl transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-zinc-100 text-zinc-700 font-bold flex items-center justify-center shrink-0">
                        {item.nama.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-bold text-zinc-900 group-hover:text-emerald-800">
                            {item.nama}
                          </span>
                          <span className="font-mono text-xs text-zinc-500 font-semibold">
                            {item.id_yys}
                          </span>
                        </div>
                        <div className="text-xs text-zinc-500 mt-0.5">
                          {item.kelas || 'Kelas'} • {item.kamar || 'Kamar'} {item.keterangan ? `• ${item.keterangan}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      {item.badge && (
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${item.badgeColor || 'bg-zinc-100 text-zinc-700'}`}>
                          {item.badge}
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-emerald-700" />
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between text-xs text-zinc-500">
              <span>Klik pada nama santri untuk melihat riwayat lengkap</span>
              <button
                onClick={() => setActiveAlertDetail(null)}
                className="px-4 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SANTRI DETAIL MODAL */}
      <SantriDetailModal
        santri={selectedSantriModal}
        isOpen={!!selectedSantriModal}
        onClose={() => setSelectedSantriModal(null)}
      />
    </div>
  );
};
