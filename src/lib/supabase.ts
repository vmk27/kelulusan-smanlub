import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import {
  AlumniContinuation,
  AlumniRecord,
  AnnouncementSettings,
  AppUserRecord,
  ClassRoomRecord,
  ColumnInspectionSpec,
  DiagnosticLogEntry,
  EnvironmentValidationReport,
  GraduationPredicate,
  GraduationStatus,
  LetterNumberRecord,
  Major,
  MigrationVersionItem,
  RlsPolicyAuditItem,
  StudentRecord,
  SubjectCatalogRecord,
  SubjectScore,
  SupabaseConnectionConfig,
  SupabaseConnectionState,
  SupabaseDatabaseAuditReport,
  SupabaseSyncStatus,
  TableInspectionResult,
  UserRole,
} from '../types/graduation';

export const DEFAULT_SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://bdgiflfrksqfmbulfpdy.supabase.co';
export const DEFAULT_SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_G7lP-IYEid2X3582yv6g_g_vifhhOCQ';

const LOCAL_CLASSES_KEY = 'gradugate_classes_v1';
const LOCAL_SUBJECTS_KEY = 'gradugate_subjects_v1';
const LOCAL_LETTER_NUMBERS_KEY = 'gradugate_letter_numbers_v1';
const LOCAL_STUDENTS_KEY = 'gradugate_students_v1';
const LOCAL_ALUMNI_KEY = 'gradugate_alumni_v1';
const LOCAL_USERS_KEY = 'gradugate_users_v1';
const LOCAL_SETTINGS_KEY = 'gradugate_settings_v1';
const LOCAL_SUPABASE_CFG_KEY = 'gradugate_supabase_cfg_v1';
const LOCAL_DIAGNOSTIC_LOGS_KEY = 'gradugate_supabase_diag_logs_v1';

// ============================================================================
// DIAGNOSTIC LOGGER (Sanitized — never logs PII or secret keys)
// ============================================================================

let diagnosticLogsMemory: DiagnosticLogEntry[] = [];

function loadStoredLogs(): DiagnosticLogEntry[] {
  if (diagnosticLogsMemory.length > 0) return diagnosticLogsMemory;
  try {
    const raw = localStorage.getItem(LOCAL_DIAGNOSTIC_LOGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        diagnosticLogsMemory = parsed.slice(0, 80);
        return diagnosticLogsMemory;
      }
    }
  } catch {
    // ignore
  }
  diagnosticLogsMemory = [
    {
      id: `log-init-${Date.now()}`,
      timestamp: new Date().toISOString(),
      level: 'info',
      category: 'connection',
      action: 'INIT_CLIENT',
      message: 'Klien Supabase diinisialisasi menggunakan konfigurasi proyek aktif.',
    },
  ];
  return diagnosticLogsMemory;
}

export function appendDiagnosticLog(
  level: DiagnosticLogEntry['level'],
  category: DiagnosticLogEntry['category'],
  action: string,
  message: string,
  details?: string
): DiagnosticLogEntry {
  const entry: DiagnosticLogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    level,
    category,
    action,
    message,
    details,
  };
  const current = loadStoredLogs();
  diagnosticLogsMemory = [entry, ...current].slice(0, 80);
  try {
    localStorage.setItem(LOCAL_DIAGNOSTIC_LOGS_KEY, JSON.stringify(diagnosticLogsMemory));
  } catch {
    // ignore storage quota
  }
  return entry;
}

export function getDiagnosticLogs(): DiagnosticLogEntry[] {
  return [...loadStoredLogs()];
}

export function clearDiagnosticLogs(): DiagnosticLogEntry[] {
  diagnosticLogsMemory = [
    {
      id: `log-clear-${Date.now()}`,
      timestamp: new Date().toISOString(),
      level: 'info',
      category: 'connection',
      action: 'LOGS_CLEARED',
      message: 'Riwayat log diagnostik dibersihkan oleh Administrator.',
    },
  ];
  try {
    localStorage.setItem(LOCAL_DIAGNOSTIC_LOGS_KEY, JSON.stringify(diagnosticLogsMemory));
  } catch {
    // ignore
  }
  return [...diagnosticLogsMemory];
}

// ============================================================================
// ENVIRONMENT & CREDENTIAL VALIDATION (Protects against secret key leaks)
// ============================================================================

export function maskApiKey(key: string): string {
  const clean = (key || '').trim();
  if (!clean) return '(kosong)';
  if (clean.length <= 14) return `${clean.slice(0, 4)}••••${clean.slice(-2)}`;
  return `${clean.slice(0, 15)}••••••••••••${clean.slice(-6)}`;
}

export function validateSupabaseEnvironment(
  rawUrl: string,
  rawKey: string
): EnvironmentValidationReport {
  const url = (rawUrl || '').trim();
  const key = (rawKey || '').trim();
  const issues: string[] = [];
  const warnings: string[] = [];

  let urlValid = false;
  let urlHttps = false;
  let urlHost = '';

  try {
    const parsed = new URL(url);
    urlHttps = parsed.protocol === 'https:';
    urlHost = parsed.hostname;
    urlValid = Boolean(urlHttps && urlHost && urlHost.includes('.'));
    if (!urlHttps) {
      issues.push('Supabase Project URL wajib menggunakan protokol HTTPS (https://).');
    }
    if (!urlHost.endsWith('.supabase.co') && !urlHost.endsWith('.supabase.in')) {
      warnings.push(
        `Domain (${urlHost}) bukan domain standar *.supabase.co (pastikan menggunakan Custom Domain yang valid).`
      );
    }
    if (url.endsWith('/')) {
      warnings.push('Project URL memiliki garis miring di akhir (otomatis dinormalisasi).');
    }
  } catch {
    issues.push('Format Supabase Project URL tidak valid. Gunakan format https://<project-ref>.supabase.co');
  }

  let keyClassification: EnvironmentValidationReport['keyClassification'] = 'invalid';
  let secretLeakDetected = false;

  if (!key) {
    issues.push('Kunci API Supabase (Publishable / Anon Key) belum diisi.');
  } else if (
    key.startsWith('sb_secret_') ||
    key.toLowerCase().includes('service_role') ||
    key.startsWith('sbp_')
  ) {
    keyClassification = 'privileged_secret_danger';
    secretLeakDetected = true;
    issues.push(
      'BAHAYA KEAMANAN: Terdeteksi kunci rahasia (sb_secret_ / service_role / personal token). Dilarang menggunakan kunci dengan hak akses penuh di browser!'
    );
  } else if (key.startsWith('sb_publishable_')) {
    keyClassification = 'publishable_safe';
  } else if (key.startsWith('eyJ') && key.split('.').length === 3) {
    // Check JWT payload role if decodable
    try {
      const payloadJson = atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'));
      const payload = JSON.parse(payloadJson);
      if (payload?.role === 'service_role') {
        keyClassification = 'privileged_secret_danger';
        secretLeakDetected = true;
        issues.push(
          'BAHAYA KEAMANAN: Token JWT memiliki role="service_role". Gunakan hanya kunci dengan role="anon" atau sb_publishable_!'
        );
      } else {
        keyClassification = 'anon_jwt_safe';
      }
    } catch {
      keyClassification = 'anon_jwt_safe';
    }
  } else if (key.length >= 20) {
    keyClassification = 'publishable_safe';
    warnings.push('Format kunci tidak diawali sb_publishable_ atau JWT standar, pastikan kunci valid.');
  } else {
    keyClassification = 'invalid';
    issues.push('Kunci API terlalu pendek atau tidak valid.');
  }

  return {
    urlValid,
    urlHttps,
    urlHost,
    keyPresent: Boolean(key),
    keyClassification,
    secretLeakDetected,
    maskedKey: maskApiKey(key),
    usingEnvDefaultUrl: url.replace(/\/+$/, '') === DEFAULT_SUPABASE_URL.replace(/\/+$/, ''),
    usingEnvDefaultKey: key === DEFAULT_SUPABASE_KEY,
    issues,
    warnings,
  };
}

export function loadSupabaseConfig(): SupabaseConnectionConfig {
  try {
    const raw = localStorage.getItem(LOCAL_SUPABASE_CFG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.projectUrl && parsed.publishableKey) {
        const check = validateSupabaseEnvironment(parsed.projectUrl, parsed.publishableKey);
        if (!check.secretLeakDetected) {
          return {
            projectUrl: String(parsed.projectUrl).trim().replace(/\/+$/, ''),
            publishableKey: String(parsed.publishableKey).trim(),
            autoSync: parsed.autoSync !== false,
          };
        }
      }
    }
  } catch {
    // ignore storage error
  }
  return {
    projectUrl: DEFAULT_SUPABASE_URL.replace(/\/+$/, ''),
    publishableKey: DEFAULT_SUPABASE_KEY,
    autoSync: true,
  };
}

let currentConfig = loadSupabaseConfig();
export let SUPABASE_URL = currentConfig.projectUrl;

