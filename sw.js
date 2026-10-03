// Offline shell cache. Bump CACHE after every index.html update.
const CACHE = 'jarvis-os-v3';
const SHELL = ['./', 'index.html'];
const CDN = ['https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
             'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(async c => {
    await c.addAll(SHELL);
    await Promise.all(CDN.map(u => c.add(new Request(u, { mode: 'no-cors' })).catch(() => {})));
  }).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Same-origin shell and Firebase CDN scripts: cache-first, refreshed in background.
// Gemini and Firestore API traffic is never intercepted.
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  const ok = r.method === 'GET' && (u.origin === location.origin || u.hostname === 'www.gstatic.com');
  if (!ok) return;
  e.respondWith(caches.match(r, { ignoreSearch: true }).then(hit => {
    const net = fetch(r).then(res => {
      if (res.ok || res.type === 'opaque') { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); }
      return res;
    }).catch(() => hit || caches.match('index.html'));
    return hit || net;
  }));
});
