/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  AttendanceRecord,
  AttendanceStatus,
  AttendanceSessionStats,
  CategoryAttendanceStat,
  Santri,
  Kegiatan,
  ReportFilter,
  ReportSummaryRow,
  UserRole,
} from '../types';
import { getSantriList, getKegiatanList, logAudit } from './santriService';
import { recordAuditLog } from './auditService';
import { hasPermission } from '../lib/roles';

// Local storage key for fallback persistence
const STORAGE_KEY_ATTENDANCE = 'pesantren_attendance_records_v2';

// In-memory / initial seed attendance records
const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  {
    id: 'att-20260918-001',
    santri_id: 'd0000000-0000-0000-0000-000000000001', // Farhan
    kegiatan_id: 'c0000000-0000-0000-0000-000000000003', // Sekolah Formal Pagi
    tanggal: '2026-09-18',
    sesi: 'Pagi',
    status: 'HADIR',
    waktu_absen: '07:05:12',
    petugas_id: null,
    petugas_nama: 'Petugas Sekolah (Sistem)',
    catatan: 'Hadir tepat waktu',
    created_at: '2026-09-18T07:05:12+07:00',
    updated_at: '2026-09-18T07:05:12+07:00',
  },
  {
    id: 'att-20260918-002',
    santri_id: 'd0000000-0000-0000-0000-000000000002', // Dani
    kegiatan_id: 'c0000000-0000-0000-0000-000000000003', // Sekolah Formal Pagi
    tanggal: '2026-09-18',
    sesi: 'Pagi',
    status: 'HADIR',
    waktu_absen: '07:11:40',
    petugas_id: null,
    petugas_nama: 'Petugas Sekolah (Sistem)',
    catatan: null,
    created_at: '2026-09-18T07:11:40+07:00',
    updated_at: '2026-09-18T07:11:40+07:00',
  },
  {
    id: 'att-20260918-003',
    santri_id: 'd0000000-0000-0000-0000-000000000004', // Zayyan
    kegiatan_id: 'c0000000-0000-0000-0000-000000000003', // Sekolah Formal Pagi
    tanggal: '2026-09-18',
    sesi: 'Pagi',
    status: 'IZIN',
    waktu_absen: '07:15:00',
    petugas_id: null,
    petugas_nama: 'Petugas Sekolah (Sistem)',
    catatan: 'Izin pulang keperluan keluarga',
    created_at: '2026-09-18T07:15:00+07:00',
    updated_at: '2026-09-18T07:15:00+07:00',
  },
  {
    id: 'att-20260918-004',
    santri_id: 'd0000000-0000-0000-0000-000000000006', // Fatimah
    kegiatan_id: 'c0000000-0000-0000-0000-000000000003', // Sekolah Formal Pagi
    tanggal: '2026-09-18',
    sesi: 'Pagi',
    status: 'SAKIT',
    waktu_absen: '07:20:10',
    petugas_id: null,
    petugas_nama: 'Petugas Sekolah (Sistem)',
    catatan: 'Sakit di klinik asrama',
    created_at: '2026-09-18T07:20:10+07:00',
    updated_at: '2026-09-18T07:20:10+07:00',
  },
  {
    id: 'att-20260918-005',
    santri_id: 'd0000000-0000-0000-0000-000000000001', // Farhan
    kegiatan_id: 'c0000000-0000-0000-0000-000000000001', // Shalat Subuh
    tanggal: '2026-09-18',
    sesi: 'Subuh',
    status: 'HADIR',
    waktu_absen: '04:22:15',
    petugas_id: null,
    petugas_nama: 'Petugas Jamaah',
    catatan: null,
    created_at: '2026-09-18T04:22:15+07:00',
    updated_at: '2026-09-18T04:22:15+07:00',
  },
  {
    id: 'att-20260918-006',
    santri_id: 'd0000000-0000-0000-0000-000000000002', // Dani
    kegiatan_id: 'c0000000-0000-0000-0000-000000000001', // Shalat Subuh
    tanggal: '2026-09-18',
    sesi: 'Subuh',
    status: 'TERLAMBAT',
    waktu_absen: '04:45:00',
    petugas_id: null,
    petugas_nama: 'Petugas Jamaah',
    catatan: 'Masuk rakaat kedua',
    created_at: '2026-09-18T04:45:00+07:00',
    updated_at: '2026-09-18T04:45:00+07:00',
  },
];

function loadLocalRecords(): AttendanceRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ATTENDANCE);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return [...INITIAL_ATTENDANCE];
}

function saveLocalRecords(records: AttendanceRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY_ATTENDANCE, JSON.stringify(records));
  } catch {
    // ignore
  }
}

