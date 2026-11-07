#!/usr/bin/env node
/* Evaluation only: does Concept B's header hold every team?

   Loads the real app for each team in teams/ at a desktop width with
   b-header.css injected and the Game destination in its live state (the
   widest it gets), and measures the room between the end of the team's name
   in the header and the first destination. Each team's own display face is
   used, as the app uses it.

   Usage:  node tools/specimen/nav-concepts/fit.js [width ...]   (default 1024 1280) */
"use strict";
var fs = require("fs"), path = require("path");
var chromium = require("playwright").chromium;
var root = path.join(__dirname, "..", "..", "..");
var server = require(path.join(root, "tools/lib/serve"))(root);
var CSS = fs.readFileSync(path.join(__dirname, "b-header.css"), "utf8");
var widths = process.argv.slice(2).map(Number).filter(Boolean);
if (!widths.length) widths = [1024, 1280];
var TEAMS = fs.readdirSync(path.join(root, "teams")).filter(function (f) { return /\.js$/.test(f) && f !== "index.js"; }).map(function (f) { return f.slice(0, -3); });

(async function () {
  await new Promise(function (r) { server.listen(0, "127.0.0.1", r); });
  var base = "http://127.0.0.1:" + server.address().port;
  var browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined });
  var worst = {};
  try {
    for (var w of widths) {
      var ctx = await browser.newContext({ viewport: { width: w, height: 800 }, serviceWorkers: "block" });
      var page = await ctx.newPage();
      await page.route("**/*", function (r) { return r.request().url().startsWith(base) ? r.continue() : r.abort(); });
      var rows = [];
      for (var id of TEAMS) {
        await page.goto(base + "/?team=" + id + "#home", { waitUntil: "domcontentloaded" });
        await page.waitForFunction(function () { var t = document.getElementById("barTeam"); return t && t.textContent.trim(); }, null, { timeout: 15000 }).catch(function () {});
        await page.addStyleTag({ content: CSS });
        await page.evaluate(function () { return document.fonts.ready; });
        var m = await page.evaluate(function () {
          var nav = document.getElementById("navbar");
          nav.classList.add("game-raised", "game-live");
          var team = document.getElementById("barTeam").getBoundingClientRect();
          var first = nav.querySelector(".nav-item").getBoundingClientRect();
          var gear = document.getElementById("barGear");
          var g = gear && !gear.hidden ? gear.getBoundingClientRect() : null;
          var last = [].slice.call(nav.querySelectorAll(".nav-item")).pop().getBoundingClientRect();
          return { name: document.getElementById("barTeam").textContent.trim(), room: first.left - team.right,
                   gearRoom: g ? g.left - last.right : null };
        });
        rows.push(Object.assign({ id: id }, m));
      }
      rows.sort(function (a, b) { return a.room - b.room; });
      var bad = rows.filter(function (r) { return r.room < 16; });
      console.log(w + " px: tightest " + rows.slice(0, 5).map(function (r) { return r.name + " " + Math.round(r.room) + " px"; }).join(", ") +
                  (bad.length ? "\n  " + bad.length + " team(s) under 16 px: " + bad.map(function (r) { return r.name; }).join(", ") : "\n  every team clears 16 px") +
                  "; gear clearance " + Math.round(rows[0].gearRoom) + " px");
      worst[w] = bad.length;
      await ctx.close();
    }
  } finally { await browser.close(); server.close(); }
  process.exit(Object.keys(worst).some(function (k) { return worst[k]; }) ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
