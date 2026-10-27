/* TeamOS - CollegeFootballData, as Suite's edge API serves it (decision 0030).

     GET <edge>/v1/cfbd/season?team=&year=  ->  TeamOS.cfbd.yardsAllowed()
                                                TeamOS.cfbd.turnovers()

   CFBD's season totals for a team include what its opponents gained against
   it (rushingYardsOpponent, netPassingYardsOpponent) and the games those
   came from. Per game, that is the yards the defence allowed: the Matchup
   card's Rushing defense and Passing defense rows (W15). CFBD publishes no
   national rank for them, so they carry none.

   Its turnovers too: what the team gave away (turnovers) and took away
   (turnoversOpponent), and the margin between them - the Matchup card's
   Turnover margin row and the Stats screen's turnover rows. ESPN's own
   margin matched the NCAA's table for 10% of FBS teams, CFBD's for 93%
   (2026-10-27).

   The edge API returns only those fields and never CFBD's raw payload; this
   file is the one place in the app that knows their names.

   Pure: no fetch, no DOM. Names no team. */

var TeamOS = TeamOS || {};

TeamOS.cfbd = (function () {
  "use strict";

  function num(v) { return typeof v === "number" && isFinite(v) ? v : null; }

  // The path on the edge API for one team's season. `school` is the school's
  // name as the provider lists it (ESPN's `location`, which CFBD shares for
  // nearly every program); one it does not know comes back with no stats.
  function seasonPath(school, year) {
    return "/v1/cfbd/season?team=" + encodeURIComponent(String(school || "").trim()) + "&year=" + year;
  }

  // The edge API's answer -> { rush, pass, games, asOf, stale }: yards
  // allowed per game, to one decimal as the card shows them. A figure CFBD
  // did not send stays null - never 0 - and so does everything before a
  // team has played. A real 0 (a shutout of the ground game) is kept.
  function yardsAllowed(json) {
    var s = (json && json.stats) || {};
    var games = num(s.games);
    function per(total) {
      total = num(total);
      return games && games > 0 && total != null ? Math.round(total / games * 10) / 10 : null;
    }
    return {
      rush: per(s.rushingYardsOpponent),
      pass: per(s.netPassingYardsOpponent),
      games: games,
      asOf: (json && json.fetchedAt) || null,
      stale: !!(json && json.stale)
    };
  }

  // The edge API's answer -> { margin, takeaways, giveaways }: season
  // totals, null where CFBD sent nothing (never 0), and the margin only when
  // both sides of it came.
  function turnovers(json) {
    var s = (json && json.stats) || {};
    var given = num(s.turnovers), taken = num(s.turnoversOpponent);
    return { margin: given != null && taken != null ? taken - given : null, takeaways: taken, giveaways: given };
  }
  // A margin as Suite prints one: "+8", "-6", "0".
  function signed(n) { return n == null ? null : (n > 0 ? "+" : "") + n; }

  // A team's season as TeamOS.espn.teamSeason() shapes it, with the
  // turnover rows put first in its "turnovers" group (made, after the rest,
  // if ESPN's figures left it out). Rows CFBD has no figure for are left
  // out, as teamSeason leaves out its own. No rank: CFBD publishes none.
  function withTurnovers(season, t) {
    if (!season || !t) return season;
    var rows = [["turnoverMargin", "Turnover margin", signed(t.margin)],
                ["takeaways", "Takeaways", t.takeaways == null ? null : String(t.takeaways)],
                ["giveaways", "Giveaways", t.giveaways == null ? null : String(t.giveaways)]]
      .filter(function (r) { return r[2] != null; })
      .map(function (r) { return { key: r[0], label: r[1], value: r[2], rank: null }; });
    if (!rows.length) return season;
    var groups = season.groups.slice(), at = -1;
    groups.forEach(function (g, i) { if (g.id === "turnovers") at = i; });
    if (at === -1) groups.push({ id: "turnovers", label: "Turnovers and penalties", rows: rows });
    else groups[at] = { id: groups[at].id, label: groups[at].label, rows: rows.concat(groups[at].rows) };
    return { games: season.games, groups: groups };
  }

  return { seasonPath: seasonPath, yardsAllowed: yardsAllowed, turnovers: turnovers, signed: signed, withTurnovers: withTurnovers };
})();
