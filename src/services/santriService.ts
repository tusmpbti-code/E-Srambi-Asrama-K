/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Santri, Kelas, Kamar, Kegiatan, DashboardStats, StatusSantri } from '../types';

// ==============================================================================
// INITIAL REFERENCE DATA (Mirrored from /supabase/seed.sql)
// ==============================================================================
export const INITIAL_KAMAR: Kamar[] = [
  { id: 'a0000000-0000-0000-0000-000000000001', nama_kamar: 'Al-Ghazali 01', gedung: 'Gedung Umar bin Khattab', kapasitas: 12, keterangan: 'Santri MTs Putra' },
  { id: 'a0000000-0000-0000-0000-000000000002', nama_kamar: 'Al-Ghazali 02', gedung: 'Gedung Umar bin Khattab', kapasitas: 12, keterangan: 'Santri MTs Putra' },
  { id: 'a0000000-0000-0000-0000-000000000003', nama_kamar: 'Ibnu Sina 01', gedung: 'Gedung Abu Bakar Ash-Shiddiq', kapasitas: 14, keterangan: 'Santri MA Putra' },
  { id: 'a0000000-0000-0000-0000-000000000004', nama_kamar: 'Fathimah 01', gedung: 'Gedung Khadijah Al-Kubra', kapasitas: 10, keterangan: 'Santri Putri' },
  { id: 'a0000000-0000-0000-0000-000000000005', nama_kamar: 'Aisyah 01', gedung: 'Gedung Khadijah Al-Kubra', kapasitas: 10, keterangan: 'Santri Putri' },
];

export const INITIAL_KELAS: Kelas[] = [
  { id: 'b0000000-0000-0000-0000-000000000001', nama_kelas: 'Kelas 7-A MTs', tingkat: 'MTs', wali_kelas: 'Ust. Ahmad Dahlan, S.Pd.' },
  { id: 'b0000000-0000-0000-0000-000000000002', nama_kelas: 'Kelas 8-B MTs', tingkat: 'MTs', wali_kelas: 'Ust. Muhammad Rizqi, M.Pd.' },
  { id: 'b0000000-0000-0000-0000-000000000003', nama_kelas: 'Kelas 10-IPA MA', tingkat: 'MA', wali_kelas: 'Ust. H. Fahrur Rozi, Lc.' },
  { id: 'b0000000-0000-0000-0000-000000000004', nama_kelas: 'Madin Awaliyah 1', tingkat: 'Madin', wali_kelas: 'Ust. Syarif Hidayatullah' },
  { id: 'b0000000-0000-0000-0000-000000000005', nama_kelas: 'Madin Wustho 2', tingkat: 'Madin', wali_kelas: 'Ust. Zulkifli Hasan, S.Ag.' },
];

export const INITIAL_KEGIATAN: Kegiatan[] = [
  { id: 'c0000000-0000-0000-0000-000000000001', nama_kegiatan: 'Shalat Subuh Berjamaah & Wirid', kategori: 'Jamaah', waktu_mulai: '04:15', waktu_selesai: '05:15', lokasi: 'Masjid Utama Pesantren', deskripsi: 'Wajib bagi seluruh santri mukim', is_active: true },
  { id: 'c0000000-0000-0000-0000-000000000002', nama_kegiatan: 'Madrasah Diniyah Pagi', kategori: 'Madin', waktu_mulai: '05:30', waktu_selesai: '06:30', lokasi: 'Gedung Madin', deskripsi: 'Kajian kitab kuning matan jurumiyah', is_active: true },
  { id: 'c0000000-0000-0000-0000-000000000003', nama_kegiatan: 'Sekolah Formal Pagi', kategori: 'Sekolah', waktu_mulai: '07:15', waktu_selesai: '12:00', lokasi: 'Gedung Sekolah MTs/MA', deskripsi: 'Kurikulum formal kementerian agama', is_active: true },
  { id: 'c0000000-0000-0000-0000-000000000004', nama_kegiatan: 'Shalat Dzuhur Berjamaah', kategori: 'Jamaah', waktu_mulai: '12:05', waktu_selesai: '12:45', lokasi: 'Masjid Utama Pesantren', deskripsi: 'Wajib santri putra dan putri', is_active: true },
  { id: 'c0000000-0000-0000-0000-000000000005', nama_kegiatan: 'Shalat Ashar Berjamaah', kategori: 'Jamaah', waktu_mulai: '15:15', waktu_selesai: '15:50', lokasi: 'Masjid Utama Pesantren', deskripsi: 'Absensi jamaah ashar dan kultum sore', is_active: true },
  { id: 'c0000000-0000-0000-0000-000000000006', nama_kegiatan: 'Shalat Maghrib Berjamaah & Al-Quran', kategori: 'Jamaah', waktu_mulai: '18:00', waktu_selesai: '19:00', lokasi: 'Masjid Utama Pesantren', deskripsi: 'Tadarrus Al-Quran binnadzor dan tahsin', is_active: true },
  { id: 'c0000000-0000-0000-0000-000000000007', nama_kegiatan: 'Shalat Isya Berjamaah & Kajian Malam', kategori: 'Jamaah', waktu_mulai: '19:15', waktu_selesai: '20:15', lokasi: 'Masjid Utama Pesantren', deskripsi: 'Kajian kitab tafsir jalalain', is_active: true },
  { id: 'c0000000-0000-0000-0000-000000000008', nama_kegiatan: 'Apel Malam & Pengecekan Asrama', kategori: 'Asrama', waktu_mulai: '21:30', waktu_selesai: '22:00', lokasi: 'Halaman Asrama', deskripsi: 'Pengecekan santri di kamar masing-masing', is_active: true },
];

