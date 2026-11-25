#!/usr/bin/env node
/* Every team gets the same experience (David, 2026-11-25: "This need to
   work for all 138 teams"; decision 0048). The stage is measured for all
   138 by herocontrastcheck; this is the rest of Home and Game, in the real
   app (tools/lib/stage.js), for a set of teams.

   For each team: Home before the game, live and final, and Game live and
   before the game, at a phone's width, and Home live at desktop width.
   On each screen:

     sideways   the page never scrolls sideways
     leak       no "undefined", "NaN", "null", "[object Object]" or
                "Invalid Date" in what the fan reads
     contrast   every word at WCAG AA against the pixels behind it
                (the photo stage is herocontrastcheck's)
     motion     with reduced motion on, nothing animates without end
     matchup    where Matchup shows, the better side stands out more
                than the other (2026-11-25: the highlight was backwards)

   Which teams:
     TEAMS=notre-dame,ohio-state    these
     TEAMS=all                      all 138 (the full run, decision 0048)
     default                        the colour extremes, tools/teamsets/extremes.txt
     TEAM_SHARD=2/4                 the second quarter of them

   Usage: node tools/teamcheck.js     (exit 1 on failure) */
"use strict";
var fs = require("fs"), path = require("path");
var chromium = require("playwright").chromium;
var root = path.join(__dirname, ".."), serve = require("./lib/serve"), stage = require("./lib/stage"), audit = require("./a11yaudit");

