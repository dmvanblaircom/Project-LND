#!/usr/bin/env node
/* Recruiting classes and NFL draft prospects (W16): ESPN, chosen by David
   on 2026-10-03.

   The real captures (tools/fixtures/espn-recruits-*.json,
   espn-draftboard-*.json, espn-draftrounds-2026.json, espn-nflteams-*.json)
   go through the real producer (tools/producers/prospects.py) into the
   snapshots the app would read, and then through TeamOS.prospects - so a
   fixture cannot drift from what the producer writes. Then the cases a
   capture does not show: a flipped commitment, an undecided recruit, a mixed
   class, a duplicate, a board ESPN reshaped, another team's snapshot.

   Usage: node tools/prospectscheck.js     (needs python3; exit 1 on failure) */
"use strict";
var fs = require("fs"), os = require("os"), path = require("path"), vm = require("vm"), cp = require("child_process");
var root = path.join(__dirname, "..");
function read(p) { return fs.readFileSync(path.join(root, p), "utf8"); }

var failures = 0;
function ok(cond, what) { if (cond) { console.log("  ok   " + what); return; } failures++; console.log("  FAIL " + what); }
function eq(a, b, what) {
  var same = JSON.stringify(a) === JSON.stringify(b);
  ok(same, what + " = " + JSON.stringify(b) + (same ? "" : " (got " + JSON.stringify(a) + ")"));
}

// The producer's normalize functions, run by python on a fixture (or a
// changed copy of one). Returns the snapshot, or {refused: reason}.
var tmp = fs.mkdtempSync(path.join(os.tmpdir(), "prospects-"));
var PY = [
  "import json,sys",
  "sys.path.insert(0, sys.argv[1])",
  "import prospects as P",
  "kind, src, arg = sys.argv[2], json.load(open(sys.argv[3])), sys.argv[4]",
  "extra = json.loads(sys.argv[5])",
  "try:",
  "    if kind == 'recruits': out = P.normalize_class(src, arg)",
  "    else:",
  "        rounds = json.load(open(extra['rounds'])) if extra.get('rounds') else None",
  "        names = None",
  "        if extra.get('teams'):",
  "            t = json.load(open(extra['teams']))",
  "            names = {str(x['team']['id']): x['team'].get('displayName') for s in t.get('sports') or [] for lg in s.get('leagues') or [] for x in lg.get('teams') or []}",
  "        out = P.normalize_board(src, int(arg), rounds, names)",
  "except P.Refused as e:",
  "    out = {'refused': str(e)}",
  "print(json.dumps(out))"
].join("\n");
var n = 0;
function produce(kind, payload, arg, extra) {
  var file = path.join(tmp, "in" + (n++) + ".json");
  fs.writeFileSync(file, JSON.stringify(payload));
  var r = cp.spawnSync("python3", ["-c", PY, path.join(root, "tools", "producers"), kind, file, String(arg), JSON.stringify(extra || {})], { encoding: "utf8" });
  if (r.status !== 0) { console.log(r.stderr); throw new Error("producer crashed"); }
  return JSON.parse(r.stdout);
}
function fixture(name) { return JSON.parse(read("tools/fixtures/" + name)); }
function copy(o) { return JSON.parse(JSON.stringify(o)); }
var fx = function (name) { return path.join(root, "tools", "fixtures", name); };

function teamContext(file) {
  var ctx = vm.createContext({});
  ["teamos/prospects.js", file].forEach(function (f) { vm.runInContext(read(f), ctx, { filename: f }); });
  return ctx;
}
var ndc = teamContext("teams/notre-dame.js"), osuc = teamContext("teams/ohio-state.js");
var P = ndc.TeamOS.prospects, ND = ndc.TEAM_CONFIG, OSU = osuc.TEAM_CONFIG;

