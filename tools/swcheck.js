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
    fetch: function (req) {
      var url = typeof req === "string" ? req : req.url;
      fetched.push(url);
      if (missing.indexOf(url) !== -1) return Promise.reject(new Error("404"));
      if (opts.bodies && url in opts.bodies) return Promise.resolve(body(opts.bodies[url]));
      return Promise.resolve(body("x"));
    },
    Request: function (r, o) { this.url = typeof r === "string" ? r : r.url; this.opts = o; },
    Response: function (b, o) { var self_ = body(b); self_.init = o; return self_; },
    URL: URL,
    setTimeout: setTimeout,
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
  console.log("\n" + (failures ? failures + " check(s) FAILED" : "the worker caches one team at a time"));
  return alertsChecks();
}).then(function () {
  process.exit(failures ? 1 : 0);
}).catch(function (e) {
  console.log("  FAIL threw: " + (e && e.stack || e));
  process.exit(1);
});
