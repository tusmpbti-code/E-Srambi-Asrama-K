/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Profile, UserRole } from '../types';
import { recordAuditLog } from './auditService';
import { getSantriList, getKelasList, getKamarList, getKegiatanList } from './santriService';
import { getSpecialEvents } from './specialEventService';

export interface InstitutionProfile {
  namaPesantren: string;
  namaYayasan: string;
  pengasuh: string;
  alamat: string;
  telepon: string;
  email: string;
  website: string;
  zonaWaktu: 'WIB' | 'WITA' | 'WIT';
  tahunAjaran: string;
  semester: 'Ganjil' | 'Genap';
  toleransiKeterlambatanMenit: number;
  updatedAt: string;
}

const DEFAULT_INSTITUTION: InstitutionProfile = {
  namaPesantren: 'Pondok Pesantren Terpadu Darul Hijrah',
  namaYayasan: 'Yayasan Pendidikan Islam Darul Hijrah',
  pengasuh: 'K.H. Ahmad Dimyathi',
  alamat: 'Jl. Pesantren No. 45, Kompleks Kampus Pusat, Jawa Timur',
  telepon: '(031) 8976543 / 081234567890',
  email: 'sekretariat@pesantren.id',
  website: 'https://pesantren.id',
  zonaWaktu: 'WIB',
  tahunAjaran: '2026/2027',
  semester: 'Ganjil',
  toleransiKeterlambatanMenit: 15,
  updatedAt: new Date().toISOString(),
};

const INSTITUTION_STORAGE_KEY = 'pesantren_institution_profile_v1';
const USERS_STORAGE_KEY = 'pesantren_staff_users_v1';

// Initial staff users list
const INITIAL_STAFF_USERS: Profile[] = [
  {
    id: 'user-superadmin-01',
    email: 'superadmin@pesantren.id',
    full_name: 'K.H. Ahmad Dimyathi (Pengasuh Pondok)',
    role_code: 'SUPER_ADMIN',
    phone: '081122334455',
    is_active: true,
    created_at: '2026-08-01T08:00:00Z',
    updated_at: '2026-08-01T08:00:00Z',
  },
  {
    id: 'user-admin-01',
    email: 'admin.sekretariat@pesantren.id',
    full_name: 'Ust. Fathurrahman (Sekretariat Pusat)',
    role_code: 'ADMIN',
    phone: '081234567890',
    is_active: true,
    created_at: '2026-08-02T08:00:00Z',
    updated_at: '2026-08-02T08:00:00Z',
  },
  {
    id: 'user-asrama-01',
    email: 'pengurus.asrama@pesantren.id',
    full_name: 'Ust. Hilman Nurhakim (Lurah Asrama Putra)',
    role_code: 'PENGURUS_ASRAMA',
    phone: '081398765432',
    is_active: true,
    created_at: '2026-08-03T08:00:00Z',
    updated_at: '2026-08-03T08:00:00Z',
  },
  {
    id: 'user-sekolah-01',
    email: 'petugas.sekolah@pesantren.id',
    full_name: 'Ust. Zainuddin (Tata Usaha MTs/MA)',
    role_code: 'PETUGAS_SEKOLAH',
    phone: '081555666777',
    is_active: true,
    created_at: '2026-08-04T08:00:00Z',
    updated_at: '2026-08-04T08:00:00Z',
  },
  {
    id: 'user-madin-01',
    email: 'petugas.madin@pesantren.id',
    full_name: 'Ust. Marzuqi Ali (Petugas Madrasah Diniyah)',
    role_code: 'PETUGAS_MADIN',
    phone: '081777888999',
    is_active: true,
    created_at: '2026-08-05T08:00:00Z',
    updated_at: '2026-08-05T08:00:00Z',
  },
  {
    id: 'user-jamaah-01',
    email: 'petugas.jamaah@pesantren.id',
    full_name: 'Kang Mukhlis (Petugas Kedisiplinan Jamaah)',
    role_code: 'PETUGAS_JAMAAH',
    phone: '081999000111',
    is_active: true,
    created_at: '2026-08-06T08:00:00Z',
    updated_at: '2026-08-06T08:00:00Z',
  },
];

/**
 * Get Institution Profile
 */
export async function getInstitutionProfile(): Promise<InstitutionProfile> {
  try {
    const raw = localStorage.getItem(INSTITUTION_STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_INSTITUTION, ...JSON.parse(raw) };
    }
  } catch {
    // fallback
  }
  return DEFAULT_INSTITUTION;
}

/**
 * Save Institution Profile
 */
