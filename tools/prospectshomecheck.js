#!/usr/bin/env node
/* Recruiting and the NFL draft on Home (offseason proposal §7, rows 4 and 6;
   offseason UI contract: News directly below the hero in S4/S5, the
   supported recruiting and draft content after it).

   The real app, Notre Dame and Ohio State, both styles. Real ESPN captures
   only: each team's 2025 season (Notre Dame declined its bowl; Ohio State
   played in the CFP), ESPN's 2025 postseason board and the Jan 14, 2026
   rankings feed with its AP poll marked final, as in offseasonnavcheck.js.
   The snapshots the app reads are made by tools/producers/prospects.py from
   the real recruiting captures, the Oct 3 2027 board and the 2026 board after
   the draft, so no figure here is typed in. The repository's own data files
   are never read: they change every day. No live APIs. */
"use strict";
var fs = require("fs"), path = require("path"), cp = require("child_process"), assert = require("assert");
var chromium = require("playwright").chromium, root = path.join(__dirname, "..");
var server = require("./lib/serve")(root), checks = [];
var shots = path.join(root, "artifacts/visual/prospects-home");
function fixture(n) { return fs.readFileSync(path.join(root, "tools/fixtures", n), "utf8"); }
function ok(value, label) { assert(value, label); checks.push(label); console.log("  ok   " + label); }

// The producer, run on the captures.
var PY = [
  "import json,sys",
  "sys.path.insert(0, sys.argv[1])",
  "import prospects as P",
  "fx = lambda n: json.load(open(sys.argv[2] + '/' + n))",
  "t = fx('espn-nflteams-2026-oct3.json')",
  "names = {str(x['team']['id']): x['team'].get('displayName') for s in t.get('sports') or [] for lg in s.get('leagues') or [] for x in lg.get('teams') or []}",
  "print(json.dumps({",
  "  'nd': P.normalize_class(fx('espn-recruits-nd-2027.json'), '87'),",
  "  'osu': P.normalize_class(fx('espn-recruits-osu-2027.json'), '194'),",
  "  'board': P.normalize_board(fx('espn-draftboard-2027-oct3.json'), 2027, None, None),",
  "  'drafted': P.normalize_board(fx('espn-draftboard-2026-final.json'), 2026, fx('espn-draftrounds-2026.json'), names)",
  "}))"
].join("\n");
var made = cp.spawnSync("python3", ["-c", PY, path.join(root, "tools/producers"), path.join(root, "tools/fixtures")], { encoding: "utf8" });
if (made.status !== 0) { console.error(made.stderr); process.exit(1); }
var SNAP = JSON.parse(made.stdout);
// The refresh stamps when it read ESPN; the producer's normalize does not.
["nd", "osu", "board", "drafted"].forEach(function (k) { SNAP[k].fetchedAt = "2026-01-24T07:08Z"; });

var TEAMS = {
  "notre-dame": { id: "87", reg: "espn-schedule-nd-2025-reg.json", post: "espn-schedule-nd-2025-post.json", recruits: SNAP.nd },
  "ohio-state": { id: "194", reg: "espn-schedule-osu-2025-reg.json", post: "espn-schedule-osu-2025-post-notes.json", recruits: SNAP.osu }
};
function mine(list, id) { return list.filter(function (p) { return p.collegeId === id; }); }
function rankings() {
  var d = JSON.parse(fixture("espn-rankings-cfp-20260114.json"));
  d.rankings.forEach(function (r) { if (r.type === "ap") r.occurrence = Object.assign({}, r.occurrence, { last: true }); });
  return JSON.stringify(d);
}

