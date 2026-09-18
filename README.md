# PINS — PUPKP Inventory System

PINS adalah aplikasi inventaris internal untuk mendukung pengelolaan barang, gudang, transaksi, pelaporan, dan pengguna di lingkungan Dinas PUPKP Kota Yogyakarta. Aplikasi dirancang untuk penggunaan responsif melalui desktop, tablet, dan perangkat Android.

> **Status:** tahap penguatan keamanan, normalisasi hak akses, validasi migrasi database, dan penyiapan deployment.

## Ruang Lingkup

Modul yang tersedia saat ini:

- Dashboard ringkasan inventaris.
- Data barang dan stok.
- Transaksi barang masuk, keluar, dan perpindahan.
- Master gudang, bidang/UPT, dan kategori.
- Laporan serta ekspor data.
- QR code dan pemindaian aset/barang.
- Manajemen pengguna dan penggantian password.
- Profil pengguna dan foto avatar.
- Mode maintenance dan alat bantu migrasi.
- Integrasi aplikasi Android melalui Capacitor.

## Teknologi

| Lapisan | Teknologi |
| --- | --- |
| Frontend dan server | Next.js 16, React 19, TypeScript/JavaScript |
| UI | Tailwind CSS 4, Lucide React, Recharts |
| Backend data dan autentikasi | Supabase (PostgreSQL, Auth, Storage, RLS) |
| Dokumen dan data | jsPDF, SheetJS/XLSX, QR Code |
| Mobile | Capacitor 8 dan Android |

## Hak Akses

PINS menggunakan tiga peran teknis utama:

| Peran | Cakupan |
| --- | --- |
| `superadmin` | Lintas bidang; dapat mengelola master data dan pengguna |
| `admin_bidang` | Seluruh gudang dalam satu bidang/UPT |
| `admin_gudang` | Gudang yang ditetapkan melalui `operator_gudang` |

Hak tulis dipisahkan dari cakupan data melalui atribut `hanya_baca`. Verifikator menggunakan cakupan peran teknis yang sesuai dengan `hanya_baca = true` sehingga dapat memantau tanpa menambah, mengubah, atau menghapus data.

## Struktur Utama

```text
app/                     Halaman dan Route Handler Next.js
app/api/admin/           Endpoint server untuk operasi Auth administratif
src/components/          Komponen antarmuka dan modul bisnis
src/lib/                 Supabase client, autentikasi, dan aturan hak akses
db/migrations/           Migrasi skema, peran, dan RLS
db/AUDIT_ROLE.md         Catatan audit peran dan akses
docs/                    Dokumentasi keamanan dan operasional
android/                 Proyek Android Capacitor
public/                   Aset publik
```

## Menjalankan Lokal

Persyaratan awal:

- Node.js 20 atau versi LTS yang kompatibel.
- Proyek Supabase dengan skema PINS.
- NPM.

```bash
git clone https://github.com/e-listo/pins.git
cd pins
npm ci
cp .env.example .env.local   # jika template tersedia; jika belum, buat manual
npm run dev
```

Buka `http://localhost:3000`.

## Variabel Lingkungan

Buat `.env.local` untuk pengembangan dan atur variabel yang setara pada platform deployment:

```text
NEXT_PUBLIC_SUPABASE_URL=<project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

Ketentuan keamanan:

- `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` digunakan oleh client.
- `SUPABASE_SERVICE_ROLE_KEY` hanya boleh tersedia pada proses server.
- Jangan pernah memberi awalan `NEXT_PUBLIC_` pada service-role key.
- Jangan commit `.env`, `.env.local`, backup database, token, atau kredensial.
- Hapus `NEXT_PUBLIC_SUPABASE_SERVICE_KEY` dari deployment lama dan rotasi key yang pernah terekspos setelah versi aman berhasil aktif.

Lihat [panduan keamanan Supabase Admin](docs/SECURITY_SUPABASE_ADMIN.md).

## Pemeriksaan Kualitas

Jalankan sebelum membuat atau menggabungkan pull request:

```bash
npm ci
npm run lint
npm run build
```

Lanjutkan dengan smoke test:

- Login dan logout.
- Membuka dashboard, barang, transaksi, gudang, kategori, laporan, dan user.
- Membuat akun dan mereset password sebagai Super Admin aktif.
- Memastikan selain Super Admin aktif dengan hak tulis menerima penolakan saat mengakses operasi Auth administratif.
- Memastikan `admin_bidang`, `admin_gudang`, dan pengguna `hanya_baca` hanya dapat mengakses data sesuai cakupannya.

## Migrasi Database

Selalu lakukan backup database dan uji pada staging sebelum produksi. Jalankan migrasi satu per satu sesuai urutan:

```text
1. db/migrations/01_konsolidasi_tabel.sql
2. db/migrations/02_normalisasi_peran_rls.sql
```

Verifikasi skema, data, RLS, login, dan matriks hak akses setelah setiap tahap. Jangan menjalankan kedua migrasi sekaligus tanpa checkpoint dan rencana rollback.

## Progress Proyek

### Selesai

- [x] Normalisasi peran menjadi `superadmin`, `admin_bidang`, dan `admin_gudang`.
- [x] Pemusatan aturan hak akses pada `src/lib/roles.js`.
- [x] Penghapusan fallback/bypass Super Admin pada pemuatan profil.
- [x] Penyiapan migrasi konsolidasi tabel dan normalisasi RLS.
- [x] Pemindahan operasi Supabase Admin Auth dari browser ke Route Handler server.
- [x] Validasi endpoint administratif berdasarkan token, status pegawai, peran, dan hak tulis.
- [x] Penghapusan penggunaan service-role key dari helper client.

### Berjalan

- [ ] Menetapkan mode deployment yang mendukung Route Handler server.
- [ ] Menjalankan lint dan build penuh setelah perubahan keamanan.
- [ ] Menyiapkan environment server-only dan merotasi service-role key lama.
- [ ] Backup, staging, dan eksekusi migrasi database secara bertahap.
- [ ] Uji matriks akses untuk seluruh peran dan pengguna `hanya_baca`.
- [ ] Uji end-to-end pembuatan pengguna, reset password, transaksi, dan laporan.

### Berikutnya

- [ ] Menambahkan GitHub Actions untuk lint dan build pada setiap pull request.
- [ ] Menambahkan pengujian otomatis untuk autentikasi dan otorisasi.
- [ ] Membersihkan file backup/legacy yang masih berada dalam source tree.
- [ ] Menyusun prosedur deployment, rollback, backup, dan pemulihan.
- [ ] Memfinalkan build Android setelah endpoint produksi stabil.

## Catatan Deployment

Konfigurasi saat ini masih menggunakan `output: 'export'`, sedangkan operasi pembuatan akun dan reset password membutuhkan Route Handler Next.js pada server. Static export murni tidak menjalankan endpoint tersebut; sebelum deployment produksi, pilih dan validasi salah satu arsitektur berikut:

1. Jalankan aplikasi sebagai Next.js server (`next build` dan `next start`) di Node.js hosting, lalu pertahankan Route Handler internal.
2. Pertahankan frontend statis, tetapi pindahkan endpoint administratif ke backend/API terpisah yang aman.

Jangan deploy perubahan keamanan ke produksi sebelum keputusan ini selesai, build berhasil, dan endpoint sudah diuji.

## Android

Proyek Android menggunakan Capacitor dengan nama aplikasi **PINS** dan app ID `id.go.jogjakota.pupkp.pins`. Setelah frontend dan alamat server produksi stabil:

```bash
npm run build
npx cap sync android
npx cap open android
```

Pastikan konfigurasi server tidak memakai alamat pengembangan atau kredensial lokal sebelum membuat APK/AAB produksi.

## Alur Kontribusi

1. Buat branch dari `main` dengan nama `feat/...`, `fix/...`, atau `docs/...`.
2. Buat perubahan kecil dan terfokus.
3. Jalankan lint, build, serta smoke test yang relevan.
4. Buat pull request ke `main` dengan ringkasan, risiko, cara pengujian, dan kebutuhan konfigurasi.
5. Merge hanya setelah review dan pemeriksaan berhasil.

## Riwayat Penguatan

- [PR #1](https://github.com/e-listo/pins/pull/1) — normalisasi peran, penghapusan bypass Super Admin, dan pemusatan hak akses.
- [PR #2](https://github.com/e-listo/pins/pull/2) — pemindahan Supabase Admin API ke server dan pengamanan service-role key.

## Pengelola

Repositori internal pengembangan **PINS — PUPKP Inventory System**, Dinas PUPKP Kota Yogyakarta.
