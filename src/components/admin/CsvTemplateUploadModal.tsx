import React, { useMemo, useRef, useState } from 'react';
import {
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  Check,
} from 'lucide-react';
import {
  AnnouncementSettings,
  ClassRoomRecord,
  GraduationStatus,
  Major,
  StudentRecord,
} from '../../types/graduation';
import { computeAcademicSummary, getDefaultSubjects } from '../../lib/supabase';

interface CsvTemplateUploadModalProps {
  isOpen: boolean;
  mode: 'students' | 'grades';
  students: StudentRecord[];
  classRooms: ClassRoomRecord[];
  settings: AnnouncementSettings;
  onClose: () => void;
  onBulkSaveStudents: (
    records: StudentRecord[]
  ) => Promise<{ addedCount: number; updatedCount: number }>;
}

export function buildDefaultTemplateFilename(prefix: 'template_datasiswa' | 'template_datanilai'): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${prefix}_${dd}-${mm}-${yyyy}_${hh}-${min}`;
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export const CsvTemplateUploadModal: React.FC<CsvTemplateUploadModalProps> = ({
  isOpen,
  mode,
  students,
  classRooms,
  settings,
  onClose,
  onBulkSaveStudents,
}) => {
  const defaultPrefix = mode === 'students' ? 'template_datasiswa' : 'template_datanilai';
  const [templateName, setTemplateName] = useState<string>(() =>
    buildDefaultTemplateFilename(defaultPrefix)
  );
  const [includeExistingRowsInTemplate, setIncludeExistingRowsInTemplate] = useState<boolean>(
    mode === 'grades'
  );
  const [parsedPreview, setParsedPreview] = useState<StudentRecord[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync default template name when mode changes
  React.useEffect(() => {
    if (isOpen) {
      setTemplateName(buildDefaultTemplateFilename(defaultPrefix));
      setIncludeExistingRowsInTemplate(mode === 'grades');
      setParsedPreview([]);
      setParseErrors([]);
      setUploadedFileName('');
      setImportSuccessMsg('');
    }
  }, [isOpen, mode, defaultPrefix]);

  const studentByNisn = useMemo(() => {
    const map = new Map<string, StudentRecord>();
    students.forEach((s) => map.set(s.nisn.trim(), s));
    return map;
  }, [students]);

  if (!isOpen) return null;

  const handleRefreshTimestampName = () => {
    setTemplateName(buildDefaultTemplateFilename(defaultPrefix));
  };

  const handleDownloadTemplate = () => {
    const cleanFileName = (templateName.trim() || buildDefaultTemplateFilename(defaultPrefix))
      .replace(/\.csv$/i, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_');

    let csvLines: string[] = [];

    if (mode === 'students') {
      const headers = [
        'NISN',
        'No_Ujian',
        'Nama_Lengkap',
        'Tempat_Lahir',
        'Tanggal_Lahir',
        'Kelas',
        'Peminatan',
        'Nomor_SKL',
        'Catatan',
      ];
      csvLines.push(headers.join(','));

      if (includeExistingRowsInTemplate && students.length > 0) {
        students.forEach((s) => {
          csvLines.push(
            [
              `"${s.nisn}"`,
              `"${s.examNumber}"`,
              `"${s.fullName}"`,
              `"${s.birthPlace}"`,
              `"${s.birthDate}"`,
              `"${s.className}"`,
              `"${s.major}"`,
              `"${s.sklNumber}"`,
              `"${(s.notes || '').replace(/"/g, '""')}"`,
            ].join(',')
          );
        });
      } else {
        // Sample template rows
        csvLines.push(
          [
            '"0084921091"',
            '"26-01-0145-0009-1"',
            '"Aufa Rasyid Pratama"',
            '"Jakarta"',
            '"2008-04-17"',
            '"XII MIPA 1"',
            '"MIPA"',
            '"421.3/009/SKL-SMAN1/V/2026"',
            '"Memenuhi seluruh kriteria kelulusan satuan pendidikan."',
          ].join(',')
        );
        csvLines.push(
          [
            '"0084921092"',
            '"26-01-0145-0010-9"',
            '"Clara Nathania Putri"',
            '"Bandung"',
            '"2008-09-23"',
            '"XII IPS 1"',
            '"IPS"',
            '"421.3/010/SKL-SMAN1/V/2026"',
            '"Memenuhi seluruh kriteria kelulusan satuan pendidikan."',
          ].join(',')
        );
      }
    } else {
      // mode === 'grades'
      const headers = [
        'NISN',
        'Nama_Lengkap',
        'Kelas',
        'Peminatan',
        'PAI',
        'PKN',
        'BIN',
        'MTK',
        'BIG',
        'FIS_atau_EKO',
        'KIM_atau_SOS',
        'BIO_atau_GEO',
        'Status_Opsional',
      ];
      csvLines.push(headers.join(','));

      if (includeExistingRowsInTemplate && students.length > 0) {
        students.forEach((s) => {
          const scores = s.subjects.map((subj) => subj.score);
          csvLines.push(
            [
              `"${s.nisn}"`,
              `"${s.fullName}"`,
              `"${s.className}"`,
              `"${s.major}"`,
              scores[0] ?? 85,
              scores[1] ?? 85,
              scores[2] ?? 85,
              scores[3] ?? 85,
              scores[4] ?? 85,
              scores[5] ?? 85,
              scores[6] ?? 85,
              scores[7] ?? 85,
              `"${s.status}"`,
            ].join(',')
          );
        });
      } else {
        csvLines.push(
          [
            '"0084921034"',
            '"Nadia Putri Maharani"',
            '"XII MIPA 1"',
            '"MIPA"',
            95,
            92,
            94,
            91,
            93,
            90,
            92,
            93,
            '"LULUS"',
          ].join(',')
        );
        csvLines.push(
          [
            '"0085102948"',
            '"Rizky Pratama Wijaya"',
            '"XII MIPA 1"',
            '"MIPA"',
            88,
            86,
            87,
            85,
            89,
            84,
            85,
            86,
            '"LULUS"',
          ].join(',')
        );
      }
    }

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${cleanFileName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);
    setImportSuccessMsg('');

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const rawLines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (rawLines.length < 2) {
        setParseErrors(['Berkas CSV kosong atau hanya berisi baris header.']);
        setParsedPreview([]);
        return;
      }

      // Detect delimiter (comma vs semicolon)
      const headerLine = rawLines[0];
      const delimiter =
        (headerLine.match(/;/g) || []).length > (headerLine.match(/,/g) || []).length ? ';' : ',';

      const errors: string[] = [];
      const records: StudentRecord[] = [];
      const defaultClass = classRooms[0]?.className || 'XII MIPA 1';

      for (let i = 1; i < rawLines.length; i++) {
        const cols = parseCsvLine(rawLines[i], delimiter).map((c) =>
          c.replace(/^"|"$/g, '').trim()
        );
        if (cols.every((c) => !c)) continue;

        if (mode === 'students') {
          // Columns: NISN, No_Ujian, Nama_Lengkap, Tempat_Lahir, Tanggal_Lahir, Kelas, Peminatan, Nomor_SKL, Catatan
          const [
            nisn,
            examNumber,
            fullName,
            birthPlace,
            birthDate,
            className,
            majorRaw,
            sklNumber,
            notes,
          ] = cols;

          if (!nisn || !fullName) {
            errors.push(`Baris ${i + 1}: Kolom NISN dan Nama_Lengkap wajib diisi.`);
            continue;
          }

          const existing = studentByNisn.get(nisn);
          const rawM = (majorRaw || existing?.major || '').trim().toUpperCase();
          const rawClass = (className || existing?.className || '').trim().toUpperCase();
          const major: Major =
            rawM === 'IPS' || rawClass.includes('IPS')
              ? 'IPS'
              : rawM === 'BHS' || rawM === 'BAHASA' || rawClass.includes('BHS') || rawClass.includes('BAHASA')
                ? 'BHS'
                : rawM === 'UMM' || rawM === 'UMUM' || rawClass.includes('UMM') || rawClass.includes('UMUM')
                  ? 'UMM'
                  : 'MIPA';

          const subjects =
            existing?.subjects && existing.subjects.length > 0
              ? existing.subjects
              : getDefaultSubjects(
                  major,
                  [85, 84, 86, 82, 85, 83, 84, 85],
                  settings.passingGradeKkm
                );
          const summary = computeAcademicSummary(subjects, settings.passingGradeKkm);
          const paddedIdx = String(students.length + records.length + 1).padStart(3, '0');

          records.push({
            id: existing?.id || `std-csv-${Date.now()}-${i}`,
            nisn,
            examNumber: examNumber || existing?.examNumber || `26-01-0145-0${paddedIdx}-1`,
            fullName,
            birthPlace: birthPlace || existing?.birthPlace || 'Jakarta',
            birthDate:
              birthDate && /^\d{4}-\d{2}-\d{2}$/.test(birthDate)
                ? birthDate
                : existing?.birthDate || '2008-06-15',
            className: className || existing?.className || defaultClass,
            major,
            averageScore: existing?.averageScore ?? summary.averageScore,
            status: existing?.status ?? summary.status,
            predicate: existing?.predicate ?? summary.predicate,
            sklNumber:
              sklNumber || existing?.sklNumber || `421.3/${paddedIdx}/SKL-SMAN1/V/2026`,
            subjects,
            notes:
              notes ||
              existing?.notes ||
              'Memenuhi seluruh kriteria kelulusan satuan pendidikan.',
            checkedAt: existing?.checkedAt ?? null,
            checkCount: existing?.checkCount ?? 0,
            updatedAt: new Date().toISOString(),
          });
        } else {
          // mode === 'grades'
          // Columns: NISN, Nama_Lengkap, Kelas, Peminatan, PAI, PKN, BIN, MTK, BIG, Mapel6, Mapel7, Mapel8, Status_Opsional
          const [
            nisn,
            fullName,
            className,
            majorRaw,
            s1,
            s2,
            s3,
            s4,
            s5,
            s6,
            s7,
            s8,
            statusOpt,
          ] = cols;

          if (!nisn) {
            errors.push(`Baris ${i + 1}: Kolom NISN wajib diisi untuk pembaruan nilai.`);
            continue;
          }

          const existing = studentByNisn.get(nisn);
          const rawM = (majorRaw || existing?.major || '').trim().toUpperCase();
          const rawClass = (className || existing?.className || '').trim().toUpperCase();
          const major: Major =
            rawM === 'IPS' || rawClass.includes('IPS')
              ? 'IPS'
              : rawM === 'BHS' || rawM === 'BAHASA' || rawClass.includes('BHS') || rawClass.includes('BAHASA')
                ? 'BHS'
                : rawM === 'UMM' || rawM === 'UMUM' || rawClass.includes('UMM') || rawClass.includes('UMUM')
                  ? 'UMM'
                  : 'MIPA';

          const rawScores = [s1, s2, s3, s4, s5, s6, s7, s8].map((val) => {
            const num = Number(String(val || '0').replace(',', '.'));
            return Number.isNaN(num) ? 80 : Math.max(0, Math.min(100, Math.round(num * 100) / 100));
          });

          const subjects = getDefaultSubjects(major, rawScores, settings.passingGradeKkm);
          const overrideStatus: GraduationStatus | undefined =
            statusOpt?.toUpperCase() === 'LULUS'
              ? 'LULUS'
              : statusOpt?.toUpperCase() === 'TIDAK LULUS'
                ? 'TIDAK LULUS'
                : undefined;

          const summary = computeAcademicSummary(
            subjects,
            settings.passingGradeKkm,
            overrideStatus
          );
          const paddedIdx = String(students.length + records.length + 1).padStart(3, '0');

          records.push({
            id: existing?.id || `std-grd-${Date.now()}-${i}`,
            nisn,
            examNumber: existing?.examNumber || `26-01-0145-0${paddedIdx}-1`,
            fullName: fullName || existing?.fullName || `Siswa NISN ${nisn}`,
            birthPlace: existing?.birthPlace || 'Jakarta',
            birthDate: existing?.birthDate || '2008-06-15',
            className: className || existing?.className || defaultClass,
            major,
            averageScore: summary.averageScore,
            status: summary.status,
            predicate: summary.predicate,
            sklNumber: existing?.sklNumber || `421.3/${paddedIdx}/SKL-SMAN1/V/2026`,
            subjects,
            notes:
              existing?.notes || 'Memenuhi seluruh kriteria kelulusan satuan pendidikan.',
            checkedAt: existing?.checkedAt ?? null,
            checkCount: existing?.checkCount ?? 0,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      setParseErrors(errors);
      setParsedPreview(records);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmImport = async () => {
    if (parsedPreview.length === 0) return;
    setIsImporting(true);
    try {
      const res = await onBulkSaveStudents(parsedPreview);
      setImportSuccessMsg(
        `Berhasil mengimpor ${parsedPreview.length} baris data (${res.addedCount} data baru ditambahkan, ${res.updatedCount} data siswa diperbarui).`
      );
      setParsedPreview([]);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-palette-text/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-palette-accent rounded-xl w-full max-w-4xl overflow-hidden my-8 shadow-xl">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-palette-accent flex items-center justify-between bg-palette-background">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-palette-accent/70 text-palette-primary">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-palette-text">
                {mode === 'students'
                  ? 'Unduh Template & Upload CSV Data Siswa'
                  : 'Unduh Template & Upload CSV Data Nilai Ujian'}
              </h3>
              <p className="text-xs text-palette-text/70">
                {mode === 'students'
                  ? 'Atur nama file template CSV dari aplikasi, unduh template, lalu unggah file CSV untuk impor data siswa massal'
                  : 'Atur nama file template CSV nilai, unduh template 8 mata pelajaran, lalu unggah kembali untuk kalkulasi kelulusan otomatis'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-palette-text/70 hover:text-palette-text rounded-lg hover:bg-palette-accent/50 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[82vh] overflow-y-auto">
          {/* Step 1: Customize Template Name & Download CSV Template */}
          <div className="p-4 rounded-xl bg-palette-background border border-palette-accent space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-palette-primary">
                  Langkah 1 · Unduh Template CSV
                </span>
                <h4 className="text-sm font-semibold text-palette-text mt-0.5">
                  Tentukan Nama Berkas Template CSV
                </h4>
              </div>
              <button
                type="button"
                onClick={handleRefreshTimestampName}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-palette-primary hover:underline cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Perbarui Tanggal & Jam Otomatis</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-8">
                <label className="block text-xs font-medium text-palette-text mb-1">
                  Nama File Template CSV (Format: {defaultPrefix}_tgl-bulan-tahun_jam)
                </label>
                <div className="flex items-center">
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder={buildDefaultTemplateFilename(defaultPrefix)}
                    className="w-full px-3.5 py-2 text-xs font-mono tabular-nums bg-white border border-palette-accent rounded-l-lg focus:outline-none focus:border-palette-primary text-palette-text"
                  />
                  <span className="px-3 py-2 text-xs font-mono font-semibold bg-palette-accent/60 border border-l-0 border-palette-accent rounded-r-lg text-palette-text">
                    .csv
                  </span>
                </div>
              </div>

              <div className="md:col-span-4">
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-palette-primary rounded-lg hover:bg-palette-text transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Template CSV</span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
              <label className="inline-flex items-center gap-2 cursor-pointer text-palette-text/85">
                <input
                  type="checkbox"
                  checked={includeExistingRowsInTemplate}
                  onChange={(e) => setIncludeExistingRowsInTemplate(e.target.checked)}
                  className="w-3.5 h-3.5 accent-palette-primary rounded cursor-pointer"
                />
                <span>
                  Sertakan {students.length} data siswa saat ini di dalam template agar mudah
                  diedit
                </span>
              </label>
              <span className="text-[11px] font-mono text-palette-text/65">
                Hasil unduhan: {templateName.replace(/\.csv$/i, '')}.csv
              </span>
            </div>
          </div>

          {/* Step 2: Upload CSV File */}
          <div className="p-4 rounded-xl bg-white border border-palette-accent space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-palette-primary">
                  Langkah 2 · Unggah File CSV
                </span>
                <h4 className="text-sm font-semibold text-palette-text mt-0.5">
                  {mode === 'students'
                    ? 'Pilih File CSV Data Siswa untuk Diimpor'
                    : 'Pilih File CSV Data Nilai untuk Diimpor'}
                </h4>
                <p className="text-xs text-palette-text/70">
                  Mendukung pemisah koma (<code className="font-mono">,</code>) maupun titik koma (
                  <code className="font-mono">;</code>) dari Microsoft Excel / Google Sheets.
                </p>
              </div>

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-palette-text bg-palette-accent/70 border border-palette-primary/30 rounded-lg hover:bg-palette-accent transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-palette-primary" />
                  <span>Pilih Berkas CSV dari Komputer</span>
                </button>
              </div>
            </div>

            {uploadedFileName && (
              <div className="text-xs font-mono text-palette-text/80 bg-palette-background px-3 py-2 rounded-lg border border-palette-accent flex items-center justify-between">
                <span>Berkas dipilih: {uploadedFileName}</span>
                <span className="font-semibold text-palette-primary">
                  {parsedPreview.length} baris siap diimpor
                </span>
              </div>
            )}

            {parseErrors.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Peringatan Validasi Baris CSV:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  {parseErrors.slice(0, 5).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {importSuccessMsg && (
              <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="font-semibold">{importSuccessMsg}</span>
              </div>
            )}

            {/* Preview Table with Autoincrement No */}
            {parsedPreview.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-palette-text">
                    Pratinjau Data yang Akan Diimpor ({parsedPreview.length} Siswa)
                  </span>
                  <span className="text-palette-text/65">
                    NISN yang sudah ada akan diperbarui otomatis (Upsert)
                  </span>
                </div>

                <div className="overflow-x-auto border border-palette-accent rounded-lg max-h-60">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-palette-accent/45 border-b border-palette-accent font-semibold text-palette-text">
                        <th className="py-2 px-3 w-12 text-center">No</th>
                        <th className="py-2 px-3">NISN</th>
                        <th className="py-2 px-3">Nama Lengkap</th>
                        <th className="py-2 px-3">Kelas</th>
                        <th className="py-2 px-3 text-right">Rata-Rata</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3">Mode</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-palette-accent/60">
                      {parsedPreview.map((item, idx) => {
                        const isUpdate = studentByNisn.has(item.nisn.trim());
                        return (
                          <tr key={item.nisn + idx} className="bg-white">
                            <td className="py-2 px-3 text-center font-mono tabular-nums font-semibold text-palette-text/70">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-3 font-mono tabular-nums font-semibold text-palette-text">
                              {item.nisn}
                            </td>
                            <td className="py-2 px-3 font-medium text-palette-text">
                              {item.fullName}
                            </td>
                            <td className="py-2 px-3 text-palette-text/80">
                              {item.className} ({item.major})
                            </td>
                            <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-palette-primary">
                              {item.averageScore.toFixed(2)}
                            </td>
                            <td className="py-2 px-3 font-mono">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                  item.status === 'LULUS'
                                    ? 'bg-emerald-50 text-emerald-800'
                                    : 'bg-rose-50 text-rose-800'
                                }`}
                              >
                                {item.status}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono text-[11px]">
                              {isUpdate ? (
                                <span className="text-amber-800 font-semibold">Perbarui</span>
                              ) : (
                                <span className="text-emerald-800 font-semibold">Siswa Baru</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="pt-2 border-t border-palette-accent flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-palette-text bg-palette-background border border-palette-accent rounded-lg hover:bg-palette-accent/50 cursor-pointer"
            >
              Tutup
            </button>
            {parsedPreview.length > 0 && (
              <button
                type="button"
                disabled={isImporting}
                onClick={handleConfirmImport}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-palette-primary rounded-lg hover:bg-palette-text cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>
                  {isImporting
                    ? 'Menyimpan Data CSV...'
                    : `Simpan & Impor ${parsedPreview.length} Data ke Database`}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
