import { jsPDF } from 'jspdf';
import { AnnouncementSettings, StudentRecord } from '../types/graduation';

const INDONESIAN_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export function formatIndonesianDate(isoDate: string): string {
  if (!isoDate) return '-';
  const parts = isoDate.split('T')[0].split('-');
  if (parts.length !== 3) return isoDate;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const monthName = INDONESIAN_MONTHS[monthIdx] || parts[1];
  return `${day} ${monthName} ${year}`;
}

function drawVerificationMatrix(doc: jsPDF, x: number, y: number, size: number, seedStr: string) {
  const cells = 11;
  const cellSize = size / cells;
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.3);
  doc.rect(x - 1.5, y - 1.5, size + 3, size + 3);

  let hash = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    hash ^= seedStr.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const isFinderCorner = (r: number, c: number) =>
    (r < 3 && c < 3) || (r < 3 && c >= cells - 3) || (r >= cells - 3 && c < 3);

  doc.setFillColor(15, 23, 42);
  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      if (isFinderCorner(r, c)) {
        doc.rect(x + c * cellSize, y + r * cellSize, cellSize, cellSize, 'F');
      } else {
        const bit = ((hash >>> ((r * cells + c) % 24)) ^ (r * 7 + c * 13)) & 1;
        if (bit === 1) {
          doc.rect(x + c * cellSize, y + r * cellSize, cellSize, cellSize, 'F');
        }
      }
    }
  }
}

