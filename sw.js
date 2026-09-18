const CACHE_NAME = "pins-shell-v1";
const ASET_SHELL = [
  "index.html",
  "dashboard.html",
  "barang.html",
  "transaksi.html",
  "scan.html",
  "css/style.css",
  "js/api.js",
  "manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASET_SHELL))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (url.hostname.includes("api-pins")) return;

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
