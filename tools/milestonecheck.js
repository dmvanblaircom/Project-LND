#!/usr/bin/env node
/* The road to a round number of all-time wins (David, 2026-10-07: "Build the
   1,000th win countdown before BYU").

     1. TeamOS.milestones over the real Notre Dame schedule (captured
        2026-10-08): the record entering the season (the team's config) plus
        the season's finals is 998-343-42 (the Oct. 5 notes' record line
        said 342; their splits add to 343) - two from 1,000, next Stanford;
        and the real 6-1 season gives the Navy notes' own 999-344-42.
     2. Each turn of the season, from that real schedule with the next
        results written in: a win (999, on the line at BYU), the 1,000th
        (reached, held a week, then gone), a loss (the count holds), a game
        in progress or a final without a score (not counted), another
        season's record (nothing, never a stale count).
     2c. Ohio State, from its own real schedule and its notes' official
        990-337-53 entering 2026: the same countdown, from config alone.
     3. Home in a real browser: the card under the hero says so, and a team
        without a milestone has no card.

   Usage: node tools/milestonecheck.js     (exit 1 on failure) */
"use strict";
// A hundredth win is held through a Sunday on the fan's own calendar: these
// checks read it as a fan in Eastern time would.
process.env.TZ = "America/New_York";
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
eq(real && [real.wins, real.losses, real.ties], [998, 343, 42], "the record through Oct. 3: 998-343-42 (the Oct. 5 notes' line said 342; its splits add to 343)");
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
eq(M.wins(nd.TEAM_CONFIG, g2, 2026, new Date("2026-10-25T23:00:00Z")) && M.wins(nd.TEAM_CONFIG, g2, 2026, new Date("2026-10-25T23:00:00Z")).phase, "reached",
   "and through the Sunday after next weekend's games (David, 2026-10-25)");
eq(M.wins(nd.TEAM_CONFIG, g2, 2026, new Date("2026-10-26T12:00:00Z")), null, "the Monday after: nothing, 1,100 is far off");
// Navy, Saturday Oct. 31 at noon: never down before Miami's kickoff a week on
var gn = games(); result(byOpp(gn, /stanford/i), 35, 14); result(byOpp(gn, /byu/i), 20, 27); result(byOpp(gn, /navy/i), 34, 17);
function phaseAt(iso) { var r = M.wins(nd.TEAM_CONFIG, gn, 2026, new Date(iso)); return r && r.phase + " " + r.target + " " + r.game.oppName; }
eq([phaseAt("2026-11-07T23:00:00Z"), phaseAt("2026-11-08T00:30:00Z"), phaseAt("2026-11-09T04:59:00Z"), phaseAt("2026-11-09T05:01:00Z")],
   ["reached 1000 Navy", "reached 1000 Navy", "reached 1000 Navy", null],
   "a 1,000th win over Navy holds through Miami's kickoff and Sunday, Nov. 8, to midnight; gone that Monday");
