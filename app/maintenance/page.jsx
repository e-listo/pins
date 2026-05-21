"use client";
import { Wrench, ShieldAlert, Clock } from "lucide-react";
import Link from "next/link";

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#1e293b] p-8 rounded-3xl border border-slate-700 shadow-2xl text-center animate-in zoom-in-95 duration-500">
        <div className="relative mx-auto w-24 h-24 bg-amber-500/10 rounded-full flex items-center justify-center mb-6">
          <div className="absolute inset-0 border-4 border-amber-500/30 rounded-full animate-ping"></div>
          <Wrench size={48} className="text-amber-500 animate-pulse" />
        </div>
        
        <h1 className="text-3xl font-black text-white mb-3">PINS Sedang Maintenance</h1>
        <p className="text-slate-400 text-sm leading-relaxed mb-8">
          Mohon maaf, sistem saat ini sedang dalam pemeliharaan rutin atau pembaruan data oleh Super Admin. Silakan kembali beberapa saat lagi.
        </p>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-center gap-3 text-left mb-8">
          <Clock className="text-blue-400 shrink-0" size={24} />
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase">Estimasi Waktu</p>
            <p className="text-sm text-white font-medium">Segera setelah proses selesai</p>
          </div>
        </div>

        <Link href="/" className="inline-block px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors border border-slate-600">
          Coba Refresh Ulang
        </Link>
      </div>

      <div className="mt-12 text-center flex flex-col items-center gap-2 opacity-50">
        <ShieldAlert size={20} className="text-slate-500" />
        <p className="text-xs text-slate-500 font-mono">
          Hanya pengguna dengan hak akses "Super Admin" yang dapat mem-bypass halaman ini.
        </p>
      </div>
    </div>
  );
}