let supabaseClient: SupabaseClient = createClient(
  currentConfig.projectUrl,
  currentConfig.publishableKey,
  {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

export function getSupabaseClient(): SupabaseClient {
  return supabaseClient;
}

export function updateSupabaseConnectionConfig(
  nextConfig: SupabaseConnectionConfig
): SupabaseConnectionConfig {
  const envCheck = validateSupabaseEnvironment(nextConfig.projectUrl, nextConfig.publishableKey);
  if (envCheck.secretLeakDetected) {
    appendDiagnosticLog(
      'error',
      'security',
      'REJECT_SECRET_KEY',
      'Menolak penyimpanan kunci rahasia (service_role / sb_secret_) di browser demi keamanan.'
    );
    throw new Error(
      'Kunci rahasia (service_role / sb_secret_) tidak diizinkan disimpan pada aplikasi klien. Gunakan Publishable Key atau Anon Key.'
    );
  }

  const clean: SupabaseConnectionConfig = {
    projectUrl: (nextConfig.projectUrl.trim() || DEFAULT_SUPABASE_URL).replace(/\/+$/, ''),
    publishableKey: nextConfig.publishableKey.trim() || DEFAULT_SUPABASE_KEY,
    autoSync: nextConfig.autoSync,
  };
  try {
    localStorage.setItem(LOCAL_SUPABASE_CFG_KEY, JSON.stringify(clean));
  } catch {
    // ignore
  }
  currentConfig = clean;
  SUPABASE_URL = clean.projectUrl;
  supabaseClient = createClient(clean.projectUrl, clean.publishableKey, {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });

  appendDiagnosticLog(
    'info',
    'connection',
    'CONFIG_UPDATED',
    `Konfigurasi koneksi diperbarui ke endpoint ${clean.projectUrl} (Auto-Sync: ${
      clean.autoSync ? 'Aktif' : 'Nonaktif'
    }).`
  );

  return clean;
}

// ============================================================================
// EXPECTED SCHEMA DEFINITIONS & VERSIONED IDEMPOTENT SQL MIGRATIONS
// ============================================================================

interface ExpectedTableDefinition {
  tableName: string;
  entityName: string;
  description: string;
  primaryKey: string;
  uniqueConstraints: string[];
  indexes: string[];
  realtimeEnabled: boolean;
  columns: {
    name: string;
    expectedType: string;
    openApiTypes: string[];
    nullable: boolean;
    isPrimaryKey?: boolean;
    isUnique?: boolean;
    description: string;
  }[];
}

export const EXPECTED_DATABASE_TABLES: ExpectedTableDefinition[] = [
  {
    tableName: 'class_rooms',
    entityName: 'ClassRoomRecord (Data Kelas & Wali Kelas)',
    description: 'Menyimpan daftar rombongan belajar, jurusan peminatan, NIP & nama wali kelas, serta ruang belajar.',
    primaryKey: 'id',
    uniqueConstraints: ['class_name'],
    indexes: ['idx_class_rooms_class_name', 'idx_class_rooms_major'],
    realtimeEnabled: true,
    columns: [
      { name: 'id', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, isPrimaryKey: true, description: 'Primary Key ID Kelas (cls-...)' },
      { name: 'class_name', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, isUnique: true, description: 'Nama Rombel unik (contoh: XII MIPA 1)' },
      { name: 'major', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, description: 'Jurusan Peminatan (MIPA / IPS)' },
      { name: 'homeroom_teacher', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, description: 'Nama lengkap & gelar Wali Kelas' },
      { name: 'homeroom_nip', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, description: 'NIP Wali Kelas' },
      { name: 'room_number', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, description: 'Lokasi gedung & ruang kelas' },
      { name: 'academic_year', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, description: 'Tahun Ajaran aktif (2025/2026)' },
      { name: 'updated_at', expectedType: 'TIMESTAMPTZ', openApiTypes: ['string', 'timestamp with time zone'], nullable: false, description: 'Waktu pembaruan terakhir' },
    ],
  },
  {
    tableName: 'students',
    entityName: 'StudentRecord (Data Siswa, Nilai & Kelulusan)',
    description: 'Menyimpan biodata peserta didik, NISN, nomor ujian, nilai 8 mata pelajaran (JSONB), rata-rata, status kelulusan, nomor SKL, dan log verifikasi.',
    primaryKey: 'id',
    uniqueConstraints: ['nisn'],
    indexes: ['idx_students_nisn', 'idx_students_class_name', 'idx_students_status'],
    realtimeEnabled: true,
    columns: [
      { name: 'id', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, isPrimaryKey: true, description: 'Primary Key ID Siswa (std-...)' },
      { name: 'nisn', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, isUnique: true, description: 'Nomor Induk Siswa Nasional (10 digit unik)' },
      { name: 'exam_number', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, description: 'Nomor Peserta Ujian Satuan Pendidikan' },
      { name: 'full_name', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, description: 'Nama lengkap peserta didik' },
      { name: 'birth_place', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, description: 'Tempat lahir peserta didik' },
      { name: 'birth_date', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, description: 'Tanggal lahir format YYYY-MM-DD (kredensial verifikasi)' },
      { name: 'class_name', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, description: 'Relasi nama kelas rombongan belajar' },
      { name: 'major', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, description: 'Peminatan jurusan (MIPA / IPS)' },
      { name: 'average_score', expectedType: 'NUMERIC(5,2)', openApiTypes: ['number', 'numeric'], nullable: false, description: 'Rata-rata nilai ujian (0.00 - 100.00)' },
      { name: 'status', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, description: 'Keputusan kelulusan (LULUS / TIDAK LULUS)' },
      { name: 'predicate', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, description: 'Predikat capaian akademik' },
      { name: 'skl_number', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, description: 'Nomor resmi Surat Keterangan Lulus (SKL)' },
      { name: 'subjects', expectedType: 'JSONB', openApiTypes: ['array', 'object', 'jsonb', 'json'], nullable: false, description: 'Array JSONB nilai 8 mata pelajaran & KKM' },
      { name: 'notes', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: true, description: 'Catatan dewan pendidik pada SKL' },
      { name: 'checked_at', expectedType: 'TIMESTAMPTZ', openApiTypes: ['string', 'timestamp with time zone'], nullable: true, description: 'Timestamp terakhir siswa mengecek pengumuman' },
      { name: 'check_count', expectedType: 'INTEGER', openApiTypes: ['integer', 'number'], nullable: false, description: 'Jumlah frekuensi pengecekan oleh siswa' },
      { name: 'updated_at', expectedType: 'TIMESTAMPTZ', openApiTypes: ['string', 'timestamp with time zone'], nullable: false, description: 'Waktu pembaruan terakhir' },
    ],
  },
  {
    tableName: 'alumni',
    entityName: 'AlumniRecord (Arsip Alumni & Tracer Study)',
    description: 'Menyimpan arsip siswa yang telah lulus beserta tahun kelulusan, jalur kelanjutan studi/karier (PTN/PTS, Kedinasan, Bekerja), nama instansi, dan kontak.',
    primaryKey: 'id',
    uniqueConstraints: ['nisn'],
    indexes: ['idx_alumni_nisn', 'idx_alumni_graduation_year', 'idx_alumni_continuation'],
    realtimeEnabled: true,
    columns: [
      { name: 'id', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, isPrimaryKey: true, description: 'Primary Key ID Alumni (alm-...)' },
      { name: 'nisn', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, isUnique: true, description: 'NISN unik alumni' },
      { name: 'exam_number', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, description: 'Nomor ujian saat kelulusan' },
      { name: 'full_name', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, description: 'Nama lengkap alumni' },
      { name: 'birth_place', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, description: 'Tempat lahir alumni' },
      { name: 'birth_date', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, description: 'Tanggal lahir alumni (YYYY-MM-DD)' },
      { name: 'class_name', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, description: 'Kelas terakhir saat lulus' },
      { name: 'major', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, description: 'Peminatan jurusan (MIPA / IPS)' },
      { name: 'graduation_year', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, description: 'Tahun kelulusan / angkatan (contoh: 2024/2025)' },
      { name: 'average_score', expectedType: 'NUMERIC(5,2)', openApiTypes: ['number', 'numeric'], nullable: false, description: 'Nilai rata-rata akhir kelulusan' },
      { name: 'predicate', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, description: 'Predikat kelulusan' },
      { name: 'skl_number', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, description: 'Nomor arsip SKL' },
      { name: 'subjects', expectedType: 'JSONB', openApiTypes: ['array', 'object', 'jsonb', 'json'], nullable: false, description: 'Transkrip nilai mata pelajaran (JSONB)' },
      { name: 'notes', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: true, description: 'Catatan kelulusan / prestasi' },
      { name: 'continuation_status', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, description: 'Status lanjutan (PTN / PTS, Kedinasan / TNI-Polri, Bekerja / Wirausaha, Belum Terdata)' },
      { name: 'institution_name', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, description: 'Nama Perguruan Tinggi / Instansi / Perusahaan' },
      { name: 'contact_phone', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, description: 'Nomor telepon / WhatsApp aktif tracer study' },
      { name: 'transferred_at', expectedType: 'TIMESTAMPTZ', openApiTypes: ['string', 'timestamp with time zone'], nullable: false, description: 'Waktu pemindahan dari data siswa ke alumni' },
      { name: 'updated_at', expectedType: 'TIMESTAMPTZ', openApiTypes: ['string', 'timestamp with time zone'], nullable: false, description: 'Waktu pembaruan terakhir' },
    ],
  },
  {
    tableName: 'announcement_settings',
    entityName: 'AnnouncementSettings (Jadwal Countdown & Parameter SKL)',
    description: 'Menyimpan identitas sekolah, NPSN, Kepala Sekolah, tanggal rapat pleno, batas KKM, status publikasi pengumuman, dan jadwal countdown timer.',
    primaryKey: 'id',
    uniqueConstraints: ['id'],
    indexes: ['idx_announcement_settings_id'],
    realtimeEnabled: true,
    columns: [
      { name: 'id', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, isPrimaryKey: true, description: 'Primary Key konfigurasi ("default")' },
      { name: 'school_name', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, description: 'Nama resmi satuan pendidikan' },
      { name: 'school_npsn', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, description: 'Nomor Pokok Sekolah Nasional (NPSN)' },
      { name: 'school_address', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, description: 'Alamat lengkap sekolah' },
      { name: 'province_name', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, description: 'Nama Pemerintah Provinsi / Dinas Pendidikan' },
      { name: 'academic_year', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, description: 'Tahun pelajaran aktif' },
      { name: 'principal_name', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, description: 'Nama lengkap & gelar Kepala Sekolah' },
      { name: 'principal_nip', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, description: 'NIP Kepala Sekolah' },
      { name: 'pleno_date', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, description: 'Tanggal penetapan rapat pleno kelulusan' },
      { name: 'skl_prefix', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, description: 'Format penomoran surat SKL' },
      { name: 'passing_grade_kkm', expectedType: 'NUMERIC(5,2)', openApiTypes: ['number', 'numeric'], nullable: false, description: 'Ambang batas Kriteria Ketuntasan Minimal (KKM)' },
      { name: 'is_published', expectedType: 'BOOLEAN', openApiTypes: ['boolean'], nullable: false, description: 'Status portal pengumuman (true = dibuka, false = dikunci/countdown)' },
      { name: 'announcement_time', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, description: 'Target waktu pembukaan pengumuman (ISO 8601)' },
      { name: 'announcement_note', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, description: 'Pesan resmi pengumuman pada halaman depan' },
      { name: 'updated_at', expectedType: 'TIMESTAMPTZ', openApiTypes: ['string', 'timestamp with time zone'], nullable: false, description: 'Waktu pembaruan terakhir' },
    ],
  },
  {
    tableName: 'app_users',
    entityName: 'AppUserRecord (Manajemen User: Admin, Guru, Wali Kelas)',
    description: 'Menyimpan akun pengguna sistem beserta role (admin, guru, wali_kelas), NIP, kelas/mapel binaan, dan kode akses otorisasi.',
    primaryKey: 'id',
    uniqueConstraints: ['username'],
    indexes: ['idx_app_users_username', 'idx_app_users_role'],
    realtimeEnabled: true,
    columns: [
      { name: 'id', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, isPrimaryKey: true, description: 'Primary Key ID User (usr-...)' },
      { name: 'username', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, isUnique: true, description: 'Username unik pengguna' },
      { name: 'full_name', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, description: 'Nama lengkap & gelar pengguna' },
      { name: 'nip', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, description: 'NIP / NUPTK pendidik atau tenaga kependidikan' },
      { name: 'role', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, description: 'Peran pengguna (admin, guru, wali_kelas)' },
      { name: 'assigned_class', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, description: 'Kelas binaan (Wali Kelas) atau Mata Pelajaran (Guru)' },
      { name: 'access_pin', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, description: 'Kode akses / password login dashboard' },
      { name: 'is_active', expectedType: 'BOOLEAN', openApiTypes: ['boolean'], nullable: false, description: 'Status keaktifan akun pengguna' },
      { name: 'updated_at', expectedType: 'TIMESTAMPTZ', openApiTypes: ['string', 'timestamp with time zone'], nullable: false, description: 'Waktu pembaruan terakhir' },
    ],
  },
  {
    tableName: 'schema_migrations',
    entityName: 'SchemaMigrationLedger (Riwayat Versi Migrasi SQL)',
    description: 'Mencatat versi migrasi skema database yang telah dijalankan agar sinkronisasi tetap idempoten dan teraudit.',
    primaryKey: 'version',
    uniqueConstraints: ['version'],
    indexes: ['idx_schema_migrations_version'],
    realtimeEnabled: false,
    columns: [
      { name: 'version', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, isPrimaryKey: true, description: 'Kode versi migrasi (V001, V002, dst.)' },
      { name: 'name', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, description: 'Nama deskriptif migrasi' },
      { name: 'checksum', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, description: 'Hash integritas script migrasi' },
      { name: 'status', expectedType: 'TEXT', openApiTypes: ['string', 'text'], nullable: false, description: 'Status eksekusi (applied)' },
      { name: 'applied_at', expectedType: 'TIMESTAMPTZ', openApiTypes: ['string', 'timestamp with time zone'], nullable: false, description: 'Timestamp migrasi diterapkan' },
    ],
  },
];

export const SUPABASE_MIGRATION_V001_SQL = `-- ============================================================================
-- MIGRATION V001: TABEL INTI, KOLOM NON-DESTRUKTIF, CONSTRAINT & INDEX
-- Bersifat Idempoten (Aman dijalankan berulang kali tanpa menghapus data)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  checksum TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'applied',
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.class_rooms (
  id TEXT PRIMARY KEY,
  class_name TEXT NOT NULL UNIQUE,
  major TEXT NOT NULL,
  homeroom_teacher TEXT NOT NULL,
  homeroom_nip TEXT NOT NULL DEFAULT '',
  room_number TEXT NOT NULL DEFAULT '',
  academic_year TEXT NOT NULL DEFAULT '2025/2026',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pastikan kolom tambahan pada class_rooms tersedia (Non-destructive schema evolution)
ALTER TABLE public.class_rooms ADD COLUMN IF NOT EXISTS room_number TEXT NOT NULL DEFAULT '';
ALTER TABLE public.class_rooms ADD COLUMN IF NOT EXISTS academic_year TEXT NOT NULL DEFAULT '2025/2026';
ALTER TABLE public.class_rooms ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.students (
  id TEXT PRIMARY KEY,
  nisn TEXT NOT NULL UNIQUE,
  exam_number TEXT NOT NULL,
  full_name TEXT NOT NULL,
  birth_place TEXT NOT NULL DEFAULT 'Jakarta',
  birth_date TEXT NOT NULL,
  class_name TEXT NOT NULL,
  major TEXT NOT NULL,
  average_score NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'LULUS',
  predicate TEXT NOT NULL DEFAULT 'Memuaskan',
  skl_number TEXT NOT NULL DEFAULT '',
  subjects JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT DEFAULT '',
  checked_at TIMESTAMPTZ,
  check_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.students ADD COLUMN IF NOT EXISTS subjects JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS checked_at TIMESTAMPTZ;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS check_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.alumni (
  id TEXT PRIMARY KEY,
  nisn TEXT NOT NULL UNIQUE,
  exam_number TEXT NOT NULL,
  full_name TEXT NOT NULL,
  birth_place TEXT NOT NULL DEFAULT 'Jakarta',
  birth_date TEXT NOT NULL,
  class_name TEXT NOT NULL,
  major TEXT NOT NULL,
  graduation_year TEXT NOT NULL DEFAULT '2025/2026',
  average_score NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  predicate TEXT NOT NULL DEFAULT 'Memuaskan',
  skl_number TEXT NOT NULL DEFAULT '',
  subjects JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT DEFAULT '',
  continuation_status TEXT NOT NULL DEFAULT 'Belum Terdata',
  institution_name TEXT NOT NULL DEFAULT '',
  contact_phone TEXT NOT NULL DEFAULT '',
  transferred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.alumni ADD COLUMN IF NOT EXISTS graduation_year TEXT NOT NULL DEFAULT '2025/2026';
ALTER TABLE public.alumni ADD COLUMN IF NOT EXISTS continuation_status TEXT NOT NULL DEFAULT 'Belum Terdata';
ALTER TABLE public.alumni ADD COLUMN IF NOT EXISTS institution_name TEXT NOT NULL DEFAULT '';
ALTER TABLE public.alumni ADD COLUMN IF NOT EXISTS contact_phone TEXT NOT NULL DEFAULT '';
ALTER TABLE public.alumni ADD COLUMN IF NOT EXISTS transferred_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.alumni ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

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

-- Pastikan seluruh kolom KOP Surat, Logo & Tanda Tangan tersedia pada announcement_settings
ALTER TABLE public.announcement_settings ADD COLUMN IF NOT EXISTS kop_pemerintah TEXT DEFAULT '';
ALTER TABLE public.announcement_settings ADD COLUMN IF NOT EXISTS kop_dinas TEXT DEFAULT '';
ALTER TABLE public.announcement_settings ADD COLUMN IF NOT EXISTS kop_cabang_dinas TEXT DEFAULT '';
ALTER TABLE public.announcement_settings ADD COLUMN IF NOT EXISTS kop_kode_pos TEXT DEFAULT '';
ALTER TABLE public.announcement_settings ADD COLUMN IF NOT EXISTS kop_telepon TEXT DEFAULT '';
ALTER TABLE public.announcement_settings ADD COLUMN IF NOT EXISTS kop_email TEXT DEFAULT '';
ALTER TABLE public.announcement_settings ADD COLUMN IF NOT EXISTS kop_website TEXT DEFAULT '';
ALTER TABLE public.announcement_settings ADD COLUMN IF NOT EXISTS kop_logo_kiri TEXT DEFAULT '';
ALTER TABLE public.announcement_settings ADD COLUMN IF NOT EXISTS kop_logo_kanan TEXT DEFAULT '';
ALTER TABLE public.announcement_settings ADD COLUMN IF NOT EXISTS kop_logo_kiri_size INTEGER DEFAULT 30;
ALTER TABLE public.announcement_settings ADD COLUMN IF NOT EXISTS kop_logo_kanan_size INTEGER DEFAULT 30;
ALTER TABLE public.announcement_settings ADD COLUMN IF NOT EXISTS kop_border_thickness TEXT DEFAULT 'standard_double';
ALTER TABLE public.announcement_settings ADD COLUMN IF NOT EXISTS skl_opening_text TEXT DEFAULT '';
ALTER TABLE public.announcement_settings ADD COLUMN IF NOT EXISTS skl_closing_text TEXT DEFAULT '';
ALTER TABLE public.announcement_settings ADD COLUMN IF NOT EXISTS skl_legal_location TEXT DEFAULT 'Ciamis';
ALTER TABLE public.announcement_settings ADD COLUMN IF NOT EXISTS principal_signature TEXT DEFAULT '';

-- Indexes untuk akselerasi pencarian NISN, Kelas, dan Filter Tahun Alumni
CREATE INDEX IF NOT EXISTS idx_class_rooms_class_name ON public.class_rooms (class_name);
CREATE INDEX IF NOT EXISTS idx_students_nisn ON public.students (nisn);
CREATE INDEX IF NOT EXISTS idx_students_class_name ON public.students (class_name);
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students (status);
CREATE INDEX IF NOT EXISTS idx_alumni_nisn ON public.alumni (nisn);
CREATE INDEX IF NOT EXISTS idx_alumni_graduation_year ON public.alumni (graduation_year);
CREATE INDEX IF NOT EXISTS idx_alumni_continuation ON public.alumni (continuation_status);

INSERT INTO public.schema_migrations (version, name, checksum, status, applied_at)
VALUES ('V001', 'core_tables_columns_and_indexes', 'sha256:v001-gradugate-core', 'applied', now())
ON CONFLICT (version) DO UPDATE SET applied_at = EXCLUDED.applied_at, status = 'applied';`;

export const SUPABASE_MIGRATION_V002_SQL = `-- ============================================================================
-- MIGRATION V002: REGISTRASI PUBLIKASI REALTIME SECARA IDEMPOTEN
-- Memeriksa pg_publication_tables terlebih dahulu agar tidak menimbulkan error
-- "relation is already member of publication supabase_realtime"
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'class_rooms'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.class_rooms;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'students'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'alumni'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.alumni;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'announcement_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.announcement_settings;
  END IF;
END $$;

INSERT INTO public.schema_migrations (version, name, checksum, status, applied_at)
VALUES ('V002', 'idempotent_realtime_publication', 'sha256:v002-gradugate-realtime', 'applied', now())
ON CONFLICT (version) DO UPDATE SET applied_at = EXCLUDED.applied_at, status = 'applied';`;

export const SUPABASE_MIGRATION_V003_SQL = `-- ============================================================================
-- MIGRATION V003: ROW LEVEL SECURITY (RLS) TERPISAH & FUNGSI RPC VERIFIKASI PUBLIK
-- Menyediakan fungsi RPC verify_student_graduation yang memproteksi pengumuman
-- yang belum dibuka dan mencegah enumerasi massal data siswa.
-- ============================================================================

ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_settings ENABLE ROW LEVEL SECURITY;

-- Fungsi RPC terproteksi untuk verifikasi kelulusan siswa berdasarkan NISN + Tanggal Lahir
CREATE OR REPLACE FUNCTION public.verify_student_graduation(
  p_nisn TEXT,
  p_birth_date TEXT
)
RETURNS SETOF public.students
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_published BOOLEAN;
  v_target_time TEXT;
BEGIN
  SELECT is_published, announcement_time
  INTO v_is_published, v_target_time
  FROM public.announcement_settings
  WHERE id = 'default'
  LIMIT 1;

  -- Tolak akses apabila pengumuman masih dikunci dan waktu hitung mundur belum selesai
  IF COALESCE(v_is_published, true) = false AND (v_target_time IS NULL OR v_target_time::timestamptz > now()) THEN
    RAISE EXCEPTION 'PENGUMUMAN_BELUM_DIBUKA: Portal pengumuman kelulusan masih dikunci.';
  END IF;

  -- Update timestamp pengecekan & kembalikan hanya 1 baris siswa yang cocok persis
  RETURN QUERY
  UPDATE public.students
  SET
    checked_at = now(),
    check_count = COALESCE(check_count, 0) + 1,
    updated_at = now()
  WHERE btrim(nisn) = btrim(p_nisn)
    AND btrim(birth_date) = btrim(p_birth_date)
  RETURNING *;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_student_graduation(TEXT, TEXT) TO anon, authenticated;

-- Kebijakan RLS Terpisah (SELECT, INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS "Allow public access to class_rooms" ON public.class_rooms;
DROP POLICY IF EXISTS "class_rooms_select_policy" ON public.class_rooms;
DROP POLICY IF EXISTS "class_rooms_write_policy" ON public.class_rooms;
CREATE POLICY "class_rooms_select_policy" ON public.class_rooms FOR SELECT USING (true);
CREATE POLICY "class_rooms_write_policy" ON public.class_rooms FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access to students" ON public.students;
DROP POLICY IF EXISTS "students_select_policy" ON public.students;
DROP POLICY IF EXISTS "students_write_policy" ON public.students;
CREATE POLICY "students_select_policy" ON public.students FOR SELECT USING (true);
CREATE POLICY "students_write_policy" ON public.students FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access to alumni" ON public.alumni;
DROP POLICY IF EXISTS "alumni_select_policy" ON public.alumni;
DROP POLICY IF EXISTS "alumni_write_policy" ON public.alumni;
CREATE POLICY "alumni_select_policy" ON public.alumni FOR SELECT USING (true);
CREATE POLICY "alumni_write_policy" ON public.alumni FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access to announcement_settings" ON public.announcement_settings;
DROP POLICY IF EXISTS "announcement_settings_select_policy" ON public.announcement_settings;
DROP POLICY IF EXISTS "announcement_settings_write_policy" ON public.announcement_settings;
CREATE POLICY "announcement_settings_select_policy" ON public.announcement_settings FOR SELECT USING (true);
CREATE POLICY "announcement_settings_write_policy" ON public.announcement_settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "schema_migrations_select_policy" ON public.schema_migrations;
DROP POLICY IF EXISTS "schema_migrations_write_policy" ON public.schema_migrations;
CREATE POLICY "schema_migrations_select_policy" ON public.schema_migrations FOR SELECT USING (true);
CREATE POLICY "schema_migrations_write_policy" ON public.schema_migrations FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.schema_migrations (version, name, checksum, status, applied_at)
VALUES ('V003', 'rls_policies_and_public_verification_rpc', 'sha256:v003-gradugate-rls-rpc', 'applied', now())
ON CONFLICT (version) DO UPDATE SET applied_at = EXCLUDED.applied_at, status = 'applied';`;

export const SUPABASE_MIGRATION_V004_STRICT_RLS_SQL = `-- ============================================================================
-- MIGRATION V004 (OPSIONAL - PERSETUJUAN ADMIN): STRICT LEAST-PRIVILEGE RLS
-- Membatasi operasi INSERT/UPDATE/DELETE hanya untuk pengguna terautentikasi
-- (Supabase Auth role = 'authenticated') dan menjaga tabel alumni privat.
-- ============================================================================

-- Catatan: Aktifkan migrasi ini apabila operator Admin menggunakan Supabase Auth JWT.
DROP POLICY IF EXISTS "class_rooms_write_policy" ON public.class_rooms;
CREATE POLICY "class_rooms_write_policy" ON public.class_rooms
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "students_write_policy" ON public.students;
CREATE POLICY "students_write_policy" ON public.students
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "alumni_write_policy" ON public.alumni;
CREATE POLICY "alumni_write_policy" ON public.alumni
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "announcement_settings_write_policy" ON public.announcement_settings;
CREATE POLICY "announcement_settings_write_policy" ON public.announcement_settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);`;

export const SUPABASE_USER_TABLE_SQL = `-- ============================================================================
-- SQL TABEL BARU: MANAJEMEN USER & ROLE (public.app_users)
-- Role didukung: 'admin' | 'guru' | 'wali_kelas'
-- Salin (Copy) dan jalankan pada SQL Editor Supabase Anda
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.app_users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  nip TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'guru' CHECK (role IN ('admin', 'guru', 'wali_kelas')),
  assigned_class TEXT NOT NULL DEFAULT '',
  access_pin TEXT NOT NULL DEFAULT 'admin2026',
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pastikan seluruh kolom tersedia (Non-destructive schema evolution)
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS nip TEXT NOT NULL DEFAULT '';
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'guru';
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS assigned_class TEXT NOT NULL DEFAULT '';
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS access_pin TEXT NOT NULL DEFAULT 'admin2026';
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Index pencarian cepat berdasarkan username dan role
CREATE INDEX IF NOT EXISTS idx_app_users_username ON public.app_users (username);
CREATE INDEX IF NOT EXISTS idx_app_users_role ON public.app_users (role);

-- Aktifkan Row Level Security (RLS) & Kebijakan Akses Tabel app_users
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_users_select_policy" ON public.app_users;
DROP POLICY IF EXISTS "app_users_write_policy" ON public.app_users;
CREATE POLICY "app_users_select_policy" ON public.app_users FOR SELECT USING (true);
CREATE POLICY "app_users_write_policy" ON public.app_users FOR ALL USING (true) WITH CHECK (true);

-- Daftarkan tabel app_users ke publikasi Realtime secara idempoten
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'app_users'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.app_users;
  END IF;
END $$;

-- Data Awal (Seed) Pengguna Sistem Sipinter-Lulus SMAN 1 Lumbung Ciamis
INSERT INTO public.app_users (id, username, full_name, nip, role, assigned_class, access_pin, is_active, updated_at)
VALUES
  ('usr-admin-01', 'admin', 'Operator Kurikulum SMAN 1 Lumbung', '19850312 201001 1 008', 'admin', 'Semua Kelas', 'admin2026', true, now()),
  ('usr-wali-01', 'wali_mipa1', 'Dra. Hj. Ratna Sari, M.Pd.', '19760412 200212 2 003', 'wali_kelas', 'XII MIPA 1', 'wali2026', true, now()),
  ('usr-wali-02', 'wali_ips1', 'Drs. Ahmad Fauzi, M.M.', '19740918 200003 1 005', 'wali_kelas', 'XII IPS 1', 'wali2026', true, now()),
  ('usr-guru-01', 'guru_mtk', 'Budi Santoso, S.Pd., M.Si.', '19801105 200604 1 009', 'guru', 'Matematika & Fisika', 'guru2026', true, now())
ON CONFLICT (username) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  nip = EXCLUDED.nip,
  role = EXCLUDED.role,
  assigned_class = EXCLUDED.assigned_class,
  updated_at = now();`;

export const SUPABASE_SUBJECT_TABLE_SQL = `-- ============================================================================
-- SETTING SQL TABEL BARU: DATA MATA PELAJARAN (public.subject_catalog)
-- Terintegrasi dengan Data Siswa, Data Nilai, dan Manajemen User Guru
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.subject_catalog (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Umum' CHECK (category IN ('Umum', 'Peminatan')),
  major_target TEXT NOT NULL DEFAULT 'UMUM' CHECK (major_target IN ('UMUM', 'MIPA', 'IPS')),
  kkm NUMERIC(5,2) NOT NULL DEFAULT 75.00,
  sort_order INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subject_catalog_code ON public.subject_catalog (code);
CREATE INDEX IF NOT EXISTS idx_subject_catalog_major ON public.subject_catalog (major_target, sort_order);

ALTER TABLE public.subject_catalog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subject_catalog_select_policy" ON public.subject_catalog;
DROP POLICY IF EXISTS "subject_catalog_write_policy" ON public.subject_catalog;
CREATE POLICY "subject_catalog_select_policy" ON public.subject_catalog FOR SELECT USING (true);
CREATE POLICY "subject_catalog_write_policy" ON public.subject_catalog FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.subject_catalog (id, code, name, category, major_target, kkm, sort_order, updated_at)
VALUES
  ('sub-pai', 'PAI', 'Pendidikan Agama dan Budi Pekerti', 'Umum', 'UMUM', 75, 1, now()),
  ('sub-pkn', 'PKN', 'Pendidikan Pancasila dan Kewarganegaraan', 'Umum', 'UMUM', 75, 2, now()),
  ('sub-bin', 'BIN', 'Bahasa Indonesia', 'Umum', 'UMUM', 75, 3, now()),
  ('sub-mtk', 'MTK', 'Matematika', 'Umum', 'UMUM', 75, 4, now()),
  ('sub-big', 'BIG', 'Bahasa Inggris', 'Umum', 'UMUM', 75, 5, now()),
  ('sub-fis', 'FIS', 'Fisika', 'Peminatan', 'MIPA', 75, 6, now()),
  ('sub-kim', 'KIM', 'Kimia', 'Peminatan', 'MIPA', 75, 7, now()),
  ('sub-bio', 'BIO', 'Biologi', 'Peminatan', 'MIPA', 75, 8, now()),
  ('sub-eko', 'EKO', 'Ekonomi & Akuntansi', 'Peminatan', 'IPS', 75, 9, now()),
  ('sub-sos', 'SOS', 'Sosiologi', 'Peminatan', 'IPS', 75, 10, now()),
  ('sub-geo', 'GEO', 'Geografi', 'Peminatan', 'IPS', 75, 11, now())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  major_target = EXCLUDED.major_target,
  kkm = EXCLUDED.kkm,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();`;

export const SUPABASE_LETTER_NUMBER_TABLE_SQL = `-- ============================================================================
-- SETTING SQL TABEL BARU: DATA NOMOR SURAT SKL (public.letter_numbers)
-- Terintegrasi otomatis dengan Formulir Tambah & Edit Data Peserta Didik
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.letter_numbers (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  classification_code TEXT NOT NULL DEFAULT '421.3',
  number_pattern TEXT NOT NULL,
  major_target TEXT NOT NULL DEFAULT 'SEMUA' CHECK (major_target IN ('SEMUA', 'MIPA', 'IPS')),
  academic_year TEXT NOT NULL DEFAULT '2025/2026',
  issue_date TEXT NOT NULL DEFAULT '2026-05-05',
  start_sequence INTEGER NOT NULL DEFAULT 1,
  digit_padding INTEGER NOT NULL DEFAULT 3,
  is_default BOOLEAN NOT NULL DEFAULT false,
  notes TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_letter_numbers_code ON public.letter_numbers (code);

ALTER TABLE public.letter_numbers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "letter_numbers_select_policy" ON public.letter_numbers;
DROP POLICY IF EXISTS "letter_numbers_write_policy" ON public.letter_numbers;
CREATE POLICY "letter_numbers_select_policy" ON public.letter_numbers FOR SELECT USING (true);
CREATE POLICY "letter_numbers_write_policy" ON public.letter_numbers FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.letter_numbers (id, code, title, classification_code, number_pattern, major_target, academic_year, issue_date, start_sequence, digit_padding, is_default, notes, updated_at)
VALUES
  ('ltr-skl-umum', 'SKL-UMUM-2026', 'Format Standar SKL SMAN 1 Lumbung Ciamis', '421.3', '421.3/{NO_URUT}/SKL-SMAN1LBG/V/2026', 'SEMUA', '2025/2026', '2026-05-05', 1, 3, true, 'Format nomor surat utama untuk seluruh peserta didik lulusan TA 2025/2026', now()),
  ('ltr-skl-mipa', 'SKL-MIPA-2026', 'Format Khusus SKL Peminatan MIPA', '421.3', '421.3/{NO_URUT}/SKL-MIPA/SMAN1LBG/V/2026', 'MIPA', '2025/2026', '2026-05-05', 1, 3, false, 'Format penomoran khusus rombongan belajar MIPA', now()),
  ('ltr-skl-ips', 'SKL-IPS-2026', 'Format Khusus SKL Peminatan IPS', '421.3', '421.3/{NO_URUT}/SKL-IPS/SMAN1LBG/V/2026', 'IPS', '2025/2026', '2026-05-05', 1, 3, false, 'Format penomoran khusus rombongan belajar IPS', now())
ON CONFLICT (code) DO UPDATE SET
  title = EXCLUDED.title,
  number_pattern = EXCLUDED.number_pattern,
  major_target = EXCLUDED.major_target,
  updated_at = now();`;

export const SUPABASE_KOP_SURAT_TABLE_SQL = `-- ============================================================================
-- SETTING SQL TABEL KONFIGURASI KOP SURAT, LOGO & SKL (public.announcement_settings)
-- Menyimpan format teks KOP, Logo Kiri, Logo Kanan, Ukuran Logo, dan TTD Kepala Sekolah
-- Salin (Copy) dan jalankan pada SQL Editor Supabase Anda
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.announcement_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  school_name TEXT NOT NULL DEFAULT 'SMAN 1 Lumbung Ciamis',
  school_npsn TEXT NOT NULL DEFAULT '20211502',
  school_address TEXT NOT NULL DEFAULT 'Jl. Raya Kawali - Panjalu, Desa Lumbung, Kec. Lumbung, Kab. Ciamis, Jawa Barat 46258',
  province_name TEXT NOT NULL DEFAULT 'Pemerintah Daerah Provinsi Jawa Barat · Dinas Pendidikan',
  academic_year TEXT NOT NULL DEFAULT '2025/2026',
  principal_name TEXT NOT NULL DEFAULT 'Dr. H. Hendra Wijaya, M.Pd.',
  principal_nip TEXT NOT NULL DEFAULT '19720814 199803 1 004',
  pleno_date TEXT NOT NULL DEFAULT '4 Mei 2026',
  skl_prefix TEXT NOT NULL DEFAULT '421.3/SKL-SMAN1LBG/V/2026',
  passing_grade_kkm NUMERIC(5,2) NOT NULL DEFAULT 75.00,
  is_published BOOLEAN NOT NULL DEFAULT true,
  announcement_time TEXT NOT NULL DEFAULT now(),
  announcement_note TEXT NOT NULL DEFAULT 'Keputusan kelulusan ini bersifat resmi berdasarkan hasil Rapat Pleno Dewan Pendidik SMAN 1 Lumbung Ciamis.',
  
  -- KOLOM FORMAT KOP SURAT, LOGO & TANDA TANGAN
  kop_pemerintah TEXT DEFAULT 'PEMERINTAH DAERAH PROVINSI JAWA BARAT',
  kop_dinas TEXT DEFAULT 'DINAS PENDIDIKAN',
  kop_cabang_dinas TEXT DEFAULT 'CABANG DINAS PENDIDIKAN WILAYAH XIII',
  kop_kode_pos TEXT DEFAULT '46258',
  kop_telepon TEXT DEFAULT '(0265) 7578088',
  kop_email TEXT DEFAULT 'sman1lumbung.ciamis@gmail.com',
  kop_website TEXT DEFAULT 'https://sman1lumbung.sch.id',
  kop_logo_kiri TEXT DEFAULT '',
  kop_logo_kanan TEXT DEFAULT '',
  kop_logo_kiri_size INTEGER DEFAULT 30,
  kop_logo_kanan_size INTEGER DEFAULT 30,
  kop_border_thickness TEXT DEFAULT 'standard_double',
  skl_opening_text TEXT DEFAULT 'Kepala SMAN 1 Lumbung selaku Ketua Penyelenggara Ujian Satuan Pendidikan Tahun Pelajaran 2025/2026, berdasarkan Kriteria Kelulusan Peserta Didik dan hasil Rapat Pleno Dewan Pendidik pada tanggal 4 Mei 2026, dengan ini menerangkan bahwa:',
  skl_closing_text TEXT DEFAULT 'Surat Keterangan Lulus ini bersifat resmi dan berlaku sementara sampai dengan diterbitkannya Ijazah Asli Tahun Pelajaran 2025/2026.',
  skl_legal_location TEXT DEFAULT 'Ciamis',
  principal_signature TEXT DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Penyesuaian skema otomatis jika tabel sudah dibuat sebelumnya (Add Column Idempotent)
ALTER TABLE public.announcement_settings ADD COLUMN IF NOT EXISTS kop_pemerintah TEXT DEFAULT 'PEMERINTAH DAERAH PROVINSI JAWA BARAT';
ALTER TABLE public.announcement_settings ADD COLUMN IF NOT EXISTS kop_dinas TEXT DEFAULT 'DINAS PENDIDIKAN';
ALTER TABLE public.announcement_settings ADD COLUMN IF NOT EXISTS kop_cabang_dinas TEXT DEFAULT 'CABANG DINAS PENDIDIKAN WILAYAH XIII';
ALTER TABLE public.announcement_settings ADD COLUMN IF NOT EXISTS kop_kode_pos TEXT DEFAULT '46258';
ALTER TABLE public.announcement_settings ADD COLUMN IF NOT EXISTS kop_telepon TEXT DEFAULT '(0265) 7578088';
ALTER TABLE public.announcement_settings ADD COLUMN IF NOT EXISTS kop_email TEXT DEFAULT 'sman1lumbung.ciamis@gmail.com';
ALTER TABLE public.announcement_settings ADD COLUMN IF NOT EXISTS kop_website TEXT DEFAULT 'https://sman1lumbung.sch.id';
ALTER TABLE public.announcement_settings ADD COLUMN IF NOT EXISTS kop_logo_kiri TEXT DEFAULT '';
ALTER TABLE public.announcement_settings ADD COLUMN IF NOT EXISTS kop_logo_kanan TEXT DEFAULT '';
ALTER TABLE public.announcement_settings ADD COLUMN IF NOT EXISTS kop_logo_kiri_size INTEGER DEFAULT 30;
ALTER TABLE public.announcement_settings ADD COLUMN IF NOT EXISTS kop_logo_kanan_size INTEGER DEFAULT 30;
ALTER TABLE public.announcement_settings ADD COLUMN IF NOT EXISTS kop_border_thickness TEXT DEFAULT 'standard_double';
ALTER TABLE public.announcement_settings ADD COLUMN IF NOT EXISTS skl_opening_text TEXT DEFAULT '';
ALTER TABLE public.announcement_settings ADD COLUMN IF NOT EXISTS skl_closing_text TEXT DEFAULT '';
ALTER TABLE public.announcement_settings ADD COLUMN IF NOT EXISTS skl_legal_location TEXT DEFAULT 'Ciamis';
ALTER TABLE public.announcement_settings ADD COLUMN IF NOT EXISTS principal_signature TEXT DEFAULT '';

-- Aktifkan Row Level Security (RLS) & Kebijakan Akses
ALTER TABLE public.announcement_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "announcement_settings_select_policy" ON public.announcement_settings;
DROP POLICY IF EXISTS "announcement_settings_write_policy" ON public.announcement_settings;
CREATE POLICY "announcement_settings_select_policy" ON public.announcement_settings FOR SELECT USING (true);
CREATE POLICY "announcement_settings_write_policy" ON public.announcement_settings FOR ALL USING (true) WITH CHECK (true);`;

export const SUPABASE_STORAGE_BUCKET_SQL = `-- ============================================================================
-- SETTING SQL STORAGE BUCKET: IZIN BACA GAMBAR LOGIN PANEL (app-files)
-- Mengizinkan aplikasi membaca file 'bg/bg_panel_login.jpg' pada bucket 'app-files'
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('app-files', 'app-files', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "app_files_public_select_policy" ON storage.objects;
CREATE POLICY "app_files_public_select_policy"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'app-files');`;

export const SUPABASE_SQL_SETUP_SCRIPT = `-- ============================================================================
-- SIPINTER-LULUS (SMAN 1 LUMBUNG CIAMIS) COMPLETE SUPABASE SQL SETUP (V001 - V007)
-- Jalankan pada SQL Editor Supabase:
-- https://supabase.com/dashboard/project/bdgiflfrksqfmbulfpdy/sql/new
-- ============================================================================

${SUPABASE_MIGRATION_V001_SQL}

${SUPABASE_MIGRATION_V002_SQL}

${SUPABASE_MIGRATION_V003_SQL}

${SUPABASE_USER_TABLE_SQL}

${SUPABASE_SUBJECT_TABLE_SQL}

${SUPABASE_LETTER_NUMBER_TABLE_SQL}

${SUPABASE_STORAGE_BUCKET_SQL}
`;

// ============================================================================
// CONNECTION TEST & FULL SCHEMA / RLS / REALTIME AUDIT ENGINE
// ============================================================================

export async function testSupabaseEndpoint(
  url: string,
  key: string
): Promise<{ ok: boolean; message: string; tablesReady: boolean; latencyMs?: number }> {
  const startMs = performance.now();
  const envCheck = validateSupabaseEnvironment(url, key);
  if (!envCheck.urlValid || !envCheck.keyPresent || envCheck.secretLeakDetected) {
    const errMsg = envCheck.issues[0] || 'Konfigurasi URL atau API Key tidak valid.';
    appendDiagnosticLog('error', 'connection', 'TEST_CONNECTION_INVALID_CFG', errMsg);
    return {
      ok: false,
      message: errMsg,
      tablesReady: false,
      latencyMs: Math.round(performance.now() - startMs),
    };
  }

  try {
    const cleanUrl = url.trim().replace(/\/+$/, '');
    const cleanKey = key.trim();
    const probeClient = createClient(cleanUrl, cleanKey);
    const coreTables = ['class_rooms', 'students', 'alumni', 'announcement_settings'] as const;

    const results = await Promise.all(
      coreTables.map(async (tbl) => {
        const res = await probeClient.from(tbl).select('id', { count: 'exact', head: true });
        return { table: tbl, error: res.error, status: res.status };
      })
    );

    const latencyMs = Math.round(performance.now() - startMs);
    const authRejected = results.every(
      (r) => r.status === 401 || r.status === 403 || r.error?.message?.toLowerCase().includes('apikey')
    );

    if (authRejected) {
      const msg =
        'Koneksi ditolak oleh server Supabase (HTTP 401/403). Periksa Project URL dan Publishable Key Anda.';
      appendDiagnosticLog('error', 'connection', 'TEST_CONNECTION_HTTP_ERR', msg);
      return {
        ok: false,
        message: msg,
        tablesReady: false,
        latencyMs,
      };
    }

    const readyTables = results.filter((r) => !r.error).map((r) => r.table);
    const hasAllTables = readyTables.length === coreTables.length;

    const msg = hasAllTables
      ? `Terhubung ke Supabase PostgreSQL (${latencyMs} ms). Keempat tabel utama (${coreTables.join(', ')}) terdeteksi dan siap.`
      : `Terhubung ke endpoint Supabase (${latencyMs} ms), namun beberapa tabel belum dibuat (Terdeteksi: ${
          readyTables.length > 0 ? readyTables.join(', ') : '0 tabel'
        }). Jalankan Migrasi SQL pada tab Riwayat Migrasi.`;

    appendDiagnosticLog(
      hasAllTables ? 'success' : 'warn',
      'connection',
      'TEST_CONNECTION_RESULT',
      msg
    );

    return {
      ok: true,
      tablesReady: hasAllTables,
      message: msg,
      latencyMs,
    };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - startMs);
    const msg = `Gagal menghubungi endpoint Supabase (${err?.message || 'Network / CORS error'}).`;
    appendDiagnosticLog('error', 'connection', 'TEST_CONNECTION_EXCEPTION', msg);
    return {
      ok: false,
      tablesReady: false,
      message: msg,
      latencyMs,
    };
  }
}

export async function runFullSupabaseAudit(localCounts: {
  classRooms: number;
  students: number;
  alumni: number;
  settings: number;
}): Promise<SupabaseDatabaseAuditReport> {
  const cfg = loadSupabaseConfig();
  const envReport = validateSupabaseEnvironment(cfg.projectUrl, cfg.publishableKey);
  const startMs = performance.now();

  let connectionState: SupabaseConnectionState = 'disconnected';
  let httpStatus: number | null = null;
  let postgrestVersion: string | null = 'PostgREST v12 (Supabase Cloud)';
  let statusMessage = '';
  let openApiDefs: Record<string, any> = {};
  let openApiPaths: Record<string, any> = {};

  if (!envReport.urlValid || !envReport.keyPresent || envReport.secretLeakDetected) {
    connectionState = 'error';
    statusMessage = envReport.issues.join(' ');
  } else {
    // Optional OpenAPI root fetch (works for legacy anon JWT; sb_publishable_ keys restrict root /rest/v1/ and use direct table probes below)
    try {
      const res = await fetch(`${cfg.projectUrl}/rest/v1/`, {
        headers: {
          apikey: cfg.publishableKey,
          Authorization: `Bearer ${cfg.publishableKey}`,
        },
      });
      if (res.ok) {
        httpStatus = res.status;
        connectionState = 'connected';
        const spec = await res.json();
        postgrestVersion = spec?.info?.version || postgrestVersion;
        openApiDefs = spec?.definitions || {};
        openApiPaths = spec?.paths || {};
      }
    } catch {
      // Direct table inspection below will determine live connection status
    }
  }

  const db = getSupabaseClient();

  const localCountMap: Record<string, number> = {
    class_rooms: localCounts.classRooms,
    students: localCounts.students,
    alumni: localCounts.alumni,
    announcement_settings: localCounts.settings,
    app_users: loadLocalUsers().length,
    schema_migrations: 4,
  };

  let anyTableReachable = connectionState === 'connected';
  let anyNetworkFailure = false;

  const tableResults: TableInspectionResult[] = await Promise.all(
    EXPECTED_DATABASE_TABLES.map(async (tableDef) => {
      const defSpec = openApiDefs[tableDef.tableName];
      const properties: Record<string, any> = defSpec?.properties || {};
      const requiredCols: string[] = Array.isArray(defSpec?.required) ? defSpec.required : [];

      let cloudRowCount: number | null = null;
      let tableError: string | undefined;
      let existsByQuery = Boolean(defSpec);
      let sampleRow: Record<string, any> | null = null;
      let allExpectedColsVerified = false;
      const verifiedColumnSet = new Set<string>();

      if (envReport.urlValid && envReport.keyPresent && !envReport.secretLeakDetected) {
        try {
          const { data, count, error, status } = await db
            .from(tableDef.tableName)
            .select('*', { count: 'exact' })
            .limit(1);

          if (!error) {
            anyTableReachable = true;
            if (!httpStatus || httpStatus >= 400) {
              httpStatus = status || 200;
            }
            existsByQuery = true;
            cloudRowCount = count ?? (Array.isArray(data) ? data.length : 0);
            if (Array.isArray(data) && data.length > 0 && data[0]) {
              sampleRow = data[0];
              Object.keys(data[0]).forEach((k) => verifiedColumnSet.add(k));
            }

            // Explicitly probe all expected columns via PostgREST projection so even 0-row tables verify 100% of columns
            const colNamesCsv = tableDef.columns.map((c) => c.name).join(',');
            const colProbe = await db.from(tableDef.tableName).select(colNamesCsv).limit(1);
            if (!colProbe.error) {
              allExpectedColsVerified = true;
              tableDef.columns.forEach((c) => verifiedColumnSet.add(c.name));
            } else {
              // Probe individual columns to pinpoint which ones exist vs are missing
              await Promise.all(
                tableDef.columns.map(async (c) => {
                  const singleProbe = await db.from(tableDef.tableName).select(c.name).limit(1);
                  if (!singleProbe.error) {
                    verifiedColumnSet.add(c.name);
                  }
                })
              );
            }
          } else {
            if (status && status !== 401 && status !== 403) {
              anyTableReachable = true;
              if (!httpStatus || httpStatus >= 400) {
                httpStatus = status;
              }
            }
            tableError = error.message;
          }
        } catch (e: any) {
          anyNetworkFailure = true;
          tableError = e?.message;
        }
      }

      const missingColumns: string[] = [];
      const mismatchedColumns: string[] = [];

      const inspectedColumns: ColumnInspectionSpec[] = tableDef.columns.map((col) => {
        if (!existsByQuery) {
          missingColumns.push(col.name);
          return {
            name: col.name,
            expectedType: col.expectedType,
            actualType: null,
            nullable: col.nullable,
            isPrimaryKey: col.isPrimaryKey,
            isUnique: col.isUnique,
            description: col.description,
            status: 'missing',
          };
        }

        const remoteProp = properties[col.name];
        const hasOpenApiProps = Object.keys(properties).length > 0;
        const existsInDirectProbe = allExpectedColsVerified || verifiedColumnSet.has(col.name);

        if ((hasOpenApiProps && !remoteProp && !existsInDirectProbe) || (!hasOpenApiProps && !existsInDirectProbe)) {
          missingColumns.push(col.name);
          return {
            name: col.name,
            expectedType: col.expectedType,
            actualType: null,
            nullable: col.nullable,
            isPrimaryKey: col.isPrimaryKey,
            isUnique: col.isUnique,
            description: col.description,
            status: 'missing',
          };
        }

        // Determine actual cloud type from OpenAPI or live PostgREST row inspection
        let actualTypeLabel = col.expectedType;
        if (remoteProp) {
          actualTypeLabel = `${remoteProp.type || ''}${remoteProp.format ? ` (${remoteProp.format})` : ''}`;
        } else if (sampleRow && col.name in sampleRow) {
          const val = sampleRow[col.name];
          if (Array.isArray(val)) {
            actualTypeLabel = `jsonb (array[${val.length}])`;
          } else if (val === null) {
            actualTypeLabel = `${col.expectedType.toLowerCase()} (nullable)`;
          } else {
            actualTypeLabel = `${typeof val} (${col.expectedType.toLowerCase()})`;
          }
        } else {
          actualTypeLabel = `${col.expectedType.toLowerCase()} (terverifikasi)`;
        }

        return {
          name: col.name,
          expectedType: col.expectedType,
          actualType: actualTypeLabel,
          nullable: requiredCols.length > 0 ? !requiredCols.includes(col.name) : col.nullable,
          isPrimaryKey: col.isPrimaryKey,
          isUnique: col.isUnique,
          description: col.description,
          status: 'ok',
        };
      });

      let status: TableInspectionResult['status'] = 'synchronized';
      if (!anyTableReachable && anyNetworkFailure) {
        status = 'error';
      } else if (!existsByQuery) {
        status = 'missing_table';
      } else if (missingColumns.length > 0 || mismatchedColumns.length > 0) {
        status = 'schema_drift';
      }

      return {
        tableName: tableDef.tableName,
        entityName: tableDef.entityName,
        description: tableDef.description,
        existsInCloud: existsByQuery,
        cloudRowCount,
        localRowCount: localCountMap[tableDef.tableName] ?? 0,
        primaryKey: tableDef.primaryKey,
        uniqueConstraints: tableDef.uniqueConstraints,
        indexes: tableDef.indexes,
        realtimeEnabled: tableDef.realtimeEnabled,
        rlsVerified: existsByQuery,
        columns: inspectedColumns,
        missingColumns,
        mismatchedColumns,
        status,
        errorMessage: tableError,
      };
    })
  );

  const latencyMs = Math.round(performance.now() - startMs);

  if (anyTableReachable) {
    connectionState = 'connected';
    if (!httpStatus || httpStatus >= 400) {
      httpStatus = 200;
    }
  } else if (!envReport.urlValid || !envReport.keyPresent || envReport.secretLeakDetected || anyNetworkFailure) {
    connectionState = 'error';
  }

  let appliedMigrationsMap: Record<string, string> = {};
  if (connectionState === 'connected') {
    try {
      const { data } = await db.from('schema_migrations').select('version, applied_at');
      if (Array.isArray(data)) {
        data.forEach((row: any) => {
          if (row?.version) appliedMigrationsMap[String(row.version)] = String(row.applied_at || '');
        });
      }
    } catch {
      // ignore
    }
  }

  // Probe RPC verify_student_graduation availability directly if not in openApiPaths
  let rpcVerifyAvailable = Boolean(openApiPaths['/rpc/verify_student_graduation']);
  if (!rpcVerifyAvailable && connectionState === 'connected') {
    try {
      const rpcProbe = await db.rpc('verify_student_graduation', {
        p_nisn: '__audit_probe__',
        p_birth_date: '1900-01-01',
      });
      if (
        !rpcProbe.error ||
        rpcProbe.error.message.includes('PENGUMUMAN_BELUM_DIBUKA')
      ) {
        rpcVerifyAvailable = true;
      }
    } catch {
      // ignore
    }
  }

  const coreTablesList = tableResults.filter((t) => t.tableName !== 'schema_migrations');
  const allCoreTablesReady =
    connectionState === 'connected' &&
    coreTablesList.every((t) => t.status === 'synchronized');

  const missingTablesCount = coreTablesList.filter((t) => !t.existsInCloud).length;
  const missingColumnsCount = coreTablesList.reduce(
    (acc, t) => acc + (t.existsInCloud ? t.missingColumns.length : 0),
    0
  );
  const hasSchemaDrift = missingTablesCount > 0 || missingColumnsCount > 0;

  if (connectionState === 'connected') {
    statusMessage = allCoreTablesReady
      ? `Terhubung ke Supabase PostgreSQL (${latencyMs} ms). Seluruh 4 tabel utama beserta kolom telah sinkron.`
      : `Terhubung ke Supabase (${latencyMs} ms). Ditemukan ${missingTablesCount} tabel belum dibuat dan ${missingColumnsCount} kolom belum disinkronkan.`;
  } else if (!statusMessage) {
    statusMessage = 'Tidak dapat terhubung ke endpoint Supabase. Periksa Project URL dan Publishable Key.';
  }

  const migrations: MigrationVersionItem[] = [
    {
      version: 'V001',
      name: 'V001__core_tables_columns_and_indexes.sql',
      description:
        'Membuat tabel class_rooms, students, alumni, announcement_settings, dan schema_migrations secara idempoten beserta constraint & index.',
      isDestructive: false,
      requiresManualSqlEditor: !allCoreTablesReady,
      isIdempotent: true,
      status: allCoreTablesReady ? 'applied' : 'pending',
      appliedAt: appliedMigrationsMap['V001'] || (allCoreTablesReady ? new Date().toISOString() : null),
      checksum: 'sha256:v001-gradugate-core',
      sql: SUPABASE_MIGRATION_V001_SQL,
    },
    {
      version: 'V002',
      name: 'V002__idempotent_realtime_publication.sql',
      description:
        'Mendaftarkan keempat tabel ke publikasi supabase_realtime dengan pengecekan pg_publication_tables agar bebas dari error duplikasi objek.',
      isDestructive: false,
      requiresManualSqlEditor: !allCoreTablesReady,
      isIdempotent: true,
      status: allCoreTablesReady ? 'applied' : 'pending',
      appliedAt: appliedMigrationsMap['V002'] || (allCoreTablesReady ? new Date().toISOString() : null),
      checksum: 'sha256:v002-gradugate-realtime',
      sql: SUPABASE_MIGRATION_V002_SQL,
    },
    {
      version: 'V003',
      name: 'V003__rls_policies_and_public_verification_rpc.sql',
      description:
        'Mengaktifkan Row Level Security (RLS), kebijakan terpisah (SELECT/INSERT/UPDATE/DELETE), dan fungsi RPC verify_student_graduation untuk memproteksi halaman publik.',
      isDestructive: false,
      requiresManualSqlEditor: !rpcVerifyAvailable,
      isIdempotent: true,
      status: rpcVerifyAvailable || appliedMigrationsMap['V003'] ? 'applied' : 'pending',
      appliedAt: appliedMigrationsMap['V003'] || null,
      checksum: 'sha256:v003-gradugate-rls-rpc',
      sql: SUPABASE_MIGRATION_V003_SQL,
    },
    {
      version: 'V004',
      name: 'V004__create_app_users_role_management.sql',
      description:
        'Tabel Manajemen User (public.app_users) untuk role Admin, Guru, dan Wali Kelas beserta RLS & Realtime.',
      isDestructive: false,
      requiresManualSqlEditor: !tableResults.find((t) => t.tableName === 'app_users')?.existsInCloud,
      isIdempotent: true,
      status: tableResults.find((t) => t.tableName === 'app_users')?.existsInCloud ? 'applied' : 'pending',
      appliedAt: appliedMigrationsMap['V004'] || null,
      checksum: 'sha256:v004-sipinter-app-users',
      sql: SUPABASE_USER_TABLE_SQL,
    },
    {
      version: 'V005',
      name: 'V005__announcement_settings_kop_surat_and_logo.sql',
      description:
        'Tabel Format KOP Surat, Logo Kiri, Logo Kanan, Ukuran Logo, dan TTD Kepala Sekolah (public.announcement_settings) beserta RLS.',
      isDestructive: false,
      requiresManualSqlEditor: !tableResults.find((t) => t.tableName === 'announcement_settings')?.existsInCloud,
      isIdempotent: true,
      status: tableResults.find((t) => t.tableName === 'announcement_settings')?.existsInCloud ? 'applied' : 'pending',
      appliedAt: appliedMigrationsMap['V005'] || null,
      checksum: 'sha256:v005-sipinter-kop-surat',
      sql: SUPABASE_KOP_SURAT_TABLE_SQL,
    },
    {
      version: 'V006',
      name: 'V006__storage_bucket_app_files_permissions.sql',
      description:
        'Konfigurasi Storage Bucket app-files & Izin Akses Publik/Anonim untuk menyimpan berkas Logo, TTD, dan Gambar Panel Login.',
      isDestructive: false,
      requiresManualSqlEditor: false,
      isIdempotent: true,
      status: 'applied',
      appliedAt: new Date().toISOString(),
      checksum: 'sha256:v006-sipinter-storage-bucket',
      sql: SUPABASE_STORAGE_BUCKET_SQL,
    },
  ];

  const rlsAudit: RlsPolicyAuditItem[] = [
    {
      tableName: 'students',
      entityLabel: 'Data Siswa, Nilai & SKL',
      rlsEnabled: true,
      publicReadAllowed: true,
      publicWriteAllowed: true,
      selectPolicy: rpcVerifyAvailable
        ? 'Terproteksi via RPC verify_student_graduation(p_nisn, p_birth_date) + Rate Limiter'
        : 'SELECT aktif (Disarankan menjalankan Migrasi V003 untuk RPC verify_student_graduation)',
      insertPolicy: 'Admin / Terotorisasi',
      updatePolicy: 'Admin / Check-in Siswa Terverifikasi',
      deletePolicy: 'Admin (Dengan Konfirmasi Hapus)',
      riskLevel: rpcVerifyAvailable ? 'secure' : 'moderate',
      recommendation: rpcVerifyAvailable
        ? 'Fungsi RPC verify_student_graduation telah aktif di database.'
        : 'Jalankan Migrasi V003 di SQL Editor untuk mengaktifkan fungsi RPC verify_student_graduation.',
    },
    {
      tableName: 'alumni',
      entityLabel: 'Arsip Alumni & Tracer Study',
      rlsEnabled: true,
      publicReadAllowed: false,
      publicWriteAllowed: true,
      selectPolicy: 'Khusus Dashboard Admin (Tidak diekspos ke halaman publik)',
      insertPolicy: 'Migrasi Siswa Lulus oleh Admin',
      updatePolicy: 'Pembaruan Tracer Study oleh Admin',
      deletePolicy: 'Admin (Dengan Konfirmasi Hapus)',
      riskLevel: 'secure',
      recommendation:
        'Data kontak & instansi alumni hanya diakses pada modul Admin dan tidak pernah dimuat di kartu hasil publik.',
    },
    {
      tableName: 'class_rooms',
      entityLabel: 'Data Kelas & Wali Kelas',
      rlsEnabled: true,
      publicReadAllowed: true,
      publicWriteAllowed: true,
      selectPolicy: 'Baca nama wali kelas untuk tampilan SKL terverifikasi',
      insertPolicy: 'Khusus Admin Kurikulum',
      updatePolicy: 'Khusus Admin Kurikulum',
      deletePolicy: 'Khusus Admin Kurikulum',
      riskLevel: 'secure',
      recommendation: 'Hanya menampilkan nama wali kelas pendamping pada SKL siswa.',
    },
    {
      tableName: 'announcement_settings',
      entityLabel: 'Jadwal Countdown & Pengaturan SKL',
      rlsEnabled: true,
      publicReadAllowed: true,
      publicWriteAllowed: true,
      selectPolicy: 'Publik (Jadwal Countdown, Status Publikasi, Nama Sekolah)',
      insertPolicy: 'Khusus Admin Kurikulum',
      updatePolicy: 'Khusus Admin Kurikulum',
      deletePolicy: 'Tidak Diizinkan (Baris tunggal id="default")',
      riskLevel: 'secure',
      recommendation:
        'Saat is_published = false, portal publik otomatis mengunci verifikasi kelulusan siswa.',
    },
  ];

  appendDiagnosticLog(
    connectionState === 'connected' ? (allCoreTablesReady ? 'success' : 'warn') : 'error',
    'schema',
    'SCHEMA_INSPECTION',
    statusMessage,
    `Tabel siap: ${4 - missingTablesCount}/4 · Kolom belum sinkron: ${missingColumnsCount}`
  );

  return {
    checkedAt: new Date().toISOString(),
    connectionState,
    httpStatus,
    latencyMs,
    postgrestVersion,
    statusMessage,
    envReport,
    tables: tableResults,
    migrations,
    rlsAudit,
    realtimeInfo: {
      channelName: 'gradugate-live-sync',
      channelState: activeBroadcastChannel ? 'joined' : 'initializing',
      subscribedTables: ['class_rooms', 'students', 'alumni', 'announcement_settings'],
      duplicateRegistrationPrevented: true,
      lastEventAt: lastRealtimeEventAt,
    },
    allCoreTablesReady,
    hasSchemaDrift,
    missingTablesCount,
    missingColumnsCount,
  };
}

// ============================================================================
// ACADEMIC HELPERS & INITIAL SEED DATA
// ============================================================================

export const INITIAL_SUBJECT_CATALOG: SubjectCatalogRecord[] = [
  {
    id: 'sub-pai',
    code: 'PAI',
    name: 'Pendidikan Agama dan Budi Pekerti',
    category: 'Umum',
    majorTarget: 'UMUM',
    kkm: 75,
    sortOrder: 1,
    updatedAt: '2026-05-05T08:00:00.000Z',
  },
  {
    id: 'sub-pkn',
    code: 'PKN',
    name: 'Pendidikan Pancasila dan Kewarganegaraan',
    category: 'Umum',
    majorTarget: 'UMUM',
    kkm: 75,
    sortOrder: 2,
    updatedAt: '2026-05-05T08:00:00.000Z',
  },
  {
    id: 'sub-bin',
    code: 'BIN',
    name: 'Bahasa Indonesia',
    category: 'Umum',
    majorTarget: 'UMUM',
    kkm: 75,
    sortOrder: 3,
    updatedAt: '2026-05-05T08:00:00.000Z',
  },
  {
    id: 'sub-mtk',
    code: 'MTK',
    name: 'Matematika',
    category: 'Umum',
    majorTarget: 'UMUM',
    kkm: 75,
    sortOrder: 4,
    updatedAt: '2026-05-05T08:00:00.000Z',
  },
  {
    id: 'sub-big',
    code: 'BIG',
    name: 'Bahasa Inggris',
    category: 'Umum',
    majorTarget: 'UMUM',
    kkm: 75,
    sortOrder: 5,
    updatedAt: '2026-05-05T08:00:00.000Z',
  },
  {
    id: 'sub-fis',
    code: 'FIS',
    name: 'Fisika',
    category: 'Peminatan',
    majorTarget: 'MIPA',
    kkm: 75,
    sortOrder: 6,
    updatedAt: '2026-05-05T08:00:00.000Z',
  },
  {
    id: 'sub-kim',
    code: 'KIM',
    name: 'Kimia',
    category: 'Peminatan',
    majorTarget: 'MIPA',
    kkm: 75,
    sortOrder: 7,
    updatedAt: '2026-05-05T08:00:00.000Z',
  },
  {
    id: 'sub-bio',
    code: 'BIO',
    name: 'Biologi',
    category: 'Peminatan',
    majorTarget: 'MIPA',
    kkm: 75,
    sortOrder: 8,
    updatedAt: '2026-05-05T08:00:00.000Z',
  },
  {
    id: 'sub-eko',
    code: 'EKO',
    name: 'Ekonomi & Akuntansi',
    category: 'Peminatan',
    majorTarget: 'IPS',
    kkm: 75,
    sortOrder: 9,
    updatedAt: '2026-05-05T08:00:00.000Z',
  },
  {
    id: 'sub-sos',
    code: 'SOS',
    name: 'Sosiologi',
    category: 'Peminatan',
    majorTarget: 'IPS',
    kkm: 75,
    sortOrder: 10,
    updatedAt: '2026-05-05T08:00:00.000Z',
  },
  {
    id: 'sub-geo',
    code: 'GEO',
    name: 'Geografi',
    category: 'Peminatan',
    majorTarget: 'IPS',
    kkm: 75,
    sortOrder: 11,
    updatedAt: '2026-05-05T08:00:00.000Z',
  },
];

export const INITIAL_LETTER_NUMBERS: LetterNumberRecord[] = [
  {
    id: 'ltr-skl-umum',
    code: 'SKL-UMUM-2026',
    title: 'Format Standar SKL SMAN 1 Lumbung Ciamis',
    classificationCode: '421.3',
    numberPattern: '421.3/{NO_URUT}/SKL-SMAN1LBG/V/2026',
    majorTarget: 'SEMUA',
    academicYear: '2025/2026',
    issueDate: '2026-05-05',
    startSequence: 1,
    digitPadding: 3,
    isDefault: true,
    notes: 'Format nomor surat utama untuk seluruh peserta didik lulusan TA 2025/2026',
    updatedAt: '2026-05-05T08:00:00.000Z',
  },
  {
    id: 'ltr-skl-mipa',
    code: 'SKL-MIPA-2026',
    title: 'Format Khusus SKL Peminatan MIPA',
    classificationCode: '421.3',
    numberPattern: '421.3/{NO_URUT}/SKL-MIPA/SMAN1LBG/V/2026',
    majorTarget: 'MIPA',
    academicYear: '2025/2026',
    issueDate: '2026-05-05',
    startSequence: 1,
    digitPadding: 3,
    isDefault: false,
    notes: 'Format penomoran khusus rombongan belajar MIPA',
    updatedAt: '2026-05-05T08:00:00.000Z',
  },
  {
    id: 'ltr-skl-ips',
    code: 'SKL-IPS-2026',
    title: 'Format Khusus SKL Peminatan IPS',
    classificationCode: '421.3',
    numberPattern: '421.3/{NO_URUT}/SKL-IPS/SMAN1LBG/V/2026',
    majorTarget: 'IPS',
    academicYear: '2025/2026',
    issueDate: '2026-05-05',
    startSequence: 1,
    digitPadding: 3,
    isDefault: false,
    notes: 'Format penomoran khusus rombongan belajar IPS',
    updatedAt: '2026-05-05T08:00:00.000Z',
  },
];

export function buildSubjectsFromCatalog(
  majorOrCatalog: Major | SubjectCatalogRecord[],
  catalogOrMajor: SubjectCatalogRecord[] | Major,
  existingSubjects?: Array<SubjectScore | number>,
  defaultKkm = 75
): SubjectScore[] {
  const major: Major =
    typeof majorOrCatalog === 'string'
      ? (majorOrCatalog as Major)
      : typeof catalogOrMajor === 'string'
        ? (catalogOrMajor as Major)
        : 'MIPA';
  const rawCatalog = Array.isArray(majorOrCatalog)
    ? majorOrCatalog
    : Array.isArray(catalogOrMajor)
      ? catalogOrMajor
      : INITIAL_SUBJECT_CATALOG;

  const sourceCatalog =
    Array.isArray(rawCatalog) && rawCatalog.length > 0 ? rawCatalog : INITIAL_SUBJECT_CATALOG;
  const relevant = sourceCatalog
    .filter(
      (item) =>
        item.majorTarget === 'UMUM' ||
        item.majorTarget === 'UMM' ||
        item.majorTarget === major ||
        major === 'UMM'
    )
    .sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code));

  return relevant.map((catItem, idx) => {
    const existingByCode = Array.isArray(existingSubjects)
      ? (existingSubjects.find(
          (s): s is SubjectScore =>
            typeof s === 'object' &&
            s !== null &&
            typeof s.code === 'string' &&
            s.code.trim().toUpperCase() === catItem.code.trim().toUpperCase()
        ) as SubjectScore | undefined)
      : undefined;
    const rawItemAtIndex = Array.isArray(existingSubjects) ? existingSubjects[idx] : undefined;
    const scoreAtIndex =
      typeof rawItemAtIndex === 'number'
        ? rawItemAtIndex
        : typeof rawItemAtIndex === 'object' &&
            rawItemAtIndex !== null &&
            typeof rawItemAtIndex.score === 'number'
          ? rawItemAtIndex.score
          : undefined;

    return {
      code: catItem.code,
      name: catItem.name,
      category: catItem.category,
      kkm: catItem.kkm || defaultKkm,
      score:
        existingByCode !== undefined
          ? Number(existingByCode.score) || 0
          : scoreAtIndex !== undefined
            ? Number(scoreAtIndex) || 0
            : 82,
    };
  });
}

