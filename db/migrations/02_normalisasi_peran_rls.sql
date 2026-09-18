-- ============================================================
-- MIGRASI PINS - BAGIAN 2: NORMALISASI PERAN + RLS barang/transaksi
-- Prasyarat: migrasi_konsolidasi_dan_rls.sql sudah dijalankan
-- WAJIB pg_dump DULU. Jalankan di Supabase SQL Editor.
-- BELUM dieksekusi ke database mana pun - tinjau dulu.
-- ============================================================

BEGIN;

-- ============================================================
-- BAGIAN 0: PISAHKAN "KEWENANGAN" DARI "HAK TULIS"
-- Ini jawaban untuk kebutuhan: Verifikator boleh berlabel
-- admin bidang / superadmin, tapi tetap read-only.
-- Solusinya JANGAN dengan menambah role baru, tapi dengan
-- memisahkan dua konsep yang selama ini dicampur di kolom role:
--   1. role        -> SEJAUH MANA data yang boleh dilihat/diurus
--   2. hanya_baca  -> BOLEH menulis atau tidak
--   3. label_peran -> teks yang tampil di UI (bebas, kosmetik)
-- Dengan begini "Verifikator Utama" = role superadmin (lihat
-- semua bidang) + hanya_baca = true (tidak bisa ubah apa pun).
-- ============================================================

ALTER TABLE public.pegawai
  ADD COLUMN IF NOT EXISTS hanya_baca  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS label_peran text;

-- Simpan label lama sebagai teks tampilan sebelum role dinormalisasi
UPDATE public.pegawai SET label_peran = role WHERE label_peran IS NULL;

-- ============================================================
-- BAGIAN 1: NORMALISASI NILAI ROLE KE snake_case
-- Penyebab bug senyap: policy mencari 'admin_gudang', data berisi
-- 'Admin Gudang' -> tidak pernah match, staf terkunci.
-- Kanonik: superadmin | admin_bidang | admin_gudang
-- ============================================================

UPDATE public.pegawai SET role = 'admin_gudang'
  WHERE role IN ('Admin Gudang', 'admin gudang', 'operator');

-- Pengurus Barang Pembantu = wewenang seluruh gudang dalam 1 bidang
UPDATE public.pegawai SET role = 'admin_bidang'
  WHERE role IN ('Pengurus Barang Pembantu', 'Admin Bidang', 'admin bidang');

-- Verifikator = cakupan 1 bidang, tapi read-only
UPDATE public.pegawai SET role = 'admin_bidang', hanya_baca = true
  WHERE role = 'Verifikator';

-- Verifikator Utama = cakupan lintas bidang (dinas), tapi read-only
UPDATE public.pegawai SET role = 'superadmin', hanya_baca = true
  WHERE role = 'Verifikator Utama';

-- Kunci supaya nilai liar tidak masuk lagi lewat form user
ALTER TABLE public.pegawai DROP CONSTRAINT IF EXISTS pegawai_role_check;
ALTER TABLE public.pegawai ADD CONSTRAINT pegawai_role_check
  CHECK (role IN ('superadmin', 'admin_bidang', 'admin_gudang'));

-- ============================================================
-- BAGIAN 2: HELPER FUNCTION
-- SECURITY DEFINER + search_path dikunci (praktik aman Supabase)
-- ============================================================

-- Boleh menulis? superadmin/admin yang TIDAK ditandai hanya_baca
CREATE OR REPLACE FUNCTION public.can_write() RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT NOT hanya_baca FROM pegawai
     WHERE auth_id = auth.uid() AND status = 'Aktif' LIMIT 1), false);
$$;

-- Bidang milik user yang login
CREATE OR REPLACE FUNCTION public.my_bidang_id() RETURNS uuid
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT bidang_id FROM pegawai WHERE auth_id = auth.uid() LIMIT 1;
$$;

-- Gudang ini masih dalam bidang user? (untuk admin_bidang)
CREATE OR REPLACE FUNCTION public.gudang_in_my_bidang(gid uuid) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM gudang g
                 WHERE g.id = gid AND g.bidang_id = public.my_bidang_id());
$$;

