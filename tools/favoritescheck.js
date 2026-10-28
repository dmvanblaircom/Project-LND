#!/usr/bin/env node
/* Your Teams (decision 0036; David, 2026-10-27): star teams in the chooser,
   switch between them in one tap from the header.

   Suite.favorites in a bare scope, then the real chooser and the real app in
   Chromium, with fixtures:
     - every team that can be opened has a star of its own; starring never
       opens the team, and Your Teams lists the starred ones first
     - a search looks through every program once: Your Teams steps aside
     - with another team to switch to, the header's team name opens a sheet
       of the fan's teams; one tap opens one on the same screen
     - with nothing to switch to, the header is quiet context, as before

   Usage: node tools/favoritescheck.js     (exit 1 on failure) */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");
var chromium = require("playwright").chromium;
var root = path.join(__dirname, "..");
var serve = require("./lib/serve");
// A program the registry knows but cannot open yet (no config), read from
// teams/index.js: the phases add teams, so no one name stays unconfigured.
var UNOPENED = (function () {
  var c = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "teams", "index.js"), "utf8"), c);
  return c.TEAM_REGISTRY.filter(function (t) { return !t.config; })[0].id;
})();
var FX = path.join(root, "tools", "fixtures");

var failures = 0;
function ok(cond, what) { if (cond) { console.log("  ok   " + what); return; } failures++; console.log("  FAIL " + what); }

console.log("Suite.favorites");
function store(init) {
  var m = Object.assign({}, init || {});
  return { getItem: function (k) { return k in m ? m[k] : null; }, setItem: function (k, v) { m[k] = String(v); }, removeItem: function (k) { delete m[k]; }, m: m };
}
function fresh(init) {
  var c = vm.createContext({ localStorage: store(init), JSON: JSON });
  vm.runInContext(fs.readFileSync(path.join(root, "suite/favorites.js"), "utf8"), c);
  return c;
}
var f = fresh();
ok(f.Suite.favorites.list().length === 0, "none to begin with");
ok(f.Suite.favorites.toggle("indiana") === true && f.Suite.favorites.toggle("byu") === true && f.Suite.favorites.list().join() === "indiana,byu",
   "starred in the order they were starred");
ok(f.Suite.favorites.toggle("indiana") === false && f.Suite.favorites.list().join() === "byu", "and a second press unstars");
ok(f.Suite.favorites.toggle("../etc") === false && f.Suite.favorites.toggle("Notre-Dame") === false && f.Suite.favorites.list().join() === "byu",
   "an id that is not an id is refused, as the boot script refuses it");
var full = fresh({ "suite-favorites": JSON.stringify(["a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8", "a9", "a10", "a11", "a12"]) });
ok(full.Suite.favorites.toggle("byu") === false && full.Suite.favorites.list().length === 12 && full.Suite.favorites.list()[0] === "a1",
   "a full list refuses the next star, and drops none unasked");
ok(fresh({ "suite-favorites": "{not json" }).Suite.favorites.list().length === 0 &&
   fresh({ "suite-favorites": JSON.stringify({ a: 1 }) }).Suite.favorites.list().length === 0 &&
   fresh({ "suite-favorites": JSON.stringify(["byu", "byu", 7, "x y"]) }).Suite.favorites.list().join() === "byu",
   "storage holding something else reads as no favorites, or only the good ones");
var broken = vm.createContext({ localStorage: { getItem: function () { throw new Error("blocked"); }, setItem: function () { throw new Error("blocked"); } }, JSON: JSON });
vm.runInContext(fs.readFileSync(path.join(root, "suite/favorites.js"), "utf8"), broken);
ok(broken.Suite.favorites.list().length === 0 && broken.Suite.favorites.toggle("byu") === false, "blocked storage: no favorites, and no error");

