/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Sparkles,
  Plus,
  Search,
  Calendar,
  MapPin,
  Users,
  ChevronRight,
  Filter,
  CheckCircle2,
  Clock,
  Trash2,
} from 'lucide-react';
import { SpecialEvent, SpecialEventStatus } from '../../types';

interface SpecialEventListProps {
  events: SpecialEvent[];
  onSelectEvent: (event: SpecialEvent) => void;
  onOpenCreateModal: () => void;
  onDeleteEvent?: (id: string) => void;
  canManage: boolean;
}

export const SpecialEventList: React.FC<SpecialEventListProps> = ({
  events,
  onSelectEvent,
  onOpenCreateModal,
  onDeleteEvent,
  canManage,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterJenis, setFilterJenis] = useState('SEMUA');
  const [filterStatus, setFilterStatus] = useState<SpecialEventStatus | 'SEMUA'>('SEMUA');

  // Filter events
  const filteredEvents = events.filter((ev) => {
    if (filterJenis !== 'SEMUA' && ev.jenis_kegiatan !== filterJenis) return false;
    if (filterStatus !== 'SEMUA' && ev.status !== filterStatus) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchNama = ev.nama_kegiatan.toLowerCase().includes(q);
      const matchLokasi = ev.lokasi.toLowerCase().includes(q);
      const matchKeterangan = ev.keterangan?.toLowerCase().includes(q);
      if (!matchNama && !matchLokasi && !matchKeterangan) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-purple-100 text-purple-700">
              <Sparkles className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700">
              Modul Kegiatan Khusus & PSG Terpadu
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            Absensi Kegiatan Khusus & Luar Pondok
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manajemen event fleksibel: PSG/PKL industri, LDKS, delegasi perlombaan, dan praktik lapangan santri.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Kegiatan Khusus Baru</span>
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-4 gap-3">
        {/* Search */}
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama kegiatan, instansi, atau lokasi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
          />
        </div>

        {/* Filter Jenis */}
        <div>
          <select
            value={filterJenis}
            onChange={(e) => setFilterJenis(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden font-medium"
          >
            <option value="SEMUA">Semua Jenis Kegiatan</option>
            <option value="PSG">PSG / PKL Industri</option>
            <option value="LDKS">LDKS (Latihan Kepemimpinan)</option>
            <option value="Perlombaan">Perlombaan / MQK</option>
            <option value="Praktik Lapangan">Praktik Lapangan</option>
            <option value="Kegiatan Luar">Kegiatan Luar</option>
          </select>
        </div>

        {/* Filter Status */}
        <div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden font-medium"
          >
            <option value="SEMUA">Semua Status</option>
            <option value="AKTIF">Status: Aktif</option>
            <option value="DRAFT">Status: Draft</option>
            <option value="SELESAI">Status: Selesai</option>
          </select>
        </div>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEvents.length === 0 ? (
          <div className="col-span-full bg-white p-12 text-center rounded-2xl border border-slate-200 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">Tidak Ada Kegiatan Khusus Ditemukan</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Belum ada kegiatan khusus yang sesuai dengan kata kunci atau filter yang dipilih.
            </p>
            {canManage && (
              <button
                type="button"
                onClick={onOpenCreateModal}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Buat Kegiatan Sekarang</span>
              </button>
            )}
          </div>
        ) : (
          filteredEvents.map((ev) => {
            const isAktif = ev.status === 'AKTIF';
            const isPsg = ev.jenis_kegiatan === 'PSG';

            return (
              <div
                key={ev.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-5 space-y-3.5">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${
                        isPsg
                          ? 'bg-blue-100 text-blue-800'
                          : ev.jenis_kegiatan === 'LDKS'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {ev.jenis_kegiatan}
                    </span>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isAktif
                          ? 'bg-emerald-100 text-emerald-800'
                          : ev.status === 'SELESAI'
                          ? 'bg-slate-100 text-slate-700'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {ev.status}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-purple-700 transition-colors line-clamp-2">
                      {ev.nama_kegiatan}
                    </h3>
                    {ev.keterangan && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {ev.keterangan}
                      </p>
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{ev.lokasi}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        {ev.tanggal_mulai} s.d. {ev.tanggal_selesai}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Absensi: {ev.jenis_absensi.replace('_', ' + ')}</span>
                    </div>
                    {ev.jenis_absensi === 'BERANGKAT_KEMBALI' && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px] font-medium text-purple-700">
                        <span className="bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                          Batas Berangkat: <strong>{ev.jam_batas_berangkat || '08:00'} WIB</strong>
                        </span>
                        <span className="bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                          Batas Kembali: <strong>{ev.jam_batas_kembali || '17:00'} WIB</strong>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <Users className="w-4 h-4 text-purple-600" />
                    <span>{ev.peserta_count || 0} Peserta Santri</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {canManage && onDeleteEvent && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteEvent(ev.id);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Hapus kegiatan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onSelectEvent(ev)}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1 transition-colors shadow-2xs"
                    >
                      <span>Buka Kegiatan</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
