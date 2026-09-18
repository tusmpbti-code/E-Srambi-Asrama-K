-- ==============================================================================
-- SISTEM ABSENSI & PERIZINAN SANTRI TERPADU - DATABASE SCHEMA (SUPABASE POSTGRESQL)
-- ==============================================================================
-- Timezone Indonesia: Asia/Jakarta (WIB)

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
DO $$ BEGIN
    CREATE TYPE user_role_type AS ENUM (
        'SUPER_ADMIN',
        'ADMIN',
        'PENGURUS_ASRAMA',
        'PETUGAS_SEKOLAH',
        'PETUGAS_MADIN',
        'PETUGAS_JAMAAH'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE status_santri_type AS ENUM (
        'Aktif',
        'Izin',
        'Sakit',
        'Nonaktif',
        'Lulus'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE jenis_kelamin_type AS ENUM (
        'L',
        'P'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

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

-- 3. PERMISSIONS GRANT (Membuka akses ke role anon & authenticated)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated;

-- 4. ROLES TABLE
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code user_role_type UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now())
);

-- 5. PROFILES TABLE (Profil Petugas & Pengguna Sistem)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role_code user_role_type NOT NULL DEFAULT 'PETUGAS_JAMAAH',
    phone VARCHAR(30),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now())
);

-- 6. KAMAR TABLE (ASRAMA)
CREATE TABLE IF NOT EXISTS public.kamar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_kamar VARCHAR(100) NOT NULL UNIQUE,
    gedung VARCHAR(100) NOT NULL,
    kapasitas INTEGER NOT NULL DEFAULT 10,
    keterangan TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now())
);

-- 7. KELAS TABLE (SEKOLAH & MADIN)
CREATE TABLE IF NOT EXISTS public.kelas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_kelas VARCHAR(100) NOT NULL,
    tingkat VARCHAR(50) NOT NULL, -- e.g., 'MTs', 'MA', 'Madin Ula', 'Madin Wustho'
    wali_kelas VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now()),
    CONSTRAINT uq_kelas_tingkat UNIQUE (nama_kelas, tingkat)
);

-- 8. SANTRI TABLE (MASTER DATA SANTRI & BARCODE ID YYS)
CREATE TABLE IF NOT EXISTS public.santri (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_yys VARCHAR(50) NOT NULL UNIQUE, -- Identifier Utama & Nilai Barcode Asli
    nama VARCHAR(255) NOT NULL,
    nis VARCHAR(50),
    jenis_kelamin jenis_kelamin_type NOT NULL DEFAULT 'L',
    kelas_id UUID REFERENCES public.kelas(id) ON DELETE SET NULL,
    kamar_id UUID REFERENCES public.kamar(id) ON DELETE SET NULL,
    rayon VARCHAR(100),
    status_santri status_santri_type NOT NULL DEFAULT 'Aktif',
    barcode_value VARCHAR(100) NOT NULL UNIQUE, -- Nilai Barcode fisik (sama dengan ID YYS)
    nama_wali VARCHAR(255),
    kontak_wali VARCHAR(50),
    alamat TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now())
);

-- 9. KEGIATAN TABLE (JADWAL RUTIN ABSENSI)
CREATE TABLE IF NOT EXISTS public.kegiatan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_kegiatan VARCHAR(150) NOT NULL,
    kategori VARCHAR(50) NOT NULL, -- 'Jamaah', 'Sekolah', 'Madin', 'Asrama', 'Khusus'
    waktu_mulai TIME NOT NULL,
    waktu_selesai TIME NOT NULL,
    lokasi VARCHAR(150),
    deskripsi TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now())
);

-- 10. ATTENDANCE RECORDS (RIWAYAT ABSENSI HARIAN TERPADU)
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    santri_id UUID NOT NULL REFERENCES public.santri(id) ON DELETE CASCADE,
    kegiatan_id UUID NOT NULL REFERENCES public.kegiatan(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL DEFAULT timezone('Asia/Jakarta', now())::date,
    sesi VARCHAR(50) NOT NULL DEFAULT 'Pagi',
    status attendance_status_type NOT NULL DEFAULT 'HADIR',
    waktu_absen TIME NOT NULL DEFAULT timezone('Asia/Jakarta', now())::time,
    petugas_id TEXT,
    petugas_nama VARCHAR(255),
    catatan TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now()),
    CONSTRAINT uq_attendance_santri_kegiatan_tanggal_sesi UNIQUE (santri_id, kegiatan_id, tanggal, sesi)
);

