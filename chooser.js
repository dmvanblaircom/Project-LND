/* The team chooser.

   What a fan sees the first time they arrive having asked for nobody in
   particular. There is no team yet, so there is no Suite: app.js is never
   loaded, because it reads TEAM_CONFIG as it parses and there is none
   (decision 0016).

   Everything here comes from the registry (decision 0014). A program is
   openable because it names a config; one that does not is still shown,
   because "we know about your team and cannot open it yet" is a truthful and
   useful thing to say, where leaving it out reads as "your team does not
   exist".

   The list is ONE alphabetical run, not conference sections. Conference is
   shown on every program and is searchable, but it does not organise the
   page: with 138 programs and a search box, a fan looking for their team
   types its name and a fan browsing reads A-Z. Conference sections made this
   eleven short lists in the provider's own arbitrary order, and asked the fan
   to know their team's 2026 conference to find it.

   OPENABLE AND UNBUILT ARE TWO DIFFERENT KINDS OF THING, so they are drawn as
   two different kinds of thing rather than the same row at two opacities.
   What you can open is a full-width row: a real control, with an arrow, that
   responds to a pointer. What is not built yet is a small card in a dense
   grid under "Coming soon" - not a button, not focusable, nothing to click at
   and get nothing. Dimming 136 of 138 rows made the page read as mostly
   broken, and stacking them full width made it a quarter-mile of scroll.

   Nothing labels the openable group. It is the top of the page, it is what
   the heading is asking about, and a fan does not need to be told that the
   thing they can press is the thing they can press. The list carries an
   aria-label so it is not anonymous to a screen reader.

   Filtering hides items rather than re-rendering them. Rebuilding on every
   keystroke would throw away the focused input, and there are 138 items to
   rebuild; each carries its own haystack in data-find.

   Choosing navigates to ?team=<id>. That is one line of work and it buys a
   lot: the boot script's existing path runs from the top with a team, the
   choice is stored where every later visit reads it, the URL is shareable and
   installable, and the back button behaves. Rendering the Suite in place
   would mean a second way to start the application.

   The page is painted in the neutral :root - nobody's colours - because the
   fan has not told us whose to use yet. */

