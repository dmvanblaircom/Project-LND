#!/usr/bin/env node
/* One page to approve a phase of teams (Phase 0; David, 2026-10-27: one
   review sheet per phase, approved in one pass).

     node tools/reviewsheet.js --teams illinois,iowa --out review.html

   For each team's config in teams/: its Home in Team Style at a phone's
   width, from the fixtures tools/newteams.js asked to capture
   (tools/fixtures/espn-schedule-<id>-review.json and espn-news-<id>-review.json;
   a team without them is drawn without its schedule, and the sheet says so);
   then what David approves - the palette with each pair's contrast, the
   faces, the header label, the beat feeds - and what was looked up: the
   ESPN id, the home venue as matched, Kalshi, the conference's availability
   report, the trophies. One self-contained HTML file, screenshots inline.

   Locally, PW_CHROMIUM points Playwright at a browser. */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");
var root = path.join(__dirname, "..");
function read(f) { return fs.readFileSync(path.join(root, f), "utf8"); }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

function load(id) {
  var c = vm.createContext({});
  ["teamos/team.js", "teamos/identity.js"].forEach(function (s) { vm.runInContext(read(s), c, { filename: s }); });
  vm.runInContext(read("teams/" + id + ".js"), c, { filename: id + ".js" });
  return c;
}

// The facts on one team's card, worked out without a browser.
function facts(id) {
  var c = load(id), cfg = c.TEAM_CONFIG, col = cfg.identity.colors, ratio = c.TeamOS.identity.contrast;
  var pairs = [
    ["accentText on surfaceDeep", col.accentText, col.surfaceDeep],
    ["accentOnLight on white", col.accentOnLight, "#FFFFFF"],
    ["accentInk on accent", col.accentInk, col.accent],
    ["white on surface", "#FFFFFF", col.surface],
    ["accent on surface", col.accent, col.surface]
  ].map(function (p) { return { what: p[0], fg: p[1], bg: p[2], ratio: Math.round(ratio(p[1], p[2]) * 100) / 100 }; });
  var src = cfg.sources || {}, off = src.official || {};
  return {
    id: id, name: cfg.team.name, label: cfg.identity.programLabel, espnId: src.espn && src.espn.teamId,
    venue: cfg.team.venue && cfg.team.venue.name, timeZone: cfg.team.timeZone,
    colors: col, pairs: pairs,
    fonts: { ui: (cfg.identity.fonts || {}).ui || "Suite's own", display: (cfg.identity.fonts || {}).display || "Suite's own" },
    feeds: (src.beatFeeds || []).map(function (f) { return { name: f.name, feed: f.feed }; }),
    kalshi: src.kalshi ? src.kalshi.tickerSuffix : null,
    availability: off.availabilityFeed ? off.availabilityReportLabel || off.availabilityFeed.conference : null,
    series: (cfg.series || []).map(function (s) { return s.name + (s.kind === "rivalry" ? " (rivalry)" : ""); }),
    fixtures: ["schedule", "news"].filter(function (k) { return fs.existsSync(path.join(root, "tools", "fixtures", "espn-" + k + "-" + id + "-review.json")); })
  };
}

function swatch(hex) { return '<span class="sw" style="background:' + esc(hex) + '"></span>' + esc(hex); }
function card(f, shot) {
  var low = f.pairs.filter(function (p) { return p.what !== "accent on surface" && p.ratio < 4.5; });
  return '<section class="team"><div class="shot">' + (shot ? '<img alt="' + esc(f.name) + ' Home" src="data:image/png;base64,' + shot + '">' : "<p>No preview</p>") +
    (f.fixtures.length < 2 ? '<p class="warn">Drawn without its ' + ["schedule", "news"].filter(function (k) { return f.fixtures.indexOf(k) === -1; }).join(" and ") + " fixture</p>" : "") + "</div>" +
    '<div class="facts"><h2>' + esc(f.name) + "</h2>" +
    "<dl><dt>Header</dt><dd>" + esc(f.label) + "</dd>" +
    "<dt>ESPN</dt><dd>" + esc(f.espnId) + " · " + esc(f.timeZone) + "</dd>" +
    "<dt>Home venue</dt><dd>" + esc(f.venue) + "</dd>" +
    "<dt>Kalshi</dt><dd>" + esc(f.kalshi || "none listed") + "</dd>" +
    "<dt>Availability</dt><dd>" + esc(f.availability || "no source") + "</dd>" +
    "<dt>Trophies</dt><dd>" + esc(f.series.join(", ") || "none") + "</dd>" +
    "<dt>Faces</dt><dd>" + esc(f.fonts.ui) + "<br>" + esc(f.fonts.display) + "</dd></dl>" +
    '<h3>Colours</h3><ul class="cols">' + ["surface", "surfaceDeep", "accent", "accentText", "accentOnLight", "accentInk"].map(function (k) { return "<li>" + swatch(f.colors[k]) + " <small>" + k + "</small></li>"; }).join("") + "</ul>" +
    '<table><tr><th>Pair</th><th>Contrast</th></tr>' + f.pairs.map(function (p) {
      return "<tr><td>" + esc(p.what) + "</td><td>" + p.ratio.toFixed(2) + ":1" + (p.what === "accent on surface" ? " <small>(a fill)</small>" : p.ratio < 4.5 ? ' <b class="warn">below 4.5</b>' : "") + "</td></tr>";
    }).join("") + "</table>" + (low.length ? '<p class="warn">Text below 4.5:1 - TeamOS will refuse this palette.</p>' : "") +
    "<h3>Beat news (" + f.feeds.length + ")</h3><ul>" + f.feeds.map(function (x) { return "<li>" + esc(x.name) + " <small>" + esc(x.feed) + "</small></li>"; }).join("") + "</ul></div></section>";
}

