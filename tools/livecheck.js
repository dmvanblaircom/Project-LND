#!/usr/bin/env node
/* Do all the score-bearing surfaces agree?

   On 2026-09-19 they did not. The Game Center showed Ohio State 49-0 in the
   fourth quarter while the hero and the schedule row showed 0-0, because the
   team's schedule endpoint and the league scoreboard are different feeds and
   only one of them was being refreshed. tools/adaptercheck.js proves that
   TeamOS.live.reconcile() produces one state; this proves that the Suite's
   own rendering functions, given that state, all print it.

   It lifts the real paint functions out of app.js into a bare Node scope with
   the page stubbed - no browser, no network - runs a game from kickoff to
   final, and reads the HTML each surface produced. A surface that disagrees
   with the others fails the check.

   Usage:  node tools/livecheck.js
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

// ---- the page, stubbed ------------------------------------------------
// Every element records what was written to it so the assertions can read
// the surfaces back.
var app = read("app.js").replace(/\r\n/g, "\n");
function lift(name) {
  var m = app.match(new RegExp("^function " + name + "\\([^)]*\\)\\{[\\s\\S]*?^\\}", "m"));
  if (!m) throw new Error("could not find " + name + " in app.js");
  return m[0] + "\n";
}

function makeContext(teamFile) {
  var ctx = vm.createContext({ console: console });
  ["teams/" + teamFile, "teamos/team.js", "teamos/live.js", "teamos/espn.js"]
    .forEach(function (f) { vm.runInContext(read(f), ctx, { filename: f }); });

  vm.runInContext([
    'var TEAM = TeamOS.createTeam(TEAM_CONFIG.team);',
    'var S = { games:null, next:null, tick:null, oddsTried:null, stale:null };',
    'var UI = { tab:"schedule" };',
    'var EL = {};',
    'function elem(id){',
    '  return { id:id, innerHTML:"", textContent:"", hidden:false, dataset:{},',
    '           classList:{ list:{}, toggle:function(c,on){ this.list[c]=!!on; },',
    '                       add:function(c){ this.list[c]=true; }, contains:function(c){ return !!this.list[c]; } },',
    '           querySelector:function(){ return null; }, querySelectorAll:function(){ return []; },',
    '           insertAdjacentHTML:function(){}, remove:function(){} };',
    '}',
    'function $(id){ return EL[id] || (EL[id] = elem(id)); }',
    'function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){',
    '  return {"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[c]; }); }',
    'function say(){}',
    'function layoutForTab(){}',
    'function paintWeather(){}',
    'function fmtTime(d){ return "12:00 PM"; }',
    'function fmtDay(d){ return "Saturday, September 19"; }',
    'function tzAbbr(){ return "EDT"; }',
    'function setInterval(){ return 1; }',
    'function clearInterval(){}',
    'var CLEARED = 0;'
  ].join("\n"), ctx);

  // the real thing, straight out of app.js
  vm.runInContext(lift("paintHeroMini") + lift("paintHero"), ctx, { filename: "app.js#paint" });

  // Top 25 is canonical (suite/top25.js): its Games view, drawn for one game.
  ctx.document = { addEventListener: function () {} };
  ["suite/ui.js", "suite/top25.js"].forEach(function (f) { vm.runInContext(read(f), ctx, { filename: f }); });
  vm.runInContext([
    'function top25Row(lg){',
    '  var parts={}, host={ innerHTML:"", querySelector:function(q){',
    '    var k=(/data-t25="(\\w+)"/.exec(q)||[])[1];',
    '    if(!k) return null;',
    '    return parts[k]||(parts[k]={ innerHTML:"" }); } };',
    '  Suite.top25.paint(host, { view:"games", games:[lg], polls:[], mark:function(){ return null; }, now:new Date() });',
    '  return parts.body.innerHTML;',
    '}'
  ].join("\n"), ctx, { filename: "livecheck#top25" });
  return ctx;
}

// ---- the fixtures: the screenshot, as data ----------------------------
function scheduleGame(overrides) {
  var g = { id: "401858464", date: "2026-09-19T16:00:00Z", timeSet: true, home: true, neutral: false,
            oppName: "Kent State", oppRank: null, venue: "Ohio Stadium", city: "Columbus",
            venueState: "OH", zip: "43210", net: "FOX",
            odds: { line: "OSU -52.5", total: 59.5 }, series: null,
            state: "pre", detail: "", us: null, them: null, won: null };
  for (var k in (overrides || {})) g[k] = overrides[k];
  return g;
}
function boardGame(state, ourScore, theirScore, detail) {
  return { id: "401858464", date: "2026-09-19T16:00:00Z", timeSet: true, state: state, detail: detail,
           venue: "Ohio Stadium", net: "FOX", odds: null,
           home: { name: "Ohio State", rank: 6, score: ourScore },
           away: { name: "Kent State", rank: null, score: theirScore },
           mine: true,
           live: state === "in" ? { downDistance: "1st & 10", lastPlay: "Timeout Ohio State" } : null };
}

// Everything a score can be read from, per surface.
function surfaces(ctx, game, league) {
  vm.runInContext("EL = {};", ctx);
  ctx.__g = game;
  vm.runInContext("paintHero(__g);", ctx);
  var el = ctx.EL;
  var out = {
    heroLine:  (el.heroLine  || {}).innerHTML  || "",
    heroWhen:  (el.heroWhen  || {}).textContent || "",
    heroClock: (el.heroClock || {}).textContent || "",
    heroMini:  (el.heroMini  || {}).innerHTML  || ""
  };
  ctx.__lg = league;
  out.top25 = vm.runInContext("top25Row(__lg)", ctx);
  return out;
}

// A surface "shows" a score if the pair appears in what it printed.
function shows(html, ours, theirs) {
  var text = String(html).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
  return text.indexOf(ours) > -1 && text.indexOf(theirs) > -1;
}

function run(teamFile, teamLabel, ourName, oppName) {
  console.log("\n=== " + teamLabel + " ===");
  var ctx = makeContext(teamFile);
  var pre = scheduleGame();

  console.log(" before kickoff");
  var s0 = surfaces(ctx, pre, boardGame("pre", null, null, "12:00 PM EDT"));
  ok(/Next up/.test(s0.heroWhen), "hero says the game is still to come");
  ok(!/\b49\b/.test(s0.heroLine), "and shows no score");

  console.log(" the moment it goes live: 0-0");
  var live0 = ctx.TeamOS.live.reconcile(pre, boardGame("in", "0", "0", "15:00 - 1st"));
  var s1 = surfaces(ctx, live0, boardGame("in", "0", "0", "15:00 - 1st"));
  ok(/Playing now/.test(s1.heroWhen), "hero switches to in-play");
  ok(shows(s1.heroLine, "0", "0"), "hero line 0-0");
  ok(shows(s1.heroMini, "0", "0"), "hero mini 0-0");
  ok(/15:00 - 1st/.test(s1.heroClock), "hero clock carries the game clock, not a countdown");
  ok(!/Kickoff/.test(s1.heroClock), "and not the word Kickoff");

  console.log(" the screenshot: 49-0 in the fourth");
  var board = boardGame("in", "49", "0", "14:27 - 4th");
  var live = ctx.TeamOS.live.reconcile(pre, board);
  var s2 = surfaces(ctx, live, board);

  // the state the Game Center had, which every other surface must now share
  eq([live.state, live.us, live.them, live.detail], ["in", "49", "0", "14:27 - 4th"],
     "the one authoritative state");

  ok(shows(s2.heroLine, "49", "0"), "Home hero shows 49-0");
  ok(shows(s2.heroMini, "49", "0"), "the header bar shows 49-0");
  ok(shows(s2.top25, "49", "0"), "the Top 25 row shows 49-0");
  ok(/14:27 - 4th/.test(s2.heroClock), "the hero clock shows 14:27 - 4th");
  ok(/14:27 - 4th/.test(s2.top25), "and so does the Top 25 row");
  ok(new RegExp(ourName).test(s2.heroLine), "the hero names " + ourName);
  ok(new RegExp(oppName).test(s2.heroLine), "and " + oppName);

  // THE bug: no surface may still be at 0-0 while another is at 49-0
  var all = [["Home hero", s2.heroLine], ["header bar", s2.heroMini], ["Top 25 row", s2.top25]];
  var stale = all.filter(function (p) { return !shows(p[1], "49", "0"); });
  ok(stale.length === 0,
     "no surface is left behind" + (stale.length ? " (stale: " + stale.map(function (p) { return p[0]; }).join(", ") + ")" : ""));

  // The negative control. If this check could not tell the difference between
  // a reconciled game and an unreconciled one, it would pass on the broken
  // build too and be worth nothing. This is the exact disagreement of
  // 2026-09-19: the scoreboard-fed row already at 49-0, the schedule-fed hero
  // still at nothing, because no one had reconciled them.
  console.log(" the disagreement this check exists to catch");
  var unreconciled = scheduleGame();
  var sBug = surfaces(ctx, unreconciled, board);
  ok(!shows(sBug.heroLine, "49", "0"),
     "an unreconciled hero does NOT show the live score - the old behaviour");
  ok(shows(sBug.top25, "49", "0"),
     "while the scoreboard-fed row does - so the surfaces disagree");
  ok(shows(s2.heroLine, "49", "0") && shows(s2.top25, "49", "0"),
     "and reconciling is what makes them agree");

  console.log(" final");
  var fin = ctx.TeamOS.live.reconcile(live, boardGame("post", "59", "3", "Final"));
  var s3 = surfaces(ctx, fin, boardGame("post", "59", "3", "Final"));
  eq([fin.state, fin.us, fin.them, fin.won], ["post", "59", "3", true], "final state, and the win");
  ok(shows(s3.top25, "59", "3"), "the Top 25 row shows the final");

  console.log(" a Top 25 game that is not this team's");
  var other = { id: "555", date: "2026-09-19T20:00:00Z", timeSet: true, state: "in", detail: "3:12 - 3rd",
                venue: "Somewhere", net: "ABC", odds: null,
                home: { name: "Team A", rank: 4, score: "17" },
                away: { name: "Team B", rank: 12, score: "21" },
                mine: false, live: { downDistance: "3rd & 2", lastPlay: "Pass complete to the 40" } };
  ctx.__lg = other;
  var row = vm.runInContext("top25Row(__lg)", ctx);
  ok(shows(row, "21", "17"), "an unrelated ranked game renders its own live score");
  ok(/3:12 - 3rd/.test(row), "and its own clock");
  ok(/class="live-pill[^"]*">Live</.test(row), "and is marked live");
  ok(!/Kent State|Ohio State|Notre Dame/.test(row), "without borrowing the configured team's game");

  console.log(" the countdown does not survive kickoff");
  var ctx2 = makeContext(teamFile);
  vm.runInContext("var ticks=0; clearInterval=function(){ CLEARED++; };", ctx2);
  ctx2.__pre = scheduleGame();
  vm.runInContext("paintHero(__pre);", ctx2);          // pre-game: a countdown starts
  ctx2.__live = ctx2.TeamOS.live.reconcile(scheduleGame(), boardGame("in", "49", "0", "14:27 - 4th"));
  vm.runInContext("S.tick = 1; paintHero(__live);", ctx2);
  ok(vm.runInContext("CLEARED > 0", ctx2), "the pre-game countdown is cancelled when the game goes live");
  ok(vm.runInContext("S.tick === null", ctx2), "and its handle is released");
}

run("notre-dame.js", "Notre Dame", "Notre Dame", "Kent State");
run("ohio-state.js", "Ohio State", "Ohio State", "Kent State");

console.log("\n" + (failures ? failures + " surface check(s) FAILED" : "every surface agrees"));
process.exit(failures ? 1 : 0);
