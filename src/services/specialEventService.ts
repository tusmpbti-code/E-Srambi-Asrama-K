/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  SpecialEvent,
  SpecialEventParticipant,
  SpecialAttendanceRecord,
  SpecialEventDashboardStats,
  SpecialEventStatus,
  SpecialEventAttendanceType,
  SpecialAttendanceStatus,
  Santri,
} from '../types';
import { getSantriList, getSantriByBarcode, logAudit } from './santriService';
import { getTodayDateString } from './attendanceService';

// ==============================================================================
// INITIAL SEED / MEMORY DATA (Fallback when Supabase is not connected)
// ==============================================================================

export const INITIAL_SPECIAL_EVENTS: SpecialEvent[] = [
  {
    id: 'e0000000-0000-0000-0000-000000000001',
    nama_kegiatan: 'PSG 2026 (Pendidikan Sistem Ganda / PKL)',
    jenis_kegiatan: 'PSG',
    tanggal_mulai: '2026-09-01',
    tanggal_selesai: '2026-10-31',
    lokasi: 'Dunia Usaha & Industri Mitra Pesantren (Surabaya)',
    keterangan: 'Praktik kerja industri santri tingkat MA/SMK di instansi mitra',
    jenis_absensi: 'BERANGKAT_KEMBALI',
    jam_batas_berangkat: '08:00',
    jam_batas_kembali: '17:00',
    status: 'AKTIF',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    peserta_count: 3,
  },
  {
    id: 'e0000000-0000-0000-0000-000000000002',
    nama_kegiatan: 'LDKS 2026 (Latihan Dasar Kepemimpinan Santri)',
    jenis_kegiatan: 'LDKS',
    tanggal_mulai: '2026-09-20',
    tanggal_selesai: '2026-09-22',
    lokasi: 'Bumi Perkemahan Outbound Trawas, Mojokerto',
    keterangan: 'Pelatihan kepemimpinan, kedisiplinan dan keorganisasian pengurus santri',
    jenis_absensi: 'BERANGKAT_KEMBALI',
    jam_batas_berangkat: '07:30',
    jam_batas_kembali: '18:00',
    status: 'AKTIF',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    peserta_count: 2,
  },
  {
    id: 'e0000000-0000-0000-0000-000000000003',
    nama_kegiatan: 'Musabaqah Qiraatil Kutub (MQK) Provinsi',
    jenis_kegiatan: 'Perlombaan',
    tanggal_mulai: '2026-09-25',
    tanggal_selesai: '2026-09-27',
    lokasi: 'Asrama Haji Sukolilo, Surabaya',
    keterangan: 'Delegasi santri lomba baca kitab kuning tingkat Jawa Timur',
    jenis_absensi: 'BERANGKAT_KEMBALI',
    jam_batas_berangkat: '07:00',
    jam_batas_kembali: '17:00',
    status: 'DRAFT',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    peserta_count: 1,
  },
];

export const INITIAL_PARTICIPANTS: SpecialEventParticipant[] = [
  // Participants for PSG 2026
  {
    id: 'p0000000-0000-0000-0000-000000000001',
    event_id: 'e0000000-0000-0000-0000-000000000001',
    santri_id: 'd0000000-0000-0000-0000-000000000001', // Muhammad Farhan Al-Ghifari
    atribut_khusus: 'PT Telkom Indonesia Witel Surabaya (Divisi IT)',
    catatan: 'Dosen Pembimbing: Ust. H. Fahrur Rozi, Lc.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'p0000000-0000-0000-0000-000000000002',
    event_id: 'e0000000-0000-0000-0000-000000000001',
    santri_id: 'd0000000-0000-0000-0000-000000000002', // Ahmad Dani Ramadhan
    atribut_khusus: 'Bank Syariah Indonesia (BSI) KCP Darmo',
    catatan: 'Bagian Administrasi & Pelayanan Nasabah',
    created_at: new Date().toISOString(),
  },
  {
    id: 'p0000000-0000-0000-0000-000000000003',
    event_id: 'e0000000-0000-0000-0000-000000000001',
    santri_id: 'd0000000-0000-0000-0000-000000000003', // Bilal Al-Habsyi
    atribut_khusus: 'Percetakan & Penerbitan Menara Ilmu Surabaya',
    catatan: 'Divisi Desain Grafis & Percetakan Kitab',
    created_at: new Date().toISOString(),
  },

  // Participants for LDKS 2026
  {
    id: 'p0000000-0000-0000-0000-000000000004',
    event_id: 'e0000000-0000-0000-0000-000000000002',
    santri_id: 'd0000000-0000-0000-0000-000000000004', // Siti Nur Haliza
    atribut_khusus: 'Regu Melati - Koordinator Acara',
    catatan: 'Pengurus OSIS Putri',
    created_at: new Date().toISOString(),
  },
  {
    id: 'p0000000-0000-0000-0000-000000000005',
    event_id: 'e0000000-0000-0000-0000-000000000002',
    santri_id: 'd0000000-0000-0000-0000-000000000005', // Fatimah Az-Zahra
    atribut_khusus: 'Regu Mawar - Koordinator Medis',
    catatan: 'Pengurus Kesehatan Putri',
    created_at: new Date().toISOString(),
  },
];

