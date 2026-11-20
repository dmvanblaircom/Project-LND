/* Suite - the scoreboard and its stage: one component for every place a
   game's state is drawn (Phase 2 spec §3, §5, §6; Phase 2 brief §4, §5.3,
   2026-11-19). Home's hero and Game's scoreboard are compositions of it, not
   two copies of the same markup: one numeric system, one missing-mark
   fallback, one place the game moments attach.

     Suite.scoreboard.board(m, opts)   the matchup: both teams, the score,
                                       the state, the situation
     Suite.scoreboard.stage(m, opts)   the stage: the stadium (suite/
                                       stadium.js) with the board on it -
                                       Home's hero or Game's scoreboard

       m      { team { name, nick, abbr, markUrl, timeZone }, game (normalized
                Game), oppMark(providerId) -> url, now (Date),
                weather { tempF, sky } | null, line (one extra sentence for
                a final: a milestone it made) }
       opts   { variant: "home" | "game",
                cta: { href, label } - Home's way into Game,
                zone: the venue's IANA zone, when the caller knows it better
                (a forecast's); otherwise the venue's state decides, then the
                team's own zone (TeamOS.game.venueZone) }

   Our team, our game (brief §4.1): our helmet and mark lead on the left and
   carry the stage's light; the opponent stands across from us, mirrored,
   a step back but never a footnote. A final is team-neutral (decision
   0041): the same stage win or lose, no Win or Loss word; the scores and
   the records say the outcome.

   The states, each exactly as the normalized Game says (decision 0022 #5):
     upcoming    the kickoff - day, time and zone - the network, and a
                 countdown that grows as the game nears (several days: a
                 line; the day before; game day; the last two hours)
     live        LIVE, the score, the provider's period and clock, and the
                 situation: who has the ball, down and distance, the spot
     halftime    LIVE, HALFTIME, and who receives to start the second half
                 when the source says
     overtime    the period named (OT, 2OT); no clock, as college overtime
     end         END OF GAME: the 4th's clock at 0:00, not yet final
                 (TeamOS.game.endOfGame) - the last score, nothing official
     paused      DELAYED or SUSPENDED, with the last score and where it
                 stopped; never presented as current
     final       FINAL and the score; the higher score stands forward
     delayed, postponed, canceled before kickoff: the word, and the date

   It lays itself out from the width it is given (container queries), so the
   same stage reads right in a phone column and across a desktop grid cell.
   It draws only what the normalized Game says: no clock it was not given, no
   possession it cannot see, no score before kickoff. Nothing here fetches,
   reads a provider payload, or names a team. */

var Suite = Suite || {};

