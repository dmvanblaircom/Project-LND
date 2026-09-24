#!/usr/bin/env node
/* Do the game rules say one thing, everywhere, in every state?

   teamos/game.js holds the policies Home, Game, Schedule and the nav must
   agree on (decisions 0022, 0024): the nav's Game state, the Game views by
   lifecycle, the one hero game, the recent-final window, day or night. And
   teamos/espn.js turns ESPN's status into the normalized one they read.
   Both are pure, so this runs them directly - no browser, no network.

   Usage:  node tools/gamecheck.js      (exit 1 on any failure) */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");

var root = path.join(__dirname, "..");
function read(p) { return fs.readFileSync(path.join(root, p), "utf8"); }

var failures = 0;
function ok(cond, what) {
  if (cond) { console.log("  ok   " + what); return; }
  failures++; console.log("  FAIL " + what);
}
function eq(a, b, what) { ok(JSON.stringify(a) === JSON.stringify(b), what + " = " + JSON.stringify(b) + (JSON.stringify(a) === JSON.stringify(b) ? "" : " (got " + JSON.stringify(a) + ")")); }

var ctx = vm.createContext({ console: console, Intl: Intl, Date: Date });
["teams/notre-dame.js", "teamos/team.js", "teamos/espn.js", "teamos/game.js"].forEach(function (f) {
  vm.runInContext(read(f), ctx, { filename: f });
});
var TeamOS = ctx.TeamOS, G = TeamOS.game, CFG = ctx.TEAM_CONFIG;
var TEAM = TeamOS.createTeam(CFG.team);
var ZONE = TEAM.timeZone;

