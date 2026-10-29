#!/usr/bin/env node
/* The experience sweep: every team, every screen, as a fan opens them, with
   live data (David, 2026-10-29: "runs through each team, clicking links,
   inspecting the experience of each ... especially visual/design bugs").

   The browser checks (visualcheck.js and the rest) prove the design against
   fixtures for the teams they know. This is the other half: the real feeds,
   all 138 teams, the way production serves them. It looks for what a fan
   would notice, and says where:

     error      a script error, or a request of the app's own that failed
     image      an image that did not load (a logo, a headshot, a story's)
     overflow   the page scrolls sideways
     leak       "undefined", "NaN", "null", "[object Object]" or
                "Invalid Date" in what the fan reads
     clipped    a name or figure cut off by its box (ellipsis included:
                every one is listed, so a designed truncation can be told
                from a broken one)
     split      a name broken inside a word ("Wiscons / in")
     contrast   text under WCAG AA against the pixels behind it (with
                SWEEP_CONTRAST=1; slower, it reads the screen)
     link       an outbound link that answers 4xx/5xx or not at all
     empty      a section that tells the fan it has nothing ("unavailable",
                "no ... yet"), counted per team: a sourcing gap, not a bug
     perf       the first load: time to Home's schedule, largest paint,
                layout shift, requests and bytes (for the performance work)

   Writes artifacts/sweep/report.json and prints a summary. Screenshots of
   flagged screens (or all, with SWEEP_SHOTS=all) go to artifacts/sweep/.
   With SWEEP_LOG_SHOTS=1 each flagged screen is also printed into the log
   as a small JPEG in base64 lines ("SHOT <name> <i>/<n> <data>"), so a
   reviewer who cannot download artifacts can still see them.

   Usage:
     node tools/sweep.js                       production, as fans have it
     SWEEP_BASE=local node tools/sweep.js      this checkout, served on this machine
     SWEEP_TEAMS=notre-dame,ohio-state SWEEP_WIDTHS=390 node tools/sweep.js
   It needs the network; it is not one of the gating checks. */
"use strict";

var fs = require("fs"), path = require("path");
var chromium = require("playwright").chromium;
var audit = require("./a11yaudit.js");
var serve = require("./lib/serve");

var root = path.join(__dirname, "..");
var out = path.join(root, "artifacts", "sweep");
fs.mkdirSync(out, { recursive: true });

var TEAMS = (process.env.SWEEP_TEAMS ? process.env.SWEEP_TEAMS.split(",") :
  fs.readdirSync(path.join(root, "teams")).filter(function (f) { return /\.js$/.test(f) && f !== "index.js"; })
    .map(function (f) { return f.replace(/\.js$/, ""); })).sort();
// SWEEP_SHARD="2/4": the second quarter of the teams, for a workflow that
// sweeps in parallel jobs.
if (process.env.SWEEP_SHARD) {
  var sh = process.env.SWEEP_SHARD.split("/").map(Number);
  TEAMS = TEAMS.filter(function (t, i) { return i % sh[1] === sh[0] - 1; });
}
var WIDTHS = (process.env.SWEEP_WIDTHS || "390,1280").split(",").map(Number).filter(Boolean);
// The fan's screens. Settings, Feedback and About are the Suite's, not the
// team's, and the browser checks already cover them.
var SCREENS = (process.env.SWEEP_SCREENS || "home,top25,game,roster,more,schedule,news,stats").split(",");
var NAV = ["home", "top25", "game", "roster", "more"];
var PARALLEL = Number(process.env.SWEEP_PARALLEL || 2);
var SHOTS = process.env.SWEEP_SHOTS || "flagged";       // "flagged" | "all" | "none"

// Where a name or a figure is drawn (visualcheck's list, plus the rows a
// fan scans on each screen).
var NAME_SELECTORS = ".sched-opp, .ro-name, .rk-team, .rk-name, .tg-name, .sp-team, .series-name, .ld-name, " +
                     ".gh-name, .gh-opp, .gc-name, .ab-name, .mu-l, .ss-l, .ts-l, .out-label, .gcard-title, .sec-title, " +
                     ".news-title, .nw-title, .story-title, h1, h2, h3";
