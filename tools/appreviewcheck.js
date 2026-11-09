#!/usr/bin/env node
/* app.js rules found by the code review of 2026-11-09, each run on its own:
   the function is lifted out of app.js as written and called with the
   collaborators it uses stubbed, so the rule is tested, not a copy of it.

   - the play-by-play is judged behind only against a recent summary;
   - a tick whose schedule poll failed still brings its scoreboard to Home
     and Game;
   - a manual refresh that throws still ends;
   - the team's status answered from the worker's copy counts as cached;
   - an odds answer of the wrong shape never counts as fresh;
   - the snapshot for a market path comes from the league's series names.

   Usage:  node tools/appreviewcheck.js */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");
var root = path.join(__dirname, "..");
var APP = fs.readFileSync(path.join(root, "app.js"), "utf8");
var failures = 0;
function ok(c, what) { console.log((c ? "  ok   " : "  FAIL ") + what); if (!c) failures++; }

// The source of one top-level function, by its braces.
function lift(name) {
  var at = APP.indexOf("\nfunction " + name + "(");
  if (at < 0) throw new Error("app.js has no function " + name);
  var i = APP.indexOf("{", at), depth = 0;
  for (; i < APP.length; i++) {
    var c = APP[i];
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) break; }
  }
  return APP.slice(at + 1, i + 1);
}
function constant(name) {
  var m = new RegExp("\\nvar " + name + "=([^;]+);").exec(APP);
  return m ? "var " + name + "=" + m[1] + ";" : "";
}
function run(ctx, names, extra) {
  vm.runInContext((extra || "") + "\n" + names.map(lift).join("\n"), ctx);
  return ctx;
}

console.log("the play-by-play is judged behind only against a recent summary");
(function () {
  var said = [];
  var ctx = vm.createContext({ Date: Date, say: function (t) { said.push(t); },
    TeamOS: { game: { feedState: function (g, d, was) { return { behind: true, gap: 300, play: null }; } } } });
  run(ctx, ["feedOf"], constant("FEED_FRESH_MS"));
  var V = { gd: {}, gdAt: Date.now() - 4 * 60e3, behind: false };
  var f = ctx.feedOf(V, {});
  ok(!f.behind && !said.length && V.behind === false, "back on Game after 4 minutes, the summary on hand is old: not behind, nothing announced");
  V.gdAt = Date.now();
  f = ctx.feedOf(V, {});
  ok(f.behind && said.length === 1 && V.behind === true, "the fresh summary says behind: behind, announced once");
  V.gdAt = Date.now() - 4 * 60e3;
  f = ctx.feedOf(V, {});
  ok(f.behind && said.length === 1, "behind already, the summary aging: still behind, not announced again");
})();

