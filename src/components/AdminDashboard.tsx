import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Plus,
  Download,
  FileText,
  Edit3,
  Trash2,
  CheckCircle2,
  Database,
  Settings,
  Users,
  ArrowLeft,
  Check,
  Lock,
  Unlock,
  Clock,
  X,
  GraduationCap,
  BookOpen,
  Building2,
  ChevronDown,
  ArrowRightLeft,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Upload,
  FileSpreadsheet,
  HelpCircle,
  KeyRound,
  Info,
  Eye,
  EyeOff,
  UserCog,
  LogOut,
  UserCheck,
  Sparkles,
  RefreshCw,
  Menu,
  Filter,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import {
  AlumniRecord,
  AnnouncementSettings,
  AppUserRecord,
  ClassRoomRecord,
  GraduationStatus,
  LetterNumberRecord,
  Major,
  StudentRecord,
  SubjectCatalogRecord,
  SupabaseSyncStatus,
} from '../types/graduation';
import {
  buildSubjectsFromCatalog,
  computeAcademicSummary,
  formatLetterNumberFromTemplate,
  resolveLoginPanelImage,
} from '../lib/supabase';
import {
  formatIndonesianDate,
  generateGraduationCertificatePDF,
} from '../utils/pdfGenerator';
import { ClassManagementSection } from './admin/ClassManagementSection';
import { SubjectManagementSection } from './admin/SubjectManagementSection';
import { LetterNumberManagementSection } from './admin/LetterNumberManagementSection';
import { KopSuratManagementSection } from './admin/KopSuratManagementSection';
import { AlumniManagementSection } from './admin/AlumniManagementSection';
import { SupabaseStorageSection } from './admin/SupabaseStorageSection';
import { AdminAnalyticsSection } from './admin/AdminAnalyticsSection';
import { UserManagementSection } from './admin/UserManagementSection';
import { TablePagination } from './admin/TablePagination';
import { CsvTemplateUploadModal } from './admin/CsvTemplateUploadModal';
import { AdminGuideModal, GuideTopicKey } from './admin/AdminGuideModal';
import { TableDataSkeleton } from './SkeletonLoaders';

const DEFAULT_SUPABASE_ACCESS_TOKEN = 'VIRGA100791';

interface AdminDashboardProps {
  classRooms: ClassRoomRecord[];
  subjectCatalog: SubjectCatalogRecord[];
  letterNumbers: LetterNumberRecord[];
  students: StudentRecord[];
  alumni: AlumniRecord[];
  users: AppUserRecord[];
  settings: AnnouncementSettings;
  syncStatus: SupabaseSyncStatus;
  isLoadingData?: boolean;
  onSaveClassRoom: (cls: ClassRoomRecord) => Promise<void>;
  onDeleteClassRoom: (classId: string) => Promise<void>;
  onSaveSubject: (subj: SubjectCatalogRecord) => Promise<void>;
  onDeleteSubject: (subjectId: string) => Promise<void>;
  onSaveLetterNumber: (item: LetterNumberRecord) => Promise<void>;
  onDeleteLetterNumber: (id: string) => Promise<void>;
  onSaveStudent: (student: StudentRecord) => Promise<void>;
  onBulkSaveStudents: (
    records: StudentRecord[]
  ) => Promise<{ addedCount: number; updatedCount: number }>;
  onDeleteStudent: (studentId: string) => Promise<void>;
  onTransferStudentsToAlumni: (studentsToMove: StudentRecord[]) => Promise<void>;
  onSaveAlumni: (alumniItem: AlumniRecord) => Promise<void>;
  onRestoreAlumniToStudent: (alumniItem: AlumniRecord) => Promise<void>;
  onDeleteAlumni: (alumniId: string) => Promise<void>;
  onSaveUser: (userItem: AppUserRecord) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
  onSaveSettings: (settings: AnnouncementSettings) => Promise<void>;
  onSyncSupabaseTables: () => Promise<{ ok: boolean; message: string }>;
  onRefreshData: () => Promise<void>;
  onBackToLanding: () => void;
}

type AdminTab =
  | 'analytics'
  | 'students'
  | 'letter_settings'
  | 'letter_numbers'
  | 'alumni'
  | 'users'
  | 'monitoring'
  | 'database';
