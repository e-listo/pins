// src/lib/pinsApi.ts

const API_BASE = process.env.NEXT_PUBLIC_PINS_API_URL ?? "https://api-pins.dpupkp.my.id/api/v1";

if (!API_BASE && typeof window !== "undefined") {
  // Tidak melempar error agar halaman tetap bisa dibuka,
  // tetapi developer mendapat peringatan di console.
  // Konfigurasi yang benar harus di-set dalam environment.
  console.warn("NEXT_PUBLIC_PINS_API_URL belum dikonfigurasi. Menggunakan default api-pins.dpupkp.my.id.");
}

export async function getPinsApiHealth() {
  const res = await fetch(`${API_BASE}/health`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`PINS API health check failed: ${res.status}`);
  }
  return res.json();
}
