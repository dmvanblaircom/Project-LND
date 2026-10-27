#!/usr/bin/env node
/* The check selector (tools/select-checks.js): every check is listed, a
   change runs what it needs, and anything unclassified runs everything.

   Usage: node tools/selectcheck.js     (exit 1 on failure) */
"use strict";
var fs = require("fs"), path = require("path");
var sel = require("./select-checks.js");
var root = path.join(__dirname, "..");

var failures = 0;
function ok(cond, what) { if (cond) { console.log("  ok   " + what); return; } failures++; console.log("  FAIL " + what); }
var ALL = sel.CHECKS.length;
function pick(files) { return sel.select(files); }
function has(s, id) { return s.ids.indexOf(id) !== -1; }
var ALWAYS = sel.CHECKS.filter(function (c) { return c.always; }).map(function (c) { return c.id; });

console.log("every check is listed, once");
var listed = {}; sel.CHECKS.forEach(function (c) { listed[c.file || c.id] = true; });
var files = fs.readdirSync(path.join(root, "tools")).filter(function (f) { return /check\.(js|py|mjs)$/.test(f); });
var missing = files.filter(function (f) { return !listed[f] && !sel.MANIFEST.elsewhere[f]; });
ok(!missing.length, "every check script in tools/ is in tools/checks.json or runs elsewhere (" + (missing.join(", ") || "none missing") + ")");
var ids = sel.CHECKS.map(function (c) { return c.id; });
ok(ids.length === new Set(ids).size, "no check is listed twice");
ok(sel.CHECKS.every(function (c) { return c.id === "syntax" || fs.existsSync(path.join(root, "tools", c.file || c.id)); }), "and every one listed exists");
var wf = fs.readFileSync(path.join(root, ".github", "workflows", "check.yml"), "utf8");
ok(!/node tools\/[a-z]+check\.|python3 tools\/[a-z]+check\./.test(wf), "check.yml names no check itself: they all come from the list");
ok(sel.CHECKS.every(function (c) { return ["unit", "browser", "visual"].indexOf(c.kind) !== -1; }), "each is a unit, browser or visual check");
var pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")), pw = (pkg.devDependencies || {}).playwright || (pkg.dependencies || {}).playwright;
var images = (wf.match(/mcr\.microsoft\.com\/playwright:v([0-9.]+)-/g) || []).map(function (m) { return m.replace(/^.*:v|-$/g, ""); });
ok(images.length === 2 && images.every(function (v) { return v === pw; }),
   "the browser and visual jobs run Playwright's own image at package.json's version, " + pw + " (" + images.join(", ") + ")");

console.log("what a change runs");
var d = pick(["docs/engineering/backlog.md", "data/notre-dame/news.json", "README.md"]);
ok(!d.all && d.ids.join() === ALWAYS.join(), "docs and data: only the ones that always run (" + d.ids.join(", ") + ")");
ok(pick(["app.js"]).all && pick(["suite/home.js"]).all && pick(["teamos/espn.js"]).all && pick(["index.html"]).all && pick(["sw.js"]).all,
   "the page, its scripts, TeamOS and the worker: everything");
ok(pick(["tools/fixtures/espn-schedule.json"]).all && pick(["tools/lib/serve.js"]).all, "the test harness and fixtures: everything");
ok(pick([".github/workflows/check.yml"]).all && pick(["tools/checks.json"]).all && pick(["tools/select-checks.js"]).all,
   "the checks' own workflow, list and selector: everything");
ok(pick(["teams/notre-dame.js"]).all && pick(["teams/ohio-state.js"]).all && pick(["teams/index.js"]).all,
   "the two teams the browser checks render, and the registry the chooser lists: everything");
var t = pick(["teams/indiana.js"]);
ok(!t.all && has(t, "bootcheck.js") && has(t, "adaptercheck.js") && has(t, "pipelinecheck.py") && has(t, "teamfontcheck.js") && !has(t, "visualcheck.js"),
   "another team's config: the checks that read every team (" + t.ids.length + " of " + ALL + ")");
var p = pick(["tools/producers/beat_news.py"]);
ok(!p.all && has(p, "newscheck.py") && has(p, "pipelinecheck.py") && !has(p, "launchcheck.js"), "a producer: the checks that import it, and the pipeline (" + p.ids.filter(function (i) { return ALWAYS.indexOf(i) === -1; }).join(", ") + ")");
var tc = pick(["tools/producers/teamconfig.py"]);
ok(!tc.all && sel.CHECKS.filter(function (c) { return /\.py$/.test(c.id); }).every(function (c) { return has(tc, c.id); }), "teamconfig.py, which every producer imports: every Python check");
var c = pick(["tools/launchcheck.js"]);
ok(!c.all && has(c, "launchcheck.js") && c.ids.length === ALWAYS.length + 1, "a check script: that check");
ok(pick(["tools/identitycheck.js"]).ids.indexOf("identitycheck-release") !== -1 && pick(["tools/identitycheck.js"]).ids.indexOf("identitycheck.js") !== -1, "both runs of a check that runs twice");
ok(has(pick(["worker/src/push.js"]), "workercheck.mjs") && !pick(["worker/src/push.js"]).all, "the edge API: its check");
ok(has(pick(["tools/reviewsheet.js"]), "newteamscheck.js") && !pick(["tools/newteams.js"]).all, "the tools for adding teams: their check");
ok(has(pick([".github/workflows/odds.yml"]), "cadencecheck.py") && !pick([".github/workflows/odds.yml"]).all, "the data refresh: its checks");
ok(!pick([".github/workflows/probe-feeds.yml", "tools/probe-urls.txt"]).all, "a probe or another workflow: nothing more");
ok(pick(["somewhere/new.thing"]).all && pick(["tools/new_helper.py"]).all, "anything no rule names: everything");
var mix = pick(["docs/x.md", "app.css"]);
ok(mix.all, "and a change is the union of its files: docs plus the stylesheet is everything");
ok(ALWAYS.indexOf("versioncheck.js") !== -1 && ALWAYS.indexOf("syntax") !== -1 && ALWAYS.indexOf("selectcheck.js") !== -1, "the version, syntax and this check always run");

console.log("the browser shards");
var every = sel.CHECKS.map(function (c) { return c.id; });
var sh = sel.shards(every, 4, 200);
var flat = [].concat.apply([], sh);
var browser = sel.CHECKS.filter(function (c) { return c.kind === "browser"; }).map(function (c) { return c.id; });
ok(sh.length === 4 && flat.length === browser.length && browser.every(function (id) { return flat.indexOf(id) !== -1; }), "every browser check in exactly one of 4 shards");
var secs = sh.map(function (s) { return s.reduce(function (n, id) { return n + sel.CHECKS.filter(function (c) { return c.id === id; })[0].secs; }, 0); });
ok(Math.max.apply(null, secs) - Math.min.apply(null, secs) <= 60, "balanced by their times (" + secs.join("s, ") + "s)");
ok(sel.shards(["launchcheck.js"], 4, 200).length === 1 && sel.shards(["syntax"], 4, 200).length === 0, "one check is one shard; none is none");

console.log("\n" + (failures ? failures + " check(s) FAILED" : "each change runs what it needs, and anything unclassified runs everything"));
process.exit(failures ? 1 : 0);