let memoryAttendance: AttendanceRecord[] = loadLocalRecords();

/**
 * Validasi apakah role pengguna memiliki wewenang untuk mencatat/mengubah
 * absensi pada kategori kegiatan tertentu.
 * Aturan ketat:
 * - Petugas Sekolah HANYA boleh kegiatan Sekolah
 * - Petugas Madin HANYA boleh kegiatan Madin
 * - Petugas Jamaah HANYA boleh kegiatan Jamaah
 * - Pengurus Asrama HANYA boleh kegiatan Asrama & Khusus
 * - Super Admin & Admin boleh SEMUA
 */
export function canUserManageKegiatanAttendance(
  role: UserRole,
  kegiatanKategori: string
): { allowed: boolean; reason?: string } {
  if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
    return { allowed: true };
  }

  const kat = kegiatanKategori.toLowerCase();

  if (role === 'PETUGAS_SEKOLAH') {
    if (kat === 'sekolah') return { allowed: true };
    return {
      allowed: false,
      reason: `Petugas Sekolah tidak memiliki izin untuk mengelola absensi ${kegiatanKategori}. Hanya diperbolehkan untuk kegiatan Sekolah Formal.`,
    };
  }

  if (role === 'PETUGAS_MADIN') {
    if (kat === 'madin') return { allowed: true };
    return {
      allowed: false,
      reason: `Petugas Madin tidak memiliki izin untuk mengelola absensi ${kegiatanKategori}. Hanya diperbolehkan untuk kegiatan Madrasah Diniyah.`,
    };
  }

  if (role === 'PETUGAS_JAMAAH') {
    if (kat === 'jamaah') return { allowed: true };
    return {
      allowed: false,
      reason: `Petugas Jamaah tidak memiliki izin untuk mengelola absensi ${kegiatanKategori}. Hanya diperbolehkan untuk Shalat Berjamaah Masjid.`,
    };
  }

  if (role === 'PENGURUS_ASRAMA') {
    if (kat === 'asrama' || kat === 'khusus') return { allowed: true };
    return {
      allowed: false,
      reason: `Pengurus Asrama hanya memiliki izin untuk mengelola absensi Asrama dan Kegiatan Khusus.`,
    };
  }

  return {
    allowed: false,
    reason: `Role Anda (${role}) tidak memiliki izin mengelola absensi kegiatan ini.`,
  };
}

/**
 * Helper: dapatkan jam lokal saat ini format HH:mm:ss
 */
