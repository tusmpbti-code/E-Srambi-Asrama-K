/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  QrCode,
  Menu,
} from 'lucide-react';
import { ActiveNavMenu } from '../../types';

interface MobileBottomNavProps {
  currentMenu: ActiveNavMenu;
  onSelectMenu: (menu: ActiveNavMenu) => void;
  onOpenBarcodeModal: () => void;
  onOpenSidebar: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentMenu,
  onSelectMenu,
  onOpenBarcodeModal,
  onOpenSidebar,
}) => {
  return (
    <nav
      id="mobile-bottom-nav"
      aria-label="Navigasi Smartphone"
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-3 py-1 flex items-center justify-between shadow-[0_-4px_16px_rgba(0,0,0,0.06)] pb-[max(0.35rem,env(safe-area-inset-bottom))]"
    >
      {/* 1. Dashboard */}
      <button
        type="button"
        onClick={() => onSelectMenu('dashboard')}
        className={`flex-1 min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors ${
          currentMenu === 'dashboard'
            ? 'text-emerald-700 font-bold'
            : 'text-slate-500 hover:text-slate-800'
        }`}
        aria-label="Menu Dashboard"
      >
        <LayoutDashboard className={`w-5 h-5 ${currentMenu === 'dashboard' ? 'stroke-[2.5]' : 'stroke-2'}`} />
        <span className="text-[10px] tracking-tight">Dashboard</span>
      </button>

      {/* 2. Santri */}
      <button
        type="button"
        onClick={() => onSelectMenu('santri')}
        className={`flex-1 min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors ${
          currentMenu === 'santri'
            ? 'text-emerald-700 font-bold'
            : 'text-slate-500 hover:text-slate-800'
        }`}
        aria-label="Menu Data Santri"
      >
        <Users className={`w-5 h-5 ${currentMenu === 'santri' ? 'stroke-[2.5]' : 'stroke-2'}`} />
        <span className="text-[10px] tracking-tight">Santri</span>
      </button>

      {/* 3. Center Floating Scan Button */}
      <div className="flex-1 flex justify-center -mt-4">
        <button
          type="button"
          onClick={onOpenBarcodeModal}
          className="w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white flex flex-col items-center justify-center shadow-md shadow-emerald-600/30 border-2 border-white transition-all"
          title="Scan Barcode / QR"
          aria-label="Scan Barcode / QR Cepat"
        >
          <QrCode className="w-6 h-6 stroke-[2.2]" />
        </button>
      </div>

      {/* 4. Absensi */}
      <button
        type="button"
        onClick={() => onSelectMenu('absensi')}
        className={`flex-1 min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors ${
          currentMenu === 'absensi'
            ? 'text-emerald-700 font-bold'
            : 'text-slate-500 hover:text-slate-800'
        }`}
        aria-label="Menu Absensi"
      >
        <UserCheck className={`w-5 h-5 ${currentMenu === 'absensi' ? 'stroke-[2.5]' : 'stroke-2'}`} />
        <span className="text-[10px] tracking-tight">Absensi</span>
      </button>

      {/* 5. Menu / Lebih Banyak */}
      <button
        type="button"
        onClick={onOpenSidebar}
        className="flex-1 min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-xl text-slate-500 hover:text-slate-800 transition-colors"
        aria-label="Buka Semua Menu"
      >
        <Menu className="w-5 h-5 stroke-2" />
        <span className="text-[10px] tracking-tight">Menu</span>
      </button>
    </nav>
  );
};
