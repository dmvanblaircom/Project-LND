#!/usr/bin/env node
/* The launch screen (index.html, app.js liftLaunchWhenReady; David,
   2026-10-01): it covers the first open while the screen and its logos load,
   then gets out of the way.

   - shown on the very first paint, before any script has run
   - lifted once Home's hero has the season and its logos have loaded -
     the fan sees the finished hero, not it filling in
   - never more than 2 seconds, however slow the network
   - lifted by the stylesheet alone at 2.5 seconds if app.js never runs
   - never on the chooser
   - hidden from assistive technology throughout

   Usage: node tools/launchcheck.js     (exit 1 on failure) */
"use strict";
var fs = require("fs"), path = require("path");
var chromium = require("playwright").chromium;
var root = path.join(__dirname, "..");
var serve = require("./lib/serve");
var FX = path.join(root, "tools", "fixtures");
var LOGO = fs.readFileSync(path.join(root, "assets", "suite", "favicon-64.png"));

var failures = 0;
function ok(cond, what) { if (cond) { console.log("  ok   " + what); return; } failures++; console.log("  FAIL " + what); }

function fixture(url) {
  var f = /\/schedule\?seasontype=3/.test(url) ? "espn-schedule-nd-2025-post.json"
        : /\/schedule(\?|$)/.test(url) ? "espn-schedule.json"
        : /\/scoreboard\?/.test(url) ? "espn-scoreboard-sep26.json"
        : /\/rankings/.test(url) ? "espn-rankings-sep20.json"
        : /\/news\?/.test(url) ? "espn-news-nd-sep24.json"
        : /\/summary\?/.test(url) ? "espn-summary-pre.json"
        : /\/statistics/.test(url) ? "espn-season-stats.json"
        : /\/teams\/\d+\/roster/.test(url) ? "espn-roster.json"
        : /\/teams\/\d+(\?|$)/.test(url) ? "espn-team.json" : null;
  return f ? fs.readFileSync(path.join(FX, f)) : null;
}

(async function () {
  var server = serve(root);
  await new Promise(function (r) { server.listen(0, "127.0.0.1", r); });
  var base = "http://127.0.0.1:" + server.address().port;
  var browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined });

  // opts: delay (ms) for the providers' answers, logoDelay for logos, noApp to
  // make app.js fail to load
  async function open(url, opts) {
    opts = opts || {};
    var ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
    var page = await ctx.newPage();
    await page.route("**/*", async function (route) {
      var u = route.request().url();
      if (u.startsWith(base)) {
        if (opts.noApp && /\/app\.js$/.test(u)) return route.abort();
        return route.continue();
      }
      var body = fixture(u);
      if (body) { await new Promise(function (r) { setTimeout(r, opts.delay || 0); }); return route.fulfill({ status: 200, contentType: "application/json", body: body }); }
      if (/teamlogos/.test(u)) { await new Promise(function (r) { setTimeout(r, opts.logoDelay || 0); }); return route.fulfill({ status: 200, contentType: "image/png", body: LOGO }); }
      return route.abort();
    });
    await page.addInitScript(function () {
      window.__first = null;
      document.addEventListener("DOMContentLoaded", function () {
        var l = document.getElementById("launch");
        window.__first = l ? getComputedStyle(l).visibility + "/" + getComputedStyle(l).opacity : "none";
      });
    });
    var t0 = Date.now();
    await page.goto(base + url, { waitUntil: "commit" });
    return { ctx: ctx, page: page, t0: t0 };
  }
  // when the launch screen stopped covering the page, ms from navigation
  async function liftedAt(o, limit) {
    await o.page.waitForFunction(function () { return window.__first !== null; });   // the page exists
    var deadline = Date.now() + limit;
    while (Date.now() < deadline) {
      var gone = await o.page.evaluate(function () {
        var l = document.getElementById("launch");
        return !l || getComputedStyle(l).visibility === "hidden" || l.classList.contains("done");
      });
      if (gone) return Date.now() - o.t0;
      await new Promise(function (r) { setTimeout(r, 25); });
    }
    return null;
  }
  function heroReady(page) {
    return page.evaluate(function () {
      var hero = document.querySelector("[data-home=hero] .home-hero");
      var imgs = hero ? Array.prototype.slice.call(hero.querySelectorAll("img[data-mark]")) : [];
      return { card: !!(hero && hero.querySelector(".gamecard")), logos: imgs.length, loaded: imgs.every(function (i) { return i.complete; }) };
    });
  }

  console.log("a normal first open");
  var a = await open("/?team=notre-dame#home", { delay: 300, logoDelay: 300 });
  await a.page.waitForFunction(function () { return window.__first !== null; });
  ok(/^visible\//.test(await a.page.evaluate(function () { return window.__first; })), "the launch screen is up on the first paint, before any script runs");
  ok(await a.page.evaluate(function () { var l = document.getElementById("launch"); return l && l.getAttribute("aria-hidden") === "true"; }),
     "and is hidden from assistive technology");
  var t = await liftedAt(a, 4000), hero = await heroReady(a.page);
  ok(t != null && t < 2300, "it lifts once Home is ready (" + t + " ms)");
  ok(hero.card && hero.logos > 0 && hero.loaded, "by then the hero has its game and every logo has loaded (" + hero.logos + " logos)");
  await a.page.waitForTimeout(600);
  ok(await a.page.evaluate(function () { return !document.getElementById("launch"); }), "and then it is gone from the page");
  await a.ctx.close();

  console.log("a slow network");
  var b = await open("/?team=notre-dame#home", { delay: 5000, logoDelay: 5000 });
  var tb = await liftedAt(b, 4000);
  ok(tb != null && tb >= 1900 && tb < 2600, "it never waits more than 2 seconds for data still on its way (" + tb + " ms)");
  await b.ctx.close();

  console.log("app.js never runs");
  var c = await open("/?team=notre-dame#home", { noApp: true });
  var tc = await liftedAt(c, 4500);
  ok(tc != null && tc < 3200, "the stylesheet lifts it on its own (" + tc + " ms): it can never trap a fan");
  await c.ctx.close();

  console.log("the chooser");
  var d = await open("/?choose=1");
  ok(await d.page.evaluate(function () { var l = document.getElementById("launch"); return !l || getComputedStyle(l).display === "none"; }),
     "no launch screen over the team chooser");
  await d.ctx.close();

  await browser.close(); server.close();
  console.log("\n" + (failures ? failures + " check(s) FAILED" : "the launch screen covers loading and never outstays it"));
  process.exit(failures ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
