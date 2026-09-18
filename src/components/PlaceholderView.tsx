/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Clock, Shield, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { ActiveNavMenu } from '../types';
import { useAuth } from '../context/AuthContext';
import { ROLE_DEFINITIONS } from '../lib/roles';

interface PlaceholderViewProps {
  menu: ActiveNavMenu;
  onBackToDashboard: () => void;
}

const MENU_META: Record<
  ActiveNavMenu,
  {
    title: string;
    stage: string;
    description: string;
    rolesAllowed: string[];
    upcomingFeatures: string[];
  }
> = {
  dashboard: {
    title: 'Dashboard',
    stage: 'Tahap 1 (Aktif)',
    description: 'Ringkasan sistem, status database, dan pencarian cepat barcode santri.',
    rolesAllowed: ['Semua Role'],
    upcomingFeatures: [],
  },
  santri: {
    title: 'Data Master Santri',
    stage: 'Tahap 1 (Aktif)',
    description: 'Manajemen identitas santri, ID YYS unik, barcode fisik, kelas, dan kamar.',
    rolesAllowed: ['Super Admin', 'Admin', 'Pengurus Asrama (Read/Kamar)'],
    upcomingFeatures: [],
  },
  kegiatan: {
    title: 'Modul Jadwal & Master Kegiatan',
    stage: 'Tahap 2',
    description:
      'Penyusunan jadwal kegiatan terjadwal meliputi Shalat Berjamaah 5 Waktu, Madrasah Diniyah (Madin), Sekolah Formal (MTs & MA), dan Kegiatan Asrama.',
    rolesAllowed: ['Super Admin', 'Admin'],
    upcomingFeatures: [
      'Master data jadwal shalat 5 waktu & toleransi keterlambatan',
      'Jadwal pelajaran Madrasah Diniyah & absensi per kelas',
      'Jadwal sekolah formal & kalender akademik pesantren',
      'Penetapan petugas piket per kegiatan',
    ],
  },
  absensi: {
    title: 'Modul Presensi & Absensi Terpadu',
    stage: 'Tahap 2',
    description:
      'Pencatatan kehadiran santri menggunakan barcode scanner kamera Android/iPhone & barcode fisik ID YYS.',
    rolesAllowed: [
      'Admin',
      'Pengurus Asrama (Asrama)',
      'Petugas Sekolah (Sekolah)',
      'Petugas Madin (Madin)',
      'Petugas Jamaah (Masjid)',
    ],
    upcomingFeatures: [
      'Scanner kamera live barcode ID YYS santri otomatis',
      'Verifikasi status santri real-time (Hadir / Sakit / Izin / Alpa)',
      'Log audit pencatatan kehadiran per petugas',
      'Sinkronisasi multi-petugas simultan',
    ],
  },
  perizinan: {
    title: 'Modul Perizinan Santri',
    stage: 'Tahap 3',
    description:
      'Pengelolaan alur surat izin keluar pondok, izin pulang, izin sakit di klinik, dan validasi gerbang satpam.',
    rolesAllowed: ['Super Admin', 'Admin', 'Pengurus Asrama'],
    upcomingFeatures: [
      'Pengajuan izin santri & cetak surat jalan barcode',
      'Tracking batas waktu kepulangan (PSG / Izin Darurat)',
      'Notifikasi keterlambatan kembali ke pondok',
      'Riwayat perizinan per santri di profil santri',
    ],
  },
  kegiatan_khusus: {
    title: 'Modul Kegiatan Khusus & PSG',
    stage: 'Tahap 3',
    description:
      'Pengelolaan kegiatan insidental, ziarah akbar, kerja bakti massal, dan kegiatan pembinaan santri (PSG).',
    rolesAllowed: ['Super Admin', 'Pengurus Asrama'],
    upcomingFeatures: [
      'Absensi khusus event non-rutin santri',
      'Pencatatan sanksi pelanggaran & pembinaan santri (PSG)',
      'Pemantauan poin kedisiplinan asrama',
    ],
  },
  laporan: {
    title: 'Modul Laporan & Rekapitulasi',
    stage: 'Tahap 4',
    description:
      'Rekapitulasi persentase kehadiran per santri, per kelas, per kamar, export laporan ke format cetak / spreadsheet.',
    rolesAllowed: ['Super Admin', 'Admin'],
    upcomingFeatures: [
      'Rekap absensi bulanan santri untuk wali santri',
      'Statistik kedisiplinan shalat jamaah & madin',
      'Laporan santri sering terlambat / alpha',
      'Export PDF & Excel rekapitulasi nilai kehadiran',
    ],
  },
  pengaturan: {
    title: 'Pengaturan Sistem & Pengguna',
    stage: 'Tahap 4',
    description:
      'Manajemen akun petugas, penugasan role, audit logs sistem, dan konfigurasi institusi.',
    rolesAllowed: ['Super Admin'],
    upcomingFeatures: [
      'Manajemen akun staf & petugas (Supabase Auth)',
      'Review audit trail & keamanan sistem',
      'Backup & restore data master',
      'Profil yayasan & konfigurasi zona waktu',
    ],
  },
};

export const PlaceholderView: React.FC<PlaceholderViewProps> = ({
  menu,
  onBackToDashboard,
}) => {
  const { currentRole } = useAuth();
  const meta = MENU_META[menu] || MENU_META.kegiatan;

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-4">
      {/* Back button */}
      <button
        type="button"
        onClick={onBackToDashboard}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Kembali ke Dashboard</span>
      </button>

      {/* Main card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold mb-2">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Dijadwalkan pada {meta.stage}</span>
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              {meta.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl leading-relaxed">
              {meta.description}
            </p>
          </div>
        </div>

        {/* Roles Allowed Information */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-2">
            <Shield className="w-4 h-4 text-purple-600" />
            <span>Hak Akses Role yang Ditetapkan untuk Modul Ini:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {meta.rolesAllowed.map((roleName) => (
              <span
                key={roleName}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-medium"
              >
                {roleName}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Role aktif Anda saat ini:{' '}
            <strong className="text-slate-700">
              {ROLE_DEFINITIONS[currentRole]?.displayName}
            </strong>
          </p>
        </div>

        {/* Upcoming features specification */}
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
            Fitur yang Akan Dibuat pada {meta.stage}:
          </h3>
          <ul className="space-y-2">
            {meta.upcomingFeatures.map((feat, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Policy note */}
        <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 text-emerald-900 text-xs">
          <p className="font-semibold">Sesuai Aturan Tahap 1:</p>
          <p className="text-emerald-700 mt-0.5 leading-relaxed">
            Modul ini sengaja disiapkan dalam bentuk placeholder tanpa fungsi palsu.
            Pengembangan logika lengkap akan diimplementasikan setelah menerima instruksi{' '}
            <code className="bg-white px-1.5 py-0.5 rounded border border-emerald-300 font-mono font-bold text-emerald-900">
              "LANJUT TAHAP 2"
            </code>
            .
          </p>
        </div>
      </div>
    </div>
  );
};
