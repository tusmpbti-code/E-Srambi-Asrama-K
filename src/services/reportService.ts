/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  ReportFilter,
  Santri,
  AttendanceRecord,
  SantriPermission,
  SpecialAttendanceRecord,
  SpecialEvent,
  SpecialEventParticipant,
  getSantriKamarText,
  getSantriMadinText,
} from '../types';
import { getSantriList, getKegiatanList } from './santriService';
import { getSpecialEvents } from './specialEventService';

export interface ComprehensiveReportItem {
  id: string;
  tanggal: string;
  santriId: string;
  idYys: string;
  nis: string;
  nama: string;
  kelas: string;
  kamar: string;
  rayon: string;
  kegiatanModul: string;
  subKategori: string;
  status: string;
  waktu: string;
  petugas: string;
  keterangan: string;
}

export interface ReportSummaryStats {
  total: number;
  hadir: number;
  izin: number;
  sakit: number;
  alpa: number;
  terlambat: number;
  belumKembali: number;
  persentase: number;
}

/**
 * Filter helper on memory records
 */
function applySantriFilters(
  santri: Santri | null | undefined,
  filter: ReportFilter
): boolean {
  if (!santri) return false;
  if (filter.santriId && filter.santriId !== 'SEMUA' && santri.id !== filter.santriId) return false;
  if (filter.kelasId && filter.kelasId !== 'SEMUA' && santri.kelas_id !== filter.kelasId) return false;
  if (filter.kamarId && filter.kamarId !== 'SEMUA') {
    const santriKamar = getSantriKamarText(santri);
    if (santri.kamar_id !== filter.kamarId && santriKamar !== filter.kamarId) return false;
  }
  if (filter.rayon && filter.rayon !== 'SEMUA') {
    const madin = getSantriMadinText(santri);
    if (madin !== filter.rayon && santri.rayon !== filter.rayon) return false;
  }
  if (filter.searchQuery) {
    const q = filter.searchQuery.toLowerCase();
    const matches =
      santri.nama.toLowerCase().includes(q) ||
      santri.id_yys.toLowerCase().includes(q) ||
      (santri.nis && santri.nis.toLowerCase().includes(q));
    if (!matches) return false;
  }
  return true;
}

/**
 * 1-4. Laporan Absensi (Harian, Sekolah, Madin, Jamaah)
 */
