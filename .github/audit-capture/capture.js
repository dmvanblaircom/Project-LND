#!/usr/bin/env node
/* Audit-only capture of the real app (no production code). Serves this
   checkout, answers provider requests from the repository's fixtures, pins
   the clock per scenario, and screenshots every destination and state.

   node capture.js REPO OUT FXDIR_ND FXDIR_OSU
   CAPTURE_ONLY=<substring> limits to shots whose name contains it. */
"use strict";
var fs = require("fs"), path = require("path");
var chromium = require("playwright").chromium;
var root = path.resolve(process.argv[2]), out = path.resolve(process.argv[3]);
var FX = { nd: path.resolve(process.argv[4]), osu: path.resolve(process.argv[5]) };
var serve = require(path.join(root, "tools/lib/serve"));
fs.mkdirSync(out, { recursive: true });
function fx(n) { return fs.readFileSync(path.join(root, "tools/fixtures", n), "utf8"); }
function st(team, n) { return fs.readFileSync(path.join(FX[team], n), "utf8"); }
var ONLY = process.env.CAPTURE_ONLY || "";
var LIST = process.env.CAPTURE_LIST ? process.env.CAPTURE_LIST.split(",") : null;

// Notre Dame's full 2026 regular season, with the Michigan State game in the
// scenario's state and every later game not yet played.
function ndSeason(state) {
  var full = JSON.parse(fx("espn-schedule-nd-2026-reg.json"));
  var ev = JSON.parse(st("nd", "schedule-" + state + ".json")).events.filter(function (e) { return e.id === "401858453"; })[0];
  full.events = full.events.map(function (e) {
    if (e.id === "401858453") return ev;
    if (new Date(e.date) > new Date("2026-09-20T12:00:00Z")) {
      e = JSON.parse(JSON.stringify(e));
      (e.competitions || []).forEach(function (c) {
        c.status = { type: { state: "pre", completed: false, name: "STATUS_SCHEDULED", description: "Scheduled" } };
        (c.competitors || []).forEach(function (t) { delete t.score; delete t.winner; });
      });
    }
    return e;
  });
  return JSON.stringify(full);
}
function preseason(file) {
  var d = JSON.parse(fx(file));
  d.events.forEach(function (e) {
    (e.competitions || []).forEach(function (c) {
      c.status = { type: { state: "pre", completed: false, name: "STATUS_SCHEDULED", description: "Scheduled" } };
      (c.competitors || []).forEach(function (t) { delete t.score; delete t.winner; });
    });
  });
  return JSON.stringify(d);
}
function rankingsFinal() {
  var d = JSON.parse(fx("espn-rankings-cfp-20260114.json"));
  d.rankings.forEach(function (r) { if (r.type === "ap") r.occurrence = Object.assign({}, r.occurrence, { last: true }); });
  return JSON.stringify(d);
}