export const INITIAL_ATTENDANCE: SpecialAttendanceRecord[] = [
  {
    id: 'sa000000-0000-0000-0000-000000000001',
    event_id: 'e0000000-0000-0000-0000-000000000001',
    participant_id: 'p0000000-0000-0000-0000-000000000001',
    santri_id: 'd0000000-0000-0000-0000-000000000001',
    tanggal: '2026-09-18',
    waktu_berangkat: '2026-09-18T07:05:00+07:00',
    waktu_kembali: null,
    status: 'SUDAH_BERANGKAT',
    catatan: 'Berangkat tepat waktu naik sepeda motor',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'sa000000-0000-0000-0000-000000000002',
    event_id: 'e0000000-0000-0000-0000-000000000001',
    participant_id: 'p0000000-0000-0000-0000-000000000002',
    santri_id: 'd0000000-0000-0000-0000-000000000002',
    tanggal: '2026-09-18',
    waktu_berangkat: '2026-09-18T06:55:00+07:00',
    waktu_kembali: '2026-09-18T17:35:00+07:00',
    status: 'TERLAMBAT',
    catatan: 'Terlambat kembali 35 menit (Batas: 17:00 WIB)',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

let memoryEvents: SpecialEvent[] = [...INITIAL_SPECIAL_EVENTS];
let memoryParticipants: SpecialEventParticipant[] = [...INITIAL_PARTICIPANTS];
let memoryAttendance: SpecialAttendanceRecord[] = [...INITIAL_ATTENDANCE];

// ==============================================================================
// CRUD SPECIAL EVENTS
// ==============================================================================

export async function getSpecialEvents(filter?: {
  status?: SpecialEventStatus;
  jenis?: string;
  search?: string;
}): Promise<SpecialEvent[]> {
  if (isSupabaseConfigured()) {
    try {
      let query = supabase.from('special_events').select(`
        *,
        participants:special_event_participants (count)
      `);

      if (filter?.status) {
        query = query.eq('status', filter.status);
      }
      if (filter?.jenis && filter.jenis !== 'SEMUA') {
        query = query.eq('jenis_kegiatan', filter.jenis);
      }
      if (filter?.search) {
        const q = `%${filter.search}%`;
        query = query.or(`nama_kegiatan.ilike.${q},lokasi.ilike.${q},keterangan.ilike.${q}`);
      }

      query = query.order('tanggal_mulai', { ascending: false });

      const { data, error } = await query;
      if (!error && data) {
        return data.map((ev: any) => ({
          ...ev,
          peserta_count: ev.participants?.[0]?.count || 0,
        }));
      }
    } catch {
      // fallback
    }
  }

  // Memory fallback
  let list = [...memoryEvents];
  if (filter?.status) {
    list = list.filter((e) => e.status === filter.status);
  }
  if (filter?.jenis && filter.jenis !== 'SEMUA') {
    list = list.filter((e) => e.jenis_kegiatan === filter.jenis);
  }
  if (filter?.search) {
    const q = filter.search.toLowerCase();
    list = list.filter(
      (e) =>
        e.nama_kegiatan.toLowerCase().includes(q) ||
        e.lokasi.toLowerCase().includes(q) ||
        (e.keterangan && e.keterangan.toLowerCase().includes(q))
    );
  }

  // Populate participant count
  return list.map((e) => ({
    ...e,
    peserta_count: memoryParticipants.filter((p) => p.event_id === e.id).length,
  }));
}

export async function getSpecialEventById(id: string): Promise<SpecialEvent | null> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('special_events')
        .select('*')
        .eq('id', id)
        .single();
      if (!error && data) return data as SpecialEvent;
    } catch {
      // fallback
    }
  }
  return memoryEvents.find((e) => e.id === id) || null;
}

