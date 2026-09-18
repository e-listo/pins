"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../src/lib/supabase";
import { getPegawai } from "../../../src/lib/auth";
import { ArrowLeft, Package, Warehouse, Loader2, Search, AlertTriangle } from "lucide-react";
import { isSuperadmin, isAdminGudang } from "../../../src/lib/roles";

export default function DetailGudang() {
  const params = useParams();
  const router = useRouter();
  const [gudang, setGudang] = useState(null);
  const [barang, setBarang] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    if (params?.id) loadData(params.id);
  }, [params]);

  async function loadData(id) {
    setLoading(true);
    try {
      // 1. Cek Hak Akses User yang Login
      const user = await getPegawai();
      const isSuper = isSuperadmin(user);
      const isOperator = isAdminGudang(user);

      // 2. Ambil info gudang
      const { data: gData, error: gErr } = await supabase
        .from('gudang')
        .select('*, bidang_upt:bidang_id(nama)')
        .eq('id', id)
        .single();
        
      if (gErr) throw gErr;

      // 3. VALIDASI HAK AKSES (RBAC)
      if (!isSuper) {
        if (isOperator) {
           const { data: opData } = await supabase.from('operator_gudang').select('gudang_id').eq('pegawai_id', user.id);
           const opGudangIds = opData ? opData.map(o => o.gudang_id) : [];
           if (!opGudangIds.includes(gData.id)) {
             setAccessDenied(true);
             return;
           }
        } else if (user?.bidang_id && gData.bidang_id !== user.bidang_id) {
           // Jika user adalah admin bidang, dan gudang ini bukan milik bidangnya
           setAccessDenied(true);
           return;
        }
      }

      setGudang(gData);

      // 4. Ambil seluruh barang di gudang tersebut
      const { data: bData, error: bErr } = await supabase
        .from('barang')
        .select('*')
        .eq('gudang_id', id)
        .order('nama');
      if (bErr) throw bErr;

      setBarang(bData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const filteredBarang = barang.filter(b =>
    b.nama.toLowerCase().includes(search.toLowerCase()) ||
    (b.kode_aset && b.kode_aset.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return <div className="flex h-screen items-center justify-center flex-col gap-3"><Loader2 className="animate-spin text-amber-500" size={40} /><span className="text-slate-400 font-bold">Membuka brankas...</span></div>;
  }

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center py-32 max-w-lg mx-auto text-center px-4">
        <div className="w-24 h-24 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle size={48} />
        </div>
        <h2 className="text-2xl font-black text-white mb-2">Akses Ditolak!</h2>
        <p className="text-slate-400 mb-8 leading-relaxed">Anda tidak memiliki izin otorisasi untuk melihat isi gudang milik instansi/bidang lain.</p>
        <button onClick={() => router.back()} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors">
          Kembali ke Halaman Sebelumnya
        </button>
      </div>
    );
  }

  if (!gudang) {
    return <div className="p-10 text-center text-white font-bold">Data Gudang tidak ditemukan atau telah dihapus.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 p-4">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2.5 bg-[#1e293b] hover:bg-slate-700 rounded-xl text-slate-400 hover:text-white transition-colors border border-slate-700 shadow-sm">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <Warehouse className="text-amber-500" /> {gudang.nama}
            </h1>
            <p className="text-xs text-amber-500 font-bold mt-1 uppercase tracking-wider">{gudang.bidang_upt?.nama || "Lintas Bidang"}</p>
          </div>
        </div>
        <div className="text-right bg-[#1e293b] px-5 py-3 rounded-2xl border border-slate-700 shadow-lg">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Item Berbeda</p>
          <p className="text-2xl font-black text-white">{barang.length}</p>
        </div>
      </div>

      {/* FILTER & PENCARIAN TERPADU */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-[#1e293b] p-2.5 rounded-xl border border-slate-700 shadow-sm">
        <div className="flex w-full flex-col md:flex-row gap-3 items-center flex-1">
          <div className="relative w-full md:max-w-md">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"><Search size={16} /></div>
            <input
              type="text"
              placeholder="Cari nama barang atau kode aset di gudang ini..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0f172a] border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* DAFTAR BARANG */}
      {filteredBarang.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[#1e293b] rounded-3xl border border-slate-700 border-dashed shadow-sm">
          <Package size={64} className="text-slate-600 mb-4" />
          <p className="text-lg font-bold text-slate-400">Tidak ada barang yang ditemukan.</p>
        </div>
      ) : (
        <div className="bg-[#1e293b] rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-[#0f172a] text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-700">
                <tr>
                  <th className="px-6 py-4">Kode & Nama Barang</th>
                  <th className="px-6 py-4">Kategori</th>
                  <th className="px-6 py-4 text-right">Stok Aktual</th>
                  <th className="px-6 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredBarang.map(b => {
                  const isKritis = b.stok <= b.stok_minimum;
                  return (
                    <tr key={b.id} className="hover:bg-[#253243] transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-white">{b.nama}</p>
                        <p className="text-[11px] font-mono text-amber-400 mt-0.5">{b.kode_aset || "-"}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-[#0f172a] border border-slate-600 px-2.5 py-1 rounded-md text-[10px] font-bold text-slate-300 uppercase tracking-wider">{b.kategori || "Tanpa Kategori"}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`text-xl font-black ${isKritis ? 'text-red-400' : 'text-emerald-400'}`}>{b.stok}</span>
                        <span className="text-[10px] text-slate-500 ml-1 font-semibold uppercase">{b.satuan}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isKritis ? (
                          <span className="inline-flex items-center gap-1.5 bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
                            <AlertTriangle size={12} /> Stok Kritis
                          </span>
                        ) : (
                          <span className="inline-flex items-center bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
                            Aman
                          </span>
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
