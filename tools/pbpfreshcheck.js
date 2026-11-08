#!/usr/bin/env node
/* Play-by-play freshness (creative direction, 2026-11-08): when the game
   clock runs well ahead of the latest play the record holds, Game's Last
   Play card says "Play-by-play is catching up" and the drive card stops
   quoting a description and counts - one state for both - and when the
   record catches up, everything is as before.

   Built on the real payload: ND-Miami, 2026-11-07 (event 401858291). At
   12:05 of the 3rd ESPN's record held nothing after the 15:00 kickoff (the
   screenshot David sent); minutes later nine plays arrived, every one
   stamped 12:05 (tools/fixtures/espn-summary-nd-mia-live-caughtup.json).
   The "behind" summary here is that capture cut back to the kickoff - what
   the screenshot shows the record held - not an invented one.

   Usage:  node tools/pbpfreshcheck.js */
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
["suite/ui.js", "suite/schedule.js", "suite/prospects.js", "suite/home.js", "suite/game.js"].forEach(function (f) { vm.runInContext(read(f), ctx, { filename: f }); });
var TeamOS = ctx.TeamOS, Suite = ctx.Suite, CFG = ctx.TEAM_CONFIG, TEAM = TeamOS.createTeam(CFG.team);
var G = TeamOS.game;

// ---- the payloads ------------------------------------------------------------
var caught = JSON.parse(read("tools/fixtures/espn-summary-nd-mia-live-caughtup.json"));
function cutToKickoff(d) {
  var x = JSON.parse(JSON.stringify(d)), prev = x.drives.previous;
  var at = prev.findIndex(function (dr) { return (dr.plays || []).some(function (p) { return p.period.number === 3 && p.clock.displayValue === "15:00" && /kickoff/i.test(p.type.text); }); });
  var drive = prev[at];
  drive.plays = drive.plays.slice(0, 1);
  drive.description = "0 plays, 0 yards, 0:00"; drive.offensivePlays = 0; delete drive.result; delete drive.displayResult;
  // At that moment ESPN held the kickoff as a Notre Dame drive (the
  // screenshot: "NOTRE DAME DRIVE", its start marker at the 35); it files it
  // under Miami's now.
  drive.team = { id: "87", abbreviation: "ND" };
  x.drives.previous = prev.slice(0, at + 1);
  x.drives.current = drive;
  x.scoringPlays = (x.scoringPlays || []).filter(function (p) { return !(p.period.number === 3); });
    // and the score as it stood: the 3rd's touchdown not yet on the board;
    // the box score and leaders, which the capture took later, left out.
    x.header.competitions[0].competitors.forEach(function (c) {
      if (c.team && String(c.team.id) === "87") { c.score = "17"; if (c.linescores && c.linescores[2]) c.linescores[2].displayValue = "0"; }
    });
    delete x.boxscore; delete x.leaders;
  return x;
}
var behindRaw = cutToKickoff(caught);
function detail(d) { return TeamOS.espn.gameDetail(d, TEAM, CFG); }
var DET_BEHIND = detail(behindRaw), DET_CAUGHT = detail(caught);
// The game as the scoreboard had it: live, 3rd quarter, 12:05.
function game(clock, period, o) {
  return Object.assign({ id: "401858291", status: "live", hasStarted: true, state: "in", period: period || 3, clock: clock,
                         detail: clock + " - 3rd", us: 17, them: 3, oppName: "Miami", oppAbbr: "MIA", home: true, timeSet: true,
                         date: "2026-11-07T23:30:00Z" }, o || {});
}

console.log("the rule (TeamOS.game.feedState), on the real game");
var s1 = G.feedState(game("12:05"), DET_BEHIND, false);
ok(s1.behind && s1.gap === 175, "12:05 of the 3rd, the record at the 15:00 kickoff: behind, 175 s of game time (" + JSON.stringify({ b: s1.behind, gap: s1.gap }) + ")");
ok(s1.play && s1.play.period === 3 && s1.play.clock === "15:00" && /kickoff/i.test(s1.play.text), "the latest logged play is the kickoff, with its own quarter and clock");
var s2 = G.feedState(game("12:05"), DET_CAUGHT, true);
ok(!s2.behind && s2.gap === 0, "the nine plays arrive (all stamped 12:05): caught up");
var s3 = G.feedState(game("11:30"), DET_CAUGHT, false);
ok(!s3.behind, "the game goes on, the record keeping up: normal");

