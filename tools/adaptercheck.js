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
  [teamFile, "teamos/team.js", "teamos/snapshots.js", "teamos/identity.js", "teamos/live.js", "teamos/espn.js"].forEach(function (f) {
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
var SHAPE = ["id","date","timeSet","home","neutral","oppName","oppRank","venue","city","venueState","zip",
             "net","odds","series","state","detail","us","them","won"];
var LEAK = /competitions|competitors|curatedRank|pickcenter|neutralSite|geoBroadcasts|timeValid|shortDetail|displayValue|zipCode|homeAway|espn/i;

console.log("schedule()");
eq(games.length, 4, "one Game per event");
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
eq(TeamOS.espn.gameOdds({ pickcenter: [{ details: "ND -29.5", overUnder: 52.5 }] }), { line: "ND -29.5", total: 52.5 }, "line and total from pickcenter");
eq(TeamOS.espn.gameOdds({ pickcenter: [{ overUnder: 50 }] }), { line: null, total: 50 }, "missing line -> null, total kept");
eq(TeamOS.espn.gameOdds({}), null, "no pickcenter -> null");
eq(TeamOS.espn.gameOdds(null), null, "no summary -> null");

// ---- roster ----
var rosterFixture = JSON.parse(read("tools/fixtures/espn-roster.json"));
var PLAYER = ["name","jersey","position","positionName","height","weight","classYear","hometown"];
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
             height:"6' 7\"", weight:"320 lbs", classYear:"SR", hometown:{ city:"Belmont", state:"NC" } },
   "full player: abbreviation shown, full position name kept for search, class abbreviation");
eq([scaife.hometown.city, scaife.hometown.state], ["West Perth", ""], "missing state -> empty string, not undefined");
eq(walkon, { name:"Walk On", jersey:"", position:"Long Snapper", positionName:"Long Snapper",
             height:"", weight:"", classYear:"", hometown:{ city:"", state:"" } },
   "sparse athlete: no jersey/height/weight/class/hometown -> empty strings; position falls back to name");
eq(TeamOS.espn.roster({ athletes: [absherRaw(), absherRaw()] }).map(function (g) { return g.key + ":" + g.label + ":" + g.players.length; }),
   ["all:Roster:2"], "a flat athletes array becomes one group called Roster");
eq(TeamOS.espn.roster({}).map(function (g) { return g.key + ":" + g.players.length; }), ["all:0"], "no athletes -> one empty group");
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
var LG = ["id","date","timeSet","state","detail","venue","net","odds","home","away","mine","live"];
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
  eq(Object.keys(g.home), ["name","rank","score"], g.id + " home side is {name, rank, score}");
  eq(Object.keys(g.away), ["name","rank","score"], g.id + " away side is {name, rank, score}");
  // `net` is the broadcaster's own name and can legitimately be "ESPN"; test everything else
  ok(!LGLEAK.test(JSON.stringify(Object.assign({}, g, { net: "" }))), g.id + " carries no ESPN keys or names (outside the broadcaster's name)");
  ok(typeof g.id === "string", g.id + " id is a string (rows are keyed on it)");
});
var mia = lgById["401858226"], pitt = lgById["401858225"], uga = lgById["401858100"], pur = lgById["401858460"];
eq([mia.state, mia.timeSet, mia.detail, mia.venue], ["pre", true, "9/18 - 7:30 PM EDT", "Allegacy Federal Credit Union Stadium"], "future game: state, time, detail, venue");
eq([mia.away, mia.home], [{ name:"Miami", rank:5, score:"0" }, { name:"Wake Forest", rank:null, score:"0" }], "sides: ranked away, unranked home, scores as strings");
eq([mia.net, mia.odds, mia.mine, mia.live], ["ESPN", { line:"MIA -20.5", total:56.5 }, false, null], "broadcast from names[], odds, not ours, not live");
eq([pitt.state, pitt.live], ["in", { downDistance:"1st & 10 at PITT 20", lastPlay:"(03:28) #47 T.Woody kickoff 65 yards to the Pitt00 #24 T.Robinson return 20 yards to the Pitt20" }], "live game carries down/distance and last play");
eq([pitt.home.rank, pitt.away.rank], [null, null], "unranked on both sides (drives live-anywhere but not the ranked list)");
eq([uga.state, uga.home.score, uga.away.score, uga.home.rank, uga.away.rank], ["post", "31", "24", 2, 9], "final: scores and both ranks");
eq([pur.mine, pur.timeSet, pur.net, pur.away.rank], [true, false, "Peacock", 3], "the team's own game: mine, placeholder time, streaming-only broadcast");
eq(lgs.some(function (g) { return g.state === "in"; }), true, "live-anywhere is derivable from LeagueGame[]");
eq(lgs.filter(function (g) { return g.home.rank || g.away.rank; }).map(function (g) { return g.id; }),
   ["401858100","401858226","401858460"], "ranked games are the ones with a side rank");
