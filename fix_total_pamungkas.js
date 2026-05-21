require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. REKONSTRUKSI DATABASE (Bypass RLS dengan Service Key)
async function fixDB() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  const { data: authData } = await supabase.auth.admin.listUsers();
  if (!authData || !authData.users) return console.log("⚠️ Gagal akses auth admin.");

  const me = authData.users.find(u => u.email === '3303021706830001@pupkp.local');
  if (me) {
    // Hapus paksa data lama yang cacat
    await supabase.from('pegawai').delete().eq('auth_id', me.id);
    
    // Tanamkan ulang sebagai Super Admin murni
    await supabase.from('pegawai').insert({
      auth_id: me.id,
      nip: '3303021706830001',
      nama: 'Listo (Super Admin)',
      role: 'superadmin',
      jabatan: 'Administrator PINS'
    });
    console.log("✅ DATABASE: Akun Listo berhasil direkonstruksi sebagai Super Admin!");
  }
}

// 2. PEMINDAI KODE REKURSIF (Memperbaiki query rusak di SEMUA file)
function replaceInFiles(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceInFiles(fullPath);
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;

      // Hancurkan semua query relasi lama yang menyebabkan sistem menjadi Viewer
      if (content.includes('bidang(*)')) {
        content = content.replace(/bidang\(\*\)/g, 'bidang:bidang_upt(*)');
        modified = true;
      }
      if (content.includes('bidang:bidang_id(*)')) {
        content = content.replace(/bidang:bidang_id\(\*\)/g, 'bidang:bidang_upt(*)');
        modified = true;
      }

      if (modified) {
        fs.writeFileSync(fullPath, content);
        console.log(`✅ FILE DIPERBAIKI: ${fullPath}`);
      }
    }
  }
}

async function run() {
  console.log("Memulai Operasi Sapu Bersih...");
  await fixDB();
  replaceInFiles('app');
  replaceInFiles('src');
  console.log("🔥 Operasi selesai!");
}
run();
