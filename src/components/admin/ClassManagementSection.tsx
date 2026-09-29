import React, { useState } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  X,
  Check,
  Users,
  CheckCircle2,
  Building2,
  HelpCircle,
  RefreshCw,
  Database,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import { ClassRoomRecord, StudentRecord } from '../../types/graduation';
import { TablePagination } from './TablePagination';

interface ClassManagementSectionProps {
  classRooms: ClassRoomRecord[];
  students: StudentRecord[];
  academicYear: string;
  onSaveClassRoom: (cls: ClassRoomRecord) => Promise<void>;
  onDeleteClassRoom: (classId: string) => Promise<void>;
  onSyncSupabaseTables?: () => Promise<{ ok: boolean; message: string }>;
}

export const ClassManagementSection: React.FC<ClassManagementSectionProps> = ({
  classRooms,
  students,
  academicYear,
  onSaveClassRoom,
  onDeleteClassRoom,
  onSyncSupabaseTables,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassRoomRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const totalPages = Math.max(1, Math.ceil(classRooms.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedClasses = classRooms.slice((safePage - 1) * pageSize, safePage * pageSize);

  const openAddModal = () => {
    setEditingClass({
      id: `cls-${Date.now()}`,
      className: `XII MIPA ${classRooms.length + 1}`,
      major: 'MIPA',
      homeroomTeacher: '',
      homeroomNip: '',
      roomNumber: `Gedung A · R.30${classRooms.length + 1}`,
      academicYear: academicYear || '2025/2026',
      updatedAt: new Date().toISOString(),
    });
    setIsModalOpen(true);
  };

  const openEditModal = (cls: ClassRoomRecord) => {
    setEditingClass({ ...cls });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass || !editingClass.className.trim() || !editingClass.homeroomTeacher.trim()) {
      return;
    }
    const targetName = editingClass.className.trim();
    setIsSaving(true);
    try {
      await onSaveClassRoom(editingClass);
      setIsModalOpen(false);
      setEditingClass(null);
      setStatusBanner({
        ok: true,
        message: `Data kelas "${targetName}" berhasil disimpan dan diperbarui langsung ke tabel public.class_rooms di Supabase.`,
      });
    } catch (err: any) {
      setStatusBanner({
        ok: false,
        message: err?.message || 'Gagal menyimpan data kelas ke Supabase.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualSyncClasses = async () => {
    if (!onSyncSupabaseTables) return;
    setIsSyncingCloud(true);
    setStatusBanner(null);
    try {
      const res = await onSyncSupabaseTables();
      setStatusBanner({
        ok: res.ok,
        message: res.ok
          ? `Tabel public.class_rooms (${classRooms.length} kelas) berhasil disinkronkan ke PostgreSQL Supabase.`
          : res.message,
      });
    } finally {
      setIsSyncingCloud(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Toolbar */}
      <div className="bg-white border border-palette-accent rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-palette-text">
              Daftar Rombongan Belajar (Kelas) & Wali Kelas
            </h2>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-mono font-semibold">
              <Database className="w-3 h-3" />
              <span>Tabel: public.class_rooms</span>
            </span>
          </div>
          <p className="text-xs text-palette-text/70 mt-0.5">
            Kelola data kelas, peminatan jurusan, dan identitas Wali Kelas untuk Tahun Ajaran{' '}
            {academicYear} (Tersinkronisasi otomatis ke Supabase)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowGuide((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-palette-primary bg-palette-accent/45 border border-palette-accent rounded-lg hover:bg-palette-accent transition-colors whitespace-nowrap cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Panduan Pengisian Kelas</span>
            {showGuide ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {onSyncSupabaseTables && (
            <button
              type="button"
              onClick={handleManualSyncClasses}
              disabled={isSyncingCloud}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-palette-text bg-palette-background border border-palette-accent rounded-lg hover:bg-palette-accent/60 transition-colors whitespace-nowrap cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-palette-primary ${isSyncingCloud ? 'animate-spin' : ''}`}
              />
              <span>{isSyncingCloud ? 'Menyinkronkan...' : 'Sinkronkan ke Supabase'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-palette-primary rounded-lg hover:bg-palette-text transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Kelas Baru</span>
          </button>
        </div>
      </div>

      {/* Contextual Guide Panel for Class Management */}
      {showGuide && (
        <div className="bg-white border border-palette-primary/40 rounded-xl p-5 space-y-4 shadow-xs">
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-palette-accent">
            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-lg bg-palette-accent/60 text-palette-primary shrink-0">
                <Info className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-palette-text">
                  Panduan Pengisian & Penjelasan Data Kelas Baru (Guide)
                </h3>
                <p className="text-xs text-palette-text/70 mt-0.5">
                  Penjelasan fungsi setiap kolom pada menu Data Kelas serta langkah-langkah
                  menyimpannya ke database Supabase.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="text-xs font-semibold text-palette-text/70 hover:text-palette-text cursor-pointer"
            >
              Tutup Panduan
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
            {/* Left column: What needs to be filled */}
            <div className="p-4 rounded-lg bg-palette-background border border-palette-accent space-y-2.5">
              <h4 className="font-bold text-palette-text flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-palette-primary text-white font-mono text-[11px] flex items-center justify-center">
                  1
                </span>
                <span>Apa Saja yang Harus Diisi pada Formulir Kelas?</span>
              </h4>
              <ul className="space-y-2 text-palette-text/85 leading-relaxed">
                <li>
                  <strong className="text-palette-text">Nama Kelas (Wajib & Unik):</strong> Isi nama
                  rombongan belajar seperti <code className="font-mono">XII MIPA 1</code>,{' '}
                  <code className="font-mono">XII IPS 2</code>, atau{' '}
                  <code className="font-mono">XII-5</code>. Nama ini menjadi kunci penghubung
                  otomatis dengan data peserta didik.
                </li>
                <li>
                  <strong className="text-palette-text">Peminatan Jurusan (Wajib):</strong> Pilih{' '}
                  <code className="font-mono">MIPA</code> (Fisika/Kimia/Biologi) atau{' '}
                  <code className="font-mono">IPS</code> (Ekonomi/Sosiologi/Geografi) untuk mengatur
                  kelompok mata pelajaran ujian siswa di kelas tersebut.
                </li>
                <li>
                  <strong className="text-palette-text">Tahun Ajaran (Wajib):</strong> Isi tahun
                  pelajaran aktif, misalnya <code className="font-mono">2025/2026</code> atau{' '}
                  <code className="font-mono">2026/2027</code>.
                </li>
                <li>
                  <strong className="text-palette-text">
                    Nama Lengkap Wali Kelas & Gelar (Wajib):
                  </strong>{' '}
                  Isi nama guru wali kelas lengkap beserta gelar akademik (contoh:{' '}
                  <em>Dra. Hj. Ratna Sari, M.Pd.</em>).
                </li>
                <li>
                  <strong className="text-palette-text">NIP & Ruang Kelas (Opsional):</strong> Isi
                  18 digit NIP Wali Kelas serta lokasi gedung/ruang belajar (contoh:{' '}
                  <em>Gedung A · R.301</em>).
                </li>
              </ul>
            </div>

            {/* Right column: Steps to save */}
            <div className="p-4 rounded-lg bg-palette-background border border-palette-accent space-y-2.5">
              <h4 className="font-bold text-palette-text flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-palette-primary text-white font-mono text-[11px] flex items-center justify-center">
                  2
                </span>
                <span>Langkah-Langkah Menyimpan & Memperbarui ke Supabase</span>
              </h4>
              <ol className="space-y-2 text-palette-text/85 leading-relaxed list-decimal list-inside">
                <li>
                  Klik tombol <strong>&ldquo;+ Tambah Kelas Baru&rdquo;</strong> di kanan atas untuk
                  membuat kelas baru, atau klik ikon <strong>Pensil (Edit)</strong> pada baris kelas
                  yang ingin diubah.
                </li>
                <li>
                  Lengkapi kolom <strong>Nama Kelas</strong>, <strong>Peminatan Jurusan</strong>,{' '}
                  <strong>Tahun Ajaran</strong>, dan <strong>Nama Wali Kelas</strong>.
                </li>
                <li>
                  Klik tombol <strong>&ldquo;Simpan Data Kelas&rdquo;</strong> di bagian kanan bawah
                  jendela formulir.
                </li>
                <li>
                  Data kelas akan langsung tersimpan dan terupdate ke tabel{' '}
                  <code className="font-mono">public.class_rooms</code> di <strong>Supabase</strong>
                  . Apabila Anda mengganti nama kelas yang sudah memiliki siswa, nama kelas pada
                  data siswa terkait juga otomatis ikut diperbarui.
                </li>
                <li>
                  Anda juga dapat menekan tombol <strong>&ldquo;Sinkronkan ke Supabase&rdquo;</strong>{' '}
                  kapan saja untuk memastikan seluruh daftar kelas lokal dan cloud identik.
                </li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Live Sync Feedback Banner */}
      {statusBanner && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            statusBanner.ok
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2
              className={`w-4 h-4 shrink-0 ${
                statusBanner.ok ? 'text-emerald-700' : 'text-amber-700'
              }`}
            />
            <span className="font-medium">{statusBanner.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-[11px] font-semibold underline cursor-pointer shrink-0"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Classes Table */}
      <div className="bg-white border border-palette-accent rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-palette-accent/45 border-b border-palette-accent text-xs font-semibold text-palette-text">
                <th className="py-3 px-4 w-14 text-center">No</th>
                <th className="py-3 px-4">Nama Kelas</th>
                <th className="py-3 px-4">Peminatan</th>
                <th className="py-3 px-4">Wali Kelas & NIP</th>
                <th className="py-3 px-4">Ruang Kelas</th>
                <th className="py-3 px-4 text-right">Jumlah Siswa</th>
                <th className="py-3 px-4 text-right">Siswa Lulus</th>
                <th className="py-3 px-4 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-palette-accent/60 text-sm">
              {paginatedClasses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-xs text-palette-text/60">
                    Belum ada data kelas terdaftar. Klik tombol &ldquo;Tambah Kelas Baru&rdquo; di
                    atas.
                  </td>
                </tr>
              ) : (
                paginatedClasses.map((cls, idx) => {
                  const rowNumber = (safePage - 1) * pageSize + idx + 1;
                  const classStudents = students.filter((s) => s.className === cls.className);
                  const passedCount = classStudents.filter((s) => s.status === 'LULUS').length;
                  const isDeleting = confirmDeleteId === cls.id;

                  return (
                    <tr key={cls.id} className="hover:bg-palette-accent/20 transition-colors">
                      <td className="py-3 px-4 text-center font-mono tabular-nums text-xs font-semibold text-palette-text/70">
                        {rowNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-palette-text">{cls.className}</div>
                        <div className="text-xs text-palette-text/65 font-mono tabular-nums">
                          TA {cls.academicYear}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-palette-accent/60 text-palette-text">
                          {cls.major}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-palette-text">{cls.homeroomTeacher}</div>
                        <div className="text-xs font-mono tabular-nums text-palette-text/65">
                          NIP. {cls.homeroomNip || '-'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-palette-text/80">
                        <span className="inline-flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-palette-primary" />
                          {cls.roomNumber || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs font-semibold text-palette-text">
                        <span className="inline-flex items-center justify-end gap-1">
                          <Users className="w-3.5 h-3.5 text-palette-primary" />
                          {classStudents.length} Siswa
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs font-semibold text-emerald-800">
                        <span className="inline-flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          {passedCount} Lulus
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isDeleting ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={async () => {
                                await onDeleteClassRoom(cls.id);
                                setConfirmDeleteId(null);
                                setStatusBanner({
                                  ok: true,
                                  message: `Data kelas "${cls.className}" telah dihapus dari aplikasi dan tabel public.class_rooms di Supabase.`,
                                });
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
                          <div className="inline-flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEditModal(cls)}
                              className="p-1.5 text-palette-text/75 hover:text-palette-primary hover:bg-palette-accent/40 rounded-md transition-colors cursor-pointer"
                              title="Edit Kelas & Wali Kelas"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(cls.id)}
                              className="p-1.5 text-palette-text/75 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                              title="Hapus Kelas"
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
          currentPage={safePage}
          totalItems={classRooms.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemLabel="rombel kelas"
        />
      </div>

      {/* Add / Edit Class Modal */}
      {isModalOpen && editingClass && (
        <div className="fixed inset-0 z-50 bg-palette-text/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-palette-accent rounded-xl w-full max-w-xl overflow-hidden shadow-lg my-6">
            <div className="px-6 py-4 border-b border-palette-accent flex items-center justify-between bg-palette-background">
              <div>
                <h3 className="font-display text-base font-bold text-palette-text">
                  Formulir Kelas & Wali Kelas
                </h3>
                <p className="text-xs text-palette-text/70">
                  Perbarui data rombongan belajar dan langsung sinkronkan ke tabel Supabase
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

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Inline Mini Guide inside Modal */}
              <div className="p-3.5 rounded-lg bg-palette-accent/35 border border-palette-accent text-xs space-y-1.5">
                <div className="font-semibold text-palette-text flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-palette-primary shrink-0" />
                  <span>Petunjuk Pengisian & Penyimpanan:</span>
                </div>
                <p className="text-palette-text/80 leading-relaxed">
                  1) Isi <strong>Nama Kelas</strong> (unik, misal: <code className="font-mono">XII MIPA 3</code>), pilih <strong>Peminatan</strong>, dan isi <strong>Nama Wali Kelas</strong>.{' '}
                  2) Klik tombol <strong>&ldquo;Simpan Data Kelas&rdquo;</strong> di bawah untuk langsung memperbarui tabel <code className="font-mono">public.class_rooms</code> di Supabase.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-palette-text mb-1">
                    Nama Kelas <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingClass.className}
                    onChange={(e) =>
                      setEditingClass({ ...editingClass, className: e.target.value })
                    }
                    placeholder="Contoh: XII MIPA 1"
                    className="w-full px-3 py-2 text-xs bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-palette-text mb-1">
                    Peminatan Jurusan <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={editingClass.major}
                    onChange={(e) =>
                      setEditingClass({
                        ...editingClass,
                        major: e.target.value as 'MIPA' | 'IPS',
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
                  >
                    <option value="MIPA">MIPA (Matematika & Ilmu Alam)</option>
                    <option value="IPS">IPS (Ilmu Pengetahuan Sosial)</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-palette-text mb-1">
                    Nama Lengkap Wali Kelas & Gelar <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingClass.homeroomTeacher}
                    onChange={(e) =>
                      setEditingClass({ ...editingClass, homeroomTeacher: e.target.value })
                    }
                    placeholder="Contoh: Dra. Hj. Ratna Sari, M.Pd."
                    className="w-full px-3 py-2 text-xs bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-palette-text mb-1">
                    NIP Wali Kelas
                  </label>
                  <input
                    type="text"
                    value={editingClass.homeroomNip}
                    onChange={(e) =>
                      setEditingClass({ ...editingClass, homeroomNip: e.target.value })
                    }
                    placeholder="19760412 200212 2 003"
                    className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-palette-text mb-1">
                    Ruang / Lokasi Kelas
                  </label>
                  <input
                    type="text"
                    value={editingClass.roomNumber}
                    onChange={(e) =>
                      setEditingClass({ ...editingClass, roomNumber: e.target.value })
                    }
                    placeholder="Gedung A · R.301"
                    className="w-full px-3 py-2 text-xs bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-palette-text mb-1">
                    Tahun Ajaran Aktif <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingClass.academicYear}
                    onChange={(e) =>
                      setEditingClass({ ...editingClass, academicYear: e.target.value })
                    }
                    placeholder="Contoh: 2025/2026"
                    className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-palette-accent flex items-center justify-end gap-2.5">
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
                  <span>{isSaving ? 'Menyimpan ke Supabase...' : 'Simpan Data Kelas'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
