#!/usr/bin/env node
/* A background refresh never drops a keyboard or VoiceOver user's focus
   (suite/more.js put(); code review, 2026-10-01).

   Settings' Last Updated minute and News' "N min ago" change as data
   arrives - every 30 seconds on a live Saturday - and those screens are
   redrawn. This loads the real suite/ui.js and suite/more.js into a page,
   focuses a control, redraws the screen the way a refresh does, and checks
   the same control has focus afterwards.

   Usage: node tools/focuscheck.js     (exit 1 on failure) */
"use strict";
var fs = require("fs"), path = require("path");
var chromium = require("playwright").chromium;
var root = path.join(__dirname, "..");
function read(p) { return fs.readFileSync(path.join(root, p), "utf8"); }

var failures = 0;
function ok(cond, what) { if (cond) { console.log("  ok   " + what); return; } failures++; console.log("  FAIL " + what); }

(async function () {
  var browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined });
  var page = await browser.newPage();
  await page.setContent("<!doctype html><html><body><div id='settings'></div><div id='news'></div>" +
    "<script>var Suite = {};</script><script>" + read("suite/ui.js") + "</script><script>" + read("suite/more.js") + "</script></body></html>");

  function settings(minutesAgo) {
    return page.evaluate(function (m) {
      Suite.more.settings(document.getElementById("settings"), {
        team: { name: "Notre Dame", abbr: "ND", mark: "" }, changeHref: "/?change", style: "team",
        updatedAt: Date.now() - m * 60e3, refreshing: false, online: true, result: null });
    }, minutesAgo);
  }
  function news(minutesAgo) {
    return page.evaluate(function (m) {
      var now = Date.now(), items = [];
      for (var i = 0; i < 14; i++) items.push({ title: "Story " + i, link: "https://example.com/" + i, image: "", source: "ESPN",
                                               publishedAt: now - (m + i) * 60e3 });
      Suite.more.news(document.getElementById("news"), { items: items, failed: false, team: { name: "Notre Dame" },
                                                         fresh: { state: "fresh" } });
    }, minutesAgo);
  }
  function focused() {
    return page.evaluate(function () {
      var a = document.activeElement;
      return a ? (a.getAttribute("href") || (a.hasAttribute("data-refresh") ? "refresh" : a.tagName)) : null;
    });
  }

  console.log("Settings: a refresh redraws Last Updated");
  await settings(1);
  var before = await page.evaluate(function () { return document.getElementById("settings").innerHTML; });
  await page.focus("#settings a[href='/?change']");
  await settings(3);
  ok(before !== await page.evaluate(function () { return document.getElementById("settings").innerHTML; }), "(the screen really was redrawn)");
  ok(await focused() === "/?change", "focus stays on Change Team");
  await page.focus("#settings [data-refresh]");
  await settings(5);
  ok(await focused() === "refresh", "and on Refresh Data");

  console.log("News: a refresh redraws the times");
  await news(1);
  await page.focus("#news a[href='https://example.com/2']");
  await news(4);
  ok(await focused() === "https://example.com/2", "focus stays on the story the fan was on");

  await browser.close();
  console.log("\n" + (failures ? failures + " check(s) FAILED" : "a refresh never moves the fan's focus"));
  process.exit(failures ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
