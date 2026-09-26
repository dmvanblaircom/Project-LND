#!/usr/bin/env node
/* Suite's rendering rules, checked on its real markup.

   TeamOS decides; Suite draws. tools/gamecheck.js and tools/rulescheck.js
   check the decisions - pure TeamOS, no Suite. This checks the drawing: the
   rules Product set for how a screen shows what TeamOS decided. It loads
   suite/*.js into a context with a stub document, paints into a stub host
   and reads the markup back - no browser, no network.

   Usage:  node tools/suitecheck.js      (exit 1 on any failure) */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");

var root = path.join(__dirname, "..");
function read(p) { return fs.readFileSync(path.join(root, p), "utf8"); }

var failures = 0;
function ok(cond, what) {
  if (cond) { console.log("  ok   " + what); return; }
  failures++; console.log("  FAIL " + what);
}
function eq(a, b, what) { ok(JSON.stringify(a) === JSON.stringify(b), what + " = " + JSON.stringify(b) + (JSON.stringify(a) === JSON.stringify(b) ? "" : " (got " + JSON.stringify(a) + ")")); }

var ctx = vm.createContext({ console: console, Intl: Intl, Date: Date });
["teams/notre-dame.js", "teamos/team.js", "teamos/espn.js", "teamos/game.js"].forEach(function (f) {
  vm.runInContext(read(f), ctx, { filename: f });
});
var TeamOS = ctx.TeamOS, G = TeamOS.game, CFG = ctx.TEAM_CONFIG;
var TEAM = TeamOS.createTeam(CFG.team);

console.log("postponed dates on Home (decision 0022 #5)");
var hctx = vm.createContext({ Date: Date, document: { addEventListener: function () {} } });
["suite/ui.js", "suite/home.js"].forEach(function (f) { vm.runInContext(read(f), hctx, { filename: f }); });
var H = hctx.Suite.home;
eq(H.newDate({ status: "postponed", newDate: null }), "New date to be announced", "no replacement date: to be announced");
ok(/^New date: .+ \u00B7 .*\d:\d\d/.test(H.newDate({ newDate: { date: "2026-10-10T19:30:00Z", timeSet: true } })),
   "date and time known: both");
ok(/^New date: .+ \u00B7 Time TBD$/.test(H.newDate({ newDate: { date: "2026-10-10T16:00:00Z", timeSet: false } })),
   "date known, time not: the date, then Time TBD");
eq(H.newDate({ newDate: { date: "not a date" } }), "New date to be announced", "an unreadable date is not shown");


// ---- Box Score: collapse a category, never truncate it ----------------------
// Game review 2026-09-24: every category is its own disclosure, expanded it
// shows every player, and the fan's own choice outlives the live refresh.
console.log("Box Score");
var sctx = vm.createContext({ console: console, Intl: Intl, Date: Date, TeamOS: TeamOS, document: { addEventListener: function () {} } });
["suite/ui.js", "suite/home.js", "suite/game.js"].forEach(function (f) { vm.runInContext(read(f), sctx, { filename: f }); });
function host() {
  var parts = {};
  return { innerHTML: "", parts: parts,
           querySelector: function (q) { var k = (/data-game="(\w+)"/.exec(q) || [])[1]; if (!k) return q === "[data-game]" && this.innerHTML ? {} : null;
                                          return parts[k] || (parts[k] = { innerHTML: "" }); } };
}
var wis = JSON.parse(read("tools/fixtures/espn-summary-wis-final.json"));
var WD = TeamOS.espn.gameDetail(wis, TEAM, CFG);
var WG = TeamOS.espn.schedule(JSON.parse(read("tools/fixtures/espn-schedule.json")), TEAM, CFG)
  .filter(function (x) { return x.id === "401858438"; })[0];
