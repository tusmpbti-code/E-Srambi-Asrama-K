/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  Camera,
  X,
  Keyboard,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Volume2,
  VolumeX,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Santri } from '../../types';
import { findSantriByBarcode, getSantriList } from '../../services/santriService';

export type ScannerMode =
  | 'LOOKUP'
  | 'ATTENDANCE'
  | 'PERMISSION_EXIT'
  | 'PERMISSION_RETURN'
  | 'EVENT_DEPARTURE'
  | 'EVENT_RETURN';

interface UnifiedBarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  mode?: ScannerMode;
  onScanSuccess: (santri: Santri, barcode: string) => void | Promise<void>;
  additionalActionContent?: React.ReactNode;
}

export const UnifiedBarcodeScanner: React.FC<UnifiedBarcodeScannerProps> = ({
  isOpen,
  onClose,
  title = 'Pemindai Barcode / QR Santri',
  mode = 'LOOKUP',
  onScanSuccess,
  additionalActionContent,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastScanned, setLastScanned] = useState<Santri | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [allSantri, setAllSantri] = useState<Santri[]>([]);
  const [cameraActive, setCameraActive] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Play audio chime using Web Audio API
  const playBeep = (type: 'success' | 'error' | 'warning') => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
        osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.1); // D6
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'warning') {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(370, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch {
      // Audio not supported or blocked
    }
  };

  useEffect(() => {
    if (isOpen) {
      getSantriList().then(setAllSantri);
      setTimeout(() => inputRef.current?.focus(), 150);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  // Hardware barcode scanner support (keystrokes ending with Enter)
  useEffect(() => {
    if (!isOpen) return;

    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // If user is typing in a different input, ignore
      if (document.activeElement && document.activeElement !== inputRef.current && document.activeElement.tagName === 'INPUT') {
        return;
      }

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 100) {
        buffer = '';
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.length > 2) {
          e.preventDefault();
          executeScan(buffer.trim());
          buffer = '';
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, allSantri]);

  const executeScan = async (barcodeToSearch: string) => {
    const term = barcodeToSearch.trim();
    if (!term) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const result = await findSantriByBarcode(term);
      if (result) {
        setLastScanned(result);
        playBeep('success');
        setSuccessMsg(`Berhasil memindai: ${result.nama} (${result.id_yys})`);
        await onScanSuccess(result, term);
        setInputVal('');
      } else {
        playBeep('error');
        setErrorMsg(`Santri dengan kode "${term}" tidak ditemukan.`);
      }
    } catch (err: unknown) {
      playBeep('error');
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memproses pemindaian');
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
      executeScan(inputVal.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-zinc-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
              <p className="text-xs text-zinc-400">
                Mendukung Scanner USB Fisik & Input Manual
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-lg transition-colors ${
                soundEnabled ? 'text-emerald-400 hover:bg-zinc-800' : 'text-zinc-500 hover:bg-zinc-800'
              }`}
              title={soundEnabled ? 'Suara Aktif' : 'Suara Mati'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewfinder simulation */}
        <div className="bg-zinc-950 p-6 flex flex-col items-center justify-center relative overflow-hidden text-center min-h-[160px]">
          <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] opacity-10" />

          {/* Scanner Target Frame */}
          <div className="w-48 h-32 border-2 border-dashed border-emerald-500/60 rounded-xl relative flex items-center justify-center p-2 mb-2">
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-400 rounded-br-lg" />

            <div className="w-full h-0.5 bg-emerald-400/80 shadow-[0_0_12px_#34d399] animate-pulse" />
          </div>

          <p className="text-xs text-emerald-400/90 font-mono tracking-wider animate-pulse flex items-center space-x-1.5">
            <Zap className="w-3.5 h-3.5" />
            <span>SIAP MENERIMA SCAN BARCODE FISIK</span>
          </p>
          <p className="text-[11px] text-zinc-400 mt-1 max-w-sm">
            Arahkan barcode scanner ke kartu santri atau ketik nomor ID / NIS di bawah.
          </p>
        </div>

        {/* Main Input Form */}
        <div className="p-5 space-y-4">
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider">
              Input Barcode / ID YYS / NIS Manual
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder="Contoh: YYS202600123 / Scan di sini..."
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-700 font-mono text-sm uppercase"
                  disabled={loading}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setInputVal('')}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 ${
                    inputVal ? 'block' : 'hidden'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <button
                type="submit"
                disabled={loading || !inputVal.trim()}
                className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center space-x-1.5 shrink-0"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>Proses</span>
              </button>
            </div>
          </form>

          {/* Messages */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="font-semibold">{successMsg}</span>
            </div>
          )}

          {/* Quick Demo Selector */}
          <div>
            <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Klik Cepat Barcode Santri (Pengujian):</span>
              <span className="text-zinc-400 font-normal">Klik untuk mensimulasikan scan</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 border border-zinc-200 rounded-lg bg-zinc-50">
              {allSantri.slice(0, 8).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => executeScan(s.id_yys)}
                  className="px-2.5 py-1 text-xs font-mono rounded bg-white hover:bg-emerald-50 border border-zinc-200 hover:border-emerald-300 text-zinc-800 transition-colors flex items-center space-x-1"
                >
                  <span className="font-bold text-emerald-800">{s.id_yys}</span>
                  <span className="text-zinc-500 max-w-[110px] truncate">({s.nama.split(' ')[0]})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Last scanned card */}
          {lastScanned && (
            <div className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/70 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center">
                  {lastScanned.nama.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-bold text-zinc-900">{lastScanned.nama}</div>
                  <div className="text-xs text-zinc-500">
                    {lastScanned.kelas?.nama_kelas || 'Kelas'} • {lastScanned.kamar?.nama_kamar || 'Kamar'}
                  </div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800">
                Terverifikasi
              </span>
            </div>
          )}

          {additionalActionContent && (
            <div className="pt-2 border-t border-zinc-200">
              {additionalActionContent}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between text-xs text-zinc-500">
          <span>Tekan Esc untuk menutup jendela pemindai</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-200 hover:bg-zinc-300 text-zinc-800 font-semibold transition-colors"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
