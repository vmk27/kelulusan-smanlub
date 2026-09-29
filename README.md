# "Sipinter-Lulus" — SMAN 1 Lumbung Ciamis

**Sistem Informasi Pengumuman Kelulusan Siswa, Manajemen Transkrip Nilai, Surat Keterangan Lulus (SKL) Digital, dan Tracer Study Alumni**  
**Satuan Pendidikan:** SMAN 1 Lumbung Ciamis (NPSN: `20211564`)

---

## Deskripsi Aplikasi

**"Sipinter-Lulus"** adalah platform berbasis web responsif yang dirancang untuk memfasilitasi publikasi pengumuman kelulusan peserta didik tingkat akhir (Kelas XII MIPA & IPS), penerbitan dokumen **Surat Keterangan Lulus (SKL)** resmi berformat PDF A4, pengelolaan nilai ujian sekolah, penomoran surat otomatis, hingga pelacakan rekam jejak lulusan (*Tracer Study Alumni*).

Aplikasi ini mengadopsi arsitektur *Hybrid Real-time Persistence* yang terhubung dengan basis data cloud **Supabase PostgreSQL** untuk memastikan sinkronisasi data secara langsung dan aman antar pengelola sekolah.

---

## Panduan Penggunaan Aplikasi

### A. Untuk Peserta Didik (Siswa)

1. **Memeriksa Jadwal Pengumuman**:
   - Jika portal belum dibuka oleh pihak sekolah, halaman utama akan menampilkan hitung mundur waktu (*Countdown Timer*) hingga tanggal dan jam pengumuman yang ditentukan.
2. **Memasukkan Data Verifikasi**:
   - Masukkan **10 Digit NISN** (*Nomor Induk Siswa Nasional*).
   - Masukkan **Nomor Peserta Ujian** sesuai kartu ujian sekolah.
   - Masukkan **Tanggal Lahir** siswa.
   - Ketikkan **Kode Keamanan Anti-Bot (Captcha)** yang tampil di layar. Gunakan tombol *Ganti Kode* jika kode kurang terbaca.
3. **Melihat Keputusan Kelulusan & Transkrip**:
   - Klik tombol **Periksa Kelulusan Saya**.
   - Sistem akan memverifikasi kesesuaian data dan menampilkan kartu hasil kelulusan beserta tabel transkrip nilai mata pelajaran.
4. **Mengunduh Surat Keterangan Lulus (SKL) Digital**:
   - Klik tombol **Unduh Dokumen SKL (PDF)** untuk mencetak atau menyimpan dokumen resmi SKL lengkap dengan kop sekolah dan kode QR verifikasi.

---

### B. Untuk Pengelola Sekolah (Admin, Wali Kelas, & Guru Mapel)

1. **Masuk ke Dashboard Akademik**:
   - Buka menu **Panel Admin** dari pojok kanan atas halaman utama.
   - Masukkan **Username / NIP** dan **Kata Sandi** akun pengelola.
   - Gunakan ikon mata di dalam kolom kata sandi untuk melihat atau menyembunyikan karakter kata sandi.
2. **Mengakses Fitur Berdasarkan Wewenang (*Role-Based Access*)**:
   - **Dashboard Analitik**: Memantau metrik kelulusan secara *real-time*, capaian rata-rata nilai per mata pelajaran, dan statistik alumni.
   - **Data Kelas & Wali Kelas**: Mengatur daftar rombongan belajar dan menetapkan guru wali kelas.
   - **Katalog Mata Pelajaran**: Mengelola daftar mata pelajaran kurikulum (Umum & Peminatan) beserta standar KKM.
   - **Data Siswa & Transkrip Nilai**: Menginput atau mengimpor data peserta didik dan nilai melalui format template CSV, mengedit data per siswa, dan mencetak SKL secara massal.
   - **Data Nomor Surat**: Mengatur format dan variabel penomoran SKL otomatis (`{NO_URUT}`, `{KODE}`, `{BULAN_ROMAWI}`, `{TAHUN}`) serta menerapkannya ke seluruh peserta didik.
   - **Data Alumni & Tracer Study**: Mengarsipkan lulusan dan memperbarui status kelanjutan studi (PTN, PTS, Kedinasan/TNI-Polri, Bekerja, Wirausaha).
   - **Manajemen User**: Mendaftarkan dan mengelola hak akses akun staf pengajar serta admin sekolah.
   - **Status & Pengaturan Pengumuman**: Mengatur jadwal waktu publikasi kelulusan, membuka/menutup akses portal publik secara manual, dan menetapkan pejabat penandatangan SKL.
   - **Penyimpanan Supabase**: Memantau status sinkronisasi basis data cloud, memeriksa struktur skema tabel, dan mencadangkan data.

---

## Fitur Unggulan

- **Keamanan & Verifikasi Berlapis**: Verifikasi 3 parameter data siswa disertai proteksi *Captcha* visual untuk menangkal akses otomatis *bot*.
- **Cetak SKL Standar Format A4**: Menghasilkan dokumen PDF resmi yang rapi dengan tata letak kop sekolah, tabel transkrip nilai, predikat, dan tanda tangan digital.
- **Dukungan Format File CSV**: Mempermudah import dan export data peserta didik maupun data nilai menggunakan template tabel siap pakai.
- **Penyimpanan Cloud Real-time**: Perubahan data oleh guru atau wali kelas langsung tersinkronisasi ke seluruh sistem.
- **Tampilan Responsif & Modern**: Tata letak yang dioptimalkan untuk perangkat ponsel pintar, tablet, laptop, dan komputer desktop.

---

## Struktur Data Utama

Sistem mengelola entitas data terpadu meliputi:
- `class_rooms` — Data rombongan belajar dan penetapan wali kelas.
- `subject_catalog` — Katalog mata pelajaran kurikulum dan standar KKM.
- `students` — Biodata peserta didik, nomor ujian, transkrip nilai, dan keputusan kelulusan.
- `letter_numbers` — Format penomoran dokumen Surat Keterangan Lulus (SKL).
- `alumni` — Arsip lulusan dan pelacakan studi/karier alumni (*Tracer Study*).
- `app_users` — Akun pengguna pengelola dan otorisasi hak akses (*Multi-Role*).
- `announcement_settings` — Konfigurasi jadwal pengumuman dan parameter SKL sekolah.

---

## Menjalankan Aplikasi di Lingkungan Pengembangan

```bash
# 1. Menginstal seluruh dependensi aplikasi
npm install

# 2. Menjalankan server pengembangan (Port 3000)
npm run dev

# 3. Membangun aplikasi untuk produksi
npm run build
```
