/* Built for the current app bundle. APIs and player data never enter this cache. */
const SCOPE = self.registration.scope;
const PREFIX = 'hhh-' + new URL(SCOPE).pathname + '-';
const CACHE = PREFIX + '5cba0582ed20d336';
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const response = await fetch(new URL('precache.json', SCOPE), {cache:'reload'});
    if (!response.ok) throw new Error('Offline bundle unavailable');
    const paths = await response.json();
    await cache.addAll(paths.map(path => new Request(new URL(path, SCOPE), {cache:'reload'})));
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await Promise.all((await caches.keys()).filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== new URL(SCOPE).origin || !url.href.startsWith(SCOPE) || url.pathname.includes('/api/')) return;
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(SCOPE, response.clone());
        if (response.ok) return response;
        return (await cache.match(SCOPE)) || response;
      } catch (error) { const saved = await cache.match(SCOPE); if (saved) return saved; throw error; }
    })());
  } else if (/\.(?:js|css|woff2?|png|svg|webp)$/.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE), saved = await cache.match(request);
      if (saved) return saved;
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    })());
  }
});
