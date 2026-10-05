#!/usr/bin/env node
/* A team's own type (C19; Ohio State's recommended public face, Nunito
   Sans, approved by David 2026-10-01).

   Real pages in Chromium with real fixtures, counting font requests:
     - Ohio State in Team Style: text and headings are set in Nunito Sans,
       from the repository's own files, and the SUITE bar's team name fits at
       320 (decision 0031)
     - Notre Dame, the chooser, and Ohio State in Suite Style never download
       it: a face is fetched only where a team's type uses it

   Usage: node tools/teamfontcheck.js     (exit 1 on failure) */
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
        : /\/teams\/\d+\/roster/.test(url) ? "espn-roster-nd-sep24.json"
        : /\/teams\/\d+(\?|$)/.test(url) ? "espn-team.json" : null;
  return f ? fs.readFileSync(path.join(FX, f)) : null;
}

(async function () {
  var server = serve(root);
  await new Promise(function (r) { server.listen(0, "127.0.0.1", r); });
  var base = "http://127.0.0.1:" + server.address().port;
  var browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined });

  async function open(url, opts) {
    opts = opts || {};
    var ctx = await browser.newContext({ viewport: { width: opts.width || 390, height: 844 }, serviceWorkers: "block" });
    var page = await ctx.newPage(), fonts = [];
    page.on("request", function (r) { if (/nunito/i.test(r.url())) fonts.push(r.url()); });
    if (opts.suiteStyle) await page.addInitScript(function () { try { localStorage.setItem("suite-style", "suite"); } catch (e) {} });
    await page.route("**/*", function (route) {
      var u = route.request().url();
      if (u.startsWith(base)) return route.continue();
      if (/fonts\.(googleapis|gstatic)\.com/.test(u)) return route.abort();   // Every current face is self-hosted.
      var body = fixture(u);
      if (body) return route.fulfill({ status: 200, contentType: "application/json", body: body });
      return route.abort();
    });
    await page.goto(base + url);
    if (!/choose/.test(url)) await page.waitForFunction(function () { return !document.getElementById("launch"); }, null, { timeout: 9000 });
    await page.evaluate(function () { return document.fonts.ready; });
    await page.waitForTimeout(300);
    return { ctx: ctx, page: page, fonts: fonts };
  }
  function family(page, sel) {
    return page.evaluate(function (s) { var el = document.querySelector(s); return el ? getComputedStyle(el).fontFamily : null; }, sel);
  }

  console.log("Ohio State, Team Style");
  var o = await open("/?team=ohio-state#roster", { width: 320 });
  ok(/^"?Nunito Sans"?/.test(await family(o.page, "body")), "text is set in Nunito Sans (" + await family(o.page, "body") + ")");
  ok(/^"?Nunito Sans"?/.test(await family(o.page, ".page-title")), "and so are the headings");
  ok(o.fonts.length > 0 && o.fonts.every(function (u) { return u.startsWith(base + "/assets/fonts/nunito-sans/"); }),
     "from the repository's own files (" + o.fonts.length + " requested), never a third party");
  ok(await o.page.evaluate(function () { return document.fonts.check('800 16px "Nunito Sans"'); }), "and the face really loaded");
  ok(await o.page.evaluate(function () { // Laid-out text against its box: scrollWidth rounds, and a
    // sub-pixel overflow still draws an ellipsis.
    var n = document.getElementById("barTeam"); if (!n || !n.textContent) return false;
    var r = document.createRange(); r.selectNodeContents(n);
    return r.getBoundingClientRect().width <= n.getBoundingClientRect().width + 0.01; }),
     "the SUITE bar's team name fits at 320px, untruncated");
  ok(await o.page.evaluate(function () { return document.documentElement.scrollWidth <= innerWidth; }), "and nothing scrolls sideways");
  await o.ctx.close();

  console.log("everyone else never downloads it");
  var n = await open("/?team=notre-dame#home");
  ok(n.fonts.length === 0, "Notre Dame: no Nunito Sans request");
  ok((await family(n.page, "body")).includes("Instrument Sans"), "Notre Dame uses Instrument Sans");
  ok((await family(n.page, ".hh-nick")).includes("Instrument Display"), "display uses the native condensed instance");
  ok((await family(n.page, ".sec-title")).startsWith("Georgia"), "News keeps Georgia");
  ok(await n.page.evaluate(function () { return document.fonts.check('700 16px "Instrument Sans"') && document.fonts.check('700 16px "Instrument Display"'); }), "both local Instrument faces really loaded");
  await n.ctx.close();
  var s = await open("/?team=ohio-state#home", { suiteStyle: true });
  ok(s.fonts.length === 0, "Ohio State in Suite Style: none either (Suite's own type)");
  ok((await family(s.page, "body")).includes("Instrument Sans"), "Suite Style uses Instrument on Ohio State too");
  await s.ctx.close();
  var c = await open("/?choose=1");
  await c.page.waitForTimeout(500);
  ok(c.fonts.length === 0, "the chooser: none");
  await c.ctx.close();

  await browser.close(); server.close();
  console.log("\n" + (failures ? failures + " check(s) FAILED" : "a team's own type loads for that team alone"));
  process.exit(failures ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
