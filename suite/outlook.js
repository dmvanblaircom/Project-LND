/* Suite - Season Outlook's full field (W18; backlog C7, David 2026-10-07:
   "wire up View full field").

     #outlook          Playoff: every team the playoff market prices
     #outlook/title    National Title: every team the title market prices

   Home's Season Outlook shows the team's own two numbers; this is the whole
   market behind each, most likely first, the team's own row marked and
   repeated above the list so it is never lost below the fold. A secondary
   destination owned by Home, reached from Season Outlook's "View Full
   Field". Information only: nothing here places, links to, or prices a bet
   (decision 0025).

   This file only draws: app.js fetches, TeamOS.markets.field() decides which
   teams are priced and at what; nothing here reads a provider payload or
   names a team.

     Suite.outlook.paint(host, {
       team: { name },
       view: "playoff" | "title",
       field: Field | null,          TeamOS.markets.field() for this view
       covered: bool,                the team has Kalshi markets at all
       loading: bool, failed: bool, offline: bool,
       asOf: ISO | null, stale: bool })                              */

var Suite = Suite || {};

Suite.outlook = (function () {
  "use strict";

  var ui = Suite.ui, esc = ui.esc;
  var last = "";

  var VIEWS = [
    { id: "playoff", label: "Playoff",        href: "#outlook",
      what: "make the College Football Playoff" },
    { id: "title",   label: "National Title", href: "#outlook/title",
      what: "win the national championship" }
  ];
  function viewOf(id) { return VIEWS.filter(function (v) { return v.id === id; })[0] || VIEWS[0]; }

  function strip(view) {
    return '<nav class="game-tabs view-tabs" aria-label="Season Outlook views">' +
      VIEWS.map(function (v) {
        return '<a href="' + v.href + '"' + (v.id === view ? ' aria-current="page"' : "") + ">" + v.label + "</a>";
      }).join("") + "</nav>";
  }

  // A price under one percent is "<1", never a rounded "0": the market
  // still gives the team a chance.
  function pct(v) { return v < 1 ? "<1" : String(Math.round(v)); }

  // A move that rounds to nothing is not shown, the same rule as Home.
  function chg(c) {
    var step = c == null ? 0 : Math.round(Math.abs(c));
    if (step < 1) return "";
    return '<span class="out-chg ' + (c > 0 ? "up" : "down") + '"><span aria-hidden="true">' + (c > 0 ? "▲" : "▼") +
           "</span>" + step + '<span class="sr-only"> points ' + (c > 0 ? "up" : "down") + "</span></span>";
  }

  function rowHtml(r, i) {
    return '<li class="of-row' + (r.mine ? " mine" : "") + '"' + (r.mine ? ' aria-current="true"' : "") + ">" +
             '<span class="of-rank" aria-hidden="true">' + (i + 1) + "</span>" +
             '<span class="of-team">' + esc(r.team) + "</span>" +
             '<span class="of-num"><span class="of-val">' + pct(r.value) + '<span class="pct">%</span></span>' + chg(r.change) + "</span>" +
             '<span class="of-bar" aria-hidden="true"><span style="width:' + Math.max(0, Math.min(100, r.value)) + '%"></span></span>' +
           "</li>";
  }

  function asOfLine(m) {
    if (!m.asOf) return "";
    var t = new Date(m.asOf);
    if (isNaN(t)) return "";
    return (m.stale ? "Saved prices, as of " : "As of ") +
      t.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) + ". ";
  }

  function boardHtml(m, v) {
    var f = m.field, rows = f.rows;
    var at = -1;
    rows.forEach(function (r, i) { if (r.mine && at < 0) at = i; });
    var mine = at >= 0 ? rows[at] : null;
    return '<p class="ss-season">The chance the market gives each team to ' + esc(v.what) + ".</p>" +
      (mine
        ? '<p class="of-you">' + esc(m.team.name) + ": <strong>" + pct(mine.value) + "%</strong>, " +
          ordinal(at + 1) + " of " + rows.length + "</p>"
        : '<p class="of-you">' + esc(m.team.name) + " isn’t priced in this market.</p>") +
      '<section class="card of-card" aria-labelledby="of-head"><h2 class="sr-only" id="of-head">' + esc(v.label) + " field</h2>" +
        '<ol class="of-list">' + rows.map(rowHtml).join("") + "</ol></section>" +
      '<p class="ss-note">' + esc(asOfLine(m)) + "Market-implied odds. Information only. Powered by Kalshi</p>";
  }

  function ordinal(n) {
    var s = ["th", "st", "nd", "rd"], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  function paint(host, m) {
    if (!host) return;
    var v = viewOf(m.view);
    var body;
    if (!m.covered) {
      body = '<p class="sec-quiet">No prediction market covers ' + esc(m.team.name) + ".</p>";
    } else if (m.field) {
      body = boardHtml(m, v);
    } else if (m.failed) {
      body = '<p class="sec-quiet">' + (m.offline ? "You're offline. The field loads when the connection returns."
                                                  : "The market didn't load. Pull down to try again.") + "</p>";
    } else if (m.loading) {
      body = '<p class="sec-quiet">Loading the field…</p>';
    } else {
      body = '<p class="sec-quiet">No open ' + esc(v.label) + " market right now.</p>";
    }
    var html = strip(v.id) + body;
    if (html === last && host.innerHTML) return;     // a background refresh never resets the scroll
    last = html;
    host.innerHTML = html;
  }

  return { paint: paint, VIEWS: VIEWS };
})();
