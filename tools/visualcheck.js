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

// The polls and the scoreboard are one real football week (captured on the
// runner): the Sep 26 slate, ranked by the Sep 20 polls it was played under.
// Review renders tell one story, so the national screens do too.
var fixtures = {
  schedule: "espn-schedule.json", scoreboard: "espn-scoreboard-sep26.json",
  rankings: "espn-rankings-sep20.json", roster: "espn-roster.json",
  news: "espn-news.json", team: "espn-team.json", summary: "espn-summary-pre.json",
  statistics: "espn-season-stats.json"
};
var ROSTERS = { "87": "espn-roster-nd-sep24.json", "194": "espn-roster-osu-sep24.json" };
var NEWS = { "87": "espn-news-nd-sep24.json", "194": "espn-news-osu-sep24.json" };
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
  // The postseason: a real empty answer, as ESPN gives in September.
  if (/\/schedule\?seasontype=3/.test(url)) return fs.readFileSync(path.join(root, "tools", "fixtures", "espn-schedule-nd-2025-post.json"));
  if (/\/schedule(?:\?|$)/.test(url)) return fixture("schedule");
  if (/\/scoreboard\?/.test(url)) return fixture("scoreboard");
  if (/\/rankings(?:\?|$)/.test(url)) return fixture("rankings");
  // Each team's own real roster (captured on the runner), so a render of a
  // team's Roster shows that team's players; any other team, the trimmed one.
  var ro = /\/teams\/(\d+)\/roster(?:\?|$)/.exec(url);
  if (ro) return fs.readFileSync(path.join(root, "tools", "fixtures",
    ROSTERS[ro[1]] || fixtures.roster));
  if (/\/roster(?:\?|$)/.test(url)) return fixture("roster");
  // Each team's own real news feed, where one has been captured.
  var nw = /\/news\?team=(\d+)/.exec(url);
  if (nw && NEWS[nw[1]] && fs.existsSync(path.join(root, "tools", "fixtures", NEWS[nw[1]])))
    return fs.readFileSync(path.join(root, "tools", "fixtures", NEWS[nw[1]]));
  if (/\/news\?/.test(url)) return fixture("news");
  if (/\/summary\?/.test(url)) return fixture("summary");
  if (/\/statistics(?:\?|$)/.test(url)) return fixture("statistics");
  if (/\/teams\/\d+(?:\?|$)/.test(url)) return fixture("team");
  return null;
}

var TEAMS = ["notre-dame", "ohio-state"];
// Every screen a fan can reach, by route. The first five are the primary nav;
// Schedule is reached from Home and More (decision 0023).
var SCREENS = ["home", "top25", "game", "roster", "more", "schedule", "news", "settings", "feedback", "about"];
var NAV = ["home", "top25", "game", "roster", "more"];
var OWNER = { schedule: "more", news: "more", settings: "more", feedback: "more", about: "more" };
var MASTHEAD = { roster: "Roster", more: "More", schedule: "Schedule", news: "News", settings: "Settings",
                 feedback: "Feedback", about: "About Suite" };
