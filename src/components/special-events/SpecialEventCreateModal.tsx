/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Calendar,
  MapPin,
  FileText,
  Users,
  Check,
  Search,
  Plus,
  Trash2,
  Clock,
  Moon,
} from 'lucide-react';
import {
  SpecialEventAttendanceType,
  SpecialEventStatus,
  SPECIAL_EVENT_ATTENDANCE_MODELS,
  Santri,
  Kelas,
  Kamar,
} from '../../types';
import { createSpecialEvent } from '../../services/specialEventService';

interface SpecialEventCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  santriList: Santri[];
  kelasList: Kelas[];
  kamarList: Kamar[];
}

export const SpecialEventCreateModal: React.FC<SpecialEventCreateModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  santriList,
  kelasList,
  kamarList,
}) => {
  const today = new Date().toISOString().split('T')[0];

  // Form states
  const [namaKegiatan, setNamaKegiatan] = useState('');
  const [jenisKegiatan, setJenisKegiatan] = useState('PSG');
  const [customJenis, setCustomJenis] = useState('');
  const [tanggalMulai, setTanggalMulai] = useState(today);
  const [tanggalSelesai, setTanggalSelesai] = useState(today);
  const [jamBerangkat, setJamBerangkat] = useState('08:00');
  const [jamKembali, setJamKembali] = useState('17:00');
  const [lokasi, setLokasi] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [jenisAbsensi, setJenisAbsensi] = useState<SpecialEventAttendanceType>('BERANGKAT_KEMBALI_MENGINAP');
  const [status, setStatus] = useState<SpecialEventStatus>('AKTIF');

  // Perhitungan durasi malam menginap
  const calcNights = () => {
    if (!tanggalMulai || !tanggalSelesai) return 0;
    const start = new Date(tanggalMulai);
    const end = new Date(tanggalSelesai);
    const diffTime = end.getTime() - start.getTime();
    return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  const isMenginap = jenisAbsensi === 'BERANGKAT_KEMBALI_MENGINAP';
  const durasiMalam = isMenginap ? calcNights() : 0;

  // Participants selection
  const [selectedParticipants, setSelectedParticipants] = useState<
    { santriId: string; atributKhusus: string; catatan: string }[]
  >([]);
  const [santriSearch, setSantriSearch] = useState('');
  const [filterKelas, setFilterKelas] = useState('SEMUA');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filtered available santri to add
  const availableSantri = santriList.filter((s) => {
    const isAlreadyAdded = selectedParticipants.some((p) => p.santriId === s.id);
    if (isAlreadyAdded) return false;

    if (filterKelas !== 'SEMUA' && s.kelas_id !== filterKelas) return false;

    if (santriSearch.trim()) {
      const q = santriSearch.toLowerCase().trim();
      const matchName = s.nama.toLowerCase().includes(q);
      const matchYys = s.id_yys.toLowerCase().includes(q);
      if (!matchName && !matchYys) return false;
    }
    return true;
  });

  const handleAddParticipant = (santri: Santri) => {
    setSelectedParticipants((prev) => [
      ...prev,
      {
        santriId: santri.id,
        atributKhusus: jenisKegiatan === 'PSG' ? 'PT / Instansi Penempatan' : '',
        catatan: '',
      },
    ]);
  };

  const handleRemoveParticipant = (santriId: string) => {
    setSelectedParticipants((prev) => prev.filter((p) => p.santriId !== santriId));
  };

  const handleUpdateParticipantAtribut = (santriId: string, val: string) => {
    setSelectedParticipants((prev) =>
      prev.map((p) => (p.santriId === santriId ? { ...p, atributKhusus: val } : p))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const finalNama = namaKegiatan.trim();
    const finalJenis = jenisKegiatan === 'LAINNYA' ? customJenis.trim() : jenisKegiatan;
    const finalLokasi = lokasi.trim();

    if (!finalNama) {
      setErrorMsg('Nama kegiatan wajib diisi.');
      return;
    }
    if (!finalJenis) {
      setErrorMsg('Jenis kegiatan wajib ditentukan.');
      return;
    }
    if (!finalLokasi) {
      setErrorMsg('Lokasi kegiatan wajib diisi.');
      return;
    }
    if (tanggalMulai > tanggalSelesai) {
      setErrorMsg('Tanggal mulai tidak boleh lebih lambat dari tanggal selesai.');
      return;
    }

    setSubmitting(true);
    try {
      const participantInputs = selectedParticipants.map((p) => ({
        santri_id: p.santriId,
        atribut_khusus: p.atributKhusus.trim() || undefined,
        catatan: p.catatan.trim() || undefined,
      }));

      const res = await createSpecialEvent(
        {
          nama_kegiatan: finalNama,
          jenis_kegiatan: finalJenis,
          tanggal_mulai: tanggalMulai,
          tanggal_selesai: tanggalSelesai,
          jam_berangkat: jamBerangkat,
          jam_kembali: jamKembali,
          is_menginap: isMenginap,
          durasi_malam: durasiMalam,
          lokasi: finalLokasi,
          keterangan: keterangan.trim() || null,
          jenis_absensi: jenisAbsensi,
          jam_batas_berangkat: jamBerangkat,
          jam_batas_kembali: jamKembali,
          status,
        },
        participantInputs
      );

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        onCreated();
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan kegiatan khusus.';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Buat Kegiatan Khusus Baru</h2>
              <p className="text-xs text-slate-500">
                Pendidikan Sistem Ganda (PSG), LDKS, Praktik Lapangan, Perlombaan, dll.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nama Kegiatan */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Kegiatan <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: PSG Angkatan 2026 / LDKS Pengurus Santri"
                value={namaKegiatan}
                onChange={(e) => setNamaKegiatan(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              />
            </div>

            {/* Jenis Kegiatan */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Jenis Kegiatan <span className="text-rose-500">*</span>
              </label>
              <select
                value={jenisKegiatan}
                onChange={(e) => setJenisKegiatan(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden font-medium"
              >
                <option value="PSG">PSG (Pendidikan Sistem Ganda / PKL)</option>
                <option value="LDKS">LDKS (Latihan Kepemimpinan)</option>
                <option value="Perlombaan">Perlombaan / Musabaqah (MQK)</option>
                <option value="Praktik Lapangan">Praktik Lapangan / Magang</option>
                <option value="Kegiatan Luar">Kegiatan Luar Pondok</option>
                <option value="LAINNYA">Lainnya (Tulis Manual)</option>
              </select>
              {jenisKegiatan === 'LAINNYA' && (
                <input
                  type="text"
                  placeholder="Ketik jenis kegiatan khusus..."
                  value={customJenis}
                  onChange={(e) => setCustomJenis(e.target.value)}
                  className="mt-2 w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                />
              )}
            </div>

            {/* Model Absensi: 3 Pilihan Resmi */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Model Absensi Kegiatan <span className="text-rose-500">*</span>
              </label>
              <select
                value={jenisAbsensi}
                onChange={(e) => setJenisAbsensi(e.target.value as SpecialEventAttendanceType)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden font-medium"
              >
                {SPECIAL_EVENT_ATTENDANCE_MODELS.map((model) => (
                  <option key={model.value} value={model.value}>
                    {model.label}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-[11px] text-purple-700 bg-purple-50 p-2 rounded-lg border border-purple-100">
                {SPECIAL_EVENT_ATTENDANCE_MODELS.find((m) => m.value === jenisAbsensi)?.description}
              </p>
            </div>

            {/* Tanggal Mulai */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tanggal Mulai <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={tanggalMulai}
                onChange={(e) => setTanggalMulai(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              />
            </div>

            {/* Tanggal Selesai */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tanggal Selesai <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={tanggalSelesai}
                onChange={(e) => setTanggalSelesai(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              />
            </div>

            {/* Pengaturan Jam Berangkat & Jam Kembali */}
            {jenisAbsensi !== 'SEKALI' ? (
              <div
                className={`sm:col-span-2 p-4 rounded-xl border transition-all shadow-2xs ${
                  isMenginap
                    ? 'bg-gradient-to-r from-purple-50 via-indigo-50/50 to-purple-50 border-purple-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-purple-100/80">
                  <div className="flex items-center gap-2">
                    <Moon className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-bold text-purple-950">
                      {isMenginap
                        ? `Kegiatan Khusus Menginap (${durasiMalam} Malam)`
                        : 'Jadwal Berangkat dan Kembali Setiap Hari (Tanpa Menginap)'}
                    </span>
                  </div>
                  {isMenginap ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-200/80 text-purple-900 border border-purple-300">
                      🌙 Menginap {durasiMalam} Malam
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      ☀️ Harian Pulang-Pergi
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-purple-900 mb-1 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-purple-600" />
                      <span>{isMenginap ? 'Jam Berangkat' : 'Jam Berangkat'} <span className="text-rose-500">*</span></span>
                    </label>
                    <input
                      type="time"
                      required
                      value={jamBerangkat}
                      onChange={(e) => setJamBerangkat(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-purple-300 text-xs bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                    />
                    {isMenginap && (
                      <p className="text-[10px] text-purple-700 mt-1">
                        Waktu santri/rombongan berangkat dari pondok pada <strong>{tanggalMulai}</strong>.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-purple-900 mb-1 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-purple-600" />
                      <span>{isMenginap ? 'Jam Kembali ke Pondok' : 'Jam Kembali ke Pondok'} <span className="text-rose-500">*</span></span>
                    </label>
                    <input
                      type="time"
                      required
                      value={jamKembali}
                      onChange={(e) => setJamKembali(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-purple-300 text-xs bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                    />
                    {isMenginap && (
                      <p className="text-[10px] text-purple-700 mt-1">
                        Estimasi santri tiba kembali di pondok pada <strong>{tanggalSelesai}</strong>.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {/* Lokasi */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Lokasi Pelaksanaan <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Instansi Mitra Wilayah Surabaya & Sidoarjo"
                value={lokasi}
                onChange={(e) => setLokasi(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              />
            </div>

            {/* Keterangan */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Keterangan / Catatan Teknis
              </label>
              <textarea
                rows={2}
                placeholder="Informasi pengantar, koordinator, atau tata tertib absensi..."
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Section: Pilih Santri Peserta Kegiatan */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-purple-600" />
                <span>Pilih Santri Peserta ({selectedParticipants.length} dipilih)</span>
              </label>
              <span className="text-[11px] text-slate-400">
                Santri yang dipilih akan dapat diabsen dalam event ini
              </span>
            </div>

            {/* Selected Participants Chips */}
            {selectedParticipants.length > 0 && (
              <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-200 space-y-2 mb-3 max-h-48 overflow-y-auto">
                <span className="text-[11px] font-bold text-purple-900 block">
                  Daftar Peserta Terdaftar:
                </span>
                <div className="space-y-1.5">
                  {selectedParticipants.map((p) => {
                    const santri = santriList.find((s) => s.id === p.santriId);
                    if (!santri) return null;
                    return (
                      <div
                        key={p.santriId}
                        className="bg-white p-2 rounded-lg border border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 truncate block">
                            {santri.nama}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {santri.id_yys} • {santri.kelas?.nama_kelas || '-'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder={
                              jenisKegiatan === 'PSG'
                                ? 'Tempat PSG (contoh: PT Telkom)'
                                : 'Atribut/Kelompok'
                            }
                            value={p.atributKhusus}
                            onChange={(e) =>
                              handleUpdateParticipantAtribut(p.santriId, e.target.value)
                            }
                            className="px-2 py-1 rounded border border-slate-300 text-[11px] w-44 focus:ring-1 focus:ring-purple-500 focus:outline-hidden"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveParticipant(p.santriId)}
                            className="p-1 rounded text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                            title="Hapus peserta"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Search & Add Santri Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
              <div className="sm:col-span-2 relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari santri untuk ditambahkan..."
                  value={santriSearch}
                  onChange={(e) => setSantriSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-hidden"
                />
              </div>
              <div>
                <select
                  value={filterKelas}
                  onChange={(e) => setFilterKelas(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs bg-white focus:ring-1 focus:ring-purple-500 focus:outline-hidden"
                >
                  <option value="SEMUA">Semua Kelas</option>
                  {kelasList.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama_kelas}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Santri Selector list */}
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-36 overflow-y-auto">
              {availableSantri.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  Tidak ada santri yang dapat ditambahkan sesuai pencarian.
                </div>
              ) : (
                availableSantri.slice(0, 10).map((s) => (
                  <div
                    key={s.id}
                    className="p-2 px-3 flex items-center justify-between hover:bg-slate-50 transition-colors text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-800">{s.nama}</span>
                      <span className="text-[10px] text-slate-400 ml-2 font-mono">{s.id_yys}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddParticipant(s)}
                      className="px-2.5 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-700 text-[11px] font-bold flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Tambah</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              {submitting ? (
                <span>Menyimpan Kegiatan...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Simpan Kegiatan Khusus</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
