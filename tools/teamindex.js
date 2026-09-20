#!/usr/bin/env node
/* The FBS registry, generated and verified.

   teams/index.js lists every FBS program so the chooser can show the league,
   and marks which of them this Suite has actually implemented. Those are two
   different things and the distinction is the point:

     the registry     every FBS program, whether or not we have built it
     a team config    teams/<id>.js, which is what makes a team selectable

   A team becomes selectable by someone writing its config - not by anyone
   editing a second list. `built` is derived from the contents of teams/, and
   the verify mode below is what stops the two drifting apart: add
   teams/indiana.js without regenerating and the check fails and says so.

   Two modes:

     node tools/teamindex.js            verify the checked-in registry
     node tools/teamindex.js --fetch    rebuild it from ESPN

   --fetch walks group 80's conferences in ESPN's core API, which is the only
   enumeration of FBS membership that is actually complete: the site API's
   team list is capped and drops teams, and its standings payload was missing
   a whole conference the day this was written. It needs the network and is
   run by hand when conferences realign, not in CI. */
"use strict";
var fs = require("fs"), path = require("path");

var root = path.join(__dirname, "..");
var INDEX = path.join(root, "teams", "index.js");
var SEASON = 2026;

// "San José State" -> "san-jose-state", "Texas A&M" -> "texas-am".
// Accents are folded rather than dropped, and an ampersand disappears rather
// than becoming a word, so the id reads the way the name is said.
function slug(s) {
  return String(s)
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/&/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Which teams this Suite has a real TeamOS config for. The filesystem is the
// authority; nothing else gets a vote.
function builtTeams() {
  return fs.readdirSync(path.join(root, "teams"))
    .filter(function (f) { return /\.js$/.test(f) && f !== "index.js"; })
    .map(function (f) { return f.replace(/\.js$/, ""); })
    .sort();
}

function readIndex() {
  var src = fs.readFileSync(INDEX, "utf8");
  var sandbox = {};
  require("vm").runInNewContext(src, sandbox, { filename: "teams/index.js" });
  return sandbox.TEAM_INDEX;
}

// ---- verify ------------------------------------------------------------
function verify() {
  var fails = 0;
  function ok(cond, what) {
    if (cond) { console.log("  ok   " + what); return; }
    fails++; console.log("  FAIL " + what);
  }

  if (!fs.existsSync(INDEX)) {
    console.log("  FAIL teams/index.js does not exist - run with --fetch");
    return 1;
  }
  var idx = readIndex();
  var teams = idx && idx.teams;
  ok(Array.isArray(teams) && teams.length > 0, "the registry parses and has teams");
  if (!teams) return 1;

  console.log("teams/index.js (" + teams.length + " programs, FBS as of " + idx.updated + ")");
  ok(teams.length === 138, "138 FBS programs");

  var ids = {}, dupes = [];
  teams.forEach(function (t) { if (ids[t.id]) dupes.push(t.id); ids[t.id] = t; });
  ok(dupes.length === 0, "every id is unique" + (dupes.length ? " (" + dupes.join(", ") + ")" : ""));
  ok(teams.every(function (t) { return /^[a-z][a-z0-9-]*$/.test(t.id); }), "every id is a safe slug");
  ok(teams.every(function (t) { return t.name && t.espn && t.conference; }), "every entry has a name, an ESPN id and a conference");

  // the two the first generation got wrong
  ok(!!ids["texas-am"], "Texas A&M is texas-am");
  ok(!!ids["san-jose-state"], "San Jose State is san-jose-state");
  ok(!!ids["miami"] && !!ids["miami-oh"], "the two Miamis are distinct");

  // the registry and the filesystem must agree about what is built
  var onDisk = builtTeams();
  var flagged = teams.filter(function (t) { return t.built; }).map(function (t) { return t.id; }).sort();
  ok(JSON.stringify(flagged) === JSON.stringify(onDisk),
     "built teams match teams/*.js  (registry: " + (flagged.join(", ") || "none") +
     " | on disk: " + (onDisk.join(", ") || "none") + ")");
  onDisk.forEach(function (id) {
    ok(!!ids[id], "teams/" + id + ".js has a registry entry");
  });

  console.log(fails ? "\n" + fails + " registry check(s) FAILED - run: node tools/teamindex.js --fetch"
                    : "\nthe registry matches the teams this Suite has built");
  return fails ? 1 : 0;
}

// ---- fetch -------------------------------------------------------------
function get(url) {
  return fetch(url).then(function (r) {
    if (!r.ok) throw new Error(r.status + " " + url);
    return r.json();
  });
}

function build() {
  var api = "https://sports.core.api.espn.com/v2/sports/football/leagues/college-football/seasons/" +
            SEASON + "/types/2/groups/80/children?limit=50";
  var site = "https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams";

  return get(api).then(function (kids) {
    console.log("conferences: " + kids.count);
    var rows = [];
    return kids.items.reduce(function (chain, it) {
      return chain.then(function () {
        return get(it.$ref.replace(/^http:/, "https:")).then(function (conf) {
          return get(conf.teams.$ref.replace(/^http:/, "https:") + "&limit=100").then(function (list) {
            (list.items || []).forEach(function (t) {
              var m = t.$ref.match(/teams\/(\d+)/);
              if (m) rows.push({ espn: m[1], conference: conf.name });
            });
            console.log("  " + conf.name);
          });
        });
      });
    }, Promise.resolve()).then(function () { return rows; });
  }).then(function (rows) {
    return get(site + "?limit=500").then(function (page) {
      var byId = {};
      page.sports[0].leagues[0].teams.forEach(function (x) { byId[x.team.id] = x.team; });
      // the 500-team page does not cover every FBS program
      var missing = rows.filter(function (r) { return !byId[r.espn]; });
      console.log("fetching " + missing.length + " teams the team list omitted");
      return missing.reduce(function (chain, r) {
        return chain.then(function () {
          return get(site + "/" + r.espn).then(function (d) { byId[r.espn] = d.team; });
        });
      }, Promise.resolve()).then(function () { return { rows: rows, byId: byId }; });
    });
  }).then(function (d) {
    var built = builtTeams();
    var teams = d.rows.map(function (r) {
      var t = d.byId[r.espn];
      var id = slug(t.location);
      var e = { id: id, name: t.location, nickname: t.name,
                abbreviation: t.abbreviation || "", espn: r.espn, conference: r.conference };
      if (built.indexOf(id) > -1) e.built = true;
      return e;
    }).sort(function (a, b) { return a.name.localeCompare(b.name); });

    var today = new Date().toISOString().slice(0, 10);
    var out = [
      "/* Every FBS program, and which of them this Suite has been built for.",
      "",
      "   Generated by tools/teamindex.js from ESPN's group 80 conference",
      "   membership. Do not edit by hand: run",
      "",
      "     node tools/teamindex.js --fetch",
      "",
      "   The registry and the list of teams you can actually choose are",
      "   deliberately different things. Every program is here so the chooser can",
      "   show the league; `built` marks the ones with a real TeamOS config in",
      "   teams/, and it is derived from what is in that folder rather than kept",
      "   by hand. Writing teams/indiana.js and regenerating is the whole of what",
      "   it takes to make Indiana selectable - there is no second list to edit,",
      "   and tools/teamindex.js fails the build if the two ever disagree.",
      "",
      "   id is slug(location): accents folded, an ampersand dropped rather than",
      "   spelled out, so Texas A&M is texas-am and San Jose State is",
      "   san-jose-state. It is the ?team= value and the config filename. */",
      "",
      "var TEAM_INDEX = {",
      "  updated: " + JSON.stringify(today) + ",",
      "  season: " + SEASON + ",",
      "  teams: ["
    ];
    teams.forEach(function (t, i) {
      var parts = ['id:' + JSON.stringify(t.id),
                   'name:' + JSON.stringify(t.name),
                   'nickname:' + JSON.stringify(t.nickname),
                   'abbreviation:' + JSON.stringify(t.abbreviation),
                   'espn:' + JSON.stringify(t.espn),
                   'conference:' + JSON.stringify(t.conference)];
      if (t.built) parts.push("built:true");
      out.push("    { " + parts.join(", ") + " }" + (i === teams.length - 1 ? "" : ","));
    });
    out.push("  ]", "};", "");
    fs.writeFileSync(INDEX, out.join("\r\n"));
    console.log("\nwrote teams/index.js: " + teams.length + " programs, " +
                teams.filter(function (t) { return t.built; }).length + " built");
  });
}

if (process.argv.indexOf("--fetch") > -1) {
  build().then(function () { process.exit(verify()); })
         .catch(function (e) { console.error("fetch failed: " + e.message); process.exit(1); });
} else {
  process.exit(verify());
}
