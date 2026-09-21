#!/usr/bin/env node
/* Turn an ESPN teams payload into rows for teams/index.js.

   The registry is the one list of programs (decision 0014) and it has to be
   right: a wrong name or a stale id there becomes a wrong name in the chooser,
   which is the first thing a new fan sees. So it is generated from the
   provider's own roster rather than typed.

   Feed it what ESPN serves at

     /apis/site/v2/sports/football/college-football/teams?groups=80&limit=500

   *** groups=80 is FBS. WITHOUT it the endpoint returns every division - 500
   teams including FCS, Division II and Division III - and nothing in the
   payload distinguishes them, so an unfiltered dump CANNOT be filtered here. ***

   A Safari .webarchive or a page Safari wrapped in <pre> is unwrapped
   automatically, so a file saved from the browser works as-is.

   Usage:
     node tools/import-teams.js <payload>           # print rows for teams/index.js
     node tools/import-teams.js <payload> --check   # compare against the registry

   The id comes from the team's `location` ("Ohio State" -> "ohio-state"),
   because that is the program, where `slug` carries the nickname too. Rows are
   printed without a `config`: naming one is a deliberate act that says the
   Suite can actually render that team, and it is what makes it selectable.

   CONFERENCE IS NOT IN THIS PAYLOAD. Rows come out without one and
   TeamOS.registry reads that as "Independent". Grouping a chooser properly
   needs a second source; until then the conferences already in the registry
   are hand-authored and this tool leaves them alone. */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");

var root = path.join(__dirname, "..");
var args = process.argv.slice(2);
var file = args.filter(function (a) { return a.charAt(0) !== "-"; })[0];
var CHECK = args.indexOf("--check") !== -1;

if (!file) {
  console.error("usage: node tools/import-teams.js <payload.json|.webarchive> [--check]");
  process.exit(2);
}

// ---- get to the JSON, whatever the browser wrapped it in --------------
function payload(p) {
  var buf = fs.readFileSync(p);
  var text;
  if (buf.slice(0, 8).toString("binary") === "bplist00") {
    // a Safari .webarchive: the response body is one value inside a binary plist
    var s = buf.toString("binary");
    var i = s.indexOf('{"sports"');
    if (i === -1) throw new Error("no ESPN payload inside that webarchive");
    text = buf.slice(i).toString("utf8");
    var end = text.lastIndexOf("</pre>");
    if (end !== -1) text = text.slice(0, end);
  } else {
    text = buf.toString("utf8");
  }
  var pre = /<pre[^>]*>([\s\S]*)<\/pre>/.exec(text);
  if (pre) text = pre[1];
  if (/&quot;|&amp;/.test(text.slice(0, 400))) {
    text = text.replace(/&quot;/g, '"').replace(/&#39;/g, "'")
               .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  }
  var open = text.indexOf('{"sports"');
  if (open > 0) text = text.slice(open);
  var close = text.lastIndexOf("}");
  if (close !== -1) text = text.slice(0, close + 1);
  return JSON.parse(text);
}

function slug(s) {
  return String(s).toLowerCase()
    .replace(/[''`.]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

var d = payload(file);
var league;
try { league = d.sports[0].leagues[0]; } catch (e) { league = null; }
if (!league || !league.teams) { console.error("that payload has no teams list"); process.exit(2); }

var rows = league.teams.map(function (t) { return t.team; })
  .filter(function (t) { return t && t.id && t.location; })
  .map(function (t) {
    return { id: slug(t.location), name: t.location,
             short: t.shortDisplayName || t.location, espnId: String(t.id) };
  });

// Two programs can slug the same way; say so rather than silently dropping one.
var byId = {}, clashes = [];
rows.forEach(function (r) {
  if (byId[r.id]) clashes.push(r.id + ": " + byId[r.id].espnId + " and " + r.espnId);
  else byId[r.id] = r;
});
rows = Object.keys(byId).sort().map(function (k) { return byId[k]; });

console.error("read " + rows.length + " programs from " + path.basename(file) +
              " (season " + ((league.season || {}).year || "?") + ")");
if (rows.length > 200) {
  console.error("");
  console.error("  !! " + rows.length + " is every division, not FBS. Re-fetch with &groups=80.");
  console.error("     Nothing in the payload marks division, so this cannot be filtered here.");
  console.error("");
}
clashes.forEach(function (c) { console.error("  !! two programs share an id -> " + c); });

if (!CHECK) {
  rows.forEach(function (r) {
    console.log('  { id: ' + JSON.stringify(r.id) + ', name: ' + JSON.stringify(r.name) +
                ', short: ' + JSON.stringify(r.short) + ' },');
  });
  process.exit(0);
}

// ---- --check: what the registry says vs what the provider says --------
var ctx = vm.createContext({});
["teams/index.js", "teamos/registry.js"].forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f });
});
var REG = ctx.TeamOS.registry.create(ctx.TEAM_REGISTRY);

var problems = 0;
REG.all().forEach(function (t) {
  var e = byId[t.id];
  if (!e) { console.log("  ?    " + t.id + " is in the registry but not in this payload"); problems++; return; }
  if (e.name !== t.name) { console.log("  DIFF " + t.id + ": registry says " + JSON.stringify(t.name) +
                                       ", ESPN says " + JSON.stringify(e.name)); problems++; return; }
  console.log("  ok   " + t.id + " -> " + t.name + " (ESPN " + e.espnId + ")");
});

// A selectable team's config must point at the id ESPN uses, or every fetch
// for it is for somebody else.
REG.available().forEach(function (t) {
  var cfg = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(root, t.config), "utf8"), cfg, { filename: t.config });
  var declared = ((cfg.TEAM_CONFIG.sources || {}).espn || {}).teamId;
  var e = byId[t.id];
  if (!e) return;
  if (String(declared) !== e.espnId) {
    console.log("  DIFF " + t.id + " config says ESPN id " + declared + ", the roster says " + e.espnId);
    problems++;
  } else {
    console.log("  ok   " + t.id + " config's ESPN id matches the roster (" + declared + ")");
  }
});

var missing = rows.length - REG.all().length;
if (missing > 0) console.log("\n  " + missing + " program(s) in the payload are not in the registry yet");
process.exit(problems ? 1 : 0);
