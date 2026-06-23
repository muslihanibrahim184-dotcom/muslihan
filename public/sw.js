// Basit, güvenli service worker — uygulama kabuğunu önbelleğe alır.
const CACHE = "muslihan-v1";
const SHELL = ["/", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // Supabase API ve auth isteklerini ASLA önbelleğe alma
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/_next/static")) {
    e.respondWith(caches.match(request).then((r) => r || fetch(request).then((res) => {
      const copy = res.clone(); caches.open(CACHE).then((c) => c.put(request, copy)); return res;
    })));
    return;
  }
  // Sayfa gezinmelerinde: önce ağ, başarısızsa önbellek
  e.respondWith(
    fetch(request).then((res) => {
      const copy = res.clone(); caches.open(CACHE).then((c) => c.put(request, copy)); return res;
    }).catch(() => caches.match(request).then((r) => r || caches.match("/")))
  );
});
