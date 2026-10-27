#!/usr/bin/env node
/* The tools for adding a conference at a time (Phase 0): tools/newteams.js
   plans a conference's teams from the registry and the league's markets,
   and tools/reviewsheet.js lays out what David approves. No network, no
   browser: the sheet's facts and markup only.

   Usage: node tools/newteamscheck.js     (exit 1 on failure) */
"use strict";
var nt = require("./newteams.js"), rs = require("./reviewsheet.js");

var failures = 0;
function ok(cond, what) { if (cond) { console.log("  ok   " + what); return; } failures++; console.log("  FAIL " + what); }

console.log("the plan");
var reg = [
  { id: "ohio-state", name: "Ohio State", conference: "Big Ten Conference", abbr: "OSU", nick: "Buckeyes", providerId: "194", config: "teams/ohio-state.js" },
  { id: "penn-state", name: "Penn State", conference: "Big Ten Conference", abbr: "PSU", nick: "Nittany Lions", providerId: "213" },
  { id: "iowa", name: "Iowa", conference: "Big Ten Conference", abbr: "IOWA", nick: "Hawkeyes", providerId: "2294" },
  { id: "alabama", name: "Alabama", conference: "Southeastern Conference", abbr: "ALA", nick: "Crimson Tide", providerId: "333" }
];
var p = nt.plan("Big Ten Conference", reg);
ok(p.map(function (t) { return t.id; }).join() === "iowa,penn-state", "the conference's programs without a config, by name (" + p.map(function (t) { return t.id; }).join() + ")");
ok(nt.fold("Penn St.") === nt.fold("Penn State") && nt.fold("Mississippi St.") === nt.fold("Mississippi State"), "Kalshi's \"St.\" is the registry's \"State\"");
var psu = p.filter(function (t) { return t.id === "penn-state"; })[0];
ok(psu.espnId === "213" && psu.feeds[0] === "https://www.on3.com/teams/penn-state-nittany-lions/feed/" && psu.feeds[1] === "https://www.si.com/college/pennstate/feed",
   "its ESPN id, and On3's and On SI's addresses to probe");
ok(psu.kalshi && psu.kalshi.tickerSuffix === "-PSU", "its Kalshi market, found by name in the league's file (" + JSON.stringify(psu.kalshi) + ")");
ok(nt.plan("Atlantic Coast Conference", reg).length === 0, "a conference with nothing left to add plans nothing");
var probes = nt.probes(p).split("\n");
ok(probes.filter(function (l) { return /^https:\/\/site\.api\.espn\.com\/.*\/teams\/(2294|213)( |\/schedule )\| \^/.test(l); }).length === 4, "two ESPN probes a team: its names and colours, and its schedule's venues");
ok(nt.captures(p).split("\n").join() === "schedule-2294 iowa-review,news-2294 iowa-review,schedule-213 penn-state-review,news-213 penn-state-review",
   "and the fixtures its review needs");

console.log("the review sheet");
var f = rs.facts("indiana");
ok(f.name === "Indiana" && f.label === "INDIANA FOOTBALL" && f.espnId === "84" && f.kalshi === "-IND" && f.availability === "BigTen.org",
   "a team's card: its header, ESPN id, Kalshi and availability, from its config");
ok(f.pairs.length === 5 && f.pairs.every(function (x) { return x.ratio > 0; }) && f.feeds.length === 6, "every contrast pair measured, every feed listed");
var html = rs.card(f, null);
ok(/Old Oaken Bucket/.test(html) && /#990000/.test(html) && !/below 4\.5/.test(html), "the card names its trophy and colours, and finds no failing pair");
var bad = JSON.parse(JSON.stringify(f));
bad.pairs[1].ratio = 1.74; bad.name = "<b>x</b>";
var badHtml = rs.card(bad, null);
ok(/below 4\.5/.test(badHtml) && /TeamOS will refuse/.test(badHtml), "a pair below 4.5:1 is flagged on the card");
ok(badHtml.indexOf("<b>x</b>") === -1 && badHtml.indexOf("&lt;b&gt;x&lt;/b&gt;") !== -1, "and every value is escaped");
bad.fixtures = ["schedule"];
ok(/Drawn without its news fixture/.test(rs.card(bad, null)), "a team without its review fixtures says which");
var pg = rs.page("Phase 1", [html]);
ok(/^<!doctype html>/.test(pg) && /<title>Phase 1<\/title>/.test(pg) && /viewport/.test(pg), "one self-contained page");

console.log("\n" + (failures ? failures + " check(s) FAILED" : "a conference is planned from the repository, and approved on one page"));
process.exit(failures ? 1 : 0);
