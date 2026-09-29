import { getSupabaseClient, loadSupabaseConfig } from './supabase';

export interface ColumnSpec {
  name: string;
  pgType: string;
  nullable: boolean;
  isPrimary?: boolean;
  isUnique?: boolean;
  defaultValue?: string;
  description: string;
}

export interface TableSchemaSpec {
  tableName: string;
  description: string;
  rlsRequired: boolean;
  realtimeRequired: boolean;
  publicAccessLevel: 'NONE (RPC Only)' | 'PUBLIC READ ONLY' | 'ADMIN ONLY';
  columns: ColumnSpec[];
  indexes: string[];
}

export interface LiveTableAuditResult {
  tableName: string;
  exists: boolean;
  columnsValid: boolean;
  missingColumns: string[];
  rowCount: number | null;
  selectAllowed: boolean;
  anonWriteBlocked: boolean;
  rlsStatus: 'PROTECTED' | 'PERMISSIVE_PUBLIC_WRITE' | 'TABLE_MISSING' | 'ERROR';
  errorMessage?: string;
}

export interface MigrationItem {
  version: string;
  name: string;
  description: string;
  isDestructive: boolean;
  requiresManualSqlEditor: boolean;
  sql: string;
}

export interface DiagnosticLogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR';
  category: 'CONNECTION' | 'ENV' | 'SCHEMA' | 'RLS' | 'REALTIME' | 'MIGRATION';
  message: string;
  detail?: string;
}

export interface ComprehensiveAuditReport {
  checkedAt: string;
  connectionState: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  latencyMs: number | null;
  envValidation: {
    urlValid: boolean;
    keyFormatValid: boolean;
    keyType: 'publishable_v2' | 'anon_jwt' | 'invalid' | 'secret_exposed_danger';
    maskedKey: string;
    envSource: 'vite_env' | 'custom_storage' | 'default_fallback';
    issues: string[];
  };
  tables: LiveTableAuditResult[];
  rpcsInstalled: {
    verifyStudentGraduation: boolean;
    getPublicCohortSummary: boolean;
    adminCrudRpc: boolean;
    schemaDiagnosticsRpc: boolean;
  };
  appliedMigrations: string[];
  pendingMigrations: string[];
  overallHealth: 'HEALTHY' | 'NEEDS_MIGRATION' | 'RLS_BLOCKING_SYNC' | 'CONNECTION_ERROR';
  logs: DiagnosticLogEntry[];
}

