/* TeamOS - one live state for one game.

   The same game reaches the Suite from three ESPN endpoints. The team's
   schedule produces Game, the league scoreboard produces LeagueGame, and the
   game summary produces GameDetail. That is fine - they answer different
   questions - but it means the score of a single game exists in three places,
   and on 2026-09-19 they disagreed: the Game Center showed Ohio State 49-0 in
   the fourth quarter while the hero and the schedule row still showed 0-0,
   because only the Game Center was being refreshed.

   The scoreboard is the league's live feed: every game in the window, with
   score, state and clock, refreshed as a unit. The team's schedule is a
   season list that happens to carry scores. So when both describe the same
   game, the scoreboard is the one to believe about what is happening right
   now.

   reconcile() is that rule, and nothing more:

     Game (from the schedule) + LeagueGame (from the scoreboard, same id)
        ->  Game with the league's live score, state and clock

   It is a pure function on domain objects. It names no provider, reads
   nothing, mutates nothing, and returns the original object when there is
   nothing to take - so a caller can use the result unconditionally.

   What it deliberately does NOT do: invent a score, downgrade a game, or
   touch anything the scoreboard has no opinion about (venue, broadcast,
   odds, series, weather). See
   docs/decisions/0010-one-live-state-per-game.md. */

var TeamOS = TeamOS || {};

