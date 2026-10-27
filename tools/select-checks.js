#!/usr/bin/env node
/* Which checks a change needs (David, 2026-10-27: one standard set; each
   merge runs the ones that are relevant and skips the rest).

     node tools/select-checks.js --base <commit>      what this branch needs
     node tools/select-checks.js --all                 everything
     node tools/select-checks.js --base <c> --github   the same, as GitHub outputs

   Rules, by the files changed since the base (tools/checks.json lists the
   checks). Each file is matched by the first rule that fits; the checks a
   change needs are the union over its files, plus the `always` ones.

     anything the page runs on          everything: app.js, app.css,
                                        index.html, sw.js, chooser.js, the
                                        manifest, suite/, teamos/, leagues/,
                                        assets/, the test harness (tools/lib/,
                                        tools/fixtures/, a11yaudit.js), the
                                        package files, this selector and the
                                        check workflow itself; and the two
                                        teams the browser checks render
                                        (Notre Dame, Ohio State) and the
                                        registry the chooser lists
     another team's config              the checks that read every team's
                                        config (boot, registry, chooser,
                                        worker, adapter, identity, pipeline,
                                        recruiting refresh) and the team-font
                                        check
     a producer (tools/producers/)      the Python checks that import it, and
                                        the pipeline check; teamconfig.py,
                                        which every producer imports, all of
                                        the Python checks
     a check script                     that check
     the edge API (worker/)             its check
     the data refresh (odds.yml)        the pipeline, cadence, recruiting and
                                        freshness checks
     docs, data, notes, other workflows,
     the probe and capture lists        nothing beyond `always`

   Anything no rule names runs everything. When in doubt, it checks: a
   wasted check costs minutes, a skipped one can ship a break. Pushes to
   main and the nightly run check everything regardless (check.yml), so a
   rule that is too narrow is caught the same day. */
"use strict";
var fs = require("fs"), path = require("path"), cp = require("child_process");
var ROOT = path.join(__dirname, "..");
var MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, "tools", "checks.json"), "utf8"));
var CHECKS = MANIFEST.checks;
var BY_ID = {}; CHECKS.forEach(function (c) { BY_ID[c.id] = c; });

var EVERYTHING = [
  /^(app\.js|app\.css|index\.html|sw\.js|chooser\.js|manifest\.json|package\.json|package-lock\.json)$/,
  /^(suite|teamos|leagues|assets)\//,
  /^tools\/(lib|fixtures)\//,
  /^tools\/(a11yaudit\.js|checks\.json|select-checks\.js|run-checks\.js)$/,
  /^\.github\/workflows\/check\.yml$/,
  /^teams\/(index|notre-dame|ohio-state)\.js$/
];
var TEAM_CHECKS = ["bootcheck.js", "registrycheck.js", "choosercheck.js", "swcheck.js", "adaptercheck.js",
                   "identitycheck.js", "pipelinecheck.py", "prospectsrefreshcheck.py", "teamfontcheck.js"];
var REFRESH_CHECKS = ["pipelinecheck.py", "cadencecheck.py", "prospectsrefreshcheck.py", "freshnesscheck.py"];

// The Python checks that import a producer, read from the checks themselves.
function importers(producer) {
  return CHECKS.filter(function (c) { return /\.py$/.test(c.id); }).filter(function (c) {
    var src = fs.readFileSync(path.join(ROOT, "tools", c.id), "utf8");
    return new RegExp("^\\s*(import|from)\\s+" + producer + "\\b", "m").test(src) ||
           new RegExp("^\\s*import\\s+[\\w ,]*\\b" + producer + "\\b", "m").test(src) ||
           src.indexOf("producers/" + producer + ".py") !== -1;
  }).map(function (c) { return c.id; });
}