export function getCurrentTimeString(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/**
 * Helper: dapatkan tanggal hari ini format YYYY-MM-DD
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Catat absensi santri (Fast Scan / Manual)
 * - Mencegah duplikasi absensi (santri_id + kegiatan_id + tanggal + sesi)
 * - Validasi status santri (peringatan jika non-aktif/sakit/izin)
 * - Validasi izin role petugas
 * - Default status: HADIR
 */
export async function recordAttendance(params: {
  santri: Santri;
  kegiatan: Kegiatan;
  tanggal: string;
  sesi: string;
  status?: AttendanceStatus;
  userRole: UserRole;
  petugasId?: string | null;
  petugasNama?: string | null;
  catatan?: string | null;
}): Promise<{
  success: boolean;
  record?: AttendanceRecord;
  existingRecord?: AttendanceRecord;
  message: string;
  isDuplicate?: boolean;
  statusWarning?: string;
}> {
  const {
    santri,
    kegiatan,
    tanggal,
    sesi,
    status = 'HADIR',
    userRole,
    petugasId,
    petugasNama,
    catatan,
  } = params;

  // 1. Validasi Izin Role Petugas
  const roleCheck = canUserManageKegiatanAttendance(userRole, kegiatan.kategori);
  if (!roleCheck.allowed) {
    return {
      success: false,
      message: roleCheck.reason || 'Anda tidak memiliki izin mencatat absensi kegiatan ini.',
    };
  }

  // 2. Cek apakah santri berstatus khusus (misal Izin / Sakit / Nonaktif)
  let statusWarning: string | undefined;
  if (santri.status_santri !== 'Aktif') {
    statusWarning = `Perhatian: Santri ${santri.nama} tercatat ${santri.status_santri.toUpperCase()} di data master.`;
  }

  // 3. Cek Absensi Ganda (Duplicate Check)
  // Periksa apakah santri sudah tercatat pada kombinasi (santri_id, kegiatan_id, tanggal, sesi)
  if (isSupabaseConfigured()) {
    try {
      const { data: existing, error: checkErr } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('santri_id', santri.id)
        .eq('kegiatan_id', kegiatan.id)
        .eq('tanggal', tanggal)
        .eq('sesi', sesi)
        .maybeSingle();

      if (!checkErr && existing) {
        const waktuStr = existing.waktu_absen ? existing.waktu_absen.substring(0, 5) : 'sebelumnya';
        return {
          success: false,
          isDuplicate: true,
          existingRecord: existing as AttendanceRecord,
          message: `Santri sudah melakukan absensi pada pukul ${waktuStr} (Status: ${existing.status}).`,
        };
      }
    } catch {
      // fallback to memory check
    }
  }

  // Memory fallback duplicate check
  const memoryExisting = memoryAttendance.find(
    (r) =>
      r.santri_id === santri.id &&
      r.kegiatan_id === kegiatan.id &&
      r.tanggal === tanggal &&
      r.sesi.toLowerCase() === sesi.toLowerCase()
  );

  if (memoryExisting) {
    const waktuStr = memoryExisting.waktu_absen
      ? memoryExisting.waktu_absen.substring(0, 5)
      : 'sebelumnya';
    return {
      success: false,
      isDuplicate: true,
      existingRecord: memoryExisting,
      message: `Santri sudah melakukan absensi pada pukul ${waktuStr} (Status: ${memoryExisting.status}).`,
    };
  }

  // 4. Buat record baru
  const waktuAbsen = getCurrentTimeString();
  const nowIso = new Date().toISOString();
  const newRecord: AttendanceRecord = {
    id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    santri_id: santri.id,
    kegiatan_id: kegiatan.id,
    tanggal,
    sesi,
    status,
    waktu_absen: waktuAbsen,
    petugas_id: petugasId || null,
    petugas_nama: petugasNama || userRole,
    catatan: catatan || null,
    created_at: nowIso,
    updated_at: nowIso,
    santri,
    kegiatan,
  };

  // Simpan ke Supabase jika aktif
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .insert([
          {
            santri_id: santri.id,
            kegiatan_id: kegiatan.id,
            tanggal,
            sesi,
            status,
            waktu_absen: waktuAbsen,
            petugas_id: petugasId || null,
            petugas_nama: petugasNama || userRole,
            catatan: catatan || null,
          },
        ])
        .select(`
          *,
          santri:santri_id (*, kelas:kelas_id (*), kamar:kamar_id (*)),
          kegiatan:kegiatan_id (*)
        `)
        .single();

      if (!error && data) {
        // Catat Audit Log
        await logAudit({
          action: 'ATTENDANCE_RECORD_CREATE',
          tableName: 'attendance_records',
          recordId: data.id,
          userEmail: petugasNama || undefined,
          details: {
            santri_id: santri.id,
            santri_nama: santri.nama,
            id_yys: santri.id_yys,
            kegiatan_nama: kegiatan.nama_kegiatan,
            tanggal,
            sesi,
            status,
          },
        });

        // Update memory cache
        memoryAttendance.unshift(data as AttendanceRecord);
        saveLocalRecords(memoryAttendance);

        return {
          success: true,
          record: data as AttendanceRecord,
          message: `Absensi berhasil (${status}).`,
          statusWarning,
        };
      }
    } catch {
      // fallback to memory
    }
  }

  // Memory fallback insertion
  memoryAttendance.unshift(newRecord);
  saveLocalRecords(memoryAttendance);

  await logAudit({
    action: 'ATTENDANCE_RECORD_CREATE',
    tableName: 'attendance_records',
    recordId: newRecord.id,
    userEmail: petugasNama || undefined,
    details: {
      santri_id: santri.id,
      santri_nama: santri.nama,
      id_yys: santri.id_yys,
      kegiatan_nama: kegiatan.nama_kegiatan,
      tanggal,
      sesi,
      status,
    },
  });

  return {
    success: true,
    record: newRecord,
    message: `Absensi berhasil (${status}).`,
    statusWarning,
  };
}

/**
 * Update status absensi manual (misal koreksi Hadir -> Izin / Sakit / Alpa / Terlambat)
 */
