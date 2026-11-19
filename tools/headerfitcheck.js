#!/usr/bin/env node
/* The desktop header holds every team (decision 0042). From 64rem the five
   destinations sit in the SUITE header beside the team's name and Settings.
   This loads the real app for every team in teams/, in each team's own
   display face, with Game in its widest state - Live, with the score - and
   measures, at the narrowest desktop width and a common one:

     - the room between the end of the team's name and the first destination
     - the room between the last destination and Settings, and that the
       team's name stays on one line
     - that the nav is in the header (document order = what is seen) at
       desktop width, and back at the foot of the page below it

   Usage:  node tools/headerfitcheck.js [team-id ...] */
"use strict";
var fs = require("fs"), path = require("path");
var chromium = require("playwright").chromium;
var root = path.join(__dirname, "..");
var server = require("./lib/serve")(root);
var only = process.argv.slice(2);
var TEAMS = fs.readdirSync(path.join(root, "teams")).filter(function (f) { return /\.js$/.test(f) && f !== "index.js"; })
  .map(function (f) { return f.slice(0, -3); }).filter(function (id) { return !only.length || only.indexOf(id) !== -1; }).sort();
var WIDTHS = [1024, 1280], MIN_ROOM = 16, MIN_GEAR = 8;

(async function () {
  await new Promise(function (r) { server.listen(0, "127.0.0.1", r); });
  var base = "http://127.0.0.1:" + server.address().port;
  var browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined });
  var failures = [], measured = 0;
  try {
    for (var w of WIDTHS) {
      var ctx = await browser.newContext({ viewport: { width: w, height: 800 }, serviceWorkers: "block" });
      var page = await ctx.newPage();
      await page.route("**/*", function (r) { return r.request().url().startsWith(base) ? r.continue() : r.abort(); });
      var tight = null;
      for (var id of TEAMS) {
        await page.goto(base + "/?team=" + id + "#home", { waitUntil: "domcontentloaded" });
        await page.waitForFunction(function () { var t = document.getElementById("barTeam"); return t && t.textContent.trim(); }, null, { timeout: 20000 });
        await page.evaluate(function () { return document.fonts.ready; });
        var m = await page.evaluate(function () {
          // The widest Game control there is: Live, with a double-digit score.
          Suite.nav.setGameState("live", "WWW 88–88 WWWW");
          var nav = document.getElementById("navbar"), bar = document.getElementById("appBar");
          var team = document.getElementById("barTeam").getBoundingClientRect();
          var items = nav.querySelectorAll(".nav-item");
          var first = items[0].getBoundingClientRect(), last = items[items.length - 1].getBoundingClientRect();
          var gear = document.getElementById("barGear").getBoundingClientRect();
          var tn = document.getElementById("barTeam"), lh = parseFloat(getComputedStyle(tn).lineHeight) || parseFloat(getComputedStyle(tn).fontSize) * 1.3;
          return { name: tn.textContent.trim(), inBar: nav.parentNode === bar, wrapped: tn.getBoundingClientRect().height > lh * 1.5,
                   room: first.left - team.right, gear: gear.left - last.right, overflow: bar.scrollWidth > bar.clientWidth + 1 };
        });
        measured++;
        if (!m.inBar) failures.push(w + " px " + id + ": the nav is not in the header");
        if (m.room < MIN_ROOM) failures.push(w + " px " + m.name + ": " + Math.round(m.room) + " px between the name and the first destination (needs " + MIN_ROOM + ")");
        if (m.gear < MIN_GEAR) failures.push(w + " px " + m.name + ": " + Math.round(m.gear) + " px between the destinations and Settings (needs " + MIN_GEAR + ")");
        if (m.overflow) failures.push(w + " px " + m.name + ": the header overflows");
        if (m.wrapped) failures.push(w + " px " + m.name + ": the team's name wraps");
        if (!tight || m.room < tight.room) tight = m;
      }
      console.log("  " + w + " px: tightest " + tight.name + ", " + Math.round(tight.room) + " px of room");
      // Below the desktop width the nav goes back to the foot of the page.
      await page.setViewportSize({ width: 900, height: 800 });
      await page.waitForTimeout(300);
      var back = await page.evaluate(function () { var n = document.getElementById("navbar"); return n.parentNode === document.body && n.previousSibling && n.previousSibling.nodeType === 8; });
      if (!back) failures.push("at 900 px the nav did not return to its place after the content");
      await ctx.close();
    }
  } finally { await browser.close(); server.close(); }
  console.log("");
  if (failures.length) { failures.forEach(function (f) { console.log("  FAIL " + f); }); process.exit(1); }
  console.log(TEAMS.length + " teams at " + WIDTHS.join(" and ") + " px (" + measured + " headers): every name, the five destinations, a live score and Settings fit");
})().catch(function (e) { console.error(e); process.exit(1); });