// -> { rule, checks } for one changed file; checks null means everything.
function forFile(f) {
  if (EVERYTHING.some(function (re) { return re.test(f); })) return { rule: "the page runs on it", checks: null };
  if (/^teams\/[a-z0-9-]+\.js$/.test(f)) return { rule: "a team's config", checks: TEAM_CHECKS };
  var m = /^tools\/producers\/([a-z0-9_]+)\.py$/.exec(f);
  if (m) {
    if (m[1] === "teamconfig") return { rule: "every producer's team config", checks: CHECKS.filter(function (c) { return /\.py$/.test(c.id); }).map(function (c) { return c.id; }) };
    return { rule: "a producer", checks: importers(m[1]).concat(["pipelinecheck.py"]) };
  }
  m = /^tools\/([a-z0-9_-]+check\.(?:js|py|mjs))$/.exec(f);
  if (m && BY_ID[m[1]]) return { rule: "a check", checks: CHECKS.filter(function (c) { return (c.file || c.id) === m[1]; }).map(function (c) { return c.id; }) };
  if (m && MANIFEST.elsewhere[m[1]]) return { rule: "a check run elsewhere (" + MANIFEST.elsewhere[m[1]] + ")", checks: [] };
  if (/^worker\//.test(f)) return { rule: "the edge API", checks: ["workercheck.mjs"] };
  if (/^\.github\/workflows\/odds\.yml$/.test(f)) return { rule: "the data refresh", checks: REFRESH_CHECKS };
  if (/^tools\/(build-registry|registry-ids)\.js$/.test(f)) return { rule: "the registry generator", checks: ["registrycheck.js", "choosercheck.js"] };
  if (/^(docs|data)\//.test(f) || /^[^/]+\.md$/.test(f) || /^\.github\/workflows\/[^/]+\.yml$/.test(f) ||
      /^tools\/(probe-urls\.txt|fixtures\/capture-requests\.txt)$/.test(f) ||
      /^tools\/(probe_sources|cfbd_probe|cfbd_sp_probe|trim_summary|capture_[a-z_]+)\.py$/.test(f) ||
      /^\.gitignore$/.test(f))
    return { rule: "not run by the app", checks: [] };
  return { rule: "no rule names it", checks: null };
}

// -> { all, ids, why: [{ file, rule }] }
function select(files) {
  var all = false, want = {}, why = [];
  files.forEach(function (f) {
    var r = forFile(f);
    why.push({ file: f, rule: r.rule });
    if (r.checks === null) all = true; else r.checks.forEach(function (id) { want[id] = true; });
  });
  CHECKS.forEach(function (c) { if (c.always || all) want[c.id] = true; });
  return { all: all, ids: CHECKS.map(function (c) { return c.id; }).filter(function (id) { return want[id]; }), why: why };
}

// The browser checks in up to `max` shards of about `target` seconds each,
// longest first onto the lightest shard.
function shards(ids, max, target) {
  var list = ids.map(function (id) { return BY_ID[id]; }).filter(function (c) { return c.kind === "browser"; })
    .sort(function (a, b) { return (b.secs || 30) - (a.secs || 30); });
  if (!list.length) return [];
  var total = list.reduce(function (s, c) { return s + (c.secs || 30); }, 0);
  var n = Math.max(1, Math.min(max || 4, Math.ceil(total / (target || 200)), list.length));
  var out = []; for (var i = 0; i < n; i++) out.push({ secs: 0, ids: [] });
  list.forEach(function (c) {
    var s = out.reduce(function (a, b) { return b.secs < a.secs ? b : a; });
    s.ids.push(c.id); s.secs += c.secs || 30;
  });
  return out.map(function (s) { return s.ids; });
}

function changed(base) {
  var out = cp.execFileSync("git", ["diff", "--name-only", base + "...HEAD"], { cwd: ROOT, encoding: "utf8" });
  return out.split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
}

module.exports = { select: select, shards: shards, forFile: forFile, CHECKS: CHECKS, MANIFEST: MANIFEST };

if (require.main === module) {
  var args = process.argv.slice(2), base = null, everything = args.indexOf("--all") !== -1;
  var bi = args.indexOf("--base"); if (bi !== -1) base = args[bi + 1];
  var sel;
  if (everything || !base) sel = { all: true, ids: CHECKS.map(function (c) { return c.id; }), why: [{ file: "(everything asked for)", rule: "full run" }] };
  else {
    var files;
    try { files = changed(base); } catch (e) { files = null; }
    sel = files ? select(files) : { all: true, ids: CHECKS.map(function (c) { return c.id; }), why: [{ file: "(no usable base " + base + ")", rule: "full run" }] };
  }
  var unit = sel.ids.filter(function (id) { return BY_ID[id].kind === "unit"; });
  var browser = shards(sel.ids, 4, 200);
  var visual = sel.ids.indexOf("visualcheck.js") !== -1 ? ["320", "375", "390", "1280"] : [];
  sel.why.forEach(function (w) { console.log("  " + w.file + ": " + w.rule); });
  console.log((sel.all ? "everything" : sel.ids.length + " of " + CHECKS.length + " checks") + ": " + unit.length + " unit, " +
              browser.reduce(function (s, x) { return s + x.length; }, 0) + " browser in " + browser.length + " shard(s), visual " + (visual.length ? "at " + visual.join(", ") : "skipped"));
  var skipped = CHECKS.filter(function (c) { return sel.ids.indexOf(c.id) === -1; }).map(function (c) { return c.id; });
  if (skipped.length) console.log("skipped: " + skipped.join(", "));
  if (args.indexOf("--github") !== -1 && process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT,
      "unit=" + JSON.stringify(unit) + "\n" + "browser=" + JSON.stringify(browser) + "\n" + "visual=" + JSON.stringify(visual) + "\n");
  }
  if (args.indexOf("--ids") !== -1) process.stdout.write(sel.ids.join("\n") + "\n");
}
