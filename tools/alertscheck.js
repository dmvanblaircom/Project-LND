#!/usr/bin/env node
/* Game alerts in Settings, in a real browser (notifications brief §2b,
   approved by David 2026-10-09).

   The browser's push machinery is stood in for (permission granted, a
   subscription with real-shaped keys) and the edge API is answered here, so
   what the app sends is what is checked:
     1. Turn On sends the defaults (kickoff, final, delays); the choices show.
     2. A quick pick sets the switches and is shown as chosen; one request
        for a run of taps, a moment later; "Saved." is said.
     3. A switch changed by hand: the pick steps aside.
     4. Every switch off: alerts off, unsubscribed, and the screen says so;
        turning on again starts from the defaults.
     5. Nothing runs off the screen at 320 px.

   Usage: node tools/alertscheck.js     (exit 1 on failure) */
"use strict";
var fs = require("fs"), path = require("path");
var root = path.join(__dirname, "..");
var failures = 0;
function ok(cond, what) { if (cond) { console.log("  ok   " + what); return; } failures++; console.log("  FAIL " + what); }
function eq(a, b, what) { ok(JSON.stringify(a) === JSON.stringify(b), what + " = " + JSON.stringify(b) + (JSON.stringify(a) === JSON.stringify(b) ? "" : " (got " + JSON.stringify(a) + ")")); }

// The page's push machinery: permission granted, one subscription.
var STUB = "(" + function () {
  var sub = null;
  function mk() {
    return { endpoint: "https://web.push.apple.com/QTest", options: {},
             toJSON: function () { return { endpoint: this.endpoint, keys: { p256dh: "B" + "A".repeat(86), auth: "C".repeat(22) } }; },
             unsubscribe: function () { sub = null; return Promise.resolve(true); } };
  }
  try { if (localStorage.getItem("iw-alerts-notre-dame") === "1") sub = mk(); } catch (e) {}   // already on, from before
  window.PushManager = function () {};
  window.Notification = { permission: "granted", requestPermission: function () { return Promise.resolve("granted"); } };
  var pm = { getSubscription: function () { return Promise.resolve(sub); },
             subscribe: function () { sub = mk(); return Promise.resolve(sub); } };
  var reg = { pushManager: pm, active: {} };
  Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: {
    ready: Promise.resolve(reg), register: function () { return Promise.resolve(reg); }, controller: null,
    addEventListener: function () {}, getRegistration: function () { return Promise.resolve(reg); } } });
} + ")();";

