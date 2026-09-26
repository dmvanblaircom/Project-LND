/* Suite - Top 25, national college football inside the fan's Suite
   (reference 07; decisions 0024 §5, §6, 0025).

   Two peer views, both routes:
     #top25                       Games: this week's games with a ranked side
     #top25/rankings[/<poll>]     Rankings: CFP | AP | Coaches, all 25 rows

   The header - the SUITE bar with the selected team as quiet context, and
   the "Top 25" heading - is suite/nav.js's. This file draws the view strip
   and the view.

   This file only draws. app.js hands over normalized TeamOS data; nothing
   here fetches, reads a provider payload or names a team.

     Suite.top25.paint(host, model)
       model.view      "games" | "rankings"
       model.poll      the poll asked for by the route ("ap", "cfp", ...) or null
       model.polls     Poll[] | null (still loading)
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
             '<span class="tg-name">' + (s.rank ? '<span class="tg-rank">' + s.rank + "</span>" : "") + esc(s.name) +
               (s.record ? '<span class="tg-rec">' + esc(s.record) + "</span>" : "") + "</span>" +
             (scored ? '<span class="tg-score">' + esc(s.score == null ? "0" : s.score) + "</span>" : "") +
           "</span>";
  }

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
                 (lastPlay(g) ? '<span class="tg-last">' + (lastAt(g) ? '<span class="tg-at">' + esc(lastAt(g)) + "</span> " : "") + esc(lastPlay(g)) + "</span>" : "") +
               "</span>" +
               '<span class="sr-only">' + esc(summary(g)) + "</span>";
    // Only the game #game would open is a way in; the rest are information.
    var open = g.mine && m.heroId && g.id === m.heroId;
    return '<li class="tg' + (g.mine ? " mine" : "") + (g.state === "in" ? " is-live" : "") + '" data-ev="' + esc(g.id) + '">' +
             (open ? '<a class="tg-row" href="#game">' + body + '<span class="sr-only"> Open Game.</span>' + CHEVRON + "</a>"
                   : '<div class="tg-row">' + body + "</div>") +
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

  // The poll on screen: the route's, else CFP once it is published, else AP
  // (README: AP leads until the committee releases the CFP rankings).
  function chosen(m) {
    var have = {}; (m.polls || []).forEach(function (p) { have[pollKey(p)] = p; });
    var want = String(m.poll || "").toLowerCase();
    if (POLLS.some(function (x) { return x.key === want; })) return { key: want, poll: have[want] || null };
    var key = have.cfp ? "cfp" : have.ap ? "ap" : (m.polls && m.polls[0] ? pollKey(m.polls[0]) : "ap");
    return { key: key, poll: have[key] || null };
  }

  function pollSeg(key) {
    return '<nav class="seg-light poll-seg" aria-label="Poll">' + POLLS.map(function (x) {
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
    if (m.polls == null) return pollSeg(chosen(m).key) + quiet(m.pollsFailed ? "The rankings didn’t load. They appear when the connection returns."
                                                                             : "Loading the rankings…");
    var c = chosen(m), hasCfp = (m.polls || []).some(function (p) { return pollKey(p) === "cfp"; });
    // Until the committee publishes: one compact notice, directly under the
    // poll selector, on every poll - and it is all the CFP view has. No date
    // is promised that the feed does not give. Once CFP rankings exist the
    // notice is gone and CFP leads.
    var note = hasCfp ? "" : '<p class="rk-note" role="note">CFP rankings will appear once the committee releases them.</p>';
    var body = c.poll ? pollTable(m, c.poll) : c.key === "cfp" ? "" : quiet("This poll is not available right now.");
    return pollSeg(c.key) + note + body;
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
      host.querySelector('[data-t25="' + k + '"]').innerHTML = html[k];
      last[k] = html[k];
    });
  }

  return { paint: paint, chosenPoll: function (m) { return chosen(m).key; } };
})();
