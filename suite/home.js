/* Suite - Home, the canonical dashboard (references 02, 05, 06; decisions
   0022, 0023, 0024).

   Order: Hero, Latest News, Schedule, Season Outlook. No Current Game card.

   This file only draws. Every decision it shows was made in TeamOS - which
   game is the hero and why, what state it is in, which three schedule rows,
   which Season Outlook metrics, whether the screen is fresh - and app.js
   hands the results over as a model. Nothing here fetches, reads a provider
   payload, or names a team.

     Suite.home.paint(host, model)
       model.team      { name, nick, tagline, abbr, markUrl, oppMark(id) }
       model.art       { photo?, name, abbr, markUrl, atmosphere }
       model.hero      { game, reason, weather }   game is a normalized Game
       model.news      NewsItem[] | null (still loading)
       model.schedule  Game[] (the preview) and heroId
       model.outlook   TeamOS.outlook.metrics() output
       model.fresh     TeamOS.freshness.summary() output

   Each section is redrawn only when its markup changed, so a 30-second live
   refresh never throws away the fan's focus or scroll inside a section that
   did not change.

   The hero follows an explicit hierarchy (0024 §2): matchup, state, score
   and date/time are primary and always kept; period, clock, possession,
   down-and-distance and the CTA are secondary; weather and the betting
   line are tertiary and are the first to go on a small phone. */

var Suite = Suite || {};

