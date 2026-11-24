const CACHE = "weekplan-v267";
const FONTS = "weekplan-fonts";   // web fonts: kept across versions
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];
const EXTRAS = ["./icon-note.png", "./icon-habits.png", "./icon-timer.png", "./icon-today.png"];   // nice to have: a missing one must not stop an update
const NAV_WAIT = 3000;            // a page load waits this long for the network before it uses the saved copy

self.addEventListener("install", (e) => {
  // cache: "reload" → the files as they are on the server now, not a copy the browser kept for a few minutes
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: "reload" }))).then(() => Promise.all(EXTRAS.map((u) => c.add(new Request(u, { cache: "reload" })).catch(() => {}))))));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE && k !== FONTS).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);

  // Web fonts (Google): from the saved copy when there is one — so the app looks the same offline and never waits for them.
  // The style sheet is refreshed in the background; the font files themselves never change.
  if (url.origin === "https://fonts.googleapis.com" || url.origin === "https://fonts.gstatic.com") {
    e.respondWith(
      caches.open(FONTS).then((c) =>
        c.match(e.request.url).then((hit) => {
          const net = () => fetch(e.request).then((r) => { if (r.ok) c.put(e.request.url, r.clone()); return r; });
          if (!hit) return net();
          if (url.origin === "https://fonts.googleapis.com") e.waitUntil(net().catch(() => {}));
          return hit;
        })
      )
    );
    return;
  }
  if (url.origin !== location.origin) return; // never intercept Supabase / the calendar bridge

  if (e.request.mode === "navigate" || url.pathname.endsWith("index.html")) {
    // The page itself: from the network, so updates arrive — but only good answers are kept, and when the network fails, is slow
    // (more than 3 s: train wifi) or answers with an error page, the saved copy is used. A slow answer still updates the saved copy.
    e.respondWith(
      caches.open(CACHE).then((c) =>
        c.match("./index.html").then((saved) => {
          const net = fetch(e.request).then((r) => {
            if (r.ok) c.put("./index.html", r.clone());
            return r;
          });
          if (!saved) return net;
          e.waitUntil(net.catch(() => {}));
          let timer;
          const slow = new Promise((ok) => { timer = setTimeout(() => ok(saved), NAV_WAIT); });
          return Promise.race([net.then((r) => (r.ok ? r : saved), () => saved), slow]).then((r) => { clearTimeout(timer); return r; });
        })
      )
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(
        (r) =>
          r ||
          fetch(e.request).then((rs) => {
            if (rs.ok) { const copy = rs.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
            return rs;
          })
      )
    );
  }
});