TeamOS.live = (function () {
  "use strict";

  // How far a game can move. A game only ever advances, so a scoreboard that
  // still says "pre" can never pull a game that has started back to pre.
  var ORDER = { pre: 0, "in": 1, post: 2 };

  function rank(state) {
    return ORDER[state] == null ? 0 : ORDER[state];
  }

  // Is this LeagueGame the same game as this Game? Ids come from the same
  // provider event, so they compare directly; both are strings by the time
  // the adapters are done, but compare as strings anyway.
  function sameGame(game, lg) {
    return !!game && !!lg && String(game.id) === String(lg.id);
  }

  function reconcile(game, lg) {
    if (!sameGame(game, lg)) return game;
    if (rank(lg.state) < rank(game.state)) return game;   // never move backwards

    // The Game is written from the team's point of view; the LeagueGame is
    // neutral. Which side is "us" is already settled on the Game.
    var mine = game.home ? lg.home : lg.away;
    var theirs = game.home ? lg.away : lg.home;

    var out = {}, k;
    for (k in game) { if (Object.prototype.hasOwnProperty.call(game, k)) out[k] = game[k]; }

    out.state = lg.state;
    if (lg.detail) out.detail = lg.detail;
    // The normalized status travels with the state: a delay, a suspension
    // or a final is the scoreboard's news too (decision 0024 §14).
    if (lg.status) { out.status = lg.status; out.hasStarted = !!lg.hasStarted || !!game.hasStarted; }
    if (lg.period != null) out.period = lg.period;
    if (lg.clock != null) out.clock = lg.clock;
    // Where the ball is, from the team's side: "us", "them" or null. Only
    // while the scoreboard has a live situation; gone when it does not.
    var side = game.home ? "home" : "away";
    out.situation = lg.live ? {
      short: lg.live.short || "", spot: lg.live.spot || "",
      possession: withBall(lg) == null ? null : (withBall(lg) === side ? "us" : "them"),
      // at halftime, who gets the ball to start the second half
      receives: receives(lg) == null ? null : (receives(lg) === side ? "us" : "them")
    } : null;
    // A score of "0" is a score. Only an absent one leaves what was there.
    if (mine && mine.score != null) out.us = mine.score;
    if (theirs && theirs.score != null) out.them = theirs.score;
    // Records and ranks: a team's schedule carries them only for games
    // already played, so this week's opponent has none there. The week's
    // scoreboard does. It fills a gap; it never overwrites what the game
    // already says.
    if (!out.usRecord && mine && mine.record) out.usRecord = mine.record;
    if (!out.oppRecord && theirs && theirs.record) out.oppRecord = theirs.record;
    if (out.usRank == null && mine && mine.rank != null) out.usRank = mine.rank;
    if (out.oppRank == null && theirs && theirs.rank != null) out.oppRank = theirs.rank;

    // won is only knowable once it is over, and only from two real scores.
    if (lg.state === "post" && out.us != null && out.them != null) {
      var a = Number(out.us), b = Number(out.them);
      out.won = (isNaN(a) || isNaN(b)) ? game.won : (a === b ? null : a > b);
    }
    return out;
  }

  // The whole schedule against the whole scoreboard, by id. Games the
  // scoreboard says nothing about come back untouched.
  function reconcileAll(games, leagueGames) {
    if (!games || !games.length || !leagueGames || !leagueGames.length) return games || [];
    var byId = {};
    leagueGames.forEach(function (lg) { if (lg && lg.id != null) byId[String(lg.id)] = lg; });
    return games.map(function (g) {
      var lg = g && g.id != null ? byId[String(g.id)] : null;
      return lg ? reconcile(g, lg) : g;
    });
  }

  function isLive(g) { return !!g && g.state === "in"; }

  // Who has the ball in a live league game, "home" / "away" or null
  // (David, 2026-09-26). In order:
  //   - the side the feed names;
  //   - between plays, the side the last play leaves it with: after a
  //     kickoff the team that received it, after a score the team that
  //     scored, since it kicks off next;
  //   - between the halves and before overtime, no one - a coin toss or
  //     the second-half kickoff decides it;
  //   - otherwise the side the app last knew (live.carried, stamped by
  //     carryBall from the previous poll): a timeout, the end of the 1st or
  //     3rd quarter, or a safety - where the offense that was tackled kicks
  //     the free kick - leave the ball where it was. The feed names no one
  //     in any of those.
  function withBall(lg) {
    var l = lg && lg.live;
    if (!l) return null;
    if (l.possession) return l.possession;
    if ((l.lastPlayKind === "kickoff" || l.lastPlayKind === "score") && l.lastPlaySide) return l.lastPlaySide;
    if (betweenHalves(lg)) return null;
    return l.carried || null;
  }
  // Halftime (as TeamOS.game.halftime reads it) or the end of the 2nd or 4th
  // quarter.
  function betweenHalves(lg) { return /\bhalf/i.test(lg.detail || "") || /end of (the )?(2nd|4th)/i.test(lg.detail || ""); }

  // A new scoreboard, each live game stamped with the side the previous
  // scoreboard's same game had the ball (live.carried), so withBall can keep
  // it where the feed goes quiet. New objects; neither list is changed.
  function carryBall(games, previous) {
    var before = {};
    (previous || []).forEach(function (p) { if (p && p.live) before[p.id] = withBall(p); });
    return (games || []).map(function (lg) {
      if (!lg || !lg.live || !before[lg.id]) return lg;
      var out = {}, k;
      for (k in lg) { if (Object.prototype.hasOwnProperty.call(lg, k)) out[k] = lg[k]; }
      out.live = {};
      for (k in lg.live) { if (Object.prototype.hasOwnProperty.call(lg.live, k)) out.live[k] = lg.live[k]; }
      out.live.carried = before[lg.id];
      return out;
    });
  }

  // Who gets the ball to start the second half (David, 2026-09-26). The feed
  // does not say; the coin toss does. The team that received the opening
  // kickoff kicks off the second half, so at halftime the ball is coming
  // to the other side. Checked on every full game captured on 2026-09-26
  // and both of Notre Dame's earlier home games: 13 of 13. A team may elect
  // otherwise, which is rare; so this is only said at halftime, and the
  // second half's own feed takes over at its kickoff.
  //   openingSide(gameDetail)  "home" / "away": whose the game's first drive was
  //   withOpening(games, map)  each live game stamped live.opening from a
  //                            { gameId: side } the app has learned
  //   receives(leagueGame)     at halftime, the side getting the ball; else null
  function openingSide(gd) {
    var list = gd && gd.drives && gd.drives.list;
    return list && list.length && (list[0].side === "home" || list[0].side === "away") ? list[0].side : null;
  }
  function withOpening(games, map) {
    return (games || []).map(function (lg) {
      var side = lg && lg.live && map && map[lg.id];
      if (!side || lg.live.opening === side) return lg;
      var out = {}, k;
      for (k in lg) { if (Object.prototype.hasOwnProperty.call(lg, k)) out[k] = lg[k]; }
      out.live = {};
      for (k in lg.live) { if (Object.prototype.hasOwnProperty.call(lg.live, k)) out.live[k] = lg.live[k]; }
      out.live.opening = side;
      return out;
    });
  }
  function atHalf(lg) { return !!lg && /\bhalf|end of (the )?2nd/i.test(lg.detail || ""); }
  function receives(lg) {
    var o = lg && lg.live && lg.live.opening;
    return atHalf(lg) && o ? (o === "home" ? "away" : "home") : null;
  }

  // Anything in this list still being played, from either kind of object.
  function anyLive(list) {
    return !!list && list.some(function (x) { return !!x && x.state === "in"; });
  }

  return {
    reconcile: reconcile,
    reconcileAll: reconcileAll,
    isLive: isLive,
    anyLive: anyLive,
    withBall: withBall,
    carryBall: carryBall,
    openingSide: openingSide,
    withOpening: withOpening,
    atHalf: atHalf,
    receives: receives
  };
})();
