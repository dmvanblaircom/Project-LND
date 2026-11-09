#!/usr/bin/env node
/* TeamOS.season on games that were never played (code review, 2026-11-09):
   a postponed or canceled game is not a final - not in the averages, not
   the postseason's result - and an empty score is no score.

   Usage:  node tools/seasoncheck.js */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");
var root = path.join(__dirname, "..");
var ctx = vm.createContext({ console: console, Date: Date });
["teamos/game.js", "teamos/season.js"].forEach(function (f) { vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f }); });
var SE = ctx.TeamOS.season;
var failures = 0;
function ok(c, what) { console.log((c ? "  ok   " : "  FAIL ") + what); if (!c) failures++; }

function g(o) { return Object.assign({ id: String(Math.random()), state: "post", status: "final", date: "2026-09-06T19:30:00Z" }, o); }
var games = [g({ them: 10 }), g({ them: 20 }), g({ them: "0", status: "canceled", date: "2026-09-13T19:30:00Z" }), g({ them: "", status: "postponed", date: "2026-09-20T19:30:00Z" })];
var pa = SE.pointsAllowedPerGame ? SE.pointsAllowedPerGame(games) : null;
var pv = pa && typeof pa === "object" ? pa.value : pa;
ok(pv === 15, "points allowed per game counts the two games played, not the canceled 0 (" + JSON.stringify(pa) + ")");
if (SE.gamesCounted) ok(SE.gamesCounted(games) === 2, "games counted: 2 (" + SE.gamesCounted(games) + ")");

var post = [g({ date: "2026-09-06T19:30:00Z", won: true }), g({ date: "2026-12-27T19:30:00Z", postseason: true, status: "canceled", won: undefined })];
var ph = SE.phase({ games: post, now: new Date("2026-12-28T12:00:00Z") });
ok(!(ph && ph.ended === "lost"), "a canceled bowl is not a loss (" + JSON.stringify(ph && { state: ph.state, ended: ph.ended }) + ")");

var reg = [g({ date: "2026-11-01T19:30:00Z" }), g({ date: "2026-11-22T19:30:00Z", state: "post", status: "postponed" })];
var ph2 = SE.phase({ games: reg, now: new Date("2026-11-10T12:00:00Z") });
ok(ph2 && ph2.state === "in-season", "a postponed game still dated ahead keeps the season in-season (" + (ph2 && ph2.state) + ")");

console.log("");
if (failures) { console.log(failures + " check(s) FAILED"); process.exit(1); }
console.log("a game never played is never counted as one");
