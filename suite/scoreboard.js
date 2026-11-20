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

  // Each side's photograph, or null. The stage shows helmets only when it has
  // both - one helmet facing a logo is not a matchup - and otherwise both
  // official marks stand large where the helmets would (asset guidance,
  // 2026-11-20: never another team's helmet recoloured).
  function helmets(m) {
    var g = m.game, t = m.team;
    if (!TeamOS.art || !g) return null;
    var us = TeamOS.art.helmet(t.id), them = TeamOS.art.helmetByProvider(g.oppProviderId);
    return us && them ? { us: us, them: them } : null;
  }
  // A helmet faces the middle: ours to the right, theirs to the left. A photo
  // facing the wrong way is flipped only when its helmet carries nothing a
  // flip would reverse.
  function helmetImg(h, us) {
    var want = us ? "right" : "left", flip = h.facing !== want && h.mirror;
    return '<img class="sb-helmet' + (flip ? " is-flipped" : "") + '" src="' + esc(h.src) + '" srcset="' + esc(h.srcset) +
           '" sizes="(min-width:64rem) 22rem, 46vw" alt="" decoding="async">';
  }

  function side(m, us, st, v, hm) {
    var g = m.game, t = m.team;
    var name = us ? t.name : g.oppName, abbr = (us ? t.abbr : g.oppAbbr) || name;
    var rank = us ? g.usRank : g.oppRank, record = us ? g.usRecord : g.oppRecord;
    var mark = us ? ui.mark(t.markUrl, t.name, t.abbr, "bare sb-mark")
                  : ui.mark(m.oppMark ? m.oppMark(g.oppProviderId) : null, g.oppName, g.oppAbbr, "bare sb-mark");
    return '<div class="sb-team sb-' + (us ? "us" : "them") + tone(g, us) + '">' + mark +
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

  // What the fan should know right now, under the score: down and distance at
  // the spot, then whose ball it is in words; or who receives after the half
  // - each only when the source says so.
  function situation(m, st) {
    var g = m.game, s = g.situation;
    if (!live(st) || !s || ended(g, st)) return "";
    if (TeamOS.game.halftime(g))
      // The brief's explicit wording (§4.2, 2026-11-20), which supersedes the
      // short "ND gets the ball" pill of 2026-10-14 on Home.
      return s.receives ? '<p class="sb-sit"><span>' + esc(s.receives === "us" ? m.team.name : g.oppName) + " receives to start the 2nd half</span></p>" : "";
    var bits = [];
    if (s.short) bits.push('<span class="sb-dd">' + esc(s.short) + "</span>");
    if (s.spot) bits.push('<span class="sb-spot">' + (s.short ? "at " : "") + esc(s.spot) + "</span>");
    var line = bits.length ? '<p class="sb-sit">' + (s.possession ? ui.ball("sb-sit-ball") : "") + bits.join(" ") + "</p>" : "";
    var poss = s.possession ? '<p class="sb-poss"><span class="sb-poss-t">' + esc(s.possession === "us" ? m.team.abbr : (g.oppAbbr || g.oppName)) + " ball</span></p>" : "";
    return line + poss;
  }

  // How near the kickoff is, in the fan's own days (brief §4.1): several days
  // away, the day before, game day, the last two hours. A value at the time of
  // drawing, redrawn with the screen - never a ticking clock.
  function calDays(g, now) {
    var ko = new Date(g.date), d0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((new Date(ko.getFullYear(), ko.getMonth(), ko.getDate()) - d0) / 864e5);
  }
  function nearness(g, now) {
    var ms = Date.parse(g.date) - now.getTime();
    if (!(ms > 0) || g.timeSet === false) return null;
    if (ms <= 2 * 36e5) return "near";
    var days = calDays(g, now);
    return days <= 0 ? "day" : days === 1 ? "eve" : "far";
  }

  // KICKOFF IN / 4 DAYS: the board's headline before a game. It grows as the
  // game nears: the day before it says TOMORROW, on game day the kickoff time,
  // in the last two hours the hours and minutes, lit.
  function countdown(m, st) {
    var g = m.game, now = m.now || new Date();
    if (st !== "upcoming") return "";
    var near = nearness(g, now);
    if (!near) return "";
    var ms = Date.parse(g.date) - now.getTime();
    var d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), mi = Math.floor(ms % 36e5 / 6e4);
    function said(n, one) { return n + " " + one + (n === 1 ? "" : "s"); }
    var label = "Kickoff in " + (d ? said(d, "day") + ", " : "") + said(h, "hour") + ", " + said(mi, "minute");
    var ko = ui.kickoff(g.date, g.timeSet);
    var k = near === "far" ? "Kickoff in" : near === "eve" ? "Kickoff" : near === "day" ? "Kickoff today" : "Kickoff in";
    var big = near === "far" ? said(calDays(g, now), "day")
            : near === "eve" ? "Tomorrow"
            : near === "day" ? ko.time
            : (h ? h + " hr " : "") + mi + " min";
    return '<p class="sb-cd sb-cd-' + near + '" aria-label="' + esc(label) + '"><span class="sb-cd-k" aria-hidden="true">' + k +
           '</span><span class="sb-cd-n" aria-hidden="true">' + esc(big) + "</span></p>";
  }

  // The stage's one word for where the game is, in the colour of that state.
  function pill(g, st, now) {
    if (ended(g, st)) return { k: "end", t: "End of game" };
    if (st === "live") return TeamOS.game.halftime(g) ? { k: "half", t: "Halftime" }
                            : +g.period >= 5 ? { k: "ot", t: "Overtime" } : { k: "live", t: "Live" };
    if (st === "paused") return { k: "paused", t: g.status === "suspended" ? "Suspended" : "Delayed" };
    if (st === "final") return { k: "final", t: "Final" };
    if (st === "delayed") return { k: "paused", t: "Delayed" };
    if (st === "postponed") return { k: "off", t: "Postponed" };
    if (st === "canceled") return { k: "off", t: "Canceled" };
    if (st === "upcoming") { var n = nearness(g, now || new Date()); return n === "day" || n === "near" ? { k: "next", t: "Game day" } : { k: "next", t: "Next game" }; }
    return null;
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
    var st = state(g), v = opts.variant === "game" ? "game" : "home", hm = v === "home" ? helmets(m) : null;
    var phase = ended(g, st) ? " sb-end" : live(st) && TeamOS.game.halftime(g) ? " sb-half" : live(st) && +g.period >= 5 ? " sb-ot" : "";
    var scoring = shows(st, g);
    return '<section class="sb sb-' + v + " sb-st-" + st + phase + (hm ? " has-helmets" : " no-helmets") + (scoring ? " is-scoring" : "") +
             '" aria-label="' + esc(summary(m, st)) + '" data-game="' + esc(g.id) + '">' +
             (hm ? '<div class="sb-helmets" aria-hidden="true">' + helmetImg(hm.us, true) + helmetImg(hm.them, false) + "</div>" : "") +
             '<div class="sb-board">' + side(m, true, st, v, hm) + score(m, true, st) + middle(m, st) + score(m, false, st) + side(m, false, st, v, hm) + "</div>" +
             situation(m, st) + series(m, st) + countdown(m, st) +
             (ended(g, st) ? '<p class="sb-note">The game has ended. The final score is being confirmed.</p>' : "") +
           "</section>";
  }

  // When and where, under the board: the day, kickoff time and broadcast; the
  // venue and its city; then the kickoff weather and the market's line as
  // quiet facts (decision 0025: the line only before kickoff, never live).
  function facts(m, st) {
    var g = m.game, out = "", w = m.weather, ko = ui.kickoff(g.date, g.timeSet);
    var pre = st === "upcoming" || st === "delayed" || st === "postponed";
    if (pre) {
      var when = st === "postponed" ? [Suite.home.newDate(g)] : [ko.day, g.timeSet === false ? "" : ko.time, g.net].filter(Boolean);
      out += '<p class="stage-when">' + when.map(function (x) { return '<span class="nb">' + esc(x) + "</span>"; }).join('<span class="dot" aria-hidden="true"> · </span>') + "</p>";
      if (g.venue) out += '<p class="stage-where">' + esc(g.venue) + (g.city ? '<span class="dot" aria-hidden="true"> · </span>' + esc(g.city + (g.venueState ? ", " + g.venueState : "")) : "") + "</p>";
    } else if (st === "final") out += '<p class="stage-when"><span class="nb">' + esc(ko.day) + "</span></p>";
    var chips = [];
    if (w && (pre || live(st)))
      chips.push('<li class="sf sf-wx"><span class="sf-k">' + (live(st) ? "Now" : "Kickoff") + '</span><span class="sf-v">' +
                 esc(w.tempF + "°F") + (w.sky ? " " + esc(w.sky) : "") + "</span></li>");
    if (g.odds && (g.odds.line || g.odds.total != null) && (st === "upcoming" || st === "delayed"))
      chips.push('<li class="sf sf-odds"><span class="sf-k">Line</span><span class="sf-v">' +
                 esc([g.odds.line, g.odds.total != null ? "O/U " + g.odds.total : ""].filter(Boolean).join(" · ")) + "</span></li>");
    if (g.net && (live(st) || ended(g, st))) chips.push('<li class="sf sf-net"><span class="sf-k">TV</span><span class="sf-v">' + esc(g.net) + "</span></li>");
    return out + (chips.length ? '<ul class="stage-facts">' + chips.join("") + "</ul>" : "");
  }

  // The stage: the photograph of the stadium the game is played in, by the
  // light the kickoff is under, with the matchup standing in front of it
  // (David, 2026-11-20: real photographs; the venue's own when Suite has it).
  function photo(m, g) {
    if (!TeamOS.art) return null;
    var t = m.team, zone = g ? (TeamOS.game.venueZone ? TeamOS.game.venueZone(g, t.timeZone) : null) : null;
    var time = g ? TeamOS.game.atmosphere(g, zone) : "day";
    // No game (the offseason): our own stadium, by day.
    return TeamOS.art.venue(g || { venue: t.venueName }, time || "night");
  }

  function photoHtml(ph) {
    return ph ? '<div class="stage-photo" aria-hidden="true"><img class="stage-img" src="' + esc(ph.src) + '" srcset="' + esc(ph.srcset) +
                '" sizes="(min-width:64rem) 52rem, 100vw" alt="" decoding="async" fetchpriority="high" style="object-position:' + esc(ph.focus) + '"></div>' : "";
  }
  // The same photograph and light behind Game's own header: the classes the
  // header's box takes, and its layers, or null when Suite has no photo.
  function backdrop(m) {
    var ph = photo(m, m.game), g = m.game, t = m.team;
    if (!ph) return null;
    var zone = g && TeamOS.game.venueZone ? TeamOS.game.venueZone(g, t.timeZone) : null;
    var atm = g ? TeamOS.game.atmosphere(g, zone) : null;
    return { cls: " has-photo art-" + (atm || "none") + " venue-" + ph.key, html: photoHtml(ph) + '<div class="stage-art" aria-hidden="true"></div>' };
  }

  function stage(m, opts) {
    opts = opts || {};
    var v = opts.variant === "game" ? "game" : "home", t = m.team, g = m.game;
    // Day or night needs the venue's zone; without one given, the venue's
    // state decides, then the team's own (Codex, #239: no zone, no lighting).
    var zone = opts.zone || (g && TeamOS.game.venueZone ? TeamOS.game.venueZone(g, t.timeZone) : null);
    var atm = g && TeamOS.game.atmosphere ? TeamOS.game.atmosphere(g, zone) : null;
    var st = g ? state(g) : "none", p = g ? pill(g, st, m.now) : null, ph = photo(m, g);
    var cta = opts.cta ? '<a class="btn btn-primary stage-cta" href="' + esc(opts.cta.href) + '">' + esc(opts.cta.label) + CHEVRON + "</a>" : "";
    var near = g && st === "upcoming" ? nearness(g, m.now || new Date()) : null;
    var img = photoHtml(ph);
    return '<div class="stage stage-' + v + " st-" + st + (near ? " cd-" + near : "") + ' on-dark art-' + (atm || "none") + (ph ? " has-photo venue-" + esc(ph.key) : " no-photo") + '">' +
             img + '<div class="stage-art" aria-hidden="true"></div>' +
             '<div class="stage-inner">' +
               (p ? '<p class="stage-pill pill-' + p.k + '"><span>' + esc(p.t) + "</span></p>" : "") +
               (g ? board(m, opts) : (opts.body || "")) +
               (g && m.line ? '<p class="stage-line">' + esc(m.line) + "</p>" : "") +
               (g && v === "home" ? facts(m, st) : "") + cta + "</div></div>";
  }

  // Swap both names to abbreviations when either will not fit (never an
  // ellipsis) - the hosts call this after drawing.
  function fit(host) { ui.fitNames(host, ".sb-board", ".sb-name"); }

  return { board: board, stage: stage, backdrop: backdrop, state: state, fit: fit, nearness: nearness };
})();