export async function fetchAttendanceReport(
  kategori: 'SEMUA' | 'Sekolah' | 'Madin' | 'Jamaah',
  filter: ReportFilter
): Promise<{ items: ComprehensiveReportItem[]; summary: ReportSummaryStats }> {
  const [allSantri, allKegiatan] = await Promise.all([
    getSantriList(),
    getKegiatanList(),
  ]);

  let records: AttendanceRecord[] = [];

  if (isSupabaseConfigured()) {
    try {
      let query = supabase
        .from('attendance_records')
        .select(`
          *,
          santri:santri_id (*, kelas:kelas_id (*), kamar:kamar_id (*)),
          kegiatan:kegiatan_id (*)
        `)
        .gte('tanggal', filter.startDate)
        .lte('tanggal', filter.endDate);

      if (filter.kegiatanId && filter.kegiatanId !== 'SEMUA') {
        query = query.eq('kegiatan_id', filter.kegiatanId);
      }
      if (filter.status && filter.status !== 'SEMUA') {
        query = query.eq('status', filter.status);
      }

      const { data, error } = await query.order('tanggal', { ascending: false }).order('waktu_absen', { ascending: false });
      if (!error && data) {
        records = data as AttendanceRecord[];
      }
    } catch {
      // fallback
    }
  }

  if (records.length === 0) {
    const storageKey = 'pesantren_attendance_records_v2';
    try {
      const local = localStorage.getItem(storageKey);
      if (local) {
        records = JSON.parse(local);
      }
    } catch {
      // fallback
    }
  }

  // Populate references if missing
  records = records.map((r) => ({
    ...r,
    santri: r.santri || allSantri.find((s) => s.id === r.santri_id) || null,
    kegiatan: r.kegiatan || allKegiatan.find((k) => k.id === r.kegiatan_id) || null,
  }));

  // Apply kategori filter
  if (kategori !== 'SEMUA') {
    records = records.filter(
      (r) => r.kegiatan?.kategori?.toLowerCase() === kategori.toLowerCase()
    );
  }

  // Date and status filters
  records = records.filter((r) => {
    if (r.tanggal < filter.startDate || r.tanggal > filter.endDate) return false;
    if (filter.status && filter.status !== 'SEMUA' && r.status !== filter.status) return false;
    if (filter.kegiatanId && filter.kegiatanId !== 'SEMUA' && r.kegiatan_id !== filter.kegiatanId) return false;
    return applySantriFilters(r.santri, filter);
  });

  let hadir = 0;
  let izin = 0;
  let sakit = 0;
  let alpa = 0;
  let terlambat = 0;

  const items: ComprehensiveReportItem[] = records.map((r) => {
    if (r.status === 'HADIR') hadir++;
    else if (r.status === 'IZIN') izin++;
    else if (r.status === 'SAKIT') sakit++;
    else if (r.status === 'ALPA') alpa++;
    else if (r.status === 'TERLAMBAT') terlambat++;

    return {
      id: r.id,
      tanggal: r.tanggal,
      santriId: r.santri_id,
      idYys: r.santri?.id_yys || '-',
      nis: r.santri?.nis || '-',
      nama: r.santri?.nama || 'Santri',
      kelas: r.santri?.kelas?.nama_kelas || '-',
      kamar: getSantriKamarText(r.santri) || '-',
      rayon: getSantriMadinText(r.santri) || '-',
      kegiatanModul: r.kegiatan?.nama_kegiatan || 'Absensi Harian',
      subKategori: r.kegiatan?.kategori || kategori,
      status: r.status,
      waktu: `${r.waktu_absen} WIB`,
      petugas: r.petugas_nama || 'Petugas',
      keterangan: r.catatan || `Sesi ${r.sesi}`,
    };
  });

  const total = items.length;
  const persentase = total > 0 ? Math.round(((hadir + terlambat) / total) * 100) : 0;

  return {
    items,
    summary: {
      total,
      hadir,
      izin,
      sakit,
      alpa,
      terlambat,
      belumKembali: 0,
      persentase,
    },
  };
}

/**
 * 5. Laporan Perizinan Santri
 * 6. Laporan Santri Belum Kembali
 */
