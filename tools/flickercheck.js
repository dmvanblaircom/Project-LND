#!/usr/bin/env node
/* A redraw never reloads a logo that is already showing (Suite.ui.fill).

   Home's hero, Game's header, Top 25 and Schedule redraw a section whenever
   its markup changes - on a first open several times as the schedule, rank,
   line and weather arrive, and on every tick of a live game. Plain innerHTML
   made new <img> elements each time; a new image paints nothing until it
   decodes again, so the initials under each logo flashed through (David,
   2026-10-01: "logos flicker like 3 times on first open in the hero").

   This loads the real suite/ui.js into a page, shows a logo, redraws the
   section with changed text, and checks the logo is the same element, still
   marked loaded, and the initials never come back. The same redraw done with
   plain innerHTML is the negative control: it must lose all three.

   Usage: node tools/flickercheck.js     (exit 1 on failure) */
"use strict";
var fs = require("fs"), path = require("path");
var chromium = require("playwright").chromium;
var root = path.join(__dirname, "..");
var UI = fs.readFileSync(path.join(root, "suite", "ui.js"), "utf8");
var CSS = fs.readFileSync(path.join(root, "app.css"), "utf8");
var LOGO = fs.readFileSync(path.join(root, "assets", "suite", "favicon-64.png"));

var failures = 0;
function ok(cond, what) { if (cond) { console.log("  ok   " + what); return; } failures++; console.log("  FAIL " + what); }

(async function () {
  var browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined });
  var page = await browser.newPage();
  await page.route("https://logo.test/**", function (r) { return r.fulfill({ status: 200, contentType: "image/png", body: LOGO }); });
  await page.setContent("<!doctype html><html><head><style>" + CSS + "</style></head><body>" +
    '<div id="a"></div><div id="b"></div><script>var Suite = {};</script><script>' + UI + "</script></body></html>");

  // Draw a section with a logo in each box, and wait for it to load.
  await page.evaluate(function () {
    window.section = function (text) {
      return "<p>" + text + "</p>" + Suite.ui.mark("https://logo.test/87.png", "Notre Dame", "ND", "bare");
    };
    Suite.ui.fill(document.getElementById("a"), section("first"));
    document.getElementById("b").innerHTML = section("first");
  });
  await page.waitForFunction(function () {
    return ["a", "b"].every(function (id) { var m = document.querySelector("#" + id + " .mark"); return m && m.classList.contains("loaded"); });
  }, null, { timeout: 5000 });

  var result = await page.evaluate(function () {
    function snap(id) { var img = document.querySelector("#" + id + " img[data-mark]"); return img; }
    var beforeA = snap("a"), beforeB = snap("b");
    Suite.ui.fill(document.getElementById("a"), section("second"));
    document.getElementById("b").innerHTML = section("second");
    function state(id, before) {
      var box = document.querySelector("#" + id + " .mark"), img = snap(id), ini = box.querySelector(".initials");
      return { same: img === before, loaded: box.classList.contains("loaded"),
               initials: getComputedStyle(ini).display, text: document.querySelector("#" + id + " p").textContent };
    }
    return { a: state("a", beforeA), b: state("b", beforeB) };
  });

  console.log("Suite.ui.fill: a redraw keeps the logo it already shows");
  ok(result.a.text === "second", "the section's new content is drawn");
  ok(result.a.same, "the logo is the same element, not a new one to decode");
  ok(result.a.loaded, "and is still marked loaded");
  ok(result.a.initials === "none", "so the initials under it never show (display " + result.a.initials + ")");
  console.log("negative control: plain innerHTML");
  ok(!result.b.same && !result.b.loaded && result.b.initials !== "none",
     "a plain redraw makes a new logo and shows the initials until it decodes - the flicker");

  // A logo that changed (another opponent) is not reused, and a logo that
  // never loaded is not carried over as if it had.
  var other = await page.evaluate(function () {
    var before = document.querySelector("#a img[data-mark]");
    Suite.ui.fill(document.getElementById("a"), "<p>x</p>" + Suite.ui.mark("https://logo.test/2426.png", "Navy", "NAVY", "bare"));
    var img = document.querySelector("#a img[data-mark]");
    return { reused: img === before, src: img.getAttribute("src") };
  });
  ok(!other.reused && /2426/.test(other.src), "a different logo is drawn fresh, never swapped for the old one");

  console.log("the screens use it");
  ["home", "game", "top25", "schedule"].forEach(function (s) {
    var src = fs.readFileSync(path.join(root, "suite", s + ".js"), "utf8");
    ok(/ui\.fill\(/.test(src) && !/\.innerHTML = html\[k\]/.test(src), "suite/" + s + ".js redraws its sections through ui.fill");
  });

  await browser.close();
  console.log("\n" + (failures ? failures + " check(s) FAILED" : "no logo reloads on a redraw"));
  process.exit(failures ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
