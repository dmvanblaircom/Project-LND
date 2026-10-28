#!/usr/bin/env node
/* Does the service worker cache the right team, and forget the last one?

   The worker is the only place in the Suite that can serve a team's data to a
   different team. It has no TEAM_CONFIG and no localStorage, so it cannot know
   whose files it is holding - the page tells it, and everything after that is
   the worker's bookkeeping. Get it wrong and a fan who switches teams sees the
   previous team's depth chart offline, which is decision 0008's ownership rule
   broken in the one place a user cannot see it happening.

   sw.js is run here against a stubbed Cache API and fetch. Nothing is
   installed, nothing is downloaded; the stub records every put and delete, so
   the assertions read back exactly what the worker did.

   Usage:  node tools/swcheck.js
   Exit status is 1 if anything fails, so it can gate a push. */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");

var root = path.join(__dirname, "..");
function read(p) { return fs.readFileSync(path.join(root, p), "utf8"); }

var failures = 0;
function ok(cond, what) {
  if (cond) { console.log("  ok   " + what); return; }
  failures++; console.log("  FAIL " + what);
}
function eq(a, b, what) { ok(JSON.stringify(a) === JSON.stringify(b), what + " = " + JSON.stringify(b)); }

// ---- the worker's world, stubbed --------------------------------------
function boot(opts) {
  opts = opts || {};
  var store = {};                       // cacheName -> { key: body }
  var deleted = [];                     // [cacheName, key]
  var fetched = [];
  var missing = opts.missing || [];     // paths whose fetch fails

  var stamps = opts.stamps || {};       // key -> X-IW-Stored, for any cache
  function body(v, key) {
    return {
      text: function () { return Promise.resolve(String(v)); },
      json: function () { try { return Promise.resolve(JSON.parse(v)); }
                          catch (e) { return Promise.reject(e); } },
      blob: function () { return Promise.resolve(String(v)); },
      ok: true, clone: function () { return body(v, key); },
      headers: { get: function (n) { return /^x-iw-stored$/i.test(n) && key in stamps ? stamps[key] : null; } }
    };
  }
  function cache(name) {
    store[name] = store[name] || {};
    return {
      put: function (k, v) {
        var key = typeof k === "string" ? k : k.url;
        return Promise.resolve(v && v.text ? v.text() : "").then(function (t) { store[name][key] = t; });
      },
      match: function (k) {
        var key = typeof k === "string" ? k : k.url;
        return Promise.resolve(key in store[name] ? body(store[name][key], key) : undefined);
      },
      delete: function (k) {
        var key = typeof k === "string" ? k : k.url;
        deleted.push([name, key]);
        var had = key in store[name];
        delete store[name][key];
        return Promise.resolve(had);
      },
      keys: function () {
        return Promise.resolve(Object.keys(store[name]).map(function (u) { return { url: u }; }));
      }
    };
  }

  var listeners = {};
  var sandbox = {
    self: {
      location: { origin: "https://example.test" },
      addEventListener: function (ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); },
      skipWaiting: function () { return Promise.resolve(); },
      clients: { claim: function () { return Promise.resolve(); }, matchAll: function () { return Promise.resolve([]); } }
    },
    caches: {
      open: function (n) { return Promise.resolve(cache(n)); },
      keys: function () { return Promise.resolve(Object.keys(store)); },
      delete: function (n) { deleted.push([n, "*"]); delete store[n]; return Promise.resolve(true); }
    },
    fetch: function (req, init) {
      var url = typeof req === "string" ? req : req.url;
      fetched.push(url);
      if (opts.fetch) return opts.fetch(url, init);
      if (missing.indexOf(url) !== -1) return Promise.reject(new Error("404"));
      if (opts.bodies && url in opts.bodies) return Promise.resolve(body(opts.bodies[url]));
      return Promise.resolve(body("x"));
    },
    Request: function (r, o) { this.url = typeof r === "string" ? r : r.url; this.opts = o; },
    Response: function (b, o) { var self_ = body(b); self_.init = o; self_.cachedAt = o && o.headers && o.headers.values && o.headers.values["X-IW-Cached"]; return self_; },
    URL: URL,
    Headers: function () { var h = this; h.values = {}; this.set = function (n, v) { h.values[n] = v; }; },
    AbortController: AbortController,
    // A test can run the worker's clock faster than real time.
    setTimeout: function (fn, ms) { return setTimeout(fn, (ms || 0) / (opts.speed || 1)); },
    clearTimeout: clearTimeout,
    console: console
  };
  sandbox.self.self = sandbox.self;
  vm.runInNewContext(read("sw.js"), sandbox, { filename: "sw.js" });

  function fire(ev, data) {
    var waits = [];
    (listeners[ev] || []).forEach(function (fn) {
      fn({ data: data, waitUntil: function (p) { waits.push(p); }, ports: [] });
    });
    return Promise.all(waits);
  }
  // An install's outcome: what its waitUntil settled to.
  function settle(ev, data) {
    var waits = [];
    (listeners[ev] || []).forEach(function (fn) {
      fn({ data: data, waitUntil: function (p) { waits.push(p); }, ports: [] });
    });
    return Promise.all(waits);
  }
  return { sandbox: sandbox, store: store, deleted: deleted, fetched: fetched, fire: fire, listeners: listeners,
           installs: function () { return settle("install").then(function () { return "installed"; }, function (e) { return "failed: " + e.message; }); },
           shell: function () { return Object.keys(store[sandbox.SHELL] || {}).sort(); },
           data:  function () { return Object.keys(store[sandbox.DATA]  || {}).sort(); } };
}

