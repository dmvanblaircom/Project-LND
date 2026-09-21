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

console.log(" grouped for a chooser");
var groups = REG.byConference();
ok(groups.length >= 2, "conferences are grouped");
eq(groups.map(function (g) { return g.conference; }).sort(), ["Big 12", "Big Ten", "Independent"],
   "every conference in the registry appears once");
var bigTen = groups.filter(function (g) { return g.conference === "Big Ten"; })[0];
eq(bigTen.teams.map(function (t) { return t.id; }), ["indiana", "ohio-state"],
   "teams within a conference are alphabetical, available or not");

console.log("\n" + (failures ? failures + " check(s) FAILED" : "one registry, and it matches the repository"));
process.exit(failures ? 1 : 0);
