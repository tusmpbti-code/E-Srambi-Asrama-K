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

-- 3. ROLES TABLE
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code user_role_type UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now())
);

-- 4. PROFILES TABLE (Linked with Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role_code user_role_type NOT NULL DEFAULT 'PETUGAS_JAMAAH',
    phone VARCHAR(30),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now())
);

-- 5. KAMAR TABLE (ASRAMA)
CREATE TABLE IF NOT EXISTS public.kamar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_kamar VARCHAR(100) NOT NULL UNIQUE,
    gedung VARCHAR(100) NOT NULL,
    kapasitas INTEGER NOT NULL DEFAULT 10,
    keterangan TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now())
);

-- 6. KELAS TABLE (SEKOLAH & MADIN)
CREATE TABLE IF NOT EXISTS public.kelas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_kelas VARCHAR(100) NOT NULL,
    tingkat VARCHAR(50) NOT NULL, -- e.g., 'MTs', 'MA', 'Madin Ula', 'Madin Wustho'
    wali_kelas VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now()),
    CONSTRAINT uq_kelas_tingkat UNIQUE (nama_kelas, tingkat)
);

-- 7. SANTRI TABLE (MASTER DATA SANTRI & BARCODE ID YYS)
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

-- 8. KEGIATAN TABLE
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

-- 9. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
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
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role_code);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
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

-- ==============================================================================
-- FUNCTION: SYNC USER REGISTRATION TO PROFILES
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role_code)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE((NEW.raw_user_meta_data->>'role_code')::user_role_type, 'PETUGAS_JAMAAH'::user_role_type)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.santri ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kamar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kegiatan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- HELPER: Get current user role code
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role_type AS $$
    SELECT role_code FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 1. ROLES POLICIES
CREATE POLICY "Authenticated users can view roles"
    ON public.roles FOR SELECT
    TO authenticated
    USING (true);

-- 2. PROFILES POLICIES
CREATE POLICY "Users can view own profile or admins can view all"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        id = auth.uid() 
        OR public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN')
    );

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can manage all profiles"
    ON public.profiles FOR ALL
    TO authenticated
    USING (public.current_user_role() = 'SUPER_ADMIN');

-- 3. SANTRI POLICIES
-- Strict rule: Unauthenticated users CANNOT read santri
CREATE POLICY "Authenticated staff can view santri"
    ON public.santri FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins and Pengurus can insert santri"
    ON public.santri FOR INSERT
    TO authenticated
    WITH CHECK (public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN'));

CREATE POLICY "Admins and Pengurus can update santri"
    ON public.santri FOR UPDATE
    TO authenticated
    USING (public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'PENGURUS_ASRAMA'))
    WITH CHECK (public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'PENGURUS_ASRAMA'));

CREATE POLICY "Only Super Admin can delete santri"
    ON public.santri FOR DELETE
    TO authenticated
    USING (public.current_user_role() = 'SUPER_ADMIN');

-- 4. KAMAR & KELAS POLICIES
CREATE POLICY "Authenticated staff can read kamar"
    ON public.kamar FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can manage kamar"
    ON public.kamar FOR ALL
    TO authenticated
    USING (public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'PENGURUS_ASRAMA'));

CREATE POLICY "Authenticated staff can read kelas"
    ON public.kelas FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can manage kelas"
    ON public.kelas FOR ALL
    TO authenticated
    USING (public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'PETUGAS_SEKOLAH'));

-- 5. KEGIATAN POLICIES
CREATE POLICY "Authenticated staff can view kegiatan"
    ON public.kegiatan FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can manage kegiatan"
    ON public.kegiatan FOR ALL
    TO authenticated
    USING (public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN'));

-- 6. AUDIT LOGS POLICIES
CREATE POLICY "Authenticated staff can write audit log"
    ON public.audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Only Super Admin and Admin can view audit logs"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN'));

-- ==============================================================================
-- TAHAP 2: ATTENDANCE RECORDS (ABSENSI KEGIATAN HARIAN TERPADU)
-- ==============================================================================

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
    sesi VARCHAR(50) NOT NULL DEFAULT 'Pagi', -- 'Pagi', 'Siang', 'Sore', 'Malam', 'Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'
    status attendance_status_type NOT NULL DEFAULT 'HADIR',
    waktu_absen TIME NOT NULL DEFAULT timezone('Asia/Jakarta', now())::time,
    petugas_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    petugas_nama VARCHAR(255),
    catatan TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now()),
    -- Unique constraint untuk mencegah absensi ganda pada kegiatan, tanggal, dan sesi yang sama
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

-- Insert policy with role enforcement (Petugas Sekolah only Sekolah, Petugas Madin only Madin, Petugas Jamaah only Jamaah)
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

-- ==============================================================================
-- 12. PERMISSIONS TABLE (TAHAP 3 - PERIZINAN SANTRI: IZIN PULANG & IZIN KELUAR)
-- ==============================================================================
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

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_permissions_santri ON public.permissions(santri_id);
CREATE INDEX IF NOT EXISTS idx_permissions_status ON public.permissions(status);
CREATE INDEX IF NOT EXISTS idx_permissions_jenis ON public.permissions(jenis);
CREATE INDEX IF NOT EXISTS idx_permissions_batas ON public.permissions(batas_kembali);
CREATE INDEX IF NOT EXISTS idx_permissions_tanggal ON public.permissions(tanggal_keluar);

