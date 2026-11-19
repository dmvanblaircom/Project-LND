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
// ---- Games that matter: the relevance model (2026-11-18) -------------------
// Notre Dame's Week 13, 2026: the CFP's Nov 17 ranks and the matchups the
// schools' schedules listed (docs/product/games-that-matter-relevance-
// proposal.md, section 3). Ids are made up; names and ranks are real.
var T = {
  nd: side("87", "Notre Dame", 6), uga: side("61", "Georgia", 1), utah: side("254", "Utah", 2), bama: side("333", "Alabama", 3),
  ucla: side("26", "UCLA", 4), tex: side("251", "Texas", 5), mia: side("2390", "Miami", 7), ind: side("84", "Indiana", 8),
  tenn: side("2633", "Tennessee", 9), byu: side("252", "BYU", 10), sc: side("2579", "South Carolina", 21),
  mich: side("130", "Michigan"), ark: side("8", "Arkansas"), tcu: side("2628", "TCU"), vt: side("259", "Virginia Tech"),
  wash: side("264", "Washington"), lsu: side("99", "LSU"), ku: side("2305", "Kansas"), chatt: side("236", "Chattanooga"),
  rice: side("242", "Rice"), tem: side("218", "Temple"), pur: side("2509", "Purdue"), wis: side("275", "Wisconsin"),
  bc: side("103", "Boston College"), syr: side("183", "Syracuse"), smu: side("2567", "SMU"), msu: side("127", "Michigan State"),
  ore: side("2483", "Oregon", 13), nav: side("2426", "Navy"), mem: side("235", "Memphis")
};
var FBS = {}; Object.keys(T).forEach(function (k) { if (k !== "chatt") FBS[T[k].providerId] = k === "nd" ? "FBS Independents" : "Some Conference"; });
function g2(id, h, a, extra) { return game(id, h, a, Object.assign({ date: "2026-11-21T20:00:00Z" }, extra || {})); }
var week = [
  g2("own",   T.nd, T.smu, { mine: true, date: "2026-11-22T00:30:00Z" }),
  g2("ucla",  T.mich, T.ucla, { odds: { line: "UCLA -6.5" } }),
  g2("tex",   T.tex, T.ark, { odds: { line: "TEX -14" } }),
  g2("uga",   T.sc, T.uga, { odds: { line: "UGA -9" } }),
  g2("utah",  T.tcu, T.utah, { odds: { line: "UTAH -3" } }),
  g2("bama",  T.bama, T.chatt),
  g2("mia",   T.mia, T.vt, { odds: { line: "MIA -16.5" } }),
  g2("byu",   T.ku, T.byu, { odds: { line: "BYU -2.5" } }),
  g2("ind",   T.wash, T.ind, { odds: { line: "IND -7" } }),
  g2("tenn",  T.tenn, T.lsu, { odds: { line: "TENN -4" } }),
  g2("rice",  T.tem, T.rice, { odds: { line: "TEM -3" } }),
  g2("pur",   T.pur, T.wis, { odds: { line: "WIS -1" } }),
  g2("bc",    T.bc, T.syr, { odds: { line: "SYR -6" } }),
  g2("msu",   T.msu, T.ore, { odds: { line: "ORE -20" } }),
  g2("navy",  T.nav, T.mem, { odds: { line: "MEM -3" } })
];
var cfp = { label: "CFP", ranks: Object.keys(T).filter(function (k) { return T[k].rank; }).map(function (k) { return { rank: T[k].rank, providerId: T[k].providerId }; }) };
var ndSched = [
  { oppProviderId: "242",  date: "2026-09-12T19:30:00Z", state: "post", won: true },
  { oppProviderId: "127",  date: "2026-09-19T23:30:00Z", state: "post", won: true },
  { oppProviderId: "2509", date: "2026-09-26T19:30:00Z", state: "post", won: true },
  { oppProviderId: "275",  date: "2026-09-06T19:30:00Z", state: "post", won: true },
  { oppProviderId: "252",  date: "2026-10-17T23:30:00Z", state: "post", won: true },
  { oppProviderId: "2426", date: "2026-10-31T19:30:00Z", state: "post", won: true },
  { oppProviderId: "2390", date: "2026-11-08T00:30:00Z", state: "post", won: false },
  { oppProviderId: "103",  date: "2026-11-14T19:30:00Z", state: "post", won: true },
  { oppProviderId: "2567", date: "2026-11-22T00:30:00Z", state: "pre" },
  { oppProviderId: "183",  date: "2026-11-28T19:30:00Z", state: "pre" }
];
var cuts2026 = A.cutlinesFor({ formats: [{ from: 2024, to: 2026, cutlines: [{ at: 4, what: "a first-round bye" }, { at: 12, what: "a place in the field" }] },
                                          { from: 2027, cutlines: [{ at: 8, what: "a first-round bye" }, { at: 16, what: "a home game" }, { at: 24, what: "a place in the field" }] }] }, 2026);