export const INITIAL_SANTRI: Santri[] = [
  {
    id: 'd0000000-0000-0000-0000-000000000001',
    id_yys: 'YYS202600123',
    nama: 'Muhammad Farhan Al-Ghifari',
    nis: 'NIS2026001',
    jenis_kelamin: 'L',
    kelas_id: 'b0000000-0000-0000-0000-000000000001',
    kamar_id: 'a0000000-0000-0000-0000-000000000001',
    rayon: 'Surabaya',
    status_santri: 'Aktif',
    barcode_value: 'YYS202600123',
    nama_wali: 'H. Bambang Sulistyo',
    kontak_wali: '081234567890',
    alamat: 'Jl. Rungkut Asri No. 12, Surabaya',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'd0000000-0000-0000-0000-000000000002',
    id_yys: 'YYS202600124',
    nama: 'Ahmad Dani Ramadhan',
    nis: 'NIS2026002',
    jenis_kelamin: 'L',
    kelas_id: 'b0000000-0000-0000-0000-000000000001',
    kamar_id: 'a0000000-0000-0000-0000-000000000001',
    rayon: 'Sidoarjo',
    status_santri: 'Aktif',
    barcode_value: 'YYS202600124',
    nama_wali: 'Ir. H. Gunawan Wibisono',
    kontak_wali: '081298765432',
    alamat: 'Pondok Jati Blok BC-14, Sidoarjo',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'd0000000-0000-0000-0000-000000000003',
    id_yys: 'YYS202600125',
    nama: 'Nabil Fikri Robbani',
    nis: 'NIS2026003',
    jenis_kelamin: 'L',
    kelas_id: 'b0000000-0000-0000-0000-000000000002',
    kamar_id: 'a0000000-0000-0000-0000-000000000002',
    rayon: 'Gresik',
    status_santri: 'Aktif',
    barcode_value: 'YYS202600125',
    nama_wali: 'K.H. Masduki Syahid',
    kontak_wali: '081333444555',
    alamat: 'Jl. KH. Kholil No. 45, Gresik',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'd0000000-0000-0000-0000-000000000004',
    id_yys: 'YYS202600126',
    nama: 'Zayyan Arka Pratama',
    nis: 'NIS2026004',
    jenis_kelamin: 'L',
    kelas_id: 'b0000000-0000-0000-0000-000000000003',
    kamar_id: 'a0000000-0000-0000-0000-000000000003',
    rayon: 'Malang',
    status_santri: 'Izin',
    barcode_value: 'YYS202600126',
    nama_wali: 'Drs. Supriyadi, M.M.',
    kontak_wali: '081222333444',
    alamat: 'Jl. Sulfat Indah No. 8, Malang',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'd0000000-0000-0000-0000-000000000005',
    id_yys: 'YYS202600127',
    nama: 'Aisyah Putri Humaira',
    nis: 'NIS2026005',
    jenis_kelamin: 'P',
    kelas_id: 'b0000000-0000-0000-0000-000000000001',
    kamar_id: 'a0000000-0000-0000-0000-000000000004',
    rayon: 'Kediri',
    status_santri: 'Aktif',
    barcode_value: 'YYS202600127',
    nama_wali: 'Hj. Siti Rohmah',
    kontak_wali: '081555666777',
    alamat: 'Jl. Dhoho No. 22, Kediri',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'd0000000-0000-0000-0000-000000000006',
    id_yys: 'YYS202600128',
    nama: 'Fatimah Zahra Al-Munawwaroh',
    nis: 'NIS2026006',
    jenis_kelamin: 'P',
    kelas_id: 'b0000000-0000-0000-0000-000000000002',
    kamar_id: 'a0000000-0000-0000-0000-000000000005',
    rayon: 'Jombang',
    status_santri: 'Sakit',
    barcode_value: 'YYS202600128',
    nama_wali: 'H. Moch. Yahya',
    kontak_wali: '081777888999',
    alamat: 'Cukir Gang 3 No. 10, Jombang',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Fallback runtime memory cache
let memorySantri: Santri[] = [...INITIAL_SANTRI];
let memoryKamar: Kamar[] = [...INITIAL_KAMAR];
let memoryKelas: Kelas[] = [...INITIAL_KELAS];
let memoryKegiatan: Kegiatan[] = [...INITIAL_KEGIATAN];

/**
 * Attach joined relation names to Santri records
 */
function enrichSantri(item: Santri, kamars: Kamar[], kelass: Kelas[]): Santri {
  return {
    ...item,
    kamar: kamars.find((k) => k.id === item.kamar_id) || null,
    kelas: kelass.find((k) => k.id === item.kelas_id) || null,
  };
}

// ==============================================================================
// BARCODE SERVICE IMPLEMENTATION
// ==============================================================================

/**
 * findSantriByBarcode()
 * Persyaratan: barcode -> ID YYS -> cari santri -> tampilkan data santri.
 * Menggunakan ID YYS sebagai identifier unik tanpa mengubah barcode fisik lama.
 */
export async function findSantriByBarcode(rawBarcode: string): Promise<Santri | null> {
  if (!rawBarcode) return null;
  const cleanBarcode = rawBarcode.trim();

  // Format ID YYS: Santri barcode holds their ID YYS directly (e.g. YYS202600123)
  const targetIdYys = cleanBarcode;

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('santri')
        .select(`
          *,
          kamar:kamar_id (*),
          kelas:kelas_id (*)
        `)
        .or(`barcode_value.eq.${cleanBarcode},id_yys.eq.${targetIdYys}`)
        .maybeSingle();

      if (!error && data) {
        return data as Santri;
      }
    } catch {
      // fallback to memory
    }
  }

  // Memory fallback lookup
  const found = memorySantri.find(
    (s) =>
      s.barcode_value.toLowerCase() === cleanBarcode.toLowerCase() ||
      s.id_yys.toLowerCase() === targetIdYys.toLowerCase()
  );

  return found ? enrichSantri(found, memoryKamar, memoryKelas) : null;
}