Suite.scoreboard = (function () {
  "use strict";

  var ui = Suite.ui, esc = ui.esc;
  var CHEVRON = '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m9 6 6 6-6 6"/></svg>';

  // One rule for what state a game is in, Home's (decision 0022 #5), with the
  // two live moments the stage draws differently.
  function state(g) { return Suite.home.cardState(g); }
  function scored(g) { return TeamOS.game.scored(g); }
  function live(st) { return st === "live" || st === "paused"; }
  function shows(st, g) { return live(st) || (st === "final" && scored(g)); }
  function ended(g, st) { return st === "live" && !!TeamOS.game.endOfGame && TeamOS.game.endOfGame(g); }

  // The winner rule is Home's and Game's, not a copy (Codex review, 2026-11-09).
  function tone(g, us) { return Suite.home.scoreTone(g, us); }

  function ball(g, us, st) {
    return live(st) && g.situation && !TeamOS.game.halftime(g) && g.situation.possession === (us ? "us" : "them");
  }

  function side(m, us, st, v) {
    var g = m.game, t = m.team;
    var name = us ? t.name : g.oppName, abbr = (us ? t.abbr : g.oppAbbr) || name;
    var rank = us ? g.usRank : g.oppRank, record = us ? g.usRecord : g.oppRecord;
    var mark = us ? ui.mark(t.markUrl, t.name, t.abbr, "bare sb-mark")
                  : ui.mark(m.oppMark ? m.oppMark(g.oppProviderId) : null, g.oppName, g.oppAbbr, "bare sb-mark");
    // Home's stage stands the helmets behind the marks; Game's board is the
    // marks alone, where the field is the picture.
    var figure = v === "home" ? '<div class="sb-figure">' + Suite.stadium.helmet(us ? "us" : "them") + mark + "</div>" : mark;
    return '<div class="sb-team sb-' + (us ? "us" : "them") + tone(g, us) + '">' + figure +
             '<p class="sb-name">' + (rank ? '<span class="sb-rank">#' + esc(rank) + "</span> " : "") +
               '<span class="sb-full">' + esc(name) + '</span><span class="sb-abbr">' + esc(abbr) + "</span></p>" +
             '<p class="sb-rec">' + (record ? esc(record) : " ") + "</p>" +
           "</div>";
  }

  function score(m, us, st) {
    var g = m.game, v = us ? g.us : g.them;
    if (!shows(st, g)) return "";
    return '<p class="sb-score sb-score-' + (us ? "us" : "them") + tone(g, us) + (ball(g, us, st) ? " has-ball" : "") +
             '" data-side="' + (us ? "us" : "them") + '"><span class="sb-n">' + esc(v == null ? "0" : v) + "</span></p>";
  }

  function middle(m, st) {
    var g = m.game;
    if (live(st)) {
      var half = TeamOS.game.halftime(g), per = half ? "Halftime" : ui.period(g.period);
      // Overtime has no game clock in college football: the period is all.
      var clock = g.clock && !half && +g.period < 5 ? '<span class="sb-clock">' + esc(g.clock) + "</span>" : "";
      return '<div class="sb-mid' + (half ? " is-half" : "") + '"><span class="sb-period">' + esc(per || "") + "</span>" + clock + "</div>";
    }
    if (st === "final") return '<div class="sb-mid"><span class="sb-final">Final</span></div>';
    return '<div class="sb-mid"><span class="sb-vs">' + (g.home || g.neutral ? "vs" : "at") + "</span></div>";
  }

  // What the fan should know right now, one line under the board: who has
  // the ball with down and distance, or who receives after the half - each
  // only when the source says so.
  function situation(m, st) {
    var g = m.game, s = g.situation;
    if (!live(st) || !s || ended(g, st)) return "";
    if (TeamOS.game.halftime(g))
      // The brief's explicit wording (§4.2, 2026-11-20), which supersedes the
      // short "ND gets the ball" pill of 2026-10-14 on Home.
      return s.receives ? '<p class="sb-sit"><span>' + esc(s.receives === "us" ? m.team.name : g.oppName) + " receives to start the 2nd half</span></p>" : "";
    var bits = [];
    if (s.possession) bits.push('<span class="sb-poss">' + ui.ball("sb-sit-ball") + '<span class="sb-poss-t">' +
                                esc(s.possession === "us" ? m.team.abbr : (g.oppAbbr || g.oppName)) + " ball</span></span>");
    if (s.short) bits.push('<span class="sb-dd">' + esc(s.short) + "</span>");
    if (s.spot) bits.push('<span class="sb-spot">' + esc(s.spot) + "</span>");
    return bits.length ? '<p class="sb-sit">' + bits.join('<span class="sb-sep" aria-hidden="true"></span>') + "</p>" : "";
  }

  // How near the kickoff is, in the fan's own days (brief §4.1): several days
  // away the countdown is a quiet line; the day before, a figure; game day,
  // the board's second voice; the last two hours, its first. A value at the
  // time of drawing, redrawn with the screen - never a ticking clock.
  function nearness(g, now) {
    var ms = Date.parse(g.date) - now.getTime();
    if (!(ms > 0) || g.timeSet === false) return null;
    if (ms <= 2 * 36e5) return "near";
    var ko = new Date(g.date), d0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var days = Math.round((new Date(ko.getFullYear(), ko.getMonth(), ko.getDate()) - d0) / 864e5);
    return days <= 0 ? "day" : days === 1 ? "eve" : "far";
  }

  function countdown(m, st) {
    var g = m.game, now = m.now || new Date();
    if (st !== "upcoming") return "";
    var near = nearness(g, now);
    if (!near) return "";
    var ms = Date.parse(g.date) - now.getTime();
    var d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), mi = Math.floor(ms % 36e5 / 6e4);
    function said(n, one) { return n + " " + one + (n === 1 ? "" : "s"); }
    var label = "Kickoff in " + (d ? said(d, "day") + ", " : "") + said(h, "hour") + ", " + said(mi, "minute");
    if (near === "far") return '<p class="sb-cd sb-cd-far"><span class="sb-cd-line">Kickoff in ' + esc(said(d, "day")) + "</span></p>";
    function cell(n, l) { return '<span class="sb-cd-cell"><span class="sb-cd-n">' + n + '</span><span class="sb-cd-l">' + l + "</span></span>"; }
    var cells = (d ? cell(d, d === 1 ? "Day" : "Days") : "") + cell(h, h === 1 ? "Hr" : "Hrs") + cell(mi < 10 && !d ? "0" + mi : mi, "Min");
    return '<p class="sb-cd sb-cd-' + near + '" aria-label="' + esc(label) + '"><span class="sb-cd-k" aria-hidden="true">' +
             (near === "near" ? "Kickoff" : near === "day" ? "Game day" : "Tomorrow") + '</span><span class="sb-cd-cells" aria-hidden="true">' + cells + "</span></p>";
  }

  function top(m, st, variant) {
    var g = m.game, ko = ui.kickoff(g.date, g.timeSet), bits = "";
    if (ended(g, st)) bits = '<span class="state-pill end">End of game</span>';
    else if (st === "live") bits = '<span class="live-pill">Live</span>';
    else if (st === "paused") bits = '<span class="state-pill paused">' + (g.status === "suspended" ? "Suspended" : "Delayed") + "</span>";
    else if (st === "delayed" || st === "postponed" || st === "canceled")
      bits = '<span class="state-pill ' + st + '">' + { delayed: "Delayed", postponed: "Postponed", canceled: "Canceled" }[st] + "</span>" +
             (st === "postponed" ? '<span class="sb-when">' + esc(Suite.home.newDate(g)) + "</span>" : '<span class="sb-when">' + esc(ko.day) + "</span>");
    else if (st === "upcoming") bits = '<span class="sb-label">' + (variant === "home" ? "Next game" : "Kickoff") + '</span><span class="sb-when"><span class="nb">' +
                                       esc(ko.day) + "</span> · <span class=\"nb\">" + esc(ko.time) + "</span></span>";
    else if (st === "final") bits = '<span class="sb-label">' + esc(ko.day) + "</span>";
    var net = g.net && st !== "final" && st !== "canceled" ? '<span class="sb-net">' + esc(g.net) + "</span>" : "";
    return bits || net ? '<div class="sb-top">' + '<div class="sb-status">' + bits + "</div>" + net + "</div>" : "";
  }

  function summary(m, st) {
    var g = m.game, t = m.team, opp = (g.oppRank ? "number " + g.oppRank + " " : "") + g.oppName;
    // What a screen reader hears is what the board shows (Codex reviews of
    // #239 and 2026-11-09): a final's score only when the source gave it -
    // never a made-up 0-0 - and a live game's as the board draws it.
    var shown = shows(st, g);
    function n(v) { return v == null || v === "" ? 0 : v; }
    var line = shown ? t.name + " " + n(g.us) + ", " + opp + " " + n(g.them) + "."
                     : t.name + (g.home || g.neutral ? " versus " : " at ") + opp + ".";
    if (st === "final") return "Final. " + line;
    if (ended(g, st)) return "End of game, not yet final. " + line;
    if (live(st)) {
      var p = +g.period, s = g.situation, when = TeamOS.game.halftime(g) ? "Halftime. "
        : p >= 5 ? (p === 5 ? "Overtime" : "Overtime " + (p - 4)) + ". "
        : p ? ui.period(p) + " quarter" + (g.clock ? ", " + g.clock : "") + ". " : "";
      var sit = "";
      if (s && TeamOS.game.halftime(g) && s.receives) sit = " " + (s.receives === "us" ? t.name : g.oppName) + " receives to start the second half.";
      else if (s && !TeamOS.game.halftime(g) && s.possession)
        sit = " " + (s.possession === "us" ? t.name : g.oppName) + " has the ball" + (s.short ? ", " + s.short : "") + (s.spot ? " at " + s.spot : "") + ".";
      return (st === "paused" ? (g.status === "suspended" ? "Suspended. " : "Delayed. ") : "Live. ") + when + line + sit;
    }
    var ko = ui.kickoff(g.date, g.timeSet);
    return (st === "upcoming" ? "Next game: " : st.charAt(0).toUpperCase() + st.slice(1) + ". ") + t.name + (g.home || g.neutral ? " versus " : " at ") + opp +
           (ko && ko.day ? ", " + ko.day + (g.timeSet === false || !ko.time ? "" : ", " + ko.time) : "") + (g.net ? ", on " + g.net : "") + ".";
  }

  // The series or trophy, as the source names it (never invented; spec §5.2).
  function series(m, st) {
    var g = m.game;
    return g.series && st !== "final" ? '<p class="sb-series">' + esc(g.series) + "</p>" : "";
  }

  function board(m, opts) {
    opts = opts || {};
    var g = m.game;
    if (!g) return "";
    var st = state(g), v = opts.variant === "game" ? "game" : "home";
    var phase = ended(g, st) ? " sb-end" : live(st) && TeamOS.game.halftime(g) ? " sb-half" : live(st) && +g.period >= 5 ? " sb-ot" : "";
    return '<section class="sb sb-' + v + " sb-st-" + st + phase + '" aria-label="' + esc(summary(m, st)) + '" data-game="' + esc(g.id) + '">' +
             top(m, st, v) +
             '<div class="sb-board">' + side(m, true, st, v) + score(m, true, st) + middle(m, st) + score(m, false, st) + side(m, false, st, v) + "</div>" +
             series(m, st) + situation(m, st) + countdown(m, st) +
           "</section>";
  }

  // The facts a fan plans around, below the board on Home: kickoff weather,
  // the market's line, where it is played. Each only when the source has
  // it; the line only before kickoff, and never called live (decision 0025).
  function facts(m, st) {
    var g = m.game, out = [], w = m.weather;
    if (w && (st === "upcoming" || st === "delayed" || live(st)))
      out.push('<li class="sf sf-wx"><span class="sf-k">' + (live(st) ? "Now" : "Kickoff") + '</span><span class="sf-v">' +
               esc(w.tempF + "°F") + (w.sky ? " " + esc(w.sky) : "") + "</span></li>");
    if (g.odds && (g.odds.line || g.odds.total != null) && (st === "upcoming" || st === "delayed"))
      out.push('<li class="sf sf-odds"><span class="sf-k">Line</span><span class="sf-v">' +
               esc([g.odds.line, g.odds.total != null ? "O/U " + g.odds.total : ""].filter(Boolean).join(" · ")) + "</span></li>");
    if (g.venue && (st === "upcoming" || st === "delayed" || st === "postponed"))
      out.push('<li class="sf sf-venue"><span class="sf-k">Venue</span><span class="sf-v">' + esc(g.venue) +
               (g.city ? '<span class="sf-place">' + esc(g.city + (g.venueState ? ", " + g.venueState : "")) + "</span>" : "") + "</span></li>");
    return out.length ? '<ul class="stage-facts">' + out.join("") + "</ul>" : "";
  }

  // The stage: the stadium with the board on it. Home leads with the
  // program's identity and offers the way into Game; Game's is the board,
  // full width, with nothing between it and the views.
  function stage(m, opts) {
    opts = opts || {};
    var v = opts.variant === "game" ? "game" : "home", t = m.team, g = m.game;
    // Day, dusk or night needs the venue's zone; without one given, the
    // venue's state decides, then the team's own (Codex, #239: no zone, no
    // lighting).
    var zone = opts.zone || (g && TeamOS.game.venueZone ? TeamOS.game.venueZone(g, t.timeZone) : null);
    var atm = g && TeamOS.game.light ? TeamOS.game.light(g, zone) : null;
    var st = g ? state(g) : "none";
    var id = v === "home" ? '<div class="stage-id"><p class="stage-school">' + esc(t.name) + "</p>" +
                              (t.nick ? '<p class="stage-nick">' + esc(t.nick) + "</p>" : "") + "</div>" : "";
    var cta = opts.cta ? '<a class="btn btn-primary stage-cta" href="' + esc(opts.cta.href) + '">' + esc(opts.cta.label) + CHEVRON + "</a>" : "";
    var near = g && st === "upcoming" ? nearness(g, m.now || new Date()) : null;
    return '<div class="stage stage-' + v + " st-" + st + (near ? " cd-" + near : "") + ' on-dark art-' + (atm || "none") + '">' +
             '<div class="stage-art" aria-hidden="true">' + Suite.stadium.art() + "</div>" +
             '<div class="stage-inner">' + id + (g ? board(m, opts) : (opts.body || "")) +
               (g && m.line ? '<p class="stage-line">' + esc(m.line) + "</p>" : "") +
               (g && v === "home" ? facts(m, st) : "") + cta + "</div></div>";
  }

  // Swap both names to abbreviations when either will not fit (never an
  // ellipsis) - the hosts call this after drawing.
  function fit(host) { ui.fitNames(host, ".sb-board", ".sb-name"); }

  return { board: board, stage: stage, state: state, fit: fit, nearness: nearness };
})();