-- 11. PERMISSIONS TABLE (PERIZINAN SANTRI: PULANG & KELUAR)
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    santri_id UUID NOT NULL REFERENCES public.santri(id) ON DELETE CASCADE,
    jenis VARCHAR(20) NOT NULL CHECK (jenis IN ('IZIN_PULANG', 'IZIN_KELUAR')),
    alasan TEXT NOT NULL,
    tujuan TEXT NOT NULL,
    tanggal_keluar DATE NOT NULL DEFAULT CURRENT_DATE,
    jam_keluar TIME NOT NULL DEFAULT CURRENT_TIME,
    batas_kembali TIMESTAMPTZ NOT NULL,
    waktu_kembali TIMESTAMPTZ,
    penanggung_jawab VARCHAR(255) NOT NULL,
    kontak_penanggung_jawab VARCHAR(50),
    catatan TEXT,
    lampiran_url TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'DIAJUKAN' CHECK (status IN (
        'DIAJUKAN', 'DISETUJUI', 'DITOLAK', 'SUDAH_KELUAR', 'SUDAH_KEMBALI', 'TERLAMBAT', 'SELESAI', 'DIBATALKAN'
    )),
    dibuat_oleh VARCHAR(255),
    disetujui_oleh VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now())
);

-- 12. SPECIAL EVENTS TABLE (KEGIATAN KHUSUS & PSG)
CREATE TABLE IF NOT EXISTS public.special_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_kegiatan VARCHAR(200) NOT NULL,
    jenis_kegiatan VARCHAR(100) NOT NULL,
    tanggal_mulai DATE NOT NULL,
    tanggal_selesai DATE NOT NULL,
    lokasi VARCHAR(255) NOT NULL,
    keterangan TEXT,
    jenis_absensi VARCHAR(50) NOT NULL DEFAULT 'BERANGKAT_KEMBALI'
        CHECK (jenis_absensi IN ('SEKALI', 'BERANGKAT_KEMBALI', 'CHECKIN_CHECKOUT')),
    jam_batas_berangkat TIME DEFAULT '08:00',
    jam_batas_kembali TIME DEFAULT '17:00',
    status VARCHAR(50) NOT NULL DEFAULT 'AKTIF'
        CHECK (status IN ('DRAFT', 'AKTIF', 'SELESAI', 'DIBATALKAN')),
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now())
);

-- 13. SPECIAL EVENT PARTICIPANTS
CREATE TABLE IF NOT EXISTS public.special_event_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.special_events(id) ON DELETE CASCADE,
    santri_id UUID NOT NULL REFERENCES public.santri(id) ON DELETE CASCADE,
    atribut_khusus VARCHAR(255),
    catatan TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now()),
    UNIQUE(event_id, santri_id)
);

-- 14. SPECIAL ATTENDANCE
CREATE TABLE IF NOT EXISTS public.special_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.special_events(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES public.special_event_participants(id) ON DELETE CASCADE,
    santri_id UUID NOT NULL REFERENCES public.santri(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    waktu_berangkat TIMESTAMPTZ,
    waktu_kembali TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'BELUM_BERANGKAT'
        CHECK (status IN ('BELUM_BERANGKAT', 'SUDAH_BERANGKAT', 'SUDAH_KEMBALI', 'TERLAMBAT', 'TIDAK_ABSEN', 'HADIR')),
    catatan TEXT,
    scanned_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now())
);

-- 15. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT,
    user_email VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id VARCHAR(100),
    details JSONB,
    ip_address VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now())
);

