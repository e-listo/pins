# Deployment PINS

PINS menggunakan Next.js dengan Route Handler server untuk operasi administratif Supabase. Karena itu aplikasi **bukan static export** dan harus dijalankan sebagai proses Node.js.

## Environment wajib

```env
NEXT_PUBLIC_SUPABASE_URL=<project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

`SUPABASE_SERVICE_ROLE_KEY` hanya boleh tersedia pada proses server. Jangan memakai awalan `NEXT_PUBLIC_`, jangan dimasukkan ke repository, dan jangan dikirim ke aplikasi Android atau browser.

## Build dan start

```bash
npm ci
npm run build
npm run start
```

Secara default Next.js mendengarkan port `3000`. Pada hosting atau reverse proxy, atur port melalui environment `PORT` bila diperlukan.

## Shared hosting Node.js

1. Buat aplikasi Node.js dari panel hosting dengan Node.js 20.
2. Arahkan application root ke hasil clone repository PINS.
3. Tambahkan tiga environment variable wajib di atas pada panel aplikasi.
4. Jalankan `npm ci` lalu `npm run build` melalui terminal hosting.
5. Atur startup command ke `npm run start` atau perintah ekuivalen yang didukung panel.
6. Arahkan domain/subdomain ke aplikasi Node.js, lalu restart proses.

PINS tidak dapat diterbitkan hanya dengan menyalin folder `out/`, karena endpoint `/api/admin/users` memerlukan runtime server.

## Verifikasi setelah deploy

- Login menggunakan akun uji.
- Buka dashboard, barang, transaksi, bidang, gudang, dan laporan.
- Pastikan Super Admin dapat membuat akun serta mereset password.
- Pastikan role selain Super Admin menerima penolakan saat memanggil endpoint admin.
- Pastikan `SUPABASE_SERVICE_ROLE_KEY` tidak muncul pada source browser atau berkas hasil build publik.

## Android

Build Android tidak boleh memuat service-role key. Untuk distribusi Android, gunakan aplikasi web yang telah dideploy sebagai sumber layanan server atau rancang shell mobile yang tetap memanggil endpoint HTTPS PINS. Jangan mengembalikan konfigurasi `output: 'export'` hanya untuk menghasilkan folder `out/`.