var lost = games(); result(byOpp(lost, /stanford/i), 14, 21);
var ll = M.wins(nd.TEAM_CONFIG, lost, 2026, new Date("2026-10-11T12:00:00Z"));
eq(ll && [ll.wins, ll.losses, ll.toGo, ll.game.oppName], [998, 344, 2, "BYU"], "a loss: the count holds, still two to go");
var noflag = games(); var sf = byOpp(noflag, /stanford/i); result(sf, 31, 17); sf.won = false;
var nf = M.wins(nd.TEAM_CONFIG, noflag, 2026, new Date("2026-10-11T12:00:00Z"));
eq(nf && [nf.wins, nf.losses], [999, 343], "a 31-17 final whose winner flag is missing still counts as a win: read from the scores (Codex, #112)");
var bare = games(); var st = byOpp(bare, /stanford/i); st.status = "final"; st.us = null; st.them = null; st.won = false;
var bb = M.wins(nd.TEAM_CONFIG, bare, 2026, AT);
eq(bb && [bb.wins, bb.losses], [998, 343], "a final without a score is no result: neither a win nor a loss");
// What happened: Stanford won 58-7, BYU lost 28-24 - and the Navy notes (Oct. 26) print 999-344-42
var gr = games(); result(byOpp(gr, /stanford/i), 58, 7); result(byOpp(gr, /byu/i), 24, 28);
var nw = M.wins(nd.TEAM_CONFIG, gr, 2026, new Date("2026-10-26T12:00:00Z"));
eq(nw && [nw.wins, nw.losses, nw.ties, nw.toGo, nw.game.oppName], [999, 344, 42, 1, "Navy"], "the real season, 6-1: 999-344-42, as the Navy notes print it - and Navy is No. 1,000");
eq(M.wins(nd.TEAM_CONFIG, games(), 2027, AT), null, "another season: nothing, never a stale count");
eq(M.wins({ history: {} }, games(), 2026, AT), null, "a team with no record: nothing");

console.log("2c. Ohio State (David, 2026-10-26: the Road to 1,000 for Ohio State too)");
var osu = load("teams/ohio-state.js"), OM = osu.TeamOS.milestones;
var osuTeam = osu.TeamOS.createTeam(osu.TEAM_CONFIG.team);
function osuGames() { return osu.TeamOS.espn.schedule(JSON.parse(read("tools/fixtures/espn-schedule-osu-2026.json")), osuTeam, osu.TEAM_CONFIG); }
// the real schedule, captured with Ball State, Texas, Kent State and Illinois final
var o1 = OM.wins(osu.TEAM_CONFIG, osuGames(), 2026, new Date("2026-09-30T12:00:00Z"));
// (the same, with the target brought within reach, to read the count itself)
var o1all = (function () { var c = JSON.parse(JSON.stringify(osu.TEAM_CONFIG)); if (!c.history || !c.history.record) return null;
  c.history.record.wins += 7; return OM.wins(c, osuGames(), 2026, new Date("2026-09-30T12:00:00Z")); })();
eq(o1, null, "through Illinois (W, L to Texas, W, W): 993, seven from 1,000 - nothing yet");
eq(o1all && [o1all.wins - 7, o1all.losses, o1all.ties], [993, 338, 53], "and the count is 993-338-53, as the notes' own arithmetic gives (995-338-53 after Iowa and Maryland)");
var og = osuGames();
[/iowa/i, /maryland/i, /indiana/i, /usc|southern cal/i].forEach(function (re, i) { result(byOpp(og, re), 30 + i, 10); });
var o2 = OM.wins(osu.TEAM_CONFIG, og, 2026, new Date("2026-11-02T12:00:00Z"));
eq(o2 && [o2.phase, o2.target, o2.wins, o2.toGo, o2.game && o2.game.oppName], ["countdown", 1000, 997, 3, "Oregon"],
   "wins over Iowa, Maryland, Indiana and USC: 997, three from 1,000, Oregon next");
