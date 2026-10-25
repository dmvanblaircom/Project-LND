/* Suite - Top 25, national college football inside the fan's Suite
   (reference 07; decisions 0024 §5, §6, 0025).

   Two peer views, both routes:
     #top25                       Games: this week's games with a ranked side
     #top25/games/<event id>      ...with one game open in a sheet over them
     #top25/rankings[/<source>[/<week>]]   Rankings: CFP | AP | Coaches | FPI | SP+, all 25
                                  rows, any kept week (model.weeks, model.week)

   The header - the SUITE bar with the selected team as quiet context, and
   the "Top 25" heading - is suite/nav.js's. This file draws the view strip
   and the view.

   This file only draws. app.js hands over normalized TeamOS data; nothing
   here fetches, reads a provider payload or names a team.

     Suite.top25.paint(host, model)
       model.view      "games" | "rankings"
       model.poll      the poll asked for by the route ("ap", "cfp", ...) or null
       model.calendar  TeamOS.season.calendar(): the next CFP rankings show and
                       Selection Day, from the league's published calendar
       model.polls     Poll[] | null (still loading)
       model.ratingSources [{key,label}] - enabled predictive sources only
       model.ratings   Rating[] from TeamOS; model.ratingsFailed keyed by source:
                       true (failed) or "unpublished"
       model.games     LeagueGame[] | null (still loading)
       model.gamesFailed, model.pollsFailed   no copy and the network failed
       model.heroId    the team's hero game - the one #game opens - or null
       model.mark      providerId -> logo URL for a light surface
       model.fresh     TeamOS.freshness.summary() output
       model.now       Date

   The selected team is highlighted where it appears; it is never moved. */

var Suite = Suite || {};

