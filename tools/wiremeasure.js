#!/usr/bin/env node
/* Measure the wire's headline rule (teamos/wire.js) on the stories Suite has
   kept: every version of every team's beat-news snapshot in the repository's
   history (data/<team>/news.json, and the root news.json that held Notre
   Dame's before 2026-09-25). The wire brief requires this before any wire
   item reaches a fan.

   A tool, not a check: it needs the repository's full history, which CI's
   shallow clone does not have.

     node tools/wiremeasure.js                        the report, to stdout
     node tools/wiremeasure.js --write                ...and to docs/engineering/wire-measurement-2026-11-09.md
     node tools/wiremeasure.js --dump <file.json>     every distinct story, classified, for grading
     node tools/wiremeasure.js --since 2026-11-10 --sample <file.json>
                                                      a fresh grading sample: only stories first
                                                      seen on or after the date (none of them were
                                                      read while the rule was written), up to 40
                                                      tagged per kind and 200 untagged

   Grades: docs/engineering/wire-grades-2026-11-09.json, made by hand. Each
   graded story has the kind it should have (null: ordinary news), what the
   rule said when it was graded (`v1`), and its sample (`tagged` or
   `untagged`). Every graded story is from the held-out half: stories are
   split in two by a hash of their key, the rule was written reading only
   the "tune" half, and the "held" half was read only to grade.

   The ESPN team feed is not kept anywhere, so only the beat feeds are
   measured. */
"use strict";
var cp = require("child_process"), fs = require("fs"), path = require("path");
var root = path.join(__dirname, "..");
var wire = require(path.join(root, "teamos", "wire.js"));
var GRADES = path.join(root, "docs", "engineering", "wire-grades-2026-11-09.json");
var OUT = path.join(root, "docs", "engineering", "wire-measurement-2026-11-09.md");
var REV = process.env.WIRE_REV || "origin/main";

function git(args) {
  return cp.execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 1024 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
}

// ---- the corpus ------------------------------------------------------------------

function corpus() {
  var log = git(["log", "--format=__C %H %cI", "--name-only", REV, "--", "news.json", "data/*/news.json"]);
  var reqs = [], cur = null;
  log.split("\n").forEach(function (line) {
    if (line.indexOf("__C ") === 0) { var p = line.split(" "); cur = { sha: p[1], at: p[2] }; return; }
    if (!line || !cur) return;
    var team = line === "news.json" ? "notre-dame" : (/^data\/([a-z0-9-]+)\/news\.json$/.exec(line) || [])[1];
    if (team) reqs.push({ sha: cur.sha, at: cur.at, path: line, team: team });
  });
  // Every version, 400 at a time: git cat-file --batch.
  var stories = {}, snaps = {}, out = null, pos = 0;
  reqs.forEach(function (r, n) {
    if (n % 400 === 0) {
      out = cp.execFileSync("git", ["cat-file", "--batch"], { cwd: root, maxBuffer: 1024 * 1024 * 1024,
        input: reqs.slice(n, n + 400).map(function (x) { return x.sha + ":" + x.path; }).join("\n") + "\n" });
      pos = 0;
    }
    var nl = out.indexOf(10, pos), head = out.slice(pos, nl).toString("utf8").split(" ");
    pos = nl + 1;
    if (head[1] === "missing") return;
    var size = +head[2], body = out.slice(pos, pos + size).toString("utf8");
    pos += size + 1;
    var doc; try { doc = JSON.parse(body); } catch (e) { return; }
    var s = snaps[r.team] || (snaps[r.team] = { n: 0, first: r.at, last: r.at });
    s.n++; if (r.at < s.first) s.first = r.at; if (r.at > s.last) s.last = r.at;
    (doc.items || []).forEach(function (it) {
      var k = wire.key(it.link);
      if (!k || !it.title) return;
      var st = stories[k];
      if (!st) st = stories[k] = { team: r.team, title: it.title, source: it.source || "", published: it.published || null, first: r.at, seen: r.at, titles: {} };
      st.titles[it.title] = 1;
      if (r.at < st.first) st.first = r.at;
      if (r.at >= st.seen) { st.seen = r.at; st.title = it.title; }   // the latest headline the outlet gave it
    });
  });
  var list = Object.keys(stories).map(function (k) {
    var s = stories[k], c = wire.classify(s.title);
    return { key: k, team: s.team, source: s.source, published: s.published, firstSeen: s.first, title: s.title,
             retitled: Object.keys(s.titles).length > 1, kind: c ? c.kind : null, cue: c ? c.cue : null, half: half(k) };
  });
  list.sort(function (a, b) { return a.key < b.key ? -1 : 1; });
  return { stories: list, snaps: snaps, rev: git(["rev-parse", "--short", REV]).trim() };
}

function fnv(s) {
  var h = 2166136261;
  for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h;
}
// A stable half for each story, from its key: "tune" or "held".
function half(k) { return fnv(k) % 2 ? "held" : "tune"; }
// A stable pseudo-random order, so a sample does not change between runs.
function shuffle(list, salt) {
  return list.map(function (x) { return { x: x, h: fnv(salt + x.key) }; }).sort(function (a, b) { return a.h - b.h; }).map(function (o) { return o.x; });
}