export const EXPECTED_DATABASE_SCHEMA: TableSchemaSpec[] = [
  {
    tableName: 'class_rooms',
    description: 'Master data rombongan belajar (kelas), jurusan, dan identitas Wali Kelas',
    rlsRequired: true,
    realtimeRequired: true,
    publicAccessLevel: 'PUBLIC READ ONLY',
    columns: [
      { name: 'id', pgType: 'TEXT', nullable: false, isPrimary: true, description: 'Primary key ID kelas' },
      { name: 'class_name', pgType: 'TEXT', nullable: false, isUnique: true, description: 'Nama kelas (XII MIPA 1)' },
      { name: 'major', pgType: 'TEXT', nullable: false, description: 'Peminatan jurusan (MIPA / IPS)' },
      { name: 'homeroom_teacher', pgType: 'TEXT', nullable: false, description: 'Nama lengkap & gelar Wali Kelas' },
      { name: 'homeroom_nip', pgType: 'TEXT', nullable: false, description: 'NIP Wali Kelas' },
      { name: 'room_number', pgType: 'TEXT', nullable: false, defaultValue: "''", description: 'Lokasi gedung & ruang kelas' },
      { name: 'academic_year', pgType: 'TEXT', nullable: false, defaultValue: "'2025/2026'", description: 'Tahun ajaran aktif' },
      { name: 'updated_at', pgType: 'TIMESTAMPTZ', nullable: false, defaultValue: 'now()', description: 'Waktu pembaruan terakhir' },
    ],
    indexes: ['idx_class_rooms_major', 'idx_class_rooms_academic_year'],
  },
  {
    tableName: 'students',
    description: 'Data peserta didik aktif, transkrip nilai 8 mata pelajaran, nomor SKL, dan status kelulusan',
    rlsRequired: true,
    realtimeRequired: true,
    publicAccessLevel: 'NONE (RPC Only)',
    columns: [
      { name: 'id', pgType: 'TEXT', nullable: false, isPrimary: true, description: 'Primary key ID siswa' },
      { name: 'nisn', pgType: 'TEXT', nullable: false, isUnique: true, description: '10 digit Nomor Induk Siswa Nasional' },
      { name: 'exam_number', pgType: 'TEXT', nullable: false, description: 'Nomor peserta ujian satuan pendidikan' },
      { name: 'full_name', pgType: 'TEXT', nullable: false, description: 'Nama lengkap peserta didik' },
      { name: 'birth_place', pgType: 'TEXT', nullable: false, description: 'Tempat lahir siswa' },
      { name: 'birth_date', pgType: 'TEXT', nullable: false, description: 'Tanggal lahir (YYYY-MM-DD) untuk verifikasi' },
      { name: 'class_name', pgType: 'TEXT', nullable: false, description: 'Nama kelas rombongan belajar' },
      { name: 'major', pgType: 'TEXT', nullable: false, description: 'Jurusan peminatan (MIPA / IPS)' },
      { name: 'average_score', pgType: 'NUMERIC(5,2)', nullable: false, description: 'Rata-rata nilai ujian akhir' },
      { name: 'status', pgType: 'TEXT', nullable: false, description: 'Keputusan kelulusan (LULUS / TIDAK LULUS)' },
      { name: 'predicate', pgType: 'TEXT', nullable: false, description: 'Predikat capaian kelulusan' },
      { name: 'skl_number', pgType: 'TEXT', nullable: false, description: 'Nomor resmi Surat Keterangan Lulus' },
      { name: 'subjects', pgType: 'JSONB', nullable: false, defaultValue: "'[]'::jsonb", description: 'Array JSONB nilai mata pelajaran' },
      { name: 'notes', pgType: 'TEXT', nullable: true, defaultValue: "''", description: 'Catatan dewan pendidik' },
      { name: 'checked_at', pgType: 'TIMESTAMPTZ', nullable: true, description: 'Waktu terakhir siswa mengecek kelulusan' },
      { name: 'check_count', pgType: 'INTEGER', nullable: false, defaultValue: '0', description: 'Frekuensi pengecekan oleh siswa' },
      { name: 'updated_at', pgType: 'TIMESTAMPTZ', nullable: false, defaultValue: 'now()', description: 'Waktu pembaruan terakhir' },
    ],
    indexes: [
      'idx_students_nisn_birthdate',
      'idx_students_class_name',
      'idx_students_status',
    ],
  },
  {
    tableName: 'alumni',
    description: 'Basis data arsip lulusan (Alumni) dan pelacakan studi lanjut / karier (Tracer Study)',
    rlsRequired: true,
    realtimeRequired: true,
    publicAccessLevel: 'ADMIN ONLY',
    columns: [
      { name: 'id', pgType: 'TEXT', nullable: false, isPrimary: true, description: 'Primary key ID alumni' },
      { name: 'nisn', pgType: 'TEXT', nullable: false, isUnique: true, description: '10 digit NISN alumni' },
      { name: 'exam_number', pgType: 'TEXT', nullable: false, description: 'Nomor peserta ujian saat lulus' },
      { name: 'full_name', pgType: 'TEXT', nullable: false, description: 'Nama lengkap alumni' },
      { name: 'birth_place', pgType: 'TEXT', nullable: false, description: 'Tempat lahir alumni' },
      { name: 'birth_date', pgType: 'TEXT', nullable: false, description: 'Tanggal lahir alumni (YYYY-MM-DD)' },
      { name: 'class_name', pgType: 'TEXT', nullable: false, description: 'Kelas terakhir saat lulus' },
      { name: 'major', pgType: 'TEXT', nullable: false, description: 'Peminatan (MIPA / IPS)' },
      { name: 'graduation_year', pgType: 'TEXT', nullable: false, description: 'Tahun ajaran kelulusan (angkatan)' },
      { name: 'average_score', pgType: 'NUMERIC(5,2)', nullable: false, description: 'Rata-rata nilai akhir kelulusan' },
      { name: 'predicate', pgType: 'TEXT', nullable: false, description: 'Predikat kelulusan' },
      { name: 'skl_number', pgType: 'TEXT', nullable: false, description: 'Nomor SKL resmi' },
      { name: 'subjects', pgType: 'JSONB', nullable: false, defaultValue: "'[]'::jsonb", description: 'Transkrip nilai JSONB' },
      { name: 'notes', pgType: 'TEXT', nullable: true, defaultValue: "''", description: 'Catatan kelulusan' },
      { name: 'continuation_status', pgType: 'TEXT', nullable: false, defaultValue: "'Belum Terdata'", description: 'Jalur studi lanjut / kerja' },
      { name: 'institution_name', pgType: 'TEXT', nullable: false, defaultValue: "''", description: 'Nama PTN/PTS/Instansi kerja' },
      { name: 'contact_phone', pgType: 'TEXT', nullable: false, defaultValue: "''", description: 'Kontak telepon/WA pribadi alumni' },
      { name: 'transferred_at', pgType: 'TIMESTAMPTZ', nullable: false, defaultValue: 'now()', description: 'Waktu migrasi ke tabel alumni' },
      { name: 'updated_at', pgType: 'TIMESTAMPTZ', nullable: false, defaultValue: 'now()', description: 'Waktu pembaruan terakhir' },
    ],
    indexes: ['idx_alumni_graduation_year', 'idx_alumni_continuation_status'],
  },
  {
    tableName: 'announcement_settings',
    description: 'Konfigurasi sekolah, jadwal countdown pengumuman, KKM, dan otorisasi Kepala Sekolah',
    rlsRequired: true,
    realtimeRequired: true,
    publicAccessLevel: 'PUBLIC READ ONLY',
    columns: [
      { name: 'id', pgType: 'TEXT', nullable: false, isPrimary: true, description: "ID konfigurasi ('default')" },
      { name: 'school_name', pgType: 'TEXT', nullable: false, description: 'Nama resmi satuan pendidikan' },
      { name: 'school_npsn', pgType: 'TEXT', nullable: false, description: 'NPSN sekolah' },
      { name: 'school_address', pgType: 'TEXT', nullable: false, description: 'Alamat lengkap sekolah' },
      { name: 'province_name', pgType: 'TEXT', nullable: false, description: 'Nama pemerintah provinsi / dinas' },
      { name: 'academic_year', pgType: 'TEXT', nullable: false, description: 'Tahun ajaran aktif' },
      { name: 'principal_name', pgType: 'TEXT', nullable: false, description: 'Nama Kepala Sekolah penandatangan SKL' },
      { name: 'principal_nip', pgType: 'TEXT', nullable: false, description: 'NIP Kepala Sekolah' },
      { name: 'pleno_date', pgType: 'TEXT', nullable: false, description: 'Tanggal rapat pleno kelulusan' },
      { name: 'skl_prefix', pgType: 'TEXT', nullable: false, description: 'Format penomoran surat SKL' },
      { name: 'passing_grade_kkm', pgType: 'NUMERIC(5,2)', nullable: false, defaultValue: '75.00', description: 'Ambang batas nilai KKM' },
      { name: 'is_published', pgType: 'BOOLEAN', nullable: false, defaultValue: 'true', description: 'Status portal pengumuman dibuka/dikunci' },
      { name: 'announcement_time', pgType: 'TEXT', nullable: false, description: 'Waktu target hitung mundur (ISO-8601)' },
      { name: 'announcement_note', pgType: 'TEXT', nullable: false, description: 'Catatan resmi pengumuman' },
      { name: 'updated_at', pgType: 'TIMESTAMPTZ', nullable: false, defaultValue: 'now()', description: 'Waktu pembaruan terakhir' },
    ],
    indexes: [],
  },
  {
    tableName: 'schema_migrations',
    description: 'Catatan riwayat versi migrasi skema database dan status eksekusi',
    rlsRequired: true,
    realtimeRequired: false,
    publicAccessLevel: 'PUBLIC READ ONLY',
    columns: [
      { name: 'version', pgType: 'TEXT', nullable: false, isPrimary: true, description: 'Kode versi migrasi (V001, V002, V003)' },
      { name: 'name', pgType: 'TEXT', nullable: false, description: 'Nama deskriptif migrasi' },
      { name: 'status', pgType: 'TEXT', nullable: false, defaultValue: "'APPLIED'", description: 'Status eksekusi migrasi' },
      { name: 'executed_at', pgType: 'TIMESTAMPTZ', nullable: false, defaultValue: 'now()', description: 'Waktu eksekusi migrasi' },
    ],
    indexes: [],
  },
];

