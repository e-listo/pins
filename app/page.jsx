"use client";
import { useState, useEffect } from "react";
import { supabase } from "../src/lib/supabase";
import { getPegawai } from "../src/lib/auth"; // Ambil user aktif
import { 
  Box, ArrowUpRight, ArrowDownLeft, AlertTriangle, 
  Package, TrendingUp, History, LayoutDashboard 
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';

// Komponen Micro-interaction Animasi Angka
function AnimatedNumber({ value, prefix = "", suffix = "", isCurrency = false }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const duration = 1200; // 1.2 detik
    const target = parseFloat(value) || 0;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // Efek easing (melambat di akhir)
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(easeOutQuart * target);

      if (progress < 1) window.requestAnimationFrame(step);
    };

    window.requestAnimationFrame(step);
  }, [value]);

  const displayValue = isCurrency 
    ? Math.floor(count).toLocaleString('id-ID')
    : Math.floor(count);

  return <span>{prefix}{displayValue}{suffix}</span>;
}

export default function Dashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [stats, setStats] = useState({ totalAset: 0, nilaiTotal: 0, stokKritis: 0, masukBulanIni: 0, keluarBulanIni: 0 });
  const [chartData, setChartData] = useState([]);
  const [recentTrx, setRecentTrx] = useState([]);
  const [kritisList, setKritisList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const user = await getPegawai();
      setCurrentUser(user);
      if (user) await loadDashboardData(user);
    }
    init();
  }, []);

  async function loadDashboardData(user) {
    setLoading(true);
    try {
      // 1. IDENTIFIKASI ROLE USER
      const role = String(user?.role).toLowerCase();
      const isSuperAdmin = role.includes("super");
      const isAdminBidang = role.includes("admin_bidang");
      const isOperator = role.includes("operator");

      // 2. BUILD BUILDER QUERY (Row Level Filtering Frontend)
      let queryBarang = supabase.from('barang').select('*');
      let queryTransaksi = supabase.from('transaksi').select('*, barang:barang_id(nama, satuan)');

      // Terapkan Filter Berdasarkan Role
      if (!isSuperAdmin) {
        if (user?.bidang) {
          queryBarang = queryBarang.eq('bidang_upt', user.bidang);
          queryTransaksi = queryTransaksi.eq('bidang_upt', user.bidang);
        }
      }

      // Ambil 6 Bulan Terakhir untuk Grafik
      const enamBulanLalu = new Date();
      enamBulanLalu.setMonth(enamBulanLalu.getMonth() - 5);
      enamBulanLalu.setDate(1);
      queryTransaksi = queryTransaksi.gte('tanggal', enamBulanLalu.toISOString().split('T')[0]).order('tanggal', { ascending: true });

      // Eksekusi Query Serentak
      const [{ data: barang }, { data: transaksi }] = await Promise.all([
        queryBarang,
        queryTransaksi
      ]);

      // 3. KALKULASI STATISTIK
      let totalNilai = 0;
      let kritis = [];
      barang?.forEach(b => {
        totalNilai += (b.stok * (b.harga_satuan || 0));
        if (b.stok <= (b.stok_minimum || 0)) kritis.push(b);
      });

      // Olah Data Grafik
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
      const graphMap = {};
      
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = `${monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;
        graphMap[key] = { name: key, masuk: 0, keluar: 0 };
      }

      transaksi?.forEach(t => {
        const d = new Date(t.tanggal);
        const key = `${monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;
        if (graphMap[key]) {
          if (t.tipe === 'masuk') graphMap[key].masuk += t.jumlah;
          if (t.tipe === 'keluar' || t.tipe === 'mutasi') graphMap[key].keluar += t.jumlah;
        }
      });

      const lastMonthData = Object.values(graphMap).pop() || { masuk: 0, keluar: 0 };

      setStats({
        totalAset: barang?.length || 0,
        nilaiTotal: totalNilai,
        stokKritis: kritis.length,
        masukBulanIni: lastMonthData.masuk,
        keluarBulanIni: lastMonthData.keluar
      });

      setChartData(Object.values(graphMap));
      setRecentTrx(transaksi?.reverse().slice(0, 5) || []);
      setKritisList(kritis.sort((a,b) => a.stok - b.stok).slice(0, 5)); // Urutkan yang paling menipis

    } catch (error) {
      console.error("Dashboard Error:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return (
    <div className="flex h-96 items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
    </div>
  );

  const isOperator = String(currentUser?.role).toLowerCase().includes("operator");

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <LayoutDashboard className="text-amber-500" /> Dashboard Panel
          </h1>
          <p className="text-sm text-slate-400">
            {String(currentUser?.role).toLowerCase().includes("super") 
              ? "Ringkasan total seluruh inventaris DPUPKP" 
              : `Status terkini inventaris untuk bidang ${currentUser?.bidang || 'Anda'}`}
          </p>
        </div>
      </div>

      {/* STAT CARDS (Dengan Animated Counter) */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <StatCard title="Total Jenis Barang" value={<AnimatedNumber value={stats.totalAset} />} icon={<Package size={20}/>} color="blue" />
        
        {/* CONDITIONAL RENDERING: Operator tidak melihat Nilai Rupiah, ganti dengan Barang Masuk */}
        {!isOperator ? (
          <StatCard title="Estimasi Nilai Aset" value={<AnimatedNumber value={stats.nilaiTotal} prefix="Rp " isCurrency={true} />} icon={<TrendingUp size={20}/>} color="emerald" />
        ) : (
          <StatCard title="Masuk Bulan Ini" value={<AnimatedNumber value={stats.masukBulanIni} />} icon={<ArrowDownLeft size={20}/>} color="emerald" />
        )}
        
        <StatCard title="Keluar Bulan Ini" value={<AnimatedNumber value={stats.keluarBulanIni} />} icon={<ArrowUpRight size={20}/>} color="amber" />
        <StatCard title="Peringatan Stok" value={<AnimatedNumber value={stats.stokKritis} />} icon={<AlertTriangle size={20}/>} color="red" alert={stats.stokKritis > 0} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* CHART AREA (Conditional Rendering: Disembunyikan sebagian untuk Operator) */}
        <div className={`${isOperator ? 'lg:col-span-3' : 'lg:col-span-2'} bg-[#1e293b] rounded-3xl border border-slate-700 p-4 md:p-6 shadow-xl`}>
          <h3 className="mb-6 font-bold text-white flex items-center gap-2">
            <TrendingUp size={18} className="text-emerald-500" /> Tren Arus Barang (6 Bulan)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickMargin={10} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }} cursor={{fill: '#334155', opacity: 0.4}}
                />
                <Bar dataKey="masuk" fill="#10b981" radius={[4, 4, 0, 0]} name="Barang Masuk" />
                <Bar dataKey="keluar" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Barang Keluar" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* STOK KRITIS LIST (Sangat penting bagi Gudang/Bidang) */}
        {!isOperator && (
          <div className="bg-[#1e293b] rounded-3xl border border-slate-700 p-4 md:p-6 shadow-xl flex flex-col">
            <h3 className="mb-4 font-bold text-white flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-500" /> Prioritas Pengadaan
            </h3>
            <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {kritisList.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-50 py-10">
                  <Package size={40} className="mb-2" />
                  <p className="text-xs text-center font-semibold">Semua stok berada di atas batas aman.</p>
                </div>
              ) : (
                kritisList.map(item => (
                  <div key={item.id} className="flex items-center justify-between border-b border-slate-700/50 pb-3 group">
                    <div className="min-w-0 pr-3">
                      <p className="text-xs font-bold text-white truncate group-hover:text-red-400 transition-colors">{item.nama}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Kode: {item.kode_aset || '-'}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-black text-red-500">{item.stok}</p>
                      <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">{item.satuan}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* RECENT ACTIVITY */}
      <div className="bg-[#1e293b] rounded-3xl border border-slate-700 p-4 md:p-6 shadow-xl">
        <h3 className="mb-4 font-bold text-white flex items-center gap-2">
          <History size={18} className="text-blue-500" /> Transaksi Terkini
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="text-slate-500 border-b border-slate-700 text-xs uppercase tracking-wider">
                <th className="pb-3 font-semibold px-2">Waktu</th>
                <th className="pb-3 font-semibold px-2">Barang</th>
                <th className="pb-3 font-semibold px-2">Tipe</th>
                <th className="pb-3 font-semibold px-2 text-right">Jumlah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {recentTrx.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-6 text-center text-slate-500 text-xs">Belum ada aktivitas transaksi yang tercatat.</td>
                </tr>
              ) : recentTrx.map(t => (
                <tr key={t.id} className="text-slate-300 hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-2 text-xs font-mono">{new Date(t.tanggal).toLocaleDateString('id-ID')}</td>
                  <td className="py-3 px-2 font-medium text-white max-w-[150px] md:max-w-[300px] truncate">{t.barang?.nama || 'Barang Dihapus'}</td>
                  <td className="py-3 px-2">
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                      t.tipe === 'masuk' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                      t.tipe === 'keluar' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                      'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {t.tipe}
                    </span>
                  </td>
                  <td className={`py-3 px-2 text-right font-black ${
                      t.tipe === 'masuk' ? 'text-emerald-400' : 
                      t.tipe === 'keluar' ? 'text-red-400' : 'text-amber-400'
                    }`}>
                    {t.tipe === 'keluar' ? '-' : '+'}{t.jumlah} <span className="text-[10px] font-semibold text-slate-500 ml-1">{t.barang?.satuan}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, alert }) {
  const colors = {
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    red: "text-red-400 bg-red-500/10 border-red-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  };
  return (
    <div className={`bg-[#1e293b] p-4 md:p-5 rounded-3xl border ${alert ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border-slate-700 shadow-xl'} flex flex-col justify-between relative overflow-hidden transition-all duration-300`}>
      {alert && <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse"></div>}
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-xl border ${colors[color]}`}>{icon}</div>
      </div>
      <div>
        <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
        <p className={`text-xl md:text-2xl font-black ${alert ? 'text-red-400' : 'text-white'} leading-tight truncate`}>{value}</p>
      </div>
    </div>
  );
}
