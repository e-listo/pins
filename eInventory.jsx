import { useState, useRef, useEffect } from "react";

// ── ICONS (inline SVG components) ─────────────────────────────────────────────
const Icon = ({ d, size = 20, color = "currentColor", strokeWidth = 1.8, fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d) ? d.map((path, i) => <path key={i} d={path} />) : <path d={d} />}
  </svg>
);

const Icons = {
  dashboard: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z",
  barang: ["M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z", "M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12"],
  gudang: "M3 9h18v10a2 2 0 01-2 2H5a2 2 0 01-2-2V9zM3 9V7a2 2 0 012-2h14a2 2 0 012 2v2",
  transaksi: ["M12 5v14", "M5 12l7-7 7 7"],
  qrcode: ["M3 3h7v7H3z", "M14 3h7v7h-7z", "M3 14h7v7H3z", "M14 14h3v3h-3z", "M17 14h4", "M14 17v4", "M17 17h4v4h-4z"],
  laporan: ["M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z", "M14 2v6h6", "M16 13H8M16 17H8M10 9H8"],
  alert: ["M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z", "M12 9v4M12 17h.01"],
  plus: "M12 5v14M5 12h14",
  search: ["M11 18a7 7 0 100-14 7 7 0 000 14z", "M21 21l-4.35-4.35"],
  bell: ["M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9", "M13.73 21a2 2 0 01-3.46 0"],
  user: ["M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2", "M12 11a4 4 0 100-8 4 4 0 000 8"],
  menu: "M3 12h18M3 6h18M3 18h18",
  close: "M18 6L6 18M6 6l12 12",
  arrow: "M9 18l6-6-6-6",
  download: ["M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4", "M7 10l5 5 5-5", "M12 15V3"],
  box: ["M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"],
  check: "M20 6L9 17l-5-5",
  trending: "M23 6l-9.5 9.5-5-5L1 18",
  camera: ["M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z", "M12 17a4 4 0 100-8 4 4 0 000 8"],
  filter: "M22 3H2l8 9.46V19l4 2v-8.54L22 3",
  edit: ["M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7", "M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"],
  trash: ["M3 6h18", "M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"],
  refresh: "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15",
};

// ── DATA ────────────────────────────────────────────────────────────────────
const kategoriList = ["Alat Berat", "Material Konstruksi", "ATK", "Mebel & Perabot", "Elektronik", "Keselamatan Kerja"];
const satuanList = ["Unit", "Buah", "Kg", "Meter", "Liter", "Rim", "Set", "Lembar", "Roll"];
const gudangList = ["Gudang A – Jl. Kenari", "Gudang B – Jl. Magelang", "Proyek Jl. Malioboro", "Proyek Jembatan Winongo"];

const initialBarang = [
  { id: "PJU-2024-001", kode: "PJU.5.2.6.01.001", nama: "Lampu LED Jalan 150W", kategori: "Elektronik", satuan: "Unit", stok: 145, stokMin: 50, gudang: "Gudang A – Jl. Kenari", harga: 850000, foto: null },
  { id: "PJU-2024-002", kode: "PJU.5.2.6.01.002", nama: "Tiang Lampu Ornamen 7m", kategori: "Material Konstruksi", satuan: "Unit", stok: 12, stokMin: 20, gudang: "Gudang B – Jl. Magelang", harga: 3500000, foto: null },
  { id: "PJU-2024-003", kode: "PJU.5.2.6.02.001", nama: "Kabel NYY 4x10mm", kategori: "Material Konstruksi", satuan: "Meter", stok: 850, stokMin: 200, gudang: "Gudang A – Jl. Kenari", harga: 45000, foto: null },
  { id: "PJU-2024-004", kode: "PJU.5.2.6.03.001", nama: "Box Panel Listrik", kategori: "Elektronik", satuan: "Unit", stok: 8, stokMin: 10, gudang: "Gudang A – Jl. Kenari", harga: 1200000, foto: null },
  { id: "PJU-2024-005", kode: "PJU.5.2.4.01.001", nama: "Helm Safety", kategori: "Keselamatan Kerja", satuan: "Buah", stok: 35, stokMin: 30, gudang: "Gudang B – Jl. Magelang", harga: 125000, foto: null },
  { id: "PJU-2024-006", kode: "PJU.5.2.1.01.001", nama: "Kertas HVS A4 80gr", kategori: "ATK", satuan: "Rim", stok: 48, stokMin: 20, gudang: "Gudang A – Jl. Kenari", harga: 55000, foto: null },
];

const initialTransaksi = [
  { id: "TRX-2024-0118", tipe: "masuk", barang: "Lampu LED Jalan 150W", jumlah: 50, gudang: "Gudang A – Jl. Kenari", tanggal: "2024-07-15", no_spk: "SPK/PUPKP/2024/0045", keterangan: "Pengadaan rutin Q3" },
  { id: "TRX-2024-0117", tipe: "keluar", barang: "Tiang Lampu Ornamen 7m", jumlah: 3, gudang: "Gudang B – Jl. Magelang", tanggal: "2024-07-14", no_spk: "SPK/PUPKP/2024/0044", keterangan: "Proyek Jl. Malioboro" },
  { id: "TRX-2024-0116", tipe: "mutasi", barang: "Kabel NYY 4x10mm", jumlah: 200, gudang: "Gudang A → Proyek Winongo", tanggal: "2024-07-13", no_spk: "SPK/PUPKP/2024/0043", keterangan: "Mutasi proyek jembatan" },
  { id: "TRX-2024-0115", tipe: "masuk", barang: "Box Panel Listrik", jumlah: 5, gudang: "Gudang A – Jl. Kenari", tanggal: "2024-07-12", no_spk: "SPK/PUPKP/2024/0042", keterangan: "Restock gudang" },
  { id: "TRX-2024-0114", tipe: "keluar", barang: "Helm Safety", jumlah: 10, gudang: "Gudang B – Jl. Magelang", tanggal: "2024-07-11", no_spk: "SPK/PUPKP/2024/0041", keterangan: "Proyek Jl. Malioboro" },
];

