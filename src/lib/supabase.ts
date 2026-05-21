import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export async function getBarang() {
  const { data, error } = await supabase
    .from('barang')
    .select('*, gudang:gudang_id(id, nama, kode_lokasi)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function addBarang(payload: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('barang').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function getTransaksi() {
  const { data, error } = await supabase
    .from('transaksi')
    .select('*, barang:barang_id(kode_aset, nama), gudang_asal:gudang_asal_id(nama), gudang_tujuan:gudang_tujuan_id(nama)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function addTransaksi(payload: Record<string, unknown>) {
  const { data: trx, error } = await supabase
    .from('transaksi').insert(payload).select().single()
  if (error) throw error

  const { data: brg } = await supabase
    .from('barang').select('stok').eq('id', payload.barang_id).single()

  const stokSaat = (brg as { stok: number } | null)?.stok ?? 0
  const jumlah   = payload.jumlah as number
  const stokBaru = payload.tipe === 'masuk' ? stokSaat + jumlah : stokSaat - jumlah

  await supabase.from('barang').update({ stok: stokBaru }).eq('id', payload.barang_id)
  return trx
}

export async function getGudang() {
  const { data, error } = await supabase
    .from('gudang').select('*').order('nama')
  if (error) throw error
  return data
}

// ── User Management ───────────────────────────────────────────────────────────

export async function getPegawaiList() {
  const { data, error } = await supabase
    .from('pegawai')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getBidangList() {
  const { data } = await supabase.from('bidang_upt').select('*').order('nama');
  return data || [];
}

export async function getOperatorGudang(pegawaiId: string) {
  const { data, error } = await supabase
    .from('operator_gudang')
    .select('*, gudang:gudang_id(id, nama)')
    .eq('pegawai_id', pegawaiId)
  if (error) throw error
  return data
}

export async function updatePegawai(id: string, payload: Record<string, unknown>) {
  const { error } = await supabase
    .from('pegawai').update(payload).eq('id', id)
  if (error) throw error
}

export async function setOperatorGudang(pegawaiId: string, gudangIds: string[]) {
  // Hapus assignment lama
  await supabase.from('operator_gudang').delete().eq('pegawai_id', pegawaiId)
  if (gudangIds.length === 0) return
  // Insert assignment baru
  const { error } = await supabase.from('operator_gudang').insert(
    gudangIds.map(gid => ({ pegawai_id: pegawaiId, gudang_id: gid }))
  )
  if (error) throw error
}

export async function updateFotoUrl(pegawaiId: string, fotoUrl: string | null) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/pegawai?id=eq.${pegawaiId}`,
    {
      method: "PATCH",
      headers: {
        "apikey": process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY!,
        "Authorization": `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY!}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({ foto_url: fotoUrl }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error("Gagal update foto: " + err);
  }
}
