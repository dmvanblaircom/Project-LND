#!/usr/bin/env node
/* Check the TeamOS ESPN adapter against a fixture.

   Loads the same four files the page loads - the team config, the Team
   model, snapshot ownership, the ESPN adapter - into a bare Node scope with
   no window, no document and no fetch, so the adapter cannot quietly depend
   on any of them. Then runs the fixtures in tools/fixtures/ through it and
   checks what comes out: Games (shape, the team's point of view, neutral
   sites, broadcasts and the fallback, series), roster groups and Players,
   the team's rank and record - and that nothing ESPN-shaped leaks through.
   A second context loads the Ohio State config and checks that the two
   teams get different answers from TeamOS.snapshots down the same code.

   Usage:  node tools/adaptercheck.js
   Exit status is 1 if anything fails, so it can gate a push. */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");

var root = path.join(__dirname, "..");
function read(p) { return fs.readFileSync(path.join(root, p), "utf8"); }

// A context with nothing but the two globals the scripts define.
function load(teamFile) {
  var c = vm.createContext({});
  [teamFile, "teamos/team.js", "teamos/snapshots.js", "teamos/identity.js", "teamos/live.js", "teamos/season.js", "teamos/espn.js"].forEach(function (f) {
    vm.runInContext(read(f), c, { filename: f });
  });
  return c;
}
var ctx = load("teams/notre-dame.js");
var TEAM_CONFIG = ctx.TEAM_CONFIG, TeamOS = ctx.TeamOS;
var fixture = JSON.parse(read("tools/fixtures/espn-schedule.json"));

var failures = 0;
function ok(cond, what) {
  if (cond) { console.log("  ok   " + what); return; }
  failures++; console.log("  FAIL " + what);
}
function eq(a, b, what) { ok(JSON.stringify(a) === JSON.stringify(b), what + " = " + JSON.stringify(b)); }

