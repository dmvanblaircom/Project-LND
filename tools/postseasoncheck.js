#!/usr/bin/env node
/* Bowl and CFP games reach the schedule, in a real browser (backlog C17).

   ESPN sends the postseason only when it is asked for (seasontype=3), so a
   season is two requests. This checks the page's side of that: both are
   asked for and joined into one season; a postseason that fails never costs
   the regular season, and never takes away postseason games already shown;
   and a fan whose offline copy predates the change (cached under the old,
   typeless URL) still gets a schedule on the first open.

   Provider answers are the committed real 2024 captures (Notre Dame's twelve
   regular-season games and four CFP games); no network is used.

   Usage:  node tools/postseasoncheck.js
   Locally: NODE_PATH=$(npm root -g) PW_CHROMIUM=/path/to/chromium node tools/postseasoncheck.js */
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

var LEGACY = "https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams/87/schedule";

(async function () {
  await new Promise(function (r) { server.listen(0, "127.0.0.1", r); });
  var base = "http://127.0.0.1:" + server.address().port;
  var browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined });

  var ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
  var page = await ctx.newPage(), errors = [];
  page.on("pageerror", function (e) { errors.push(String(e)); });
  var st = { regular: "up", post: "up", asked: [] };
  await page.route("**/*", async function (route) {
    var u = route.request().url();
    if (u.startsWith(base)) return route.continue();
    if (/\/teams\/87\/schedule/.test(u)) st.asked.push(u.replace(LEGACY, "") || "(no type)");
    if (/\/teams\/87\/schedule\?seasontype=3/.test(u))
      return st.post === "up" ? route.fulfill({ status: 200, contentType: "application/json", body: fixture("espn-schedule-nd-2024-post.json") })
                              : route.abort();
    if (/\/teams\/87\/schedule(\?|$)/.test(u))
      return st.regular === "up" ? route.fulfill({ status: 200, contentType: "application/json", body: fixture("espn-schedule-nd-2024-default.json") })
                                 : route.abort();
    return route.abort();                 // everything else stays down throughout
  });
  async function results() {
    await page.evaluate(function () { location.hash = "#schedule/results"; });
    await page.waitForTimeout(600);
    return page.evaluate(function () {
      return [].map.call(document.querySelectorAll("#screenSchedule .sched-row"), function (a) { return a.innerText.replace(/\s+/g, " "); });
    });
  }

  console.log("1. both season types, joined");
  await page.goto(base + "/?team=notre-dame#home"); await page.waitForTimeout(1500);
  ok(st.asked.indexOf("?seasontype=2") > -1 && st.asked.indexOf("?seasontype=3") > -1,
     "the page asks for the regular season and the postseason, each by type (" + st.asked.join(", ") + ")");
  ok(st.asked.indexOf("(no type)") < 0, "and never for the typeless schedule, which ESPN answers with one season type only");
  var rows = await results();
  ok(rows.length === 16, "Results lists all 16 games of 2024 (" + rows.length + ")");
  ok(rows.some(function (r) { return /Ohio State/.test(r); }) && rows.some(function (r) { return /Penn State/.test(r); }),
     "including the CFP games");

  console.log("2. a postseason that fails later leaves what is shown");
  st.post = "down";
  var before = st.asked.length;
  await page.evaluate(function () { location.hash = "#settings"; }); await page.waitForTimeout(600);
  await page.click("#screenSettings [data-refresh]"); await page.waitForTimeout(1500);
  ok(st.asked.slice(before).indexOf("?seasontype=3") > -1, "Refresh Data asked for the postseason again");
  rows = await results();
  ok(rows.length === 16, "a failed postseason poll keeps the CFP games on screen (" + rows.length + ")");

  console.log("3. a postseason that fails from the start costs only the postseason");
  await page.reload(); await page.waitForTimeout(1500);
  rows = await results();
  ok(rows.length === 12, "the regular season shows in full (" + rows.length + ")");
  ok(!/didn’t load/.test(await page.evaluate(function () { return document.body.innerText; })), "with no failure message");

  console.log("4. an offline copy from before the change still paints");
  st.regular = "down"; st.post = "down";
  await page.evaluate(function (u) {
    return caches.open("iw-2000-01-01a-data").then(function (c) {
      return fetch("/tools/fixtures/espn-schedule-nd-2024-default.json").then(function (r) { return c.put(u, r); });
    });
  }, LEGACY);
  await page.reload(); await page.waitForTimeout(1500);
  rows = await results();
  ok(rows.length === 12, "offline, the old URL's cached copy fills the schedule (" + rows.length + ")");
  await page.evaluate(function () { return caches.delete("iw-2000-01-01a-data"); });

  ok(errors.length === 0, "no page errors" + (errors.length ? ": " + errors.join(" | ") : ""));
  await browser.close(); server.close();
  console.log("\n" + (failures ? failures + " check(s) FAILED" : "The postseason reaches the schedule, and never costs the regular season"));
  process.exit(failures ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
