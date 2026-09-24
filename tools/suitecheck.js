#!/usr/bin/env node
/* Suite's rendering rules, checked on its real markup.

   TeamOS decides; Suite draws. tools/gamecheck.js and tools/rulescheck.js
   check the decisions - pure TeamOS, no Suite. This checks the drawing: the
   rules Product set for how a screen shows what TeamOS decided. It loads
   suite/*.js into a context with a stub document, paints into a stub host
   and reads the markup back - no browser, no network.

   Usage:  node tools/suitecheck.js      (exit 1 on any failure) */
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

console.log("postponed dates on Home (decision 0022 #5)");
var hctx = vm.createContext({ Date: Date, document: { addEventListener: function () {} } });
["suite/ui.js", "suite/home.js"].forEach(function (f) { vm.runInContext(read(f), hctx, { filename: f }); });
var H = hctx.Suite.home;
eq(H.newDate({ status: "postponed", newDate: null }), "New date to be announced", "no replacement date: to be announced");
ok(/^New date: .+ \u00B7 .*\d:\d\d/.test(H.newDate({ newDate: { date: "2026-10-10T19:30:00Z", timeSet: true } })),
   "date and time known: both");
ok(/^New date: .+ \u00B7 Time TBD$/.test(H.newDate({ newDate: { date: "2026-10-10T16:00:00Z", timeSet: false } })),
   "date known, time not: the date, then Time TBD");
eq(H.newDate({ newDate: { date: "not a date" } }), "New date to be announced", "an unreadable date is not shown");


// ---- Box Score: collapse a category, never truncate it ----------------------
// Game review 2026-09-24: every category is its own disclosure, expanded it
// shows every player, and the fan's own choice outlives the live refresh.
console.log("Box Score");
var sctx = vm.createContext({ console: console, Intl: Intl, Date: Date, TeamOS: TeamOS, document: { addEventListener: function () {} } });
["suite/ui.js", "suite/home.js", "suite/game.js"].forEach(function (f) { vm.runInContext(read(f), sctx, { filename: f }); });
function host() {
  var parts = {};
  return { innerHTML: "", parts: parts,
           querySelector: function (q) { var k = (/data-game="(\w+)"/.exec(q) || [])[1]; if (!k) return q === "[data-game]" && this.innerHTML ? {} : null;
                                          return parts[k] || (parts[k] = { innerHTML: "" }); } };
}
var wis = JSON.parse(read("tools/fixtures/espn-summary-wis-final.json"));
var WD = TeamOS.espn.gameDetail(wis, TEAM, CFG);
var WG = TeamOS.espn.schedule(JSON.parse(read("tools/fixtures/espn-schedule.json")), TEAM, CFG)
  .filter(function (x) { return x.id === "401858438"; })[0];
function boxHtml(open, side) {
  var h = host();
  sctx.Suite.game.paint(h, { team: { name: TEAM.name, abbr: TEAM.abbreviation, markUrl: "" }, oppMark: function () { return ""; },
    game: WG, detail: WD, lifecycle: G.lifecycle(WG), view: "box", preview: null, side: side || "us", open: open || {},
    weather: null, now: new Date("2026-09-07T14:00:00Z") });
  return h.parts.body.innerHTML;
}
var html = boxHtml(), usKey = WD.home.mine ? "home" : "away";
var cats = html.match(/<details class="bx-cat"[^>]*>/g) || [];
eq(cats.length, WD.box[usKey].length, "every category is its own disclosure");
var fullRows = WD.box[usKey].reduce(function (n, t) { return n + t.rows.length; }, 0);
eq((html.match(/<table class="bx"[\s\S]*?<\/table>/g) || []).join("").split('<th scope="row">').length - 1, fullRows, "every player row is in the page, open or closed - nothing truncated");
function isOpen(key) { return new RegExp('data-key="box-us-' + key + '" open>').test(html); }
ok(isOpen("passing") && isOpen("rushing") && isOpen("receiving"), "Passing, Rushing and Receiving start expanded");
ok(!isOpen("defensive"), "the long Defense table starts collapsed");
ok(!isOpen("kicking") && !isOpen("punting"), "Kicking and Punting start collapsed");
ok(!/<caption/.test(html) && (html.match(/<summary>/g) || []).length === cats.length,
   "the category name is the summary - it stays visible collapsed");
ok(/<span class="bx-count">\d+ players?<\/span>/.test(html), "a collapsed category says how many players it holds");
var flipped = boxHtml({ "box-us-defensive": true, "box-us-passing": false });
ok(/data-key="box-us-defensive" open>/.test(flipped) && !/data-key="box-us-passing" open>/.test(flipped),
   "the fan's own open/closed choice wins over the default");
var them = boxHtml({}, "them");
ok(/data-key="box-them-passing" open>/.test(them), "the team toggle keeps its own keys");

console.log("\n" + (failures ? failures + " check(s) FAILED" : "Suite draws what TeamOS decided, the way Product set"));
process.exit(failures ? 1 : 0);