// National screens: the SUITE bar with the team as context, and a visible
// neutral heading (decision 0024 §6).
var CONTEXT = { top25: "Top 25" };
// VISUAL_WIDTHS="375,390,1280" adds the canonical 390px review width.
var WIDTHS = (process.env.VISUAL_WIDTHS || "375,1280").split(",").map(Number).filter(Boolean);

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
    // A fan's clock, not the runner's: kickoffs read in Eastern time and a
    // 9 PM game stays on Saturday, as the review renders show them.
    var context = await browser.newContext({ viewport: { width: width, height: 900 }, serviceWorkers: "block",
                                             timezoneId: "America/New_York", locale: "en-US" });
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
      // Team marks and player headshots (decision 0029) are provider-hosted.
      if (process.env.ALLOW_PROVIDER_IMAGES && /^https:\/\/a\.espncdn\.com\/i\/(teamlogos|headshots)\//.test(url)) return route.continue();
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
      // The placeholder is fitted to the width; the label always says it all.
      var ph = await c.page.evaluate(function () {
        var i = document.getElementById("teamSearch"), l = document.querySelector('label[for="teamSearch"]');
        return { ph: i.getAttribute("placeholder"), label: l ? l.textContent : "",
                 clipped: i.scrollWidth > i.clientWidth + 1 };
      });
      if (!/conference/.test(ph.label) || !/mascot/.test(ph.label))
        fail(cw, "behaviour", "label[for=teamSearch]", "the search label no longer says team, conference and mascot are searchable");
      if (width <= 384 && ph.ph !== "Search teams\u2026")
        fail(cw, "layout", "#teamSearch", "a narrow phone shows the long placeholder, which clips: '" + ph.ph + "'");
      if (width > 384 && !/conference/.test(ph.ph))
        fail(cw, "behaviour", "#teamSearch", "a wide screen lost the full placeholder: '" + ph.ph + "'");
      await c.context.close();

      // 3. Each team, each tab.
      for (var ti = 0; ti < TEAMS.length; ti++) {
        var team = TEAMS[ti];
        var s = await openContext(width);
        var page = s.page;
        await page.goto(base + "/?team=" + team, { waitUntil: "domcontentloaded" });
        // The team's schedule has arrived when Home draws its schedule rows.
        await page.waitForFunction(function () {
          return document.querySelectorAll("#screenHome .sched-row").length > 0;
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
          // A secondary destination keeps the primary item that owns it
          // selected: Schedule is More's (decision 0028).
          var wantCur = NAV.indexOf(screen) !== -1 ? screen : OWNER[screen] || null;
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
          if (screen === "top25") {
            // Rankings is a view of its own: contrast, focus and layout too.
            await page.evaluate(function () { location.hash = "#top25/rankings"; });
            await page.waitForTimeout(350);
            await fullShot(page, path.join(shots, team + "-" + width + "-top25-rankings.png"));
            await checkState(page, team + " top25 rankings " + width + "px");
            await page.evaluate(function () { location.hash = "#top25"; });
            await page.waitForTimeout(200);
          }
          if (screen === "roster") {
            // Headshots (0029). With provider images allowed, real headshots
            // load; and a headshot that fails always leaves the designed
            // fallback - the player's initials - never a broken image.
            await page.evaluate(function () { location.hash = "#roster/roster"; });
            await page.waitForTimeout(400);
            if (process.env.ALLOW_PROVIDER_IMAGES) {
              await page.evaluate(function () { window.scrollTo(0, 0); });
              await page.waitForFunction(function () {
                return [].some.call(document.querySelectorAll("#screenRoster .ro-ph img"), function (i) { return i.complete && i.naturalWidth > 0; });
              }, null, { timeout: 15000 }).catch(function () {});
              var hs = await page.evaluate(function () {
                var imgs = [].slice.call(document.querySelectorAll("#screenRoster .ro-ph img"));
                return { loaded: imgs.filter(function (i) { return i.complete && i.naturalWidth > 0; }).length,
                         broken: imgs.filter(function (i) { return i.complete && !i.naturalWidth; }).length };
              });
              if (!hs.loaded) fail(team + " roster headshots " + width + "px", "behaviour", ".ro-ph img", "no provider headshot loaded");
              if (hs.broken) fail(team + " roster headshots " + width + "px", "behaviour", ".ro-ph img", hs.broken + " broken headshot(s) left on screen");
              await fullShot(page, path.join(shots, team + "-" + width + "-roster-headshots.png"));
            }
            // Every headshot fails, on purpose: the fallback is what shows.
            await page.route(/^https:\/\/a\.espncdn\.com\/i\/headshots\//, function (r) { return r.fulfill({ status: 404, body: "" }); });
            await page.evaluate(function () { location.hash = "#home"; });
            await page.waitForTimeout(150);
            await page.reload({ waitUntil: "domcontentloaded" });
            await page.waitForFunction(function () { return document.querySelectorAll("#screenHome .sched-row").length > 0; }, null, { timeout: 10000 });
            await page.evaluate(function () { location.hash = "#roster/roster"; });
            await page.waitForTimeout(1200);
            await page.evaluate(function () { window.scrollTo(0, 0); });
            await page.waitForTimeout(300);
            var fb = await page.evaluate(function () {
              // the pictures on screen: the rest are lazy and never asked for
              var ph = [].slice.call(document.querySelectorAll("#screenRoster .ro-ph")).filter(function (p) {
                var r = p.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0;
              });
              return { shown: ph.length,
                       imgs: ph.filter(function (p) { return p.querySelector("img"); }).length,
                       initials: ph.filter(function (p) { var t = p.querySelector(".ro-ph-no"); return t && /^[A-Z]{1,3}$/.test(t.textContent.trim()) && t.checkVisibility(); }).length };
            });
            var fw = team + " roster headshot fallback " + width + "px";
            if (!fb.shown) fail(fw, "behaviour", ".ro-ph", "no player pictures to check");
            if (fb.imgs) fail(fw, "behaviour", ".ro-ph img", fb.imgs + " failed headshot(s) not removed");
            if (fb.initials !== fb.shown) fail(fw, "behaviour", ".ro-ph-no", "only " + fb.initials + " of " + fb.shown + " show the player's initials");
            await fullShot(page, path.join(shots, team + "-" + width + "-roster-headshot-fallback.png"));
            await checkState(page, fw);
            await page.unroute(/^https:\/\/a\.espncdn\.com\/i\/headshots\//);
            // Roster's other views, where the team has them.
            var rviews = await page.evaluate(function () { return (Suite.nav.SCREENS.roster.views || []).map(function (v) { return v.id; }); });
            for (var rv = 1; rv < rviews.length; rv++) {
              await page.evaluate(function (h) { location.hash = h; }, "#roster/" + rviews[rv]);
              await page.waitForTimeout(350);
              await fullShot(page, path.join(shots, team + "-" + width + "-roster-" + rviews[rv] + ".png"));
              await checkState(page, team + " roster " + rviews[rv] + " " + width + "px");
            }
            await page.evaluate(function () { location.hash = "#roster"; });
            await page.waitForTimeout(200);
          }
          if (screen === "schedule") {
            // Results, and a game opened from the list, are views of their own.
            await page.evaluate(function () { location.hash = "#schedule/results"; });
            await page.waitForTimeout(350);
            await fullShot(page, path.join(shots, team + "-" + width + "-schedule-results.png"));
            await checkState(page, team + " schedule results " + width + "px");
            var rcur = await page.evaluate(function () {
              var c = document.querySelector('.nav-item[aria-current="page"]'); return c && c.getAttribute("data-screen"); });
            if (rcur !== "more") fail(team + " schedule results " + width + "px", "behaviour", ".navbar", "Results selects " + rcur + ", not More");
            var opened = await page.evaluate(function () {
              var a = [].filter.call(document.querySelectorAll("#scheduleList .sched-row"), function (x) {
                return /^#schedule\/[0-9]+$/.test(x.getAttribute("href")); })[0];
              if (!a) { location.hash = "#schedule"; return null; }
              var h = a.getAttribute("href"); location.hash = h; return h;
            });
            if (opened) {
              await page.waitForTimeout(600);
              var og = await page.evaluate(function () {
                var back = document.getElementById("scheduleBack");
                var cur = document.querySelector('.nav-item[aria-current="page"]');
                return { head: !!document.querySelector("#scheduleGameHost .game-head"),
                         cur: cur && cur.getAttribute("data-screen"),
                         list: !document.getElementById("scheduleList").hidden,
                         back: back && back.checkVisibility() ? back.getAttribute("href") : null,
                         tabs: [].map.call(document.querySelectorAll("#scheduleGameHost .game-tabs a"), function (a) { return a.getAttribute("href"); }) };
              });
              var ow = team + " schedule game " + width + "px";
              if (!og.head || og.list) fail(ow, "behaviour", "#scheduleGameHost", "a Schedule row did not open its game in the Game layout");
              if (!og.back) fail(ow, "behaviour", "#scheduleBack", "an opened game has no way back to the list");
              if (og.cur !== "more") fail(ow, "behaviour", ".navbar", "a game opened from Schedule selects " + og.cur + ", not More");
              if (og.tabs.some(function (h) { return h.indexOf(opened + "/") !== 0; }))
                fail(ow, "behaviour", ".game-tabs", "the opened game's views point outside it: " + og.tabs.join(" "));
              await fullShot(page, path.join(shots, team + "-" + width + "-schedule-game.png"));
              await checkState(page, ow);
            }
            await page.evaluate(function () { location.hash = "#schedule"; });
            await page.waitForTimeout(200);
          }
          if (screen === "home") {
            // Home (decisions 0023, 0024 §2, §3, §17, §19): hero, news, schedule,
            // outlook in that order; three stories and three rows at most; no
            // Current Game card; stories open their source safely; the
            // location label is text; the old dark screen is not showing.
            var hm = await page.evaluate(function () {
              var host = document.getElementById("screenHome");
              var order = [].slice.call(host.querySelectorAll("[data-home]"))
                .filter(function (s) { return !s.hidden && s.innerHTML.trim(); })
                .map(function (s) { return s.getAttribute("data-home"); });
              var links = [].slice.call(host.querySelectorAll(".news-card"));
              var rows = [].slice.call(host.querySelectorAll(".sched-row"));
              var cta = host.querySelector(".gc-cta");
              return { shown: !host.hidden, legacy: !!document.getElementById("legacy"), order: order,
                       news: links.length, rows: rows.length,
                       safe: links.every(function (a) { return a.target === "_blank" && /noopener/.test(a.rel) && /noreferrer/.test(a.rel)
                                                            && /new tab/.test(a.textContent); }),
                       labels: rows.every(function (r) { var s = r.querySelector(".site"); return s && /^(home|away|neutral)$/i.test(s.textContent.trim()); }),
                       current: /current game/i.test(host.textContent),
                       cta: cta ? cta.getAttribute("href") : null,
                       card: !!host.querySelector(".gamecard"), summary: (host.querySelector("#gcSummary") || {}).textContent || "" };
            });
            if (!hm.shown || hm.legacy) fail(label, "behaviour", "#screenHome", "Home is not the canonical screen (legacy showing: " + hm.legacy + ")");
            var want = ["hero", "news", "schedule", "outlook"];
            var got = hm.order.filter(function (k) { return want.indexOf(k) > -1; });
            if (got.join() !== want.filter(function (k) { return got.indexOf(k) > -1; }).join() || got[0] !== "hero")
              fail(label, "behaviour", "[data-home]", "Home sections out of order: " + got.join(", "));
            if (hm.news > 3) fail(label, "behaviour", ".news-card", hm.news + " stories on Home; at most 3");
            if (hm.rows > 3 || hm.rows < 1) fail(label, "behaviour", ".sched-row", hm.rows + " schedule rows on Home; 1 to 3");
            if (!hm.safe) fail(label, "behaviour", ".news-card", "a story does not open its source in a new tab with rel protections and a disclosure");
            if (!hm.labels) fail(label, "behaviour", ".site", "a schedule row relies on colour: its HOME/AWAY/NEUTRAL text is missing");
            if (hm.current) fail(label, "behaviour", "#screenHome", "Home shows a Current Game card, which decision 0023 removed");
            if (!hm.card || !hm.summary) fail(label, "behaviour", ".gamecard", "the hero has no game card or no spoken summary");
            if (hm.cta && hm.cta !== "#game") fail(label, "behaviour", ".gc-cta", "the hero's action goes to " + hm.cta + ", not Game");
          }
          if (screen === "top25") {
            // Top 25 (0024 §5, §6): the canonical screen, a Games | Rankings
            // strip matching the route, and team names never cut off.
            var tp = await page.evaluate(function () {
              var host = document.getElementById("screenTop25");
              var cur = host.querySelector('.view-tabs a[aria-current="page"]');
              var cut = [].filter.call(host.querySelectorAll(".tg-name,.rk-name"), function (n) {
                return getComputedStyle(n).textOverflow === "ellipsis" && n.scrollWidth > n.clientWidth + 1; }).length;
              return { shown: !host.hidden, legacy: !!document.getElementById("legacy"),
                       cur: cur ? cur.getAttribute("href") : null, view: Suite.nav.current().view, cut: cut };
            });
            if (!tp.shown || tp.legacy) fail(label, "behaviour", "#screenTop25", "Top 25 is not the canonical screen");
            if (tp.cur !== (tp.view === "rankings" ? "#top25/rankings" : "#top25"))
              fail(label, "behaviour", ".view-tabs", "the view strip marks " + tp.cur + " for the " + tp.view + " view");
            if (tp.cut) fail(label, "layout", ".tg-name", tp.cut + " team name(s) cut off");
          }
          if (screen === "roster") {
            // Roster (0019, 0024 §8, §9): the canonical screen; views that
            // follow what the team has - no empty tabs; every spot of the
            // unit on screen with its levels; no name cut off.
            var ro = await page.evaluate(function () {
              var host = document.getElementById("screenRoster");
              var tabs = [].map.call(host.querySelectorAll(".view-tabs a"), function (a) { return a.getAttribute("href"); });
              var views = (Suite.nav.SCREENS.roster.views || []).map(function (v) { return v.id; });
              return { shown: !host.hidden, legacy: !!document.getElementById("legacy"), tabs: tabs, views: views,
                       cards: host.querySelectorAll(".ro-card").length, rows: host.querySelectorAll(".ro-row").length,
                       seg: [].map.call(host.querySelectorAll(".unit-seg a"), function (a) { return a.textContent.trim(); }),
                       cut: [].filter.call(host.querySelectorAll(".ro-name"), function (n) { return n.scrollWidth > n.clientWidth + 1; }).length };
            });
            if (!ro.shown || ro.legacy) fail(label, "behaviour", "#screenRoster", "Roster is not the canonical screen");
            if (ro.views.length > 1 && ro.tabs.length !== ro.views.length) fail(label, "behaviour", ".view-tabs", "the view strip does not match the team's views " + ro.views.join());
            if (ro.views.length < 2 && ro.tabs.length) fail(label, "behaviour", ".view-tabs", "a one-view Roster shows a view strip");
            if (!ro.rows) fail(label, "behaviour", ".ro-row", "Roster shows no people");
            if (ro.views[0] === "depth" && ro.seg.join("|") !== "Offense|Defense|Special Teams")
              fail(label, "behaviour", ".unit-seg", "the unit control reads " + ro.seg.join(" | ") + ", not Offense | Defense | Special Teams");
            if (ro.cut) fail(label, "layout", ".ro-name", ro.cut + " player name(s) cut off");
          }
          if (screen === "schedule") {
            // Schedule (0022 #8; Product 2026-09-24): the canonical screen,
            // Schedule | Results, every entry of the season, and rows that
            // open their game - the hero on Game, any other at #schedule/<id>.
            var sc = await page.evaluate(function () {
              var host = document.getElementById("screenSchedule");
              var cur = host.querySelector('.view-tabs a[aria-current="page"]');
              var rows = [].slice.call(host.querySelectorAll("#scheduleList .sched-row"));
              return { shown: !host.hidden, legacy: !!document.getElementById("legacy"),
                       cur: cur ? cur.getAttribute("href") : null, rows: rows.length,
                       hrefs: rows.map(function (a) { return a.getAttribute("href"); }),
                       hero: rows.filter(function (a) { return a.classList.contains("is-hero"); }).map(function (a) { return a.getAttribute("href"); }),
                       cut: [].filter.call(host.querySelectorAll(".sched-opp"), function (n) { return n.scrollWidth > n.clientWidth + 1; }).length };
            });
            if (!sc.shown || sc.legacy) fail(label, "behaviour", "#screenSchedule", "Schedule is not the canonical screen");
            if (sc.cur !== "#schedule") fail(label, "behaviour", ".view-tabs", "#schedule marks " + sc.cur + ", not Schedule");
            if (!sc.rows) fail(label, "behaviour", ".sched-row", "the season has no rows");
            if (sc.hrefs.some(function (h) { return h !== "#game" && !/^#schedule\/[0-9]+$/.test(h); }))
              fail(label, "behaviour", ".sched-row", "a row goes somewhere other than Game or its own game");
            if (sc.hero.some(function (h) { return h !== "#game"; })) fail(label, "behaviour", ".sched-row.is-hero", "the hero game's row does not open Game");
            if (sc.cut) fail(label, "layout", ".sched-opp", sc.cut + " opponent name(s) cut off");
          }
          if (screen === "game") {
            // Game (0022 #6, 0024 §7): the canonical screen, the hero game's
            // header, and a view strip only when the lifecycle has more than
            // one view - never a one-item strip for pregame.
            var gm = await page.evaluate(function () {
              var host = document.getElementById("screenGame");
              var tabs = [].slice.call(host.querySelectorAll(".game-tabs a"));
              var views = (Suite.nav.SCREENS.game.views || []).map(function (v) { return v.id; });
              var cur = host.querySelector('.game-tabs a[aria-current="page"]');
              return { shown: !host.hidden, legacy: !!document.getElementById("legacy"),
                       head: !!host.querySelector(".game-head"), tabs: tabs.map(function (a) { return a.getAttribute("href"); }),
                       views: views, cur: cur ? cur.getAttribute("href") : null, tickets: /tickets/i.test(host.textContent),
                       view: Suite.nav.current().view,
                       names: [].map.call(host.querySelectorAll(".gh-name"), function (n) {
                         return { text: n.textContent, cut: n.scrollWidth > n.clientWidth + 1,
                                  abbr: getComputedStyle(n.querySelector(".gh-abbr")).display !== "none" }; }) };
            });
            if (!gm.shown || gm.legacy) fail(label, "behaviour", "#screenGame", "Game is not the canonical screen");
            if (!gm.head) fail(label, "behaviour", ".game-head", "Game has no header for the hero game");
            if (gm.views.length < 2 && gm.tabs.length) fail(label, "behaviour", ".game-tabs", "a one-view lifecycle shows a tab strip");
            if (gm.views.length > 1 && gm.tabs.join() !== gm.views.map(function (v) { return "#game/" + v; }).join())
              fail(label, "behaviour", ".game-tabs", "the view strip " + gm.tabs.join() + " does not match the lifecycle " + gm.views.join());
            if (gm.views.length > 1 && gm.cur !== "#game/" + gm.view) fail(label, "behaviour", ".game-tabs", "the current view is not marked");
            if (gm.tickets) fail(label, "behaviour", "#screenGame", "Tickets is offered, which v1 hides (0024 §7)");
            // Team identity is primary: never cut, and both sides in one form
            // - short names, or both abbreviations (Game review, 2026-09-24).
            gm.names.forEach(function (n) { if (n.cut) fail(label, "layout", ".gh-name", "the team name '" + n.text + "' is cut off"); });
            if (gm.names.length === 2 && gm.names[0].abbr !== gm.names[1].abbr)
              fail(label, "behaviour", ".gh-name", "one side shows a name and the other an abbreviation");
          }
          // "Project LND" is never customer-facing (decision 0022 #9).
          if (await page.evaluate(function () { return /project\s*lnd/i.test(document.body.innerText + document.title); }))
            fail(label, "behaviour", "body", "the page shows the internal name Project LND");
          if (screen === "more") {
            var mo = await page.evaluate(function () {
              return [].map.call(document.querySelectorAll("#screenMore .mo-row"), function (a) {
                return a.querySelector(".mo-title").textContent + "=" + a.getAttribute("href");
              }).join("|");
            });
            if (mo !== "News=#news|Schedule=#schedule|Settings=#settings|Feedback=#feedback|About Suite=#about")
              fail(label, "behaviour", ".mo-list", "More lists " + mo);
          }
          if (screen === "news") {
            await page.waitForFunction(function () { return document.querySelectorAll("#screenNews .nw-row").length > 0; }, null, { timeout: 8000 }).catch(function () {});
            var nw = await page.evaluate(function () {
              var rows = [].slice.call(document.querySelectorAll("#screenNews .nw-row"));
              return { n: rows.length, safe: rows.every(function (a) { return a.target === "_blank" && /noopener/.test(a.rel) && /new tab/.test(a.textContent); }) };
            });
            if (!nw.n) fail(label, "behaviour", ".nw-list", "News shows no stories");
            if (!nw.safe) fail(label, "behaviour", ".nw-row", "a story does not open its publisher in a new tab with rel protections and a spoken cue (0024 §17)");
          }
          if (screen === "settings") {
            var stt = await page.evaluate(function () {
              var h = document.getElementById("screenSettings");
              return { groups: [].map.call(h.querySelectorAll(".st-group .sec-title"), function (x) { return x.textContent; }).join("|"),
                       team: (h.querySelector(".st-team") || {}).textContent || "",
                       change: !!h.querySelector('a.st-link[href*="?change"]'),
                       opts: [].map.call(h.querySelectorAll('input[name="appStyle"]'), function (i) { return i.value + (i.checked ? "*" : ""); }).join("|"),
                       refresh: !!h.querySelector("[data-refresh]"),
                       updated: (h.querySelector('[data-st="updated"]') || {}).textContent || "" };
            });
            if (stt.groups !== "Team|Appearance|Data") fail(label, "behaviour", ".st-group", "Settings groups read " + stt.groups + " (0024 §18, 0026)");
            if (stt.team.indexOf(await page.evaluate(function () { return TEAM_CONFIG.team.name; })) === -1) fail(label, "behaviour", ".st-team", "Settings does not name the current team");
            if (!stt.change) fail(label, "behaviour", ".st-link", "Change Team is missing: it is the only way to change team in the app");
            if (stt.opts !== "team*|suite" && stt.opts !== "team|suite*") fail(label, "behaviour", "appStyle", "App Style offers " + stt.opts);
            if (!stt.refresh) fail(label, "behaviour", "[data-refresh]", "Refresh Data is missing (0022 #13)");
            if (!stt.updated) fail(label, "behaviour", "[data-st=updated]", "Last Updated is empty");
          }
          if (screen === "feedback") {
            var fb = await page.evaluate(function () {
              var a = document.querySelector("#screenFeedback .fb-cta");
              return { href: a ? decodeURIComponent(a.getAttribute("href")) : "", team: TEAM_CONFIG.team.name };
            });
            if (fb.href.indexOf("mailto:suiteappfeedback@gmail.com?") !== 0) fail(label, "behaviour", ".fb-cta", "Feedback does not email suiteappfeedback@gmail.com (0022 #12)");
            if (fb.href.indexOf("Team: " + fb.team) === -1) fail(label, "behaviour", ".fb-cta", "the feedback email does not carry the team");
          }
          if (screen === "about") {
            var ab = await page.evaluate(function () {
              return [].map.call(document.querySelectorAll("#screenAbout .ab-name"), function (x) { return x.textContent.replace(/\(opens in a new tab\)/, "").trim(); });
            });
            if (ab.indexOf("ESPN") === -1) fail(label, "behaviour", ".ab-list", "About Suite does not credit ESPN");
            var off = await page.evaluate(function () { return TEAM_CONFIG.sources.official ? TEAM_CONFIG.sources.official.depthChartLabel : null; });
            if (off && ab.indexOf(off) === -1) fail(label, "behaviour", ".ab-list", "About Suite does not credit " + off);
            if (!off && ab.some(function (n) { return /\.com$/i.test(n) && n !== "ESPN"; }) && team === "ohio-state")
              fail(label, "behaviour", ".ab-list", "About Suite credits an official source this team does not have");
          }
        }

        // App Style (decision 0026): Suite Style replaces the team's colour
        // tokens with Suite's, holds across a reload, and is the fan's -
        // stored on its own, not under the team.
        await page.evaluate(function () { location.hash = "#settings"; });
        await page.waitForTimeout(300);
        await page.click('#screenSettings input[value="suite"]');
        await page.waitForTimeout(200);
        await page.reload({ waitUntil: "domcontentloaded" });
        await page.waitForTimeout(900);
        var sty = await page.evaluate(function () {
          var v = getComputedStyle(document.documentElement).getPropertyValue("--t-surface").trim().toUpperCase();
          return { surface: v, want: Suite.ui.STYLE.colors.surface.toUpperCase(), key: localStorage.getItem("suite-style"),
                   checked: (document.querySelector('#screenSettings input[name="appStyle"]:checked') || {}).value,
                   name: document.getElementById("mastName").textContent };
        });
        if (sty.surface !== sty.want) fail(who, "behaviour", "appStyle", "Suite Style after a reload paints --t-surface " + sty.surface + ", not Suite's " + sty.want);
        if (sty.key !== "suite" || sty.checked !== "suite") fail(who, "behaviour", "appStyle", "Suite Style did not hold across a reload");
        if (!sty.name) fail(who, "behaviour", "#mastName", "Suite Style dropped the team's name: only style changes");
        await fullShot(page, path.join(shots, team + "-" + width + "-settings-suite-style.png"));
        await page.evaluate(function () { location.hash = "#home"; });
        await page.waitForTimeout(500);
        await fullShot(page, path.join(shots, team + "-" + width + "-home-suite-style.png"));
        await checkState(page, team + " home suite style " + width + "px");
        await page.evaluate(function () { location.hash = "#settings"; });
        await page.waitForTimeout(300);
        await page.click('#screenSettings input[value="team"]');
        await page.waitForTimeout(200);

        // Back walks the routes, and a route is restorable from the URL alone.
        await page.evaluate(function () { location.hash = "#top25"; });
        await page.waitForTimeout(150);
        await page.evaluate(function () { location.hash = "#more"; });
        await page.waitForTimeout(150);
        await page.goBack();
        await page.waitForTimeout(250);
        var back = await page.evaluate(function () {
          var cur = document.querySelector('.nav-item[aria-current="page"]');
          return { hash: location.hash, cur: cur && cur.getAttribute("data-screen"), panel: !document.getElementById("screenTop25").hidden };
        });
        if (back.hash !== "#top25" || back.cur !== "top25" || !back.panel)
          fail(who, "behaviour", "history", "Back from More did not return to Top 25 (" + JSON.stringify(back) + ")");

        // A deep link opens its screen directly.
        await page.goto(base + "/?team=" + team + "#roster", { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(600);
        var deep = await page.evaluate(function () {
          return { panel: !document.getElementById("screenRoster").hidden,
                   title: document.getElementById("mastTitle").textContent };
        });
        if (!deep.panel || deep.title !== "Roster") fail(who, "behaviour", "route", "a deep link to #roster did not open Roster");

        // Top 25 opens on Games; a deep link to Rankings opens Rankings; a
        // view Top 25 does not have is corrected in place (decision 0024 §5, §15).
        await page.evaluate(function () { location.hash = "#top25"; });
        await page.waitForTimeout(300);
        var t25 = await page.evaluate(function () {
          var cur = document.querySelector('#screenTop25 .view-tabs a[aria-current="page"]');
          return { view: Suite.nav.current().view, hash: location.hash, pressed: cur ? cur.textContent.trim().toLowerCase() : null };
        });
        if (t25.view !== "games" || t25.hash !== "#top25") fail(who, "behaviour", "route", "#top25 did not open Games (" + JSON.stringify(t25) + ")");
        if (t25.pressed !== "games") fail(who, "behaviour", "#screenTop25", "#top25 marks " + t25.pressed + ", not Games");
        await page.evaluate(function () { location.hash = "#top25/rankings"; });
        await page.waitForTimeout(300);
        var t25r = await page.evaluate(function () {
          var cur = document.querySelector('#screenTop25 .view-tabs a[aria-current="page"]');
          var poll = document.querySelector('#screenTop25 .poll-seg a[aria-current="page"]');
          var seg = document.querySelector("#screenTop25 .poll-seg"), note = document.querySelector("#screenTop25 .rk-note");
          var tbl = document.querySelector("#screenTop25 .rk-table");
          var rows = document.querySelectorAll("#screenTop25 .rk-table tbody tr");
          return { view: Suite.nav.current().view, hash: location.hash, pressed: cur ? cur.textContent.trim().toLowerCase() : null,
                   shown: !!document.querySelector("#screenTop25 .rk-table"), poll: poll ? poll.textContent.trim() : null,
                   rows: rows.length, mine: document.querySelectorAll("#screenTop25 .rk-table tr.mine").length,
                   // the pre-CFP notice sits right under the selector, above the table
                   note: note ? (seg.nextElementSibling === note && !!(note.compareDocumentPosition(tbl) & 4)) : null,
                   over: (function () {
                     var t = document.querySelector("#screenTop25 .rk-table"), c = t && t.closest(".rk-card");
                     if (!t) return 0;
                     var cs = getComputedStyle(c);
                     return Math.round(t.scrollWidth - (c.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)));
                   })() };
        });
        if (t25r.view !== "rankings" || t25r.hash !== "#top25/rankings")
          fail(who, "behaviour", "route", "a deep link to Rankings was not respected (" + JSON.stringify(t25r) + ")");
        if (t25r.pressed !== "rankings" || !t25r.shown)
          fail(who, "behaviour", "#screenTop25", "#top25/rankings does not show Rankings (" + JSON.stringify(t25r) + ")");
        // README: AP leads until the CFP is published, and a poll is all 25
        // rows, scrolled - never cut to what fits.
        if (t25r.poll !== "AP") fail(who, "behaviour", ".poll-seg", "before the CFP is published Rankings opens on " + t25r.poll + ", not AP");
        if (t25r.rows !== 25) fail(who, "behaviour", ".rk-table", "the poll shows " + t25r.rows + " rows, not all 25");
        if (t25r.note !== true) fail(who, "behaviour", ".rk-note", "before the CFP is published its notice is " +
          (t25r.note === null ? "missing" : "not directly under the poll selector, above the table"));
        if (t25r.over > 1) fail(who, "layout", ".rk-table", "the rankings table is " + t25r.over + "px wider than its card");
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
        {
          await page.click('.nav-item[data-screen="more"]');
          await page.click('#screenMore a[href="#settings"]');
          await page.click('#screenSettings a.st-link');
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
