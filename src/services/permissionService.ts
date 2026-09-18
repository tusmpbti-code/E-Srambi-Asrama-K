/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  SantriPermission,
  PermissionType,
  PermissionStatus,
  PermissionFilter,
  PermissionDashboardStats,
  Santri,
} from '../types';
import { getSantriList, getSantriByBarcode, updateSantriStatus, logAudit } from './santriService';

// Storage key for fallback local persistence
const STORAGE_KEY_PERMISSIONS = 'pesantren_permissions_records_v3';

// Initial seed data (mirrored from /supabase/seed.sql)
const INITIAL_PERMISSIONS: SantriPermission[] = [
  {
    id: 'e0000000-0000-0000-0000-000000000001',
    santri_id: 'd0000000-0000-0000-0000-000000000004', // Zayyan Arka Pratama
    jenis: 'IZIN_PULANG',
    alasan: 'Acara Walimatul Ursy Kakak Kandung',
    tujuan: 'Malang, Jawa Timur',
    tanggal_keluar: '2026-09-17',
    jam_keluar: '14:00:00',
    batas_kembali: '2026-09-19T17:00:00+07:00',
    waktu_kembali: null,
    penanggung_jawab: 'Drs. Supriyadi, M.M. (Ayah)',
    kontak_penanggung_jawab: '081222333444',
    catatan: 'Disertai surat undangan resmi keluarga',
    lampiran_url: null,
    status: 'SUDAH_KELUAR',
    dibuat_oleh: 'pengurus.asrama@pesantren.id',
    disetujui_oleh: 'admin@pesantren.id',
    created_at: '2026-09-17T13:45:00+07:00',
    updated_at: '2026-09-17T14:00:00+07:00',
  },
  {
    id: 'e0000000-0000-0000-0000-000000000002',
    santri_id: 'd0000000-0000-0000-0000-000000000003', // Nabil Fikri Robbani
    jenis: 'IZIN_KELUAR',
    alasan: 'Membeli Kitab Kuning & Keperluan Diniyah di Pasar',
    tujuan: 'Toko Kitab Menara Kudus, Surabaya',
    tanggal_keluar: '2026-09-18',
    jam_keluar: '08:30:00',
    batas_kembali: '2026-09-18T11:30:00+07:00',
    waktu_kembali: null,
    penanggung_jawab: 'Ust. Zulkifli Hasan, S.Ag.',
    kontak_penanggung_jawab: '081333444555',
    catatan: 'Izin keluar siang 3 jam',
    lampiran_url: null,
    status: 'SUDAH_KELUAR',
    dibuat_oleh: 'pengurus.asrama@pesantren.id',
    disetujui_oleh: 'pengurus.asrama@pesantren.id',
    created_at: '2026-09-18T08:15:00+07:00',
    updated_at: '2026-09-18T08:30:00+07:00',
  },
  {
    id: 'e0000000-0000-0000-0000-000000000003',
    santri_id: 'd0000000-0000-0000-0000-000000000002', // Ahmad Dani Ramadhan
    jenis: 'IZIN_PULANG',
    alasan: 'Kontrol Dokter Spesialis THT Rutin',
    tujuan: 'RSUD Sidoarjo',
    tanggal_keluar: '2026-09-18',
    jam_keluar: '13:00:00',
    batas_kembali: '2026-09-18T20:00:00+07:00',
    waktu_kembali: null,
    penanggung_jawab: 'Ir. H. Gunawan Wibisono (Wali)',
    kontak_penanggung_jawab: '081298765432',
    catatan: 'Menunggu konfirmasi persetujuan pengurus',
    lampiran_url: null,
    status: 'DIAJUKAN',
    dibuat_oleh: 'pengurus.asrama@pesantren.id',
    disetujui_oleh: null,
    created_at: '2026-09-18T09:00:00+07:00',
    updated_at: '2026-09-18T09:00:00+07:00',
  },
];

function loadLocalPermissions(): SantriPermission[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PERMISSIONS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return [...INITIAL_PERMISSIONS];
}

function saveLocalPermissions(items: SantriPermission[]) {
  try {
    localStorage.setItem(STORAGE_KEY_PERMISSIONS, JSON.stringify(items));
  } catch {
    // ignore
  }
}

/**
 * Mendapatkan daftar perizinan santri dengan filter
 */