eq(TeamOS.espn.scoreboard(null, TEAM_CONFIG), [], "no payload -> empty list");

// ---- rankings ----
var rkFixture = JSON.parse(read("tools/fixtures/espn-rankings.json"));
var POLL = ["key","label","name","asOf","ranks"], RANK = ["rank","team","record","previous","isNew","mine"];
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
eq(ap.ranks[0], { rank:1, team:"Texas", record:"2-0", previous:4, isNew:false, mine:false }, "moved up: previous kept");
eq(ap.ranks[2], { rank:3, team:"Notre Dame", record:"2-0", previous:1, isNew:false, mine:true }, "the team's own entry: mine");
eq([ap.ranks[3].previous, ap.ranks[3].isNew], [null, true], "previous 0 -> new to the poll");
eq([ap.ranks[4].previous, ap.ranks[4].isNew, ap.ranks[4].team], [null, false, "Volunteers"], "no previous -> null and not new; team name falls back through nickname/name/location");
eq(polls.some(function (p) { return p.label === "CFP"; }), false, "no CFP poll yet (the tab shows its note)");
eq(TeamOS.espn.rankings({}, TEAM_CONFIG), [], "no payload -> empty list");

// ---- game center ----
var GD = ["state","detail","home","away","lastPlay","winProb","linescore","teamStats","leaders","box","scoring"];
var SIDE = ["key","name","abbreviation","record","score","mine"];
var GDLEAK = /competitions|competitors|homeAway|shortDetail|situation|drives|winprobability|homeWinPercentage|linescores|boxscore|scoringPlays|athlete|displayValue|shortDisplayName|pickcenter|espn/i;
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
eq(gdLive.teamStats[0], { label:"Total yards", away:"148", home:"211", better:"home" }, "more yards is better");
eq(gdLive.teamStats[5], { label:"Turnovers", away:"0", home:"1", better:"away" }, "fewer turnovers is better");
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
eq(gdPost.leaders.away[4], { category:"Tackles", name:"M. Posa", line:"15" }, "leader category names are mapped, not ESPN's");
eq(TeamOS.espn.gameDetail({}, team, TEAM_CONFIG).state, "post", "an empty payload is treated as final (no polling)");
eq(TeamOS.espn.gameDetail({}, team, TEAM_CONFIG).home, { key:"", name:"TBA", abbreviation:"", record:"", score:null, mine:false }, "an empty side");

console.log("seasonStats()");
var stats = JSON.parse(read("tools/fixtures/espn-season-stats.json"));
var nd = TeamOS.espn.seasonStats(stats.teams["87"]);
eq(nd.map(function (r) { return r.label; }), ["Scoring offense","Total offense","Rushing offense","Passing offense","Scoring defense","Total defense","Turnover margin","Third down"], "the eight preview rows in order");
nd.forEach(function (r) { eq(Object.keys(r), ["label","value","rank","rankText"], r.label + " is a SeasonStat"); });
eq(nd[0], { label:"Scoring offense", value:"46.5", rank:21, rankText:"Tied-21st" }, "value, rank and ESPN's rank text from the first name it files the stat under");
eq(nd[4], { label:"Scoring defense", value:null, rank:null, rankText:null }, "a row the feed has no name for -> null value");
ok(!/splits|categories|rankDisplayValue|espn/i.test(JSON.stringify(nd)), "carries no ESPN keys or names");

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
   ["gameDetail","gameOdds","news","newsUrl","rankings","rankingsUrl","roster","rosterUrl","schedule","scheduleUrl","scoreboard","scoreboardUrl","seasonStats","seasonStatsUrl","summaryUrl","teamStatus","teamUrl"],
   "exactly the documented functions");

// ---- snapshot ownership: the same questions, two teams, two answers ----
console.log("teamos/snapshots.js");
var snapSrc = read("teamos/snapshots.js");
ok(!/\bfetch\s*\(/.test(snapSrc),                                        "does not call fetch()");
ok(!/\b(document|window|navigator|localStorage|caches)\b/.test(snapSrc),   "does not touch the DOM or browser storage");
ok(!/\bTEAM_ID\b|\bS\.\w|\bTEAM\b(?!_CONFIG)/.test(snapSrc), "does not read application globals (TEAM, TEAM_ID, S)");
ok(!/notre|irish|ohio|buckeye/i.test(snapSrc.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "")), "names no team in code");
eq(Object.keys(TeamOS.snapshots).sort(), ["get","owned"], "exactly the documented functions");

var osu = load("teams/ohio-state.js");
var ND = TeamOS.createTeam(TEAM_CONFIG.team), OSU = osu.TeamOS.createTeam(osu.TEAM_CONFIG.team);
var ndFiles = { depth: JSON.parse(read("depth.json")), history: JSON.parse(read("depth-history.json")),
                odds: JSON.parse(read("odds-history.json")), news: JSON.parse(read("news.json")) };