export async function updateAttendanceStatus(params: {
  recordId: string;
  newStatus: AttendanceStatus;
  userRole: UserRole;
  kegiatanKategori: string;
  catatan?: string | null;
  petugasNama?: string;
}): Promise<{ success: boolean; message: string }> {
  const { recordId, newStatus, userRole, kegiatanKategori, catatan, petugasNama } = params;

  // Cek wewenang
  const check = canUserManageKegiatanAttendance(userRole, kegiatanKategori);
  if (!check.allowed) {
    return { success: false, message: check.reason || 'Tidak ada hak akses mengubah status.' };
  }

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('attendance_records')
        .update({
          status: newStatus,
          catatan: catatan !== undefined ? catatan : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', recordId);

      if (!error) {
        await logAudit({
          action: 'ATTENDANCE_STATUS_UPDATE',
          tableName: 'attendance_records',
          recordId,
          userEmail: petugasNama,
          details: { newStatus, catatan },
        });

        const idx = memoryAttendance.findIndex((r) => r.id === recordId);
        if (idx !== -1) {
          memoryAttendance[idx].status = newStatus;
          if (catatan !== undefined) memoryAttendance[idx].catatan = catatan;
          saveLocalRecords(memoryAttendance);
        }
        return { success: true, message: `Status berhasil diubah menjadi ${newStatus}.` };
      }
    } catch {
      // fallback
    }
  }

  const idx = memoryAttendance.findIndex((r) => r.id === recordId);
  if (idx !== -1) {
    memoryAttendance[idx].status = newStatus;
    if (catatan !== undefined) memoryAttendance[idx].catatan = catatan;
    saveLocalRecords(memoryAttendance);

    await logAudit({
      action: 'ATTENDANCE_STATUS_UPDATE',
      tableName: 'attendance_records',
      recordId,
      userEmail: petugasNama,
      details: { newStatus, catatan },
    });

    return { success: true, message: `Status berhasil diubah menjadi ${newStatus}.` };
  }

  return { success: false, message: 'Data absensi tidak ditemukan.' };
}

/**
 * Hapus catatan absensi (Hanya Super Admin & Admin)
 */
export async function deleteAttendanceRecord(
  recordId: string,
  userRole: UserRole,
  petugasNama?: string
): Promise<{ success: boolean; message: string }> {
  if (userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN') {
    return {
      success: false,
      message: 'Hanya Super Admin dan Admin yang berwenang menghapus data absensi.',
    };
  }

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('attendance_records')
        .delete()
        .eq('id', recordId);

      if (!error) {
        await logAudit({
          action: 'ATTENDANCE_DELETE',
          tableName: 'attendance_records',
          recordId,
          userEmail: petugasNama,
        });

        memoryAttendance = memoryAttendance.filter((r) => r.id !== recordId);
        saveLocalRecords(memoryAttendance);
        return { success: true, message: 'Data absensi berhasil dihapus.' };
      }
    } catch {
      // fallback
    }
  }

  memoryAttendance = memoryAttendance.filter((r) => r.id !== recordId);
  saveLocalRecords(memoryAttendance);

  await logAudit({
    action: 'ATTENDANCE_DELETE',
    tableName: 'attendance_records',
    recordId,
    userEmail: petugasNama,
  });

  return { success: true, message: 'Data absensi berhasil dihapus.' };
}

/**
 * Ambil seluruh data absensi untuk sesi tertentu (Kegiatan + Tanggal + Sesi)
 * Termasuk menghitung statistik sesi dan daftar Santri yang Belum Absen.
 */
export async function getAttendanceForSession(
  kegiatanId: string,
  tanggal: string,
  sesi: string
): Promise<{
  records: AttendanceRecord[];
  stats: AttendanceSessionStats;
  belumAbsenList: Santri[];
}> {
  // 1. Ambil seluruh master santri & kegiatan
  const [allSantri, allKegiatan] = await Promise.all([
    getSantriList(),
    getKegiatanList(),
  ]);

  const activeSantri = allSantri.filter((s) => s.status_santri !== 'Lulus' && s.status_santri !== 'Nonaktif');
  const kegiatan = allKegiatan.find((k) => k.id === kegiatanId);

  let sessionRecords: AttendanceRecord[] = [];

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select(`
          *,
          santri:santri_id (*, kelas:kelas_id (*), kamar:kamar_id (*)),
          kegiatan:kegiatan_id (*)
        `)
        .eq('kegiatan_id', kegiatanId)
        .eq('tanggal', tanggal)
        .eq('sesi', sesi)
        .order('waktu_absen', { ascending: false });

      if (!error && data) {
        sessionRecords = data as AttendanceRecord[];
      }
    } catch {
      // fallback
    }
  }

  if (sessionRecords.length === 0) {
    sessionRecords = memoryAttendance
      .filter(
        (r) =>
          r.kegiatan_id === kegiatanId &&
          r.tanggal === tanggal &&
          r.sesi.toLowerCase() === sesi.toLowerCase()
      )
      .map((r) => ({
        ...r,
        santri: allSantri.find((s) => s.id === r.santri_id) || null,
        kegiatan: kegiatan || null,
      }))
      .sort((a, b) => b.waktu_absen.localeCompare(a.waktu_absen));
  }

  // Hitung santri yang belum absen
  const recordedSantriIds = new Set(sessionRecords.map((r) => r.santri_id));
  const belumAbsenList = activeSantri.filter((s) => !recordedSantriIds.has(s.id));

  // Hitung statistik
  let hadir = 0;
  let izin = 0;
  let sakit = 0;
  let alpa = 0;
  let terlambat = 0;

  sessionRecords.forEach((r) => {
    switch (r.status) {
      case 'HADIR':
        hadir++;
        break;
      case 'IZIN':
        izin++;
        break;
      case 'SAKIT':
        sakit++;
        break;
      case 'ALPA':
        alpa++;
        break;
      case 'TERLAMBAT':
        terlambat++;
        break;
    }
  });

  const totalSantri = activeSantri.length;
  const belumAbsen = belumAbsenList.length;
  const persentaseHadir = totalSantri > 0 ? Math.round(((hadir + terlambat) / totalSantri) * 100) : 0;

  return {
    records: sessionRecords,
    stats: {
      totalSantri,
      hadir,
      izin,
      sakit,
      alpa,
      terlambat,
      belumAbsen,
      persentaseHadir,
    },
    belumAbsenList,
  };
}

