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
   ["News", "Schedule", "Stats", "Settings", "Feedback", "Share Suite", "About Suite"], "More lists its six destinations and Share Suite, in order (Stats: W27)");
ok(/<button type="button" class="mo-row" data-share>/.test(m.innerHTML) && /role="status" data-share-note/.test(m.innerHTML),
   "Share Suite is a button (an action, not a destination), with a status line for what it did");

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
   ["ESPN", "FightingIrish.com", "One Foot Down", "Slap the Sign", "UHND", "NDNation", "Blue & Gold", "Notre Dame On SI", "Kalshi", "CollegeFootballData", "Open-Meteo"],
   "Notre Dame is credited every source its config declares");
eq(MT.sources.list(ND)[1].supplies, ["depth", "availability"], "the official site: depth chart and availability, once");
var osuCtx = vm.createContext({});
["teams/ohio-state.js"].forEach(function (f) { vm.runInContext(read(f), osuCtx, { filename: f }); });
eq(MT.sources.list(osuCtx.TEAM_CONFIG).map(function (x) { return x.name; }), ["ESPN", "Ohio State Athletics", "Land-Grant Holy Land", "Ohio State On SI", "On3", "The Lantern", "Kalshi", "CollegeFootballData", "Open-Meteo"],
   "Ohio State is credited its beat feeds, and no official snapshot it does not have");
eq(MT.sources.list(osuCtx.TEAM_CONFIG).filter(function (x) { return x.supplies.indexOf("depth") >= 0 || x.supplies.indexOf("availability") >= 0; }), [],
   "nothing is credited for an Ohio State depth chart or availability report");
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

// ---- The CFP calendar (David, 2026-10-02): the next show, Selection Day ----
console.log("The CFP calendar: Top 25's notice and the schedule's foot");
vm.runInContext(read("leagues/college-football.js") + "\n" + read("teamos/season.js"), sctx, { filename: "calendar" });
vm.runInContext(read("suite/top25.js"), sctx, { filename: "suite/top25.js" });
var calAt = function (iso) { return sctx.TeamOS.season.calendar(sctx.LEAGUE_CALENDAR, 2026, new Date(iso)); };
var n1 = sctx.Suite.top25.calendarNote(calAt("2026-10-02T16:00:00Z"), false);
// in the fan's own device time, with its zone - the same words a kickoff uses
var kick = function (iso) { return sctx.Suite.ui.kickoff(iso).full; };
ok(n1.indexOf("First CFP rankings:</strong> " + kick("2026-11-03T19:00:00-05:00") + " on ESPN") >= 0, "before the first show: its day, time with zone, and network");
ok(n1.indexOf("Selection Day:</strong> " + kick("2026-12-06T12:00:00-05:00") + " on ESPN. The 12-team playoff field, then every bowl matchup that afternoon.") >= 0,
   "and Selection Day: the playoff field, then the bowls");
ok((n1.match(/CFP rankings/g) || []).length === 1, "one rankings show at a time, never the season's list");
var n2 = sctx.Suite.top25.calendarNote(calAt("2026-11-04T01:00:00Z"), true);
ok(n2.indexOf("Next CFP rankings:</strong> " + kick("2026-11-10T21:00:00-05:00")) >= 0, "after the first show: the next one, Tue Nov 10");
ok(/CFP rankings:<\/strong> on now on ESPN/.test(sctx.Suite.top25.calendarNote(calAt("2026-11-04T00:30:00Z"), false)), "during a show: on now");
ok(/being revealed now on ESPN/.test(sctx.Suite.top25.calendarNote(calAt("2026-12-06T18:00:00Z"), true)), "during Selection Day's show: revealed now");
eq(sctx.Suite.top25.calendarNote(calAt("2026-12-07T12:00:00Z"), true), "", "after Selection Day, with the CFP published: no notice");
ok(/once the committee releases them/.test(sctx.Suite.top25.calendarNote({ rankings: null, selection: null }, false)),
   "a season with no published calendar keeps the old notice, with no date promised");
var foot = SR.postseason({ day: "2026-12-06" });
ok(/Postseason/.test(foot) && /announced on Selection Day, Sun, Dec 6\./.test(foot), "the schedule's foot: when this team's bowl or playoff game is announced");
eq(SR.postseason(null), "", "and nothing once that day is over or the game is listed");
ok(!/notre|irish|ohio|buckeye/i.test(read("suite/top25.js") + read("suite/schedule.js")), "neither view names a team");

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

