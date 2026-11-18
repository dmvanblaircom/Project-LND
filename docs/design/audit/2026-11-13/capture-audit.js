/* Fresh full-product visual audit, 2026-11-13: every screen of the real app
   at the current commit, from the repository's own fixtures (the scenarios
   and answers are tools/capture.js's, loaded from it unchanged).

     node capture-audit.js REPO_ROOT OUT_DIR
   Env: AUDIT_ONLY (substring a shot's name must contain), PW_CHROMIUM.
   Names: <team>-<state>-<style>-<width>-<screen>-{top,full}.jpg           */
var fs = require("fs"), path = require("path"), os = require("os"), cp = require("child_process");
var chromium = require("playwright").chromium;
var REPO = path.resolve(process.argv[2]), out = path.resolve(process.argv[3]);
// tools/capture.js up to its shot list: the scenarios (SCEN), the answers
// (respond) and the fixtures they are built from.
var src = fs.readFileSync(path.join(REPO, "tools/capture.js"), "utf8");
src = src.slice(0, src.indexOf("// What to capture, per scenario"))
  .replace(/^#!.*\n/, "").replace('"use strict";', "")
  .replace('path.join(__dirname, "..")', JSON.stringify(REPO))
  .replace('require("./lib/serve")', "require(" + JSON.stringify(path.join(REPO, "tools/lib/serve")) + ")")
  .replace('path.resolve(process.argv[2] || "artifacts/capture")', JSON.stringify(out));
eval(src);                                            // defines SCEN, respond, serve, fx, st
var ONLY2 = process.env.AUDIT_ONLY || "";
var WIDTHS = [390, 1440];

var GAME = {
  pre: [["#game", "game-details"]],
  live: [["#game/drive", "game-drive"], ["#game/box", "game-box"], ["#game/plays", "game-plays"], ["#game/stats", "game-stats"]],
  final: [["#game/box", "game-box"], ["#game/plays", "game-plays"], ["#game/stats", "game-stats"]]
};
var DEST = [["#top25/games", "around-games"], ["#top25/rankings", "around-rankings"], ["#top25/rankings/ap", "around-rankings-ap"],
            ["#top25/rankings/coaches", "around-rankings-coaches"], ["#top25/rankings/fpi", "around-rankings-fpi"],
            ["#top25/rankings/sp-plus", "around-rankings-sp"], ["#outlook/playoff", "outlook-playoff"], ["#outlook/title", "outlook-title"],
            ["#roster/depth", "roster-depth"], ["#roster/roster", "roster-list"], ["#roster/availability", "roster-availability"],
            ["#roster/prospects", "roster-prospects"], ["#more", "more"], ["#schedule", "schedule"], ["#schedule/results", "schedule-results"],
            ["#news", "news"], ["#stats/team", "stats-team"], ["#stats/players", "stats-players"], ["#settings", "settings"],
            ["#about", "about"], ["#feedback", "feedback"]];
var OFF = [["#home", "home"], ["#top25/games", "around-games"], ["#top25/rankings", "around-rankings"], ["#game", "game"],
           ["#schedule", "schedule"], ["#schedule/results", "schedule-results"], ["#roster/roster", "roster-list"],
           ["#roster/prospects", "roster-prospects"], ["#more", "more"], ["#news", "news"], ["#stats/team", "stats-team"]];
var JOBS = [];
["nd", "osu"].forEach(function (t) {
  ["pre", "live", "final"].forEach(function (s) {
    WIDTHS.forEach(function (w) { ["team", "suite"].forEach(function (style) {
      JOBS.push({ scen: t + "-" + s, width: w, style: style, shots: [["#home", "home"]].concat(GAME[s]) });
    }); });
  });
  WIDTHS.forEach(function (w) { ["team", "suite"].forEach(function (style) {
    JOBS.push({ scen: t + "-pre", width: w, style: style, shots: DEST });
    JOBS.push({ scen: t + "-off", width: w, style: style, shots: OFF });
  }); });
});

function ctxOpts(width, extra) {
  var phone = width < 600;
  return Object.assign({ viewport: { width: width, height: phone ? 844 : 900 }, deviceScaleFactor: phone ? 2 : 1,
                         serviceWorkers: "block", timezoneId: "America/New_York", locale: "en-US" }, extra || {});
}
async function snap(page, name, log, note) {
  await page.evaluate(function () { window.scrollTo(0, 0); });
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(out, name + "-top.jpg"), type: "jpeg", quality: 72 });
  var vp = page.viewportSize();
  var h = await page.evaluate(function () { return document.documentElement.scrollHeight; });
  if (h > vp.height + 4) {
    await page.setViewportSize({ width: vp.width, height: Math.min(8000, h) });
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(out, name + "-full.jpg"), type: "jpeg", quality: 64 });
    await page.setViewportSize(vp);
    await page.waitForTimeout(100);
  }
  var info = await page.evaluate(function () {
    var de = document.documentElement;
    return { hash: location.hash, wide: de.scrollWidth > de.clientWidth, height: de.scrollHeight,
             h1: (document.querySelector("h1:not(.sr-only)") || {}).textContent || "" };
  });
  log.push(Object.assign({ name: name, note: note || "" }, info));
}
function router(base, sc, mode, blocked) {
  return function (route) {
    var u = route.request().url();
    if (u.startsWith(base)) {
      // "cold": a first visit with nothing reachable but the shell itself
      if (mode === "cold" && /\/data\//.test(u)) return route.abort();
      return route.continue();
    }
    if (mode === "cold") return route.abort();
    var body = respond(sc, u);
    if (mode === "slow" && body) return new Promise(function (r) { setTimeout(r, 6000); }).then(function () {
      return route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: body }); });
    if (body) return route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: body });
    if (/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(u)) return route.continue();
    if (/^https:\/\/a\.espncdn\.com\//.test(u) || /^https:\/\/[^/]+\/.*\.(png|jpe?g|webp|svg|gif)(\?|$)/i.test(u)) return route.continue();
    if (blocked) blocked[u.split("?")[0].slice(0, 90)] = 1;
    return route.abort();
  };
}
async function open(browser, base, sc, width, style, hash, opts) {
  opts = opts || {};
  var ctx = await browser.newContext(ctxOpts(width, opts.ctx));
  var page = await ctx.newPage(), errors = [], blocked = {};
  page.on("pageerror", function (e) { errors.push(String(e).slice(0, 200)); });
  await page.clock.setSystemTime(new Date(sc.now));
  await ctx.addInitScript(function (a) {
    try { localStorage.setItem("suite-style", a.style); if (a.favs) localStorage.setItem("suite-favorites", JSON.stringify(a.favs)); } catch (e) {}
  }, { style: style, favs: opts.favs || null });
  await ctx.route("**/*", router(base, sc, opts.mode, blocked));
  await page.goto(base + "/?team=" + sc.team + hash, { waitUntil: "domcontentloaded" });
  if (!opts.early) {
    await page.waitForFunction(function () { return !document.getElementById("launch"); }, null, { timeout: 15000 }).catch(function () {});
    await page.waitForTimeout(1800);
  }
  return { ctx: ctx, page: page, errors: errors, blocked: blocked };
}
// Every context's page errors go in the log, whatever it captured (Codex,
// #260: the interaction and state captures closed without recording them).
async function done(o, job, log) {
  log.push({ job: job, errors: o.errors, blocked: Object.keys(o.blocked || {}) });
  await o.ctx.close();
}
async function go(page, hash, wait) {
  await page.evaluate(function (h) { location.hash = h; window.scrollTo(0, 0); }, hash);
  await page.waitForTimeout(wait || 1200);
}

