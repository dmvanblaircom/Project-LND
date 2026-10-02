#!/usr/bin/env node
/* More's load, refresh, connection and Feedback behaviour, in a real browser
   (catch-up review of 70613f7, 2026-09-25, findings 1.1-1.4).

     1. News keeps each source's last good stories and retries each source on
        its own: a failed or worker-copied source is asked again on re-entry
        and reconnection even when the other answered; a failed refresh
        keeps what was shown and says it may be old; a request already out
        is never duplicated; Home and News read the same list.
     2. Refresh Data reports what actually happened - refreshed, partly
        refreshed or not refreshed - only once the work has settled, never
        counts an unusable answer as fresh, and leaves focus on the button.
     3. Settings and News follow the connection, and data that arrives,
        while they stay open.
     4. Feedback's draft carries the real app version without a visit to
        About, and never claims a screen the fan did not visit.

   Provider answers come from the committed real fixtures, switched per step
   (ok / fail / cached / slow / bad). No network is used.

   Usage:  node tools/moreflowcheck.js
   Locally: NODE_PATH=$(npm root -g) PW_CHROMIUM=/path/to/chromium node tools/moreflowcheck.js */
"use strict";

process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = "1";

var fs = require("fs"), path = require("path");
var chromium = require("playwright").chromium;

var root = path.join(__dirname, "..");
var serve = require("./lib/serve");
function fixture(f) { return fs.readFileSync(path.join(root, "tools", "fixtures", f)); }
var server = serve(root);

var failures = 0;
function ok(cond, what) {
  if (cond) { console.log("  ok   " + what); return; }
  failures++; console.log("  FAIL " + what);
}
var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

var ESPN_NEWS = fixture("espn-news-nd-sep24.json").toString();
var ESPN_TITLES = JSON.parse(ESPN_NEWS).articles.map(function (a) { return a.headline; });
var BEAT = fs.readFileSync(path.join(root, "data", "notre-dame", "news.json")).toString();
var THREE_DAYS = new Date(Date.now() - 3 * 864e5).toUTCString();

