-- ==============================================================================
-- INITIAL SEED DATA - SISTEM ABSENSI & PERIZINAN SANTRI TERPADU
-- ==============================================================================

-- 1. SEED ROLES
INSERT INTO public.roles (code, display_name, description, permissions)
VALUES
    ('SUPER_ADMIN', 'Super Admin', 'Akses penuh ke seluruh modul sistem, database, pengaturan, dan manajemen pengguna', 
     '["manage_all", "view_all", "edit_santri", "delete_santri", "manage_roles", "manage_kegiatan", "audit_log"]'::jsonb),
    ('ADMIN', 'Admin', 'Manajemen data santri, jadwal kegiatan, absensi, perizinan, dan laporan', 
     '["view_all", "edit_santri", "manage_kegiatan", "view_reports", "manage_absensi", "manage_perizinan"]'::jsonb),
    ('PENGURUS_ASRAMA', 'Pengurus Asrama', 'Kelola perizinan santri asrama, absensi asrama, kegiatan khusus, dan PSG', 
     '["view_santri", "edit_asrama", "manage_perizinan", "view_kegiatan_asrama", "manage_psg"]'::jsonb),
    ('PETUGAS_SEKOLAH', 'Petugas Sekolah', 'Pencatatan dan verifikasi absensi santri di sekolah formal (MTs / MA)', 
     '["view_santri", "manage_absensi_sekolah"]'::jsonb),
    ('PETUGAS_MADIN', 'Petugas Madin', 'Pencatatan dan verifikasi absensi santri di Madrasah Diniyah', 
     '["view_santri", "manage_absensi_madin"]'::jsonb),
    ('PETUGAS_JAMAAH', 'Petugas Jamaah', 'Pencatatan absensi shalat berjamaah 5 waktu di masjid pesantren', 
     '["view_santri", "manage_absensi_jamaah"]'::jsonb)
ON CONFLICT (code) DO NOTHING;

-- 2. SEED KAMAR (ASRAMA)
INSERT INTO public.kamar (id, nama_kamar, gedung, kapasitas, keterangan)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Al-Ghazali 01', 'Gedung Umar bin Khattab', 12, 'Kamar Santri Putra Tingkat MTs'),
    ('a0000000-0000-0000-0000-000000000002', 'Al-Ghazali 02', 'Gedung Umar bin Khattab', 12, 'Kamar Santri Putra Tingkat MTs'),
    ('a0000000-0000-0000-0000-000000000003', 'Ibnu Sina 01', 'Gedung Abu Bakar Ash-Shiddiq', 14, 'Kamar Santri Putra Tingkat MA'),
    ('a0000000-0000-0000-0000-000000000004', 'Fathimah 01', 'Gedung Khadijah Al-Kubra', 10, 'Kamar Santri Putri'),
    ('a0000000-0000-0000-0000-000000000005', 'Aisyah 01', 'Gedung Khadijah Al-Kubra', 10, 'Kamar Santri Putri')
ON CONFLICT (nama_kamar) DO NOTHING;

-- 3. SEED KELAS
INSERT INTO public.kelas (id, nama_kelas, tingkat, wali_kelas)
VALUES
    ('b0000000-0000-0000-0000-000000000001', 'Kelas 7-A MTs', 'MTs', 'Ust. Ahmad Dahlan, S.Pd.'),
    ('b0000000-0000-0000-0000-000000000002', 'Kelas 8-B MTs', 'MTs', 'Ust. Muhammad Rizqi, M.Pd.'),
    ('b0000000-0000-0000-0000-000000000003', 'Kelas 10-IPA MA', 'MA', 'Ust. H. Fahrur Rozi, Lc.'),
    ('b0000000-0000-0000-0000-000000000004', 'Madin Awaliyah 1', 'Madin', 'Ust. Syarif Hidayatullah'),
    ('b0000000-0000-0000-0000-000000000005', 'Madin Wustho 2', 'Madin', 'Ust. Zulkifli Hasan, S.Ag.')
ON CONFLICT (nama_kelas, tingkat) DO NOTHING;

-- 4. SEED KEGIATAN
INSERT INTO public.kegiatan (id, nama_kegiatan, kategori, waktu_mulai, waktu_selesai, lokasi, deskripsi)
VALUES
    ('c0000000-0000-0000-0000-000000000001', 'Shalat Subuh Berjamaah & Wirid', 'Jamaah', '04:15:00', '05:15:00', 'Masjid Utama Pesantren', 'Wajib bagi seluruh santri mukim'),
    ('c0000000-0000-0000-0000-000000000002', 'Madrasah Diniyah Pagi', 'Madin', '05:30:00', '06:30:00', 'Gedung Madin', 'Kajian kitab kuning matan jurumiyah dan ta''lim muta''allim'),
    ('c0000000-0000-0000-0000-000000000003', 'Sekolah Formal Pagi', 'Sekolah', '07:15:00', '12:00:00', 'Gedung Sekolah MTs/MA', 'Pembelajaran kurikulum formal kementerian agama'),
    ('c0000000-0000-0000-0000-000000000004', 'Shalat Dzuhur Berjamaah', 'Jamaah', '12:05:00', '12:45:00', 'Masjid Utama Pesantren', 'Wajib santri putra dan putri'),
    ('c0000000-0000-0000-0000-000000000005', 'Shalat Ashar Berjamaah', 'Jamaah', '15:15:00', '15:50:00', 'Masjid Utama Pesantren', 'Absensi jamaah ashar dan kultum sore'),
    ('c0000000-0000-0000-0000-000000000006', 'Shalat Maghrib Berjamaah & Al-Qur''an', 'Jamaah', '18:00:00', '19:00:00', 'Masjid Utama Pesantren', 'Tadarrus Al-Qur''an binnadzor dan tahsin'),
    ('c0000000-0000-0000-0000-000000000007', 'Shalat Isya Berjamaah & Kajian Malam', 'Jamaah', '19:15:00', '20:15:00', 'Masjid Utama Pesantren', 'Kajian tafsir jalalain dan fiqih fathul qorib'),
    ('c0000000-0000-0000-0000-000000000008', 'Apel Malam & Pengecekan Asrama', 'Asrama', '21:30:00', '22:00:00', 'Halaman Tiap Asrama', 'Pengecekan santri di kamar masing-masing oleh pengurus')
