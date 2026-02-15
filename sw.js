// Update CACHE_VERSION on each deploy to bust stale caches
const CACHE_VERSION = 8;
const CACHE_NAME = `pet-care-buddy-v${CACHE_VERSION}`;
const ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './js/constants.js',
    './js/svg.js',
    './js/sound.js',
    './js/game.js',
    './js/ui.js',
    './js/minigames.js',
    './js/competition.js',
    './manifest.json',
    './icon-512.svg',
    './icon-512-maskable.svg',
    './icon-192.svg',
    './icon-192-maskable.svg',
    './apple-touch-icon.svg',
    './apple-touch-icon.png',
    './icon-192.png'
];

// Install — cache all core assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate — clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

// Fetch — stale-while-revalidate: serve cached immediately, update in background
self.addEventListener('fetch', (event) => {
    // Only handle GET requests (skip POST, etc.)
    if (event.request.method !== 'GET') return;
    event.respondWith(
        caches.match(event.request).then((cached) => {
            // Always fetch from network to update cache for next load
            const fetchPromise = fetch(event.request).then((response) => {
                if (response.ok && event.request.url.startsWith(self.location.origin)) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(async (cache) => {
                        // Only notify clients if the response actually changed
                        if (cached) {
                            try {
                                const oldBody = await cached.clone().text();
                                const newBody = await clone.clone().text();
                                if (oldBody !== newBody) {
                                    self.clients.matchAll({ type: 'window' }).then((clients) => {
                                        clients.forEach((client) => client.postMessage({ type: 'SW_UPDATED' }));
                                    });
                                }
                            } catch (_) { /* comparison failed, skip notification */ }
                        }
                        cache.put(event.request, clone);
                    }).catch(() => {});
                }
                return response;
            }).catch(() => null);

            // Return cached immediately if available, otherwise wait for network
            return cached || fetchPromise.then((response) => {
                if (response) return response;
                // Offline fallback
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
                // Return empty responses with correct content types for JS/CSS to avoid parse errors
                const url = event.request.url;
                if (url.endsWith('.js')) {
                    return new Response('/* offline */', { status: 503, headers: { 'Content-Type': 'application/javascript' } });
                }
                if (url.endsWith('.css')) {
                    return new Response('/* offline */', { status: 503, headers: { 'Content-Type': 'text/css' } });
                }
                return new Response('Service Unavailable', {
                    status: 503,
                    statusText: 'Service Unavailable',
                    headers: { 'Content-Type': 'text/plain' }
                });
            });
        })
    );
});
