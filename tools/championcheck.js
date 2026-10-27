#!/usr/bin/env node
/* The defending national champions banner (David, 2026-10-27: on Home for
   Indiana, built so that whoever the defending champions are get it).

   TeamOS.champions in a bare scope, then the real app in Chromium on a fixed
   day (2026-10-27, so nothing here expires), with the committed
   data/league/champion.json:
     - Indiana, the 2025 champion, gets the banner across the top of Home
     - Notre Dame does not; nor does Indiana when the file is two seasons old
     - the module names no team: the next champion needs no change

   Usage: node tools/championcheck.js     (exit 1 on failure) */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");
var chromium = require("playwright").chromium;
var root = path.join(__dirname, "..");
var serve = require("./lib/serve");
var FX = path.join(root, "tools", "fixtures");
function read(f) { return fs.readFileSync(path.join(root, f), "utf8"); }

var failures = 0;
function ok(cond, what) { if (cond) { console.log("  ok   " + what); return; } failures++; console.log("  FAIL " + what); }

console.log("TeamOS.champions");
var c = vm.createContext({});
vm.runInContext(read("teamos/champions.js"), c, { filename: "teamos/champions.js" });
var D = c.TeamOS.champions.defending;
var SNAP = JSON.parse(read("data/league/champion.json"));
var IU = { sources: { espn: { teamId: "84" } } }, ND = { sources: { espn: { teamId: "87" } } };
var t = D(SNAP, IU, 2026);
ok(t && t.season === 2025 && t.opponent === "Miami" && t.score === "27-21", "the committed file: Indiana, 2025, over Miami 27-21 (" + JSON.stringify(t) + ")");
ok(D(SNAP, ND, 2026) === null, "another team has no title to defend");
ok(D(SNAP, IU, 2025) !== null, "in January, before the next title game, it is still defending");
ok(D(SNAP, IU, 2027) === null, "two seasons on, a file that stopped updating shows nothing");
ok(D(Object.assign({}, SNAP, { capability: "notes" }), IU, 2026) === null && D(null, IU, 2026) === null && D(SNAP, {}, 2026) === null,
   "not a champion file, no file, no team: nothing");
ok(D(Object.assign({}, SNAP, { score: null }), IU, 2026).score === null, "a file without a score still crowns the champion, without one");
ok(!/indiana|hoosier|miami|\b84\b/i.test(read("teamos/champions.js").replace(/\/\*[\s\S]*?\*\//g, "")), "champions.js names no team");

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

  async function home(team, champ) {
    var ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
    var page = await ctx.newPage();
    await page.clock.setSystemTime(new Date("2026-10-27T16:00:00Z"));
    await page.route("**/*", function (route) {
      var u = route.request().url();
      if (champ && /\/data\/league\/champion\.json/.test(u)) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(champ) });
      if (u.startsWith(base)) return route.continue();
      var body = fixture(u);
      if (body) return route.fulfill({ status: 200, contentType: "application/json", body: body });
      return route.abort();
    });
    await page.goto(base + "/?team=" + team + "#home");
    await page.waitForFunction(function () { return !document.getElementById("launch") && document.querySelector('#screenHome [data-home="hero"]'); }, null, { timeout: 15000 });
    await page.waitForTimeout(800);
    var out = await page.evaluate(function () {
      var el = document.querySelector('#screenHome [data-home="champion"]'), first = document.querySelector("#screenHome > div:not([hidden]), #screenHome > section:not([hidden])");
      var b = el && el.querySelector(".champ");
      return { shown: !!(el && !el.hidden && b), text: b ? b.innerText.replace(/\s+/g, " ").trim() : "", top: first === el,
               label: b ? b.getAttribute("aria-label") : "", bg: b ? getComputedStyle(b).backgroundColor : "",
               fits: b ? b.scrollWidth <= b.clientWidth + 1 : true };
    });
    await ctx.close();
    return out;
  }

  console.log("Home");
  var iu = await home("indiana");
  ok(iu.shown && /^Defending National Champions 2025 national champions · beat Miami 27–21$/i.test(iu.text),
     "Indiana's Home carries the banner (" + iu.text + ")");
  ok(iu.top, "across the top of Home, before the game");
  ok(/^Defending national champions\. 2025 national champions · beat Miami 27–21\.$/.test(iu.label), "and says so to a screen reader in one line");
  ok(iu.bg === "rgb(153, 0, 0)" && iu.fits, "in Indiana's crimson, within the screen (" + iu.bg + ")");
  var nd = await home("notre-dame");
  ok(!nd.shown, "Notre Dame's Home has none");
  var old = await home("indiana", Object.assign({}, SNAP, { season: 2024 }));
  ok(!old.shown, "nor Indiana's, when the file is two seasons old");

  await browser.close(); server.close();
  console.log("\n" + (failures ? failures + " check(s) FAILED" : "the defending champions, whoever they are, get the banner"));
  process.exit(failures ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
