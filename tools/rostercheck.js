#!/usr/bin/env node
/* The team's people, joined (teamos/roster.js).

   Which Roster views a team has follows what it has (decision 0019, 0024
   §9); the depth chart joined to the roster keeps every spot, level and OR
   exactly as the official chart has them, and never pins a player's
   height, hometown or photo on someone else. Runs the real depth chart and
   the real ESPN rosters - no browser, no network.

   Usage:  node tools/rostercheck.js      (exit 1 on any failure) */
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

function teamContext(file) {
  var ctx = vm.createContext({});
  ["teamos/team.js", "teamos/snapshots.js", "teamos/espn.js", "teamos/roster.js", file].forEach(function (f) {
    vm.runInContext(read(f), ctx, { filename: f });
  });
  return ctx;
}
var nd = teamContext("teams/notre-dame.js"), osu = teamContext("teams/ohio-state.js");
var R = nd.TeamOS.roster;

console.log("teamos/roster.js");
var src = uncomment(read("teamos/roster.js"));
ok(!/\bfetch\s*\(|\b(document|window|localStorage)\b/.test(src), "pure: no fetch, no DOM, no storage");
ok(!/espn|notre|irish|ohio|buckeye/i.test(src), "names no provider and no team");

console.log("views follow what the team has");
eq(R.views(nd.TEAM_CONFIG).map(function (v) { return v.id; }), ["depth", "roster", "availability"],
   "a team with a depth chart and an availability report: all three");
eq(osu.TeamOS.roster.views(osu.TEAM_CONFIG).map(function (v) { return v.id; }), ["roster"],
   "a team with neither: the roster alone - no empty views");

console.log("the depth chart, joined to the real roster");
var chart = JSON.parse(read("depth.json"));
var groups = nd.TeamOS.espn.roster(JSON.parse(read("tools/fixtures/espn-roster-nd-sep24.json")));
var dc = R.depth(chart, groups);
eq(dc.units.map(function (u) { return u.unit; }), chart.units.map(function (u) { return u.unit; }), "units in the chart's own order");
var shape = function (units) {
  return units.map(function (u) { return u.slots.map(function (s) {
    return s.label + s.ordinal + ":" + s.levels.map(function (l) { return l.level + "=" + l.players.map(function (p) { return p.name; }).join("|"); }).join(","); }); });
};
eq(shape(dc.units), shape(chart.units), "every spot, level and OR group exactly as the official chart has them");
var entries = [], matched = 0;
dc.units.forEach(function (u) { u.slots.forEach(function (s) { s.levels.forEach(function (l) { l.players.forEach(function (p) {
  entries.push(p); if (p.matched) matched++; }); }); }); });
ok(matched >= entries.length - 12 && matched > 0, matched + " of " + entries.length + " entries matched to a roster player");
function find(name) { return entries.filter(function (p) { return p.name === name; })[0]; }
var carr = find("CJ Carr");
ok(carr && carr.matched && carr.height && carr.photo && carr.hometown && carr.hometown.state, "CJ Carr gains height, hometown and photo");
var aw = find("Aneyas Williams");
ok(aw && !aw.matched && aw.photo === null && aw.height === "",
   "#22 Aneyas Williams is not given #22 Ethan Long's photo or height: never the number alone");
var awChart = [].concat.apply([], chart.units.map(function (u) { return [].concat.apply([], u.slots.map(function (s) {
  return [].concat.apply([], s.levels.map(function (l) { return l.players; })); })); })).filter(function (p) { return p.name === "Aneyas Williams"; })[0];
eq([aw.no, aw.classYear], [awChart.no, awChart.cl], "an unmatched entry keeps what the official chart says");
var dt2 = dc.units.filter(function (u) { return u.unit === "Defense"; })[0].slots.filter(function (s) { return s.label === "DT" && s.ordinal === 2; })[0];
eq([dt2.name, dt2.open, dt2.levels[0].players.length], ["Defensive Tackle 2", true, 2], "two DTs are two spots; a first-team OR is an open job");
eq(R.depth(null, groups), null, "no chart, nothing");

console.log("who is out, on the depth chart (the report for the chart's game)");
var report = JSON.parse(read("availability.json"));
var dcOut = R.depth(chart, groups, report), outs = [];
dcOut.units.forEach(function (u) { u.slots.forEach(function (s) { s.levels.forEach(function (l) { l.players.forEach(function (p) {
  if (p.out) outs.push(p.name + "=" + p.out); }); }); }); });
ok(outs.indexOf("Luke Talich=out-game") > -1, "Luke Talich, the listed starter at FIELD, is marked out for the game (" + outs.join(", ") + ")");
ok(outs.every(function (o) { var n = o.split("=")[0];
  return report.players.some(function (p) { return p.name === n && /^out-/.test(p.status); }); }), "only players the report lists as out are marked");
ok(entries.every(function (p) { return !p.out; }), "without the report, nobody is marked");
var other = JSON.parse(JSON.stringify(report)); other.game = "vs Navy";
ok(R.depth(chart, groups, other).units.every(function (u) { return u.slots.every(function (s) { return s.levels.every(function (l) {
  return l.players.every(function (p) { return !p.out; }); }); }); }), "a report for another game marks nobody");
var none = JSON.parse(JSON.stringify(report)); none.reported = false;
ok(R.depth(chart, groups, none).units[0].slots.every(function (s) { return s.levels.every(function (l) {
  return l.players.every(function (p) { return !p.out; }); }); }), "no report out yet marks nobody");

console.log("availability, from the official report");
var rep = JSON.parse(read("availability.json"));
var av = R.availability(rep, groups);
eq([av.reported, av.effectiveAt, av.game], [true, rep.effectiveAt, rep.game], "the report's own date and game");
eq(av.groups.map(function (g) { return g.status; }),
   ["out-season", "out-game", "doubtful", "questionable", "probable"].filter(function (st) {
     return rep.players.some(function (p) { return p.status === st; }); }), "grouped in order of severity, empty groups dropped");
eq(av.groups.reduce(function (n, g) { return n + g.players.length; }, 0), rep.players.length, "every listed player, once");
eq(R.availability({ reported: false, players: [] }, groups).reported, false, "no report is 'no report' - never 'everyone is fine'");
eq(R.availability({ reported: true, players: [] }, groups).groups, [], "a report that lists nobody: no groups");
eq(R.availability(null, groups), null, "no file, nothing");

console.log("week by week");
var hist = R.history(JSON.parse(read("depth-history.json")), JSON.parse(read("availability-history.json")));
ok(hist.length >= 2, hist.length + " charts, newest first");
eq(hist[0].game, JSON.parse(read("depth-history.json")).snapshots.slice(-1)[0].game, "the newest chart leads");
ok(hist.every(function (w) { return Array.isArray(w.changes); }), "each week carries its changes");

console.log("spot names");
eq([R.spotName("QB"), R.spotName("dt"), R.spotName("WILL"), R.spotName("NICKEL")],
   ["Quarterback", "Defensive Tackle", "WILL", "NICKEL"], "general positions in words; a team's own terms as written");

console.log("\n" + (failures ? failures + " check(s) FAILED" : "the depth chart and the roster agree, and nobody wears someone else's face"));
process.exit(failures ? 1 : 0);
