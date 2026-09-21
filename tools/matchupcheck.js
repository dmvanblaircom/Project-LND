#!/usr/bin/env node
/* Does the pregame matchup card print what the data says?

   The card has two sources and they meet in the Suite. Eight rows come from
   the provider's season statistics; the ninth - points allowed - does not
   exist in any feed we can reach and is derived by TeamOS.season from the
   team's own results (decision 0011). tools/adaptercheck.js proves each side
   produces the right numbers. This proves the card built from them is right:
   the rows in order, the derived row filled, the national rank shown only
   where one exists, and the better-rank marker landing on the better rank.

   It lifts the real render functions out of app.js into a bare Node scope -
   no browser, no network - and reads back the HTML they produced.

   Usage:  node tools/matchupcheck.js
   Exit status is 1 if anything fails, so it can gate a push. */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");

var root = path.join(__dirname, "..");
function read(p) { return fs.readFileSync(path.join(root, p), "utf8"); }

var failures = 0;
function ok(cond, what) {
  if (cond) { console.log("  ok   " + what); return; }
  failures++; console.log("  FAIL " + what);
}
function eq(a, b, what) { ok(JSON.stringify(a) === JSON.stringify(b), what + " = " + JSON.stringify(b)); }

// ---- the render functions, lifted out of app.js -----------------------
var app = read("app.js").replace(/\r\n/g, "\n");
function lift(name) {
  var m = app.match(new RegExp("^function " + name + "\\([^)]*\\)\\{[\\s\\S]*?^\\}", "m"));
  if (!m) throw new Error("could not find " + name + " in app.js");
  return m[0] + "\n";
}

var ctx = vm.createContext({ console: console });
["teams/notre-dame.js", "teamos/team.js", "teamos/season.js", "teamos/espn.js"]
  .forEach(function (f) { vm.runInContext(read(f), ctx, { filename: f }); });
vm.runInContext(
  'function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){' +
  '  return {"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[c]; }); }', ctx);
vm.runInContext(lift("renderPreview"), ctx, { filename: "renderPreview" });
vm.runInContext(lift("withPointsAllowed"), ctx, { filename: "withPointsAllowed" });

function card(a, b, pa, pb, awayAb, homeAb) {
  ctx.__a = a; ctx.__b = b; ctx.__pa = pa; ctx.__pb = pb;
  return vm.runInContext(
    'renderPreview(withPointsAllowed(__a,__pa), withPointsAllowed(__b,__pb), ' +
    JSON.stringify(awayAb || "ND") + ', ' + JSON.stringify(homeAb || "MSU") + ')', ctx);
}

// Read a rendered card back into rows: label, each side's printed value, the
// rank text if one was printed, and which side carries the better-rank mark.
function rowsOf(html) {
  var out = [], re = /<div class="statrow prev">([\s\S]*?)<\/div>\s*(?=<div class="statrow|<p class="stamp)/g, m;
  var body = html.replace(/<div class="statrow head">[\s\S]*?<\/div>/, "");
  re = /<div class="statrow prev">(.*?)<\/div>/g;
  while ((m = re.exec(body))) {
    var inner = m[1];
    var lbl = (inner.match(/<span class="lbl">([^<]*)</) || [])[1];
    var cells = [];
    var cre = /<span class="v([^"]*)">([^<]*)(?:<span class="rk2">([^<]*)<\/span>)?/g, c;
    while ((c = cre.exec(inner))) {
      cells.push({ value: c[2], rank: c[3] || null, win: / win\b/.test(c[1]) });
    }
    out.push({ label: lbl, away: cells[0], home: cells[1] });
  }
  return out;
}

var stats = JSON.parse(read("tools/fixtures/espn-season-stats.json"));
var sched = JSON.parse(read("tools/fixtures/espn-schedule.json"));
var ND = ctx.TeamOS.espn.seasonStats(stats.teams["87"]);
var OP = ctx.TeamOS.espn.seasonStats(stats.teams["127"]);

// Notre Dame's points allowed, taken the way the Suite takes it: from the
// results it already has, not from any statistics feed.
var ndPA = ctx.TeamOS.season.pointsAllowedPerGame(ctx.TeamOS.espn.scoreLines(sched, "87"));
eq(ndPA, 13, "points allowed comes from the schedule the page already has");

console.log("the card");
var rows = rowsOf(card(ND, OP, ndPA, 24.7));
eq(rows.length, 9, "nine rows");
eq(rows.map(function (r) { return r.label; }),
   ["Points per game", "Points allowed", "Total offense", "Rushing offense", "Passing offense",
    "Yards per play", "Sacks", "Tackles for loss", "Turnover margin"],
   "in order, offence and defence both represented");

console.log(" the derived row");
eq([rows[1].away.value, rows[1].home.value], ["13.0", "24.7"], "points allowed is printed on both sides");
eq([rows[1].away.rank, rows[1].home.rank], [null, null], "with no national rank, because none is published");
eq([rows[1].away.win, rows[1].home.win], [false, false],
   "and no better-rank mark, because the mark means a better national rank and there is none");

console.log(" the rows the feed answers");
eq([rows[0].away.value, rows[0].away.rank], ["40.0", "Tied-28th"], "points per game carries its rank");
eq([rows[6].away.value, rows[6].home.value], ["7", "3"], "sacks is the defence's, both sides");
eq([rows[8].away.value, rows[8].home.value], ["6", "-2"], "turnover margin keeps a negative");
eq(rows.filter(function (r) { return r.away.win; }).map(function (r) { return r.label; }),
   ["Points per game", "Total offense", "Passing offense", "Yards per play",
    "Sacks", "Tackles for loss", "Turnover margin"],
   "Notre Dame is marked on every row where its national rank is better");
eq(rows.filter(function (r) { return r.home.win; }).map(function (r) { return r.label; }),
   ["Rushing offense"], "and the opponent on the one where theirs is");

console.log(" what the card does without the derived value");
// The negative control. If points allowed is never filled in - the state
// before this was built, or a failed fetch of the opponent's schedule - the
// row is empty on both sides and the card must drop it rather than print a
// blank line or a confident zero.
var bare = rowsOf(card(ND, OP, null, null));
eq(bare.length, 8, "the row disappears when neither side has a value");
ok(bare.map(function (r) { return r.label; }).indexOf("Points allowed") === -1, "and it is that row that went");
ok(!/Points allowed/.test(card(ND, OP, null, null)), "the label is not printed either");

var oneSide = rowsOf(card(ND, OP, ndPA, null));
eq(oneSide.length, 9, "one side having a value is enough to keep the row");
eq([oneSide[1].away.value, oneSide[1].home.value], ["13.0", "–"], "the other side shows a dash");

console.log(" a team that has not played");
var zero = rowsOf(card(ND, OP, ctx.TeamOS.season.pointsAllowedPerGame([]), null));
eq(zero.length, 8, "week zero: nothing to average, so no row");
eq(rowsOf(card(ND, OP, 0, 17.5))[1].away.value, "0.0",
   "but a real shutout season prints 0.0 rather than vanishing");

console.log(" the stamp");
ok(/national rank where one is published/.test(card(ND, OP, ndPA, 24.7)),
   "says the rank is not on every row");

console.log("\n" + (failures ? failures + " check(s) FAILED" : "the matchup card agrees with the data"));
process.exit(failures ? 1 : 0);
