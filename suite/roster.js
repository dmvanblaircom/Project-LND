/* Suite - Roster: the team's people (reference 09; decisions 0019, 0024
   §8, §9).

   Under the team masthead, peer views that follow what the team has
   (TeamOS.roster.views): Depth Chart | Roster | Availability for a team with
   an official depth chart and availability report, Roster alone for one
   without. Routes: #roster/depth[/<unit>], #roster/roster[/<unit>],
   #roster/availability.

   Depth Chart: the official chart's title and source, what moved since last
   week, an Offense | Defense | Special Teams control that stays in reach,
   and one card per spot. A spot keeps every level and every OR (0019):
   first, second and third team, and a first-team OR marked as a battle.
   Each person carries the roster's height, weight, hometown and headshot
   where TeamOS could join them; the headshot is the provider's, loaded from
   where it is hosted, with a designed fallback - never a broken image.

   This file only draws. TeamOS joined, named and decided; nothing here
   fetches, reads a provider payload or names a team.

     Suite.roster.paint(host, model)
       model.views     [{ id, label }] from TeamOS.roster.views
       model.view      the current view id
       model.unit      the unit asked for by the route, or null
       model.depth     TeamOS.roster.depth() | null (none / still loading)
       model.hasDepth  the team has a depth chart source
       model.history   TeamOS.roster.history() - newest first | null
       model.roster    roster groups (TeamOS.espn.roster) | null (loading)
       model.avail     TeamOS.roster.availability() | null (loading or none)
       model.query     the roster search, as typed
       model.failed    { depth, roster, avail } - no copy and the network failed
       model.fresh     TeamOS.freshness.summary() output                     */

var Suite = Suite || {};

