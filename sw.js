/* Qazir Travel — офлайн-режим (service worker).
   Страница: сначала сеть (чтобы сразу видеть обновления), без сети — сохранённая копия.
   Фото, иконки, шрифты: из кэша, а если их нет — из сети с сохранением.
   VERSION меняет build.sh при каждой сборке: так телефоны получают новую версию. */
const VERSION = "qz-64aaae9839";
const MEDIA = "qz-media";
const CORE = ["index.html", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== MEDIA).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (req.mode === "navigate") {
    e.respondWith(fetch(req)
      .then((r) => { if (r.ok) { const copy = r.clone(); caches.open(VERSION).then((c) => c.put("index.html", copy)); } return r; })
      .catch(() => caches.match("index.html")));
    return;
  }

  const same = url.origin === self.location.origin;
  const fonts = /^fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!same && !fonts) return; // остальное (курс валют, Wikimedia, Telegram) — напрямую

  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => {
    // CSS шрифтов Google приходит «непрозрачным» (opaque) — его тоже сохраняем, он маленький
    if (r.ok || (fonts && r.type === "opaque")) {
      const copy = r.clone();
      caches.open(same && !url.pathname.includes("/photos/") ? VERSION : MEDIA).then((c) => c.put(req, copy));
    }
    return r;
  })));
});
