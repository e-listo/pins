"use client";

import React, { useState, useEffect } from 'react';
import {
  UserPlus, Search, Edit, Shield, Mail, IdCard, Building,
  Loader2, X, CheckCircle2, Trash2, KeyRound, Eye, EyeOff, LayoutGrid, List as ListIcon, Plus
} from 'lucide-react';
import { ROLE, ROLE_OPTIONS, roleBadge, isAdminGudang } from '../lib/roles';
import { supabase } from '../lib/supabase';
import { resetPasswordByAdmin, registerUser, getPegawai } from '../lib/auth';

const inputCls = "w-full border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] transition-colors placeholder:text-slate-600 disabled:opacity-50 disabled:bg-slate-800 disabled:cursor-not-allowed";
const selectCls = inputCls + " cursor-pointer appearance-none";

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}>
      <div className="bg-[#1e293b] border border-slate-700 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 custom-scrollbar">
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

export default function UserManagement() {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [bidangList, setBidangList] = useState([]);
  const [gudangList, setGudangList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState("list");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const [pwdModal, setPwdModal] = useState({
    isOpen: false, user: null, isSelf: false, oldPwd: '', newPwd: '', confirmPwd: '', showPwd: false, isSubmitting: false
  });

  const [formData, setFormData] = useState({
    nama: '', nip: '', email: '', jabatan: '', role: ROLE.ADMIN_BIDANG, label_peran: '', hanya_baca: false,
    bidang_id: '', gudang_ids: [], status: 'Aktif'
  });

  // Peran teknis (menentukan CAKUPAN data) - harus cocok dengan
  // constraint pegawai_role_check di database.
  const roles = ROLE_OPTIONS;

  // Label jabatan fungsional (kosmetik, bebas). Verifikator dibuat dengan
  // memilih peran cakupan + mencentang "Hanya baca".
  const labelPeranUmum = ['Pengurus Barang', 'Pengurus Barang Pembantu', 'Admin Gudang', 'Verifikator', 'Verifikator Utama'];

  useEffect(() => { init(); }, []);

  const init = async () => {
    const user = await getPegawai();
    setCurrentUser(user);
    fetchData();
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: dataPegawai, error: errPegawai } = await supabase
        .from('pegawai')
        .select('*, bidang_upt (nama), operator_gudang (gudang (id, nama, bidang_id))')
        .order('nama', { ascending: true });
      if (errPegawai) throw errPegawai;

      const { data: dataBidang } = await supabase.from('bidang_upt').select('*').order('nama', { ascending: true });
      const { data: dataGudang } = await supabase.from('gudang').select('*').order('nama', { ascending: true });

      setUsers(dataPegawai || []);
      setBidangList(dataBidang || []);
      setGudangList(dataGudang || []);
    } catch (error) {
      console.error('Error fetching data:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let savedPegawaiId = selectedUser?.id;
      const payload = {
        nama: formData.nama, nip: formData.nip, email: formData.email || `${formData.nip}@pupkp.local`,
        jabatan: formData.jabatan, role: formData.role, label_peran: formData.label_peran || null,
        hanya_baca: !!formData.hanya_baca, bidang_id: formData.bidang_id || null, status: formData.status
      };

      if (selectedUser) {
        const { error } = await supabase.from('pegawai').update(payload).eq('id', selectedUser.id);
        if (error) throw error;
      } else {
        try {
          const defaultPassword = "Password123!";
          const authRes = await registerUser(formData.nip, defaultPassword, formData.nama);
          payload.auth_id = authRes.id;
          const { data, error } = await supabase.from('pegawai').insert([payload]).select().single();
          if (error) throw error;
          savedPegawaiId = data.id;
          alert(`User berhasil dibuat!\nNIP: ${formData.nip}\nPassword Default: ${defaultPassword}`);
        } catch (authErr) {
           throw new Error("Gagal mendaftarkan ke sistem Login: " + authErr.message);
        }
      }

      if (formData.role === ROLE.ADMIN_GUDANG) {
        await supabase.from('operator_gudang').delete().eq('pegawai_id', savedPegawaiId);
        if (formData.gudang_ids.length > 0) {
          const relasiGudang = formData.gudang_ids.map(gId => ({ pegawai_id: savedPegawaiId, gudang_id: gId }));
          const { error: errRelasi } = await supabase.from('operator_gudang').insert(relasiGudang);
          if (errRelasi) throw errRelasi;
        }
      } else if (selectedUser && isAdminGudang(selectedUser) && formData.role !== ROLE.ADMIN_GUDANG) {
        await supabase.from('operator_gudang').delete().eq('pegawai_id', savedPegawaiId);
      }

      setIsModalOpen(false);
      setSelectedUser(null);
      fetchData();
    } catch (error) {
      alert('Gagal menyimpan pengguna: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openPwdModal = (user) => {
    const isSelf = currentUser && currentUser.id === user.id;
    setPwdModal({ isOpen: true, user, isSelf, oldPwd: '', newPwd: '', confirmPwd: '', showPwd: false, isSubmitting: false });
  };

  const handlePwdSubmit = async (e) => {
    e.preventDefault();
    if (pwdModal.newPwd !== pwdModal.confirmPwd) return alert("Konfirmasi password tidak cocok!");
    if (pwdModal.newPwd.length < 6) return alert("Password minimal 6 karakter!");

    setPwdModal(prev => ({ ...prev, isSubmitting: true }));
    try {
      if (pwdModal.isSelf) {
        const email = `${pwdModal.user.nip}@pupkp.local`;
        const { error: verifyErr } = await supabase.auth.signInWithPassword({ email, password: pwdModal.oldPwd });
        if (verifyErr) throw new Error("Password Lama yang Anda masukkan salah.");
        const { error: updateErr } = await supabase.auth.updateUser({ password: pwdModal.newPwd });
        if (updateErr) throw new Error("Gagal mengupdate password.");
      } else {
        if (!pwdModal.user.auth_id) throw new Error("User ini tidak memiliki auth_id. Tidak bisa direset.");
        await resetPasswordByAdmin(pwdModal.user.auth_id, pwdModal.newPwd);
      }
      alert("Password berhasil diubah!");
      setPwdModal(prev => ({ ...prev, isOpen: false }));
    } catch (error) {
      alert(error.message);
    } finally {
      setPwdModal(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleDelete = async (user) => {
    const isConfirmed = window.confirm(`Yakin ingin menghapus ${user.nama} secara permanen?`);
    if (!isConfirmed) return;
    try {
      const { error } = await supabase.from('pegawai').delete().eq('id', user.id);
      if (error) {
        if (error.code === '23503') {
          alert(`Info: ${user.nama} sudah memiliki riwayat transaksi sehingga tidak bisa dihapus permanen.\nSistem akan mengubah statusnya menjadi "Nonaktif".`);
          await supabase.from('pegawai').update({ status: 'Nonaktif' }).eq('id', user.id);
        } else throw error;
      } else {
        alert("User berhasil dihapus permanen.");
      }
      fetchData();
    } catch (err) {
      alert("Terjadi kesalahan saat menghapus: " + err.message);
    }
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    const userGudangIds = user.operator_gudang?.map(og => og.gudang?.id).filter(Boolean) || [];
    setFormData({
      nama: user.nama || '', nip: user.nip || '', email: user.email || '', jabatan: user.jabatan || '',
      role: user.role || ROLE.ADMIN_BIDANG, label_peran: user.label_peran || '', hanya_baca: !!user.hanya_baca,
      bidang_id: user.bidang_id || '', gudang_ids: userGudangIds, status: user.status || 'Aktif'
    });
    setIsModalOpen(true);
  };

  const filteredUsers = users.filter(user =>
    user.nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.nip?.includes(searchTerm) || user.jabatan?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 pb-20 max-w-7xl mx-auto">
      
      {/* HEADER HALAMAN */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white">Manajemen User</h1>
          <p className="text-sm text-slate-400 mt-1">Kelola profil, jabatan, dan hak akses otorisasi pegawai DPUPKP</p>
        </div>
        <button
          onClick={() => {
            setSelectedUser(null);
            setFormData({ nama: '', nip: '', email: '', jabatan: '', role: ROLE.ADMIN_BIDANG, label_peran: '', hanya_baca: false, bidang_id: '', gudang_ids: [], status: 'Aktif' });
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-900/20 w-full md:w-auto"
        >
          <Plus size={18} strokeWidth={2.5} /> Tambah User Baru
        </button>
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-[#1e293b] p-2.5 rounded-xl border border-slate-700 shadow-sm">
        <div className="flex w-full lg:w-auto flex-col md:flex-row gap-3 items-center flex-1">
          <div className="relative w-full md:max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search size={16} className="text-slate-400" /></div>
            <input 
              type="text" placeholder="Cari nama, NIP, atau jabatan..." 
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full pl-9 pr-4 py-2 bg-[#0f172a] border border-slate-600 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors" 
            />
          </div>
        </div>
        <div className="flex w-full md:w-auto justify-center lg:justify-end">
          <div className="flex bg-[#0f172a] border border-slate-600 rounded-lg p-1 w-full md:w-auto justify-center">
            <button onClick={() => setViewMode('grid')} className={`p-1.5 px-4 rounded-md flex items-center gap-2 transition-all ${viewMode === 'grid' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`} title="Tampilan Grid"><LayoutGrid size={16} /> <span className="text-xs font-bold md:hidden">Grid</span></button>
            <button onClick={() => setViewMode('list')} className={`p-1.5 px-4 rounded-md flex items-center gap-2 transition-all ${viewMode === 'list' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`} title="Tampilan List"><ListIcon size={16} /> <span className="text-xs font-bold md:hidden">List</span></button>
          </div>
        </div>
      </div>

      {/* KONTEN */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12 text-emerald-500"><Loader2 className="animate-spin" size={32} /></div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-20 bg-[#1e293b] rounded-2xl border border-slate-700 border-dashed">
          <p className="text-slate-400">Tidak ada pegawai yang ditemukan.</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* TAMPILAN GRID (KARTU) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredUsers.map((user) => {
            const isSelf = currentUser && currentUser.id === user.id;
            return (
              <div key={user.id} className={`bg-[#1e293b] rounded-2xl border p-5 flex flex-col transition-all shadow-lg group relative ${isSelf ? 'border-emerald-500/50 shadow-emerald-900/10' : 'border-slate-700 hover:border-slate-500'}`}>
                
                <div className="flex items-start gap-4 mb-4">
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center font-black text-lg border-2 shrink-0 ${isSelf ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/50' : 'bg-[#0f172a] text-slate-300 border-slate-600'}`}>
                    {user.nama?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="font-bold text-white text-base truncate flex items-center gap-2">
                      {user.nama} {isSelf && <span className="text-[9px] bg-emerald-500 text-slate-900 px-1.5 py-0.5 rounded uppercase tracking-widest font-black">Anda</span>}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{user.jabatan || 'Pegawai'}</p>
                  </div>
                </div>

                <div className="space-y-2 mb-6 flex-1">
                  <div className="flex items-center gap-2 text-xs text-slate-400"><IdCard size={14} className="text-slate-500"/> <span className="font-mono">{user.nip || '-'}</span></div>
                  <div className="flex items-center gap-2 text-xs text-slate-400"><Building size={14} className="text-slate-500"/> <span className="truncate">{user.bidang_upt?.nama || 'Lintas Bidang'}</span></div>
                  <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-slate-700/50">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 bg-[#0f172a] px-2 py-1 rounded-md border border-slate-600 flex items-center gap-1.5">
                      <Shield size={12} className={user.role === 'superadmin' ? 'text-amber-500' : 'text-blue-500'} /> {roleBadge(user).label}{user.hanya_baca ? ' (hanya baca)' : ''}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${user.status === 'Aktif' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                      {user.status}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-700/80 mt-auto">
                  <button onClick={() => openPwdModal(user)} className="p-2 bg-[#0f172a] text-amber-500 hover:bg-amber-500/20 rounded-lg transition-colors border border-slate-700" title="Ganti / Reset Password">
                    <KeyRound size={16} />
                  </button>
                  {!isSelf && (
                    <>
                      <button onClick={() => openEditModal(user)} className="p-2 bg-[#0f172a] text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors border border-slate-700" title="Edit Profil & Akses">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDelete(user)} className="p-2 bg-slate-800 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors border border-slate-700" title="Hapus Akun">
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        /* TAMPILAN LIST (TABEL) */
        <div className="bg-[#1e293b] rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300 whitespace-nowrap">
              <thead className="bg-[#0f172a] text-slate-400 text-[10px] uppercase font-bold tracking-wider border-b border-slate-700">
                <tr>
                  <th className="px-6 py-4">Profil Pegawai</th>
                  <th className="px-6 py-4">Identitas & Kontak</th>
                  <th className="px-6 py-4">Penempatan</th>
                  <th className="px-6 py-4">Hak Akses</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredUsers.map((user) => {
                  const isSelf = currentUser && currentUser.id === user.id;
                  return (
                    <tr key={user.id} className={`${isSelf ? 'bg-emerald-500/5' : 'hover:bg-[#253243]'} transition-colors`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center font-black border-2 shrink-0 ${isSelf ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/50' : 'bg-[#0f172a] text-slate-300 border-slate-600'}`}>
                            {user.nama?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="font-bold text-white flex items-center gap-2">
                              {user.nama} {isSelf && <span className="text-[9px] bg-emerald-500 text-slate-900 px-1.5 py-0.5 rounded uppercase font-black tracking-widest">Anda</span>}
                            </p>
                            {user.jabatan && <p className="text-[11px] text-slate-400 mt-0.5">{user.jabatan}</p>}
                            <span className={`inline-flex items-center text-[9px] uppercase tracking-wider px-2 py-0.5 mt-1.5 rounded-full font-bold border ${user.status === 'Aktif' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                              {user.status}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col space-y-1.5 text-xs">
                          <span className="flex items-center gap-1.5 text-slate-300 font-mono"><IdCard size={14} className="text-slate-500"/> {user.nip || '-'}</span>
                          <span className="flex items-center gap-1.5 text-slate-400"><Mail size={14} className="text-slate-500"/> {user.email || 'By System'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-2 text-slate-300 font-semibold text-xs">
                          <Building size={14} className="text-slate-500" />
                          {user.bidang_upt?.nama || <span className="italic text-slate-500">Lintas Bidang</span>}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-300 bg-[#0f172a] px-2 py-1.5 rounded-lg border border-slate-600">
                          <Shield size={12} className={user.role === 'superadmin' ? 'text-amber-500' : 'text-blue-500'} /> {roleBadge(user).label}{user.hanya_baca ? ' (hanya baca)' : ''}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => openPwdModal(user)} className="p-1.5 bg-[#0f172a] rounded-md text-amber-500 hover:bg-amber-500/20 transition-colors border border-slate-700" title="Ganti Password">
                            <KeyRound size={16} />
                          </button>
                          {!isSelf && (
                            <>
                              <button onClick={() => openEditModal(user)} className="p-1.5 bg-[#0f172a] rounded-md text-blue-400 hover:bg-blue-500/20 transition-colors border border-slate-700" title="Edit Profil">
                                <Edit size={16} />
                              </button>
                              <button onClick={() => handleDelete(user)} className="p-1.5 bg-slate-800 rounded-md text-red-400 hover:bg-red-500/20 transition-colors border border-slate-700" title="Hapus User">
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH/EDIT PEGAWAI */}
      {isModalOpen && (
        <Modal title={selectedUser ? 'Edit Hak Akses Pegawai' : 'Registrasi Pegawai Baru'} onClose={() => setIsModalOpen(false)}>
          <form id="userForm" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Field label="Nama Lengkap Pegawai *">
                  <input required type="text" value={formData.nama} onChange={(e) => setFormData({...formData, nama: e.target.value})} className={inputCls} />
                </Field>
              </div>
              <Field label="Nomor Induk Pegawai (NIP) *">
                <input required type="text" value={formData.nip} onChange={(e) => setFormData({...formData, nip: e.target.value})} className={inputCls} disabled={!!selectedUser} />
              </Field>
              <Field label="Status Pegawai *">
                <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className={selectCls}>
                  <option value="Aktif">Aktif</option><option value="Nonaktif">Nonaktif / Pindah</option>
                </select>
              </Field>
              <div className="col-span-2">
                <Field label="Jabatan Kedinasan">
                  <input type="text" value={formData.jabatan} onChange={(e) => setFormData({...formData, jabatan: e.target.value})} placeholder="Contoh: Kepala UPT / Kasubbag TU" className={inputCls} />
                </Field>
              </div>
              <Field label="Hak Akses (Role) *">
                <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className={selectCls}>
                  {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </Field>
              <Field label="Label Peran (tampilan)">
                <input list="daftar-label-peran" type="text" value={formData.label_peran}
                  onChange={(e) => setFormData({...formData, label_peran: e.target.value})}
                  placeholder="Contoh: Verifikator Utama" className={inputCls} />
                <datalist id="daftar-label-peran">
                  {labelPeranUmum.map(l => <option key={l} value={l} />)}
                </datalist>
              </Field>
              <div className="col-span-2">
                <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-700 bg-slate-800/40 cursor-pointer">
                  <input type="checkbox" checked={formData.hanya_baca} className="mt-0.5"
                    onChange={(e) => setFormData({...formData, hanya_baca: e.target.checked})} />
                  <span>
                    <span className="block text-sm font-semibold">Hanya baca (pengawasan)</span>
                    <span className="block text-[11px] text-slate-400 mt-0.5">
                      Pengguna tetap melihat seluruh data sesuai cakupan perannya, tetapi tidak dapat
                      menambah, mengubah, atau menghapus apa pun. Gunakan untuk Verifikator dan Verifikator Utama.
                    </span>
                  </span>
                </label>
              </div>
              <Field label="Unit Bidang / UPT Penempatan">
                <select value={formData.bidang_id} onChange={(e) => setFormData({...formData, bidang_id: e.target.value, gudang_ids: []})} className={selectCls}>
                  <option value="">-- Administrator (Lintas Bidang) --</option>
                  {bidangList.map(b => <option key={b.id} value={b.id}>{b.nama}</option>)}
                </select>
              </Field>
              
              {formData.role === ROLE.ADMIN_GUDANG && (
                <div className="col-span-2">
                  <Field label="Akses Operasional Gudang (Pilih Minimal 1) *">
                    <select multiple className={selectCls + " h-24"} value={formData.gudang_ids} onChange={(e) => {
                      const options = [...e.target.selectedOptions];
                      setFormData({...formData, gudang_ids: options.map(o => o.value)});
                    }} required>
                      {gudangList.filter(g => !formData.bidang_id || g.bidang_id === formData.bidang_id).map(g => (
                        <option key={g.id} value={g.id}>{g.nama}</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-500 mt-1 italic">Tahan tombol Ctrl (Windows) / Cmd (Mac) untuk memilih lebih dari satu gudang.</p>
                  </Field>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-700 mt-6">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-sm font-bold transition-colors border border-slate-700">Batal</button>
              <button type="submit" disabled={isSubmitting} className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-black transition-all disabled:opacity-50 shadow-lg shadow-emerald-900/20">
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={18} />} Simpan Profil
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL RESET / GANTI PASSWORD */}
      {pwdModal.isOpen && (
        <Modal title={pwdModal.isSelf ? 'Ganti Password Keamanan' : 'Reset Password Pengguna'} onClose={() => setPwdModal(prev => ({...prev, isOpen: false}))}>
          <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl text-amber-400 text-xs leading-relaxed mb-6">
             {pwdModal.isSelf ? "Demi keamanan, masukkan password lama Anda sebelum mengatur password baru." : `Peringatan: Anda akan memaksa pengaturan ulang password milik ${pwdModal.user?.nama}.`}
          </div>
          <form id="pwdForm" onSubmit={handlePwdSubmit} className="space-y-4">
            {pwdModal.isSelf && (
              <Field label="Password Lama Saat Ini">
                <div className="relative">
                  <input type={pwdModal.showPwd ? "text" : "password"} required value={pwdModal.oldPwd} onChange={e => setPwdModal(prev => ({...prev, oldPwd: e.target.value}))} className={inputCls} />
                  <button type="button" onClick={() => setPwdModal(prev => ({...prev, showPwd: !prev.showPwd}))} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                    {pwdModal.showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>
            )}
            <Field label="Password Baru">
              <div className="relative">
                <input type={pwdModal.showPwd ? "text" : "password"} required minLength={6} value={pwdModal.newPwd} onChange={e => setPwdModal(prev => ({...prev, newPwd: e.target.value}))} className={inputCls} />
                {!pwdModal.isSelf && (
                  <button type="button" onClick={() => setPwdModal(prev => ({...prev, showPwd: !prev.showPwd}))} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                    {pwdModal.showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                )}
              </div>
            </Field>
            <Field label="Ketik Ulang Password Baru">
              <input type={pwdModal.showPwd ? "text" : "password"} required minLength={6} value={pwdModal.confirmPwd} onChange={e => setPwdModal(prev => ({...prev, confirmPwd: e.target.value}))} className={inputCls} />
            </Field>
            <div className="flex gap-3 pt-4 border-t border-slate-700 mt-6">
              <button type="submit" disabled={pwdModal.isSubmitting} className="w-full flex justify-center items-center gap-2 py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-xl text-sm font-black transition-all disabled:opacity-50 shadow-lg shadow-amber-900/20">
                {pwdModal.isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />} Eksekusi Password Baru
              </button>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
}
