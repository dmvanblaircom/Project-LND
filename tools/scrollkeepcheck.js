#!/usr/bin/env node
/* A live refresh keeps the fan's place on the page (David, 2026-11-08: on
   Game, scrolled down, every play update threw him back to the top).

   The cause was the engine, not a script: Safari's (WebKit) sends the page
   back to the top when a section is replaced while the fan is scrolled down
   it, and every live refresh of the play-by-play replaces Game's body
   (Suite.ui.fill). Reproduced on a GitHub runner in WebKit with iPhone
   emulation: Drive Tracker 790 px -> 73, Plays 850 px -> 0, no script
   scrolling. The fix, verified there the same way (790 and 850 held through
   every refresh): for the swap the section holds its height, so the page
   cannot collapse under the fan. Chromium keeps the place by itself and
   cannot show the jump, so this guards the mechanism: the height is held
   while the content is swapped, let go on the next frame, never held at the
   top of the page, and a section that really got shorter still settles to
   its new size.

   Usage:  node tools/scrollkeepcheck.js */
"use strict";
var path = require("path");
var chromium = require("playwright").chromium;
var root = path.join(__dirname, "..");
var server = require("./lib/serve")(root);
var failures = 0;
function ok(c, what) { console.log((c ? "  ok   " : "  FAIL ") + what); if (!c) failures++; }

(async function () {
  await new Promise(function (r) { server.listen(0, "127.0.0.1", r); });
  var base = "http://127.0.0.1:" + server.address().port;
  var browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined });
  try {
    var page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(base + "/tools/fixtures/espn-news.json");
    await page.setContent('<!doctype html><html><head><link rel="stylesheet" href="' + base + '/app.css"></head><body>' +
      '<div id="top" style="height:300px">top</div><div id="sec"></div><div id="foot" style="height:900px">foot</div></body></html>');
    await page.addScriptTag({ url: base + "/suite/ui.js" });
    function rows(n) { var h = ""; for (var i = 0; i < n; i++) h += '<p style="height:50px;margin:0">row ' + i + "</p>"; return h; }
    var R40 = rows(40), R41 = rows(41), R10 = rows(10);
    var res = await page.evaluate(async function (a) {
      var sec = document.getElementById("sec");
      Suite.ui.fill(sec, a.R40);
      window.scrollTo(0, 1200);
      var before = window.scrollY, hold = null;
      var mo = new MutationObserver(function () { if (hold === null) hold = sec.style.minHeight; });
      mo.observe(sec, { childList: true });
      Suite.ui.fill(sec, a.R41);                         // a refresh: one more play
      var after = window.scrollY;
      await new Promise(function (r) { requestAnimationFrame(function () { requestAnimationFrame(r); }); });
      var released = sec.style.minHeight;
      // A refresh that leaves the section much shorter, with the fan near its foot.
      window.scrollTo(0, document.documentElement.scrollHeight);
      Suite.ui.fill(sec, a.R10);
      await new Promise(function (r) { requestAnimationFrame(function () { requestAnimationFrame(r); }); });
      var max = document.documentElement.scrollHeight - innerHeight, shortY = window.scrollY;
      // At the top already: nothing to keep, nothing held.
      window.scrollTo(0, 0);
      Suite.ui.fill(sec, a.R40);
      var topHold = sec.style.minHeight;
      await new Promise(function (r) { requestAnimationFrame(function () { requestAnimationFrame(r); }); });
      // A section that scrolls by itself (the game sheet's body), its content swapped by a refresh.
      var box = document.createElement("div"); box.style.cssText = "height:300px;overflow-y:auto"; document.body.appendChild(box);
      Suite.ui.fill(box, a.R40); box.scrollTop = 600;
      new MutationObserver(function () {}).observe(box, { childList: true });
      Suite.ui.fill(box, a.R41);
      // A section ABOVE the fan grows: the browser's own scroll anchoring moves
      // the page down to keep what the fan reads still - fill must not undo it.
      Suite.ui.fill(sec, a.R40);
      window.scrollTo(0, 2400);                          // past the section, reading the foot
      var anchorBefore = window.scrollY, footBefore = document.getElementById("foot").getBoundingClientRect().top;
      Suite.ui.fill(sec, a.R40 + a.R10);                 // ten more rows above the reader
      var footAfter = document.getElementById("foot").getBoundingClientRect().top;
      return { before: before, after: after, hold: hold, released: released, shortY: shortY, shortMax: max, topHold: topHold, boxTop: box.scrollTop,
               anchorBefore: anchorBefore, anchorAfter: window.scrollY, footMoved: Math.round(footAfter - footBefore) };
    }, { R40: R40, R41: R41, R10: R10 });
    ok(res.before === 1200 && res.after === 1200, "a refresh while scrolled down keeps the fan's place (" + res.before + " -> " + res.after + ")");
    ok(/^\d+px$/.test(res.hold || ""), "the section holds its height for the swap (" + res.hold + "), so the page cannot collapse under the fan");
    ok(res.released === "", "the hold is let go on the next frame");
    ok(res.shortY <= res.shortMax + 1, "a section that really got shorter settles to its new size: no blank space held under it (" + res.shortY + " of " + res.shortMax + ")");
    ok(res.topHold === "", "at the top of the page nothing is held (" + res.topHold + ")");
    ok(res.boxTop === 600, "a section that scrolls by itself keeps its own place through a refresh (" + res.boxTop + ")");
    ok(res.anchorAfter > res.anchorBefore && Math.abs(res.footMoved) <= 1, "a section above the fan that grew: the browser's own anchoring keeps what they read still, and fill does not undo it (" + res.anchorBefore + " -> " + res.anchorAfter + ", the text moved " + res.footMoved + " px)");
  } finally { await browser.close(); server.close(); }
  console.log("");
  if (failures) { console.log(failures + " check(s) FAILED"); process.exit(1); }
  console.log("a live refresh keeps the fan where they were reading");
})().catch(function (e) { console.error(e); process.exit(1); });
