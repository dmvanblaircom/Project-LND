/* Suite - Home, the team's command center (Phase 2 spec §5; brief of
   2026-11-19; decisions 0022, 0023, 0024, 0043).

   Order, stable whatever the season (spec §5.1): the hero; the team's
   identity and context (defending champions, a program milestone); the
   quick actions (Matchup, Availability); the team's updates - The Wire, then
   Latest News, never the same story twice; the schedule (the last result and
   the next three, the next one first in emphasis); one compact line of
   context (Season Outlook, opening Around). Once the season is complete
   (S4/S5) News, Recruiting and the NFL Draft follow the hero. On a desktop,
   a supporting column: Season Context and Conference Standing.

   This file only draws. Every decision it shows was made in TeamOS - which
   game is the hero and why, what state it is in, which schedule rows, which
   Season Outlook metrics, which stories are wire items, whether the screen
   is fresh - and app.js hands the results over as a model. Nothing here
   fetches, reads a provider payload, or names a team.

     Suite.home.paint(host, model)
       model.team      { name, nick, abbr, markUrl, timeZone }
       model.now       the time the screen is drawn for
       model.art       { zone, atmosphere }
       model.hero      { game, reason, weather }   game is a normalized Game
       model.news      NewsItem[] | null (still loading); wire items removed
       model.wire      TeamOS.wire items, newest first, or []
       model.actions   { matchup: href, availability: { href, external } }
       model.schedule  Game[] (the preview), heroId, nextId
       model.outlook   TeamOS.outlook.metrics() output
       model.season    { record, rank, rankLabel, metrics } - Season Context
       model.standing  { conference, rows } - Conference Standing
       model.milestone TeamOS.milestones.wins() output, or null
       model.champion  TeamOS.champions.defending() output, or null
       model.fresh     TeamOS.freshness.summary() output
       model.offseason Optional Suite.offseason model from the controller
       model.recruits, model.draft  TeamOS.prospects output in S4/S5

   Each section is redrawn only when its markup changed, so a 30-second live
   refresh never throws away the fan's focus or scroll inside a section that
   did not change. The hero is the stage (suite/scoreboard.js). */

var Suite = Suite || {};

