/* Suite - Stats: the team's season (W27; docs/product/season-stats-proposal.md,
   approved by David 2026-10-01).

     #stats      the Team view: the season so far, by group - offense,
                 defense, special teams, turnovers and penalties - each figure
                 with its national rank where more of it is better; in game
                 week, this week's opponent beside it

   A secondary destination owned by More (decision 0028), reached from More,
   the Roster tab and Game's Matchup card. This file only draws: app.js
   fetches, TeamOS.espn.teamSeason() decides which figures exist and what
   they are called; nothing here reads a provider payload or names a team.

     Suite.stats.paint(host, {
       team: { name, abbr }, opp: { name, abbr } | null,
       season: "2026" , postseason: bool,
       us: TeamSeason | null, them: TeamSeason | null,
       loading: bool, failed: bool, offline: bool })              */

var Suite = Suite || {};

Suite.stats = (function () {
  "use strict";

  var ui = Suite.ui, esc = ui.esc;
  var last = "";

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

  function paint(host, m) {
    if (!host) return;
    var html;
    if (!m.us) {
      html = m.failed
        ? '<p class="sec-quiet">' + (m.offline ? "You're offline. Season stats load when the connection returns."
                                                : "Season stats didn't load. Pull down to try again.") + "</p>"
        : '<p class="sec-quiet">Loading season stats…</p>';
    } else {
      var them = m.opp && m.them ? m.them : null;
      var line = m.season + (m.postseason ? " season, postseason included" : " regular season") +
                 (m.us.games ? " · " + m.us.games + (m.us.games === 1 ? " game" : " games") : "");
      html = '<p class="ss-season">' + esc(line) + "</p>" +
             (them ? '<p class="ss-week">This week: ' + esc(m.team.abbr) + " and " + esc(m.opp.name) + ", side by side.</p>" : "") +
             m.us.groups.map(function (g) { return groupHtml(g, them, m); }).join("") +
             '<p class="ss-note">Ranks are national, where a higher figure is better. Source: ESPN.</p>';
    }
    if (html === last && host.innerHTML) return;     // a background refresh never resets the scroll
    last = html;
    host.innerHTML = html;
  }

  return { paint: paint };
})();
