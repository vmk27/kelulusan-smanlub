import React, { useEffect, useRef, useState } from 'react';
import {
  Building,
  Save,
  RotateCcw,
  Eye,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Printer,
  Sliders,
  Layers,
  Image as ImageIcon,
  Trash2,
  RefreshCw,
  MapPin,
  Calendar,
  Type,
  FileCheck2,
  PenTool,
} from 'lucide-react';
import { AnnouncementSettings, StudentRecord } from '../../types/graduation';
import { generateGraduationCertificatePDF } from '../../utils/pdfGenerator';
import { uploadFileToSupabaseStorage } from '../../lib/supabase';

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
    sklOpeningText:
      settings.sklOpeningText ||
      'Kepala [NAMA_SEKOLAH] selaku Ketua Penyelenggara Ujian Satuan Pendidikan Tahun Pelajaran [TAHUN_AJARAN], berdasarkan Kriteria Kelulusan Peserta Didik dan hasil Rapat Pleno Dewan Pendidik pada tanggal [TANGGAL_PLENO], dengan ini menerangkan bahwa:',
    sklClosingText:
      settings.sklClosingText ||
      'Surat Keterangan Lulus ini bersifat resmi dan berlaku sementara sampai dengan diterbitkannya Ijazah Asli Tahun Pelajaran [TAHUN_AJARAN].',
    sklLegalLocation: settings.sklLegalLocation || 'Ciamis',
    principalSignature: settings.principalSignature || '',
  });

  useEffect(() => {
    setFormData((prev) => ({
      ...settings,
      kopPemerintah: settings.kopPemerintah || prev.kopPemerintah || 'PEMERINTAH DAERAH PROVINSI JAWA BARAT',
      kopDinas: settings.kopDinas || prev.kopDinas || 'DINAS PENDIDIKAN',
      kopCabangDinas: settings.kopCabangDinas || prev.kopCabangDinas || 'CABANG DINAS PENDIDIKAN WILAYAH XIII',
      kopKodePos: settings.kopKodePos || prev.kopKodePos || '46258',
      kopTelepon: settings.kopTelepon || prev.kopTelepon || '(0265) 7578088',
      kopEmail: settings.kopEmail || prev.kopEmail || 'sman1lumbung.ciamis@gmail.com',
      kopWebsite: settings.kopWebsite || prev.kopWebsite || 'https://sman1lumbung.sch.id',
      kopLogoKiri: settings.kopLogoKiri !== undefined ? settings.kopLogoKiri : (prev.kopLogoKiri ?? ''),
      kopLogoKanan: settings.kopLogoKanan !== undefined ? settings.kopLogoKanan : (prev.kopLogoKanan ?? ''),
      kopLogoKiriSize: settings.kopLogoKiriSize ?? prev.kopLogoKiriSize ?? 30,
      kopLogoKananSize: settings.kopLogoKananSize ?? prev.kopLogoKananSize ?? 30,
      kopBorderThickness: settings.kopBorderThickness || prev.kopBorderThickness || 'standard_double',
      sklOpeningText: settings.sklOpeningText || prev.sklOpeningText || '',
      sklClosingText: settings.sklClosingText || prev.sklClosingText || '',
      sklLegalLocation: settings.sklLegalLocation || prev.sklLegalLocation || 'Ciamis',
      principalSignature: settings.principalSignature !== undefined ? settings.principalSignature : (prev.principalSignature ?? ''),
    }));
  }, [settings]);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [previewSampleStudent, setPreviewSampleStudent] = useState<StudentRecord | null>(
    students.length > 0 ? students[0] : null
  );

  const fileInputKiriRef = useRef<HTMLInputElement>(null);
  const fileInputKananRef = useRef<HTMLInputElement>(null);
  const fileInputTtdRef = useRef<HTMLInputElement>(null);

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

  const [uploadingField, setUploadingField] = useState<
    'kopLogoKiri' | 'kopLogoKanan' | 'principalSignature' | null
  >(null);
  const [uploadNotice, setUploadNotice] = useState<{
    field: string;
    message: string;
    isSupabase: boolean;
  } | null>(null);

  const handleFileUpload = async (
    field: 'kopLogoKiri' | 'kopLogoKanan' | 'principalSignature',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran berkas gambar terlalu besar (maksimum 5 MB). Silakan gunakan berkas yang lebih kecil.');
      return;
    }

    setUploadingField(field);
    setUploadNotice(null);

    const folderName = field === 'principalSignature' ? 'signatures' : 'logos';
    const storageResult = await uploadFileToSupabaseStorage(file, folderName);

    if (storageResult.url && storageResult.fromSupabaseStorage) {
      handleChange(field, storageResult.url);
      setUploadNotice({
        field,
        message: 'Berkas berhasil diunggah dan disimpan ke Storage.',
        isSupabase: true,
      });
    } else {
      // Fallback to DataURL
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          handleChange(field, result);
          setUploadNotice({
            field,
            message: storageResult.error
              ? `Berkas disimpan secara lokal. (${storageResult.error}). Jalankan skema SQL bucket 'app-files' pada menu Supabase untuk penyimpanan cloud CDN.`
              : 'Berkas disimpan secara lokal (DataURL).',
            isSupabase: false,
          });
        }
      };
      reader.readAsDataURL(file);
    }

    setUploadingField(null);
    e.target.value = '';
  };

  const handleClearField = (field: 'kopLogoKiri' | 'kopLogoKanan' | 'principalSignature') => {
    const label =
      field === 'kopLogoKiri'
        ? 'Logo Kiri (Dinas/Pemda)'
        : field === 'kopLogoKanan'
          ? 'Logo Kanan (Sekolah)'
          : 'Tanda Tangan Kepala Sekolah';
    if (
      window.confirm(
        `Apakah Anda yakin ingin menghapus ${label}? Gambar yang tersimpan akan dihapus setelah Anda menekan tombol Simpan.`
      )
    ) {
      handleChange(field, '');
      setUploadNotice({
        field,
        message: `${label} telah dihapus dari formulir. Tekan "Simpan Semua Format KOP & SKL" untuk menerapkan perubahan.`,
        isSupabase: false,
      });
    }
  };

  const handleResetDefault = () => {
    if (
      window.confirm(
        'Kembalikan seluruh format KOP Surat dan redaksi kalimat SKL ke format baku resmi SMAN 1 Lumbung? (Gambar logo dan tanda tangan yang sudah tersimpan akan tetap dipertahankan).'
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
        kopLogoKiri: prev.kopLogoKiri,
        kopLogoKanan: prev.kopLogoKanan,
        kopLogoKiriSize: prev.kopLogoKiriSize || 30,
        kopLogoKananSize: prev.kopLogoKananSize || 30,
        kopBorderThickness: 'standard_double',
        sklOpeningText:
          'Kepala [NAMA_SEKOLAH] selaku Ketua Penyelenggara Ujian Satuan Pendidikan Tahun Pelajaran [TAHUN_AJARAN], berdasarkan Kriteria Kelulusan Peserta Didik dan hasil Rapat Pleno Dewan Pendidik pada tanggal [TANGGAL_PLENO], dengan ini menerangkan bahwa:',
        sklClosingText:
          'Surat Keterangan Lulus ini bersifat resmi dan berlaku sementara sampai dengan diterbitkannya Ijazah Asli Tahun Pelajaran [TAHUN_AJARAN].',
        sklLegalLocation: 'Ciamis',
        principalSignature: prev.principalSignature,
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
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      alert('Gagal menyimpan pengaturan KOP Surat: ' + (err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestPrintPdf = async () => {
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
    await generateGraduationCertificatePDF(dummyStudent, formData);
  };

  const resolvedOpeningText = (formData.sklOpeningText || '')
    .replace(/\[NAMA_SEKOLAH\]/g, formData.schoolName || 'SMAN 1 Lumbung Ciamis')
    .replace(/\[TAHUN_AJARAN\]/g, formData.academicYear || '2025/2026')
    .replace(/\[TANGGAL_PLENO\]/g, formData.plenoDate || '4 Mei 2026');

  const resolvedClosingText = (formData.sklClosingText || '')
    .replace(/\[NAMA_SEKOLAH\]/g, formData.schoolName || 'SMAN 1 Lumbung Ciamis')
    .replace(/\[TAHUN_AJARAN\]/g, formData.academicYear || '2025/2026')
    .replace(/\[TANGGAL_PLENO\]/g, formData.plenoDate || '4 Mei 2026');

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
                Pengaturan Format KOP & Redaksi Kalimat SKL
              </h3>
              <p className="text-xs text-palette-text/70">
                Kelola identitas dinas, unggah logo sekolah & dinas, atur tanda tangan kepala sekolah, dan sesuaikan redaksi kalimat pengesahan SKL Digital.
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
            title="Unduh contoh PDF SKL dengan KOP, kalimat, dan tanda tangan saat ini"
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
            <span>{isSaving ? 'Menyimpan...' : 'Simpan KOP & SKL'}</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-medium flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Pengaturan KOP Surat, Logo, Tanda Tangan, dan Redaksi Kalimat SKL berhasil diperbarui dan diterapkan ke seluruh sistem cetak.
            </span>
          </div>
        </div>
      )}

      {/* Main Content Grid: Left Form Controls (7 cols), Right Live Visual Preview (5 cols) */}
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
                <span className="text-[11px] text-palette-text/60">Kepala Surat</span>
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

            {/* Box 3: Upload Logo Dinas & Logo Sekolah + Garis Pembatas */}
            <div className="bg-white border border-palette-accent rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-palette-accent">
                <span className="text-xs font-bold uppercase tracking-wider text-palette-primary font-mono flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4" />
                  3. Upload Logo Dinas & Logo Sekolah (Supabase Storage Bucket app-files)
                </span>
                <span className="text-[11px] text-palette-text/60">Logo Resmi & Garis</span>
              </div>

              {uploadNotice && (
                <div
                  className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                    uploadNotice.isSupabase
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {uploadNotice.isSupabase ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                    )}
                    <span>{uploadNotice.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadNotice(null)}
                    className="text-[10px] font-semibold underline cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              )}

              {/* Hidden file inputs */}
              <input
                ref={fileInputKiriRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload('kopLogoKiri', e)}
              />
              <input
                ref={fileInputKananRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload('kopLogoKanan', e)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Logo Kiri Card */}
                <div className="p-4 rounded-xl border border-palette-accent bg-palette-background space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-palette-text">
                      Logo Kiri (Dinas / Pemda)
                    </label>
                    {formData.kopLogoKiri && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-mono font-semibold">
                        Kustom Aktif
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-lg border border-palette-accent bg-white flex items-center justify-center p-1.5 shrink-0 overflow-hidden shadow-2xs">
                      {formData.kopLogoKiri ? (
                        <img
                          src={formData.kopLogoKiri}
                          alt="Logo Dinas"
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full border border-amber-300 bg-amber-50 flex items-center justify-center text-center">
                          <span className="text-[9px] font-bold text-amber-900 font-mono">
                            JABAR
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => fileInputKiriRef.current?.click()}
                          disabled={uploadingField === 'kopLogoKiri'}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-palette-primary hover:bg-palette-text rounded-md transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Upload className={`w-3 h-3 ${uploadingField === 'kopLogoKiri' ? 'animate-bounce' : ''}`} />
                          <span>{uploadingField === 'kopLogoKiri' ? 'Mengunggah...' : 'Unggah Logo'}</span>
                        </button>
                        {formData.kopLogoKiri && (
                          <button
                            type="button"
                            onClick={() => handleClearField('kopLogoKiri')}
                            className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded-md border border-rose-200 transition-colors cursor-pointer"
                            title="Hapus logo kustom & gunakan logo bawaan"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Hapus</span>
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-palette-text/60 leading-tight">
                        PNG, JPG, SVG, WebP (maks. 2 MB). Bila kosong, lambang Pemprov Jawa Barat akan dipakai.
                      </p>
                    </div>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={formData.kopLogoKiri?.startsWith('data:') ? '' : formData.kopLogoKiri || ''}
                      onChange={(e) => handleChange('kopLogoKiri', e.target.value)}
                      placeholder="Atau tautan URL gambar (https://...)"
                      className="w-full px-2.5 py-1.5 text-[11px] border border-palette-accent rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-palette-primary text-palette-text"
                    />
                  </div>
                </div>

                {/* Logo Kanan Card */}
                <div className="p-4 rounded-xl border border-palette-accent bg-palette-background space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-palette-text">
                      Logo Kanan (Sekolah / Tut Wuri)
                    </label>
                    {formData.kopLogoKanan && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-mono font-semibold">
                        Kustom Aktif
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-lg border border-palette-accent bg-white flex items-center justify-center p-1.5 shrink-0 overflow-hidden shadow-2xs">
                      {formData.kopLogoKanan ? (
                        <img
                          src={formData.kopLogoKanan}
                          alt="Logo Sekolah"
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full border border-sky-300 bg-sky-50 flex items-center justify-center text-center">
                          <span className="text-[9px] font-bold text-sky-900 font-mono">
                            SMAN 1
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => fileInputKananRef.current?.click()}
                          disabled={uploadingField === 'kopLogoKanan'}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-palette-primary hover:bg-palette-text rounded-md transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Upload className={`w-3 h-3 ${uploadingField === 'kopLogoKanan' ? 'animate-bounce' : ''}`} />
                          <span>{uploadingField === 'kopLogoKanan' ? 'Mengunggah...' : 'Unggah Logo'}</span>
                        </button>
                        {formData.kopLogoKanan && (
                          <button
                            type="button"
                            onClick={() => handleClearField('kopLogoKanan')}
                            className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded-md border border-rose-200 transition-colors cursor-pointer"
                            title="Hapus logo kustom & gunakan logo bawaan"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Hapus</span>
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-palette-text/60 leading-tight">
                        PNG, JPG, SVG, WebP (maks. 2 MB). Bila kosong, lambang Tut Wuri / Sekolah akan dipakai.
                      </p>
                    </div>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={formData.kopLogoKanan?.startsWith('data:') ? '' : formData.kopLogoKanan || ''}
                      onChange={(e) => handleChange('kopLogoKanan', e.target.value)}
                      placeholder="Atau tautan URL gambar (https://...)"
                      className="w-full px-2.5 py-1.5 text-[11px] border border-palette-accent rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-palette-primary text-palette-text"
                    />
                  </div>
                </div>
              </div>

              {/* Logo Print Size Settings (20-40 mm) */}
              <div className="p-4 rounded-xl border border-palette-accent bg-palette-background space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-palette-text flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-palette-primary" />
                    Ukuran Cetak Logo pada Dokumen PDF (Default 30 × 30 mm, Rentang 20–40 mm)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        kopLogoKiriSize: 30,
                        kopLogoKananSize: 30,
                      }));
                      setSaveSuccess(false);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] text-palette-primary hover:underline font-semibold cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Ukuran (30 mm)</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {/* Left Logo Size */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <label className="font-semibold text-palette-text">Ukuran Max Logo Kiri</label>
                      <span className="font-mono font-bold text-palette-primary px-2 py-0.5 bg-white border border-palette-accent rounded text-[11px]">
                        {formData.kopLogoKiriSize || 30} × {formData.kopLogoKiriSize || 30} mm
                      </span>
                    </div>
                    <input
                      type="range"
                      min={20}
                      max={40}
                      step={1}
                      value={formData.kopLogoKiriSize || 30}
                      onChange={(e) => handleChange('kopLogoKiriSize', Number(e.target.value))}
                      className="w-full accent-palette-primary cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-palette-text/60 font-mono">
                      <span>20 mm</span>
                      <span>30 mm (Default)</span>
                      <span>40 mm</span>
                    </div>
                  </div>

                  {/* Right Logo Size */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <label className="font-semibold text-palette-text">Ukuran Max Logo Kanan</label>
                      <span className="font-mono font-bold text-palette-primary px-2 py-0.5 bg-white border border-palette-accent rounded text-[11px]">
                        {formData.kopLogoKananSize || 30} × {formData.kopLogoKananSize || 30} mm
                      </span>
                    </div>
                    <input
                      type="range"
                      min={20}
                      max={40}
                      step={1}
                      value={formData.kopLogoKananSize || 30}
                      onChange={(e) => handleChange('kopLogoKananSize', Number(e.target.value))}
                      className="w-full accent-palette-primary cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-palette-text/60 font-mono">
                      <span>20 mm</span>
                      <span>30 mm (Default)</span>
                      <span>40 mm</span>
                    </div>
                  </div>
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

            {/* Box 4: Form Redaksi Kalimat Surat Keterangan Lulus (SKL) */}
            <div className="bg-white border border-palette-accent rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-palette-accent">
                <span className="text-xs font-bold uppercase tracking-wider text-palette-primary font-mono flex items-center gap-1.5">
                  <Type className="w-4 h-4" />
                  4. Redaksi Kalimat Surat Keterangan Lulus (SKL)
                </span>
                <span className="text-[11px] text-palette-text/60">Isi Naskah SKL</span>
              </div>

              <div className="space-y-4">
                {/* Kalimat Pembuka */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-palette-text">
                      Kalimat Pembuka / Konsiderans SKL
                    </label>
                    <span className="text-[10px] text-palette-text/60 font-mono">
                      Variabel dinamis didukung
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={formData.sklOpeningText || ''}
                    onChange={(e) => handleChange('sklOpeningText', e.target.value)}
                    placeholder="Kepala [NAMA_SEKOLAH] selaku Ketua Penyelenggara Ujian Satuan Pendidikan..."
                    className="w-full px-3 py-2 text-xs border border-palette-accent rounded-lg bg-palette-background focus:bg-white focus:outline-none focus:ring-1 focus:ring-palette-primary leading-relaxed"
                  />
                  <div className="flex flex-wrap gap-1.5 text-[10px]">
                    <span className="text-palette-text/60">Tag variabel:</span>
                    <button
                      type="button"
                      onClick={() =>
                        handleChange(
                          'sklOpeningText',
                          (formData.sklOpeningText || '') + ' [NAMA_SEKOLAH]'
                        )
                      }
                      className="px-1.5 py-0.5 rounded bg-palette-accent text-palette-primary font-mono font-semibold hover:bg-palette-accent/80 cursor-pointer"
                    >
                      [NAMA_SEKOLAH]
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleChange(
                          'sklOpeningText',
                          (formData.sklOpeningText || '') + ' [TAHUN_AJARAN]'
                        )
                      }
                      className="px-1.5 py-0.5 rounded bg-palette-accent text-palette-primary font-mono font-semibold hover:bg-palette-accent/80 cursor-pointer"
                    >
                      [TAHUN_AJARAN]
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleChange(
                          'sklOpeningText',
                          (formData.sklOpeningText || '') + ' [TANGGAL_PLENO]'
                        )
                      }
                      className="px-1.5 py-0.5 rounded bg-palette-accent text-palette-primary font-mono font-semibold hover:bg-palette-accent/80 cursor-pointer"
                    >
                      [TANGGAL_PLENO]
                    </button>
                  </div>
                </div>

                {/* Kalimat Penutup */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-palette-text">
                      Kalimat Penutup / Ketentuan Masa Berlaku SKL
                    </label>
                  </div>
                  <textarea
                    rows={2}
                    value={formData.sklClosingText || ''}
                    onChange={(e) => handleChange('sklClosingText', e.target.value)}
                    placeholder="Surat Keterangan Lulus ini bersifat resmi dan berlaku sementara..."
                    className="w-full px-3 py-2 text-xs border border-palette-accent rounded-lg bg-palette-background focus:bg-white focus:outline-none focus:ring-1 focus:ring-palette-primary leading-relaxed"
                  />
                </div>

                {/* Tempat Pengesahan & Tanggal Pleno */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-palette-text mb-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-palette-primary" />
                      <span>Tempat / Kota Pengesahan</span>
                    </label>
                    <input
                      type="text"
                      value={formData.sklLegalLocation || ''}
                      onChange={(e) => handleChange('sklLegalLocation', e.target.value)}
                      placeholder="Ciamis"
                      className="w-full px-3 py-2 text-xs border border-palette-accent rounded-lg bg-palette-background focus:bg-white focus:outline-none focus:ring-1 focus:ring-palette-primary"
                    />
                    <p className="text-[10px] text-palette-text/60 mt-0.5">
                      Dicetak pada tanda tangan SKL: &ldquo;Ditetapkan di: {formData.sklLegalLocation || 'Ciamis'}&rdquo;
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-palette-text mb-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-palette-primary" />
                      <span>Tanggal Pengesahan / Rapat Pleno</span>
                    </label>
                    <input
                      type="text"
                      value={formData.plenoDate || ''}
                      onChange={(e) => handleChange('plenoDate', e.target.value)}
                      placeholder="4 Mei 2026"
                      className="w-full px-3 py-2 text-xs border border-palette-accent rounded-lg bg-palette-background focus:bg-white focus:outline-none focus:ring-1 focus:ring-palette-primary"
                    />
                    <p className="text-[10px] text-palette-text/60 mt-0.5">
                      Tanggal hasil rapat kelulusan dewan guru
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Box 5: Upload Tanda Tangan Kepala Sekolah (TTD Opsional) */}
            <div className="bg-white border border-palette-accent rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-palette-accent">
                <span className="text-xs font-bold uppercase tracking-wider text-palette-primary font-mono flex items-center gap-1.5">
                  <PenTool className="w-4 h-4" />
                  5. Tanda Tangan Kepala Sekolah (Opsional)
                </span>
                <span className="text-[11px] text-palette-text/60">Pengesahan Resmi</span>
              </div>

              {/* Hidden file input for Signature */}
              <input
                ref={fileInputTtdRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload('principalSignature', e)}
              />

              <div className="p-4 rounded-xl border border-palette-accent bg-palette-background space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-palette-text">
                      Unggah Gambar Tanda Tangan Kepala Sekolah
                    </h5>
                    <p className="text-[11px] text-palette-text/70 mt-0.5">
                      Tanda tangan akan otomatis dicetak di atas nama Kepala Sekolah pada dokumen SKL PDF.
                    </p>
                  </div>
                  {formData.principalSignature ? (
                    <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-mono font-semibold">
                      TTD Kustom Aktif
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-palette-accent text-palette-text/70 text-[10px] font-mono">
                      Tanda Tangan Fisik (Kosong)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 pt-1">
                  <div className="w-36 h-20 rounded-lg border border-palette-accent bg-white flex items-center justify-center p-2 shrink-0 overflow-hidden shadow-2xs">
                    {formData.principalSignature ? (
                      <img
                        src={formData.principalSignature}
                        alt="Tanda Tangan Kepala Sekolah"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <div className="text-center text-[10px] text-palette-text/50 font-mono italic">
                        [Belum Ada TTD]
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputTtdRef.current?.click()}
                        disabled={uploadingField === 'principalSignature'}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-palette-primary hover:bg-palette-text rounded-md transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Upload className={`w-3.5 h-3.5 ${uploadingField === 'principalSignature' ? 'animate-bounce' : ''}`} />
                        <span>{uploadingField === 'principalSignature' ? 'Mengunggah...' : 'Unggah Gambar TTD'}</span>
                      </button>
                      {formData.principalSignature && (
                        <button
                          type="button"
                          onClick={() => handleClearField('principalSignature')}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded-md border border-rose-200 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus TTD</span>
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-palette-text/60 leading-relaxed">
                      Format disarankan: <strong>PNG transparan</strong> (latar belakang bening) atau JPG/WebP (maks. 2 MB). Bila tidak diunggah, dokumen SKL PDF akan menyisakan ruang kosong yang rapi untuk tanda tangan basah dan stempel fisik sekolah.
                    </p>
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    value={formData.principalSignature?.startsWith('data:') ? '' : formData.principalSignature || ''}
                    onChange={(e) => handleChange('principalSignature', e.target.value)}
                    placeholder="Atau masukkan tautan URL gambar TTD (https://...)"
                    className="w-full px-2.5 py-1.5 text-[11px] border border-palette-accent rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-palette-primary text-palette-text"
                  />
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
                <span>{isSaving ? 'Menyimpan Pengaturan...' : 'Simpan Semua Format KOP & SKL'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Live Interactive SKL Letterhead & Naskah Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-palette-accent rounded-xl p-4 sm:p-5 sticky top-20 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-palette-accent">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-palette-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-palette-text font-mono">
                  Live Preview Dokumen SKL Digital
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-palette-accent/80 text-palette-text">
                Kertas A4 Resmi
              </span>
            </div>

            {/* Simulated Paper Container */}
            <div className="bg-white border-2 border-slate-300 rounded-lg p-3 sm:p-4 shadow-inner text-slate-800 space-y-3 font-sans">
              {/* Outer decorative box resembling real SKL format */}
              <div className="border border-slate-300 p-3 rounded space-y-2.5 bg-white">
                {/* KOP SURAT HEADER */}
                <div className="relative flex items-center justify-between gap-2.5 pt-0.5">
                  {/* Left Logo (Pemprov / Instansi) */}
                  <div
                    className="shrink-0 flex items-center justify-center transition-all duration-150"
                    style={{
                      width: `${Math.round(((formData.kopLogoKiriSize || 30) / 30) * 52)}px`,
                      height: `${Math.round(((formData.kopLogoKiriSize || 30) / 30) * 52)}px`,
                    }}
                  >
                    {formData.kopLogoKiri ? (
                      <img
                        src={formData.kopLogoKiri}
                        alt="Logo Dinas"
                        className="max-h-full max-w-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div
                        className="rounded-full border border-slate-400 bg-amber-50 flex items-center justify-center p-1 text-center shadow-2xs"
                        style={{
                          width: `${Math.round(((formData.kopLogoKiriSize || 30) / 30) * 44)}px`,
                          height: `${Math.round(((formData.kopLogoKiriSize || 30) / 30) * 44)}px`,
                        }}
                      >
                        <span className="text-[7.5px] font-bold leading-none text-amber-900 font-mono">
                          JABAR
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Center Text Header */}
                  <div className="flex-1 text-center space-y-0.5">
                    <p className="text-[9.5px] sm:text-[10.5px] font-bold tracking-wide text-slate-800 uppercase leading-tight font-sans">
                      {formData.kopPemerintah || 'PEMERINTAH DAERAH PROVINSI JAWA BARAT'}
                    </p>
                    <p className="text-[9.5px] sm:text-[10.5px] font-bold tracking-wide text-slate-800 uppercase leading-tight font-sans">
                      {formData.kopDinas || 'DINAS PENDIDIKAN'}
                    </p>
                    {formData.kopCabangDinas && (
                      <p className="text-[8.5px] sm:text-[9.5px] font-semibold text-slate-700 uppercase leading-tight font-sans">
                        {formData.kopCabangDinas}
                      </p>
                    )}
                    <h4 className="text-xs sm:text-[13px] font-black tracking-tight text-slate-950 uppercase pt-0.5 leading-snug font-serif">
                      {formData.schoolName || 'SMA NEGERI 1 LUMBUNG'}
                    </h4>
                    <p className="text-[7.5px] sm:text-[8.5px] text-slate-600 leading-tight pt-0.5">
                      NPSN: {formData.schoolNpsn || '20211502'} | Telp:{' '}
                      {formData.kopTelepon || '(0265) 7578088'} | Kode Pos:{' '}
                      {formData.kopKodePos || '46258'}
                    </p>
                    <p className="text-[7.5px] sm:text-[8px] text-slate-600 leading-tight">
                      {formData.schoolAddress}
                    </p>
                    {(formData.kopEmail || formData.kopWebsite) && (
                      <p className="text-[7px] sm:text-[7.5px] text-slate-500 font-mono leading-tight">
                        {formData.kopEmail && <span>Email: {formData.kopEmail}</span>}
                        {formData.kopEmail && formData.kopWebsite && <span> | </span>}
                        {formData.kopWebsite && <span>Web: {formData.kopWebsite}</span>}
                      </p>
                    )}
                  </div>

                  {/* Right Logo (Tut Wuri / Sekolah) */}
                  <div
                    className="shrink-0 flex items-center justify-center transition-all duration-150"
                    style={{
                      width: `${Math.round(((formData.kopLogoKananSize || 30) / 30) * 52)}px`,
                      height: `${Math.round(((formData.kopLogoKananSize || 30) / 30) * 52)}px`,
                    }}
                  >
                    {formData.kopLogoKanan ? (
                      <img
                        src={formData.kopLogoKanan}
                        alt="Logo Sekolah"
                        className="max-h-full max-w-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div
                        className="rounded-full border border-slate-400 bg-sky-50 flex items-center justify-center p-1 text-center shadow-2xs"
                        style={{
                          width: `${Math.round(((formData.kopLogoKananSize || 30) / 30) * 44)}px`,
                          height: `${Math.round(((formData.kopLogoKananSize || 30) / 30) * 44)}px`,
                        }}
                      >
                        <span className="text-[7.5px] font-bold leading-none text-sky-900 font-mono">
                          SMAN 1
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Double Border Line / Divider */}
                <div className="pt-0.5">
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
                <div className="text-center pt-1.5 space-y-0.5">
                  <h5 className="text-[10.5px] sm:text-[11.5px] font-bold uppercase underline tracking-wider font-serif text-slate-900">
                    SURAT KETERANGAN LULUS
                  </h5>
                  <p className="text-[8.5px] font-mono text-slate-600">
                    Nomor: {formData.sklPrefix || '421.3/001/SKL-SMAN1LBG/V/2026'}
                  </p>
                </div>

                {/* Opening Text Live Preview */}
                <div className="text-[8px] sm:text-[8.5px] text-slate-700 leading-relaxed text-justify">
                  {resolvedOpeningText}
                </div>

                {/* Sample Student Identity Block */}
                <div className="p-2 rounded bg-slate-50 border border-slate-200 text-[7.5px] sm:text-[8px] font-mono space-y-1">
                  <div className="flex justify-between">
                    <span>Nama: {previewSampleStudent?.fullName || 'Muhammad Raihan Pratama'}</span>
                    <span>NISN: {previewSampleStudent?.nisn || '0081234567'}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Kelas: {previewSampleStudent?.className || 'XII MIPA 1'}</span>
                    <span className="text-emerald-700">STATUS: LULUS</span>
                  </div>
                </div>

                {/* Closing Text Live Preview */}
                <div className="text-[8px] sm:text-[8.5px] text-slate-600 leading-relaxed italic text-justify">
                  Catatan: {resolvedClosingText}
                </div>

                {/* Signature Preview Block (Without QR code, with Principal signature image or clean space) */}
                <div className="pt-2 flex justify-end text-[8px] text-slate-800">
                  <div className="text-center space-y-0.5 min-w-[140px]">
                    <p className="font-medium">{formData.sklLegalLocation || 'Ciamis'}, {formData.plenoDate || '4 Mei 2026'}</p>
                    <p className="font-bold pt-0.5">Kepala {formData.schoolName || 'SMAN 1 Lumbung'},</p>
                    
                    {/* Render uploaded signature or clean space */}
                    <div className="h-10 flex items-center justify-center my-0.5">
                      {formData.principalSignature ? (
                        <img
                          src={formData.principalSignature}
                          alt="Tanda Tangan Kepala Sekolah"
                          className="h-9 max-w-full object-contain"
                        />
                      ) : (
                        <div className="text-[7.5px] text-slate-400 italic font-serif">
                          [Tanda Tangan & Stempel Fisik]
                        </div>
                      )}
                    </div>

                    <p className="font-bold underline">{formData.principalName}</p>
                    <p className="font-mono">NIP. {formData.principalNip}</p>
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
                Dokumen SKL PDF dicetak tanpa matriks QR code dan mencantumkan tanda tangan Kepala Sekolah secara rapi dan proporsional.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
