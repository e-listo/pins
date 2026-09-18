"use client";
import { useState, useEffect } from "react";
import { addBarang, supabase } from "../../src/lib/supabase";
import { getPegawai } from "../../src/lib/auth";
import { Icon, IconPaths } from "../../src/components/ui/Icons";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { Key, Loader2, History, Search, LayoutGrid, List as ListIcon, Edit, Trash2, QrCode, Info, X, Box, ChevronLeft, ChevronRight, Printer, Settings } from "lucide-react";
import { isSuperadmin, isAdminGudang, canDelete } from "../../src/lib/roles";

// Default satuan bawaan
const defaultSatuanList = ["Unit", "Buah", "Kg", "Meter", "Liter", "Rim", "Set", "Lembar", "Roll"];

function Badge({ label, isAlert }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${isAlert ? "bg-red-500/20 text-red-400 border border-red-500/20" : "bg-slate-700 text-slate-300 border border-slate-600"}`}>{label}</span>;
}

function TrxBadge({ label, color }) {
  const colors = { masuk: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", keluar: "bg-red-500/10 text-red-400 border border-red-500/20", mutasi: "bg-amber-500/10 text-amber-400 border border-amber-500/20" };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${colors[color] || "bg-slate-700 text-slate-300 border border-slate-600"}`}>{label}</span>;
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}>
      <div className="bg-[#1e293b] border border-slate-700 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto" style={{ animation: "modalIn 0.2s ease" }}>
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

const inputCls = "w-full border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500 bg-[#0f172a] transition-colors placeholder:text-slate-600 disabled:opacity-50 disabled:bg-slate-800 disabled:cursor-not-allowed";
const selectCls = inputCls + " cursor-pointer appearance-none";

