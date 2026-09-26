#!/usr/bin/env node
/* Stress the app the way fans and networks will, beyond the CI gates.
   Written for the Suite release's regression pass (2026-09-25); kept as a
   tool to run before any release (.github/workflows/stress.yml, on demand).

   Scenarios (all by default, or name them as arguments):
     crawl       every reachable route, both teams, both App Styles, at 320,
                 390, 768 and 1280 - checked for page errors, "undefined"/
                 "NaN" text, overflow, broken images, duplicate ids, unnamed
                 controls, the title and the nav state
     deeplinks   hostile hashes and query strings; a bad team link opens the
                 chooser, or the fan's own team - never someone else's
     outage      the provider aborting, 500s, invalid JSON, {} and slow
                 answers: every screen stays honest, and recovers
     race        150 random route changes and Back/Forward under slow data
     switchteam  nothing of the previous team leaks into the next
     storage     corrupt and legacy localStorage; App Style round trips
     offline     the real worker: reopen offline, then a never-visited team
     upgrade     the previous release (PREVIOUS_ROOT, a tree of it) to this
                 one on the same origin: one open, one reload, only this
                 version's caches. Skipped without PREVIOUS_ROOT.

   Provider answers come from the committed fixtures; no network is used.
   Usage:  node tools/stresscheck.js [scenario ...]
   Locally: NODE_PATH=$(npm root -g) PW_CHROMIUM=/path/to/chromium PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS=1 \
            node tools/stresscheck.js */
"use strict";
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = "1";
var fs = require("fs"), http = require("http"), path = require("path");
var chromium = require("playwright").chromium;