(async function () {
  fs.mkdirSync(out, { recursive: true });
  var server = serve(REPO);
  await new Promise(function (r) { server.listen(0, "127.0.0.1", r); });
  var base = "http://127.0.0.1:" + server.address().port;
  var browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined });
  var log = [];
  function want(n) { return !ONLY2 || n.indexOf(ONLY2) !== -1; }

  // ---- the matrix: every screen, both teams, both styles, both widths ----
  for (var job of JOBS) {
    var sc = SCEN[job.scen];
    var names = job.shots.map(function (s) { return job.scen + "-" + job.style + "-" + job.width + "-" + s[1]; });
    if (!names.some(want)) continue;
    var o = await open(browser, base, sc, job.width, job.style, job.shots[0][0]);
    for (var i = 0; i < job.shots.length; i++) {
      if (i > 0) await go(o.page, job.shots[i][0]);
      if (want(names[i])) await snap(o.page, names[i], log, job.shots[i][0]);
    }
    log.push({ job: job.scen + "-" + job.style + "-" + job.width, errors: o.errors, blocked: Object.keys(o.blocked) });
    await o.ctx.close();
  }

  // ---- interactions and states, Notre Dame unless said ----
  for (var w of WIDTHS) {
    var pre = SCEN["nd-pre"], fin = SCEN["nd-final"], tag = "nd-x-team-" + w + "-";
    if (want(tag)) {
      // a Top 25 game opened in its sheet; a finished game opened from Results
      var a = await open(browser, base, pre, w, "team", "#top25/games");
      var gid = await a.page.evaluate(function () { var l = document.querySelector('#screenTop25 a[href^="#top25/games/"]'); return l ? l.getAttribute("href") : null; });
      if (gid) { await go(a.page, gid, 1800); await snap(a.page, tag + "around-game-sheet", log, gid); }
      else log.push({ name: tag + "around-game-sheet", missing: "no game link on Around" });
      // roster: a search, and honors opened
      await go(a.page, "#roster/roster");
      await a.page.fill("#rosterQ", "wr").catch(function () {});
      await a.page.waitForTimeout(500);
      await snap(a.page, tag + "roster-search", log, "search: wr");
      await a.page.fill("#rosterQ", "zzzz").catch(function () {});
      await a.page.waitForTimeout(500);
      await snap(a.page, tag + "roster-search-none", log, "search with no match");
      await a.page.fill("#rosterQ", "").catch(function () {});
      await a.page.evaluate(function () { var d = document.querySelector("#screenRoster details.ro-honors"); if (d) d.open = true; });
      await done(a, tag + "around-roster", log);
      var f = await open(browser, base, fin, w, "team", "#schedule/results");
      var rid = await f.page.evaluate(function () { var l = document.querySelector('#screenSchedule a[href^="#schedule/4"]'); return l ? l.getAttribute("href") : null; });
      if (rid) { await go(f.page, rid, 1800); await snap(f.page, tag + "schedule-game-opened", log, rid); }
      else log.push({ name: tag + "schedule-game-opened", missing: "no result link" });
      await done(f, tag + "schedule-opened", log);
      // Your Teams: the header's switcher, with two more teams starred
      var s = await open(browser, base, pre, w, "team", "#home", { favs: ["notre-dame", "ohio-state", "toledo"] });
      await s.page.waitForTimeout(2200);
      await s.page.click("#barContext").catch(function () {});
      await s.page.waitForTimeout(700);
      await snap(s.page, tag + "your-teams-sheet", log, "header team switcher");
      await done(s, tag + "your-teams", log);
      // nothing reachable on a first visit: every provider and snapshot fails
      var c = await open(browser, base, pre, w, "team", "#home", { mode: "cold" });
      await c.page.waitForTimeout(2500);
      for (var r of [["#home", "home"], ["#top25/games", "around-games"], ["#top25/rankings", "around-rankings"], ["#game", "game"],
                     ["#roster/roster", "roster-list"], ["#roster/depth", "roster-depth"], ["#news", "news"], ["#stats/team", "stats-team"],
                     ["#schedule", "schedule"], ["#settings", "settings"]]) {
        await go(c.page, r[0], 1500); await snap(c.page, tag + "unavailable-" + r[1], log, "no provider or snapshot reachable");
      }
      await done(c, tag + "unavailable", log);
      // loading: the first second of a slow network
      var l = await open(browser, base, pre, w, "team", "#home", { mode: "slow", early: true });
      await l.page.waitForFunction(function () { return !document.getElementById("launch"); }, null, { timeout: 15000 }).catch(function () {});
      await l.page.waitForTimeout(300);
      await snap(l.page, tag + "loading-home", log, "providers answering after 6 s");
      await go(l.page, "#top25/games", 400); await snap(l.page, tag + "loading-around", log, "");
      await go(l.page, "#roster/roster", 400); await snap(l.page, tag + "loading-roster", log, "");
      await done(l, tag + "loading", log);
      // offline after a good load
      var of = await open(browser, base, pre, w, "team", "#home");
      await of.ctx.setOffline(true);
      await of.page.evaluate(function () { window.dispatchEvent(new Event("offline")); });
      await go(of.page, "#settings", 1200); await snap(of.page, tag + "offline-settings", log, "offline after loading");
      await of.page.click("#screenSettings [data-refresh]").catch(function () {});
      await of.page.waitForTimeout(2500);
      await snap(of.page, tag + "offline-refresh-result", log, "Refresh Data while offline");
      await go(of.page, "#home", 1200); await snap(of.page, tag + "offline-home", log, "");
      await done(of, tag + "offline", log);
      // the system's dark setting: does anything change?
      var d = await open(browser, base, pre, w, "team", "#home", { ctx: { colorScheme: "dark" } });
      await snap(d.page, tag + "os-dark-home", log, "prefers-color-scheme: dark");
      await go(d.page, "#roster/roster"); await snap(d.page, tag + "os-dark-roster", log, "prefers-color-scheme: dark");
      await done(d, tag + "os-dark", log);
      var ds = await open(browser, base, pre, w, "suite", "#home", { ctx: { colorScheme: "dark" } });
      await snap(ds.page, "nd-x-suite-" + w + "-os-dark-home", log, "prefers-color-scheme: dark, Suite Style");
      await done(ds, "nd-x-suite-" + w + "-os-dark", log);
    }
    // the chooser and the launch
    if (want("chooser") || want("launch")) {
      var c2 = await browser.newContext(ctxOpts(w));
      var p2 = await c2.newPage(), cErrors = [];
      p2.on("pageerror", function (e) { cErrors.push(String(e).slice(0, 200)); });
      await c2.route("**/*", function (r) { var u = r.request().url(); return u.startsWith(base) || /fonts\.(googleapis|gstatic)|espncdn/.test(u) ? r.continue() : r.abort(); });
      await p2.goto(base + "/", { waitUntil: "domcontentloaded" });
      await p2.waitForTimeout(2500);
      await snap(p2, "chooser-" + w, log, "no team chosen");
      var q = await p2.$('input[type="search"], input[type="text"]');
      if (q) { await q.fill("state"); await p2.waitForTimeout(600); await snap(p2, "chooser-" + w + "-search", log, "search: state");
               await q.fill("zzzz"); await p2.waitForTimeout(600); await snap(p2, "chooser-" + w + "-search-none", log, "search with no match"); }
      await p2.goto(base + "/?team=notre-dame", { waitUntil: "commit" });
      await p2.waitForTimeout(450);
      await p2.screenshot({ path: path.join(out, "launch-" + w + "-top.jpg"), type: "jpeg", quality: 72 });
      log.push({ name: "launch-" + w, note: "the launch screen, 450 ms in" });
      await p2.goto(base + "/?team=ohio-state", { waitUntil: "commit" });
      await p2.waitForTimeout(450);
      await p2.screenshot({ path: path.join(out, "launch-osu-" + w + "-top.jpg"), type: "jpeg", quality: 72 });
      log.push({ job: "chooser-launch-" + w, errors: cErrors, blocked: [] });
      await c2.close();
    }
  }
  fs.writeFileSync(path.join(out, "capture-log.json"), JSON.stringify(log, null, 1));
  await browser.close(); server.close();
  console.log("done", log.filter(function (l) { return l.name; }).length, "shots");
})().catch(function (e) { console.error(e); process.exit(1); });
