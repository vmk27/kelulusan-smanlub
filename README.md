# "Sipinter-Lulus" — SMAN 1 Lumbung Ciamis

**Sistem Informasi Pengumuman Kelulusan Siswa, Manajemen Transkrip Nilai, Surat Keterangan Lulus (SKL), dan Tracer Study Alumni Terpadu**  
**Satuan Pendidikan:** SMAN 1 Lumbung Ciamis (NPSN: `20211564`)

---

## Ringkasan Aplikasi

**"Sipinter-Lulus" - SMAN 1 Lumbung Ciamis** adalah aplikasi web manajemen pengumuman kelulusan peserta didik kelas akhir (Kelas XII MIPA & IPS) yang dirancang untuk memudahkan proses verifikasi kelulusan siswa secara daring, pencetakan dokumen **Surat Keterangan Lulus (SKL)** berformat PDF resmi ukuran A4, pengelolaan nilai ujian satuan pendidikan, penomoran surat otomatis, hingga pelacakan jejak alumni (*Tracer Study*) yang terintegrasi dengan basis data cloud **Supabase PostgreSQL**.

---

## Fitur Utama

### 1. Portal Pengumuman Kelulusan Siswa (Halaman Publik)
- **Hitung Mundur Digital (*Countdown Timer*)**: Menampilkan waktu hitung mundur otomatis apabila jadwal pengumuman masih dikunci oleh Admin, dan langsung membuka formulir verifikasi ketika waktu pengumuman tiba.
- **Verifikasi Berlapis Peserta Didik**:
  - **10 Digit NISN** (*Nomor Induk Siswa Nasional*)
  - **Nomor Peserta Ujian** (contoh: `26-01-0145-0001-8`)
  - **Tanggal Lahir** (`YYYY-MM-DD`)
- **Proteksi Keamanan Anti-BOT (Captcha)**: Dilengkapi tantangan kode visual *Captcha* acak (5 karakter dengan opsi *Ganti Kode*) untuk mencegah akses otomatis (*bot scraping* / *brute-force*).
- **Transkrip Nilai & Cetak SKL PDF Resmi**: Menampilkan status kelulusan (`LULUS` / `TIDAK LULUS`), predikat kelulusan, tabel nilai mata pelajaran, serta tombol unduh **Surat Keterangan Lulus (SKL)** dalam format PDF A4 siap cetak lengkap dengan kop sekolah dan QR verifikasi.

---

### 2. Login Panel Multi-Role Dashboard
- Menggantikan sistem PIN tunggal dengan **Login Panel Dashboard** menggunakan **Username / NIP** dan **Password / Kata Sandi**.
- Mendukung 3 level otorisasi pengguna (*Multi-Role*):
  1. **Admin / Operator Sekolah**: Akses penuh ke seluruh modul akademik, nomor surat, manajemen user, pengaturan jadwal, dan penyimpanan database.
  2. **Wali Kelas**: Mengelola dan memantau ketuntasan siswa pada rombongan belajar yang diampu.
  3. **Guru Mata Pelajaran**: Mengelola capaian nilai mata pelajaran yang diampu.
- Dilengkapi panel **Daftar Akun Terdaftar** untuk mempermudah pengujian/pemilihan akun cepat serta indikator sesi login aktif dan tombol **Keluar (Logout)** di sidebar.

---

### 3. Modul Dashboard Admin & Akademik

1. **Dashboard Analitik (`Live`)**
   - Ringkasan KPI kelulusan angkatan, persentase kelulusan MIPA vs IPS, grafik rata-rata nilai per mata pelajaran, distribusi predikat, dan proporsi serapan alumni.
2. **Data & Nilai Siswa (4 Sub-Menu Terintegrasi)**
   - **Sub-Menu 1 — Data Kelas & Wali Kelas (`public.class_rooms`)**: Pendaftaran rombongan belajar (`XII MIPA 1`, `XII IPS 1`, dll.), nama & NIP Wali Kelas, serta kapasitas kursi.
   - **Sub-Menu 2 — Mata Pelajaran (`public.subject_catalog`)**: Katalog kode mapel, nama mapel, kelompok (`Umum` / `Peminatan`), peruntukan jurusan (`SEMUA` / `MIPA` / `IPS`), nomor urut cetak SKL, dan KKM. Terintegrasi otomatis ke formulir Data Siswa, Data Nilai, cetak PDF SKL, dan pilihan mapel Guru di Manajemen User.
   - **Sub-Menu 3 — Data Siswa (`public.students`)**: Pengelolaan biodata siswa, fitur **Upload / Template CSV Siswa** dengan nama file kustom, **Ekspor CSV**, serta fitur **Pindahkan ke Alumni (*Bulk Move*)**.
   - **Sub-Menu 4 — Data Nilai & Kelulusan**: Pengelolaan nilai mata pelajaran (0–100), perhitungan otomatis rata-rata, predikat, dan keputusan kelulusan terhadap KKM, dilengkapi fitur **Upload / Template CSV Data Nilai**.
