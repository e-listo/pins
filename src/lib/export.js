import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const exportStokPDF = (data, bulan, tahun, isPreview = false) => {
  const doc = new jsPDF();
  const bulanNames = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  
  // Ambil Waktu Pencetakan (Format Indonesia)
  const sekarang = new Date();
  const waktuCetak = sekarang.toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Jakarta"
  }) + " WIB";

  // Header Utama
  doc.setFontSize(14);
  doc.text("Buku Inventaris Barang (Stok Aktual) - DPUPKP Kota Yogyakarta", 14, 15);
  
  // Sub-header Periode
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`PINS - PUPKP Inventory System | Periode: ${bulanNames[bulan] || ''} ${tahun}`, 14, 22);
  
  // BARIS BARU: Keterangan Waktu Pencetakan (Font Italic agar terlihat bedanya)
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.text(`Dokumen dicetak otomatis pada: ${waktuCetak}`, 14, 28);
  
  // Reset gaya untuk tabel
  doc.setTextColor(0);
  doc.setFont("helvetica", "normal");

  const tableColumn = ["NUP", "Nama Barang", "Kategori", "Lokasi", "Harga (Rp)", "Stok", "Total (Rp)"];
  const tableRows = data.map(item => [
    item.kode,
    item.nama,
    item.kategori,
    item.gudang,
    Math.round(item.harga || 0).toLocaleString("id-ID"),
    `${item.stok} ${item.satuan || 'Unit'}`,
    Math.round((item.stok || 0) * (item.harga || 0)).toLocaleString("id-ID")
  ]);

  autoTable(doc, {
    startY: 33, // Diberi jarak agar tidak menimpa baris waktu cetak
    head: [tableColumn],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [31, 41, 55], halign: 'center' },
    styles: { fontSize: 8 },
    columnStyles: {
      4: { halign: 'right' },
      5: { halign: 'center' },
      6: { halign: 'right' }
    }
  });

  if (isPreview) {
    // Gunakan Blob URL unik untuk mematikan cache browser pada tab baru
    const pdfBlob = doc.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    window.open(url, '_blank');
  } else {
    doc.save(`Laporan_Stok_PUPKP_${tahun}_${String(bulan).padStart(2, '0')}.pdf`);
  }
};

// Fungsi Export Transaksi juga diperbarui agar seragam
export const exportTransaksiPDF = (data, bulan, tahun, isPreview = false) => {
  const doc = new jsPDF();
  const sekarang = new Date();
  const waktuCetak = sekarang.toLocaleString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) + " WIB";

  doc.setFontSize(14);
  doc.text("Buku Mutasi Barang - DPUPKP Kota Yogyakarta", 14, 15);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Dicetak pada: ${waktuCetak}`, 14, 22);
  doc.setTextColor(0);

  const tableColumn = ["Tanggal", "Barang", "Tipe", "Lokasi", "Jumlah"];
  const tableRows = data.map(t => [
    t.tanggal,
    t.barang,
    t.tipe.toUpperCase(),
    t.gudang,
    t.jumlah
  ]);

  autoTable(doc, {
    startY: 28,
    head: [tableColumn],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [31, 41, 55] }
  });

  if (isPreview) {
    window.open(URL.createObjectURL(doc.output('blob')), '_blank');
  } else {
    doc.save(`Laporan_Mutasi_PUPKP_${tahun}.pdf`);
  }
};
