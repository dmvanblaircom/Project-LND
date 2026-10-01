#!/usr/bin/env node
/* Pull to refresh (suite/nav.js pull(), app.js manualRefresh(); David,
   2026-10-01: the same refresh as Settings' Refresh Data).

   Real touch events in Chromium (a touch-enabled phone viewport) on the real
   page with real fixtures, counting the provider requests each gesture makes:
     - pulled down from the top past the mark and let go: the team's data is
       asked for again, the indicator turns until it has settled, and
       Settings reports the outcome, as for its own button
     - on Game, the open game's summary is asked for again too (before
       kickoff it was otherwise kept five minutes)
     - not a refresh: a short pull, a pull with the page scrolled down, a
       mostly sideways drag, a pull that goes back up before letting go
     - one at a time: a pull while one is under way, or Refresh Data pressed
       during a pull, joins it rather than starting another
     - the browser's own pull-to-reload is off on the app, left on the chooser;
       the indicator is hidden from assistive technology

   Usage: node tools/pullcheck.js     (exit 1 on failure) */
"use strict";
var fs = require("fs"), path = require("path");
var chromium = require("playwright").chromium;
var root = path.join(__dirname, "..");
var serve = require("./lib/serve");
var FX = path.join(root, "tools", "fixtures");

var failures = 0;
function ok(cond, what) { if (cond) { console.log("  ok   " + what); return; } failures++; console.log("  FAIL " + what); }

function kind(url) {
  return /\/schedule\?seasontype=3/.test(url) ? "post"
       : /\/schedule(\?|$)/.test(url) ? "schedule"
       : /\/scoreboard\?/.test(url) ? "scoreboard"
       : /\/rankings/.test(url) ? "rankings"
       : /\/news\?/.test(url) ? "news"
       : /\/summary\?/.test(url) ? "summary"
       : /\/statistics/.test(url) ? "stats"
       : /\/teams\/\d+\/roster/.test(url) ? "roster"
       : /\/teams\/\d+(\?|$)/.test(url) ? "team" : null;
}
var FILE = { post: "espn-schedule-nd-2025-post.json", schedule: "espn-schedule.json", scoreboard: "espn-scoreboard-sep26.json",
             rankings: "espn-rankings-sep20.json", news: "espn-news-nd-sep24.json", summary: "espn-summary-pre.json",
             stats: "espn-season-stats.json", roster: "espn-roster-nd-sep24.json", team: "espn-team.json" };

