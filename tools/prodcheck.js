#!/usr/bin/env node
/* Is production serving this release, with Suite's identity? Run against the
   live site after a deploy (.github/workflows/verify-production.yml).

     - the page, its manifest, install icons (at their stated pixel sizes),
       favicons, share image and header wordmark all answer
     - nothing references a TEMPORARY-* identity asset
     - the manifest is Suite's: name, Ink theme and background
     - the service worker production serves is this release's (VERSION in
       sw.js), and a browser that loads the site is controlled by it and
       reports that version back
     - the header shows the wordmark image, loaded

   GitHub Pages can lag a deploy by a minute or two, so the version is polled
   before anything else is judged.

   Usage:  node tools/prodcheck.js https://owner.github.io/Repo/ */
"use strict";
var fs = require("fs"), path = require("path");

var BASE = (process.argv[2] || "").replace(/\/?$/, "/");
if (!/^https:\/\//.test(BASE) && !(process.env.PRODCHECK_ALLOW_HTTP && /^http:\/\/127\.0\.0\.1/.test(BASE))) { console.error("usage: node tools/prodcheck.js https://.../"); process.exit(2); }
var root = path.join(__dirname, "..");
var WANT = /var VERSION = "([^"]+)"/.exec(fs.readFileSync(path.join(root, "sw.js"), "utf8"))[1];
var INK = "#111D35";

var failures = 0;
function ok(cond, what) { console.log((cond ? "  ok   " : "  FAIL ") + what); if (!cond) failures++; }
function get(u) { return fetch(new URL(u, BASE).href + (/\?/.test(u) ? "&" : "?") + "prodcheck=" + Date.now(), { cache: "no-store" }); }
function pngSize(buf) {
  var b = Buffer.from(buf);
  return b.slice(1, 4).toString() === "PNG" ? b.readUInt32BE(16) + "x" + b.readUInt32BE(20) : null;
}
var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

(async function () {
  console.log("production " + BASE + " - expecting " + WANT);

  // Pages lags a deploy; poll the worker's VERSION for up to ten minutes.
  var served = null;
  for (var i = 0; i < 40; i++) {
    var r = await get("sw.js").catch(function () { return null; });
    var t = r && r.ok ? await r.text() : "";
    served = (/var VERSION = "([^"]+)"/.exec(t) || [])[1] || null;
    if (served === WANT) break;
    await wait(15000);
  }
  ok(served === WANT, "sw.js serves this release's VERSION (" + served + ")");

  var html = await (await get("")).text();
  ok(!/TEMPORARY-/.test(html), "the page references no TEMPORARY-* asset");
  function attr(re) { return (re.exec(html) || [])[1] || null; }
  var links = [];
  html.replace(/<link rel="(icon|apple-touch-icon|manifest)"[^>]*href="([^"]+)"/g, function (_, rel, href) { links.push([rel, href]); });
  for (var k = 0; k < links.length; k++) {
    var res = await get(links[k][1]);
    ok(res.ok, links[k][0] + " " + links[k][1] + " answers " + res.status);
  }
  var ogImage = attr(/<meta property="og:image" content="([^"]+)"/);
  ok(/^https:\/\//.test(ogImage || ""), "og:image is absolute: " + ogImage);
  var og = await fetch(ogImage).catch(function () { return null; });
  ok(og && og.ok && pngSize(await og.arrayBuffer()) === "1200x630", "the share image answers, 1200x630");
  ok(attr(/<meta name="twitter:image" content="([^"]+)"/) === ogImage, "twitter:image is the same image");

  var manifest = await (await get("manifest.json")).json();
  ok(manifest.name === "Suite" && manifest.short_name === "Suite", "the manifest is Suite's");
  ok(String(manifest.theme_color).toUpperCase() === INK && String(manifest.background_color).toUpperCase() === INK,
     "theme and background are Ink " + INK);
  ok(!/TEMPORARY-/.test(JSON.stringify(manifest)), "the manifest references no TEMPORARY-* asset");
  for (var j = 0; j < manifest.icons.length; j++) {
    var ic = manifest.icons[j], got = await get(ic.src);
    var size = got.ok ? pngSize(await got.arrayBuffer()) : null;
    ok(size === ic.sizes, "install icon " + ic.src + " (" + ic.purpose + ") is " + ic.sizes + " (" + size + ")");
  }
  var sw = await (await get("sw.js")).text();
  ok(!/TEMPORARY-/.test(sw), "the worker precaches no TEMPORARY-* asset");
  var wm = await get("assets/suite/suite-wordmark-pearl.svg");
  ok(wm.ok && /<svg/.test(await wm.text()), "the Pearl wordmark answers");

  // A real browser: the worker takes control and reports this version; the
  // header draws the wordmark.
  var chromium = require("playwright").chromium;
  var browser = await chromium.launch();
  var ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  var page = await ctx.newPage(), temp = [];
  page.on("request", function (q) { if (/TEMPORARY-/.test(q.url())) temp.push(q.url()); });
  await page.goto(BASE + "?team=notre-dame#home");
  var controlled = await page.waitForFunction(function () { return navigator.serviceWorker && navigator.serviceWorker.controller; },
    null, { timeout: 30000 }).then(function () { return true; }, function () { return false; });
  ok(controlled, "the service worker takes control of the page");
  var v = controlled ? await page.evaluate(function () {
    return new Promise(function (res) {
      var ch = new MessageChannel();
      ch.port1.onmessage = function (e) { res(e.data && e.data.version); };
      navigator.serviceWorker.controller.postMessage({ type: "version" }, [ch.port2]);
      setTimeout(function () { res(null); }, 5000);
    });
  }) : null;
  ok(v === WANT, "and reports this release's version (" + v + ")");
  await page.waitForTimeout(1500);
  var head = await page.evaluate(function () {
    var i = document.querySelector(".app-bar img.wordmark");
    return { img: !!i, loaded: !!i && i.complete && i.naturalWidth > 0, alt: i ? i.alt : "", title: document.title,
             typed: !!document.querySelector(".app-bar span.wordmark") };
  });
  ok(head.img && head.loaded && head.alt === "Suite", "the header shows the wordmark image, loaded, alt 'Suite'");
  ok(!head.typed, "not the typed wordmark");
  ok(/ · Suite$/.test(head.title), "the tab title is '<team> · Suite' (" + head.title + ")");
  ok(temp.length === 0, "the browser asked for no TEMPORARY-* asset" + (temp.length ? " (" + temp.join(", ") + ")" : ""));
  await browser.close();

  console.log("\n" + (failures ? failures + " check(s) FAILED" : "production serves " + WANT + " with Suite's identity"));
  process.exit(failures ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
