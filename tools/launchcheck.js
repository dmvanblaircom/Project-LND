#!/usr/bin/env node
/* The launch screen (index.html, app.js liftLaunchWhenReady; David,
   2026-10-01: "about 3 seconds and clean", as Sleeper's is).

   - up on the very first paint, before any script runs, with the wordmark
     drawn inline: nothing to load, so it never pops in, and it never moves
     while the letters animate
   - it plays its animation (about 2.6 seconds) and only then lifts - and
     only once the screen is complete: every first request answered and every
     image in view loaded. A late answer (news after 3.5s) holds it; when it
     lifts, the hero has its game and the news its stories
   - never more than 6 seconds, however slow the network
   - lifted by its own inline style at 7 seconds if app.js never runs
   - an update's reload carries the animation on from where it was
   - a new version found on this open: the launch holds until the worker's
     reload, so the page never shows between two launches (David,
     2026-10-01: the nav flashed up before the launch faded), up to 10
     seconds; an install slower than that lifts it once and the reload does
     not play it again
   - never on the chooser; hidden from assistive technology

   Usage: node tools/launchcheck.js     (exit 1 on failure) */
"use strict";
// The worker's own requests go through this check's routes too, as in
// moreflowcheck and rosterflowcheck. Unrouted, an old worker's fetch to the
// real ESPN stayed open for as long as the network took, and Chrome activates
// a waiting update only once the old worker has no fetch open: on a slow
// answer, "a page that does not answer" never saw its reload (#198, #200,
// #202). Routed, each answers from its fixture in 150 ms.
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = "1";

var fs = require("fs"), path = require("path");
var chromium = require("playwright").chromium;
var root = path.join(__dirname, "..");
var serve = require("./lib/serve");
var FX = path.join(root, "tools", "fixtures");
var LOGO = fs.readFileSync(path.join(root, "assets", "suite", "favicon-64.png"));

var failures = 0;
function ok(cond, what) { if (cond) { console.log("  ok   " + what); return; } failures++; console.log("  FAIL " + what); }

function fixture(url) {
  var f = /\/schedule\?seasontype=3/.test(url) ? "espn-schedule-nd-2025-post.json"
        : /\/schedule(\?|$)/.test(url) ? "espn-schedule.json"
        : /\/scoreboard\?/.test(url) ? "espn-scoreboard-sep26.json"
        : /\/rankings/.test(url) ? "espn-rankings-sep20.json"
        : /\/news\?/.test(url) ? "espn-news-nd-sep24.json"
        : /\/summary\?/.test(url) ? "espn-summary-pre.json"
        : /\/statistics/.test(url) ? "espn-season-stats.json"
        : /\/teams\/\d+\/roster/.test(url) ? "espn-roster.json"
        : /\/teams\/\d+(\?|$)/.test(url) ? "espn-team.json" : null;
  return f ? fs.readFileSync(path.join(FX, f)) : null;
}

