#!/usr/bin/env node
/* Is there exactly one list of teams, and does it match what is on disk?

   teams/index.js is the canonical registry (decision 0014). A program is
   selectable because it names a config, and for no other reason - there is no
   availability flag to forget and no second list to drift. That only holds if
   something checks it, because the two ways it breaks are both silent: a
   registry row naming a config that does not exist (a team offered that cannot
   load), and a config on disk nobody named (a team built that nobody can
   reach).

   Usage:  node tools/registrycheck.js
   Exit status is 1 if anything fails, so it can gate a push. */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");

var root = path.join(__dirname, "..");
function read(p) { return fs.readFileSync(path.join(root, p), "utf8"); }

var failures = 0;
function ok(cond, what) {
  if (cond) { console.log("  ok   " + what); return; }
  failures++; console.log("  FAIL " + what);
}
function eq(a, b, what) { ok(JSON.stringify(a) === JSON.stringify(b), what + " = " + JSON.stringify(b)); }

var ctx = vm.createContext({});
["teams/index.js", "teamos/registry.js"].forEach(function (f) {
  vm.runInContext(read(f), ctx, { filename: f });
});
var REG = ctx.TeamOS.registry.create(ctx.TEAM_REGISTRY);

// ---- source hygiene ----
console.log("teamos/registry.js");
var src = read("teamos/registry.js");
function uncomment(s) { return s.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ""); }
ok(!/\bfetch\s*\(/.test(src), "does not call fetch()");
ok(!/\b(document|window|navigator|localStorage|caches)\b/.test(src), "does not touch the DOM or browser storage");
ok(!/notre|irish|ohio|buckeye|indiana|byu/i.test(uncomment(src)), "names no team in code");
ok(!/espn|kalshi/i.test(uncomment(src)), "names no provider");
eq(Object.keys(ctx.TeamOS.registry).sort(), ["ID", "create"], "exactly the documented exports");

// ---- the registry and the file system agree ----
console.log("teams/index.js");
var onDisk = fs.readdirSync(path.join(root, "teams"))
  .filter(function (f) { return /\.js$/.test(f) && f !== "index.js"; })
  .map(function (f) { return f.replace(/\.js$/, ""); }).sort();

var named = REG.available().map(function (t) { return t.id; }).sort();
eq(named, onDisk, "every selectable team has a config on disk, and every config is offered");

REG.all().forEach(function (t) {
  if (!t.config) return;
  ok(fs.existsSync(path.join(root, t.config)), t.id + " names a config that exists: " + t.config);
  eq(t.config, "teams/" + t.id + ".js", t.id + "'s config is at the path its id implies");
});

console.log(" availability is derived, never declared");
// The whole point. If a row could say available:true, the two could disagree.
ok(!/available\s*:/.test(read("teams/index.js")),
   "no row carries an availability flag - naming a config is what makes a team selectable");
eq(REG.get("notre-dame").available, true, "Notre Dame is selectable");
eq(REG.get("ohio-state").available, true, "Ohio State is selectable");
eq(REG.get("indiana").available, false, "Indiana is known but not selectable");
eq(REG.get("byu").available, false, "BYU is known but not selectable");
eq(REG.isAvailable("indiana"), false, "and the registry says so when asked directly");
eq(REG.configFor("indiana"), null, "a team with no config has no config path");
ok(REG.all().length > REG.available().length, "the registry is larger than what is selectable, as it should be");

console.log(" a row that is not a team is dropped, not thrown on");
var messy = ctx.TeamOS.registry.create([
  { id: "good", name: "Good" },
  { id: "Bad Caps", name: "Nope" },              // an id becomes a file path
  { id: "../escape", name: "Nope" },
  { id: "noname" },                              // no name
  { id: "good", name: "Duplicate" },             // second row for the same id
  null, "not an object", { }
]);
eq(messy.all().map(function (t) { return t.id; }), ["good"], "only the well-formed row survives");
eq(messy.get("good").name, "Good", "and it is the first one, not the duplicate");
eq(messy.get("good").short, "Good", "short falls back to the name");
eq(messy.get("good").conference, "Independent", "and a team with no conference is independent");
eq(ctx.TeamOS.registry.create(null).all(), [], "no registry at all is an empty one, not a crash");

console.log(" ids match what the boot script will accept");
// The boot script shape-checks ?team= before it becomes a file path. If the
// registry allowed an id the boot script refuses, that team could be listed
// and then never open.
var bootId = (read("index.html").match(/var ID\s*=\s*(\/[^/]+\/)/) || [])[1];
ok(!!bootId, "the boot script states the id shape it accepts");
eq(bootId, String(ctx.TeamOS.registry.ID), "and it is the same shape the registry enforces");
REG.all().forEach(function (t) {
  ok(ctx.TeamOS.registry.ID.test(t.id), t.id + " is an id the boot script would accept");
});

console.log(" sorted for a chooser")
// Structural, not a fixed list: teams/index.js is generated (decision 0017)
// and its contents change every time FBS does. Asserting the 2026 alignment
// here would be the hand-maintained copy that change removes.
var sorted = REG.sorted();
eq(sorted.length, REG.all().length, "sorted() returns every program");
ok(sorted.map(function (t) { return t.id; }).sort().join(",") ===
   REG.all().map(function (t) { return t.id; }).sort().join(","), "and the same ones");
var names = sorted.map(function (t) { return t.name; });
ok(JSON.stringify(names) === JSON.stringify(names.slice().sort(function (a, b) {
     return a.localeCompare(b, "en", { sensitivity: "base" });
   })), "in one A-Z run, " + names[0] + " to " + names[names.length - 1]);
// The reason it is localeCompare and not `<`: byte order puts an accented or
// lower-cased name where nobody would look for it, and this roster has both.
var odd = ctx.TeamOS.registry.create([
  { id: "zulu", name: "Zulu" }, { id: "alpha", name: "alpha" },
  { id: "san-jose", name: "San José State" }, { id: "san-diego", name: "San Diego State" }
]).sorted().map(function (t) { return t.name; });
eq(odd, ["alpha", "San Diego State", "San José State", "Zulu"],
   "case and accents sort where a reader expects them, not where their bytes fall");

console.log(" the conference every program carries");
// The chooser prints conference on each program and searches it, so a blank
// one is a program a fan cannot find by conference.
ok(REG.all().every(function (t) { return t.conference; }),
   "every program has a conference - the generator reads it from the standings");
var confs = {};
REG.all().forEach(function (t) { confs[t.conference] = (confs[t.conference] || 0) + 1; });
ok(Object.keys(confs).length >= 8, "the roster spans the conferences FBS has");
ok(confs["Independent"] !== REG.all().length,
   "not everything fell back to Independent, which is what a failed parse looks like");

console.log("the generator");
// teams/index.js is generated (decision 0017). The two things that must hold:
// it preserves what only a person can know, and it derives what only the
// repository can know.
var gen = read("tools/build-registry.js");
ok(!/\bfetch\s*\(/.test(gen) && !/https?:\/\//.test(gen.replace(/\/\*[\s\S]*?\*\//g, "")),
   "the generator makes no network request of its own - the Action fetches");
ok(/configOnDisk/.test(gen) && /fs\.existsSync/.test(gen),
   "it reads the filesystem to decide availability, rather than being told");
ok(/conference/.test(gen) && /t\.conference \|\| null/.test(gen),
   "and it carries an existing conference through rather than blanking it");

// Run it for real against a miniature standings page and read the result back.
var os = require("os");
var tmp = fs.mkdtempSync(path.join(os.tmpdir(), "reg-"));
function page(groups) {
  var p = path.join(tmp, "s.html");
  fs.writeFileSync(p, "<html><script>window['__espnfitt__'] = " +
    JSON.stringify({ page: { content: { standings: { groups: { groups: groups } } } } }) +
    ";</script></html>");
  return p;
}
function team(id, location) {
  return { team: { id: String(id), location: location, shortDisplayName: "Nickname", abbrev: "ABC" } };
}
// Enough conferences and programs to clear the generator's own floors, one of
// them nested in divisions the way the Sun Belt is on the real page.
var conf = [];
for (var i = 0; i < 10; i++) {
  var teams = [];
  for (var j = 0; j < 12; j++) teams.push(team(9000 + i * 100 + j, "Prog " + i + "" + j));
  conf.push({ name: "Conference " + i, standings: teams });
}
conf.push({ name: "FBS Independents", children: [
  { name: "East", standings: [ team("87", "Notre Dame") ] },
  { name: "West", standings: [ team("7777", "Somewhere") ] } ] });

var cp = require("child_process");
var run = cp.spawnSync(process.execPath,
  [path.join(root, "tools", "build-registry.js"), page(conf)], { encoding: "utf8" });
eq(run.status, 0, "it runs clean on a well-formed standings page");
ok(/var TEAM_REGISTRY/.test(run.stdout), "and emits a registry");

var gctx = vm.createContext({});
vm.runInContext(run.stdout, gctx, { filename: "generated" });
var G = ctx.TeamOS.registry.create(gctx.TEAM_REGISTRY);
ok(G.all().length >= REG.all().length, "the roster is a union - nothing already known is dropped");
eq(G.get("notre-dame").config, "teams/notre-dame.js",
   "a config is filled in because the file is on disk");
eq(G.get("notre-dame").conference, "FBS Independents",
   "a conference nested inside divisions is still read");
eq(G.get("somewhere").available, false, "a program with no config is not selectable");
ok(G.all().every(function (t) { return t.conference; }), "every generated row carries a conference");
eq(G.get("prog-00") && G.get("prog-00").conference, "Conference 0",
   "and it is the conference the page put it under");

console.log(" the id a program gets");
// An id becomes teams/<id>.js and a ?team= value, so it has to be the
// spelling a person would type. Both of these were wrong once: the accent
// took the whole letter with it, and the ampersand was spelled out.
//
// These are programs the registry has NEVER seen. That matters: the union
// preserves `name` for an id it already knows, so running the real roster
// through here would prove only that preservation works, never that a fresh
// parse keeps its characters. Every one of these is invented.
var novel = [["1", "K\u0101\u02bbu State"], ["2", "C\u00f3rdoba Tech"],
             ["3", "Denver (CO)"], ["4", "Smith & Wesson A&M"],
             ["5", "O'Fallon"], ["6", "Saint-Denis"]];
var spell = cp.spawnSync(process.execPath,
  [path.join(root, "tools", "build-registry.js"),
   page(conf.concat([{ name: "Spelling", standings: novel.map(function (n) {
     return team(n[0], n[1]);
   }) }]))], { encoding: "utf8" });
var sctx = vm.createContext({});
vm.runInContext(spell.stdout || "var TEAM_REGISTRY=[]", sctx, { filename: "spelled" });
var byName = {}, byId = {};
(sctx.TEAM_REGISTRY || []).forEach(function (t) { byName[t.name] = t; byId[t.id] = t; });

eq((byName["C\u00f3rdoba Tech"] || {}).id, "cordoba-tech", "an accent folds to its letter rather than vanishing");
eq((byName["Smith & Wesson A&M"] || {}).id, "smith-wesson-am", "an ampersand is dropped, not spelled out");
eq((byName["O'Fallon"] || {}).id, "ofallon", "an apostrophe closes up");
eq((byName["Denver (CO)"] || {}).id, "denver-co", "brackets become a separator");
eq((byName["K\u0101\u02bbu State"] || {}).id, "kau-state", "and a macron and an okina both fold away");

console.log(" but the NAME is the provider's, character for character");
// The id is ours - it is a file path, so it is folded. The name is not: it is
// how the program is written, and the fan reads it. Nothing in this pipeline
// may tidy it. Each of these is a program the registry had never seen, so
// this is the fresh-parse path, not preservation.
novel.forEach(function (n) {
  ok(!!byName[n[1]], JSON.stringify(n[1]) + " survives the generator character for character");
});
novel.forEach(function (n) {
  var t = byName[n[1]];
  if (t) eq(t.short, n[1], "and short is the same string, not a tidied one");
});

console.log(" and a name already in the registry is never rewritten");
// The other half: the union keeps `name` for an id it knows, so a bad parse
// cannot retroactively mangle a program the roster already spells correctly.
var kept = REG.all().filter(function (t) { return /[^A-Za-z0-9 ]/.test(t.name); });
ok(kept.length > 0, "the live roster carries punctuated names (" +
   kept.map(function (t) { return t.name; }).join(", ") + ")");
ok(kept.every(function (t) { return t.name === t.short; }),
   "each with short identical to it");
ok(!REG.all().some(function (t) { return /\uFFFD/.test(t.name); }),
   "and none carries a replacement character, which is what a bad decode leaves");

console.log(" a program cannot end up in the registry twice");
// The one failure the other refusals cannot see: change how slug() spells a
// name and the union keeps the old row AND adds a new one. Nothing shrinks
// and nothing is dropped, so every other guard passes while the roster
// quietly doubles. Forced here by handing the generator a registry whose id
// for a program is not the one slug() now produces.
// build-registry resolves the repository from its own location, so the
// throwaway copy has to sit where a real one would: <root>/tools/.
var dup = fs.mkdtempSync(path.join(os.tmpdir(), "dup-"));
fs.mkdirSync(path.join(dup, "tools"));
fs.mkdirSync(path.join(dup, "teams"));
fs.copyFileSync(path.join(root, "tools", "build-registry.js"), path.join(dup, "tools", "build-registry.js"));
fs.copyFileSync(path.join(root, "tools", "registry-header.txt"), path.join(dup, "tools", "registry-header.txt"));
// Two configs on disk, so the "at least 2 selectable" refusal does not fire
// first and mask the one being tested.
["prog-01", "prog-02"].forEach(function (id) {
  fs.writeFileSync(path.join(dup, "teams", id + ".js"), "var TEAM_CONFIG = {};\n");
});
// The stale row: the same program slug() now spells "prog-00".
fs.writeFileSync(path.join(dup, "teams", "index.js"),
  'var TEAM_REGISTRY = [\n  { id: "stale-id", name: "Prog 00", conference: "Conference 0" }\n];\n');
var dupRun = cp.spawnSync(process.execPath,
  [path.join(dup, "tools", "build-registry.js"), page(conf)], { encoding: "utf8" });
eq(dupRun.status, 1, "it refuses rather than publishing the same program twice");
ok(/same program appears under two ids/.test(dupRun.stderr), "and says what went wrong, and what to do");
ok(/Prog 00: (stale-id, prog-00|prog-00, stale-id)/.test(dupRun.stderr), "naming the program and both ids");
fs.rmSync(dup, { recursive: true, force: true });

fs.rmSync(tmp, { recursive: true, force: true });

console.log("\n" + (failures ? failures + " check(s) FAILED" : "one registry, and it matches the repository"));
process.exit(failures ? 1 : 0);
