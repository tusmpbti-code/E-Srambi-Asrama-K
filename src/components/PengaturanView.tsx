/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Settings,
  Building,
  Users,
  Shield,
  Database,
  Server,
  Save,
  RefreshCw,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Upload,
  Clock,
  Globe,
  Key,
  HelpCircle,
  FileCheck,
  Search,
  Lock,
  ExternalLink,
  Copy,
  Check,
  Terminal,
  Code,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole, Profile } from '../types';
import { ROLE_DEFINITIONS, getRoleBadgeClass } from '../lib/roles';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  InstitutionProfile,
  getInstitutionProfile,
  saveInstitutionProfile,
  getStaffUsersList,
  createStaffUser,
  updateStaffUser,
  deleteStaffUser,
  generateFullDatabaseBackup,
  restoreDatabaseFromBackup,
  testSupabaseConnectivity,
  testSupabaseWritePermission,
} from '../services/settingsService';
import { getAuditLogs } from '../services/auditService';

type TabType = 'profil' | 'pengguna' | 'audit' | 'backup' | 'koneksi';

export const FIX_RLS_SQL_STRING = `-- ==============================================================================
-- SKRIP PERBAIKAN RLS (ROW-LEVEL SECURITY) & IZIN AKSES SUPABASE
-- Jalankan di: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Berikan hak akses skema public ke role anon dan authenticated
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated;

-- 2. Hapus foreign key kaku ke auth.users agar ID fleksibel
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE IF EXISTS public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
ALTER TABLE IF EXISTS public.attendance_records DROP CONSTRAINT IF EXISTS attendance_records_petugas_id_fkey;
ALTER TABLE IF EXISTS public.special_events DROP CONSTRAINT IF EXISTS special_events_created_by_fkey;
ALTER TABLE IF EXISTS public.special_attendance DROP CONSTRAINT IF EXISTS special_attendance_scanned_by_fkey;

ALTER TABLE IF EXISTS public.audit_logs ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE IF EXISTS public.attendance_records ALTER COLUMN petugas_id TYPE TEXT;
ALTER TABLE IF EXISTS public.special_events ALTER COLUMN created_by TYPE TEXT;
ALTER TABLE IF EXISTS public.special_attendance ALTER COLUMN scanned_by TYPE TEXT;

-- 3. Pastikan RLS Aktif pada seluruh tabel
ALTER TABLE IF EXISTS public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.kamar ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.kelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.santri ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.kegiatan ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.special_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.special_event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.special_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 4. Buka akses penuh untuk role anon & authenticated pada semua tabel operasional
DROP POLICY IF EXISTS "Allow all access on roles" ON public.roles;
CREATE POLICY "Allow all access on roles" ON public.roles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access on profiles" ON public.profiles;
CREATE POLICY "Allow all access on profiles" ON public.profiles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access on kamar" ON public.kamar;
CREATE POLICY "Allow all access on kamar" ON public.kamar FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access on kelas" ON public.kelas;
CREATE POLICY "Allow all access on kelas" ON public.kelas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access on santri" ON public.santri;
CREATE POLICY "Allow all access on santri" ON public.santri FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access on kegiatan" ON public.kegiatan;
CREATE POLICY "Allow all access on kegiatan" ON public.kegiatan FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access on attendance_records" ON public.attendance_records;
CREATE POLICY "Allow all access on attendance_records" ON public.attendance_records FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access on permissions" ON public.permissions;
CREATE POLICY "Allow all access on permissions" ON public.permissions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access on special_events" ON public.special_events;
CREATE POLICY "Allow all access on special_events" ON public.special_events FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access on special_event_participants" ON public.special_event_participants;
CREATE POLICY "Allow all access on special_event_participants" ON public.special_event_participants FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access on special_attendance" ON public.special_attendance;
CREATE POLICY "Allow all access on special_attendance" ON public.special_attendance FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access on audit_logs" ON public.audit_logs;
CREATE POLICY "Allow all access on audit_logs" ON public.audit_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);`;