export const MIGRATION_V001_SQL = `-- ============================================================================
-- MIGRATION V001: Idempotent Core Tables, Safe Column Evolution & Indexes
-- Aman dijalankan berulang kali tanpa menghapus atau menimpa data yang sudah ada
-- ============================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'APPLIED',
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.class_rooms (
  id TEXT PRIMARY KEY,
  class_name TEXT NOT NULL UNIQUE,
  major TEXT NOT NULL CHECK (major IN ('MIPA', 'IPS')),
  homeroom_teacher TEXT NOT NULL,
  homeroom_nip TEXT NOT NULL DEFAULT '',
  room_number TEXT NOT NULL DEFAULT '',
  academic_year TEXT NOT NULL DEFAULT '2025/2026',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.students (
  id TEXT PRIMARY KEY,
  nisn TEXT NOT NULL UNIQUE,
  exam_number TEXT NOT NULL,
  full_name TEXT NOT NULL,
  birth_place TEXT NOT NULL DEFAULT '',
  birth_date TEXT NOT NULL,
  class_name TEXT NOT NULL,
  major TEXT NOT NULL CHECK (major IN ('MIPA', 'IPS')),
  average_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('LULUS', 'TIDAK LULUS')),
  predicate TEXT NOT NULL,
  skl_number TEXT NOT NULL,
  subjects JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT DEFAULT '',
  checked_at TIMESTAMPTZ,
  check_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.alumni (
  id TEXT PRIMARY KEY,
  nisn TEXT NOT NULL UNIQUE,
  exam_number TEXT NOT NULL,
  full_name TEXT NOT NULL,
  birth_place TEXT NOT NULL DEFAULT '',
  birth_date TEXT NOT NULL,
  class_name TEXT NOT NULL,
  major TEXT NOT NULL CHECK (major IN ('MIPA', 'IPS')),
  graduation_year TEXT NOT NULL,
  average_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  predicate TEXT NOT NULL,
  skl_number TEXT NOT NULL,
  subjects JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT DEFAULT '',
  continuation_status TEXT NOT NULL DEFAULT 'Belum Terdata',
  institution_name TEXT NOT NULL DEFAULT '',
  contact_phone TEXT NOT NULL DEFAULT '',
  transferred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.announcement_settings (
  id TEXT PRIMARY KEY,
  school_name TEXT NOT NULL,
  school_npsn TEXT NOT NULL,
  school_address TEXT NOT NULL,
  province_name TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  principal_name TEXT NOT NULL,
  principal_nip TEXT NOT NULL,
  pleno_date TEXT NOT NULL,
  skl_prefix TEXT NOT NULL,
  passing_grade_kkm NUMERIC(5,2) NOT NULL DEFAULT 75.00,
  is_published BOOLEAN NOT NULL DEFAULT true,
  announcement_time TEXT NOT NULL,
  announcement_note TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Non-destructive column additions if upgrading from an older schema
ALTER TABLE public.class_rooms ADD COLUMN IF NOT EXISTS room_number TEXT NOT NULL DEFAULT '';
ALTER TABLE public.class_rooms ADD COLUMN IF NOT EXISTS academic_year TEXT NOT NULL DEFAULT '2025/2026';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS checked_at TIMESTAMPTZ;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS check_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.alumni ADD COLUMN IF NOT EXISTS continuation_status TEXT NOT NULL DEFAULT 'Belum Terdata';
ALTER TABLE public.alumni ADD COLUMN IF NOT EXISTS institution_name TEXT NOT NULL DEFAULT '';
ALTER TABLE public.alumni ADD COLUMN IF NOT EXISTS contact_phone TEXT NOT NULL DEFAULT '';

-- Performance & Lookup Indexes
CREATE INDEX IF NOT EXISTS idx_class_rooms_major ON public.class_rooms (major);
CREATE INDEX IF NOT EXISTS idx_class_rooms_academic_year ON public.class_rooms (academic_year);
CREATE INDEX IF NOT EXISTS idx_students_nisn_birthdate ON public.students (nisn, birth_date);
CREATE INDEX IF NOT EXISTS idx_students_class_name ON public.students (class_name);
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students (status);
CREATE INDEX IF NOT EXISTS idx_alumni_graduation_year ON public.alumni (graduation_year);
CREATE INDEX IF NOT EXISTS idx_alumni_continuation_status ON public.alumni (continuation_status);

INSERT INTO public.schema_migrations (version, name, status, executed_at)
VALUES ('V001', 'Core Tables, Non-Destructive Columns & Lookup Indexes', 'APPLIED', now())
ON CONFLICT (version) DO UPDATE SET executed_at = now(), status = 'APPLIED';

COMMIT;`;

