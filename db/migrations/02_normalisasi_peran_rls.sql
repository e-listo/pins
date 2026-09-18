-- ============================================================
-- MIGRASI PINS - BAGIAN 2: NORMALISASI PERAN + RLS
-- Prasyarat: 00_preflight.sql dan 01_konsolidasi_tabel.sql sukses.
-- WAJIB backup database dan uji di staging terlebih dahulu.
-- Jalankan di Supabase SQL Editor sebagai satu blok.
-- ============================================================

BEGIN;

-- Pisahkan cakupan kewenangan, hak tulis, dan label tampilan.
ALTER TABLE public.pegawai
  ADD COLUMN IF NOT EXISTS hanya_baca  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS label_peran text;

UPDATE public.pegawai
SET label_peran = role
WHERE label_peran IS NULL;

-- Normalisasi seluruh nilai lama yang diketahui.
UPDATE public.pegawai SET role = 'superadmin'
WHERE role IN ('Pengurus Barang', 'Super Admin', 'super admin');

UPDATE public.pegawai SET role = 'admin_gudang'
WHERE role IN ('Admin Gudang', 'admin gudang', 'operator');

UPDATE public.pegawai SET role = 'admin_bidang'
WHERE role IN ('Pengurus Barang Pembantu', 'Admin Bidang', 'admin bidang');

UPDATE public.pegawai
SET role = 'admin_bidang', hanya_baca = true
WHERE role = 'Verifikator';

UPDATE public.pegawai
SET role = 'superadmin', hanya_baca = true
WHERE role = 'Verifikator Utama';

-- Fail closed: hentikan migrasi bila masih ada nilai role di luar kamus.
DO $$
DECLARE unknown_roles text;
BEGIN
  SELECT string_agg(DISTINCT COALESCE(role, '<NULL>'), ', ' ORDER BY COALESCE(role, '<NULL>'))
  INTO unknown_roles
  FROM public.pegawai
  WHERE role IS NULL
     OR role NOT IN ('superadmin', 'admin_bidang', 'admin_gudang');

  IF unknown_roles IS NOT NULL THEN
    RAISE EXCEPTION 'Migrasi dihentikan. Role belum dipetakan: %', unknown_roles;
  END IF;
END $$;

ALTER TABLE public.pegawai DROP CONSTRAINT IF EXISTS pegawai_role_check;
ALTER TABLE public.pegawai ADD CONSTRAINT pegawai_role_check
  CHECK (role IN ('superadmin', 'admin_bidang', 'admin_gudang'));

-- Helper otorisasi. SECURITY DEFINER memakai search_path tetap.
CREATE OR REPLACE FUNCTION public.can_write() RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT NOT hanya_baca
       FROM pegawai
      WHERE auth_id = auth.uid() AND status = 'Aktif'
      LIMIT 1),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.my_bidang_id() RETURNS uuid
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT bidang_id
  FROM pegawai
  WHERE auth_id = auth.uid() AND status = 'Aktif'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.gudang_in_my_bidang(gid uuid) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM gudang g
    WHERE g.id = gid AND g.bidang_id = public.my_bidang_id()
  );
$$;

CREATE OR REPLACE FUNCTION public.can_write_gudang(gid uuid) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT gid IS NOT NULL
     AND public.can_write()
     AND CASE public.get_my_role()
       WHEN 'superadmin'   THEN true
       WHEN 'admin_bidang' THEN public.gudang_in_my_bidang(gid)
       WHEN 'admin_gudang' THEN public.can_access_gudang(gid)
       ELSE false
     END;
$$;

