#!/usr/bin/env node
/* An update, in a real browser with the real service worker.

   The worker serves the shell from cache first (the stadium rule), so the
   open that finds a new version has already drawn the old one. The new
   worker must then:
     - reload the page it takes over, once, as soon as it is active - and
       never on a first install, where the page is already this version
     - have the fan's team config precached (read from the old version's
       team mark), so that reload draws with no network wait
     - carry the old version's data over, stamps intact, and drop only the
       old caches

   An "older version" here is its caches, as a worker of another VERSION
   left them: a shell with its team mark and a data cache with a stamped
   copy. Its page is this page; what is under test is what the new worker
   does on arrival. Provider requests are answered from committed fixtures,
   or fail - the reload must not wait on them.

   Usage:  node tools/upgradecheck.js
   Locally: NODE_PATH=$(npm root -g) PW_CHROMIUM=/path/to/chromium node tools/upgradecheck.js */
"use strict";

var fs = require("fs"), http = require("http"), path = require("path");
var chromium = require("playwright").chromium;

var root = path.join(__dirname, "..");
var VERSION = /var VERSION = "([^"]+)"/.exec(fs.readFileSync(path.join(root, "sw.js"), "utf8"))[1];
var requests = [];
var server = http.createServer(function (req, res) {
  var p = new URL(req.url, "http://localhost").pathname;
  requests.push(p);
  var file = path.join(root, p === "/" ? "index.html" : p.slice(1));
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  var type = /\.js$/.test(file) ? "text/javascript" : /\.css$/.test(file) ? "text/css" : /\.json$/.test(file) ? "application/json" :
             /\.svg$/.test(file) ? "image/svg+xml" : /\.png$/.test(file) ? "image/png" : "text/html";
  res.writeHead(200, { "content-type": type, "cache-control": "no-store" });
  fs.createReadStream(file).pipe(res);
});

var failures = 0;
function ok(cond, what) {
  if (cond) { console.log("  ok   " + what); return; }
  failures++; console.log("  FAIL " + what);
}

(async function () {
  await new Promise(function (r) { server.listen(0, "127.0.0.1", r); });
  var base = "http://127.0.0.1:" + server.address().port;
  var browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined });

  async function context() {
    var ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "allow" });
    var docs = [];
    await ctx.exposeBinding("__doc", function (src, t) { docs.push(t + " @" + src.frame.url() + (src.frame.parentFrame() ? " (subframe)" : "")); });
    await ctx.addInitScript(function () { if (location.protocol !== "about:") window.__doc(document.title || "(untitled)"); });
    await ctx.route(/^https:\/\//, function (r) { r.abort(); });     // providers are down: the reload must not need them
    return { ctx: ctx, docs: docs };
  }
  function state(page) {
    return page.evaluate(async function () {
      var keys = await caches.keys(), out = { keys: keys };
      var shell = keys.filter(function (k) { return /-shell$/.test(k) && !/^iw-2000/.test(k); })[0];
      var data = keys.filter(function (k) { return /-data$/.test(k) && !/^iw-2000/.test(k); })[0];
      if (shell) { var c = await caches.open(shell); out.team = !!(await c.match("./teams/notre-dame.js"));
        var m = await c.match("./__team"); out.mark = m ? await m.json() : null; }
      if (data) { var d = await caches.open(data); var hit = await d.match(location.origin + "/schedule-probe.json");
        out.carried = hit ? { body: await hit.text(), stored: hit.headers.get("X-IW-Stored") } : null; }
      var wm = document.querySelector(".app-bar img.wordmark");
      out.title = document.title; out.wordmark = !!wm && wm.complete && wm.naturalWidth > 0;
      out.controlled = !!navigator.serviceWorker.controller;
      return out;
    });
  }

  console.log("1. a first install reloads nothing");
  var a = await context(), pa = await a.ctx.newPage();
  await pa.goto(base + "/?team=notre-dame#home");
  await pa.waitForFunction(function () { return navigator.serviceWorker.controller; }, null, { timeout: 20000 });
  await pa.waitForTimeout(2000);
  ok(a.docs.length === 1, "the page was loaded once (" + a.docs.join(" | ") + ")");
  await a.ctx.close();

  console.log("2. an update over an older version");
  var b = await context(), pb = await b.ctx.newPage();
  // The older version's caches, as its worker left them; no worker of ours
  // is registered yet, so arriving is exactly an update's arrival.
  await pb.goto(base + "/manifest.json");
  await pb.evaluate(async function () {
    var s = await caches.open("iw-2000-01-01a-shell");
    await s.put("./__team", new Response(JSON.stringify({ team: "notre-dame", data: ["depth.json"] }), { headers: { "Content-Type": "application/json" } }));
    await s.put("./index.html", new Response("<title>Old</title>"));
    await s.put("https://fonts.gstatic.com/s/barlow/v1/probe.woff2", new Response("font"));
    var d = await caches.open("iw-2000-01-01a-data");
    await d.put(location.origin + "/schedule-probe.json", new Response("{\"old\":true}", { headers: { "X-IW-Stored": "Fri, 25 Sep 2026 10:00:00 GMT" } }));
  });
  b.docs.length = 0; requests.length = 0;
  await pb.goto(base + "/?team=notre-dame#home");
  await pb.waitForFunction(function () { return navigator.serviceWorker.controller; }, null, { timeout: 20000 });
  var t0 = Date.now();
  while (Date.now() - t0 < 8000 && b.docs.length < 2) await pb.waitForTimeout(100);
  await pb.waitForTimeout(2500);
  ok(b.docs.length === 2, "the new worker reloaded the page it took over, once (" + b.docs.length + " documents)");
  var s = await state(pb);
  ok(s.keys.every(function (k) { return !/^iw-2000/.test(k); }), "the older version's caches are gone (" + s.keys.join(", ") + ")");
  ok(s.keys.indexOf(VERSION + "-shell") > -1 && s.keys.indexOf(VERSION + "-data") > -1, "this version's caches are there");
  ok(s.team, "the fan's team config was precached from the old team mark");
  ok(s.mark && s.mark.team === "notre-dame", "and the team mark carried over");
  ok(s.carried && s.carried.body === "{\"old\":true}" && s.carried.stored === "Fri, 25 Sep 2026 10:00:00 GMT",
     "the old data copy was carried over with its stored time");
  var font = await pb.evaluate(async function (v) { return !!(await (await caches.open(v + "-shell")).match("https://fonts.gstatic.com/s/barlow/v1/probe.woff2")); }, VERSION);
  ok(font, "and the old font files");
  ok(s.controlled && / · Suite$/.test(s.title) && s.wordmark, "the reloaded page is this version, controlled, header drawn");

  console.log("3. nothing reloads again");
  var before = b.docs.length;
  await pb.reload(); await pb.waitForTimeout(2500);
  ok(b.docs.length === before + 1, "an ordinary reload is one document (" + (b.docs.length - before) + ")");
  await b.ctx.close();

  await browser.close(); server.close();
  console.log("\n" + (failures ? failures + " check(s) FAILED" : "An update takes over at once, fast, and keeps what the fan had"));
  process.exit(failures ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
