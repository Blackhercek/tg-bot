/* Оболочка кэшируется, чтобы приложение открывалось в зале без связи.
   API никогда не кэшируется: данные идут только по сети, а их сохранность
   обеспечивает слой sync через localStorage. */
const CACHE = "fit-v1";
const SHELL = [
  "/app/", "/app/nutrition", "/app/tracker",
  "/static/js/vendor/react.js", "/static/js/vendor/react-dom.js",
  "/static/js/sync.js", "/static/js/nutrition.js", "/static/js/tracker.js",
  "/static/css/nutrition.css", "/static/css/tracker.css", "/static/css/base.css", "/static/css/fonts.css",
  "/static/icon.svg", "/manifest.webmanifest"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(SHELL.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function keep(req, res) {
  // Кэшируем только успешные ответы: редирект на /login кэшировать нельзя.
  if (res && res.status === 200 && res.type === "basic") {
    const copy = res.clone();
    caches.open(CACHE).then(c => c.put(req, copy));
  }
  return res;
}

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.pathname.startsWith("/api/")) return;          // только сеть
  if (url.origin !== location.origin) return;            // шрифты решает браузер

  if (url.pathname.startsWith("/static/")) {             // ассеты: кэш вперёд
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(r => keep(e.request, r)))
    );
    return;
  }
  e.respondWith(                                          // страницы: сеть вперёд
    fetch(e.request).then(r => keep(e.request, r)).catch(() => caches.match(e.request))
  );
});
