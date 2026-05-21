"use client";
import { useState } from "react";
import { supabase } from "../../src/lib/supabase";

export default function Login() {
  const [nip, setNip] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: `${nip}@pupkp.local`, password: password });
      if (error) throw error;
      window.location.href = "/";
    } catch (error) {
      alert("Gagal masuk: Periksa kembali NIP dan Password Anda!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-amber-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>

      <div className="bg-[#1e293b] border border-slate-700 w-full max-w-md rounded-3xl shadow-2xl p-8 relative z-10">
        
        {/* HEADER LOGIN DENGAN LOGO BARU */}
        <div className="text-center mb-8 flex flex-col items-center">
          <img src="/logo.png" alt="Logo PINS" className="w-56 md:w-64 h-auto object-contain mb-4 drop-shadow-lg" />
          <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-[260px]">
            Dinas Pekerjaan Umum, Perumahan dan Kawasan Permukiman Kota Yogyakarta
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">NIP ASN</label>
            <input type="text" className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all" placeholder="Masukkan NIP Anda" value={nip} onChange={(e) => setNip(e.target.value)} required />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Password</label>
            <div className="relative">
              <input type={showPwd ? "text" : "password"} className="w-full bg-[#0f172a] border border-slate-700 rounded-xl pl-4 pr-24 py-3.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all" placeholder="Masukkan password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-white transition-colors">{showPwd ? "Sembunyikan" : "Tampilkan"}</button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-amber-500 text-slate-900 font-bold rounded-xl py-4 mt-4 hover:bg-amber-400 active:scale-[0.98] transition-all shadow-lg shadow-amber-900/20 disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? "Memverifikasi..." : "Masuk"}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 mt-8 font-medium">Lupa password? Hubungi Admin Pengurus Barang!</p>
      </div>
    </div>
  );
}