// ── QR CODE GENERATOR (SVG-based minimal) ─────────────────────────────────
function QRCodeSVG({ value, size = 160 }) {
  // Simple deterministic pattern from string hash
  const hash = (s) => s.split("").reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
  const seed = Math.abs(hash(value));
  const grid = 21;
  const cellSize = size / grid;

  const cells = [];
  for (let r = 0; r < grid; r++) {
    for (let c = 0; c < grid; c++) {
      const isFinder =
        (r < 8 && c < 8) || (r < 8 && c >= grid - 8) || (r >= grid - 8 && c < 8);
      const finderBit = isFinder
        ? (r === 0 || r === 7 || c === 0 || c === 7 ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4) ||
          (r >= 2 && r <= 4 && c >= grid - 6 && c <= grid - 3) ||
          (r >= grid - 6 && r <= grid - 3 && c >= 2 && c <= 4))
        : null;
      const dataBit = ((seed * (r * grid + c + 1)) & 0x3f) > 20;
      const on = isFinder ? finderBit : dataBit;
      cells.push({ r, c, on });
    }
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
      <rect width={size} height={size} fill="white" />
      {cells.map(({ r, c, on }) =>
        on ? <rect key={`${r}-${c}`} x={c * cellSize} y={r * cellSize} width={cellSize} height={cellSize} fill="#111827" /> : null
      )}
    </svg>
  );
}

// ── MINI CHART (sparkline SVG) ─────────────────────────────────────────────
function Sparkline({ data, color = "#3b82f6", height = 36, width = 100 }) {
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / (max - min + 1)) * height;
    return `${x},${y}`;
  });
  const area = `M${pts.join("L")}V${height}H0Z`;
  const line = `M${pts.join("L")}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={`sg${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg${color.replace("#","")})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// ── BADGE ────────────────────────────────────────────────────────────────────
function Badge({ label, color }) {
  const colors = {
    masuk: "bg-emerald-100 text-emerald-700",
    keluar: "bg-red-100 text-red-700",
    mutasi: "bg-amber-100 text-amber-700",
    alert: "bg-red-100 text-red-700",
    ok: "bg-emerald-100 text-emerald-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${colors[color] || "bg-slate-100 text-slate-600"}`}>
      {label}
    </span>
  );
}

