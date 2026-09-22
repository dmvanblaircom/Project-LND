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

  function body(v) {
    return {
      text: function () { return Promise.resolve(String(v)); },
      json: function () { try { return Promise.resolve(JSON.parse(v)); }
                          catch (e) { return Promise.reject(e); } },
      ok: true, clone: function () { return body(v); }, headers: { get: function () { return null; } }
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
        return Promise.resolve(key in store[name] ? body(store[name][key]) : undefined);
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
      clients: { claim: function () { return Promise.resolve(); } }
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
  return { sandbox: sandbox, store: store, deleted: deleted, fetched: fetched, fire: fire,
           shell: function () { return Object.keys(store[sandbox.SHELL] || {}).sort(); },
           data:  function () { return Object.keys(store[sandbox.DATA]  || {}).sort(); } };
}

var ND = { type: "team", team: "notre-dame", manifest: "assets/notre-dame/manifest.json",
  shell: ["teams/notre-dame.js", "assets/notre-dame/manifest.json", "assets/notre-dame/favicon.svg"],
  data: ["depth.json", "depth-history.json", "odds-history.json", "news.json"] };
var OSU = { type: "team", team: "ohio-state", manifest: "assets/ohio-state/manifest.json",
  shell: ["teams/ohio-state.js", "assets/ohio-state/manifest.json"], data: [] };

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
  ok(!files.some(function (f) { return /assets\/[a-z-]+\//.test(f); }),
     "nor any team's artwork");
  ok(files.indexOf("./teams/index.js") !== -1, "the registry is, because it belongs to no team");
  ok(files.indexOf("./app.js") !== -1 && files.indexOf("./app.css") !== -1, "and the application itself");
  var data = (src.match(/var DATA_FILES/) || [])[0];
  ok(!data, "nothing team-owned is precached at install at all");
}

console.log("the page names its team");
w = boot();
w.fire("message", ND).then(function () {
  eq(w.shell().filter(function (f) { return /teams\/|assets\//.test(f); }),
     ["assets/notre-dame/favicon.svg", "assets/notre-dame/manifest.json", "teams/notre-dame.js"],
     "the team's own shell is cached");
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
  console.log(" a manifest's own icons are cached");
  var w4 = boot({ bodies: { "assets/notre-dame/manifest.json": JSON.stringify({
    icons: [{ src: "icon-192.png" }, { src: "icon-512.png" }, { src: "https://cdn.example/x.png" }] }) } });
  return w4.fire("message", ND).then(function () {
    var icons = w4.shell().filter(function (f) { return /icon-\d+\.png$/.test(f); }).sort();
    eq(icons, ["assets/notre-dame/icon-192.png", "assets/notre-dame/icon-512.png"],
       "resolved relative to the manifest, so adding one to a manifest is enough");
    ok(w4.fetched.every(function (u) { return !/^https:\/\/cdn\.example/.test(u); }),
       "an icon on another origin is left alone");
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
  process.exit(failures ? 1 : 0);
}).catch(function (e) {
  console.log("  FAIL threw: " + (e && e.stack || e));
  process.exit(1);
});
