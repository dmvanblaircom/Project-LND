#!/usr/bin/env node
/* Is the installed product Suite, the same for every team?

   Decision 0024 §11: the manifest, installed name, favicon, icons and default
   share card are Suite's. A team changes the experience inside Suite, never
   the install. This checks the shell says so, that every identity file it
   names exists and is cached offline, and that no team product brand or
   internal project name has crept back into it.

   Usage:  node tools/identitycheck.js            (exit 1 on any failure)
           node tools/identitycheck.js --release  (also refuses TEMPORARY
                                                   identity assets - run for
                                                   main, so they cannot ship) */

var fs = require("fs");
var path = require("path");

var ROOT = path.join(__dirname, "..");
var release = process.argv.indexOf("--release") > -1;
var failures = 0;

function ok(cond, what) {
  console.log((cond ? "  ok   " : "  FAIL ") + what);
  if (!cond) failures++;
}
function read(f) { return fs.readFileSync(path.join(ROOT, f), "utf8"); }
function exists(f) { return fs.existsSync(path.join(ROOT, f.replace(/^\.\//, ""))); }

var html = read("index.html");
var head = html.slice(0, html.indexOf("</head>"));
var manifest = JSON.parse(read("manifest.json"));
var sw = read("sw.js");
var shellFiles = (sw.match(/var SHELL_FILES = \[([\s\S]*?)\];/) || ["", ""])[1]
  .match(/"[^"]+"/g).map(function (s) { return s.slice(1, -1).replace(/^\.\//, ""); });

function metaContent(attr, key) {
  var m = head.match(new RegExp("<meta " + attr + '="' + key.replace(/:/g, "\\:") + '" content="([^"]*)"'));
  return m ? m[1] : null;
}
function linkHrefs(rel) {
  var out = [], re = new RegExp('<link rel="' + rel + '"[^>]*href="([^"]+)"', "g"), m;
  while ((m = re.exec(head))) out.push(m[1]);
  return out;
}

console.log("the manifest");
ok(manifest.name === "Suite" && manifest.short_name === "Suite", "the installed app is named Suite");
ok(manifest.start_url === "./" && manifest.scope === "./",
   "it starts at the neutral root; a stored team is restored after launch (decision 0016)");
ok(Array.isArray(manifest.icons) && manifest.icons.length >= 3, "it names its icons");
ok(manifest.icons.some(function (i) { return i.purpose === "maskable"; }), "including a maskable one");
manifest.icons.forEach(function (i) {
  ok(exists(i.src), "icon " + i.src + " exists");
});

console.log("the document head");
ok(/<title>Suite<\/title>/.test(head), "the static title is Suite: no team is chosen yet");
ok(metaContent("name", "application-name") === "Suite", "application-name is Suite");
ok(metaContent("name", "apple-mobile-web-app-title") === "Suite", "the iOS home-screen title is Suite");
ok(metaContent("property", "og:title") === "Suite", "the default share title is Suite");
eq1(linkHrefs("manifest"), ["manifest.json"], "one manifest, the Suite's");
var headAssets = linkHrefs("icon").concat(linkHrefs("apple-touch-icon"));
ok(headAssets.length >= 2, "a favicon and a home-screen icon");
headAssets.forEach(function (a) {
  ok(exists(a), a + " exists");
  ok(shellFiles.indexOf(a) > -1, a + " is precached with the shared shell (sw.js)");
});
var og = metaContent("property", "og:image");
ok(og && exists(og), "a default share image exists: " + og);
ok(shellFiles.indexOf("manifest.json") > -1, "the manifest is precached with the shared shell");

function eq1(a, b, what) { ok(JSON.stringify(a) === JSON.stringify(b), what + " (" + JSON.stringify(a) + ")"); }

console.log("no team owns the install");
var teamManifests = fs.readdirSync(path.join(ROOT, "assets")).filter(function (d) {
  return d !== "suite" && fs.existsSync(path.join(ROOT, "assets", d, "manifest.json"));
});
eq1(teamManifests, [], "no team folder carries a manifest of its own");
var brands = /Irish Watch|Buckeye Watch|Project LND/i;
ok(!brands.test(head), "the head names no team product and no internal project");
ok(!brands.test(JSON.stringify(manifest)), "nor does the manifest");
fs.readdirSync(path.join(ROOT, "teams")).filter(function (f) { return /\.js$/.test(f); }).forEach(function (f) {
  var src = read("teams/" + f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  ok(!/\b(productName|manifest|shareTitle)\s*:/.test(src), "teams/" + f + " declares no install identity");
  ok(!brands.test(src), "teams/" + f + " carries no team product brand");
});
// Customer-facing strings in the Suite's own scripts: a quoted string, not a comment.
["app.js", "chooser.js", "suite/ui.js", "suite/nav.js"].forEach(function (f) {
  var src = read(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  ok(!/["'][^"'\n]*(Irish Watch|Buckeye Watch|Project LND)[^"'\n]*["']/i.test(src),
     f + " puts no team product or project name in front of a fan");
});

console.log(release ? "release: no temporary identity" : "temporary identity (allowed off main)");
var referenced = manifest.icons.map(function (i) { return i.src; }).concat(headAssets, [og], shellFiles);
var temp = referenced.filter(function (p) { return /TEMPORARY/.test(p || ""); });
var tempFiles = fs.readdirSync(path.join(ROOT, "assets", "suite")).filter(function (f) { return /TEMPORARY/.test(f); });
if (release) {
  eq1(temp.filter(function (p, i) { return temp.indexOf(p) === i; }), [],
      "the shell references no TEMPORARY Suite identity asset");
  eq1(tempFiles, [], "assets/suite holds no TEMPORARY file");
} else {
  console.log("       " + tempFiles.length + " TEMPORARY file(s) in assets/suite; --release refuses them");
}

console.log("\n" + (failures ? failures + " check(s) FAILED" : "the installed product is Suite"));
process.exit(failures ? 1 : 0);
