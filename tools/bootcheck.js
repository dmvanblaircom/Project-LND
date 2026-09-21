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
  var applied = {}, injected = [], meta = { "theme-color": opts.staticTheme || "#0C2340" };
  var attrs = {}, doc;

  var rootStyle = {
    setProperty: function (k, v) { applied[k] = v; }
  };
  doc = {
    title: opts.staticTitle || "Irish Watch — Notre Dame football",
    readyState: opts.readyState || "loading",
    documentElement: { style: rootStyle, setAttribute: function (k, v) { attrs[k] = v; } },
    head: { appendChild: function (el) { injected.push(el.src); } },
    createElement: function () { return { src: null, async: true }; },
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
  if (doc.__domReady) doc.__domReady();          // the DOM arrives; app.js goes in
  return { team: attrs["data-team"], applied: applied, injected: injected,
           meta: meta, title: doc.title, store: store };
}

// A stored set, the shape paintIdentity() writes.
var OSU = { "--t-accent": "#BA0C2F", "--t-surface": "#212325", "--t-deep": "#0B1115",
            title: "Buckeye Watch · Ohio State Football", themeColor: "#212325" };
var ND = { "--t-accent": "#C99700", "--t-surface": "#0C2340", "--t-deep": "#07192F",
           title: "Irish Watch — Notre Dame football", themeColor: "#0C2340" };
function saved(id, set) { var s = {}; s["iw-boot-" + id] = JSON.stringify(set); return s; }

console.log("which team");
eq(run({}).team, "notre-dame", "nothing asked, nothing stored -> the default");
eq(run({ search: "?team=ohio-state" }).team, "ohio-state", "?team= wins");
eq(run({ storage: { "iw-team": "ohio-state" } }).team, "ohio-state", "then the last choice this browser made");
eq(run({ search: "?team=notre-dame", storage: { "iw-team": "ohio-state" } }).team, "notre-dame",
   "?team= beats the stored choice, so a link can override it");
eq(run({ search: "?team=alabama" }).team, "notre-dame", "a team with no config falls back rather than loading nothing");
eq(run({ storage: { "iw-team": "alabama" } }).team, "notre-dame", "and so does a stale stored one");
eq(run({ search: "?team=" }).team, "notre-dame", "an empty ?team= is not a team");

console.log(" and it is remembered");
eq(run({ search: "?team=ohio-state" }).store["iw-team"], "ohio-state", "the choice is stored");
eq(run({ search: "?team=alabama" }).store["iw-team"], "notre-dame", "an unknown one stores the fallback, not itself");

console.log("what it paints before anything loads");
var cold = run({ search: "?team=ohio-state" });
eq(cold.applied, {}, "nothing stored for this team -> no tokens, so app.css's neutral :root stands");
eq(cold.meta["theme-color"], "#161A20",
   "and the browser chrome is pointed at that same neutral, not the default team's colour");

var warm = run({ search: "?team=ohio-state", storage: saved("ohio-state", OSU) });
eq(warm.applied["--t-accent"], "#BA0C2F", "a stored set paints the team before a single file is fetched");
eq(warm.applied["--t-deep"], "#0B1115", "including the canvas the iOS bars are taken from");
eq(warm.meta["theme-color"], "#212325", "and the chrome matches it");
eq(warm.title, "Buckeye Watch · Ohio State Football", "and the tab says the right product");

console.log(" one team is never painted in another's colours");
// The whole reason the set is keyed by team. Ohio State's colours are on this
// browser; the page being opened is Notre Dame's.
var cross = run({ search: "?team=notre-dame", storage: saved("ohio-state", OSU) });
eq(cross.applied, {}, "Ohio State's stored set is not replayed onto Notre Dame");
eq(cross.title, "Irish Watch — Notre Dame football", "nor its title");
eq(cross.meta["theme-color"], "#161A20", "the chrome goes neutral instead of borrowing it");
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
eq(nasty.meta["theme-color"], "#161A20",
   "a theme colour that is not a hex colour is refused, and does not leave the default team's behind");
var surfOnly = run({ search: "?team=ohio-state", storage: saved("ohio-state",
  { "--t-surface": "#212325", themeColor: "not-a-colour" }) });
eq(surfOnly.meta["theme-color"], "#212325", "it falls back to the surface actually applied");
eq(run({ storage: { "iw-boot-notre-dame": "{not json" } }).applied, {}, "unparseable storage is ignored, not thrown on");
eq(run({ storage: { "iw-boot-notre-dame": "\"a string\"" } }).applied, {}, "and so is storage of the wrong type");

console.log(" storage can be unavailable");
var blocked = run({ storageThrows: true });
eq(blocked.team, "notre-dame", "private mode or blocked storage still resolves a team");
eq(blocked.applied, {}, "and paints the neutral");

console.log("what it loads");
var order = run({ search: "?team=ohio-state" }).injected;
eq(order[0], "teams/ohio-state.js", "the team's config first - app.js reads it at parse time");
eq(order[order.length - 1], "app.js", "and app.js last");
eq(order, ["teams/ohio-state.js", "teamos/team.js", "teamos/snapshots.js", "teamos/identity.js",
           "teamos/live.js", "teamos/season.js", "teamos/espn.js", "app.js"],
   "every file the page needs, in dependency order");
ok(/async\s*=\s*false/.test(BOOT), "injected with async=false, which is what keeps them in order");
ok(/DOMContentLoaded/.test(BOOT),
   "app.js waits for a DOM, because it reads one as it runs (app.js:~1827)");
// If app.js were injected with the rest it could run before <body> is parsed
// and querySelectorAll would come back empty. Prove it is held back.
var early = run({ readyState: "loading" });
ok(early.injected.indexOf("app.js") === early.injected.length - 1, "and is still last when it arrives");

console.log("the team list matches the configs on disk");
var listed = (BOOT.match(/var TEAMS\s*=\s*\[([^\]]*)\]/) || [, ""])[1]
  .split(",").map(function (s) { return s.trim().replace(/^"|"$/g, ""); })
  .filter(Boolean).sort();
var onDisk = fs.readdirSync(path.join(root, "teams"))
  .filter(function (f) { return /\.js$/.test(f); })
  .map(function (f) { return f.replace(/\.js$/, ""); }).sort();
eq(listed, onDisk, "every team the boot script offers has a config, and every config is offered");

console.log("\n" + (failures ? failures + " check(s) FAILED" : "the page knows which team it is"));
process.exit(failures ? 1 : 0);