3. **Data Nomor Surat (`public.letter_numbers`)**
   - Mengelola format penomoran **Surat Keterangan Lulus (SKL)** menggunakan variabel dinamis `{NO_URUT}` (3 digit), `{KODE}`, `{BULAN_ROMAWI}`, dan `{TAHUN}`.
   - Terintegrasi langsung ke **Formulir Data Peserta Didik** saat menambah/mengedit siswa serta menyediakan tombol **Terapkan ke Seluruh Siswa** untuk memperbarui nomor SKL secara massal sesuai urutan siswa.
4. **Data Alumni & Tracer Study (`public.alumni`)**
   - Arsip lulusan lintas angkatan dan pemantauan kelanjutan studi (`PTN / PTS`, `Kedinasan / TNI-Polri`, `Bekerja / Wirausaha`, `Belum Terdata`).
5. **Manajemen User (`public.app_users`)**
   - Menambah, mengubah, dan menonaktifkan akun pengguna untuk role **Admin**, **Guru Mapel** (terintegrasi katalog Mata Pelajaran), dan **Wali Kelas** (terintegrasi daftar Kelas).
6. **Status & Pengaturan (`public.announcement_settings`)**
   - Mengatur jadwal tanggal & jam pengumuman, buka/tutup portal secara instan, KKM kelulusan, serta identitas Kepala Sekolah penandatangan SKL.
7. **Penyimpanan Supabase (Dilindungi Token Keamanan)**
   - Pemantauan koneksi *real-time* dan latensi ke **Supabase PostgreSQL**, inspeksi skema tabel & kolom secara langsung (*OpenAPI PostgREST*), audit RLS, pencadangan JSON (*Backup & Restore*), serta skrip SQL siap salin (*Copy SQL*) untuk seluruh tabel.

---

## Akun Login Default Dashboard

| Nama Pengguna | Role | Username | Password | Penugasan |
| :--- | :--- | :--- | :--- | :--- |
| **Drs. H. Тatang Suryana, M.Pd.** | `admin` | `admin_lumbung` | `admin2026` | Seluruh Kelas & Sistem |
| **Virga Mahardhika, S.Kom.** | `admin` | `operator_virga` | `VIRGA100791` | Operator Akademik & IT |
| **Drs. Hendra Kusuma, M.Pd.** | `wali_kelas` | `wali_mipa1` | `mipa12026` | XII MIPA 1 |
| **Siti Nurhaliza, S.Pd., Gr.** | `wali_kelas` | `wali_mipa2` | `mipa22026` | XII MIPA 2 |
| **Bambang Sudibyo, S.E., M.M.** | `wali_kelas` | `wali_ips1` | `ips12026` | XII IPS 1 |
| **Rina Kartika, S.Pd.** | `guru` | `guru_mtk` | `guru2026` | Matematika (MTK) |

---

## Contoh Data Siswa untuk Pengujian Cek Kelulusan

Gunakan kombinasi **NISN**, **Nomor Peserta Ujian**, dan **Tanggal Lahir** berikut pada halaman depan aplikasi:

| Nama Siswa | Kelas | NISN | Nomor Peserta Ujian | Tanggal Lahir | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Nadia Putri Maharani** | XII MIPA 1 | `0084921034` | `26-01-0145-0001-8` | `2008-05-14` | `LULUS` |
| **Rafi Pratama Wijaya** | XII MIPA 1 | `0085193842` | `26-01-0145-0002-7` | `2008-08-22` | `LULUS` |
| **Alya Zahra Ramadhani** | XII MIPA 2 | `0087312945` | `26-01-0145-0003-6` | `2008-09-03` | `LULUS` |
| **Bagas Satrio Nugroho** | XII IPS 1 | `0086401928` | `26-01-0145-0004-5` | `2008-02-19` | `LULUS` |

---

## Struktur Tabel Database Supabase (`public`)

Aplikasi ini menggunakan arsitektur *Hybrid Realtime Persistence* (otomatis menyimpan ke Supabase PostgreSQL dan memiliki cadangan lokal di peramban):

1. `public.class_rooms` — Data Kelas & Wali Kelas
2. `public.subject_catalog` — Katalog Mata Pelajaran Kurikulum
3. `public.letter_numbers` — Format & Penomoran Surat Keterangan Lulus (SKL)
4. `public.students` — Biodata Peserta Didik, Nomor Ujian, Transkrip Nilai (`JSONB`), & Status Kelulusan
5. `public.alumni` — Arsip Lulusan & Tracer Study Alumni
6. `public.app_users` — Manajemen User & Otorisasi Role (Admin, Guru, Wali Kelas)
7. `public.announcement_settings` — Konfigurasi Jadwal Pengumuman & Pejabat Penandatangan SKL

> **Catatan Setup SQL:** Seluruh skrip DDL SQL (`CREATE TABLE`, `ALTER TABLE`, kebijakan *Row Level Security*, dan *Realtime Publication*) dapat disalin langsung melalui menu **Penyimpanan Supabase** di dalam Dashboard Admin.

---

## Menjalankan Aplikasi Secara Lokal

```bash
# 1. Instal dependensi paket
npm install

# 2. Jalankan server pengembangan (Port 3000)
npm run dev

# 3. Build untuk produksi
npm run build
```
