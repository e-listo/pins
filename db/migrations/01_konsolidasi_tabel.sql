-- ============================================================
-- MIGRASI PINS BAGIAN 1 (REVISI) - KONSOLIDASI TABEL DUPLIKAT
-- Menggantikan Bagian 1+2 pada migrasi_konsolidasi_dan_rls.sql.
-- addendum_kompatibilitas.sql TIDAK DIPERLUKAN LAGI.
--
-- KOREKSI PENTING dibanding versi sebelumnya:
-- Versi lama mengira 'kategori_barang' adalah tabel aktif dan
-- me-rename-nya menjadi 'kategori' setelah men-DROP 'kategori'.
-- Setelah membaca kode: SEMUA query memakai .from('kategori')
-- dengan kolom (nama, prefix). Menjalankan versi lama akan
-- MENGHAPUS tabel yang dipakai aplikasi dan menghilangkan
-- kolom 'prefix' yang wajib di app/kategori/page.jsx.
--
-- Prinsip revisi: JANGAN me-rename tabel yang sedang dipakai.
-- Cukup buang tabel yang benar-benar mati.
-- WAJIB pg_dump DULU.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. BIDANG: pertahankan nama 'bidang_upt'
-- Alasan: 17 pemanggilan .from('bidang_upt') di 11 file. Rename
-- hanya kosmetik - panjang nama tabel tidak berpengaruh sama
-- sekali pada kecepatan query Postgres (parser bekerja pada OID,
-- bukan string), jadi risikonya jauh lebih besar dari manfaatnya.
-- Tabel 'bidang' lama (kode, nama) KOSONG dan tidak dirujuk kode.
-- ============================================================

DROP TABLE IF EXISTS public.bidang CASCADE;

COMMENT ON TABLE public.bidang_upt IS
  'Master Bidang / UPT / Sekretariat. Nama tabel dipertahankan karena dirujuk 17 query. Kolom tipe: Bidang | UPT | Sekretariat.';

-- ============================================================
-- 2. KATEGORI: pertahankan tabel 'kategori' (nama, prefix)
-- Ini yang aktif dipakai app/kategori dan app/barang.
-- 'kategori_barang' TIDAK dirujuk kode sama sekali, tapi memuat
-- 6 baris data referensi yang layak diselamatkan: kolom 'kode'
-- dipetakan ke 'prefix', kolom 'deskripsi' dibuang (semuanya NULL).
-- ============================================================

INSERT INTO public.kategori (id, nama, prefix, created_at)
SELECT kb.id, kb.nama, kb.kode, COALESCE(kb.created_at, now())
FROM public.kategori_barang kb
WHERE NOT EXISTS (
  SELECT 1 FROM public.kategori k
  WHERE lower(k.nama) = lower(kb.nama) OR lower(k.prefix) = lower(kb.kode)
);

DROP TABLE IF EXISTS public.kategori_barang CASCADE;

COMMENT ON TABLE public.kategori IS
  'Master kategori barang (nama, prefix). Menggantikan kategori_barang yang sudah dihapus.';

-- ============================================================
-- 3. RLS DASAR
-- Tabel-tabel ini sebelumnya GRANT ALL ke anon TANPA RLS.
-- Policy tulis di sini masih superadmin-only; akan diperketat
-- lagi dengan can_write() di migrasi_rls_peran_pins.sql.
-- ============================================================

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['pengaturan_sistem','app_settings','bidang_upt','kategori',
                           'satuan_barang','notifikasi','transaksi_fifo_detail','users_pupkp']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format($f$
      DROP POLICY IF EXISTS %1$I_read ON public.%1$I;
      CREATE POLICY %1$I_read ON public.%1$I
        FOR SELECT TO authenticated USING (true);
      DROP POLICY IF EXISTS %1$I_write ON public.%1$I;
      CREATE POLICY %1$I_write ON public.%1$I
        FOR ALL TO authenticated
        USING (public.get_my_role() = 'superadmin')
        WITH CHECK (public.get_my_role() = 'superadmin');
    $f$, t);
  END LOOP;
END $$;

-- users_pupkp adalah tabel legacy: tutup total sampai dipastikan
DROP POLICY IF EXISTS users_pupkp_read ON public.users_pupkp;

-- activity_log: audit trail. Semua boleh INSERT, hanya superadmin
-- yang boleh mengubah/menghapus (menjaga integritas jejak audit).
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.activity_log FROM anon;
DROP POLICY IF EXISTS activity_log_read   ON public.activity_log;
DROP POLICY IF EXISTS activity_log_insert ON public.activity_log;
DROP POLICY IF EXISTS activity_log_modify ON public.activity_log;
DROP POLICY IF EXISTS activity_log_delete ON public.activity_log;
CREATE POLICY activity_log_read   ON public.activity_log FOR SELECT TO authenticated USING (true);
CREATE POLICY activity_log_insert ON public.activity_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY activity_log_modify ON public.activity_log FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'superadmin');
CREATE POLICY activity_log_delete ON public.activity_log FOR DELETE TO authenticated
  USING (public.get_my_role() = 'superadmin');

COMMIT;

-- ============================================================
-- CATATAN untuk migrasi_rls_peran_pins.sql:
-- karena bidang_upt TIDAK di-rename, ganti setiap 'public.bidang'
-- di file itu menjadi 'public.bidang_upt', dan hapus blok
-- kategori_write (sudah ditangani di sini).
-- ============================================================

-- UTANG TEKNIS yang masih terbuka (lihat audit N4):
-- barang.bidang_upt masih TEXT berisi NAMA bidang, bukan FK UUID.
-- Mengganti nama bidang di app/bidang akan memutus relasi barang
-- secara senyap. Perlu migrasi terpisah ke kolom bidang_id uuid.
