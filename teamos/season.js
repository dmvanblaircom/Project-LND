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

  /* ---------- the season's phase (W16) ----------

     Where a team's season stands, from what the sources have actually said -
     docs/product/offseason-home-proposal.md §2, states S1-S5:

       in-season            a regular-season game is still to come or under way (S1)
       awaiting-postseason  the regular season is done and selection has not
                            happened (S2)
       postseason           a postseason game is scheduled or under way, or a
                            playoff round was won: the bracket is fixed, so the
                            season goes on to the next round whether or not
                            the feed lists that game yet (S3)
       complete             nothing more this season, and next season's
                            schedule is not published (S4)
       next-published       nothing more this season, and next season's
                            opener is listed (S5)
       unknown              no games at all: nothing to say

     It never infers. An empty postseason is "not selected" only when the
     league's selection is known to have happened (`selected`), or once the
     calendar rules any postseason out; a won playoff game ends the season
     only when it was the title game, and never sends it back to selection.
     What ended the season is `ended`:
     lost | bowl | champion | not-selected | calendar.

     Input:  { games    Game[] of this season, regular and postseason joined
               next     Game[] of next season; null when not known, [] when
                        asked and nothing is published
               selected true once the league's postseason is set
                        (TeamOS.espn.postseasonSelected), null when not known
               season   this season's year; read from the games when absent
               now }
     Pure: no provider is named, nothing is fetched or formatted. */

  // A listed game that has not started is still to come for this long after
  // its kickoff - the hero's rule (TeamOS.game), so the two never disagree.
  var GRACE_MS = 4 * 60 * 60 * 1000;
  // The longest a team that won a playoff round waits for the next one to be
  // listed, with a wide margin: the rounds are one to two weeks apart.
  var ROUND_GAP_MS = 30 * 24 * 60 * 60 * 1000;
  // No college football postseason game is played after January: from
  // February 1 an empty postseason means there is none.
  function postseasonOver(season, t) { return season != null && t >= Date.UTC(season + 1, 1, 1); }

  function at(g) { return Date.parse(g.date); }
  function byDate(a, b) { return at(a) - at(b); }
  function dated(list) { return (list || []).filter(function (g) { return g && g.date && isFinite(at(g)); }).sort(byDate); }

  function toCome(g, t) {
    if (g.state === "post" || g.status === "final" || g.status === "canceled") return false;
    if (g.state === "in") return true;
    if (g.status === "delayed" && !g.hasStarted) return true;
    return at(g) >= t - GRACE_MS;
  }

  function phase(o) {
    o = o || {};
    var now = o.now == null ? new Date() : o.now;
    var t = (now instanceof Date ? now : new Date(now)).getTime();
    var games = dated(o.games);
    var regular = games.filter(function (g) { return !g.postseason; });
    var post = games.filter(function (g) { return g.postseason; });
    var played = games.filter(isFinal), last = played[played.length - 1] || null;
    var postPlayed = post.filter(isFinal), lastPost = postPlayed[postPlayed.length - 1] || null;
    var season = o.season != null ? o.season
      : (regular[0] || games[0]) ? new Date(at(regular[0] || games[0])).getUTCFullYear() : null;
    var next = o.next == null ? null : dated(o.next);
    var after = games.length ? at(games[games.length - 1]) : -Infinity;
    var opener = next ? (next.filter(function (g) { return at(g) > after; })[0] || null) : null;

    var p = {
      state: null, ended: null, season: season,
      last: last, record: last ? (last.usRecord || null) : null,
      postseason: post.length ? { games: post, last: lastPost,
        result: lastPost ? (lastPost.won === true ? "won" : "lost") : null } : null,
      nextSeason: season != null ? season + 1 : null,
      opener: opener,
      // Ask for next season's schedule once this season's regular season is done.
      askNext: false
    };
    function is(state, ended) {
      p.state = state; p.ended = ended || null;
      p.askNext = state !== "in-season" && state !== "unknown";
      return p;
    }
    function over(ended) { return is(opener ? "next-published" : "complete", ended); }

    if (!games.length) return opener ? is("next-published") : is("unknown");
    if (regular.some(function (g) { return toCome(g, t); })) return is("in-season");
    if (post.some(function (g) { return toCome(g, t); })) return is("postseason");

    if (lastPost) {
      if (lastPost.won !== true) return over("lost");
      var st = lastPost.stage;
      if (st && st.last) return over(st.kind === "bowl" ? "bowl" : "champion");
      // A playoff round won: the bracket is fixed, so the team plays on
      // (David, 2026-10-02) - postseason, even before the feed lists the
      // next game. Selection never reopens.
      if (t - at(lastPost) < ROUND_GAP_MS && !postseasonOver(season, t)) return is("postseason");
      return over("calendar");
    }
    if (o.selected === true) return over("not-selected");
    if (postseasonOver(season, t)) return over("calendar");
    return is("awaiting-postseason");
  }

  /* ---------- the league's calendar (the CFP's rankings, Selection Day) ----------

     What a fan should know is coming, from the league's published calendar
     (leagues/<league>.js, LEAGUE_CALENDAR): the ONE rankings release on air
     now or next - never the whole list, so it moves on by itself each week -
     Selection Day until its show ends, and the day the bowls name their teams.
     Nothing once Selection Day is over: the bowl and playoff games are then on
     the schedule itself.

       { rankings  { n, start, end, on, live, first, last } | null
         selection { start, end, on, live } | null
         bowls     { day } | null - while Selection Day is still to come }

     Pure: the calendar is passed in, nothing is fetched or formatted. */
  function calendar(cal, season, now) {
    var t = (now instanceof Date ? now : new Date(now == null ? Date.now() : now)).getTime();
    var events = (cal && cal.seasons && cal.seasons[String(season)]) || [];
    var shows = events.filter(function (e) { return e.kind === "rankings" && isFinite(Date.parse(e.start)); })
      .sort(function (a, b) { return Date.parse(a.start) - Date.parse(b.start); });
    var lastN = shows.length ? shows[shows.length - 1].n : null;
    function on(e) { return Date.parse(e.start) <= t && t < Date.parse(e.end || e.start); }
    var pick = shows.filter(on)[0] || shows.filter(function (e) { return Date.parse(e.start) > t; })[0] || null;
    var sel = events.filter(function (e) { return e.kind === "selection"; })[0] || null;
    var selection = sel && t < Date.parse(sel.end || sel.start)
      ? { start: sel.start, end: sel.end || null, on: sel.on || null, live: on(sel) } : null;
    var bowls = events.filter(function (e) { return e.kind === "bowls"; })[0] || null;
    return {
      rankings: pick ? { n: pick.n, start: pick.start, end: pick.end || null, on: pick.on || null,
                         live: on(pick), first: pick.n === 1, last: pick.n === lastN } : null,
      selection: selection,
      bowls: bowls && selection ? { day: bowls.day } : null
    };
  }

  return {
    calendar: calendar,

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
    gamesCounted: function (games) { return completed(games).length; },

    phase: phase
  };
})();
