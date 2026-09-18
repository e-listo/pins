# Audit Penggunaan String Role — PINS (repo `e-listo/pins`, branch `main`)

Sumber: clone penuh repo, 15 halaman route + `src/lib` + `src/components`.
File `*.old*`, `*.bak`, `*.backup*`, `node_modules`, `out`, `android` dikecualikan.

---

## Ringkasan: ada 3 generasi kosakata role yang hidup bersamaan

| Generasi | Nilai yang dipakai | Di mana |
|---|---|---|
| A. Title Case (yang benar-benar tersimpan di DB) | `Pengurus Barang`, `Pengurus Barang Pembantu`, `Admin Gudang`, `Verifikator`, `Verifikator Utama`, `superadmin` | `src/components/UserManagement.jsx:53` (dropdown penulis data) |
| B. snake_case (yang dicari kode & RLS) | `superadmin`, `admin_bidang`, `operator`, `viewer` | `src/lib/auth.js:47-55`, `src/components/ProfileUser.jsx:9-11,422`, `src/components/GudangManagement.jsx:143`, `app/page.jsx:67-68` |
| C. Pencocokan kabur (fuzzy) | `String(role).toLowerCase().includes("super")` / `.includes("gudang")` | 11 lokasi di `app/layout.jsx`, `app/page.jsx`, `app/gudang`, `app/barang`, `app/transaksi`, `app/kategori`, `app/bidang`, `app/migrasi` |

Generasi A adalah satu-satunya yang menulis ke database. Generasi B **tidak pernah match** — itulah sebabnya semua helper izin di `auth.js` praktis mati, dan generasi C jadi satu-satunya yang berfungsi (kebetulan, karena `'superadmin'` memuat "super").

---

## Temuan KRITIS (blocking — perbaiki sebelum migrasi SQL dijalankan)

### K1. `getPegawai()` memaksa role `superadmin` saat query gagal
`src/lib/auth.js:36-42`

```js
// JARING PENGAMAN: Jika database error, paksa jadi Super Admin!
if (error || !data) {
  return { ..., role: 'superadmin', jabatan: 'Administrator PINS' };
}
```

Selama ini tidak terasa karena tabel banyak yang RLS-nya mati. **Begitu RLS diaktifkan**, setiap kegagalan `select` pada `pegawai` (sesi kedaluwarsa, policy belum pas, jaringan lokal terputus) akan mengangkat pengguna mana pun menjadi Super Admin di sisi UI — termasuk bypass maintenance mode. Harus dihapus dan diganti redirect ke `/login`.

### K2. Service-role key Supabase dikirim ke browser
`src/lib/auth.js:58,74` dan `src/lib/supabase.ts:104-105` memakai `process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY`.

Awalan `NEXT_PUBLIC_` membuat Next.js **menanamkan nilainya ke bundel JavaScript klien**, sehingga siapa pun yang membuka DevTools bisa mengambilnya. Service-role key melewati seluruh RLS. Artinya semua kerja RLS yang sedang kita rapikan bisa dilewati begitu saja. Karena aplikasi ini akan go-live di hosting publik, ini harus dipindah ke Route Handler sisi server (`app/api/.../route.js`) dengan env var tanpa `NEXT_PUBLIC_`, dan key yang sekarang wajib di-rotate karena sudah pernah terekspos.

### K3. Rename tabel akan mematikan 17 query
Migrasi Bagian 1 me-rename `bidang_upt` → `bidang`. Ada **17 pemanggilan `.from('bidang_upt')`** di 11 file yang akan langsung error 404 PostgREST:

`app/bidang/page.jsx` (4×: select, insert, update, delete), `app/barang/page.jsx` (3×), `app/transaksi/page.jsx` (2×), `app/gudang/page.jsx`, `app/laporan/page.jsx`, `app/migrasi/page.jsx`, `app/bidang/[id]/page.jsx`, `app/bidang/[id]/ClientPage.jsx`, `src/lib/supabase.ts`, `src/components/UserManagement.jsx`, `src/components/BidangManagement.tsx`.

Kabar baik: 5 kemunculan `bidang_upt:bidang_id(nama)` **aman** — itu alias embed yang diresolusi lewat kolom FK `bidang_id`, bukan nama tabel. Jadi jangan ikut diganti.

Solusi paling aman untuk sistem yang sudah live: buat **view kompatibilitas** `bidang_upt` dan `kategori_barang` di migrasi, supaya aplikasi lama tetap jalan sementara kode dirapikan bertahap (lihat `addendum_kompatibilitas.sql`).

---

## Temuan MAJOR (interaksi langsung dengan migrasi peran)

### M1. `includes("super")` akan memberi Verifikator Utama akses tulis di UI
Di 11 lokasi, superadmin dideteksi dengan `String(role).toLowerCase().includes("super")`. Dalam migrasi, Verifikator Utama menjadi `role='superadmin'` + `hanya_baca=true`. Akibatnya UI akan menganggapnya Super Admin penuh: tombol hapus aktif, dropdown bidang terbuka, dan **bypass maintenance mode** (`app/layout.jsx:47-49`).