function fixture(url) {
  var n = /\/schedule\?seasontype=3/.test(url) ? "espn-schedule-nd-2025-post.json"
        : /\/schedule(\?|$)/.test(url) ? "espn-schedule.json"
        : /\/scoreboard\?/.test(url) ? "espn-scoreboard-sep26.json"
        : /\/rankings/.test(url) ? "espn-rankings-sep20.json"
        : /\/news\?/.test(url) ? "espn-news-nd-sep24.json"
        : /\/summary\?/.test(url) ? "espn-summary-pre.json"
        : /\/teams\/\d+\/roster/.test(url) ? "espn-roster-nd-sep24.json"
        : /\/teams\/\d+(\?|$)/.test(url) ? "espn-team.json" : null;
  return n ? fs.readFileSync(path.join(FX, n)) : null;
}

(async function () {
  var server = serve(root);
  await new Promise(function (r) { server.listen(0, "127.0.0.1", r); });
  var base = "http://127.0.0.1:" + server.address().port;
  var browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined });

  // A 2x2 opaque PNG: a logo that loads, so a check can tell a kept image
  // from one drawn again.
  var PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGNkYGD4z8DAwMTAwMDAAAAZBAIBnCQq3wAAAABJRU5ErkJggg==", "base64");
  async function open(url, favs, team, width) {
    var ctx = await browser.newContext({ viewport: { width: width || 390, height: 844 }, serviceWorkers: "block" });
    await ctx.addInitScript(function (a) {
      if (sessionStorage.getItem("__seeded")) return;
      sessionStorage.setItem("__seeded", "1");
      if (a.favs) localStorage.setItem("suite-favorites", a.favs);
      if (a.team) localStorage.setItem("iw-team", a.team);
    }, { favs: favs == null ? null : JSON.stringify(favs), team: team || null });
    var page = await ctx.newPage(), errors = [];
    page.on("pageerror", function (e) { errors.push(String(e)); });
    await page.route("**/*", function (route) {
      var u = route.request().url();
      if (u.startsWith(base)) return route.continue();
      if (/a\.espncdn\.com\/(combiner\/i\?img=)?\/?i\/teamlogos\//.test(u)) return route.fulfill({ status: 200, contentType: "image/png", body: PNG });
      var body = fixture(u);
      if (body) return route.fulfill({ status: 200, contentType: "application/json", body: body });
      return route.abort();
    });
    await page.goto(base + url);
    return { ctx: ctx, page: page, errors: errors };
  }
  function favs(page) { return page.evaluate(function () { return JSON.parse(localStorage.getItem("suite-favorites") || "[]"); }); }

  console.log("the chooser");
  var c = await open("/?choose=1");
  await c.page.waitForSelector(".pick[data-team]");
  var rows = await c.page.evaluate(function () {
    var li = [].slice.call(document.querySelectorAll('#availHead ~ .chooser-list li'));
    return li.map(function (l) { var s = l.querySelector(".fav"); return { team: l.querySelector(".pick").getAttribute("data-team"), star: !!s, pressed: s && s.getAttribute("aria-pressed"), label: s && s.getAttribute("aria-label"), w: s && s.getBoundingClientRect().width, h: s && s.getBoundingClientRect().height }; });
  });
  ok(rows.length >= 6 && rows.every(function (r) { return r.star && r.pressed === "false" && /^Favorite /.test(r.label) && r.w >= 44 && r.h >= 44; }),
     "every team that can be opened has a 44px star, a toggle named for the team (" + rows.length + " teams)");
  var geo = await c.page.evaluate(function () {
    return [].slice.call(document.querySelectorAll('#availHead ~ .chooser-list li')).map(function (l) {
      var card = l.querySelector(".pick").getBoundingClientRect(), star = l.querySelector(".fav svg").getBoundingClientRect(),
          name = l.querySelector(".pick-main").getBoundingClientRect(), chev = l.querySelector(".chev").getBoundingClientRect();
      return star.left >= card.left && star.right <= card.right && star.top >= card.top && star.bottom <= card.bottom &&
             star.left >= name.right && star.right <= chev.left;
    });
  });
  ok(geo.length && geo.every(Boolean), "the star sits inside each team's card, between its name and the chevron, overlapping neither (David, 2026-10-27)");
  var tone = await c.page.evaluate(function () { var b = document.querySelector('#availHead ~ .chooser-list .fav'), st = getComputedStyle(b.querySelector("svg")); return getComputedStyle(b).color + " / " + st.fill; });
  ok(tone === "rgb(184, 132, 90) / none", "in the Suite's bronze, an outline until starred (" + tone + ")");
  ok(await c.page.evaluate(function () { return document.getElementById("yourTeams").hidden && !document.querySelector(".soon .fav"); }),
     "with none starred there is no Your Teams, and a team that cannot be opened has no star");
  await c.page.click('#availHead ~ .chooser-list .fav[data-fav="indiana"]');
  await c.page.waitForTimeout(150);
  var after = await c.page.evaluate(function () {
    var y = document.getElementById("yourTeams");
    return { url: location.search, shown: !y.hidden, teams: [].slice.call(y.querySelectorAll(".pick")).map(function (p) { return p.getAttribute("data-team"); }),
             pressed: [].slice.call(document.querySelectorAll('.fav[data-fav="indiana"]')).map(function (b) { return b.getAttribute("aria-pressed"); }),
             top: y.getBoundingClientRect().top < document.getElementById("availHead").getBoundingClientRect().top };
  });
  ok(after.url === "?choose=1", "a star never opens the team");
  ok(after.shown && after.teams.join() === "indiana" && after.top, "Indiana is under Your Teams, above every team (" + after.teams.join() + ")");
  ok(after.pressed.length === 2 && after.pressed.every(function (p) { return p === "true"; }), "and its star reads pressed in both places");
  ok((await c.page.evaluate(function () { return getComputedStyle(document.querySelector('.fav[data-fav="indiana"] svg')).fill; })) === "rgb(212, 184, 150)",
     "filled champagne once starred, edged in bronze");
  await c.page.waitForFunction(function () { var i = document.querySelector("#yourTeams img[data-mark]"); return i && i.complete && i.naturalWidth > 0; });
  await c.page.evaluate(function () { document.querySelector("#yourTeams img[data-mark]").__kept = true; });
  await c.page.click('#availHead ~ .chooser-list .fav[data-fav="ohio-state"]');
  ok((await favs(c.page)).join() === "indiana,ohio-state", "a second team joins after the first, kept on the device");
  ok(await c.page.evaluate(function () { var i = document.querySelector('#yourTeams .pick[data-team="indiana"] img[data-mark]'); return !!(i && i.__kept); }),
     "and Indiana's logo is the same image, not drawn again: a star flickers no logo (David, 2026-10-28)");
  await c.page.fill("#teamSearch", "ohio");
  await c.page.waitForTimeout(100);
  var srch = await c.page.evaluate(function () {
    return { mine: document.getElementById("yourTeams").hidden,
             shown: [].slice.call(document.querySelectorAll(".pick[data-team]")).filter(function (p) { return p.offsetParent; }).map(function (p) { return p.getAttribute("data-team"); }) };
  });
  ok(srch.mine && srch.shown.join() === "ohio-state", "a search looks through every program once: Your Teams steps aside (" + srch.shown.join() + ")");
  await c.page.fill("#teamSearch", "");
  await c.page.waitForTimeout(100);
  ok(!(await c.page.evaluate(function () { return document.getElementById("yourTeams").hidden; })), "and comes back when the search is cleared");
  await c.page.focus('#yourTeams .fav[data-fav="indiana"]');
  await c.page.keyboard.press("Enter");
  await c.page.waitForTimeout(100);
  var un = await c.page.evaluate(function () {
    var a = document.activeElement;
    return { teams: [].slice.call(document.querySelectorAll("#yourTeams .pick")).map(function (p) { return p.getAttribute("data-team"); }),
             focus: a && a.getAttribute("data-fav"), inAll: !!(a && !a.closest("#yourTeams")) };
  });
  ok(un.teams.join() === "ohio-state" && (await favs(c.page)).join() === "ohio-state", "unstarred from Your Teams, it leaves the list and the device");
  ok(un.focus === "indiana" && un.inAll, "and the keyboard lands on the same team's star in the full list");
  await c.page.click('#yourTeams .pick[data-team="ohio-state"]');
  await c.page.waitForURL(/\?team=ohio-state/);
  ok(/\?team=ohio-state/.test(c.page.url()), "a team under Your Teams opens like any other");
  ok(!c.errors.length, "no page errors (" + c.errors.join(" | ") + ")");
  await c.ctx.close();

  console.log("the header");
  async function header(team, list) {
    var o = await open("/?team=" + team + "#top25", list, team);
    await o.page.waitForFunction(function () { return !document.getElementById("launch"); }, null, { timeout: 15000 });
    return o;
  }
  var q = await header("notre-dame", ["notre-dame"]);
  ok(await q.page.evaluate(function () { var c = document.getElementById("barContext"); return !c.hasAttribute("role") && !c.hasAttribute("tabindex") && !c.querySelector(".bar-switch"); }),
     "nothing to switch to: the team name is quiet context, as decision 0024 drew it");
  await q.ctx.close();
  var none = await header("notre-dame", null);
  ok(await none.page.evaluate(function () { return !document.getElementById("barContext").hasAttribute("role"); }), "and so it is with no favorites at all");
  await none.ctx.close();
  var gone = await header("notre-dame", [UNOPENED]);
  ok(await gone.page.evaluate(function () { return !document.getElementById("barContext").hasAttribute("role"); }), "a favorite that cannot be opened is not one to switch to");
  await gone.ctx.close();

  var h = await header("notre-dame", ["indiana", "ohio-state", UNOPENED]);
  var ctxA = await h.page.evaluate(function () { var c = document.getElementById("barContext"), r = c.getBoundingClientRect();
    return { role: c.getAttribute("role"), tab: c.getAttribute("tabindex"), pop: c.getAttribute("aria-haspopup"), label: c.getAttribute("aria-label"), chev: !!c.querySelector(".bar-switch"), h: r.height }; });
  ok(ctxA.role === "button" && ctxA.tab === "0" && ctxA.pop === "dialog" && ctxA.chev && ctxA.h >= 44,
     "another team to switch to: the team name is a control, with a chevron and a 44px target");
  ok(ctxA.label === "Switch team. Viewing Notre Dame.", "named for what it does and who is being viewed (" + ctxA.label + ")");
  // Drawn ahead, hidden, once the page settles, its logos loading at once:
  // a sheet drawn on the tap showed initials for a second (David, 2026-10-28).
  await h.page.waitForFunction(function () { var x = document.getElementById("switchHost"); return x && x.hidden && x.querySelectorAll("img[data-mark]").length === 3; }, null, { timeout: 8000 });
  ok(await h.page.evaluate(function () { return [].slice.call(document.querySelectorAll("#switchHost img[data-mark]")).every(function (i) { return i.getAttribute("loading") !== "lazy"; }); }),
     "Your Teams is drawn before it is asked for, hidden, its logos not lazy");
  await h.page.waitForFunction(function () { return [].slice.call(document.querySelectorAll("#switchHost img[data-mark]")).every(function (i) { return i.complete && i.naturalWidth > 0; }); });
  await h.page.evaluate(function () { [].slice.call(document.querySelectorAll("#switchHost img[data-mark]")).forEach(function (i) { i.__kept = true; }); });
  await h.page.focus("#barContext");
  await h.page.keyboard.press("Enter");
  await h.page.waitForSelector("#switchHost:not([hidden]) .sh");
  var sh = await h.page.evaluate(function () {
    var host = document.getElementById("switchHost"), rows = [].slice.call(host.querySelectorAll(".sw-list li"));
    return { dialog: !!host.querySelector('[role="dialog"][aria-modal="true"]'), title: host.querySelector(".sh-title").textContent,
             focus: document.activeElement && document.activeElement.id,
             rows: rows.map(function (l) { var b = l.querySelector("[data-switch]"); return b ? b.getAttribute("data-switch") : "here:" + l.querySelector(".pick-name").textContent + ":" + (l.querySelector('[aria-current="true"]') ? "current" : ""); }),
             edit: host.querySelector(".sw-edit a").getAttribute("href"), inert: document.getElementById("main").hasAttribute("inert") };
  });
  ok(sh.dialog && sh.title === "Your Teams" && sh.focus === "swTitle", "Enter opens Your Teams as a dialog, its title focused");
  ok(await h.page.evaluate(function () { var im = [].slice.call(document.querySelectorAll("#switchHost img[data-mark]")); return im.length === 3 && im.every(function (i) { return i.__kept && i.parentNode.classList.contains("loaded"); }); }),
     "opened, it shows the logos already loaded: no initials while they load");
  ok(sh.rows.join() === "here:Notre Dame:current,indiana,ohio-state", "the team being viewed first, shown not offered; then the fan's teams in order; no team that cannot be opened (" + sh.rows.join() + ")");
  ok(sh.edit === "/?change" && sh.inert, "it links to the chooser to edit them, and the page under it is inert");
  await h.page.keyboard.press("Escape");
  await h.page.waitForTimeout(100);
  ok(await h.page.evaluate(function () { return document.getElementById("switchHost").hidden && document.activeElement.id === "barContext" && !document.getElementById("main").hasAttribute("inert"); }),
     "Escape closes it, and focus is back on the team name");
  await h.page.click("#barContext");
  await h.page.waitForSelector("#switchHost:not([hidden]) .sh");
  await h.page.click('#switchHost .sh-scrim', { position: { x: 20, y: 20 } });
  ok(await h.page.evaluate(function () { return document.getElementById("switchHost").hidden; }), "a tap on the dimmed page closes it too");
  await h.page.click("#barContext");
  await h.page.waitForSelector('#switchHost:not([hidden]) [data-switch="indiana"]');
  ok(await h.page.evaluate(function () { return [].slice.call(document.querySelectorAll("#switchHost img[data-mark]")).every(function (i) { return i.__kept; }); }),
     "and opened again, the same images: closing it keeps them");
  await h.page.click('#switchHost [data-switch="indiana"]');
  await h.page.waitForURL(/\?team=indiana/);
  var landed = await h.page.evaluate(function () { return { search: location.search, hash: location.hash, stored: localStorage.getItem("iw-team") }; });
  ok(landed.search === "?team=indiana" && landed.hash === "#top25" && landed.stored === "indiana", "one tap opens Indiana on the same screen, and it is the team stored (" + landed.search + landed.hash + ")");
  await h.page.waitForFunction(function () { return !document.getElementById("launch"); }, null, { timeout: 15000 });
  ok(await h.page.evaluate(function () { return document.getElementById("barContext").getAttribute("aria-label") === "Switch team. Viewing Indiana."; }),
     "and from Indiana, Notre Dame is not a favorite: the switch still offers Ohio State");
  ok(!h.errors.length, "no page errors (" + h.errors.join(" | ") + ")");
  await h.ctx.close();

  // The team's name in the bar, whole, with the chevron beside it, on the
  // narrowest phone: NORTHWESTERN was cut to NORTHWESTER (David, 2026-10-28).
  console.log(" the team's name fits the bar");
  var configured = fs.readdirSync(path.join(root, "teams")).filter(function (f) { return /\.js$/.test(f) && f !== "index.js"; }).map(function (f) { return f.slice(0, -3); });
  var cut = [];
  for (var wi = 0; wi < 2; wi++) {
    var width = [320, 390][wi];
    for (var ti = 0; ti < configured.length; ti++) {
      var team = configured[ti], other = team === "ohio-state" ? "notre-dame" : "ohio-state";
      var o = await open("/?team=" + team + "#top25", [team, other], team, width);
      await o.page.waitForFunction(function () { return !document.getElementById("launch"); }, null, { timeout: 15000 });
      await o.page.evaluate(function () { return document.fonts.ready; });
      var fit = await o.page.evaluate(function () { var e = document.getElementById("barTeam"), c = document.getElementById("barContext");
        return { over: e.scrollWidth > e.clientWidth + 1, text: e.textContent, chev: !!c.querySelector(".bar-switch") }; });
      if (fit.over || !fit.chev) cut.push(team + "@" + width + ":" + fit.text + (fit.chev ? "" : " (no chevron)"));
      await o.ctx.close();
    }
  }
  ok(!cut.length, "every configured team's name shows whole beside the chevron at 320 and 390 pixels (" + (cut.join(", ") || configured.length + " teams") + ")");

  await browser.close(); server.close();
  console.log("\n" + (failures ? failures + " check(s) FAILED" : "the fan's teams are a star away, and a tap apart"));
  process.exit(failures ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
