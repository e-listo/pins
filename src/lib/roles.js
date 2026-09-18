// src/lib/roles.js — sumber tunggal kebenaran untuk peran & hak akses.
// Menggantikan 11 lokasi String(role).toLowerCase().includes("super")
// dan helper lama di src/lib/auth.js.

export const ROLE = {
  SUPERADMIN:   'superadmin',    // lintas bidang
  ADMIN_BIDANG: 'admin_bidang',  // semua gudang dalam 1 bidang
  ADMIN_GUDANG: 'admin_gudang',  // hanya gudang yang di-assign (bisa banyak)
};

export const ROLE_OPTIONS = [
  { value: ROLE.SUPERADMIN,   label: 'Super Admin' },
  { value: ROLE.ADMIN_BIDANG, label: 'Admin Bidang' },
  { value: ROLE.ADMIN_GUDANG, label: 'Admin Gudang' },
];

export const ROLE_BADGE = {
  [ROLE.SUPERADMIN]:   { label: 'Super Admin',  color: 'bg-purple-100 text-purple-700' },
  [ROLE.ADMIN_BIDANG]: { label: 'Admin Bidang', color: 'bg-blue-100 text-blue-700' },
  [ROLE.ADMIN_GUDANG]: { label: 'Admin Gudang', color: 'bg-emerald-100 text-emerald-700' },
};

// Label yang tampil di UI: pakai label_peran (jabatan fungsional) kalau ada,
// jatuh ke label peran teknis kalau tidak.
export function roleLabel(p) {
  if (p?.label_peran) return p.label_peran + (p?.hanya_baca ? ' (hanya baca)' : '');
  return ROLE_BADGE[p?.role]?.label ?? '-';
}

export function roleBadge(p) {
  return ROLE_BADGE[p?.role] ?? { label: roleLabel(p), color: 'bg-slate-100 text-slate-600' };
}

// --- Cakupan data (siapa melihat apa) ---
// Sengaja pakai perbandingan persis, BUKAN includes(), supaya nilai baru
// tidak pernah lolos secara kebetulan.
export const isSuperadmin  = p => p?.role === ROLE.SUPERADMIN;
export const isAdminBidang = p => p?.role === ROLE.ADMIN_BIDANG;
export const isAdminGudang = p => p?.role === ROLE.ADMIN_GUDANG;

// --- Hak tulis (cermin dari fungsi can_write() di database) ---
// Verifikator = admin_bidang/superadmin dengan hanya_baca = true.
export const isReadOnly = p => p?.hanya_baca === true;

export const canWrite       = p => !!p?.role && !isReadOnly(p);
export const canManageMaster= p => isSuperadmin(p) && !isReadOnly(p); // bidang, kategori, gudang, user
export const canDelete      = p => isSuperadmin(p) && !isReadOnly(p);

// Boleh menulis pada gudang tertentu — cermin can_write_gudang(gid) di DB.
// allowedGudangIds diisi dari operator_gudang untuk admin_gudang.
export function canWriteGudang(p, gudangId, { allowedGudangIds = [], bidangIdOfGudang = null } = {}) {
  if (!canWrite(p) || !gudangId) return false;
  if (isSuperadmin(p))  return true;
  if (isAdminBidang(p)) return bidangIdOfGudang === p?.bidang_id;
  if (isAdminGudang(p)) return allowedGudangIds.includes(gudangId);
  return false;
}

// Bypass maintenance mode: HANYA superadmin yang boleh menulis.
// Verifikator Utama (superadmin + hanya_baca) sengaja TIDAK di-bypass,
// karena saat rekonsiliasi SIMBARA data sedang tidak konsisten.
export const canBypassMaintenance = p => isSuperadmin(p) && !isReadOnly(p);
