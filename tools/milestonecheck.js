#!/usr/bin/env node
/* The road to a round number of all-time wins (David, 2026-10-07: "Build the
   1,000th win countdown before BYU").

     1. TeamOS.milestones over the real Notre Dame schedule (captured
        2026-10-08): the record entering the season (the team's config) plus
        the season's finals is 998-342-42, the very number the Oct. 5 game
        notes print - two from 1,000, next Stanford.
     2. Each turn of the season, from that real schedule with the next
        results written in: a win (999, on the line at BYU), the 1,000th
        (reached, held a week, then gone), a loss (the count holds), a game
        in progress or a final without a score (not counted), another
        season's record (nothing, never a stale count), Ohio State (declares
        no record: nothing).
     3. Home in a real browser: the card under the hero says so, and a team
        without a milestone has no card.

   Usage: node tools/milestonecheck.js     (exit 1 on failure) */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");
var root = path.join(__dirname, "..");
function read(p) { return fs.readFileSync(path.join(root, p), "utf8"); }

var failures = 0;
function ok(cond, what) { if (cond) { console.log("  ok   " + what); return; } failures++; console.log("  FAIL " + what); }
function eq(a, b, what) { ok(JSON.stringify(a) === JSON.stringify(b), what + " = " + JSON.stringify(b) + (JSON.stringify(a) === JSON.stringify(b) ? "" : " (got " + JSON.stringify(a) + ")")); }

function load(teamFile) {
  var c = vm.createContext({});
  [teamFile, "teamos/team.js", "teamos/snapshots.js", "teamos/identity.js", "teamos/live.js", "teamos/season.js", "teamos/espn.js", "teamos/milestones.js"]
    .forEach(function (f) { vm.runInContext(read(f), c, { filename: f }); });
  vm.runInContext("this.TeamOS = TeamOS; this.TEAM_CONFIG = TEAM_CONFIG;", c);
  return c;
}
var nd = load("teams/notre-dame.js"), M = nd.TeamOS.milestones;
var team = nd.TeamOS.createTeam(nd.TEAM_CONFIG.team);
var FIX = "tools/fixtures/espn-schedule-nd-oct08.json";
function games() { return nd.TeamOS.espn.schedule(JSON.parse(read(FIX)), team, nd.TEAM_CONFIG); }
var AT = new Date("2026-10-08T16:00:00Z");
function byOpp(list, re) { return list.filter(function (g) { return re.test(g.oppName); })[0]; }
function result(g, us, them) { g.status = "final"; g.state = "post"; g.us = String(us); g.them = String(them); g.won = us > them; return g; }

console.log("1. the real schedule, through Oct. 3");
var real = M.wins(nd.TEAM_CONFIG, games(), 2026, AT);
eq(real && [real.wins, real.losses, real.ties], [998, 342, 42], "the official record now: the game notes' own 998-342-42");
eq(real && [real.phase, real.target, real.toGo], ["countdown", 1000, 2], "two from 1,000");
eq(real && real.game && real.game.oppName, "Stanford", "and the next game is Stanford");