// --- recruits ---------------------------------------------------------------
console.log("recruiting classes: the producer, on real ESPN records");
var nd27raw = fixture("espn-recruits-nd-2027.json");
var nd27 = produce("recruits", nd27raw, "87");
var osu27 = produce("recruits", fixture("espn-recruits-osu-2027.json"), "194");
var nd26 = produce("recruits", fixture("espn-recruits-nd-2026.json"), "87");
eq([nd27.classYear, nd27.recruits.length, nd27.committedElsewhere], [2027, 23, 0], "Notre Dame 2027: the class, every recruit committed here");
eq([osu27.classYear, osu27.recruits.length, osu27.committedElsewhere], [2027, 19, 0], "Ohio State 2027");
eq([nd26.classYear, nd26.recruits.length], [2026, 36], "Notre Dame's 2026 class, by its season's path");
ok(nd26.recruits.every(function (r) { return r.status === "Signed"; }), "a past class reads Signed; this year's reads Verbal");
eq([nd27.recruits[0].name, nd27.recruits[0].grade, nd27.recruits[0].rank, nd27.recruits[0].position], ["Albert Simien", 88, 26, "OG"],
   "best grade first, not ESPN's list order");
ok(nd27.recruits.every(function (r, i, a) { return i === 0 || (a[i - 1].grade || 0) >= (r.grade || 0); }), "ordered by grade");
eq([osu27.recruits[0].name, osu27.recruits[0].grade, osu27.recruits[0].rank], ["D.J. Jacobs", 92, 2], "Ohio State's top recruit");
ok(osu27.recruits.some(function (r) { return r.rank === null; }), "a recruit ESPN has not ranked nationally keeps rank null, not 0");
var ls = nd27.recruits.filter(function (r) { return r.position === "LS"; })[0];
ok(ls && ls.grade === 44 && ls.rank === null, "a long snapper's low grade is ESPN's number, kept as is");
ok(!JSON.stringify(nd27).match(/analysis|address1|zipCode/), "no ESPN prose and no street addresses in the snapshot");

console.log("whose class a recruit is in");
var other = produce("recruits", nd27raw, "194");
eq([other.recruits.length, other.committedElsewhere], [0, 23], "listed under another team, no recruit is claimed: appearing among his schools means nothing");
var flip = copy(nd27raw), who = flip.items[0];
who.schools.forEach(function (s) {
  if (s.status.description === who.status.description) s.status.description = "Undecided";
});
who.schools[0].status.description = who.status.description;     // now committed to schools[0], not Notre Dame
var flipped = produce("recruits", flip, "87");
eq([flipped.recruits.length, flipped.committedElsewhere], [22, 1], "a recruit whose commitment points elsewhere is left out and counted");
var und = copy(nd27raw); und.items[0].status.description = "Undecided";
eq(produce("recruits", und, "87").recruits.length, 22, "an undecided recruit is in nobody's class");
var mixed = copy(nd27raw); mixed.items[1].recruitingClass = 2026;
ok(/more than one class/.test(produce("recruits", mixed, "87").refused || ""), "a mix of class years is refused");
var dup = copy(nd27raw); dup.items.push(dup.items[0]);
ok(/twice/.test(produce("recruits", dup, "87").refused || ""), "a recruit listed twice is refused");
ok(/no items/.test(produce("recruits", { count: 3 }, "87").refused || ""), "a payload without its list is refused");

console.log("recruiting classes: TeamOS");
var c = P.recruits(nd27, ND);
eq([c.classYear, c.total, c.label], [2027, 23, "ESPN recruiting"], "Notre Dame's class, credited to ESPN");
eq([c.recruits[0].name, c.recruits[0].hometown, c.recruits[0].highSchool], ["Albert Simien", "Lake Charles, LA", "Sam Houston High School"],
   "name, hometown and high school");
eq(P.recruits(nd27, OSU), null, "Ohio State never shows Notre Dame's class");
eq(P.recruits(osu27, OSU).total, 19, "Ohio State shows its own");
eq(P.recruits(null, ND), null, "no snapshot: null");
eq(P.recruits({ source: "fpi", teamId: "87", recruits: [] }, ND), null, "another source's file: null");
var empty = P.recruits({ source: "espn-recruiting", teamId: "87", classYear: 2028, recruits: [] }, ND);
eq([empty.total, empty.classYear], [0, 2028], "a class with no commits yet is an empty class, not a failure");

