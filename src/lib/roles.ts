/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserRole, RoleInfo, ActiveNavMenu } from '../types';

export const ROLE_DEFINITIONS: Record<UserRole, RoleInfo> = {
  SUPER_ADMIN: {
    code: 'SUPER_ADMIN',
    displayName: 'Super Admin',
    description: 'Akses penuh ke seluruh modul sistem, database, audit log, dan manajemen pengguna.',
    permissions: [
      'manage_all',
      'view_all',
      'edit_santri',
      'delete_santri',
      'manage_roles',
      'manage_kegiatan',
      'manage_absensi',
      'manage_perizinan',
      'view_reports',
      'manage_system',
      'view_audit_logs',
    ],
  },
  ADMIN: {
    code: 'ADMIN',
    displayName: 'Admin',
    description: 'Pengelolaan data santri, kegiatan, absensi, perizinan, dan laporan.',
    permissions: [
      'view_all',
      'edit_santri',
      'manage_kegiatan',
      'manage_absensi',
      'manage_perizinan',
      'view_reports',
    ],
  },
  PENGURUS_ASRAMA: {
    code: 'PENGURUS_ASRAMA',
    displayName: 'Pengurus Asrama',
    description: 'Pengelolaan absensi asrama, perizinan santri, kegiatan khusus, dan PSG.',
    permissions: [
      'view_santri',
      'edit_santri_asrama',
      'manage_absensi_asrama',
      'manage_perizinan',
      'manage_kegiatan_khusus',
      'manage_psg',
    ],
  },
  PETUGAS_SEKOLAH: {
    code: 'PETUGAS_SEKOLAH',
    displayName: 'Petugas Sekolah',
    description: 'Pencatatan dan verifikasi absensi santri pada jam sekolah formal.',
    permissions: ['view_santri', 'manage_absensi_sekolah'],
  },
  PETUGAS_MADIN: {
    code: 'PETUGAS_MADIN',
    displayName: 'Petugas Madin',
    description: 'Pencatatan dan verifikasi absensi santri pada Madrasah Diniyah.',
    permissions: ['view_santri', 'manage_absensi_madin'],
  },
  PETUGAS_JAMAAH: {
    code: 'PETUGAS_JAMAAH',
    displayName: 'Petugas Jamaah',
    description: 'Pencatatan absensi shalat berjamaah 5 waktu di masjid pesantren.',
    permissions: ['view_santri', 'manage_absensi_jamaah'],
  },
};

/**
 * Validasi apakah role memiliki izin tertentu
 */
export function hasPermission(role: UserRole, permission: string): boolean {
  if (role === 'SUPER_ADMIN') return true;
  const roleDef = ROLE_DEFINITIONS[role];
  if (!roleDef) return false;
  return roleDef.permissions.includes(permission);
}

/**
 * Validasi akses menu navigasi berdasarkan role
 */
export function canAccessMenu(role: UserRole, menu: ActiveNavMenu): boolean {
  if (role === 'SUPER_ADMIN') return true;

  switch (menu) {
    case 'dashboard':
      return true; // Semua role bisa melihat ringkasan dashboard sesuai haknya
    case 'santri':
      return true; // Semua role bisa melihat data santri (Petugas hanya read-only untuk cari santri)
    case 'kegiatan':
      return true; // Semua role bisa melihat jadwal kegiatan santri
    case 'absensi':
      return ['ADMIN', 'PENGURUS_ASRAMA', 'PETUGAS_SEKOLAH', 'PETUGAS_MADIN', 'PETUGAS_JAMAAH'].includes(role);
    case 'perizinan':
      return ['ADMIN', 'PENGURUS_ASRAMA'].includes(role);
    case 'kegiatan_khusus':
      return ['ADMIN', 'PENGURUS_ASRAMA'].includes(role);
    case 'laporan':
      return ['ADMIN', 'PENGURUS_ASRAMA', 'PETUGAS_SEKOLAH', 'PETUGAS_MADIN', 'PETUGAS_JAMAAH'].includes(role);
    case 'pengaturan':
      return false; // Hanya SUPER_ADMIN
    default:
      return false;
  }
}

export function getRoleBadgeClass(role: UserRole): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'ADMIN':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'PENGURUS_ASRAMA':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'PETUGAS_SEKOLAH':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'PETUGAS_MADIN':
      return 'bg-cyan-100 text-cyan-800 border-cyan-200';
    case 'PETUGAS_JAMAAH':
      return 'bg-teal-100 text-teal-800 border-teal-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}
