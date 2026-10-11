#!/usr/bin/env node
/* The Leaders / Box Score team toggle never moves the page (David,
   2026-10-10: on the BYU matchup, switching the stat leaders to BYU "jumped
   me back to the top of the page").

   The card is redrawn when the side changes, and focus went back to the
   new toggle with a plain focus(). With html's scroll padding (the bottom
   nav's height plus room), a toggle sitting just above the nav - where a
   thumb is - counted as hidden, and focus() scrolled the page to reveal it.

   This opens the real app on fixed data, on the hero game (#game) and on a
   game opened from Schedule, puts the toggle in the middle of the screen
   and just above the bottom nav, presses the other side and back, and
   checks each time: the page did not scroll, the toggle is where it was,
   it is pressed and has focus, and the card shows the other team.

   Usage: node tools/togglecheck.js     (exit 1 on failure) */
"use strict";
var fs = require("fs"), path = require("path");
var chromium = require("playwright").chromium;
var serve = require("./lib/serve");
var root = path.join(__dirname, "..");
var FX = path.join(root, "tools", "fixtures");
function fx(f) { return fs.readFileSync(path.join(FX, f)); }
function body(url) {
  if (/\/teams\/\d+\/schedule(?:\?|$)/.test(url)) return fx("espn-schedule.json");
  if (/\/scoreboard\?/.test(url)) return fx("espn-scoreboard-sep26.json");
  if (/\/rankings(?:\?|$)/.test(url)) return fx("espn-rankings-sep20.json");
  if (/\/roster(?:\?|$)/.test(url)) return fx("espn-roster-nd-sep24.json");
  if (/\/news\?/.test(url)) return fx("espn-news-nd-sep24.json");
  if (/\/summary\?/.test(url)) return fx("espn-summary-pre.json");
  if (/\/statistics(?:\?|$)/.test(url)) return fx("espn-season-stats.json");
  if (/\/teams\/\d+(?:\?|$)/.test(url)) return fx("espn-team.json");
  return null;
}

var failures = 0;
function ok(cond, what) { if (cond) { console.log("  ok   " + what); return; } failures++; console.log("  FAIL " + what); }

(async function () {
  var server = serve(function () { return root; });
  await new Promise(function (r) { server.listen(0, "127.0.0.1", r); });
  var BASE = "http://127.0.0.1:" + server.address().port;
  var browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined });
  try {
    // 700 tall: the fixture game page is short, and the toggle must be able
    // to sit just above the bottom nav with room to scroll either way.
    var ctx = await browser.newContext({ viewport: { width: 390, height: 700 }, hasTouch: true, isMobile: true,
      serviceWorkers: "block", timezoneId: "America/New_York", locale: "en-US" });
    var page = await ctx.newPage(), errors = [];
    page.on("pageerror", function (e) { errors.push(String(e && e.message || e)); });
    await page.route("**/*", function (r) {
      var u = r.request().url();
      if (u.startsWith(BASE)) return r.continue();
      var b = body(u);
      return b ? r.fulfill({ status: 200, contentType: "application/json", body: b }) : r.abort();
    });

    await page.goto(BASE + "/?team=notre-dame#schedule");
    await page.waitForTimeout(1500);
    var other = await page.evaluate(function () {
      var hero = document.querySelector('#scheduleList a[href="#game"]') ? true : false;
      var a = [].slice.call(document.querySelectorAll('#scheduleList a[href^="#schedule/"]'))
        .filter(function (x) { return /^#schedule\/\d+$/.test(x.getAttribute("href")); });
      return { hero: hero, href: a.length ? a[a.length - 1].getAttribute("href") : null };
    });
    ok(!!other.href, "Schedule lists a game that opens at #schedule/<id>");

    var places = [["#game", "#screenGame"], [other.href, "#scheduleGameHost"]];
    for (var p of places) {
      if (!p[0]) continue;
      await page.goto(BASE + "/?team=notre-dame" + p[0]);
      await page.waitForTimeout(1500);
      for (var at of ["middle", "low"]) {
        // Put the Leaders toggle at this height on screen.
        var where = await page.evaluate(function (o) {
          var b = document.querySelector(o.host + ' .gcard-leaders [data-side="us"]');
          if (!b) return null;
          var nav = document.getElementById("navbar"), r = b.getBoundingClientRect();
          // "low": its bottom 8px above the nav - inside the scroll padding.
          var want = o.at === "low" ? nav.getBoundingClientRect().top - 8 - r.height : innerHeight * 0.5;
          window.scrollBy(0, r.top - want);
          return { top: b.getBoundingClientRect().top, y: scrollY,
                   aboveNav: b.getBoundingClientRect().bottom <= nav.getBoundingClientRect().top };
        }, { host: p[1], at: at });
        ok(!!where, p[0] + ": the Leaders card has a team toggle");
        if (!where) continue;
        ok(where.aboveNav, p[0] + " @" + Math.round(where.top) + "px: the toggle sits above the bottom nav");
        for (var side of ["them", "us"]) {
          var before = await page.evaluate(function (o) {
            var c = document.querySelector(o.host + " .gcard-leaders");
            return c.querySelector(".ld-list, .sec-quiet").textContent;
          }, { host: p[1] });
          var box = await page.evaluate(function (o) {
            var r = document.querySelector(o.host + ' .gcard-leaders [data-side="' + o.side + '"]').getBoundingClientRect();
            return [r.left + r.width / 2, r.top + r.height / 2];
          }, { host: p[1], side: side });
          await page.touchscreen.tap(box[0], box[1]);
          await page.waitForTimeout(250);
          var after = await page.evaluate(function (o) {
            var b = document.querySelector(o.host + ' .gcard-leaders [data-side="' + o.side + '"]');
            var c = document.querySelector(o.host + " .gcard-leaders");
            return { y: scrollY, top: b.getBoundingClientRect().top, pressed: b.getAttribute("aria-pressed"),
                     focused: document.activeElement === b, hash: location.hash,
                     text: c.querySelector(".ld-list, .sec-quiet").textContent };
          }, { host: p[1], side: side });
          var label = p[0] + " @" + Math.round(where.top) + "px, " + side + ": ";
          ok(after.hash === p[0], label + "still on " + p[0] + " (" + after.hash + ")");
          ok(after.y === where.y, label + "the page did not scroll (" + where.y + " -> " + after.y + ")");
          ok(Math.abs(after.top - where.top) <= 1, label + "the toggle stayed where it was (" +
             Math.round(where.top) + " -> " + Math.round(after.top) + ")");
          ok(after.pressed === "true" && after.focused, label + "the pressed side is marked and keeps focus");
          ok(after.text !== before, label + "the card shows the other team's leaders");
        }
      }
    }
    ok(!errors.length, "no page errors" + (errors.length ? ": " + errors.join(" / ") : ""));
  } finally {
    await browser.close();
    server.close();
  }
  console.log(failures ? "\ntogglecheck: " + failures + " failure(s)" : "\ntogglecheck: all passed");
  process.exit(failures ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
