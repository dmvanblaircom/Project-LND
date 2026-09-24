#!/usr/bin/env node
/* Browser checks for the Suite: layout, keyboard and accessibility, measured
   in a real browser against what is actually painted.

   Provider requests are fulfilled from the adapter fixtures kept in this
   repository, so every run renders the same data. Every state a fan can
   reach without live data is visited: the chooser, and each of the five
   tabs for both configured teams, at a phone width and a desktop width.

   In each state:
     - no horizontal overflow;
     - every piece of visible text reaches WCAG AA contrast against the
       pixels actually behind it (tools/a11yaudit.js);
     - every keyboard focus stop shows a ring that is really painted and
       reaches 3:1 against what surrounds it;
     - on team pages: the five nav destinations, which header each screen
       wears, focus after navigating, Back, the live Game circle (and its
       reduced-motion form), and More's team, Refresh and Change team.

   The auditor proves itself first on a page whose answers are known. If it
   cannot, nothing else runs, because a gate that cannot see is worse than
   no gate: it is what let the vNext release through green.

   Screenshots of every state are written to artifacts/visual for a human.
   They are evidence, not a verdict. Visual approval stays a person's call.

   Usage:  node tools/visualcheck.js
   Locally, with a globally installed Playwright:
     NODE_PATH=$(npm root -g) PW_CHROMIUM=/path/to/chromium node tools/visualcheck.js */
"use strict";

var fs = require("fs"), http = require("http"), path = require("path");
var chromium = require("playwright").chromium;
var audit = require("./a11yaudit.js");

var root = path.join(__dirname, "..");
var shots = path.join(root, "artifacts", "visual");
fs.mkdirSync(shots, { recursive: true });

var fixtures = {
  schedule: "espn-schedule.json", scoreboard: "espn-scoreboard.json",
  rankings: "espn-rankings.json", roster: "espn-roster.json",
  news: "espn-news.json", team: "espn-team.json", summary: "espn-summary-pre.json",
  statistics: "espn-season-stats.json"
};
function fixture(name) { return fs.readFileSync(path.join(root, "tools", "fixtures", fixtures[name])); }
function mime(file) {
  return file.endsWith(".html") ? "text/html" : file.endsWith(".css") ? "text/css" :
    file.endsWith(".js") ? "text/javascript" : file.endsWith(".json") ? "application/json" :
    file.endsWith(".svg") ? "image/svg+xml" : file.endsWith(".png") ? "image/png" : "application/octet-stream";
}
var server = http.createServer(function (req, res) {
  var pathname = new URL(req.url, "http://localhost").pathname;
  var file = path.join(root, pathname === "/" ? "index.html" : pathname.slice(1));
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end("not found"); return;
  }
  res.writeHead(200, { "content-type": mime(file), "cache-control": "no-store" });
  fs.createReadStream(file).pipe(res);
});

function responseFor(url) {
  if (/\/schedule(?:\?|$)/.test(url)) return fixture("schedule");
  if (/\/scoreboard\?/.test(url)) return fixture("scoreboard");
  if (/\/rankings(?:\?|$)/.test(url)) return fixture("rankings");
  if (/\/roster(?:\?|$)/.test(url)) return fixture("roster");
  if (/\/news\?/.test(url)) return fixture("news");
  if (/\/summary\?/.test(url)) return fixture("summary");
  if (/\/statistics(?:\?|$)/.test(url)) return fixture("statistics");
  if (/\/teams\/\d+(?:\?|$)/.test(url)) return fixture("team");
  return null;
}

var TEAMS = ["notre-dame", "ohio-state"];
// Every screen a fan can reach, by route. The first five are the primary nav;
// Schedule is reached from Home and More (decision 0023).
var SCREENS = ["home", "top25", "game", "roster", "more", "schedule"];
var NAV = ["home", "top25", "game", "roster", "more"];
var MASTHEAD = { top25: "Top 25", roster: "Roster", more: "More", schedule: "Schedule" };
var WIDTHS = [375, 1280];