export async function getPermissions(filter?: PermissionFilter): Promise<SantriPermission[]> {
  const santriList = await getSantriList();
  const santriMap = new Map<string, Santri>();
  santriList.forEach((s) => santriMap.set(s.id, s));

  let records: SantriPermission[] = [];

  if (isSupabaseConfigured()) {
    try {
      let query = supabase.from('permissions').select('*').order('created_at', { ascending: false });

      if (filter?.startDate) {
        query = query.gte('tanggal_keluar', filter.startDate);
      }
      if (filter?.endDate) {
        query = query.lte('tanggal_keluar', filter.endDate);
      }
      if (filter?.jenis && filter.jenis !== 'SEMUA') {
        query = query.eq('jenis', filter.jenis);
      }
      if (filter?.status && filter.status !== 'SEMUA') {
        query = query.eq('status', filter.status);
      }
      if (filter?.santriId) {
        query = query.eq('santri_id', filter.santriId);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (data && data.length > 0) {
        records = data.map((item) => ({
          ...item,
          santri: santriMap.get(item.santri_id) || null,
        }));
      }
    } catch (err) {
      console.warn('Supabase fetch permissions failed, using local storage fallback:', err);
      records = loadLocalPermissions().map((item) => ({
        ...item,
        santri: santriMap.get(item.santri_id) || null,
      }));
    }
  } else {
    records = loadLocalPermissions().map((item) => ({
      ...item,
      santri: santriMap.get(item.santri_id) || null,
    }));
  }

  // Client-side filtering for search query, class, room, and special flags
  return records.filter((rec) => {
    if (filter?.startDate && rec.tanggal_keluar < filter.startDate) return false;
    if (filter?.endDate && rec.tanggal_keluar > filter.endDate) return false;
    if (filter?.jenis && filter.jenis !== 'SEMUA' && rec.jenis !== filter.jenis) return false;
    if (filter?.status && filter.status !== 'SEMUA' && rec.status !== filter.status) return false;
    if (filter?.santriId && rec.santri_id !== filter.santriId) return false;

    if (filter?.kelasId && rec.santri?.kelas_id !== filter.kelasId) return false;
    if (filter?.kamarId && rec.santri?.kamar_id !== filter.kamarId) return false;

    if (filter?.onlyBelumKembali) {
      const isBelumKembali =
        (rec.status === 'SUDAH_KELUAR' || rec.status === 'DISETUJUI') && !rec.waktu_kembali;
      if (!isBelumKembali) return false;
    }

    if (filter?.onlyTerlambat) {
      const now = new Date();
      const batasTime = new Date(rec.batas_kembali);
      const isLate =
        rec.status === 'TERLAMBAT' ||
        (rec.status === 'SUDAH_KELUAR' && !rec.waktu_kembali && now > batasTime);
      if (!isLate) return false;
    }

    if (filter?.searchQuery) {
      const q = filter.searchQuery.toLowerCase().trim();
      const namaMatch = rec.santri?.nama?.toLowerCase().includes(q);
      const idMatch = rec.santri?.id_yys?.toLowerCase().includes(q);
      const alasanMatch = rec.alasan.toLowerCase().includes(q);
      const tujuanMatch = rec.tujuan.toLowerCase().includes(q);
      const waliMatch = rec.penanggung_jawab.toLowerCase().includes(q);
      if (!namaMatch && !idMatch && !alasanMatch && !tujuanMatch && !waliMatch) return false;
    }

    return true;
  });
}

/**
 * Mendapatkan detail perizinan berdasarkan ID
 */
export async function getPermissionById(id: string): Promise<SantriPermission | null> {
  const santriList = await getSantriList();
  const santriMap = new Map<string, Santri>();
  santriList.forEach((s) => santriMap.set(s.id, s));

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('permissions').select('*').eq('id', id).maybeSingle();
      if (!error && data) {
        return {
          ...data,
          santri: santriMap.get(data.santri_id) || null,
        };
      }
    } catch {
      // ignore
    }
  }

  const local = loadLocalPermissions().find((p) => p.id === id);
  if (local) {
    return {
      ...local,
      santri: santriMap.get(local.santri_id) || null,
    };
  }
  return null;
}

/**
 * Cek apakah santri memiliki izin aktif yang bertentangan
 * Status aktif: DIAJUKAN, DISETUJUI, SUDAH_KELUAR
 */
