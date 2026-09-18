"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../src/lib/supabase";
import { getPegawai } from "../../src/lib/auth";
import { Icon, IconPaths } from "../../src/components/ui/Icons";
import { Search, Edit, Trash2, Key, Loader2, X, Info, Box, LayoutGrid, List as ListIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { isSuperadmin, canDelete } from "../../src/lib/roles";

function Badge({ label, color }) {
  const colors = {
    masuk: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    keluar: "bg-red-500/10 text-red-400 border border-red-500/20",
    mutasi: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    semua: "bg-slate-700 text-slate-300 border border-slate-600",
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${colors[color] || colors.semua}`}>{label}</span>;
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

export default function Transaksi() {
  const [daftarBidangUPT, setDaftarBidangUPT] = useState([]);
  const [transaksi, setTransaksi] = useState([]);
  const [barangList, setBarangList] = useState([]);
  const [gudangList, setGudangList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("masuk");
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserBidang, setCurrentUserBidang] = useState(""); 
  const isSuperAdmin = isSuperadmin(currentUser);   // cakupan lihat data
  const bolehHapus  = canDelete(currentUser);       // hak tulis

  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ barang_id: "", jumlah: "", gudang_asal_id: "", gudang_tujuan_id: "", no_spk: "", keterangan: "", harga_satuan: "", bidang_upt: "" });

  const [detailModal, setDetailModal] = useState({ isOpen: false, item: null });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null });
  const [deletePassword, setDeletePassword] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => { loadData(); }, []);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, tab, itemsPerPage]);

  async function loadData() {
    setLoading(true);
    try {
      const user = await getPegawai();
      setCurrentUser(user);
      const isSuper = isSuperadmin(user);

      let userBidangName = user?.bidang?.nama || user?.bidang_upt?.nama || user?.bidang_nama || "";
      if (!userBidangName && user?.bidang_id) {
        const { data: bDataUser } = await supabase.from('bidang_upt').select('nama').eq('id', user.bidang_id).single();
        if (bDataUser) userBidangName = bDataUser.nama;
      }
      setCurrentUserBidang(userBidangName);

      const { data: bData } = await supabase.from("bidang_upt").select("nama").order("nama");
      if(bData) setDaftarBidangUPT(bData.map(b=>b.nama));

      let trxQuery = supabase
        .from('transaksi')
        .select(`*, barang:barang_id(nama, kode_aset, satuan, stok, kategori), gudang_asal:gudang_asal_id(nama), gudang_tujuan:gudang_tujuan_id(nama)`)
        .order('tanggal', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(2000);

      if (!isSuper && userBidangName) {
        trxQuery = trxQuery.eq('bidang_upt', userBidangName);
      }
      const { data: dataTrx } = await trxQuery;
      setTransaksi(dataTrx || []);

      let gudangQuery = supabase.from('gudang').select('*, bidang_upt:bidang_id(nama)').order('nama');
      if (!isSuper && user?.bidang_id) {
        gudangQuery = gudangQuery.eq('bidang_id', user.bidang_id);
      }
      const { data: dataGudang } = await gudangQuery;
      setGudangList(dataGudang || []);

      let barangQuery = supabase.from('barang').select('*').order('nama');
      if (!isSuper && dataGudang && dataGudang.length > 0) {
        const allowedGudangIds = dataGudang.map(g => g.id);
        barangQuery = barangQuery.in('gudang_id', allowedGudangIds);
      } else if (!isSuper) {
        barangQuery = barangQuery.eq('id', 'null'); 
      }
      const { data: dataBrg } = await barangQuery;
      setBarangList(dataBrg || []);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const availableBarang = barangList.filter(b => {
    if (!form.bidang_upt) return true; 
    const gudangOfBarang = gudangList.find(g => g.id === b.gudang_id);
    return gudangOfBarang?.bidang_upt?.nama === form.bidang_upt;
  });

  const availableGudangAsal = gudangList.filter(g => {
    if (!form.bidang_upt) return true;
    return g.bidang_upt?.nama === form.bidang_upt;
  });

  const handleBarangChange = (e) => {
    const bId = e.target.value;
    const selectedBarang = barangList.find(b => b.id === bId);
    setForm({
      ...form,
      barang_id: bId,
      gudang_asal_id: selectedBarang?.gudang_id || "", 
      harga_satuan: selectedBarang && tab === "masuk" ? selectedBarang.harga_satuan : ""
    });
  };

  const handleBidangChange = (e) => {
    setForm({ ...form, bidang_upt: e.target.value, barang_id: "", gudang_asal_id: "", harga_satuan: "" });
  };

  const handleEdit = (t) => {
    setTab(t.tipe);
    setEditId(t.id);
    setForm({
      barang_id: t.barang_id || "",
      jumlah: t.jumlah || "",
      gudang_asal_id: t.gudang_asal_id || "",
      gudang_tujuan_id: t.gudang_tujuan_id || "",
      no_spk: t.no_spk || "",
      keterangan: t.keterangan || "",
      harga_satuan: t.harga_satuan || "",
      bidang_upt: t.bidang_upt || ""
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.barang_id || !form.jumlah || !form.gudang_asal_id || !form.bidang_upt) return alert("Barang, Jumlah, Gudang, dan Bidang/UPT wajib diisi!");
    if (tab === "mutasi" && !form.gudang_tujuan_id) return alert("Gudang tujuan wajib diisi untuk mutasi!");
    if (tab === "mutasi" && form.gudang_asal_id === form.gudang_tujuan_id) return alert("Gudang asal dan tujuan tidak boleh sama!");
    
    setSaving(true);
    try {
      if (editId) {
        // Mode EDIT HANYA BISA MERUBAH METADATA (Untuk menjaga integritas FIFO)
        const updatePayload = { no_spk: form.no_spk, keterangan: form.keterangan, bidang_upt: form.bidang_upt };
        const { error } = await supabase.from('transaksi').update(updatePayload).eq('id', editId);
        if (error) throw error;
      } else {
        // MODE INSERT - LOGIKA PERPETUAL FIFO AKTIF
        const date = new Date();
        const trxPrefix = `TRX-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
        const randomID = Math.floor(Math.random() * 9000) + 1000;
        const nomor_transaksi = `${trxPrefix}-${randomID}`;

        const qtyNum = parseInt(form.jumlah);
        const hargaNum = tab === "masuk" ? parseInt(form.harga_satuan) || 0 : 0;
        const selectedBarang = barangList.find(b => b.id === form.barang_id);

        if ((tab === "keluar" || tab === "mutasi") && selectedBarang.stok < qtyNum) {
          throw new Error(`Stok global tidak mencukupi! Sisa stok saat ini hanya ${selectedBarang.stok} ${selectedBarang.satuan}.`);
        }

        let newTrxPayload = {
          nomor_transaksi, tipe: tab, barang_id: form.barang_id, jumlah: qtyNum,
          gudang_asal_id: form.gudang_asal_id, gudang_tujuan_id: tab === "mutasi" ? form.gudang_tujuan_id : null,
          tanggal: date.toISOString().split("T")[0], no_spk: form.no_spk, keterangan: form.keterangan, bidang_upt: form.bidang_upt
        };

        let fifoDetailsToInsert = [];
        let batchUpdates = [];

        if (tab === "masuk") {
          // BATCH BARU
          newTrxPayload.sisa_stok = qtyNum;
          newTrxPayload.harga_satuan = hargaNum;
          newTrxPayload.total_nilai = hargaNum * qtyNum;
        } else {
          // MESIN PEMOTONG FIFO
          const { data: batches, error: errBatches } = await supabase
            .from('transaksi')
            .select('id, sisa_stok, harga_satuan, tipe, gudang_asal_id, gudang_tujuan_id, nomor_transaksi')
            .eq('barang_id', form.barang_id)
            .gt('sisa_stok', 0)
            .order('tanggal', { ascending: true })
            .order('created_at', { ascending: true });

          if (errBatches) throw errBatches;

          // Saring batch yang ada di gudang asal
          let validBatches = (batches || []).filter(b =>
            (b.tipe === 'masuk' && b.gudang_asal_id === form.gudang_asal_id) ||
            (b.tipe === 'mutasi' && b.gudang_tujuan_id === form.gudang_asal_id) ||
            (b.nomor_transaksi.startsWith('SA-') && b.gudang_asal_id === form.gudang_asal_id)
          );

          let remaining = qtyNum;
          let totalHPP = 0;

          for (let b of validBatches) {
            if (remaining <= 0) break;
            let take = Math.min(b.sisa_stok, remaining);
            remaining -= take;
            totalHPP += take * (b.harga_satuan || 0);

            batchUpdates.push({ id: b.id, sisa_stok: b.sisa_stok - take });
            fifoDetailsToInsert.push({ batch_masuk_id: b.id, jumlah_diambil: take, harga_satuan_saat_itu: b.harga_satuan || 0 });
          }

          if (remaining > 0) throw new Error(`Stok di Gudang Asal ini tidak mencukupi untuk ditarik. Kurang ${remaining} unit lagi.`);

          newTrxPayload.total_nilai = totalHPP;
          newTrxPayload.harga_satuan = Math.round(totalHPP / qtyNum);

          if (tab === "mutasi") {
            newTrxPayload.sisa_stok = qtyNum; // Bikin Batch baru di gudang tujuan
          } else {
            newTrxPayload.sisa_stok = 0; // Kalau keluar, ya habis
          }
        }

        // 1. Simpan Transaksi
        const { data: insertedTrx, error: errTrx } = await supabase.from('transaksi').insert([newTrxPayload]).select('id').single();
        if (errTrx) throw errTrx;

        // 2. Potong Sisa Stok di Batch Terdahulu
        for (let upd of batchUpdates) {
          await supabase.from('transaksi').update({ sisa_stok: upd.sisa_stok }).eq('id', upd.id);
        }

        // 3. Simpan Riwayat FIFO
        if (fifoDetailsToInsert.length > 0) {
          const detailPayloads = fifoDetailsToInsert.map(d => ({ ...d, transaksi_keluar_id: insertedTrx.id }));
          await supabase.from('transaksi_fifo_detail').insert(detailPayloads);
        }

        // 4. Update Master Stok Barang (Mutasi tidak merubah global stok)
        let newStok = selectedBarang.stok;
        if (tab === "masuk") newStok += qtyNum;
        else if (tab === "keluar") newStok -= qtyNum;

        const { error: errUpdate } = await supabase.from('barang').update({ stok: newStok }).eq('id', form.barang_id);
        if (errUpdate) throw errUpdate;
      }

      await loadData();
      setShowModal(false);
      setEditId(null);
      setForm({ barang_id: "", jumlah: "", gudang_asal_id: "", gudang_tujuan_id: "", no_spk: "", keterangan: "", harga_satuan: "", bidang_upt: "" });
    } catch (error) {
      alert("Gagal menyimpan: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (t) => {
    if (!bolehHapus) return alert("Anda tidak berhak menghapus riwayat transaksi.");
    setDeleteModal({ isOpen: true, item: t });
  };

  const executeDelete = async () => {
    if (!deleteModal.item) return;
    if (!deletePassword) return alert("Password wajib diisi!");

    setSaving(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Sesi pengguna tidak valid.");

      const { error: authError } = await supabase.auth.signInWithPassword({ email: user.email, password: deletePassword });
      if (authError) throw new Error("Otorisasi Gagal: Password salah!");

      const trx = deleteModal.item;

      // VALIDASI: Kalau Batch ini sudah dipakai (sisa_stok < jumlah), TOLAK PENGHAPUSAN
      if (trx.tipe === 'masuk' || trx.tipe === 'mutasi' || (trx.nomor_transaksi && trx.nomor_transaksi.startsWith('SA-'))) {
        if (trx.sisa_stok < trx.jumlah) {
          throw new Error("DITOLAK! Batch ini sudah dipakai oleh transaksi lain. Anda harus menghapus transaksi yang menarik stok dari batch ini terlebih dahulu.");
        }
      }

      // KEMBALIKAN STOK KE BATCH ASAL (Jika trx keluar / mutasi)
      if (trx.tipe === 'keluar' || trx.tipe === 'mutasi') {
        const { data: details } = await supabase.from('transaksi_fifo_detail').select('*').eq('transaksi_keluar_id', trx.id);
        if (details) {
          for (let d of details) {
            const { data: batchAsal } = await supabase.from('transaksi').select('sisa_stok').eq('id', d.batch_masuk_id).single();
            if (batchAsal) {
              await supabase.from('transaksi').update({ sisa_stok: batchAsal.sisa_stok + d.jumlah_diambil }).eq('id', d.batch_masuk_id);
            }
          }
        }
      }

      // KEMBALIKAN MASTER STOK GLOBAL
      if (trx.barang) {
        let revertedStok = trx.barang.stok || 0;
        if (trx.tipe === 'masuk') revertedStok -= trx.jumlah;
        else if (trx.tipe === 'keluar') revertedStok += trx.jumlah;
        
        if (revertedStok < 0) throw new Error("Penghapusan gagal karena menyebabkan total stok barang menjadi minus.");
        await supabase.from('barang').update({ stok: revertedStok }).eq('id', trx.barang_id);
      }

      const { error } = await supabase.from('transaksi').delete().eq('id', trx.id);
      if (error) throw error;

      await loadData();
      setDeleteModal({ isOpen: false, item: null });
      setDeletePassword('');
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const filtered = transaksi.filter(t => {
    const matchTab = tab === "semua" ? true : t.tipe === tab;
    const matchSearch = (t.barang?.nama || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
                        (t.nomor_transaksi || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchTab && matchSearch;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filtered.slice(startIndex, startIndex + itemsPerPage);

  const tabs = [
    { key: "masuk", label: "Barang Masuk", color: "text-emerald-400", activeBg: "bg-emerald-500/10 border-emerald-500/30" },
    { key: "keluar", label: "Barang Keluar", color: "text-red-400", activeBg: "bg-red-500/10 border-red-500/30" },
    { key: "mutasi", label: "Mutasi", color: "text-amber-400", activeBg: "bg-amber-500/10 border-amber-500/30" },
    { key: "semua", label: "Semua", color: "text-blue-400", activeBg: "bg-[#1e293b] border-slate-600" },
  ];

  const renderPagination = () => {
    if (filtered.length === 0) return null;
    return (
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 bg-[#1e293b] p-4 rounded-xl border border-slate-700 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400">Tampilkan:</span>
          <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} className="bg-[#0f172a] text-white text-sm font-bold border border-slate-600 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer">
            <option value={20}>20</option>
            <option value={40}>40</option>
            <option value={100}>100</option>
          </select>
          <span className="text-sm text-slate-400">dari {filtered.length} Transaksi</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg bg-[#0f172a] text-slate-400 border border-slate-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><ChevronLeft size={18} /></button>
          <span className="text-sm font-bold text-slate-300">Hal <span className="text-amber-500">{currentPage}</span> / {totalPages || 1}</span>
          <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0} className="p-1.5 rounded-lg bg-[#0f172a] text-slate-400 border border-slate-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><ChevronRight size={18} /></button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto p-4 sm:p-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-white">Transaksi Barang (FIFO)</h1>
        <p className="text-sm text-slate-400 mt-1">Sistem Perpetual FIFO - Cost of Goods Sold & Riwayat Pergerakan Akurat</p>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap bg-[#1e293b] border border-slate-700 rounded-xl p-1.5 gap-1.5 shadow-lg">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`flex-1 text-xs md:text-sm font-bold py-2.5 px-3 rounded-lg transition-all border ${tab === t.key ? `${t.activeBg} ${t.color}` : "border-transparent text-slate-400 hover:text-white hover:bg-slate-800"}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-[#1e293b] p-2.5 rounded-xl border border-slate-700 shadow-sm">
          <div className="flex w-full md:w-auto flex-col md:flex-row gap-3 items-center">
            <div className="relative w-full md:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search size={16} className="text-slate-400" /></div>
              <input type="text" placeholder="Cari no. trx atau barang..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-[#0f172a] border border-slate-600 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-colors" />
            </div>
          </div>
          <div className="flex w-full md:w-auto gap-3 items-center justify-between md:justify-end">
            <div className="flex bg-[#0f172a] border border-slate-600 rounded-lg p-1">
              <button onClick={() => setViewMode('grid')} className={`p-1.5 px-3 rounded-md flex items-center gap-2 transition-all ${viewMode === 'grid' ? 'bg-amber-500 text-slate-900 shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`} title="Tampilan Grid"><LayoutGrid size={16} /> <span className="text-xs font-bold md:hidden">Grid</span></button>
              <button onClick={() => setViewMode('list')} className={`p-1.5 px-3 rounded-md flex items-center gap-2 transition-all ${viewMode === 'list' ? 'bg-amber-500 text-slate-900 shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`} title="Tampilan List (Tabel)"><ListIcon size={16} /> <span className="text-xs font-bold md:hidden">List</span></button>
            </div>
            {tab !== 'semua' && (
              <button onClick={() => { setEditId(null); setForm({ barang_id: "", jumlah: "", gudang_asal_id: "", gudang_tujuan_id: "", no_spk: "", keterangan: "", harga_satuan: "", bidang_upt: isSuperAdmin ? "" : currentUserBidang }); setShowModal(true); }} className={`flex items-center justify-center gap-1.5 text-sm font-bold px-4 py-2 rounded-lg active:scale-95 transition-all shadow-lg ${tab === 'masuk' ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-900 shadow-emerald-900/20' : tab === 'keluar' ? 'bg-red-500 hover:bg-red-400 text-white shadow-red-900/20' : 'bg-amber-500 hover:bg-amber-400 text-slate-900 shadow-amber-900/20'}`}>
                <span className="text-lg leading-none">+</span> <span className="hidden sm:inline">Input Transaksi</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 flex flex-col items-center gap-3"><Loader2 size={32} className="animate-spin text-amber-500" /><span className="text-slate-400 text-sm font-bold">Memuat data transaksi...</span></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-[#1e293b] rounded-2xl border border-slate-700 border-dashed"><p className="text-slate-400">Belum ada riwayat transaksi yang sesuai.</p></div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {paginatedData.map((t) => (
                  <div key={t.id} className="bg-[#1e293b] rounded-2xl border border-slate-700 shadow-lg p-5 hover:border-slate-500 transition-all flex flex-col group relative">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${t.tipe === "masuk" ? "bg-emerald-500/10 text-emerald-400" : t.tipe === "keluar" ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"}`}>
                          {IconPaths?.transaksi ? <Icon d={IconPaths.transaksi} size={16} color="currentColor" /> : <Box size={16} />}
                        </div>
                        <Badge label={t.tipe} color={t.tipe} />
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400 font-mono">{t.nomor_transaksi || t.id.substring(0,8)}</p>
                        <p className="text-[10px] text-slate-500 font-bold">{new Date(t.tanggal).toLocaleDateString("id-ID")}</p>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 mb-4">
                      <button onClick={() => setDetailModal({ isOpen: true, item: t })} className="font-bold text-white text-base text-left hover:text-blue-400 transition-colors leading-tight mb-2 line-clamp-2" title="Klik untuk detail">
                        {t.barang?.nama || 'Barang Dihapus'}
                      </button>
                      <div className="flex flex-col gap-1.5">
                        <span className="inline-flex items-center gap-1.5 bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-1 rounded w-fit">🏢 {t.bidang_upt || "DPUPKP Umum"}</span>
                        <span className="text-xs text-slate-400">{t.tipe === "mutasi" ? `${t.gudang_asal?.nama} ➔ ${t.gudang_tujuan?.nama}` : `Gudang: ${t.gudang_asal?.nama}`}</span>
                      </div>
                    </div>
                    <div className="flex items-end justify-between pt-4 border-t border-slate-700/80">
                      <div className="flex gap-2">
                        <button onClick={() => setDetailModal({ isOpen: true, item: t })} className="p-1.5 bg-[#0f172a] text-blue-400 hover:bg-blue-500/20 rounded-md transition-colors border border-slate-700" title="Detail"><Info size={14} /></button>
                        <button onClick={() => handleEdit(t)} className="p-1.5 bg-[#0f172a] text-slate-400 hover:text-amber-400 rounded-md transition-colors border border-slate-700" title="Edit Metadata"><Edit size={14} /></button>
                        <button onClick={() => handleDeleteClick(t)} disabled={!bolehHapus} className={`p-1.5 rounded-md transition-colors border border-slate-700 ${bolehHapus ? 'bg-[#0f172a] text-red-400 hover:bg-red-500/20' : 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-60'}`} title="Hapus"><Trash2 size={14} /></button>
                      </div>
                      <div className="text-right">
                        <p className={`text-xl leading-none font-black ${t.tipe === "masuk" ? "text-emerald-400" : t.tipe === "keluar" ? "text-red-400" : "text-amber-400"}`}>{t.jumlah}</p>
                        <p className="text-[10px] text-slate-500 font-semibold uppercase mt-1">{t.barang?.satuan || "unit"}</p>
                      </div>
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
                    <thead className="bg-[#0f172a] text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                      <tr><th className="px-5 py-4 border-b border-slate-700">Trx & Tanggal</th><th className="px-5 py-4 border-b border-slate-700">Tipe</th><th className="px-5 py-4 border-b border-slate-700">Nama Barang</th><th className="px-5 py-4 border-b border-slate-700">Gudang / Bidang</th><th className="px-5 py-4 border-b border-slate-700 text-right">Jumlah</th><th className="px-5 py-4 border-b border-slate-700 text-center">Aksi</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {paginatedData.map((t) => (
                        <tr key={t.id} className="hover:bg-[#253243] transition-colors">
                          <td className="px-5 py-3">
                            <p className="font-mono text-xs font-bold text-white">{t.nomor_transaksi || t.id.substring(0,8)}</p>
                            <p className="text-[10px] text-slate-500">{new Date(t.tanggal).toLocaleDateString("id-ID")}</p>
                          </td>
                          <td className="px-5 py-3"><Badge label={t.tipe} color={t.tipe} /></td>
                          <td className="px-5 py-3 max-w-[200px] truncate">
                            <button onClick={() => setDetailModal({ isOpen: true, item: t })} className="font-bold text-white hover:text-blue-400 transition-colors text-left truncate w-full" title="Detail">{t.barang?.nama || 'Barang Dihapus'}</button>
                          </td>
                          <td className="px-5 py-3">
                            <p className="text-xs font-bold text-slate-300">{t.tipe === "mutasi" ? `${t.gudang_asal?.nama} ➔ ${t.gudang_tujuan?.nama}` : t.gudang_asal?.nama}</p>
                            <p className="text-[10px] text-slate-500">{t.bidang_upt || "DPUPKP Umum"}</p>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <p className={`text-base font-black leading-none ${t.tipe === "masuk" ? "text-emerald-400" : t.tipe === "keluar" ? "text-red-400" : "text-amber-400"}`}>{t.jumlah}</p>
                            <p className="text-[10px] text-slate-500 font-semibold uppercase mt-1.5">{t.barang?.satuan || "unit"}</p>
                          </td>
                          <td className="px-5 py-3 text-center">
                            <div className="flex justify-center items-center gap-1.5">
                              <button onClick={() => setDetailModal({ isOpen: true, item: t })} className="p-1.5 bg-[#0f172a] text-blue-400 hover:bg-blue-500/20 rounded-md transition-colors border border-slate-700" title="Detail"><Info size={14} /></button>
                              <button onClick={() => handleEdit(t)} className="p-1.5 bg-[#0f172a] text-slate-400 hover:text-amber-400 rounded-md transition-colors border border-slate-700" title="Edit Metadata"><Edit size={14} /></button>
                              <button onClick={() => handleDeleteClick(t)} disabled={!bolehHapus} className={`p-1.5 rounded-md transition-colors border border-slate-700 ${bolehHapus ? 'bg-[#0f172a] text-red-400 hover:bg-red-500/20' : 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-60'}`} title="Hapus"><Trash2 size={14} /></button>
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
        </>
      )}

      {detailModal.isOpen && detailModal.item && (
        <Modal title="Detail Informasi Transaksi (FIFO)" onClose={() => setDetailModal({ isOpen: false, item: null })}>
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-700/50 pb-4">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Nomor Transaksi</p>
                <p className="text-lg font-mono font-black text-white">{detailModal.item.nomor_transaksi || detailModal.item.id.substring(0,8)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Tanggal</p>
                <p className="text-sm font-bold text-slate-300">{new Date(detailModal.item.tanggal).toLocaleDateString("id-ID", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>

            <div className="bg-[#0f172a] p-4 rounded-xl border border-slate-700">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg"><Box size={24} /></div>
                <div>
                  <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-0.5">Identitas Barang</p>
                  <p className="text-base font-bold text-white">{detailModal.item.barang?.nama || 'Barang Dihapus'}</p>
                  <p className="text-xs text-slate-400 font-mono mt-1">Kode Aset: {detailModal.item.barang?.kode_aset || '-'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700/50">
                <div><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Kategori / Tipe</p><Badge label={detailModal.item.tipe} color={detailModal.item.tipe} /></div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Jumlah</p>
                  <p className={`text-lg font-black leading-none ${detailModal.item.tipe === "masuk" ? "text-emerald-400" : detailModal.item.tipe === "keluar" ? "text-red-400" : "text-amber-400"}`}>{detailModal.item.jumlah}</p>
                  <p className="text-xs text-slate-400 font-semibold uppercase mt-1">{detailModal.item.barang?.satuan || "unit"}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#0f172a] p-3 rounded-xl border border-slate-700">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Alokasi Bidang</p>
                <p className="text-sm font-bold text-slate-200">{detailModal.item.bidang_upt || "DPUPKP Umum"}</p>
              </div>
              <div className="bg-[#0f172a] p-3 rounded-xl border border-slate-700">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Lokasi Gudang</p>
                <p className="text-sm font-bold text-slate-200">
                  {detailModal.item.tipe === "mutasi" ? <span className="flex flex-col gap-1"><span className="text-amber-400 text-xs">Asal: {detailModal.item.gudang_asal?.nama}</span><span className="text-emerald-400 text-xs">Tujuan: {detailModal.item.gudang_tujuan?.nama}</span></span> : detailModal.item.gudang_asal?.nama || "-"}
                </p>
              </div>
            </div>

            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
              <div className="flex justify-between items-center mb-3">
                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Akuntansi FIFO (HPP)</p>
                {(detailModal.item.tipe === 'masuk' || detailModal.item.tipe === 'mutasi' || detailModal.item.nomor_transaksi?.startsWith('SA-')) && (
                  <span className="bg-amber-500/20 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-500/30">
                    Stok Batch Tersisa: {detailModal.item.sisa_stok} Unit
                  </span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Nilai HPP</p>
                  <p className="text-sm font-bold font-mono text-emerald-400">Rp {detailModal.item.total_nilai?.toLocaleString('id-ID') || 0}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Rata-Rata Harga / Unit</p>
                  <p className="text-sm font-bold font-mono text-emerald-400">Rp {detailModal.item.harga_satuan?.toLocaleString('id-ID') || 0}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">No SPK / Referensi</p>
                {detailModal.item.no_spk ? <p className="text-sm text-blue-400 font-mono font-bold bg-blue-500/10 border border-blue-500/20 px-3 py-2 rounded-lg inline-block">{detailModal.item.no_spk}</p> : <p className="text-sm text-slate-500 italic">- Tidak ada dokumen referensi -</p>}
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Keterangan / Catatan</p>
                <p className="text-sm text-slate-300 leading-relaxed bg-slate-800/50 border border-slate-700/50 p-3 rounded-lg">{detailModal.item.keterangan || "- Tidak ada catatan tambahan -"}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-700/80">
               <button onClick={() => setDetailModal({ isOpen: false, item: null })} className="w-full py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white hover:bg-slate-700 transition-colors">Tutup Detail</button>
            </div>
          </div>
        </Modal>
      )}

      {showModal && (
        <Modal title={editId ? "Edit Metadata Transaksi" : `Input ${tabs.find(t=>t.key===tab)?.label}`} onClose={() => setShowModal(false)}>
          <div>
            {editId && (
               <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                 <p className="text-xs text-blue-400 leading-relaxed font-semibold">Mode Edit: Untuk menjaga integritas FIFO, Anda hanya diizinkan mengubah metadata (No. SPK, Keterangan, & Bidang).</p>
               </div>
            )}

            <Field label="Alokasi Bidang / UPT Terkait *">
              <select className={selectCls + (!isSuperAdmin ? " opacity-60 cursor-not-allowed bg-slate-800" : "")} value={form.bidang_upt} onChange={handleBidangChange} disabled={!isSuperAdmin}>
                <option value="">-- Pilih Bidang / UPT --</option>
                {daftarBidangUPT.map((bidang, idx) => <option key={idx} value={bidang}>{bidang}</option>)}
              </select>
            </Field>

            <Field label="Pilih Barang *">
              <select className={selectCls} value={form.barang_id} onChange={handleBarangChange} disabled={!!editId || !form.bidang_upt}>
                <option value="">{form.bidang_upt ? "Pilih barang..." : "Pilih Bidang/UPT lebih dulu..."}</option>
                {availableBarang.map(b => <option key={b.id} value={b.id}>{b.nama} (Stok: {b.stok} {b.satuan})</option>)}
              </select>
            </Field>

            {tab === "masuk" && !editId && (
              <div className="p-4 bg-emerald-900/10 border border-emerald-500/20 rounded-xl mb-4">
                <Field label="Harga Satuan Pengadaan Aktual (Rp) *">
                  <input type="number" className={`${inputCls} !border-emerald-500/50 focus:!ring-emerald-500`} placeholder="cth. 45000" value={form.harga_satuan} onChange={e => setForm({ ...form, harga_satuan: e.target.value })} />
                </Field>
                <p className="text-[10px] text-emerald-400/80 leading-tight">Harga ini akan menjadi basis perhitungan FIFO saat barang ini dikeluarkan.</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Field label="Jumlah Unit *"><input type="number" className={inputCls} placeholder="0" value={form.jumlah} onChange={e => setForm({ ...form, jumlah: e.target.value })} disabled={!!editId} /></Field>
              <Field label={tab === "mutasi" ? "Gudang Asal *" : "Gudang *"}>
                <select className={selectCls} value={form.gudang_asal_id} onChange={e => setForm({ ...form, gudang_asal_id: e.target.value })} disabled={!!editId}>
                  <option value="">Pilih...</option>
                  {availableGudangAsal.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
                </select>
              </Field>
            </div>

            {tab === "mutasi" && (
              <div className="p-3 bg-amber-900/10 border border-amber-500/30 rounded-xl mb-4">
                <Field label="Gudang Tujuan *">
                  <select className={selectCls} value={form.gudang_tujuan_id} onChange={e => setForm({ ...form, gudang_tujuan_id: e.target.value })} disabled={!!editId}>
                    <option value="">Pilih tujuan...</option>
                    {gudangList.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
                  </select>
                </Field>
              </div>
            )}

            <Field label="No. SPK / Dokumen Referensi"><input className={inputCls} placeholder="Contoh: SPK/PUPKP/2026/012" value={form.no_spk} onChange={e => setForm({ ...form, no_spk: e.target.value })} /></Field>
            <Field label="Keterangan Tambahan"><textarea className={inputCls} rows={2} placeholder="Catatan transaksi..." value={form.keterangan} onChange={e => setForm({ ...form, keterangan: e.target.value })} /></Field>

            <div className="flex gap-3 pt-2 border-t border-slate-700/80 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 bg-slate-800 rounded-xl text-sm font-bold text-slate-300 hover:bg-slate-700 transition-colors">Batal</button>
              <button onClick={handleSubmit} disabled={saving} className={`flex-1 py-3 text-slate-900 rounded-xl text-sm font-bold active:scale-95 transition-all disabled:opacity-50 shadow-lg ${tab === 'masuk' ? 'bg-emerald-500 hover:bg-emerald-400' : tab === 'keluar' ? 'bg-red-500 hover:bg-red-400' : 'bg-amber-500 hover:bg-amber-400'}`}>
                {saving ? "Memproses..." : (editId ? "Simpan Perubahan" : "Simpan Transaksi")}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deleteModal.isOpen && (
        <Modal title="Otorisasi Hapus Transaksi (Revert FIFO)" onClose={() => { setDeleteModal({ isOpen: false, item: null }); setDeletePassword(''); }}>
          <div className="space-y-4">
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-400 text-sm leading-relaxed mb-2">
              <strong className="block mb-1 text-base">Hapus Riwayat & Sinkronisasi Stok</strong>
              Sistem akan menghapus riwayat ini dan <strong>mengembalikan (revert) stok ke batch asalnya</strong> secara otomatis.
            </div>

            <div className="bg-[#0f172a] p-3 rounded-xl border border-slate-700">
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Target Hapus: {deleteModal.item?.nomor_transaksi}</span>
              <span className="block text-sm font-bold text-white">{deleteModal.item?.barang?.nama}</span>
              <span className="block text-xs font-mono text-red-400 mt-1">Revert Stok: {deleteModal.item?.tipe === 'masuk' ? '-' : '+'}{deleteModal.item?.jumlah} Unit</span>
            </div>

            <Field label="Password Super Admin">
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"><Key size={16} /></div>
                <input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} placeholder="Masukkan password Anda..." className={`${inputCls} pl-10 focus:ring-red-500 focus:border-red-500`} autoComplete="new-password" />
              </div>
            </Field>

            <div className="flex gap-3 pt-4">
              <button onClick={() => { setDeleteModal({ isOpen: false, item: null }); setDeletePassword(''); }} disabled={saving} className="flex-1 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-slate-300 hover:text-white transition-colors">Batal</button>
              <button onClick={executeDelete} disabled={saving || !deletePassword} className="flex-1 py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-500 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-900/20">
                {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                {saving ? "Mereset Stok..." : "Ya, Hapus & Revert Stok"}
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