ok(cuts2026.map(function (c) { return c.at; }).join() === "4,12", "the 2026 format's lines come from league data: 4 and 12");
var ND = A.layers({ games: week, teamId: "87", teamName: "Notre Dame", conference: "FBS Independents", conferences: FBS,
                    polls: [cfp], schedule: ndSched, cutlines: cuts2026, everRanked: { "127": true },
                    series: [{ match: /purdue/i, name: "the Shillelagh Trophy", kind: "trophy" }, { match: /navy/i, name: "the Rip Miller Trophy", kind: "trophy" },
                             { match: /^usc$/i, name: "the Jeweled Shillelagh", kind: "trophy" }],
                    now: new Date("2026-11-19T12:00:00Z") });
var by = {}; ND.matter.forEach(function (r) { by[r.game.id] = r; });
function lab(id) { return by[id] ? by[id].label : "-"; }
console.log("Games that matter: Notre Dame, No. 6, Week 13");
ok(lab("ucla") === "Playoff Impact" && /A UCLA loss could open a first-round bye for No\. 6 Notre Dame/.test(by.ucla.why[0]),
   "No. 4 UCLA, across the bye line: " + (by.ucla || {}).why);
ok(lab("uga") === "Playoff Impact", "No. 1 Georgia counts: the whole band above the bye line (Codex, #262)");
ok(lab("utah") === "Playoff Impact" && lab("tex") === "Playoff Impact", "so do No. 2 Utah and No. 5 Texas (a 14-point line is still a game)");
ok(!by.bama, "No. 3 Alabama against an FCS team is not a game that matters");
var liveWeek = week.map(function (g) { return g.id === "bama" ? Object.assign({}, g, { state: "in" }) : g; });
var ND2 = A.layers({ games: liveWeek, teamId: "87", teamName: "Notre Dame", conferences: FBS, polls: [cfp], schedule: ndSched, cutlines: cuts2026, now: new Date("2026-11-19T12:00:00Z") });
ok(!ND2.matter.some(function (r) { return r.game.id === "bama"; }), "nor once it is under way: an FCS game never passes, live or final (Codex, #264)");
ok(lab("mia") === "Playoff Impact" && /one place behind No\. 6 Notre Dame/.test(by.mia.why[0]), "No. 7 Miami, one place behind: " + (by.mia || {}).why);
ok(lab("ind") === "Playoff Impact" && lab("tenn") === "Playoff Impact", "No. 8 Indiana and No. 9 Tennessee, between us and the field's line");
ok(lab("byu") === "Playoff Impact" && by.byu.also.length === 1 && by.byu.also[0].label === "Résumé Impact" &&
   /Notre Dame beat No\. 10 BYU on Oct 17/.test(by.byu.also[0].why),
   "No. 10 BYU: four places behind leads; that we beat it is kept as the secondary fact (" + (by.byu || {}).why + " | " + ((by.byu || {}).also || []).map(function (x) { return x.why; }) + ")");
