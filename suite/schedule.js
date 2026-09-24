/* Suite - Schedule, the team's season (reference 08; decision 0022 #8).

   Under the team masthead, two peer views, both routes:
     #schedule           Schedule: every entry of the season, in date order,
                         postponed and canceled included
     #schedule/results   Results: the games genuinely completed
   A row opens its game: the hero game on Game itself (#game), any other in
   the Game layout at #schedule/<id> (Product, 2026-09-24). app.js draws that
   view with suite/game.js.

   The schedule row is shared with Home's Schedule preview, so the two can
   never describe a game differently: Home's compact row, and here the full
   row the reference shows - the opponent's mark, the venue under the name,
   and on the right the kickoff, where to watch and the line.

   This file only draws. TeamOS decided which games are in the season and
   which are results (TeamOS.game.season / .results); nothing here fetches,
   reads a provider payload or names a team.

     Suite.schedule.paint(host, model)
       model.view      "schedule" | "results"
       model.season    Game[] in date order | null (still loading)
       model.results   Game[] - TeamOS.game.results(season)
       model.failed    no copy and the network failed
       model.heroId    the hero game's id - its row opens #game
       model.record    the team's overall record ("3-0") or null
       model.oppMark   providerId -> logo URL for a light surface
       model.fresh     TeamOS.freshness.summary() output

     Suite.schedule.row(game, { heroId, full, oppMark })   one <li>         */

var Suite = Suite || {};

