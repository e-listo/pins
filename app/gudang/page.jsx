"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../src/lib/supabase";
import { getPegawai } from "../../src/lib/auth";
import { Search, Edit, Trash2, Key, Loader2, X, LayoutGrid, List as ListIcon, MapPin, Box } from "lucide-react";

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}>
      <div className="bg-[#1e293b] border border-slate-700 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-700/80 sticky top-0 bg-[#1e293b] z-10">
          <h3 className="text-base font-bold text-white">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return <div className="mb-4"><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{label}</label>{children}</div>;
}

const inputCls = "w-full border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500 bg-[#0f172a] transition-colors placeholder:text-slate-600 disabled:opacity-50 disabled:bg-slate-800 disabled:cursor-not-allowed";
const selectCls = inputCls + " cursor-pointer appearance-none";

export default function ManajemenGudang() {
  const [gudangList, setGudangList] = useState([]);
  const [bidangList, setBidangList] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  
  const [form, setForm] = useState({ nama: "", lokasi: "", keterangan: "", bidang_id: "" });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null });
  const [deletePassword, setDeletePassword] = useState('');

  const isSuperAdmin = String(currentUser?.role).toLowerCase().includes("super");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const user = await getPegawai();
      setCurrentUser(user);
      const isSuper = String(user?.role).toLowerCase().includes("super");
      const userBidangId = user?.bidang_id;

      // Ambil daftar Bidang untuk Dropdown Form (ID dan Nama)
      const { data: bData } = await supabase.from("bidang_upt").select("id, nama").order("nama");
      setBidangList(bData || []);

      // Filter Gudang Ketat Berdasarkan Role & Bidang ID
      let gudangQuery = supabase.from('gudang').select('*, bidang_upt:bidang_id(nama)').order('nama');
      
      if (!isSuper) {
        if (userBidangId) {
          gudangQuery = gudangQuery.eq('bidang_id', userBidangId);
        } else {
          gudangQuery = gudangQuery.eq('id', '00000000-0000-0000-0000-000000000000'); // Kunci jika tidak ada ID
        }
      }

      const { data: dataGudang } = await gudangQuery;
      setGudangList(dataGudang || []);

    } catch (error) { 
      console.error(error); 
    } finally { 
      setLoading(false); 
    }
  }

  const filtered = gudangList.filter(g => 
    g.nama.toLowerCase().includes(search.toLowerCase()) || 
    (g.bidang_upt?.nama || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = () => { 
    setForm({ 
      nama: "", 
      lokasi: "", 
      keterangan: "", 
      bidang_id: isSuperAdmin ? "" : currentUser?.bidang_id || "" 
    }); 
    setEditId(null); 
    setShowModal(true); 
  };
  
  const handleEdit = (g) => { 
    setForm({ 
      nama: g.nama, 
      lokasi: g.lokasi || g.alamat || "", 
      keterangan: g.keterangan || "", 
      bidang_id: g.bidang_id || "" 
    }); 
    setEditId(g.id); 
    setShowModal(true); 
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nama || !form.bidang_id) return alert("Nama Gudang dan Alokasi Bidang wajib diisi!");
    
    setSaving(true);
    try {
      const payload = { 
        nama: form.nama, 
        lokasi: form.lokasi, 
        keterangan: form.keterangan, 
        bidang_id: form.bidang_id 
      };

      if (editId) {
        await supabase.from('gudang').update(payload).eq('id', editId);
      } else { 
        await supabase.from('gudang').insert([payload]); 
      }
      await loadData(); 
      setShowModal(false); 
    } catch (error) { 
      alert("Gagal menyimpan gudang: " + error.message); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleDeleteClick = (g) => {
    if (!isSuperAdmin) return alert("Hanya Super Admin yang berhak menghapus data lokasi gudang.");
    setDeleteModal({ isOpen: true, item: g });
  };

  const executeDelete = async () => {
    if (!deleteModal.item) return;
    if (!deletePassword) return alert("Password wajib diisi!");
    
    setSaving(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Sesi pengguna tidak valid.");
      
      const { error: authError } = await supabase.auth.signInWithPassword({ email: user.email, password: deletePassword });
      if (authError) throw new Error("Otorisasi Gagal: Password yang Anda masukkan salah!");

      const { error } = await supabase.from('gudang').delete().eq('id', deleteModal.item.id);
      if (error) { 
        if (error.code === '23503') throw new Error("Gudang ini tidak bisa dihapus karena masih ada Barang atau Transaksi yang terhubung ke lokasi ini."); 
        throw error; 
      }
      
      await loadData();
      setDeleteModal({ isOpen: false, item: null });
      setDeletePassword('');
    } catch (e) { 
      alert(e.message); 
    } finally { 
      setSaving(false); 
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto p-4 sm:p-6">
      
      {/* HEADER HALAMAN */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white">Manajemen Gudang</h1>
          <p className="text-sm text-slate-400 mt-1">{filtered.length} lokasi penyimpanan terdaftar</p>
        </div>
        <button onClick={handleAdd} className="flex items-center justify-center gap-2 bg-amber-500 text-slate-900 text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-amber-400 active:scale-95 transition-all shadow-lg shadow-amber-900/20 w-full md:w-auto">
          <span className="text-lg leading-none">+</span> Tambah Gudang
        </button>
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-[#1e293b] p-2.5 rounded-xl border border-slate-700 shadow-sm">
        <div className="flex w-full lg:w-auto flex-col md:flex-row gap-3 items-center flex-1">
          <div className="relative w-full md:max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-slate-400" />
            </div>
            <input 
              type="text" placeholder="Cari nama gudang atau bidang..." 
              value={search} onChange={e => setSearch(e.target.value)} 
              className="w-full pl-9 pr-4 py-2 bg-[#0f172a] border border-slate-600 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors" 
            />
          </div>
        </div>
        <div className="flex w-full md:w-auto justify-center lg:justify-end">
          <div className="flex bg-[#0f172a] border border-slate-600 rounded-lg p-1 w-full md:w-auto justify-center">
            <button onClick={() => setViewMode('grid')} className={`p-1.5 px-4 rounded-md flex items-center gap-2 transition-all ${viewMode === 'grid' ? 'bg-amber-500 text-slate-900 shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><LayoutGrid size={16} /> <span className="text-xs font-bold md:hidden">Grid</span></button>
            <button onClick={() => setViewMode('list')} className={`p-1.5 px-4 rounded-md flex items-center gap-2 transition-all ${viewMode === 'list' ? 'bg-amber-500 text-slate-900 shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><ListIcon size={16} /> <span className="text-xs font-bold md:hidden">List</span></button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 flex flex-col items-center gap-3"><Loader2 size={32} className="animate-spin text-amber-500" /><span className="text-slate-400 text-sm font-bold">Memuat data gudang...</span></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-[#1e293b] rounded-2xl border border-slate-700 border-dashed"><p className="text-slate-400">Tidak ada gudang yang sesuai dengan pencarian.</p></div>
      ) : viewMode === "grid" ? (
        /* TAMPILAN GRID (KARTU) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((g) => (
            <div key={g.id} className="bg-[#1e293b] rounded-2xl border border-slate-700 p-6 flex flex-col transition-all hover:border-slate-500 shadow-lg group relative">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0 border border-amber-500/20">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"></path><path d="M5 21V7l8-4v18"></path><path d="M19 21V11l-6-3"></path><path d="M9 9v2"></path><path d="M9 15v2"></path></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white text-lg truncate group-hover:text-amber-400 transition-colors">{g.nama}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1 truncate">{g.bidang_upt?.nama || 'LINTAS BIDANG'}</p>
                </div>
              </div>
              
              <div className="flex-1 space-y-3 mb-6">
                <div className="flex items-start gap-2 text-sm text-slate-300">
                  <MapPin size={16} className="text-slate-500 mt-0.5 shrink-0" />
                  <span className="line-clamp-2 leading-snug">{g.lokasi || g.alamat || "Lokasi belum ditentukan."}</span>
                </div>
                <div className="text-xs text-slate-500 italic line-clamp-2">
                  {g.keterangan || "Tidak ada keterangan tambahan."}
                </div>
              </div>
              
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-700/80 mt-auto">
                <button onClick={() => alert("Fitur lihat isi gudang dalam pengembangan")} className="p-2 bg-[#0f172a] text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors border border-slate-700" title="Lihat Daftar Barang">
                  <Box size={16} />
                </button>
                <button onClick={() => handleEdit(g)} className="p-2 bg-[#0f172a] text-slate-400 hover:text-amber-400 rounded-lg transition-colors border border-slate-700" title="Edit Profil Gudang">
                  <Edit size={16} />
                </button>
                <button onClick={() => handleDeleteClick(g)} disabled={!isSuperAdmin} className={`p-2 rounded-lg transition-colors border border-slate-700 ${isSuperAdmin ? 'bg-[#0f172a] text-red-400 hover:bg-red-500/20' : 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-60'}`} title="Hapus Gudang">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* TAMPILAN LIST (TABEL) */
        <div className="bg-[#1e293b] rounded-2xl border border-slate-700 overflow-hidden shadow-lg overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-[#0f172a] text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-700">
              <tr>
                <th className="px-5 py-4">Informasi Gudang</th>
                <th className="px-5 py-4">Lokasi & Keterangan</th>
                <th className="px-5 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filtered.map(g => (
                <tr key={g.id} className="hover:bg-[#253243] transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-bold text-white text-sm">{g.nama}</p>
                    <span className="inline-flex items-center px-2 py-0.5 mt-1.5 rounded-full text-[9px] font-bold tracking-wider uppercase bg-slate-800 text-slate-300 border border-slate-600">
                      {g.bidang_upt?.nama || 'Lintas Bidang'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-slate-300 text-xs flex items-center gap-1.5 mb-1"><MapPin size={14} className="text-slate-500" /> {g.lokasi || g.alamat || "Lokasi belum diset"}</p>
                    <p className="text-slate-500 text-[11px] truncate max-w-sm italic">{g.keterangan || "-"}</p>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <div className="flex justify-center items-center gap-1.5">
                      <button onClick={() => alert("Fitur lihat isi gudang dalam pengembangan")} className="p-1.5 bg-[#0f172a] text-emerald-400 hover:bg-emerald-500/20 rounded-md transition-colors border border-slate-700" title="Daftar Barang"><Box size={14} /></button>
                      <button onClick={() => handleEdit(g)} className="p-1.5 bg-[#0f172a] text-slate-400 hover:text-amber-400 rounded-md transition-colors border border-slate-700" title="Edit"><Edit size={14} /></button>
                      <button onClick={() => handleDeleteClick(g)} disabled={!isSuperAdmin} className={`p-1.5 rounded-md transition-colors border border-slate-700 ${isSuperAdmin ? 'bg-[#0f172a] text-red-400 hover:bg-red-500/20' : 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-60'}`} title="Hapus"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL TAMBAH/EDIT GUDANG */}
      {showModal && (
        <Modal title={editId ? "Edit Profil Gudang" : "Registrasi Gudang Baru"} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            <Field label="Alokasi Kepemilikan (Bidang/UPT) *">
              <select className={selectCls + (!isSuperAdmin ? " opacity-60 cursor-not-allowed bg-slate-800" : "")} value={form.bidang_id} onChange={e => setForm({ ...form, bidang_id: e.target.value })} disabled={!isSuperAdmin} required>
                <option value="">-- Pilih Bidang / UPT --</option>
                {bidangList.map(b => <option key={b.id} value={b.id}>{b.nama}</option>)}
              </select>
            </Field>
            
            <Field label="Nama Gudang *">
              <input required type="text" className={inputCls} placeholder="Contoh: Gudang Aspal Tamanan" value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} />
            </Field>

            <Field label="Alamat / Titik Lokasi">
              <input type="text" className={inputCls} placeholder="Contoh: Kompleks Dinas PUPKP Lt. 1" value={form.lokasi} onChange={e => setForm({ ...form, lokasi: e.target.value })} />
            </Field>

            <Field label="Keterangan Tambahan">
              <textarea className={inputCls} rows={3} placeholder="Fungsi gudang, catatan khusus..." value={form.keterangan} onChange={e => setForm({ ...form, keterangan: e.target.value })} />
            </Field>

            <div className="flex gap-3 pt-4 border-t border-slate-700/80 mt-6">
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-slate-300 hover:text-white transition-colors">Batal</button>
              <button type="submit" disabled={saving} className="flex-1 py-3 bg-amber-500 text-slate-900 rounded-xl text-sm font-black hover:bg-amber-400 disabled:opacity-50 shadow-lg shadow-amber-900/20 transition-all">{saving ? "Menyimpan..." : "Simpan Gudang"}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL HAPUS GUDANG (SUDO) */}
      {deleteModal.isOpen && (
        <Modal title="Otorisasi Hapus Gudang" onClose={() => { setDeleteModal({ isOpen: false, item: null }); setDeletePassword(''); }}>
          <div className="space-y-4">
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-400 text-sm leading-relaxed mb-2">
              <strong className="block mb-1 text-base">Hapus Gudang Permanen?</strong>
              Sistem akan menolak penghapusan jika gudang ini masih berisi master barang atau memiliki riwayat transaksi aktif.
            </div>

            <div className="bg-[#0f172a] p-3 rounded-xl border border-slate-700">
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Target Lokasi Hapus</span>
              <span className="block text-sm font-bold text-white">{deleteModal.item?.nama}</span>
              <span className="block text-[10px] font-mono text-slate-500 mt-0.5">{deleteModal.item?.lokasi || "Lokasi N/A"}</span>
            </div>

            <Field label="Password Super Admin">
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"><Key size={16} /></div>
                <input 
                  type="password" 
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Masukkan password Anda..."
                  className={`${inputCls} pl-10 focus:ring-red-500 focus:border-red-500`}
                  autoComplete="new-password"
                />
              </div>
            </Field>

            <div className="flex gap-3 pt-4 border-t border-slate-700/80">
              <button onClick={() => { setDeleteModal({ isOpen: false, item: null }); setDeletePassword(''); }} disabled={saving} className="flex-1 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-slate-300 hover:text-white transition-colors">Batal</button>
              <button onClick={executeDelete} disabled={saving || !deletePassword} className="flex-1 py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-500 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-red-900/20 transition-all">{saving ? <Loader2 size={16} className="animate-spin" /> : null}{saving ? "Memverifikasi..." : "Ya, Hapus Gudang"}</button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