/**
 * Find santri strictly by ID YYS
 */
export async function findSantriByIdYYS(idYys: string): Promise<Santri | null> {
  return findSantriByBarcode(idYys);
}

// ==============================================================================
// SANTRI MASTER DATA CRUD
// ==============================================================================

export interface SantriFilterParams {
  query?: string;
  kelasId?: string;
  kamarId?: string;
  status?: string;
  gender?: string;
}

export async function getSantriList(filters?: SantriFilterParams): Promise<Santri[]> {
  if (isSupabaseConfigured()) {
    try {
      let query = supabase.from('santri').select(`
        *,
        kamar:kamar_id (*),
        kelas:kelas_id (*)
      `);

      if (filters?.query) {
        const q = `%${filters.query}%`;
        query = query.or(`nama.ilike.${q},id_yys.ilike.${q},barcode_value.ilike.${q},nis.ilike.${q}`);
      }
      if (filters?.kelasId) {
        query = query.eq('kelas_id', filters.kelasId);
      }
      if (filters?.kamarId) {
        query = query.eq('kamar_id', filters.kamarId);
      }
      if (filters?.status) {
        query = query.eq('status_santri', filters.status);
      }
      if (filters?.gender) {
        query = query.eq('jenis_kelamin', filters.gender);
      }

      query = query.order('nama', { ascending: true });

      const { data, error } = await query;
      if (!error && data) {
        return data as Santri[];
      }
    } catch {
      // fallback to memory
    }
  }

  // Memory fallback filtering
  let results = [...memorySantri];

  if (filters?.query) {
    const q = filters.query.toLowerCase().trim();
    results = results.filter(
      (s) =>
        s.nama.toLowerCase().includes(q) ||
        s.id_yys.toLowerCase().includes(q) ||
        s.barcode_value.toLowerCase().includes(q) ||
        (s.nis && s.nis.toLowerCase().includes(q))
    );
  }
  if (filters?.kelasId) {
    results = results.filter((s) => s.kelas_id === filters.kelasId);
  }
  if (filters?.kamarId) {
    results = results.filter((s) => s.kamar_id === filters.kamarId);
  }
  if (filters?.status) {
    results = results.filter((s) => s.status_santri === filters.status);
  }
  if (filters?.gender) {
    results = results.filter((s) => s.jenis_kelamin === filters.gender);
  }

  return results.map((s) => enrichSantri(s, memoryKamar, memoryKelas));
}