console.log("a tick whose schedule poll failed still brings its scoreboard to Home and Game");
(function () {
  var calls = [];
  var ctx = vm.createContext({ document: { hidden: false }, SB: { games: [{ id: "1" }] },
    somethingLive: function () { return true; }, startAuto: function () {},
    getScoreboard: function () { return Promise.resolve({}); },
    refreshSchedule: function () { return Promise.resolve({ key: "schedule", outcome: "failed" }); },
    scoreboardArrived: function () { calls.push("arrived"); },
    paintGame: function () { calls.push("game"); }, paintTop25: function () { calls.push("top25"); } });
  run(ctx, ["autoTick"]);
  ctx.autoTick();
  return new Promise(function (r) { setTimeout(r, 20); }).then(function () {
    ok(calls.indexOf("arrived") > -1 && calls.indexOf("arrived") < calls.indexOf("game"), "the schedule failed: the scoreboard is reconciled before Game redraws (" + calls.join(", ") + ")");
  });
})().then(function () {
  console.log("a manual refresh that throws still ends");
  var painted = 0;
  var ctx = vm.createContext({ Date: Date, MORE: { p: null, refreshing: false, result: null },
    paintMore: function () { painted++; },
    refreshAll: function () { return Promise.reject(new Error("a renderer threw")); } });
  run(ctx, ["refreshResult", "manualRefresh"]);
  return ctx.manualRefresh().then(function (r) {
    ok(ctx.MORE.p === null && ctx.MORE.refreshing === false, "the refresh ended: Refresh Data and pull to refresh work again");
    ok(/Couldn.t refresh/.test(r.say), "and it says it could not refresh (" + r.say + ")");
  }, function () { ok(false, "manualRefresh rejected; the refresh never ends"); });
}).then(function () {
  console.log("the team's status from the worker's copy counts as cached");
  var ctx = vm.createContext({ SRC: {}, Date: Date, HOME: {}, paintHome: function () {}, Suite: { nav: { current: function () { return { screen: "home" }; } } },
    EDGE: "https://edge", TEAM_CONFIG: {},
    TeamOS: { espn: { teamUrl: function () { return "https://site/teams/87"; }, scheduleUrl: function () { return "s"; }, rankingsUrl: function () { return "r"; },
                      rosterUrl: function () { return "ro"; }, teamStatus: function () { return {}; } },
              snapshots: { get: function () { return null; } } },
    fetchJSON: function (url) { return Promise.resolve({ data: { team: {} }, cached: new Date().toUTCString() }); } });
  run(ctx, ["get", "outcomeOf", "sourceKey", "noteSource", "loadTeamStatus"]);
  return ctx.loadTeamStatus().then(function (r) {
    ok(r.outcome === "cached", "offline, the team step answered from the kept copy reports cached, not network (" + r.outcome + ")");
  });
}).then(function () {
  console.log("an odds answer of the wrong shape never counts as fresh");
  var ctx = vm.createContext({ SRC: {}, Date: Date, Suite: { nav: { current: function () { return { screen: "home" }; } } }, EDGE: "https://edge", TEAM_CONFIG: {},
    LEAGUE_MARKETS: { title: { series: "KXNCAAF" }, playoff: { series: "KXNCAAFPLAYOFF" } },
    TeamOS: { espn: { teamUrl: function () { return "t"; }, scheduleUrl: function () { return "s"; }, rankingsUrl: function () { return "r"; }, rosterUrl: function () { return "ro"; } },
              snapshots: { get: function () { return null; } } },
    fetchJSON: function () { return Promise.resolve({ data: { truncated: true }, cached: null }); } });
  run(ctx, ["get", "outcomeOf", "sourceKey", "noteSource", "localSnapshot"], "var KALSHI_ROUTES=[function(p){ var f=localSnapshot(p); if(!f) throw new Error('none'); return f+'?t=1'; }];");
  run(ctx, ["kalshi"]);
  return ctx.kalshi("/series/KXNCAAF-26/markets").then(function () { ok(false, "an unusable odds answer was accepted"); }, function () {
    ok(!ctx.SRC.odds, "the snapshot came back without markets: odds not marked fresh (" + JSON.stringify(ctx.SRC.odds || null) + ")");
  });
}).then(function () {
  console.log("the snapshot for a market path is the league's");
  var ctx = vm.createContext({ LEAGUE_MARKETS: { title: { series: "KXNEW" }, playoff: { series: "KXNEWPLAYOFF" } } });
  run(ctx, ["localSnapshot"]);
  ok(ctx.localSnapshot("/events/KXNEWPLAYOFF-26") === "data/league/odds-playoff.json" && ctx.localSnapshot("/events/KXNEW-27") === "data/league/odds-title.json",
     "a league whose series are renamed still finds its snapshots");
  ok(ctx.localSnapshot("/events/KXNCAAF-26") === null, "no series written into app.js");
}).then(function () {
  console.log("");
  if (failures) { console.log(failures + " check(s) FAILED"); process.exit(1); }
  console.log("app.js's refresh rules hold where the review found them weak");
}).catch(function (e) { console.error(e); process.exit(1); });