(async function () {
  await new Promise(function (r) { server.listen(0, "127.0.0.1", r); });
  var base = "http://127.0.0.1:" + server.address().port;
  var browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined });

  // One page whose sources answer per `mode`: { espn, beat, team, schedule,
  // scoreboard } each "ok" | "fail" | "cached" | "slow" | "bad".
  async function open(opts) {
    opts = opts || {};
    var ctx = await browser.newContext({ viewport: { width: 390, height: 844 },
      serviceWorkers: opts.worker ? "allow" : "block" });
    var page = await ctx.newPage();
    var st = { mode: { espn: "ok", beat: "ok", team: "ok", schedule: "ok", scoreboard: "ok", odds: "ok", snap: "ok", roster: "ok", stats: "ok", oppstats: "ok" }, n: {} };
    var H = { "access-control-allow-origin": "*", "access-control-expose-headers": "X-IW-Cached" };
    async function answer(route, key, body) {
      st.n[key] = (st.n[key] || 0) + 1;
      var m = st.mode[key] || "ok";
      if (m === "fail") return route.fulfill({ status: 503, headers: H, body: "" });
      if (m === "slow") await wait(1500);
      if (m === "bad") return route.fulfill({ status: 200, contentType: "application/json", headers: H, body: "{not json" });
      var h = Object.assign({}, H);
      if (m === "cached") h["X-IW-Cached"] = THREE_DAYS;
      return route.fulfill({ status: 200, contentType: "application/json", headers: h, body: body });
    }
    var router = function (route) {
      var u = route.request().url();
      if (/\/news\.json(\?|$)/.test(u)) return answer(route, "beat", BEAT);
      // the official depth chart and availability report, the team's snapshots
      var snap = /\/((depth|availability)(-history)?\.json)(\?|$)/.exec(u);
      if (snap) return answer(route, "snap", fs.readFileSync(path.join(root, "data", "notre-dame", snap[1])));
      // the Season Outlook markets: the league-wide Kalshi snapshots
      var odds = /\/(odds-(title|playoff)\.json)(\?|$)/.exec(u);
      if (odds) return answer(route, "odds", fs.readFileSync(path.join(root, "data", "league", odds[1])));
      if (/kalshi|corsproxy|allorigins|codetabs/.test(u)) { st.n.odds = (st.n.odds || 0) + 1; return route.abort(); }
      if (u.startsWith(base)) return route.continue();
      if (/\/news\?team=/.test(u)) return answer(route, "espn", ESPN_NEWS);
      if (/\/teams\/87\/roster(\?|$)/.test(u)) return answer(route, "roster", fixture("espn-roster-nd-sep24.json"));
      if (/\/teams\/87\/schedule(\?|$)/.test(u)) return answer(route, "schedule", fixture("espn-schedule-nd-sep24.json"));
      if (/\/teams\/87(\?|$)/.test(u)) return answer(route, "team", fixture("espn-team.json"));
      if (/\/scoreboard\?/.test(u)) return answer(route, "scoreboard", fixture("espn-scoreboard-sep26.json"));
      // Stats: the season's figures (core API) and what each side allowed
      // (site API), for us and for this week's opponent
      if (/\/types\/\d\/teams\/87\/statistics(\?|$)/.test(u)) return answer(route, "stats", fixture("espn-teamstats-nd-2026-reg.json"));
      if (/\/types\/\d\/teams\/\d+\/statistics(\?|$)/.test(u)) return answer(route, "oppstats", fixture("espn-teamstats-osu-2026-reg.json"));
      if (/\/teams\/87\/statistics(\?|$)/.test(u)) return answer(route, "stats", fixture("espn-sitestats-nd.json"));
      if (/\/teams\/\d+\/statistics(\?|$)/.test(u)) return answer(route, "oppstats", fixture("espn-sitestats-nd.json"));
      return route.abort();
    };
    if (opts.worker) await ctx.route("**/*", router); else await page.route("**/*", router);
    return { ctx: ctx, page: page, st: st,
      go: async function (h, ms) { await page.evaluate(function (x) { location.hash = x; }, h); await page.waitForTimeout(ms || 700); } };
  }
  function news(page) {
    return page.evaluate(function () {
      var h = document.getElementById("screenNews"), b = h.querySelector(".fresh-banner");
      return { titles: [].map.call(h.querySelectorAll(".nw-hl"), function (x) { return x.textContent; }),
               banner: b ? b.textContent : "" };
    });
  }
  function espnShown(titles) { return titles.filter(function (t) { return ESPN_TITLES.indexOf(t) > -1; }).length; }

  // ---- 1. News ----------------------------------------------------------------
  console.log("1. News: each source on its own");
  var a = await open();
  a.st.mode.espn = "fail";
  await a.page.goto(base + "/?team=notre-dame#news"); await a.page.waitForTimeout(1500);
  var a1 = await news(a.page);
  ok(a1.titles.length > 0 && espnShown(a1.titles) === 0, "ESPN down, beat up: the beat stories show (" + a1.titles.length + ")");
  a.st.mode.espn = "ok";
  await a.go("#home"); await a.go("#news", 1200);
  var a2 = await news(a.page);
  ok(a.st.n.espn === 2, "re-entering News asks ESPN again although the beat feed answered (" + a.st.n.espn + " ESPN requests)");
  ok(espnShown(a2.titles) > 0, "and ESPN's stories join the list");
  var home3 = await a.page.evaluate(function () { return [].map.call(document.querySelectorAll("#screenHome .news-hl"), function (x) { return x.textContent; }); });
  await a.go("#home");
  home3 = await a.page.evaluate(function () { return [].map.call(document.querySelectorAll("#screenHome .news-hl"), function (x) { return x.textContent; }); });
  ok(home3.length === 3 && home3.join("|") === a2.titles.slice(0, 3).join("|"), "Home's three are News's first three");
  await a.ctx.close();

  console.log(" the other direction, and a worker copy beside a live feed");
  var b = await open();
  b.st.mode.beat = "fail";
  await b.page.goto(base + "/?team=notre-dame#news"); await b.page.waitForTimeout(1500);
  var bn0 = b.st.n.beat;
  b.st.mode.beat = "ok";
  await b.go("#home"); await b.go("#news", 1200);
  ok(b.st.n.beat === bn0 + 1, "a failed beat feed is asked again although ESPN answered");
  await b.ctx.close();

  var c = await open();
  c.st.mode.espn = "cached";
  await c.page.goto(base + "/?team=notre-dame#news"); await c.page.waitForTimeout(1500);
  var c1 = await news(c.page);
  ok(/outdated/i.test(c1.banner), "ESPN from the worker's copy, beat live: the page says it may be outdated");
  var cn0 = c.st.n.espn;
  c.st.mode.espn = "ok";
  await c.go("#home"); await c.go("#news", 1200);
  var c2 = await news(c.page);
  ok(c.st.n.espn === cn0 + 1, "re-entry asks ESPN again: a worker copy is not a refresh");
  ok(!c2.banner, "and the network's answer clears the warning");
  await c.ctx.close();

  console.log(" a refresh that half fails keeps what was shown");
  var d = await open();
  await d.page.goto(base + "/?team=notre-dame#news"); await d.page.waitForTimeout(1500);
  var d1 = await news(d.page);
  d.st.mode.espn = "fail";
  await d.go("#settings");
  await d.page.click("#screenSettings [data-refresh]"); await d.page.waitForTimeout(1500);
  await d.go("#news", 900);
  var d2 = await news(d.page);
  ok(d2.titles.length === d1.titles.length && espnShown(d2.titles) === espnShown(d1.titles),
     "ESPN failing on refresh keeps its " + espnShown(d1.titles) + " stories (" + d1.titles.length + " -> " + d2.titles.length + ")");
  ok(/outdated/i.test(d2.banner), "and says they may be outdated");
  d.st.mode.beat = "fail";
  await d.go("#settings");
  await d.page.click("#screenSettings [data-refresh]"); await d.page.waitForTimeout(1500);
  await d.go("#news", 900);
  var d3 = await news(d.page);
  ok(d3.titles.length === d1.titles.length && /outdated/i.test(d3.banner), "both failing after a success: every story stays, called old");
  d.st.mode.espn = "ok"; d.st.mode.beat = "ok";
  await d.ctx.setOffline(true); await d.page.waitForTimeout(200);
  await d.ctx.setOffline(false); await d.page.waitForTimeout(1500);
  var d4 = await news(d.page);
  ok(!d4.banner && d4.titles.length === d1.titles.length, "coming back online asks both again; fresh, the warning goes");
  await d.ctx.close();

  console.log(" a slow request is not duplicated");
  var e = await open();
  e.st.mode.espn = "slow";
  await e.page.goto(base + "/?team=notre-dame#news"); await e.page.waitForTimeout(300);
  await e.go("#home", 200); await e.go("#news", 200); await e.go("#home", 200); await e.go("#news", 200);
  await e.page.waitForTimeout(1600);
  ok(e.st.n.espn === 1, "one ESPN request while it was out (" + e.st.n.espn + ")");
  await e.ctx.close();

  // ---- 2. Refresh Data ------------------------------------------------------------
  console.log("2. Refresh Data says what happened");
  async function refresh(x, settleMs) {
    await x.page.focus("#screenSettings [data-refresh]");
    await x.page.click("#screenSettings [data-refresh]");
    await x.page.waitForTimeout(settleMs || 1800);
    return x.page.evaluate(function () {
      var b = document.querySelector("#screenSettings [data-refresh]");
      return { live: document.getElementById("live").textContent,
               updated: (document.querySelector('#screenSettings [data-st="updated"]') || {}).textContent || "",
               focus: document.activeElement === b };
    });
  }
  var f = await open();
  await f.page.goto(base + "/?team=notre-dame#settings"); await f.page.waitForTimeout(1800);
  var before = await f.page.evaluate(function () { return document.querySelector('#screenSettings [data-st="updated"]').textContent; });
  Object.keys(f.st.mode).forEach(function (k) { f.st.mode[k] = "fail"; });
  var f1 = await refresh(f);
  ok(!/Data refreshed/.test(f1.live) && /couldn|not refresh/i.test(f1.live), "every source failing is not 'Data refreshed': '" + f1.live + "'");
  ok(f1.updated === before, "and Last Updated does not move (" + before + ")");
  ok(f1.focus, "focus is back on Refresh Data");
  f.st.mode.team = "ok"; f.st.mode.schedule = "ok"; f.st.mode.scoreboard = "ok"; f.st.mode.beat = "ok"; f.st.mode.odds = "ok"; f.st.mode.snap = "ok"; f.st.mode.roster = "ok";
  var f2 = await refresh(f);
  ok(/some|part/i.test(f2.live) && !/^Data refreshed/.test(f2.live), "some failing is a partial refresh: '" + f2.live + "'");
  Object.keys(f.st.mode).forEach(function (k) { f.st.mode[k] = "ok"; });
  f.st.mode.schedule = "bad";
  var f3 = await refresh(f);
  ok(!/^Data refreshed/.test(f3.live), "an answer that is not JSON is not a refresh: '" + f3.live + "'");
  f.st.mode.schedule = "ok"; f.st.mode.team = "slow";
  await f.page.click("#screenSettings [data-refresh]");
  await f.page.waitForTimeout(500);
  var busy = await f.page.evaluate(function () { return document.querySelector('#screenSettings [data-st="updated"]').textContent; });
  ok(/Refreshing/.test(busy), "while a request is still out, it still says Refreshing (" + busy + ")");
  await f.page.waitForTimeout(1800);
  var f4 = await f.page.evaluate(function () { return document.getElementById("live").textContent; });
  ok(/^Data refreshed/.test(f4), "and only then that it refreshed: '" + f4 + "'");
  await f.ctx.close();

  // ---- 3. Connection, while open ----------------------------------------------------
  console.log("3. Settings and News follow the connection while open");
  var g = await open();
  g.st.mode.schedule = "slow";
  await g.page.goto(base + "/?team=notre-dame#settings"); await g.page.waitForTimeout(3000);
  var g1 = await g.page.evaluate(function () { return document.querySelector('#screenSettings [data-st="updated"]').textContent; });
  ok(/Today/.test(g1), "opened straight to Settings, Last Updated fills in without leaving (" + g1 + ")");
  await g.ctx.setOffline(true); await g.page.waitForTimeout(300);
  var g2 = await g.page.evaluate(function () { return document.querySelector('#screenSettings [data-st="updated"]').textContent; });
  ok(/Offline/.test(g2), "going offline shows on the open screen (" + g2 + ")");
  await g.ctx.setOffline(false); await g.page.waitForTimeout(1500);
  var g3 = await g.page.evaluate(function () { return document.querySelector('#screenSettings [data-st="updated"]').textContent; });
  ok(!/Offline/.test(g3), "and coming back does too (" + g3 + ")");
  await g.go("#news", 1200);
  await g.ctx.setOffline(true); await g.page.waitForTimeout(300);
  var g4 = await news(g.page);
  ok(/offline/i.test(g4.banner) && g4.titles.length > 0, "News open, offline: it says so and keeps the stories");
  await g.ctx.setOffline(false); await g.page.waitForTimeout(1500);
  await g.ctx.close();

  // ---- 4. Feedback --------------------------------------------------------------------
  console.log("4. Feedback's draft is truthful");
  function draft(page) {
    return page.evaluate(function () {
      var a = document.querySelector("#screenFeedback .fb-cta");
      return a ? decodeURIComponent(a.getAttribute("href")) : "";
    });
  }
  var h = await open();
  await h.page.goto(base + "/?team=notre-dame#feedback"); await h.page.waitForTimeout(1200);
  var h1 = await draft(h.page);
  ok(!/Screen: Home/.test(h1) && /Screen: /.test(h1), "opened directly, it does not claim Home: " + (h1.match(/Screen: [^\n]*/) || [""])[0]);
  await h.go("#news"); await h.go("#more"); await h.go("#feedback");
  ok(/Screen: News/.test(await draft(h.page)), "News, then More, then Feedback: it came from News");
  await h.ctx.close();

  var w = await open({ worker: true });
  await w.page.goto(base + "/?team=notre-dame#home");
  await w.page.waitForFunction(function () { return navigator.serviceWorker.controller; }, null, { timeout: 15000 });
  await w.go("#feedback", 1500);
  var w1 = await draft(w.page);
  ok(/Version: \d{4}-\d\d-\d\d/.test(w1), "with a worker, the version is there without visiting About: " + (w1.match(/Version: [^\n]*/) || [""])[0]);
  await w.page.reload(); await w.page.waitForTimeout(2000);
  var w2 = await draft(w.page);
  ok(/Version: \d{4}-\d\d-\d\d/.test(w2), "and on a fresh load straight to Feedback: " + (w2.match(/Version: [^\n]*/) || [""])[0]);
  await w.ctx.close();

  // Code review, 2026-10-01: a second tap while "Link copied" showed made
  // that message the row's words for good.
  console.log("5. Share Suite, tapped twice, goes back to its own words");
  var sh = await open();
  await sh.page.addInitScript(function () {
    try { Object.defineProperty(navigator, "share", { value: undefined, configurable: true }); } catch (e) {}
    Object.defineProperty(navigator, "clipboard", { value: { writeText: function () { return Promise.resolve(); } }, configurable: true });
  });
  await sh.page.goto(base + "/?team=notre-dame#more"); await sh.page.waitForTimeout(1200);
  function row(page) { return page.evaluate(function () { return document.querySelector("[data-share] .mo-sub").textContent; }); }
  var words = await row(sh.page);
  await sh.page.click("[data-share]"); await sh.page.waitForTimeout(300);
  ok(/Link copied/.test(await row(sh.page)), "the row says the link was copied");
  await sh.page.click("[data-share]"); await sh.page.waitForTimeout(4400);
  ok(await row(sh.page) === words, "and after a second tap, four seconds on, its own words again: " + JSON.stringify(words));
  await sh.ctx.close();

  // David, 2026-10-02: in game week the team labels sat under the card's
  // title, not over their figures; and Stats, failed offline, said it would
  // load when the connection returned but never asked again.
  console.log("6. Stats: labels over their figures, and back with the connection");
  var sx = await open();
  // the day before the fixture's next game, Purdue: game week, two columns
  await sx.page.clock.setFixedTime(new Date("2026-09-25T12:00:00Z"));
  sx.st.mode.stats = "fail";
  await sx.page.goto(base + "/?team=notre-dame#stats"); await sx.page.waitForTimeout(1500);
  var sx1 = await sx.page.evaluate(function () { return document.getElementById("screenStats").textContent; });
  ok(/didn.t load/i.test(sx1), "Stats failing says so: " + JSON.stringify(sx1.slice(0, 60)));
  sx.st.mode.stats = "ok";
  await sx.ctx.setOffline(true); await sx.page.waitForTimeout(300);
  await sx.ctx.setOffline(false); await sx.page.waitForTimeout(1500);
  var rows = await sx.page.evaluate(function () { return document.querySelectorAll("#screenStats .ss-row.two").length; });
  ok(rows > 20, "the connection back, Stats asks again and fills in, both teams (" + rows + " rows)");
  for (var vw of [320, 390]) {
    await sx.page.setViewportSize({ width: vw, height: 844 }); await sx.page.waitForTimeout(200);
    var off = await sx.page.evaluate(function () {
      var worst = 0, cards = document.querySelectorAll("#screenStats .ss-card");
      [].forEach.call(cards, function (card) {
        var labels = card.querySelectorAll(".ss-cols > span"), row = card.querySelector(".ss-row.two");
        if (!row || labels.length !== 3) { worst = 999; return; }
        ["us", "them"].forEach(function (side, i) {
          var a = labels[i + 1].getBoundingClientRect(), b = row.querySelector(".ss-v." + side).getBoundingClientRect();
          worst = Math.max(worst, Math.abs((a.left + a.width / 2) - (b.left + b.width / 2)));
          if (a.bottom > b.top) worst = 999;           // the label is above its figures
        });
      });
      return { worst: worst, cards: cards.length };
    });
    ok(off.cards >= 4 && off.worst <= 1, "at " + vw + "px each team label sits over its own column in all " + off.cards + " cards (off by " + off.worst.toFixed(1) + "px)");
  }
  await sx.ctx.close();
  // Codex review, #84: ours loaded, the opponent's failed - the connection
  // back asks for the opponent too, not only for a season that failed whole.
  var so = await open();
  await so.page.clock.setFixedTime(new Date("2026-09-25T12:00:00Z"));
  so.st.mode.oppstats = "fail";
  await so.page.goto(base + "/?team=notre-dame#stats"); await so.page.waitForTimeout(1500);
  var so1 = await so.page.evaluate(function () { return { one: document.querySelectorAll("#screenStats .ss-row").length, two: document.querySelectorAll("#screenStats .ss-row.two").length }; });
  ok(so1.one > 20 && so1.two === 0, "the opponent's season failing: ours shows, one column (" + so1.one + " rows)");
  so.st.mode.oppstats = "ok";
  await so.ctx.setOffline(true); await so.page.waitForTimeout(300);
  await so.ctx.setOffline(false); await so.page.waitForTimeout(1500);
  var so2 = await so.page.evaluate(function () { return document.querySelectorAll("#screenStats .ss-row.two").length; });
  ok(so2 > 20, "the connection back, the opponent's column fills in (" + so2 + " rows)");
  await so.ctx.close();

  await browser.close(); server.close();
  console.log("\n" + (failures ? failures + " check(s) FAILED" : "More recovers per source, reports refreshes truthfully and follows the connection"));
  process.exit(failures ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
