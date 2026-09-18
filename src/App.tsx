/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { SantriView } from './components/SantriView';
import { AbsensiView } from './components/AbsensiView';
import { KegiatanView } from './components/KegiatanView';
import { PerizinanView } from './components/PerizinanView';
import { KegiatanKhususView } from './components/KegiatanKhususView';
import { LaporanView } from './components/LaporanView';
import { PengaturanView } from './components/PengaturanView';
import { PlaceholderView } from './components/PlaceholderView';
import { SupabaseGuideModal } from './components/SupabaseGuideModal';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { UnifiedBarcodeScanner } from './components/common/UnifiedBarcodeScanner';
import { GlobalSearchModal } from './components/common/GlobalSearchModal';
import { SantriDetailModal } from './components/santri/SantriDetailModal';
import { LoginModal } from './components/LoginModal';
import { ActiveNavMenu, Santri } from './types';
import { canAccessMenu, ROLE_DEFINITIONS } from './lib/roles';
import { ShieldAlert, LogIn } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { user, currentRole, loading } = useAuth();

  const [currentMenu, setCurrentMenu] = useState<ActiveNavMenu>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [supabaseGuideOpen, setSupabaseGuideOpen] = useState(false);
  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [selectedSantriDetail, setSelectedSantriDetail] = useState<Santri | null>(null);

  // Global Ctrl+K listener for search
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Check if current role has permission to access selected menu
  const hasAccess = canAccessMenu(currentRole, currentMenu);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-600">
            Menyiapkan Sistem Absensi & Perizinan Santri...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onOpenSupabaseGuide={() => setSupabaseGuideOpen(true)}
        onOpenBarcodeModal={() => setBarcodeModalOpen(true)}
        onOpenSearchModal={() => setSearchModalOpen(true)}
      />

      {/* Main Body Area */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Sidebar */}
        <Sidebar
          currentMenu={currentMenu}
          onSelectMenu={(menu) => setCurrentMenu(menu)}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onOpenBarcodeModal={() => setBarcodeModalOpen(true)}
        />

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          {!user ? (
            /* Unauthenticated Banner with Login Button */
            <div className="max-w-md mx-auto my-12 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center space-y-4">
              <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto">
                <LogIn className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                Sesi Berakhir / Belum Masuk
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Silakan masuk untuk mengakses data santri, perizinan, dan modul absensi pesantren.
              </p>
              <button
                type="button"
                onClick={() => setLoginModalOpen(true)}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition-colors shadow-xs"
              >
                Buka Layar Masuk
              </button>
            </div>
          ) : !hasAccess ? (
            /* Access Denied Card based on RBAC */
            <div className="max-w-lg mx-auto my-12 bg-white p-6 rounded-2xl border border-rose-200 shadow-xs text-center space-y-3">
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Akses Menu Dibatasi</h3>
              <p className="text-xs text-slate-500">
                Role Anda saat ini (
                <span className="font-semibold text-slate-800">
                  {ROLE_DEFINITIONS[currentRole]?.displayName}
                </span>
                ) tidak memiliki izin untuk membuka menu ini.
              </p>
              <button
                type="button"
                onClick={() => setCurrentMenu('dashboard')}
                className="mt-2 inline-flex items-center px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Kembali ke Dashboard
              </button>
            </div>
          ) : (
            /* Route views */
            <>
              {currentMenu === 'dashboard' && (
                <DashboardView
                  onNavigate={(menu) => setCurrentMenu(menu)}
                  onOpenBarcodeModal={() => setBarcodeModalOpen(true)}
                  onSelectSantri={(santri) => setSelectedSantriDetail(santri)}
                />
              )}

              {currentMenu === 'santri' && (
                <SantriView onOpenBarcodeModal={() => setBarcodeModalOpen(true)} />
              )}

              {currentMenu === 'absensi' && (
                <AbsensiView />
              )}

              {currentMenu === 'kegiatan' && (
                <KegiatanView />
              )}

              {currentMenu === 'perizinan' && (
                <PerizinanView onNavigate={(menu) => setCurrentMenu(menu)} />
              )}

              {currentMenu === 'kegiatan_khusus' && (
                <KegiatanKhususView />
              )}

              {currentMenu === 'laporan' && (
                <LaporanView />
              )}

              {currentMenu === 'pengaturan' && (
                <PengaturanView />
              )}

              {currentMenu !== 'dashboard' &&
                currentMenu !== 'santri' &&
                currentMenu !== 'absensi' &&
                currentMenu !== 'kegiatan' &&
                currentMenu !== 'perizinan' &&
                currentMenu !== 'kegiatan_khusus' &&
                currentMenu !== 'laporan' &&
                currentMenu !== 'pengaturan' && (
                  <PlaceholderView
                    menu={currentMenu}
                    onBackToDashboard={() => setCurrentMenu('dashboard')}
                  />
                )}
            </>
          )}
        </main>
      </div>

      {/* Global Modals */}
      <SupabaseGuideModal
        isOpen={supabaseGuideOpen}
        onClose={() => setSupabaseGuideOpen(false)}
      />

      <UnifiedBarcodeScanner
        isOpen={barcodeModalOpen}
        onClose={() => setBarcodeModalOpen(false)}
        title="Pemindai Barcode / QR Terpadu"
        onScanSuccess={(santri) => {
          setSelectedSantriDetail(santri);
        }}
      />

      <GlobalSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onSelectSantri={(santri) => setSelectedSantriDetail(santri)}
      />

      <SantriDetailModal
        santri={selectedSantriDetail}
        isOpen={!!selectedSantriDetail}
        onClose={() => setSelectedSantriDetail(null)}
      />

      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
