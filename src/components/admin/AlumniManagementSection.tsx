import React, { useMemo, useState } from 'react';
import {
  Search,
  GraduationCap,
  ArrowRightLeft,
  Download,
  FileText,
  Edit3,
  Trash2,
  RotateCcw,
  Check,
  X,
  CheckCircle2,
} from 'lucide-react';
import {
  AlumniContinuation,
  AlumniRecord,
  AnnouncementSettings,
  StudentRecord,
} from '../../types/graduation';
import { generateGraduationCertificatePDF } from '../../utils/pdfGenerator';
import { TablePagination } from './TablePagination';

interface AlumniManagementSectionProps {
  alumni: AlumniRecord[];
  students: StudentRecord[];
  settings: AnnouncementSettings;
  onTransferStudentsToAlumni: (studentsToMove: StudentRecord[]) => Promise<void>;
  onSaveAlumni: (alumniItem: AlumniRecord) => Promise<void>;
  onRestoreAlumniToStudent: (alumniItem: AlumniRecord) => Promise<void>;
  onDeleteAlumni: (alumniId: string) => Promise<void>;
}

export const AlumniManagementSection: React.FC<AlumniManagementSectionProps> = ({
  alumni,
  students,
  settings,
  onTransferStudentsToAlumni,
  onSaveAlumni,
  onRestoreAlumniToStudent,
  onDeleteAlumni,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('ALL');
  const [filterContinuation, setFilterContinuation] = useState<'ALL' | AlumniContinuation>('ALL');
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferBanner, setTransferBanner] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const [editingAlumni, setEditingAlumni] = useState<AlumniRecord | null>(null);
  const [isSavingAlumni, setIsSavingAlumni] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Active students who already have status === 'LULUS' and can be moved to Alumni
  const graduatedActiveStudents = useMemo(
    () => students.filter((s) => s.status === 'LULUS'),
    [students]
  );

  // Unique graduation years for dropdown filter
  const graduationYearOptions = useMemo(() => {
    const years = new Set<string>(['2025/2026', '2024/2025', '2023/2024']);
    if (settings.academicYear) years.add(settings.academicYear);
    alumni.forEach((a) => {
      if (a.graduationYear) years.add(a.graduationYear);
    });
    return Array.from(years).sort().reverse();
  }, [alumni, settings.academicYear]);

  const filteredAlumni = useMemo(() => {
    return alumni.filter((a) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesQ =
        !q ||
        a.fullName.toLowerCase().includes(q) ||
        a.nisn.toLowerCase().includes(q) ||
        a.className.toLowerCase().includes(q) ||
        a.institutionName.toLowerCase().includes(q) ||
        a.graduationYear.toLowerCase().includes(q);
      if (!matchesQ) return false;
      if (selectedYearFilter !== 'ALL' && a.graduationYear !== selectedYearFilter) {
        return false;
      }
      if (filterContinuation !== 'ALL' && a.continuationStatus !== filterContinuation) {
        return false;
      }
      return true;
    });
  }, [alumni, searchQuery, selectedYearFilter, filterContinuation]);

  const handleBulkTransferGraduated = async () => {
    if (graduatedActiveStudents.length === 0) return;
    setIsTransferring(true);
    const count = graduatedActiveStudents.length;
    await onTransferStudentsToAlumni(graduatedActiveStudents);
    setIsTransferring(false);
    setTransferBanner(
      `${count} siswa berstatus LULUS berhasil dipindahkan ke Basis Data Alumni (${settings.academicYear}).`
    );
  };

  const handleDownloadAlumniPDF = (item: AlumniRecord) => {
    const asStudent: StudentRecord = {
      id: item.id,
      nisn: item.nisn,
      examNumber: item.examNumber,
      fullName: item.fullName,
      birthPlace: item.birthPlace,
      birthDate: item.birthDate,
      className: item.className,
      major: item.major,
      averageScore: item.averageScore,
      status: 'LULUS',
      predicate: item.predicate,
      sklNumber: item.sklNumber,
      subjects: item.subjects,
      notes: item.notes,
      checkedAt: item.transferredAt,
      checkCount: 1,
      updatedAt: item.updatedAt,
    };
    generateGraduationCertificatePDF(asStudent, settings);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAlumni) return;
    setIsSavingAlumni(true);
    await onSaveAlumni(editingAlumni);
    setIsSavingAlumni(false);
    setEditingAlumni(null);
  };

  return (
    <div className="space-y-6">
      {/* 1. Transfer Graduated Students Banner */}
      <div className="bg-white border border-palette-accent rounded-xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-palette-primary" />
              <h2 className="text-sm font-semibold text-palette-text">
                Migrasi Siswa Lulus ke Basis Data Alumni
              </h2>
            </div>
            <p className="text-xs text-palette-text/70">
              Terdapat{' '}
              <strong className="font-mono tabular-nums text-palette-text">
                {graduatedActiveStudents.length} siswa aktif
              </strong>{' '}
              yang dinyatakan <strong>LULUS</strong> pada Tahun Ajaran {settings.academicYear} dan
              siap dipindahkan ke arsip Data Alumni.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={graduatedActiveStudents.length === 0 || isTransferring}
              onClick={handleBulkTransferGraduated}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-palette-primary rounded-lg hover:bg-palette-text disabled:opacity-50 transition-colors cursor-pointer"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>
                {isTransferring
                  ? 'Memindahkan Data...'
                  : `Pindahkan Semua Siswa Lulus (${graduatedActiveStudents.length}) ke Alumni`}
              </span>
            </button>
          </div>
        </div>

        {transferBanner && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{transferBanner}</span>
          </div>
        )}
      </div>

      {/* 2. Search, Graduation Year Dropdown & Continuation Status Filter */}
      <div className="bg-white border border-palette-accent rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-palette-text/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama alumni, NISN, atau kampus/instansi..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
            />
          </div>

          <select
            aria-label="Filter Tahun Kelulusan Alumni"
            value={selectedYearFilter}
            onChange={(e) => setSelectedYearFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
          >
            <option value="ALL">Semua Tahun Kelulusan ({alumni.length})</option>
            {graduationYearOptions.map((yr) => {
              const count = alumni.filter((a) => a.graduationYear === yr).length;
              return (
                <option key={yr} value={yr}>
                  Tahun Kelulusan {yr} ({count} Alumni)
                </option>
              );
            })}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'ALL', label: 'Semua Jalur' },
              { id: 'PTN / PTS', label: 'PTN / PTS' },
              { id: 'Kedinasan / TNI-Polri', label: 'Kedinasan / TNI-Polri' },
              { id: 'Bekerja / Wirausaha', label: 'Bekerja / Wirausaha' },
              { id: 'Belum Terdata', label: 'Belum Terdata' },
            ] as { id: 'ALL' | AlumniContinuation; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterContinuation(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                filterContinuation === tab.id
                  ? 'bg-palette-primary text-white'
                  : 'bg-palette-background text-palette-text/80 hover:bg-palette-accent/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Alumni Ledger Table */}
      <div className="bg-white border border-palette-accent rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-palette-accent/45 border-b border-palette-accent text-xs font-semibold text-palette-text">
                <th className="py-3 px-4 w-14 text-center">No</th>
                <th className="py-3 px-4">Identitas Alumni</th>
                <th className="py-3 px-4">NISN & No. SKL</th>
                <th className="py-3 px-4">Kelas & Angkatan</th>
                <th className="py-3 px-4 text-right">Nilai Akhir</th>
                <th className="py-3 px-4">Jalur Lanjutan & Instansi</th>
                <th className="py-3 px-4 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-palette-accent/60 text-sm">
              {filteredAlumni.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-xs text-palette-text/60">
                    Tidak ada data alumni yang cocok dengan filter tahun kelulusan atau pencarian
                    Anda.
                  </td>
                </tr>
              ) : (
                filteredAlumni
                  .slice(
                    (Math.min(currentPage, Math.max(1, Math.ceil(filteredAlumni.length / pageSize))) -
                      1) *
                      pageSize,
                    Math.min(currentPage, Math.max(1, Math.ceil(filteredAlumni.length / pageSize))) *
                      pageSize
                  )
                  .map((item, idx) => {
                    const safePage = Math.min(
                      currentPage,
                      Math.max(1, Math.ceil(filteredAlumni.length / pageSize))
                    );
                    const rowNumber = (safePage - 1) * pageSize + idx + 1;
                    const isDeleting = confirmDeleteId === item.id;
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-palette-accent/20 transition-colors"
                      >
                        <td className="py-3 px-4 text-center font-mono tabular-nums text-xs font-semibold text-palette-text/70">
                          {rowNumber}
                        </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-palette-text">{item.fullName}</div>
                        <div className="text-xs text-palette-text/65 mt-0.5">
                          {item.predicate} · {item.contactPhone || 'Kontak belum diisi'}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums">
                        <div className="text-xs font-semibold text-palette-text">{item.nisn}</div>
                        <div className="text-[11px] text-palette-text/65">{item.sklNumber}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-xs font-medium text-palette-text">
                          {item.className} ({item.major})
                        </div>
                        <div className="text-[11px] font-mono tabular-nums text-palette-primary font-semibold">
                          Lulusan TA {item.graduationYear}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-palette-text">
                        {item.averageScore.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-xs font-semibold text-palette-primary">
                          {item.continuationStatus}
                        </div>
                        <div className="text-xs text-palette-text/75">
                          {item.institutionName || 'Instansi/Kampus belum diisi'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isDeleting ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={async () => {
                                await onDeleteAlumni(item.id);
                                setConfirmDeleteId(null);
                              }}
                              className="px-2 py-1 text-xs font-semibold bg-rose-700 text-white rounded hover:bg-rose-800 cursor-pointer"
                            >
                              Hapus
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
                          <div className="inline-flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingAlumni({ ...item })}
                              className="p-1.5 text-palette-text/75 hover:text-palette-primary hover:bg-palette-accent/40 rounded-md transition-colors cursor-pointer"
                              title="Edit Jejak Alumni"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadAlumniPDF(item)}
                              className="p-1.5 text-palette-text/75 hover:text-palette-primary hover:bg-palette-accent/40 rounded-md transition-colors cursor-pointer"
                              title="Unduh SKL PDF"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onRestoreAlumniToStudent(item)}
                              className="p-1.5 text-palette-text/75 hover:text-amber-700 hover:bg-amber-50 rounded-md transition-colors cursor-pointer"
                              title="Kembalikan ke Data Siswa Aktif"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(item.id)}
                              className="p-1.5 text-palette-text/75 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                              title="Hapus Data Alumni"
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
            currentPage,
            Math.max(1, Math.ceil(filteredAlumni.length / pageSize))
          )}
          totalItems={filteredAlumni.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemLabel="alumni"
        />
      </div>

      {/* Edit Alumni Modal */}
      {editingAlumni && (
        <div className="fixed inset-0 z-50 bg-palette-text/50 flex items-center justify-center p-4">
          <div className="bg-white border border-palette-accent rounded-xl w-full max-w-lg overflow-hidden shadow-lg">
            <div className="px-6 py-4 border-b border-palette-accent flex items-center justify-between bg-palette-background">
              <div>
                <h3 className="font-display text-base font-bold text-palette-text">
                  Pembaruan Data & Tracer Study Alumni
                </h3>
                <p className="text-xs text-palette-text/70">
                  {editingAlumni.fullName} · NISN {editingAlumni.nisn}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingAlumni(null)}
                className="p-1.5 text-palette-text/70 hover:text-palette-text rounded-lg hover:bg-palette-accent/50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-palette-text mb-1">
                    Tahun Lulus / Angkatan
                  </label>
                  <input
                    type="text"
                    value={editingAlumni.graduationYear}
                    onChange={(e) =>
                      setEditingAlumni({ ...editingAlumni, graduationYear: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-palette-text mb-1">
                    Status Kelanjutan Studi / Karier
                  </label>
                  <select
                    value={editingAlumni.continuationStatus}
                    onChange={(e) =>
                      setEditingAlumni({
                        ...editingAlumni,
                        continuationStatus: e.target.value as AlumniContinuation,
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
                  >
                    <option value="PTN / PTS">PTN / PTS (Perguruan Tinggi)</option>
                    <option value="Kedinasan / TNI-Polri">Kedinasan / TNI-Polri</option>
                    <option value="Bekerja / Wirausaha">Bekerja / Wirausaha</option>
                    <option value="Belum Terdata">Belum Terdata</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-palette-text mb-1">
                    Nama Perguruan Tinggi / Instansi / Tempat Kerja
                  </label>
                  <input
                    type="text"
                    value={editingAlumni.institutionName}
                    onChange={(e) =>
                      setEditingAlumni({ ...editingAlumni, institutionName: e.target.value })
                    }
                    placeholder="Contoh: Universitas Indonesia (UI) — Fakultas Teknik"
                    className="w-full px-3 py-2 text-xs bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-palette-text mb-1">
                    Nomor Telepon / WhatsApp Aktif
                  </label>
                  <input
                    type="text"
                    value={editingAlumni.contactPhone}
                    onChange={(e) =>
                      setEditingAlumni({ ...editingAlumni, contactPhone: e.target.value })
                    }
                    placeholder="Contoh: 0812-8849-2019"
                    className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-palette-accent flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingAlumni(null)}
                  className="px-4 py-2 text-xs font-medium text-palette-text bg-palette-background border border-palette-accent rounded-lg hover:bg-palette-accent/50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingAlumni}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-palette-primary rounded-lg hover:bg-palette-text cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSavingAlumni ? 'Menyimpan...' : 'Simpan Data Alumni'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
