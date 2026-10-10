#!/usr/bin/env node
/* Season Outlook's full field (W18), in a real browser.

     1. Home's Season Outlook links to the full field; the link opens
        #outlook with Home still selected, and Back returns to Home.
     2. Each view - Playoff, National Title - lists every team its market
        prices, most likely first, the same field TeamOS.markets.field()
        builds from the committed snapshot, with the team's own row marked
        and repeated above the list; a price under 1% reads "<1", never 0.
     3. The team's own number on the board is Home's number.
     4. Saved prices say so; a market that never loaded says it failed, or
        that the fan is offline; a refresh that fails keeps the board.
     5. Ohio State: the same board, its own row marked (no team named here).

   Kalshi's live routes are refused, so the app falls back to the committed
   league snapshots (data/league/odds-*.json), which the comparison reads
   too. No network is used.

   Usage:  node tools/outlookcheck.js
   Locally: NODE_PATH=$(npm root -g) PW_CHROMIUM=/path/to/chromium node tools/outlookcheck.js
   SHOTS=<dir> also saves a 390px screenshot of each view. */
"use strict";

var fs = require("fs"), path = require("path"), vm = require("vm");
var chromium = require("playwright").chromium;

var root = path.join(__dirname, "..");
var serve = require("./lib/serve");
function fixture(f) { return fs.readFileSync(path.join(root, "tools", "fixtures", f)); }
var server = serve(root);

var failures = 0;
function ok(cond, what) {
  if (cond) { console.log("  ok   " + what); return; }
  failures++; console.log("  FAIL " + what);
}

// The field each view should show, from the same snapshot, through TeamOS.
// Each team file declares its own TEAM_CONFIG, so each gets its own context.
function load(files) {
  var sb = {};
  vm.createContext(sb);
  files.forEach(function (f) {
    vm.runInContext(fs.readFileSync(path.join(root, f), "utf8") +
      "\n;this.TeamOS=TeamOS;this.TEAM_CONFIG=typeof TEAM_CONFIG!=='undefined'?TEAM_CONFIG:null;", sb, { filename: f });
  });
  return sb;
}
function snapshot(key) { return JSON.parse(fs.readFileSync(path.join(root, "data", "league", "odds-" + key + ".json"))); }
function expected(slug, key) {
  var sb = load(["teamos/outlook.js", "teamos/markets.js", "teams/" + slug + ".js"]);
  return sb.TeamOS.markets.field(snapshot(key), sb.TEAM_CONFIG, key);
}