function page(title, cards) {
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(title) + "</title><style>" +
    ":root{--ink:#111D35;--muted:#485563;--line:#D9DDE0;--page:#F1F2F0;--warn:#9A2A12}" +
    "body{margin:0;padding:16px;background:var(--page);color:var(--ink);font:15px/1.45 system-ui,-apple-system,sans-serif}" +
    "h1{margin:0 0 4px}.sub{margin:0 0 20px;color:var(--muted)}" +
    ".team{display:grid;grid-template-columns:minmax(0,300px) minmax(0,1fr);gap:20px;margin:0 0 24px;padding:16px;background:#fff;border:1px solid var(--line);border-radius:12px}" +
    ".shot img{width:100%;height:auto;border-radius:8px;border:1px solid var(--line)}" +
    "h2{margin:0 0 8px}h3{margin:16px 0 6px;font-size:14px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}" +
    "dl{display:grid;grid-template-columns:max-content minmax(0,1fr);gap:4px 12px;margin:0}dt{color:var(--muted)}dd{margin:0;overflow-wrap:anywhere}" +
    ".cols{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:6px 14px}.sw{display:inline-block;width:14px;height:14px;margin-right:4px;vertical-align:-2px;border:1px solid var(--line);border-radius:3px}" +
    "table{border-collapse:collapse;margin-top:8px}td,th{padding:3px 10px 3px 0;text-align:left}small{color:var(--muted);overflow-wrap:anywhere}.warn{color:var(--warn);font-weight:600}" +
    "ul{margin:0;padding-left:18px}@media (max-width:640px){.team{grid-template-columns:1fr}}" +
    "</style></head><body><h1>" + esc(title) + '</h1><p class="sub">Each team\'s Home in Team Style, and what is approved with it: colours, faces, header label and beat news.</p>' +
    cards.join("") + "</body></html>";
}

async function shots(ids) {
  var chromium = require("playwright").chromium, serve = require("./lib/serve");
  var server = serve(root);
  await new Promise(function (r) { server.listen(0, "127.0.0.1", r); });
  var base = "http://127.0.0.1:" + server.address().port, out = {};
  var browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined });
  for (var id of ids) {
    var f = facts(id), ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: "block", timezoneId: "America/New_York" });
    var page = await ctx.newPage();
    await ctx.route("**/*", (function (f) { return function (route) {
      var u = route.request().url(), body = null;
      if (u.startsWith(base)) return route.continue();
      function fx(k) { var p = path.join(root, "tools", "fixtures", "espn-" + k + "-" + f.id + "-review.json"); return fs.existsSync(p) ? fs.readFileSync(p) : null; }
      if (new RegExp("/teams/" + f.espnId + "/schedule(\\?|$)").test(u) && !/seasontype=3/.test(u)) body = fx("schedule");
      else if (/\/news\?/.test(u)) body = fx("news");
      else if (/seasontype=3|\/scoreboard|\/rankings/.test(u)) body = '{"events":[],"rankings":[]}';
      if (body) return route.fulfill({ status: 200, contentType: "application/json", body: body });
      if (/espncdn/.test(u)) return route.continue().catch(function () { return route.abort(); });
      return route.abort();
    }; })(f));
    await page.goto(base + "/?team=" + id + "#home");
    await page.waitForFunction(function () { return !document.getElementById("launch"); }, null, { timeout: 15000 }).catch(function () {});
    await page.waitForTimeout(1200);
    out[id] = (await page.screenshot()).toString("base64");
    await ctx.close();
  }
  await browser.close(); server.close();
  return out;
}

module.exports = { facts: facts, card: card, page: page };

if (require.main === module) {
  var args = process.argv.slice(2);
  function arg(n) { var i = args.indexOf(n); return i === -1 ? null : args[i + 1]; }
  var ids = (arg("--teams") || "").split(",").filter(Boolean), out = arg("--out") || "review.html";
  if (!ids.length) { console.error("usage: node tools/reviewsheet.js --teams a,b --out review.html [--title T]"); process.exit(2); }
  shots(ids).then(function (s) {
    fs.writeFileSync(out, page(arg("--title") || "Teams to approve", ids.map(function (id) { return card(facts(id), s[id]); })));
    console.log("wrote " + out + " (" + ids.length + " teams)");
  }).catch(function (e) { console.error(e); process.exit(1); });
}