// ── MODAL WRAPPER ────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-screen overflow-y-auto" style={{ animation: "modalIn 0.2s ease" }}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
            <Icon d={Icons.close} size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ── FORM INPUT ──────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  );
}
const inputCls = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 hover:bg-white transition-colors";
const selectCls = inputCls + " cursor-pointer";

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
function Dashboard({ barang, transaksi }) {
  const totalBarang = barang.length;
  const totalStok = barang.reduce((a, b) => a + b.stok, 0);
  const alertItems = barang.filter(b => b.stok <= b.stokMin);
  const nilaiInventaris = barang.reduce((a, b) => a + b.stok * b.harga, 0);
  const sparkData = [42, 60, 55, 78, 65, 90, 84, 95, 88, 102, 96, 112];

  const statCards = [
    { label: "Total Jenis Barang", value: totalBarang, sub: "+2 bulan ini", color: "#3b82f6", spark: [20,22,21,25,28,30], icon: Icons.barang },
    { label: "Total Stok (semua gudang)", value: totalStok.toLocaleString("id"), sub: "unit/item tersedia", color: "#10b981", spark: [80,95,90,110,105,112], icon: Icons.box },
    { label: "Alert Stok Minimum", value: alertItems.length, sub: "barang perlu restock", color: "#ef4444", spark: [1,3,2,4,3,alertItems.length], icon: Icons.alert },
    { label: "Nilai Inventaris", value: `Rp ${(nilaiInventaris/1e6).toFixed(1)}M`, sub: "estimasi total aset", color: "#f59e0b", spark: sparkData, icon: Icons.trending },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-800" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Dinas PUPKP Kota Yogyakarta — {new Date().toLocaleDateString("id-ID", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-200">
          <Icon d={Icons.refresh} size={15} />
          Refresh
        </button>
      </div>

      {/* Alert Banner */}
      {alertItems.length > 0 && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <Icon d={Icons.alert} size={16} color="#ef4444" />
          </div>
          <div>
            <p className="text-sm font-bold text-red-700">⚠️ Stok Minimum Terdeteksi!</p>
            <p className="text-xs text-red-600 mt-0.5">{alertItems.map(i => i.nama).join(", ")} — segera lakukan restock atau pengadaan.</p>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3">
        {statCards.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: s.color + "18" }}>
                <Icon d={s.icon} size={18} color={s.color} />
              </div>
              <Sparkline data={s.spark} color={s.color} />
            </div>
            <p className="text-2xl font-black text-slate-800">{s.value}</p>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">{s.label}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Distribusi per Gudang */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 mb-3">Distribusi Stok per Gudang</h3>
        {gudangList.map((g) => {
          const cnt = barang.filter(b => b.gudang === g).reduce((a, b) => a + b.stok, 0);
          const pct = Math.round((cnt / totalStok) * 100) || 0;
          const colors = ["bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500"];
          const idx = gudangList.indexOf(g);
          return (
            <div key={g} className="mb-3 last:mb-0">
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-700 truncate max-w-48">{g}</span>
                <span className="text-slate-500 font-semibold">{cnt.toLocaleString("id")} unit ({pct}%)</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${colors[idx]}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Transaksi Terbaru */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-50">
          <h3 className="text-sm font-bold text-slate-700">Aktivitas Terbaru</h3>
          <span className="text-xs text-blue-600 font-semibold cursor-pointer hover:underline">Lihat Semua</span>
        </div>
        <div>
          {transaksi.slice(0, 4).map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${t.tipe === "masuk" ? "bg-emerald-100" : t.tipe === "keluar" ? "bg-red-100" : "bg-amber-100"}`}>
                <Icon d={Icons.transaksi} size={15} color={t.tipe === "masuk" ? "#10b981" : t.tipe === "keluar" ? "#ef4444" : "#f59e0b"} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{t.barang}</p>
                <p className="text-xs text-slate-400">{t.tanggal} • {t.gudang}</p>
              </div>
              <div className="text-right">
                <Badge label={t.tipe.charAt(0).toUpperCase() + t.tipe.slice(1)} color={t.tipe} />
                <p className="text-xs text-slate-500 mt-1">{t.jumlah} unit</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: MANAJEMEN BARANG
// ═══════════════════════════════════════════════════════════════════════════════
function ManajemenBarang({ barang, setBarang }) {
  const [search, setSearch] = useState("");
  const [filterKat, setFilterKat] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showQR, setShowQR] = useState(null);
  const [form, setForm] = useState({ nama: "", kategori: "", satuan: "", stok: "", stokMin: "", gudang: "", harga: "", keterangan: "" });

  const filtered = barang.filter(b =>
    (b.nama.toLowerCase().includes(search.toLowerCase()) || b.kode.includes(search)) &&
    (filterKat ? b.kategori === filterKat : true)
  );

  const generateKode = (kategori) => {
    const prefixes = { "Elektronik": "5.2.6", "Material Konstruksi": "5.2.3", "ATK": "5.2.1", "Alat Berat": "5.2.2", "Mebel & Perabot": "5.2.4", "Keselamatan Kerja": "5.2.5" };
    const pref = prefixes[kategori] || "5.2.9";
    const seq = String(barang.length + 1).padStart(3, "0");
    return `PJU.${pref}.01.${seq}`;
  };

  const handleSubmit = () => {
    if (!form.nama || !form.kategori) return;
    const newItem = {
      id: `PJU-2024-${String(barang.length + 1).padStart(3, "0")}`,
      kode: generateKode(form.kategori),
      nama: form.nama, kategori: form.kategori,
      satuan: form.satuan || "Unit",
      stok: parseInt(form.stok) || 0,
      stokMin: parseInt(form.stokMin) || 10,
      gudang: form.gudang || gudangList[0],
      harga: parseInt(form.harga) || 0,
      foto: null,
    };
    setBarang([...barang, newItem]);
    setShowModal(false);
    setForm({ nama: "", kategori: "", satuan: "", stok: "", stokMin: "", gudang: "", harga: "", keterangan: "" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-800">Manajemen Barang</h1>
          <p className="text-sm text-slate-500">{filtered.length} barang ditemukan</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-200">
          <Icon d={Icons.plus} size={16} />
          Tambah
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Icon d={Icons.search} size={16} /></div>
          <input className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Cari nama atau kode barang..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="border border-slate-200 bg-white rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer" value={filterKat} onChange={e => setFilterKat(e.target.value)}>
          <option value="">Semua Kategori</option>
          {kategoriList.map(k => <option key={k}>{k}</option>)}
        </select>
      </div>

      {/* Cards */}
      <div className="space-y-2.5">
        {filtered.map((b) => {
          const isAlert = b.stok <= b.stokMin;
          return (
            <div key={b.id} className={`bg-white rounded-2xl border shadow-sm p-4 hover:shadow-md transition-all ${isAlert ? "border-red-200" : "border-slate-100"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isAlert ? "bg-red-100" : "bg-blue-50"}`}>
                    <Icon d={Icons.box} size={18} color={isAlert ? "#ef4444" : "#3b82f6"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 text-sm truncate">{b.nama}</p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{b.kode}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{b.kategori}</span>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{b.gudang.split("–")[0].trim()}</span>
                      {isAlert && <Badge label="Stok Rendah!" color="alert" />}
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xl font-black text-slate-800">{b.stok.toLocaleString("id")}</p>
                  <p className="text-xs text-slate-400">{b.satuan}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Min: {b.stokMin}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-50">
                <button onClick={() => setShowQR(b)} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg py-2 transition-colors">
                  <Icon d={Icons.qrcode[0]} size={13} />QR Code
                </button>
                <button className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg py-2 transition-colors">
                  <Icon d={Icons.edit} size={13} />Edit
                </button>
                <button className="flex items-center justify-center gap-1.5 text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 rounded-lg py-2 px-3 transition-colors">
                  <Icon d={Icons.trash} size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Tambah Barang */}
      {showModal && (
        <Modal title="Tambah Barang Baru" onClose={() => setShowModal(false)}>
          <Field label="Nama Barang *">
            <input className={inputCls} placeholder="cth. Lampu LED Jalan 150W" value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kategori *">
              <select className={selectCls} value={form.kategori} onChange={e => setForm({ ...form, kategori: e.target.value })}>
                <option value="">Pilih...</option>
                {kategoriList.map(k => <option key={k}>{k}</option>)}
              </select>
            </Field>
            <Field label="Satuan">
              <select className={selectCls} value={form.satuan} onChange={e => setForm({ ...form, satuan: e.target.value })}>
                <option value="">Pilih...</option>
                {satuanList.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Stok Awal">
              <input type="number" className={inputCls} placeholder="0" value={form.stok} onChange={e => setForm({ ...form, stok: e.target.value })} />
            </Field>
            <Field label="Stok Minimum">
              <input type="number" className={inputCls} placeholder="10" value={form.stokMin} onChange={e => setForm({ ...form, stokMin: e.target.value })} />
            </Field>
          </div>
          <Field label="Lokasi Gudang">
            <select className={selectCls} value={form.gudang} onChange={e => setForm({ ...form, gudang: e.target.value })}>
              <option value="">Pilih gudang...</option>
              {gudangList.map(g => <option key={g}>{g}</option>)}
            </select>
          </Field>
          <Field label="Harga Satuan (Rp)">
            <input type="number" className={inputCls} placeholder="0" value={form.harga} onChange={e => setForm({ ...form, harga: e.target.value })} />
          </Field>
          {form.kategori && (
            <div className="mb-4 bg-blue-50 rounded-xl p-3">
              <p className="text-xs text-blue-600 font-semibold">Kode Aset Otomatis (Permendagri):</p>
              <p className="text-sm font-mono font-bold text-blue-800 mt-0.5">{generateKode(form.kategori)}</p>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Batal</button>
            <button onClick={handleSubmit} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-200">Simpan Barang</button>
          </div>
        </Modal>
      )}

      {/* Modal QR Code */}
      {showQR && (
        <Modal title={`QR Code — ${showQR.nama}`} onClose={() => setShowQR(null)}>
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-white border-2 border-slate-200 rounded-2xl shadow-inner">
              <QRCodeSVG value={`PUPKP|${showQR.kode}|${showQR.nama}|${showQR.gudang}`} size={180} />
            </div>
            <div className="w-full bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500">Kode Aset</p>
              <p className="text-sm font-mono font-bold text-slate-800 mt-0.5">{showQR.kode}</p>
              <p className="text-xs text-slate-500 mt-2">Gudang: <span className="font-semibold text-slate-700">{showQR.gudang}</span></p>
            </div>
            <div className="flex gap-2 w-full">
              <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors">
                <Icon d={Icons.download} size={15} />Unduh PNG
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-700 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors">
                <Icon d={Icons.download} size={15} />Cetak Label
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: TRANSAKSI
// ═══════════════════════════════════════════════════════════════════════════════
function Transaksi({ barang, transaksi, setTransaksi }) {
  const [tab, setTab] = useState("masuk");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ barang: "", jumlah: "", gudang: "", gudangTujuan: "", no_spk: "", keterangan: "" });

  const handleSubmit = () => {
    if (!form.barang || !form.jumlah) return;
    const newTrx = {
      id: `TRX-2024-${String(transaksi.length + 119).padStart(4, "0")}`,
      tipe: tab,
      barang: form.barang,
      jumlah: parseInt(form.jumlah),
      gudang: tab === "mutasi" ? `${form.gudang} → ${form.gudangTujuan}` : form.gudang,
      tanggal: new Date().toISOString().split("T")[0],
      no_spk: form.no_spk,
      keterangan: form.keterangan,
    };
    setTransaksi([newTrx, ...transaksi]);
    setShowModal(false);
    setForm({ barang: "", jumlah: "", gudang: "", gudangTujuan: "", no_spk: "", keterangan: "" });
  };

  const filtered = transaksi.filter(t => tab === "semua" ? true : t.tipe === tab);
  const tabs = [
    { key: "masuk", label: "Barang Masuk", color: "text-emerald-600" },
    { key: "keluar", label: "Barang Keluar", color: "text-red-600" },
    { key: "mutasi", label: "Mutasi", color: "text-amber-600" },
    { key: "semua", label: "Semua", color: "text-slate-600" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-800">Transaksi</h1>
          <p className="text-sm text-slate-500">{filtered.length} transaksi tercatat</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-200">
          <Icon d={Icons.plus} size={16} />Input
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex-1 text-xs font-bold py-2 rounded-lg transition-all ${tab === t.key ? "bg-white shadow-sm " + t.color : "text-slate-500 hover:text-slate-700"}`}>
            {t.label.replace("Barang ", "")}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2.5">
        {filtered.map((t) => (
          <div key={t.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-all">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${t.tipe === "masuk" ? "bg-emerald-100" : t.tipe === "keluar" ? "bg-red-100" : "bg-amber-100"}`}>
                  <Icon d={Icons.transaksi} size={16} color={t.tipe === "masuk" ? "#10b981" : t.tipe === "keluar" ? "#ef4444" : "#f59e0b"} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-800 text-sm truncate">{t.barang}</p>
                    <Badge label={t.tipe} color={t.tipe} />
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{t.gudang}</p>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">{t.id} • {t.tanggal}</p>
                  {t.no_spk && <p className="text-xs text-blue-600 mt-0.5 font-mono truncate">📋 {t.no_spk}</p>}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-2xl font-black text-slate-800">{t.jumlah}</p>
                <p className="text-xs text-slate-400">unit</p>
              </div>
            </div>
            {t.keterangan && (
              <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-50 italic">"{t.keterangan}"</p>
            )}
          </div>
        ))}
      </div>

      {/* Modal Input Transaksi */}
      {showModal && (
        <Modal title={`Input ${tabs.find(t=>t.key===tab)?.label}`} onClose={() => setShowModal(false)}>
          <div className="flex bg-slate-100 rounded-xl p-1 gap-1 mb-4">
            {tabs.slice(0, 3).map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} className={`flex-1 text-xs font-bold py-2 rounded-lg transition-all ${tab === t.key ? "bg-white shadow-sm " + t.color : "text-slate-500"}`}>
                {t.label}
              </button>
            ))}
          </div>
          <Field label="Nama Barang *">
            <select className={selectCls} value={form.barang} onChange={e => setForm({ ...form, barang: e.target.value })}>
              <option value="">Pilih barang...</option>
              {barang.map(b => <option key={b.id}>{b.nama}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Jumlah *">
              <input type="number" className={inputCls} placeholder="0" value={form.jumlah} onChange={e => setForm({ ...form, jumlah: e.target.value })} />
            </Field>
            <Field label={tab === "mutasi" ? "Gudang Asal" : "Gudang"}>
              <select className={selectCls} value={form.gudang} onChange={e => setForm({ ...form, gudang: e.target.value })}>
                <option value="">Pilih...</option>
                {gudangList.map(g => <option key={g}>{g}</option>)}
              </select>
            </Field>
          </div>
          {tab === "mutasi" && (
            <Field label="Gudang Tujuan *">
              <select className={selectCls} value={form.gudangTujuan} onChange={e => setForm({ ...form, gudangTujuan: e.target.value })}>
                <option value="">Pilih...</option>
                {gudangList.map(g => <option key={g}>{g}</option>)}
              </select>
            </Field>
          )}
          <Field label="No. SPK / Dokumen">
            <input className={inputCls} placeholder="SPK/PUPKP/2024/xxxx" value={form.no_spk} onChange={e => setForm({ ...form, no_spk: e.target.value })} />
          </Field>
          <Field label="Keterangan">
            <textarea className={inputCls} rows={2} placeholder="Keterangan tambahan..." value={form.keterangan} onChange={e => setForm({ ...form, keterangan: e.target.value })} />
          </Field>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Batal</button>
            <button onClick={handleSubmit} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 active:scale-95 transition-all">Simpan</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: QR SCANNER
// ═══════════════════════════════════════════════════════════════════════════════
function QRScanner({ barang }) {
  const [scanResult, setScanResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");

  const simulateScan = () => {
    setScanning(true);
    setTimeout(() => {
      const random = barang[Math.floor(Math.random() * barang.length)];
      setScanResult(random);
      setScanning(false);
    }, 2000);
  };

  const manualSearch = () => {
    const found = barang.find(b => b.kode.toLowerCase().includes(manualCode.toLowerCase()) || b.nama.toLowerCase().includes(manualCode.toLowerCase()));
    setScanResult(found || { error: true });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-black text-slate-800">Scan QR Code</h1>
        <p className="text-sm text-slate-500">Scan label barang untuk cek stok & detail</p>
      </div>

      {/* Camera Viewfinder */}
      <div className="bg-slate-900 rounded-2xl overflow-hidden relative" style={{ aspectRatio: "1" }}>
        <div className="absolute inset-0 flex items-center justify-center">
          {scanning ? (
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full mx-auto animate-spin mb-3" />
              <p className="text-white text-sm font-semibold">Memindai...</p>
            </div>
          ) : (
            <div className="text-center">
              <Icon d={Icons.camera} size={48} color="rgba(255,255,255,0.3)" />
              <p className="text-white/50 text-sm mt-2">Kamera tidak aktif</p>
            </div>
          )}
        </div>
        {/* Scan frame overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-48 h-48 relative">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-400 rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-400 rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-400 rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-400 rounded-br-lg" />
            {scanning && <div className="absolute left-0 right-0 h-0.5 bg-blue-400 shadow-lg" style={{ top: "50%", animation: "scanLine 1s ease-in-out infinite alternate" }} />}
          </div>
        </div>
      </div>

      <button onClick={simulateScan} disabled={scanning} className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-blue-200">
        <Icon d={Icons.camera} size={18} />
        {scanning ? "Memindai QR Code..." : "Aktifkan Kamera Scan"}
      </button>

      {/* Manual Search */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4">
        <p className="text-sm font-bold text-slate-700 mb-3">Atau Cari Manual</p>
        <div className="flex gap-2">
          <input className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" placeholder="Ketik nama/kode barang..." value={manualCode} onChange={e => setManualCode(e.target.value)} onKeyDown={e => e.key === "Enter" && manualSearch()} />
          <button onClick={manualSearch} className="px-4 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-900 active:scale-95 transition-all">Cari</button>
        </div>
      </div>

      {/* Scan Result */}
      {scanResult && (
        <div className={`rounded-2xl border-2 p-4 ${scanResult.error ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"}`}>
          {scanResult.error ? (
            <div className="text-center py-4">
              <p className="text-red-600 font-bold">❌ Barang tidak ditemukan</p>
              <p className="text-red-500 text-xs mt-1">Periksa kembali kode atau nama barang</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                  <Icon d={Icons.check} size={16} color="#10b981" />
                </div>
                <p className="text-sm font-bold text-emerald-700">Barang Ditemukan!</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Nama Barang</span>
                  <span className="text-sm font-bold text-slate-800 text-right max-w-48">{scanResult.nama}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Kode Aset</span>
                  <span className="text-xs font-mono font-bold text-slate-700">{scanResult.kode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Kategori</span>
                  <span className="text-xs font-semibold text-slate-700">{scanResult.kategori}</span>
                </div>
                <div className="flex justify-between items-center border-t border-emerald-200 pt-2 mt-2">
                  <span className="text-xs text-slate-500">Stok Saat Ini</span>
                  <div className="text-right">
                    <span className={`text-2xl font-black ${scanResult.stok <= scanResult.stokMin ? "text-red-600" : "text-emerald-600"}`}>{scanResult.stok}</span>
                    <span className="text-xs text-slate-500 ml-1">{scanResult.satuan}</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Lokasi</span>
                  <span className="text-xs font-semibold text-slate-700 text-right max-w-48">{scanResult.gudang}</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: LAPORAN
// ═══════════════════════════════════════════════════════════════════════════════
function Laporan({ barang, transaksi }) {
  const [period, setPeriod] = useState("bulanan");
  const [bulan, setBulan] = useState("7");
  const [tahun] = useState("2024");
  const [generating, setGenerating] = useState(null);

  const totalMasuk = transaksi.filter(t => t.tipe === "masuk").reduce((a, t) => a + t.jumlah, 0);
  const totalKeluar = transaksi.filter(t => t.tipe === "keluar").reduce((a, t) => a + t.jumlah, 0);
  const totalMutasi = transaksi.filter(t => t.tipe === "mutasi").reduce((a, t) => a + t.jumlah, 0);
  const nilaiTotal = barang.reduce((a, b) => a + b.stok * b.harga, 0);

  const handleGenerate = (type) => {
    setGenerating(type);
    setTimeout(() => setGenerating(null), 2000);
  };

  const bulanNames = ["","Jan","Feb","Mar","Apr","Mei","Jun","Jul","Ags","Sep","Okt","Nov","Des"];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-black text-slate-800">Laporan</h1>
        <p className="text-sm text-slate-500">Export untuk keperluan SPJ & pelaporan</p>
      </div>

      {/* Filter Periode */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
        <p className="text-sm font-bold text-slate-700">Periode Laporan</p>
        <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
          {["bulanan", "tahunan", "custom"].map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={`flex-1 text-xs font-bold py-2 rounded-lg capitalize transition-all ${period === p ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-700"}`}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
        {period === "bulanan" && (
          <div className="grid grid-cols-2 gap-2">
            <select className={selectCls} value={bulan} onChange={e => setBulan(e.target.value)}>
              {Array.from({length: 12}, (_, i) => <option key={i+1} value={i+1}>{bulanNames[i+1]}</option>)}
            </select>
            <select className={selectCls} value={tahun}>
              <option>2024</option><option>2023</option>
            </select>
          </div>
        )}
      </div>

      {/* Ringkasan Laporan */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <p className="text-sm font-bold text-slate-700 mb-3">Ringkasan {period === "bulanan" ? `${bulanNames[bulan]} ${tahun}` : tahun}</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Barang Masuk", value: totalMasuk, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Barang Keluar", value: totalKeluar, color: "text-red-600", bg: "bg-red-50" },
            { label: "Mutasi", value: totalMutasi, color: "text-amber-600", bg: "bg-amber-50" },
            { label: "Total Transaksi", value: transaksi.length, color: "text-blue-600", bg: "bg-blue-50" },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl p-3`}>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-slate-50 flex justify-between items-center">
          <span className="text-sm font-semibold text-slate-600">Nilai Inventaris Total</span>
          <span className="text-lg font-black text-slate-800">Rp {(nilaiTotal/1e6).toFixed(2)}M</span>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="space-y-2.5">
        <p className="text-sm font-bold text-slate-700">Format Export</p>
        {[
          { label: "Export ke PDF", sub: "Laporan lengkap siap cetak & SPJ", color: "bg-red-600 hover:bg-red-700 shadow-red-200", icon: Icons.laporan, type: "pdf" },
          { label: "Export ke Excel (.xlsx)", sub: "Data mentah untuk analisis & rekap", color: "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200", icon: Icons.laporan, type: "excel" },
          { label: "Export Rekap Stok", sub: "Posisi stok semua barang saat ini", color: "bg-blue-600 hover:bg-blue-700 shadow-blue-200", icon: Icons.barang, type: "stok" },
        ].map(btn => (
          <button key={btn.type} onClick={() => handleGenerate(btn.type)} className={`w-full flex items-center gap-4 ${btn.color} text-white rounded-2xl p-4 shadow-sm active:scale-95 transition-all`}>
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              {generating === btn.type ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Icon d={btn.icon} size={20} color="white" />
              )}
            </div>
            <div className="text-left">
              <p className="font-bold text-sm">{generating === btn.type ? "Menyiapkan file..." : btn.label}</p>
              <p className="text-xs text-white/70 mt-0.5">{btn.sub}</p>
            </div>
            {generating !== btn.type && <Icon d={Icons.arrow} size={18} color="white" className="ml-auto" />}
          </button>
        ))}
      </div>

      {/* Tabel Preview */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-50">
          <p className="text-sm font-bold text-slate-700">Preview: Posisi Stok Akhir</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left px-3 py-2.5 font-bold text-slate-500 uppercase tracking-wider">Nama Barang</th>
                <th className="text-right px-3 py-2.5 font-bold text-slate-500 uppercase tracking-wider">Stok</th>
                <th className="text-right px-3 py-2.5 font-bold text-slate-500 uppercase tracking-wider">Nilai (Rp)</th>
              </tr>
            </thead>
            <tbody>
              {barang.map((b, i) => (
                <tr key={b.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                  <td className="px-3 py-2.5 font-medium text-slate-700 max-w-32 truncate">{b.nama}</td>
                  <td className={`px-3 py-2.5 text-right font-bold ${b.stok <= b.stokMin ? "text-red-600" : "text-slate-800"}`}>{b.stok} {b.satuan}</td>
                  <td className="px-3 py-2.5 text-right text-slate-600">{(b.stok * b.harga / 1e6).toFixed(2)}M</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: ARSITEKTUR
// ═══════════════════════════════════════════════════════════════════════════════
function Arsitektur() {
  const tree = [
    { name: "📁 e-inventory/", depth: 0, type: "folder" },
    { name: "📁 src/", depth: 1, type: "folder" },
    { name: "📁 app/                  ← Next.js App Router", depth: 2, type: "folder" },
    { name: "📄 layout.tsx", depth: 3, type: "file" },
    { name: "📄 page.tsx              ← Dashboard", depth: 3, type: "file" },
    { name: "📁 barang/", depth: 3, type: "folder" },
    { name: "📄 page.tsx", depth: 4, type: "file" },
    { name: "📁 gudang/", depth: 3, type: "folder" },
    { name: "📁 transaksi/", depth: 3, type: "folder" },
    { name: "📁 qr-scan/", depth: 3, type: "folder" },
    { name: "📁 laporan/", depth: 3, type: "folder" },
    { name: "📁 components/           ← UI Components", depth: 2, type: "folder" },
    { name: "📄 BarangCard.tsx", depth: 3, type: "file" },
    { name: "📄 QRGenerator.tsx", depth: 3, type: "file" },
    { name: "📄 QRScanner.tsx         ← @zxing/browser", depth: 3, type: "file" },
    { name: "📄 TransaksiForm.tsx", depth: 3, type: "file" },
    { name: "📄 StockAlert.tsx", depth: 3, type: "file" },
    { name: "📄 ExportButton.tsx      ← jsPDF + xlsx", depth: 3, type: "file" },
    { name: "📁 lib/                  ← Utilities", depth: 2, type: "folder" },
    { name: "📄 supabase.ts           ← Supabase client", depth: 3, type: "file" },
    { name: "📄 kode-aset.ts          ← Permendagri scheme", depth: 3, type: "file" },
    { name: "📄 export-utils.ts", depth: 3, type: "file" },
    { name: "📁 hooks/", depth: 2, type: "folder" },
    { name: "📄 useBarang.ts", depth: 3, type: "file" },
    { name: "📄 useTransaksi.ts", depth: 3, type: "file" },
    { name: "📄 useStockAlert.ts", depth: 3, type: "file" },
    { name: "📁 types/", depth: 2, type: "folder" },
    { name: "📄 inventory.ts          ← TypeScript interfaces", depth: 3, type: "file" },
    { name: "📁 public/", depth: 1, type: "folder" },
    { name: "📁 android/              ← Capacitor (Cordova)", depth: 1, type: "folder" },
    { name: "📄 capacitor.config.ts   ← Mobile config", depth: 1, type: "file" },
    { name: "📄 next.config.js", depth: 1, type: "file" },
    { name: "📄 tailwind.config.js", depth: 1, type: "file" },
  ];

  const stack = [
    { layer: "Frontend", items: ["Next.js 14 (App Router)", "React 18 + TypeScript", "Tailwind CSS v3", "Zustand (state)"] },
    { layer: "Mobile", items: ["Capacitor v5", "@capacitor/camera", "@capacitor/filesystem", "@zxing/browser (QR)"] },
    { layer: "Backend", items: ["Supabase (PostgreSQL)", "Supabase Auth (RLS)", "Supabase Storage (foto)", "Supabase Realtime"] },
    { layer: "Export", items: ["jsPDF + autoTable", "SheetJS (xlsx)", "qrcode.react", "html2canvas"] },
  ];

  const dbTables = [
    { name: "barang", cols: "id, kode_aset, nama, kategori, satuan, stok, stok_min, gudang_id, harga, foto_url" },
    { name: "gudang", cols: "id, nama, alamat, kota, kode_lokasi" },
    { name: "transaksi", cols: "id, tipe, barang_id, jumlah, gudang_asal, gudang_tujuan, no_spk, tanggal, user_id" },
    { name: "users", cols: "id, nama, jabatan, nip, role (admin/operator/viewer)" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-black text-slate-800">Arsitektur Sistem</h1>
        <p className="text-sm text-slate-500">Tech stack, struktur folder & skema database</p>
      </div>

      {/* Tech Stack */}
      <div className="grid grid-cols-2 gap-2.5">
        {stack.map(s => (
          <div key={s.layer} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3">
            <p className="text-xs font-black text-blue-600 uppercase tracking-wider mb-2">{s.layer}</p>
            {s.items.map(item => (
              <div key={item} className="flex items-center gap-1.5 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-300 flex-shrink-0" />
                <p className="text-xs text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Folder Structure */}
      <div className="bg-slate-900 rounded-2xl p-4 overflow-x-auto">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Struktur Folder</p>
        <div className="space-y-0.5">
          {tree.map((node, i) => (
            <div key={i} className="flex items-center" style={{ paddingLeft: `${node.depth * 16}px` }}>
              <span className={`text-xs font-mono ${node.type === "folder" ? "text-amber-300" : "text-slate-400"}`}>{node.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Database Schema */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <p className="text-sm font-bold text-slate-700 mb-3">Skema Database (Supabase)</p>
        <div className="space-y-2.5">
          {dbTables.map(t => (
            <div key={t.name} className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs font-black text-blue-700 font-mono mb-1">TABLE: {t.name}</p>
              <p className="text-xs text-slate-500 font-mono leading-relaxed break-all">{t.cols}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Kode Aset Info */}
      <div className="bg-blue-50 rounded-2xl border border-blue-100 p-4">
        <p className="text-sm font-black text-blue-800 mb-2">📋 Skema Kode Aset (Permendagri No.17/2007)</p>
        <div className="font-mono text-xs space-y-1.5">
          <div className="bg-white rounded-lg p-2.5">
            <p className="text-blue-700 font-bold">Format: XX.X.X.XX.XX.XXXX</p>
            <p className="text-slate-500 mt-1">PJU . 5 . 2 . 6 . 01 . 001</p>
            <p className="text-slate-400 text-xs mt-1">└ SKPD.Akun.KelBarang.Kategori.Nomor</p>
          </div>
          <div className="text-xs text-blue-700 space-y-1 pt-1">
            <p><span className="font-bold">5.2.1</span> = Alat Tulis Kantor</p>
            <p><span className="font-bold">5.2.2</span> = Alat Berat / Mesin</p>
            <p><span className="font-bold">5.2.3</span> = Material Konstruksi</p>
            <p><span className="font-bold">5.2.6</span> = Elektronik / Lampu PJU</p>
          </div>
        </div>
      </div>

      {/* Capacitor Commands */}
      <div className="bg-slate-900 rounded-2xl p-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Deploy ke Android (Capacitor)</p>
        {[
          "# Install Capacitor",
          "npm install @capacitor/core @capacitor/cli",
          "npm install @capacitor/android",
          "",
          "# Build & Sync",
          "next build && next export",
          "npx cap add android",
          "npx cap sync android",
          "",
          "# Open in Android Studio",
          "npx cap open android",
        ].map((line, i) => (
          <p key={i} className={`text-xs font-mono ${line.startsWith("#") ? "text-emerald-400 mt-2" : line === "" ? "h-2" : "text-slate-300"}`}>{line}</p>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP SHELL
// ═══════════════════════════════════════════════════════════════════════════════
const navItems = [
  { key: "dashboard", label: "Dashboard", icon: Icons.dashboard },
  { key: "barang", label: "Barang", icon: Icons.barang },
  { key: "transaksi", label: "Transaksi", icon: Icons.transaksi },
  { key: "qr", label: "QR Scan", icon: Icons.qrcode[0] },
  { key: "laporan", label: "Laporan", icon: Icons.laporan },
  { key: "arsitektur", label: "Arsitektur", icon: Icons.gudang },
];

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [barang, setBarang] = useState(initialBarang);
  const [transaksi, setTransaksi] = useState(initialTransaksi);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const pages = {
    dashboard: <Dashboard barang={barang} transaksi={transaksi} />,
    barang: <ManajemenBarang barang={barang} setBarang={setBarang} />,
    transaksi: <Transaksi barang={barang} transaksi={transaksi} setTransaksi={setTransaksi} />,
    qr: <QRScanner barang={barang} />,
    laporan: <Laporan barang={barang} transaksi={transaksi} />,
    arsitektur: <Arsitektur />,
  };

  const alertCount = barang.filter(b => b.stok <= b.stokMin).length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800;900&display=swap');
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: #f8fafc; }
        @keyframes modalIn { from { opacity:0; transform:scale(0.95) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes scanLine { from { top: 10%; } to { top: 90%; } }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
      `}</style>

      <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", maxWidth: "430px", margin: "0 auto", position: "relative" }}>
        {/* Top Header */}
        <div className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #1e40af, #3b82f6)" }}>
                <Icon d={Icons.gudang} size={16} color="white" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-800 leading-none">e-Inventory</p>
                <p className="text-xs text-slate-400 leading-none mt-0.5">PUPKP Kota Yogyakarta</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors">
                <Icon d={Icons.bell} size={20} color="#64748b" />
                {alertCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs font-black rounded-full flex items-center justify-center leading-none">{alertCount}</span>
                )}
              </button>
              <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
                <Icon d={Icons.user} size={16} color="#3b82f6" />
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="px-4 py-5 pb-28 min-h-screen">
          {pages[page]}
        </div>

        {/* Bottom Nav */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-100 shadow-xl z-40" style={{ maxWidth: "430px" }}>
          <div className="flex items-center px-1 py-2">
            {navItems.map((n) => {
              const active = page === n.key;
              return (
                <button key={n.key} onClick={() => setPage(n.key)} className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded-xl transition-all ${active ? "text-blue-600" : "text-slate-400 hover:text-slate-600"}`}>
                  <div className={`p-1.5 rounded-xl transition-all ${active ? "bg-blue-50" : ""}`}>
                    <Icon d={n.icon} size={18} color={active ? "#3b82f6" : "currentColor"} strokeWidth={active ? 2.2 : 1.8} />
                  </div>
                  <span className={`text-xs font-bold leading-none ${active ? "text-blue-600" : "text-slate-400"}`}>{n.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