// ---- Plays: scoring drives (David, 2026-10-01, with a fan's feedback) ----
console.log("Plays: each score opens the drive that made it (real final, Notre Dame v Wisconsin)");
function playsHtml(detail, open) {
  var h = host();
  sctx.Suite.game.paint(h, { team: { name: TEAM.name, abbr: TEAM.abbreviation, markUrl: "" }, oppMark: function () { return ""; },
    game: WG, detail: detail, lifecycle: G.lifecycle(WG), view: "plays", preview: null, side: "us", open: open || {},
    weather: null, now: new Date("2026-09-07T14:00:00Z") });
  return h.parts.body.innerHTML;
}
var ph = playsHtml(WD);
ok(/Scoring drives/.test(ph) && !/Scoring plays/.test(ph), "the card is Scoring drives");
var scoreBlocks = ph.match(/<details data-key="score-[^"]+"[\s\S]*?<\/details>/g) || [];
eq(scoreBlocks.length, WD.scoring.length, "every score opens");
ok(scoreBlocks.every(function (b, i) {
  var p = WD.scoring[i], d = WD.drives.list.filter(function (x) { return x.id === p.driveId; })[0] || { plays: [] };
  var at = d.plays.map(function (q) { return q.id; }).indexOf(p.id);
  var rows = (b.match(/class="pl-text"/g) || []).length, i = b.lastIndexOf('<li class="is-score">');
  return rows === at + 1 && i > -1 && (b.match(/is-score/g) || []).length === 1 &&
         (b.slice(i).match(/class="pl-text"/g) || []).length === 1;
}), "opened, it shows the drive's plays up to the score, and the score - marked - is the last of them");
var trailing = WD.scoring.filter(function (p) {
  var d = WD.drives.list.filter(function (x) { return x.id === p.driveId; })[0];
  return d && d.plays[d.plays.length - 1].id !== p.id;
});
ok(trailing.length > 0 && trailing.every(function (p) {
  var b = scoreBlocks[WD.scoring.indexOf(p)] || "", d = WD.drives.list.filter(function (x) { return x.id === p.driveId; })[0];
  return (b.match(/class="pl-text"/g) || []).length < d.plays.length;
}),
   "a timeout ESPN logged after a score (" + trailing.length + " in this game) is left out of the scoring drive");