export async function saveInstitutionProfile(
  profile: InstitutionProfile
): Promise<boolean> {
  try {
    const dataWithTimestamp = {
      ...profile,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(INSTITUTION_STORAGE_KEY, JSON.stringify(dataWithTimestamp));

    await recordAuditLog({
      action: 'UPDATE_SETTINGS',
      module: 'SISTEM',
      recordId: 'institution_settings',
      details: {
        namaPesantren: profile.namaPesantren,
        tahunAjaran: profile.tahunAjaran,
        zonaWaktu: profile.zonaWaktu,
      },
    });

    return true;
  } catch {
    return false;
  }
}

/**
 * Get Staff Users List
 */
export async function getStaffUsersList(): Promise<Profile[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        return data as Profile[];
      }
    } catch {
      // fallback
    }
  }

  try {
    const local = localStorage.getItem(USERS_STORAGE_KEY);
    if (local) {
      return JSON.parse(local);
    }
  } catch {
    // fallback
  }

  // Seed default
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_STAFF_USERS));
  return INITIAL_STAFF_USERS;
}

/**
 * Create Staff User
 */
export async function createStaffUser(newUser: {
  email: string;
  full_name: string;
  role_code: UserRole;
  phone?: string;
  password?: string;
}): Promise<{ success: boolean; message: string }> {
  const users = await getStaffUsersList();

  if (users.some((u) => u.email.toLowerCase() === newUser.email.toLowerCase())) {
    return { success: false, message: 'Email petugas sudah terdaftar dalam sistem.' };
  }

  const profile: Profile = {
    id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    email: newUser.email,
    full_name: newUser.full_name,
    role_code: newUser.role_code,
    phone: newUser.phone || null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from('profiles').insert([profile]);
      if (error) {
        // Fallback to local storage if RLS denies direct insert
        console.warn('Supabase profile insert error, saving locally:', error.message);
      }
    } catch {
      // ignore
    }
  }

  const updatedUsers = [...users, profile];
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));

  await recordAuditLog({
    action: 'CREATE_USER',
    module: 'AUTH',
    recordId: profile.id,
    details: {
      email: profile.email,
      role: profile.role_code,
      full_name: profile.full_name,
    },
  });

  return { success: true, message: 'Petugas baru berhasil ditambahkan.' };
}

/**
 * Update Staff User Role / Status
 */
export async function updateStaffUser(
  id: string,
  updates: Partial<Profile>
): Promise<boolean> {
  const users = await getStaffUsersList();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return false;

  const updated = {
    ...users[idx],
    ...updates,
    updated_at: new Date().toISOString(),
  };

  users[idx] = updated;
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('profiles').update(updates).eq('id', id);
    } catch {
      // ignore
    }
  }

  await recordAuditLog({
    action: 'UPDATE_USER',
    module: 'AUTH',
    recordId: id,
    details: updates as Record<string, unknown>,
  });

  return true;
}

/**
 * Delete Staff User
 */
export async function deleteStaffUser(id: string): Promise<{ success: boolean; message: string }> {
  const users = await getStaffUsersList();
  const target = users.find((u) => u.id === id);
  if (!target) return { success: false, message: 'Pengguna tidak ditemukan.' };

  if (target.role_code === 'SUPER_ADMIN' && users.filter((u) => u.role_code === 'SUPER_ADMIN').length <= 1) {
    return { success: false, message: 'Tidak dapat menghapus Super Admin terakhir.' };
  }

  const filtered = users.filter((u) => u.id !== id);
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(filtered));

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('profiles').delete().eq('id', id);
    } catch {
      // ignore
    }
  }

  await recordAuditLog({
    action: 'DELETE_USER',
    module: 'AUTH',
    recordId: id,
    details: { email: target.email, role: target.role_code },
  });

  return { success: true, message: 'Petugas berhasil dihapus.' };
}

/**
 * Full Database JSON Backup
 */
export async function generateFullDatabaseBackup(): Promise<string> {
  const [
    santri,
    kelas,
    kamar,
    kegiatan,
    specialEvents,
    institution,
    staffUsers,
  ] = await Promise.all([
    getSantriList(),
    getKelasList(),
    getKamarList(),
    getKegiatanList(),
    getSpecialEvents(),
    getInstitutionProfile(),
    getStaffUsersList(),
  ]);

  // Read raw local storage for attendance & permissions
  let attendanceRecords = [];
  try {
    const raw = localStorage.getItem('pesantren_attendance_records_v2');
    if (raw) attendanceRecords = JSON.parse(raw);
  } catch {
    // ignore
  }

  let permissions = [];
  try {
    const raw = localStorage.getItem('pesantren_permissions_records_v3');
    if (raw) permissions = JSON.parse(raw);
  } catch {
    // ignore
  }

  let specialAttendance = [];
  try {
    const raw = localStorage.getItem('pesantren_special_attendance_v3');
    if (raw) specialAttendance = JSON.parse(raw);
  } catch {
    // ignore
  }

  const backupPayload = {
    system: 'SISTEM_ABSENSI_PERIZINAN_SANTRI_TERPADU',
    version: '2.5.0-production',
    exportTimestamp: new Date().toISOString(),
    institution,
    datasets: {
      santri,
      kelas,
      kamar,
      kegiatan,
      specialEvents,
      attendanceRecords,
      permissions,
      specialAttendance,
      staffUsers,
    },
    counts: {
      totalSantri: santri.length,
      totalKelas: kelas.length,
      totalKamar: kamar.length,
      totalKegiatan: kegiatan.length,
      totalEvents: specialEvents.length,
      totalAttendance: attendanceRecords.length,
      totalPermissions: permissions.length,
      totalSpecialAttendance: specialAttendance.length,
      totalStaff: staffUsers.length,
    },
  };

  await recordAuditLog({
    action: 'BACKUP_DATABASE',
    module: 'SISTEM',
    recordId: 'all_tables',
    details: {
      counts: backupPayload.counts,
    },
  });

  return JSON.stringify(backupPayload, null, 2);
}