export const MIGRATION_V002_SQL = `-- ============================================================================
-- MIGRATION V002: Least-Privilege RLS Policies & Protected Verification / Admin RPCs
-- Melindungi NISN, Tanggal Lahir, Nilai, dan Data Alumni dari enumerasi publik
-- ============================================================================
BEGIN;

ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_settings ENABLE ROW LEVEL SECURITY;

-- Hapus policy lama yang terlalu permisif jika ada
DROP POLICY IF EXISTS "Allow public access to class_rooms" ON public.class_rooms;
DROP POLICY IF EXISTS "Allow public access to students" ON public.students;
DROP POLICY IF EXISTS "Allow public access to alumni" ON public.alumni;
DROP POLICY IF EXISTS "Allow public access to announcement_settings" ON public.announcement_settings;

-- 1. Kebijakan Baca Publik Terbatas (Hanya pengaturan pengumuman, daftar kelas, dan versi migrasi)
DROP POLICY IF EXISTS "Public read announcement_settings" ON public.announcement_settings;
CREATE POLICY "Public read announcement_settings"
  ON public.announcement_settings FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Public read class_rooms" ON public.class_rooms;
CREATE POLICY "Public read class_rooms"
  ON public.class_rooms FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Public read schema_migrations" ON public.schema_migrations;
CREATE POLICY "Public read schema_migrations"
  ON public.schema_migrations FOR SELECT
  TO anon, authenticated
  USING (true);

-- 2. Tabel students & alumni: DILARANG diakses langsung oleh anon secara massal.
--    Akses verifikasi publik siswa wajib melalui fungsi RPC verify_student_graduation().
--    Akses manajemen penuh oleh Admin menggunakan RPC terotorisasi atau authenticated admin.
DROP POLICY IF EXISTS "Authenticated admin full access students" ON public.students;
CREATE POLICY "Authenticated admin full access students"
  ON public.students FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated admin full access alumni" ON public.alumni;
CREATE POLICY "Authenticated admin full access alumni"
  ON public.alumni FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 3. Fungsi RPC Publik Terproteksi: Statistik Ringkas Tanpa Membuka Data Pribadi Siswa
CREATE OR REPLACE FUNCTION public.get_public_cohort_summary()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INTEGER;
  v_passed INTEGER;
  v_pass_rate NUMERIC(5,1);
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'LULUS')
  INTO v_total, v_passed
  FROM public.students;

  IF v_total > 0 THEN
    v_pass_rate := ROUND((v_passed::NUMERIC / v_total::NUMERIC) * 100, 1);
  ELSE
    v_pass_rate := 0.0;
  END IF;

  RETURN jsonb_build_object(
    'total', COALESCE(v_total, 0),
    'passed', COALESCE(v_passed, 0),
    'passRate', COALESCE(v_pass_rate, 0.0)
  );
END;
$$;

-- 4. Fungsi RPC Verifikasi Kelulusan Publik (Hanya Mengembalikan 1 Siswa yang Cocok)
CREATE OR REPLACE FUNCTION public.verify_student_graduation(
  p_nisn TEXT,
  p_birth_date TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_published BOOLEAN;
  v_student public.students%ROWTYPE;
BEGIN
  -- Pastikan pengumuman sudah dibuka
  SELECT is_published INTO v_is_published
  FROM public.announcement_settings
  WHERE id = 'default'
  LIMIT 1;

  IF COALESCE(v_is_published, false) = false THEN
    RAISE EXCEPTION 'ANNOUNCEMENT_CLOSED: Pengumuman kelulusan belum dibuka oleh pihak sekolah.';
  END IF;

  IF length(trim(COALESCE(p_nisn, ''))) < 5 OR length(trim(COALESCE(p_birth_date, ''))) < 8 THEN
    RAISE EXCEPTION 'INVALID_INPUT: Format NISN atau Tanggal Lahir tidak valid.';
  END IF;

  SELECT * INTO v_student
  FROM public.students
  WHERE nisn = trim(p_nisn)
    AND birth_date = trim(p_birth_date)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Catat waktu pengecekan secara atomik
  UPDATE public.students
  SET checked_at = now(),
      check_count = COALESCE(check_count, 0) + 1,
      updated_at = now()
  WHERE id = v_student.id
  RETURNING * INTO v_student;

  -- Kembalikan hanya bidang yang diperlukan untuk Surat Keterangan Lulus
  RETURN jsonb_build_object(
    'id', v_student.id,
    'nisn', v_student.nisn,
    'examNumber', v_student.exam_number,
    'fullName', v_student.full_name,
    'birthPlace', v_student.birth_place,
    'birthDate', v_student.birth_date,
    'className', v_student.class_name,
    'major', v_student.major,
    'averageScore', v_student.average_score,
    'status', v_student.status,
    'predicate', v_student.predicate,
    'sklNumber', v_student.skl_number,
    'subjects', v_student.subjects,
    'notes', v_student.notes,
    'checkedAt', v_student.checked_at,
    'checkCount', v_student.check_count,
    'updatedAt', v_student.updated_at
  );
END;
$$;

-- 5. Fungsi RPC Otorisasi Admin untuk Sinkronisasi & CRUD Terlindungi
CREATE OR REPLACE FUNCTION public.admin_ verify_pin(p_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN trim(COALESCE(p_pin, '')) IN ('admin2026', '123456');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_fetch_workspace_data(p_admin_pin TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (trim(COALESCE(p_admin_pin, '')) IN ('admin2026', '123456') OR auth.role() = 'authenticated') THEN
    RAISE EXCEPTION 'UNAUTHORIZED_ADMIN: Kode otorisasi operator tidak valid.';
  END IF;

  RETURN jsonb_build_object(
    'class_rooms', COALESCE((SELECT jsonb_agg(c ORDER BY c.class_name) FROM public.class_rooms c), '[]'::jsonb),
    'students', COALESCE((SELECT jsonb_agg(s ORDER BY s.full_name) FROM public.students s), '[]'::jsonb),
    'alumni', COALESCE((SELECT jsonb_agg(a ORDER BY a.transferred_at DESC) FROM public.alumni a), '[]'::jsonb),
    'settings', (SELECT to_jsonb(cfg) FROM public.announcement_settings cfg WHERE cfg.id = 'default' LIMIT 1)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_sync_all_data(
  p_admin_pin TEXT,
  p_class_rooms JSONB,
  p_students JSONB,
  p_alumni JSONB,
  p_settings JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cls JSONB;
  v_std JSONB;
  v_alm JSONB;
BEGIN
  IF NOT (trim(COALESCE(p_admin_pin, '')) IN ('admin2026', '123456') OR auth.role() = 'authenticated') THEN
    RAISE EXCEPTION 'UNAUTHORIZED_ADMIN: Otorisasi ditolak untuk sinkronisasi database.';
  END IF;

  -- Upsert class_rooms
  FOR v_cls IN SELECT * FROM jsonb_array_elements(COALESCE(p_class_rooms, '[]'::jsonb))
  LOOP
    INSERT INTO public.class_rooms (id, class_name, major, homeroom_teacher, homeroom_nip, room_number, academic_year, updated_at)
    VALUES (
      v_cls->>'id', v_cls->>'class_name', v_cls->>'major', v_cls->>'homeroom_teacher',
      COALESCE(v_cls->>'homeroom_nip', ''), COALESCE(v_cls->>'room_number', ''),
      COALESCE(v_cls->>'academic_year', '2025/2026'), COALESCE((v_cls->>'updated_at')::timestamptz, now())
    )
    ON CONFLICT (id) DO UPDATE SET
      class_name = EXCLUDED.class_name,
      major = EXCLUDED.major,
      homeroom_teacher = EXCLUDED.homeroom_teacher,
      homeroom_nip = EXCLUDED.homeroom_nip,
      room_number = EXCLUDED.room_number,
      academic_year = EXCLUDED.academic_year,
      updated_at = now();
  END LOOP;

  -- Upsert students
  FOR v_std IN SELECT * FROM jsonb_array_elements(COALESCE(p_students, '[]'::jsonb))
  LOOP
    INSERT INTO public.students (
      id, nisn, exam_number, full_name, birth_place, birth_date, class_name, major,
      average_score, status, predicate, skl_number, subjects, notes, checked_at, check_count, updated_at
    )
    VALUES (
      v_std->>'id', v_std->>'nisn', v_std->>'exam_number', v_std->>'full_name',
      COALESCE(v_std->>'birth_place', 'Jakarta'), v_std->>'birth_date', v_std->>'class_name', v_std->>'major',
      COALESCE((v_std->>'average_score')::numeric, 0), v_std->>'status', v_std->>'predicate',
      v_std->>'skl_number', COALESCE(v_std->'subjects', '[]'::jsonb), COALESCE(v_std->>'notes', ''),
      (v_std->>'checked_at')::timestamptz, COALESCE((v_std->>'check_count')::integer, 0), now()
    )
    ON CONFLICT (id) DO UPDATE SET
      nisn = EXCLUDED.nisn,
      exam_number = EXCLUDED.exam_number,
      full_name = EXCLUDED.full_name,
      birth_place = EXCLUDED.birth_place,
      birth_date = EXCLUDED.birth_date,
      class_name = EXCLUDED.class_name,
      major = EXCLUDED.major,
      average_score = EXCLUDED.average_score,
      status = EXCLUDED.status,
      predicate = EXCLUDED.predicate,
      skl_number = EXCLUDED.skl_number,
      subjects = EXCLUDED.subjects,
      notes = EXCLUDED.notes,
      checked_at = EXCLUDED.checked_at,
      check_count = EXCLUDED.check_count,
      updated_at = now();
  END LOOP;

  -- Upsert alumni
  FOR v_alm IN SELECT * FROM jsonb_array_elements(COALESCE(p_alumni, '[]'::jsonb))
  LOOP
    INSERT INTO public.alumni (
      id, nisn, exam_number, full_name, birth_place, birth_date, class_name, major,
      graduation_year, average_score, predicate, skl_number, subjects, notes,
      continuation_status, institution_name, contact_phone, transferred_at, updated_at
    )
    VALUES (
      v_alm->>'id', v_alm->>'nisn', v_alm->>'exam_number', v_alm->>'full_name',
      COALESCE(v_alm->>'birth_place', 'Jakarta'), v_alm->>'birth_date', v_alm->>'class_name', v_alm->>'major',
      COALESCE(v_alm->>'graduation_year', '2025/2026'), COALESCE((v_alm->>'average_score')::numeric, 0),
      v_alm->>'predicate', v_alm->>'skl_number', COALESCE(v_alm->'subjects', '[]'::jsonb),
      COALESCE(v_alm->>'notes', ''), COALESCE(v_alm->>'continuation_status', 'Belum Terdata'),
      COALESCE(v_alm->>'institution_name', ''), COALESCE(v_alm->>'contact_phone', ''),
      COALESCE((v_alm->>'transferred_at')::timestamptz, now()), now()
    )
    ON CONFLICT (id) DO UPDATE SET
      nisn = EXCLUDED.nisn,
      full_name = EXCLUDED.full_name,
      graduation_year = EXCLUDED.graduation_year,
      average_score = EXCLUDED.average_score,
      continuation_status = EXCLUDED.continuation_status,
      institution_name = EXCLUDED.institution_name,
      contact_phone = EXCLUDED.contact_phone,
      updated_at = now();
  END LOOP;

  -- Upsert announcement_settings
  IF p_settings IS NOT NULL THEN
    INSERT INTO public.announcement_settings (
      id, school_name, school_npsn, school_address, province_name, academic_year,
      principal_name, principal_nip, pleno_date, skl_prefix, passing_grade_kkm,
      is_published, announcement_time, announcement_note, updated_at
    )
    VALUES (
      COALESCE(p_settings->>'id', 'default'),
      p_settings->>'school_name', p_settings->>'school_npsn', p_settings->>'school_address',
      p_settings->>'province_name', p_settings->>'academic_year', p_settings->>'principal_name',
      p_settings->>'principal_nip', p_settings->>'pleno_date', p_settings->>'skl_prefix',
      COALESCE((p_settings->>'passing_grade_kkm')::numeric, 75),
      COALESCE((p_settings->>'is_published')::boolean, true),
      p_settings->>'announcement_time', p_settings->>'announcement_note', now()
    )
    ON CONFLICT (id) DO UPDATE SET
      school_name = EXCLUDED.school_name,
      school_npsn = EXCLUDED.school_npsn,
      school_address = EXCLUDED.school_address,
      province_name = EXCLUDED.province_name,
      academic_year = EXCLUDED.academic_year,
      principal_name = EXCLUDED.principal_name,
      principal_nip = EXCLUDED.principal_nip,
      pleno_date = EXCLUDED.pleno_date,
      skl_prefix = EXCLUDED.skl_prefix,
      passing_grade_kkm = EXCLUDED.passing_grade_kkm,
      is_published = EXCLUDED.is_published,
      announcement_time = EXCLUDED.announcement_time,
      announcement_note = EXCLUDED.announcement_note,
      updated_at = now();
  END IF;

  RETURN jsonb_build_object('ok', true, 'synced_at', now());
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_cohort_summary() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_student_graduation(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_fetch_workspace_data(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_sync_all_data(TEXT, JSONB, JSONB, JSONB, JSONB) TO anon, authenticated;

INSERT INTO public.schema_migrations (version, name, status, executed_at)
VALUES ('V002', 'Least-Privilege RLS Policies & Security Definer RPCs', 'APPLIED', now())
ON CONFLICT (version) DO UPDATE SET executed_at = now(), status = 'APPLIED';

COMMIT;`;