export async function createSpecialEvent(
  eventInput: Omit<SpecialEvent, 'id' | 'created_at' | 'updated_at' | 'peserta_count'>,
  participantInputs?: { santri_id: string; atribut_khusus?: string; catatan?: string }[]
): Promise<{ data: SpecialEvent | null; error: string | null }> {
  if (isSupabaseConfigured()) {
    try {
      const { data: evData, error: evError } = await supabase
        .from('special_events')
        .insert([
          {
            nama_kegiatan: eventInput.nama_kegiatan.trim(),
            jenis_kegiatan: eventInput.jenis_kegiatan,
            tanggal_mulai: eventInput.tanggal_mulai,
            tanggal_selesai: eventInput.tanggal_selesai,
            lokasi: eventInput.lokasi.trim(),
            keterangan: eventInput.keterangan?.trim() || null,
            jenis_absensi: eventInput.jenis_absensi,
            jam_batas_berangkat: eventInput.jam_batas_berangkat || null,
            jam_batas_kembali: eventInput.jam_batas_kembali || null,
            status: eventInput.status || 'AKTIF',
          },
        ])
        .select('*')
        .single();

      if (evError) return { data: null, error: evError.message };

      // Insert participants if provided
      if (participantInputs && participantInputs.length > 0) {
        const participantRows = participantInputs.map((p) => ({
          event_id: evData.id,
          santri_id: p.santri_id,
          atribut_khusus: p.atribut_khusus?.trim() || null,
          catatan: p.catatan?.trim() || null,
        }));

        await supabase.from('special_event_participants').insert(participantRows);
      }

      await logAudit({
        action: 'CREATE_SPECIAL_EVENT',
        tableName: 'special_events',
        recordId: evData.id,
        details: { nama: evData.nama_kegiatan, jenis: evData.jenis_kegiatan },
      });

      return { data: evData as SpecialEvent, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal membuat kegiatan khusus';
      return { data: null, error: msg };
    }
  }

  // Memory fallback
  const newId = `e-${Date.now()}`;
  const newEvent: SpecialEvent = {
    ...eventInput,
    id: newId,
    peserta_count: participantInputs ? participantInputs.length : 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  memoryEvents.unshift(newEvent);

  if (participantInputs && participantInputs.length > 0) {
    participantInputs.forEach((p, idx) => {
      memoryParticipants.push({
        id: `p-${Date.now()}-${idx}`,
        event_id: newId,
        santri_id: p.santri_id,
        atribut_khusus: p.atribut_khusus || null,
        catatan: p.catatan || null,
        created_at: new Date().toISOString(),
      });
    });
  }

  return { data: newEvent, error: null };
}

export async function updateSpecialEvent(
  id: string,
  updates: Partial<SpecialEvent>
): Promise<{ data: SpecialEvent | null; error: string | null }> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('special_events')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) return { data: null, error: error.message };
      return { data: data as SpecialEvent, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui kegiatan';
      return { data: null, error: msg };
    }
  }

  const idx = memoryEvents.findIndex((e) => e.id === id);
  if (idx === -1) return { data: null, error: 'Kegiatan tidak ditemukan' };

  memoryEvents[idx] = {
    ...memoryEvents[idx],
    ...updates,
    updated_at: new Date().toISOString(),
  };
  return { data: memoryEvents[idx], error: null };
}

export async function deleteSpecialEvent(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from('special_events').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus kegiatan';
      return { success: false, error: msg };
    }
  }

  memoryEvents = memoryEvents.filter((e) => e.id !== id);
  memoryParticipants = memoryParticipants.filter((p) => p.event_id !== id);
  memoryAttendance = memoryAttendance.filter((a) => a.event_id !== id);
  return { success: true, error: null };
}

// ==============================================================================
// EVENT PARTICIPANTS MANAGEMENT
// ==============================================================================

export async function getEventParticipants(
  eventId: string,
  tanggal?: string
): Promise<SpecialEventParticipant[]> {
  const activeTanggal = tanggal || getTodayDateString();

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('special_event_participants')
        .select(`
          *,
          santri:santri_id (
            *,
            kamar:kamar_id (*),
            kelas:kelas_id (*)
          )
        `)
        .eq('event_id', eventId);

      if (!error && data) {
        // Fetch attendance for these participants on activeTanggal
        const { data: attData } = await supabase
          .from('special_attendance')
          .select('*')
          .eq('event_id', eventId)
          .eq('tanggal', activeTanggal);

        const attMap = new Map<string, SpecialAttendanceRecord>();
        if (attData) {
          attData.forEach((a: SpecialAttendanceRecord) => attMap.set(a.participant_id, a));
        }

        return data.map((p: any) => ({
          ...p,
          latest_attendance: attMap.get(p.id) || null,
        }));
      }
    } catch {
      // fallback
    }
  }

  // Memory fallback
  const santriList = await getSantriList();
  const santriMap = new Map<string, Santri>();
  santriList.forEach((s) => santriMap.set(s.id, s));

  const participants = memoryParticipants.filter((p) => p.event_id === eventId);
  return participants.map((p) => {
    const att = memoryAttendance.find(
      (a) => a.participant_id === p.id && a.tanggal === activeTanggal
    );
    return {
      ...p,
      santri: santriMap.get(p.santri_id),
      latest_attendance: att || null,
    };
  });
}

