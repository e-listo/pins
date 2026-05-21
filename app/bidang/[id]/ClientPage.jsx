"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../src/lib/supabase";
import { ArrowLeft, Package, Building2, Loader2, Search, Warehouse } from "lucide-react";

export default function DetailAsetBidang() {
  const params = useParams();
  const router = useRouter();
  const [bidang, setBidang] = useState(null);
  const [barang, setBarang] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (params?.id) loadData(params.id);
  }, [params]);

  async function loadData(id) {
    setLoading(true);
    try {
      // 1. Ambil info Bidang/UPT
      const { data: bData, error: bErr } = await supabase
        .from('bidang_upt')
        .select('*')
        .eq('id', id)
        .single();
      if (bErr) throw bErr;
      setBidang(bData);

      // 2. Ambil semua ID Gudang milik Bidang/UPT ini (sebagai jaring pengaman)
      const { data: gData } = await supabase.from('gudang').select('id').eq('bidang_id', id);
      const gudangIds = gData ? gData.map(g => g.id) : [];

      // 3. Tarik seluruh data barang
      const { data: barangData, error: barangErr } = await supabase
        .from('barang')
        .select('*, gudang:gudang_id(nama)')
        .order('nama');
      if (barangErr) throw barangErr;
      
      // 4. Filter Cerdas (Mencocokkan Nama Bidang ATAU Relasi Gudang)
      const targetNama = String(bData.nama).trim().toLowerCase();
      const matchedBarang = barangData.filter(b => {
        const matchBidang = String(b.bidang_upt || "").trim().toLowerCase() === targetNama;
        const matchGudang = gudangIds.includes(b.gudang_id);
        return matchBidang || matchGudang;
      });
      
      setBarang(matchedBarang);
    } catch (e) {
      console.error(e);
      alert("Gagal memuat rekapitulasi aset bidang.");
    } finally {
      setLoading(false);
    }
  }

  const filteredBarang = barang.filter(b => 
    b.nama.toLowerCase().includes(search.toLowerCase()) || 
    (b.kode_aset && b.kode_aset.toLowerCase().includes(search.toLowerCase())) ||
    (b.gudang?.nama && b.gudang.nama.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={40} /></div>;
  }

  if (!bidang) {
    return <div className="p-10 text-center text-white font-bold">Instansi tidak ditemukan.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 p-4">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400 hover:text-white transition-colors border border-slate-700">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <Building2 className="text-blue-500" /> Aset {bidang.nama}
            </h1>
            <p className="text-sm text-blue-400 font-bold mt-1 uppercase tracking-wider">Rekapitulasi Gabungan Semua Gudang</p>
          </div>
        </div>
        <div className="text-right bg-[#1e293b] px-5 py-3 rounded-2xl border border-slate-700 shadow-lg">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Item Berbeda</p>
          <p className="text-2xl font-black text-white">{barang.length}</p>
        </div>
      </div>

      {/* FILTER & PENCARIAN */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"><Search size={18} /></div>
          <input 
            type="text" 
            placeholder="Cari nama, kode aset, atau nama gudang..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0f172a] border border-slate-700 rounded-xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* DAFTAR BARANG */}
      {filteredBarang.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[#1e293b] rounded-3xl border border-slate-700 border-dashed">
          <Package size={64} className="text-slate-600 mb-4" />
          <p className="text-lg font-bold text-slate-400">Tidak ada barang yang ditemukan di instansi ini.</p>
        </div>
      ) : (
        <div className="bg-[#1e293b] rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-[#0f172a] text-slate-400 font-bold uppercase text-[10px] border-b border-slate-700">
                <tr>
                  <th className="px-6 py-4">Kode & Nama Barang</th>
                  <th className="px-6 py-4">Kategori</th>
                  <th className="px-6 py-4">Lokasi Gudang</th>
                  <th className="px-6 py-4 text-right">Stok Aktual</th>
                  <th className="px-6 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredBarang.map(b => {
                  const isKritis = b.stok <= b.stok_minimum;
                  return (
                    <tr key={b.id} className="hover:bg-[#253243] transition-colors">
                      <td className="px-6 py-3">
                        <p className="font-bold text-white">{b.nama}</p>
                        <p className="text-[10px] font-mono text-amber-400 mt-0.5">{b.kode_aset || "-"}</p>
                      </td>
                      <td className="px-6 py-3">
                        <span className="bg-slate-800 border border-slate-700 px-2 py-1 rounded text-[10px] font-bold text-slate-300">{b.kategori || "-"}</span>
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                          <Warehouse size={12} /> {b.gudang?.nama || "Tidak ada lokasi"}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <span className={`text-xl font-black ${isKritis ? 'text-red-400' : 'text-emerald-400'}`}>{b.stok}</span>
                        <span className="text-[10px] text-slate-500 ml-1 font-semibold uppercase">{b.satuan}</span>
                      </td>
                      <td className="px-6 py-3 text-center">
                        {isKritis ? (
                          <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">Stok Kritis</span>
                        ) : (
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">Aman</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