// Scenarios: the clock and the answers for one moment in a season.
var SCEN = {
  "nd-pre":   { team: "notre-dame", id: "87",  now: "2026-09-19T17:00:00Z", schedule: function () { return ndSeason("pre"); },
                scoreboard: function () { return st("nd", "scoreboard-pre.json"); }, summary: function () { return st("nd", "summary-pre.json"); } },
  "nd-live":  { team: "notre-dame", id: "87",  now: "2026-09-20T01:40:00Z", schedule: function () { return ndSeason("live"); },
                scoreboard: function () { return st("nd", "scoreboard-live.json"); }, summary: function () { return st("nd", "summary-live.json"); } },
  "nd-final": { team: "notre-dame", id: "87",  now: "2026-09-20T15:00:00Z", schedule: function () { return ndSeason("final"); },
                scoreboard: function () { return st("nd", "scoreboard-final.json"); }, summary: function () { return st("nd", "summary-final.json"); } },
  "osu-pre":  { team: "ohio-state", id: "194", now: "2026-09-26T13:00:00Z", schedule: function () { return st("osu", "schedule-pre.json"); },
                scoreboard: function () { return st("osu", "scoreboard-pre.json"); }, summary: function () { return st("osu", "summary-pre.json"); } },
  "osu-live": { team: "ohio-state", id: "194", now: "2026-09-26T18:05:00Z", schedule: function () { return st("osu", "schedule-live.json"); },
                scoreboard: function () { return st("osu", "scoreboard-live.json"); }, summary: function () { return st("osu", "summary-live.json"); } },
  "osu-final":{ team: "ohio-state", id: "194", now: "2026-09-26T23:30:00Z", schedule: function () { return st("osu", "schedule-final.json"); },
                scoreboard: function () { return st("osu", "scoreboard-final.json"); }, summary: function () { return st("osu", "summary-final.json"); } },
  // The offseason after the final AP poll (offseason UI contract, S4), with
  // next season's schedule published.
  "nd-off":   { team: "notre-dame", id: "87", now: "2026-01-20T17:00:00Z", off: true,
                reg: function () { return fx("espn-schedule-nd-2025-reg.json"); }, post: function () { return fx("espn-schedule-nd-2025-post.json"); },
                next: function () { return preseason("espn-schedule-nd-2026-reg.json"); } },
  "osu-off":  { team: "ohio-state", id: "194", now: "2026-01-20T17:00:00Z", off: true,
                reg: function () { return fx("espn-schedule-osu-2025-reg.json"); }, post: function () { return fx("espn-schedule-osu-2025-post-notes.json"); },
                next: function () { return preseason("espn-schedule-osu-2026.json"); } }
};

// The week's whole slate, with this team's game in the scenario's state.
function slate(sc) {
  var d = JSON.parse(fx(sc.team === "ohio-state" ? "espn-scoreboard-sep26.json" : "espn-scoreboard-sep19.json"));
  var mine = JSON.parse(sc.scoreboard()).events[0];
  var found = false;
  d.events = d.events.map(function (e) { if (e.id === mine.id) { found = true; return mine; } return e; });
  if (!found) d.events.unshift(mine);
  return JSON.stringify(d);
}
var ROSTERS = { "87": "espn-roster-nd-sep24.json", "194": "espn-roster-osu-sep24.json" };
var NEWS = { "87": "espn-news-nd-sep24.json", "194": "espn-news-osu-sep24.json" };
function respond(sc, url) {
  if (sc.off) {
    if (/\/schedule\?seasontype=2&season=2026/.test(url)) return sc.next();
    if (/\/schedule\?seasontype=3/.test(url)) return sc.post();
    if (/\/schedule/.test(url)) return sc.reg();
    if (/\/scoreboard\?.*seasontype=3/.test(url)) return fx("espn-scoreboard-postboard-2025.json");
    if (/\/scoreboard\?/.test(url)) return '{"events":[]}';
    if (/\/rankings/.test(url)) return rankingsFinal();
  } else {
    if (/\/schedule\?seasontype=3/.test(url)) return fx("espn-schedule-nd-2025-post.json").replace(/"events":\s*\[[\s\S]*\]/, '"events":[]');
    if (/\/schedule/.test(url)) return sc.schedule();
    if (/\/scoreboard\?/.test(url)) return url.indexOf("seasontype=3") !== -1 ? '{"events":[]}' : slate(sc);
    if (/\/rankings/.test(url)) return fx("espn-rankings-sep20.json");
    if (/\/summary\?/.test(url)) return sc.summary();
  }
  if (/\/data\/league\/rankings-\d+\.json/.test(url)) return fx("rankings-2026-sample.json");
  if (/\/data\/league\/fpi-history-\d+\.json/.test(url)) return fx("fpi-history-2026-sample.json");
  var ro = /\/teams\/(\d+)\/roster(?:\?|$)/.exec(url);
  if (ro) return fx(ROSTERS[ro[1]] || "espn-roster.json");
  var nw = /\/news\?team=(\d+)/.exec(url);
  if (nw && NEWS[nw[1]]) return fx(NEWS[nw[1]]);
  if (/\/news\?/.test(url)) return fx("espn-news.json");
  if (/\/summary\?/.test(url)) return fx("espn-summary-pre.json");
  var ld = /\/types\/\d\/teams\/(\d+)\/leaders/.exec(url);
  if (ld) return fx(ld[1] === "194" ? "espn-leaders-osu-2026-reg.json" : "espn-leaders-nd-2026-reg.json");
  var ts = /\/types\/\d\/teams\/(\d+)\/statistics/.exec(url);
  if (ts) return fx(ts[1] === "87" ? "espn-teamstats-nd-2026-reg.json" : "espn-teamstats-osu-2026-reg.json");
  if (/\/teams\/87\/statistics(?:\?|$)/.test(url)) return fx("espn-sitestats-nd.json");
  if (/\/statistics(?:\?|$)/.test(url)) return fx("espn-season-stats.json");
  if (/\/teams\/\d+(?:\?|$)/.test(url)) return fx("espn-team.json");
  return null;
}

