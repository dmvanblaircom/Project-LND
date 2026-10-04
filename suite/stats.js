/* Suite - Stats: the team's season (W27; docs/product/season-stats-proposal.md,
   approved by David 2026-10-01).

     #stats      the Team view: the season so far, by group - offense,
                 defense, special teams, turnovers and penalties - each figure
                 with its national rank where more of it is better; in game
                 week, this week's opponent beside it
     #stats/players  the Players view (Phase 2): the season leaders as
                 tables - Passing, Rushing, Receiving, Defense - in Box
                 Score's table, each figure the provider's own

   A secondary destination owned by More (decision 0028), reached from More,
   the Roster tab and Game's Matchup card. This file only draws: app.js
   fetches, TeamOS.espn.teamSeason() decides which figures exist and what
   they are called; nothing here reads a provider payload or names a team.

     Suite.stats.paint(host, {
       team: { name, abbr }, opp: { name, abbr } | null,
       season: "2026" , postseason: bool,
       us: TeamSeason | null, them: TeamSeason | null,
       loading: bool, failed: bool, offline: bool,
       view: "team" | "players",
       players: { tables: [{ key, label, labels, rows: [{ name, stats }] }],
                  unnamed: number } | null,
       playersFailed: bool })                                       */

var Suite = Suite || {};