function uncomment(t) { return t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, ""); }
var src = uncomment(read("teamos/game.js"));
console.log("teamos/game.js");
ok(!/\bfetch\s*\(|\b(document|window|localStorage)\b/.test(src), "pure: no fetch, no DOM, no storage");
ok(!/espn|kalshi|notre|irish|ohio|buckeye/i.test(src), "names no provider and no team");

// ---- ESPN status -> normalized status -------------------------------------
console.log("status, from ESPN's");
function ev(type, extra) {
  var st = Object.assign({ type: type }, extra || {});
  return { id: "1", date: "2026-10-03T19:30Z",
           competitions: [{ status: st, competitors: [
             { id: CFG.sources.espn.teamId, homeAway: "home", team: { id: CFG.sources.espn.teamId } },
             { id: "99", homeAway: "away", team: { id: "99", shortDisplayName: "Opp" } }] }] };
}
function norm(type, extra) {
  var g = TeamOS.espn.schedule({ events: [ev(type, extra)] }, TEAM, CFG)[0];
  return { status: g.status, hasStarted: g.hasStarted, state: g.state, period: g.period };
}
eq(norm({ name: "STATUS_SCHEDULED", state: "pre" }).status, "scheduled", "scheduled");
eq(norm({ name: "STATUS_IN_PROGRESS", state: "in" }, { period: 2, displayClock: "7:12" }),
   { status: "live", hasStarted: true, state: "in", period: 2 }, "in progress is live, and started");
eq(norm({ name: "STATUS_HALFTIME", state: "in" }, { period: 2 }).status, "live", "halftime is live");
eq(norm({ name: "STATUS_FINAL", state: "post", completed: true }, { period: 4 }),
   { status: "final", hasStarted: true, state: "post", period: 4 }, "final");
eq(norm({ name: "STATUS_POSTPONED", state: "post" }),
   { status: "postponed", hasStarted: false, state: "post", period: 0 },
   "postponed is NOT final, though ESPN's state says post");
eq(norm({ name: "STATUS_CANCELED", state: "post" }).status, "canceled", "canceled");
eq(norm({ name: "STATUS_DELAYED", state: "pre" }),
   { status: "delayed", hasStarted: false, state: "pre", period: 0 }, "a delay before kickoff has not started");
eq(norm({ name: "STATUS_RAIN_DELAY", state: "in" }, { period: 3 }),
   { status: "delayed", hasStarted: true, state: "in", period: 3 }, "a weather delay in the third quarter has started");
eq(norm({ name: "STATUS_SUSPENDED", state: "in" }, { period: 2 }),
   { status: "suspended", hasStarted: true, state: "in", period: 2 }, "suspended after play began");
eq(norm({ name: "STATUS_SOMETHING_NEW", state: "in" }).status, "live", "an unknown name falls back to ESPN's state");
eq(norm({}).status, "scheduled", "no status at all is scheduled, not an error");

// ---- nav --------------------------------------------------------------------
console.log("navState (decision 0024 §14)");
function g(status, started, date, extra) {
  return Object.assign({ id: status + (date || ""), status: status, hasStarted: !!started,
                         date: date || "2026-10-03T19:30:00Z", timeSet: true }, extra || {});
}
eq(G.navState(g("live", true)), "live", "an active game is live - the only state that pulses");
eq(G.navState(g("delayed", false)), null, "a delay BEFORE kickoff keeps the normal Game item");
eq(G.navState(g("delayed", true)), "delayed", "a delay after play began raises Game, still, as delayed");
eq(G.navState(g("suspended", true)), "suspended", "suspended after play began: raised, as suspended");
eq(G.navState(g("suspended", false)), null, "a 'suspension' before kickoff is not a game under way");
eq(G.navState(g("postponed", false)), null, "postponed: normal");
eq(G.navState(g("canceled", false)), null, "canceled: normal");
eq(G.navState(g("final", true)), null, "final: normal");
eq(G.navState(g("scheduled", false)), null, "scheduled: normal");
eq(G.navState(null), null, "no game: normal");

// ---- lifecycle --------------------------------------------------------------
console.log("lifecycle (0022 #6, 0024 §7, §15)");
function ids(l) { return l.views.map(function (v) { return v.id; }); }
var pre = G.lifecycle(g("scheduled", false));
eq([pre.phase, ids(pre), pre.defaultView], ["pregame", ["details"], "details"],
   "pregame is Game Details alone - no Tickets, so no tab strip");
var live = G.lifecycle(g("live", true));
eq([live.phase, ids(live), live.defaultView], ["live", ["drive", "box", "plays", "stats"], "drive"], "live: Drive Tracker first");
var fin = G.lifecycle(g("final", true));
eq([fin.phase, ids(fin), fin.defaultView], ["final", ["box", "plays", "stats"], "box"], "final: Box Score first, no Drive Tracker");
eq(G.lifecycle(g("delayed", true)).phase, "live", "an in-game delay keeps the live views");
eq(G.lifecycle(g("delayed", false)).phase, "pregame", "a pregame delay is still pregame");
eq(G.lifecycle(g("postponed", false)).phase, "pregame", "postponed is pregame");
ok(ids(fin).indexOf("stats") > -1 && ids(live).indexOf("stats") > -1, "Stats exists in both, so live Stats -> final Stats is kept");
ok(ids(fin).indexOf("drive") === -1, "Drive Tracker does not survive the final, so its route moves to Box Score");
live.views.push({ id: "x" });
eq(ids(G.lifecycle(g("live", true))), ["drive", "box", "plays", "stats"], "a caller cannot change the rule's views");

// ---- recent final -----------------------------------------------------------
console.log("recentFinal (0022 #10): through the end of the next local day");
// A Saturday 7:30 PM ET kickoff that ends after midnight.
var sat = g("final", true, "2026-10-03T23:30:00Z");
ok(G.recentFinal(sat, new Date("2026-10-04T03:59:00Z"), ZONE), "Saturday 11:59 PM ET: it is tonight");
ok(G.recentFinal(sat, new Date("2026-10-04T05:00:00Z"), ZONE), "Sunday 1:00 AM ET, the game just ended: yesterday's game, still the hero");
ok(G.recentFinal(sat, new Date("2026-10-05T03:59:00Z"), ZONE), "Sunday 11:59 PM ET: still the hero");
ok(!G.recentFinal(sat, new Date("2026-10-05T04:00:00Z"), ZONE), "Monday 12:00 AM ET: over - a calendar rule, not 24 rolling hours");
ok(!G.recentFinal(sat, new Date("2026-10-02T12:00:00Z"), ZONE), "and never before the game day");
ok(G.recentFinal(sat, new Date("2026-10-05T04:30:00Z"), "America/Los_Angeles"),
   "the team's zone decides: in Pacific time it is still Sunday");

// ---- hero -------------------------------------------------------------------
console.log("hero (one rule)");
var season = [
  g("final", true, "2026-09-19T19:30:00Z"),
  g("final", true, "2026-09-26T19:30:00Z"),
  g("scheduled", false, "2026-10-03T19:30:00Z"),
  g("scheduled", false, "2026-10-10T19:30:00Z")
];
function heroAt(games, iso) { var h = G.hero(games, new Date(iso), ZONE); return [h.reason, h.game && h.game.date]; }
eq(heroAt(season, "2026-09-27T14:00:00Z"), ["recent-final", "2026-09-26T19:30:00Z"], "Sunday after a game: the final");
eq(heroAt(season, "2026-09-28T14:00:00Z"), ["upcoming", "2026-10-03T19:30:00Z"], "Monday: the next game");
var liveSeason = season.slice(); liveSeason[2] = g("live", true, "2026-10-03T19:30:00Z");
eq(heroAt(liveSeason, "2026-10-03T21:00:00Z"), ["live", "2026-10-03T19:30:00Z"], "during a game: the live game");
var paused = season.slice(); paused[2] = g("delayed", true, "2026-10-03T19:30:00Z");
eq(heroAt(paused, "2026-10-03T21:00:00Z"), ["live", "2026-10-03T19:30:00Z"], "a lightning delay keeps the game as hero");
var late = season.slice(); late[2] = g("delayed", false, "2026-10-03T19:30:00Z");
eq(heroAt(late, "2026-10-04T02:00:00Z"), ["upcoming", "2026-10-03T19:30:00Z"], "a delayed kickoff is still the next game, even past its listed time");
var pp = season.slice(); pp[2] = g("postponed", false, "2026-10-03T19:30:00Z");
eq(heroAt(pp, "2026-10-03T12:00:00Z"), ["upcoming", "2026-10-03T19:30:00Z"], "postponed before its date: it stays the hero, labelled");
eq(heroAt(pp, "2026-10-04T14:00:00Z"), ["recent-final", "2026-10-03T19:30:00Z"], "postponed and its day passed with no new date: briefly, like a final");
eq(heroAt(pp, "2026-10-05T14:00:00Z"), ["upcoming", "2026-10-10T19:30:00Z"], "then Home moves to the next game");
var cx = season.slice(); cx[2] = g("canceled", false, "2026-10-03T19:30:00Z");
eq(heroAt(cx, "2026-09-29T14:00:00Z"), ["upcoming", "2026-10-10T19:30:00Z"], "a canceled game gives way to the next valid game (0022 #5)");
var cxLast = season.slice(0, 3); cxLast[2] = g("canceled", false, "2026-10-03T19:30:00Z");
eq(heroAt(cxLast, "2026-09-29T14:00:00Z"), ["canceled", "2026-10-03T19:30:00Z"], "with nothing else to come, the canceled game holds the hero");
eq(heroAt(season.slice(0, 2), "2026-12-15T14:00:00Z"), ["season-over", null],
   "season over, past the recent-final window: no game is chosen - that behaviour is an open product decision");
eq(G.hero(season.slice(0, 2), new Date("2026-12-15T14:00:00Z"), ZONE).last.date, "2026-09-26T19:30:00Z",
   "the last game played is still reported, for whatever Product decides");
eq(heroAt([], "2026-10-01T00:00:00Z"), ["none", null], "no games: none");
var unsorted = [season[3], season[1], season[2], season[0]];
eq(heroAt(unsorted, "2026-09-28T14:00:00Z"), ["upcoming", "2026-10-03T19:30:00Z"], "order of the input does not matter");

// ---- day / night --------------------------------------------------------------
console.log("atmosphere (0022 #11)");
eq(G.atmosphere(g("scheduled", false, "2026-10-03T21:59:00Z"), "America/New_York"), "day", "5:59 PM local is day");
eq(G.atmosphere(g("scheduled", false, "2026-10-03T22:00:00Z"), "America/New_York"), "night", "6:00 PM local is night");
eq([G.atmosphere(g("scheduled", false, "2026-10-04T00:00:00Z"), "America/Los_Angeles"),
    G.atmosphere(g("scheduled", false, "2026-10-04T00:00:00Z"), "America/New_York")], ["day", "night"],
   "the venue's clock decides: the same kickoff is 5 PM (day) in Pacific time and 8 PM (night) in Eastern");
eq(G.atmosphere(g("scheduled", false, "2026-10-04T01:00:00Z", { timeSet: false }), "America/New_York"), null,
   "no kickoff time announced: no atmosphere");

console.log("venueZone");
eq(G.venueZone({ venueState: "IN", city: "Notre Dame" }), "America/Indiana/Indianapolis", "Indiana");
eq(G.venueZone({ venueState: "TN", city: "Knoxville" }), "America/New_York", "Knoxville is Eastern though Tennessee is mostly Central");
eq(G.venueZone({ venueState: "TX", city: "El Paso" }), "America/Denver", "El Paso is Mountain");
eq(G.venueZone({ venueState: "", city: "" }, "America/New_York"), "America/New_York", "no state: the fallback");

// ---- Home's schedule preview (0024 §3) -------------------------------------
console.log("schedulePreview");
function wk(n, status, started) {   // week n of a 12-game season, Saturdays 3:30 PM ET
  var d = new Date(Date.UTC(2026, 8, 5 + 7 * (n - 1), 19, 30));
  return g(status, started, d.toISOString());
}
function season12(played, rest) {   // `played` finals, then `rest` overrides by week
  var out = [];
  for (var n = 1; n <= 12; n++) out.push(n <= played ? wk(n, "final", true) : wk(n, "scheduled", false));
  Object.keys(rest || {}).forEach(function (k) { out[k - 1] = wk(Number(k), rest[k][0], rest[k][1]); });
  return out;
}
function weeks(list) { return list.map(function (x) { return (new Date(x.date).getUTCDate()); }); }
function prev(games, iso) { return G.schedulePreview(games, new Date(iso), ZONE); }
function wkDates(ns) { return ns.map(function (n) { return new Date(Date.UTC(2026, 8, 5 + 7 * (n - 1))).getUTCDate(); }); }
function preview(games, iso) { return weeks(prev(games, iso)); }

eq(preview(season12(0), "2026-08-20T12:00:00Z"), wkDates([1, 2, 3]), "preseason: the first three games");
eq(preview(season12(4), "2026-09-30T12:00:00Z"), wkDates([4, 5, 6]),
   "upcoming hero in season: the last result, the hero, the game after");
eq(preview(season12(4, { 5: ["live", true] }), "2026-10-03T20:00:00Z"), wkDates([5, 6, 7]),
   "live: the live game and the next two - never a previous result instead of it");
eq(preview(season12(4, { 5: ["delayed", true] }), "2026-10-03T20:00:00Z"), wkDates([5, 6, 7]), "an in-game delay: the same as live");
eq(preview(season12(4, { 5: ["suspended", true] }), "2026-10-03T20:00:00Z"), wkDates([5, 6, 7]), "suspended: the same as live");
eq(preview(season12(5), "2026-10-04T14:00:00Z"), wkDates([5, 6, 7]), "recent-final hero: that game and the next two");
eq(preview(season12(4, { 5: ["postponed", false] }), "2026-09-30T12:00:00Z"), wkDates([5, 6, 7]),
   "postponed hero: the postponed game, then the next valid games");
eq(preview(season12(4, { 5: ["canceled", false] }), "2026-09-30T12:00:00Z"), wkDates([5, 6, 7]),
   "a canceled game stays in the chronology: the week before is it, then the new hero, then the next");
eq(preview(season12(12), "2026-12-15T12:00:00Z"), wkDates([10, 11, 12]), "after the season: the last three");
eq(preview(season12(11), "2026-11-25T12:00:00Z"), wkDates([10, 11, 12]),
   "the last game upcoming: the hero stays in, filled from before when nothing follows");
eq(preview(season12(11, { 12: ["live", true] }), "2026-11-28T20:00:00Z"), wkDates([10, 11, 12]),
   "the last game live: two before fill the rows the missing future cannot");
eq(prev(season12(4), "2026-09-30T12:00:00Z").length, 3, "never more than three");
eq(prev(season12(4).slice(0, 2), "2026-09-30T12:00:00Z").length, 2, "and a two-game list is just those two");
var shuffled = season12(4); shuffled.reverse();
eq(preview(shuffled, "2026-09-30T12:00:00Z"), wkDates([4, 5, 6]), "the input's order does not matter; the output is chronological");

console.log("\n" + (failures ? failures + " check(s) FAILED" : "one set of game rules, and every state has an answer"));
process.exit(failures ? 1 : 0);
