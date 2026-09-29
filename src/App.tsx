/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Search,
  Lock,
  AlertCircle,
  CheckCircle2,
  FileDown,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import {
  AlumniRecord,
  AnnouncementSettings,
  AppUserRecord,
  ClassRoomRecord,
  LetterNumberRecord,
  StudentRecord,
  SubjectCatalogRecord,
  SupabaseSyncStatus,
  RolePermission,
} from './types/graduation';
import {
  bulkUpsertStudentRecords,
  deleteAlumniRecord,
  deleteAppUserRecord,
  deleteClassRoomRecord,
  deleteLetterNumberRecord,
  deleteStudentRecord,
  deleteSubjectCatalogRecord,
  fetchGraduationData,
  INITIAL_ALUMNI,
  INITIAL_CLASSROOMS,
  INITIAL_LETTER_NUMBERS,
  INITIAL_SETTINGS,
  INITIAL_STUDENTS,
  INITIAL_SUBJECT_CATALOG,
  INITIAL_USERS,
  INITIAL_ROLE_PERMISSIONS,
  loadLocalRolePermissions,
  saveRolePermissions,
  recordStudentCheckIn,
  restoreAlumniToStudent,
  subscribeToGraduationRealtime,
  SUPABASE_URL,
  syncAllLocalDataToSupabase,
  transferStudentsToAlumni,
  updateAnnouncementSettings,
  upsertAlumniRecord,
  upsertAppUserRecord,
  upsertClassRoomRecord,
  upsertLetterNumberRecord,
  upsertStudentRecord,
  upsertSubjectCatalogRecord,
  verifyStudentGraduationPublic,
} from './lib/supabase';
import { StudentResultCard } from './components/StudentResultCard';
import { StudentResultCardSkeleton } from './components/SkeletonLoaders';
import { AdminDashboard } from './components/AdminDashboard';
import { TopProgressBar } from './components/TopProgressBar';
import { CountdownClock } from './components/CountdownClock';

const CAPTCHA_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function createCaptchaString(length = 5): string {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += CAPTCHA_CHARS.charAt(Math.floor(Math.random() * CAPTCHA_CHARS.length));
  }
  return code;
}