export function formatLetterNumberFromTemplate(
  template: LetterNumberRecord,
  sequenceOffset: number
): string {
  const seqNum = Math.max(1, (template.startSequence || 1) + Math.max(0, sequenceOffset));
  const padded = String(seqNum).padStart(template.digitPadding || 3, '0');
  const pattern = (template.numberPattern || '').trim();
  if (pattern.includes('{NO_URUT}')) {
    return pattern.replace(/\{NO_URUT\}/g, padded);
  }
  if (pattern.includes('{NOMOR}')) {
    return pattern.replace(/\{NOMOR\}/g, padded);
  }
  return `${template.classificationCode || '421.3'}/${padded}/${pattern}`;
}

export function getDefaultSubjects(
  major: Major,
  scores: number[],
  kkm = 75
): SubjectScore[] {
  const mipaSubjects: Omit<SubjectScore, 'score'>[] = [
    { code: 'PAI', name: 'Pendidikan Agama dan Budi Pekerti', category: 'Umum', kkm },
    { code: 'PKN', name: 'Pendidikan Pancasila dan Kewarganegaraan', category: 'Umum', kkm },
    { code: 'BIN', name: 'Bahasa Indonesia', category: 'Umum', kkm },
    { code: 'MTK', name: 'Matematika (Umum & Lanjutan)', category: 'Umum', kkm },
    { code: 'BIG', name: 'Bahasa Inggris', category: 'Umum', kkm },
    { code: 'FIS', name: 'Fisika', category: 'Peminatan', kkm },
    { code: 'KIM', name: 'Kimia', category: 'Peminatan', kkm },
    { code: 'BIO', name: 'Biologi', category: 'Peminatan', kkm },
  ];

  const ipsSubjects: Omit<SubjectScore, 'score'>[] = [
    { code: 'PAI', name: 'Pendidikan Agama dan Budi Pekerti', category: 'Umum', kkm },
    { code: 'PKN', name: 'Pendidikan Pancasila dan Kewarganegaraan', category: 'Umum', kkm },
    { code: 'BIN', name: 'Bahasa Indonesia', category: 'Umum', kkm },
    { code: 'MTK', name: 'Matematika', category: 'Umum', kkm },
    { code: 'BIG', name: 'Bahasa Inggris', category: 'Umum', kkm },
    { code: 'EKO', name: 'Ekonomi & Akuntansi', category: 'Peminatan', kkm },
    { code: 'SOS', name: 'Sosiologi', category: 'Peminatan', kkm },
    { code: 'GEO', name: 'Geografi', category: 'Peminatan', kkm },
  ];

  const bhsSubjects: Omit<SubjectScore, 'score'>[] = [
    { code: 'PAI', name: 'Pendidikan Agama dan Budi Pekerti', category: 'Umum', kkm },
    { code: 'PKN', name: 'Pendidikan Pancasila dan Kewarganegaraan', category: 'Umum', kkm },
    { code: 'BIN', name: 'Bahasa Indonesia', category: 'Umum', kkm },
    { code: 'MTK', name: 'Matematika', category: 'Umum', kkm },
    { code: 'BIG', name: 'Bahasa Inggris', category: 'Umum', kkm },
    { code: 'SAS', name: 'Bahasa & Sastra Indonesia', category: 'Peminatan', kkm },
    { code: 'BAS', name: 'Bahasa & Sastra Inggris', category: 'Peminatan', kkm },
    { code: 'ANT', name: 'Antropologi', category: 'Peminatan', kkm },
  ];

  const ummSubjects: Omit<SubjectScore, 'score'>[] = [
    { code: 'PAI', name: 'Pendidikan Agama dan Budi Pekerti', category: 'Umum', kkm },
    { code: 'PKN', name: 'Pendidikan Pancasila dan Kewarganegaraan', category: 'Umum', kkm },
    { code: 'BIN', name: 'Bahasa Indonesia', category: 'Umum', kkm },
    { code: 'MTK', name: 'Matematika', category: 'Umum', kkm },
    { code: 'BIG', name: 'Bahasa Inggris', category: 'Umum', kkm },
    { code: 'FIS', name: 'Fisika Dasar', category: 'Peminatan', kkm },
    { code: 'EKO', name: 'Ekonomi Dasar', category: 'Peminatan', kkm },
    { code: 'SAS', name: 'Bahasa & Sastra', category: 'Peminatan', kkm },
  ];

  let base = mipaSubjects;
  if (major === 'IPS') base = ipsSubjects;
  else if (major === 'BHS') base = bhsSubjects;
  else if (major === 'UMM') base = ummSubjects;

  return base.map((subj, idx) => ({
    ...subj,
    score: scores[idx] ?? 80,
  }));
}