export async function getActivePermissionForSantri(
  santriId: string,
  excludeId?: string
): Promise<SantriPermission | null> {
  const all = await getPermissions();
  const active = all.find(
    (p) =>
      p.santri_id === santriId &&
      p.id !== excludeId &&
      ['DIAJUKAN', 'DISETUJUI', 'SUDAH_KELUAR'].includes(p.status)
  );
  return active || null;
}

export interface CreatePermissionInput {
  santri_id: string;
  jenis: PermissionType;
  alasan: string;
  tujuan: string;
  tanggal_keluar: string;
  jam_keluar: string;
  batas_kembali: string;
  penanggung_jawab: string;
  kontak_penanggung_jawab?: string;
  catatan?: string;
  lampiran_url?: string;
  status?: PermissionStatus; // Default: 'DIAJUKAN'
  dibuat_oleh?: string;
  disetujui_oleh?: string;
}

/**
 * Buat pengajuan perizinan baru
 * Aturan Penting:
 * - Santri tidak boleh mempunyai dua izin aktif yang bertentangan pada waktu yang sama.
 * - Jangan membuat izin duplikat.
 */
export async function createPermission(
  input: CreatePermissionInput,
  userEmail?: string
): Promise<{ success: boolean; data?: SantriPermission; error?: string }> {
  // 1. Validasi keberadaan santri
  const santriList = await getSantriList();
  const targetSantri = santriList.find((s) => s.id === input.santri_id);
  if (!targetSantri) {
    return { success: false, error: 'Data santri tidak ditemukan dalam sistem.' };
  }

  // 2. Validasi konflik izin aktif
  const conflicting = await getActivePermissionForSantri(input.santri_id);
  if (conflicting) {
    const jenisLabel = conflicting.jenis === 'IZIN_PULANG' ? 'Izin Pulang' : 'Izin Keluar';
    return {
      success: false,
      error: `Santri ${targetSantri.nama} (${targetSantri.id_yys}) sudah memiliki izin aktif (${jenisLabel} - Status: ${conflicting.status}) hingga ${new Date(
        conflicting.batas_kembali
      ).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}. Selesaikan atau batalkan izin sebelumnya terlebih dahulu!`,
    };
  }

  const initialStatus: PermissionStatus = input.status || 'DIAJUKAN';
  const nowStr = new Date().toISOString();

  const newRecord: SantriPermission = {
    id: `perm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    santri_id: input.santri_id,
    jenis: input.jenis,
    alasan: input.alasan.trim(),
    tujuan: input.tujuan.trim(),
    tanggal_keluar: input.tanggal_keluar,
    jam_keluar: input.jam_keluar,
    batas_kembali: input.batas_kembali,
    waktu_kembali: null,
    penanggung_jawab: input.penanggung_jawab.trim(),
    kontak_penanggung_jawab: input.kontak_penanggung_jawab?.trim() || null,
    catatan: input.catatan?.trim() || null,
    lampiran_url: input.lampiran_url || null,
    status: initialStatus,
    dibuat_oleh: input.dibuat_oleh || userEmail || 'Petugas',
    disetujui_oleh: input.disetujui_oleh || (initialStatus === 'DISETUJUI' ? userEmail || 'Pengurus' : null),
    created_at: nowStr,
    updated_at: nowStr,
    santri: targetSantri,
  };

  let savedRecord = newRecord;

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('permissions')
        .insert([
          {
            santri_id: newRecord.santri_id,
            jenis: newRecord.jenis,
            alasan: newRecord.alasan,
            tujuan: newRecord.tujuan,
            tanggal_keluar: newRecord.tanggal_keluar,
            jam_keluar: newRecord.jam_keluar,
            batas_kembali: newRecord.batas_kembali,
            penanggung_jawab: newRecord.penanggung_jawab,
            kontak_penanggung_jawab: newRecord.kontak_penanggung_jawab,
            catatan: newRecord.catatan,
            lampiran_url: newRecord.lampiran_url,
            status: newRecord.status,
            dibuat_oleh: newRecord.dibuat_oleh,
            disetujui_oleh: newRecord.disetujui_oleh,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        savedRecord = { ...data, santri: targetSantri };
      }
    } catch (err) {
      console.warn('Supabase insert permission failed, saving to local storage:', err);
      const local = loadLocalPermissions();
      local.unshift(newRecord);
      saveLocalPermissions(local);
    }
  } else {
    const local = loadLocalPermissions();
    local.unshift(newRecord);
    saveLocalPermissions(local);
  }

  // Jika izin langsung berstatus SUDAH_KELUAR, update status santri jadi 'Izin'
  if (savedRecord.status === 'SUDAH_KELUAR') {
    await updateSantriStatus(savedRecord.santri_id, 'Izin');
  }

  // Audit log
  await logAudit({
    action: 'CREATE_PERMISSION',
    tableName: 'permissions',
    recordId: savedRecord.id,
    userEmail: userEmail || input.dibuat_oleh || 'System',
    details: {
      santri_id: savedRecord.santri_id,
      santri_nama: targetSantri.nama,
      id_yys: targetSantri.id_yys,
      jenis: savedRecord.jenis,
      status: savedRecord.status,
      batas_kembali: savedRecord.batas_kembali,
    },
  });

  return { success: true, data: savedRecord };
}

/**
 * Update status perizinan (Setujui, Tolak, Keluar, Kembali, Selesai, Batalkan)
 */
export async function updatePermissionStatus(
  id: string,
  newStatus: PermissionStatus,
  options?: {
    waktu_kembali?: string;
    catatan?: string;
    disetujui_oleh?: string;
    userEmail?: string;
  }
): Promise<{ success: boolean; data?: SantriPermission; error?: string }> {
  const current = await getPermissionById(id);
  if (!current) {
    return { success: false, error: 'Data perizinan tidak ditemukan.' };
  }

  const nowStr = new Date().toISOString();
  const updatePayload: Partial<SantriPermission> = {
    status: newStatus,
    updated_at: nowStr,
  };

  if (options?.disetujui_oleh) {
    updatePayload.disetujui_oleh = options.disetujui_oleh;
  } else if (newStatus === 'DISETUJUI' && !current.disetujui_oleh) {
    updatePayload.disetujui_oleh = options?.userEmail || 'Pengurus Asrama';
  }

  if (options?.catatan !== undefined) {
    updatePayload.catatan = options.catatan;
  }

  if (options?.waktu_kembali) {
    updatePayload.waktu_kembali = options.waktu_kembali;
  } else if (['SUDAH_KEMBALI', 'TERLAMBAT', 'SELESAI'].includes(newStatus) && !current.waktu_kembali) {
    updatePayload.waktu_kembali = nowStr;
  }

  let updatedRecord: SantriPermission = {
    ...current,
    ...updatePayload,
  };

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('permissions')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (data) {
        updatedRecord = { ...data, santri: current.santri };
      }
    } catch (err) {
      console.warn('Supabase update permission failed, updating local storage:', err);
      const local = loadLocalPermissions().map((p) => (p.id === id ? updatedRecord : p));
      saveLocalPermissions(local);
    }
  } else {
    const local = loadLocalPermissions().map((p) => (p.id === id ? updatedRecord : p));
    saveLocalPermissions(local);
  }

  // Sinkronisasi status santri di master data
  if (newStatus === 'SUDAH_KELUAR') {
    await updateSantriStatus(current.santri_id, 'Izin');
  } else if (['SUDAH_KEMBALI', 'SELESAI', 'DIBATALKAN', 'DITOLAK'].includes(newStatus)) {
    // Kembalikan ke Aktif jika tidak ada izin aktif lain
    await updateSantriStatus(current.santri_id, 'Aktif');
  }

  // Audit log
  await logAudit({
    action: `UPDATE_PERMISSION_STATUS_${newStatus}`,
    tableName: 'permissions',
    recordId: id,
    userEmail: options?.userEmail || 'System',
    details: {
      old_status: current.status,
      new_status: newStatus,
      santri_id: current.santri_id,
      waktu_kembali: updatedRecord.waktu_kembali,
    },
  });

  return { success: true, data: updatedRecord };
}

/**
 * ALUR SANTRI KEMBALI VIA SCAN BARCODE
 * Ketika santri kembali, scan barcode:
 * 1. Barcode -> ID YYS -> Cari santri
 * 2. Sistem mencari izin aktif santri (status DISETUJUI atau SUDAH_KELUAR)
 * 3. Jika ditemukan: catat waktu_kembali
 *    - Jika melewati batas_kembali: status = TERLAMBAT
 *    - Jika sebelum/tepat batas: status = SUDAH_KEMBALI
 * 4. Jika tidak ada izin aktif: tampilkan peringatan
 */
export async function recordSantriReturnByBarcode(
  barcodeInput: string,
  userEmail?: string
): Promise<{
  success: boolean;
  isLate?: boolean;
  permission?: SantriPermission;
  santri?: Santri;
  message: string;
  error?: string;
}> {
  const cleanCode = barcodeInput.trim();
  if (!cleanCode) {
    return { success: false, message: 'Kode barcode tidak boleh kosong.', error: 'EMPTY_CODE' };
  }

  // 1. Cari santri via barcode atau ID YYS
  const santri = await getSantriByBarcode(cleanCode);
  if (!santri) {
    return {
      success: false,
      message: `Santri dengan Barcode/ID YYS "${cleanCode}" tidak ditemukan di database.`,
      error: 'NOT_FOUND',
    };
  }

  // 2. Cari izin aktif santri
  const allPermissions = await getPermissions({ santriId: santri.id });
  const activePermission = allPermissions.find((p) =>
    ['SUDAH_KELUAR', 'DISETUJUI'].includes(p.status)
  );

  if (!activePermission) {
    return {
      success: false,
      santri,
      message: `Peringatan: Santri ${santri.nama} (${santri.id_yys}) tidak memiliki izin aktif (Disetujui / Sedang Keluar)!`,
      error: 'NO_ACTIVE_PERMISSION',
    };
  }

  // 3. Evaluasi ketepatan waktu
  const now = new Date();
  const batasKembaliDate = new Date(activePermission.batas_kembali);
  const isLate = now.getTime() > batasKembaliDate.getTime();
  const newStatus: PermissionStatus = isLate ? 'TERLAMBAT' : 'SUDAH_KEMBALI';
  const nowIso = now.toISOString();

  // Hitung selisih waktu
  const diffMs = Math.abs(now.getTime() - batasKembaliDate.getTime());
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const diffText = diffHours > 0 ? `${diffHours} jam ${diffMins} menit` : `${diffMins} menit`;

  const lateNote = isLate
    ? `Terlambat kembali ${diffText} dari batas waktu (${batasKembaliDate.toLocaleString('id-ID', {
        dateStyle: 'short',
        timeStyle: 'short',
      })}).`
    : `Kembali tepat waktu (sisa ${diffText}).`;

  const updatedResult = await updatePermissionStatus(activePermission.id, newStatus, {
    waktu_kembali: nowIso,
    catatan: activePermission.catatan ? `${activePermission.catatan} | ${lateNote}` : lateNote,
    userEmail,
  });

  if (!updatedResult.success) {
    return {
      success: false,
      santri,
      permission: activePermission,
      message: updatedResult.error || 'Gagal memperbarui status kepulangan santri.',
      error: 'UPDATE_FAILED',
    };
  }

  const successMessage = isLate
    ? `PERHATIAN: ${santri.nama} (${santri.id_yys}) kembali TERLAMBAT ${diffText}! Status dicatat sebagai TERLAMBAT.`
    : `BERHASIL: Kepulangan ${santri.nama} (${santri.id_yys}) tercatat tepat waktu. Status: SUDAH KEMBALI.`;

  return {
    success: true,
    isLate,
    santri,
    permission: updatedResult.data,
    message: successMessage,
  };
}

/**
 * Catat keberangkatan/santri keluar via scan barcode
 */
export async function recordSantriDepartureByBarcode(
  barcodeInput: string,
  userEmail?: string
): Promise<{
  success: boolean;
  permission?: SantriPermission;
  santri?: Santri;
  message: string;
  error?: string;
}> {
  const cleanCode = barcodeInput.trim();
  if (!cleanCode) {
    return { success: false, message: 'Kode barcode tidak boleh kosong.', error: 'EMPTY_CODE' };
  }

  const santri = await getSantriByBarcode(cleanCode);
  if (!santri) {
    return {
      success: false,
      message: `Santri dengan Barcode/ID YYS "${cleanCode}" tidak ditemukan.`,
      error: 'NOT_FOUND',
    };
  }

  const allPermissions = await getPermissions({ santriId: santri.id });
  const approvedPermission = allPermissions.find((p) => p.status === 'DISETUJUI');

  if (!approvedPermission) {
    const alreadyOut = allPermissions.find((p) => p.status === 'SUDAH_KELUAR');
    if (alreadyOut) {
      return {
        success: false,
        santri,
        permission: alreadyOut,
        message: `Santri ${santri.nama} sudah berstatus SUDAH KELUAR sebelumnya.`,
        error: 'ALREADY_OUT',
      };
    }

    const pending = allPermissions.find((p) => p.status === 'DIAJUKAN');
    if (pending) {
      return {
        success: false,
        santri,
        permission: pending,
        message: `Izin santri ${santri.nama} masih berstatus DIAJUKAN dan belum disetujui pengurus!`,
        error: 'PENDING_APPROVAL',
      };
    }

    return {
      success: false,
      santri,
      message: `Santri ${santri.nama} tidak memiliki izin dengan status DISETUJUI.`,
      error: 'NO_APPROVED_PERMISSION',
    };
  }

  const res = await updatePermissionStatus(approvedPermission.id, 'SUDAH_KELUAR', { userEmail });
  if (res.success) {
    return {
      success: true,
      santri,
      permission: res.data,
      message: `Keberangkatan santri ${santri.nama} (${santri.id_yys}) berhasil dicatat. Status: SUDAH KELUAR.`,
    };
  }

  return {
    success: false,
    santri,
    message: res.error || 'Gagal mencatat keberangkatan santri.',
    error: 'UPDATE_FAILED',
  };
}

/**
 * Mendapatkan ringkasan statistik perizinan untuk Dashboard
 */
export async function getPermissionDashboardStats(): Promise<PermissionDashboardStats> {
  const all = await getPermissions();
  const todayStr = new Date().toISOString().split('T')[0];
  const now = new Date();

  let totalIzinHariIni = 0;
  let sedangKeluar = 0;
  let pulang = 0;
  let belumKembali = 0;
  let terlambat = 0;
  let menungguPersetujuan = 0;

  const belumKembaliList: SantriPermission[] = [];

  all.forEach((item) => {
    // Izin hari ini
    if (item.tanggal_keluar === todayStr || item.created_at.startsWith(todayStr)) {
      totalIzinHariIni++;
    }

    // Menunggu persetujuan
    if (item.status === 'DIAJUKAN') {
      menungguPersetujuan++;
    }

    // Sedang Keluar (IZIN_KELUAR)
    if (item.status === 'SUDAH_KELUAR' && item.jenis === 'IZIN_KELUAR') {
      sedangKeluar++;
    }

    // Santri Pulang (IZIN_PULANG)
    if (item.status === 'SUDAH_KELUAR' && item.jenis === 'IZIN_PULANG') {
      pulang++;
    }

    // Belum Kembali (status SUDAH_KELUAR atau DISETUJUI tanpa waktu kembali)
    if ((item.status === 'SUDAH_KELUAR' || item.status === 'DISETUJUI') && !item.waktu_kembali) {
      belumKembali++;
      belumKembaliList.push(item);
    }

    // Terlambat
    const batasDate = new Date(item.batas_kembali);
    const isOverdueNow =
      item.status === 'SUDAH_KELUAR' && !item.waktu_kembali && now > batasDate;
    if (item.status === 'TERLAMBAT' || isOverdueNow) {
      terlambat++;
    }
  });

  // Urutkan belumKembaliList: yang paling mendekati batas / yang sudah overdue di posisi paling atas
  belumKembaliList.sort((a, b) => new Date(a.batas_kembali).getTime() - new Date(b.batas_kembali).getTime());

  return {
    totalIzinHariIni,
    sedangKeluar,
    pulang,
    belumKembali,
    terlambat,
    menungguPersetujuan,
    belumKembaliList,
  };
}

/**
 * Hapus perizinan (Hanya Admin / Super Admin)
 */
export async function deletePermission(
  id: string,
  userEmail?: string
): Promise<{ success: boolean; error?: string }> {
  const current = await getPermissionById(id);

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from('permissions').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.warn('Supabase delete permission failed, removing locally:', err);
      const local = loadLocalPermissions().filter((p) => p.id !== id);
      saveLocalPermissions(local);
    }
  } else {
    const local = loadLocalPermissions().filter((p) => p.id !== id);
    saveLocalPermissions(local);
  }

  if (current) {
    await logAudit({
      action: 'DELETE_PERMISSION',
      tableName: 'permissions',
      recordId: id,
      userEmail: userEmail || 'System',
      details: {
        santri_id: current.santri_id,
        jenis: current.jenis,
      },
    });
  }

  return { success: true };
}

/**
 * Mengambil semua data perizinan untuk 1 santri tertentu
 */
export async function getSantriPermissionsHistory(santriId: string): Promise<SantriPermission[]> {
  const all = await getPermissions({ santriId });
  return all.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

