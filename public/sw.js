const CACHE_VERSION = 'adaptive-tdee-tracker-v1'
const APP_SHELL = [
    './',
    './manifest.webmanifest',
    './icon.svg',
    './favicon.ico',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/maskable-icon-512.png',
    './icons/apple-touch-icon.png'
]

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_VERSION)
            .then((cache) => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    )
})

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys
                    .filter((key) => key !== CACHE_VERSION)
                    .map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    )
})

self.addEventListener('fetch', (event) => {
    const { request } = event

    if (request.method !== 'GET') {
        return
    }

    const requestUrl = new URL(request.url)
    const scopeUrl = new URL(self.registration.scope)

    if (requestUrl.origin !== scopeUrl.origin) {
        return
    }

    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const responseCopy = response.clone()
                    caches.open(CACHE_VERSION)
                        .then((cache) => cache.put('./', responseCopy))
                    return response
                })
                .catch(() => caches.match('./'))
        )
        return
    }

    event.respondWith(
        caches.match(request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse
                }

                return fetch(request).then((response) => {
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response
                    }

                    const responseCopy = response.clone()
                    caches.open(CACHE_VERSION)
                        .then((cache) => cache.put(request, responseCopy))
                    return response
                })
            })
    )
})
