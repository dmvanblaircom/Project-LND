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
     PW_CHROMIUM    a Chromium to use */
"use strict";

var fs = require("fs"), path = require("path");
var chromium = require("playwright").chromium;
var root = path.join(__dirname, "..");
var serve = require("./lib/serve");
var out = path.resolve(process.argv[2] || path.join(root, "artifacts", "stage2"));
fs.mkdirSync(out, { recursive: true });

// The fixtures' week: Tuesday, Oct 27 2026; the hero is the next game.
var FIXTURE_NOW = "2026-10-27T16:00:00Z";
function fx(name) { return fs.readFileSync(path.join(root, "tools", "fixtures", name)); }
function responseFor(url) {
  if (/\/data\/league\/rankings-\d+\.json/.test(url)) return fx("rankings-2026-sample.json");
  if (/\/data\/league\/fpi-history-\d+\.json/.test(url)) return fx("fpi-history-2026-sample.json");
  if (/\/schedule\?seasontype=3/.test(url)) return fx("espn-schedule-nd-2025-post.json");
  if (/\/schedule(?:\?|$)/.test(url)) return fx("espn-schedule.json");
  if (/\/scoreboard\?/.test(url)) return fx("espn-scoreboard-sep26.json");
  if (/\/rankings(?:\?|$)/.test(url)) return fx("espn-rankings-sep20.json");
  if (/\/roster(?:\?|$)/.test(url)) return fx("espn-roster.json");
  if (/\/news\?/.test(url)) return fx("espn-news.json");
  if (/\/summary\?/.test(url)) return fx("espn-summary-pre.json");
  if (/\/statistics(?:\?|$)/.test(url)) return fx("espn-season-stats.json");
  if (/\/teams\/\d+(?:\?|$)/.test(url)) return fx("espn-team.json");
  return null;
}

// Each state as the normalized Game's own fields. Times are relative to the
// fixture's now, so the countdown tiers read true.
var H = 36e5, D = 24 * H;
var STATES = {
  "pre-far":   { now: 0, date: 4 * D + 3 * H, status: "scheduled" },
  "pre-eve":   { now: 0, date: 1 * D + 2 * H, status: "scheduled" },
  "pre-day":   { now: 0, date: 6 * H, status: "scheduled" },
  "pre-near":  { now: 0, date: 75 * 6e4, status: "scheduled" },
  "pre-night": { now: 0, at: "2026-10-31T23:30:00Z", status: "scheduled" },
  "live-night":{ at: "2026-10-31T23:30:00Z", status: "live", hasStarted: true, period: 4, clock: "2:15", us: 27, them: 24,
                 situation: { possession: "them", short: "3rd & 4", spot: "ND 41" } },
  "live":      { status: "live", hasStarted: true, period: 3, clock: "8:42", us: 24, them: 17,
                 situation: { possession: "us", short: "2nd & 7", spot: "OPP 34" } },
  "halftime":  { status: "live", hasStarted: true, period: 2, clock: "0:00", detail: "Halftime", us: 14, them: 10,
                 situation: { receives: "us" } },
  "overtime":  { status: "live", hasStarted: true, period: 6, clock: "0:00", us: 31, them: 31,
                 situation: { possession: "them", short: "1st & 10", spot: "US 25" } },
  "delayed":   { status: "delayed", hasStarted: true, period: 2, clock: "6:15", us: 7, them: 3 },
  "suspended": { status: "suspended", hasStarted: true, period: 3, clock: "11:02", us: 13, them: 20 },
  "end":       { status: "live", hasStarted: true, period: 4, clock: "0:00", us: 34, them: 27 },
  "final-win": { status: "final", hasStarted: true, period: 4, clock: "0:00", us: 34, them: 27 },
  "final-loss":{ status: "final", hasStarted: true, period: 4, clock: "0:00", us: 20, them: 28 }
};
var TEAMS = (process.env.STAGE_TEAMS || "notre-dame,ohio-state,texas-tech,oregon,ucla,navy").split(",");
var WIDTHS = (process.env.STAGE_WIDTHS || "320,375,390,768,1280,1440").split(",").map(Number);
var PICK = process.env.STAGE_STATES ? process.env.STAGE_STATES.split(",") : Object.keys(STATES);
var STYLES = (process.env.STAGE_STYLES || "team,suite").split(",");

