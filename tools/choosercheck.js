#!/usr/bin/env node
/* Does the chooser offer the right teams, only the right teams, and can a fan
   find theirs among 138?

   Three things have to hold. Every program it presents as openable must
   actually open - offering one the Suite cannot render is a dead end on the
   first screen. Every program the registry knows must appear, even the unbuilt
   ones, because "we know about your team and cannot open it yet" is useful
   where silence reads as "your team is not here". And search has to find a
   program by the things a fan would actually type: its name, its conference,
   and either of those without the punctuation and accents the provider spells
   them with.

   chooser.js is run against a stubbed document - no browser, no network. The
   stub is small but real enough to matter: it parses the markup the chooser
   wrote into nodes that can be hidden, so typing into the search box and
   reading back what is left is a real test of the wiring rather than a test
   of a string.

   Usage:  node tools/choosercheck.js
   Exit status is 1 if anything fails, so it can gate a push. */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");

var root = path.join(__dirname, "..");
function read(p) { return fs.readFileSync(path.join(root, p), "utf8"); }

var failures = 0;
function ok(cond, what) {
  if (cond) { console.log("  ok   " + what); return; }
  failures++; console.log("  FAIL " + what);
}
function eq(a, b, what) { ok(JSON.stringify(a) === JSON.stringify(b), what + " = " + JSON.stringify(b)); }

// ---- the page, stubbed -------------------------------------------------
function unesc(s) {
  return String(s).replace(/&lt;/g, "<").replace(/&gt;/g, ">")
                  .replace(/&quot;/g, '"').replace(/&amp;/g, "&");
}
function attr(tag, name) {
  var m = tag.match(new RegExp(name + '="([^"]*)"'));
  return m ? unesc(m[1]) : null;
}

// A node the chooser can hide and read attributes off. That is the entire
// surface chooser.js uses on a list item, so it is the entire stub.
function node(tag, text) {
  return { tag: tag, text: text, hidden: false, textContent: "",
           getAttribute: function (n) { return attr(tag, n); } };
}