export async function getSantriByBarcode(code: string): Promise<Santri | null> {
  const clean = code.trim();
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('santri')
        .select(`
          *,
          kamar:kamar_id (*),
          kelas:kelas_id (*)
        `)
        .or(`barcode_value.eq.${clean},id_yys.eq.${clean},nis.eq.${clean}`)
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return data as Santri;
      }
    } catch {
      // fallback
    }
  }

  const s = memorySantri.find(
    (item) =>
      item.barcode_value.toLowerCase() === clean.toLowerCase() ||
      item.id_yys.toLowerCase() === clean.toLowerCase() ||
      (item.nis && item.nis.toLowerCase() === clean.toLowerCase())
  );
  return s ? enrichSantri(s, memoryKamar, memoryKelas) : null;
}

export async function updateSantriStatus(
  id: string,
  status: StatusSantri
): Promise<void> {
  await updateSantri(id, { status_santri: status });
}

export async function createSantri(
  input: Omit<Santri, 'id' | 'created_at' | 'updated_at'>
): Promise<{ data: Santri | null; error: string | null }> {
  // Validate ID YYS uniqueness
  const cleanIdYys = input.id_yys.trim().toUpperCase();
  const cleanBarcode = input.barcode_value ? input.barcode_value.trim() : cleanIdYys;

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('santri')
        .insert([
          {
            id_yys: cleanIdYys,
            nama: input.nama.trim(),
            nis: input.nis?.trim() || null,
            jenis_kelamin: input.jenis_kelamin,
            kelas_id: input.kelas_id || null,
            kamar_id: input.kamar_id || null,
            rayon: input.rayon?.trim() || null,
            status_santri: input.status_santri,
            barcode_value: cleanBarcode,
            nama_wali: input.nama_wali?.trim() || null,
            kontak_wali: input.kontak_wali?.trim() || null,
            alamat: input.alamat?.trim() || null,
          },
        ])
        .select(`
          *,
          kamar:kamar_id (*),
          kelas:kelas_id (*)
        `)
        .single();

      if (error) {
        return { data: null, error: error.message };
      }
      return { data: data as Santri, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan santri ke database';
      return { data: null, error: msg };
    }
  }

  // Memory validation
  const exists = memorySantri.some((s) => s.id_yys.toUpperCase() === cleanIdYys);
  if (exists) {
    return { data: null, error: `ID YYS '${cleanIdYys}' sudah terdaftar dalam sistem!` };
  }

  const newSantri: Santri = {
    ...input,
    id: `d-${Date.now()}`,
    id_yys: cleanIdYys,
    barcode_value: cleanBarcode,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  memorySantri.unshift(newSantri);
  return { data: enrichSantri(newSantri, memoryKamar, memoryKelas), error: null };
}

