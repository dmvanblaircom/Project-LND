#!/usr/bin/env node
/* What a pull request changes on screen (David, 2026-11-25: "missing some
   obvious visual fails"; decision 0048). The checks test rules - contrast,
   overflow, a winner that stands out - and miss what only a person sees: a
   stadium photo of the roof, a badge that differs between two screens. This
   shows the person. It draws the same screens on the base and on this
   checkout, finds the ones whose pixels changed, and lays each changed one
   out before | after, cropped to where it changed.

     node tools/changesheet.js --base <checkout of the base> [--out dir] [--reuse]

   Screens: the colour-extreme teams (tools/teamsets/extremes.txt), Home in
   four states and Game in three, the whole page at a phone's width; and
   Notre Dame and Ohio State's Home at desktop width. Both sides are drawn by
   this checkout's tools/stagereview.js (STAGE_ROOT serves the base's app),
   still (no motion, every image and font settled), so a screen that did not
   change draws the same pixels twice.

   Writes <out>/sheet-<n>.jpg (the changed screens, eight to a sheet),
   <out>/summary.md and <out>/summary.json. A tool for review: it passes or
   fails nothing. Exit 1 only when it could not draw.

   Env: CHANGE_TEAMS (comma list) or CHANGE_TEAMS_FILE; PW_CHROMIUM;
        ALLOW_PROVIDER_IMAGES=1 (CI: real team marks). */
"use strict";
var fs = require("fs"), path = require("path"), cp = require("child_process");
var chromium = require("playwright").chromium;
var root = path.join(__dirname, "..");

var args = process.argv.slice(2);
function arg(n) { var i = args.indexOf(n); return i === -1 ? null : args[i + 1]; }
var BASE = arg("--base");
if (!BASE || !fs.existsSync(path.join(BASE, "index.html"))) { console.error("usage: changesheet.js --base <checkout of the base> [--out dir]"); process.exit(2); }
BASE = path.resolve(BASE);
var OUT = path.resolve(arg("--out") || path.join(root, "artifacts", "changes"));
// --reuse: lay out an earlier run's drawings again, without drawing
var REUSE = args.indexOf("--reuse") !== -1;
if (!REUSE) fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