export default function App() {
  const [viewMode, setViewMode] = useState<'landing' | 'admin'>('landing');

  const [classRooms, setClassRooms] = useState<ClassRoomRecord[]>(INITIAL_CLASSROOMS);
  const [subjectCatalog, setSubjectCatalog] =
    useState<SubjectCatalogRecord[]>(INITIAL_SUBJECT_CATALOG);
  const [letterNumbers, setLetterNumbers] =
    useState<LetterNumberRecord[]>(INITIAL_LETTER_NUMBERS);
  const [students, setStudents] = useState<StudentRecord[]>(INITIAL_STUDENTS);
  const [alumni, setAlumni] = useState<AlumniRecord[]>(INITIAL_ALUMNI);
  const [users, setUsers] = useState<AppUserRecord[]>(INITIAL_USERS);
  const [settings, setSettings] = useState<AnnouncementSettings>(INITIAL_SETTINGS);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>(INITIAL_ROLE_PERMISSIONS);
  const [syncStatus, setSyncStatus] = useState<SupabaseSyncStatus>({
    connected: true,
    mode: 'realtime_hybrid',
    projectUrl: SUPABASE_URL,
    autoSync: true,
    lastSyncedAt: new Date().toISOString(),
  });
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isMutating, setIsMutating] = useState(false);

  // Student Login State (NISN + Nomor Peserta Ujian + Tanggal Lahir + Anti-Bot Captcha)
  const [nisnInput, setNisnInput] = useState('');
  const [examNumberInput, setExamNumberInput] = useState('');
  const [birthDateInput, setBirthDateInput] = useState('');
  const [captchaCode, setCaptchaCode] = useState<string>(() => createCaptchaString(5));
  const [captchaInput, setCaptchaInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [loggedInStudentId, setLoggedInStudentId] = useState<string | null>(null);
  const resultSectionRef = useRef<HTMLDivElement | null>(null);

  const handleRefreshCaptcha = useCallback(() => {
    setCaptchaCode(createCaptchaString(5));
    setCaptchaInput('');
  }, []);

  const loadData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const result = await fetchGraduationData();
      setClassRooms(result.classRooms);
      setSubjectCatalog(result.subjectCatalog);
      setLetterNumbers(result.letterNumbers);
      setStudents(result.students);
      setAlumni(result.alumni);
      setUsers(result.users);
      setSettings(result.settings);
      setRolePermissions(result.rolePermissions);
      setSyncStatus(result.syncStatus);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToGraduationRealtime({
      onClassesChange: (nextClasses) => setClassRooms(nextClasses),
      onStudentsChange: (nextStudents) => setStudents(nextStudents),
      onAlumniChange: (nextAlumni) => setAlumni(nextAlumni),
      onSettingsChange: (nextSettings) => setSettings(nextSettings),
      onRefreshRequested: () => {
        loadData();
      },
    });
    return () => {
      unsubscribe();
    };
  }, [loadData]);

  // Auto-hide scrollbar on desktop/laptop when scroll activity stops
  useEffect(() => {
    const timers = new Map<Element, number>();

    const markScrolling = (el: Element) => {
      el.classList.add('is-scrolling');
      const prevTimer = timers.get(el);
      if (prevTimer) {
        window.clearTimeout(prevTimer);
      }
      const nextTimer = window.setTimeout(() => {
        el.classList.remove('is-scrolling');
        timers.delete(el);
      }, 850);
      timers.set(el, nextTimer);
    };

    const handleAnyScroll = (event: Event) => {
      markScrolling(document.documentElement);
      markScrolling(document.body);
      if (event.target instanceof Element) {
        markScrolling(event.target);
      }
    };

    window.addEventListener('scroll', handleAnyScroll, { capture: true, passive: true });
    return () => {
      window.removeEventListener('scroll', handleAnyScroll, { capture: true });
      timers.forEach((timerId, el) => {
        window.clearTimeout(timerId);
        el.classList.remove('is-scrolling');
      });
      timers.clear();
    };
  }, []);

  // Keep active student reactive to real-time updates from Admin
  const activeStudent = useMemo(() => {
    if (!loggedInStudentId) return null;
    return students.find((s) => s.id === loggedInStudentId) || null;
  }, [students, loggedInStudentId]);

  const activeHomeroomTeacher = useMemo(() => {
    if (!activeStudent) return undefined;
    const found = classRooms.find((c) => c.className === activeStudent.className);
    return found?.homeroomTeacher;
  }, [activeStudent, classRooms]);

  // Live cohort summary metrics
  const cohortSummary = useMemo(() => {
    const total = students.length;
    const passed = students.filter((s) => s.status === 'LULUS').length;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';
    return { total, passed, passRate };
  }, [students]);

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!settings.isPublished) {
      setLoginError(
        'Pengumuman kelulusan saat ini masih ditutup atau menunggu waktu hitung mundur selesai.'
      );
      return;
    }

    const cleanNisn = nisnInput.trim();
    const cleanExamNumber = examNumberInput.trim();
    const cleanBirthDate = birthDateInput.trim();
    const cleanCaptcha = captchaInput.trim().toUpperCase();

    if (!cleanNisn || !cleanExamNumber || !cleanBirthDate) {
      setLoginError(
        'Mohon lengkapi 10 digit NISN, Nomor Peserta Ujian, dan Tanggal Lahir Anda.'
      );
      return;
    }

    if (!cleanCaptcha || cleanCaptcha !== captchaCode.toUpperCase()) {
      setLoginError(
        'Kode Keamanan Captcha tidak sesuai. Silakan ketik ulang kode Captcha yang tampil untuk verifikasi Anti-BOT.'
      );
      handleRefreshCaptcha();
      return;
    }

    setIsVerifying(true);
    setTimeout(() => {
      resultSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 40);

    setTimeout(async () => {
      const verifyResult = await verifyStudentGraduationPublic(
        cleanNisn,
        cleanExamNumber,
        cleanBirthDate,
        students,
        settings
      );

      if (!verifyResult.ok || !verifyResult.student) {
        setIsVerifying(false);
        handleRefreshCaptcha();
        setLoginError(
          verifyResult.errorMessage ||
            'Data tidak ditemukan. Pastikan NISN, Nomor Peserta Ujian, dan Tanggal Lahir sesuai data sekolah.'
        );
        return;
      }

      const found = verifyResult.student;
      setLoggedInStudentId(found.id);
      setIsVerifying(false);
      handleRefreshCaptcha();

      // Record student check-in timestamp in real-time
      await recordStudentCheckIn(found, students);
      setTimeout(() => {
        resultSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    }, 520);
  };

  const handleFillDemoStudent = (student: StudentRecord) => {
    setNisnInput(student.nisn);
    setExamNumberInput(student.examNumber);
    setBirthDateInput(student.birthDate);
    setLoginError('');
  };

  const handleSaveClassRoom = async (cls: ClassRoomRecord) => {
    setIsMutating(true);
    try {
      const res = await upsertClassRoomRecord(cls, classRooms, students);
      setClassRooms(res.classRooms);
      if (res.students) {
        setStudents(res.students);
      }
      if (res.syncedToPostgres) {
        setSyncStatus((prev) => ({
          ...prev,
          connected: true,
          connectionState: 'connected',
          mode: 'postgres_table',
          lastSyncedAt: new Date().toISOString(),
        }));
      }
    } finally {
      setIsMutating(false);
    }
  };

  const handleDeleteClassRoom = async (classId: string) => {
    setIsMutating(true);
    try {
      const res = await deleteClassRoomRecord(classId, classRooms);
      setClassRooms(res.classRooms);
      if (res.syncedToPostgres) {
        setSyncStatus((prev) => ({
          ...prev,
          connected: true,
          connectionState: 'connected',
          mode: 'postgres_table',
          lastSyncedAt: new Date().toISOString(),
        }));
      }
    } finally {
      setIsMutating(false);
    }
  };

  const handleSaveStudent = async (student: StudentRecord) => {
    setIsMutating(true);
    try {
      const res = await upsertStudentRecord(student, students);
      setStudents(res.students);
      if (res.syncedToPostgres) {
        setSyncStatus((prev) => ({
          ...prev,
          connected: true,
          connectionState: 'connected',
          mode: 'postgres_table',
          lastSyncedAt: new Date().toISOString(),
        }));
      }
    } finally {
      setIsMutating(false);
    }
  };

  const handleBulkSaveStudents = async (incomingList: StudentRecord[]) => {
    setIsMutating(true);
    try {
      const res = await bulkUpsertStudentRecords(incomingList, students);
      setStudents(res.students);
      if (res.syncedToPostgres) {
        setSyncStatus((prev) => ({
          ...prev,
          connected: true,
          connectionState: 'connected',
          mode: 'postgres_table',
          lastSyncedAt: new Date().toISOString(),
        }));
      }
      return { addedCount: res.addedCount, updatedCount: res.updatedCount };
    } finally {
      setIsMutating(false);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    setIsMutating(true);
    try {
      const res = await deleteStudentRecord(studentId, students);
      setStudents(res.students);
      if (res.syncedToPostgres) {
        setSyncStatus((prev) => ({
          ...prev,
          connected: true,
          connectionState: 'connected',
          mode: 'postgres_table',
          lastSyncedAt: new Date().toISOString(),
        }));
      }
      if (loggedInStudentId === studentId) {
        setLoggedInStudentId(null);
      }
    } finally {
      setIsMutating(false);
    }
  };

  const handleTransferStudentsToAlumni = async (studentsToMove: StudentRecord[]) => {
    setIsMutating(true);
    try {
      const res = await transferStudentsToAlumni(
        studentsToMove,
        students,
        alumni,
        settings.academicYear
      );
      setStudents(res.students);
      setAlumni(res.alumni);
      if (loggedInStudentId && studentsToMove.some((s) => s.id === loggedInStudentId)) {
        setLoggedInStudentId(null);
      }
    } finally {
      setIsMutating(false);
    }
  };

  const handleSaveAlumni = async (alumniItem: AlumniRecord) => {
    setIsMutating(true);
    try {
      const res = await upsertAlumniRecord(alumniItem, alumni);
      setAlumni(res.alumni);
    } finally {
      setIsMutating(false);
    }
  };

  const handleRestoreAlumniToStudent = async (alumniItem: AlumniRecord) => {
    setIsMutating(true);
    try {
      const res = await restoreAlumniToStudent(alumniItem, students, alumni);
      setStudents(res.students);
      setAlumni(res.alumni);
    } finally {
      setIsMutating(false);
    }
  };

  const handleDeleteAlumni = async (alumniId: string) => {
    setIsMutating(true);
    try {
      const res = await deleteAlumniRecord(alumniId, alumni);
      setAlumni(res.alumni);
    } finally {
      setIsMutating(false);
    }
  };

  const handleSaveUser = async (userItem: AppUserRecord) => {
    setIsMutating(true);
    try {
      const res = await upsertAppUserRecord(userItem, users);
      setUsers(res.users);
    } finally {
      setIsMutating(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setIsMutating(true);
    try {
      const res = await deleteAppUserRecord(userId, users);
      setUsers(res.users);
    } finally {
      setIsMutating(false);
    }
  };

  const handleSaveSubject = async (subjItem: SubjectCatalogRecord) => {
    setIsMutating(true);
    try {
      const res = await upsertSubjectCatalogRecord(
        subjItem,
        subjectCatalog,
        students,
        settings.passingGradeKkm
      );
      setSubjectCatalog(res.subjectCatalog);
      setStudents(res.students);
    } finally {
      setIsMutating(false);
    }
  };

  const handleDeleteSubject = async (subjectId: string) => {
    setIsMutating(true);
    try {
      const res = await deleteSubjectCatalogRecord(
        subjectId,
        subjectCatalog,
        students,
        settings.passingGradeKkm
      );
      setSubjectCatalog(res.subjectCatalog);
      setStudents(res.students);
    } finally {
      setIsMutating(false);
    }
  };

  const handleSaveLetterNumber = async (item: LetterNumberRecord) => {
    setIsMutating(true);
    try {
      const res = await upsertLetterNumberRecord(item, letterNumbers);
      setLetterNumbers(res.letterNumbers);
    } finally {
      setIsMutating(false);
    }
  };

  const handleDeleteLetterNumber = async (id: string) => {
    setIsMutating(true);
    try {
      const res = await deleteLetterNumberRecord(id, letterNumbers);
      setLetterNumbers(res.letterNumbers);
    } finally {
      setIsMutating(false);
    }
  };

  const handleSaveSettings = async (nextSettings: AnnouncementSettings) => {
    setIsMutating(true);
    try {
      const res = await updateAnnouncementSettings(nextSettings);
      setSettings(res.settings);
    } finally {
      setIsMutating(false);
    }
  };

  const handleSaveRolePermissions = async (nextPerms: RolePermission[]) => {
    setIsMutating(true);
    try {
      const res = await saveRolePermissions(nextPerms);
      setRolePermissions(res.rolePermissions);
    } finally {
      setIsMutating(false);
    }
  };

  const handleSyncSupabaseTables = async () => {
    setIsMutating(true);
    try {
      return await syncAllLocalDataToSupabase(classRooms, students, alumni, settings);
    } finally {
      setIsMutating(false);
    }
  };

  const isProgressBarActive = isLoadingData || isVerifying || isMutating;

  if (viewMode === 'admin') {
    return (
      <>
        <TopProgressBar isActive={isProgressBarActive} />
        <AdminDashboard
          classRooms={classRooms}
          subjectCatalog={subjectCatalog}
          letterNumbers={letterNumbers}
          students={students}
          alumni={alumni}
          users={users}
          settings={settings}
          rolePermissions={rolePermissions}
          syncStatus={syncStatus}
          isLoadingData={isLoadingData}
          onSaveClassRoom={handleSaveClassRoom}
          onDeleteClassRoom={handleDeleteClassRoom}
          onSaveSubject={handleSaveSubject}
          onDeleteSubject={handleDeleteSubject}
          onSaveLetterNumber={handleSaveLetterNumber}
          onDeleteLetterNumber={handleDeleteLetterNumber}
          onSaveStudent={handleSaveStudent}
          onBulkSaveStudents={handleBulkSaveStudents}
          onDeleteStudent={handleDeleteStudent}
          onTransferStudentsToAlumni={handleTransferStudentsToAlumni}
          onSaveAlumni={handleSaveAlumni}
          onRestoreAlumniToStudent={handleRestoreAlumniToStudent}
          onDeleteAlumni={handleDeleteAlumni}
          onSaveUser={handleSaveUser}
          onDeleteUser={handleDeleteUser}
          onSaveSettings={handleSaveSettings}
          onSaveRolePermissions={handleSaveRolePermissions}
          onSyncSupabaseTables={handleSyncSupabaseTables}
          onRefreshData={loadData}
          onBackToLanding={() => setViewMode('landing')}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-palette-background text-palette-text">
      <TopProgressBar isActive={isProgressBarActive} />
      {/* TOP BAR CONTRACT: Brand wordmark on left | Admin Action on right (no demo/extra nav links) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b border-palette-accent px-4 sm:px-6 py-3 sm:py-3.5">
        <div className="max-w-[1080px] mx-auto flex items-center justify-between gap-2.5 sm:gap-4">
          <a
            href="#portal"
            onClick={(e) => {
              e.preventDefault();
              setLoggedInStudentId(null);
            }}
            className="font-display text-sm sm:text-base md:text-lg font-bold tracking-tight text-palette-text truncate min-w-0"
          >
            Sipinter-Lulus - SMAN 1 Lumbung Ciamis
          </a>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('admin')}
              className="px-3 sm:px-3.5 py-2 min-h-[38px] text-xs font-semibold text-white bg-palette-primary rounded-lg hover:bg-palette-text transition-colors whitespace-nowrap cursor-pointer"
            >
              Dashboard Admin
            </button>
          </div>
        </div>
      </header>

      {/* SIMPLE, DIRECT MAIN CONTENT WITH LARGE COUNTDOWN */}
      <main id="portal" className="flex-1 flex flex-col justify-center">
        <div className="w-full max-w-[1080px] mx-auto px-4 sm:px-6 py-6 sm:py-8 md:py-12 space-y-6 sm:space-y-8">
          {/* HERO HEADER & LARGE FULL-WIDTH DIGITAL COUNTDOWN */}
          <motion.div
            id="countdown-section"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-4 sm:space-y-5"
          >
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 sm:gap-4">
              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-palette-primary font-semibold">
                  <span>{settings.schoolName}</span>
                  <span aria-hidden="true">·</span>
                  <span>TA {settings.academicYear}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">NPSN {settings.schoolNpsn}</span>
                </div>
                <h1
                  className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-palette-text leading-[1.15]"
                  style={{ textWrap: 'balance' }}
                >
                  Portal Pengumuman Kelulusan Siswa
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-palette-text/70">Peserta Ujian: </span>
                  {isLoadingData ? (
                    <span className="inline-block h-4 w-16 bg-palette-accent/80 rounded animate-pulse" />
                  ) : (
                    <strong className="font-mono tabular-nums text-palette-text">
                      {cohortSummary.total} Siswa
                    </strong>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-palette-text/70">Kelulusan: </span>
                  {isLoadingData ? (
                    <span className="inline-block h-4 w-12 bg-palette-accent/80 rounded animate-pulse" />
                  ) : (
                    <strong className="font-mono tabular-nums text-emerald-800">
                      {cohortSummary.passRate}%
                    </strong>
                  )}
                </div>
              </div>
            </div>

            {/* LARGE COUNTDOWN HERO DISPLAY: ONLY SHOWN BEFORE ANNOUNCEMENT OPENS */}
            <AnimatePresence>
              {!settings.isPublished && (
                <motion.div
                  key="countdown-banner"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  <CountdownClock
                    targetTimeIso={settings.announcementTime}
                    isPublished={settings.isPublished}
                    onCountdownFinished={() => {
                      handleSaveSettings({ ...settings, isPublished: true });
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* LOWER GRID: GUIDE + VERIFICATION FORM */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
            {/* Left 5 Cols: Brief Instructions */}
            <div id="panduan" className="lg:col-span-5 bg-white border border-palette-accent rounded-xl p-5 sm:p-6 space-y-4">
              <h2 className="font-display text-base sm:text-lg font-bold text-palette-text">
                Panduan Verifikasi & Unduh SKL
              </h2>
              <p className="text-xs text-palette-text/80 leading-relaxed">
                {settings.announcementNote}
              </p>

              <div className="space-y-3 pt-2 border-t border-palette-accent text-xs text-palette-text/85">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-palette-primary shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-palette-text">01. Verifikasi Identitas & Anti-BOT</strong>{' '}
                    — Masukkan 10 digit NISN, Nomor Peserta Ujian, Tanggal Lahir, serta kode keamanan
                    Captcha pada formulir di samping.
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-palette-text">02. Cek Status & Nilai</strong> — Hasil
                    kelulusan (LULUS / TIDAK LULUS) dan transkrip nilai tampil langsung di bawah.
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <FileDown className="w-4 h-4 text-palette-primary shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-palette-text">03. Unduh SKL (PDF)</strong> — Cetak Surat
                    Keterangan Lulus resmi berformat PDF ukuran A4.
                  </div>
                </div>
              </div>
            </div>

            {/* Right 7 Cols: Login Form Card */}
            <div
              id="form-cek"
              className="lg:col-span-7 bg-white border border-palette-accent rounded-xl p-4 sm:p-6 md:p-7"
            >
              <div className="pb-4 border-b border-palette-accent flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
                <div>
                  <h2 className="font-display text-lg sm:text-xl font-bold text-palette-text">
                    Cek Status Kelulusan & Nilai
                  </h2>
                  <p className="text-xs text-palette-text/70 mt-0.5">
                    Masukkan NISN, Nomor Peserta Ujian, Tanggal Lahir, dan kode Captcha peserta didik
                  </p>
                </div>
                <span
                  className={`text-xs font-mono tabular-nums font-semibold px-2.5 py-1 rounded self-start sm:self-auto shrink-0 ${
                    settings.isPublished
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  {settings.isPublished ? 'Portal Dibuka' : 'Portal Ditutup'}
                </span>
              </div>

              {isLoadingData ? (
                <div className="space-y-4 pt-4 animate-pulse" role="status" aria-label="Memuat formulir...">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <div className="h-3.5 w-44 bg-palette-accent/75 rounded" />
                      <div className="h-10 w-full bg-palette-accent/55 rounded-lg" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-3.5 w-36 bg-palette-accent/75 rounded" />
                      <div className="h-10 w-full bg-palette-accent/55 rounded-lg" />
                    </div>
                    <div className="sm:col-span-2 space-y-1.5">
                      <div className="h-3.5 w-40 bg-palette-accent/75 rounded" />
                      <div className="h-10 w-full bg-palette-accent/55 rounded-lg" />
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-palette-background border border-palette-accent space-y-2.5">
                    <div className="h-3.5 w-52 bg-palette-accent/75 rounded" />
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-5 h-11 bg-palette-accent/65 rounded-lg" />
                      <div className="sm:col-span-7 h-11 bg-palette-accent/55 rounded-lg" />
                    </div>
                  </div>
                  <div className="h-11 w-full bg-palette-primary/35 rounded-lg" />
                </div>
              ) : !settings.isPublished ? (
                <div className="py-10 text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center mx-auto">
                    <Lock className="w-4 h-4" />
                  </div>
                  <h3 className="font-display text-base font-bold text-palette-text">
                    Menunggu Waktu Pengumuman Dibuka
                  </h3>
                  <p className="text-xs text-palette-text/75 max-w-sm mx-auto leading-relaxed">
                    Formulir verifikasi akan terbuka otomatis saat waktu hitung mundur (countdown) di
                    atas mencapai 00:00:00:00 atau dibuka oleh Admin melalui{' '}
                    <strong>Dashboard Admin</strong>.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleStudentLogin} className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="nisn-input"
                        className="block text-xs font-semibold text-palette-text mb-1.5"
                      >
                        Nomor Induk Siswa Nasional (NISN)
                      </label>
                      <input
                        id="nisn-input"
                        type="text"
                        inputMode="numeric"
                        maxLength={12}
                        value={nisnInput}
                        onChange={(e) => {
                          setNisnInput(e.target.value);
                          if (loginError) setLoginError('');
                        }}
                        placeholder="Contoh: 0084921034"
                        className="w-full px-3.5 py-2.5 text-sm bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary font-mono tabular-nums text-palette-text"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="exam-number-input"
                        className="block text-xs font-semibold text-palette-text mb-1.5"
                      >
                        Nomor Peserta Ujian
                      </label>
                      <input
                        id="exam-number-input"
                        type="text"
                        value={examNumberInput}
                        onChange={(e) => {
                          setExamNumberInput(e.target.value);
                          if (loginError) setLoginError('');
                        }}
                        placeholder="Contoh: 26-01-0145-0001-8"
                        className="w-full px-3.5 py-2.5 text-sm bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary font-mono tabular-nums text-palette-text"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label
                        htmlFor="birthdate-input"
                        className="block text-xs font-semibold text-palette-text mb-1.5"
                      >
                        Tanggal Lahir Peserta Didik
                      </label>
                      <input
                        id="birthdate-input"
                        type="date"
                        value={birthDateInput}
                        onChange={(e) => {
                          setBirthDateInput(e.target.value);
                          if (loginError) setLoginError('');
                        }}
                        className="w-full px-3.5 py-2.5 text-sm bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary font-mono tabular-nums text-palette-text"
                      />
                    </div>
                  </div>

                  {/* Anti-BOT Captcha Verification Block */}
                  <div className="p-3.5 rounded-xl bg-palette-background border border-palette-accent space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="captcha-input"
                        className="text-xs font-semibold text-palette-text flex items-center gap-1.5"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-palette-primary" />
                        <span>Verifikasi Keamanan Anti-BOT (Captcha)</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleRefreshCaptcha}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-palette-primary hover:text-palette-text cursor-pointer"
                        title="Ganti Kode Captcha"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Ganti Kode</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                      {/* Visual Captcha Graphic Box */}
                      <div
                        aria-label="Kode Captcha"
                        className="sm:col-span-5 h-11 rounded-lg bg-white border border-palette-accent px-3 flex items-center justify-center select-none relative overflow-hidden"
                      >
                        <svg
                          className="absolute inset-0 w-full h-full pointer-events-none opacity-35"
                          viewBox="0 0 180 44"
                          preserveAspectRatio="none"
                        >
                          <line
                            x1="0"
                            y1="10"
                            x2="180"
                            y2="36"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            className="text-palette-primary"
                          />
                          <line
                            x1="12"
                            y1="40"
                            x2="165"
                            y2="6"
                            stroke="currentColor"
                            strokeWidth="1.2"
                            className="text-palette-secondary"
                          />
                          <path
                            d="M 5 22 Q 45 6, 90 22 T 175 22"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.2"
                            className="text-palette-text"
                          />
                        </svg>
                        <div className="relative z-10 flex items-center gap-2 font-mono text-base font-bold tracking-[0.28em] text-palette-text">
                          {captchaCode.split('').map((ch, idx) => (
                            <span
                              key={`${ch}-${idx}`}
                              className={
                                idx % 2 === 0
                                  ? 'inline-block -rotate-6 text-palette-text'
                                  : 'inline-block rotate-6 text-palette-primary'
                              }
                            >
                              {ch}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Captcha Input Field */}
                      <div className="sm:col-span-7">
                        <input
                          id="captcha-input"
                          type="text"
                          maxLength={6}
                          value={captchaInput}
                          onChange={(e) => {
                            setCaptchaInput(e.target.value.toUpperCase());
                            if (loginError) setLoginError('');
                          }}
                          placeholder="Ketik 5 karakter kode di samping..."
                          className="w-full px-3.5 py-2.5 text-sm bg-white border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary font-mono uppercase tracking-widest text-palette-text"
                        />
                      </div>
                    </div>
                  </div>

                  {loginError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-xs text-rose-900">
                      <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                      <span>{loginError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isVerifying || isLoadingData}
                    className="w-full py-3 px-4 text-xs font-semibold text-white bg-palette-primary rounded-lg hover:bg-palette-text transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                  >
                    <Search className="w-4 h-4" />
                    <span>
                      {isVerifying
                        ? 'Memeriksa Data Kelulusan...'
                        : 'Lihat Hasil Kelulusan di Bawah'}
                    </span>
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* INLINE GRADUATION RESULT OR SKELETON CARD DIRECTLY BELOW FORM */}
          {(isVerifying || (isLoadingData && Boolean(loggedInStudentId)) || (activeStudent && settings.isPublished)) && (
            <div id="hasil-kelulusan" ref={resultSectionRef} className="scroll-mt-20">
              {isVerifying || isLoadingData ? (
                <StudentResultCardSkeleton />
              ) : activeStudent && settings.isPublished ? (
                <StudentResultCard
                  student={activeStudent}
                  settings={settings}
                  homeroomTeacherName={activeHomeroomTeacher}
                  onLogout={() => setLoggedInStudentId(null)}
                />
              ) : null}
            </div>
          )}
        </div>
      </main>

      {/* SIMPLE QUIET FOOTER */}
      <footer className="border-t border-palette-accent bg-white px-4 sm:px-6 py-4 sm:py-5">
        <div className="max-w-[1080px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3 text-xs text-palette-text/75">
          <div className="leading-relaxed">
            <strong className="text-palette-text font-semibold">{settings.schoolName}</strong>
            <span className="mx-2" aria-hidden="true">
              ·
            </span>
            <span>{settings.schoolAddress}</span>
          </div>
          <span className="font-mono tabular-nums text-[11px] sm:text-xs text-palette-text/60">
            © 2026 &ldquo;Sipinter-Lulus&rdquo; · Tahun Pembuatan: 2026 · TA {settings.academicYear}
          </span>
        </div>
      </footer>
    </div>
  );
}
