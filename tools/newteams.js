#!/usr/bin/env node
/* Adding a conference at a time (Phase 0, David, 2026-10-27: 132 more FBS
   teams). What can be worked out from the repository, worked out once:

     node tools/newteams.js plan "Big Ten Conference"         the plan, as JSON
     node tools/newteams.js probes "Big Ten Conference"       lines for tools/probe-urls.txt
     node tools/newteams.js captures "Big Ten Conference"     lines for tools/fixtures/capture-requests.txt

   For each program in the conference that has no config yet (the registry,
   teams/index.js): its ESPN id, its Kalshi market if the league's markets
   price it (data/league/odds-*.json, by name - Kalshi writes "Ohio St."),
   and the beat-feed addresses worth probing first (On3 and On SI follow a
   pattern; the athletics site, SB Nation and the student paper do not, and
   are found by hand). The probes ask ESPN, from GitHub's network, for each
   team's names, colours and the venue its schedule names - spelled as ESPN
   spells it, which is what a team's home venue must match. The captures
   bring each team's schedule and news into tools/fixtures for the phase's
   review sheet (tools/reviewsheet.js).

   Nothing here writes a team's config: its colours, type and feeds are
   chosen and approved (docs/engineering/backlog.md, the rest of FBS). */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");
var root = path.join(__dirname, "..");
function read(f) { return fs.readFileSync(path.join(root, f), "utf8"); }

function registry() {
  var c = vm.createContext({});
  vm.runInContext(read("teams/index.js"), c, { filename: "teams/index.js" });
  return c.TEAM_REGISTRY;
}

// Kalshi's way of writing a program's name, for matching: "Mississippi St.",
// "Miami (FL)". Compared folded, with State as St.
function fold(s) {
  return String(s || "").toLowerCase().replace(/\bstate\b/g, "st").replace(/[^a-z0-9]+/g, "");
}
function markets() {
  var out = {};
  ["odds-title", "odds-playoff"].forEach(function (k) {
    var f = path.join(root, "data", "league", k + ".json");
    if (!fs.existsSync(f)) return;
    (JSON.parse(fs.readFileSync(f, "utf8")).markets || []).forEach(function (m) {
      var name = m.yes_sub_title || "", suffix = (/-([A-Z0-9]+)$/.exec(m.ticker || "") || [])[1];
      if (name && suffix) out[fold(name)] = { suffix: "-" + suffix, name: name };
    });
  });
  return out;
}

function slug(s) { return String(s || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

// One program's plan.
function planFor(t, kalshi) {
  var k = kalshi[fold(t.name)] || null;
  return {
    id: t.id, name: t.name, abbr: t.abbr, nick: t.nick, conference: t.conference, espnId: t.providerId,
    kalshi: k ? { tickerSuffix: k.suffix, name: k.name } : null,
    feeds: [
      "https://www.on3.com/teams/" + slug(t.name + " " + t.nick) + "/feed/",
      "https://www.si.com/college/" + slug(t.name).replace(/-/g, "") + "/feed"
    ]
  };
}

function plan(conference, reg) {
  reg = reg || registry();
  var kalshi = markets();
  return reg.filter(function (t) { return t.conference === conference && !t.config; })
    .sort(function (a, b) { return a.name < b.name ? -1 : 1; })
    .map(function (t) { return planFor(t, kalshi); });
}

var ESPN = "https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams/";
function probes(p) {
  return p.map(function (t) {
    return "# " + t.name + "\n" +
      ESPN + t.espnId + " | ^team\\.(id|displayName|abbreviation|location|nickname|color|alternateColor) = \n" +
      ESPN + t.espnId + "/schedule | ^events\\[[0-9]+\\]\\.(name|competitions\\[0\\]\\.venue\\.(fullName|address\\.(city|state))) = ";
  }).join("\n");
}
function captures(p) {
  return p.map(function (t) { return "schedule-" + t.espnId + " " + t.id + "-review\nnews-" + t.espnId + " " + t.id + "-review"; }).join("\n");
}

module.exports = { plan: plan, planFor: planFor, probes: probes, captures: captures, fold: fold, slug: slug };

if (require.main === module) {
  var cmd = process.argv[2], conf = process.argv[3];
  if (!cmd || !conf) { console.error("usage: node tools/newteams.js plan|probes|captures \"<conference>\""); process.exit(2); }
  var p = plan(conf);
  if (!p.length) { console.error("no program in " + JSON.stringify(conf) + " is left to add"); process.exit(1); }
  if (cmd === "plan") console.log(JSON.stringify(p, null, 1));
  else if (cmd === "probes") console.log(probes(p));
  else if (cmd === "captures") console.log(captures(p));
  else { console.error("unknown command " + cmd); process.exit(2); }
}