Suite.top25 = (function () {
  "use strict";

  var ui = Suite.ui, esc = ui.esc;
  var last = {};

  var CHEVRON = '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m9 6 6 6-6 6"/></svg>';
  // The three polls the product names, in its order (README: CFP | AP |
  // Coaches). A poll the feed has not published yet still has its place.
  var POLLS = [{ key: "cfp", label: "CFP" }, { key: "ap", label: "AP" }, { key: "coaches", label: "Coaches" }];

  function quiet(text) { return '<p class="sec-quiet">' + esc(text) + "</p>"; }

  function strip(view) {
    return '<nav class="game-tabs view-tabs" aria-label="Top 25 views">' +
      [["games", "Games", "#top25"], ["rankings", "Rankings", "#top25/rankings"]].map(function (v) {
        return '<a href="' + v[2] + '"' + (v[0] === view ? ' aria-current="page"' : "") + ">" + v[1] + "</a>";
      }).join("") + "</nav>";
  }

  // ---- Games -------------------------------------------------------------------

  function ranked(games) {
    return (games || []).filter(function (g) { return g.home.rank || g.away.rank; });
  }
  function dayKey(iso) { var d = new Date(iso); return d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate(); }
  function dayLabel(iso) { return new Date(iso).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" }); }

  function spoken(s) { return (s.rank ? "number " + s.rank + " " : "") + s.name; }

  // One side of a game: mark, rank, name and record, and the score once there
  // is one. In a final the winner's score carries the weight; no word says it.
  function side(m, s, g, won) {
    var scored = g.state !== "pre";
    return '<span class="tg-side' + (scored && won === false ? " lost" : "") + '">' +
             ui.mark(s.providerId ? m.mark(s.providerId) : null, s.name, s.abbr, "plain") +
             '<span class="tg-name">' + (s.rank ? '<span class="tg-rank">' + s.rank + "</span> " : "") + esc(s.name) +
               (s.record ? ' <span class="tg-rec">' + esc(s.record) + "</span>" : "") + "</span>" +
             (scored ? '<span class="tg-score">' + (hasBall(g, s) ? ui.ball("tg-ball") : "") + esc(s.score == null ? "0" : s.score) + "</span>" : "") +
           "</span>";
  }

  // The possession football, as on Home and Game (David, 2026-09-26): on
  // the side TeamOS.live says has the ball - between plays too - only while
  // play is on, never in a delay, at halftime or once it is over. At
  // halftime no one has the ball: who gets it to start the second half
  // (TeamOS.live.receives) is said in words instead (David, 2026-10-14).
  function sideOf(g, p) { return p === "home" ? g.home : p === "away" ? g.away : null; }
  function ballSide(g) {
    if (g.state !== "in" || g.status === "delayed" || g.status === "suspended" || TeamOS.game.halftime(g)) return null;
    return sideOf(g, TeamOS.live.withBall(g));
  }
  function atHalf(g) { return g.state === "in" && TeamOS.game.halftime(g); }
  function receiver(g) { return atHalf(g) ? sideOf(g, TeamOS.live.receives(g)) : null; }
  function hasBall(g, s) { return ballSide(g) === s; }

  function status(g) {
    if (g.state === "in") {
      var paused = g.status === "delayed" || g.status === "suspended";
      return (paused ? '<span class="state-pill paused">' + (g.status === "suspended" ? "Suspended" : "Delayed") + "</span>"
                     : '<span class="live-pill tg-live">Live</span>') +
             '<span class="tg-when">' + esc(g.detail) + "</span>";
    }
    if (g.state === "post") return '<span class="tg-final">' + esc(g.detail || "Final") + "</span>";
    if (g.status === "postponed" || g.status === "canceled")
      return '<span class="state-pill ' + g.status + '">' + esc(g.status) + "</span>";
    var ko = ui.kickoff(g.date, g.timeSet);
    return '<span class="tg-when">' + esc(ko.time) + "</span>" + (g.net ? '<span class="tg-net">' + esc(g.net) + "</span>" : "");
  }

  function summary(g, won) {
    var a = g.away, h = g.home;
    if (g.state === "pre") {
      var ko = ui.kickoff(g.date, g.timeSet);
      return spoken(a) + " at " + spoken(h) + ". " + ko.full + (g.net ? " on " + g.net : "") + "." +
             (g.odds && g.odds.line ? " " + g.odds.line + (g.odds.total != null ? ", over/under " + g.odds.total : "") + "." : "");
    }
    return (g.state === "post" ? "Final. " : g.state === "in" ? "Live, " + g.detail + ". " : "") +
           spoken(a) + " " + (a.score || 0) + ", at " + spoken(h) + " " + (h.score || 0) + "." +
           (receiver(g) ? " " + receiver(g).name + " gets the ball to start the second half." : ballSide(g) ? " " + ballSide(g).name + " has the ball." : "") +
           (lastPlay(g) ? " Last play" + (lastAt(g) ? " at " + lastAt(g) : "") + ": " + lastPlay(g) : "");
  }

  // The latest play of a game under way, as TeamOS normalized it: the
  // source's own words, with the snap's clock lifted out as a time
  // (lastPlayAt). Never before kickoff or after the final.
  function lastPlay(g) {
    return g.state === "in" && g.live && g.live.lastPlay ? g.live.lastPlay : "";
  }
  function lastAt(g) { return lastPlay(g) && g.live.lastPlayAt ? g.live.lastPlayAt : ""; }

  function gameRow(m, g) {
    var as = Number(g.away.score), hs = Number(g.home.score);
    var final = g.state === "post" && !isNaN(as) && !isNaN(hs) && as !== hs;
    var awayWon = final ? as > hs : null, homeWon = final ? hs > as : null;
    // Values only, as secondary metadata (0025); not once the game is on.
    var odds = g.state === "pre" && g.odds && (g.odds.line || g.odds.total != null)
      ? '<span class="tg-odds">' + esc([g.odds.line, g.odds.total != null ? "O/U " + g.odds.total : ""].filter(Boolean).join(" · ")) + "</span>"
      : "";
    var body = '<span class="tg-body" aria-hidden="true">' +
                 '<span class="tg-sides">' + side(m, g.away, g, awayWon) + side(m, g.home, g, homeWon) + "</span>" +
                 '<span class="tg-status">' + status(g) + "</span>" + odds +
                 // At halftime, who gets the ball next says more than "End of 2nd quarter."
                 (receiver(g) ? '<span class="tg-last">' + esc(receiver(g).name) + " gets the ball to start the second half</span>"
                  : lastPlay(g) ? '<span class="tg-last">' + (lastAt(g) ? '<span class="tg-at">' + esc(lastAt(g)) + "</span> " : "") + esc(lastPlay(g)) + "</span>" : "") +
               "</span>" +
               '<span class="sr-only">' + esc(summary(g)) + "</span>";
    // Every row is a way in (David, 2026-10-20): the team's own game - the
    // one #game opens - to Game, every other game to its sheet.
    var game = g.mine && m.heroId && g.id === m.heroId;
    return '<li class="tg' + (g.mine ? " mine" : "") + (g.state === "in" ? " is-live" : "") + '" data-ev="' + esc(g.id) + '">' +
             (game ? '<a class="tg-row" href="#game">' + body + '<span class="sr-only"> Open Game.</span>' + CHEVRON + "</a>"
                   : '<a class="tg-row" href="#top25/games/' + esc(g.id) + '">' + body + '<span class="sr-only"> Open details.</span>' + CHEVRON + "</a>") +
           "</li>";
  }

  function games(m) {
    if (m.games == null) return quiet(m.gamesFailed ? "This week’s games didn’t load. They appear when the connection returns."
                                                    : "Loading this week’s Top 25 games…");
    var list = ranked(m.games);
    if (!list.length) return quiet("No ranked teams play in this window.");
    var days = [], byDay = {};
    list.forEach(function (g) {
      var k = dayKey(g.date);
      if (!byDay[k]) { byDay[k] = []; days.push({ key: k, label: dayLabel(g.date), games: byDay[k] }); }
      byDay[k].push(g);
    });
    // Within a day, what is happening now comes first (TeamOS.game.boardOrder).
    days.forEach(function (d) { d.games.sort(TeamOS.game.boardOrder); });
    return '<p class="t25-intro">' + list.length + (list.length === 1 ? " game" : " games") +
             " with a ranked team · times in your time zone</p>" +
      days.map(function (d, i) {
        var id = "t25day" + i;
        return '<section class="t25-day" aria-labelledby="' + id + '"><h2 class="t25-day-title" id="' + id + '">' + esc(d.label) + "</h2>" +
               '<ul class="card tg-list">' + d.games.map(function (g) { return gameRow(m, g); }).join("") + "</ul></section>";
      }).join("");
  }

  // ---- Rankings ----------------------------------------------------------------

  function pollKey(p) { return String(p.key || p.label || "").toLowerCase(); }
  function sources(m) { return POLLS.concat(m.ratingSources || []); }

  // The poll on screen: the route's, else CFP once it is published, else AP
  // (README: AP leads until the committee releases the CFP rankings).
  function chosen(m) {
    var have = {}; (m.polls || []).concat(m.ratings || []).forEach(function (p) { have[pollKey(p)] = p; });
    var want = String(m.poll || "").toLowerCase();
    if (sources(m).some(function (x) { return x.key === want; })) return { key: want, poll: have[want] || null };
    var key = have.cfp ? "cfp" : have.ap ? "ap" : (m.polls && m.polls[0] ? pollKey(m.polls[0]) : "ap");
    return { key: key, poll: have[key] || null };
  }

  // The week shown (David, 2026-10-20): every kept week, newest first and
  // newest by default, as a native select - one compact control, any number
  // of weeks. Picking one moves the route (#top25/rankings/<source>/<week>;
  // app.js listens), the newest back to the plain route. Not drawn with only
  // one week to choose from.
  // Each week by its name alone (David, 2026-10-21: "just say week 7");
  // the date only tells apart two weeks of the same name (SP+ moving twice
  // in one week).
  function weekPick(m, key) {
    var w = m.weeks || [];
    if (w.length < 2) return "";
    var named = {};
    w.forEach(function (x) { named[x.label] = (named[x.label] || 0) + 1; });
    return '<div class="rk-weekpick"><label for="rkWeek">Week</label><select id="rkWeek" data-week data-source="' + esc(key) + '">' +
      w.map(function (x, i) {
        var d = named[x.label] > 1 && x.date ? new Date(x.date) : null;
        var day = d && !isNaN(d) ? " · " + d.toLocaleDateString([], { month: "short", day: "numeric" }) : "";
        return '<option value="' + esc(i === 0 ? "" : x.id) + '"' + (x.id === m.week ? " selected" : "") + ">" +
               esc(x.label + day + (i === 0 ? " (latest)" : "")) + "</option>";
      }).join("") + "</select></div>";
  }

  function pollSeg(key, m) {
    return '<nav class="seg-light poll-seg" aria-label="Ranking source">' + sources(m).map(function (x) {
      return '<a href="#top25/rankings/' + x.key + '"' + (x.key === key ? ' aria-current="page"' : "") + ">" + x.label + "</a>";
    }).join("") + "</nav>";
  }

  function trend(r) {
    if (r.isNew) return '<span class="rk-new">New<span class="sr-only"> to the poll</span></span>';
    if (r.change == null) return '<span class="sr-only">No earlier rank</span>';
    if (r.change === 0) return '<span class="rk-same" aria-hidden="true">—</span><span class="sr-only">No change</span>';
    var up = r.change > 0, n = Math.abs(r.change);
    return '<span class="rk-move ' + (up ? "up" : "down") + '"><span aria-hidden="true">' + (up ? "▲" : "▼") + " </span>" + n +
           '<span class="sr-only"> ' + (up ? "up" : "down") + (n === 1 ? " place" : " places") + "</span></span>";
  }

  function pollTable(m, p) {
    var updated = p.updated ? new Date(p.updated) : null;
    var head = '<div class="rk-head"><h2 class="rk-title">' + esc(p.name) + (p.asOf ? '<span class="rk-week"> · ' + esc(p.asOf) + "</span>" : "") + "</h2>" +
               (updated && !isNaN(updated) ? '<p class="rk-updated">Updated ' +
                 esc(updated.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })) + "</p>" : "") + "</div>";
    return '<section class="card rk-card">' + head +
      '<table class="rk-table"><caption class="sr-only">' + esc(p.name + (p.asOf ? ", " + p.asOf : "")) + "</caption>" +
        '<thead><tr><th scope="col" class="rk-n">Rank</th><th scope="col" class="rk-team">Team</th>' +
          '<th scope="col" class="rk-rec">Record</th><th scope="col" class="rk-prev">Prev</th><th scope="col" class="rk-trend">Trend</th></tr></thead>' +
        "<tbody>" + p.ranks.map(function (r) {
          return '<tr' + (r.mine ? ' class="mine"' : "") + '><td class="rk-n">' + esc(r.rank) + "</td>" +
                 '<th scope="row" class="rk-team"><span class="rk-teamcell">' + ui.mark(r.providerId ? m.mark(r.providerId) : null, r.team, r.abbr, "plain") +
                   '<span class="rk-name">' + esc(r.team) + (r.mine ? '<span class="sr-only"> (selected team)</span>' : "") + "</span></span></th>" +
                 '<td class="rk-rec">' + esc(r.record) + "</td>" +
                 '<td class="rk-prev">' + (r.isNew ? "NR" : r.previous != null ? esc(r.previous) : "—") + "</td>" +
                 '<td class="rk-trend">' + trend(r) + "</td></tr>";
        }).join("") + "</tbody></table></section>";
  }

  function rankings(m) {
    var c = chosen(m), rating = (m.ratingSources || []).filter(function (x) { return x.key === c.key; })[0];
    if (rating) {
      return pollSeg(c.key, m) + weekPick(m, c.key) + calendarNote(m.calendar, (m.polls || []).some(function (p) { return pollKey(p) === "cfp"; })) +
        (c.poll ? ratingTable(m, c.poll) : quiet(m.ratingsFailed && m.ratingsFailed[c.key] === "unpublished"
          ? rating.label + " isn’t published for this season yet."
          : m.ratingsFailed && m.ratingsFailed[c.key]
          ? rating.label + " didn’t load. Return to this view or use Refresh Data to try again."
          : "Loading " + rating.label + "…"));
    }
    if (m.polls == null) return pollSeg(c.key, m) + weekPick(m, c.key) + quiet(m.pollsFailed ? "The rankings didn’t load. They appear when the connection returns."
                                                                             : "Loading the rankings…");
    var hasCfp = (m.polls || []).some(function (p) { return pollKey(p) === "cfp"; });
    var body = c.poll ? pollTable(m, c.poll) : c.key === "cfp" ? "" : quiet("This poll is not available right now.");
    return pollSeg(c.key, m) + weekPick(m, c.key) + calendarNote(m.calendar, hasCfp) + body;
  }

  // A source with no change history (SP+) has no Change column at all:
  // an empty column would read as "no team moved" (handoff 2026-10-14).
  function ratingTable(m, p) {
    var updated = p.updated ? new Date(p.updated) : null, moves = !!p.changeWindow;
    var credit = esc(p.credit || p.name);
    var source = p.sourceUrl && /^https:\/\//i.test(p.sourceUrl)
      ? '<a href="' + esc(p.sourceUrl) + '" target="_blank" rel="noopener noreferrer">' + credit + '<span class="sr-only"> (opens in a new tab)</span></a>' : credit;
    var head = '<div class="rk-head"><h2 class="rk-title">' + esc(p.name) + '</h2>' +
      (updated && !isNaN(updated) ? '<p class="rk-updated">Updated ' + esc(updated.toLocaleDateString([], {month:"short",day:"numeric",year:"numeric"})) + '</p>' : '') + '</div>';
    var edition = '<p class="rk-method">Predictive rating · ' + esc(p.season) + ' season' + (p.asOf ? ' · ' + esc(p.asOf) : '') +
      (moves ? '. Rank change over ' + esc(p.changeWindow) : '') + '.</p>';
    var previous = p.current === false ? '<p class="rk-edition" role="note">Showing the ' + esc(p.season) + ' edition. This is not the current season’s rating.</p>' : '';
    var mine = p.mine && !p.ranks.some(function (r) { return r.mine; })
      ? '<p class="rk-outside">Your team: <strong>#' + esc(p.mine.rank) + ' ' + esc(p.mine.team) + '</strong> · Rating ' + esc(p.mine.rating.toFixed(1)) + '</p>' : '';
    return '<section class="card rk-card">' + head + edition + previous +
      '<table class="rk-table rk-ratings"><caption class="sr-only">' + esc(p.name + ', ' + p.season + ', predictive ratings' + (moves ? '. Change over ' + p.changeWindow : '')) + '</caption>' +
      '<thead><tr><th scope="col" class="rk-n">Rank</th><th scope="col" class="rk-team">Team</th><th scope="col" class="rk-value">Rating</th>' +
      (moves ? '<th scope="col" class="rk-trend">Change<span class="sr-only"> over ' + esc(p.changeWindow) + '</span></th>' : '') + '</tr></thead><tbody>' +
      p.ranks.map(function (r) {
        return '<tr' + (r.mine ? ' class="mine"' : '') + '><td class="rk-n">' + esc(r.rank) + '</td><th scope="row" class="rk-team"><span class="rk-teamcell">' +
          ui.mark(r.providerId ? m.mark(r.providerId) : null, r.team, r.abbr, 'plain') + '<span class="rk-name">' + esc(r.team) +
          (r.mine ? '<span class="sr-only"> (selected team)</span>' : '') + (r.record ? '<span class="rk-rating-record">' + esc(r.record) + '</span>' : '') + '</span></span></th>' +
          '<td class="rk-value">' + esc(r.rating.toFixed(1)) + '</td>' + (moves ? '<td class="rk-trend">' + trend(r) + '</td>' : '') + '</tr>';
      }).join('') + '</tbody></table>' + mine + '<p class="rk-source">Source: ' + source + '</p></section>';
  }

  // What is coming from the committee (David, 2026-10-02; decision 0033):
  // one compact notice directly under the poll selector, on every poll. It
  // names only the NEXT rankings show, or the one on air, so it moves on by
  // itself each week - never the whole season's list - and Selection Day,
  // when the playoff field and then every bowl matchup are announced. The
  // dates are the league's published calendar (leagues/), in the fan's own
  // time; nothing is said once Selection Day is over.
  function show(e) { return ui.kickoff(e.start).full; }
  function calendarNote(cal, hasCfp) {
    var lines = [];
    var r = cal && cal.rankings, s = cal && cal.selection;
    if (r) {
      lines.push(r.live ? "<strong>CFP rankings:</strong> on now" + (r.on ? " on " + esc(r.on) : "")
        : "<strong>" + (r.first ? "First CFP rankings" : "Next CFP rankings") + ":</strong> " + esc(show(r)) + (r.on ? " on " + esc(r.on) : ""));
    }
    if (s) {
      lines.push(s.live ? "<strong>Selection Day:</strong> the playoff field is being revealed now" + (s.on ? " on " + esc(s.on) : "") + "."
        : "<strong>Selection Day:</strong> " + esc(show(s)) + (s.on ? " on " + esc(s.on) : "") + ". The 12-team playoff field" +
          (cal.bowls ? ", then every bowl matchup that afternoon." : "."));
    }
    if (!lines.length) return hasCfp ? "" : '<p class="rk-note" role="note">CFP rankings will appear once the committee releases them.</p>';
    return '<div class="rk-note" role="note">' + lines.map(function (l) { return "<p>" + l + "</p>"; }).join("") + "</div>";
  }

  // ---- One game, in a sheet ----------------------------------------------------
  // #top25/games/<event id> (David, 2026-10-20: a sheet, every row). It lifts
  // over the list rather than replacing it, so the board is one Back away,
  // and it carries a fixed few things - never the whole Game screen:
  //   before kickoff  when, where, on what, and the line (the list's own facts)
  //   live            score by quarter, who has the ball and where, win
  //                   probability, the last three plays, the leaders
  //   final           score by quarter and the leaders
  // Everything but the list's facts comes from the game's summary, which
  // app.js fetches only while the sheet is open.
  //   model.game    the LeagueGame from the board, or null (an old link)
  //   model.detail  TeamOS GameDetail, or null while it loads
  //   model.failed  the summary did not load
  var SHEET_LEADERS = ["Passing", "Rushing", "Receiving"];
  function pct(x) { return Math.round(x * 100) + "%"; }
  function sideMark(m, s) { return '<span class="sh-mark">' + ui.mark(s.providerId ? m.mark(s.providerId) : null, s.name, s.abbr, "plain") + "</span>"; }
  function abbr(s) { return s.abbr || s.name; }

  // Each section is a card on the sheet's page colour, so what it holds
  // reads as one thing and the sections stand apart (David, 2026-10-24:
  // the sheet's text "blends together").
  function sheetSection(title, body, cls) {
    return '<section class="sh-sec card' + (cls ? " " + cls : "") + '"><h3 class="sh-h">' + esc(title) + "</h3>" + body + "</section>";
  }
  function sheetLinescore(gd, g) {
    var ls = gd && gd.linescore;
    if (!ls) return "";
    var a = ls.away || [], h = ls.home || [], n = Math.max(4, a.length, h.length);
    // the quarter being played, while the game is on
    var cur = g.state === "in" && g.period ? g.period - 1 : -1;
    var as = Number(g.away.score), hs = Number(g.home.score), lead = isNaN(as) || isNaN(hs) || as === hs ? null : as > hs ? "away" : "home";
    var head = '<tr><th scope="col"><span class="sr-only">Team</span></th>';
    for (var i = 0; i < n; i++) head += '<th scope="col"' + (i === cur ? ' class="cur"' : "") + ">" + (i < 4 ? i + 1 : i === 4 ? "OT" : (i - 3) + "OT") + "</th>";
    head += '<th scope="col">T</th></tr>';
    function row(key, side, list) {
      var r = '<tr><th scope="row">' + esc(abbr(side)) + "</th>";
      for (var i = 0; i < n; i++) r += "<td" + (i === cur ? ' class="cur"' : "") + ">" + esc(list[i] != null && list[i] !== "" ? list[i] : "–") + "</td>";
      return r + '<td class="t' + (lead && lead !== key ? " trail" : "") + '">' + esc(side.score == null ? "–" : side.score) + "</td></tr>";
    }
    return sheetSection("Score by quarter", '<table class="ls"><thead>' + head + "</thead><tbody>" +
      row("away", g.away, a) + row("home", g.home, h) + "</tbody></table>");
  }

  // Where the ball is, on a field that runs left to right for the offense
  // (as Game's drive card does): the line of scrimmage and the line to gain,
  // from the current drive's last snap. Nothing when the drive does not say.
  function sheetField(gd, g, b) {
    var d = gd && gd.drives && gd.drives.current;
    var key = b === g.home ? "home" : b === g.away ? "away" : null;
    if (!d || !key || d.side !== key || d.result) return "";
    var snaps = (d.plays || []).filter(function (p) { return p.offense && p.start && p.start.fromOwn != null; });
    if (!snaps.length) return "";
    var lastP = snaps[snaps.length - 1];
    var kept = lastP.end && lastP.end.fromOwn != null && (!lastP.end.teamId || lastP.end.teamId === lastP.start.teamId);
    var los = kept ? lastP.end.fromOwn : lastP.start.fromOwn;
    var first = kept && lastP.end.distance ? Math.min(100, los + lastP.end.distance) : null;
    var them = b === g.home ? g.away : g.home;
    return '<div class="sh-field" aria-hidden="true">' +
      '<span class="sh-ez">' + esc(abbr(b)) + "</span>" +
      '<span class="sh-turf"><span class="sh-fifty"></span>' +
        (first != null && first < 100 ? '<span class="sh-first" style="left:' + first + '%"></span>' : "") +
        '<span class="sh-los" style="left:' + los + '%"></span>' +
        // last, so the lines pass behind it and it always reads (David,
        // 2026-10-24: a line to gain at the 49 covered it)
        '<span class="sh-fifty-n">50</span></span>' +
      '<span class="sh-ez">' + esc(abbr(them)) + "</span></div>";
  }

  // Win probability as a split bar: each team's share in its own colour,
  // where ESPN publishes one that is not the other's; else quiet greys.
  function sheetWinProb(m, gd, g) {
    var wp = gd && gd.winProb && typeof gd.winProb.homePct === "number" ? gd.winProb.homePct : null;
    if (wp == null) return "";
    function col(side) { var c = gd[side] && gd[side].colors; return c && c.primary ? c.primary : null; }
    var ca = col("away"), ch = col("home");
    if (!ca || !ch || ca === ch) { ca = "var(--s-ink-2)"; ch = "var(--s-line-strong)"; }
    var aw = Math.round((1 - wp) * 100), hw = 100 - aw;
    return '<div class="sh-wp"><p class="sh-sub">Win probability</p>' +
      '<p class="sh-wp-row"><span class="sh-wp-side">' + sideMark(m, g.away) + esc(abbr(g.away)) + ' <b>' + aw + '%</b></span>' +
      '<span class="sh-wp-side"><b>' + hw + "%</b> " + esc(abbr(g.home)) + sideMark(m, g.home) + "</span></p>" +
      '<span class="sh-wp-bar" aria-hidden="true"><span style="width:' + aw + "%;background:" + ca + '"></span><span style="background:' + ch + '"></span></span></div>';
  }

  function sheetSituation(m, gd, g) {
    if (g.state !== "in") return "";
    var r = receiver(g), b = ballSide(g), out = "";
    if (r) out += '<p class="sh-poss">' + sideMark(m, r) + "<span>" + esc(r.name) + " gets the ball to start the second half</span></p>";
    else if (b) {
      var lv = g.live || {}, dd = lv.short && lv.spot ? [lv.short, lv.spot] : [lv.downDistance, ""];
      out += '<p class="sh-poss">' + sideMark(m, b) + "<span>" + esc(b.name) + " has the ball</span></p>" +
             (dd[0] ? '<p class="sh-dd">' + esc(dd[0]) + (dd[1] ? ' <span class="sh-spot">at ' + esc(dd[1]) + "</span>" : "") + "</p>" : "") +
             sheetField(gd, g, b);
    }
    out += sheetWinProb(m, gd, g);
    return out ? sheetSection("Right now", out, "sh-now") : "";
  }

  // The newest plays first, each with its quarter and clock, the yards it
  // gained and what it was (a score, a turnover). The newest is marked.
  var TAG_KIND = { "Touchdown": "score", "Turnover": "turnover", "Turnover on downs": "turnover", "No play": "void", "1st down": "first" };
  function sheetPlays(gd, g) {
    if (g.state !== "in" || !gd || !gd.drives) return "";
    var all = [];
    gd.drives.list.forEach(function (d) { d.plays.forEach(function (p) { if (p.text) all.push(p); }); });
    var last = all.slice(-3).reverse();
    if (!last.length) return "";
    return sheetSection("Last plays", '<ol class="sh-plays">' + last.map(function (p, i) {
      var at = [p.period ? ui.period(p.period) : "", p.clock].filter(Boolean).join(" ");
      var gain = p.snap !== false && typeof p.yards === "number" && !(p.tags || []).some(function (t) { return /No play/.test(t); })
        ? '<span class="sh-gain' + (p.yards > 0 ? " up" : p.yards < 0 ? " loss" : "") + '">' + (p.yards > 0 ? "+" : p.yards < 0 ? "−" : "") + Math.abs(p.yards) + '<span class="sr-only"> yards</span></span>' : "";
      var tags = (p.tags || []).map(function (t) { return '<span class="pl-tag ' + (TAG_KIND[t] || "") + '">' + esc(t) + "</span>"; }).join("");
      return "<li" + (i === 0 ? ' class="is-new"' : "") + ">" + (at ? '<span class="sh-at">' + esc(at) + "</span>" : "") +
             '<span class="sh-play">' + esc(p.text) + (tags ? " " + tags : "") + "</span>" + gain + "</li>";
    }).join("") + "</ol>");
  }

  // One row per category, the two teams side by side: the yards large, the
  // rest of ESPN's line under the name.
  function sheetLeaders(m, gd, g) {
    var ld = gd && gd.leaders;
    if (!ld) return "";
    function one(list, cat) { return (list || []).filter(function (r) { return r.category === cat; })[0] || null; }
    var rows = SHEET_LEADERS.map(function (cat) {
      var a = one(ld.away, cat), h = one(ld.home, cat);
      if (!a && !h) return "";
      function cell(side, r) {
        if (!r) return '<span class="sh-ld-cell"></span>';
        return '<span class="sh-ld-cell"><span class="sr-only">' + esc(abbr(side)) + " </span>" +
          '<span class="sh-ld-who">' + esc(r.name) + "</span>" +
          (r.yards != null ? '<span class="sh-ld-n">' + esc(r.yards.toLocaleString("en-US")) + '<span class="sh-ld-u"> yds</span></span>' : "") +
          (r.rest ? '<span class="sh-ld-line">' + esc(r.rest) + "</span>" : "") + "</span>";
      }
      return '<li><span class="sh-ld-cat">' + esc(cat) + "</span>" + cell(g.away, a) + cell(g.home, h) + "</li>";
    }).join("");
    if (!rows) return "";
    return sheetSection("Leaders", '<div class="sh-ld-head" aria-hidden="true"><span>' + sideMark(m, g.away) + esc(abbr(g.away)) + "</span><span>" +
      sideMark(m, g.home) + esc(abbr(g.home)) + '</span></div><ul class="sh-ld">' + rows + "</ul>");
  }
  function sheetBefore(g) {
    var ko = ui.kickoff(g.date, g.timeSet), facts = [["Kickoff", ko.full]];
    if (g.net) facts.push(["TV", g.net]);
    if (g.odds && (g.odds.line || g.odds.total != null))
      facts.push(["Line", [g.odds.line, g.odds.total != null ? "O/U " + g.odds.total : ""].filter(Boolean).join(" · ")]);
    if (g.venue) facts.push(["Venue", g.venue]);
    return sheetSection("Game info", '<dl class="sh-facts">' + facts.map(function (f) {
      return "<dt>" + esc(f[0]) + "</dt><dd>" + esc(f[1]) + "</dd>";
    }).join("") + "</dl>");
  }

  function sheetHtml(m) {
    var g = m.game;
    if (!g) return '<p class="sec-quiet">' + (m.failed ? "This game didn’t load." : "Loading the game…") + "</p>";
    var as = Number(g.away.score), hs = Number(g.home.score), fin = g.state === "post" && !isNaN(as) && !isNaN(hs) && as !== hs;
    var head = '<div class="sh-score card" aria-hidden="true"><span class="tg-sides">' + side(m, g.away, g, fin ? as > hs : null) + side(m, g.home, g, fin ? hs > as : null) +
               '</span><span class="tg-status">' + status(g) + "</span></div>" + '<p class="sr-only">' + esc(summary(g)) + "</p>";
    var body;
    if (g.state === "pre") body = sheetBefore(g);
    else {
      var more = sheetSituation(m, m.detail, g) + sheetLinescore(m.detail, g) + sheetPlays(m.detail, g) + sheetLeaders(m, m.detail, g);
      body = m.detail ? (more || '<p class="sec-quiet">No details published for this game yet.</p>')
           : sheetSituation(m, null, g) + '<p class="sec-quiet">' + (m.failed ? "The box score didn’t load. It is asked for again while this is open." : "Loading the box score…") + "</p>";
    }
    return head + body;
  }

  // The sheet's frame is drawn once per opening; only its body is refilled,
  // so focus and scroll inside it hold while a live game updates.
  var lastSheet = null;
  function sheet(host, m) {
    if (!host) return;
    if (!m) { host.hidden = true; host.innerHTML = ""; lastSheet = null; return; }
    var g = m.game;
    var title = g ? g.away.name + " at " + g.home.name : "Game";
    if (!host.querySelector(".sh")) {
      host.innerHTML = '<div class="sh-scrim" data-close></div>' +
        '<section class="sh" role="dialog" aria-modal="true" aria-labelledby="shTitle" data-no-swipe data-no-pull>' +
          '<div class="sh-top"><h2 class="sh-title" id="shTitle" tabindex="-1"></h2>' +
          '<button type="button" class="sh-close" data-close aria-label="Close">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>' +
          '<div class="sh-body"></div></section>';
      lastSheet = null;
    }
    host.hidden = false;
    var t = host.querySelector(".sh-title");
    if (t.textContent !== title) t.textContent = title;
    var html = sheetHtml(m);
    if (html !== lastSheet) { ui.fill(host.querySelector(".sh-body"), html); lastSheet = html; }
  }

  // ---- mount -------------------------------------------------------------------

  function paint(host, m) {
    if (!host) return;
    if (!host.querySelector("[data-t25]")) {
      host.innerHTML = '<div data-t25="fresh" role="status"></div><div data-t25="strip"></div><div data-t25="body" class="t25-body"></div>';
      last = {};
    }
    var html = { fresh: ui.freshBanner(m.fresh), strip: strip(m.view), body: m.view === "rankings" ? rankings(m) : games(m) };
    ["fresh", "strip", "body"].forEach(function (k) {
      if (last[k] === html[k]) return;
      ui.fill(host.querySelector('[data-t25="' + k + '"]'), html[k]);
      last[k] = html[k];
    });
  }

  return { paint: paint, sheet: sheet, chosenPoll: function (m) { return chosen(m).key; }, calendarNote: calendarNote };
})();
