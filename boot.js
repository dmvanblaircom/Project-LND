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
     3. the default below.

   Only an explicit choice is remembered. Falling back to the default must not
   write anything down, or every existing visitor would be silently locked to
   it and would never see the chooser that Phase 7B puts in its place. */

var LND = (function () {
  "use strict";

  var KEY = "lnd.team";

  // Phase 7A keeps the shipped product's behaviour exactly: no URL, nothing
  // remembered, you get Irish Watch. Phase 7B replaces this with the chooser.
  var DEFAULT_TEAM = "notre-dame";

  // A team id is a folder-safe slug and nothing else. This is what stops
  // "../../something" or a query string from being turned into a script src.
  function valid(id) {
    return typeof id === "string" && /^[a-z0-9][a-z0-9-]{0,40}$/.test(id);
  }

  function requested() {
    var m = /[?&]team=([^&#]*)/.exec(location.search);
    if (!m) return null;
    var id;
    try { id = decodeURIComponent(m[1]); } catch (e) { return null; }
    return valid(id) ? id : null;
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
    var saved = stored();
    if (saved) return saved;
    return DEFAULT_TEAM;
  }

  var team = resolve();
  load(team, true);

  return {
    team: team,
    key: KEY,
    defaultTeam: DEFAULT_TEAM,
    valid: valid,
    remember: remember,
    forget: forget,
    failed: null
  };
})();