Suite.home = (function () {
  "use strict";

  var ui = Suite.ui, esc = ui.esc;
  var last = {};

  var CHEVRON = '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m9 6 6 6-6 6"/></svg>';
  var EXTERNAL = '<svg class="ext" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M14 5h5v5M19 5l-8 8M17 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h4"/></svg>';
  var BALL = '<svg class="gc-ball" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><ellipse cx="12" cy="12" rx="9.5" ry="5.6" transform="rotate(-35 12 12)"/><path d="m9.2 14.8 5.6-5.6M10.6 11.4l2 2M12 10l2 2"/></svg>';

  function ordinal(p) {
    return p === 1 ? "1st" : p === 2 ? "2nd" : p === 3 ? "3rd" : p === 4 ? "4th" : p > 4 ? (p === 5 ? "OT" : (p - 4) + "OT") : "";
  }
  function whereWord(g) { return g.home || g.neutral ? "vs" : "at"; }
  function oppLabel(g) { return (g.oppRank ? "#" + g.oppRank + " " : "") + g.oppName; }

  // ---- the hero ------------------------------------------------------------

  // What the card is showing, as one word the CSS and the copy agree on.
  function cardState(g, reason) {
    if (!g) return "none";
    if (g.status === "live") return "live";
    if ((g.status === "delayed" || g.status === "suspended") && g.hasStarted) return "paused";
    if (g.status === "final") return "final";
    if (g.status === "postponed") return "postponed";
    if (g.status === "canceled") return "canceled";
    if (g.status === "delayed") return "delayed";
    return "upcoming";
  }

  var LABEL = { upcoming: "Next Game", final: "Final" };
  // The exceptional states say exactly what the source says (0022 #5): a
  // delay is DELAYED and a suspension SUSPENDED, never one for the other.
  var PILL = { delayed: "Delayed", postponed: "Postponed", canceled: "Canceled" };

  function side(team, g, us, st, m) {
    var name = us ? team.name : g.oppName;
    var rank = us ? g.usRank : g.oppRank;
    var record = us ? g.usRecord : g.oppRecord;
    var score = us ? g.us : g.them;
    var mark = us ? ui.mark(team.markUrl, team.name, team.abbr, "bare")
                  : ui.mark(m.oppMark(g.oppProviderId), g.oppName, g.oppAbbr, "bare");
    var showScore = st === "live" || st === "paused" || st === "final";
    var ball = (st === "live" || st === "paused") && g.situation && g.situation.possession === (us ? "us" : "them");
    return '<div class="gc-side ' + (us ? "us" : "them") + '">' +
             '<div class="gc-line">' + mark +
               (showScore ? '<span class="gc-score">' + esc(score == null ? "0" : score) + "</span>" : "") +
               (ball ? BALL : "") +
             "</div>" +
             '<p class="gc-name">' + (rank ? '<span class="gc-rank">#' + rank + "</span> " : "") + esc(name) + "</p>" +
             (record ? '<p class="gc-record">' + esc(record) + "</p>" : "") +
           "</div>";
  }

  function middle(g, st) {
    if (st === "live") {
      var per = /half/i.test(g.detail || "") ? "Half" : ordinal(g.period);
      return '<div class="gc-mid"><span class="gc-period">' + esc(per) + "</span>" +
             (g.clock && per !== "Half" ? '<span class="gc-clock">' + esc(g.clock) + "</span>" : "") + "</div>";
    }
    if (st === "paused") {
      // The pill above already says DELAYED or SUSPENDED; the middle keeps
      // where the game stopped.
      return '<div class="gc-mid is-held"><span class="gc-period">' + esc(ordinal(g.period)) + "</span>" +
             (g.clock ? '<span class="gc-clock">' + esc(g.clock) + "</span>" : "") + "</div>";
    }
    if (st === "final") {
      // Team-neutral (review of 2026-09-24): the state is FINAL, said once
      // above the scores; no per-team victory phrase, no Win/Loss word.
      return '<div class="gc-mid"><span class="gc-rule" aria-hidden="true"></span></div>';
    }
    return '<div class="gc-mid"><span class="gc-vs">' + whereWord(g) + "</span></div>";
  }

  // One sentence a screen reader reads instead of the visual scoreboard.
  function summary(team, g, st) {
    var opp = oppLabel(g), w = g.home || g.neutral ? "versus " : "at ";
    var ko = ui.kickoff(g.date, g.timeSet);
    if (st === "live" || st === "paused" || st === "final") {
      var line = team.name + " " + (g.us || 0) + ", " + opp + " " + (g.them || 0) + ".";
      if (st === "final") return "Final. " + line;
      if (st === "paused") return (g.status === "suspended" ? "Suspended" : "Delayed") + ", " + ordinal(g.period) + " quarter. " + line;
      return "Live, " + (ordinal(g.period) ? ordinal(g.period) + " quarter" : "") + (g.clock ? ", " + g.clock : "") + ". " + line +
        (g.situation && g.situation.short ? " " + g.situation.short + (g.situation.spot ? " at " + g.situation.spot : "") + "." : "");
    }
    if (st === "postponed") return "Postponed. " + team.name + " " + w + opp + ". " + newDate(g) + ".";
    var head = st === "canceled" ? "Canceled. " : st === "delayed" ? "Delayed. " : "Next game: ";
    return head + team.name + " " + w + opp + ", " + ko.day + (st === "upcoming" ? ", " + ko.time : "") + (g.net ? ", on " + g.net : "") + ".";
  }

  // A postponed game's replacement date (decision 0022 #5), only when the
  // normalized game carries a trustworthy one: date and time, or the date
  // with the time to be determined. Never a countdown.
  function newDate(g) {
    var n = g.newDate;
    if (!n || !n.date) return "New date to be announced";
    var d = new Date(n.date);
    if (isNaN(d)) return "New date to be announced";
    var day = d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
    return "New date: " + day + " \u00B7 " + (n.timeSet === false ? "Time TBD"
      : d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZoneName: "short" }));
  }

  function tertiary(g, st, weather) {
    var bits = [];
    if (weather && (st === "upcoming" || st === "delayed" || st === "live" || st === "paused")) {
      bits.push('<span class="gc-wx">' + esc(weather.tempF + "°F") + (weather.sky ? " " + esc(weather.sky) : "") + "</span>");
    }
    // Odds are compact secondary metadata, the values alone - "ND -29.5 ·
    // O/U 52.5" - the way a sports-media product shows them (decision 0025).
    // No "line" labels and never "live": nothing here says what the source
    // does not.
    if (g.odds && (g.odds.line || g.odds.total != null) && st !== "final" && st !== "canceled") {
      bits.push('<span class="gc-odds">' +
        esc([g.odds.line, g.odds.total != null ? "O/U " + g.odds.total : ""].filter(Boolean).join(" · ")) + "</span>");
    }
    return bits.length ? '<p class="gc-extra">' + bits.join('<span class="dot" aria-hidden="true"> · </span>') + "</p>" : "";
  }

  function cta(st) {
    if (st === "canceled" || st === "none") return "";
    var text = st === "final" ? "Game Recap" : st === "live" || st === "paused" ? "View Game" : "Game Details";
    return '<a class="btn btn-primary gc-cta" href="#game">' + text + CHEVRON + "</a>";
  }

  function heroHtml(m) {
    var team = m.team, h = m.hero || {}, g = h.game, st = cardState(g, h.reason);
    var ko = g ? ui.kickoff(g.date, g.timeSet) : null;
    var id = '<div class="hh-id">' +
               '<p class="hh-school">' + esc(team.name) + "</p>" +
               (team.nick ? '<p class="hh-nick">' + esc(team.nick) + "</p>" : "") +
               (team.tagline ? '<p class="hh-tagline">' + esc(team.tagline) + "</p>" : "") +
             "</div>";
    var card = "";
    if (g) {
      var top = '<div class="gc-top">';
      if (st === "live") top += '<span class="live-pill">Live</span>';
      else if (st === "paused" || st === "delayed" || st === "postponed" || st === "canceled")
        top += '<span class="state-pill ' + st + '">' + esc(st === "paused" ? (g.status === "suspended" ? "Suspended" : "Delayed") : PILL[st]) + "</span>";
      else top += '<span class="gc-label' + (st === "final" ? " gc-final" : "") + '">' + esc(LABEL[st]) + "</span>";
      if (st === "upcoming") top += '<span class="gc-when">' + esc(ko.full) + "</span>";
      else if (st === "delayed") top += '<span class="gc-when">' + esc(ko.day) + "</span>";
      else if (st === "postponed") top += '<span class="gc-when">' + esc(newDate(g)) + "</span>";
      if (g.net && st !== "final" && st !== "canceled") top += '<span class="gc-net">' + esc(g.net) + "</span>";
      top += "</div>";

      var situation = (st === "live" || st === "paused") && g.situation && g.situation.short
        ? '<p class="gc-situation" aria-hidden="true"><span>' + esc(g.situation.short) + "</span>" +
          (g.situation.spot ? "<span>" + esc(g.situation.spot) + "</span>" : "") + "</p>"
        : "";

      card = '<article class="gamecard gc-' + st + '" aria-labelledby="gcSummary">' +
               '<h2 class="sr-only" id="gcSummary">' + esc(summary(team, g, st)) + "</h2>" +
               '<div aria-hidden="true">' + top +
                 '<div class="gc-matchup">' + side(team, g, true, st, m) + middle(g, st) + side(team, g, false, st, m) + "</div>" +
               "</div>" +
               situation +
               (g.series && st !== "final" ? '<p class="gc-series">' + esc(g.series) + "</p>" : "") +
               tertiary(g, st, h.weather) +
               cta(st) +
             "</article>";
    } else if (h.reason === "none") {
      card = '<article class="gamecard gc-none"><h2 class="gc-label">No games on the schedule yet</h2></article>';
    }
    // season-over: TeamOS chooses no hero game. Drawing no card is an INTERIM
    // safe rendering only - not the end-of-season design, which Product will
    // define. Do not build on it.
    return '<section class="home-hero on-dark' + (m.art.atmosphere ? " art-" + esc(m.art.atmosphere) : "") +
             '" aria-label="' + esc(team.name) + '">' +
             ui.art(m.art) + '<div class="hh-inner">' + id + card + "</div></section>";
  }

  // ---- news ----------------------------------------------------------------

  function newsHtml(items, team) {
    var head = '<div class="sec-head"><h2 class="sec-title" id="newsHead">Latest News</h2>' +
               '<a class="sec-link" href="#more/news">View All' + CHEVRON + "</a></div>";
    if (items == null) return head + '<p class="sec-quiet">Loading the latest stories…</p>';
    if (!items.length) return head + '<p class="sec-quiet">No stories right now.</p>';
    var now = Date.now();
    return head + '<ul class="news-row" aria-labelledby="newsHead">' + items.slice(0, 3).map(function (a) {
      // A story without a photo, or whose photo fails, gets the designed
      // fallback: the outlet's name on the team's colours - never a broken
      // image (suite/ui.js removes an image that fails to load).
      var img = '<span class="news-img' + (a.image ? "" : " none") + '" aria-hidden="true">' +
                  '<span class="news-src">' + esc(a.source || team.name) + "</span>" +
                  (a.image ? '<img src="' + esc(a.image) + '" alt="" loading="lazy" decoding="async" data-fallback>' : "") +
                "</span>";
      return '<li><a class="news-card card" href="' + esc(a.link) + '" target="_blank" rel="noopener noreferrer">' + img +
             '<span class="news-body"><span class="news-hl">' + esc(a.title) + "</span>" +
             '<span class="news-meta">' + esc([ui.ago(a.publishedAt, now), a.source].filter(Boolean).join(" · ")) +
             EXTERNAL + '<span class="sr-only"> (opens the original story in a new tab)</span></span></span></a></li>';
    }).join("") + "</ul>";
  }

  // ---- schedule ------------------------------------------------------------

  function scheduleHtml(rows, heroId) {
    var head = '<div class="sec-head"><h2 class="sec-title" id="schedHead">Schedule</h2>' +
               '<a class="sec-link" href="#schedule">View All' + CHEVRON + "</a></div>";
    if (!rows || !rows.length) return head + '<p class="sec-quiet">No games on the schedule yet.</p>';
    // The same row the Schedule screen draws (suite/schedule.js), compact.
    return head + '<ul class="sched-list card" aria-labelledby="schedHead">' + rows.map(function (g) {
      return Suite.schedule.row(g, { heroId: heroId });
    }).join("") + "</ul>";
  }

  // ---- Season Outlook -------------------------------------------------------

  function outlookHtml(metrics) {
    if (!metrics || !metrics.length) return "";                   // no supported market: no section
    return '<div class="sec-head"><h2 class="sec-title" id="outHead">Season Outlook</h2></div>' +
      '<div class="card outlook" role="group" aria-labelledby="outHead"><div class="out-metrics">' +
      metrics.map(function (x) {
        // A move that rounds to nothing is not shown as "0".
        var step = x.change == null ? 0 : Math.round(Math.abs(x.change));
        var chg = step >= 1
          ? '<span class="out-chg ' + (x.change > 0 ? "up" : "down") + '"><span aria-hidden="true">' + (x.change > 0 ? "▲" : "▼") +
            "</span>" + step + '<span class="sr-only"> points ' + (x.change > 0 ? "up" : "down") + "</span></span>"
          : "";
        return '<div class="out-metric"><span class="out-value">' + Math.round(x.value) + '<span class="pct">%</span></span>' + chg +
               '<span class="out-label">' + esc(x.label) + " probability</span>" +
               '<span class="out-bar" aria-hidden="true"><span style="width:' + Math.max(0, Math.min(100, x.value)) + '%"></span></span>' +
               (x.stale && x.asOf ? '<span class="out-asof">As of ' + esc(new Date(x.asOf).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })) + "</span>" : "") +
               "</div>";
      }).join("") + "</div>" +
      '<p class="out-credit">Market-implied odds. Powered by Kalshi</p></div>';
  }

  // ---- mount -----------------------------------------------------------------

  var SECTIONS = ["fresh", "hero", "news", "schedule", "outlook"];

  function paint(host, m) {
    if (!host) return;
    if (!host.querySelector("[data-home]")) {
      host.innerHTML = SECTIONS.map(function (k) {
        return k === "hero" || k === "fresh"
          ? '<div data-home="' + k + '"' + (k === "fresh" ? ' role="status"' : "") + "></div>"
          : '<section class="home-sec home-' + k + '" data-home="' + k + '"></section>';
      }).join("");
      last = {};
    }
    var html = {
      fresh: ui.freshBanner(m.fresh),
      hero: heroHtml(m),
      news: newsHtml(m.news, m.team),
      schedule: scheduleHtml(m.schedule, m.heroId),
      outlook: outlookHtml(m.outlook)
    };
    SECTIONS.forEach(function (k) {
      if (last[k] === html[k]) return;
      var el = host.querySelector('[data-home="' + k + '"]');
      el.innerHTML = html[k];
      el.hidden = !html[k];
      last[k] = html[k];
    });
  }

  return { paint: paint, cardState: cardState, newDate: newDate };
})();