Database akan tetap menolak (policy sudah mensyaratkan `can_write()`), jadi tidak ada risiko kebocoran data — tapi pengguna akan menemui error RLS yang membingungkan di tengah form. Wajib: setiap pengecekan itu diganti helper terpusat yang juga membaca `hanya_baca`.

### M2. Helper izin di `auth.js` memakai role yang tidak pernah ada
`canWrite()` mencari `['superadmin','admin_bidang','operator']`, `canAdmin()` mencari `['superadmin','admin_bidang']`. Data aktual tidak pernah berisi `admin_bidang` atau `operator`. Setelah normalisasi, `admin_bidang` jadi valid tapi `operator` harus diganti `admin_gudang` — dan keduanya perlu tambahan cek `hanya_baca`.

### M3. Penugasan multi-gudang terikat string Title Case
`src/components/UserManagement.jsx:112,119` hanya menulis/menghapus baris `operator_gudang` bila `formData.role === 'Admin Gudang'`. Setelah role dinormalisasi menjadi `admin_gudang`, blok ini tidak pernah jalan → **admin gudang baru tidak akan pernah dapat penugasan gudang**, dan karena policy tulis bergantung pada `operator_gudang`, mereka kehilangan akses tulis sepenuhnya. Ini konsekuensi paling berbahaya dari normalisasi kalau kode tidak ikut diubah. Hal yang sama di `formData.role === 'Admin Gudang'` pada baris 412 (kondisi tampil pemilih gudang).

### M4. Dropdown role masih bisa menulis nilai liar
`UserManagement.jsx:53` menawarkan `Pengurus Barang` dan `Verifikator*` sebagai nilai kolom `role`. Setelah `pegawai_role_check` dipasang, menyimpan user lewat form ini akan gagal dengan error constraint. Form harus dipecah: dropdown **Peran** (3 nilai kanonik) + dropdown **Label Jabatan** (`label_peran`, bebas) + checkbox **Hanya baca**.

### M5. Dashboard menyaring data dengan role yang salah
`app/page.jsx:67-68`: `role.includes("admin_bidang")` dan `role.includes("operator")` — keduanya selalu `false` pada data sekarang. Berarti pengguna non-superadmin kemungkinan melihat cabang logika default yang tidak diniatkan. Perlu diverifikasi ulang setelah normalisasi.

---

## Temuan MINOR (utang teknis, tidak blocking)

- **N1.** Role `viewer` dipakai sebagai fallback label di `ProfileUser.jsx:283` dan `GudangManagement.jsx:143`, tapi tidak ada di data maupun di dropdown. Sisa desain lama.
- **N2.** `BidangManagement.tsx:138` membandingkan `currentUserRole === 'Super Admin'` (dengan spasi, Title Case) — generasi keempat kosakata, tidak pernah match apa pun.
- **N3.** `app/gudang/[id]/ClientPage.jsx:27` dan `app/barang/page.jsx:91` mendeteksi operator gudang dengan `.includes("gudang")`. Kebetulan tetap benar setelah normalisasi (`admin_gudang` memuat "gudang"), tapi rapuh — sebaiknya ikut dipindah ke helper.
- **N4.** `barang.bidang_upt` disimpan sebagai **teks nama bidang**, sehingga `app/barang/page.jsx:97-100` harus bolak-balik menerjemahkan nama↔UUID. Kalau nama bidang diedit di `app/bidang`, relasi barang langsung putus tanpa peringatan. Perlu dikonversi jadi FK UUID (sudah tercatat sebagai TODO di migrasi Bagian 2).
- **N5.** `app/kategori/page.jsx:155-160` memblokir seluruh halaman untuk non-superadmin. Konsisten dengan policy master data, tapi pesannya menyebut "Pengurus Barang (Super Admin)" — perlu disesuaikan dengan kosakata baru.
- **N6.** `app/migrasi/page.jsx.backup23042026` masih ter-track di repo dan ikut mereferensikan `bidang_upt`. Bersama file `.old1`–`.old6`/`.bak` di `app/`, sebaiknya dihapus dari tracking supaya tidak ikut terbawa saat refactor.

---

## Urutan eksekusi yang disarankan

1. Perbaiki **K1** dan **K2** dulu, deploy. Ini murni perbaikan keamanan, tidak bergantung migrasi.
2. Jalankan `migrasi_konsolidasi_dan_rls.sql` + `addendum_kompatibilitas.sql` (view `bidang_upt`/`kategori_barang` menjaga aplikasi tetap hidup → **K3** teratasi tanpa menyentuh 17 query sekaligus).
3. Pasang helper peran terpusat di `src/lib/roles.js`, ganti 11 lokasi `includes("super")` dan helper `auth.js` → menutup **M1, M2, N3**.
4. Perbaiki `UserManagement.jsx` (**M3, M4**) — ini wajib sebelum langkah 5, kalau tidak pengelolaan user terkunci.
5. Jalankan `migrasi_rls_peran_pins.sql` (normalisasi role + policy baru).
6. Verifikasi **M5**, lalu bereskan **N1, N2, N5, N6**, dan terakhir **N4** (konversi `barang.bidang_upt` ke FK).

Langkah 1–2 dan 3–4 bisa dikerjakan paralel; langkah 5 baru boleh jalan setelah 3 dan 4 selesai.
