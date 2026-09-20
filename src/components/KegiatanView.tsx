/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Clock,
  MapPin,
  Plus,
  Search,
  CheckCircle2,
  Calendar,
  X,
  BookOpen,
  Church,
  Home,
  Sparkles,
  Edit2,
  Trash2,
  AlertTriangle,
  Power,
} from 'lucide-react';
import { Kegiatan, KegiatanKategori } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  getKegiatanList,
  createKegiatan,
  updateKegiatan,
  deleteKegiatan,
  toggleKegiatanStatus,
} from '../services/santriService';

export const KegiatanView: React.FC = () => {
  const { currentRole, profile } = useAuth();
  const [kegiatans, setKegiatans] = useState<Kegiatan[]>([]);
  const [loading, setLoading] = useState(true);
  const [kategoriFilter, setKategoriFilter] = useState<string>('SEMUA');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Create
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    nama_kegiatan: '',
    kategori: 'Sekolah' as KegiatanKategori,
    waktu_mulai: '07:00:00',
    waktu_selesai: '12:00:00',
    lokasi: '',
    deskripsi: '',
    hari_berlaku: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
    is_active: true,
  });

  // Modal Edit
  const [editingKegiatan, setEditingKegiatan] = useState<Kegiatan | null>(null);
  const [editFormData, setEditFormData] = useState({
    nama_kegiatan: '',
    kategori: 'Sekolah' as KegiatanKategori,
    waktu_mulai: '07:00:00',
    waktu_selesai: '12:00:00',
    lokasi: '',
    deskripsi: '',
    is_active: true,
  });

  // Modal Delete
  const [deletingKegiatan, setDeletingKegiatan] = useState<Kegiatan | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [notif, setNotif] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const canManage = currentRole === 'SUPER_ADMIN' || currentRole === 'ADMIN';

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getKegiatanList();
      setKegiatans(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama_kegiatan.trim()) return;
    setSubmitting(true);
    try {
      const res = await createKegiatan(formData, profile?.email || currentRole);
      if (res.success) {
        setNotif({
          type: 'success',
          message: `Kegiatan "${formData.nama_kegiatan}" berhasil ditambahkan!`,
        });
        setShowCreateModal(false);
        setFormData({
          nama_kegiatan: '',
          kategori: 'Sekolah',
          waktu_mulai: '07:00:00',
          waktu_selesai: '12:00:00',
          lokasi: '',
          deskripsi: '',
          hari_berlaku: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
          is_active: true,
        });
        await loadData();
      } else {
        setNotif({ type: 'error', message: res.error || 'Gagal menambahkan kegiatan.' });
      }
    } finally {
      setSubmitting(false);
      setTimeout(() => setNotif(null), 3500);
    }
  };

  const startEdit = (k: Kegiatan) => {
    setEditingKegiatan(k);
    setEditFormData({
      nama_kegiatan: k.nama_kegiatan,
      kategori: k.kategori,
      waktu_mulai: k.waktu_mulai,
      waktu_selesai: k.waktu_selesai,
      lokasi: k.lokasi || '',
      deskripsi: k.deskripsi || '',
      is_active: k.is_active ?? true,
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingKegiatan || !editFormData.nama_kegiatan.trim()) return;
    setSubmitting(true);
    try {
      const res = await updateKegiatan(
        editingKegiatan.id,
        editFormData,
        profile?.email || currentRole
      );
      if (res.success) {
        setNotif({
          type: 'success',
          message: `Kegiatan "${editFormData.nama_kegiatan}" berhasil diperbarui!`,
        });
        setEditingKegiatan(null);
        await loadData();
      } else {
        setNotif({ type: 'error', message: res.error || 'Gagal memperbarui kegiatan.' });
      }
    } finally {
      setSubmitting(false);
      setTimeout(() => setNotif(null), 3500);
    }
  };

  const handleDelete = async () => {
    if (!deletingKegiatan) return;
    setSubmitting(true);
    try {
      const res = await deleteKegiatan(deletingKegiatan.id, profile?.email || currentRole);
      if (res.success) {
        setNotif({
          type: 'success',
          message: `Kegiatan "${deletingKegiatan.nama_kegiatan}" berhasil dihapus!`,
        });
        setDeletingKegiatan(null);
        await loadData();
      } else {
        setNotif({ type: 'error', message: res.error || 'Gagal menghapus kegiatan.' });
      }
    } finally {
      setSubmitting(false);
      setTimeout(() => setNotif(null), 3500);
    }
  };

  const handleToggleStatus = async (k: Kegiatan) => {
    const nextStatus = !k.is_active;
    const res = await toggleKegiatanStatus(k.id, nextStatus, profile?.email || currentRole);
    if (res.success) {
      setKegiatans((prev) =>
        prev.map((item) => (item.id === k.id ? { ...item, is_active: nextStatus } : item))
      );
      setNotif({
        type: 'success',
        message: `Status kegiatan "${k.nama_kegiatan}" diubah menjadi ${
          nextStatus ? 'Aktif' : 'Nonaktif'
        }.`,
      });
      setTimeout(() => setNotif(null), 3000);
    }
  };

  const filteredKegiatan = kegiatans.filter((k) => {
    const matchKat = kategoriFilter === 'SEMUA' || k.kategori === kategoriFilter;
    const matchQuery =
      !searchQuery ||
      k.nama_kegiatan.toLowerCase().includes(searchQuery.toLowerCase()) ||
      k.lokasi?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchKat && matchQuery;
  });

  const getKategoriBadge = (kat: KegiatanKategori) => {
    switch (kat) {
      case 'Sekolah':
        return {
          color: 'bg-blue-50 text-blue-700 border-blue-200',
          icon: BookOpen,
        };
      case 'Madin':
        return {
          color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: Church,
        };
      case 'Jamaah':
        return {
          color: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: Church,
        };
      case 'Asrama':
        return {
          color: 'bg-purple-50 text-purple-700 border-purple-200',
          icon: Home,
        };
      default:
        return {
          color: 'bg-slate-50 text-slate-700 border-slate-200',
          icon: Calendar,
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notif && (
        <div
          className={`fixed bottom-6 right-6 z-50 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-xs sm:text-sm font-semibold transition-all ${
            notif.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
          }`}
        >
          {notif.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-200 shrink-0" />
          )}
          <span>{notif.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-700 font-semibold text-xs mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Master Jadwal & Agenda Pondok</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Jadwal Kegiatan Harian Santri
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl">
            Daftar kegiatan wajib dan sunnah terpadu untuk Sekolah Formal, Madin, dan Shalat Berjamaah.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Kegiatan Baru</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {['SEMUA', 'Sekolah', 'Madin', 'Jamaah', 'Asrama', 'Khusus'].map((kat) => (
            <button
              key={kat}
              type="button"
              onClick={() => setKategoriFilter(kat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                kategoriFilter === kat
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {kat === 'SEMUA' ? 'Semua Kategori' : kat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kegiatan / lokasi..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-slate-50 focus:bg-white"
          />
        </div>
      </div>

      {/* Grid of Kegiatan Cards */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">
          Memuat daftar kegiatan...
        </div>
      ) : filteredKegiatan.length === 0 ? (
        <div className="p-12 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">
          Tidak ada kegiatan yang cocok dengan filter atau pencarian.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredKegiatan.map((k) => {
            const badge = getKategoriBadge(k.kategori);
            const Icon = badge.icon;
            return (
              <div
                key={k.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:border-emerald-300 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${badge.color}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{k.kategori}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => canManage && handleToggleStatus(k)}
                      disabled={!canManage}
                      title={canManage ? 'Klik untuk mengubah status aktif/nonaktif' : undefined}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                        k.is_active
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {k.is_active ? 'Aktif' : 'Nonaktif'}
                    </button>
                  </div>

                  <h3 className="font-bold text-slate-900 text-base leading-snug">
                    {k.nama_kegiatan}
                  </h3>

                  {k.deskripsi && (
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                      {k.deskripsi}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="space-y-1.5 text-xs text-slate-600 min-w-0">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono font-semibold">
                        {k.waktu_mulai.substring(0, 5)} - {k.waktu_selesai.substring(0, 5)} WIB
                      </span>
                    </div>
                    {k.lokasi && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{k.lokasi}</span>
                      </div>
                    )}
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEdit(k)}
                        title="Edit Kegiatan"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingKegiatan(k)}
                        title="Hapus Kegiatan"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Tambah Kegiatan */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                Tambah Kegiatan Baru
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Kegiatan *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nama_kegiatan}
                  onChange={(e) =>
                    setFormData({ ...formData, nama_kegiatan: e.target.value })
                  }
                  placeholder="Contoh: Shalat Dhuha Berjamaah / Kajian Kitab"
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kategori *
                  </label>
                  <select
                    value={formData.kategori}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        kategori: e.target.value as KegiatanKategori,
                      })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold bg-white"
                  >
                    <option value="Sekolah">Sekolah</option>
                    <option value="Madin">Madin</option>
                    <option value="Jamaah">Jamaah</option>
                    <option value="Asrama">Asrama</option>
                    <option value="Khusus">Khusus</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Lokasi
                  </label>
                  <input
                    type="text"
                    value={formData.lokasi}
                    onChange={(e) =>
                      setFormData({ ...formData, lokasi: e.target.value })
                    }
                    placeholder="Contoh: Masjid Utama / Aula"
                    className="w-full p-2.5 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Waktu Mulai
                  </label>
                  <input
                    type="time"
                    value={formData.waktu_mulai.substring(0, 5)}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        waktu_mulai: `${e.target.value}:00`,
                      })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Waktu Selesai
                  </label>
                  <input
                    type="time"
                    value={formData.waktu_selesai.substring(0, 5)}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        waktu_selesai: `${e.target.value}:00`,
                      })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Deskripsi / Keterangan
                </label>
                <textarea
                  rows={2}
                  value={formData.deskripsi}
                  onChange={(e) =>
                    setFormData({ ...formData, deskripsi: e.target.value })
                  }
                  placeholder="Keterangan materi, ustadz pengampu, atau persyaratan..."
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Kegiatan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Kegiatan */}
      {editingKegiatan && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Edit Kegiatan</h3>
                  <p className="text-[11px] text-slate-500">Perbarui jadwal dan informasi kegiatan</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingKegiatan(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Kegiatan *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.nama_kegiatan}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, nama_kegiatan: e.target.value })
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kategori *
                  </label>
                  <select
                    value={editFormData.kategori}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        kategori: e.target.value as KegiatanKategori,
                      })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold bg-white"
                  >
                    <option value="Sekolah">Sekolah</option>
                    <option value="Madin">Madin</option>
                    <option value="Jamaah">Jamaah</option>
                    <option value="Asrama">Asrama</option>
                    <option value="Khusus">Khusus</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Lokasi
                  </label>
                  <input
                    type="text"
                    value={editFormData.lokasi}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, lokasi: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Waktu Mulai
                  </label>
                  <input
                    type="time"
                    value={editFormData.waktu_mulai.substring(0, 5)}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        waktu_mulai: `${e.target.value}:00`,
                      })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Waktu Selesai
                  </label>
                  <input
                    type="time"
                    value={editFormData.waktu_selesai.substring(0, 5)}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        waktu_selesai: `${e.target.value}:00`,
                      })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Deskripsi / Keterangan
                </label>
                <textarea
                  rows={2}
                  value={editFormData.deskripsi}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, deskripsi: e.target.value })
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="edit_is_active"
                  checked={editFormData.is_active}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, is_active: e.target.checked })
                  }
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="edit_is_active" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Kegiatan Aktif (ditampilkan dalam jadwal presensi harian)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingKegiatan(null)}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Konfirmasi Hapus Kegiatan */}
      {deletingKegiatan && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Hapus Kegiatan?</h3>
                <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus kegiatan{' '}
              <strong className="text-slate-900 font-bold">"{deletingKegiatan.nama_kegiatan}"</strong>?
              Data jadwal kegiatan ini akan dihapus dari daftar.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingKegiatan(null)}
                className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs transition-colors disabled:opacity-50"
              >
                {submitting ? 'Menghapus...' : 'Ya, Hapus Kegiatan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
