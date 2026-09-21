/* Irish Watch service worker.

   The point is the stadium: bad signal, a page that still opens. Three rules:

   1. The shell - this page, its CSS and JS, the manifest, icons and fonts -
      is served from cache the instant it is asked for, then refreshed in the
      background. An update shows up on the next open.
   2. Data - the JSON files the Action commits, ESPN, Kalshi, Open-Meteo - is
      fetched live, and the last good copy is kept. Offline, that copy comes
      back with an X-IW-Cached header so the page can say the data is old.
   3. Anything else passes straight through.

   Bump VERSION whenever the shell changes shape enough that an old cached
   copy must not linger; the activate step throws away every other cache. */

var VERSION = "iw-2026-09-21c";
var SHELL   = VERSION + "-shell";
var DATA    = VERSION + "-data";

var SHELL_FILES = [
  "./", "./index.html", "./app.css", "./app.js", "./teams/notre-dame.js", "./teamos/team.js", "./teamos/snapshots.js", "./teamos/identity.js", "./teamos/live.js", "./teamos/season.js", "./teamos/espn.js",
  // Still the DEFAULT team's config and artwork. 7A made the page choose its
  // team at runtime, but a worker cannot read that choice at install time, so
  // a second team's shell is fetched on demand and cached then - fine online,
  // not yet offline on a first visit. Teaching the worker which team to
  // precache is 7B.
  "./assets/notre-dame/manifest.json",
  "./assets/notre-dame/favicon.svg", "./assets/notre-dame/favicon-32.png", "./assets/notre-dame/favicon-64.png",
  "./assets/notre-dame/icon-180.png", "./assets/notre-dame/icon-192.png"
];

// The files the Action commits. Seeded at install so the very first visit is
// covered too - fetches made before the worker takes control are not seen by
// it, so without this a phone that installs and then loses signal would have
// the page but no odds, depth chart or news.
var DATA_FILES = [
  "./odds-title.json", "./odds-playoff.json", "./odds-history.json",
  "./depth.json", "./depth-history.json", "./news.json"
];

// Revalidate with the server rather than trusting the browser's HTTP cache:
// GitHub Pages sends max-age=600, so a plain fetch here could seed a cache
// with a ten-minute-old app.js and pin it for the life of this version.
function fresh(req) {
  return new Request(req, { cache: "no-cache" });
}

function addAll(cacheName, files) {
  return caches.open(cacheName).then(function (c) {
    // one missing file must not stop the install
    return Promise.all(files.map(function (f) {
      return fetch(fresh(f)).then(function (res) {
        if (res && res.ok) return c.put(f, res);
      }).catch(function () {});
    }));
  });
}

self.addEventListener("install", function (e) {
  e.waitUntil(
    Promise.all([addAll(SHELL, SHELL_FILES), addAll(DATA, DATA_FILES)])
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        // only this worker's own versioned caches; the page keeps its own
        // store of final box scores under a different name
        if (k.indexOf("iw-20") === 0 && k !== SHELL && k !== DATA) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

function isShell(url) {
  if (url.origin === self.location.origin) {
    var p = url.pathname;
    return p.endsWith("/") || /\/index\.html$/.test(p) || /\/manifest\.json$/.test(p)
        || /\.(css|js|png|svg)$/.test(p);
  }
  return url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
}

function isData(url) {
  if (url.origin === self.location.origin) return /\.json$/.test(url.pathname) && !url.pathname.endsWith("/manifest.json");
  return /(^|\.)espn\.com$/.test(url.hostname)
      || /kalshi\.com$/.test(url.hostname)
      || /open-meteo\.com$/.test(url.hostname);
}

// The page busts its own cache with ?t=<now>. Strip that so the key is stable;
// leave every other query alone because ESPN's mean something.
function dataKey(url) {
  var u = new URL(url.href);
  u.searchParams.delete("t");
  return u.href;
}

function withHeader(res, name, value) {
  var h = new Headers(res.headers);
  h.set(name, value);
  return res.blob().then(function (b) {
    return new Response(b, { status: res.status, statusText: res.statusText, headers: h });
  });
}

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  var url;
  try { url = new URL(e.request.url); } catch (err) { return; }

  if (isShell(url)) {
    // stale-while-revalidate
    e.respondWith(
      caches.open(SHELL).then(function (c) {
        return c.match(e.request, { ignoreSearch: true }).then(function (hit) {
          var refresh = fetch(fresh(e.request)).then(function (res) {
            if (res && res.ok) c.put(e.request, res.clone());
            return res;
          }).catch(function () { return hit; });
          return hit || refresh;
        });
      })
    );
    return;
  }

  if (isData(url)) {
    // network-first, last good copy as the fallback
    var key = dataKey(url);
    e.respondWith(
      fetch(e.request).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(DATA).then(function (c) { c.put(key, copy); });
        }
        return res;
      }).catch(function () {
        return caches.open(DATA).then(function (c) { return c.match(key); }).then(function (hit) {
          if (!hit) throw new Error("offline and nothing cached for " + key);
          return withHeader(hit, "X-IW-Cached", hit.headers.get("date") || "1");
        });
      })
    );
  }
});
