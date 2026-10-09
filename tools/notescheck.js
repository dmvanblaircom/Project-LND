#!/usr/bin/env node
/* The week's game notes on screen (David, 2026-10-09: pronunciations,
   captains and honors, the series card, By the Numbers).

     1. TeamOS.notes over the real snapshot (the notes for Game 6 vs
        Stanford): a player is matched across the notes and ESPN by name,
        curly apostrophes and a Jr. ignored; the series facts and By the
        Numbers belong only to the game the notes were written for, and only
        until it is final; another team's snapshot is nothing.
     2. In a real browser, on the Thursday before Stanford (the real ESPN
        schedule): Home's By the Numbers under the milestone; Game's series
        card and By the Numbers, each naming its source; Roster's captain
        mark, pronunciation and honors; the depth chart's captain marks.
        Nothing at 320 px runs off the screen.
     3. Notes written for another game, and Ohio State (declares none):
        none of it.

   tools/notescheck.py holds the parser that writes the snapshot.

   Usage: node tools/notescheck.js     (exit 1 on failure) */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");
var root = path.join(__dirname, "..");
function read(p) { return fs.readFileSync(path.join(root, p), "utf8"); }

var failures = 0;
function ok(cond, what) { if (cond) { console.log("  ok   " + what); return; } failures++; console.log("  FAIL " + what); }
function eq(a, b, what) { ok(JSON.stringify(a) === JSON.stringify(b), what + " = " + JSON.stringify(b) + (JSON.stringify(a) === JSON.stringify(b) ? "" : " (got " + JSON.stringify(a) + ")")); }

var SNAP = "tools/fixtures/nd-notes-g6.json";
var c = vm.createContext({});
["teams/notre-dame.js", "teamos/notes.js"].forEach(function (f) { vm.runInContext(read(f), c, { filename: f }); });
vm.runInContext("this.TeamOS = TeamOS; this.TEAM_CONFIG = TEAM_CONFIG;", c);
var N = c.TeamOS.notes, CFG = c.TEAM_CONFIG, snap = JSON.parse(read(SNAP));

console.log("1. TeamOS.notes");
var notes = N.model(snap, CFG);
eq(notes && [notes.game, notes.publishedAt, notes.source.label], ["Stanford", "2026-10-08", "FightingIrish.com"], "the notes for Stanford, published Oct. 8");
eq(notes && [notes.glance.length, notes.numbers.length], [6, 15], "six series facts, 15 numbers");
var faison = N.player(notes, "Jordan Faison"), bowen = N.player(notes, "Drayk Bowen");
eq(faison && [faison.say, faison.captain, faison.honors.length], ["FAY-zonn", true, 0], "Jordan Faison: FAY-zonn, a captain, no honors listed");
eq(bowen && [bowen.say, bowen.captain, bowen.honors[1]], ["Drake BOE-en", true, "Butkus Award Watch List"], "Drayk Bowen: Drake BOE-en, a captain, the Butkus watch list");
eq(N.player(notes, "Christopher Burgess Jr.") && N.player(notes, "Christopher Burgess Jr.").say, "BURG-jess", "a Jr. on either side matches");
eq(N.player(notes, "Ko'o Kia") && N.player(notes, "Ko'o Kia").say, "KOH-oh KEE-ah", "ESPN's straight apostrophe matches the notes' curly one");
eq(N.player(notes, "Nobody Here"), null, "an unknown player has nothing");
eq(N.player(null, "Jordan Faison"), null, "no notes, nothing");
var stanford = { oppName: "Stanford", status: "scheduled" };
ok(N.forGame(notes, stanford) === notes, "the notes belong to the Stanford game");
ok(N.forGame(notes, { oppName: "Stanford", status: "live" }) === notes, "and still while it is played");
eq(N.forGame(notes, { oppName: "Stanford", status: "final" }), null, "not once it is final: last week's numbers never sit beside next week's game");
eq(N.forGame(notes, { oppName: "BYU", status: "scheduled" }), null, "not for another opponent");
eq(N.forGame(N.model(Object.assign({}, snap, { game: "Michigan State" }), CFG), { oppName: "Michigan St", status: "scheduled" }) !== null, true,
   "\"Michigan State\" in the notes is ESPN's \"Michigan St\"");