/**
 * Restore Database from Backup JSON
 */
export async function restoreDatabaseFromBackup(jsonString: string): Promise<{
  success: boolean;
  message: string;
  counts?: Record<string, number>;
}> {
  try {
    const data = JSON.parse(jsonString);

    if (!data.datasets || !data.system) {
      return {
        success: false,
        message: 'Format file backup tidak valid. File harus dihasilkan oleh sistem ini.',
      };
    }

    const { datasets, institution } = data;

    if (institution) {
      localStorage.setItem(INSTITUTION_STORAGE_KEY, JSON.stringify(institution));
    }

    if (Array.isArray(datasets.santri) && datasets.santri.length > 0) {
      localStorage.setItem('pesantren_santri_master_v2', JSON.stringify(datasets.santri));
    }

    if (Array.isArray(datasets.kelas) && datasets.kelas.length > 0) {
      localStorage.setItem('pesantren_kelas_list', JSON.stringify(datasets.kelas));
    }

    if (Array.isArray(datasets.kamar) && datasets.kamar.length > 0) {
      localStorage.setItem('pesantren_kamar_list', JSON.stringify(datasets.kamar));
    }

    if (Array.isArray(datasets.kegiatan) && datasets.kegiatan.length > 0) {
      localStorage.setItem('pesantren_kegiatan_list_v2', JSON.stringify(datasets.kegiatan));
    }

    if (Array.isArray(datasets.specialEvents)) {
      localStorage.setItem('pesantren_special_events_v3', JSON.stringify(datasets.specialEvents));
    }

    if (Array.isArray(datasets.attendanceRecords)) {
      localStorage.setItem('pesantren_attendance_records_v2', JSON.stringify(datasets.attendanceRecords));
    }

    if (Array.isArray(datasets.permissions)) {
      localStorage.setItem('pesantren_permissions_records_v3', JSON.stringify(datasets.permissions));
    }

    if (Array.isArray(datasets.specialAttendance)) {
      localStorage.setItem('pesantren_special_attendance_v3', JSON.stringify(datasets.specialAttendance));
    }

    if (Array.isArray(datasets.staffUsers) && datasets.staffUsers.length > 0) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(datasets.staffUsers));
    }

    await recordAuditLog({
      action: 'RESTORE_DATABASE',
      module: 'SISTEM',
      recordId: 'all_tables',
      details: {
        timestamp: data.exportTimestamp,
        restoredCounts: data.counts || {},
      },
    });

    return {
      success: true,
      message: 'Data backup berhasil dipulihkan secara menyeluruh ke dalam sistem.',
      counts: data.counts || {},
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal memproses file backup: ${err.message || 'Error parsing JSON'}`,
    };
  }
}

/**
 * Test Supabase Live Connectivity
 */
export async function testSupabaseConnectivity(): Promise<{
  connected: boolean;
  latencyMs: number;
  message: string;
  details?: Record<string, any>;
}> {
  if (!isSupabaseConfigured()) {
    return {
      connected: false,
      latencyMs: 0,
      message: 'Supabase belum dikonfigurasi. Variabel VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY belum terpasang.',
    };
  }

  const start = performance.now();
  try {
    const { data, error } = await supabase.from('santri').select('id').limit(1);
    const end = performance.now();
    const latencyMs = Math.round(end - start);

    if (error) {
      return {
        connected: false,
        latencyMs,
        message: `Koneksi gagal: ${error.message}`,
        details: error,
      };
    }

    return {
      connected: true,
      latencyMs,
      message: `Koneksi berhasil terhubung ke PostgreSQL Supabase (${latencyMs} ms).`,
      details: { rowCount: data ? data.length : 0 },
    };
  } catch (err: any) {
    const end = performance.now();
    return {
      connected: false,
      latencyMs: Math.round(end - start),
      message: `Error jaringan: ${err.message || 'Koneksi terputus'}`,
    };
  }
}
