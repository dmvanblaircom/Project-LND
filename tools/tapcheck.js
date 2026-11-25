#!/usr/bin/env node
/* How a press feels on a phone (David, 2026-11-25: press Matchup, slide the
   finger onto Availability, lift - and Availability stayed looking pressed
   with nothing opened). On a touch screen :hover sticks to whatever the
   finger last touched, so a hover style belongs only to a pointer that
   hovers. The real app, on fixtures.

   - every :hover rule in app.css sits inside @media (hover:hover)
   - on a phone, a quick action touched last does not stay styled
   - a press shows while the finger is down (:active), and not after
   - on a desktop pointer the hover affordance is still there

   Usage: node tools/tapcheck.js     (exit 1 on failure) */
"use strict";
var fs = require("fs"), path = require("path");
var chromium = require("playwright").chromium;
var root = path.join(__dirname, ".."), serve = require("./lib/serve"), FX = path.join(root, "tools", "fixtures");
var failures = 0;
function ok(c, what) { if (c) console.log("  ok   " + what); else { failures++; console.log("  FAIL " + what); } }
function fixture(u) {
  var f = /\/schedule\?seasontype=3/.test(u) ? "espn-schedule-nd-2025-post.json" : /\/schedule(\?|$)/.test(u) ? "espn-schedule.json"
        : /\/scoreboard\?/.test(u) ? "espn-scoreboard-sep26.json" : /\/rankings/.test(u) ? "espn-rankings-sep20.json"
        : /\/news\?/.test(u) ? "espn-news-nd-sep24.json" : /\/summary\?/.test(u) ? "espn-summary-pre.json"
        : /\/statistics/.test(u) ? "espn-season-stats.json" : /\/teams\/\d+\/roster/.test(u) ? "espn-roster.json"
        : /\/teams\/\d+(\?|$)/.test(u) ? "espn-team.json" : null;
  return f ? fs.readFileSync(path.join(FX, f)) : null;
}

(async function () {
  var server = serve(root);
  await new Promise(function (r) { server.listen(0, "127.0.0.1", r); });
  var base = "http://127.0.0.1:" + server.address().port;
  var browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined });
  async function open(phone) {
    var ctx = await browser.newContext(phone ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, serviceWorkers: "block" }
                                             : { viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
    var page = await ctx.newPage();
    await page.clock.setSystemTime(new Date("2026-10-27T16:00:00Z"));
    await page.route("**/*", function (route) {
      var u = route.request().url();
      if (u.startsWith(base)) return route.continue();
      var b = fixture(u);
      return b ? route.fulfill({ status: 200, contentType: "application/json", body: b }) : route.abort();
    });
    await page.goto(base + "/?team=notre-dame#home");
    await page.waitForFunction(function () { return !document.getElementById("launch") && document.querySelector(".qa-availability"); }, null, { timeout: 20000 });
    return { ctx: ctx, page: page };
  }
  function look(page, sel) {
    return page.evaluate(function (s) { var c = getComputedStyle(document.querySelector(s)); return c.borderTopColor + " " + c.backgroundColor; }, sel);
  }

  console.log("the stylesheet");
  var p0 = await open(true);
  var loose = await p0.page.evaluate(function () {
    var out = [];
    function walk(rules, hoverMedia) {
      Array.prototype.forEach.call(rules, function (r) {
        if (r.type === CSSRule.MEDIA_RULE) return walk(r.cssRules, hoverMedia || /\(hover:\s*hover\)/.test(r.conditionText || r.media.mediaText));
        if (r.cssRules && r.type !== CSSRule.STYLE_RULE) return walk(r.cssRules, hoverMedia);
        if (r.selectorText && /:hover/.test(r.selectorText) && !hoverMedia) out.push(r.selectorText);
      });
    }
    Array.prototype.forEach.call(document.styleSheets, function (sh) { try { if (/app\.css/.test(sh.href || "")) walk(sh.cssRules, false); } catch (e) {} });
    return out;
  });
  ok(loose.length === 0, "every :hover rule is inside @media (hover:hover)" + (loose.length ? ": " + loose.join(", ") : ""));

  console.log("on a phone");
  var page = p0.page;
  ok(!(await page.evaluate(function () { return matchMedia("(hover: hover)").matches; })), "a phone does not report a pointer that hovers");
  var rest = await look(page, ".qa-availability");
  // the finger goes down on Matchup and slides onto Availability: the
  // pointer ends over Availability, and nothing is opened
  var box = await page.locator(".qa-matchup").boundingBox(), box2 = await page.locator(".qa-availability").boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.move(box2.x + box2.width / 2, box2.y + box2.height / 2, { steps: 6 });
  await page.waitForTimeout(250);
  ok((await look(page, ".qa-availability")) === rest, "the action the finger ended on does not stay styled (" + rest + ")");
  ok(/#home$/.test(page.url()), "and nothing opened");
  // a press shows while down, and is gone once lifted
  await page.mouse.down();
  await page.waitForTimeout(150);
  var down = await look(page, ".qa-availability");
  await page.evaluate(function () { addEventListener("click", function (e) { e.preventDefault(); }, { capture: true, once: true }); });
  await page.mouse.up();
  await page.waitForTimeout(250);
  ok(down !== rest, "a press shows while the finger is down (" + down + ")");
  ok((await look(page, ".qa-availability")) === rest, "and is gone once it lifts");
  await p0.ctx.close();

  console.log("with a mouse");
  var d = await open(false);
  var drest = await d.page.evaluate(function () { return getComputedStyle(document.querySelector(".qa-matchup")).borderTopColor; });
  await d.page.hover(".qa-matchup");
  await d.page.waitForTimeout(250);
  var dover = await d.page.evaluate(function () { return getComputedStyle(document.querySelector(".qa-matchup")).borderTopColor; });
  ok(dover !== drest, "hover still marks the action under a mouse (" + drest + " -> " + dover + ")");
  await d.ctx.close();

  await browser.close();
  server.close();
  console.log(failures ? "\n" + failures + " failed" : "\na press on a phone shows only while the finger is down");
  process.exit(failures ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
