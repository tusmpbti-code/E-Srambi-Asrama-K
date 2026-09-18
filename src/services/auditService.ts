/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { AuditLog } from '../types';

const STORAGE_KEY_AUDIT = 'pesantren_audit_logs_v1';

export type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'CREATE_PERMISSION'
  | 'APPROVE_PERMISSION'
  | 'REJECT_PERMISSION'
  | 'RECORD_EXIT'
  | 'RECORD_RETURN'
  | 'RECORD_ATTENDANCE'
  | 'UPDATE_ATTENDANCE'
  | 'DELETE_ATTENDANCE'
  | 'CREATE_EVENT'
  | 'UPDATE_EVENT'
  | 'DELETE_EVENT'
  | 'CREATE_SANTRI'
  | 'UPDATE_SANTRI'
  | 'DELETE_SANTRI'
  | 'SCAN_EVENT_BERANGKAT'
  | 'SCAN_EVENT_KEMBALI';

export interface LogAuditParams {
  userId?: string | null;
  userEmail?: string | null;
  action: AuditAction | string;
  module: 'AUTH' | 'ABSENSI' | 'PERIZINAN' | 'KEGIATAN_KHUSUS' | 'SANTRI' | 'KEGIATAN' | 'SISTEM';
  recordId?: string | null;
  details?: Record<string, unknown>;
}

// Initial seed audit logs for demonstration
const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'aud-seed-001',
    user_id: '00000000-0000-0000-0000-000000000001',
    user_email: 'superadmin@pesantren.id',
    action: 'LOGIN',
    table_name: 'AUTH',
    record_id: 'auth-session',
    details: { role: 'SUPER_ADMIN', method: 'password', ip: '127.0.0.1' },
    ip_address: '127.0.0.1',
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'aud-seed-002',
    user_id: '00000000-0000-0000-0000-000000000002',
    user_email: 'sekolah@pesantren.id',
    action: 'RECORD_ATTENDANCE',
    table_name: 'ABSENSI',
    record_id: 'att-20260918-001',
    details: { santri: 'Muhammad Farhan Al-Ghifari', kegiatan: 'Sekolah Formal Pagi', status: 'HADIR' },
    ip_address: '127.0.0.1',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'aud-seed-003',
    user_id: '00000000-0000-0000-0000-000000000003',
    user_email: 'pengurus@pesantren.id',
    action: 'APPROVE_PERMISSION',
    table_name: 'PERIZINAN',
    record_id: 'perm-001',
    details: { santri: 'Ahmad Dani Ramadhan', jenis: 'IZIN_PULANG', status: 'DISETUJUI' },
    ip_address: '127.0.0.1',
    created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
];

function loadLocalAuditLogs(): AuditLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUDIT);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return [...INITIAL_AUDIT_LOGS];
}

function saveLocalAuditLogs(logs: AuditLog[]) {
  try {
    localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify(logs.slice(0, 500))); // keep max 500
  } catch {
    // ignore
  }
}

let memoryAuditLogs: AuditLog[] = loadLocalAuditLogs();

/**
 * Catat aktivitas penting ke audit_logs (Supabase + Local fallback)
 * Memastikan password atau data sensitif TIDAK PERNAH disimpan.
 */
export async function recordAuditLog(params: LogAuditParams): Promise<void> {
  // Sanitize details: strip any potential password/token fields
  const safeDetails: Record<string, unknown> = {};
  if (params.details) {
    for (const [key, val] of Object.entries(params.details)) {
      if (/password|secret|token|key/i.test(key)) {
        safeDetails[key] = '[REDACTED]';
      } else {
        safeDetails[key] = val;
      }
    }
  }

  const timestamp = new Date().toISOString();
  const newLog: AuditLog = {
    id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    user_id: params.userId || null,
    user_email: params.userEmail || null,
    action: params.action,
    table_name: params.module,
    record_id: params.recordId || null,
    details: safeDetails,
    ip_address: 'Client',
    created_at: timestamp,
  };

  // Always keep in memory & local storage for instant dashboard / audit view
  memoryAuditLogs.unshift(newLog);
  if (memoryAuditLogs.length > 500) memoryAuditLogs = memoryAuditLogs.slice(0, 500);
  saveLocalAuditLogs(memoryAuditLogs);

  // Attempt to write to Supabase audit_logs
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('audit_logs').insert([
        {
          user_id: params.userId || null,
          user_email: params.userEmail || null,
          action: params.action,
          table_name: params.module,
          record_id: params.recordId || null,
          details: safeDetails,
          ip_address: 'Client',
          created_at: timestamp,
        },
      ]);
    } catch (err) {
      console.warn('Supabase audit log insert skipped:', err);
    }
  }
}

/**
 * Mengambil daftar Audit Logs dengan filter
 */
export async function getAuditLogs(filter?: {
  module?: string;
  action?: string;
  userEmail?: string;
  search?: string;
  limit?: number;
}): Promise<AuditLog[]> {
  const limit = filter?.limit || 100;

  if (isSupabaseConfigured()) {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (filter?.module && filter.module !== 'SEMUA') {
        query = query.eq('table_name', filter.module);
      }
      if (filter?.action && filter.action !== 'SEMUA') {
        query = query.eq('action', filter.action);
      }
      if (filter?.userEmail) {
        query = query.ilike('user_email', `%${filter.userEmail}%`);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data as AuditLog[];
      }
    } catch {
      // fallback to memory
    }
  }

  // Filter in-memory logs
  let result = [...memoryAuditLogs];
  if (filter?.module && filter.module !== 'SEMUA') {
    result = result.filter((l) => l.table_name === filter.module);
  }
  if (filter?.action && filter.action !== 'SEMUA') {
    result = result.filter((l) => l.action === filter.action);
  }
  if (filter?.userEmail) {
    const q = filter.userEmail.toLowerCase();
    result = result.filter((l) => l.user_email?.toLowerCase().includes(q));
  }
  if (filter?.search) {
    const q = filter.search.toLowerCase();
    result = result.filter(
      (l) =>
        l.action.toLowerCase().includes(q) ||
        l.user_email?.toLowerCase().includes(q) ||
        (l.record_id && l.record_id.toLowerCase().includes(q)) ||
        JSON.stringify(l.details || {}).toLowerCase().includes(q)
    );
  }

  return result.slice(0, limit);
}
