#!/usr/bin/env node
/* Roster's load, retry and freshness behaviour, in a real browser.

   The screen must never pass off old data as fresh, and a failed load must
   not lock itself out (Roster review, 2026-09-24):
     1. a failed first load says so; re-entering Roster asks again and
        shows the roster once the network answers; a success is not asked
        for again straight away;
     2. coming back online retries what failed, without a reload;
     3. a request already out is never duplicated;
     4. with the network failing, the last good copy is shown AND the one
        page-level warning says the data may be outdated (0024 §13); with
        the network answering, no warning;
     5. what the view does not display does not warn on it.

   Provider requests are answered from the committed real fixtures; the
   roster request's answer is switched per step. No network is used.

   Usage:  node tools/rosterflowcheck.js
   Locally: NODE_PATH=$(npm root -g) PW_CHROMIUM=/path/to/chromium node tools/rosterflowcheck.js */
"use strict";

var fs = require("fs"), http = require("http"), path = require("path");
var chromium = require("playwright").chromium;

var root = path.join(__dirname, "..");
function fixture(f) { return fs.readFileSync(path.join(root, "tools", "fixtures", f)); }
var server = http.createServer(function (req, res) {
  var p = new URL(req.url, "http://localhost").pathname;
  var file = path.join(root, p === "/" ? "index.html" : p.slice(1));
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  var type = /\.js$/.test(file) ? "text/javascript" : /\.css$/.test(file) ? "text/css" : /\.json$/.test(file) ? "application/json" : "text/html";
  res.writeHead(200, { "content-type": type, "cache-control": "no-store" });
  fs.createReadStream(file).pipe(res);
});

var failures = 0;
function ok(cond, what) {
  if (cond) { console.log("  ok   " + what); return; }
  failures++; console.log("  FAIL " + what);
}