-- ==============================================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_santri_id_yys ON public.santri(id_yys);
CREATE INDEX IF NOT EXISTS idx_santri_barcode_value ON public.santri(barcode_value);
CREATE INDEX IF NOT EXISTS idx_santri_kelas_id ON public.santri(kelas_id);
CREATE INDEX IF NOT EXISTS idx_santri_kamar_id ON public.santri(kamar_id);
CREATE INDEX IF NOT EXISTS idx_santri_status ON public.santri(status_santri);
CREATE INDEX IF NOT EXISTS idx_attendance_tanggal ON public.attendance_records(tanggal);
CREATE INDEX IF NOT EXISTS idx_attendance_kegiatan ON public.attendance_records(kegiatan_id);
CREATE INDEX IF NOT EXISTS idx_attendance_santri ON public.attendance_records(santri_id);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON public.attendance_records(status);
CREATE INDEX IF NOT EXISTS idx_attendance_keg_tgl_sesi ON public.attendance_records(kegiatan_id, tanggal, sesi);
CREATE INDEX IF NOT EXISTS idx_permissions_santri ON public.permissions(santri_id);
CREATE INDEX IF NOT EXISTS idx_permissions_status ON public.permissions(status);
CREATE INDEX IF NOT EXISTS idx_permissions_jenis ON public.permissions(jenis);
CREATE INDEX IF NOT EXISTS idx_permissions_batas ON public.permissions(batas_kembali);
CREATE INDEX IF NOT EXISTS idx_permissions_tanggal ON public.permissions(tanggal_keluar);
CREATE INDEX IF NOT EXISTS idx_special_events_status ON public.special_events(status);
CREATE INDEX IF NOT EXISTS idx_special_events_tgl ON public.special_events(tanggal_mulai, tanggal_selesai);
CREATE INDEX IF NOT EXISTS idx_sep_event_santri ON public.special_event_participants(event_id, santri_id);
CREATE INDEX IF NOT EXISTS idx_sa_event_santri ON public.special_attendance(event_id, santri_id);
CREATE INDEX IF NOT EXISTS idx_sa_status ON public.special_attendance(status);
CREATE INDEX IF NOT EXISTS idx_sa_tanggal ON public.special_attendance(tanggal);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role_code);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- ==============================================================================
-- FUNCTION & TRIGGER: AUTO UPDATE updated_at
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('Asia/Jakarta', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_kamar_updated_at ON public.kamar;
CREATE TRIGGER trg_kamar_updated_at
    BEFORE UPDATE ON public.kamar
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_kelas_updated_at ON public.kelas;
CREATE TRIGGER trg_kelas_updated_at
    BEFORE UPDATE ON public.kelas
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_santri_updated_at ON public.santri;
CREATE TRIGGER trg_santri_updated_at
    BEFORE UPDATE ON public.santri
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_kegiatan_updated_at ON public.kegiatan;
CREATE TRIGGER trg_kegiatan_updated_at
    BEFORE UPDATE ON public.kegiatan
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_attendance_records_updated_at ON public.attendance_records;
CREATE TRIGGER trg_attendance_records_updated_at
    BEFORE UPDATE ON public.attendance_records
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_permissions_updated_at ON public.permissions;
CREATE TRIGGER trg_permissions_updated_at
    BEFORE UPDATE ON public.permissions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_special_events_updated_at ON public.special_events;
CREATE TRIGGER trg_special_events_updated_at
    BEFORE UPDATE ON public.special_events
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_special_attendance_updated_at ON public.special_attendance;
CREATE TRIGGER trg_special_attendance_updated_at
    BEFORE UPDATE ON public.special_attendance
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Kebijakan terbuka untuk anon & authenticated agar seluruh fitur web aplikasi berjalan lancar
-- ==============================================================================
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.santri ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kamar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kegiatan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- POLICIES (ALL OPERATIONS FOR ANON AND AUTHENTICATED)
DROP POLICY IF EXISTS "Allow all access on roles" ON public.roles;
CREATE POLICY "Allow all access on roles" ON public.roles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access on profiles" ON public.profiles;
CREATE POLICY "Allow all access on profiles" ON public.profiles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access on kamar" ON public.kamar;
CREATE POLICY "Allow all access on kamar" ON public.kamar FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access on kelas" ON public.kelas;
CREATE POLICY "Allow all access on kelas" ON public.kelas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access on santri" ON public.santri;
CREATE POLICY "Allow all access on santri" ON public.santri FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access on kegiatan" ON public.kegiatan;
CREATE POLICY "Allow all access on kegiatan" ON public.kegiatan FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access on attendance_records" ON public.attendance_records;
CREATE POLICY "Allow all access on attendance_records" ON public.attendance_records FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access on permissions" ON public.permissions;
CREATE POLICY "Allow all access on permissions" ON public.permissions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access on special_events" ON public.special_events;
CREATE POLICY "Allow all access on special_events" ON public.special_events FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access on special_event_participants" ON public.special_event_participants;
CREATE POLICY "Allow all access on special_event_participants" ON public.special_event_participants FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access on special_attendance" ON public.special_attendance;
CREATE POLICY "Allow all access on special_attendance" ON public.special_attendance FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access on audit_logs" ON public.audit_logs;
CREATE POLICY "Allow all access on audit_logs" ON public.audit_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
