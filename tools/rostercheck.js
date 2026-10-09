#!/usr/bin/env node
/* The team's people, joined (teamos/roster.js).

   Which Roster views a team has follows what it has (decision 0019, 0024
   §9); the depth chart joined to the roster keeps every spot, level and OR
   exactly as the official chart has them, and never pins a player's
   height, hometown or photo on someone else. Runs the real depth chart and
   the real ESPN rosters - no browser, no network.

   The named facts (who is out, who moved up) are pinned to the Purdue-week
   chart and report frozen in tools/fixtures/nd-*-g4.json: the pipeline
   rewrites data/notre-dame/ every week, and last week's facts are not this
   week's. The files on file now get the same rules without the names.

   Usage:  node tools/rostercheck.js      (exit 1 on any failure) */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");
var root = path.join(__dirname, "..");
function read(p) { return fs.readFileSync(path.join(root, p), "utf8"); }
// the Purdue-week chart, report and histories, frozen (see above)
var G4 = { depth: "tools/fixtures/nd-depth-g4.json", availability: "tools/fixtures/nd-availability-g4.json",
           depthHistory: "tools/fixtures/nd-depth-history-g4.json", availabilityHistory: "tools/fixtures/nd-availability-history-g4.json" };
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
  ["teamos/team.js", "teamos/snapshots.js", "teamos/espn.js", "teamos/roster.js", "teamos/notes.js", file].forEach(function (f) {
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
var chart = JSON.parse(read(G4.depth));
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
eq([dt2.name, dt2.sharedFirst, dt2.levels[0].players.length], ["Defensive Tackle 2", true, 2], "two DTs are two spots; a first-team OR is kept as the chart has it");
eq(R.depth(null, groups), null, "no chart, nothing");

console.log("who is out, on the depth chart (the report for the chart's game)");
var report = JSON.parse(read(G4.availability));
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
console.log("who moved since the last chart (arrows, one chart only)");
var histRaw = JSON.parse(read(G4.depthHistory));
var dcMv = R.depth(chart, groups, report, histRaw), ups = [], downs = [];
dcMv.units.forEach(function (u) { u.slots.forEach(function (s) { s.levels.forEach(function (l) { l.players.forEach(function (p) {
  if (p.moved === "up") ups.push(p.name + "@" + s.label); if (p.moved === "down") downs.push(p.name + "@" + s.label); }); }); }); });
chart.changes.filter(function (c) { return c.kind === "up"; }).forEach(function (c) {
  ok(ups.some(function (u) { return u.indexOf(c.name + "@") === 0; }), "the chart says " + c.name + " moved up: he has an up arrow");
});
ok(ups.indexOf("Nolan James Jr.@RB") > -1, "Nolan James Jr. moved up to first team at RB: up arrow (" + ups.join(", ") + ")");
console.log("  down arrows this week: " + (downs.join(", ") || "none"));
// the arrow lasts one chart: the same chart compared with itself shows none
var same = JSON.parse(JSON.stringify(histRaw)); same.snapshots.push(JSON.parse(JSON.stringify(same.snapshots[same.snapshots.length - 1])));
same.snapshots[same.snapshots.length - 1].game = "vs Next Opponent";
var nextWeek = JSON.parse(JSON.stringify(chart)); nextWeek.game = "vs Next Opponent";
ok(R.depth(nextWeek, groups, null, same).units.every(function (u) { return u.slots.every(function (s) { return s.levels.every(function (l) {
  return l.players.every(function (p) { return !p.moved; }); }); }); }), "next week, still where he is, the arrow drops off");
ok(R.depth(chart, groups, report, null).units.every(function (u) { return u.slots.every(function (s) { return s.levels.every(function (l) {
  return l.players.every(function (p) { return !p.moved; }); }); }); }), "no history, no arrows");
var firstOnly = { snapshots: [histRaw.snapshots[0]] }, first = JSON.parse(JSON.stringify(histRaw.snapshots[0]));
ok(R.depth(first, groups, null, firstOnly).units.every(function (u) { return u.slots.every(function (s) { return s.levels.every(function (l) {
  return l.players.every(function (p) { return !p.moved; }); }); }); }), "the season's first chart has nothing to compare with: no arrows");

console.log("changes since the last chart (the disclosure, issue #30)");
function arrowsOf(d) { var a = []; d.units.forEach(function (u) { u.slots.forEach(function (s) { s.levels.forEach(function (l) { l.players.forEach(function (p) {
  if (p.moved) a.push(p.moved + ":" + p.name + "@" + u.unit + "|" + s.label + "|" + s.ordinal); }); }); }); }); return a.sort(); }
function arrowItems(since) { return since.changes.filter(function (c) { return c.kind === "up" || c.kind === "down" || c.kind === "enters"; })
  .map(function (c) { var k = c.kind === "enters" ? "up" : c.kind;
    var u = dcMv.units.filter(function (x) { return x.unit === c.to.unit; })[0];
    var s = u.slots.filter(function (x) { return x.name === c.to.spot; })[0];
    return k + ":" + c.name + "@" + c.to.unit + "|" + s.label + "|" + s.ordinal; }).sort(); }
var since = dcMv.since;
ok(since && since.count === since.changes.length && since.count > 0, "this week's chart has changes: " + (since && since.count));
eq(since.game, histRaw.snapshots[histRaw.snapshots.length - 2].game, "compared with the previous chart, the one the arrows use");
eq(arrowItems(since), arrowsOf(dcMv), "every arrow is in the list and every up/down/new in the list has its arrow");
var nolan = since.changes.filter(function (c) { return c.name === "Nolan James Jr."; })[0];
ok(nolan && nolan.kind === "up" && nolan.from.level === 2 && nolan.to.level === 1 && nolan.to.spot === "Running Back",
   "Nolan James Jr.: Running Back, second team -> first team");
ok(nolan && nolan.to.or.length > 0, "and the first-team OR he joined is carried with him (" + (nolan && nolan.to.or.join(", ")) + ")");
eq(R.depth(chart, groups, report, null).since, null, "no history: no comparison - never \"no changes\"");
eq(R.depth(first, groups, null, firstOnly).since, null, "the season's first chart: no comparison");
var still = R.depth(nextWeek, groups, null, same).since;
ok(still && still.count === 0 && still.changes.length === 0, "a real comparison that finds nothing: count 0, not null");
// a hand-made pair covering what the Purdue week does not: a move between
// spots, a new name, a departure, an OR forming, every unit counted
function u(unit, slots) { return { unit: unit, slots: slots }; }
function sl(label, ordinal, levels) { return { label: label, ordinal: ordinal, levels: levels.map(function (ps, i) {
  return { level: i + 1, players: ps.map(function (n) { return { no: "", name: n }; }) }; }) }; }
var oldC = { game: "G1", title: "DEPTH CHART - GAME 1", units: [
  u("Offense", [sl("WR", 1, [["Ann"], ["Bea"]]), sl("WR", 2, [["Cal"], ["Dee"]])]),
  u("Special Teams", [sl("K", 1, [["Eve"], ["Fay"]])]) ] };
var newC = { game: "G2", title: "DEPTH CHART - GAME 2", units: [
  u("Offense", [sl("WR", 1, [["Ann"], ["Gus"]]), sl("WR", 2, [["Cal", "Bea"], ["Dee"]])]),
  u("Special Teams", [sl("K", 1, [["Fay"]])]) ] };
var hc = R.depth(newC, [], null, { snapshots: [oldC, newC] }).since;
var by = {}; hc.changes.forEach(function (c) { by[c.name] = c; });
eq(hc.count, 4, "Bea moves, Gus enters, Eve leaves, Fay moves up - four changes");
ok(by.Bea && by.Bea.kind === "moved" && by.Bea.from.spot === "Wide Receiver 1" && by.Bea.from.level === 2 &&
   by.Bea.to.spot === "Wide Receiver 2" && by.Bea.to.level === 1 && by.Bea.to.or.join() === "Cal",
   "a move between spots is one entry, previous -> current, with the OR it forms");
ok(by.Gus && by.Gus.kind === "enters" && by.Gus.from === null, "a new name enters");
ok(by.Eve && by.Eve.kind === "leaves" && by.Eve.to === null && by.Eve.from.unit === "Special Teams", "a departure leaves - from any unit");
ok(by.Fay && by.Fay.kind === "up" && by.Fay.to.unit === "Special Teams", "special teams count too");
ok(!by.Cal, "Cal is first team before and after: gaining a co-starter is shown on Bea's entry, not counted twice");

console.log("who is out, on the roster");
var marked = [].concat.apply([], R.withStatus(groups, report, chart).map(function (g) { return g.players; })).filter(function (p) { return p.out; });
ok(marked.some(function (p) { return p.name === "Luke Talich" && p.out === "out-game"; }), "Luke Talich is marked out on the roster");
ok(marked.length >= report.players.length - 2 && marked.every(function (p) {
  return report.players.some(function (r) { return r.name.replace(/[^a-z]/gi, "").toLowerCase() === p.name.replace(/[^a-z]/gi, "").toLowerCase(); }); }),
   marked.length + " of " + report.players.length + " listed players found on the roster and marked, nobody else");
ok(groups.every(function (g) { return g.players.every(function (p) { return !p.out; }); }), "the shared roster groups are not changed");
ok([].concat.apply([], R.withStatus(groups, other, chart).map(function (g) { return g.players; })).every(function (p) { return !p.out; }),
   "a report for another game marks nobody on the roster either");
ok([].concat.apply([], R.withStatus(groups, report, null).map(function (g) { return g.players; })).some(function (p) { return p.out; }),
   "a team with a report but no depth chart: the report alone decides");

var none = JSON.parse(JSON.stringify(report)); none.reported = false;
ok(R.depth(chart, groups, none).units[0].slots.every(function (s) { return s.levels.every(function (l) {
  return l.players.every(function (p) { return !p.out; }); }); }), "no report out yet marks nobody");

console.log("availability, from the official report");
var rep = JSON.parse(read(G4.availability));
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
var hist = R.history(JSON.parse(read(G4.depthHistory)), JSON.parse(read(G4.availabilityHistory)));
ok(hist.length >= 2, hist.length + " charts, newest first");
eq(hist[0].game, JSON.parse(read(G4.depthHistory)).snapshots.slice(-1)[0].game, "the newest chart leads");
ok(hist.every(function (w) { return Array.isArray(w.changes); }), "each week carries its changes");

console.log("the chart and report on file now (no names: they change every week)");
var liveChart = JSON.parse(read("data/notre-dame/depth.json"));
var liveReport = JSON.parse(read("data/notre-dame/availability.json"));
var liveHist = JSON.parse(read("data/notre-dame/depth-history.json"));
var liveDc = R.depth(liveChart, groups, liveReport, liveHist);
eq(shape(liveDc.units), shape(liveChart.units), "every spot, level and OR group exactly as the official chart has them");
var liveOut = [];
liveDc.units.forEach(function (u) { u.slots.forEach(function (s) { s.levels.forEach(function (l) { l.players.forEach(function (p) {
  if (p.out) liveOut.push(p.name); }); }); }); });
ok(liveOut.every(function (n) { return liveReport.game === liveChart.game &&
  liveReport.players.some(function (p) { return p.name === n && /^out-/.test(p.status); }); }),
   "only players this week's report lists as out are marked (" + (liveOut.join(", ") || "none") + ")");
var liveAv = R.availability(liveReport, groups);
ok(!liveReport.reported || liveAv.groups.reduce(function (n, g) { return n + g.players.length; }, 0) === liveReport.players.length,
   "every player on this week's report, once");
var liveHistory = R.history(liveHist, JSON.parse(read("data/notre-dame/availability-history.json")));
eq(liveHistory[0].game, liveHist.snapshots.slice(-1)[0].game, "the newest chart on file leads");

console.log("battle framing: the season's first chart only (issue #31, option A)");
eq([R.phase({ title: "DEPTH CHART - GAME 1 VS WISCONSIN" }).battles, R.phase({ title: "DEPTH CHART - GAME 2 VS RICE" }).battles,
    R.phase({ title: "DEPTH CHART - GAME 10 VS NAVY" }).battles, R.phase({ title: "2027 PRESEASON DEPTH CHART" }).battles],
   [true, false, false, true], "Game 1 and preseason are eligible; Game 2 and later are not, Game 10 is not Game 1");
var unknownPh = R.phase({ title: "DEPTH CHART" });
eq([unknownPh.known, unknownPh.battles], [false, false], "a title naming no game and no preseason: unknown, so no battle framing");
var g1 = JSON.parse(read(G4.depthHistory)).snapshots[0];
var dc1 = R.depth(g1, groups), dc4 = R.depth(chart, groups);
var opens = function (d) { return [].concat.apply([], d.units.map(function (u) { return u.slots.filter(function (s) { return s.open; }); })).length; };
var shared = function (d) { return [].concat.apply([], d.units.map(function (u) { return u.slots.filter(function (s) { return s.sharedFirst; }); })).length; };
ok(/GAME 1/.test(g1.title) && opens(dc1) > 0 && opens(dc1) === shared(dc1), "the real Game 1 chart: its " + opens(dc1) + " first-team ORs read as battles");
ok(/GAME 4/.test(chart.title) && opens(dc4) === 0 && shared(dc4) > 0,
   "the real Game 4 chart: " + shared(dc4) + " first-team ORs, none of them a battle");
var rolled = JSON.parse(JSON.stringify(g1)); rolled.title = "DEPTH CHART - GAME 1 VS NAVY";
ok(opens(R.depth(rolled, groups)) > 0, "next season's Game 1 chart is eligible again");
var ui5 = vm.createContext({ document: { addEventListener: function () {} }, TeamOS: nd.TeamOS });
["suite/ui.js", "suite/roster.js"].forEach(function (f) { vm.runInContext(read(f), ui5, { filename: f }); });
function rosterBody(d) {
  var parts = {}, h = { innerHTML: "", querySelector: function (q) { var k = (/data-ro="(\w+)"/.exec(q) || [])[1];
    if (!k) return q === "[data-ro]" && this.innerHTML ? {} : null; return parts[k] || (parts[k] = { innerHTML: "" }); } };
  ui5.Suite.roster.paint(h, { view: "depth", views: R.views(nd.TEAM_CONFIG), hasDepth: true, depth: d, unit: "offense", history: null, fresh: null });
  return parts.body.innerHTML;
}
var b1 = rosterBody(dc1), b4 = rosterBody(dc4);
ok(/class="ro-battle">Battle</.test(b1) && /starting jobs? still open/.test(b1), "drawn: Game 1 shows Battle badges and the open-jobs count");
ok(!/ro-battle|still open/.test(b4), "drawn: Game 4 shows neither");
ok(/class="ro-or">or</.test(b4), "drawn: Game 4 still shows every OR");

console.log("spot names");
eq([R.spotName("QB"), R.spotName("dt"), R.spotName("WILL"), R.spotName("NICKEL")],
   ["Quarterback", "Defensive Tackle", "WILL", "NICKEL"], "general positions in words; a team's own terms as written");

console.log("\n" + (failures ? failures + " check(s) FAILED" : "the depth chart and the roster agree, and nobody wears someone else's face"));
process.exit(failures ? 1 : 0);
