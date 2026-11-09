#!/usr/bin/env node
/* Around's layers (teamos/around.js; David, 2026-11-05): our conference,
   the games that matter to us, then Top 25 - each game once, in the first
   layer that claims it. Pure, on made-up games.
   Usage: node tools/aroundcheck.js     (exit 1 on any failure) */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");
var root = path.join(__dirname, "..");
var ctx = { console: console, Date: Date };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, "teamos/around.js"), "utf8"), ctx);
var A = ctx.TeamOS.around, failures = 0;
function ok(c, what) { console.log((c ? "  ok   " : "  FAIL ") + what); if (!c) failures++; }

function side(id, name, rank) { return { providerId: id, name: name, rank: rank || null }; }
function game(id, h, a, extra) { return Object.assign({ id: id, date: "2026-11-07T20:00:00Z", home: h, away: a, mine: false }, extra || {}); }
var conf = { "1": "Big Ten Conference", "2": "Big Ten Conference", "3": "Big Ten Conference",
             "10": "Southeastern Conference", "11": "Southeastern Conference",
             "20": "Mid-American Conference", "21": "Mid-American Conference",
             "30": "FBS Independents", "40": "Big 12 Conference", "41": "Big 12 Conference", "50": "Mid-American Conference" };
var short = { "Big Ten Conference": "Big Ten", "Mid-American Conference": "MAC" };
var games = [
  game("g1", side("1", "Ohio State", 3), side("2", "Michigan", 9), { mine: true }),  // ours, a conference game
  game("g2", side("3", "Purdue"), side("40", "Kansas")),                            // a member's non-conference game
  game("g3", side("10", "Georgia", 2), side("11", "Florida")),                      // ranked, not ours
  game("g4", side("20", "Toledo"), side("21", "Ohio")),                             // an opponent's game
  game("g5", side("50", "Northern Illinois"), side("41", "Baylor")),                // a name inside a rival's
  game("g6", side("30", "Notre Dame", 4), side("41", "Baylor"))                     // ranked near us
];
var polls = [{ label: "CFP", ranks: [{ rank: 2, providerId: "10" }, { rank: 3, providerId: "1", mine: true }, { rank: 4, providerId: "30" }, { rank: 9, providerId: "2" }] }];
var base = { games: games, teamId: "1", teamName: "Ohio State", conference: "Big Ten Conference", conferences: conf,
             short: short, polls: polls, now: new Date("2026-11-05T12:00:00Z"),
             schedule: [{ oppProviderId: "20", date: "2026-09-12T16:00:00Z" }],
             series: [{ match: /illinois/i, name: "Illibuck Trophy", kind: "trophy" }, { match: /georgia/i, name: "A Branded Game", kind: "event" }] };
var L = A.layers(base);

console.log("our conference");
ok(L.conference && L.conference.name === "Big Ten", "named as fans call it (Big Ten)");
ok(L.conference.games.map(function (r) { return r.game.id; }).join() === "g1,g2", "every game with a member, ours included: g1, g2 (" + L.conference.games.map(function (r) { return r.game.id; }).join() + ")");

console.log("games that matter");
var why = {}; L.matter.forEach(function (r) { why[r.game.id] = r.why; });
ok(why.g4 && /Toledo played Ohio State Sep 12/.test(why.g4.join()), "a past opponent's game, with when we played (" + (why.g4 || []).join(" | ") + ")");
ok(why.g6 && /Notre Dame: CFP No\. 4, near Ohio State/.test(why.g6.join()), "a team ranked near us in the leading poll");
ok(why.g3 && /Georgia: CFP No\. 2/.test(why.g3.join()) && !/Branded/.test(why.g3.join()), "near us too - and a branded event is never a rival");
ok(!why.g5, "Northern Illinois is not Illinois: a rival matches the whole name");

console.log("rivals, by name (Codex, #232)");
var R = function (name, re) {
  var g = [game("r1", side("60", name), side("61", "Somebody"))];
  var r = A.layers({ games: g, teamId: "1", conferences: {}, series: [{ match: re, name: "A Trophy", kind: "trophy" }] });
  return r.matter.length === 1;
};
ok(R("Michigan State", /michigan st/i), "a pattern written as a prefix matches its school (michigan st -> Michigan State)");
ok(!R("Texas A&M", /texas/i), "Texas's pattern is not Texas A&M");
ok(!R("Northern Illinois", /illinois/i), "Illinois's pattern is not Northern Illinois");
ok(R("Purdue", /purdue/i), "a whole name matches");

console.log("Top 25, and each game once");
ok(L.top25.map(function (g) { return g.id; }).join() === "", "every ranked game already listed above: nothing repeats in Top 25 (" + L.top25.map(function (g) { return g.id; }).join() + ")");
var seen = {}, twice = false;
[].concat(L.conference.games.map(function (r) { return r.game; }), L.matter.map(function (r) { return r.game; }), L.top25)
  .forEach(function (g) { if (seen[g.id]) twice = true; seen[g.id] = true; });
ok(!twice, "no game in two layers");

console.log("an independent, and no data");
var ind = A.layers(Object.assign({}, base, { teamId: "30", teamName: "Notre Dame", conference: "FBS Independents", schedule: [], polls: [] }));
ok(ind.conference === null, "an independent has no conference layer");
ok(ind.top25.map(function (g) { return g.id; }).join() === "g1,g3,g6", "and sees the ranked games in Top 25");
var none = A.layers({});
ok(none.conference === null && none.matter.length === 0 && none.top25.length === 0, "no games: three empty layers, no error");

// What Around says when a layer above Top 25 has nothing (sweep, 2026-11-09:
// "Every ranked game this week is listed above" under "No Big Ten games").
(function () {
  var sx = vm.createContext({ console: console, Date: Date, Intl: Intl, document: { addEventListener: function () {}, fonts: null }, window: { addEventListener: function () {} } });
  ["teamos/game.js", "teamos/freshness.js", "suite/ui.js", "suite/top25.js"].forEach(function (f) { vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), sx, { filename: f }); });
  function draw(around) {
    var parts = {}, host = { innerHTML: "", querySelector: function (q) {
      if (q === "[data-t25]") return Object.keys(parts).length ? {} : null;
      var k = (/data-t25="(\w+)"/.exec(q) || [])[1];
      return k ? (parts[k] || (parts[k] = { innerHTML: "", style: {}, scrollTop: 0, getBoundingClientRect: function () { return { top: 0 }; } })) : null;
    } };
    sx.Suite.top25.paint(host, { view: "games", games: [], around: around, mark: function () { return null; }, now: new Date("2026-11-09T12:00:00Z") });
    return parts.body ? parts.body.innerHTML : "";
  }
  var empty = draw({ conference: { name: "Big Ten", games: [] }, matter: [], top25: [] });
  ok(/No Big Ten games in this window/.test(empty) && !/listed above/.test(empty) && /No ranked teams play in this window/.test(empty),
     "an empty conference layer lists nothing, so Top 25 never says its games are listed above");
})();

console.log("\n" + (failures ? failures + " check(s) FAILED" : "each game once, in the layer that matters most"));
process.exit(failures ? 1 : 0);
