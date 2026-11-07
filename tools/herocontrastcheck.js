#!/usr/bin/env node
/* Every team's stage, read off the screen (Phase 2 Stage 1b; David,
   2026-11-07: "evaluates actual foreground/background combinations in the
   rendered hero, including lighting effects, rather than relying only on
   token-level checks").

   The identity gate (teamos/identity.js) proves each token pair on paper.
   The stage is not a pair of tokens: it is a team surface under day or night
   stadium light, a projected field, grain and a vignette, with the team's
   accent text, its action button, the live pill and the scores on top. So
   this draws the real scoreboard stage (suite/scoreboard.js, app.css as
   shipped) for every team in teams/, in every lighting and state it has, and
   hands the pixels to the same auditor as the rest of the accessibility gate
   (tools/a11yaudit.js auditText: the text made transparent, the background
   sampled behind each word, WCAG AA 4.5:1 or 3:1 for large text).

   Per team, Team Style:
     Home  pregame, day light       Home  pregame, kickoff time not set (no light)
     Home  live, night light        Game  live, day light
     Home  final (a win, with the result line), night
     Game  final (a loss), day      Home  live, desktop width (860), night
   and the same seven once in Suite Style, which is every team's.

   Logos are refused, so every mark is its initials: the offline first visit,
   and the only text a logo would otherwise cover. The game is a test fixture
   (an opponent called Opponent), not a claim about any real game.

   Usage:  node tools/herocontrastcheck.js [team-id ...]
           HERO_SHOTS=dir  also writes each batch's screenshot there */
"use strict";
var fs = require("fs"), path = require("path");
var chromium = require("playwright").chromium;
var root = path.join(__dirname, ".."), audit = require("./a11yaudit");
var server = require("./lib/serve")(root);

var only = process.argv.slice(2);
var TEAMS = fs.readdirSync(path.join(root, "teams")).filter(function (f) { return /\.js$/.test(f) && f !== "index.js"; })
  .map(function (f) { return f.slice(0, -3); }).filter(function (id) { return !only.length || only.indexOf(id) !== -1; }).sort();
var BATCH = 12;

// What the page draws for one team. Runs in the browser.
function drawBatch(arg) {
  var ids = arg.ids, style = arg.style;
  var esc = Suite.ui.esc;
  var reg = {}; (window.TEAM_REGISTRY || []).forEach(function (r) { reg[r.id] = r; });
  function tokens(look) {
    var c = look.colors, f = look.fonts;
    return [["--t-accent", c.accent], ["--t-accent-rgb", c.accentRgb], ["--t-accent-text", c.accentText], ["--t-accent-on-light", c.accentOnLight],
            ["--t-accent-ink", c.accentInk], ["--t-action", c.action], ["--t-action-ink", c.actionInk], ["--t-accent-soft", c.accentSoft],
            ["--t-accent-tint", c.accentTint], ["--t-accent-tint-soft", c.accentTintSoft], ["--t-focus", c.focus],
            ["--t-surface", c.surface], ["--t-surface-rgb", c.surfaceRgb], ["--t-deep", c.surfaceDeep], ["--t-deep-rgb", c.surfaceDeepRgb],
            ["--t-abyss", c.surfaceAbyss], ["--t-abyss-rgb", c.surfaceAbyssRgb], ["--t-raise", c.surfaceRaise], ["--t-raise-rgb", c.surfaceRaiseRgb],
            ["--t-font-ui", f.ui], ["--t-font-display", f.display]]
      .filter(function (p) { return p[1] != null; }).map(function (p) { return p[0] + ":" + p[1]; }).join(";");
  }
  // Noon and 7:30 PM Eastern, with the venue zone given as Eastern: day and night.
  var DAY = "2026-10-03T16:00:00Z", NIGHT = "2026-10-03T23:30:00Z", ZONE = "America/New_York";
  var CASES = [
    ["home-pre-day", "home", 390, { status: "scheduled", hasStarted: false, date: DAY }, "2026-10-01T12:00:00Z"],
    ["home-pre-tba", "home", 390, { status: "scheduled", hasStarted: false, date: DAY, timeSet: false }, "2026-10-01T12:00:00Z"],
    ["home-live-night", "home", 390, { status: "live", hasStarted: true, date: NIGHT, period: 3, clock: "2:43", us: 17, them: 10, situation: { possession: "us", short: "1st & 10", spot: "OPP 20" } }],
    ["game-live-day", "game", 390, { status: "live", hasStarted: true, date: DAY, period: 2, clock: "9:35", us: 7, them: 13, situation: { possession: "them", short: "3rd & 4", spot: "OPP 41" } }],
    ["home-final-win-night", "home", 390, { status: "final", hasStarted: true, date: NIGHT, period: 4, us: 27, them: 10 }, null, true],
    ["game-final-loss-day", "game", 390, { status: "final", hasStarted: true, date: DAY, period: 4, us: 19, them: 42 }, null, true],
    ["home-live-desktop", "home", 860, { status: "live", hasStarted: true, date: NIGHT, period: 4, clock: "0:48", us: 31, them: 28, situation: { possession: "us", short: "2nd & 7", spot: "OPP 33" } }]
  ];
  var out = [];
  return Promise.all(ids.map(function (id) {
    return fetch("/teams/" + id + ".js").then(function (r) { return r.text(); }).then(function (src) {
      var cfg = new Function(src + "\n;return TEAM_CONFIG;")(), team = TeamOS.createTeam(cfg.team);
      var look = TeamOS.identity.create(style === "suite" ? { identity: Suite.ui.STYLE } : cfg, team);
      return { id: id, team: team, look: look };
    });
  })).then(function (teams) {
    var html = "";
    teams.forEach(function (T) {
      var t = { name: T.team.name, abbr: T.team.abbreviation, nick: (reg[T.id] || {}).nick || "", markUrl: null };
      html += '<div class="hc-row" data-team="' + esc(T.id) + '" data-style="' + style + '" style="' + esc(tokens(T.look)) + ';font-family:var(--t-font-ui)">';
      CASES.forEach(function (C) {
        var g = Object.assign({ id: "1", oppName: "Opponent", oppAbbr: "OPP", oppProviderId: null, usRank: 12, usRecord: "4-1", oppRecord: "3-2", home: true, net: "ESPN", timeSet: true }, C[3]);
        var m = { team: t, game: g, oppMark: function () { return null; }, art: { name: t.name, abbr: t.abbr, markUrl: null },
                  now: new Date(C[4] || g.date) };
        var cta = C[1] === "home" ? { href: "#", label: g.status === "final" ? "Game Recap" : g.status === "live" ? "View Game" : "Game Details" } : null;
        html += '<div class="hc-cell" data-case="' + C[0] + '" style="width:' + C[2] + 'px">' +
                Suite.scoreboard.stage(m, { variant: C[1], cta: cta, outcome: !!C[5], zone: ZONE }) + "</div>";
      });
      html += "</div>";
    });
    var host = document.getElementById("hc");
    host.innerHTML = html;
    [].forEach.call(host.querySelectorAll(".hc-cell"), function (c) { Suite.scoreboard.fit(c); });
    return document.fonts.ready.then(function () {
      return [].map.call(host.querySelectorAll(".hc-cell"), function (c) {
        var r = c.getBoundingClientRect();
        return { team: c.parentNode.getAttribute("data-team"), kase: c.getAttribute("data-case"),
                 x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height };
      });
    });
  });
}

