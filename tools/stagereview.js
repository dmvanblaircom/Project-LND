#!/usr/bin/env node
/* Review renders of the Stage 2 Home (Phase 2 brief §8 step 10; spec §9):
   every lifecycle state of the Home hero, drawn by the real app - its
   renderer, its stylesheet, its fonts - for a set of teams, in both App
   Styles, at phone, tablet and desktop widths.

   The app boots on the repository's fixtures (the same week visualcheck
   renders). Each state is the app's own Home model with its hero game
   changed to that state, painted with Suite.home.paint - so what is shown is
   exactly what a fan would see in that state, not a mock-up. The changes
   are the normalized Game's own fields (status, period, clock, scores,
   situation); nothing a fan could never see is invented.

   A tool for review, not a check: it writes pictures, and passes or fails
   nothing. Visual approval is a person's call.

   Usage:
     node tools/stagereview.js [outDir]
   Env:
     STAGE_TEAMS    teams (default: notre-dame,ohio-state,texas-tech,oregon,ucla,navy)
     STAGE_WIDTHS   widths (default: 320,375,390,768,1280,1440)
     STAGE_STATES   states (default: all)
     STAGE_STYLES   team,suite (default: both)
     ALLOW_PROVIDER_IMAGES=1  let team marks load from the provider (CI can)
     STAGE_FULL=1   the whole page, not the first screen
     STAGE_SCREEN=game  Game in each state instead of Home
     STAGE_OPP      "providerId:Name:ABBR" - play this opponent instead (e.g. 194:Ohio State:OSU)
     STAGE_VENUE    "Venue name:home|away|neutral[:City:ST]" - play at this venue
     STAGE_PROBE=1  fail when a component paints the dark screens' ink as a ground
     STAGE_NOSHOT=1 with STAGE_PROBE, probe only (no screenshots)
     STAGE_ROOT     serve the app from this checkout instead (the fixtures and
                    this harness stay this one's): tools/changesheet.js draws
                    the base branch with the same hands as the head
     STAGE_STILL=1  reduced motion, and wait for images and fonts before each
                    shot, so the same page draws the same pixels twice
     PW_CHROMIUM    a Chromium to use */
"use strict";

var fs = require("fs"), path = require("path");
var chromium = require("playwright").chromium;
var root = path.join(__dirname, "..");
var serve = require("./lib/serve");
var appRoot = process.env.STAGE_ROOT ? path.resolve(process.env.STAGE_ROOT) : root;
var STILL = !!process.env.STAGE_STILL;
var out = path.resolve(process.argv[2] || path.join(root, "artifacts", "stage2"));
fs.mkdirSync(out, { recursive: true });

var stage = require("./lib/stage");
var STATES = stage.STATES;

var TEAMS = (process.env.STAGE_TEAMS || "notre-dame,ohio-state,texas-tech,oregon,ucla,navy").split(",");
var WIDTHS = (process.env.STAGE_WIDTHS || "320,375,390,768,1280,1440").split(",").map(Number);
var PICK = process.env.STAGE_STATES ? process.env.STAGE_STATES.split(",") : Object.keys(STATES);
var STYLES = (process.env.STAGE_STYLES || "team,suite").split(",");

// STAGE_STILL: every image settled (loaded or failed) and every font in,
// so a screen that did not change draws the same pixels on both sides
function settle(page) { return STILL ? stage.settle(page) : Promise.resolve(); }