console.log("2. the season turns");
var g1 = games(); result(byOpp(g1, /stanford/i), 35, 14);
var w999 = M.wins(nd.TEAM_CONFIG, g1, 2026, new Date("2026-10-11T12:00:00Z"));
eq(w999 && [w999.wins, w999.toGo, w999.game.oppName], [999, 1, "BYU"], "a win over Stanford: 999, one to go, BYU next");
var live = games(); result(byOpp(live, /stanford/i), 35, 14);
var byu = byOpp(live, /byu/i); byu.status = "live"; byu.state = "in"; byu.us = "24"; byu.them = "10"; byu.won = true;
var l = M.wins(nd.TEAM_CONFIG, live, 2026, new Date("2026-10-18T02:00:00Z"));
eq(l && [l.wins, l.toGo, l.game.status], [999, 1, "live"], "BYU under way and ahead: still 999, the game is on the line, never counted early");
var g2 = games(); result(byOpp(g2, /stanford/i), 35, 14); result(byOpp(g2, /byu/i), 31, 17);
var hit = M.wins(nd.TEAM_CONFIG, g2, 2026, new Date("2026-10-18T12:00:00Z"));
eq(hit && [hit.phase, hit.target, hit.wins, hit.game.oppName], ["reached", 1000, 1000, "BYU"], "a win at BYU: the 1,000th, and the game that made it");
var week = M.wins(nd.TEAM_CONFIG, g2, 2026, new Date("2026-10-23T12:00:00Z"));
eq(week && week.phase, "reached", "it holds the week after");
var g3 = games(); result(byOpp(g3, /stanford/i), 35, 14); result(byOpp(g3, /byu/i), 31, 17); result(byOpp(g3, /navy/i), 42, 10);
// (no game falls within BYU's week, so a later result is written in early)
var navy = M.wins(nd.TEAM_CONFIG, g3, 2026, new Date("2026-10-20T12:00:00Z"));
eq(navy && [navy.phase, navy.target, navy.wins], ["reached", 1000, 1001], "another win inside that week does not take the week away");
eq(M.wins(nd.TEAM_CONFIG, g2, 2026, new Date("2026-10-26T12:00:00Z")), null, "eight days on, nothing: 1,100 is far off");
var lost = games(); result(byOpp(lost, /stanford/i), 14, 21);
var ll = M.wins(nd.TEAM_CONFIG, lost, 2026, new Date("2026-10-11T12:00:00Z"));
eq(ll && [ll.wins, ll.losses, ll.toGo, ll.game.oppName], [998, 343, 2, "BYU"], "a loss: the count holds, still two to go");
var noflag = games(); var sf = byOpp(noflag, /stanford/i); result(sf, 31, 17); sf.won = false;
var nf = M.wins(nd.TEAM_CONFIG, noflag, 2026, new Date("2026-10-11T12:00:00Z"));
eq(nf && [nf.wins, nf.losses], [999, 342], "a 31-17 final whose winner flag is missing still counts as a win: read from the scores (Codex, #112)");
var bare = games(); var st = byOpp(bare, /stanford/i); st.status = "final"; st.us = null; st.them = null; st.won = false;
var bb = M.wins(nd.TEAM_CONFIG, bare, 2026, AT);
eq(bb && [bb.wins, bb.losses], [998, 342], "a final without a score is no result: neither a win nor a loss");
eq(M.wins(nd.TEAM_CONFIG, games(), 2027, AT), null, "another season: nothing, never a stale count");
eq(M.wins({ history: {} }, games(), 2026, AT), null, "a team with no record: nothing");
var osu = load("teams/ohio-state.js");
eq(osu.TeamOS.milestones.wins(osu.TEAM_CONFIG, games(), 2026, AT), null, "Ohio State declares no record: nothing");
ok(!/notre|irish|\b87\b/i.test(read("teamos/milestones.js").replace(/\/\*[\s\S]*?\*\//g, "")), "milestones.js names no team");

console.log("2b. what the card says of the game that could make it");
(function () {
  // Home's own milestoneHtml, with TeamOS.game, and ui reduced to what it uses.
  var h = vm.createContext({});
  vm.runInContext(read("teamos/game.js") + "\n;this.TeamOS = TeamOS;", h, { filename: "teamos/game.js" });
  vm.runInContext("var ui = { esc: function (s) { return String(s == null ? '' : s); }," +
    " oppLabel: function (g) { return (g.oppRank ? '#' + g.oppRank + ' ' : '') + g.oppName; }," +
    " kickoff: function () { return { day: 'Sat, Oct 17' }; } }, esc = ui.esc;", h);
  var src = read("suite/home.js");
  vm.runInContext(src.slice(src.indexOf("  var WORDS"), src.indexOf("  // ---- mount")) + "\n;this.mh = milestoneHtml;", h);
  function say(status, started) {
    var g = { home: false, oppName: "BYU", oppRank: 8, date: "2026-10-17T23:30Z", status: status, hasStarted: started };
    return h.mh({ phase: "countdown", target: 1000, toGo: 1, wins: 999, losses: 342, ties: 42, source: "x", game: g }, { name: "T" })
      .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  }
  ok(/on the line: at #8 BYU, Sat, Oct 17/.test(say("scheduled", false)), "before kickoff: on the line, with the date");
  ok(/on the line: at #8 BYU, Sat, Oct 17/.test(say("delayed", false)), "a weather delay before kickoff is still upcoming, not 'now' (Codex, #112)");
  ok(/on the line now, at #8 BYU/.test(say("live", true)), "under way: on the line now");
  ok(/on the line now/.test(say("delayed", true)), "and a delay after kickoff is still now");
})();

console.log("3. Home");
(async function () {
  var chromium = require("playwright").chromium;
  var serve = require("./lib/serve"), server = serve(root);
  await new Promise(function (r) { server.listen(0, "127.0.0.1", r); });
  var base = "http://127.0.0.1:" + server.address().port;
  var browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined });
  async function home(slug, schedule) {
    var ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
    var page = await ctx.newPage();
    await page.clock.setSystemTime(AT);
    await page.route("**/*", function (route) {
      var u = route.request().url();
      if (u.startsWith(base)) return route.continue();
      if (/\/schedule\?seasontype=2/.test(u) || /\/schedule$/.test(u)) return route.fulfill({ status: 200, contentType: "application/json", body: read(schedule) });
      return route.abort();
    });
    await page.goto(base + "/?team=" + slug + "#home");
    await page.waitForFunction(function () { return !document.getElementById("launch"); }, null, { timeout: 9000 }).catch(function () {});
    await page.waitForTimeout(800);
    if (process.env.SHOTS) await page.screenshot({ path: path.join(process.env.SHOTS, "home-" + slug + ".png"), fullPage: true });
    var r = await page.evaluate(function () {
      var s = document.querySelector('#screenHome [data-home="milestone"]');
      var order = [].map.call(document.querySelectorAll("#screenHome [data-home]"), function (e) { return e.getAttribute("data-home"); });
      return { shown: !!s && !s.hidden, text: s ? s.innerText.replace(/\s+/g, " ").trim() : "", order: order };
    });
    await ctx.close();
    return r;
  }
  var h = await home("notre-dame", FIX);
  ok(h.shown, "Notre Dame: the card shows (" + h.text + ")");
  ok(/Road to 1,000/.test(h.text) && /\b998\b/.test(h.text) && /Two from 1,000/.test(h.text), "it reads Road to 1,000, 998 all-time wins, two from 1,000");
  ok(/Next: vs (#\d+ )?Stanford/.test(h.text), "and names the next game");
  ok(/All-time record 998-342-42/.test(h.text) && /official count, Notre Dame game notes/i.test(h.text), "with the official record and where it comes from");
  ok(h.order.indexOf("milestone") === h.order.indexOf("hero") + 1, "right under the hero");
  var o = await home("ohio-state", "tools/fixtures/espn-schedule-osu-2026.json");
  ok(!o.shown, "Ohio State: no card");
  await browser.close(); server.close();
  console.log("\n" + (failures ? failures + " check(s) FAILED" : "the road to 1,000 is the official count, and only that"));
  process.exit(failures ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
