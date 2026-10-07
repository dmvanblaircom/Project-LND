#!/usr/bin/env node
/* One request out at a time (W10): two wake-ups at once must not fetch the
   same thing twice.

   Returning to the app mid-game fires the live tick and the stale refresh
   together; a slow answer outlasts the live poller's interval. Both used to
   send the schedule and postseason requests again. This lifts the real
   refreshSchedule out of app.js into a bare Node scope with the network
   stubbed, holds the answer, calls it twice, and counts.

   Usage: node tools/pollcheck.js [path/to/app.js]   (exit 1 on failure) */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");
var root = path.join(__dirname, "..");
var appFile = process.argv[2] || path.join(root, "app.js");
var appSrc = fs.readFileSync(appFile, "utf8").replace(/\r\n/g, "\n");

var failures = 0;
function ok(cond, what) { if (cond) { console.log("  ok   " + what); return; } failures++; console.log("  FAIL " + what); }

function liftFn(name) {
  var m = appSrc.match(new RegExp("^function " + name + "\\([^)]*\\)\\{[\\s\\S]*?^\\}", "m"));
  if (!m) throw new Error("could not find " + name + " in app.js");
  return m[0] + "\n";
}
var S_DECL = (appSrc.match(/^var S = \{[^\n]*\};$/m) || ["var S = { games:null, next:null, oddsTried:null };"])[0];

function scope() {
  var c = vm.createContext({ console: console, Promise: Promise, setTimeout: setTimeout });
  vm.runInContext([
    S_DECL,
    "var SB = { games: null }, SC = {}, POST = null, TEAM = {}, TEAM_CONFIG = {}, window = {};",
    "var asked = [], answer = [];",
    "var TeamOS = { espn: { scheduleUrl: function(){ return 'SCHEDULE'; }, postseasonUrl: function(){ return 'POST'; },",
    "                       schedule: function(){ return []; }, joinSeason: function(d){ return d; } },",
    "               live: { reconcileAll: function(g){ return g; } }, game: { underWay: function(){ return false; } } };",
    // the network: every request is counted and held until the check lets it answer
    "function get(url){ asked.push(url); return new Promise(function(res){ answer.push(function(){ res({ events: [] }); }); }); }",
    "function cachedJSON(){ return Promise.reject(new Error('no cache')); }",
    "function hasEvents(){ return true; } function outcomeOf(){ return 'network'; } function say(){}",
    "function startAuto(){} function paintScheduleScreen(){} function paintHome(){} function paintGame(){} function paintTop25(){} function statsInputsChanged(){}",
    "function warmTabs(){} function summaryFor(){ return Promise.reject(new Error('none')); } function applyGameRules(){}"
  ].join("\n"), c);
  vm.runInContext(liftFn("refreshSchedule"), c);
  return c;
}
function settle() { return new Promise(function (r) { setTimeout(r, 0); }); }

(async function () {
  console.log("the schedule: one request out at a time");
  var c = scope();
  var a = vm.runInContext("refreshSchedule(false)", c);
  var b = vm.runInContext("refreshSchedule(false)", c);
  var sched = function () { return c.asked.filter(function (u) { return u === "SCHEDULE"; }).length; };
  var post = function () { return c.asked.filter(function (u) { return u === "POST"; }).length; };
  ok(sched() === 1 && post() === 1, "two callers at once: one schedule and one postseason request (" + sched() + ", " + post() + ")");
  c.answer.forEach(function (f) { f(); });
  var ra = await a, rb = await b;
  ok(ra && rb && ra.outcome === "network" && rb.outcome === "network", "and both callers get the answer");
  await settle();
  vm.runInContext("refreshSchedule(false)", c);
  ok(sched() === 2, "once it has answered, the next call asks again: joining never serves an old copy");

  console.log("a kickoff that passes with the game still upcoming: look, then back off (W10)");
  var k = vm.createContext({});
  vm.runInContext(liftFn("lateKickoffDue"), k);
  var due = function (next, now, last) { return k.lateKickoffDue(next, now, last); };
  var KO = Date.parse("2026-10-10T19:30:00Z"), MIN = 60e3;
  var pre = { state: "pre", timeSet: true, date: "2026-10-10T19:30:00Z" };
  ok(!due(pre, KO - MIN, 0), "before kickoff: not due");
  ok(due(pre, KO, 0), "at kickoff: due");
  var asks = 0, last = 0;
  for (var t = KO; t <= KO + 60 * MIN; t += MIN) if (due(pre, t, last)) { asks++; last = t; }
  // minutes 0-9 every minute (10), then five after the last: 14, 19 ... 59 (10)
  ok(asks === 20, "the first hour past kickoff: 10 looks in the first ten minutes, then one every five (" + asks + " in all), not 61");
  ok(due(pre, KO + 3 * MIN + 500, KO + 2 * MIN + 1000), "a tick that lands a little early still counts as the minute");
  ok(!due(pre, KO + 9 * 3600e3, 0), "eight hours on, it stops: the half-hour refresh covers a game that never started");
  ok(!due({ state: "in", timeSet: true, date: pre.date }, KO + MIN, 0), "a game under way is the live poller's, not this");
  ok(!due({ state: "pre", timeSet: false, date: pre.date }, KO + MIN, 0), "a kickoff time not yet set is never 'passed'");
  ok(!due(null, KO, 0), "no next game: nothing to do");

  console.log("refresh data: once schedule and scoreboard are both in, they are reconciled");
  ok(/return Promise\.all\(steps\)\.then\(function\(r\)\{[\s\S]{0,600}?if\(SB\.games\) scoreboardArrived\(\);/.test(liftFn("refreshAll")),
     "refreshAll reconciles after every step has settled");

  console.log("\n" + (failures ? failures + " check(s) FAILED" : "no duplicate requests, and a late kickoff backs off"));
  process.exit(failures ? 1 : 0);
})();
