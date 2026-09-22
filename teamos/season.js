/* TeamOS - season-to-date figures a team's own results already answer.

   Some of what a matchup card wants is not in any provider's team-statistics
   feed, but is sitting in the results the Suite has already fetched. Points
   allowed is the case that forced this file (decision 0011): ESPN's
   college-football team statistics endpoint publishes `pointsAllowed` and
   `yardsAllowed` and both are permanently 0 with rank "Tied-1st" - fields
   that exist without data. A team that has played and been scored on has
   allowed points, and its own schedule says exactly how many.

     Game[] (or score lines)  ->  TeamOS.season  ->  a number

   Pure arithmetic over domain objects. No provider is named here, no fetch is
   made, nothing is formatted for display - the Suite decides how a number is
   written. Only finished games count: a game in progress is a partial answer
   and a game not yet played is none.

   The input is anything carrying { state, us, them } - a Game, or the score
   lines TeamOS.espn.scoreLines() reads from a team's schedule payload, which
   is how the preview asks the same question about an opponent it has no team
   configuration for. `us` and `them` are the scores as the provider printed
   them, so they are read as text and parsed here; a 0 is a score. */

var TeamOS = TeamOS || {};

TeamOS.season = (function () {
  "use strict";

  // "17" -> 17, "1,223" -> 1223, null/"" /"-" -> null. A 0 survives.
  function num(v) {
    if (v == null) return null;
    var n = Number(String(v).replace(/,/g, "").trim());
    return isFinite(n) ? n : null;
  }

  function isFinal(g) { return !!g && g.state === "post"; }

  // The games that can answer a season-to-date question at all.
  function completed(games) {
    return (games || []).filter(isFinal);
  }

  // The average of one column over the finished games, to one decimal.
  // null when nothing has finished, or when no finished game carries a score
  // - which is the honest answer in week zero and the view skips the row.
  function perGame(games, field) {
    var total = 0, n = 0;
    completed(games).forEach(function (g) {
      var v = num(g[field]);
      if (v == null) return;
      total += v; n++;
    });
    return n ? Math.round((total / n) * 10) / 10 : null;
  }

  return {
    // Points this team has allowed per finished game: the opponent's score,
    // averaged. `them` is the opponent's score from this team's point of
    // view, which is what both a Game and a score line carry.
    pointsAllowedPerGame: function (games) { return perGame(games, "them"); },

    // The mirror, kept because the two are only meaningful together and a
    // caller that has one will want the other for a sanity check. The Suite
    // reads points scored from the provider, which ranks it nationally.
    pointsPerGame: function (games) { return perGame(games, "us"); },

    // How many games the figures above are averaged over, so a caller can
    // say "through 3 games" rather than implying a full season.
    gamesCounted: function (games) { return completed(games).length; }
  };
})();