/**
 * Batch mark attendance (misal tandai santri yang tersisa sebagai ALPA atau IZIN)
 */
export async function batchMarkAttendance(params: {
  santriIds: string[];
  kegiatan: Kegiatan;
  tanggal: string;
  sesi: string;
  status: AttendanceStatus;
  userRole: UserRole;
  petugasNama?: string;
  catatan?: string;
}): Promise<{ successCount: number; failedCount: number; message: string }> {
  const {
    santriIds,
    kegiatan,
    tanggal,
    sesi,
    status,
    userRole,
    petugasNama,
    catatan,
  } = params;

  const roleCheck = canUserManageKegiatanAttendance(userRole, kegiatan.kategori);
  if (!roleCheck.allowed) {
    return {
      successCount: 0,
      failedCount: santriIds.length,
      message: roleCheck.reason || 'Tidak ada wewenang.',
    };
  }

  const allSantri = await getSantriList();
  let successCount = 0;
  let failedCount = 0;

  for (const sId of santriIds) {
    const santriObj = allSantri.find((s) => s.id === sId);
    if (!santriObj) {
      failedCount++;
      continue;
    }

    const res = await recordAttendance({
      santri: santriObj,
      kegiatan,
      tanggal,
      sesi,
      status,
      userRole,
      petugasNama,
      catatan,
    });

    if (res.success) {
      successCount++;
    } else {
      failedCount++;
    }
  }

  return {
    successCount,
    failedCount,
    message: `Selesai: ${successCount} santri ditandai ${status}${
      failedCount > 0 ? `, ${failedCount} dilewati (sudah absen/gagal)` : ''
    }.`,
  };
}

/**
 * Dapatkan data statistik hari ini untuk Dashboard
 */
export async function getTodayLiveStats(dateStr?: string): Promise<{
  totalSantri: number;
  totalHadir: number;
  totalIzin: number;
  totalSakit: number;
  totalAlpa: number;
  totalTerlambat: number;
  totalBelumAbsen: number;
  belumAbsenList: Santri[];
  activityBreakdown: {
    kegiatan: Kegiatan;
    hadir: number;
    total: number;
    persen: number;
  }[];
}> {
  const targetDate = dateStr || getTodayDateString();
  const [allSantri, allKegiatan] = await Promise.all([
    getSantriList(),
    getKegiatanList(),
  ]);

  const activeSantri = allSantri.filter((s) => s.status_santri === 'Aktif');
  const totalSantri = activeSantri.length;

  let records: AttendanceRecord[] = [];

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select(`*, santri:santri_id (*), kegiatan:kegiatan_id (*)`)
        .eq('tanggal', targetDate);

      if (!error && data) {
        records = data as AttendanceRecord[];
      }
    } catch {
      // fallback
    }
  }

  if (records.length === 0) {
    records = memoryAttendance.filter((r) => r.tanggal === targetDate);
  }

  let totalHadir = 0;
  let totalIzin = 0;
  let totalSakit = 0;
  let totalAlpa = 0;
  let totalTerlambat = 0;

  records.forEach((r) => {
    switch (r.status) {
      case 'HADIR':
        totalHadir++;
        break;
      case 'IZIN':
        totalIzin++;
        break;
      case 'SAKIT':
        totalSakit++;
        break;
      case 'ALPA':
        totalAlpa++;
        break;
      case 'TERLAMBAT':
        totalTerlambat++;
        break;
    }
  });

  // Ambil santri yang belum absen sama sekali hari ini
  const todayRecordedSantriIds = new Set(records.map((r) => r.santri_id));
  const belumAbsenList = activeSantri.filter((s) => !todayRecordedSantriIds.has(s.id));
  const totalBelumAbsen = belumAbsenList.length;

  // Breakdown per kegiatan utama
  const activeKegiatan = allKegiatan.filter((k) => k.is_active);
  const activityBreakdown = activeKegiatan.map((keg) => {
    const kegRecords = records.filter((r) => r.kegiatan_id === keg.id);
    const hadirCount = kegRecords.filter((r) => r.status === 'HADIR' || r.status === 'TERLAMBAT').length;
    const persen = totalSantri > 0 ? Math.round((hadirCount / totalSantri) * 100) : 0;
    return {
      kegiatan: keg,
      hadir: hadirCount,
      total: totalSantri,
      persen,
    };
  });

  return {
    totalSantri,
    totalHadir,
    totalIzin,
    totalSakit,
    totalAlpa,
    totalTerlambat,
    totalBelumAbsen,
    belumAbsenList,
    activityBreakdown,
  };
}