-- TRIGGER UPDATED AT
DROP TRIGGER IF EXISTS trg_permissions_updated_at ON public.permissions;
CREATE TRIGGER trg_permissions_updated_at
    BEFORE UPDATE ON public.permissions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS: PERMISSIONS
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated staff can view permissions"
    ON public.permissions FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Staff with permission authority can insert permissions"
    ON public.permissions FOR INSERT
    TO authenticated
    WITH CHECK (
        public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'PENGURUS_ASRAMA')
    );

CREATE POLICY "Staff with permission authority can update permissions"
    ON public.permissions FOR UPDATE
    TO authenticated
    USING (
        public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'PENGURUS_ASRAMA')
    );

CREATE POLICY "Only Admins can delete permissions"
    ON public.permissions FOR DELETE
    TO authenticated
    USING (public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN'));

-- ==============================================================================
-- TAHAP 4: SPECIAL EVENTS / KEGIATAN KHUSUS & PSG
-- ==============================================================================

-- 11. SPECIAL EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.special_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_kegiatan VARCHAR(200) NOT NULL,
    jenis_kegiatan VARCHAR(100) NOT NULL, -- 'PSG', 'LDKS', 'Perlombaan', 'Praktik Lapangan', 'Kegiatan Luar', 'Lainnya'
    tanggal_mulai DATE NOT NULL,
    tanggal_selesai DATE NOT NULL,
    lokasi VARCHAR(255) NOT NULL,
    keterangan TEXT,
    jenis_absensi VARCHAR(50) NOT NULL DEFAULT 'BERANGKAT_KEMBALI'
        CHECK (jenis_absensi IN ('SEKALI', 'BERANGKAT_KEMBALI', 'CHECKIN_CHECKOUT')),
    jam_batas_berangkat TIME DEFAULT '08:00', -- Batas jam absen berangkat
    jam_batas_kembali TIME DEFAULT '17:00',   -- Batas jam absen kembali ke pondok
    status VARCHAR(50) NOT NULL DEFAULT 'AKTIF'
        CHECK (status IN ('DRAFT', 'AKTIF', 'SELESAI', 'DIBATALKAN')),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now())
);

-- 12. SPECIAL EVENT PARTICIPANTS TABLE
CREATE TABLE IF NOT EXISTS public.special_event_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.special_events(id) ON DELETE CASCADE,
    santri_id UUID NOT NULL REFERENCES public.santri(id) ON DELETE CASCADE,
    atribut_khusus VARCHAR(255), -- misal: Tempat PSG, Penempatan, Regu/Kelompok
    catatan TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now()),
    UNIQUE(event_id, santri_id)
);

-- 13. SPECIAL ATTENDANCE TABLE
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
    scanned_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now())
);

-- INDEXES FOR SPECIAL EVENTS
CREATE INDEX IF NOT EXISTS idx_special_events_status ON public.special_events(status);
CREATE INDEX IF NOT EXISTS idx_special_events_tgl ON public.special_events(tanggal_mulai, tanggal_selesai);
CREATE INDEX IF NOT EXISTS idx_sep_event_santri ON public.special_event_participants(event_id, santri_id);
CREATE INDEX IF NOT EXISTS idx_sa_event_santri ON public.special_attendance(event_id, santri_id);
CREATE INDEX IF NOT EXISTS idx_sa_status ON public.special_attendance(status);
CREATE INDEX IF NOT EXISTS idx_sa_tanggal ON public.special_attendance(tanggal);

-- TRIGGERS
DROP TRIGGER IF EXISTS trg_special_events_updated_at ON public.special_events;
CREATE TRIGGER trg_special_events_updated_at
    BEFORE UPDATE ON public.special_events
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_special_attendance_updated_at ON public.special_attendance;
CREATE TRIGGER trg_special_attendance_updated_at
    BEFORE UPDATE ON public.special_attendance
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS POLICIES FOR SPECIAL EVENTS
ALTER TABLE public.special_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_attendance ENABLE ROW LEVEL SECURITY;

-- 1. special_events
CREATE POLICY "Authenticated users can view special events"
    ON public.special_events FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authorized staff can insert special events"
    ON public.special_events FOR INSERT
    TO authenticated
    WITH CHECK (public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'PENGURUS_ASRAMA'));

CREATE POLICY "Authorized staff can update special events"
    ON public.special_events FOR UPDATE
    TO authenticated
    USING (public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'PENGURUS_ASRAMA'));

CREATE POLICY "Admins can delete special events"
    ON public.special_events FOR DELETE
    TO authenticated
    USING (public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN'));

-- 2. special_event_participants
CREATE POLICY "Authenticated users can view special event participants"
    ON public.special_event_participants FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authorized staff can manage special event participants"
    ON public.special_event_participants FOR ALL
    TO authenticated
    USING (public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'PENGURUS_ASRAMA'))
    WITH CHECK (public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'PENGURUS_ASRAMA'));

-- 3. special_attendance
CREATE POLICY "Authenticated users can view special attendance"
    ON public.special_attendance FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authorized staff can manage special attendance"
    ON public.special_attendance FOR ALL
    TO authenticated
    USING (public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'PENGURUS_ASRAMA'))
    WITH CHECK (public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'PENGURUS_ASRAMA'));