(async function () {
  var server = serve(root);
  await new Promise(function (r) { server.listen(0, "127.0.0.1", r); });
  var base = "http://127.0.0.1:" + server.address().port;
  var browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined });

  // opts.delay: how long each provider answer takes
  async function open(url, opts) {
    opts = opts || {};
    var ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, serviceWorkers: "block" });
    var page = await ctx.newPage(), counts = {}, ctl = { delays: opts.delays || {}, fail: {} };
    await page.route("**/*", async function (route) {
      var u = route.request().url();
      if (u.startsWith(base)) return route.continue();
      var k = kind(u);
      if (k) {
        counts[k] = (counts[k] || 0) + 1;
        var wait = k in ctl.delays ? ctl.delays[k] : opts.delay;
        if (wait) await new Promise(function (r) { setTimeout(r, wait); });
        if (ctl.fail[k]) return route.fulfill({ status: 503, body: "" });
        return route.fulfill({ status: 200, contentType: "application/json", body: fs.readFileSync(path.join(FX, FILE[k])) });
      }
      return route.abort();
    });
    await page.goto(base + url);
    if (!/choose/.test(url)) await page.waitForFunction(function () { return !document.getElementById("launch"); }, null, { timeout: 8000 });
    await page.waitForTimeout(400);
    return { ctx: ctx, page: page, counts: counts, ctl: ctl };
  }
  // One finger along `ys` (and `xs`), a touchmove per step, then let go.
  function drag(page, xs, ys, fingers) {
    return page.evaluate(function (a) {
      var target = document.elementFromPoint(a.xs[0], a.ys[0]) || document.getElementById("main");
      function touch(id, x, y) { return new Touch({ identifier: id, target: target, clientX: x, clientY: y, pageX: x, pageY: y + scrollY }); }
      function send(type, x, y, n) {
        var t = [touch(1, x, y)].concat(n === 2 ? [touch(2, x + 30, y)] : []);
        var live = type === "touchend" ? [] : t;
        target.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches: live, targetTouches: live, changedTouches: t.slice(0, 1) }));
      }
      return new Promise(function (res) {
        send("touchstart", a.xs[0], a.ys[0], a.fingers);
        var i = 1;
        (function step() {
          if (i < a.ys.length) { send("touchmove", a.xs[Math.min(i, a.xs.length - 1)], a.ys[i], a.fingers); i++; setTimeout(step, 16); return; }
          send("touchend", a.xs[a.xs.length - 1], a.ys[a.ys.length - 1], a.fingers);
          setTimeout(res, 30);
        })();
      });
    }, { xs: xs, ys: ys, fingers: fingers || 1 });
  }
  function down(from, to) { var ys = []; for (var y = from; y <= to; y += 15) ys.push(y); return ys; }
  function snap(counts) { return JSON.parse(JSON.stringify(counts)); }
  function more(after, before, k) { return (after[k] || 0) - (before[k] || 0); }
  function indicator(page) {
    return page.evaluate(function () { var p = document.getElementById("pullRefresh"); return p ? p.className : null; });
  }

  console.log("Home: pulled down from the top and let go");
  var h = await open("/?team=notre-dame#home", { delay: 400 });
  var p = h.page, before = snap(h.counts);
  await drag(p, [195], down(320, 470));
  await p.waitForTimeout(80);
  ok(/is-refreshing/.test(await indicator(p) || ""), "the indicator turns while the refresh runs");
  await p.waitForTimeout(1300);
  var after = snap(h.counts);
  ok(more(after, before, "schedule") === 1 && more(after, before, "news") === 1 && more(after, before, "team") === 1,
     "the team's schedule, status and news are asked for again, once each");
  ok(!/is-refreshing|is-pulling/.test(await indicator(p) || ""), "and the indicator goes when it has settled");
  ok(await p.evaluate(function () { return document.getElementById("pullRefresh").getAttribute("aria-hidden") === "true"; }),
     "the indicator is hidden from assistive technology");
  ok(/^Data refreshed\.$/.test(await p.evaluate(function () { return document.getElementById("live").textContent; })),
     "the outcome is announced, as Refresh Data announces it");
  await p.evaluate(function () { location.hash = "#settings"; }); await p.waitForTimeout(300);
  ok(/Refreshed at /.test(await p.evaluate(function () { return document.getElementById("screenSettings").textContent; })),
     "Settings reports how it came out: it was the same refresh");
  await p.evaluate(function () { location.hash = "#home"; }); await p.waitForTimeout(300);

  console.log("what is not a refresh");
  before = snap(h.counts);
  await drag(p, [195], down(320, 350)); await p.waitForTimeout(600);
  ok(more(snap(h.counts), before, "schedule") === 0, "a short pull (30px)");
  await drag(p, [195], down(320, 470).concat([440, 400, 360, 330])); await p.waitForTimeout(600);
  ok(more(snap(h.counts), before, "schedule") === 0, "a pull taken back up before letting go");
  await drag(p, [60, 120, 180, 240, 300, 340], [320, 330, 340, 350, 360, 370]); await p.waitForTimeout(600);
  ok(more(snap(h.counts), before, "schedule") === 0, "a mostly sideways drag");
  await drag(p, [195], down(320, 470), 2); await p.waitForTimeout(600);
  ok(more(snap(h.counts), before, "schedule") === 0, "two fingers");
  await p.evaluate(function () { scrollTo(0, 300); }); await p.waitForTimeout(100);
  ok(await p.evaluate(function () { return scrollY; }) > 0, "(the page is scrolled down)");
  await drag(p, [195], down(320, 470)); await p.waitForTimeout(600);
  ok(more(snap(h.counts), before, "schedule") === 0, "a pull with the page scrolled down: that is the page scrolling");
  await p.evaluate(function () { scrollTo(0, 0); });

  console.log("one at a time");
  before = snap(h.counts);
  await drag(p, [195], down(320, 470));
  await drag(p, [195], down(320, 470));
  await p.evaluate(function () { location.hash = "#settings"; }); await p.waitForTimeout(150);
  ok(/Refreshing/.test(await p.evaluate(function () { return document.getElementById("screenSettings").textContent; })),
     "Settings shows the pull's refresh under way");
  // pressed now, while the pull's refresh is still out (a Playwright click
  // would wait for the button to stop being redrawn, i.e. for it to finish)
  ok(await p.evaluate(function () { var b = document.querySelector("#screenSettings [data-refresh]"); b.click(); return document.getElementById("pullRefresh").className; }).then(function (c) { return /is-refreshing/.test(c); }),
     "(Refresh Data pressed while the pull's refresh is under way)");
  await p.waitForTimeout(1500);
  ok(more(snap(h.counts), before, "schedule") === 1, "a second pull, and Refresh Data pressed meanwhile, join it: one request");
  await h.ctx.close();

  console.log("Game, before kickoff");
  var g = await open("/?team=notre-dame#game");
  await g.page.waitForTimeout(600);
  before = snap(g.counts);
  ok((before.summary || 0) >= 1, "(the game's summary was loaded on entry)");
  await drag(g.page, [195], down(320, 470)); await g.page.waitForTimeout(900);
  ok(more(snap(g.counts), before, "summary") >= 1, "a pull asks for the open game's summary again (it was kept five minutes)");
  ok(await g.page.evaluate(function () { return getComputedStyle(document.documentElement).overscrollBehaviorY; }) === "contain",
     "the browser's own pull-to-reload is off, so the app is not reloaded under the pull");
  await g.ctx.close();

  // Codex review of #71: the refresh waits for the open game's summary and
  // reports it; a pull that starts on a button is the button's.
  console.log("Game: the refresh waits for the open game's summary");
  var gs = await open("/?team=notre-dame#game");
  await gs.page.waitForTimeout(600);
  gs.ctl.delays.summary = 1500;
  before = snap(gs.counts);
  await drag(gs.page, [195], down(320, 470));
  await gs.page.waitForTimeout(900);
  ok(more(snap(gs.counts), before, "schedule") === 1 && /is-refreshing/.test(await indicator(gs.page) || ""),
     "the rest has answered, the summary has not: still refreshing");
  await gs.page.waitForTimeout(1500);
  ok(!/is-refreshing/.test(await indicator(gs.page) || "") && /^Data refreshed\.$/.test(await gs.page.evaluate(function () { return document.getElementById("live").textContent; })),
     "done, and said so, only once the summary is in");
  gs.ctl.delays.summary = 0; gs.ctl.fail.summary = true;
  await drag(gs.page, [195], down(320, 470)); await gs.page.waitForTimeout(1200);
  ok(/^Some data refreshed\./.test(await gs.page.evaluate(function () { return document.getElementById("live").textContent; })),
     "a summary that fails is reported, not left out");
  await gs.ctx.close();

  console.log("a pull that starts on a button");
  var bt = await open("/?team=notre-dame#more");
  before = snap(bt.counts);
  var box = await bt.page.evaluate(function () { var r = document.querySelector("[data-share]").getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await drag(bt.page, [Math.round(box.x)], down(Math.round(box.y), Math.round(box.y) + 150));
  await bt.page.waitForTimeout(600);
  ok(more(snap(bt.counts), before, "schedule") === 0, "is the button's, not a refresh");
  await bt.ctx.close();

  console.log("the chooser");
  var c = await open("/?choose=1");
  ok(await c.page.evaluate(function () { return getComputedStyle(document.documentElement).overscrollBehaviorY; }) === "auto",
     "keeps the browser's own pull-to-reload: there is no data to refresh");
  await c.ctx.close();

  await browser.close(); server.close();
  console.log("\n" + (failures ? failures + " check(s) FAILED" : "a pull down refreshes, exactly as Refresh Data does"));
  process.exit(failures ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