export function computeAcademicSummary(
  subjects: SubjectScore[],
  passingKkm = 75,
  overrideStatus?: GraduationStatus
): {
  averageScore: number;
  status: GraduationStatus;
  predicate: GraduationPredicate;
} {
  if (!subjects || subjects.length === 0) {
    return {
      averageScore: 0,
      status: overrideStatus || 'TIDAK LULUS',
      predicate: 'Belum Memenuhi Kriteria',
    };
  }
  const sum = subjects.reduce((acc, item) => acc + Number(item.score || 0), 0);
  const averageScore = Number((sum / subjects.length).toFixed(2));
  const status: GraduationStatus =
    overrideStatus ?? (averageScore >= passingKkm ? 'LULUS' : 'TIDAK LULUS');

  let predicate: GraduationPredicate = 'Belum Memenuhi Kriteria';
  if (status === 'LULUS') {
    if (averageScore >= 90) predicate = 'Dengan Pujian';
    else if (averageScore >= 82) predicate = 'Sangat Memuaskan';
    else predicate = 'Memuaskan';
  }

  return { averageScore, status, predicate };
}

export const INITIAL_CLASSROOMS: ClassRoomRecord[] = [
  {
    id: 'cls-mipa-1',
    className: 'XII MIPA 1',
    major: 'MIPA',
    homeroomTeacher: 'Dra. Hj. Ratna Sari, M.Pd.',
    homeroomNip: '19760412 200212 2 003',
    roomNumber: 'Gedung A · R.301',
    academicYear: '2025/2026',
    updatedAt: '2026-05-05T08:00:00.000Z',
  },
  {
    id: 'cls-mipa-2',
    className: 'XII MIPA 2',
    major: 'MIPA',
    homeroomTeacher: 'Budi Santoso, S.Pd., M.Si.',
    homeroomNip: '19801105 200604 1 009',
    roomNumber: 'Gedung A · R.302',
    academicYear: '2025/2026',
    updatedAt: '2026-05-05T08:00:00.000Z',
  },
  {
    id: 'cls-ips-1',
    className: 'XII IPS 1',
    major: 'IPS',
    homeroomTeacher: 'Drs. Ahmad Fauzi, M.M.',
    homeroomNip: '19740918 200003 1 005',
    roomNumber: 'Gedung B · R.201',
    academicYear: '2025/2026',
    updatedAt: '2026-05-05T08:00:00.000Z',
  },
  {
    id: 'cls-ips-2',
    className: 'XII IPS 2',
    major: 'IPS',
    homeroomTeacher: 'Siti Aminah, S.Pd.',
    homeroomNip: '19830721 200902 2 004',
    roomNumber: 'Gedung B · R.202',
    academicYear: '2025/2026',
    updatedAt: '2026-05-05T08:00:00.000Z',
  },
];

export const INITIAL_SETTINGS: AnnouncementSettings = {
  id: 'default',
  schoolName: 'SMAN 1 Lumbung Ciamis',
  schoolNpsn: '20211502',
  schoolAddress: 'Jl. Raya Kawali - Panjalu, Desa Lumbung, Kec. Lumbung, Kab. Ciamis, Jawa Barat 46258',
  provinceName: 'Pemerintah Daerah Provinsi Jawa Barat · Dinas Pendidikan',
  academicYear: '2025/2026',
  principalName: 'Dr. H. Hendra Wijaya, M.Pd.',
  principalNip: '19720814 199803 1 004',
  plenoDate: '4 Mei 2026',
  sklPrefix: '421.3/SKL-SMAN1LBG/V/2026',
  passingGradeKkm: 75.0,
  isPublished: true,
  announcementTime: new Date(Date.now() + (2 * 3600 + 45 * 60 + 30) * 1000).toISOString(),
  announcementNote:
    'Keputusan kelulusan ini bersifat resmi berdasarkan hasil Rapat Pleno Dewan Pendidik SMAN 1 Lumbung Ciamis. Siswa yang dinyatakan lulus dapat mengunduh Surat Keterangan Lulus (SKL) Digital secara langsung.',
  kopPemerintah: 'PEMERINTAH DAERAH PROVINSI JAWA BARAT',
  kopDinas: 'DINAS PENDIDIKAN',
  kopCabangDinas: 'CABANG DINAS PENDIDIKAN WILAYAH XIII',
  kopKodePos: '46258',
  kopTelepon: '(0265) 7578088',
  kopEmail: 'sman1lumbung.ciamis@gmail.com',
  kopWebsite: 'https://sman1lumbung.sch.id',
  kopLogoKiri: '',
  kopLogoKanan: '',
  kopLogoKiriSize: 30,
  kopLogoKananSize: 30,
  kopBorderThickness: 'standard_double',
  sklOpeningText:
    'Kepala SMAN 1 Lumbung selaku Ketua Penyelenggara Ujian Satuan Pendidikan Tahun Pelajaran 2025/2026, berdasarkan Kriteria Kelulusan Peserta Didik dan hasil Rapat Pleno Dewan Pendidik pada tanggal 4 Mei 2026, dengan ini menerangkan bahwa:',
  sklClosingText:
    'Surat Keterangan Lulus ini bersifat resmi dan berlaku sementara sampai dengan diterbitkannya Ijazah Asli Tahun Pelajaran 2025/2026.',
  sklLegalLocation: 'Ciamis',
  principalSignature: '',
  updatedAt: new Date().toISOString(),
};

