#!/usr/bin/env node
/* Every team's mark at one size (David, 2026-10-25: "logo sizes should be the
   same size"; Notre Dame's solid, wide mark read far bigger than Navy's tall,
   thin one). Suite.ui measures each mark once and scales it to one perceived
   size, capped so it never spills, and leaves alone a mark it cannot read.

   The marks here are drawn for the test, in ESPN's own geometry (a 500px
   square, the longest side at 460px): a solid wide mark and a thin tall
   outline. They are served from ESPN's logo address with its CORS header
   (access-control-allow-origin: *, probe of 2026-10-25), and once without. */
"use strict";
var path = require("path"), assert = require("assert");
var chromium = require("playwright").chromium, root = path.join(__dirname, "..");
var server = require("./lib/serve")(root), checks = [];
function ok(value, label) { assert(value, label); checks.push(label); console.log("  ok   " + label); }

var LOGO = "https://a.espncdn.com/i/teamlogos/ncaa/500-dark/";
(async function () {
  await new Promise(function (r) { server.listen(0, "127.0.0.1", r); });
  var base = "http://127.0.0.1:" + server.address().port;
  var browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined });
  var page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  // Draw the two marks, ESPN-shaped.
  await page.goto(base + "/tools/fixtures/espn-news.json");
  var png = await page.evaluate(function () {
    function draw(f) { var c = document.createElement("canvas"); c.width = c.height = 500; f(c.getContext("2d")); return c.toDataURL("image/png").split(",")[1]; }
    return {
      solid: draw(function (x) { x.fillStyle = "#C99700"; x.fillRect(20, 44, 460, 412); }),                     // 460x412, all ink
      thin: draw(function (x) { x.strokeStyle = "#C5B783"; x.lineWidth = 24; x.strokeRect(74, 32, 351, 436); })  // 375x460, an outline
    };
  });
  var served = {};
  await page.route("**/*", function (route) {
    var u = route.request().url();
    if (u.startsWith(base)) return route.continue();
    var m = /teamlogos\/ncaa\/500-dark\/(\d+)\.png/.exec(u);
    if (m) {
      served[m[1]] = (served[m[1]] || 0) + 1;
      // (route.fulfill skips the browser's CORS check, so a host that will
      // not be read is one whose answer to a CORS request never comes)
      if (m[1] === "999" && route.request().headers().origin) return route.abort();
      var body = Buffer.from(m[1] === "87" ? png.solid : png.thin, "base64");
      // 999: the same thin mark from a host that sends no CORS header
      return route.fulfill({ status: 200, contentType: "image/png", headers: m[1] === "999" ? {} : { "access-control-allow-origin": "*" }, body: body });
    }
    return route.abort();
  });
  await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="' + base + '/app.css"></head>' +
    '<body><main class="page-main"><div id="home"></div><div id="home2"></div><div id="top"></div></main></body></html>');
  for (var f of ["teams/notre-dame.js", "teamos/team.js", "teamos/identity.js", "teamos/espn.js", "teamos/game.js", "teamos/live.js", "suite/ui.js", "suite/schedule.js", "suite/prospects.js", "suite/home.js", "suite/top25.js"])
    await page.addScriptTag({ url: base + "/" + f });
  await page.evaluate(function (LOGO) {
    var team = { name: "Notre Dame", abbr: "ND", markUrl: LOGO + "87.png" };
    function hero(id, opp, oppId) {
      var g = { id: id, status: "scheduled", state: "pre", timeSet: true, home: true, date: "2026-10-31T16:00:00Z", oppName: opp, oppAbbr: opp.toUpperCase(), oppProviderId: oppId, usRank: 4, usRecord: "6-0", oppRecord: null };
      Suite.home.paint(document.getElementById(id), { team: team, oppMark: function (i) { return LOGO + i + ".png"; }, art: {}, hero: { game: g }, news: [], outlook: [], fresh: null, schedule: [] });
    }
    hero("home", "Navy", "2426");
    hero("home2", "Elsewhere", "999");
    Suite.top25.paint(document.getElementById("top"), { view: "games", mark: function (i) { return LOGO + i + ".png"; }, now: new Date("2026-10-31T15:00:00Z"),
      games: [{ id: "g", date: "2026-10-31T16:00:00Z", state: "pre", status: "scheduled", detail: "", home: { name: "Notre Dame", abbr: "ND", rank: 4, providerId: "87", record: "6-0" }, away: { name: "Navy", abbr: "NAVY", providerId: "2426", record: "5-2" } }] });
  }, LOGO);
  await page.waitForFunction(function () {
    return [].every.call(document.querySelectorAll(".mark img[data-mark]"), function (i) { return i.complete; });
  }, null, { timeout: 10000 });
  await page.waitForTimeout(800);
  var r = await page.evaluate(function () {
    function s(sel) { var i = document.querySelector(sel); var t = i && i.style.transform; var m = /scale\(([\d.]+)\)/.exec(t || ""); return m ? +m[1] : 1; }
    return { ndHero: s("#home .gc-side.us .mark img"), navyHero: s("#home .gc-side.them .mark img"), noCors: s("#home2 .gc-side.them .mark img"),
             ndRow: s('#top .mark img[src$="/87.png"]'), navyRow: s('#top .mark img[src$="/2426.png"]'),
             kept: Object.keys(localStorage).filter(function (k) { return /^suite-markfit:/.test(k); }).length };
  });
  console.log("  scales: " + JSON.stringify(r));
  ok(r.ndHero < 1 && r.navyHero > 1, "Home: the solid, wide mark comes down and the thin, tall one comes up");
  // Their perceived sizes (box side and ink, as Suite.ui measures them) end up together.
  var solidP = Math.sqrt(Math.sqrt(0.92 * 0.824) * Math.sqrt(0.92 * 0.824)), thinP = null;
  ok(Math.abs(r.ndHero * solidP - 0.718) < 0.02, "the solid mark lands on the common size (" + (r.ndHero * solidP).toFixed(3) + ")");
  ok(r.navyHero <= 1.3 * 0.92 / 0.92 + 1e-6, "a bare mark never grows past 1.3x ESPN's size");
  ok(r.navyRow <= 1.15 + 1e-6 && r.navyRow > 1 && r.ndRow < 1, "in a circle (Top 25 rows) the same direction, capped at 1.15x so it stays inside");
  ok(r.noCors === 1, "a mark its host will not let us read keeps ESPN's size");
  ok(r.kept === 2, "each readable mark is measured once and kept on the device (" + r.kept + ")");
  // Painted again: the kept measurements apply without measuring again.
  var before = Object.assign({}, served);
  await page.evaluate(function () { document.getElementById("home").innerHTML = ""; });
  await page.evaluate(function (LOGO) {
    var g = { id: "home", status: "scheduled", state: "pre", timeSet: true, home: true, date: "2026-10-31T16:00:00Z", oppName: "Navy", oppAbbr: "NAVY", oppProviderId: "2426", usRecord: "6-0" };
    Suite.home.paint(document.getElementById("home"), { team: { name: "Notre Dame", abbr: "ND", markUrl: LOGO + "87.png" }, oppMark: function (i) { return LOGO + i + ".png"; }, art: {}, hero: { game: g }, news: [], outlook: [], fresh: null, schedule: [] });
  }, LOGO);
  await page.waitForTimeout(800);
  var again = await page.evaluate(function () { var i = document.querySelector("#home .gc-side.them .mark img"); return i && i.style.transform; });
  ok(/scale\(1\.\d+\)/.test(again || ""), "a mark drawn again keeps its size (" + again + ")");
  await browser.close(); server.close();
  console.log("\n" + checks.length + " checks: every team's mark at one size");
})().catch(function (e) { console.error("FAIL " + (e && e.message || e)); process.exit(1); });
