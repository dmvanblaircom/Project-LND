#!/usr/bin/env node
/* Generate teams/index.js — the one registry (decision 0014).

   The roster is not typed. It is built from what the provider serves, by the
   Action, which has network access where a session may not. Five attempts at
   pulling an FBS list out of ESPN's /teams endpoint failed in five different
   ways (decision 0017); what does work is the scoreboard with groups=80,
   because that is the request the application itself has depended on since
   Phase 4A.

     scoreboard?groups=80   ->  WHICH programs are FBS   (ids, playing this week)
     teams?limit=500        ->  what each one is CALLED  (location, the program)
     the filesystem         ->  which ones we can RENDER (teams/<id>.js exists)

   No week has every program in it - byes, and the odd FCS opponent - so the
   roster is a UNION with whatever the registry already holds. It converges
   over a few runs and never loses a program it has seen. That is also why
   this refuses to shrink the list: a quiet week must not delete half of FBS.

   Availability stays derived, now literally: a row gets a `config` because
   teams/<id>.js is on disk, checked here rather than asserted by hand.

   `conference` is NOT in either payload and is not invented. A row that
   already has one keeps it; a new row gets none, and TeamOS.registry reads
   that as "Independent".

   Usage:
     node tools/build-registry.js <scoreboard.json> <teams.json> [--write]

   Without --write it prints the file it would generate and changes nothing. */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");

var root = path.join(__dirname, "..");
var args = process.argv.slice(2);
var files = args.filter(function (a) { return a.charAt(0) !== "-"; });
var WRITE = args.indexOf("--write") !== -1;

function die(msg) { console.error("build-registry: " + msg); process.exit(1); }

