/* Which team is this Suite for?

   Until Phase 7 that question was answered by a line in index.html: one
   <script src="teams/notre-dame.js">, resolved when the site was deployed. A
   second team needed a second page (buckeye.html), and the service worker
   precached whichever team the HTML happened to name. This file answers the
   question at run time instead, so one deployment serves any configured team.

   The order matters and is the reason this is a file rather than an inline
   block. index.html loads teamos/*.js with `defer`, then this; deferred
   scripts run in order, so TeamOS is defined by the time anything below
   executes. Nothing in teamos/ reads TEAM_CONFIG at load - only app.js does -
   so the team's config can arrive after them, as long as it arrives before
   app.js. That is all this file does:

     resolve an id  ->  teams/<id>.js  ->  app.js

   Resolution order, decided in Phase 7:

     1. ?team=<id> in the URL. A link wins, so a shared link always opens the
        team it names, and the choice is remembered for next time.
     2. the remembered choice from a previous visit.
     3. neither: the chooser.

   The default team is a fallback for a selection that cannot be honoured,
   not the front door. A first visit is asked.

   Only an explicit choice is remembered. Falling back to the default must not
   write anything down, or someone whose link was broken once would be quietly
   pinned to a team they never picked. */

var LND = (function () {
  "use strict";

  var KEY = "lnd.team";
  var LNDBAD = false;                  // the URL asked for a team we cannot use

  // Where a selection that cannot be honoured lands - a config that will not
  // load, an id that is not a slug, a registry that will not load. It is not
  // what a first visit sees; that is the chooser.
  var DEFAULT_TEAM = "notre-dame";

  // Every FBS program, and which of them have a config. Loaded only when the
  // chooser is shown: 138 programs is about 19KB and nobody who has already
  // picked a team should pay for it.
  var INDEX_SRC = "teams/index.js";

  // A team id is a folder-safe slug and nothing else. This is what stops
  // "../../something" or a query string from being turned into a script src.
  function valid(id) {
    return typeof id === "string" && /^[a-z0-9][a-z0-9-]{0,40}$/.test(id);
  }

  // null  - no team in the URL at all
  // false - a team was asked for and it is not a usable id
  // string - the id
  function requested() {
    var m = /[?&]team=([^&#]*)/.exec(location.search);
    if (!m) return null;
    var id;
    try { id = decodeURIComponent(m[1]); } catch (e) { return false; }
    return valid(id) ? id : false;
  }

  // Storage throws in a private window and in some embedded webviews, and a
  // team app that will not open is worse than one that forgets.
  function stored() {
    try { var v = localStorage.getItem(KEY); return valid(v) ? v : null; }
    catch (e) { return null; }
  }
  function remember(id) { try { localStorage.setItem(KEY, id); } catch (e) {} }
  function forget()     { try { localStorage.removeItem(KEY); } catch (e) {} }

  function script(src, onload, onerror) {
    var s = document.createElement("script");
    s.src = src;
    if (onload)  s.onload = onload;
    if (onerror) s.onerror = onerror;
    document.head.appendChild(s);
  }

  var started = false;
  function startApp() {
    if (started) return;          // one app, whatever happened above
    started = true;
    script("app.js");
  }

  // Load a team's config, then the application. If the config will not load -
  // a stale bookmark, a team folded into the index before its file existed -
  // fall back to the default once, and stop remembering the id that failed.
  function load(id, allowFallback) {
    script("teams/" + id + ".js", startApp, function () {
      forget();
      if (allowFallback && id !== DEFAULT_TEAM) {
        LND.failed = id;
        load(DEFAULT_TEAM, false);
      } else {
        // Nothing to render a team with. app.js is not started; the page
        // keeps whatever the markup says rather than throwing.
        LND.failed = id;
      }
    });
  }

  function resolve() {
    var fromUrl = requested();
    if (fromUrl) { remember(fromUrl); return fromUrl; }
    // A link that named something unusable: honour the intent to open a team
    // by opening the fallback, rather than answering a request with a
    // question. Nothing is remembered - the choice was never the visitor's.
    if (fromUrl === false) { LNDBAD = true; return DEFAULT_TEAM; }
    var saved = stored();
    if (saved) return saved;
    return null;                       // nothing to go on at all: ask
  }

  /* ---------- the chooser ----------
     Every FBS program is in teams/index.js; the ones with a TeamOS config are
     marked `built` and are the ones that can be picked. That mark is derived
     from the contents of teams/ by tools/teamindex.js, so a team becomes
     selectable by someone writing its config - there is no second list here
     to keep in step, and nothing in this file names a team. */
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function chooser() {
    document.title = "Choose your team";
    script(INDEX_SRC, render, function () {
      load(DEFAULT_TEAM, false);       // no registry, no chooser: open the fallback
    });
  }

  function row(t, selectable) {
    var label = esc(t.name) + ' <span class="nick">' + esc(t.nickname) + "</span>" +
                '<span class="conf">' + esc(t.conference) + "</span>";
    return selectable
      ? '<li><button type="button" class="pick" data-team="' + esc(t.id) + '">' + label + "</button></li>"
      : '<li><span class="pick off">' + label + "</span></li>";
  }

  function render() {
    var all = (typeof TEAM_INDEX !== "undefined" && TEAM_INDEX.teams) || [];
    if (!all.length) { load(DEFAULT_TEAM, false); return; }
    var ready = all.filter(function (t) { return t.built; });
    var soon = all.filter(function (t) { return !t.built; });

    var el = document.createElement("div");
    el.id = "chooser";
    el.innerHTML =
      '<div class="choosebox">' +
        '<p class="kicker">PROJECT LND</p>' +
        "<h1>Choose your team</h1>" +
        '<p class="sub">These are the teams that have been built. The rest of the ' +
          "FBS is listed so you can see what is coming.</p>" +
        '<label class="sr-only" for="teamFilter">Search teams</label>' +
        '<input type="search" id="teamFilter" autocomplete="off" placeholder="Search ' +
          all.length + ' FBS teams">' +
        '<h2 class="sec">Available<span class="count">' + ready.length + "</span></h2>" +
        '<ul class="plain picks" id="pickReady">' + ready.map(function (t) { return row(t, true); }).join("") + "</ul>" +
        '<h2 class="sec">Not yet built<span class="count">' + soon.length + "</span></h2>" +
        '<ul class="plain picks dim" id="pickSoon">' + soon.map(function (t) { return row(t, false); }).join("") + "</ul>" +
        '<p class="none" id="pickNone" hidden>No team matches that.</p>' +
      "</div>";
    document.documentElement.className += " choosing";
    document.body.appendChild(el);

    el.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("button.pick") : null;
      if (!b) return;
      var id = b.getAttribute("data-team");
      if (!valid(id)) return;
      remember(id);
      // A full load rather than starting the app in place: one code path for
      // arriving at a team, whether by link, by memory or by choice.
      location.replace("?team=" + encodeURIComponent(id));
    });

    var filter = document.getElementById("teamFilter");
    filter.addEventListener("input", function () {
      var q = filter.value.trim().toLowerCase(), shown = 0;
      var items = el.querySelectorAll("li");
      for (var i = 0; i < items.length; i++) {
        var hit = !q || items[i].textContent.toLowerCase().indexOf(q) > -1;
        items[i].hidden = !hit;
        if (hit) shown++;
      }
      document.getElementById("pickNone").hidden = shown > 0;
    });
    filter.focus();
  }

  var team = resolve();
  if (team) load(team, true); else chooser();

  return {
    team: team,                        // null while the chooser is up
    choosing: !team,
    rejected: LNDBAD,
    key: KEY,
    defaultTeam: DEFAULT_TEAM,
    valid: valid,
    remember: remember,
    forget: forget,
    failed: null
  };
})();
