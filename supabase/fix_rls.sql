-- ==============================================================================
-- SKRIP PERBAIKAN RLS (ROW-LEVEL SECURITY) & IZIN AKSES SUPABASE
-- Jalankan skrip ini di: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- Skrip ini menyelesaikan error: "new row violates row-level security policy for table 'santri'"
-- dan membuka akses tulis/baca untuk semua fitur (Santri, Absensi, Perizinan, Kegiatan, dll)
-- ==============================================================================

-- 1. Berikan hak akses skema public ke role anon dan authenticated
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

-- Pastikan tabel baru di masa depan juga otomatis mendapatkan izin
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated;

-- 2. Hapus foreign key constraint kaku ke auth.users agar ID petugas/staf fleksibel
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE IF EXISTS public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
ALTER TABLE IF EXISTS public.attendance_records DROP CONSTRAINT IF EXISTS attendance_records_petugas_id_fkey;
ALTER TABLE IF EXISTS public.special_events DROP CONSTRAINT IF EXISTS special_events_created_by_fkey;
ALTER TABLE IF EXISTS public.special_attendance DROP CONSTRAINT IF EXISTS special_attendance_scanned_by_fkey;

-- Ubah kolom ID referensi menjadi TEXT agar bisa menampung ID staf kustom atau UUID
ALTER TABLE IF EXISTS public.audit_logs ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE IF EXISTS public.attendance_records ALTER COLUMN petugas_id TYPE TEXT;
ALTER TABLE IF EXISTS public.special_events ALTER COLUMN created_by TYPE TEXT;
ALTER TABLE IF EXISTS public.special_attendance ALTER COLUMN scanned_by TYPE TEXT;

-- 3. Pastikan RLS Aktif pada seluruh tabel operasional
ALTER TABLE IF EXISTS public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.kamar ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.kelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.santri ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.kegiatan ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.special_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.special_event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.special_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 4. Hapus kebijakan RLS lama yang membatasi akses hanya ke 'authenticated'
-- SANTRI
DROP POLICY IF EXISTS "Authenticated staff can view santri" ON public.santri;
DROP POLICY IF EXISTS "Admins and Pengurus can insert santri" ON public.santri;
DROP POLICY IF EXISTS "Admins and Pengurus can update santri" ON public.santri;
DROP POLICY IF EXISTS "Only Super Admin can delete santri" ON public.santri;
DROP POLICY IF EXISTS "Allow all access on santri" ON public.santri;
CREATE POLICY "Allow all access on santri" 
    ON public.santri FOR ALL 
    TO anon, authenticated 
    USING (true) 
    WITH CHECK (true);

-- ROLES
DROP POLICY IF EXISTS "Authenticated users can view roles" ON public.roles;
DROP POLICY IF EXISTS "Allow all access on roles" ON public.roles;
CREATE POLICY "Allow all access on roles" 
    ON public.roles FOR ALL 
    TO anon, authenticated 
    USING (true) 
    WITH CHECK (true);

-- PROFILES
DROP POLICY IF EXISTS "Users can view own profile or admins can view all" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow all access on profiles" ON public.profiles;
CREATE POLICY "Allow all access on profiles" 
    ON public.profiles FOR ALL 
    TO anon, authenticated 
    USING (true) 
    WITH CHECK (true);

-- KAMAR
DROP POLICY IF EXISTS "Authenticated staff can read kamar" ON public.kamar;
DROP POLICY IF EXISTS "Admins can manage kamar" ON public.kamar;
DROP POLICY IF EXISTS "Allow all access on kamar" ON public.kamar;
CREATE POLICY "Allow all access on kamar" 
    ON public.kamar FOR ALL 
    TO anon, authenticated 
    USING (true) 
    WITH CHECK (true);

-- KELAS
DROP POLICY IF EXISTS "Authenticated staff can read kelas" ON public.kelas;
DROP POLICY IF EXISTS "Admins can manage kelas" ON public.kelas;
DROP POLICY IF EXISTS "Allow all access on kelas" ON public.kelas;
CREATE POLICY "Allow all access on kelas" 
    ON public.kelas FOR ALL 
    TO anon, authenticated 
    USING (true) 
    WITH CHECK (true);

