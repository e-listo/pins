-- ============================================================
-- PINS - PRA-MIGRASI (READ-ONLY)
-- Jalankan sebelum 01_konsolidasi_tabel.sql.
-- Script berhenti dengan exception jika prasyarat utama tidak terpenuhi.
-- Tidak mengubah data maupun schema.
-- ============================================================

DO $$
DECLARE
  obj text;
  required_tables text[] := ARRAY[
    'pegawai', 'barang', 'transaksi', 'gudang', 'operator_gudang',
    'bidang_upt', 'bidang', 'kategori', 'kategori_barang',
    'pengaturan_sistem', 'app_settings', 'satuan_barang', 'notifikasi',
    'transaksi_fifo_detail', 'users_pupkp', 'activity_log'
  ];
BEGIN
  FOREACH obj IN ARRAY required_tables LOOP
    IF to_regclass('public.' || obj) IS NULL THEN
      RAISE EXCEPTION 'Prasyarat gagal: tabel public.% tidak ditemukan', obj;
    END IF;
  END LOOP;

  IF to_regprocedure('public.get_my_role()') IS NULL THEN
    RAISE EXCEPTION 'Prasyarat gagal: fungsi public.get_my_role() tidak ditemukan';
  END IF;

  IF to_regprocedure('public.can_access_gudang(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Prasyarat gagal: fungsi public.can_access_gudang(uuid) tidak ditemukan';
  END IF;
END $$;

DO $$
DECLARE
  missing_columns text;
BEGIN
  WITH required(table_name, column_name) AS (
    VALUES
      ('pegawai','id'), ('pegawai','auth_id'), ('pegawai','role'),
      ('pegawai','status'), ('pegawai','bidang_id'),
      ('barang','gudang_id'),
      ('transaksi','gudang_asal_id'), ('transaksi','gudang_tujuan_id'),
      ('gudang','id'), ('gudang','bidang_id'),
      ('operator_gudang','pegawai_id'), ('operator_gudang','gudang_id'),
      ('kategori','id'), ('kategori','nama'), ('kategori','prefix'),
      ('kategori_barang','id'), ('kategori_barang','nama'),
      ('kategori_barang','kode'), ('kategori_barang','created_at')
  ), missing AS (
    SELECT r.table_name || '.' || r.column_name AS name
    FROM required r
    LEFT JOIN information_schema.columns c
      ON c.table_schema = 'public'
     AND c.table_name = r.table_name
     AND c.column_name = r.column_name
    WHERE c.column_name IS NULL
  )
  SELECT string_agg(name, ', ' ORDER BY name) INTO missing_columns FROM missing;

  IF missing_columns IS NOT NULL THEN
    RAISE EXCEPTION 'Prasyarat gagal: kolom berikut tidak ditemukan: %', missing_columns;
  END IF;
END $$;

-- Inventaris awal untuk disimpan sebagai bukti/checkpoint.
SELECT role, status, count(*) AS jumlah
FROM public.pegawai
GROUP BY role, status
ORDER BY role, status;

SELECT
  (SELECT count(*) FROM public.bidang) AS bidang_legacy,
  (SELECT count(*) FROM public.bidang_upt) AS bidang_upt_aktif,
  (SELECT count(*) FROM public.kategori_barang) AS kategori_legacy,
  (SELECT count(*) FROM public.kategori) AS kategori_aktif;

SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('pegawai','barang','transaksi','gudang','operator_gudang',
                    'bidang_upt','kategori','activity_log')
ORDER BY tablename, policyname;
