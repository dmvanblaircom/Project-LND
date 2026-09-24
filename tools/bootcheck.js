#!/usr/bin/env node
/* Which team does the page decide it is, and what does it paint first?

   Phase 7A moved the team out of the markup and into a boot script in the
   head. That script is now the first thing that runs and the only thing that
   answers three questions: which team this page is, what colour it paints
   before any config has loaded, and which files it then loads. Getting any of
   them wrong is the 2026-09-21 bug in a new form - a page showing one team in
   another team's colours - so all three are checked here.

   The script is lifted out of index.html and run against a stubbed document,
   location and localStorage. No browser, no network. The stub records what the
   script wrote, so the assertions read back exactly what a browser would have.

   Usage:  node tools/bootcheck.js
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

var html = read("index.html").replace(/\r\n/g, "\n");
var BOOT = (html.match(/<script id="team-boot">([\s\S]*?)<\/script>/) || [])[1];
if (!BOOT) { console.log("  FAIL index.html has no boot script"); process.exit(1); }

// ---- the page, stubbed -------------------------------------------------
// Only what the boot script touches, and every write is recorded.
function run(opts) {
  opts = opts || {};
  var store = Object.assign({}, opts.storage || {});
  var pending = [];                     // script load/error callbacks, run after the script returns
  var applied = {}, injected = [], meta = { "theme-color": opts.staticTheme || "#0C2340" };
  var attrs = {}, doc;

  var rootStyle = {
    setProperty: function (k, v) { applied[k] = v; }
  };
  doc = {
    title: opts.staticTitle || "Suite",
    readyState: opts.readyState || "loading",
    documentElement: { style: rootStyle, setAttribute: function (k, v) { attrs[k] = v; } },
    head: { appendChild: function (el) {
      injected.push(el.src);
      // A config the repository does not have 404s. That is the mechanism
      // that replaced a hard-coded list of known teams. Both callbacks are
      // deferred, as a browser defers them - firing onerror inline would hide
      // exactly the ordering bug this is here to catch.
      var missing = opts.missing && opts.missing.indexOf(el.src) !== -1;
      if (missing && el.onerror) pending.push(el.onerror);
      if (!missing && el.onload) pending.push(el.onload);
    } },
    createElement: function () { return { src: null, async: true, onerror: null }; },
    querySelector: function (sel) {
      var m = /^meta\[name="([^"]+)"\]$/.exec(sel);
      if (!m || !(m[1] in meta)) return null;
      return { setAttribute: function (_, v) { meta[m[1]] = v; } };
    },
    addEventListener: function (ev, fn) { if (ev === "DOMContentLoaded") doc.__domReady = fn; }
  };

  var sandbox = {
    document: doc,
    location: { search: opts.search || "" },
    localStorage: {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem: function (k, v) {
        if (opts.storageThrows) throw new Error("blocked");
        store[k] = String(v);
      }
    },
    URLSearchParams: URLSearchParams,
    JSON: JSON
  };
  if (opts.storageThrows) {
    sandbox.localStorage.getItem = function () { throw new Error("blocked"); };
  }
  vm.runInNewContext(BOOT, sandbox, { filename: "team-boot" });
  // The order a browser would use: the parser finishes, then the network
  // results land. Both are drained until nothing new is queued.
  if (opts.domFirst !== false && doc.__domReady) doc.__domReady();
  for (var guard = 0; pending.length && guard < 50; guard++) pending.shift()();
  if (opts.domFirst === false && doc.__domReady) doc.__domReady();
  for (guard = 0; pending.length && guard < 50; guard++) pending.shift()();
  return { team: attrs["data-team"], attrs: attrs, applied: applied, injected: injected,
           meta: meta, title: doc.title, store: store };
}

// A stored set, the shape paintIdentity() writes.
var OSU = { "--t-accent": "#BA0C2F", "--t-surface": "#212325", "--t-deep": "#0B1115",
            title: "Ohio State · Suite", themeColor: "#0B1115" };
var ND = { "--t-accent": "#C99700", "--t-surface": "#0C2340", "--t-deep": "#07192F",
           title: "Notre Dame · Suite", themeColor: "#07192F" };
function saved(id, set) { var s = {}; s["iw-boot-" + id] = JSON.stringify(set); return s; }

console.log("which team");
eq(run({}).team, "", "nothing asked and nothing stored is NOT a reason to guess a team");
eq(run({}).attrs["data-choosing"], "", "it is its own state, and the page says so");
eq(run({}).injected.indexOf("app.js"), -1,
   "app.js is never loaded without a team - it reads TEAM_CONFIG as it parses");
ok(run({}).injected.indexOf("chooser.js") !== -1, "the chooser is loaded instead");
eq(run({}).injected.filter(function (s) { return /^teams\/[a-z-]+\.js$/.test(s); }),
   ["teams/index.js"], "and no team config is fetched, because none was chosen");
eq(run({}).store["iw-team"], undefined, "nothing is stored, so the next visit asks again");
eq(run({ search: "?team=ohio-state" }).team, "ohio-state", "?team= wins");
eq(run({ storage: { "iw-team": "ohio-state" } }).team, "ohio-state", "then the last choice this browser made");
eq(run({ search: "?team=notre-dame", storage: { "iw-team": "ohio-state" } }).team, "notre-dame",
   "?team= beats the stored choice, so a link can override it");
eq(run({ search: "?team=alabama" }).team, "alabama",
   "an id the boot script has never heard of is still taken - the registry has not loaded, so it cannot know");
eq(run({ search: "?team=../../etc/passwd" }).team, "", "but an id that is not an id is refused, and that is a choice not yet made");
eq(run({ search: "?team=Notre-Dame" }).team, "", "and so is one with capitals, because it becomes a file path");
eq(run({ search: "?team=" }).team, "", "an empty ?team= is not a team");

console.log(" but a chosen team goes straight through");
["?team=ohio-state", ""].forEach(function (q, i) {
  var r = run(q ? { search: q } : { storage: { "iw-team": "ohio-state" } });
  eq(r.team, "ohio-state", (i ? "a stored choice" : "a URL choice") + " skips the chooser");
  eq(r.attrs["data-choosing"], undefined, " and the page is not in choosing state");
  ok(r.injected.indexOf("chooser.js") === -1, " and the chooser is not loaded");
  ok(r.injected.indexOf("app.js") !== -1, " and app.js is");
});

console.log(" a team with no config falls back when its config 404s");
var gone = run({ search: "?team=alabama", missing: ["teams/alabama.js"] });
eq(gone.team, "notre-dame", "the page ends up on the default rather than an app with no team");
eq(gone.store["iw-team"], "notre-dame", "and the bad choice is not left stored to fail again tomorrow");
eq(gone.injected.filter(function (s) { return /^teams\/[a-z-]+\.js$/.test(s); }),
   ["teams/alabama.js", "teams/index.js", "teams/notre-dame.js"],
   "the default's config is loaded after the failure");
var stillND = run({ storage: { "iw-team": "notre-dame" }, missing: ["teams/notre-dame.js"] });
eq(stillND.team, "notre-dame", "the default failing has nowhere to fall back to, and does not loop");

console.log(" and it is remembered");
eq(run({ search: "?team=ohio-state" }).store["iw-team"], "ohio-state", "the choice is stored");
eq(run({ search: "?team=alabama" }).store["iw-team"], "alabama",
   "an id is stored as asked - nothing here knows yet whether it has a config");
eq(run({ storage: { "iw-boot-notre-dame": "{}" } }).team, "",
   "colours left over from a team is not a choice of that team");

console.log("what it paints before anything loads");
var cold = run({ search: "?team=ohio-state" });
eq(cold.applied, {}, "nothing stored for this team -> no tokens, so app.css's neutral :root stands");
eq(cold.meta["theme-color"], "#0C0F13",
   "and the browser chrome is pointed at that same neutral, not the default team's colour");

var warm = run({ search: "?team=ohio-state", storage: saved("ohio-state", OSU) });
eq(warm.applied["--t-accent"], "#BA0C2F", "a stored set paints the team before a single file is fetched");
eq(warm.applied["--t-deep"], "#0B1115", "including the canvas the iOS bars are taken from");
eq(warm.meta["theme-color"], "#0B1115", "and the chrome matches the header under it");
eq(warm.title, "Ohio State · Suite", "and the tab names the program inside Suite (decision 0024)");
var legacyTitle = run({ search: "?team=ohio-state", storage: saved("ohio-state",
  Object.assign({}, OSU, { title: "Buckeye Watch · Ohio State Football" })) });
eq(legacyTitle.title, "Suite",
   "a title stored before decision 0024, naming a team product, is not replayed");

console.log(" one team is never painted in another's colours");
// The whole reason the set is keyed by team. Ohio State's colours are on this
// browser; the page being opened is Notre Dame's.
var cross = run({ search: "?team=notre-dame", storage: saved("ohio-state", OSU) });
eq(cross.applied, {}, "Ohio State's stored set is not replayed onto Notre Dame");
eq(cross.title, "Suite", "nor its title");
eq(cross.meta["theme-color"], "#0C0F13", "the chrome goes neutral instead of borrowing it");
var both = run({ search: "?team=notre-dame", storage: Object.assign(saved("ohio-state", OSU), saved("notre-dame", ND)) });
eq(both.applied["--t-accent"], "#C99700", "with both stored, each team gets its own");

console.log(" a stored set is data, not instructions");
var nasty = run({ search: "?team=notre-dame", storage: saved("notre-dame", {
  "--t-accent": "#C99700",
  "--t-evil": "red; } body { display:none } .x {",   // CSS punctuation
  "--t-img": "url(https://example.com/x.png)",        // a fetch
  "--NOT-A-TOKEN": "#fff",                            // wrong shape
  "--t-num": 42,                                      // not a string
  title: "Irish Watch", themeColor: "javascript:alert(1)"
}) });
eq(Object.keys(nasty.applied).sort(), ["--t-accent"], "only a well-formed token with a clean value is applied");
eq(nasty.meta["theme-color"], "#0C0F13",
   "a theme colour that is not a hex colour is refused, and does not leave the default team's behind");
var surfOnly = run({ search: "?team=ohio-state", storage: saved("ohio-state",
  { "--t-deep": "#0B1115", themeColor: "not-a-colour" }) });
eq(surfOnly.meta["theme-color"], "#0B1115", "it falls back to the header colour actually applied");
eq(run({}).meta["theme-color"], "#0B1F3A", "the chooser's chrome is the Suite's own header, not a team's");
eq(run({ storage: { "iw-boot-notre-dame": "{not json" } }).applied, {}, "unparseable storage is ignored, not thrown on");
eq(run({ storage: { "iw-boot-notre-dame": "\"a string\"" } }).applied, {}, "and so is storage of the wrong type");

console.log(" storage can be unavailable");
var blocked = run({ storageThrows: true });
eq(blocked.team, "", "with storage blocked and no URL there is no choice to read, so the chooser");
eq(blocked.applied, {}, "and it paints the neutral");
var blockedUrl = run({ storageThrows: true, search: "?team=ohio-state" });
eq(blockedUrl.team, "ohio-state", "but a URL still works without storage - it needs nothing remembered");
eq(blockedUrl.applied, {}, "with no stored colours to replay, so the neutral again");

console.log(" changing team keeps the current one (decision 0022 #7)");
var change = run({ search: "?change", storage: { "iw-team": "notre-dame" } });
eq(change.team, "", "?change shows the chooser even though a team is stored");
eq(change.attrs["data-current-team"], "notre-dame", "and names the current team, so the chooser can offer Cancel back to it");
eq(change.store["iw-team"], "notre-dame", "the stored team is untouched until another is actually picked");
ok(change.injected.indexOf("chooser.js") !== -1 && change.injected.indexOf("app.js") === -1,
   "the chooser loads, the Suite does not");
ok(change.injected.every(function (src) { return !/^teams\/(?!index)/.test(src); }), "and no team's config is fetched");
var first = run({ search: "?change" });
eq(first.attrs["data-current-team"], undefined, "with nothing stored there is no current team, so no Cancel - that is onboarding");
var both = run({ search: "?team=ohio-state&change", storage: { "iw-team": "notre-dame" } });
eq(both.team, "ohio-state", "a URL that names a team opens it; ?change does not override an explicit choice");

console.log("what it loads");
var order = run({ search: "?team=ohio-state" }).injected;
eq(order[0], "teams/ohio-state.js", "the team's config first - app.js reads it at parse time");
eq(order[order.length - 1], "app.js", "and app.js last");
eq(order, ["teams/ohio-state.js", "teams/index.js", "teamos/registry.js", "teamos/team.js",
           "teamos/snapshots.js", "teamos/identity.js", "teamos/live.js", "teamos/season.js",
           "teamos/espn.js", "suite/ui.js", "suite/nav.js", "app.js"],
   "every file the page needs, in dependency order");
ok(/async\s*=\s*false/.test(BOOT), "injected with async=false, which is what keeps them in order");
ok(/DOMContentLoaded/.test(BOOT),
   "app.js waits for a DOM, because it reads one as it runs (app.js:~1827)");
// If app.js were injected with the rest it could run before <body> is parsed
// and querySelectorAll would come back empty. Prove it is held back.
var early = run({ readyState: "loading", search: "?team=ohio-state" });
ok(early.injected.indexOf("app.js") === early.injected.length - 1, "and is still last when it arrives");

console.log(" app.js waits for the team config, not just the DOM");
// The bug this was written for: a 404 on the team config is reported
// asynchronously, so the fallback config is injected LATER than everything
// else. If app.js went in at DOMContentLoaded it could parse before
// TEAM_CONFIG existed and throw. It waits for both, in either order.
var raced = run({ search: "?team=alabama", missing: ["teams/alabama.js"] });
var iFallback = raced.injected.indexOf("teams/notre-dame.js");
var iApp      = raced.injected.indexOf("app.js");
ok(iFallback !== -1 && iApp !== -1, "both the fallback config and app.js are loaded");
ok(iFallback < iApp, "and app.js goes in after the config it needs, not before");
var domLast = run({ search: "?team=alabama", missing: ["teams/alabama.js"], domFirst: false });
ok(domLast.injected.indexOf("teams/notre-dame.js") < domLast.injected.indexOf("app.js"),
   "the same when the DOM is the thing that arrives last");
eq(run({ readyState: "complete", search: "?team=ohio-state" }).injected.slice(-1), ["app.js"],
   "and on a document that is already parsed, app.js still goes last");

console.log("it keeps no team list of its own");
// teams/index.js is the one registry (decision 0014). A list here would be a
// second one, and second lists drift.
ok(!/var TEAMS\s*=/.test(BOOT), "no TEAMS array");
var names = (BOOT.match(/"[a-z][a-z0-9-]{2,}"/g) || [])
  .map(function (q) { return q.replace(/"/g, ""); })
  .filter(function (n) { return n !== "notre-dame" && !/^(iw-|--|team$|script$)/.test(n); });
ok(names.every(function (n) { return !fs.existsSync(path.join(root, "teams", n + ".js")); }),
   "and names no team config but the default's, which it needs to fall back to");

console.log("the static page belongs to no team");
// Before any script runs, the page a fan sees must not be somebody's: an Ohio
// State fan's first paint reading "Notre Dame" is the bug decision 0013 exists
// to prevent. Every program name in the registry and every product name in a
// team config is checked, so this grows with the roster instead of being a
// hand-kept list of three strings. The boot script is excluded: it names the
// default team on purpose, because it has to fall back to one.
var shell = html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<!--[\s\S]*?-->/g, " ");
var regCtx = vm.createContext({});
vm.runInContext(read("teams/index.js"), regCtx, { filename: "teams/index.js" });
var claimed = [];
(regCtx.TEAM_REGISTRY || []).forEach(function (t) {
  var re = new RegExp("\\b" + t.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b");
  if (re.test(shell)) claimed.push(t.name);
});
fs.readdirSync(path.join(root, "teams")).filter(function (f) {
  return /\.js$/.test(f) && f !== "index.js";
}).forEach(function (f) {
  var c = vm.createContext({});
  vm.runInContext(read("teams/" + f), c, { filename: f });
  var id = (c.TEAM_CONFIG && c.TEAM_CONFIG.identity) || {};
  [id.productName, id.programLabel, id.tagline].forEach(function (w) {
    if (w && shell.indexOf(w) !== -1) claimed.push(w + " (" + f + ")");
  });
});
eq(claimed, [], "names no program and no team's product, label or tagline");
ok((regCtx.TEAM_REGISTRY || []).length > 100, "checked against the full roster, not a sample");

console.log("\n" + (failures ? failures + " check(s) FAILED" : "the page knows which team it is"));
process.exit(failures ? 1 : 0);
