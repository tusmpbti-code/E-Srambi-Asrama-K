/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  QrCode,
  Search,
  X,
  CheckCircle2,
  AlertCircle,
  Camera,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { findSantriByBarcode } from '../services/santriService';
import { Santri } from '../types';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSantri?: (santri: Santri) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onSelectSantri,
}) => {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Santri | null>(null);
  const [searched, setSearched] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async (code: string) => {
    if (!code.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await findSantriByBarcode(code.trim());
      setResult(data);
    } finally {
      setLoading(false);
    }
  };

  const presetBarcodes = [
    { label: 'Farhan (Aktif)', code: 'YYS202600123' },
    { label: 'Dani (Aktif)', code: 'YYS202600124' },
    { label: 'Nabil (Aktif)', code: 'YYS202600125' },
    { label: 'Zayyan (Izin)', code: 'YYS202600126' },
    { label: 'Aisyah (Aktif)', code: 'YYS202600127' },
    { label: 'Fatimah (Sakit)', code: 'YYS202600128' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Uji Barcode Service & ID YYS
              </h3>
              <p className="text-[11px] text-slate-500">
                Layanan <code className="font-mono text-emerald-700">findSantriByBarcode()</code>
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

        {/* Info card regarding Barcode Architecture */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1 text-slate-600">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
            <Smartphone className="w-4 h-4 text-emerald-600" />
            <span>Arsitektur Barcode Santri:</span>
          </div>
          <p className="leading-relaxed">
            Barcode kartu santri yang sudah ada berisi <strong>ID YYS</strong> (contoh:{' '}
            <code className="font-mono font-bold text-emerald-800">YYS202600123</code>).
            Arsitektur mempertahankan barcode lama dan ID YYS sebagai identifier unik untuk
            pencarian data santri.
          </p>
        </div>

        {/* Input & Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch(barcodeInput);
          }}
          className="space-y-2"
        >
          <label className="text-xs font-semibold text-slate-700 block">
            Scan atau Ketik Nilai Barcode / ID YYS:
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="input-modal-barcode"
                type="text"
                autoFocus
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Scan barcode kartu atau ketik ID YYS..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 font-mono text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !barcodeInput.trim()}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shrink-0 transition-colors disabled:opacity-50"
            >
              {loading ? 'Mencari...' : 'Cari Data'}
            </button>
          </div>
        </form>

        {/* Presets buttons for fast testing */}
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
            Pilih Barcode Uji Coba:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {presetBarcodes.map((preset) => (
              <button
                key={preset.code}
                type="button"
                onClick={() => {
                  setBarcodeInput(preset.code);
                  handleSearch(preset.code);
                }}
                className="text-left p-2 rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 transition-colors"
              >
                <div className="font-mono font-bold text-[11px] text-emerald-800">
                  {preset.code}
                </div>
                <div className="text-[10px] text-slate-500 truncate">{preset.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Search Result */}
        {searched && (
          <div className="pt-2">
            {result ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-base">
                      {result.nama.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{result.nama}</h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono text-xs font-bold text-emerald-800 bg-white px-1.5 py-0.5 rounded border border-emerald-300">
                          {result.id_yys}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            result.status_santri === 'Aktif'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {result.status_santri}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 bg-white p-3 rounded-lg border border-emerald-200/60">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Kelas:</span>
                    <span className="font-medium">{result.kelas?.nama_kelas || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Kamar Asrama:</span>
                    <span className="font-medium">{result.kamar?.nama_kamar || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Jenis Kelamin:</span>
                    <span>{result.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Rayon:</span>
                    <span>{result.rayon || '-'}</span>
                  </div>
                </div>

                {onSelectSantri && (
                  <button
                    type="button"
                    onClick={() => {
                      onSelectSantri(result);
                      onClose();
                    }}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    Gunakan Santri Ini
                  </button>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                <div>
                  <p className="font-semibold">Santri Tidak Ditemukan</p>
                  <p className="text-[11px] text-rose-700 mt-0.5">
                    Tidak ditemukan data santri dengan Barcode / ID YYS: <strong>{barcodeInput}</strong>.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Camera preparation notice */}
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-100 text-slate-600 text-[11px]">
          <Camera className="w-4 h-4 text-slate-500 shrink-0" />
          <span>
            Mendukung USB Barcode Reader fisik laser dan input kode barcode/ID YYS secara langsung.
          </span>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2">
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
