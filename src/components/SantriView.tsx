/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Filter,
  RefreshCw,
  QrCode,
  Edit2,
  Trash2,
  Eye,
  X,
  Check,
  AlertCircle,
  Building,
  GraduationCap,
  MapPin,
  Phone,
  Calendar,
  Lock,
  FileSpreadsheet,
} from 'lucide-react';
import {
  Santri,
  Kelas,
  Kamar,
  StatusSantri,
  JenisKelamin,
  getSantriKamarText,
  getSantriMadinText,
} from '../types';
import {
  getSantriList,
  createSantri,
  updateSantri,
  deleteSantri,
  getKamarList,
  getKelasList,
  getKelasMadinList,
  cleanupAllDummyData,
  isDummyKamar,
} from '../services/santriService';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../lib/roles';
import { ImportSantriModal } from './ImportSantriModal';

interface SantriViewProps {
  onOpenBarcodeModal: () => void;
}

export const SantriView: React.FC<SantriViewProps> = ({ onOpenBarcodeModal }) => {
  const { currentRole, profile } = useAuth();

  const canEdit = hasPermission(currentRole, 'edit_santri');
  const canDelete = hasPermission(currentRole, 'delete_santri');

  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [allMasterSantri, setAllMasterSantri] = useState<Santri[]>([]);
  const [kamarList, setKamarList] = useState<Kamar[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [madinList, setMadinList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKelas, setSelectedKelas] = useState('');
  const [selectedKamar, setSelectedKamar] = useState('');
  const [selectedMadin, setSelectedMadin] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedGender, setSelectedGender] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingSantri, setEditingSantri] = useState<Santri | null>(null);
  const [viewingSantri, setViewingSantri] = useState<Santri | null>(null);
  const [deletingSantri, setDeletingSantri] = useState<Santri | null>(null);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    id_yys: '',
    nama: '',
    nis: '',
    jenis_kelamin: 'L' as JenisKelamin,
    kelas_id: '',
    kamar: '',
    kamar_id: '',
    kelas_madin: '',
    rayon: '',
    status_santri: 'Aktif' as StatusSantri,
    barcode_value: '',
    nama_wali: '',
    kontak_wali: '',
    alamat: '',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Load data
  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [santriData, kamars, kelass, madins, allMaster] = await Promise.all([
        getSantriList({
          query: searchQuery,
          kelasId: selectedKelas || undefined,
          kamar: selectedKamar || undefined,
          kamarId: selectedKamar || undefined,
          kelasMadin: selectedMadin || undefined,
          rayon: selectedMadin || undefined,
          status: selectedStatus || undefined,
          gender: selectedGender || undefined,
        }),
        getKamarList(),
        getKelasList(),
        getKelasMadinList(),
        getSantriList(), // Ambil master lengkap untuk opsi filter kamar & madin
      ]);
      setSantriList(santriData);
      setKamarList(kamars);
      setKelasList(kelass);
      setMadinList(madins);
      setAllMasterSantri(allMaster);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memuat data santri');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Bersihkan sisa data dummy / uji coba bawaan saat startup
    cleanupAllDummyData(profile?.email).then((res) => {
      if (res.deletedSantri > 0 || res.deletedKamar > 0 || res.deletedPermissions > 0) {
        fetchData();
      }
    });
  }, []);

  useEffect(() => {
    fetchData();
  }, [searchQuery, selectedKelas, selectedKamar, selectedMadin, selectedStatus, selectedGender]);

  // Kumpulan kamar unik dari santri master (termasuk hasil import Excel) & master kamar
  const availableKamars = useMemo(() => {
    const map = new Map<string, string>();
    // 1. Dari master kamar aktif (kecualikan dummy)
    kamarList.forEach((k) => {
      if (k.nama_kamar && k.nama_kamar.trim() && !isDummyKamar(k.id, k.nama_kamar)) {
        map.set(k.nama_kamar.trim().toLowerCase(), k.nama_kamar.trim());
      }
    });
    // 2. Dari data santri master asli (termasuk data yang diimport pengguna)
    allMasterSantri.forEach((s) => {
      if (s.id && s.id.startsWith('d0000000-')) return;
      const kText = getSantriKamarText(s);
      if (kText && kText !== '-' && kText.trim() && !isDummyKamar(null, kText)) {
        map.set(kText.trim().toLowerCase(), kText.trim());
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [kamarList, allMasterSantri]);

  // Kumpulan kelas madin unik dari data santri master & master madin
  const availableMadins = useMemo(() => {
    const map = new Map<string, string>();
    madinList.forEach((m) => {
      if (m && m.trim()) map.set(m.trim().toLowerCase(), m.trim());
    });
    allMasterSantri.forEach((s) => {
      const mText = getSantriMadinText(s);
      if (mText && mText !== '-' && mText.trim()) {
        map.set(mText.trim().toLowerCase(), mText.trim());
      }
    });
    return Array.from(map.values()).sort();
  }, [madinList, allMasterSantri]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedKelas('');
    setSelectedKamar('');
    setSelectedMadin('');
    setSelectedStatus('');
    setSelectedGender('');
  };

  const openAddModal = () => {
    // Generate suggested ID YYS format: YYS2026 + 5 digits
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const suggestedIdYys = `YYS2026${randomSuffix}`;

    setFormData({
      id_yys: suggestedIdYys,
      nama: '',
      nis: `NIS2026${randomSuffix.toString().substring(0, 3)}`,
      jenis_kelamin: 'L',
      kelas_id: kelasList[0]?.id || '',
      kamar: kamarList[0]?.nama_kamar || '',
      kamar_id: '',
      kelas_madin: madinList[0] || '',
      rayon: madinList[0] || '',
      status_santri: 'Aktif',
      barcode_value: suggestedIdYys,
      nama_wali: '',
      kontak_wali: '',
      alamat: '',
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (santri: Santri) => {
    setEditingSantri(santri);
    const kamarText = getSantriKamarText(santri);
    const madinText = getSantriMadinText(santri);
    setFormData({
      id_yys: santri.id_yys,
      nama: santri.nama,
      nis: santri.nis || '',
      jenis_kelamin: santri.jenis_kelamin,
      kelas_id: santri.kelas_id || '',
      kamar: kamarText === '-' ? '' : kamarText,
      kamar_id: santri.kamar_id || '',
      kelas_madin: madinText === '-' ? '' : madinText,
      rayon: madinText === '-' ? '' : madinText,
      status_santri: santri.status_santri,
      barcode_value: santri.barcode_value,
      nama_wali: santri.nama_wali || '',
      kontak_wali: santri.kontak_wali || '',
      alamat: santri.alamat || '',
    });
    setFormError(null);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.nama.trim()) {
      setFormError('Nama santri wajib diisi.');
      return;
    }
    if (!formData.id_yys.trim()) {
      setFormError('ID YYS wajib diisi sebagai identifier unik.');
      return;
    }

    setFormSubmitting(true);
    try {
      const cleanKamar = formData.kamar.trim() || null;
      const cleanMadin = (formData.kelas_madin || formData.rayon)?.trim() || null;

      if (editingSantri) {
        const { error } = await updateSantri(editingSantri.id, {
          nama: formData.nama.trim(),
          nis: formData.nis.trim() || null,
          jenis_kelamin: formData.jenis_kelamin,
          kelas_id: formData.kelas_id || null,
          kamar: cleanKamar,
          kamar_id: null,
          kelas_madin: cleanMadin,
          rayon: cleanMadin,
          status_santri: formData.status_santri,
          barcode_value: formData.barcode_value.trim() || formData.id_yys.trim(),
          nama_wali: formData.nama_wali.trim() || null,
          kontak_wali: formData.kontak_wali.trim() || null,
          alamat: formData.alamat.trim() || null,
        });

        if (error) {
          setFormError(error);
          return;
        }
        setEditingSantri(null);
      } else {
        const { error } = await createSantri({
          id_yys: formData.id_yys.trim().toUpperCase(),
          nama: formData.nama.trim(),
          nis: formData.nis.trim() || null,
          jenis_kelamin: formData.jenis_kelamin,
          kelas_id: formData.kelas_id || null,
          kamar: cleanKamar,
          kamar_id: null,
          kelas_madin: cleanMadin,
          rayon: cleanMadin,
          status_santri: formData.status_santri,
          barcode_value: formData.barcode_value.trim() || formData.id_yys.trim().toUpperCase(),
          nama_wali: formData.nama_wali.trim() || null,
          kontak_wali: formData.kontak_wali.trim() || null,
          alamat: formData.alamat.trim() || null,
        });

        if (error) {
          setFormError(error);
          return;
        }
        setIsAddModalOpen(false);
      }

      await fetchData();
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingSantri) return;
    setFormSubmitting(true);
    try {
      const { success, error } = await deleteSantri(deletingSantri.id);
      if (!success && error) {
        setErrorMsg(error);
      } else {
        setDeletingSantri(null);
        await fetchData();
      }
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              Data Master Santri
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              {santriList.length} Santri
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pengelolaan identitas unik santri berbasis barcode ID YYS dan data kamar/kelas.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="btn-scan-header"
            type="button"
            onClick={onOpenBarcodeModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-xs transition-colors border border-slate-200"
          >
            <QrCode className="w-4 h-4 text-slate-600" />
            <span>Cari Barcode</span>
          </button>

          {canEdit && (
            <>
              <button
                id="btn-import-santri"
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-semibold text-xs transition-colors border border-teal-200"
              >
                <FileSpreadsheet className="w-4 h-4 text-teal-700" />
                <span>Import Data (Excel/CSV)</span>
              </button>

              <button
                id="btn-add-santri"
                type="button"
                onClick={openAddModal}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Santri Baru</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* Search by Name / ID YYS / Barcode */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="filter-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari ID YYS, Barcode, Nama..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Filter Kelas */}
          <div>
            <select
              id="filter-kelas"
              value={selectedKelas}
              onChange={(e) => setSelectedKelas(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Semua Kelas</option>
              {kelasList.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama_kelas}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Kamar (sesuai data santri master & hasil import) */}
          <div>
            <select
              id="filter-kamar"
              value={selectedKamar}
              onChange={(e) => setSelectedKamar(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2.5 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              <option value="">Semua Kamar ({availableKamars.length})</option>
              {availableKamars.map((kName) => (
                <option key={kName} value={kName}>
                  {kName}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Kelas Madin (sesuai data santri master & hasil import) */}
          <div>
            <select
              id="filter-madin"
              value={selectedMadin}
              onChange={(e) => setSelectedMadin(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2.5 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              <option value="">Semua Kelas Madin ({availableMadins.length})</option>
              {availableMadins.map((mName) => (
                <option key={mName} value={mName}>
                  {mName}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Status */}
          <div className="flex items-center gap-2">
            <select
              id="filter-status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Semua Status</option>
              <option value="Aktif">Aktif</option>
              <option value="Izin">Izin</option>
              <option value="Sakit">Sakit</option>
              <option value="Nonaktif">Nonaktif</option>
              <option value="Lulus">Lulus</option>
            </select>

            {(searchQuery || selectedKelas || selectedKamar || selectedMadin || selectedStatus || selectedGender) && (
              <button
                type="button"
                onClick={resetFilters}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 shrink-0"
                title="Reset Filter"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error notification */}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-rose-500 hover:text-rose-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Table / Mobile Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
            <span>Memuat master data santri...</span>
          </div>
        ) : santriList.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
            <Users className="w-8 h-8 text-slate-300" />
            <p className="font-semibold text-slate-700">Tidak ada data santri yang cocok</p>
            <p className="text-slate-400">
              Coba sesuaikan kata kunci pencarian atau filter status/kamar/kelas.
            </p>
            {(searchQuery || selectedKelas || selectedKamar || selectedStatus) && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-2 text-emerald-600 hover:underline font-semibold"
              >
                Reset Semua Filter
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Santri & ID YYS</th>
                    <th className="py-3 px-4">NIS / L/P</th>
                    <th className="py-3 px-4">Kelas</th>
                    <th className="py-3 px-4">Kamar</th>
                    <th className="py-3 px-4">Kelas Madin</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {santriList.map((santri) => (
                    <tr key={santri.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{santri.nama}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[11px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            {santri.id_yys}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Barcode: {santri.barcode_value}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        <div>{santri.nis || '-'}</div>
                        <span className="text-[10px] text-slate-400">
                          {santri.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-700">
                        {santri.kelas?.nama_kelas || '-'}
                      </td>

                      <td className="py-3 px-4 text-slate-700">
                        {getSantriKamarText(santri) !== '-' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {getSantriKamarText(santri)}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openEditModal(santri)}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded border border-dashed border-amber-300 transition-colors"
                            title="Klik untuk mengisi kamar"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Atur Kamar</span>
                          </button>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-700">
                        {getSantriMadinText(santri)}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            santri.status_santri === 'Aktif'
                              ? 'bg-emerald-100 text-emerald-800'
                              : santri.status_santri === 'Izin'
                              ? 'bg-amber-100 text-amber-800'
                              : santri.status_santri === 'Sakit'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {santri.status_santri}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setViewingSantri(santri)}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Lihat Detail & Barcode"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => openEditModal(santri)}
                              className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit Data Santri"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => setDeletingSantri(santri)}
                              className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Hapus Data (Super Admin)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (Optimized for Android / iPhone Touch Targets & Clarity) */}
            <div className="md:hidden p-3 space-y-3 bg-slate-50/50">
              {santriList.map((santri) => {
                const kamarVal = getSantriKamarText(santri);
                const madinVal = getSantriMadinText(santri);
                return (
                  <div
                    key={santri.id}
                    className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="font-bold text-slate-900 text-base leading-snug">
                          {santri.nama}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {santri.id_yys}
                          </span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              santri.status_santri === 'Aktif'
                                ? 'bg-emerald-100 text-emerald-800'
                                : santri.status_santri === 'Izin'
                                ? 'bg-amber-100 text-amber-800'
                                : santri.status_santri === 'Sakit'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {santri.status_santri}
                          </span>
                          {santri.nis && (
                            <span className="text-[11px] text-slate-500 font-mono">
                              NIS: {santri.nis}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Touch-Friendly Action Buttons (>= 44px touch target) */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setViewingSantri(santri)}
                          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-600 bg-slate-100 active:bg-slate-200 rounded-xl transition-colors"
                          title="Lihat Detail"
                          aria-label="Lihat Detail"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => openEditModal(santri)}
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-blue-700 bg-blue-50 active:bg-blue-100 rounded-xl transition-colors"
                            title="Edit"
                            aria-label="Edit"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => setDeletingSantri(santri)}
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-rose-700 bg-rose-50 active:bg-rose-100 rounded-xl transition-colors"
                            title="Hapus"
                            aria-label="Hapus"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/90 p-3 rounded-xl border border-slate-200/80">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-0.5">
                          Kelas
                        </span>
                        <span className="font-semibold text-slate-800 text-xs">
                          {santri.kelas?.nama_kelas || '-'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-0.5">
                          Kamar
                        </span>
                        {kamarVal !== '-' ? (
                          <span className="inline-flex items-center font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 text-xs">
                            {kamarVal}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openEditModal(santri)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-dashed border-amber-300"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Atur Kamar</span>
                          </button>
                        )}
                      </div>

                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-0.5">
                          Jenis Kelamin
                        </span>
                        <span className="font-medium text-slate-700 text-xs">
                          {santri.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-0.5">
                          Kelas Madin
                        </span>
                        <span className="font-semibold text-slate-800 text-xs">
                          {madinVal}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ==============================================================================
          MODAL: LIHAT DETAIL & BARCODE SANTRI
      ============================================================================== */}
      {viewingSantri && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                Kartu & Identitas Santri
              </h3>
              <button
                type="button"
                onClick={() => setViewingSantri(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Barcode Visual Card */}
            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                Barcode Fisik Santri
              </span>

              {/* Graphic Barcode representation */}
              <div className="py-3 px-6 bg-white rounded-lg border border-slate-200 inline-block shadow-xs">
                <div className="flex items-center justify-center gap-0.5 h-12">
                  {[4, 2, 6, 3, 5, 2, 7, 4, 3, 6, 2, 5, 7, 3, 2, 6, 4, 5, 2, 6].map(
                    (heightWeight, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-900"
                        style={{
                          width: `${(idx % 3) + 2}px`,
                          height: `${heightWeight * 5}px`,
                        }}
                      />
                    )
                  )}
                </div>
                <div className="mt-2 font-mono font-bold text-sm tracking-widest text-slate-800">
                  {viewingSantri.barcode_value}
                </div>
              </div>

              <div className="mt-2 text-xs text-slate-500">
                Identifier Unik Sistem:{' '}
                <strong className="font-mono text-emerald-800">{viewingSantri.id_yys}</strong>
              </div>
            </div>

            {/* Student Data details */}
            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Nama Lengkap</span>
                <span className="font-semibold text-slate-800">{viewingSantri.nama}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Nomor Induk Santri (NIS)</span>
                <span className="font-mono text-slate-800">{viewingSantri.nis || '-'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Jenis Kelamin</span>
                <span className="text-slate-800">
                  {viewingSantri.jenis_kelamin === 'L' ? 'Laki-laki (Santriwan)' : 'Perempuan (Santriwati)'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Kelas</span>
                <span className="font-medium text-slate-800">
                  {viewingSantri.kelas?.nama_kelas || '-'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Kamar</span>
                <span className="font-medium text-slate-800">
                  {getSantriKamarText(viewingSantri)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Kelas Madin</span>
                <span className="font-medium text-slate-800">
                  {getSantriMadinText(viewingSantri)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Nama Wali</span>
                <span className="text-slate-800">{viewingSantri.nama_wali || '-'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Kontak Wali</span>
                <span className="font-mono text-slate-800">{viewingSantri.kontak_wali || '-'}</span>
              </div>
              <div className="py-1.5 border-b border-slate-100">
                <span className="text-slate-500 block mb-1">Alamat Asal</span>
                <span className="text-slate-800 leading-relaxed">
                  {viewingSantri.alamat || '-'}
                </span>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingSantri(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================================
          MODAL: TAMBAH / EDIT DATA SANTRI
      ============================================================================== */}
      {(isAddModalOpen || editingSantri) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                {editingSantri ? 'Edit Data Santri' : 'Tambah Santri Baru'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingSantri(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="mt-4 space-y-3.5 text-xs">
              {/* ID YYS & Barcode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    ID YYS (Identifier Unik) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="form-id-yys"
                    type="text"
                    required
                    disabled={Boolean(editingSantri)} // Never change existing ID YYS
                    value={formData.id_yys}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setFormData({
                        ...formData,
                        id_yys: val,
                        barcode_value: val, // Keep barcode matching ID YYS
                      });
                    }}
                    placeholder="Contoh: YYS202600123"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Harus unik, identitas barcode kartu santri
                  </p>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Nilai Barcode Fisik <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="form-barcode-val"
                    type="text"
                    required
                    value={formData.barcode_value}
                    onChange={(e) =>
                      setFormData({ ...formData, barcode_value: e.target.value.trim() })
                    }
                    placeholder="Nilai yang terbaca saat scan"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Sesuai barcode kartu santri (default = ID YYS)
                  </p>
                </div>
              </div>

              {/* Nama Lengkap & NIS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Nama Lengkap Santri <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="form-nama"
                    type="text"
                    required
                    value={formData.nama}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                    placeholder="Nama santri..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Nomor Induk Santri (NIS)
                  </label>
                  <input
                    id="form-nis"
                    type="text"
                    value={formData.nis}
                    onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                    placeholder="Contoh: NIS2026001"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Jenis Kelamin & Status Santri */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Jenis Kelamin <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="form-gender"
                    value={formData.jenis_kelamin}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        jenis_kelamin: e.target.value as JenisKelamin,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="L">Laki-laki (Santriwan)</option>
                    <option value="P">Perempuan (Santriwati)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Status Santri <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="form-status"
                    value={formData.status_santri}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status_santri: e.target.value as StatusSantri,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Izin">Izin Pulang/Keluar</option>
                    <option value="Sakit">Sakit</option>
                    <option value="Nonaktif">Nonaktif</option>
                    <option value="Lulus">Lulus</option>
                  </select>
                </div>
              </div>

              {/* Kelas & Kamar Asrama */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Kelas (Madin / Formal)
                  </label>
                  <select
                    id="form-kelas"
                    value={formData.kelas_id}
                    onChange={(e) => setFormData({ ...formData, kelas_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Pilih Kelas...</option>
                    {kelasList.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.nama_kelas} ({k.tingkat})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Kamar
                  </label>
                  <input
                    id="form-kamar"
                    type="text"
                    list="kamar-suggestions"
                    value={formData.kamar}
                    onChange={(e) => setFormData({ ...formData, kamar: e.target.value })}
                    placeholder="Ketik atau pilih kamar..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                  <datalist id="kamar-suggestions">
                    {availableKamars.map((kName) => (
                      <option key={kName} value={kName} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Kelas Madin & Wali */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Kelas Madin
                  </label>
                  <input
                    id="form-kelas-madin"
                    type="text"
                    list="madin-suggestions"
                    value={formData.kelas_madin}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        kelas_madin: e.target.value,
                        rayon: e.target.value,
                      })
                    }
                    placeholder="Contoh: Ula 1, Wustho 2, dll."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                  <datalist id="madin-suggestions">
                    {availableMadins.map((mName) => (
                      <option key={mName} value={mName} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Nama Wali Santri
                  </label>
                  <input
                    id="form-nama-wali"
                    type="text"
                    value={formData.nama_wali}
                    onChange={(e) => setFormData({ ...formData, nama_wali: e.target.value })}
                    placeholder="Nama orang tua / wali..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Kontak Wali & Alamat */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    No. HP / WhatsApp Wali
                  </label>
                  <input
                    id="form-kontak-wali"
                    type="text"
                    value={formData.kontak_wali}
                    onChange={(e) => setFormData({ ...formData, kontak_wali: e.target.value })}
                    placeholder="081xxxxxxxxx"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Alamat Lengkap
                  </label>
                  <input
                    id="form-alamat"
                    type="text"
                    value={formData.alamat}
                    onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                    placeholder="Jalan, Desa, Kecamatan, Kota"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingSantri(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"
                >
                  Batal
                </button>
                <button
                  id="btn-submit-santri"
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs transition-colors disabled:opacity-50"
                >
                  {formSubmitting
                    ? 'Menyimpan...'
                    : editingSantri
                    ? 'Perbarui Data'
                    : 'Simpan Santri'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==============================================================================
          MODAL: KONFIRMASI HAPUS SANTRI (SUPER ADMIN ONLY)
      ============================================================================== */}
      {deletingSantri && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900">
              Konfirmasi Hapus Santri
            </h3>
            <p className="text-xs text-slate-500 mt-2">
              Apakah Anda yakin ingin menghapus data santri{' '}
              <strong className="text-slate-900">{deletingSantri.nama}</strong> (ID YYS:{' '}
              <code className="font-mono font-bold text-rose-700">{deletingSantri.id_yys}</code>)?
              Tindakan ini hanya dapat dilakukan oleh Super Admin.
            </p>

            <div className="mt-5 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setDeletingSantri(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
              >
                Batal
              </button>
              <button
                id="btn-confirm-delete"
                type="button"
                onClick={handleDeleteConfirm}
                disabled={formSubmitting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors shadow-xs"
              >
                {formSubmitting ? 'Menghapus...' : 'Ya, Hapus Data'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Import Santri Modal (Excel / CSV) */}
      <ImportSantriModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          fetchData();
        }}
        kelasList={kelasList}
        kamarList={kamarList}
      />
    </div>
  );
};
