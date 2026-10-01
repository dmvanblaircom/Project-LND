#!/usr/bin/env node
/* The launch screen (index.html, app.js liftLaunchWhenReady; David,
   2026-10-01: "about 3 seconds and clean", as Sleeper's is).

   - up on the very first paint, before any script runs, with the wordmark
     drawn inline: nothing to load, so it never pops in, and it never moves
     while the letters animate
   - it plays its animation (about 2.6 seconds) and only then lifts - and
     only once the screen is complete: every first request answered and every
     image in view loaded. A late answer (news after 3.5s) holds it; when it
     lifts, the hero has its game and the news its stories
   - never more than 6 seconds, however slow the network
   - lifted by its own inline style at 7 seconds if app.js never runs
   - an update's reload carries the animation on from where it was
   - never on the chooser; hidden from assistive technology

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

  // opts: delay (ms) for the providers' answers, newsDelay for news alone,
  // noApp to make app.js fail to load, startedAgo to resume a launch begun
  // that long ago (an update's reload)
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
      if (body) {
        var wait = /\/news\?/.test(u) && opts.newsDelay != null ? opts.newsDelay : (opts.delay || 0);
        await new Promise(function (r) { setTimeout(r, wait); });
        return route.fulfill({ status: 200, contentType: "application/json", body: body });
      }
      if (/teamlogos|espncdn/.test(u)) { await new Promise(function (r) { setTimeout(r, opts.delay || 0); }); return route.fulfill({ status: 200, contentType: "image/png", body: LOGO }); }
      return route.abort();
    });
    await page.addInitScript(function (ago) {
      if (ago != null) { try { sessionStorage.setItem("suite-launch-at", String(Date.now() - ago)); } catch (e) {} }
      window.__first = null; window.__boxes = [];
      document.addEventListener("DOMContentLoaded", function () {
        var l = document.getElementById("launch"), m = l && l.querySelector(".launch-mark");
        window.__first = l ? getComputedStyle(l).visibility + "/" + getComputedStyle(l).opacity : "none";
        // where the wordmark sits, every 100ms while the screen is up
        (function watch() {
          var mm = document.querySelector("#launch .launch-mark");
          if (!mm || document.getElementById("launch").classList.contains("done")) return;
          var r = mm.getBoundingClientRect(); window.__boxes.push([Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)].join(","));
          setTimeout(watch, 100);
        })();
      });
    }, opts.startedAgo == null ? null : opts.startedAgo);
    var t0 = Date.now();
    await page.goto(base + url, { waitUntil: "commit" });
    return { ctx: ctx, page: page, t0: t0 };
  }
  async function liftedAt(o, limit) {
    await o.page.waitForFunction(function () { return window.__first !== null; });
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
  function complete(page) {
    return page.evaluate(function () {
      var hero = document.querySelector("[data-home=hero] .home-hero");
      var stories = document.querySelectorAll("[data-home=news] li").length;
      var imgs = Array.prototype.slice.call(document.querySelectorAll("#screenHome img")).filter(function (i) {
        var r = i.getBoundingClientRect(); return r.width > 0 && r.bottom > 0 && r.top < innerHeight;
      });
      return { card: !!(hero && hero.querySelector(".gamecard")), stories: stories,
               images: imgs.length, loaded: imgs.every(function (i) { return i.complete; }) };
    });
  }

  console.log("a normal first open");
  var a = await open("/?team=notre-dame#home", { delay: 300 });
  await a.page.waitForFunction(function () { return window.__first !== null; });
  ok(/^visible\//.test(await a.page.evaluate(function () { return window.__first; })), "up on the first paint, before any script runs");
  ok(await a.page.evaluate(function () { var l = document.getElementById("launch"); return l.getAttribute("aria-hidden") === "true" && !!l.querySelector("svg .launch-l"); }),
     "the wordmark is drawn inline, letter by letter, and hidden from assistive technology");
  var t = await liftedAt(a, 8000), done = await complete(a.page);
  ok(t != null && t >= 2600 && t < 4000, "it plays its animation, then lifts (" + t + " ms)");
  ok(done.card && done.stories >= 3 && done.loaded, "by then the hero has its game, the news its stories, and every image in view has loaded (" + done.images + ")");
  var boxes = await a.page.evaluate(function () { return window.__boxes; });
  ok(boxes.length > 5 && boxes.every(function (b) { return b === boxes[0]; }), "the wordmark never moves or resizes while it is up (" + boxes.length + " samples)");
  ok(await a.page.evaluate(function () { return !document.querySelector("#launch img"); }), "and has no image to fetch: it cannot pop in");
  await a.page.waitForTimeout(700);
  ok(await a.page.evaluate(function () { return !document.getElementById("launch"); }), "then it is gone from the page");
  await a.ctx.close();

  console.log("a late answer holds it");
  var b = await open("/?team=notre-dame#home", { delay: 100, newsDelay: 3500 });
  var tb = await liftedAt(b, 8000), cb = await complete(b.page);
  ok(tb != null && tb >= 3500 && cb.stories >= 3, "news after 3.5s: it waits, and lifts with the stories there (" + tb + " ms)");
  await b.ctx.close();

  console.log("a slow network");
  var c = await open("/?team=notre-dame#home", { delay: 9000 });
  var tc = await liftedAt(c, 9000);
  ok(tc != null && tc >= 5800 && tc < 7000, "never more than 6 seconds, whatever is still on its way (" + tc + " ms)");
  await c.ctx.close();

  console.log("app.js never runs");
  var d = await open("/?team=notre-dame#home", { noApp: true });
  var td = await liftedAt(d, 9000);
  ok(td != null && td >= 6800 && td < 8000, "its own style lifts it (" + td + " ms): it can never trap a fan");
  await d.ctx.close();

  console.log("an update's reload");
  var e = await open("/?team=notre-dame#home", { startedAgo: 1500 });
  await e.page.waitForFunction(function () { return window.__first !== null; });
  var lt = await e.page.evaluate(function () { return document.documentElement.style.getPropertyValue("--launch-t"); });
  ok(/^-1[45]\d\dms$/.test(lt.trim()), "carries the animation on from where it was (" + lt.trim() + "), not from the start");
  var te = await liftedAt(e, 8000);
  ok(te != null && te < 2400, "and lifts on the same clock (" + te + " ms after the reload)");
  await e.ctx.close();

  console.log("the chooser");
  var f = await open("/?choose=1");
  await f.page.waitForTimeout(300);
  ok(await f.page.evaluate(function () { var l = document.getElementById("launch"); return !l || getComputedStyle(l).display === "none"; }),
     "no launch screen over the team chooser");
  await f.ctx.close();

  await browser.close(); server.close();
  console.log("\n" + (failures ? failures + " check(s) FAILED" : "the launch screen plays, waits for a complete screen, and never outstays it"));
  process.exit(failures ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
