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
    kamar: 'Abu Bakar 1',
    kamar_id: 'a0000000-0000-0000-0000-000000000001',
    kelas_madin: 'Ula 1',
    rayon: 'Ula 1',
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
    kamar: 'Abu Bakar 1',
    kamar_id: 'a0000000-0000-0000-0000-000000000001',
    kelas_madin: 'Ula 1',
    rayon: 'Ula 1',
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
    kamar: 'Abu Bakar 2',
    kamar_id: 'a0000000-0000-0000-0000-000000000002',
    kelas_madin: 'Ula 2',
    rayon: 'Ula 2',
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
    kamar: 'Utsman 1',
    kamar_id: 'a0000000-0000-0000-0000-000000000003',
    kelas_madin: 'Wustho 1',
    rayon: 'Wustho 1',
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
    kamar: 'Khadijah 1',
    kamar_id: 'a0000000-0000-0000-0000-000000000004',
    kelas_madin: 'Ula 1',
    rayon: 'Ula 1',
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
    kamar: 'Khadijah 2',
    kamar_id: 'a0000000-0000-0000-0000-000000000005',
    kelas_madin: 'Ula 2',
    rayon: 'Ula 2',
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
  const kamarVal = typeof item.kamar === 'string' && item.kamar.trim()
    ? item.kamar.trim()
    : (item.kamar as any)?.nama_kamar || kamars.find((k) => k.id === item.kamar_id)?.nama_kamar || item.kamar || null;

  return {
    ...item,
    kamar: kamarVal,
    kelas_madin: item.kelas_madin || item.rayon || null,
    rayon: item.kelas_madin || item.rayon || null,
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
          kelas:kelas_id (*)
        `)
        .or(`barcode_value.ilike.${cleanBarcode},id_yys.ilike.${cleanBarcode},nis.ilike.${cleanBarcode}`)
        .maybeSingle();

      if (!error && data) {
        return {
          ...data,
          kelas_madin: data.kelas_madin || data.rayon,
          rayon: data.kelas_madin || data.rayon,
        } as Santri;
      }
    } catch {
      // fallback to memory
    }
  }

  // Memory fallback lookup
  const found = memorySantri.find(
    (s) =>
      s.barcode_value.toLowerCase() === cleanBarcode.toLowerCase() ||
      s.id_yys.toLowerCase() === targetIdYys.toLowerCase() ||
      (s.nis && s.nis.toLowerCase() === cleanBarcode.toLowerCase())
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
  kamar?: string;
  kelasMadin?: string;
  rayon?: string;
  status?: string;
  gender?: string;
}

export async function getSantriList(filters?: SantriFilterParams): Promise<Santri[]> {
  if (isSupabaseConfigured()) {
    try {
      let query = supabase.from('santri').select(`
        *,
        kelas:kelas_id (*),
        kamar_rel:kamar_id (*)
      `);

      if (filters?.query) {
        const q = `%${filters.query}%`;
        query = query.or(`nama.ilike.${q},id_yys.ilike.${q},barcode_value.ilike.${q},nis.ilike.${q}`);
      }
      if (filters?.kelasId) {
        query = query.eq('kelas_id', filters.kelasId);
      }
      if (filters?.kamar) {
        query = query.or(`kamar.eq.${filters.kamar},kamar_id.eq.${filters.kamar}`);
      } else if (filters?.kamarId && filters.kamarId !== 'SEMUA') {
        query = query.or(`kamar.eq.${filters.kamarId},kamar_id.eq.${filters.kamarId}`);
      }
      if (filters?.kelasMadin || filters?.rayon) {
        const madinVal = filters.kelasMadin || filters.rayon;
        if (madinVal && madinVal !== 'SEMUA') {
          query = query.or(`kelas_madin.eq.${madinVal},rayon.eq.${madinVal}`);
        }
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
        return (data as any[]).map((row) => {
          const resolvedKamar =
            (typeof row.kamar === 'string' && row.kamar.trim())
              ? row.kamar.trim()
              : (row.kamar_rel?.nama_kamar || (isValidUuid(row.kamar_id) ? null : row.kamar_id) || null);
          return {
            ...row,
            kamar: resolvedKamar,
            kelas_madin: row.kelas_madin || row.rayon,
            rayon: row.kelas_madin || row.rayon,
          };
        }) as Santri[];
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
  if (filters?.kamar) {
    results = results.filter(
      (s) => (typeof s.kamar === 'string' ? s.kamar : (s.kamar as any)?.nama_kamar) === filters.kamar
    );
  } else if (filters?.kamarId && filters.kamarId !== 'SEMUA') {
    results = results.filter(
      (s) =>
        s.kamar_id === filters.kamarId ||
        (typeof s.kamar === 'string' ? s.kamar : (s.kamar as any)?.nama_kamar) === filters.kamarId
    );
  }
  if (filters?.kelasMadin || filters?.rayon) {
    const madinVal = filters.kelasMadin || filters.rayon;
    if (madinVal && madinVal !== 'SEMUA') {
      results = results.filter(
        (s) => s.kelas_madin === madinVal || s.rayon === madinVal
      );
    }
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
          kelas:kelas_id (*)
        `)
        .or(`barcode_value.ilike.${clean},id_yys.ilike.${clean},nis.ilike.${clean}`)
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return {
          ...data,
          kelas_madin: data.kelas_madin || data.rayon,
          rayon: data.kelas_madin || data.rayon,
        } as Santri;
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