(async function () {
  fs.mkdirSync(shots, { recursive: true });
  await new Promise(function (r) { server.listen(0, "127.0.0.1", r); });
  var base = "http://127.0.0.1:" + server.address().port;
  var browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined });
  // o: { team, now, style, width, recruits, draft, unset } - recruits/draft
  // are a snapshot body, or a number for an HTTP status; unset leaves ESPN's
  // postseason board empty (before selection).
  async function open(o) {
    var T = TEAMS[o.team];
    var ctx = await browser.newContext({ viewport: { width: o.width || 390, height: 844 }, timezoneId: "America/New_York", serviceWorkers: "block" });
    var page = await ctx.newPage(), errors = [], asked = {};
    await page.clock.setSystemTime(new Date(o.now));
    if (o.style) await page.addInitScript(function (s) { localStorage.setItem("suite-style", s); }, o.style);
    page.on("pageerror", function (e) { errors.push(String(e)); });
    function answer(route, v) {
      if (typeof v === "number") return route.fulfill({ status: v, body: "" });
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(v) });
    }
    await ctx.route("**/*", function (route) {
      var u = route.request().url(), body = null;
      if (u.startsWith(base)) {
        var p = u.slice(base.length).split("?")[0];
        if (/^\/data\/[a-z-]+\/recruits\.json$/.test(p)) { asked.recruits = p; return answer(route, o.recruits); }
        if (p === "/data/league/draft.json") { asked.draft = true; return answer(route, o.draft); }
        return route.continue();
      }
      if (new RegExp("/teams/" + T.id + "/schedule\\?seasontype=2&season=2026").test(u)) body = '{"events":[]}';
      else if (new RegExp("/teams/" + T.id + "/schedule\\?seasontype=3").test(u)) body = fixture(T.post);
      else if (new RegExp("/teams/" + T.id + "/schedule").test(u)) body = fixture(o.reg || T.reg);
      else if (/\/scoreboard\?.*seasontype=3/.test(u)) body = o.unset ? '{"events":[]}' : fixture("espn-scoreboard-postboard-2025.json");
      else if (/\/scoreboard\?/.test(u)) body = '{"events":[]}';
      else if (/\/rankings/.test(u)) body = rankings();
      if (/\/schedule/.test(u)) asked.schedule = true;
      if (body) return route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: body });
      return route.abort();
    });
    await page.goto(base + "/?team=" + o.team + (o.hash || "#home"));
    await page.waitForFunction(function (sel) { return !document.getElementById("launch") && document.querySelector(sel); },
                               o.hash ? "#screenRoster [data-ro]" : "#screenHome [data-home]", { timeout: 15000 });
    // The app keeps its state private: wait for the prospect reads it makes
    // (or, in season, for the schedule and a settled paint).
    var t0 = Date.now();
    while (o.expectAsk && !(asked.recruits && asked.draft) && Date.now() - t0 < 15000) await page.waitForTimeout(100);
    await page.waitForTimeout(900);
    return { ctx: ctx, page: page, errors: errors, asked: asked };
  }
  function home(page) {
    return page.evaluate(function () {
      var host = document.getElementById("screenHome");
      function sec(k) {
        var el = host.querySelector('[data-home="' + k + '"]');
        return { hidden: !el || el.hidden, text: el ? el.innerText.replace(/\s+/g, " ").trim() : "",
                 names: el ? [].map.call(el.querySelectorAll(".pr-name"), function (n) { return n.textContent; }) : [],
                 stars: el ? [].map.call(el.querySelectorAll(".pr-stars"), function (n) { return n.querySelector(".sr-only").textContent + "|" + n.querySelector(".pr-by").textContent + "|" + n.querySelector(".pr-star").textContent; }) : [],
                 metas: el ? [].map.call(el.querySelectorAll(".pr-meta"), function (n) { return n.textContent; }) : [],
                 figs: el ? [].map.call(el.querySelectorAll(".pr-fig"), function (n) { return n.textContent; }) : [],
                 more: el && el.querySelector("details summary") ? el.querySelector("details summary").textContent : null,
                 credit: el && el.querySelector(".pr-src") ? el.querySelector(".pr-src").textContent : null,
                 href: el && el.querySelector(".pr-src a") ? el.querySelector(".pr-src a").getAttribute("href") : null };
      }
      return { order: [].map.call(host.querySelectorAll("[data-home]"), function (e) { return e.dataset.home; }).join(","),
               recruiting: sec("recruiting"), draft: sec("draft") };
    });
  }
  function overflow(page) {
    return page.evaluate(function () {
      var bad = [];
      if (document.documentElement.scrollWidth > window.innerWidth) bad.push("page " + document.documentElement.scrollWidth);
      document.querySelectorAll("#screenHome .pr, #screenHome .pr li").forEach(function (el) {
        if (el.scrollWidth > el.clientWidth + 1) bad.push(el.className || el.tagName);
      });
      return bad;
    });
  }
  var JAN = "2026-01-25T17:00:00Z";
  try {
    for (var team of ["notre-dame", "ohio-state"]) {
      var T = TEAMS[team], ours = mine(SNAP.board.prospects, T.id);
      console.log(team + ": season complete (S4)");
      var a = await open({ team: team, now: JAN, recruits: T.recruits, draft: SNAP.board, expectAsk: true });
      var h = await home(a.page);
      ok(/^fresh,hero,news,recruiting,draft,/.test(h.order), team + ": Recruiting and NFL Draft follow News, directly under the hero (" + h.order + ")");
      ok(!h.recruiting.hidden && !h.draft.hidden, team + ": both sections show");
      ok(h.recruiting.text.indexOf(T.recruits.recruits.length + " commitments in the 2027 class") > -1, team + ": the class, counted (" + T.recruits.recruits.length + ")");
      ok(h.recruiting.names[0] === T.recruits.recruits[0].name, team + ": ESPN's best grade first (" + h.recruiting.names[0] + ")");
      ok(h.recruiting.names.length === T.recruits.recruits.length, team + ": every commitment is listed");
      ok(h.recruiting.more === "Show " + (T.recruits.recruits.length - 5) + " more", team + ": five shown, the rest one tap away");
      var r0 = T.recruits.recruits[0];
      ok(h.recruiting.figs[0] === r0.grade + "grade", team + ": the grade leads, labeled");
      var want = r0.grade >= 90 ? 5 : r0.grade >= 80 ? 4 : 3;
      ok(h.recruiting.stars[0] === want + "-star, ESPN|ESPN|" + "\u2605".repeat(5), team + ": " + want + " stars out of five, credited to ESPN (" + h.recruiting.stars[0] + ")");
      ok(await a.page.evaluate(function () {
        return [].every.call(document.querySelectorAll("#screenHome .pr-stars"), function (n) {
          return n.querySelector(".pr-star").getAttribute("aria-hidden") === "true" && n.querySelector(".pr-by").getAttribute("aria-hidden") === "true";
        });
      }), team + ": screen readers hear the stars and their source once (\"4-star, ESPN\"), not the glyphs or the label again (Codex, #164)");
      var starless = T.recruits.recruits.filter(function (r) { return r.grade == null || r.grade < 50; }).length;
      ok(h.recruiting.stars.length === T.recruits.recruits.length - starless, team + ": stars on every graded recruit" + (starless ? ", none under ESPN's scale (" + starless + ")" : ""));
      ok(h.recruiting.text.indexOf(r0.highSchool) > -1 && h.recruiting.text.indexOf(r0.city + ", " + r0.state) > -1, team + ": high school and hometown");
      var unranked = T.recruits.recruits.filter(function (r) { return r.rank == null; }).length;
      ok(unranked > 0 && h.recruiting.metas.filter(function (m) { return / overall/.test(m); }).length === T.recruits.recruits.length - unranked,
         team + ": " + unranked + " recruits ESPN does not rank show no overall rank, not a made-up one");
      ok(h.recruiting.credit.indexOf("ESPN recruiting") === 0 && h.recruiting.href === T.recruits.sourceUrl, team + ": credited to ESPN, linked to its source");
      ok(h.draft.text.indexOf(ours.length + " on ESPN’s 2027 draft board") > -1, team + ": " + ours.length + " on the board");
      ok(h.draft.names.join("|") === ours.map(function (p) { return p.name; }).join("|"), team + ": the team's prospects, in ESPN's overall order");
      ok(h.draft.more === (ours.length > 6 ? "Show " + (ours.length - 5) + " more" : null), team + ": no \"Show 1 more\" for a single row");
      ok(h.draft.figs[0] === ours[0].overall + "overall", team + ": overall rank leads, labeled");
      ok(h.draft.text.indexOf("No. " + ours[0].positionRank + " " + ours[0].position) > -1, team + ": position rank");
      ok(!/grade/i.test(h.draft.text), team + ": no ESPN grade on the board yet, and none is shown");
      ok(h.draft.credit.indexOf("ESPN draft board") === 0, team + ": credited \"ESPN draft board\"");
      ok(!/project|mock/i.test(h.draft.text + h.recruiting.text), team + ": never called a projected pick");
      ok(!/undefined|null|NaN/.test(h.draft.text + h.recruiting.text), team + ": no missing value printed");
      ok(a.errors.length === 0, team + ": no page errors (" + a.errors.join(" | ") + ")");
      await a.page.screenshot({ path: path.join(shots, team + "-390-team.png"), fullPage: true });
      await a.ctx.close();

      for (var style of ["team", "suite"]) for (var w of [320, 390, 768, 1280]) {
        var v = await open({ team: team, now: JAN, style: style, width: w, recruits: T.recruits, draft: SNAP.board, expectAsk: true });
        await v.page.evaluate(function () { document.querySelectorAll("#screenHome details").forEach(function (d) { d.open = true; }); });
        var bad = await overflow(v.page);
        ok(!bad.length, team + " " + style + " " + w + "px: nothing wider than its card (" + bad.join(", ") + ")");
        if (w === 320) {
          await v.page.evaluate(function () { document.documentElement.style.fontSize = "200%"; });
          bad = await overflow(v.page);
          ok(!bad.length, team + " " + style + " 320px at 200% text: still fits (" + bad.join(", ") + ")");
          await v.page.evaluate(function () { document.documentElement.style.fontSize = ""; });
        }
        var el = await v.page.$('#screenHome [data-home="recruiting"]');
        await el.screenshot({ path: path.join(shots, team + "-" + w + "-" + style + "-recruiting.png") });
        el = await v.page.$('#screenHome [data-home="draft"]');
        await el.screenshot({ path: path.join(shots, team + "-" + w + "-" + style + "-draft.png") });
        await v.ctx.close();
      }

      // After the draft: the real 2026 board with ESPN's rounds. The round
      // and pick lead; ESPN's grade, published by then, shows.
      var picked = mine(SNAP.drafted.prospects, T.id).filter(function (p) { return p.pick; })
        .sort(function (x, y) { return x.pick.overall - y.pick.overall; });
      var d = await open({ team: team, now: JAN, recruits: T.recruits, draft: SNAP.drafted, expectAsk: true });
      h = await home(d.page);
      var p0 = picked[0];
      ok(h.draft.text.indexOf(picked.length + " drafted in 2026") > -1, team + " after the draft: " + picked.length + " drafted");
      ok(h.draft.names[0] === p0.name && h.draft.figs[0] === p0.pick.overall + "pick", team + " after the draft: draft order, the pick leads (" + p0.name + ")");
      ok(h.draft.text.indexOf("Round " + p0.pick.round + ", Pick " + p0.pick.pick + " · " + p0.pick.nflTeam) > -1, team + " after the draft: the actual round, pick and team");
      ok(h.draft.text.indexOf("ESPN grade " + p0.grade) > -1, team + " after the draft: ESPN's grade, once published");
      await d.page.screenshot({ path: path.join(shots, team + "-390-drafted.png"), fullPage: true });
      await d.ctx.close();
    }

    console.log("Roster's Prospects view, all year");
    // Mid-season: the real 2026 schedules as ESPN showed them on Oct 2
    // (four games played). Home stays the in-season Home, and Roster's
    // Prospects view shows the class and the board.
    var OCT = "2026-10-02T16:00:00Z", MID = { "notre-dame": "espn-schedule-nd-2026-reg.json", "ohio-state": "espn-schedule-osu-2026.json" };
    function roster(page) {
      return page.evaluate(function () {
        var host = document.getElementById("screenRoster"), body = host.querySelector('[data-ro="body"]');
        var ids = [].map.call(document.querySelectorAll("[id]"), function (e) { return e.id; });
        return { tabs: [].map.call(host.querySelectorAll(".view-tabs a"), function (a) { return a.textContent + (a.getAttribute("aria-current") ? "*" : ""); }).join("|"),
                 text: body.innerText.replace(/\s+/g, " ").trim(),
                 cards: body.querySelectorAll(".card.pr").length,
                 heads: [].map.call(body.querySelectorAll(".sec-title"), function (h) { return h.textContent; }).join("|"),
                 dupes: ids.filter(function (id, i) { return ids.indexOf(id) !== i; }) };
      });
    }
    for (var rteam of ["notre-dame", "ohio-state"]) {
      var RT = TEAMS[rteam];
      var r = await open({ team: rteam, now: OCT, reg: MID[rteam], hash: "#roster/prospects", recruits: RT.recruits, draft: SNAP.board, expectAsk: true });
      var ro = await roster(r.page);
      ok(/Prospects\*$/.test(ro.tabs), rteam + " in season: Prospects is a Roster view, selected (" + ro.tabs + ")");
      ok(ro.cards === 2 && ro.heads === "Recruiting|NFL Draft", rteam + " in season: the class, then the draft board");
      ok(ro.text.indexOf(RT.recruits.recruits.length + " commitments in the 2027 class") > -1 && ro.text.indexOf("ESPN") > -1, rteam + " in season: the same cards as the offseason Home, credited to ESPN");
      ok(!ro.dupes.length, rteam + ": Home's and Roster's headings keep their own ids (" + ro.dupes.join(",") + ")");
      ok(r.errors.length === 0, rteam + " Roster: no page errors (" + r.errors.join(" | ") + ")");
      await r.page.screenshot({ path: path.join(shots, rteam + "-390-roster-prospects.png"), fullPage: true });
      await r.ctx.close();
      for (var rstyle of ["team", "suite"]) {
        var n = await open({ team: rteam, now: OCT, reg: MID[rteam], style: rstyle, width: 320, hash: "#roster/prospects", recruits: RT.recruits, draft: SNAP.board, expectAsk: true });
        var nb = await n.page.evaluate(function () {
          var bad = [], strip = document.querySelector("#screenRoster .view-tabs");
          if (document.documentElement.scrollWidth > window.innerWidth) bad.push("page");
          if (strip && strip.scrollWidth > strip.clientWidth + 1) bad.push("view tabs");
          document.querySelectorAll("#screenRoster .pr").forEach(function (el) { if (el.scrollWidth > el.clientWidth + 1) bad.push("card"); });
          return bad;
        });
        ok(!nb.length, rteam + " " + rstyle + " 320px: the views and the cards fit (" + nb.join(", ") + ")");
        await n.page.screenshot({ path: path.join(shots, rteam + "-320-" + rstyle + "-roster-prospects.png") });
        await n.ctx.close();
      }
    }
    var hs = await open({ team: "notre-dame", now: OCT, reg: MID["notre-dame"], recruits: SNAP.nd, draft: SNAP.board });
    h = await home(hs.page);
    ok(h.recruiting.hidden && h.draft.hidden && !hs.asked.recruits, "in season, Home is unchanged: no cards, nothing read until Prospects is opened");
    await hs.ctx.close();
    var rf = await open({ team: "notre-dame", now: OCT, reg: MID["notre-dame"], reg: MID[rteam], hash: "#roster/prospects", recruits: 503, draft: 503, expectAsk: true });
    ro = await roster(rf.page);
    ok(ro.cards === 0 && /The recruiting class didn.t load\./.test(ro.text) && /ESPN.s draft board didn.t load\./.test(ro.text),
       "both reads failed: Prospects says so, never a blank view");
    await rf.ctx.close();
    var nobody = JSON.parse(JSON.stringify(SNAP.board));
    nobody.prospects = nobody.prospects.filter(function (p) { return p.collegeId !== "87"; });
    var rn = await open({ team: "notre-dame", now: OCT, reg: MID["notre-dame"], reg: MID[rteam], hash: "#roster/prospects", recruits: SNAP.nd, draft: nobody, expectAsk: true });
    ro = await roster(rn.page);
    ok(ro.cards === 1 && /None of the team.s players are on ESPN.s 2027 draft board\./.test(ro.text), "no players on the board: the class, and a line saying so");
    await rn.ctx.close();

    console.log("what is left out");
    // S2: Notre Dame's regular season over, the field not set (ESPN's
    // postseason board still empty). Not the offseason Home yet: nothing
    // read, nothing shown.
    var s2 = await open({ team: "notre-dame", now: "2025-12-01T17:00:00Z", unset: true, recruits: SNAP.nd, draft: SNAP.board });
    h = await home(s2.page);
    ok(h.recruiting.hidden && h.draft.hidden && !s2.asked.recruits && !s2.asked.draft, "S2: no recruiting or draft section, and neither file is read");
    ok(/^fresh,hero,milestone,numbers,news,/.test(h.order), "S2: the in-season order");
    await s2.ctx.close();
    // A draft board that will not load: the section is left out, the class
    // still shows.
    var f = await open({ team: "notre-dame", now: JAN, recruits: SNAP.nd, draft: 503, expectAsk: true });
    h = await home(f.page);
    ok(h.draft.hidden && !h.recruiting.hidden && f.errors.length === 0, "the draft board failed: no draft section, the class still shows, no errors");
    await f.ctx.close();
    // Another team's class in this team's file is refused, never shown.
    var x = await open({ team: "notre-dame", now: JAN, recruits: SNAP.osu, draft: SNAP.board, expectAsk: true });
    h = await home(x.page);
    ok(h.recruiting.hidden && !h.draft.hidden, "Ohio State's class in Notre Dame's file: refused, no recruiting section");
    await x.ctx.close();
    // No prospects of this team on the board: no empty card.
    var none = JSON.parse(JSON.stringify(SNAP.board));
    none.prospects = none.prospects.filter(function (p) { return p.collegeId !== "87"; });
    var y = await open({ team: "notre-dame", now: JAN, recruits: SNAP.nd, draft: none, expectAsk: true });
    h = await home(y.page);
    ok(h.draft.hidden, "none of the team's players on the board: no draft section");
    await y.ctx.close();
  } finally {
    await browser.close(); server.close();
  }
  console.log("\n" + checks.length + " checks: recruiting and the draft on the offseason Home");
})().catch(function (e) { console.error("FAIL " + (e && e.message || e)); process.exit(1); });
