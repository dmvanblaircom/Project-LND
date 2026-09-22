#!/usr/bin/env node
/* Generate teams/index.js — the one registry (decision 0014).

   The roster is not typed. It is read from ESPN's own standings page, which is
   the only source found that states FBS membership outright:

     www.espn.com/college-football/standings
       -> window['__espnfitt__']
         -> page.content.standings.groups.groups[]     a conference
              .name                                    "Big Ten Conference"
              .standings[].team                        its programs
              .children[].standings[].team             or its divisions'

   That one page answers every question the registry has. Which programs are
   FBS: exactly the ones on it, with no Division II or III to filter out. What
   each is called: `location` is the program ("Ohio State") where a display
   name carries the nickname too. And what conference it plays in, which no
   API payload carries at all.

   Five earlier attempts at an API failed five ways (decision 0017): /teams
   ignores groups=80 and truncates at 500 by internal id, the standings API
   returns a stub pointing at this very page, the core API 404s. Reading the
   page the stub points to is not a workaround; it is where ESPN keeps this.

   It IS a page, so it is more fragile than an endpoint. Everything here is
   built around that: the shape is asserted rather than assumed, the roster is
   a union so a bad parse cannot remove a program, and the generator refuses
   to shrink or to emit a suspiciously short list. A page that changes shape
   fails the Action loudly and leaves the last good registry in place.

   Availability stays derived, now literally: a row gets a `config` because
   teams/<id>.js is on disk, checked here rather than asserted by hand.

   Usage:
     node tools/build-registry.js <standings.html|.webarchive> [--write]

   Without --write it prints the file it would generate and changes nothing. */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");

var root = path.join(__dirname, "..");
var args = process.argv.slice(2);
var files = args.filter(function (a) { return a.charAt(0) !== "-"; });
var WRITE = args.indexOf("--write") !== -1;

function die(msg) { console.error("build-registry: " + msg); process.exit(1); }

// A .webarchive is a binary plist with the HTML inside it; a saved .html is
// the HTML. Either way what is wanted is the one JSON object ESPN embeds.
function html(p) {
  var buf = fs.readFileSync(p);
  if (buf.slice(0, 8).toString("binary") === "bplist00") {
    var i = buf.indexOf(Buffer.from("<!DOCTYPE", "utf8"));
    if (i === -1) i = buf.indexOf(Buffer.from("<html", "utf8"));
    if (i === -1) die("no HTML inside " + p);
    return buf.slice(i).toString("utf8");
  }
  return buf.toString("utf8");
}

// Brace-match the object after the assignment. A regex cannot do this: the
// blob is 450 KB of nested JSON containing every brace character there is,
// including inside strings.
function embedded(doc) {
  var m = /window\['__espnfitt__'\]\s*=\s*/.exec(doc);
  if (!m) die("no __espnfitt__ in that page - ESPN may have changed it");
  var start = m.index + m[0].length;
  var depth = 0, inStr = false, esc = false, i = start;
  for (; i < doc.length; i++) {
    var c = doc[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) break;
  }
  if (depth !== 0) die("__espnfitt__ is truncated - the page did not finish loading");
  try { return JSON.parse(doc.slice(start, i + 1)); }
  catch (e) { die("__espnfitt__ is not JSON: " + e.message); }
}