export async function fetchPermissionReport(
  onlyBelumKembali: boolean,
  filter: ReportFilter
): Promise<{ items: ComprehensiveReportItem[]; summary: ReportSummaryStats }> {
  const allSantri = await getSantriList();
  let permissions: SantriPermission[] = [];

  if (isSupabaseConfigured()) {
    try {
      let query = supabase
        .from('permissions')
        .select(`*, santri:santri_id (*, kelas:kelas_id (*), kamar:kamar_id (*))`)
        .gte('tanggal_keluar', filter.startDate)
        .lte('tanggal_keluar', filter.endDate);

      if (filter.status && filter.status !== 'SEMUA') {
        query = query.eq('status', filter.status);
      }

      const { data, error } = await query.order('tanggal_keluar', { ascending: false });
      if (!error && data) {
        permissions = data as SantriPermission[];
      }
    } catch {
      // fallback
    }
  }

  if (permissions.length === 0) {
    try {
      const local = localStorage.getItem('pesantren_permissions_records_v3');
      if (local) {
        permissions = JSON.parse(local);
      }
    } catch {
      // fallback
    }
  }

  permissions = permissions.map((p) => ({
    ...p,
    santri: p.santri || allSantri.find((s) => s.id === p.santri_id) || null,
  }));

  // Filter belum kembali specifically
  if (onlyBelumKembali) {
    permissions = permissions.filter(
      (p) => ['SUDAH_KELUAR', 'TERLAMBAT'].includes(p.status) && !p.waktu_kembali
    );
  }

  // Filter general
  permissions = permissions.filter((p) => {
    if (p.tanggal_keluar < filter.startDate || p.tanggal_keluar > filter.endDate) return false;
    if (filter.status && filter.status !== 'SEMUA' && p.status !== filter.status) return false;
    return applySantriFilters(p.santri, filter);
  });

  let disetujui = 0;
  let sedangKeluar = 0;
  let terlambat = 0;
  let belumKembali = 0;

  const items: ComprehensiveReportItem[] = permissions.map((p) => {
    const isLate = p.status === 'TERLAMBAT' || (new Date() > new Date(p.batas_kembali) && !p.waktu_kembali);
    if (p.status === 'DISETUJUI') disetujui++;
    if (p.status === 'SUDAH_KELUAR') sedangKeluar++;
    if (isLate) terlambat++;
    if (!p.waktu_kembali && ['SUDAH_KELUAR', 'TERLAMBAT'].includes(p.status)) belumKembali++;

    return {
      id: p.id,
      tanggal: p.tanggal_keluar,
      santriId: p.santri_id,
      idYys: p.santri?.id_yys || '-',
      nis: p.santri?.nis || '-',
      nama: p.santri?.nama || 'Santri',
      kelas: p.santri?.kelas?.nama_kelas || '-',
      kamar: getSantriKamarText(p.santri) || '-',
      rayon: getSantriMadinText(p.santri) || '-',
      kegiatanModul: p.jenis === 'IZIN_PULANG' ? 'Izin Pulang' : 'Izin Keluar',
      subKategori: p.alasan,
      status: isLate ? 'TERLAMBAT' : p.status,
      waktu: `Keluar: ${p.jam_keluar} • Batas: ${new Date(p.batas_kembali).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`,
      petugas: p.penanggung_jawab || 'Pengurus',
      keterangan: `Tujuan: ${p.tujuan} ${p.waktu_kembali ? `• Kembali: ${new Date(p.waktu_kembali).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}` : '• [BELUM KEMBALI]'}`,
    };
  });

  return {
    items,
    summary: {
      total: items.length,
      hadir: disetujui,
      izin: sedangKeluar,
      sakit: 0,
      alpa: 0,
      terlambat,
      belumKembali,
      persentase: items.length > 0 ? Math.round(((items.length - belumKembali) / items.length) * 100) : 100,
    },
  };
}

/**
 * 7. Laporan PSG (Pendidikan Sistem Ganda / Prakerin)
 * 8. Laporan Kegiatan Khusus (Umum)
 */
