#!/usr/bin/env node
/* Run checks from tools/checks.json, one after another, and say which
   failed. The same runner in CI and locally, so a check means the same
   thing in both.

     node tools/run-checks.js --base origin/main    what this branch needs (tools/select-checks.js)
     node tools/run-checks.js --all                 everything
     node tools/run-checks.js --ids '["a","b"]'     these (a CI job's share)

   versioncheck compares against $CHECK_BASE (set from --base when it is
   not set already). Every check runs even after one fails, so one run shows
   every failure. Exit 1 when any failed. */
"use strict";
var cp = require("child_process"), path = require("path");
var sel = require("./select-checks.js");
var ROOT = path.join(__dirname, "..");

var args = process.argv.slice(2);
function arg(name) { var i = args.indexOf(name); return i === -1 ? null : args[i + 1]; }
var ids;
if (arg("--ids")) ids = JSON.parse(arg("--ids"));
else if (args.indexOf("--all") !== -1 || !arg("--base")) ids = sel.CHECKS.map(function (c) { return c.id; });
else {
  var files = cp.execFileSync("git", ["diff", "--name-only", arg("--base") + "...HEAD"], { cwd: ROOT, encoding: "utf8" })
    .split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
  var s = sel.select(files);
  s.why.forEach(function (w) { console.log("  " + w.file + ": " + w.rule); });
  ids = s.ids;
}
var env = Object.assign({}, process.env);
if (!env.CHECK_BASE && arg("--base")) env.CHECK_BASE = arg("--base");
var byId = {}; sel.CHECKS.forEach(function (c) { byId[c.id] = c; });
var ci = !!process.env.GITHUB_ACTIONS, failed = [], t0 = Date.now();
console.log("running " + ids.length + " check(s)");
ids.forEach(function (id) {
  var c = byId[id];
  if (!c) { console.log("FAIL " + id + ": not in tools/checks.json"); failed.push(id); return; }
  var t = Date.now();
  if (ci) console.log("::group::" + id);
  var r = cp.spawnSync("bash", ["-c", c.run], { cwd: ROOT, env: env, stdio: ci ? "inherit" : ["ignore", "pipe", "pipe"], encoding: "utf8" });
  if (ci) console.log("::endgroup::");
  var secs = Math.round((Date.now() - t) / 1000);
  if (r.status === 0) { console.log("  ok   " + id + " (" + secs + "s)"); return; }
  failed.push(id);
  console.log((ci ? "::error::" : "  FAIL ") + id + " failed (" + secs + "s)");
  if (!ci) console.log(((r.stdout || "") + (r.stderr || "")).split("\n").filter(function (l) { return /FAIL|Error|error/.test(l); }).slice(0, 12).map(function (l) { return "       " + l; }).join("\n"));
});
console.log("\n" + (ids.length - failed.length) + " of " + ids.length + " passed in " + Math.round((Date.now() - t0) / 1000) + "s" + (failed.length ? "; failed: " + failed.join(", ") : ""));
process.exit(failed.length ? 1 : 0);