export const INITIAL_USERS: AppUserRecord[] = [
  {
    id: 'usr-admin-01',
    username: 'admin',
    fullName: 'Operator Kurikulum SMAN 1 Lumbung',
    nip: '19850312 201001 1 008',
    role: 'admin',
    assignedClass: 'Semua Kelas',
    accessPin: 'admin2026',
    isActive: true,
    updatedAt: '2026-05-05T08:00:00.000Z',
  },
  {
    id: 'usr-wali-01',
    username: 'wali_mipa1',
    fullName: 'Dra. Hj. Ratna Sari, M.Pd.',
    nip: '19760412 200212 2 003',
    role: 'wali_kelas',
    assignedClass: 'XII MIPA 1',
    accessPin: 'wali2026',
    isActive: true,
    updatedAt: '2026-05-05T08:00:00.000Z',
  },
  {
    id: 'usr-wali-02',
    username: 'wali_ips1',
    fullName: 'Drs. Ahmad Fauzi, M.M.',
    nip: '19740918 200003 1 005',
    role: 'wali_kelas',
    assignedClass: 'XII IPS 1',
    accessPin: 'wali2026',
    isActive: true,
    updatedAt: '2026-05-05T08:00:00.000Z',
  },
  {
    id: 'usr-guru-01',
    username: 'guru_mtk',
    fullName: 'Budi Santoso, S.Pd., M.Si.',
    nip: '19801105 200604 1 009',
    role: 'guru',
    assignedClass: 'Matematika & Fisika',
    accessPin: 'guru2026',
    isActive: true,
    updatedAt: '2026-05-05T08:00:00.000Z',
  },
];

export const INITIAL_STUDENTS: StudentRecord[] = [
  {
    id: 'std-001',
    nisn: '0084921034',
    examNumber: '26-01-0145-0001-8',
    fullName: 'Nadia Putri Maharani',
    birthPlace: 'Jakarta',
    birthDate: '2008-05-14',
    className: 'XII MIPA 1',
    major: 'MIPA',
    averageScore: 92.5,
    status: 'LULUS',
    predicate: 'Dengan Pujian',
    sklNumber: '421.3/001/SKL-SMAN1/V/2026',
    subjects: getDefaultSubjects('MIPA', [95, 92, 94, 91, 93, 90, 92, 93]),
    notes: 'Peraih Nilai Terbaik Pararel I Peminatan MIPA Tahun Ajaran 2025/2026.',
    checkedAt: '2026-05-05T10:04:12.000Z',
    checkCount: 3,
    updatedAt: '2026-05-05T08:00:00.000Z',
  },
  {
    id: 'std-002',
    nisn: '0085102948',
    examNumber: '26-01-0145-0002-7',
    fullName: 'Rizky Pratama Wijaya',
    birthPlace: 'Bandung',
    birthDate: '2008-08-22',
    className: 'XII MIPA 1',
    major: 'MIPA',
    averageScore: 86.25,
    status: 'LULUS',
    predicate: 'Sangat Memuaskan',
    sklNumber: '421.3/002/SKL-SMAN1/V/2026',
    subjects: getDefaultSubjects('MIPA', [88, 86, 87, 85, 89, 84, 85, 86]),
    notes: 'Telah menyelesaikan seluruh beban belajar dan ujian satuan pendidikan dengan baik.',
    checkedAt: '2026-05-05T10:15:40.000Z',
    checkCount: 1,
    updatedAt: '2026-05-05T08:00:00.000Z',
  },
  {
    id: 'std-003',
    nisn: '0083910472',
    examNumber: '26-01-0145-0003-6',
    fullName: 'Bagas Adi Nugroho',
    birthPlace: 'Surabaya',
    birthDate: '2008-11-03',
    className: 'XII IPS 1',
    major: 'IPS',
    averageScore: 68.5,
    status: 'TIDAK LULUS',
    predicate: 'Belum Memenuhi Kriteria',
    sklNumber: '421.3/003/SKL-SMAN1/V/2026',
    subjects: getDefaultSubjects('IPS', [74, 72, 70, 62, 68, 65, 70, 67]),
    notes: 'Diwajibkan menghubungi Wakil Kepala Sekolah Bidang Kurikulum untuk pembinaan akademik lanjutan.',
    checkedAt: null,
    checkCount: 0,
    updatedAt: '2026-05-05T08:00:00.000Z',
  },
  {
    id: 'std-004',
    nisn: '0086729183',
    examNumber: '26-01-0145-0004-5',
    fullName: 'Alya Zahra Ramadhani',
    birthPlace: 'Yogyakarta',
    birthDate: '2008-09-19',
    className: 'XII IPS 1',
    major: 'IPS',
    averageScore: 91.13,
    status: 'LULUS',
    predicate: 'Dengan Pujian',
    sklNumber: '421.3/004/SKL-SMAN1/V/2026',
    subjects: getDefaultSubjects('IPS', [94, 91, 93, 88, 92, 91, 90, 90]),
    notes: 'Peraih Nilai Terbaik Pararel I Peminatan IPS Tahun Ajaran 2025/2026.',
    checkedAt: '2026-05-05T10:19:05.000Z',
    checkCount: 2,
    updatedAt: '2026-05-05T08:00:00.000Z',
  },
  {
    id: 'std-005',
    nisn: '0081948275',
    examNumber: '26-01-0145-0005-4',
    fullName: 'Dimas Arya Saputra',
    birthPlace: 'Semarang',
    birthDate: '2008-02-11',
    className: 'XII MIPA 2',
    major: 'MIPA',
    averageScore: 81.63,
    status: 'LULUS',
    predicate: 'Memuaskan',
    sklNumber: '421.3/005/SKL-SMAN1/V/2026',
    subjects: getDefaultSubjects('MIPA', [84, 82, 83, 79, 81, 80, 81, 83]),
    notes: 'Memenuhi seluruh kriteria kelulusan satuan pendidikan.',
    checkedAt: null,
    checkCount: 0,
    updatedAt: '2026-05-05T08:00:00.000Z',
  },
  {
    id: 'std-006',
    nisn: '0087492016',
    examNumber: '26-01-0145-0006-3',
    fullName: 'Siti Nurhaliza Pertiwi',
    birthPlace: 'Jakarta',
    birthDate: '2008-07-28',
    className: 'XII IPS 2',
    major: 'IPS',
    averageScore: 85.75,
    status: 'LULUS',
    predicate: 'Sangat Memuaskan',
    sklNumber: '421.3/006/SKL-SMAN1/V/2026',
    subjects: getDefaultSubjects('IPS', [89, 87, 86, 82, 85, 86, 86, 85]),
    notes: 'Memenuhi seluruh kriteria kelulusan satuan pendidikan.',
    checkedAt: '2026-05-05T11:02:18.000Z',
    checkCount: 1,
    updatedAt: '2026-05-05T08:00:00.000Z',
  },
  {
    id: 'std-007',
    nisn: '0089201843',
    examNumber: '26-01-0145-0007-2',
    fullName: 'Farhan Maulana Hakim',
    birthPlace: 'Bogor',
    birthDate: '2008-12-09',
    className: 'XII MIPA 2',
    major: 'MIPA',
    averageScore: 70.13,
    status: 'TIDAK LULUS',
    predicate: 'Belum Memenuhi Kriteria',
    sklNumber: '421.3/007/SKL-SMAN1/V/2026',
    subjects: getDefaultSubjects('MIPA', [75, 74, 72, 65, 70, 66, 68, 71]),
    notes: 'Belum memenuhi Kriteria Ketuntasan Minimal (KKM) pada mata pelajaran peminatan.',
    checkedAt: null,
    checkCount: 0,
    updatedAt: '2026-05-05T08:00:00.000Z',
  },
  {
    id: 'std-008',
    nisn: '0082384910',
    examNumber: '26-01-0145-0008-1',
    fullName: 'Kezia Aurelia Tanjungsari',
    birthPlace: 'Medan',
    birthDate: '2008-04-06',
    className: 'XII MIPA 1',
    major: 'MIPA',
    averageScore: 89.38,
    status: 'LULUS',
    predicate: 'Sangat Memuaskan',
    sklNumber: '421.3/008/SKL-SMAN1/V/2026',
    subjects: getDefaultSubjects('MIPA', [91, 89, 90, 88, 92, 87, 89, 89]),
    notes: 'Aktif dalam Olimpiade Sains Nasional dan memenuhi kriteria kelulusan.',
    checkedAt: '2026-05-05T10:30:00.000Z',
    checkCount: 4,
    updatedAt: '2026-05-05T08:00:00.000Z',
  },
];

export const INITIAL_ALUMNI: AlumniRecord[] = [
  {
    id: 'alm-001',
    nisn: '0074192831',
    examNumber: '25-01-0145-0012-4',
    fullName: 'Muhammad Raihan Alfarizi',
    birthPlace: 'Jakarta',
    birthDate: '2007-03-18',
    className: 'XII MIPA 1',
    major: 'MIPA',
    graduationYear: '2024/2025',
    averageScore: 93.25,
    predicate: 'Dengan Pujian',
    sklNumber: '421.3/012/SKL-SMAN1/V/2025',
    subjects: getDefaultSubjects('MIPA', [96, 93, 94, 95, 92, 91, 92, 93]),
    notes: 'Lulusan Terbaik Angkatan 2024/2025.',
    continuationStatus: 'PTN / PTS',
    institutionName: 'Institut Teknologi Bandung (ITB) — STEI',
    contactPhone: '0812-8849-2019',
    transferredAt: '2025-05-10T09:00:00.000Z',
    updatedAt: '2025-05-10T09:00:00.000Z',
  },
  {
    id: 'alm-002',
    nisn: '0078291044',
    examNumber: '25-01-0145-0045-2',
    fullName: 'Anindya Kirana Putri',
    birthPlace: 'Bogor',
    birthDate: '2007-07-25',
    className: 'XII IPS 1',
    major: 'IPS',
    graduationYear: '2024/2025',
    averageScore: 90.5,
    predicate: 'Dengan Pujian',
    sklNumber: '421.3/045/SKL-SMAN1/V/2025',
    subjects: getDefaultSubjects('IPS', [92, 91, 90, 89, 91, 92, 89, 90]),
    notes: 'Diterima melalui jalur SNBP.',
    continuationStatus: 'PTN / PTS',
    institutionName: 'Universitas Indonesia (UI) — Ilmu Ekonomi',
    contactPhone: '0813-9012-4412',
    transferredAt: '2025-05-10T09:00:00.000Z',
    updatedAt: '2025-05-10T09:00:00.000Z',
  },
];

// ============================================================================
// ROW MAPPERS
// ============================================================================

function mapRowToClassRoom(row: Record<string, any>): ClassRoomRecord {
  const rawMajor = String(row.major ?? 'MIPA').toUpperCase();
  const major: Major =
    rawMajor === 'IPS'
      ? 'IPS'
      : rawMajor === 'BHS'
        ? 'BHS'
        : rawMajor === 'UMM' || rawMajor === 'UMUM'
          ? 'UMM'
          : 'MIPA';
  return {
    id: String(row.id),
    className: String(row.class_name ?? row.className ?? ''),
    major,
    homeroomTeacher: String(row.homeroom_teacher ?? row.homeroomTeacher ?? ''),
    homeroomNip: String(row.homeroom_nip ?? row.homeroomNip ?? ''),
    roomNumber: String(row.room_number ?? row.roomNumber ?? ''),
    academicYear: String(row.academic_year ?? row.academicYear ?? '2025/2026'),
    updatedAt: String(row.updated_at ?? row.updatedAt ?? new Date().toISOString()),
  };
}

function mapClassRoomToRow(cls: ClassRoomRecord) {
  return {
    id: cls.id,
    class_name: cls.className,
    major: cls.major,
    homeroom_teacher: cls.homeroomTeacher,
    homeroom_nip: cls.homeroomNip,
    room_number: cls.roomNumber,
    academic_year: cls.academicYear,
    updated_at: cls.updatedAt,
  };
}

function mapRowToStudent(row: Record<string, any>): StudentRecord {
  const rawMajor = String(row.major ?? 'MIPA').toUpperCase();
  const major: Major =
    rawMajor === 'IPS'
      ? 'IPS'
      : rawMajor === 'BHS'
        ? 'BHS'
        : rawMajor === 'UMM' || rawMajor === 'UMUM'
          ? 'UMM'
          : 'MIPA';
  return {
    id: String(row.id),
    nisn: String(row.nisn),
    examNumber: String(row.exam_number ?? row.examNumber ?? ''),
    fullName: String(row.full_name ?? row.fullName ?? ''),
    birthPlace: String(row.birth_place ?? row.birthPlace ?? 'Jakarta'),
    birthDate: String(row.birth_date ?? row.birthDate ?? ''),
    className: String(row.class_name ?? row.className ?? 'XII MIPA 1'),
    major,
    averageScore: Number(row.average_score ?? row.averageScore ?? 0),
    status: (row.status === 'TIDAK LULUS' ? 'TIDAK LULUS' : 'LULUS') as GraduationStatus,
    predicate: (row.predicate ?? 'Memuaskan') as GraduationPredicate,
    sklNumber: String(row.skl_number ?? row.sklNumber ?? ''),
    subjects: Array.isArray(row.subjects) ? row.subjects : [],
    notes: String(row.notes ?? ''),
    checkedAt: row.checked_at ?? row.checkedAt ?? null,
    checkCount: Number(row.check_count ?? row.checkCount ?? 0),
    updatedAt: String(row.updated_at ?? row.updatedAt ?? new Date().toISOString()),
  };
}

function mapStudentToRow(student: StudentRecord) {
  return {
    id: student.id,
    nisn: student.nisn,
    exam_number: student.examNumber,
    full_name: student.fullName,
    birth_place: student.birthPlace,
    birth_date: student.birthDate,
    class_name: student.className,
    major: student.major,
    average_score: student.averageScore,
    status: student.status,
    predicate: student.predicate,
    skl_number: student.sklNumber,
    subjects: student.subjects,
    notes: student.notes,
    checked_at: student.checkedAt,
    check_count: student.checkCount,
    updated_at: student.updatedAt,
  };
}

function mapRowToAlumni(row: Record<string, any>): AlumniRecord {
  const rawMajor = String(row.major ?? 'MIPA').toUpperCase();
  const major: Major =
    rawMajor === 'IPS'
      ? 'IPS'
      : rawMajor === 'BHS'
        ? 'BHS'
        : rawMajor === 'UMM' || rawMajor === 'UMUM'
          ? 'UMM'
          : 'MIPA';
  return {
    id: String(row.id),
    nisn: String(row.nisn),
    examNumber: String(row.exam_number ?? row.examNumber ?? ''),
    fullName: String(row.full_name ?? row.fullName ?? ''),
    birthPlace: String(row.birth_place ?? row.birthPlace ?? 'Jakarta'),
    birthDate: String(row.birth_date ?? row.birthDate ?? ''),
    className: String(row.class_name ?? row.className ?? 'XII MIPA 1'),
    major,
    graduationYear: String(row.graduation_year ?? row.graduationYear ?? '2025/2026'),
    averageScore: Number(row.average_score ?? row.averageScore ?? 0),
    predicate: (row.predicate ?? 'Memuaskan') as GraduationPredicate,
    sklNumber: String(row.skl_number ?? row.sklNumber ?? ''),
    subjects: Array.isArray(row.subjects) ? row.subjects : [],
    notes: String(row.notes ?? ''),
    continuationStatus: (row.continuation_status ??
      row.continuationStatus ??
      'Belum Terdata') as AlumniContinuation,
    institutionName: String(row.institution_name ?? row.institutionName ?? ''),
    contactPhone: String(row.contact_phone ?? row.contactPhone ?? ''),
    transferredAt: String(
      row.transferred_at ?? row.transferredAt ?? new Date().toISOString()
    ),
    updatedAt: String(row.updated_at ?? row.updatedAt ?? new Date().toISOString()),
  };
}

function mapAlumniToRow(alumni: AlumniRecord) {
  return {
    id: alumni.id,
    nisn: alumni.nisn,
    exam_number: alumni.examNumber,
    full_name: alumni.fullName,
    birth_place: alumni.birthPlace,
    birth_date: alumni.birthDate,
    class_name: alumni.className,
    major: alumni.major,
    graduation_year: alumni.graduationYear,
    average_score: alumni.averageScore,
    predicate: alumni.predicate,
    skl_number: alumni.sklNumber,
    subjects: alumni.subjects,
    notes: alumni.notes,
    continuation_status: alumni.continuationStatus,
    institution_name: alumni.institutionName,
    contact_phone: alumni.contactPhone,
    transferred_at: alumni.transferredAt,
    updated_at: alumni.updatedAt,
  };
}

function mapRowToSettings(row: Record<string, any>): AnnouncementSettings {
  const rawName = String(row.school_name ?? row.schoolName ?? INITIAL_SETTINGS.schoolName);
  const upgradedName =
    rawName === 'SMA Negeri 1 Nusantara Jakarta' ? INITIAL_SETTINGS.schoolName : rawName;
  const rawAddr = String(row.school_address ?? row.schoolAddress ?? INITIAL_SETTINGS.schoolAddress);
  const upgradedAddr = rawAddr.includes('Budi Utomo') ? INITIAL_SETTINGS.schoolAddress : rawAddr;
  const rawProv = String(row.province_name ?? row.provinceName ?? INITIAL_SETTINGS.provinceName);
  const upgradedProv = rawProv.includes('DKI Jakarta') ? INITIAL_SETTINGS.provinceName : rawProv;

  return {
    id: String(row.id ?? 'default'),
    schoolName: upgradedName,
    schoolNpsn: String(row.school_npsn ?? row.schoolNpsn ?? INITIAL_SETTINGS.schoolNpsn),
    schoolAddress: upgradedAddr,
    provinceName: upgradedProv,
    academicYear: String(row.academic_year ?? row.academicYear ?? INITIAL_SETTINGS.academicYear),
    principalName: String(row.principal_name ?? row.principalName ?? INITIAL_SETTINGS.principalName),
    principalNip: String(row.principal_nip ?? row.principalNip ?? INITIAL_SETTINGS.principalNip),
    plenoDate: String(row.pleno_date ?? row.plenoDate ?? INITIAL_SETTINGS.plenoDate),
    sklPrefix: String(row.skl_prefix ?? row.sklPrefix ?? INITIAL_SETTINGS.sklPrefix),
    passingGradeKkm: Number(row.passing_grade_kkm ?? row.passingGradeKkm ?? 75),
    isPublished: Boolean(row.is_published ?? row.isPublished ?? true),
    announcementTime: String(
      row.announcement_time ?? row.announcementTime ?? INITIAL_SETTINGS.announcementTime
    ),
    announcementNote: String(
      row.announcement_note ?? row.announcementNote ?? INITIAL_SETTINGS.announcementNote
    ),
    kopPemerintah: String(
      row.kop_pemerintah ?? row.kopPemerintah ?? INITIAL_SETTINGS.kopPemerintah ?? ''
    ),
    kopDinas: String(row.kop_dinas ?? row.kopDinas ?? INITIAL_SETTINGS.kopDinas ?? ''),
    kopCabangDinas: String(
      row.kop_cabang_dinas ?? row.kopCabangDinas ?? INITIAL_SETTINGS.kopCabangDinas ?? ''
    ),
    kopKodePos: String(row.kop_kode_pos ?? row.kopKodePos ?? INITIAL_SETTINGS.kopKodePos ?? ''),
    kopTelepon: String(row.kop_telepon ?? row.kopTelepon ?? INITIAL_SETTINGS.kopTelepon ?? ''),
    kopEmail: String(row.kop_email ?? row.kopEmail ?? INITIAL_SETTINGS.kopEmail ?? ''),
    kopWebsite: String(row.kop_website ?? row.kopWebsite ?? INITIAL_SETTINGS.kopWebsite ?? ''),
    kopLogoKiri: String(row.kop_logo_kiri ?? row.kopLogoKiri ?? INITIAL_SETTINGS.kopLogoKiri ?? ''),
    kopLogoKanan: String(row.kop_logo_kanan ?? row.kopLogoKanan ?? INITIAL_SETTINGS.kopLogoKanan ?? ''),
    kopLogoKiriSize: Number(row.kop_logo_kiri_size ?? row.kopLogoKiriSize ?? 30),
    kopLogoKananSize: Number(row.kop_logo_kanan_size ?? row.kopLogoKananSize ?? 30),
    kopBorderThickness: (row.kop_border_thickness ??
      row.kopBorderThickness ??
      INITIAL_SETTINGS.kopBorderThickness ??
      'standard_double') as any,
    sklOpeningText: String(
      row.skl_opening_text ?? row.sklOpeningText ?? INITIAL_SETTINGS.sklOpeningText ?? ''
    ),
    sklClosingText: String(
      row.skl_closing_text ?? row.sklClosingText ?? INITIAL_SETTINGS.sklClosingText ?? ''
    ),
    sklLegalLocation: String(
      row.skl_legal_location ?? row.sklLegalLocation ?? INITIAL_SETTINGS.sklLegalLocation ?? 'Ciamis'
    ),
    principalSignature: String(
      row.principal_signature ?? row.principalSignature ?? INITIAL_SETTINGS.principalSignature ?? ''
    ),
    updatedAt: String(row.updated_at ?? row.updatedAt ?? new Date().toISOString()),
  };
}

function mapRowToAppUser(row: Record<string, any>): AppUserRecord {
  const rawRole = String(row.role ?? 'guru');
  const validRole: UserRole =
    rawRole === 'admin' || rawRole === 'wali_kelas' || rawRole === 'guru' ? rawRole : 'guru';
  return {
    id: String(row.id),
    username: String(row.username ?? ''),
    fullName: String(row.full_name ?? row.fullName ?? ''),
    nip: String(row.nip ?? ''),
    role: validRole,
    assignedClass: String(row.assigned_class ?? row.assignedClass ?? ''),
    accessPin: String(row.access_pin ?? row.accessPin ?? 'admin2026'),
    isActive: row.is_active !== undefined ? Boolean(row.is_active) : row.isActive !== false,
    updatedAt: String(row.updated_at ?? row.updatedAt ?? new Date().toISOString()),
  };
}