export async function addParticipantsToEvent(
  eventId: string,
  participants: { santri_id: string; atribut_khusus?: string; catatan?: string }[]
): Promise<{ count: number; error: string | null }> {
  if (participants.length === 0) return { count: 0, error: null };

  if (isSupabaseConfigured()) {
    try {
      const rows = participants.map((p) => ({
        event_id: eventId,
        santri_id: p.santri_id,
        atribut_khusus: p.atribut_khusus?.trim() || null,
        catatan: p.catatan?.trim() || null,
      }));

      const { data, error } = await supabase
        .from('special_event_participants')
        .upsert(rows, { onConflict: 'event_id,santri_id' })
        .select('*');

      if (error) return { count: 0, error: error.message };
      return { count: data?.length || 0, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menambahkan peserta';
      return { count: 0, error: msg };
    }
  }

  // Memory fallback
  let added = 0;
  participants.forEach((p, idx) => {
    const exists = memoryParticipants.some(
      (mp) => mp.event_id === eventId && mp.santri_id === p.santri_id
    );
    if (!exists) {
      memoryParticipants.push({
        id: `p-${Date.now()}-${idx}`,
        event_id: eventId,
        santri_id: p.santri_id,
        atribut_khusus: p.atribut_khusus || null,
        catatan: p.catatan || null,
        created_at: new Date().toISOString(),
      });
      added++;
    }
  });

  return { count: added, error: null };
}

export async function removeParticipantFromEvent(
  participantId: string
): Promise<{ success: boolean; error: string | null }> {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('special_event_participants')
        .delete()
        .eq('id', participantId);
      if (error) return { success: false, error: error.message };
      return { success: true, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus peserta';
      return { success: false, error: msg };
    }
  }

  memoryParticipants = memoryParticipants.filter((p) => p.id !== participantId);
  memoryAttendance = memoryAttendance.filter((a) => a.participant_id !== participantId);
  return { success: true, error: null };
}

// ==============================================================================
// DEADLINE TIME UTILITIES & STATUS CALCULATION
// ==============================================================================

export function isTimeAfterHHMM(timeIso: string, deadlineHHMM?: string | null): boolean {
  if (!deadlineHHMM) return false;
  try {
    const d = new Date(timeIso);
    if (isNaN(d.getTime())) return false;
    const [dHours, dMinutes] = deadlineHHMM.split(':').map(Number);
    const hours = d.getHours();
    const minutes = d.getMinutes();
    if (hours > dHours) return true;
    if (hours === dHours && minutes > dMinutes) return true;
    return false;
  } catch {
    return false;
  }
}

export function isDateAndHourPast(dateStr: string, deadlineHHMM?: string | null): boolean {
  if (!deadlineHHMM) return false;
  try {
    const today = getTodayDateString();
    if (dateStr < today) {
      return true;
    }
    if (dateStr > today) {
      return false;
    }
    // Date is today
    const now = new Date();
    const [dHours, dMinutes] = deadlineHHMM.split(':').map(Number);
    const nowHours = now.getHours();
    const nowMinutes = now.getMinutes();
    if (nowHours > dHours) return true;
    if (nowHours === dHours && nowMinutes >= dMinutes) return true;
    return false;
  } catch {
    return false;
  }
}

export function getSpecialAttendanceStatusInfo(
  event: SpecialEvent,
  attendance?: SpecialAttendanceRecord | null,
  activeDate?: string
): {
  code: SpecialAttendanceStatus | 'TERLAMBAT_KEMBALI_BELUM_TIBA' | 'TERLAMBAT_BERANGKAT';
  label: string;
  badgeClass: string;
  detailText: string;
} {
  const tanggal = activeDate || getTodayDateString();
  const att = attendance;
  const isPastBerangkat = event.jam_batas_berangkat
    ? isDateAndHourPast(tanggal, event.jam_batas_berangkat)
    : false;
  const isPastKembali = event.jam_batas_kembali
    ? isDateAndHourPast(tanggal, event.jam_batas_kembali)
    : false;

  if (!att || !att.waktu_berangkat) {
    if (isPastBerangkat) {
      return {
        code: 'TIDAK_ABSEN',
        label: 'Tidak Absen',
        badgeClass: 'bg-rose-100 text-rose-800 border border-rose-300 font-bold',
        detailText: event.jam_batas_berangkat
          ? `Lewat batas berangkat (${event.jam_batas_berangkat} WIB)`
          : 'Belum ada absensi',
      };
    }
    return {
      code: 'BELUM_BERANGKAT',
      label: 'Belum Berangkat',
      badgeClass: 'bg-slate-100 text-slate-700 font-medium',
      detailText: 'Standby di pondok',
    };
  }

  // Has waktu_berangkat
  const isLateBerangkat =
    event.jam_batas_berangkat && isTimeAfterHHMM(att.waktu_berangkat, event.jam_batas_berangkat);

  if (!att.waktu_kembali) {
    // Already departed, not yet returned
    if (isPastKembali) {
      return {
        code: 'TERLAMBAT_KEMBALI_BELUM_TIBA',
        label: 'Terlambat Kembali (Belum Tiba)',
        badgeClass: 'bg-rose-100 text-rose-900 border border-rose-300 font-bold animate-pulse',
        detailText: `Melebihi batas kembali (${event.jam_batas_kembali} WIB)`,
      };
    }
    return {
      code: 'SUDAH_BERANGKAT',
      label: 'Sudah Berangkat',
      badgeClass: 'bg-amber-100 text-amber-800 font-bold',
      detailText: isLateBerangkat ? 'Terlambat berangkat' : 'Sedang di luar pondok',
    };
  }

  // Has waktu_kembali
  const isLateKembali =
    att.status === 'TERLAMBAT' ||
    (event.jam_batas_kembali && isTimeAfterHHMM(att.waktu_kembali, event.jam_batas_kembali));

  if (isLateKembali) {
    return {
      code: 'TERLAMBAT',
      label: 'Terlambat Kembali',
      badgeClass: 'bg-rose-100 text-rose-800 border border-rose-200 font-bold',
      detailText: `Kembali lewat batas (${event.jam_batas_kembali || '-'} WIB)`,
    };
  }

  if (isLateBerangkat) {
    return {
      code: 'TERLAMBAT_BERANGKAT',
      label: 'Sudah Kembali (Terlambat Berangkat)',
      badgeClass: 'bg-emerald-100 text-emerald-800 font-semibold',
      detailText: 'Kembali tepat waktu',
    };
  }

  return {
    code: 'SUDAH_KEMBALI',
    label: 'Sudah Kembali (Tepat Waktu)',
    badgeClass: 'bg-emerald-100 text-emerald-800 font-bold',
    detailText: 'Tepat waktu',
  };
}

