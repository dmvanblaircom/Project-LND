/* The Stage 1b review specimen. Development only (tools/, never shipped).
   Renders the real components from the real stylesheet with each team's
   identity scoped to its panel, so Team Style and Suite Style, Notre Dame and
   Ohio State, sit side by side. Game values are the captured fixtures the
   audit rendered (docs/design/suite-visual-redesign-current-state-audit.md
   §1): nothing here is invented. */
(function () {
  "use strict";
  var root = document.getElementById("spx");
  var esc = Suite.ui.esc;

  function load(id) {
    return fetch("../../teams/" + id + ".js").then(function (r) { return r.text(); }).then(function (src) {
      var cfg = new Function(src + "\n;return TEAM_CONFIG;")();
      var team = TeamOS.createTeam(cfg.team);
      return { id: id, cfg: cfg, team: team, look: { team: TeamOS.identity.create(cfg, team), suite: TeamOS.identity.create({ identity: Suite.ui.STYLE }, team) } };
    });
  }

  // The same token set app.js applyStyle() puts on the root, scoped to a panel.
  function tokens(look) {
    var c = look.colors, f = look.fonts;
    var t = [["--t-accent", c.accent], ["--t-accent-rgb", c.accentRgb], ["--t-accent-text", c.accentText], ["--t-accent-on-light", c.accentOnLight],
             ["--t-accent-ink", c.accentInk], ["--t-action", c.action], ["--t-action-ink", c.actionInk], ["--t-accent-soft", c.accentSoft],
             ["--t-accent-tint", c.accentTint], ["--t-accent-tint-soft", c.accentTintSoft], ["--t-focus", c.focus],
             ["--t-surface", c.surface], ["--t-surface-rgb", c.surfaceRgb], ["--t-deep", c.surfaceDeep], ["--t-deep-rgb", c.surfaceDeepRgb],
             ["--t-abyss", c.surfaceAbyss], ["--t-abyss-rgb", c.surfaceAbyssRgb], ["--t-raise", c.surfaceRaise], ["--t-raise-rgb", c.surfaceRaiseRgb],
             ["--t-font-ui", f.ui], ["--t-font-display", f.display]];
    return t.filter(function (p) { return p[1] != null; }).map(function (p) { return p[0] + ":" + p[1]; }).join(";");
  }
  function scope(T, style, cls, inner) {
    return '<div class="spx-frame ' + cls + '" data-style="' + style + '" style="' + esc(tokens(T.look[style])) + ';font-family:var(--t-font-ui)">' + inner + "</div>";
  }

  // The fixtures, as normalized Games (teamos/espn.js schedule() fields).
  var GAMES = {
    "notre-dame": {
      opp: { oppName: "Michigan St", oppAbbr: "MSU", oppProviderId: "127", oppRecord: "2-1", usRank: 3, usRecord: "2-0", home: true, net: "NBC",
             date: "2026-09-19T23:30:00Z", timeSet: true, id: "401858453" },
      pre: { status: "scheduled", hasStarted: false },
      live: { status: "live", hasStarted: true, period: 3, clock: "2:43", us: 17, them: 10, situation: { possession: "us", short: "1st & 10", spot: "MSU 20" } },
      final: { status: "final", hasStarted: true, period: 4, us: 27, them: 10 }
    },
    "ohio-state": {
      opp: { oppName: "Illinois", oppAbbr: "ILL", oppProviderId: "356", oppRecord: "2-2", usRank: 7, usRecord: "3-1", home: true, net: "FOX",
             date: "2026-09-26T16:00:00Z", timeSet: true, id: "401858465" },
      pre: { status: "scheduled", hasStarted: false },
      live: { status: "live", hasStarted: true, period: 3, clock: "9:35", us: 28, them: 13, situation: { possession: "them" } },
      final: { status: "final", hasStarted: true, period: 4, us: 42, them: 19 }
    }
  };
  var NOW = { pre: { "notre-dame": "2026-09-19T17:00:00Z", "ohio-state": "2026-09-26T13:00:00Z" } };
  function model(T, st, o) {
    o = o || {};
    var G = GAMES[T.id], g = Object.assign({}, G.opp, G[st]);
    var espn = T.cfg.sources.espn.teamId;
    return {
      team: { name: T.team.name, abbr: T.team.abbreviation, markUrl: o.noMarks ? null : TeamOS.espn.mark(espn, true) },
      game: g, oppMark: function (id) { return o.noMarks ? null : TeamOS.espn.mark(id, true); },
      art: { name: T.team.name, abbr: T.team.abbreviation, markUrl: o.noMarks ? null : TeamOS.espn.mark(espn, true, true) },
      now: new Date(st === "pre" ? NOW.pre[T.id] : g.date)
    };
  }
  function nick(T) { return (window.TEAM_NICKS || {})[T.id] || ""; }

  function sec(id, title, intro, body) {
    return '<section class="spx-sec" id="' + id + '"><h2>' + title + "</h2><p>" + intro + "</p>" + body + "</section>";
  }
  function cap(html) { return '<p class="spx-cap">' + html + "</p>"; }

  Promise.all([load("notre-dame"), load("ohio-state")]).then(function (teams) {
    var ND = teams[0], OSU = teams[1];
    // Nicknames are on ESPN's team feed, not the config; the two are fixtures.
    window.TEAM_NICKS = { "notre-dame": "Fighting Irish", "ohio-state": "Buckeyes" };
    var html = "";

    // ---- 1. Numerals ------------------------------------------------------
    var FACES = [["Instrument Display", [400, 500, 600, 700], "Suite's own condensed face; precached today"],
                 ["Oswald", [400, 500, 600, 700], "self-hosted (team faces); variable 200-700"],
                 ["Antonio", [400, 500, 600, 700], "self-hosted; variable 100-700"],
                 ["Anton", [400], "self-hosted; one weight"]];
    function face(f, w, width) {
      var ff = "font-family:'" + f + "';font-weight:" + w + ";font-variant-numeric:tabular-nums";
      return '<div class="spx-face" style="width:' + width + 'px"><h3>' + f + " " + w + "</h3>" +
        '<div class="spx-num-stage"><div class="spx-num-row" style="' + ff + '"><span style="font-size:' + (width > 500 ? 6 : 4.2) + 'rem;line-height:.95">28</span>' +
        '<span style="text-align:center"><span style="display:block;font-size:1.05rem;letter-spacing:.06em">3RD</span><span style="font-size:2rem;line-height:1">9:35</span></span>' +
        '<span style="font-size:' + (width > 500 ? 6 : 4.2) + 'rem;line-height:.95">13</span></div>' +
        '<div class="spx-num-row" style="' + ff + ';margin-top:.6rem;font-size:1.05rem"><span>#7 · 3-1</span><span>1st &amp; 10 · MSU 20</span><span>0 · 06 · 29</span></div></div>' +
        '<div class="spx-num-light"><table class="spx-table" style="' + ff + '"><tr><td>1</td><td style="font-family:var(--t-font-ui);font-weight:600">Miami</td><td>8-0</td><td>416.8</td><td>62nd</td></tr>' +
        '<tr><td>2</td><td style="font-family:var(--t-font-ui);font-weight:600">Georgia</td><td>7-1</td><td>141.8</td><td>98th</td></tr></table>' +
        '<div class="spx-num-row" style="' + ff + ';margin-top:.4rem"><span style="font-size:2.3rem">81%</span><span style="font-size:2.3rem">16%</span><span style="font-size:1.7rem">42 · 19</span></div></div></div>';
    }
    var nums = '<div class="spx-row">';
    FACES.forEach(function (F) { F[1].forEach(function (w) { nums += face(F[0], w, 390); }); });
    nums += '</div><h3 style="margin:1.4rem 0 .5rem">At desktop size, the heaviest weight of each</h3><div class="spx-row">';
    FACES.forEach(function (F) { nums += face(F[0], F[1][F[1].length - 1], 600); });
    nums += "</div>" + cap("<strong>Figures</strong> are from the fixtures: Ohio State 28-13 in the 3rd at 9:35; Notre Dame's 1st &amp; 10 at the MSU 20 and its countdown; the Week 10 AP rows; Notre Dame's season averages (416.8 total offense, 62nd; 141.8 rushing, 98th); Season Outlook 81% / 16%; Ohio State's final 42-19. <strong>Notes.</strong> Instrument Display's figures are tabular by design; each row shows the weights the face actually has, so a heavier look than Instrument's 700 means a different face.");
    html += sec("numerals", "1. Numeric typography", "Scores, clocks, rankings and statistics in each candidate, at phone (390) and desktop (600) widths, on a stage and on a light card. Same values everywhere.", nums);

    // ---- 2. Cobalt ---------------------------------------------------------
    var R = TeamOS.identity.contrast, S = Suite.ui.STYLE.colors;
    function ratio(a, b, min) { var r = R(a, b); return '<span class="spx-ratio' + (r < (min || 4.5) ? " spx-bad" : "") + '">' + r.toFixed(2) + ":1</span>"; }
    var CAND = [["Proposed", S.accent], ["Deeper", "#1F4FE0"], ["Brighter", "#3A68FF"]];
    var cob = '<div class="spx-row"><div style="width:420px"><h3 style="margin:0 0 .4rem">Proposed tokens</h3>';
    [["accent (action fill)", S.accent, "white on it", "#FFFFFF", S.accent], ["accentText (on stage)", S.accentText, "on deep", S.accentText, S.surfaceDeep],
     ["accentOnLight (links, light UI)", S.accentOnLight, "on white", S.accentOnLight, "#FFFFFF"], ["focus", S.focus, "on deep", S.focus, S.surfaceDeep],
     ["surface (midnight navy)", S.surface, "white on it", "#FFFFFF", S.surface], ["surfaceDeep", S.surfaceDeep, "", null, null],
     ["surfaceRaise", S.surfaceRaise, "", null, null], ["champagne (detail)", "#D4B896", "on deep", "#D4B896", S.surfaceDeep]].forEach(function (x) {
      cob += '<div class="spx-swatch"><span class="spx-chip" style="background:' + x[1] + '"></span><span><strong>' + x[0] + "</strong> " + x[1] +
             (x[3] ? " · " + x[2] + " " + ratio(x[3], x[4], x[0] === "focus" ? 3 : 4.5) : "") + "</span></div>";
    });
    cob += cap("Alternatives for comparison: " + CAND.slice(1).map(function (c) { return "<strong>" + c[0] + "</strong> " + c[1] + " (white on it " + ratio("#FFFFFF", c[1]) + ")"; }).join(", ") + ". The identity gate needs 4.5:1 for text.") + "</div>";
    function demo(dark) {
      return '<div class="spx-demo ' + (dark ? "spx-demo-dark" : "spx-demo-light") + '">' +
        '<a class="btn btn-primary stage-cta" href="#cobalt">Game Details</a>' +
        '<div class="spx-tabs" style="background:' + (dark ? "rgba(255,255,255,.08)" : "var(--s-inset)") + '"><span class="spx-tab" style="background:var(--r-signal-select);color:var(--t-accent-ink)">Selected</span>' +
        '<span class="spx-tab" style="color:' + (dark ? "var(--r-stage-ink-2)" : "var(--s-ink-2)") + '">Other</span><span class="spx-tab" style="color:' + (dark ? "var(--r-stage-ink-2)" : "var(--s-ink-2)") + '">Other</span></div>' +
        '<div style="display:flex;gap:.8rem;align-items:center"><span class="live-pill">Live</span><span class="sb-rank" style="font-size:1.4rem">#7</span>' +
        '<span style="color:' + (dark ? "var(--r-signal-accent)" : "var(--r-everyday-accent)") + ';font-weight:700">' + (dark ? "Accent text on stage" : "Link on pearl") + "</span></div>" +
        '<div><span class="btn btn-primary spx-focus" style="background:var(--r-signal-action);color:var(--r-signal-action-ink)">Focused action</span></div>' +
        '<div style="display:flex;gap:1.5rem;align-items:flex-end;padding-top:.4rem;border-top:1px solid ' + (dark ? "var(--r-stage-line)" : "var(--s-line)") + '">' +
        '<span class="nav-item" aria-current="page" style="color:' + (dark ? "#fff" : "var(--t-surface)") + '">Selected nav</span><span class="nav-item">Other</span></div></div>';
    }
    cob += '<div><span class="spx-label">On midnight navy</span>' + scope(ND, "suite", "", demo(true)) + "</div>";
    cob += '<div><span class="spx-label">On pearl</span>' + scope(ND, "suite", "", demo(false)) + "</div></div>";
    html += sec("cobalt", "2. Suite Style cobalt", "The proposed Suite Style tokens with measured contrast, shown in use on the midnight-navy stage and the pearl page: primary action, selected control, live indicator, accent text, focus and selected navigation. LIVE stays the Suite's live red in both styles: it is a state, not a brand colour.", cob);

    // ---- 3. Scoreboard -----------------------------------------------------
    function stage(T, style, st, variant, o) {
      var m = model(T, st, o); m.team.nick = nick(T);
      var cta = variant === "home" ? { href: "#scoreboard", label: st === "final" ? "Game Recap" : st === "live" ? "View Game" : "Game Details" } : null;
      return Suite.scoreboard.stage(m, { variant: variant, cta: cta });
    }
    var sbh = "";
    [ND, OSU].forEach(function (T) {
      ["team", "suite"].forEach(function (style) {
        sbh += '<h3 style="margin:1rem 0 .5rem">' + T.team.name + " · " + (style === "team" ? "Team Style" : "Suite Style") + '</h3><div class="spx-row">';
        ["pre", "live", "final"].forEach(function (st) {
          sbh += "<div><span class=\"spx-label\">Home · " + st + "</span>" + scope(T, style, "spx-phone", stage(T, style, st, "home")) + "</div>";
        });
        sbh += "<div><span class=\"spx-label\">Game · live</span>" + scope(T, style, "spx-phone", stage(T, style, "live", "game")) + "</div></div>";
      });
    });
    sbh += '<h3 style="margin:1rem 0 .5rem">No logos (offline first visit, blocked host)</h3><div class="spx-row">' +
           "<div><span class=\"spx-label\">Home · live</span>" + scope(ND, "team", "spx-phone", stage(ND, "team", "live", "home", { noMarks: true })) + "</div>" +
           "<div><span class=\"spx-label\">Game · live</span>" + scope(OSU, "team", "spx-phone", stage(OSU, "team", "live", "game", { noMarks: true })) + "</div></div>";
    sbh += '<h3 style="margin:1rem 0 .5rem">Desktop width</h3><div class="spx-row">' +
           "<div><span class=\"spx-label\">Home · live</span>" + scope(ND, "team", "spx-wide", stage(ND, "team", "live", "home")) + "</div>" +
           "<div><span class=\"spx-label\">Game · live</span>" + scope(OSU, "suite", "spx-wide", stage(OSU, "suite", "live", "game")) + "</div></div>";
    html += sec("scoreboard", "3. The scoreboard component", "One component, two compositions: Home's stage leads with the program and offers the way into Game; Game's is the board alone, larger. Pregame, live and final for both teams in both App Styles, the no-logo fallback, and desktop. The stage is the screen, not a card inside a band.", sbh);

    // ---- 4. Containers -----------------------------------------------------
    var cq = '<div class="spx-row">';
    [300, 390, 560, 900].forEach(function (w) {
      cq += '<div><span class="spx-label">' + w + "px container</span>" + '<div style="width:' + w + 'px">' + scope(OSU, "team", "", stage(OSU, "team", "live", "game")) + "</div></div>";
    });
    html += sec("containers", "4. Responsive by container", "The same board in containers of 300, 390, 560 and 900 px. It lays itself out from the width it is given, so it reads right in a phone column and in a desktop grid cell without screen-width rules.", cq + "</div>");

    // ---- 5. Atmosphere -----------------------------------------------------
    var at = '<div class="spx-row">';
    function bare(T, style, extra, label) {
      return "<div><span class=\"spx-label\">" + label + "</span>" + scope(T, style, "spx-phone", '<div class="stage ' + extra + '" style="height:320px">' +
             Suite.ui.art({ name: T.team.name, abbr: T.team.abbreviation, markUrl: TeamOS.espn.mark(T.cfg.sources.espn.teamId, true, true) }) + "</div>") + "</div>";
    }
    at += bare(ND, "team", "art-night", "Night, field treatment") + bare(ND, "team", "art-day", "Day, field treatment") +
          bare(OSU, "team", "art-night spx-nofield", "Night, no field") + bare(OSU, "suite", "art-night", "Suite Style, night");
    at += '</div><h3 style="margin:1.2rem 0 .5rem">The field treatment at full strength, for inspection</h3>' +
          '<div style="width:1200px;height:360px;background:#07192F;background-image:var(--s-art-field);background-size:cover;background-position:center bottom;border-radius:12px"></div>' +
          cap("<strong>A geometrically controlled field treatment</strong>, a texture rather than a complete field: no boundaries, end zones or yard numbers. Pinhole camera 24 ft up behind midfield, looking down the field (suite/ui.js FIELD). Yard lines every 5 yards, 4 in wide; hash marks every yard, 24 in long, 40 ft apart (60 ft from each sideline). The light falls off before the numbers (47 ft from centre), so they are never drawn rather than drawn wrong. The spacing follows the NCAA Football Rules Book, Rule 1.");
    html += sec("atmosphere", "5. Stadium atmosphere", "The fallback composition, CSS/SVG only, and the frame for the approved art (which brings the stands, the crowd and the stadium; nothing here draws them). <strong>Night:</strong> a dark sky, floodlight banks blazing at both upper corners with beams across the bowl, light over the upper stands, the lit field below. <strong>Day:</strong> an open sky, the team's colour bright, a high sun, the banks barely needed. <strong>The text floor</strong> is local: each block of words carries a feathered pool of the team's abyss, the only kind of surface the identity gate proves accent text on, so the light can live everywhere around it. Every team, both lights and every state, measured from the pixels (tools/herocontrastcheck.js).", at);

    // ---- 6. Final result ---------------------------------------------------
    var out = '<div class="spx-row">' +
      "<div><span class=\"spx-label\">Notre Dame · Team Style</span>" + scope(ND, "team", "spx-phone", stage(ND, "team", "final", "home")) + "</div>" +
      "<div><span class=\"spx-label\">Ohio State · Team Style</span>" + scope(OSU, "team", "spx-phone", stage(OSU, "team", "final", "home")) + "</div>" +
      "<div><span class=\"spx-label\">Ohio State · Suite Style</span>" + scope(OSU, "suite", "spx-phone", stage(OSU, "suite", "final", "game")) + "</div></div>";
    html += sec("outcome", "6. The final result: team-neutral", "Decided by David, 2026-11-07: the Game review of 2026-09-24 stands. No Win or Loss label; the score, the margin it shows, and the records the source gives communicate the outcome. The losing side reads quieter through the secondary ink.", out);

    // ---- 7. Desktop nav ----------------------------------------------------
    var CONCEPT = {
      current: "",
      docked: "@media (min-width:64rem){.navbar{left:0;right:0;width:auto;transform:none;border-radius:0;border-left:0;border-right:0;" +
              "padding-left:max(1rem,calc((100% - var(--s-content-wide))/2));padding-right:max(1rem,calc((100% - var(--s-content-wide))/2));" +
              "grid-template-columns:repeat(5,minmax(0,9rem));justify-content:center}.navbar::after{display:none}}",
      header: "@media (min-width:64rem){.navbar{top:var(--s-bar-h);bottom:auto;left:0;right:0;width:auto;transform:none;border-radius:0;border:0;" +
              "border-bottom:1px solid var(--s-line);padding:0 max(1rem,calc((100% - var(--s-content-wide))/2));grid-template-columns:repeat(5,auto);justify-content:start;column-gap:.5rem;align-items:center}" +
              ".navbar::after{display:none}.nav-item{flex-direction:row;min-height:3rem;padding:0 .9rem;gap:.5rem}.nav-item svg{width:20px;height:20px}" +
              ".navbar.game-raised .nav-game{width:auto;height:auto;min-height:3rem;margin:0;padding:0 .9rem;border-radius:var(--s-radius-ctl);background:none;color:var(--s-muted);box-shadow:none}" +
              ".navbar.game-raised .nav-game svg{width:20px;height:20px}.navbar.game-raised .nav-game .nav-live{position:static;margin:0}" +
              ".page-main{padding-top:3.25rem}}"
    };
    var nav = '<div class="spx-row">';
    [["current", "Today: the floating pill"], ["docked", "Concept A: docked, aligned to the grid"], ["header", "Concept B: tabs under the header"]].forEach(function (c) {
      nav += '<div><span class="spx-label">' + c[1] + '</span><div class="spx-scale"><iframe class="spx-iframe" data-concept="' + c[0] + '" src="../../?team=notre-dame#home" title="' + c[1] + '"></iframe></div></div>';
    });
    html += sec("nav", "7. Desktop navigation (1280 px, shown at half size)", "The real app in each frame, with the concept's CSS applied. Same five destinations, same behaviour and live Game state; only where the bar sits on a desktop screen changes.", nav + "</div>");

    root.innerHTML = html;
    [].forEach.call(document.querySelectorAll(".spx-nofield .art-field"), function (e) { e.style.display = "none"; });
    [].forEach.call(document.querySelectorAll(".sb"), function (sb) { Suite.scoreboard.fit(sb.parentNode); });
    [].forEach.call(document.querySelectorAll("iframe[data-concept]"), function (f) {
      f.addEventListener("load", function () {
        try { var st = f.contentDocument.createElement("style"); st.textContent = CONCEPT[f.dataset.concept]; f.contentDocument.head.appendChild(st); } catch (e) {}
      });
    });
    document.documentElement.setAttribute("data-ready", "1");
  }).catch(function (e) { root.textContent = "Specimen failed: " + e; document.documentElement.setAttribute("data-ready", "error"); });
})();
