/* TeamOS - game moments: what changed between two looks at the same game
   (Phase 2 spec §3.5 and §7, docs/design/suite-home-game-approved-spec-v1.md).

   Live data is polled about every 30 seconds; nothing here pretends
   otherwise. A moment is something a refresh OBSERVED had changed, never a
   play happening now, and it is only as specific as the normalized data says
   explicitly:

     TeamOS.moments.detect(prev, next)  -> Moment | null
       prev, next  { game, detail }  the normalized Game and its GameDetail
                   (or null), as the controller last drew them and as the new
                   refresh brings them
       Moment      { kind, side, points, count }
         kind   "kickoff"   the game went from not under way to under way
                "final"     the game went final
                "touchdown" one new score, and the play it came from is tagged
                            Touchdown by the provider's own play type
                "fieldgoal" one new score whose scoring text says Field Goal
                "safety"    one new score whose scoring text says Safety
                "score"     a score changed and none of the above can be said
                            (several scores between refreshes, or no explicit
                            classification) - the generic update
                "turnover"  the last play changed and is tagged Turnover or
                            Turnover on downs; a change of possession alone is
                            never a turnover
         side   "us" | "them" | null (who scored or took the ball; null when
                it cannot be said)
         points the points the followed side's or opponent's score rose by, for
                "score" kinds; null otherwise
         count  how many new scoring plays the refresh brought (0 if none)
       The words a screen reader hears are Suite's, built from the Moment.

     TeamOS.moments.allow(ctx)  -> boolean
       Whether a detected moment may be shown. The controller knows what a
       renderer cannot: whether this paint came from the network, whether the
       page was visible for both looks, whether this is the first look at all.
       ctx { first, fromNetwork, visible, hiddenSince, lastLookAt, now, maxGapMs }
       A moment never fires on the first paint, a cached paint, a paint while
       hidden, the catch-up after returning from the background, or after a
       gap longer than maxGapMs between looks (default 75 s: two missed polls),
       because then the change is old news, not a moment.

   Pure: no DOM, no fetch, no team names. Quarter changes are deliberately
   not moments in Phase 2 (spec §7). */

var TeamOS = TeamOS || {};

TeamOS.moments = (function () {
  "use strict";

  var MAX_GAP_MS = 75 * 1000;

  function num(v) { var n = Number(v); return v == null || v === "" || !isFinite(n) ? null : n; }
  function underWay(g) {
    if (!g) return false;
    return TeamOS.game && TeamOS.game.underWay ? TeamOS.game.underWay(g) : g.status === "live";
  }

  function scoringIds(d) {
    return ((d && d.scoring) || []).map(function (p) { return String(p.id); });
  }

  // The new scoring plays, in game order, that the previous look did not have.
  function newScoring(prev, next) {
    var had = {}, out = [];
    scoringIds(prev && prev.detail).forEach(function (id) { had[id] = 1; });
    ((next.detail && next.detail.scoring) || []).forEach(function (p) { if (!had[String(p.id)]) out.push(p); });
    return out;
  }

  function lastPlayKey(d) {
    var lp = d && d.lastPlay;
    return lp ? [lp.at || "", lp.text || ""].join("|") : null;
  }

  function sideOfPlay(p) { return p && typeof p.mine === "boolean" ? (p.mine ? "us" : "them") : null; }

  function detect(prev, next) {
    if (!prev || !prev.game || !next || !next.game) return null;
    var a = prev.game, b = next.game;
    if (String(a.id) !== String(b.id)) return null;          // a different game is not a change

    // Lifecycle first: they say the most and are confirmed by status alone.
    if (a.status !== "final" && b.status === "final") return moment("final", null, null, 0);
    if (!underWay(a) && underWay(b) && a.status !== "final") return moment("kickoff", null, null, 0);

    var dUs = (num(b.us) != null && num(a.us) != null) ? num(b.us) - num(a.us) : 0;
    var dThem = (num(b.them) != null && num(a.them) != null) ? num(b.them) - num(a.them) : 0;
    var fresh = newScoring(prev, next);

    if (dUs > 0 || dThem > 0) {
      var side = dUs > 0 && dThem > 0 ? null : (dUs > 0 ? "us" : "them");
      var points = side === "us" ? dUs : side === "them" ? dThem : null;
      // One new scoring play, agreeing with the score that moved: its own
      // classification may be said. Anything else is the generic update.
      if (fresh.length === 1 && side && sideOfPlay(fresh[0]) === side) {
        var p = fresh[0], text = String(p.text || "");
        var lp = next.detail && next.detail.lastPlay, tags = (lp && lp.tags) || [];
        if (tags.indexOf("Touchdown") > -1 && lastPlayKey(next.detail) !== lastPlayKey(prev.detail))
          return moment("touchdown", side, points, 1);
        if (/\bfield goal\b/i.test(text) && !/\bno good\b|\bmissed\b|\bblocked\b/i.test(text))
          return moment("fieldgoal", side, points, 1);
        if (/\bsafety\b/i.test(text)) return moment("safety", side, points, 1);
      }
      return moment("score", side, points, fresh.length);
    }

    // No score changed: a turnover only when the provider tagged the new play so.
    if (lastPlayKey(next.detail) && lastPlayKey(next.detail) !== lastPlayKey(prev.detail)) {
      var t = (next.detail.lastPlay.tags) || [];
      if (t.indexOf("Turnover") > -1 || t.indexOf("Turnover on downs") > -1) {
        return moment("turnover", null, null, 0);
      }
    }
    return null;
  }

  function moment(kind, side, points, count) {
    return { kind: kind, side: side, points: points, count: count };
  }

  function allow(ctx) {
    ctx = ctx || {};
    if (ctx.first || !ctx.fromNetwork || !ctx.visible) return false;
    var now = ctx.now == null ? Date.now() : ctx.now;
    var gap = ctx.maxGapMs == null ? MAX_GAP_MS : ctx.maxGapMs;
    // back from the background: whatever changed while away is catch-up
    if (ctx.hiddenSince != null && ctx.hiddenSince >= (ctx.lastLookAt == null ? -Infinity : ctx.lastLookAt)) return false;
    if (ctx.lastLookAt == null || now - ctx.lastLookAt > gap) return false;
    return true;
  }

  return { detect: detect, allow: allow, MAX_GAP_MS: MAX_GAP_MS };
})();