// A grading sample: up to 40 tagged per kind and 200 untagged.
function sample(stories, salt) {
  var out = [];
  wire.KINDS.forEach(function (k) {
    shuffle(stories.filter(function (s) { return s.kind === k; }), salt).slice(0, 40).forEach(function (s) { out.push({ key: s.key, v1: s.kind, sample: "tagged", title: s.title }); });
  });
  shuffle(stories.filter(function (s) { return !s.kind; }), salt + "-untagged").slice(0, 200).forEach(function (s) { out.push({ key: s.key, v1: null, sample: "untagged", title: s.title }); });
  return out;
}

// ---- the grades --------------------------------------------------------------------

function grades() { try { return JSON.parse(fs.readFileSync(GRADES, "utf8")); } catch (e) { return { stories: {} }; } }

// Precision and recall of `said` (a story's key -> the kind a rule gave it)
// against the graded truth. Tagged stories give precision; the random
// untagged sample estimates what was missed.
function measure(G, said) {
  var by = {}; wire.KINDS.forEach(function (k) { by[k] = { tagged: 0, right: 0 }; });
  var wrong = [], missed = [], untagged = 0;
  Object.keys(G.stories || {}).forEach(function (key) {
    var g = G.stories[key], truth = g.kind == null ? null : g.kind, kind = said(key, g);
    if (kind) {
      by[kind].tagged++;
      if (truth === kind) by[kind].right++; else wrong.push({ g: g, kind: kind, truth: truth });
    }
    if (g.sample === "untagged") {
      untagged++;
      if (truth && truth !== kind) missed.push({ g: g, truth: truth });
    }
  });
  var tagged = 0, right = 0;
  wire.KINDS.forEach(function (k) { tagged += by[k].tagged; right += by[k].right; });
  return { by: by, tagged: tagged, right: right, wrong: wrong, missed: missed, untagged: untagged };
}

function pct(a, b) { return b ? (100 * a / b).toFixed(1) + "%" : "-"; }

function table(L, M) {
  L.push("| Kind | Tagged and graded | Correct | Precision |", "|---|---|---|---|");
  wire.KINDS.forEach(function (k) { L.push("| " + k + " | " + M.by[k].tagged + " | " + M.by[k].right + " | " + pct(M.by[k].right, M.by[k].tagged) + " |"); });
  L.push("| **all** | **" + M.tagged + "** | **" + M.right + "** | **" + pct(M.right, M.tagged) + "** |", "");
}

// ---- the report ----------------------------------------------------------------------