-- Gerbang tunggal: apakah user berhak MENULIS pada gudang tertentu
-- superadmin   -> semua gudang
-- admin_bidang -> semua gudang dalam bidangnya
-- admin_gudang -> hanya gudang yang di-assign di operator_gudang
--                 (boleh lebih dari satu gudang)
CREATE OR REPLACE FUNCTION public.can_write_gudang(gid uuid) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.can_write() AND CASE public.get_my_role()
    WHEN 'superadmin'   THEN true
    WHEN 'admin_bidang' THEN public.gudang_in_my_bidang(gid)
    WHEN 'admin_gudang' THEN public.can_access_gudang(gid)
    ELSE false END;
$$;

REVOKE ALL ON FUNCTION public.can_write()                FROM anon;
REVOKE ALL ON FUNCTION public.my_bidang_id()             FROM anon;
REVOKE ALL ON FUNCTION public.gudang_in_my_bidang(uuid)  FROM anon;
REVOKE ALL ON FUNCTION public.can_write_gudang(uuid)     FROM anon;
REVOKE ALL ON FUNCTION public.can_access_gudang(uuid)    FROM anon;
REVOKE ALL ON FUNCTION public.get_my_role()              FROM anon;

-- ============================================================
-- BAGIAN 3: BERSIHKAN POLICY LAMA YANG SALING TUMPANG TINDIH
-- Di schema saat ini ada 2 generasi policy bercampur (bahasa
-- Indonesia + snake_case), sebagian saling membatalkan karena
-- di Postgres policy sejenis digabung dengan OR.
-- ============================================================

DROP POLICY IF EXISTS "Admin bisa delete barang"          ON public.barang;
DROP POLICY IF EXISTS "Admin bisa input/edit barang"       ON public.barang;
DROP POLICY IF EXISTS "Admin bisa insert barang"           ON public.barang;
DROP POLICY IF EXISTS "Admin bisa update barang"           ON public.barang;
DROP POLICY IF EXISTS "Hanya Super Admin hapus barang"     ON public.barang;
DROP POLICY IF EXISTS "Semua user bisa melihat barang"     ON public.barang;
DROP POLICY IF EXISTS barang_read_all                      ON public.barang;
DROP POLICY IF EXISTS barang_update_admin_bidang           ON public.barang;
DROP POLICY IF EXISTS barang_update_operator               ON public.barang;
DROP POLICY IF EXISTS barang_write_admin_bidang            ON public.barang;
DROP POLICY IF EXISTS barang_write_superadmin              ON public.barang;

DROP POLICY IF EXISTS "Admin bisa input transaksi"         ON public.transaksi;
DROP POLICY IF EXISTS "Hanya Super Admin hapus transaksi"  ON public.transaksi;
DROP POLICY IF EXISTS "Semua user bisa melihat transaksi"  ON public.transaksi;
DROP POLICY IF EXISTS transaksi_all_superadmin             ON public.transaksi;
DROP POLICY IF EXISTS transaksi_insert_admin               ON public.transaksi;
DROP POLICY IF EXISTS transaksi_insert_operator            ON public.transaksi;
DROP POLICY IF EXISTS transaksi_read_all                   ON public.transaksi;

DROP POLICY IF EXISTS "Semua user bisa melihat gudang"     ON public.gudang;
DROP POLICY IF EXISTS "Hanya Super Admin hapus gudang"     ON public.gudang;
DROP POLICY IF EXISTS gudang_read_all                      ON public.gudang;
DROP POLICY IF EXISTS gudang_write_superadmin              ON public.gudang;

-- ============================================================
-- BAGIAN 4: POLICY BARU - BARANG
-- Baca: semua user aktif (laporan lintas gudang tetap jalan)
-- Tulis: sesuai cakupan gudang + tidak berstatus hanya_baca
-- Hapus: superadmin saja (dan tetap bukan yang hanya_baca)
-- ============================================================

CREATE POLICY barang_select ON public.barang
  FOR SELECT TO authenticated USING (true);

CREATE POLICY barang_insert ON public.barang
  FOR INSERT TO authenticated
  WITH CHECK (public.can_write_gudang(gudang_id));

CREATE POLICY barang_update ON public.barang
  FOR UPDATE TO authenticated
  USING (public.can_write_gudang(gudang_id))
  WITH CHECK (public.can_write_gudang(gudang_id));

CREATE POLICY barang_delete ON public.barang
  FOR DELETE TO authenticated
  USING (public.get_my_role() = 'superadmin' AND public.can_write());

-- ============================================================
-- BAGIAN 5: POLICY BARU - TRANSAKSI
-- Mutasi antar-gudang: user harus berwenang di gudang ASAL
-- (pihak yang stoknya berkurang). Kalau gudang_asal_id NULL
-- (transaksi masuk/pengadaan), dicek ke gudang_tujuan_id.
-- ============================================================

