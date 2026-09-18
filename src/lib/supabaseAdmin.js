import { createClient } from '@supabase/supabase-js';

function env(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Server belum dikonfigurasi: ${name}`);
  return value;
}

export function createAdminClient() {
  return createClient(
    env('NEXT_PUBLIC_SUPABASE_URL'),
    env('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function requireWritableSuperadmin(request) {
  const authorization = request.headers.get('authorization') || '';
  const accessToken = authorization.startsWith('Bearer ')
    ? authorization.slice(7).trim()
    : '';

  if (!accessToken) {
    return { error: 'Sesi login tidak ditemukan.', status: 401 };
  }

  const admin = createAdminClient();
  const { data: userData, error: userError } = await admin.auth.getUser(accessToken);
  if (userError || !userData.user) {
    return { error: 'Sesi login tidak valid atau sudah berakhir.', status: 401 };
  }

  // select('*') menjaga endpoint tetap dapat dipakai sebelum dan sesudah
  // migrasi yang menambahkan kolom hanya_baca.
  const { data: pegawai, error: pegawaiError } = await admin
    .from('pegawai')
    .select('*')
    .eq('auth_id', userData.user.id)
    .single();

  if (pegawaiError || !pegawai) {
    return { error: 'Profil pegawai tidak ditemukan.', status: 403 };
  }

  if (pegawai.status !== 'Aktif' || pegawai.role !== 'superadmin' || pegawai.hanya_baca === true) {
    return { error: 'Hanya Super Admin aktif dengan hak tulis yang diizinkan.', status: 403 };
  }

  return { admin, user: userData.user, pegawai };
}
