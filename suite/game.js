/* Suite - Game, the canonical game screen (references 03 and 04; decisions
   0022 #5, #6, 0024 §7, §14, §15).

   One game - TeamOS's hero game, the same one Home and the nav are about.
   Its lifecycle decides the views:
     pregame  Game Details, with no tab strip (Tickets is hidden in v1)
     live     Drive Tracker | Box Score | Plays | Stats
     final    Box Score | Plays | Stats
   The views are routes (#game/drive ...) that suite/nav.js corrects in place
   when the lifecycle removes one.

   This file only draws. app.js hands over a model of normalized TeamOS
   data; nothing here fetches or reads a provider payload.

     Suite.game.paint(host, model)
       model.team        { name, abbr, markUrl }
       model.oppMark     providerId -> URL
       model.game        normalized Game (null: nothing to show)
       model.detail      GameDetail | null (still loading)
       model.lifecycle   TeamOS.game.lifecycle(game)
       model.view        the current view id
       model.preview     { us: SeasonStat[], them: SeasonStat[] } | null
       model.side        "us" | "them" - Leaders and Box Score team toggle
       model.open        { disclosure key: open? } - the fan's own choices
       model.weather     Weather | null
       model.now         Date

   The screen is written from the team's side: the team is always on the
   left, whoever is home. */

var Suite = Suite || {};

