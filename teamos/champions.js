/* TeamOS - the defending national champion (David, 2026-10-27: a banner on
   Home for the defending champions, whoever they are).

     data/league/champion.json  ->  TeamOS.champions.defending(snap, config, season)  ->  Title | null

     Title = { season, opponent, score, game, label }
       season    the season the title was won, e.g. 2025
       opponent  the team beaten in the title game, as the provider names it
       score     "27-21", the winner's first
       game      the provider's event id
       label     the game's own name ("College Football Playoff National
                 Championship")

   - Who is champion is the league file's, which the refresh writes from the
     provider's postseason scoreboard (tools/producers/champion.py): the
     winner of the last title game played. Nothing names a team, here or in
     any team's configuration, so the banner moves to the next champion the
     morning after the next title game.
   - Defending means the title of the season before this one, or this
     season's once its title game is final (in January). One older than that
     is a file that stopped updating, and shows nothing.

   Pure: no fetch, no DOM. Names no team. */

var TeamOS = TeamOS || {};

TeamOS.champions = (function () {
  "use strict";

  function str(v) { return v == null ? "" : String(v); }

  function defending(snap, config, season) {
    var id = config && config.sources && config.sources.espn && str(config.sources.espn.teamId);
    if (!snap || !id || snap.capability !== "champion" || !snap.team) return null;
    if (str(snap.team.id) !== id) return null;
    var won = +snap.season;
    if (!(won === season || won === season - 1)) return null;
    var sc = snap.score || {};
    var w = sc.winner == null ? NaN : +sc.winner, l = sc.loser == null ? NaN : +sc.loser;
    return {
      season: won,
      opponent: str(snap.opponent && snap.opponent.name) || null,
      score: isFinite(w) && isFinite(l) ? w + "-" + l : null,
      game: snap.game ? str(snap.game) : null,
      label: str(snap.label) || null
    };
  }

  return { defending: defending };
})();
