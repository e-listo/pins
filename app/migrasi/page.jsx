"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../../src/lib/supabase";
import { getPegawai } from "../../src/lib/auth";
import * as XLSX from "xlsx";
import { UploadCloud, Download, Database, AlertCircle, CheckCircle2, Loader2, ArrowLeft, CheckSquare, Square, XCircle, Info } from "lucide-react";
import Link from "next/link";
import { canManageMaster } from "../../src/lib/roles";

export default function MigrasiData() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  
  const [gudangMap, setGudangMap] = useState({});
  const [bidangMap, setBidangMap] = useState({});
  const [existingBarang, setExistingBarang] = useState(new Set());
  
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [importStatus, setImportStatus] = useState("idle"); 
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, msg: "" });
  
  const [confirmModal, setConfirmModal] = useState(false);
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: "", message: "", type: "info" });
  
  const fileInputRef = useRef(null);

  const showAlert = (title, message, type = "info") => {
    setAlertModal({ isOpen: true, title, message, type });
  };

  useEffect(() => {
    checkAuthAndLoadContext();
  }, []);

  async function checkAuthAndLoadContext() {
    const user = await getPegawai();
    if (!canManageMaster(user)) {
      window.location.href = "/";
      return;
    }
    setIsAdmin(true);

    try {
      const { data: bData } = await supabase.from('bidang_upt').select('id, nama');
      const bMap = {};
      bData?.forEach(b => { bMap[b.nama.toLowerCase().trim().replace(/\s+/g, ' ')] = b.id; });
      setBidangMap(bMap);

      const { data: gData } = await supabase.from('gudang').select('id, nama');
      const gMap = {};
      gData?.forEach(g => { gMap[g.nama.toLowerCase().trim().replace(/\s+/g, ' ')] = g.id; });
      setGudangMap(gMap);

      // Mengambil data nama barang eksisting untuk cek duplikat (mengabaikan kode_aset)
      const { data: brgData } = await supabase.from('barang').select('nama');
      const eBrg = new Set();
      brgData?.forEach(b => {
        if (b.nama) eBrg.add(String(b.nama).toLowerCase().trim().replace(/\s+/g, ' '));
      });
      setExistingBarang(eBrg);

    } catch (err) {
      console.error("Gagal memuat referensi:", err);
    }
    setLoadingInitial(false);
  }

  const cleanText = (txt) => String(txt || "").toLowerCase().trim().replace(/\s+/g, ' ');

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;
    setFile(uploadedFile);
    setImportStatus("parsing");

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const ab = evt.target.result;
        const wb = XLSX.read(ab, { type: 'array' });
        
        let targetSheetName = null;
        let headerRowIndex = -1;
        let cleanedHeaders = [];
        let raw2D = [];

        // --- SCANNER BRUTAL (MENEMBUS SEMUA SHEET) ---
        for (const sheetName of wb.SheetNames) {
          const ws = wb.Sheets[sheetName];
          const sheetData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
          
          for (let i = 0; i < Math.min(100, sheetData.length); i++) {
            const row = sheetData[i];
            if (!row || !Array.isArray(row)) continue;
            
            // THE FIX: Regex yang benar untuk menghapus spasi & underscore
            const stringRow = row.map(cell => String(cell || "").toUpperCase().replace(/[^A-Z0-9]/g, ''));
            
            if (stringRow.includes("NAMABARANG") && stringRow.includes("NAMAGUDANG")) {
              targetSheetName = sheetName;
              headerRowIndex = i;
              cleanedHeaders = stringRow; 
              raw2D = sheetData;
              break;
            }
          }
          if (targetSheetName) break;
        }

        if (!targetSheetName) {
          showAlert(
            "Format File Ditolak!", 
            "Sistem tidak dapat menemukan kolom NAMA_BARANG dan NAMA_GUDANG di sheet mana pun. Pastikan format tabel tidak diubah.", 
            "error"
          );
          setImportStatus("idle");
          return;
        }

        const parsed = [];
        
        for (let i = headerRowIndex + 1; i < raw2D.length; i++) {
          const rowArray = raw2D[i];
          if (!rowArray || rowArray.length === 0) continue;
          
          const rowData = {};
          cleanedHeaders.forEach((colName, colIdx) => {
            if (colName) {
              rowData[colName] = rowArray[colIdx] !== undefined ? rowArray[colIdx] : "";
            }
          });

          const isRowEmpty = Object.values(rowData).every(v => String(v).trim() === "");
          if (isRowEmpty) continue;

          const rawGudang = rowData.NAMAGUDANG || "";
          const rawBidang = rowData.BIDANGUPT || "";
          const rawKode = rowData.KODEASET || "";
          const rawNama = rowData.NAMABARANG || "";

          const cleanGudang = cleanText(rawGudang);
          const cleanBidang = cleanText(rawBidang);
          const cleanKode = cleanText(rawKode);
          const cleanNama = cleanText(rawNama);

          const mappedGudangId = gudangMap[cleanGudang] || null;
          const mappedBidangId = bidangMap[cleanBidang] || null;

          // HANYA CEK NAMA BARANG (Karena Kode Aset banyak yang kembar dari SIMBARA)
          const isDuplicate = (cleanNama && existingBarang.has(cleanNama));
          
          let status = "valid";
          let errorMsg = "";

          if (!rawNama) {
            status = "error"; errorMsg = "Nama Barang Kosong";
          } else if (isDuplicate) {
            status = "duplicate"; errorMsg = "Nama Barang Sudah Ada";
          } else if (!mappedGudangId) {
            if (!rawGudang) {
              status = "error"; errorMsg = "Nama Gudang Kosong";
            } else if (!mappedBidangId) {
              status = "error"; errorMsg = `Bidang '${rawBidang}' tidak ditemukan`;
            } else {
              status = "new_gudang"; 
            }
          }

          parsed.push({
            _row: i + 1,
            kode_aset: rawKode,
            nama: rawNama,
            kategori: rowData.KATEGORI || "Tanpa Kategori",
            satuan: rowData.SATUAN || "Unit",
            stok: parseInt(rowData.STOK) || 0,
            stok_minimum: parseInt(rowData.MINSTOK) || 0,
            harga_satuan: parseInt(rowData.HARGASATUAN) || 0,
            _rawGudang: rawGudang,
            _rawBidang: rawBidang,
            gudang_id: mappedGudangId,
            bidang_id: mappedBidangId,
            status: status,
            errorMsg: errorMsg,
            excluded: status === "duplicate" || status === "error", 
          });
        }

        if (parsed.length === 0) {
           showAlert("File Kosong", `Header ditemukan di sheet "${targetSheetName}", tetapi tidak ada data barang di bawahnya.`, "error");
           setImportStatus("idle");
           return;
        }

        setPreviewData(parsed);
        setImportStatus("preview");
      } catch (err) {
        showAlert("Terjadi Kesalahan Fatal", err.message, "error");
        setImportStatus("idle");
      }
    };
    reader.readAsArrayBuffer(uploadedFile);
  };

  const toggleExclude = (index) => {
    const newData = [...previewData];
    newData[index].excluded = !newData[index].excluded;
    setPreviewData(newData);
  };

  const handleExecuteClick = () => {
    const toImportCount = previewData.filter(d => !d.excluded).length;
    if (toImportCount === 0) {
      showAlert("Pilih Data", "Tidak ada data yang dicentang untuk dimasukkan ke database!", "error");
      return;
    }
    setConfirmModal(true);
  };

  const proceedImport = async () => {
    setConfirmModal(false); 
    
    const toImport = previewData.filter(d => !d.excluded);
    const newGudangsRequired = toImport.filter(d => d.status === "new_gudang");
    
    setImportStatus("importing");
    
    try {
      let currentGudangMap = { ...gudangMap };
      
      if (newGudangsRequired.length > 0) {
        setImportProgress({ current: 0, total: toImport.length, msg: "Membuat Gudang Baru..." });
        
        const uniqueGudangPayloads = [];
        const seen = new Set();
        for (const item of newGudangsRequired) {
          const cleanName = cleanText(item._rawGudang);
          if (!seen.has(cleanName)) {
            seen.add(cleanName);
            uniqueGudangPayloads.push({ nama: item._rawGudang, bidang_id: item.bidang_id });
          }
        }

        const { data: insertedGudangs, error: errGudang } = await supabase
          .from('gudang')
          .insert(uniqueGudangPayloads)
          .select('id, nama');
          
        if (errGudang) throw new Error("Gagal membuat Gudang Baru: " + errGudang.message);

        insertedGudangs.forEach(g => {
          currentGudangMap[cleanText(g.nama)] = g.id;
        });
      }

      setImportProgress({ current: 0, total: toImport.length, msg: "Menyimpan Barang..." });
      
      const barangPayload = toImport.map(item => ({
        kode_aset: item.kode_aset,
        nama: item.nama,
        kategori: item.kategori,
        satuan: item.satuan,
        stok: item.stok,
        stok_minimum: item.stok_minimum,
        harga_satuan: item.harga_satuan,
        bidang_upt: item._rawBidang,
        gudang_id: currentGudangMap[cleanText(item._rawGudang)] 
      }));

      const BATCH_SIZE = 100;
      let successCount = 0;

      for (let i = 0; i < barangPayload.length; i += BATCH_SIZE) {
        const batch = barangPayload.slice(i, i + BATCH_SIZE);
        const { error: errBarang } = await supabase.from('barang').insert(batch);
        if (errBarang) throw errBarang;
        
        successCount += batch.length;
        setImportProgress({ current: successCount, total: toImport.length, msg: `Menyimpan ${successCount} dari ${toImport.length} Barang...` });
      }

      setImportStatus("success");
    } catch (err) {
      showAlert("Terjadi Kesalahan Server", err.message, "error");
      setImportStatus("idle");
    }
  };

  if (loadingInitial) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-amber-500" size={40} /></div>;
  if (!isAdmin) return null;

  const getStatusBadge = (status, msg) => {
    switch (status) {
      case "valid": return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded text-[10px] font-bold">🟢 VALID</span>;
      case "new_gudang": return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1" title="Sistem akan otomatis membuat Gudang ini">🔵 GUDANG BARU</span>;
      case "duplicate": return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-1 rounded text-[10px] font-bold" title={msg}>🟡 DUPLIKAT</span>;
      case "error": return <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded text-[10px] font-bold" title={msg}>🔴 ERROR</span>;
      default: return null;
    }
  };

  const toImportCount = previewData.filter(d => !d.excluded).length;
  const newGudangCount = new Set(previewData.filter(d => !d.excluded && d.status === "new_gudang").map(d => cleanText(d._rawGudang))).size;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 p-4 relative">
      <div className="flex items-center gap-4 border-b border-slate-800 pb-4">
        <Link href="/" className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Database className="text-amber-500" /> Pusat Migrasi Data
          </h1>
          <p className="text-sm text-slate-400">Export & Import massal data inventaris dari file Microsoft Excel (.xlsx)</p>
        </div>
      </div>

      {importStatus === "idle" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-xl flex flex-col justify-center">
             <h3 className="font-bold text-white mb-2">Panduan Pengisian:</h3>
             <ul className="text-xs text-slate-400 list-disc pl-5 space-y-2 mb-6">
                <li>Pastikan format kolom sesuai dengan <strong>Template Bawaan</strong>.</li>
                <li>Sistem otomatis mendeteksi baris <strong>Duplikat</strong> berdasarkan Nama Barang.</li>
                <li>Jika Anda mengetik nama Gudang yang belum ada di sistem, sistem dapat <strong>membuatnya otomatis</strong> asalkan nama <strong>Bidang/UPT</strong>-nya valid.</li>
             </ul>
             <button onClick={() => showAlert("Informasi", "Gunakan fitur di layar dashboard / data master untuk mengunduh format terbaru.", "info")} className="mt-auto py-3 bg-slate-800 text-white rounded-xl text-sm font-bold border border-slate-600">Unduh Template Kosong</button>
          </div>

          <div 
            className="border-2 border-dashed border-slate-600 hover:border-amber-500 bg-[#0f172a] rounded-2xl flex flex-col items-center justify-center p-12 transition-colors cursor-pointer group"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <UploadCloud size={40} className="text-slate-400 group-hover:text-amber-500" />
            </div>
            <p className="font-bold text-lg text-white text-center">Pilih atau Tarik File Excel ke Sini</p>
            <p className="text-sm text-slate-500 mt-2">Mendukung .xlsx dan .xls</p>
            <input type="file" accept=".xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
          </div>
        </div>
      )}

      {importStatus === "parsing" && (
        <div className="flex flex-col items-center justify-center py-32 bg-[#1e293b] rounded-2xl border border-slate-700">
          <Loader2 size={48} className="text-amber-500 animate-spin mb-4" />
          <p className="text-slate-300 font-bold text-lg">Menganalisa dan Memvalidasi Data...</p>
        </div>
      )}

      {importStatus === "preview" && (
        <div className="bg-[#1e293b] rounded-2xl border border-slate-700 shadow-xl overflow-hidden flex flex-col animate-in fade-in h-[75vh]">
          <div className="p-5 border-b border-slate-700 bg-[#0f172a] flex justify-between items-center shrink-0">
            <div>
              <h2 className="font-black text-white flex items-center gap-2">
                <CheckSquare className="text-emerald-500" /> Preview & Konfirmasi Data
              </h2>
              <p className="text-xs text-slate-400 mt-1">Buang centang pada baris yang tidak ingin dimasukkan ke sistem.</p>
            </div>
            <button onClick={() => setImportStatus("idle")} className="text-xs font-bold text-red-400 bg-red-500/10 px-4 py-2 rounded-lg hover:bg-red-500/20">Batal / Ganti File</button>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800 text-slate-400 sticky top-0 z-10 text-[10px] uppercase font-bold tracking-wider shadow-md">
                <tr>
                  <th className="px-4 py-3 text-center w-16">Baris</th>
                  <th className="px-4 py-3 text-center w-20">Import?</th>
                  <th className="px-4 py-3 w-32">Status</th>
                  <th className="px-4 py-3">Barang & Kode</th>
                  <th className="px-4 py-3">Lokasi (Gudang / Bidang)</th>
                  <th className="px-4 py-3">Stok</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {previewData.map((row, idx) => (
                  <tr key={idx} className={`${row.excluded ? 'bg-[#0f172a] opacity-50' : 'hover:bg-[#253243]'} transition-colors`}>
                    <td className="px-4 py-3 text-center text-xs font-mono text-slate-500">{row._row}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => toggleExclude(idx)} className={`p-1 rounded ${row.excluded ? 'text-slate-600 hover:text-slate-400' : 'text-emerald-500 hover:text-emerald-400'}`}>
                        {row.excluded ? <Square size={20} /> : <CheckSquare size={20} />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(row.status, row.errorMsg)}
                      {row.errorMsg && <p className="text-[9px] text-red-400 mt-1 leading-tight">{row.errorMsg}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p className={`font-bold ${row.excluded ? 'text-slate-500' : 'text-white'}`}>{row.nama || '-'}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">{row.kode_aset || 'Tanpa Kode'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className={`text-xs font-bold ${row.status === 'new_gudang' && !row.excluded ? 'text-blue-400' : 'text-slate-300'}`}>{row._rawGudang || '-'}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{row._rawBidang || '-'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className={`font-black ${row.excluded ? 'text-slate-500' : 'text-amber-400'}`}>{row.stok} <span className="font-normal text-xs text-slate-500">{row.satuan}</span></p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-5 border-t border-slate-700 bg-[#0f172a] shrink-0 flex items-center justify-between">
            <div className="flex gap-6">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Siap Import</p>
                <p className="text-xl font-black text-emerald-400">{toImportCount} <span className="text-sm font-normal text-slate-500">Baris</span></p>
              </div>
              {newGudangCount > 0 && (
                <div className="border-l border-slate-700 pl-6">
                  <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Gudang Baru Dibuat</p>
                  <p className="text-xl font-black text-blue-400">{newGudangCount} <span className="text-sm font-normal text-slate-500">Lokasi</span></p>
                </div>
              )}
            </div>
            
            <button 
              onClick={handleExecuteClick} 
              className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-xl font-black transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-emerald-900/20"
            >
              <Database size={18} /> Eksekusi {toImportCount} Data
            </button>
          </div>
        </div>
      )}

      {importStatus === "importing" && (
        <div className="flex flex-col items-center justify-center py-32 bg-[#1e293b] rounded-2xl border border-slate-700 animate-in fade-in">
          <Loader2 size={56} className="text-emerald-500 animate-spin mb-6" />
          <h2 className="text-2xl font-black text-white mb-2">Memproses ke Database...</h2>
          <p className="text-slate-400 mb-8 font-mono">{importProgress.msg}</p>
          <div className="w-full max-w-md bg-slate-800 rounded-full h-4 overflow-hidden border border-slate-700 shadow-inner">
            <div className="bg-emerald-500 h-full transition-all duration-300 relative" style={{ width: `${(importProgress.current / Math.max(1, importProgress.total)) * 100}%` }}>
               <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
            </div>
          </div>
        </div>
      )}

      {importStatus === "success" && (
        <div className="flex flex-col items-center justify-center py-20 bg-[#1e293b] rounded-2xl border border-slate-700 shadow-xl animate-in zoom-in">
          <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 border-4 border-emerald-500/30">
            <CheckCircle2 size={56} className="text-emerald-500" />
          </div>
          <h2 className="text-3xl font-black text-white mb-2">Import Berhasil!</h2>
          <p className="text-slate-400 text-center mb-10 max-w-md leading-relaxed">
            Sistem telah berhasil menambahkan <strong>{importProgress.total}</strong> barang dan membuat gudang-gudang baru yang diperlukan ke dalam PINS.
          </p>
          <div className="flex gap-4">
            <button onClick={() => setImportStatus("idle")} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold transition-all border border-slate-600">Import Excel Lainnya</button>
            <Link href="/barang" className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-xl text-sm font-black transition-all shadow-lg shadow-emerald-900/20">Cek Database Barang</Link>
          </div>
        </div>
      )}

      {confirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#1e293b] p-6 rounded-2xl shadow-2xl max-w-sm w-full border border-slate-700 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 mb-4 text-amber-500">
              <AlertCircle size={28} />
              <h3 className="text-xl font-black text-white">Konfirmasi Eksekusi</h3>
            </div>
            <div className="space-y-4 mb-8">
              <p className="text-sm text-slate-300 leading-relaxed">
                Sistem akan memasukkan <strong className="text-emerald-400">{toImportCount} Barang Baru</strong> ke dalam database.
              </p>
              {newGudangCount > 0 && (
                <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl">
                  <p className="text-xs text-blue-400 leading-relaxed">
                    <strong className="text-blue-300">PERHATIAN:</strong> Sistem juga akan membuat otomatis <strong className="text-white">{newGudangCount} GUDANG BARU</strong> berdasarkan data excel.
                  </p>
                </div>
              )}
              <p className="text-sm text-slate-400 italic">Apakah Anda yakin data ini sudah benar?</p>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmModal(false)} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-slate-700 transition">Batal</button>
              <button onClick={proceedImport} className="px-5 py-2 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-900 shadow-lg shadow-amber-900/20 transition flex items-center gap-2">
                <Database size={16} /> Ya, Eksekusi
              </button>
            </div>
          </div>
        </div>
      )}

      {alertModal.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#1e293b] p-6 rounded-2xl shadow-2xl max-w-xl w-full border border-slate-700 animate-in fade-in zoom-in-95">
            <div className={`flex items-center gap-3 mb-4 ${alertModal.type === 'error' ? 'text-red-500' : 'text-blue-500'}`}>
              {alertModal.type === 'error' ? <XCircle size={28} /> : <Info size={28} />}
              <h3 className="text-xl font-black text-white">{alertModal.title}</h3>
            </div>
            <div className="mb-8">
              <pre className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-900 p-4 rounded-lg font-mono overflow-auto max-h-64 border border-slate-700">
                {alertModal.message}
              </pre>
            </div>
            <div className="flex justify-end">
              <button onClick={() => setAlertModal({ ...alertModal, isOpen: false })} className="px-5 py-2 rounded-xl text-sm font-bold bg-slate-700 hover:bg-slate-600 text-white transition">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
