/* Suite - the scoreboard: one component for every place a game's state is
   drawn (Phase 2 spec §3, §5, §6; Stage 1b, docs/design/suite-home-game-
   approved-spec-v1.md). Home's hero and Game's scoreboard are compositions
   of it, not two copies of the same markup: one numeric system, one
   missing-mark fallback, one place the game moments attach.

     Suite.scoreboard.board(m, opts)   the scoreboard itself
     Suite.scoreboard.stage(m, opts)   a stage: the stadium atmosphere with
                                       the board on it - Home's hero or
                                       Game's scoreboard, by opts.variant

       m      { team { name, nick, abbr, markUrl }, game (normalized Game),
                oppMark(providerId) -> url, art (ui.art options), now (Date) }
       opts   { variant: "home" | "game",
                cta: { href, label } - Home's way into Game }

   A final is team-neutral (Game review, 2026-09-24; kept by David,
   2026-11-07): no Win or Loss word - the scores, and the records the source
   gives, say the outcome.

   It lays itself out from the width it is given (container queries), not
   the screen's, so the same board reads right in a phone column and in a
   desktop grid cell. It draws only what the normalized Game says: no clock
   it was not given, no possession it cannot see, no score before kickoff.
   Nothing here fetches, reads a provider payload, or names a team. */

var Suite = Suite || {};

