#!/usr/bin/env node
/* Swiping between a screen's peer views (suite/nav.js; David, 2026-10-01:
   sub-views only, never the primary tabs).

   Real touch events in Chromium (a touch-enabled phone viewport) on the real
   page with real fixtures:
     - a swipe left / right moves to the next / previous view, as a tap would,
       and Back walks it; the first and last views stop there
     - a vertical scroll, a short drag, a slow drag, two fingers, and a swipe
       from the screen edge do nothing
     - a swipe that starts on something that scrolls sideways itself, or on
       a form control, does nothing
     - a screen with no peer views (Home) does not swipe
     - the new view slides in from the swiped side; never under reduced motion

   Usage: node tools/swipecheck.js     (exit 1 on failure) */
"use strict";
var fs = require("fs"), path = require("path");
var chromium = require("playwright").chromium;
var root = path.join(__dirname, "..");
var serve = require("./lib/serve");
var FX = path.join(root, "tools", "fixtures");

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
        : /\/teams\/\d+\/roster/.test(url) ? "espn-roster-nd-sep24.json"
        : /\/teams\/\d+(\?|$)/.test(url) ? "espn-team.json" : null;
  return f ? fs.readFileSync(path.join(FX, f)) : null;
}

(async function () {
  var server = serve(root);
  await new Promise(function (r) { server.listen(0, "127.0.0.1", r); });
  var base = "http://127.0.0.1:" + server.address().port;
  var browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined });

  async function open(hash, opts) {
    opts = opts || {};
    var ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true,
                                         serviceWorkers: "block", reducedMotion: opts.reducedMotion || "no-preference" });
    var page = await ctx.newPage();
    await page.route("**/*", function (route) {
      var u = route.request().url();
      if (u.startsWith(base)) return route.continue();
      var body = fixture(u);
      if (body) return route.fulfill({ status: 200, contentType: "application/json", body: body });
      return route.abort();
    });
    await page.goto(base + "/?team=notre-dame" + hash);
    await page.waitForFunction(function () { return !document.getElementById("launch"); }, null, { timeout: 5000 });
    return { ctx: ctx, page: page };
  }
  // One finger from (x0,y0) to (x1,y1) over ms, on the element at the start
  // point; `fingers` adds a second touch.
  function drag(page, x0, y0, x1, y1, ms, fingers) {
    return page.evaluate(function (a) {
      var target = document.elementFromPoint(a.x0, a.y0) || document.getElementById("main");
      function touch(id, x, y) { return new Touch({ identifier: id, target: target, clientX: x, clientY: y, pageX: x, pageY: y + scrollY }); }
      var startTouches = [touch(1, a.x0, a.y0)].concat(a.fingers === 2 ? [touch(2, a.x0 + 30, a.y0)] : []);
      target.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, cancelable: true, touches: startTouches, targetTouches: startTouches, changedTouches: startTouches }));
      return new Promise(function (res) {
        setTimeout(function () {
          var end = touch(1, a.x1, a.y1);
          target.dispatchEvent(new TouchEvent("touchend", { bubbles: true, cancelable: true, touches: [], targetTouches: [], changedTouches: [end] }));
          setTimeout(res, 50);
        }, a.ms);
      });
    }, { x0: x0, y0: y0, x1: x1, y1: y1, ms: ms || 150, fingers: fingers || 1 });
  }
  function hash(page) { return page.evaluate(function () { return location.hash; }); }
  async function settle(page) { await page.waitForTimeout(250); }

  console.log("Roster: Depth Chart, Roster, Availability");
  var r = await open("#roster/depth");
  var p = r.page;
  await drag(p, 300, 500, 150, 510); await settle(p);
  ok(await hash(p) === "#roster/roster", "swipe left: the next view (Roster)");
  await drag(p, 300, 500, 150, 505); await settle(p);
  ok(await hash(p) === "#roster/availability", "swipe left again: Availability");
  await drag(p, 300, 500, 150, 500); await settle(p);
  ok(await hash(p) === "#roster/availability", "swipe left on the last view: stays");
  await drag(p, 120, 500, 290, 500); await settle(p);
  ok(await hash(p) === "#roster/roster", "swipe right: the previous view");
  await p.goBack(); await settle(p);
  ok(await hash(p) === "#roster/availability", "Back walks it like a tap");

  console.log("what is not a swipe");
  // from the middle view, where a swipe either way would move
  await p.evaluate(function () { location.hash = "#roster/roster"; }); await settle(p);
  var before = await hash(p);
  ok(before === "#roster/roster", "(starting from the middle view)");
  await drag(p, 200, 650, 260, 450); await settle(p);
  ok(await hash(p) === before, "a vertical scroll with some sideways drift");
  await drag(p, 250, 500, 210, 500); await settle(p);
  ok(await hash(p) === before, "a short drag (40px)");
  await drag(p, 300, 500, 150, 500, 1200); await settle(p);
  ok(await hash(p) === before, "a slow drag (1.2s)");
  await drag(p, 300, 500, 150, 500, 150, 2); await settle(p);
  ok(await hash(p) === before, "two fingers");
  await drag(p, 380, 500, 200, 500); await settle(p);
  ok(await hash(p) === before, "from the screen's edge, where the system's gestures live");
  // something that scrolls sideways on its own, inside the screen
  await p.evaluate(function () {
    var sc = document.querySelector("#main > div:not([hidden])");
    var d = document.createElement("div"); d.id = "wide";
    d.style.cssText = "overflow-x:auto;width:300px;height:80px;position:fixed;top:560px;left:40px;z-index:1000;background:#fff";
    d.innerHTML = '<div style="width:900px;height:60px">wide</div>'; document.getElementById("main").appendChild(d);
  });
  await drag(p, 300, 590, 120, 590); await settle(p);
  ok(await hash(p) === before, "starting on something that scrolls sideways itself (a carousel, a wide table)");
  await p.evaluate(function () {
    document.getElementById("wide").remove();
    var i = document.createElement("input"); i.id = "field";
    i.style.cssText = "position:fixed;top:560px;left:40px;width:300px;height:40px;z-index:1000"; document.getElementById("main").appendChild(i);
  });
  await drag(p, 300, 580, 120, 580); await settle(p);
  ok(await hash(p) === before, "starting on a form control");
  await r.ctx.close();

  console.log("the slide");
  var s = await open("#top25");
  var seen = s.page.evaluate(function () {
    return new Promise(function (res) {
      var el = document.querySelector("#main > div:not([hidden])"), got = null;
      new MutationObserver(function () { if (/view-in-next/.test(el.className)) got = "view-in-next"; })
        .observe(el, { attributes: true, attributeFilter: ["class"] });
      setTimeout(function () { res({ got: got, after: el.className }); }, 700);
    });
  });
  await drag(s.page, 300, 500, 140, 500);
  var sl = await seen;
  ok(await hash(s.page) === "#top25/rankings", "Top 25: swipe left from Games opens Rankings");
  ok(sl.got === "view-in-next" && !/view-in/.test(sl.after), "the new view slides in from the right, and the class is cleaned up");
  await s.ctx.close();

  var rm = await open("#top25", { reducedMotion: "reduce" });
  await drag(rm.page, 300, 500, 140, 500); await settle(rm.page);
  var anim = await rm.page.evaluate(function () {
    var el = document.querySelector("#main > div:not([hidden])");
    return getComputedStyle(el).animationName;
  });
  ok(await hash(rm.page) === "#top25/rankings" && (anim === "none" || anim === ""), "reduced motion: the view changes with no slide");
  ok(await rm.page.evaluate(function () { return document.documentElement.scrollWidth <= document.documentElement.clientWidth; }),
     "the page never widens sideways");
  await rm.ctx.close();

  console.log("Home has no peer views");
  var h = await open("#home");
  await drag(h.page, 300, 600, 120, 600); await settle(h.page);
  ok(/^#home$|^$/.test(await hash(h.page)), "a swipe on Home does nothing - never the primary tabs");
  await h.ctx.close();

  await browser.close(); server.close();
  console.log("\n" + (failures ? failures + " check(s) FAILED" : "swiping moves between a screen's views, and only on purpose"));
  process.exit(failures ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
