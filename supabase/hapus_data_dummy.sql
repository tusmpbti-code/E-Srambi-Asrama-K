-- ==============================================================================
-- PEMBERSIHAN DATA DUMMY / UJI COBA BAWAAN DARI DATABASE SUPABASE
-- ==============================================================================
-- Jalankan query ini di SQL Editor Supabase jika ingin menghapus seluruh data dummy / uji coba

-- 1. Hapus izin dummy dari tabel permissions
DELETE FROM public.permissions 
WHERE id LIKE 'e0000000-%'
   OR santri_id LIKE 'd0000000-%'
   OR dibuat_oleh = 'pengurus.asrama@pesantren.id';

-- 2. Hapus absensi dummy jika ada
DELETE FROM public.attendance 
WHERE santri_id LIKE 'd0000000-%';

-- 3. Hapus santri dummy bawaan template
DELETE FROM public.santri 
WHERE id LIKE 'd0000000-%'
   OR id_yys LIKE 'YYS20260012%'
   OR nis IN ('NIS2026001', 'NIS2026002', 'NIS2026003', 'NIS2026004', 'NIS2026005', 'NIS2026006')
   OR nama IN (
       'Muhammad Farhan Al-Ghifari',
       'Ahmad Dani Ramadhan',
       'Nabil Fikri Robbani',
       'Zayyan Arka Pratama',
       'Aisyah Putri Humaira',
       'Fatimah Zahra Al-Munawwaroh'
   );

-- 4. Hapus kamar dummy bawaan template dari master tabel kamar
DELETE FROM public.kamar 
WHERE id LIKE 'a0000000-%'
   OR nama_kamar IN (
       'Al-Ghazali 01',
       'Al-Ghazali 02',
       'Ibnu Sina 01',
       'Fathimah 01',
       'Aisyah 01',
       'Abu Bakar 1',
       'Abu Bakar 2',
       'Utsman 1',
       'Khadijah 1',
       'Khadijah 2'
   );

-- 5. Bersihkan nilai kamar pada santri jika ada yang tersisa dari dummy
UPDATE public.santri
SET kamar_id = NULL
WHERE kamar_id LIKE 'a0000000-%';

-- Selesai. Database kini hanya memuat data santri dan kamar asli hasil upload/input pengguna.
