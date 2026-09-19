-- ==============================================================================
-- SCRIPT ROMBAK TABEL SANTRI & KAMAR SUPABASE
-- ==============================================================================
-- Script ini merombak tabel `public.santri` agar kolom `kamar` langsung tersimpan
-- secara permanen mengikuti file CSV/Excel yang diunggah (misal: "K - 04").
-- Data kamar tidak akan pernah diatur ulang / hilang kembali!
-- ==============================================================================

-- 1. Tambah kolom `kamar` langsung (tipe teks VARCHAR) ke tabel santri jika belum ada
ALTER TABLE public.santri ADD COLUMN IF NOT EXISTS kamar VARCHAR(100);

-- 2. Tambah kolom `kelas_nama` dan `kelas_madin` jika belum ada
ALTER TABLE public.santri ADD COLUMN IF NOT EXISTS kelas_nama VARCHAR(100);
ALTER TABLE public.santri ADD COLUMN IF NOT EXISTS kelas_madin VARCHAR(100);

-- 3. Pastikan foreign key kamar_id bersifat opsional (nullable) agar tidak memaksa UUID
ALTER TABLE public.santri ALTER COLUMN kamar_id DROP NOT NULL;
ALTER TABLE public.santri ALTER COLUMN kelas_id DROP NOT NULL;

-- 4. Sinkronisasi data kamar yang sudah ada dari relasi kamar_id (jika sebelumnya ada relasi)
UPDATE public.santri s
SET kamar = k.nama_kamar
FROM public.kamar k
WHERE s.kamar_id = k.id AND (s.kamar IS NULL OR s.kamar = '');

-- 5. Sinkronisasi rayon <-> kelas_madin agar data saling terisi
UPDATE public.santri
SET kelas_madin = rayon
WHERE (kelas_madin IS NULL OR kelas_madin = '') AND rayon IS NOT NULL;

UPDATE public.santri
SET rayon = kelas_madin
WHERE (rayon IS NULL OR rayon = '') AND kelas_madin IS NOT NULL;

-- 6. Buat indeks pencarian cepat untuk kolom kamar, kelas_madin, dan rayon
CREATE INDEX IF NOT EXISTS idx_santri_kamar ON public.santri(kamar);
CREATE INDEX IF NOT EXISTS idx_santri_kelas_madin ON public.santri(kelas_madin);
CREATE INDEX IF NOT EXISTS idx_santri_rayon ON public.santri(rayon);

-- 7. Trigger Otomatis: Setiap kali data santri diimpor atau diupdate dengan nama kamar (misal 'K - 04'):
--    - Otomatis mendaftarkan kamar tersebut ke tabel master `public.kamar` jika belum ada
--    - Mengaitkan `kamar_id` secara otomatis tanpa perlu diatur ulang manual
CREATE OR REPLACE FUNCTION public.sync_santri_kamar_to_master()
RETURNS TRIGGER AS $$
DECLARE
    v_kamar_id UUID;
    v_clean_kamar VARCHAR(100);
BEGIN
    v_clean_kamar := NULLIF(TRIM(NEW.kamar), '');
    
    IF v_clean_kamar IS NOT NULL THEN
        -- Pastikan kamar terdaftar di master tabel kamar (hindari duplicate)
        INSERT INTO public.kamar (nama_kamar, gedung, kapasitas)
        VALUES (v_clean_kamar, 'Asrama Pondok', 20)
        ON CONFLICT (nama_kamar) DO NOTHING;
        
        -- Dapatkan ID kamar dari master
        SELECT id INTO v_kamar_id FROM public.kamar WHERE LOWER(nama_kamar) = LOWER(v_clean_kamar) LIMIT 1;
        
        NEW.kamar_id := v_kamar_id;
        NEW.kamar := v_clean_kamar;
    END IF;

    -- Pastikan rayon dan kelas_madin saling terisi
    IF NEW.kelas_madin IS NOT NULL AND NEW.rayon IS NULL THEN
        NEW.rayon := NEW.kelas_madin;
    ELSIF NEW.rayon IS NOT NULL AND NEW.kelas_madin IS NULL THEN
        NEW.kelas_madin := NEW.rayon;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_santri_kamar ON public.santri;
CREATE TRIGGER trg_sync_santri_kamar
    BEFORE INSERT OR UPDATE OF kamar, rayon, kelas_madin ON public.santri
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_santri_kamar_to_master();

-- 8. Pastikan hak akses penuh terbuka untuk operasional santri & kamar
GRANT ALL ON public.santri TO anon, authenticated;
GRANT ALL ON public.kamar TO anon, authenticated;