export async function updateSantri(
  id: string,
  updates: Partial<Santri>
): Promise<{ data: Santri | null; error: string | null }> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('santri')
        .update({
          nama: updates.nama,
          nis: updates.nis,
          jenis_kelamin: updates.jenis_kelamin,
          kelas_id: updates.kelas_id,
          kamar_id: updates.kamar_id,
          rayon: updates.rayon,
          status_santri: updates.status_santri,
          barcode_value: updates.barcode_value,
          nama_wali: updates.nama_wali,
          kontak_wali: updates.kontak_wali,
          alamat: updates.alamat,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(`
          *,
          kamar:kamar_id (*),
          kelas:kelas_id (*)
        `)
        .single();

      if (error) return { data: null, error: error.message };
      return { data: data as Santri, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui santri';
      return { data: null, error: msg };
    }
  }

  const idx = memorySantri.findIndex((s) => s.id === id);
  if (idx === -1) return { data: null, error: 'Data santri tidak ditemukan' };

  memorySantri[idx] = {
    ...memorySantri[idx],
    ...updates,
    updated_at: new Date().toISOString(),
  };

  return { data: enrichSantri(memorySantri[idx], memoryKamar, memoryKelas), error: null };
}

export async function deleteSantri(id: string): Promise<{ success: boolean; error: string | null }> {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from('santri').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus santri';
      return { success: false, error: msg };
    }
  }

  memorySantri = memorySantri.filter((s) => s.id !== id);
  return { success: true, error: null };
}

// ==============================================================================
// REFERENCE DATA QUERIES
// ==============================================================================

export async function getKamarList(): Promise<Kamar[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('kamar').select('*').order('nama_kamar');
      if (!error && data) return data as Kamar[];
    } catch {
      // fallback
    }
  }
  return memoryKamar;
}

export async function getKelasList(): Promise<Kelas[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('kelas').select('*').order('nama_kelas');
      if (!error && data) return data as Kelas[];
    } catch {
      // fallback
    }
  }
  return memoryKelas;
}

export async function getKegiatanList(): Promise<Kegiatan[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('kegiatan').select('*').order('waktu_mulai');
      if (!error && data) return data as Kegiatan[];
    } catch {
      // fallback
    }
  }
  return memoryKegiatan;
}

export async function createKegiatan(
  input: Omit<Kegiatan, 'id' | 'created_at' | 'updated_at'>,
  userEmail?: string
): Promise<{ success: boolean; data?: Kegiatan; error?: string }> {
  const newKegiatan: Kegiatan = {
    ...input,
    id: `keg-${Date.now()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('kegiatan').insert([input]).select().single();
      if (!error && data) {
        await logAudit({
          action: 'CREATE_KEGIATAN',
          tableName: 'kegiatan',
          recordId: data.id,
          userEmail,
          details: data,
        });
        return { success: true, data: data as Kegiatan };
      }
    } catch {
      // fallback
    }
  }

  memoryKegiatan.push(newKegiatan);
  await logAudit({
    action: 'CREATE_KEGIATAN',
    tableName: 'kegiatan',
    recordId: newKegiatan.id,
    userEmail,
    details: newKegiatan as unknown as Record<string, unknown>,
  });
  return { success: true, data: newKegiatan };
}


export async function logAudit(params: {
  action: string;
  tableName: string;
  recordId?: string;
  userEmail?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('audit_logs').insert([
        {
          action: params.action,
          table_name: params.tableName,
          record_id: params.recordId || null,
          user_email: params.userEmail || null,
          details: params.details || null,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch {
      // ignore
    }
  }
}

// ==============================================================================
// DASHBOARD STATS
// ==============================================================================

export async function getDashboardStats(): Promise<DashboardStats> {
  const santri = await getSantriList();
  const kegiatan = await getKegiatanList();
  const kamar = await getKamarList();
  const kelas = await getKelasList();

  const totalSantri = santri.length;
  const santriAktif = santri.filter((s) => s.status_santri === 'Aktif').length;
  const santriIzin = santri.filter((s) => s.status_santri === 'Izin').length;
  const santriSakit = santri.filter((s) => s.status_santri === 'Sakit').length;
  const santriNonaktif = santri.filter((s) => s.status_santri === 'Nonaktif').length;
  const santriLulus = santri.filter((s) => s.status_santri === 'Lulus').length;

  return {
    totalSantri,
    santriAktif,
    santriIzin,
    santriSakit,
    santriNonaktif,
    santriLulus,
    jumlahKegiatan: kegiatan.length,
    jumlahKamar: kamar.length,
    jumlahKelas: kelas.length,
    systemStatus: 'Online',
    isSupabaseConfigured: isSupabaseConfigured(),
  };
}