// Team marks (David, 2026-10-27: logos slow to appear): ESPN keeps one for
// only hours; the worker keeps each it has fetched, across versions, and
// answers from that copy first.
function logoChecks() {
  console.log("team marks are kept, and answered from the kept copy");
  var w = boot(), inits = [];
  w.sandbox.fetch = (function (orig) { return function (req, init) { inits.push(req && req.opts); return orig(req, init); }; })(w.sandbox.fetch);
  var MARK = "https://a.espncdn.com/combiner/i?img=/i/teamlogos/ncaa/500/87.png&w=180&h=180";
  function get(url) {
    var answer = null;
    w.listeners.fetch.forEach(function (fn) {
      fn({ request: { method: "GET", url: url }, respondWith: function (p) { answer = p; }, waitUntil: function () {} });
    });
    return answer;
  }
  var first = get(MARK);
  ok(!!first, "a mark is the worker's to answer");
  return first.then(function () {
    return new Promise(function (r) { setTimeout(r, 0); });
  }).then(function () {
    ok(w.fetched.indexOf(MARK) !== -1 && inits[inits.length - 1] && inits[inits.length - 1].mode === "cors",
       "the first sight of it is fetched, as CORS (ESPN allows any origin), so the copy is not opaque");
    ok(MARK in (w.store["suite-logos"] || {}), "and kept, in a cache no version owns");
    var n = w.fetched.length;
    return get(MARK).then(function () { ok(w.fetched.length === n, "the next sight of it is the kept copy: no network at all"); });
  }).then(function () {
    return w.sandbox.previousCaches();
  }).then(function (old) {
    ok(old.indexOf("suite-logos") === -1, "an update's clean-up never takes the kept marks");
    ok(get("https://a.espncdn.com/i/teamlogos/ncaa/500-dark/87.png") && get("https://a.espncdn.com/combiner/i?img=/i/teamlogos/ncaa/500-dark/2426.png&w=180&h=180"),
       "the full 500 (Home's watermark) and the dark variants are marks too");
    ok(!get("https://a.espncdn.com/i/headshots/college-football/players/full/1.png") && !get("https://a.espncdn.com/combiner/i?img=/i/headshots/x.png"),
       "a player's headshot is not a mark");
    w.sandbox.LOGO_MAX = 2;
    return Promise.all(["1", "2", "3"].map(function (id) { return get("https://a.espncdn.com/combiner/i?img=/i/teamlogos/ncaa/500/9" + id + ".png&w=180&h=180"); }));
  }).then(function () {
    return new Promise(function (r) { setTimeout(r, 20); });
  }).then(function () {
    ok(Object.keys(w.store["suite-logos"]).length <= 2, "past LOGO_MAX the oldest go (" + Object.keys(w.store["suite-logos"]).length + " kept)");
    w.sandbox.fetch = function () { return Promise.reject(new Error("offline")); };
    var mark2 = "https://a.espncdn.com/combiner/i?img=/i/teamlogos/ncaa/500/93.png&w=180&h=180";
    return get(mark2).then(function (r) { ok(!!r && r.ok, "a kept mark answers offline"); });
  });
}