// What to capture, per scenario: [route, name, full page?]
var GAME = {
  pre: [["#game", "game-details"]],
  live: [["#game/drive", "game-drive"], ["#game/box", "game-box"], ["#game/plays", "game-plays"], ["#game/stats", "game-stats"]],
  final: [["#game/box", "game-box"], ["#game/plays", "game-plays"], ["#game/stats", "game-stats"]]
};
var DEST = [["#top25/games", "around-games"], ["#top25/rankings", "around-rankings"], ["#outlook", "outlook"],
            ["#roster/depth", "roster-depth"], ["#roster/roster", "roster-list"], ["#roster/availability", "roster-availability"],
            ["#roster/prospects", "roster-prospects"], ["#more", "more"], ["#schedule", "schedule"], ["#schedule/results", "schedule-results"],
            ["#news", "news"], ["#stats/team", "stats-team"], ["#stats/players", "stats-players"], ["#settings", "settings"],
            ["#about", "about"], ["#feedback", "feedback"]];
var JOBS = [];
["nd", "osu"].forEach(function (t) {
  ["pre", "live", "final"].forEach(function (s) {
    [390, 1280].forEach(function (w) {
      ["team", "suite"].forEach(function (style) {
        var shots = [["#home", "home"]].concat(style === "team" ? GAME[s] : GAME[s].slice(0, 1));
        JOBS.push({ scen: t + "-" + s, width: w, style: style, shots: shots });
      });
    });
  });
  [390, 1280].forEach(function (w) {
    JOBS.push({ scen: t + "-pre", width: w, style: "team", shots: DEST, tag: "dest" });
    JOBS.push({ scen: t + "-off", width: w, style: "team", shots: [["#home", "home"], ["#top25/games", "around-games"], ["#schedule", "schedule"], ["#roster", "roster"]] });
    JOBS.push({ scen: t + "-off", width: w, style: "suite", shots: [["#home", "home"]] });
  });
});

