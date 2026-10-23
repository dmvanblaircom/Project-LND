#!/usr/bin/env node
/* Seasonal navigation in the real app (offseason UI contract, "Seasonal
   navigation"; Codex review of #161). The nav follows the league, not this
   team: Top 25 and Game stay through the title game, the offseason nav starts
   with ESPN's final AP poll, and it holds on every screen - not only once a
   fan visits Home.

   Real ESPN fixtures: Notre Dame's 2025 regular season and empty postseason
   (it declined its bowl), ESPN's 2025 postseason board, its 2026 schedule
   (or none yet, for the season-complete card).
   The rankings feed is the real Jan 14, 2026 feed; the "final" scenarios set
   its AP poll's occurrence.last to true, as ESPN marks the Final Rankings
   (espn-corerank-ap-2025-post.json). No live APIs. */
"use strict";
var fs = require("fs"), path = require("path"), assert = require("assert");
var chromium = require("playwright").chromium, root = path.join(__dirname, "..");
var server = require("./lib/serve")(root), checks = [];
function fixture(n) { return fs.readFileSync(path.join(root, "tools/fixtures", n), "utf8"); }
function ok(value, label) { assert(value, label); checks.push(label); console.log("  ok   " + label); }
var RANKINGS = JSON.parse(fixture("espn-rankings-cfp-20260114.json"));
// Notre Dame's 2026 schedule as ESPN shows it before the season: the real
// capture (Oct 2026) with every game set back to scheduled.
function preseason2026() {
  var d = JSON.parse(fixture("espn-schedule-nd-2026-reg.json"));
  d.events.forEach(function (e) {
    (e.competitions || []).forEach(function (c) {
      c.status = { type: { state: "pre", completed: false, name: "STATUS_SCHEDULED", description: "Scheduled" } };
      (c.competitors || []).forEach(function (t) { delete t.score; delete t.winner; });
    });
  });
  return JSON.stringify(d);
}
function rankings(apLast) {
  var d = JSON.parse(JSON.stringify(RANKINGS));
  d.rankings.forEach(function (r) { if (r.type === "ap") r.occurrence = Object.assign({}, r.occurrence, { last: apLast }); });
  return JSON.stringify(d);
}

