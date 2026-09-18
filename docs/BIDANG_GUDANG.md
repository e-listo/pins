# Bidang dan Gudang

Dokumen ini menjelaskan struktur relasi Bidang dan Gudang dalam PINS.

## Konsep

Dinas PUPKP Kota Yogyakarta terdiri dari beberapa bidang dan UPT. Setiap gudang fisik diasosiasikan ke satu bidang/UPT, dan setiap pengguna memperoleh hak akses berdasarkan bidang atau gudang yang ditetapkan kepadanya.

## Relasi

```
bidang (1) ──< gudang (N)
gudang (1) ──< barang / transaksi
```

Satu bidang dapat memiliki banyak gudang. Satu gudang hanya dapat dimiliki oleh satu bidang.

## Hak Akses per Modul

| Tindakan | Super Admin | Admin Bidang | Admin Gudang | Hanya Baca |
|---|:---:|:---:|:---:|:---:|
| Lihat daftar bidang | ✅ | ✅ | ✅ | ✅ |
| Tambah bidang | ✅ | ❌ | ❌ | ❌ |
| Ubah bidang | ✅ | ❌ | ❌ | ❌ |
| Hapus bidang | ✅ | ❌ | ❌ | ❌ |
| Lihat daftar gudang | ✅ | ✅ (bidang sendiri) | ✅ (gudang sendiri) | ✅ |
| Tambah gudang | ✅ | ❌ | ❌ | ❌ |
| Ubah gudang | ✅ | ❌ | ❌ | ❌ |
| Hapus gudang | ✅ | ❌ | ❌ | ❌ |
| Asosiasi gudang ke bidang | ✅ | ❌ | ❌ | ❌ |

## Bidang/UPT

Dinas PUPKP Kota Yogyakarta terdiri dari sembilan bidang/UPT. Data bidang dikelola melalui tabel `bidang` dan dapat dikelola secara dinamis oleh Super Admin.

## Skema Database

```sql
-- Tabel bidang
CREATE TABLE bidang (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama        text NOT NULL UNIQUE,
  kode        text UNIQUE,
  keterangan  text,
  created_at  timestamptz DEFAULT now()
);

-- Tabel gudang (sudah ada, ditambah relasi bidang)
ALTER TABLE gudang
  ADD COLUMN IF NOT EXISTS bidang_id uuid REFERENCES bidang(id);
```

Lihat migrasi lengkap pada `db/migrations/01_konsolidasi_tabel.sql`.

## Catatan Implementasi

- Gudang tanpa `bidang_id` dianggap belum dikonfigurasi dan tidak akan muncul pada filter bidang.
- Super Admin mengelola bidang dan gudang melalui halaman pengaturan master data.
- Admin Bidang hanya melihat gudang yang berada di bawah bidangnya.
- Admin Gudang hanya mengakses gudang yang secara eksplisit ditugaskan kepadanya.