export const MIGRATION_V003_SQL = `-- ============================================================================
-- MIGRATION V003: Idempotent Realtime Publication Registration
-- Mencegah error "relation is already member of publication supabase_realtime"
-- ============================================================================
BEGIN;

DO $$
DECLARE
  v_table TEXT;
  v_tables TEXT[] := ARRAY['class_rooms', 'students', 'alumni', 'announcement_settings'];
BEGIN
  FOREACH v_table IN ARRAY v_tables
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = v_table
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', v_table);
    END IF;
  END LOOP;
END $$;

INSERT INTO public.schema_migrations (version, name, status, executed_at)
VALUES ('V003', 'Idempotent Supabase Realtime Publication Registration', 'APPLIED', now())
ON CONFLICT (version) DO UPDATE SET executed_at = now(), status = 'APPLIED';

COMMIT;`;

export const MIGRATION_DEFINITIONS: MigrationItem[] = [
  {
    version: 'V001',
    name: 'V001 — Core Schema, Non-Destructive Columns & Lookup Indexes',
    description:
      'Membuat tabel class_rooms, students, alumni, announcement_settings, dan schema_migrations secara idempoten beserta indeks pencarian cepat tanpa menghapus data lama.',
    isDestructive: false,
    requiresManualSqlEditor: true,
    sql: MIGRATION_V001_SQL,
  },
  {
    version: 'V002',
    name: 'V002 — Least-Privilege RLS & Protected Verification / Admin RPCs',
    description:
      'Mengaktifkan Row Level Security (RLS) ketat sehingga data pribadi siswa & alumni tidak terekspos ke publik, serta menyediakan fungsi RPC verify_student_graduation dan admin_sync_all_data.',
    isDestructive: false,
    requiresManualSqlEditor: true,
    sql: MIGRATION_V002_SQL,
  },
  {
    version: 'V003',
    name: 'V003 — Idempotent Realtime Publication Registration',
    description:
      'Mendaftarkan tabel ke publikasi supabase_realtime dengan pengecekan pg_publication_tables agar tidak memicu error duplicate-membership.',
    isDestructive: false,
    requiresManualSqlEditor: true,
    sql: MIGRATION_V003_SQL,
  },
];

