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

async function callAdminApi(path, options) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Sesi login tidak valid. Silakan login kembali.')

  const response = await fetch(path, {
    ...options,
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  })

  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || 'Operasi administrator gagal')
  return result
}

export async function registerUser(nip, password, nama) {
  const result = await callAdminApi('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify({ nip, password, nama }),
  })
  return result.user
}

export async function resetPasswordByAdmin(authId, newPassword) {
  const result = await callAdminApi(`/api/admin/users/${encodeURIComponent(authId)}/password`, {
    method: 'PUT',
    body: JSON.stringify({ password: newPassword }),
  })
  return result.user
}
