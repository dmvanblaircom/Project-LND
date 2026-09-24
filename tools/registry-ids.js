#!/usr/bin/env node
/* Give registry rows their provider id, from ESPN's JSON.

   Each program's mark is TeamOS.espn.mark(providerId), so a row without a
   providerId is drawn with its initials. build-registry.js takes ids from the
   standings page along with the roster, but that page is a page: since
   2026-09-24 it answers GitHub's runners with HTTP 202 (a bot challenge), and
   the roster cannot refresh at all. The ids do not need the page. Every FBS
   program plays in ESPN's weekly FBS scoreboard, which is JSON and which this
   app already reads, and each competitor there carries its id and its
   `location` - the same field the registry's `name` comes from.

     scoreboard JSON (any number of weeks)  ->  { location -> id }
     teams/index.js rows with no providerId ->  matched by name, then by abbr

   This only ADDS ids. It never adds or removes a program (membership is the
   standings page's job, decision 0017), never renames one, and never
   replaces an id a row already has: a disagreement is reported and the
   existing id stands. A name that maps to two ids is ambiguous and is left
   alone. The ids stay data in the registry, behind TeamOS; nothing in the
   Suite names one.

   Usage:
     node tools/registry-ids.js <scoreboard.json>... [--write]

   Without --write it reports what it would change and changes nothing. */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");

var root = path.join(__dirname, "..");
var args = process.argv.slice(2);
var files = args.filter(function (a) { return a.charAt(0) !== "-"; });
var WRITE = args.indexOf("--write") !== -1;

function die(msg) { console.error("registry-ids: " + msg); process.exit(1); }

// Every team object a payload carries: scoreboard competitors, and the
// /teams list's shape too, so either feed works.
function teamsIn(d) {
  var out = [];
  (d.events || []).forEach(function (e) {
    (e.competitions || []).forEach(function (c) {
      (c.competitors || []).forEach(function (x) { if (x && x.team) out.push(x.team); });
    });
  });
  (d.sports || []).forEach(function (s) {
    (s.leagues || []).forEach(function (l) {
      (l.teams || []).forEach(function (x) { if (x && x.team) out.push(x.team); });
    });
  });
  return out;
}

function norm(s) { return String(s || "").trim().toLowerCase(); }

// location -> set of ids, abbreviation -> set of ids.
function index(teams) {
  var byName = {}, byAbbr = {};
  teams.forEach(function (t) {
    var id = String(t.id || "");
    if (!/^[0-9]+$/.test(id)) return;
    var n = norm(t.location), a = norm(t.abbreviation);
    if (n) (byName[n] = byName[n] || {})[id] = true;
    if (a) (byAbbr[a] = byAbbr[a] || {})[id] = true;
  });
  return { byName: byName, byAbbr: byAbbr };
}

function only(set) {
  var ids = set ? Object.keys(set) : [];
  return ids.length === 1 ? ids[0] : null;
}

// The rule, separate from the file handling so it can be tested alone.
function assign(rows, teams) {
  var ix = index(teams), added = [], conflicts = [], ambiguous = [], missing = [];
  var out = rows.map(function (r) {
    var row = Object.assign({}, r);
    var nameSet = ix.byName[norm(row.name)];
    var id = only(nameSet);
    if (!id && nameSet && Object.keys(nameSet).length > 1) ambiguous.push(row.id);
    if (!id && !nameSet) id = only(ix.byAbbr[norm(row.abbr)]);
    if (!id) { if (!row.providerId) missing.push(row.id); return row; }
    if (row.providerId && row.providerId !== id) { conflicts.push(row.id + " (" + row.providerId + " vs " + id + ")"); return row; }
    if (!row.providerId) { row.providerId = id; added.push(row.id); }
    return row;
  });
  return { rows: out, added: added, conflicts: conflicts, ambiguous: ambiguous, missing: missing };
}

function load() {
  var c = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(root, "teams/index.js"), "utf8"), c, { filename: "teams/index.js" });
  return c.TEAM_REGISTRY;
}

// The same layout build-registry.js writes, so the two tools agree to the byte.
function render(list) {
  var head = fs.readFileSync(path.join(__dirname, "registry-header.txt"), "utf8");
  var body = list.map(function (t) {
    var parts = ['id: ' + JSON.stringify(t.id), 'name: ' + JSON.stringify(t.name),
                 'short: ' + JSON.stringify(t.short)];
    if (t.conference) parts.push('conference: ' + JSON.stringify(t.conference));
    if (t.abbr)       parts.push('abbr: ' + JSON.stringify(t.abbr));
    if (t.nick)       parts.push('nick: ' + JSON.stringify(t.nick));
    if (t.providerId) parts.push('providerId: ' + JSON.stringify(t.providerId));
    if (t.config)     parts.push('config: ' + JSON.stringify(t.config));
    return "  { " + parts.join(", ") + " }";
  }).join(",\n");
  return head + "\nvar TEAM_REGISTRY = [\n\n" + body + "\n\n];\n";
}

if (require.main === module) {
  if (!files.length) die("usage: registry-ids.js <scoreboard.json>... [--write]");
  var teams = [];
  files.forEach(function (f) {
    try { teams = teams.concat(teamsIn(JSON.parse(fs.readFileSync(f, "utf8")))); }
    catch (e) { console.warn("  skipped " + f + ": " + e.message); }
  });
  if (!teams.length) die("no teams in any payload - refusing to guess");
  var rows = load();
  var r = assign(rows, teams);
  if (r.rows.length !== rows.length) die("row count changed - refusing");
  console.log("  " + teams.length + " team entries read; " + r.added.length + " id(s) added; " +
              r.rows.filter(function (x) { return x.providerId; }).length + "/" + r.rows.length + " rows have one");
  if (r.missing.length) console.log("  still without an id: " + r.missing.join(", "));
  if (r.ambiguous.length) console.log("  ambiguous, left alone: " + r.ambiguous.join(", "));
  if (r.conflicts.length) console.log("::warning::provider ids disagree, existing kept: " + r.conflicts.join("; "));
  if (WRITE) fs.writeFileSync(path.join(root, "teams/index.js"), render(r.rows));
}

module.exports = { teamsIn: teamsIn, assign: assign, render: render };