// ---- source hygiene ----
var src = read("teamos/espn.js");
console.log("teamos/espn.js");
ok(!/\bfetch\s*\(/.test(src),                          "does not call fetch()");
ok(!/\b(document|window|navigator|localStorage|caches)\b/.test(src), "does not touch the DOM or browser storage");
ok(!/\bTEAM_ID\b|\bS\.\w|\bTEAM\b(?!_CONFIG)/.test(src), "does not read application globals (TEAM, TEAM_ID, S)");
ok(typeof ctx.window === "undefined" && typeof ctx.fetch === "undefined", "ran with no window and no fetch");

// ---- URL ----
console.log("scheduleUrl");
eq(TeamOS.espn.scheduleUrl(TEAM_CONFIG),
   "https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams/87/schedule",
   "matches the URL the page has always fetched (SW cache key)");

// ---- schedule ----
var team = TeamOS.createTeam(TEAM_CONFIG.team);
var games = TeamOS.espn.schedule(fixture, team, TEAM_CONFIG);
var byId = {}; games.forEach(function (g) { byId[g.id] = g; });
var SHAPE = ["id","date","timeSet","home","neutral","oppName","oppRank",
             "oppProviderId","oppAbbr","usRank","usRecord","oppRecord","venue","city","venueState","zip",
             "net","odds","series","state","detail","status","hasStarted","period","clock","newDate","us","them","won"];
var LEAK = /competitions|competitors|curatedRank|pickcenter|neutralSite|geoBroadcasts|timeValid|shortDetail|displayValue|zipCode|homeAway|espn/i;

console.log("schedule()");
eq(games.length, 4, "one Game per event");
ok(games.every(function (g) { return g.oppProviderId === null || /^[0-9]+$/.test(g.oppProviderId); }),
   "the opponent's provider id is digits or null - it only ever feeds TeamOS.espn.mark");
ok(games.some(function (g) { return g.oppProviderId; }), "and the fixture's opponents have one");
ok(games.every(function (g) { return g.usRecord === null || /^\d+-\d+/.test(g.usRecord); }), "a record is 'W-L' or absent, never invented");
eq(games.map(function (g) { return g.id; }), ["401858438","401858453","401858460","401858471"], "sorted oldest first");
games.forEach(function (g) {
  eq(Object.keys(g), SHAPE, g.id + " has exactly the documented Game fields");
  ok(!LEAK.test(JSON.stringify(g)), g.id + " carries no ESPN keys or names");
  ok(!("state" in g) || ["pre","in","post"].indexOf(g.state) > -1, g.id + " state is a game status (" + g.state + ")");
});

var msu = byId["401858453"], wis = byId["401858438"], navy = byId["401858471"], pur = byId["401858460"];

console.log("home game, future (Michigan St)");
eq([msu.home, msu.neutral, msu.state, msu.timeSet], [true, false, "pre", true], "home, not neutral, pre, time set");
eq([msu.oppName, msu.oppRank], ["Michigan St", null], "opponent by short name; unranked -> null");
eq([msu.venue, msu.city, msu.venueState, msu.zip], ["Notre Dame Stadium","Notre Dame","IN","46556"], "venue fields; venueState is the U.S. state");
eq(msu.net, "NBC", "broadcast from competition.broadcasts");
eq(msu.series, "Megaphone Trophy", "series from config");
// won is `winner===true` whenever our side is present, so a future game reads false, not null - as it always has
eq([msu.us, msu.them, msu.won, msu.odds], [null, null, false, null], "no score, not won, no odds before kickoff");

console.log("final at a neutral pro venue, listed home (Wisconsin at Lambeau)");
eq([wis.home, wis.neutral, wis.state, wis.detail], [true, true, "post", "Final"], "listed home but neutral; post; detail");
eq([wis.us, wis.them, wis.won], ["41","13", true], "score from our side and theirs; won");
eq(wis.series, "Shamrock Series", "series from config");
eq(wis.venueState, "WI", "venueState");

console.log("away at a neutral venue (Navy at Gillette)");
eq([navy.home, navy.neutral, navy.oppName, navy.series], [false, true, "Navy", "Rip Miller Trophy"], "away, neutral, series");
eq(navy.net, "CBS", "broadcast found in geoBroadcasts only");

console.log("away, placeholder kickoff, no broadcast (Purdue)");
eq([pur.home, pur.neutral, pur.timeSet], [false, false, false], "away, real home field, time not set");
eq(pur.net, "Peacock", "broadcast fallback from config.sources.espn.broadcastFallback");
eq(pur.series, "Shillelagh Trophy", "series from config");

// ---- gameOdds ----
console.log("gameOdds()");
eq(TeamOS.espn.gameOdds({ pickcenter: [{ details: "ND -29.5", overUnder: 52.5 }] }), { line: "ND -29.5", total: 52.5, provider: null }, "line and total from pickcenter; no provider named, none assumed");
eq(TeamOS.espn.gameOdds({ pickcenter: [{ overUnder: 50 }] }), { line: null, total: 50, provider: null }, "missing line -> null, total kept");
eq(TeamOS.espn.gameOdds({ pickcenter: [{ details: "ND -7", overUnder: 51, provider: { name: "Any Book" } }] }).provider, "Any Book",
   "the provider the feed names is kept as provenance, whoever it is (decision 0025)");
eq(TeamOS.espn.gameOdds({ pickcenter: [{ provider: { name: "Any Book" } }] }), null, "a provider with no numbers is not odds");
eq(TeamOS.espn.gameOdds({}), null, "no pickcenter -> null");
eq(TeamOS.espn.gameOdds(null), null, "no summary -> null");

// ---- roster ----
var rosterFixture = JSON.parse(read("tools/fixtures/espn-roster.json"));
var PLAYER = ["name","jersey","position","positionName","height","weight","classYear","hometown","photo"];
var PLEAK = /displayName|fullName|displayHeight|displayWeight|experience|birthPlace|abbreviation|athletes|espn/i;

console.log("rosterUrl / teamUrl");
eq(TeamOS.espn.rosterUrl(TEAM_CONFIG),
   "https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams/87/roster",
   "roster URL unchanged (SW cache key)");
eq(TeamOS.espn.teamUrl(TEAM_CONFIG),
   "https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams/87",
   "team URL unchanged (SW cache key)");

console.log("roster()");
var groups = TeamOS.espn.roster(rosterFixture);
eq(groups.map(function (g) { return g.key + ":" + g.label + ":" + g.players.length; }),
   ["offense:Offense:2", "defense:Defense:1", "specialteam:Special:2"],
   "groups keyed on ESPN's unit key, labelled, empty units dropped");
groups.forEach(function (g) {
  eq(Object.keys(g), ["key","label","players"], g.key + " group has exactly key/label/players");
  g.players.forEach(function (p) {
    eq(Object.keys(p), PLAYER, p.name + " has exactly the documented Player fields");
    eq(Object.keys(p.hometown), ["city","state"], p.name + " hometown is {city, state}");
    ok(!PLEAK.test(JSON.stringify(p)), p.name + " carries no ESPN keys or names");
    ok(typeof p.jersey === "string", p.name + " jersey is a string (the sort parses it)");
  });
});
var absher = groups[0].players[0], scaife = groups[2].players[0], walkon = groups[2].players[1];
eq(absher, { name:"Sullivan Absher", jersey:"75", position:"OL", positionName:"Offensive Lineman",
             height:"6' 7\"", weight:"320 lbs", classYear:"SR", hometown:{ city:"Belmont", state:"NC" }, photo:null },
   "full player: abbreviation shown, full position name kept for search, class abbreviation");
eq([scaife.hometown.city, scaife.hometown.state], ["West Perth", ""], "missing state -> empty string, not undefined");
eq(walkon, { name:"Walk On", jersey:"", position:"Long Snapper", positionName:"Long Snapper",
             height:"", weight:"", classYear:"", hometown:{ city:"", state:"" }, photo:null },
   "sparse athlete: no jersey/height/weight/class/hometown -> empty strings; position falls back to name");
eq(TeamOS.espn.roster({ athletes: [absherRaw(), absherRaw()] }).map(function (g) { return g.key + ":" + g.label + ":" + g.players.length; }),
   ["all:Roster:2"], "a flat athletes array becomes one group called Roster");
eq(TeamOS.espn.roster({}).map(function (g) { return g.key + ":" + g.players.length; }), ["all:0"], "no athletes -> one empty group");
var realRoster = TeamOS.espn.roster(JSON.parse(read("tools/fixtures/espn-roster-nd-sep24.json")));
var carr = realRoster.reduce(function (a, g) { return a.concat(g.players); }, []).filter(function (p) { return p.name === "CJ Carr"; })[0];
ok(carr && /^https:\/\/a\.espncdn\.com\/i\/headshots\/college-football\/players\/full\/\d+\.png$/.test(carr.photo),
   "a real roster player carries the provider's headshot URL as photo");
// the key is lowercased before the camelCase split, so an unknown unit gets a plain capital - as it always has
eq(TeamOS.espn.roster({ athletes: [{ position: "someNewUnit", items: [absherRaw()] }] })[0].label, "Somenewunit", "unknown unit key is capitalised, not in the label map");
function absherRaw() { return rosterFixture.athletes[0].items[0]; }

// ---- team status ----
var teamFixture = JSON.parse(read("tools/fixtures/espn-team.json"));
console.log("teamStatus()");
eq(TeamOS.espn.teamStatus(teamFixture), { rank: 3, record: "2-0" }, "rank and overall record");
eq(TeamOS.espn.teamStatus({ team: { rank: 40, record: { items: [{ summary: "1-1" }] } } }), { rank: null, record: "1-1" }, "rank outside the top 25 -> null");
eq(TeamOS.espn.teamStatus({ team: { rank: 3 } }), { rank: 3, record: null }, "no record -> null");
eq(TeamOS.espn.teamStatus({}), { rank: null, record: null }, "empty payload");
eq(Object.keys(TeamOS.espn.teamStatus(teamFixture)), ["rank","record"], "exactly rank and record");

// ---- scoreboard ----
var sbFixture = JSON.parse(read("tools/fixtures/espn-scoreboard.json"));
var LG = ["id","date","timeSet","state","status","hasStarted","period","clock","detail","venue","net","odds","home","away","mine","live"];
var SIDE_LG = ["name","abbr","providerId","rank","record","score"];
var LGLEAK = /competitions|competitors|curatedRank|homeAway|shortDetail|situation|downDistanceText|geoBroadcasts|displayName|espn/i;

console.log("scoreboardUrl / rankingsUrl");
eq(TeamOS.espn.scoreboardUrl(),
   "https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?groups=80&limit=400",
   "scoreboard URL unchanged (SW cache key)");
eq(TeamOS.espn.rankingsUrl(),
   "https://site.api.espn.com/apis/site/v2/sports/football/college-football/rankings",
   "rankings URL unchanged (SW cache key)");

console.log("scoreboard()");
var lgs = TeamOS.espn.scoreboard(sbFixture, TEAM_CONFIG);
var lgById = {}; lgs.forEach(function (g) { lgById[g.id] = g; });
eq(lgs.length, 4, "one LeagueGame per event, including unranked ones");
eq(lgs.map(function (g) { return g.id; }), ["401858100","401858225","401858226","401858460"], "sorted oldest first");
lgs.forEach(function (g) {
  eq(Object.keys(g), LG, g.id + " has exactly the documented LeagueGame fields");
  eq(Object.keys(g.home), SIDE_LG, g.id + " home side has exactly the documented fields");
  eq(Object.keys(g.away), SIDE_LG, g.id + " away side has exactly the documented fields");
  // `net` is the broadcaster's own name and can legitimately be "ESPN"; test everything else
  ok(!LGLEAK.test(JSON.stringify(Object.assign({}, g, { net: "" }))), g.id + " carries no ESPN keys or names (outside the broadcaster's name)");
  ok(typeof g.id === "string", g.id + " id is a string (rows are keyed on it)");
});
var mia = lgById["401858226"], pitt = lgById["401858225"], uga = lgById["401858100"], pur = lgById["401858460"];
eq([mia.state, mia.timeSet, mia.detail, mia.venue], ["pre", true, "9/18 - 7:30 PM EDT", "Allegacy Federal Credit Union Stadium"], "future game: state, time, detail, venue");
eq([mia.away, mia.home], [{ name:"Miami", abbr:null, providerId:"2390", rank:5, record:null, score:"0" },
                         { name:"Wake Forest", abbr:null, providerId:"154", rank:null, record:null, score:"0" }],
   "sides: ranked away, unranked home, scores as strings; no abbreviation or record in the payload -> null");
eq([mia.net, mia.odds, mia.mine, mia.live], ["ESPN", { line:"MIA -20.5", total:56.5, provider:null }, false, null], "broadcast from names[], odds, not ours, not live");
eq([pitt.state, pitt.live], ["in", { downDistance:"1st & 10 at PITT 20", short:"1st & 10", spot:"", possession:null, lastPlay:"(03:28) #47 T.Woody kickoff 65 yards to the Pitt00 #24 T.Robinson return 20 yards to the Pitt20" }], "live game carries down/distance and last play");
eq([pitt.home.rank, pitt.away.rank], [null, null], "unranked on both sides (drives live-anywhere but not the ranked list)");
eq([uga.state, uga.home.score, uga.away.score, uga.home.rank, uga.away.rank], ["post", "31", "24", 2, 9], "final: scores and both ranks");
eq([pur.mine, pur.timeSet, pur.net, pur.away.rank], [true, false, "Peacock", 3], "the team's own game: mine, placeholder time, streaming-only broadcast");
eq(lgs.some(function (g) { return g.state === "in"; }), true, "live-anywhere is derivable from LeagueGame[]");
eq(lgs.filter(function (g) { return g.home.rank || g.away.rank; }).map(function (g) { return g.id; }),
   ["401858100","401858226","401858460"], "ranked games are the ones with a side rank");
eq(TeamOS.espn.scoreboard(null, TEAM_CONFIG), [], "no payload -> empty list");

console.log("scoreboard(), a real week");
var wk = TeamOS.espn.scoreboard(JSON.parse(read("tools/fixtures/espn-scoreboard-sep26.json")), TEAM_CONFIG);
var rankedWk = wk.filter(function (g) { return g.home.rank || g.away.rank; });
eq(rankedWk.length, 17, "17 games with a ranked side on the real Sep 26 slate");
var ours = wk.filter(function (g) { return g.mine; });
eq(ours.map(function (g) { return [g.away.name, g.away.abbr, g.away.providerId, g.away.rank, g.away.record, g.home.name, g.home.rank, g.net]; }),
   [["Notre Dame", "ND", "87", 3, "3-0", "Purdue", null, "Peacock"]], "the team's game: names, abbreviations, marks, rank, record, network");
eq(ours[0].odds, { line: "ND -27.5", total: 58.5, provider: "Draft Kings" }, "odds as values, the provider kept as data (0025)");
var wkId = {}; wk.forEach(function (g) { wkId[g.id] = g; });
eq([wkId["401858243"].net, wkId["401858466"].net, wkId["401856702"].net], ["ESPN, Disney+", "Peacock", "ABC"],
   "where to watch: no radio call signs, and ESPN's \"ESPN/Disney+\" summary does not repeat what is listed");
wk.forEach(function (g) { ok(!LGLEAK.test(JSON.stringify(Object.assign({}, g, { net: "", odds: null }))), "real " + g.id + " carries no ESPN keys"); });

// ---- rankings ----
var rkFixture = JSON.parse(read("tools/fixtures/espn-rankings.json"));
var POLL = ["key","label","name","asOf","updated","ranks"], RANK = ["rank","team","abbr","providerId","record","previous","isNew","change","mine"];
var POLLLEAK = /rankings|occurrence|recordSummary|shortName|headline|nickname|location|current|espn/i;

console.log("rankings()");
var polls = TeamOS.espn.rankings(rkFixture, TEAM_CONFIG);
eq(polls.map(function (p) { return p.key + ":" + p.label + ":" + p.ranks.length; }), ["AP:AP:5", "Coaches:Coaches:2"],
   "AP before Coaches; FCS, the duplicate AP and the empty CFP dropped");
polls.forEach(function (p) {
  eq(Object.keys(p), POLL, p.key + " has exactly the documented Poll fields");
  p.ranks.forEach(function (r) { eq(Object.keys(r), RANK, p.key + " #" + r.rank + " has exactly the documented rank fields"); });
  ok(!POLLLEAK.test(JSON.stringify(p)), p.key + " carries no ESPN keys or names");
});
var ap = polls[0];
eq([ap.name, ap.asOf], ["AP Top 25", "Week 3"], "poll name and as-of");
eq(ap.ranks[0], { rank:1, team:"Texas", abbr:null, providerId:"251", record:"2-0", previous:4, isNew:false, change:3, mine:false }, "moved up: previous kept, change +3");
eq(ap.ranks[2], { rank:3, team:"Notre Dame", abbr:null, providerId:"87", record:"2-0", previous:1, isNew:false, change:-2, mine:true }, "the team's own entry: mine; moved down: change -2");
eq([ap.ranks[3].previous, ap.ranks[3].isNew, ap.ranks[3].change], [null, true, null], "previous 0 -> new to the poll, no change to measure");
eq([ap.ranks[4].previous, ap.ranks[4].isNew, ap.ranks[4].team], [null, false, "Volunteers"], "no previous -> null and not new; team name falls back through nickname/name/location");
eq(polls.some(function (p) { return p.label === "CFP"; }), false, "no CFP poll yet (the tab shows its note)");
eq(TeamOS.espn.rankings({}, TEAM_CONFIG), [], "no payload -> empty list");

// The real polls, captured on the runner (capture-fixture.yml): what Top 25 draws.
console.log("rankings(), a real payload");
var real = TeamOS.espn.rankings(JSON.parse(read("tools/fixtures/espn-rankings-sep20.json")), TEAM_CONFIG);
eq(real.map(function (p) { return p.label + ":" + p.ranks.length; }), ["AP:25", "Coaches:25"],
   "AP and Coaches, all 25 each; the FCS and Division II/III polls dropped; no CFP before the committee publishes");
var rap = real[0];
eq([rap.name, rap.asOf, rap.updated], ["AP Top 25", "Week 4", "2026-09-20T21:19Z"], "name, week and when it was published");
eq(rap.ranks.map(function (r) { return r.rank; }), Array.from({ length: 25 }, function (_, i) { return i + 1; }), "ranks 1 to 25 in order");
eq(rap.ranks.filter(function (r) { return r.mine; }).map(function (r) { return [r.rank, r.team, r.abbr, r.providerId, r.change]; }),
   [[3, "Notre Dame", "ND", "87", 0]], "the team, once: #3, unchanged");
var fla = rap.ranks.filter(function (r) { return r.team === "Florida"; })[0];
eq([fla.previous, fla.isNew, fla.change], [null, true, null], "new this week: no change is invented from ESPN's own trend text");
eq(rap.ranks.filter(function (r) { return r.abbr === "MSST"; })[0].team, "Mississippi St", "the feed's short name, not the long one");
real.forEach(function (p) { ok(!POLLLEAK.test(JSON.stringify(p)), "real " + p.key + " carries no ESPN keys"); });

// ---- game center ----
var GD = ["state","detail","home","away","lastPlay","winProb","linescore","teamStats","leaders","box","scoring","drives"];
var SIDE = ["key","name","abbreviation","record","score","mine"];
// "drives" is the domain's own word now; ESPN's drive keys are what must not leak.
var GDLEAK = /competitions|competitors|homeAway|shortDetail|situation|yardsToEndzone|possessionText|statYardage|scoringPlay\b|displayResult|winprobability|homeWinPercentage|linescores|boxscore|scoringPlays|athlete|displayValue|shortDisplayName|pickcenter|espn/i;
var sumPre = JSON.parse(read("tools/fixtures/espn-summary-pre.json"));
var sumLive = JSON.parse(read("tools/fixtures/espn-summary-live.json"));
var sumPost = JSON.parse(read("tools/fixtures/espn-summary-post.json"));

console.log("summaryUrl / seasonStatsUrl");
eq(TeamOS.espn.summaryUrl("401858438"),
   "https://site.api.espn.com/apis/site/v2/sports/football/college-football/summary?event=401858438",
   "summary URL unchanged (SW cache key and the final-summaries Cache API key)");
eq(TeamOS.espn.seasonStatsUrl("87", 2026),
   "https://sports.core.api.espn.com/v2/sports/football/leagues/college-football/seasons/2026/types/2/teams/87/statistics",
   "season-stats URL unchanged");

console.log("gameDetail() - shape");
var gdPre = TeamOS.espn.gameDetail(sumPre, team, TEAM_CONFIG), gdLive = TeamOS.espn.gameDetail(sumLive, team, TEAM_CONFIG), gdPost = TeamOS.espn.gameDetail(sumPost, team, TEAM_CONFIG);
[["pre", gdPre], ["live", gdLive], ["post", gdPost]].forEach(function (pair) {
  var g = pair[1], n = pair[0];
  eq(Object.keys(g), GD, n + " has exactly the documented GameDetail sections");
  eq(Object.keys(g.home), SIDE, n + " home side is a Side");
  eq(Object.keys(g.away), SIDE, n + " away side is a Side");
  ok(!GDLEAK.test(JSON.stringify(g)), n + " carries no ESPN keys or names");
  ok(["pre","in","post"].indexOf(g.state) > -1, n + " state is a game status (" + g.state + ")");
});

console.log("gameDetail() - drives, from a real captured game (Wisconsin, final)");
var sumWis = JSON.parse(read("tools/fixtures/espn-summary-wis-final.json"));
var gdWis = TeamOS.espn.gameDetail(sumWis, team, TEAM_CONFIG);
ok(!GDLEAK.test(JSON.stringify(gdWis)), "a real summary carries no ESPN keys through");
ok(gdWis.drives && gdWis.drives.list.length === sumWis.drives.previous.length, "every drive, in order (" + (gdWis.drives && gdWis.drives.list.length) + ")");
eq(gdWis.drives.current, null, "a final game has no drive in progress");
var d4 = gdWis.drives.list[3];
eq([d4.mine, d4.side === "home" || d4.side === "away", d4.summary, d4.result], [true, true, "11 plays, 48 yards, 4:56", "Field Goal"],
   "a drive: whose, which side, the provider's summary, how it ended");
var p1 = d4.plays[1];
eq([p1.start.fromOwn, p1.end.fromOwn, p1.start.short, p1.start.spot, p1.yards, p1.offense],
   [18, 33, "1st & 10", "ND 18", 15, true], "a play: spots from the offense's own goal line, down and distance, yards");
ok(gdWis.drives.list.every(function (d) {
  return d.plays.every(function (p) { return !p.offense || !p.start || p.start.fromOwn == null || (p.start.fromOwn >= 0 && p.start.fromOwn <= 100); });
}), "every offensive spot is on the field (0-100 from the offense's goal)");
ok(gdWis.drives.list.some(function (d) { return d.plays.some(function (p) { return p.offense === false; }); }),
   "a play the other team ran inside a drive (the kickoff) is marked, so the field can leave it out");
eq(gdPre.drives, null, "no drives before kickoff");

console.log("gameDetail() - pregame");
eq([gdPre.state, gdPre.detail], ["pre", "Sat, September 19th at 7:30 PM EDT"], "scheduled, long status text");
eq(gdPre.home, { key:"87", name:"Notre Dame Fighting Irish", abbreviation:"ND", record:"", score:null, mine:true }, "home side: name falls back to displayName, no record or score yet, mine");
eq(gdPre.away.mine, false, "away side is not ours");
eq([gdPre.lastPlay, gdPre.winProb, gdPre.linescore, gdPre.box, gdPre.scoring], [null, null, null, null, null], "no play, win prob, linescore, box or scoring before kickoff");
eq(gdPre.teamStats, null, "pregame per-game stat names match no Team-stats row -> null");
eq(gdPre.leaders.home[0], { category:"Passing", name:"C. Carr", line:"35/49, 492 YDS, 6 TD" }, "season leaders still render pregame");
eq(gdPre.leaders.away.length, 5, "five leader categories per side");

console.log("gameDetail() - live");
eq([gdLive.state, gdLive.detail, gdLive.home.score, gdLive.away.score], ["in", "3:23 - 2nd", "13", "10"], "in progress, clock, scores");
eq(gdLive.lastPlay, { text:"Timeout Notre Dame, clock 08:53", possession:"ND", downDistance:"2nd & 7 at WIS 34" }, "last play from the live situation, with possession and down/distance");
eq(gdLive.winProb, { homePct:0.78 }, "win probability is the latest point");
eq(gdLive.linescore, { away:["3","7"], home:["10","3"] }, "two periods of linescores");
eq(gdLive.teamStats.map(function (r) { return r.label; }), ["Total yards","Passing","Rushing","First downs","3rd down","Turnovers","Penalties","Possession"], "the eight Team-stats rows in order");
eq(gdLive.teamStats[0], { label:"Total yards", away:"148", home:"211", better:"home", lowerWins:false }, "more yards is better");
eq(gdLive.teamStats[5], { label:"Turnovers", away:"0", home:"1", better:"away", lowerWins:true }, "fewer turnovers is better, and the row says so");
eq(gdLive.teamStats[4].better, "away", "3rd down compares the rate: 5-13 beats 3-9");
eq(gdLive.teamStats[6].better, "home", "penalties compare the count: 4 beats 6");
eq(gdLive.teamStats[7].better, "home", "possession compares seconds: 31:36 beats 28:24");
eq(gdLive.scoring.length, 4, "four scoring plays so far");
eq(gdLive.scoring[1], { period:1, clock:"1:31", teamAbbr:"ND", mine:true, text:"Spencer Porath 52 Yd Field Goal  ", awayScore:3, homeScore:3 }, "a scoring play, ours");
eq(gdLive.scoring[0].mine, false, "a scoring play, theirs");

console.log("gameDetail() - final");
eq([gdPost.state, gdPost.detail, gdPost.home.score, gdPost.away.score], ["post", "Final", "41", "13"], "final score");
eq(gdPost.lastPlay, { text:"End of 4th quarter.", possession:"", downDistance:"" }, "last play falls back to the last drive when there is no live situation");
eq(gdPost.winProb, { homePct:1 }, "final win probability point kept (the view only shows it live)");
eq(gdPost.linescore, { away:["3","7","3","0"], home:["10","3","14","14"] }, "four periods");
eq(gdPost.box.home.map(function (t) { return t.title + ":" + t.labels.length + ":" + t.rows.length; }), ["Notre Dame Passing:6:1","Notre Dame Rushing:5:3","Notre Dame Receiving:5:3"], "box tables per side: title, column labels, rows");
eq(gdPost.box.home[0].rows[0], { name:"CJ Carr", jersey:"13", stats:["19/29","239","8.2","2","0","70.2"] }, "a box row");
eq(gdPost.box.home.map(function (t) { return t.key + "=" + t.label; }), ["passing=Passing","rushing=Rushing","receiving=Receiving"],
   "each box table has a stable category key and a label without the team name");
var wisBox = TeamOS.espn.gameDetail(JSON.parse(read("tools/fixtures/espn-summary-wis-final.json")), team, TEAM_CONFIG).box;
ok(wisBox.home.concat(wisBox.away).some(function (t) { return t.key === "kickReturns" && t.label === "Kick Returns"; }) &&
   wisBox.home.concat(wisBox.away).some(function (t) { return t.key === "defensive" && t.label === "Defense"; }),
   "a real game's categories read as words: Kick Returns, Defense");
eq(gdPost.leaders.away[4], { category:"Tackles", name:"M. Posa", line:"15" }, "leader category names are mapped, not ESPN's");
eq(TeamOS.espn.gameDetail({}, team, TEAM_CONFIG).state, "post", "an empty payload is treated as final (no polling)");
eq(TeamOS.espn.gameDetail({}, team, TEAM_CONFIG).home, { key:"", name:"TBA", abbreviation:"", record:"", score:null, mine:false }, "an empty side");

console.log("seasonStats()");
var stats = JSON.parse(read("tools/fixtures/espn-season-stats.json"));
var nd = TeamOS.espn.seasonStats(stats.teams["87"]);
var op = TeamOS.espn.seasonStats(stats.teams["127"]);
eq(nd.map(function (r) { return r.key; }),
   ["pointsFor","pointsAllowed","totalOffense","rushOffense","passOffense",
    "yardsPerPlay","sacks","tacklesForLoss","turnoverMargin"],
   "the nine preview rows in order");
nd.forEach(function (r) { eq(Object.keys(r), ["key","label","value","rank","rankText"], r.key + " is a SeasonStat"); });
eq(nd[0], { key:"pointsFor", label:"Points per game", value:"40.0", rank:28, rankText:"Tied-28th" },
   "value, rank and ESPN's rank text from the first name it files the stat under");
eq([nd[2].value, nd[3].value, nd[4].value, nd[5].value], ["407.7","130.0","277.7","6.3"],
   "the yardage rows");
eq([nd[8].value, op[8].value], ["6","-2"], "turnover margin keeps a negative");
ok(!/splits|categories|rankDisplayValue|espn/i.test(JSON.stringify(nd)), "carries no ESPN keys or names");

console.log(" the sacks collision");
// ESPN files "sacks" under passing (given up by this offence) AND defensive
// (made by this defence). A bare lookup takes whichever category the feed
// lists last, which is luck, not a decision. The rows name the category.
eq(nd[6], { key:"sacks", label:"Sacks", value:"7", rank:36, rankText:"Tied-36th" },
   "Sacks is the defence's 7, not the offence's 2 from the passing category");
eq(op[6].value, "3", "and the same for the other side");

// The fixture lists passing before defensive, as ESPN does today, so a bare
// "sacks" lookup would land on the right value by luck. Feed the SAME two
// categories in the opposite order: a qualified lookup is unmoved, a bare one
// flips to the offence's number. This is the check that has teeth.
function sacksFrom(order) {
  var cat = {
    passing:   { name:"passing",   stats:[{ name:"sacks", displayValue:"2", value:2, rank:108, rankDisplayValue:"Tied-108th" }] },
    defensive: { name:"defensive", stats:[{ name:"sacks", displayValue:"7", value:7, rank:36,  rankDisplayValue:"Tied-36th" }] }
  };
  return TeamOS.espn.seasonStats({ splits: { categories: order.map(function (k) { return cat[k]; }) } })[6];
}
eq(sacksFrom(["passing","defensive"]).value, "7", "defence's sacks with the feed in today's order");
eq(sacksFrom(["defensive","passing"]).value, "7", "and still the defence's with the categories swapped");
eq(sacksFrom(["defensive"]).value, "7", "and with the passing category absent entirely");
eq(sacksFrom(["passing"]).value, null, "a payload with only the offence's sacks answers nothing");

console.log(" the fields ESPN publishes but never fills");
// pointsAllowed and yardsAllowed are in every payload, always 0, always
// ranked "Tied-1st". Mapping them would print a confident 0.0 #1.
var rawNd = JSON.stringify(stats.teams["87"]);
ok(/pointsAllowed/.test(rawNd) && /yardsAllowed/.test(rawNd), "the fixture still carries both stubs");
eq(nd[1], { key:"pointsAllowed", label:"Points allowed", value:null, rank:null, rankText:null },
   "the points-allowed row comes back empty for TeamOS.season to fill");

// Behavioural, not a grep: a payload of NOTHING BUT the stubs must produce a
// card with no values at all. If any row ever learns to read pointsAllowed or
// yardsAllowed, this is what catches it.
var stubsOnly = TeamOS.espn.seasonStats({ splits: { categories: [ { name: "defensive", stats: [
  { name:"pointsAllowed", displayValue:"0", value:0, rank:1, rankDisplayValue:"Tied-1st" },
  { name:"yardsAllowed",  displayValue:"0", value:0, rank:1, rankDisplayValue:"Tied-1st" } ] } ] } });
eq(stubsOnly.map(function (r) { return r.value; }), [null,null,null,null,null,null,null,null,null],
   "a payload of nothing but ESPN's zero stubs yields nine empty rows");
eq(stubsOnly.map(function (r) { return r.rank; }), [null,null,null,null,null,null,null,null,null],
   "and never ESPN's phantom Tied-1st rank");

console.log("scoreLines()");
var lines = TeamOS.espn.scoreLines(fixture, "87");
eq(lines.length, 4, "one line per event on the schedule");
eq(lines[1], { state:"post", us:"41", them:"13" }, "a finished game, from this team's point of view");
eq(lines[0], { state:"pre", us:null, them:null }, "an unplayed one carries no score");
eq(TeamOS.espn.scoreLines(fixture, "275")[1], { state:"post", us:"13", them:"41" },
   "the same game read for the other team is the mirror");
eq(TeamOS.espn.scoreLines(fixture, "999")[1], { state:"post", us:null, them:"13" },
   "a team not in the game has no score of its own");
eq(TeamOS.espn.scoreLines(null, "87"), [], "no payload -> no lines");
ok(!/competitions|competitors|displayValue|homeAway/.test(JSON.stringify(lines)), "carries no ESPN keys");

console.log("teamScheduleUrl");
eq(TeamOS.espn.teamScheduleUrl("194"),
   "https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams/194/schedule",
   "the same URL shape as the configured team's, for a team with no config");
eq(TeamOS.espn.teamScheduleUrl(TEAM_CONFIG.sources.espn.teamId), TeamOS.espn.scheduleUrl(TEAM_CONFIG),
   "and it agrees with scheduleUrl for the configured team (SW cache key)");

// ---- teamos/season.js: what a team's own results already answer ----
console.log("teamos/season.js");
var seasonSrc = read("teamos/season.js");
ok(!/\bfetch\s*\(/.test(seasonSrc), "does not call fetch()");
ok(!/\b(document|window|navigator|localStorage|caches)\b/.test(seasonSrc), "does not touch the DOM or browser storage");
ok(!/espn|kalshi|open-meteo/i.test(uncomment(seasonSrc)), "names no provider");
ok(!/notre|irish|ohio|buckeye/i.test(uncomment(seasonSrc)), "names no team");
eq(Object.keys(TeamOS.season).sort(), ["gamesCounted","pointsAllowedPerGame","pointsPerGame"],
   "exactly the documented functions");

var season = [ { state:"post", us:"56", them:"13" },
               { state:"post", us:"32", them:"0"  },
               { state:"in",   us:"7",  them:"21" },
               { state:"pre",  us:null, them:null } ];
eq(TeamOS.season.pointsAllowedPerGame(season), 6.5, "points allowed averages the finished games only");
eq(TeamOS.season.pointsPerGame(season), 44, "and so does points scored");
eq(TeamOS.season.gamesCounted(season), 2, "two games have finished");
eq(TeamOS.season.pointsAllowedPerGame([{ state:"post", us:"3", them:"0" }]), 0,
   "a shutout is 0 allowed, not no answer");
eq(TeamOS.season.pointsAllowedPerGame([{ state:"pre", us:null, them:null }]), null,
   "nothing finished -> null, and the view drops the row");
eq(TeamOS.season.pointsAllowedPerGame([]), null, "no games -> null");
eq(TeamOS.season.pointsAllowedPerGame(null), null, "no list at all -> null");
eq(TeamOS.season.pointsAllowedPerGame([{ state:"post", us:"10", them:null }]), null,
   "a finished game with no score cannot answer");
eq(TeamOS.season.pointsAllowedPerGame([{ state:"post", us:"1", them:"1,223" }]), 1223,
   "a score the provider printed with a comma still parses");
eq(TeamOS.season.pointsAllowedPerGame(TeamOS.espn.scoreLines(fixture, "87")), 13,
   "it reads score lines and Games the same way");

// The whole point, end to end: the one row ESPN cannot answer, answered.
console.log(" the derived row, end to end");
var filled = nd.map(function (r) {
  return r.key === "pointsAllowed"
    ? { key:r.key, label:r.label, value:(13).toFixed(1), rank:r.rank, rankText:r.rankText }
    : r;
});
eq(filled[1], { key:"pointsAllowed", label:"Points allowed", value:"13.0", rank:null, rankText:null },
   "filled from results, with no national rank because none exists");

// ---- news ----
var newsFixture = JSON.parse(read("tools/fixtures/espn-news.json"));
var NEWS = ["title","link","image","source","publishedAt"];
var NEWSLEAK = /articles|headline|links|href|images|published\b|categories|description|byline|espncdn|api\.espn/i;

console.log("newsUrl");
eq(TeamOS.espn.newsUrl(TEAM_CONFIG),
   "https://site.api.espn.com/apis/site/v2/sports/football/college-football/news?team=87&limit=30",
   "news URL unchanged (SW cache key)");

console.log("news()");
var items = TeamOS.espn.news(newsFixture);
eq(items.length, 4, "one NewsItem per article");
items.forEach(function (n, i) {
  eq(Object.keys(n), NEWS, "item " + i + " has exactly the documented NewsItem fields");
  // `link` and `image` are ESPN URLs and `source` is the outlet's name; test the keys and the rest
  ok(!NEWSLEAK.test(JSON.stringify({ title: n.title, source: n.source, publishedAt: n.publishedAt })), "item " + i + " carries no ESPN keys or names outside its URLs");
  ok(typeof n.publishedAt === "number", "item " + i + " publishedAt is epoch milliseconds");
});
eq(items.map(function (n) { return new Date(n.publishedAt).toISOString(); }),
   ["2026-09-15T10:40:51.000Z","2026-09-18T10:11:31.000Z","2026-09-07T04:18:07.000Z","2026-09-17T13:51:53.000Z"],
   "kept in the feed's own order - the view sorts, the adapter does not");
eq(items[1], { title:"College football Week 3 preview: Can Ole Miss take down LSU?",
               link:"https://www.espn.com/college-football/story/_/id/49965321/college-football-week-3-preview-ole-miss-revenge-lsu",
               image:"https://a.espncdn.com/photo/2026/0917/r1718150_608x342_16-9.jpg",
               source:"ESPN", publishedAt: Date.parse("2026-09-18T10:11:31Z") },
   "a full article: headline, web link, first image, source label, timestamp");
eq(TeamOS.espn.news({ articles: [{ headline:"No picture", published:"2026-09-01T00:00:00Z", links:{ web:{ href:"https://x/y" } } }] })[0].image, "", "no image -> empty string (the view skips the <img>)");
eq(TeamOS.espn.news({ articles: [{ headline:"No date", links:{ web:{ href:"https://x/y" } } }] })[0].publishedAt, null, "no date -> null (the view shows no date and sorts it last)");
eq(TeamOS.espn.news({ articles: [{ headline:"No link" }, { links:{ web:{ href:"https://x/y" } } }] }), [], "no web link or no headline -> dropped");
eq(TeamOS.espn.news(null), [], "no payload -> empty list");

// ---- exports ----
console.log("exports");
eq(Object.keys(TeamOS.espn).sort(),
   ["gameDetail","gameOdds","mark","news","newsUrl","rankings","rankingsUrl","roster","rosterUrl","schedule","scheduleUrl","scoreLines","scoreboard","scoreboardUrl","seasonStats","seasonStatsUrl","summaryUrl","teamScheduleUrl","teamStatus","teamUrl"],
   "exactly the documented functions");

console.log("mark");
eq(TeamOS.espn.mark("87"), "https://a.espncdn.com/i/teamlogos/ncaa/500/87.png", "a program's mark, as the provider hosts it");
eq(TeamOS.espn.mark(87, true), "https://a.espncdn.com/i/teamlogos/ncaa/500-dark/87.png", "the variant drawn for dark backgrounds");
eq(TeamOS.espn.mark(null), null, "no id, no mark - the view draws its own fallback");
eq(TeamOS.espn.mark("87/../x"), null, "an id is digits or nothing: it becomes part of a URL");

// ---- snapshot ownership: the same questions, two teams, two answers ----
console.log("teamos/snapshots.js");
var snapSrc = read("teamos/snapshots.js");
ok(!/\bfetch\s*\(/.test(snapSrc),                                        "does not call fetch()");
ok(!/\b(document|window|navigator|localStorage|caches)\b/.test(snapSrc),   "does not touch the DOM or browser storage");
ok(!/\bTEAM_ID\b|\bS\.\w|\bTEAM\b(?!_CONFIG)/.test(snapSrc), "does not read application globals (TEAM, TEAM_ID, S)");
ok(!/notre|irish|ohio|buckeye/i.test(snapSrc.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "")), "names no team in code");
eq(Object.keys(TeamOS.snapshots).sort(), ["files","get","owned"], "exactly the documented functions");

console.log(" every file a team declares, for the worker to cache");
eq(TeamOS.snapshots.files(TEAM_CONFIG),
   ["depth.json", "depth-history.json", "availability.json", "availability-history.json",
    "odds-history.json", "news.json"],
   "Notre Dame's snapshots, files and histories together - availability is its own now");
eq(TeamOS.snapshots.files(load("teams/ohio-state.js").TEAM_CONFIG), [],
   "Ohio State declares none, so there is nothing to cache for it");
eq(TeamOS.snapshots.files({}), [], "a config with no snapshots section is not an error");
eq(TeamOS.snapshots.files({ snapshots: { depth: { file: "d.json" } } }), ["d.json"],
   "a kind with no history contributes one file");

var osu = load("teams/ohio-state.js");
var ND = TeamOS.createTeam(TEAM_CONFIG.team), OSU = osu.TeamOS.createTeam(osu.TEAM_CONFIG.team);
var ndFiles = { depth: JSON.parse(read("depth.json")), history: JSON.parse(read("depth-history.json")),
                availability: JSON.parse(read("availability.json")),
                availabilityHistory: JSON.parse(read("availability-history.json")),
                odds: JSON.parse(read("odds-history.json")), news: JSON.parse(read("news.json")) };

console.log(" notre-dame");
eq(TeamOS.snapshots.get(TEAM_CONFIG, "depth"),       { file:"depth.json", history:"depth-history.json", label:"FightingIrish.com" }, "declares a depth chart");
eq(TeamOS.snapshots.get(TEAM_CONFIG, "availability"),
   { file:"availability.json", history:"availability-history.json", label:"FightingIrish.com" },
   "declares an availability report, separately from the depth chart");
eq(TeamOS.snapshots.get(TEAM_CONFIG, "oddsHistory"), { file:"odds-history.json" }, "declares an odds history");
eq(TeamOS.snapshots.get(TEAM_CONFIG, "beatNews"),    { file:"news.json" },         "declares beat news");
ok(TeamOS.snapshots.owned(ND, ndFiles.depth),   "owns the committed depth.json");
ok(TeamOS.snapshots.owned(ND, ndFiles.history), "owns the committed depth-history.json");
ok(TeamOS.snapshots.owned(ND, ndFiles.availability),        "owns the committed availability.json");
ok(TeamOS.snapshots.owned(ND, ndFiles.availabilityHistory), "owns the committed availability-history.json");
eq([ndFiles.depth.schema, ndFiles.history.schema], [2, 2], "the depth snapshots are in the slot model");
ok(typeof ndFiles.availability.reported === "boolean" && "effectiveAt" in ndFiles.availability,
   "the availability report says whether it exists, and when it is from");
ok(TeamOS.snapshots.owned(ND, ndFiles.odds),    "owns the committed odds-history.json");
ok(TeamOS.snapshots.owned(ND, ndFiles.news),    "owns the committed news.json");
eq([ndFiles.depth.team, ndFiles.history.team], ["notre-dame", "notre-dame"],
   "official personnel snapshots are stamped with their owning team");
ok(ndFiles.odds.team == null && ndFiles.news.team == null,
   "legacy market/news snapshots still rely on their team declaration");

console.log(" ohio-state");
eq(osu.TeamOS.snapshots.get(osu.TEAM_CONFIG, "depth"),       null, "declares no depth chart");
eq(osu.TeamOS.snapshots.get(osu.TEAM_CONFIG, "oddsHistory"), null, "declares no odds history");
eq(osu.TeamOS.snapshots.get(osu.TEAM_CONFIG, "beatNews"),    null, "declares no beat news");
eq(TeamOS.snapshots.get({ team: osu.TEAM_CONFIG.team }, "depth"), null, "a config with no snapshots section declares nothing");

console.log(" a stamped file");
var stamped = { team: "notre-dame", points: [] };
ok(TeamOS.snapshots.owned(ND, stamped),   "a file stamped notre-dame is Notre Dame's");
ok(!TeamOS.snapshots.owned(OSU, stamped), "and is refused for Ohio State even if declared");
ok(!TeamOS.snapshots.owned(ND, null),     "no payload is not owned");
ok(!TeamOS.snapshots.owned(ND, "text"),   "a non-object payload is not owned");
ok(TeamOS.snapshots.owned(OSU, { points: [] }), "an unstamped file is owned by whoever declared it (the documented limitation)");

console.log(" malformed declarations fail loudly");
function throws(fn, what) { try { fn(); ok(false, what); } catch (e) { ok(true, what + " (" + e.message + ")"); } }
throws(function () { TeamOS.snapshots.get(TEAM_CONFIG, "depthChart"); }, "an unknown kind throws");
throws(function () { TeamOS.snapshots.get({ snapshots: { depth: { history: "x.json" } } }, "depth"); }, "a declaration without a file throws");
throws(function () { TeamOS.snapshots.get({ snapshots: { depth: "depth.json" } }, "depth"); }, "a bare string throws");
eq(TeamOS.snapshots.get({ snapshots: { oddsHistory: { file: "x.json" } } }, "oddsHistory"), { file: "x.json" }, "a minimal declaration passes through");


// ---- team identity: the same questions, two teams, two answers ----
console.log("teamos/identity.js");
var idSrc = read("teamos/identity.js");
function uncomment(t) { return t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, ""); }
ok(!/\bfetch\s*\(/.test(idSrc), "does not call fetch()");
ok(!/\b(document|window|navigator|localStorage|caches)\b/.test(uncomment(idSrc)), "does not touch the DOM or browser storage");
ok(!/notre|irish|ohio|buckeye|navy|scarlet/i.test(uncomment(idSrc)), "names no team and no team colour in code");
eq(Object.keys(TeamOS.identity).sort(), ["MIN", "contrast", "create", "luminance"], "exactly the documented functions");

// The contrast maths, against ratios computed independently.
ok(Math.abs(TeamOS.identity.contrast("#FFFFFF", "#000000") - 21) < 0.01, "white on black is 21:1");
ok(Math.abs(TeamOS.identity.contrast("#C99700", "#07192F") - 6.65) < 0.01, "Notre Dame gold on its page is 6.65:1");
ok(Math.abs(TeamOS.identity.contrast("#BA0C2F", "#0B1115") - 2.88) < 0.01, "Ohio State scarlet on its page is 2.88:1");
eq(TeamOS.identity.MIN, 4.5, "the minimum is WCAG AA for normal text");

var ndId = TeamOS.identity.create(TEAM_CONFIG, ND);
var osuId = osu.TeamOS.identity.create(osu.TEAM_CONFIG, OSU);

console.log(" notre-dame identity");
eq(ndId.productName, "Irish Watch", "product name");
eq(ndId.programLabel, "NOTRE DAME FOOTBALL", "program label");
eq(ndId.title, "Irish Watch — Notre Dame football", "document title");
eq(ndId.shareTitle, "Irish Watch — Notre Dame Football", "the share card keeps its own capitalisation");
eq(ndId.shareDescription, "Game day. Every day.", "share description");
eq(ndId.motto, "Leave No Doubt", "the 2026 team motto");
eq(ndId.newsLabel, "LATEST FROM SOUTH BEND", "the News tab rule, unchanged wording");
eq(ndId.manifest, "assets/notre-dame/manifest.json", "its own manifest");
eq(ndId.colors.accent, "#C99700", "accent");
eq(ndId.colors.accentText, "#C99700", "accent text is the same gold, because it passes");
eq(ndId.colors.accentRgb, "201,151,0", "accent channels, for the stylesheet's 43 tints");
eq(ndId.colors.surfaceRgb, "12,35,64", "surface channels");
eq(Object.keys(ndId.assets).filter(function (k) { return ndId.assets[k]; }).sort(),
   ["appleTouch", "favicon", "icon32", "icon64", "og"], "declares all five pieces of artwork");
ok(Object.keys(ndId.assets).every(function (k) {
  return !ndId.assets[k] || ndId.assets[k].indexOf("assets/notre-dame/") === 0;
}), "all of it under its own team folder");

console.log(" ohio-state identity");
eq(osuId.productName, "Buckeye Watch", "product name");
eq(osuId.programLabel, "OHIO STATE FOOTBALL", "program label");
eq(osuId.title, "Buckeye Watch · Ohio State Football", "document title");
eq(osuId.shareTitle, osuId.title, "no separate share title, so it falls back to the title");
eq(osuId.motto, null, "no motto: Leave No Doubt belongs to Notre Dame");
eq(osuId.newsLabel, "LATEST BUCKEYE NEWS", "its own News tab rule");
eq(osuId.colors.accent, "#BA0C2F", "BUX scarlet");
eq(osuId.colors.accentText, "#EFF1F2", "accent TEXT is BUX gray-light, not a lightened scarlet");
ok(osuId.colors.accentText !== osuId.colors.accent, "a team whose accent cannot carry text says so explicitly");
eq(Object.keys(osuId.assets).filter(function (k) { return osuId.assets[k]; }), [], "declares no artwork, so none is referenced");
eq(osuId.fonts.ui.indexOf("BuckeyeSans"), 1, "BuckeyeSans leads the UI stack");
ok(/Barlow/.test(osuId.fonts.ui), "with a fallback, because the font files are not distributed");

console.log(" the two teams differ where identity lives");
["productName", "programLabel", "title", "description", "manifest", "newsLabel"].forEach(function (k) {
  ok(ndId[k] !== osuId[k], "identity." + k + " differs");
});
["accent", "accentText", "accentInk", "surface", "surfaceDeep"].forEach(function (k) {
  ok(ndId.colors[k] !== osuId.colors[k], "identity.colors." + k + " differs");
});
["ui", "display", "headline"].forEach(function (k) {
  ok(ndId.fonts[k] !== osuId.fonts[k], "identity.fonts." + k + " differs");
});

console.log(" every configured team is legible (WCAG AA)");
[["notre-dame", ndId], ["ohio-state", osuId]].forEach(function (p) {
  var n = p[0], c = p[1].contrast;
  ok(c.accentText >= 4.5, n + ": accentText on the page is " + c.accentText + ":1");
  ok(c.accentSoft >= 4.5, n + ": accentSoft on the page is " + c.accentSoft + ":1");
  ok(c.accentInk >= 4.5, n + ": accentInk on the accent is " + c.accentInk + ":1");
  ok(c.text === null || c.text >= 4.5,
     n + ": declared text colour is " + (c.text === null ? "not overridden" : c.text + ":1"));
  console.log("       (accent as text would be " + c.accentOnSurface + ":1 - reported, never enforced)");
});

console.log(" a config that would ship an unreadable page is refused");
function baseIdentity() {
  return { identity: {
    productName: "P", programLabel: "L", title: "T", description: "D", manifest: "m.json",
    newsLabel: "N",
    colors: { accent: "#BA0C2F", accentText: "#EFF1F2", accentInk: "#FFFFFF", accentSoft: "#A7B1B7",
              accentTint: "#EFF1F2", accentTintSoft: "#F6F7F8", focus: "#EFF1F2",
              surface: "#212325", surfaceDeep: "#0B1115", surfaceAbyss: "#070A0C", surfaceRaise: "#3F4443" },
    fonts: { ui: "a", display: "b", headline: "c" }, assets: {} } };
}
ok((function () { try { TeamOS.identity.create(baseIdentity(), ND); return true; } catch (e) { return false; } })(),
   "the baseline config these cases mutate is itself valid");
function idThrows(mutate, what) {
  var cfg = baseIdentity();
  mutate(cfg);
  try { TeamOS.identity.create(cfg, ND); ok(false, what); }
  catch (e) { ok(true, what + " (" + e.message + ")"); }
}
idThrows(function (c) { c.identity.colors.accentText = "#BA0C2F"; }, "accent text that fails on the surface throws");
idThrows(function (c) { c.identity.colors.accentInk = "#4A0513"; }, "ink that fails on the accent throws");
idThrows(function (c) { c.identity.colors.accentSoft = "#3F4443"; }, "a soft tone that fails throws");
idThrows(function (c) { c.identity.colors.text = "#3F4443"; }, "a declared text colour that fails throws");
idThrows(function (c) { c.identity.colors.accent = "BA0C2F"; }, "a colour that is not #rrggbb throws");
idThrows(function (c) { delete c.identity.colors.surfaceDeep; }, "a missing colour throws");
idThrows(function (c) { delete c.identity.productName; }, "a missing product name throws");
idThrows(function (c) { delete c.identity.fonts; }, "missing type throws");
idThrows(function (c) { delete c.identity.manifest; }, "a missing manifest throws");
ok((function () { try { TeamOS.identity.create({}, ND); return false; } catch (e) { return true; } })(),
   "a config with no identity section throws");

// ---- the stylesheet names no team ----
console.log("app.css");
var css = read("app.css");
var cssClean = uncomment(css);
var tokenBlock = cssClean.match(/--t-accent:[\s\S]*?--t-accent-line:[^;}]*}/);
ok(!!tokenBlock, "the team token block is where it says it is");
var cssRules = cssClean.replace(tokenBlock ? tokenBlock[0] : "\u0000", "");
ok(!/#C99700|#0C2340|#07192F|#061525|#D8B84F|201,151,0|12,35,64/.test(cssRules),
   "no Notre Dame colour survives outside that block");