(async function () {
  await new Promise(function (resolve) { server.listen(0, "127.0.0.1", resolve); });
  var base = "http://127.0.0.1:" + server.address().port;
  var browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined });
  var failures = [], summary = [], unassessed = {};

  function fail(label, kind, sel, detail) { failures.push({ label: label, kind: kind, sel: sel, detail: detail }); }

  // A full-length screenshot that shows the page as a fan scrolling it sees.
  // Playwright's fullPage mode keeps fixed elements where they sat in the
  // original viewport, which paints the bottom tab bar across the middle of
  // the schedule - a picture of a bug that does not exist. Growing the
  // viewport to the document keeps fixed elements at the true bottom.
  async function fullShot(page, file) {
    var vp = page.viewportSize();
    var h = await page.evaluate(function () { return document.documentElement.scrollHeight; });
    await page.setViewportSize({ width: vp.width, height: Math.min(7000, Math.max(vp.height, h)) });
    await page.waitForTimeout(120);
    await page.screenshot({ path: file });
    await page.setViewportSize(vp);
    await page.waitForTimeout(80);
  }

  async function openContext(width) {
    var context = await browser.newContext({ viewport: { width: width, height: 900 }, serviceWorkers: "block" });
    var page = await context.newPage();
    await page.route("**/*", async function (route) {
      var url = route.request().url();
      var body = responseFor(url);
      if (body) return route.fulfill({ status: 200, contentType: "application/json", body: body });
      if (url.startsWith(base)) return route.continue();
      // The Suite's typefaces, so screenshots are the design and not a system
      // fallback. Provider-hosted team marks only where asked for (CI can
      // reach them; a development sandbox may not, and then the fallback
      // initials are what is measured - also a real state).
      if (/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(url)) return route.continue();
      if (process.env.ALLOW_PROVIDER_IMAGES && /^https:\/\/a\.espncdn\.com\/i\/teamlogos\//.test(url)) return route.continue();
      return route.abort();
    });
    return { context: context, page: page };
  }

  async function checkState(page, label) {
    var overflow = await page.evaluate(function () {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    if (overflow) fail(label, "layout", "document", "horizontal overflow");
    var t = await audit.auditText(page, label);
    var f = await audit.auditFocus(page, label);
    failures = failures.concat(t.failures, f.failures);
    (t.skipped || []).forEach(function (x) { unassessed[x] = (unassessed[x] || 0) + 1; });
    summary.push(label + ": " + t.checked + " text checked" + (t.unassessed ? ", " + t.unassessed + " unassessed" : "") +
                 ", " + f.stops + " focus stops" + (f.unverified.length ? ", " + f.unverified.length + " ring(s) by box-shadow, unverified" : ""));
  }

  try {
    // 1. The auditor proves itself.
    var st = await audit.selfTest(browser);
    if (!st.ok) {
      console.error("The accessibility auditor failed its own self-test, so nothing it says can be trusted:");
      st.problems.forEach(function (p) { console.error("  " + p); });
      process.exitCode = 1;
      return;
    }
    console.log("auditor self-test passed");

    for (var wi = 0; wi < WIDTHS.length; wi++) {
      var width = WIDTHS[wi];

      // 2. The chooser: a first visit, no team, nothing stored.
      var c = await openContext(width);
      await c.page.goto(base + "/", { waitUntil: "domcontentloaded" });
      await c.page.waitForSelector(".chooser", { timeout: 10000 });
      await c.page.waitForTimeout(300);
      await fullShot(c.page, path.join(shots, "chooser-" + width + ".png"));
      await checkState(c.page, "chooser " + width + "px");
      var ch = await c.page.evaluate(function () {
        return { nav: !!document.querySelector(".navbar"), mast: !!document.getElementById("masthead"),
                 bar: !!document.getElementById("appBar") && !document.getElementById("appBar").hidden,
                 picks: document.querySelectorAll(".pick").length,
                 soonFocusable: document.querySelectorAll(".soon a, .soon button, .soon [tabindex]").length,
                 marks: document.querySelectorAll(".pick .mark").length };
      });
      var cw = "chooser " + width + "px";
      if (ch.nav) fail(cw, "behaviour", ".navbar", "the chooser shows a bottom nav with no team behind it");
      if (ch.mast) fail(cw, "behaviour", "#masthead", "the chooser shows a team masthead before a team is chosen");
      if (!ch.bar) fail(cw, "behaviour", "#appBar", "the chooser lost the Suite header");
      if (ch.picks < 2) fail(cw, "behaviour", ".pick", "fewer than two openable teams are offered");
      if (ch.marks !== ch.picks) fail(cw, "behaviour", ".pick .mark", "an openable team is drawn without its mark");
      if (ch.soonFocusable) fail(cw, "behaviour", ".soon", "a Coming Soon card is focusable");
      await c.page.click("#barSearch");
      if (await c.page.evaluate(function () { return document.activeElement && document.activeElement.id; }) !== "teamSearch")
        fail(cw, "behaviour", "#barSearch", "the header's search control does not take the fan to the search box");
      await c.context.close();

      // 3. Each team, each tab.
      for (var ti = 0; ti < TEAMS.length; ti++) {
        var team = TEAMS[ti];
        var s = await openContext(width);
        var page = s.page;
        await page.goto(base + "/?team=" + team, { waitUntil: "domcontentloaded" });
        await page.waitForFunction(function () {
          var p = document.getElementById("panel-schedule");
          return p && p.textContent.trim().length > 0 && !/^Loading/.test(p.textContent.trim());
        }, null, { timeout: 10000 });
        await page.waitForTimeout(300);

        var who = team + " " + width + "px";

        // The primary nav: five destinations, in the approved order, with the
        // approved labels, never touching the device's bottom edge.
        var nav = await page.evaluate(function () {
          var n = document.querySelector(".navbar");
          var cs = getComputedStyle(n);
          return { labels: [].slice.call(n.querySelectorAll(".nav-item")).map(function (a) { return a.textContent.trim(); }),
                   pad: parseFloat(cs.paddingBottom) };
        });
        if (nav.labels.join("|") !== "Home|Top 25|Game|Roster|More")
          fail(who, "behaviour", ".navbar", "nav reads " + nav.labels.join(" / ") + ", not Home / Top 25 / Game / Roster / More");
        if (nav.pad < 8) fail(who, "layout", ".navbar", "nav sits on the bottom edge (" + nav.pad + "px padding)");

        for (var k = 0; k < SCREENS.length; k++) {
          var screen = SCREENS[k];
          if (NAV.indexOf(screen) !== -1) await page.click('.nav-item[data-screen="' + screen + '"]');
          else await page.evaluate(function (h) { location.hash = h; }, "#" + screen);
          await page.waitForTimeout(350);
          var label = team + " " + screen + " " + width + "px";
          var st = await page.evaluate(function () {
            var cur = document.querySelector('.nav-item[aria-current="page"]');
            var mast = document.getElementById("masthead"), bar = document.getElementById("appBar");
            return { hash: location.hash, current: cur ? cur.getAttribute("data-screen") : null,
                     mast: !mast.hidden, bar: !bar.hidden,
                     title: document.getElementById("mastTitle").textContent,
                     name: document.getElementById("mastName").textContent,
                     focus: document.activeElement ? document.activeElement.id : null };
          });
          if (st.hash !== "#" + screen) fail(label, "behaviour", "route", "route is " + st.hash);
          var wantCur = NAV.indexOf(screen) !== -1 ? screen : null;
          if (st.current !== wantCur) fail(label, "behaviour", ".navbar", "current nav item is " + st.current + ", expected " + wantCur);
          if (MASTHEAD[screen]) {
            if (!st.mast || st.bar) fail(label, "behaviour", "#masthead", "this screen should wear the team masthead, not the SUITE header");
            if (st.title !== MASTHEAD[screen]) fail(label, "behaviour", "#mastTitle", "masthead title reads '" + st.title + "'");
            if (!st.name) fail(label, "behaviour", "#mastName", "the masthead does not name the team");
          } else if (st.mast || !st.bar) {
            fail(label, "behaviour", "#appBar", "this screen should wear the compact SUITE header");
          }
          if (k > 0 && st.focus !== (MASTHEAD[screen] ? "mastTitle" : "screenHead"))
            fail(label, "behaviour", "focus", "after navigating, focus is on '" + st.focus + "', not the screen's heading");
          await fullShot(page, path.join(shots, team + "-" + width + "-" + screen + ".png"));
          await checkState(page, label);
          if (screen === "more") {
            var more = await page.evaluate(function () {
              var b = document.getElementById("changeTeam"), t = document.getElementById("moreTeam");
              var r = document.getElementById("refresh");
              return { team: t ? t.textContent.trim() : "", button: !!b && b.checkVisibility(),
                       refresh: !!r && r.checkVisibility(),
                       news: document.getElementById("panel-news").textContent.trim().length };
            });
            if (!more.team) fail(who, "behaviour", "#moreTeam", "More does not say which team is being followed");
            if (!more.button) fail(who, "behaviour", "#changeTeam", "Change team is missing from More: it is the only way to change team in the app");
            if (!more.refresh) fail(who, "behaviour", "#refresh", "Refresh is missing from More");
            if (!more.news) fail(who, "behaviour", "#panel-news", "News did not load under More");
          }
        }

        // Back walks the routes, and a route is restorable from the URL alone.
        await page.evaluate(function () { location.hash = "#top25"; });
        await page.waitForTimeout(150);
        await page.evaluate(function () { location.hash = "#more"; });
        await page.waitForTimeout(150);
        await page.goBack();
        await page.waitForTimeout(250);
        var back = await page.evaluate(function () {
          var cur = document.querySelector('.nav-item[aria-current="page"]');
          return { hash: location.hash, cur: cur && cur.getAttribute("data-screen"), panel: !document.getElementById("panel-around").hidden };
        });
        if (back.hash !== "#top25" || back.cur !== "top25" || !back.panel)
          fail(who, "behaviour", "history", "Back from More did not return to Top 25 (" + JSON.stringify(back) + ")");

        // A deep link opens its screen directly.
        await page.goto(base + "/?team=" + team + "#roster", { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(600);
        var deep = await page.evaluate(function () {
          return { panel: !document.getElementById("panel-depth").hidden,
                   title: document.getElementById("mastTitle").textContent };
        });
        if (!deep.panel || deep.title !== "Roster") fail(who, "behaviour", "route", "a deep link to #roster did not open Roster");

        // The live Game control: the raised circle, higher than its row, with
        // the live light inside it - pulsing, unless reduced motion is asked.
        await page.evaluate(function () { location.hash = "#home"; Suite.nav.setLive(true); });
        await page.waitForTimeout(250);
        var live = await page.evaluate(function () {
          var g = document.querySelector(".nav-game").getBoundingClientRect();
          var h = document.querySelector('.nav-item[data-screen="home"]').getBoundingClientRect();
          var n = document.querySelector(".navbar").getBoundingClientRect();
          var d = document.querySelector(".nav-game .nav-live"), dr = d.getBoundingClientRect();
          return { round: Math.abs(g.width - g.height) < 1, raised: g.top < h.top - 8, aboveBar: g.top < n.top,
                   inside: dr.left >= g.left && dr.right <= g.right && dr.top >= g.top && dr.bottom <= g.bottom,
                   anim: getComputedStyle(d).animationName, edge: window.innerHeight - g.bottom,
                   sr: document.getElementById("navLive").textContent };
        });
        if (!live.round || !live.raised || !live.aboveBar) fail(who, "behaviour", ".nav-game", "live Game is not the raised circle (" + JSON.stringify(live) + ")");
        if (!live.inside) fail(who, "behaviour", ".nav-live", "the live light is not inside the Game circle");
        if (live.anim === "none") fail(who, "behaviour", ".nav-live", "the live light does not pulse");
        if (live.edge < 8) fail(who, "layout", ".nav-game", "the live Game circle touches the bottom edge");
        if (!/live/.test(live.sr)) fail(who, "behaviour", "#navLive", "the live state is not announced to assistive technology");
        await fullShot(page, path.join(shots, team + "-" + width + "-home-livenav.png"));
        await checkState(page, team + " live-nav " + width + "px");
        await page.emulateMedia({ reducedMotion: "reduce" });
        var still = await page.evaluate(function () {
          var d = document.querySelector(".nav-game .nav-live");
          return { anim: getComputedStyle(d).animationName, shown: d.checkVisibility() };
        });
        if (still.anim !== "none" || !still.shown) fail(who, "behaviour", ".nav-live", "with reduced motion the live light should stay, without pulsing");
        await page.emulateMedia({ reducedMotion: "no-preference" });
        await page.evaluate(function () { Suite.nav.setLive(false); });

        // Change team (decision 0022 #7): the chooser opens in its change
        // mode, the current team stays stored, Cancel goes back to it, and
        // picking another team switches immediately.
        if (await page.$("#changeTeam")) {
          await page.click('.nav-item[data-screen="more"]');
          await page.click("#changeTeam");
          try {
            await page.waitForSelector(".chooser", { timeout: 10000 });
            var ct = await page.evaluate(function () {
              return { stored: localStorage.getItem("iw-team"), cancel: !!document.getElementById("cancelChange"),
                       nav: !!document.querySelector(".navbar") };
            });
            if (ct.stored !== team) fail(who, "behaviour", "#changeTeam", "opening Change team forgot the current team (stored: " + ct.stored + ")");
            if (!ct.cancel) fail(who, "behaviour", "#cancelChange", "Change team offers no way back to the current team");
            if (ct.nav) fail(who, "behaviour", ".navbar", "the chooser shows the bottom nav");
            await fullShot(page, path.join(shots, team + "-" + width + "-change-team.png"));
            await checkState(page, team + " change-team " + width + "px");
            await page.click("#cancelChange");
            await page.waitForSelector("#navbar", { timeout: 10000 });
            var back2 = await page.evaluate(function () {
              return { team: document.documentElement.getAttribute("data-team"), stored: localStorage.getItem("iw-team") };
            });
            if (back2.team !== team || back2.stored !== team) fail(who, "behaviour", "#cancelChange", "Cancel did not return to " + team + " unchanged (" + JSON.stringify(back2) + ")");
            // And picking another team switches straight to it.
            var other = TEAMS.filter(function (t) { return t !== team; })[0];
            await page.goto(base + "/?change", { waitUntil: "domcontentloaded" });
            await page.waitForSelector(".chooser", { timeout: 10000 });
            await page.click('.pick[data-team="' + other + '"]');
            await page.waitForFunction(function (o) { return document.documentElement.getAttribute("data-team") === o; }, other, { timeout: 10000 });
            if (await page.evaluate(function () { return localStorage.getItem("iw-team"); }) !== other)
              fail(who, "behaviour", ".pick", "picking " + other + " did not switch to it");
          } catch (e) {
            fail(who, "behaviour", "#changeTeam", "Change team flow broke: " + String(e.message || e).split("\n")[0]);
          }
        }
        await s.context.close();
      }
    }
  } finally {
    await browser.close();
    server.close();
  }

  summary.forEach(function (x) { console.log("  " + x); });
  // What could not be measured is reported by name, never silently dropped.
  var gaps = Object.keys(unassessed);
  if (gaps.length) {
    console.log("\nCould not be measured (no single background colour behind the text):");
    gaps.forEach(function (k) { console.log("  " + k + " - in " + unassessed[k] + " state(s)"); });
  }
  if (!failures.length) {
    console.log("\nSuite visual checks passed: contrast, focus and layout in every state. Screenshots: " + shots);
    return;
  }

  // Group identical problems across states so the report reads as a list of
  // defects rather than hundreds of repeats of the same one.
  var groups = {};
  var example = {};
  failures.forEach(function (x) {
    var k = x.kind + " | " + x.sel + " | " + x.detail;
    (groups[k] = groups[k] || []).push(x.label);
    if (x.text && !example[k]) example[k] = x.text;
  });
  var keys = Object.keys(groups).sort();
  console.error("\n" + failures.length + " failure(s), " + keys.length + " distinct:");
  keys.forEach(function (k) {
    var where = groups[k];
    console.error("  FAIL " + k + (example[k] ? '  e.g. "' + example[k] + '"' : "") +
                  "\n       in " + where.length + " state(s): " +
                  where.slice(0, 4).join(", ") + (where.length > 4 ? ", ..." : ""));
  });
  process.exitCode = 1;
})().catch(function (e) { console.error(e.stack || e); server.close(); process.exit(1); });
