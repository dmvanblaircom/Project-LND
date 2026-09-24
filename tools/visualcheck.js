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
var MASTHEAD = { roster: "Roster", more: "More", schedule: "Schedule" };
// National screens: the SUITE bar with the team as context, and a visible
// neutral heading (decision 0024 §6).
var CONTEXT = { top25: "Top 25" };
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
            var ctx = document.getElementById("barContext"), sh = document.getElementById("screenHead");
            return { hash: location.hash, current: cur ? cur.getAttribute("data-screen") : null,
                     mast: !mast.hidden, bar: !bar.hidden,
                     ctx: ctx && ctx.checkVisibility() ? document.getElementById("barTeam").textContent : null,
                     ctxControl: !!(ctx && ctx.closest("a,button")) || !!(ctx && ctx.querySelector("a,button")),
                     heading: sh && sh.checkVisibility() && !sh.classList.contains("sr-only") ? sh.textContent : null,
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
          if (CONTEXT[screen]) {
            if (!st.ctx) fail(label, "behaviour", "#barContext", "a national screen should carry the selected team as context in the SUITE bar");
            if (st.ctxControl) fail(label, "behaviour", "#barContext", "the team context is a control; Change Team lives in Settings");
            if (st.heading !== CONTEXT[screen]) fail(label, "behaviour", "#screenHead", "the visible page heading reads '" + st.heading + "', not '" + CONTEXT[screen] + "'");
          } else {
            if (st.ctx) fail(label, "behaviour", "#barContext", "team context shows on a screen that is not national content");
            if (!MASTHEAD[screen] && st.heading) fail(label, "behaviour", "#screenHead", "a compact-header screen shows a visible page heading");
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

        // Top 25 opens on Games; a deep link to Rankings opens Rankings; a
        // view Top 25 does not have is corrected in place (decision 0024 §5, §15).
        await page.evaluate(function () { location.hash = "#top25"; });
        await page.waitForTimeout(300);
        var t25 = await page.evaluate(function () {
          var pressed = document.querySelector('#panel-around .seg.pills:not(.polls) button[aria-pressed="true"]');
          return { view: Suite.nav.current().view, hash: location.hash, pressed: pressed ? pressed.dataset.view : null };
        });
        if (t25.view !== "games" || t25.hash !== "#top25") fail(who, "behaviour", "route", "#top25 did not open Games (" + JSON.stringify(t25) + ")");
        if (t25.pressed && t25.pressed !== "games") fail(who, "behaviour", "#panel-around", "#top25 shows " + t25.pressed);
        await page.evaluate(function () { location.hash = "#top25/rankings"; });
        await page.waitForTimeout(300);
        var t25r = await page.evaluate(function () {
          var pressed = document.querySelector('#panel-around .seg.pills:not(.polls) button[aria-pressed="true"]');
          var r = document.getElementById("ar-rankings");
          return { view: Suite.nav.current().view, hash: location.hash, pressed: pressed ? pressed.dataset.view : null,
                   shown: r ? !r.hidden : null };
        });
        if (t25r.view !== "rankings" || t25r.hash !== "#top25/rankings")
          fail(who, "behaviour", "route", "a deep link to Rankings was not respected (" + JSON.stringify(t25r) + ")");
        if (t25r.pressed && (t25r.pressed !== "rankings" || !t25r.shown))
          fail(who, "behaviour", "#panel-around", "#top25/rankings does not show Rankings (" + JSON.stringify(t25r) + ")");
        var bogus = await page.evaluate(function () {
          var before = history.length;
          location.hash = "#top25/bogus";
          return new Promise(function (res) { setTimeout(function () {
            res({ hash: location.hash, added: history.length - before, said: document.getElementById("live").textContent });
          }, 250); });
        });
        if (bogus.hash !== "#top25/games" || bogus.added !== 1 || !/Games/.test(bogus.said))
          fail(who, "behaviour", "route", "an invalid Top 25 view was not replaced with Games in place (" + JSON.stringify(bogus) + ")");

        // Game's views change with its lifecycle. A view that survives is
        // kept; one that does not moves to the new default by REPLACING the
        // history entry - no reload, no trip Home, announced (decision 0024 §15).
        var LIVE_VIEWS = [{ id: "drive", label: "Drive Tracker" }, { id: "box", label: "Box Score" },
                          { id: "plays", label: "Plays" }, { id: "stats", label: "Stats" }];
        var FINAL_VIEWS = [{ id: "box", label: "Box Score" }, { id: "plays", label: "Plays" }, { id: "stats", label: "Stats" }];
        var life = await page.evaluate(function (v) {
          window.__noReload = 1;
          Suite.nav.setViews("game", v.live);
          location.hash = "#game/drive";
          return new Promise(function (res) { setTimeout(function () {
            var before = history.length, onDrive = location.hash;
            Suite.nav.setViews("game", v.fin, "Final.");
            var gone = { was: onDrive, hash: location.hash, added: history.length - before, alive: window.__noReload === 1,
                         said: document.getElementById("live").textContent,
                         cur: (document.querySelector('.nav-item[aria-current="page"]') || {}).dataset };
            Suite.nav.setViews("game", v.live);
            location.hash = "#game/stats";
            setTimeout(function () {
              Suite.nav.setViews("game", v.fin, "Final.");
              var kept = { hash: location.hash };
              location.hash = "#game/tickets";
              setTimeout(function () {
                var dead = { hash: location.hash };
                Suite.nav.setViews("game", null);
                res({ gone: gone, kept: kept, dead: dead });
              }, 250);
            }, 250);
          }, 250); });
        }, { live: LIVE_VIEWS, fin: FINAL_VIEWS });
        if (life.gone.was !== "#game/drive" || life.gone.hash !== "#game/box" || life.gone.added !== 0 || !life.gone.alive)
          fail(who, "behaviour", "route", "live Drive Tracker going final did not replace the route with Box Score in place (" + JSON.stringify(life.gone) + ")");
        if (!/Final\. Showing Box Score/.test(life.gone.said))
          fail(who, "behaviour", "#live", "the lifecycle correction was not announced (" + life.gone.said + ")");
        if (!life.gone.cur || life.gone.cur.screen !== "game") fail(who, "behaviour", "route", "the lifecycle correction left Game");
        if (life.kept.hash !== "#game/stats") fail(who, "behaviour", "route", "live Stats going final did not stay on Stats (" + life.kept.hash + ")");
        if (life.dead.hash !== "#game/box") fail(who, "behaviour", "route", "an invalid Game view was not replaced with the lifecycle default (" + life.dead.hash + ")");

        // The Game control (decision 0024 §1, §14). Raised means a game is
        // under way; it is never the selected cue. On Home during a live
        // game Home is selected and Game is live; on Game, both.
        function navState() {
          var g = document.querySelector(".nav-game"), gr = g.getBoundingClientRect();
          var h = document.querySelector('.nav-item[data-screen="home"]'), hr = h.getBoundingClientRect();
          var n = document.querySelector(".navbar").getBoundingClientRect();
          var d = document.querySelector(".nav-game .nav-live"), dr = d.getBoundingClientRect();
          function bar(el) {
            var a = getComputedStyle(el, "::after");
            return a.content !== "none" && a.display !== "none" && parseFloat(a.width) > 8 && parseFloat(a.height) >= 3
              ? a.backgroundColor : null;
          }
          return { round: Math.abs(gr.width - gr.height) < 1, raised: gr.top < hr.top - 8, aboveBar: gr.top < n.top,
                   inside: dr.left >= gr.left && dr.right <= gr.right && dr.top >= gr.top && dr.bottom <= gr.bottom,
                   dot: d.checkVisibility(), anim: getComputedStyle(d).animationName, edge: window.innerHeight - gr.bottom,
                   sr: document.getElementById("navLive").textContent,
                   homeCur: h.getAttribute("aria-current"), gameCur: g.getAttribute("aria-current"),
                   homeBar: bar(h), gameBar: bar(g) };
        }
        await page.evaluate(function () { location.hash = "#home"; Suite.nav.setGameState("live"); });
        await page.waitForTimeout(250);
        var live = await page.evaluate(navState);
        if (!live.round || !live.raised || !live.aboveBar) fail(who, "behaviour", ".nav-game", "live Game is not the raised circle (" + JSON.stringify(live) + ")");
        if (!live.inside) fail(who, "behaviour", ".nav-live", "the live light is not inside the Game circle");
        if (live.anim === "none") fail(who, "behaviour", ".nav-live", "the live light does not pulse");
        if (live.edge < 8) fail(who, "layout", ".nav-game", "the live Game circle touches the bottom edge");
        if (live.sr !== ", live now") fail(who, "behaviour", "#navLive", "the live state is not announced as 'live now'");
        if (live.homeCur !== "page" || !live.homeBar) fail(who, "behaviour", ".nav-item", "on Home during a live game, Home has lost its selected state");
        if (live.gameCur) fail(who, "behaviour", ".nav-game", "on Home, the live Game control claims to be the current page");
        await fullShot(page, path.join(shots, team + "-" + width + "-home-livenav.png"));
        await checkState(page, team + " live-nav home " + width + "px");

        await page.evaluate(function () { location.hash = "#game"; });
        await page.waitForTimeout(300);
        var onGame = await page.evaluate(navState);
        if (onGame.gameCur !== "page" || !onGame.gameBar)
          fail(who, "behaviour", ".nav-game", "on Game during a live game, the raised circle is the only selected cue (" + JSON.stringify(onGame) + ")");
        if (onGame.homeCur || onGame.homeBar) fail(who, "behaviour", ".nav-item", "Home still reads as selected on Game");
        if (onGame.anim === "none" || onGame.sr !== ", live now") fail(who, "behaviour", ".nav-live", "selected Game lost its live state");
        await fullShot(page, path.join(shots, team + "-" + width + "-game-livenav.png"));
        await checkState(page, team + " live-nav game " + width + "px");

        // Paused after play began: raised, still, and saying which.
        for (var ps of ["delayed", "suspended"]) {
          await page.evaluate(function (x) { location.hash = "#home"; Suite.nav.setGameState(x); }, ps);
          await page.waitForTimeout(200);
          var paused = await page.evaluate(navState);
          if (!paused.raised) fail(who, "behaviour", ".nav-game", ps + " after kickoff should keep Game raised");
          if (paused.anim !== "none") fail(who, "behaviour", ".nav-live", ps + " must not pulse: play is not happening");
          if (paused.sr !== ", " + ps) fail(who, "behaviour", "#navLive", "the " + ps + " state is announced as '" + paused.sr + "'");
          if (!paused.dot || !paused.inside) fail(who, "behaviour", ".nav-live", ps + " shows no still pause mark in the circle");
          if (ps === "suspended") {
            await fullShot(page, path.join(shots, team + "-" + width + "-home-suspendednav.png"));
            await checkState(page, team + " suspended-nav " + width + "px");
          }
        }
        // Not under way - pregame delay, postponed, canceled, or no game: a normal item.
        await page.evaluate(function () { Suite.nav.setGameState(null); });
        await page.waitForTimeout(150);
        var calm = await page.evaluate(navState);
        if (calm.raised || calm.dot || calm.sr) fail(who, "behaviour", ".nav-game", "with no game under way Game should be a normal item (" + JSON.stringify(calm) + ")");

        await page.evaluate(function () { Suite.nav.setGameState("live"); });
        await page.emulateMedia({ reducedMotion: "reduce" });
        var still = await page.evaluate(function () {
          var d = document.querySelector(".nav-game .nav-live");
          return { anim: getComputedStyle(d).animationName, shown: d.checkVisibility() };
        });
        if (still.anim !== "none" || !still.shown) fail(who, "behaviour", ".nav-live", "with reduced motion the live light should stay, without pulsing");
        await page.emulateMedia({ reducedMotion: "no-preference" });
        await page.evaluate(function () { Suite.nav.setGameState(null); });

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