function render(registry) {
  var wrap = { innerHTML: "", listeners: {}, nodes: [], input: null, count: null, empty: null,
    addEventListener: function (ev, fn) { this.listeners[ev] = fn; },
    querySelectorAll: function (sel) {
      if (sel !== "[data-group]") throw new Error("stub does not implement " + sel);
      return this.nodes;
    },
    querySelector: function (sel) {
      if (sel === "#teamSearch") return this.input;
      if (sel === ".chooser-count") return this.count;
      if (sel === ".chooser-empty") return this.empty;
      throw new Error("stub does not implement " + sel);
    } };

  // Setting innerHTML is what builds the stub's nodes, the same way a browser
  // would. Everything after this reads them, never the string.
  Object.defineProperty(wrap, "innerHTML", {
    get: function () { return this._html || ""; },
    set: function (html) {
      this._html = html;
      this.nodes = (html.match(/<(?:ul|h2|hr|li|span)\b[^>]*data-group="[^"]*"[^>]*>/g) || [])
        .map(function (t) { return node(t); });
      this.input = /id="teamSearch"/.test(html)
        ? { value: "", listeners: {},
            addEventListener: function (ev, fn) { this.listeners[ev] = fn; } }
        : null;
      this.count = /class="chooser-count"/.test(html) ? node("", "") : null;
      this.empty = /class="chooser-empty"/.test(html) ? node("", "") : null;
    }
  });

  var removed = [], stored = {}, replaced = null;

  // The Suite furniture that is NOT inside #main, which is the only kind the
  // chooser has to remove by hand - the kind that once survived for a release
  // because the old code only ever looked inside the page.
  var outside = [
    { sel: ".navbar", what: "the bottom nav" },
    { sel: "#masthead", what: "the team masthead" },
    { sel: "a.skip", what: "the skip link" }
  ].map(function (f) {
    var node = { what: f.what, sel: f.sel, gone: false, contains: function () { return false; } };
    node.parentNode = { removeChild: function () { node.gone = true; removed.push(node.what); } };
    return node;
  });

  var doc = {
    title: "", readyState: "complete",
    querySelector: function (sel) { return null; },
    querySelectorAll: function (sel) {
      return outside.filter(function (n) { return n.sel === sel && !n.gone; });
    },
    getElementById: function (id) {
      if (id === "main") return wrap;
      return null;
    },
    addEventListener: function () {}
  };

  vm.runInNewContext(read("teamos/registry.js") + "\n" + read("teamos/espn.js") + "\n" +
                    read("suite/ui.js") + "\n" + read("chooser.js"), {
    document: doc,
    location: { replace: function (u) { replaced = u; } },
    localStorage: { setItem: function (k, v) { stored[k] = v; },
                    getItem: function (k) { return stored[k] || null; } },
    TEAM_REGISTRY: registry,
    console: console
  }, { filename: "chooser" });

  // Read the markup back per <li>: an item contains nested spans, so a
  // non-greedy match on the outer tag stops at the first inner </span> and
  // silently produces nonsense. That made this file pass on a broken build.
  var html = wrap.innerHTML;
  var picks = (html.match(/<li[\s\S]*?<\/li>/g) || []).map(function (li) {
    return {
      name: unesc((li.match(/<span class="(?:pick-name|soon-name)">([^<]*)</) || [, ""])[1]),
      nick: unesc((li.match(/<span class="(?:pick-nick|soon-nick)">([^<]*)</) || [, ""])[1]),
      marked: /<span class="mark /.test(li),
      markUrl: (li.match(/<img src="([^"]*)"/) || [, null])[1],
      id: attr(li, "data-team"),
      group: attr(li, "data-group"),
      openable: /<button[^>]*class="pick"/.test(li)
    };
  });

  function visible() {
    var shown = {};
    wrap.nodes.forEach(function (n) {
      var f = n.getAttribute("data-find");
      if (f && !n.hidden) shown[f] = true;
    });
    return picks.filter(function (p, i) {
      var n = wrap.nodes.filter(function (x) { return x.getAttribute("data-find"); })[i];
      return n && !n.hidden;
    });
  }

  return {
    html: html, picks: picks, title: doc.title, removed: removed, stored: stored,
    outside: outside,
    nodes: wrap.nodes,
    search: function (q) {
      if (!wrap.input) throw new Error("no search box was rendered");
      wrap.input.value = q;
      wrap.input.listeners.input();
      return {
        names: visible().map(function (p) { return p.name; }),
        count: wrap.count ? wrap.count.textContent : null,
        empty: wrap.empty ? !wrap.empty.hidden : null,
        headings: wrap.nodes.filter(function (n) {
          return /^<h2/.test(n.tag) && !n.hidden;
        }).map(function (n) { return n.getAttribute("data-group"); }),
      };
    },
    click: function (id) {
      wrap.listeners.click({ target: { closest: function (sel) {
        if (!/pick/.test(sel)) return null;
        var hit = picks.filter(function (p) { return p.id === id && p.openable; })[0];
        return hit ? { getAttribute: function () { return hit.id; } } : null;
      } } });
      return { stored: stored, replaced: replaced };
    }
  };
}

// The repository's own registry, and synthetic ones for the edge cases.
var live = vm.createContext({});
vm.runInContext(read("teams/index.js"), live, { filename: "teams/index.js" });
var regCtx = vm.createContext({});
vm.runInContext(read("teamos/registry.js"), regCtx);
var REGLIVE = regCtx.TeamOS.registry.create(live.TEAM_REGISTRY);

console.log("the real registry");
// Structural: the registry is generated, so asserting a fixed roster here
// would be a second copy of it to maintain.
var r = render(live.TEAM_REGISTRY);
eq(r.picks.length, REGLIVE.all().length, "every program in the registry is shown");
eq(r.picks.filter(function (p) { return p.openable; }).map(function (p) { return p.id; }).sort(),
   REGLIVE.available().map(function (t) { return t.id; }).sort(),
   "and exactly the ones with a config can be picked");
ok(r.picks.filter(function (p) { return !p.openable; }).length > 0,
   "programs without a config are shown, not hidden");
ok(REGLIVE.all().length > 100, "the roster is a full FBS one, not a stub");
eq(r.title, "Find Your Team \u00b7 Suite", "the tab says what the page is");
ok(/<h1 id="chooseHead">Find Your Team<\/h1>/.test(r.html), "the page asks the canonical question");
ok(/Choose your team to get started\./.test(r.html), "and explains it in a line");

console.log(" one alphabetical run, not conference sections");
var names = r.picks.map(function (p) { return p.name; });
var openNames = r.picks.filter(function (p) { return p.group === "open"; }).map(function (p) { return p.name; });
var soonNames = r.picks.filter(function (p) { return p.group === "soon"; }).map(function (p) { return p.name; });
function sorted(a) {
  return JSON.stringify(a) === JSON.stringify(a.slice().sort(function (x, y) {
    return String(x).localeCompare(String(y), "en", { sensitivity: "base" });
  }));
}
ok(sorted(openNames), "what you can open is A-Z");
ok(sorted(soonNames), "and so is everything else, in one run");
eq(names, openNames.concat(soonNames), "openable programs come first, unbuilt ones after");
eq(r.picks.filter(function (p) { return p.group === "open"; }).length, REGLIVE.available().length,
   "the top group is exactly what can be opened");
// The thing the flat list replaced: a heading per conference.
var confs = {};
REGLIVE.all().forEach(function (t) { confs[t.conference] = true; });
ok(Object.keys(confs).length > 5, "the roster does span many conferences");
eq((r.html.match(/<h2/g) || []).length, 2,
   "two headings - Available Teams and Coming Soon - never one per conference");

console.log(" each program shows its nickname; conference stays searchable");
ok(r.picks.every(function (p) { return p.nick; }), "every program prints a line under its name");
var nd = r.picks.filter(function (p) { return p.id === "notre-dame"; })[0];
eq(nd && nd.nick, "Fighting Irish", "an openable program shows its nickname, as the canonical chooser does");
ok(r.picks.every(function (p) {
  var t = REGLIVE.all().filter(function (x) { return x.name === p.name; })[0];
  return !t || !t.nick || p.nick === t.nick;
}), "and that line is the registry's nickname wherever it has one");
ok(!/ Conference<\/span>/.test(r.html), "a conference never decorates a row as 'Big Ten Conference'");

console.log(" marks: the programs you can open show theirs");
r.picks.filter(function (p) { return p.openable; }).forEach(function (p) {
  ok(p.marked, p.name + " is drawn with its mark");
  ok(!p.markUrl || /^https:\/\//.test(p.markUrl), p.name + "'s logo, when there is one, is TeamOS's provider URL");
});
ok(r.picks.filter(function (p) { return !p.openable; }).every(function (p) { return !p.marked; }),
   "Coming Soon cards carry no mark - they are a list, not a showcase");
ok(/class="initials"/.test(r.html), "every mark carries its initials underneath, so a logo that fails is never a broken image");

console.log(" unbuilt programs are not controls");
// The point of the change. A dimmed button is still a button: it takes a tab
// stop and invites a press that does nothing.
r.picks.filter(function (p) { return !p.openable; }).forEach(function (p) {
  ok(!p.id, p.name + " carries no team id, so nothing can click it");
});
var soonMarkup = (r.html.match(/<li class="soon"[\s\S]*?<\/li>/g) || []);
eq(soonMarkup.length, REGLIVE.all().length - REGLIVE.available().length,
   "every unbuilt program is drawn as a card");
ok(!soonMarkup.some(function (li) { return /<button|tabindex|role="button"/.test(li); }),
   "and not one of them is a button or takes a tab stop");
ok(/>Coming Soon</.test(r.html), "they sit under a heading that says what they are");
ok(/>Available Teams</.test(r.html), "and what you can open sits under its own");
ok(/aria-labelledby="availHead"/.test(r.html) && /aria-labelledby="soonHead"/.test(r.html),
   "each list is named by its heading for a screen reader");
ok(!/\d+ programs?</.test(r.html), "no program count anywhere - a fan wants their team, not a tally");

console.log(" a punctuated name reaches the page as the provider spells it");
// The id is folded and the search haystack is folded; the NAME is not. What
// a fan reads has to be how the program is written - Hawai'i keeps its
// apostrophe, San Jose State keeps its accent, Miami keeps its brackets and
// Texas A&M keeps its ampersand. The ampersand is the one that has to travel
// as &amp; through the markup and come back out as "&", so it is checked
// against the parsed name rather than against the raw HTML.
var punctuated = render([
  { id: "a", name: "Hawai'i", conference: "Mountain West Conference", config: "teams/notre-dame.js" },
  { id: "b", name: "San Jos\u00e9 State", conference: "Mountain West Conference", config: "teams/ohio-state.js" },
  { id: "c", name: "Miami (OH)", conference: "Mid-American Conference" },
  { id: "d", name: "Texas A&M", conference: "Southeastern Conference" }
]);
eq(punctuated.picks.map(function (p) { return p.name; }),
   ["Hawai'i", "San Jos\u00e9 State", "Miami (OH)", "Texas A&M"],
   "every character survives the round trip to the page");
ok(/Texas A&amp;M/.test(punctuated.html),
   "the ampersand is escaped in the markup, which is how it renders as one");
ok(!/Texas A&M</.test(punctuated.html), "and not left raw");
// Whatever search does to a name internally must not reach what is printed.
ok(!/texasam|hawaii|sanjosestate/.test(
     punctuated.html.replace(/data-find="[^"]*"/g, "")),
   "the folded form stays in data-find and never becomes the label");

console.log("search");
var total = REGLIVE.all().length;
function hits(q) { return r.search(q).names; }
eq(hits("").length, total, "an empty box shows every program");
eq(hits("notre"), ["Notre Dame"], "a team is found by the start of its name");
ok(hits("ohio").indexOf("Ohio State") !== -1, "and by a partial first word");
eq(hits("ohio state"), ["Ohio State"],
   "every word has to land, so the second one narrows rather than widens");

console.log(" not a substring match, which is what pulled in the wrong teams");
// The reason this is word-based. As a substring of the squashed roster, "nd"
// matched Indiana, Maryland, Vanderbilt, San Diego State, UConn and Texas A&M
// as well as Notre Dame - every one of them a fragment from the middle of a
// word, which is not a thing a fan types.
eq(hits("nd"), ["Notre Dame"], "a short query lands on the program it abbreviates");
["Indiana", "Maryland", "Vanderbilt", "UConn"].forEach(function (n) {
  ok(hits("nd").indexOf(n) === -1, "and not on " + n + ", which merely contains those letters");
});
// The property underneath those four: when anything matches strictly, the
// programs that only contain the letters somewhere in the middle are left
// out. They come back only when nothing matched at all - see the fallback
// further down.
ok(hits("nd").length === 1, "exactly one program, not seven");

console.log(" the short forms a fan actually types");
// None of these is a hand-written alias. The abbreviation and the nickname
// come from the provider with the roster; the initials are computed.
eq(hits("buckeyes").length && hits("buckeyes")[0], "Ohio State", "a nickname finds its program");
eq(hits("fighting irish"), ["Notre Dame"], "including a nickname of two words");
ok(hits("osu").indexOf("Ohio State") !== -1, "an abbreviation finds its program");
ok(hits("osu").length > 1, "and honestly returns the others that share it (" +
   hits("osu").join(", ") + ")");
ok(hits("msu").indexOf("Michigan State") !== -1 && hits("msu").length > 1,
   "the same for the other crowded one (" + hits("msu").join(", ") + ")");
// An abbreviation carrying punctuation is torn in two by word-splitting, so
// the whole query is tried against the short forms before its words are.
eq(hits("TA&M"), ["Texas A&M"], "an abbreviation with punctuation in it still lands");
ok(hits("M-OH").indexOf("Miami (OH)") !== -1, "and so does the other one");

console.log(" a conference, however it is said");
var bigTen = hits("big ten");
ok(bigTen.length > 10, "a conference finds its programs (" + bigTen.length + ")");
eq(hits("big 10"), bigTen, "said with a numeral it finds exactly the same ones");
eq(hits("b1g"), bigTen, "and so does the spelling nobody can derive");
ok(bigTen.every(function (n) {
  var t = REGLIVE.all().filter(function (x) { return x.name === n; })[0];
  return t && /Big Ten/.test(t.conference);
}), "and nothing outside it");
// ACC, MAC and MWC fall out of the initials; SEC, C-USA and AAC cannot and
// are the short list the code carries.
["sec", "acc", "cusa", "aac", "mac", "mwc"].forEach(function (a) {
  ok(hits(a).length > 5, '"' + a + '" finds a conference (' + hits(a).length + " programs)");
});
eq(hits("pac12"), hits("pac 12"), "a conference written solid matches the same as spaced");

console.log(" the way a fan types, not the way the provider spells");
[["san jose", "San Jos\u00e9 State"], ["san jos\u00e9", "San Jos\u00e9 State"],
 ["miami oh", "Miami (OH)"], ["texas am", "Texas A&M"],
 ["texas a&m", "Texas A&M"], ["hawaii", "Hawai'i"], ["hawai'i", "Hawai'i"]].forEach(function (pair) {
  var known = REGLIVE.all().some(function (t) { return t.name === pair[1]; });
  if (!known) { console.log("  --   " + pair[1] + " is not on this roster, skipped"); return; }
  ok(hits(pair[0]).indexOf(pair[1]) !== -1, '"' + pair[0] + '" finds ' + pair[1]);
});
eq(hits("NOTRE DAME"), ["Notre Dame"], "case does not matter");
eq(hits("  notre   dame  "), ["Notre Dame"], "nor does spacing");

console.log(" open, but not so open it stops meaning anything");
// Two ways to be too restrictive, both fixed, and neither allowed to loosen a
// query that already worked.
eq(hits("notre dame football"), ["Notre Dame"],
   "a word no program has ever heard of is ignored rather than vetoing the rest");
eq(hits("ohio zzzzz"), hits("ohio"), "the words that do mean something still narrow");
ok(hits("bama").indexOf("Alabama") !== -1,
   "a fragment nothing starts with falls back to looking inside words");
eq(hits("zzzzz"), [], "but a query nothing knows at all still reports nothing");
eq(hits("q"), [], "and a single stray letter does not open the floodgates");
// The fallback must not fire when the strict pass already answered.
eq(hits("ohio state"), ["Ohio State"],
   "a query that works strictly is never widened by the fallback");

console.log(" what the page says while filtering");
var hit = r.search("notre");
eq(hit.count, "1 program matches.", "one match is counted in the singular");
eq(hit.empty, false, "and nothing says the search failed");
eq(hit.headings, ["open"], "the Coming Soon heading goes when nothing under it matches");
var miss = r.search("zzzzz");
eq(miss.names, [], "a term matching nothing shows nothing");
eq(miss.count, "No program matches that.", "the count says so");
eq(miss.empty, true, "and the page says what to try instead");
var back = r.search("");
eq(back.names.length, total, "clearing the box brings everything back");
eq(back.count, "", "and the status line goes quiet again - there is no count at rest");
eq(back.headings, ["open", "soon"], "as do both headings");
eq(r.search("akron").headings, ["soon"],
   "a search that only hits unbuilt programs keeps their heading, and drops the other");

console.log(" every program can be found by what it is called");
// The sweep. Not a fixed list - the roster is generated, so this asks the
// registry itself. A program nobody can search for is a program nobody can
// pick.
var unfindable = [];
REGLIVE.all().forEach(function (t) {
  [t.name, t.abbr, t.nick].forEach(function (q) {
    if (q && hits(q).indexOf(t.name) === -1) unfindable.push(JSON.stringify(q) + " -> " + t.name);
  });
});
eq(unfindable, [], "all " + REGLIVE.all().length +
   " programs are found by their name, abbreviation and nickname");
ok(REGLIVE.all().every(function (t) { return t.abbr && t.nick; }),
   "and every one carries both, because the provider sends them with the roster");

console.log(" picking one");
var res = r.click("ohio-state");
eq(res.stored["iw-team"], "ohio-state", "the choice is stored before navigating");
eq(res.replaced, "?team=ohio-state", "and the URL carries it, so it is shareable and installable");
var none = render(live.TEAM_REGISTRY).click("indiana");
eq(none.replaced, null, "a program with no config cannot be chosen, even by clicking");

console.log(" selectable means it will actually open");
// The check that matters most: a team offered here must have a config on
// disk, or the first screen is a dead end.
r.picks.filter(function (p) { return p.openable; }).forEach(function (p) {
  ok(fs.existsSync(path.join(root, "teams", p.id + ".js")),
     p.id + " has a config, so picking it loads a Suite");
});

console.log(" the Suite's team furniture is not shown");
// There is no team, so a masthead or a bottom nav would be somebody's or
// nobody's. Both are wrong. They are siblings of #main, so nothing removes
// them unless the chooser does - it once did not, and a fan on the chooser
// got Home / Top 25 / Game with no team behind any of them.
ok(r.removed.indexOf("the bottom nav") !== -1, "the bottom nav is removed, though it is not inside #main");
ok(r.removed.indexOf("the team masthead") !== -1, "and so is the team masthead");
ok(r.removed.indexOf("the skip link") === -1, "the skip link stays: its target, #main, is still there");

console.log(" it never names a team in its own code");
var body = read("chooser.js").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
ok(!/notre|irish|ohio|buckeye|indiana|byu/i.test(body), "no team or product is named in the code");
ok(!/#[0-9A-Fa-f]{6}\b/.test(body), "and no colour literal - it paints in the neutral :root");

console.log(" a registry that is empty or broken");
var empty = render([]);
ok(/No team is ready/.test(empty.html), "an empty registry says so rather than showing an empty page");
eq(empty.picks, [], "and offers nothing");
ok(!/id="teamSearch"/.test(empty.html), "with nothing to search, there is no search box");
var broken = render([{ id: "ok-team", name: "Fine" }, null, { name: "No id" }, { id: "BAD", name: "Caps" }]);
eq(broken.picks.map(function (p) { return p.name; }), ["Fine"], "malformed rows are dropped, not rendered");

console.log(" a name is escaped, not trusted");
var nasty = render([{ id: "x", name: '<img src=x onerror=alert(1)>', config: "teams/x.js" }]);
ok(!/<img/.test(nasty.html), "a program name is escaped before it reaches the page");
ok(/&lt;img/.test(nasty.html), "and shows as text");
// data-find is an attribute built from the same untrusted name.
var quoted = render([{ id: "y", name: 'A" onmouseover="x', config: "teams/y.js" }]);
ok(!/data-find="[^"]*" onmouseover/.test(quoted.html),
   "and a quote in a name cannot break out of the search attribute");

console.log("\n" + (failures ? failures + " check(s) FAILED" : "the chooser offers what it can open, and a fan can find it"));
process.exit(failures ? 1 : 0);
