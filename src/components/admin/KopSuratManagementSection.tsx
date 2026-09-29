import React, { useState } from 'react';
import {
  Building,
  Save,
  RotateCcw,
  Eye,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Printer,
  Sliders,
  Layers,
  Image as ImageIcon,
} from 'lucide-react';
import { AnnouncementSettings, StudentRecord } from '../../types/graduation';
import { generateGraduationCertificatePDF } from '../../utils/pdfGenerator';

interface KopSuratManagementSectionProps {
  settings: AnnouncementSettings;
  students?: StudentRecord[];
  onSaveSettings: (settings: AnnouncementSettings) => Promise<void>;
}

export const KopSuratManagementSection: React.FC<KopSuratManagementSectionProps> = ({
  settings,
  students = [],
  onSaveSettings,
}) => {
  const [formData, setFormData] = useState<AnnouncementSettings>({
    ...settings,
    kopPemerintah: settings.kopPemerintah || 'PEMERINTAH DAERAH PROVINSI JAWA BARAT',
    kopDinas: settings.kopDinas || 'DINAS PENDIDIKAN',
    kopCabangDinas: settings.kopCabangDinas || 'CABANG DINAS PENDIDIKAN WILAYAH XIII',
    kopKodePos: settings.kopKodePos || '46258',
    kopTelepon: settings.kopTelepon || '(0265) 7578088',
    kopEmail: settings.kopEmail || 'sman1lumbung.ciamis@gmail.com',
    kopWebsite: settings.kopWebsite || 'https://sman1lumbung.sch.id',
    kopLogoKiri: settings.kopLogoKiri || '',
    kopLogoKanan: settings.kopLogoKanan || '',
    kopBorderThickness: settings.kopBorderThickness || 'standard_double',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [previewSampleStudent, setPreviewSampleStudent] = useState<StudentRecord | null>(
    students.length > 0 ? students[0] : null
  );

  const handleChange = (
    field: keyof AnnouncementSettings,
    value: string | number | boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
      updatedAt: new Date().toISOString(),
    }));
    setSaveSuccess(false);
  };

  const handleResetDefault = () => {
    if (
      window.confirm(
        'Kembalikan pengaturan KOP Surat ke format baku resmi SMAN 1 Lumbung Provinsi Jawa Barat?'
      )
    ) {
      setFormData((prev) => ({
        ...prev,
        kopPemerintah: 'PEMERINTAH DAERAH PROVINSI JAWA BARAT',
        kopDinas: 'DINAS PENDIDIKAN',
        kopCabangDinas: 'CABANG DINAS PENDIDIKAN WILAYAH XIII',
        schoolName: 'SMAN 1 Lumbung Ciamis',
        schoolNpsn: '20211502',
        schoolAddress:
          'Jl. Raya Kawali - Panjalu, Desa Lumbung, Kec. Lumbung, Kab. Ciamis, Jawa Barat 46258',
        kopKodePos: '46258',
        kopTelepon: '(0265) 7578088',
        kopEmail: 'sman1lumbung.ciamis@gmail.com',
        kopWebsite: 'https://sman1lumbung.sch.id',
        kopLogoKiri: '',
        kopLogoKanan: '',
        kopBorderThickness: 'standard_double',
        updatedAt: new Date().toISOString(),
      }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveSettings(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      alert('Gagal menyimpan pengaturan KOP Surat: ' + (err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestPrintPdf = () => {
    const dummyStudent: StudentRecord = previewSampleStudent || {
      id: 'preview-sample',
      nisn: '0081234567',
      examNumber: '26-01-0145-0001-8',
      fullName: 'Muhammad Raihan Pratama',
      birthPlace: 'Ciamis',
      birthDate: '2008-04-15',
      className: 'XII MIPA 1',
      major: 'MIPA',
      averageScore: 88.75,
      status: 'LULUS',
      predicate: 'Sangat Memuaskan',
      sklNumber: '421.3/001/SKL-SMAN1LBG/V/2026',
      subjects: [
        { code: 'PAI', name: 'Pendidikan Agama dan Budi Pekerti', category: 'Umum', score: 90, kkm: 75 },
        { code: 'PKN', name: 'Pancasila & Kewarganegaraan', category: 'Umum', score: 88, kkm: 75 },
        { code: 'BIN', name: 'Bahasa Indonesia', category: 'Umum', score: 87, kkm: 75 },
        { code: 'MTK', name: 'Matematika (Umum)', category: 'Umum', score: 89, kkm: 75 },
        { code: 'BIG', name: 'Bahasa Inggris', category: 'Umum', score: 86, kkm: 75 },
        { code: 'FIS', name: 'Fisika', category: 'Peminatan', score: 88, kkm: 75 },
        { code: 'KIM', name: 'Kimia', category: 'Peminatan', score: 91, kkm: 75 },
        { code: 'BIO', name: 'Biologi', category: 'Peminatan', score: 89, kkm: 75 },
      ],
      notes: 'Memenuhi seluruh kriteria kelulusan satuan pendidikan.',
      checkedAt: new Date().toISOString(),
      checkCount: 1,
      updatedAt: new Date().toISOString(),
    };
    generateGraduationCertificatePDF(dummyStudent, formData);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-palette-accent rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-palette-primary/10 text-palette-primary">
              <Building className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-palette-text">
                Pengaturan Format KOP Surat Resmi
              </h3>
              <p className="text-xs text-palette-text/70">
                Konfigurasi tata letak kop surat, logo instansi, identitas dinas pendidikan, serta informasi kontak resmi untuk dokumen Surat Keterangan Lulus (SKL) Digital.
              </p>
            </div>
          </div>
        </div>

        {/* Action Button Group */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleResetDefault}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-palette-text bg-palette-accent/50 hover:bg-palette-accent rounded-lg transition-colors cursor-pointer"
            title="Reset ke format baku SMAN 1 Lumbung"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Format Baku</span>
          </button>

          <button
            type="button"
            onClick={handleTestPrintPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-palette-primary bg-palette-accent/70 hover:bg-palette-accent rounded-lg transition-colors cursor-pointer"
            title="Unduh contoh PDF SKL dengan KOP saat ini"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Test Unduh PDF</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-palette-primary hover:bg-palette-text rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan KOP'}</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-medium flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Pengaturan KOP Surat berhasil diperbarui dan diselaraskan ke sistem cetak SKL Digital.
            </span>
          </div>
        </div>
      )}

      {/* Main Content Grid: Left Form Controls, Right Live Visual Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Fields (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          <form onSubmit={handleSave} className="space-y-5">
            {/* Box 1: Identitas Hierarki Instansi & Dinas */}
            <div className="bg-white border border-palette-accent rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-palette-accent">
                <span className="text-xs font-bold uppercase tracking-wider text-palette-primary font-mono flex items-center gap-1.5">
                  <Sliders className="w-4 h-4" />
                  1. Identitas Hierarki Lembaga & Dinas
                </span>
                <span className="text-[11px] text-palette-text/60">Teks Kepala Surat</span>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-palette-text mb-1">
                    Pemerintah Daerah (Baris 1)
                  </label>
                  <input
                    type="text"
                    value={formData.kopPemerintah || ''}
                    onChange={(e) => handleChange('kopPemerintah', e.target.value)}
                    placeholder="Contoh: PEMERINTAH DAERAH PROVINSI JAWA BARAT"
                    className="w-full px-3 py-2 text-xs border border-palette-accent rounded-lg bg-palette-background focus:bg-white focus:outline-none focus:ring-1 focus:ring-palette-primary"
                  />
                  <p className="text-[10px] text-palette-text/60 mt-0.5">
                    Nama institusi tingkat pertama (Gubernur / Pemprov)
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-palette-text mb-1">
                      Dinas Pendidikan (Baris 2)
                    </label>
                    <input
                      type="text"
                      value={formData.kopDinas || ''}
                      onChange={(e) => handleChange('kopDinas', e.target.value)}
                      placeholder="Contoh: DINAS PENDIDIKAN"
                      className="w-full px-3 py-2 text-xs border border-palette-accent rounded-lg bg-palette-background focus:bg-white focus:outline-none focus:ring-1 focus:ring-palette-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-palette-text mb-1">
                      Cabang Dinas / Wilayah (Baris 3)
                    </label>
                    <input
                      type="text"
                      value={formData.kopCabangDinas || ''}
                      onChange={(e) => handleChange('kopCabangDinas', e.target.value)}
                      placeholder="Contoh: CABANG DINAS PENDIDIKAN WILAYAH XIII"
                      className="w-full px-3 py-2 text-xs border border-palette-accent rounded-lg bg-palette-background focus:bg-white focus:outline-none focus:ring-1 focus:ring-palette-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-palette-text mb-1">
                      Nama Satuan Pendidikan / Sekolah (Baris 4 - Bold)
                    </label>
                    <input
                      type="text"
                      value={formData.schoolName}
                      onChange={(e) => handleChange('schoolName', e.target.value)}
                      placeholder="SMA NEGERI 1 LUMBUNG"
                      className="w-full px-3 py-2 text-xs font-bold border border-palette-accent rounded-lg bg-palette-background focus:bg-white focus:outline-none focus:ring-1 focus:ring-palette-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-palette-text mb-1">
                      NPSN Sekolah
                    </label>
                    <input
                      type="text"
                      value={formData.schoolNpsn}
                      onChange={(e) => handleChange('schoolNpsn', e.target.value)}
                      placeholder="20211502"
                      className="w-full px-3 py-2 text-xs font-mono border border-palette-accent rounded-lg bg-palette-background focus:bg-white focus:outline-none focus:ring-1 focus:ring-palette-primary"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Box 2: Alamat Lengkap & Kontak Resmi */}
            <div className="bg-white border border-palette-accent rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-palette-accent">
                <span className="text-xs font-bold uppercase tracking-wider text-palette-primary font-mono flex items-center gap-1.5">
                  <Building className="w-4 h-4" />
                  2. Alamat & Kontak Resmi
                </span>
                <span className="text-[11px] text-palette-text/60">Kaki KOP Surat</span>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-palette-text mb-1">
                    Alamat Jalan / Lokasi Satuan Pendidikan
                  </label>
                  <input
                    type="text"
                    value={formData.schoolAddress}
                    onChange={(e) => handleChange('schoolAddress', e.target.value)}
                    placeholder="Jl. Raya Kawali - Panjalu, Desa Lumbung, Kec. Lumbung, Kab. Ciamis, Jawa Barat"
                    className="w-full px-3 py-2 text-xs border border-palette-accent rounded-lg bg-palette-background focus:bg-white focus:outline-none focus:ring-1 focus:ring-palette-primary"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-palette-text mb-1">
                      Kode Pos
                    </label>
                    <input
                      type="text"
                      value={formData.kopKodePos || ''}
                      onChange={(e) => handleChange('kopKodePos', e.target.value)}
                      placeholder="46258"
                      className="w-full px-3 py-2 text-xs font-mono border border-palette-accent rounded-lg bg-palette-background focus:bg-white focus:outline-none focus:ring-1 focus:ring-palette-primary"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-palette-text mb-1">
                      No. Telepon / Fax
                    </label>
                    <input
                      type="text"
                      value={formData.kopTelepon || ''}
                      onChange={(e) => handleChange('kopTelepon', e.target.value)}
                      placeholder="(0265) 7578088"
                      className="w-full px-3 py-2 text-xs font-mono border border-palette-accent rounded-lg bg-palette-background focus:bg-white focus:outline-none focus:ring-1 focus:ring-palette-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-palette-text mb-1">
                      Email Resmi Sekolah
                    </label>
                    <input
                      type="email"
                      value={formData.kopEmail || ''}
                      onChange={(e) => handleChange('kopEmail', e.target.value)}
                      placeholder="sman1lumbung.ciamis@gmail.com"
                      className="w-full px-3 py-2 text-xs border border-palette-accent rounded-lg bg-palette-background focus:bg-white focus:outline-none focus:ring-1 focus:ring-palette-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-palette-text mb-1">
                      Website / Portal Resmi
                    </label>
                    <input
                      type="text"
                      value={formData.kopWebsite || ''}
                      onChange={(e) => handleChange('kopWebsite', e.target.value)}
                      placeholder="https://sman1lumbung.sch.id"
                      className="w-full px-3 py-2 text-xs border border-palette-accent rounded-lg bg-palette-background focus:bg-white focus:outline-none focus:ring-1 focus:ring-palette-primary"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Box 3: Logo & Gaya Garis Pembatas KOP */}
            <div className="bg-white border border-palette-accent rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-palette-accent">
                <span className="text-xs font-bold uppercase tracking-wider text-palette-primary font-mono flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4" />
                  3. Logo & Garis Pembatas KOP
                </span>
                <span className="text-[11px] text-palette-text/60">Dekorasi Resmi</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-lg border border-palette-accent bg-palette-background space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-palette-text">
                      Logo Kiri (Pemda / Pemprov)
                    </label>
                    <span className="text-[10px] text-palette-text/60 font-mono">Opsional</span>
                  </div>
                  <input
                    type="text"
                    value={formData.kopLogoKiri || ''}
                    onChange={(e) => handleChange('kopLogoKiri', e.target.value)}
                    placeholder="URL gambar (HTTPS) atau biarkan kosong untuk vektor bawaan"
                    className="w-full px-3 py-1.5 text-xs border border-palette-accent rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-palette-primary"
                  />
                  <p className="text-[10px] text-palette-text/60">
                    Bila dikosongkan, sistem menampilkan lambang resmi Pemprov Jawa Barat.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg border border-palette-accent bg-palette-background space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-palette-text">
                      Logo Kanan (Tut Wuri / Sekolah)
                    </label>
                    <span className="text-[10px] text-palette-text/60 font-mono">Opsional</span>
                  </div>
                  <input
                    type="text"
                    value={formData.kopLogoKanan || ''}
                    onChange={(e) => handleChange('kopLogoKanan', e.target.value)}
                    placeholder="URL gambar (HTTPS) atau biarkan kosong untuk vektor bawaan"
                    className="w-full px-3 py-1.5 text-xs border border-palette-accent rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-palette-primary"
                  />
                  <p className="text-[10px] text-palette-text/60">
                    Bila dikosongkan, sistem menampilkan lambang resmi Tut Wuri Handayani.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-palette-text mb-1.5">
                  Model Garis Pembatas KOP Surat
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <label
                    className={`flex items-center gap-2.5 p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                      formData.kopBorderThickness === 'standard_double'
                        ? 'border-palette-primary bg-palette-primary/5 font-semibold text-palette-primary'
                        : 'border-palette-accent bg-palette-background text-palette-text hover:bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="kopBorderThickness"
                      value="standard_double"
                      checked={formData.kopBorderThickness === 'standard_double'}
                      onChange={() => handleChange('kopBorderThickness', 'standard_double')}
                      className="accent-palette-primary"
                    />
                    <div>
                      <div>Ganda Standar</div>
                      <div className="text-[10px] text-palette-text/60">Tebal 0.8mm + Tipis</div>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-2.5 p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                      formData.kopBorderThickness === 'thick_double'
                        ? 'border-palette-primary bg-palette-primary/5 font-semibold text-palette-primary'
                        : 'border-palette-accent bg-palette-background text-palette-text hover:bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="kopBorderThickness"
                      value="thick_double"
                      checked={formData.kopBorderThickness === 'thick_double'}
                      onChange={() => handleChange('kopBorderThickness', 'thick_double')}
                      className="accent-palette-primary"
                    />
                    <div>
                      <div>Ganda Tebal</div>
                      <div className="text-[10px] text-palette-text/60">Tebal 1.2mm + Tipis</div>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-2.5 p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                      formData.kopBorderThickness === 'single'
                        ? 'border-palette-primary bg-palette-primary/5 font-semibold text-palette-primary'
                        : 'border-palette-accent bg-palette-background text-palette-text hover:bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="kopBorderThickness"
                      value="single"
                      checked={formData.kopBorderThickness === 'single'}
                      onChange={() => handleChange('kopBorderThickness', 'single')}
                      className="accent-palette-primary"
                    />
                    <div>
                      <div>Garis Tunggal</div>
                      <div className="text-[10px] text-palette-text/60">Tebal 1.0mm Solid</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Bottom Save Bar */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-semibold text-white bg-palette-primary hover:bg-palette-text rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Menyimpan Pengaturan...' : 'Simpan Semua Perubahan KOP'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Live Interactive SKL Letterhead Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-palette-accent rounded-xl p-4 sm:p-5 sticky top-20 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-palette-accent">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-palette-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-palette-text font-mono">
                  Live Preview KOP Dokumen SKL
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-palette-accent/80 text-palette-text">
                Kertas A4 Resmi
              </span>
            </div>

            {/* Simulated Paper Container */}
            <div className="bg-white border-2 border-slate-300 rounded-lg p-4 sm:p-5 shadow-inner text-slate-800 space-y-3 font-sans">
              {/* Outer decorative box resembling real SKL format */}
              <div className="border border-slate-300 p-3 sm:p-4 rounded space-y-3 bg-white">
                {/* KOP SURAT HEADER */}
                <div className="relative flex items-center justify-between gap-3 pt-1">
                  {/* Left Logo (Pemprov / Instansi) */}
                  <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 flex items-center justify-center">
                    {formData.kopLogoKiri ? (
                      <img
                        src={formData.kopLogoKiri}
                        alt="Logo Kiri"
                        className="max-h-full max-w-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full border border-slate-400 bg-amber-50 flex items-center justify-center p-1 text-center shadow-2xs">
                        <span className="text-[8px] font-bold leading-none text-amber-900 font-mono">
                          JABAR
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Center Text Header */}
                  <div className="flex-1 text-center space-y-0.5">
                    <p className="text-[10px] sm:text-[11px] font-bold tracking-wide text-slate-800 uppercase leading-tight font-sans">
                      {formData.kopPemerintah || 'PEMERINTAH DAERAH PROVINSI JAWA BARAT'}
                    </p>
                    <p className="text-[10px] sm:text-[11px] font-bold tracking-wide text-slate-800 uppercase leading-tight font-sans">
                      {formData.kopDinas || 'DINAS PENDIDIKAN'}
                    </p>
                    {formData.kopCabangDinas && (
                      <p className="text-[9px] sm:text-[10px] font-semibold text-slate-700 uppercase leading-tight font-sans">
                        {formData.kopCabangDinas}
                      </p>
                    )}
                    <h4 className="text-xs sm:text-sm font-black tracking-tight text-slate-950 uppercase pt-0.5 leading-snug font-serif">
                      {formData.schoolName || 'SMA NEGERI 1 LUMBUNG'}
                    </h4>
                    <p className="text-[8px] sm:text-[9px] text-slate-600 leading-tight pt-0.5">
                      NPSN: {formData.schoolNpsn || '20211502'} | Telp:{' '}
                      {formData.kopTelepon || '(0265) 7578088'} | Kode Pos:{' '}
                      {formData.kopKodePos || '46258'}
                    </p>
                    <p className="text-[8px] sm:text-[8.5px] text-slate-600 leading-tight">
                      {formData.schoolAddress}
                    </p>
                    {(formData.kopEmail || formData.kopWebsite) && (
                      <p className="text-[7.5px] sm:text-[8px] text-slate-500 font-mono leading-tight">
                        {formData.kopEmail && <span>Email: {formData.kopEmail}</span>}
                        {formData.kopEmail && formData.kopWebsite && <span> | </span>}
                        {formData.kopWebsite && <span>Web: {formData.kopWebsite}</span>}
                      </p>
                    )}
                  </div>

                  {/* Right Logo (Tut Wuri / Sekolah) */}
                  <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 flex items-center justify-center">
                    {formData.kopLogoKanan ? (
                      <img
                        src={formData.kopLogoKanan}
                        alt="Logo Kanan"
                        className="max-h-full max-w-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full border border-slate-400 bg-sky-50 flex items-center justify-center p-1 text-center shadow-2xs">
                        <span className="text-[8px] font-bold leading-none text-sky-900 font-mono">
                          SMAN 1
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Double Border Line / Divider */}
                <div className="pt-1">
                  {formData.kopBorderThickness === 'thick_double' ? (
                    <div className="space-y-0.5">
                      <div className="h-[2px] bg-slate-900 w-full" />
                      <div className="h-[0.8px] bg-slate-900 w-full" />
                    </div>
                  ) : formData.kopBorderThickness === 'single' ? (
                    <div className="h-[1.5px] bg-slate-900 w-full" />
                  ) : (
                    <div className="space-y-[1px]">
                      <div className="h-[1.5px] bg-slate-900 w-full" />
                      <div className="h-[0.5px] bg-slate-800 w-full" />
                    </div>
                  )}
                </div>

                {/* Body Preview Title */}
                <div className="text-center pt-2 space-y-0.5">
                  <h5 className="text-[11px] sm:text-xs font-bold uppercase underline tracking-wider font-serif text-slate-900">
                    SURAT KETERANGAN LULUS
                  </h5>
                  <p className="text-[9px] font-mono text-slate-600">
                    Nomor: {formData.sklPrefix || '421.3/001/SKL-SMAN1LBG/V/2026'}
                  </p>
                </div>

                {/* Sample Body excerpt */}
                <div className="text-[8.5px] text-slate-700 leading-relaxed space-y-1.5 pt-1">
                  <p>
                    Kepala {formData.schoolName}, Kabupaten Ciamis Provinsi Jawa Barat selaku Ketua
                    Penyelenggara Ujian Satuan Pendidikan Tahun Pelajaran {formData.academicYear},
                    menerangkan bahwa:
                  </p>
                  <div className="grid grid-cols-3 gap-1 bg-slate-50 p-2 rounded border border-slate-200 text-[8px] font-mono">
                    <div>Nama: {previewSampleStudent?.fullName || 'Muhammad Raihan Pratama'}</div>
                    <div>NISN: {previewSampleStudent?.nisn || '0081234567'}</div>
                    <div>Status: <span className="font-bold text-emerald-700">LULUS</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Note & Info Footer */}
            <div className="p-3 bg-palette-background rounded-lg border border-palette-accent text-[11px] text-palette-text/75 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-palette-primary">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Kesesuaian Format Dokumen</span>
              </div>
              <p>
                Format KOP Surat ini otomatis diterapkan pada seluruh dokumen SKL Digital saat peserta didik maupun pihak sekolah mengunduh PDF.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
