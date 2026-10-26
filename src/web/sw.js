// Service Worker für Textline im Browser:
// - offline nutzbar: die Dateien der App liegen im Cache (online wird immer frisch geladen)
// - "cross-origin isolated": jede Antwort bekommt COOP/COEP, damit Python input() und Stopp kann
//   (SharedArrayBuffer) - ohne dass der Webserver dafür eingestellt werden muss.
const CACHE = 'textline-web-__VERSION__';
const FILES = ['./', 'index.html', 'app.js', 'style.css', 'py-worker.js'];
// Safari kennt "credentialless" nicht; dort require-corp (jsDelivr und PyPI liefern die nötigen Header)
const COEP = /Safari\//.test(navigator.userAgent) && !/Chrome\/|Chromium\/|Firefox\//.test(navigator.userAgent) ? 'require-corp' : 'credentialless';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('textline-web-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function isolate(res) {
  if (!res || res.type === 'opaque' || res.status === 0) return res;
  const headers = new Headers(res.headers);
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  headers.set('Cross-Origin-Embedder-Policy', COEP);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      }
      return isolate(res);
    } catch {
      const hit = (await caches.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' ? await caches.match('index.html') : null);
      return hit ? isolate(hit) : Response.error();
    }
  })());
});
