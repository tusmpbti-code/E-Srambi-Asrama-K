/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  Zap,
  Volume2,
  VolumeX,
  Keyboard,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  User,
  Sparkles,
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { Santri } from '../types';
import { playSuccessChime, playWarningChime, playErrorChime } from '../lib/sound';

interface AbsensiScannerProps {
  onScanBarcode: (barcode: string) => Promise<void>;
  loading: boolean;
  fastScanMode: boolean;
  onToggleFastScan: () => void;
  lastScannedSantri: Santri | null;
  lastScanStatus: {
    type: 'success' | 'duplicate' | 'error' | 'warning';
    message: string;
    waktu?: string;
  } | null;
  onClearLastScan: () => void;
  isAllowedKegiatan: boolean;
  roleWarningMessage?: string;
}

export const AbsensiScanner: React.FC<AbsensiScannerProps> = ({
  onScanBarcode,
  loading,
  fastScanMode,
  onToggleFastScan,
  lastScannedSantri,
  lastScanStatus,
  onClearLastScan,
  isAllowedKegiatan,
  roleWarningMessage,
}) => {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [scanCooldown, setScanCooldown] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'absensi-camera-viewport';
  const lastScannedCodeRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);

  // Play audio chime based on lastScanStatus changes
  useEffect(() => {
    if (!soundEnabled || !lastScanStatus) return;
    if (lastScanStatus.type === 'success') {
      playSuccessChime();
    } else if (lastScanStatus.type === 'duplicate' || lastScanStatus.type === 'warning') {
      playWarningChime();
    } else if (lastScanStatus.type === 'error') {
      playErrorChime();
    }
  }, [lastScanStatus, soundEnabled]);

  // Handle scanned raw string with debounce
  const handleDecodedText = useCallback(
    async (decodedText: string) => {
      const cleanCode = decodedText.trim();
      if (!cleanCode) return;

      const now = Date.now();
      // Debounce: prevent same code scanning within 2.5 seconds
      if (
        cleanCode === lastScannedCodeRef.current &&
        now - lastScanTimeRef.current < 2500
      ) {
        return;
      }

      lastScannedCodeRef.current = cleanCode;
      lastScanTimeRef.current = now;

      setScanCooldown(true);
      setTimeout(() => setScanCooldown(false), 1200);

      await onScanBarcode(cleanCode);
    },
    [onScanBarcode]
  );

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            await scannerRef.current.stop();
          }
          await scannerRef.current.clear();
        } catch {
          // ignore
        }
      }

      const html5QrCode = new Html5Qrcode(scannerContainerId);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleDecodedText(decodedText);
        },
        () => {
          // parse frame error, quiet
        }
      );

      setCameraActive(true);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Kamera tidak dapat diakses atau dibatasi oleh browser.';
      setCameraError(msg);
      setCameraActive(false);
    }
  };

  // Stop Camera
  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch {
        // ignore
      }
      scannerRef.current = null;
    }
    setCameraActive(false);
  };

  // Clean up scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop();
          }
          scannerRef.current.clear();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    onScanBarcode(manualInput.trim());
    setManualInput('');
  };

  // Preset barcodes for instant 1-click test in preview
  const demoBarcodes = [
    { label: 'Farhan', code: 'YYS202600123', status: 'Aktif' },
    { label: 'Dani', code: 'YYS202600124', status: 'Aktif' },
    { label: 'Nabil', code: 'YYS202600125', status: 'Aktif' },
    { label: 'Zayyan', code: 'YYS202600126', status: 'Izin' },
    { label: 'Aisyah', code: 'YYS202600127', status: 'Aktif' },
    { label: 'Fatimah', code: 'YYS202600128', status: 'Sakit' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Top Toolbar: Mode Scan Cepat & Sound */}
      <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
              Barcode Scanner Absensi
            </h3>
            <p className="text-[11px] text-slate-500">
              Format ID YYS Santri (Kamera Smartphone & Barcode Laser)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
              soundEnabled
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}
            title={soundEnabled ? 'Suara Notifikasi Aktif' : 'Suara Dimatikan'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Suara On' : 'Mute'}</span>
          </button>

          {/* Mode Scan Cepat Toggle */}
          <button
            type="button"
            onClick={onToggleFastScan}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${
              fastScanMode
                ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${fastScanMode ? 'fill-current' : ''}`} />
            <span>Mode Scan Cepat: {fastScanMode ? 'AKTIF' : 'NONAKTIF'}</span>
          </button>
        </div>
      </div>

      {/* Permission Warning If User Role not allowed for this Kegiatan */}
      {!isAllowedKegiatan && (
        <div className="m-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
          <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <div>
            <p className="font-bold">Akses Scanner Dibatasi untuk Kegiatan Ini</p>
            <p className="text-[11px] text-rose-700 mt-0.5">
              {roleWarningMessage || 'Role Anda tidak memiliki izin mencatat absensi pada kategori kegiatan ini.'}
            </p>
          </div>
        </div>
      )}

      {/* Main Scanner Section */}
      <div className="p-4 sm:p-6 space-y-4">
        {/* Camera Viewport Container */}
        <div className="relative rounded-2xl overflow-hidden bg-slate-900 border-2 border-slate-800 flex flex-col items-center justify-center min-h-[260px] sm:min-h-[300px]">
          {/* HTML5 Camera Target */}
          <div
            id={scannerContainerId}
            className={`w-full max-w-sm ${cameraActive ? 'block' : 'hidden'}`}
          />

          {/* Fallback & Initial State Overlay */}
          {!cameraActive && (
            <div className="p-6 text-center text-slate-300 space-y-3 max-w-sm">
              <div className="w-14 h-14 rounded-2xl bg-slate-800 text-emerald-400 flex items-center justify-center mx-auto border border-slate-700">
                <Camera className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Scanner Kamera Belum Aktif</p>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Buka kamera belakang smartphone untuk memindai barcode kartu santri secara instan.
                </p>
              </div>

              {cameraError && (
                <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs text-left">
                  <p className="font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Akses Kamera:
                  </p>
                  <p className="text-[11px] mt-0.5 opacity-90">{cameraError}</p>
                </div>
              )}

              <button
                type="button"
                disabled={!isAllowedKegiatan}
                onClick={startCamera}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                Aktifkan Kamera Live
              </button>
            </div>
          )}

          {/* Live Scanner Active Bar */}
          {cameraActive && (
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
              <div className="bg-emerald-600/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-full backdrop-blur-xs flex items-center gap-1.5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                <span>Kamera Aktif & Menunggu Barcode...</span>
              </div>
              <button
                type="button"
                onClick={stopCamera}
                className="pointer-events-auto bg-slate-900/80 hover:bg-slate-900 text-white p-1.5 rounded-xl text-xs font-semibold backdrop-blur-xs border border-white/20 transition-colors"
                title="Tutup Kamera"
              >
                <CameraOff className="w-4 h-4 text-rose-400" />
              </button>
            </div>
          )}

          {/* Scan Line Animation in active mode */}
          {cameraActive && (
            <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-emerald-400 shadow-[0_0_12px_#34d399] animate-pulse pointer-events-none" />
          )}

          {/* Scan Cooldown Visual Overlay */}
          {scanCooldown && (
            <div className="absolute inset-0 bg-emerald-500/20 backdrop-blur-xs flex items-center justify-center transition-opacity">
              <div className="bg-slate-900/90 text-emerald-400 font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-2 border border-emerald-500/40 shadow-xl">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Barcode Terbaca! Memproses...</span>
              </div>
            </div>
          )}
        </div>

        {/* Scan Status Banner / Feedback */}
        {lastScanStatus && (
          <div
            className={`p-4 rounded-xl border transition-all ${
              lastScanStatus.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : lastScanStatus.type === 'duplicate'
                ? 'bg-amber-50 border-amber-300 text-amber-950'
                : lastScanStatus.type === 'warning'
                ? 'bg-cyan-50 border-cyan-300 text-cyan-950'
                : 'bg-rose-50 border-rose-300 text-rose-950'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                {lastScanStatus.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : lastScanStatus.type === 'duplicate' ? (
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                ) : lastScanStatus.type === 'warning' ? (
                  <HelpCircle className="w-5 h-5 text-cyan-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="font-bold text-xs sm:text-sm leading-snug">
                    {lastScanStatus.message}
                  </h4>
                  {lastScanStatus.waktu && (
                    <p className="text-[11px] opacity-80 mt-0.5">
                      Waktu Absen: <strong>{lastScanStatus.waktu} WIB</strong>
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onClearLastScan}
                className="text-xs font-semibold opacity-60 hover:opacity-100 p-1"
                title="Tutup Notifikasi"
              >
                ✕
              </button>
            </div>

            {/* Scanned Santri Profile Snippet */}
            {lastScannedSantri && (
              <div className="mt-3 pt-3 border-t border-black/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white shadow-xs flex items-center justify-center font-bold text-slate-800 text-xs">
                    {lastScannedSantri.nama.charAt(0)}
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block">
                      {lastScannedSantri.nama}
                    </span>
                    <span className="font-mono text-[11px] text-slate-600">
                      {lastScannedSantri.id_yys}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="px-2 py-0.5 rounded-md bg-white border border-black/10 font-medium">
                    {lastScannedSantri.kelas?.nama_kelas || 'Kelas -'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-white border border-black/10 font-medium">
                    {lastScannedSantri.kamar?.nama_kamar || 'Kamar -'}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold ${
                      lastScannedSantri.status_santri === 'Aktif'
                        ? 'bg-emerald-200 text-emerald-900'
                        : 'bg-amber-200 text-amber-900'
                    }`}
                  >
                    {lastScannedSantri.status_santri}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Input Barcode Manual & Laser Scanner Support */}
        <form onSubmit={handleManualSubmit} className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span className="flex items-center gap-1.5">
              <Keyboard className="w-3.5 h-3.5 text-emerald-600" />
              <span>Input Manual / Scanner Laser USB & Bluetooth:</span>
            </span>
            <span className="text-[11px] text-slate-400 font-normal">
              Tekan Enter untuk memproses
            </span>
          </div>
          <div className="flex gap-2">
            <input
              id="input-barcode-absensi-scanner"
              type="text"
              disabled={!isAllowedKegiatan || loading}
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Arahkan barcode laser atau ketik ID YYS (contoh: YYS202600123)..."
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white transition-colors"
            />
            <button
              type="submit"
              disabled={!manualInput.trim() || !isAllowedKegiatan || loading}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shrink-0 transition-colors disabled:opacity-50"
            >
              {loading ? 'Memproses...' : 'Scan / Catat'}
            </button>
          </div>
        </form>

        {/* Demo Fast Preset Barcode Buttons */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              <span>Barcode Uji Coba Cepat (Klik untuk Simulasi Scan):</span>
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5">
            {demoBarcodes.map((item) => (
              <button
                key={item.code}
                type="button"
                disabled={!isAllowedKegiatan || loading}
                onClick={() => onScanBarcode(item.code)}
                className="text-left p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 transition-all text-xs disabled:opacity-50"
              >
                <div className="font-bold text-slate-800 text-[11px] truncate">
                  {item.label}
                </div>
                <div className="font-mono text-[10px] text-emerald-800 font-semibold truncate">
                  {item.code}
                </div>
                <div className="text-[9px] text-slate-400 mt-0.5">
                  Status: <span className="font-medium text-slate-600">{item.status}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
