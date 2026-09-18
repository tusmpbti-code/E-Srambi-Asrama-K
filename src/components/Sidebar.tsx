/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  UserCheck,
  FileCheck2,
  Sparkles,
  BarChart3,
  Settings,
  Lock,
  X,
  QrCode,
} from 'lucide-react';
import { ActiveNavMenu, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { canAccessMenu, ROLE_DEFINITIONS } from '../lib/roles';

interface SidebarProps {
  currentMenu: ActiveNavMenu;
  onSelectMenu: (menu: ActiveNavMenu) => void;
  isOpen: boolean;
  onClose: () => void;
  onOpenBarcodeModal: () => void;
}

interface NavItem {
  id: ActiveNavMenu;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isStage1Active: boolean; // Active in Stage 1 vs Placeholder for subsequent stages
  stageBadge?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentMenu,
  onSelectMenu,
  isOpen,
  onClose,
  onOpenBarcodeModal,
}) => {
  const { currentRole, profile } = useAuth();

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      isStage1Active: true,
    },
    {
      id: 'santri',
      label: 'Data Santri',
      icon: Users,
      isStage1Active: true,
    },
    {
      id: 'kegiatan',
      label: 'Kegiatan',
      icon: CalendarDays,
      isStage1Active: true,
    },
    {
      id: 'absensi',
      label: 'Absensi',
      icon: UserCheck,
      isStage1Active: true,
    },
    {
      id: 'perizinan',
      label: 'Perizinan',
      icon: FileCheck2,
      isStage1Active: true,
    },
    {
      id: 'kegiatan_khusus',
      label: 'Kegiatan Khusus',
      icon: Sparkles,
      isStage1Active: true,
    },
    {
      id: 'laporan',
      label: 'Laporan',
      icon: BarChart3,
      isStage1Active: true,
    },
    {
      id: 'pengaturan',
      label: 'Pengaturan',
      icon: Settings,
      isStage1Active: true,
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:h-[calc(100vh-4rem)] ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Mobile Header in Sidebar */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 md:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold">
              S
            </div>
            <span className="font-bold text-sm text-slate-800">MENU NAVIGASI</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            aria-label="Tutup sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Menu Utama
          </div>

          {navItems.map((item) => {
            const isSelected = currentMenu === item.id;
            const hasAccess = canAccessMenu(currentRole, item.id);
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                type="button"
                onClick={() => {
                  onSelectMenu(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-emerald-50 text-emerald-800 font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                } ${!hasAccess ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isSelected ? 'text-emerald-600' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {!hasAccess && (
                    <span title="Dibatasi untuk role ini">
                      <Lock className="w-3 h-3 text-slate-400" />
                    </span>
                  )}
                  {item.stageBadge && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                      {item.stageBadge}
                    </span>
                  )}
                  {item.isStage1Active && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  )}
                </div>
              </button>
            );
          })}
        </nav>

        {/* Quick Barcode Scanner Trigger Button in Sidebar Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/70">
          <button
            id="btn-sidebar-scanner"
            type="button"
            onClick={() => {
              onOpenBarcodeModal();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-xs transition-colors"
          >
            <QrCode className="w-4 h-4" />
            <span>Scan Barcode ID YYS</span>
          </button>
          <div className="mt-2 text-center text-[10px] text-slate-400">
            Identifier: <span className="font-mono font-semibold text-slate-600">ID YYS Santri</span>
          </div>
        </div>

        {/* Role & Session Info footer */}
        <div className="p-3 border-t border-slate-200 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
              {profile?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-800 truncate">
                {profile?.full_name || 'Petugas'}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {ROLE_DEFINITIONS[currentRole]?.displayName}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
