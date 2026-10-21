#!/usr/bin/env node
/* Top 25's week picker (David, 2026-10-20: "a dropdown selector for each of
   the rankings ... keep them per week. Default to the current/most updated
   set of rankings but don't lose the old ones"). Real polls: the live feed's
   Sep 20 week and ESPN's kept preseason and week 2 (tools/fixtures/
   rankings-2026-sample.json); FPI: today's table and one kept earlier week.
   No live APIs. */
"use strict";
var fs = require("fs"), path = require("path"), assert = require("assert");
var chromium = require("playwright").chromium, root = path.join(__dirname, ".."), audit = require("./a11yaudit");
var server = require("./lib/serve")(root), shots = path.join(root, "artifacts/visual/weeks"), checks = [];
function fixture(n) { return fs.readFileSync(path.join(root, "tools/fixtures", n), "utf8"); }
function ok(value, label) { assert(value, label); checks.push(label); console.log("  ok   " + label); }
var SAMPLE = JSON.parse(fixture("rankings-2026-sample.json"));
var W2_TOP = SAMPLE.teams[SAMPLE.polls.ap[1].ranks[0].id].name, PRE_TOP = SAMPLE.teams[SAMPLE.polls.ap[0].ranks[0].id].name;

fs.mkdirSync(shots, { recursive: true });
(async function () {
  await new Promise(function (r) { server.listen(0, "127.0.0.1", r); });
  var base = "http://127.0.0.1:" + server.address().port;
  var browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined });
  async function open(hash, opts) {
    opts = opts || {};
    var ctx = await browser.newContext({ viewport: { width: opts.width || 390, height: 844 }, timezoneId: "America/New_York", serviceWorkers: "block" });
    var page = await ctx.newPage(), st = { weeks: 0, fpiWeeks: 0, errors: [] };
    await page.clock.setSystemTime(new Date("2026-10-20T16:00:00Z"));
    page.on("pageerror", function (e) { st.errors.push(String(e)); });
    await ctx.route("**/*", function (route) {
      var u = route.request().url();
      if (/\/data\/league\/rankings-2026\.json/.test(u)) {
        st.weeks++;
        return opts.noWeeks ? route.fulfill({ status: 404, body: "" }) : route.fulfill({ status: 200, contentType: "application/json", body: fixture("rankings-2026-sample.json") });
      }
      if (/\/data\/league\/fpi-history-2026\.json/.test(u)) { st.fpiWeeks++; return route.fulfill({ status: 200, contentType: "application/json", body: fixture("fpi-history-2026-sample.json") }); }
      if (u.startsWith(base)) return route.continue();
      var body = /\/rankings/.test(u) ? fixture("espn-rankings-sep20.json") : /\/scoreboard\?/.test(u) ? fixture("espn-scoreboard-sep26.json")
               : /\/teams\/87\/schedule/.test(u) ? fixture("espn-schedule-nd-sep24.json") : null;
      if (body) return route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: body });
      return route.abort();
    });
    await page.goto(base + "/?team=notre-dame" + hash);
    await page.waitForFunction(function () { return !document.getElementById("launch") && document.querySelector("#screenTop25 .rk-card"); }, null, { timeout: 15000 });
    await page.waitForTimeout(300);
    return { ctx: ctx, page: page, st: st };
  }
  function state(page) {
    return page.evaluate(function () {
      var sel = document.getElementById("rkWeek"), t = document.querySelector("#screenTop25 .rk-title"), first = document.querySelector("#screenTop25 .rk-table tbody .rk-name");
      return { hash: location.hash, picker: !!sel, options: sel ? [].map.call(sel.options, function (o) { return o.textContent; }) : [],
               value: sel ? sel.value : null, title: t ? t.textContent : "", first: first ? first.textContent : "",
               focus: document.activeElement === sel, news: document.querySelectorAll("#screenTop25 .rk-new").length,
               fits: document.documentElement.scrollWidth <= innerWidth + 1 && (!sel || sel.getBoundingClientRect().right <= innerWidth) };
    });
  }
  try {
    var o = await open("#top25/rankings/ap"), s = await state(o.page);
    ok(s.picker && s.options.length === 3 && /^Week 4 · Sep 20 \(latest\)$/.test(s.options[0]) && /^Week 2 · Sep 8$/.test(s.options[1]) && /^Preseason · Aug 17$/.test(s.options[2]),
       "AP: every kept week and the live one, newest first, the newest marked latest (" + s.options.join(" | ") + ")");
    ok(s.value === "" && /Week 4/.test(s.title), "the newest - the live feed's - is shown by default");
    await o.page.screenshot({ path: path.join(shots, "ap-latest-390.png") });

    await o.page.selectOption("#rkWeek", "w2"); await o.page.waitForTimeout(300);
    s = await state(o.page);
    ok(s.hash === "#top25/rankings/ap/w2" && /Week 2/.test(s.title) && s.first.indexOf(W2_TOP) === 0, "picking week 2 shows week 2's poll, at its own address (No. 1 " + W2_TOP + ")");
    ok(s.focus, "focus stays on the picker after the redraw");
    await o.page.screenshot({ path: path.join(shots, "ap-w2-390.png") });
    await o.page.goBack(); await o.page.waitForTimeout(300);
    s = await state(o.page);
    ok(s.hash === "#top25/rankings/ap" && /Week 4/.test(s.title) && s.value === "", "Back returns to the latest week");
    await o.page.selectOption("#rkWeek", "w2"); await o.page.waitForTimeout(200);
    await o.page.selectOption("#rkWeek", ""); await o.page.waitForTimeout(300);
    s = await state(o.page);
    ok(s.hash === "#top25/rankings/ap" && /Week 4/.test(s.title), "picking latest goes back to the plain address");

    await o.page.click('.poll-seg a[href="#top25/rankings/coaches"]'); await o.page.waitForTimeout(300);
    s = await state(o.page);
    ok(!s.picker && /Coaches/.test(s.title), "Coaches with no kept week: no picker, just the live poll");
    ok(o.st.weeks === 1 && o.st.fpiWeeks === 0, "the kept weeks are read once; FPI's earlier tables not at all yet");

    await o.page.click('.poll-seg a[href="#top25/rankings/fpi"]');
    await o.page.waitForFunction(function () { return document.getElementById("rkWeek"); }, null, { timeout: 8000 });
    s = await state(o.page);
    ok(s.options.length === 2 && /^Week 8 · Oct 20 \(latest\)$/.test(s.options[0]) && /^Week 7 · Oct 13$/.test(s.options[1]) && s.first.indexOf("Ohio State") === 0,
       "FPI: today's table by default, with the kept week 7 offered (" + s.options.join(" | ") + ")");
    ok(o.st.fpiWeeks === 0, "FPI's earlier tables still not read before one is picked");
    await o.page.selectOption("#rkWeek", "w7");
    await o.page.waitForFunction(function () { var f = document.querySelector("#screenTop25 .rk-table tbody .rk-name"); return f && /Notre Dame/.test(f.textContent); }, null, { timeout: 8000 });
    s = await state(o.page);
    ok(s.hash === "#top25/rankings/fpi/w7" && o.st.fpiWeeks === 1, "picking FPI week 7 reads the kept tables once and shows that week (No. 1 Notre Dame)");
    await o.page.click('.poll-seg a[href="#top25/rankings/sp-plus"]'); await o.page.waitForTimeout(300);
    ok(!(await state(o.page)).picker, "SP+ keeps no weeks: no picker");
    ok(!o.st.errors.length, "no page errors (" + o.st.errors.join(" | ") + ")");
    await o.ctx.close();

    // A link to a kept week, and one to a week that is not kept.
    var d = await open("#top25/rankings/ap/pre");
    s = await state(d.page);
    ok(/Preseason/.test(s.title) && s.first.indexOf(PRE_TOP) === 0 && s.value === "pre" && s.news === 0, "a link to the preseason poll opens it, with no team marked New");
    await d.page.evaluate(function () { location.hash = "#top25/rankings/ap/w13"; }); await d.page.waitForTimeout(300);
    s = await state(d.page);
    ok(/Week 4/.test(s.title) && s.value === "" && s.hash === "#top25/rankings/ap", "a week that is not kept shows the latest, and the dead address is replaced");
    for (var w of [320, 390, 1280]) {
      await d.page.setViewportSize({ width: w, height: 844 }); await d.page.waitForTimeout(120);
      ok((await state(d.page)).fits, "the picker fits at " + w + "px");
      var a = await audit.auditText(d.page, "weeks " + w); ok(!a.failures.length, "contrast at " + w + " " + JSON.stringify(a.failures.slice(0, 3)));
      if (w === 320) await d.page.screenshot({ path: path.join(shots, "ap-pre-320.png") });
    }
    await d.ctx.close();

    // Before the first kept week (or with the file unreachable): the live poll, no picker.
    var n = await open("#top25/rankings/ap", { noWeeks: true });
    s = await state(n.page);
    ok(!s.picker && /Week 4/.test(s.title), "no kept weeks: the live poll as before, no picker");
    await n.ctx.close();
  } finally {
    await browser.close(); server.close();
  }
  console.log("\n" + checks.length + " checks: every kept week can be picked; the newest is the default");
})().catch(function (e) { console.error("FAIL " + (e && e.message || e)); process.exit(1); });