Suite.home = (function () {
  "use strict";

  var ui = Suite.ui, esc = ui.esc;
  var last = {};

  var CHEVRON = '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m9 6 6 6-6 6"/></svg>';
  var EXTERNAL = '<svg class="ext" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M14 5h5v5M19 5l-8 8M17 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h4"/></svg>';

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

  // Presentation only: keep ties and incomplete finals balanced. The score
  // itself supplies the winner cue, including an active-team loss.
  function scoreTone(g, us) {
    if (!g || g.status !== "final" || !TeamOS.game.scored(g)) return "";
    var a = Number(g.us), b = Number(g.them);
    if (!isFinite(a) || !isFinite(b) || a < 0 || b < 0 || a === b) return "";
    return (us ? a > b : b > a) ? " is-winner" : " is-loser";
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

  function made(ms, g) { return !!(ms && ms.phase === "reached" && ms.game && g && String(ms.game.id) === String(g.id)); }

  function heroHtml(m) {
    var team = m.team, h = m.hero || {}, g = h.game, st = cardState(g, h.reason);
    var zone = m.art && m.art.zone;
    // The season's own composition (S2/S4) stands on the same stadium, so
    // the end of a season looks like Suite, not like a different app.
    var seasonHero = Suite.offseason && Suite.offseason.hero(m.offseason);
    var body = seasonHero || (!g && h.reason === "none"
      ? '<p class="stage-empty">No games on the schedule yet</p>' : "");
    // season-over with nothing to show: TeamOS chooses no hero game, and the
    // stage carries the program's identity alone - an INTERIM rendering until
    // Product defines the end-of-season design. Do not build on it.
    var label = st === "upcoming" || st === "delayed" || st === "postponed" ? "Game Details" : "View Game";
    var stage = Suite.scoreboard.stage({
      team: team, game: seasonHero ? null : g, oppMark: m.oppMark, now: m.now || new Date(), weather: h.weather,
      // the final that made a program milestone says so, for as long as the
      // milestone card holds it
      line: st === "final" && made(m.milestone, g) ? hundredth(m.milestone, team) : null
    }, { variant: "home", zone: zone, body: body,
         cta: g && !seasonHero && st !== "canceled" && st !== "none" ? { href: "#game", label: label } : null });
    return '<section class="home-hero' + (seasonHero ? " is-season" : "") + '" aria-label="' + esc(team.name) + '">' + stage + "</section>";
  }

  // ---- news ----------------------------------------------------------------

  function newsHtml(items, team) {
    var head = '<div class="sec-head"><h2 class="sec-title" id="newsHead">Latest News</h2>' +
               '<a class="sec-link" href="#news">View All' + CHEVRON + "</a></div>";
    if (items == null) return head + '<p class="sec-quiet">Loading the latest stories…</p>';
    if (!items.length) return head + '<p class="sec-quiet">No stories right now.</p>';
    var now = Date.now();
    return head + '<ul class="news-row" aria-labelledby="newsHead">' + items.slice(0, 3).map(function (a) {
      // Prefer the article photo, then its publisher's logo; the source-name
      // tile is the last fallback when neither image can load.
      var img = ui.newsImage(a, "news", team.name);
      return '<li><a class="news-card card" href="' + esc(a.link) + '" target="_blank" rel="noopener noreferrer">' + img +
             '<span class="news-body"><span class="news-hl">' + esc(a.title) + "</span>" +
             '<span class="news-meta">' + esc([ui.ago(a.publishedAt, now), a.source].filter(Boolean).join(" · ")) +
             EXTERNAL + '<span class="sr-only"> (opens the original story in a new tab)</span></span></span></a></li>';
    }).join("") + "</ul>";
  }

  // ---- schedule ------------------------------------------------------------

  function scheduleHtml(rows, heroId, nextId) {
    var head = '<div class="sec-head"><h2 class="sec-title" id="schedHead">Schedule</h2>' +
               '<a class="sec-link" href="#schedule">View Full Schedule' + CHEVRON + "</a></div>";
    if (!rows || !rows.length) return head + '<p class="sec-quiet">No games on the schedule yet.</p>';
    // The same row the Schedule screen draws (suite/schedule.js), compact.
    return head + '<ul class="sched-list card" aria-labelledby="schedHead">' + rows.map(function (g) {
      return Suite.schedule.row(g, { heroId: heroId, nextId: nextId });
    }).join("") + "</ul>";
  }

  // ---- Season Outlook -------------------------------------------------------
  // One line, opening Around (David, 2026-11-05: Season Outlook answers
  // "where do we stand", Around's question; the card and its full field
  // live there now).

  // Home's one line: the same two numbers, opening Around, where the card is.
  function outlookLine(metrics) {
    if (!metrics || !metrics.length) return "";
    // "Title" on the line, where "National Title" would wrap a phone's width;
    // the card in Around says it in full.
    var parts = metrics.map(function (x) {
      return '<span class="out-line-n">' + esc(x.key === "title" ? "Title" : x.label) + " " + Math.round(x.value) + "%</span>";
    });
    return '<a class="card out-line" href="#top25">' +
             '<span class="out-line-t">Season Outlook</span>' +
             '<span class="out-line-v">' + parts.join("") + "</span>" +
             '<span class="sr-only">. Projected odds from ESPN FPI. Open Around.</span>' + CHEVRON + "</a>";
  }

  function outlookHtml(metrics) { return outlookLine(metrics); }

  // ---- a program milestone (David, 2026-10-07: the 1,000th win) -------------
  // Only while one is near (TeamOS.milestones): the count, how many to go and
  // the game that could make it, then for a week the game that did.

  var WORDS = ["", "One", "Two", "Three"];
  function n(v) { return Number(v).toLocaleString("en-US"); }
  // "Notre Dame's 1,000th win": said the same way on the card, the
  // scoreboard and the final alert (David, 2026-10-25)
  function hundredth(ms, team) { return team.name + "\u2019s " + n(ms.target) + "th win"; }
  function where(g) { return (g.home || g.neutral ? "vs " : "at ") + ui.oppLabel(g); }

  function milestoneHtml(ms, team) {
    if (!ms) return "";
    var g = ms.game, reached = ms.phase === "reached";
    var title = reached ? n(ms.target) + " Wins" : "Road to " + n(ms.target);
    var line;
    if (reached) {
      line = esc(hundredth(ms, team)) +
             (g ? ": " + esc((g.us != null ? g.us + "-" + g.them + " " : "") + where(g)) + ", " + esc(ui.kickoff(g.date, g.timeSet).day) : "") + ".";
    } else if (ms.toGo === 1) {
      // under way as TeamOS says: a delay before kickoff is still upcoming
      var live = TeamOS.game.underWay(g);
      line = "Win No. " + n(ms.target) + " is on the line" +
             (g ? (live ? " now, " : ": ") + esc(where(g)) + (live ? "" : ", " + esc(ui.kickoff(g.date, g.timeSet).day)) : "") + ".";
    } else {
      line = (WORDS[ms.toGo] || ms.toGo) + " from " + n(ms.target) + "." +
             (g ? ' <span class="ms-next">Next: ' + esc(where(g)) + ", " + esc(ui.kickoff(g.date, g.timeSet).day) + "</span>" : "");
    }
    return '<div class="sec-head"><h2 class="sec-title" id="msHead">' + esc(title) + "</h2></div>" +
      '<div class="card ms" role="group" aria-labelledby="msHead">' +
        '<p class="ms-count"><span class="ms-n">' + n(ms.wins) + '</span><span class="ms-l">all-time wins</span></p>' +
        '<p class="ms-line">' + line + "</p>" +
        // the program's own count, entering the season, plus its results since
        '<p class="ms-src">All-time record ' + esc(n(ms.wins) + "-" + n(ms.losses) + "-" + n(ms.ties)) +
          // whose count it is, never "official": the NCAA's can differ
          // (vacated wins; David, 2026-10-26)
          (ms.source ? " \u00b7 per " + esc(ms.source) : "") + "</p>" +
      "</div>";
  }

  // The final alert's line for the game that can make a milestone, or made
  // it (the app can see the final before the alert comes): null otherwise.
  function alertLine(ms, team) {
    var one = ms && ms.game && ms.game.id && (ms.phase === "reached" || (ms.phase === "countdown" && ms.toGo === 1));
    return one ? hundredth(ms, team) + "." : null;
  }

  // ---- Defending national champions (David, 2026-10-27) ---------------------
  // A banner across the top of Home for the team that won the last title
  // game, whoever that is (TeamOS.champions). The trophy mark is Game's.

  var TROPHY = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 4h8v5a4 4 0 0 1-8 0V4ZM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4v3h-4z"/></svg>';
  function championHtml(t) {
    if (!t) return "";
    var line = [t.season + " national champions", t.opponent && t.score ? "beat " + t.opponent + " " + t.score.replace("-", "\u2013") : null]
      .filter(Boolean).join(" \u00b7 ");
    return '<div class="champ" role="note" aria-label="Defending national champions. ' + esc(line) + '.">' +
      '<span class="champ-ic">' + TROPHY + "</span>" +
      '<p class="champ-t">Defending National Champions</p>' +
      '<p class="champ-s">' + esc(line) + "</p></div>";
  }

  // ---- Quick Actions (Home review, 2026-11-11) -------------------------------
  // Matchup and Availability: the two core actions. Game Info is gone - the
  // hero is the way into Game. A contextual shortcut joins only when the data
  // behind it exists; none is invented to fill a row.

  var ICON = {
    matchup: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 18h4V9H4zM10 18h4V5h-4zM16 18h4v-6h-4z"/></svg>',
    availability: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 4h6v4h4v6h-4v6H9v-6H5V8h4z"/></svg>'
  };
  function actionsHtml(a) {
    if (!a) return "";
    var items = [];
    if (a.matchup) items.push({ k: "matchup", href: a.matchup, t: "Matchup", s: "How the teams compare" });
    if (a.availability) items.push({ k: "availability", href: a.availability.href, ext: a.availability.external,
                                     t: "Availability", s: a.availability.sub || "Who is in and who is out" });
    if (!items.length) return "";
    return '<nav class="qa" aria-label="Quick actions">' + items.map(function (x) {
      return '<a class="qa-item card qa-' + x.k + '" href="' + esc(x.href) + '"' + (x.ext ? ' target="_blank" rel="noopener noreferrer"' : "") + ">" +
               '<span class="qa-ic">' + ICON[x.k] + '</span><span class="qa-t">' + esc(x.t) + '</span><span class="qa-s">' + esc(x.s) + "</span>" +
               (x.ext ? EXTERNAL + '<span class="sr-only"> (opens in a new tab)</span>' : CHEVRON) + "</a>";
    }).join("") + "</nav>";
  }

  // ---- The Wire (decision 0043; measured 92.1%, 2026-11-19) --------------------
  // Status changes - injuries, availability, coaching, commitments - kept
  // apart from Latest News, and never the same story in both. Each item is
  // the outlet's headline as it came, with the kind beside it. Omitted when
  // there is none.

  var KIND = { drafted: "Drafted", suspension: "Suspension", coaching: "Coaching", transfer: "Transfer",
               commitment: "Commitment", availability: "Availability", injury: "Injury" };
  function wireHtml(items) {
    if (!items || !items.length) return "";
    var now = Date.now();
    return '<div class="sec-head"><h2 class="sec-title" id="wireHead">The Wire</h2></div>' +
      '<ul class="wire card" aria-labelledby="wireHead">' + items.map(function (w) {
        var a = w.story;
        return '<li><a class="wire-row" href="' + esc(a.link) + '" target="_blank" rel="noopener noreferrer">' +
                 '<span class="wire-kind wk-' + esc(w.kind) + '">' + esc(KIND[w.kind] || w.kind) + "</span>" +
                 '<span class="wire-hl">' + esc(a.title) + "</span>" +
                 '<span class="wire-meta">' + esc([ui.ago(a.publishedAt, now), a.source].filter(Boolean).join(" · ")) +
                   EXTERNAL + '<span class="sr-only"> (opens the original story in a new tab)</span></span></a></li>';
      }).join("") + "</ul>";
  }

  // ---- the supporting column (desktop; spec §5.1) ------------------------------
  // Two panels, as approved: Season Context and Conference Standing. Each
  // from data Suite already holds, and absent rather than empty when it has
  // none. On a phone the column is not drawn; Around has both in full.

  function seasonHtml(s) {
    if (!s) return "";
    var rows = [];
    if (s.record) rows.push('<div><dt>Record</dt><dd class="num">' + esc(s.record) + "</dd></div>");
    if (s.rank) rows.push('<div><dt>' + esc(s.rankLabel || "Rank") + '</dt><dd class="num">#' + esc(s.rank) + "</dd></div>");
    (s.metrics || []).forEach(function (x) {
      rows.push("<div><dt>" + esc(x.key === "title" ? "National title" : x.label) + '</dt><dd class="num">' + Math.round(x.value) + "%</dd></div>");
    });
    if (!rows.length) return "";
    return '<section class="side-panel card" aria-labelledby="sideSeason"><h2 class="side-title" id="sideSeason">Season Context</h2>' +
             '<dl class="side-dl">' + rows.join("") + "</dl>" +
             (s.metrics && s.metrics.length ? '<p class="side-note">Projected odds from ESPN FPI. Not betting advice.</p>' : "") +
             '<a class="side-link" href="#top25">Open Around' + CHEVRON + "</a></section>";
  }

  function standingHtml(t) {
    if (!t || !t.rows || !t.rows.length) return "";
    return '<section class="side-panel card" aria-labelledby="sideConf"><h2 class="side-title" id="sideConf">Conference Standing</h2>' +
             '<p class="side-sub">' + esc(t.conference) + "</p>" +
             '<table class="side-table"><thead><tr><th scope="col"><span class="sr-only">Place</span></th><th scope="col">Team</th><th scope="col" class="num">Conf</th></tr></thead><tbody>' +
             t.rows.map(function (r) {
               return '<tr' + (r.us ? ' class="is-us"' : "") + (r.gap ? ' data-gap' : "") + '><td class="num">' + esc(r.place) + "</td><td>" + esc(r.name) +
                      (r.division ? '<span class="side-div">' + esc(r.division) + "</span>" : "") + '</td><td class="num">' + esc(r.wins + "-" + r.losses) + "</td></tr>";
             }).join("") + "</tbody></table>" +
             '<a class="side-link" href="#top25">Around: our conference' + CHEVRON + "</a></section>";
  }

  function sideHtml(m) {
    var html = seasonHtml(m.season) + standingHtml(m.standing);
    return html;
  }

  // ---- mount -----------------------------------------------------------------

  // Recruiting and the draft are drawn only in S4/S5; in season their
  // wrappers stay last and hidden.
  // The approved order (spec §5.1, Home review 2026-11-11): the hero; the
  // team's identity and context; the quick actions; the team's updates, the
  // wire then the news; the schedule; one compact line of context. Stable:
  // the content changes with the season, the order does not move. The
  // supporting column (desktop) comes last in reading order.
  var SECTIONS = ["fresh", "hero", "champion", "milestone", "actions", "wire", "news", "schedule", "outlook", "recruiting", "draft", "side"];
  var OFFSEASON_SECTIONS = ["fresh", "hero", "champion", "news", "recruiting", "draft", "milestone", "actions", "wire", "schedule", "outlook", "side"];

  function paint(host, m) {
    if (!host) return;
    if (!host.querySelector("[data-home]")) {
      host.innerHTML = SECTIONS.map(function (k) {
        return k === "hero" || k === "fresh"
          ? '<div data-home="' + k + '"' + (k === "fresh" ? ' role="status"' : "") + "></div>"
          : k === "side" ? '<aside class="home-side" data-home="side" aria-label="Season and conference"></aside>'
          : '<section class="home-sec home-' + k + '" data-home="' + k + '"></section>';
      }).join("");
      last = {};
      host._suiteHomeOrder = SECTIONS.join("|");
    }
    // S4/S5 put News directly below the hero. Move the existing wrappers,
    // keeping story images, horizontal scroll and unchanged focused links.
    var phase = m.offseason && m.offseason.phase;
    var order = phase && phase.state === "complete" ? OFFSEASON_SECTIONS : SECTIONS;
    if (host._suiteHomeOrder !== order.join("|")) order.forEach(function (k, i) {
      var el = host.querySelector('[data-home="' + k + '"]');
      if (host.children[i] !== el) {
        var active = document.activeElement, focused = el.contains(active);
        host.insertBefore(el, host.children[i] || null);
        if (focused) active.focus({ preventScroll: true });
      }
    });
    host._suiteHomeOrder = order.join("|");
    var html = {
      fresh: ui.freshBanner(m.fresh),
      champion: championHtml(m.champion),
      hero: heroHtml(m),
      milestone: milestoneHtml(m.milestone, m.team),
      actions: actionsHtml(m.actions),
      wire: wireHtml(m.wire),
      news: newsHtml(m.news, m.team),
      schedule: scheduleHtml(m.schedule, m.heroId, m.nextId),
      outlook: outlookHtml(m.outlook),
      recruiting: Suite.prospects.recruiting(m.recruits, "home"),
      draft: Suite.prospects.draft(m.draft, "home"),
      side: sideHtml(m)
    };
    SECTIONS.forEach(function (k) {
      if (last[k] === html[k]) return;
      var el = host.querySelector('[data-home="' + k + '"]');
      ui.fill(el, html[k]);
      el.hidden = !html[k];
      last[k] = html[k];
      if (k === "hero") Suite.scoreboard.fit(host);
    });
  }

  return { paint: paint, cardState: cardState, newDate: newDate, scoreTone: scoreTone, alertLine: alertLine };
})();