Suite.stats = (function () {
  "use strict";

  var ui = Suite.ui, esc = ui.esc;
  var last = "";
  var tableObserver = null;

  // Tables become keyboard-scrollable only when they need to scroll. Watch
  // both boxes: a viewport resize or a late font can change that need.
  function watchTables(host) {
    if (tableObserver) { tableObserver.disconnect(); tableObserver = null; }
    if (!host.querySelectorAll) return;
    var wraps = host.querySelectorAll(".ss-card .bx-wrap");
    function update() {
      Array.prototype.forEach.call(wraps, function (wrap) {
        var scrolls = wrap.scrollWidth > wrap.clientWidth + 1;
        var hint = wrap.previousElementSibling;
        hint.hidden = !scrolls;
        if (scrolls) {
          wrap.tabIndex = 0;
          wrap.setAttribute("role", "region");
          wrap.setAttribute("aria-labelledby", wrap.closest("section").getAttribute("aria-labelledby"));
          wrap.setAttribute("aria-describedby", hint.id);
        } else {
          ["tabindex", "role", "aria-labelledby", "aria-describedby"].forEach(function (a) { wrap.removeAttribute(a); });
        }
      });
    }
    update();
    if (typeof ResizeObserver !== "undefined" && wraps.length) {
      tableObserver = new ResizeObserver(update);
      Array.prototype.forEach.call(wraps, function (wrap) {
        tableObserver.observe(wrap); tableObserver.observe(wrap.querySelector("table"));
      });
    }
  }

  // In game week each value is said with its team: the column labels are
  // drawn once per card for the eye and hidden from assistive technology, so
  // a screen reader hears "ND 42.3, 17th; MSU 45.0, 6th" (Codex review, #82).
  function rowHtml(r, b, two, m) {
    function cell(x, side) {
      var who = two ? '<span class="sr-only">' + esc(side === "us" ? m.team.abbr : (m.opp.abbr || m.opp.name)) + " </span>" : "";
      if (!x) return '<span class="ss-v ' + side + '">' + who + '<span class="ss-n">–</span><span class="sr-only"> not available</span></span>';
      return '<span class="ss-v ' + side + '">' + who + '<span class="ss-n">' + esc(x.value) + "</span>" +
             (x.rank ? '<span class="ss-rk"><span class="sr-only">, </span>' + esc(x.rank) + "</span>" : "") + "</span>";
    }
    return '<li class="ss-row' + (two ? " two" : "") + '"><span class="ss-l">' + esc(r.label) + "</span>" +
           cell(r, "us") + (two ? cell(b, "them") : "") + "</li>";
  }

  function groupHtml(g, them, m) {
    var theirs = {};
    if (them) them.groups.forEach(function (tg) { tg.rows.forEach(function (x) { theirs[x.key] = x; }); });
    var two = !!them;
    return '<section class="card gcard ss-card" aria-labelledby="ss-' + esc(g.id) + '">' +
             '<div class="gcard-head"><h2 class="gcard-title" id="ss-' + esc(g.id) + '">' + esc(g.label) + "</h2></div>" +
             // the column labels sit on the rows' own grid, so each is over
             // its figures whatever the title's length (David, 2026-10-02)
             (two ? '<div class="ss-cols" aria-hidden="true"><span></span><span>' + esc(m.team.abbr) + "</span><span>" + esc(m.opp.abbr || m.opp.name) + "</span></div>" : "") +
             '<ul class="ss-list">' + g.rows.map(function (r) { return rowHtml(r, theirs[r.key], two, m); }).join("") + "</ul>" +
           "</section>";
  }

  function seasonLine(m) {
    return m.season + (m.postseason ? " season, postseason included" : " regular season") +
           (m.us && m.us.games ? " \u00b7 " + m.us.games + (m.us.games === 1 ? " game" : " games") : "");
  }

  function strip(view) {
    return '<nav class="game-tabs view-tabs" aria-label="Stats views">' +
      [["team", "Team", "#stats"], ["players", "Players", "#stats/players"]].map(function (v) {
        return '<a href="' + v[2] + '"' + (v[0] === view ? ' aria-current="page"' : "") + ">" + v[1] + "</a>";
      }).join("") + "</nav>";
  }

  // One leader table, in Box Score's table (.bx): the player, then the
  // provider's own figures under its own labels.
  function tableHtml(t, team) {
    return '<section class="card gcard ss-card" aria-labelledby="sp-' + esc(t.key) + '">' +
             '<div class="gcard-head"><h2 class="gcard-title" id="sp-' + esc(t.key) + '">' + esc(t.label) + "</h2></div>" +
             '<p class="ss-scroll-hint" id="sp-scroll-' + esc(t.key) + '" hidden>Scroll for more stats</p>' +
             '<div class="bx-wrap"><table class="bx" aria-label="' + esc(team + " " + t.label) + '">' +
               '<thead><tr><th scope="col">Player</th>' + t.labels.map(function (l) { return '<th scope="col">' + esc(l) + "</th>"; }).join("") + "</tr></thead>" +
               "<tbody>" + t.rows.map(function (r) {
                 return '<tr><th scope="row">' + esc(r.name) + "</th>" + r.stats.map(function (v) {
                   return "<td>" + (v === "\u2013" ? '<span aria-hidden="true">\u2013</span><span class="sr-only">none</span>' : esc(v)) + "</td>";
                 }).join("") + "</tr>";
               }).join("") + "</tbody></table></div>" +
           "</section>";
  }

  function playersHtml(m) {
    var p = m.players;
    if (!p) {
      return '<p class="sec-quiet">' + (m.playersFailed
        ? (m.offline ? "You're offline. Player stats load when the connection returns."
                     : "Player stats didn't load. Pull down to try again.")
        : "Loading player stats\u2026") + "</p>";
    }
    if (!p.tables.length) return '<p class="sec-quiet">No player stats yet this season.</p>';
    return p.tables.map(function (t) { return tableHtml(t, m.team.name); }).join("") +
      '<p class="ss-note">Each category\u2019s season leaders, up to 25 deep. Source: ESPN.' +
      (p.unnamed ? " " + p.unnamed + (p.unnamed === 1 ? " player isn\u2019t" : " players aren\u2019t") + " shown: ESPN hasn\u2019t named them yet." : "") +
      "</p>";
  }

  function paint(host, m) {
    if (!host) return;
    var html;
    var players = m.view === "players";
    if (players) {
      html = strip("players") + '<p class="ss-season">' + esc(seasonLine(m)) + "</p>" + playersHtml(m);
    } else if (!m.us) {
      html = m.failed
        ? '<p class="sec-quiet">' + (m.offline ? "You're offline. Season stats load when the connection returns."
                                                : "Season stats didn't load. Pull down to try again.") + "</p>"
        : '<p class="sec-quiet">Loading season stats…</p>';
    } else {
      var them = m.opp && m.them ? m.them : null;
      html = '<p class="ss-season">' + esc(seasonLine(m)) + "</p>" +
             (them ? '<p class="ss-week">This week: ' + esc(m.team.abbr) + " and " + esc(m.opp.name) + ", side by side.</p>" : "") +
             m.us.groups.map(function (g) { return groupHtml(g, them, m); }).join("") +
             '<p class="ss-note">Ranks are national, where a higher figure is better. Source: ESPN.</p>';
    }
    if (!players) html = strip("team") + html;
    if (html === last && host.innerHTML) return;     // a background refresh never resets the scroll
    last = html;
    host.innerHTML = html;
    watchTables(host);
  }

  return { paint: paint };
})();