function formatDbError(errMessage: string): string {
  if (
    errMessage.toLowerCase().includes('row-level security') ||
    errMessage.toLowerCase().includes('violates row-level security policy')
  ) {
    return 'Izin database diblokir oleh Row-Level Security Supabase. Silakan jalankan skrip fix_rls.sql di Supabase SQL Editor (tersedia di menu Pengaturan > Supabase).';
  }
  return errMessage;
}

function isValidUuid(val?: string | null): boolean {
  return Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));
}

export async function createSantri(
  input: Omit<Santri, 'id' | 'created_at' | 'updated_at'>
): Promise<{ data: Santri | null; error: string | null }> {
  // Validate ID YYS uniqueness
  const cleanIdYys = input.id_yys.trim().toUpperCase();
  const cleanBarcode = input.barcode_value ? input.barcode_value.trim() : cleanIdYys;
  const cleanKamar = input.kamar ? String(input.kamar).trim() : null;
  const cleanMadin = (input.kelas_madin || input.rayon)?.trim() || null;

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
            kelas_id: isValidUuid(input.kelas_id) ? input.kelas_id : null,
            kamar: cleanKamar,
            kamar_id: isValidUuid(input.kamar_id) ? input.kamar_id : null,
            kelas_madin: cleanMadin,
            rayon: cleanMadin,
            status_santri: input.status_santri,
            barcode_value: cleanBarcode,
            nama_wali: input.nama_wali?.trim() || null,
            kontak_wali: input.kontak_wali?.trim() || null,
            alamat: input.alamat?.trim() || null,
          },
        ])
        .select(`
          *,
          kelas:kelas_id (*)
        `)
        .single();

      if (error) {
        return { data: null, error: formatDbError(error.message) };
      }
      return {
        data: {
          ...data,
          kelas_madin: data.kelas_madin || data.rayon,
          rayon: data.kelas_madin || data.rayon,
        } as Santri,
        error: null,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan santri ke database';
      return { data: null, error: formatDbError(msg) };
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
    kamar: cleanKamar,
    kelas_madin: cleanMadin,
    rayon: cleanMadin,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  memorySantri.unshift(newSantri);
  return { data: enrichSantri(newSantri, memoryKamar, memoryKelas), error: null };
}

export interface ImportSantriRow {
  id_yys: string;
  nama: string;
  nis?: string;
  jenis_kelamin: 'L' | 'P';
  kelas_id?: string | null;
  kamar?: string | null;
  kamar_id?: string | null;
  kelas_madin?: string | null;
  rayon?: string | null;
  status_santri?: StatusSantri;
  barcode_value?: string;
  nama_wali?: string;
  kontak_wali?: string;
  alamat?: string;
}

