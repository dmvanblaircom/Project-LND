#!/usr/bin/env node
/* Does the pregame matchup card print what the data says?

   The card has three sources and they meet in the Suite. Six rows come from
   the provider's season statistics; points allowed is derived by
   TeamOS.season from the team's own results (decision 0011); rushing and
   passing defense - yards allowed per game - come from CollegeFootballData
   through Suite's edge API (TeamOS.cfbd, W15, decision 0030). tools/adaptercheck.js proves each side
   produces the right numbers. This proves the card built from them is right:
   the rows in order, the derived row filled, the national rank shown only
   where one exists, and the better-rank marker landing on the better rank.

   It loads the real Game screen (suite/game.js) into a bare Node scope - no
   browser, no network - paints a pregame game with the preview app.js
   builds, and reads back the Matchup card it produced. withDerived, which
   joins the derived rows on, is lifted out of app.js.

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

// ---- the Game screen, and the one app.js helper it is fed through -----
var app = read("app.js").replace(/\r\n/g, "\n");
function lift(name) {
  var m = app.match(new RegExp("^function " + name + "\\([^)]*\\)\\{[\\s\\S]*?^\\}", "m"));
  if (!m) throw new Error("could not find " + name + " in app.js");
  return m[0] + "\n";
}

var ctx = vm.createContext({ console: console, Intl: Intl, Date: Date });
["teams/notre-dame.js", "teamos/team.js", "teamos/season.js", "teamos/espn.js", "teamos/game.js", "teamos/cfbd.js"]
  .forEach(function (f) { vm.runInContext(read(f), ctx, { filename: f }); });
ctx.document = { addEventListener: function () {}, fonts: null };
ctx.window = { addEventListener: function () {} };
["suite/ui.js", "suite/home.js", "suite/game.js"].forEach(function (f) { vm.runInContext(read(f), ctx, { filename: f }); });
vm.runInContext(lift("withDerived"), ctx, { filename: "withDerived" });

// A pregame game, painted the way app.js paints Game before kickoff.
// Yards allowed as the edge API answers them, through TeamOS.cfbd.
function yards(games, rush, pass) {
  return ctx.TeamOS.cfbd.yardsAllowed({ stats: { games: games, rushingYardsOpponent: rush, netPassingYardsOpponent: pass },
                                        fetchedAt: "2026-10-01T12:00:00Z" });
}
var YA = yards(4, 420, 780), YB = yards(4, 610, 905);
function card(a, b, pa, pb, ya, yb) {
  ctx.__a = a; ctx.__b = b; ctx.__pa = pa; ctx.__pb = pb;
  ctx.__ya = arguments.length > 4 ? ya : YA; ctx.__yb = arguments.length > 5 ? yb : YB;
  ctx.__series = card.series || null; ctx.__kind = card.kind || null;
  return vm.runInContext([
    '(function(){',
    '  var parts={}, host={ innerHTML:"", querySelector:function(q){',
    '    if(q==="[data-game]") return host.innerHTML ? {} : null;',
    '    var k=(/data-game="(\\w+)"/.exec(q)||[])[1]; if(!k) return null;',
    '    return parts[k]||(parts[k]={ innerHTML:"" }); }, querySelectorAll:function(){ return []; } };',
    '  var g={ id:"401858453", date:"2026-10-03T19:30:00Z", timeSet:true, home:true, neutral:false,',
    '          oppName:"Michigan State", oppAbbr:"MSU", status:"scheduled", state:"pre", hasStarted:false,',
    '          series:__series||null, seriesKind:__kind||null };',
    '  Suite.game.paint(host, { team:{ name:"Notre Dame", abbr:"ND", markUrl:null }, oppMark:function(){ return null; },',
    '    game:g, detail:null, lifecycle:TeamOS.game.lifecycle(g), view:"details",',
    '    preview:{ us:withDerived(__a,__pa,__ya), them:withDerived(__b,__pb,__yb) },',
    '    side:"us", open:{}, weather:null, now:new Date("2026-10-01T12:00:00Z") });',
    '  return parts.body.innerHTML;',
    '})()'].join("\n"), ctx);
}

// Read the Matchup card back into rows: label, each side's printed value,
// the rank text if one was printed, and which side carries the better mark.
function rowsOf(html) {
  var out = [], re = /<li class="mu-row">([\s\S]*?)<\/li>/g, m;
  while ((m = re.exec(html))) {
    var inner = m[1], cells = [], c;
    var cre = /<span class="mu-v (us|them)( better)?"><span class="mu-n">([^<]*)<\/span>(?:<span class="mu-rk">([^<]*)<\/span>)?/g;
    while ((c = cre.exec(inner))) cells.push({ value: c[3], rank: c[4] || null, win: !!c[2] });
    var lbl = inner.replace(/<span class="mu-v[\s\S]*?<\/span><\/span>/g, "").replace(/<[^>]*>/g, "").trim();
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
    "Rushing defense", "Passing defense", "Sacks", "Turnover margin"],
   "in order: Yards per play and Tackles for loss gave way to yards allowed (David, 2026-10-01)");

console.log(" the derived row");
eq([rows[1].away.value, rows[1].home.value], ["13.0", "24.7"], "points allowed is printed on both sides");
eq([rows[1].away.rank, rows[1].home.rank], [null, null], "with no national rank, because none is published");
eq([rows[1].away.win, rows[1].home.win], [false, false],
   "and no better-rank mark, because the mark means a better national rank and there is none");

console.log(" the rows the feed answers");
eq([rows[0].away.value, rows[0].away.rank], ["40.0", "Tied-28th"], "points per game carries its rank");
eq([rows[7].away.value, rows[7].home.value], ["7", "3"], "sacks is the defence's, both sides");
eq([rows[8].away.value, rows[8].home.value], ["6", "-2"], "turnover margin keeps a negative");
eq(rows.filter(function (r) { return r.away.win; }).map(function (r) { return r.label; }),
   ["Points per game", "Total offense", "Passing offense", "Sacks", "Turnover margin"],
   "Notre Dame is marked on every row where its national rank is better");
eq(rows.filter(function (r) { return r.home.win; }).map(function (r) { return r.label; }),
   ["Rushing offense"], "and the opponent on the one where theirs is");

console.log(" what the card does without the derived value");
// The negative control. If points allowed is never filled in - the state
// before this was built, or a failed fetch of the opponent's schedule - the
// row is empty on both sides and the card must drop it rather than print a
// blank line or a confident zero.
var bare = rowsOf(card(ND, OP, null, null, YA, YB));
eq(bare.length, 8, "the row disappears when neither side has a value");
ok(bare.map(function (r) { return r.label; }).indexOf("Points allowed") === -1, "and it is that row that went");
ok(!/Points allowed/.test(card(ND, OP, null, null, YA, YB)), "the label is not printed either");

var oneSide = rowsOf(card(ND, OP, ndPA, null));
eq(oneSide.length, 9, "one side having a value is enough to keep the row");
eq([oneSide[1].away.value, oneSide[1].home.value], ["13.0", "–"], "the other side shows a dash");

console.log(" a team that has not played");
var zero = rowsOf(card(ND, OP, ctx.TeamOS.season.pointsAllowedPerGame([]), null, YA, YB));
eq(zero.length, 8, "week zero: nothing to average, so no row");
eq(rowsOf(card(ND, OP, 0, 17.5))[1].away.value, "0.0",
   "but a real shutout season prints 0.0 rather than vanishing");

console.log(" yards allowed, from CFBD (W15)");
eq([rows[5].away.value, rows[5].home.value, rows[6].away.value, rows[6].home.value], ["105.0", "152.5", "195.0", "226.3"],
   "per game: the opponents' season totals over the games played");
eq([rows[5].away.rank, rows[6].home.rank, rows[5].away.win, rows[6].home.win], [null, null, false, false],
   "no national rank and no better-rank mark: CFBD publishes no rank for them");
var noYards = rowsOf(card(ND, OP, ndPA, 24.7, null, null));
eq(noYards.length, 7, "the edge API unreachable: both rows go, the card stands");
ok(noYards.every(function (r) { return !/defense/.test(r.label); }), "and it is those two that went");
var oneYards = rowsOf(card(ND, OP, ndPA, 24.7, YA, null));
eq([oneYards[5].away.value, oneYards[5].home.value], ["105.0", "–"],
   "a school CFBD does not know: that side shows a dash, the row stays");
eq(rowsOf(card(ND, OP, ndPA, 24.7, yards(4, 0, 600), YB))[5].away.value, "0.0",
   "a defence that has allowed no rushing yards prints 0.0, not a dash");
eq([yards(0, 0, 0).rush, yards(null, 100, 100).pass, yards(4, null, 100).rush], [null, null, null],
   "no games, no games count, or no total: nothing, never a guess");

console.log(" the card itself");
var whole = card(ND, OP, ndPA, 24.7);
ok(/Matchup/.test(whole) && /Season averages/.test(whole), "is the Matchup card, titled and labelled as season averages");
ok(/<span class="sr-only"> \(better\)<\/span>/.test(whole), "and the better side is said, not only coloured");

// W21 (David, 2026-10-01): the trophy mark only for a trophy.
console.log("the series card");
function seriesCard(name, kind) {
  card.series = name; card.kind = kind;
  var html = card(ND, OP, ndPA, 24.7);
  card.series = card.kind = null;
  var m = /<section class="card gcard series">([\s\S]*?)<\/section>/.exec(html);
  return m ? { icon: /series-ic/.test(m[1]), name: m[1].replace(/<[^>]*>/g, "").trim() } : null;
}
var tr = seriesCard("Megaphone Trophy", "trophy"), rv = seriesCard("The Game", "rivalry"), ev = seriesCard("Shamrock Series", "event");
ok(tr && tr.icon && tr.name === "Megaphone Trophy", "a trophy game shows its name with the trophy mark");
ok(rv && !rv.icon && rv.name === "The Game", "a rivalry shows its name plainly - no trophy, no \"Playing for the The Game\"");
ok(ev && !ev.icon && ev.name === "Shamrock Series", "a branded event shows its name plainly");
ok(seriesCard(null, null) === null, "no series, no card");

console.log("\n" + (failures ? failures + " check(s) FAILED" : "the matchup card agrees with the data"));
process.exit(failures ? 1 : 0);
