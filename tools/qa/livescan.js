#!/usr/bin/env node
/* One live scan (David, 2026-09-26: "scan the app every 15 minutes today for
   errors and opportunities; don't change things, log them").

   The real app, served from this checkout, against real ESPN payloads the
   capture workflow just recorded (the sandbox cannot reach ESPN itself), with
   the clock fixed at the capture time. Every main screen is opened at 390
   and the Game screen also at 320, and checked for:

     - page errors and console errors (blocked images/news/odds excepted)
     - "undefined", "NaN", "null", "[object" in visible text
     - horizontal overflow, duplicate ids
     - the configured team's live game: the same score and clock on Home,
       Game and Top 25 as the scoreboard payload says; the Drive Tracker
       titled for the team with the ball; the possession football on the
       side the scoreboard says has it

   It writes JSON findings and screenshots; it changes nothing.

   Usage: node tools/qa/livescan.js <tag> <outdir>
     reads tools/fixtures/espn-scoreboard-scan-<tag>.json,
           espn-schedule-scan-nd-<tag>.json, espn-summary-scan-*-<tag>.json */
"use strict";
var http = require("http"), fs = require("fs"), path = require("path");
var chromium = require("playwright").chromium;

var root = path.join(__dirname, "..", "..");
var tag = process.argv[2], out = process.argv[3];
var FX = path.join(root, "tools", "fixtures");
function fx(name) { var f = path.join(FX, name); return fs.existsSync(f) ? fs.readFileSync(f) : null; }
var board = fx("espn-scoreboard-scan-" + tag + ".json");
if (!board) { console.error("no scoreboard capture for " + tag); process.exit(2); }
var boardJ = JSON.parse(board);
var capturedAt = (/captured (\S+Z)/.exec(boardJ._comment || "") || [])[1] || new Date().toISOString();
var summaries = {};
fs.readdirSync(FX).forEach(function (f) {
  var m = new RegExp("^espn-summary-scan-.*-" + tag + "\\.json$").exec(f);
  if (m) { var j = JSON.parse(fs.readFileSync(path.join(FX, f))); var id = (/event (\d+)/.exec(j._comment || "") || [])[1]; if (id) summaries[id] = fs.readFileSync(path.join(FX, f)); }
});
var schedule = fx("espn-schedule-scan-nd-" + tag + ".json") || fx("espn-schedule-nd-sep24.json");
var rankings = fx("espn-rankings-scan-" + tag + ".json") || fx("espn-rankings-sep20.json");

var srv = http.createServer(function (q, r) {
  var p = new URL(q.url, "http://x").pathname, f = path.join(root, p === "/" ? "index.html" : p.slice(1));
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "content-type": /\.js$/.test(f) ? "text/javascript" : /\.css$/.test(f) ? "text/css" : /\.json$/.test(f) ? "application/json" :
                                     /\.svg$/.test(f) ? "image/svg+xml" : /\.png$/.test(f) ? "image/png" : "text/html" });
  fs.createReadStream(f).pipe(r);
});

// The configured team's game on the scoreboard, as the payload says it.
var ND = "87";
var ndEv = (boardJ.events || []).filter(function (e) { return e.competitions[0].competitors.some(function (c) { return String(c.id || c.team.id) === ND; }); })[0];
function sideOf(ev, us) { return ev.competitions[0].competitors.filter(function (c) { return (String(c.id || c.team.id) === ND) === us; })[0]; }
var truth = ndEv ? {
  id: ndEv.id, state: ndEv.competitions[0].status.type.state, detail: ndEv.competitions[0].status.type.shortDetail,
  clock: ndEv.competitions[0].status.displayClock, period: ndEv.competitions[0].status.period,
  us: sideOf(ndEv, true).score, them: sideOf(ndEv, false).score,
  possession: ((ndEv.competitions[0].situation || {}).possession || null)
} : null;