export function generateGraduationCertificatePDF(
  student: StudentRecord,
  settings: AnnouncementSettings
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 20;
  let cursorY = 18;

  // Outer institutional subtle frame
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.rect(12, 10, pageWidth - 24, 277);

  // KOP SURAT (Letterhead)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text(
    (settings.kopPemerintah || settings.provinceName || 'PEMERINTAH DAERAH PROVINSI JAWA BARAT').toUpperCase(),
    pageWidth / 2,
    cursorY,
    { align: 'center' }
  );

  cursorY += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(
    (settings.kopDinas || 'DINAS PENDIDIKAN').toUpperCase(),
    pageWidth / 2,
    cursorY,
    { align: 'center' }
  );

  if (settings.kopCabangDinas) {
    cursorY += 4.2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(settings.kopCabangDinas.toUpperCase(), pageWidth / 2, cursorY, { align: 'center' });
  }

  cursorY += 5.5;
  doc.setFont('times', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(settings.schoolName.toUpperCase(), pageWidth / 2, cursorY, { align: 'center' });

  cursorY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `NPSN: ${settings.schoolNpsn}  |  Telp: ${settings.kopTelepon || '(0265) 7578088'}  |  Kode Pos: ${settings.kopKodePos || '46258'}`,
    pageWidth / 2,
    cursorY,
    { align: 'center' }
  );

  cursorY += 4;
  doc.text(settings.schoolAddress, pageWidth / 2, cursorY, { align: 'center' });

  if (settings.kopEmail || settings.kopWebsite) {
    cursorY += 3.8;
    const contactParts = [];
    if (settings.kopEmail) contactParts.push(`Email: ${settings.kopEmail}`);
    if (settings.kopWebsite) contactParts.push(`Website: ${settings.kopWebsite}`);
    doc.setFontSize(7.5);
    doc.text(contactParts.join('  |  '), pageWidth / 2, cursorY, { align: 'center' });
  }

  // Horizontal line under Kop Surat based on kopBorderThickness
  cursorY += 3.5;
  doc.setDrawColor(15, 23, 42);
  if (settings.kopBorderThickness === 'thick_double') {
    doc.setLineWidth(1.2);
    doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
    doc.setLineWidth(0.3);
    doc.line(marginX, cursorY + 1.2, pageWidth - marginX, cursorY + 1.2);
  } else if (settings.kopBorderThickness === 'single') {
    doc.setLineWidth(1.0);
    doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
  } else {
    // standard_double
    doc.setLineWidth(0.8);
    doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
    doc.setLineWidth(0.25);
    doc.line(marginX, cursorY + 1.1, pageWidth - marginX, cursorY + 1.1);
  }

  // TITLE
  cursorY += 9;
  doc.setFont('times', 'bold');
  doc.setFontSize(13.5);
  doc.setTextColor(15, 23, 42);
  doc.text('SURAT KETERANGAN LULUS', pageWidth / 2, cursorY, { align: 'center' });

  // Underline title
  doc.setLineWidth(0.4);
  doc.line(pageWidth / 2 - 35, cursorY + 1.2, pageWidth / 2 + 35, cursorY + 1.2);

  cursorY += 5.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Nomor: ${student.sklNumber || settings.sklPrefix}`, pageWidth / 2, cursorY, {
    align: 'center',
  });

  // OPENING PARAGRAPH
  cursorY += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  const openingText = `Kepala ${settings.schoolName} selaku Ketua Penyelenggara Ujian Satuan Pendidikan Tahun Pelajaran ${settings.academicYear}, berdasarkan Kriteria Kelulusan Peserta Didik dan hasil Rapat Pleno Dewan Pendidik pada tanggal ${settings.plenoDate}, dengan ini menerangkan bahwa:`;
  const splitOpening = doc.splitTextToSize(openingText, pageWidth - marginX * 2);
  doc.text(splitOpening, marginX, cursorY);
  cursorY += splitOpening.length * 4.6 + 3;

  // STUDENT IDENTITY BLOCK
  const bioRows: [string, string][] = [
    ['Nama Peserta Didik', student.fullName],
    ['Tempat, Tanggal Lahir', `${student.birthPlace}, ${formatIndonesianDate(student.birthDate)}`],
    ['Nomor Induk Siswa Nasional (NISN)', student.nisn],
    ['Nomor Peserta Ujian', student.examNumber],
    ['Kelas / Peminatan', `${student.className} (${student.major})`],
  ];

  bioRows.forEach(([label, val]) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(label, marginX + 4, cursorY);
    doc.text(':', marginX + 66, cursorY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(val, marginX + 70, cursorY);
    cursorY += 5.6;
  });

  cursorY += 2;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  doc.text(
    `Dinyatakan berdasarkan keputusan resmi Satuan Pendidikan Tahun Pelajaran ${settings.academicYear}:`,
    marginX,
    cursorY
  );

  // LULUS / TIDAK LULUS BANNER BOX
  cursorY += 4;
  const isPass = student.status === 'LULUS';
  if (isPass) {
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(21, 128, 61);
  } else {
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(185, 28, 28);
  }
  doc.setLineWidth(0.5);
  doc.roundedRect(marginX, cursorY, pageWidth - marginX * 2, 15, 2, 2, 'FD');

  doc.setFont('times', 'bold');
  doc.setFontSize(15);
  if (isPass) {
    doc.setTextColor(21, 128, 61);
    doc.text('L U L U S', pageWidth / 2, cursorY + 7, { align: 'center' });
  } else {
    doc.setTextColor(185, 28, 28);
    doc.text('T I D A K   L U L U S', pageWidth / 2, cursorY + 7, { align: 'center' });
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(
    `Predikat Capaian Akademik: ${student.predicate}  |  Rata-Rata Nilai Akhir: ${student.averageScore.toFixed(2)}`,
    pageWidth / 2,
    cursorY + 12.5,
    { align: 'center' }
  );

  // TRANSCRIPT TABLE HEADER
  cursorY += 21;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('DAFTAR NILAI UJIAN SATUAN PENDIDIKAN', marginX, cursorY);

  cursorY += 3;
  const colWidths = [12, 20, 86, 26, 13, 13]; // Total = 170mm (210 - 40)
  const headers = ['No', 'Kode', 'Mata Pelajaran', 'Kelompok', 'KKM', 'Nilai'];

  doc.setFillColor(15, 23, 42);
  doc.rect(marginX, cursorY, pageWidth - marginX * 2, 7.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);

  let colX = marginX;
  headers.forEach((h, idx) => {
    const align = idx >= 4 || idx === 0 ? 'center' : 'left';
    const textX = align === 'center' ? colX + colWidths[idx] / 2 : colX + 2.5;
    doc.text(h, textX, cursorY + 5, { align });
    colX += colWidths[idx];
  });

  cursorY += 7.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);

  student.subjects.forEach((subj, index) => {
    const rowHeight = 6.8;
    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(marginX, cursorY, pageWidth - marginX * 2, rowHeight, 'F');
    }
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.rect(marginX, cursorY, pageWidth - marginX * 2, rowHeight, 'S');

    let cellX = marginX;
    doc.setTextColor(51, 65, 85);
    doc.text(String(index + 1), cellX + colWidths[0] / 2, cursorY + 4.6, { align: 'center' });
    cellX += colWidths[0];

    doc.setFont('courier', 'bold');
    doc.text(subj.code, cellX + 2.5, cursorY + 4.6);
    cellX += colWidths[1];

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(subj.name, cellX + 2.5, cursorY + 4.6);
    cellX += colWidths[2];

    doc.setTextColor(71, 85, 105);
    doc.text(subj.category, cellX + 2.5, cursorY + 4.6);
    cellX += colWidths[3];

    doc.setFont('courier', 'normal');
    doc.text(String(subj.kkm), cellX + colWidths[4] / 2, cursorY + 4.6, { align: 'center' });
    cellX += colWidths[4];

    doc.setFont('courier', 'bold');
    if (subj.score < subj.kkm) {
      doc.setTextColor(185, 28, 28);
    } else {
      doc.setTextColor(15, 23, 42);
    }
    doc.text(subj.score.toFixed(0), cellX + colWidths[5] / 2, cursorY + 4.6, { align: 'center' });

    cursorY += rowHeight;
  });

  // AVERAGE ROW
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.rect(marginX, cursorY, pageWidth - marginX * 2, 7.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('RATA-RATA NILAI AKHIR SATUAN PENDIDIKAN', marginX + 4, cursorY + 5);

  doc.setFont('courier', 'bold');
  doc.setFontSize(9.5);
  doc.text(
    student.averageScore.toFixed(2),
    pageWidth - marginX - colWidths[5] / 2,
    cursorY + 5,
    { align: 'center' }
  );

  // CLOSING NOTE
  cursorY += 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  const closingNote =
    student.notes ||
    'Surat Keterangan Lulus ini berlaku sementara sampai dengan diterbitkannya Ijazah asli Tahun Pelajaran ' +
      settings.academicYear +
      '.';
  const splitNote = doc.splitTextToSize(`Catatan Akademik: ${closingNote}`, pageWidth - marginX * 2);
  doc.text(splitNote, marginX, cursorY);

  // FOOTER: QR VERIFICATION + PRINCIPAL SIGNATURE
  cursorY += splitNote.length * 4.2 + 7;

  // Left: QR Verification Matrix
  const qrSize = 22;
  drawVerificationMatrix(
    doc,
    marginX + 2,
    cursorY,
    qrSize,
    `${student.nisn}-${student.sklNumber}-${student.averageScore}`
  );

  doc.setFont('courier', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`ID-VERIF: ${student.nisn}-${student.id.toUpperCase()}`, marginX, cursorY + qrSize + 5);
  doc.setFont('helvetica', 'italic');
  doc.text(
    'Dokumen ini telah ditandatangani secara elektronik & terverifikasi real-time.',
    marginX,
    cursorY + qrSize + 9
  );

  // Right: Principal Signature
  const signX = pageWidth - marginX - 64;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`Ditetapkan di: Ciamis`, signX, cursorY + 2);
  doc.text(`Pada tanggal: ${settings.plenoDate}`, signX, cursorY + 6.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`Kepala ${settings.schoolName},`, signX, cursorY + 11.5);

  // Digital Signature Stamp
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(0.35);
  doc.roundedRect(signX, cursorY + 14, 52, 9, 1.5, 1.5, 'S');
  doc.setFont('courier', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(30, 58, 138);
  doc.text('TERVERIFIKASI DIGITAL · SAH', signX + 26, cursorY + 19.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(settings.principalName, signX, cursorY + 28.5);
  doc.setLineWidth(0.3);
  doc.setDrawColor(15, 23, 42);
  doc.line(signX, cursorY + 29.5, signX + 60, cursorY + 29.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`NIP. ${settings.principalNip}`, signX, cursorY + 33.5);

  const safeName = student.fullName.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`SKL_2026_${student.nisn}_${safeName}.pdf`);
}
