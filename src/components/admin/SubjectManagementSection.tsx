import React, { useMemo, useState } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  X,
  Check,
  BookOpen,
  Search,
  RefreshCw,
  CheckCircle2,
  Info,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { StudentRecord, SubjectCatalogRecord } from '../../types/graduation';
import { TablePagination } from './TablePagination';

interface SubjectManagementSectionProps {
  subjectCatalog: SubjectCatalogRecord[];
  students: StudentRecord[];
  defaultKkm: number;
  onSaveSubject: (subj: SubjectCatalogRecord) => Promise<void>;
  onDeleteSubject: (subjectId: string) => Promise<void>;
}

export const SubjectManagementSection: React.FC<SubjectManagementSectionProps> = ({
  subjectCatalog,
  students,
  defaultKkm,
  onSaveSubject,
  onDeleteSubject,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [majorFilter, setMajorFilter] = useState<'ALL' | 'UMUM' | 'MIPA' | 'IPS'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectCatalogRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);
  const [showGuideBox, setShowGuideBox] = useState(false);

  const counts = useMemo(() => {
    const umum = subjectCatalog.filter((s) => s.majorTarget === 'UMUM').length;
    const mipa = subjectCatalog.filter((s) => s.majorTarget === 'MIPA').length;
    const ips = subjectCatalog.filter((s) => s.majorTarget === 'IPS').length;
    return {
      total: subjectCatalog.length,
      umum,
      mipa,
      ips,
      totalForMipaStudent: umum + mipa,
      totalForIpsStudent: umum + ips,
    };
  }, [subjectCatalog]);

  const filteredSubjects = useMemo(() => {
    return subjectCatalog
      .filter((item) => {
        if (majorFilter !== 'ALL' && item.majorTarget !== majorFilter) return false;
        const q = searchQuery.trim().toLowerCase();
        if (!q) return true;
        return (
          item.code.toLowerCase().includes(q) ||
          item.name.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code));
  }, [subjectCatalog, majorFilter, searchQuery]);

  const openAddModal = () => {
    const nextOrder =
      subjectCatalog.length > 0
        ? Math.max(...subjectCatalog.map((s) => s.sortOrder || 1)) + 1
        : 1;
    setEditingSubject({
      id: `sub-${Date.now()}`,
      code: `MP${String(nextOrder).padStart(2, '0')}`,
      name: '',
      category: 'Umum',
      majorTarget: 'UMUM',
      kkm: defaultKkm || 75,
      sortOrder: nextOrder,
      updatedAt: new Date().toISOString(),
    });
    setIsModalOpen(true);
  };

  const openEditModal = (subj: SubjectCatalogRecord) => {
    setEditingSubject({ ...subj });
    setIsModalOpen(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject || !editingSubject.code.trim() || !editingSubject.name.trim()) return;
    setIsSaving(true);
    try {
      await onSaveSubject(editingSubject);
      setIsModalOpen(false);
      setEditingSubject(null);
      setBannerMsg(
        `Mata pelajaran [${editingSubject.code.toUpperCase()}] "${editingSubject.name}" berhasil disimpan dan otomatis disinkronkan ke Data Siswa, Data Nilai (${students.length} siswa), serta Manajemen Guru.`
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async (subj: SubjectCatalogRecord) => {
    await onDeleteSubject(subj.id);
    setConfirmDeleteId(null);
    setBannerMsg(
      `Mata pelajaran [${subj.code}] "${subj.name}" telah dihapus dan struktur transkrip nilai siswa telah diperbarui.`
    );
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-white border border-palette-accent rounded-xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-palette-primary uppercase tracking-wider">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Katalog Kurikulum Terintegrasi</span>
            </div>
            <h2 className="font-display text-lg font-bold text-palette-text">
              Data Mata Pelajaran (Kode Mapel & Nama Mapel)
            </h2>
            <p className="text-xs text-palette-text/70">
              Kelola daftar Kode Mapel, Nama Mata Pelajaran, Kelompok, dan KKM yang terintegrasi
              otomatis ke menu Data Siswa, Data Nilai, SKL PDF, dan Manajemen User Guru.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowGuideBox((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-palette-primary bg-palette-accent/45 border border-palette-accent rounded-lg hover:bg-palette-accent transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Cara Kerja Integrasi Mapel</span>
              {showGuideBox ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-palette-primary rounded-lg hover:bg-palette-text transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Mata Pelajaran</span>
            </button>
          </div>
        </div>

        {showGuideBox && (
          <div className="p-4 rounded-xl bg-palette-background border border-palette-accent text-xs space-y-2 leading-relaxed">
            <div className="font-bold text-palette-text flex items-center gap-2">
              <Info className="w-4 h-4 text-palette-primary shrink-0" />
              <span>Integrasi Otomatis Data Mata Pelajaran ke Seluruh Menu:</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="p-3 bg-white rounded-lg border border-palette-accent">
                <p className="font-semibold text-palette-text">1. Menu Data Siswa & Formulir</p>
                <p className="text-palette-text/75 mt-1">
                  Saat menambah/mengedit siswa dan memilih jurusan (MIPA/IPS), daftar mata pelajaran
                  pada formulir otomatis mengikuti katalog ini.
                </p>
              </div>
              <div className="p-3 bg-white rounded-lg border border-palette-accent">
                <p className="font-semibold text-palette-text">2. Menu Data Nilai & SKL PDF</p>
                <p className="text-palette-text/75 mt-1">
                  Perubahan Kode Mapel, Nama Mapel, atau KKM langsung memperbarui transkrip nilai{' '}
                  {students.length} siswa serta cetakan Surat Keterangan Lulus (SKL).
                </p>
              </div>
              <div className="p-3 bg-white rounded-lg border border-palette-accent">
                <p className="font-semibold text-palette-text">3. Menu Manajemen User (Guru)</p>
                <p className="text-palette-text/75 mt-1">
                  Saat menambahkan akun Guru di Manajemen User, pilihan mata pelajaran pengampu
                  otomatis mengambil daftar dari menu Mata Pelajaran ini.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Summary Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-palette-accent">
          <div className="p-3 rounded-lg bg-palette-background border border-palette-accent">
            <p className="text-[11px] text-palette-text/70">Total Katalog Mapel</p>
            <p className="font-display text-xl font-bold font-mono tabular-nums text-palette-text mt-0.5">
              {counts.total} Mapel
            </p>
          </div>
          <div className="p-3 rounded-lg bg-palette-background border border-palette-accent">
            <p className="text-[11px] text-palette-text/70">Mapel Wajib Umum (A & B)</p>
            <p className="font-display text-xl font-bold font-mono tabular-nums text-palette-primary mt-0.5">
              {counts.umum} Mapel
            </p>
          </div>
          <div className="p-3 rounded-lg bg-palette-background border border-palette-accent">
            <p className="text-[11px] text-palette-text/70">Struktur Transkrip MIPA</p>
            <p className="font-display text-xl font-bold font-mono tabular-nums text-emerald-800 mt-0.5">
              {counts.totalForMipaStudent} Mapel ({counts.mipa} Peminatan)
            </p>
          </div>
          <div className="p-3 rounded-lg bg-palette-background border border-palette-accent">
            <p className="text-[11px] text-palette-text/70">Struktur Transkrip IPS</p>
            <p className="font-display text-xl font-bold font-mono tabular-nums text-amber-800 mt-0.5">
              {counts.totalForIpsStudent} Mapel ({counts.ips} Peminatan)
            </p>
          </div>
        </div>
      </div>

      {bannerMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{bannerMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerMsg(null)}
            className="text-[11px] font-semibold underline cursor-pointer shrink-0"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white border border-palette-accent rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-palette-text/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Cari kode mapel (PAI, MTK, FIS) atau nama mata pelajaran..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'ALL', label: `Semua (${counts.total})` },
              { id: 'UMUM', label: `Wajib Umum (${counts.umum})` },
              { id: 'MIPA', label: `Peminatan MIPA (${counts.mipa})` },
              { id: 'IPS', label: `Peminatan IPS (${counts.ips})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setMajorFilter(tab.id);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                majorFilter === tab.id
                  ? 'bg-palette-primary text-white'
                  : 'bg-palette-background text-palette-text hover:bg-palette-accent/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Subject Catalog Table */}
      <div className="bg-white border border-palette-accent rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-palette-background border-b border-palette-accent text-[11px] font-semibold text-palette-text/75 uppercase tracking-wider">
                <th className="py-3 px-4 w-16">Urutan</th>
                <th className="py-3 px-4">Kode Mapel</th>
                <th className="py-3 px-4">Nama Mata Pelajaran</th>
                <th className="py-3 px-4">Kelompok Kurikulum</th>
                <th className="py-3 px-4">Peruntukan Jurusan</th>
                <th className="py-3 px-4 text-center">Batas KKM</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-palette-accent text-xs">
              {filteredSubjects.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-palette-text/60">
                    Tidak ada mata pelajaran yang sesuai dengan pencarian.
                  </td>
                </tr>
              ) : (
                filteredSubjects
                  .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                  .map((subj) => (
                    <tr
                      key={subj.id}
                      className="hover:bg-palette-background/60 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono tabular-nums text-palette-text/75">
                        #{subj.sortOrder}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-xs px-2.5 py-1 rounded bg-palette-accent/60 text-palette-text border border-palette-accent">
                          {subj.code}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-palette-text">{subj.name}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-medium ${
                            subj.category === 'Umum'
                              ? 'bg-palette-accent/50 text-palette-text'
                              : 'bg-sky-50 text-sky-900 border border-sky-200'
                          }`}
                        >
                          Kelompok {subj.category}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded font-mono text-[11px] font-semibold ${
                            subj.majorTarget === 'UMUM'
                              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                              : subj.majorTarget === 'MIPA'
                                ? 'bg-indigo-50 text-indigo-900 border border-indigo-200'
                                : 'bg-amber-50 text-amber-900 border border-amber-200'
                          }`}
                        >
                          {subj.majorTarget === 'UMUM'
                            ? 'SEMUA JURUSAN (MIPA & IPS)'
                            : `KHUSUS ${subj.majorTarget}`}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono tabular-nums font-semibold text-palette-text">
                        {subj.kkm.toFixed(1)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(subj)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-palette-text bg-palette-background border border-palette-accent rounded-md hover:bg-palette-accent/60 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          {confirmDeleteId === subj.id ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleConfirmDelete(subj)}
                                className="px-2 py-1.5 text-[11px] font-semibold bg-rose-700 text-white rounded-md cursor-pointer"
                              >
                                Hapus
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1.5 text-[11px] bg-palette-accent/60 text-palette-text rounded-md cursor-pointer"
                              >
                                Batal
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(subj.id)}
                              className="p-1.5 text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                              title="Hapus Mata Pelajaran"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          currentPage={currentPage}
          totalItems={filteredSubjects.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemLabel="mata pelajaran"
        />
      </div>

      {/* Modal Tambah / Edit Mata Pelajaran */}
      {isModalOpen && editingSubject && (
        <div className="fixed inset-0 z-50 bg-palette-text/50 flex items-center justify-center p-4">
          <div className="bg-white border border-palette-accent rounded-xl w-full max-w-lg overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-palette-accent bg-palette-background flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-bold text-palette-text">
                  Formulir Data Mata Pelajaran
                </h3>
                <p className="text-xs text-palette-text/70">
                  Otomatis terintegrasi dengan Data Siswa, Data Nilai, dan SKL
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-palette-text/70 hover:text-palette-text rounded-lg hover:bg-palette-accent/50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-palette-text mb-1">
                    Kode Mapel (Unik)
                  </label>
                  <input
                    type="text"
                    required
                    value={editingSubject.code}
                    onChange={(e) =>
                      setEditingSubject({
                        ...editingSubject,
                        code: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="Contoh: PAI / FIS"
                    className="w-full px-3 py-2 text-xs font-mono uppercase bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-palette-text mb-1">
                    Nama Lengkap Mata Pelajaran
                  </label>
                  <input
                    type="text"
                    required
                    value={editingSubject.name}
                    onChange={(e) =>
                      setEditingSubject({
                        ...editingSubject,
                        name: e.target.value,
                      })
                    }
                    placeholder="Contoh: Pendidikan Agama dan Budi Pekerti"
                    className="w-full px-3 py-2 text-xs bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-palette-text mb-1">
                    Kelompok Mata Pelajaran
                  </label>
                  <select
                    value={editingSubject.category}
                    onChange={(e) =>
                      setEditingSubject({
                        ...editingSubject,
                        category: e.target.value as 'Umum' | 'Peminatan',
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
                  >
                    <option value="Umum">Kelompok Umum (Wajib)</option>
                    <option value="Peminatan">Kelompok Peminatan Akademik</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-palette-text mb-1">
                    Peruntukan Jurusan Siswa
                  </label>
                  <select
                    value={editingSubject.majorTarget}
                    onChange={(e) => {
                      const nextTarget = e.target.value as 'UMUM' | 'MIPA' | 'IPS';
                      setEditingSubject({
                        ...editingSubject,
                        majorTarget: nextTarget,
                        category: nextTarget === 'UMUM' ? 'Umum' : 'Peminatan',
                      });
                    }}
                    className="w-full px-3 py-2 text-xs bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
                  >
                    <option value="UMUM">Semua Jurusan (MIPA & IPS)</option>
                    <option value="MIPA">Khusus Peminatan MIPA</option>
                    <option value="IPS">Khusus Peminatan IPS</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-palette-text mb-1">
                    Batas KKM Mata Pelajaran
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.5"
                    required
                    value={editingSubject.kkm}
                    onChange={(e) =>
                      setEditingSubject({
                        ...editingSubject,
                        kkm: Number(e.target.value) || 75,
                      })
                    }
                    className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-palette-text mb-1">
                    Urutan Tampil di Transkrip SKL
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    required
                    value={editingSubject.sortOrder}
                    onChange={(e) =>
                      setEditingSubject({
                        ...editingSubject,
                        sortOrder: Number(e.target.value) || 1,
                      })
                    }
                    className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-palette-accent flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-palette-text bg-palette-background border border-palette-accent rounded-lg hover:bg-palette-accent/50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-palette-primary rounded-lg hover:bg-palette-text cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan & Sinkronkan Mapel'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