-- Jangan mengandalkan REVOKE dari anon saja karena privilege PUBLIC tetap berlaku.
REVOKE ALL ON FUNCTION public.can_write()               FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_bidang_id()            FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.gudang_in_my_bidang(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_write_gudang(uuid)    FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_access_gudang(uuid)   FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_role()             FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_write()               TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.my_bidang_id()            TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.gudang_in_my_bidang(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_write_gudang(uuid)    TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_gudang(uuid)   TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_role()             TO authenticated, service_role;

-- Bersihkan policy lama dan policy kanonik agar script aman diulang setelah rollback manual.
DROP POLICY IF EXISTS "Admin bisa delete barang"       ON public.barang;
DROP POLICY IF EXISTS "Admin bisa input/edit barang"   ON public.barang;
DROP POLICY IF EXISTS "Admin bisa insert barang"       ON public.barang;
DROP POLICY IF EXISTS "Admin bisa update barang"       ON public.barang;
DROP POLICY IF EXISTS "Hanya Super Admin hapus barang" ON public.barang;
DROP POLICY IF EXISTS "Semua user bisa melihat barang" ON public.barang;
DROP POLICY IF EXISTS barang_read_all                   ON public.barang;
DROP POLICY IF EXISTS barang_update_admin_bidang        ON public.barang;
DROP POLICY IF EXISTS barang_update_operator            ON public.barang;
DROP POLICY IF EXISTS barang_write_admin_bidang         ON public.barang;
DROP POLICY IF EXISTS barang_write_superadmin           ON public.barang;
DROP POLICY IF EXISTS barang_select                     ON public.barang;
DROP POLICY IF EXISTS barang_insert                     ON public.barang;
DROP POLICY IF EXISTS barang_update                     ON public.barang;
DROP POLICY IF EXISTS barang_delete                     ON public.barang;

DROP POLICY IF EXISTS "Admin bisa input transaksi"        ON public.transaksi;
DROP POLICY IF EXISTS "Hanya Super Admin hapus transaksi" ON public.transaksi;
DROP POLICY IF EXISTS "Semua user bisa melihat transaksi" ON public.transaksi;
DROP POLICY IF EXISTS transaksi_all_superadmin             ON public.transaksi;
DROP POLICY IF EXISTS transaksi_insert_admin               ON public.transaksi;
DROP POLICY IF EXISTS transaksi_insert_operator            ON public.transaksi;
DROP POLICY IF EXISTS transaksi_read_all                   ON public.transaksi;
DROP POLICY IF EXISTS transaksi_select                     ON public.transaksi;
DROP POLICY IF EXISTS transaksi_insert                     ON public.transaksi;
DROP POLICY IF EXISTS transaksi_update                     ON public.transaksi;
DROP POLICY IF EXISTS transaksi_delete                     ON public.transaksi;

DROP POLICY IF EXISTS "Semua user bisa melihat gudang"    ON public.gudang;
DROP POLICY IF EXISTS "Hanya Super Admin hapus gudang"    ON public.gudang;
DROP POLICY IF EXISTS gudang_read_all                      ON public.gudang;
DROP POLICY IF EXISTS gudang_write_superadmin              ON public.gudang;
DROP POLICY IF EXISTS gudang_select                        ON public.gudang;
DROP POLICY IF EXISTS gudang_write                         ON public.gudang;

ALTER TABLE public.barang ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaksi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gudang ENABLE ROW LEVEL SECURITY;

CREATE POLICY barang_select ON public.barang
  FOR SELECT TO authenticated USING (true);
CREATE POLICY barang_insert ON public.barang
  FOR INSERT TO authenticated WITH CHECK (public.can_write_gudang(gudang_id));
CREATE POLICY barang_update ON public.barang
  FOR UPDATE TO authenticated
  USING (public.can_write_gudang(gudang_id))
  WITH CHECK (public.can_write_gudang(gudang_id));
CREATE POLICY barang_delete ON public.barang
  FOR DELETE TO authenticated
  USING (public.get_my_role() = 'superadmin' AND public.can_write());

CREATE POLICY transaksi_select ON public.transaksi
  FOR SELECT TO authenticated USING (true);
CREATE POLICY transaksi_insert ON public.transaksi
  FOR INSERT TO authenticated
  WITH CHECK (public.can_write_gudang(COALESCE(gudang_asal_id, gudang_tujuan_id)));
CREATE POLICY transaksi_update ON public.transaksi
  FOR UPDATE TO authenticated
  USING (public.can_write_gudang(COALESCE(gudang_asal_id, gudang_tujuan_id)))
  WITH CHECK (public.can_write_gudang(COALESCE(gudang_asal_id, gudang_tujuan_id)));
CREATE POLICY transaksi_delete ON public.transaksi
  FOR DELETE TO authenticated
  USING (public.get_my_role() = 'superadmin' AND public.can_write());

CREATE POLICY gudang_select ON public.gudang
  FOR SELECT TO authenticated USING (true);
CREATE POLICY gudang_write ON public.gudang
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'superadmin' AND public.can_write())
  WITH CHECK (public.get_my_role() = 'superadmin' AND public.can_write());

-- Hapus nama policy yang dibuat migrasi 01 serta varian legacy.
-- Ini mencegah policy permisif lama bergabung dengan OR dan melewati hanya_baca.
DROP POLICY IF EXISTS bidang_upt_write          ON public.bidang_upt;
DROP POLICY IF EXISTS bidang_write_superadmin   ON public.bidang_upt;
DROP POLICY IF EXISTS bidang_write              ON public.bidang_upt;
CREATE POLICY bidang_write ON public.bidang_upt
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'superadmin' AND public.can_write())
  WITH CHECK (public.get_my_role() = 'superadmin' AND public.can_write());

