# Runbook Migrasi Database PINS

Runbook ini mendampingi script pada `db/migrations/`. Eksekusi dilakukan manual melalui Supabase SQL Editor oleh administrator database; merge pull request **tidak** menjalankan migrasi ke database.

## Urutan aman

1. Tentukan jadwal pemeliharaan dan hentikan sementara transaksi tulis.
2. Buat backup penuh database, lalu pastikan file backup dapat dibaca.
3. Jalankan seluruh isi `00_preflight.sql`; hentikan proses jika ada exception atau hasil inventaris tidak sesuai.
4. Jalankan `01_konsolidasi_tabel.sql` sebagai satu blok.
5. Periksa aplikasi: login, dashboard, barang, kategori, bidang, gudang, transaksi, dan laporan.
6. Jalankan `02_normalisasi_peran_rls.sql` sebagai satu blok.
7. Jalankan `03_verify_migration.sql`, simpan hasilnya, lalu selesaikan setiap temuan.
8. Uji matriks peran menggunakan akun nonproduksi sebelum membuka kembali transaksi.

## Backup

Contoh menggunakan PostgreSQL CLI:

```bash
pg_dump "$DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="pins-before-role-rls-$(date +%Y%m%d-%H%M).dump"

pg_restore --list pins-before-role-rls-*.dump | head
```

Simpan backup di lokasi terbatas. Jangan commit connection string, password, JWT, atau hasil dump ke GitHub.

## Checkpoint tahap 1

Setelah `01_konsolidasi_tabel.sql`:

- `public.bidang` dan `public.kategori_barang` sudah tidak ada.
- `public.bidang_upt` dan `public.kategori` tetap tersedia.
- Data kategori legacy yang belum duplikat telah masuk ke `public.kategori`.
- Halaman yang membaca `bidang_upt` dan `kategori` masih berfungsi.
- RLS aktif pada tabel yang dicakup migrasi tahap 1.

Jika checkpoint gagal, jangan lanjut ke tahap 2.

## Checkpoint tahap 2

Setelah `02_normalisasi_peran_rls.sql`:

- Nilai `pegawai.role` hanya `superadmin`, `admin_bidang`, atau `admin_gudang`.
- Verifikator memakai `hanya_baca = true` dengan cakupan role yang sesuai.
- Setiap `admin_gudang` aktif memiliki minimal satu baris `operator_gudang`.
- Policy tulis lama tidak tersisa.
- `anon` dan `PUBLIC` tidak mempunyai privilege EXECUTE pada helper otorisasi.

## Matriks uji

| Skenario | Super Admin | Admin Bidang | Admin Gudang | Hanya Baca |
|---|---:|---:|---:|---:|
| Membaca dashboard dan laporan | Ya | Ya | Ya | Ya |
| Mengelola master bidang/kategori/gudang | Ya | Tidak | Tidak | Tidak |
| Menulis barang pada cakupan sendiri | Ya | Ya | Ya | Tidak |
| Menulis barang di luar cakupan | Ya | Tidak | Tidak | Tidak |
| Membuat transaksi pada cakupan sendiri | Ya | Ya | Ya | Tidak |
| Menghapus barang/transaksi | Ya | Tidak | Tidak | Tidak |
| Mengelola pengguna dan penugasan gudang | Ya | Tidak | Tidak | Tidak |

Uji minimal satu operasi yang seharusnya berhasil dan satu operasi yang seharusnya ditolak untuk setiap peran.

## Penanganan gagal

Kedua script utama menggunakan transaksi `BEGIN`/`COMMIT`. Error sebelum `COMMIT` membatalkan perubahan dalam blok tersebut. Jika masalah baru ditemukan setelah commit:

1. Aktifkan kembali mode pemeliharaan.
2. Catat pesan error dan hasil `03_verify_migration.sql`.
3. Jangan mengubah data secara coba-coba di produksi.
4. Pulihkan backup ke proyek staging untuk memastikan prosedur restore.
5. Lakukan restore produksi hanya setelah dampak dan waktu pemulihan disetujui.

## Bukti pelaksanaan

Simpan di penyimpanan internal, bukan di repository publik:

- Waktu mulai dan selesai.
- Pelaksana dan pemeriksa.
- Nama serta checksum file backup.
- Hasil preflight dan postflight.
- Hasil uji setiap peran.
- Catatan insiden atau penyimpangan.