export interface ImportSantriResult {
  total: number;
  successCount: number;
  failedCount: number;
  errors: Array<{ row: number; id_yys?: string; message: string }>;
}

export async function importSantriBatch(
  rows: ImportSantriRow[],
  userEmail?: string
): Promise<ImportSantriResult> {
  const result: ImportSantriResult = {
    total: rows.length,
    successCount: 0,
    failedCount: 0,
    errors: [],
  };

  if (rows.length === 0) {
    return result;
  }

  // Pre-process and validate rows
  const validPayloads: Array<{
    id_yys: string;
    nama: string;
    nis: string | null;
    jenis_kelamin: 'L' | 'P';
    kelas_id: string | null;
    kamar: string | null;
    kamar_id: string | null;
    kelas_madin: string | null;
    rayon: string | null;
    status_santri: StatusSantri;
    barcode_value: string;
    nama_wali: string | null;
    kontak_wali: string | null;
    alamat: string | null;
    originalIndex: number;
  }> = [];

  const seenIds = new Set<string>();

  rows.forEach((row, idx) => {
    const rowNum = idx + 1;
    const cleanId = (row.id_yys || '').trim().toUpperCase();
    const cleanNama = (row.nama || '').trim();

    if (!cleanId) {
      result.failedCount++;
      result.errors.push({ row: rowNum, message: 'ID YYS wajib diisi.' });
      return;
    }

    if (!cleanNama) {
      result.failedCount++;
      result.errors.push({ row: rowNum, id_yys: cleanId, message: 'Nama santri wajib diisi.' });
      return;
    }

    if (seenIds.has(cleanId)) {
      result.failedCount++;
      result.errors.push({ row: rowNum, id_yys: cleanId, message: `Duplikasi ID YYS '${cleanId}' di dalam file import.` });
      return;
    }
    seenIds.add(cleanId);

    // Normalize gender
    let jk: 'L' | 'P' = 'L';
    const rawJk = (row.jenis_kelamin || '').trim().toUpperCase();
    if (rawJk === 'P' || rawJk === 'PEREMPUAN' || rawJk === 'WANITA') {
      jk = 'P';
    }

    // Normalize status
    let status: StatusSantri = 'Aktif';
    const rawStatus = (row.status_santri || '').trim();
    if (['Aktif', 'Izin', 'Sakit', 'Nonaktif', 'Lulus'].includes(rawStatus)) {
      status = rawStatus as StatusSantri;
    }

    const cleanKamar = (row.kamar || '').trim() || null;
    const cleanMadin = (row.kelas_madin || row.rayon || '').trim() || null;

    validPayloads.push({
      id_yys: cleanId,
      nama: cleanNama,
      nis: row.nis?.trim() || null,
      jenis_kelamin: jk,
      kelas_id: isValidUuid(row.kelas_id) ? row.kelas_id! : null,
      kamar: cleanKamar,
      kamar_id: isValidUuid(row.kamar_id) ? row.kamar_id! : null,
      kelas_madin: cleanMadin,
      rayon: cleanMadin,
      status_santri: status,
      barcode_value: row.barcode_value?.trim() || cleanId,
      nama_wali: row.nama_wali?.trim() || null,
      kontak_wali: row.kontak_wali?.trim() || null,
      alamat: row.alamat?.trim() || null,
      originalIndex: rowNum,
    });
  });

  if (validPayloads.length === 0) {
    return result;
  }

  // Auto-sync unique room names to public.kamar so dropdown filters and references are updated
  const uniqueRoomNames = Array.from(
    new Set(
      validPayloads
        .map((p) => p.kamar)
        .filter((k): k is string => Boolean(k && k.trim()))
    )
  );

  // If Supabase is configured, upsert rooms first then santri
  if (isSupabaseConfigured()) {
    if (uniqueRoomNames.length > 0) {
      try {
        const roomUpserts = uniqueRoomNames.map((rName) => ({
          nama_kamar: rName,
          gedung: 'Asrama Pondok',
          kapasitas: 20,
        }));
        await supabase.from('kamar').upsert(roomUpserts, { onConflict: 'nama_kamar' });

        const { data: dbRooms } = await supabase
          .from('kamar')
          .select('id, nama_kamar')
          .in('nama_kamar', uniqueRoomNames);

        if (dbRooms && dbRooms.length > 0) {
          const roomMap = new Map<string, string>();
          dbRooms.forEach((rm) => roomMap.set(rm.nama_kamar.toLowerCase().trim(), rm.id));
          validPayloads.forEach((p) => {
            if (p.kamar && !p.kamar_id) {
              const matchedId = roomMap.get(p.kamar.toLowerCase().trim());
              if (matchedId) {
                p.kamar_id = matchedId;
              }
            }
          });
        }
      } catch (kamarErr) {
        console.warn('Sync kamar to master table warning:', kamarErr);
      }
    }

    const CHUNK_SIZE = 50;
    for (let i = 0; i < validPayloads.length; i += CHUNK_SIZE) {
      const chunk = validPayloads.slice(i, i + CHUNK_SIZE);
      let dbPayloads = chunk.map(({ originalIndex, ...rest }) => rest);

      try {
        let { data, error } = await supabase
          .from('santri')
          .upsert(dbPayloads, { onConflict: 'id_yys' })
          .select('id, id_yys');

        // If error occurred because column 'kamar' does not exist yet in Supabase, retry without 'kamar'
        if (error && error.message && error.message.toLowerCase().includes('kamar') && error.message.toLowerCase().includes('does not exist')) {
          console.warn('Column kamar does not exist yet on public.santri, retrying with kamar_id only.');
          const fallbackPayloads = dbPayloads.map(({ kamar, ...rest }) => rest);
          const fallbackRes = await supabase
            .from('santri')
            .upsert(fallbackPayloads, { onConflict: 'id_yys' })
            .select('id, id_yys');
          data = fallbackRes.data;
          error = fallbackRes.error;
        }

        if (error) {
          // If bulk upsert failed, try item-by-item to salvage valid records
          for (const item of chunk) {
            const { originalIndex, ...singlePayload } = item;
            let { error: singleError } = await supabase
              .from('santri')
              .upsert([singlePayload], { onConflict: 'id_yys' });

            if (singleError && singleError.message && singleError.message.toLowerCase().includes('kamar') && singleError.message.toLowerCase().includes('does not exist')) {
              const { kamar, ...fallbackSingle } = singlePayload;
              const retryRes = await supabase
                .from('santri')
                .upsert([fallbackSingle], { onConflict: 'id_yys' });
              singleError = retryRes.error;
            }

            if (singleError) {
              result.failedCount++;
              result.errors.push({
                row: originalIndex,
                id_yys: singlePayload.id_yys,
                message: formatDbError(singleError.message),
              });
            } else {
              result.successCount++;
            }
          }
        } else {
          result.successCount += data ? data.length : chunk.length;
        }
      } catch (err: any) {
        result.failedCount += chunk.length;
        chunk.forEach((item) => {
          result.errors.push({
            row: item.originalIndex,
            id_yys: item.id_yys,
            message: formatDbError(err.message || 'Gagal menyimpan ke database Supabase.'),
          });
        });
      }
    }

    if (result.successCount > 0) {
      await logAudit({
        action: 'IMPORT_SANTRI_BATCH',
        tableName: 'santri',
        userEmail,
        details: { totalSuccess: result.successCount, totalFailed: result.failedCount },
      });
    }

    // Always synchronize in-memory state with imported santri and rooms
    validPayloads.forEach((item) => {
      const existingIdx = memorySantri.findIndex(
        (s) => s.id_yys.toUpperCase() === item.id_yys.toUpperCase()
      );
      if (existingIdx >= 0) {
        memorySantri[existingIdx] = {
          ...memorySantri[existingIdx],
          ...item,
          updated_at: new Date().toISOString(),
        };
      } else {
        memorySantri.unshift({
          id: `d-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          ...item,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    });

    uniqueRoomNames.forEach((rName) => {
      if (!memoryKamar.some((mk) => mk.nama_kamar.toLowerCase() === rName.toLowerCase())) {
        memoryKamar.push({
          id: rName,
          nama_kamar: rName,
          gedung: 'Asrama Pondok',
          kapasitas: 20,
        });
      }
    });

    return result;
  }

  // Memory fallback when Supabase is not configured
  validPayloads.forEach((item) => {
    const existingIdx = memorySantri.findIndex(
      (s) => s.id_yys.toUpperCase() === item.id_yys.toUpperCase()
    );
    if (existingIdx >= 0) {
      memorySantri[existingIdx] = {
        ...memorySantri[existingIdx],
        ...item,
        updated_at: new Date().toISOString(),
      };
    } else {
      memorySantri.unshift({
        id: `d-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ...item,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    result.successCount++;
  });

  uniqueRoomNames.forEach((rName) => {
    if (!memoryKamar.some((mk) => mk.nama_kamar.toLowerCase() === rName.toLowerCase())) {
      memoryKamar.push({
        id: rName,
        nama_kamar: rName,
        gedung: 'Asrama Pondok',
        kapasitas: 20,
      });
    }
  });

  return result;
}

export async function updateSantri(
  id: string,
  updates: Partial<Santri>
): Promise<{ data: Santri | null; error: string | null }> {
  if (isSupabaseConfigured()) {
    try {
      const payload: Record<string, unknown> = {
        nama: updates.nama,
        nis: updates.nis,
        jenis_kelamin: updates.jenis_kelamin,
        status_santri: updates.status_santri,
        barcode_value: updates.barcode_value,
        nama_wali: updates.nama_wali,
        kontak_wali: updates.kontak_wali,
        alamat: updates.alamat,
        updated_at: new Date().toISOString(),
      };

      if (updates.kelas_id !== undefined) {
        payload.kelas_id = isValidUuid(updates.kelas_id) ? updates.kelas_id : null;
      }
      if (updates.kamar !== undefined) {
        payload.kamar = updates.kamar ? String(updates.kamar).trim() : null;
      }
      if (updates.kamar_id !== undefined) {
        payload.kamar_id = isValidUuid(updates.kamar_id) ? updates.kamar_id : null;
      }
      if (updates.kelas_madin !== undefined || updates.rayon !== undefined) {
        const m = (updates.kelas_madin || updates.rayon)?.trim() || null;
        payload.kelas_madin = m;
        payload.rayon = m;
      }

      const { data, error } = await supabase
        .from('santri')
        .update(payload)
        .eq('id', id)
        .select(`
          *,
          kelas:kelas_id (*)
        `)
        .single();

      if (error) return { data: null, error: formatDbError(error.message) };
      return {
        data: {
          ...data,
          kelas_madin: data.kelas_madin || data.rayon,
          rayon: data.kelas_madin || data.rayon,
        } as Santri,
        error: null,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui santri';
      return { data: null, error: formatDbError(msg) };
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
      if (error) return { success: false, error: formatDbError(error.message) };
      return { success: true, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus santri';
      return { success: false, error: formatDbError(msg) };
    }
  }

  memorySantri = memorySantri.filter((s) => s.id !== id);
  return { success: true, error: null };
}

// ==============================================================================
// REFERENCE DATA QUERIES
// ==============================================================================

export async function getKamarList(): Promise<Kamar[]> {
  const roomMap = new Map<string, Kamar>();

  if (isSupabaseConfigured()) {
    try {
      // 1. Ambil dari master tabel public.kamar
      const { data: masterKamars, error: masterErr } = await supabase
        .from('kamar')
        .select('id, nama_kamar, gedung, kapasitas')
        .order('nama_kamar');

      if (!masterErr && masterKamars && masterKamars.length > 0) {
        masterKamars.forEach((km: any) => {
          if (km.nama_kamar && typeof km.nama_kamar === 'string' && km.nama_kamar.trim()) {
            const clean = km.nama_kamar.trim();
            roomMap.set(clean.toLowerCase(), {
              id: km.id || clean,
              nama_kamar: clean,
              gedung: km.gedung || 'Asrama Pondok',
              kapasitas: km.kapasitas || 20,
            });
          }
        });
      }

      // 2. Ambil juga dari kolom kamar langsung tabel santri
      const { data: santriKamars } = await supabase
        .from('santri')
        .select('kamar')
        .not('kamar', 'is', null);

      if (santriKamars && santriKamars.length > 0) {
        santriKamars.forEach((r: any) => {
          if (r.kamar && typeof r.kamar === 'string' && r.kamar.trim()) {
            const clean = r.kamar.trim();
            if (!roomMap.has(clean.toLowerCase())) {
              roomMap.set(clean.toLowerCase(), {
                id: clean,
                nama_kamar: clean,
                gedung: 'Asrama Pondok',
                kapasitas: 20,
              });
            }
          }
        });
      }
    } catch {
      // fallback
    }
  }

  // 3. Tambahkan juga dari memori/in-memory kamar & santri
  memoryKamar.forEach((km) => {
    if (km.nama_kamar && km.nama_kamar.trim()) {
      const clean = km.nama_kamar.trim();
      if (!roomMap.has(clean.toLowerCase())) {
        roomMap.set(clean.toLowerCase(), {
          id: km.id || clean,
          nama_kamar: clean,
          gedung: km.gedung || 'Asrama Pondok',
          kapasitas: km.kapasitas || 20,
        });
      }
    }
  });

  memorySantri.forEach((s) => {
    const km = typeof s.kamar === 'string' ? s.kamar : (s.kamar as any)?.nama_kamar;
    if (km && km.trim()) {
      const clean = km.trim();
      if (!roomMap.has(clean.toLowerCase())) {
        roomMap.set(clean.toLowerCase(), {
          id: clean,
          nama_kamar: clean,
          gedung: 'Asrama Pondok',
          kapasitas: 20,
        });
      }
    }
  });

  if (roomMap.size > 0) {
    return Array.from(roomMap.values()).sort((a, b) =>
      a.nama_kamar.localeCompare(b.nama_kamar, undefined, { numeric: true, sensitivity: 'base' })
    );
  }

  return memoryKamar;
}

/**
 * Mendapatkan daftar unik Kelas Madin dari data santri
 */
export async function getKelasMadinList(): Promise<string[]> {
  const madinSet = new Set<string>();

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('santri')
        .select('kelas_madin, rayon');

      if (!error && data && data.length > 0) {
        data.forEach((r: any) => {
          const val = r.kelas_madin || r.rayon;
          if (val && typeof val === 'string' && val.trim()) {
            madinSet.add(val.trim());
          }
        });
      }
    } catch {
      // fallback
    }
  }

  memorySantri.forEach((s) => {
    const val = s.kelas_madin || s.rayon;
    if (val && typeof val === 'string' && val.trim()) {
      madinSet.add(val.trim());
    }
  });

  return Array.from(madinSet).sort();
}

/**
 * Normalisasi string nama kamar untuk pencocokan cerdas
 * Menghilangkan prefix seperti 'kamar', 'kmr', 'km', spasi, tanda hubung, dan padding nol
 */
export function normalizeKamarName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/^(kamar|kmr\.?|km\.?|room)\s*/i, '')
    .replace(/[^a-z0-9]/g, '')
    .replace(/0+([1-9])/g, '$1')
    .trim();
}

/**
 * Pencocokan cerdas antara nama kamar di berkas upload dengan master kamar di Supabase
 */
export function matchKamarSmart(
  rawKamar: string,
  kamarList: Kamar[]
): { kamar?: Kamar; matchType: 'exact' | 'normalized' | 'fuzzy' | 'none' } {
  if (!rawKamar || !rawKamar.trim()) return { matchType: 'none' };
  const trimmed = rawKamar.trim();
  const lower = trimmed.toLowerCase();

  // 1. Exact match (case insensitive)
  const exact = kamarList.find((k) => k.nama_kamar.toLowerCase() === lower);
  if (exact) return { kamar: exact, matchType: 'exact' };

  // 2. Normalized match (e.g. "Kamar A-01" vs "A-1" vs "Kmr A1")
  const normRaw = normalizeKamarName(trimmed);
  if (normRaw) {
    const norm = kamarList.find((k) => normalizeKamarName(k.nama_kamar) === normRaw);
    if (norm) return { kamar: norm, matchType: 'normalized' };
  }

  // 3. Substring match
  const sub = kamarList.find((k) => {
    const kLower = k.nama_kamar.toLowerCase();
    return kLower.includes(lower) || lower.includes(kLower);
  });
  if (sub) return { kamar: sub, matchType: 'fuzzy' };

  // 4. Normalized substring
  if (normRaw && normRaw.length >= 2) {
    const normSub = kamarList.find((k) => {
      const kNorm = normalizeKamarName(k.nama_kamar);
      return kNorm && (kNorm.includes(normRaw) || normRaw.includes(kNorm));
    });
    if (normSub) return { kamar: normSub, matchType: 'fuzzy' };
  }

  return { matchType: 'none' };
}

/**
 * Tambah Kamar Baru ke Supabase / Memory
 */
export async function createKamar(
  input: {
    nama_kamar: string;
    gedung: string;
    kapasitas?: number;
    jenis_kelamin?: 'L' | 'P';
    keterangan?: string | null;
  },
  userEmail?: string
): Promise<{ success: boolean; data?: Kamar; error?: string }> {
  const cleanNama = input.nama_kamar.trim();
  const cleanGedung = input.gedung.trim() || 'Gedung Asrama';
  const kapasitas = input.kapasitas && input.kapasitas > 0 ? input.kapasitas : 8;
  const jk = input.jenis_kelamin === 'P' ? 'P' : 'L';

  if (!cleanNama) {
    return { success: false, error: 'Nama kamar wajib diisi' };
  }

  // Cek apakah sudah ada di memory
  const existingMem = memoryKamar.find((k) => k.nama_kamar.toLowerCase() === cleanNama.toLowerCase());
  if (existingMem) {
    return { success: true, data: existingMem };
  }

  const newKamar: Kamar = {
    id: `kamar-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    nama_kamar: cleanNama,
    gedung: cleanGedung,
    kapasitas,
    jenis_kelamin: jk,
    keterangan: input.keterangan || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      const payload: Record<string, any> = {
        nama_kamar: cleanNama,
        gedung: cleanGedung,
        kapasitas,
        jenis_kelamin: jk,
      };
      if (input.keterangan) payload.keterangan = input.keterangan;

      const { data, error } = await supabase.from('kamar').insert([payload]).select().single();
      if (!error && data) {
        memoryKamar.push(data as Kamar);
        await logAudit({
          action: 'CREATE_KAMAR',
          tableName: 'kamar',
          recordId: data.id,
          userEmail,
          details: data,
        });
        return { success: true, data: data as Kamar };
      } else if (error) {
        // Jika unique constraint triggered, ambil data kamar yang sudah ada
        const { data: existing } = await supabase
          .from('kamar')
          .select('*')
          .eq('nama_kamar', cleanNama)
          .maybeSingle();
        if (existing) {
          return { success: true, data: existing as Kamar };
        }
        return { success: false, error: error.message };
      }
    } catch {
      // fallback
    }
  }

  memoryKamar.push(newKamar);
  await logAudit({
    action: 'CREATE_KAMAR',
    tableName: 'kamar',
    recordId: newKamar.id,
    userEmail,
    details: newKamar as unknown as Record<string, unknown>,
  });
  return { success: true, data: newKamar };
}

/**
 * Hapus Kamar
 */
export async function deleteKamar(
  id: string,
  userEmail?: string
): Promise<{ success: boolean; error?: string }> {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from('kamar').delete().eq('id', id);
      if (error) {
        return { success: false, error: error.message };
      }
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  memoryKamar = memoryKamar.filter((k) => k.id !== id);
  await logAudit({
    action: 'DELETE_KAMAR',
    tableName: 'kamar',
    recordId: id,
    userEmail,
  });
  return { success: true };
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