(async function () {
  await new Promise(function (r) { srv.listen(0, "127.0.0.1", r); });
  var base = "http://127.0.0.1:" + srv.address().port;
  var browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
  var findings = [], screens = [];
  function find(sev, where, what) { findings.push({ severity: sev, where: where, what: what }); }

  async function open(hash, width, name) {
    var ctx = await browser.newContext({ viewport: { width: width, height: 900 }, serviceWorkers: "block", timezoneId: "America/New_York" });
    var pg = await ctx.newPage(), errs = [];
    pg.on("pageerror", function (e) { errs.push(String(e)); });
    pg.on("console", function (m) { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
    await pg.clock.setFixedTime(new Date(capturedAt));
    await pg.route("**/*", function (rt) {
      var u = rt.request().url(); if (u.startsWith(base)) return rt.continue();
      var J = function (b) { return b ? rt.fulfill({ status: 200, contentType: "application/json", body: b }) : rt.abort(); };
      var ev = /summary\?event=(\d+)/.exec(u); if (ev) return J(summaries[ev[1]] || null);
      if (/scoreboard/.test(u)) return J(board);
      if (/\/teams\/87\/schedule\?seasontype=3/.test(u)) return J(fx("espn-schedule-nd-2025-post.json"));
      if (/\/teams\/87\/schedule/.test(u)) return J(schedule);
      if (/\/teams\/87\/roster/.test(u)) return J(fx("espn-roster-nd-sep24.json"));
      if (/\/rankings/.test(u)) return J(rankings);
      return rt.abort();
    });
    await pg.goto(base + "/?team=notre-dame" + hash); await pg.waitForTimeout(3500);
    var r = await pg.evaluate(function () {
      var s = [].filter.call(document.querySelectorAll("[id^='screen']:not(#screenHead)"), function (x) { return !x.hidden; })[0];
      var ids = {}, dup = [];
      [].forEach.call(document.querySelectorAll("[id]"), function (e) { if (ids[e.id]) dup.push(e.id); ids[e.id] = 1; });
      return { hash: location.hash, text: s ? s.innerText : "", overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
               dup: dup, ball: [].map.call(document.querySelectorAll(".gh-ball, .gc-ball"), function (b) { return b.closest(".us") ? "us" : b.closest(".them") ? "them" : "?"; }),
               drive: (document.querySelector(".gcard-drive .gcard-title") || {}).textContent || null,
               driveColor: (document.querySelector(".gcard-drive .f-wrap") || { getAttribute: function () { return null; } }).getAttribute("style") };
    });
    await pg.screenshot({ path: path.join(out, name + "-" + width + ".png") });
    await ctx.close();
    errs.forEach(function (e) { find("error", name + " @" + width, "page/console error: " + e.slice(0, 200)); });
    var bad = /\bundefined\b|\bNaN\b|\bnull\b|\[object/.exec(r.text);
    if (bad) find("error", name + " @" + width, "visible text contains '" + bad[0] + "': …" + r.text.slice(Math.max(0, bad.index - 60), bad.index + 40).replace(/\s+/g, " ") + "…");
    if (r.overflow) find("warn", name + " @" + width, "horizontal overflow");
    if (r.dup.length) find("warn", name + " @" + width, "duplicate ids: " + r.dup.join(", "));
    screens.push(Object.assign({ name: name, width: width }, r, { text: r.text.replace(/\s+/g, " ").slice(0, 400) }));
    return r;
  }

  var home = await open("#home", 390, "home");
  var game = await open("#game", 390, "game");
  await open("#game", 320, "game");
  await open("#game/box", 390, "game-box");
  await open("#game/plays", 390, "game-plays");
  var top = await open("#top25", 390, "top25");
  await open("#top25/rankings", 390, "top25-rankings");
  await open("#schedule", 390, "schedule");
  await open("#roster", 390, "roster");

  // The configured team's live game, against the payload.
  if (truth && truth.state === "in") {
    var sc = function (t) { return new RegExp("\\b" + truth.us + "\\b[\\s\\S]*\\b" + truth.them + "\\b|\\b" + truth.them + "\\b[\\s\\S]*\\b" + truth.us + "\\b").test(t); };
    if (!sc(home.text)) find("error", "home", "Home does not show the scoreboard's score " + truth.us + "-" + truth.them);
    if (!sc(game.text)) find("error", "game", "Game does not show the scoreboard's score " + truth.us + "-" + truth.them);
    if (truth.clock && game.text.indexOf(truth.clock) < 0) find("error", "game", "Game header does not show the clock " + truth.clock);
    var wantBall = truth.possession ? (truth.possession === ND ? "us" : "them") : null;
    var gotBall = game.ball.filter(function (b) { return b !== "?"; });
    if (wantBall && gotBall.join() !== wantBall) find("error", "game", "possession football on " + (gotBall.join() || "no side") + ", scoreboard says " + wantBall);
    if (!wantBall && gotBall.length) find("warn", "game", "football shown (" + gotBall.join() + ") while the scoreboard names no side with the ball");
    if (!game.drive) find("warn", "game", "live game, but no Drive Tracker card");
  }
  (boardJ.events || []).forEach(function (e) {
    var c = e.competitions[0]; if (c.status.type.state !== "in") return;
    var ranked = c.competitors.some(function (x) { return x.curatedRank && x.curatedRank.current <= 25; });
    if (!ranked) return;
    var a = c.competitors[0], b = c.competitors[1];
    if (top.text.indexOf(a.team.shortDisplayName || a.team.displayName) >= 0 && !(new RegExp("\\b" + a.score + "\\b").test(top.text) && new RegExp("\\b" + b.score + "\\b").test(top.text)))
      find("error", "top25", "live " + e.shortName + " score " + a.score + "-" + b.score + " not on Top 25");
  });

  fs.writeFileSync(path.join(out, "findings.json"), JSON.stringify({ tag: tag, capturedAt: capturedAt, truth: truth, findings: findings, screens: screens }, null, 1));
  console.log(JSON.stringify({ capturedAt: capturedAt, truth: truth, findings: findings,
    game: { hash: game.hash, drive: game.drive, driveColor: game.driveColor, ball: game.ball } }, null, 1));
  await browser.close(); srv.close();
})().catch(function (e) { console.error(e); process.exit(1); });
