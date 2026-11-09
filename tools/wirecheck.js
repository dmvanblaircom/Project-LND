#!/usr/bin/env node
/* The wire's groundwork (teamos/wire.js): the headline rule, the article
   key, the opponent lookup and game week. Not yet consumed by the page
   (decision 0043); this keeps it right until it is.

   The headlines are real ones from Suite's kept beat news (2026-09 to
   2026-11), except where the season has had none of a kind yet - draft
   picks, undrafted signings, portal entries - which are written in the
   form outlets use and marked "(form)".

   Usage:  node tools/wirecheck.js */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");
var root = path.join(__dirname, "..");
var failures = 0;
function ok(c, what) { console.log((c ? "  ok   " : "  FAIL ") + what); if (!c) failures++; }

var ctx = vm.createContext({});
["teams/index.js", "teamos/registry.js", "teamos/wire.js"].forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f });
});
var W = ctx.TeamOS.wire, REG = vm.runInContext("TEAM_REGISTRY", ctx);

function kindOf(t) { var c = W.classify(t); return c ? c.kind : null; }
function is(kind, list) {
  list.forEach(function (t) { var k = kindOf(t); ok(k === kind, (kind || "news") + ": \"" + t + "\"" + (k !== kind ? " (got " + k + ")" : "")); });
}

console.log("the taxonomy");
ok(JSON.stringify(W.KINDS) === JSON.stringify(["drafted", "suspension", "coaching", "transfer", "commitment", "availability", "injury"]),
   "seven kinds, most specific first; no surgery or return kind (David, 2026-11-09)");

console.log("injury: injuries, surgery, rehab");
is("injury", [
  "Ja’Kobi Jackson reportedly undergoes surgery",
  "Sayin reportedly had surgery to repair fractured elbow",
  "DaSaahn Brame Exits Tennessee vs. Kentucky Game With an Injury",
  "Ohio State QB Julian Sayin leaves Indiana game with injury, goes to locker room",
  "Pitt QB Mason Heintschel Actually Suffered Two Serious Injuries",
  "Javari Barnett exits field on cart after leg injury",
  "Clemson Defensive Lineman Medically Retires After Six Seasons"
]);

console.log("availability: out, questionable, doubtful, ruled out, and returns");
is("availability", [
  "Texas edge Colin Simmons ruled out vs. Mississippi State",
  "Ian Moore questionable for Buckeyes vs. Oregon",
  "Trio of Buckeyes starters downgraded to doubtful vs. Maryland",
  "Ohio State WR Brock Boyd is game-time decision for Indiana clash",
  "Kentucky RB CJ Baxter Expected to Play vs. Tennessee",
  "Mizzou RB Ahmad Hardy to return to practice, per Eli Drinkwitz",
  "Ryan Coleman-Williams back from injury in LSU-Alabama game",
  "Hollywood Smothers, Cam Coleman removed from Thursday injury report",
  "Mississippi State QB Kamario Taylor Out for Season in Crushing Blow to Bulldogs"
]);

console.log("one kind per headline: the more specific status wins");
is("availability", [
  "Iowa running back Kamari Moulton out for season with injury",
  "Texas running back Hollywood Smothers to miss remainder of season with MCL tear",
  "FSU Football Star Duce Robinson Suffers Season-Ending Injury"
]);
is("injury", ["Cason Wallace to undergo surgery to repair torn labrum"]);
is("suspension", ["Jeramiah McCloud suspended: Florida-Oklahoma availability report"]);
is("coaching", ["Report: K.C. Keeler dismisses Cedric Calhoun, strips Brian L. Smith of play-calling"]);

console.log("suspension: suspended and reinstated");
is("suspension", ["Gators DL Suspended for Oklahoma Matchup", "Linebacker reinstated after two-game suspension (form)"]);