export async function fetchSpecialEventsReport(
  onlyPsg: boolean,
  filter: ReportFilter
): Promise<{ items: ComprehensiveReportItem[]; summary: ReportSummaryStats }> {
  const allSantri = await getSantriList();
  const allEvents = await getSpecialEvents();

  let targetEvents = allEvents;
  if (onlyPsg) {
    targetEvents = allEvents.filter((e) => e.jenis_kegiatan === 'PSG');
  }

  let specialAttendance: SpecialAttendanceRecord[] = [];

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('special_attendance')
        .select(`*, santri:santri_id (*, kelas:kelas_id (*), kamar:kamar_id (*))`)
        .gte('tanggal', filter.startDate)
        .lte('tanggal', filter.endDate);

      if (!error && data) {
        specialAttendance = data as SpecialAttendanceRecord[];
      }
    } catch {
      // fallback
    }
  }

  if (specialAttendance.length === 0) {
    try {
      const local = localStorage.getItem('pesantren_special_attendance_v3');
      if (local) {
        specialAttendance = JSON.parse(local);
      }
    } catch {
      // fallback
    }
  }

  const eventMap = new Map<string, SpecialEvent>();
  targetEvents.forEach((e) => eventMap.set(e.id, e));

  // Filter records based on target events
  specialAttendance = specialAttendance
    .filter((a) => eventMap.has(a.event_id))
    .map((a) => ({
      ...a,
      santri: a.santri || allSantri.find((s) => s.id === a.santri_id) || undefined,
      event: eventMap.get(a.event_id),
    }));

  specialAttendance = specialAttendance.filter((a) => {
    if (a.tanggal < filter.startDate || a.tanggal > filter.endDate) return false;
    if (filter.status && filter.status !== 'SEMUA' && a.status !== filter.status) return false;
    return applySantriFilters(a.santri, filter);
  });

  let hadir = 0;
  let berangkat = 0;
  let kembali = 0;
  let terlambat = 0;
  let belumKembali = 0;

  const items: ComprehensiveReportItem[] = specialAttendance.map((a) => {
    if (a.status === 'HADIR' || a.status === 'SUDAH_KEMBALI') hadir++;
    if (a.status === 'SUDAH_BERANGKAT') berangkat++;
    if (a.status === 'TERLAMBAT') terlambat++;

    const isBelumKembali = !!a.waktu_berangkat && !a.waktu_kembali;
    if (isBelumKembali) belumKembali++;

    return {
      id: a.id,
      tanggal: a.tanggal,
      santriId: a.santri_id,
      idYys: a.santri?.id_yys || '-',
      nis: a.santri?.nis || '-',
      nama: a.santri?.nama || 'Santri',
      kelas: a.santri?.kelas?.nama_kelas || '-',
      kamar: getSantriKamarText(a.santri) || '-',
      rayon: getSantriMadinText(a.santri) || '-',
      kegiatanModul: a.event?.nama_kegiatan || (onlyPsg ? 'PSG' : 'Kegiatan Khusus'),
      subKategori: a.event?.jenis_kegiatan || 'Khusus',
      status: a.status,
      waktu: `Berangkat: ${a.waktu_berangkat ? new Date(a.waktu_berangkat).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'} | Kembali: ${a.waktu_kembali ? new Date(a.waktu_kembali).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '[BELUM]'}`,
      petugas: 'Koordinator Kegiatan',
      keterangan: a.catatan || (isBelumKembali ? 'Sedang berada di lokasi' : 'Selesai mengikuti kegiatan'),
    };
  });

  return {
    items,
    summary: {
      total: items.length,
      hadir,
      izin: berangkat,
      sakit: 0,
      alpa: 0,
      terlambat,
      belumKembali,
      persentase: items.length > 0 ? Math.round(((hadir + kembali) / items.length) * 100) : 100,
    },
  };
}

/**
 * 9. Rekap Santri (Daftar Santri & Status Kehadiran Terpadu)
 */
export async function fetchRekapSantriReport(
  filter: ReportFilter
): Promise<{ items: ComprehensiveReportItem[]; summary: ReportSummaryStats }> {
  const allSantri = await getSantriList();

  const filteredSantri = allSantri.filter((s) => {
    if (filter.status && filter.status !== 'SEMUA' && s.status_santri !== filter.status) return false;
    return applySantriFilters(s, filter);
  });

  let aktif = 0;
  let izin = 0;
  let sakit = 0;
  let nonaktif = 0;

  const items: ComprehensiveReportItem[] = filteredSantri.map((s) => {
    if (s.status_santri === 'Aktif') aktif++;
    else if (s.status_santri === 'Izin') izin++;
    else if (s.status_santri === 'Sakit') sakit++;
    else nonaktif++;

    return {
      id: s.id,
      tanggal: new Date().toISOString().split('T')[0],
      santriId: s.id,
      idYys: s.id_yys,
      nis: s.nis || '-',
      nama: s.nama,
      kelas: s.kelas?.nama_kelas || 'Tanpa Kelas',
      kamar: getSantriKamarText(s) || 'Tanpa Kamar',
      rayon: getSantriMadinText(s) || '-',
      kegiatanModul: 'Master Santri Pondok',
      subKategori: s.jenis_kelamin === 'L' ? 'Putra' : 'Putri',
      status: s.status_santri,
      waktu: 'Terkini',
      petugas: s.nama_wali || 'Wali Santri',
      keterangan: `HP Wali: ${s.kontak_wali || '-'} • Alamat: ${s.alamat || '-'}`,
    };
  });

  return {
    items,
    summary: {
      total: items.length,
      hadir: aktif,
      izin,
      sakit,
      alpa: nonaktif,
      terlambat: 0,
      belumKembali: 0,
      persentase: items.length > 0 ? Math.round((aktif / items.length) * 100) : 100,
    },
  };
}
