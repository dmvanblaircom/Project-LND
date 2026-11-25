#!/usr/bin/env node
/* TeamOS.art: which photographs a game wears (David, 2026-11-20).

   - the stadium is the venue the game is played in, matched by the venue the
     schedule names: our stadium at home, the opponent's away, a known
     neutral site's own - and the defocused stand-in for any venue Suite has
     no photo of
   - by day or under the lights, as the kickoff is
   - every photograph's credit is listed for More

   Runs against a small art table of its own, so it holds whatever the real
   one (leagues/college-football-art.js) carries; and checks the real one's
   files exist. */
"use strict";

var fs = require("fs"), path = require("path"), vm = require("vm");
var root = path.join(__dirname, "..");
var failures = 0, checks = 0;
function ok(c, what) { checks++; if (c) console.log("  ok   " + what); else { failures++; console.log("  FAIL " + what); } }
function read(f) { return fs.readFileSync(path.join(root, f), "utf8"); }

function load(art) {
  var ctx = vm.createContext({ console: console });
  vm.runInContext("var TEAM_ART = " + JSON.stringify(art) + ";", ctx);
  vm.runInContext(read("teamos/art.js"), ctx, { filename: "teamos/art.js" });
  return ctx.TeamOS.art;
}
function shot(p, credit) { return { path: p, widths: [960, 1920], credit: credit }; }
var ART = {
  venues: {
    "notre-dame-stadium": { label: "Notre Dame Stadium", names: ["Notre Dame Stadium"],
      day: shot("assets/venues/nds/day-{w}.webp", "A, CC BY-SA 4.0"), night: shot("assets/venues/nds/night-{w}.webp", "B, CC BY 2.0") },
    "ohio-stadium": { label: "Ohio Stadium", names: ["Ohio Stadium", "The Horseshoe"],
      day: shot("assets/venues/os/day-{w}.webp", "C, CC0") },
    neutral: { label: "Stadium", day: shot("assets/venues/neutral/day-{w}.webp", "D, CC BY 2.0"), night: shot("assets/venues/neutral/night-{w}.webp", "E, CC BY 2.0") }
  }
};
var A = load(ART);

console.log("the stadium the game is played in");
var home = A.venue({ venue: "Notre Dame Stadium", home: true }, "night");
ok(home && home.key === "notre-dame-stadium" && /nds\/night-1920/.test(home.src) && !home.neutral, "a home game: our stadium, under the lights");
ok(home && home.srcset === "assets/venues/nds/night-960.webp 960w, assets/venues/nds/night-1920.webp 1920w", "every width offered (" + (home && home.srcset) + ")");
var away = A.venue({ venue: "ohio stadium", home: false }, "day");
ok(away && away.key === "ohio-stadium", "an away game: the opponent's stadium, whatever the spelling's case");
ok(A.venue({ venue: "The Horseshoe" }, "day").key === "ohio-stadium", "any of the venue's listed names");
ok(A.venue({ venue: "Ohio Stadium" }, "night").time === "day", "a venue with no night photo shows its day one rather than nothing");
var neutral = A.venue({ venue: "Gillette Stadium", neutral: true }, "night");
ok(neutral && neutral.key === "neutral" && neutral.neutral && /neutral\/night/.test(neutral.src), "a venue Suite has no photo of: the stand-in, by the same light");
ok(A.venue({ venue: "" }, "day").key === "neutral" && A.venue(null, "day").key === "neutral", "no venue named: the stand-in");
ok(A.venue({ venue: "Notre Dame Stadium" }, "dusk").time === "day", "a light other than day or night is day");
ok(load({ venues: {} }).venue({ venue: "Notre Dame Stadium" }, "day") === null, "no art at all: null (the stage paints its own ground)");

console.log("teams are shown by their marks (decision 0046)");
ok(typeof A.helmet === "undefined" && typeof A.helmetByProvider === "undefined", "no helmet lookup to reach for");

console.log("credits");
var cr = A.credits();
ok(cr.length === 5 && cr.every(function (c) { return c.credit; }), "every photograph's credit is listed (" + cr.length + ")");

console.log("the real art table");
var real = (function () { var c = vm.createContext({}); vm.runInContext(read("leagues/college-football-art.js"), c); return c.TEAM_ART; })();
var files = [];
Object.keys(real.venues).forEach(function (k) { ["day", "night"].forEach(function (t) { var s = real.venues[k][t]; if (s) s.widths.forEach(function (w) { files.push(s.path.replace("{w}", w)); }); }); });
var missing = files.filter(function (f) { return !fs.existsSync(path.join(root, f)); });
ok(!missing.length, "every file it names exists (" + files.length + " files" + (missing.length ? "; missing " + missing.join(", ") : "") + ")");
var uncredited = [];
Object.keys(real.venues).forEach(function (k) { ["day", "night"].forEach(function (t) { var s = real.venues[k][t]; if (s && !s.credit) uncredited.push(k + " " + t); }); });
ok(!uncredited.length, "every real photograph carries its credit" + (uncredited.length ? " (missing: " + uncredited.join(", ") + ")" : ""));

console.log("\n" + checks + " checks" + (failures ? ", " + failures + " FAILED" : ": a game wears the photographs of where it is played"));
process.exit(failures ? 1 : 0);
