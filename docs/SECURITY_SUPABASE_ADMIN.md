# Keamanan Supabase Admin

Operasi Auth administrator tidak lagi memanggil Supabase Admin API langsung dari browser. Pembuatan akun dan reset password kini melewati Route Handler Next.js yang:

1. Memvalidasi access token pengguna yang sedang login.
2. Memastikan profilnya aktif, memiliki `role = 'superadmin'`, dan bukan pengguna `hanya_baca`.
3. Baru kemudian memakai service-role key pada proses server.

## Variabel lingkungan

Konfigurasikan variabel berikut hanya pada server/deployment:

```text
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-baru>
```

Jangan gunakan awalan `NEXT_PUBLIC_` untuk kredensial ini. Hapus `NEXT_PUBLIC_SUPABASE_SERVICE_KEY` dari seluruh konfigurasi deployment, lalu rotasi key lama melalui dashboard Supabase karena nilainya pernah masuk ke bundel klien.

Variabel publik yang tetap digunakan:

```text
NEXT_PUBLIC_SUPABASE_URL=<project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

## Pemeriksaan sebelum merge

```bash
npm ci
npm run lint
npm run build
```

Uji sebagai Super Admin aktif: buat akun baru dan reset password akun lain. Uji sebagai `admin_bidang`, `admin_gudang`, dan Super Admin `hanya_baca`: kedua endpoint harus mengembalikan HTTP 403.