(async function () {
  var chromium = require("playwright").chromium;
  var serve = require("./lib/serve"), server = serve(root);
  await new Promise(function (r) { server.listen(0, "127.0.0.1", r); });
  var base = "http://127.0.0.1:" + server.address().port;
  var browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined });
  async function open(width, before) {
    var ctx = await browser.newContext({ viewport: { width: width || 390, height: 844 }, serviceWorkers: "block" });
    var page = await ctx.newPage(), posts = [], slow = { ms: 0 };
    if (before) await page.addInitScript(before);
    await page.addInitScript(STUB);
    await page.route("**/*", function (route) {
      var u = route.request().url();
      if (/workers\.dev\/v1\/push\/key/.test(u)) return route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" },
                                                                         body: JSON.stringify({ key: "B" + "A".repeat(86) }) });
      if (/workers\.dev\/v1\/push\/(subscribe|unsubscribe)/.test(u)) {
        var body = JSON.parse(route.request().postData() || "{}");
        var wait = Array.isArray(slow.ms) ? slow.ms.shift() || 0 : slow.ms;
        if (wait && !/unsubscribe/.test(u)) return new Promise(function (r) { setTimeout(r, wait); }).then(function () {
          posts.push({ path: "subscribe", options: body.options || null, at: Date.now() });
          return route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify({ ok: true, confirmation: "updated" }) });
        });
        posts.push({ path: /unsubscribe/.test(u) ? "unsubscribe" : "subscribe", options: body.options || null, at: Date.now() });
        return route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" },
                               body: JSON.stringify(/unsubscribe/.test(u) ? { ok: true } : { ok: true, confirmation: posts.filter(function (p) { return p.path === "subscribe"; }).length === 1 ? "sent" : "updated" }) });
      }
      if (u.startsWith(base)) return route.continue();
      if (/\/schedule(\?|$)/.test(u)) return route.fulfill({ status: 200, contentType: "application/json", body: fs.readFileSync(path.join(root, "tools/fixtures/espn-schedule-nd-oct08.json")) });
      return route.abort();
    });
    await page.goto(base + "/?team=notre-dame#settings");
    await page.waitForFunction(function () { return !document.getElementById("launch"); }, null, { timeout: 9000 }).catch(function () {});
    await page.waitForTimeout(600);
    return { ctx: ctx, page: page, posts: posts, slow: slow };
  }
  function state(page) {
    return page.evaluate(function () {
      var s = document.querySelector("#screenSettings");
      return { on: (s.querySelector('[data-st="alerts"]') || {}).textContent,
               note: (s.querySelector('[data-st="alerts-note"]') || {}).textContent,
               pressed: [].map.call(s.querySelectorAll('[data-alert-pick][aria-pressed="true"]'), function (b) { return b.getAttribute("data-alert-pick"); }),
               switches: [].map.call(s.querySelectorAll("[data-alert-opt]"), function (i) { return (i.checked ? "+" : "-") + i.getAttribute("data-alert-opt"); }),
               scoring: (s.querySelector('input[name="alertScoring"]:checked') || {}).value || null,
               live: document.getElementById("live").textContent };
    });
  }
  var shot = function (page, n) { return process.env.SHOTS ? page.screenshot({ path: path.join(process.env.SHOTS, n + ".png"), fullPage: true }) : null; };

  var a = await open();
  console.log("1. Turn On");
  await a.page.click('#screenSettings [data-alerts="on"]'); await a.page.waitForTimeout(500);
  var s1 = await state(a.page);
  eq(a.posts.map(function (p) { return p.options; }), [{ kickoff: true, final: true, delays: true, scoring: "off", quarters: false, halftime: false, close: false }],
     "Turn On sends the defaults: kickoff, final and delays");
  ok(s1.on === "On" && /test alert is on its way/.test(s1.note), "On, and the test alert is promised");
  eq([s1.switches, s1.scoring], [["+kickoff", "+final", "+delays", "-quarters", "-halftime", "-close"], "off"], "the choices show, set to the defaults");
  await shot(a.page, "alerts-on");

  console.log("2. A quick pick");
  await a.page.click('#screenSettings [data-alert-pick="everything"]');
  var s2 = await state(a.page);
  eq([s2.pressed, s2.scoring, s2.switches.every(function (x) { return x[0] === "+"; })], [["everything"], "all", true], "Everything: every switch on, every score, shown as chosen");
  await a.page.click('#screenSettings [data-alert-pick="key"]'); await a.page.waitForTimeout(900);
  var s2b = await state(a.page);
  eq(a.posts.slice(1).map(function (p) { return p.options && p.options.scoring + (p.options.halftime ? "+half" : "") + (p.options.quarters ? "+q" : ""); }),
     ["off+half"], "two taps in a row: one request, with the last choice (Key moments)");
  ok(/^Saved\./.test(s2b.note) && /^Saved\./.test(s2b.live), "and it says Saved., aloud too");
  await shot(a.page, "alerts-key");

  console.log("3. A switch by hand");
  await a.page.click('#screenSettings input[name="alertScoring"][value="mine"]'); await a.page.waitForTimeout(900);
  var s3 = await state(a.page);
  eq([s3.pressed, s3.scoring, a.posts[a.posts.length - 1].options.scoring], [[], "mine", "mine"], "My team's scores: the pick steps aside, and the choice is sent");
  var focus = await a.page.evaluate(function () { return document.activeElement && document.activeElement.value; });
  ok(focus === "mine", "the focus stays on what the fan just chose");

  console.log("4. Everything off");
  await a.page.click('#screenSettings input[name="alertScoring"][value="off"]');
  for (var k of ["kickoff", "final", "delays", "halftime", "close"]) await a.page.click('#screenSettings [data-alert-opt="' + k + '"]');
  await a.page.waitForTimeout(700);
  var s4 = await state(a.page);
  ok(s4.on === "Off" && /No alerts selected, so Game Alerts are off/.test(s4.note) && a.posts[a.posts.length - 1].path === "unsubscribe",
     "the last switch off: alerts off, unsubscribed, and the screen says why");
  await a.page.click('#screenSettings [data-alerts="on"]'); await a.page.waitForTimeout(500);
  eq(a.posts[a.posts.length - 1].options.kickoff && a.posts[a.posts.length - 1].options.final, true, "on again: from the defaults, not from nothing");
  await a.ctx.close();

  console.log("4b. Turn Off right after a change (Codex, #116)");
  var c = await open();
  await c.page.click('#screenSettings [data-alerts="on"]'); await c.page.waitForTimeout(500);
  await c.page.click('#screenSettings [data-alert-pick="everything"]');
  await c.page.click('#screenSettings [data-alerts="off"]'); await c.page.waitForTimeout(1200);
  eq(c.posts.map(function (p) { return p.path; }), ["subscribe", "unsubscribe"], "a choice not yet sent is dropped: off stays off");
  await c.page.click('#screenSettings [data-alerts="on"]'); await c.page.waitForTimeout(500);
  c.slow.ms = 900; c.posts.length = 0;
  await c.page.click('#screenSettings [data-alert-pick="key"]'); await c.page.waitForTimeout(700);   // the save is on its way ...
  await c.page.click('#screenSettings [data-alerts="off"]'); await c.page.waitForTimeout(1800);      // ... and Turn Off is tapped
  var last = c.posts[c.posts.length - 1], cs = await state(c.page);
  ok(c.posts.length === 2 && c.posts[0].path === "subscribe" && last.path === "unsubscribe" && cs.on === "Off" && cs.note === "Game alerts are off.",
     "a save already on its way finishes first; then off, and off it stays (" + c.posts.map(function (p) { return p.path; }).join(", ") + ")");
  await c.ctx.close();

  console.log("4c. Every save is waited for, not only the last (Codex, #116)");
  var d = await open();
  await d.page.click('#screenSettings [data-alerts="on"]'); await d.page.waitForTimeout(500);
  d.slow.ms = [2600, 200]; d.posts.length = 0;                     // the first save the slower: answered after the second
  await d.page.click('#screenSettings [data-alert-pick="everything"]'); await d.page.waitForTimeout(700);   // save 1 on its way
  await d.page.click('#screenSettings [data-alert-pick="key"]'); await d.page.waitForTimeout(700);          // save 2 queued behind it
  await d.page.click('#screenSettings [data-alerts="off"]'); await d.page.waitForTimeout(4500);
  var dp = d.posts.map(function (p) { return p.path; });
  ok(dp[dp.length - 1] === "unsubscribe" && dp.filter(function (x) { return x === "subscribe"; }).length <= 2 && (await state(d.page)).on === "Off",
     "two saves, then Turn Off: the unsubscribe comes after every save (" + dp.join(", ") + ")");
  await d.ctx.close();

  console.log("4d. A device that turned alerts on before there were choices (Codex, #116)");
  var L = await open(390, function () { try { localStorage.setItem("iw-alerts-notre-dame", "1"); } catch (e) {} });
  var ls = await state(L.page);
  eq([ls.on, ls.switches], ["On", ["+kickoff", "+final", "-delays", "-quarters", "-halftime", "-close"]], "it shows what it has had: kickoff and final, the new in-game Delays off");
  await L.page.click('#screenSettings input[name="alertScoring"][value="mine"]'); await L.page.waitForTimeout(900);
  var lo = L.posts[L.posts.length - 1] && L.posts[L.posts.length - 1].options;
  ok(lo && lo.delays === false && lo.outcomes === true && lo.scoring === "mine",
     "its first change keeps Delays off and its postponement alerts (outcomes), and adds only what was chosen");
  await L.ctx.close();

  console.log("5. 320 px");
  var n = await open(320);
  await n.page.click('#screenSettings [data-alerts="on"]'); await n.page.waitForTimeout(500);
  await n.page.click('#screenSettings [data-alert-pick="everything"]');
  var wide = await n.page.evaluate(function () { return document.documentElement.scrollWidth > document.documentElement.clientWidth; });
  ok(!wide, "nothing runs off the screen");
  await shot(n.page, "alerts-320");
  await n.ctx.close();

  await browser.close(); server.close();
  console.log("\n" + (failures ? failures + " check(s) FAILED" : "the fan's choice of alerts, sent as chosen"));
  process.exit(failures ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