console.log("coaching: fired, hired, interim, coordinators, extensions");
is("coaching", [
  "Baylor fires head coach Dave Aranda",
  "FSU fires Mike Norvell, names Rick Stockstill interim head coach",
  "Dana Holgorsen Fired as Nebraska’s Offensive Coordinator",
  "Purdue parts ways with DC Kevin Kane",
  "Oregon Relieves Offensive Coordinator Mehringer of Duties",
  "Oklahoma Officially Names Jason Witten as Interim Offensive Coordinator",
  "Head coach signs contract extension through 2031 (form)"
]);

console.log("transfer: the portal, and a transfer's commitment");
is("transfer", [
  "Former Texas A&M LB Enters Transfer Portal After Leaving Program",
  "Starting safety withdraws from the transfer portal, returns to Wildcats (form)",
  "Portal QB commits to Notre Dame over Michigan (form)"
]);

console.log("commitment: commits, decommits, flips");
is("commitment", [
  "Three-star EDGE RJ Hudson commits to Texas",
  "2027 three-star OL Sidney Rouleau decommits from Michigan Football",
  "Oklahoma State flips 2027 Stillwater LB Bryson Brown from Baylor",
  "Iowa State earns commitment from EDGE Ty Tautolo",
  "Louisville Flips 2027 Boston College Commit"
]);

console.log("drafted: a pick, or an undrafted free agent's signing");
is("drafted", [
  "Notre Dame RB selected 12th overall in the NFL Draft (form)",
  "Buckeyes linebacker drafted in the third round by the Steelers (form)",
  "Irish safety signs with the Bears as an undrafted free agent (form)"
]);

console.log("analysis is not news: a headline that discusses a change is not a wire item");
is(null, [
  "What Toney's injury means for the Irish",
  "Malachi Toney injury gives Notre Dame exactly the kind of CFP problem it doesn’t need",
  "With Julian Sayin sidelined, it’s time for Ohio State’s defense to take center stage",
  "Five Players Who Must Step Up For Ohio State If Julian Sayin Misses the Rest of the Season",
  "The Hidden Impact of Oregon Receiver Jeremiah McClellan’s Return From Injury",
  "Kyle Whittingham explains why he fired Michigan Football OC Jason Beck",
  "Survey Results: 96% of fans want Michigan OC Jason Beck fired",
  "Ryan Day should resign from his position tonight",
  "Ohio State 2027 RB target set to commit on Saturday",
  "Amir Moore remains committed to NC State but watching coaching search",
  "Colorado football: A look at Buffs' 2027 recruiting after two decommits",
  "Will Jason Witten Lean More on Kevin Wilson as Oklahoma's Interim OC?",
  "Grading Texas' 2026 Portal Class: Who Has Delivered and Who Hasn't?",
  "Every Buckeye Who Could Get Drafted in 2027"
]);

console.log("words that look like a status but are not one");
is(null, [
  "5 Questionable Decisions That Defined Dave Aranda's Baylor Tenure",
  "3 Texas A&M Players Who Stood Out vs. South Carolina",
  "Notre Dame Game Balls: Luke Talich, Jaden Greathouse, Nolan James Jr. stand out for Irish",
  "Spartan Nation Absolutely Fired Up After Defeating Michigan",
  "TIGER TALK REVIEW: It's Ole Miss Week!",
  "Football: Michael Desormeaux Media Availability - The Southern Miss Game",
  "Kirk Ferentz Named Dodd Trophy Coach of the Week",
  "Rockwood named Big 12 Coach of the Year; nine Cougars earn All-Big 12 honors",
  "ECU, Coastal Carolina Announce Football Series Extension Through 2034",
  "Oregon State Star Freshman Jesse Legree Commits To Beavers Through 2027-2028 Season",
  "Penn State Commits in Action: Playoffs Kicking Off",
  "Gameday Availability Report"
]);

