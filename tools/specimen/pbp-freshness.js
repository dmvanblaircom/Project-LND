/* The play-by-play freshness specimen (tools/specimen/pbp-freshness.html).
   Development only. */
(function () {
  "use strict";
  var ND = TEAM_CONFIG, esc = Suite.ui.esc;
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
  // The capture cut back to the 15:00 kickoff of the 3rd - what the record
  // held at 12:05 (the screenshot: "NOTRE DAME DRIVE, 0 plays, 0 yards").
  function cutToKickoff(d) {
    var x = JSON.parse(JSON.stringify(d)), prev = x.drives.previous;
    var at = prev.findIndex(function (dr) { return (dr.plays || []).some(function (p) { return p.period.number === 3 && p.clock.displayValue === "15:00" && /kickoff/i.test(p.type.text); }); });
    var drive = prev[at];
    drive.plays = drive.plays.slice(0, 1); drive.description = "0 plays, 0 yards, 0:00"; drive.offensivePlays = 0;
    delete drive.result; delete drive.displayResult; drive.team = { id: "87", abbreviation: "ND" };
    x.drives.previous = prev.slice(0, at + 1); x.drives.current = drive;
    x.scoringPlays = (x.scoringPlays || []).filter(function (p) { return p.period.number !== 3; });
    // and the score as it stood: the 3rd's touchdown not yet on the board;
    // the box score and leaders, which the capture took later, left out.
    x.header.competitions[0].competitors.forEach(function (c) {
      if (c.team && String(c.team.id) === "87") { c.score = "17"; if (c.linescores && c.linescores[2]) c.linescores[2].displayValue = "0"; }
    });
    delete x.boxscore; delete x.leaders;
    return x;
  }
  function game(clock, us) {
    return { id: "401858291", status: "live", hasStarted: true, state: "in", period: 3, clock: clock, detail: clock + " - 3rd",
             us: us, them: 3, oppName: "Miami", oppAbbr: "MIA", oppRank: 1, usRank: 11, usRecord: "7-1", oppRecord: "8-0",
             home: true, timeSet: true, date: "2026-11-07T23:30:00Z", net: "NBC" };
  }
  function panel(label, cfg, styleName, g, det, wasBehind, view, open) {
    var team = TeamOS.createTeam(cfg.team);
    var look = TeamOS.identity.create(styleName === "suite" ? { identity: Suite.ui.STYLE } : cfg, team);
    var feed = TeamOS.game.feedState(g, det, wasBehind);
    var wrap = document.createElement("div");
    wrap.innerHTML = '<span class="label">' + esc(label) + '</span><div class="frame" data-style="' + styleName + '" style="' + esc(tokens(look)) + ';font-family:var(--t-font-ui)"><main class="page-main"><div class="host"></div></main></div>';
    var host = wrap.querySelector(".host"), lc = TeamOS.game.lifecycle(g);
    Suite.game.paint(host, { team: { name: team.name, abbr: team.abbreviation, markUrl: null }, oppMark: function () { return null; },
      game: g, detail: det, feed: feed, lifecycle: lc, base: "#game", view: view || "drive", preview: null, side: "us", open: open || {}, weather: null,
      now: new Date("2026-11-08T01:30:00Z") });
    return wrap;
  }
  function sec(id, title, intro, nodes) {
    var s = document.createElement("section"); s.className = "sec"; s.id = id;
    s.innerHTML = "<h2>" + title + "</h2><p>" + intro + '</p><div class="row"></div>';
    nodes.forEach(function (n) { s.querySelector(".row").appendChild(n); });
    document.getElementById("spx").appendChild(s);
  }
  fetch("../fixtures/espn-summary-nd-mia-live-caughtup.json").then(function (r) { return r.json(); }).then(function (raw) {
    var team = TeamOS.createTeam(ND.team);
    var behind = TeamOS.espn.gameDetail(cutToKickoff(raw), team, ND), caught = TeamOS.espn.gameDetail(raw, team, ND);
    return fetch("../../teams/ohio-state.js").then(function (r) { return r.text(); }).then(function (src) {
      var OSU = new Function(src + "\n;return TEAM_CONFIG;")();
      sec("normal", "1. Normal play-by-play",
        "14:50 of the 3rd: the record has the kickoff, ten seconds of game time ago. Nothing to say; Game reads as it always has.",
        [panel("Drive Tracker · 14:50", ND, "team", game("14:50", 17), behind, false)]);
      sec("behind", "2. Play-by-play catching up",
        "12:05 of the 3rd, the record still at the 15:00 kickoff: 2:55 of game time ahead. The Last Play card says so, calmly, and keeps the latest recorded play with its own quarter and clock; the drive card stops quoting '0 plays, 0 yards' and says its details are updating. One state, one indicator. No warning colour, nothing animated. Announced once to screen readers, politely.",
        [panel("Team Style · Notre Dame", ND, "team", game("12:05", 17), behind, false),
         panel("Suite Style", ND, "suite", game("12:05", 17), behind, false),
         panel("Team Style · Ohio State colours", OSU, "team", game("12:05", 17), behind, false)]);
      sec("batch", "3. The delayed plays arrive",
        "The nine plays land in one refresh. The indicator goes; the drive card and Last Play read the record's own words again. On Plays they appear as ordinary drives (newest first, as the list always is), each drive's plays in the order they were played - Miami's drive and punt, then Notre Dame's touchdown drive - stamped 12:05 as the record has them. No moment, no replay, no catch-up animation: this is reconciliation, not a live moment.",
        [panel("Drive Tracker · caught up", ND, "team", game("12:05", 24), caught, true),
         panel("Plays · the batch, opened", ND, "team", game("12:05", 24), caught, true, "plays", { "drive-40185829118": true, "drive-40185829119": true })]);
      sec("again", "4. Back to normal",
        "11:30 of the 3rd, the record keeping pace: Game as it always is.",
        [panel("Drive Tracker · 11:30", ND, "team", game("11:30", 24), caught, false)]);
      document.documentElement.setAttribute("data-ready", "1");
    });
  }).catch(function (e) { document.getElementById("spx").textContent = "Specimen failed: " + e; document.documentElement.setAttribute("data-ready", "error"); });
})();
