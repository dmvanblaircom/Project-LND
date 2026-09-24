#!/usr/bin/env node
/* Season Outlook and screen freshness: the two Home rules that are not
   about a single game (decision 0024 §12, §13). Both are pure TeamOS
   functions; this runs them directly.

   Usage:  node tools/rulescheck.js      (exit 1 on any failure) */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");
var root = path.join(__dirname, "..");
function read(p) { return fs.readFileSync(path.join(root, p), "utf8"); }
var failures = 0;
function ok(cond, what) {
  if (cond) { console.log("  ok   " + what); return; }
  failures++; console.log("  FAIL " + what);
}
function eq(a, b, what) {
  var same = JSON.stringify(a) === JSON.stringify(b);
  ok(same, what + " = " + JSON.stringify(b) + (same ? "" : " (got " + JSON.stringify(a) + ")"));
}
function uncomment(t) { return t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, ""); }

var ctx = vm.createContext({ Date: Date });
["teamos/outlook.js", "teamos/freshness.js"].forEach(function (f) { vm.runInContext(read(f), ctx, { filename: f }); });
var O = ctx.TeamOS.outlook, F = ctx.TeamOS.freshness;

["teamos/outlook.js", "teamos/freshness.js"].forEach(function (f) {
  var s = uncomment(read(f));
  ok(!/\bfetch\s*\(|\b(document|window|localStorage)\b/.test(s), f + " is pure");
  ok(!/espn|kalshi|notre|irish|ohio|buckeye/i.test(s), f + " names no provider and no team");
});

console.log("Season Outlook (0024 §12)");
function keys(ms) { return ms.map(function (m) { return m.key; }); }
eq(keys(O.metrics({ playoff: { value: 84 }, title: { value: 12 } })), ["playoff", "title"], "two markets: both, playoff first");
eq(keys(O.metrics({ playoff: { value: 84 }, title: null })), ["playoff"], "one market: that one alone - no 'No market' card");
eq(keys(O.metrics({ playoff: null, title: { value: 3 } })), ["title"], "either one can stand alone");
eq(O.metrics({ playoff: null, title: null }), [], "no market: nothing, so the section hides");
eq(O.metrics({}), [], "no markets object: nothing");
eq(O.metrics({ playoff: { value: "n/a" }, title: { value: 140 } }), [], "a value that is not a percentage is not shown, never guessed");
eq(O.metrics({ playoff: { value: 0 } }).length, 1, "0% is a real value");
var m = O.metrics({ playoff: { value: 84, previous: 82.5, asOf: "2026-09-24T12:00:00Z", cached: true } })[0];
eq([m.label, m.value, m.change, m.stale, m.asOf], ["Playoff", 84, 1.5, true, "2026-09-24T12:00:00Z"],
   "a cached value is kept, with its change, and marked stale with its as-of time");

console.log("freshness (0024 §13)");
var NOW = Date.parse("2026-09-24T12:00:00Z"), MIN = 60 * 1000;
function src(key, agoMin, extra) { return Object.assign({ key: key, fetchedAt: NOW - agoMin * MIN, maxAgeMs: 30 * MIN }, extra || {}); }
eq(F.summary([src("schedule", 5), src("news", 10)], { now: NOW, online: true }).state, "fresh", "everything recent: fresh, and no timestamps");
var st = F.summary([src("schedule", 5), src("news", 42, { cached: true })], { now: NOW, online: true });
eq([st.state, st.keys, st.since], ["stale", ["news"], NOW - 42 * MIN], "a cached source on this screen: stale, since its last refresh");
eq(F.summary([src("schedule", 45)], { now: NOW }).state, "stale", "past its maximum age: stale");
eq(F.summary([src("schedule", 5), src("weather", 0, { optional: true, missing: true })], { now: NOW }).state, "fresh",
   "a missing optional source is omitted, not a warning");
eq(F.summary([src("schedule", 5)], { now: NOW, online: false }).state, "offline", "offline is the network's state");
// The screen decides which sources it passes. Availability is stale but Home does not show it.
var availability = src("availability", 600, { cached: true });
var home = [src("schedule", 5), src("news", 5)], roster = home.concat([availability]);
eq([F.summary(home, { now: NOW }).state, F.summary(roster, { now: NOW }).state], ["fresh", "stale"],
   "a stale source warns only on the screen that shows it - not 'the stalest source anywhere'");
eq(F.summary([], { now: NOW }).state, "fresh", "a screen with no data sources is fresh");

console.log("\n" + (failures ? failures + " check(s) FAILED" : "Season Outlook and freshness say one thing"));
process.exit(failures ? 1 : 0);
