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
      this.nodes = (html.match(/<(?:ul|h2|li|span)\b[^>]*data-group="[^"]*"[^>]*>/g) || [])
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

  // The Suite furniture that is NOT inside .wrap, which is the only kind the
  // chooser has to remove by hand - and the kind that survived for a release
  // because the old code only ever looked inside .page.
  var outside = [
    { sel: ".tabbar", what: "the tab bar" },
    { sel: '[role="tablist"]', what: "the tab bar" },
    { sel: "a.skip", what: "the skip link" }
  ].map(function (f) {
    var node = { what: f.what, sel: f.sel, gone: false, contains: function () { return false; } };
    node.parentNode = { removeChild: function () { node.gone = true; removed.push(node.what); } };
    return node;
  });

  var doc = {
    title: "", readyState: "complete",
    querySelector: function (sel) {
      if (sel === ".wrap") return wrap;
      if (sel === ".page") return { querySelectorAll: function () { return []; } };
      return null;
    },
    querySelectorAll: function (sel) {
      return outside.filter(function (n) { return n.sel === sel && !n.gone; });
    },
    getElementById: function (id) {
      return { parentNode: { removeChild: function () { removed.push(id); } } };
    },
    addEventListener: function () {}
  };

  vm.runInNewContext(read("teamos/registry.js") + "\n" + read("chooser.js"), {
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
      conf: unesc((li.match(/<span class="(?:pick-conf|soon-conf)">([^<]*)</) || [, ""])[1]),
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
        note: (wrap.nodes.filter(function (n) { return n.getAttribute("data-note"); })[0] || {}).textContent
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
eq(r.title, "Pick your team", "the tab says what the page is");

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
ok((r.html.match(/<h2/g) || []).length <= 1,
   "but the page carries at most one heading, not one per conference");

console.log(" conference is shown on every program");
ok(r.picks.every(function (p) { return p.conf; }), "every program prints a conference");
var nd = r.picks.filter(function (p) { return p.id === "notre-dame"; })[0];
ok(!!nd && !!nd.conf, "including the ones you can open");
ok(!/ Conference<\/span>/.test(r.html),
   "the redundant word is trimmed off the display - 'Big Ten', not 'Big Ten Conference'");

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
ok(/Coming soon/.test(r.html), "they sit under a heading that says what they are");
ok(!/Ready now/.test(r.html), "and what you CAN open carries no label - it is the top of the page");
ok(/aria-label="Programs you can open now"/.test(r.html),
   "though the list names itself for a screen reader, so it is not anonymous");

console.log("search");
var total = REGLIVE.all().length;
eq(r.search("").names.length, total, "an empty box shows every program");
eq(r.search("notre").names, ["Notre Dame"], "a team is found by name");
ok(r.search("ohio").names.indexOf("Ohio State") !== -1, "and a partial name matches");

console.log(" by conference, which is a search term and not a section");
var bigTen = r.search("big ten").names;
ok(bigTen.length > 10, "typing a conference finds its programs (" + bigTen.length + ")");
ok(bigTen.indexOf("Ohio State") !== -1, "including the one you can open");
ok(bigTen.every(function (n) {
  var t = REGLIVE.all().filter(function (x) { return x.name === n; })[0];
  return t && /Big Ten/.test(t.conference);
}), "and nothing that is not in it");
ok(r.search("big ten conference").names.length === bigTen.length,
   "the full conference name matches too, though the row shows it trimmed");

console.log(" the way a fan types, not the way the provider spells");
// Each of these is a real program on the 2026 roster whose punctuation or
// accent a fan will not reproduce.
[["san jose", "San José State"], ["miami oh", "Miami (OH)"],
 ["texas am", "Texas A&M"], ["hawaii", "Hawai'i"]].forEach(function (pair) {
  var known = REGLIVE.all().some(function (t) { return t.name === pair[1]; });
  if (!known) { console.log("  --   " + pair[1] + " is not on this roster, skipped"); return; }
  ok(r.search(pair[0]).names.indexOf(pair[1]) !== -1,
     '"' + pair[0] + '" finds ' + pair[1]);
});
eq(r.search("NOTRE DAME").names, ["Notre Dame"], "case does not matter");

console.log(" what the page says while filtering");
var hit = r.search("notre");
eq(hit.count, "1 program matches.", "one match is counted in the singular");
eq(hit.empty, false, "and nothing says the search failed");
eq(hit.headings, [], "the Coming soon heading goes when nothing under it matches");
var miss = r.search("zzzzz");
eq(miss.names, [], "a term matching nothing shows nothing");
eq(miss.count, "No program matches that.", "the count says so");
eq(miss.empty, true, "and the page says what to try instead");
var back = r.search("");
eq(back.names.length, total, "clearing the box brings everything back");
eq(back.count, total + " programs.", "and the count returns to the resting total");
eq(back.headings, ["soon"], "as does the heading");
ok(r.search("akron").headings.indexOf("soon") !== -1,
   "a search that only hits unbuilt programs keeps their heading");
// The heading counts what is under it NOW. Left at the resting total it
// reads "136 programs" over seventeen of them, which the fan can see is
// wrong.
var bigTenSoon = REGLIVE.all().filter(function (t) {
  return /Big Ten/.test(t.conference) && !t.available;
}).length;
eq(r.search("big ten").note, bigTenSoon + " programs",
   "and the heading counts what is left under it, not the resting total");
eq(r.search("").note,
   (REGLIVE.all().length - REGLIVE.available().length) + " programs",
   "clearing the box puts the resting total back");

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

console.log(" the Suite's own furniture is not shown");
// There is no team, so a header, hero, odds strip or tab bar would be
// somebody's or nobody's. Both are wrong.
//
// The tab bar and the skip link are the ones that matter here. Everything
// else the chooser "removes" lives inside .wrap and would go anyway when the
// chooser writes its own markup over it; these two are siblings of the page,
// so nothing removes them unless the chooser does. It did not, for a
// release, and a fan on the chooser got Home / Top 25 / Game / Depth / News
// with no team behind any of them.
ok(r.removed.indexOf("the tab bar") !== -1, "the tab bar is removed, though it is not inside .wrap");
ok(r.removed.indexOf("the skip link") !== -1, "and so is the skip link, which pointed at a panel that is gone");

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