console.log(" notre-dame");
eq(TeamOS.snapshots.get(TEAM_CONFIG, "depth"),       { file:"depth.json", history:"depth-history.json", label:"UHND" }, "declares a depth chart");
eq(TeamOS.snapshots.get(TEAM_CONFIG, "oddsHistory"), { file:"odds-history.json" }, "declares an odds history");
eq(TeamOS.snapshots.get(TEAM_CONFIG, "beatNews"),    { file:"news.json" },         "declares beat news");
ok(TeamOS.snapshots.owned(ND, ndFiles.depth),   "owns the committed depth.json");
ok(TeamOS.snapshots.owned(ND, ndFiles.history), "owns the committed depth-history.json");
ok(TeamOS.snapshots.owned(ND, ndFiles.odds),    "owns the committed odds-history.json");
ok(TeamOS.snapshots.owned(ND, ndFiles.news),    "owns the committed news.json");
ok(ndFiles.depth.team == null && ndFiles.odds.team == null && ndFiles.news.team == null,
   "(the committed files carry no team field - ownership rests on the declaration; see decision 0008)");

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

// ---- app.js names no team, no colour, no team branch ----
console.log("app.js");
var js = read("app.js");
var jsBody = uncomment(js);
ok(!/#[0-9A-Fa-f]{6}\b/.test(jsBody), "carries no colour literal");
ok(!/notre dame|irish watch|fighting irish|ohio state|buckeye/i.test(jsBody), "names no team and no product");
ok(!/TEAM\.id\s*===|TEAM_CONFIG\.team\.id\s*===/.test(jsBody), "branches on no team id");
ok(/paintIdentity\(\);/.test(js), "applies identity once, in one place");
ok(!/\bnd\b/.test(jsBody), "no leftover nd identifier");


// ---- the Buckeye Watch test page ----
// buckeye.html is index.html with the team swapped: a different config script
// and the identity words that are visible before app.js runs. Nothing else may
// differ, or the two pages start drifting into two applications - so the check
// below neutralises exactly the identity and compares everything else byte for
// byte. Team selection proper, and what the worker should precache for it, is
// Phase 7; this page is a deployment convenience, not that.
console.log("buckeye.html");
var idx = read("index.html").replace(/\r\n/g, "\n");
var bw = read("buckeye.html").replace(/\r\n/g, "\n");

function skeleton(t) {
  return t
    .replace(/<!--[\s\S]*?-->/g, "")                                  // comments
    .slice(t.replace(/<!--[\s\S]*?-->/g, "").indexOf("</head>"))      // head is identity
    .replace(/<script src="teams\/[a-z-]+\.js" defer><\/script>/, '<script src="TEAM" defer></script>')
    .replace(/(<div class="brand-kicker">)[^<]*(<\/div>)/, "$1KICKER$2")
    .replace(/(<h1>)[^<]*(<\/h1>)/, "$1PRODUCT$2")
    .replace(/(<h2 class="sr-only" id="heroHead">)[^<]*(<\/h2>)/, "$1HERO$2")
    .replace(/(<h2 class="sr-only" id="dataHead">)[^<]*(<\/h2>)/, "$1DATA$2")
    .replace(/(<p class="motto" id="motto">)[^<]*(<\/p>)/, "$1MOTTO$2");
}
ok(skeleton(bw) === skeleton(idx),
   "identical to index.html below </head> once the team's own words are set aside");
ok(/<script src="teams\/ohio-state\.js" defer><\/script>/.test(bw), "loads the Ohio State config");
ok(/<script src="teams\/notre-dame\.js" defer><\/script>/.test(idx), "and index.html still loads Notre Dame's");

var bwHead = bw.slice(0, bw.indexOf("</head>")).replace(/<!--[\s\S]*?-->/g, "");
var bwVisible = bw.replace(/<!--[\s\S]*?-->/g, "");
ok(!/notre-dame|irish-watch/i.test(bwVisible), "references no Notre Dame file");
ok(!/Notre Dame|Irish Watch|Leave No Doubt/.test(bwVisible), "shows no Notre Dame words before a script runs");
ok(!/rel="icon"|apple-touch-icon|og:image|twitter:image|twitter:card/.test(bwHead),
   "declares no artwork tags, because Ohio State has no artwork");
ok(/<link rel="manifest" href="assets\/ohio-state\/manifest\.json">/.test(bwHead), "points at its own manifest");
ok(/<title>Buckeye Watch/.test(bwHead), "the tab says Buckeye Watch before any script runs");

console.log(" its manifest");
var osuMan = JSON.parse(read("assets/ohio-state/manifest.json"));
var ndMan = JSON.parse(read("assets/notre-dame/manifest.json"));
eq(osuMan.short_name, "Buckeye Watch", "short name");
eq(osuMan.start_url, "../../buckeye.html", "installing it opens Buckeye Watch, not the Notre Dame page");
eq(osuMan.icons, [], "no icons, because there is no approved artwork");
eq(ndMan.start_url, "../../", "Notre Dame's still opens the site root");
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
