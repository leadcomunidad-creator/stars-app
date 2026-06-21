/* ══════════════════════════════════════════════
   S.T.A.R.S. · Service Worker v5
   Shell: Network-first (actualización automática)
   JSON dinámicos: Network-first (sin cache agresivo)
══════════════════════════════════════════════ */
const CACHE_NAME = 'stars-v5';
const SHELL_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.png',
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

// ACTIVATE — eliminar caches viejos y tomar control inmediato
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

  // Las funciones serverless reciben POST; no se deben guardar en cache.
  if (e.request.method !== 'GET') {
    e.respondWith(fetch(e.request));
    return;
  }

  // ── JSONs dinámicos → NETWORK FIRST ──
  if (
    url.pathname.startsWith('/devocionales/') ||
    url.pathname.startsWith('/estudios/')
  ) {
    e.respondWith(
      fetch(e.request.clone(), { cache: 'no-store' })
        .then(res => {
          const contentType = res.headers.get('content-type') || '';
          if (res && res.status === 200 && contentType.includes('application/json')) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() =>
          caches.match(e.request).then(cached =>
            cached || new Response(JSON.stringify({ error: 'offline' }), {
              headers: { 'Content-Type': 'application/json' }
            })
          )
        )
    );
    return;
  }

  // ── Shell (HTML, manifest, iconos, logo) → NETWORK FIRST con fallback ──
  // Siempre intenta red primero; si falla (offline) sirve cache
  e.respondWith(
    fetch(e.request.clone())
      .then(res => {
        if (res && res.status === 200 && res.type !== 'opaque') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// MENSAJE desde la app → forzar actualización
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