/**
 * Mendapatkan ringkasan kehadiran hari ini terbagi berdasarkan kategori:
 * - ABSENSI SEKOLAH
 * - ABSENSI MADIN
 * - ABSENSI JAMAAH
 * Menghitung: Hadir, Izin, Sakit, Alpa, Terlambat, Belum Absen, serta daftar santri belum absen.
 */
export async function getTodayCategoryAttendanceStats(dateStr?: string): Promise<{
  sekolah: CategoryAttendanceStat;
  madin: CategoryAttendanceStat;
  jamaah: CategoryAttendanceStat;
}> {
  const targetDate = dateStr || getTodayDateString();
  const [allSantri, allKegiatan] = await Promise.all([
    getSantriList(),
    getKegiatanList(),
  ]);

  const activeSantri = allSantri.filter((s) => s.status_santri === 'Aktif');
  const totalSantri = activeSantri.length;

  let records: AttendanceRecord[] = [];

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select(`
          *,
          santri:santri_id (*, kelas:kelas_id (*), kamar:kamar_id (*)),
          kegiatan:kegiatan_id (*)
        `)
        .eq('tanggal', targetDate);

      if (!error && data) {
        records = data as AttendanceRecord[];
      }
    } catch {
      // fallback
    }
  }

  if (records.length === 0) {
    records = memoryAttendance
      .filter((r) => r.tanggal === targetDate)
      .map((r) => ({
        ...r,
        santri: allSantri.find((s) => s.id === r.santri_id) || null,
        kegiatan: allKegiatan.find((k) => k.id === r.kegiatan_id) || null,
      }));
  }

  const computeForCategory = (kategori: 'Sekolah' | 'Madin' | 'Jamaah'): CategoryAttendanceStat => {
    const categoryRecords = records.filter(
      (r) => r.kegiatan?.kategori?.toLowerCase() === kategori.toLowerCase()
    );

    let hadir = 0;
    let izin = 0;
    let sakit = 0;
    let alpa = 0;
    let terlambat = 0;

    const recordedSantriIds = new Set<string>();

    categoryRecords.forEach((r) => {
      recordedSantriIds.add(r.santri_id);
      switch (r.status) {
        case 'HADIR':
          hadir++;
          break;
        case 'IZIN':
          izin++;
          break;
        case 'SAKIT':
          sakit++;
          break;
        case 'ALPA':
          alpa++;
          break;
        case 'TERLAMBAT':
          terlambat++;
          break;
      }
    });

    const belumAbsenList = activeSantri.filter((s) => !recordedSantriIds.has(s.id));
    const belumAbsen = belumAbsenList.length;
    const persentaseHadir = totalSantri > 0 ? Math.round(((hadir + terlambat) / totalSantri) * 100) : 0;

    return {
      hadir,
      izin,
      sakit,
      alpa,
      terlambat,
      belumAbsen,
      totalTarget: totalSantri,
      persentaseHadir,
      belumAbsenList,
    };
  };

  return {
    sekolah: computeForCategory('Sekolah'),
    madin: computeForCategory('Madin'),
    jamaah: computeForCategory('Jamaah'),
  };
}

/**
 * Mengambil riwayat absensi lengkap untuk 1 santri
 */
