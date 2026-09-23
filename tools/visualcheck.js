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
     - on team pages, the More menu opens.

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
var TABS = [["tab-schedule", "home"], ["tab-around", "top25"], ["tab-game", "game"],
            ["tab-depth", "roster"], ["tab-news", "news"]];
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
      var body = responseFor(route.request().url());
      if (body) return route.fulfill({ status: 200, contentType: "application/json", body: body });
      if (route.request().url().startsWith(base)) return route.continue();
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

        // The More menu, driven the way a person drives it.
        var who = team + " " + width + "px";
        if (!(await page.$("#moreTrigger"))) {
          fail(who, "behaviour", "#moreTrigger", "More menu is missing: it is the only way to change team in the app");
        } else {
          await page.click("#moreTrigger");
          if (await page.locator("#moreMenu").isHidden()) fail(who, "behaviour", "#moreTrigger", "More menu did not open");
          await page.keyboard.press("Escape");
          await page.waitForTimeout(100);
          var esc = await page.evaluate(function () {
            return { hidden: document.getElementById("moreMenu").hidden, focus: document.activeElement.id };
          });
          if (!esc.hidden) fail(who, "behaviour", "#moreMenu", "Escape did not close the More menu");
          if (esc.focus !== "moreTrigger") fail(who, "behaviour", "#moreMenu", "closing More did not return focus to its trigger (focus is on '" + esc.focus + "')");
        }

        for (var k = 0; k < TABS.length; k++) {
          var tab = TABS[k];
          await page.click("#" + tab[0]);
          await page.waitForTimeout(350);
          var label = team + " " + tab[1] + " " + width + "px";
          await fullShot(page, path.join(shots, team + "-" + width + "-" + tab[1] + ".png"));
          await checkState(page, label);
        }

        // Change team: the stored choice is forgotten and the fan lands on the
        // chooser - not back on the same team, and not on a blank page.
        if (await page.$("#moreTrigger")) {
          await page.click("#moreTrigger");
          await page.click("#changeTeam");
          try {
            await page.waitForSelector(".chooser", { timeout: 10000 });
            var ct = await page.evaluate(function () {
              return { search: location.search, stored: localStorage.getItem("iw-team") };
            });
            if (ct.search) fail(who, "behaviour", "#changeTeam", "Change team left '" + ct.search + "' in the URL");
            if (ct.stored) fail(who, "behaviour", "#changeTeam", "Change team kept the stored team '" + ct.stored + "'");
          } catch (e) {
            fail(who, "behaviour", "#changeTeam", "Change team did not reach the chooser");
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