var repo = path.join(__dirname, "..");
var SERVE = { root: repo };
var FX = path.join(repo, "tools", "fixtures");
function fx(f) { return fs.readFileSync(path.join(FX, f)); }
function mime(f) {
  return f.endsWith(".html") ? "text/html" : f.endsWith(".css") ? "text/css" : f.endsWith(".js") ? "text/javascript" :
    f.endsWith(".json") ? "application/json" : f.endsWith(".svg") ? "image/svg+xml" : f.endsWith(".png") ? "image/png" :
    f.endsWith(".webmanifest") ? "application/manifest+json" : "application/octet-stream";
}
var notFound = [];
var server = http.createServer(function (req, res) {
  var p = new URL(req.url, "http://x").pathname;
  var file = path.join(SERVE.root, p === "/" ? "index.html" : decodeURIComponent(p.slice(1)));
  if (!file.startsWith(SERVE.root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    // expected: a bad team id's missing config, and anything an older release asks for
    // (the Irish Watch page, in the moments before an update reloads it, asks for its own icons)
    if (SERVE.root === repo && !/favicon\.ico$/.test(p) && !/^\/teams\/(bogus|not-a-team)\.js$/.test(p) &&
        !/^\/assets\/notre-dame\//.test(p)) notFound.push(p);
    res.writeHead(404); res.end("nf"); return;
  }
  res.writeHead(200, { "content-type": mime(file), "cache-control": "no-store" });
  fs.createReadStream(file).pipe(res);
});

var ROSTERS = { "87": "espn-roster-nd-sep24.json", "194": "espn-roster-osu-sep24.json" };
var NEWS = { "87": "espn-news-nd-sep24.json", "194": "espn-news-osu-sep24.json" };
function body(url) {
  if (/\/teams\/\d+\/schedule(?:\?|$)/.test(url)) return fx("espn-schedule.json");
  if (/\/scoreboard\?/.test(url)) return fx("espn-scoreboard-sep26.json");
  if (/\/rankings(?:\?|$)/.test(url)) return fx("espn-rankings-sep20.json");
  var ro = /\/teams\/(\d+)\/roster(?:\?|$)/.exec(url);
  if (ro) return fx(ROSTERS[ro[1]] || "espn-roster.json");
  var nw = /\/news\?team=(\d+)/.exec(url);
  if (nw) return fx(NEWS[nw[1]] || "espn-news.json");
  if (/\/summary\?/.test(url)) return fx("espn-summary-pre.json");
  if (/\/statistics(?:\?|$)/.test(url)) return fx("espn-season-stats.json");
  if (/\/teams\/\d+(?:\?|$)/.test(url)) return fx("espn-team.json");
  return null;
}

var problems = [], checks = 0;
function bad(scn, where, what) { problems.push(scn + " | " + where + " | " + what); }
var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
var BASE;

// mode: "ok" | "abort" | "500" | "badjson" | "empty" | "slow"
async function openPage(browser, o) {
  o = o || {};
  var ctx = await browser.newContext({ viewport: { width: o.width || 390, height: 844 },
    serviceWorkers: o.worker ? "allow" : "block", timezoneId: "America/New_York", locale: "en-US" });
  if (o.storage) await ctx.addInitScript(function (s) {
    if (sessionStorage.getItem("__seeded")) return;
    sessionStorage.setItem("__seeded", "1");
    for (var k in s) localStorage.setItem(k, s[k]);
  }, o.storage);
  var page = await ctx.newPage();
  var log = { errors: [], console: [], reqFail: [] };
  page.on("pageerror", function (e) { log.errors.push(String(e && e.stack || e).split("\n").slice(0, 3).join(" / ")); });
  page.on("console", function (m) { if (m.type() === "error") log.console.push(m.text()); });
  var state = { mode: o.mode || "ok", n: 0 };
  var handler = async function (route) {
    var u = route.request().url();
    if (u.startsWith(BASE)) return route.continue();
    if (/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(u)) return route.abort();
    var b = body(u);
    if (!b) return route.abort();
    state.n++;
    var m = state.mode;
    if (m === "abort") return route.abort();
    if (m === "500") return route.fulfill({ status: 500, body: "" });
    if (m === "badjson") return route.fulfill({ status: 200, contentType: "application/json", body: "<html>oops" });
    if (m === "empty") return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    if (m === "slow") await wait(2500 + Math.random() * 2000);
    try { return await route.fulfill({ status: 200, contentType: "application/json", body: b }); } catch (e) { }
  };
  if (o.worker) await ctx.route("**/*", handler); else await page.route("**/*", handler);
  return { ctx: ctx, page: page, log: log, state: state };
}

// What a fan must never see, on whatever is showing.
async function inspect(page, scn, where, opts) {
  opts = opts || {};
  checks++;
  var r = await page.evaluate(function () {
    var vis = function (el) { var s = getComputedStyle(el); var b = el.getBoundingClientRect(); return s.display !== "none" && s.visibility !== "hidden" && b.width > 0 && b.height > 0; };
    var text = document.body.innerText || "";
    var over = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    var imgs = [].filter.call(document.images, function (i) { return vis(i) && i.complete && i.naturalWidth === 0 && i.src.indexOf(location.origin) === 0; }).map(function (i) { return i.getAttribute("src"); });
    var wm = document.querySelector(".app-bar img.wordmark");
    var navCur = document.querySelectorAll("nav [aria-current='page'][data-screen]").length;
    var ids = {}, dup = [];
    [].forEach.call(document.querySelectorAll("[id]"), function (e) { if (ids[e.id]) dup.push(e.id); ids[e.id] = 1; });
    var noName = [].filter.call(document.querySelectorAll("a[href],button"), function (e) {
      return vis(e) && !(e.getAttribute("aria-label") || e.textContent.trim() || e.getAttribute("title") || e.querySelector("img[alt]:not([alt=''])"));
    }).map(function (e) { return e.outerHTML.slice(0, 80); });
    return {
      hash: location.hash, title: document.title,
      junk: (text.match(/\b(undefined|NaN|null|Infinity)\b|\[object [A-Za-z]+\]|Invalid Date/g) || []).slice(0, 5),
      lnd: /Project LND|Irish Watch/.test(text), over: over, imgs: imgs,
      wm: wm ? (wm.complete && wm.naturalWidth > 0) : null, wmVisible: wm ? vis(wm) : false,
      navCur: navCur, chooser: !!document.querySelector(".chooser:not([hidden]), #chooser:not([hidden])") && vis(document.querySelector(".chooser, #chooser")),
      dup: dup, noName: noName, textLen: text.trim().length
    };
  });
  if (r.junk.length) bad(scn, where, "junk text: " + r.junk.join(","));
  if (r.lnd) bad(scn, where, "shows Project LND / Irish Watch text");
  if (r.over > 1) bad(scn, where, "horizontal overflow " + r.over + "px");
  if (r.imgs.length) bad(scn, where, "broken same-origin image " + r.imgs.join(","));
  if (!opts.chooser && r.wm === false && r.wmVisible) bad(scn, where, "wordmark image not loaded");
  if (!opts.chooser && r.navCur !== 1 && !opts.noNav) bad(scn, where, "nav aria-current count " + r.navCur);
  if (r.dup.length) bad(scn, where, "duplicate ids " + r.dup.slice(0, 5).join(","));
  if (r.noName.length) bad(scn, where, "unnamed control " + r.noName[0]);
  if (r.textLen < 20) bad(scn, where, "near-empty page");
  if (!opts.chooser && !/ · Suite$/.test(r.title)) bad(scn, where, "title " + r.title);
  return r;
}
function flush(log, scn, where) {
  log.errors.splice(0).forEach(function (e) { bad(scn, where, "PAGEERROR " + e); });
  log.console.splice(0).forEach(function (e) {
    if (/net::ERR_FAILED|ERR_INTERNET_DISCONNECTED|Failed to load resource|ERR_NAME_NOT_RESOLVED|CORS/.test(e)) return;
    bad(scn, where, "console.error " + e.slice(0, 160));
  });
}
async function go(page, hash, ms) { await page.evaluate(function (h) { location.hash = h; }, hash); await page.waitForTimeout(ms || 450); }
async function links(page) {
  return page.evaluate(function () {
    var out = {};
    [].forEach.call(document.querySelectorAll("a[href^='#']"), function (a) {
      var s = getComputedStyle(a); if (s.display === "none" || s.visibility === "hidden") return;
      var h = a.getAttribute("href"); if (h.length > 1) out[h] = 1;
    });
    return Object.keys(out);
  });
}

// ---- scenarios ---------------------------------------------------------------
var S = {};

// 1. Crawl every reachable hash link: 2 teams x 4 widths x 2 styles.
S.crawl = async function (browser) {
  var widths = [320, 390, 768, 1280], total = 0;
  for (var team of ["notre-dame", "ohio-state"]) for (var style of ["team", "suite"]) for (var w of widths) {
    var scn = "crawl " + team + " " + style + " " + w;
    var p = await openPage(browser, { width: w, storage: { "suite-style": style } });
    await p.page.goto(BASE + "/?team=" + team + "#home"); await p.page.waitForTimeout(1500);
    var seen = {}, queue = ["#home", "#top25", "#game", "#roster", "#more", "#schedule", "#news", "#settings", "#feedback", "#about"];
    var cap = w === 390 ? 400 : 60;
    while (queue.length && Object.keys(seen).length < cap) {
      var h = queue.shift(); if (seen[h]) continue; seen[h] = 1;
      await go(p.page, h, 400);
      await inspect(p.page, scn, h); flush(p.log, scn, h);
      (await links(p.page)).forEach(function (l) { if (!seen[l]) queue.push(l); });
    }
    total += Object.keys(seen).length;
    if (w === 390) console.log("  " + scn + ": " + Object.keys(seen).length + " routes");
    await p.ctx.close();
  }
  console.log("crawl: " + total + " route renders");
};

// 2. Hostile deep links and query strings.
S.deeplinks = async function (browser) {
  var cases = ["#", "#nonsense", "#game/zzz", "#game/401858467", "#game/99999999", "#top25/zzz", "#top25/rankings/zzz",
    "#roster/zzz/yyy", "#roster/depth/zzz", "#more/news", "#more/zzz", "#schedule/zzz", "#schedule/123", "#schedule/results/9",
    "#%E2%9C%93", "#" + "a".repeat(3000), "#home/extra/parts", "#<script>alert(1)</script>", "#settings?x=1", "#HOME"];
  var p = await openPage(browser, {});
  await p.page.goto(BASE + "/?team=notre-dame#home"); await p.page.waitForTimeout(1200);
  for (var h of cases) {
    await p.page.goto(BASE + "/?team=notre-dame" + h); await p.page.waitForTimeout(700);
    await inspect(p.page, "deeplink", h.slice(0, 40)); flush(p.log, "deeplink", h.slice(0, 40));
  }
  // What each link lands on: [query, stored team, expected title]. "Suite"
  // is the chooser. Nobody is handed a team they did not choose.
  var expect = [["?team=bogus", null, "Suite"], ["?team=bogus", "ohio-state", "Ohio State · Suite"],
    ["?team=", null, "Suite"], ["?team=../../etc", null, "Suite"], ["?team=NOTRE-DAME", null, "Suite"],
    ["?team=notre-dame&team=ohio-state", null, "Notre Dame · Suite"], ["?change=1", null, "Suite"], ["", null, "Suite"]];
  for (var e of expect) {
    var c = await openPage(browser, e[1] ? { storage: { "iw-team": e[1] } } : {});
    await c.page.goto(BASE + "/" + e[0] + "#home"); await c.page.waitForTimeout(1500);
    var r = await c.page.evaluate(function () { return { t: document.title, store: localStorage.getItem("iw-team") }; });
    console.log("  '" + e[0] + "'" + (e[1] ? " (fan has " + e[1] + ")" : "") + " -> " + r.t);
    if (r.t !== e[2]) bad("query", e[0] + (e[1] ? " +" + e[1] : ""), "landed on '" + r.t + "', want '" + e[2] + "'");
    if (e[0] === "?team=bogus" && r.store === "bogus") bad("query", e[0], "the bad id was left stored");
    flush(c.log, "query", e[0]);
    await c.ctx.close();
  }
  await p.ctx.close();
};

// 3. Providers down / malformed / empty / slow: every screen still honest.
S.outage = async function (browser) {
  for (var mode of ["abort", "500", "badjson", "empty", "slow"]) for (var team of ["notre-dame", "ohio-state"]) {
    var scn = "outage-" + mode + " " + team;
    var p = await openPage(browser, { mode: mode });
    await p.page.goto(BASE + "/?team=" + team + "#home"); await p.page.waitForTimeout(mode === "slow" ? 5000 : 1500);
    for (var h of ["#home", "#top25", "#top25/rankings", "#game", "#roster", "#roster/roster", "#roster/availability", "#more", "#schedule", "#schedule/results", "#news", "#settings", "#feedback", "#about"]) {
      await go(p.page, h, mode === "slow" ? 1500 : 500);
      await inspect(p.page, scn, h); flush(p.log, scn, h);
    }
    if (mode !== "slow") {
      for (var hh of ["#home", "#game"]) {
        await go(p.page, hh, 800);
        var stuck = await p.page.evaluate(function () { var s = [].filter.call(document.querySelectorAll("[id^='screen']:not(#screenHead)"), function (x) { return !x.hidden; })[0]; return s ? s.innerText.trim() : ""; });
        if (/^Loading/.test(stuck)) bad(scn, hh, "still 'Loading' with the provider down: " + stuck.slice(0, 60));
      }
      // provider comes back: the screens recover
      p.state.mode = "ok";
      await p.page.evaluate(function () { dispatchEvent(new Event("online")); });
      await go(p.page, "#home", 1500);
      var home = await p.page.evaluate(function () { return document.getElementById("screenHome").innerText.length; });
      await go(p.page, "#top25", 1500);
      var t25 = await p.page.evaluate(function () { return document.querySelectorAll("#screenTop25 a[href^='#game'], #screenTop25 li, #screenTop25 .t25-row").length; });
      await inspect(p.page, scn, "recovered"); flush(p.log, scn, "recovered");
      if (t25 === 0) bad(scn, "recovered", "Top 25 did not recover after the provider came back");
      if (home < 200) bad(scn, "recovered", "Home did not recover after the provider came back (" + home + " chars)");
      console.log("  " + scn + ": recovered home=" + home + " chars, top25 rows=" + t25);
    }
    await p.ctx.close();
  }
};

// 4. Rapid navigation under slow data: races must not paint the wrong screen.
S.race = async function (browser) {
  var p = await openPage(browser, { mode: "slow" });
  await p.page.goto(BASE + "/?team=notre-dame#home"); await p.page.waitForTimeout(300);
  var routes = ["#home", "#top25", "#top25/rankings", "#game", "#roster", "#roster/roster", "#more", "#schedule", "#news", "#settings", "#about", "#schedule/results"];
  var seed = 7; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  for (var i = 0; i < 150; i++) {
    await p.page.evaluate(function (h) { location.hash = h; }, routes[Math.floor(rnd() * routes.length)]);
    await p.page.waitForTimeout(Math.floor(rnd() * 60));
  }
  for (var j = 0; j < 30; j++) { await p.page.goBack().catch(function () {}); await p.page.waitForTimeout(30); }
  for (j = 0; j < 15; j++) { await p.page.goForward().catch(function () {}); await p.page.waitForTimeout(30); }
  await p.page.waitForTimeout(6000);
  var r = await p.page.evaluate(function () {
    var shown = [].filter.call(document.querySelectorAll("[id^='screen']:not(#screenHead)"), function (s) { return !s.hidden && getComputedStyle(s).display !== "none" && s.getBoundingClientRect().height > 0; }).map(function (s) { return s.id; });
    return { hash: location.hash, shown: shown };
  });
  console.log("  race: settled on " + r.hash + ", visible " + r.shown.join(","));
  if (r.shown.length !== 1) bad("race", r.hash, "visible screens " + r.shown.join(","));
  var want = { home: "screenHome", top25: "screenTop25", game: "screenGame", roster: "screenRoster", more: "screenMore", schedule: "screenSchedule", news: "screenNews", settings: "screenSettings", about: "screenAbout" }[r.hash.slice(1).split("/")[0]];
  if (r.shown[0] !== want) bad("race", r.hash, "hash says " + want + " but " + r.shown[0] + " is visible");
  await inspect(p.page, "race", r.hash); flush(p.log, "race", "end");
  // timers must not stack: requests during 20s idle after the storm vs a fresh page
  p.state.mode = "ok"; p.state.n = 0; await p.page.waitForTimeout(20000); var stormN = p.state.n;
  var f = await openPage(browser, {}); await f.page.goto(BASE + "/?team=notre-dame" + r.hash); await f.page.waitForTimeout(3000);
  f.state.n = 0; await f.page.waitForTimeout(20000); var freshN = f.state.n;
  console.log("  idle provider requests in 20s: after storm " + stormN + ", fresh page " + freshN);
  if (stormN > freshN + 3) bad("race", "idle", "polling stacked after navigation storm: " + stormN + " vs " + freshN);
  await f.ctx.close(); await p.ctx.close();
};

// 5. Team switching: nothing of the old team leaks into the new one.
S.switchteam = async function (browser) {
  var p = await openPage(browser, {});
  await p.page.goto(BASE + "/?team=notre-dame#home"); await p.page.waitForTimeout(1500);
  for (var h of ["#roster", "#news", "#schedule", "#game"]) await go(p.page, h, 500);
  await p.page.goto(BASE + "/?team=ohio-state#home"); await p.page.waitForTimeout(1500);
  for (h of ["#home", "#roster", "#news", "#schedule", "#game", "#settings", "#about", "#feedback"]) {
    await go(p.page, h, 700);
    var r = await inspect(p.page, "switch", h);
    var leak = await p.page.evaluate(function () {
      var bar = document.querySelector(".app-bar"), s = [].filter.call(document.querySelectorAll("[id^='screen']:not(#screenHead)"), function (x) { return !x.hidden; })[0];
      return { bar: bar ? bar.innerText : "", title: document.title, fi: /Fighting Irish/.test((s && s.innerText) || "") };
    });
    if (!/Ohio State/.test(leak.title)) bad("switch", h, "title after switch " + leak.title);
    if (/Notre Dame|Fighting Irish/.test(leak.bar)) bad("switch", h, "header still ND: " + leak.bar.slice(0, 60));
    if (h !== "#game" && h !== "#schedule" && leak.fi) bad("switch", h, "'Fighting Irish' on an OSU screen");
    flush(p.log, "switch", h);
  }
  var ls = await p.page.evaluate(function () { return localStorage.getItem("iw-team"); });
  if (ls !== "ohio-state") bad("switch", "storage", "iw-team is " + ls);
  await p.page.goto(BASE + "/#home"); await p.page.waitForTimeout(1200);
  var t = await p.page.title();
  if (!/Ohio State/.test(t)) bad("switch", "reload without ?team", "stored team not restored: " + t);
  await p.ctx.close();
};

// 6. Garbage / legacy localStorage from today's app and hand-edited values.
S.storage = async function (browser) {
  var seeds = {
    "legacy-main": { "iw-team": "notre-dame", "iw-boot-notre-dame": JSON.stringify({ c: { primary: "#0C2340" }, newsLabel: "x", text: "#fff" }) },
    "garbage-json": { "iw-team": "notre-dame", "iw-boot-notre-dame": "{bad json", "iw-boot:suite": "{bad", "suite-style": "suite" },
    "bogus-values": { "iw-team": "not-a-team", "suite-style": "neon", "iw-geo": "[1,2" },
    "wrong-types": { "iw-team": "notre-dame", "iw-boot-notre-dame": "42", "iw-boot:suite": "[]", "suite-style": "suite" },
    "huge": { "iw-team": "ohio-state", "iw-boot-ohio-state": JSON.stringify({ junk: "x".repeat(500000) }) }
  };
  for (var name in seeds) {
    var p = await openPage(browser, { storage: seeds[name] });
    await p.page.goto(BASE + "/#home"); await p.page.waitForTimeout(1500);
    var chooser = await p.page.evaluate(function () { return !/ · Suite$/.test(document.title); });
    var t = await p.page.title();
    console.log("  storage " + name + " -> " + t);
    if (name === "bogus-values" && t !== "Suite") bad("storage " + name, "load", "a stored team with no config should open the chooser, got " + t);
    if (!chooser) for (var h of ["#home", "#settings", "#top25"]) { await go(p.page, h, 600); await inspect(p.page, "storage " + name, h); }
    flush(p.log, "storage " + name, "load");
    await p.ctx.close();
  }
  // Settings: App Style switching back and forth, with a reload each time
  var s = await openPage(browser, {});
  await s.page.goto(BASE + "/?team=notre-dame#settings"); await s.page.waitForTimeout(1200);
  for (var i = 0; i < 6; i++) {
    var want = i % 2 ? "team" : "suite";
    await s.page.check("input[name][value='" + want + "']").catch(function (e) { bad("style", "toggle", "no radio " + want); });
    await s.page.waitForTimeout(300);
    await s.page.reload(); await s.page.waitForTimeout(1000);
    var got = await s.page.evaluate(function () { return localStorage.getItem("suite-style"); });
    if (got !== want) bad("style", "toggle " + i, "stored " + got);
    await inspect(s.page, "style " + want, "#settings"); flush(s.log, "style", want);
  }
  await s.ctx.close();
};

// 7. Offline with the real worker: first visit, then offline, reload, walk.
S.offline = async function (browser) {
  var p = await openPage(browser, { worker: true });
  await p.page.goto(BASE + "/?team=notre-dame#home");
  await p.page.waitForFunction(function () { return navigator.serviceWorker.controller; }, null, { timeout: 20000 }).catch(function () { bad("offline", "setup", "worker never took control"); });
  for (var h of ["#top25", "#roster", "#news", "#schedule", "#game"]) await go(p.page, h, 900);
  await p.page.waitForTimeout(1500);
  await p.ctx.setOffline(true);
  await p.page.reload(); await p.page.waitForTimeout(2000);
  for (h of ["#home", "#top25", "#top25/rankings", "#game", "#roster", "#roster/roster", "#more", "#schedule", "#news", "#settings", "#feedback", "#about"]) {
    await go(p.page, h, 600); var r = await inspect(p.page, "offline", h); flush(p.log, "offline", h);
  }
  await go(p.page, "#home", 800);
  var banner = await p.page.evaluate(function () { var b = document.querySelector("#screenHome .fresh-banner"); return b ? b.innerText : ""; });
  console.log("  offline reopen: Home says '" + banner + "'");
  if (!/offline/i.test(banner)) bad("offline", "#home", "no offline notice on Home after reopening offline");
  // cold offline in a fresh tab of the same context
  var p2 = await p.ctx.newPage(); var errs = []; p2.on("pageerror", function (e) { errs.push(String(e)); });
  await p2.goto(BASE + "/?team=ohio-state#home").catch(function (e) { bad("offline", "cold", "goto failed " + e.message); });
  await p2.waitForTimeout(2000);
  await inspect(p2, "offline cold OSU (never visited)", "#home");
  errs.forEach(function (e) { bad("offline", "cold", "PAGEERROR " + e); });
  await p.ctx.setOffline(false);
  await p.ctx.close();
};

// 8. Upgrade from today's production (main) to this release, same origin.
S.upgrade = async function (browser) {
  var MAIN = process.env.PREVIOUS_ROOT;
  var ver = function (root) { return (/var VERSION = "([^"]+)"/.exec(fs.readFileSync(path.join(root, "sw.js"), "utf8")) || [])[1]; };
  if (!MAIN) { console.log("  skipped: set PREVIOUS_ROOT to a tree of the previous release"); return; }
  if (ver(MAIN) === ver(repo)) { console.log("  skipped: the previous tree has this VERSION (" + ver(repo) + "), so there is no update"); return; }
  SERVE.root = MAIN;
  var p = await openPage(browser, { worker: true });
  await p.page.goto(BASE + "/?team=notre-dame");
  await p.page.waitForFunction(function () { return navigator.serviceWorker.controller; }, null, { timeout: 20000 });
  await p.page.waitForTimeout(3000);
  var before = await p.page.evaluate(async function () { return { keys: await caches.keys(), title: document.title, team: localStorage.getItem("iw-team") }; });
  console.log("  on the previous release: " + before.title + " caches=" + before.keys.join(","));
  SERVE.root = repo;                       // the deploy lands
  var docs = 0; p.page.on("framenavigated", function (f) { if (f === p.page.mainFrame()) docs++; });
  await p.page.goto(BASE + "/?team=notre-dame", { waitUntil: "commit" });   // ONE open; the new worker does the rest
  var tt = Date.now(); while (Date.now() - tt < 15000 && docs < 2) await p.page.waitForTimeout(100);
  await p.page.waitForTimeout(2500);
  console.log("  one open after the deploy: " + docs + " documents, Suite after " + (Date.now() - tt - 2500) + "ms");
  if (docs !== 2) bad("upgrade", "reload", "expected the old page then one reload, got " + docs + " documents");
  var after = await p.page.evaluate(async function () {
    var v = await new Promise(function (res) { var ch = new MessageChannel(); ch.port1.onmessage = function (e) { res(e.data && e.data.version); };
      navigator.serviceWorker.controller.postMessage({ type: "version" }, [ch.port2]); setTimeout(function () { res(null); }, 4000); });
    var wm = document.querySelector(".app-bar img.wordmark");
    return { v: v, keys: await caches.keys(), title: document.title, wm: !!wm && wm.complete && wm.naturalWidth > 0,
             legacy: !!document.querySelector("link[href*='legacy.css']"), manifest: document.querySelector("link[rel=manifest]").href };
  });
  var want = /var VERSION = "([^"]+)"/.exec(fs.readFileSync(path.join(repo, "sw.js"), "utf8"))[1];
  console.log("  after deploy: " + after.title + " v=" + after.v + " caches=" + after.keys.join(",") + " wordmark=" + after.wm);
  if (after.v !== want) bad("upgrade", "version", "worker reports " + after.v + " want " + want);
  if (after.keys.some(function (k) { return k.indexOf(want + "-") !== 0 && /^(iw|suite)-20/.test(k); })) bad("upgrade", "caches", "old cache left: " + after.keys.join(","));
  if (!after.wm) bad("upgrade", "header", "wordmark not loaded after upgrade");
  if (after.legacy) bad("upgrade", "css", "legacy.css still linked");
  if (!/ · Suite$/.test(after.title)) bad("upgrade", "title", after.title);
  for (var h of ["#home", "#top25", "#game", "#roster", "#more", "#settings"]) { await go(p.page, h, 600); await inspect(p.page, "upgrade", h); }
  flush(p.log, "upgrade", "after");
  // and offline right after the upgrade: the new shell is complete
  await p.ctx.setOffline(true); await p.page.reload(); await p.page.waitForTimeout(2000);
  for (h of ["#home", "#more", "#about"]) { await go(p.page, h, 500); await inspect(p.page, "upgrade-offline", h); }
  flush(p.log, "upgrade-offline", "after");
  await p.ctx.close();
};

(async function () {
  await new Promise(function (r) { server.listen(0, "127.0.0.1", r); });
  BASE = "http://127.0.0.1:" + server.address().port;
  var browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined });
  var which = process.argv.slice(2); if (!which.length) which = Object.keys(S);
  for (var k of which) {
    var t0 = Date.now(); console.log("== " + k);
    try { await S[k](browser); } catch (e) { bad(k, "harness", "threw " + (e.stack || e).split("\n").slice(0, 2).join(" ")); }
    console.log("   (" + Math.round((Date.now() - t0) / 1000) + "s)");
  }
  await browser.close(); server.close();
  var nf = {}; notFound.forEach(function (p) { nf[p] = 1; });
  if (Object.keys(nf).length) problems.push("server | 404s | " + Object.keys(nf).join(", "));
  var uniq = {}; problems.forEach(function (p) { uniq[p] = (uniq[p] || 0) + 1; });
  console.log("\n" + checks + " screen inspections; " + Object.keys(uniq).length + " distinct problem(s)");
  Object.keys(uniq).forEach(function (p) { console.log("  PROBLEM x" + uniq[p] + "  " + p); });
  process.exit(Object.keys(uniq).length ? 1 : 0);
})();
