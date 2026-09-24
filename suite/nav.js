/* Suite navigation: the in-page router and the primary nav.

   Routes are the page's hash - #home, #top25/rankings/ap, #more/settings -
   because the Suite is a static page on GitHub Pages: a hash route needs no
   server, the browser's Back walks it, and a link to one opens that view
   (decision 0023). There is ONE route state, location.hash; nothing else
   remembers where the fan is.

     location.hash  ->  Suite.nav.current()  ->  { screen, path }
                                   |
                  painted here:    v   the nav's current item, which header the
                                       screen wears, the screen's heading, focus
                  handled by app:      Suite.nav.on(fn) - which content shows

   Which header a screen wears is a product rule (decision 0023), stated once
   in SCREENS: the compact SUITE header on Home and Game, the team masthead
   on the team-centric sections. Schedule has no primary nav item; it is
   reached from Home and More.

   This file names no team and no provider. */

var Suite = Suite || {};

Suite.nav = (function () {
  "use strict";

  var SCREENS = {
    home:     { header: "bar",  title: "Home"     },
    top25:    { header: "mast", title: "Top 25"   },
    game:     { header: "bar",  title: "Game"     },
    roster:   { header: "mast", title: "Roster"   },
    more:     { header: "mast", title: "More"     },
    schedule: { header: "mast", title: "Schedule" }
  };
  var DEFAULT = "home";
  var listeners = [];
  var last = null;

  function $(id) { return document.getElementById(id); }

  // "#top25/rankings/ap" -> { screen: "top25", path: ["rankings", "ap"] }.
  // Anything unknown is Home: an old bookmark or a typo still opens the app.
  function parse(hash) {
    var parts = String(hash || "").replace(/^#\/?/, "").split("/").filter(Boolean)
      .map(function (p) { return p.toLowerCase(); });
    var screen = SCREENS[parts[0]] ? parts[0] : DEFAULT;
    return { screen: screen, path: SCREENS[parts[0]] ? parts.slice(1) : [] };
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

  function paint(route) {
    var def = SCREENS[route.screen];

    // The nav: one current item, or none (Schedule has no item of its own).
    [].slice.call(document.querySelectorAll(".nav-item[data-screen]")).forEach(function (a) {
      if (a.getAttribute("data-screen") === route.screen) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });

    // The header this screen wears, and the one heading that names it.
    var bar = $("appBar"), mast = $("masthead"), mastTitle = $("mastTitle"), sr = $("screenHead");
    var masthead = def.header === "mast";
    if (bar)  bar.hidden = masthead;
    if (mast) mast.hidden = !masthead;
    if (mastTitle) mastTitle.textContent = masthead ? def.title : "";
    if (sr) { sr.textContent = masthead ? "" : def.title; sr.hidden = masthead; }
  }

  // After a navigation - not on first load - focus moves to the new screen's
  // heading, so keyboard and screen-reader users start there rather than on
  // a nav link that no longer describes what is on screen.
  function focusHeading(route) {
    var def = SCREENS[route.screen];
    var h = $(def.header === "mast" ? "mastTitle" : "screenHead");
    if (h && h.focus) { h.focus({ preventScroll: true }); }
    window.scrollTo(0, 0);
  }

  function apply(first) {
    var route = current();
    var changed = !last || last.screen !== route.screen || last.path.join("/") !== route.path.join("/");
    last = route;
    paint(route);
    listeners.forEach(function (fn) { fn(route, first); });
    if (!first && changed) focusHeading(route);
  }

  // The live Game control: while the team's game is live, Game is the raised
  // circle wherever the fan is, and says so to assistive technology too.
  function setLive(on) {
    var nav = $("navbar"), note = $("navLive");
    if (nav) nav.classList.toggle("is-live", !!on);
    if (note) note.textContent = on ? ", live now" : "";
  }

  function on(fn) { listeners.push(fn); }

  function start() {
    window.addEventListener("hashchange", function () { apply(false); });
    apply(true);
  }

  return { SCREENS: SCREENS, parse: parse, current: current, href: href, go: go,
           on: on, start: start, setLive: setLive };
})();
