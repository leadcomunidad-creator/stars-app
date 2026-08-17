/* ══════════════════════════════════════════════
   S · T · A · R · S · Service Worker v34
   Activación inmediata y actualización al abrir o retomar la PWA
   JSON dinámicos: Network-first sin caché agresivo
══════════════════════════════════════════════ */
const SW_VERSION = 'stars-v34';
const CACHE_NAME = SW_VERSION;
const SHELL_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo-v2.png',
  '/logo-stars-lockup-crop.png',
  '/icons/stars-favicon-v2.png',
  '/icons/apple-touch-icon-v2.png',
  '/icons/icon-192-v2.png',
  '/icons/icon-512-v2.png',
  '/icons/icon-maskable-192-v2.png',
  '/icons/icon-maskable-512-v2.png'
];

// INSTALL — precache del shell. La app decide cuándo es seguro activar.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_FILES))
  );
});

// ACTIVATE — eliminar cachés anteriores y tomar control de todas las ventanas.
self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(key => key.startsWith('stars-') && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
      await self.clients.claim();
      const clients = await self.clients.matchAll({ type:'window', includeUncontrolled:true });
      clients.forEach(client => client.postMessage({ type:'STARS_SW_ACTIVATED', version:SW_VERSION }));
    })()
  );
});

// FETCH
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Ignorar solicitudes internas de extensiones y otros esquemas no HTTP(S).
  if(url.protocol !== 'http:' && url.protocol !== 'https:'){
    return;
  }

  // Las funciones serverless reciben POST; nunca se guardan en caché.
  if(event.request.method !== 'GET'){
    event.respondWith(fetch(event.request));
    return;
  }

  // JSON dinámicos → NETWORK FIRST.
  if(
    url.pathname.startsWith('/devocionales/') ||
    url.pathname.startsWith('/estudios/')
  ){
    event.respondWith(
      fetch(event.request.clone(), { cache: 'no-store' })
        .then(response => {
          const contentType = response.headers.get('content-type') || '';
          if(response.status === 200 && contentType.includes('application/json')){
            const clone = response.clone();
            event.waitUntil(
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
            );
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          return cached || new Response(JSON.stringify({ error: 'offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // Shell → NETWORK FIRST y sin reutilizar la caché HTTP del navegador.
  event.respondWith(
    fetch(event.request.clone(), { cache: 'no-store' })
      .then(response => {
        if(response.status === 200 && response.type !== 'opaque'){
          const clone = response.clone();
          event.waitUntil(
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
          );
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if(cached) return cached;

        if(event.request.mode === 'navigate'){
          return caches.match('/index.html');
        }
        return Response.error();
      })
  );
});

// Mensaje desde la app → activar inmediatamente un worker en espera.
self.addEventListener('message', event => {
  const data = event.data;
  if(data === 'SKIP_WAITING' || data?.type === 'SKIP_WAITING'){
    event.waitUntil(self.skipWaiting());
    return;
  }
  if(data?.type === 'GET_VERSION' && event.source){
    event.source.postMessage({ type:'STARS_SW_VERSION', version:SW_VERSION });
  }
});
