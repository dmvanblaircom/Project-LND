/* Suite navigation: the in-page router and the primary nav.

   Routes are the page's hash - #home, #top25/rankings, #roster/availability -
   because the Suite is a static page on GitHub Pages: a hash route needs no
   server, the browser's Back walks it, and a link to one opens that view
   (decision 0023). There is ONE route state, location.hash; nothing else
   remembers where the fan is.

     location.hash  ->  Suite.nav.current()  ->  { screen, path, view }
                                   |
                  painted here:    v   the nav's current item, the team context,
                                       the screen's heading, focus
                  handled by app:      Suite.nav.on(fn) - which content shows

   Every screen wears the same header (David, 2026-10-01, superseding the
   three-header rule of decisions 0023 and 0024 section 6): the SUITE bar
   with the selected team as quiet context - its mark and name - as Top 25
   first had it. Under it, a screen names itself with a visible page title,
   except where a hero already leads the page (Home, Game, and a game opened
   from Schedule); there the title is for assistive technology only.
   Schedule has no primary nav item of its own: it is a secondary destination
   owned by More, so More stays selected on every Schedule route - the list,
   Results and a game opened from it (decision 0028). News, Settings,
   Feedback and About Suite follow the same rule as they are rebuilt.

   A screen with peer views (Top 25's Games | Rankings) lists them; the first
   is the default, so #top25 opens Games and #top25/rankings opens Rankings.
   Game's views change with the game's lifecycle, so the app sets them
   (setViews). A route naming a view the screen does not have is corrected in
   place - the history entry is REPLACED, never added to, and the change is
   announced - so no dead route is left active and Back never leads to one
   (decision 0024 §15).

   A horizontal swipe on a screen's content moves to its next or previous
  peer view - the same route a tap on the view's tab makes, so Back walks it
  (David, 2026-10-01: sub-views only, never the primary tabs). See swipe()
  below for what counts as a swipe; the tabs stay, so nothing depends on it.

  Pulling a screen down from its top refreshes it - the same refresh as
  Settings' Refresh Data (David, 2026-10-01). See pull() below; Settings
  keeps the button, so nothing depends on the gesture.

  Selected and live are different things (decision 0024 §1): aria-current
   marks the destination the fan is on; setGameState() raises the Game
   control because a game is under way, wherever the fan is.

   This file names no team and no provider. */

var Suite = Suite || {};

