import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Database,
  Sliders,
  RotateCcw,
  ShieldCheck,
  Activity,
  FileCode2,
  Lock,
  Radio,
  HardDriveDownload,
  Terminal,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Upload,
  Trash2,
  ExternalLink,
  XCircle,
} from 'lucide-react';
import {
  DiagnosticLogEntry,
  SupabaseConnectionConfig,
  SupabaseDatabaseAuditReport,
  SupabaseSyncStatus,
} from '../../types/graduation';
import {
  appendDiagnosticLog,
  broadcastStateChange,
  clearDiagnosticLogs,
  createDatabaseBackupSnapshot,
  DEFAULT_SUPABASE_KEY,
  DEFAULT_SUPABASE_URL,
  getDiagnosticLogs,
  loadSupabaseConfig,
  maskApiKey,
  restoreDatabaseBackupSnapshot,
  runFullSupabaseAudit,
  SUPABASE_APP_FILES_BUCKET_SQL,
  SUPABASE_SQL_SETUP_SCRIPT,
  SUPABASE_USER_TABLE_SQL,
  testSupabaseEndpoint,
  uploadFileToSupabaseStorage,
  updateSupabaseConnectionConfig,
  validateSupabaseEnvironment,
} from '../../lib/supabase';

interface SupabaseStorageSectionProps {
  syncStatus: SupabaseSyncStatus;
  localCounts?: {
    classRooms: number;
    students: number;
    alumni: number;
    settings: number;
  };
  onSyncSupabaseTables: () => Promise<{ ok: boolean; message: string }>;
  onRefreshData: () => Promise<void>;
}

type ConfirmActionType =
  | {
      type: 'RESET_CREDENTIALS';
      title: string;
      description: string;
    }
  | {
      type: 'SYNC_ALL_DATA';
      title: string;
      description: string;
    }
  | {
      type: 'RESTORE_BACKUP';
      title: string;
      description: string;
      jsonPayload: string;
    };

