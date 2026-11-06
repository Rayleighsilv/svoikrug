/* SvoiKrug: офлайн-оболочка PWA.
 * Стратегия network-first: в сети всегда отдаём свежий ответ и обновляем кэш,
 * без сети — последний удачный. API-запросы не кэшируем (там cookie-сессия).
 */
const CACHE_NAME = 'svoikrug-shell-v1'
const CORE_ASSETS = ['/', '/manifest.webmanifest', '/icons/icon-192.png']

// Кладём в кэш не только HTML главной, но и чанки, на которые она ссылается:
// иначе после первого визита офлайн-оболочка останется без JS.
async function precacheShell(cache) {
  await cache.addAll(CORE_ASSETS)
  const home = await cache.match('/')
  if (!home) return

  const html = await home.text()
  const urls = new Set()
  const pattern = /(?:src|href)="(\/_next\/[^"]+)"/g
  let match = pattern.exec(html)
  while (match) {
    urls.add(match[1])
    match = pattern.exec(html)
  }

  await Promise.all(Array.from(urls, (url) => cache.add(url).catch(() => undefined)))
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => precacheShell(cache))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  )
})

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(CACHE_NAME)
  try {
    const response = await fetch(request)
    if (response && response.ok) {
      cache.put(request, response.clone()).catch(() => undefined)
    }
    return response
  } catch {
    const cached = await cache.match(request)
    if (cached) return cached
    if (fallbackUrl) {
      const fallback = await cache.match(fallbackUrl)
      if (fallback) return fallback
    }
    return new Response('Нет подключения к сети', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // API и загруженные пользователями файлы не кэшируем: ответы зависят от сессии.
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, '/'))
    return
  }

  if (
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(networkFirst(request))
  }
})
