#!/usr/bin/env node
/* Do all the score-bearing surfaces agree?

   On 2026-09-19 they did not. The Game Center showed Ohio State 49-0 in the
   fourth quarter while the hero and the schedule row showed 0-0, because the
   team's schedule endpoint and the league scoreboard are different feeds and
   only one of them was being refreshed. tools/adaptercheck.js proves that
   TeamOS.live.reconcile() produces one state; this proves that the Suite's
   own rendering functions, given that state, all print it.

   It loads the real Suite renderers (suite/home.js, suite/schedule.js,
   suite/top25.js) into a bare Node scope - no browser, no network - runs a
   game from kickoff to final, and reads the HTML each surface produced. A
   surface that disagrees with the others fails the check.

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

// ---- the surfaces, straight out of suite/*.js ---------------------------
// Every score-bearing surface is canonical: Home's hero (suite/home.js), the
// schedule row Home and Schedule share (suite/schedule.js), and Top 25's
// Games row (suite/top25.js). Each is drawn from a normalized Game, the way
// app.js hands it over, into a stub host that keeps what was written.
function makeContext(teamFile) {
  var ctx = vm.createContext({ console: console, Intl: Intl, Date: Date });
  ["teams/" + teamFile, "teamos/team.js", "teamos/live.js", "teamos/espn.js", "teamos/game.js", "teamos/outlook.js"]
    .forEach(function (f) { vm.runInContext(read(f), ctx, { filename: f }); });
  ctx.document = { addEventListener: function () {}, fonts: null };
  ["suite/ui.js", "suite/schedule.js", "suite/home.js", "suite/top25.js"].forEach(function (f) {
    vm.runInContext(read(f), ctx, { filename: f });
  });
  vm.runInContext([
    'var TEAM = TeamOS.createTeam(TEAM_CONFIG.team);',
    'function stubHost(attr){',
    '  var parts={}, re=new RegExp(attr+"=\\"(\\\\w+)\\"");',
    '  var host={ innerHTML:"", parts:parts, querySelector:function(q){',
    '    if(q==="["+attr+"]") return host.innerHTML ? {} : null;',
    '    var k=(re.exec(q)||[])[1]; if(!k) return null;',
    '    return parts[k]||(parts[k]={ innerHTML:"", hidden:false }); } };',
    '  return host;',
    '}',
    // Home, as paintHome() in app.js hands it over, for one game at one moment
    'function heroOf(g, now){',
    '  var h=TeamOS.game.hero([g], now, TEAM.timeZone), host=stubHost("data-home");',
    '  Suite.home.paint(host, { team:{ name:TEAM.name, nick:"", tagline:null, abbr:TEAM.abbreviation, markUrl:null },',
    '    oppMark:function(){ return null; }, art:{ name:TEAM.name, abbr:TEAM.abbreviation, markUrl:null, atmosphere:null },',
    '    hero:{ game:h.game, reason:h.reason, weather:null }, heroId:h.game ? h.game.id : null,',
    '    news:[], schedule:[], outlook:TeamOS.outlook.metrics({}), fresh:null });',
    '  return host.parts.hero ? host.parts.hero.innerHTML : "";',
    '}',
    'function rowOf(g){ return Suite.schedule.row(g, { heroId:null, full:true, oppMark:function(){ return null; } }); }',
    'function top25Row(lg){',
    '  var host=stubHost("data-t25");',
    '  Suite.top25.paint(host, { view:"games", games:[lg], polls:[], mark:function(){ return null; }, now:new Date() });',
    '  return host.parts.body.innerHTML;',
    '}'
  ].join("\n"), ctx, { filename: "livecheck#surfaces" });
  return ctx;
}

// ---- the fixtures: the screenshot, as data ----------------------------
function scheduleGame(overrides) {
  var g = { id: "401858464", date: "2026-09-19T16:00:00Z", timeSet: true, home: true, neutral: false,
            oppName: "Kent State", oppRank: null, venue: "Ohio Stadium", city: "Columbus",
            venueState: "OH", zip: "43210", net: "FOX",
            odds: { line: "OSU -52.5", total: 59.5 }, series: null,
            state: "pre", status: "scheduled", hasStarted: false, detail: "", us: null, them: null, won: null };
  for (var k in (overrides || {})) g[k] = overrides[k];
  return g;
}
function boardGame(state, ourScore, theirScore, detail) {
  // status and hasStarted as the ESPN adapter normalizes them (teamos/espn.js)
  var status = state === "in" ? "live" : state === "post" ? "final" : "scheduled";
  return { id: "401858464", date: "2026-09-19T16:00:00Z", timeSet: true, state: state, detail: detail,
           status: status, hasStarted: state !== "pre",
           // "14:27 - 4th" -> clock 14:27, period 4, as the adapter reads them
           clock: state === "in" ? detail.split(" - ")[0] : null,
           period: state === "in" ? parseInt(detail.split(" - ")[1], 10) : null,
           venue: "Ohio Stadium", net: "FOX", odds: null,
           home: { name: "Ohio State", rank: 6, score: ourScore },
           away: { name: "Kent State", rank: null, score: theirScore },
           mine: true,
           live: state === "in" ? { downDistance: "1st & 10", lastPlay: "Timeout Ohio State" } : null };
}

// Everything a score can be read from, per surface. The moment the fan is
// looking is set relative to kickoff, so Home's hero rules see a real time.
function surfaces(ctx, game, league, minutesAfterKickoff) {
  ctx.__g = game; ctx.__lg = league;
  ctx.__now = new Date(Date.parse(game.date) + (minutesAfterKickoff || 0) * 60e3);
  return { hero: vm.runInContext("heroOf(__g, __now)", ctx),
           row:  vm.runInContext("rowOf(__g)", ctx),
           top25: vm.runInContext("top25Row(__lg)", ctx) };
}

// What a surface says, without its markup.
function text(html) { return String(html).replace(/<[^>]*>/g, " ").replace(/\s+/g, " "); }
// A surface "shows" a score if the pair appears in what it printed.
function shows(html, ours, theirs) {
  var t = text(html);
  return t.indexOf(ours) > -1 && t.indexOf(theirs) > -1;
}

function run(teamFile, teamLabel, ourName, oppName) {
  console.log("\n=== " + teamLabel + " ===");
  var ctx = makeContext(teamFile);
  var pre = scheduleGame();

  console.log(" before kickoff");
  var s0 = surfaces(ctx, pre, boardGame("pre", null, null, "12:00 PM EDT"), -60);
  ok(!!s0.hero, "Home's hero draws the game");
  ok(!/\b49\b/.test(text(s0.hero)) && !/live-pill/.test(s0.hero), "and shows no score and no live state");

  console.log(" the moment it goes live: 0-0");
  var live0 = ctx.TeamOS.live.reconcile(pre, boardGame("in", "0", "0", "15:00 - 1st"));
  var s1 = surfaces(ctx, live0, boardGame("in", "0", "0", "15:00 - 1st"), 5);
  ok(shows(s1.hero, "0", "0"), "Home's hero 0-0");
  ok(/15:00/.test(text(s1.hero)), "Home's hero carries the game clock");
  ok(!/Kickoff|kicks off|\bin \d+ ?(h|hr|hours|m|min)\b/i.test(text(s1.hero)), "and no countdown to a kickoff that has happened");
  ok(shows(s1.row, "0", "0"), "the schedule row 0-0");

  console.log(" the screenshot: 49-0 in the fourth");
  var board = boardGame("in", "49", "0", "14:27 - 4th");
  var live = ctx.TeamOS.live.reconcile(pre, board);
  var s2 = surfaces(ctx, live, board, 170);

  // the state the Game screen has, which every other surface must share
  eq([live.state, live.us, live.them, live.detail], ["in", "49", "0", "14:27 - 4th"],
     "the one authoritative state");

  ok(shows(s2.hero, "49", "0"), "Home's hero shows 49-0");
  ok(shows(s2.row, "49", "0"), "the schedule row shows 49-0");
  ok(shows(s2.top25, "49", "0"), "the Top 25 row shows 49-0");
  ok(/14:27/.test(text(s2.hero)), "Home's hero shows 14:27 of the 4th");
  ok(/14:27 - 4th/.test(s2.top25), "and so does the Top 25 row");
  ok(new RegExp(oppName, "i").test(text(s2.hero)), "Home's hero names " + oppName);

  // THE bug: no surface may still be at 0-0 while another is at 49-0
  var all = [["Home hero", s2.hero], ["schedule row", s2.row], ["Top 25 row", s2.top25]];
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
  var sBug = surfaces(ctx, unreconciled, board, 170);
  ok(!shows(sBug.hero, "49", "0") && !shows(sBug.row, "49", "0"),
     "an unreconciled game does NOT show the live score on Home or the schedule - the old behaviour");
  ok(shows(sBug.top25, "49", "0"),
     "while the scoreboard-fed row does - so the surfaces disagree");
  ok(shows(s2.hero, "49", "0") && shows(s2.top25, "49", "0"),
     "and reconciling is what makes them agree");

  console.log(" final");
  var fin = ctx.TeamOS.live.reconcile(live, boardGame("post", "59", "3", "Final"));
  var s3 = surfaces(ctx, fin, boardGame("post", "59", "3", "Final"), 240);
  eq([fin.state, fin.us, fin.them, fin.won], ["post", "59", "3", true], "final state, and the win");
  ok(shows(s3.hero, "59", "3"), "Home's hero shows the final");
  ok(shows(s3.row, "59", "3"), "the schedule row shows the final");
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
  ok(/class="tg-last">Pass complete to the 40</.test(row), "and shows its latest play, as TeamOS normalized it");
  ctx.__lg = Object.assign({}, other, { state: "post", detail: "Final" });
  ok(!/tg-last|Pass complete/.test(vm.runInContext("top25Row(__lg)", ctx)), "a final shows no last play, even if one was left behind");
  ctx.__lg = Object.assign({}, other, { state: "pre", detail: "" });
  ok(!/tg-last|Pass complete/.test(vm.runInContext("top25Row(__lg)", ctx)), "nor does a game before kickoff");
  ok(!/Kent State|Ohio State|Notre Dame/.test(row), "without borrowing the configured team's game");

}

run("notre-dame.js", "Notre Dame", "Notre Dame", "Kent State");
run("ohio-state.js", "Ohio State", "Ohio State", "Kent State");

console.log("\n" + (failures ? failures + " surface check(s) FAILED" : "every surface agrees"));
process.exit(failures ? 1 : 0);
