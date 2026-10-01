/* TeamOS - CollegeFootballData, as Suite's edge API serves it (decision 0030).

     GET <edge>/v1/cfbd/season?team=&year=  ->  TeamOS.cfbd.yardsAllowed()

   CFBD's season totals for a team include what its opponents gained against
   it (rushingYardsOpponent, netPassingYardsOpponent) and the games those
   came from. Per game, that is the yards the defence allowed: the Matchup
   card's Rushing defense and Passing defense rows (W15). CFBD publishes no
   national rank for them, so they carry none.

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

  return { seasonPath: seasonPath, yardsAllowed: yardsAllowed };
})();
