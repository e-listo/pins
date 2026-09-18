"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../src/lib/supabase";
import { getPegawai } from "../../src/lib/auth";
import { Tags, X, Loader2, Key, Edit, Trash2, Search, LayoutGrid, List as ListIcon, AlertCircle, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { isSuperadmin, canManageMaster } from "../../src/lib/roles";

const inputCls = "w-full border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500 bg-[#0f172a] transition-colors placeholder:text-slate-600";

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}>
      <div className="bg-[#1e293b] border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto" style={{ animation: "modalIn 0.2s ease" }}>
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
  return <div className="mb-4"><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{label}</label>{children}</div>;
}

export default function ManajemenKategori() {
  const [kategori, setKategori] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("grid");

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ nama: "", prefix: "" });

  // STATE UNTUK MODAL HAPUS SUDO
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null });
  const [deletePassword, setDeletePassword] = useState('');

  // --- STATE PAGINATION ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const isSuperAdmin = isSuperadmin(currentUser);   // boleh melihat halaman master
  const bolehUbah   = canManageMaster(currentUser); // boleh menyimpan/menghapus

  useEffect(() => { loadData(); }, []);

  // Reset pagination ke halaman 1 setiap kali search atau limit berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [search, itemsPerPage]);

  async function loadData() {
    setLoading(true);
    try {
      const user = await getPegawai();
      setCurrentUser(user);

      // Hanya tarik data jika user adalah super admin
      if (isSuperadmin(user)) {
        const { data } = await supabase.from('kategori').select('*').order('nama', { ascending: true });
        if (data) setKategori(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  // LOGIKA PAGINATION
  const filteredDataUtuh = kategori.filter(k =>
    k.nama.toLowerCase().includes(search.toLowerCase()) ||
    (k.prefix && k.prefix.toLowerCase().includes(search.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredDataUtuh.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredDataUtuh.slice(startIndex, startIndex + itemsPerPage);

  const handleAdd = () => {
    setForm({ nama: "", prefix: "" });
    setEditId(null);
    setShowModal(true);
  };

  const handleEdit = (k) => {
    setForm({ nama: k.nama, prefix: k.prefix || "" });
    setEditId(k.id);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.nama || !form.prefix) return alert("Nama Kategori dan Prefix wajib diisi!");
    setSaving(true);
    try {
      const payload = { nama: form.nama, prefix: form.prefix };
      if (editId) {
        await supabase.from('kategori').update(payload).eq('id', editId);
      } else {
        await supabase.from('kategori').insert([payload]);
      }
      await loadData();
      setShowModal(false);
      setEditId(null);
    } catch (error) {
      alert("Gagal menyimpan: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  // --- HANDLERS UNTUK HAPUS SUDO ---
  const handleDeleteClick = (k) => {
    if (!bolehUbah) return alert("Anda tidak berhak mengubah master kategori.");
    setDeleteModal({ isOpen: true, item: k });
  };

  const executeDelete = async () => {
    if (!deleteModal.item) return;
    if (!deletePassword) return alert("Password wajib diisi!");

    setSaving(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Sesi pengguna tidak valid.");

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: deletePassword
      });

      if (authError) throw new Error("Otorisasi Gagal: Password yang Anda masukkan salah!");

      const { error } = await supabase.from('kategori').delete().eq('id', deleteModal.item.id);
      if (error) {
        if (error.code === '23503') throw new Error("Kategori ini tidak bisa dihapus karena sudah ada Master Barang yang menggunakan kategori ini. Silakan ubah kategori barang tersebut terlebih dahulu.");
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

  if (!loading && !isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center max-w-7xl mx-auto">
        <AlertCircle size={64} className="text-red-500/50 mb-6" />
        <h2 className="text-2xl font-black text-white mb-2">Akses Dibatalkan</h2>
        <p className="text-slate-400">Hanya Pengurus Barang (Super Admin) yang diizinkan untuk mengelola Master Kategori.</p>
      </div>
    );
  }

  // KOMPONEN PAGINATION BAWAH
  const renderPagination = () => {
    if (filteredDataUtuh.length === 0) return null;
    return (
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 bg-[#1e293b] p-4 rounded-xl border border-slate-700 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400">Tampilkan:</span>
          <select 
            value={itemsPerPage} 
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className="bg-[#0f172a] text-white text-sm font-bold border border-slate-600 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
          >
            <option value={20}>20</option>
            <option value={40}>40</option>
            <option value={100}>100</option>
          </select>
          <span className="text-sm text-slate-400">dari {filteredDataUtuh.length} Kategori</span>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg bg-[#0f172a] text-slate-400 border border-slate-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-bold text-slate-300">
            Hal <span className="text-amber-500">{currentPage}</span> / {totalPages || 1}
          </span>
          <button 
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="p-1.5 rounded-lg bg-[#0f172a] text-slate-400 border border-slate-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto pb-20">
      
      {/* HEADER HALAMAN */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white">Master Kategori</h1>
          <p className="text-sm text-slate-400 mt-1">{filteredDataUtuh.length} kategori referensi NUP terdaftar</p>
        </div>
        {isSuperAdmin && (
          <button onClick={handleAdd} className="flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-amber-900/20 w-full md:w-auto">
            <Plus size={18} strokeWidth={2.5} />
            Tambah Kategori
          </button>
        )}
      </div>

      {/* TOOLBAR: SEARCH & VIEW TOGGLE */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-[#1e293b] p-2.5 rounded-xl border border-slate-700 shadow-sm">
        <div className="relative w-full md:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Cari kategori atau prefix NUP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#0f172a] border border-slate-600 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors"
          />
        </div>
        <div className="flex bg-[#0f172a] border border-slate-600 rounded-lg p-1 w-full md:w-auto justify-center">
          <button onClick={() => setViewMode('grid')} className={`p-1.5 px-4 rounded-md flex items-center gap-2 transition-all ${viewMode === 'grid' ? 'bg-amber-500 text-slate-900 shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <LayoutGrid size={16} /> <span className="text-xs font-bold md:hidden">Grid</span>
          </button>
          <button onClick={() => setViewMode('list')} className={`p-1.5 px-4 rounded-md flex items-center gap-2 transition-all ${viewMode === 'list' ? 'bg-amber-500 text-slate-900 shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <ListIcon size={16} /> <span className="text-xs font-bold md:hidden">List</span>
          </button>
        </div>
      </div>

      {/* KONTEN */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-amber-500">
          <Loader2 className="animate-spin mb-3" size={32} />
          <p className="text-sm font-bold text-slate-300">Memuat master kategori...</p>
        </div>
      ) : filteredDataUtuh.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[#1e293b] rounded-2xl border border-slate-700/50">
          <Tags size={48} className="text-slate-600 mb-4" />
          <p className="text-lg font-bold text-slate-400">Tidak ada data yang ditemukan.</p>
        </div>
      ) : viewMode === "grid" ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginatedData.map((k) => (
              <div key={k.id} className="bg-[#1e293b] border border-slate-700 rounded-2xl p-5 hover:border-slate-500 transition-colors group relative shadow-lg flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0">
                    <Tags size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Prefix NUP</span>
                    <span className="text-sm font-mono text-amber-400 font-bold block truncate">{k.prefix || "-"}</span>
                  </div>
                </div>
                <div className="mb-5 flex-1">
                  <h3 className="font-bold text-white text-base leading-tight group-hover:text-amber-400 transition-colors">{k.nama}</h3>
                </div>
                
                {/* AKSI GRID: Tombol dirapikan sejajar ke kanan menggunakan ikon */}
                <div className="mt-auto pt-4 border-t border-slate-700/80 flex items-center justify-end gap-2">
                  <button onClick={() => handleEdit(k)} className="p-2 bg-slate-800 text-slate-300 hover:text-amber-400 rounded-lg transition-colors border border-slate-700 hover:border-amber-500/30" title="Edit Kategori">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleDeleteClick(k)} disabled={!bolehUbah} className={`p-2 rounded-lg transition-colors border border-slate-700 ${bolehUbah ? 'bg-slate-800 text-red-400 hover:bg-red-500/20 hover:border-red-500/30' : 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-60'}`} title="Hapus Kategori">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {renderPagination()}
        </>
      ) : (
        <>
          <div className="bg-[#1e293b] rounded-2xl border border-slate-700 overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300 border-collapse whitespace-nowrap">
                <thead className="bg-[#0f172a] text-slate-400 text-[10px] uppercase font-bold">
                  <tr>
                    <th className="px-6 py-4 border-b border-slate-700 w-16 text-center">No</th>
                    <th className="px-6 py-4 border-b border-slate-700">Nama Kategori</th>
                    <th className="px-6 py-4 border-b border-slate-700 text-center">Prefix NUP</th>
                    <th className="px-6 py-4 border-b border-slate-700 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {paginatedData.map((k, index) => (
                    <tr key={k.id} className="hover:bg-[#253243] transition-colors">
                      <td className="px-6 py-4 text-center text-slate-500 font-bold">{startIndex + index + 1}</td>
                      <td className="px-6 py-4 font-bold text-white">
                        {k.nama}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded border border-amber-500/20 bg-amber-500/10 text-amber-400 font-mono text-xs font-bold">
                          {k.prefix || "-"}
                        </span>
                      </td>
                      
                      {/* AKSI LIST: Tombol disejajarkan di tengah menggunakan ikon */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center items-center gap-2">
                          <button onClick={() => handleEdit(k)} className="p-1.5 bg-slate-800 text-slate-300 hover:text-amber-400 transition-colors border border-slate-700 rounded-md" title="Edit Kategori">
                            <Edit size={16} />
                          </button>
                          <button onClick={() => handleDeleteClick(k)} disabled={!bolehUbah} className={`p-1.5 rounded-md transition-colors border border-slate-700 ${bolehUbah ? 'bg-slate-800 text-red-400 hover:bg-red-500/20' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`} title="Hapus Kategori">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {renderPagination()}
        </>
      )}

      {/* MODAL TAMBAH/EDIT */}
      {showModal && (
        <Modal title={editId ? "Edit Data Kategori" : "Registrasi Kategori Baru"} onClose={() => setShowModal(false)}>
          <Field label="Nama Kategori *">
            <input className={inputCls} placeholder="Contoh: Kendaraan Dinas Roda 4" value={form.nama} onChange={e => setForm({...form, nama: e.target.value})} />
          </Field>
          <Field label="Kode Prefix NUP (Permendagri) *">
            <input className={`${inputCls} font-mono`} placeholder="Contoh: 5.2.7" value={form.prefix} onChange={e => setForm({...form, prefix: e.target.value})} />
            <p className="text-[10px] text-slate-500 mt-1.5 italic">Akan digunakan sebagai basis NUP. Cth: PUPKP.<strong>{form.prefix || '5.2'}</strong>.01.001</p>
          </Field>
          <div className="flex gap-3 pt-4 mt-2">
            <button onClick={() => setShowModal(false)} className="flex-1 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-slate-300 hover:text-white transition-colors">Batal</button>
            <button onClick={handleSubmit} disabled={saving} className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-xl text-sm font-black transition-all shadow-lg shadow-amber-900/20 disabled:opacity-50">
              {saving ? "Memproses..." : (editId ? "Simpan Perubahan" : "Tambah Data")}
            </button>
          </div>
        </Modal>
      )}

      {/* MODAL HAPUS KATEGORI SUDO */}
      {deleteModal.isOpen && (
        <Modal title="Otorisasi Hapus Kategori" onClose={() => { setDeleteModal({ isOpen: false, item: null }); setDeletePassword(''); }}>
          <div className="space-y-4">
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-400 text-sm leading-relaxed mb-2">
              <strong className="block mb-1 text-base">Hapus Permanen?</strong>
              Sistem akan memblokir penghapusan jika kategori ini sedang dipakai oleh data aset barang di database.
            </div>

            <div className="bg-[#0f172a] p-3 rounded-xl border border-slate-700">
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Target Hapus</span>
              <span className="block text-sm font-bold text-white">{deleteModal.item?.nama}</span>
              <span className="block text-xs font-mono text-amber-500 mt-0.5">Prefix: {deleteModal.item?.prefix}</span>
            </div>

            <Field label="Password Super Admin">
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"><Key size={16} className="text-amber-500" /></div>
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

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => { setDeleteModal({ isOpen: false, item: null }); setDeletePassword(''); }}
                disabled={saving}
                className="flex-1 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-slate-300 hover:text-white transition-colors"
              >
                Batal
              </button>
              <button
                onClick={executeDelete}
                disabled={saving || !deletePassword}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-500 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-900/20"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                {saving ? "Memproses..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