console.log("not this team's college football: the NFL and other sports");
is(null, [
  "Vols in the NFL: Dylan Sampson returns to action for Cleveland Browns",
  "Newsstand: Former Notre Dame players sign with new NFL teams",
  "Notre Dame Women’s Basketball: 5-Star Guard Avery Arije commits to the Irish",
  "Former ASU Star, First Round Draft Pick Jordyn Tyson Returns to New Orleans Saints' Practice in Injury Recovery"
]);

console.log("the headline is the outlet's: classify() reads it and changes nothing");
var story = Object.freeze({ title: "Iowa star RB ruled out for season ahead of Badgers showdown", link: "https://example.com/a?utm_source=rss", source: "Outlet" });
var c = W.classify(story.title), it = W.item(story, c.kind, "opponent");
ok(c.kind === "availability" && c.cue === "ruled out", "the kind and the words that decided it (" + JSON.stringify(c) + ")");
ok(it.story === story && it.story.title === "Iowa star RB ruled out for season ahead of Badgers showdown" && it.side === "opponent", "a wire item wraps the story as it came: same object, same headline");
ok(W.item(story, "surgery", "team") === null && W.item(null, "injury") === null, "no item for a kind outside the taxonomy, or for no story");
ok(W.classify("") === null && W.classify(null) === null && W.classify(42) === null, "nothing to read, nothing tagged");

ok((W.classify("Malachi Toney Set to Undergo Surgery, Missing Notre Dame and Potentially the Rest of the Regular Season") || {}).kind === "availability",
   "surgery reported with the absence it causes: availability, by the precedence (Codex, #244)");
ok((W.classify("Miami WR Malachi Toney to undergo ankle surgery") || {}).kind === "injury", "surgery alone stays injury");

// Codex review, 2026-11-09: game recaps, schedules, tickets and honours that
// merely share a word with a status change are not wire items.
["Riley Leonard fires three touchdown passes as Notre Dame routs Navy",
 "Notre Dame will play Ohio State in 2027 season opener",
 "Notre Dame expected to play in Orange Bowl",
 "Tickets available for Notre Dame vs. Navy in Baltimore",
 "Linebacker named team captain by head coach Marcus Freeman"].forEach(function (h) {
  ok(W.classify(h) === null, "not a wire item: \"" + h + "\" (got " + JSON.stringify(W.classify(h)) + ")");
});
[["Iowa fires offensive coordinator Brian Ferentz", "coaching"], ["Iowa names Tim Lester offensive coordinator", "coaching"],
 ["Tim Lester named offensive coordinator by Iowa", "coaching"],
 ["Star RB expected to play Saturday despite ankle injury", "availability"]].forEach(function (x) {
  ok((W.classify(x[0]) || {}).kind === x[1], x[1] + " still: \"" + x[0] + "\"");
});

console.log("the article key");
var k = W.key("https://www.slapthesign.com/notre-dame-x?utm_source=RSS&utm_medium=feed#comments");
ok(k === "slapthesign.com/notre-dame-x", "tracking, fragment and www. dropped (" + k + ")");
ok(W.key("https://slapthesign.com/notre-dame-x/") === k && W.key("HTTP://SlapTheSign.com/notre-dame-x?fbclid=abc") === k, "the same article shared three ways is one key");
ok(W.key("https://site.com/Story/1") !== W.key("https://site.com/story/1"), "the path keeps its case: /Story/1 and /story/1 can be two articles (Codex, #244)");
ok(W.key("https://site.com/story?id=12&utm_campaign=x") === "site.com/story?id=12" && W.key("https://site.com/story?id=13") !== W.key("https://site.com/story?id=12"),
   "a parameter that names the article is kept; two articles stay two");
ok(W.key("https://a.com/one") !== W.key("https://a.com/two") && W.key("https://a.com/x") !== W.key("https://b.com/x"), "different paths or sites, different keys");
ok(W.key("javascript:alert(1)") === null && W.key("") === null && W.key(null) === null && W.key("/relative/path") === null, "not a web address: no key");