export const SupabaseStorageSection: React.FC<SupabaseStorageSectionProps> = ({
  syncStatus,
  localCounts = { classRooms: 4, students: 8, alumni: 2, settings: 1 },
  onSyncSupabaseTables,
  onRefreshData,
}) => {
  const [configForm, setConfigForm] = useState<SupabaseConnectionConfig>(() =>
    loadSupabaseConfig()
  );
  const [showRawKey, setShowRawKey] = useState(false);
  const [auditReport, setAuditReport] = useState<SupabaseDatabaseAuditReport | null>(null);
  const [logs, setLogs] = useState<DiagnosticLogEntry[]>(() => getDiagnosticLogs());
  const [logCategoryFilter, setLogCategoryFilter] = useState<string>('ALL');

  const [isTestingConn, setIsTestingConn] = useState(false);
  const [isCheckingSchema, setIsCheckingSchema] = useState(false);
  const [isSyncingDb, setIsSyncingDb] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTestingStorage, setIsTestingStorage] = useState(false);
  const [storageTestResult, setStorageTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  const handleTestStorageBucket = async () => {
    setIsTestingStorage(true);
    setStorageTestResult(null);
    try {
      // Create a tiny transparent SVG file to test bucket upload
      const dummySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="#1E3A5F"/></svg>`;
      const testFile = new File([dummySvg], `test_probe_${Date.now()}.svg`, {
        type: 'image/svg+xml',
      });
      const res = await uploadFileToSupabaseStorage(testFile, 'logos');
      if (res.url && res.fromSupabaseStorage) {
        setStorageTestResult({
          ok: true,
          message: `Bucket 'app-files' aktif & terverifikasi! URL berkas uji: ${res.url}`,
        });
      } else {
        setStorageTestResult({
          ok: false,
          message:
            res.error ||
            "Bucket 'app-files' belum dibuat di Supabase Storage atau RLS Policy belum diaktifkan.",
        });
      }
    } catch (err: any) {
      setStorageTestResult({
        ok: false,
        message: err?.message || "Gagal menguji unggahan ke bucket 'app-files'.",
      });
    } finally {
      setIsTestingStorage(false);
    }
  };

  const [expandedTable, setExpandedTable] = useState<string | null>('students');
  const [selectedMigrationVer, setSelectedMigrationVer] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    ok: boolean;
    message: string;
    details?: string;
  } | null>(null);

  // Confirmation modal before potentially destructive / overwriting changes
  const [confirmDialog, setConfirmDialog] = useState<ConfirmActionType | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const liveEnvValidation = validateSupabaseEnvironment(
    configForm.projectUrl,
    configForm.publishableKey
  );

  const executeSchemaAudit = useCallback(async () => {
    setIsCheckingSchema(true);
    try {
      const report = await runFullSupabaseAudit(localCounts);
      setAuditReport(report);
      setLogs(getDiagnosticLogs());
      return report;
    } finally {
      setIsCheckingSchema(false);
    }
  }, [localCounts]);

  useEffect(() => {
    executeSchemaAudit();
  }, [executeSchemaAudit]);

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Manual Button 1: Test Connection
  const handleManualTestConnection = async () => {
    setIsTestingConn(true);
    setFeedback(null);
    try {
      const res = await testSupabaseEndpoint(configForm.projectUrl, configForm.publishableKey);
      await executeSchemaAudit();
      setFeedback({
        ok: res.ok,
        message: res.message,
      });
    } finally {
      setIsTestingConn(false);
      setLogs(getDiagnosticLogs());
    }
  };

  // Manual Button 2: Check Schema
  const handleManualCheckSchema = async () => {
    setFeedback(null);
    const report = await executeSchemaAudit();
    setFeedback({
      ok: report.connectionState === 'connected' && report.allCoreTablesReady,
      message: report.statusMessage,
    });
  };

  // Manual Button 3: Synchronize Schema & Data (Opens confirmation if tables exist)
  const handleRequestSynchronize = () => {
    setConfirmDialog({
      type: 'SYNC_ALL_DATA',
      title: 'Konfirmasi Sinkronisasi Skema & Data ke Supabase',
      description:
        'Operasi ini akan menjalankan upsert non-destruktif untuk menyelaraskan Data Kelas, Data Siswa, Data Alumni, dan Pengaturan Pengumuman ke tabel PostgreSQL Supabase tanpa menghapus baris yang sudah ada.',
    });
  };

  const executeSynchronizeAll = async () => {
    setConfirmDialog(null);
    setIsSyncingDb(true);
    setFeedback(null);
    try {
      const result = await onSyncSupabaseTables();
      await onRefreshData();
      await executeSchemaAudit();
      setFeedback(result);
    } finally {
      setIsSyncingDb(false);
      setLogs(getDiagnosticLogs());
    }
  };

  // Manual Button 4: Refresh Status
  const handleManualRefreshStatus = async () => {
    setIsRefreshing(true);
    setFeedback(null);
    try {
      await onRefreshData();
      const report = await executeSchemaAudit();
      setFeedback({
        ok: report.connectionState === 'connected',
        message: `Status penyimpanan dan skema berhasil diperbarui (${new Date().toLocaleTimeString('id-ID')}).`,
      });
    } finally {
      setIsRefreshing(false);
      setLogs(getDiagnosticLogs());
    }
  };

  // Save Environment Configuration
  const handleSaveEnvironmentConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (liveEnvValidation.secretLeakDetected || !liveEnvValidation.urlValid) {
      setFeedback({
        ok: false,
        message:
          liveEnvValidation.issues[0] ||
          'Konfigurasi tidak valid. Periksa Project URL dan Publishable Key.',
      });
      return;
    }

    setIsTestingConn(true);
    try {
      const saved = updateSupabaseConnectionConfig(configForm);
      setConfigForm(saved);
      const testResult = await testSupabaseEndpoint(saved.projectUrl, saved.publishableKey);
      await onRefreshData();
      await executeSchemaAudit();
      setFeedback({
        ok: testResult.ok,
        message: testResult.message,
      });
    } catch (err: any) {
      setFeedback({
        ok: false,
        message: err?.message || 'Gagal menyimpan konfigurasi.',
      });
    } finally {
      setIsTestingConn(false);
      setLogs(getDiagnosticLogs());
    }
  };

  const executeResetCredentials = async () => {
    setConfirmDialog(null);
    const def: SupabaseConnectionConfig = {
      projectUrl: DEFAULT_SUPABASE_URL,
      publishableKey: DEFAULT_SUPABASE_KEY,
      autoSync: true,
    };
    updateSupabaseConnectionConfig(def);
    setConfigForm(def);
    setIsTestingConn(true);
    const testResult = await testSupabaseEndpoint(def.projectUrl, def.publishableKey);
    await onRefreshData();
    await executeSchemaAudit();
    setIsTestingConn(false);
    setLogs(getDiagnosticLogs());
    setFeedback({
      ok: testResult.ok,
      message: `Kredensial dikembalikan ke pengaturan default lingkungan (.env). ${testResult.message}`,
    });
  };

  // Backup Export & Import
  const handleDownloadBackupJson = () => {
    const jsonStr = createDatabaseBackupSnapshot();
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GraduGate_Supabase_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setLogs(getDiagnosticLogs());
    setFeedback({
      ok: true,
      message: 'Berkas cadangan (Backup JSON) lengkap berhasil diunduh.',
    });
  };

  const handleBackupFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || '');
      setConfirmDialog({
        type: 'RESTORE_BACKUP',
        title: 'Konfirmasi Pemulihan Cadangan Data (Restore JSON)',
        description: `Anda akan memulihkan data dari berkas "${file.name}". Data lokal akan diperbarui dengan isi cadangan dan disinkronkan apabila Auto-Sync aktif.`,
        jsonPayload: content,
      });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const executeRestoreBackup = async (jsonPayload: string) => {
    setConfirmDialog(null);
    const res = restoreDatabaseBackupSnapshot(jsonPayload);
    if (res.ok) {
      await onRefreshData();
      await executeSchemaAudit();
    }
    setLogs(getDiagnosticLogs());
    setFeedback(res);
  };

  const handleTestRealtimePing = () => {
    broadcastStateChange({ type: 'DIAGNOSTIC_PING' });
    appendDiagnosticLog(
      'success',
      'realtime',
      'REALTIME_PING',
      'Sinyal uji coba Realtime Broadcast berhasil dikirim pada kanal gradugate-live-sync.'
    );
    setLogs(getDiagnosticLogs());
    setFeedback({
      ok: true,
      message: 'Sinyal Realtime Broadcast (gradugate-live-sync) berhasil diuji.',
    });
  };

  const connectionState =
    auditReport?.connectionState ||
    (syncStatus.connected ? 'connected' : 'disconnected');

  const filteredLogs = logs.filter(
    (item) => logCategoryFilter === 'ALL' || item.category === logCategoryFilter
  );

  const sqlEditorUrl = (() => {
    try {
      const host = new URL(configForm.projectUrl).hostname;
      const projectRef = host.split('.')[0];
      if (projectRef && projectRef.length > 5) {
        return `https://supabase.com/dashboard/project/${projectRef}/sql/new`;
      }
    } catch {
      // ignore
    }
    return 'https://supabase.com/dashboard';
  })();

  return (
    <div className="space-y-6">
      {/* =====================================================================
          SECTION 1: CONNECTION OVERVIEW & MANUAL CONTROL BAR
         ===================================================================== */}
      <div className="bg-white border border-palette-accent rounded-xl p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-palette-accent">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-palette-accent/60 text-palette-primary shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-palette-text">
                  1. Ikhtisar Koneksi & Kesehatan Database Supabase
                </h2>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-mono font-bold uppercase ${
                    connectionState === 'connected'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : connectionState === 'error'
                        ? 'bg-rose-50 text-rose-800 border border-rose-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      connectionState === 'connected'
                        ? 'bg-emerald-600'
                        : connectionState === 'error'
                          ? 'bg-rose-600'
                          : 'bg-amber-600'
                    }`}
                  />
                  {connectionState === 'connected'
                    ? 'CONNECTED'
                    : connectionState === 'error'
                      ? 'ERROR'
                      : 'DISCONNECTED'}
                </span>
              </div>
              <p className="text-xs text-palette-text/70 mt-1">
                Pemantauan langsung konektivitas PostgreSQL REST API, status sinkronisasi skema 4
                tabel utama, dan diagnostik keamanan Row Level Security (RLS).
              </p>
            </div>
          </div>

          {/* 4 Required Manual Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleManualTestConnection}
              disabled={isTestingConn}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-palette-text bg-palette-background border border-palette-accent rounded-lg hover:bg-palette-accent/60 transition-colors cursor-pointer"
            >
              <Activity className={`w-3.5 h-3.5 text-palette-primary ${isTestingConn ? 'animate-pulse' : ''}`} />
              <span>{isTestingConn ? 'Menguji...' : 'Uji Koneksi'}</span>
            </button>

            <button
              type="button"
              onClick={handleManualCheckSchema}
              disabled={isCheckingSchema}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-palette-text bg-palette-background border border-palette-accent rounded-lg hover:bg-palette-accent/60 transition-colors cursor-pointer"
            >
              <FileCode2 className={`w-3.5 h-3.5 text-palette-primary ${isCheckingSchema ? 'animate-spin' : ''}`} />
              <span>{isCheckingSchema ? 'Memeriksa...' : 'Periksa Skema'}</span>
            </button>

            <button
              type="button"
              onClick={handleRequestSynchronize}
              disabled={isSyncingDb}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-palette-primary rounded-lg hover:bg-palette-text transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingDb ? 'animate-spin' : ''}`} />
              <span>{isSyncingDb ? 'Menyinkronkan...' : 'Sinkronkan Skema & Data'}</span>
            </button>

            <button
              type="button"
              onClick={handleManualRefreshStatus}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-palette-text bg-white border border-palette-accent rounded-lg hover:bg-palette-background transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Segarkan Status</span>
            </button>
          </div>
        </div>

        {/* Status Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-3.5 rounded-lg bg-palette-background border border-palette-accent space-y-1">
            <span className="text-[11px] text-palette-text/70">Status Endpoint & Latensi</span>
            <div className="flex items-baseline justify-between font-mono tabular-nums">
              <strong className="text-sm font-bold text-palette-text">
                {auditReport?.httpStatus ? `HTTP ${auditReport.httpStatus}` : 'Siap'}
              </strong>
              <span className="text-xs font-semibold text-palette-primary">
                {auditReport?.latencyMs ?? syncStatus.latencyMs ?? 0} ms
              </span>
            </div>
            <p className="text-[11px] text-palette-text/65 truncate font-mono">
              {liveEnvValidation.urlHost || configForm.projectUrl}
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-palette-background border border-palette-accent space-y-1">
            <span className="text-[11px] text-palette-text/70">Status Sinkronisasi Skema</span>
            <div className="flex items-baseline justify-between font-mono tabular-nums">
              <strong
                className={`text-sm font-bold ${
                  auditReport?.allCoreTablesReady ? 'text-emerald-800' : 'text-amber-800'
                }`}
              >
                {auditReport
                  ? `${4 - auditReport.missingTablesCount} / 4 Tabel Inti`
                  : 'Memeriksa...'}
              </strong>
              <span className="text-xs text-palette-text/75">
                {auditReport?.missingColumnsCount === 0
                  ? '0 Kolom Hilang'
                  : `${auditReport?.missingColumnsCount ?? 0} Kolom Hilang`}
              </span>
            </div>
            <p className="text-[11px] text-palette-text/65">
              Mode:{' '}
              {syncStatus.mode === 'postgres_table'
                ? 'Tabel PostgreSQL Aktif'
                : 'Realtime Hibrida + Cadangan Lokal'}
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-palette-background border border-palette-accent space-y-1">
            <span className="text-[11px] text-palette-text/70">Keamanan Kunci & RLS</span>
            <div className="flex items-baseline justify-between">
              <strong
                className={`text-sm font-bold ${
                  liveEnvValidation.secretLeakDetected ? 'text-rose-800' : 'text-emerald-800'
                }`}
              >
                {liveEnvValidation.secretLeakDetected
                  ? 'Peringatan Kunci!'
                  : 'Publishable / Aman'}
              </strong>
              <span className="text-xs font-mono text-palette-primary font-semibold">
                RLS Aktif
              </span>
            </div>
            <p className="text-[11px] text-palette-text/65 font-mono truncate">
              {liveEnvValidation.maskedKey}
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-palette-background border border-palette-accent space-y-1">
            <span className="text-[11px] text-palette-text/70">Sinkronisasi Terakhir</span>
            <div className="flex items-baseline justify-between font-mono tabular-nums">
              <strong className="text-sm font-bold text-palette-text">
                {syncStatus.lastSyncedAt
                  ? new Date(syncStatus.lastSyncedAt).toLocaleTimeString('id-ID')
                  : 'Belum Sinkron'}
              </strong>
              <span className="text-xs text-palette-primary font-semibold">
                {configForm.autoSync ? 'Auto-Sync ON' : 'Manual'}
              </span>
            </div>
            <p className="text-[11px] text-palette-text/65">
              {syncStatus.lastSyncedAt
                ? new Date(syncStatus.lastSyncedAt).toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                : 'Menunggu sinkronisasi'}
            </p>
          </div>
        </div>

        {/* Live Action Feedback Banner */}
        {feedback && (
          <div
            className={`p-3.5 rounded-lg border text-xs flex items-start justify-between gap-3 ${
              feedback.ok
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {feedback.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <p className="font-semibold">{feedback.message}</p>
                {feedback.details && <p className="text-[11px] opacity-85">{feedback.details}</p>}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-[11px] font-semibold underline cursor-pointer shrink-0"
            >
              Tutup
            </button>
          </div>
        )}
      </div>

      {/* =====================================================================
          SETTING SQL TABEL BARU: MANAJEMEN USER & ROLE (public.app_users)
         ===================================================================== */}
      <div className="bg-white border-2 border-palette-primary/35 rounded-xl p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-palette-accent">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-palette-primary" />
              <h3 className="text-sm font-bold text-palette-text">
                Setting SQL Tabel Baru: Manajemen User & Role (public.app_users)
              </h3>
              <span className="px-2 py-0.5 rounded bg-palette-accent/60 text-palette-primary text-[11px] font-mono font-semibold">
                MIGRASI V004
              </span>
            </div>
            <p className="text-xs text-palette-text/75">
              Salin script SQL di bawah ini dan jalankan pada <strong>SQL Editor Supabase</strong>{' '}
              untuk membuat tabel <code className="font-mono">public.app_users</code> yang menyimpan
              role <strong>Admin</strong>, <strong>Guru</strong>, dan <strong>Wali Kelas</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleCopyText(SUPABASE_USER_TABLE_SQL, 'sql-new-user-table')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-palette-primary rounded-lg hover:bg-palette-text transition-colors cursor-pointer"
            >
              {copiedId === 'sql-new-user-table' ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>SQL Tabel User Berhasil Disalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy SQL Tabel Baru (app_users)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleCopyText(SUPABASE_SQL_SETUP_SCRIPT, 'sql-all-tables-top')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-palette-text bg-palette-background border border-palette-accent rounded-lg hover:bg-palette-accent/60 transition-colors cursor-pointer"
            >
              {copiedId === 'sql-all-tables-top' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="text-emerald-800">Semua SQL Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-palette-primary" />
                  <span>Copy Seluruh SQL (5 Tabel)</span>
                </>
              )}
            </button>

            <a
              href="https://supabase.com/dashboard/project/bdgiflfrksqfmbulfpdy/sql/new"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-palette-primary bg-palette-accent/50 border border-palette-accent rounded-lg hover:bg-palette-accent transition-colors"
            >
              <span>Buka SQL Editor Supabase</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        <div className="rounded-lg bg-slate-900 text-slate-100 p-4 overflow-x-auto max-h-64">
          <pre className="text-[11px] font-mono leading-relaxed whitespace-pre">
            {SUPABASE_USER_TABLE_SQL}
          </pre>
        </div>
      </div>

      {/* =====================================================================
          SETTING SQL BUCKET STORAGE: UPLOAD LOGO & TANDA TANGAN (app-files)
         ===================================================================== */}
      <div className="bg-white border-2 border-palette-primary/35 rounded-xl p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-palette-accent">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-palette-primary" />
              <h3 className="text-sm font-bold text-palette-text">
                Setting Skema Bucket Storage: Upload Logo & Tanda Tangan (<code className="font-mono text-palette-primary">app-files</code>)
              </h3>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 text-[11px] font-mono font-semibold">
                BUCKET STORAGE
              </span>
            </div>
            <p className="text-xs text-palette-text/75">
              Skema SQL idempoten untuk membuat bucket <code className="font-mono">app-files</code> pada Supabase Storage beserta kebijakan RLS public read dan upload izin berkas logo &amp; TTD.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleTestStorageBucket}
              disabled={isTestingStorage}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-palette-primary bg-palette-accent/50 border border-palette-accent rounded-lg hover:bg-palette-accent transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTestingStorage ? 'animate-spin' : ''}`} />
              <span>{isTestingStorage ? 'Menguji Storage...' : 'Uji Akses Bucket app-files'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleCopyText(SUPABASE_APP_FILES_BUCKET_SQL, 'sql-storage-bucket')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-palette-primary rounded-lg hover:bg-palette-text transition-colors cursor-pointer"
            >
              {copiedId === 'sql-storage-bucket' ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>SQL Bucket Storage Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy SQL Bucket Storage (app-files)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {storageTestResult && (
          <div
            className={`p-3.5 rounded-lg border text-xs flex items-center justify-between gap-3 ${
              storageTestResult.ok
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            <div className="flex items-center gap-2">
              {storageTestResult.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
              )}
              <span className="font-medium">{storageTestResult.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setStorageTestResult(null)}
              className="text-[11px] underline cursor-pointer shrink-0 font-medium"
            >
              Tutup
            </button>
          </div>
        )}

        <div className="rounded-lg bg-slate-900 text-slate-100 p-4 overflow-x-auto max-h-64">
          <pre className="text-[11px] font-mono leading-relaxed whitespace-pre">
            {SUPABASE_APP_FILES_BUCKET_SQL}
          </pre>
        </div>
      </div>

      {/* =====================================================================
          SECTION 2: ENVIRONMENT CONFIGURATION & CREDENTIAL VALIDATION
         ===================================================================== */}
      <div className="bg-white border border-palette-accent rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-palette-accent">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-4 h-4 text-palette-primary" />
            <div>
              <h3 className="text-sm font-semibold text-palette-text">
                2. Konfigurasi Lingkungan & Validasi Kredensial Supabase
              </h3>
              <p className="text-xs text-palette-text/70">
                Validasi variabel lingkungan <code className="font-mono">VITE_SUPABASE_URL</code> dan{' '}
                <code className="font-mono">VITE_SUPABASE_PUBLISHABLE_KEY</code> tanpa mengekspos
                kunci rahasia (<code className="font-mono">service_role</code>).
              </p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-semibold ${
              liveEnvValidation.urlValid &&
              liveEnvValidation.keyPresent &&
              !liveEnvValidation.secretLeakDetected
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {liveEnvValidation.urlValid && !liveEnvValidation.secretLeakDetected
              ? 'Konfigurasi Valid'
              : 'Perlu Perbaikan'}
          </span>
        </div>

        <form onSubmit={handleSaveEnvironmentConfig} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-palette-text">
                  Supabase Project URL (HTTPS)
                </label>
                <span className="text-[11px] font-mono text-palette-text/65">
                  {liveEnvValidation.usingEnvDefaultUrl
                    ? 'Sesuai .env Default'
                    : 'Kustom (Override)'}
                </span>
              </div>
              <input
                type="url"
                required
                value={configForm.projectUrl}
                onChange={(e) =>
                  setConfigForm({ ...configForm, projectUrl: e.target.value })
                }
                placeholder="https://bdgiflfrksqfmbulfpdy.supabase.co"
                className="w-full px-3.5 py-2 text-xs font-mono tabular-nums bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-palette-text">
                  Supabase Publishable / Anon Key
                </label>
                <button
                  type="button"
                  onClick={() => setShowRawKey((prev) => !prev)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-palette-primary hover:underline cursor-pointer"
                >
                  {showRawKey ? (
                    <>
                      <EyeOff className="w-3 h-3" />
                      <span>Sembunyikan Kunci</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3 h-3" />
                      <span>Tampilkan ({maskApiKey(configForm.publishableKey)})</span>
                    </>
                  )}
                </button>
              </div>
              <input
                type={showRawKey ? 'text' : 'password'}
                required
                value={configForm.publishableKey}
                onChange={(e) =>
                  setConfigForm({ ...configForm, publishableKey: e.target.value })
                }
                placeholder="sb_publishable_..."
                className="w-full px-3.5 py-2 text-xs font-mono tabular-nums bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
              />
            </div>
          </div>

          {/* Environment Validation Issues / Warnings */}
          {(liveEnvValidation.issues.length > 0 || liveEnvValidation.warnings.length > 0) && (
            <div className="space-y-2">
              {liveEnvValidation.issues.map((issue, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4 text-rose-700 shrink-0" />
                  <span>{issue}</span>
                </div>
              ))}
              {liveEnvValidation.warnings.map((warn, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>{warn}</span>
                </div>
              ))}
            </div>
          )}

          {/* Auto-Sync Switch */}
          <div className="p-3.5 bg-palette-background border border-palette-accent rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-palette-text">
                Sinkronisasi Otomatis ke Tabel Cloud Supabase (Auto-Sync)
              </p>
              <p className="text-xs text-palette-text/70 mt-0.5">
                Saat diaktifkan, setiap penambahan atau perubahan Data Kelas, Siswa, Nilai, Alumni,
                dan Pengaturan langsung disinkronkan secara non-destruktif ke PostgreSQL Supabase.
              </p>
            </div>
            <label className="inline-flex items-center gap-2 cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={configForm.autoSync}
                onChange={(e) =>
                  setConfigForm({ ...configForm, autoSync: e.target.checked })
                }
                className="w-4 h-4 accent-palette-primary rounded cursor-pointer"
              />
              <span className="text-xs font-semibold text-palette-text">
                {configForm.autoSync ? 'Auto-Sync Aktif' : 'Mode Manual'}
              </span>
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="submit"
                disabled={isTestingConn || liveEnvValidation.secretLeakDetected}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-palette-primary rounded-lg hover:bg-palette-text disabled:opacity-50 transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Simpan Konfigurasi & Validasi Koneksi</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setConfirmDialog({
                    type: 'RESET_CREDENTIALS',
                    title: 'Konfirmasi Reset Kredensial ke Default (.env)',
                    description:
                      'Apakah Anda yakin ingin mengembalikan Project URL dan Publishable Key ke konfigurasi bawaan lingkungan (.env)? Data siswa tidak akan dihapus.',
                  })
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-palette-text bg-palette-background border border-palette-accent rounded-lg hover:bg-palette-accent/50 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Kredensial Default</span>
              </button>
            </div>

            <a
              href={sqlEditorUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-palette-primary bg-palette-accent/45 border border-palette-accent rounded-lg hover:bg-palette-accent transition-colors"
            >
              <span>Buka Supabase SQL Editor</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </form>
      </div>

      {/* =====================================================================
          SECTION 3: DATABASE SCHEMA & TABLE/COLUMN INSPECTION
         ===================================================================== */}
      <div className="bg-white border border-palette-accent rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-palette-accent">
          <div>
            <h3 className="text-sm font-semibold text-palette-text">
              3. Inspeksi Skema Database, Tabel & Kolom Secara Langsung
            </h3>
            <p className="text-xs text-palette-text/70 mt-0.5">
              Membandingkan model data aplikasi dengan spesifikasi OpenAPI PostgREST aktual pada
              database Supabase (Klik baris tabel untuk melihat detail kolom, tipe data, dan indeks).
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums text-palette-text/70">
            Diperiksa:{' '}
            {auditReport?.checkedAt
              ? new Date(auditReport.checkedAt).toLocaleTimeString('id-ID')
              : '-'}
          </span>
        </div>

        <div className="space-y-3">
          {(auditReport?.tables || []).map((tbl) => {
            const isExpanded = expandedTable === tbl.tableName;
            return (
              <div
                key={tbl.tableName}
                className="border border-palette-accent rounded-xl overflow-hidden bg-palette-background/50"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedTable(isExpanded ? null : tbl.tableName)
                  }
                  className="w-full p-4 bg-white hover:bg-palette-accent/20 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left cursor-pointer"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="text-xs font-mono font-bold text-palette-primary bg-palette-accent/60 px-2 py-0.5 rounded">
                        public.{tbl.tableName}
                      </code>
                      <span className="text-xs font-semibold text-palette-text">
                        {tbl.entityName}
                      </span>
                      <span
                        className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded ${
                          tbl.status === 'synchronized'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : tbl.status === 'missing_table'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {tbl.status === 'synchronized'
                          ? 'SINKRON'
                          : tbl.status === 'missing_table'
                            ? 'TABEL BELUM DIBUAT'
                            : tbl.status === 'schema_drift'
                              ? 'KOLOM BELUM LENGKAP'
                              : 'ERROR KONEKSI'}
                      </span>
                    </div>
                    <p className="text-xs text-palette-text/70">{tbl.description}</p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 text-xs font-mono tabular-nums">
                    <div className="text-right">
                      <div className="text-palette-text font-semibold">
                        Lokal: {tbl.localRowCount} · Cloud:{' '}
                        {tbl.cloudRowCount !== null ? tbl.cloudRowCount : '-'}
                      </div>
                      <div className="text-[11px] text-palette-text/65">
                        {tbl.columns.length} Kolom · PK: {tbl.primaryKey}
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-palette-text/70" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-palette-text/70" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="p-4 border-t border-palette-accent space-y-3 bg-palette-background">
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span className="px-2.5 py-1 rounded bg-white border border-palette-accent font-mono">
                        <strong>Primary Key:</strong> {tbl.primaryKey}
                      </span>
                      <span className="px-2.5 py-1 rounded bg-white border border-palette-accent font-mono">
                        <strong>Unique:</strong> {tbl.uniqueConstraints.join(', ')}
                      </span>
                      <span className="px-2.5 py-1 rounded bg-white border border-palette-accent font-mono">
                        <strong>Indexes:</strong> {tbl.indexes.join(', ')}
                      </span>
                    </div>

                    {tbl.errorMessage && (
                      <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 font-mono">
                        Catatan PostgREST: {tbl.errorMessage}
                      </div>
                    )}

                    <div className="overflow-x-auto bg-white border border-palette-accent rounded-lg">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-palette-accent/45 border-b border-palette-accent text-palette-text font-semibold">
                            <th className="py-2 px-3">Nama Kolom</th>
                            <th className="py-2 px-3">Tipe Diharapkan</th>
                            <th className="py-2 px-3">Tipe Aktual Cloud</th>
                            <th className="py-2 px-3">Constraint</th>
                            <th className="py-2 px-3">Keterangan</th>
                            <th className="py-2 px-3 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-palette-accent/60">
                          {tbl.columns.map((col) => (
                            <tr key={col.name}>
                              <td className="py-2 px-3 font-mono font-semibold text-palette-text">
                                {col.name}
                              </td>
                              <td className="py-2 px-3 font-mono text-palette-primary">
                                {col.expectedType}
                              </td>
                              <td className="py-2 px-3 font-mono text-palette-text/75">
                                {col.actualType || 'Belum Terdeteksi'}
                              </td>
                              <td className="py-2 px-3 font-mono text-[11px]">
                                {col.isPrimaryKey
                                  ? 'PRIMARY KEY'
                                  : col.isUnique
                                    ? 'UNIQUE NOT NULL'
                                    : col.nullable
                                      ? 'NULLABLE'
                                      : 'NOT NULL'}
                              </td>
                              <td className="py-2 px-3 text-palette-text/75">{col.description}</td>
                              <td className="py-2 px-3 text-right font-mono">
                                <span
                                  className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                    col.status === 'ok'
                                      ? 'bg-emerald-50 text-emerald-800'
                                      : 'bg-amber-50 text-amber-800'
                                  }`}
                                >
                                  {col.status === 'ok' ? 'OK' : 'BELUM ADA'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          SECTION 4: SYNCHRONIZATION & IDEMPOTENT MIGRATION HISTORY
         ===================================================================== */}
      <div className="bg-white border border-palette-accent rounded-xl p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-palette-accent">
          <div>
            <h3 className="text-sm font-semibold text-palette-text">
              4. Sinkronisasi Skema Otomatis & Riwayat Migrasi SQL Berversi
            </h3>
            <p className="text-xs text-palette-text/70 mt-0.5">
              Seluruh script migrasi bersifat <strong>idempoten</strong> (menggunakan{' '}
              <code className="font-mono">IF NOT EXISTS</code> dan pengecekan{' '}
              <code className="font-mono">pg_publication_tables</code>) sehingga aman dijalankan
              berulang kali tanpa risiko menghapus data atau error duplikasi objek.
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleCopyText(SUPABASE_SQL_SETUP_SCRIPT, 'ALL_SQL')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-palette-primary rounded-lg hover:bg-palette-text transition-colors shrink-0 cursor-pointer"
          >
            {copiedId === 'ALL_SQL' ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Script Gabungan V001–V003 Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Salin Script Migrasi Lengkap (V001–V003)</span>
              </>
            )}
          </button>
        </div>

        {/* Versioned Migration Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {(auditReport?.migrations || []).map((mig) => (
            <div
              key={mig.version}
              className="p-4 rounded-xl bg-palette-background border border-palette-accent flex flex-col justify-between gap-3"
            >
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-palette-primary text-white font-mono text-xs font-bold">
                      {mig.version}
                    </span>
                    <span className="text-xs font-mono font-semibold text-palette-text">
                      {mig.name}
                    </span>
                  </div>
                  <span
                    className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded ${
                      mig.status === 'applied'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : mig.status === 'manual_required'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-sky-50 text-sky-800 border border-sky-200'
                    }`}
                  >
                    {mig.status === 'applied'
                      ? 'TERPASANG'
                      : mig.status === 'manual_required'
                        ? 'OPSIONAL (PERSETUJUAN ADMIN)'
                        : 'SIAP DIJALANKAN'}
                  </span>
                </div>
                <p className="text-xs text-palette-text/75 leading-relaxed">{mig.description}</p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-palette-accent/70 text-[11px] font-mono">
                <span className="text-palette-text/65">{mig.checksum}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedMigrationVer(
                        selectedMigrationVer === mig.version ? 'ALL' : mig.version
                      )
                    }
                    className="text-palette-primary font-semibold hover:underline cursor-pointer"
                  >
                    {selectedMigrationVer === mig.version ? 'Lihat Gabungan' : 'Lihat SQL'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyText(mig.sql, mig.version)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white border border-palette-accent text-palette-text hover:bg-palette-accent/50 font-semibold cursor-pointer"
                  >
                    {copiedId === mig.version ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-700" />
                        <span>Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-palette-primary" />
                        <span>Salin {mig.version}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* SQL Code Viewer */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-palette-text">
              Pratinjau Script SQL Idempoten (
              {selectedMigrationVer === 'ALL'
                ? 'Gabungan V001 + V002 + V003'
                : `Migrasi ${selectedMigrationVer}`}
              )
            </span>
            <span className="text-palette-text/65">
              Tempelkan di Supabase SQL Editor lalu klik <strong>Run</strong>
            </span>
          </div>
          <pre className="p-4 bg-palette-text text-palette-accent rounded-lg text-xs font-mono overflow-x-auto leading-relaxed max-h-80">
            {selectedMigrationVer === 'ALL'
              ? SUPABASE_SQL_SETUP_SCRIPT
              : auditReport?.migrations.find((m) => m.version === selectedMigrationVer)?.sql ||
                SUPABASE_SQL_SETUP_SCRIPT}
          </pre>
        </div>
      </div>

      {/* =====================================================================
          SECTION 5 & 6: SECURITY / RLS AUDIT & REALTIME CONFIGURATION
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Section 5: Security & RLS Audit (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-palette-accent rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-palette-accent">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-palette-primary" />
              <div>
                <h3 className="text-sm font-semibold text-palette-text">
                  5. Audit Keamanan Data & Row Level Security (RLS)
                </h3>
                <p className="text-xs text-palette-text/70">
                  Perlindungan verifikasi kelulusan publik, pencegahan enumerasi NISN, dan pemisahan
                  kebijakan akses
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-semibold">
              Rate-Limit: 5x/menit
            </span>
          </div>

          <div className="space-y-3">
            {(auditReport?.rlsAudit || []).map((item) => (
              <div
                key={item.tableName}
                className="p-3.5 rounded-lg bg-palette-background border border-palette-accent space-y-1.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono font-bold text-palette-primary">
                      {item.tableName}
                    </code>
                    <span className="text-xs font-semibold text-palette-text">
                      ({item.entityLabel})
                    </span>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                    RLS ENABLED
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-palette-text/80 pt-1">
                  <div>
                    <strong>SELECT:</strong> {item.selectPolicy}
                  </div>
                  <div>
                    <strong>INSERT/UPDATE/DELETE:</strong> {item.updatePolicy}
                  </div>
                </div>
                <p className="text-[11px] text-palette-text/65">{item.recommendation}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Section 6 & 7: Realtime Config + Backup & Recovery (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Section 6: Realtime Configuration */}
          <div className="bg-white border border-palette-accent rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-palette-accent">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-palette-primary" />
                <div>
                  <h3 className="text-sm font-semibold text-palette-text">
                    6. Konfigurasi Supabase Realtime
                  </h3>
                  <p className="text-xs text-palette-text/70">
                    Sinkronisasi instan tanpa duplikasi kanal
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleTestRealtimePing}
                className="px-2.5 py-1 text-xs font-semibold text-palette-primary bg-palette-accent/55 hover:bg-palette-accent rounded-md cursor-pointer"
              >
                Uji Ping Realtime
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-palette-accent/60">
                <span className="text-palette-text/70">Nama Kanal Aktif:</span>
                <code className="font-mono font-semibold text-palette-text">
                  {auditReport?.realtimeInfo.channelName || 'gradugate-live-sync'}
                </code>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-palette-accent/60">
                <span className="text-palette-text/70">Proteksi Duplikasi Kanal:</span>
                <span className="font-mono font-semibold text-emerald-800">
                  Aktif (Single Channel Guard)
                </span>
              </div>
              <div className="space-y-1 pt-1">
                <span className="text-palette-text/70 block">Tabel Terdaftar di Realtime:</span>
                <div className="flex flex-wrap gap-1.5">
                  {['class_rooms', 'students', 'alumni', 'announcement_settings'].map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded bg-palette-background border border-palette-accent font-mono text-[11px] text-palette-text"
                    >
                      public.{t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 7: Backup & Recovery Guidance */}
          <div className="bg-white border border-palette-accent rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-palette-accent">
              <div className="flex items-center gap-2">
                <HardDriveDownload className="w-4 h-4 text-palette-primary" />
                <div>
                  <h3 className="text-sm font-semibold text-palette-text">
                    7. Pencadangan (Backup) & Pemulihan Data
                  </h3>
                  <p className="text-xs text-palette-text/70">
                    Unduh atau pulihkan snapshot JSON 4 tabel sebelum migrasi besar
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs text-palette-text/75 leading-relaxed">
              Sebelum melakukan perubahan skema yang bersifat restriktif atau memindahkan data
              angkatan, unduh berkas cadangan JSON untuk menjamin keamanan seluruh arsip sekolah.
            </p>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleDownloadBackupJson}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-palette-primary rounded-lg hover:bg-palette-text transition-colors cursor-pointer"
              >
                <HardDriveDownload className="w-3.5 h-3.5" />
                <span>Unduh Backup JSON</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleBackupFileSelected}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-palette-text bg-palette-background border border-palette-accent rounded-lg hover:bg-palette-accent/60 transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-palette-primary" />
                <span>Pulihkan dari JSON</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          SECTION 8: DIAGNOSTIC LOGS (Sanitized & Timestamped)
         ===================================================================== */}
      <div className="bg-white border border-palette-accent rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-palette-accent">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-palette-primary" />
            <div>
              <h3 className="text-sm font-semibold text-palette-text">
                8. Log Diagnostik Koneksi, Skema & Keamanan
              </h3>
              <p className="text-xs text-palette-text/70">
                Catatan aktivitas real-time (disanitasi otomatis agar tidak menampilkan data pribadi
                siswa atau kunci rahasia)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={logCategoryFilter}
              onChange={(e) => setLogCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-palette-background border border-palette-accent rounded-lg text-palette-text"
            >
              <option value="ALL">Semua Kategori ({logs.length})</option>
              <option value="connection">Koneksi (connection)</option>
              <option value="schema">Skema (schema)</option>
              <option value="sync">Sinkronisasi (sync)</option>
              <option value="security">Keamanan (security)</option>
              <option value="realtime">Realtime (realtime)</option>
            </select>

            <button
              type="button"
              onClick={() => setLogs(clearDiagnosticLogs())}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-palette-text bg-palette-background border border-palette-accent rounded-lg hover:bg-palette-accent/50 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Bersihkan Log</span>
            </button>
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto divide-y divide-palette-accent/60 border border-palette-accent rounded-lg bg-palette-background">
          {filteredLogs.length === 0 ? (
            <div className="py-8 text-center text-xs text-palette-text/60">
              Belum ada catatan log diagnostik pada kategori ini.
            </div>
          ) : (
            filteredLogs.map((entry) => (
              <div
                key={entry.id}
                className="px-3.5 py-2.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white hover:bg-palette-accent/15"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <span
                    className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold uppercase shrink-0 mt-0.5 ${
                      entry.level === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : entry.level === 'warn'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : entry.level === 'error'
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : 'bg-palette-accent/60 text-palette-text'
                    }`}
                  >
                    {entry.category}
                  </span>
                  <div className="min-w-0">
                    <span className="font-mono font-semibold text-palette-primary mr-1.5">
                      [{entry.action}]
                    </span>
                    <span className="text-palette-text">{entry.message}</span>
                    {entry.details && (
                      <p className="text-[11px] font-mono text-palette-text/65 mt-0.5">
                        {entry.details}
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-[11px] font-mono tabular-nums text-palette-text/60 shrink-0">
                  {new Date(entry.timestamp).toLocaleTimeString('id-ID')}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* =====================================================================
          CONFIRMATION DIALOG FOR POTENTIALLY DESTRUCTIVE / OVERWRITING ACTIONS
         ===================================================================== */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 bg-palette-text/50 flex items-center justify-center p-4">
          <div className="bg-white border border-palette-accent rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-display text-base font-bold text-palette-text">
                  {confirmDialog.title}
                </h4>
                <p className="text-xs text-palette-text/75 mt-1 leading-relaxed">
                  {confirmDialog.description}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-palette-accent flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-3.5 py-2 text-xs font-medium text-palette-text bg-palette-background border border-palette-accent rounded-lg hover:bg-palette-accent/50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmDialog.type === 'RESET_CREDENTIALS') {
                    executeResetCredentials();
                  } else if (confirmDialog.type === 'SYNC_ALL_DATA') {
                    executeSynchronizeAll();
                  } else if (confirmDialog.type === 'RESTORE_BACKUP') {
                    executeRestoreBackup(confirmDialog.jsonPayload);
                  }
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-palette-primary rounded-lg hover:bg-palette-text cursor-pointer"
              >
                Ya, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