function teams() {
  var all = fs.readdirSync(path.join(root, "teams")).filter(function (f) { return /\.js$/.test(f) && f !== "index.js"; })
    .map(function (f) { return f.replace(/\.js$/, ""); }).sort();
  var list = process.env.TEAMS === "all" ? all : process.env.TEAMS ? process.env.TEAMS.split(",")
    : fs.readFileSync(path.join(root, "tools", "teamsets", "extremes.txt"), "utf8").replace(/#.*/g, "").split(/\s+/).filter(Boolean);
  if (process.env.TEAM_SHARD) {
    var sh = process.env.TEAM_SHARD.split("/").map(Number);
    list = list.filter(function (t, i) { return i % sh[1] === sh[0] - 1; });
  }
  return list;
}
var SCREENS = [
  { screen: "home", state: "pre-far", width: 390 },
  { screen: "home", state: "live", width: 390 },
  { screen: "home", state: "final-win", width: 390 },
  { screen: "game", state: "pre-far", width: 390 },
  { screen: "game", state: "live", width: 390 },
  { screen: "home", state: "live", width: 1280 }
];

var failures = [], screens = 0, words = 0, rows = 0;
function fail(who, kind, detail) { failures.push(who + " | " + kind + " | " + detail); console.log("  FAIL " + who + " | " + kind + " | " + detail); }

// What the fan reads on the open screen, and how it sits.
function inspect() {
  var sc = document.querySelector("#main > div:not([hidden])") || document.body;
  var text = sc.innerText || "";
  var leaks = (text.match(/\bundefined\b|\bNaN\b|\bnull\b|\[object Object\]|Invalid Date/g) || []);
  var running = document.getAnimations().filter(function (a) {
    var t = a.effect && a.effect.getTiming ? a.effect.getTiming() : {};
    return a.playState === "running" && t.iterations === Infinity;
  }).map(function (a) {
    var el = a.effect && a.effect.target;
    return (a.animationName || "animation") + " on " + (el ? el.tagName.toLowerCase() + (el.className && el.className.baseVal == null ? "." + String(el.className).trim().split(/\s+/).join(".") : "") : "?") +
      (a.effect && a.effect.pseudoElement ? a.effect.pseudoElement : "");
  });
  // Matchup: the better side's highlight against the other's, by how far each
  // ground and border sits from the card behind them
  function rgb(s) { var m = s.match(/[\d.]+/g); return m ? m.slice(0, 4).map(Number) : [0, 0, 0, 0]; }
  function lum(c) { return [0, 1, 2].reduce(function (s, i) { var v = c[i] / 255; v = v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); return s + [.2126, .7152, .0722][i] * v; }, 0); }
  function con(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
  function sal(el) {
    var cs = getComputedStyle(el), card = rgb(getComputedStyle(el.closest(".card") || document.body).backgroundColor);
    var bg = rgb(cs.backgroundColor), sh = cs.boxShadow, ring = sh && sh !== "none" ? rgb(sh) : null, bd = rgb(cs.borderTopColor);
    var g = bg[3] === undefined || bg[3] > 0 ? con(bg.length > 3 && bg[3] < 1 ? [0, 1, 2].map(function (i) { return bg[i] * bg[3] + card[i] * (1 - bg[3]); }) : bg, card) : 1;
    var r = ring ? con(ring, card) : 1, b = parseFloat(cs.borderTopWidth) > 0 ? con(bd, card) : 1;
    return Math.max(g, r, b);
  }
  var matchup = [].map.call(document.querySelectorAll("#main > div:not([hidden]) .mu-row"), function (row) {
    var b = row.querySelector(".mu-v.better"), o = row.querySelector(".mu-v:not(.better)");
    return b && o ? { label: (row.querySelector(".mu-l") || row).textContent.trim().slice(0, 30), better: sal(b), other: sal(o) } : null;
  }).filter(Boolean);
  return { sideways: document.documentElement.scrollWidth - document.documentElement.clientWidth, leaks: leaks, running: running, matchup: matchup };
}

(async function () {
  var list = teams();
  var server = serve(root);
  await new Promise(function (r) { server.listen(0, "127.0.0.1", r); });
  var base = "http://127.0.0.1:" + server.address().port;
  var browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined });
  console.log("teams: " + list.join(", "));
  for (var team of list) {
    for (var sc of SCREENS) {
      var who = team + " " + sc.screen + " " + sc.state + " " + sc.width;
      var o = await stage.open(browser, base, { team: team, width: sc.width, screen: sc.screen, still: true, allowImages: !!process.env.ALLOW_PROVIDER_IMAGES });
      if (!o.ready) { fail(who, "screen", "never drew its game"); await o.ctx.close(); continue; }
      await stage.paint(o.page, sc.state, { screen: sc.screen });
      await stage.settle(o.page);
      var r = await o.page.evaluate(inspect);
      if (r.sideways > 1) fail(who, "sideways", "the page scrolls " + r.sideways + "px sideways");
      if (r.leaks.length) fail(who, "leak", r.leaks.join(", "));
      if (r.running.length) fail(who, "motion", "animates without end under reduced motion: " + r.running.join("; "));
      r.matchup.forEach(function (m) { if (!(m.better > m.other + 0.15)) fail(who, "matchup", m.label + ": better " + m.better.toFixed(2) + " vs other " + m.other.toFixed(2)); });
      // contrast of the body: the photo stage and Game's photo header are
      // herocontrastcheck's, over every team, venue and light
      var hide = await o.page.addStyleTag({ content: "[data-home=hero],.game-head{visibility:hidden!important}" });
      var t = await audit.auditText(o.page, who);
      await hide.evaluate(function (n) { n.remove(); });
      words += t.checked; rows += r.matchup.length;
      t.failures.forEach(function (f) { fail(who, "contrast", f.sel + ' "' + String(f.text).slice(0, 40) + '" ' + f.detail); });
      screens++;
      await o.ctx.close();
    }
    console.log("  " + team + ": " + SCREENS.length + " screens");
  }
  await browser.close();
  server.close();
  console.log("\n" + screens + " screens, " + list.length + " teams, " + words + " words measured, " + rows + " matchup rows; " + (failures.length ? failures.length + " problem(s)" : "every team gets the same experience"));
  process.exit(failures.length ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