(async function () {
  await new Promise(function (r) { server.listen(0, "127.0.0.1", r); });
  var base = "http://127.0.0.1:" + server.address().port;
  var browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined });

  async function open(slug, hash) {
    var ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
    var page = await ctx.newPage();
    var st = { odds: "ok", n: 0 };
    var H = { "access-control-allow-origin": "*" };
    var id = slug === "ohio-state" ? "194" : "87";
    await page.route("**/*", function (route) {
      var u = route.request().url();
      var odds = /\/(odds-(title|playoff)\.json)(\?|$)/.exec(u);
      if (odds) {
        st.n++;
        if (st.odds === "fail") return route.fulfill({ status: 503, headers: H, body: "" });
        return route.fulfill({ status: 200, contentType: "application/json", headers: H,
                               body: fs.readFileSync(path.join(root, "data", "league", odds[1])) });
      }
      if (/kalshi|corsproxy|allorigins|codetabs/.test(u)) return route.abort();
      if (u.startsWith(base)) return route.continue();
      if (new RegExp("/teams/" + id + "/schedule(\\?|$)").test(u)) return route.fulfill({ status: 200, contentType: "application/json", headers: H, body: fixture("espn-schedule-nd-sep24.json") });
      if (new RegExp("/teams/" + id + "(\\?|$)").test(u)) return route.fulfill({ status: 200, contentType: "application/json", headers: H, body: fixture("espn-team.json") });
      return route.abort();
    });
    await page.goto(base + "/?team=" + slug + (hash || "#home"));
    await page.waitForTimeout(1500);
    return { ctx: ctx, page: page, st: st,
      go: async function (h, ms) { await page.evaluate(function (x) { location.hash = x; }, h); await page.waitForTimeout(ms || 600); } };
  }
  function board(page) {
    return page.evaluate(function () {
      var h = document.getElementById("screenOutlook");
      var cur = document.querySelector('#navbar [aria-current="page"]');
      return {
        hidden: h.hidden,
        hash: location.hash,
        tab: (h.querySelector('.view-tabs [aria-current="page"]') || {}).textContent || "",
        navCurrent: cur ? cur.textContent.trim() : "",
        title: (document.getElementById("screenHead") || {}).textContent || "",
        you: (h.querySelector(".of-you") || {}).textContent || "",
        quiet: (h.querySelector(".sec-quiet") || {}).textContent || "",
        note: (h.querySelector(".ss-note") || {}).textContent || "",
        rows: [].map.call(h.querySelectorAll(".of-row"), function (r) {
          return { team: r.querySelector(".of-team").textContent, val: r.querySelector(".of-val").textContent,
                   mine: r.classList.contains("mine") && r.getAttribute("aria-current") === "true" };
        })
      };
    });
  }
  function pct(v) { return (v < 1 ? "<1" : String(Math.round(v))) + "%"; }
  async function shot(page, name) {
    if (!process.env.SHOTS) return;
    await page.screenshot({ path: path.join(process.env.SHOTS, name + ".png"), fullPage: true });
  }

  // ---- 1. the way in and out -------------------------------------------------
  console.log("1. Home links to the full field");
  var a = await open("notre-dame");
  var link = await a.page.evaluate(function () {
    var l = document.querySelector('#screenHome .home-outlook a.sec-link');
    return l ? { text: l.textContent.trim(), href: l.getAttribute("href") } : null;
  });
  ok(link && link.text === "View Full Field" && link.href === "#outlook", "Season Outlook carries 'View Full Field' (" + JSON.stringify(link) + ")");
  var homeMetric = await a.page.evaluate(function () {
    return [].map.call(document.querySelectorAll("#screenHome .out-metric"), function (m) {
      return { label: m.querySelector(".out-label").textContent, value: m.querySelector(".out-value").textContent };
    });
  });
  await a.page.click('#screenHome .home-outlook a.sec-link');
  await a.page.waitForTimeout(600);
  var p = await board(a.page);
  ok(!p.hidden && p.hash === "#outlook", "the link opens #outlook");
  ok(p.navCurrent === "Home", "with Home still selected (" + p.navCurrent + ")");
  ok(/Season Outlook/.test(p.title), "the screen names itself Season Outlook (" + p.title + ")");
  ok(p.tab === "Playoff", "Playoff is the first view");
  await shot(a.page, "outlook-playoff-nd");

  // ---- 2. the field ----------------------------------------------------------
  console.log("2. every team the market prices, most likely first");
  var want = expected("notre-dame", "playoff");
  ok(p.rows.length === want.rows.length && p.rows.length > 20, "Playoff lists all " + want.rows.length + " teams (" + p.rows.length + ")");
  ok(p.rows.every(function (r, i) { return r.team === want.rows[i].team && r.val === pct(want.rows[i].value); }),
     "in TeamOS's order, each at its price");
  var mine = p.rows.filter(function (r) { return r.mine; });
  var wantMine = want.rows.filter(function (r) { return r.mine; })[0];
  ok(mine.length === 1 && mine[0].team === wantMine.team, "the team's own row, and only it, is marked (" + (mine[0] || {}).team + ")");
  var at = want.rows.indexOf(wantMine) + 1;
  ok(p.you.indexOf(pct(wantMine.value)) > -1 && p.you.indexOf(" of " + want.rows.length) > -1 && new RegExp("\\b" + at + "(st|nd|rd|th)\\b").test(p.you),
     "and repeated above the list with its place (" + p.you + ")");
  var small = want.rows.filter(function (r) { return r.value < 1; });
  ok(!small.length || p.rows.filter(function (r) { return r.val === "<1%"; }).length === small.length,
     "a price under 1% reads <1%, never 0% (" + small.length + " such)");
  ok(!p.rows.some(function (r) { return r.val === "0%"; }), "no team reads 0%");
  ok(/Kalshi/.test(p.note) && /Information only/.test(p.note), "attributed to Kalshi, information only");
  ok(/Saved prices, as of/.test(p.note) || /As of/.test(p.note) || !snapshot("playoff").fetchedAt, "says when the prices are from, when the snapshot does");

  console.log("3. the team's number is Home's number");
  var hp = homeMetric.filter(function (m) { return /Playoff/.test(m.label); })[0];
  ok(hp && hp.value.replace(/\s/g, "") === String(Math.round(wantMine.value)) + "%", "Home's Playoff figure " + (hp && hp.value) + " = the board's " + pct(wantMine.value));

  await a.page.click('#screenOutlook .view-tabs a[href="#outlook/title"]');
  await a.page.waitForTimeout(600);
  var t = await board(a.page);
  var wantT = expected("notre-dame", "title");
  ok(t.hash === "#outlook/title" && t.tab === "National Title", "National Title is the second view");
  ok(t.rows.length === wantT.rows.length && t.rows.every(function (r, i) { return r.team === wantT.rows[i].team && r.val === pct(wantT.rows[i].value); }),
     "it lists the title market's " + wantT.rows.length + " teams, in order");
  ok(t.rows.filter(function (r) { return r.mine; }).length === 1, "the team's own row marked");
  await shot(a.page, "outlook-title-nd");
  await a.page.goBack(); await a.page.waitForTimeout(400);
  await a.page.goBack(); await a.page.waitForTimeout(600);
  var back = await board(a.page);
  ok(back.hidden && back.hash === "#home", "Back walks the views, then returns to Home (" + back.hash + ")");

  // ---- 4. states --------------------------------------------------------------
  console.log("4. failure, offline, and a refresh that fails");
  var refresh = await a.page.evaluate(function () { return typeof refreshAll === "function"; });
  a.st.odds = "fail";
  await a.go("#outlook");
  if (refresh) { await a.page.evaluate(function () { return refreshAll(true); }); await a.page.waitForTimeout(600); }
  var kept = await board(a.page);
  ok(kept.rows.length === want.rows.length, "a refresh that fails keeps the board (" + kept.rows.length + " rows)");
  await a.ctx.close();

  var g = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
  var gp = await g.newPage(), down = true;
  await gp.route("**/*", function (route) {
    var u = route.request().url();
    var odds = /\/(odds-(title|playoff)\.json)(\?|$)/.exec(u);
    if (odds && !down) return route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" },
                                              body: fs.readFileSync(path.join(root, "data", "league", odds[1])) });
    if (odds || /kalshi|corsproxy|allorigins|codetabs/.test(u)) return route.abort();
    if (u.startsWith(base)) return route.continue();
    return route.abort();
  });
  await gp.goto(base + "/?team=notre-dame#outlook"); await gp.waitForTimeout(2500);
  var failed = await board(gp);
  ok(/didn't load/.test(failed.quiet) && !failed.rows.length, "a market that never loaded says so (" + failed.quiet + ")");
  await gp.context().setOffline(true);
  await gp.evaluate(function () { window.dispatchEvent(new Event("offline")); location.hash = "#outlook/title"; });
  await gp.waitForTimeout(800);
  var off = await board(gp);
  ok(/offline/i.test(off.quiet), "offline, it says so (" + off.quiet + ")");
  down = false;
  await gp.context().setOffline(false);
  await gp.evaluate(function () { window.dispatchEvent(new Event("online")); });
  await gp.waitForTimeout(1500);
  var back2 = await board(gp);
  ok(back2.rows.length === expected("notre-dame", "title").rows.length,
     "and when the connection returns, the field loads, as it said it would (" + back2.rows.length + " rows; Codex review, #109)");
  await g.close();

  // ---- 5. another team ---------------------------------------------------------
  console.log("5. Ohio State: the same board, its own row");
  var o = await open("ohio-state", "#outlook");
  var ob = await board(o.page);
  var wantO = expected("ohio-state", "playoff");
  var oMine = ob.rows.filter(function (r) { return r.mine; });
  var wantOMine = wantO.rows.filter(function (r) { return r.mine; })[0];
  ok(ob.rows.length === wantO.rows.length, "the same field (" + ob.rows.length + ")");
  ok(oMine.length === 1 && wantOMine && oMine[0].team === wantOMine.team, "with Ohio State's row marked (" + (oMine[0] || {}).team + ")");
  await shot(o.page, "outlook-playoff-osu");
  await o.ctx.close();

  await browser.close();
  server.close();
  console.log("\n" + (failures ? failures + " check(s) FAILED" : "the full field is the market, whole, and Home's number is on it"));
  process.exit(failures ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
