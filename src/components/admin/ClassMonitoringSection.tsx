import React, { useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Users,
  Clock,
  Eye,
  Search,
  Filter,
  Download,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  FileText,
  Building,
  UserCheck,
  UserX,
  Sparkles,
} from 'lucide-react';
import { AnnouncementSettings, ClassRoomRecord, StudentRecord } from '../../types/graduation';
import { generateGraduationCertificatePDF } from '../../utils/pdfGenerator';

interface ClassMonitoringSectionProps {
  classRooms: ClassRoomRecord[];
  students: StudentRecord[];
  settings: AnnouncementSettings;
}

export const ClassMonitoringSection: React.FC<ClassMonitoringSectionProps> = ({
  classRooms,
  students,
  settings,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMajorFilter, setSelectedMajorFilter] = useState<'ALL' | 'MIPA' | 'IPS' | 'BHS' | 'UMM'>('ALL');
  const [selectedLoginFilter, setSelectedLoginFilter] = useState<'ALL' | 'CHECKED' | 'UNCHECKED'>('ALL');
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);

  // Global KPIs
  const totalStudents = students.length;
  const passedStudents = students.filter((s) => s.status === 'LULUS').length;
  const failedStudents = totalStudents - passedStudents;
  const passRate = totalStudents > 0 ? ((passedStudents / totalStudents) * 100).toFixed(1) : '0';

  const checkedStudents = students.filter((s) => Boolean(s.checkedAt)).length;
  const uncheckedStudents = totalStudents - checkedStudents;
  const checkRate = totalStudents > 0 ? ((checkedStudents / totalStudents) * 100).toFixed(1) : '0';

  // Filter classes
  const filteredClassRooms = classRooms.filter((cls) => {
    const matchesSearch =
      cls.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cls.homeroomTeacher.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesMajor =
      selectedMajorFilter === 'ALL' ||
      cls.major === selectedMajorFilter ||
      cls.className.toUpperCase().includes(selectedMajorFilter);

    if (!matchesSearch || !matchesMajor) return false;

    if (selectedLoginFilter === 'CHECKED') {
      const clsStudents = students.filter((s) => s.className === cls.className);
      return clsStudents.length > 0 && clsStudents.every((s) => Boolean(s.checkedAt));
    }
    if (selectedLoginFilter === 'UNCHECKED') {
      const clsStudents = students.filter((s) => s.className === cls.className);
      return clsStudents.some((s) => !s.checkedAt);
    }

    return true;
  });

  const toggleExpandClass = (clsId: string) => {
    setExpandedClassId((prev) => (prev === clsId ? null : clsId));
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="bg-white border border-palette-accent rounded-xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-palette-primary mb-1 font-mono uppercase tracking-wider">
              <BarChart3 className="w-4 h-4 text-palette-primary" />
              <span>Menu Pemantauan & Analitik Real-Time</span>
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-palette-text">
              Ketercapaian & Pemantauan per Kelas
            </h2>
            <p className="text-xs sm:text-sm text-palette-text/70 mt-1">
              Statistik kelulusan dan jumlah siswa yang sudah login mengecek hasil pengumuman SKL
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                settings.isPublished
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  settings.isPublished ? 'bg-emerald-600 animate-pulse' : 'bg-amber-600'
                }`}
              />
              <span>Portal {settings.isPublished ? 'DIBUKA (Aktif)' : 'DIKUNCI (Countdown)'}</span>
            </span>
          </div>
        </div>

        {/* Global Summary KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-2">
          {/* Card 1: Total Siswa */}
          <div className="p-4 rounded-xl bg-palette-background border border-palette-accent space-y-1">
            <div className="flex items-center justify-between text-palette-text/70">
              <span className="text-xs font-medium">Total Peserta Didik</span>
              <Users className="w-4 h-4 text-palette-primary" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-2xl sm:text-3xl font-bold text-palette-text font-mono tabular-nums">
                {totalStudents}
              </span>
              <span className="text-xs text-palette-text/60">Siswa ({classRooms.length} Kelas)</span>
            </div>
          </div>

          {/* Card 2: Lulus */}
          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-1">
            <div className="flex items-center justify-between text-emerald-900">
              <span className="text-xs font-medium">Dinyatakan Lulus</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-2xl sm:text-3xl font-bold text-emerald-900 font-mono tabular-nums">
                {passedStudents}
              </span>
              <span className="text-xs font-semibold text-emerald-800">({passRate}%)</span>
            </div>
          </div>

          {/* Card 3: Sudah Login Cek SKL */}
          <div className="p-4 rounded-xl bg-sky-50/60 border border-sky-200 space-y-1">
            <div className="flex items-center justify-between text-sky-900">
              <span className="text-xs font-medium">Sudah Cek Portal SKL</span>
              <UserCheck className="w-4 h-4 text-sky-700" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-2xl sm:text-3xl font-bold text-sky-900 font-mono tabular-nums">
                {checkedStudents}
              </span>
              <span className="text-xs font-semibold text-sky-800">({checkRate}% Siswa)</span>
            </div>
          </div>

          {/* Card 4: Belum Login Cek SKL */}
          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 space-y-1">
            <div className="flex items-center justify-between text-amber-900">
              <span className="text-xs font-medium">Belum Cek Portal</span>
              <UserX className="w-4 h-4 text-amber-700" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-2xl sm:text-3xl font-bold text-amber-900 font-mono tabular-nums">
                {uncheckedStudents}
              </span>
              <span className="text-xs font-semibold text-amber-800">Siswa Tersisa</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Controls Toolbar */}
      <div className="bg-white border border-palette-accent rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-palette-text/50" />
          <input
            type="text"
            placeholder="Cari kelas atau nama wali kelas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-palette-background p-1 rounded-lg border border-palette-accent text-xs">
            <span className="px-2 text-palette-text/60 font-medium text-[11px]">Peminatan:</span>
            {(['ALL', 'MIPA', 'IPS', 'BHS', 'UMM'] as const).map((maj) => (
              <button
                key={maj}
                type="button"
                onClick={() => setSelectedMajorFilter(maj)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  selectedMajorFilter === maj
                    ? 'bg-palette-primary text-white font-semibold'
                    : 'text-palette-text/75 hover:bg-palette-accent/40'
                }`}
              >
                {maj === 'ALL' ? 'Semua' : maj}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-palette-background p-1 rounded-lg border border-palette-accent text-xs">
            <span className="px-2 text-palette-text/60 font-medium text-[11px]">Status Cek:</span>
            <button
              type="button"
              onClick={() => setSelectedLoginFilter('ALL')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                selectedLoginFilter === 'ALL'
                  ? 'bg-palette-primary text-white font-semibold'
                  : 'text-palette-text/75 hover:bg-palette-accent/40'
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setSelectedLoginFilter('CHECKED')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                selectedLoginFilter === 'CHECKED'
                  ? 'bg-emerald-700 text-white font-semibold'
                  : 'text-palette-text/75 hover:bg-palette-accent/40'
              }`}
            >
              100% Cek
            </button>
            <button
              type="button"
              onClick={() => setSelectedLoginFilter('UNCHECKED')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                selectedLoginFilter === 'UNCHECKED'
                  ? 'bg-amber-700 text-white font-semibold'
                  : 'text-palette-text/75 hover:bg-palette-accent/40'
              }`}
            >
              Belum Lengkap
            </button>
          </div>
        </div>
      </div>

      {/* Class Monitoring Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClassRooms.map((cls) => {
          const classStudents = students.filter((s) => s.className === cls.className);
          const totalInClass = classStudents.length;
          const passedInClass = classStudents.filter((s) => s.status === 'LULUS').length;
          const failedInClass = totalInClass - passedInClass;
          const checkedInClass = classStudents.filter((s) => Boolean(s.checkedAt)).length;
          const uncheckedInClass = totalInClass - checkedInClass;

          const passPct = totalInClass > 0 ? Math.round((passedInClass / totalInClass) * 100) : 0;
          const checkPct = totalInClass > 0 ? Math.round((checkedInClass / totalInClass) * 100) : 0;
          const isExpanded = expandedClassId === cls.id;

          return (
            <div
              key={cls.id}
              className="bg-white border border-palette-accent rounded-xl p-5 space-y-4 hover:border-palette-primary/50 transition-colors shadow-xs"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-base font-bold text-palette-text">
                      {cls.className}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-palette-accent/50 text-palette-text">
                      {cls.major}
                    </span>
                  </div>
                  <p className="text-xs text-palette-text/70 mt-0.5">
                    Wali Kelas: <strong className="text-palette-text">{cls.homeroomTeacher}</strong>
                  </p>
                </div>

                <span className="font-mono tabular-nums text-xs font-semibold px-2 py-1 rounded-lg bg-palette-background border border-palette-accent text-palette-text">
                  {totalInClass} Siswa
                </span>
              </div>

              {/* Progress 1: Kelulusan */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-palette-text/75 font-medium">Tingkat Kelulusan:</span>
                  <span className="font-mono tabular-nums font-semibold text-emerald-800">
                    {passedInClass}/{totalInClass} ({passPct}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-palette-accent/60 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-600 transition-all duration-300"
                    style={{ width: `${passPct}%` }}
                    title={`${passedInClass} Siswa Lulus`}
                  />
                  {failedInClass > 0 && (
                    <div
                      className="h-full bg-rose-600 transition-all duration-300"
                      style={{ width: `${100 - passPct}%` }}
                      title={`${failedInClass} Siswa Belum Lulus`}
                    />
                  )}
                </div>
              </div>

              {/* Progress 2: Login Cek Portal */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-palette-text/75 font-medium">Sudah Login Cek SKL:</span>
                  <span className="font-mono tabular-nums font-semibold text-sky-800">
                    {checkedInClass}/{totalInClass} ({checkPct}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-palette-accent/60 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sky-600 transition-all duration-300"
                    style={{ width: `${checkPct}%` }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-palette-accent flex items-center justify-between gap-2">
                <div className="text-[11px] text-palette-text/65">
                  {uncheckedInClass === 0 ? (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Semua sudah cek
                    </span>
                  ) : (
                    <span>{uncheckedInClass} siswa belum cek</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => toggleExpandClass(cls.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-palette-primary hover:bg-palette-accent/40 transition-colors cursor-pointer"
                >
                  <span>{isExpanded ? 'Tutup Daftar' : 'Detail Siswa'}</span>
                  {isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* Expandable Student Login Log */}
              {isExpanded && (
                <div className="pt-3 border-t border-palette-accent space-y-2">
                  <p className="text-[11px] font-semibold text-palette-text uppercase tracking-wider font-mono">
                    Daftar Siswa & Log Login ({classStudents.length})
                  </p>
                  <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                    {classStudents.length === 0 ? (
                      <p className="text-xs text-palette-text/60 italic py-2">
                        Belum ada siswa di kelas ini.
                      </p>
                    ) : (
                      classStudents.map((st) => (
                        <div
                          key={st.id}
                          className="p-2.5 rounded-lg bg-palette-background border border-palette-accent flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-palette-text truncate">{st.fullName}</p>
                            <p className="text-[10px] font-mono tabular-nums text-palette-text/60">
                              NISN: {st.nisn} · Nilai: {st.averageScore.toFixed(1)}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {st.checkedAt ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-100 text-sky-800">
                                <CheckCircle2 className="w-3 h-3 text-sky-700" />
                                <span>Cek: {new Date(st.checkedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800">
                                <Clock className="w-3 h-3 text-amber-700" />
                                <span>Belum Cek</span>
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => generateGraduationCertificatePDF(st, settings)}
                              title="Unduh SKL PDF Siswa Ini"
                              className="p-1 rounded text-palette-text/70 hover:text-palette-primary hover:bg-palette-accent/50 cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredClassRooms.length === 0 && (
        <div className="bg-white border border-palette-accent rounded-xl p-8 text-center space-y-2">
          <p className="text-sm font-semibold text-palette-text">Tidak ada kelas yang sesuai filter.</p>
          <p className="text-xs text-palette-text/60">
            Coba ubah kata kunci pencarian atau sesuaikan filter peminatan dan status cek.
          </p>
        </div>
      )}
    </div>
  );
};