function boxHtml(open, side) {
  var h = host();
  sctx.Suite.game.paint(h, { team: { name: TEAM.name, abbr: TEAM.abbreviation, markUrl: "" }, oppMark: function () { return ""; },
    game: WG, detail: WD, lifecycle: G.lifecycle(WG), view: "box", preview: null, side: side || "us", open: open || {},
    weather: null, now: new Date("2026-09-07T14:00:00Z") });
  return h.parts.body.innerHTML;
}
var html = boxHtml(), usKey = WD.home.mine ? "home" : "away";
var cats = html.match(/<details class="bx-cat"[^>]*>/g) || [];
eq(cats.length, WD.box[usKey].length, "every category is its own disclosure");
var fullRows = WD.box[usKey].reduce(function (n, t) { return n + t.rows.length; }, 0);
eq((html.match(/<table class="bx"[\s\S]*?<\/table>/g) || []).join("").split('<th scope="row">').length - 1, fullRows, "every player row is in the page, open or closed - nothing truncated");
function isOpen(key) { return new RegExp('data-key="box-us-' + key + '" open>').test(html); }
ok(isOpen("passing") && isOpen("rushing") && isOpen("receiving"), "Passing, Rushing and Receiving start expanded");
ok(!isOpen("defensive"), "the long Defense table starts collapsed");
ok(!isOpen("kicking") && !isOpen("punting"), "Kicking and Punting start collapsed");
ok(!/<caption/.test(html) && (html.match(/<summary>/g) || []).length === cats.length,
   "the category name is the summary - it stays visible collapsed");
ok(/<span class="bx-count">\d+ players?<\/span>/.test(html), "a collapsed category says how many players it holds");
var flipped = boxHtml({ "box-us-defensive": true, "box-us-passing": false });
ok(/data-key="box-us-defensive" open>/.test(flipped) && !/data-key="box-us-passing" open>/.test(flipped),
   "the fan's own open/closed choice wins over the default");
var them = boxHtml({}, "them");
ok(/data-key="box-them-passing" open>/.test(them), "the team toggle keeps its own keys");

// ---- More (reference 10; 0022 #9 #12, 0024 §18, 0026) ----------------------
console.log("More");
var mctx = vm.createContext({ console: console, Intl: Intl, Date: Date, document: { addEventListener: function () {}, activeElement: null } });
["teams/notre-dame.js", "teamos/team.js", "teamos/snapshots.js", "teamos/identity.js", "teamos/sources.js",
 "suite/ui.js", "suite/more.js"].forEach(function (f) { vm.runInContext(read(f), mctx, { filename: f }); });
var MT = mctx.TeamOS, MS = mctx.Suite, ND = mctx.TEAM_CONFIG;
function mhost() { return { innerHTML: "", querySelector: function () { return null; }, querySelectorAll: function () { return []; }, contains: function () { return false; } }; }

// Suite Style is held to exactly what a team is held to.
var suiteLook = null;
try { suiteLook = MT.identity.create({ identity: MS.ui.STYLE }, MT.createTeam(ND.team)); } catch (e) { console.log("    " + e.message); }
ok(!!suiteLook, "Suite Style passes TeamOS.identity's contrast checks (dark and light surfaces)");
ok(MS.ui.STYLE.colors.accentText !== MS.ui.STYLE.colors.accent, "Suite Style's warm accent is text-only; actions are the cobalt fill");

var m = mhost(); MS.more.menu(m);
eq((m.innerHTML.match(/class="mo-title">([^<]+)/g) || []).map(function (x) { return x.replace(/.*>/, ""); }),
   ["News", "Schedule", "Settings", "Feedback", "About Suite"], "More lists its five destinations in the reference's order");