// ==============================================================================
// EVENT DASHBOARD STATS
// ==============================================================================

export async function getEventDashboardStats(
  eventId: string,
  tanggal?: string
): Promise<SpecialEventDashboardStats> {
  const activeTanggal = tanggal || getTodayDateString();
  const [event, participants] = await Promise.all([
    getSpecialEventById(eventId),
    getEventParticipants(eventId, activeTanggal),
  ]);

  let belumBerangkat = 0;
  let tidakAbsen = 0;
  let sudahBerangkat = 0;
  let sudahKembali = 0;
  let belumKembali = 0;
  let terlambatKembali = 0;
  let terlambatBerangkat = 0;

  const belumKembaliList: {
    participant: SpecialEventParticipant;
    attendance?: SpecialAttendanceRecord;
    santri: Santri;
    isTerlambat: boolean;
  }[] = [];

  const tidakAbsenList: {
    participant: SpecialEventParticipant;
    santri: Santri;
  }[] = [];

  const isPastDepartureDeadline = event?.jam_batas_berangkat
    ? isDateAndHourPast(activeTanggal, event.jam_batas_berangkat)
    : false;

  const isPastReturnDeadline = event?.jam_batas_kembali
    ? isDateAndHourPast(activeTanggal, event.jam_batas_kembali)
    : false;

  participants.forEach((p) => {
    const att = p.latest_attendance;
    if (!att || !att.waktu_berangkat) {
      if (isPastDepartureDeadline) {
        tidakAbsen++;
        if (p.santri) {
          tidakAbsenList.push({
            participant: p,
            santri: p.santri,
          });
        }
      } else {
        belumBerangkat++;
      }
    } else if (att.waktu_berangkat && !att.waktu_kembali) {
      sudahBerangkat++;
      belumKembali++;
      const isLate = isPastReturnDeadline;
      if (isLate) {
        terlambatKembali++;
      }
      if (p.santri) {
        belumKembaliList.push({
          participant: p,
          attendance: att,
          santri: p.santri,
          isTerlambat: isLate,
        });
      }
    } else if (att.waktu_berangkat && att.waktu_kembali) {
      sudahKembali++;
      const isLate =
        att.status === 'TERLAMBAT' ||
        (event?.jam_batas_kembali && isTimeAfterHHMM(att.waktu_kembali, event.jam_batas_kembali));
      if (isLate) {
        terlambatKembali++;
      }
    }

    if (
      att?.waktu_berangkat &&
      event?.jam_batas_berangkat &&
      isTimeAfterHHMM(att.waktu_berangkat, event.jam_batas_berangkat)
    ) {
      terlambatBerangkat++;
    }
  });

  return {
    totalPeserta: participants.length,
    belumBerangkat,
    tidakAbsen,
    sudahBerangkat,
    sudahKembali,
    belumKembali,
    terlambatKembali,
    terlambatBerangkat,
    belumKembaliList,
    tidakAbsenList,
  };
}

// ==============================================================================
// ABSENSI SCAN CEPAT KEGIATAN KHUSUS & VALIDASI KETAT
// ==============================================================================

export interface ProcessSpecialAttendanceResult {
  success: boolean;
  message: string;
  actionTaken?: 'BERANGKAT' | 'KEMBALI';
  santri?: Santri;
  participant?: SpecialEventParticipant;
  attendance?: SpecialAttendanceRecord | null;
}

