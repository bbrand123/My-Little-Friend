const CACHE_NAME = 'pet-care-buddy-v2';
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
    './manifest.json'
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
        )
    );
    self.clients.claim();
});

// Fetch — stale-while-revalidate: serve cached immediately, update in background
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cached) => {
            // Always fetch from network to update cache for next load
            const fetchPromise = fetch(event.request).then((response) => {
                if (response.ok && event.request.url.startsWith(self.location.origin)) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
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
                return new Response('', { status: 503, statusText: 'Service Unavailable' });
            });
        })
    );
});