ok(lab("msu") === "-", "Michigan State, ranked earlier, is a résumé team - but a 20-point line is not a game");
ok(lab("bc") === "Next Opponent" && /Syracuse, Notre Dame’s opponent on Nov 28, plays Boston College/.test(by.bc.why[0]),
   "the next opponent after this week's: " + (by.bc || {}).why);
ok(!by.rice, "Rice, 1-7 and never ranked: having played it is not a stake");
ok(!by.pur, "Purdue-Wisconsin: two past opponents and a trophy rival, nothing riding");
ok(!by.navy, "Navy, a trophy rival out of the national race, against an unranked team: nothing riding");
ok(ND.matter[0].label === "Playoff Impact" && ND.matter[ND.matter.length - 1].label === "Next Opponent", "playoff first, the next opponent last");
ok(ND.matter.every(function (r) { return r.why.length === 1 && r.why[0].length <= 160 && !/clinch|eliminat|destiny|guarantee|lock/i.test(r.why[0]); }),
   "every game one sentence, no claims the committee has not made");
ok(ND.top25.map(function (g) { return g.id; }).sort().join() === "bama,msu,own", "the ranked games left over stay in Top 25, our own among them: " + ND.top25.map(function (g) { return g.id; }).join());

console.log("a team that beat us, ranked or not");
var lost = ndSched.map(function (s) { return s.oppProviderId === "242" ? Object.assign({}, s, { won: false }) : s; });
var L2 = A.layers({ games: week, teamId: "87", teamName: "Notre Dame", conferences: FBS, polls: [cfp], schedule: lost, cutlines: cuts2026, now: new Date("2026-11-19T12:00:00Z") });
var rice = L2.matter.filter(function (r) { return r.game.id === "rice"; })[0];
ok(rice && rice.label === "Résumé Impact" && /Rice beat Notre Dame on Sep 12/.test(rice.why[0]), "unranked Rice, had it beaten us: " + (rice || {}).why);

console.log("out of the national race");
var pur = A.layers({ games: week.concat([g2("own2", T.pur, T.wis, { mine: true })]).filter(function (g) { return g.id !== "pur"; }),
                     teamId: "2509", teamName: "Purdue", conferences: FBS, polls: [cfp], cutlines: cuts2026,
                     schedule: [{ oppProviderId: "275", date: "2026-11-21T20:00:00Z", state: "pre" }, { oppProviderId: "84", date: "2026-11-28T17:00:00Z", state: "pre" }],
                     series: [{ match: /^indiana/i, name: "the Old Oaken Bucket", kind: "trophy" }], now: new Date("2026-11-19T12:00:00Z") });
ok(pur.matter.length === 1 && pur.matter[0].game.id === "ind" && pur.matter[0].label === "Rivalry" &&
   /its last game before the Old Oaken Bucket on Nov 28/.test(pur.matter[0].why[0]),
   "Purdue: one game, Indiana's last before the Bucket (" + pur.matter.map(function (r) { return r.game.id + " " + r.why; }).join(" | ") + ")");
var none2 = A.layers({ games: week, teamId: "999", teamName: "Kent State", conferences: FBS, polls: [cfp], cutlines: cuts2026,
                       schedule: [{ oppProviderId: "2579", date: "2026-09-05T19:30:00Z", state: "post", won: false }], now: new Date("2026-11-19T12:00:00Z") });
ok(none2.matter.length === 0, "Kent State, out of every race: South Carolina beat it, but it is in no race a résumé helps - nothing listed");

