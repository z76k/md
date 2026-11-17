/* Inkwyrm service worker.
   When you publish a new version, change VERSION below. Visitors then see an "update ready" banner. */
const VERSION = 'inkwyrm-v1.2.5';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-maskable.svg',
  './css/app.css',
  './css/editor.css',
  './css/preview.css',
  './js/util.js',
  './js/highlight.js',
  './js/math.js',
  './js/markdown.js',
  './js/mdline.js',
  './js/editor.js',
  './js/gutter.js',
  './js/vim.js',
  './js/store.js',
  './js/themes.js',
  './js/welcome.js',
  './js/app.js',
  './js/io.js',
  './js/commands.js',
  './js/settings.js',
  './js/gallery.js',
  './js/topbar.js',
  './js/pwa.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION).then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' }))))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => (k.startsWith('neon-notes-') || k.startsWith('inkwyrm-')) && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    // Share links live in the #hash, so every page load is the same index.html.
    e.respondWith(
      caches.open(VERSION).then((c) => c.match('./index.html'))
        .then((hit) => hit || fetch(req))
        .catch(() => caches.match('./index.html'))
    );
    return;
  }
  e.respondWith(
    caches.open(VERSION).then((c) =>
      c.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok && res.type === 'basic') c.put(req, res.clone());
        return res;
      }))
    )
  );
});