(async function () {
  await new Promise(function (r) { server.listen(0, "127.0.0.1", r); });
  var base = "http://127.0.0.1:" + server.address().port;
  var browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined });
  async function open(o) {
    var ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: "America/New_York", serviceWorkers: "block" });
    var page = await ctx.newPage(), errors = [], seen = {};
    await page.clock.setSystemTime(new Date(o.now));
    page.on("pageerror", function (e) { errors.push(String(e)); });
    await ctx.route("**/*", function (route) {
      var u = route.request().url(), body = null;
      if (u.startsWith(base)) return route.continue();
      if (/\/teams\/87\/schedule\?seasontype=2&season=2026/.test(u)) body = o.next2026 ? fixture("espn-schedule-nd-2026-reg.json") : '{"events":[]}';
      else if (/\/teams\/87\/schedule\?seasontype=3/.test(u)) body = fixture("espn-schedule-nd-2025-post.json");
      else if (/\/teams\/87\/schedule/.test(u)) body = o.current2026 ? preseason2026() : fixture("espn-schedule-nd-2025-reg.json");
      else if (/\/scoreboard\?.*seasontype=3/.test(u)) body = o.boardSet ? fixture("espn-scoreboard-postboard-2025.json") : '{"events":[]}';
      else if (/\/scoreboard\?/.test(u)) body = '{"events":[]}';
      else if (/\/rankings/.test(u)) body = rankings(o.apLast);
      if (/\/schedule/.test(u)) seen.schedule = true;
      if (/\/rankings/.test(u)) seen.rankings = true;
      if (body) return route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: body });
      return route.abort();
    });
    await page.goto(base + "/?team=notre-dame" + o.hash);
    // The app keeps its state private: wait until the schedule and the
    // rankings it needs have been answered, then for the paint after them.
    var t0 = Date.now();
    while (!(seen.schedule && seen.rankings) && Date.now() - t0 < 15000) await page.waitForTimeout(100);
    await page.waitForFunction(function () { return !document.getElementById("launch") && document.querySelector("#navbar a"); }, null, { timeout: 15000 });
    await page.waitForTimeout(800);
    return { ctx: ctx, page: page, errors: errors, seen: seen };
  }
  function tabs(page) { return page.evaluate(function () { return [].map.call(document.querySelectorAll("#navbar a"), function (a) { return a.dataset.screen; }).join(","); }); }
  var IN_SEASON = "home,top25,game,roster,more", OFFSEASON = "home,news,schedule,roster,more";
  try {
    // S2: the regular season is over, the field is not set. The team's season
    // card shows, but the league is still playing: Top 25 and Game stay.
    var a = await open({ now: "2025-12-01T17:00:00Z", hash: "#home", apLast: false, boardSet: false });
    ok(await a.page.evaluate(function () { return !!document.querySelector("#screenHome .os-hero"); }), "S2: Home shows the season card");
    ok((await tabs(a.page)) === IN_SEASON, "S2: Top 25 and Game stay - the league is still playing (Codex, #161)");
    await a.ctx.close();

    // January, this team's season over (Notre Dame declined its bowl), but no
    // final AP poll yet: the title game decides, not the team.
    var b = await open({ now: "2026-01-14T17:00:00Z", hash: "#home", apLast: false, boardSet: true });
    ok(await b.page.evaluate(function () { return !!document.querySelector("#screenHome .os-hero"); }), "season complete: Home shows the season card");
    ok((await tabs(b.page)) === IN_SEASON, "season complete, no final AP poll yet: Top 25 and Game stay through the title game");
    await b.ctx.close();

    // After the title game: ESPN's final AP poll is out. A fan who opens a
    // saved Schedule address - never visiting Home - gets the offseason nav.
    var c = await open({ now: "2026-01-25T17:00:00Z", hash: "#schedule/results", apLast: true, boardSet: true });
    ok(await c.page.evaluate(function () { return document.getElementById("screenHome").hidden; }), "the fan is on Schedule; Home was never shown");
    ok((await tabs(c.page)) === OFFSEASON, "final AP poll out: News and Schedule replace Top 25 and Game, on any screen (Codex, #161)");
    ok(c.errors.length === 0, "no page errors (" + c.errors.join(" | ") + ")");
    await c.ctx.close();

    // The same after the title game, opened on Home.
    var d = await open({ now: "2026-01-25T17:00:00Z", hash: "#home", apLast: true, boardSet: true });
    ok((await tabs(d.page)) === OFFSEASON, "and on Home");
    await d.ctx.close();

    // Next season's opener confirmed, more than 14 days out: still the
    // offseason nav; within 14 days, Game comes back (Top 25 waits for the
    // preseason poll).
    var e = await open({ now: "2026-01-25T17:00:00Z", hash: "#home", apLast: true, boardSet: true, next2026: true });
    ok((await tabs(e.page)) === OFFSEASON, "an opener in September, seen in January: still the offseason nav");
    await e.ctx.close();
    // July: the app's season year is 2026 and its schedule is current, but
    // the preseason poll is not out - the offseason nav holds.
    var g = await open({ now: "2026-07-15T16:00:00Z", hash: "#home", apLast: true, boardSet: true, current2026: true });
    ok((await tabs(g.page)) === OFFSEASON, "July, the new season's schedule current, no preseason poll yet: the offseason nav holds");
    await g.ctx.close();
    var f = await open({ now: "2026-08-28T17:00:00Z", hash: "#home", apLast: true, boardSet: true, current2026: true });
    ok((await tabs(f.page)) === "home,news,game,roster,more", "nine days before the opener: Game is back; Top 25 waits for the preseason poll");
    await f.ctx.close();
    var h = await open({ now: "2026-08-28T17:00:00Z", hash: "#home", apLast: false, boardSet: true, current2026: true });
    ok((await tabs(h.page)) === IN_SEASON, "the preseason poll out (not marked last): Top 25 and Game both back");
    await h.ctx.close();
  } finally {
    await browser.close(); server.close();
  }
  console.log("\n" + checks.length + " checks: the nav follows the league's calendar, on every screen");
})().catch(function (e) { console.error("FAIL " + (e && e.message || e)); process.exit(1); });
