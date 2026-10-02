#!/usr/bin/env node
/* app.js keeps what it learns honest across refreshes (code review,
   2026-10-01). The real functions are lifted out of app.js into a bare Node
   scope with the network and the caches stood in for:

   - a game's summary is kept as the final only when ESPN's own summary says
     the game is complete AND it came from the network - never the worker's
     offline copy, never a summary lagging the scoreboard; a mid-game copy
     already kept is dropped on the way out
   - the pregame line, which only the summary carries, survives the schedule
     being rebuilt on the next refresh
   - a failed Matchup preview is tried again, and a failed yards or points
     request is never remembered as "no figure" for the session
   - Game's views follow the hero game from the first paint, the saved copy
     included

   Usage: node tools/controllercheck.js     (exit 1 on failure) */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");
var root = path.join(__dirname, "..");
function read(p) { return fs.readFileSync(path.join(root, p), "utf8"); }
var appSrc = read("app.js").replace(/\r\n/g, "\n");

var failures = 0;
function ok(cond, what) { if (cond) { console.log("  ok   " + what); return; } failures++; console.log("  FAIL " + what); }
function lift(name) {
  var m = appSrc.match(new RegExp("^function " + name + "\\([^)]*\\)\\{[\\s\\S]*?^\\}", "m"));
  if (!m) throw new Error("could not find " + name + " in app.js");
  return m[0] + "\n";
}
function settle() { return new Promise(function (r) { setTimeout(r, 0); }); }
async function settled(n) { for (var i = 0; i < (n || 5); i++) await settle(); }
var SUMMARY = { final: JSON.parse(read("tools/fixtures/espn-summary-pur-final.json")),
                live: JSON.parse(read("tools/fixtures/espn-summary-pur-live.json")) };

// A fake Cache Storage holding one named cache.
function fakeCaches() {
  var store = {};
  var cache = { match: function (u) { return Promise.resolve(store[u] ? new Response(store[u]) : undefined); },
                put: function (u, r) { return r.text().then(function (t) { store[u] = t; }); },
                delete: function (u) { delete store[u]; return Promise.resolve(true); } };
  return { store: store, api: { open: function () { return Promise.resolve(cache); } } };
}