ok(!/\.nd\b/.test(css), "the team's own rows are .mine, not .nd");
ok(/\.row\.mine\b/.test(css) && /\.obar\.mine\b/.test(css), "and .mine carries those rules");
ok(!/notre|irish|ohio|buckeye|south bend|columbus/i.test(cssRules),
   "no team and no home town named in any selector or value");
ok(!/--gold|--navy/.test(css), "no team-flavoured variable name survives (--gold holding scarlet reads as a lie)");
ok(/#panel-news:before{content:var\(--t-news-label\)}/.test(css), "the News tab rule comes from the team");
ok(!/:before{content:"[^"]*[A-Z]{2,}[^"]*"}/.test(cssRules.replace(/#panel-(schedule|around|game|depth):before{content:"[^"]*"}/g, "")),
   "every other section label is team-neutral copy");
ok(!/'Barlow|'Grenze/.test(cssRules), "type comes from the team's stacks, not from the rules");

// ---- a team without a provider's data does not see that surface ----
// Kalshi prices the championship contenders, not all of FBS. A team it takes
// no market on has nothing to show, and a card reading "No market" every week
// is worse than no card. Same shape as the snapshot rule (decision 0008): the
// capability is declared, and a team without it never sees the surface.
// Before this, a config with no kalshi block threw on the first market check.
console.log("app.js: Kalshi is a capability");
var appSrc = read("app.js").replace(/\r\n/g, "\n");

// Lift a function out of app.js by matching to a closing brace in column 1.
// A ONE-LINER has no such brace, so the match runs on and swallows whatever
// follows - which silently redefined the very stub a check was watching, and
// made the check pass on a broken build. Refuse to return an over-capture.
function liftFn(name) {
  var m = appSrc.match(new RegExp("^function " + name + "\\([^)]*\\)\\{[\\s\\S]*?^\\}", "m"));
  if (!m) throw new Error("could not find " + name + " in app.js");
  var extra = m[0].slice(("function " + name).length).match(/^function\s+\w+/m);
  if (extra) throw new Error("lifting " + name + " swallowed " + extra[0] +
                             " - it is probably a one-liner; stub it instead");
  return m[0] + "\n";
}
// The two one-liners this needs, stubbed rather than lifted, per the above.
var ONELINERS =
  "function teamOf(m){ return m.yes_sub_title||m.subtitle||m.title||m.ticker; }\n" +
  "function isTeamMarket(m){ return teamMarket(m.ticker, teamOf(m)); }\n";

function kalshiCtx(config) {
  var c = vm.createContext({});
  vm.runInContext("var TEAM_CONFIG = " + config + ";", c);
  vm.runInContext(liftFn("hasKalshi") + liftFn("teamMarket") + ONELINERS, c);
  return c;
}
function has(config) { return vm.runInContext("hasKalshi()", kalshiCtx(config)); }
function market(config, ticker, name) {
  var c = kalshiCtx(config);
  c.__t = ticker; c.__n = name;
  // A throw is the bug, not a crash of this file: report it as a failure so
  // the line that broke is named rather than a stack trace being the answer.
  try { return vm.runInContext("teamMarket(__t, __n)", c); }
  catch (e) { return "THREW: " + e.message; }
}

var ndCfg = JSON.stringify({ sources: { kalshi: { tickerSuffix: "-ND" } } });
ok(has(ndCfg), "a team that declares Kalshi markets has the capability");
ok(!has(JSON.stringify({ sources: {} })), "a team whose config has no kalshi block does not");
ok(!has(JSON.stringify({})), "nor one with no sources at all");
ok(!has(JSON.stringify({ sources: { kalshi: null } })), "nor one that declares it as null");

// The bug: these used to throw, which is what a second team without Kalshi
// would have hit the moment it became selectable.
eq(market(JSON.stringify({ sources: {} }), "KXNCAAF-27-ND", "Notre Dame"), false,
   "asking whether a market is ours, with no kalshi config, answers no");
eq(market(JSON.stringify({}), "KXNCAAF-27-ND", "Notre Dame"), false, "and does not throw with no sources");
eq(market(ndCfg, "KXNCAAF-27-ND", "Somebody"), true, "a matching ticker suffix is ours");
eq(market(ndCfg, "KXNCAAF-27-OSU", "Ohio St."), false, "another team's ticker is not");

console.log(" and the surface actually goes");
// Behavioural, not a grep: run the real loadStrip against a stubbed page and
// see whether it removed anything.
function stripRun(config) {
  var c = vm.createContext({ console: console });
  vm.runInContext("var TEAM_CONFIG = " + config + ";", c);
  vm.runInContext([
    "var dropped = 0, asked = 0, TITLE_EVENT = 'T', PLAYOFF_EVENT = 'P';",
    "var cells = {};",
    "function $(id){ return cells[id] || (cells[id] = { textContent:'', innerHTML:'', className:'' }); }",
    "function dropOddsSurface(){ dropped++; }",
    "function loadSparklines(){}",
    "function price(){ return null; }",
    "function prevPrice(){ return null; }",
    "function kalshi(){ asked++; return Promise.resolve({ markets: [] }); }"
  ].join("\n"), c);
  vm.runInContext(liftFn("hasKalshi") + liftFn("teamMarket") + liftFn("loadStrip") + ONELINERS, c);
  vm.runInContext("loadStrip();", c);
  return c;
}
var noKalshi = stripRun(JSON.stringify({ sources: {} }));
eq(noKalshi.dropped, 1, "a team with no Kalshi markets loses the odds surface");
eq(noKalshi.asked, 0, "and Kalshi is never even asked");

var withKalshi = stripRun(ndCfg);
eq(withKalshi.dropped, 0, "a team that has them keeps it at first");
eq(withKalshi.asked, 2, "and both event queries go out");

ok(/function dropOddsSurface/.test(appSrc), "there is one place that takes the surface away");

// ---- app.js names no team, no colour, no team branch ----
console.log("app.js");
var js = read("app.js");
var jsBody = uncomment(js);
ok(!/#[0-9A-Fa-f]{6}\b/.test(jsBody), "carries no colour literal");
ok(!/notre dame|irish watch|fighting irish|ohio state|buckeye/i.test(jsBody), "names no team and no product");
ok(!/TEAM\.id\s*===|TEAM_CONFIG\.team\.id\s*===/.test(jsBody), "branches on no team id");
ok(/paintIdentity\(\);/.test(js), "applies identity once, in one place");
ok(!/\bnd\b/.test(jsBody), "no leftover nd identifier");


// ---- the page names no team ----
// index.html used to name Notre Dame in eight script tags, which is what made
// buckeye.html necessary: a second team meant a second copy of the page. 7A
// moved that decision into the boot script, so the markup names nobody.
console.log("index.html");
var idx = read("index.html").replace(/\r\n/g, "\n");
var boot = (idx.match(/<script id="team-boot">([\s\S]*?)<\/script>/) || [])[1] || "";
ok(!!boot, "carries the boot script that decides the team");
var markup = idx.replace(/<script id="team-boot">[\s\S]*?<\/script>/, "");
ok(!/<script src=/.test(markup), "and loads no script by name of its own");
ok(!/teams\/[a-z-]+\.js/.test(markup), "no team config is named in the markup");
ok(!/<style id="team-boot">/.test(idx), "the static token blocks are gone, replaced by the replay");
ok(!fs.existsSync(path.join(root, "buckeye.html")), "and buckeye.html is retired");

console.log(" its manifest");
var osuMan = JSON.parse(read("assets/ohio-state/manifest.json"));
var ndMan = JSON.parse(read("assets/notre-dame/manifest.json"));
eq(osuMan.short_name, "Buckeye Watch", "short name");
eq(osuMan.start_url, "../../?team=ohio-state", "installing it opens Buckeye Watch - the page plus its team, now that there is one page");
eq(osuMan.icons, [], "no icons, because there is no approved artwork");
eq(ndMan.start_url, "../../?team=notre-dame", "Notre Dame's carries its team too");
ok(/\?team=/.test(ndMan.start_url) && /\?team=/.test(osuMan.start_url),
   "every manifest names its team in start_url - one installed app per team, each opening its own");
ok(ndMan.start_url !== osuMan.start_url, "and no two teams install to the same start URL");
ok(osuMan.theme_color !== ndMan.theme_color, "the two manifests carry different theme colours");



// ---- one live state per game ----
// 2026-09-19: the Game Center showed Ohio State 49-0 in the fourth quarter
// while the hero and the schedule row still showed 0-0, because the team's
// schedule payload and the league scoreboard are different endpoints and only
// one of them was being refreshed. TeamOS.live.reconcile is the rule that
// makes the scoreboard the live truth for a game both describe; these checks
// are that rule, and the screenshot itself as a fixture.
console.log("teamos/live.js");
var liveSrc = read("teamos/live.js");
ok(!/\bfetch\s*\(/.test(liveSrc), "does not fetch");
ok(!/\b(document|window|navigator|localStorage|caches)\b/.test(uncomment(liveSrc)), "does not touch the DOM");
ok(!/espn|ESPN/.test(uncomment(liveSrc)), "names no provider: it reads domain objects");
ok(!/notre|irish|ohio|buckeye/i.test(uncomment(liveSrc)), "names no team");
eq(Object.keys(TeamOS.live).sort(), ["anyLive", "isLive", "reconcile", "reconcileAll"], "exactly the documented functions");

// The Kent State game as the app saw it: a Game from the schedule endpoint
// that never left the pre-game snapshot, and the scoreboard's live view.
function kentGame(over) {
  return { id: "401858464", date: "2026-09-19T16:00Z", timeSet: true, home: true, neutral: false,
           oppName: "Kent State", oppRank: null, venue: "Ohio Stadium", city: "Columbus",
           venueState: "OH", zip: "43210", net: "FOX", odds: { line: "OSU -52.5", total: 59.5 },
           series: null, state: over ? "pre" : "pre", detail: "", us: null, them: null, won: null };
}
function kentLeague(state, ours, theirs, detail) {
  return { id: "401858464", date: "2026-09-19T16:00Z", timeSet: true, state: state, detail: detail,
           venue: "Ohio Stadium", net: "FOX", odds: null,
           home: { name: "Ohio State", rank: 6, score: ours },
           away: { name: "Kent State", rank: null, score: theirs },
           mine: true,
           live: state === "in" ? { downDistance: "1st & 10", lastPlay: "Timeout Ohio State" } : null };
}

console.log(" the screenshot, as a fixture");
var pre = kentGame();
eq(pre.us, null, "before kickoff the schedule carries no score");

var atKickoff = TeamOS.live.reconcile(pre, kentLeague("in", "0", "0", "15:00 - 1st"));
eq([atKickoff.state, atKickoff.us, atKickoff.them], ["in", "0", "0"], "kickoff: 0-0 and in play");
eq(atKickoff.detail, "15:00 - 1st", "and the clock");

var fourth = TeamOS.live.reconcile(pre, kentLeague("in", "49", "0", "14:27 - 4th"));
eq([fourth.state, fourth.us, fourth.them, fourth.detail], ["in", "49", "0", "14:27 - 4th"],
   "the state the Game Center had, now on the Game every other surface reads");
ok(fourth.us !== "0" && fourth.them !== "49", "our side is ours: the Game is the team's point of view");
eq(fourth.won, null, "nobody has won while it is being played");

// the away perspective of the same game
var away = kentGame(); away.home = false;
var awayFourth = TeamOS.live.reconcile(away, kentLeague("in", "49", "0", "14:27 - 4th"));
eq([awayFourth.us, awayFourth.them], ["0", "49"], "the visiting team reads the same scoreboard the other way round");

console.log(" a score of zero is a score");
var shutout = TeamOS.live.reconcile(pre, kentLeague("post", "59", "0", "Final"));
eq([shutout.state, shutout.us, shutout.them, shutout.won], ["post", "59", "0", true], "final 59-0: won, and the 0 survives");
var lost = TeamOS.live.reconcile(pre, kentLeague("post", "0", "17", "Final"));
eq([lost.us, lost.them, lost.won], ["0", "17", false], "and a 0 of our own is not mistaken for no score");
var tied = TeamOS.live.reconcile(pre, kentLeague("post", "20", "20", "Final"));
eq(tied.won, null, "a tie is neither won nor lost");

console.log(" it never moves a game backwards");
var running = TeamOS.live.reconcile(pre, kentLeague("in", "21", "7", "2:00 - 2nd"));
var stale = TeamOS.live.reconcile(running, kentLeague("pre", null, null, "4:00 PM"));
eq([stale.state, stale.us, stale.them], ["in", "21", "7"],
   "a scoreboard that still says pre cannot un-start a game in progress");
var done = TeamOS.live.reconcile(running, kentLeague("post", "49", "7", "Final"));
eq([done.state, done.us, done.them], ["post", "49", "7"], "but post is allowed to follow in");

console.log(" it leaves alone what the scoreboard has no opinion about");
var keep = TeamOS.live.reconcile(pre, kentLeague("in", "49", "0", "14:27 - 4th"));
["venue", "city", "venueState", "zip", "net", "odds", "series", "timeSet", "home", "neutral", "oppName", "date"].forEach(function (k) {
  eq(keep[k], pre[k], "keeps " + k);
});
ok(keep !== pre, "and returns a new object rather than mutating the schedule's");
eq(pre.state, "pre", "the input is untouched");

console.log(" a different game is not reconciled");
var other = TeamOS.live.reconcile(pre, kentLeague("in", "49", "0", "14:27 - 4th"));
var wrongId = kentLeague("in", "99", "0", "1:00 - 4th"); wrongId.id = "999999";
eq(TeamOS.live.reconcile(pre, wrongId), pre, "an id that does not match returns the game untouched");
eq(TeamOS.live.reconcile(pre, null), pre, "no scoreboard entry returns the game untouched");
eq(TeamOS.live.reconcile(null, wrongId), null, "no game returns nothing");

console.log(" the whole schedule against the whole scoreboard");
var season = [kentGame(), { id: "401858465", state: "pre", home: false, us: null, them: null, detail: "" }];
var board = [kentLeague("in", "49", "0", "14:27 - 4th")];
var out = TeamOS.live.reconcileAll(season, board);
eq([out[0].state, out[0].us], ["in", "49"], "the game the scoreboard knows is updated");
eq(out[1], season[1], "the one it does not know is passed through unchanged");
eq(TeamOS.live.reconcileAll(season, []), season, "an empty scoreboard changes nothing");
eq(TeamOS.live.reconcileAll(season, null), season, "and neither does a missing one");
ok(TeamOS.live.anyLive(board), "anyLive sees a game in play");
ok(!TeamOS.live.anyLive([kentLeague("post", "59", "3", "Final")]), "and sees that a final is not");
ok(TeamOS.live.isLive(fourth) && !TeamOS.live.isLive(pre), "isLive reads one game's state");

// ---- a Top 25 game that is not ours ----
console.log(" a Top 25 game nobody here follows");
var neutralGame = { id: "555", date: "2026-09-19T20:00Z", state: "pre", home: true, us: null, them: null, detail: "", oppName: "Somebody" };
var neutralBoard = { id: "555", state: "in", detail: "3:12 - 3rd",
                     home: { name: "Team A", rank: 4, score: "17" }, away: { name: "Team B", rank: 12, score: "21" },
                     mine: false, live: { downDistance: "3rd & 2", lastPlay: "Pass complete" } };
var n = TeamOS.live.reconcile(neutralGame, neutralBoard);
eq([n.state, n.us, n.them, n.detail], ["in", "17", "21", "3:12 - 3rd"],
   "reconciles by id whether or not the game is the configured team's");

// ---- the Suite is wired to one clock ----
console.log("app.js: one live loop");
var appLive = read("app.js");
ok(!/G\.poll/.test(appLive), "the Game tab no longer keeps its own timer");
ok(/TeamOS\.live\.reconcileAll\(games, SB\.games\)/.test(appLive),
   "the schedule is reconciled with the scoreboard where S.games is set");
ok(/getScoreboard\(0\)[\s\S]{0,200}refreshSchedule\(false\)/.test(appLive),
   "and the tick refreshes the scoreboard before the schedule, in that order");
ok(/if\(!\$\("panel-game"\)\.hidden && G\.live\) loadGame\(true\)/.test(appLive),
   "the same tick drives the Game tab");
ok(/if\(S\.tick\)\{ clearInterval\(S\.tick\); S\.tick=null; \}[\s\S]{0,120}Playing now/.test(appLive),
   "the countdown is cancelled when a game goes live");
ok(/S\.next\.state==="pre"[\s\S]{0,140}refreshSchedule\(false\)/.test(appLive),
   "and a session opened before kickoff goes looking once kickoff passes");

console.log("teamos/espn.js: a 0 is a 0");
var espnSrc = read("teamos/espn.js");
ok(/function scoreOf\(c\)/.test(espnSrc), "scores go through one reader");
ok(!/us&&us\.score\?/.test(espnSrc), "the truthiness test that turned a real 0 into null is gone");
var zero = TeamOS.espn.schedule({ events: [{ id: "1", date: "2026-09-19T16:00Z",
  competitions: [{ status: { type: { state: "in", shortDetail: "14:27 - 4th" } },
    competitors: [{ id: "87", homeAway: "home", score: { value: 0, displayValue: "0" }, team: { id: "87" } },
                  { id: "999", homeAway: "away", score: { value: 49, displayValue: "49" }, team: { id: "999", displayName: "Them" } }] }] }] },
  ND, TEAM_CONFIG)[0];
eq([zero.us, zero.them], ["0", "49"], "a schedule payload with a real 0 keeps it");
var none = TeamOS.espn.schedule({ events: [{ id: "2", date: "2026-09-19T16:00Z",
  competitions: [{ status: { type: { state: "pre" } },
    competitors: [{ id: "87", homeAway: "home", team: { id: "87" } },
                  { id: "999", homeAway: "away", team: { id: "999", displayName: "Them" } }] }] }] },
  ND, TEAM_CONFIG)[0];
eq([none.us, none.them], [null, null], "and no score at all is still null");

console.log("teamos/espn.js: the overall record by name");
eq(TeamOS.espn.teamStatus({ team: { record: { items: [
  { type: "home", summary: "0-0" }, { type: "total", summary: "3-0" }] } } }).record, "3-0",
  "the total record is found even when it is not first");
eq(TeamOS.espn.teamStatus({ team: { record: { items: [{ type: "total", summary: "2-1" }] } } }).record, "2-1",
  "and when it is the only one");
eq(TeamOS.espn.teamStatus({ team: {} }).record, null, "no record at all is null");

console.log("\n" + (failures ? failures + " check(s) FAILED" : "all adapter checks passed"));
process.exit(failures ? 1 : 0);
