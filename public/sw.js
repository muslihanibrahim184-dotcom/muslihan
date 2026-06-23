// Service worker — uygulama kabuğunu önbelleğe alır, yeni sürümde kendini günceller.
const CACHE = "muslihan-v20";
const SHELL = ["/", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (e) => {
  if (e.data === "skipWaiting") self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase/dış istekleri dokunma

  // JS/CSS gibi statik dosyalar: önce ağ, başarısızsa önbellek (yeni sürüm hemen gelsin)
  if (url.pathname.startsWith("/_next/")) {
    e.respondWith(
      fetch(request).then((res) => {
        const copy = res.clone(); caches.open(CACHE).then((c) => c.put(request, copy)); return res;
      }).catch(() => caches.match(request))
    );
    return;
  }

  // Sayfa gezinmeleri: önce ağ, başarısızsa önbellek
  e.respondWith(
    fetch(request).then((res) => {
      const copy = res.clone(); caches.open(CACHE).then((c) => c.put(request, copy)); return res;
    }).catch(() => caches.match(request).then((r) => r || caches.match("/")))
  );
});
