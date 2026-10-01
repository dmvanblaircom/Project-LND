#!/usr/bin/env node
/* Predictive ratings for Top 25 -> Rankings (teamos/ratings.js, W07).

   The real ESPN FPI capture (tools/fixtures/espn-fpi-sep30.json) goes
   through the real producer (tools/producers/fpi.py) into the snapshot the
   app would read, and then through TeamOS - so the fixture cannot drift from
   what the producer writes. Both teams are checked, plus the cases a real
   capture does not show: a team outside the top 25, the season rollover,
   a missing or broken snapshot, a 0 rating, a missing rank change.

   Usage: node tools/ratingscheck.js     (needs python3; exit 1 on failure) */
"use strict";
var fs = require("fs"), os = require("os"), path = require("path"), vm = require("vm"), cp = require("child_process");
var root = path.join(__dirname, "..");
function read(p) { return fs.readFileSync(path.join(root, p), "utf8"); }

var failures = 0;
function ok(cond, what) { if (cond) { console.log("  ok   " + what); return; } failures++; console.log("  FAIL " + what); }
function eq(a, b, what) {
  var same = JSON.stringify(a) === JSON.stringify(b);
  ok(same, what + " = " + JSON.stringify(b) + (same ? "" : " (got " + JSON.stringify(a) + ")"));
}
function uncomment(t) { return t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, ""); }

function teamContext(file) {
  var ctx = vm.createContext({});
  ["teamos/team.js", "teamos/freshness.js", "teamos/ratings.js", file].forEach(function (f) {
    vm.runInContext(read(f), ctx, { filename: f });
  });
  return ctx;
}
var nd = teamContext("teams/notre-dame.js"), osu = teamContext("teams/ohio-state.js");
var R = nd.TeamOS.ratings;

console.log("teamos/ratings.js");
var src = uncomment(read("teamos/ratings.js"));
ok(!/\bfetch\s*\(|\b(document|window|localStorage)\b/.test(src), "pure: no fetch, no DOM, no storage");
ok(!/notre|irish|ohio|buckeye|"87"|"194"/i.test(src), "names no team");

// the producer's own snapshot of the real capture
var out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "fpi-")), "fpi.json");
cp.execFileSync("python3", ["tools/producers/fpi.py", "--season", "2026", "--from-file",
  "tools/fixtures/espn-fpi-sep30.json", "--out", out], { cwd: root, stdio: "ignore" });
var snap = JSON.parse(fs.readFileSync(out, "utf8"));

console.log("the real Sep 30 edition, for Notre Dame");
var f = R.fpi(snap, nd.TEAM_CONFIG, 2026);
ok(f && f.key === "fpi" && f.label === "FPI" && f.kind === "rating", "a rating, keyed for the route #top25/rankings/fpi");
eq(f.ranks.length, 25, "the top 25 rows");
ok(f.ranks.every(function (r, i) { return r.rank === i + 1 || (i && r.rank >= f.ranks[i - 1].rank); }), "in the source's order");
eq(f.total, snap.teams.length, "and knows how many teams the table has");
ok(f.current && f.season === 2026 && f.asOf === "Week 5" && f.updated === "2026-09-30T08:00Z", "this season's Week 5 edition, with the source's update time");
ok(f.sourceUrl === "https://www.espn.com/college-football/fpi", "linked to its source");
var mine = f.ranks.filter(function (r) { return r.mine; });
ok(mine.length === 1 && mine[0].providerId === "87" && f.mine === mine[0], "Notre Dame is marked, once: #" + (f.mine && f.mine.rank));
ok(typeof f.mine.rating === "number" && f.mine.record === "4-0", "with rating and record kept separate from rank");
ok(f.ranks.every(function (r) { return !("votes" in r) && !("firstPlace" in r) && !("points" in r); }), "no poll fields on a rating");

console.log("the same edition, for Ohio State");
var o = R.fpi(snap, osu.TEAM_CONFIG, 2026);
ok(o.mine && o.mine.providerId === "194" && o.ranks.filter(function (r) { return r.mine; }).length === 1,
   "Ohio State is marked instead: #" + (o.mine && o.mine.rank));
ok(!o.ranks.some(function (r) { return r.mine && r.providerId === "87"; }), "and Notre Dame is not");

console.log("what the real capture does not show");
var low = JSON.parse(JSON.stringify(snap));
low.teams.forEach(function (t) { if (t.espnId === "87") t.rank = 99; });
var l = R.fpi(low, nd.TEAM_CONFIG, 2026);
ok(!l.ranks.some(function (r) { return r.mine; }) && l.mine && l.mine.rank === 99, "outside the top 25: not in the rows, but still found");
var neg = R.fpi(snap, nd.TEAM_CONFIG, 2026), bottom = JSON.parse(JSON.stringify(snap)).teams.sort(function (a, b) { return a.rating - b.rating; })[0];
ok(bottom.rating < 0, "the table has negative ratings (" + bottom.rating + ")");
var zero = JSON.parse(JSON.stringify(snap)); zero.teams[0].rating = 0; zero.teams[0].rankChange = null;
var z = R.fpi(zero, nd.TEAM_CONFIG, 2026);
ok(z.ranks[0].rating === 0, "a 0 rating is a rating, not missing");
ok(z.ranks[0].change === null, "no rank change from the source: null, never 0");
ok(neg.changeWindow === "7 days", "a change says what span it covers");
var last = R.fpi(snap, nd.TEAM_CONFIG, 2027);
ok(last && last.current === false && last.season === 2026, "next season, before a new edition: last season's table, marked not current");
eq(R.fpi(null, nd.TEAM_CONFIG, 2026), null, "no snapshot: nothing");
eq(R.fpi({ source: "fpi", teams: [] }, nd.TEAM_CONFIG, 2026), null, "an empty table: nothing");
eq(R.fpi({ source: "sp-plus", teams: snap.teams }, nd.TEAM_CONFIG, 2026), null, "another source's file: not FPI");
var holes = JSON.parse(JSON.stringify(snap)); holes.teams[1].rating = null;
ok(R.fpi(holes, nd.TEAM_CONFIG, 2026).ranks.every(function (r) { return typeof r.rating === "number"; }), "a row without a rating is left out, never invented");

console.log("freshness");
var fs1 = R.freshnessSource(f, false), summary = nd.TeamOS.freshness.summary;
eq(summary([fs1], { now: Date.parse("2026-10-01T12:00Z"), online: true }).state, "fresh", "a day old: fresh");
eq(summary([fs1], { now: Date.parse("2026-10-04T12:00Z"), online: true }).state, "stale", "four days without a new edition: stale");
eq(summary([R.freshnessSource(f, true)], { now: Date.parse("2026-10-01T12:00Z"), online: true }).state, "stale", "the saved copy after a failed load: stale");
eq(summary([R.freshnessSource(null)], { now: Date.parse("2026-10-01T12:00Z"), online: true }).state, "fresh", "not published yet: omitted, not a warning");

console.log("\n" + (failures ? failures + " check(s) FAILED" : "ratings are shaped, not invented"));
process.exit(failures ? 1 : 0);
