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

   The canonical chooser (decision 0023) labels both groups - AVAILABLE TEAMS
   and COMING SOON - and shows each program's nickname under its name rather
   than its conference. Conference is still searchable; it just does not
   decorate 138 rows. There is no program count: a fan wants their team, not
   a tally.

   Filtering hides items rather than re-rendering them. Rebuilding on every
   keystroke would throw away the focused input, and there are 138 items to
   rebuild; each carries its own search text in data-find and data-forms.

   Choosing navigates to ?team=<id>. That is one line of work and it buys a
   lot: the boot script's existing path runs from the top with a team, the
   choice is stored where every later visit reads it, the URL is shareable and
   installable, and the back button behaves. Rendering the Suite in place
   would mean a second way to start the application.

   The page wears the Suite's own chrome - nobody's colours - because the
   fan has not told us whose to use yet. A program's mark is the provider's
   logo, named by TeamOS; it falls back to the program's initials. */

(function () {
  "use strict";

  var REG = TeamOS.registry.create(typeof TEAM_REGISTRY !== "undefined" ? TEAM_REGISTRY : []);

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* ---- search --------------------------------------------------------

     Three things a fan types, and one thing they do not.

     They type PART of a name: "notre", "penn". They type a SHORT FORM: "ND",
     "OSU", "Buckeyes", "Big 10". They type it in whatever case and
     punctuation they like: "hawaii" for Hawai'i, "texas am" for Texas A&M.
     What they do not type is a fragment from the middle of a word - so
     matching on one is how "nd" came back with Indiana, Maryland, Vanderbilt
     and four others, which is the whole reason this is not a substring test
     any more.

     A program is matched when EVERY word of the query matches it, and a word
     of the query matches when it either begins a word of the program, or is
     one of the program's short forms exactly. Requiring every word is what
     keeps "ohio state" off Ohio; matching at the start of a word rather than
     anywhere inside one is what keeps "nd" off Indiana; taking short forms
     only in full is what stops two-letter codes matching everything.

     Nothing here is typed by hand. The short forms are the provider's own
     abbreviation and nickname, which arrive with the roster (decision 0017),
     plus the initials of the name. The one table below is numerals, because
     a conference spelled "Big Ten" is said "Big 10". */

  function fold(s) {
    var t = String(s == null ? "" : s).toLowerCase();
    // U+0300-U+036F is the combining-marks block NFD leaves behind, so
    // "San Jose" matches San Jose State however the fan spells it.
    if (t.normalize) t = t.normalize("NFD").replace(/[̀-ͯ]/g, "");
    return t;
  }

  /* "Big Ten" is said "Big 10", and "Big 12" is said "Big twelve". Both
     spellings go in, so whichever the fan types is already there. This is the
     only hand-written table in the search, it is two entries long, and it is
     about numerals rather than about any team. */
  var SAID = { ten: "10", 10: "ten", twelve: "12", 12: "twelve" };

  /* The words of a program: every run of letters and digits, plus each
     space-separated chunk with its punctuation closed up, plus the whole
     string closed up.

     The closed-up forms are what let a fan type it the way they say it:
     "Hawai'i" gives "hawaii", "A&M" gives "am", "Miami (OH)" gives "oh", and
     "Pac-12 Conference" gives "pac12". Without them the apostrophe splits
     Hawai'i into "hawai" and "i", and "hawaii" matches neither. */
  function wordsOf(text) {
    var out = [], t = fold(text);
    var whole = t.replace(/[^a-z0-9]+/g, "");
    if (whole) out.push(whole);
    t.split(/\s+/).forEach(function (chunk) {
      var closed = chunk.replace(/[^a-z0-9]+/g, "");
      if (closed) out.push(closed);
      chunk.split(/[^a-z0-9]+/).forEach(function (w) {
        if (!w) return;
        out.push(w);
        if (SAID[w]) out.push(SAID[w]);
      });
    });
    return out;
  }

  /* The short forms a program answers to IN FULL: the provider's own
     abbreviation ("OSU", "TA&M" -> "tam"), the initials of its name
     ("Notre Dame" -> "nd"), and those initials with the U a fan adds when
     they say a school's name out loud ("Ohio State" -> "osu").

     Exact-match only. As prefixes these would be noise - "nd" begins
     nothing, but two letters matched loosely begin half the roster. */
  function initialsOf(text) {
    return fold(text).split(/[^a-z0-9]+/)
      .filter(function (w) { return w; })
      .map(function (w) { return w.charAt(0); }).join("");
  }

  /* The four conference abbreviations initials cannot produce, because the
     letters are not the first letters of anything: the SEC is the
     SouthEastern Conference, C-USA closes up a word that initials would drop,
     B1G is a spelling of Big Ten, and the American is still said AAC from
     when it was the American Athletic.

     ACC, MAC, MWC and SBC are NOT here - they fall out of the initials for
     free. This list is only what cannot be derived, it names no team, and if
     ESPN renames a conference an entry simply stops applying while the
     derived initials keep working. */
  var CONF_SAID = [
    [/southeastern/, "sec"],
    [/conference usa/, "cusa"],
    [/big ten/, "b1g"],
    [/^american/, "aac"]
  ];

  function formsOf(t) {
    var out = [];
    if (t.abbr) out.push(fold(t.abbr).replace(/[^a-z0-9]+/g, ""));

    // The initials of the name, and those initials with the U a fan adds
    // when they say a school out loud: Ohio State -> "os", "osu".
    var initials = initialsOf(t.name);
    if (initials.length > 1) { out.push(initials); out.push(initials + "u"); }

    // The conference, with and without the word "Conference" - "Atlantic
    // Coast Conference" answers to both "acc" and "ac".
    var conf = fold(t.conference || "");
    var ci = initialsOf(conf);
    if (ci.length > 1) out.push(ci);
    var noWord = initialsOf(conf.replace(/conference/g, ""));
    if (noWord.length > 1) out.push(noWord);
    CONF_SAID.forEach(function (pair) {
      if (pair[0].test(conf)) out.push(pair[1]);
    });
    return out;
  }

  // Everything a program can be found by, as two attributes on its row: the
  // words, and the forms. Parsed once when the list is wired, not per
  // keystroke.
  function searchAttrs(t) {
    var words = wordsOf(t.name).concat(wordsOf(t.conference));
    if (t.nick) words = words.concat(wordsOf(t.nick));
    var seen = {};
    words = words.filter(function (w) { return seen[w] ? false : (seen[w] = true); });
    var forms = formsOf(t).filter(function (f) { return f; });
    return ' data-find="' + esc(words.join(" ")) + '"' +
           ' data-forms="' + esc(forms.join(" ")) + '"';
  }

  function queryWords(q) {
    return fold(q).split(/[^a-z0-9]+/).filter(function (w) { return w; });
  }

  function queryWhole(q) {
    return fold(q).replace(/[^a-z0-9]+/g, "");
  }

  /* Every word of the query has to land, or the program is not a match.

     The whole query is tried against the short forms first, because a short
     form can contain punctuation and would otherwise be torn in half before
     it is ever compared: ESPN writes Texas A&M's abbreviation "TA&M" and
     Miami (OH)'s "M-OH", which split into ["ta","m"] and ["m","oh"] and
     match neither the form nor any word. */
  function wordHits(row, q) {
    if (row.forms.indexOf(q) !== -1) return true;
    return row.words.some(function (w) { return w.lastIndexOf(q, 0) === 0; });
  }

  function matches(row, words, whole) {
    if (whole && row.forms.indexOf(whole) !== -1) return true;
    return words.every(function (q) { return wordHits(row, q); });
  }

  /* The safety net. If nothing matches at all, look inside words rather than
     only at their start, so a fan who types "bama" is shown Alabama instead
     of an empty page. It runs ONLY when the strict pass found nothing, so it
     cannot loosen a query that already worked - which is what made plain
     substring matching bad in the first place. */
  function looseMatches(row, words) {
    return words.every(function (q) {
      return row.blob.indexOf(q) !== -1;
    });
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



  // What shows under a program's name: its nickname, which is how fans
  // know it, or - for the rare row without one - its conference.
  function subline(t) {
    return t.nick || confLabel(t.conference);
  }

  function markFor(t) {
    var ui = typeof Suite !== "undefined" && Suite.ui;
    var url = (TeamOS.espn && TeamOS.espn.mark) ? TeamOS.espn.mark(t.providerId) : null;
    return ui ? ui.mark(url, t.name, t.abbr, "plain") : "";
  }

  var CHEVRON = '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m9 5 7 7-7 7"/></svg>';

  // A program you can open: a control, full width, with somewhere to go.
  function openable(t) {
    return '<li data-group="open"' + searchAttrs(t) + '>' +
           '<button type="button" class="pick" data-team="' + esc(t.id) + '">' +
             markFor(t) +
             '<span class="pick-main">' +
               '<span class="pick-name">' + esc(t.name) + "</span>" +
               '<span class="pick-nick">' + esc(subline(t)) + "</span>" +
             "</span>" + CHEVRON +
           "</button></li>";
  }

  // A program that is not built yet: not a control at all. No button, no tab
  // stop, nothing that invites a press that would do nothing.
  function unbuilt(t) {
    return '<li class="soon" data-group="soon"' + searchAttrs(t) + '>' +
           '<span class="soon-name">' + esc(t.name) + "</span>" +
           '<span class="soon-nick">' + esc(subline(t)) + "</span></li>";
  }

  // ---- filtering ---------------------------------------------------------
  function wire(host) {
    var input = host.querySelector("#teamSearch");
    var count = host.querySelector(".chooser-count");
    var none = host.querySelector(".chooser-empty");
    if (!input) return;

    // One query. An item carries data-find; the heading and list that frame
    // it do not. That is the whole difference, so it is the whole test.
    var nodes = [].slice.call(host.querySelectorAll("[data-group]"));
    var items = nodes.filter(function (n) { return n.getAttribute("data-find"); });
    var blocks = nodes.filter(function (n) { return !n.getAttribute("data-find"); });

    // Parse each row's search text ONCE. Splitting 138 attributes on every
    // keystroke is work nobody asked for.
    var index = items.map(function (n) {
      var words = n.getAttribute("data-find").split(" ");
      return { node: n, words: words,
               forms: (n.getAttribute("data-forms") || "").split(" "),
               blob: words.join("") };
    });

    function apply() {
      var words = queryWords(input.value), whole = queryWhole(input.value);
      var shown = 0;

      // Strict first. Only if it finds nothing does the loose pass run, so a
      // query that already works is never widened.
      var hits = null;
      if (words.length) {
        /* A word no program has ever heard of is dropped rather than allowed
           to veto the rest: "notre dame football" is a fan looking for Notre
           Dame, not a fan looking for nothing. If NO word survives, the
           original query stands so that a genuine miss still reports a miss
           rather than quietly showing the whole roster. */
        var useful = words.filter(function (q) {
          return index.some(function (row) { return wordHits(row, q); });
        });
        var use = useful.length ? useful : words;

        hits = index.filter(function (row) { return matches(row, use, whole); });
        if (!hits.length) {
          hits = index.filter(function (row) { return looseMatches(row, use); });
        }
      }

      index.forEach(function (row) {
        var hit = !hits || hits.indexOf(row) !== -1;
        row.node.hidden = !hit;
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
      });
      if (none) none.hidden = shown !== 0;
      if (count) {
        count.textContent = !words.length ? ""
          : shown === 0 ? "No program matches that."
          : shown + (shown === 1 ? " program matches." : " programs match.");
      }
    }

    input.addEventListener("input", apply);
    apply();
  }

  var SEARCH_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>';

  function render() {
    var host = document.getElementById("main");
    if (!host) return;

    var all = REG.sorted();
    var open = all.filter(function (t) { return t.available; });
    var soon = all.filter(function (t) { return !t.available; });

    var html =
      '<section class="chooser" aria-labelledby="chooseHead">' +
        '<h1 id="chooseHead">Find Your Team</h1>' +
        '<p class="chooser-sub">' +
          (open.length ? "Choose your team to get started." : "No team is ready to open yet.") +
        "</p>";

    if (all.length) {
      html +=
        '<div class="chooser-search">' + SEARCH_ICON +
          '<label class="sr-only" for="teamSearch">Search by team, conference or mascot</label>' +
          '<input id="teamSearch" type="search" autocomplete="off" autocorrect="off" ' +
                 'spellcheck="false" placeholder="Search by team, conference, mascot\u2026">' +
        "</div>" +
        // Silent at rest; it speaks only to report what a search found.
        '<p class="chooser-count" role="status" aria-live="polite"></p>';
    }

    if (open.length) {
      html += '<h2 class="eyebrow" id="availHead" data-group="open">Available Teams</h2>' +
              '<ul class="chooser-list" data-group="open" aria-labelledby="availHead">' +
              open.map(openable).join("") + "</ul>";
    }

    if (soon.length) {
      html += '<hr class="chooser-divider" data-group="soon">' +
              '<h2 class="eyebrow" id="soonHead" data-group="soon">Coming Soon</h2>' +
              '<ul class="chooser-soon" data-group="soon" aria-labelledby="soonHead">' +
              soon.map(unbuilt).join("") + "</ul>";
    }

    html +=
      '<p class="chooser-empty" hidden>Nothing matches that. Try a team name, a mascot, or a ' +
        "conference like “Big Ten”.</p>" +
      "</section>";

    /* The Suite's own team furniture is not ours: there is no team to put in
       it, so a masthead or a bottom nav would be either somebody's or
       nobody's, and both are wrong (decision 0016). Everything inside #main
       goes on its own, because the chooser writes over #main wholesale two
       lines down. The nav and the masthead are siblings of #main, so they
       survive unless they are removed by name - which is how a fan once saw
       Home / Top 25 / Game with no team behind any of them. The SUITE header
       and the skip link stay: both are the Suite's, and #main is still there
       for the skip link to reach. */
    [".navbar", "#masthead"].forEach(function (sel) {
      [].slice.call(document.querySelectorAll(sel)).forEach(function (el) {
        // Never remove the chooser's own host, or anything containing it.
        if (el === host || (el.contains && el.contains(host))) return;
        if (el.parentNode) el.parentNode.removeChild(el);
      });
    });

    host.innerHTML = html;

    // Changing team, rather than choosing a first one: the fan already has a
    // team, and gets a way back to it that changes nothing (decision 0022 #7).
    // First-time onboarding has no current team and so no Cancel.
    var current = document.documentElement && document.documentElement.getAttribute
      ? document.documentElement.getAttribute("data-current-team") : null;
    if (current && !REG.isAvailable(current)) current = null;

    // The header's search control has one job on this page: take the fan to
    // the search box. It exists only here, where search exists.
    var bar = document.getElementById("appBar");
    if (bar && bar.insertAdjacentHTML && !document.getElementById("barSearch")) {
      bar.insertAdjacentHTML("beforeend",
        '<button type="button" class="icon-btn" id="barSearch" aria-label="Search teams">' + SEARCH_ICON + "</button>");
      document.getElementById("barSearch").addEventListener("click", function () {
        var box = document.getElementById("teamSearch");
        if (box) box.focus();
      });
      if (current) {
        bar.insertAdjacentHTML("beforeend",
          '<button type="button" class="bar-text-btn" id="cancelChange">Cancel</button>');
        document.getElementById("cancelChange").addEventListener("click", function () {
          // Back to exactly where the fan came from when that was this Suite;
          // otherwise to the current team. Either way nothing was changed.
          var ref = document.referrer || "";
          if (history.length > 1 && ref.indexOf(location.origin) === 0) history.back();
          else location.replace("?team=" + encodeURIComponent(current));
        });
      }
    }

    host.addEventListener("click", function (e) {
      var btn = e.target.closest ? e.target.closest(".pick[data-team]") : null;
      if (btn) choose(btn.getAttribute("data-team"));
    });

    wire(host);
    document.title = "Find Your Team \u00b7 Suite";
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
})();
