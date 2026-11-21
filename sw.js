/* JM Digital — Service Worker
   • Shell aplikasi: precache + stale-while-revalidate (buka instan, update di latar belakang)
   • Font/CDN: cache saat pertama dipakai (jalan offline berikutnya)
   • Permintaan ke Google Apps Script TIDAK pernah di-cache (data selalu segar; offline ditangani app.js)
   Naikkan VERSI setiap rilis agar cache lama dibuang. */
const VERSI = 'jm-digital-v1';
const RUNTIME = 'jm-runtime-v1';
const SHELL = ['./', './index.html', './css/style.css', './js/config.js', './js/api.js', './js/ui.js', './js/app.js', './js/v-dashboard.js', './js/v-jamaah.js', './js/v-guru.js', './js/v-jadwal.js', './js/v-presensi.js', './js/v-kbm.js', './js/v-laporan.js', './js/v-akun.js', './manifest.json', './icons/icon-192.png', ];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSI).then(function (c) { return Promise.all(SHELL.map(function (u) { return c.add(u).catch(function () {}); })); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== VERSI && k !== RUNTIME; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('message', function (e) { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', function (e) {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  if (url.hostname.indexOf('script.google.com') > -1 || url.hostname.indexOf('googleusercontent.com') > -1 && url.pathname.indexOf('/macros/') > -1) return; // API: jangan di-cache
  const sameOrigin = url.origin === self.location.origin;
  const cacheName = sameOrigin ? VERSI : RUNTIME;
  if (!sameOrigin && !/(fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com|drive\.google\.com|lh3\.googleusercontent\.com)/.test(url.hostname)) return;
  e.respondWith(caches.open(cacheName).then(function (cache) {
    return cache.match(req, { ignoreSearch: sameOrigin }).then(function (hit) {
      const net = fetch(req).then(function (res) { if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()); return res; }).catch(function () { return hit || (req.mode === 'navigate' ? cache.match('./index.html') : Response.error()); });
      return hit || net;
    });
  }));
});