DROP POLICY IF EXISTS kategori_write_superadmin ON public.kategori;
DROP POLICY IF EXISTS kategori_write            ON public.kategori;
CREATE POLICY kategori_write ON public.kategori
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'superadmin' AND public.can_write())
  WITH CHECK (public.get_my_role() = 'superadmin' AND public.can_write());

-- Pisahkan SELECT dan mutasi agar superadmin hanya_baca juga tidak dapat DELETE.
DROP POLICY IF EXISTS pegawai_superadmin_all    ON public.pegawai;
DROP POLICY IF EXISTS pegawai_superadmin_manage ON public.pegawai;
DROP POLICY IF EXISTS pegawai_select            ON public.pegawai;
DROP POLICY IF EXISTS pegawai_insert            ON public.pegawai;
DROP POLICY IF EXISTS pegawai_update            ON public.pegawai;
DROP POLICY IF EXISTS pegawai_delete            ON public.pegawai;
CREATE POLICY pegawai_select ON public.pegawai
  FOR SELECT TO authenticated USING (true);
CREATE POLICY pegawai_insert ON public.pegawai
  FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() = 'superadmin' AND public.can_write());
CREATE POLICY pegawai_update ON public.pegawai
  FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'superadmin' AND public.can_write())
  WITH CHECK (public.get_my_role() = 'superadmin' AND public.can_write());
CREATE POLICY pegawai_delete ON public.pegawai
  FOR DELETE TO authenticated
  USING (public.get_my_role() = 'superadmin' AND public.can_write());

DROP POLICY IF EXISTS opg_all_superadmin        ON public.operator_gudang;
DROP POLICY IF EXISTS opg_manage                ON public.operator_gudang;
DROP POLICY IF EXISTS operator_gudang_select    ON public.operator_gudang;
DROP POLICY IF EXISTS operator_gudang_insert    ON public.operator_gudang;
DROP POLICY IF EXISTS operator_gudang_update    ON public.operator_gudang;
DROP POLICY IF EXISTS operator_gudang_delete    ON public.operator_gudang;
CREATE POLICY operator_gudang_select ON public.operator_gudang
  FOR SELECT TO authenticated USING (true);
CREATE POLICY operator_gudang_insert ON public.operator_gudang
  FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() = 'superadmin' AND public.can_write());
CREATE POLICY operator_gudang_update ON public.operator_gudang
  FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'superadmin' AND public.can_write())
  WITH CHECK (public.get_my_role() = 'superadmin' AND public.can_write());
CREATE POLICY operator_gudang_delete ON public.operator_gudang
  FOR DELETE TO authenticated
  USING (public.get_my_role() = 'superadmin' AND public.can_write());

CREATE INDEX IF NOT EXISTS idx_pegawai_auth_id       ON public.pegawai(auth_id);
CREATE INDEX IF NOT EXISTS idx_operator_gudang_pg    ON public.operator_gudang(pegawai_id, gudang_id);
CREATE INDEX IF NOT EXISTS idx_gudang_bidang_id      ON public.gudang(bidang_id);
CREATE INDEX IF NOT EXISTS idx_barang_gudang_id      ON public.barang(gudang_id);
CREATE INDEX IF NOT EXISTS idx_transaksi_gudang_asal ON public.transaksi(gudang_asal_id);
CREATE INDEX IF NOT EXISTS idx_transaksi_gudang_tujuan ON public.transaksi(gudang_tujuan_id);

COMMIT;