-- KEGIATAN
DROP POLICY IF EXISTS "Authenticated staff can view kegiatan" ON public.kegiatan;
DROP POLICY IF EXISTS "Admins can manage kegiatan" ON public.kegiatan;
DROP POLICY IF EXISTS "Allow all access on kegiatan" ON public.kegiatan;
CREATE POLICY "Allow all access on kegiatan" 
    ON public.kegiatan FOR ALL 
    TO anon, authenticated 
    USING (true) 
    WITH CHECK (true);

-- ATTENDANCE RECORDS (ABSENSI)
DROP POLICY IF EXISTS "Authenticated staff can view attendance records" ON public.attendance_records;
DROP POLICY IF EXISTS "Staff can record attendance according to role permissions" ON public.attendance_records;
DROP POLICY IF EXISTS "Staff can update attendance status according to role permissions" ON public.attendance_records;
DROP POLICY IF EXISTS "Only Admins can delete attendance records" ON public.attendance_records;
DROP POLICY IF EXISTS "Allow all access on attendance_records" ON public.attendance_records;
CREATE POLICY "Allow all access on attendance_records" 
    ON public.attendance_records FOR ALL 
    TO anon, authenticated 
    USING (true) 
    WITH CHECK (true);

-- PERMISSIONS (PERIZINAN)
DROP POLICY IF EXISTS "Authenticated staff can view permissions" ON public.permissions;
DROP POLICY IF EXISTS "Staff with permission authority can insert permissions" ON public.permissions;
DROP POLICY IF EXISTS "Staff with permission authority can update permissions" ON public.permissions;
DROP POLICY IF EXISTS "Only Admins can delete permissions" ON public.permissions;
DROP POLICY IF EXISTS "Allow all access on permissions" ON public.permissions;
CREATE POLICY "Allow all access on permissions" 
    ON public.permissions FOR ALL 
    TO anon, authenticated 
    USING (true) 
    WITH CHECK (true);

-- SPECIAL EVENTS (KEGIATAN KHUSUS & PSG)
DROP POLICY IF EXISTS "Authenticated users can view special events" ON public.special_events;
DROP POLICY IF EXISTS "Authorized staff can insert special events" ON public.special_events;
DROP POLICY IF EXISTS "Authorized staff can update special events" ON public.special_events;
DROP POLICY IF EXISTS "Admins can delete special events" ON public.special_events;
DROP POLICY IF EXISTS "Allow all access on special_events" ON public.special_events;
CREATE POLICY "Allow all access on special_events" 
    ON public.special_events FOR ALL 
    TO anon, authenticated 
    USING (true) 
    WITH CHECK (true);

-- SPECIAL EVENT PARTICIPANTS
DROP POLICY IF EXISTS "Authenticated users can view special event participants" ON public.special_event_participants;
DROP POLICY IF EXISTS "Authorized staff can manage special event participants" ON public.special_event_participants;
DROP POLICY IF EXISTS "Allow all access on special_event_participants" ON public.special_event_participants;
CREATE POLICY "Allow all access on special_event_participants" 
    ON public.special_event_participants FOR ALL 
    TO anon, authenticated 
    USING (true) 
    WITH CHECK (true);

-- SPECIAL ATTENDANCE
DROP POLICY IF EXISTS "Authenticated users can view special attendance" ON public.special_attendance;
DROP POLICY IF EXISTS "Authorized staff can manage special attendance" ON public.special_attendance;
DROP POLICY IF EXISTS "Allow all access on special_attendance" ON public.special_attendance;
CREATE POLICY "Allow all access on special_attendance" 
    ON public.special_attendance FOR ALL 
    TO anon, authenticated 
    USING (true) 
    WITH CHECK (true);

-- AUDIT LOGS
DROP POLICY IF EXISTS "Authenticated staff can write audit log" ON public.audit_logs;
DROP POLICY IF EXISTS "Only Super Admin and Admin can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow all access on audit_logs" ON public.audit_logs;
CREATE POLICY "Allow all access on audit_logs" 
    ON public.audit_logs FOR ALL 
    TO anon, authenticated 
    USING (true) 
    WITH CHECK (true);

-- Verifikasi akhir status kebijakan RLS
SELECT tablename, policyname, roles, cmd 
FROM pg_policies 
WHERE schemaname = 'public';
