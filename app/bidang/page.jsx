"use client";

import React, { useState, useEffect } from 'react';
import { LayoutGrid, List, Plus, Building2, Edit, Trash2, Loader2, X, AlertTriangle, Package, Warehouse, ExternalLink, Key, Search } from 'lucide-react';
import { supabase } from '../../src/lib/supabase'; 
import { getPegawai } from '../../src/lib/auth';
import Link from 'next/link';

export default function BidangPage() {
  const [viewMode, setViewMode] = useState('grid');
  const [dataBidang, setDataBidang] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // STATE BARU: Untuk pencarian
  const [searchQuery, setSearchQuery] = useState('');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addFormData, setAddFormData] = useState({ nama: '', tipe: 'Bidang' });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({ id: null, nama: '', tipe: '' });

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteData, setDeleteData] = useState(null);
  
  const [deletePassword, setDeletePassword] = useState('');
  const [viewGudang, setViewGudang] = useState({ isOpen: false, loading: false, title: "", data: [] });
  const [currentUserRole, setCurrentUserRole] = useState('');

  useEffect(() => {
    fetchRole();
    fetchBidangUPT();
  }, []);

  const fetchRole = async () => {
    const user = await getPegawai();
    if (user) setCurrentUserRole(user.role);
  };

  const isSuperAdmin = String(currentUserRole).toLowerCase().includes('super');

  const fetchBidangUPT = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('bidang_upt').select('*').order('id', { ascending: true });
      if (error) throw error;
      setDataBidang(data || []);
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTambahSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('bidang_upt').insert([{ nama: addFormData.nama, tipe: addFormData.tipe }]);
      if (error) throw error;
      setIsAddModalOpen(false);
      setAddFormData({ nama: '', tipe: 'Bidang' });
      fetchBidangUPT();
    } catch (error) { alert('Gagal menambahkan data: ' + error.message); } finally { setIsSubmitting(false); }
  };

  const openEditModal = (item) => {
    setEditFormData({ id: item.id, nama: item.nama, tipe: item.tipe });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('bidang_upt').update({ nama: editFormData.nama, tipe: editFormData.tipe }).eq('id', editFormData.id);
      if (error) throw error;
      setIsEditModalOpen(false);
      fetchBidangUPT();
    } catch (error) { alert('Gagal mengupdate data: ' + error.message); } finally { setIsSubmitting(false); }
  };

  const openDeleteModal = (item) => {
    setDeleteData(item);
    setIsDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (!deleteData) return;
    if (!deletePassword) return alert("Password wajib diisi!");

    setIsSubmitting(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Sesi pengguna tidak valid.");

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: deletePassword
      });

      if (authError) throw new Error("Otorisasi Gagal: Password salah!");

      const { error } = await supabase.from('bidang_upt').delete().eq('id', deleteData.id);
      if (error) {
        if (error.code === '23503') throw new Error("Instansi ini masih menjadi induk dari Gudang atau Pegawai. Silakan pindahkan relasi data tersebut dahulu.");
        throw error;
      }

      setIsDeleteModalOpen(false);
      setDeleteData(null);
      setDeletePassword('');
      fetchBidangUPT();
    } catch (error) { 
      alert(error.message); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const handleViewGudangBidang = async (item) => {
    setViewGudang({ isOpen: true, loading: true, title: item.nama, data: [] });
    try {
      const { data, error } = await supabase
        .from('gudang')
        .select('*')
        .eq('bidang_id', item.id)
        .order('nama');
      if (error) throw error;
      setViewGudang({ isOpen: true, loading: false, title: item.nama, data: data || [] });
    } catch (err) {
      alert("Gagal menarik daftar gudang: " + err.message);
      setViewGudang(prev => ({ ...prev, loading: false }));
    }
  };

  // LOGIKA PENCARIAN
  const filteredBidang = dataBidang.filter(item => 
    item.nama?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.tipe?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 relative pb-20 max-w-7xl mx-auto">
      
      {/* HEADER HALAMAN */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white">Manajemen Bidang & UPT</h1>
          <p className="text-sm text-slate-400 mt-1">Kelola Organisasi di lingkungan DPUPKP</p>
        </div>
        {isSuperAdmin && (
          <button onClick={() => setIsAddModalOpen(true)} className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-900/20 w-full md:w-auto">
            <Plus size={18} /> Tambah Bidang/UPT
          </button>
        )}
      </div>

      {/* TOOLBAR: SEARCH & VIEW TOGGLE (Identik dengan Menu Barang) */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-[#1e293b] p-2.5 rounded-xl border border-slate-700 shadow-sm">
        <div className="relative w-full md:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Cari nama organisasi atau tipe..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#0f172a] border border-slate-600 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
          />
        </div>
        <div className="flex bg-[#0f172a] border border-slate-600 rounded-lg p-1 w-full md:w-auto justify-center">
          <button onClick={() => setViewMode('grid')} className={`p-1.5 px-4 rounded-md flex items-center gap-2 transition-all ${viewMode === 'grid' ? 'bg-emerald-500 text-slate-900 shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <LayoutGrid size={16} /> <span className="text-xs font-bold md:hidden">Grid</span>
          </button>
          <button onClick={() => setViewMode('list')} className={`p-1.5 px-4 rounded-md flex items-center gap-2 transition-all ${viewMode === 'list' ? 'bg-emerald-500 text-slate-900 shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <List size={16} /> <span className="text-xs font-bold md:hidden">List</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12 text-emerald-400"><Loader2 className="animate-spin" size={32} /></div>
      ) : dataBidang.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-[#1e293b] border border-slate-700 border-dashed rounded-2xl text-slate-400 shadow-lg">
          <Building2 size={48} className="mb-4 text-slate-600" />
          <p className="text-lg font-bold text-slate-300">Belum ada data Bidang/UPT</p>
          <p className="text-sm mt-1 text-slate-500">Silakan klik tombol tambah untuk memasukkan data organisasi.</p>
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredBidang.map((item) => (
                <div key={item.id} className="bg-[#1e293b] border border-slate-700 rounded-2xl p-5 hover:border-slate-500 transition-colors group relative shadow-lg flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-emerald-500/10 p-3 rounded-xl text-emerald-400"><Building2 size={24} /></div>
                  </div>
                  <h3 className="text-lg font-black text-white mb-1 leading-tight">{item.nama || '-'}</h3>
                  <div className="flex items-center gap-2 mt-2 mb-4">
                    <span className="bg-slate-800 border border-slate-600 px-2 py-1 rounded text-[10px] uppercase font-bold text-slate-300">{item.tipe || '-'}</span>
                  </div>
                  
                  {/* AKSI GRID: Tombol dirapikan sejajar ke kanan menggunakan ikon */}
                  <div className="mt-auto pt-4 border-t border-slate-700/80 flex items-center justify-end gap-2">
                     <button onClick={() => handleViewGudangBidang(item)} className="p-2 bg-slate-800 text-amber-400 hover:bg-amber-500/20 rounded-lg transition-colors border border-slate-700 hover:border-amber-500/30" title="Daftar Gudang"><Warehouse size={16} /></button>
                     <Link href={`/bidang/${item.id}`} className="p-2 bg-slate-800 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors border border-slate-700 hover:border-blue-500/30" title="Aset Instansi"><Package size={16} /></Link>
                     {isSuperAdmin && (
                       <>
                        <button onClick={() => openEditModal(item)} className="p-2 bg-slate-800 text-slate-300 hover:text-emerald-400 rounded-lg transition-colors border border-slate-700 hover:border-emerald-500/30" title="Edit Data"><Edit size={16} /></button>
                        <button onClick={() => openDeleteModal(item)} className="p-2 bg-slate-800 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors border border-slate-700 hover:border-red-500/30" title="Hapus Data"><Trash2 size={16} /></button>
                       </>
                     )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[#1e293b] rounded-2xl border border-slate-700 overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300 border-collapse whitespace-nowrap">
                  <thead className="bg-[#0f172a] text-slate-400 text-[10px] uppercase font-bold">
                    <tr><th className="px-6 py-4 border-b border-slate-700">Nama Organisasi</th><th className="px-6 py-4 border-b border-slate-700">Tipe</th><th className="px-6 py-4 border-b border-slate-700 text-center">Aksi</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {filteredBidang.map((item) => (
                      <tr key={item.id} className="hover:bg-[#253243] transition-colors">
                        <td className="px-6 py-4 font-bold text-white flex items-center gap-3"><Building2 size={16} className="text-emerald-400" />{item.nama || '-'}</td>
                        <td className="px-6 py-4"><span className="bg-slate-800 border border-slate-700 text-[10px] font-bold px-2 py-1 rounded text-slate-300">{item.tipe || '-'}</span></td>
                        
                        {/* AKSI LIST: Tombol disejajarkan di tengah menggunakan ikon */}
                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center gap-2">
                            <button onClick={() => handleViewGudangBidang(item)} className="p-1.5 bg-slate-800 text-amber-400 hover:bg-amber-500/20 rounded-md transition-colors border border-slate-700" title="Daftar Gudang"><Warehouse size={16} /></button>
                            <Link href={`/bidang/${item.id}`} className="p-1.5 bg-slate-800 text-blue-400 hover:bg-blue-500/20 rounded-md transition-colors border border-slate-700" title="Aset Instansi"><Package size={16} /></Link>
                            {isSuperAdmin && (
                              <>
                                <button onClick={() => openEditModal(item)} className="p-1.5 bg-slate-800 text-slate-300 hover:text-emerald-400 transition-colors border border-slate-700 rounded-md" title="Edit Data"><Edit size={16} /></button>
                                <button onClick={() => openDeleteModal(item)} className="p-1.5 bg-slate-800 text-red-400 hover:bg-red-500/20 transition-colors border border-slate-700 rounded-md" title="Hapus Data"><Trash2 size={16} /></button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {filteredBidang.length === 0 && (
            <div className="text-center py-16 bg-[#1e293b] rounded-2xl border border-slate-700/50">
              <p className="text-slate-400 font-semibold">Tidak ada data yang cocok dengan pencarian.</p>
            </div>
          )}
        </>
      )}

      {/* --- MODAL TAMBAH DATA --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#1e293b] rounded-2xl border border-slate-700 w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-700 bg-[#0f172a]">
              <h2 className="text-base font-bold text-white">Tambah Organisasi Baru</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white transition-colors bg-slate-800 p-1.5 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleTambahSubmit} className="p-6 space-y-5">
              <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Nama Bidang / UPT *</label><input type="text" required value={addFormData.nama} onChange={(e) => setAddFormData({...addFormData, nama: e.target.value})} className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors" placeholder="Contoh: Bidang Bina Marga" /></div>
              <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tipe Organisasi</label><select value={addFormData.tipe} onChange={(e) => setAddFormData({...addFormData, tipe: e.target.value})} className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 appearance-none cursor-pointer"><option value="Sekretariat">Sekretariat</option><option value="Bidang">Bidang</option><option value="UPT">UPT</option></select></div>
              <div className="pt-4 flex gap-3"><button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-slate-300 hover:text-white transition-colors">Batal</button><button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-xl text-sm font-black transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50">{isSubmitting ? 'Menyimpan...' : 'Simpan Data'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL EDIT DATA --- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#1e293b] rounded-2xl border border-slate-700 w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-700 bg-[#0f172a]">
              <h2 className="text-base font-bold text-white">Edit Organisasi</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white transition-colors bg-slate-800 p-1.5 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-5">
              <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Nama Bidang / UPT *</label><input type="text" required value={editFormData.nama} onChange={(e) => setEditFormData({...editFormData, nama: e.target.value})} className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors" /></div>
              <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tipe Organisasi</label><select value={editFormData.tipe} onChange={(e) => setEditFormData({...editFormData, tipe: e.target.value})} className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 appearance-none cursor-pointer"><option value="Sekretariat">Sekretariat</option><option value="Bidang">Bidang</option><option value="UPT">UPT</option></select></div>
              <div className="pt-4 flex gap-3"><button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-slate-300 hover:text-white transition-colors">Batal</button><button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-xl text-sm font-black transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50">{isSubmitting ? 'Memperbarui...' : 'Simpan Perubahan'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL KONFIRMASI HAPUS --- */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#1e293b] rounded-2xl border border-slate-700 w-full max-w-sm shadow-2xl overflow-hidden p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-500/10 mb-5 border border-red-500/20"><AlertTriangle className="h-8 w-8 text-red-500" /></div>
            <h3 className="text-xl font-black text-white mb-2">Hapus Organisasi?</h3>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">Sistem akan memblokir proses ini jika instansi <strong>{deleteData?.nama}</strong> masih memiliki gudang/pegawai.</p>
            
            <div className="text-left mb-6">
              <label className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                <Key size={14} className="text-amber-500"/> Password Super Admin
              </label>
              <input 
                type="password" 
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Verifikasi password Anda..."
                className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500 transition-colors placeholder:text-slate-600"
                autoComplete="new-password"
              />
            </div>

            <div className="flex gap-3 justify-center">
              <button onClick={() => {setIsDeleteModalOpen(false); setDeletePassword('');}} className="flex-1 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-slate-300 hover:text-white transition-colors">Batal</button>
              <button onClick={executeDelete} disabled={isSubmitting || !deletePassword} className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-black transition-all shadow-lg shadow-red-900/20 disabled:opacity-50 flex justify-center items-center gap-2">
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
                {isSubmitting ? 'Memproses' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL QUICK VIEW GUDANG --- */}
      {viewGudang.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}>
          <div className="bg-[#1e293b] border border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-700 bg-[#0f172a] rounded-t-2xl">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2"><Warehouse className="text-amber-500" /> Daftar Gudang {viewGudang.title}</h3>
                <p className="text-xs text-slate-400 mt-1">Daftar lokasi fisik yang dikelola oleh instansi ini.</p>
              </div>
              <button onClick={() => setViewGudang({ isOpen: false, loading: false, title: "", data: [] })} className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-lg transition-colors"><X size={20} /></button>
            </div>
            
            <div className="p-0 overflow-y-auto flex-1 custom-scrollbar bg-[#0f172a]/50">
              {viewGudang.loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-amber-500">
                  <Loader2 className="animate-spin mb-3" size={32} />
                  <p className="text-sm font-bold text-slate-300">Menarik daftar gudang...</p>
                </div>
              ) : viewGudang.data.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-60">
                  <Warehouse size={64} className="text-slate-600 mb-4" />
                  <p className="text-lg font-bold text-slate-400">Instansi ini belum memiliki gudang.</p>
                </div>
              ) : (
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="bg-[#1e293b] text-slate-400 font-bold uppercase text-[10px] sticky top-0 border-b border-slate-700 shadow-sm">
                    <tr>
                      <th className="px-6 py-4">Nama Gudang</th>
                      <th className="px-6 py-4">Keterangan / Lokasi</th>
                      <th className="px-6 py-4 text-right">Cek Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {viewGudang.data.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/50 transition-colors group">
                        <td className="px-6 py-4">
                          <Link href={`/gudang/${item.id}`} className="font-bold text-white flex items-center gap-2 hover:text-amber-400 transition-colors">
                            <Warehouse size={16} className="text-amber-500" /> {item.nama}
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-slate-400">{item.keterangan || "Tidak ada keterangan"}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link href={`/gudang/${item.id}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border border-amber-500/20">
                            <ExternalLink size={12} /> Cek Isi
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-700 bg-[#1e293b] rounded-b-2xl flex justify-between items-center">
              <p className="text-xs font-bold text-slate-400">Total: <span className="text-white">{viewGudang.data.length} lokasi gudang</span></p>
              <button onClick={() => setViewGudang({ isOpen: false, loading: false, title: "", data: [] })} className="px-5 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold transition-colors">Tutup Jendela</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