function teamList() {
  if (process.env.CHANGE_TEAMS) return process.env.CHANGE_TEAMS.split(",");
  var f = process.env.CHANGE_TEAMS_FILE || path.join(root, "tools", "teamsets", "extremes.txt");
  return fs.readFileSync(f, "utf8").replace(/#.*/g, "").split(/\s+/).filter(Boolean);
}
var TEAMS = teamList();
var PROOF = ["notre-dame", "ohio-state"].filter(function (t) { return TEAMS.indexOf(t) !== -1; });

// Each run: the screens stagereview draws, by its own env.
var RUNS = [
  { STAGE_TEAMS: TEAMS.join(","), STAGE_WIDTHS: "390", STAGE_STATES: "pre-far,live,halftime,final-win" },
  { STAGE_TEAMS: TEAMS.join(","), STAGE_WIDTHS: "390", STAGE_STATES: "pre-far,live,final-win", STAGE_SCREEN: "game" }
];
if (PROOF.length) RUNS.push({ STAGE_TEAMS: PROOF.join(","), STAGE_WIDTHS: "1280", STAGE_STATES: "pre-far,live" });

function draw(side, appRoot) {
  var dir = path.join(OUT, side);
  return RUNS.reduce(function (p, run) {
    return p.then(function () {
      return new Promise(function (resolve, reject) {
        var env = Object.assign({}, process.env, run, { STAGE_STYLES: "team", STAGE_FULL: "1", STAGE_STILL: "1" });
        if (appRoot) env.STAGE_ROOT = appRoot; else delete env.STAGE_ROOT;
        var c = cp.spawn(process.execPath, [path.join(__dirname, "stagereview.js"), dir], { env: env, stdio: ["ignore", "pipe", "inherit"] });
        var log = "";
        c.stdout.on("data", function (d) { log += d; });
        c.on("exit", function (code) {
          var skipped = log.split("\n").filter(function (l) { return /skipped/.test(l); });
          skipped.forEach(function (l) { console.log("  " + side + ":" + l); });
          code === 0 ? resolve() : reject(new Error(side + " drawing failed (" + code + ")\n" + log.slice(-2000)));
        });
      });
    });
  }, Promise.resolve());
}

// Pixels that differ by more than a hair (anti-aliasing can move a channel a
// few steps between two runs of the same page), and where.
function compare(page, a, b) {
  return page.evaluate(function (p) {
    function load(src) { return new Promise(function (r, j) { var i = new Image(); i.onload = function () { r(i); }; i.onerror = j; i.src = src; }); }
    return Promise.all([load(p.a), load(p.b)]).then(function (im) {
      var w = Math.max(im[0].width, im[1].width), h = Math.max(im[0].height, im[1].height);
      function px(img) { var c = document.createElement("canvas"); c.width = w; c.height = h; var x = c.getContext("2d"); x.fillStyle = "#f0f"; x.fillRect(0, 0, w, h); x.drawImage(img, 0, 0); return x.getImageData(0, 0, w, h).data; }
      // Counted in 8px blocks, and a block counts only with 6 or more
      // changed pixels in it: a photo or a provider's mark can decode a few
      // scattered pixels differently between runs (CI, #283: 1,200 such
      // pixels across Game's header ringed the whole header for a 9px dot).
      // A real change - a dot, a word, a border - fills its blocks.
      var A = px(im[0]), B = px(im[1]), S = 8, bw = Math.ceil(w / S), bh = Math.ceil(h / S), blocks = new Uint16Array(bw * bh);
      for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
        var i = (y * w + x) * 4;
        if (Math.abs(A[i] - B[i]) > 24 || Math.abs(A[i + 1] - B[i + 1]) > 24 || Math.abs(A[i + 2] - B[i + 2]) > 24) blocks[((y / S) | 0) * bw + ((x / S) | 0)]++;
      }
      var n = 0, x0 = w, y0 = h, x1 = -1, y1 = -1;
      for (var by = 0; by < bh; by++) for (var bx = 0; bx < bw; bx++) {
        var c = blocks[by * bw + bx];
        if (c < 6) continue;
        n += c;
        x0 = Math.min(x0, bx * S); y0 = Math.min(y0, by * S); x1 = Math.max(x1, Math.min(w, bx * S + S) - 1); y1 = Math.max(y1, Math.min(h, by * S + S) - 1);
      }
      return { pixels: n, box: n ? [x0, y0, x1, y1] : null, before: [im[0].width, im[0].height], after: [im[1].width, im[1].height] };
    });
  }, { a: a, b: b });
}
// width and height from a PNG's header
function pngSize(f) { var b = fs.readFileSync(f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; }
function dataUrl(f) { return "data:image/png;base64," + fs.readFileSync(f).toString("base64"); }
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
function label(file) { return file.replace(/\.png$/, "").replace("-team-", " ").replace(/-(\d+)$/, " at $1"); }

// One row: the changed region of each side, the same window on both.
function row(c) {
  var bw = (c.before || c.after)[0], aw = (c.after || c.before)[0], bh = (c.before || c.after)[1], ah = (c.after || c.before)[1];
  var wide = bw > 600 || aw > 600, scale = wide ? 0.42 : 0.9;
  var top = Math.max(0, c.box[1] - 120), bottom = Math.min(Math.max(bh, ah), c.box[3] + 120);
  var height = Math.min(Math.max(bottom - top, 360), wide ? 900 : 1100);
  function side(dir, size, tag) {
    if (!size) return '<figure><figcaption>' + tag + '</figcaption><div class="none" style="width:' + Math.round((wide ? 1280 : 390) * scale) + 'px">not drawn on this side</div></figure>';
    return '<figure><figcaption>' + tag + '</figcaption><div class="win" style="width:' + Math.round(size[0] * scale) + 'px;height:' + Math.round(height * scale) + 'px">' +
      '<img src="' + dir + '/' + c.file + '" style="width:' + Math.round(size[0] * scale) + 'px;margin-top:' + (-Math.round(top * scale)) + 'px">' +
      // where it changed, ringed on both sides: a dot's change is easy to miss
      (c.only ? "" : '<i class="hit" style="left:' + Math.round((c.box[0] - 4) * scale) + 'px;top:' + Math.round((c.box[1] - top - 4) * scale) + 'px;width:' +
      Math.round((c.box[2] - c.box[0] + 8) * scale) + 'px;height:' + Math.round((c.box[3] - c.box[1] + 8) * scale) + 'px"></i>') + '</div></figure>';
  }
  var note = c.only ? "drawn only on " + (c.only === "base" ? "the base" : "this PR") : c.pixels.toLocaleString("en-US") + " px changed, from y " + c.box[1];
  return '<section><h2>' + esc(label(c.file)) + '<small>' + note + '</small></h2><div class="pair">' +
    side("base", c.before, "before (main)") + side("head", c.after, "after (this PR)") + '</div></section>';
}

(async function () {
  var t0 = Date.now();
  console.log("drawing " + TEAMS.length + " teams on the base and on this checkout");
  if (!REUSE) await Promise.all([draw("base", BASE), draw("head", null)]);
  var files = {};
  ["base", "head"].forEach(function (s) { fs.readdirSync(path.join(OUT, s)).filter(function (f) { return /\.png$/.test(f); }).forEach(function (f) { (files[f] = files[f] || {})[s] = true; }); });
  var names = Object.keys(files).sort();
  var browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined });
  var page = await (await browser.newContext()).newPage();
  var changed = [], same = 0;
  for (var f of names) {
    var hb = files[f].base, hh = files[f].head;
    // drawn on one side only (a state that no longer renders, or a new
    // one): shown too, the missing side marked, from the top of the page
    if (!hb || !hh) {
      var size = pngSize(path.join(OUT, hb ? "base" : "head", f));
      changed.push({ file: f, pixels: size[0] * size[1], box: [0, 0, size[0] - 1, Math.min(size[1], 900) - 1],
                     before: hb ? size : null, after: hh ? size : null, only: hb ? "base" : "head" });
      continue;
    }
    var d = await compare(page, dataUrl(path.join(OUT, "base", f)), dataUrl(path.join(OUT, "head", f)));
    // a few stray pixels are noise; a real change moves more than a word's worth
    if (d.pixels > 30 || d.before[1] !== d.after[1]) changed.push(Object.assign({ file: f }, d, d.box ? {} : { box: [0, 0, 0, Math.min(d.before[1], d.after[1])] }));
    else same++;
  }
  // Sheets of eight, drawn as a page and photographed.
  var sheets = [];
  var drawn = changed;
  for (var i = 0; i < drawn.length && sheets.length < 6; i += 8) {
    var html = '<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:16px;background:#14171c;color:#e8ecf1;font:14px system-ui,sans-serif}' +
      'h1{font-size:18px;margin:0 0 12px}section{margin:0 0 18px;padding:12px;background:#1e232b;border-radius:8px}h2{font-size:15px;margin:0 0 8px}' +
      'h2 small{margin-left:10px;font-weight:400;color:#9aa4b2}.pair{display:flex;gap:14px;align-items:flex-start}figure{margin:0}figcaption{font-size:12px;color:#9aa4b2;margin:0 0 4px}' +
      '.win{position:relative;overflow:hidden;background:#000;border:1px solid #333}.hit{position:absolute;border:2px solid #ff3df5;border-radius:3px;box-shadow:0 0 0 1px #000}.win img{display:block}.none{box-sizing:border-box;padding:40px 16px;color:#ffb4b4;border:1px dashed #ff6b6b}</style>' +
      '<h1>What changed on screen: ' + (i + 1) + '-' + Math.min(i + 8, drawn.length) + ' of ' + drawn.length + '</h1>' + drawn.slice(i, i + 8).map(row).join("");
    var htmlFile = path.join(OUT, "sheet-" + (sheets.length + 1) + ".html");
    fs.writeFileSync(htmlFile, html);
    await page.setViewportSize({ width: 1100, height: 800 });
    await page.goto("file://" + htmlFile);
    await page.waitForFunction(function () { return Array.prototype.every.call(document.images, function (i) { return i.complete; }); });
    var jpg = path.join(OUT, "sheet-" + (sheets.length + 1) + ".jpg");
    await page.screenshot({ path: jpg, fullPage: true, type: "jpeg", quality: 78 });
    sheets.push(path.basename(jpg));
  }
  await browser.close();
  var summary = { screens: names.length, same: same, changed: changed.map(function (c) { return { screen: label(c.file), file: c.file, pixels: c.pixels, from: c.box && c.box[1], only: c.only || null }; }),
                  sheets: sheets, teams: TEAMS, seconds: Math.round((Date.now() - t0) / 1000) };
  fs.writeFileSync(path.join(OUT, "summary.json"), JSON.stringify(summary, null, 2));
  var md = changed.length ?
    "**" + changed.length + " of " + names.length + " screens changed** against the base (" + TEAMS.length + " colour-extreme teams; Home and Game at 390, Home at 1280).\n\n" +
      changed.map(function (c) { return "- " + label(c.file) + (c.only ? " (only on " + (c.only === "base" ? "the base" : "this PR") + ")" : ": " + c.pixels.toLocaleString("en-US") + " px, from y " + c.box[1]); }).join("\n") +
      (drawn.length > 48 ? "\n\nThe sheets show the first 48." : "") :
    "**No screen changed** against the base, in " + names.length + " screens (" + TEAMS.length + " colour-extreme teams; Home and Game at 390, Home at 1280).";
  fs.writeFileSync(path.join(OUT, "summary.md"), md + "\n");
  console.log(md);
  console.log("\n" + sheets.length + " sheet(s) in " + path.relative(root, OUT) + " (" + summary.seconds + "s)");
})().catch(function (e) { console.error(e); process.exit(1); });