(function () {
  "use strict";

  var REG = TeamOS.registry.create(typeof TEAM_REGISTRY !== "undefined" ? TEAM_REGISTRY : []);

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* What a search term and a program are both reduced to before they are
     compared: letters and digits only, accents stripped, everything else
     gone. A fan types what they say, not what the provider spells, and the
     provider spells Hawai'i, Miami (OH), Texas A&M, and San Jose State with
     an accent on the e.

     Punctuation is REMOVED, not turned into a space. Turning it into one
     looks tidier and is wrong: it leaves "hawai i", which "hawaii" never
     matches - and "hawaii" is what a fan types. Dropping the spaces as well
     costs nothing real, because the haystack is squashed the same way.
     U+0300-U+036F is the combining-marks block that NFD leaves behind. */
  function squash(s, ampersandIsAnd) {
    var t = String(s == null ? "" : s).toLowerCase();
    if (t.normalize) t = t.normalize("NFD").replace(/[̀-ͯ]/g, "");
    if (ampersandIsAnd) t = t.replace(/&/g, " and ");
    return t.replace(/[^a-z0-9]+/g, "");
  }

  /* An ampersand is the one character a fan might reasonably type either way,
     so a program carries both readings: "texasam" and "texasandm". They are
     joined by a space, and a squashed query contains no space, so it cannot
     match across the join - two haystacks in one attribute. */
  function haystack(t) {
    var s = t.name + " " + t.conference;
    var plain = squash(s, false), spelled = squash(s, true);
    return plain === spelled ? plain : plain + " " + spelled;
  }

  /* "Mountain West Conference" reads as "Mountain West"; the word adds width
     138 times and no information. Conference USA and FBS Independents do not
     end in it and are left alone. Only the DISPLAY is trimmed - data-find
     keeps the full name, so the trimmed form is a substring of it and a fan
     who types either still matches. */
  function confLabel(c) {
    return String(c || "").replace(/ Conference$/, "");
  }

  function choose(id) {
    try { localStorage.setItem("iw-team", id); } catch (e) {}
    // replace, not assign: the chooser is not a page anyone wants to come
    // back to with the browser's back button.
    location.replace("?team=" + encodeURIComponent(id));
  }

  function find(t) {
    return ' data-find="' + esc(haystack(t)) + '"';
  }

  // A program you can open: a control, full width, with somewhere to go.
  function openable(t) {
    return '<li data-group="open"' + find(t) + '>' +
           '<button type="button" class="pick" data-team="' + esc(t.id) + '">' +
             '<span class="pick-main">' +
               '<span class="pick-name">' + esc(t.name) + "</span>" +
               '<span class="pick-conf">' + esc(confLabel(t.conference)) + "</span>" +
             "</span>" +
             '<span class="pick-go" aria-hidden="true">→</span>' +
           "</button></li>";
  }

  // A program that is not built yet: not a control at all. No button, no tab
  // stop, nothing that invites a press that would do nothing.
  function unbuilt(t) {
    return '<li class="soon" data-group="soon"' + find(t) + '>' +
           '<span class="soon-name">' + esc(t.name) + "</span>" +
           '<span class="soon-conf">' + esc(confLabel(t.conference)) + "</span></li>";
  }

  // ---- filtering ---------------------------------------------------------
  function wire(host, resting) {
    var input = host.querySelector("#teamSearch");
    var count = host.querySelector(".chooser-count");
    var none = host.querySelector(".chooser-empty");
    if (!input) return;

    // One query. An item carries data-find; the heading and list that frame
    // it do not. That is the whole difference, so it is the whole test.
    var nodes = [].slice.call(host.querySelectorAll("[data-group]"));
    var items = nodes.filter(function (n) { return n.getAttribute("data-find"); });
    var blocks = nodes.filter(function (n) { return !n.getAttribute("data-find"); });

    function apply() {
      var q = squash(input.value, false);
      var shown = 0;
      items.forEach(function (it) {
        var hit = !q || it.getAttribute("data-find").indexOf(q) !== -1;
        it.hidden = !hit;
        if (hit) shown++;
      });
      // A section with nothing left in it takes its heading with it, and a
      // section that still has something says how much of it is left - a
      // heading reading "136 programs" over seventeen of them is a lie the
      // fan can see.
      blocks.forEach(function (b) {
        var g = b.getAttribute("data-group");
        var left = items.filter(function (it) {
          return it.getAttribute("data-group") === g && !it.hidden;
        }).length;
        b.hidden = left === 0;
        if (b.getAttribute("data-note")) {
          b.textContent = left + (left === 1 ? " program" : " programs");
        }
      });
      if (none) none.hidden = shown !== 0;
      if (count) {
        count.textContent = !q ? resting
          : shown === 0 ? "No program matches that."
          : shown + (shown === 1 ? " program matches." : " programs match.");
      }
    }

    input.addEventListener("input", apply);
    apply();
  }

  function render() {
    var host = document.querySelector(".wrap");
    if (!host) return;

    var all = REG.sorted();
    var open = all.filter(function (t) { return t.available; });
    var soon = all.filter(function (t) { return !t.available; });
    var resting = all.length + (all.length === 1 ? " program." : " programs.");

    var html =
      '<section class="chooser" aria-labelledby="chooseHead">' +
        '<h1 id="chooseHead">Pick your team</h1>' +
        '<p class="chooser-sub">' +
          (open.length
            ? "Your team, every day. Choose one to get started — you can change it later."
            : "No team is ready to open yet.") +
        "</p>";

    if (all.length) {
      html +=
        '<div class="chooser-search">' +
          '<label class="sr-only" for="teamSearch">Search programs by name or conference</label>' +
          '<input id="teamSearch" type="search" autocomplete="off" autocorrect="off" ' +
                 'spellcheck="false" placeholder="Search a team or conference">' +
        "</div>" +
        '<p class="chooser-count" role="status" aria-live="polite">' + esc(resting) + "</p>";
    }

    // No heading over this one on purpose: it is what the page is asking.
    if (open.length) {
      html += '<ul class="chooser-list" data-group="open" ' +
              'aria-label="Programs you can open now">' +
              open.map(openable).join("") + "</ul>";
    }

    if (soon.length) {
      html += '<h2 class="chooser-group" data-group="soon">Coming soon ' +
              '<span class="chooser-groupnote" data-group="soon" data-note="1">' +
              soon.length + " programs</span></h2>" +
              '<ul class="chooser-soon" data-group="soon" ' +
              'aria-label="Programs not built yet">' + soon.map(unbuilt).join("") + "</ul>";
    }

    html +=
      '<p class="chooser-empty" hidden>Nothing matches that. Try a team name, or a ' +
        "conference like “Big Ten”.</p>" +
      "</section>";

    /* The Suite's own furniture is not ours: there is no team to put in it,
       so a header, hero, odds strip or tab bar would be either somebody's or
       nobody's, and both are wrong.

       Everything inside .wrap goes on its own, because the chooser writes
       over .wrap wholesale two lines down. The tab bar and the skip link do
       NOT - they are siblings of the page, not children of it, so they
       survive unless they are removed by name. That is how a fan ended up
       looking at Home / Top 25 / Game / Depth / News on a page with no team
       behind any of them. */
    [".tabbar", '[role="tablist"]', "a.skip"].forEach(function (sel) {
      [].slice.call(document.querySelectorAll(sel)).forEach(function (el) {
        // Never remove the chooser's own host, or anything containing it.
        if (el === host || (el.contains && el.contains(host))) return;
        if (el.parentNode) el.parentNode.removeChild(el);
      });
    });

    host.innerHTML = html;

    host.addEventListener("click", function (e) {
      var btn = e.target.closest ? e.target.closest(".pick[data-team]") : null;
      if (btn) choose(btn.getAttribute("data-team"));
    });

    wire(host, resting);
    document.title = "Pick your team";
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
})();
