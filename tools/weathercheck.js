#!/usr/bin/env node
/* Home's weather (0024 §2): a kickoff forecast before a game, the conditions
   at the venue once it is under way - each for its own game and moment, and
   nothing in between. Code review, 2026-10-25: the forecast stayed on as
   "now" for up to half an hour after kickoff, and one game's weather showed
   under the next game until that game's answer came back.

   Real ESPN captures (Notre Dame's schedule of Sep 24; the Sep 26 board with
   Notre Dame at Purdue under way); the weather service's answers are made up
   here, in its documented shape, and named for what they are. No live APIs. */
"use strict";
var fs = require("fs"), path = require("path"), assert = require("assert");
var chromium = require("playwright").chromium, root = path.join(__dirname, "..");
var server = require("./lib/serve")(root), checks = [];
function fixture(n) { return fs.readFileSync(path.join(root, "tools/fixtures", n), "utf8"); }
function ok(value, label) { assert(value, label); checks.push(label); console.log("  ok   " + label); }

var KICK = Date.parse("2026-09-26T18:00:00Z");      // Notre Dame at Purdue, 2 PM at the venue
var PRE = fixture("espn-schedule-nd-sep24.json"), BOARD = fixture("espn-scoreboard-sep26-live.json");
// The forecast and the conditions now, told apart by their temperatures.
var FORECAST_F = 61, NOW_F = 55;
function forecast() {
  var time = [], temp = [];
  for (var h = 0; h < 24; h++) { time.push("2026-09-26T" + (h < 10 ? "0" : "") + h + ":00"); temp.push(FORECAST_F); }
  return JSON.stringify({ timezone: "America/Indiana/Indianapolis", utc_offset_seconds: -14400,
    hourly: { time: time, temperature_2m: temp, precipitation_probability: time.map(function () { return 10; }),
              wind_speed_10m: time.map(function () { return 6; }), weather_code: time.map(function () { return 1; }) },
    current: { time: "2026-09-26T14:10", temperature_2m: NOW_F, precipitation: 0, wind_speed_10m: 6, weather_code: 1 } });
}

(async function () {
  await new Promise(function (r) { server.listen(0, "127.0.0.1", r); });
  var base = "http://127.0.0.1:" + server.address().port;
  var browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined });
  var ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: "America/New_York", serviceWorkers: "block" });
  var page = await ctx.newPage(), errors = [], st = { live: false, hold: false, held: [], asked: 0 };
  await page.clock.install({ time: new Date(KICK - 2 * 3600e3) });
  page.on("pageerror", function (e) { errors.push(String(e)); });
  await ctx.route("**/*", function (route) {
    var u = route.request().url();
    if (u.startsWith(base)) return route.continue();
    var json = function (b) { return route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: b }); };
    if (/geocoding-api\.open-meteo/.test(u)) return json(JSON.stringify({ results: [{ latitude: 40.43, longitude: -86.92, country_code: "US", admin1: "Indiana" }] }));
    if (/api\.open-meteo/.test(u)) { st.asked++; if (st.hold) { st.held.push(function () { json(forecast()); }); return; } return json(forecast()); }
    if (/\/teams\/87\/schedule/.test(u)) return json(PRE);
    if (/\/scoreboard/.test(u)) return json(st.live ? BOARD : '{"events":[]}');
    if (/\/rankings/.test(u)) return json(fixture("espn-rankings-sep20.json"));
    return route.abort();
  });
  function wx() { return page.evaluate(function () { var w = document.querySelector("#screenHome .gc-wx"); return w ? w.textContent : null; }); }
  try {
    await page.goto(base + "/?team=notre-dame#home");
    await page.waitForFunction(function () { return !document.getElementById("launch") && document.querySelector("#screenHome .gc-wx"); }, null, { timeout: 15000 });
    ok(new RegExp("^" + FORECAST_F + "°F").test(await wx()), "before kickoff: the forecast for the kickoff hour (" + await wx() + ")");

    // Kickoff: the board has the game under way. The conditions-now answer
    // is held back, so what shows meanwhile is what the app shows while it
    // waits.
    st.live = true; st.hold = true;
    var asked = st.asked;
    await page.clock.fastForward(2 * 3600e3 + 10 * 60e3);
    await page.clock.runFor(60e3);
    await page.waitForFunction(function () { var h = document.querySelector("#screenHome .gc-live, #screenHome .live-pill"); return !!h; }, null, { timeout: 15000 }).catch(function () {});
    ok(st.asked > asked, "under way: the conditions now are asked for at once, not half an hour on");
    ok(await wx() === null, "and until they answer, no weather - never the kickoff forecast as \"now\" (" + await wx() + ")");
    st.held.splice(0).forEach(function (f) { f(); });
    await page.waitForFunction(function (t) { var w = document.querySelector("#screenHome .gc-wx"); return w && w.textContent.indexOf(t + "°F") === 0; }, NOW_F, { timeout: 10000 }).catch(function () {});
    ok(new RegExp("^" + NOW_F + "°F").test(await wx() || ""), "then the conditions at the venue now (" + await wx() + ")");
    ok(!errors.length, "no page errors (" + errors.join(" | ") + ")");
  } finally {
    await browser.close(); server.close();
  }
  console.log("\n" + checks.length + " checks: Home's weather is its own game's and moment's");
})().catch(function (e) { console.error("FAIL " + (e && e.message || e)); process.exit(1); });
