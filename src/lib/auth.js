import { supabase } from './supabase'

export async function loginNIP(nip, password) {
  const email = `${nip}@pupkp.local`
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })
  if (authError) throw authError

  const { data: pegawai, error } = await supabase
    .from('pegawai')
    .select('*') // <-- MURNI TANPA JOIN, 100% AMAN
    .eq('auth_id', authData.user.id)
    .single()

  return { session: authData.session, pegawai }
}

export async function logout() {
  await supabase.auth.signOut()
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getPegawai() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('pegawai')
    .select('*') // <-- MURNI TANPA JOIN, 100% AMAN
    .eq('auth_id', user.id)
    .single()

  // TIDAK ADA bypass di sini. Kegagalan query berarti sesi/izin bermasalah,
  // bukan alasan untuk menaikkan hak akses. Lihat audit K1.
  if (error || !data) {
    console.error('Gagal memuat profil pegawai:', error?.message)
    return null
  }
  return data
}

// Definisi hak akses kini terpusat di src/lib/roles.js supaya konsisten
// dengan fungsi can_write()/can_write_gudang() di database.
// Re-export agar pemanggil lama tidak rusak.
export { canWrite, canManageMaster as canAdmin, isSuperadmin as isSuperAdmin } from './roles'

export async function registerUser(nip, password, nama) {
  const serviceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: `${nip}@pupkp.local`, password, email_confirm: true, user_metadata: { nip, nama } })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.msg || 'Gagal mendaftarkan user')
  return data
}

export async function resetPasswordByAdmin(authId, newPassword) {
  const serviceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${authId}`, {
    method: 'PUT',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ password: newPassword })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.msg || 'Gagal reset password')
  return data
}
