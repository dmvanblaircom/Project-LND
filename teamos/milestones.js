/* TeamOS - program milestones: the next round number of all-time wins
   (David, 2026-10-07: "Build the 1,000th win countdown before BYU").

     TEAM_CONFIG.history.record + this season's Games
       ->  TeamOS.milestones.wins(config, games, season, now)  ->  Milestone | null

     Milestone = { phase, target, wins, losses, ties, toGo, game, source, asOf }
       phase   "countdown"  within REACH wins of the next hundred; game is the
                            next one to play (null when none is scheduled)
               "reached"    the win that made the hundred, for HOLD_DAYS after
                            it; game is that win
       wins, losses, ties   the official all-time record as of now: the record
                            the team's own notes give ENTERING the season,
                            plus this season's finals
       toGo    wins still needed (0 when reached)

   - The record is the program's official one, as its own game notes publish
     it (vacated wins excluded where the program excludes them). Nothing here
     recounts history; it only adds this season's results to it.
   - A record for another season is never carried forward: a new season needs
     its own entering record, so a stale one shows nothing rather than a wrong
     count (null).
   - Only a final with a known result counts. A game in progress counts when
     it ends, never before.
   - null when the team declares no record, when no hundred is within reach,
     or when the last one was reached more than HOLD_DAYS ago.

   Pure: no fetch, no DOM. Names no team. */

var TeamOS = TeamOS || {};

TeamOS.milestones = (function () {
  "use strict";

  var REACH = 3, HOLD_DAYS = 7, STEP = 100;

  function int(v) { return typeof v === "number" && isFinite(v) && v >= 0 ? Math.floor(v) : null; }
  function time(g) { var t = Date.parse(g && g.date); return isNaN(t) ? 0 : t; }

  function wins(config, games, season, now) {
    var r = config && config.history && config.history.record;
    if (!r || int(r.wins) == null || int(r.losses) == null || String(r.season) !== String(season)) return null;
    var list = (games || []).filter(Boolean).slice().sort(function (a, b) { return time(a) - time(b); });
    var w = int(r.wins), l = int(r.losses), t = int(r.ties) || 0, reachedBy = null, reachedAt = null;
    list.forEach(function (g) {
      // a final with both scores: one without them is no result (B7)
      if (g.status !== "final" || g.won == null || g.us == null || g.them == null || g.us === "" || g.them === "") return;
      if (g.won === true) {
        w += 1;
        if (w % STEP === 0) { reachedBy = g; reachedAt = w; }
      } else if (g.us != null && g.them != null && String(g.us) === String(g.them)) t += 1;
      else l += 1;
    });
    var base = { wins: w, losses: l, ties: t, source: r.source || null, asOf: r.asOf || null };
    var nowT = (now instanceof Date ? now : new Date()).getTime();
    // The week after the hundredth win belongs to it, whatever comes next.
    if (reachedBy && nowT - time(reachedBy) <= HOLD_DAYS * 864e5) {
      return Object.assign(base, { phase: "reached", target: reachedAt, toGo: 0, game: reachedBy });
    }
    var target = (Math.floor(w / STEP) + 1) * STEP, toGo = target - w;
    if (toGo > REACH) return null;
    var next = list.filter(function (g) { return g.status !== "final" && g.status !== "canceled" && g.status !== "postponed"; })[0] || null;
    return Object.assign(base, { phase: "countdown", target: target, toGo: toGo, game: next });
  }

  return { wins: wins, REACH: REACH, HOLD_DAYS: HOLD_DAYS };
})();