(async function () {
  // ---- R1: the final summary ----
  console.log("a game's summary, kept for good only when it is truly final");
  function summaryScope(answer, cachedHeader, kept) {
    var fc = fakeCaches();
    if (kept) fc.store["SUM/1"] = JSON.stringify(kept);
    var c = vm.createContext({ console: console, Promise: Promise, Response: Response, setTimeout: setTimeout, caches: fc.api });
    vm.runInContext(read("teamos/espn.js") + "\nvar SUM={ mem:{}, inflight:{} }, SUM_CACHE='iw-final-summaries';" +
      "var fetches=0; function gameById(){ return { id:'1', state:'post' }; }", c);
    c.TeamOS.espn.summaryUrl = function () { return "SUM/1"; };
    c.fetch = function () { c.fetches++; return Promise.resolve(new Response(JSON.stringify(answer), { headers: cachedHeader ? { "X-IW-Cached": "1" } : {} })); };
    vm.runInContext(lift("summaryFor"), c);
    return { c: c, store: fc.store };
  }
  ok(vm.runInContext("TeamOS.espn.summaryFinal", summaryScope(SUMMARY.final).c)(SUMMARY.final) === true &&
     vm.runInContext("TeamOS.espn.summaryFinal", summaryScope(SUMMARY.final).c)(SUMMARY.live) === false,
     "TeamOS reads ESPN's own completed flag (final: yes, mid-game: no)");
  var a = summaryScope(SUMMARY.final);
  await a.c.summaryFor("1", false); await settled();
  ok(a.c.SUM.mem["1"].final === true && !!a.store["SUM/1"], "the schedule says final and the network's summary is complete: kept");
  var b = summaryScope(SUMMARY.live, true);
  await b.c.summaryFor("1", false); await settled();
  ok(b.c.SUM.mem["1"].final === false && !b.store["SUM/1"], "the worker's offline copy from the 4th quarter: shown, never kept as the final");
  var d = summaryScope(SUMMARY.live, false);
  await d.c.summaryFor("1", false); await settled();
  ok(d.c.SUM.mem["1"].final === false && !d.store["SUM/1"], "ESPN's summary still lagging the scoreboard: not kept either");
  var e = summaryScope(SUMMARY.final, false, SUMMARY.live);
  await e.c.summaryFor("1", false); await settled();
  ok(e.c.fetches === 1 && e.c.SUM.mem["1"].final === true && JSON.parse(e.store["SUM/1"]).header.competitions[0].status.type.completed === true,
     "a mid-game copy kept before this rule is dropped and replaced with the real final");

  // ---- R3 + R8: refreshSchedule keeps the line and sets Game's views ----
  console.log("the schedule, rebuilt");
  var S_DECL = appSrc.match(/^var S = \{[^\n]*\};$/m)[0];
  function scheduleScope(cached, slowSummary) {
    var c = vm.createContext({ console: console, Promise: Promise, setTimeout: setTimeout });
    vm.runInContext([S_DECL,
      "var SB={ games:null }, SC={}, POST=null, TEAM={}, TEAM_CONFIG={}, window={}, rules=0, painted=[];",
      "var TeamOS={ espn:{ scheduleUrl:function(){ return 'SCHED'; }, postseasonUrl:function(){ return 'POST'; },",
      "  schedule:function(){ return [{ id:'9', state:'pre' }]; }, joinSeason:function(d){ return d; }, gameOdds:function(){ return { line:'ND -7.5', total:52.5 }; } },",
      "  live:{ reconcileAll:function(g){ return g; } }, game:{ underWay:function(){ return false; } } };",
      "function get(){ return Promise.resolve({ events:[] }); }",
      "function cachedJSON(){ return " + (cached ? "Promise.resolve({ events:[] })" : "Promise.reject(0)") + "; }",
      "function hasEvents(){ return true; } function outcomeOf(){ return 'network'; } function say(){}",
      "function startAuto(){} function paintScheduleScreen(){} function paintHome(){ painted.push('home'); } function paintGame(){} function paintTop25(){} function statsInputsChanged(){}",
      "function warmTabs(){} function applyGameRules(){ rules++; }",
      slowSummary ? "var release; function summaryFor(){ return new Promise(function(r){ release=r; }); }"
                  : "function summaryFor(){ return Promise.resolve({}); }"].join("\n"), c);
    vm.runInContext(lift("refreshSchedule"), c);
    return c;
  }
  var s = scheduleScope(false);
  await s.refreshSchedule(false); await settled();
  ok(s.S.next && s.S.next.odds && s.S.next.odds.line === "ND -7.5", "the line arrives from the summary");
  await s.refreshSchedule(false); await settled();
  ok(s.S.games[0].odds && s.S.games[0].odds.line === "ND -7.5", "and is still there after the schedule is rebuilt (it used to vanish within 30 seconds)");
  // Codex review of PR #67: a slow summary must not hand its line to the
  // game the schedule moved on to meanwhile.
  var slow = scheduleScope(false, true);
  slow.refreshSchedule(false); await settled();
  slow.S.next = { id: "10", state: "pre" };
  slow.release({}); await settled();
  ok(slow.S.odds["9"] && slow.S.odds["9"].line === "ND -7.5" && !slow.S.odds["10"] && !slow.S.next.odds,
     "a line that arrives after the next game has changed is kept for the game it was asked for, not the new one");
  var r = scheduleScope(true);
  r.refreshSchedule(true); await settle(); await settle();
  ok(r.rules >= 1, "Game's views and the live state are set from the saved copy's paint, before the network answers");

  // ---- R6: the Matchup preview and its figures ----
  console.log("the Matchup preview");
  function previewScope() {
    var c = vm.createContext({ console: console, Promise: Promise, setTimeout: setTimeout });
    vm.runInContext([
      "var S={ games:[] }, PTS_ALLOWED={}, YDS_ALLOWED={}, EDGE='E', statsFail=1, edgeFail=1, repaints=0;",
      "var Suite={ game:{ sides:function(){ return { us:{ key:'87', school:'Notre Dame' }, them:{ key:'2509', school:'Purdue' } }; } } };",
      "var TeamOS={ espn:{ teamScheduleUrl:function(){ return 'TS'; }, teamPostseasonUrl:function(){ return 'TP'; }, scoreLines:function(){ return []; }, joinSeason:function(a){ return a; } },",
      "  season:{ pointsAllowedPerGame:function(){ return 20; } }, cfbd:{ seasonPath:function(){ return '/c'; }, yardsAllowed:function(){ return { rush:100, pass:200 }; } } };",
      "function seasonYear(){ return 2026; }",
      "function get(u){ if(u.indexOf('E')===0 && edgeFail>0){ edgeFail--; return Promise.reject(new Error('edge down')); } if(u==='TS' && statsFail>0){ return Promise.reject(new Error('down')); } return Promise.resolve({}); }",
      "function teamSeasonStats(){ if(statsFail>0){ statsFail--; return Promise.reject(new Error('down')); } return Promise.resolve([]); }",
      "function withDerived(rows, p, y){ return { p:p, y:y }; }"].join("\n"), c);
    vm.runInContext("TeamOS.game={ underWay:function(){ return false; } }; var summaries=0; function summaryFor(){ summaries++; return Promise.resolve({}); }", c);
    vm.runInContext(lift("yardsAllowedFor") + lift("pointsAllowedFor") + lift("loadGamePreview") + lift("loadGameDetail"), c);
    return c;
  }
  var p = previewScope(), V = {};
  p.loadGamePreview(V, {}, function () { p.repaints++; }); await settled();
  ok(V.preview === null && V.previewFailed === true, "a failed request leaves no card, marked to be tried again");
  p.loadGamePreview(V, {}, function () {}); await settled();
  ok(V.preview && V.previewFailed === false, "and the next try draws it (it used to stay gone for the session)");
  var q = previewScope();
  ok(await q.yardsAllowedFor("Purdue") === null && !("Purdue" in q.YDS_ALLOWED), "a failed yards request is not remembered as no figure");
  ok((await q.yardsAllowedFor("Purdue")).rush === 100, "so the next ask gets the figures");
  q.statsFail = 1;
  ok(await q.pointsAllowedFor("2509", null) === null && !("2509" in q.PTS_ALLOWED), "nor a failed points-allowed request");
  var twice = previewScope(), V2 = {}, calls = 0, orig = twice.teamSeasonStats;
  twice.statsFail = 0; twice.teamSeasonStats = function () { calls++; return new Promise(function () {}); };
  twice.loadGamePreview(V2, {}, function () {}); twice.loadGamePreview(V2, {}, function () {});
  ok(calls === 2, "one preview request set out at a time (2 calls = one set of us and them, not two sets)");

  // Codex review of PR #67: re-entering Game inside the summary's five
  // minutes still retries a failed preview (at most every 30 seconds).
  var re = previewScope(); re.statsFail = 0; re.edgeFail = 0;
  var V3 = { at: Date.now(), gd: {}, preview: null, previewFailed: true, previewAt: Date.now() - 31e3 };
  re.loadGameDetail(V3, {}, { phase: "pregame" }, function () {}); await settled();
  ok(V3.preview && V3.previewFailed === false && re.summaries === 0, "re-entering within the summary's five minutes retries the failed preview, without refetching the summary");
  var V4 = { at: Date.now(), gd: {}, preview: null, previewFailed: true, previewAt: Date.now() - 5e3 };
  re.loadGameDetail(V4, {}, { phase: "pregame" }, function () {}); await settled();
  ok(V4.preview === null, "but not on every paint: not again within 30 seconds");

  // ---- Stats: the right season, and an honest refresh (Codex review, #82) ----
  console.log("Stats: the season type, and what a refresh came to");
  var ST_DECL = appSrc.match(/^var ST=\{[^\n]*\};$/m)[0];
  function statsScope() {
    var c = vm.createContext({ console: console, Promise: Promise, setTimeout: setTimeout });
    vm.runInContext(read("teamos/espn.js") + "\n" + ST_DECL + "\n" + [
      "var POST=null, S={ next:null }, TEAM_CONFIG={ sources:{ espn:{ teamId:'87' } } }, asked=[], mode='network';",
      "function seasonYear(){ return 2026; } function noteSource(){} function paintStats(){}",
      "function $(){ return { hidden:false }; }",
      "var CORE=" + JSON.stringify(read("tools/fixtures/espn-teamstats-nd-2026-reg.json")) + ", SITE=" + JSON.stringify(read("tools/fixtures/espn-sitestats-nd.json")) + ";",
      "function fetchJSON(url){ asked.push(url);",
      "  if(mode==='down') return Promise.reject(new Error('offline'));",
      "  return Promise.resolve({ data: JSON.parse(/\\/types\\//.test(url) ? CORE : SITE), cached: mode==='cached' ? new Date().toUTCString() : null }); }"
    ].join("\n"), c);
    ["statsType", "teamSeasonFor", "gameWeekGame", "loadStats", "statsInputsChanged"].forEach(function (f) { vm.runInContext(lift(f), c); });
    return c;
  }
  var st = statsScope();
  await st.loadStats(); await settled();
  ok(st.ST.type === 2 && st.asked.some(function (u) { return /\/types\/2\/teams\/87\//.test(u); }),
     "opened before the postseason schedule is known: the regular season, and it says which");
  st.POST = JSON.parse(read("tools/fixtures/espn-schedule-nd-2024-post.json")); st.asked.length = 0;
  st.statsInputsChanged(); await settled();
  ok(st.ST.type === 3 && st.asked.some(function (u) { return /\/types\/3\/teams\/87\//.test(u); }),
     "the postseason's schedule arrives with a game played: the season is asked again, postseason included - never relabelled");
  st.asked.length = 0; await st.loadStats(); await settled();
  ok(st.asked.length === 0, "and once it holds the right season it is not asked again on the next visit");
  st.mode = "cached"; await st.loadStats(true); await settled();
  ok(st.ST.outcome === "cached", "a refresh answered by the worker's kept copy says so, not 'refreshed'");
  st.mode = "down"; var kept = st.ST.us; await st.loadStats(true); await settled();
  ok(st.ST.outcome === "failed" && st.ST.us === kept && !st.ST.failed,
     "a refresh that fails keeps the figures on screen and reports the failure");
  st.mode = "network"; await st.loadStats(true); await settled();
  ok(st.ST.outcome === "network", "and a real answer is a real refresh");
  // David, 2026-10-02: opened straight onto Stats in game week, the
  // figures were fetched before the schedule said who this week's opponent
  // was, and the opponent's column never came.
  var gw = statsScope(), wk = { oppProviderId: "2509", oppName: "Purdue", state: "pre", date: new Date(Date.now() + 2 * 864e5).toISOString() };
  var first = gw.loadStats();
  gw.S.next = wk; gw.statsInputsChanged();             // the schedule answers while the first ask is out
  await first; await settled(); await settled();
  ok(gw.ST.oppFor === "2509" && !!gw.ST.them && gw.asked.some(function (u) { return /\/teams\/2509\//.test(u); }),
     "the schedule naming this week's opponent after Stats opened: the opponent's season is asked for and shown");
  gw.asked.length = 0; gw.statsInputsChanged(); await settled();
  ok(gw.asked.length === 0, "and the schedule's next answer, the same week, asks nothing");
  var fo = statsScope(); fo.S.next = wk;
  fo.fetchJSON = function (url) { fo.asked.push(url); return /2509/.test(url) ? Promise.reject(new Error("down")) : Promise.resolve({ data: JSON.parse(/\/types\//.test(url) ? fo.CORE : fo.SITE), cached: null }); };
  await fo.loadStats(); await settled(); fo.asked.length = 0;
  fo.statsInputsChanged(); await settled();
  ok(!fo.ST.them && fo.asked.length === 0, "an opponent whose season failed is not asked for on every schedule poll (a refresh asks again)");

  console.log("\n" + (failures ? failures + " check(s) FAILED" : "what the app learns stays honest across refreshes"));
  process.exit(failures ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