(async function () {
  await new Promise(function (r) { server.listen(0, "127.0.0.1", r); });
  var base = "http://127.0.0.1:" + server.address().port;
  var browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined });

  // One page with a switchable roster answer: "ok", "fail", or "slow".
  async function open(hash) {
    var ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
    var page = await ctx.newPage();
    var st = { mode: "ok", rosterRequests: 0 };
    await page.route("**/*", async function (route) {
      var u = route.request().url();
      if (u.startsWith(base)) return route.continue();
      if (/\/teams\/87\/roster(\?|$)/.test(u)) {
        st.rosterRequests++;
        if (st.mode === "fail") return route.fulfill({ status: 503, body: "" });
        if (st.mode === "slow") await new Promise(function (r) { setTimeout(r, 1500); });
        return route.fulfill({ status: 200, contentType: "application/json", body: fixture("espn-roster-nd-sep24.json") });
      }
      if (/\/teams\/87\/schedule(\?|$)/.test(u)) return route.fulfill({ status: 200, contentType: "application/json", body: fixture("espn-schedule-nd-sep24.json") });
      if (/\/scoreboard\?/.test(u)) return route.fulfill({ status: 200, contentType: "application/json", body: fixture("espn-scoreboard-sep26.json") });
      return route.abort();
    });
    return { ctx: ctx, page: page, st: st, go: async function (h) {
      await page.evaluate(function (x) { location.hash = x; }, h); await page.waitForTimeout(500);
    } };
  }
  function screen(page) {
    return page.evaluate(function () {
      var h = document.getElementById("screenRoster"), b = h.querySelector(".fresh-banner");
      return { rows: h.querySelectorAll(".ro-row").length, text: h.textContent, banner: b ? b.textContent : "" };
    });
  }

  console.log("1. a failed first load retries on re-entry");
  var a = await open();
  a.st.mode = "fail";
  await a.page.goto(base + "/?team=notre-dame#roster/roster");
  await a.page.waitForTimeout(1200);
  var s1 = await screen(a.page);
  ok(a.st.rosterRequests === 1 && /didn’t load/.test(s1.text) && !s1.rows, "the failure is said, once, with nothing invented");
  a.st.mode = "ok";
  await a.go("#home"); await a.go("#roster/roster");
  await a.page.waitForTimeout(800);
  var s2 = await screen(a.page);
  ok(a.st.rosterRequests === 2, "re-entering Roster asks again (" + a.st.rosterRequests + " requests)");
  ok(s2.rows > 50 && !s2.banner, "and shows the roster, fresh, with no warning (" + s2.rows + " rows)");
  await a.go("#home"); await a.go("#roster/roster");
  ok(a.st.rosterRequests === 2, "a success is not asked for again straight away");
  await a.ctx.close();

  console.log("2. coming back online retries what failed");
  var b = await open();
  b.st.mode = "fail";
  await b.page.goto(base + "/?team=notre-dame#roster/roster");
  await b.page.waitForTimeout(1200);
  b.st.mode = "ok";
  var before = b.st.rosterRequests;
  await b.ctx.setOffline(true); await b.page.waitForTimeout(200);
  await b.ctx.setOffline(false); await b.page.waitForTimeout(1200);
  var sb = await screen(b.page);
  ok(b.st.rosterRequests === before + 1, "the online event asked once more");
  ok(sb.rows > 50, "and the roster appeared without a reload");
  await b.ctx.close();

  console.log("3. a request already out is not duplicated");
  var c = await open();
  c.st.mode = "slow";
  await c.page.goto(base + "/?team=notre-dame#roster/roster");
  await c.page.waitForTimeout(300);
  await c.go("#home"); await c.go("#roster/roster"); await c.go("#home"); await c.go("#roster/roster");
  await c.page.waitForTimeout(1800);
  ok(c.st.rosterRequests === 1, "one request while it was out (" + c.st.rosterRequests + ")");
  await c.ctx.close();

  console.log("4. the last good copy is shown, and called old");
  var d = await open();
  await d.page.goto(base + "/?team=notre-dame#home");
  await d.page.waitForTimeout(800);
  // the copy the worker would have kept, fetched three days ago
  await d.page.evaluate(function (body) {
    var threeDays = new Date(Date.now() - 3 * 864e5).toUTCString();
    return caches.open("iw-data-test").then(function (cache) {
      return cache.put(TeamOS.espn.rosterUrl(TEAM_CONFIG), new Response(body, { headers: { "content-type": "application/json", date: threeDays } }));
    });
  }, fixture("espn-roster-nd-sep24.json").toString());
  d.st.mode = "fail";
  await d.page.goto(base + "/?team=notre-dame#roster/roster");
  await d.page.waitForTimeout(1500);
  var sd = await screen(d.page);
  ok(sd.rows > 50, "the last good copy is on screen (" + sd.rows + " rows)");
  ok(/outdated/i.test(sd.banner) && /3 days|Sep|ago/.test(sd.banner), "and the page says it may be outdated: '" + sd.banner.trim() + "'");
  // the Depth Chart displays the roster only as extra detail, but the copy
  // it shows is still the old one - it warns too
  await d.go("#roster/depth");
  var dd = await screen(d.page);
  ok(/outdated/i.test(dd.banner), "the Depth Chart, which shows that roster's photos and heights, warns as well");
  d.st.mode = "ok";
  await d.ctx.setOffline(true); await d.page.waitForTimeout(200);
  await d.ctx.setOffline(false); await d.page.waitForTimeout(1200);
  await d.go("#roster/roster");
  var sr = await screen(d.page);
  ok(!sr.banner, "once the network answers, the warning is gone");
  await d.ctx.close();

  console.log("5. what a view does not display does not warn on it");
  var e = await open();
  e.st.mode = "fail";                        // no roster at all, no copy
  await e.page.goto(base + "/?team=notre-dame#roster/depth");
  await e.page.waitForTimeout(1500);
  var se = await screen(e.page);
  ok(se.rows > 20 && !se.banner, "a missing roster leaves the Depth Chart un-warned: its detail is simply omitted");
  await e.ctx.close();

  await browser.close(); server.close();
  console.log("\n" + (failures ? failures + " check(s) FAILED" : "Roster says when its data is old, and never locks itself out"));
  process.exit(failures ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