Suite.nav = (function () {
  "use strict";

  var SCREENS = {
    home:     { hero: true,  title: "Home"     },
    top25:    { title: "Top 25",
                views: [{ id: "games", label: "Games" }, { id: "rankings", label: "Rankings" }] },
    game:     { hero: true,  title: "Game"     },
    roster:   { title: "Roster",
                views: [{ id: "depth", label: "Depth Chart" }, { id: "roster", label: "Roster" },
                        { id: "availability", label: "Availability" }] },
    more:     { title: "More"     },
    // Schedule | Results; #schedule/<game id> opens one game in the Game
    // layout, under its hero, with a way back to the list.
    schedule: { title: "Schedule", owner: "more",
                views: [{ id: "schedule", label: "Schedule" }, { id: "results", label: "Results" }],
                item: /^[0-9]+$/, itemHero: true, itemTitle: "Game" },
    // Season Outlook's full field (W18): Home's, reached from its Season
    // Outlook section, so Home stays selected. Playoff | National Title.
    outlook:  { title: "Season Outlook", owner: "home",
                views: [{ id: "playoff", label: "Playoff" }, { id: "title", label: "National Title" }] },
    // More's other destinations (reference 10), each a secondary destination
    // that keeps More selected (decision 0028).
    news:     { title: "News",        owner: "more" },
    // The team's season (W27): reached from More, Roster and Game's Matchup.
    // Team | Players (W27 Phase 2).
    stats:    { title: "Stats",       owner: "more",
                views: [{ id: "team", label: "Team" }, { id: "players", label: "Players" }] },
    settings: { title: "Settings",    owner: "more" },
    feedback: { title: "Feedback",    owner: "more" },
    about:    { title: "About Suite", owner: "more" }
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
  var slide = null;                       // "next" | "prev": the view a swipe just asked for

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
  // A screen that opens items takes one by id: "#schedule/401858453/box" ->
  // { screen: "schedule", item: "401858453", path: [...], view: null }; the
  // item's own views are its opener's to judge.
  // Anything unknown is Home: an old bookmark or a typo still opens the app.
  // A screen with views always has one: the path's, or the default. `invalid`
  // says the path named a view this screen does not have.
  function parse(hash) {
    var parts = String(hash || "").replace(/^#\/?/, "").split("/").filter(Boolean)
      .map(function (p) { return p.toLowerCase(); });
    // "#more/news" is the older spelling of "#news": the same screen, and
    // the address is corrected in place.
    if (parts[0] === "more" && SCREENS[parts[1]] && SCREENS[parts[1]].owner === "more") {
      return { screen: parts[1], path: parts.slice(2), view: null, invalid: false, alias: true };
    }
    var screen = SCREENS[parts[0]] ? parts[0] : DEFAULT;
    var path = SCREENS[parts[0]] ? parts.slice(1) : [];
    var ids = viewIds(screen), view = null, invalid = false;
    var def = SCREENS[screen];
    if (def.item && path.length && def.item.test(path[0])) {
      return { screen: screen, path: path, view: null, item: path[0], invalid: false };
    }
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
    var hero = route.item ? !!def.itemHero : !!def.hero;
    var title = route.item && def.itemTitle ? def.itemTitle : def.title;

    // The nav: one current item - the screen's own, or for a secondary
    // destination the primary item that owns it (decision 0028).
    var selected = def.owner || route.screen;
    [].slice.call(document.querySelectorAll(".nav-item[data-screen]")).forEach(function (a) {
      if (a.getAttribute("data-screen") === selected) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });

    // One header everywhere; the one heading that names the screen is
    // visible unless a hero leads it.
    var ctx = $("barContext"), sr = $("screenHead");
    if (ctx) ctx.hidden = false;
    if (sr) {
      sr.textContent = title;
      sr.hidden = false;
      sr.className = hero ? "sr-only" : "page-title";
    }
  }

  // After a navigation - not on first load, and not after a correction the
  // fan did not ask for - focus moves to the new screen's heading, so
  // keyboard and screen-reader users start there rather than on a nav link
  // that no longer describes what is on screen.
  function focusHeading(route, keepScroll) {
    var h = $("screenHead");
    if (h && h.focus) { h.focus({ preventScroll: true }); }
    if (!keepScroll) window.scrollTo(0, 0);
  }

  function apply(first, quiet) {
    var route = current();
    if (route.alias) { replace(route.screen, route.path); return; }
    if (route.invalid) {
      // A dead view in the address: replace it rather than show it. On first
      // load this is a stale bookmark; later, a lifecycle or a typo.
      replace(route.screen, [route.view], "Showing " + viewLabel(route.screen, route.view) + ".");
      return;
    }
    var changed = !last || last.screen !== route.screen || last.path.join("/") !== route.path.join("/");
    // Opening or leaving an item is a new place, like a new screen.
    var screenChanged = !last || last.screen !== route.screen || (last.item || null) !== (route.item || null);
    // Back from an item to its list: the list's own place is the app's to
    // restore, so the scroll is left alone.
    var backToList = !!(last && last.item && !route.item && last.screen === route.screen);
    last = route;
    paint(route);
    listeners.forEach(function (fn) { fn(route, first); });
    if (!first && !quiet && changed && screenChanged) focusHeading(route, backToList);
    if (slide) { slideIn(slide); slide = null; }
  }

  /* ---- swiping between a screen's peer views ----

     A swipe is a single finger moving at least SWIPE_MIN px sideways, at
     least SWIPE_RATIO times as far as it moved up or down, within
     SWIPE_MS - so a vertical scroll is never taken for one. It is ignored
     when it starts on anything that scrolls sideways itself (the news row,
     the drive tracker, a wide table), on a form control, inside an element
     marked data-no-swipe, or within SWIPE_EDGE px of either screen edge,
     where the system's own gestures live. Left goes to the next view,
     right to the previous; the first and last views stop there. A screen
     with one view, or an item opened from a list, does not swipe. */
  var SWIPE_MIN = 60, SWIPE_RATIO = 1.5, SWIPE_MS = 800, SWIPE_EDGE = 20;
  function scrollsSideways(el, stop) {
    for (; el && el !== stop && el.nodeType === 1; el = el.parentNode) {
      if (el.hasAttribute("data-no-swipe")) return true;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable) return true;
      var ox = getComputedStyle(el).overflowX;
      if ((ox === "auto" || ox === "scroll") && el.scrollWidth > el.clientWidth + 1) return true;
    }
    return false;
  }
  function neighbour(route, dir) {
    var ids = viewIds(route.screen);
    if (!ids || ids.length < 2 || route.item || !route.view) return null;
    var i = ids.indexOf(route.view) + (dir === "next" ? 1 : -1);
    return i >= 0 && i < ids.length ? ids[i] : null;
  }
  function slideIn(dir) {
    var el = document.querySelector("#main > div:not([hidden])");
    if (!el) return;
    el.classList.remove("view-in-next", "view-in-prev");
    void el.offsetWidth;                   // restart the animation if one is running
    el.classList.add("view-in-" + dir);
    el.addEventListener("animationend", function done() {
      el.classList.remove("view-in-" + dir); el.removeEventListener("animationend", done);
    });
  }
  function swipe() {
    var main = $("main"), start = null;
    if (!main) return;
    main.addEventListener("touchstart", function (e) {
      var t = e.touches[0], w = window.innerWidth;
      start = null;
      if (e.touches.length !== 1 || t.clientX < SWIPE_EDGE || t.clientX > w - SWIPE_EDGE) return;
      if (scrollsSideways(e.target, main)) return;
      start = { x: t.clientX, y: t.clientY, t: Date.now() };
    }, { passive: true });
    main.addEventListener("touchend", function (e) {
      if (!start || e.changedTouches.length !== 1) { start = null; return; }
      var t = e.changedTouches[0], dx = t.clientX - start.x, dy = t.clientY - start.y, dt = Date.now() - start.t;
      start = null;
      if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < SWIPE_RATIO * Math.abs(dy) || dt > SWIPE_MS) return;
      var route = current(), dir = dx < 0 ? "next" : "prev", to = neighbour(route, dir);
      if (!to) return;
      slide = dir;
      go(route.screen, [to]);
    }, { passive: true });
    main.addEventListener("touchcancel", function () { start = null; }, { passive: true });
  }

  /* Pull to refresh. A single finger that starts with the page scrolled to
     its top and moves down at least PULL_ARM px (twice as far down as
     sideways, so a swipe is never taken for one) asks for a refresh when it
     lets go; less than that, or moving back up, and nothing happens. Not on
     a form control or a button, or inside anything scrolled down itself, and never while
     a refresh is already under way. The indicator follows the finger, then
     turns while the refresh runs and goes when it has settled. It is
     aria-hidden: the refresh announces itself through the app's live
     region, and Settings' button is the way in for anyone not pulling.
     onRefresh returns a promise; the browser's own pull-to-reload is turned
     off in app.css so the page is not reloaded under it. */
  var PULL_ARM = 64, PULL_MAX = 96, PULL_RATIO = 2;
  function scrolledInside(el, stop) {
    for (; el && el !== stop && el.nodeType === 1; el = el.parentNode) {
      if (/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(el.tagName) || el.isContentEditable) return true;
      if (el.scrollTop > 0) return true;
    }
    return false;
  }
  function pull(onRefresh) {
    var main = $("main"), start = null, busy = false, dist = 0, ind = null;
    if (!main || typeof onRefresh !== "function") return;
    function indicator() {
      if (ind) return ind;
      ind = document.createElement("div");
      ind.className = "pull";
      ind.id = "pullRefresh";
      ind.setAttribute("aria-hidden", "true");
      ind.innerHTML = '<span class="pull-mark"></span>';
      document.body.appendChild(ind);
      return ind;
    }
    function show(d, armed) {
      var el = indicator();
      el.style.top = Math.max(0, main.getBoundingClientRect().top) + "px";
      el.style.setProperty("--pull", String(Math.min(1, d / PULL_ARM)));
      el.style.transform = "translate(-50%," + Math.round(d * 0.6) + "px)";
      el.classList.toggle("is-armed", armed);
      el.classList.add("is-pulling");
    }
    function hide() {
      if (!ind) return;
      ind.classList.remove("is-pulling", "is-armed", "is-refreshing");
      ind.style.transform = "";
    }
    main.addEventListener("touchstart", function (e) {
      start = null; dist = 0;
      if (busy || e.touches.length !== 1 || window.scrollY > 0) return;
      if (scrolledInside(e.target, main)) return;
      start = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }, { passive: true });
    main.addEventListener("touchmove", function (e) {
      if (!start || e.touches.length !== 1) return;
      var dx = e.touches[0].clientX - start.x, dy = e.touches[0].clientY - start.y;
      if (window.scrollY > 0 || (dy < PULL_RATIO * Math.abs(dx) && Math.abs(dx) > 10)) { start = null; hide(); return; }
      dist = Math.max(0, Math.min(PULL_MAX, dy));
      if (dist > 4) show(dist, dist >= PULL_ARM); else hide();
    }, { passive: true });
    main.addEventListener("touchend", function () {
      if (!start) return;
      var go = dist >= PULL_ARM;
      start = null; dist = 0;
      if (!go) { hide(); return; }
      busy = true;
      var el = indicator();
      el.classList.remove("is-pulling");
      el.classList.add("is-refreshing");
      el.style.transform = "translate(-50%," + Math.round(PULL_ARM * 0.6) + "px)";
      var done = function () { busy = false; hide(); };
      var p;
      try { p = onRefresh(); } catch (err) { p = null; }
      Promise.resolve(p).then(done, done);
    }, { passive: true });
    main.addEventListener("touchcancel", function () { start = null; dist = 0; if (!busy) hide(); }, { passive: true });
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
    swipe();
    apply(true);
  }

  // A screen's name, for copy that mentions one ("Screen: Roster").
  function title(screen) { return SCREENS[screen] ? SCREENS[screen].title : String(screen || ""); }

  return { SCREENS: SCREENS, parse: parse, current: current, href: href, go: go,
           replace: replace, setViews: setViews, on: on, start: start,
           setGameState: setGameState, title: title, pull: pull };
})();