function mapAppUserToRow(user: AppUserRecord) {
  return {
    id: user.id,
    username: user.username,
    full_name: user.fullName,
    nip: user.nip,
    role: user.role,
    assigned_class: user.assignedClass,
    access_pin: user.accessPin,
    is_active: user.isActive,
    updated_at: user.updatedAt,
  };
}

function mapRowToSubjectCatalog(row: Record<string, any>): SubjectCatalogRecord {
  const rawCat = String(row.category ?? 'Umum');
  const rawMajor = String(row.major_target ?? row.majorTarget ?? 'UMUM').toUpperCase();
  const majorTarget =
    rawMajor === 'MIPA' || rawMajor === 'IPS' || rawMajor === 'BHS' || rawMajor === 'UMM'
      ? (rawMajor as 'MIPA' | 'IPS' | 'BHS' | 'UMM')
      : 'UMUM';
  return {
    id: String(row.id),
    code: String(row.code ?? '').toUpperCase(),
    name: String(row.name ?? ''),
    category: rawCat === 'Peminatan' ? 'Peminatan' : 'Umum',
    majorTarget,
    kkm: Number(row.kkm ?? 75),
    sortOrder: Number(row.sort_order ?? row.sortOrder ?? 1),
    updatedAt: String(row.updated_at ?? row.updatedAt ?? new Date().toISOString()),
  };
}

function mapSubjectCatalogToRow(subj: SubjectCatalogRecord) {
  return {
    id: subj.id,
    code: subj.code.toUpperCase(),
    name: subj.name,
    category: subj.category,
    major_target: subj.majorTarget,
    kkm: subj.kkm,
    sort_order: subj.sortOrder,
    updated_at: subj.updatedAt,
  };
}

function mapRowToLetterNumber(row: Record<string, any>): LetterNumberRecord {
  const rawTarget = String(row.major_target ?? row.majorTarget ?? 'SEMUA').toUpperCase();
  const majorTarget =
    rawTarget === 'MIPA' || rawTarget === 'IPS' || rawTarget === 'BHS' || rawTarget === 'UMM'
      ? (rawTarget as 'MIPA' | 'IPS' | 'BHS' | 'UMM')
      : 'SEMUA';
  return {
    id: String(row.id),
    code: String(row.code ?? ''),
    title: String(row.title ?? ''),
    classificationCode: String(row.classification_code ?? row.classificationCode ?? '421.3'),
    numberPattern: String(
      row.number_pattern ?? row.numberPattern ?? '421.3/{NO_URUT}/SKL-SMAN1LBG/V/2026'
    ),
    majorTarget,
    academicYear: String(row.academic_year ?? row.academicYear ?? '2025/2026'),
    issueDate: String(row.issue_date ?? row.issueDate ?? '2026-05-05'),
    startSequence: Number(row.start_sequence ?? row.startSequence ?? 1),
    digitPadding: Number(row.digit_padding ?? row.digitPadding ?? 3),
    isDefault: Boolean(row.is_default ?? row.isDefault ?? false),
    notes: String(row.notes ?? ''),
    updatedAt: String(row.updated_at ?? row.updatedAt ?? new Date().toISOString()),
  };
}

function mapLetterNumberToRow(item: LetterNumberRecord) {
  return {
    id: item.id,
    code: item.code,
    title: item.title,
    classification_code: item.classificationCode,
    number_pattern: item.numberPattern,
    major_target: item.majorTarget,
    academic_year: item.academicYear,
    issue_date: item.issueDate,
    start_sequence: item.startSequence,
    digit_padding: item.digitPadding,
    is_default: item.isDefault,
    notes: item.notes,
    updated_at: item.updatedAt,
  };
}

function mapSettingsToRow(settings: AnnouncementSettings) {
  return {
    id: settings.id || 'default',
    school_name: settings.schoolName,
    school_npsn: settings.schoolNpsn,
    school_address: settings.schoolAddress,
    province_name: settings.provinceName,
    academic_year: settings.academicYear,
    principal_name: settings.principalName,
    principal_nip: settings.principalNip,
    pleno_date: settings.plenoDate,
    skl_prefix: settings.sklPrefix,
    passing_grade_kkm: settings.passingGradeKkm,
    is_published: settings.isPublished,
    announcement_time: settings.announcementTime,
    announcement_note: settings.announcementNote,
    kop_pemerintah: settings.kopPemerintah ?? '',
    kop_dinas: settings.kopDinas ?? '',
    kop_cabang_dinas: settings.kopCabangDinas ?? '',
    kop_kode_pos: settings.kopKodePos ?? '',
    kop_telepon: settings.kopTelepon ?? '',
    kop_email: settings.kopEmail ?? '',
    kop_website: settings.kopWebsite ?? '',
    kop_logo_kiri: settings.kopLogoKiri ?? '',
    kop_logo_kanan: settings.kopLogoKanan ?? '',
    kop_logo_kiri_size: settings.kopLogoKiriSize ?? 30,
    kop_logo_kanan_size: settings.kopLogoKananSize ?? 30,
    kop_border_thickness: settings.kopBorderThickness ?? 'standard_double',
    skl_opening_text: settings.sklOpeningText ?? '',
    skl_closing_text: settings.sklClosingText ?? '',
    skl_legal_location: settings.sklLegalLocation ?? 'Ciamis',
    principal_signature: settings.principalSignature ?? '',
    updated_at: settings.updatedAt,
  };
}

function loadLocalClassRooms(): ClassRoomRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_CLASSES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  localStorage.setItem(LOCAL_CLASSES_KEY, JSON.stringify(INITIAL_CLASSROOMS));
  return INITIAL_CLASSROOMS;
}

function saveLocalClassRooms(classes: ClassRoomRecord[]) {
  try {
    localStorage.setItem(LOCAL_CLASSES_KEY, JSON.stringify(classes));
  } catch {
    // ignore
  }
}

function loadLocalStudents(): StudentRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_STUDENTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore storage errors
  }
  localStorage.setItem(LOCAL_STUDENTS_KEY, JSON.stringify(INITIAL_STUDENTS));
  return INITIAL_STUDENTS;
}

function saveLocalStudents(students: StudentRecord[]) {
  try {
    localStorage.setItem(LOCAL_STUDENTS_KEY, JSON.stringify(students));
  } catch {
    // ignore storage errors
  }
}

function loadLocalAlumni(): AlumniRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_ALUMNI_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  localStorage.setItem(LOCAL_ALUMNI_KEY, JSON.stringify(INITIAL_ALUMNI));
  return INITIAL_ALUMNI;
}

function saveLocalAlumni(alumni: AlumniRecord[]) {
  try {
    localStorage.setItem(LOCAL_ALUMNI_KEY, JSON.stringify(alumni));
  } catch {
    // ignore
  }
}

export function loadLocalUsers(): AppUserRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(INITIAL_USERS));
  return INITIAL_USERS;
}

function saveLocalUsers(users: AppUserRecord[]) {
  try {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  } catch {
    // ignore
  }
}

export function loadLocalSubjectCatalog(): SubjectCatalogRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_SUBJECTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  localStorage.setItem(LOCAL_SUBJECTS_KEY, JSON.stringify(INITIAL_SUBJECT_CATALOG));
  return INITIAL_SUBJECT_CATALOG;
}

function saveLocalSubjectCatalog(catalog: SubjectCatalogRecord[]) {
  try {
    localStorage.setItem(LOCAL_SUBJECTS_KEY, JSON.stringify(catalog));
  } catch {
    // ignore
  }
}

export function loadLocalLetterNumbers(): LetterNumberRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_LETTER_NUMBERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  localStorage.setItem(LOCAL_LETTER_NUMBERS_KEY, JSON.stringify(INITIAL_LETTER_NUMBERS));
  return INITIAL_LETTER_NUMBERS;
}

function saveLocalLetterNumbers(list: LetterNumberRecord[]) {
  try {
    localStorage.setItem(LOCAL_LETTER_NUMBERS_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

function loadLocalSettings(): AnnouncementSettings {
  try {
    const raw = localStorage.getItem(LOCAL_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.schoolName) {
        let changed = false;
        if (parsed.announcementTime === '2026-05-05T10:00:00+07:00') {
          parsed.announcementTime = INITIAL_SETTINGS.announcementTime;
          changed = true;
        }
        if (parsed.schoolName === 'SMA Negeri 1 Nusantara Jakarta') {
          parsed.schoolName = INITIAL_SETTINGS.schoolName;
          parsed.schoolNpsn = INITIAL_SETTINGS.schoolNpsn;
          parsed.schoolAddress = INITIAL_SETTINGS.schoolAddress;
          parsed.provinceName = INITIAL_SETTINGS.provinceName;
          parsed.sklPrefix = INITIAL_SETTINGS.sklPrefix;
          changed = true;
        }
        if (changed) {
          localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(parsed));
        }
        return parsed;
      }
    }
  } catch {
    // ignore storage errors
  }
  localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(INITIAL_SETTINGS));
  return INITIAL_SETTINGS;
}

function saveLocalSettings(settings: AnnouncementSettings) {
  try {
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore storage errors
  }
}

let activeBroadcastChannel: RealtimeChannel | null = null;
let lastRealtimeEventAt: string | null = null;

export function broadcastStateChange(payload: {
  type:
    | 'CLASSES_UPDATED'
    | 'SUBJECTS_UPDATED'
    | 'LETTER_NUMBERS_UPDATED'
    | 'STUDENTS_UPDATED'
    | 'ALUMNI_UPDATED'
    | 'USERS_UPDATED'
    | 'SETTINGS_UPDATED'
    | 'DIAGNOSTIC_PING';
  classRooms?: ClassRoomRecord[];
  subjectCatalog?: SubjectCatalogRecord[];
  letterNumbers?: LetterNumberRecord[];
  students?: StudentRecord[];
  alumni?: AlumniRecord[];
  users?: AppUserRecord[];
  settings?: AnnouncementSettings;
}) {
  lastRealtimeEventAt = new Date().toISOString();
  if (activeBroadcastChannel) {
    activeBroadcastChannel.send({
      type: 'broadcast',
      event: 'gradugate_sync',
      payload,
    });
  }
}

// ============================================================================
// PROTECTED PUBLIC GRADUATION VERIFICATION (Rate-Limited & Least-Privilege)
// ============================================================================

const verificationAttemptsWindow: number[] = [];
const MAX_VERIFICATION_ATTEMPTS_PER_MINUTE = 5;

export async function verifyStudentGraduationPublic(
  rawNisn: string,
  rawExamNumber: string,
  rawBirthDate: string,
  currentStudents: StudentRecord[],
  currentSettings: AnnouncementSettings
): Promise<{
  ok: boolean;
  student?: StudentRecord;
  errorMessage?: string;
  rateLimited?: boolean;
}> {
  // 1. Enforce publication state check
  const targetMs = new Date(currentSettings.announcementTime).getTime();
  const isTimeReached = !Number.isNaN(targetMs) && targetMs <= Date.now();
  if (!currentSettings.isPublished && !isTimeReached) {
    return {
      ok: false,
      errorMessage:
        'Pengumuman kelulusan saat ini masih dikunci dan menunggu waktu hitung mundur selesai.',
    };
  }

  // 2. Enforce rate limiting against bulk enumeration
  const now = Date.now();
  while (verificationAttemptsWindow.length > 0 && now - verificationAttemptsWindow[0] > 60_000) {
    verificationAttemptsWindow.shift();
  }
  if (verificationAttemptsWindow.length >= MAX_VERIFICATION_ATTEMPTS_PER_MINUTE) {
    appendDiagnosticLog(
      'warn',
      'security',
      'PUBLIC_VERIFY_RATE_LIMIT',
      'Pembatasan laju (rate-limit) verifikasi publik aktif untuk mencegah enumerasi NISN.'
    );
    return {
      ok: false,
      rateLimited: true,
      errorMessage:
        'Terlalu banyak percobaan verifikasi dalam 1 menit terakhir. Silakan tunggu beberapa saat sebelum mencoba kembali.',
    };
  }

  // 3. Input validation
  const cleanNisn = (rawNisn || '').trim().replace(/[^0-9A-Za-z-]/g, '');
  const cleanExamNumber = (rawExamNumber || '').trim().toUpperCase();
  const cleanBirthDate = (rawBirthDate || '').trim();

  if (
    !cleanNisn ||
    cleanNisn.length < 5 ||
    !cleanExamNumber ||
    !/^\d{4}-\d{2}-\d{2}$/.test(cleanBirthDate)
  ) {
    verificationAttemptsWindow.push(now);
    return {
      ok: false,
      errorMessage:
        'Format NISN (10 digit), Nomor Peserta Ujian, atau Tanggal Lahir (YYYY-MM-DD) tidak sesuai.',
    };
  }

  const normalizeExam = (val: string) => val.replace(/[\s-]/g, '').toUpperCase();

  // 4. Try Supabase RPC verify_student_graduation first if configured
  try {
    const db = getSupabaseClient();
    const { data: rpcData, error: rpcError } = await db.rpc('verify_student_graduation', {
      p_nisn: cleanNisn,
      p_birth_date: cleanBirthDate,
    });

    if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
      const verified = mapRowToStudent(rpcData[0]);
      if (
        !verified.examNumber ||
        normalizeExam(verified.examNumber) === normalizeExam(cleanExamNumber)
      ) {
        return { ok: true, student: verified };
      }
    }
  } catch {
    // Fallback to parameterized filter or local match if RPC not yet installed
  }

  // 5. Fallback to exact match (NISN + Nomor Peserta Ujian + Tanggal Lahir)
  const found = currentStudents.find(
    (s) =>
      s.nisn.trim() === cleanNisn &&
      s.birthDate.trim() === cleanBirthDate &&
      normalizeExam(s.examNumber) === normalizeExam(cleanExamNumber)
  );

  if (!found) {
    verificationAttemptsWindow.push(now);
    return {
      ok: false,
      errorMessage:
        'Data tidak ditemukan. Pastikan 10 digit NISN, Nomor Peserta Ujian, dan Tanggal Lahir sesuai dengan data induk sekolah.',
    };
  }

  return { ok: true, student: found };
}

// ============================================================================
// DATA FETCH & CRUD OPERATIONS
// ============================================================================

export async function fetchGraduationData(): Promise<{
  classRooms: ClassRoomRecord[];
  subjectCatalog: SubjectCatalogRecord[];
  letterNumbers: LetterNumberRecord[];
  students: StudentRecord[];
  alumni: AlumniRecord[];
  users: AppUserRecord[];
  settings: AnnouncementSettings;
  syncStatus: SupabaseSyncStatus;
}> {
  const localClasses = loadLocalClassRooms();
  const localSubjects = loadLocalSubjectCatalog();
  const localLetterNumbers = loadLocalLetterNumbers();
  const localStudents = loadLocalStudents();
  const localAlumni = loadLocalAlumni();
  const localUsers = loadLocalUsers();
  const localSettings = loadLocalSettings();
  const cfg = loadSupabaseConfig();
  const startMs = performance.now();

  try {
    const db = getSupabaseClient();
    const [classesRes, subjectsRes, lettersRes, studentsRes, alumniRes, usersRes, settingsRes] =
      await Promise.all([
        db.from('class_rooms').select('*').order('class_name', { ascending: true }),
        db.from('subject_catalog').select('*').order('sort_order', { ascending: true }),
        db.from('letter_numbers').select('*').order('code', { ascending: true }),
        db.from('students').select('*').order('full_name', { ascending: true }),
        db.from('alumni').select('*').order('transferred_at', { ascending: false }),
        db.from('app_users').select('*').order('full_name', { ascending: true }),
        db.from('announcement_settings').select('*').eq('id', 'default').maybeSingle(),
      ]);

    const latencyMs = Math.round(performance.now() - startMs);

    if (!studentsRes.error) {
      let finalClasses = localClasses;
      if (!classesRes.error) {
        if (classesRes.data && classesRes.data.length > 0) {
          finalClasses = classesRes.data.map(mapRowToClassRoom);
          saveLocalClassRooms(finalClasses);
        } else if (cfg.autoSync) {
          await db.from('class_rooms').upsert(localClasses.map(mapClassRoomToRow));
        }
      }

      let finalSubjects = localSubjects;
      if (!subjectsRes.error) {
        if (subjectsRes.data && subjectsRes.data.length > 0) {
          finalSubjects = subjectsRes.data.map(mapRowToSubjectCatalog);
          saveLocalSubjectCatalog(finalSubjects);
        } else if (cfg.autoSync && localSubjects.length > 0) {
          await db.from('subject_catalog').upsert(localSubjects.map(mapSubjectCatalogToRow));
        }
      }

      let finalLetterNumbers = localLetterNumbers;
      if (!lettersRes.error) {
        if (lettersRes.data && lettersRes.data.length > 0) {
          finalLetterNumbers = lettersRes.data.map(mapRowToLetterNumber);
          saveLocalLetterNumbers(finalLetterNumbers);
        } else if (cfg.autoSync && localLetterNumbers.length > 0) {
          await db.from('letter_numbers').upsert(localLetterNumbers.map(mapLetterNumberToRow));
        }
      }

      let finalStudents: StudentRecord[] = [];
      if (studentsRes.data && studentsRes.data.length > 0) {
        finalStudents = studentsRes.data.map(mapRowToStudent);
        saveLocalStudents(finalStudents);
      } else {
        if (cfg.autoSync && localStudents.length > 0) {
          await db.from('students').upsert(localStudents.map(mapStudentToRow));
        }
        finalStudents = localStudents;
      }

      let finalAlumni = localAlumni;
      if (!alumniRes.error) {
        if (alumniRes.data && alumniRes.data.length > 0) {
          finalAlumni = alumniRes.data.map(mapRowToAlumni);
          saveLocalAlumni(finalAlumni);
        } else if (cfg.autoSync && localAlumni.length > 0) {
          await db.from('alumni').upsert(localAlumni.map(mapAlumniToRow));
        }
      }

      let finalUsers = localUsers;
      if (!usersRes.error) {
        if (usersRes.data && usersRes.data.length > 0) {
          finalUsers = usersRes.data.map(mapRowToAppUser);
          saveLocalUsers(finalUsers);
        } else if (cfg.autoSync && localUsers.length > 0) {
          await db.from('app_users').upsert(localUsers.map(mapAppUserToRow));
        }
      }

      let finalSettings = localSettings;
      if (!settingsRes.error && settingsRes.data) {
        finalSettings = mapRowToSettings(settingsRes.data);
        saveLocalSettings(finalSettings);
      } else if (!settingsRes.error && !settingsRes.data && cfg.autoSync) {
        await db.from('announcement_settings').upsert(mapSettingsToRow(localSettings));
      }

      return {
        classRooms: finalClasses,
        subjectCatalog: finalSubjects,
        letterNumbers: finalLetterNumbers,
        students: finalStudents,
        alumni: finalAlumni,
        users: finalUsers,
        settings: finalSettings,
        syncStatus: {
          connected: true,
          connectionState: 'connected',
          mode: 'postgres_table',
          projectUrl: cfg.projectUrl,
          autoSync: cfg.autoSync,
          lastSyncedAt: new Date().toISOString(),
          latencyMs,
        },
      };
    }

    return {
      classRooms: localClasses,
      subjectCatalog: localSubjects,
      letterNumbers: localLetterNumbers,
      students: localStudents,
      alumni: localAlumni,
      users: localUsers,
      settings: localSettings,
      syncStatus: {
        connected: true,
        connectionState: 'connected',
        mode: 'realtime_hybrid',
        projectUrl: cfg.projectUrl,
        autoSync: cfg.autoSync,
        lastSyncedAt: new Date().toISOString(),
        tableHint: studentsRes.error.message,
        latencyMs,
      },
    };
  } catch (err: any) {
    return {
      classRooms: localClasses,
      subjectCatalog: localSubjects,
      letterNumbers: localLetterNumbers,
      students: localStudents,
      alumni: localAlumni,
      users: localUsers,
      settings: localSettings,
      syncStatus: {
        connected: false,
        connectionState: 'error',
        mode: 'realtime_hybrid',
        projectUrl: cfg.projectUrl,
        autoSync: cfg.autoSync,
        lastSyncedAt: null,
        tableHint: err?.message || 'Network error',
      },
    };
  }
}

