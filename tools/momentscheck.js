#!/usr/bin/env node
/* Game moments (Phase 2 spec §7): a moment is a change a refresh observed,
   only as specific as the normalized data says, and never on a first,
   cached, hidden or catch-up paint. Pure TeamOS, no browser.

   Usage:  node tools/momentscheck.js */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");
var root = path.join(__dirname, "..");
var ctx = vm.createContext({ console: console });
["teamos/game.js", "teamos/moments.js"].forEach(function (f) { vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f }); });
var M = ctx.TeamOS.moments;

var failures = 0;
function ok(c, what) { console.log((c ? "  ok   " : "  FAIL ") + what); if (!c) failures++; }
function kind(m) { return m ? m.kind + (m.side ? "/" + m.side : "") : null; }

function game(o) { return Object.assign({ id: "1", status: "live", hasStarted: true, us: 7, them: 3, oppName: "Opponent" }, o || {}); }
function play(id, mine, text) { return { id: id, mine: mine, text: text, period: 2, clock: "5:00" }; }
function detail(scoring, last) { return { scoring: scoring, lastPlay: last || null }; }
var base = { game: game(), detail: detail([play("a", true, "J. Doe 2 Yd Run (K. Kick)"), play("b", false, "R. Leg 30 Yd Field Goal")], { at: "6:00", text: "Pass complete", tags: [] }) };

console.log("lifecycle");
ok(kind(M.detect({ game: game({ status: "scheduled", hasStarted: false, us: null, them: null }), detail: null },
                 { game: game({ us: 0, them: 0 }), detail: detail([]) })) === "kickoff", "scheduled to under way: kickoff");
ok(kind(M.detect(base, { game: game({ status: "final" }), detail: base.detail })) === "final", "under way to final: final");
ok(M.detect(base, { game: game({ id: "2" }), detail: base.detail }) === null, "a different game is never a change");
ok(M.detect(base, base) === null, "nothing changed: no moment");

console.log("scores, as specific as the data says");
var td = { game: game({ us: 14 }), detail: detail(base.detail.scoring.concat([play("c", true, "A. Back 12 Yd Pass from Q. Back (K. Kick)")]),
                                                  { at: "3:10", text: "A. Back 12 yd pass, TOUCHDOWN", tags: ["Touchdown"] }) };
var m = M.detect(base, td);
ok(kind(m) === "touchdown/us" && m.points === 7 && m.count === 1, "one new score, the play tagged Touchdown: touchdown for us (" + JSON.stringify(m) + ")");
var tdUntagged = { game: td.game, detail: detail(td.detail.scoring, { at: "3:10", text: "A. Back 12 yd pass", tags: [] }) };
ok(kind(M.detect(base, tdUntagged)) === "score/us", "the same score with no Touchdown tag: only a score update - points are not a classification");
var fg = { game: game({ them: 6 }), detail: detail(base.detail.scoring.concat([play("c", false, "R. Leg 41 Yd Field Goal")]), base.detail.lastPlay) };
ok(kind(M.detect(base, fg)) === "fieldgoal/them", "scoring text says Field Goal: field goal, theirs");
var sf = { game: game({ us: 9 }), detail: detail(base.detail.scoring.concat([play("c", true, "Safety, ball carrier tackled in end zone")]), base.detail.lastPlay) };
ok(kind(M.detect(base, sf)) === "safety/us", "scoring text says Safety: safety");
var two = { game: game({ us: 14, them: 6 }), detail: detail(base.detail.scoring.concat([play("c", true, "x"), play("d", false, "y Field Goal")]), base.detail.lastPlay) };
var mm = M.detect(base, two);
ok(kind(mm) === "score" && mm.side === null && mm.count === 2, "both sides scored between refreshes: one generic update, no invented order");
var twoUs = { game: game({ us: 17 }), detail: detail(base.detail.scoring.concat([play("c", true, "Field Goal"), play("d", true, "Run (Kick)")]), { at: "1:00", text: "x", tags: ["Touchdown"] }) };
ok(kind(M.detect(base, twoUs)) === "score/us" && M.detect(base, twoUs).points === 10, "two of our scores between refreshes: a generic update with the points, not a touchdown");
var mismatch = { game: game({ us: 10 }), detail: detail(base.detail.scoring.concat([play("c", false, "Field Goal")]), base.detail.lastPlay) };
ok(kind(M.detect(base, mismatch)) === "score/us", "the new play is theirs but our score moved: nothing specific is said");
var noDetail = { game: game({ us: 10 }), detail: null };
ok(kind(M.detect(base, noDetail)) === "score/us", "no detail yet: the score alone, generic");

