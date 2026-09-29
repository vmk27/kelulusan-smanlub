export type Major = 'MIPA' | 'IPS' | 'BHS' | 'UMM';

export interface SubjectScore {
  code: string;
  name: string;
  category: 'Umum' | 'Peminatan';
  score: number;
  kkm: number;
}

export interface SubjectCatalogRecord {
  id: string;
  code: string;
  name: string;
  category: 'Umum' | 'Peminatan';
  majorTarget: 'UMUM' | 'MIPA' | 'IPS' | 'BHS' | 'UMM';
  kkm: number;
  sortOrder: number;
  updatedAt: string;
}

export interface LetterNumberRecord {
  id: string;
  code: string;
  title: string;
  classificationCode: string;
  numberPattern: string;
  majorTarget: 'SEMUA' | 'MIPA' | 'IPS' | 'BHS' | 'UMM';
  academicYear: string;
  issueDate: string;
  startSequence: number;
  digitPadding: number;
  isDefault: boolean;
  notes: string;
  updatedAt: string;
}

export type GraduationStatus = 'LULUS' | 'TIDAK LULUS';

export type GraduationPredicate =
  | 'Dengan Pujian'
  | 'Sangat Memuaskan'
  | 'Memuaskan'
  | 'Belum Memenuhi Kriteria';

export type UserRole = 'admin' | 'guru' | 'wali_kelas';

export interface AppUserRecord {
  id: string;
  username: string;
  fullName: string;
  nip: string;
  role: UserRole;
  assignedClass: string;
  accessPin: string;
  isActive: boolean;
  updatedAt: string;
}

export interface ClassRoomRecord {
  id: string;
  className: string;
  major: Major;
  homeroomTeacher: string;
  homeroomNip: string;
  roomNumber: string;
  academicYear: string;
  updatedAt: string;
}

export interface StudentRecord {
  id: string;
  nisn: string;
  examNumber: string;
  fullName: string;
  birthPlace: string;
  birthDate: string; // YYYY-MM-DD
  className: string;
  major: Major;
  averageScore: number;
  status: GraduationStatus;
  predicate: GraduationPredicate;
  sklNumber: string;
  subjects: SubjectScore[];
  notes: string;
  checkedAt: string | null;
  checkCount: number;
  updatedAt: string;
}

export type AlumniContinuation =
  | 'PTN / PTS'
  | 'Kedinasan / TNI-Polri'
  | 'Bekerja / Wirausaha'
  | 'Belum Terdata';

export interface AlumniRecord {
  id: string;
  nisn: string;
  examNumber: string;
  fullName: string;
  birthPlace: string;
  birthDate: string;
  className: string;
  major: Major;
  graduationYear: string;
  averageScore: number;
  predicate: GraduationPredicate;
  sklNumber: string;
  subjects: SubjectScore[];
  notes: string;
  continuationStatus: AlumniContinuation;
  institutionName: string;
  contactPhone: string;
  transferredAt: string;
  updatedAt: string;
}

export interface AnnouncementSettings {
  id: string;
  schoolName: string;
  schoolNpsn: string;
  schoolAddress: string;
  provinceName: string;
  academicYear: string;
  principalName: string;
  principalNip: string;
  plenoDate: string;
  sklPrefix: string;
  passingGradeKkm: number;
  isPublished: boolean;
  announcementTime: string; // ISO string
  announcementNote: string;
  // Enhanced KOP Surat Configuration
  kopPemerintah?: string;
  kopDinas?: string;
  kopCabangDinas?: string;
  kopKodePos?: string;
  kopTelepon?: string;
  kopEmail?: string;
  kopWebsite?: string;
  kopLogoKiri?: string;
  kopLogoKanan?: string;
  kopBorderThickness?: 'standard_double' | 'thick_double' | 'single' | 'minimal';
  updatedAt: string;
}

export interface SupabaseConnectionConfig {
  projectUrl: string;
  publishableKey: string;
  autoSync: boolean;
}

export type SupabaseConnectionState = 'connected' | 'disconnected' | 'error';

export interface SupabaseSyncStatus {
  connected: boolean;
  connectionState?: SupabaseConnectionState;
  mode: 'postgres_table' | 'realtime_hybrid';
  projectUrl: string;
  autoSync: boolean;
  lastSyncedAt: string | null;
  tableHint?: string;
  latencyMs?: number;
}

export interface ColumnInspectionSpec {
  name: string;
  expectedType: string;
  actualType: string | null;
  nullable: boolean;
  isPrimaryKey?: boolean;
  isUnique?: boolean;
  description: string;
  status: 'ok' | 'missing' | 'type_mismatch';
}

export interface TableInspectionResult {
  tableName: string;
  entityName: string;
  description: string;
  existsInCloud: boolean;
  cloudRowCount: number | null;
  localRowCount: number;
  primaryKey: string;
  uniqueConstraints: string[];
  indexes: string[];
  realtimeEnabled: boolean;
  rlsVerified: boolean;
  columns: ColumnInspectionSpec[];
  missingColumns: string[];
  mismatchedColumns: string[];
  status: 'synchronized' | 'missing_table' | 'schema_drift' | 'error';
  errorMessage?: string;
}

export interface MigrationVersionItem {
  version: string;
  name: string;
  description: string;
  isDestructive: boolean;
  requiresManualSqlEditor: boolean;
  isIdempotent: boolean;
  status: 'applied' | 'pending' | 'manual_required';
  appliedAt: string | null;
  checksum: string;
  sql: string;
}

export interface RlsPolicyAuditItem {
  tableName: string;
  entityLabel: string;
  rlsEnabled: boolean;
  publicReadAllowed: boolean;
  publicWriteAllowed: boolean;
  selectPolicy: string;
  insertPolicy: string;
  updatePolicy: string;
  deletePolicy: string;
  riskLevel: 'secure' | 'moderate' | 'permissive_warning';
  recommendation: string;
}

export interface EnvironmentValidationReport {
  urlValid: boolean;
  urlHttps: boolean;
  urlHost: string;
  keyPresent: boolean;
  keyClassification: 'publishable_safe' | 'anon_jwt_safe' | 'privileged_secret_danger' | 'invalid';
  secretLeakDetected: boolean;
  maskedKey: string;
  usingEnvDefaultUrl: boolean;
  usingEnvDefaultKey: boolean;
  issues: string[];
  warnings: string[];
}

export interface DiagnosticLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warn' | 'error';
  category: 'connection' | 'schema' | 'migration' | 'security' | 'realtime' | 'sync';
  action: string;
  message: string;
  details?: string;
}

export interface SupabaseDatabaseAuditReport {
  checkedAt: string;
  connectionState: SupabaseConnectionState;
  httpStatus: number | null;
  latencyMs: number;
  postgrestVersion: string | null;
  statusMessage: string;
  envReport: EnvironmentValidationReport;
  tables: TableInspectionResult[];
  migrations: MigrationVersionItem[];
  rlsAudit: RlsPolicyAuditItem[];
  realtimeInfo: {
    channelName: string;
    channelState: 'joined' | 'closed' | 'errored' | 'initializing';
    subscribedTables: string[];
    duplicateRegistrationPrevented: boolean;
    lastEventAt: string | null;
  };
  allCoreTablesReady: boolean;
  hasSchemaDrift: boolean;
  missingTablesCount: number;
  missingColumnsCount: number;
}