// A data request the network leaves hanging is answered from the last good
// copy after DATA_WAIT, and dropped (David, 2026-10-20): a worker busy with
// it held back an update's activation. With no copy, the network is waited on.
function dataWaitChecks() {
  console.log("a hung data request");
  var URLX = "https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard";
  function hang(log) {
    return function (url, init) {
      return new Promise(function (resolve, reject) {
        log.push("start");
        if (init && init.signal) init.signal.addEventListener("abort", function () { log.push("aborted"); reject(new Error("aborted")); });
        if (log.answerAfter != null) setTimeout(function () { resolve({ ok: true, status: 200, clone: function () { return this; },
          headers: { get: function () { return null; } }, blob: function () { return Promise.resolve("fresh"); }, text: function () { return Promise.resolve("fresh"); }, fresh: true }); }, log.answerAfter);
      });
    };
  }
  function ask(w) {
    var answer = null;
    w.listeners.fetch.forEach(function (fn) {
      fn({ request: { url: URLX, method: "GET" }, respondWith: function (p) { answer = p; }, waitUntil: function () {} });
    });
    return answer;
  }
  function after(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  var log1 = [], w1 = boot({ fetch: hang(log1), speed: 100 });   // 8 s -> 80 ms
  var log2 = [], w2 = boot({ fetch: hang(log2), speed: 100 });
  var log3 = [], w3 = boot({ fetch: hang(log3), speed: 100 });
  log2.answerAfter = 200;                                        // answers "at 20 s", nothing kept
  log3.answerAfter = 20;                                         // answers "at 2 s"
  var put = function (w) { return w.sandbox.caches.open(w.sandbox.DATA).then(function (c) { return c.put(URLX, { text: function () { return Promise.resolve("kept"); } }); }); };
  return Promise.all([put(w1), put(w3)]).then(function () {
    ok(typeof w1.sandbox.DATA_WAIT === "number" && w1.sandbox.DATA_WAIT === 8000, "the wait is 8 seconds");
    var a1 = ask(w1), a2 = ask(w2), a3 = ask(w3), got1 = null, got2 = null, got3 = null;
    a1.then(function (r) { got1 = r; }); a2.then(function (r) { got2 = r; }); a3.then(function (r) { got3 = r; });
    return after(150).then(function () {
      ok(got1 && got1.cachedAt && log1.indexOf("aborted") > -1, "no answer by then: the kept copy, marked as one, and the request dropped");
      ok(got2 === null, "nothing kept: still waiting on the network, not failing");
      ok(got3 && got3.fresh && log3.indexOf("aborted") === -1, "a network that answers in time is the answer, never aborted");
      return after(150);
    }).then(function () {
      ok(got2 && got2.fresh, "and the slow network's answer arrives when it comes");
    });
  });
}

// Game alerts (W19): a push is shown as the edge API wrote it, and a tap
// opens Suite - only ever a Suite page, whatever the push says.
function alertsChecks() {
  console.log("game alerts");
  var w = boot(), shown = [], opened = [], focused = [];
  w.sandbox.self.registration = { scope: "https://example.test/Project-LND/",
    showNotification: function (t, o) { shown.push([t, o]); return Promise.resolve(); } };
  w.sandbox.self.clients.openWindow = function (u) { opened.push(u); return Promise.resolve(null); };
  function fireWith(ev, e) {
    var waits = [];
    e.waitUntil = function (p) { waits.push(p); };
    (w.listeners[ev] || []).forEach(function (fn) { fn(e); });
    return Promise.all(waits);
  }
  var msg = { title: "Ohio State", body: "Ohio State at Iowa has kicked off.", url: "https://example.test/Project-LND/#game", tag: "401858473-kickoff" };
  return fireWith("push", { data: { json: function () { return msg; }, text: function () { return JSON.stringify(msg); } } }).then(function () {
    eq([shown.length, shown[0] && shown[0][0], shown[0] && shown[0][1].body, shown[0] && shown[0][1].tag],
       [1, "Ohio State", "Ohio State at Iowa has kicked off.", "401858473-kickoff"], "a push is shown as sent, once, tagged by game and event");
    var closed = false;
    return fireWith("notificationclick", { notification: { data: { url: msg.url }, close: function () { closed = true; } } }).then(function () {
      ok(closed && opened[0] === msg.url, "a tap closes it and opens Suite at the game");
    }).then(function () {
      // A kickoff time arrives as ISO; the phone writes it in its own zone (decision 0022).
      shown.length = 0;
      var ko = { title: "Ohio State at Indiana", body: "Kickoff time set.", kickoff: "2026-10-17T16:00:00.000Z", network: "FOX", tag: "401858484-time" };
      return fireWith("push", { data: { json: function () { return ko; }, text: function () { return JSON.stringify(ko); } } });
    }).then(function () {
      var want = new Date("2026-10-17T16:00:00.000Z").toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
      eq([shown[0] && shown[0][0], shown[0] && shown[0][1].body], ["Ohio State at Indiana: " + want + " on FOX", "Kickoff time set."],
         "a kickoff time is written in this device's own time zone, with its network");
      shown.length = 0;
      var bad = { title: "Ohio State at Indiana", body: "Kickoff time set.", kickoff: "soon" };
      return fireWith("push", { data: { json: function () { return bad; }, text: function () { return JSON.stringify(bad); } } });
    }).then(function () {
      eq(shown[0] && shown[0][0], "Ohio State at Indiana", "an unreadable time: the title as sent, no time made up");
      opened.length = 0;
      return fireWith("notificationclick", { notification: { data: { url: msg.url }, close: function () { closed = true; } } });
    }).then(function () {
      ok(closed && opened[0] === msg.url, "a tap closes it and opens Suite at the game");
    });
  }).then(function () {
    opened.length = 0;
    return fireWith("notificationclick", { notification: { data: { url: "https://evil.example/" }, close: function () {} } });
  }).then(function () {
    ok(opened[0] === "https://example.test/Project-LND/", "a push pointing anywhere else opens Suite's front page instead");
    var win = { url: "https://example.test/Project-LND/#home", focus: function () { focused.push(this.url); return Promise.resolve(this); },
                navigate: function (u) { this.url = u; return Promise.resolve(this); } };
    w.sandbox.self.clients.matchAll = function () { return Promise.resolve([win]); };
    opened.length = 0;
    return fireWith("notificationclick", { notification: { data: { url: msg.url }, close: function () {} } });
  }).then(function () {
    ok(opened.length === 0 && focused[0] === msg.url, "with Suite already open: that window goes to the game, no second window");
    shown.length = 0;
    return fireWith("push", { data: null });
  }).then(function () {
    ok(shown.length === 1 && shown[0][0] === "Suite", "an empty push still shows (browsers require it), titled Suite");
  }).then(function () {
    // The 1,000th win (David, 2026-10-25): the page tells this worker which
    // game makes it; that game's final adds the line, a win only.
    return w.fire("message", { type: "milestone", game: "401859185", line: "Notre Dame\u2019s 1,000th win." });
  }).then(function () {
    function push(m) { return fireWith("push", { data: { json: function () { return m; }, text: function () { return JSON.stringify(m); } } }); }
    var fin = function (tag, won) { return { title: "Final: Notre Dame 34, Navy 17", body: "Notre Dame wins.", tag: tag, won: won }; };
    shown.length = 0;
    return push(fin("401859185-final", true))
      .then(function () { return push(fin("401859185-final", false)); })
      .then(function () { return push(fin("401858291-final", true)); })
      .then(function () { return push({ title: "Notre Dame scores", body: "Touchdown.", tag: "401859185-live", won: true }); })
      .then(function () { return push({ title: "Final: Notre Dame 34, Navy 17", body: "Notre Dame wins.", tag: "401859185-final" }); })
      .then(function () {
        eq(shown.map(function (s) { return s[1].body; }), ["Notre Dame wins. Notre Dame\u2019s 1,000th win.", "Notre Dame wins.", "Notre Dame wins.", "Touchdown.", "Notre Dame wins."],
           "the final of the game that makes it, won, says the 1,000th win; a loss, another game, a score and an older alert server's final do not");
        // an update in between: the next version's worker clears the old
        // versions' caches, and keeps this
        w.store["suite-2000-01-01a-shell"] = {};
        return w.fire("activate").then(function () {
          ok(!w.store["suite-2000-01-01a-shell"] && w.store["suite-milestone"] && w.store["suite-milestone"]["./__milestone"] &&
             !w.deleted.some(function (d) { return d[0] === "suite-milestone"; }), "an update clears the old versions' caches and keeps it");
          return w.fire("message", { type: "milestone", game: null, line: null });
        });
      })
      .then(function () { shown.length = 0; return push(fin("401859185-final", true)); })
      .then(function () { eq(shown[0] && shown[0][1].body, "Notre Dame wins.", "told there is none: the final is as sent"); });
  });
}

// What the page sends since decision 0024: a team's own shell is its config.
// The manifest and install icons are Suite's, precached at install.
var ND = { type: "team", team: "notre-dame", shell: ["teams/notre-dame.js"],
  data: ["depth.json", "depth-history.json", "odds-history.json", "news.json"] };
var OSU = { type: "team", team: "ohio-state", shell: ["teams/ohio-state.js"], data: [] };

console.log("install");
var w = boot();
return_install();
function return_install() {
  var src = read("sw.js");
  var list = (src.match(/var SHELL_FILES = \[([\s\S]*?)\];/) || [, ""])[1];
  var files = (list.match(/"[^"]+"/g) || []).map(function (s) { return s.replace(/"/g, ""); });
  ok(files.length > 0, "the worker precaches a shell");
  ok(!files.some(function (f) { return /teams\/(?!index)[a-z-]+\.js/.test(f); }),
     "and no team's config is in it - a worker cannot know which team this is");
  ok(!files.some(function (f) { return /assets\/(?!suite\/|fonts\/instrument-sans\/)[a-z-]+\//.test(f); }),
     "nor any team's artwork");
  ok(files.indexOf("./assets/fonts/instrument-sans/instrument-sans.woff2") !== -1 &&
     files.indexOf("./assets/fonts/instrument-sans/instrument-display.woff2") !== -1,
     "Suite's two local font faces are available offline");
  ok(files.indexOf("./manifest.json") !== -1,
     "the one Suite manifest is, because the installed product is the same for every team (decision 0024)");
  ok(files.indexOf("./teams/index.js") !== -1, "the registry is, because it belongs to no team");
  ok(files.indexOf("./app.js") !== -1 && files.indexOf("./app.css") !== -1, "and the application itself");
  ok(files.every(function (f) { return f === "./" || fs.existsSync(path.join(root, f)); }),
     "every file it names exists - the install fails without all of them");
  var data = (src.match(/var DATA_FILES/) || [])[0];
  ok(!data, "nothing team-owned is precached at install at all");
}

console.log("the page names its team");
w = boot();
w.fire("message", ND).then(function () {
  eq(w.shell().filter(function (f) { return /teams\/|assets\//.test(f); }),
     ["teams/notre-dame.js"],
     "the team's own shell is cached: its config, and no install identity of its own");
  eq(w.data(), ["depth-history.json", "depth.json", "news.json", "odds-history.json"],
     "and the snapshot files it declared");

  console.log(" switching teams forgets the last one");
  return w.fire("message", OSU);
}).then(function () {
  eq(w.data(), [], "Ohio State declares no snapshots, so nothing team-owned is left cached");
  var dropped = w.deleted.filter(function (d) { return d[0].endsWith("-data"); }).map(function (d) { return d[1]; }).sort();
  eq(dropped, ["depth-history.json", "depth.json", "news.json", "odds-history.json"],
     "exactly the previous team's declared files are deleted");
  ok(w.deleted.every(function (d) { return d[1] !== "*"; }),
     "the data cache is not emptied wholesale - league files and provider responses in it belong to nobody");
  eq(w.shell().indexOf("teams/notre-dame.js") !== -1, true,
     "the previous team's config stays in the shell, so switching back is instant");

  console.log(" and switching back restores it");
  return w.fire("message", ND);
}).then(function () {
  eq(w.data(), ["depth-history.json", "depth.json", "news.json", "odds-history.json"],
     "Notre Dame's snapshots are cached again");

  console.log(" the same team twice deletes nothing");
  var w2 = boot();
  return w2.fire("message", ND).then(function () { return w2.fire("message", ND); }).then(function () {
    eq(w2.deleted.filter(function (d) { return d[0].endsWith("-data"); }), [],
       "a repeat message for the same team is not a switch");
  });
}).then(function () {
  console.log(" league data survives a switch");
  // The reason the previous team's files are deleted by name rather than the
  // whole cache being dropped: a fan who switches teams should not lose the
  // Top 25 odds they already had offline.
  var w3 = boot();
  return w3.fire("message", ND).then(function () {
    w3.store[w3.sandbox.DATA]["odds-title.json"] = "league";   // cached at runtime, owned by nobody
    return w3.fire("message", OSU);
  }).then(function () {
    eq(w3.data(), ["odds-title.json"], "the league-wide file is still there after switching team");
  });
}).then(function () {
  console.log(" the Suite manifest's own icons are cached at install");
  var w4 = boot({ bodies: { "./manifest.json": JSON.stringify({
    icons: [{ src: "assets/suite/icon-192.png" }, { src: "assets/suite/icon-512.png" }, { src: "https://cdn.example/x.png" }] }) } });
  return w4.fire("install").then(function () {
    var icons = w4.shell().filter(function (f) { return /\/suite\/icon-\d+\.png$/.test(f); }).sort();
    eq(icons, ["./assets/suite/icon-192.png", "./assets/suite/icon-512.png"],
       "resolved relative to the manifest, so changing one in the manifest is enough");
    ok(w4.fetched.every(function (u) { return !/^https:\/\/cdn\.example/.test(u); }),
       "an icon on another origin is left alone");
  });
}).then(function () {
  // Code review, 2026-10-01: a flaky connection during an update used to
  // install half a shell, activate it, and delete the whole one it replaced.
  console.log("an install that cannot fetch the whole shell fails, so the working version stays");
  var w6 = boot({ missing: ["./app.js"] });
  return w6.installs().then(function (r) {
    ok(/^failed: .*\.\/app\.js/.test(r), "app.js unreachable: the install fails (" + r + ")");
    var w7 = boot({ missing: ["./assets/suite/icon-512.png"], bodies: { "./manifest.json": JSON.stringify({ icons: [{ src: "assets/suite/icon-512.png" }] }) } });
    return w7.installs();
  }).then(function (r) {
    eq(r, "installed", "an install icon that cannot be had now does not stop it");
    // Codex review of #69: the favicons index.html names are in the shell
    // list too, and are no more essential than the manifest's icons.
    return boot({ missing: ["./assets/suite/favicon-32.png", "./assets/suite/suite-wordmark-pearl.svg"] }).installs();
  }).then(function (r) {
    eq(r, "installed", "nor does a favicon or the wordmark image from the shell list");
  });
}).then(function () {
  // Code review, 2026-10-01: the page names its team on every open.
  console.log("the same team on every open downloads nothing again");
  var w8 = boot();
  return w8.fire("message", ND).then(function () {
    var before = w8.fetched.length;
    return w8.fire("message", ND).then(function () {
      eq(w8.fetched.slice(before), [], "the second open fetches nothing the worker already holds");
      delete w8.store[w8.sandbox.DATA]["news.json"];
      before = w8.fetched.length;
      return w8.fire("message", ND);
    }).then(function () {
      eq(w8.fetched.slice(before), ["news.json"], "and only what has gone missing after that");
    });
  });
}).then(function () {
  // Code review, 2026-10-01: every provider URL is kept, so the data cache
  // grew all season, carried from version to version.
  console.log("an update leaves old data behind");
  var day = 24 * 3600 * 1000, now = Date.now();
  var w9 = boot({ stamps: { "https://x/summary?event=1": new Date(now - 45 * day).toUTCString(),
                            "https://x/summary?event=2": new Date(now - 2 * day).toUTCString() } });
  w9.store["suite-2026-01-01a-data"] = { "https://x/summary?event=1": "old game", "https://x/summary?event=2": "last week", "https://x/unstamped": "?" };
  return w9.fire("activate").then(function () {
    eq(w9.data(), ["https://x/summary?event=2", "https://x/unstamped"],
       "kept 45 days ago: not carried into the new version; last week's, and one with no stamp to judge, are");
    ok(!("suite-2026-01-01a-data" in w9.store), "and the old version's cache is gone");
  });
}).then(function () {
  console.log(" a message that is not a team is ignored");
  var w5 = boot();
  return Promise.all([
    w5.fire("message", { type: "team", team: "../../etc" }),
    w5.fire("message", { type: "team", team: 42 }),
    w5.fire("message", { type: "something-else", team: "notre-dame" }),
    w5.fire("message", null)
  ]).then(function () {
    eq(w5.data(), [], "nothing is cached");
    eq(w5.deleted, [], "and nothing is deleted");
  });
}).then(function () {
  // The roster's address gained ?limit=200 (2026-10-11): the copy kept under
  // the old address still answers offline (Codex, #122).
  console.log(" a data copy kept before its address gained a limit");
  var ROSTER = "https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams/87/roster";
  var w6 = boot({ missing: [ROSTER + "?limit=200", "https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?limit=400"] });
  w6.store[w6.sandbox.DATA] = { [ROSTER]: "last week's roster" };
  function offline(url) {
    var answer = null;
    (w6.listeners.fetch || []).forEach(function (fn) {
      fn({ request: { url: url, method: "GET" }, respondWith: function (p) { answer = p; }, waitUntil: function () {} });
    });
    return answer.then(function (r) { return r.text(); }, function (e) { return "error: " + e.message; });
  }
  return Promise.all([offline(ROSTER + "?limit=200"), offline("https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?limit=400")]).then(function (got) {
    eq(got[0], "last week's roster", "the roster's new address, offline, answers with the copy kept under the old one");
    ok(/^error: offline and nothing cached/.test(got[1]), "an address with nothing kept under either form still says so");
  });
}).then(function () {
  console.log("\n" + (failures ? failures + " check(s) FAILED" : "the worker caches one team at a time"));
  return alertsChecks();
}).then(function () {
  return dataWaitChecks();
}).then(function () {
  return logoChecks();
}).then(function () {
  process.exit(failures ? 1 : 0);
}).catch(function (e) {
  console.log("  FAIL threw: " + (e && e.stack || e));
  process.exit(1);
});