// --- draft ------------------------------------------------------------------
console.log("the draft board: the producer, on real ESPN records");
var board = produce("draft", fixture("espn-draftboard-2027-oct3.json"), 2027);
eq([board.year, board.prospects.length, board.drafted], [2027, 50, 0], "the 2027 board as of Oct 3: 50 prospects, none drafted");
ok(board.prospects.every(function (p) { return p.grade === null && p.pick === null; }), "no grade yet and no pick: none invented");
eq(board.prospects.slice(0, 3).map(function (p) { return p.overall; }), [1, 2, 3], "in ESPN's overall order");
eq([board.prospects[0].name, board.prospects[0].collegeId, board.prospects[0].positionRank], ["Jeremiah Smith", "194", 1],
   "each prospect's college by ESPN team id, and position rank");
var drafted = produce("draft", fixture("espn-draftboard-2026-final.json"), 2026,
                      { rounds: fx("espn-draftrounds-2026.json"), teams: fx("espn-nflteams-2026-oct3.json") });
eq([drafted.prospects.length, drafted.drafted], [40, 40], "2026, after the draft: every prospect captured was picked");
var reese = drafted.prospects.filter(function (p) { return p.name === "Arvell Reese"; })[0];
eq([reese.grade, reese.overall, reese.pick.round, reese.pick.pick, reese.pick.overall, reese.pick.nflTeam],
   [92, 1, 1, 5, 5, "New York Giants"], "ESPN's grade and board rank, then the real pick and team");
var noRounds = produce("draft", fixture("espn-draftboard-2026-final.json"), 2026);
eq(noRounds.drafted, 0, "without the rounds list, no pick is guessed");
var reshaped = copy(fixture("espn-draftboard-2027-oct3.json"));
reshaped.items.forEach(function (p) { p.attributes = p.attributes.filter(function (a) { return a.name !== "overall"; }); });
ok(/overall rank/.test(produce("draft", reshaped, 2027).refused || ""), "a board with no overall ranks (ESPN reshaped it) is refused");
var dupb = copy(fixture("espn-draftboard-2027-oct3.json")); dupb.items.push(dupb.items[3]);
ok(/twice/.test(produce("draft", dupb, 2027).refused || ""), "a prospect listed twice is refused");

console.log("the draft: TeamOS");
var nb = P.draft(board, ND);
eq([nb.phase, nb.year, nb.total, nb.label], ["board", 2027, 6, "ESPN draft board"], "Notre Dame on the 2027 board");
eq(nb.prospects.map(function (p) { return p.overall; }), [2, 22, 26, 47, 48, 49], "its prospects in board order");
eq([nb.prospects[0].name, nb.prospects[0].position, nb.prospects[0].positionRank, nb.prospects[0].grade, nb.prospects[0].pick],
   ["Leonard Moore", "CB", 1, null, null], "rank shown, grade null until ESPN publishes, no projected pick");
eq(P.draft(board, OSU).total, 2, "Ohio State's two");
var od = P.draft(drafted, OSU);
eq(od.phase, "drafted", "once picks are made, the draft's results");
eq(od.prospects.map(function (p) { return p.pick.overall; }), [4, 5, 7, 11, 36], "Ohio State's picks in draft order");
eq([od.prospects[0].name, od.prospects[0].pick.round, od.prospects[0].pick.pick], ["Carnell Tate", 1, 4], "round and pick");
ok(od.prospects.every(function (p) { return p.pick.team; }), "every pick names its NFL team");
var half = copy(drafted); half.prospects.forEach(function (p) { if (p.collegeId === "194" && p.name === "Caleb Downs") p.pick = null; });
var hd = P.draft(half, OSU);
eq(hd.prospects[hd.prospects.length - 1].name, "Caleb Downs", "after the draft, an undrafted player is listed last");
eq(P.draft(null, ND), null, "no snapshot: null");
eq(P.draft({ source: "espn-recruiting", prospects: [] }, ND), null, "another source's file: null");
eq(P.draft(board, { sources: {} }), null, "a team without an ESPN id: null");

console.log("TeamOS.prospects names no team");
var src = read("teamos/prospects.js").replace(/\/\*[\s\S]*?\*\//g, "");
ok(!/notre|irish|ohio|buckeye|\b87\b|\b194\b/i.test(src), "no team name or id in teamos/prospects.js");

fs.rmSync(tmp, { recursive: true, force: true });
console.log("\n" + (failures ? failures + " check(s) FAILED" : "recruits and prospects are ESPN's, shaped, never invented"));
process.exit(failures ? 1 : 0);
