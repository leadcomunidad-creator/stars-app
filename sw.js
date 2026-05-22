/* ══════════════════════════════════════════════
   S.T.A.R.S. · Service Worker v3
   Shell: Cache-first
   JSON dinámicos: Network-first (sin cache agresivo)
══════════════════════════════════════════════ */
const CACHE_NAME = 'stars-v3';
const SHELL_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// INSTALL — precache del shell
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(SHELL_FILES))
  );
});

// ACTIVATE — eliminar caches viejos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] Eliminando cache viejo:', k);
          return caches.delete(k);
        })
      ))
      .then(() => self.clients.claim())
  );
});

// FETCH
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // ── JSONs dinámicos → NETWORK FIRST, cache solo como fallback offline ──
  if (
    url.pathname.startsWith('/devocionales/') ||
    url.pathname.startsWith('/estudios/')
  ) {
    e.respondWith(
      fetch(e.request.clone(), { cache: 'no-store' })
        .then(res => {
          if (res && res.status === 200) {
            // Guardar copia fresca en cache (para offline)
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => {
          // Sin internet → servir desde cache si existe
          return caches.match(e.request).then(cached => {
            if (cached) return cached;
            // Respuesta vacía de emergencia
            return new Response(JSON.stringify({ error: 'offline' }), {
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }

  // ── Shell (HTML, manifest, iconos) → CACHE FIRST ──
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type !== 'opaque') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});