export default function ManajemenBarang() {
  const [daftarBidangUPT, setDaftarBidangUPT] = useState([]);
  const [barang, setBarang] = useState([]);
  const [gudangList, setGudangList] = useState([]);
  const [kategoriList, setKategoriList] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserBidang, setCurrentUserBidang] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterKat, setFilterKat] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [showModal, setShowModal] = useState(false);
  const [showQR, setShowQR] = useState(null);
  const [editId, setEditId] = useState(null);
  const [showDetail, setShowDetail] = useState(null);
  const [riwayatTrx, setRiwayatTrx] = useState([]);
  const [loadingRiwayat, setLoadingRiwayat] = useState(false);
  const [form, setForm] = useState({ nama: "", kategori: "", satuan: "", stok: "", stokMin: "", gudang_id: "", harga: "", bidang_upt: "" });

  const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null });
  const [deletePassword, setDeletePassword] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // --- STATE TAB NAVIGASI ---
  const [activeTab, setActiveTab] = useState("inventaris");

  // --- STATE KHUSUS CETAK MASSAL ---
  const [printSearch, setPrintSearch] = useState("");
  const [printCart, setPrintCart] = useState([]);
  const [printFormat, setPrintFormat] = useState("A4");

  const isSuperAdmin = isSuperadmin(currentUser);   // cakupan lihat data
  const bolehHapus  = canDelete(currentUser);       // hak tulis
  const dynamicSatuanList = Array.from(new Set([...defaultSatuanList, ...barang.map(b => b.satuan).filter(Boolean)])).sort();

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterKat, itemsPerPage]);

  async function loadData() {
    setLoading(true);
    try {
      const user = await getPegawai();
      setCurrentUser(user);
      const isSuper = isSuperadmin(user);
      const isOperator = isAdminGudang(user);

      let userBidangName = user?.bidang_nama || user?.bidang || user?.bidang_upt || "";
      let userBidangId = user?.bidang_id;

      if (userBidangId && !userBidangName) {
        const { data: bDataUser } = await supabase.from('bidang_upt').select('nama').eq('id', userBidangId).single();
        if (bDataUser) userBidangName = bDataUser.nama;
      } else if (userBidangName && !userBidangId) {
        const { data: bDataUser } = await supabase.from('bidang_upt').select('id').eq('nama', userBidangName).single();
        if (bDataUser) userBidangId = bDataUser.id;
      }
      setCurrentUserBidang(userBidangName);

      const { data: bData } = await supabase.from("bidang_upt").select("nama").order("nama");
      if(bData) setDaftarBidangUPT(bData.map(b=>b.nama));

      let uniqueBarang = [];

      if (isSuper) {
        const { data: dataGudang } = await supabase.from('gudang').select('*, bidang_upt:bidang_id(nama)').order('nama');
        setGudangList(dataGudang || []);

        const { data: dataBarang } = await supabase.from('barang').select('*, gudang:gudang_id(nama)').order('nama');
        uniqueBarang = dataBarang || [];
      } else {
        let gudangQuery = supabase.from('gudang').select('*, bidang_upt:bidang_id(nama)').order('nama');

        if (isOperator) {
           const { data: opData } = await supabase.from('operator_gudang').select('gudang_id').eq('pegawai_id', user.id);
           const opGudangIds = opData && opData.length > 0 ? opData.map(o => o.gudang_id) : ['00000000-0000-0000-0000-000000000000'];
           gudangQuery = gudangQuery.in('id', opGudangIds);
        } else if (userBidangId) {
           gudangQuery = gudangQuery.eq('bidang_id', userBidangId);
        } else {
           gudangQuery = gudangQuery.eq('id', '00000000-0000-0000-0000-000000000000');
        }

        const { data: dataGudang } = await gudangQuery;
        setGudangList(dataGudang || []);
        const allowedGudangIds = dataGudang ? dataGudang.map(g => g.id) : [];

        const { data: dataBarangByGudang } = allowedGudangIds.length > 0
          ? await supabase.from('barang').select('*, gudang:gudang_id(nama)').in('gudang_id', allowedGudangIds).order('nama')
          : { data: [] };

        const { data: dataBarangByBidang } = userBidangName
          ? await supabase.from('barang').select('*, gudang:gudang_id(nama)').eq('bidang_upt', userBidangName).order('nama')
          : { data: [] };

        const combined = [...(dataBarangByGudang || []), ...(dataBarangByBidang || [])];
        uniqueBarang = Array.from(new Map(combined.map(b => [b.id, b])).values());
      }

      const { data: batchData } = await supabase.from('transaksi').select('barang_id, tipe, sisa_stok, gudang_asal:gudang_asal_id(nama), gudang_tujuan:gudang_tujuan_id(nama)').gt('sisa_stok', 0);
      const stokPerGudang = {};
      if (batchData) {
        batchData.forEach(batch => {
           const bId = batch.barang_id;
           if (!stokPerGudang[bId]) stokPerGudang[bId] = {};
           let gudangNama = batch.tipe === 'mutasi' ? (batch.gudang_tujuan?.nama || "Gudang Tidak Diketahui") : (batch.gudang_asal?.nama || "Gudang Tidak Diketahui");
           if (!stokPerGudang[bId][gudangNama]) stokPerGudang[bId][gudangNama] = 0;
           stokPerGudang[bId][gudangNama] += batch.sisa_stok;
        });
      }

      const finalBarang = uniqueBarang.map(b => {
        let distribusi = Object.entries(stokPerGudang[b.id] || {}).map(([nama, qty]) => ({ nama, qty }));
        if (distribusi.length === 0 && b.stok > 0) {
            distribusi.push({ nama: b.gudang?.nama || 'Gudang Utama', qty: b.stok });
        }
        return { ...b, distribusi_stok: distribusi };
      });

      setBarang(finalBarang);

      const { data: dataKategori } = await supabase.from('kategori').select('*').order('nama');
      setKategoriList(dataKategori || []);

    } catch (error) { console.error(error); } finally { setLoading(false); }
  }

  // LOGIKA INVENTARIS
  const filteredDataUtuh = barang.filter(b =>
    (b.nama.toLowerCase().includes(search.toLowerCase()) || (b.kode_aset && b.kode_aset.toLowerCase().includes(search.toLowerCase()))) &&
    (filterKat ? b.kategori === filterKat : true)
  );

  const totalPages = Math.ceil(filteredDataUtuh.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const filteredDanPaginated = filteredDataUtuh.slice(startIndex, startIndex + itemsPerPage);

  const availableGudang = isSuperAdmin ? gudangList.filter(g => {
    if (!form.bidang_upt) return true;
    return g.bidang_upt?.nama === form.bidang_upt;
  }) : gudangList;

  const handleBidangChange = (e) => setForm({ ...form, bidang_upt: e.target.value, gudang_id: "" });
  const handleAdd = () => { setForm({ bidang_upt: isSuperAdmin ? "" : currentUserBidang, nama: "", kategori: "", satuan: "", stok: "", stokMin: "", gudang_id: "", harga: "" }); setEditId(null); setShowModal(true); };
  const handleEdit = (b) => { setForm({ nama: b.nama, kategori: b.kategori || "", satuan: b.satuan || "", stok: b.stok, stokMin: b.stok_minimum, gudang_id: b.gudang_id || "", harga: b.harga_satuan || "", bidang_upt: b.bidang_upt || (isSuperAdmin ? "" : currentUserBidang) }); setEditId(b.id); setShowModal(true); };

  const handleShowDetail = async (b) => {
    setShowDetail(b); setLoadingRiwayat(true);
    try {
      const { data } = await supabase.from('transaksi').select('*, gudang_asal:gudang_asal_id(nama), gudang_tujuan:gudang_tujuan_id(nama)').eq('barang_id', b.id).order('tanggal', { ascending: false }).order('created_at', { ascending: false });
      setRiwayatTrx(data || []);
    } catch (error) {} finally { setLoadingRiwayat(false); }
  };

  const handleSubmit = async () => {
    if (!form.nama || !form.kategori || !form.gudang_id || !form.bidang_upt) return alert("Nama, Kategori, Lokasi Gudang, dan Bidang/UPT wajib diisi!");
    setSaving(true);
    try {
      const payload = { nama: form.nama, kategori: form.kategori, satuan: form.satuan || "Unit", stok: parseInt(form.stok) || 0, stok_minimum: parseInt(form.stokMin) || 10, gudang_id: form.gudang_id, harga_satuan: parseInt(form.harga) || 0, bidang_upt: form.bidang_upt };
      if (editId) {
        await supabase.from('barang').update(payload).eq('id', editId);
      } else {
        const kat = kategoriList.find(k => k.nama === form.kategori);
        const pref = kat ? kat.prefix : "5.2.9";
        const { data: existingData } = await supabase.from('barang').select('kode_aset').like('kode_aset', `%${pref}%`);
        const maxSeq = (existingData || []).reduce((max, b) => {
          if (!b.kode_aset) return max;
          const parts = b.kode_aset.split('.');
          return (parseInt(parts[parts.length-1]) || 0) > max ? parseInt(parts[parts.length-1]) : max;
        }, 0);
        payload.kode_aset = `PUPKP.${pref}.01.${String(maxSeq + 1).padStart(3, "0")}`;
        await addBarang(payload);
      }
      await loadData();
      setShowModal(false);
      setEditId(null);
    } catch (error) { alert("Gagal: " + error.message); } finally { setSaving(false); }
  };

  const handleDeleteClick = (b) => {
    if (!bolehHapus) return alert("Anda tidak berhak menghapus data barang.");
    setDeleteModal({ isOpen: true, item: b });
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
      const { error } = await supabase.from('barang').delete().eq('id', deleteModal.item.id);
      if (error) { if (error.code === '23503') throw new Error("Barang ini masih memiliki Riwayat Transaksi."); throw error; }
      await loadData();
      setDeleteModal({ isOpen: false, item: null });
      setDeletePassword('');
    } catch (e) { alert(e.message); } finally { setSaving(false); }
  };

  const downloadQR = () => {
    const qrCanvas = document.getElementById("qr-canvas"); if (!qrCanvas) return;
    const canvas = document.createElement("canvas"); const ctx = canvas.getContext("2d");
    const titleText = "ASET DPUPKP YOGYAKARTA"; const namaBarang = showQR.nama; const kodeAset = showQR.kode_aset || "N/A"; const lokasiText = `Lokasi Utama: ${showQR.gudang?.nama || "N/A"}`;
    ctx.font = "bold 16px sans-serif"; const titleWidth = ctx.measureText(titleText).width; ctx.font = "bold 15px sans-serif"; const namaWidth = ctx.measureText(namaBarang).width; ctx.font = "bold 14px monospace"; const kodeWidth = ctx.measureText(kodeAset).width; ctx.font = "12px sans-serif"; const lokasiWidth = ctx.measureText(lokasiText).width;
    const maxTextWidth = Math.max(titleWidth, namaWidth, kodeWidth, lokasiWidth); const qrSize = qrCanvas.width; const padding = 24; const canvasWidth = Math.max(qrSize + (padding * 2), maxTextWidth + (padding * 2)); const canvasHeight = qrSize + 140;
    canvas.width = canvasWidth; canvas.height = canvasHeight; ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvasWidth, canvasHeight); ctx.strokeStyle = "#0f172a"; ctx.lineWidth = 4; ctx.strokeRect(2, 2, canvasWidth - 4, canvasHeight - 4); ctx.fillStyle = "#0f172a"; ctx.font = "bold 16px sans-serif"; ctx.textAlign = "center"; ctx.fillText(titleText, canvasWidth / 2, 30); const qrX = (canvasWidth - qrSize) / 2; ctx.drawImage(qrCanvas, qrX, 45); ctx.fillStyle = "#0f172a"; ctx.font = "bold 15px sans-serif"; ctx.fillText(namaBarang, canvasWidth / 2, qrSize + 75); ctx.fillStyle = "#d97706"; ctx.font = "bold 14px monospace"; ctx.fillText(kodeAset, canvasWidth / 2, qrSize + 98); ctx.fillStyle = "#64748b"; ctx.font = "12px sans-serif"; ctx.fillText(lokasiText, canvasWidth / 2, qrSize + 118);
    const url = canvas.toDataURL("image/png"); const link = document.createElement("a"); link.href = url; link.download = `Stiker_Aset_${showQR.kode_aset || 'PUPKP'}.png`; document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const renderPagination = () => {
    if (filteredDataUtuh.length === 0) return null;
    return (
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 bg-[#1e293b] p-4 rounded-xl border border-slate-700 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400">Tampilkan:</span>
          <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} className="bg-[#0f172a] text-white text-sm font-bold border border-slate-600 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"><option value={20}>20</option><option value={40}>40</option><option value={100}>100</option></select>
          <span className="text-sm text-slate-400">dari {filteredDataUtuh.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg bg-[#0f172a] text-slate-400 border border-slate-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><ChevronLeft size={18} /></button>
          <span className="text-sm font-bold text-slate-300">Hal <span className="text-amber-500">{currentPage}</span> / {totalPages || 1}</span>
          <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0} className="p-1.5 rounded-lg bg-[#0f172a] text-slate-400 border border-slate-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><ChevronRight size={18} /></button>
        </div>
      </div>
    );
  };

  // --- LOGIKA CETAK MASSAL ---
  const printSearchResults = printSearch ? barang.filter(b => b.nama.toLowerCase().includes(printSearch.toLowerCase()) || (b.kode_aset && b.kode_aset.toLowerCase().includes(printSearch.toLowerCase()))).slice(0, 10) : [];
  
  const addItemToPrint = (b) => {
    const existing = printCart.find(item => item.id === b.id);
    if (existing) {
      setPrintCart(printCart.map(item => item.id === b.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setPrintCart([...printCart, { ...b, qty: 1 }]);
    }
    setPrintSearch(""); 
  };

  const updatePrintQty = (id, newQty) => {
    const qty = parseInt(newQty) || 1;
    setPrintCart(printCart.map(item => item.id === id ? { ...item, qty: Math.max(1, qty) } : item));
  };

  const removePrintItem = (id) => setPrintCart(printCart.filter(item => item.id !== id));
  
  const handlePrintMassal = () => {
    if (printCart.length === 0) return alert("Pilih minimal 1 barang untuk dicetak!");
    window.print();
  };

  const printElements = [];
  printCart.forEach(item => {
    for(let i = 0; i < item.qty; i++) printElements.push(item);
  });

  return (
    <>
      {/* CSS PRINT HANYA AKTIF SAAT TAB CETAK DIPILIH */}
      {activeTab === 'cetak' && (
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            body { background-color: white !important; margin: 0; padding: 0; }
            .no-print, header, nav, aside, .sidebar { display: none !important; }
            #print-area { display: block !important; position: absolute; top: 0; left: 0; width: 100%; background: white; color: black; margin: 0; padding: 0; }
            @page { margin: 5mm; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
        `}} />
      )}

      {/* TAMPILAN UTAMA (NON-PRINT) */}
      <div className={`space-y-6 pb-20 max-w-7xl mx-auto p-4 sm:p-6 ${activeTab === 'cetak' ? 'no-print' : ''}`}>
        
        {/* HEADER & TABS */}
        <div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-5">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white">Manajemen Barang</h1>
              <p className="text-sm text-slate-400 mt-1">
                {activeTab === 'inventaris' ? `${filteredDataUtuh.length} aset dari ${isSuperAdmin ? "seluruh instansi" : currentUserBidang || "instansi Anda"} ditemukan` : "Alat bantu cetak label barcode massal"}
              </p>
            </div>
            {activeTab === 'inventaris' && (
              <button onClick={handleAdd} className="flex items-center justify-center gap-2 bg-amber-500 text-slate-900 text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-amber-400 active:scale-95 transition-all shadow-lg shadow-amber-900/20 w-full md:w-auto">
                <span className="text-lg leading-none">+</span> Tambah Master Barang
              </button>
            )}
          </div>

          <div className="flex flex-wrap bg-[#1e293b] border border-slate-700 rounded-xl p-1.5 gap-1.5 shadow-lg">
            <button onClick={() => setActiveTab('inventaris')} className={`flex flex-1 justify-center items-center gap-2 text-xs md:text-sm font-bold py-2.5 px-3 rounded-lg transition-all border ${activeTab === 'inventaris' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              <Box size={16} /> Data Inventaris
            </button>
            <button onClick={() => setActiveTab('cetak')} className={`flex flex-1 justify-center items-center gap-2 text-xs md:text-sm font-bold py-2.5 px-3 rounded-lg transition-all border ${activeTab === 'cetak' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              <Printer size={16} /> Cetak Barcode Massal
            </button>
          </div>
        </div>

        {/* --- TAB 1: DATA INVENTARIS --- */}
        {activeTab === 'inventaris' && (
          <>
            {/* TOOLBAR INVENTARIS */}
            <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-[#1e293b] p-2.5 rounded-xl border border-slate-700 shadow-sm">
              <div className="flex w-full lg:w-auto flex-col md:flex-row gap-3 items-center flex-1">
                <div className="relative w-full md:max-w-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search size={16} className="text-slate-400" /></div>
                  <input type="text" placeholder="Cari nama atau NUP..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-[#0f172a] border border-slate-600 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors" />
                </div>
                <select value={filterKat} onChange={e => setFilterKat(e.target.value)} className="w-full md:w-48 px-3 py-2 bg-[#0f172a] border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none transition-colors">
                  <option value="">Semua Kategori</option>
                  {kategoriList.map(k => <option key={k.id} value={k.nama}>{k.nama}</option>)}
                </select>
              </div>
              <div className="flex w-full md:w-auto justify-center lg:justify-end">
                <div className="flex bg-[#0f172a] border border-slate-600 rounded-lg p-1 w-full md:w-auto justify-center">
                  <button onClick={() => setViewMode('grid')} className={`p-1.5 px-4 rounded-md flex items-center gap-2 transition-all ${viewMode === 'grid' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><LayoutGrid size={16} /> <span className="text-xs font-bold md:hidden">Grid</span></button>
                  <button onClick={() => setViewMode('list')} className={`p-1.5 px-4 rounded-md flex items-center gap-2 transition-all ${viewMode === 'list' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><ListIcon size={16} /> <span className="text-xs font-bold md:hidden">List</span></button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-20 flex flex-col items-center gap-3"><Loader2 size={32} className="animate-spin text-blue-500" /><span className="text-slate-400 text-sm font-bold">Memuat data inventaris...</span></div>
            ) : filteredDataUtuh.length === 0 ? (
              <div className="text-center py-20 bg-[#1e293b] rounded-2xl border border-slate-700 border-dashed"><p className="text-slate-400">Tidak ada barang yang sesuai dengan pencarian atau filter.</p></div>
            ) : viewMode === "grid" ? (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredDanPaginated.map((b) => {
                    const isAlert = b.stok <= b.stok_minimum;
                    return (
                      <div key={b.id} className={`bg-[#1e293b] rounded-2xl border p-5 flex flex-col transition-all hover:border-slate-500 shadow-lg group relative ${isAlert ? "border-red-500/50 shadow-red-900/10" : "border-slate-700"}`}>
                        <div className="flex items-start gap-3 mb-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isAlert ? "bg-red-500/10 text-red-400" : "bg-blue-500/10 text-blue-400"}`}><Icon d={IconPaths.box} size={20} /></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-mono text-slate-400">{b.kode_aset || "N/A"}</p>
                            <button onClick={() => handleShowDetail(b)} className="font-bold text-white text-base text-left truncate w-full hover:text-amber-400 transition-colors mt-0.5">{b.nama}</button>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5 mb-5">
                          <div className="flex items-center gap-2"><Badge label={b.kategori || "Tanpa Kategori"} /> {isAlert && <Badge label="Stok Rendah" isAlert />}</div>
                          <span className="text-xs text-slate-400 truncate mt-1">🏢 {b.bidang_upt || "DPUPKP Umum"}</span>
                          <div className="flex flex-col gap-1 mt-1">
                            {b.distribusi_stok?.length > 0 ? (
                              b.distribusi_stok.map((dist, idx) => (
                                <span key={idx} className="text-[11px] text-slate-400 truncate flex justify-between items-center bg-[#0f172a] border border-slate-700 px-2 py-1.5 rounded-lg">
                                  <span>📍 {dist.nama?.split("–")[0]?.trim()}</span><span className="font-bold text-blue-400">{dist.qty}</span>
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-slate-500 truncate italic px-2 py-1.5 bg-[#0f172a] border border-slate-700 rounded-lg">Stok Kosong</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-end justify-between pt-4 border-t border-slate-700/80 mt-auto">
                          <div className="flex gap-2">
                            <button onClick={() => handleShowDetail(b)} className="p-1.5 bg-[#0f172a] text-amber-400 hover:bg-amber-500/20 rounded-md transition-colors border border-slate-700" title="Riwayat"><Info size={14} /></button>
                            <button onClick={() => setShowQR(b)} className="p-1.5 bg-[#0f172a] text-emerald-400 hover:bg-emerald-500/20 rounded-md transition-colors border border-slate-700" title="Cetak QR Label"><QrCode size={14} /></button>
                            <button onClick={() => handleEdit(b)} className="p-1.5 bg-[#0f172a] text-slate-400 hover:text-blue-400 rounded-md transition-colors border border-slate-700" title="Edit Data"><Edit size={14} /></button>
                            <button onClick={() => handleDeleteClick(b)} disabled={!bolehHapus} className={`p-1.5 rounded-md transition-colors border border-slate-700 ${bolehHapus ? 'bg-[#0f172a] text-red-400 hover:bg-red-500/20' : 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-60'}`} title="Hapus Permanen"><Trash2 size={14} /></button>
                          </div>
                          <div className="text-right">
                            <p className={`text-xl leading-none font-black ${isAlert ? "text-red-400" : "text-white"}`}>{b.stok}</p>
                            <p className="text-[10px] font-semibold text-slate-500 uppercase mt-1">{b.satuan}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {renderPagination()}
              </div>
            ) : (
              <div>
                <div className="bg-[#1e293b] rounded-2xl border border-slate-700 overflow-hidden shadow-lg overflow-x-auto">
                  <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="bg-[#0f172a] text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-700">
                      <tr><th className="px-5 py-4">Nama Barang & NUP</th><th className="px-5 py-4">Kategori & Lokasi</th><th className="px-5 py-4 text-right">Stok</th><th className="px-5 py-4 text-center">Aksi</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {filteredDanPaginated.map(b => (
                        <tr key={b.id} className="hover:bg-[#253243] transition-colors">
                          <td className="px-5 py-3">
                            <button onClick={() => handleShowDetail(b)} className="font-bold text-white text-sm hover:text-amber-400 transition-colors text-left">{b.nama}</button>
                            <p className="text-[11px] font-mono text-blue-400 mt-0.5">{b.kode_aset || "N/A"}</p>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex flex-col gap-1.5 items-start">
                              <Badge label={b.kategori || "Tanpa Kategori"} />
                              <div className="flex flex-col gap-1 mt-1">
                                <span className="text-[11px] text-slate-400 font-semibold mb-0.5">🏢 {b.bidang_upt}</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {b.distribusi_stok?.length > 0 ? (
                                    b.distribusi_stok.map((dist, idx) => (
                                      <span key={idx} className="inline-flex items-center gap-1.5 text-[10px] bg-[#0f172a] border border-slate-700 px-2 py-1 rounded text-slate-300">
                                        <span>{dist.nama?.split("–")[0]?.trim()}</span><span className="font-bold text-blue-400">({dist.qty})</span>
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-[10px] text-slate-500 italic">Stok Habis</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <p className={`text-base font-black leading-none ${b.stok <= b.stok_minimum ? "text-red-400" : "text-white"}`}>{b.stok}</p>
                            <p className="text-[10px] text-slate-500 font-semibold uppercase mt-1">{b.satuan} {b.stok <= b.stok_minimum && <span className="text-red-400">(Min)</span>}</p>
                          </td>
                          <td className="px-5 py-3 text-center">
                            <div className="flex justify-center items-center gap-1.5">
                              <button onClick={() => handleShowDetail(b)} className="p-1.5 bg-[#0f172a] text-amber-400 hover:bg-amber-500/20 rounded-md transition-colors border border-slate-700"><Info size={14} /></button>
                              <button onClick={() => setShowQR(b)} className="p-1.5 bg-[#0f172a] text-emerald-400 hover:bg-emerald-500/20 rounded-md transition-colors border border-slate-700"><QrCode size={14} /></button>
                              <button onClick={() => handleEdit(b)} className="p-1.5 bg-[#0f172a] text-slate-400 hover:text-blue-400 rounded-md transition-colors border border-slate-700"><Edit size={14} /></button>
                              <button onClick={() => handleDeleteClick(b)} disabled={!bolehHapus} className={`p-1.5 rounded-md transition-colors border border-slate-700 ${bolehHapus ? 'bg-[#0f172a] text-red-400 hover:bg-red-500/20' : 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-60'}`}><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {renderPagination()}
              </div>
            )}
          </>
        )}

        {/* --- TAB 2: CETAK BARCODE MASSAL --- */}
        {activeTab === 'cetak' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-[#1e293b] p-5 rounded-2xl border border-slate-700 shadow-xl">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-4"><Settings size={16} className="text-amber-500" /> Target Cetakan</h3>
                <div className="space-y-3">
                  <label className={`block p-3 rounded-xl border cursor-pointer transition-colors ${printFormat === 'A4' ? 'bg-amber-500/10 border-amber-500' : 'bg-[#0f172a] border-slate-700 hover:border-slate-500'}`}>
                    <div className="flex items-center gap-3">
                      <input type="radio" name="format" value="A4" checked={printFormat === 'A4'} onChange={(e) => setPrintFormat(e.target.value)} className="w-4 h-4 text-amber-500 focus:ring-amber-500 bg-slate-800 border-slate-600" />
                      <div><p className="font-bold text-white text-sm">Kertas A4 (Grid Rapat)</p><p className="text-[10px] text-slate-400">Setengah ukuran namecard (50x45mm) dengan garis potong.</p></div>
                    </div>
                  </label>
                  <label className={`block p-3 rounded-xl border cursor-pointer transition-colors ${printFormat === 'Label' ? 'bg-amber-500/10 border-amber-500' : 'bg-[#0f172a] border-slate-700 hover:border-slate-500'}`}>
                    <div className="flex items-center gap-3">
                      <input type="radio" name="format" value="Label" checked={printFormat === 'Label'} onChange={(e) => setPrintFormat(e.target.value)} className="w-4 h-4 text-amber-500 focus:ring-amber-500 bg-slate-800 border-slate-600" />
                      <div><p className="font-bold text-white text-sm">Printer Label Thermal</p><p className="text-[10px] text-slate-400">1 Label per halaman. Khusus printer resi/stiker.</p></div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="bg-[#1e293b] p-5 rounded-2xl border border-slate-700 shadow-xl relative">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-4"><Search size={16} className="text-amber-500" /> Cari Barang</h3>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search size={16} className="text-slate-500" /></div>
                  <input type="text" placeholder="Ketik nama / NUP barang..." value={printSearch} onChange={(e) => setPrintSearch(e.target.value)} className="w-full pl-9 pr-4 py-3 bg-[#0f172a] border border-slate-600 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors" />
                </div>
                {printSearch && (
                  <div className="absolute left-0 right-0 mt-2 bg-[#1e293b] border border-slate-600 rounded-xl shadow-2xl overflow-hidden z-20">
                    {printSearchResults.length > 0 ? (
                      <ul className="max-h-60 overflow-y-auto divide-y divide-slate-700/50">
                        {printSearchResults.map(b => (
                          <li key={b.id}>
                            <button onClick={() => addItemToPrint(b)} className="w-full text-left p-3 hover:bg-slate-800 transition-colors flex items-start gap-3">
                              <Box size={16} className="text-slate-400 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-bold text-white">{b.nama}</p>
                                <p className="text-[10px] text-amber-500 font-mono mt-0.5">{b.kode_aset || 'N/A'}</p>
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (<div className="p-4 text-center text-sm text-slate-400">Barang tidak ditemukan.</div>)}
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-2 flex flex-col h-[calc(100vh-16rem)] min-h-[500px]">
              <div className="bg-[#1e293b] rounded-t-2xl border-t border-l border-r border-slate-700 p-5 shadow-xl flex justify-between items-center shrink-0">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2"><Box size={16} className="text-emerald-500" /> Daftar Antrean Cetak</h3>
                <span className="bg-slate-800 text-slate-300 text-xs font-bold px-3 py-1 rounded-full border border-slate-600">Total Cetak: {printElements.length} Label</span>
              </div>
              <div className="flex-1 bg-[#0f172a] border-l border-r border-slate-700 overflow-y-auto p-4 custom-scrollbar space-y-3">
                {printCart.length === 0 ? (
                  <div className="h-full flex flex-col justify-center items-center text-slate-500 opacity-60">
                    <QrCode size={64} className="mb-4" />
                    <p className="font-bold">Belum ada barang dipilih</p>
                    <p className="text-sm">Gunakan pencarian di sebelah kiri untuk menambah label.</p>
                  </div>
                ) : (
                  printCart.map((item, idx) => (
                    <div key={item.id} className="bg-[#1e293b] border border-slate-600 rounded-xl p-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="bg-slate-800 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-700">#{idx + 1}</span>
                          <p className="text-[10px] text-amber-500 font-mono">{item.kode_aset || 'N/A'}</p>
                        </div>
                        <p className="font-bold text-white text-sm truncate">{item.nama}</p>
                        <p className="text-xs text-slate-400 truncate mt-0.5">Lokasi Utama: {item.gudang?.nama || item.distribusi_stok?.[0]?.nama || '-'}</p>
                      </div>
                      <div className="flex items-center gap-4 w-full sm:w-auto border-t sm:border-t-0 border-slate-700 pt-3 sm:pt-0 mt-3 sm:mt-0">
                        <div className="flex items-center gap-2 bg-[#0f172a] border border-slate-600 rounded-lg p-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase ml-2">Jml:</span>
                          <input type="number" min="1" value={item.qty} onChange={(e) => updatePrintQty(item.id, e.target.value)} className="w-16 bg-transparent text-white font-black text-center focus:outline-none" />
                        </div>
                        <button onClick={() => removePrintItem(item.id)} className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors border border-transparent hover:border-red-500/30" title="Hapus"><Trash2 size={18} /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="bg-[#1e293b] rounded-b-2xl border-b border-l border-r border-slate-700 p-5 shadow-xl shrink-0">
                <button onClick={handlePrintMassal} disabled={printCart.length === 0} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20">
                  <Printer size={20} /> EKSEKUSI CETAK {printElements.length} BARCODE
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* --- AREA PRINT CETAK MASSAL (HANYA MUNCUL SAAT DI-PRINT) --- */}
      {activeTab === 'cetak' && (
        <div id="print-area" className="hidden">
          {printFormat === 'A4' ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0', justifyContent: 'flex-start', alignContent: 'flex-start' }}>
              {printElements.map((item, idx) => (
                <div key={idx} style={{ 
                  width: '50mm', /* ~5cm - muat 4 kolom dalam A4 (210mm) */
                  height: '45mm', /* Setengah Namecard standar */
                  border: '1px dashed #666', /* GARIS BANTU POTONG */
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  textAlign: 'center', 
                  boxSizing: 'border-box',
                  padding: '4px',
                  pageBreakInside: 'avoid'
                }}>
                  <p style={{ fontSize: '8px', fontWeight: '900', marginBottom: '2px', textTransform: 'uppercase' }}>DPUPKP Yogyakarta</p>
                  <QRCodeSVG value={`PUPKP|${item.kode_aset}|${item.nama}|${item.gudang?.nama || item.distribusi_stok?.[0]?.nama}`} size={60} level={"H"} />
                  <p style={{ fontSize: '8px', fontWeight: 'bold', marginTop: '3px', lineHeight: '1.1', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nama}</p>
                  <p style={{ fontSize: '7px', fontFamily: 'monospace', fontWeight: 'bold', marginTop: '1px' }}>{item.kode_aset || 'N/A'}</p>
                </div>
              ))}
            </div>
          ) : (
            <div>
              {printElements.map((item, idx) => (
                <div key={idx} style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', pageBreakAfter: 'always', padding: '10px', boxSizing: 'border-box' }}>
                  <p style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px', borderBottom: '2px solid black', paddingBottom: '4px' }}>ASET DPUPKP YK</p>
                  <QRCodeSVG value={`PUPKP|${item.kode_aset}|${item.nama}|${item.gudang?.nama || item.distribusi_stok?.[0]?.nama}`} size={120} level={"H"} />
                  <p style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '10px', lineHeight: '1.2' }}>{item.nama}</p>
                  <p style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 'bold', marginTop: '4px' }}>{item.kode_aset || 'N/A'}</p>
                  <p style={{ fontSize: '10px', marginTop: '4px' }}>{item.gudang?.nama || item.distribusi_stok?.[0]?.nama || '-'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- MODAL INVENTARIS --- */}
      {showDetail && (
        <Modal title="Buku Log Barang (Riwayat)" onClose={() => setShowDetail(null)}>
          <div className="mb-5 bg-[#0f172a] p-4 rounded-xl border border-slate-700">
            <h4 className="text-base font-bold text-white leading-tight">{showDetail.nama}</h4>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs font-mono text-amber-400">{showDetail.kode_aset || "NUP N/A"}</span>
              <span className="text-xs text-slate-400">Sisa Stok: <strong className="text-white text-sm">{showDetail.stok} {showDetail.satuan}</strong></span>
            </div>
          </div>
          <div className="max-h-[50vh] overflow-y-auto pr-1 space-y-3 custom-scrollbar">
            {loadingRiwayat ? (
              <div className="text-center py-10 text-slate-400">Menarik data transaksi...</div>
            ) : riwayatTrx.length === 0 ? (
              <div className="text-center py-10 text-slate-500 bg-[#0f172a] rounded-xl border border-slate-800 border-dashed">Belum ada riwayat pergerakan.</div>
            ) : (
              riwayatTrx.map(trx => (
                <div key={trx.id} className="p-3 bg-[#0f172a] rounded-xl border border-slate-700 flex items-start gap-3 hover:border-slate-500 transition-colors">
                  <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${trx.tipe === 'masuk' ? 'bg-emerald-500/10 text-emerald-400' : trx.tipe === 'keluar' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
                    <Icon d={IconPaths.transaksi} size={16} color="currentColor" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <TrxBadge label={trx.tipe} color={trx.tipe} />
                      <span className="text-[10px] font-mono text-slate-500">{new Date(trx.tanggal).toLocaleDateString("id-ID")}</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-300">
                      {trx.tipe === 'masuk' ? `Ke: ${trx.gudang_asal?.nama || 'Gudang'}` : trx.tipe === 'keluar' ? `Dari: ${trx.gudang_asal?.nama || 'Gudang'}` : `Mutasi ke: ${trx.gudang_tujuan?.nama || 'Gudang'}`}
                    </p>
                    {trx.keterangan && <p className="text-[10px] text-amber-400/80 italic mt-1 leading-tight">"{trx.keterangan}"</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-lg font-black leading-none ${trx.tipe === 'masuk' ? 'text-emerald-400' : trx.tipe === 'keluar' ? 'text-red-400' : 'text-amber-400'}`}>{trx.jumlah}</p>
                    <p className="text-[9px] text-slate-500 font-semibold uppercase mt-1">{showDetail.satuan}</p>
                    {trx.tipe === 'masuk' && trx.harga_satuan > 0 && <p className="text-[9px] text-emerald-500 font-mono mt-1.5">@ Rp {trx.harga_satuan.toLocaleString('id-ID')}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        </Modal>
      )}

      {showModal && (
        <Modal title={editId ? "Edit Data Barang" : "Registrasi Master Barang"} onClose={() => setShowModal(false)}>
          <Field label="Alokasi Bidang / UPT Terkait *">
            <select className={selectCls + (!isSuperAdmin ? " opacity-60 cursor-not-allowed bg-slate-800" : "")} value={form.bidang_upt} onChange={handleBidangChange} disabled={!isSuperAdmin}>
              <option value="">-- Pilih Bidang / UPT --</option>
              {daftarBidangUPT.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </Field>
          <Field label="Nama Barang *"><input className={inputCls} placeholder="cth. Lampu LED Jalan 150W" value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Kategori *">
              <select className={selectCls} value={form.kategori} onChange={e => setForm({ ...form, kategori: e.target.value })}>
                <option value="">Pilih...</option>
                {kategoriList.map(k => <option key={k.id} value={k.nama}>{k.nama}</option>)}
              </select>
            </Field>
            <Field label="Satuan *">
              <input list="satuan-options" className={inputCls} value={form.satuan} onChange={e => setForm({ ...form, satuan: e.target.value })} placeholder="Pilih atau ketik baru..." />
              <datalist id="satuan-options">{dynamicSatuanList.map(s => <option key={s} value={s} />)}</datalist>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Stok Fisik Awal"><input type="number" className={inputCls} value={form.stok} onChange={e => setForm({ ...form, stok: e.target.value })} placeholder="0" /></Field>
            <Field label="Peringatan Stok Minimum"><input type="number" className={inputCls} value={form.stokMin} onChange={e => setForm({ ...form, stokMin: e.target.value })} placeholder="10" /></Field>
          </div>
          <Field label="Lokasi Penyimpanan (Gudang Utama) *">
            <select className={selectCls} value={form.gudang_id} onChange={e => setForm({ ...form, gudang_id: e.target.value })} disabled={!form.bidang_upt && isSuperAdmin}>
              <option value="">{form.bidang_upt ? "Pilih gudang..." : "Pilih Bidang/UPT lebih dulu..."}</option>
              {availableGudang.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
            </select>
          </Field>
          <div className="flex gap-3 pt-4 mt-2 border-t border-slate-700/80">
            <button onClick={() => setShowModal(false)} className="flex-1 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-slate-300 hover:text-white transition-colors">Batal</button>
            <button onClick={handleSubmit} disabled={saving} className="flex-1 py-3 bg-amber-500 text-slate-900 rounded-xl text-sm font-black hover:bg-amber-400 disabled:opacity-50 shadow-lg shadow-amber-900/20 transition-all">{saving ? "Memproses..." : (editId ? "Update Data" : "Simpan Master Barang")}</button>
          </div>
        </Modal>
      )}

      {showQR && (
        <Modal title={`QR Code Aset Identifikasi`} onClose={() => setShowQR(null)}>
          <div className="flex flex-col items-center gap-6">
            <div className="p-4 bg-white border-4 border-slate-200 rounded-3xl shadow-xl">
              <QRCodeCanvas id="qr-canvas" value={`PUPKP|${showQR.kode_aset}|${showQR.nama}|${showQR.gudang?.nama}`} size={200} level={"H"} includeMargin={true} />
            </div>
            <div className="text-center">
              <p className="font-bold text-white text-lg">{showQR.nama}</p>
              <p className="text-sm font-mono text-amber-400 mt-1">{showQR.kode_aset}</p>
            </div>
            <button onClick={downloadQR} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-900/20 transition-all">Unduh Label untuk Dicetak</button>
          </div>
        </Modal>
      )}

      {deleteModal.isOpen && (
        <Modal title="Otorisasi Hapus Master Barang" onClose={() => { setDeleteModal({ isOpen: false, item: null }); setDeletePassword(''); }}>
          <div className="space-y-4">
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-400 text-sm leading-relaxed mb-2">
              <strong className="block mb-1 text-base">Hapus Permanen?</strong>
              Menghapus master barang ini akan melenyapkan data aset selamanya. Pastikan barang ini tidak memiliki riwayat transaksi yang masih terhubung.
            </div>
            <div className="bg-[#0f172a] p-3 rounded-xl border border-slate-700">
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Target Hapus</span>
              <span className="block text-sm font-bold text-white">{deleteModal.item?.nama}</span>
              <span className="block text-xs font-mono text-amber-500 mt-0.5">{deleteModal.item?.kode_aset}</span>
            </div>
            <Field label="Password Super Admin">
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"><Key size={16} /></div>
                <input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} placeholder="Masukkan password Anda..." className={`${inputCls} pl-10 focus:ring-red-500 focus:border-red-500`} autoComplete="new-password" />
              </div>
            </Field>
            <div className="flex gap-3 pt-4 border-t border-slate-700/80">
              <button onClick={() => { setDeleteModal({ isOpen: false, item: null }); setDeletePassword(''); }} disabled={saving} className="flex-1 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-slate-300 hover:text-white transition-colors">Batal</button>
              <button onClick={executeDelete} disabled={saving || !deletePassword} className="flex-1 py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-500 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-red-900/20 transition-all">{saving ? <Loader2 size={16} className="animate-spin" /> : null}{saving ? "Memverifikasi..." : "Ya, Hapus Data"}</button>
            </div>
          </div>
        </Modal>
      )}

    </>
  );
}
