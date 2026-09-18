# SISTEM ABSENSI & PERIZINAN SANTRI TERPADU

Aplikasi terpadu manajemen kehadiran, jadwal kegiatan, perizinan keluar/pulang, kegiatan khusus/PSG, pelaporan statistik, dan audit trail santri berbasis **React 19**, **TypeScript**, **Tailwind CSS**, **PostgreSQL**, dan **Supabase**.

---

## 1. Arsitektur & Spesifikasi Teknologi

- **Frontend Core**: React 19 + TypeScript (Strict Mode)
- **Styling**: Tailwind CSS (Clean, Modern Pesantren Theme)
- **Bundler & Tooling**: Vite 6
- **Database & Backend**: Supabase (PostgreSQL 15+) dengan Row Level Security (RLS)
- **Autentikasi & RBAC**: Supabase Auth terenkripsi + Multi-Role Access Control (6 Role)
- **Identifikasi Santri**: Berbasis **ID YYS unik** (`YYS...`) yang terhubung langsung dengan kartu barcode fisik dan kamera live scanner.
- **Kompatibilitas Deployment**: 100% siap untuk **GitHub Repository**, **Netlify Deployment (SPA)**, dan **Supabase Cloud Production**.

---

## 2. Fitur Utama Sistem

### 1. Dashboard Terpadu & Panel Alert
- Ringkasan statistik harian kondisi santri (Total Santri, Kehadiran Sekolah, Madin, Jamaah 5 Waktu).
- Ringkasan status perizinan (Menunggu, Disetujui, Sedang Keluar, Belum Kembali, Terlambat).
- Ringkasan status peserta kegiatan khusus & PSG luar pondok.
- **Panel Perlu Perhatian (Alerts)**: Notifikasi real-time santri belum kembali melewati batas waktu, peserta event belum check-in, absensi tertunda, dan pengajuan izin menunggu.

### 2. Master Data Santri & Barcode Fisik
- Pengelolaan santri lengkap: ID YYS unik, NIS, Kamar, Kelas, Rayon, Nama & Kontak Wali.
- Integrasi scanner barcode fisik USB dan kamera perangkat secara seragam.
- Filter cerdas berdasarkan kelas, kamar, status, dan pencarian cepat (`Ctrl+K`).

### 3. Modul Absensi Multi-Sesi Terpadu
- Absensi terjadwal: Sekolah Formal (MTs / MA), Madrasah Diniyah (Madin), dan Shalat Berjamaah 5 Waktu.
- Status absensi presisi: Hadir, Izin, Sakit, Alpa, Terlambat.
- Batch attendance dan pencatatan via barcode scanner instan.

### 4. Modul Perizinan & Pelacakan Kepulangan
- Pengajuan izin: Izin Keluar Singkat & Izin Pulang ke Rumah.
- Alur verifikasi bertingkat: Pengajuan $\rightarrow$ Persetujuan Petugas $\rightarrow$ Check-Out Keluar $\rightarrow$ Check-In Kembali via Barcode.
- Deteksi otomatis santri terlambat kembali (*overdue return tracking*).

### 5. Modul Kegiatan Khusus & PSG (Praktek Santri/PKL)
- Manajemen event luar pondok: PSG/PKL industri, LDKS, delegasi perlombaan, dan rihlah ilmiah.
- Pemantauan status peserta: Terdaftar, Berangkat, Kembali.

### 6. Pusat Laporan & Rekapitulasi Terpadu (10 Modul)
1. Laporan Harian Terpadu
2. Laporan Absensi Sekolah
3. Laporan Absensi Madin
4. Laporan Absensi Jamaah
5. Laporan Per Kelas
6. Laporan Per Kamar
7. Laporan Rekapitulasi Perizinan
8. Laporan Santri Terlambat Kembali
9. Laporan Kegiatan Khusus & PSG
10. Rekap Bulanan / Semester
- Seluruh laporan dilengkapi filter tanggal fleksibel dan tombol **Ekspor CSV / Excel**.

### 7. Pengaturan Sistem, RBAC & Petugas
- Profil institusi: Nama Pesantren, Pengasuh, Alamat, Kontak, Zona Waktu (WIB/WITA/WIT), Tahun Ajaran, Semester.
- Manajemen akun staf & petugas dengan 6 wewenang peran (Super Admin, Admin, Pengurus Asrama, Petugas Sekolah, Petugas Madin, Petugas Jamaah).
- **Audit Trail**: Catatan log aktivitas keamanan seluruh transaksi sistem.
- **Pusat Backup & Restore**: Ekspor seluruh database dalam satu berkas JSON terstruktur dan pemulihan instan tanpa kehilangan data.
- Pengujian koneksi Supabase live dan pemantauan status produksi.

