# UAT PINS

Dokumen ini menjadi panduan User Acceptance Test setelah migrasi database, deployment runtime server, dan konfigurasi environment selesai.

## Prasyarat

- Backup database tersedia dan dapat dipulihkan.
- Migrasi `00_preflight.sql` sampai `03_verify_migration.sql` selesai tanpa temuan kritis.
- Aplikasi berjalan sebagai proses Node.js melalui HTTPS.
- Environment produksi/staging telah memuat URL Supabase, anon key, dan service-role key khusus server.
- Data uji memakai barang, bidang, dan gudang nonproduksi atau diberi penanda `UAT`.

## Akun uji

Siapkan akun aktif berikut tanpa memakai akun pribadi harian:

| Kode | Peran | Cakupan |
|---|---|---|
| UAT-SA | `superadmin` | Seluruh bidang dan gudang |
| UAT-SARO | `superadmin`, hanya baca | Seluruh data tanpa hak mutasi |
| UAT-AB | `admin_bidang` | Satu bidang dan semua gudang di dalamnya |
| UAT-ABRO | `admin_bidang`, hanya baca | Satu bidang tanpa hak mutasi |
| UAT-AG | `admin_gudang` | Minimal dua gudang yang ditugaskan |
| UAT-AG0 | `admin_gudang` | Tanpa penugasan gudang |

Jangan mencatat password pada repository atau lembar bukti pengujian.

## Autentikasi dan admin

| ID | Skenario | Hasil yang diharapkan |
|---|---|---|
| AUTH-01 | Login setiap akun aktif | Login berhasil dan profil sesuai akun |
| AUTH-02 | Login dengan password salah | Ditolak tanpa membocorkan detail sensitif |
| AUTH-03 | UAT-SA membuat pengguna | Berhasil; akun Auth dan profil pegawai terbentuk |
| AUTH-04 | UAT-SA mereset password | Berhasil dan password baru dapat digunakan |
| AUTH-05 | Selain UAT-SA memanggil endpoint admin | HTTP 403 |
| AUTH-06 | Request tanpa token/bertoken tidak valid | HTTP 401 |
| AUTH-07 | UAT-SARO memanggil endpoint admin | HTTP 403 |

## Matriks akses

Jalankan uji baca, tambah, ubah, dan hapus pada Barang, Transaksi, Bidang, Gudang, Kategori, dan Pengguna.

| Peran | Baca | Mutasi yang diharapkan |
|---|---|---|
| UAT-SA | Semua data | Semua data sesuai aturan modul |
| UAT-SARO | Semua data | Seluruh mutasi ditolak |
| UAT-AB | Data bidang sendiri | Hanya gudang dalam bidang sendiri |
| UAT-ABRO | Data bidang sendiri | Seluruh mutasi ditolak |
| UAT-AG | Gudang yang ditugaskan | Hanya gudang yang ditugaskan |
| UAT-AG0 | Tidak ada data gudang operasional | Seluruh mutasi gudang ditolak |

Untuk setiap akun terbatas, uji juga akses langsung melalui request API/Supabase; menyembunyikan tombol pada antarmuka saja tidak dianggap cukup.

## Transaksi FIFO

Gunakan satu barang UAT dengan stok awal nol dan dua gudang uji.

1. Catat barang masuk batch A sebanyak 10 unit dengan harga satuan 100.
2. Catat barang masuk batch B sebanyak 10 unit dengan harga satuan 200.
3. Keluarkan 15 unit dari gudang asal.
4. Pastikan stok global menjadi 5 unit.
5. Pastikan batch A tersisa 0 dan batch B tersisa 5.
6. Pastikan detail FIFO mengambil 10 unit dari A dan 5 unit dari B.
7. Pastikan total HPP transaksi keluar bernilai 2.000 dan rata-rata harga dibulatkan sesuai aturan aplikasi.
8. Coba keluarkan jumlah melebihi stok gudang; transaksi harus ditolak dan tidak ada perubahan parsial.
9. Mutasikan sebagian stok ke gudang kedua; stok global tidak berubah dan batch tujuan tercatat.
10. Uji revert transaksi menggunakan akun berwenang dan pastikan stok serta detail FIFO kembali konsisten.

## Modul utama

- Dashboard menampilkan agregat sesuai cakupan akun.
- Barang dapat dicari, difilter, dibuka detailnya, dan dicetak QR-nya.
- Transaksi masuk, keluar, dan mutasi mengikuti cakupan gudang.
- Bidang dan gudang dapat dikelola secara independen oleh Super Admin.
- Laporan mengikuti cakupan data dan dapat diekspor tanpa memuat data bidang lain.
- QR Scanner mengenali format kode PINS dan membuka barang yang tepat.
- Tampilan dapat digunakan pada desktop, tablet, dan smartphone tanpa aksi utama terpotong.

## Bukti pengujian

Catat bukti di luar repository bila memuat data internal. Untuk tiap kasus, simpan:

- ID kasus uji.
- Tanggal dan environment.
- Kode akun uji, bukan identitas pribadi.
- Status `LULUS`, `GAGAL`, atau `TERTUNDA`.
- Screenshot atau log yang sudah disensor.
- Nomor issue untuk setiap kegagalan.

## Kriteria selesai

UAT dinyatakan selesai apabila:

- Seluruh kasus autentikasi dan pembatasan peran lulus.
- Tidak ada mutasi yang dapat dilakukan akun hanya-baca.
- Tidak ada kebocoran data lintas bidang atau gudang.
- Seluruh skenario FIFO selesai tanpa stok negatif atau pembaruan parsial.
- Build CI lulus dan tidak ada temuan keamanan kritis terbuka.
- Pemilik proses menyetujui bukti pengujian sebelum deployment produksi.
