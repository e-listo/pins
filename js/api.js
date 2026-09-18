const API_BASE = "https://api-pins.dpupkp.my.id/api/v1";

function getToken() {
  return localStorage.getItem("pins_token");
}
function setToken(t) {
  localStorage.setItem("pins_token", t);
}
function clearToken() {
  localStorage.removeItem("pins_token");
  localStorage.removeItem("pins_user");
}
function getUser() {
  const u = localStorage.getItem("pins_user");
  return u ? JSON.parse(u) : null;
}
function setUser(u) {
  localStorage.setItem("pins_user", JSON.stringify(u));
}

async function apiFetch(path, options = {}) {
  const headers = options.headers || {};
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    window.location.href = "index.html";
    return null;
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Terjadi kesalahan pada server");
    return data;
  }
  if (!res.ok) throw new Error("Terjadi kesalahan pada server");
  return res;
}

async function downloadFile(path, fallbackName) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    alert(err.error || "Gagal mengunduh laporan");
    return;
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : fallbackName;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function requireLogin() {
  if (!getToken()) {
    window.location.href = "index.html";
  }
}

function logout() {
  clearToken();
  window.location.href = "index.html";
}

function terapkanBatasanRole() {
  const user = getUser();
  const role = user ? user.role : null;
  document.querySelectorAll("[data-role]").forEach((el) => {
    const allowed = el.getAttribute("data-role").split(",").map((r) => r.trim());
    if (!allowed.includes(role)) el.classList.add("hidden");
  });
}

function renderHeaderUser() {
  const user = getUser();
  const nameEl = document.getElementById("user-name");
  const roleEl = document.getElementById("user-role");
  if (user && nameEl) nameEl.textContent = user.nama;
  if (user && roleEl) roleEl.textContent = user.role;
}
