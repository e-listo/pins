import * as XLSX from 'xlsx';

export const downloadTemplateBarang = () => {
  // 1. Definisikan header dan baris contoh (Sengaja disamakan dengan field Supabase)
  const templateData = [
    {
      kode_aset: "PJU.5.2.6.02.001",
      nama: "Kabel NYY 4x10mm",
      satuan: "Meter",
      stok: 0,
      stok_minimum: 10,
      harga_satuan: 45000,
      bidang_upt: "UPT Penerangan Jalan Umum",
      keterangan: "Contoh pengisian. Hapus baris ini sebelum di-import!"
    }
  ];

  // 2. Buat Worksheet & Workbook
  const ws = XLSX.utils.json_to_sheet(templateData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template_Barang");

  // 3. Atur lebar kolom agar rapi saat dibuka di Excel
  ws['!cols'] = [
    { wch: 20 }, // kode_aset
    { wch: 40 }, // nama
    { wch: 10 }, // satuan
    { wch: 10 }, // stok
    { wch: 15 }, // stok_minimum
    { wch: 15 }, // harga_satuan
    { wch: 30 }, // bidang_upt
    { wch: 50 }  // keterangan
  ];

  // 4. Trigger download ke browser user
  XLSX.writeFile(wb, "Template_Import_Barang_PINS.xlsx");
};
