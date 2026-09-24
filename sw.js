/* Suite service worker.

   The point is the stadium: bad signal, a page that still opens. Three rules:

   1. The shell - this page, its CSS and JS, the manifest, icons and fonts -
      is served from cache the instant it is asked for, then refreshed in the
      background. An update shows up on the next open.
      Since 7B the shell is in two halves: the part that belongs to no team,
      precached at install, and the part that belongs to THIS team, which the
      worker cannot know at install time and is told by the page instead.
   2. Data - the JSON files the Action commits, ESPN, Kalshi, Open-Meteo - is
      fetched live, and the last good copy is kept. Offline, that copy comes
      back with an X-IW-Cached header so the page can say the data is old.
   3. Anything else passes straight through.

   Bump VERSION whenever the shell changes shape enough that an old cached
   copy must not linger; the activate step throws away every other cache. */

var VERSION = "suite-2026-09-24q";
var SHELL   = VERSION + "-shell";
var DATA    = VERSION + "-data";

// The half of the shell that belongs to no team. A worker has no TEAM_CONFIG
// and no localStorage, so it cannot know which team this browser chose; what
// it can do is precache everything that is the same whichever team is showing
// - and nothing that is not.
var SHELL_FILES = [
  "./", "./index.html", "./app.css", "./legacy.css", "./app.js", "./chooser.js",
  "./suite/ui.js", "./suite/nav.js", "./suite/schedule.js", "./suite/home.js", "./suite/game.js", "./suite/top25.js",
  "./teams/index.js",
  "./teamos/registry.js", "./teamos/team.js", "./teamos/snapshots.js", "./teamos/identity.js",
  "./teamos/live.js", "./teamos/season.js", "./teamos/espn.js",
  "./teamos/game.js", "./teamos/outlook.js", "./teamos/freshness.js", "./teamos/weather.js",
  // Suite's install identity, the same for every team (decision 0024 §11).
  // The manifest's own icons are read from it at install; these are the ones
  // only index.html names. tools/identitycheck.js keeps the two lists equal.
  "./manifest.json",
  "./assets/suite/TEMPORARY-favicon-32.png", "./assets/suite/TEMPORARY-favicon-64.png",
  "./assets/suite/TEMPORARY-apple-touch-180.png"
];

// Where the worker records which team it has cached, inside the shell cache.
var TEAM_MARK = "./__team";

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
  e.waitUntil(addAll(SHELL, SHELL_FILES)
    .then(function () { return cacheManifestIcons("./manifest.json"); })
    .then(function () { return self.skipWaiting(); }));
});

/* ---- the team, told to the worker by the page ----------------------------

   The page knows which team it is; the worker does not. So after identity is
   applied, the page posts this team's own files: its config and the snapshot
   files the Action commits for it. (Its manifest and artwork used to be in
   that list; since decision 0024 they are Suite's and precached above.) The worker
   caches those and records whose they are.

   Switching teams has to undo the last one. Without that, the data cache
   keeps the previous team's depth chart and odds and serves them, offline, to
   a team that declares no snapshots at all - which is exactly the ownership
   rule decision 0008 exists to enforce. So a message naming a DIFFERENT team
   empties the data cache first. The shared shell is left alone: it is the
   same for every team. */

function readMark() {
  return caches.open(SHELL)
    .then(function (c) { return c.match(TEAM_MARK); })
    .then(function (r) { return r ? r.json() : null; })
    .catch(function () { return null; });
}

function writeMark(mark) {
  return caches.open(SHELL).then(function (c) {
    return c.put(TEAM_MARK, new Response(JSON.stringify(mark),
      { headers: { "Content-Type": "application/json" } }));
  });
}

// The manifest names the install icons and the maskable one. Cache what it
// actually lists, so changing an icon in the manifest is enough and there is
// no second list of install artwork.
function cacheManifestIcons(manifestPath) {
  return caches.open(SHELL).then(function (c) {
    return c.match(manifestPath).then(function (r) {
      if (!r) return null;
      return r.json().catch(function () { return null; });
    }).then(function (m) {
      if (!m || !m.icons || !m.icons.length) return null;
      var base = manifestPath.replace(/[^/]*$/, "");      // icons are relative to the manifest
      return addAll(SHELL, m.icons
        .map(function (i) { return i && i.src; })
        .filter(function (src) { return typeof src === "string" && src && !/^https?:/i.test(src); })
        .map(function (src) { return base + src; }));
    });
  });
}

function adoptTeam(msg) {
  var id = msg && msg.team;
  if (typeof id !== "string" || !/^[a-z0-9-]+$/.test(id)) return Promise.resolve(false);
  var shell = (msg.shell || []).filter(function (f) { return typeof f === "string" && f; });
  var data  = (msg.data  || []).filter(function (f) { return typeof f === "string" && f; });

  return readMark().then(function (was) {
    // A different team than the one cached. Drop exactly what the PREVIOUS
    // team declared - not the whole data cache, because league-wide files and
    // provider responses in there belong to nobody and a fan who switches
    // teams should not lose the Top 25 odds they already had offline.
    var clear = Promise.resolve();
    if (was && was.team && was.team !== id && was.data && was.data.length) {
      clear = caches.open(DATA).then(function (c) {
        return Promise.all(was.data.map(function (f) {
          return c.delete(f).catch(function () {});
        }));
      });
    }
    return clear
      .then(function () { return Promise.all([addAll(SHELL, shell), addAll(DATA, data)]); })
      .then(function () { return writeMark({ team: id, data: data }); })
      .then(function () { return true; });
  });
}

self.addEventListener("message", function (e) {
  var msg = e.data;
  if (!msg || msg.type !== "team") return;
  var done = adoptTeam(msg);
  if (e.waitUntil) e.waitUntil(done);
  // Reply only to the port that asked, so the page can tell whether its team
  // is actually cached rather than assuming it.
  if (e.ports && e.ports[0]) {
    done.then(function (ok) { e.ports[0].postMessage({ ok: !!ok, team: msg.team }); },
              function ()   { e.ports[0].postMessage({ ok: false, team: msg.team }); });
  }
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