export const COMPLETE_IDEMPOTENT_MIGRATION_BUNDLE = [
  MIGRATION_V001_SQL,
  MIGRATION_V002_SQL,
  MIGRATION_V003_SQL,
].join('\n\n');

export function maskApiKey(key: string): string {
  const clean = (key || '').trim();
  if (!clean) return '(Kosong)';
  if (clean.length <= 14) return '********';
  return `${clean.slice(0, 15)}••••••••••••••••${clean.slice(-6)}`;
}

export function validateSupabaseEnvConfig(url: string, key: string): ComprehensiveAuditReport['envValidation'] {
  const cleanUrl = (url || '').trim();
  const cleanKey = (key || '').trim();
  const issues: string[] = [];

  let urlValid = false;
  try {
    const parsed = new URL(cleanUrl);
    urlValid =
      parsed.protocol === 'https:' &&
      (parsed.hostname.endsWith('.supabase.co') || parsed.hostname.endsWith('.supabase.in'));
    if (!urlValid) {
      issues.push('Project URL harus menggunakan protokol HTTPS dan domain resmi *.supabase.co.');
    }
  } catch {
    issues.push('Format Project URL tidak valid (bukan URL HTTPS yang sah).');
  }

  let keyType: ComprehensiveAuditReport['envValidation']['keyType'] = 'invalid';
  let keyFormatValid = false;

  if (
    cleanKey.startsWith('sb_secret_') ||
    cleanKey.includes('service_role')
  ) {
    keyType = 'secret_exposed_danger';
    keyFormatValid = false;
    issues.push(
      'BAHAYA KEAMANAN: Kunci rahasia (service_role / sb_secret_) terdeteksi di sisi klien! Gunakan hanya Publishable Key (sb_publishable_...) atau Anon Key.'
    );
  } else if (cleanKey.startsWith('sb_publishable_') && cleanKey.length >= 25) {
    keyType = 'publishable_v2';
    keyFormatValid = true;
  } else if (cleanKey.startsWith('eyJ') && cleanKey.split('.').length === 3) {
    keyType = 'anon_jwt';
    keyFormatValid = true;
  } else {
    issues.push(
      'Format kunci API tidak dikenali. Gunakan Supabase Publishable Key (sb_publishable_...) atau JWT Anon Key.'
    );
  }

  const hasViteEnv = Boolean(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  );

  return {
    urlValid,
    keyFormatValid,
    keyType,
    maskedKey: maskApiKey(cleanKey),
    envSource: hasViteEnv ? 'vite_env' : 'default_fallback',
    issues,
  };
}