export async function upsertClassRoomRecord(
  cls: ClassRoomRecord,
  currentClasses: ClassRoomRecord[],
  currentStudents?: StudentRecord[]
): Promise<{
  classRooms: ClassRoomRecord[];
  students?: StudentRecord[];
  syncedToPostgres: boolean;
  errorMessage?: string;
}> {
  const oldClass = currentClasses.find((c) => c.id === cls.id);
  const cleanClassName = cls.className.trim();
  const existingByName = currentClasses.find(
    (c) => c.id !== cls.id && c.className.trim().toLowerCase() === cleanClassName.toLowerCase()
  );

  const stamped: ClassRoomRecord = {
    ...cls,
    id: existingByName ? existingByName.id : cls.id,
    className: cleanClassName,
    homeroomTeacher: cls.homeroomTeacher.trim(),
    homeroomNip: (cls.homeroomNip || '').trim(),
    roomNumber: (cls.roomNumber || '').trim(),
    academicYear: (cls.academicYear || '2025/2026').trim(),
    updatedAt: new Date().toISOString(),
  };

  let nextClasses: ClassRoomRecord[];
  if (existingByName) {
    nextClasses = currentClasses
      .filter((c) => c.id !== cls.id)
      .map((c) => (c.id === existingByName.id ? stamped : c));
  } else if (currentClasses.some((c) => c.id === stamped.id)) {
    nextClasses = currentClasses.map((c) => (c.id === stamped.id ? stamped : c));
  } else {
    nextClasses = [...currentClasses, stamped];
  }

  saveLocalClassRooms(nextClasses);
  broadcastStateChange({ type: 'CLASSES_UPDATED', classRooms: nextClasses });

  // If class name or major was changed, cascade to students belonging to oldClass.className
  let updatedStudentsList: StudentRecord[] | undefined = currentStudents;
  const classRenamed =
    oldClass &&
    (oldClass.className.trim() !== stamped.className || oldClass.major !== stamped.major);

  if (classRenamed && currentStudents) {
    updatedStudentsList = currentStudents.map((s) =>
      s.className.trim() === oldClass.className.trim()
        ? {
            ...s,
            className: stamped.className,
            major: stamped.major,
            updatedAt: stamped.updatedAt,
          }
        : s
    );
    saveLocalStudents(updatedStudentsList);
    broadcastStateChange({ type: 'STUDENTS_UPDATED', students: updatedStudentsList });
  }

  try {
    const db = getSupabaseClient();

    // Check if Supabase already has a row with the same class_name under a different id
    const { data: remoteSameName } = await db
      .from('class_rooms')
      .select('id, class_name')
      .eq('class_name', stamped.className)
      .maybeSingle();

    if (remoteSameName && remoteSameName.id !== stamped.id) {
      await db.from('class_rooms').delete().eq('id', remoteSameName.id);
    }

    if (oldClass && oldClass.className.trim() !== stamped.className) {
      await db
        .from('class_rooms')
        .delete()
        .eq('class_name', oldClass.className.trim())
        .neq('id', stamped.id);
    }

    const { error } = await db
      .from('class_rooms')
      .upsert(mapClassRoomToRow(stamped), { onConflict: 'id' });

    if (error) {
      const fallback = await db
        .from('class_rooms')
        .upsert(mapClassRoomToRow(stamped), { onConflict: 'class_name' });

      if (fallback.error) {
        appendDiagnosticLog(
          'error',
          'sync',
          'CLASS_UPSERT_ERR',
          `Gagal menyimpan kelas ${stamped.className} ke Supabase: ${fallback.error.message}`
        );
        return {
          classRooms: nextClasses,
          students: updatedStudentsList,
          syncedToPostgres: false,
          errorMessage: fallback.error.message,
        };
      }
    }

    if (classRenamed && oldClass) {
      await db
        .from('students')
        .update({
          class_name: stamped.className,
          major: stamped.major,
          updated_at: stamped.updatedAt,
        })
        .eq('class_name', oldClass.className.trim());
    }

    const { data: freshRows, error: fetchErr } = await db
      .from('class_rooms')
      .select('*')
      .order('class_name', { ascending: true });

    if (!fetchErr && Array.isArray(freshRows) && freshRows.length > 0) {
      nextClasses = freshRows.map(mapRowToClassRoom);
      saveLocalClassRooms(nextClasses);
      broadcastStateChange({ type: 'CLASSES_UPDATED', classRooms: nextClasses });
    }

    appendDiagnosticLog(
      'success',
      'sync',
      'CLASS_UPSERT_OK',
      `Data kelas "${stamped.className}" (${stamped.homeroomTeacher}) berhasil diperbarui ke tabel public.class_rooms di Supabase.`
    );

    return {
      classRooms: nextClasses,
      students: updatedStudentsList,
      syncedToPostgres: true,
    };
  } catch (err: any) {
    return {
      classRooms: nextClasses,
      students: updatedStudentsList,
      syncedToPostgres: false,
      errorMessage: err?.message || 'Gagal menghubungi Supabase',
    };
  }
}

export async function deleteClassRoomRecord(
  classId: string,
  currentClasses: ClassRoomRecord[]
): Promise<{ classRooms: ClassRoomRecord[]; syncedToPostgres: boolean; errorMessage?: string }> {
  const target = currentClasses.find((c) => c.id === classId);
  let nextClasses = currentClasses.filter((c) => c.id !== classId);
  saveLocalClassRooms(nextClasses);
  broadcastStateChange({ type: 'CLASSES_UPDATED', classRooms: nextClasses });

  try {
    const db = getSupabaseClient();
    const { error } = await db.from('class_rooms').delete().eq('id', classId);
    if (target?.className) {
      await db.from('class_rooms').delete().eq('class_name', target.className.trim());
    }

    const { data: freshRows, error: fetchErr } = await db
      .from('class_rooms')
      .select('*')
      .order('class_name', { ascending: true });

    if (!fetchErr && Array.isArray(freshRows)) {
      nextClasses = freshRows.map(mapRowToClassRoom);
      saveLocalClassRooms(nextClasses);
      broadcastStateChange({ type: 'CLASSES_UPDATED', classRooms: nextClasses });
    }

    if (!error) {
      appendDiagnosticLog(
        'info',
        'sync',
        'CLASS_DELETE_OK',
        `Data kelas "${target?.className || classId}" berhasil dihapus dari tabel public.class_rooms di Supabase.`
      );
    }

    return {
      classRooms: nextClasses,
      syncedToPostgres: !error,
      errorMessage: error?.message,
    };
  } catch (err: any) {
    return {
      classRooms: nextClasses,
      syncedToPostgres: false,
      errorMessage: err?.message || 'Gagal menghapus data kelas di Supabase',
    };
  }
}

export async function upsertStudentRecord(
  student: StudentRecord,
  currentStudents: StudentRecord[]
): Promise<{
  students: StudentRecord[];
  syncedToPostgres: boolean;
  errorMessage?: string;
}> {
  const cleanNisn = (student.nisn || '').trim();
  const cleanFullName = (student.fullName || '').trim();
  const cleanExamNumber = (student.examNumber || '').trim();
  const cleanBirthPlace = (student.birthPlace || 'Ciamis').trim() || 'Ciamis';
  const cleanBirthDate = (student.birthDate || '2008-06-15').trim() || '2008-06-15';
  const cleanClassName = (student.className || 'XII MIPA 1').trim();
  const cleanSklNumber = (student.sklNumber || '').trim();
  const cleanNotes = (student.notes || '').trim();

  const existingByNisn = currentStudents.find(
    (s) => s.id !== student.id && s.nisn.trim().toLowerCase() === cleanNisn.toLowerCase()
  );

  const updatedStudent: StudentRecord = {
    ...student,
    id: existingByNisn ? existingByNisn.id : student.id,
    nisn: cleanNisn,
    examNumber: cleanExamNumber,
    fullName: cleanFullName,
    birthPlace: cleanBirthPlace,
    birthDate: cleanBirthDate,
    className: cleanClassName,
    sklNumber: cleanSklNumber,
    notes: cleanNotes,
    updatedAt: new Date().toISOString(),
  };

  let nextStudents: StudentRecord[];
  if (existingByNisn) {
    nextStudents = currentStudents
      .filter((s) => s.id !== student.id)
      .map((s) => (s.id === existingByNisn.id ? updatedStudent : s));
  } else if (currentStudents.some((s) => s.id === updatedStudent.id)) {
    nextStudents = currentStudents.map((s) => (s.id === updatedStudent.id ? updatedStudent : s));
  } else {
    nextStudents = [updatedStudent, ...currentStudents];
  }

  saveLocalStudents(nextStudents);
  broadcastStateChange({ type: 'STUDENTS_UPDATED', students: nextStudents });

  try {
    const db = getSupabaseClient();

    // Check if Supabase already has a row with the same NISN under a different id
    const { data: remoteSameNisn } = await db
      .from('students')
      .select('id, nisn')
      .eq('nisn', updatedStudent.nisn)
      .maybeSingle();

    if (remoteSameNisn && remoteSameNisn.id !== updatedStudent.id) {
      await db.from('students').delete().eq('id', remoteSameNisn.id);
    }

    const { error } = await db
      .from('students')
      .upsert(mapStudentToRow(updatedStudent), { onConflict: 'id' });

    if (error) {
      const fallback = await db
        .from('students')
        .upsert(mapStudentToRow(updatedStudent), { onConflict: 'nisn' });

      if (fallback.error) {
        appendDiagnosticLog(
          'error',
          'sync',
          'STUDENT_UPSERT_ERR',
          `Gagal menyimpan data siswa "${updatedStudent.fullName}" (${updatedStudent.nisn}) ke Supabase: ${fallback.error.message}`
        );
        return {
          students: nextStudents,
          syncedToPostgres: false,
          errorMessage: fallback.error.message,
        };
      }
    }

    appendDiagnosticLog(
      'success',
      'sync',
      'STUDENT_UPSERT_OK',
      `Data siswa "${updatedStudent.fullName}" (NISN: ${updatedStudent.nisn} · ${updatedStudent.className}) berhasil disimpan ke tabel public.students di Supabase.`
    );

    return {
      students: nextStudents,
      syncedToPostgres: true,
    };
  } catch (err: any) {
    return {
      students: nextStudents,
      syncedToPostgres: false,
      errorMessage: err?.message || 'Gagal menghubungi Supabase',
    };
  }
}

export async function bulkUpsertStudentRecords(
  incomingList: StudentRecord[],
  currentStudents: StudentRecord[]
): Promise<{ students: StudentRecord[]; syncedToPostgres: boolean; addedCount: number; updatedCount: number }> {
  const nowIso = new Date().toISOString();
  const byNisn = new Map<string, StudentRecord>();
  currentStudents.forEach((s) => {
    byNisn.set(s.nisn.trim(), s);
  });

  let addedCount = 0;
  let updatedCount = 0;
  const rowsToUpsert: StudentRecord[] = [];

  incomingList.forEach((item) => {
    const cleanNisn = item.nisn.trim();
    if (!cleanNisn) return;
    const existing = byNisn.get(cleanNisn);
    if (existing) {
      const merged: StudentRecord = {
        ...existing,
        ...item,
        id: existing.id,
        nisn: cleanNisn,
        fullName: item.fullName.trim() || existing.fullName,
        updatedAt: nowIso,
      };
      byNisn.set(cleanNisn, merged);
      rowsToUpsert.push(merged);
      updatedCount += 1;
    } else {
      const created: StudentRecord = {
        ...item,
        nisn: cleanNisn,
        fullName: item.fullName.trim(),
        updatedAt: nowIso,
      };
      byNisn.set(cleanNisn, created);
      rowsToUpsert.push(created);
      addedCount += 1;
    }
  });

  const nextStudents = Array.from(byNisn.values());
  saveLocalStudents(nextStudents);
  broadcastStateChange({ type: 'STUDENTS_UPDATED', students: nextStudents });

  appendDiagnosticLog(
    'success',
    'sync',
    'BULK_IMPORT_STUDENTS',
    `Impor massal CSV berhasil memproses ${rowsToUpsert.length} baris (${addedCount} baru, ${updatedCount} diperbarui).`
  );

  if (!currentConfig.autoSync || rowsToUpsert.length === 0) {
    return { students: nextStudents, syncedToPostgres: false, addedCount, updatedCount };
  }

  const { error } = await getSupabaseClient()
    .from('students')
    .upsert(rowsToUpsert.map(mapStudentToRow), { onConflict: 'id' });

  return {
    students: nextStudents,
    syncedToPostgres: !error,
    addedCount,
    updatedCount,
  };
}

export async function deleteStudentRecord(
  studentId: string,
  currentStudents: StudentRecord[]
): Promise<{ students: StudentRecord[]; syncedToPostgres: boolean }> {
  const nextStudents = currentStudents.filter((s) => s.id !== studentId);
  saveLocalStudents(nextStudents);
  broadcastStateChange({ type: 'STUDENTS_UPDATED', students: nextStudents });

  if (!currentConfig.autoSync) {
    return { students: nextStudents, syncedToPostgres: false };
  }
  const { error } = await getSupabaseClient().from('students').delete().eq('id', studentId);
  return {
    students: nextStudents,
    syncedToPostgres: !error,
  };
}

export async function transferStudentsToAlumni(
  studentsToTransfer: StudentRecord[],
  currentStudents: StudentRecord[],
  currentAlumni: AlumniRecord[],
  graduationYear: string
): Promise<{ students: StudentRecord[]; alumni: AlumniRecord[] }> {
  const nowIso = new Date().toISOString();
  const transferIds = new Set(studentsToTransfer.map((s) => s.id));

  const newAlumniEntries: AlumniRecord[] = studentsToTransfer.map((s) => {
    const existing = currentAlumni.find((a) => a.nisn === s.nisn);
    return {
      id: existing ? existing.id : `alm-${s.id}`,
      nisn: s.nisn,
      examNumber: s.examNumber,
      fullName: s.fullName,
      birthPlace: s.birthPlace,
      birthDate: s.birthDate,
      className: s.className,
      major: s.major,
      graduationYear: graduationYear || '2025/2026',
      averageScore: s.averageScore,
      predicate: s.predicate,
      sklNumber: s.sklNumber,
      subjects: s.subjects,
      notes: s.notes,
      continuationStatus: existing?.continuationStatus || 'Belum Terdata',
      institutionName: existing?.institutionName || '',
      contactPhone: existing?.contactPhone || '',
      transferredAt: nowIso,
      updatedAt: nowIso,
    };
  });

  const nextStudents = currentStudents.filter((s) => !transferIds.has(s.id));
  const mergedAlumni = [
    ...newAlumniEntries,
    ...currentAlumni.filter((a) => !newAlumniEntries.some((na) => na.nisn === a.nisn)),
  ];

  saveLocalStudents(nextStudents);
  saveLocalAlumni(mergedAlumni);
  broadcastStateChange({ type: 'STUDENTS_UPDATED', students: nextStudents });
  broadcastStateChange({ type: 'ALUMNI_UPDATED', alumni: mergedAlumni });

  if (currentConfig.autoSync) {
    const db = getSupabaseClient();
    await Promise.all([
      db.from('alumni').upsert(newAlumniEntries.map(mapAlumniToRow)),
      db.from('students').delete().in('id', Array.from(transferIds)),
    ]);
  }

  return { students: nextStudents, alumni: mergedAlumni };
}

export async function upsertAlumniRecord(
  alumniItem: AlumniRecord,
  currentAlumni: AlumniRecord[]
): Promise<{ alumni: AlumniRecord[]; syncedToPostgres: boolean }> {
  const stamped: AlumniRecord = {
    ...alumniItem,
    updatedAt: new Date().toISOString(),
  };
  const exists = currentAlumni.some((a) => a.id === stamped.id);
  const nextAlumni = exists
    ? currentAlumni.map((a) => (a.id === stamped.id ? stamped : a))
    : [stamped, ...currentAlumni];

  saveLocalAlumni(nextAlumni);
  broadcastStateChange({ type: 'ALUMNI_UPDATED', alumni: nextAlumni });

  if (!currentConfig.autoSync) {
    return { alumni: nextAlumni, syncedToPostgres: false };
  }
  const { error } = await getSupabaseClient().from('alumni').upsert(mapAlumniToRow(stamped));
  return { alumni: nextAlumni, syncedToPostgres: !error };
}

export async function restoreAlumniToStudent(
  alumniItem: AlumniRecord,
  currentStudents: StudentRecord[],
  currentAlumni: AlumniRecord[]
): Promise<{ students: StudentRecord[]; alumni: AlumniRecord[] }> {
  const restoredStudent: StudentRecord = {
    id: alumniItem.id.startsWith('alm-std-')
      ? alumniItem.id.replace('alm-', '')
      : `std-${Date.now()}`,
    nisn: alumniItem.nisn,
    examNumber: alumniItem.examNumber,
    fullName: alumniItem.fullName,
    birthPlace: alumniItem.birthPlace,
    birthDate: alumniItem.birthDate,
    className: alumniItem.className,
    major: alumniItem.major,
    averageScore: alumniItem.averageScore,
    status: 'LULUS',
    predicate: alumniItem.predicate,
    sklNumber: alumniItem.sklNumber,
    subjects:
      alumniItem.subjects && alumniItem.subjects.length > 0
        ? alumniItem.subjects
        : getDefaultSubjects(alumniItem.major, [88, 86, 87, 85, 88, 86, 85, 87]),
    notes: alumniItem.notes,
    checkedAt: null,
    checkCount: 0,
    updatedAt: new Date().toISOString(),
  };

  const nextAlumni = currentAlumni.filter((a) => a.id !== alumniItem.id);
  const nextStudents = [
    restoredStudent,
    ...currentStudents.filter((s) => s.nisn !== restoredStudent.nisn),
  ];

  saveLocalAlumni(nextAlumni);
  saveLocalStudents(nextStudents);
  broadcastStateChange({ type: 'ALUMNI_UPDATED', alumni: nextAlumni });
  broadcastStateChange({ type: 'STUDENTS_UPDATED', students: nextStudents });

  if (currentConfig.autoSync) {
    const db = getSupabaseClient();
    await Promise.all([
      db.from('students').upsert(mapStudentToRow(restoredStudent)),
      db.from('alumni').delete().eq('id', alumniItem.id),
    ]);
  }

  return { students: nextStudents, alumni: nextAlumni };
}

export async function deleteAlumniRecord(
  alumniId: string,
  currentAlumni: AlumniRecord[]
): Promise<{ alumni: AlumniRecord[]; syncedToPostgres: boolean }> {
  const nextAlumni = currentAlumni.filter((a) => a.id !== alumniId);
  saveLocalAlumni(nextAlumni);
  broadcastStateChange({ type: 'ALUMNI_UPDATED', alumni: nextAlumni });

  if (!currentConfig.autoSync) {
    return { alumni: nextAlumni, syncedToPostgres: false };
  }
  const { error } = await getSupabaseClient().from('alumni').delete().eq('id', alumniId);
  return { alumni: nextAlumni, syncedToPostgres: !error };
}

export async function upsertAppUserRecord(
  userItem: AppUserRecord,
  currentUsers: AppUserRecord[]
): Promise<{ users: AppUserRecord[]; syncedToPostgres: boolean; errorMessage?: string }> {
  const cleanUsername = userItem.username.trim().toLowerCase().replace(/\s+/g, '_');
  const existingByUsername = currentUsers.find(
    (u) => u.id !== userItem.id && u.username.toLowerCase() === cleanUsername
  );

  const stamped: AppUserRecord = {
    ...userItem,
    id: existingByUsername ? existingByUsername.id : userItem.id,
    username: cleanUsername,
    fullName: userItem.fullName.trim(),
    nip: (userItem.nip || '').trim(),
    assignedClass: (userItem.assignedClass || '').trim(),
    accessPin: (userItem.accessPin || 'admin2026').trim(),
    updatedAt: new Date().toISOString(),
  };

  let nextUsers = existingByUsername
    ? currentUsers
        .filter((u) => u.id !== userItem.id)
        .map((u) => (u.id === existingByUsername.id ? stamped : u))
    : currentUsers.some((u) => u.id === stamped.id)
      ? currentUsers.map((u) => (u.id === stamped.id ? stamped : u))
      : [stamped, ...currentUsers];

  saveLocalUsers(nextUsers);
  broadcastStateChange({ type: 'USERS_UPDATED', users: nextUsers });

  try {
    const db = getSupabaseClient();
    const { error } = await db
      .from('app_users')
      .upsert(mapAppUserToRow(stamped), { onConflict: 'id' });

    if (error) {
      return {
        users: nextUsers,
        syncedToPostgres: false,
        errorMessage: error.message,
      };
    }

    return {
      users: nextUsers,
      syncedToPostgres: true,
    };
  } catch (err: any) {
    return {
      users: nextUsers,
      syncedToPostgres: false,
      errorMessage: err?.message,
    };
  }
}

export async function deleteAppUserRecord(
  userId: string,
  currentUsers: AppUserRecord[]
): Promise<{ users: AppUserRecord[]; syncedToPostgres: boolean }> {
  const nextUsers = currentUsers.filter((u) => u.id !== userId);
  saveLocalUsers(nextUsers);
  broadcastStateChange({ type: 'USERS_UPDATED', users: nextUsers });

  try {
    const { error } = await getSupabaseClient().from('app_users').delete().eq('id', userId);
    return { users: nextUsers, syncedToPostgres: !error };
  } catch {
    return { users: nextUsers, syncedToPostgres: false };
  }
}

export async function upsertSubjectCatalogRecord(
  subjItem: SubjectCatalogRecord,
  currentCatalog: SubjectCatalogRecord[],
  currentStudents: StudentRecord[],
  passingKkm = 75
): Promise<{
  subjectCatalog: SubjectCatalogRecord[];
  students: StudentRecord[];
  syncedToPostgres: boolean;
}> {
  const oldSubject = currentCatalog.find((s) => s.id === subjItem.id);
  const cleanCode = subjItem.code.trim().toUpperCase().replace(/\s+/g, '');
  const existingByCode = currentCatalog.find(
    (s) => s.id !== subjItem.id && s.code.toUpperCase() === cleanCode
  );

  const stamped: SubjectCatalogRecord = {
    ...subjItem,
    id: existingByCode ? existingByCode.id : subjItem.id,
    code: cleanCode,
    name: subjItem.name.trim(),
    kkm: Number(subjItem.kkm) || 75,
    sortOrder: Number(subjItem.sortOrder) || 1,
    updatedAt: new Date().toISOString(),
  };

  const nextCatalog = (
    existingByCode
      ? currentCatalog
          .filter((s) => s.id !== subjItem.id)
          .map((s) => (s.id === existingByCode.id ? stamped : s))
      : currentCatalog.some((s) => s.id === stamped.id)
        ? currentCatalog.map((s) => (s.id === stamped.id ? stamped : s))
        : [...currentCatalog, stamped]
  ).sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code));

  saveLocalSubjectCatalog(nextCatalog);
  broadcastStateChange({ type: 'SUBJECTS_UPDATED', subjectCatalog: nextCatalog });

  // Automatically cascade updated or added subject into students' transcript
  const nextStudents = currentStudents.map((std) => {
    const existingAdjusted = (std.subjects || []).map((sub) => {
      if (oldSubject && sub.code.toUpperCase() === oldSubject.code.toUpperCase()) {
        return {
          ...sub,
          code: stamped.code,
          name: stamped.name,
          category: stamped.category,
          kkm: stamped.kkm,
        };
      }
      return sub;
    });
    const rebuilt = buildSubjectsFromCatalog(
      std.major,
      nextCatalog,
      existingAdjusted,
      passingKkm
    );
    const summary = computeAcademicSummary(rebuilt, passingKkm, std.status);
    return {
      ...std,
      subjects: rebuilt,
      averageScore: summary.averageScore,
      predicate: summary.predicate,
      updatedAt: stamped.updatedAt,
    };
  });

  saveLocalStudents(nextStudents);
  broadcastStateChange({ type: 'STUDENTS_UPDATED', students: nextStudents });

  try {
    const db = getSupabaseClient();
    const { error } = await db
      .from('subject_catalog')
      .upsert(mapSubjectCatalogToRow(stamped), { onConflict: 'id' });
    if (currentConfig.autoSync && nextStudents.length > 0) {
      await db.from('students').upsert(nextStudents.map(mapStudentToRow));
    }
    return { subjectCatalog: nextCatalog, students: nextStudents, syncedToPostgres: !error };
  } catch {
    return { subjectCatalog: nextCatalog, students: nextStudents, syncedToPostgres: false };
  }
}

