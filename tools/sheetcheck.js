#!/usr/bin/env node
/* Top 25's game sheet (David, 2026-10-20: a sheet, every row): every row is a
   way in - the team's own game to Game, every other to its sheet - and the
   sheet carries a fixed few things by the game's state, fetched only while
   it is open. Back, Escape, Close and the dimmed page all close it; focus
   goes into it and comes back to the row; the page under it is inert and
   holds still. Real ESPN payloads (Sep 26 board, one game edited to final);
   no live APIs. */
"use strict";
var fs = require("fs"), path = require("path"), assert = require("assert");
var chromium = require("playwright").chromium, root = path.join(__dirname, ".."), audit = require("./a11yaudit");
var server = require("./lib/serve")(root), shots = path.join(root, "artifacts/visual/sheet"), checks = [];
function fixture(n) { return fs.readFileSync(path.join(root, "tools/fixtures", n), "utf8"); }
function ok(value, label) { assert(value, label); checks.push(label); console.log("  ok   " + label); }

// The board: Sep 26 mid-afternoon, with Texas Tech-Sam Houston made final.
var LIVE = "401856704", PRE = "401856700", FINAL = "401856805", HERO = "401858467";
var board = JSON.parse(fixture("espn-scoreboard-sep26-live.json"));
board.events.forEach(function (e) {
  if (e.id !== FINAL) return;
  var st = e.competitions[0].status;
  st.type = Object.assign({}, st.type, { state: "post", completed: true, name: "STATUS_FINAL", detail: "Final", shortDetail: "Final", description: "Final" });
  delete e.competitions[0].situation;
});
// The team's own games have their summaries fetched by Home and Game; only
// another board game's summary is the sheet's.
var OTHERS = board.events.map(function (e) { return e.id; }).filter(function (id) { return id !== HERO; });
var SUMMARY = { live: fixture("espn-summary-pur-live.json"), post: fixture("espn-summary-post.json") };

