"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../src/lib/supabase";
import { getPegawai } from "../../src/lib/auth";
import { ShieldAlert, Power, Loader2, Lock, X, CheckCircle2, AlertTriangle } from "lucide-react";

export default function PengaturanSistem() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // State untuk Custom Modal Konfirmasi
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [password, setPassword] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  // State untuk Alert Pesan Sukses
  const [alertMsg, setAlertMsg] = useState("");

  useEffect(() => {
    checkAccess();
  }, []);

  async function checkAccess() {
    const user = await getPegawai();
    if (!user || String(user.role).toLowerCase() !== 'superadmin') {
      window.location.href = "/";
      return;
    }
    setIsAdmin(true);
    
    // Ambil data user dari Supabase Auth untuk verifikasi password nanti
    const { data: { user: authUser } } = await supabase.auth.getUser();
    setCurrentUser(authUser);
    
    const { data } = await supabase.from('pengaturan_sistem').select('maintenance_mode').eq('id', 1).single();
    if (data) setIsMaintenance(data.maintenance_mode);
    setLoading(false);
  }

  const handleToggleClick = () => {
    setPassword("");
    setErrorMsg("");
    setShowConfirmModal(true);
  };

  const executeToggle = async () => {
    if (!password) {
      setErrorMsg("Password tidak boleh kosong!");
      return;
    }

    setVerifying(true);
    setErrorMsg("");

    // Verifikasi password dengan mencoba Sign-In ulang
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: currentUser.email,
      password: password,
    });

    if (authError) {
      setErrorMsg("Password salah! Verifikasi gagal.");
      setVerifying(false);
      return;
    }

    // Jika password benar, ubah status maintenance
    const newState = !isMaintenance;
    const { error: dbError } = await supabase.from('pengaturan_sistem').update({ maintenance_mode: newState, updated_at: new Date() }).eq('id', 1);
    
    if (!dbError) {
      setIsMaintenance(newState);
      setShowConfirmModal(false);
      setAlertMsg(newState ? "Mode Maintenance diaktifkan. User lain telah terblokir." : "Mode Maintenance dimatikan. Sistem kembali normal.");
      setTimeout(() => setAlertMsg(""), 4000);
    } else {
      setErrorMsg("Gagal menyimpan pengaturan ke database.");
    }
    setVerifying(false);
  };

  if (loading) return <div className="h-screen flex justify-center items-center"><Loader2 className="animate-spin text-amber-500" size={40} /></div>;
  if (!isAdmin) return null;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6 animate-in fade-in">
      <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2 mb-8">
        <ShieldAlert className="text-amber-500" /> Pengaturan Sistem
      </h1>

      {alertMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 size={24} />
          <p className="font-bold text-sm">{alertMsg}</p>
        </div>
      )}

      <div className={`p-6 md:p-8 rounded-3xl border shadow-xl transition-colors duration-500 ${isMaintenance ? 'bg-amber-100 dark:bg-amber-950/20 border-amber-500/50' : 'bg-white dark:bg-[#1e293b] border-slate-200 dark:border-slate-700'}`}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
              Status Sistem: 
              {isMaintenance ? <span className="text-amber-600 dark:text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full text-sm">MAINTENANCE MODE</span> : <span className="text-emerald-600 dark:text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full text-sm">ONLINE (NORMAL)</span>}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              Gunakan mode ini jika Anda ingin melakukan import data massal, menghapus database, atau memperbaiki relasi tabel. Saat mode ini aktif, <strong>hanya Anda (Super Admin)</strong> yang dapat mengakses sistem ini.
            </p>
          </div>

          <button 
            onClick={handleToggleClick}
            className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-black transition-all shadow-lg text-lg ${isMaintenance ? 'bg-slate-800 text-white hover:bg-slate-700 border border-slate-600' : 'bg-amber-500 text-slate-900 hover:bg-amber-400 shadow-amber-500/20'}`}
          >
            <Power size={24} />
            {isMaintenance ? "Matikan Maintenance" : "Aktifkan Maintenance"}
          </button>
        </div>
      </div>

      {/* --- CUSTOM MODAL KONFIRMASI PASSWORD --- */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#1e293b] p-6 md:p-8 rounded-3xl shadow-2xl max-w-sm w-full border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 relative">
            <button 
              onClick={() => setShowConfirmModal(false)} 
              className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-700 dark:hover:text-white transition"
            >
              <X size={18} />
            </button>
            
            <div className={`flex items-center gap-3 mb-6 ${isMaintenance ? 'text-blue-500' : 'text-amber-500'}`}>
              <AlertTriangle size={32} />
              <h3 className="text-xl font-black text-slate-800 dark:text-white">
                {isMaintenance ? "Matikan Maintenance" : "Aktifkan Maintenance"}
              </h3>
            </div>
            
            <div className="space-y-4 mb-6">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {isMaintenance 
                  ? "Sistem akan kembali normal dan pengguna dapat mengakses kembali aplikasi." 
                  : "Semua pengguna selain Super Admin akan langsung terblokir dari aplikasi."}
              </p>
              
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Verifikasi Password Anda</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && executeToggle()}
                    placeholder="Masukkan password Anda..."
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    autoFocus
                  />
                </div>
                {errorMsg && <p className="text-xs text-red-500 font-bold mt-2 animate-bounce">{errorMsg}</p>}
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowConfirmModal(false)} 
                className="flex-1 py-3 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Batal
              </button>
              <button 
                onClick={executeToggle} 
                disabled={verifying}
                className={`flex-1 py-3 rounded-xl text-sm font-bold shadow-lg transition flex items-center justify-center gap-2 ${isMaintenance ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20' : 'bg-amber-500 hover:bg-amber-400 text-slate-900 shadow-amber-900/20'}`}
              >
                {verifying ? <Loader2 className="animate-spin" size={18} /> : "Konfirmasi"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