var LEAK = /\b(undefined|NaN|null)\b|\[object Object\]|Invalid Date/;
var EMPTY = /\b(unavailable|not available|no [a-z ]{0,30} yet|nothing to show|couldn['’]t (load|find)|no data)\b/i;

function now() { return Date.now(); }

async function main() {
  // Production by default: the provider answers the Suite's own origin and
  // refuses a local one (CORS, first sweep, 2026-10-29), so a build served on
  // the runner can only be swept where its data comes from elsewhere.
  var server = null, base = process.env.SWEEP_BASE || "https://dmvanblaircom.github.io/Project-LND/";
  if (base === "local") {
    server = serve(root);
    await new Promise(function (r) { server.listen(0, "127.0.0.1", r); });
    base = "http://127.0.0.1:" + server.address().port + "/";
  }
  if (!/\/$/.test(base)) base += "/";
  var browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined });
  var report = { base: base, startedAt: new Date().toISOString(), widths: WIDTHS, screens: SCREENS, teams: {} };
  var links = {};

  if (process.env.SWEEP_CONTRAST) {
    var st = await audit.selfTest(browser);
    if (!st.ok) { console.error("contrast auditor failed its self-test; contrast is not judged"); process.env.SWEEP_CONTRAST = ""; }
  }

  async function sweepTeam(team) {
    var t = report.teams[team] = { findings: [], empty: [], perf: {} };
    function find(kind, where, detail) {
      var key = kind + "|" + where + "|" + detail;
      if (t.findings.some(function (f) { return f.key === key; })) return;
      t.findings.push({ key: key, kind: kind, where: where, detail: String(detail).slice(0, 240) });
    }
    for (var wi = 0; wi < WIDTHS.length; wi++) {
      var width = WIDTHS[wi];
      var context = await browser.newContext({ viewport: { width: width, height: width < 600 ? 844 : 900 },
        serviceWorkers: "block", timezoneId: "America/New_York", locale: "en-US",
        deviceScaleFactor: 1,
        // a fan's browser, not "HeadlessChrome": the provider turns the
        // headless name away from a datacenter address (first sweep, 2026-10-29)
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36" });
      var page = await context.newPage();
      var screen = "load", own = base.replace(/\/$/, "");
      page.on("pageerror", function (e) { find("error", screen + " " + width, "script: " + e.message); });
      page.on("console", function (m) {
        if (m.type() === "error" && !/Failed to load resource/.test(m.text())) find("error", screen + " " + width, "console: " + m.text());
      });
      page.on("response", function (r) {
        var u = r.url();
        if (r.status() >= 400 && (u.indexOf(own) === 0 || /\/data\//.test(u))) find("error", screen + " " + width, r.status() + " " + u);
      });
      page.on("requestfailed", function (r) {
        var u = r.url(), why = (r.failure() || {}).errorText || "";
        if (/ERR_ABORTED/.test(why)) return;                 // a navigation or a cancelled fetch, not a failure
        if (u.indexOf(own) === 0 || /\/data\//.test(u)) find("error", screen + " " + width, "failed " + u + " (" + why + ")");
      });

      // The first load, measured (perf). Largest paint and layout shift are
      // collected from the start; Home's schedule rows say the team's data
      // has arrived.
      await page.addInitScript(function () {
        window.__sweep = { lcp: 0, cls: 0 };
        try {
          new PerformanceObserver(function (l) { l.getEntries().forEach(function (e) { window.__sweep.lcp = e.startTime; }); })
            .observe({ type: "largest-contentful-paint", buffered: true });
          new PerformanceObserver(function (l) { l.getEntries().forEach(function (e) { if (!e.hadRecentInput) window.__sweep.cls += e.value; }); })
            .observe({ type: "layout-shift", buffered: true });
        } catch (e) {}
      });
      var t0 = now();
      await page.goto(base + "?team=" + team, { waitUntil: "domcontentloaded", timeout: 45000 }).catch(function (e) { find("error", "load " + width, "page did not open: " + e.message); });
      var ready = await page.waitForFunction(function () {
        return document.querySelectorAll("#screenHome .sched-row").length > 0 && !document.getElementById("launch");
      }, null, { timeout: 30000 }).then(function () { return true; }, function () { return false; });
      var homeMs = now() - t0;
      if (!ready) find("error", "load " + width, "Home's schedule did not draw within 30s");
      await page.waitForTimeout(1500);
      var perf = await page.evaluate(function () {
        var nav = performance.getEntriesByType("navigation")[0] || {}, res = performance.getEntriesByType("resource");
        var bytes = (nav.transferSize || 0) + res.reduce(function (s, r) { return s + (r.transferSize || 0); }, 0);
        return { dcl: Math.round(nav.domContentLoadedEventEnd || 0), load: Math.round(nav.loadEventEnd || 0),
                 lcp: Math.round(window.__sweep.lcp), cls: Math.round(window.__sweep.cls * 1000) / 1000,
                 requests: res.length + 1, kb: Math.round(bytes / 1024) };
      });
      perf.homeMs = homeMs;
      t.perf[width] = perf;

      for (var k = 0; k < SCREENS.length; k++) {
        screen = SCREENS[k];
        if (NAV.indexOf(screen) !== -1) await page.click('.nav-item[data-screen="' + screen + '"]').catch(function () {});
        else await page.evaluate(function (h) { location.hash = h; }, "#" + screen);
        await page.waitForTimeout(900);
        var where = screen + " " + width;
        var flagsBefore = t.findings.length;
        var s = await page.evaluate(function (args) {
          var leak = new RegExp(args.leak), empty = new RegExp(args.empty, "i");
          // seen by the eye: laid out, and not a screen reader's text (sr-only
          // clips itself to a pixel on purpose)
          var vis = function (el) {
            if (el.offsetParent === null && getComputedStyle(el).position !== "fixed") return false;
            for (var a = el; a && a !== document.body; a = a.parentElement) if (a.classList && a.classList.contains("sr-only")) return false;
            var b = el.getBoundingClientRect(); return b.width > 1 && b.height > 1;
          };
          var r = { overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
                    leaks: [], clipped: [], split: [], images: [], empty: [], links: [] };
          // what the fan reads: the visible screen and the bars
          var text = document.body.innerText;
          text.split("\n").forEach(function (line) { if (leak.test(line)) r.leaks.push(line.trim().slice(0, 120)); });
          text.split("\n").forEach(function (line) { if (empty.test(line) && line.length < 160) r.empty.push(line.trim()); });
          [].forEach.call(document.querySelectorAll("img"), function (i) {
            if (!vis(i) || !i.getAttribute("src")) return;
            if (i.complete && i.naturalWidth === 0) r.images.push((i.className || i.parentNode.className || "img") + " " + i.getAttribute("src").slice(0, 140));
          });
          [].forEach.call(document.querySelectorAll(args.names), function (el) {
            if (!vis(el) || !el.textContent.trim()) return;
            if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== "visible")
              r.clipped.push((el.className.split(" ")[0] || el.tagName.toLowerCase()) + ": " + JSON.stringify(el.textContent.trim().slice(0, 60)));
            var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), n;
            while ((n = w.nextNode())) {
              var re = /[^\s‐-—-]+/g, m;
              while ((m = re.exec(n.data))) {
                if (m[0].length < 4) continue;
                var rg = document.createRange(); rg.setStart(n, m.index); rg.setEnd(n, m.index + m[0].length);
                var tops = {};
                [].forEach.call(rg.getClientRects(), function (b) { if (b.width > 0) tops[Math.round(b.top)] = 1; });
                if (Object.keys(tops).length > 1) r.split.push((el.className.split(" ")[0] || el.tagName.toLowerCase()) + ": " + JSON.stringify(m[0]));
              }
            }
          });
          [].forEach.call(document.querySelectorAll("a[href^='http']"), function (a) { if (vis(a)) r.links.push(a.href); });
          return r;
        }, { leak: LEAK.source, empty: EMPTY.source, names: NAME_SELECTORS });
        if (s.overflow) find("overflow", where, "the page scrolls sideways");
        s.leaks.forEach(function (x) { find("leak", where, x); });
        s.clipped.forEach(function (x) { find("clipped", where, x); });
        s.split.forEach(function (x) { find("split", where, x); });
        s.images.forEach(function (x) { find("image", where, x); });
        s.empty.forEach(function (x) { if (t.empty.indexOf(screen + ": " + x) === -1) t.empty.push(screen + ": " + x); });
        s.links.forEach(function (u) { (links[u] = links[u] || []).indexOf(team) === -1 && links[u].push(team); });
        if (process.env.SWEEP_CONTRAST && width < 600 && NAV.indexOf(screen) !== -1) {
          var ct = await audit.auditText(page, team + " " + where).catch(function () { return { failures: [] }; });
          ct.failures.forEach(function (f) { find("contrast", where, (f.sel || "") + " " + (f.detail || "")); });
        }
        var flagged = t.findings.length > flagsBefore;
        if (SHOTS === "all" || (SHOTS === "flagged" && flagged)) {
          var file = path.join(out, team + "-" + width + "-" + screen + ".jpg");
          await page.screenshot({ path: file, type: "jpeg", quality: 55 }).catch(function () {});
          if (process.env.SWEEP_LOG_SHOTS && flagged && width < 600) logShot(team + "-" + width + "-" + screen, file);
        }
      }
      await context.close();
    }
    t.findings.forEach(function (f) { delete f.key; });
  }

  function logShot(name, file) {
    try {
      var b64 = fs.readFileSync(file).toString("base64"), size = 4000, n = Math.ceil(b64.length / size);
      for (var i = 0; i < n; i++) console.log("SHOT " + name + " " + (i + 1) + "/" + n + " " + b64.slice(i * size, (i + 1) * size));
    } catch (e) {}
  }

  // a few teams at a time: each is one browser context per width
  var queue = TEAMS.slice();
  await Promise.all(Array.from({ length: PARALLEL }, async function () {
    while (queue.length) {
      var team = queue.shift();
      try { await sweepTeam(team); } catch (e) {
        (report.teams[team] = report.teams[team] || { findings: [], empty: [], perf: {} }).findings.push({ kind: "error", where: "sweep", detail: e.message.slice(0, 240) });
      }
      process.stdout.write("swept " + team + " (" + (report.teams[team].findings.length) + ")\n");
    }
  }));
  await browser.close();
  if (server) server.close();

  // Outbound links, once each: a team's roster page, a story, a stream.
  if (!process.env.SWEEP_NO_LINKS) {
    var urls = Object.keys(links), bad = [];
    var lq = urls.slice();
    await Promise.all(Array.from({ length: 12 }, async function () {
      while (lq.length) {
        var u = lq.shift();
        try {
          var ctl = new AbortController(), timer = setTimeout(function () { ctl.abort(); }, 20000);
          var res = await fetch(u, { method: "GET", redirect: "follow", signal: ctl.signal,
                                     headers: { "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36" } });
          clearTimeout(timer);
          // 401/403/429: the site turns a robot away; a fan's browser gets in
          if (res.status >= 400 && [401, 403, 429].indexOf(res.status) === -1) bad.push({ url: u, status: res.status, teams: links[u] });
          try { res.body && res.body.cancel(); } catch (e) {}
        } catch (e) { bad.push({ url: u, status: "no answer (" + (e.name || e.message) + ")", teams: links[u] }); }
      }
    }));
    report.links = { checked: urls.length, bad: bad };
    bad.forEach(function (b) { b.teams.forEach(function (tm) { report.teams[tm].findings.push({ kind: "link", where: "outbound", detail: b.status + " " + b.url }); }); });
  }

  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(out, "report.json"), JSON.stringify(report, null, 1));

  // The summary: by kind, then the worst teams, then the slowest loads.
  var byKind = {};
  Object.keys(report.teams).forEach(function (tm) {
    report.teams[tm].findings.forEach(function (f) { (byKind[f.kind] = byKind[f.kind] || []).push(tm + " | " + f.where + " | " + f.detail); });
  });
  console.log("\n== Sweep of " + TEAMS.length + " teams at " + WIDTHS.join(", ") + "px against " + base);
  Object.keys(byKind).sort().forEach(function (k) {
    console.log("\n-- " + k + ": " + byKind[k].length);
    byKind[k].slice(0, Number(process.env.SWEEP_LIST || 400)).forEach(function (l) { console.log("   " + l); });
  });
  console.log("\n-- empty states (sourcing gaps), by team:");
  Object.keys(report.teams).forEach(function (tm) { if (report.teams[tm].empty.length) console.log("   " + tm + ": " + report.teams[tm].empty.slice(0, 6).join(" / ")); });
  console.log("\n-- first load (390px): home ms / lcp / cls / requests / KB");
  Object.keys(report.teams).map(function (tm) { return [tm, (report.teams[tm].perf || {})[WIDTHS[0]] || {}]; })
    .sort(function (a, b) { return (b[1].homeMs || 0) - (a[1].homeMs || 0); })
    .forEach(function (x) { var p = x[1]; console.log("   PERF " + x[0] + " " + p.homeMs + " " + p.lcp + " " + p.cls + " " + p.requests + " " + p.kb); });
  if (report.links) console.log("\nlinks checked: " + report.links.checked + ", bad: " + report.links.bad.length);
}

main().catch(function (e) { console.error(e); process.exit(1); });
