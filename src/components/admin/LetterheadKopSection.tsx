import React, { useState } from 'react';
import {
  FileText,
  Save,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Download,
  Building2,
  UserCheck,
  Calendar,
  Sparkles,
  Info,
  MapPin,
  FileCheck,
} from 'lucide-react';
import { AnnouncementSettings, StudentRecord } from '../../types/graduation';
import { generateGraduationCertificatePDF } from '../../utils/pdfGenerator';

interface LetterheadKopSectionProps {
  settings: AnnouncementSettings;
  onSaveSettings: (settings: AnnouncementSettings) => Promise<void>;
  sampleStudent?: StudentRecord;
}

export const LetterheadKopSection: React.FC<LetterheadKopSectionProps> = ({
  settings,
  onSaveSettings,
  sampleStudent,
}) => {
  const [formSettings, setFormSettings] = useState<AnnouncementSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState<string>('');
  const [showGuide, setShowGuide] = useState(false);

  React.useEffect(() => {
    setFormSettings(settings);
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedBanner('');
    try {
      await onSaveSettings(formSettings);
      setSavedBanner(
        'Pengaturan KOP Surat resmi SKL berhasil disimpan dan otomatis disinkronkan ke dokumen PDF SKL seluruh peserta didik.'
      );
    } catch (err: any) {
      setSavedBanner('Gagal menyimpan pengaturan KOP: ' + (err?.message || 'Terjadi kesalahan sistem.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestPrintPDF = () => {
    const dummyStudent: StudentRecord = sampleStudent || {
      id: 'demo-student',
      nisn: '0084921034',
      examNumber: '26-01-0145-0001-8',
      fullName: 'Nadia Putri Maharani',
      birthPlace: 'Ciamis',
      birthDate: '2008-05-14',
      className: 'XII MIPA 1',
      major: 'MIPA',
      averageScore: 92.5,
      status: 'LULUS',
      predicate: 'Dengan Pujian',
      sklNumber: '421.3/001/SKL-SMAN1LBG/V/2026',
      subjects: [
        { code: 'PAI', name: 'Pendidikan Agama dan Budi Pekerti', category: 'Umum', score: 95, kkm: 75 },
        { code: 'PKN', name: 'Pendidikan Pancasila dan Kewarganegaraan', category: 'Umum', score: 92, kkm: 75 },
        { code: 'BIN', name: 'Bahasa Indonesia', category: 'Umum', score: 94, kkm: 75 },
        { code: 'MTK', name: 'Matematika', category: 'Umum', score: 91, kkm: 75 },
        { code: 'BIG', name: 'Bahasa Inggris', category: 'Umum', score: 93, kkm: 75 },
        { code: 'FIS', name: 'Fisika', category: 'Peminatan', score: 90, kkm: 75 },
        { code: 'KIM', name: 'Kimia', category: 'Peminatan', score: 92, kkm: 75 },
        { code: 'BIO', name: 'Biologi', category: 'Peminatan', score: 93, kkm: 75 },
      ],
      notes: 'Memenuhi seluruh kriteria kelulusan satuan pendidikan.',
      checkedAt: new Date().toISOString(),
      checkCount: 1,
      updatedAt: new Date().toISOString(),
    };

    generateGraduationCertificatePDF(dummyStudent, formSettings);
  };

  return (
    <div className="space-y-6">
      {/* Header Toolbar */}
      <div className="bg-white border border-palette-accent rounded-xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-palette-primary uppercase tracking-wider">
              <FileText className="w-3.5 h-3.5" />
              <span>Pengaturan Format SKL Digital</span>
            </div>
            <h2 className="font-display text-lg font-bold text-palette-text">
              Pengaturan KOP Surat Resmi SKL & Identitas Sekolah
            </h2>
            <p className="text-xs text-palette-text/70">
              Konfigurasi teks instansi pembina, nama satuan pendidikan, NPSN, alamat lengkap, dan
              pejabat penandatangan SKL yang tercetak otomatis pada berkas PDF A4.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowGuide((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-palette-primary bg-palette-accent/45 border border-palette-accent rounded-lg hover:bg-palette-accent transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Panduan KOP Surat</span>
              {showGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={handleTestPrintPDF}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-palette-text bg-palette-background border border-palette-accent rounded-lg hover:bg-palette-accent/60 transition-colors cursor-pointer"
              title="Cetak sampel PDF SKL dengan KOP ini"
            >
              <Download className="w-3.5 h-3.5 text-palette-primary" />
              <span>Uji Coba Cetak PDF SKL</span>
            </button>
          </div>
        </div>

        {/* Collapsible Guide */}
        {showGuide && (
          <div className="pt-3 border-t border-palette-accent space-y-3 text-xs leading-relaxed">
            <div className="p-4 rounded-xl bg-palette-accent/35 border border-palette-accent space-y-2">
              <div className="font-bold text-palette-text flex items-center gap-1.5">
                <Info className="w-4 h-4 text-palette-primary shrink-0" />
                <span>Petunjuk Format Standar KOP Surat SKL:</span>
              </div>
              <ul className="space-y-1.5 text-palette-text/85 list-disc list-inside">
                <li>
                  <strong>Baris 1 (Instansi Pembina):</strong> Ditulis dengan huruf kapital kecil, misal: <code className="font-mono">PEMERINTAH DAERAH PROVINSI JAWA BARAT · DINAS PENDIDIKAN</code>.
                </li>
                <li>
                  <strong>Baris 2 (Nama Satuan Pendidikan):</strong> Nama resmi sekolah dalam huruf kapital dan font serif tebal, misal: <code className="font-mono">SMA NEGERI 1 LUMBUNG CIAMIS</code>.
                </li>
                <li>
                  <strong>Baris 3 (Identitas Pokok):</strong> Memuat Nomor Pokok Sekolah Nasional (NPSN) dan Tahun Pelajaran aktif.
                </li>
                <li>
                  <strong>Baris 4 (Alamat & Kontak):</strong> Alamat jalan, desa/kelurahan, kecamatan, kabupaten, kode pos, dan kontak resmi sekolah.
                </li>
                <li>
                  <strong>Tanda Tangan Kepala Sekolah:</strong> Nama lengkap beserta gelar dan 18 digit NIP Kepala Sekolah sebagai penanggung jawab penerbitan SKL.
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {savedBanner && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span className="font-medium">{savedBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setSavedBanner('')}
            className="text-xs font-semibold underline cursor-pointer shrink-0"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Main Grid: Form Settings & Live Letterhead Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Controls (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-palette-accent rounded-xl p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-palette-accent">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-palette-primary" />
              <h3 className="font-display text-sm font-bold text-palette-text">
                Formulir Konfigurasi KOP & SKL
              </h3>
            </div>
            <span className="text-[11px] font-mono font-medium text-palette-text/70">
              Tabel: public.announcement_settings
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-palette-text mb-1">
                Instansi Pembina / Dinas Pendidikan (KOP Baris 1) <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={formSettings.provinceName}
                onChange={(e) => setFormSettings({ ...formSettings, provinceName: e.target.value })}
                placeholder="Contoh: Pemerintah Daerah Provinsi Jawa Barat · Dinas Pendidikan"
                className="w-full px-3.5 py-2.5 min-h-[40px] text-xs sm:text-sm bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-palette-text mb-1">
                Nama Resmi Satuan Pendidikan (KOP Baris 2) <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={formSettings.schoolName}
                onChange={(e) => setFormSettings({ ...formSettings, schoolName: e.target.value })}
                placeholder="Contoh: SMAN 1 Lumbung Ciamis"
                className="w-full px-3.5 py-2.5 min-h-[40px] text-xs sm:text-sm bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text font-semibold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-palette-text mb-1">
                  Nomor Pokok Sekolah Nasional (NPSN) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formSettings.schoolNpsn}
                  onChange={(e) => setFormSettings({ ...formSettings, schoolNpsn: e.target.value })}
                  placeholder="Contoh: 20211502"
                  className="w-full px-3.5 py-2.5 min-h-[40px] text-xs sm:text-sm font-mono bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-palette-text mb-1">
                  Tahun Pelajaran (TA) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formSettings.academicYear}
                  onChange={(e) => setFormSettings({ ...formSettings, academicYear: e.target.value })}
                  placeholder="Contoh: 2025/2026"
                  className="w-full px-3.5 py-2.5 min-h-[40px] text-xs sm:text-sm font-mono bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-palette-text mb-1">
                Alamat Lengkap, Kode Pos, & Kontak Satuan Pendidikan <span className="text-rose-600">*</span>
              </label>
              <textarea
                required
                rows={2}
                value={formSettings.schoolAddress}
                onChange={(e) => setFormSettings({ ...formSettings, schoolAddress: e.target.value })}
                placeholder="Contoh: Jl. Raya Kawali - Panjalu, Desa Lumbung, Kec. Lumbung, Kab. Ciamis, Jawa Barat 46258"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text resize-y leading-relaxed"
              />
            </div>

            <div className="pt-2 border-t border-palette-accent/70 space-y-4">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-palette-primary" />
                <h4 className="text-xs font-bold text-palette-text uppercase tracking-wider">
                  Pejabat Penandatangan SKL
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-palette-text mb-1">
                    Nama Kepala Sekolah & Gelar <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formSettings.principalName}
                    onChange={(e) =>
                      setFormSettings({ ...formSettings, principalName: e.target.value })
                    }
                    placeholder="Contoh: Dr. H. Hendra Wijaya, M.Pd."
                    className="w-full px-3.5 py-2.5 min-h-[40px] text-xs sm:text-sm bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-palette-text mb-1">
                    NIP Kepala Sekolah <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formSettings.principalNip}
                    onChange={(e) =>
                      setFormSettings({ ...formSettings, principalNip: e.target.value })
                    }
                    placeholder="Contoh: 19720814 199803 1 004"
                    className="w-full px-3.5 py-2.5 min-h-[40px] text-xs sm:text-sm font-mono bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-palette-text mb-1">
                    Tanggal Rapat Pleno / Penetapan SKL <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formSettings.plenoDate}
                    onChange={(e) => setFormSettings({ ...formSettings, plenoDate: e.target.value })}
                    placeholder="Contoh: 4 Mei 2026"
                    className="w-full px-3.5 py-2.5 min-h-[40px] text-xs sm:text-sm bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-palette-text mb-1">
                    Prefix Nomor Standar SKL
                  </label>
                  <input
                    type="text"
                    value={formSettings.sklPrefix}
                    onChange={(e) => setFormSettings({ ...formSettings, sklPrefix: e.target.value })}
                    placeholder="Contoh: 421.3/SKL-SMAN1LBG/V/2026"
                    className="w-full px-3.5 py-2.5 min-h-[40px] text-xs sm:text-sm font-mono bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 min-h-[44px] text-xs sm:text-sm font-semibold text-white bg-palette-primary rounded-lg hover:bg-palette-text disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Menyimpan ke Supabase...' : 'Simpan Pengaturan KOP Surat'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Live Letterhead Visual Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-palette-accent rounded-xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-palette-accent">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-palette-primary" />
                <h3 className="font-display text-sm font-bold text-palette-text">
                  Pratinjau KOP Surat (Dokumen A4)
                </h3>
              </div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-palette-accent/50 text-palette-text font-bold">
                Live Preview
              </span>
            </div>

            {/* Visual Simulated Letterhead Sheet */}
            <div className="bg-white border-2 border-slate-300 rounded-lg p-5 space-y-3 shadow-inner text-center font-serif text-slate-900 select-none">
              {/* Line 1: Province / Department */}
              <p className="text-[11px] font-sans font-bold tracking-wider text-slate-700 uppercase">
                {formSettings.provinceName || 'PEMERINTAH DAERAH PROVINSI JAWA BARAT · DINAS PENDIDIKAN'}
              </p>

              {/* Line 2: School Name */}
              <h2 className="text-base sm:text-lg font-display font-extrabold text-slate-950 tracking-tight uppercase leading-tight">
                {formSettings.schoolName || 'SMAN 1 LUMBUNG CIAMIS'}
              </h2>

              {/* Line 3: NPSN & TA */}
              <p className="text-[10px] font-sans text-slate-600 font-medium">
                NPSN: <span className="font-mono">{formSettings.schoolNpsn || '20211502'}</span> · Tahun Pelajaran: <span className="font-mono">{formSettings.academicYear || '2025/2026'}</span>
              </p>

              {/* Line 4: Full Address */}
              <p className="text-[10px] font-sans text-slate-600 leading-snug">
                {formSettings.schoolAddress || 'Jl. Raya Kawali - Panjalu, Desa Lumbung, Kec. Lumbung, Kab. Ciamis, Jawa Barat 46258'}
              </p>

              {/* Double Horizontal Divider Line */}
              <div className="pt-2">
                <div className="w-full border-t-2 border-slate-900" />
                <div className="w-full border-t border-slate-900 mt-[1.5px]" />
              </div>

              {/* Simulated Document Body Sneak-peek */}
              <div className="pt-3 pb-2 space-y-2 text-[10.5px] font-sans text-slate-700 text-left">
                <div className="text-center font-display font-bold text-xs uppercase text-slate-900 tracking-wide">
                  SURAT KETERANGAN LULUS
                </div>
                <div className="text-center font-mono text-[10px] text-slate-600">
                  Nomor: {formSettings.sklPrefix ? formSettings.sklPrefix.replace(/V\/2026/, '001/SKL-SMAN1LBG/V/2026') : '421.3/001/SKL-SMAN1LBG/V/2026'}
                </div>
                <p className="text-[10px] text-slate-600 leading-relaxed pt-1">
                  Kepala {formSettings.schoolName || 'SMAN 1 Lumbung Ciamis'}, menerangkan bahwa berdasarkan kriteria kelulusan satuan pendidikan:
                </p>

                {/* Sample signature mock */}
                <div className="pt-4 flex justify-end">
                  <div className="text-center text-[10px] font-sans w-48 space-y-1">
                    <p>Lumbung, {formSettings.plenoDate || '4 Mei 2026'}</p>
                    <p className="font-semibold">Kepala Sekolah,</p>
                    <div className="h-10 flex items-center justify-center text-slate-400 italic text-[9px]">
                      [ Tanda Tangan & Cap Resmi ]
                    </div>
                    <p className="font-bold underline text-slate-900">
                      {formSettings.principalName || 'Dr. H. Hendra Wijaya, M.Pd.'}
                    </p>
                    <p className="font-mono text-[9px] text-slate-600">
                      NIP. {formSettings.principalNip || '19720814 199803 1 004'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-palette-background border border-palette-accent text-xs space-y-1 text-palette-text/80">
              <div className="font-semibold text-palette-text flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-palette-primary" />
                <span>Terintegrasi Otomatis ke Seluruh Fitur:</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Setiap perubahan pada formulir ini akan langsung diterapkan ke formulir verifikasi kelulusan siswa, seluruh dokumen cetak SKL PDF A4, dan kartu pengumuman publik.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
