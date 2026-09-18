-- ============================================================
-- PINS - VERIFIKASI PASCA-MIGRASI (READ-ONLY)
-- Jalankan setelah 02_normalisasi_peran_rls.sql sukses.
-- Simpan hasil query sebagai bukti pelaksanaan.
-- ============================================================

-- 1. Semua role harus kanonik; hanya_baca dan label_peran tersedia.
SELECT role, hanya_baca, status, count(*) AS jumlah
FROM public.pegawai
GROUP BY role, hanya_baca, status
ORDER BY role, hanya_baca, status;

SELECT nama, label_peran, role, hanya_baca, bidang_id, status
FROM public.pegawai
ORDER BY role, nama;

-- 2. Tidak boleh ada admin_gudang aktif tanpa penugasan gudang.
SELECT p.id, p.nama, p.nip, p.bidang_id
FROM public.pegawai p
LEFT JOIN public.operator_gudang og ON og.pegawai_id = p.id
WHERE p.role = 'admin_gudang'
  AND p.status = 'Aktif'
GROUP BY p.id, p.nama, p.nip, p.bidang_id
HAVING count(og.gudang_id) = 0;

-- 3. Daftar penugasan admin gudang untuk pemeriksaan manusia.
SELECT p.nama AS pegawai, p.nip, b.nama AS bidang, g.nama AS gudang
FROM public.pegawai p
JOIN public.operator_gudang og ON og.pegawai_id = p.id
JOIN public.gudang g ON g.id = og.gudang_id
LEFT JOIN public.bidang_upt b ON b.id = g.bidang_id
WHERE p.role = 'admin_gudang'
ORDER BY p.nama, g.nama;

-- 4. Status RLS tabel inti.
SELECT n.nspname AS schema_name, c.relname AS table_name,
       c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'pegawai','barang','transaksi','gudang','operator_gudang',
    'bidang_upt','kategori','pengaturan_sistem','app_settings',
    'satuan_barang','notifikasi','transaksi_fifo_detail','users_pupkp','activity_log'
  )
ORDER BY c.relname;

-- 5. Inventaris policy final. Periksa tidak ada policy tulis legacy/permisif.
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('pegawai','barang','transaksi','gudang','operator_gudang',
                    'bidang_upt','kategori','activity_log')
ORDER BY tablename, cmd, policyname;

-- 6. Privilege fungsi helper: anon/PUBLIC tidak boleh memiliki EXECUTE.
SELECT routine_name, grantee, privilege_type
FROM information_schema.routine_privileges
WHERE specific_schema = 'public'
  AND routine_name IN (
    'get_my_role','can_access_gudang','can_write','my_bidang_id',
    'gudang_in_my_bidang','can_write_gudang'
  )
ORDER BY routine_name, grantee;

-- 7. Tabel legacy harus sudah hilang setelah migrasi 01.
SELECT
  to_regclass('public.bidang') AS bidang_legacy,
  to_regclass('public.kategori_barang') AS kategori_legacy,
  to_regclass('public.bidang_upt') AS bidang_upt_aktif,
  to_regclass('public.kategori') AS kategori_aktif;
