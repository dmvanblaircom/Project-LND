#!/usr/bin/env node
/* Every team's look, before any fan sees it (Phase 0, David, 2026-10-27:
   132 more teams' palettes cannot each be checked by hand).

   TeamOS.identity refuses a palette nobody can read - but only when that
   team's page starts, which is too late. This builds every team in teams/
   the way the page does, so a refusal is a red check here instead:
     - every team's identity is accepted: its text colours reach 4.5:1 where
       the stylesheet uses them (teamos/identity.js)
     - white text, the header's, hero's and banners', reaches 4.5:1 on the
       team's surface and deepest surface
     - each face a team names first is the Suite's own, or declared in
       app.css with its files and its licence in the repository
     - the header label is a label, not a sentence

   Usage: node tools/teamidentitycheck.js     (exit 1 on failure) */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");
var root = path.join(__dirname, "..");
function read(f) { return fs.readFileSync(path.join(root, f), "utf8"); }

var failures = 0;
function ok(cond, what) { if (cond) { console.log("  ok   " + what); return; } failures++; console.log("  FAIL " + what); }

var css = read("app.css");
// every family app.css declares, with the files its faces load
var declared = {};
(css.match(/@font-face\{[^}]*\}/g) || []).forEach(function (f) {
  var fam = (/font-family:'([^']+)'/.exec(f) || [])[1], src = (/url\(([^)]+)\)/.exec(f) || [])[1];
  if (!fam) return;
  (declared[fam] = declared[fam] || []).push(src);
});
var SUITE = ["Instrument Sans", "Instrument Display"];

var teams = fs.readdirSync(path.join(root, "teams")).filter(function (f) { return /\.js$/.test(f) && f !== "index.js"; }).sort();
ok(teams.length >= 2, teams.length + " teams to check");
teams.forEach(function (f) {
  var c = vm.createContext({});
  ["teamos/team.js", "teamos/identity.js"].forEach(function (s) { vm.runInContext(read(s), c, { filename: s }); });
  vm.runInContext(read("teams/" + f), c, { filename: f });
  var cfg = c.TEAM_CONFIG, id = cfg && cfg.team && cfg.team.id;
  console.log(id || f);
  var team, ident, err = null;
  try { team = c.TeamOS.createTeam(cfg.team); ident = c.TeamOS.identity.create(cfg, team); } catch (e) { err = e.message; }
  ok(!err, "TeamOS accepts its identity" + (err ? ": " + err : ""));
  if (err) return;
  var col = cfg.identity.colors, ratio = c.TeamOS.identity.contrast;
  var ws = ratio("#FFFFFF", col.surface), wd = ratio("#FFFFFF", col.surfaceDeep);
  ok(ws >= 4.5 && wd >= 4.5, "white text on its surface " + ws.toFixed(2) + ":1 and deepest surface " + wd.toFixed(2) + ":1");
  var fonts = cfg.identity.fonts || {};
  ["ui", "display"].forEach(function (k) {
    if (!fonts[k]) return;
    var first = (/^\s*'([^']+)'/.exec(fonts[k]) || /^\s*([^,]+)/.exec(fonts[k]) || [])[1];
    var files = declared[first] || [];
    var owned = SUITE.indexOf(first) !== -1 ||
      (files.length && files.every(function (u) { return fs.existsSync(path.join(root, u)); }) &&
       ["OFL.txt", "LICENSE.txt"].some(function (l) { return fs.existsSync(path.join(root, path.dirname(files[0]), l)); }));
    ok(owned, k + " face '" + first + "' is the Suite's, or self-hosted with its licence (" + files.length + " file(s))");
  });
  var label = cfg.identity.programLabel;
  ok(typeof label === "string" && label.length > 0 && label.length <= 28 && label === label.toUpperCase(),
     "its header label is a short label: " + label);
});

console.log("\n" + (failures ? failures + " check(s) FAILED" : "every team's look can be read, in faces it may use"));
process.exit(failures ? 1 : 0);
