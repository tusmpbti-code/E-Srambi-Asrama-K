-- ==============================================================================
-- MIGRATION: TAHAP 2 - SISTEM ABSENSI KEGIATAN HARIAN TERPADU
-- ==============================================================================
-- Menambahkan tabel attendance_records, unique constraint anti-duplikasi,
-- trigger updated_at, dan RLS policies berdasarkan role petugas.

DO $$ BEGIN
    CREATE TYPE attendance_status_type AS ENUM (
        'HADIR',
        'IZIN',
        'SAKIT',
        'ALPA',
        'TERLAMBAT'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    santri_id UUID NOT NULL REFERENCES public.santri(id) ON DELETE CASCADE,
    kegiatan_id UUID NOT NULL REFERENCES public.kegiatan(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL DEFAULT timezone('Asia/Jakarta', now())::date,
    sesi VARCHAR(50) NOT NULL DEFAULT 'Pagi', -- 'Pagi', 'Siang', 'Sore', 'Malam', 'Subuh', 'Dzuhur', etc.
    status attendance_status_type NOT NULL DEFAULT 'HADIR',
    waktu_absen TIME NOT NULL DEFAULT timezone('Asia/Jakarta', now())::time,
    petugas_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    petugas_nama VARCHAR(255),
    catatan TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now()),
    CONSTRAINT uq_attendance_santri_kegiatan_tanggal_sesi UNIQUE (santri_id, kegiatan_id, tanggal, sesi)
);

CREATE INDEX IF NOT EXISTS idx_attendance_tanggal ON public.attendance_records(tanggal);
CREATE INDEX IF NOT EXISTS idx_attendance_kegiatan ON public.attendance_records(kegiatan_id);
CREATE INDEX IF NOT EXISTS idx_attendance_santri ON public.attendance_records(santri_id);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON public.attendance_records(status);
CREATE INDEX IF NOT EXISTS idx_attendance_keg_tgl_sesi ON public.attendance_records(kegiatan_id, tanggal, sesi);

DROP TRIGGER IF EXISTS trg_attendance_records_updated_at ON public.attendance_records;
CREATE TRIGGER trg_attendance_records_updated_at
    BEFORE UPDATE ON public.attendance_records
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS: ATTENDANCE RECORDS
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated staff can view attendance records"
    ON public.attendance_records FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Staff can record attendance according to role permissions"
    ON public.attendance_records FOR INSERT
    TO authenticated
    WITH CHECK (
        public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN')
        OR (
            public.current_user_role() = 'PETUGAS_SEKOLAH'
            AND EXISTS (SELECT 1 FROM public.kegiatan k WHERE k.id = kegiatan_id AND k.kategori = 'Sekolah')
        )
        OR (
            public.current_user_role() = 'PETUGAS_MADIN'
            AND EXISTS (SELECT 1 FROM public.kegiatan k WHERE k.id = kegiatan_id AND k.kategori = 'Madin')
        )
        OR (
            public.current_user_role() = 'PETUGAS_JAMAAH'
            AND EXISTS (SELECT 1 FROM public.kegiatan k WHERE k.id = kegiatan_id AND k.kategori = 'Jamaah')
        )
        OR (
            public.current_user_role() = 'PENGURUS_ASRAMA'
            AND EXISTS (SELECT 1 FROM public.kegiatan k WHERE k.id = kegiatan_id AND k.kategori IN ('Asrama', 'Khusus'))
        )
    );

CREATE POLICY "Staff can update attendance status according to role permissions"
    ON public.attendance_records FOR UPDATE
    TO authenticated
    USING (
        public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN')
        OR (
            public.current_user_role() = 'PETUGAS_SEKOLAH'
            AND EXISTS (SELECT 1 FROM public.kegiatan k WHERE k.id = kegiatan_id AND k.kategori = 'Sekolah')
        )
        OR (
            public.current_user_role() = 'PETUGAS_MADIN'
            AND EXISTS (SELECT 1 FROM public.kegiatan k WHERE k.id = kegiatan_id AND k.kategori = 'Madin')
        )
        OR (
            public.current_user_role() = 'PETUGAS_JAMAAH'
            AND EXISTS (SELECT 1 FROM public.kegiatan k WHERE k.id = kegiatan_id AND k.kategori = 'Jamaah')
        )
        OR (
            public.current_user_role() = 'PENGURUS_ASRAMA'
            AND EXISTS (SELECT 1 FROM public.kegiatan k WHERE k.id = kegiatan_id AND k.kategori IN ('Asrama', 'Khusus'))
        )
    );

CREATE POLICY "Only Admins can delete attendance records"
    ON public.attendance_records FOR DELETE
    TO authenticated
    USING (public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN'));