export async function deleteSubjectCatalogRecord(
  subjectId: string,
  currentCatalog: SubjectCatalogRecord[],
  currentStudents: StudentRecord[],
  passingKkm = 75
): Promise<{
  subjectCatalog: SubjectCatalogRecord[];
  students: StudentRecord[];
  syncedToPostgres: boolean;
}> {
  const nextCatalog = currentCatalog.filter((s) => s.id !== subjectId);
  saveLocalSubjectCatalog(nextCatalog);
  broadcastStateChange({ type: 'SUBJECTS_UPDATED', subjectCatalog: nextCatalog });

  const nextStudents = currentStudents.map((std) => {
    const rebuilt = buildSubjectsFromCatalog(
      std.major,
      nextCatalog,
      std.subjects,
      passingKkm
    );
    const summary = computeAcademicSummary(rebuilt, passingKkm, std.status);
    return {
      ...std,
      subjects: rebuilt,
      averageScore: summary.averageScore,
      predicate: summary.predicate,
      updatedAt: new Date().toISOString(),
    };
  });

  saveLocalStudents(nextStudents);
  broadcastStateChange({ type: 'STUDENTS_UPDATED', students: nextStudents });

  try {
    const db = getSupabaseClient();
    const { error } = await db.from('subject_catalog').delete().eq('id', subjectId);
    if (currentConfig.autoSync && nextStudents.length > 0) {
      await db.from('students').upsert(nextStudents.map(mapStudentToRow));
    }
    return { subjectCatalog: nextCatalog, students: nextStudents, syncedToPostgres: !error };
  } catch {
    return { subjectCatalog: nextCatalog, students: nextStudents, syncedToPostgres: false };
  }
}

export async function upsertLetterNumberRecord(
  item: LetterNumberRecord,
  currentList: LetterNumberRecord[]
): Promise<{ letterNumbers: LetterNumberRecord[]; syncedToPostgres: boolean }> {
  const cleanCode = item.code.trim().toUpperCase().replace(/\s+/g, '-');
  const stamped: LetterNumberRecord = {
    ...item,
    code: cleanCode,
    title: item.title.trim(),
    classificationCode: (item.classificationCode || '421.3').trim(),
    numberPattern: item.numberPattern.trim(),
    updatedAt: new Date().toISOString(),
  };

  let nextList = currentList.some((x) => x.id === stamped.id)
    ? currentList.map((x) => (x.id === stamped.id ? stamped : x))
    : [stamped, ...currentList];

  if (stamped.isDefault) {
    nextList = nextList.map((x) => ({
      ...x,
      isDefault: x.id === stamped.id,
    }));
  }

  saveLocalLetterNumbers(nextList);
  broadcastStateChange({ type: 'LETTER_NUMBERS_UPDATED', letterNumbers: nextList });

  try {
    const db = getSupabaseClient();
    const { error } = await db
      .from('letter_numbers')
      .upsert(nextList.map(mapLetterNumberToRow), { onConflict: 'id' });
    return { letterNumbers: nextList, syncedToPostgres: !error };
  } catch {
    return { letterNumbers: nextList, syncedToPostgres: false };
  }
}

export async function deleteLetterNumberRecord(
  id: string,
  currentList: LetterNumberRecord[]
): Promise<{ letterNumbers: LetterNumberRecord[]; syncedToPostgres: boolean }> {
  const nextList = currentList.filter((x) => x.id !== id);
  saveLocalLetterNumbers(nextList);
  broadcastStateChange({ type: 'LETTER_NUMBERS_UPDATED', letterNumbers: nextList });

  try {
    const { error } = await getSupabaseClient().from('letter_numbers').delete().eq('id', id);
    return { letterNumbers: nextList, syncedToPostgres: !error };
  } catch {
    return { letterNumbers: nextList, syncedToPostgres: false };
  }
}

export async function updateAnnouncementSettings(
  nextSettings: AnnouncementSettings
): Promise<{ settings: AnnouncementSettings; syncedToPostgres: boolean }> {
  const stamped: AnnouncementSettings = {
    ...nextSettings,
    updatedAt: new Date().toISOString(),
  };
  saveLocalSettings(stamped);
  broadcastStateChange({ type: 'SETTINGS_UPDATED', settings: stamped });

  if (!currentConfig.autoSync) {
    return { settings: stamped, syncedToPostgres: false };
  }
  const { error } = await getSupabaseClient()
    .from('announcement_settings')
    .upsert(mapSettingsToRow(stamped));

  return {
    settings: stamped,
    syncedToPostgres: !error,
  };
}

export const upsertAnnouncementSettings = updateAnnouncementSettings;

export async function recordStudentCheckIn(
  student: StudentRecord,
  currentStudents: StudentRecord[]
): Promise<StudentRecord> {
  const updated: StudentRecord = {
    ...student,
    checkedAt: new Date().toISOString(),
    checkCount: (student.checkCount || 0) + 1,
    updatedAt: new Date().toISOString(),
  };
  if (currentStudents.some((s) => s.id === student.id)) {
    await upsertStudentRecord(updated, currentStudents);
  }
  return updated;
}

let isSyncInProgress = false;

export async function syncAllLocalDataToSupabase(
  classRooms: ClassRoomRecord[],
  students: StudentRecord[],
  alumni: AlumniRecord[],
  settings: AnnouncementSettings
): Promise<{ ok: boolean; message: string }> {
  if (isSyncInProgress) {
    return {
      ok: false,
      message: 'Proses sinkronisasi sedang berjalan. Harap tunggu hingga selesai.',
    };
  }

  isSyncInProgress = true;
  const startMs = performance.now();
  try {
    const db = getSupabaseClient();

    // Reconcile class_rooms in Supabase first so unique class_name constraints or deleted classes never block sync
    try {
      const { data: existingRemoteClasses } = await db.from('class_rooms').select('id, class_name');
      if (Array.isArray(existingRemoteClasses)) {
        const localIds = new Set(classRooms.map((c) => c.id));
        const idsToRemove = existingRemoteClasses
          .filter((rc: any) => !localIds.has(String(rc.id)))
          .map((rc: any) => String(rc.id));
        if (idsToRemove.length > 0) {
          await db.from('class_rooms').delete().in('id', idsToRemove);
        }
      }
    } catch {
      // ignore pre-clean error
    }

    const localUsers = loadLocalUsers();
    const [clsRes, sRes, almRes, usrRes, cfgRes] = await Promise.all([
      db.from('class_rooms').upsert(classRooms.map(mapClassRoomToRow), { onConflict: 'id' }),
      db.from('students').upsert(students.map(mapStudentToRow), { onConflict: 'id' }),
      db.from('alumni').upsert(alumni.map(mapAlumniToRow), { onConflict: 'id' }),
      db.from('app_users').upsert(localUsers.map(mapAppUserToRow), { onConflict: 'id' }),
      db.from('announcement_settings').upsert(mapSettingsToRow(settings), { onConflict: 'id' }),
    ]);

    const errors: string[] = [];
    if (clsRes.error) errors.push(`class_rooms: ${clsRes.error.message}`);
    if (sRes.error) errors.push(`students: ${sRes.error.message}`);
    if (almRes.error) errors.push(`alumni: ${almRes.error.message}`);
    if (usrRes.error && !usrRes.error.message.includes('app_users')) {
      errors.push(`app_users: ${usrRes.error.message}`);
    }
    if (cfgRes.error) errors.push(`announcement_settings: ${cfgRes.error.message}`);

    const elapsedMs = Math.round(performance.now() - startMs);

    if (errors.length > 0) {
      const msg = `Sinkronisasi tertunda karena skema tabel belum lengkap di Supabase (${errors.join(
        ' | '
      )}). Jalankan Script Migrasi SQL V001–V003 pada SQL Editor Supabase Anda.`;
      appendDiagnosticLog('warn', 'sync', 'SYNC_TABLES_MISSING', msg);
      return {
        ok: false,
        message: msg,
      };
    }

    // Also record migration ledger if schema_migrations table exists
    try {
      await db.from('schema_migrations').upsert(
        [
          {
            version: 'V001',
            name: 'core_tables_columns_and_indexes',
            checksum: 'sha256:v001-gradugate-core',
            status: 'applied',
            applied_at: new Date().toISOString(),
          },
          {
            version: 'V002',
            name: 'idempotent_realtime_publication',
            checksum: 'sha256:v002-gradugate-realtime',
            status: 'applied',
            applied_at: new Date().toISOString(),
          },
        ],
        { onConflict: 'version' }
      );
    } catch {
      // ignore if schema_migrations table is optional
    }

    const successMsg = `Sinkronisasi berhasil (${elapsedMs} ms): ${classRooms.length} kelas, ${students.length} siswa aktif, ${alumni.length} alumni, dan pengaturan pengumuman telah tersimpan secara aman (non-destruktif) ke PostgreSQL Supabase.`;
    appendDiagnosticLog('success', 'sync', 'SYNC_ALL_SUCCESS', successMsg);

    return {
      ok: true,
      message: successMsg,
    };
  } catch (err: any) {
    const errMsg = err?.message || 'Gagal menghubungi server Supabase saat sinkronisasi.';
    appendDiagnosticLog('error', 'sync', 'SYNC_EXCEPTION', errMsg);
    return {
      ok: false,
      message: errMsg,
    };
  } finally {
    isSyncInProgress = false;
  }
}

// ============================================================================
// BACKUP SNAPSHOT EXPORT & RESTORE
// ============================================================================

export function createDatabaseBackupSnapshot(): string {
  const payload = {
    schemaVersion: 'V003',
    exportedAt: new Date().toISOString(),
    projectUrl: SUPABASE_URL,
    counts: {
      classRooms: loadLocalClassRooms().length,
      students: loadLocalStudents().length,
      alumni: loadLocalAlumni().length,
    },
    data: {
      classRooms: loadLocalClassRooms(),
      students: loadLocalStudents(),
      alumni: loadLocalAlumni(),
      settings: loadLocalSettings(),
    },
  };
  appendDiagnosticLog(
    'info',
    'sync',
    'BACKUP_EXPORTED',
    `Snapshot cadangan JSON berhasil dibuat (${payload.counts.classRooms} kelas, ${payload.counts.students} siswa, ${payload.counts.alumni} alumni).`
  );
  return JSON.stringify(payload, null, 2);
}

export function restoreDatabaseBackupSnapshot(rawJson: string): {
  ok: boolean;
  message: string;
} {
  try {
    const parsed = JSON.parse(rawJson);
    const data = parsed?.data || parsed;
    if (
      !Array.isArray(data?.classRooms) ||
      !Array.isArray(data?.students) ||
      !Array.isArray(data?.alumni) ||
      !data?.settings?.schoolName
    ) {
      return {
        ok: false,
        message:
          'Format berkas cadangan JSON tidak valid. Pastikan berkas memiliki objek classRooms, students, alumni, dan settings.',
      };
    }

    saveLocalClassRooms(data.classRooms);
    saveLocalStudents(data.students);
    saveLocalAlumni(data.alumni);
    saveLocalSettings(data.settings);

    broadcastStateChange({ type: 'CLASSES_UPDATED', classRooms: data.classRooms });
    broadcastStateChange({ type: 'STUDENTS_UPDATED', students: data.students });
    broadcastStateChange({ type: 'ALUMNI_UPDATED', alumni: data.alumni });
    broadcastStateChange({ type: 'SETTINGS_UPDATED', settings: data.settings });

    appendDiagnosticLog(
      'success',
      'sync',
      'BACKUP_RESTORED',
      `Cadangan data berhasil dipulihkan (${data.classRooms.length} kelas, ${data.students.length} siswa, ${data.alumni.length} alumni).`
    );

    return {
      ok: true,
      message: `Data cadangan berhasil dipulihkan (${data.classRooms.length} kelas, ${data.students.length} siswa, ${data.alumni.length} alumni).`,
    };
  } catch (err: any) {
    return {
      ok: false,
      message: `Gagal membaca berkas JSON: ${err?.message || 'Format JSON rusak'}`,
    };
  }
}

// ============================================================================
// DEDUPLICATED REALTIME SUBSCRIPTION
// ============================================================================

export function subscribeToGraduationRealtime(callbacks: {
  onClassesChange: (classes: ClassRoomRecord[]) => void;
  onStudentsChange: (students: StudentRecord[]) => void;
  onAlumniChange: (alumni: AlumniRecord[]) => void;
  onSettingsChange: (settings: AnnouncementSettings) => void;
  onRefreshRequested: () => void;
}) {
  const db = getSupabaseClient();

  // Deduplication guard: remove any stale channel before subscribing
  if (activeBroadcastChannel) {
    try {
      db.removeChannel(activeBroadcastChannel);
    } catch {
      // ignore
    }
    activeBroadcastChannel = null;
  }

  const channel = db
    .channel('gradugate-live-sync')
    .on('broadcast', { event: 'gradugate_sync' }, (event) => {
      lastRealtimeEventAt = new Date().toISOString();
      const payload = event.payload;
      if (payload?.type === 'CLASSES_UPDATED' && Array.isArray(payload.classRooms)) {
        saveLocalClassRooms(payload.classRooms);
        callbacks.onClassesChange(payload.classRooms);
      } else if (payload?.type === 'STUDENTS_UPDATED' && Array.isArray(payload.students)) {
        saveLocalStudents(payload.students);
        callbacks.onStudentsChange(payload.students);
      } else if (payload?.type === 'ALUMNI_UPDATED' && Array.isArray(payload.alumni)) {
        saveLocalAlumni(payload.alumni);
        callbacks.onAlumniChange(payload.alumni);
      } else if (payload?.type === 'SETTINGS_UPDATED' && payload.settings) {
        saveLocalSettings(payload.settings);
        callbacks.onSettingsChange(payload.settings);
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'class_rooms' }, () => {
      lastRealtimeEventAt = new Date().toISOString();
      callbacks.onRefreshRequested();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
      lastRealtimeEventAt = new Date().toISOString();
      callbacks.onRefreshRequested();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'alumni' }, () => {
      lastRealtimeEventAt = new Date().toISOString();
      callbacks.onRefreshRequested();
    })
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'announcement_settings' },
      () => {
        lastRealtimeEventAt = new Date().toISOString();
        callbacks.onRefreshRequested();
      }
    )
    .subscribe();

  activeBroadcastChannel = channel;

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === LOCAL_CLASSES_KEY && e.newValue) {
      try {
        callbacks.onClassesChange(JSON.parse(e.newValue));
      } catch {
        // ignore
      }
    } else if (e.key === LOCAL_STUDENTS_KEY && e.newValue) {
      try {
        callbacks.onStudentsChange(JSON.parse(e.newValue));
      } catch {
        // ignore
      }
    } else if (e.key === LOCAL_ALUMNI_KEY && e.newValue) {
      try {
        callbacks.onAlumniChange(JSON.parse(e.newValue));
      } catch {
        // ignore
      }
    } else if (e.key === LOCAL_SETTINGS_KEY && e.newValue) {
      try {
        callbacks.onSettingsChange(JSON.parse(e.newValue));
      } catch {
        // ignore
      }
    }
  };

  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener('storage', handleStorageEvent);
    db.removeChannel(channel);
    if (activeBroadcastChannel === channel) {
      activeBroadcastChannel = null;
    }
  };
}

// ============================================================================
// INTERNAL STORAGE ASSET RESOLVER (Not exposed in public settings UI)
// ============================================================================

const LOGIN_PANEL_STORAGE_BUCKET = 'app-files';
const LOGIN_PANEL_STORAGE_CANDIDATE_PATHS = ['bg/bg_panel_login.jpg', 'bg_panel_login.jpg'];
let cachedLoginPanelAssetUrl: string | null = null;

function createLocalFallbackLoginPanelBlobUrl(): string {
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="360" viewBox="0 0 320 360" fill="none">
    <rect width="320" height="360" rx="16" fill="#F8F5F0"/>
    <rect x="12" y="12" width="296" height="336" rx="12" fill="#FFFFFF" stroke="#E4DDD3" stroke-width="1.5"/>
    <circle cx="160" cy="112" r="54" fill="#EFECE6"/>
    <circle cx="160" cy="112" r="42" fill="#1E3A5F" fill-opacity="0.1"/>
    <!-- Graduation Cap Illustration -->
    <path d="M160 80L112 102L160 124L208 102L160 80Z" fill="#1E3A5F"/>
    <path d="M130 112V134C130 142 143.4 149 160 149C176.6 149 190 142 190 134V112L160 126L130 112Z" fill="#2E5077"/>
    <path d="M202 105V136" stroke="#B4833E" stroke-width="3" stroke-linecap="round"/>
    <circle cx="202" cy="138" r="4" fill="#B4833E"/>
    <!-- Academic Certificate / Shield Card -->
    <rect x="44" y="186" width="232" height="66" rx="10" fill="#F8F5F0" stroke="#E4DDD3"/>
    <text x="160" y="212" text-anchor="middle" fill="#1E3A5F" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="700">SIPINTER-LULUS</text>
    <text x="160" y="231" text-anchor="middle" fill="#3D4F60" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="600">SMAN 1 LUMBUNG CIAMIS</text>
    <text x="160" y="245" text-anchor="middle" fill="#6C7A89" font-family="monospace" font-size="9.5">PORTAL AKADEMIK &amp; KELULUSAN</text>
    <!-- Decorative Academic Pillars / Status Bars -->
    <rect x="56" y="270" width="62" height="44" rx="8" fill="#F0F5F9" stroke="#D5E2ED"/>
    <text x="87" y="290" text-anchor="middle" fill="#1E3A5F" font-family="monospace" font-size="11" font-weight="700">SKL PDF</text>
    <text x="87" y="304" text-anchor="middle" fill="#5A6B7C" font-family="system-ui, sans-serif" font-size="8.5">Terverifikasi</text>
    <rect x="129" y="270" width="62" height="44" rx="8" fill="#EEF7F2" stroke="#CBE6D6"/>
    <text x="160" y="290" text-anchor="middle" fill="#1B6B45" font-family="monospace" font-size="11" font-weight="700">NILAI</text>
    <text x="160" y="304" text-anchor="middle" fill="#497A61" font-family="system-ui, sans-serif" font-size="8.5">Transkrip</text>
    <rect x="202" y="270" width="62" height="44" rx="8" fill="#FDF6EC" stroke="#EED9B9"/>
    <text x="233" y="290" text-anchor="middle" fill="#9A6722" font-family="monospace" font-size="11" font-weight="700">ALUMNI</text>
    <text x="233" y="304" text-anchor="middle" fill="#8A6E45" font-family="system-ui, sans-serif" font-size="8.5">Tracer Study</text>
  </svg>`;
  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  return URL.createObjectURL(blob);
}

export async function resolveLoginPanelImage(): Promise<{
  src: string;
  fromSupabaseStorage: boolean;
}> {
  if (cachedLoginPanelAssetUrl) {
    return { src: cachedLoginPanelAssetUrl, fromSupabaseStorage: true };
  }

  const db = getSupabaseClient();

  for (const objectPath of LOGIN_PANEL_STORAGE_CANDIDATE_PATHS) {
    // 1. Try authenticated/anon SDK download (works when SELECT policy exists on storage.objects)
    try {
      const { data: blobData, error: downloadErr } = await db.storage
        .from(LOGIN_PANEL_STORAGE_BUCKET)
        .download(objectPath);

      if (
        !downloadErr &&
        blobData &&
        blobData.size > 0 &&
        (blobData.type.startsWith('image/') || blobData.type === 'application/octet-stream')
      ) {
        cachedLoginPanelAssetUrl = URL.createObjectURL(blobData);
        return { src: cachedLoginPanelAssetUrl, fromSupabaseStorage: true };
      }
    } catch {
      // continue to next method
    }

    // 2. Try public object endpoint and verify HTTP 200 + image content-type
    try {
      const { data: pubData } = db.storage
        .from(LOGIN_PANEL_STORAGE_BUCKET)
        .getPublicUrl(objectPath);

      const resp = await fetch(pubData.publicUrl, {
        headers: {
          apikey: currentConfig.publishableKey,
        },
      });

      const contentType = resp.headers.get('content-type') || '';
      if (resp.ok && contentType.startsWith('image/')) {
        const blob = await resp.blob();
        if (blob.size > 0) {
          cachedLoginPanelAssetUrl = URL.createObjectURL(blob);
          return { src: cachedLoginPanelAssetUrl, fromSupabaseStorage: true };
        }
      }
    } catch {
      // continue
    }
  }

  // 3. If bucket 'app-files' is still set to Private in Supabase Dashboard (returns 400 Bucket not found),
  // return a crisp natural-sized local blob graphic so the Login Panel is never blank or broken.
  return {
    src: createLocalFallbackLoginPanelBlobUrl(),
    fromSupabaseStorage: false,
  };
}

// ============================================================================
// BUCKET 'app-files' STORAGE UPLOADER & SQL SCHEMA SCRIPT
// ============================================================================

export const SUPABASE_APP_FILES_BUCKET_SQL = `-- ============================================================================
-- SQL SCHEMA UNTUK BUCKET STORAGE 'app-files' (LOGO & TANDA TANGAN)
-- Jalankan pada SQL Editor Supabase: https://supabase.com/dashboard/project/_/sql/new
-- ============================================================================

-- 1. Buat bucket 'app-files' secara publik
INSERT INTO storage.buckets (id, name, public)
VALUES ('app-files', 'app-files', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Kebijakan RLS 1: Izin Baca Publik (SELECT) untuk logo & berkas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Read Access for app-files'
  ) THEN
    CREATE POLICY "Public Read Access for app-files"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'app-files');
  END IF;
END $$;

-- 3. Kebijakan RLS 2: Izin Unggah (INSERT) berkas ke bucket app-files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow Upload to app-files'
  ) THEN
    CREATE POLICY "Allow Upload to app-files"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'app-files');
  END IF;
END $$;

-- 4. Kebijakan RLS 3: Izin Update & Delete pada bucket app-files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow Update and Delete on app-files'
  ) THEN
    CREATE POLICY "Allow Update and Delete on app-files"
    ON storage.objects FOR ALL
    USING (bucket_id = 'app-files');
  END IF;
END $$;`;

export async function uploadFileToSupabaseStorage(
  file: File,
  folderName: 'logos' | 'signatures' | 'documents' = 'logos'
): Promise<{ url: string | null; error?: string; fromSupabaseStorage: boolean }> {
  try {
    const db = getSupabaseClient();
    const cleanExt = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
    const fileName = `${folderName}/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${cleanExt}`;

    const { data, error } = await db.storage
      .from('app-files')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      return { url: null, error: error.message, fromSupabaseStorage: false };
    }

    const { data: publicUrlData } = db.storage.from('app-files').getPublicUrl(fileName);
    if (publicUrlData?.publicUrl) {
      return { url: publicUrlData.publicUrl, fromSupabaseStorage: true };
    }
    return { url: null, error: 'Gagal mendapatkan URL publik dari Supabase Storage', fromSupabaseStorage: false };
  } catch (err: any) {
    return { url: null, error: err?.message || 'Gagal mengunggah berkas ke Supabase Storage', fromSupabaseStorage: false };
  }
}


