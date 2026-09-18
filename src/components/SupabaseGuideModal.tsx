/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Database,
  X,
  Copy,
  Check,
  ExternalLink,
  Shield,
  Layers,
  Key,
  Globe,
} from 'lucide-react';
import { isSupabaseConfigured, getSupabaseConfig } from '../lib/supabase';

interface SupabaseGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseGuideModal: React.FC<SupabaseGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'env' | 'schema' | 'netlify'>('env');

  if (!isOpen) return null;

  const configured = isSupabaseConfigured();
  const config = getSupabaseConfig();

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sampleEnvText = `# Supabase Configuration (.env)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Konfigurasi Supabase & Deployment
              </h3>
              <p className="text-[11px] text-slate-500">
                Status Koneksi Database & Panduan Setup Production
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current status banner */}
        <div
          className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${
            configured
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <div>
            <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  configured ? 'bg-emerald-600' : 'bg-amber-500'
                }`}
              />
              <span>
                {configured
                  ? 'Terhubung dengan Supabase Production'
                  : 'Mode Simulasi / Development Preview (Supabase Belum Dikonfigurasi)'}
              </span>
            </div>
            <p className="text-xs mt-1 leading-relaxed opacity-90">
              {configured
                ? `URL Supabase: ${config.url}. Aplikasi siap membaca dan menulis data ke tabel PostgreSQL Supabase.`
                : 'Aplikasi berjalan dengan storage fallback terstruktur dan data seed awal. Untuk menghubungkan ke database Supabase Anda, masukkan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.'}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('env')}
            className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
              activeTab === 'env'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            1. Environment Variables
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('schema')}
            className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
              activeTab === 'schema'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            2. SQL Schema & RLS
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('netlify')}
            className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
              activeTab === 'netlify'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            3. Netlify & GitHub
          </button>
        </div>

        {/* Tab 1: Environment Variables */}
        {activeTab === 'env' && (
          <div className="space-y-3 text-xs">
            <p className="text-slate-600 leading-relaxed">
              Tambahkan variabel berikut pada file <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">.env</code> lokal Anda atau di menu <strong>Build & deploy &gt; Environment</strong> pada dashboard Netlify:
            </p>

            <div className="relative">
              <pre className="bg-slate-900 text-slate-100 p-3.5 rounded-xl font-mono text-[11px] overflow-x-auto">
                {sampleEnvText}
              </pre>
              <button
                type="button"
                onClick={() => handleCopy(sampleEnvText)}
                className="absolute right-2 top-2 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] flex items-center gap-1 font-sans"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Tersalin' : 'Salin'}</span>
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <p className="font-semibold text-slate-800">Cara Mendapatkan Kunci Supabase:</p>
              <ol className="list-decimal list-inside space-y-1 text-slate-600">
                <li>Buka dashboard proyek Anda di <strong>supabase.com</strong>.</li>
                <li>Masuk ke menu <strong>Project Settings &gt; API</strong>.</li>
                <li>Salin <strong>Project URL</strong> dan masukkan sebagai <code className="font-mono">VITE_SUPABASE_URL</code>.</li>
                <li>Salin <strong>anon / public key</strong> dan masukkan sebagai <code className="font-mono">VITE_SUPABASE_ANON_KEY</code>.</li>
              </ol>
            </div>
          </div>
        )}

        {/* Tab 2: SQL Schema & RLS */}
        {activeTab === 'schema' && (
          <div className="space-y-3 text-xs">
            <p className="text-slate-600 leading-relaxed">
              Script DDL SQL PostgreSQL dan RLS Policies telah disiapkan di file{' '}
              <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">/supabase/schema.sql</code> dan data awal di{' '}
              <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">/supabase/seed.sql</code>.
            </p>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                <Shield className="w-4 h-4 text-purple-600" />
                <span>Tabel & Fitur Database yang Disiapkan:</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div>• <code className="font-mono">profiles</code> (Supabase Auth sync)</div>
                <div>• <code className="font-mono">roles</code> (6 Role Pesantren)</div>
                <div>• <code className="font-mono">santri</code> (ID YYS & Barcode)</div>
                <div>• <code className="font-mono">kelas</code> (MTs, MA, Madin)</div>
                <div>• <code className="font-mono">kamar</code> (Asrama Pondok)</div>
                <div>• <code className="font-mono">kegiatan</code> (Jadwal Terjadwal)</div>
                <div>• <code className="font-mono">audit_logs</code> (Trail Keamanan)</div>
                <div>• <code className="font-mono">RLS Policies</code> (Row Level Security)</div>
              </div>
            </div>

            <div className="text-[11px] text-slate-500">
              Buka <strong>Supabase SQL Editor</strong> di browser Anda, lalu jalankan script dari{' '}
              <code className="font-mono text-emerald-800">/supabase/schema.sql</code> untuk membuat seluruh tabel secara instan.
            </div>
          </div>
        )}

        {/* Tab 3: Netlify & GitHub */}
        {activeTab === 'netlify' && (
          <div className="space-y-3 text-xs">
            <p className="text-slate-600 leading-relaxed">
              Aplikasi ini 100% kompatibel dengan Netlify dan repository GitHub standar:
            </p>

            <ul className="space-y-1.5 text-slate-600 list-disc list-inside">
              <li>
                <strong>netlify.toml</strong> sudah dibuat dengan aturan SPA redirect (<code className="font-mono">/* -&gt; /index.html 200</code>) sehingga refresh halaman tetap berfungsi mulus.
              </li>
              <li>
                Build command standar: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">npm run build</code>.
              </li>
              <li>
                Publish directory: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">dist</code>.
              </li>
              <li>
                File <code className="font-mono">.gitignore</code> mengecualikan <code className="font-mono">.env</code> dan build folder agar aman dari kebocoran secret.
              </li>
            </ul>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
