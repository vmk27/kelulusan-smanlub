import React, { useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Award,
  BarChart3,
  GraduationCap,
  Users,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';
import {
  AlumniRecord,
  AnnouncementSettings,
  ClassRoomRecord,
  StudentRecord,
} from '../../types/graduation';

interface AdminAnalyticsSectionProps {
  classRooms: ClassRoomRecord[];
  students: StudentRecord[];
  alumni: AlumniRecord[];
  settings: AnnouncementSettings;
}

export const AdminAnalyticsSection: React.FC<AdminAnalyticsSectionProps> = ({
  classRooms,
  students,
  alumni,
  settings,
}) => {
  // 1. Predicate Breakdown
  const predicateStats = useMemo(() => {
    const total = Math.max(1, students.length);
    const counts = {
      pujian: students.filter((s) => s.predicate === 'Dengan Pujian').length,
      sangatMemuaskan: students.filter((s) => s.predicate === 'Sangat Memuaskan').length,
      memuaskan: students.filter((s) => s.predicate === 'Memuaskan').length,
      belumMemenuhi: students.filter((s) => s.predicate === 'Belum Memenuhi Kriteria').length,
    };
    return [
      {
        label: 'Dengan Pujian (Rata-rata ≥ 90,00)',
        count: counts.pujian,
        pct: Math.round((counts.pujian / total) * 100),
        barColor: 'bg-palette-primary',
        trend: '+4.2% vs TA lalu',
        trendUp: true,
      },
      {
        label: 'Sangat Memuaskan (82,00 – 89,99)',
        count: counts.sangatMemuaskan,
        pct: Math.round((counts.sangatMemuaskan / total) * 100),
        barColor: 'bg-emerald-600',
        trend: '+2.8% vs TA lalu',
        trendUp: true,
      },
      {
        label: 'Memuaskan (75,00 – 81,99)',
        count: counts.memuaskan,
        pct: Math.round((counts.memuaskan / total) * 100),
        barColor: 'bg-sky-600',
        trend: '-1.5% vs TA lalu',
        trendUp: true,
      },
      {
        label: 'Belum Memenuhi Kriteria (< KKM)',
        count: counts.belumMemenuhi,
        pct: Math.round((counts.belumMemenuhi / total) * 100),
        barColor: 'bg-rose-600',
        trend: '-1.8% penurunan',
        trendUp: false,
      },
    ];
  }, [students]);

  // 2. Subject Average Analytics
  const subjectAnalytics = useMemo(() => {
    const map: Record<
      string,
      { code: string; name: string; total: number; count: number; passCount: number }
    > = {};

    students.forEach((std) => {
      std.subjects.forEach((subj) => {
        if (!map[subj.code]) {
          map[subj.code] = {
            code: subj.code,
            name: subj.name,
            total: 0,
            count: 0,
            passCount: 0,
          };
        }
        map[subj.code].total += subj.score;
        map[subj.code].count += 1;
        if (subj.score >= settings.passingGradeKkm) {
          map[subj.code].passCount += 1;
        }
      });
    });

    return Object.values(map)
      .map((item) => ({
        code: item.code,
        name: item.name,
        avg: item.count > 0 ? Number((item.total / item.count).toFixed(2)) : 0,
        passRate: item.count > 0 ? Math.round((item.passCount / item.count) * 100) : 0,
        count: item.count,
      }))
      .sort((a, b) => b.avg - a.avg);
  }, [students, settings.passingGradeKkm]);

  // 3. Top 5 Academic Performers
  const topStudents = useMemo(() => {
    return [...students].sort((a, b) => b.averageScore - a.averageScore).slice(0, 5);
  }, [students]);

  // 4. Class Comparison Analytics
  const classAnalytics = useMemo(() => {
    return classRooms.map((cls) => {
      const members = students.filter((s) => s.className === cls.className);
      const count = members.length;
      const passed = members.filter((s) => s.status === 'LULUS').length;
      const avg =
        count > 0
          ? Number((members.reduce((acc, s) => acc + s.averageScore, 0) / count).toFixed(2))
          : 0;
      const passRate = count > 0 ? Math.round((passed / count) * 100) : 0;
      return {
        ...cls,
        studentCount: count,
        passedCount: passed,
        avgScore: avg,
        passRate,
      };
    });
  }, [classRooms, students]);

  // 5. Alumni Tracer Study Summary
  const alumniTracerSummary = useMemo(() => {
    const total = Math.max(1, alumni.length);
    const categories = [
      'PTN / PTS',
      'Kedinasan / TNI-Polri',
      'Bekerja / Wirausaha',
      'Belum Terdata',
    ] as const;
    return categories.map((cat) => {
      const count = alumni.filter((a) => a.continuationStatus === cat).length;
      return {
        category: cat,
        count,
        pct: Math.round((count / total) * 100),
      };
    });
  }, [alumni]);

  return (
    <div className="space-y-6">
      {/* Row 1: Predicate Distribution & Class Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 6 cols: Distribusi Predikat Kelulusan */}
        <div className="lg:col-span-6 bg-white border border-palette-accent rounded-xl p-6 space-y-5">
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-palette-accent">
            <div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-palette-primary" />
                <h2 className="text-sm font-semibold text-palette-text">
                  Distribusi Predikat & Capaian Kelulusan
                </h2>
              </div>
              <p className="text-xs text-palette-text/70 mt-0.5">
                Sebaran predikat kelulusan peserta didik terhadap standar KKM (
                {settings.passingGradeKkm.toFixed(2)})
              </p>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-semibold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+3.4% YoY</span>
            </span>
          </div>

          <div className="space-y-4">
            {predicateStats.map((item) => (
              <div key={item.label} className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-palette-text">{item.label}</span>
                  <div className="flex items-center gap-2 font-mono tabular-nums">
                    <span className="font-semibold text-palette-text">
                      {item.count} Siswa ({item.pct}%)
                    </span>
                    <span
                      className={`inline-flex items-center gap-0.5 text-[11px] px-1.5 py-0.5 rounded ${
                        item.trendUp
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-amber-50 text-amber-800'
                      }`}
                    >
                      {item.trendUp ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {item.trend}
                    </span>
                  </div>
                </div>
                <div className="w-full h-2.5 bg-palette-background border border-palette-accent rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.barColor} rounded-full transition-all duration-300`}
                    style={{ width: `${Math.max(4, item.pct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 6 cols: Perbandingan Performa Antar Kelas */}
        <div className="lg:col-span-6 bg-white border border-palette-accent rounded-xl p-6 space-y-5">
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-palette-accent">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-palette-primary" />
                <h2 className="text-sm font-semibold text-palette-text">
                  Analitik Nilai Rata-Rata & Kelulusan per Kelas
                </h2>
              </div>
              <p className="text-xs text-palette-text/70 mt-0.5">
                Perbandingan indeks prestasi akademik antar rombongan belajar
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums text-palette-primary font-semibold">
              {classAnalytics.length} Rombel
            </span>
          </div>

          <div className="space-y-3.5">
            {classAnalytics.map((cls) => (
              <div
                key={cls.id}
                className="p-3.5 rounded-lg bg-palette-background border border-palette-accent space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-palette-text">{cls.className}</span>
                    <span className="mx-1.5 text-palette-text/40">·</span>
                    <span className="text-xs text-palette-text/75">{cls.homeroomTeacher}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono tabular-nums text-xs">
                    <span className="px-2 py-0.5 rounded bg-white border border-palette-accent text-palette-text font-semibold">
                      Rerata: {cls.avgScore.toFixed(2)}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold">
                      {cls.passRate}% Lulus
                    </span>
                  </div>
                </div>

                <div className="w-full h-2 bg-palette-accent rounded-full overflow-hidden">
                  <div
                    className="h-full bg-palette-primary rounded-full"
                    style={{ width: `${Math.min(100, cls.avgScore)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Subject Score Analytics & Top Students / Alumni Tracer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 cols: Analisis Nilai Rata-Rata Mata Pelajaran */}
        <div className="lg:col-span-7 bg-white border border-palette-accent rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-palette-accent">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-palette-primary" />
              <div>
                <h2 className="text-sm font-semibold text-palette-text">
                  Indeks Capaian Nilai per Mata Pelajaran Ujian
                </h2>
                <p className="text-xs text-palette-text/70">
                  Urutan rata-rata nilai tertinggi hingga terendah beserta persentase ketuntasan KKM
                </p>
              </div>
            </div>
            <BarChart3 className="w-4 h-4 text-palette-primary" />
          </div>

          <div className="space-y-3">
            {subjectAnalytics.map((subj) => {
              const aboveKkm = subj.avg >= settings.passingGradeKkm;
              return (
                <div key={subj.code} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-bold text-palette-primary w-9 shrink-0">
                        {subj.code}
                      </span>
                      <span className="text-palette-text font-medium truncate">{subj.name}</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono tabular-nums shrink-0">
                      <span className="text-palette-text/70 text-[11px]">
                        Tuntas: {subj.passRate}%
                      </span>
                      <strong
                        className={`text-xs ${
                          aboveKkm ? 'text-palette-text' : 'text-rose-700'
                        }`}
                      >
                        {subj.avg.toFixed(2)}
                      </strong>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-palette-background border border-palette-accent rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        aboveKkm ? 'bg-palette-primary' : 'bg-rose-600'
                      }`}
                      style={{ width: `${Math.min(100, subj.avg)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 5 cols: Top 5 Siswa Terbaik & Tracer Study Alumni */}
        <div className="lg:col-span-5 space-y-6">
          {/* Top 5 Performers */}
          <div className="bg-white border border-palette-accent rounded-xl p-6 space-y-4">
            <div className="pb-3 border-b border-palette-accent flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-palette-text">
                  5 Peringkat Nilai Tertinggi Paralel
                </h2>
                <p className="text-xs text-palette-text/70">
                  Berdasarkan rata-rata nilai ujian satuan pendidikan
                </p>
              </div>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>

            <div className="divide-y divide-palette-accent/60">
              {topStudents.map((std, idx) => (
                <div key={std.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-md bg-palette-accent/70 text-palette-text font-mono tabular-nums text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-palette-text truncate">
                        {std.fullName}
                      </p>
                      <p className="text-[11px] text-palette-text/65 font-mono tabular-nums">
                        {std.className} · NISN {std.nisn}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono tabular-nums text-xs font-bold text-palette-primary shrink-0">
                    {std.averageScore.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Tracer Study Alumni */}
          <div className="bg-white border border-palette-accent rounded-xl p-6 space-y-4">
            <div className="pb-3 border-b border-palette-accent flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-palette-primary" />
                <div>
                  <h2 className="text-sm font-semibold text-palette-text">
                    Sebaran Jejak Lulusan (Data Alumni)
                  </h2>
                  <p className="text-xs text-palette-text/70">
                    Total {alumni.length} arsip alumni tercatat
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {alumniTracerSummary.map((item) => (
                <div
                  key={item.category}
                  className="p-3 rounded-lg bg-palette-background border border-palette-accent"
                >
                  <p className="text-[11px] text-palette-text/75 truncate">{item.category}</p>
                  <div className="flex items-baseline justify-between mt-1 font-mono tabular-nums">
                    <strong className="text-base font-bold text-palette-text">
                      {item.count}
                    </strong>
                    <span className="text-xs text-palette-primary font-semibold">
                      {item.pct}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
