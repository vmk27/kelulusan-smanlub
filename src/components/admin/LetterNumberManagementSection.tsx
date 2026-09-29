import React, { useMemo, useState } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  X,
  Check,
  FileText,
  CheckCircle2,
  Sparkles,
  Info,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { LetterNumberRecord, StudentRecord } from '../../types/graduation';
import { formatLetterNumberFromTemplate } from '../../lib/supabase';

interface LetterNumberManagementSectionProps {
  letterNumbers: LetterNumberRecord[];
  students: StudentRecord[];
  onSaveLetterNumber: (item: LetterNumberRecord) => Promise<void>;
  onDeleteLetterNumber: (id: string) => Promise<void>;
  onBulkUpdateStudents: (
    records: StudentRecord[]
  ) => Promise<{ addedCount: number; updatedCount: number }>;
}

export const LetterNumberManagementSection: React.FC<LetterNumberManagementSectionProps> = ({
  letterNumbers,
  students,
  onSaveLetterNumber,
  onDeleteLetterNumber,
  onBulkUpdateStudents,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LetterNumberRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);
  const [showGuideBox, setShowGuideBox] = useState(false);

  const defaultTemplate = useMemo(
    () => letterNumbers.find((item) => item.isDefault) || letterNumbers[0] || null,
    [letterNumbers]
  );

  const openAddModal = () => {
    setEditingItem({
      id: `ltr-${Date.now()}`,
      code: `SKL-BARU-${letterNumbers.length + 1}`,
      title: 'Format Nomor Surat Keterangan Lulus (SKL)',
      classificationCode: '421.3',
      numberPattern: '421.3/{NO_URUT}/SKL-SMAN1LBG/V/2026',
      majorTarget: 'SEMUA',
      academicYear: '2025/2026',
      issueDate: '2026-05-05',
      startSequence: 1,
      digitPadding: 3,
      isDefault: letterNumbers.length === 0,
      notes: 'Digunakan otomatis saat menambah peserta didik baru',
      updatedAt: new Date().toISOString(),
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: LetterNumberRecord) => {
    setEditingItem({ ...item });
    setIsModalOpen(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.code.trim() || !editingItem.numberPattern.trim()) return;
    setIsSaving(true);
    try {
      await onSaveLetterNumber(editingItem);
      setIsModalOpen(false);
      setEditingItem(null);
      setBannerMsg(
        `Format Nomor Surat [${editingItem.code}] berhasil disimpan dan siap digunakan pada Formulir Tambah/Edit Data Peserta Didik.`
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetAsDefault = async (item: LetterNumberRecord) => {
    await onSaveLetterNumber({ ...item, isDefault: true });
    setBannerMsg(
      `Format Nomor Surat [${item.code}] telah ditetapkan sebagai Default utama saat menambah peserta didik baru.`
    );
  };

  const handleApplyTemplateToStudents = async (template: LetterNumberRecord) => {
    setApplyingId(template.id);
    try {
      const targetStudents = students.filter(
        (s) => template.majorTarget === 'SEMUA' || s.major === template.majorTarget
      );
      if (targetStudents.length === 0) {
        setBannerMsg('Tidak ada data siswa yang sesuai dengan peruntukan jurusan format surat ini.');
        return;
      }

      const updatedRecords: StudentRecord[] = targetStudents.map((std, idx) => ({
        ...std,
        sklNumber: formatLetterNumberFromTemplate(template, idx),
        updatedAt: new Date().toISOString(),
      }));

      await onBulkUpdateStudents(updatedRecords);
      setBannerMsg(
        `Berhasil menerapkan format Nomor Surat [${template.code}] secara otomatis ke ${updatedRecords.length} peserta didik (${
          template.majorTarget === 'SEMUA' ? 'Semua Jurusan' : `Jurusan ${template.majorTarget}`
        }).`
      );
    } finally {
      setApplyingId(null);
    }
  };

  const handleConfirmDelete = async (item: LetterNumberRecord) => {
    await onDeleteLetterNumber(item.id);
    setConfirmDeleteId(null);
    setBannerMsg(`Format Nomor Surat [${item.code}] telah dihapus.`);
  };

  return (
    <div className="space-y-5">
      {/* Top Header Card */}
      <div className="bg-white border border-palette-accent rounded-xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-palette-primary uppercase tracking-wider">
              <FileText className="w-3.5 h-3.5" />
              <span>Registrasi Tata Naskah Dinas & SKL</span>
            </div>
            <h2 className="font-display text-lg font-bold text-palette-text">
              Data Nomor Surat (Terintegrasi ke Formulir Peserta Didik)
            </h2>
            <p className="text-xs text-palette-text/70">
              Atur pola penomoran Surat Keterangan Lulus (SKL) menggunakan variabel{' '}
              <code className="font-mono font-semibold text-palette-text">{'{NO_URUT}'}</code> agar
              nomor surat terisi otomatis saat menambah atau mengedit peserta didik.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowGuideBox((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-palette-primary bg-palette-accent/45 border border-palette-accent rounded-lg hover:bg-palette-accent transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Panduan Format Nomor Surat</span>
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
              <span>Tambah Format Nomor Surat</span>
            </button>
          </div>
        </div>

        {showGuideBox && (
          <div className="p-4 rounded-xl bg-palette-background border border-palette-accent text-xs space-y-2 leading-relaxed">
            <div className="font-bold text-palette-text flex items-center gap-2">
              <Info className="w-4 h-4 text-palette-primary shrink-0" />
              <span>Cara Kerja Integrasi Nomor Surat dengan Formulir Peserta Didik:</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="p-3 bg-white rounded-lg border border-palette-accent">
                <p className="font-semibold text-palette-text">1. Variabel Otomatis {'{NO_URUT}'}</p>
                <p className="text-palette-text/75 mt-1">
                  Gunakan <code className="font-mono">{'{NO_URUT}'}</code> pada pola nomor surat
                  (contoh: <code className="font-mono">421.3/{'{NO_URUT}'}/SKL-SMAN1LBG/V/2026</code>
                  ). Sistem otomatis menggantinya dengan nomor urut siswa (<code className="font-mono">001</code>,{' '}
                  <code className="font-mono">002</code>, dst.).
                </p>
              </div>
              <div className="p-3 bg-white rounded-lg border border-palette-accent">
                <p className="font-semibold text-palette-text">
                  2. Otomatis Saat Tambah Data Siswa
                </p>
                <p className="text-palette-text/75 mt-1">
                  Ketika klik tombol <strong>Tambah Data Siswa</strong>, kolom Nomor SKL otomatis
                  diisi menggunakan Format Nomor Surat yang berstatus <strong>Default</strong> atau
                  sesuai jurusan siswa.
                </p>
              </div>
              <div className="p-3 bg-white rounded-lg border border-palette-accent">
                <p className="font-semibold text-palette-text">
                  3. Pilihan Cepat & Terapkan Massal
                </p>
                <p className="text-palette-text/75 mt-1">
                  Di dalam formulir siswa tersedia dropdown untuk memilih format dari daftar ini,
                  atau klik tombol <strong>Terapkan ke Siswa</strong> di bawah untuk memperbarui
                  nomor surat seluruh siswa sekaligus.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Active Default Preview Bar */}
        {defaultTemplate && (
          <div className="p-3.5 rounded-xl bg-palette-background border border-palette-accent flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-[11px] font-semibold text-palette-primary uppercase tracking-wider">
                Format Nomor Surat Aktif (Default Tambah Siswa Baru)
              </p>
              <p className="text-xs font-semibold text-palette-text">
                {defaultTemplate.title} ({defaultTemplate.code})
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-palette-text/70">Pratinjau Siswa Berikutnya:</span>
              <code className="px-3 py-1.5 rounded-lg bg-white border border-palette-accent font-mono text-xs font-bold text-palette-text">
                {formatLetterNumberFromTemplate(defaultTemplate, students.length)}
              </code>
            </div>
          </div>
        )}
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

      {/* Cards Grid for Letter Number Formats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {letterNumbers.map((item) => {
          const sampleFirst = formatLetterNumberFromTemplate(item, 0);
          const sampleNext = formatLetterNumberFromTemplate(item, students.length);
          const matchingStudentCount = students.filter(
            (s) => item.majorTarget === 'SEMUA' || s.major === item.majorTarget
          ).length;

          return (
            <div
              key={item.id}
              className={`bg-white rounded-xl border p-5 flex flex-col justify-between space-y-4 transition-all ${
                item.isDefault
                  ? 'border-palette-primary ring-1 ring-palette-primary/25'
                  : 'border-palette-accent'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-palette-accent/60 text-palette-text">
                        {item.code}
                      </span>
                      {item.isDefault && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-900">
                          Default Utama
                        </span>
                      )}
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-palette-background border border-palette-accent text-palette-text/80">
                        {item.majorTarget === 'SEMUA'
                          ? 'Semua Jurusan'
                          : `Jurusan ${item.majorTarget}`}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-palette-text mt-2">{item.title}</h3>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-palette-background border border-palette-accent space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[11px] text-palette-text/70">
                    <span>Pola Penomoran:</span>
                    <span className="font-mono">Klasifikasi {item.classificationCode}</span>
                  </div>
                  <p className="font-mono text-xs font-semibold text-palette-text break-all">
                    {item.numberPattern}
                  </p>
                  <div className="pt-1.5 border-t border-palette-accent/70 flex items-center justify-between text-[11px]">
                    <span className="text-palette-text/70">Contoh Urut #1:</span>
                    <code className="font-mono font-bold text-emerald-900">{sampleFirst}</code>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-palette-text/70">
                      Contoh Siswa Baru (#{students.length + 1}):
                    </span>
                    <code className="font-mono font-bold text-palette-primary">{sampleNext}</code>
                  </div>
                </div>

                {item.notes && (
                  <p className="text-[11px] text-palette-text/70 leading-relaxed">{item.notes}</p>
                )}
              </div>

              <div className="pt-3 border-t border-palette-accent space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={applyingId === item.id}
                    onClick={() => handleApplyTemplateToStudents(item)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-palette-primary rounded-lg hover:bg-palette-text transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      {applyingId === item.id
                        ? 'Menerapkan...'
                        : `Terapkan ke ${matchingStudentCount} Siswa`}
                    </span>
                  </button>
                  {!item.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleSetAsDefault(item)}
                      className="px-2.5 py-2 text-xs font-medium text-palette-text bg-palette-background border border-palette-accent rounded-lg hover:bg-palette-accent/60 cursor-pointer"
                      title="Jadikan Format Default saat Tambah Siswa"
                    >
                      Set Default
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-palette-text/65 font-mono">
                    TA {item.academicYear} · Mulai #{item.startSequence}
                  </span>
                  <div className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-palette-text bg-palette-background border border-palette-accent rounded-md hover:bg-palette-accent/60 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    {confirmDeleteId === item.id ? (
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleConfirmDelete(item)}
                          className="px-2 py-1 text-[11px] font-semibold bg-rose-700 text-white rounded-md cursor-pointer"
                        >
                          Hapus
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 text-[11px] bg-palette-accent/60 text-palette-text rounded-md cursor-pointer"
                        >
                          Batal
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(item.id)}
                        className="p-1.5 text-rose-700 hover:bg-rose-50 rounded-md cursor-pointer"
                        title="Hapus Format Nomor Surat"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Tambah / Edit Format Nomor Surat */}
      {isModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 bg-palette-text/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-palette-accent rounded-xl w-full max-w-xl overflow-hidden shadow-xl my-6">
            <div className="px-6 py-4 border-b border-palette-accent bg-palette-background flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-bold text-palette-text">
                  Formulir Data Nomor Surat (SKL)
                </h3>
                <p className="text-xs text-palette-text/70">
                  Terintegrasi otomatis ke Formulir Tambah & Edit Peserta Didik
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
                    Kode Seri Surat
                  </label>
                  <input
                    type="text"
                    required
                    value={editingItem.code}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        code: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="SKL-UMUM-2026"
                    className="w-full px-3 py-2 text-xs font-mono uppercase bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-palette-text mb-1">
                    Nama / Perihal Format Nomor Surat
                  </label>
                  <input
                    type="text"
                    required
                    value={editingItem.title}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        title: e.target.value,
                      })
                    }
                    placeholder="Contoh: Format Standar SKL SMAN 1 Lumbung"
                    className="w-full px-3 py-2 text-xs bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-palette-text">
                    Pola Format Nomor Surat (Gunakan variabel {'{NO_URUT}'})
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (!editingItem.numberPattern.includes('{NO_URUT}')) {
                        setEditingItem({
                          ...editingItem,
                          numberPattern: `${editingItem.classificationCode || '421.3'}/{NO_URUT}/SKL-SMAN1LBG/V/2026`,
                        });
                      }
                    }}
                    className="text-[11px] font-semibold text-palette-primary hover:underline cursor-pointer"
                  >
                    + Sisipkan {'{NO_URUT}'}
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={editingItem.numberPattern}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      numberPattern: e.target.value,
                    })
                  }
                  placeholder="421.3/{NO_URUT}/SKL-SMAN1LBG/V/2026"
                  className="w-full px-3 py-2 text-xs font-mono bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
                />
                <p className="text-[11px] text-palette-text/70 mt-1">
                  Pratinjau Hasil Nomor Surat:{' '}
                  <strong className="font-mono text-palette-text">
                    {formatLetterNumberFromTemplate(editingItem, 0)}
                  </strong>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-palette-text mb-1">
                    Kode Klasifikasi
                  </label>
                  <input
                    type="text"
                    value={editingItem.classificationCode}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        classificationCode: e.target.value,
                      })
                    }
                    placeholder="421.3"
                    className="w-full px-3 py-2 text-xs font-mono bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-palette-text mb-1">
                    Peruntukan Jurusan
                  </label>
                  <select
                    value={editingItem.majorTarget}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        majorTarget: e.target.value as 'SEMUA' | 'MIPA' | 'IPS' | 'BHS' | 'UMM',
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
                  >
                    <option value="SEMUA">Semua Jurusan / Umum (MIPA, IPS, BHS)</option>
                    <option value="MIPA">Khusus Peminatan MIPA</option>
                    <option value="IPS">Khusus Peminatan IPS</option>
                    <option value="BHS">Khusus Peminatan BHS (Bahasa & Budaya)</option>
                    <option value="UMM">Khusus Kelas UMM (Umum / Lintas Minat)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-palette-text mb-1">
                    Tahun Pelajaran
                  </label>
                  <input
                    type="text"
                    value={editingItem.academicYear}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        academicYear: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs font-mono bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-palette-text mb-1">
                    Nomor Urut Awal
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editingItem.startSequence}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        startSequence: Number(e.target.value) || 1,
                      })
                    }
                    className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-palette-text mb-1">
                    Digit Nomor Urut
                  </label>
                  <select
                    value={editingItem.digitPadding}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        digitPadding: Number(e.target.value) || 3,
                      })
                    }
                    className="w-full px-3 py-2 text-xs font-mono bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
                  >
                    <option value={2}>2 Digit (01, 02)</option>
                    <option value={3}>3 Digit (001, 002)</option>
                    <option value={4}>4 Digit (0001, 0002)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-palette-text mb-1">
                    Tanggal Surat
                  </label>
                  <input
                    type="date"
                    value={editingItem.issueDate}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        issueDate: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs font-mono bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-palette-text mb-1">
                  Catatan / Keterangan Surat
                </label>
                <input
                  type="text"
                  value={editingItem.notes}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      notes: e.target.value,
                    })
                  }
                  placeholder="Contoh: Digunakan untuk penomoran SKL Kelulusan Mei 2026"
                  className="w-full px-3 py-2 text-xs bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
                />
              </div>

              <label className="flex items-center gap-2.5 p-3 rounded-lg bg-palette-background border border-palette-accent cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingItem.isDefault}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      isDefault: e.target.checked,
                    })
                  }
                  className="rounded border-palette-accent text-palette-primary focus:ring-0"
                />
                <span className="text-xs font-medium text-palette-text">
                  Jadikan sebagai <strong>Format Nomor Surat Default</strong> saat menambah peserta
                  didik baru
                </span>
              </label>

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
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan Format Nomor Surat'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