(async function () {
  var server = serve(root);
  await new Promise(function (r) { server.listen(0, "127.0.0.1", r); });
  var base = "http://127.0.0.1:" + server.address().port;
  // No real network: every outside request is either answered by a route
  // below or fails at once. A worker's own requests are routed on some runs
  // and not others, and the ones that were not went to the real ESPN, Kalshi
  // and weather services from the runner. One that hung kept the old worker
  // busy, and the browser does not activate a new worker while the old one
  // still has a request out: the update's reload came 26 seconds late and
  // the launch lifted at its 10-second limit (probe, CI, 2026-10-20).
  var browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined,
    args: ["--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost"] });

  // opts: delay (ms) for the providers' answers, newsDelay for news alone,
  // noApp to make app.js fail to load, startedAgo to resume a launch begun
  // that long ago (an update's reload), lastDay for the device's last launch
  // that many days ago
  async function open(url, opts) {
    opts = opts || {};
    var ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
    var page = await ctx.newPage();
    await page.route("**/*", async function (route) {
      var u = route.request().url();
      if (u.startsWith(base)) {
        if (opts.noApp && /\/app\.js$/.test(u)) return route.abort();
        // early: what the page looks like before the parser reaches the
        // launch - the moment iOS can paint a reloaded page
        if (opts.early && route.request().resourceType() === "document") {
          var r = await route.fetch(), html = await r.text();
          return route.fulfill({ response: r, body: html.replace("<body>", "<body><script>window.__early=[getComputedStyle(document.documentElement).backgroundColor, getComputedStyle(document.body).backgroundColor].join(\" / \")</script>") });
        }
        return route.continue();
      }
      var body = fixture(u);
      if (body) {
        var wait = /\/news\?/.test(u) && opts.newsDelay != null ? opts.newsDelay : (opts.delay || 0);
        await new Promise(function (r) { setTimeout(r, wait); });
        return route.fulfill({ status: 200, contentType: "application/json", body: body });
      }
      if (/teamlogos|espncdn/.test(u)) { await new Promise(function (r) { setTimeout(r, opts.delay || 0); }); return route.fulfill({ status: 200, contentType: "image/png", body: LOGO }); }
      return route.abort();
    });
    await page.addInitScript(function (args) {
      var ago = args.ago;
      if (ago != null) { try { sessionStorage.setItem("suite-launch-at", String(Date.now() - ago)); } catch (e) {} }
      // lastDay: days since this device's last launch (0: earlier today)
      if (args.lastDay != null) { try { localStorage.setItem("suite-launch-day", new Date(Date.now() - args.lastDay * 864e5).toDateString()); } catch (e) {} }
      window.__first = null; window.__boxes = [];
      document.addEventListener("DOMContentLoaded", function () {
        var l = document.getElementById("launch"), m = l && l.querySelector(".launch-mark");
        window.__first = l ? getComputedStyle(l).visibility + "/" + getComputedStyle(l).opacity : "none";
        // where the wordmark sits, every 100ms while the screen is up
        (function watch() {
          var mm = document.querySelector("#launch .launch-mark");
          if (!mm || document.getElementById("launch").classList.contains("done")) return;
          var r = mm.getBoundingClientRect(); window.__boxes.push([Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)].join(","));
          setTimeout(watch, 100);
        })();
      });
    }, { ago: opts.startedAgo == null ? null : opts.startedAgo, lastDay: opts.lastDay == null ? null : opts.lastDay });
    var t0 = Date.now();
    await page.goto(base + url, { waitUntil: "commit" });
    return { ctx: ctx, page: page, t0: t0 };
  }
  async function liftedAt(o, limit) {
    await o.page.waitForFunction(function () { return window.__first !== null; });
    var deadline = Date.now() + limit;
    while (Date.now() < deadline) {
      var gone = await o.page.evaluate(function () {
        var l = document.getElementById("launch");
        return !l || getComputedStyle(l).visibility === "hidden" || l.classList.contains("done");
      });
      if (gone) return Date.now() - o.t0;
      await new Promise(function (r) { setTimeout(r, 25); });
    }
    return null;
  }
  function complete(page) {
    return page.evaluate(function () {
      var hero = document.querySelector("[data-home=hero] .home-hero");
      var stories = document.querySelectorAll("[data-home=news] li").length;
      var imgs = Array.prototype.slice.call(document.querySelectorAll("#screenHome img")).filter(function (i) {
        // The news rail extends sideways. An offscreen lazy image can stay
        // pending until scrolled into view; only intersecting images belong
        // to the complete first screen (the same bounds app.js uses).
        var r = i.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
      });
      return { card: !!(hero && hero.querySelector(".gamecard")), stories: stories,
               images: imgs.length, loaded: imgs.every(function (i) { return i.complete; }) };
    });
  }

  console.log("a normal first open");
  var a = await open("/?team=notre-dame#home", { delay: 300 });
  await a.page.waitForFunction(function () { return window.__first !== null; });
  ok(await a.page.evaluate(function () { return +sessionStorage.getItem("suite-launch-at") === window.SUITE_LAUNCH_AT; }),
     "a first open saves its launch clock for an update's reload");
  ok(/^visible\//.test(await a.page.evaluate(function () { return window.__first; })), "up on the first paint, before any script runs");
  ok(await a.page.evaluate(function () { var l = document.getElementById("launch"); return l.getAttribute("aria-hidden") === "true" && !!l.querySelector("svg .launch-l"); }),
     "the wordmark is drawn inline, letter by letter, and hidden from assistive technology");
  // The page beneath is the launch's navy while it is up: a strip iOS leaves
  // uncovered on a cold start shows navy, never white (David, 2026-10-25).
  function under(page) {
    return page.evaluate(function () { return [getComputedStyle(document.documentElement).backgroundColor, getComputedStyle(document.body).backgroundColor].join(" / "); });
  }
  var NAVY = "rgb(17, 29, 53)", beneath = await under(a.page);
  ok(beneath === NAVY + " / " + NAVY, "while it is up, the page beneath it is its navy, to the screen's foot (" + beneath + ")");
  // Below the screen's foot, where iOS can leave a strip uncovered, the nav
  // paints its own colour (white) - the launch must cover it there too
  // (David's iPhone, 2026-10-27).
  var foot = await a.page.evaluate(function () {
    var l = document.getElementById("launch"), n = document.querySelector(".navbar");
    var la = getComputedStyle(l, "::after"), na = n && getComputedStyle(n, "::after");
    return { content: la.content, pos: la.position, top: parseFloat(la.top), h: parseFloat(la.height), box: l.getBoundingClientRect().height,
             bg: la.backgroundColor, launchBg: getComputedStyle(l).backgroundColor,
             navH: na ? parseFloat(na.height) : 0, navTop: na ? na.position : "", above: +getComputedStyle(l).zIndex > +getComputedStyle(n).zIndex };
  });
  ok(foot.content !== "none" && foot.pos === "absolute" && foot.top >= foot.box - 1 && foot.h >= foot.navH && foot.navH > 0,
     "it reaches past the screen's foot as far as the nav's own extension does (" + foot.h + "px from " + foot.top + "px; the nav's " + foot.navH + "px)");
  ok(foot.bg === foot.launchBg && foot.above, "in its navy, and over the nav's white (" + foot.bg + ")");
  var t = await liftedAt(a, 8000), done = await complete(a.page);
  var after = await under(a.page);
  ok(after.indexOf(NAVY) < 0, "from the lift on, the page has its own colours (" + after + ")");
  ok(t != null && t >= 2600 && t < 4000, "it plays its animation, then lifts (" + t + " ms)");
  ok(await a.page.evaluate(function () { return getComputedStyle(document.querySelector("#launch .launch-mark")).transform === "none"; }),
     "the approved exit fades without enlarging the wordmark");
  ok(done.card && done.stories >= 3 && done.loaded, "by then the hero has its game, the news its stories, and every image in view has loaded (" + done.images + ")");
  var boxes = await a.page.evaluate(function () { return window.__boxes; });
  ok(boxes.length > 5 && boxes.every(function (b) { return b === boxes[0]; }), "the wordmark never moves or resizes while it is up (" + boxes.length + " samples)");
  ok(await a.page.evaluate(function () { return !document.querySelector("#launch img"); }), "and has no image to fetch: it cannot pop in");
  await a.page.waitForTimeout(700);
  ok(await a.page.evaluate(function () { return !document.getElementById("launch"); }), "then it is gone from the page");
  await a.ctx.close();

  // David, 2026-10-30: the whole launch on a day's first open; later that
  // day, the wordmark already drawn, then the page.
  console.log("a later open the same day");
  var sd = await open("/?team=notre-dame#home", { delay: 300, lastDay: 0 });
  await sd.page.waitForFunction(function () { return window.__first !== null; });
  ok(await sd.page.evaluate(function () {
    var l = document.querySelector("#launch .launch-l"), cs = getComputedStyle(l);
    return document.documentElement.getAttribute("data-launch") === "short" && cs.animationName === "none" && cs.opacity === "1";
  }), "the wordmark is there from the first paint, not drawn letter by letter");
  var tsd = await liftedAt(sd, 8000), csd = await complete(sd.page);
  ok(tsd != null && tsd >= 800 && tsd < 2000, "it lifts once the screen is complete, after 0.8 seconds at least (" + tsd + " ms)");
  ok(csd.card && csd.stories >= 3 && csd.loaded, "and the screen is just as complete under it");
  await sd.ctx.close();
  var nd = await open("/?team=notre-dame#home", { delay: 300, lastDay: 1 });
  await nd.page.waitForFunction(function () { return window.__first !== null; });
  var tnd = await liftedAt(nd, 8000);
  ok(!(await nd.page.evaluate(function () { return document.documentElement.hasAttribute("data-launch"); })) && tnd >= 2600,
     "the next day's first open plays the whole launch again (" + tnd + " ms)");
  ok(await nd.page.evaluate(function () { return localStorage.getItem("suite-launch-day") === new Date().toDateString(); }), "and marks the day as launched");
  await nd.ctx.close();
  var rs = await open("/?team=notre-dame#home", { delay: 300, lastDay: 0, startedAgo: 1200 });
  await rs.page.waitForFunction(function () { return window.__first !== null; });
  ok(!(await rs.page.evaluate(function () { return document.documentElement.hasAttribute("data-launch"); })),
     "an update's reload carries on the launch it began with, never switching to the short one midway");
  await rs.ctx.close();

  console.log("a late answer holds it");
  var b = await open("/?team=notre-dame#home", { delay: 100, newsDelay: 3500 });
  var tb = await liftedAt(b, 8000), cb = await complete(b.page);
  ok(tb != null && tb >= 3500 && cb.stories >= 3, "news after 3.5s: it waits, and lifts with the stories there (" + tb + " ms)");
  await b.ctx.close();

  console.log("a slow network");
  var c = await open("/?team=notre-dame#home", { delay: 9000 });
  var tc = await liftedAt(c, 9000);
  ok(tc != null && tc >= 5800 && tc < 7000, "never more than 6 seconds, whatever is still on its way (" + tc + " ms)");
  await c.ctx.close();

  console.log("app.js never runs");
  // And before the parser has reached it: an update reloads the page under
  // the launch, and iOS can paint the new page that early - white, between
  // two launches (David's iPhone, 2026-10-27).
  var ea = await open("/?team=notre-dame#home", { early: true });
  await ea.page.waitForFunction(function () { return window.__first !== null; });
  var early = await ea.page.evaluate(function () { return window.__early; });
  ok(early === NAVY + " / " + NAVY, "before the launch is parsed, the page is already its navy (" + early + ")");
  ok(await ea.page.evaluate(function () { var s = document.getElementById("page-swap"); return !!s && /@view-transition/.test(s.textContent); }),
     "a team's page takes part in a page swap, so an update's reload is held over rather than blanked");
  var eat = await liftedAt(ea, 8000), eafter = await under(ea.page);
  ok(eat != null && eafter.indexOf(NAVY) < 0, "and from the lift on it has its own colours (" + eafter + ")");
  await ea.ctx.close();
  var d = await open("/?team=notre-dame#home", { noApp: true });
  var td = await liftedAt(d, 9000);
  ok(td != null && td >= 6800 && td < 8000, "its own style lifts it (" + td + " ms): it can never trap a fan");
  await d.ctx.close();

  console.log("an update's reload");
  var e = await open("/?team=notre-dame#home", { startedAgo: 1500 });
  await e.page.waitForFunction(function () { return window.__first !== null; });
  var lt = await e.page.evaluate(function () { return document.documentElement.style.getPropertyValue("--launch-t"); });
  ok(/^-1[45]\d\dms$/.test(lt.trim()), "carries the animation on from where it was (" + lt.trim() + "), not from the start");
  var te = await liftedAt(e, 8000);
  ok(te != null && te < 2400, "and lifts on the same clock (" + te + " ms after the reload)");
  await e.ctx.close();

  console.log("a reload uses the first document's actual saved clock");
  // Do not seed storage: the old bootstrap's commented-out write passed
  // the seeded test above while restarting every actual first launch.
  var resumed = await open("/?team=notre-dame#home", { noApp: true });
  await resumed.page.waitForFunction(function () { return window.__first !== null; });
  var originalAt = await resumed.page.evaluate(function () { return window.SUITE_LAUNCH_AT; });
  await resumed.page.waitForTimeout(400);
  await resumed.page.reload({ waitUntil: "domcontentloaded" });
  ok(await resumed.page.evaluate(function (at) {
    return window.SUITE_LAUNCH_AT === at && +sessionStorage.getItem("suite-launch-at") === at &&
      parseFloat(document.documentElement.style.getPropertyValue("--launch-t")) <= -400;
  }, originalAt), "an unseeded reload carries on the same launch instead of starting over");
  await resumed.ctx.close();

  // A real update: a copy of the site, opened once so its worker installs,
  // then given a new VERSION and opened again. Every frame of every
  // document is logged.
  // install: how long the new worker's install takes - chooser.js, which
  // the install fetches and a team's page never does, held this long;
  // checkDelay: sw.js itself (the update check).
  // deaf: the open page is one from before the page reloaded itself - it
  // ignores the worker's word, so the worker must reload it.
  var SW_TRACE = "(" + function () {
    // to the check's own server: a worker's console does not reach the check
    function log() { var t = "LW|" + (typeof VERSION === "undefined" ? "?" : VERSION.slice(-5)) + "|" + [].join.call(arguments, " "); fetch("/__trace?" + encodeURIComponent(t)).catch(function () {}); }
    function who(c) { return c.id.slice(0, 6) + ":" + c.url.replace(/^[^?#]*\//, ""); }
    // Every fetch and waitUntil the worker leaves open, and when each closes:
    // Chrome activates a waiting update only once the old worker has none.
    var RW = FetchEvent.prototype.respondWith, WU = ExtendableEvent.prototype.waitUntil;
    FetchEvent.prototype.respondWith = function (p) { var u = this.request.url.replace(/^https?:\/\/[^/]+/, "").slice(0, 60), t = Date.now(); log("fetch+", u);
      Promise.resolve(p).then(function () { log("fetch-", u, Date.now() - t); }, function () { log("fetch!", u, Date.now() - t); }); return RW.call(this, p); };
    ExtendableEvent.prototype.waitUntil = function (p) { var k = this.type + (this.data && this.data.type ? ":" + this.data.type : ""), t = Date.now(); log("hold+", k);
      Promise.resolve(p).then(function () { log("hold-", k, Date.now() - t); }, function () { log("hold!", k, Date.now() - t); }); return WU.call(this, p); };
    self.addEventListener("install", function () { log("install"); });
    self.addEventListener("activate", function () { log("activate"); });
    if (self.serviceWorker) self.serviceWorker.addEventListener("statechange", function () { log("state", self.serviceWorker.state); });
    var match = Clients.prototype.matchAll, claim = Clients.prototype.claim, nav = WindowClient.prototype.navigate;
    Clients.prototype.matchAll = function (o) { return match.call(this, o).then(function (l) { log("windows", l.map(who).join(", ") || "none"); return l; }); };
    Clients.prototype.claim = function () { log("claim"); return claim.call(this); };
    WindowClient.prototype.navigate = function (u) {
      var c = who(this); log("navigate", c);
      return nav.call(this, u).then(function (r) { log("navigated", c, r ? "ok" : "null"); return r; }, function (e) { log("navigate failed", c, e && e.message); throw e; });
    };
  } + ")();\n";
  async function updateOpen(install, checkDelay, deaf) {
    var os = require("os");
    var dir = fs.mkdtempSync(path.join(os.tmpdir(), "launch-upd-"));
    fs.cpSync(root, dir, { recursive: true, filter: function (f) { return !/[\\/](\.git|node_modules)$/.test(f); } });
    if (deaf) {
      var aj = path.join(dir, "app.js"), src = fs.readFileSync(aj, "utf8"), hush = 'if(!e.data || e.data.type!=="reload") return;';
      if (src.indexOf(hush) < 0) throw new Error("app.js no longer has the reload handler this check silences");
      fs.writeFileSync(aj, src.replace(hush, "return;"));
    }
    // The worker's side of it, for the log when a check here fails: what it
    // was told, what windows it found, and what came of each reload it drove.
    var swPath = path.join(dir, "sw.js");
    fs.writeFileSync(swPath, SW_TRACE + fs.readFileSync(swPath, "utf8"));
    var srv = serve(dir), trace = [];
    function note(t) { if (/^L[EW]\|/.test(t)) trace.push(Date.now() % 100000 + " " + t); }
    // Both holds are at the server, which every client goes through - the
    // page, the browser's update check and the worker's own install alike;
    // Playwright routes a worker's requests on some runs and not others, so a
    // hold there applied only sometimes. And on a file only the install asks
    // for: the old worker refreshes each shell file the page loads, so a held
    // app.css was fetched twice at once and the install's copy waited on the
    // page's - an 11-second hold made a 22-second install.
    var handle = srv.listeners("request")[0], held = 0;
    srv.removeAllListeners("request");
    srv.on("request", function (req, res) {
      if (/^\/__trace\?/.test(req.url)) { note(decodeURIComponent(req.url.slice(9))); res.writeHead(204); res.end(); return; }
      // checkDelay holds the first sw.js fetch only - the update check under
      // test. A second check of the same version (the browser's own, on the
      // reload's navigation) is the double-install issue, not this case.
      var wait = !slow ? 0 : checkDelay && !held && /\/sw\.js(\?|$)/.test(req.url) ? (held = checkDelay)
               : install && /\/chooser\.js(\?|$)/.test(req.url) ? install : 0;
      if (wait) setTimeout(function () { handle(req, res); }, wait); else handle(req, res);
    });
    await new Promise(function (r) { srv.listen(0, "127.0.0.1", r); });
    var b2 = "http://127.0.0.1:" + srv.address().port, slow = false;
    var ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "allow" });
    await ctx.route("**/*", async function (route) {
      var req = route.request(), u = req.url();
      if (u.startsWith(b2)) return route.continue();
      var body = fixture(u);
      if (body) { await new Promise(function (r) { setTimeout(r, 150); }); return route.fulfill({ status: 200, contentType: "application/json", body: body }); }
      if (/teamlogos|espncdn/.test(u)) return route.fulfill({ status: 200, contentType: "image/png", body: LOGO });
      return route.abort();
    });
    var page = await ctx.newPage(), frames = [];
    var reveals = {};
    page.on("console", function (m) { var t = m.text(); note(t); if (t.indexOf("LF|") === 0) frames.push(t.split("|")); if (t.indexOf("LV|") === 0) reveals[t.split("|")[1]] = t.split("|")[2]; if (process.env.LAUNCH_DEBUG && /^L[EF]\|/.test(t)) console.log("    " + Date.now() % 100000 + " " + t); });
    await page.addInitScript(function () {
      var doc = Math.random().toString(36).slice(2, 7), t0 = Date.now(), prev = "";
      if (navigator.serviceWorker) {
        navigator.serviceWorker.addEventListener("controllerchange", function () { console.log("LE|" + doc + "|controllerchange"); });
        window.addEventListener("pagereveal", function (e) { console.log("LV|" + doc + "|" + (e.viewTransition ? "swap" : "none")); });
        navigator.serviceWorker.getRegistration().then(function (r) { if (r) r.addEventListener("updatefound", function () { console.log("LE|" + doc + "|updatefound"); }); });
      }
      (function f() {
        var l = document.getElementById("launch"), cs = l && getComputedStyle(l);
        if (!l && !document.body) { requestAnimationFrame(f); return; }
        var cover = l && cs.display !== "none" && cs.visibility === "visible" ? (+cs.opacity).toFixed(2) : "0.00";
        if (cover !== prev) { console.log("LF|" + doc + "|" + cover); prev = cover; }
        if (Date.now() - t0 < 20000) requestAnimationFrame(f);
      })();
    });
    await page.goto(b2 + "/?team=notre-dame#home");
    await page.waitForFunction(function () { return navigator.serviceWorker.controller && !document.getElementById("launch"); }, null, { timeout: 15000 });
    var sw = path.join(dir, "sw.js");
    fs.writeFileSync(sw, fs.readFileSync(sw, "utf8").replace(/var VERSION = "([^"]+)"/, 'var VERSION = "$1-next"'));
    frames.length = 0; slow = true;
    await page.reload();
    // until the worker's reload has come and its page has lifted the launch
    // (or there was none to lift), or 35 seconds
    var until = Date.now() + 35000;
    for (;;) {
      await page.waitForTimeout(250);
      var ds = []; frames.forEach(function (f) { if (ds.indexOf(f[1]) === -1) ds.push(f[1]); });
      var settled = ds.length >= 2 && await page.evaluate(function () { return !document.getElementById("launch"); }).catch(function () { return false; });
      if (settled || Date.now() > until) break;
    }
    await page.waitForTimeout(500);
    var finalUrl = page.url();
    await ctx.close(); srv.close();
    fs.rmSync(dir, { recursive: true, force: true });
    var docs = []; frames.forEach(function (f) { if (docs.indexOf(f[1]) === -1) docs.push(f[1]); });
    function of(d) { return frames.filter(function (f) { return f[1] === d; }).map(function (f) { return f[2]; }); }
    return { docs: docs, of: of, url: finalUrl, reveal: function (d) { return reveals[d] || "no pagereveal"; },
             trace: function () { console.log("      " + trace.join("\n      ")); } };
  }

  console.log("a clock that moved back");
  // A start time saved before the phone's clock moved back (a time zone, a
  // manual change) is in the future: it must never hold the launch.
  var fut = await open("/?team=notre-dame#home", { startedAgo: -60000, delay: 100 });
  var tf = await liftedAt(fut, 9000);
  ok(tf != null && tf < 4500, "a saved start in the future is ignored: it lifts on its own clock (" + tf + " ms)");
  await fut.ctx.close();

  console.log("a new version found on this open");
  // Its install takes 4 seconds: longer than the launch's own 2.6, inside
  // its 10-second wait for an update.
  var u1 = await updateOpen(4000);
  var first = u1.of(u1.docs[0]), last = u1.of(u1.docs[u1.docs.length - 1]);
  ok(u1.docs.length === 2, "the worker reloads the page once (" + u1.docs.length + " documents)");
  if (u1.docs.length !== 2) u1.trace();
  ok(first.length && first.every(function (c) { return c === "1.00"; }), "the launch holds over the page until that reload: it never starts to lift (" + first.join(",") + ")");
  ok(last[0] === "1.00" && last[last.length - 1] === "0.00", "the reloaded page carries the same launch on and lifts it once");
  ok(u1.reveal(u1.docs[u1.docs.length - 1]) === "swap",
     "and it comes in as a page swap: the old launch stays on screen until the new one paints (" + u1.reveal(u1.docs[u1.docs.length - 1]) + ")");
  ok(!/[?&]swap=/.test(u1.url) && /[?&]team=notre-dame/.test(u1.url) && /#home$/.test(u1.url),
     "and its address is the fan's own again: the reload's mark is gone, the team and screen kept (" + u1.url.replace(/^https?:\/\/[^/]+/, "") + ")");
  // A page from before this ignores the worker's word: the worker reloads it.
  var u4 = await updateOpen(0, 0, true);
  var u4last = u4.of(u4.docs[u4.docs.length - 1]);
  ok(u4.docs.length === 2 && u4last[u4last.length - 1] === "0.00",
     "a page that does not answer is still reloaded, once, by the worker (" + u4.docs.length + " documents)");
  if (u4.docs.length !== 2) u4.trace();
  // An install of 11 seconds outlasts that wait.
  var u2 = await updateOpen(11000);
  var slowLast = u2.of(u2.docs[u2.docs.length - 1]);
  ok(u2.docs.length === 2 && slowLast.every(function (c) { return c === "0.00"; }),
     "an install slower than its 10-second wait: it lifts once, and the reload does not play it again (" + u2.docs.length + " documents; " + slowLast.join(",") + ")");

  // The update check alone is slow: sw.js takes 4 seconds to answer, longer
  // than the launch's own 2.6 (Codex review, #80). The check holds it.
  var u3 = await updateOpen(0, 4000);
  var u3first = u3.of(u3.docs[0]);
  ok(u3.docs.length === 2 && u3first.every(function (c) { return c === "1.00"; }),
     "a slow update check holds the launch too: no lift before the reload (" + u3.docs.length + " documents; " + u3first.join(",") + ")");

  console.log("the chooser");
  var f = await open("/?choose=1");
  await f.page.waitForTimeout(300);
  ok(await f.page.evaluate(function () { var l = document.getElementById("launch"); return !l || getComputedStyle(l).display === "none"; }),
     "no launch screen over the team chooser");
  ok((await f.page.evaluate(function () { return getComputedStyle(document.documentElement).backgroundColor; })) !== "rgb(17, 29, 53)",
     "and the chooser's page keeps its own colours");
  ok(await f.page.evaluate(function () { return !document.getElementById("page-swap"); }),
     "and takes no part in a page swap: Change Team and picking a team are as they were");
  ok(await f.page.evaluate(function () { return localStorage.getItem("suite-launch-day") === null; }),
     "nor counts as the day's launch: the first team page after it plays the whole launch (Codex, #212)");
  await f.ctx.close();

  await browser.close(); server.close();
  console.log("\n" + (failures ? failures + " check(s) FAILED" : "the launch screen plays, waits for a complete screen, and never outstays it"));
  process.exit(failures ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