eq(o2 && o2.source, "Ohio State\u2019s game notes", "the program's own count, and whose it is");
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
  vm.runInContext(src.slice(src.indexOf("  var WORDS"), src.indexOf("  // ---- mount")) + "\n;this.mh = milestoneHtml; this.al = alertLine;", h);
  function say(status, started) {
    var g = { home: false, oppName: "BYU", oppRank: 8, date: "2026-10-17T23:30Z", status: status, hasStarted: started };
    return h.mh({ phase: "countdown", target: 1000, toGo: 1, wins: 999, losses: 342, ties: 42, source: "x", game: g }, { name: "T" })
      .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  }
  ok(/on the line: at #8 BYU, Sat, Oct 17/.test(say("scheduled", false)), "before kickoff: on the line, with the date");
  ok(/on the line: at #8 BYU, Sat, Oct 17/.test(say("delayed", false)), "a weather delay before kickoff is still upcoming, not 'now' (Codex, #112)");
  ok(/on the line now, at #8 BYU/.test(say("live", true)), "under way: on the line now");
  ok(/on the line now/.test(say("delayed", true)), "and a delay after kickoff is still now");
  // the final alert's line, for this device's service worker
  var T = { name: "Notre Dame" }, G = { id: "401859185" };
  eq([h.al({ phase: "countdown", target: 1000, toGo: 1, game: G }, T), h.al({ phase: "reached", target: 1000, toGo: 0, game: G }, T),
      h.al({ phase: "countdown", target: 1000, toGo: 2, game: G }, T), h.al({ phase: "countdown", target: 1000, toGo: 1, game: null }, T), h.al(null, T)],
     ["Notre Dame\u2019s 1,000th win.", "Notre Dame\u2019s 1,000th win.", null, null, null],
     "the final alert's line: for the game that can make it, and still once it has (the app can see the final first); none otherwise");
})();

console.log("3. Home");
(async function () {
  var chromium = require("playwright").chromium;
  var serve = require("./lib/serve"), server = serve(root);
  await new Promise(function (r) { server.listen(0, "127.0.0.1", r); });
  var base = "http://127.0.0.1:" + server.address().port;
  var browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined });
  async function home(slug, schedule, opts) {
    opts = opts || {};
    var ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: "America/New_York", serviceWorkers: opts.sw ? "allow" : "block" });
    var page = await ctx.newPage();
    await page.clock.setSystemTime(opts.at || AT);
    await ctx.route("**/*", function (route) {
      var u = route.request().url();
      if (u.startsWith(base)) return route.continue();
      if (/\/schedule\?seasontype=2/.test(u) || /\/schedule$/.test(u)) return route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: opts.body || read(schedule) });
      return route.abort();
    });
    await page.goto(base + "/?team=" + slug + "#home");
    await page.waitForFunction(function () { return !document.getElementById("launch"); }, null, { timeout: 9000 }).catch(function () {});
    await page.waitForTimeout(800);
    if (process.env.SHOTS) await page.screenshot({ path: path.join(process.env.SHOTS, "home-" + slug + ".png"), fullPage: true });
    var r = await page.evaluate(function () {
      var s = document.querySelector('#screenHome [data-home="milestone"]');
      var order = [].map.call(document.querySelectorAll("#screenHome [data-home]"), function (e) { return e.getAttribute("data-home"); });
      var made = document.querySelector("#screenHome .gamecard .gc-milestone");
      return { shown: !!s && !s.hidden, text: s ? s.innerText.replace(/\s+/g, " ").trim() : "", order: order,
               hero: (document.querySelector("#screenHome .gamecard") || {}).innerText || "", made: made ? made.textContent : null };
    });
    if (opts.sw) {
      // what the page told this device's service worker, for the final alert
      r.told = await page.waitForFunction(function () {
        return caches.open("suite-milestone").then(function (c) { return c.match("./__milestone"); }).then(function (x) { return x ? x.text() : null; });
      }, null, { timeout: 15000 }).then(function (j) { return j.jsonValue(); }, function () { return null; });
    }
    await ctx.close();
    return r;
  }
  var h = await home("notre-dame", FIX);
  ok(h.shown, "Notre Dame: the card shows (" + h.text + ")");
  ok(/Road to 1,000/.test(h.text) && /\b998\b/.test(h.text) && /Two from 1,000/.test(h.text), "it reads Road to 1,000, 998 all-time wins, two from 1,000");
  ok(/Next: vs (#\d+ )?Stanford/.test(h.text), "and names the next game");
  ok(/All-time record 998-343-42/.test(h.text) && /· per Notre Dame’s game notes/.test(h.text), "with the record and whose count it is (David, 2026-10-26: never \"official\")");
  ok(h.order.indexOf("milestone") === h.order.indexOf("hero") + 1, "right under the hero");
  // Navy week, from the real Oct. 8 schedule with the results since written
  // in: a win over Stanford, a loss at BYU - 999 - then Navy.
  function navyWeek(navy) {
    var d = JSON.parse(read(FIX));
    d.events.forEach(function (e) {
      var c = e.competitions[0], s = { "401858257": [35, 14], "401856809": [20, 27], "401859185": navy }[e.id];
      if (!s) return;
      c.status = { clock: 0, displayClock: "0:00", period: 4, type: { id: "3", name: "STATUS_FINAL", state: "post", completed: true, description: "Final", detail: "Final", shortDetail: "Final" } };
      c.competitors.forEach(function (x) { var us = x.team.id === "87", v = us ? s[0] : s[1]; x.score = { value: v, displayValue: String(v) }; x.winner = us ? s[0] > s[1] : s[1] > s[0]; });
    });
    return JSON.stringify(d);
  }
  var wk = await home("notre-dame", FIX, { body: navyWeek(null), at: new Date("2026-10-30T16:00:00Z"), sw: true });
  ok(/Win No\. 1,000 is on the line: vs Navy/.test(wk.text), "Navy week: win No. 1,000 is on the line against Navy (" + wk.text + ")");
  eq(wk.told && JSON.parse(wk.told), { game: "401859185", line: "Notre Dame\u2019s 1,000th win." },
     "and the page has told this device's service worker the game and the line for its final alert");
  var won = await home("notre-dame", FIX, { body: navyWeek([34, 17]), at: new Date("2026-10-31T20:00:00Z") });
  ok(/Final/i.test(won.hero) && won.made === "Notre Dame\u2019s 1,000th win", "a win: the scoreboard's final says it (" + won.made + ")");
  ok(/^1,000 Wins/.test(won.text), "and the card says 1,000 Wins");
  var lost = await home("notre-dame", FIX, { body: navyWeek([17, 20]), at: new Date("2026-10-31T20:00:00Z") });
  ok(/Final/i.test(lost.hero) && lost.made === null && /on the line: vs (#\d+ )?Miami/.test(lost.text), "a loss: the final as ever, and Miami is next");
  var o = await home("ohio-state", "tools/fixtures/espn-schedule-osu-2026.json");
  ok(!o.shown, "Ohio State seven from 1,000: no card yet");
  // Ohio State after USC, results written into its real schedule
  var osuBody = (function () {
    var d = JSON.parse(read("tools/fixtures/espn-schedule-osu-2026.json"));
    d.events.forEach(function (e) {
      if (["401858473", "401858483", "401858488", "401858509"].indexOf(e.id) < 0) return;
      var c = e.competitions[0];
      c.status = { clock: 0, displayClock: "0:00", period: 4, type: { id: "3", name: "STATUS_FINAL", state: "post", completed: true, description: "Final", detail: "Final", shortDetail: "Final" } };
      c.competitors.forEach(function (x) { var us = x.team.id === "194", v = us ? 31 : 17; x.score = { value: v, displayValue: String(v) }; x.winner = us; });
    });
    return JSON.stringify(d);
  })();
  var o3 = await home("ohio-state", "tools/fixtures/espn-schedule-osu-2026.json", { body: osuBody, at: new Date("2026-11-02T16:00:00Z") });
  ok(o3.shown && /Road to 1,000/.test(o3.text) && /\b997\b/.test(o3.text) && /Three from 1,000/.test(o3.text) && /Next: vs (#\d+ )?Oregon/.test(o3.text) &&
     /All-time record 997-338-53/.test(o3.text) && /· per Ohio State’s game notes/.test(o3.text),
     "Ohio State after USC: the card shows - 997, three from 1,000, Oregon next, the record and whose count (" + o3.text + ")");
  await browser.close(); server.close();
  console.log("\n" + (failures ? failures + " check(s) FAILED" : "the road to 1,000 is the program's own count, said as its own"));
  process.exit(failures ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