(async function () {
  await new Promise(function (r) { server.listen(0, "127.0.0.1", r); });
  var base = "http://127.0.0.1:" + server.address().port;
  var browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined });
  var shots = process.env.HERO_SHOTS || "";
  if (shots) fs.mkdirSync(shots, { recursive: true });
  var failures = [], checked = 0, unassessed = 0, cells = 0, skipped = [];
  try {
    var context = await browser.newContext({ viewport: { width: 3400, height: 1000 }, timezoneId: "America/New_York" });
    var page = await context.newPage();
    // Logos refused: every mark is its initials (see the header).
    await page.route("**/*", function (route) { return route.request().url().startsWith(base) ? route.continue() : route.abort(); });
    await page.goto(base + "/tools/fixtures/espn-news.json");
    var runs = [];
    for (var i = 0; i < TEAMS.length; i += BATCH) runs.push({ style: "team", ids: TEAMS.slice(i, i + BATCH) });
    runs.push({ style: "suite", ids: [TEAMS.indexOf("notre-dame") !== -1 ? "notre-dame" : TEAMS[0]] });
    for (var n = 0; n < runs.length; n++) {
      var run = runs[n];
      await page.setViewportSize({ width: 3400, height: 1000 });
      await page.setContent('<!doctype html><html lang="en" data-style="' + run.style + '"><head><meta name="viewport" content="width=device-width,initial-scale=1">' +
        '<link rel="stylesheet" href="' + base + '/app.css"><style>body{margin:0;background:#fff}' +
        '.hc-row{display:flex;gap:16px;align-items:flex-start;padding:12px 16px}.hc-cell{flex:none}</style></head>' +
        '<body><main id="hc"></main></body></html>');
      for (var f of ["teams/index.js", "teamos/team.js", "teamos/identity.js", "teamos/game.js", "teamos/espn.js", "suite/ui.js", "suite/home.js", "suite/scoreboard.js"])
        await page.addScriptTag({ url: base + "/" + f });
      var boxes = await page.evaluate(drawBatch, { ids: run.ids, style: run.style });
      cells += boxes.length;
      var label = run.style + " " + run.ids[0] + (run.ids.length > 1 ? ".." + run.ids[run.ids.length - 1] : "");
      var res = await audit.auditText(page, label, { maxHeight: 12000 });
      if (shots) await page.screenshot({ path: path.join(shots, "hero-" + run.style + "-" + n + ".png"), fullPage: true });
      checked += res.checked; unassessed += res.unassessed; skipped = skipped.concat(res.skipped);
      res.failures.forEach(function (fl) {
        var cx = fl.box[0] + fl.box[2] / 2, cy = fl.box[1] + fl.box[3] / 2;
        var where = boxes.filter(function (b) { return cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h; })[0];
        failures.push((where ? run.style + " " + where.team + " " + where.kase : label) + ": " + fl.sel + ' "' + fl.text + '" ' + fl.detail);
      });
      console.log("  " + (res.failures.length ? "FAIL " : "ok   ") + label + ": " + res.checked + " text runs" +
                  (res.failures.length ? ", " + res.failures.length + " below AA" : "") + (res.unassessed ? ", " + res.unassessed + " unassessed" : ""));
    }
    await context.close();
  } finally {
    await browser.close();
    server.close();
  }
  console.log("");
  if (skipped.length) { console.log("unassessed (no clear background):"); skipped.slice(0, 30).forEach(function (s) { console.log("  " + s); }); console.log(""); }
  if (failures.length) {
    failures.forEach(function (f) { console.log("  FAIL " + f); });
    console.log("\n" + failures.length + " text run(s) below WCAG AA on the stage");
    process.exit(1);
  }
  if (!checked) { console.log("nothing was measured"); process.exit(1); }
  console.log(TEAMS.length + " teams, " + cells + " stages, " + checked + " text runs: every word on the stage reads at WCAG AA" +
              (unassessed ? " (" + unassessed + " without a clear background, listed above)" : ""));
})().catch(function (e) { console.error(e); process.exit(1); });