export const PengaturanView: React.FC = () => {
  const { currentRole, profile: myProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('profil');

  // Institution State
  const [institution, setInstitution] = useState<InstitutionProfile | null>(null);
  const [savingInstitution, setSavingInstitution] = useState(false);
  const [institutionSavedMsg, setInstitutionSavedMsg] = useState('');

  // Users / Staff State
  const [staffList, setStaffList] = useState<Profile[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [newUser, setNewUser] = useState<{
    full_name: string;
    email: string;
    role_code: UserRole;
    phone: string;
  }>({
    full_name: '',
    email: '',
    role_code: 'PETUGAS_SEKOLAH',
    phone: '',
  });
  const [userError, setUserError] = useState('');
  const [userSuccess, setUserSuccess] = useState('');

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditFilterAction, setAuditFilterAction] = useState<string>('SEMUA');
  const [auditSearch, setAuditSearch] = useState('');

  // Backup & Restore State
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState<{
    type: 'success' | 'error' | '';
    message: string;
  }>({ type: '', message: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Connectivity Test State
  const [testResult, setTestResult] = useState<{
    loading: boolean;
    connected?: boolean;
    latencyMs?: number;
    message?: string;
    writeAllowed?: boolean;
    isRlsError?: boolean;
  }>({ loading: false });

  const [testingWrite, setTestingWrite] = useState(false);
  const [writeTestResult, setWriteTestResult] = useState<{
    tested: boolean;
    allowed: boolean;
    message: string;
    isRlsError: boolean;
  } | null>(null);

  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlViewer, setShowSqlViewer] = useState(false);

  // Load Institution
  useEffect(() => {
    getInstitutionProfile().then((data) => setInstitution(data));
  }, []);

  // Load Staff Users
  const loadStaff = useCallback(async () => {
    setLoadingStaff(true);
    try {
      const data = await getStaffUsersList();
      setStaffList(data);
    } finally {
      setLoadingStaff(false);
    }
  }, []);

  // Load Audit Logs
  const loadAudit = useCallback(async () => {
    setAuditLoading(true);
    try {
      const logs = await getAuditLogs({ limit: 150 });
      setAuditLogs(logs);
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'pengguna') loadStaff();
    if (activeTab === 'audit') loadAudit();
  }, [activeTab, loadStaff, loadAudit]);

  // Save Institution
  const handleSaveInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institution) return;
    setSavingInstitution(true);
    const ok = await saveInstitutionProfile(institution);
    setSavingInstitution(false);
    if (ok) {
      setInstitutionSavedMsg('Pengaturan institusi berhasil disimpan.');
      setTimeout(() => setInstitutionSavedMsg(''), 4000);
    }
  };

  // Add User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError('');
    setUserSuccess('');

    if (!newUser.full_name || !newUser.email) {
      setUserError('Nama lengkap dan email wajib diisi.');
      return;
    }

    const res = await createStaffUser(newUser);
    if (!res.success) {
      setUserError(res.message);
      return;
    }

    setUserSuccess(res.message);
    setNewUser({
      full_name: '',
      email: '',
      role_code: 'PETUGAS_SEKOLAH',
      phone: '',
    });
    loadStaff();
    setTimeout(() => {
      setUserModalOpen(false);
      setUserSuccess('');
    }, 1200);
  };

  // Toggle user status
  const handleToggleUserStatus = async (user: Profile) => {
    await updateStaffUser(user.id, { is_active: !user.is_active });
    loadStaff();
  };

  // Change user role
  const handleChangeUserRole = async (userId: string, newRole: UserRole) => {
    await updateStaffUser(userId, { role_code: newRole });
    loadStaff();
  };

  // Delete user
  const handleDeleteUser = async (id: string, name: string) => {
    if (!window.confirm(`Yakin ingin menghapus akun ${name}? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }
    const res = await deleteStaffUser(id);
    if (!res.success) {
      alert(res.message);
      return;
    }
    loadStaff();
  };

  // Full Backup JSON
  const handleDownloadBackup = async () => {
    setBackupLoading(true);
    try {
      const json = await generateFullDatabaseBackup();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().split('T')[0];
      link.download = `BACKUP_SANTRI_TERPADU_${timestamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setBackupLoading(false);
    }
  };

  // Restore JSON
  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      if (!window.confirm('PERINGATAN: Memulihkan backup akan menggantikan data master dan log absensi yang ada. Lanjutkan pemulihan?')) {
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      setBackupLoading(true);
      const res = await restoreDatabaseFromBackup(content);
      setBackupLoading(false);

      if (res.success) {
        setRestoreStatus({
          type: 'success',
          message: `${res.message} ${res.counts ? `(${res.counts.totalSantri || 0} santri, ${res.counts.totalAttendance || 0} absensi, ${res.counts.totalPermissions || 0} izin)` : ''}`,
        });
      } else {
        setRestoreStatus({
          type: 'error',
          message: res.message,
        });
      }

      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  // Test Supabase Connection (Read & Write / RLS)
  const handleTestSupabase = async () => {
    setTestResult({ loading: true });
    const res = await testSupabaseConnectivity();
    if (!res.connected) {
      setTestResult({
        loading: false,
        connected: false,
        latencyMs: res.latencyMs,
        message: res.message,
      });
      return;
    }

    const writeRes = await testSupabaseWritePermission();
    setTestResult({
      loading: false,
      connected: true,
      latencyMs: res.latencyMs,
      writeAllowed: writeRes.allowed,
      isRlsError: writeRes.isRlsError,
      message: writeRes.allowed
        ? `${res.message} Izin tulis data (INSERT/UPDATE/DELETE) juga AKTIF dan normal.`
        : `Koneksi baca OK (${res.latencyMs}ms), namun IZIN TULIS DIBLOKIR: ${writeRes.message}. Silakan jalankan skrip fix_rls.sql di Supabase SQL Editor.`,
    });
  };

  const handleManualWriteTest = async () => {
    setTestingWrite(true);
    setWriteTestResult(null);
    const res = await testSupabaseWritePermission();
    setWriteTestResult({
      tested: true,
      allowed: res.allowed,
      message: res.message,
      isRlsError: res.isRlsError,
    });
    setTestingWrite(false);
  };

  const handleCopyFixSql = async () => {
    try {
      await navigator.clipboard.writeText(FIX_RLS_SQL_STRING);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 3000);
    } catch {
      // ignore
    }
  };

  // Export Audit to CSV
  const handleExportAuditCSV = () => {
    if (auditLogs.length === 0) {
      alert('Tidak ada log audit untuk diekspor.');
      return;
    }

    const headers = ['No', 'Waktu', 'Aksi', 'Tabel', 'Pengguna / Petugas', 'Rincian'];
    const rows = auditLogs.map((log, idx) => [
      idx + 1,
      `"${new Date(log.created_at).toLocaleString('id-ID')}"`,
      `"${log.action}"`,
      `"${log.table_name || '-'}"`,
      `"${log.user_email || 'System'}"`,
      `"${(typeof log.details === 'object' ? JSON.stringify(log.details) : log.details || '-').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Audit_Trail_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Audit Logs
  const filteredAuditLogs = auditLogs.filter((log) => {
    if (auditFilterAction !== 'SEMUA' && log.action !== auditFilterAction) return false;
    if (auditSearch) {
      const q = auditSearch.toLowerCase();
      const match =
        (log.user_email && log.user_email.toLowerCase().includes(q)) ||
        (log.action && log.action.toLowerCase().includes(q)) ||
        (log.table_name && log.table_name.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-zinc-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-1">
            <Settings className="w-4 h-4" />
            <span>Pengaturan Sistem Terpadu</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-900 tracking-tight">
            Konfigurasi Sistem & Manajemen Petugas
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Pengelolaan profil institusi, hak akses role RBAC, audit log keamanan, dan backup & restore data.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadBackup}
            disabled={backupLoading}
            className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors shadow-xs flex items-center space-x-1.5"
            title="Download Backup Database Lengkap"
          >
            <Download className="w-4 h-4" />
            <span>{backupLoading ? 'Menyusun...' : 'Backup JSON'}</span>
          </button>
          <button
            onClick={handleTestSupabase}
            disabled={testResult.loading}
            className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition-colors shadow-xs flex items-center space-x-1.5"
            title="Uji Koneksi Supabase Live"
          >
            <Server className="w-4 h-4" />
            <span>{testResult.loading ? 'Menguji...' : 'Uji Supabase'}</span>
          </button>
        </div>
      </div>

      {/* Connectivity Alert banner if tested */}
      {testResult.message && (
        <div
          className={`p-4 rounded-xl border flex items-start space-x-3 text-xs ${
            testResult.connected
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          {testResult.connected ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <div className="font-bold">
              {testResult.connected ? 'Koneksi Supabase Aktif' : 'Status Koneksi Supabase'}
            </div>
            <div className="mt-0.5">{testResult.message}</div>
          </div>
          <button
            onClick={() => setTestResult({ loading: false })}
            className="text-zinc-400 hover:text-zinc-600 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="bg-white rounded-2xl p-2 border border-zinc-200 shadow-xs overflow-x-auto">
        <div className="flex space-x-1.5 min-w-max">
          <button
            onClick={() => setActiveTab('profil')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'profil'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>1. Profil Lembaga & Waktu</span>
          </button>

          <button
            onClick={() => setActiveTab('pengguna')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'pengguna'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>2. Petugas & Role RBAC</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'audit'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>3. Audit Trail & Log Keamanan</span>
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'backup'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>4. Backup & Restore Data</span>
          </button>

          <button
            onClick={() => setActiveTab('koneksi')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'koneksi'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>5. Supabase & Netlify SPA</span>
          </button>
        </div>
      </div>

      {/* TAB 1: PROFIL LEMBAGA */}
      {activeTab === 'profil' && institution && (
        <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-200 mb-6">
            <div>
              <h2 className="text-base font-bold text-zinc-900">Profil Yayasan & Pengaturan Akademik</h2>
              <p className="text-xs text-zinc-500">
                Data ini dicantumkan pada kartu santri, cetakan laporan resmi, kop surat, dan acuan zona waktu absensi.
              </p>
            </div>
            {institutionSavedMsg && (
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                {institutionSavedMsg}
              </span>
            )}
          </div>

          <form onSubmit={handleSaveInstitution} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-zinc-600 font-semibold mb-1">Nama Pondok Pesantren</label>
                <input
                  type="text"
                  value={institution.namaPesantren}
                  onChange={(e) => setInstitution({ ...institution, namaPesantren: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-600 font-semibold mb-1">Nama Yayasan Pengelola</label>
                <input
                  type="text"
                  value={institution.namaYayasan}
                  onChange={(e) => setInstitution({ ...institution, namaYayasan: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-600 font-semibold mb-1">Pengasuh / Pimpinan Pondok</label>
                <input
                  type="text"
                  value={institution.pengasuh}
                  onChange={(e) => setInstitution({ ...institution, pengasuh: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-600 font-semibold mb-1">Telepon / WhatsApp Sekretariat</label>
                <input
                  type="text"
                  value={institution.telepon}
                  onChange={(e) => setInstitution({ ...institution, telepon: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-zinc-600 font-semibold mb-1">Alamat Lengkap Kampus Pesantren</label>
                <input
                  type="text"
                  value={institution.alamat}
                  onChange={(e) => setInstitution({ ...institution, alamat: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                />
              </div>

              <div>
                <label className="block text-zinc-600 font-semibold mb-1">Email Resmi</label>
                <input
                  type="email"
                  value={institution.email}
                  onChange={(e) => setInstitution({ ...institution, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                />
              </div>

              <div>
                <label className="block text-zinc-600 font-semibold mb-1">Website Institusi</label>
                <input
                  type="text"
                  value={institution.website}
                  onChange={(e) => setInstitution({ ...institution, website: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                />
              </div>

              <div>
                <label className="block text-zinc-600 font-semibold mb-1">Zona Waktu Operasional</label>
                <select
                  value={institution.zonaWaktu}
                  onChange={(e) =>
                    setInstitution({ ...institution, zonaWaktu: e.target.value as 'WIB' | 'WITA' | 'WIT' })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-700 bg-white"
                >
                  <option value="WIB">WIB (Waktu Indonesia Barat - UTC+7)</option>
                  <option value="WITA">WITA (Waktu Indonesia Tengah - UTC+8)</option>
                  <option value="WIT">WIT (Waktu Indonesia Timur - UTC+9)</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-600 font-semibold mb-1">Tahun Ajaran Aktif</label>
                <input
                  type="text"
                  value={institution.tahunAjaran}
                  onChange={(e) => setInstitution({ ...institution, tahunAjaran: e.target.value })}
                  placeholder="2026/2027"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                />
              </div>

              <div>
                <label className="block text-zinc-600 font-semibold mb-1">Semester Aktif</label>
                <select
                  value={institution.semester}
                  onChange={(e) =>
                    setInstitution({ ...institution, semester: e.target.value as 'Ganjil' | 'Genap' })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-700 bg-white"
                >
                  <option value="Ganjil">Semester Ganjil</option>
                  <option value="Genap">Semester Genap</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-600 font-semibold mb-1">
                  Toleransi Keterlambatan Absensi (Menit)
                </label>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={institution.toleransiKeterlambatanMenit}
                  onChange={(e) =>
                    setInstitution({
                      ...institution,
                      toleransiKeterlambatanMenit: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                />
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end">
              <button
                type="submit"
                disabled={savingInstitution}
                className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors shadow-xs flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>{savingInstitution ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: PENGGUNA & ROLE RBAC */}
      {activeTab === 'pengguna' && (
        <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-200">
            <div>
              <h2 className="text-base font-bold text-zinc-900">Daftar Akun Petugas & Hak Akses (RBAC)</h2>
              <p className="text-xs text-zinc-500">
                Pengelolaan akun staf, pengasuh, dan petugas pencatat absensi dengan 6 role berbasis peran.
              </p>
            </div>
            <button
              onClick={() => setUserModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors shadow-xs flex items-center space-x-1.5 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Petugas Baru</span>
            </button>
          </div>

          {loadingStaff ? (
            <div className="py-12 text-center text-zinc-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-700 mb-2" />
              <span>Memuat daftar akun petugas...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 text-zinc-600 font-semibold border-b border-zinc-200 uppercase">
                  <tr>
                    <th className="py-3 px-4">Nama Petugas</th>
                    <th className="py-3 px-4">Email Login</th>
                    <th className="py-3 px-4">Peran (Role)</th>
                    <th className="py-3 px-4">Kontak</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {staffList.map((u) => {
                    const roleInfo = ROLE_DEFINITIONS[u.role_code];
                    return (
                      <tr key={u.id} className="hover:bg-zinc-50">
                        <td className="py-3 px-4">
                          <div className="font-bold text-zinc-900">{u.full_name}</div>
                          {u.id === myProfile?.id && (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">
                              Akun Anda
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-zinc-600">{u.email}</td>
                        <td className="py-3 px-4">
                          <select
                            value={u.role_code}
                            onChange={(e) => handleChangeUserRole(u.id, e.target.value as UserRole)}
                            className={`px-2 py-1 rounded text-xs font-bold border ${getRoleBadgeClass(u.role_code)}`}
                          >
                            <option value="SUPER_ADMIN">Super Admin</option>
                            <option value="ADMIN">Admin</option>
                            <option value="PENGURUS_ASRAMA">Pengurus Asrama</option>
                            <option value="PETUGAS_SEKOLAH">Petugas Sekolah</option>
                            <option value="PETUGAS_MADIN">Petugas Madin</option>
                            <option value="PETUGAS_JAMAAH">Petugas Jamaah</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 text-zinc-500 font-mono">{u.phone || '-'}</td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleToggleUserStatus(u)}
                            className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                              u.is_active
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {u.is_active ? 'Aktif' : 'Nonaktif'}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleDeleteUser(u.id, u.full_name)}
                            className="p-1.5 text-zinc-400 hover:text-rose-600 rounded transition-colors"
                            title="Hapus Petugas"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Modal Tambah Petugas */}
          {userModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-zinc-200 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
                  <h3 className="font-bold text-base text-zinc-900">Tambah Akun Petugas Baru</h3>
                  <button
                    onClick={() => setUserModalOpen(false)}
                    className="text-zinc-400 hover:text-zinc-600 font-bold"
                  >
                    ✕
                  </button>
                </div>

                {userError && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                    {userError}
                  </div>
                )}
                {userSuccess && (
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                    {userSuccess}
                  </div>
                )}

                <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-zinc-600 font-semibold mb-1">Nama Lengkap Petugas</label>
                    <input
                      type="text"
                      value={newUser.full_name}
                      onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                      placeholder="Contoh: Ust. Abdullah"
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-600 font-semibold mb-1">Email Petugas</label>
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      placeholder="petugas@pesantren.id"
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-600 font-semibold mb-1">Role / Wewenang</label>
                    <select
                      value={newUser.role_code}
                      onChange={(e) =>
                        setNewUser({ ...newUser, role_code: e.target.value as UserRole })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-700 bg-white"
                    >
                      <option value="SUPER_ADMIN">Super Admin (Akses Penuh)</option>
                      <option value="ADMIN">Admin (Sekretariat)</option>
                      <option value="PENGURUS_ASRAMA">Pengurus Asrama</option>
                      <option value="PETUGAS_SEKOLAH">Petugas Sekolah (MTs / MA)</option>
                      <option value="PETUGAS_MADIN">Petugas Madin</option>
                      <option value="PETUGAS_JAMAAH">Petugas Jamaah Masjid</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-600 font-semibold mb-1">Nomor WhatsApp (Opsional)</label>
                    <input
                      type="text"
                      value={newUser.phone}
                      onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                      placeholder="081234567890"
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                    />
                  </div>

                  <div className="pt-3 flex items-center justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setUserModalOpen(false)}
                      className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-100 font-medium"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
                    >
                      Simpan Petugas
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-200">
            <div>
              <h2 className="text-base font-bold text-zinc-900">Audit Trail & Log Aktivitas Sistem</h2>
              <p className="text-xs text-zinc-500">
                Pencatatan real-time seluruh tindakan login, pengubahan status santri, absensi, dan perizinan.
              </p>
            </div>
            <button
              onClick={handleExportAuditCSV}
              className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition-colors shadow-xs flex items-center space-x-1.5 self-start sm:self-auto"
            >
              <Download className="w-4 h-4" />
              <span>Ekspor Log (CSV)</span>
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="w-48">
              <select
                value={auditFilterAction}
                onChange={(e) => setAuditFilterAction(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-white"
              >
                <option value="SEMUA">Semua Aksi</option>
                <option value="LOGIN">LOGIN</option>
                <option value="LOGOUT">LOGOUT</option>
                <option value="RECORD_ATTENDANCE">RECORD_ATTENDANCE</option>
                <option value="APPROVE_PERMISSION">APPROVE_PERMISSION</option>
                <option value="CHECKIN_PERMISSION">CHECKIN_PERMISSION</option>
                <option value="UPDATE_SETTINGS">UPDATE_SETTINGS</option>
                <option value="BACKUP_DATABASE">BACKUP_DATABASE</option>
                <option value="RESTORE_DATABASE">RESTORE_DATABASE</option>
              </select>
            </div>

            <div className="flex-1 min-w-[200px] relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="Cari user email atau aksi..."
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-zinc-200"
              />
            </div>
          </div>

          {auditLoading ? (
            <div className="py-12 text-center text-zinc-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-700 mb-2" />
              <span>Memuat rekam jejak audit...</span>
            </div>
          ) : (
            <div className="overflow-x-auto border border-zinc-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 text-zinc-600 font-semibold border-b border-zinc-200 uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Waktu</th>
                    <th className="py-2.5 px-3">Aksi</th>
                    <th className="py-2.5 px-3">Tabel / Target</th>
                    <th className="py-2.5 px-3">Pengguna</th>
                    <th className="py-2.5 px-3">Rincian Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-zinc-400">
                        Tidak ada catatan audit yang cocok.
                      </td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-zinc-50">
                        <td className="py-2.5 px-3 whitespace-nowrap text-zinc-500 font-mono">
                          {new Date(log.created_at).toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded font-bold bg-zinc-100 text-zinc-800 text-[11px]">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-zinc-600">{log.table_name || '-'}</td>
                        <td className="py-2.5 px-3 font-semibold text-zinc-800">{log.user_email || 'System'}</td>
                        <td className="py-2.5 px-3 font-mono text-zinc-500 max-w-sm truncate">
                          {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: BACKUP & RESTORE DATA */}
      {activeTab === 'backup' && (
        <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-xs space-y-6">
          <div className="pb-4 border-b border-zinc-200">
            <h2 className="text-base font-bold text-zinc-900">Pusat Backup & Pemulihan Data Master</h2>
            <p className="text-xs text-zinc-500">
              Menjamin keamanan data pesantren dengan ekspor snapshot JSON lengkap dan pemulihan tanpa kehilangan data.
            </p>
          </div>

          {restoreStatus.message && (
            <div
              className={`p-4 rounded-xl border flex items-start space-x-3 text-xs ${
                restoreStatus.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              {restoreStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="font-bold">
                  {restoreStatus.type === 'success' ? 'Pemulihan Berhasil' : 'Galat Pemulihan'}
                </div>
                <div className="mt-0.5">{restoreStatus.message}</div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Download Backup */}
            <div className="p-5 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-3">
              <div className="flex items-center space-x-2 text-emerald-800 font-bold text-sm">
                <Download className="w-4 h-4" />
                <span>Unduh Backup JSON Lengkap</span>
              </div>
              <p className="text-xs text-zinc-600">
                Membuat arsip JSON terenkripsi yang berisi seluruh santri, kelas, kamar, kegiatan, riwayat absensi, perizinan, dan pengaturan institusi.
              </p>
              <button
                onClick={handleDownloadBackup}
                disabled={backupLoading}
                className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors shadow-xs flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>{backupLoading ? 'Menyusun Arsip...' : 'Unduh Backup Sekarang'}</span>
              </button>
            </div>

            {/* Restore Backup */}
            <div className="p-5 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-3">
              <div className="flex items-center space-x-2 text-teal-800 font-bold text-sm">
                <Upload className="w-4 h-4" />
                <span>Pulihkan Data dari Backup JSON</span>
              </div>
              <p className="text-xs text-zinc-600">
                Pilih file backup (.json) yang pernah Anda unduh sebelumnya untuk memulihkan seluruh database sistem.
              </p>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileRestore}
                  className="hidden"
                  id="input-restore-file"
                />
                <label
                  htmlFor="input-restore-file"
                  className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>{backupLoading ? 'Memproses...' : 'Pilih File Backup JSON'}</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SUPABASE & NETLIFY */}
      {activeTab === 'koneksi' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-xs space-y-6">
            <div className="pb-4 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-zinc-900">Kesiapan GitHub, Netlify & Supabase Production</h2>
                <p className="text-xs text-zinc-500">
                  Status arsitektur database, izin akses tulis RLS, dan panduan perbaikan database jika penambahan data terkendala.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleManualWriteTest}
                  disabled={testingWrite}
                  className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors shadow-xs flex items-center space-x-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingWrite ? 'animate-spin' : ''}`} />
                  <span>{testingWrite ? 'Menguji Izin Tulis...' : 'Uji Izin Tulis (RLS)'}</span>
                </button>
              </div>
            </div>

            {/* Live Write Test Result Alert if executed */}
            {writeTestResult && (
              <div
                className={`p-4 rounded-xl border flex items-start space-x-3 text-xs ${
                  writeTestResult.allowed
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}
              >
                {writeTestResult.allowed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 space-y-1">
                  <div className="font-bold text-sm">
                    {writeTestResult.allowed
                      ? 'Izin Tulis Database Aktif (Berhasil Menulis & Menghapus)'
                      : 'Izin Tulis Database Ditolak (Error RLS Supabase)'}
                  </div>
                  <div>{writeTestResult.message}</div>
                  {!writeTestResult.allowed && (
                    <div className="pt-2">
                      <button
                        onClick={handleCopyFixSql}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-800 text-white font-bold transition-colors"
                      >
                        {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedSql ? 'Tersalin!' : 'Salin Skrip SQL Perbaikan (fix_rls.sql)'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Supabase Status */}
              <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-800">Supabase Backend</span>
                  <span
                    className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                      isSupabaseConfigured()
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {isSupabaseConfigured() ? 'Terkonfigurasi' : 'Belum Terpasang'}
                  </span>
                </div>
                <p className="text-zinc-500">
                  Menggunakan PostgreSQL Supabase. Operasi penambahan data memerlukan kebijakan RLS yang mengizinkan role anon / authenticated.
                </p>
                <div className="pt-2 font-mono text-[11px] text-zinc-700 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span>VITE_SUPABASE_URL</span>
                    <span className="text-emerald-700 font-bold font-sans">
                      {isSupabaseConfigured() ? '✓ Terpasang' : '✗ Kosong'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>VITE_SUPABASE_ANON_KEY</span>
                    <span className="text-emerald-700 font-bold font-sans">
                      {isSupabaseConfigured() ? '✓ Terpasang' : '✗ Kosong'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Netlify SPA Redirect */}
              <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-800">Netlify Deployment</span>
                  <span className="px-2 py-0.5 rounded font-bold text-[11px] bg-teal-100 text-teal-800">
                    SPA Redirect OK
                  </span>
                </div>
                <p className="text-zinc-500">
                  Berkas <code>netlify.toml</code> dan <code>public/_redirects</code> telah dikonfigurasi untuk mencegah error 404 saat pengguna melakukan refresh rute.
                </p>
                <div className="font-mono text-[11px] text-zinc-600 bg-white p-2 rounded border border-zinc-200">
                  /* /index.html 200
                </div>
              </div>
            </div>

            {/* Solusi Error Penambahan Data / RLS */}
            <div className="p-5 rounded-2xl border border-amber-300 bg-amber-50/60 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-amber-900 font-extrabold text-sm">
                    <Shield className="w-4 h-4 text-amber-700" />
                    <span>Solusi: Mengapa Penambahan Data Gagal & Cara Mengatasinya</span>
                  </div>
                  <p className="text-xs text-amber-800">
                    Secara default, PostgreSQL Supabase mengaktifkan <strong>Row-Level Security (RLS)</strong> ketat. Jika kebijakan INSERT/UPDATE/DELETE belum dibuka untuk role web, Supabase akan menolak input data baru dengan pesan <em>"new row violates row-level security policy"</em>.
                  </p>
                </div>
                <button
                  onClick={handleCopyFixSql}
                  className="shrink-0 inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition-colors"
                >
                  {copiedSql ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4 text-white" />}
                  <span>{copiedSql ? 'Skrip Tersalin!' : 'Salin fix_rls.sql'}</span>
                </button>
              </div>

              {/* Langkah Eksekusi */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs pt-1">
                <div className="p-3 bg-white rounded-xl border border-amber-200 shadow-2xs space-y-1">
                  <div className="flex items-center space-x-1.5 font-bold text-amber-900">
                    <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center text-[10px] font-black">
                      1
                    </span>
                    <span>Buka Supabase</span>
                  </div>
                  <p className="text-zinc-600 text-[11px]">
                    Masuk ke dashboard proyek Supabase Anda di browser.
                  </p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-amber-200 shadow-2xs space-y-1">
                  <div className="flex items-center space-x-1.5 font-bold text-amber-900">
                    <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center text-[10px] font-black">
                      2
                    </span>
                    <span>Pilih SQL Editor</span>
                  </div>
                  <p className="text-zinc-600 text-[11px]">
                    Klik menu <strong>SQL Editor</strong> di sidebar sebelah kiri.
                  </p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-amber-200 shadow-2xs space-y-1">
                  <div className="flex items-center space-x-1.5 font-bold text-amber-900">
                    <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center text-[10px] font-black">
                      3
                    </span>
                    <span>Tempel (Paste)</span>
                  </div>
                  <p className="text-zinc-600 text-[11px]">
                    Buat query baru (<strong>New Query</strong>) lalu paste skrip SQL perbaikan.
                  </p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-amber-200 shadow-2xs space-y-1">
                  <div className="flex items-center space-x-1.5 font-bold text-amber-900">
                    <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center text-[10px] font-black">
                      4
                    </span>
                    <span>Klik Run</span>
                  </div>
                  <p className="text-zinc-600 text-[11px]">
                    Tekan tombol <strong>Run</strong> (atau Ctrl+Enter). Semua fitur tambah data langsung normal!
                  </p>
                </div>
              </div>

              {/* View/Hide SQL Preview Toggle */}
              <div className="pt-2">
                <button
                  onClick={() => setShowSqlViewer(!showSqlViewer)}
                  className="text-xs font-bold text-amber-900 hover:text-amber-950 inline-flex items-center space-x-1 underline underline-offset-2"
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>{showSqlViewer ? 'Sembunyikan Kode SQL' : 'Lihat / Periksa Kode SQL Lengkap (fix_rls.sql)'}</span>
                </button>

                {showSqlViewer && (
                  <div className="mt-3 relative">
                    <button
                      onClick={handleCopyFixSql}
                      className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-mono flex items-center space-x-1 transition-colors border border-zinc-700"
                    >
                      {copiedSql ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSql ? 'Tersalin' : 'Salin'}</span>
                    </button>
                    <pre className="p-4 rounded-xl bg-zinc-950 text-emerald-400 font-mono text-[11px] leading-relaxed max-h-72 overflow-y-auto border border-zinc-800 select-all">
                      {FIX_RLS_SQL_STRING}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900 text-white space-y-2 text-xs">
              <div className="font-bold text-sm text-emerald-400">Perintah Eksekusi Standar:</div>
              <div className="font-mono space-y-1 text-zinc-300">
                <div>$ npm install</div>
                <div>$ npm run dev     # Menjalankan dev server port 3000</div>
                <div>$ npm run build   # Menghasilkan folder dist/ production</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