// Codex review, 2026-11-09: the points must be the kind's, and a first look
// with no summary knows nothing of the plays.
var lagTD = { game: game({ us: 17 }), detail: detail(base.detail.scoring.concat([play("c", true, "K. Kick 30 Yd Field Goal")]), { at: "1:00", text: "x 5 yd run, TOUCHDOWN", tags: ["Touchdown"] }) };
ok(kind(M.detect(base, lagTD)) === "score/us", "the score moved 10, the list holds only the field goal, the last play a touchdown: generic, not a touchdown");
var fakeFG = { game: game({ us: 14 }), detail: detail(base.detail.scoring.concat([play("c", true, "H. Older 12 Yd pass on fake field goal (K. Kick)")]), base.detail.lastPlay) };
ok(kind(M.detect(base, fakeFG)) !== "fieldgoal/us", "a fake field goal run in for 7 is never called a field goal");
var fgSeven = { game: game({ them: 10 }), detail: detail(base.detail.scoring.concat([play("c", false, "R. Leg 41 Yd Field Goal")]), base.detail.lastPlay) };
ok(kind(M.detect(base, fgSeven)) === "score/them", "field goal words but the score moved 7: generic");
var first = { game: game(), detail: null };
var oldTO = { game: game(), detail: detail(base.detail.scoring, { at: "11:00", text: "Pass intercepted", tags: ["Turnover"] }) };
ok(M.detect(first, oldTO) === null, "the first summary arrives carrying an old interception: no turnover moment");
var oldTD = { game: game({ us: 14 }), detail: detail(base.detail.scoring, { at: "9:00", text: "x TOUCHDOWN", tags: ["Touchdown"] }) };
var mm = M.detect(first, oldTD);
ok(kind(mm) === "score/us" && mm.count === 0, "the score moved before any summary: generic, no play counted as new (" + JSON.stringify(mm) + ")");

console.log("turnovers need the provider's word");
var to = { game: base.game, detail: detail(base.detail.scoring, { at: "4:40", text: "Pass intercepted", tags: ["Turnover"] }) };
ok(kind(M.detect(base, to)) === "turnover", "a new play tagged Turnover: turnover");
var tod = { game: base.game, detail: detail(base.detail.scoring, { at: "4:20", text: "Fourth down run, short", tags: ["Turnover on downs"] }) };
ok(kind(M.detect(base, tod)) === "turnover", "Turnover on downs is a turnover");
var poss = { game: game({ situation: { possession: "them" } }), detail: detail(base.detail.scoring, { at: "4:00", text: "Punt", tags: [] }) };
ok(M.detect(base, poss) === null, "possession changing alone is never a turnover");
ok(M.detect(to, to) === null, "the same tagged play seen again: no second moment");

console.log("when a moment may show");
var now = 1e6;
ok(M.allow({ fromNetwork: true, visible: true, lastLookAt: now - 30e3, now: now }) === true, "a fresh network refresh, visible, 30 s after the last look: yes");
ok(M.allow({ first: true, fromNetwork: true, visible: true, lastLookAt: now - 1, now: now }) === false, "never on the first paint");
ok(M.allow({ fromNetwork: false, visible: true, lastLookAt: now - 30e3, now: now }) === false, "never from the cache");
ok(M.allow({ fromNetwork: true, visible: false, lastLookAt: now - 30e3, now: now }) === false, "never while hidden");
ok(M.allow({ fromNetwork: true, visible: true, hiddenSince: now - 20e3, lastLookAt: now - 30e3, now: now }) === false, "never the catch-up after returning from the background");
ok(M.allow({ fromNetwork: true, visible: true, lastLookAt: now - 5 * 60e3, now: now }) === false, "never after a long gap between looks: old news");

console.log("");
if (failures) { console.log(failures + " check(s) FAILED"); process.exit(1); }
console.log("moments are observed changes, said only as far as the data says");
