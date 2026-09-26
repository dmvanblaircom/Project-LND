/* Suite service worker.

   The point is the stadium: bad signal, a page that still opens. Three rules:

   1. The shell - this page, its CSS and JS, the manifest, icons and fonts -
      is served from cache the instant it is asked for, then refreshed in the
      background. An update shows up on the next open.
      Since 7B the shell is in two halves: the part that belongs to no team,
      precached at install, and the part that belongs to THIS team, which the
      worker cannot know at install time and is told by the page instead.
   2. Data - the JSON files the Action commits, ESPN, Kalshi, Open-Meteo - is
      fetched live, and the last good copy is kept, stamped X-IW-Stored with
      when it was kept. Offline, that copy comes back with an X-IW-Cached
      header carrying that time, so the page can say the data is old and how
      old. (The stamp is ours because a cross-origin response's Date header
      is hidden from the worker unless the provider chooses to expose it.)
   3. Anything else passes straight through.

   Bump VERSION whenever the shell changes shape enough that an old cached
   copy must not linger; the activate step throws away every other cache.

   AN UPDATE. Rule 1 means the open that finds a new version has already
   drawn the old one. So a worker that replaces an older one reloads the
   windows it takes over, once, as soon as it is active - and makes that
   reload as fast as it can: the fan's team config and the render-blocking
   font stylesheet are precached with the shell, and the previous version's
   data and font files are carried over rather than thrown away, so the
   reloaded page draws from cache with no network wait. A first install
   reloads nothing: that page is already this version. */

var VERSION = "suite-2026-09-26f";
var SHELL   = VERSION + "-shell";
var DATA    = VERSION + "-data";

// The half of the shell that belongs to no team. A worker has no TEAM_CONFIG
// and no localStorage, so it cannot know which team this browser chose; what
// it can do is precache everything that is the same whichever team is showing
// - and nothing that is not.
var SHELL_FILES = [
  "./", "./index.html", "./app.css", "./app.js", "./chooser.js",
  "./suite/ui.js", "./suite/nav.js", "./suite/schedule.js", "./suite/home.js", "./suite/game.js", "./suite/top25.js", "./suite/roster.js", "./suite/more.js",
  "./teams/index.js",
  "./teamos/registry.js", "./teamos/team.js", "./teamos/snapshots.js", "./teamos/identity.js",
  "./teamos/live.js", "./teamos/season.js", "./teamos/espn.js",
  "./teamos/game.js", "./teamos/outlook.js", "./teamos/freshness.js", "./teamos/weather.js", "./teamos/roster.js", "./teamos/sources.js",
  // Suite's install identity, the same for every team (decision 0024 §11).
  // The manifest's own icons are read from it at install; these are the ones
  // only index.html names. tools/identitycheck.js keeps the two lists equal.
  "./manifest.json",
  "./assets/suite/favicon.svg", "./assets/suite/favicon-32.png", "./assets/suite/favicon-64.png",
  "./assets/suite/apple-touch-180.png",
  // the header's wordmark: part of the shell, so the header draws offline
  "./assets/suite/suite-wordmark-pearl.svg"
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
  // Take over as soon as installed; asked for up front so activation does
  // not wait on anything after the precache.
  self.skipWaiting();
  e.waitUntil(Promise.all([
    missing(SHELL, SHELL_FILES).then(function (files) { return addAll(SHELL, files); }).then(function () {
      return Promise.all([cacheManifestIcons("./manifest.json"), cacheFontSheets("./index.html")]);
    }),
    adoptPreviousTeam()
  ]));
});

// The shell files this version's cache does not hold yet. A second install
// of the same VERSION (the browser can start one) finds them all and fetches
// nothing; tools/versioncheck.js makes the same VERSION mean the same shell.
function missing(cacheName, files) {
  return caches.open(cacheName).then(function (c) {
    return Promise.all(files.map(function (f) {
      return c.match(f).then(function (hit) { return hit ? null : f; });
    }));
  }).then(function (list) { return list.filter(Boolean); });
}

// Older versions' caches, under either naming: what an update replaces.
function previousCaches() {
  return caches.keys().then(function (keys) {
    return keys.filter(function (k) { return /^(iw|suite)-20/.test(k) && k !== SHELL && k !== DATA; });
  });
}

// The team an older version was told about is still this browser's team:
// cache its config now, so the reload after the update needs no network to
// draw it. The page confirms the team (and its data files) once it runs.
function adoptPreviousTeam() {
  return previousCaches().then(function (old) {
    var shells = old.filter(function (k) { return /-shell$/.test(k); });
    return shells.reduce(function (found, k) {
      return found.then(function (mark) {
        if (mark) return mark;
        return caches.open(k).then(function (c) { return c.match(TEAM_MARK); })
          .then(function (r) { return r ? r.json() : null; }).catch(function () { return null; });
      });
    }, Promise.resolve(null));
  }).then(function (mark) {
    if (!mark || typeof mark.team !== "string" || !/^[a-z0-9-]+$/.test(mark.team)) return null;
    return addAll(SHELL, ["./teams/" + mark.team + ".js"]).then(function () {
      return writeMark({ team: mark.team, data: Array.isArray(mark.data) ? mark.data : [] });
    });
  }).catch(function () {});
}