Suite.schedule = (function () {
  "use strict";

  var ui = Suite.ui, esc = ui.esc;
  var last = {};

  var CHEVRON = '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m9 6 6 6-6 6"/></svg>';

  function oppLabel(g) { return (g.oppRank ? "#" + g.oppRank + " " : "") + g.oppName; }
  function num(s) { var v = parseInt(s, 10); return isNaN(v) ? null : v; }
  function result(g) {
    var a = num(g.us), b = num(g.them);
    if (a == null || b == null) return null;
    return a > b ? "win" : a < b ? "loss" : "tie";
  }
  function siteTag(g) {
    var k = g.neutral ? "neutral" : g.home ? "home" : "away";
    return '<span class="site site-' + k + '">' + k + "</span>";
  }
  function exceptional(g) {
    return g.status === "delayed" || g.status === "suspended" || g.status === "postponed" || g.status === "canceled";
  }

  // The right-hand side: the result, the live score, the exceptional state,
  // or - before kickoff - where to watch. The full row adds the kickoff and
  // the line (values only, decision 0025).
  function side(g, full) {
    if (g.status === "final") {
      var r = result(g);
      return '<span class="sched-result ' + (r || "") + '"><span class="wl">' + (r === "win" ? "W" : r === "loss" ? "L" : "T") +
             '</span> ' + esc((g.us || "") + "–" + (g.them || "")) + "</span>";
    }
    if (g.status === "live") return '<span class="sched-live">Live · ' + esc(g.us || 0) + "–" + esc(g.them || 0) + "</span>";
    if (exceptional(g)) return '<span class="state-pill ' + g.status + '">' + esc(g.status) + "</span>";
    if (!full) return g.net ? '<span class="net-pill">' + esc(g.net) + "</span>" : '<span class="net-pill tbd">Network TBD</span>';
    var ko = ui.kickoff(g.date, g.timeSet);
    var day = new Date(g.date).toLocaleDateString([], { weekday: "short" });
    return '<span class="sched-when"><span class="sw-day">' + esc(day) + '</span><span class="sw-time">' + esc(ko.time) + "</span></span>" +
           '<span class="sched-net">' + esc(g.net || "Network TBD") + "</span>" +
           // the spread over the total, as the Game header stacks them
           (g.odds && g.odds.line ? '<span class="sched-odds">' + esc(g.odds.line) + "</span>" : "") +
           (g.odds && g.odds.total != null ? '<span class="sched-odds">O/U ' + esc(g.odds.total) + "</span>" : "");
  }

  // What a screen reader hears for the row: the whole line, in order.
  function spoken(g) {
    var d = new Date(g.date).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
    var where = g.neutral ? "Neutral site, " : g.home ? "Home, " : "Away, ";
    var st = g.status === "final"
      ? { win: "Won ", loss: "Lost ", tie: "Tied " }[result(g)] + (g.us || "") + " to " + (g.them || "") + "."
      : g.status === "live" ? "Live, " + (g.us || 0) + " to " + (g.them || 0) + "."
      : g.status === "postponed" ? "Postponed. " + Suite.home.newDate(g) + "."
      : exceptional(g) ? g.status.charAt(0).toUpperCase() + g.status.slice(1) + "."
      : ui.kickoff(g.date, g.timeSet).time + (g.net ? " on " + g.net : "") + ".";
    return d + ". " + where + (g.home || g.neutral ? "versus " : "at ") + oppLabel(g) + ". " + st;
  }

  function row(g, o) {
    o = o || {};
    var d = new Date(g.date), ko = ui.kickoff(g.date, g.timeSet);
    var meta = o.full
      ? (g.status === "postponed" ? Suite.home.newDate(g) : g.venue)
      : g.status === "final" ? g.venue : [g.timeSet === false ? "Time TBA" : ko.time, g.venue].filter(Boolean).join(" · ");
    var hero = g.id === o.heroId;
    var mark = o.full ? ui.mark(g.oppProviderId && o.oppMark ? o.oppMark(g.oppProviderId) : null, g.oppName, g.oppAbbr, "plain") : "";
    return '<li><a class="sched-row' + (o.full ? " full" : "") + (hero ? " is-hero" : "") + '" href="' +
             (hero ? "#game" : "#schedule/" + esc(g.id)) + '">' +
           '<span class="sr-only">' + esc(spoken(g)) + (hero ? " Opens Game." : "") + "</span>" +
           '<span class="sched-vis" aria-hidden="true">' +
             '<span class="sched-date"><span class="m">' + esc(d.toLocaleDateString([], { month: "short" })) + '</span><span class="d">' +
               esc(String(d.getDate())) + "</span></span>" +
             (o.full ? siteTag(g) + mark : "") +
             '<span class="sched-main">' + (o.full ? "" : siteTag(g)) +
               '<span class="sched-opp">' + esc(oppLabel(g)) + "</span>" +
               (meta ? '<span class="sched-meta">' + esc(meta) + "</span>" : "") +
               (g.series ? '<span class="sched-series">' + esc(g.series) + "</span>" : "") +
             "</span>" +
             '<span class="sched-side">' + side(g, o.full) + "</span>" + CHEVRON +
           "</span></a></li>";
  }

  function strip(view) {
    return '<nav class="game-tabs view-tabs" aria-label="Schedule views">' +
      [["schedule", "Schedule", "#schedule"], ["results", "Results", "#schedule/results"]].map(function (v) {
        return '<a href="' + v[2] + '"' + (v[0] === view ? ' aria-current="page"' : "") + ">" + v[1] + "</a>";
      }).join("") + "</nav>";
  }

  function quiet(text) { return '<p class="sec-quiet">' + esc(text) + "</p>"; }

  function list(m) {
    if (m.season == null) return quiet(m.failed ? "The schedule didn’t load. Check your connection; it fills in when the connection returns."
                                                : "Loading the schedule…");
    if (!m.season.length) return quiet("No games on the schedule yet.");
    var year = new Date(m.season[0].date).getFullYear();
    var results = m.view === "results";
    var games = results ? m.results || [] : m.season;
    var title = results ? year + " Results" : year + " Season";
    var head = '<div class="sc-head"><h2 class="sc-title" id="scHead">' + esc(title) + "</h2>" +
               (results && m.record ? '<p class="sc-record"><span class="sr-only">Record </span>' + esc(m.record) + "</p>" : "") + "</div>";
    if (!games.length) return '<section class="card sc-card">' + head + quiet("No completed games yet.") + "</section>";
    return '<section class="card sc-card">' + head +
           '<ul class="sched-list" aria-labelledby="scHead">' +
           games.map(function (g) { return row(g, { heroId: m.heroId, full: true, oppMark: m.oppMark }); }).join("") +
           "</ul></section>";
  }

  function paint(host, m) {
    if (!host) return;
    if (!host.querySelector("[data-sc]")) {
      host.innerHTML = '<div data-sc="fresh" role="status"></div><div data-sc="strip"></div><div data-sc="body" class="sc-body"></div>';
      last = {};
    }
    var html = { fresh: ui.freshBanner(m.fresh), strip: strip(m.view), body: list(m) };
    ["fresh", "strip", "body"].forEach(function (k) {
      if (last[k] === html[k]) return;
      host.querySelector('[data-sc="' + k + '"]').innerHTML = html[k];
      last[k] = html[k];
    });
  }

  return { paint: paint, row: row };
})();