ON CONFLICT DO NOTHING;

-- 5. SEED SANTRI DENGAN FORMAT BARCODE & ID YYS ASLI
INSERT INTO public.santri (
    id, id_yys, nama, nis, jenis_kelamin, kelas_id, kamar_id, rayon, status_santri, barcode_value, nama_wali, kontak_wali, alamat
) VALUES
    ('d0000000-0000-0000-0000-000000000001', 'YYS202600123', 'Muhammad Farhan Al-Ghifari', 'NIS2026001', 'L', 
     'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Surabaya', 'Aktif', 
     'YYS202600123', 'H. Bambang Sulistyo', '081234567890', 'Jl. Rungkut Asri No. 12, Surabaya'),

    ('d0000000-0000-0000-0000-000000000002', 'YYS202600124', 'Ahmad Dani Ramadhan', 'NIS2026002', 'L', 
     'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Sidoarjo', 'Aktif', 
     'YYS202600124', 'Ir. H. Gunawan Wibisono', '081298765432', 'Pondok Jati Blok BC-14, Sidoarjo'),

    ('d0000000-0000-0000-0000-000000000003', 'YYS202600125', 'Nabil Fikri Robbani', 'NIS2026003', 'L', 
     'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Gresik', 'Aktif', 
     'YYS202600125', 'K.H. Masduki Syahid', '081333444555', 'Jl. KH. Kholil No. 45, Gresik'),

    ('d0000000-0000-0000-0000-000000000004', 'YYS202600126', 'Zayyan Arka Pratama', 'NIS2026004', 'L', 
     'b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'Malang', 'Izin', 
     'YYS202600126', 'Drs. Supriyadi, M.M.', '081222333444', 'Jl. Sulfat Indah No. 8, Malang'),

    ('d0000000-0000-0000-0000-000000000005', 'YYS202600127', 'Aisyah Putri Humaira', 'NIS2026005', 'P', 
     'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'Kediri', 'Aktif', 
     'YYS202600127', 'Hj. Siti Rohmah', '081555666777', 'Jl. Dhoho No. 22, Kediri'),

    ('d0000000-0000-0000-0000-000000000006', 'YYS202600128', 'Fatimah Zahra Al-Munawwaroh', 'NIS2026006', 'P', 
     'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000005', 'Jombang', 'Sakit', 
     'YYS202600128', 'H. Moch. Yahya', '081777888999', 'Cukir Gang 3 No. 10, Jombang')
ON CONFLICT (id_yys) DO NOTHING;

-- 6. SEED PERMISSIONS (TAHAP 3)
INSERT INTO public.permissions (
    id, santri_id, jenis, alasan, tujuan, tanggal_keluar, jam_keluar, 
    batas_kembali, waktu_kembali, penanggung_jawab, kontak_penanggung_jawab, catatan, status, dibuat_oleh, disetujui_oleh
) VALUES
    ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000004', 'IZIN_PULANG', 
     'Acara Walimatul Ursy Kakak Kandung', 'Malang, Jawa Timur', '2026-09-17', '14:00:00', 
     '2026-09-19 17:00:00+07', NULL, 'Drs. Supriyadi, M.M. (Ayah)', '081222333444', 
     'Disertai surat undangan resmi keluarga', 'SUDAH_KELUAR', 'pengurus.asrama@pesantren.id', 'admin@pesantren.id'),

    ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000003', 'IZIN_KELUAR', 
     'Membeli Kitab Kuning & Keperluan Diniyah di Pasar', 'Toko Kitab Menara Kudus, Surabaya', '2026-09-18', '08:30:00', 
     '2026-09-18 11:30:00+07', NULL, 'Ust. Zulkifli Hasan, S.Ag.', '081333444555', 
     'Izin keluar siang 3 jam', 'SUDAH_KELUAR', 'pengurus.asrama@pesantren.id', 'pengurus.asrama@pesantren.id'),

    ('e0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000002', 'IZIN_PULANG', 
     'Kontrol Dokter Spesialis THT Rutin', 'RSUD Sidoarjo', '2026-09-18', '13:00:00', 
     '2026-09-18 20:00:00+07', NULL, 'Ir. H. Gunawan Wibisono (Wali)', '081298765432', 
     'Menunggu konfirmasi persetujuan pengurus', 'DIAJUKAN', 'pengurus.asrama@pesantren.id', NULL)
ON CONFLICT DO NOTHING;

