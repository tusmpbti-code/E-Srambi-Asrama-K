/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LogIn, Key, Mail, AlertCircle, Shield, Sparkles, Eye, EyeOff, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { ROLE_DEFINITIONS } from '../lib/roles';

interface LoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { login, isConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Email wajib diisi.');
      return;
    }
    if (isConfigured && !password) {
      setError('Password wajib diisi untuk Supabase Auth.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { error: loginErr } = await login(email, password);
      if (loginErr) {
        setError(loginErr);
      } else if (onClose) {
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  const quickRoles: { role: UserRole; email: string; label: string }[] = [
    { role: 'SUPER_ADMIN', email: 'superadmin@pesantren.id', label: 'Super Admin' },
    { role: 'ADMIN', email: 'admin.sekretariat@pesantren.id', label: 'Admin Sekretariat' },
    { role: 'PENGURUS_ASRAMA', email: 'pengurus.asrama@pesantren.id', label: 'Pengurus Asrama' },
    { role: 'PETUGAS_PERIZINAN', email: 'petugas.perizinan@pesantren.id', label: 'Petugas Perizinan' },
    { role: 'PETUGAS_SEKOLAH', email: 'petugas.sekolah@pesantren.id', label: 'Petugas Sekolah' },
    { role: 'PETUGAS_MADIN', email: 'petugas.madin@pesantren.id', label: 'Petugas Madin' },
    { role: 'PETUGAS_JAMAAH', email: 'petugas.jamaah@pesantren.id', label: 'Petugas Jamaah' },
  ];

  const handleQuickLogin = async (userEmail: string) => {
    setEmail(userEmail);
    setPassword('password123');
    setLoading(true);
    setError(null);
    try {
      const { error: loginErr } = await login(userEmail, 'password123');
      if (loginErr) {
        setError(loginErr);
      } else if (onClose) {
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto mb-3 shadow-xs">
            <LogIn className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-lg text-slate-900">
            Masuk Sistem Absensi & Perizinan
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Autentikasi terintegrasi dengan Supabase Auth & Role-Based Access Control (RBAC)
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Email Petugas / Staf
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="input-login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@pesantren.id"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-700 block">Password</label>
              <span className="text-[10px] text-slate-400">
                {password ? `${password.length} karakter` : 'Wajib diisi'}
              </span>
            </div>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="input-login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ketik password akun Anda di sini..."
                className="w-full pl-9 pr-10 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            id="btn-submit-login"
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs transition-colors disabled:opacity-50 shadow-xs"
          >
            {loading ? 'Memproses...' : 'Masuk Sekarang'}
          </button>

          <div className="p-2.5 rounded-xl bg-teal-50/70 border border-teal-200 text-teal-900 text-[11px] flex items-start gap-2">
            <Info className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Pengguna Baru:</strong> Masukkan email & password yang telah didaftarkan di Supabase Auth, lalu klik <strong>Masuk Sekarang</strong>.
            </p>
          </div>
        </form>

        {/* Quick Demo Login Preset Buttons */}
        <div className="pt-3 border-t border-slate-100">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2 text-center">
            Pilih Role Cepat untuk Uji Coba:
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {quickRoles.map((item) => (
              <button
                key={item.role}
                type="button"
                onClick={() => handleQuickLogin(item.email)}
                className="text-left px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 transition-colors text-[11px]"
              >
                <div className="font-semibold text-slate-800">{item.label}</div>
                <div className="text-[9px] text-slate-400 truncate">{item.email}</div>
              </button>
            ))}
          </div>
        </div>

        {onClose && (
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Batal
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