fs.mkdirSync(shots, { recursive: true });
(async function () {
  await new Promise(function (r) { server.listen(0, "127.0.0.1", r); });
  var base = "http://127.0.0.1:" + server.address().port;
  var browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined });
  async function open(hash, opts) {
    opts = opts || {};
    var ctx = await browser.newContext({ viewport: { width: opts.width || 390, height: 844 }, timezoneId: "America/New_York", serviceWorkers: "block" });
    var page = await ctx.newPage(), st = { summaries: [], errors: [], failSummary: !!opts.failSummary };
    await page.clock.setSystemTime(new Date("2026-09-26T17:30:00Z"));
    page.on("pageerror", function (e) { st.errors.push(String(e)); });
    await ctx.route("**/*", function (route) {
      var u = route.request().url();
      if (u.startsWith(base)) return route.continue();
      var m = /\/summary\?event=(\d+)/.exec(u);
      if (m) {
        if (OTHERS.indexOf(m[1]) > -1) st.summaries.push(m[1]);
        if (st.failSummary) return route.abort();
        return route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" },
                               body: m[1] === FINAL ? SUMMARY.post : SUMMARY.live });
      }
      var body = /\/scoreboard\?/.test(u) ? JSON.stringify(board) : /\/rankings/.test(u) ? fixture("espn-rankings-sep20.json")
               : /\/teams\/87\/schedule/.test(u) ? fixture("espn-schedule-nd-sep24.json") : null;
      if (body) return route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: body });
      return route.abort();
    });
    await page.goto(base + "/?team=notre-dame" + hash);
    await page.waitForFunction(function () { return !document.getElementById("launch") && document.querySelector("#screenTop25 .tg-list"); }, null, { timeout: 15000 });
    await page.waitForTimeout(200);
    return { ctx: ctx, page: page, st: st };
  }
  function sheetState(page) {
    return page.evaluate(function () {
      var h = document.getElementById("sheetHost"), sh = h && h.querySelector(".sh");
      return { open: !!h && !h.hidden && !!sh, text: sh ? sh.innerText : "", hash: location.hash,
               focusIn: !!sh && sh.contains(document.activeElement), focusRow: (document.activeElement && document.activeElement.getAttribute("href")) || "",
               inert: ["appBar", "main", "navbar"].every(function (k) { return document.getElementById(k).hasAttribute("inert"); }),
               lock: document.documentElement.classList.contains("sheet-open"),
               plays: sh ? sh.querySelectorAll(".sh-plays li").length : 0,
               fits: !sh || (document.documentElement.scrollWidth <= innerWidth + 1 && sh.getBoundingClientRect().right <= innerWidth + 1 && sh.scrollWidth <= sh.clientWidth + 1) };
    });
  }
  try {
    var o = await open("#top25");
    var rows = await o.page.evaluate(function () {
      return [].map.call(document.querySelectorAll("#screenTop25 .tg"), function (li) { var a = li.querySelector("a.tg-row"); return { ev: li.getAttribute("data-ev"), href: a ? a.getAttribute("href") : null }; });
    });
    ok(rows.length > 5 && rows.every(function (r) { return r.href === (r.ev === HERO ? "#game" : "#top25/games/" + r.ev); }),
       "every row is a way in: the team's own game to Game, every other game to its sheet (" + rows.length + " rows)");
    ok(!o.st.summaries.length, "the board fetches no game summary of its own");

    // A live game, opened from the board.
    await o.page.click('#screenTop25 a[href="#top25/games/' + LIVE + '"]');
    await o.page.waitForFunction(function () { return /Score by quarter/i.test((document.querySelector("#sheetHost .sh") || {}).innerText || ""); }, null, { timeout: 8000 });
    var s = await sheetState(o.page);
    ok(s.open && s.hash === "#top25/games/" + LIVE, "a tap opens the sheet, at its own address");
    ok(s.focusIn && s.inert && s.lock, "focus goes into the sheet; the page under it is inert and holds still");
    ok(/Texas at Tennessee/.test(s.text) && /Right now/i.test(s.text) && /Win probability/.test(s.text) && /Last plays/i.test(s.text) && s.plays === 3 && /Leaders/i.test(s.text),
       "live: who has the ball, win probability, score by quarter, the last three plays and the leaders");
    ok(!/Team stats|Drive|Box score/i.test(s.text), "and nothing else: no team stats, drives or box score");
    ok(o.st.summaries.length === 1 && o.st.summaries[0] === LIVE, "its summary is fetched once, on opening");
    for (var w of [320, 390, 768, 1280]) {
      await o.page.setViewportSize({ width: w, height: 844 }); await o.page.waitForTimeout(120);
      ok((await sheetState(o.page)).fits, "live sheet fits at " + w + "px");
      if (w === 320 || w === 390 || w === 1280) await o.page.screenshot({ path: path.join(shots, "live-" + w + ".png") });
      var a = await audit.auditText(o.page, "sheet live " + w); ok(!a.failures.length, "live sheet contrast at " + w + " " + JSON.stringify(a.failures.slice(0, 3)));
    }
    await o.page.setViewportSize({ width: 390, height: 844 });
    await o.page.keyboard.press("Escape"); await o.page.waitForTimeout(250);
    s = await sheetState(o.page);
    ok(!s.open && s.hash === "#top25" && !s.inert && !s.lock, "Escape closes it, back to the board's own address");
    ok(s.focusRow === "#top25/games/" + LIVE, "focus returns to the row that opened it");

    // Back closes it too; Close and the dimmed page do the same.
    await o.page.click('#screenTop25 a[href="#top25/games/' + LIVE + '"]'); await o.page.waitForTimeout(250);
    await o.page.goBack(); await o.page.waitForTimeout(250);
    ok(!(await sheetState(o.page)).open, "Back closes it");
    await o.page.click('#screenTop25 a[href="#top25/games/' + LIVE + '"]'); await o.page.waitForTimeout(250);
    await o.page.click("#sheetHost .sh-close"); await o.page.waitForTimeout(250);
    ok(!(await sheetState(o.page)).open && (await o.page.evaluate(function () { return location.hash; })) === "#top25", "Close closes it");
    await o.page.click('#screenTop25 a[href="#top25/games/' + LIVE + '"]'); await o.page.waitForTimeout(250);
    await o.page.mouse.click(20, 40); await o.page.waitForTimeout(250);
    ok(!(await sheetState(o.page)).open, "a tap on the dimmed page closes it");

    // Before kickoff: the board's facts, no fetch.
    var before = o.st.summaries.length;
    await o.page.click('#screenTop25 a[href="#top25/games/' + PRE + '"]'); await o.page.waitForTimeout(300);
    s = await sheetState(o.page);
    ok(s.open && /Kickoff/.test(s.text) && /TV/.test(s.text) && !/Score by quarter|Last plays/i.test(s.text) && o.st.summaries.length === before,
       "before kickoff: when, where, on what and the line - and nothing fetched");
    await o.page.screenshot({ path: path.join(shots, "pre-390.png") });
    await o.page.keyboard.press("Escape"); await o.page.waitForTimeout(200);

    // A final: score by quarter and leaders, no live lines.
    await o.page.click('#screenTop25 a[href="#top25/games/' + FINAL + '"]');
    await o.page.waitForFunction(function () { return /Score by quarter/i.test((document.querySelector("#sheetHost .sh") || {}).innerText || ""); }, null, { timeout: 8000 });
    s = await sheetState(o.page);
    ok(/Leaders/i.test(s.text) && !/Right now|Last plays|Win probability/i.test(s.text), "final: score by quarter and the leaders only");
    await o.page.screenshot({ path: path.join(shots, "final-390.png") });
    ok(!o.st.errors.length, "no page errors (" + o.st.errors.join(" | ") + ")");
    await o.ctx.close();

    // A link straight to a sheet: Close replaces the address, never leaves the app.
    var d = await open("#top25/games/" + LIVE);
    await d.page.waitForFunction(function () { var h = document.getElementById("sheetHost"); return h && !h.hidden; }, null, { timeout: 8000 });
    await d.page.click("#sheetHost .sh-close"); await d.page.waitForTimeout(250);
    ok(!(await sheetState(d.page)).open && (await d.page.evaluate(function () { return location.hash; })) === "#top25/games", "a sheet opened by a link closes onto the board");
    await d.ctx.close();

    // The summary fails: the board's facts stay, and it says so.
    var f = await open("#top25", { failSummary: true });
    await f.page.click('#screenTop25 a[href="#top25/games/' + LIVE + '"]'); await f.page.waitForTimeout(600);
    s = await sheetState(f.page);
    ok(s.open && /Tennessee/.test(s.text) && /didn’t load/.test(s.text), "a summary that fails: the score stays, and the sheet says the rest didn't load");
    await f.ctx.close();
  } finally {
    await browser.close(); server.close();
  }
  console.log("\n" + checks.length + " checks: every Top 25 row opens; the sheet shows a fixed few things and closes every way");
})().catch(function (e) { console.error("FAIL " + (e && e.message || e)); process.exit(1); });
