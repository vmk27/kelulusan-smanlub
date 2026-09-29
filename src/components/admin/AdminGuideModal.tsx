import React, { useState } from 'react';
import {
  X,
  HelpCircle,
  Building2,
  Users,
  FileSpreadsheet,
  GraduationCap,
  Settings,
  Database,
  CheckCircle2,
  ArrowRight,
  KeyRound,
} from 'lucide-react';

export type GuideTopicKey = 'classes' | 'students' | 'grades' | 'alumni' | 'settings_supabase';

interface AdminGuideModalProps {
  isOpen: boolean;
  initialTopic?: GuideTopicKey;
  onClose: () => void;
}

export const AdminGuideModal: React.FC<AdminGuideModalProps> = ({
  isOpen,
  initialTopic = 'classes',
  onClose,
}) => {
  const [activeTopic, setActiveTopic] = useState<GuideTopicKey>(initialTopic);

  React.useEffect(() => {
    if (isOpen && initialTopic) {
      setActiveTopic(initialTopic);
    }
  }, [isOpen, initialTopic]);

  if (!isOpen) return null;

  const topics: { key: GuideTopicKey; label: string; icon: React.ReactNode }[] = [
    {
      key: 'classes',
      label: '1. Data Kelas Baru',
      icon: <Building2 className="w-3.5 h-3.5" />,
    },
    {
      key: 'students',
      label: '2. Data Siswa & CSV',
      icon: <Users className="w-3.5 h-3.5" />,
    },
    {
      key: 'grades',
      label: '3. Data Nilai & KKM',
      icon: <FileSpreadsheet className="w-3.5 h-3.5" />,
    },
    {
      key: 'alumni',
      label: '4. Data Alumni',
      icon: <GraduationCap className="w-3.5 h-3.5" />,
    },
    {
      key: 'settings_supabase',
      label: '5. Manajemen User & Pengaturan',
      icon: <Settings className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-palette-text/55 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-palette-accent rounded-xl w-full max-w-4xl overflow-hidden shadow-xl my-6">
        {/* Header */}
        <div className="px-6 py-4 border-b border-palette-accent flex items-center justify-between bg-palette-background">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-palette-accent/70 text-palette-primary">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-palette-text">
                Pusat Panduan Pengisian & Penjelasan Data Aplikasi (User Guide)
              </h3>
              <p className="text-xs text-palette-text/70">
                Petunjuk lengkap kolom yang wajib diisi beserta langkah-langkah penyimpanan ke
                database Supabase
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

        {/* Topic Tabs */}
        <div className="px-6 pt-3 bg-palette-background/60 border-b border-palette-accent flex flex-wrap gap-1.5">
          {topics.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTopic(t.key)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors cursor-pointer ${
                activeTopic === t.key
                  ? 'border-palette-primary text-palette-primary bg-white'
                  : 'border-transparent text-palette-text/75 hover:text-palette-text hover:bg-white/50'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-6 max-h-[72vh] overflow-y-auto space-y-5 text-xs leading-relaxed">
          {activeTopic === 'classes' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-palette-accent/35 border border-palette-accent">
                <h4 className="text-sm font-bold text-palette-text">
                  Panduan Menu: 1. Data Kelas & Wali Kelas
                </h4>
                <p className="text-palette-text/80 mt-1">
                  Menu ini berfungsi untuk mendaftarkan rombongan belajar (kelas XII), menentukan
                  peminatan jurusan (MIPA/IPS), serta mencatat Wali Kelas yang bertanggung jawab.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-palette-background border border-palette-accent space-y-3">
                  <h5 className="font-bold text-palette-text flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-palette-primary" />
                    <span>A. Apa Saja yang Harus Diisi?</span>
                  </h5>
                  <ul className="space-y-2 text-palette-text/85">
                    <li>
                      <strong>1. Nama Kelas (Wajib & Unik):</strong> Contoh:{' '}
                      <code className="font-mono">XII MIPA 1</code>,{' '}
                      <code className="font-mono">XII IPS 2</code>, atau{' '}
                      <code className="font-mono">XII-5</code>. Digunakan untuk mengelompokkan siswa
                      secara otomatis.
                    </li>
                    <li>
                      <strong>2. Peminatan Jurusan (Wajib):</strong> Pilih{' '}
                      <code className="font-mono">MIPA</code> atau{' '}
                      <code className="font-mono">IPS</code>. Pilihan ini menentukan mata pelajaran
                      peminatan siswa.
                    </li>
                    <li>
                      <strong>3. Nama Lengkap Wali Kelas & Gelar (Wajib):</strong> Contoh:{' '}
                      <em>Dra. Hj. Ratna Sari, M.Pd.</em>
                    </li>
                    <li>
                      <strong>4. NIP Wali Kelas (Opsional):</strong> 18 digit NIP guru wali kelas
                      (atau tanda <code className="font-mono">-</code> jika belum tersedia).
                    </li>
                    <li>
                      <strong>5. Ruang / Lokasi Kelas (Opsional):</strong> Contoh:{' '}
                      <em>Gedung A · R.301</em>.
                    </li>
                    <li>
                      <strong>6. Tahun Ajaran Aktif (Wajib):</strong> Contoh:{' '}
                      <code className="font-mono">2025/2026</code> atau{' '}
                      <code className="font-mono">2026/2027</code>.
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-palette-background border border-palette-accent space-y-3">
                  <h5 className="font-bold text-palette-text flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-palette-primary" />
                    <span>B. Langkah-Langkah Menyimpan Data Kelas</span>
                  </h5>
                  <ol className="space-y-2 text-palette-text/85 list-decimal list-inside">
                    <li>
                      Buka menu <strong>Data & Nilai Siswa</strong> pada sidebar kiri, lalu pastikan
                      tab <strong>1. Data Kelas & Wali Kelas</strong> aktif.
                    </li>
                    <li>
                      Klik tombol <strong>&ldquo;+ Tambah Kelas Baru&rdquo;</strong> di sebelah
                      kanan atas tabel.
                    </li>
                    <li>
                      Isi seluruh kolom pada jendela <em>Formulir Kelas & Wali Kelas</em>.
                    </li>
                    <li>
                      Klik tombol <strong>&ldquo;Simpan Data Kelas&rdquo;</strong> di kanan bawah
                      formulir.
                    </li>
                    <li>
                      Sistem otomatis menyimpan data dan memperbarui tabel{' '}
                      <code className="font-mono">public.class_rooms</code> di{' '}
                      <strong>Supabase</strong>. Notifikasi hijau akan muncul sebagai tanda data
                      telah terupdate di cloud.
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {activeTopic === 'students' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-palette-accent/35 border border-palette-accent">
                <h4 className="text-sm font-bold text-palette-text">
                  Panduan Menu: 2. Data Siswa, Impor CSV & Pindahkan ke Alumni (Tabel:
                  public.students)
                </h4>
                <p className="text-palette-text/80 mt-1">
                  Menu ini mengelola identitas peserta didik kelas akhir yang digunakan untuk
                  verifikasi kelulusan pada Portal Siswa.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-palette-background border border-palette-accent space-y-3">
                  <h5 className="font-bold text-palette-text flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-palette-primary" />
                    <span>A. Apa Saja yang Harus Diisi?</span>
                  </h5>
                  <ul className="space-y-2 text-palette-text/85">
                    <li>
                      <strong>1. NISN (10 Digit Unik - Wajib):</strong> Kredensial utama siswa saat
                      mengecek kelulusan di halaman depan (contoh:{' '}
                      <code className="font-mono">0084921034</code>).
                    </li>
                    <li>
                      <strong>2. Tanggal Lahir (Format YYYY-MM-DD - Wajib):</strong> Kunci
                      verifikasi kedua saat siswa login (contoh:{' '}
                      <code className="font-mono">2008-05-14</code>).
                    </li>
                    <li>
                      <strong>3. Nama Lengkap & Tempat Lahir (Wajib):</strong> Dicetak langsung pada
                      dokumen Surat Keterangan Lulus (SKL).
                    </li>
                    <li>
                      <strong>4. Nomor Peserta Ujian & Nomor SKL:</strong> Nomor resmi peserta ujian
                      sekolah dan nomor surat SKL (contoh:{' '}
                      <code className="font-mono">421.3/001/SKL-SMAN1/V/2026</code>).
                    </li>
                    <li>
                      <strong>5. Kelas & Peminatan:</strong> Pilih kelas yang sesuai dari daftar
                      Data Kelas (<code className="font-mono">MIPA</code> /{' '}
                      <code className="font-mono">IPS</code>).
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-palette-background border border-palette-accent space-y-3">
                  <h5 className="font-bold text-palette-text flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-palette-primary" />
                    <span>B. Langkah Menyimpan Manual, Upload CSV & Bulk Alumni</span>
                  </h5>
                  <ol className="space-y-2 text-palette-text/85 list-decimal list-inside">
                    <li>
                      <strong>Input Manual:</strong> Klik <strong>&ldquo;+ Tambah Siswa&rdquo;</strong>,
                      isi biodata pada bagian atas formulir, lalu klik{' '}
                      <strong>&ldquo;Simpan Perubahan&rdquo;</strong>.
                    </li>
                    <li>
                      <strong>Upload CSV Massal:</strong> Klik{' '}
                      <strong>&ldquo;Upload / Template CSV Siswa&rdquo;</strong>, atur nama file
                      template sesuai keinginan, klik <strong>Unduh Template</strong>, isi di Excel,
                      lalu unggah kembali dan klik <strong>Proses & Simpan</strong>.
                    </li>
                    <li>
                      <strong>Pindahkan ke Alumni (Bulk Move):</strong> Centang kotak di sebelah
                      kiri nama siswa (atau klik <em>Pilih Siswa Lulus</em>), lalu klik tombol{' '}
                      <strong>&ldquo;Pindahkan Terpilih ke Alumni&rdquo;</strong>.
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {activeTopic === 'grades' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-palette-accent/35 border border-palette-accent">
                <h4 className="text-sm font-bold text-palette-text">
                  Panduan Menu: 3. Data Nilai & Kelulusan Siswa
                </h4>
                <p className="text-palette-text/80 mt-1">
                  Mengelola transkrip nilai 8 mata pelajaran ujian satuan pendidikan serta penentuan
                  otomatis Rata-Rata, Predikat, dan Keputusan Kelulusan.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-palette-background border border-palette-accent space-y-3">
                  <h5 className="font-bold text-palette-text flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-palette-primary" />
                    <span>A. Penjelasan Komponen Nilai & Predikat</span>
                  </h5>
                  <ul className="space-y-2 text-palette-text/85">
                    <li>
                      <strong>8 Mata Pelajaran Ujian (Skala 0 – 100):</strong> Meliputi 6 mapel umum
                      (<code className="font-mono">PAI, PKN, BIN, MTK, BING, SEJ</code>) dan 2 mapel
                      peminatan (<code className="font-mono">PEM1, PEM2</code>: Fisika/Kimia untuk
                      MIPA atau Ekonomi/Sosiologi untuk IPS).
                    </li>
                    <li>
                      <strong>Perhitungan Otomatis terhadap KKM:</strong> Jika nilai rata-rata{' '}
                      <code className="font-mono">&ge; KKM</code>, status otomatis{' '}
                      <strong className="text-emerald-800">LULUS</strong>. Jika di bawah KKM,
                      otomatis <strong className="text-rose-800">TIDAK LULUS</strong>.
                    </li>
                    <li>
                      <strong>Aturan Predikat Kelulusan:</strong>
                      <br />• <code className="font-mono">&ge; 90,00</code>: Dengan Pujian
                      <br />• <code className="font-mono">82,00 – 89,99</code>: Sangat Memuaskan
                      <br />• <code className="font-mono">KKM – 81,99</code>: Memuaskan
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-palette-background border border-palette-accent space-y-3">
                  <h5 className="font-bold text-palette-text flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-palette-primary" />
                    <span>B. Langkah-Langkah Mengisi & Menyimpan Nilai</span>
                  </h5>
                  <ol className="space-y-2 text-palette-text/85 list-decimal list-inside">
                    <li>
                      Buka menu <strong>Data & Nilai Siswa</strong> lalu pilih sub-menu{' '}
                      <strong>3. Data Nilai & Kelulusan</strong>.
                    </li>
                    <li>
                      <strong>Cara 1 (Per Siswa):</strong> Klik tombol{' '}
                      <strong>&ldquo;Input / Edit Nilai&rdquo;</strong> pada baris siswa, masukkan
                      nilai 0–100 pada ke-8 mata pelajaran, lalu klik{' '}
                      <strong>&ldquo;Simpan Perubahan&rdquo;</strong>.
                    </li>
                    <li>
                      <strong>Cara 2 (Upload CSV Nilai):</strong> Klik tombol{' '}
                      <strong>&ldquo;Unduh Template / Upload CSV Data Nilai&rdquo;</strong>, unduh
                      template berisi daftar NISN siswa saat ini, isi kolom nilai{' '}
                      <code className="font-mono">PAI</code> s.d.{' '}
                      <code className="font-mono">PEM2</code>, lalu unggah kembali.
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {activeTopic === 'alumni' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-palette-accent/35 border border-palette-accent">
                <h4 className="text-sm font-bold text-palette-text">
                  Panduan Menu: Data Alumni & Tracer Study (Tabel: public.alumni)
                </h4>
                <p className="text-palette-text/80 mt-1">
                  Menyimpan arsip siswa yang telah dinyatakan lulus beserta pelacakan jejak lulusan
                  (perguruan tinggi, sekolah kedinasan, atau dunia kerja).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-palette-background border border-palette-accent space-y-2.5">
                  <h5 className="font-bold text-palette-text">A. Apa Saja yang Diisi di Data Alumni?</h5>
                  <ul className="space-y-2 text-palette-text/85">
                    <li>
                      <strong>Tahun Kelulusan / Angkatan:</strong> Contoh:{' '}
                      <code className="font-mono">2024/2025</code> atau{' '}
                      <code className="font-mono">2025/2026</code>.
                    </li>
                    <li>
                      <strong>Status Kelanjutan Studi / Karier:</strong> Pilih salah satu dari{' '}
                      <code className="font-mono">PTN / PTS</code>,{' '}
                      <code className="font-mono">Kedinasan / TNI-Polri</code>,{' '}
                      <code className="font-mono">Bekerja / Wirausaha</code>, atau{' '}
                      <code className="font-mono">Belum Terdata</code>.
                    </li>
                    <li>
                      <strong>Nama Kampus / Instansi / Perusahaan:</strong> Contoh:{' '}
                      <em>Universitas Indonesia — Ilmu Komputer</em>.
                    </li>
                    <li>
                      <strong>Kontak WhatsApp / Telepon:</strong> Nomor aktif alumni untuk keperluan
                      komunikasi sekolah.
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-palette-background border border-palette-accent space-y-2.5">
                  <h5 className="font-bold text-palette-text">B. Langkah Menyimpan Data Alumni</h5>
                  <ol className="space-y-2 text-palette-text/85 list-decimal list-inside">
                    <li>
                      Klik tombol <strong>&ldquo;+ Tambah Alumni&rdquo;</strong> atau klik ikon{' '}
                      <strong>Edit</strong> pada baris alumni yang sudah dipindahkan dari Data
                      Siswa.
                    </li>
                    <li>
                      Isi informasi Tracer Study (Jalur Lanjutan, Nama Kampus/Instansi, dan Nomor
                      Telepon).
                    </li>
                    <li>
                      Klik tombol <strong>&ldquo;Simpan Data Alumni&rdquo;</strong> untuk memperbarui
                      tabel <code className="font-mono">public.alumni</code> di Supabase.
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {activeTopic === 'settings_supabase' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-palette-accent/35 border border-palette-accent">
                <h4 className="text-sm font-bold text-palette-text">
                  Panduan Menu: 5. Manajemen User (Admin, Guru, Wali Kelas) & Pengaturan Pengumuman
                </h4>
                <p className="text-palette-text/80 mt-1">
                  Mengatur hak akses pengguna sistem (Admin, Guru, Wali Kelas), jadwal pembukaan
                  portal pengumuman (Countdown Timer), serta parameter pejabat penandatangan SKL.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-palette-background border border-palette-accent space-y-2.5">
                  <h5 className="font-bold text-palette-text flex items-center gap-2">
                    <Users className="w-4 h-4 text-palette-primary" />
                    <span>A. Manajemen User & Role (Admin, Guru, Wali Kelas)</span>
                  </h5>
                  <ul className="space-y-2 text-palette-text/85">
                    <li>
                      <strong>Pilihan Role:</strong> Pilih{' '}
                      <code className="font-mono">Admin</code> (Operator Kurikulum),{' '}
                      <code className="font-mono">Wali Kelas</code>, atau{' '}
                      <code className="font-mono">Guru</code>.
                    </li>
                    <li>
                      <strong>Data yang Diisi:</strong> Nama Lengkap & Gelar, NIP, Username Login,
                      Kode Akses / Password Login, serta Kelas Binaan atau Mata Pelajaran.
                    </li>
                    <li>
                      <strong>Langkah Menyimpan:</strong> Klik tombol{' '}
                      <strong>&ldquo;+ Tambah User Baru&rdquo;</strong> pada menu{' '}
                      <em>Manajemen User</em>, isi formulir, lalu klik{' '}
                      <strong>&ldquo;Simpan User&rdquo;</strong>.
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-palette-background border border-palette-accent space-y-2.5">
                  <h5 className="font-bold text-palette-text flex items-center gap-2">
                    <Settings className="w-4 h-4 text-palette-primary" />
                    <span>B. Pengaturan Jadwal & Identitas SKL</span>
                  </h5>
                  <ul className="space-y-2 text-palette-text/85">
                    <li>
                      <strong>Status Portal (DIBUKA / DITUTUP):</strong> Saat dikunci, halaman depan
                      menampilkan <em>Countdown Timer</em> dan menahan pengecekan NISN hingga waktu
                      habis.
                    </li>
                    <li>
                      <strong>Batas KKM & Identitas Sekolah:</strong> Mengatur Nama Sekolah, NPSN,
                      Nama & NIP Kepala Sekolah, Tanggal Rapat Pleno, serta nilai ambang KKM.
                    </li>
                    <li>
                      <strong>Langkah Menyimpan:</strong> Setelah mengubah form pada menu{' '}
                      <em>Status & Pengaturan</em>, klik tombol{' '}
                      <strong>&ldquo;Simpan Pengaturan&rdquo;</strong> di pojok kanan atas form.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-palette-accent bg-palette-background flex items-center justify-between">
          <span className="text-xs text-palette-text/70">
            Seluruh perubahan data otomatis tersinkronisasi ke PostgreSQL Supabase.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-palette-primary rounded-lg hover:bg-palette-text cursor-pointer"
          >
            Mengerti & Tutup Panduan
          </button>
        </div>
      </div>
    </div>
  );
};