type StudentSubTab = 'classes' | 'subjects' | 'student_biodata' | 'student_grades';
type LetterSubTab = 'kop_format' | 'letter_numbers';
type FilterMode = 'ALL' | 'LULUS' | 'TIDAK_LULUS' | 'MIPA' | 'IPS' | 'CHECKED';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  classRooms,
  subjectCatalog,
  letterNumbers,
  students,
  alumni,
  users,
  settings,
  syncStatus,
  isLoadingData = false,
  onSaveClassRoom,
  onDeleteClassRoom,
  onSaveSubject,
  onDeleteSubject,
  onSaveLetterNumber,
  onDeleteLetterNumber,
  onSaveStudent,
  onBulkSaveStudents,
  onDeleteStudent,
  onTransferStudentsToAlumni,
  onSaveAlumni,
  onRestoreAlumniToStudent,
  onDeleteAlumni,
  onSaveUser,
  onDeleteUser,
  onSaveSettings,
  onSyncSupabaseTables,
  onRefreshData,
  onBackToLanding,
}) => {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<AppUserRecord | null>(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginPanelImageSrc, setLoginPanelImageSrc] = useState<string | null>(null);
  const [isLoadingLoginImage, setIsLoadingLoginImage] = useState(true);
  const [loginImageError, setLoginImageError] = useState(false);
  const [isRefreshingTable, setIsRefreshingTable] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    setIsLoadingLoginImage(true);
    resolveLoginPanelImage()
      .then((result) => {
        if (mounted) {
          setLoginPanelImageSrc(result.src);
          setIsLoadingLoginImage(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setLoginImageError(true);
          setIsLoadingLoginImage(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleManualTableRefresh = async () => {
    setIsRefreshingTable(true);
    try {
      await onRefreshData();
    } finally {
      setTimeout(() => {
        setIsRefreshingTable(false);
      }, 280);
    }
  };

  const isFetchingTable = isLoadingData || isRefreshingTable;

  const [activeTab, setActiveTab] = useState<AdminTab>('students');
  const [studentSubTab, setStudentSubTab] = useState<StudentSubTab>('student_biodata');
  const [letterSubTab, setLetterSubTab] = useState<LetterSubTab>('kop_format');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'ALL' | 'LULUS' | 'TIDAK LULUS'>('ALL');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [selectedMajorFilter, setSelectedMajorFilter] = useState<'ALL' | Major>('ALL');

  // Pagination state for Student Biodata & Student Grades tables
  const [studentPage, setStudentPage] = useState(1);
  const [studentPageSize, setStudentPageSize] = useState(5);
  const [gradePage, setGradePage] = useState(1);
  const [gradePageSize, setGradePageSize] = useState(5);

  // CSV Upload & Template Modal state ('students' | 'grades' | null)
  const [csvModalMode, setCsvModalMode] = useState<'students' | 'grades' | null>(null);

  // Guide Modal state
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [guideTopic, setGuideTopic] = useState<GuideTopicKey>('classes');

  // Supabase Menu Access Token Notification Modal state (Default Token: VIRGA100791)
  const [isSupabaseTokenModalOpen, setIsSupabaseTokenModalOpen] = useState(false);
  const [supabaseTokenInput, setSupabaseTokenInput] = useState('');
  const [supabaseTokenError, setSupabaseTokenError] = useState('');
  const [showSupabaseToken, setShowSupabaseToken] = useState(false);

  const handleClickSupabaseMenu = () => {
    if (activeTab === 'database') return;
    setSupabaseTokenInput('');
    setSupabaseTokenError('');
    setShowSupabaseToken(false);
    setIsSupabaseTokenModalOpen(true);
  };

  const handleVerifySupabaseToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (supabaseTokenInput.trim() === DEFAULT_SUPABASE_ACCESS_TOKEN) {
      setIsSupabaseTokenModalOpen(false);
      setSupabaseTokenInput('');
      setSupabaseTokenError('');
      setActiveTab('database');
    } else {
      setSupabaseTokenError(
        'Token keamanan tidak sesuai. Masukkan token akses yang benar untuk membuka menu Penyimpanan Supabase.'
      );
    }
  };

  const handleOpenContextualGuide = (overrideTopic?: GuideTopicKey) => {
    if (overrideTopic) {
      setGuideTopic(overrideTopic);
    } else if (activeTab === 'students') {
      if (studentSubTab === 'classes') setGuideTopic('classes');
      else if (studentSubTab === 'student_biodata') setGuideTopic('students');
      else setGuideTopic('grades');
    } else if (activeTab === 'letter_settings' || activeTab === 'letter_numbers') {
      setGuideTopic('letter_kop');
    } else if (activeTab === 'alumni') {
      setGuideTopic('alumni');
    } else if (activeTab === 'users' || activeTab === 'monitoring' || activeTab === 'database') {
      setGuideTopic('settings_supabase');
    } else {
      setGuideTopic('classes');
    }
    setIsGuideModalOpen(true);
  };

  // Bulk Move Students to Alumni selection state
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isBulkMovingToAlumni, setIsBulkMovingToAlumni] = useState(false);
  const [bulkAlumniBanner, setBulkAlumniBanner] = useState<string>('');

  // Student Editor Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddingNewStudent, setIsAddingNewStudent] = useState(false);
  const [studentModalSection, setStudentModalSection] = useState<'all' | 'biodata' | 'grades'>('all');
  const [studentModalError, setStudentModalError] = useState('');
  const [studentSavedBanner, setStudentSavedBanner] = useState<{
    ok: boolean;
    message: string;
    student?: StudentRecord;
  } | null>(null);
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null);
  const [manualStatusOverride, setManualStatusOverride] = useState<'AUTO' | GraduationStatus>('AUTO');
  const [isSavingStudent, setIsSavingStudent] = useState(false);

  // Delete inline confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Settings form state
  const [formSettings, setFormSettings] = useState<AnnouncementSettings>(settings);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSavedBanner, setSettingsSavedBanner] = useState('');

  useEffect(() => {
    setFormSettings(settings);
  }, [settings]);

  const scheduleDateValue = useMemo(() => {
    const d = new Date(formSettings.announcementTime);
    if (Number.isNaN(d.getTime())) return '2026-09-30';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [formSettings.announcementTime]);

  const scheduleTimeValue = useMemo(() => {
    const d = new Date(formSettings.announcementTime);
    if (Number.isNaN(d.getTime())) return '10:00';
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }, [formSettings.announcementTime]);

  const handleScheduleDateTimeChange = (nextDateStr: string, nextTimeStr: string) => {
    if (!nextDateStr || !nextTimeStr) return;
    const combined = new Date(`${nextDateStr}T${nextTimeStr}:00`);
    if (!Number.isNaN(combined.getTime())) {
      const isFuture = combined.getTime() > Date.now();
      setFormSettings((prev) => ({
        ...prev,
        announcementTime: combined.toISOString(),
        isPublished: !isFuture,
      }));
    }
  };

  const handleQuickSchedulePreset = async (offsetSeconds: number, publishState: boolean) => {
    const nextIso = new Date(Date.now() + offsetSeconds * 1000).toISOString();
    const updated: AnnouncementSettings = {
      ...formSettings,
      announcementTime: nextIso,
      isPublished: publishState,
    };
    setFormSettings(updated);
    await onSaveSettings(updated);
    setSettingsSavedBanner(
      publishState
        ? 'Pengumuman telah dibuka. Countdown timer kini disembunyikan dari halaman utama.'
        : 'Jadwal countdown aktif. Countdown timer ditampilkan hingga waktu pengumuman tiba.'
    );
  };

  // Statistics
  const stats = useMemo(() => {
    const total = students.length;
    const passed = students.filter((s) => s.status === 'LULUS').length;
    const failed = total - passed;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';
    const avgCohort =
      total > 0
        ? (students.reduce((acc, s) => acc + s.averageScore, 0) / total).toFixed(2)
        : '0.00';
    const checkedCount = students.filter((s) => Boolean(s.checkedAt)).length;
    return { total, passed, failed, passRate, avgCohort, checkedCount };
  }, [students]);

  const handleResetAllStudentFilters = () => {
    setSearchQuery('');
    setSelectedStatusFilter('ALL');
    setSelectedClassFilter('ALL');
    setSelectedMajorFilter('ALL');
    setStudentPage(1);
    setGradePage(1);
  };

  const isStudentFilterActive = Boolean(
    searchQuery.trim() ||
    selectedStatusFilter !== 'ALL' ||
    selectedClassFilter !== 'ALL' ||
    selectedMajorFilter !== 'ALL'
  );

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        s.fullName.toLowerCase().includes(q) ||
        s.nisn.toLowerCase().includes(q) ||
        s.examNumber.toLowerCase().includes(q) ||
        s.className.toLowerCase().includes(q);

      if (!matchesSearch) return false;
      if (selectedStatusFilter !== 'ALL' && s.status !== selectedStatusFilter) return false;
      if (selectedClassFilter !== 'ALL' && s.className !== selectedClassFilter) return false;
      if (selectedMajorFilter !== 'ALL' && s.major !== selectedMajorFilter) return false;
      return true;
    });
  }, [students, searchQuery, selectedStatusFilter, selectedClassFilter, selectedMajorFilter]);

  const homeroomLookup = useMemo(() => {
    const map: Record<string, ClassRoomRecord> = {};
    classRooms.forEach((c) => {
      map[c.className] = c;
    });
    return map;
  }, [classRooms]);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const enteredUser = loginUsername.trim();
    const enteredPass = loginPassword.trim();

    if (!enteredUser || !enteredPass) {
      setLoginError('Mohon isi Username / NIP dan Password / Kata Sandi Anda.');
      return;
    }

    const matchedUser = users.find(
      (u) =>
        u.isActive &&
        (u.username.toLowerCase() === enteredUser.toLowerCase() ||
          u.nip.toLowerCase() === enteredUser.toLowerCase()) &&
        u.accessPin === enteredPass
    );

    if (matchedUser) {
      setLoggedInUser(matchedUser);
      setIsAdminAuthenticated(true);
      setLoginError('');
      return;
    }

    // Fallback superadmin credentials
    if (
      (enteredUser.toLowerCase() === 'admin' || enteredUser.toLowerCase() === 'operator') &&
      (enteredPass === 'admin2026' || enteredPass === '123456')
    ) {
      setLoggedInUser(
        users[0] || {
          id: 'usr-admin-default',
          username: enteredUser,
          fullName: 'Administrator Utama',
          nip: '-',
          role: 'admin',
          assignedClass: '-',
          accessPin: enteredPass,
          isActive: true,
          updatedAt: new Date().toISOString(),
        }
      );
      setIsAdminAuthenticated(true);
      setLoginError('');
      return;
    }

    setLoginError(
      'Username/NIP atau Password tidak sesuai, atau akun sedang dinonaktifkan. Silakan periksa kembali kredensial Anda.'
    );
  };

  const handleLogoutAdmin = () => {
    setIsAdminAuthenticated(false);
    setLoggedInUser(null);
    setLoginPassword('');
    setLoginError('');
  };

  const getDefaultLetterTemplateForMajor = (major: Major): LetterNumberRecord | null => {
    const activeForMajor = letterNumbers.find(
      (item) => item.isDefault && (item.majorTarget === major || item.majorTarget === 'SEMUA')
    );
    const anyForMajor = letterNumbers.find(
      (item) => item.majorTarget === major || item.majorTarget === 'SEMUA'
    );
    return activeForMajor || anyForMajor || letterNumbers[0] || null;
  };

  const getNextStudentSequenceNumber = (): number => {
    let maxSeq = students.length + alumni.length;
    [...students, ...alumni].forEach((rec) => {
      const idMatch = rec.id.match(/(\d+)$/);
      if (idMatch) {
        const val = parseInt(idMatch[1], 10);
        if (!Number.isNaN(val) && val < 10000 && val > maxSeq) {
          maxSeq = val;
        }
      }
      const examMatch = rec.examNumber.match(/-0*(\d{1,4})-\d$/);
      if (examMatch) {
        const val = parseInt(examMatch[1], 10);
        if (!Number.isNaN(val) && val > maxSeq) {
          maxSeq = val;
        }
      }
    });
    return maxSeq + 1;
  };

  const generateUniqueNisn = (): string => {
    const existingNisns = new Set(
      [...students, ...alumni].map((s) => s.nisn.trim())
    );
    for (let attempt = 0; attempt < 50; attempt++) {
      const candidate = `008${String(Math.floor(1000000 + Math.random() * 8999999))}`;
      if (!existingNisns.has(candidate)) {
        return candidate;
      }
    }
    return `008${String(Date.now()).slice(-7)}`;
  };

  const generateExamNumberForSequence = (seq: number): string => {
    const paddedSeq = String(Math.max(1, seq)).padStart(4, '0');
    const checkDigit = (Math.max(1, seq) % 9) + 1;
    return `26-01-0145-${paddedSeq}-${checkDigit}`;
  };

  const openAddStudentModal = () => {
    const nextIndex = getNextStudentSequenceNumber();
    const paddedIdx = String(nextIndex).padStart(3, '0');

    const preselectedClassObj =
      selectedClassFilter !== 'ALL'
        ? classRooms.find((c) => c.className === selectedClassFilter) || classRooms[0]
        : classRooms[0];

    const defaultClass = preselectedClassObj?.className || 'XII MIPA 1';
    const defaultMajor: Major =
      preselectedClassObj?.major ||
      (defaultClass.toUpperCase().includes('IPS')
        ? 'IPS'
        : defaultClass.toUpperCase().includes('BHS')
          ? 'BHS'
          : defaultClass.toUpperCase().includes('UMM')
            ? 'UMM'
            : 'MIPA');

    const defaultSubjects = buildSubjectsFromCatalog(
      subjectCatalog,
      defaultMajor,
      [85, 84, 86, 82, 85, 80, 82, 84],
      settings.passingGradeKkm
    );
    const summary = computeAcademicSummary(defaultSubjects, settings.passingGradeKkm);
    const letterTpl = getDefaultLetterTemplateForMajor(defaultMajor);
    const generatedSklNumber = letterTpl
      ? formatLetterNumberFromTemplate(letterTpl, nextIndex)
      : `421.3/${paddedIdx}/SKL-SMAN1/V/2026`;

    setEditingStudent({
      id: `std-${Date.now()}`,
      nisn: generateUniqueNisn(),
      examNumber: generateExamNumberForSequence(nextIndex),
      fullName: '',
      birthPlace: 'Ciamis',
      birthDate: '2008-06-15',
      className: defaultClass,
      major: defaultMajor,
      averageScore: summary.averageScore,
      status: summary.status,
      predicate: summary.predicate,
      sklNumber: generatedSklNumber,
      subjects: defaultSubjects,
      notes: 'Memenuhi seluruh kriteria kelulusan satuan pendidikan.',
      checkedAt: null,
      checkCount: 0,
      updatedAt: new Date().toISOString(),
    });
    setIsAddingNewStudent(true);
    setStudentModalSection('all');
    setStudentModalError('');
    setManualStatusOverride('AUTO');
    setIsModalOpen(true);
  };

  const openEditStudentModal = (
    student: StudentRecord,
    initialSection: 'all' | 'biodata' | 'grades' = 'all'
  ) => {
    const syncedSubjects = buildSubjectsFromCatalog(
      subjectCatalog,
      student.major,
      student.subjects,
      settings.passingGradeKkm
    );
    const summary = computeAcademicSummary(
      syncedSubjects,
      settings.passingGradeKkm,
      student.status
    );
    setEditingStudent(
      JSON.parse(
        JSON.stringify({
          ...student,
          subjects: syncedSubjects,
          averageScore: summary.averageScore,
          predicate: summary.predicate,
        })
      )
    );
    setIsAddingNewStudent(false);
    setStudentModalSection(initialSection);
    setStudentModalError('');
    setManualStatusOverride('AUTO');
    setIsModalOpen(true);
  };

  const handleMajorChangeInModal = (major: Major) => {
    if (!editingStudent) return;
    const updatedSubjects = buildSubjectsFromCatalog(
      subjectCatalog,
      major,
      editingStudent.subjects,
      settings.passingGradeKkm
    );
    const summary = computeAcademicSummary(
      updatedSubjects,
      settings.passingGradeKkm,
      manualStatusOverride === 'AUTO' ? undefined : manualStatusOverride
    );
    const currentClassObj = classRooms.find((c) => c.className === editingStudent.className);
    const matchingClass =
      currentClassObj && currentClassObj.major === major
        ? currentClassObj.className
        : classRooms.find((c) => c.major === major)?.className ||
          (major === 'MIPA'
            ? 'XII MIPA 1'
            : major === 'IPS'
              ? 'XII IPS 1'
              : major === 'BHS'
                ? 'XII BHS 1'
                : 'XII UMM 1');
    const letterTpl = getDefaultLetterTemplateForMajor(major);
    const existingIdx = students.findIndex((s) => s.id === editingStudent.id);
    const studentIdx = existingIdx >= 0 ? existingIdx + 1 : getNextStudentSequenceNumber();
    const updatedSkl = letterTpl
      ? formatLetterNumberFromTemplate(letterTpl, studentIdx)
      : editingStudent.sklNumber;

    setEditingStudent({
      ...editingStudent,
      major,
      className: matchingClass,
      sklNumber: updatedSkl,
      subjects: updatedSubjects,
      averageScore: summary.averageScore,
      status: summary.status,
      predicate: summary.predicate,
    });
  };

  const handleClassChangeInModal = (nextClassName: string) => {
    if (!editingStudent) return;
    const matchedClass = classRooms.find((c) => c.className === nextClassName);
    const inferredMajor: 'MIPA' | 'IPS' =
      matchedClass?.major ||
      (nextClassName.toUpperCase().includes('IPS') ? 'IPS' : editingStudent.major);

    if (inferredMajor !== editingStudent.major) {
      const updatedSubjects = buildSubjectsFromCatalog(
        subjectCatalog,
        inferredMajor,
        editingStudent.subjects,
        settings.passingGradeKkm
      );
      const summary = computeAcademicSummary(
        updatedSubjects,
        settings.passingGradeKkm,
        manualStatusOverride === 'AUTO' ? undefined : manualStatusOverride
      );
      const letterTpl = getDefaultLetterTemplateForMajor(inferredMajor);
      const existingIdx = students.findIndex((s) => s.id === editingStudent.id);
      const studentIdx = existingIdx >= 0 ? existingIdx + 1 : getNextStudentSequenceNumber();
      const updatedSkl = letterTpl
        ? formatLetterNumberFromTemplate(letterTpl, studentIdx)
        : editingStudent.sklNumber;

      setEditingStudent({
        ...editingStudent,
        className: nextClassName,
        major: inferredMajor,
        sklNumber: updatedSkl,
        subjects: updatedSubjects,
        averageScore: summary.averageScore,
        status: summary.status,
        predicate: summary.predicate,
      });
    } else {
      setEditingStudent({
        ...editingStudent,
        className: nextClassName,
      });
    }
  };

  const handleApplyPresetScoresInModal = (presetScore: number) => {
    if (!editingStudent) return;
    const clamped = Math.max(0, Math.min(100, presetScore));
    const nextSubjects = editingStudent.subjects.map((subj) => ({
      ...subj,
      score: clamped,
    }));
    const summary = computeAcademicSummary(
      nextSubjects,
      settings.passingGradeKkm,
      manualStatusOverride === 'AUTO' ? undefined : manualStatusOverride
    );
    setEditingStudent({
      ...editingStudent,
      subjects: nextSubjects,
      averageScore: summary.averageScore,
      status: summary.status,
      predicate: summary.predicate,
    });
  };

  const handleSubjectScoreChange = (idx: number, rawValue: string) => {
    if (!editingStudent) return;
    const num = Math.max(0, Math.min(100, Number(rawValue) || 0));
    const nextSubjects = editingStudent.subjects.map((subj, i) =>
      i === idx ? { ...subj, score: num } : subj
    );
    const summary = computeAcademicSummary(
      nextSubjects,
      settings.passingGradeKkm,
      manualStatusOverride === 'AUTO' ? undefined : manualStatusOverride
    );
    setEditingStudent({
      ...editingStudent,
      subjects: nextSubjects,
      averageScore: summary.averageScore,
      status: summary.status,
      predicate: summary.predicate,
    });
  };

  const handleStatusOverrideChange = (mode: 'AUTO' | GraduationStatus) => {
    setManualStatusOverride(mode);
    if (!editingStudent) return;
    const summary = computeAcademicSummary(
      editingStudent.subjects,
      settings.passingGradeKkm,
      mode === 'AUTO' ? undefined : mode
    );
    setEditingStudent({
      ...editingStudent,
      averageScore: summary.averageScore,
      status: summary.status,
      predicate: summary.predicate,
    });
  };

  const handleSaveStudentModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    const cleanFullName = editingStudent.fullName.trim();
    const cleanNisn = editingStudent.nisn.trim();
    const cleanExamNumber = editingStudent.examNumber.trim();
    const cleanBirthPlace = editingStudent.birthPlace.trim() || 'Ciamis';
    const cleanBirthDate = editingStudent.birthDate.trim() || '2008-06-15';

    if (!cleanFullName) {
      setStudentModalError('Nama Lengkap Siswa wajib diisi sebelum menyimpan data.');
      setStudentModalSection('biodata');
      return;
    }

    if (!cleanNisn || cleanNisn.length < 5) {
      setStudentModalError('NISN wajib diisi minimal 5–10 digit angka untuk login siswa.');
      setStudentModalSection('biodata');
      return;
    }

    if (!cleanExamNumber) {
      setStudentModalError('Nomor Peserta Ujian wajib diisi.');
      setStudentModalSection('biodata');
      return;
    }

    const duplicateNisnStudent = students.find(
      (s) => s.id !== editingStudent.id && s.nisn.trim().toLowerCase() === cleanNisn.toLowerCase()
    );

    if (isAddingNewStudent && duplicateNisnStudent) {
      setStudentModalError(
        `NISN "${cleanNisn}" sudah terdaftar atas nama "${duplicateNisnStudent.fullName}" (${duplicateNisnStudent.className}). Silakan gunakan NISN lain atau klik tombol "Generate NISN Unik".`
      );
      setStudentModalSection('biodata');
      return;
    }

    const syncedSubjects =
      editingStudent.subjects && editingStudent.subjects.length > 0
        ? editingStudent.subjects
        : buildSubjectsFromCatalog(
            subjectCatalog,
            editingStudent.major,
            [85, 84, 86, 82, 85, 80, 82, 84],
            settings.passingGradeKkm
          );

    const summary = computeAcademicSummary(
      syncedSubjects,
      settings.passingGradeKkm,
      manualStatusOverride === 'AUTO' ? undefined : manualStatusOverride
    );

    const finalizedStudent: StudentRecord = {
      ...editingStudent,
      fullName: cleanFullName,
      nisn: cleanNisn,
      examNumber: cleanExamNumber,
      birthPlace: cleanBirthPlace,
      birthDate: cleanBirthDate,
      subjects: syncedSubjects,
      averageScore: summary.averageScore,
      status: summary.status,
      predicate: summary.predicate,
      updatedAt: new Date().toISOString(),
    };

    setIsSavingStudent(true);
    setStudentModalError('');
    try {
      await onSaveStudent(finalizedStudent);
      if (isAddingNewStudent) {
        setStudentPage(1);
        setGradePage(1);
        if (
          selectedClassFilter !== 'ALL' &&
          selectedClassFilter !== finalizedStudent.className
        ) {
          setSelectedClassFilter('ALL');
        }
        if (
          selectedStatusFilter !== 'ALL' &&
          selectedStatusFilter !== finalizedStudent.status
        ) {
          setSelectedStatusFilter('ALL');
        }
        if (
          selectedMajorFilter !== 'ALL' &&
          selectedMajorFilter !== finalizedStudent.major
        ) {
          setSelectedMajorFilter('ALL');
        }
        if (searchQuery.trim()) {
          setSearchQuery('');
        }
      }
      setStudentSavedBanner({
        ok: true,
        message: isAddingNewStudent
          ? `Data siswa baru "${finalizedStudent.fullName}" (NISN: ${finalizedStudent.nisn} · Kelas ${finalizedStudent.className}) berhasil ditambahkan dan disimpan ke tabel public.students.`
          : `Data siswa "${finalizedStudent.fullName}" (NISN: ${finalizedStudent.nisn} · Kelas ${finalizedStudent.className}) berhasil diperbarui.`,
        student: finalizedStudent,
      });
      setIsModalOpen(false);
      setEditingStudent(null);
    } catch (err: any) {
      setStudentModalError(
        err?.message || 'Terjadi kesalahan saat menyimpan data siswa. Silakan coba lagi.'
      );
    } finally {
      setIsSavingStudent(false);
    }
  };

  const handleQuickTogglePassStatus = async (student: StudentRecord) => {
    const nextStatus: GraduationStatus =
      student.status === 'LULUS' ? 'TIDAK LULUS' : 'LULUS';
    const summary = computeAcademicSummary(
      student.subjects,
      settings.passingGradeKkm,
      nextStatus
    );
    await onSaveStudent({
      ...student,
      status: nextStatus,
      predicate: summary.predicate,
    });
  };

  const handleToggleAnnouncementPublish = async () => {
    const nextPublished = !settings.isPublished;
    let nextTime = settings.announcementTime;
    if (!nextPublished && new Date(settings.announcementTime).getTime() <= Date.now()) {
      // Default to 1 hour countdown when locking manually if previous target time already passed
      nextTime = new Date(Date.now() + 3600 * 1000).toISOString();
    } else if (nextPublished) {
      nextTime = new Date().toISOString();
    }
    const updated: AnnouncementSettings = {
      ...settings,
      isPublished: nextPublished,
      announcementTime: nextTime,
    };
    setFormSettings(updated);
    await onSaveSettings(updated);
  };

  const handleSaveSettingsForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsSavedBanner('');
    await onSaveSettings(formSettings);
    setIsSavingSettings(false);
    setSettingsSavedBanner('Pengaturan jadwal pengumuman dan parameter SKL berhasil disimpan.');
  };

  const handleExportCSV = () => {
    const headers = [
      'NISN',
      'No_Ujian',
      'Nama_Lengkap',
      'Tempat_Lahir',
      'Tanggal_Lahir',
      'Kelas',
      'Peminatan',
      'Rata_Rata_Nilai',
      'Status_Kelulusan',
      'Predikat',
      'Nomor_SKL',
      'Sudah_Cek_Hasil',
    ];
    const rows = students.map((s) => [
      `"${s.nisn}"`,
      `"${s.examNumber}"`,
      `"${s.fullName}"`,
      `"${s.birthPlace}"`,
      `"${s.birthDate}"`,
      `"${s.className}"`,
      `"${s.major}"`,
      s.averageScore.toFixed(2),
      `"${s.status}"`,
      `"${s.predicate}"`,
      `"${s.sklNumber}"`,
      s.checkedAt ? `"Sudah (${s.checkCount}x)"` : '"Belum"',
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekap_Kelulusan_${settings.schoolNpsn}_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Admin Login Panel (Replaces single PIN access gate)
  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-palette-background flex flex-col justify-between p-3.5 sm:p-6 gap-6">
        <div className="max-w-6xl w-full mx-auto flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBackToLanding}
            className="inline-flex items-center gap-2 text-xs font-medium text-palette-text hover:text-palette-primary py-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span>Kembali ke Portal Pengumuman Siswa</span>
          </button>
          <span className="text-xs font-mono tabular-nums text-palette-text/70">
            NPSN {settings.schoolNpsn}
          </span>
        </div>

        <div className="max-w-4xl w-full mx-auto grid grid-cols-1 md:grid-cols-12 bg-white border border-palette-accent rounded-xl overflow-hidden my-auto shadow-xs">
          {/* Left Column: Login Panel Visual Asset (Full-bleed with p-0 m-0, object-fit: cover, object-position: center) */}
          <div className="md:col-span-5 bg-palette-background border-b md:border-b-0 md:border-r border-palette-accent p-0 m-0 relative overflow-hidden min-h-[220px] sm:min-h-[260px] md:min-h-[360px] flex items-center justify-center">
            {isLoadingLoginImage ? (
              <div
                className="w-full h-full min-h-[220px] sm:min-h-[260px] p-0 m-0 bg-palette-accent/55 animate-pulse flex items-center justify-center"
                role="status"
                aria-label="Memuat visual panel login..."
              />
            ) : loginPanelImageSrc && !loginImageError ? (
              <img
                src={loginPanelImageSrc}
                alt="Panel Login Sipinter-Lulus SMAN 1 Lumbung Ciamis"
                onError={() => setLoginImageError(true)}
                referrerPolicy="no-referrer"
                className="block w-full h-full p-0 m-0 object-cover object-center select-none"
              />
            ) : (
              <div className="p-6 text-center space-y-2 mx-auto my-auto">
                <GraduationCap className="w-8 h-8 text-palette-primary mx-auto opacity-80" />
                <p className="text-xs font-semibold text-palette-text">
                  &ldquo;Sipinter-Lulus&rdquo;
                </p>
                <p className="text-[11px] text-palette-text/65">{settings.schoolName}</p>
              </div>
            )}
          </div>

          {/* Right Column: Login Form */}
          <div className="md:col-span-7 p-5 sm:p-8 space-y-5 sm:space-y-6 flex flex-col justify-center">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-palette-primary uppercase tracking-wider">
                &ldquo;Sipinter-Lulus&rdquo; · SMAN 1 Lumbung Ciamis
              </p>
              <h1 className="font-display text-xl sm:text-2xl font-bold text-palette-text">
                Login Panel Dashboard
              </h1>
              <p className="text-xs text-palette-text/75 leading-relaxed">
                Masuk menggunakan akun <strong>Admin / Operator</strong>, <strong>Guru Mapel</strong>,
                atau <strong>Wali Kelas</strong> untuk mengelola data akademik dan kelulusan.
              </p>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label
                  htmlFor="login-username"
                  className="block text-xs font-semibold text-palette-text mb-1.5"
                >
                  Username atau NIP Pengguna
                </label>
                <input
                  id="login-username"
                  type="text"
                  required
                  value={loginUsername}
                  onChange={(e) => {
                    setLoginUsername(e.target.value);
                    if (loginError) setLoginError('');
                  }}
                  placeholder="Masukkan Username atau NIP Pengguna"
                  className="w-full px-3.5 py-2.5 min-h-[42px] text-xs sm:text-sm bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary font-mono text-palette-text"
                />
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-palette-text mb-1.5"
                >
                  Password / Kata Sandi
                </label>
                <div className="relative w-full">
                  <input
                    id="login-password"
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value);
                      if (loginError) setLoginError('');
                    }}
                    placeholder="Masukkan Password Akun..."
                    className="w-full pl-3.5 pr-11 py-2.5 min-h-[42px] text-xs sm:text-sm bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary font-mono text-palette-text"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword((prev) => !prev)}
                    aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showLoginPassword}
                    title={showLoginPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 flex items-center justify-center w-10 text-palette-text/60 hover:text-palette-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-palette-primary rounded-r-lg transition-colors cursor-pointer"
                  >
                    {showLoginPassword ? (
                      <EyeOff className="w-4 h-4 shrink-0" aria-hidden="true" />
                    ) : (
                      <Eye className="w-4 h-4 shrink-0" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              {loginError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
                  {loginError}
                </div>
              )}

              <div className="pt-1">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 min-h-[42px] text-xs sm:text-sm font-semibold text-white bg-palette-primary rounded-lg hover:bg-palette-text transition-colors cursor-pointer"
                >
                  Masuk ke Dashboard
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="text-center text-[11px] sm:text-xs text-palette-text/60 px-2 leading-relaxed">
          © 2026 &ldquo;Sipinter-Lulus&rdquo; · Tahun Pembuatan: 2026 · Sistem Manajemen Kelulusan
          Terpadu · {settings.schoolName}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-palette-background text-palette-text flex flex-col lg:flex-row">
      {/* Mobile Drawer Backdrop Overlay (< 1024px) */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-palette-text/50 backdrop-blur-xs lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Left Sidebar Navigation (Drawer on Mobile/Tablet < 1024px, Permanent Sidebar on Desktop >= 1024px) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white border-r border-palette-accent flex flex-col justify-between overflow-y-auto transition-transform duration-200 ease-out lg:static lg:z-auto lg:w-64 lg:max-w-none lg:translate-x-0 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen ${
          isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div className="p-5 space-y-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold text-palette-primary">
                SMAN 1 Lumbung Ciamis
              </p>
              <h2 className="font-display text-lg font-bold tracking-tight text-palette-text">
                &ldquo;Sipinter-Lulus&rdquo;
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden inline-flex items-center justify-center w-9 h-9 text-palette-text/75 hover:text-palette-text hover:bg-palette-accent/40 border border-palette-accent rounded-lg cursor-pointer"
              aria-label="Tutup menu navigasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <nav className="space-y-4 text-left">
            {/* Section 1: Ringkasan & Analitik */}
            <div className="space-y-1.5">
              <div className="px-1.5 flex items-center justify-between">
                <p className="text-[10px] font-bold text-palette-text/60 uppercase tracking-wider font-mono">
                  Menu Utama · Analitik
                </p>
              </div>

              {/* Menu 0: Dashboard Analitik */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('analytics');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 min-h-[40px] rounded-lg text-xs font-semibold text-left transition-colors cursor-pointer ${
                  activeTab === 'analytics'
                    ? 'bg-palette-primary text-white shadow-xs'
                    : 'text-palette-text hover:bg-palette-accent/40'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0 flex-1 text-left">
                  <BarChart3 className="w-4 h-4 shrink-0" />
                  <span className="truncate text-left">Dashboard Analitik</span>
                </span>
                <span
                  className={`font-mono tabular-nums text-[11px] px-1.5 py-0.5 rounded shrink-0 ${
                    activeTab === 'analytics'
                      ? 'bg-white/20 text-white'
                      : 'bg-palette-accent text-palette-text'
                  }`}
                >
                  Live
                </span>
              </button>
            </div>

            {/* Section 2: Modul Akademik & Siswa */}
            <div className="space-y-1.5 pt-1">
              <div className="px-1.5 flex items-center justify-between">
                <p className="text-[10px] font-bold text-palette-text/60 uppercase tracking-wider font-mono">
                  Menu Modul Akademik
                </p>
              </div>

              {/* Menu 1: Data & Nilai Siswa + 4 Sub-menus */}
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('students')}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 min-h-[40px] rounded-lg text-xs font-semibold text-left transition-colors cursor-pointer ${
                    activeTab === 'students'
                      ? 'bg-palette-primary text-white shadow-xs'
                      : 'text-palette-text hover:bg-palette-accent/40'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0 flex-1 text-left">
                    <Users className="w-4 h-4 shrink-0" />
                    <span className="truncate text-left">Data & Nilai Siswa</span>
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                      activeTab === 'students' ? 'rotate-0' : '-rotate-90'
                    }`}
                  />
                </button>

                {/* Sub-menu items under Data & Nilai Siswa */}
                <div className="pl-3.5 ml-2 border-l-2 border-palette-accent space-y-1 py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('students');
                      setStudentSubTab('classes');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 min-h-[38px] rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                      activeTab === 'students' && studentSubTab === 'classes'
                        ? 'bg-palette-accent text-palette-text font-semibold'
                        : 'text-palette-text/75 hover:bg-palette-accent/35'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0 flex-1 text-left">
                      <Building2 className="w-3.5 h-3.5 text-palette-primary shrink-0" />
                      <span className="truncate text-left">Data Kelas & Wali Kelas</span>
                    </span>
                    <span className="font-mono tabular-nums text-[11px] shrink-0">
                      {classRooms.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('students');
                      setStudentSubTab('subjects');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 min-h-[38px] rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                      activeTab === 'students' && studentSubTab === 'subjects'
                        ? 'bg-palette-accent text-palette-text font-semibold'
                        : 'text-palette-text/75 hover:bg-palette-accent/35'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0 flex-1 text-left">
                      <BookOpen className="w-3.5 h-3.5 text-palette-primary shrink-0" />
                      <span className="truncate text-left">Mata Pelajaran</span>
                    </span>
                    <span className="font-mono tabular-nums text-[11px] shrink-0">
                      {subjectCatalog.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('students');
                      setStudentSubTab('student_biodata');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 min-h-[38px] rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                      activeTab === 'students' && studentSubTab === 'student_biodata'
                        ? 'bg-palette-accent text-palette-text font-semibold'
                        : 'text-palette-text/75 hover:bg-palette-accent/35'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0 flex-1 text-left">
                      <Users className="w-3.5 h-3.5 text-palette-primary shrink-0" />
                      <span className="truncate text-left">Data Siswa</span>
                    </span>
                    <span className="font-mono tabular-nums text-[11px] shrink-0">
                      {students.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('students');
                      setStudentSubTab('student_grades');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 min-h-[38px] rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                      activeTab === 'students' && studentSubTab === 'student_grades'
                        ? 'bg-palette-accent text-palette-text font-semibold'
                        : 'text-palette-text/75 hover:bg-palette-accent/35'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0 flex-1 text-left">
                      <BookOpen className="w-3.5 h-3.5 text-palette-primary shrink-0" />
                      <span className="truncate text-left">Data Nilai</span>
                    </span>
                    <span className="font-mono tabular-nums text-[11px] shrink-0">
                      {subjectCatalog.length} Mapel
                    </span>
                  </button>
                </div>
              </div>

              {/* Menu 2: Pengaturan KOP & Surat + 2 Sub-menus */}
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('letter_settings');
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 min-h-[40px] rounded-lg text-xs font-semibold text-left transition-colors cursor-pointer ${
                    activeTab === 'letter_settings' || activeTab === 'letter_numbers'
                      ? 'bg-palette-primary text-white shadow-xs'
                      : 'text-palette-text hover:bg-palette-accent/40'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0 flex-1 text-left">
                    <FileText className="w-4 h-4 shrink-0" />
                    <span className="truncate text-left">Pengaturan KOP & Surat</span>
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                      activeTab === 'letter_settings' || activeTab === 'letter_numbers'
                        ? 'rotate-0'
                        : '-rotate-90'
                    }`}
                  />
                </button>

                {/* Sub-menu items under Pengaturan KOP & Surat */}
                <div className="pl-3.5 ml-2 border-l-2 border-palette-accent space-y-1 py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('letter_settings');
                      setLetterSubTab('kop_format');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 min-h-[38px] rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                      (activeTab === 'letter_settings' || activeTab === 'letter_numbers') &&
                      letterSubTab === 'kop_format'
                        ? 'bg-palette-accent text-palette-text font-semibold'
                        : 'text-palette-text/75 hover:bg-palette-accent/35'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0 flex-1 text-left">
                      <Building2 className="w-3.5 h-3.5 text-palette-primary shrink-0" />
                      <span className="truncate text-left">Format KOP Surat</span>
                    </span>
                    <span className="text-[10px] font-mono font-medium text-palette-primary shrink-0">
                      Resmi
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('letter_settings');
                      setLetterSubTab('letter_numbers');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 min-h-[38px] rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                      (activeTab === 'letter_settings' || activeTab === 'letter_numbers') &&
                      letterSubTab === 'letter_numbers'
                        ? 'bg-palette-accent text-palette-text font-semibold'
                        : 'text-palette-text/75 hover:bg-palette-accent/35'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0 flex-1 text-left">
                      <FileText className="w-3.5 h-3.5 text-palette-primary shrink-0" />
                      <span className="truncate text-left">Data Nomor Surat</span>
                    </span>
                    <span className="font-mono tabular-nums text-[11px] shrink-0">
                      {letterNumbers.length}
                    </span>
                  </button>
                </div>
              </div>

              {/* Menu 3: Data Alumni */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('alumni');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 min-h-[40px] rounded-lg text-xs font-semibold text-left transition-colors cursor-pointer ${
                  activeTab === 'alumni'
                    ? 'bg-palette-primary text-white shadow-xs'
                    : 'text-palette-text hover:bg-palette-accent/40'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0 flex-1 text-left">
                  <GraduationCap className="w-4 h-4 shrink-0" />
                  <span className="truncate text-left">Data Alumni</span>
                </span>
                <span
                  className={`font-mono tabular-nums text-[11px] px-1.5 py-0.5 rounded shrink-0 ${
                    activeTab === 'alumni'
                      ? 'bg-white/20 text-white'
                      : 'bg-palette-accent text-palette-text'
                  }`}
                >
                  {alumni.length}
                </span>
              </button>
            </div>

            {/* Section 3: Pengaturan & Sistem */}
            <div className="space-y-1.5 pt-1">
              <div className="px-1.5 flex items-center justify-between">
                <p className="text-[10px] font-bold text-palette-text/60 uppercase tracking-wider font-mono">
                  Menu Sistem & Konfigurasi
                </p>
              </div>

              {/* Menu 3: Manajemen User */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('users');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 min-h-[40px] rounded-lg text-xs font-semibold text-left transition-colors cursor-pointer ${
                  activeTab === 'users'
                    ? 'bg-palette-primary text-white shadow-xs'
                    : 'text-palette-text hover:bg-palette-accent/40'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0 flex-1 text-left">
                  <UserCog className="w-4 h-4 shrink-0" />
                  <span className="truncate text-left">Manajemen User</span>
                </span>
                <span
                  className={`font-mono tabular-nums text-[11px] px-1.5 py-0.5 rounded shrink-0 ${
                    activeTab === 'users'
                      ? 'bg-white/20 text-white'
                      : 'bg-palette-accent text-palette-text'
                  }`}
                >
                  {users.length}
                </span>
              </button>

              {/* Menu 3: Status & Pengaturan */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('monitoring');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 min-h-[40px] rounded-lg text-xs font-semibold text-left transition-colors cursor-pointer ${
                  activeTab === 'monitoring'
                    ? 'bg-palette-primary text-white shadow-xs'
                    : 'text-palette-text hover:bg-palette-accent/40'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0 flex-1 text-left">
                  <Settings className="w-4 h-4 shrink-0" />
                  <span className="truncate text-left">Status & Pengaturan</span>
                </span>
                <span
                  className={`text-[11px] font-mono shrink-0 ${
                    activeTab === 'monitoring'
                      ? 'text-white'
                      : settings.isPublished
                        ? 'text-emerald-700'
                        : 'text-amber-700'
                  }`}
                >
                  {settings.isPublished ? 'Aktif' : 'Tutup'}
                </span>
              </button>

              {/* Menu 4: Penyimpanan Supabase */}
              <button
                type="button"
                onClick={handleClickSupabaseMenu}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 min-h-[40px] rounded-lg text-xs font-semibold text-left transition-colors cursor-pointer ${
                  activeTab === 'database'
                    ? 'bg-palette-primary text-white shadow-xs'
                    : 'text-palette-text hover:bg-palette-accent/40'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0 flex-1 text-left">
                  <Database className="w-4 h-4 shrink-0" />
                  <span className="truncate text-left">Penyimpanan Supabase</span>
                </span>
                <span className="inline-flex items-center gap-1.5 shrink-0">
                  <KeyRound
                    className={`w-3 h-3 ${
                      activeTab === 'database' ? 'text-white/90' : 'text-palette-primary'
                    }`}
                  />
                  <span
                    className={`w-2 h-2 rounded-full ${
                      syncStatus.connected ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  />
                </span>
              </button>
            </div>
          </nav>
        </div>

        {/* Bottom Session & Logout Block (Visible on both Mobile Drawer and Desktop Sidebar) */}
        <div className="p-5 border-t border-palette-accent space-y-3">
          {loggedInUser && (
            <div className="p-3 bg-palette-accent/35 rounded-lg border border-palette-accent space-y-1">
              <div className="flex items-center justify-between gap-1.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-palette-primary">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Sesi Login Aktif</span>
                </span>
                <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-white text-palette-text border border-palette-accent">
                  {loggedInUser.role.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs font-semibold text-palette-text truncate">
                {loggedInUser.fullName}
              </p>
              <p className="text-[11px] font-mono text-palette-text/70 truncate">
                @{loggedInUser.username} · {loggedInUser.assignedClass}
              </p>
            </div>
          )}

          <div className="p-3 bg-palette-background rounded-lg border border-palette-accent space-y-1">
            <p className="text-xs font-semibold text-palette-text">{settings.schoolName}</p>
            <p className="text-xs text-palette-text/70 font-mono tabular-nums">
              TA {settings.academicYear} · KKM {settings.passingGradeKkm.toFixed(1)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onBackToLanding}
              className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 min-h-[38px] text-xs font-semibold text-palette-text bg-palette-background border border-palette-accent rounded-lg hover:bg-palette-accent/60 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Portal Siswa</span>
            </button>
            <button
              type="button"
              onClick={handleLogoutAdmin}
              className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 min-h-[38px] text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Workspace Bar */}
        <header className="min-h-16 py-2.5 bg-white border-b border-palette-accent px-4 sm:px-6 flex flex-wrap items-center justify-between gap-2.5 sm:gap-4 shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg bg-palette-background border border-palette-accent text-palette-text hover:bg-palette-accent/50 shrink-0 cursor-pointer"
              aria-label="Buka menu navigasi"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-palette-text/70 truncate min-w-0">
              <span className="hidden sm:inline shrink-0">Panel Akademik</span>
              <span aria-hidden="true" className="hidden sm:inline shrink-0">
                /
              </span>
              <span className="font-semibold text-palette-text truncate">
                {activeTab === 'analytics' && 'Dashboard Analitik & Capaian Akademik'}
                {activeTab === 'students' &&
                  (studentSubTab === 'classes'
                    ? 'Data Kelas & Wali Kelas'
                    : studentSubTab === 'subjects'
                      ? 'Mata Pelajaran'
                      : studentSubTab === 'student_biodata'
                        ? 'Data Siswa'
                        : 'Data Nilai & Kelulusan')}
                {activeTab === 'letter_numbers' && 'Data Nomor Surat SKL'}
                {activeTab === 'alumni' && 'Manajemen Data Alumni & Tracer Study'}
                {activeTab === 'users' && 'Manajemen User & Role'}
                {activeTab === 'monitoring' && 'Status & Pengaturan Pengumuman'}
                {activeTab === 'database' && 'Penyimpanan Cloud Supabase'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={handleManualTableRefresh}
              disabled={isFetchingTable}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-semibold text-palette-text bg-palette-background border border-palette-accent hover:bg-palette-accent/50 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
              title="Muat ulang data dari database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetchingTable ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">Muat Ulang</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenContextualGuide()}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-semibold text-palette-primary bg-palette-accent/50 border border-palette-accent hover:bg-palette-accent transition-colors cursor-pointer whitespace-nowrap"
            >
              <HelpCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Panduan Pengisian (Guide)</span>
              <span className="sm:hidden">Panduan</span>
            </button>

            <button
              type="button"
              onClick={handleToggleAnnouncementPublish}
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                settings.isPublished
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100'
                  : 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100'
              }`}
            >
              {settings.isPublished ? (
                <>
                  <Unlock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span className="hidden sm:inline">Pengumuman: DIBUKA</span>
                  <span className="sm:hidden">DIBUKA</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span className="hidden sm:inline">Pengumuman: DITUTUP</span>
                  <span className="sm:hidden">DITUTUP</span>
                </>
              )}
            </button>
          </div>
        </header>

        <main className="p-4 sm:p-6 max-w-[1440px] w-full mx-auto space-y-5 sm:space-y-6">
          {/* TAB 0: DASHBOARD ANALITIK (KPI Summary Strip + Analytics Charts ONLY shown here) */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {/* KPI Summary Strip with Trend Indicators */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-palette-accent rounded-xl p-5 flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-palette-text/75">
                      Total Peserta Didik Aktif
                    </p>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-mono font-semibold">
                      <TrendingUp className="w-3 h-3" />
                      <span>+4.5% vs TA Lalu</span>
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <p className="font-mono tabular-nums text-2xl font-bold text-palette-text">
                      {stats.total}
                    </p>
                    <span className="text-xs text-palette-primary font-medium">
                      {classRooms.length} Kelas · {alumni.length} Alumni
                    </span>
                  </div>
                </div>

                <div className="bg-white border border-palette-accent rounded-xl p-5 flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-palette-text/75">Dinyatakan Lulus</p>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-mono font-semibold">
                      <TrendingUp className="w-3 h-3" />
                      <span>+2.4% YoY</span>
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <p className="font-mono tabular-nums text-2xl font-bold text-emerald-800">
                      {stats.passed}
                    </p>
                    <span className="text-xs font-mono tabular-nums text-emerald-700 font-semibold">
                      {stats.passRate}% Kelulusan
                    </span>
                  </div>
                </div>

                <div className="bg-white border border-palette-accent rounded-xl p-5 flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-palette-text/75">
                      Belum Memenuhi Kriteria
                    </p>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-mono font-semibold">
                      <TrendingDown className="w-3 h-3" />
                      <span>-1.8% Penurunan</span>
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <p className="font-mono tabular-nums text-2xl font-bold text-rose-800">
                      {stats.failed}
                    </p>
                    <span className="text-xs text-palette-text/70 font-mono tabular-nums">
                      KKM &lt; {settings.passingGradeKkm.toFixed(1)}
                    </span>
                  </div>
                </div>

                <div className="bg-white border border-palette-accent rounded-xl p-5 flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-palette-text/75">
                      Rerata Nilai & Akses Siswa
                    </p>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-mono font-semibold">
                      <TrendingUp className="w-3 h-3" />
                      <span>+1.95 Poin</span>
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <p className="font-mono tabular-nums text-2xl font-bold text-palette-primary">
                      {stats.avgCohort}
                    </p>
                    <span className="text-xs font-mono tabular-nums text-palette-text/75">
                      {stats.checkedCount}/{stats.total} Sudah Cek
                    </span>
                  </div>
                </div>
              </div>

              <AdminAnalyticsSection
                classRooms={classRooms}
                students={students}
                alumni={alumni}
                settings={settings}
              />
            </div>
          )}

          {/* TAB 1: DATA & NILAI SISWA (WITH 4 SUB-MENUS) */}
          {activeTab === 'students' && (
            <div className="space-y-5">
              {/* Sub-menu Switcher Bar */}
              <div className="bg-white border border-palette-accent rounded-xl p-3 space-y-2 text-left">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold text-palette-primary uppercase tracking-wider font-mono">
                    Sub-Menu Data & Nilai Siswa
                  </span>
                  <span className="text-[11px] text-palette-text/60 font-medium">
                    Pilih tampilan data:
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-stretch lg:items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStudentSubTab('classes')}
                    className={`inline-flex items-center justify-start gap-2 px-3.5 py-2.5 min-h-[40px] rounded-lg text-xs font-semibold text-left transition-colors cursor-pointer ${
                      studentSubTab === 'classes'
                        ? 'bg-palette-primary text-white shadow-xs'
                        : 'text-palette-text hover:bg-palette-accent/50'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-left">1. Data Kelas & Wali Kelas ({classRooms.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStudentSubTab('subjects')}
                    className={`inline-flex items-center justify-start gap-2 px-3.5 py-2.5 min-h-[40px] rounded-lg text-xs font-semibold text-left transition-colors cursor-pointer ${
                      studentSubTab === 'subjects'
                        ? 'bg-palette-primary text-white shadow-xs'
                        : 'text-palette-text hover:bg-palette-accent/50'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-left">2. Mata Pelajaran ({subjectCatalog.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStudentSubTab('student_biodata')}
                    className={`inline-flex items-center justify-start gap-2 px-3.5 py-2.5 min-h-[40px] rounded-lg text-xs font-semibold text-left transition-colors cursor-pointer ${
                      studentSubTab === 'student_biodata'
                        ? 'bg-palette-primary text-white shadow-xs'
                        : 'text-palette-text hover:bg-palette-accent/50'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-left">3. Data Siswa ({students.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStudentSubTab('student_grades')}
                    className={`inline-flex items-center justify-start gap-2 px-3.5 py-2.5 min-h-[40px] rounded-lg text-xs font-semibold text-left transition-colors cursor-pointer ${
                      studentSubTab === 'student_grades'
                        ? 'bg-palette-primary text-white shadow-xs'
                        : 'text-palette-text hover:bg-palette-accent/50'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-left">4. Data Nilai & Kelulusan</span>
                  </button>
                </div>
              </div>

              {/* SUB-MENU 1: DATA KELAS & WALI KELAS */}
              {studentSubTab === 'classes' &&
                (isFetchingTable ? (
                  <TableDataSkeleton rowCount={4} columnCount={6} showKpiCards />
                ) : (
                  <ClassManagementSection
                    classRooms={classRooms}
                    students={students}
                    academicYear={settings.academicYear}
                    onSaveClassRoom={onSaveClassRoom}
                    onDeleteClassRoom={onDeleteClassRoom}
                    onSyncSupabaseTables={onSyncSupabaseTables}
                  />
                ))}

              {/* SUB-MENU 2: MATA PELAJARAN (TERINTEGRASI KE DATA SISWA, DATA NILAI & USER GURU) */}
              {studentSubTab === 'subjects' &&
                (isFetchingTable ? (
                  <TableDataSkeleton rowCount={6} columnCount={6} showKpiCards />
                ) : (
                  <SubjectManagementSection
                    subjectCatalog={subjectCatalog}
                    students={students}
                    defaultKkm={settings.passingGradeKkm}
                    onSaveSubject={onSaveSubject}
                    onDeleteSubject={onDeleteSubject}
                  />
                ))}

              {/* ENHANCED SEARCH & FILTER BAR FOR DATA SISWA & DATA NILAI */}
              {(studentSubTab === 'student_biodata' || studentSubTab === 'student_grades') && (
                <div className="bg-white border border-palette-accent rounded-xl p-4 space-y-3.5 shadow-xs">
                  {/* Top Row: Search by Name & Select Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    {/* Search by Name / NISN / No. Ujian */}
                    <div className="md:col-span-5 relative">
                      <label htmlFor="student-search-input" className="sr-only">
                        Cari Nama Siswa
                      </label>
                      <Search className="w-4 h-4 text-palette-text/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="student-search-input"
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setStudentPage(1);
                          setGradePage(1);
                        }}
                        placeholder="Cari berdasarkan nama siswa, NISN, atau no ujian..."
                        className="w-full pl-9.5 pr-8 py-2.5 min-h-[40px] text-xs sm:text-sm bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary font-medium text-palette-text"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            setStudentPage(1);
                            setGradePage(1);
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-palette-text/60 hover:text-palette-text rounded-full hover:bg-palette-accent/50 cursor-pointer"
                          aria-label="Hapus pencarian"
                          title="Hapus pencarian"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Filter by Status (Dropdown) */}
                    <div className="md:col-span-3">
                      <div className="relative">
                        <select
                          id="status-filter-select"
                          value={selectedStatusFilter}
                          onChange={(e) => {
                            setSelectedStatusFilter(e.target.value as 'ALL' | 'LULUS' | 'TIDAK LULUS');
                            setStudentPage(1);
                            setGradePage(1);
                          }}
                          aria-label="Filter Status Kelulusan"
                          className="w-full px-3 py-2.5 min-h-[40px] text-xs sm:text-sm font-semibold bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text cursor-pointer"
                        >
                          <option value="ALL">Status: Semua ({students.length})</option>
                          <option value="LULUS">Status: LULUS ({stats.passed})</option>
                          <option value="TIDAK LULUS">Status: TIDAK LULUS ({stats.failed})</option>
                        </select>
                      </div>
                    </div>

                    {/* Filter by Kelas (Dropdown) */}
                    <div className="md:col-span-2">
                      <select
                        id="class-filter-select"
                        value={selectedClassFilter}
                        onChange={(e) => {
                          setSelectedClassFilter(e.target.value);
                          setStudentPage(1);
                          setGradePage(1);
                        }}
                        aria-label="Filter Rombongan Belajar / Kelas"
                        className="w-full px-3 py-2.5 min-h-[40px] text-xs sm:text-sm font-medium bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text cursor-pointer"
                      >
                        <option value="ALL">Kelas: Semua ({classRooms.length})</option>
                        {classRooms.map((c) => (
                          <option key={c.id} value={c.className}>
                            {c.className}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Filter by Jurusan / Peminatan */}
                    <div className="md:col-span-2">
                      <select
                        id="major-filter-select"
                        value={selectedMajorFilter}
                        onChange={(e) => {
                          setSelectedMajorFilter(e.target.value as 'ALL' | Major);
                          setStudentPage(1);
                          setGradePage(1);
                        }}
                        aria-label="Filter Jurusan Peminatan"
                        className="w-full px-3 py-2.5 min-h-[40px] text-xs sm:text-sm font-medium bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text cursor-pointer"
                      >
                        <option value="ALL">Jurusan: Semua</option>
                        <option value="MIPA">Jurusan: MIPA</option>
                        <option value="IPS">Jurusan: IPS</option>
                        <option value="BHS">Jurusan: BHS (Bahasa)</option>
                        <option value="UMM">Jurusan: UMM (Umum)</option>
                      </select>
                    </div>
                  </div>

                  {/* Bottom Row: Quick Status Filter Pills & Active Filter Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-palette-accent/70">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-palette-text/70 mr-1 flex items-center gap-1">
                        <Filter className="w-3 h-3 text-palette-primary shrink-0" />
                        <span>Filter Cepat:</span>
                      </span>

                      {/* Status Pills */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStatusFilter('ALL');
                          setStudentPage(1);
                          setGradePage(1);
                        }}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 min-h-[30px] rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          selectedStatusFilter === 'ALL'
                            ? 'bg-palette-primary text-white shadow-xs'
                            : 'bg-palette-background text-palette-text/80 hover:bg-palette-accent/60'
                        }`}
                      >
                        <span>Semua Status</span>
                        <span className="font-mono tabular-nums text-[10px] px-1 py-0.2 rounded bg-black/10">
                          {students.length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStatusFilter('LULUS');
                          setStudentPage(1);
                          setGradePage(1);
                        }}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 min-h-[30px] rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          selectedStatusFilter === 'LULUS'
                            ? 'bg-emerald-700 text-white shadow-xs'
                            : 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                        <span>LULUS</span>
                        <span className="font-mono tabular-nums text-[10px] px-1 py-0.2 rounded bg-black/10">
                          {stats.passed}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStatusFilter('TIDAK LULUS');
                          setStudentPage(1);
                          setGradePage(1);
                        }}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 min-h-[30px] rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          selectedStatusFilter === 'TIDAK LULUS'
                            ? 'bg-rose-700 text-white shadow-xs'
                            : 'bg-rose-50 text-rose-900 border border-rose-200 hover:bg-rose-100'
                        }`}
                      >
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>TIDAK LULUS</span>
                        <span className="font-mono tabular-nums text-[10px] px-1 py-0.2 rounded bg-black/10">
                          {stats.failed}
                        </span>
                      </button>
                    </div>

                    {/* Result Match Count & Reset Button */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-palette-text/80">
                        Menampilkan <strong className="font-mono text-palette-primary">{filteredStudents.length}</strong> dari{' '}
                        <strong className="font-mono">{students.length}</strong> siswa
                      </span>

                      {isStudentFilterActive && (
                        <button
                          type="button"
                          onClick={handleResetAllStudentFilters}
                          className="inline-flex items-center gap-1 px-2.5 py-1 min-h-[30px] text-xs font-semibold text-palette-text bg-palette-accent/60 border border-palette-accent rounded-lg hover:bg-palette-accent transition-colors cursor-pointer"
                          title="Kembalikan semua filter ke awal"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reset Filter</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-MENU 2: DATA SISWA (MASTER BIODATA, CSV UPLOAD & BULK ALUMNI TRANSFER) */}
              {studentSubTab === 'student_biodata' &&
                (isFetchingTable ? (
                  <TableDataSkeleton rowCount={studentPageSize} columnCount={8} showFilterBar={false} />
                ) : (
                  <div className="space-y-4">
                  {/* Header & Action Buttons inside Data Siswa Menu View */}
                  <div className="bg-white border border-palette-accent rounded-xl p-5 space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-palette-accent/70">
                      <div>
                        <h2 className="text-base font-semibold text-palette-text">
                          Master Data Peserta Didik Kelas Akhir
                        </h2>
                        <p className="text-xs text-palette-text/70 mt-0.5">
                          Kelola biodata siswa, unggah/unduh template CSV, ekspor rekapitulasi CSV, atau tambah data siswa baru
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCsvModalMode('students')}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-palette-primary bg-palette-accent/60 border border-palette-accent rounded-lg hover:bg-palette-accent transition-colors whitespace-nowrap cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload / Template CSV Siswa</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleExportCSV}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-palette-text bg-palette-background border border-palette-accent rounded-lg hover:bg-palette-accent/50 transition-colors whitespace-nowrap cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Ekspor CSV</span>
                        </button>

                        <button
                          type="button"
                          onClick={openAddStudentModal}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-palette-primary rounded-lg hover:bg-palette-text transition-colors whitespace-nowrap cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Tambah Data Siswa</span>
                        </button>
                      </div>
                    </div>

                    {/* Bulk Selection & Move to Alumni Controls */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="inline-flex items-center gap-2 text-xs font-semibold text-palette-text cursor-pointer">
                          <input
                            type="checkbox"
                            checked={
                              filteredStudents.length > 0 &&
                              filteredStudents.every((s) => selectedStudentIds.includes(s.id))
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStudentIds(filteredStudents.map((s) => s.id));
                              } else {
                                setSelectedStudentIds([]);
                              }
                            }}
                            className="w-4 h-4 accent-palette-primary rounded cursor-pointer"
                          />
                          <span>Pilih Semua ({filteredStudents.length})</span>
                        </label>

                        <button
                          type="button"
                          onClick={() => {
                            const passedIds = students
                              .filter((s) => s.status === 'LULUS')
                              .map((s) => s.id);
                            setSelectedStudentIds(passedIds);
                          }}
                          className="px-2.5 py-1 text-xs font-medium text-palette-primary bg-palette-accent/50 hover:bg-palette-accent rounded-md transition-colors cursor-pointer"
                        >
                          Pilih Siswa Lulus ({stats.passed})
                        </button>

                        {selectedStudentIds.length > 0 && (
                          <span className="text-xs font-mono font-semibold text-palette-primary">
                            {selectedStudentIds.length} siswa dipilih
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={selectedStudentIds.length === 0 || isBulkMovingToAlumni}
                          onClick={async () => {
                            const chosen = students.filter((s) =>
                              selectedStudentIds.includes(s.id)
                            );
                            if (chosen.length === 0) return;
                            setIsBulkMovingToAlumni(true);
                            await onTransferStudentsToAlumni(chosen);
                            setSelectedStudentIds([]);
                            setIsBulkMovingToAlumni(false);
                            setBulkAlumniBanner(
                              `Berhasil memindahkan ${chosen.length} siswa terpilih ke Basis Data Alumni (${settings.academicYear}).`
                            );
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-palette-primary rounded-lg hover:bg-palette-text disabled:opacity-45 transition-colors cursor-pointer"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          <span>
                            Pindahkan Terpilih ({selectedStudentIds.length}) ke Alumni
                          </span>
                        </button>

                        <button
                          type="button"
                          disabled={stats.passed === 0 || isBulkMovingToAlumni}
                          onClick={async () => {
                            const allGraduated = students.filter((s) => s.status === 'LULUS');
                            if (allGraduated.length === 0) return;
                            setIsBulkMovingToAlumni(true);
                            await onTransferStudentsToAlumni(allGraduated);
                            setSelectedStudentIds([]);
                            setIsBulkMovingToAlumni(false);
                            setBulkAlumniBanner(
                              `Bulk Move selesai: ${allGraduated.length} siswa berstatus LULUS telah dipindahkan ke Data Alumni (${settings.academicYear}).`
                            );
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 disabled:opacity-45 transition-colors cursor-pointer"
                        >
                          <GraduationCap className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Bulk Pindahkan Semua Lulus ({stats.passed}) ke Alumni</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {studentSavedBanner && (
                    <div
                      className={`p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                        studentSavedBanner.ok
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : 'bg-rose-50 border-rose-200 text-rose-900'
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5 sm:mt-0" />
                        <span>{studentSavedBanner.message}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {studentSavedBanner.student && (
                          <button
                            type="button"
                            onClick={() =>
                              generateGraduationCertificatePDF(
                                studentSavedBanner.student!,
                                settings
                              )
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-emerald-300 text-emerald-900 font-semibold text-[11px] hover:bg-emerald-100 cursor-pointer"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Cetak SKL PDF</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setStudentSavedBanner(null)}
                          className="text-[11px] font-semibold underline cursor-pointer px-1"
                        >
                          Tutup
                        </button>
                      </div>
                    </div>
                  )}

                  {bulkAlumniBanner && (
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span>{bulkAlumniBanner}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBulkAlumniBanner('')}
                        className="text-[11px] font-semibold underline cursor-pointer"
                      >
                        Tutup
                      </button>
                    </div>
                  )}

                  <div className="bg-white border border-palette-accent rounded-xl overflow-hidden">
                    {/* Mobile Card List for Data Siswa (< 768px) */}
                    <div className="md:hidden divide-y divide-palette-accent">
                      {filteredStudents.length === 0 ? (
                        <div className="p-8 text-center text-xs text-palette-text/60">
                          Tidak ditemukan data siswa yang sesuai.
                        </div>
                      ) : (
                        filteredStudents
                          .slice(
                            (Math.min(
                              studentPage,
                              Math.max(1, Math.ceil(filteredStudents.length / studentPageSize))
                            ) -
                              1) *
                              studentPageSize,
                            Math.min(
                              studentPage,
                              Math.max(1, Math.ceil(filteredStudents.length / studentPageSize))
                            ) * studentPageSize
                          )
                          .map((student, idx) => {
                            const safeStudentPage = Math.min(
                              studentPage,
                              Math.max(1, Math.ceil(filteredStudents.length / studentPageSize))
                            );
                            const rowNumber = (safeStudentPage - 1) * studentPageSize + idx + 1;
                            const isPass = student.status === 'LULUS';
                            const isDeleting = confirmDeleteId === student.id;
                            const homeroom = homeroomLookup[student.className];
                            const isChecked = selectedStudentIds.includes(student.id);

                            return (
                              <div
                                key={student.id}
                                className={`p-4 space-y-3 ${
                                  isChecked ? 'bg-palette-accent/30' : 'bg-white'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2.5">
                                  <div className="flex items-start gap-2.5 min-w-0">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedStudentIds((prev) => [...prev, student.id]);
                                        } else {
                                          setSelectedStudentIds((prev) =>
                                            prev.filter((id) => id !== student.id)
                                          );
                                        }
                                      }}
                                      className="w-4 h-4 mt-1 accent-palette-primary rounded shrink-0 cursor-pointer"
                                    />
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-palette-accent/60 font-mono tabular-nums text-[11px] font-bold text-palette-text">
                                          #{rowNumber}
                                        </span>
                                        <h4 className="text-sm font-semibold text-palette-text break-words">
                                          {student.fullName}
                                        </h4>
                                      </div>
                                      <p className="text-xs font-mono tabular-nums text-palette-text/70 mt-0.5">
                                        NISN: {student.nisn} · {student.examNumber}
                                      </p>
                                    </div>
                                  </div>

                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold shrink-0 ${
                                      isPass
                                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                                    }`}
                                  >
                                    {student.status}
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs bg-palette-background p-2.5 rounded-lg border border-palette-accent/70">
                                  <div>
                                    <span className="text-palette-text/60 block text-[11px]">
                                      Kelas & Wali Kelas
                                    </span>
                                    <strong className="text-palette-text font-semibold">
                                      {student.className} ({student.major})
                                    </strong>
                                    <span className="block text-[11px] text-palette-text/65 truncate">
                                      {homeroom ? homeroom.homeroomTeacher : '-'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-palette-text/60 block text-[11px]">
                                      Tempat, Tgl Lahir
                                    </span>
                                    <strong className="text-palette-text font-medium">
                                      {student.birthPlace}
                                    </strong>
                                    <span className="block text-[11px] font-mono tabular-nums text-palette-text/65">
                                      {formatIndonesianDate(student.birthDate)}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                  <span className="text-[11px] font-mono tabular-nums text-palette-text/65 truncate max-w-[180px]">
                                    SKL: {student.sklNumber}
                                  </span>

                                  {isDeleting ? (
                                    <div className="inline-flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          await onDeleteStudent(student.id);
                                          setConfirmDeleteId(null);
                                        }}
                                        className="px-2.5 py-1.5 text-xs font-semibold bg-rose-700 text-white rounded-md cursor-pointer"
                                      >
                                        Ya, Hapus
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteId(null)}
                                        className="px-2.5 py-1.5 text-xs text-palette-text bg-palette-accent/50 rounded-md cursor-pointer"
                                      >
                                        Batal
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="inline-flex items-center gap-1.5">
                                      {isPass && (
                                        <button
                                          type="button"
                                          onClick={() => onTransferStudentsToAlumni([student])}
                                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-palette-primary bg-palette-accent/55 rounded-md cursor-pointer"
                                        >
                                          <ArrowRightLeft className="w-3.5 h-3.5" />
                                          <span>Ke Alumni</span>
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => openEditStudentModal(student)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-palette-text bg-palette-background border border-palette-accent rounded-md cursor-pointer"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                        <span>Edit</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteId(student.id)}
                                        className="p-1.5 text-rose-700 bg-rose-50 border border-rose-200 rounded-md cursor-pointer"
                                        title="Hapus Data Siswa"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>

                    {/* Desktop & Tablet Table View for Data Siswa (>= 768px) */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-palette-accent/45 border-b border-palette-accent text-xs font-semibold text-palette-text">
                            <th className="py-3 px-3 w-10 text-center">
                              <input
                                type="checkbox"
                                aria-label="Pilih semua siswa di halaman ini"
                                checked={
                                  filteredStudents.length > 0 &&
                                  filteredStudents.every((s) => selectedStudentIds.includes(s.id))
                                }
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedStudentIds(filteredStudents.map((s) => s.id));
                                  } else {
                                    setSelectedStudentIds([]);
                                  }
                                }}
                                className="w-3.5 h-3.5 accent-palette-primary rounded cursor-pointer"
                              />
                            </th>
                            <th className="py-3 px-3 w-14 text-center">No</th>
                            <th className="py-3 px-4">Nama Peserta Didik</th>
                            <th className="py-3 px-4">NISN & No. Ujian</th>
                            <th className="py-3 px-4">Tempat, Tanggal Lahir</th>
                            <th className="py-3 px-4">Kelas & Wali Kelas</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4 text-right">Tindakan & Pindah Alumni</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-palette-accent/60 text-sm">
                          {filteredStudents.length === 0 ? (
                            <tr>
                              <td
                                colSpan={8}
                                className="py-10 text-center text-xs text-palette-text/60"
                              >
                                Tidak ditemukan data siswa yang sesuai.
                              </td>
                            </tr>
                          ) : (
                            filteredStudents
                              .slice(
                                (Math.min(
                                  studentPage,
                                  Math.max(1, Math.ceil(filteredStudents.length / studentPageSize))
                                ) -
                                  1) *
                                  studentPageSize,
                                Math.min(
                                  studentPage,
                                  Math.max(1, Math.ceil(filteredStudents.length / studentPageSize))
                                ) * studentPageSize
                              )
                              .map((student, idx) => {
                                const safeStudentPage = Math.min(
                                  studentPage,
                                  Math.max(1, Math.ceil(filteredStudents.length / studentPageSize))
                                );
                                const rowNumber = (safeStudentPage - 1) * studentPageSize + idx + 1;
                                const isPass = student.status === 'LULUS';
                                const isDeleting = confirmDeleteId === student.id;
                                const homeroom = homeroomLookup[student.className];
                                const isChecked = selectedStudentIds.includes(student.id);

                                return (
                                  <tr
                                    key={student.id}
                                    className={`transition-colors ${
                                      isChecked
                                        ? 'bg-palette-accent/35'
                                        : 'hover:bg-palette-accent/20'
                                    }`}
                                  >
                                    <td className="py-3 px-3 text-center">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setSelectedStudentIds((prev) => [...prev, student.id]);
                                          } else {
                                            setSelectedStudentIds((prev) =>
                                              prev.filter((id) => id !== student.id)
                                            );
                                          }
                                        }}
                                        className="w-3.5 h-3.5 accent-palette-primary rounded cursor-pointer"
                                      />
                                    </td>
                                    <td className="py-3 px-3 text-center">
                                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-palette-accent/60 font-mono tabular-nums text-xs font-bold text-palette-text">
                                        {rowNumber}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4">
                                      <div className="font-semibold text-palette-text">
                                        {student.fullName}
                                      </div>
                                      <div className="text-xs font-mono tabular-nums text-palette-text/65">
                                        SKL: {student.sklNumber}
                                      </div>
                                    </td>
                                    <td className="py-3 px-4 font-mono tabular-nums">
                                      <div className="text-xs font-semibold text-palette-text">
                                        {student.nisn}
                                      </div>
                                      <div className="text-[11px] text-palette-text/65">
                                        {student.examNumber}
                                      </div>
                                    </td>
                                    <td className="py-3 px-4 text-xs text-palette-text/85">
                                      <div>{student.birthPlace}</div>
                                      <div className="font-mono tabular-nums text-palette-text/65">
                                        {formatIndonesianDate(student.birthDate)}
                                      </div>
                                    </td>
                                    <td className="py-3 px-4">
                                      <div className="text-xs font-semibold text-palette-text">
                                        {student.className} ({student.major})
                                      </div>
                                      <div className="text-[11px] text-palette-text/65">
                                        {homeroom
                                          ? homeroom.homeroomTeacher
                                          : 'Wali kelas belum diset'}
                                      </div>
                                    </td>
                                    <td className="py-3 px-4">
                                      <span
                                        className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-mono font-semibold ${
                                          isPass
                                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                                        }`}
                                      >
                                        {student.status}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                      {isDeleting ? (
                                        <div className="inline-flex items-center gap-1.5">
                                          <button
                                            type="button"
                                            onClick={async () => {
                                              await onDeleteStudent(student.id);
                                              setConfirmDeleteId(null);
                                            }}
                                            className="px-2 py-1 text-xs font-semibold bg-rose-700 text-white rounded hover:bg-rose-800 cursor-pointer"
                                          >
                                            Ya, Hapus
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setConfirmDeleteId(null)}
                                            className="px-2 py-1 text-xs text-palette-text bg-palette-accent/50 rounded hover:bg-palette-accent cursor-pointer"
                                          >
                                            Batal
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="inline-flex items-center justify-end gap-1.5">
                                          {isPass && (
                                            <button
                                              type="button"
                                              onClick={() => onTransferStudentsToAlumni([student])}
                                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-palette-primary bg-palette-accent/55 hover:bg-palette-accent rounded-md transition-colors cursor-pointer"
                                              title="Pindahkan siswa lulus ini ke Data Alumni"
                                            >
                                              <ArrowRightLeft className="w-3 h-3" />
                                              <span>Ke Alumni</span>
                                            </button>
                                          )}
                                          <button
                                            type="button"
                                            onClick={() => openEditStudentModal(student)}
                                            className="p-1.5 text-palette-text/75 hover:text-palette-primary hover:bg-palette-accent/40 rounded-md transition-colors cursor-pointer"
                                            title="Edit Biodata & Nilai"
                                          >
                                            <Edit3 className="w-4 h-4" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setConfirmDeleteId(student.id)}
                                            className="p-1.5 text-palette-text/75 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                            title="Hapus Data Siswa"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })
                          )}
                        </tbody>
                      </table>
                    </div>
                    <TablePagination
                      currentPage={Math.min(
                        studentPage,
                        Math.max(1, Math.ceil(filteredStudents.length / studentPageSize))
                      )}
                      totalItems={filteredStudents.length}
                      pageSize={studentPageSize}
                      onPageChange={setStudentPage}
                      onPageSizeChange={setStudentPageSize}
                      itemLabel="siswa"
                    />
                  </div>
                </div>
                ))}

              {/* SUB-MENU 3: DATA NILAI (FULL ACADEMIC LEDGER TABLE + CSV GRADE UPLOAD) */}
              {studentSubTab === 'student_grades' &&
                (isFetchingTable ? (
                  <TableDataSkeleton rowCount={gradePageSize} columnCount={7} showFilterBar={false} />
                ) : (
                  <div className="bg-white border border-palette-accent rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-palette-accent bg-palette-background flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-semibold text-palette-text block">
                        Rekapitulasi Nilai 8 Mata Pelajaran Ujian Satuan Pendidikan (KKM:{' '}
                        {settings.passingGradeKkm.toFixed(2)})
                      </span>
                      <span className="text-palette-text/70">
                        Gunakan tombol <strong>Unduh Template / Upload CSV Data Nilai</strong> untuk
                        mengunggah nilai 8 mata pelajaran secara massal
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setCsvModalMode('grades')}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[38px] text-xs font-semibold text-white bg-palette-primary rounded-lg hover:bg-palette-text transition-colors shrink-0 cursor-pointer w-full sm:w-auto"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                      <span>Unduh Template / Upload CSV Data Nilai</span>
                    </button>
                  </div>

                  {/* Mobile Card List for Data Nilai (< 768px) */}
                  <div className="md:hidden divide-y divide-palette-accent">
                    {filteredStudents
                      .slice(
                        (Math.min(
                          gradePage,
                          Math.max(1, Math.ceil(filteredStudents.length / gradePageSize))
                        ) -
                          1) *
                          gradePageSize,
                        Math.min(
                          gradePage,
                          Math.max(1, Math.ceil(filteredStudents.length / gradePageSize))
                        ) * gradePageSize
                      )
                      .map((student, idx) => {
                        const safeGradePage = Math.min(
                          gradePage,
                          Math.max(1, Math.ceil(filteredStudents.length / gradePageSize))
                        );
                        const rowNumber = (safeGradePage - 1) * gradePageSize + idx + 1;
                        const isPass = student.status === 'LULUS';

                        return (
                          <div key={student.id} className="p-4 space-y-3 bg-white">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="px-1.5 py-0.5 rounded bg-palette-accent/60 font-mono tabular-nums text-[11px] font-bold text-palette-text">
                                    #{rowNumber}
                                  </span>
                                  <h4 className="text-sm font-semibold text-palette-text break-words">
                                    {student.fullName}
                                  </h4>
                                </div>
                                <p className="text-xs font-mono tabular-nums text-palette-text/70 mt-0.5">
                                  NISN {student.nisn} · {student.className}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleQuickTogglePassStatus(student)}
                                className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold border shrink-0 cursor-pointer ${
                                  isPass
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                    : 'bg-rose-50 border-rose-200 text-rose-800'
                                }`}
                              >
                                {student.status}
                              </button>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                              {student.subjects.map((subj) => {
                                const belowKkm = subj.score < settings.passingGradeKkm;
                                return (
                                  <span
                                    key={subj.code}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono tabular-nums border ${
                                      belowKkm
                                        ? 'bg-rose-50 border-rose-200 text-rose-800 font-semibold'
                                        : 'bg-palette-background border-palette-accent text-palette-text'
                                    }`}
                                  >
                                    <span className="text-palette-primary font-semibold">
                                      {subj.code}:
                                    </span>
                                    <span>{subj.score}</span>
                                  </span>
                                );
                              })}
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-palette-accent/60">
                              <div className="text-xs font-mono tabular-nums">
                                <span className="text-palette-text/70">Rerata: </span>
                                <strong className="text-palette-text font-bold">
                                  {student.averageScore.toFixed(2)}
                                </strong>{' '}
                                <span className="text-palette-text/65">({student.predicate})</span>
                              </div>

                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openEditStudentModal(student)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-palette-primary rounded-md cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>Input Nilai</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    generateGraduationCertificatePDF(student, settings)
                                  }
                                  className="p-1.5 text-palette-text bg-palette-background border border-palette-accent rounded-md cursor-pointer"
                                  title="Unduh SKL PDF"
                                >
                                  <FileText className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* Desktop & Tablet Table View for Data Nilai (>= 768px) */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-palette-accent/45 border-b border-palette-accent text-xs font-semibold text-palette-text">
                          <th className="py-3 px-4 w-14 text-center">No</th>
                          <th className="py-3 px-4">Peserta Didik</th>
                          <th className="py-3 px-3">Kelas</th>
                          <th className="py-3 px-3">Rincian Nilai Mata Pelajaran</th>
                          <th className="py-3 px-4 text-right">Rata-Rata</th>
                          <th className="py-3 px-4">Keputusan</th>
                          <th className="py-3 px-4 text-right">Aksi Nilai & SKL</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-palette-accent/60 text-sm">
                        {filteredStudents
                          .slice(
                            (Math.min(
                              gradePage,
                              Math.max(1, Math.ceil(filteredStudents.length / gradePageSize))
                            ) -
                              1) *
                              gradePageSize,
                            Math.min(
                              gradePage,
                              Math.max(1, Math.ceil(filteredStudents.length / gradePageSize))
                            ) * gradePageSize
                          )
                          .map((student, idx) => {
                            const safeGradePage = Math.min(
                              gradePage,
                              Math.max(1, Math.ceil(filteredStudents.length / gradePageSize))
                            );
                            const rowNumber = (safeGradePage - 1) * gradePageSize + idx + 1;
                            const isPass = student.status === 'LULUS';
                            return (
                              <tr
                                key={student.id}
                                className="hover:bg-palette-accent/20 transition-colors"
                              >
                                <td className="py-3 px-4 text-center">
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-palette-accent/60 font-mono tabular-nums text-xs font-bold text-palette-text">
                                    {rowNumber}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="font-semibold text-palette-text">
                                    {student.fullName}
                                  </div>
                                  <div className="text-xs font-mono tabular-nums text-palette-text/65">
                                    NISN {student.nisn}
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-xs font-medium text-palette-text">
                                  {student.className}
                                </td>
                                <td className="py-3 px-3">
                                  <div className="flex flex-wrap gap-1.5">
                                    {student.subjects.map((subj) => {
                                      const belowKkm = subj.score < settings.passingGradeKkm;
                                      return (
                                        <span
                                          key={subj.code}
                                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono tabular-nums border ${
                                            belowKkm
                                              ? 'bg-rose-50 border-rose-200 text-rose-800 font-semibold'
                                              : 'bg-palette-background border-palette-accent text-palette-text'
                                          }`}
                                        >
                                          <span className="text-palette-primary font-semibold">
                                            {subj.code}:
                                          </span>
                                          <span>{subj.score}</span>
                                        </span>
                                      );
                                    })}
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-right font-mono tabular-nums">
                                  <div className="font-bold text-palette-text">
                                    {student.averageScore.toFixed(2)}
                                  </div>
                                  <div className="text-[11px] text-palette-text/65">
                                    {student.predicate}
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <button
                                    type="button"
                                    onClick={() => handleQuickTogglePassStatus(student)}
                                    className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold border transition-colors cursor-pointer ${
                                      isPass
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                                        : 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100'
                                    }`}
                                    title="Klik untuk ubah status LULUS / TIDAK LULUS"
                                  >
                                    {student.status}
                                  </button>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <div className="inline-flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => openEditStudentModal(student)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-palette-primary rounded-md hover:bg-palette-text transition-colors cursor-pointer"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                      <span>Input Nilai</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        generateGraduationCertificatePDF(student, settings)
                                      }
                                      className="p-1.5 text-palette-text/75 hover:text-palette-primary hover:bg-palette-accent/40 rounded-md transition-colors cursor-pointer"
                                      title="Unduh SKL PDF"
                                    >
                                      <FileText className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                  <TablePagination
                    currentPage={Math.min(
                      gradePage,
                      Math.max(1, Math.ceil(filteredStudents.length / gradePageSize))
                    )}
                    totalItems={filteredStudents.length}
                    pageSize={gradePageSize}
                    onPageChange={setGradePage}
                    onPageSizeChange={setGradePageSize}
                    itemLabel="nilai siswa"
                  />
                </div>
                ))}
            </div>
          )}

          {/* TAB: PENGATURAN KOP SURAT & DATA NOMOR SURAT (SUB-MENU SWITCHER + SECTIONS) */}
          {(activeTab === 'letter_settings' || activeTab === 'letter_numbers') && (
            <div className="space-y-4">
              {/* Sub-menu Switcher Bar for KOP & Nomor Surat */}
              <div className="bg-white border border-palette-accent rounded-xl p-3 sm:p-4 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-bold text-palette-text/60 uppercase tracking-wider font-mono">
                    SUB-MENU PENGATURAN KOP & SURAT
                  </span>
                  <span className="text-xs text-palette-primary font-semibold hidden sm:inline font-mono">
                    {letterSubTab === 'kop_format'
                      ? 'Format Baku Dokumen SKL Digital'
                      : `${letterNumbers.length} Pola Penomoran Terdaftar`}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                  <button
                    type="button"
                    onClick={() => setLetterSubTab('kop_format')}
                    className={`w-full flex items-center justify-start gap-2.5 px-3.5 py-2.5 min-h-[42px] rounded-lg text-xs font-semibold text-left transition-colors cursor-pointer ${
                      letterSubTab === 'kop_format'
                        ? 'bg-palette-primary text-white shadow-xs'
                        : 'bg-palette-background text-palette-text hover:bg-palette-accent/40 border border-palette-accent'
                    }`}
                  >
                    <Building2 className="w-4 h-4 shrink-0" />
                    <div className="min-w-0 flex-1 text-left">
                      <div className="truncate">1. Format & Desain KOP Surat</div>
                      <div
                        className={`text-[10px] font-normal ${
                          letterSubTab === 'kop_format' ? 'text-white/80' : 'text-palette-text/60'
                        }`}
                      >
                        Hierarki Dinas, Logo Kiri/Kanan, Kontak & Garis
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLetterSubTab('letter_numbers')}
                    className={`w-full flex items-center justify-start gap-2.5 px-3.5 py-2.5 min-h-[42px] rounded-lg text-xs font-semibold text-left transition-colors cursor-pointer ${
                      letterSubTab === 'letter_numbers'
                        ? 'bg-palette-primary text-white shadow-xs'
                        : 'bg-palette-background text-palette-text hover:bg-palette-accent/40 border border-palette-accent'
                    }`}
                  >
                    <FileText className="w-4 h-4 shrink-0" />
                    <div className="min-w-0 flex-1 text-left">
                      <div className="truncate flex items-center justify-between">
                        <span>2. Data Nomor Surat (SKL)</span>
                        <span
                          className={`font-mono tabular-nums text-[10px] px-1.5 py-0.5 rounded ${
                            letterSubTab === 'letter_numbers'
                              ? 'bg-white/20 text-white'
                              : 'bg-palette-accent text-palette-text'
                          }`}
                        >
                          {letterNumbers.length}
                        </span>
                      </div>
                      <div
                        className={`text-[10px] font-normal ${
                          letterSubTab === 'letter_numbers'
                            ? 'text-white/80'
                            : 'text-palette-text/60'
                        }`}
                      >
                        Pola Penomoran Otomatis & Klasifikasi
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Sub-menu Section Rendering */}
              {letterSubTab === 'kop_format' ? (
                <KopSuratManagementSection
                  settings={settings}
                  students={students}
                  onSaveSettings={onSaveSettings}
                />
              ) : isFetchingTable ? (
                <TableDataSkeleton rowCount={4} columnCount={6} showKpiCards />
              ) : (
                <LetterNumberManagementSection
                  letterNumbers={letterNumbers}
                  students={students}
                  onSaveLetterNumber={onSaveLetterNumber}
                  onDeleteLetterNumber={onDeleteLetterNumber}
                  onBulkUpdateStudents={onBulkSaveStudents}
                />
              )}
            </div>
          )}

          {/* TAB 2: DATA ALUMNI */}
          {activeTab === 'alumni' &&
            (isFetchingTable ? (
              <TableDataSkeleton rowCount={5} columnCount={6} showKpiCards />
            ) : (
              <AlumniManagementSection
                alumni={alumni}
                students={students}
                settings={settings}
                onTransferStudentsToAlumni={onTransferStudentsToAlumni}
                onSaveAlumni={onSaveAlumni}
                onRestoreAlumniToStudent={onRestoreAlumniToStudent}
                onDeleteAlumni={onDeleteAlumni}
              />
            ))}

          {/* TAB 3: MANAJEMEN USER & ROLE (ADMIN, GURU, WALI KELAS) */}
          {activeTab === 'users' &&
            (isFetchingTable ? (
              <TableDataSkeleton rowCount={5} columnCount={6} showKpiCards />
            ) : (
              <UserManagementSection
                users={users}
                classRooms={classRooms}
                subjectCatalog={subjectCatalog}
                onSaveUser={onSaveUser}
                onDeleteUser={onDeleteUser}
              />
            ))}

          {/* TAB 3: MONITORING & PENGATURAN PENGUMUMAN */}
          {activeTab === 'monitoring' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left 5 cols: Class Breakdown */}
              <div className="lg:col-span-5 bg-white border border-palette-accent rounded-xl p-6 space-y-5">
                <div>
                  <h2 className="text-base font-semibold text-palette-text">
                    Ketercapaian & Pemantauan per Kelas
                  </h2>
                  <p className="text-xs text-palette-text/70 mt-0.5">
                    Statistik kelulusan dan jumlah siswa yang sudah login mengecek hasil
                  </p>
                </div>

                <div className="space-y-4">
                  {classRooms.map((cls) => {
                    const classStudents = students.filter((s) => s.className === cls.className);
                    const totalInClass = classStudents.length;
                    const passedInClass = classStudents.filter(
                      (s) => s.status === 'LULUS'
                    ).length;
                    const checkedInClass = classStudents.filter((s) => Boolean(s.checkedAt)).length;
                    const passPct =
                      totalInClass > 0 ? Math.round((passedInClass / totalInClass) * 100) : 0;

                    return (
                      <div
                        key={cls.id}
                        className="p-4 rounded-lg bg-palette-background border border-palette-accent space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-semibold text-palette-text">
                              {cls.className}
                            </span>
                            <p className="text-[11px] text-palette-text/70">
                              Wali Kelas: {cls.homeroomTeacher}
                            </p>
                          </div>
                          <span className="text-xs font-mono tabular-nums text-palette-text/75">
                            {passedInClass}/{totalInClass} Lulus ({passPct}%)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-palette-accent rounded-full overflow-hidden">
                          <div
                            className="h-full bg-palette-primary rounded-full"
                            style={{ width: `${passPct}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs text-palette-text/70">
                          <span>Sudah Cek Portal:</span>
                          <span className="font-mono tabular-nums font-semibold text-palette-text">
                            {checkedInClass} dari {totalInClass} siswa
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right 7 cols: Schedule & Official SKL Settings */}
              <form
                onSubmit={handleSaveSettingsForm}
                className="lg:col-span-7 bg-white border border-palette-accent rounded-xl p-6 space-y-5"
              >
                <div className="pb-4 border-b border-palette-accent flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-palette-text">
                      Pengaturan Jadwal Pengumuman & Parameter SKL
                    </h2>
                    <p className="text-xs text-palette-text/70 mt-0.5">
                      Atur tanggal & jam hitung mundur (countdown) serta pejabat penandatangan SKL
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-palette-primary rounded-lg hover:bg-palette-text transition-colors cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isSavingSettings ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
                  </button>
                </div>

                {settingsSavedBanner && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>{settingsSavedBanner}</span>
                  </div>
                )}

                {/* Schedule Date & Time Control */}
                <div className="p-4 rounded-xl bg-palette-background border border-palette-accent space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-palette-primary" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-palette-text">
                        Pengaturan Status & Jadwal Jam Digital (Countdown)
                      </h3>
                    </div>
                    <span
                      className={`text-xs font-mono font-semibold px-2.5 py-0.5 rounded ${
                        formSettings.isPublished
                          ? 'bg-emerald-100 text-emerald-900'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {formSettings.isPublished ? 'STATUS: DIBUKA' : 'STATUS: DIKUNCI'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-palette-text mb-1">
                        Tanggal Pengumuman
                      </label>
                      <input
                        type="date"
                        value={scheduleDateValue}
                        onChange={(e) =>
                          handleScheduleDateTimeChange(e.target.value, scheduleTimeValue)
                        }
                        className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-white border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-palette-text mb-1">
                        Jam Pengumuman
                      </label>
                      <input
                        type="time"
                        value={scheduleTimeValue}
                        onChange={(e) =>
                          handleScheduleDateTimeChange(scheduleDateValue, e.target.value)
                        }
                        className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-white border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-palette-text mb-1">
                        Status Portal Saat Ini
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setFormSettings({
                            ...formSettings,
                            isPublished: !formSettings.isPublished,
                          })
                        }
                        className={`w-full px-3 py-2 text-xs font-semibold rounded-lg border transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                          formSettings.isPublished
                            ? 'bg-emerald-700 text-white border-emerald-800'
                            : 'bg-amber-600 text-white border-amber-700'
                        }`}
                      >
                        {formSettings.isPublished ? (
                          <>
                            <Unlock className="w-3.5 h-3.5" />
                            <span>Dibuka untuk Siswa</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5" />
                            <span>Dikunci (Countdown)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-palette-accent flex flex-wrap items-center gap-2">
                    <span className="text-[11px] text-palette-text/70">Simulasi Cepat:</span>
                    <button
                      type="button"
                      onClick={() => handleQuickSchedulePreset(15, false)}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-palette-accent rounded-md hover:bg-palette-accent/50 text-palette-text cursor-pointer"
                    >
                      Kunci & Countdown 15 Detik (Auto-Buka)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickSchedulePreset(3600, false)}
                      className="px-2.5 py-1 text-[11px] font-medium bg-white border border-palette-accent rounded-md hover:bg-palette-accent/50 text-palette-text cursor-pointer"
                    >
                      Set +1 Jam (Dikunci)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickSchedulePreset(0, true)}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 text-emerald-900 cursor-pointer"
                    >
                      Buka Pengumuman Sekarang
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-palette-text mb-1">
                      Nama Satuan Pendidikan (Sekolah)
                    </label>
                    <input
                      type="text"
                      value={formSettings.schoolName}
                      onChange={(e) =>
                        setFormSettings({ ...formSettings, schoolName: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-palette-text mb-1">
                      NPSN Sekolah
                    </label>
                    <input
                      type="text"
                      value={formSettings.schoolNpsn}
                      onChange={(e) =>
                        setFormSettings({ ...formSettings, schoolNpsn: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-palette-text mb-1">
                      Batas KKM Kelulusan
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      value={formSettings.passingGradeKkm}
                      onChange={(e) =>
                        setFormSettings({
                          ...formSettings,
                          passingGradeKkm: Number(e.target.value) || 75,
                        })
                      }
                      className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-palette-text mb-1">
                      Nama Kepala Sekolah
                    </label>
                    <input
                      type="text"
                      value={formSettings.principalName}
                      onChange={(e) =>
                        setFormSettings({ ...formSettings, principalName: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-palette-text mb-1">
                      NIP Kepala Sekolah
                    </label>
                    <input
                      type="text"
                      value={formSettings.principalNip}
                      onChange={(e) =>
                        setFormSettings({ ...formSettings, principalNip: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
                    />
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: SUPABASE STORAGE & DATABASE CONFIGURATION */}
          {activeTab === 'database' && (
            <SupabaseStorageSection
              syncStatus={syncStatus}
              localCounts={{
                classRooms: classRooms.length,
                students: students.length,
                alumni: alumni.length,
                settings: 1,
              }}
              onSyncSupabaseTables={onSyncSupabaseTables}
              onRefreshData={onRefreshData}
            />
          )}
        </main>

        {/* Admin Workspace Footer with Creation Year */}
        <footer className="mt-auto border-t border-palette-accent bg-white px-6 py-4">
          <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-palette-text/70">
            <div>
              <strong className="text-palette-text font-semibold">{settings.schoolName}</strong>
              <span className="mx-2" aria-hidden="true">
                ·
              </span>
              <span>{settings.schoolAddress}</span>
            </div>
            <span className="font-mono tabular-nums text-palette-text/60">
              © 2026 &ldquo;Sipinter-Lulus&rdquo; · Tahun Pembuatan: 2026 · TA{' '}
              {settings.academicYear}
            </span>
          </div>
        </footer>
      </div>

      {/* Add / Edit Student & Grade Modal */}
      {isModalOpen && editingStudent && (
        <div className="fixed inset-0 z-50 bg-palette-text/55 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-palette-accent rounded-xl w-full max-w-3xl overflow-hidden my-auto max-h-[92vh] flex flex-col shadow-xl">
            {/* Sticky Modal Header */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-palette-accent flex items-start sm:items-center justify-between gap-3 bg-palette-background shrink-0">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-base sm:text-lg font-bold text-palette-text">
                    {isAddingNewStudent
                      ? 'Tambah Data Siswa Baru'
                      : 'Edit Data Peserta Didik & Transkrip Nilai'}
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-mono font-semibold">
                    <Database className="w-3 h-3" />
                    <span>public.students</span>
                  </span>
                </div>
                <p className="text-xs text-palette-text/70 mt-0.5">
                  {isAddingNewStudent
                    ? 'Isi biodata peserta didik baru, pilih kelas & nomor SKL, serta tetapkan nilai mata pelajaran'
                    : 'Perubahan biodata dan nilai otomatis menghitung Rata-Rata serta Status Kelulusan'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-palette-text/70 hover:text-palette-text rounded-lg hover:bg-palette-accent/50 shrink-0 cursor-pointer"
                aria-label="Tutup formulir siswa"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Section Tabs Inside Modal */}
            <div className="px-4 sm:px-6 py-2.5 bg-white border-b border-palette-accent flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setStudentModalSection('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    studentModalSection === 'all'
                      ? 'bg-palette-primary text-white'
                      : 'bg-palette-background text-palette-text hover:bg-palette-accent/50'
                  }`}
                >
                  Semua Bagian
                </button>
                <button
                  type="button"
                  onClick={() => setStudentModalSection('biodata')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    studentModalSection === 'biodata'
                      ? 'bg-palette-primary text-white'
                      : 'bg-palette-background text-palette-text hover:bg-palette-accent/50'
                  }`}
                >
                  1. Biodata & Nomor SKL
                </button>
                <button
                  type="button"
                  onClick={() => setStudentModalSection('grades')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    studentModalSection === 'grades'
                      ? 'bg-palette-primary text-white'
                      : 'bg-palette-background text-palette-text hover:bg-palette-accent/50'
                  }`}
                >
                  2. Transkrip Nilai ({editingStudent.subjects.length} Mapel)
                </button>
              </div>

              <span className="text-[11px] font-mono tabular-nums text-palette-text/70">
                Jurusan: <strong className="text-palette-text">{editingStudent.major}</strong> ·{' '}
                <strong className="text-palette-text">{editingStudent.className}</strong>
              </span>
            </div>

            <form
              onSubmit={handleSaveStudentModal}
              className="flex-1 flex flex-col min-h-0 overflow-hidden"
            >
              {/* Scrollable Form Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
                {studentModalError && (
                  <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900 font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span>{studentModalError}</span>
                    {isAddingNewStudent && studentModalError.includes('NISN') && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingStudent({
                            ...editingStudent,
                            nisn: generateUniqueNisn(),
                          });
                          setStudentModalError('');
                        }}
                        className="px-2.5 py-1 rounded bg-rose-700 text-white text-[11px] font-semibold hover:bg-rose-800 shrink-0 cursor-pointer"
                      >
                        Generate NISN Unik
                      </button>
                    )}
                  </div>
                )}

                {/* Inline Guide inside Student & Grades Modal */}
                <div className="p-3.5 rounded-lg bg-palette-accent/35 border border-palette-accent text-xs space-y-1">
                  <div className="font-semibold text-palette-text flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-palette-primary shrink-0" />
                    <span>
                      {isAddingNewStudent
                        ? 'Panduan Tambah Data Siswa Baru:'
                        : 'Panduan Pengisian Formulir Siswa & Transkrip Nilai:'}
                    </span>
                  </div>
                  <p className="text-palette-text/80 leading-relaxed">
                    1) Isi <strong>Nama Lengkap</strong>, <strong>10 digit NISN</strong>,{' '}
                    <strong>Nomor Peserta Ujian</strong>, dan <strong>Tanggal Lahir</strong>{' '}
                    (digunakan siswa untuk login di Portal Pengumuman), serta pilih{' '}
                    <strong>Kelas & Peminatan</strong>. 2) Nilai 8 mata pelajaran sudah terisi
                    nilai awal standar kelulusan dan dapat disesuaikan kapan saja. 3) Klik{' '}
                    <strong>
                      &ldquo;
                      {isAddingNewStudent
                        ? 'Simpan Data Siswa Baru'
                        : 'Simpan Perubahan Data'}
                      &rdquo;
                    </strong>{' '}
                    di bagian bawah untuk menyimpan ke tabel{' '}
                    <code className="font-mono">public.students</code>.
                  </p>
                </div>

                {/* SECTION 1: BIODATA & NOMOR SKL */}
                {(studentModalSection === 'all' || studentModalSection === 'biodata') && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-palette-text mb-1">
                        Nama Lengkap Siswa <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        autoFocus={isAddingNewStudent}
                        value={editingStudent.fullName}
                        onChange={(e) => {
                          setEditingStudent({ ...editingStudent, fullName: e.target.value });
                          if (studentModalError) setStudentModalError('');
                        }}
                        placeholder="Masukkan Nama Lengkap Peserta Didik..."
                        className="w-full px-3 py-2 min-h-[38px] text-xs bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <label className="block text-xs font-semibold text-palette-text">
                          NISN (Login) <span className="text-rose-600">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingStudent({
                              ...editingStudent,
                              nisn: generateUniqueNisn(),
                            });
                            if (studentModalError) setStudentModalError('');
                          }}
                          className="text-[11px] font-semibold text-palette-primary hover:underline cursor-pointer"
                          title="Buat 10 digit NISN unik otomatis"
                        >
                          Generate Unik
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        value={editingStudent.nisn}
                        onChange={(e) => {
                          setEditingStudent({ ...editingStudent, nisn: e.target.value });
                          if (studentModalError) setStudentModalError('');
                        }}
                        placeholder="Contoh: 0084921034"
                        className="w-full px-3 py-2 min-h-[38px] text-xs font-mono tabular-nums bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-palette-text mb-1">
                        Tempat Lahir
                      </label>
                      <input
                        type="text"
                        value={editingStudent.birthPlace}
                        onChange={(e) =>
                          setEditingStudent({ ...editingStudent, birthPlace: e.target.value })
                        }
                        placeholder="Contoh: Ciamis"
                        className="w-full px-3 py-2 min-h-[38px] text-xs bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-palette-text mb-1">
                        Tanggal Lahir (Login Siswa) <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={editingStudent.birthDate}
                        onChange={(e) =>
                          setEditingStudent({ ...editingStudent, birthDate: e.target.value })
                        }
                        className="w-full px-3 py-2 min-h-[38px] text-xs font-mono tabular-nums bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <label className="block text-xs font-semibold text-palette-text">
                          Nomor Peserta Ujian <span className="text-rose-600">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const seq = getNextStudentSequenceNumber();
                            setEditingStudent({
                              ...editingStudent,
                              examNumber: generateExamNumberForSequence(seq),
                            });
                          }}
                          className="text-[11px] font-semibold text-palette-primary hover:underline cursor-pointer"
                          title="Buat Nomor Peserta Ujian otomatis"
                        >
                          Otomatis
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        value={editingStudent.examNumber}
                        onChange={(e) =>
                          setEditingStudent({ ...editingStudent, examNumber: e.target.value })
                        }
                        placeholder="26-01-0145-0001-8"
                        className="w-full px-3 py-2 min-h-[38px] text-xs font-mono tabular-nums bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-palette-text mb-1">
                        Peminatan Jurusan
                      </label>
                      <select
                        value={editingStudent.major}
                        onChange={(e) =>
                          handleMajorChangeInModal(e.target.value as Major)
                        }
                        className="w-full px-3 py-2 min-h-[38px] text-xs bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
                      >
                        <option value="MIPA">MIPA (Matematika & Ilmu Alam)</option>
                        <option value="IPS">IPS (Ilmu Pengetahuan Sosial)</option>
                        <option value="BHS">BHS (Bahasa & Budaya)</option>
                        <option value="UMM">UMM (Umum / Semua Kelas / Lintas Minat)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-palette-text mb-1">
                        Kelas Rombongan Belajar & Wali Kelas
                      </label>
                      <select
                        value={editingStudent.className}
                        onChange={(e) => handleClassChangeInModal(e.target.value)}
                        className="w-full px-3 py-2 min-h-[38px] text-xs bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
                      >
                        {classRooms.length > 0 ? (
                          classRooms.map((cls) => (
                            <option key={cls.id} value={cls.className}>
                              {cls.className} ({cls.major}) — Wali Kelas: {cls.homeroomTeacher}
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="XII MIPA 1">XII MIPA 1 (MIPA)</option>
                            <option value="XII MIPA 2">XII MIPA 2 (MIPA)</option>
                            <option value="XII IPS 1">XII IPS 1 (IPS)</option>
                            <option value="XII IPS 2">XII IPS 2 (IPS)</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div className="sm:col-span-3 p-3.5 rounded-lg bg-palette-background border border-palette-accent space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <label className="block text-xs font-semibold text-palette-text">
                          Nomor Surat Keterangan Lulus (SKL) — Terintegrasi Data Nomor Surat
                        </label>
                        <span className="inline-flex items-center gap-1 text-[11px] text-palette-primary font-semibold">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Pilih Format Otomatis dari Menu Data Nomor Surat</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                        <div className="sm:col-span-5">
                          <select
                            value=""
                            onChange={(e) => {
                              const chosen = letterNumbers.find((l) => l.id === e.target.value);
                              if (!chosen) return;
                              const existingIdx = students.findIndex(
                                (s) => s.id === editingStudent.id
                              );
                              const studentIdx =
                                existingIdx >= 0
                                  ? existingIdx + 1
                                  : getNextStudentSequenceNumber();
                              const formatted = formatLetterNumberFromTemplate(chosen, studentIdx);
                              setEditingStudent({
                                ...editingStudent,
                                sklNumber: formatted,
                              });
                            }}
                            className="w-full px-3 py-2 min-h-[38px] text-xs bg-white border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
                          >
                            <option value="">
                              -- Terapkan Template dari Data Nomor Surat ({letterNumbers.length}) --
                            </option>
                            {letterNumbers.map((item) => {
                              const existingIdx = students.findIndex(
                                (s) => s.id === editingStudent.id
                              );
                              const studentIdx =
                                existingIdx >= 0
                                  ? existingIdx + 1
                                  : getNextStudentSequenceNumber();
                              const previewNum = formatLetterNumberFromTemplate(item, studentIdx);
                              return (
                                <option key={item.id} value={item.id}>
                                  [{item.code} · {item.majorTarget}] {previewNum}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                        <div className="sm:col-span-7">
                          <input
                            type="text"
                            value={editingStudent.sklNumber}
                            onChange={(e) =>
                              setEditingStudent({ ...editingStudent, sklNumber: e.target.value })
                            }
                            placeholder="Contoh: 421.3/001/SKL-SMAN1/V/2026"
                            className="w-full px-3 py-2 min-h-[38px] text-xs font-mono tabular-nums bg-white border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-xs font-semibold text-palette-text mb-1">
                        Catatan / Keterangan Kelulusan (Tampil pada SKL)
                      </label>
                      <input
                        type="text"
                        value={editingStudent.notes}
                        onChange={(e) =>
                          setEditingStudent({ ...editingStudent, notes: e.target.value })
                        }
                        placeholder="Contoh: Memenuhi seluruh kriteria kelulusan satuan pendidikan."
                        className="w-full px-3 py-2 min-h-[38px] text-xs bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
                      />
                    </div>
                  </div>
                )}

                {/* SECTION 2: SUBJECT SCORES TABLE */}
                {(studentModalSection === 'all' || studentModalSection === 'grades') && (
                  <div
                    className={`space-y-3 ${
                      studentModalSection === 'all' ? 'pt-4 border-t border-palette-accent' : ''
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-semibold text-palette-text uppercase tracking-wider">
                          Daftar Nilai Akhir Mata Pelajaran {editingStudent.major} (0 – 100)
                        </h4>
                        <p className="text-[11px] text-palette-text/65">
                          KKM Kelulusan: {settings.passingGradeKkm.toFixed(1)} · Otomatis menghitung
                          rata-rata & predikat
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleApplyPresetScoresInModal(85)}
                            className="px-2 py-1 text-[11px] font-medium bg-palette-background border border-palette-accent rounded hover:bg-palette-accent/60 text-palette-text cursor-pointer"
                            title="Isi seluruh nilai mata pelajaran dengan 85"
                          >
                            Set 85
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyPresetScoresInModal(90)}
                            className="px-2 py-1 text-[11px] font-medium bg-palette-background border border-palette-accent rounded hover:bg-palette-accent/60 text-palette-text cursor-pointer"
                            title="Isi seluruh nilai mata pelajaran dengan 90"
                          >
                            Set 90
                          </button>
                        </div>

                        <select
                          value={manualStatusOverride}
                          onChange={(e) =>
                            handleStatusOverrideChange(
                              e.target.value as 'AUTO' | GraduationStatus
                            )
                          }
                          className="px-2.5 py-1 text-xs font-medium bg-palette-background border border-palette-accent rounded-md text-palette-text"
                        >
                          <option value="AUTO">
                            Status Otomatis (Rata-rata &ge; {settings.passingGradeKkm})
                          </option>
                          <option value="LULUS">Tetapkan Manual: LULUS</option>
                          <option value="TIDAK LULUS">Tetapkan Manual: TIDAK LULUS</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {editingStudent.subjects.map((subj, idx) => (
                        <div
                          key={subj.code + idx}
                          className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-palette-background border border-palette-accent"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-palette-text truncate">
                              {subj.name}
                            </p>
                            <p className="text-[11px] text-palette-text/65 font-mono">
                              {subj.code} · {subj.category} (KKM {subj.kkm})
                            </p>
                          </div>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={subj.score}
                            onChange={(e) => handleSubjectScoreChange(idx, e.target.value)}
                            className="w-20 px-2.5 py-1.5 text-right text-xs font-mono tabular-nums font-semibold bg-white border border-palette-accent rounded-md focus:outline-none focus:border-palette-primary text-palette-text"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sticky Modal Footer with Live Summary & Submit Actions */}
              <div className="px-4 sm:px-6 py-3.5 border-t border-palette-accent bg-palette-background flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
                  <span>
                    Rata-Rata:{' '}
                    <strong className="font-mono tabular-nums text-sm text-palette-text">
                      {editingStudent.averageScore.toFixed(2)}
                    </strong>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Predikat:{' '}
                    <strong className="text-palette-text">{editingStudent.predicate}</strong>
                  </span>
                  <span
                    className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                      editingStudent.status === 'LULUS'
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                        : 'bg-rose-100 text-rose-900 border border-rose-200'
                    }`}
                  >
                    {editingStudent.status}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 min-h-[38px] text-xs font-medium text-palette-text bg-white border border-palette-accent rounded-lg hover:bg-palette-accent/50 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingStudent}
                    className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[38px] text-xs font-semibold text-white bg-palette-primary rounded-lg hover:bg-palette-text disabled:opacity-50 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>
                      {isSavingStudent
                        ? 'Menyimpan...'
                        : isAddingNewStudent
                          ? 'Simpan Data Siswa Baru'
                          : 'Simpan Perubahan Data'}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Template & Upload Modal for Data Siswa ('students') and Data Nilai ('grades') */}
      <CsvTemplateUploadModal
        isOpen={csvModalMode !== null}
        mode={csvModalMode || 'students'}
        students={students}
        classRooms={classRooms}
        settings={settings}
        onClose={() => setCsvModalMode(null)}
        onBulkSaveStudents={onBulkSaveStudents}
      />

      {/* Comprehensive User Guide Modal */}
      <AdminGuideModal
        isOpen={isGuideModalOpen}
        initialTopic={guideTopic}
        onClose={() => setIsGuideModalOpen(false)}
      />

      {/* Supabase Storage Menu Token Gate Notification Modal (Default Token: VIRGA100791) */}
      {isSupabaseTokenModalOpen && (
        <div className="fixed inset-0 z-50 bg-palette-text/55 flex items-center justify-center p-4">
          <div className="bg-white border border-palette-accent rounded-xl max-w-md w-full overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-palette-accent bg-palette-background flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-palette-accent/70 text-palette-primary">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-palette-text">
                    Verifikasi Token Penyimpanan Supabase
                  </h3>
                  <p className="text-xs text-palette-text/70">
                    Otorisasi keamanan sebelum mengakses konfigurasi database cloud
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSupabaseTokenModalOpen(false)}
                className="p-1.5 text-palette-text/70 hover:text-palette-text rounded-lg hover:bg-palette-accent/50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleVerifySupabaseToken} className="p-6 space-y-4">
              <div className="p-3.5 rounded-lg bg-palette-accent/35 border border-palette-accent text-xs text-palette-text/85 leading-relaxed">
                Menu <strong>Penyimpanan Supabase</strong> memuat konfigurasi endpoint PostgreSQL,
                inspeksi skema tabel, dan riwayat migrasi SQL. Masukkan{' '}
                <strong>TOKEN KEAMANAN</strong> untuk melanjutkan.
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-palette-text">
                    Masukkan Token Akses Supabase
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowSupabaseToken((prev) => !prev)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-palette-primary hover:underline cursor-pointer"
                  >
                    {showSupabaseToken ? (
                      <>
                        <EyeOff className="w-3 h-3" />
                        <span>Sembunyikan</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3" />
                        <span>Tampilkan</span>
                      </>
                    )}
                  </button>
                </div>
                <input
                  type={showSupabaseToken ? 'text' : 'password'}
                  required
                  autoFocus
                  value={supabaseTokenInput}
                  onChange={(e) => {
                    setSupabaseTokenInput(e.target.value);
                    if (supabaseTokenError) setSupabaseTokenError('');
                  }}
                  placeholder="Masukkan Token Keamanan..."
                  className="w-full px-3.5 py-2.5 text-xs font-mono tracking-wider bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
                />
              </div>

              {supabaseTokenError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900 font-medium">
                  {supabaseTokenError}
                </div>
              )}

              <div className="pt-2 border-t border-palette-accent flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsSupabaseTokenModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-palette-text bg-palette-background border border-palette-accent rounded-lg hover:bg-palette-accent/50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-palette-primary rounded-lg hover:bg-palette-text cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Verifikasi & Buka Supabase</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