// The stylesheets index.html loads from Google Fonts block the first paint.
// Cache the ones it names, read from the page itself so there is no second list.
function cacheFontSheets(pagePath) {
  return caches.open(SHELL).then(function (c) {
    return c.match(pagePath).then(function (r) { return r ? r.text() : ""; }).then(function (html) {
      var urls = [], re = /<link[^>]+href="(https:\/\/fonts\.googleapis\.com\/[^"]+)"[^>]*rel="stylesheet"|<link[^>]+rel="stylesheet"[^>]+href="(https:\/\/fonts\.googleapis\.com\/[^"]+)"/g, m;
      while ((m = re.exec(html))) urls.push((m[1] || m[2]).replace(/&amp;/g, "&"));
      return missing(SHELL, urls).then(function (files) { return addAll(SHELL, files); });
    });
  }).catch(function () {});
}

// An update keeps what the fan already had offline: the last good data, and
// font files (their URLs name their contents, so they are the same bytes).
function carryOver(old) {
  return Promise.all(old.map(function (k) {
    var into = /-data$/.test(k) ? DATA : /-shell$/.test(k) ? SHELL : null;
    if (!into) return null;
    return Promise.all([caches.open(k), caches.open(into)]).then(function (cs) {
      return cs[0].keys().then(function (reqs) {
        return Promise.all(reqs.map(function (req) {
          if (into === SHELL && !/^https:\/\/fonts\.gstatic\.com\//.test(req.url)) return null;
          return cs[1].match(req).then(function (have) {
            if (have) return null;                     // this version's copy wins
            return cs[0].match(req).then(function (r) { return r && cs[1].put(req, r); });
          });
        }));
      });
    });
  })).catch(function () {});
}

// Reload the windows this worker has just taken over from an older version,
// once it is fully active. Not sooner: the reload's requests wait for the
// activation to finish, and a navigation during it makes the browser compare
// sw.js with the OLD worker and install this version a second time.
function reloadWhenActive() {
  var me = self.registration && self.registration.active;
  if (me && me.state === "activating" && me.addEventListener) {
    me.addEventListener("statechange", function once() {
      if (me.state !== "activated") return;
      me.removeEventListener("statechange", once);
      reloadWindows();
    });
  } else {
    setTimeout(reloadWindows, 0);
  }
}
function reloadWindows() {
  return self.clients.matchAll({ type: "window" }).then(function (list) {
    return Promise.all(list.map(function (c) {
      return c.navigate ? c.navigate(c.url).catch(function () {}) : null;
    }));
  }).catch(function () {});
}

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
      return missing(SHELL, m.icons
        .map(function (i) { return i && i.src; })
        .filter(function (src) { return typeof src === "string" && src && !/^https?:/i.test(src); })
        .map(function (src) { return base + src; })).then(function (files) { return addAll(SHELL, files); });
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
  // The app's version, for About Suite and Feedback: the worker's own.
  if (msg && msg.type === "version") {
    if (e.ports && e.ports[0]) e.ports[0].postMessage({ version: VERSION });
    return;
  }
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
    // only this worker's own versioned caches, under either naming; the page
    // keeps its own store of final box scores under a different name
    previousCaches().then(function (old) {
      if (old.length) reloadWhenActive();
      return carryOver(old)
        .then(function () { return self.clients.claim(); })
        .then(function () { return Promise.all(old.map(function (k) { return caches.delete(k); })); });
    })
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
        // Google's font stylesheet varies on request headers the worker's
        // own precache fetch does not share with the page's <link>.
        return c.match(e.request, { ignoreSearch: true, ignoreVary: url.origin !== self.location.origin }).then(function (hit) {
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
          e.waitUntil(withHeader(res.clone(), "X-IW-Stored", new Date().toUTCString()).then(function (copy) {
            return caches.open(DATA).then(function (c) { return c.put(key, copy); });
          }).catch(function () {}));
        }
        return res;
      }).catch(function () {
        return caches.open(DATA).then(function (c) { return c.match(key); }).then(function (hit) {
          if (!hit) throw new Error("offline and nothing cached for " + key);
          // when it was kept; "unknown" rather than a made-up time
          return withHeader(hit, "X-IW-Cached",
            hit.headers.get("X-IW-Stored") || hit.headers.get("date") || "unknown");
        });
      })
    );
  }
});
