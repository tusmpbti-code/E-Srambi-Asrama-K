/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Shield,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Briefcase,
  Layers,
  ArrowRight,
  ExternalLink,
  QrCode,
  Tag,
  Building,
} from 'lucide-react';
import {
  Santri,
  AttendanceRecord,
  SantriPermission,
  SpecialAttendanceRecord,
  SpecialEventParticipant,
} from '../../types';
import { getSantriAttendanceHistory } from '../../services/attendanceService';
import { getSantriPermissionsHistory } from '../../services/permissionService';
import { getSantriSpecialEventsHistory } from '../../services/specialEventService';

interface SantriDetailModalProps {
  santri: Santri | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenPermissionCreate?: (santri: Santri) => void;
}

export const SantriDetailModal: React.FC<SantriDetailModalProps> = ({
  santri,
  isOpen,
  onClose,
  onOpenPermissionCreate,
}) => {
  const [activeTab, setActiveTab] = useState<'profil' | 'absensi' | 'izin' | 'kegiatan_khusus'>('profil');
  const [loading, setLoading] = useState(false);

  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [permissionHistory, setPermissionHistory] = useState<SantriPermission[]>([]);
  const [specialHistory, setSpecialHistory] = useState<{
    participantRecords: SpecialEventParticipant[];
    attendanceRecords: SpecialAttendanceRecord[];
  }>({ participantRecords: [], attendanceRecords: [] });

  useEffect(() => {
    if (isOpen && santri) {
      setLoading(true);
      Promise.all([
        getSantriAttendanceHistory(santri.id),
        getSantriPermissionsHistory(santri.id),
        getSantriSpecialEventsHistory(santri.id),
      ])
        .then(([att, perm, spec]) => {
          setAttendanceHistory(att);
          setPermissionHistory(perm);
          setSpecialHistory(spec);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, santri]);

  if (!isOpen || !santri) return null;

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Aktif':
      case 'HADIR':
      case 'DISETUJUI':
      case 'SUDAH_KEMBALI':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Izin':
      case 'IZIN':
      case 'DIAJUKAN':
      case 'SUDAH_BERANGKAT':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Sakit':
      case 'SAKIT':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'ALPA':
      case 'TERLAMBAT':
      case 'TIDAK_ABSEN':
      case 'DITOLAK':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-zinc-50 text-zinc-700 border-zinc-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white font-bold text-xl shadow-inner">
              {santri.nama.charAt(0)}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-bold text-white tracking-tight">{santri.nama}</h3>
                <span className={`px-2 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wider border ${
                  santri.status_santri === 'Aktif'
                    ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30'
                    : 'bg-amber-500/20 text-amber-200 border-amber-400/30'
                }`}>
                  {santri.status_santri}
                </span>
              </div>
              <p className="text-sm text-emerald-100 font-mono mt-0.5">
                ID YYS: <span className="font-bold text-white">{santri.id_yys}</span> {santri.nis ? `• NIS: ${santri.nis}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
            title="Tutup"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-200 bg-zinc-50 px-5 sm:px-6 gap-2 sm:gap-6 overflow-x-auto text-sm">
          <button
            onClick={() => setActiveTab('profil')}
            className={`py-3.5 px-2 border-b-2 font-medium flex items-center space-x-2 transition-colors whitespace-nowrap ${
              activeTab === 'profil'
                ? 'border-emerald-700 text-emerald-800 font-semibold'
                : 'border-transparent text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profil & Identitas</span>
          </button>
          <button
            onClick={() => setActiveTab('absensi')}
            className={`py-3.5 px-2 border-b-2 font-medium flex items-center space-x-2 transition-colors whitespace-nowrap ${
              activeTab === 'absensi'
                ? 'border-emerald-700 text-emerald-800 font-semibold'
                : 'border-transparent text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Riwayat Absensi</span>
            <span className="px-1.5 py-0.5 text-xs bg-zinc-200 text-zinc-700 rounded-full font-bold">
              {attendanceHistory.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('izin')}
            className={`py-3.5 px-2 border-b-2 font-medium flex items-center space-x-2 transition-colors whitespace-nowrap ${
              activeTab === 'izin'
                ? 'border-emerald-700 text-emerald-800 font-semibold'
                : 'border-transparent text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Riwayat Perizinan</span>
            <span className="px-1.5 py-0.5 text-xs bg-zinc-200 text-zinc-700 rounded-full font-bold">
              {permissionHistory.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('kegiatan_khusus')}
            className={`py-3.5 px-2 border-b-2 font-medium flex items-center space-x-2 transition-colors whitespace-nowrap ${
              activeTab === 'kegiatan_khusus'
                ? 'border-emerald-700 text-emerald-800 font-semibold'
                : 'border-transparent text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>PSG & Kegiatan Khusus</span>
            <span className="px-1.5 py-0.5 text-xs bg-zinc-200 text-zinc-700 rounded-full font-bold">
              {specialHistory.participantRecords.length}
            </span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {loading ? (
            <div className="py-12 text-center text-zinc-500">
              <div className="inline-block w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-sm font-medium">Memuat riwayat terpadu santri...</p>
            </div>
          ) : activeTab === 'profil' ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50">
                  <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Kelas Formal</div>
                  <div className="text-base font-bold text-zinc-900">{santri.kelas?.nama_kelas || 'Belum Terdaftar'}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">Wali: {santri.kelas?.wali_kelas || '-'}</div>
                </div>
                <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50">
                  <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Kamar Asrama</div>
                  <div className="text-base font-bold text-zinc-900">{santri.kamar?.nama_kamar || 'Belum Terdaftar'}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">{santri.kamar?.gedung || '-'}</div>
                </div>
                <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50">
                  <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Rayon / Wilayah</div>
                  <div className="text-base font-bold text-zinc-900">{santri.rayon || 'Pusat'}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">Jenis Kelamin: {santri.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-zinc-200">
                  <h4 className="text-sm font-bold text-zinc-900 mb-3 flex items-center space-x-2">
                    <User className="w-4 h-4 text-emerald-700" />
                    <span>Informasi Wali & Kontak</span>
                  </h4>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-zinc-500">Nama Wali:</dt>
                      <dd className="font-semibold text-zinc-900">{santri.nama_wali || '-'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-zinc-500">Nomor HP Wali:</dt>
                      <dd className="font-mono font-semibold text-emerald-700">{santri.kontak_wali || '-'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-zinc-500">Alamat Rumah:</dt>
                      <dd className="font-medium text-zinc-800 text-right max-w-xs">{santri.alamat || '-'}</dd>
                    </div>
                  </dl>
                </div>

                <div className="p-4 rounded-xl border border-zinc-200 flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 mb-3 flex items-center space-x-2">
                      <QrCode className="w-4 h-4 text-emerald-700" />
                      <span>Barcode Scanner Identitas</span>
                    </h4>
                    <p className="text-xs text-zinc-500 mb-2">
                      Digunakan pada seluruh pos absensi harian, pos jaga perizinan, dan absensi kegiatan khusus.
                    </p>
                    <div className="p-2.5 rounded-lg bg-zinc-100 font-mono text-center font-bold text-zinc-800 tracking-wider">
                      {santri.barcode_value || santri.id_yys}
                    </div>
                  </div>
                  {onOpenPermissionCreate && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenPermissionCreate(santri);
                      }}
                      className="mt-4 w-full py-2 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors flex items-center justify-center space-x-1.5"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Ajukan Izin Untuk Santri Ini</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : activeTab === 'absensi' ? (
            <div className="space-y-3">
              {attendanceHistory.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                  <CheckCircle2 className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                  <p className="text-sm font-medium">Belum ada rekaman absensi untuk santri ini.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-zinc-200 rounded-xl">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-50 text-zinc-600 text-xs font-semibold uppercase border-b border-zinc-200">
                      <tr>
                        <th className="py-3 px-4">Tanggal & Waktu</th>
                        <th className="py-3 px-4">Kegiatan</th>
                        <th className="py-3 px-4">Kategori</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Catatan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {attendanceHistory.map((rec) => (
                        <tr key={rec.id} className="hover:bg-zinc-50/50">
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-semibold text-zinc-900">{rec.tanggal}</div>
                            <div className="text-xs text-zinc-500 font-mono">{rec.waktu_absen} WIB</div>
                          </td>
                          <td className="py-3 px-4 font-medium text-zinc-900">
                            {rec.kegiatan?.nama_kegiatan || 'Kegiatan'}
                            <div className="text-xs text-zinc-500">Sesi {rec.sesi}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-zinc-100 text-zinc-700">
                              {rec.kegiatan?.kategori || '-'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusBadgeColor(rec.status)}`}>
                              {rec.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-zinc-600 max-w-xs truncate">
                            {rec.catatan || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : activeTab === 'izin' ? (
            <div className="space-y-3">
              {permissionHistory.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                  <Clock className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                  <p className="text-sm font-medium">Belum ada rekaman izin keluar / pulang untuk santri ini.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-zinc-200 rounded-xl">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-50 text-zinc-600 text-xs font-semibold uppercase border-b border-zinc-200">
                      <tr>
                        <th className="py-3 px-4">Jenis & Status</th>
                        <th className="py-3 px-4">Alasan & Tujuan</th>
                        <th className="py-3 px-4">Jadwal Keluar</th>
                        <th className="py-3 px-4">Batas Kembali</th>
                        <th className="py-3 px-4">Waktu Kembali</th>
                        <th className="py-3 px-4">Penanggung Jawab</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {permissionHistory.map((perm) => (
                        <tr key={perm.id} className="hover:bg-zinc-50/50">
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-bold text-zinc-900 mb-1">
                              {perm.jenis === 'IZIN_PULANG' ? 'Izin Pulang' : 'Izin Keluar'}
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${getStatusBadgeColor(perm.status)}`}>
                              {perm.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-zinc-900">{perm.alasan}</div>
                            <div className="text-xs text-zinc-500 flex items-center space-x-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-zinc-400" />
                              <span>{perm.tujuan}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-xs text-zinc-700">
                            <div>{perm.tanggal_keluar}</div>
                            <div className="font-mono text-zinc-500">{perm.jam_keluar} WIB</div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-xs">
                            <span className="font-medium text-amber-800">
                              {new Date(perm.batas_kembali).toLocaleString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })} WIB
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-xs">
                            {perm.waktu_kembali ? (
                              <span className="text-emerald-700 font-medium">
                                {new Date(perm.waktu_kembali).toLocaleString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })} WIB
                              </span>
                            ) : (
                              <span className="text-zinc-400 italic">Belum kembali</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-xs text-zinc-700">
                            <div className="font-semibold">{perm.penanggung_jawab}</div>
                            <div className="text-zinc-500 font-mono">{perm.kontak_penanggung_jawab || '-'}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {specialHistory.participantRecords.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                  <Briefcase className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                  <p className="text-sm font-medium">Santri belum terdaftar di kegiatan khusus / program PSG manapun.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {specialHistory.participantRecords.map((p) => {
                    const matchedAttendance = specialHistory.attendanceRecords.filter(
                      (a) => a.event_id === p.event_id
                    );
                    return (
                      <div key={p.id} className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 mr-2">
                              {p.atribut_khusus || 'Kegiatan Khusus'}
                            </span>
                            <span className="text-xs text-zinc-500">{p.catatan || ''}</span>
                          </div>
                          <span className="text-xs text-zinc-400">
                            Terdaftar: {new Date(p.created_at || '').toLocaleDateString('id-ID')}
                          </span>
                        </div>

                        {matchedAttendance.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs bg-white rounded-lg border border-zinc-200">
                              <thead className="bg-zinc-100 text-zinc-600 font-semibold border-b border-zinc-200">
                                <tr>
                                  <th className="py-2 px-3">Tanggal</th>
                                  <th className="py-2 px-3">Waktu Berangkat</th>
                                  <th className="py-2 px-3">Waktu Kembali</th>
                                  <th className="py-2 px-3">Status</th>
                                  <th className="py-2 px-3">Catatan</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-200">
                                {matchedAttendance.map((att) => (
                                  <tr key={att.id}>
                                    <td className="py-2 px-3 font-semibold text-zinc-900">{att.tanggal}</td>
                                    <td className="py-2 px-3 font-mono">
                                      {att.waktu_berangkat
                                        ? new Date(att.waktu_berangkat).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
                                        : '-'}
                                    </td>
                                    <td className="py-2 px-3 font-mono">
                                      {att.waktu_kembali
                                        ? new Date(att.waktu_kembali).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
                                        : <span className="text-amber-600 font-bold">Belum Kembali</span>}
                                    </td>
                                    <td className="py-2 px-3">
                                      <span className={`px-2 py-0.5 rounded-full font-bold border ${getStatusBadgeColor(att.status)}`}>
                                        {att.status}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3 text-zinc-500">{att.catatan || '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-xs text-zinc-500 italic">Belum ada catatan presensi harian pada kegiatan ini.</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between text-xs text-zinc-500">
          <div>
            Data tersinkronisasi langsung dari database pondok pesantren.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