export async function processSpecialAttendanceScan(params: {
  eventId: string;
  barcodeOrIdYys: string;
  action: 'BERANGKAT' | 'KEMBALI' | 'AUTO';
  tanggal?: string;
  scannedBy?: string;
  catatan?: string;
}): Promise<ProcessSpecialAttendanceResult> {
  const code = params.barcodeOrIdYys.trim();
  const tanggal = params.tanggal || getTodayDateString();
  const nowIso = new Date().toISOString();

  // 1. Validasi Barcode / ID YYS
  const santri = await getSantriByBarcode(code);
  if (!santri) {
    return {
      success: false,
      message: 'ID YYS tidak ditemukan.',
    };
  }

  // 2. Validasi Peserta Kegiatan
  const participants = await getEventParticipants(params.eventId, tanggal);
  const participant = participants.find((p) => p.santri_id === santri.id);

  if (!participant) {
    return {
      success: false,
      santri,
      message: `Santri tidak terdaftar sebagai peserta kegiatan. (${santri.nama})`,
    };
  }

  // 3. Ambil / Inisialisasi Data Absensi
  let existingAttendance = participant.latest_attendance;

  // Determine Target Action if 'AUTO'
  let targetAction: 'BERANGKAT' | 'KEMBALI' = params.action === 'AUTO'
    ? (!existingAttendance || !existingAttendance.waktu_berangkat ? 'BERANGKAT' : 'KEMBALI')
    : params.action;

  // 4. Aturan Validasi Ketat Sesuai Spesifikasi:
  if (targetAction === 'BERANGKAT') {
    // Tidak boleh BERANGKAT dua kali
    if (existingAttendance && existingAttendance.waktu_berangkat) {
      const jamBerangkat = new Date(existingAttendance.waktu_berangkat).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      });
      return {
        success: false,
        santri,
        participant,
        attendance: existingAttendance,
        message: `Santri sudah tercatat berangkat pada pukul ${jamBerangkat} WIB.`,
      };
    }
  } else if (targetAction === 'KEMBALI') {
    // Tidak boleh KEMBALI sebelum BERANGKAT
    if (!existingAttendance || !existingAttendance.waktu_berangkat) {
      return {
        success: false,
        santri,
        participant,
        message: 'Santri belum tercatat berangkat.',
      };
    }

    // Tidak boleh KEMBALI dua kali
    if (existingAttendance.waktu_kembali) {
      const jamKembali = new Date(existingAttendance.waktu_kembali).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      });
      return {
        success: false,
        santri,
        participant,
        attendance: existingAttendance,
        message: `Santri sudah tercatat kembali pada pukul ${jamKembali} WIB.`,
      };
    }
  }

  // Check event deadlines
  const event = await getSpecialEventById(params.eventId);
  const deadlineBerangkat = event?.jam_batas_berangkat;
  const deadlineKembali = event?.jam_batas_kembali;

  const isLateDeparture = targetAction === 'BERANGKAT' && deadlineBerangkat
    ? isTimeAfterHHMM(nowIso, deadlineBerangkat)
    : false;

  const isLateReturn = targetAction === 'KEMBALI' && deadlineKembali
    ? isTimeAfterHHMM(nowIso, deadlineKembali)
    : false;

  // 5. Eksekusi Penyimpanan
  if (isSupabaseConfigured()) {
    try {
      if (targetAction === 'BERANGKAT') {
        const departureCatatan = [
          params.catatan?.trim(),
          isLateDeparture ? `Terlambat Berangkat (Batas: ${deadlineBerangkat} WIB)` : null,
        ].filter(Boolean).join(' • ') || null;

        const { data, error } = await supabase
          .from('special_attendance')
          .insert([
            {
              event_id: params.eventId,
              participant_id: participant.id,
              santri_id: santri.id,
              tanggal,
              waktu_berangkat: nowIso,
              status: 'SUDAH_BERANGKAT',
              catatan: departureCatatan,
            },
          ])
          .select('*')
          .single();

        if (error) return { success: false, santri, message: error.message };

        await logAudit({
          action: 'SCAN_EVENT_BERANGKAT',
          tableName: 'special_attendance',
          recordId: data.id,
          details: { santri: santri.nama, id_yys: santri.id_yys, terlambat: isLateDeparture },
        });

        const successMsg = isLateDeparture
          ? `Berhasil mencatat KEBERANGKATAN ${santri.nama} (Terlambat Berangkat — Batas: ${deadlineBerangkat} WIB).`
          : `Berhasil mencatat KEBERANGKATAN ${santri.nama}.`;

        return {
          success: true,
          actionTaken: 'BERANGKAT',
          santri,
          participant,
          attendance: data as SpecialAttendanceRecord,
          message: successMsg,
        };
      } else {
        // KEMBALI
        const returnStatus: SpecialAttendanceStatus = isLateReturn ? 'TERLAMBAT' : 'SUDAH_KEMBALI';
        const returnNote = isLateReturn ? `Terlambat Kembali (Batas: ${deadlineKembali} WIB)` : null;
        const returnCatatan = [
          existingAttendance?.catatan,
          params.catatan?.trim(),
          returnNote,
        ].filter(Boolean).join(' • ') || null;

        const { data, error } = await supabase
          .from('special_attendance')
          .update({
            waktu_kembali: nowIso,
            status: returnStatus,
            catatan: returnCatatan,
            updated_at: nowIso,
          })
          .eq('id', existingAttendance!.id)
          .select('*')
          .single();

        if (error) return { success: false, santri, message: error.message };

        await logAudit({
          action: 'SCAN_EVENT_KEMBALI',
          tableName: 'special_attendance',
          recordId: data.id,
          details: { santri: santri.nama, id_yys: santri.id_yys, status: returnStatus },
        });

        const returnMsg = isLateReturn
          ? `Berhasil mencatat KEPULANGAN ${santri.nama} (TERLAMBAT KEMBALI — Melewati Batas: ${deadlineKembali} WIB).`
          : `Berhasil mencatat KEPULANGAN ${santri.nama} (Tepat Waktu).`;

        return {
          success: true,
          actionTaken: 'KEMBALI',
          santri,
          participant,
          attendance: data as SpecialAttendanceRecord,
          message: returnMsg,
        };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan absensi event';
      return { success: false, santri, message: msg };
    }
  }

  // Memory fallback
  if (targetAction === 'BERANGKAT') {
    const departureCatatan = [
      params.catatan?.trim(),
      isLateDeparture ? `Terlambat Berangkat (Batas: ${deadlineBerangkat} WIB)` : null,
    ].filter(Boolean).join(' • ') || null;

    const newRecord: SpecialAttendanceRecord = {
      id: `sa-${Date.now()}`,
      event_id: params.eventId,
      participant_id: participant.id,
      santri_id: santri.id,
      tanggal,
      waktu_berangkat: nowIso,
      waktu_kembali: null,
      status: 'SUDAH_BERANGKAT',
      catatan: departureCatatan,
      created_at: nowIso,
      updated_at: nowIso,
    };
    memoryAttendance.push(newRecord);

    const successMsg = isLateDeparture
      ? `Berhasil mencatat KEBERANGKATAN ${santri.nama} (Terlambat Berangkat — Batas: ${deadlineBerangkat} WIB).`
      : `Berhasil mencatat KEBERANGKATAN ${santri.nama}.`;

    return {
      success: true,
      actionTaken: 'BERANGKAT',
      santri,
      participant,
      attendance: newRecord,
      message: successMsg,
    };
  } else {
    // KEMBALI
    const returnStatus: SpecialAttendanceStatus = isLateReturn ? 'TERLAMBAT' : 'SUDAH_KEMBALI';
    const returnNote = isLateReturn ? `Terlambat Kembali (Batas: ${deadlineKembali} WIB)` : null;
    const returnCatatan = [
      existingAttendance?.catatan,
      params.catatan?.trim(),
      returnNote,
    ].filter(Boolean).join(' • ') || null;

    const idx = memoryAttendance.findIndex((a) => a.id === existingAttendance!.id);
    if (idx !== -1) {
      memoryAttendance[idx] = {
        ...memoryAttendance[idx],
        waktu_kembali: nowIso,
        status: returnStatus,
        catatan: returnCatatan,
        updated_at: nowIso,
      };
      existingAttendance = memoryAttendance[idx];
    }

    const returnMsg = isLateReturn
      ? `Berhasil mencatat KEPULANGAN ${santri.nama} (TERLAMBAT KEMBALI — Melewati Batas: ${deadlineKembali} WIB).`
      : `Berhasil mencatat KEPULANGAN ${santri.nama} (Tepat Waktu).`;

    return {
      success: true,
      actionTaken: 'KEMBALI',
      santri,
      participant,
      attendance: existingAttendance,
      message: returnMsg,
    };
  }
}