CREATE POLICY transaksi_select ON public.transaksi
  FOR SELECT TO authenticated USING (true);

CREATE POLICY transaksi_insert ON public.transaksi
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_write_gudang(COALESCE(gudang_asal_id, gudang_tujuan_id))
  );

CREATE POLICY transaksi_update ON public.transaksi
  FOR UPDATE TO authenticated
  USING (public.can_write_gudang(COALESCE(gudang_asal_id, gudang_tujuan_id)))
  WITH CHECK (public.can_write_gudang(COALESCE(gudang_asal_id, gudang_tujuan_id)));

CREATE POLICY transaksi_delete ON public.transaksi
  FOR DELETE TO authenticated
  USING (public.get_my_role() = 'superadmin' AND public.can_write());

-- ============================================================
-- BAGIAN 6: POLICY BARU - GUDANG & MASTER DATA
-- Gudang = master data, hanya superadmin yang boleh CRUD.
-- Semua user boleh baca (butuh untuk dropdown & laporan).
-- ============================================================

CREATE POLICY gudang_select ON public.gudang
  FOR SELECT TO authenticated USING (true);

CREATE POLICY gudang_write ON public.gudang
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'superadmin' AND public.can_write())
  WITH CHECK (public.get_my_role() = 'superadmin' AND public.can_write());

-- Perkuat policy hasil Bagian 1 migrasi sebelumnya:
-- superadmin yang hanya_baca (Verifikator Utama) tidak boleh menulis
DROP POLICY IF EXISTS bidang_write_superadmin   ON public.bidang_upt;
CREATE POLICY bidang_write ON public.bidang_upt
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'superadmin' AND public.can_write())
  WITH CHECK (public.get_my_role() = 'superadmin' AND public.can_write());

DROP POLICY IF EXISTS kategori_write_superadmin ON public.kategori;
CREATE POLICY kategori_write ON public.kategori
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'superadmin' AND public.can_write())
  WITH CHECK (public.get_my_role() = 'superadmin' AND public.can_write());

-- pegawai: superadmin read-only tidak boleh mengangkat dirinya sendiri
DROP POLICY IF EXISTS pegawai_superadmin_all ON public.pegawai;
CREATE POLICY pegawai_superadmin_manage ON public.pegawai
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'superadmin')
  WITH CHECK (public.get_my_role() = 'superadmin' AND public.can_write());

-- operator_gudang: penugasan multi-gudang untuk admin_gudang
DROP POLICY IF EXISTS opg_all_superadmin ON public.operator_gudang;
CREATE POLICY opg_manage ON public.operator_gudang
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'superadmin')
  WITH CHECK (public.get_my_role() = 'superadmin' AND public.can_write());

-- ============================================================
-- BAGIAN 7: INDEX PENDUKUNG (policy dipanggil per baris)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_pegawai_auth_id       ON public.pegawai(auth_id);
CREATE INDEX IF NOT EXISTS idx_operator_gudang_pg    ON public.operator_gudang(pegawai_id, gudang_id);
CREATE INDEX IF NOT EXISTS idx_gudang_bidang_id      ON public.gudang(bidang_id);
CREATE INDEX IF NOT EXISTS idx_barang_gudang_id      ON public.barang(gudang_id);
CREATE INDEX IF NOT EXISTS idx_transaksi_gudang_asal ON public.transaksi(gudang_asal_id);

COMMIT;

-- ============================================================
-- VERIFIKASI SETELAH COMMIT (jalankan terpisah, read-only)
-- ============================================================
-- 1. Cek hasil normalisasi peran:
-- SELECT nama, label_peran, role, hanya_baca, bidang_id FROM pegawai ORDER BY role;
--
-- 2. Cek tidak ada tabel publik yang RLS-nya mati:
-- SELECT tablename FROM pg_tables t WHERE schemaname='public'
--   AND NOT EXISTS (SELECT 1 FROM pg_class c WHERE c.relname=t.tablename AND c.relrowsecurity);
--
-- 3. Assign gudang untuk tiap admin_gudang (WAJIB, kalau tidak dia
--    tidak bisa menulis apa pun karena can_access_gudang -> false):
-- INSERT INTO operator_gudang (pegawai_id, gudang_id) VALUES ('<id-kelvin>', '<id-gudang-PJU-1>');
