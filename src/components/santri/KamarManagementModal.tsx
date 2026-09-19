/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  Building,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  DoorOpen,
  RefreshCw,
  Sparkles,
  Info,
} from 'lucide-react';
import { Kamar, Santri } from '../../types';
import { createKamar, deleteKamar } from '../../services/santriService';
import { useAuth } from '../../context/AuthContext';

interface KamarManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  kamarList: Kamar[];
  santriList: Santri[];
  onKamarUpdated: () => Promise<void>;
}

export const KamarManagementModal: React.FC<KamarManagementModalProps> = ({
  isOpen,
  onClose,
  kamarList,
  santriList,
  onKamarUpdated,
}) => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<'ALL' | 'L' | 'P'>('ALL');

  // Form State
  const [namaKamar, setNamaKamar] = useState('');
  const [gedung, setGedung] = useState('Gedung Asrama Putra');
  const [kapasitas, setKapasitas] = useState(8);
  const [jenisKelamin, setJenisKelamin] = useState<'L' | 'P'>('L');
  const [keterangan, setKeterangan] = useState('');

  // UI States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Count santri in each kamar
  const occupancyMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const santri of santriList) {
      if (santri.kamar_id) {
        map[santri.kamar_id] = (map[santri.kamar_id] || 0) + 1;
      }
    }
    return map;
  }, [santriList]);

  // Filtered kamar list
  const filteredKamar = useMemo(() => {
    return kamarList.filter((k) => {
      const matchSearch =
        k.nama_kamar.toLowerCase().includes(searchQuery.toLowerCase()) ||
        k.gedung.toLowerCase().includes(searchQuery.toLowerCase());
      const matchGender =
        genderFilter === 'ALL' ||
        !k.jenis_kelamin ||
        k.jenis_kelamin === genderFilter;
      return matchSearch && matchGender;
    });
  }, [kamarList, searchQuery, genderFilter]);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaKamar.trim()) {
      setFeedback({ type: 'error', message: 'Nama kamar wajib diisi.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await createKamar(
        {
          nama_kamar: namaKamar.trim(),
          gedung: gedung.trim() || 'Gedung Asrama',
          kapasitas: Number(kapasitas) || 8,
          jenis_kelamin: jenisKelamin,
          keterangan: keterangan.trim() || null,
        },
        profile?.email
      );

      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Kamar '${res.data?.nama_kamar || namaKamar}' berhasil ditambahkan ke database!`,
        });
        setNamaKamar('');
        setKeterangan('');
        await onKamarUpdated();
        setActiveTab('list');
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Gagal menambahkan kamar baru.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Terjadi kesalahan sistem saat menyimpan kamar.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (kamar: Kamar) => {
    const occupantCount = occupancyMap[kamar.id] || 0;
    if (occupantCount > 0) {
      const confirmForce = window.confirm(
        `Kamar '${kamar.nama_kamar}' saat ini dihuni oleh ${occupantCount} santri aktif.\n\nApakah Anda yakin ingin tetap menghapus kamar ini? Santri yang bersangkutan akan berstatus tanpa kamar.`
      );
      if (!confirmForce) return;
    } else {
      if (!window.confirm(`Hapus kamar '${kamar.nama_kamar}'?`)) return;
    }

    setDeletingId(kamar.id);
    setFeedback(null);

    try {
      const res = await deleteKamar(kamar.id, profile?.email);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Kamar '${kamar.nama_kamar}' berhasil dihapus.`,
        });
        await onKamarUpdated();
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Gagal menghapus kamar.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Terjadi kesalahan saat menghapus kamar.',
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-600 to-amber-700 text-white flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white">
              <DoorOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Manajemen Kamar Asrama</h3>
              <p className="text-xs text-amber-100">
                Tambah kamar baru atau kelola alokasi kamar santri pondok
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-50 gap-4 pt-3">
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`pb-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'list'
                ? 'border-amber-600 text-amber-800'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Daftar Kamar ({kamarList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('add')}
            className={`pb-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'add'
                ? 'border-amber-600 text-amber-800'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Kamar Baru</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mx-6 mt-4 p-3 rounded-xl text-xs flex items-center justify-between ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-slate-600 ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6">
          {activeTab === 'add' ? (
            /* FORM TAMBAH KAMAR BARU */
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Format Penulisan Bebas & Otomatis Terhubung</p>
                  <p className="text-amber-800 text-[11px] mt-0.5">
                    Anda dapat memberi nama seperti <strong>"A-01"</strong>, <strong>"Kamar Abu Bakar 01"</strong>, atau <strong>"Kamar 10"</strong>. Sistem pencocokan cerdas akan mengenali variasi penulisan saat Anda mengunggah berkas santri.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Kamar <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={namaKamar}
                    onChange={(e) => setNamaKamar(e.target.value)}
                    placeholder="Contoh: Kamar A-01, Abu Bakar 01, atau Blok B-12"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Gedung / Kompleks Asrama <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={gedung}
                    onChange={(e) => setGedung(e.target.value)}
                    placeholder="Contoh: Gedung Asrama Putra, Gedung Ali Lantai 2"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Peruntukan Penghuni <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={jenisKelamin}
                    onChange={(e) => setJenisKelamin(e.target.value as 'L' | 'P')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  >
                    <option value="L">Putra (Ikhwan / L)</option>
                    <option value="P">Putri (Akhwat / P)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kapasitas Santri (Kasur/Tempat)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={kapasitas}
                    onChange={(e) => setKapasitas(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Keterangan Tambahan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={keterangan}
                    onChange={(e) => setKeterangan(e.target.value)}
                    placeholder="Contoh: Dekat tangga utama / Lantai dasar"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Simpan Kamar Baru</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* LIST DAFTAR KAMAR */
            <div className="space-y-3.5">
              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama kamar atau gedung..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setGenderFilter('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      genderFilter === 'ALL'
                        ? 'bg-slate-800 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => setGenderFilter('L')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      genderFilter === 'L'
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                    }`}
                  >
                    Putra (L)
                  </button>
                  <button
                    type="button"
                    onClick={() => setGenderFilter('P')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      genderFilter === 'P'
                        ? 'bg-rose-600 text-white'
                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                    }`}
                  >
                    Putri (P)
                  </button>
                </div>
              </div>

              {/* Table / Grid */}
              <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                {filteredKamar.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    <DoorOpen className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">Belum ada kamar yang cocok</p>
                    <p className="text-[11px] mt-1 text-slate-400">
                      Klik tab "+ Tambah Kamar Baru" untuk mendaftarkan kamar asrama baru.
                    </p>
                  </div>
                ) : (
                  filteredKamar.map((kamar) => {
                    const occupants = occupancyMap[kamar.id] || 0;
                    const percent = Math.min(100, Math.round((occupants / (kamar.kapasitas || 8)) * 100));

                    return (
                      <div
                        key={kamar.id}
                        className="p-3.5 hover:bg-slate-50 flex items-center justify-between gap-3 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900">
                              {kamar.nama_kamar}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                kamar.jenis_kelamin === 'P'
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {kamar.jenis_kelamin === 'P' ? 'Putri' : 'Putra'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                            <span className="flex items-center gap-1">
                              <Building className="w-3 h-3 text-slate-400" />
                              {kamar.gedung}
                            </span>
                            {kamar.keterangan && (
                              <span className="text-slate-400 text-[10px]">
                                • {kamar.keterangan}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Occupancy Progress */}
                        <div className="text-right shrink-0 w-32">
                          <div className="flex items-center justify-end gap-1.5 text-xs font-semibold text-slate-700">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {occupants} / {kamar.kapasitas || 8} Santri
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                percent >= 100
                                  ? 'bg-rose-500'
                                  : percent >= 75
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>

                        {/* Delete Button */}
                        <button
                          type="button"
                          disabled={deletingId === kamar.id}
                          onClick={() => handleDelete(kamar)}
                          title="Hapus kamar ini"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                        >
                          {deletingId === kamar.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin text-rose-500" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bottom quick stats */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Total: <strong>{kamarList.length} Kamar</strong> terdaftar di sistem
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('add')}
                  className="text-amber-700 hover:text-amber-800 font-bold hover:underline"
                >
                  + Tambah Kamar Lainnya
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