function report(C, G) {
  var S = C.stories, L = [], byKey = {};
  S.forEach(function (s) { byKey[s.key] = s; });
  var teams = Object.keys(C.snaps).sort();
  var counts = {}; wire.KINDS.forEach(function (k) { counts[k] = 0; });
  S.forEach(function (s) { if (s.kind) counts[s.kind]++; });
  var tagged = S.filter(function (s) { return s.kind; }).length;
  var first = teams.map(function (t) { return C.snaps[t].first; }).sort()[0], last = teams.map(function (t) { return C.snaps[t].last; }).sort().slice(-1)[0];
  L.push("# The wire: measuring the headline rule (2026-11-09)", "");
  L.push("Generated by `node tools/wiremeasure.js --write` at " + C.rev + ". The rule is `TeamOS.wire.classify()` (`teamos/wire.js`), with David's taxonomy of 2026-11-09. The grades are by hand (`docs/engineering/wire-grades-2026-11-09.json`).", "");
  L.push("## The corpus", "");
  L.push("- **" + S.length + " distinct stories** (by article key) from **" + teams.length + " teams' beat feeds**, " + first.slice(0, 10) + " to " + last.slice(0, 10) + ".");
  L.push("- Every committed version of every team's `news.json` was read (" + teams.reduce(function (n, t) { return n + C.snaps[t].n; }, 0) + " snapshots). A story an outlet retitled is read under its latest headline (" + S.filter(function (s) { return s.retitled; }).length + " were retitled).");
  L.push("- ESPN's team news is not kept anywhere, so it is not in the corpus.");
  var long = teams.filter(function (t) { return C.snaps[t].first < "2026-10-15"; });
  L.push("- History is short for most teams: " + long.length + " have snapshots from before 2026-10-15 (" + long.map(function (t) { return t + " from " + C.snaps[t].first.slice(0, 10) + ", " + S.filter(function (s) { return s.team === t; }).length + " stories"; }).join("; ") + "). The other " + (teams.length - long.length) + " were added in late October.");
  L.push("- The season is in its second half: no draft picks, few transfers or suspensions. Those kinds are covered by `tools/wirecheck.js`, not measured here.");
  L.push("");
  L.push("## What the current rule tags", "");
  L.push("| Kind | Stories tagged | Share of corpus |", "|---|---|---|");
  wire.KINDS.forEach(function (k) { L.push("| " + k + " | " + counts[k] + " | " + pct(counts[k], S.length) + " |"); });
  L.push("| **all** | **" + tagged + "** | **" + pct(tagged, S.length) + "** |", "");

  if (Object.keys(G.stories || {}).length) {
    var held = S.filter(function (s) { return s.half === "held"; });
    var heldTagged = held.filter(function (s) { return G.stories[s.key] && G.stories[s.key].v1; }).length;
    var V1 = measure(G, function (key, g) { return g.v1; });
    L.push("## The result: the rule as frozen (v1), on stories it had never seen", "");
    L.push("The stories were split in two by a hash of their key. The rule was written reading only one half. It was then frozen, and the other half was graded by hand: every story it tagged there, up to 40 a kind, and 200 of those it left, at random.", "");
    table(L, V1);
    var untaggedHeld = held.length - (S.filter(function (s) { return s.half === "held" && s.kind; }).length);
    var missRate = V1.untagged ? V1.missed.length / V1.untagged : 0;
    L.push("**Precision " + pct(V1.right, V1.tagged) + ": " + (V1.right / V1.tagged >= 0.9 ? "the 90% gate is met." : "the 90% gate is NOT met.") + "**", "");
    L.push("Recall, estimated: " + V1.missed.length + " of the " + V1.untagged + " untagged stories graded should have been wire items (" + pct(V1.missed.length, V1.untagged) + "). One in two hundred is too few to be more than a rough figure: if it holds, about " + Math.round(missRate * untaggedHeld * 2) + " wire stories in the corpus were missed, against about " + Math.round((V1.right / V1.tagged) * tagged) + " found: recall about " +
           pct((V1.right / V1.tagged) * tagged, (V1.right / V1.tagged) * tagged + missRate * untaggedHeld * 2) + ". The rule is built to miss rather than mislabel, so this is the side it errs on.", "");
    L.push("Every mislabel:", "");
    V1.wrong.forEach(function (w) { L.push("- tagged **" + w.kind + "**, should be **" + (w.truth || "news") + "**: \"" + w.g.title + "\"" + (w.g.note ? " (" + w.g.note + ")" : "")); });
    L.push("", "Missed:", "");
    V1.missed.forEach(function (w) { L.push("- should be **" + w.truth + "**: \"" + w.g.title + "\"" + (w.g.note ? " (" + w.g.note + ")" : "")); });
    L.push("");

    var V2 = measure(G, function (key) { var s = byKey[key]; return s ? s.kind : null; });
    L.push("## The current rule (v2) on the same graded stories: NOT a clean measure", "");
    L.push("v2 fixes the causes of v1's mislabels. These stories were read to find them, so the figure below is the rule re-checked against what it was corrected on, not a measurement. The gate needs a fresh one: `node tools/wiremeasure.js --since <date> --sample <file>` draws a sample of stories first seen after the rule was written.", "");
    table(L, V2);
    if (V2.wrong.length) { L.push("Still wrong:", ""); V2.wrong.forEach(function (w) { L.push("- tagged **" + w.kind + "**, should be **" + (w.truth || "news") + "**: \"" + w.g.title + "\""); }); L.push(""); }
    if (V2.missed.length) { L.push("Still missed:", ""); V2.missed.forEach(function (w) { L.push("- should be **" + w.truth + "**: \"" + w.g.title + "\""); }); L.push(""); }
    var changed = Object.keys(G.stories).filter(function (k) { return byKey[k] && (byKey[k].kind || null) !== (G.stories[k].v1 || null); });
    L.push("v1 and v2 differ on " + changed.length + " of the " + Object.keys(G.stories).length + " graded stories; on the whole corpus, v2 tags " + tagged + " stories.", "");
  }
  L.push("## A sample of each kind (current rule)", "");
  wire.KINDS.forEach(function (k) {
    var list = shuffle(S.filter(function (s) { return s.kind === k; }), "sample").slice(0, 8);
    L.push("**" + k + "**", "");
    list.forEach(function (s) { L.push("- \"" + s.title + "\" (" + s.source + "; cue \"" + s.cue + "\")"); });
    if (!list.length) L.push("- none in the corpus");
    L.push("");
  });
  return L.join("\n") + "\n";
}

if (require.main === module) {
  var args = process.argv.slice(2);
  function arg(name) { var i = args.indexOf(name); return i === -1 ? null : args[i + 1]; }
  var C = corpus();
  if (arg("--dump")) fs.writeFileSync(arg("--dump"), JSON.stringify(C.stories, null, 1));
  if (arg("--since")) {
    var fresh = C.stories.filter(function (s) { return s.firstSeen >= arg("--since"); });
    var out = sample(fresh, "since-" + arg("--since"));
    if (arg("--sample")) fs.writeFileSync(arg("--sample"), JSON.stringify(out, null, 1));
    console.log(fresh.length + " stories first seen since " + arg("--since") + "; sample of " + out.length + (arg("--sample") ? " written to " + arg("--sample") : ""));
    process.exit(0);
  }
  var text = report(C, grades());
  if (args.indexOf("--write") !== -1) fs.writeFileSync(OUT, text);
  process.stdout.write(text);
}

module.exports = { corpus: corpus, half: half, shuffle: shuffle, sample: sample, measure: measure };
