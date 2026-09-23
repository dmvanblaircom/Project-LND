#!/usr/bin/env node
/* Did a change to the app's code come with a new service-worker VERSION?

   The worker serves the app's shell - its HTML, CSS and scripts - from cache
   and refreshes each file in the background. That is what makes it fast and
   offline-capable, and it is also how a returning fan can get this week's
   app.js against last week's app.css for one load: a mismatch nobody tests.
   Bumping VERSION in sw.js makes the worker throw the old shell away whole.

   It has worked so far by discipline alone. This makes it a rule: if any of
   the coupled shell files changed between the base and HEAD, VERSION must
   have changed too.

   Deliberately NOT in the rule: teams/index.js. It is generated weekly by the
   roster Action (decision 0017), it is data rather than code, and a newer
   roster alongside an older chooser is harmless - the worker picks it up on
   the next load. Requiring a bump there would turn main red every Tuesday.

   Usage:  node tools/versioncheck.js <base-commit>
   With no usable base (a first push, a manual run) it says so and passes. */
"use strict";
var cp = require("child_process"), fs = require("fs"), path = require("path");

var root = path.join(__dirname, "..");
var base = (process.argv[2] || "").trim();

function git(args) {
  return cp.execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
}
function versionIn(src) {
  var m = /var VERSION\s*=\s*"([^"]+)"/.exec(src || "");
  return m ? m[1] : null;
}

var GENERATED = ["teams/index.js"];

// The coupled shell: what sw.js precaches, less what is generated data.
var sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
var list = /var SHELL_FILES\s*=\s*\[([\s\S]*?)\];/.exec(sw);
if (!list) { console.error("versioncheck: cannot find SHELL_FILES in sw.js"); process.exit(1); }
var shell = (list[1].match(/"([^"]+)"/g) || []).map(function (q) {
  var f = q.slice(1, -1).replace(/^\.\//, "");
  return f === "" ? "index.html" : f;
}).filter(function (f, i, a) { return a.indexOf(f) === i && GENERATED.indexOf(f) === -1; });

if (!base || /^0+$/.test(base)) {
  console.log("versioncheck: no base commit to compare against; nothing to check");
  process.exit(0);
}
try { git(["cat-file", "-e", base + "^{commit}"]); }
catch (e) {
  console.log("versioncheck: base " + base + " is not in this checkout; nothing to check");
  process.exit(0);
}

base = git(["rev-parse", "--short", base]).trim();
var changed = git(["diff", "--name-only", base, "HEAD"]).split("\n").filter(Boolean);
var touched = changed.filter(function (f) { return shell.indexOf(f) !== -1; });
var before = versionIn((function () { try { return git(["show", base + ":sw.js"]); } catch (e) { return ""; } })());
var after = versionIn(sw);

console.log("shell files watched: " + shell.join(", "));
if (!touched.length) {
  console.log("no shell file changed since " + base + "; VERSION " + after + " stands");
  process.exit(0);
}
console.log("shell files changed since " + base + ": " + touched.join(", "));
if (before === after) {
  console.error("\nFAIL sw.js VERSION is still " + after + ". Bump it, or returning fans can be served " +
                "the new " + touched[0] + " against the old versions of the rest.");
  process.exit(1);
}
console.log("VERSION " + before + " -> " + after + ": the old shell will be dropped whole");