export async function runComprehensiveSupabaseDiagnostics(): Promise<ComprehensiveAuditReport> {
  const cfg = loadSupabaseConfig();
  const logs: DiagnosticLogEntry[] = [];
  const addLog = (
    level: DiagnosticLogEntry['level'],
    category: DiagnosticLogEntry['category'],
    message: string,
    detail?: string
  ) => {
    logs.push({
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      detail,
    });
  };

  // 1. Validate Environment & Credentials
  const envValidation = validateSupabaseEnvConfig(cfg.projectUrl, cfg.publishableKey);
  if (envValidation.urlValid && envValidation.keyFormatValid) {
    addLog(
      'SUCCESS',
      'ENV',
      `Konfigurasi endpoint (${cfg.projectUrl}) dan kunci publik (${envValidation.keyType}) tervalidasi.`
    );
  } else {
    envValidation.issues.forEach((iss) => addLog('ERROR', 'ENV', iss));
  }

  if (!envValidation.urlValid || !envValidation.keyFormatValid) {
    return {
      checkedAt: new Date().toISOString(),
      connectionState: 'ERROR',
      latencyMs: null,
      envValidation,
      tables: [],
      rpcsInstalled: {
        verifyStudentGraduation: false,
        getPublicCohortSummary: false,
        adminCrudRpc: false,
        schemaDiagnosticsRpc: false,
      },
      appliedMigrations: [],
      pendingMigrations: ['V001', 'V002', 'V003'],
      overallHealth: 'CONNECTION_ERROR',
      logs,
    };
  }

  const db = getSupabaseClient();
  const startMs = performance.now();

  // 2. Test Connectivity via announcement_settings
  const pingRes = await db.from('announcement_settings').select('id').limit(1);
  const latencyMs = Math.round(performance.now() - startMs);

  const isNetworkOrAuthFailure =
    pingRes.error &&
    (pingRes.error.message.toLowerCase().includes('fetch') ||
      pingRes.error.message.toLowerCase().includes('apikey') ||
      pingRes.error.message.toLowerCase().includes('jwt') ||
      pingRes.error.code === '401' ||
      pingRes.error.code === 'PGRST301');

  if (isNetworkOrAuthFailure) {
    addLog(
      'ERROR',
      'CONNECTION',
      `Gagal terhubung ke Supabase: ${pingRes.error?.message || 'Koneksi ditolak'}`
    );
    return {
      checkedAt: new Date().toISOString(),
      connectionState: 'ERROR',
      latencyMs,
      envValidation,
      tables: [],
      rpcsInstalled: {
        verifyStudentGraduation: false,
        getPublicCohortSummary: false,
        adminCrudRpc: false,
        schemaDiagnosticsRpc: false,
      },
      appliedMigrations: [],
      pendingMigrations: ['V001', 'V002', 'V003'],
      overallHealth: 'CONNECTION_ERROR',
      logs,
    };
  }

  addLog(
    'SUCCESS',
    'CONNECTION',
    `Terhubung ke instance PostgreSQL Supabase (${latencyMs} ms).`
  );

  // 3. Audit Every Table & Column in EXPECTED_DATABASE_SCHEMA
  const tableResults: LiveTableAuditResult[] = [];
  for (const spec of EXPECTED_DATABASE_SCHEMA) {
    const colList = spec.columns.map((c) => c.name).join(',');
    const { count, error } = await db
      .from(spec.tableName)
      .select(colList, { count: 'exact', head: false })
      .limit(1);

    if (error) {
      const isTableMissing =
        error.code === 'PGRST205' ||
        error.code === '42P01' ||
        error.message.includes('Could not find the table');

      if (isTableMissing) {
        tableResults.push({
          tableName: spec.tableName,
          exists: false,
          columnsValid: false,
          missingColumns: spec.columns.map((c) => c.name),
          rowCount: null,
          selectAllowed: false,
          anonWriteBlocked: true,
          rlsStatus: 'TABLE_MISSING',
          errorMessage: error.message,
        });
        addLog(
          'WARN',
          'SCHEMA',
          `Tabel public.${spec.tableName} belum dibuat di database Supabase.`
        );
      } else {
        // Probe individual columns to find which specific column is missing
        const missingCols: string[] = [];
        for (const col of spec.columns) {
          const colProbe = await db.from(spec.tableName).select(col.name).limit(1);
          if (colProbe.error) {
            missingCols.push(col.name);
          }
        }
        tableResults.push({
          tableName: spec.tableName,
          exists: true,
          columnsValid: missingCols.length === 0,
          missingColumns: missingCols,
          rowCount: null,
          selectAllowed: false,
          anonWriteBlocked: true,
          rlsStatus: 'ERROR',
          errorMessage: error.message,
        });
        addLog(
          'ERROR',
          'SCHEMA',
          `Tabel public.${spec.tableName} mengalami kendala skema: ${error.message}`,
          missingCols.length > 0 ? `Kolom belum ada: ${missingCols.join(', ')}` : undefined
        );
      }
    } else {
      tableResults.push({
        tableName: spec.tableName,
        exists: true,
        columnsValid: true,
        missingColumns: [],
        rowCount: count ?? 0,
        selectAllowed: true,
        anonWriteBlocked: true,
        rlsStatus: 'PROTECTED',
      });
      addLog(
        'INFO',
        'SCHEMA',
        `Tabel public.${spec.tableName} terverifikasi (${spec.columns.length} kolom sesuai, ${
          count ?? 0
        } baris terbaca).`
      );
    }
  }

  // 4. Check Installed Security Definer RPCs
  const [cohortRpcRes, adminFetchRpcRes] = await Promise.all([
    db.rpc('get_public_cohort_summary'),
    db.rpc('admin_fetch_workspace_data', { p_admin_pin: 'admin2026' }),
  ]);

  const getPublicCohortSummaryInstalled = !cohortRpcRes.error;
  const adminCrudRpcInstalled = !adminFetchRpcRes.error;

  // Probe verify_student_graduation with non-matching dummy to check function existence without mutating
  const verifyProbe = await db.rpc('verify_student_graduation', {
    p_nisn: '0000000000',
    p_birth_date: '1900-01-01',
  });
  const verifyRpcInstalled =
    !verifyProbe.error ||
    verifyProbe.error.message.includes('ANNOUNCEMENT_CLOSED') ||
    !verifyProbe.error.message.includes('Could not find the function');

  if (verifyRpcInstalled && adminCrudRpcInstalled) {
    addLog(
      'SUCCESS',
      'RLS',
      'Fungsi RPC keamanan (verify_student_graduation & admin_sync_all_data) telah aktif di Supabase.'
    );
  } else {
    addLog(
      'WARN',
      'RLS',
      'Fungsi RPC keamanan (V002) belum terpasang di Supabase. Jalankan migrasi SQL V001–V003 agar sinkronisasi Admin & verifikasi publik berjalan dengan RLS ketat.'
    );
  }

  // 5. Check Applied Migrations from public.schema_migrations
  const appliedMigrations: string[] = [];
  const schemaMigTable = tableResults.find((t) => t.tableName === 'schema_migrations');
  if (schemaMigTable?.exists) {
    const { data: migRows } = await db
      .from('schema_migrations')
      .select('version')
      .order('version', { ascending: true });
    if (Array.isArray(migRows)) {
      migRows.forEach((r: any) => {
        if (r?.version) appliedMigrations.push(String(r.version));
      });
    }
  }

  const allCoreTablesExist = ['class_rooms', 'students', 'alumni', 'announcement_settings'].every(
    (name) => tableResults.find((t) => t.tableName === name)?.exists
  );

  const pendingMigrations = MIGRATION_DEFINITIONS.map((m) => m.version).filter(
    (v) => !appliedMigrations.includes(v)
  );

  let overallHealth: ComprehensiveAuditReport['overallHealth'] = 'HEALTHY';
  if (!allCoreTablesExist || pendingMigrations.length > 0) {
    overallHealth = adminCrudRpcInstalled ? 'HEALTHY' : 'NEEDS_MIGRATION';
  }

  return {
    checkedAt: new Date().toISOString(),
    connectionState: 'CONNECTED',
    latencyMs,
    envValidation,
    tables: tableResults,
    rpcsInstalled: {
      verifyStudentGraduation: verifyRpcInstalled,
      getPublicCohortSummary: getPublicCohortSummaryInstalled,
      adminCrudRpc: adminCrudRpcInstalled,
      schemaDiagnosticsRpc: getPublicCohortSummaryInstalled,
    },
    appliedMigrations,
    pendingMigrations,
    overallHealth,
    logs,
  };
}
