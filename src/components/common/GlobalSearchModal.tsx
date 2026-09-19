/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  User,
  ArrowRight,
  Sparkles,
  QrCode,
  Building,
  GraduationCap,
  MapPin,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { Santri, getSantriKamarText, getSantriMadinText } from '../../types';
import { getSantriList } from '../../services/santriService';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSantri: (santri: Santri) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectSantri,
}) => {
  const [query, setQuery] = useState('');
  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [results, setResults] = useState<Santri[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      getSantriList().then(setSantriList);
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  // Global keydown shortcut Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        // Toggle or open search
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      setResults([]);
      return;
    }

    // Prioritize exact or prefix ID YYS and Barcode match
    const filtered = santriList.filter((s) => {
      const matchYys = s.id_yys?.toLowerCase().includes(q);
      const matchBarcode = s.barcode_value?.toLowerCase().includes(q);
      const matchNama = s.nama?.toLowerCase().includes(q);
      const matchNis = s.nis?.toLowerCase().includes(q);
      const matchKelas = s.kelas?.nama_kelas?.toLowerCase().includes(q);
      const matchKamar = getSantriKamarText(s).toLowerCase().includes(q);
      const matchMadin = getSantriMadinText(s).toLowerCase().includes(q);

      return matchYys || matchBarcode || matchNama || matchNis || matchKelas || matchKamar || matchMadin;
    });

    // Sort by relevance (exact ID match comes first)
    filtered.sort((a, b) => {
      const aExact = a.id_yys.toLowerCase() === q || a.barcode_value?.toLowerCase() === q;
      const bExact = b.id_yys.toLowerCase() === q || b.barcode_value?.toLowerCase() === q;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      const aStart = a.nama.toLowerCase().startsWith(q) || a.id_yys.toLowerCase().startsWith(q);
      const bStart = b.nama.toLowerCase().startsWith(q) || b.id_yys.toLowerCase().startsWith(q);
      if (aStart && !bStart) return -1;
      if (!aStart && bStart) return 1;

      return a.nama.localeCompare(b.nama);
    });

    setResults(filtered.slice(0, 10));
  }, [query, santriList]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-3 sm:px-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-zinc-200 flex items-center space-x-3 bg-zinc-50">
          <Search className="w-5 h-5 text-emerald-700 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari santri: ID YYS, Barcode, Nama, NIS, Kelas, Kamar..."
            className="w-full bg-transparent text-sm sm:text-base text-zinc-900 placeholder-zinc-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[11px] font-mono text-zinc-400 bg-zinc-200/80 rounded border border-zinc-300">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="p-2 overflow-y-auto flex-1 divide-y divide-zinc-100">
          {!query ? (
            <div className="py-12 text-center text-zinc-400">
              <QrCode className="w-10 h-10 mx-auto text-zinc-300 mb-2" />
              <p className="text-sm font-medium text-zinc-600">Pencarian Santri Cepat Global</p>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                Ketik nomor barcode, ID pondok (YYS...), nama santri, atau nama kelas untuk melihat profil & riwayat lengkap.
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="py-10 text-center text-zinc-500">
              <p className="text-sm">Tidak ditemukan santri dengan kata kunci &quot;{query}&quot;</p>
            </div>
          ) : (
            results.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  onSelectSantri(s);
                  onClose();
                }}
                className="w-full text-left p-3 hover:bg-emerald-50/70 rounded-xl transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0">
                    {s.nama.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-zinc-900 group-hover:text-emerald-800">
                        {s.nama}
                      </span>
                      <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 font-semibold">
                        {s.id_yys}
                      </span>
                      {s.nis && <span className="text-xs text-zinc-400">NIS: {s.nis}</span>}
                    </div>
                    <div className="text-xs text-zinc-500 flex items-center space-x-3 mt-0.5">
                      <span>{s.kelas?.nama_kelas || 'Kelas -'}</span>
                      <span>•</span>
                      <span>{getSantriKamarText(s) ? `Kamar ${getSantriKamarText(s)}` : 'Kamar -'}</span>
                      <span>•</span>
                      <span>Kelas Madin: {getSantriMadinText(s) || '-'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      s.status_santri === 'Aktif'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {s.status_santri}
                  </span>
                  <ArrowRight className="w-4 h-4 text-zinc-300 group-hover:text-emerald-700 transition-colors" />
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-zinc-50 border-t border-zinc-200 text-xs text-zinc-500 flex items-center justify-between">
          <span>{results.length > 0 ? `${results.length} santri ditemukan` : 'Prioritas pencarian: ID YYS & Barcode'}</span>
          <span>Klik santri untuk membuka riwayat terpadu</span>
        </div>
      </div>
    </div>
  );
};