/**
 * Mendapatkan ringkasan gabungan seluruh kegiatan khusus aktif hari ini
 * Termasuk rincian peserta, sudah berangkat, belum berangkat, sudah kembali, belum kembali,
 * serta santri PSG yang belum kembali.
 */
export async function getAllSpecialEventsSummary(dateStr?: string): Promise<{
  peserta: number;
  sudahBerangkat: number;
  belumBerangkat: number;
  sudahKembali: number;
  belumKembali: number;
  terlambat: number;
  psgBelumKembali: number;
  belumKembaliList: {
    santri: Santri;
    eventName: string;
    eventJenis: string;
    waktuBerangkat?: string | null;
    batasKembali?: string | null;
    isTerlambat: boolean;
  }[];
}> {
  const targetDate = dateStr || getTodayDateString();
  const allEvents = await getSpecialEvents();
  const activeEvents = allEvents.filter((e) => e.status === 'AKTIF');

  let totalPeserta = 0;
  let sudahBerangkat = 0;
  let sudahKembali = 0;
  let belumKembali = 0;
  let terlambat = 0;
  let psgBelumKembali = 0;
  const belumKembaliList: {
    santri: Santri;
    eventName: string;
    eventJenis: string;
    waktuBerangkat?: string | null;
    batasKembali?: string | null;
    isTerlambat: boolean;
  }[] = [];

  for (const event of activeEvents) {
    const participants = await getEventParticipants(event.id, targetDate);
    totalPeserta += participants.length;

    // Get attendance records for this event today
    let eventAttendance: SpecialAttendanceRecord[] = [];
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('special_attendance')
          .select(`*, santri:santri_id (*)`)
          .eq('event_id', event.id)
          .eq('tanggal', targetDate);
        if (!error && data) {
          eventAttendance = data as SpecialAttendanceRecord[];
        }
      } catch {
        // fallback
      }
    }
    if (eventAttendance.length === 0) {
      eventAttendance = memoryAttendance.filter(
        (a) => a.event_id === event.id && a.tanggal === targetDate
      );
    }

    const attendanceMap = new Map<string, SpecialAttendanceRecord>();
    eventAttendance.forEach((att) => {
      attendanceMap.set(att.santri_id, att);
    });

    participants.forEach((part: SpecialEventParticipant) => {
      if (!part.santri) return;
      const att = attendanceMap.get(part.santri_id);

      if (att) {
        if (att.waktu_kembali || att.status === 'SUDAH_KEMBALI') {
          sudahKembali++;
          if (att.status === 'TERLAMBAT') terlambat++;
        } else if (att.waktu_berangkat || att.status === 'SUDAH_BERANGKAT') {
          sudahBerangkat++;
          belumKembali++;
          if (event.jenis_kegiatan === 'PSG') psgBelumKembali++;

          // Check if late returning
          const now = new Date();
          let isLate = att.status === 'TERLAMBAT';
          if (event.jam_batas_kembali) {
            const [bH, bM] = event.jam_batas_kembali.split(':').map(Number);
            const deadline = new Date();
            deadline.setHours(bH || 17, bM || 0, 0, 0);
            if (now > deadline) isLate = true;
          }

          belumKembaliList.push({
            santri: part.santri,
            eventName: event.nama_kegiatan,
            eventJenis: event.jenis_kegiatan,
            waktuBerangkat: att.waktu_berangkat,
            batasKembali: event.jam_batas_kembali ? `${event.jam_batas_kembali} WIB` : null,
            isTerlambat: isLate,
          });
        }
      }
    });
  }

  const belumBerangkat = Math.max(0, totalPeserta - (sudahBerangkat + sudahKembali));

  return {
    peserta: totalPeserta,
    sudahBerangkat,
    belumBerangkat,
    sudahKembali,
    belumKembali,
    terlambat,
    psgBelumKembali,
    belumKembaliList,
  };
}