Suite.scoreboard = (function () {
  "use strict";

  var ui = Suite.ui, esc = ui.esc;
  var CHEVRON = '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m9 6 6 6-6 6"/></svg>';

  // One rule for what state a game is in, Home's (decision 0022 #5).
  function state(g) { return Suite.home.cardState(g); }
  function scored(g) { return TeamOS.game.scored(g); }
  function shows(st, g) { return st === "live" || st === "paused" || (st === "final" && scored(g)); }

  function tone(g, us, st) {
    if (st !== "final" || !scored(g)) return "";
    var a = Number(g.us), b = Number(g.them);
    if (!isFinite(a) || !isFinite(b) || a === b) return "";
    return (us ? a > b : b > a) ? " is-winner" : " is-loser";
  }

  function ball(g, us, st) {
    return (st === "live" || st === "paused") && g.situation && !TeamOS.game.halftime(g) &&
           g.situation.possession === (us ? "us" : "them");
  }

  function side(m, us, st) {
    var g = m.game, t = m.team;
    var name = us ? t.name : g.oppName, abbr = (us ? t.abbr : g.oppAbbr) || name;
    var rank = us ? g.usRank : g.oppRank, record = us ? g.usRecord : g.oppRecord;
    var mark = us ? ui.mark(t.markUrl, t.name, t.abbr, "bare sb-mark")
                  : ui.mark(m.oppMark ? m.oppMark(g.oppProviderId) : null, g.oppName, g.oppAbbr, "bare sb-mark");
    return '<div class="sb-team sb-' + (us ? "us" : "them") + tone(g, us, st) + '">' + mark +
             '<p class="sb-name">' + (rank ? '<span class="sb-rank">#' + esc(rank) + "</span> " : "") +
               '<span class="sb-full">' + esc(name) + '</span><span class="sb-abbr">' + esc(abbr) + "</span></p>" +
             '<p class="sb-rec">' + (record ? esc(record) : " ") + "</p>" +
           "</div>";
  }

  function score(m, us, st) {
    var g = m.game, v = us ? g.us : g.them;
    if (!shows(st, g)) return "";
    // Possession is said once, in the situation bar under the board, where
    // it sits with down and distance; the score stays clean.
    return '<p class="sb-score sb-score-' + (us ? "us" : "them") + tone(g, us, st) + (ball(g, us, st) ? " has-ball" : "") +
             '" data-side="' + (us ? "us" : "them") + '"><span class="sb-n">' + esc(v == null ? "0" : v) + "</span></p>";
  }

  function middle(m, st) {
    var g = m.game;
    if (st === "live" || st === "paused") {
      var half = TeamOS.game.halftime(g), per = half ? "Half" : ui.period(g.period);
      return '<div class="sb-mid"><span class="sb-period">' + esc(per || "") + "</span>" +
             (g.clock && !half ? '<span class="sb-clock">' + esc(g.clock) + "</span>" : "") + "</div>";
    }
    if (st === "final") return '<div class="sb-mid"><span class="sb-final">Final</span></div>';
    return '<div class="sb-mid"><span class="sb-vs">' + (g.home || g.neutral ? "vs" : "at") + "</span></div>";
  }

  // What the fan should know right now, one line under the board: down and
  // distance with who has the ball, or who receives after the half.
  function situation(m, st) {
    var g = m.game, s = g.situation;
    if ((st !== "live" && st !== "paused") || !s) return "";
    var them = g.oppAbbr || g.oppName;
    if (TeamOS.game.halftime(g))
      return s.receives ? '<p class="sb-sit"><span>' + esc(s.receives === "us" ? m.team.abbr : them) + " gets the ball to start the second half</span></p>" : "";
    var bits = [];
    if (s.possession) bits.push('<span class="sb-poss">' + ui.ball("sb-sit-ball") + esc(s.possession === "us" ? m.team.abbr : them) + "</span>");
    if (s.short) bits.push('<span class="sb-dd">' + esc(s.short) + "</span>");
    if (s.spot) bits.push('<span class="sb-spot">' + esc(s.spot) + "</span>");
    return bits.length ? '<p class="sb-sit">' + bits.join('<span class="sb-sep" aria-hidden="true"></span>') + "</p>" : "";
  }

  // Days, hours, minutes to a kickoff whose time is set - a value at the time
  // of drawing, redrawn with the screen; never a ticking clock.
  function countdown(m, st) {
    var g = m.game;
    if (st !== "upcoming" || g.timeSet === false) return "";
    var ms = Date.parse(g.date) - (m.now || new Date()).getTime();
    if (!(ms > 0)) return "";
    var d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), mi = Math.floor(ms % 36e5 / 6e4);
    function cell(n, l) { return '<span class="sb-cd-cell"><span class="sb-cd-n">' + n + '</span><span class="sb-cd-l">' + l + "</span></span>"; }
    return '<p class="sb-cd" aria-label="Kickoff in ' + d + " days, " + h + " hours, " + mi + ' minutes"><span aria-hidden="true">' +
           cell(d, d === 1 ? "Day" : "Days") + cell(h, h === 1 ? "Hr" : "Hrs") + cell(mi, "Min") + "</span></p>";
  }

  function top(m, st, variant) {
    var g = m.game, ko = ui.kickoff(g.date, g.timeSet), bits = "";
    if (st === "live") bits = '<span class="live-pill">Live</span>';
    else if (st === "paused") bits = '<span class="state-pill paused">' + (g.status === "suspended" ? "Suspended" : "Delayed") + "</span>";
    else if (st === "delayed" || st === "postponed" || st === "canceled")
      bits = '<span class="state-pill ' + st + '">' + { delayed: "Delayed", postponed: "Postponed", canceled: "Canceled" }[st] + "</span>";
    else if (st === "upcoming") bits = '<span class="sb-label">' + (variant === "home" ? "Next game" : "Kickoff") + '</span><span class="sb-when"><span class="nb">' +
                                       esc(ko.day) + "</span> · <span class=\"nb\">" + esc(ko.time) + "</span></span>";
    var net = g.net && st !== "final" ? '<span class="sb-net">' + esc(g.net) + "</span>" : "";
    return bits || net ? '<div class="sb-top">' + '<div class="sb-status">' + bits + "</div>" + net + "</div>" : "";
  }

  function summary(m, st) {
    var g = m.game, t = m.team, opp = (g.oppRank ? "number " + g.oppRank + " " : "") + g.oppName;
    var line = t.name + " " + (g.us || 0) + ", " + opp + " " + (g.them || 0) + ".";
    if (st === "final") return "Final. " + line;
    if (st === "live" || st === "paused") return (st === "paused" ? (g.status === "suspended" ? "Suspended. " : "Delayed. ") : "Live. ") +
      (g.period ? ui.period(g.period) + " quarter" + (g.clock ? ", " + g.clock : "") + ". " : "") + line;
    var ko = ui.kickoff(g.date, g.timeSet);
    return (st === "upcoming" ? "Next game: " : st.charAt(0).toUpperCase() + st.slice(1) + ". ") + t.name + (g.home || g.neutral ? " versus " : " at ") + opp +
           (ko ? ", " + ko.day + (g.timeSet === false ? "" : ", " + ko.time) : "") + (g.net ? ", on " + g.net : "") + ".";
  }

  function board(m, opts) {
    opts = opts || {};
    var g = m.game;
    if (!g) return "";
    var st = state(g), v = opts.variant === "game" ? "game" : "home";
    return '<section class="sb sb-' + v + " sb-st-" + st + '" aria-label="' + esc(summary(m, st)) + '" data-game="' + esc(g.id) + '">' +
             top(m, st, v) +
             '<div class="sb-board">' + side(m, true, st) + score(m, true, st) + middle(m, st) + score(m, false, st) + side(m, false, st) + "</div>" +
             situation(m, st) + countdown(m, st) +
           "</section>";
  }

  // The stage: the atmosphere with the board on it. Home leads with the
  // program's identity and offers the way into Game; Game's is the board,
  // full width, with nothing between it and the views.
  function stage(m, opts) {
    opts = opts || {};
    var v = opts.variant === "game" ? "game" : "home", t = m.team, g = m.game;
    var atm = g && TeamOS.game.atmosphere ? TeamOS.game.atmosphere(g, opts.zone) : null;
    var id = v === "home" ? '<div class="stage-id"><p class="stage-school">' + esc(t.name) + "</p>" +
                              (t.nick ? '<p class="stage-nick">' + esc(t.nick) + "</p>" : "") + "</div>" : "";
    var cta = opts.cta ? '<a class="btn btn-primary stage-cta" href="' + esc(opts.cta.href) + '">' + esc(opts.cta.label) + CHEVRON + "</a>" : "";
    return '<div class="stage stage-' + v + ' on-dark' + (atm ? " art-" + atm : "") + '">' + ui.art(m.art || { name: t.name, abbr: t.abbr, markUrl: t.markUrl }) +
             '<div class="stage-inner">' + id + board(m, opts) + cta + "</div></div>";
  }

  // Swap both names to abbreviations when either will not fit (never an
  // ellipsis) - the hosts call this after drawing.
  function fit(host) { ui.fitNames(host, ".sb-board", ".sb-name"); }

  return { board: board, stage: stage, state: state, fit: fit };
})();