eq((ph.match(/data-key="drive-/g) || []).length, WD.drives.list.length, "and every drive is still listed under Drives, whole");
ok(/<details data-key="score-[^"]+" open>/.test(playsHtml(WD, (function (o) { o["score-" + WD.scoring[0].id] = true; return o; })({}))),
   "a score the fan opened stays open through a refresh");
var noDrive = JSON.parse(JSON.stringify(WD)); noDrive.scoring[0].driveId = null;
var nd = playsHtml(noDrive);
eq((nd.match(/data-key="score-/g) || []).length, WD.scoring.length - 1, "a score whose drive the feed did not send is a plain row, not a dead control");

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

// ---- the weather and the line sit under the game, not in a corner (David, 2026-10-01) ----
console.log("Game header: the weather and the line are one row under the game");
function headWith(game, weather) {
  var h = host();
  sctx.Suite.game.paint(h, { team: { name: TEAM.name, abbr: TEAM.abbreviation, markUrl: "" }, oppMark: function () { return ""; },
    game: game, detail: null, lifecycle: G.lifecycle(game), view: "preview", preview: null, side: "us", open: {},
    weather: weather, now: new Date("2026-09-05T14:00:00Z") });
  return h.parts.head.innerHTML;
}
var preG = Object.assign({}, WG, { state: "pre", status: "scheduled", us: null, them: null, odds: { line: "ND -22.5", total: 46.5 } });
var ph = headWith(preG, { tempF: 74, sky: "overcast", windMph: 10 });
ok(ph.indexOf('class="gh-extra"') > ph.lastIndexOf("gh-countdown") && ph.lastIndexOf("gh-countdown") > ph.indexOf("gh-row"),
   "after the teams and the countdown, not before them");
ok(/gh-wx[\s\S]*74°F[\s\S]*gh-odds[\s\S]*ND -22\.5[\s\S]*O\/U 46\.5/.test(ph), "weather first, then the line, each its own half");
ok(!/gh-extra/.test(headWith(Object.assign({}, preG, { odds: null }), null)), "and no empty row when there is neither");

// ---- halftime and the final header (live scan #6, #7, #9) ----
console.log("Game header at halftime and at the final");
var halfHead = headHtml(Object.assign({}, liveG, { period: 2, clock: "0:00", detail: "Halftime",
  situation: { short: "2nd & 10", spot: "PUR 28", possession: null } }));
ok(/class="gh-clock">Halftime</.test(halfHead) && !/0:00/.test(halfHead), "halftime says Halftime, not 2ND · 0:00 - as Home says HALF");
ok(!/gc-situation/.test(halfHead), "and no down & distance: no one has the ball");
ok(/Halftime\. Notre Dame/.test(halfHead), "and a screen reader hears Halftime");
var recvHead = headHtml(Object.assign({}, liveG, { period: 2, clock: "0:00", detail: "Halftime",
  situation: { short: "2nd & 10", spot: "PUR 28", possession: null, receives: "us" } }));
ok(/class="gc-situation"><span>ND gets the ball<\/span>/.test(recvHead), "at halftime the pill says who gets the ball to start the second half");
ok(/gh-team us[\s\S]*gh-ball[\s\S]*gh-team them/.test(recvHead) && (recvHead.match(/gh-ball/g) || []).length === 1, "and the football is on that side");
ok(/Notre Dame gets the ball to start the second half\./.test(recvHead), "and a screen reader hears it");
var liveHead = headHtml(Object.assign({}, liveG, { situation: { short: "2nd & 10", spot: "PUR 28", possession: "us" } }));
ok(/gc-situation"><span>2nd &amp; 10<\/span><span>PUR 28<\/span>/.test(liveHead), "a running game keeps its down & distance");
var finalHead = headHtml(Object.assign({}, liveG, { state: "post", status: "final", usRecord: "4-0", oppRecord: "1-3" }));
ok(/class="gh-final-label">Final</.test(finalHead) && !/class="gh-final"/.test(finalHead),
   "the FINAL label has its own class, so its wide tracking stays on the label (records read 4-0, not 4 - 0)");

// ---- a final the source reports without a score (B7) ----
console.log("A final with no score: Final, never an invented 0-0");
function homeHero(game) {
  var parts = {};
  var h = { innerHTML: "", querySelectorAll: function () { return []; },
            querySelector: function (q) { var k = (/data-home="(\w+)"/.exec(q) || [])[1];
              if (!k) return q === "[data-home]" && this.innerHTML ? {} : null;
              return parts[k] || (parts[k] = { innerHTML: "", hidden: false }); } };
  sctx.Suite.home.paint(h, { team: { name: TEAM.name, abbr: TEAM.abbreviation, markUrl: "" }, oppMark: function () { return ""; },
    hero: { game: game, reason: "recent-final" }, heroId: game.id, art: {}, fresh: null, news: null, schedule: null, outlook: null });
  return parts.hero.innerHTML;
}
var noScoreFinal = Object.assign({}, liveG, { state: "post", status: "final", us: null, them: null });
console.log("Final winner emphasis follows the score, including a team loss");
[[41,13,"us"],[13,41,"them"],[0,13,"them"],[24,24,null],[null,13,null]].forEach(function(x){
  var g=Object.assign({},noScoreFinal,{us:x[0],them:x[1]});
  [["Home",homeHero(g),"gc-side"],["Game",headHtml(g),"gh-team"]].forEach(function(c){
    var winners=c[1].match(new RegExp(c[2]+' (us|them) is-winner','g'))||[];
    ok(x[2] ? winners.length===1 && winners[0]===c[2]+" "+x[2]+" is-winner" : winners.length===0,
       c[0]+": "+x[0]+" to "+x[1]+" highlights "+(x[2]||"neither side"));
  });
});
ok(!/is-winner|is-loser/.test(homeHero(liveG)+headHtml(liveG)),"live scores get no final winner treatment");
[["Home", homeHero(noScoreFinal), "gc-score"], ["Game", headHtml(noScoreFinal), "gh-score"]].forEach(function (c) {
  ok(!new RegExp(c[2]).test(c[1]), c[0] + ": no score is drawn for either team");
  ok(/Final\. Notre Dame (at|versus) [^.]*Purdue\./.test(c[1]) && !/Notre Dame 0,/.test(c[1]),
     c[0] + ": a screen reader hears Final and the matchup, not 0 to 0");
});
var zeroZero = Object.assign({}, noScoreFinal, { us: "0", them: "0" });
[["Home", homeHero(zeroZero), "gc-score"], ["Game", headHtml(zeroZero), "gh-score"]].forEach(function (c) {
  ok((c[1].match(new RegExp('class="' + c[2] + '">0', "g")) || []).length === 2 && /Notre Dame 0, [^.]*Purdue 0/.test(c[1]),
     c[0] + ": a real 0-0 is still a score, drawn and read");
});
ok((homeHero(Object.assign({}, liveG, { us: null, them: null })).match(/class="gc-score">0/g) || []).length === 2,
   "a live game before anyone scores still reads 0-0, as before");

// ---- a finished drive, and the last play's time (live scan #2, #3) ----
console.log("Drive Tracker between possessions, and the last play (real ND at Purdue, after Purdue's turnover on downs)");
var DD = TeamOS.espn.gameDetail(JSON.parse(read("tools/fixtures/espn-summary-pur-downs.json")), TEAM, CFG);
var hb = host();
sctx.Suite.game.paint(hb, { team: { name: TEAM.name, abbr: TEAM.abbreviation, markUrl: "" }, oppMark: function () { return ""; },
  game: Object.assign({}, liveG, { period: 3, clock: "9:48" }), detail: DD, lifecycle: G.lifecycle(liveG), view: "drive",
  preview: null, side: "us", open: {}, weather: null, now: new Date("2026-09-26T20:06:00Z") });
var bd = hb.parts.body.innerHTML;
ok(/Purdue drive[\s\S]*class="f-result">Turnover on downs<\/span> · 10 plays, 27 yards, 4:24/.test(bd),
   "the finished drive says how it ended, before its summary");
ok(/aria-label="Last drive: Purdue, [^"]*Result: Turnover on downs\."/.test(bd), "and says so to a screen reader");
ok(/class="lp-text"><span class="lp-at">9:56<\/span> R\.\u00a0Browne pass incomplete short right <span class="pl-tag turnover">Turnover on downs<\/span>/.test(bd),
   "the last play leads with its time, then the play in a fan's words, and how it ended");

// ---- Stats: the team's season (W27; David, 2026-10-01) ----
console.log("Stats: the team's season, and in game week the opponent's beside it");
var stx = vm.createContext({ console: console, Intl: Intl, Date: Date, document: { addEventListener: function () {} } });
["teams/notre-dame.js", "teamos/team.js", "teamos/snapshots.js", "teamos/identity.js", "teamos/live.js", "teamos/season.js", "teamos/espn.js",
 "suite/ui.js", "suite/stats.js"].forEach(function (f) { vm.runInContext(read(f), stx, { filename: f }); });
function sfx(f) { return JSON.parse(read("tools/fixtures/" + f)); }
var usSeason = stx.TeamOS.espn.teamSeason(sfx("espn-teamstats-nd-2026-reg.json"), sfx("espn-sitestats-nd.json"));
var themSeason = stx.TeamOS.espn.teamSeason(sfx("espn-teamstats-osu-2026-reg.json"), null);
function statsHtml(m) {
  var h = { innerHTML: "" };
  stx.Suite.stats.paint(h, Object.assign({ team: { name: "Notre Dame", abbr: "ND" }, opp: null, season: "2026", postseason: false,
                                           us: null, them: null, failed: false, offline: false }, m));
  return h.innerHTML;
}
var one = statsHtml({ us: usSeason });
eq((one.match(/class="ss-row"/g) || []).length, 30, "every figure TeamOS returned is a row");
ok(/2026 regular season · 4 games/.test(one), "it says which season and how many games");
ok(/Points per game<\/span><span class="ss-v us"><span class="ss-n">42\.3<\/span><span class="ss-rk"><span class="sr-only">, <\/span>17th<\/span>/.test(one), "the figure and its national rank");
ok(!/ss-cols/.test(one), "no opponent column outside game week");
var two = statsHtml({ us: usSeason, them: themSeason, opp: { name: "Ohio State", abbr: "OSU" } });
eq((two.match(/class="ss-row two"/g) || []).length, 30, "in game week every row has the opponent's figure beside it");
ok(/This week: ND and Ohio State, side by side\./.test(two) && (two.match(/<span>ND<\/span><span>OSU<\/span>/g) || []).length === 4,
   "said once at the top, and each group labels both columns");
ok(/Points allowed per game<\/span><span class="ss-v us"><span class="sr-only">ND <\/span><span class="ss-n">8\.3<\/span><\/span><span class="ss-v them"><span class="sr-only">OSU <\/span><span class="ss-n">–<\/span><span class="sr-only"> not available<\/span><\/span>/.test(two),
   "a figure the opponent has no source for is a dash, never a 0, and says it is not available");
ok(/<span class="ss-v us"><span class="sr-only">ND <\/span><span class="ss-n">42\.3<\/span><span class="ss-rk"><span class="sr-only">, <\/span>17th<\/span><\/span><span class="ss-v them"><span class="sr-only">OSU <\/span>/.test(two),
   "in game week each value is said with its team, for a screen reader: the column labels are only for the eye (Codex review, #82)");
ok(!/sr-only">ND /.test(one), "outside game week there is one column and nothing to tell apart");
ok(/postseason included/.test(statsHtml({ us: usSeason, postseason: true })), "a season with its postseason says so");
ok(/Loading season stats/.test(statsHtml({})), "loading says so");
ok(/didn't load\. Pull down to try again/.test(statsHtml({ failed: true })), "a failure says how to try again");
ok(/You're offline\. Season stats load when the connection returns/.test(statsHtml({ failed: true, offline: true })), "offline says so");
ok(!/notre|irish|ohio|buckeye/i.test(read("suite/stats.js").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "")), "the view names no team in its code");
ok(/<nav class="game-tabs view-tabs" aria-label="Stats views"><a href="#stats" aria-current="page">Team<\/a><a href="#stats\/players">Players<\/a><\/nav>/.test(one),
   "Team | Players, Team current");

console.log("Stats: Players, the season leaders in Box Score's table (W27 Phase 2)");
var ldr = stx.TeamOS.espn.seasonLeaders(sfx("espn-leaders-nd-2026-reg.json"));
var nm = {}; stx.TeamOS.espn.roster(sfx("espn-roster-nd-oct02.json")).forEach(function (g) { g.players.forEach(function (p) { if (p.id) nm[p.id] = p.name; }); });
["espn-summary-wis-final.json", "espn-summary-msu-final.json", "espn-summary-pur-final.json"].forEach(function (f) {
  var b = stx.TeamOS.espn.boxNames(sfx(f)); for (var k in b) if (!nm[k]) nm[k] = b[k]; });
var pl = statsHtml({ view: "players", players: stx.TeamOS.espn.namedLeaders(ldr, nm) });
ok(/aria-label="Stats views"><a href="#stats">Team<\/a><a href="#stats\/players" aria-current="page">Players<\/a>/.test(pl), "Players current in the strip");
eq((pl.match(/<table class="bx"/g) || []).length, 4, "four tables: Passing, Rushing, Receiving, Defense");
ok(/aria-label="Notre Dame Passing"><thead><tr><th scope="col">Player<\/th><th scope="col">C\/ATT<\/th><th scope="col">YDS<\/th><th scope="col">TD<\/th><th scope="col">INT<\/th><th scope="col">RTG<\/th><\/tr><\/thead><tbody><tr><th scope="row">CJ Carr<\/th><td>67\/95<\/td><td>963<\/td><td>9<\/td><td>1<\/td><td>130\.3<\/td>/.test(pl),
   "a table names the team, the player heads his row, the figures are the provider's");
ok(/<th scope="row">Aneyas Williams<\/th><td>52<\/td><td>224<\/td><td>4<\/td>/.test(pl), "a back ESPN's roster leaves out is named from the box scores");
ok(/<td><span aria-hidden="true">–<\/span><span class="sr-only">none<\/span><\/td>/.test(pl), "a figure the player does not have is a dash, said as none");
ok(!/\b\d{7}\b/.test(pl), "no athlete id reaches the page");
ok(/up to 25 deep\. Source: ESPN\.<\/p>/.test(pl) && !/aren.t shown|isn.t shown/.test(pl), "the source, and no unnamed note when every row is named");
ok(/3 players aren’t shown: ESPN hasn’t named them yet\./.test(statsHtml({ view: "players", players: { tables: [{ key: "x", label: "Passing", labels: ["YDS"], rows: [{ name: "A", stats: ["1"] }] }], unnamed: 3 } })),
   "rows ESPN never named are counted, never shown as ids");
ok(/Loading player stats/.test(statsHtml({ view: "players" })), "loading says so");
ok(/Player stats didn't load\. Pull down to try again/.test(statsHtml({ view: "players", playersFailed: true })), "a failure says how to try again");
ok(/You're offline\. Player stats load when the connection returns/.test(statsHtml({ view: "players", playersFailed: true, offline: true })), "offline says so");

console.log("\n" + (failures ? failures + " check(s) FAILED" : "Suite draws what TeamOS decided, the way Product set"));
process.exit(failures ? 1 : 0);