export async function getSantriAttendanceHistory(santriId: string): Promise<AttendanceRecord[]> {
  const [allSantri, allKegiatan] = await Promise.all([
    getSantriList(),
    getKegiatanList(),
  ]);

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select(`
          *,
          santri:santri_id (*, kelas:kelas_id (*), kamar:kamar_id (*)),
          kegiatan:kegiatan_id (*)
        `)
        .eq('santri_id', santriId)
        .order('tanggal', { ascending: false })
        .order('waktu_absen', { ascending: false });

      if (!error && data) {
        return data as AttendanceRecord[];
      }
    } catch {
      // fallback
    }
  }

  return memoryAttendance
    .filter((r) => r.santri_id === santriId)
    .map((r) => ({
      ...r,
      santri: allSantri.find((s) => s.id === r.santri_id) || null,
      kegiatan: allKegiatan.find((k) => k.id === r.kegiatan_id) || null,
    }))
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal) || b.waktu_absen.localeCompare(a.waktu_absen));
}

/**
 * Generate Laporan Absensi Terpadu
 * Mendukung filter: Tanggal, Kegiatan, Kelas, Kamar, Santri, dan Status.
 */
export async function getAttendanceReports(filter: ReportFilter): Promise<{
  records: AttendanceRecord[];
  summary: {
    totalRecords: number;
    hadir: number;
    izin: number;
    sakit: number;
    alpa: number;
    terlambat: number;
    persentaseHadir: number;
  };
  rowsByKegiatan: ReportSummaryRow[];
  rowsByKelas: ReportSummaryRow[];
  rowsByKamar: ReportSummaryRow[];
  rowsByDate: ReportSummaryRow[];
}> {
  const [allSantri, allKegiatan] = await Promise.all([
    getSantriList(),
    getKegiatanList(),
  ]);

  let rawRecords: AttendanceRecord[] = [];

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

      const { data, error } = await query.order('tanggal', { ascending: false });
      if (!error && data) {
        rawRecords = data as AttendanceRecord[];
      }
    } catch {
      // fallback
    }
  }

  if (rawRecords.length === 0) {
    rawRecords = memoryAttendance
      .filter((r) => r.tanggal >= filter.startDate && r.tanggal <= filter.endDate)
      .map((r) => ({
        ...r,
        santri: allSantri.find((s) => s.id === r.santri_id) || null,
        kegiatan: allKegiatan.find((k) => k.id === r.kegiatan_id) || null,
      }));

    if (filter.kegiatanId && filter.kegiatanId !== 'SEMUA') {
      rawRecords = rawRecords.filter((r) => r.kegiatan_id === filter.kegiatanId);
    }
    if (filter.status && filter.status !== 'SEMUA') {
      rawRecords = rawRecords.filter((r) => r.status === filter.status);
    }
  }

  // Filter tambahan di level client (Kelas, Kamar, Santri)
  let filtered = rawRecords;

  if (filter.kelasId && filter.kelasId !== 'SEMUA') {
    filtered = filtered.filter((r) => r.santri?.kelas_id === filter.kelasId);
  }
  if (filter.kamarId && filter.kamarId !== 'SEMUA') {
    filtered = filtered.filter((r) => r.santri?.kamar_id === filter.kamarId);
  }
  if (filter.santriId && filter.santriId !== 'SEMUA') {
    filtered = filtered.filter((r) => r.santri_id === filter.santriId);
  }

  // Hitung summary global
  let totalHadir = 0;
  let totalIzin = 0;
  let totalSakit = 0;
  let totalAlpa = 0;
  let totalTerlambat = 0;

  filtered.forEach((r) => {
    switch (r.status) {
      case 'HADIR':
        totalHadir++;
        break;
      case 'IZIN':
        totalIzin++;
        break;
      case 'SAKIT':
        totalSakit++;
        break;
      case 'ALPA':
        totalAlpa++;
        break;
      case 'TERLAMBAT':
        totalTerlambat++;
        break;
    }
  });

  const totalRecords = filtered.length;
  const persentaseHadir = totalRecords > 0 ? Math.round(((totalHadir + totalTerlambat) / totalRecords) * 100) : 0;

  // Grouping by Kegiatan
  const kegiatanMap = new Map<string, ReportSummaryRow>();
  filtered.forEach((r) => {
    const kegId = r.kegiatan_id;
    const kegName = r.kegiatan?.nama_kegiatan || 'Kegiatan Umum';
    const kegKat = r.kegiatan?.kategori || '-';
    if (!kegiatanMap.has(kegId)) {
      kegiatanMap.set(kegId, {
        key: kegId,
        label: kegName,
        subLabel: `Kategori: ${kegKat}`,
        totalSesi: 0,
        hadir: 0,
        izin: 0,
        sakit: 0,
        alpa: 0,
        terlambat: 0,
        persentaseHadir: 0,
      });
    }
    const row = kegiatanMap.get(kegId)!;
    row.totalSesi++;
    if (r.status === 'HADIR') row.hadir++;
    else if (r.status === 'IZIN') row.izin++;
    else if (r.status === 'SAKIT') row.sakit++;
    else if (r.status === 'ALPA') row.alpa++;
    else if (r.status === 'TERLAMBAT') row.terlambat++;
  });
  kegiatanMap.forEach((row) => {
    row.persentaseHadir = row.totalSesi > 0 ? Math.round(((row.hadir + row.terlambat) / row.totalSesi) * 100) : 0;
  });

  // Grouping by Kelas
  const kelasMap = new Map<string, ReportSummaryRow>();
  filtered.forEach((r) => {
    const kId = r.santri?.kelas_id || 'unassigned';
    const kName = r.santri?.kelas?.nama_kelas || 'Tanpa Kelas';
    const kTk = r.santri?.kelas?.tingkat || '-';
    if (!kelasMap.has(kId)) {
      kelasMap.set(kId, {
        key: kId,
        label: kName,
        subLabel: `Tingkat: ${kTk}`,
        totalSesi: 0,
        hadir: 0,
        izin: 0,
        sakit: 0,
        alpa: 0,
        terlambat: 0,
        persentaseHadir: 0,
      });
    }
    const row = kelasMap.get(kId)!;
    row.totalSesi++;
    if (r.status === 'HADIR') row.hadir++;
    else if (r.status === 'IZIN') row.izin++;
    else if (r.status === 'SAKIT') row.sakit++;
    else if (r.status === 'ALPA') row.alpa++;
    else if (r.status === 'TERLAMBAT') row.terlambat++;
  });
  kelasMap.forEach((row) => {
    row.persentaseHadir = row.totalSesi > 0 ? Math.round(((row.hadir + row.terlambat) / row.totalSesi) * 100) : 0;
  });

  // Grouping by Kamar
  const kamarMap = new Map<string, ReportSummaryRow>();
  filtered.forEach((r) => {
    const kmId = r.santri?.kamar_id || 'unassigned';
    const kmName = r.santri?.kamar?.nama_kamar || 'Tanpa Kamar';
    const kmGdg = r.santri?.kamar?.gedung || '-';
    if (!kamarMap.has(kmId)) {
      kamarMap.set(kmId, {
        key: kmId,
        label: kmName,
        subLabel: `Gedung: ${kmGdg}`,
        totalSesi: 0,
        hadir: 0,
        izin: 0,
        sakit: 0,
        alpa: 0,
        terlambat: 0,
        persentaseHadir: 0,
      });
    }
    const row = kamarMap.get(kmId)!;
    row.totalSesi++;
    if (r.status === 'HADIR') row.hadir++;
    else if (r.status === 'IZIN') row.izin++;
    else if (r.status === 'SAKIT') row.sakit++;
    else if (r.status === 'ALPA') row.alpa++;
    else if (r.status === 'TERLAMBAT') row.terlambat++;
  });
  kamarMap.forEach((row) => {
    row.persentaseHadir = row.totalSesi > 0 ? Math.round(((row.hadir + row.terlambat) / row.totalSesi) * 100) : 0;
  });

  // Grouping by Date
  const dateMap = new Map<string, ReportSummaryRow>();
  filtered.forEach((r) => {
    const tgl = r.tanggal;
    if (!dateMap.has(tgl)) {
      dateMap.set(tgl, {
        key: tgl,
        label: tgl,
        totalSesi: 0,
        hadir: 0,
        izin: 0,
        sakit: 0,
        alpa: 0,
        terlambat: 0,
        persentaseHadir: 0,
      });
    }
    const row = dateMap.get(tgl)!;
    row.totalSesi++;
    if (r.status === 'HADIR') row.hadir++;
    else if (r.status === 'IZIN') row.izin++;
    else if (r.status === 'SAKIT') row.sakit++;
    else if (r.status === 'ALPA') row.alpa++;
    else if (r.status === 'TERLAMBAT') row.terlambat++;
  });
  dateMap.forEach((row) => {
    row.persentaseHadir = row.totalSesi > 0 ? Math.round(((row.hadir + row.terlambat) / row.totalSesi) * 100) : 0;
  });

  return {
    records: filtered,
    summary: {
      totalRecords,
      hadir: totalHadir,
      izin: totalIzin,
      sakit: totalSakit,
      alpa: totalAlpa,
      terlambat: totalTerlambat,
      persentaseHadir,
    },
    rowsByKegiatan: Array.from(kegiatanMap.values()),
    rowsByKelas: Array.from(kelasMap.values()),
    rowsByKamar: Array.from(kamarMap.values()),
    rowsByDate: Array.from(dateMap.values()).sort((a, b) => b.label.localeCompare(a.label)),
  };
}