Suite.roster = (function () {
  "use strict";

  var ui = Suite.ui, esc = ui.esc;
  var last = {};

  var EXTERNAL = '<svg class="ext" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M14 5h5v5M19 5l-8 8M17 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h4"/></svg>';
  var LEVEL = ["", "1st", "2nd", "3rd", "4th"];
  var LEVEL_SAID = ["", "First team", "Second team", "Third team", "Fourth team"];

  function quiet(text) { return '<p class="sec-quiet">' + esc(text) + "</p>"; }
  function fold(s) { return String(s || "").toLowerCase().replace(/[^a-z]/g, ""); }
  function external(url, label) {
    return url ? '<a class="ro-src" href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(label || "Source") + EXTERNAL +
                 '<span class="sr-only"> (opens in a new tab)</span></a>' : esc(label || "");
  }

  function strip(m) {
    if (!m.views || m.views.length < 2) return "";
    var href = { depth: "#roster/depth", roster: "#roster/roster", availability: "#roster/availability" };
    return '<nav class="game-tabs view-tabs" aria-label="Roster views">' + m.views.map(function (v) {
      return '<a href="' + (href[v.id] || "#roster/" + v.id) + '"' + (v.id === m.view ? ' aria-current="page"' : "") + ">" + esc(v.label) + "</a>";
    }).join("") + "</nav>";
  }

  // Offense | Defense | Special Teams, as links: the unit is part of the
  // route, so Back and a shared link keep it.
  var UNIT_ORDER = ["all", "offense", "defense", "specialteams"];
  function unitSeg(view, units, key) {
    // Offense | Defense | Special Teams, in that order (0024 §8), whatever
    // order the source lists them in; anything else follows.
    units = units.slice().sort(function (a, b) {
      var x = UNIT_ORDER.indexOf(a.key), y = UNIT_ORDER.indexOf(b.key);
      return (x < 0 ? 99 : x) - (y < 0 ? 99 : y);
    });
    return '<nav class="seg-light unit-seg" aria-label="Unit">' + units.map(function (u) {
      return '<a href="#roster/' + view + "/" + esc(u.key) + '"' + (u.key === key ? ' aria-current="page"' : "") + ">" + esc(u.label) + "</a>";
    }).join("") + "</nav>";
  }
  function pickUnit(units, want) {
    var keys = units.map(function (u) { return u.key; });
    if (want && keys.indexOf(want) > -1) return want;
    return keys.indexOf("offense") > -1 ? "offense" : keys[0];
  }

  // A person's picture: the provider's headshot over a designed fallback -
  // their initials on the team's colours (the number has its own column). A headshot that fails is
  // removed by suite/ui.js and the fallback shows.
  function photo(p) {
    return '<span class="ro-ph' + (p.photo ? "" : " none") + '" aria-hidden="true"><span class="ro-ph-no">' + esc(ui.initials(p.name)) + "</span>" +
           (p.photo ? '<img src="' + esc(p.photo) + '" alt="" loading="lazy" decoding="async" data-fallback>' : "") + "</span>";
  }
  function town(h) { return h && (h.city || h.state) ? [h.city, h.state].filter(Boolean).join(", ") : ""; }
  function weight(w) { return String(w || "").replace(/\s*lbs?$/i, ""); }
  // Height, weight and class as one line - what a phone shows in place of
  // the three columns.
  function bio(p) {
    var t = [p.height, weight(p.weight) ? weight(p.weight) + " lbs" : "", p.classYear].filter(Boolean).join(" · ");
    return t ? '<span class="ro-bio">' + esc(t) + "</span>" : "";
  }

  // ---- Depth Chart ---------------------------------------------------------

  function spotCard(s) {
    var rows = [];
    s.levels.forEach(function (lv) {
      lv.players.forEach(function (p, i) {
        var said = (LEVEL_SAID[lv.level] || "Level " + lv.level) + (i ? ", or" : "") + ": ";
        rows.push('<li class="ro-row' + (lv.level === 1 ? " first" : "") + '">' +
          '<span class="ro-lvl">' + (i ? '<span class="ro-or">or</span>' : esc(LEVEL[lv.level] || lv.level)) + "</span>" +
          '<span class="ro-no">' + esc(p.no) + "</span>" + photo(p) +
          '<span class="ro-who"><span class="sr-only">' + esc(said) + '</span><span class="ro-name">' + esc(p.name) +
            (p.out ? ' <abbr class="ro-out" title="' + (p.out === "out-season" ? "Out for the season" : "Out for the game") + '">O</abbr>' +
                     '<span class="sr-only"> (' + (p.out === "out-season" ? "out for the season" : "out for the game") + ")</span>" : "") + "</span>" +
            (town(p.hometown) ? '<span class="ro-town">' + esc(town(p.hometown)) + "</span>" : "") + bio(p) + "</span>" +
          '<span class="ro-ht">' + esc(p.height) + '</span><span class="ro-wt">' + esc(weight(p.weight)) + '</span><span class="ro-cl">' + esc(p.classYear) + "</span>" +
          "</li>");
      });
    });
    var kicker = s.name.indexOf(s.label) === 0 ? "" : '<span class="ro-spot-label">' + esc(s.label + (s.repeated ? " " + s.ordinal : "")) + "</span>";
    return '<section class="card ro-card"><div class="ro-card-head"><h3 class="ro-spot">' + esc(s.name) + "</h3>" + kicker +
           (s.open ? '<span class="ro-battle">Battle</span>' : "") + "</div>" +
           '<div class="ro-cols" aria-hidden="true"><span>#</span><span>Player</span><span>Ht</span><span>Wt</span><span>Class</span></div>' +
           '<ul class="ro-list">' + rows.join("") + "</ul></section>";
  }

  function history(h) {
    if (!h || h.length < 2) return "";
    return '<details class="card ro-fold"><summary><span class="ro-fold-title">Week by week</span>' +
           '<span class="ro-fold-count">' + h.length + ' charts</span><span class="ro-chev" aria-hidden="true"></span></summary>' +
           '<ol class="ro-weeks">' + h.map(function (w, i) {
             var moves = i === h.length - 1 ? "First chart of the season"
               : w.changes.length ? w.changes.length + (w.changes.length === 1 ? " change" : " changes") : "No changes";
             var av = !w.availability ? "" : !w.availability.reported ? "no official availability report"
               : w.availability.out + " out" + (w.availability.questionable ? ", " + w.availability.questionable + " questionable" : "");
             return '<li><p class="ro-week"><strong>' + esc(w.game) + "</strong> · " + esc(moves) +
                    (av ? " · " + esc(av) : "") + "</p>" +
                    (w.changes.length ? '<ul class="ro-changes">' + w.changes.map(function (c) { return "<li>" + esc(c.text) + "</li>"; }).join("") + "</ul>" : "") +
                    '<p class="ro-week-src">' + external(w.url, w.title || "Source") + "</p></li>";
           }).join("") + "</ol></details>";
  }

  function depthView(m) {
    if (!m.hasDepth) return quiet("There is no depth chart source for this team yet.");
    if (!m.depth) return quiet(m.failed && m.failed.depth ? "The depth chart didn’t load. It appears when the connection returns." : "Loading the depth chart…");
    var d = m.depth;
    var units = d.units.map(function (u) { return { key: u.key, label: u.unit }; });
    var key = pickUnit(units, m.unit);
    var unit = d.units.filter(function (u) { return u.key === key; })[0];
    var open = [].concat.apply([], d.units.map(function (u) { return u.slots.filter(function (s) { return s.open; }); })).length;
    var head = '<section class="card ro-head"><h2 class="ro-title">' + esc(d.title || "Depth Chart") + "</h2>" +
               '<p class="ro-meta">Official depth chart · ' + external(d.source.url, d.source.label) + "</p>" +
               (open ? '<p class="ro-meta">' + open + (open === 1 ? " starting job" : " starting jobs") + " still open</p>" : "") +
               (d.changes.length ? '<details class="ro-moved"><summary>' + d.changes.length + (d.changes.length === 1 ? " change" : " changes") +
                 ' since last week<span class="ro-chev" aria-hidden="true"></span></summary><ul class="ro-changes">' + d.changes.map(function (c) { return "<li>" + esc(c.text) + "</li>"; }).join("") + "</ul></details>" : "") +
               "</section>";
    return head + unitSeg("depth", units, key) +
           '<div class="ro-unit" role="region" aria-label="' + esc(unit.unit + " depth chart") + '">' + unit.slots.map(spotCard).join("") + "</div>" +
           history(m.history);
  }

  // ---- Roster ----------------------------------------------------------------

  // Everyone, or one unit, by jersey number, with one box that finds a
  // player by anything a fan might know: name, number, position, hometown.
  // The list is drawn on its own (list()), so typing never loses focus.
  function rosterUnits(m) {
    var groups = (m.roster || []).filter(function (g) { return g.players.length; });
    return [{ key: "all", label: "All" }].concat(groups.length > 1 ? groups.map(function (g) { return { key: fold(g.label), label: g.label }; }) : []);
  }
  function rosterView(m) {
    if (!m.roster) return quiet(m.failed && m.failed.roster ? "The roster didn’t load. It appears when the connection returns." : "Loading the roster…");
    if (!m.roster.some(function (g) { return g.players.length; })) return quiet("No players are listed yet.");
    var units = rosterUnits(m), key = m.unit && units.some(function (u) { return u.key === m.unit; }) ? m.unit : "all";
    return (units.length > 1 ? unitSeg("roster", units, key) : "") +
      '<label class="ro-search"><span class="sr-only">Find a player by name, number, position or hometown</span>' +
      '<input type="search" id="rosterQ" autocomplete="off" spellcheck="false" placeholder="Name, number, position or hometown"></label>' +
      '<section class="card ro-card"><div data-ro="list"></div></section>';
  }
  function list(m) {
    var units = rosterUnits(m), key = m.unit && units.some(function (u) { return u.key === m.unit; }) ? m.unit : "all";
    var players = [];
    (m.roster || []).forEach(function (g) { if (key === "all" || fold(g.label) === key) players = players.concat(g.players); });
    var q = String(m.query || "").trim().toLowerCase();
    if (q) players = players.filter(function (p) {
      return [p.name, p.jersey, p.position, p.positionName, p.hometown && p.hometown.city, p.hometown && p.hometown.state].join(" ").toLowerCase().indexOf(q) > -1;
    });
    players = players.slice().sort(function (x, y) {
      var a = parseInt(x.jersey, 10), b = parseInt(y.jersey, 10);
      return isNaN(a) && isNaN(b) ? 0 : isNaN(a) ? 1 : isNaN(b) ? -1 : a - b;
    });
    var label = (units.filter(function (u) { return u.key === key; })[0] || {}).label || "All";
    return '<div class="ro-card-head"><h2 class="ro-spot">' + esc(key === "all" ? "Full roster" : label) + "</h2>" +
           '<span class="ro-fold-count" role="status">' + players.length + (players.length === 1 ? " player" : " players") + "</span></div>" +
           (players.length ? '<div class="ro-cols roster" aria-hidden="true"><span>#</span><span>Player</span><span>Ht</span><span>Wt</span><span>Class</span></div>' +
             '<ul class="ro-list">' + players.map(function (p) {
               return '<li class="ro-row roster"><span class="ro-no">' + esc(p.jersey) + "</span>" + photo({ name: p.name, photo: p.photo }) +
                 '<span class="ro-who"><span class="ro-name">' + esc(p.name) + "</span>" +
                   '<span class="ro-town">' + esc([p.position, town(p.hometown)].filter(Boolean).join(" · ")) + "</span>" + bio(p) + "</span>" +
                 '<span class="ro-ht">' + esc(p.height) + '</span><span class="ro-wt">' + esc(weight(p.weight)) + '</span><span class="ro-cl">' + esc(p.classYear) + "</span></li>";
             }).join("") + "</ul>"
           : quiet("No player matches “" + q + "”."));
  }

  // ---- Availability ------------------------------------------------------------

  function availView(m) {
    var a = m.avail;
    if (!a) return quiet(m.failed && m.failed.avail ? "The availability report didn’t load. No status is inferred from that." : "Loading the availability report…");
    var head = '<section class="card ro-head"><h2 class="ro-title">Availability Report</h2>';
    // Never inferred from silence (0019): no report says so; a report that
    // lists nobody says everyone is available.
    if (!a.reported) return head + '<p class="ro-meta">No official availability report is out for ' + esc(a.game || "the next game") +
                             " yet. No status is inferred from that.</p></section>";
    var when = a.effectiveAt ? new Date(a.effectiveAt + "T12:00:00") : null;
    var date = when && !isNaN(when) ? when.toLocaleDateString([], { month: "long", day: "numeric" }) : "";
    head += '<p class="ro-meta">' + (date ? esc(date) + " · " : "") + "Official · " + external(a.source.url, a.source.label) + "</p>" +
            (a.game ? '<p class="ro-meta">For the game ' + esc(a.game) + "</p>" : "") + "</section>";
    if (!a.groups.length) return head + '<section class="card ro-card"><p class="ro-all">The report lists nobody: everyone is available.</p></section>';
    return head + a.groups.map(function (g) {
      return '<section class="card ro-card"><div class="ro-card-head"><h3 class="ro-spot">' + esc(g.label) + "</h3>" +
             '<span class="ro-fold-count">' + g.players.length + "</span></div>" +
             '<ul class="ro-list">' + g.players.map(function (p) {
               return '<li class="ro-row avail">' + photo(p) +
                 '<span class="ro-who"><span class="ro-name">' + esc(p.name) + "</span>" +
                   '<span class="ro-town">' + esc([p.pos, p.detail].filter(Boolean).join(" · ")) + "</span></span></li>";
             }).join("") + "</ul></section>";
    }).join("");
  }

  function paint(host, m) {
    if (!host) return;
    if (!host.querySelector("[data-ro]")) {
      host.innerHTML = '<div data-ro="fresh" role="status"></div><div data-ro="strip"></div><div data-ro="body" class="ro-body"></div>';
      last = {};
    }
    var body = m.view === "roster" ? rosterView(m) : m.view === "availability" ? availView(m) : depthView(m);
    var html = { fresh: ui.freshBanner(m.fresh), strip: strip(m), body: body };
    ["fresh", "strip", "body"].forEach(function (k) {
      if (last[k] === html[k]) return;
      host.querySelector('[data-ro="' + k + '"]').innerHTML = html[k];
      last[k] = html[k];
      if (k === "body") last.list = null;
    });
    if (m.view === "roster") paintList(host, m);
  }
  // The roster list alone - for each keystroke in the search box.
  function paintList(host, m) {
    var box = host && host.querySelector('[data-ro="list"]');
    if (!box) return;
    var q = host.querySelector("#rosterQ");
    if (q && q.value !== (m.query || "") && document.activeElement !== q) q.value = m.query || "";
    var html = list(m);
    if (last.list === html) return;
    box.innerHTML = html;
    last.list = html;
  }

  return { paint: paint, list: paintList };
})();