Suite.game = (function () {
  "use strict";

  var ui = Suite.ui, esc = ui.esc;
  var last = {};

  var CHEVRON = '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m9 6 6 6-6 6"/></svg>';
  var TROPHY = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 4h8v5a4 4 0 0 1-8 0V4ZM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4v3h-4z"/></svg>';

  function ordinal(p) {
    return p === 1 ? "1st" : p === 2 ? "2nd" : p === 3 ? "3rd" : p === 4 ? "4th" : p === 5 ? "OT" : p > 5 ? (p - 4) + "OT" : "";
  }
  function state(g) { return Suite.home.cardState(g); }

  // Which side of a GameDetail is the team's.
  function sides(gd, g) {
    if (!gd) return null;
    var usHome = gd.home.mine ? true : gd.away.mine ? false : !!(g && g.home);
    return usHome ? { us: gd.home, them: gd.away, usKey: "home", themKey: "away" }
                  : { us: gd.away, them: gd.home, usKey: "away", themKey: "home" };
  }

  // ---- header -----------------------------------------------------------------

  function countdown(g, now) {
    if (g.timeSet === false) return "";
    var ms = Date.parse(g.date) - now.getTime();
    if (!(ms > 0)) return "";
    var d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), m = Math.floor(ms % 36e5 / 6e4);
    function cell(n, l) { return '<span class="cd-cell"><span class="cd-n">' + n + '</span><span class="cd-l">' + l + "</span></span>"; }
    return '<p class="gh-countdown" aria-label="Kickoff in ' + d + " days, " + h + " hours, " + m + ' minutes">' +
           '<span aria-hidden="true">' + cell(d, d === 1 ? "Day" : "Days") + cell(h, h === 1 ? "Hour" : "Hours") +
           cell(m, m === 1 ? "Minute" : "Minutes") + "</span></p>";
  }

  function teamBlock(m, us, st) {
    var g = m.game;
    var mark = us ? ui.mark(m.team.markUrl, m.team.name, m.team.abbr, "bare")
                  : ui.mark(m.oppMark(g.oppProviderId), g.oppName, g.oppAbbr, "bare");
    var rank = us ? g.usRank : g.oppRank, rec = us ? g.usRecord : g.oppRecord;
    var score = us ? g.us : g.them;
    var scored = st === "live" || st === "paused" || st === "final";
    return '<div class="gh-team ' + (us ? "us" : "them") + '">' + mark +
             (scored ? '<span class="gh-score">' + esc(score == null ? "0" : score) + "</span>" : "") +
             '<p class="gh-name">' + (rank ? '<span class="gc-rank">#' + rank + "</span> " : "") + esc(us ? m.team.name : g.oppName) + "</p>" +
             (rec ? '<p class="gh-record">' + esc(rec) + "</p>" : "") +
           "</div>";
  }

  function tertiary(g, st, wx) {
    var bits = [];
    if (wx && st !== "final" && st !== "canceled" && st !== "postponed")
      bits.push('<span class="gh-wx"><strong>' + esc(wx.tempF + "°F") + "</strong>" + (wx.sky ? " " + esc(wx.sky) : "") +
                (wx.windMph != null ? '<span class="gh-sub">Wind ' + esc(wx.windMph) + " mph</span>" : "") + "</span>");
    if (g.odds && (g.odds.line || g.odds.total != null) && st !== "final" && st !== "canceled")
      // The spread and the total as plain values, stacked as the canonical
      // header has them (decision 0025): no labels, no betting UI.
      bits.push('<span class="gh-odds">' + (g.odds.line ? "<strong>" + esc(g.odds.line) + "</strong>" : "") +
                (g.odds.total != null ? '<span class="gh-odds-ou">O/U ' + esc(g.odds.total) + "</span>" : "") + "</span>");
    return bits.length ? '<div class="gh-extra">' + bits.join("") + "</div>" : "";
  }

  function header(m) {
    var g = m.game, st = state(g), ko = ui.kickoff(g.date, g.timeSet);
    var where = g.neutral ? "Neutral site" : g.home ? "Home vs" : "Away at";
    var center = "";
    if (st === "upcoming" || st === "delayed" || st === "postponed" || st === "canceled") {
      var when = st === "postponed" ? Suite.home.newDate(g) : st === "canceled" ? ko.day : ko.full;
      center = '<div class="gh-center">' +
        (st === "upcoming" ? '<p class="gh-where">' + esc(where) + "</p>"
                           : '<span class="state-pill ' + st + '">' + esc(st) + "</span>") +
        '<p class="gh-opp">' + esc(g.oppName) + "</p>" +
        '<p class="gh-when">' + esc(when) + (g.net && st !== "canceled" ? " · " + esc(g.net) : "") + "</p>" +
        (g.venue ? '<p class="gh-venue">' + esc([g.venue, [g.city, g.venueState].filter(Boolean).join(", ")].filter(Boolean).join(" · ")) + "</p>" : "") +
        (g.series ? '<p class="gh-series">' + esc(g.series) + "</p>" : "") +
        (st === "upcoming" ? countdown(g, m.now) : "") +
        "</div>";
    } else {
      var top = st === "live" ? '<span class="live-pill">Live</span>'
        : st === "paused" ? '<span class="state-pill paused">' + (g.status === "suspended" ? "Suspended" : "Delayed") + "</span>"
        : '<span class="gh-final">Final</span>';
      var clock = st === "final" ? "" : '<p class="gh-clock">' + esc([ordinal(g.period), g.clock].filter(Boolean).join(" · ")) + "</p>";
      var sit = (st === "live" || st === "paused") && g.situation && g.situation.short
        ? '<p class="gc-situation"><span>' + esc(g.situation.short) + "</span>" + (g.situation.spot ? "<span>" + esc(g.situation.spot) + "</span>" : "") + "</p>"
        : "";
      center = '<div class="gh-center">' + top + clock + sit + "</div>";
    }
    return '<section class="game-head on-dark gh-' + st + '" aria-label="' + esc(summary(m, st)) + '">' +
             ui.art({ photo: m.photo, name: m.team.name, abbr: m.team.abbr, markUrl: m.team.markUrl }) +
             '<div class="gh-inner">' + tertiary(g, st, m.weather) +
               '<div class="gh-row" aria-hidden="true">' + teamBlock(m, true, st) + center + teamBlock(m, false, st) + "</div>" +
               '<p class="sr-only">' + esc(summary(m, st)) + "</p>" +
             "</div></section>";
  }

  function summary(m, st) {
    var g = m.game, opp = (g.oppRank ? "#" + g.oppRank + " " : "") + g.oppName;
    var vs = g.home || g.neutral ? " versus " : " at ";
    if (st === "live" || st === "paused" || st === "final") {
      var line = m.team.name + " " + (g.us || 0) + ", " + opp + " " + (g.them || 0);
      if (st === "final") return "Final. " + line + ".";
      if (st === "paused") return (g.status === "suspended" ? "Suspended" : "Delayed") + ", " + ordinal(g.period) + " quarter. " + line + ".";
      return "Live, " + ordinal(g.period) + " quarter" + (g.clock ? ", " + g.clock : "") + ". " + line + "." +
        (g.situation && g.situation.short ? " " + g.situation.short + (g.situation.spot ? " at " + g.situation.spot : "") + "." : "");
    }
    var ko = ui.kickoff(g.date, g.timeSet);
    if (st === "postponed") return "Postponed. " + m.team.name + vs + opp + ". " + Suite.home.newDate(g) + ".";
    if (st === "canceled") return "Canceled. " + m.team.name + vs + opp + ", " + ko.day + ".";
    return (st === "delayed" ? "Delayed. " : "") + m.team.name + vs + opp + ", " + ko.full + (g.net ? ", on " + g.net : "") + ".";
  }

  // ---- the view strip (live and final only) -------------------------------------

  function strip(m) {
    if (m.lifecycle.views.length < 2) return "";           // pregame: one destination, no strip (0024 §7)
    return '<nav class="game-tabs" aria-label="Game views">' + m.lifecycle.views.map(function (v) {
      var on = v.id === m.view;
      return '<a href="#game/' + esc(v.id) + '"' + (on ? ' aria-current="page"' : "") + ">" + esc(v.label) + "</a>";
    }).join("") + "</nav>";
  }

  // ---- views ---------------------------------------------------------------------

  function card(title, body, right, cls) {
    return '<section class="card gcard' + (cls ? " " + cls : "") + '"><div class="gcard-head"><h2 class="gcard-title">' + esc(title) + "</h2>" +
           (right || "") + "</div>" + body + "</section>";
  }
  function quiet(text) { return '<p class="sec-quiet">' + esc(text) + "</p>"; }

  // Matchup: season averages side by side, the better side marked by an
  // arrow and a tint - as well as its rank, so colour is never the only cue.
  function matchup(m) {
    var p = m.preview;
    if (p === undefined) return card("Matchup", quiet("Loading the matchup…"));
    if (!p || !p.us || !p.them) return "";
    var rows = "";
    p.us.forEach(function (a, i) {
      var b = p.them[i];
      if (!b || a.value == null && b.value == null) return;
      var better = a.rank && b.rank && a.rank !== b.rank ? (a.rank < b.rank ? "us" : "them") : null;
      function cell(s, side) {
        var rk = s.rankText || (s.rank ? ordinalRank(s.rank) : "");
        return '<span class="mu-v ' + side + (better === side ? " better" : "") + '">' +
               '<span class="mu-n">' + esc(s.value == null ? "–" : s.value) + "</span>" +
               (rk ? '<span class="mu-rk">' + esc(rk) + "</span>" : "") +
               (better === side ? '<span class="sr-only"> (better)</span>' : "") + "</span>";
      }
      rows += '<li class="mu-row">' + cell(a, "us") +
              '<span class="mu-l">' + (better === "us" ? '<span class="mu-arrow l" aria-hidden="true"></span>' : "") +
              esc(a.label) + (better === "them" ? '<span class="mu-arrow r" aria-hidden="true"></span>' : "") + "</span>" +
              cell(b, "them") + "</li>";
    });
    if (!rows) return "";
    return card("Matchup", '<p class="mu-teams"><span>' + esc(m.team.abbr) + "</span><span>" + esc(m.game.oppAbbr || m.game.oppName) + "</span></p>" +
                '<ul class="mu-list">' + rows + "</ul>", '<span class="gcard-note">Season averages</span>');
  }
  function ordinalRank(n) {
    var s = ["th", "st", "nd", "rd"], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  function sideToggle(m, which) {
    var abbrs = { us: m.team.abbr, them: m.game.oppAbbr || m.game.oppName };
    return '<div class="seg-light seg-mini" role="group" aria-label="Team">' + ["us", "them"].map(function (k) {
      return '<button type="button" data-side="' + k + '" aria-pressed="' + (which === k) + '">' + esc(abbrs[k]) + "</button>";
    }).join("") + "</div>";
  }

  function leaders(m, title) {
    var gd = m.detail, s = sides(gd, m.game);
    if (!gd || !gd.leaders || !s) return "";
    var rows = gd.leaders[m.side === "them" ? s.themKey : s.usKey] || [];
    var body = rows.length ? '<ul class="ld-list">' + rows.map(function (r) {
      return '<li><span class="ld-cat">' + esc(r.category) + '</span><span class="ld-name">' + esc(r.name) +
             '</span><span class="ld-line">' + esc(r.line) + "</span></li>";
    }).join("") + "</ul>" : quiet("No leaders published for this team yet.");
    return card(title, body, sideToggle(m, m.side), "gcard-leaders");
  }

  function seriesCard(g) {
    if (!g.series) return "";
    // The trophy's name, which the team's configuration verifies. No
    // description: until a trustworthy rivalry source exists, nothing
    // generic stands in for one (Game review, 2026-09-24).
    return '<section class="card gcard series"><span class="series-ic">' + TROPHY + '</span><p class="series-name">' +
           esc(g.series.replace(/^Playing for (the )?/i, "")) + "</p></section>";
  }

  function linescore(m) {
    var gd = m.detail, s = sides(gd, m.game);
    if (!gd || !gd.linescore || !s) return "";
    var ours = gd.linescore[s.usKey] || [], theirs = gd.linescore[s.themKey] || [];
    var n = Math.max(4, ours.length, theirs.length);
    var head = "<tr><th scope=\"col\"><span class=\"sr-only\">Team</span></th>";
    for (var i = 0; i < n; i++) head += '<th scope="col">' + (i < 4 ? i + 1 : ordinal(i + 1)) + "</th>";
    head += '<th scope="col">T</th></tr>';
    function row(name, list, total) {
      var r = '<tr><th scope="row">' + esc(name) + "</th>";
      for (var i = 0; i < n; i++) r += "<td>" + esc(list[i] != null ? list[i] : "–") + "</td>";
      return r + '<td class="t">' + esc(total == null ? "–" : total) + "</td></tr>";
    }
    return card("Score by quarter", '<table class="ls"><thead>' + head + "</thead><tbody>" +
      row(m.team.name, ours, m.game.us) + row(m.game.oppName, theirs, m.game.them) + "</tbody></table>");
  }

  // Team stats, the team on the left. Bars show the share of the two values
  // when both are plain numbers; the numbers are always text.
  function statRows(m, limit) {
    var gd = m.detail, s = sides(gd, m.game);
    if (!gd || !gd.teamStats || !s) return "";
    var rows = limit ? gd.teamStats.slice(0, limit) : gd.teamStats;
    return '<ul class="ts-list">' + rows.map(function (r) {
      var a = r[s.usKey], b = r[s.themKey];
      var na = parseFloat(a), nb = parseFloat(b), both = isFinite(na) && isFinite(nb) && /^-?[\d.]+$/.test(String(a)) && /^-?[\d.]+$/.test(String(b));
      // A share bar only where more is better; for turnovers it would read backwards.
      var pa = both && !r.lowerWins && na + nb > 0 ? Math.round(na / (na + nb) * 100) : null;
      var better = r.better === s.usKey ? "us" : r.better === s.themKey ? "them" : null;
      return '<li class="ts-row"><span class="ts-v us' + (better === "us" ? " better" : "") + '">' + esc(a == null ? "–" : a) + "</span>" +
             '<span class="ts-l">' + esc(r.label) + "</span>" +
             '<span class="ts-v them' + (better === "them" ? " better" : "") + '">' + esc(b == null ? "–" : b) + "</span>" +
             (pa != null ? '<span class="ts-bar" aria-hidden="true"><span class="us" style="width:' + pa + '%"></span><span class="them" style="width:' + (100 - pa) + '%"></span></span>' : "") +
             "</li>";
    }).join("") + "</ul>";
  }

  // ---- drive tracker ---------------------------------------------------------------

  // A drive on a field that always runs left to right for the offense:
  // position = yards from the offense's own goal line.
  function field(drive, m) {
    var W = 1000, H = 230, EZ = 80, FW = W - 2 * EZ, Y = function (v) { return EZ + FW * v / 100; };
    // Only the offense's own snaps: the kickoff that opens a drive is the
    // other team's play, measured from the other end.
    var plays = (drive.plays || []).filter(function (p) { return p.offense && p.start && p.start.fromOwn != null; });
    if (!plays.length) return "";
    // A play's end counts only while the same team still has the ball.
    function endOf(p) {
      return p.end && p.end.fromOwn != null && (!p.end.teamId || p.end.teamId === p.start.teamId) ? p.end.fromOwn : null;
    }
    var start = plays[0].start.fromOwn;
    var lastP = plays[plays.length - 1];
    var los = endOf(lastP) != null ? endOf(lastP) : lastP.start.fromOwn;
    var toGo = endOf(lastP) != null && lastP.end.distance ? lastP.end.distance : null;
    var first = toGo != null ? Math.min(100, los + toGo) : null;
    var s = '<svg class="field" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(driveLabel(drive, m, los)) + '">';
    s += '<rect x="0" y="0" width="' + W + '" height="' + H + '" rx="10" class="f-turf"/>';
    for (var i = 0; i < 10; i++) if (i % 2) s += '<rect x="' + Y(i * 10) + '" y="0" width="' + FW / 10 + '" height="' + H + '" class="f-stripe"/>';
    s += '<rect x="0" y="0" width="' + EZ + '" height="' + H + '" class="f-ez own' + (drive.mine ? " mine" : "") + '"/>';
    s += '<rect x="' + (W - EZ) + '" y="0" width="' + EZ + '" height="' + H + '" class="f-ez opp' + (drive.mine ? "" : " mine") + '"/>';
    s += '<text x="' + EZ / 2 + '" y="' + H / 2 + '" class="f-ezt" transform="rotate(-90 ' + EZ / 2 + " " + H / 2 + ')">' + esc(drive.mine ? m.team.abbr : (m.game.oppAbbr || "")) + "</text>";
    s += '<text x="' + (W - EZ / 2) + '" y="' + H / 2 + '" class="f-ezt" transform="rotate(90 ' + (W - EZ / 2) + " " + H / 2 + ')">' + esc(drive.mine ? (m.game.oppAbbr || "") : m.team.abbr) + "</text>";
    for (var y = 5; y < 100; y += 5) s += '<line x1="' + Y(y) + '" y1="0" x2="' + Y(y) + '" y2="' + H + '" class="f-line' + (y % 10 ? " thin" : "") + '"/>';
    [10, 20, 30, 40, 50, 60, 70, 80, 90].forEach(function (y) {
      s += '<text x="' + Y(y) + '" y="' + (H - 18) + '" class="f-num">' + (y > 50 ? 100 - y : y) + "</text>";
    });
    if (first != null && first < 100) s += '<line x1="' + Y(first) + '" y1="0" x2="' + Y(first) + '" y2="' + H + '" class="f-first"/>';
    s += '<line x1="' + Y(los) + '" y1="0" x2="' + Y(los) + '" y2="' + H + '" class="f-los"/>';
    var pts = [start].concat(plays.map(function (p) { return endOf(p) != null ? endOf(p) : p.start.fromOwn; }));
    s += '<polyline points="' + pts.map(function (v) { return Y(v) + "," + (H * 0.42); }).join(" ") + '" class="f-path"/>';
    pts.forEach(function (v, i) {
      s += '<circle cx="' + Y(v) + '" cy="' + H * 0.42 + '" r="' + (i === 0 ? 16 : 12) + '" class="' + (i === 0 ? "f-start" : "f-play") + '"/>';
    });
    return s + "</svg>";
  }
  function driveLabel(d, m, los) {
    var who = d.mine ? m.team.name : m.game.oppName;
    return "Current drive: " + who + ", " + (d.summary || "") + ". Ball at the " + (los <= 50 ? "own " + los : "opponent's " + (100 - los)) + ".";
  }

  function driveCard(m) {
    var d = m.detail && m.detail.drives && m.detail.drives.current;
    if (!d) return "";
    var svg = field(d, m);
    if (!svg) return "";
    return card("Current drive", svg +
      '<ul class="f-legend" aria-hidden="true"><li><span class="k start"></span>Drive start</li><li><span class="k play"></span>Play</li>' +
      '<li><span class="k los"></span>Line of scrimmage</li><li><span class="k first"></span>First down</li></ul>',
      d.summary ? '<span class="gcard-note">' + esc(d.summary) + "</span>" : "", "gcard-drive");
  }

  function lastPlay(m) {
    var lp = m.detail && m.detail.lastPlay;
    if (!lp) return "";
    return card("Last play", (lp.downDistance ? '<p class="lp-dd">' + esc(lp.downDistance) + "</p>" : "") +
      '<p class="lp-text">' + esc(lp.text) + "</p>" +
      '<a class="sec-link" href="#game/plays">View play-by-play' + CHEVRON + "</a>");
  }

  // ---- plays -----------------------------------------------------------------------

  function plays(m) {
    var gd = m.detail;
    if (!gd) return quiet("Loading the plays…");
    var out = "";
    if (gd.scoring && gd.scoring.length) {
      out += card("Scoring plays", '<ol class="sp-list">' + gd.scoring.map(function (p) {
        return '<li class="' + (p.mine ? "mine" : "") + '"><span class="sp-when">' + esc([ordinal(p.period), p.clock].filter(Boolean).join(" · ")) + "</span>" +
               '<span class="sp-team">' + esc(p.teamAbbr) + "</span>" +
               '<span class="sp-text">' + esc(p.text) + "</span>" +
               (p.awayScore != null ? '<span class="sp-score">' + esc(scoreFor(m, p)) + "</span>" : "") + "</li>";
      }).join("") + "</ol>");
    }
    var drives = gd.drives && gd.drives.list || [];
    if (drives.length) {
      out += card("Drives", '<ol class="dr-list">' + drives.slice().reverse().map(function (d) {
        var dk = "drive-" + (d.id || ""), dopen = m.open && m.open[dk];
        return '<li><details data-key="' + esc(dk) + '"' + (dopen ? " open" : "") + '><summary><span class="dr-team">' + esc(d.mine ? m.team.abbr : (m.game.oppAbbr || m.game.oppName)) + "</span>" +
               '<span class="dr-sum">' + esc(d.summary || "") + "</span>" +
               '<span class="dr-res">' + esc(d.result || "") + "</span></summary>" +
               '<ol class="pl-list">' + (d.plays || []).map(function (p) {
                 return '<li><span class="pl-dd">' + esc(p.start && p.start.short ? p.start.short + (p.start.spot ? " at " + p.start.spot : "") : "") + "</span>" +
                        '<span class="pl-text">' + esc(p.text) + "</span></li>";
               }).join("") + "</ol></details></li>";
      }).join("") + "</ol>");
    }
    return out || quiet("No plays yet.");
  }
  function scoreFor(m, p) {
    var s = sides(m.detail, m.game);
    var us = s.usKey === "home" ? p.homeScore : p.awayScore, them = s.usKey === "home" ? p.awayScore : p.homeScore;
    return us + "–" + them;
  }

  // ---- box score ---------------------------------------------------------------------

  // Which categories start open: the core offense, and any short table that
  // is not defense or special teams. Everything else starts closed.
  var CORE = /^(passing|rushing|receiving)$/i;
  var LONG_OR_SPECIAL = /defen|kick|punt|return/i;
  function openByDefault(t) {
    var k = String(t.key || t.label || "");
    if (CORE.test(k)) return true;
    return !LONG_OR_SPECIAL.test(k) && t.rows.length <= 3;
  }

  function box(m) {
    var gd = m.detail, s = sides(gd, m.game);
    if (!gd) return quiet("Loading the box score…");
    if (!gd.box || !s) return quiet("No box score yet.");
    var which = m.side === "them" ? "them" : "us";
    var tables = gd.box[which === "them" ? s.themKey : s.usKey] || [];
    var who = which === "them" ? m.game.oppName : m.team.name;
    // Every category is its own disclosure: collapse the category, never
    // truncate it. Expanded, it shows every player. The fan's choice is kept
    // across refreshes (model.open); until they choose, the core offense
    // opens and the long defensive and special-teams tables start closed.
    var body = tables.length ? tables.map(function (t) {
      var key = "box-" + which + "-" + (t.key || t.label);
      var open = m.open && key in m.open ? m.open[key] : openByDefault(t);
      var n = t.rows.length;
      return '<details class="bx-cat" data-key="' + esc(key) + '"' + (open ? " open" : "") + ">" +
             '<summary><span class="bx-name">' + esc(t.label || t.title) + "</span>" +
               '<span class="bx-count">' + n + (n === 1 ? " player" : " players") + "</span>" +
               '<span class="bx-state" aria-hidden="true"></span></summary>' +
             '<div class="bx-wrap"><table class="bx" aria-label="' + esc(who + " " + (t.label || t.title)) + '">' +
             '<thead><tr><th scope="col">Player</th>' + t.labels.map(function (l) { return '<th scope="col">' + esc(l) + "</th>"; }).join("") + "</tr></thead>" +
             "<tbody>" + t.rows.map(function (r) {
               return '<tr><th scope="row">' + esc(r.name) + "</th>" + r.stats.map(function (v) { return "<td>" + esc(v) + "</td>"; }).join("") + "</tr>";
             }).join("") + "</tbody></table></div></details>";
    }).join("") : quiet("No box score for this team yet.");
    return card("Box score", body, sideToggle(m, m.side), "gcard-box");
  }

  // ---- compose -------------------------------------------------------------------------

  function body(m) {
    var g = m.game, v = m.view;
    if (m.lifecycle.phase === "pregame") {
      return matchup(m) + leaders(m, "Leaders (season)") + seriesCard(g);
    }
    if (v === "drive") {
      var html = driveCard(m) + lastPlay(m) + linescore(m);
      var sr = statRows(m, 6);
      if (sr) html += card("Game stats", sr + '<a class="sec-link" href="#game/stats">View all stats' + CHEVRON + "</a>");
      return html || quiet(m.detail ? "The drive tracker fills in once the first drive starts." : "Loading the game…");
    }
    if (v === "plays") return plays(m);
    if (v === "stats") {
      if (!m.detail) return quiet("Loading the stats…");
      return (statRows(m) ? card("Team stats", statRows(m)) : "") + linescore(m) + leaders(m, "Leaders") || quiet("No stats yet.");
    }
    return box(m) + linescore(m);                               // box, the final default
  }

  function paint(host, m) {
    if (!host) return;
    if (!m.game) {
      host.innerHTML = '<section class="game-empty">' + quiet("No game to show right now.") +
        '<a class="btn btn-secondary" href="#schedule">See the schedule' + CHEVRON + "</a></section>";
      last = {};
      return;
    }
    if (!host.querySelector("[data-game]")) {
      host.innerHTML = '<div data-game="head"></div><div data-game="strip"></div><div data-game="body" class="game-body"></div>';
      last = {};
    }
    var html = { head: header(m), strip: strip(m), body: body(m) };
    ["head", "strip", "body"].forEach(function (k) {
      if (last[k] === html[k]) return;
      var el = host.querySelector('[data-game="' + k + '"]');
      el.innerHTML = html[k];
      last[k] = html[k];
    });
  }

  return { paint: paint, sides: sides };
})();