---

## 3. Struktur Direktori Proyek

```
.
├── public/
│   ├── _redirects              # Netlify SPA fallback rule (/* /index.html 200)
│   └── ...
├── src/
│   ├── components/             # Komponen antarmuka per modul
│   │   ├── common/             # Unified scanner, global search modal
│   │   ├── santri/             # Komponen santri detail modal
│   │   ├── special-events/     # Komponen kegiatan khusus & PSG
│   │   ├── AbsensiView.tsx
│   │   ├── DashboardView.tsx
│   │   ├── KegiatanKhususView.tsx
│   │   ├── KegiatanView.tsx
│   │   ├── LaporanView.tsx
│   │   ├── PengaturanView.tsx   # Konfigurasi, pengguna, backup, audit
│   │   ├── PerizinanView.tsx
│   │   ├── SantriView.tsx
│   │   └── Sidebar.tsx
│   ├── context/                # AuthContext & State Manajemen
│   ├── lib/                    # Supabase Client, Roles & Permissions
│   ├── services/               # Lapisan logika data (Supabase & local cache)
│   │   ├── attendanceService.ts
│   │   ├── auditService.ts
│   │   ├── dashboardService.ts
│   │   ├── permissionService.ts
│   │   ├── reportService.ts
│   │   ├── santriService.ts
│   │   ├── settingsService.ts
│   │   └── specialEventService.ts
│   ├── types.ts                # Deklarasi tipe TypeScript global
│   ├── App.tsx                 # Root layout & navigasi
│   ├── main.tsx
│   └── index.css
├── supabase/
│   ├── schema.sql              # Skrip skema database Supabase PostgreSQL
│   └── seed.sql                # Data awal master & pengguna
├── .env.example                # Dokumentasi variabel lingkungan aman
├── .gitignore                  # Berkas pengecualian Git
├── netlify.toml                # Konfigurasi build & redirect Netlify
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 4. Persyaratan & Variabel Lingkungan

> **PENTING: JANGAN PERNAH MENYIMPAN SECRET KEY DI SOURCE CODE ATAU DI GITHUB REPOSITORY.**

Sistem membaca konfigurasi Supabase melalui environment variables standar Vite:

- `VITE_SUPABASE_URL`: URL project Supabase Anda (contoh: `https://xyzproject.supabase.co`)
- `VITE_SUPABASE_ANON_KEY`: Public anonymous API key Supabase Anda

Salin template berkas `.env.example` ke `.env` pada lingkungan lokal Anda:

```bash
cp .env.example .env
```

Isi variabel dengan kredensial project Supabase Anda:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
```

---

## 5. Menjalankan di Komputer Lokal

### 1. Instalasi Dependensi
```bash
npm install
```

### 2. Jalankan Mode Development
```bash
npm run dev
```
Aplikasi akan aktif pada `http://localhost:3000`.

### 3. Menjalankan Build Produksi
```bash
npm run build
```
Perintah ini akan melakukan type checking melalui `tsc` dan bundling via `vite build`.
Hasil build siap saji disimpan pada direktori:
```
dist/
```

---

## 6. Panduan Deployment ke Netlify

Aplikasi telah dilengkapi konfigurasi bawaan untuk deployment ke Netlify:

1. **Konfigurasi Build**:
   - Direktori Publish: `dist`
   - Perintah Build: `npm run build`
2. **SPA Routing Redirect**:
   - File `netlify.toml` dan `public/_redirects` memastikan aturan redirect `/* -> /index.html 200` aktif. Hal ini menjamin saat pengguna me-refresh halaman pada rute manapun, aplikasi tidak akan menghasilkan status 404 (Not Found).
3. **Environment Variables di Netlify**:
   - Buka menu **Site Configuration** $\rightarrow$ **Environment Variables** pada dashboard Netlify.
   - Tambahkan:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
4. **Deploy**:
   - Push repository ke GitHub dan sambungkan repositori dengan Netlify, atau gunakan perintah `netlify deploy --prod --dir=dist`.

---

## 7. Setup Database Supabase

1. Buka dashboard project di [supabase.com](https://supabase.com).
2. Masuk ke menu **SQL Editor**.
3. Buka berkas [`/supabase/schema.sql`](./supabase/schema.sql) pada repositori ini, salin seluruh kodenya, dan jalankan di SQL Editor Supabase untuk membuat seluruh tabel, enum, relasi, foreign keys, dan RLS policies.
4. (Opsional) Jalankan berkas [`/supabase/seed.sql`](./supabase/seed.sql) untuk mengisikan data master awal kamar, kelas, santri, dan jadwal kegiatan.
