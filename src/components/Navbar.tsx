/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Shield,
  User,
  LogOut,
  Database,
  Menu,
  X,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Search,
  QrCode,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROLE_DEFINITIONS, getRoleBadgeClass } from '../lib/roles';
import { UserRole } from '../types';

interface NavbarProps {
  onToggleSidebar: () => void;
  onOpenSupabaseGuide: () => void;
  onOpenBarcodeModal: () => void;
  onOpenSearchModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  onOpenSupabaseGuide,
  onOpenBarcodeModal,
  onOpenSearchModal,
}) => {
  const { profile, currentRole, logout, switchSimulatedRole, isConfigured } = useAuth();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const roleList: UserRole[] = [
    'SUPER_ADMIN',
    'ADMIN',
    'PENGURUS_ASRAMA',
    'PETUGAS_SEKOLAH',
    'PETUGAS_MADIN',
    'PETUGAS_JAMAAH',
  ];

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Mobile Menu Toggle & App Logo/Title */}
        <div className="flex items-center gap-3">
          <button
            id="btn-toggle-sidebar"
            type="button"
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-hidden"
            aria-label="Toggle menu navigasi"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs font-bold text-lg">
              S
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                ABSENSI & PERIZINAN SANTRI
              </h1>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Sistem Terpadu • Siap Produksi</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Search, Barcode Quick Tool, Role Switcher, Database Status, User Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Global Search Button */}
          {onOpenSearchModal && (
            <button
              id="btn-global-search"
              type="button"
              onClick={onOpenSearchModal}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors border border-zinc-200"
              title="Cari santri cepat (Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5 text-zinc-500" />
              <span className="hidden sm:inline">Cari Santri...</span>
              <kbd className="hidden md:inline-block px-1.5 py-0.2 text-[10px] font-mono text-zinc-500 bg-white rounded border border-zinc-300">
                Ctrl+K
              </kbd>
            </button>
          )}

          {/* Quick Barcode Check Button */}
          <button
            id="btn-quick-barcode"
            type="button"
            onClick={onOpenBarcodeModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-colors border border-emerald-200"
            title="Buka Pemindai Barcode Terpadu"
          >
            <QrCode className="w-3.5 h-3.5 text-emerald-700" />
            <span className="hidden sm:inline">Scan Barcode</span>
          </button>

          {/* Supabase Status Pill */}
          <button
            id="btn-supabase-status"
            type="button"
            onClick={onOpenSupabaseGuide}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
              isConfigured
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
            }`}
            title="Klik untuk panduan setup database Supabase"
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden md:inline">
              {isConfigured ? 'Supabase Connected' : 'Supabase (Demo/Setup)'}
            </span>
            <HelpCircle className="w-3 h-3 text-slate-400" />
          </button>

          {/* Role Switcher Dropdown */}
          <div className="relative">
            <button
              id="btn-role-dropdown"
              type="button"
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border transition-all ${getRoleBadgeClass(
                currentRole
              )}`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="max-w-[110px] sm:max-w-[140px] truncate">
                {ROLE_DEFINITIONS[currentRole]?.displayName || currentRole}
              </span>
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>

            {roleMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setRoleMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white shadow-xl border border-slate-200 py-2 z-50">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-800">
                      Simulasi Hak Akses (Role Testing)
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Uji batasan permission untuk setiap role sesuai spesifikasi
                    </p>
                  </div>

                  <div className="p-1 max-h-72 overflow-y-auto">
                    {roleList.map((role) => {
                      const isSelected = role === currentRole;
                      const roleDef = ROLE_DEFINITIONS[role];
                      return (
                        <button
                          key={role}
                          id={`role-opt-${role.toLowerCase()}`}
                          type="button"
                          onClick={() => {
                            switchSimulatedRole(role);
                            setRoleMenuOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-start justify-between ${
                            isSelected
                              ? 'bg-slate-100 text-slate-900 font-semibold'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  isSelected ? 'bg-emerald-600' : 'bg-slate-300'
                                }`}
                              />
                              <span>{roleDef.displayName}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-normal line-clamp-1">
                              {roleDef.description}
                            </p>
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User Profile & Logout */}
          <div className="hidden sm:flex items-center gap-2 border-l border-slate-200 pl-2">
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-800 leading-none truncate max-w-[120px]">
                {profile?.full_name || 'Petugas'}
              </p>
              <p className="text-[10px] text-slate-400 truncate max-w-[120px]">
                {profile?.email}
              </p>
            </div>
            <button
              id="btn-logout"
              type="button"
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Logout / Keluar"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
