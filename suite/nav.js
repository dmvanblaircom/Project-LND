/* Suite navigation: the in-page router and the primary nav.

   Routes are the page's hash - #home, #top25/rankings, #roster/availability -
   because the Suite is a static page on GitHub Pages: a hash route needs no
   server, the browser's Back walks it, and a link to one opens that view
   (decision 0023). There is ONE route state, location.hash; nothing else
   remembers where the fan is.

     location.hash  ->  Suite.nav.current()  ->  { screen, path, view }
                                   |
                  painted here:    v   the nav's current item, which header the
                                       screen wears, the screen's heading, focus
                  handled by app:      Suite.nav.on(fn) - which content shows

   Which header a screen wears is a product rule, stated once in SCREENS
   (decisions 0023, 0024 §6):
     bar      the compact SUITE header - Home and Game
     context  the SUITE header with the selected team as quiet context, and
              a neutral page heading - Top 25, which is national content
     mast     the team masthead - the team-centric sections
   Schedule has no primary nav item; it is reached from Home and More.

   A screen with peer views (Top 25's Games | Rankings) lists them; the first
   is the default, so #top25 opens Games and #top25/rankings opens Rankings.
   Game's views change with the game's lifecycle, so the app sets them
   (setViews). A route naming a view the screen does not have is corrected in
   place - the history entry is REPLACED, never added to, and the change is
   announced - so no dead route is left active and Back never leads to one
   (decision 0024 §15).

   Selected and live are different things (decision 0024 §1): aria-current
   marks the destination the fan is on; setGameState() raises the Game
   control because a game is under way, wherever the fan is.

   This file names no team and no provider. */

var Suite = Suite || {};