/**
 * Mengambil riwayat kegiatan khusus & PSG untuk 1 santri tertentu
 */
export async function getSantriSpecialEventsHistory(santriId: string): Promise<{
  participantRecords: SpecialEventParticipant[];
  attendanceRecords: SpecialAttendanceRecord[];
}> {
  const allEvents = await getSpecialEvents();
  const eventMap = new Map<string, SpecialEvent>();
  allEvents.forEach((e) => eventMap.set(e.id, e));

  let participantRecords: SpecialEventParticipant[] = [];
  let attendanceRecords: SpecialAttendanceRecord[] = [];

  if (isSupabaseConfigured()) {
    try {
      const [partRes, attRes] = await Promise.all([
        supabase.from('special_event_participants').select('*').eq('santri_id', santriId),
        supabase.from('special_attendance').select('*').eq('santri_id', santriId).order('tanggal', { ascending: false }),
      ]);

      if (!partRes.error && partRes.data) {
        participantRecords = partRes.data as SpecialEventParticipant[];
      }
      if (!attRes.error && attRes.data) {
        attendanceRecords = (attRes.data as SpecialAttendanceRecord[]).map((att) => ({
          ...att,
          event: eventMap.get(att.event_id),
        }));
      }
    } catch {
      // fallback
    }
  }

  if (participantRecords.length === 0) {
    participantRecords = memoryParticipants.filter((p) => p.santri_id === santriId);
  }
  if (attendanceRecords.length === 0) {
    attendanceRecords = memoryAttendance
      .filter((a) => a.santri_id === santriId)
      .map((att) => ({
        ...att,
        event: eventMap.get(att.event_id),
      }))
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  }

  return {
    participantRecords,
    attendanceRecords,
  };
}