(async function () {
  var server = serve(root);
  await new Promise(function (r) { server.listen(0, "127.0.0.1", r); });
  var base = "http://127.0.0.1:" + server.address().port;
  var browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined });
  var shots = 0, probeHits = [];
  for (var team of TEAMS) for (var style of STYLES) for (var width of WIDTHS) {
    var ctx = await browser.newContext({ viewport: { width: width, height: width >= 1024 ? 900 : 860 }, serviceWorkers: "block",
                                         timezoneId: "America/New_York", locale: "en-US", deviceScaleFactor: 1 });
    var page = await ctx.newPage();
    await page.clock.setSystemTime(new Date(FIXTURE_NOW));
    await page.addInitScript(function (st) {
      try { localStorage.setItem("suite-style", st); } catch (e) {}
      // and Game's model, to repaint Game in each state (STAGE_SCREEN=game)
      var gameHook = setInterval(function () {
        if (window.Suite && Suite.game && Suite.game.paint && !Suite.game.__wrapped) {
          var gp = Suite.game.paint;
          Suite.game.paint = function (host, m) { if (host && host.id === "screenGame" && m && m.game) { window.__gameModel = m; window.__gameHost = host; } return gp.apply(this, arguments); };
          Suite.game.__wrapped = gp;
          clearInterval(gameHook);
        }
      }, 5);
      // keep the app's own Home model as it paints, to repaint it in each state
      var hook = setInterval(function () {
        if (window.Suite && Suite.home && Suite.home.paint && !Suite.home.__wrapped) {
          var paint = Suite.home.paint;
          Suite.home.paint = function (host, m) { window.__homeModel = m; window.__homeHost = host; return paint.apply(this, arguments); };
          Suite.home.__wrapped = paint;
          clearInterval(hook);
        }
      }, 5);
    }, style);
    await page.route("**/*", async function (route) {
      var url = route.request().url(), body = responseFor(url);
      if (body) return route.fulfill({ status: 200, contentType: "application/json", body: body });
      if (url.startsWith(base)) return route.continue();
      if (/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(url)) return route.continue();
      if (process.env.ALLOW_PROVIDER_IMAGES && /^https:\/\/a\.espncdn\.com\//.test(url)) return route.continue();
      return route.abort();
    });
    var GAME = process.env.STAGE_SCREEN === "game";
    var OPP = process.env.STAGE_OPP ? process.env.STAGE_OPP.split(":") : null;
    var VENUE = process.env.STAGE_VENUE ? process.env.STAGE_VENUE.split(":") : null;
    await page.goto(base + "/?team=" + team + (GAME ? "#game" : "#home"));
    if (GAME) {
      await page.waitForFunction(function () { return !document.getElementById("launch") && window.__gameModel; }, null, { timeout: 20000 }).catch(function () {});
      // a real play-by-play for the live and final states (Purdue, from the fixtures)
      await page.evaluate(function () {
        var T = TeamOS.createTeam(TEAM_CONFIG.team);
        return Promise.all(["espn-summary-pur-live.json", "espn-summary-pur-final.json"].map(function (f) {
          return fetch("/tools/fixtures/" + f).then(function (r) { return r.json(); }).then(function (j) { return TeamOS.espn.gameDetail(j, T, TEAM_CONFIG); });
        })).then(function (d) { window.__liveDetail = d[0]; window.__finalDetail = d[1]; });
      }).catch(function (e) { console.log("  detail fixtures: " + e.message); });
    }
    if (!GAME) await page.waitForFunction(function () { return !document.getElementById("launch") && window.__homeModel && window.__homeModel.hero && window.__homeModel.hero.game; },
                                          null, { timeout: 20000 }).catch(function () {});
    var ready = await page.evaluate(function (G) { return G ? !!window.__gameModel : !!(window.__homeModel && window.__homeModel.hero && window.__homeModel.hero.game); }, GAME);
    if (!ready) { console.log("  " + team + " " + style + " " + width + ": no hero game; skipped"); await ctx.close(); continue; }
    for (var name of PICK) {
      var spec = STATES[name];
      if (GAME) await page.evaluate(function (a) {
        var m = window.__gameModel, base = new Date(a.fixtureNow).getTime();
        var g = Object.assign({}, m.game, { situation: null, detail: "" });
        if (a.opp) Object.assign(g, { oppProviderId: a.opp[0], oppName: a.opp[1], oppAbbr: a.opp[2], series: null });
        if (a.venue) Object.assign(g, { venue: a.venue[0], home: a.venue[1] === "home", neutral: a.venue[1] === "neutral",
                                        city: a.venue[2] || g.city, venueState: a.venue[3] || g.venueState });
        Object.keys(a.spec).forEach(function (k) { if (k !== "now" && k !== "date" && k !== "at") g[k] = a.spec[k]; });
        if (a.spec.date != null) g.date = new Date(base + a.spec.date).toISOString();
        if (a.spec.at) g.date = a.spec.at;
        if (a.spec.status !== "scheduled") g.odds = null;
        if (!g.usRank && a.name.indexOf("pre") === 0) g.usRank = 9;
        if (/live|halftime|overtime|end|delayed|suspended/.test(a.name)) g.state = "in";
        if (/final/.test(a.name)) g.state = "post";
        var lc = TeamOS.game.lifecycle(g);
        var detail = lc.phase === "pregame" ? m.detail : /final/.test(a.name) ? window.__finalDetail : window.__liveDetail;
        if (window.Suite.nav && Suite.nav.setGameState) Suite.nav.setGameState(/live|halftime|overtime|end/.test(a.name) ? "live" : a.name === "delayed" ? "delayed" : a.name === "suspended" ? "suspended" : null);
        window.__gameHost.__gameLast = {};
        Suite.game.__wrapped(window.__gameHost, Object.assign({}, m, { game: g, lifecycle: lc, view: lc.defaultView, detail: detail, now: new Date(base) }));
        window.scrollTo(0, 0);
      }, { spec: spec, name: name, fixtureNow: FIXTURE_NOW, opp: OPP, venue: VENUE });
      else await page.evaluate(function (a) {
        var m = window.__homeModel, base = new Date(a.fixtureNow).getTime();
        var g = Object.assign({}, m.hero.game, { situation: null, detail: "" });
        if (a.opp) Object.assign(g, { oppProviderId: a.opp[0], oppName: a.opp[1], oppAbbr: a.opp[2], series: null });
        if (a.venue) Object.assign(g, { venue: a.venue[0], home: a.venue[1] === "home", neutral: a.venue[1] === "neutral",
                                        city: a.venue[2] || g.city, venueState: a.venue[3] || g.venueState });
        Object.keys(a.spec).forEach(function (k) { if (k !== "now" && k !== "date" && k !== "at") g[k] = a.spec[k]; });
        if (a.spec.date != null) g.date = new Date(base + a.spec.date).toISOString();
        if (a.spec.at) g.date = a.spec.at;
        if (a.spec.status !== "scheduled") g.odds = null;
        if (!g.usRank && a.name.indexOf("pre") === 0) g.usRank = 9;
        var m2 = Object.assign({}, m, { now: new Date(base), hero: Object.assign({}, m.hero, { game: g }) });
        // the same hero for the live nav: what the header shows while the game is on
        if (window.Suite.nav && Suite.nav.setGameState) Suite.nav.setGameState(/live|halftime|overtime|end/.test(a.name) ? "live" : a.name === "delayed" ? "delayed" : a.name === "suspended" ? "suspended" : null);
        Suite.home.__wrapped(window.__homeHost, m2);
        window.scrollTo(0, 0);
      }, { spec: spec, name: name, fixtureNow: FIXTURE_NOW, opp: OPP, venue: VENUE });
      await page.waitForTimeout(150);
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
