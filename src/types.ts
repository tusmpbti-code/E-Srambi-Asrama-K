/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'PENGURUS_ASRAMA'
  | 'PETUGAS_SEKOLAH'
  | 'PETUGAS_MADIN'
  | 'PETUGAS_JAMAAH'
  | 'PETUGAS_PERIZINAN';

export interface RoleInfo {
  code: UserRole;
  displayName: string;
  description: string;
  permissions: string[];
}

export type StatusSantri = 'Aktif' | 'Izin' | 'Sakit' | 'Nonaktif' | 'Lulus';
export type JenisKelamin = 'L' | 'P';

export interface Kelas {
  id: string;
  nama_kelas: string;
  tingkat: string;
  wali_kelas?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Kamar {
  id: string;
  nama_kamar: string;
  gedung: string;
  kapasitas: number;
  jenis_kelamin?: 'L' | 'P';
  keterangan?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Santri {
  id: string;
  id_yys: string; // Identifier unik utama pondok (contoh: YYS202600123)
  nama: string;
  nis?: string | null;
  jenis_kelamin: JenisKelamin;
  kelas_id?: string | null;
  kamar?: string | any | null; // Kolom langsung kamar di tabel santri (teks sesuai data yang di-import)
  kamar_id?: string | null; // Kompatibilitas mundur
  kelas_madin?: string | null; // Kolom Kelas Madin (pengganti rayon)
  rayon?: string | null; // Kompatibilitas mundur
  status_santri: StatusSantri;
  barcode_value: string; // Nilai scanner fisik (sama dengan ID YYS)
  nama_wali?: string | null;
  kontak_wali?: string | null;
  alamat?: string | null;
  created_at: string;
  updated_at: string;

  // Joined relations
  kelas?: Kelas | null;
}

/**
 * Helper untuk membaca nama kamar santri secara aman
 */
export const getSantriKamarText = (santri?: { kamar?: any; kamar_id?: any } | null): string => {
  if (!santri) return '-';
  if (typeof santri.kamar === 'string' && santri.kamar.trim()) return santri.kamar.trim();
  if (typeof santri.kamar === 'object' && santri.kamar?.nama_kamar) {
    return String(santri.kamar.nama_kamar).trim() || '-';
  }
  if (typeof santri.kamar_id === 'string' && santri.kamar_id.trim()) {
    // Jika kamar_id bukan format UUID, berarti nama kamar teks langsung (seperti 'K - 04')
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(santri.kamar_id.trim());
    if (!isUuid) {
      return santri.kamar_id.trim();
    }
  }
  return '-';
};

/**
 * Helper untuk membaca nama Kelas Madin santri secara aman
 */
export const getSantriMadinText = (santri?: { kelas_madin?: any; rayon?: any } | null): string => {
  if (!santri) return '-';
  const val = santri.kelas_madin || santri.rayon;
  return (val && String(val).trim()) ? String(val).trim() : '-';
};

export type KegiatanKategori = 'Jamaah' | 'Sekolah' | 'Madin' | 'Asrama' | 'Khusus';

export interface Kegiatan {
  id: string;
  nama_kegiatan: string;
  kategori: KegiatanKategori;
  waktu_mulai: string;
  waktu_selesai: string;
  lokasi?: string | null;
  deskripsi?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role_code: UserRole;
  phone?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string | null;
  user_email?: string | null;
  action: string;
  table_name?: string | null;
  record_id?: string | null;
  details?: Record<string, unknown> | null;
  ip_address?: string | null;
  created_at: string;
}

export interface CategoryAttendanceStat {
  hadir: number;
  izin: number;
  sakit: number;
  alpa: number;
  terlambat: number;
  belumAbsen: number;
  totalTarget: number;
  persentaseHadir: number;
  belumAbsenList?: Santri[];
}

export interface IntegratedDashboardAlert {
  id: string;
  type: 'danger' | 'warning' | 'info';
  title: string;
  count: number;
  description: string;
  actionLabel: string;
  targetMenu: ActiveNavMenu;
  filterPayload?: Record<string, unknown>;
}

export interface IntegratedDashboardData {
  totalSantri: number;
  santriAktif: number;
  santriIzin: number;
  santriSakit: number;
  santriNonaktif: number;
  santriLulus: number;

  // ABSENSI SEKOLAH
  sekolah: CategoryAttendanceStat;
  // ABSENSI MADIN
  madin: CategoryAttendanceStat;
  // ABSENSI JAMAAH
  jamaah: CategoryAttendanceStat;

  // PERIZINAN
  perizinan: {
    menunggu: number;
    disetujui: number;
    sedangKeluar: number;
    belumKembali: number;
    terlambat: number;
    totalHariIni: number;
    belumKembaliList?: SantriPermission[];
  };

  // KEGIATAN KHUSUS
  kegiatanKhusus: {
    peserta: number;
    sudahBerangkat: number;
    belumBerangkat: number;
    sudahKembali: number;
    belumKembali: number;
    terlambat: number;
    psgBelumKembali: number;
    belumKembaliList?: {
      santri: Santri;
      eventName: string;
      eventJenis: string;
      waktuBerangkat?: string | null;
      batasKembali?: string | null;
      isTerlambat: boolean;
    }[];
  };

  // ALERT: PERLU PERHATIAN
  alerts: IntegratedDashboardAlert[];
}

export interface DashboardStats {
  totalSantri: number;
  santriAktif: number;
  santriIzin: number;
  santriSakit: number;
  santriNonaktif: number;
  santriLulus: number;
  jumlahKegiatan: number;
  jumlahKamar: number;
  jumlahKelas: number;
  systemStatus: 'Online' | 'Offline' | 'Connecting';
  isSupabaseConfigured: boolean;

  // Stage 2 Live Attendance Stats
  totalSantriHadirHariIni?: number;
  totalSantriIzinHariIni?: number;
  totalSantriSakitHariIni?: number;
  totalSantriAlpaHariIni?: number;
  totalSantriTerlambatHariIni?: number;
  totalSantriBelumAbsenHariIni?: number;

  // Stage 3 Live Permissions Stats
  totalSantriSedangKeluar?: number;
  totalSantriPulang?: number;
  totalSantriBelumKembali?: number;
  totalSantriTerlambatKembali?: number;
  totalPengajuanMenungguPersetujuan?: number;
}

export type PermissionType = 'IZIN_PULANG' | 'IZIN_KELUAR';

export type PermissionStatus =
  | 'DIAJUKAN'
  | 'DISETUJUI'
  | 'DITOLAK'
  | 'SUDAH_KELUAR'
  | 'SUDAH_KEMBALI'
  | 'TERLAMBAT'
  | 'SELESAI'
  | 'DIBATALKAN';

export interface SantriPermission {
  id: string;
  santri_id: string;
  jenis: PermissionType;
  alasan: string;
  tujuan: string;
  tanggal_keluar: string; // YYYY-MM-DD
  jam_keluar: string; // HH:mm:ss
  batas_kembali: string; // ISO / YYYY-MM-DDTHH:mm
  waktu_kembali?: string | null; // ISO / YYYY-MM-DDTHH:mm
  penanggung_jawab: string;
  kontak_penanggung_jawab?: string | null;
  catatan?: string | null;
  lampiran_url?: string | null;
  status: PermissionStatus;
  dibuat_oleh?: string | null;
  disetujui_oleh?: string | null;
  created_at: string;
  updated_at: string;

  // Joined relations
  santri?: Santri | null;
}

export interface PermissionDashboardStats {
  totalIzinHariIni: number;
  sedangKeluar: number;
  pulang: number;
  belumKembali: number;
  terlambat: number;
  menungguPersetujuan: number;
  belumKembaliList: SantriPermission[];
}

export interface PermissionFilter {
  startDate?: string;
  endDate?: string;
  jenis?: PermissionType | 'SEMUA';
  status?: PermissionStatus | 'SEMUA';
  santriId?: string;
  kelasId?: string;
  kamarId?: string;
  searchQuery?: string;
  onlyBelumKembali?: boolean;
  onlyTerlambat?: boolean;
}

export type AttendanceStatus = 'HADIR' | 'IZIN' | 'SAKIT' | 'ALPA' | 'TERLAMBAT';

export interface AttendanceRecord {
  id: string;
  santri_id: string;
  kegiatan_id: string;
  tanggal: string; // YYYY-MM-DD
  sesi: string; // 'Pagi' | 'Siang' | 'Sore' | 'Malam' | etc.
  status: AttendanceStatus;
  waktu_absen: string; // HH:mm:ss
  petugas_id?: string | null;
  petugas_nama?: string | null;
  catatan?: string | null;
  created_at: string;
  updated_at: string;

  // Relations
  santri?: Santri | null;
  kegiatan?: Kegiatan | null;
}

export interface AttendanceSessionStats {
  totalSantri: number;
  hadir: number;
  izin: number;
  sakit: number;
  alpa: number;
  terlambat: number;
  belumAbsen: number;
  persentaseHadir: number;
}

export type ReportType =
  | 'harian'
  | 'sekolah'
  | 'madin'
  | 'jamaah'
  | 'perizinan'
  | 'belum_kembali'
  | 'psg'
  | 'kegiatan_khusus'
  | 'rekap_santri'
  | 'riwayat_santri'
  | 'kegiatan'
  | 'kelas'
  | 'kamar'
  | 'santri'
  | 'audit';

export interface ReportFilter {
  startDate: string;
  endDate: string;
  kegiatanId?: string;
  kelasId?: string;
  kamarId?: string;
  rayon?: string;
  santriId?: string;
  status?: string;
  searchQuery?: string;
}

export interface ReportSummaryRow {
  key: string;
  label: string;
  subLabel?: string;
  totalSesi: number;
  hadir: number;
  izin: number;
  sakit: number;
  alpa: number;
  terlambat: number;
  persentaseHadir: number;
}

export type ActiveNavMenu =
  | 'dashboard'
  | 'santri'
  | 'kegiatan'
  | 'absensi'
  | 'perizinan'
  | 'kegiatan_khusus'
  | 'laporan'
  | 'pengaturan';

// ==============================================================================
// TAHAP 4: SPECIAL EVENTS / KEGIATAN KHUSUS & PSG TYPES
// ==============================================================================

export type SpecialEventAttendanceType =
  | 'BERANGKAT_KEMBALI_MENGINAP'
  | 'SEKALI'
  | 'BERANGKAT_KEMBALI_HARIAN'
  | 'BERANGKAT_KEMBALI'
  | 'CHECKIN_CHECKOUT';

/**
 * 3 Pilihan Model Absensi Kegiatan Khusus Resmi Sesuai Kebutuhan:
 * 1. Berangkat dan Kembali Menginap
 * 2. Sekali (cek kehadiran saja)
 * 3. Berangkat dan Kembali setiap hari tanpa menginap
 */
export const SPECIAL_EVENT_ATTENDANCE_MODELS: {
  value: SpecialEventAttendanceType;
  label: string;
  description: string;
  isMenginap: boolean;
}[] = [
  {
    value: 'BERANGKAT_KEMBALI_MENGINAP',
    label: 'Berangkat dan Kembali Menginap',
    description: 'Santri absen saat berangkat dan absen kembali setelah periode menginap selesai (LDKS, Kemah, PSG Menginap, Lomba Luar Kota).',
    isMenginap: true,
  },
  {
    value: 'SEKALI',
    label: 'Sekali (cek kehadiran saja)',
    description: 'Satu kali absen/scan untuk mencatat kehadiran kegiatan (Apel, Kajian Akbar, Ujian, Lomba Internal).',
    isMenginap: false,
  },
  {
    value: 'BERANGKAT_KEMBALI_HARIAN',
    label: 'Berangkat dan Kembali setiap hari tanpa menginap',
    description: 'Santri absen berangkat dan kembali setiap hari tanpa menginap di luar pondok (PSG/PKL Harian, Praktik Kerja, Pelatihan Harian).',
    isMenginap: false,
  },
];

export const getSpecialEventAttendanceModelLabel = (type?: SpecialEventAttendanceType | string): string => {
  if (!type) return 'Berangkat dan Kembali Menginap';
  if (type === 'BERANGKAT_KEMBALI_MENGINAP' || type === 'BERANGKAT_KEMBALI') {
    return 'Berangkat dan Kembali Menginap';
  }
  if (type === 'SEKALI') {
    return 'Sekali (cek kehadiran saja)';
  }
  if (type === 'BERANGKAT_KEMBALI_HARIAN' || type === 'CHECKIN_CHECKOUT') {
    return 'Berangkat dan Kembali setiap hari tanpa menginap';
  }
  return type;
};

export type SpecialEventStatus = 'DRAFT' | 'AKTIF' | 'SELESAI' | 'DIBATALKAN';

export interface SpecialEvent {
  id: string;
  nama_kegiatan: string;
  jenis_kegiatan: string; // e.g. 'PSG', 'LDKS', 'Perlombaan', 'Praktik Lapangan', 'Kegiatan Luar', 'Lainnya'
  tanggal_mulai: string;
  tanggal_selesai: string;
  jam_berangkat?: string | null;       // Waktu jam berangkat dari pondok
  jam_kembali?: string | null;         // Waktu jam tiba kembali di pondok
  is_menginap?: boolean;               // Apakah kegiatan menginap (>= 1 malam)
  durasi_malam?: number;               // Jumlah malam menginap
  lokasi: string;
  keterangan?: string | null;
  jenis_absensi: SpecialEventAttendanceType;
  jam_batas_berangkat?: string | null; // e.g. '08:00' (Batas jam absen berangkat)
  jam_batas_kembali?: string | null;   // e.g. '17:00' (Batas jam absen kembali ke pondok)
  status: SpecialEventStatus;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  peserta_count?: number;
}

export interface SpecialEventParticipant {
  id: string;
  event_id: string;
  santri_id: string;
  atribut_khusus?: string | null; // e.g. Tempat PSG: "PT Telkom Surabaya", Kelompok: "Regu A"
  catatan?: string | null;
  created_at?: string;
  santri?: Santri;
  latest_attendance?: SpecialAttendanceRecord | null;
}

export type SpecialAttendanceStatus =
  | 'BELUM_BERANGKAT'
  | 'SUDAH_BERANGKAT'
  | 'SUDAH_KEMBALI'
  | 'TERLAMBAT'
  | 'TIDAK_ABSEN'
  | 'HADIR';

export interface SpecialAttendanceRecord {
  id: string;
  event_id: string;
  participant_id: string;
  santri_id: string;
  tanggal: string; // YYYY-MM-DD
  waktu_berangkat?: string | null; // ISO
  waktu_kembali?: string | null; // ISO
  status: SpecialAttendanceStatus;
  catatan?: string | null;
  scanned_by?: string | null;
  created_at?: string;
  updated_at?: string;
  santri?: Santri;
  event?: SpecialEvent;
}

export interface SpecialEventDashboardStats {
  totalPeserta: number;
  belumBerangkat: number;
  tidakAbsen: number;
  sudahBerangkat: number;
  sudahKembali: number;
  belumKembali: number;
  terlambatKembali: number;
  terlambatBerangkat: number;
  belumKembaliList: {
    participant: SpecialEventParticipant;
    attendance?: SpecialAttendanceRecord;
    santri: Santri;
    isTerlambat: boolean;
  }[];
  tidakAbsenList: {
    participant: SpecialEventParticipant;
    santri: Santri;
  }[];
}