// Safari wraps a JSON response in <pre>; a webarchive buries it in a plist.
// Accept all three so a file saved from a browser works the same as curl's.
function payload(p) {
  var buf = fs.readFileSync(p), text;
  if (buf.slice(0, 8).toString("binary") === "bplist00") {
    var i = buf.toString("binary").indexOf('{"');
    if (i === -1) die("no JSON inside " + p);
    text = buf.slice(i).toString("utf8");
  } else {
    text = buf.toString("utf8");
  }
  var pre = /<pre[^>]*>([\s\S]*?)<\/pre>/.exec(text);
  if (pre) text = pre[1];
  if (/&quot;/.test(text.slice(0, 400))) {
    text = text.replace(/&quot;/g, '"').replace(/&#39;/g, "'")
               .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  }
  var open = text.indexOf("{");
  if (open > 0) text = text.slice(open);
  var close = text.lastIndexOf("}");
  if (close !== -1) text = text.slice(0, close + 1);
  try { return JSON.parse(text); } catch (e) { die(p + " is not JSON: " + e.message); }
}

function slug(s) {
  return String(s).toLowerCase()
    .replace(/[‘’'`.]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---- who is FBS: every team in an FBS scoreboard ------------------------
function fbsIds(sb) {
  var ids = {};
  ((sb && sb.events) || []).forEach(function (e) {
    (((e.competitions || [])[0] || {}).competitors || []).forEach(function (c) {
      var t = c.team || {};
      var id = c.id || t.id;
      if (!id) return;
      ids[String(id)] = {
        espnId: String(id),
        displayName: t.displayName || t.shortDisplayName || "",
        short: t.shortDisplayName || t.displayName || "",
        location: t.location || null
      };
    });
  });
  return ids;
}

// ---- what each is called: the roster payload, keyed by ESPN id ----------
function namesById(tp) {
  var out = {};
  var teams = [];
  try { teams = tp.sports[0].leagues[0].teams; } catch (e) { teams = []; }
  teams.forEach(function (x) {
    var t = x.team || x;
    if (t && t.id && t.location) {
      out[String(t.id)] = { name: t.location, short: t.shortDisplayName || t.location };
    }
  });
  return out;
}

// A scoreboard name is "Notre Dame Fighting Irish"; the program is the part
// before the nickname, which only the roster payload states outright. When it
// is missing, the short name is the safer guess than chopping the long one.
function programName(entry, known) {
  if (known) return known;
  if (entry.location) return { name: entry.location, short: entry.short || entry.location };
  if (entry.short) return { name: entry.short, short: entry.short };
  return null;
}

// ---- the registry as it stands, so nothing hand-authored is lost --------
function existing() {
  var p = path.join(root, "teams", "index.js");
  if (!fs.existsSync(p)) return [];
  var c = vm.createContext({});
  vm.runInContext(fs.readFileSync(p, "utf8"), c, { filename: "teams/index.js" });
  return c.TEAM_REGISTRY || [];
}

function configOnDisk(id) {
  return fs.existsSync(path.join(root, "teams", id + ".js")) ? "teams/" + id + ".js" : null;
}

function build(sb, tp) {
  var fbs = fbsIds(sb), names = namesById(tp);
  var rows = {}, seen = 0, unnamed = [];

  existing().forEach(function (t) {
    if (t && t.id) rows[t.id] = { id: t.id, name: t.name, short: t.short, conference: t.conference || null };
  });

  Object.keys(fbs).forEach(function (espnId) {
    var n = programName(fbs[espnId], names[espnId]);
    if (!n) { unnamed.push(espnId); return; }
    var id = slug(n.name);
    if (!id) { unnamed.push(espnId); return; }
    seen++;
    if (rows[id]) {                       // keep the hand-authored name and conference
      if (!rows[id].short) rows[id].short = n.short;
      return;
    }
    rows[id] = { id: id, name: n.name, short: n.short, conference: null };
  });

  var list = Object.keys(rows).sort().map(function (k) {
    var r = rows[k];
    r.config = configOnDisk(r.id);
    return r;
  });
  return { list: list, seen: seen, unnamed: unnamed };
}

function render(list) {
  var head = fs.readFileSync(path.join(__dirname, "registry-header.txt"), "utf8");
  var body = list.map(function (t) {
    var parts = ['id: ' + JSON.stringify(t.id), 'name: ' + JSON.stringify(t.name),
                 'short: ' + JSON.stringify(t.short)];
    if (t.conference) parts.push('conference: ' + JSON.stringify(t.conference));
    if (t.config)     parts.push('config: ' + JSON.stringify(t.config));
    return "  { " + parts.join(", ") + " }";
  }).join(",\n");
  return head + "\nvar TEAM_REGISTRY = [\n\n" + body + "\n\n];\n";
}

// ---- run ----------------------------------------------------------------
if (files.length < 2) die("usage: build-registry.js <scoreboard.json> <teams.json> [--write]");

var built = build(payload(files[0]), payload(files[1]));
var before = existing().length;
var after = built.list.length;
var selectable = built.list.filter(function (t) { return t.config; });

console.error("scoreboard named " + built.seen + " FBS programs");
console.error("registry " + before + " -> " + after + " (" + selectable.length + " selectable)");
if (built.unnamed.length) {
  console.error("  !! " + built.unnamed.length + " team(s) had no usable name: " +
                built.unnamed.slice(0, 8).join(", "));
}

// Refusals. A quiet week, a truncated payload or a malformed response must
// never be able to shrink the registry - that is how a chooser loses teams.
//
// While the roster is built as a union these cannot fire on a bad payload -
// every existing row is copied in first, so the list only grows. They fire on
// a bad CHANGE instead, which is the point: deleting the union above makes
// this refuse immediately rather than quietly publishing a registry missing
// every program that had a bye. Verified by doing it.
if (after < before) die("refusing to shrink the registry (" + before + " -> " + after + ")");
var lost = existing().filter(function (t) {
  return t && t.id && !built.list.some(function (r) { return r.id === t.id; });
});
if (lost.length) die("refusing to drop " + lost.map(function (t) { return t.id; }).join(", "));
if (selectable.length < 2) die("refusing: only " + selectable.length + " selectable team(s), expected at least 2");

var out = render(built.list);
if (!WRITE) { process.stdout.write(out); process.exit(0); }
fs.writeFileSync(path.join(root, "teams", "index.js"), out);
console.error("wrote teams/index.js");