Suite.nav = (function () {
  "use strict";

  var SCREENS = {
    home:     { header: "bar",     title: "Home"     },
    top25:    { header: "context", title: "Top 25",
                views: [{ id: "games", label: "Games" }, { id: "rankings", label: "Rankings" }] },
    game:     { header: "bar",     title: "Game"     },
    roster:   { header: "mast",    title: "Roster",
                views: [{ id: "depth", label: "Depth Chart" }, { id: "roster", label: "Roster" },
                        { id: "availability", label: "Availability" }] },
    more:     { header: "mast",    title: "More"     },
    schedule: { header: "mast",    title: "Schedule" }
  };
  var DEFAULT = "home";

  // The Game control's states (decision 0024 §14). Raised means a game is
  // under way; only an actually active one pulses. A delay before kickoff,
  // a postponement or a cancellation is not one of these: Game stays normal.
  var GAME_STATES = {
    live:      { raised: true, pulse: true,  say: ", live now"  },
    delayed:   { raised: true, pulse: false, say: ", delayed"   },
    suspended: { raised: true, pulse: false, say: ", suspended" }
  };

  var listeners = [];
  var last = null;

  function $(id) { return document.getElementById(id); }

  function viewIds(screen) {
    var v = SCREENS[screen] && SCREENS[screen].views;
    return v ? v.map(function (x) { return x.id; }) : null;
  }
  function viewLabel(screen, id) {
    var v = (SCREENS[screen].views || []).filter(function (x) { return x.id === id; })[0];
    return v ? v.label : id;
  }

  // "#top25/rankings/ap" -> { screen: "top25", path: ["rankings", "ap"], view: "rankings" }.
  // Anything unknown is Home: an old bookmark or a typo still opens the app.
  // A screen with views always has one: the path's, or the default. `invalid`
  // says the path named a view this screen does not have.
  function parse(hash) {
    var parts = String(hash || "").replace(/^#\/?/, "").split("/").filter(Boolean)
      .map(function (p) { return p.toLowerCase(); });
    var screen = SCREENS[parts[0]] ? parts[0] : DEFAULT;
    var path = SCREENS[parts[0]] ? parts.slice(1) : [];
    var ids = viewIds(screen), view = null, invalid = false;
    if (ids) {
      if (path.length && ids.indexOf(path[0]) > -1) view = path[0];
      else { view = ids[0]; invalid = path.length > 0; }
    }
    return { screen: screen, path: path, view: view, invalid: invalid };
  }

  function current() { return parse(location.hash); }

  function href(screen, path) {
    return "#" + [screen].concat(path || []).join("/");
  }

  // Navigate. A new route is a history entry, so Back returns to it; asking
  // for the route already showing does nothing.
  function go(screen, path) {
    var h = href(screen, path);
    if (location.hash === h) return;
    location.hash = h;
  }

  function announce(msg) {
    var live = $("live");
    if (live && msg) live.textContent = msg;
  }

  // Correct the route in place: the same history entry, a different view. No
  // reload, no new Back step, focus left where it is, the change announced.
  function replace(screen, path, note) {
    var h = href(screen, path);
    if (location.hash !== h) history.replaceState(history.state, "", h);
    apply(false, true);
    announce(note);
  }

  // Give a screen a new set of peer views - Game's, as its lifecycle moves.
  // A view that still exists is kept; one that does not moves to the new
  // default. `why` prefixes the announcement ("Final.").
  function setViews(screen, views, why) {
    if (!SCREENS[screen]) return;
    SCREENS[screen].views = views && views.length ? views.slice() : undefined;
    var r = current();
    if (r.screen !== screen) return;
    if (r.invalid) {
      replace(screen, [r.view], [why, "Showing " + viewLabel(screen, r.view) + "."].filter(Boolean).join(" "));
    } else {
      apply(false, true);                 // same route, new meaning: repaint, keep focus
    }
  }

  function paint(route) {
    var def = SCREENS[route.screen];

    // The nav: one current item, or none (Schedule has no item of its own).
    [].slice.call(document.querySelectorAll(".nav-item[data-screen]")).forEach(function (a) {
      if (a.getAttribute("data-screen") === route.screen) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });

    // The header this screen wears, and the one heading that names it.
    var bar = $("appBar"), ctx = $("barContext"), mast = $("masthead"),
        mastTitle = $("mastTitle"), sr = $("screenHead");
    var kind = def.header;
    if (bar)  bar.hidden = kind === "mast";
    if (ctx)  ctx.hidden = kind !== "context";
    if (mast) mast.hidden = kind !== "mast";
    if (mastTitle) mastTitle.textContent = kind === "mast" ? def.title : "";
    if (sr) {
      sr.textContent = kind === "mast" ? "" : def.title;
      sr.hidden = kind === "mast";
      // On a context screen the heading is visible: national content under
      // a neutral title, not under the team's name.
      sr.className = kind === "context" ? "page-title" : "sr-only";
    }
  }

  // After a navigation - not on first load, and not after a correction the
  // fan did not ask for - focus moves to the new screen's heading, so
  // keyboard and screen-reader users start there rather than on a nav link
  // that no longer describes what is on screen.
  function focusHeading(route) {
    var def = SCREENS[route.screen];
    var h = $(def.header === "mast" ? "mastTitle" : "screenHead");
    if (h && h.focus) { h.focus({ preventScroll: true }); }
    window.scrollTo(0, 0);
  }

  function apply(first, quiet) {
    var route = current();
    if (route.invalid) {
      // A dead view in the address: replace it rather than show it. On first
      // load this is a stale bookmark; later, a lifecycle or a typo.
      replace(route.screen, [route.view], "Showing " + viewLabel(route.screen, route.view) + ".");
      return;
    }
    var changed = !last || last.screen !== route.screen || last.path.join("/") !== route.path.join("/");
    var screenChanged = !last || last.screen !== route.screen;
    last = route;
    paint(route);
    listeners.forEach(function (fn) { fn(route, first); });
    if (!first && !quiet && changed && screenChanged) focusHeading(route);
  }

  // The Game control's state: null for a normal Game item, or one of
  // GAME_STATES. TeamOS decides which from the game's normalized status and
  // whether play has begun; this only draws and announces it.
  function setGameState(state) {
    var s = GAME_STATES[state] || null;
    var nav = $("navbar"), note = $("navLive");
    if (nav) {
      nav.classList.toggle("game-raised", !!(s && s.raised));
      nav.classList.toggle("game-live", !!(s && s.pulse));
      nav.setAttribute("data-game-state", s ? state : "");
    }
    if (note) note.textContent = s ? s.say : "";
  }

  function on(fn) { listeners.push(fn); }

  function start() {
    window.addEventListener("hashchange", function () { apply(false); });
    apply(true);
  }

  return { SCREENS: SCREENS, parse: parse, current: current, href: href, go: go,
           replace: replace, setViews: setViews, on: on, start: start,
           setGameState: setGameState };
})();