eq(N.model(Object.assign({}, snap, { team: "ohio-state" }), CFG), null, "another team's snapshot: nothing");
eq(N.model(Object.assign({}, snap, { capability: "depth" }), CFG), null, "a snapshot of another kind: nothing");
ok(!/notre|irish|stanford/i.test(read("teamos/notes.js").replace(/\/\*[\s\S]*?\*\//g, "")), "notes.js names no team");

console.log("2-3. on screen");
(async function () {
  var chromium = require("playwright").chromium;
  var serve = require("./lib/serve"), server = serve(root);
  await new Promise(function (r) { server.listen(0, "127.0.0.1", r); });
  var base = "http://127.0.0.1:" + server.address().port;
  var browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined });
  var AT = new Date("2026-10-08T16:00:00Z");

  async function open(slug, opts) {
    var ctx = await browser.newContext({ viewport: { width: opts.width || 390, height: 844 }, serviceWorkers: "block" });
    var page = await ctx.newPage();
    await page.clock.setSystemTime(AT);
    await page.route("**/*", function (route) {
      var u = route.request().url();
      if (/\/data\/notre-dame\/notes\.json/.test(u)) return route.fulfill({ status: 200, contentType: "application/json", body: opts.notes || read(SNAP),
                                                                     headers: opts.cached ? { "X-IW-Cached": opts.cached } : {} });
      if (/\/data\/notre-dame\/depth\.json/.test(u)) return route.fulfill({ status: 200, contentType: "application/json", body: read("tools/fixtures/nd-depth-g4.json") });
      if (u.startsWith(base)) return route.continue();
      if (/\/teams\/87\/roster/.test(u)) return route.fulfill({ status: 200, contentType: "application/json", body: read("tools/fixtures/espn-roster-nd-oct02.json") });
      if (/\/schedule(\?|$)/.test(u)) return route.fulfill({ status: 200, contentType: "application/json", body: read(opts.schedule || "tools/fixtures/espn-schedule-nd-oct08.json") });
      return route.abort();
    });
    await page.goto(base + "/?team=" + slug + "#home");
    await page.waitForFunction(function () { return !document.getElementById("launch"); }, null, { timeout: 9000 }).catch(function () {});
    await page.waitForTimeout(800);
    return { ctx: ctx, page: page };
  }
  async function go(page, hash) {
    await page.evaluate(function (h) { location.hash = h; }, hash);
    await page.waitForTimeout(700);
  }
  function shot(page, name) {
    return process.env.SHOTS ? page.screenshot({ path: path.join(process.env.SHOTS, name + ".png"), fullPage: true }) : null;
  }
  function wide(page) {
    return page.evaluate(function () { return document.documentElement.scrollWidth > document.documentElement.clientWidth; });
  }

  // ---- Notre Dame, the week of Stanford ----
  var a = await open("notre-dame", {});
  var home = await a.page.evaluate(function () {
    var s = document.querySelector('#screenHome [data-home="numbers"]');
    var order = [].map.call(document.querySelectorAll("#screenHome [data-home]"), function (e) { return e.getAttribute("data-home"); });
    return { shown: !!s && !s.hidden, items: s ? s.querySelectorAll(".bn-list li").length : 0,
             text: s ? s.innerText.replace(/\s+/g, " ") : "", link: s && s.querySelector('a.sec-link[href="#game"]') ? true : false, order: order };
  });
  await shot(a.page, "notes-home");
  ok(home.shown && home.items === 3, "Home: By the Numbers, three of them (" + home.text.slice(0, 90) + "...)");
  ok(/By the Numbers/.test(home.text) && /\b2\b.*captain twice/.test(home.text), "the number and the fact it counts");
  ok(home.link, "View All goes to Game");
  ok(home.order.indexOf("numbers") === home.order.indexOf("milestone") + 1, "right under the milestone");

  await go(a.page, "#game");
  var game = await a.page.evaluate(function () {
    function t(sel) { var e = document.querySelector("#screenGame " + sel); return e ? e.innerText.replace(/\s+/g, " ") : ""; }
    var more = document.querySelector("#screenGame .gcard-numbers details.bn-more");
    return { series: t(".gcard-series"), facts: document.querySelectorAll("#screenGame .gcard-series .gn-facts li").length,
             trophy: !!document.querySelector("#screenGame .gcard-series .series-ic svg"),
             nums: document.querySelectorAll("#screenGame .gcard-numbers > .bn-list li").length,
             more: more ? more.querySelector("summary").innerText.trim() : "", moreOpen: more ? more.open : null,
             src: [].map.call(document.querySelectorAll("#screenGame .gn-src a"), function (x) { return x.href; }) };
  });
  await shot(a.page, "notes-game");
  ok(game.facts === 6 && /25-14-0/.test(game.series) && /Legends Trophy/.test(game.series), "Game: the series card, the all-time series and the trophy (" + game.facts + " facts)");
  ok(game.trophy, "the trophy mark, as before");
  ok(game.nums === 6 && game.more === "Show 9 more" && game.moreOpen === false, "By the numbers: six, then 9 more folded");
  ok(game.src.length === 2 && game.src.every(function (h) { return /^https:\/\/fightingirish\.com\//.test(h); }), "each card names its source and links the notes");

  await go(a.page, "#roster/roster");
  var ro = await a.page.evaluate(function () {
    var rows = [].slice.call(document.querySelectorAll("#screenRoster .ro-row.roster"));
    function row(name) { return rows.filter(function (r) { return (r.querySelector(".ro-name") || {}).textContent.indexOf(name) === 0; })[0]; }
    var f = row("Jordan Faison"), b = row("Christopher Burgess"), w = row("Drayk Bowen"), h = w && w.querySelector("details.ro-honors");
    return { capts: document.querySelectorAll("#screenRoster .ro-row.roster .ro-capt").length,
             fCapt: !!(f && f.querySelector(".ro-capt[title=Captain]")), fSay: f ? (f.querySelector(".ro-say") || {}).textContent : "",
             fHon: h ? h.querySelector("summary").textContent : "", fOpen: h ? h.open : null, fNone: !!(f && f.querySelector(".ro-honors")),
             one: [].map.call(document.querySelectorAll("#screenRoster .ro-honor"), function (d) { return d.textContent; }),
             bSay: b ? (b.querySelector(".ro-say") || {}).textContent : "", said: document.querySelectorAll("#screenRoster .ro-say").length };
  });
  await shot(a.page, "notes-roster");
  eq(ro.capts, 4, "Roster: four captains marked");
  ok(ro.fCapt && ro.fSay === "Say FAY-zonn", "Jordan Faison: C, Say FAY-zonn (" + ro.fSay + ")");
  ok(ro.fHon === "4 honors" && ro.fOpen === false, "Drayk Bowen's honors folded: " + ro.fHon);
  ok(!ro.fNone, "no honors listed, no fold");
  ok(ro.one.indexOf("Shaun Alexander Freshman of the Year Award Watch List") >= 0, "a single honor is a plain line, nothing to open");
  ok(ro.bSay === "Say BURG-jess", "Christopher Burgess Jr.: Say BURG-jess");
  ok(ro.said >= 45, "about half the roster has a pronunciation (" + ro.said + ")");

  await go(a.page, "#roster/depth");
  var dc = await a.page.evaluate(function () { return document.querySelectorAll("#screenRoster .ro-capt").length; });
  await shot(a.page, "notes-depth");
  ok(dc >= 2, "Depth chart: the captains on it marked (" + dc + ")");
  await a.ctx.close();

  var n = await open("notre-dame", { width: 320 });
  var spill = [];
  for (var h of ["#home", "#game", "#roster/roster"]) { await go(n.page, h); if (await wide(n.page)) spill.push(h); }
  eq(spill, [], "at 320 px nothing runs off the screen");
  await n.ctx.close();

  // ---- notes for another game ----
  var other = Object.assign({}, snap, { game: "BYU" });
  var b = await open("notre-dame", { notes: JSON.stringify(other) });
  var bh = await b.page.evaluate(function () { var s = document.querySelector('#screenHome [data-home="numbers"]'); return !s || s.hidden; });
  await go(b.page, "#game");
  var bg = await b.page.evaluate(function () { return document.querySelectorAll("#screenGame .gn-facts, #screenGame .gcard-numbers").length; });
  await go(b.page, "#roster/roster");
  var br = await b.page.evaluate(function () { return document.querySelectorAll("#screenRoster .ro-capt, #screenRoster .ro-say").length; });
  ok(bh && bg === 0, "notes written for BYU: no numbers on Home, no series facts or numbers on Game");
  ok(br > 0, "but the players' names, captains and honors are the season's, and stay");
  await b.ctx.close();

  // ---- what Refresh Data says of the notes (Codex, #114) ----
  // Every other source is cut off here, so the count of sources Refresh
  // Data could not reach moves by one exactly when the notes are not a
  // refresh.
  async function unreached(opts) {
    var r = await open("notre-dame", opts);
    await go(r.page, "#settings");
    await r.page.click("#screenSettings [data-refresh]");
    await r.page.waitForTimeout(2500);
    var live = await r.page.evaluate(function () { return document.getElementById("live").textContent; });
    await r.ctx.close();
    var m = /(\d+) sources? couldn/.exec(live);
    return m ? +m[1] : (/^Data refreshed/.test(live) ? 0 : -1);
  }
  var base0 = await unreached({});
  ok(base0 >= 0, "Refresh Data with the notes answering: " + base0 + " other sources unreached");
  eq(await unreached({ cached: "Thu, 08 Oct 2026 12:00:00 GMT" }), base0 + 1, "the worker's kept copy of the notes is not called a refresh");
  eq(await unreached({ notes: JSON.stringify(Object.assign({}, snap, { team: "ohio-state" })) }), base0 + 1, "nor is another team's file");

  // ---- Ohio State ----
  var o = await open("ohio-state", { schedule: "tools/fixtures/espn-schedule-osu-2026.json" });
  var oh = await o.page.evaluate(function () { var s = document.querySelector('#screenHome [data-home="numbers"]'); return !s || s.hidden; });
  ok(oh, "Ohio State declares no notes: none of it");
  await o.ctx.close();

  await browser.close(); server.close();
  console.log("\n" + (failures ? failures + " check(s) FAILED" : "the week's notes, where a fan looks, and only for their game"));
  process.exit(failures ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
