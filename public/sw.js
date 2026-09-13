// Skills021 Progressive Web App Service Worker
const CACHE_NAME = 'skills021-cache-v1'

const PRECACHE_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/logo.png',
  '/logo-icon.png',
  '/logo-icon-transparent.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-192x192.png',
  '/pwa-maskable-512x512.png',
  '/apple-touch-icon.png',
  '/favicon.png',
]

// Install event - precache core shell & immediately activate
self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Pre-cache error (non-fatal):', err)
      })
    })
  )
})

// Activate event - cleanup stale caches & take control of clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    }).then(() => self.clients.claim())
  )
})

// Fetch event - handle navigation, static assets, and offline fallback
self.addEventListener('fetch', (event) => {
  const { request } = event

  // Only handle http/https GET requests
  if (request.method !== 'GET' || !request.url.startsWith('http')) {
    return
  }

  const url = new URL(request.url)

  // Skip caching for Supabase API, external streaming video, or auth endpoints
  if (
    url.hostname.includes('supabase.co') ||
    url.pathname.startsWith('/auth') ||
    url.hostname.includes('youtube.com') ||
    url.hostname.includes('vimeo.com')
  ) {
    return
  }

  // Handle SPA HTML navigations: Network first, fallback to cached '/'
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone))
          }
          return networkResponse
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request)
          if (cachedResponse) return cachedResponse
          const rootFallback = await caches.match('/')
          if (rootFallback) return rootFallback
          return new Response('Offline - Please check your internet connection', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
          })
        })
    )
    return
  }

  // Handle static assets (images, js, css, fonts): Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone))
          }
          return networkResponse
        })
        .catch(() => cachedResponse)

      return cachedResponse || fetchPromise
    })
  )
})

// Support postMessage for skip waiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