console.log("the 24-team field (2027)");
var cuts2027 = A.cutlinesFor({ formats: [{ from: 2027, cutlines: [{ at: 8, what: "a first-round bye" }, { at: 16, what: "a home game" }, { at: 24, what: "a place in the field" }] }] }, 2027);
var osu = side("194", "Ohio State", 14);
var L27 = A.layers({ games: [g2("x", side("1", "Team 10", 10), side("2", "Team U"), { odds: { line: "-3" } }), g2("y", side("3", "Team 16", 16), side("4", "Team V"), { odds: { line: "-3" } }),
                             g2("z", side("5", "Team 21", 21), side("6", "Team W"), { odds: { line: "-3" } })],
                     teamId: "194", teamName: "Ohio State", conferences: {}, polls: [{ ranks: [{ rank: 14, providerId: "194" }, { rank: 10, providerId: "1" }, { rank: 16, providerId: "3" }, { rank: 21, providerId: "5" }] }],
                     cutlines: cuts2027, now: new Date("2027-11-19T12:00:00Z") });
ok(L27.matter.map(function (r) { return r.game.id; }).sort().join() === "x,y", "No. 14 in a 24-team field: No. 10, and No. 16 at the home-game line, bear on it; No. 21 does not - from the format alone");
ok(L27.matter.filter(function (r) { return r.game.id === "y"; })[0].why[0].indexOf("2 places behind No. 14 Ohio State") > -1, "and the sentence says where it stands");

console.log("rivals, by name (Codex, #232)");
var R = function (name, re) {
  var g = [game("r1", side("60", name, 5), side("61", "Somebody", 9))];
  var r = A.layers({ games: g, teamId: "1", conferences: {}, polls: [{ ranks: [{ rank: 5, providerId: "60" }, { rank: 9, providerId: "61" }] }],
                     series: [{ match: re, name: "A Trophy", kind: "trophy" }] });
  return r.matter.length === 1;
};
ok(R("Michigan State", /michigan st/i), "a pattern written as a prefix matches its school (michigan st -> Michigan State)");
ok(!R("Texas A&M", /texas/i), "Texas's pattern is not Texas A&M");
ok(!R("Northern Illinois", /illinois/i), "Illinois's pattern is not Northern Illinois");
ok(R("Purdue", /purdue/i), "a whole name matches");

console.log("our conference, Top 25, and each game once");
var conf = { "1": "Big Ten Conference", "2": "Big Ten Conference", "3": "Big Ten Conference", "10": "Southeastern Conference", "11": "Southeastern Conference" };
var cw = [game("c1", side("1", "Ohio State", 3), side("2", "Michigan", 9), { mine: true }), game("c2", side("3", "Purdue"), side("40", "Kansas")),
          game("c3", side("10", "Georgia", 2), side("11", "Florida"))];
var C = A.layers({ games: cw, teamId: "1", teamName: "Ohio State", conference: "Big Ten Conference", conferences: conf, short: { "Big Ten Conference": "Big Ten" },
                   polls: [{ ranks: [{ rank: 3, providerId: "1" }, { rank: 2, providerId: "10" }] }], cutlines: cuts2026 });
ok(C.conference && C.conference.name === "Big Ten" && C.conference.games.map(function (r) { return r.game.id; }).join() === "c1,c2", "every game with a member, ours included");
ok(C.matter.map(function (r) { return r.game.id; }).join() === "c3", "No. 2 Georgia, ahead of No. 3 Ohio State inside the bye line, matters");
var seen = {}, twice = false;
[].concat(C.matter.map(function (r) { return r.game; }), C.conference.games.map(function (r) { return r.game; }), C.top25)
  .forEach(function (g) { if (seen[g.id]) twice = true; seen[g.id] = true; });
ok(!twice, "no game in two layers");
var ind = A.layers({ games: cw, teamId: "30", teamName: "Notre Dame", conference: "FBS Independents", conferences: conf });
ok(ind.conference === null, "an independent has no conference layer");
ok(ind.top25.map(function (g) { return g.id; }).join() === "c1,c3", "an unranked team with no stakes sees the ranked games in Top 25");
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
