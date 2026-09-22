#!/usr/bin/env node
/* Does the chooser offer the right teams, and only the right teams?

   This is the first thing a fan ever sees, so two things have to hold. Every
   team it presents as selectable must actually open - offering one the Suite
   cannot render is a dead end on the first screen. And every team the registry
   knows must appear, even the ones without a config, because "we know about
   your team and cannot open it yet" is useful where silence reads as "your
   team is not here".

   chooser.js is run against a stubbed document. No browser, no network. The
   stub records the HTML it wrote and what a click did.

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
function render(registry) {
  var wrap = { innerHTML: "", listeners: {},
    addEventListener: function (ev, fn) { this.listeners[ev] = fn; },
    querySelectorAll: function () { return []; } };
  var removed = [], stored = {}, replaced = null;

  var doc = {
    title: "", readyState: "complete",
    querySelector: function (sel) {
      if (sel === ".wrap") return wrap;
      if (sel === ".page") return { querySelectorAll: function () { return []; } };
      return null;
    },
    getElementById: function (id) {
      return { parentNode: { removeChild: function () { removed.push(id); } } };
    },
    addEventListener: function () {}
  };

  var sandbox = {
    document: doc,
    location: { replace: function (u) { replaced = u; } },
    localStorage: { setItem: function (k, v) { stored[k] = v; },
                    getItem: function (k) { return stored[k] || null; } },
    TEAM_REGISTRY: registry,
    console: console
  };
  vm.runInNewContext(read("teamos/registry.js") + "\n" + read("chooser.js"),
                     sandbox, { filename: "chooser" });

  // read the rendered markup back
  // Parse per <li>, not per tag: a pick contains nested spans, so a
  // non-greedy match on the outer tag stops at the first inner </span> and
  // silently produces nonsense. That made this file pass on a broken build
  // until the assertions disagreed with the browser.
  var html = wrap.innerHTML;
  var picks = (html.match(/<li>[\s\S]*?<\/li>/g) || []).map(function (li) {
    return {
      name: (li.match(/<span class="pick-name">([^<]*)</) || [, ""])[1],
      id: (li.match(/data-team="([^"]*)"/) || [, null])[1],
      selectable: /<button[^>]*class="pick"/.test(li)
    };
  });
  return {
    html: html, picks: picks, title: doc.title, removed: removed, stored: stored,
    click: function (id) {
      wrap.listeners.click({ target: { closest: function (sel) {
        if (!/pick/.test(sel)) return null;
        var hit = picks.filter(function (p) { return p.id === id && p.selectable; })[0];
        return hit ? { getAttribute: function () { return hit.id; } } : null;
      } } });
      return { stored: stored, replaced: replaced };
    }
  };
}

// The repository's own registry, and a synthetic one for the edge cases.
var live = vm.createContext({});
vm.runInContext(read("teams/index.js"), live, { filename: "teams/index.js" });

console.log("the real registry");
var r = render(live.TEAM_REGISTRY);
eq(r.picks.map(function (p) { return p.name; }).sort(),
   ["BYU", "Indiana", "Notre Dame", "Ohio State"], "every program in the registry is shown");
eq(r.picks.filter(function (p) { return p.selectable; }).map(function (p) { return p.id; }).sort(),
   ["notre-dame", "ohio-state"], "and only the ones with a config can be picked");
eq(r.picks.filter(function (p) { return !p.selectable; }).map(function (p) { return p.name; }).sort(),
   ["BYU", "Indiana"], "the rest are shown, not hidden");
eq(r.title, "Pick your team", "the tab says what the page is");

console.log(" selectable means it will actually open");
// The check that matters most: a team offered here must have a config on
// disk, or the first screen is a dead end.
r.picks.filter(function (p) { return p.selectable; }).forEach(function (p) {
  ok(fs.existsSync(path.join(root, "teams", p.id + ".js")),
     p.id + " has a config, so picking it loads a Suite");
});
r.picks.filter(function (p) { return !p.selectable; }).forEach(function (p) {
  ok(!p.id, p.name + " carries no team id, so nothing can click it");
});

console.log(" picking one");
var res = r.click("ohio-state");
eq(res.stored["iw-team"], "ohio-state", "the choice is stored before navigating");
eq(res.replaced, "?team=ohio-state", "and the URL carries it, so it is shareable and installable");
var none = render(live.TEAM_REGISTRY).click("indiana");
eq(none.replaced, null, "a team with no config cannot be chosen, even by clicking");

console.log(" the Suite's own furniture is not shown");
// There is no team, so a header, hero and odds strip would be somebody's or
// nobody's. Both are wrong.
["strip", "oddsHint", "oddsboard", "hero", "heroMini"].forEach(function (id) {
  ok(r.removed.indexOf(id) !== -1, id + " is removed");
});

console.log(" it never names a team in its own code");
var src = read("chooser.js");
var body = src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
ok(!/notre|irish|ohio|buckeye|indiana|byu/i.test(body), "no team or product is named in the code");
ok(!/#[0-9A-Fa-f]{6}\b/.test(body), "and no colour literal - it paints in the neutral :root");

console.log(" a registry that is empty or broken");
var empty = render([]);
ok(/No team is ready/.test(empty.html), "an empty registry says so rather than showing an empty page");
eq(empty.picks, [], "and offers nothing");
var broken = render([{ id: "ok-team", name: "Fine" }, null, { name: "No id" }, { id: "BAD", name: "Caps" }]);
eq(broken.picks.map(function (p) { return p.name; }), ["Fine"], "malformed rows are dropped, not rendered");

console.log(" a name is escaped, not trusted");
var nasty = render([{ id: "x", name: '<img src=x onerror=alert(1)>', config: "teams/x.js" }]);
ok(!/<img/.test(nasty.html), "a program name is escaped before it reaches the page");
ok(/&lt;img/.test(nasty.html), "and shows as text");

console.log("\n" + (failures ? failures + " check(s) FAILED" : "the chooser offers what it can open"));
process.exit(failures ? 1 : 0);
