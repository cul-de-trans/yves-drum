// Offline cache. Bump VERSION whenever any file changes so iPads pick up the update.
const VERSION = 'v1';
const FILES = [
  // Not 'index.html': Cloudflare Pages redirects it to './', and Safari
  // rejects redirected responses for page loads.
  './',
  'style.css',
  'manifest.json',
  'js/main.js',
  'js/audio.js',
  'js/kit.js',
  'js/follow.js',
  'js/patterns.js',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  ...['kick', 'snare', 'hihat', 'tom1', 'tom2', 'floor', 'ride', 'crash'].map((s) => `sounds/${s}.wav`),
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request)));
});