(async function () {
  var server = serve(appRoot);
  await new Promise(function (r) { server.listen(0, "127.0.0.1", r); });
  var base = "http://127.0.0.1:" + server.address().port;
  var browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined });
  var shots = 0, probeHits = [];
  for (var team of TEAMS) for (var style of STYLES) for (var width of WIDTHS) {
    var GAME = process.env.STAGE_SCREEN === "game";
    var OPP = process.env.STAGE_OPP ? process.env.STAGE_OPP.split(":") : null;
    var VENUE = process.env.STAGE_VENUE ? process.env.STAGE_VENUE.split(":") : null;
    var opened = await stage.open(browser, base, { team: team, style: style, width: width, screen: GAME ? "game" : "home",
                                                   still: STILL, allowImages: !!process.env.ALLOW_PROVIDER_IMAGES });
    var ctx = opened.ctx, page = opened.page;
    if (!opened.ready) { console.log("  " + team + " " + style + " " + width + ": no hero game; skipped"); await ctx.close(); continue; }
    for (var name of PICK) {
      await stage.paint(page, name, { screen: GAME ? "game" : "home", opp: OPP, venue: VENUE });
      await settle(page);
      if (process.env.STAGE_PROBE) {
        // Home and Game are dark and redefine --t-surface as their ink; a
        // component that paints that token as a ground there has lost the
        // team's colour (2026-11-21: the drive field's own end zone went white)
        var hits = await page.evaluate(function () {
          var ink = getComputedStyle(document.querySelector("#screenHome:not([hidden]),#screenGame:not([hidden])") || document.body).getPropertyValue("--t-surface").trim();
          // only a screen that redefines --t-surface as its ink can paint it
          // as a ground by mistake (decision 0047 took the dark body away)
          if (ink === getComputedStyle(document.documentElement).getPropertyValue("--t-surface").trim()) return [];
          var probe = document.createElement("i"); probe.style.color = ink; document.body.appendChild(probe);
          var rgb = getComputedStyle(probe).color; probe.remove();
          var out = [];
          document.querySelectorAll("#screenHome:not([hidden]) *,#screenGame:not([hidden]) *").forEach(function (e) {
            var cs = getComputedStyle(e), r = e.getBoundingClientRect();
            if (r.width < 4 || r.height < 4 || cs.visibility === "hidden" || cs.display === "none") return;
            var paints = cs.backgroundColor === rgb || cs.backgroundImage.indexOf(rgb) !== -1 ||
                         (e instanceof SVGElement && e.tagName !== "text" && cs.fill === rgb);
            if (paints) out.push(e.tagName.toLowerCase() + (e.getAttribute("class") ? "." + e.getAttribute("class").trim().split(/\s+/).join(".") : ""));
          });
          return out.filter(function (x, i, a) { return a.indexOf(x) === i; });
        });
        hits.forEach(function (h) { probeHits.push([team, style, width, GAME ? "game" : "home", name, h].join(" | ")); });
        if (process.env.STAGE_NOSHOT) continue;
      }
      var file = path.join(out, [team, style, GAME ? "game" : null, name, width].filter(Boolean).join("-") + ".png");
      var hero = await page.$("[data-home=hero]");
      // the first screen as a fan opens it, header and hero; desktop the whole Home
      if (process.env.STAGE_FULL) {
        // the whole page as a phone scrolls it: a viewport as tall as the page,
        // so the fixed header and nav sit where they belong
        var tall = await page.evaluate(function () { return Math.ceil(document.documentElement.scrollHeight); });
        await page.setViewportSize({ width: width, height: Math.min(9000, tall) });
        await page.waitForTimeout(200);
        await settle(page);
        await page.screenshot({ path: file });
        await page.setViewportSize({ width: width, height: width >= 1024 ? 900 : 860 });
      }
      else if (width >= 1024) await page.screenshot({ path: file });
      else {
        var box = hero ? await hero.boundingBox() : null;
        await page.screenshot({ path: file, clip: { x: 0, y: 0, width: width, height: Math.min(2400, Math.ceil((box ? box.y + box.height : 860) + 8)) } });
      }
      shots++;
    }
    console.log("  " + team + " " + style + " " + width + ": " + PICK.length + " states");
    await ctx.close();
  }
  await browser.close();
  server.close();
  console.log(shots + " screenshots in " + path.relative(root, out));
  if (process.env.STAGE_PROBE) {
    probeHits.forEach(function (h) { console.log("  INK AS GROUND " + h); });
    console.log(probeHits.length ? probeHits.length + " components paint the dark screens' ink as a ground" : "no component paints the dark screens' ink as a ground");
    if (probeHits.length) process.exitCode = 1;
  }
})().catch(function (e) { console.error(e); process.exit(1); });
