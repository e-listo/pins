"use client";

import React, { useState, useEffect } from 'react';
import {
  FileText, FileSpreadsheet, Printer, Calendar,
  Package, Loader2, Filter, FileSignature, LayoutTemplate,
  ClipboardList, ArrowRightLeft, Building2, Warehouse, History,
  Trash2, Edit, AlertCircle, Key
} from 'lucide-react';
import { supabase } from '../../src/lib/supabase';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// IMPORT CAPACITOR DI ATAS (Mencegah Error Chunking di Android)
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export default function LaporanPage() {
  // STATE ANTI-HYDRATION ERROR
  const [isMounted, setIsMounted] = useState(false);

  const [gudangList, setGudangList] = useState([]);
  const [bidangList, setBidangList] = useState([]);
  const [userRole, setUserRole] = useState('');

  const [selectedBidang, setSelectedBidang] = useState('');
  const [selectedGudang, setSelectedGudang] = useState('');

  const [timeMode, setTimeMode] = useState('bulanan');
  const [reportType, setReportType] = useState('mutasi'); 

  // Inisialisasi Tanggal
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [reportData, setReportData] = useState([]);
  const [trxReportData, setTrxReportData] = useState([]); 
  const [isLoading, setIsLoading] = useState(false);

  const [deleteModal, setDeleteModal] = useState({ isOpen: false, trxId: null });
  const [deletePassword, setDeletePassword] = useState(''); 
  const [editModal, setEditModal] = useState({ isOpen: false, item: null, qty: '', ket: '' });

  const months = [
    { value: '01', label: 'Januari' }, { value: '02', label: 'Februari' }, { value: '03', label: 'Maret' },
    { value: '04', label: 'April' }, { value: '05', label: 'Mei' }, { value: '06', label: 'Juni' },
    { value: '07', label: 'Juli' }, { value: '08', label: 'Agustus' }, { value: '09', label: 'September' },
    { value: '10', label: 'Oktober' }, { value: '11', label: 'November' }, { value: '12', label: 'Desember' }
  ];

  // Efek Pertama: Mount & Setup Tanggal (Hanya jalan di Client)
  useEffect(() => {
    const currentDate = new Date();
    setSelectedMonth(String(currentDate.getMonth() + 1).padStart(2, '0'));
    setSelectedYear(String(currentDate.getFullYear()));
    
    const fDay = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`;
    const lDay = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;
    
    setStartDate(fDay);
    setEndDate(lDay);

    fetchMasterData();
    fetchUserRole();
    setIsMounted(true); // Tandai bahwa komponen sudah siap
  }, []);

  const fetchUserRole = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        const { data: pegawai } = await supabase.from('pegawai')
          .select('role').eq('auth_id', authData.user.id).single();
        if (pegawai) setUserRole(pegawai.role);
      }
    } catch (err) {
      console.error("Gagal mengambil profil user:", err);
    }
  };

  const fetchMasterData = async () => {
    const { data: bData } = await supabase.from('bidang_upt').select('id, nama').order('nama');
    if (bData) setBidangList(bData);

    const { data: gData } = await supabase.from('gudang').select('id, nama, bidang_id').order('nama');
    if (gData) setGudangList(gData);
  };

  // Mencegah render di server (Hydration Error)
  if (!isMounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-[#0f172a]">
        <Loader2 size={32} className="animate-spin text-emerald-500 mb-4" />
        <p className="text-sm font-bold text-slate-400">Memuat Modul Laporan...</p>
      </div>
    );
  }

  const currentYearNow = new Date().getFullYear();
  const years = Array.from({length: 5}, (_, i) => String(currentYearNow - i));

  const availableGudangList = selectedBidang
    ? gudangList.filter(g => String(g.bidang_id) === String(selectedBidang))
    : gudangList;

  const handleBidangChange = (e) => {
    setSelectedBidang(e.target.value);
    setSelectedGudang('');
  };

  const getPeriodeLabel = () => {
    if (timeMode === 'bulanan') {
      const monthName = months.find(m => m.value === selectedMonth)?.label;
      return `${monthName} ${selectedYear}`;
    }
    return `${startDate} s/d ${endDate}`;
  };

  const getReportTitle = () => {
    if (reportType === 'mutasi') return 'LAPORAN MUTASI BARANG PERSEDIAAN';
    if (reportType === 'stock') return 'LAPORAN HASIL STOCK OPNAME';
    return 'LAPORAN RIWAYAT TRANSAKSI BARANG';
  };

  const getHeaderEntityName = () => {
    if (selectedGudang) return gudangList.find(g => String(g.id) === String(selectedGudang))?.nama || "Semua Gudang";
    if (selectedBidang) return bidangList.find(b => String(b.id) === String(selectedBidang))?.nama + " (Konsolidasi Aset Bidang)";
    return "Seluruh Instansi & Gudang DPUPKP (Total Konsolidasi)";
  };

  const generateReport = async () => {
    setIsLoading(true);
    setTrxReportData([]);
    setReportData([]);
    try {
      let qStart = startDate;
      let qEnd = endDate;

      if (timeMode === 'bulanan') {
        const lastDayOfM = new Date(selectedYear, parseInt(selectedMonth), 0).getDate();
        qStart = `${selectedYear}-${selectedMonth}-01`;
        qEnd = `${selectedYear}-${selectedMonth}-${String(lastDayOfM).padStart(2, '0')}`;
      }

      const { data: dataBarangRaw, error: errBarang } = await supabase
        .from('barang')
        .select('id, nama, kode_aset, satuan, stok, harga_satuan, gudang_id, bidang_upt');
      if (errBarang) throw errBarang;

      let dataBarang = dataBarangRaw || [];
      const idsGudangBidangTerpilih = availableGudangList.map(g => String(g.id));

      if (selectedGudang) {
        dataBarang = dataBarang.filter(b => String(b.gudang_id) === String(selectedGudang));
      } else if (selectedBidang) {
        const namaBidang = bidangList.find(b => String(b.id) === String(selectedBidang))?.nama || "";
        const targetNama = String(namaBidang).trim().toLowerCase();
        dataBarang = dataBarang.filter(b => {
          const matchBidang = String(b.bidang_upt || "").trim().toLowerCase() === targetNama;
          const matchGudang = idsGudangBidangTerpilih.includes(String(b.gudang_id));
          return matchBidang || matchGudang;
        });
      }

      const { data: dataTransaksi, error: errTransaksi } = await supabase
        .from('transaksi')
        .select('id, barang_id, tipe, jumlah, tanggal, keterangan, gudang_asal_id, gudang_tujuan_id, barang:barang_id(nama, kode_aset, satuan), gudang_asal:gudang_asal_id(nama), gudang_tujuan:gudang_tujuan_id(nama)')
        .order('tanggal', { ascending: false })
        .order('created_at', { ascending: false });
      if (errTransaksi) throw errTransaksi;

      const filteredTrx = [];

      const calculatedData = dataBarang.map(barang => {
        let futureMasuk = 0; let futureKeluar = 0;
        let periodMasuk = 0; let periodKeluar = 0;

        dataTransaksi.forEach(trx => {
          if (!filteredTrx.find(t => t.id === trx.id)) {
            const tDate = trx.tanggal.substring(0, 10);
            if (tDate >= qStart && tDate <= qEnd) {
              let isIncluded = false;
              if (selectedGudang) {
                if (String(trx.gudang_asal_id) === String(selectedGudang) || String(trx.gudang_tujuan_id) === String(selectedGudang)) isIncluded = true;
              } else if (selectedBidang) {
                if (idsGudangBidangTerpilih.includes(String(trx.gudang_asal_id)) || idsGudangBidangTerpilih.includes(String(trx.gudang_tujuan_id))) isIncluded = true;
              } else {
                isIncluded = true;
              }
              if (isIncluded) filteredTrx.push(trx);
            }
          }

          if (trx.barang_id === barang.id) {
            const tDate = trx.tanggal.substring(0, 10);
            let isMasuk = false; let isKeluar = false;

            if (selectedGudang) {
              if (trx.tipe === 'masuk' && String(trx.gudang_tujuan_id) === String(selectedGudang)) isMasuk = true;
              if (trx.tipe === 'keluar' && String(trx.gudang_asal_id) === String(selectedGudang)) isKeluar = true;
              if (trx.tipe === 'mutasi') {
                if (String(trx.gudang_tujuan_id) === String(selectedGudang)) isMasuk = true;
                if (String(trx.gudang_asal_id) === String(selectedGudang)) isKeluar = true;
              }
            } else if (selectedBidang) {
              if (trx.tipe === 'masuk' && idsGudangBidangTerpilih.includes(String(trx.gudang_tujuan_id))) isMasuk = true;
              if (trx.tipe === 'keluar' && idsGudangBidangTerpilih.includes(String(trx.gudang_asal_id))) isKeluar = true;
              if (trx.tipe === 'mutasi') {
                if (idsGudangBidangTerpilih.includes(String(trx.gudang_tujuan_id))) isMasuk = true;
                if (idsGudangBidangTerpilih.includes(String(trx.gudang_asal_id))) isKeluar = true;
              }
            } else {
              if (trx.tipe === 'masuk') isMasuk = true;
              if (trx.tipe === 'keluar') isKeluar = true;
              if (trx.tipe === 'mutasi') { isMasuk = true; isKeluar = true; }
            }

            if (tDate > qEnd) {
              if (isMasuk) futureMasuk += trx.jumlah;
              if (isKeluar) futureKeluar += trx.jumlah;
            } else if (tDate >= qStart && tDate <= qEnd) {
              if (isMasuk) periodMasuk += trx.jumlah;
              if (isKeluar) periodKeluar += trx.jumlah;
            }
          }
        });

        const stokAkhir = barang.stok - futureMasuk + futureKeluar;
        const stokAwal = stokAkhir - periodMasuk + periodKeluar;

        return { ...barang, stok_awal: stokAwal, masuk: periodMasuk, keluar: periodKeluar, stok_akhir: stokAkhir };
      });

      setTrxReportData(filteredTrx.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal)));
      setReportData(calculatedData.sort((a,b) => a.nama.localeCompare(b.nama)));
    } catch (error) {
      alert('Gagal menarik data laporan: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleHapusClick = (transaksiId) => {
    setDeleteModal({ isOpen: true, trxId: transaksiId });
  };

  const handleEditClick = (item) => {
    setEditModal({ isOpen: true, item: item, qty: String(item.jumlah), ket: item.keterangan || '' });
  };

  const executeHapusTransaksi = async () => {
    if (!deleteModal.trxId) return;
    if (!deletePassword) {
      alert('Password wajib diisi untuk otorisasi!');
      return;
    }
    setIsLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Sesi pengguna tidak valid.');

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: deletePassword
      });

      if (authError) throw new Error('Otorisasi Gagal: Password yang Anda masukkan salah!');

      const { error: rpcError } = await supabase.rpc('hapus_transaksi_permanen', { p_transaksi_id: deleteModal.trxId });
      if (rpcError) throw rpcError;
      
      generateReport(); 
      setDeleteModal({ isOpen: false, trxId: null });
      setDeletePassword(''); 
    } catch (err) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const executeEditTransaksi = async () => {
    if (!editModal.item || !editModal.qty) return;
    setIsLoading(true);
    const id = editModal.item.id;
    const qty = parseInt(editModal.qty, 10);
    const ket = editModal.ket;
    setEditModal({ isOpen: false, item: null, qty: '', ket: '' });

    try {
      const { error } = await supabase.rpc('edit_transaksi_dasar', {
        p_transaksi_id: id,
        p_jumlah_baru: qty,
        p_harga_baru: null,
        p_keterangan_baru: ket
      });
      if (error) throw error;
      generateReport(); 
    } catch (err) {
      alert('Gagal mengedit: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const printHTML = (isResmi) => {
    const printWindow = window.open('', '_blank');
    const namaEntitas = getHeaderEntityName();
    const periodeLabel = getPeriodeLabel();
    const docTitle = getReportTitle();
    const currentDateStr = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });

    let tableHeaders = "";
    let tableRows = "";

    if (reportType === 'transaksi') {
      tableHeaders = `
        <tr>
          <th width="5%">No</th><th width="12%">Tanggal</th><th width="10%">Tipe</th>
          <th width="28%">Barang</th><th width="10%">Jumlah</th><th width="35%">Keterangan & Lokasi</th>
        </tr>`;
      tableRows = trxReportData.map((item, index) => {
        let lokasiStr = item.tipe === 'masuk' ? `Tujuan: ${item.gudang_tujuan?.nama || '-'}` :
                        item.tipe === 'keluar' ? `Asal: ${item.gudang_asal?.nama || '-'}` :
                        `Dari ${item.gudang_asal?.nama || '-'} ke ${item.gudang_tujuan?.nama || '-'}`;
        return `
        <tr>
          <td class="text-center">${index + 1}</td>
          <td class="text-center">${new Date(item.tanggal).toLocaleDateString('id-ID')}</td>
          <td class="text-center" style="text-transform:uppercase; font-size:9pt;">${item.tipe}</td>
          <td><strong>${item.barang?.nama || 'Barang Dihapus'}</strong><br><span style="font-size:8pt; color:#666;">${item.barang?.kode_aset || '-'}</span></td>
          <td class="text-right font-bold">${item.tipe === 'keluar' ? '-' : '+'}${item.jumlah} ${item.barang?.satuan || ''}</td>
          <td>${lokasiStr}<br><span style="font-size:8pt; font-style:italic; color:#666;">${item.keterangan || ''}</span></td>
        </tr>
      `}).join('');
    } else {
      tableHeaders = `
        <tr>
          <th width="5%">No</th><th width="15%">Kode Aset</th><th width="35%">Nama Barang</th>
          <th width="10%">Satuan</th><th width="8%">Stok Awal</th><th width="8%">Masuk</th>
          <th width="8%">Keluar</th><th width="11%">Stok Akhir</th>
        </tr>`;
      tableRows = reportData.map((item, index) => `
        <tr>
          <td class="text-center">${index + 1}</td>
          <td>${item.kode_aset || '-'}</td>
          <td>${item.nama}</td>
          <td class="text-center">${item.satuan}</td>
          <td class="text-right">${item.stok_awal}</td>
          <td class="text-right">${item.masuk}</td>
          <td class="text-right">${item.keluar}</td>
          <td class="text-right font-bold">${item.stok_akhir}</td>
        </tr>
      `).join('');
    }

    const html = `
      <html>
      <head>
        <title>${docTitle} - ${periodeLabel}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Times New Roman', Times, serif; padding: 20px 40px; color: #000; margin: 0; }
          .no-print { background: #1e293b; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; color: white; font-family: sans-serif; margin-bottom: 20px; position: sticky; top: 0; z-index: 100; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
          .no-print button { background: #ef4444; color: white; border: none; padding: 10px 20px; font-weight: bold; border-radius: 8px; cursor: pointer; font-size: 14px; }
          .kop-surat { text-align: center; border-bottom: 3px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
          .kop-surat h2, .kop-surat h3, .kop-surat p { margin: 0; padding: 2px; }
          .header-title { text-align: center; font-size: 14pt; font-weight: bold; margin-bottom: 20px; text-transform: uppercase; }
          .meta-info { margin-bottom: 15px; font-size: 11pt; }
          .meta-info table { width: auto; border: none; }
          .meta-info td { padding: 2px 10px 2px 0; border: none; font-weight: bold; }
          table.data-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 10pt; }
          table.data-table th, table.data-table td { border: 1px solid #000; padding: 6px; }
          table.data-table th { background-color: #f2f2f2; text-align: center; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .ttd-section { margin-top: 40px; width: 100%; page-break-inside: avoid; }
          .ttd-table { width: 100%; border: none; text-align: center; font-size: 11pt; }
          .ttd-table td { border: none; width: 50%; padding: 10px; vertical-align: top; }
          .ttd-space { height: 70px; }
          @media print {
            @page { margin: 1cm; size: A4 portrait; }
            body { padding: 0; }
            .no-print { display: none !important; }
          }
          @media (max-width: 600px) {
            body { padding: 0; }
            .no-print { padding: 10px; flex-direction: column; gap: 10px; }
            .no-print button { width: 100%; }
          }
        </style>
      </head>
      <body>
        <div class="no-print">
          <div><strong>Pratinjau Laporan</strong><br><span style="font-size: 12px; color: #94a3b8;">Klik tombol di bawah untuk keluar dari layar ini</span></div>
          <button onclick="window.close()">Tutup & Kembali</button>
        </div>
        <div style="padding: 0 15px;">
        ${isResmi ? `
        <div class="kop-surat">
          <h3>PEMERINTAH KOTA YOGYAKARTA</h3>
          <h2>DINAS PEKERJAAN UMUM PERUMAHAN DAN KAWASAN PERMUKIMAN</h2>
          <p style="font-size: 10pt;">Jl. Kenari No. 56, Muja Muju, Kec. Umbulharjo, Kota Yogyakarta, Daerah Istimewa Yogyakarta 55165</p>
        </div>
        ` : ''}
        <div class="header-title">${docTitle}</div>
        <div class="meta-info">
          <table>
            <tr><td>Entitas / Gudang</td><td>:</td><td>${namaEntitas}</td></tr>
            <tr><td>Periode</td><td>:</td><td>${periodeLabel}</td></tr>
          </table>
        </div>
        <div style="overflow-x: auto;">
          <table class="data-table">
            <thead>
              ${tableHeaders}
            </thead>
            <tbody>
              ${tableRows.length > 0 ? tableRows : `<tr><td colspan="8" class="text-center">Tidak ada data untuk laporan ini pada periode terpilih</td></tr>`}
            </tbody>
          </table>
        </div>
        ${isResmi ? `
        <div class="ttd-section">
          <table class="ttd-table">
            <tr>
              <td>
                Mengetahui,<br><strong>Kepala UPT / Kepala Bidang</strong>
                <div class="ttd-space"></div>
                <u>(.......................................................)</u><br>NIP. ...............................................
              </td>
              <td>
                Yogyakarta, ${currentDateStr}<br><strong>Pengurus Barang / Admin Gudang</strong>
                <div class="ttd-space"></div>
                <u>(.......................................................)</u><br>NIP. ...............................................
              </td>
            </tr>
          </table>
        </div>
        ` : ''}
        </div>
        <script>
          // Hanya print otomatis jika dibuka lewat PC
          if (!navigator.userAgent.match(/Android/i) && !navigator.userAgent.match(/iPhone/i)) {
            setTimeout(() => { window.print(); }, 500);
          }
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const exportPDF = async (isResmi) => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const namaEntitas = getHeaderEntityName();
      const periodeLabel = getPeriodeLabel();
      const docTitle = getReportTitle();
      let startY = 15;

      if(isResmi) {
        doc.setFont("times", "bold"); doc.setFontSize(12);
        doc.text('PEMERINTAH KOTA YOGYAKARTA', 105, startY, { align: 'center' });
        doc.setFontSize(14);
        doc.text('DINAS PEKERJAAN UMUM PERUMAHAN DAN KAWASAN PERMUKIMAN', 105, startY + 6, { align: 'center' });
        doc.setFontSize(9); doc.setFont("times", "normal");
        doc.text('Jl. Kenari No. 56, Muja Muju, Kec. Umbulharjo, Kota Yogyakarta', 105, startY + 11, { align: 'center' });
        doc.line(14, startY + 14, 196, startY + 14); doc.line(14, startY + 15, 196, startY + 15);
        startY += 25;
      }

      doc.setFont("helvetica", "bold"); doc.setFontSize(12);
      doc.text(docTitle, 105, startY, { align: 'center' });
      doc.setFontSize(10); doc.setFont("helvetica", "normal");
      startY += 10;
      doc.text(`Entitas / Gudang : ${namaEntitas}`, 14, startY);
      doc.text(`Periode          : ${periodeLabel}`, 14, startY + 5);

      let tableColumn = [];
      let tableRows = [];
      let columnStyles = {};

      if (reportType === 'transaksi') {
        tableColumn = ["No", "Tanggal", "Tipe", "Nama Barang", "Jumlah", "Lokasi/Keterangan"];
        tableRows = trxReportData.map((item, idx) => {
          let lokasiStr = item.tipe === 'masuk' ? `Tujuan: ${item.gudang_tujuan?.nama || '-'}` :
                          item.tipe === 'keluar' ? `Asal: ${item.gudang_asal?.nama || '-'}` :
                          `Mutasi: ${item.gudang_asal?.nama || '-'} -> ${item.gudang_tujuan?.nama || '-'}`;
          return [
            idx + 1, new Date(item.tanggal).toLocaleDateString('id-ID'), item.tipe.toUpperCase(),
            item.barang?.nama || 'Dihapus', `${item.tipe === 'keluar' ? '-' : '+'}${item.jumlah} ${item.barang?.satuan||''}`,
            `${lokasiStr}\n${item.keterangan ? `(${item.keterangan})` : ''}`
          ];
        });
        columnStyles = { 0: { halign: 'center', cellWidth: 10 }, 1: { halign: 'center', cellWidth: 20 }, 2: { halign: 'center', cellWidth: 20 }, 4: { halign: 'right', cellWidth: 25, fontStyle: 'bold' } };
      } else {
        tableColumn = ["No", "Kode Aset", "Nama Barang", "Satuan", "Awal", "Masuk", "Keluar", "Akhir"];
        tableRows = reportData.map((item, idx) => [
          idx + 1, item.kode_aset || '-', item.nama, item.satuan, item.stok_awal, item.masuk, item.keluar, item.stok_akhir
        ]);
        columnStyles = { 0: { halign: 'center', cellWidth: 10 }, 3: { halign: 'center' }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right', fontStyle: 'bold' } };
      }

      if (tableRows.length === 0) {
        doc.text("Tidak ada data untuk laporan ini pada periode terpilih.", 14, startY + 20);
      } else {
        autoTable(doc, {
          head: [tableColumn], body: tableRows, startY: startY + 10, theme: 'grid',
          styles: { fontSize: 8, cellPadding: 2, font: "helvetica" },
          headStyles: { fillColor: isResmi ? [50, 50, 50] : [16, 185, 129], halign: 'center' },
          columnStyles: columnStyles
        });
      }

      if(isResmi) {
        const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : startY + 40;
        doc.setFontSize(10);
        const currentDateStr = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
        doc.text('Mengetahui,', 45, finalY, { align: 'center' });
        doc.text('Kepala UPT / Kepala Bidang', 45, finalY + 5, { align: 'center' });
        doc.text('(........................................)', 45, finalY + 25, { align: 'center' });
        doc.text(`Yogyakarta, ${currentDateStr}`, 165, finalY, { align: 'center' });
        doc.text('Pengurus Barang / Admin Gudang', 165, finalY + 5, { align: 'center' });
        doc.text('(........................................)', 165, finalY + 25, { align: 'center' });
      }

      const filePrefix = reportType === 'mutasi' ? 'Mutasi' : reportType === 'stock' ? 'Stock_Opname' : 'Riwayat_Transaksi';
      const fileName = `Laporan_${filePrefix}_${namaEntitas.replace(/\s+/g,'_')}.pdf`;

      // LOGIKA PENYIMPANAN CERDAS (DETEKSI ANDROID VS PC)
      if (Capacitor.isNativePlatform()) {
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        const result = await Filesystem.writeFile({
          path: fileName,
          data: pdfBase64,
          directory: Directory.Cache
        });
        
        await Share.share({
          title: fileName,
          url: result.uri,
          dialogTitle: 'Simpan atau Bagikan PDF'
        });
      } else {
        doc.save(fileName);
      }

    } catch (err) { alert("Gagal mencetak PDF: " + err.message); }
  };

  const exportExcel = async () => {
    try {
      let worksheetData = [];
      if (reportType === 'transaksi') {
        worksheetData = trxReportData.map((item, idx) => ({
          'No': idx + 1, 'Tanggal': new Date(item.tanggal).toLocaleDateString('id-ID'), 'Tipe': item.tipe.toUpperCase(),
          'Kode Aset': item.barang?.kode_aset || '-', 'Nama Barang': item.barang?.nama || 'Dihapus',
          'Satuan': item.barang?.satuan || '-', 'Jumlah': item.jumlah,
          'Lokasi Asal': item.gudang_asal?.nama || '-', 'Lokasi Tujuan': item.gudang_tujuan?.nama || '-',
          'Keterangan': item.keterangan || '-'
        }));
      } else {
        worksheetData = reportData.map((item, idx) => ({
          'No': idx + 1, 'Kode Aset': item.kode_aset, 'Nama Barang': item.nama, 'Satuan': item.satuan,
          'Stok Awal': item.stok_awal, 'Masuk': item.masuk, 'Keluar': item.keluar, 'Stok Akhir': item.stok_akhir, 'Nilai Satuan': item.harga_satuan
        }));
      }

      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan");

      const filePrefix = reportType === 'mutasi' ? 'Mutasi' : reportType === 'stock' ? 'Stock_Opname' : 'Riwayat_Transaksi';
      const fileName = `Data_${filePrefix}_${getPeriodeLabel()}.xlsx`;

      // LOGIKA PENYIMPANAN CERDAS (DETEKSI ANDROID VS PC)
      if (Capacitor.isNativePlatform()) {
        const excelBase64 = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
        const result = await Filesystem.writeFile({
          path: fileName,
          data: excelBase64,
          directory: Directory.Cache
        });
        
        await Share.share({
          title: fileName,
          url: result.uri,
          dialogTitle: 'Simpan atau Bagikan Excel'
        });
      } else {
        XLSX.writeFile(workbook, fileName);
      }
    } catch (err) { alert("Gagal mengunduh Excel: " + err.message); }
  };

  return (
    <div className="p-6 space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Laporan & Stock Opname</h1>
          <p className="text-sm text-slate-400 mt-1">Cetak dokumen stok dan mutasi barang secara periodik</p>
        </div>
      </div>

      <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-xl flex flex-col gap-6">
        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Pilih Jenis Dokumen</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${reportType === 'mutasi' ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700 bg-[#0f172a] hover:border-emerald-500/50'}`}>
              <input type="radio" name="reportType" value="mutasi" checked={reportType === 'mutasi'} onChange={() => setReportType('mutasi')} className="w-5 h-5 text-emerald-500 border-slate-600 focus:ring-emerald-500 focus:ring-offset-[#1e293b] accent-emerald-500" />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white flex items-center gap-2"><ArrowRightLeft size={16} className="text-emerald-500"/> Mutasi Barang</span>
                <span className="text-xs text-slate-400 mt-0.5">Rekapitulasi masuk/keluar per barang</span>
              </div>
            </label>

            <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${reportType === 'stock' ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 bg-[#0f172a] hover:border-blue-500/50'}`}>
              <input type="radio" name="reportType" value="stock" checked={reportType === 'stock'} onChange={() => setReportType('stock')} className="w-5 h-5 text-blue-500 border-slate-600 focus:ring-blue-500 focus:ring-offset-[#1e293b] accent-blue-500" />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white flex items-center gap-2"><ClipboardList size={16} className="text-blue-500"/> Stock Opname</span>
                <span className="text-xs text-slate-400 mt-0.5">Seluruh barang beserta sisa akhirnya</span>
              </div>
            </label>

            <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${reportType === 'transaksi' ? 'border-amber-500 bg-amber-500/10' : 'border-slate-700 bg-[#0f172a] hover:border-amber-500/50'}`}>
              <input type="radio" name="reportType" value="transaksi" checked={reportType === 'transaksi'} onChange={() => setReportType('transaksi')} className="w-5 h-5 text-amber-500 border-slate-600 focus:ring-amber-500 focus:ring-offset-[#1e293b] accent-amber-500" />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white flex items-center gap-2"><History size={16} className="text-amber-500"/> Riwayat Transaksi</span>
                <span className="text-xs text-slate-400 mt-0.5">Daftar log rinci aktivitas keluar masuk</span>
              </div>
            </label>
          </div>
        </div>

        <hr className="border-slate-700" />

        <div className="flex flex-wrap items-end gap-4">
          <div className="flex border border-slate-700 rounded-xl w-fit p-1 bg-[#0f172a] mb-[2px]">
            <button onClick={() => setTimeMode('bulanan')} className={`px-5 py-2 text-xs font-bold rounded-lg transition-colors ${timeMode === 'bulanan' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>Bulanan</button>
            <button onClick={() => setTimeMode('custom')} className={`px-5 py-2 text-xs font-bold rounded-lg transition-colors ${timeMode === 'custom' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>Kustom</button>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              <Building2 size={12} className="text-blue-400"/> Filter Instansi/Bidang
            </label>
            <select value={selectedBidang} onChange={handleBidangChange} className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-blue-500 outline-none transition-colors">
              <option value="">Semua Bidang (Total DPUPKP)</option>
              {bidangList.map(b => <option key={b.id} value={b.id}>{b.nama}</option>)}
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              <Warehouse size={12} className="text-amber-400"/> Filter Gudang Spesifik
            </label>
            <select value={selectedGudang} onChange={(e) => setSelectedGudang(e.target.value)} disabled={!selectedBidang && availableGudangList.length === 0} className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-amber-500 outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <option value="">Semua Gudang {selectedBidang ? 'di Bidang Ini' : '(Konsolidasi)'}</option>
              {availableGudangList.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
            </select>
          </div>

          {timeMode === 'bulanan' ? (
            <>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Bulan</label>
                <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none">
                  {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tahun</label>
                <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none">
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Dari Tanggal</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none [color-scheme:dark]" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Sampai Tanggal</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none [color-scheme:dark]" />
              </div>
            </>
          )}

          <button onClick={generateReport} disabled={isLoading} className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-6 py-2.5 rounded-xl text-sm font-black transition-all disabled:opacity-50 shadow-lg shadow-emerald-900/20 mt-2 sm:mt-0 w-full sm:w-auto">
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Filter size={18} />}
            Tarik Data
          </button>
        </div>
      </div>

      {((reportType !== 'transaksi' && reportData.length > 0) || (reportType === 'transaksi' && trxReportData.length > 0)) && (
        <div className="flex flex-col md:flex-row gap-4 justify-between animate-in fade-in zoom-in-95 duration-300">
          <div className="flex flex-col gap-3 p-4 bg-[#1e293b] rounded-2xl border border-slate-700 shadow-lg">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><FileSpreadsheet size={14}/> Cetak Data Sederhana</span>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => printHTML(false)} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 px-4 py-2 rounded-xl text-xs font-bold transition-colors">
                <LayoutTemplate size={14} /> HTML (Print)
              </button>
              <button onClick={() => exportPDF(false)} className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-4 py-2 rounded-xl text-xs font-bold transition-colors">
                <FileText size={14} /> Unduh PDF
              </button>
              <button onClick={exportExcel} className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-4 py-2 rounded-xl text-xs font-bold transition-colors">
                <FileSpreadsheet size={14} /> Excel
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3 p-4 bg-blue-900/10 rounded-2xl border border-blue-500/30 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5 relative z-10"><FileSignature size={14}/> Cetak Dokumen Laporan Resmi</span>
            <div className="flex gap-2 flex-wrap relative z-10">
              <button onClick={() => printHTML(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md transition-colors">
                <Printer size={14} /> Kertas Kop (Print)
              </button>
              <button onClick={() => exportPDF(true)} className="flex items-center gap-2 bg-blue-800 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md transition-colors border border-blue-600">
                <FileSignature size={14} /> PDF Resmi (TTD)
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#1e293b] rounded-2xl border border-slate-700 overflow-hidden shadow-xl relative">
        {isLoading && (
          <div className="absolute inset-0 bg-[#1e293b]/50 backdrop-blur-sm z-20 flex items-center justify-center">
            <Loader2 size={32} className="animate-spin text-emerald-500" />
          </div>
        )}

        <div className="p-5 border-b border-slate-700 bg-[#0f172a] flex justify-between items-center">
          <h2 className="font-black text-white flex items-center gap-2">
            {reportType === 'transaksi' ? <History className="text-amber-500" /> : <LayoutTemplate className="text-amber-500" />}
            {getReportTitle()}
          </h2>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-amber-400 px-3 py-1.5 rounded-lg border border-slate-700 shadow-sm">{getPeriodeLabel()}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            {reportType === 'transaksi' ? (
              <thead className="bg-[#0f172a] text-slate-400 border-b border-slate-700 text-[10px] uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Tanggal</th>
                  <th className="px-6 py-4 text-center">Tipe</th>
                  <th className="px-6 py-4">Kode & Barang</th>
                  <th className="px-6 py-4 text-right">Jumlah</th>
                  <th className="px-6 py-4">Keterangan / Lokasi</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
            ) : (
              <thead className="bg-[#0f172a] text-slate-400 border-b border-slate-700 text-[10px] uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Kode / Barang</th>
                  <th className="px-6 py-4 text-center">Satuan</th>
                  <th className="px-6 py-4 text-right">Stok Awal</th>
                  <th className="px-6 py-4 text-right text-emerald-400">Masuk</th>
                  <th className="px-6 py-4 text-right text-red-400">Keluar</th>
                  <th className="px-6 py-4 text-right text-blue-400">Stok Akhir</th>
                </tr>
              </thead>
            )}

            <tbody className="divide-y divide-slate-700/50">
              {(reportType === 'transaksi' && trxReportData.length === 0) || (reportType !== 'transaksi' && reportData.length === 0) ? (
                <tr>
                  <td colSpan="6" className="px-6 py-16 text-center text-slate-500">
                    <Package size={48} className="mx-auto mb-4 text-slate-600 opacity-50" />
                    {reportData.length === 0 && trxReportData.length === 0 ? (
                       <span>Silakan atur filter di atas dan klik <strong className="text-emerald-500">"Tarik Data"</strong> untuk memuat laporan.</span>
                    ) : (
                       <span>Tidak ada data yang sesuai dengan filter pada periode ini.</span>
                    )}
                  </td>
                </tr>
              ) : reportType === 'transaksi' ? (
                trxReportData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-[#253243] transition-colors">
                    <td className="px-6 py-4 text-xs font-mono">{new Date(item.tanggal).toLocaleDateString('id-ID')}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider border ${
                        item.tipe === 'masuk' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        item.tipe === 'keluar' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>{item.tipe}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-white">{item.barang?.nama || 'Barang Dihapus'}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{item.barang?.kode_aset || '-'}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`text-base font-black ${item.tipe === 'keluar' ? 'text-red-400' : item.tipe === 'masuk' ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {item.tipe === 'keluar' ? '-' : '+'}{item.jumlah}
                      </span>
                      <span className="text-[10px] text-slate-500 ml-1">{item.barang?.satuan || ''}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-medium text-slate-300">
                        {item.tipe === 'masuk' ? `Tujuan: ${item.gudang_tujuan?.nama || '-'}` :
                         item.tipe === 'keluar' ? `Asal: ${item.gudang_asal?.nama || '-'}` :
                         `${item.gudang_asal?.nama || '-'} ➔ ${item.gudang_tujuan?.nama || '-'}`}
                      </p>
                      {item.keterangan && <p className="text-[10px] text-slate-500 italic mt-0.5">{item.keterangan}</p>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {userRole === 'superadmin' ? (
                        <div className="flex justify-center gap-2">
                          <button onClick={() => handleEditClick(item)} className="p-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white rounded transition-colors" title="Edit Qty/Keterangan">
                            <Edit size={14} />
                          </button>
                          <button onClick={() => handleHapusClick(item.id)} className="p-1.5 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded transition-colors" title="Hapus Permanen">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">-</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                reportData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-[#253243] transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-white">{item.nama}</p>
                      <p className="text-[10px] text-amber-500 font-mono mt-0.5">{item.kode_aset || '-'}</p>
                    </td>
                    <td className="px-6 py-4 text-center text-xs font-semibold">{item.satuan}</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-400">{item.stok_awal}</td>
                    <td className="px-6 py-4 text-right font-black text-emerald-500">+{item.masuk}</td>
                    <td className="px-6 py-4 text-right font-black text-red-500">-{item.keluar}</td>
                    <td className="px-6 py-4 text-right font-black text-blue-400 text-base">{item.stok_akhir}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL HAPUS PERMANEN DENGAN PASSWORD (SUDO) */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#1e293b] p-6 rounded-2xl shadow-2xl max-w-sm w-full border border-slate-700 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 mb-4 text-red-500">
              <AlertCircle size={24} />
              <h3 className="text-lg font-bold text-white">Otorisasi Hapus</h3>
            </div>
            <p className="text-sm text-slate-300 mb-4 leading-relaxed">
              Sistem akan otomatis mengkalibrasi ulang stok barang. <br/><strong className="text-red-400">Tindakan ini permanen.</strong>
            </p>
            <div className="mb-6">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                <Key size={14} className="text-amber-500"/> Password Super Admin
              </label>
              <input 
                type="password" 
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Masukkan password Anda..."
                className="w-full bg-[#0f172a] border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all placeholder:text-slate-600"
                autoComplete="new-password"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setDeleteModal({isOpen: false, trxId: null}); setDeletePassword(''); }} disabled={isLoading} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-slate-700 transition">Batal</button>
              <button onClick={executeHapusTransaksi} disabled={isLoading || !deletePassword} className="px-4 py-2 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/20 transition disabled:opacity-50 flex items-center gap-2">
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                {isLoading ? 'Memverifikasi...' : 'Hapus Permanen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REVISI (EDIT) */}
      {editModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#1e293b] p-6 rounded-2xl shadow-2xl max-w-md w-full border border-slate-700 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 mb-4 text-blue-400">
              <Edit size={24} />
              <h3 className="text-lg font-bold text-white">Revisi Transaksi</h3>
            </div>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Nama Barang</label>
                <div className="text-sm font-semibold text-slate-300 bg-[#0f172a] p-3 rounded-xl border border-slate-700">{editModal.item?.barang?.nama}</div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Jumlah (Qty) Sebenarnya</label>
                <input type="number" value={editModal.qty} onChange={(e) => setEditModal({...editModal, qty: e.target.value})} className="w-full bg-[#0f172a] border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white focus:border-blue-500 outline-none transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Keterangan / Alasan Revisi</label>
                <textarea value={editModal.ket} onChange={(e) => setEditModal({...editModal, ket: e.target.value})} rows="2" className="w-full bg-[#0f172a] border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white focus:border-blue-500 outline-none transition-colors placeholder:text-slate-600" placeholder="Contoh: Koreksi qty dari 10 menjadi 10..."></textarea>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setEditModal({isOpen: false, item: null, qty: '', ket: ''})} disabled={isLoading} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-slate-700 transition">Batal</button>
              <button onClick={executeEditTransaksi} disabled={isLoading || !editModal.qty} className="px-4 py-2 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 transition disabled:opacity-50 flex items-center gap-2">
                {isLoading && <Loader2 size={16} className="animate-spin" />}
                {isLoading ? 'Menyimpan...' : 'Simpan Revisi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