var st = mhost();
MS.more.settings(st, { team: { name: "Notre Dame", mark: "" }, changeHref: "/?change", style: "team", updatedAt: null, refreshing: false, online: true });
ok(/<legend class="st-k">App Style<\/legend>/.test(st.innerHTML), "Appearance holds one choice, App Style");
eq((st.innerHTML.match(/name="appStyle" value="(\w+)"/g) || []).map(function (x) { return x.replace(/.*value="/, "").replace('"', ""); }),
   ["team", "suite"], "Team Style, then Suite Style");
ok(/value="team" checked/.test(st.innerHTML) && /Team Style <span class="st-rec">· Recommended/.test(st.innerHTML), "Team Style is the default, marked Recommended");
ok(!/(typography|font|colou?r|accent|dark mode|light mode|notification)/i.test(st.innerHTML.replace(/Your team’s colors and type lead\./, "")),
   "no other appearance or notification controls");
var off = mhost();
MS.more.settings(off, { team: { name: "Notre Dame", mark: "" }, changeHref: "/?change", style: "suite", updatedAt: Date.now() - 60000, refreshing: false, online: false });
ok(/Offline · /.test(off.innerHTML), "offline, Last Updated still says when");

var fbh = mhost(); MS.more.feedback(fbh, { href: "mailto:suiteappfeedback@gmail.com?subject=x", address: "suiteappfeedback@gmail.com" });
ok(!/(thank|sent|submitted)/i.test(fbh.innerHTML), "Feedback shows no sent state: the mail app sends (0022 #12)");

eq(MT.sources.list(ND).map(function (x) { return x.name; }),
   ["ESPN", "FightingIrish.com", "One Foot Down", "Slap the Sign", "UHND", "NDNation", "Blue & Gold", "Notre Dame On SI", "Kalshi", "Open-Meteo"],
   "Notre Dame is credited every source its config declares");
eq(MT.sources.list(ND)[1].supplies, ["depth", "availability"], "the official site: depth chart and availability, once");
var osuCtx = vm.createContext({});
["teams/ohio-state.js"].forEach(function (f) { vm.runInContext(read(f), osuCtx, { filename: f }); });
eq(MT.sources.list(osuCtx.TEAM_CONFIG).map(function (x) { return x.name; }), ["ESPN", "Kalshi", "Open-Meteo"],
   "Ohio State, with no official snapshots or beat feeds, is credited none");
var abh = mhost(); MS.more.about(abh, { version: "2026-09-24v", sources: MT.sources.list(ND) });
ok(!/project\s*lnd/i.test(abh.innerHTML + m.innerHTML + st.innerHTML + fbh.innerHTML), "no screen says Project LND (0022 #9)");
ok(/not affiliated with, endorsed by or sponsored by/.test(abh.innerHTML) && /used only to\s+identify/.test(abh.innerHTML.replace(/" \+ "/g, "")),
   "About Suite says Suite is independent, and whose marks are whose");
ok(/not betting advice/.test(abh.innerHTML), "with Kalshi markets shown, prices are not betting advice");
var abx = mhost(); MS.more.about(abx, { sources: [{ name: "ESPN", supplies: ["scores"] }] });
ok(!/betting/.test(abx.innerHTML), "a team with no markets gets no betting line");
ok(/rel="noopener noreferrer"/.test(abh.innerHTML) && /opens in a new tab/.test(abh.innerHTML), "source links open safely, and say so");

// A final without both scores (a forfeit, or a gap in the feed) is not a
// tie, and nothing a screen reader hears says "undefined".
console.log("Schedule rows");
vm.runInContext(read("suite/schedule.js"), sctx, { filename: "suite/schedule.js" });
var SR = sctx.Suite.schedule;
var noScore = Object.assign({}, WG, { us: null, them: null });
[true, false].forEach(function (full) {
  var r = SR.row(noScore, { heroId: null, full: full, oppMark: function () { return null; } });
  ok(/>Final</.test(r) && !/class="wl"/.test(r), (full ? "full" : "preview") + " row: a scoreless final says Final, with no W, L or T");
  ok(!/undefined|null|NaN/.test(r), (full ? "full" : "preview") + " row: nothing reads undefined");
});
var scored = SR.row(Object.assign({}, WG, { us: "0", them: "13" }), { heroId: null, full: true, oppMark: function () { return null; } });
ok(/Lost 0 to 13\./.test(scored) && />L<\/span> 0–13/.test(scored), "a shutout keeps its zero: L 0–13, 'Lost 0 to 13.'");

// ---- Drive Tracker: whose drive, in whose colour (David, 2026-09-26) ----
console.log("Drive Tracker colour follows the ball");
var msu = TeamOS.espn.gameDetail(JSON.parse(read("tools/fixtures/espn-summary-msu-final.json")), TEAM, CFG);
var msuSide = msu.home.mine ? msu.away : msu.home;
eq(msuSide.colors, { primary: "#173F35", alt: "#FFFFFF" }, "the adapter keeps the opponent's published colours (real MSU payload)");
// A real drive with field positions, from the Wisconsin final, played as the
// current one; the opponent's colours are set on the raw payload as ESPN
// publishes them (team.color / team.alternateColor).
function driveHtml(mine, oppColors) {
  var raw = JSON.parse(JSON.stringify(wis));
  var cs = raw.header.competitions[0].competitors;
  cs.forEach(function (c) { if (String(c.team.id || c.id) !== CFG.sources.espn.teamId && oppColors) { c.team.color = oppColors[0]; c.team.alternateColor = oppColors[1]; } });
  var gd = TeamOS.espn.gameDetail(raw, TEAM, CFG);
  var d = (gd.drives && gd.drives.list || []).filter(function (x) {
    return (x.plays || []).filter(function (p) { return p.offense && p.start && p.start.fromOwn != null; }).length > 2; })[0];
  if (!d) return null;
  gd.drives.current = Object.assign({}, d, { mine: mine });
  var g = Object.assign({}, WG, { state: "in", status: "live", oppName: "Illinois", oppAbbr: "ILL" });
  var h = host();
  sctx.Suite.game.paint(h, { team: { name: TEAM.name, abbr: TEAM.abbreviation, markUrl: "" }, oppMark: function () { return ""; },
    game: g, detail: gd, lifecycle: G.lifecycle(g), view: "drive", preview: null, side: "us", open: {},
    weather: null, now: new Date("2026-09-26T18:00:00Z") });
  return h.parts.body.innerHTML;
}
var ours = driveHtml(true, ["13294B", "E84A27"]);
ok(ours && /Notre Dame drive/.test(ours) && !/--drive:/.test(ours), "our drive: titled ours, in our accent (no override)");
var theirs = driveHtml(false, ["13294B", "E84A27"]);
ok(/Illinois drive/.test(theirs), "their drive is titled theirs");
ok(/--drive:#E84A27/.test(theirs), "and drawn in their colour that shows on the turf - Illinois orange, not the navy");
ok(/--drive:#FFFFFF/.test(driveHtml(false, null)), "no published colours: neutral white, never our colour");
ok(/--drive:#FFFFFF/.test(driveHtml(false, ["0B3D11", "123F18"])), "colours that vanish on the turf: neutral white");

// ---- the possession football in the Game header (David, 2026-09-26) ----
console.log("Game header: the football is with the team that has the ball (real live ND at Purdue)");
var purRaw = JSON.parse(read("tools/fixtures/espn-summary-pur-live.json"));
var PD = TeamOS.espn.gameDetail(purRaw, TEAM, CFG);
var ndSide = PD.home.mine ? PD.home : PD.away, purSide = PD.home.mine ? PD.away : PD.home;
ok(ndSide.possession === true && purSide.possession === false, "the live summary says Notre Dame has the ball");
function headHtml(game) {
  var h = host();
  sctx.Suite.game.paint(h, { team: { name: TEAM.name, abbr: TEAM.abbreviation, markUrl: "" }, oppMark: function () { return ""; },
    game: game, detail: PD, lifecycle: G.lifecycle(game), view: "drive", preview: null, side: "us", open: {},
    weather: null, now: new Date("2026-09-26T18:32:00Z") });
  return h.parts.head.innerHTML;
}
var liveG = Object.assign({}, WG, { id: "401858467", state: "in", status: "live", period: 1, clock: "4:37", us: "0", them: "0",
                                    oppName: "Purdue", oppAbbr: "PUR", situation: null });
var hd = headHtml(liveG);
ok(/gh-team us[\s\S]*gh-ball[\s\S]*gh-team them/.test(hd) && (hd.match(/gh-ball/g) || []).length === 1,
   "one football, on Notre Dame's side, from the summary");
ok(/has the ball/.test(hd), "and said: 'has the ball'");
var hd2 = headHtml(Object.assign({}, liveG, { situation: { possession: "them" } }));
ok(/gh-team them[\s\S]*gh-ball/.test(hd2) && !/gh-team us">[^]*?gh-ball[^]*?gh-team them/.test(hd2),
   "the league's live state wins when it has one: Purdue's side");
ok(!/gh-ball/.test(headHtml(Object.assign({}, liveG, { state: "post", status: "final" })) ), "no football once it is over");

console.log("\n" + (failures ? failures + " check(s) FAILED" : "Suite draws what TeamOS decided, the way Product set"));
process.exit(failures ? 1 : 0);
