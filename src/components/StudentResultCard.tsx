import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle2,
  AlertTriangle,
  Download,
  LogOut,
  FileCheck2,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { AnnouncementSettings, StudentRecord } from '../types/graduation';
import {
  formatIndonesianDate,
  generateGraduationCertificatePDF,
} from '../utils/pdfGenerator';

interface StudentResultCardProps {
  student: StudentRecord;
  settings: AnnouncementSettings;
  homeroomTeacherName?: string;
  onLogout: () => void;
}

export const StudentResultCard: React.FC<StudentResultCardProps> = ({
  student,
  settings,
  homeroomTeacherName,
  onLogout,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const isPass = student.status === 'LULUS';

  const handleDownloadPDF = () => {
    setIsDownloading(true);
    setDownloadSuccess(false);
    setTimeout(() => {
      generateGraduationCertificatePDF(student, settings);
      setIsDownloading(false);
      setDownloadSuccess(true);
    }, 150);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="bg-white border border-palette-accent rounded-xl overflow-hidden shadow-xs"
    >
      {/* Top Institutional Banner */}
      <div
        className={`px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-7 border-b ${
          isPass
            ? 'bg-palette-text text-white border-palette-primary'
            : 'bg-rose-950 text-white border-rose-900'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] sm:text-xs text-palette-accent">
              <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>Keputusan Resmi Rapat Pleno Dewan Pendidik</span>
              <span aria-hidden="true">·</span>
              <span>Tahun Ajaran {settings.academicYear}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums break-all">{student.sklNumber}</span>
            </div>

            <div className="flex items-start sm:items-center gap-3 pt-1">
              {isPass ? (
                <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-300 shrink-0 mt-0.5 sm:mt-0" />
              ) : (
                <AlertTriangle className="w-7 h-7 sm:w-8 sm:h-8 text-amber-300 shrink-0 mt-0.5 sm:mt-0" />
              )}
              <div className="min-w-0">
                <p className="text-xs text-palette-accent">Status Kelulusan Peserta Didik</p>
                <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white leading-tight">
                  {isPass ? 'DINYATAKAN LULUS' : 'DINYATAKAN TIDAK LULUS'}
                </h2>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3 w-full md:w-auto">
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[42px] text-xs font-semibold bg-white text-palette-text rounded-lg hover:bg-palette-accent/40 transition-colors cursor-pointer w-full sm:w-auto"
            >
              <Download className="w-4 h-4 text-palette-primary shrink-0" />
              <span className="truncate">
                {isDownloading
                  ? 'Menyiapkan Dokumen PDF...'
                  : 'Unduh Surat Keterangan Lulus (PDF)'}
              </span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[42px] text-xs font-medium text-palette-accent hover:text-white border border-white/25 rounded-lg hover:bg-white/10 transition-colors cursor-pointer w-full sm:w-auto"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span>Tutup Hasil</span>
            </button>
          </div>
        </div>

        {downloadSuccess && (
          <div className="mt-4 pt-3 border-t border-white/15 flex items-center gap-2 text-xs text-emerald-200">
            <FileCheck2 className="w-4 h-4 shrink-0" />
            <span>
              Dokumen resmi <strong>SKL_2026_{student.nisn}.pdf</strong> berhasil diunduh ke
              perangkat Anda.
            </span>
          </div>
        )}
      </div>

      {/* Student Identity & Summary Metrics */}
      <div className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 pb-6 border-b border-palette-accent">
          <div className="lg:col-span-8 space-y-3 sm:space-y-4">
            <div>
              <p className="text-xs text-palette-primary font-medium">Nama Lengkap Peserta Didik</p>
              <h3 className="font-display text-xl sm:text-2xl font-semibold text-palette-text mt-0.5 break-words">
                {student.fullName}
              </h3>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-palette-text/80 mt-1.5">
                <span>
                  NISN{' '}
                  <strong className="font-mono tabular-nums text-palette-text">
                    {student.nisn}
                  </strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  No. Ujian{' '}
                  <strong className="font-mono tabular-nums text-palette-text">
                    {student.examNumber}
                  </strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>Kelas {student.className}</span>
                {homeroomTeacherName && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>Wali Kelas: {homeroomTeacherName}</span>
                  </>
                )}
                <span aria-hidden="true">·</span>
                <span>
                  Lahir di {student.birthPlace}, {formatIndonesianDate(student.birthDate)}
                </span>
              </div>
            </div>

            <p className="text-sm text-palette-text/80 leading-relaxed max-w-2xl">
              {student.notes || settings.announcementNote}
            </p>
          </div>

          {/* Academic Summary Grid */}
          <div className="lg:col-span-4 grid grid-cols-2 gap-4 bg-palette-background border border-palette-accent rounded-lg p-4">
            <div>
              <p className="text-xs text-palette-text/70">Rata-Rata Nilai Akhir</p>
              <p className="font-mono tabular-nums text-2xl font-semibold text-palette-text mt-1">
                {student.averageScore.toFixed(2)}
              </p>
              <p className="text-xs text-palette-text/70 mt-0.5 font-mono tabular-nums">
                Batas KKM: {settings.passingGradeKkm.toFixed(2)}
              </p>
            </div>
            <div className="border-l border-palette-accent pl-4">
              <p className="text-xs text-palette-text/70">Predikat Kelulusan</p>
              <p
                className={`text-sm font-semibold mt-1.5 ${
                  isPass ? 'text-emerald-800' : 'text-rose-800'
                }`}
              >
                {student.predicate}
              </p>
              <p className="text-xs text-palette-text/70 mt-1">Peminatan {student.major}</p>
            </div>
          </div>
        </div>

        {/* Complete Academic Transcript Table */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-base font-semibold text-palette-text">
                Transkrip Nilai Akhir Satuan Pendidikan
              </h4>
              <p className="text-xs text-palette-text/70">
                Data nilai diperbarui secara real-time dari basis data akademik {settings.schoolName}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-palette-text/70 font-mono tabular-nums">
              <Clock className="w-3.5 h-3.5 text-palette-primary" />
              <span>
                Sinkronisasi Terakhir:{' '}
                {new Date(student.updatedAt).toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                WIB
              </span>
            </div>
          </div>

          {/* Mobile Card View for Subjects (< 768px) */}
          <div className="md:hidden space-y-2.5">
            {student.subjects.map((subj, idx) => {
              const meetsKkm = subj.score >= subj.kkm;
              return (
                <div
                  key={subj.code + idx}
                  className="p-3.5 rounded-lg border border-palette-accent bg-palette-background/60 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono tabular-nums text-palette-text/60">
                        {String(idx + 1).padStart(2, '0')}.
                      </span>
                      <span className="font-mono font-semibold text-palette-primary">
                        {subj.code}
                      </span>
                      <span aria-hidden="true" className="text-palette-text/40">
                        ·
                      </span>
                      <span className="text-palette-text/70">{subj.category}</span>
                    </div>
                    <p className="text-sm font-medium text-palette-text leading-snug break-words">
                      {subj.name}
                    </p>
                    <p className="text-[11px] font-mono tabular-nums text-palette-text/65">
                      KKM: {subj.kkm.toFixed(0)} ·{' '}
                      <span className={meetsKkm ? 'text-emerald-800' : 'text-rose-700'}>
                        {meetsKkm ? 'Tuntas' : 'Belum Tuntas'}
                      </span>
                    </p>
                  </div>
                  <div className="text-right shrink-0 pl-2 border-l border-palette-accent">
                    <p className="text-[10px] text-palette-text/60">Nilai</p>
                    <p
                      className={`font-mono tabular-nums text-lg font-bold ${
                        meetsKkm ? 'text-palette-text' : 'text-rose-700'
                      }`}
                    >
                      {subj.score.toFixed(0)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div className="p-3.5 rounded-lg bg-palette-accent/45 border border-palette-accent flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-palette-text">
                  Rata-Rata Nilai Akhir ({student.subjects.length} Mapel)
                </p>
                <p className="text-[11px] font-mono tabular-nums text-palette-text/70">
                  Batas KKM: {settings.passingGradeKkm.toFixed(2)} · Status: {student.status}
                </p>
              </div>
              <p className="font-mono tabular-nums text-lg font-bold text-palette-primary">
                {student.averageScore.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Tablet & Desktop Table View (>= 768px) */}
          <div className="hidden md:block overflow-x-auto border border-palette-accent rounded-lg">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-palette-accent/45 border-b border-palette-accent text-xs font-semibold text-palette-text">
                  <th className="py-3 px-4 w-12">No</th>
                  <th className="py-3 px-4 w-24">Kode</th>
                  <th className="py-3 px-4">Mata Pelajaran</th>
                  <th className="py-3 px-4 w-32">Kelompok</th>
                  <th className="py-3 px-4 w-24 text-right">KKM</th>
                  <th className="py-3 px-4 w-28 text-right">Nilai Akhir</th>
                  <th className="py-3 px-4 w-32 text-right">Capaian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-palette-accent/60 text-sm">
                {student.subjects.map((subj, idx) => {
                  const meetsKkm = subj.score >= subj.kkm;
                  return (
                    <tr
                      key={subj.code + idx}
                      className="hover:bg-palette-accent/20 transition-colors"
                    >
                      <td className="py-2.5 px-4 font-mono tabular-nums text-xs text-palette-text/60">
                        {String(idx + 1).padStart(2, '0')}
                      </td>
                      <td className="py-2.5 px-4 font-mono tabular-nums text-xs font-medium text-palette-primary">
                        {subj.code}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-palette-text">{subj.name}</td>
                      <td className="py-2.5 px-4 text-xs text-palette-text/75">{subj.category}</td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs text-palette-text/65">
                        {subj.kkm.toFixed(0)}
                      </td>
                      <td
                        className={`py-2.5 px-4 text-right font-mono tabular-nums font-semibold ${
                          meetsKkm ? 'text-palette-text' : 'text-rose-700'
                        }`}
                      >
                        {subj.score.toFixed(0)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-xs">
                        <span
                          className={
                            meetsKkm ? 'text-emerald-800 font-medium' : 'text-rose-700 font-medium'
                          }
                        >
                          {meetsKkm ? 'Tuntas' : 'Belum Tuntas'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-palette-background border-t border-palette-accent font-semibold text-palette-text">
                  <td colSpan={4} className="py-3 px-4 text-xs">
                    Rata-Rata Nilai Akhir ({student.subjects.length} Mata Pelajaran)
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-palette-text/70">
                    {settings.passingGradeKkm.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-sm text-palette-primary">
                    {student.averageScore.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right text-xs">
                    <span className={isPass ? 'text-emerald-800' : 'text-rose-800'}>
                      {student.status}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Bottom Official Sign-off Area (Principal Signature) */}
        <div className="pt-6 border-t border-palette-accent flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2 text-xs text-palette-text/75 max-w-md">
            <div className="flex items-center gap-2 text-palette-primary font-semibold">
              <ShieldCheck className="w-4 h-4 text-palette-primary shrink-0" />
              <span>Surat Keterangan Lulus (SKL) Resmi Satuan Pendidikan</span>
            </div>
            <p className="text-[11px] leading-relaxed text-palette-text/70">
              Dokumen ini diterbitkan sah berdasarkan hasil Rapat Pleno Dewan Pendidik{' '}
              {settings.schoolName}. Salinan digital resmi berformat PDF dapat diunduh langsung tanpa
              perlu legalisir manual.
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-palette-primary text-white rounded-lg hover:bg-palette-text transition-colors cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>
                  {isDownloading ? 'Membuat Dokumen PDF...' : 'Unduh Salinan Resmi SKL (.PDF)'}
                </span>
              </button>
            </div>
          </div>

          {/* Principal Signature Box */}
          <div className="bg-palette-background border border-palette-accent rounded-xl p-4 sm:p-5 text-right w-full sm:w-72 shrink-0 space-y-1">
            <p className="text-xs text-palette-text/80">
              Ditetapkan di: <span className="font-semibold text-palette-text">{settings.sklLegalLocation || 'Ciamis'}</span>
            </p>
            <p className="text-xs text-palette-text/80">
              Pada tanggal: <span className="font-mono font-medium text-palette-text">{settings.plenoDate}</span>
            </p>
            <p className="text-xs font-bold text-palette-text pt-1">
              Kepala {settings.schoolName},
            </p>

            {/* Principal Signature Display */}
            <div className="h-16 flex items-center justify-end py-1">
              {settings.principalSignature ? (
                <img
                  src={settings.principalSignature}
                  alt={`Tanda Tangan ${settings.principalName}`}
                  className="max-h-14 max-w-[160px] object-contain"
                />
              ) : (
                <div className="h-12 w-32 border-b border-dashed border-palette-text/40 flex items-end justify-center pb-1">
                  <span className="text-[10px] text-palette-text/50 italic font-mono">[ Tanda Tangan ]</span>
                </div>
              )}
            </div>

            <p className="text-xs font-bold text-palette-text underline underline-offset-2">
              {settings.principalName}
            </p>
            <p className="text-[11px] font-mono tabular-nums text-palette-text/70">
              NIP. {settings.principalNip}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
