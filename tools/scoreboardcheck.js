#!/usr/bin/env node
/* The scoreboard component (suite/scoreboard.js), unit checks on two edges
   Codex found on #239:
   - a final whose score the source left out is never read out as 0-0;
   - a stage given no zone still gets its day or night lighting, from the
     venue's state, then the team's own zone.

   Usage:  node tools/scoreboardcheck.js */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");
var root = path.join(__dirname, "..");
function read(p) { return fs.readFileSync(path.join(root, p), "utf8"); }
var failures = 0;
function ok(c, what) { console.log((c ? "  ok   " : "  FAIL ") + what); if (!c) failures++; }

var ctx = vm.createContext({ console: console, Intl: Intl, Date: Date });
["teams/notre-dame.js", "teamos/team.js", "teamos/identity.js", "teamos/espn.js", "teamos/game.js"].forEach(function (f) { vm.runInContext(read(f), ctx, { filename: f }); });
ctx.document = { addEventListener: function () {}, fonts: null };
ctx.window = { addEventListener: function () {} };
["suite/ui.js", "suite/schedule.js", "suite/prospects.js", "suite/home.js", "suite/scoreboard.js"].forEach(function (f) { vm.runInContext(read(f), ctx, { filename: f }); });
var SB = ctx.Suite.scoreboard;

function game(o) {
  return Object.assign({ id: "1", status: "final", state: "post", hasStarted: true, oppName: "Navy", oppAbbr: "NAVY",
                         home: true, timeSet: true, date: "2026-10-31T16:00:00Z", us: 49, them: 10 }, o || {});
}
function label(html) { var m = /aria-label="([^"]*)"/.exec(html); return m ? m[1] : ""; }
var team = { name: "Notre Dame", abbr: "ND", markUrl: null, timeZone: "America/New_York" };

console.log("what a screen reader hears");
ok(/Final\. Notre Dame 49, Navy 10\./.test(label(SB.board({ team: team, game: game() }))), "a final with its score reads the score");
var noScore = label(SB.board({ team: team, game: game({ us: null, them: null }) }));
ok(/^Final\. Notre Dame versus Navy\.$/.test(noScore) && !/\b0\b/.test(noScore), "a final with no score reads no score, never 0-0 (" + noScore + ")");
var half = label(SB.board({ team: team, game: game({ us: 21, them: "" }) }));
ok(!/\b0\b/.test(half) && !/21/.test(half), "one score missing: neither is read out (" + half + ")");

console.log("the stage's light, without a zone given");
function art(g, t, opts) { var m = /class="stage [^"]*"/.exec(SB.stage({ team: t || team, game: g }, opts || { variant: "home" })); return m ? m[0] : ""; }
ok(/art-night/.test(art(game({ status: "pre", state: "pre", hasStarted: false, date: "2026-11-15T00:30:00Z", venueState: "IN" })) ),
   "7:30 PM kickoff in Indiana, no zone passed: night, from the venue's state");
ok(/art-day/.test(art(game({ status: "pre", state: "pre", hasStarted: false, date: "2026-11-14T17:00:00Z", venueState: "IN" }))),
   "noon kickoff in Indiana: day");
ok(/art-night/.test(art(game({ status: "pre", state: "pre", hasStarted: false, date: "2026-11-15T00:30:00Z" }))),
   "no venue state: the team's own zone decides (7:30 PM Eastern, night)");
ok(/art-day/.test(art(game({ status: "pre", state: "pre", hasStarted: false, date: "2026-11-15T00:30:00Z", venueState: "CA" }))),
   "4:30 PM in California is day, whatever the team's own zone");
ok(/art-day/.test(art(game({ status: "pre", state: "pre", hasStarted: false, date: "2026-11-15T00:30:00Z" }), team, { variant: "home", zone: "America/Los_Angeles" })),
   "a zone the caller gives wins");
ok(!/art-(day|night)/.test(art(game({ status: "pre", state: "pre", hasStarted: false, timeSet: false }))), "no kickoff time: no atmosphere");

console.log("");
if (failures) { console.log(failures + " check(s) FAILED"); process.exit(1); }
console.log("the scoreboard reads only what it was given, and lights by the venue's clock");
