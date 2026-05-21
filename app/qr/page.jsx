"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../../src/lib/supabase";
import { Html5Qrcode } from "html5-qrcode";
import Link from "next/link";
import { QrCode, Box, AlertCircle, Search, Camera, ArrowRightLeft, Loader2 } from "lucide-react";

export default function QRScanner() {
  const [scanning, setScanning] = useState(false);
  const [camError, setCamError] = useState(null);
  const [resultStatus, setResultStatus] = useState("idle"); // idle | loading | found | not_found | invalid
  const [scannedItem, setScannedItem] = useState(null);
  const scannerRef = useRef(null);

  const startScanner = async () => {
    setScanning(true);
    setResultStatus("idle");
    setScannedItem(null);
    setCamError(null);

    // Beri jeda agar React merender <div id="reader"> terlebih dahulu
    await new Promise(resolve => setTimeout(resolve, 150));

    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode("reader");
      }
      
      const html5QrCode = scannerRef.current;

      if (html5QrCode.isScanning) {
        await html5QrCode.stop();
      }

      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        (decodedText) => {
          if (html5QrCode.getState() === 2) { 
            html5QrCode.pause(); 
            setResultStatus("loading");
            
            setTimeout(async () => {
              try {
                await html5QrCode.stop();
                setScanning(false);
                processQR(decodedText);
              } catch (err) {
                console.error("Gagal stop kamera secara asinkron:", err);
              }
            }, 100);
          }
        },
        undefined 
      );
    } catch (err) {
      console.error("Camera Error:", err);
      setScanning(false);
      setCamError(err?.message || "Kamera ditolak atau tidak didukung di perangkat ini.");
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    setTimeout(() => {
      if (isMounted) startScanner();
    }, 200);

    return () => {
      isMounted = false;
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const processQR = async (text) => {
    try {
      if (!text.startsWith("PUPKP|")) {
        setResultStatus("invalid");
        return;
      }

      const parts = text.split("|");
      const kodeAset = parts[1];
      const namaBarang = parts[2];

      let query = supabase.from('barang').select('*, gudang:gudang_id(nama)').limit(1);
      
      if (kodeAset && kodeAset !== "null" && kodeAset.trim() !== "") {
        query = query.eq('kode_aset', kodeAset);
      } else if (namaBarang && namaBarang !== "null") {
        query = query.eq('nama', namaBarang);
      } else {
        setResultStatus("invalid");
        return;
      }

      const { data, error } = await query.single();

      if (error || !data) {
        setResultStatus("not_found");
      } else {
        setScannedItem(data);
        setResultStatus("found");
      }
    } catch (err) {
      console.error("Error Query:", err);
      setResultStatus("not_found");
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4 md:p-6">
      <div className="text-center md:text-left">
        <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white">QR Code Scanner</h1>
        <p className="text-sm text-slate-500 mt-1">Pindai label stiker aset untuk melihat detail dan status stok</p>
      </div>

      <div className="bg-slate-900 rounded-3xl border border-slate-700 shadow-2xl overflow-hidden p-4 md:p-8">

        {/* AREA KAMERA */}
        <div className={scanning && !camError ? "block" : "hidden"}>
          <div className="flex flex-col items-center justify-center animate-in fade-in">
            <div className="w-full max-w-sm overflow-hidden rounded-2xl border-4 border-slate-700 relative bg-black shadow-inner shadow-black">
              <div id="reader" className="w-full"></div>
            </div>
            <p className="mt-6 text-sm font-bold text-amber-400 animate-pulse flex items-center gap-2">
              <QrCode size={18} />
              Arahkan kamera ke Stiker QR Aset...
            </p>
          </div>
        </div>

        {/* PESAN ERROR KAMERA */}
        {camError && !scanning && (
          <div className="text-center py-10 flex flex-col items-center animate-in fade-in">
            <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
              <Camera size={32} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Kamera Bermasalah</h3>
            <p className="text-sm text-slate-400 max-w-sm mb-6">{camError}</p>
            <button onClick={startScanner} className="px-6 py-2.5 bg-amber-500 text-slate-900 font-bold rounded-xl hover:bg-amber-400 transition-colors">
              Coba Akses Lagi
            </button>
          </div>
        )}

        {/* LOADING STATE */}
        {resultStatus === "loading" && (
          <div className="text-center py-20 flex flex-col items-center animate-in fade-in">
            <Loader2 size={48} className="text-amber-500 animate-spin mb-4" />
            <p className="text-slate-400 font-bold tracking-widest uppercase text-sm">Mencari Data Aset...</p>
          </div>
        )}

        {/* JIKA QR TIDAK DIKENALI */}
        {resultStatus === "invalid" && (
          <div className="text-center py-12 flex flex-col items-center animate-in zoom-in">
            <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Format QR Tidak Dikenali</h3>
            <p className="text-sm text-slate-400 max-w-sm mb-8">Ini bukan stiker QR resmi yang diterbitkan oleh sistem PINS DPUPKP.</p>
            <button onClick={startScanner} className="px-6 py-3 bg-slate-800 text-slate-300 font-bold rounded-xl hover:bg-slate-700 transition-colors border border-slate-600 flex items-center gap-2">
              <QrCode size={18} /> Scan Kode Lain
            </button>
          </div>
        )}

        {/* JIKA BARANG TIDAK DITEMUKAN DI DB */}
        {resultStatus === "not_found" && (
          <div className="text-center py-12 flex flex-col items-center animate-in zoom-in">
            <div className="w-16 h-16 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center mb-4 border border-amber-500/20">
              <Search size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Aset Tidak Ditemukan</h3>
            <p className="text-sm text-slate-400 max-w-sm mb-8">QR Code valid, namun data aset ini sudah dihapus atau tidak ada di dalam database.</p>
            <button onClick={startScanner} className="px-6 py-3 bg-slate-800 text-slate-300 font-bold rounded-xl hover:bg-slate-700 transition-colors border border-slate-600 flex items-center gap-2">
              <QrCode size={18} /> Scan Ulang
            </button>
          </div>
        )}

        {/* JIKA BARANG DITEMUKAN (TAMPILKAN KARTU DETAIL) */}
        {resultStatus === "found" && scannedItem && (
          <div className="animate-in fade-in zoom-in duration-300">
            <div className="bg-[#0f172a] rounded-2xl border border-slate-700 p-6 shadow-inner relative overflow-hidden">
              <div className="absolute -right-10 -top-10 opacity-5">
                <Box size={150} />
              </div>

              <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start">
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0 ${scannedItem.stok <= scannedItem.stok_minimum ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"}`}>
                  <Box size={40} />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {scannedItem.kode_aset || 'TANPA KODE'}
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest flex items-center gap-1">
                      • Terverifikasi Sistem
                    </span>
                  </div>
                  <h2 className="text-2xl font-black text-white mb-2 leading-tight">{scannedItem.nama}</h2>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="bg-[#1e293b] p-3 rounded-xl border border-slate-700">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Stok Aktual</p>
                      <p className={`text-2xl font-black leading-none ${scannedItem.stok <= scannedItem.stok_minimum ? "text-red-400" : "text-emerald-400"}`}>
                        {scannedItem.stok} <span className="text-sm font-semibold text-slate-500 ml-1">{scannedItem.satuan}</span>
                      </p>
                    </div>
                    <div className="bg-[#1e293b] p-3 rounded-xl border border-slate-700">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Lokasi Aset</p>
                      <p className="text-sm font-bold text-white leading-tight mt-1">{scannedItem.gudang?.nama || "Lintas Gudang"}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-700/80 flex flex-col md:flex-row gap-3">
                <button onClick={startScanner} className="flex-1 py-3.5 bg-slate-800 text-slate-300 font-bold rounded-xl hover:bg-slate-700 transition-colors border border-slate-600 flex items-center justify-center gap-2">
                  <QrCode size={18} /> Scan QR Lain
                </button>
                <Link href="/transaksi" className="flex-1 py-3.5 bg-amber-500 text-slate-900 font-bold rounded-xl hover:bg-amber-400 transition-colors shadow-lg shadow-amber-900/20 flex items-center justify-center gap-2">
                  <ArrowRightLeft size={18} /> Catat Mutasi
                </Link>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