// An id becomes a file path (teams/<id>.js) and a ?team= value, so it has to
// be plain ASCII and it has to be the obvious spelling - a person building a
// team config will type it from the program's name.
//
// Accents are FOLDED, not dropped: "San Jose State" is what NFD leaves after
// the combining acute comes off, where dropping the whole character leaves
// "san-jos-state", which is nobody's idea of San Jose State. An ampersand is
// dropped rather than spelled: "Texas A&M" is "texas-am", the way it is said
// and the way every provider slugs it, not "texas-aandm".
function slug(s) {
  var t = String(s).toLowerCase();
  if (t.normalize) t = t.normalize("NFD").replace(/[̀-ͯ]/g, "");
  return t
    .replace(/[‘’'`.&]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---- who is FBS, what they are called, and where they play -------------
// A conference either lists its teams directly or splits them across
// divisions. Both shapes appear on the same page (the Sun Belt has divisions;
// the Big Ten does not), so this reads either.
function teamsUnder(group) {
  var out = [];
  (group.standings || []).forEach(function (row) { if (row && row.team) out.push(row.team); });
  (group.children || []).forEach(function (child) {
    out = out.concat(teamsUnder(child));
  });
  return out;
}

function programs(fitt) {
  var groups;
  try { groups = fitt.page.content.standings.groups.groups; } catch (e) { groups = null; }
  if (!Array.isArray(groups) || !groups.length) {
    die("the page has no standings groups - ESPN may have changed its shape");
  }
  var out = [], seenConf = [];
  groups.forEach(function (g) {
    var conf = typeof g.name === "string" && g.name ? g.name : null;
    if (!conf) return;
    seenConf.push(conf);
    teamsUnder(g).forEach(function (t) {
      if (!t || !t.location) return;
      // `location` is the program. On this page `shortDisplayName` is the
      // NICKNAME ("Falcons") rather than a short program name, and `abbrev`
      // is a code ("AFA"); neither is what `short` means here, so `short` is
      // the program name until something actually needs an abbreviation.
      out.push({ name: t.location, short: t.location,
                 conference: conf, espnId: String(t.id || "") });
    });
  });
  return { list: out, conferences: seenConf };
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

function build(fitt) {
  var found = programs(fitt);
  var rows = {};

  // Union: a program already known is never lost to a bad parse.
  existing().forEach(function (t) {
    if (t && t.id) rows[t.id] = { id: t.id, name: t.name, short: t.short, conference: t.conference || null };
  });

  found.list.forEach(function (p) {
    var id = slug(p.name);
    if (!id) return;
    if (rows[id]) {                       // refresh the conference, keep the name
      rows[id].conference = p.conference;
      if (!rows[id].short) rows[id].short = p.short;
      return;
    }
    rows[id] = { id: id, name: p.name, short: p.short, conference: p.conference };
  });

  var list = Object.keys(rows).sort().map(function (k) {
    var r = rows[k];
    r.config = configOnDisk(r.id);
    return r;
  });
  return { list: list, seen: found.list.length, conferences: found.conferences };
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
if (!files.length) die("usage: build-registry.js <standings.html|.webarchive> [--write]");

var built = build(embedded(html(files[0])));
var before = existing().length;
var after = built.list.length;
var selectable = built.list.filter(function (t) { return t.config; });
var noConf = built.list.filter(function (t) { return !t.conference; });

console.error("standings listed " + built.seen + " programs across " +
              built.conferences.length + " conferences");
console.error("registry " + before + " -> " + after + " (" + selectable.length + " selectable)");
if (noConf.length) {
  console.error("  .. " + noConf.length + " row(s) carry no conference: " +
                noConf.map(function (t) { return t.id; }).slice(0, 8).join(", "));
}

// Refusals. This reads a page, so a shape change has to fail loudly rather
// than quietly publishing a short list. Each of these was observed firing.
if (built.seen < 100) {
  die("only " + built.seen + " programs on that page - FBS is ~134, refusing");
}
if (built.conferences.length < 8) {
  die("only " + built.conferences.length + " conferences - refusing");
}
if (after < before) die("refusing to shrink the registry (" + before + " -> " + after + ")");
var lost = existing().filter(function (t) {
  return t && t.id && !built.list.some(function (r) { return r.id === t.id; });
});
if (lost.length) die("refusing to drop " + lost.map(function (t) { return t.id; }).join(", "));
if (selectable.length < 2) die("refusing: only " + selectable.length + " selectable team(s), expected at least 2");

// A stale id is the one way this generator can silently DOUBLE the roster.
// Change how slug() spells a name and the union keeps the old row and adds a
// new one, so the same program appears twice under two ids - and because
// nothing shrank and nothing was dropped, every refusal above passes. Two
// rows with one name is the symptom, and a person has to pick the id and
// rename the config, so this stops rather than guessing.
var byName = {};
built.list.forEach(function (t) { (byName[t.name] = byName[t.name] || []).push(t.id); });
var doubled = Object.keys(byName).filter(function (n) { return byName[n].length > 1; });
if (doubled.length) {
  die("the same program appears under two ids - slug() has changed and " +
      "teams/index.js needs the old id renamed:\n  " +
      doubled.map(function (n) { return n + ": " + byName[n].join(", "); }).join("\n  "));
}

var out = render(built.list);
if (!WRITE) { process.stdout.write(out); process.exit(0); }
fs.writeFileSync(path.join(root, "teams", "index.js"), out);
console.error("wrote teams/index.js");
