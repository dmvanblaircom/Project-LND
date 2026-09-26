#!/usr/bin/env node
/* A first visit while the schedule cannot be reached, in a real browser.

   Home, Game and a game opened from Schedule all wait on the schedule. With
   nothing cached and the first request failing, they must say the schedule
   didn't load - never "Loading" forever - and fill in once it can be
   reached: on reconnection, and on entering one of those screens again. A
   retry already out is not repeated.

   Provider answers come from the committed real fixtures; no network is used.

   Usage:  node tools/outagecheck.js
   Locally: NODE_PATH=$(npm root -g) PW_CHROMIUM=/path/to/chromium node tools/outagecheck.js */
"use strict";

var fs = require("fs"), http = require("http"), path = require("path");
var chromium = require("playwright").chromium;

var root = path.join(__dirname, "..");
function fixture(f) { return fs.readFileSync(path.join(root, "tools", "fixtures", f)); }
var server = http.createServer(function (req, res) {
  var p = new URL(req.url, "http://localhost").pathname;
  var file = path.join(root, p === "/" ? "index.html" : p.slice(1));
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  var type = /\.js$/.test(file) ? "text/javascript" : /\.css$/.test(file) ? "text/css" : /\.json$/.test(file) ? "application/json" :
             /\.svg$/.test(file) ? "image/svg+xml" : /\.png$/.test(file) ? "image/png" : "text/html";
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

  var ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
  var page = await ctx.newPage(), errors = [];
  page.on("pageerror", function (e) { errors.push(String(e)); });
  var st = { down: true, schedule: 0, slow: false };
  await page.route("**/*", async function (route) {
    var u = route.request().url();
    if (u.startsWith(base)) return route.continue();
    // The postseason is its own request, empty in September; counted apart
    // so "asks once" still means one regular-season request.
    if (/\/teams\/87\/schedule\?seasontype=3/.test(u)) {
      if (st.down) return route.abort();
      return route.fulfill({ status: 200, contentType: "application/json", body: fixture("espn-schedule-nd-2025-post.json") });
    }
    if (/\/teams\/87\/schedule(\?|$)/.test(u)) {
      st.schedule++;
      if (st.down) return route.abort();
      if (st.slow) await new Promise(function (r) { setTimeout(r, 1200); });
      return route.fulfill({ status: 200, contentType: "application/json", body: fixture("espn-schedule-nd-sep24.json") });
    }
    return route.abort();                 // everything else stays down throughout
  });
  function shown() {
    return page.evaluate(function () {
      var s = [].filter.call(document.querySelectorAll("[id^='screen']:not(#screenHead)"), function (x) { return !x.hidden; })[0];
      return s ? s.innerText.trim() : "";
    });
  }
  async function go(h, ms) { await page.evaluate(function (x) { location.hash = x; }, h); await page.waitForTimeout(ms || 600); }
  var FAILED = /^The schedule didn’t load\. Check your connection; it fills in when the connection returns\.$/;

  console.log("1. the first schedule load fails, nothing cached");
  await page.goto(base + "/?team=notre-dame#home"); await page.waitForTimeout(1500);
  ok(FAILED.test(await shown()), "Home says the schedule didn't load, not 'Loading' (" + (await shown()).slice(0, 50) + ")");
  await go("#game");
  ok(FAILED.test(await shown()), "so does Game");
  await go("#schedule/401858467");
  ok(/didn’t load/.test(await shown()), "and a game opened from Schedule");
  await go("#schedule");
  ok(/didn’t load/.test(await shown()), "and Schedule itself");

  console.log("2. the connection returns");
  await go("#home");
  st.schedule = 0; st.down = false; st.slow = true;
  await page.evaluate(function () { dispatchEvent(new Event("online")); dispatchEvent(new Event("online")); });
  await page.waitForTimeout(2000);
  ok(st.schedule === 1, "reconnecting asks for the schedule once, however often it is signalled (" + st.schedule + ")");
  var home = await shown();
  ok(!FAILED.test(home) && home.length > 200, "Home fills in (" + home.length + " characters)");
  await go("#game", 800);
  ok(!/didn’t load|^Loading/.test(await shown()), "Game fills in");

  console.log("3. re-entering a screen retries, without a connection event");
  st.down = true; await page.reload(); await page.waitForTimeout(1500);
  await page.evaluate(function () { location.hash = "#home"; });
  await page.waitForTimeout(800);
  ok(FAILED.test(await shown()), "down again on a fresh load: Home says so");
  st.down = false; st.slow = false; st.schedule = 0;
  await go("#top25"); await go("#home", 1500);
  ok(st.schedule === 1, "entering Home asks again (" + st.schedule + ")");
  ok(!FAILED.test(await shown()) && (await shown()).length > 200, "and Home fills in");
  st.schedule = 0;
  await go("#top25"); await go("#home", 800);
  ok(st.schedule === 0, "once loaded, entering Home asks nothing more (" + st.schedule + ")");

  ok(errors.length === 0, "no page errors" + (errors.length ? ": " + errors.join(" | ") : ""));
  await browser.close(); server.close();
  console.log("\n" + (failures ? failures + " check(s) FAILED" : "A first visit without a schedule says so, and recovers on its own"));
  process.exit(failures ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