console.log("the rule, at its edges");
function playsAt(list) { return { drives: { list: [{ plays: list.map(function (x) { return { period: x[0], clock: x[1], text: "x" }; }) }] } }; }
ok(!G.feedState(game("15:00"), playsAt([[2, "0:00"]]), false).behind, "the 2nd ends at 0:00, the 3rd starts at 15:00: a quarter turning over is no gap");
ok(!G.feedState(game("15:00", 2), playsAt([[1, "0:04"]]), false).behind, "the 1st's last play at 0:04, the 2nd at 15:00: 4 s, not behind");
ok(G.feedState(game("13:30", 2), playsAt([[1, "0:04"]]), false).behind, "a new quarter counts as far as its clock has run: 1:34 with nothing logged is behind");
ok(!G.feedState(game("13:31"), playsAt([[3, "15:00"]]), false).behind, "89 s: not yet");
ok(G.feedState(game("13:30"), playsAt([[3, "15:00"]]), false).behind, "90 s: behind");
ok(G.feedState(game("13:50"), playsAt([[3, "15:00"]]), true).behind, "already behind, 70 s: stays behind (no flicker near the line)");
ok(!G.feedState(game("14:01"), playsAt([[3, "15:00"]]), true).behind, "already behind, 59 s: caught up");
ok(!G.feedState(game("0:00", 2, { detail: "Halftime" }), playsAt([[2, "5:00"]]), false).behind, "halftime: never");
ok(!G.feedState(game("", 5), playsAt([[4, "0:00"]]), false).behind, "overtime has no clock: never");
ok(!G.feedState(game("12:05", 3, { status: "final" }), DET_BEHIND, false).behind, "a final: never");
ok(!G.feedState(game("12:05"), null, false).behind, "no summary yet: nothing is claimed");
ok(!G.feedState(game("12:05"), { drives: null }, false).behind, "a summary with no drives: nothing is claimed");

// ---- what Game draws -----------------------------------------------------------
function draw(det, feed, view) {
  var parts = {};
  var host = { innerHTML: "", querySelector: function (q) {
    var k = (/data-game="(\w+)"/.exec(q) || [])[1];
    if (q === "[data-game]") return host.innerHTML ? {} : null;
    return k ? (parts[k] || (parts[k] = { innerHTML: "", hidden: false })) : null;
  }, querySelectorAll: function () { return []; } };
  var g = game("12:05"), lc = G.lifecycle(g);
  Suite.game.paint(host, { team: { name: TEAM.name, abbr: TEAM.abbreviation, markUrl: null }, oppMark: function () { return null; },
    game: g, detail: det, feed: feed, lifecycle: lc, base: "#game", view: view || "drive", preview: null, side: "us", open: {}, weather: null, now: new Date("2026-11-08T01:30:00Z") });
  return Object.keys(parts).map(function (k) { return parts[k].innerHTML; }).join("\n") + host.innerHTML;
}
console.log("Game, while the record is behind");
var hb = draw(DET_BEHIND, s1);
ok(/Play-by-play is catching up/.test(hb) && /The game clock is ahead of the latest recorded play\./.test(hb), "the Last Play card says the play-by-play is catching up, and why");
ok(/<span class="lp-at">3rd · 15:00 · ND<\/span> M\. ?Drescher kickoff/.test(hb.replace(/&nbsp;|\u00A0/g, " ")), "the latest logged play stays, with its own quarter, clock and team as the record has them");
ok(/Latest recorded drive/.test(hb) && /Drive details updating/.test(hb), "the drive card: 'Latest recorded drive', 'Drive details updating'");
ok(!/Notre Dame drive|Miami drive/i.test(hb) && !/0 plays, 0 yards/.test(hb), "no team named as having the drive, and no count");
ok(!/class="field"/.test(hb) && !/f-legend/.test(hb), "no field drawing and no legend: no stale ownership or field position");
ok(/gcard-neutral/.test(hb) && !/--drive:/.test(hb), "the platform's neutral treatment, no team colour on the drive");
ok(/Drive and field position return when the play-by-play catches up\./.test(hb), "a quiet placeholder says the drive comes back with the record");
ok((hb.match(/catching up/g) || []).length === 1, "one indicator, in one place: the drive card does not repeat it");
ok(!/lp-dd/.test(hb), "no down and distance from the record: it has not caught up with the situation");
ok(!/animation|pbp-pulse|spinner/i.test(hb), "no spinner, nothing animated");

console.log("Game, the record caught up");
var hc = draw(DET_CAUGHT, s2);
ok(!/catching up/.test(hc) && !/Drive details updating/.test(hc), "the indicator is gone");
ok(/Carr|C\.Carr|C\. Carr/.test(hc) && /3 plays, 30 yards/.test(hc), "the latest play and the drive's own description are back");
ok(/Notre Dame drive/i.test(hc) && /class="field"/.test(hc) && !/gcard-neutral/.test(hc), "caught up: the team's drive card and its field are back");
var hp = draw(DET_CAUGHT, s2, "plays").replace(/ /g, " ");
var order = [], from = 0;
["M. Drescher kickoff 30 yards", "D. Mensah rush middle for 13 yards", "D. Joyce punt 59 yards", "M. Gilbert"].forEach(function (t) {
  var i = hp.indexOf(t, from); order.push(i); if (i > -1) from = i + 1;
});
ok(order.every(function (i) { return i > -1; }), "the plays that arrived at once read in the order they were played: kickoff, Miami's drive, the punt, the touchdown (" + order.join(", ") + ")");

console.log("the app wires one state, announced once");
var app = read("app.js");
ok(/feed:\s*feedOf\(V,\s*g\)/.test(app), "the Game model carries the one state, for both cards");
ok(/if\(f\.behind && !V\.behind\) say\("Play-by-play is catching up\./.test(app), "going behind is announced politely, once - not on every refresh, and not when it catches up");
ok(!/feedOf|feed:/.test(read("suite/home.js")), "Home's hero shows no indicator");

console.log("");
if (failures) { console.log(failures + " check(s) FAILED"); process.exit(1); }
console.log("the play-by-play's freshness is said once, calmly, and only while the record is behind");