(async function () {
  var server = serve(root);
  await new Promise(function (r) { server.listen(0, "127.0.0.1", r); });
  var base = "http://127.0.0.1:" + server.address().port;
  var browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined });
  var log = [];
  for (var job of JOBS) {
    var sc = SCEN[job.scen];
    var names = job.shots.map(function (s) { return job.scen + "-" + job.style + "-" + job.width + "-" + s[1]; });
    if (ONLY && !names.some(function (n) { return n.indexOf(ONLY) !== -1; })) continue;
    if (LIST && !names.some(function (n) { return LIST.indexOf(n) !== -1; })) continue;
    var phone = job.width < 600;
    var ctx = await browser.newContext({ viewport: { width: job.width, height: phone ? 844 : 900 }, deviceScaleFactor: phone ? 2 : 1,
                                         serviceWorkers: "block", timezoneId: "America/New_York", locale: "en-US" });
    var page = await ctx.newPage(), errors = [], blocked = {};
    page.on("pageerror", function (e) { errors.push(String(e).slice(0, 200)); });
    await page.clock.setSystemTime(new Date(sc.now));
    await ctx.addInitScript(function (s) { try { localStorage.setItem("suite-style", s); } catch (e) {} }, job.style);
    await ctx.route("**/*", function (route) {
      var u = route.request().url();
      if (u.startsWith(base)) return route.continue();
      var body = respond(sc, u);
      if (body) return route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: body });
      if (/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(u)) return route.continue();
      if (/^https:\/\/a\.espncdn\.com\//.test(u) || /^https:\/\/[^/]+\/.*\.(png|jpe?g|webp|svg|gif)(\?|$)/i.test(u)) return route.continue();
      blocked[u.split("?")[0].slice(0, 80)] = 1;
      return route.abort();
    });
    await page.goto(base + "/?team=" + sc.team + job.shots[0][0], { waitUntil: "domcontentloaded" });
    await page.waitForFunction(function () { return !document.getElementById("launch"); }, null, { timeout: 15000 }).catch(function () {});
    await page.waitForTimeout(1800);
    for (var i = 0; i < job.shots.length; i++) {
      var s = job.shots[i], name = names[i];
      if (i > 0) { await page.evaluate(function (h) { location.hash = h; window.scrollTo(0, 0); }, s[0]); await page.waitForTimeout(1200); }
      await page.evaluate(function () { window.scrollTo(0, 0); });
      await page.waitForTimeout(150);
      var hash = await page.evaluate(function () { return location.hash; });
      if (LIST && LIST.indexOf(name) === -1) continue;
      await page.screenshot({ path: path.join(out, name + "-top.jpg"), type: "jpeg", quality: 70 });
      var vp = page.viewportSize();
      var h = await page.evaluate(function () { return document.documentElement.scrollHeight; });
      await page.setViewportSize({ width: vp.width, height: Math.min(9000, Math.max(vp.height, h)) });
      await page.waitForTimeout(250);
      await page.screenshot({ path: path.join(out, name + "-full.jpg"), type: "jpeg", quality: 62 });
      await page.setViewportSize(vp);
      await page.waitForTimeout(100);
      log.push({ name: name, asked: s[0], hash: hash, height: h });
    }
    log.push({ job: job.scen + "-" + job.style + "-" + job.width, errors: errors, blocked: Object.keys(blocked) });
    await ctx.close();
  }
  // The chooser, with no team chosen.
  if ((!ONLY || "chooser".indexOf(ONLY) !== -1) && (!LIST || LIST.indexOf("chooser-390") !== -1)) {
    var c2 = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: "block" });
    var p2 = await c2.newPage();
    await c2.route("**/*", function (r) { var u = r.request().url(); return u.startsWith(base) || /fonts\.(googleapis|gstatic)|espncdn/.test(u) ? r.continue() : r.abort(); });
    await p2.goto(base + "/", { waitUntil: "domcontentloaded" });
    await p2.waitForTimeout(2500);
    await p2.screenshot({ path: path.join(out, "chooser-390-top.jpg"), type: "jpeg", quality: 70 });
    // the launch screen, caught as it plays
    await p2.goto(base + "/?team=notre-dame", { waitUntil: "commit" });
    await p2.waitForTimeout(450);
    await p2.screenshot({ path: path.join(out, "launch-390-top.jpg"), type: "jpeg", quality: 70 });
    await c2.close();
  }
  fs.writeFileSync(path.join(out, "capture-log.json"), JSON.stringify(log, null, 1));
  await browser.close(); server.close();
  console.log("done", log.filter(function (l) { return l.name; }).length, "shots");
})().catch(function (e) { console.error(e); process.exit(1); });