console.log("the opponent, from its provider id");
var all = REG.filter(function (t) { return t.providerId; });
var found = all.filter(function (t) { var o = W.opponentOf(t.providerId, REG); return o && o.id === t.id && o.providerId === String(t.providerId); });
ok(all.length === REG.length && found.length === all.length, "every one of the " + REG.length + " programs in the registry is found by its provider id (" + found.length + ")");
ok(W.opponentOf(87, REG).id === "notre-dame", "a numeric id works too");
var fcs = W.opponentOf("999999", REG);
ok(fcs && fcs.id === null && fcs.providerId === "999999", "an opponent Suite does not carry (most FCS): no id, the provider's news only");
ok(W.opponentOf("", REG) === null && W.opponentOf(null, REG) === null && W.opponentOf("abc", REG) === null, "no id, no opponent");
ok(W.opponentOf("87", null).id === null, "no registry: not found, nothing thrown");

console.log("game week: from the previous game's final until the next kickoff");
function g(id, date, state, opp, status) { return { id: id, date: date, state: state, status: status || (state === "post" ? "final" : state === "in" ? "live" : "scheduled"), oppProviderId: opp }; }
var season = [
  g("1", "2026-09-05T23:30:00Z", "post", "100"),
  g("2", "2026-09-12T19:30:00Z", "post", "200"),
  g("3", "2026-09-26T23:30:00Z", "pre", "300"),          // after a bye
  g("4", "2026-10-03T19:30:00Z", "pre", "400")
];
var wk = W.gameWeek(season, "2026-09-20T12:00:00Z");
ok(wk && wk.gameId === "3" && wk.opponentProviderId === "300" && wk.from === Date.parse("2026-09-12T19:30:00Z") && wk.to === Date.parse("2026-09-26T23:30:00Z"),
   "between a final and the next kickoff, a bye week included: the next opponent, from the last game to kickoff");
var first = [g("1", "2026-09-05T23:30:00Z", "pre", "100"), g("2", "2026-09-12T19:30:00Z", "pre", "200")];
var fw = W.gameWeek(first, "2026-08-20T12:00:00Z");
ok(fw && fw.gameId === "1" && fw.from === null, "before the first game: game week runs from the season's start (from: null)");
ok(W.gameWeek([g("1", "2026-09-05T23:30:00Z", "in", "100"), g("2", "2026-09-12T19:30:00Z", "pre", "200")], "2026-09-05T23:50:00Z") === null,
   "a game under way: it has kicked off, so no game week");
ok(W.gameWeek([g("1", "2026-09-05T23:30:00Z", "post", "100")], "2026-09-06T12:00:00Z") === null, "the season over: none");
ok(W.gameWeek([g("1", "2026-09-05T23:30:00Z", "post", "100"), g("2", "2026-09-12T19:30:00Z", "pre", "200", "canceled"), g("3", "2026-09-19T19:30:00Z", "pre", "300")], "2026-09-08T12:00:00Z").gameId === "3",
   "a canceled game is no one's game week");
ok(W.gameWeek([g("1", "2026-09-12T19:30:00Z", "pre", null)], "2026-09-08T12:00:00Z") === null, "an opponent not yet known: none");
ok(W.gameWeek([], "2026-09-08T12:00:00Z") === null && W.gameWeek(null) === null && W.gameWeek(season, "not a date") === null, "no schedule, no game week");
ok(W.gameWeek(season.slice().reverse(), "2026-09-20T12:00:00Z").gameId === "3", "the schedule's order does not matter");

console.log("groundwork only: the page does not load it");
ok(fs.readFileSync(path.join(root, "index.html"), "utf8").indexOf("teamos/wire.js") === -1 &&
   fs.readFileSync(path.join(root, "sw.js"), "utf8").indexOf("teamos/wire.js") === -1,
   "teamos/wire.js is in neither index.html nor the service worker's shell");

console.log("");
if (failures) { console.log(failures + " check(s) FAILED"); process.exit(1); }
console.log("the wire's rule, key, opponent and game week hold");
