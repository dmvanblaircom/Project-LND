#!/usr/bin/env node
/* Suite's edge API (worker/src/index.js, decision 0030), run in Node with
   a stand-in cache and a stand-in CFBD - no network, no key.

   It answers only what a screen shows, holds the key server-side, speaks
   only to Suite's origin, serves a cached copy (marked stale) when CFBD
   fails, and never passes CFBD's raw payload or errors through.

   Usage: node tools/workercheck.mjs      (exit 1 on any failure) */
import worker, { pickSeason, pickSp, schoolIds, wholeSp, SP_TOP, VERSION, CFBD_FIELDS, startRefresh, CLOCK, probeEspn, PROBE , ALERTS_CRON, Alerts, Ratings, spClock } from "../worker/src/index.js";
import { migrateSp, keepSp, spWeeks, spWeek, spIdOf, spDue, weekOf, SP_DUE, SP_KEEP_MAX } from "../worker/src/sp.js";
import { validSubscription, validTeam, subscribe, unsubscribe, tick, minute, LIMITS, migrate, vapidKey, b64u, unb64u, APP_URL, report, validOptions, scoreStep, DEFAULTS,
         words, playText, tryOf, scoringPlays, network, pickGame, kickoffs, timeChanges, claimKey, cfpShow, cfpRelease,
         stageOf, postGames, fieldSet, selectionFor } from "../worker/src/push.js";
import { RANKINGS_SHOWS, SELECTION_DAYS } from "../worker/src/calendar.js";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { SCHOOLS } from "../worker/src/schools.js";

let failures = 0;
function ok(cond, what) { console.log("  " + (cond ? "ok  " : "FAIL") + " " + what); if (!cond) failures++; }

function memoryCache() {
  const m = new Map();
  return { match: async (k) => { const v = m.get(k.url); return v ? new Response(v) : undefined; },
           put: async (k, r) => { m.set(k.url, await r.text()); }, size: () => m.size, map: m };
}
const ROWS = [
  { season: 2026, team: "Notre Dame", conference: "FBS Independents", statName: "rushingYards", statValue: 1100 },
  { season: 2026, team: "Notre Dame", conference: "FBS Independents", statName: "games", statValue: 4 },
  { season: 2026, team: "Notre Dame", conference: "FBS Independents", statName: "secretSauce", statValue: 9 },
  { season: 2026, team: "Ohio State", conference: "Big Ten", statName: "rushingYards", statValue: 800 },
  { season: 2025, team: "Notre Dame", conference: "FBS Independents", statName: "rushingYards", statValue: 3000 },
  { season: 2026, team: "Notre Dame", conference: "FBS Independents", statName: "netPassingYards", statValue: "n/a" }
];
const FIELDS = ["rushingYards", "games", "netPassingYards", "turnovers"];
const SITE = "https://dmvanblaircom.github.io";

function env(opts) {
  opts = opts || {};
  const calls = [];
  // the season is judged against this date, so the checks do not age
  return { calls, NOW: () => Date.parse("2026-10-02T12:00:00Z"), CACHE: opts.cache || memoryCache(), FIELDS, CFBD_API_KEY: "key" in opts ? opts.key : "test-key",
    FETCH: async (url, init) => { calls.push({ url, init });
      if (opts.down) throw new Error("network");
      if (opts.status) return new Response("upstream says no: " + "x".repeat(50), { status: opts.status });
      return new Response(JSON.stringify(ROWS), { status: 200, headers: { "content-type": "application/json" } }); } };
}
async function get(path, e, origin) {
  const r = await worker.fetch(new Request("https://suite-api.example" + path, { headers: origin ? { origin } : {} }), e, null);
  return { r, body: r.status === 204 ? null : await r.json() };
}

console.log("what may leave CFBD");
ok(JSON.stringify(CFBD_FIELDS) === JSON.stringify(["games", "rushingYardsOpponent", "netPassingYardsOpponent"]),
   "exactly the three fields W15 needs, read from a real CFBD response - widening it is a deliberate change");

console.log("health");
{ const { r, body } = await get("/v1/health", env());
  ok(r.status === 200 && body.ok === true && body.version === VERSION, "answers with its version");
  ok(body.clock === false && !JSON.stringify(body).includes("tok"), "says whether the clock has its token - never the token");
  const withTok = await get("/v1/health", Object.assign(env(), { REFRESH_CLOCK_TOKEN: "secret-token" }));
  ok(withTok.body.clock === true && !JSON.stringify(withTok.body).includes("secret-token"), "and with one set, true, still without it"); }

console.log("the refresh clock");
{ const sent = [];
  const e = (status, fail) => ({ REFRESH_CLOCK_TOKEN: "clock-token",
    FETCH: async (url, init) => { sent.push({ url, init }); if (fail) throw new Error("down"); return new Response(null, { status }); } });
  ok(await startRefresh(e(204)) === "started", "starts the refresh");
  const s = sent[0], body = JSON.parse(s.init.body);
  ok(s.url === "https://api.github.com/repos/" + CLOCK.repo + "/actions/workflows/odds.yml/dispatches" && s.init.method === "POST",
     "by dispatching the Refresh team data workflow");
  ok(body.ref === "main" && body.inputs.source === "clock", "on main, as the clock, so its runs are titled (clock) and follow the cadence rules");
  ok(s.init.headers.authorization === "Bearer clock-token" && !!s.init.headers["user-agent"], "with its token, and a user agent GitHub requires");
  ok(await startRefresh(e(401)) === "refused-401", "a refused token is reported, not thrown");
  ok(await startRefresh(e(204, true)) === "unreachable", "GitHub unreachable: reported, not thrown");
  const before = sent.length;
  ok(await startRefresh({}) === "no-token" && sent.length === before, "no token set: nothing is sent");
  let waited = null;
  await worker.scheduled({ cron: "7,37 * * * *" }, e(204), { waitUntil: (p) => { waited = p; } });
  ok(waited && await waited === "started", "the scheduled event runs it to completion"); }

console.log("the ESPN probe (W19 Phase 0)");
{ const asked = [];
  const e = (status, body, fail) => ({ FETCH: async (url) => { asked.push(url); if (fail) throw new Error("down");
    return new Response(body === undefined ? JSON.stringify({ events: [{ id: 1 }, { id: 2 }], leagues: [{ secret: "x" }] }) : body, { status }); } });
  const r = await probeEspn(e(200), "ORD");
  ok(asked[0] === PROBE.espn && /scoreboard\?groups=80/.test(asked[0]), "asks ESPN's FBS scoreboard, the one the app reads");
  ok(r.status === 200 && r.events === 2 && typeof r.ms === "number" && r.colo === "ORD", "reports status, time, game count and location");
  ok(!JSON.stringify(r).includes("secret") && !("events" in r && Array.isArray(r.events)), "and never ESPN's data");
  const blocked = await probeEspn(e(403, "blocked"));
  ok(blocked.status === 403 && blocked.events === null, "a refusal is reported as its status");
  const down = await probeEspn(e(0, undefined, true));
  ok(down.status === 0 && down.error === "unreachable", "ESPN unreachable: reported, not thrown");
  const route = await worker.fetch(new Request("https://suite-api.example/v1/probe/espn"), e(200), null);
  const rb = await route.json();
  ok(route.status === 200 && rb.source === "probe" && rb.events === 2 && route.headers.get("cache-control") === "no-store",
     "the route answers with the probe, never cached"); }

console.log("only what a screen shows");
{ const s = pickSeason(ROWS, "notre dame", 2026, FIELDS);
  ok(JSON.stringify(s) === JSON.stringify({ rushingYards: 1100, games: 4 }), "this team, this season, allowed fields only = " + JSON.stringify(s));
  ok(!("secretSauce" in s), "a field not on the list is dropped");
  ok(!("netPassingYards" in s) && !("turnovers" in s), "a non-number or absent field stays absent - never 0");
  ok(JSON.stringify(pickSeason(ROWS, "Notre Dame", 2026, [])) === "{}", "with no fields approved yet, nothing at all");
  ok(JSON.stringify(pickSeason({ error: "x" }, "Notre Dame", 2026, FIELDS)) === "{}", "a non-list payload gives nothing"); }

console.log("the CFBD route");
{ const e = env();
  const { r, body } = await get("/v1/cfbd/season?team=Notre%20Dame&year=2026", e, SITE);
  ok(r.status === 200 && body.source === "cfbd" && body.team === "Notre Dame" && body.year === 2026, "answers for the team and year asked");
  ok(JSON.stringify(body.stats) === JSON.stringify({ rushingYards: 1100, games: 4 }), "with the allowed fields only");
  ok(!JSON.stringify(body).includes("Ohio State") && !JSON.stringify(body).includes("conference"), "never CFBD's raw rows");
  ok(e.calls.length === 1 && e.calls[0].init.headers.authorization === "Bearer test-key", "the key goes to CFBD, server-side");
  ok(!JSON.stringify(body).includes("test-key"), "and never comes back to the caller");
  ok(r.headers.get("access-control-allow-origin") === SITE, "Suite's origin may read it");
  const other = await get("/v1/cfbd/season?team=Notre%20Dame&year=2026", e, "https://elsewhere.example");
  ok(other.r.headers.get("access-control-allow-origin") === null, "another site's browser may not");
  await get("/v1/cfbd/season?team=notre%20dame&year=2026", e, SITE);
  ok(e.calls.length === 1, "a second request within the fresh window is served from the cache: CFBD called once");
  const wider = Object.assign({}, e, { FIELDS: FIELDS.concat(["sacks"]) });
  await get("/v1/cfbd/season?team=Notre%20Dame&year=2026", wider, SITE);
  ok(e.calls.length === 2, "after the allowed fields change, the old copy is not reused: CFBD is asked again"); }

console.log("when CFBD fails");
{ const cache = memoryCache();
  await get("/v1/cfbd/season?team=Notre%20Dame&year=2026", env({ cache }), SITE);
  const k = [...cache.map.keys()][0], old = JSON.parse(cache.map.get(k));
  old.fetchedAt = new Date(Date.now() - 7 * 3600 * 1000).toISOString(); cache.map.set(k, JSON.stringify(old));
  const down = await get("/v1/cfbd/season?team=Notre%20Dame&year=2026", env({ cache, down: true }), SITE);
  ok(down.r.status === 200 && down.body.stale === true && down.body.stats.rushingYards === 1100 && down.body.fetchedAt === old.fetchedAt,
     "past the fresh window and CFBD down: the saved copy, marked stale, with its own time");
  const none = await get("/v1/cfbd/season?team=Notre%20Dame&year=2026", env({ status: 500 }), SITE);
  ok(none.r.status === 502 && none.body.error === "CFBD could not be reached" && !JSON.stringify(none.body).includes("upstream"),
     "nothing saved and CFBD failing: a plain error, never CFBD's body");
  ok(none.r.headers.get("cache-control") === "no-store", "and an error is never cached"); }

console.log("the schools it answers for");
{ const fs = await import("fs"), vm = await import("vm");
  const c = vm.createContext({});
  vm.runInContext(fs.readFileSync(new URL("../teams/index.js", import.meta.url), "utf8") + "\nthis.R = TEAM_REGISTRY;", c);
  const reg = c.R.map((t) => t.name);
  ok(SCHOOLS.length >= 100 && reg.every((n) => SCHOOLS.includes(n)), "every program in the registry (" + reg.length + "), by the name the app sends");
  ok(SCHOOLS.every((n) => reg.includes(n)), "and nothing else"); }

console.log("bad requests");
{ const e = env();
  ok((await get("/v1/cfbd/season?year=2026", e)).r.status === 400, "no team: 400");
  ok((await get("/v1/cfbd/season?team=%3Cscript%3E&year=2026", e)).r.status === 400, "a team that is not a name: 400");
  ok((await get("/v1/cfbd/season?team=Notre%20Dame", e)).r.status === 400, "no year: 400");
  ok(e.calls.length === 0, "none of them reaches CFBD");
  // Bug hunt, 2026-10-02: any name or year used to reach CFBD and spend the
  // key's monthly allowance.
  ok((await get("/v1/cfbd/season?team=Made%20Up%20State&year=2026", e)).r.status === 404, "a school not in the registry: 404");
  ok((await get("/v1/cfbd/season?team=Notre%20Dame&year=2019", e)).r.status === 400, "a season before last: 400");
  ok((await get("/v1/cfbd/season?team=Notre%20Dame&year=2027", e)).r.status === 400, "a season not yet played: 400");
  ok(e.calls.length === 0, "none of those reaches CFBD either");
  ok((await get("/v1/cfbd/season?team=Notre%20Dame&year=2025", e)).r.status === 200 && e.calls.length === 1, "last season is still answered (January's bowl games)");
  ok((await get("/v1/cfbd/season?team=ohio%20state&year=2026", e)).r.status === 200, "a registry school in any case is answered");
  ok((await get("/v1/cfbd/season?team=Notre%20Dame&year=2026", env({ key: "" }))).r.status === 503, "no key configured: 503, not a crash");
  ok((await get("/nope", e)).r.status === 404, "an unknown route: 404");
  const post = await worker.fetch(new Request("https://suite-api.example/v1/health", { method: "POST" }), e, null);
  ok(post.status === 405, "anything but GET: 405");
  const pre = await worker.fetch(new Request("https://suite-api.example/v1/cfbd/season", { method: "OPTIONS", headers: { origin: SITE } }), e, null);
  ok(pre.status === 204 && pre.headers.get("access-control-allow-origin") === SITE, "the browser's preflight is answered for Suite"); }

// ---- SP+ (handoff 2026-10-14, slice 4) -----------------------------------------
// Made-up figures in CFBD's shape (the probe of 2026-10-14 read the shape, never
// the values): no CFBD data lives in this repository. 30 ranked schools with a
// tie at 3 and at 25, the unranked national-averages row CFBD adds, a school
// CFBD's FBS list does not have, and a row from another season.
const SP_SCHOOLS = SCHOOLS.slice(0, 30);
function spRows(year) {
  const rows = SP_SCHOOLS.map((team, i) => {
    const rank = i < 3 ? i + 1 : i === 3 ? 3 : i < 25 ? i + 1 : i === 25 ? 25 : i + 1;
    return { year, team, conference: "Somewhere", rating: 30 - i * 1.5, ranking: rank, secondOrderWins: null, sos: null,
             offense: { ranking: i + 1, rating: 40 }, defense: { ranking: i + 1, rating: 10 }, specialTeams: { rating: 0.5 } };
  });
  rows[5].team = "Nowhere Tech";          // not in CFBD's FBS list
  rows[7].rating = 0; rows[8].rating = -2.5;
  rows.push({ year, team: "nationalAverages", rating: 0.1, ranking: null, offense: {}, defense: {}, specialTeams: {} });
  rows.push(Object.assign({}, rows[0], { year: year - 1, team: SP_SCHOOLS[29], ranking: 1 }));
  return rows;
}
function fbs(year) {
  return SP_SCHOOLS.map((school, i) => ({ id: 1000 + i, school, mascot: "M", abbreviation: "X", conference: "Somewhere",
    logos: ["https://example/logo.png"], location: { city: "C" } }));
}
function spEnv(opts) {
  opts = opts || {};
  const calls = [];
  return { calls, NOW: () => Date.parse("2026-10-14T12:00:00Z"), CACHE: opts.cache || memoryCache(), CFBD_API_KEY: "key" in opts ? opts.key : "test-key",
    FETCH: async (url, init) => { calls.push({ url, init });
      const sp = /\/ratings\/sp\?/.test(url), year = Number(/year=(\d+)/.exec(url)[1]);
      if (opts.down || (sp && opts.spDown) || (!sp && opts.teamsDown)) throw new Error("network");
      if (sp && opts.spStatus) return new Response("upstream says no: " + "x".repeat(50), { status: opts.spStatus });
      const body = sp ? (opts.sp ? opts.sp(year) : spRows(year)) : (opts.teams ? opts.teams(year) : fbs(year));
      return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } }); } };
}

console.log("SP+: what may leave CFBD (Bill, Oct 1: the top 25 with ranks and ratings)");
{ const ids = schoolIds(fbs(2026)), ranks = pickSp(spRows(2026), ids, 2026);
  ok(SP_TOP === 25 && ranks.every((r) => r.rank >= 1 && r.rank <= 25), "only ranks 1 to 25");
  eq(ranks.length, 26, "every row ranked 25 or better, ties included (two ties: 26 rows)");
  ok(ranks.every((r) => JSON.stringify(Object.keys(r)) === JSON.stringify(["rank", "team", "id", "rating"])), "each with rank, school, id and rating - nothing else");
  ok(!ranks.some((r) => r.team === "nationalAverages"), "CFBD's unranked national-averages row is dropped");
  ok(!ranks.some((r) => r.team === SP_SCHOOLS[29]), "a row from another season is dropped");
  ok(ranks.every((r, i) => !i || r.rank >= ranks[i - 1].rank), "in rank order");
  ok(ranks.filter((r) => r.rank === 3).length === 2 && ranks.filter((r) => r.rank === 25).length === 2, "a tie keeps both schools at the shared rank");
  ok(ranks.some((r) => r.rating === 0) && ranks.some((r) => r.rating === -2.5), "a 0 and a negative rating are ratings");
  ok(ranks.find((r) => r.team === SP_SCHOOLS[0]).id === "1000", "a school is joined to CFBD's id for it, as a string");
  ok(ranks.find((r) => r.team === "Nowhere Tech").id === null, "a school CFBD's FBS list does not have keeps no id - never a guess");
  const twice = schoolIds(fbs(2026).concat([{ id: 77, school: SP_SCHOOLS[0] }]));
  ok(twice.get(SP_SCHOOLS[0]) === null, "a school listed twice names no one");
  ok(pickSp(spRows(2026), null, 2026).every((r) => r.id === null), "with no list at all, no ids");
  ok(wholeSp(ranks) && !wholeSp(ranks.slice(0, 24)) && !wholeSp(ranks.slice(1)), "whole: rank 1 and at least 25 rows");
  eq(pickSp({ error: "x" }, ids, 2026), [], "a non-list payload gives nothing");
  // Codex (#142): a malformed row must not leave a table that only looks whole.
  const tie25 = spRows(2026); tie25[25].rating = null;
  eq(pickSp(tie25, ids, 2026), null, "a top-25 row without a rating: the whole table is refused, not the row dropped");
  const noName = spRows(2026); noName[3].team = "";
  eq(pickSp(noName, ids, 2026), null, "a top-25 row without a school: refused too");
  const deep = spRows(2026); deep[28].rating = null;
  ok(pickSp(deep, ids, 2026).length === 26, "a bad row past 25 is not the table's business");
  ok(!wholeSp(ranks.filter((r, i) => i !== 3)), "a missing tied school leaves a gap (1, 2, 3, 5): not whole");
  ok(!wholeSp(ranks.slice(0, 25).concat([Object.assign({}, ranks[25], { team: ranks[0].team })])), "a school twice: not whole");
  ok(!wholeSp(ranks.map((r) => r.rank === 7 ? Object.assign({}, r, { rank: 8 }) : r)), "a skipped rank: not whole");
  ok(!wholeSp(null), "nothing: not whole"); }

console.log("SP+: the route");
{ const e = spEnv();
  const { r, body } = await get("/v1/cfbd/sp?year=2026", e, SITE);
  ok(r.status === 200 && body.source === "cfbd-sp" && body.year === 2026 && body.ranks.length === 26, "answers with the season's top 25");
  ok(JSON.stringify(Object.keys(body).sort()) === JSON.stringify(["fetchedAt", "ranks", "source", "year"]), "and nothing else: no edition time CFBD never gave");
  const text = JSON.stringify(body);
  ok(!/offense|defense|specialTeams|conference|secondOrderWins|sos|logos|mascot|nationalAverages/.test(text), "never CFBD's other fields, its averages row or its team list");
  ok(e.calls.length === 2 && /\/ratings\/sp\?year=2026$/.test(e.calls[0].url) && /\/teams\/fbs\?year=2026$/.test(e.calls[1].url),
     "asks CFBD for the season's SP+ and its FBS list");
  ok(e.calls.every((c) => c.init.headers.authorization === "Bearer test-key") && !text.includes("test-key"), "the key goes to CFBD, server-side, and never back");
  ok(r.headers.get("access-control-allow-origin") === SITE, "Suite's origin may read it");
  await get("/v1/cfbd/sp?year=2026", e, SITE);
  ok(e.calls.length === 2, "a second request within the fresh window is served from the cache");
  const k = [...e.CACHE.map.keys()].find((x) => /\/sp\?/.test(x)), aged = JSON.parse(e.CACHE.map.get(k));
  aged.fetchedAt = new Date(Date.now() - 13 * 3600e3).toISOString(); e.CACHE.map.set(k, JSON.stringify(aged));
  await get("/v1/cfbd/sp?year=2026", e, SITE);
  ok(e.calls.length === 3 && /ratings\/sp/.test(e.calls[2].url), "after 12 hours SP+ is asked again - and the FBS list, kept for a week, is not"); }

console.log("SP+: when CFBD fails or has nothing");
{ const cache = memoryCache();
  await get("/v1/cfbd/sp?year=2026", spEnv({ cache }), SITE);
  const k = [...cache.map.keys()].find((x) => /\/sp\?/.test(x)), old = JSON.parse(cache.map.get(k));
  old.fetchedAt = new Date(Date.now() - 13 * 3600e3).toISOString(); cache.map.set(k, JSON.stringify(old));
  const down = await get("/v1/cfbd/sp?year=2026", spEnv({ cache, spDown: true }), SITE);
  ok(down.r.status === 200 && down.body.stale === true && down.body.ranks.length === 26 && down.body.fetchedAt === old.fetchedAt,
     "past the fresh window and CFBD down: the saved table, marked stale, with its own time");
  const part = await get("/v1/cfbd/sp?year=2026", spEnv({ cache, sp: (y) => spRows(y).slice(0, 20) }), SITE);
  ok(part.body.stale === true && part.body.ranks.length === 26, "a partial table never replaces the saved whole one");
  const none = await get("/v1/cfbd/sp?year=2026", spEnv({ spStatus: 500 }), SITE);
  ok(none.r.status === 502 && !JSON.stringify(none.body).includes("upstream") && none.r.headers.get("cache-control") === "no-store",
     "nothing saved and CFBD failing: a plain error, never CFBD's body, never cached");
  const noTeams = await get("/v1/cfbd/sp?year=2026", spEnv({ teamsDown: true }), SITE);
  ok(noTeams.r.status === 502, "SP+ but no FBS list to place its schools: a failure, not a table without identities");
  const firstRank = await get("/v1/cfbd/sp?year=2026", spEnv({ sp: (y) => spRows(y).filter((r) => r.ranking !== 1) }), SITE);
  ok(firstRank.r.status === 502, "a table with no #1 is not a top 25");
  const cache2 = memoryCache();
  await get("/v1/cfbd/sp?year=2026", spEnv({ cache: cache2 }), SITE);
  const k2 = [...cache2.map.keys()].find((x) => /\/sp\?/.test(x)), o2 = JSON.parse(cache2.map.get(k2));
  o2.fetchedAt = new Date(Date.now() - 13 * 3600e3).toISOString(); cache2.map.set(k2, JSON.stringify(o2));
  const broken = await get("/v1/cfbd/sp?year=2026", spEnv({ cache: cache2, sp: (y) => { const r = spRows(y); r[25].rating = null; return r; } }), SITE);
  ok(broken.body.stale === true && broken.body.ranks.length === 26, "a tied table missing a row never replaces the saved whole one (Codex, #142)");
  const empty = spEnv({ sp: () => [] });
  const unpub = await get("/v1/cfbd/sp?year=2026", empty, SITE);
  ok(unpub.r.status === 200 && Array.isArray(unpub.body.ranks) && unpub.body.ranks.length === 0 && !unpub.body.stale,
     "CFBD's empty list: not published for that season - an answer, not an error");
  ok(empty.calls.length === 1, "and the FBS list is not spent on it"); }

console.log("SP+: bad requests");
{ const e = spEnv();
  ok((await get("/v1/cfbd/sp", e)).r.status === 400, "no year: 400");
  ok((await get("/v1/cfbd/sp?year=2024", e)).r.status === 400, "a season before last: 400");
  ok((await get("/v1/cfbd/sp?year=2027", e)).r.status === 400, "a season not yet played: 400");
  ok((await get("/v1/cfbd/sp?year=2025", e)).r.status === 200, "last season is answered");
  ok((await get("/v1/cfbd/sp?year=2026", spEnv({ key: "" }))).r.status === 503, "no key configured: 503");
  ok(e.calls.every((c) => /year=2025/.test(c.url)), "and only the answered season reached CFBD");
  // In March the app's season is last year's; its "earlier" season is the
  // one before that (code review, 2026-10-25).
  const march = spEnv(); march.NOW = () => Date.parse("2027-03-10T12:00:00Z");
  eq([(await get("/v1/cfbd/sp?year=2026", march)).r.status, (await get("/v1/cfbd/sp?year=2025", march)).r.status,
      (await get("/v1/cfbd/sp?year=2027", march)).r.status, (await get("/v1/cfbd/sp?year=2024", march)).r.status],
     [200, 200, 400, 400], "in March: the app's season (2026) and the one before it (2025), as its seasonYear counts them"); }

// ---- game alerts (W19, worker/src/push.js) -----------------------------------
function eq(a, b, what) {
  const same = JSON.stringify(a) === JSON.stringify(b);
  ok(same, what + " = " + JSON.stringify(b) + (same ? "" : " (got " + JSON.stringify(a) + ")"));
}
// A SQLite-backed Durable Object's `storage.sql`, played by node:sqlite.
function fakeSql() {
  const db = new DatabaseSync(":memory:");
  return { exec(q, ...b) {
    const st = db.prepare(q);
    if (/^\s*SELECT/i.test(q)) { const rows = st.all(...b); return { toArray: () => rows, rowsWritten: 0 }; }
    if (b.length === 0 && /^\s*CREATE/i.test(q)) { db.exec(q); return { toArray: () => [], rowsWritten: 0 }; }
    const r = st.run(...b); return { toArray: () => [], rowsWritten: Number(r.changes) };
  } };
}
// A browser's push subscription, with the keys a real browser would make.
async function browserSub(host) {
  const kp = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", kp.publicKey));
  return { sub: { endpoint: "https://" + (host || "web.push.apple.com") + "/QAbc" + Math.random().toString(36).slice(2),
                  keys: { p256dh: b64u(raw), auth: b64u(crypto.getRandomValues(new Uint8Array(16))) } }, kp };
}
// RFC 8291 decryption, written out independently, so a pushed body is read
// back the way a browser would read it.
// An alert as the lock screen shows it: title, then body.
const say = (m) => m.title + " | " + m.body;
async function openPush(body, kp, authB64) {
  const b = new Uint8Array(body), salt = b.slice(0, 16), idlen = b[20], asPub = b.slice(21, 21 + idlen), sealed = b.slice(21 + idlen);
  const uaPub = new Uint8Array(await crypto.subtle.exportKey("raw", kp.publicKey));
  const peer = await crypto.subtle.importKey("raw", asPub, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: peer }, kp.privateKey, 256));
  const H = async (s, k, i, n) => new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: s, info: i },
                                   await crypto.subtle.importKey("raw", k, "HKDF", false, ["deriveBits"]), n * 8));
  const te = new TextEncoder(), cat = (...a) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let i = 0; a.forEach((x) => { o.set(x, i); i += x.length; }); return o; };
  const ikm = await H(unb64u(authB64), shared, cat(te.encode("WebPush: info\0"), uaPub, asPub), 32);
  const cek = await H(salt, ikm, te.encode("Content-Encoding: aes128gcm\0"), 16), nonce = await H(salt, ikm, te.encode("Content-Encoding: nonce\0"), 12);
  const plain = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce },
                               await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["decrypt"]), sealed));
  return JSON.parse(new TextDecoder().decode(plain.slice(0, plain.lastIndexOf(2))));
}

const OSU_SCHEDULE = JSON.parse(readFileSync(new URL("./fixtures/espn-schedule-osu-2026.json", import.meta.url), "utf8"));
const GAME = "401858473", KICK = Date.parse("2026-10-03T19:30:00Z");
// ESPN and the push services, scripted. `status` is what ESPN's status
// endpoint says now; `scores` its score endpoint; `push` the push service's answer.
function alertEnv(o) {
  const calls = [], pushes = [];
  const e = { calls, pushes, status: o.status, scores: o.scores || {}, push: o.push || 201,
    FETCH: async (url, init) => {
      calls.push(url);
      if (/\/teams\/194\/schedule$/.test(url)) return e.down ? new Response("", { status: 503 }) : new Response(JSON.stringify(OSU_SCHEDULE), { status: 200 });
      if (/\/summary\?event=\d+$/.test(url)) return e.summary ? new Response(JSON.stringify(typeof e.summary === "function" ? e.summary() : e.summary), { status: 200 }) : new Response("", { status: 503 });
      if (/\/competitions\/\d+\/status$/.test(url)) return e.status ? new Response(JSON.stringify(e.status), { status: 200 }) : new Response("", { status: 503 });
      const sc = /\/competitors\/(\d+)\/score$/.exec(url);
      if (sc) return e.scores[sc[1]] == null ? new Response("", { status: 404 }) : new Response(JSON.stringify({ value: e.scores[sc[1]] }), { status: 200 });
      pushes.push({ url, init }); return new Response("", { status: typeof e.push === "function" ? e.push(url) : e.push });
    } };
  return e;
}
const st = (state, period, name, completed) => ({ period, type: { state, name: name || "STATUS_X", completed: !!completed } });
const dbOf = () => { const sql = fakeSql(); const db = { exec: (q) => sql.exec(q), all: (q, ...b) => sql.exec(q, ...b).toArray(),
                                                       run: (q, ...b) => ({ changes: sql.exec(q, ...b).rowsWritten }) };
                     migrate(db); return db; };

console.log("game alerts: who may subscribe");
{ ok(!validSubscription({ endpoint: "https://evil.example/x", keys: { p256dh: "A".repeat(87), auth: "B".repeat(22) } }), "a push address that is no browser's push service: refused (never a relay)");
  ok(!validSubscription({ endpoint: "http://fcm.googleapis.com/x", keys: { p256dh: "A".repeat(87), auth: "B".repeat(22) } }), "not https: refused");
  ok(!validSubscription({ endpoint: "https://fcm.googleapis.com/x", keys: { p256dh: "short", auth: "B".repeat(22) } }), "bad keys: refused");
  ok(validSubscription((await browserSub("fcm.googleapis.com")).sub) && validSubscription((await browserSub()).sub), "Chrome's and Apple's push services: accepted");
  ok(!validTeam({ id: "abc", name: "Ohio State" }) && !validTeam({ id: "194", name: "<b>" }), "a team needs an ESPN id and a plain name");
  eq(validTeam({ id: 194, name: "Ohio State" }), { id: "194", name: "Ohio State" }, "the team the app sends"); }

console.log("game alerts: subscribing");
{ const db = dbOf(), e = alertEnv({}), b = await browserSub();
  const r = await subscribe(db, e, { subscription: b.sub, team: { id: "194", name: "Ohio State" } }, KICK - 3 * 3600e3);
  ok(r.status === 200 && r.body.confirmation === "sent", "stored, and a confirmation is sent at once");
  const p = e.pushes[0];
  ok(p && p.url === b.sub.endpoint && p.init.headers["content-encoding"] === "aes128gcm" && /^vapid t=[^,]+, k=[A-Za-z0-9_-]{87}$/.test(p.init.headers.authorization),
     "sent to the browser's own push address, encrypted (aes128gcm) and signed (VAPID)");
  const msg = await openPush(p.init.body, b.kp, b.sub.keys.auth);
  eq([msg.title, msg.body], ["Ohio State", "Game alerts are on."], "the browser reads the confirmation");
  const again = await subscribe(db, e, { subscription: b.sub, team: { id: "194", name: "Ohio State" } }, KICK - 3 * 3600e3);
  ok(again.status === 200 && db.all("SELECT COUNT(*) AS n FROM subs")[0].n === 1, "subscribing twice keeps one row");
  const key1 = await vapidKey(db, e), key2 = await vapidKey(db, e);
  ok(key1.d && key1.d === key2.d, "one VAPID key pair, made once and kept");
  ok((await subscribe(db, e, { subscription: { endpoint: "https://evil.example/x" }, team: { id: "194", name: "Ohio State" } }, 0)).status === 400, "a bad subscription: 400");
  const gone = alertEnv({ push: 410 }), b2 = await browserSub();
  ok((await subscribe(db, gone, { subscription: b2.sub, team: { id: "194", name: "Ohio State" } }, 0)).status === 410 &&
     db.all("SELECT COUNT(*) AS n FROM subs WHERE endpoint = ?", b2.sub.endpoint)[0].n === 0, "a subscription the push service has dropped is not kept");
  unsubscribe(db, { endpoint: b.sub.endpoint, team: { id: "194" } });
  ok(db.all("SELECT COUNT(*) AS n FROM subs")[0].n === 0, "off is off: the row is gone"); }

console.log("game alerts: a whole game, minute by minute (Ohio State at Iowa, Oct 3)");
{ const db = dbOf(), e = alertEnv({}), b = await browserSub();
  await subscribe(db, e, { subscription: b.sub, team: { id: "194", name: "Ohio State" } }, KICK - 4 * 3600e3);
  e.pushes.length = 0; e.calls.length = 0;
  let log = await tick(db, e, KICK - 3 * 3600e3);
  ok(/waiting/.test(log[0]) && e.calls.length === 1 && /schedule$/.test(e.calls[0]), "three hours out: the schedule is read, the game is not polled");
  e.calls.length = 0; await tick(db, e, KICK - 2.5 * 3600e3);
  ok(e.calls.length === 0, "and the next minutes ask ESPN nothing");
  e.status = st("pre", 0, "STATUS_SCHEDULED");
  await tick(db, e, KICK - 10 * 60e3);
  ok(e.pushes.length === 0 && e.calls.some((u) => /\/events\/401858473\/competitions\/401858473\/status$/.test(u)), "from 20 minutes before: the game's status is polled; nothing due yet");
  e.status = st("in", 1, "STATUS_IN_PROGRESS");
  log = await tick(db, e, KICK + 2 * 60e3);
  const k = e.pushes.length === 1 ? await openPush(e.pushes[0].init.body, b.kp, b.sub.keys.auth) : {};
  eq([k.title, k.body, k.url, k.tag], ["Kickoff: Ohio State at Iowa", "On CBS", APP_URL + "#game", GAME + "-kickoff"], "kickoff, once, in the team's own words, with the game's network from the schedule");
  await tick(db, e, KICK + 3 * 60e3); await tick(db, e, KICK + 40 * 60e3);
  ok(e.pushes.length === 1, "never twice, however many minutes pass");
  e.status = st("post", 4, "STATUS_FINAL", true); e.scores = { 194: 31, 2294: 17 };
  await tick(db, e, KICK + 3.4 * 3600e3);
  const f = e.pushes.length === 2 ? await openPush(e.pushes[1].init.body, b.kp, b.sub.keys.auth) : {};
  eq(say(f), "Final: Ohio State 31, Iowa 17 | Ohio State wins.", "the final, with ESPN's score for each side");
  e.calls.length = 0; await tick(db, e, KICK + 3.5 * 3600e3);
  ok(e.pushes.length === 2 && e.calls.length === 0, "after the final: nothing more is sent or asked"); }

console.log("game alerts: what a real game day throws at it");
{ const db = dbOf(), e = alertEnv({ status: st("in", 3, "STATUS_IN_PROGRESS") }), b = await browserSub();
  await subscribe(db, e, { subscription: b.sub, team: { id: "194", name: "Ohio State" } }, KICK); e.pushes.length = 0;
  const log = await tick(db, e, KICK + 90 * 60e3);
  ok(e.pushes.length === 0 && /late, not sent/.test(log.join(" ")), "switched on in the 3rd quarter: no kickoff push (late is noise)");
  e.status = st("post", 4, "STATUS_FINAL", true); e.scores = {};
  await tick(db, e, KICK + 3.4 * 3600e3);
  const f = e.pushes.length === 1 ? await openPush(e.pushes[0].init.body, b.kp, b.sub.keys.auth) : {};
  eq(say(f), "Final: Ohio State at Iowa | ", "a final ESPN gives no score for: no numbers, never 0-0"); }
{ const db = dbOf(), e = alertEnv({ status: st("pre", 0, "STATUS_POSTPONED") }), b = await browserSub();
  await subscribe(db, e, { subscription: b.sub, team: { id: "194", name: "Ohio State" } }, KICK); e.pushes.length = 0;
  await tick(db, e, KICK - 5 * 60e3); await tick(db, e, KICK);
  const p = e.pushes.length === 1 ? await openPush(e.pushes[0].init.body, b.kp, b.sub.keys.auth) : {};
  eq([e.pushes.length, say(p)], [1, "Postponed | Ohio State at Iowa has been postponed."], "postponed: one push saying so, and no kickoff"); }
{ const db = dbOf(), e = alertEnv({ status: st("in", 1, "STATUS_IN_PROGRESS") }), a = await browserSub(), c = await browserSub("fcm.googleapis.com");
  await subscribe(db, e, { subscription: a.sub, team: { id: "194", name: "Ohio State" } }, KICK);
  await subscribe(db, e, { subscription: c.sub, team: { id: "194", name: "Ohio State" } }, KICK); e.pushes.length = 0;
  e.push = (url) => url === a.sub.endpoint ? 410 : 201;
  const log = await tick(db, e, KICK + 60e3);
  ok(/kickoff sent to 1, 1 gone/.test(log.join(" ")) && db.all("SELECT COUNT(*) AS n FROM subs")[0].n === 1, "a browser that unsubscribed on its own is removed on the next send");
  e.status = null; e.down = true; e.push = 201; e.pushes.length = 0;
  ok(/status unavailable/.test((await tick(db, e, KICK + 2 * 60e3)).join(" ")) && e.pushes.length === 0, "ESPN down: nothing guessed; the next minute tries again"); }
{ // ESPN's core API not answering this network: the same status and score
  // from the team's schedule on the site API (the one Phase 0 proved).
  const db = dbOf(), b = await browserSub(), sched = JSON.parse(JSON.stringify(OSU_SCHEDULE));
  const ev = sched.events.filter((x) => x.id === GAME)[0], comp = ev.competitions[0];
  comp.status = { period: 4, type: { state: "post", name: "STATUS_FINAL", completed: true } };
  comp.competitors.forEach((c) => { c.score = { value: c.team.id === "194" ? 38 : 10, displayValue: "x" }; });
  const e = alertEnv({});
  e.FETCH = async (url, init) => {
    if (/\/teams\/194\/schedule$/.test(url)) return new Response(JSON.stringify(sched), { status: 200 });
    if (/sports\.core\.api\.espn\.com/.test(url)) return new Response("", { status: 403 });
    e.pushes.push({ url, init }); return new Response("", { status: 201 });
  };
  await subscribe(db, e, { subscription: b.sub, team: { id: "194", name: "Ohio State" } }, KICK); e.pushes.length = 0;
  db.run("INSERT INTO sent (team_id, game_id, event, at) VALUES (?, ?, ?, ?)", "194", GAME, "kickoff", KICK);
  const log = await tick(db, e, KICK + 3.4 * 3600e3);
  const f = e.pushes.length === 1 ? await openPush(e.pushes[0].init.body, b.kp, b.sub.keys.auth) : {};
  ok(/status from the schedule/.test(log.join(" ")) && f.title === "Final: Ohio State 38, Iowa 10", "core API refused: the schedule's status and score stand in = " + f.title);
  const r = report(db);
  ok(r.subscriptions[0].n === 1 && r.games[0].game.id === GAME && r.sent.some((x) => x.event === "final") && r.last && r.last.log.length,
     "the status report: counts, the watched game, what was sent, the last minute");
  ok(!JSON.stringify(r).includes(b.sub.endpoint) && !JSON.stringify(r).includes(b.sub.keys.auth), "and nothing about the fan: no push address, no key"); }
{ const db = dbOf();
  db.run("INSERT INTO sent (team_id, game_id, event, at) VALUES (?, ?, ?, ?)", "194", GAME, "kickoff", 1);
  ok(db.run("INSERT OR IGNORE INTO sent (team_id, game_id, event, at) VALUES (?, ?, ?, ?)", "194", GAME, "kickoff", 2).changes === 0,
     "an event already recorded cannot be recorded again: overlapping minutes send once"); }

console.log("game alerts: Codex's review of PR #102");
{ // A push service that fails for a moment: that follower is retried the
  // next minute; the one it already reached is not sent it again.
  const db = dbOf(), e = alertEnv({ status: st("in", 1, "STATUS_IN_PROGRESS") }), a = await browserSub(), c = await browserSub("fcm.googleapis.com");
  await subscribe(db, e, { subscription: a.sub, team: { id: "194", name: "Ohio State" } }, KICK);
  await subscribe(db, e, { subscription: c.sub, team: { id: "194", name: "Ohio State" } }, KICK); e.pushes.length = 0;
  e.push = (url) => url === a.sub.endpoint ? 503 : 201;
  let log = await tick(db, e, KICK + 60e3);
  ok(/kickoff sent to 1, 1 to retry/.test(log.join(" ")), "Apple's service answers 503: Chrome's copy is sent, Apple's waits");
  e.push = 201; e.pushes.length = 0;
  log = await tick(db, e, KICK + 2 * 60e3);
  ok(e.pushes.length === 1 && e.pushes[0].url === a.sub.endpoint, "the next minute: only the one that failed is sent, once");
  e.pushes.length = 0; await tick(db, e, KICK + 3 * 60e3);
  ok(e.pushes.length === 0, "and then nothing more");
  e.push = 0; e.status = st("post", 4, "STATUS_FINAL", true); e.scores = { 194: 31, 2294: 17 };
  for (let m = 0; m < 12; m++) await tick(db, e, KICK + 3.4 * 3600e3 + m * 60e3);
  const fin = db.all("SELECT state, tries FROM deliveries WHERE event = 'final'");
  ok(fin.length === 2 && fin.every((r) => r.state === "failed" && r.tries === 10), "a push service down for good: tried ten minutes, then given up, not forever"); }
{ // A kickoff that could not be delivered while it was news is let go.
  const db = dbOf(), e = alertEnv({ status: st("in", 1, "STATUS_IN_PROGRESS"), push: 503 }), a = await browserSub();
  await subscribe(db, e, { subscription: a.sub, team: { id: "194", name: "Ohio State" } }, KICK); e.push = 503; e.pushes.length = 0;
  await tick(db, e, KICK + 60e3); e.push = 201; e.pushes.length = 0;
  const log = await tick(db, e, KICK + 20 * 60e3);
  ok(e.pushes.length === 0 && /kickoff sent to 0, 1 dropped/.test(log.join(" ")), "a kickoff still undelivered 15 minutes on is dropped, not sent late"); }
{ // Both teams in one game followed: each team's followers get their own.
  const db = dbOf(), e = alertEnv({ status: st("in", 1, "STATUS_IN_PROGRESS") }), osu = await browserSub(), iowa = await browserSub("fcm.googleapis.com");
  const iowaSched = JSON.parse(JSON.stringify(OSU_SCHEDULE));
  const base = e.FETCH;
  e.FETCH = async (url, init) => /\/teams\/2294\/schedule$/.test(url) ? new Response(JSON.stringify(iowaSched), { status: 200 }) : base(url, init);
  await subscribe(db, e, { subscription: osu.sub, team: { id: "194", name: "Ohio State" } }, KICK);
  await subscribe(db, e, { subscription: iowa.sub, team: { id: "2294", name: "Iowa" } }, KICK); e.pushes.length = 0;
  await tick(db, e, KICK + 60e3);
  const got = {};
  for (const p of e.pushes) got[p.url === osu.sub.endpoint ? "osu" : "iowa"] = say(await openPush(p.init.body, p.url === osu.sub.endpoint ? osu.kp : iowa.kp,
                                                       p.url === osu.sub.endpoint ? osu.sub.keys.auth : iowa.sub.keys.auth));
  eq([got.osu, got.iowa], ["Kickoff: Ohio State at Iowa | On CBS", "Kickoff: Iowa vs. Ohio State | On CBS"], "Ohio State at Iowa, both followed: each side hears it in its own words"); }
{ // A sign-up cannot put its own words in other followers' alerts.
  const db = dbOf(), e = alertEnv({ status: st("in", 1, "STATUS_IN_PROGRESS") }), fan = await browserSub(), prank = await browserSub("fcm.googleapis.com");
  await subscribe(db, e, { subscription: fan.sub, team: { id: "194", name: "Ohio State" } }, KICK);
  await subscribe(db, e, { subscription: prank.sub, team: { id: "194", name: "AA" } }, KICK); e.pushes.length = 0;
  await tick(db, e, KICK + 60e3);
  const mine = e.pushes.filter((p) => p.url === fan.sub.endpoint)[0];
  const m = mine ? await openPush(mine.init.body, fan.kp, fan.sub.keys.auth) : {};
  eq([m.title, m.body], ["Kickoff: Ohio State at Iowa", "On CBS"], "another sign-up's team name never reaches this fan's alert"); }

console.log("game alerts, round 2: each fan's choice (notifications brief §2b)");
{ eq(validOptions(null), DEFAULTS, "a subscription from before round 2: kickoff, final and delays");
  eq(validOptions({ scoring: "all", quarters: true }).scoring, "all", "a choice is kept");
  ok(validOptions({ scoring: "loud" }) === null && validOptions("x") === null, "an unknown choice: refused");
  const db = dbOf(), e = alertEnv({}), b = await browserSub();
  await subscribe(db, e, { subscription: b.sub, team: { id: "194", name: "Ohio State" } }, KICK); e.pushes.length = 0;
  const up = await subscribe(db, e, { subscription: b.sub, team: { id: "194", name: "Ohio State" }, options: { scoring: "all" } }, KICK);
  ok(up.status === 200 && up.body.confirmation === "updated" && e.pushes.length === 0, "changing a choice saves it and sends nothing");
  const off = await subscribe(db, e, { subscription: b.sub, team: { id: "194", name: "Ohio State" },
    options: { kickoff: false, final: false, delays: false, scoring: "off", quarters: false, halftime: false, close: false } }, KICK);
  ok(off.body.off && db.all("SELECT COUNT(*) AS n FROM subs")[0].n === 0, "every switch off: alerts off, the subscription is not kept");
  ok((await subscribe(db, e, { subscription: b.sub, team: { id: "194", name: "Ohio State" }, options: { scoring: 3 } }, KICK)).status === 400, "bad options: 400"); }

console.log("game alerts, round 2: a whole game, minute by minute, four fans");
{ // The scoring is Notre Dame's real game against Michigan State (the
  // summary fixture), played here as Ohio State at Iowa, with an overturned
  // touchdown, a quarter's end missed between two looks, a close finish and
  // overtime written in.
  const db = dbOf(), e = alertEnv({}), fans = {};
  const opts = {
    every: { kickoff: true, final: true, delays: true, scoring: "all", quarters: true, halftime: true, close: true },
    mine:  { kickoff: false, final: true, delays: true, scoring: "mine", quarters: false, halftime: false, close: false },
    half:  { kickoff: false, final: false, delays: false, scoring: "off", quarters: false, halftime: true, close: false },
    old:   null };
  for (const k of Object.keys(opts)) {
    fans[k] = await browserSub();
    await subscribe(db, e, Object.assign({ subscription: fans[k].sub, team: { id: "194", name: "Ohio State" } }, opts[k] ? { options: opts[k] } : {}), KICK - 3600e3);
  }
  db.run("UPDATE subs SET opts = NULL WHERE endpoint = ?", fans.old.sub.endpoint);    // a row the round-1 Worker wrote
  e.pushes.length = 0;
  const heard = { every: [], mine: [], half: [], old: [] };
  // The Worker looks every minute: the minutes between two moments of the
  // game are looked at too, with nothing changed.
  let lastMin = null;
  async function at(min, period, name, clock, us, them) {
    if (lastMin != null) for (let m = lastMin + 1; m < min; m++) { e.pushes.length = 0; await tick(db, e, KICK + m * 60e3); await hear(); }
    lastMin = min;
    e.status = { period, clock: clock == null ? null : clock, displayClock: clock == null ? "0:00" : Math.floor(clock / 60) + ":" + String(clock % 60).padStart(2, "0"),
                 type: { state: /FINAL/.test(name) ? "post" : "in", name, completed: /FINAL/.test(name) } };
    e.scores = { 194: us, 2294: them };
    e.pushes.length = 0;
    const log = await tick(db, e, KICK + min * 60e3);
    await hear();
    return log;
  }
  async function hear() {
    for (const p of e.pushes) {
      const who = Object.keys(fans).filter((k) => fans[k].sub.endpoint === p.url)[0];
      const m = await openPush(p.init.body, fans[who].kp, fans[who].sub.keys.auth);
      heard[who].push(say(m) + (m.renotify ? " [card " + m.tag.replace(/^\d+-/, "") + "]" : ""));
    }
  }
  const P = "STATUS_IN_PROGRESS";
  await at(1, 1, P, 900, 0, 0);                 // kickoff
  await at(4, 1, P, 726, 3, 0);                 // field goal (12:06) ...
  await at(5, 1, P, 700, 3, 0);                 // ... held a minute: announced
  await at(14, 1, P, 271, 9, 0);                // touchdown (4:31) ...
  await at(15, 1, P, 260, 10, 0);               // ... and its extra point the next minute: the touchdown held
  await at(16, 1, P, 250, 10, 0);               // the touchdown (9-0) was told at 15, the kick now
  await at(24, 1, "STATUS_END_PERIOD", 0, 10, 0);
  await at(30, 2, P, 605, 10, 3);               // Iowa field goal (10:05)
  await at(31, 2, P, 600, 10, 3);
  await at(40, 2, P, 286, 16, 3);               // touchdown (4:46) announced at 16 ...
  await at(41, 2, P, 280, 16, 3);
  await at(43, 2, P, 270, 17, 3);               // ... its extra point two minutes on: its own alert
  await at(44, 2, P, 265, 17, 3);
  await at(46, 2, P, 201, 17, 9);               // Iowa touchdown (3:21) ...
  await at(47, 2, P, 190, 17, 9);               // ... announced at 17-9 ...
  await at(49, 2, P, 150, 17, 3);               // ... and overturned: one correction
  await at(55, 2, "STATUS_HALFTIME", 0, 17, 3);
  await at(56, 2, "STATUS_HALFTIME", 0, 17, 3);
  await at(80, 3, P, 60, 20, 3);                // field goal (1:00) ...
  await at(81, 3, P, 55, 20, 3);
  await at(84, 4, P, 880, 20, 3);               // the end of the 3rd was never seen: sent with the 3rd's score
  await at(95, 4, P, 280, 20, 13);              // late Iowa touchdown + field goal at once
  await at(96, 4, P, 275, 20, 13);              // one-score game, under 5:00: close finish, once
  await at(97, 4, P, 200, 20, 13);
  await at(105, 4, P, 30, 20, 20);              // Iowa ties it late ...
  await at(106, 4, P, 20, 20, 20);
  await at(110, 5, P, null, 20, 20);            // ... overtime
  await at(111, 5, P, null, 20, 20);
  await at(130, 5, "STATUS_FINAL", 0, 27, 20);
  eq(heard.every, [
    "Kickoff: Ohio State at Iowa | On CBS",
    "Ohio State FG (11:40 1st) | Ohio State 3, Iowa 0 [card live]",
    "Ohio State TD (4:20 1st) | PAT pending.\nOhio State 9, Iowa 0 [card live]",
    "Ohio State XP good (4:10 1st) | Ohio State 10, Iowa 0 [card live]",
    "End of 1st | Ohio State 10, Iowa 0 [card live]",
    "Iowa FG (10:00 2nd) | Ohio State 10, Iowa 3 [card live]",
    "Ohio State TD (4:40 2nd) | PAT pending.\nOhio State 16, Iowa 3 [card live]",
    "Ohio State XP good (4:25 2nd) | Ohio State 17, Iowa 3 [card live]",
    "Iowa TD (3:10 2nd) | PAT pending.\nOhio State 17, Iowa 9 [card live]",
    "Score corrected (2:30 2nd) | Ohio State 17, Iowa 3 [card live]",
    "Halftime | Ohio State 17, Iowa 3 [card live]",
    "Ohio State FG (0:55 3rd) | Ohio State 20, Iowa 3 [card live]",
    "End of 3rd | Ohio State 20, Iowa 3 [card live]",
    "Iowa scores (4:35 4th) | Ohio State 20, Iowa 13 [card live]",
    "One-score game (4:35 4th) | Ohio State 20, Iowa 13",
    "Iowa TD (0:20 4th) | XP good.\nOhio State 20, Iowa 20 [card live]",
    "Overtime | Ohio State 20, Iowa 20",
    "Ohio State TD (OT) | XP good.\nOhio State 27, Iowa 20 [card live]",
    "Final: Ohio State 27, Iowa 20 | Ohio State wins."
  ], "Everything: every score once, held a minute; a touchdown moved on by its kick is told then, and the kick is its own alert (David, Oct 10), even two minutes on; a touchdown and its kick first seen together are one alert that says the kick; the overturned score corrected; the quarters, halftime, a close finish only after the score that made it, overtime, the winning score first seen with the final, and the final. Without ESPN's summary, no play and the clock of the minute it was seen");
  eq(heard.mine, [
    "Ohio State FG (11:40 1st) | Ohio State 3, Iowa 0 [card live]",
    "Ohio State TD (4:20 1st) | PAT pending.\nOhio State 9, Iowa 0 [card live]",
    "Ohio State XP good (4:10 1st) | Ohio State 10, Iowa 0 [card live]",
    "Ohio State TD (4:40 2nd) | PAT pending.\nOhio State 16, Iowa 3 [card live]",
    "Ohio State XP good (4:25 2nd) | Ohio State 17, Iowa 3 [card live]",
    "Ohio State FG (0:55 3rd) | Ohio State 20, Iowa 3 [card live]",
    "Ohio State TD (OT) | XP good.\nOhio State 27, Iowa 20 [card live]",
    "Final: Ohio State 27, Iowa 20 | Ohio State wins."
  ], "My team's scores (and the final): only Ohio State's, and no correction of Iowa's");
  eq(heard.half, ["Halftime | Ohio State 17, Iowa 3 [card live]"], "Halftime only: one alert at the half, not two");
  eq(heard.old, ["Kickoff: Ohio State at Iowa | On CBS", "Final: Ohio State 27, Iowa 20 | Ohio State wins."], "a fan from before round 2: kickoff and final"); }

{ // Late is noise: a score its push service could not take for 5 minutes is dropped.
  const db = dbOf(), e = alertEnv({}), b = await browserSub();
  await subscribe(db, e, { subscription: b.sub, team: { id: "194", name: "Ohio State" }, options: { scoring: "all", kickoff: false } }, KICK);
  const s = (period, us, them) => { e.status = { period, clock: 600, displayClock: "10:00", type: { state: "in", name: "STATUS_IN_PROGRESS" } }; e.scores = { 194: us, 2294: them }; };
  s(1, 0, 0); await tick(db, e, KICK + 60e3);
  s(1, 7, 0); e.push = 503; await tick(db, e, KICK + 2 * 60e3); await tick(db, e, KICK + 3 * 60e3);
  e.pushes.length = 0; e.push = 201;
  const log = await tick(db, e, KICK + 9 * 60e3);
  ok(e.pushes.length === 0 && /dropped/.test(log.join(" ")), "a score still undelivered after 5 minutes is dropped, not sent late"); }

{ // Delays (on by default for a new sign-up).
  const db = dbOf(), e = alertEnv({}), b = await browserSub(), heard = [];
  await subscribe(db, e, { subscription: b.sub, team: { id: "194", name: "Ohio State" }, options: DEFAULTS }, KICK); e.pushes.length = 0;
  const go = async (min, state, period, name, us, them) => {
    e.status = { period, clock: 555, displayClock: "9:15", type: { state, name } }; e.scores = { 194: us, 2294: them }; e.pushes.length = 0;
    await tick(db, e, KICK + min * 60e3);
    for (const p of e.pushes) heard.push(say(await openPush(p.init.body, b.kp, b.sub.keys.auth)));
  };
  await go(-5, "pre", 0, "STATUS_DELAYED", 0, 0); await go(-4, "pre", 0, "STATUS_DELAYED", 0, 0);
  await go(1, "in", 1, "STATUS_IN_PROGRESS", 0, 0); await go(30, "in", 2, "STATUS_IN_PROGRESS", 7, 3); await go(31, "in", 2, "STATUS_DELAYED", 7, 3); await go(32, "in", 2, "STATUS_DELAYED", 7, 3);
  await go(50, "in", 2, "STATUS_IN_PROGRESS", 7, 3); await go(55, "in", 2, "STATUS_DELAYED", 7, 3); await go(56, "in", 2, "STATUS_DELAYED", 7, 3);
  eq(heard, ["Delayed | Ohio State at Iowa is delayed.", "Kickoff: Ohio State at Iowa | On CBS", "Delay (9:15 2nd) | Ohio State 7, Iowa 3", "Delay (9:15 2nd) | Ohio State 7, Iowa 3"],
     "a new sign-up (delays on by default): a delay before kickoff (no kickoff alert until it starts), and each time play stops, even twice in one quarter (Codex, #116)"); }
{ // A row from before round 2: what it had, and no new kind (Codex, #116).
  const db = dbOf(), e = alertEnv({}), b = await browserSub();
  await subscribe(db, e, { subscription: b.sub, team: { id: "194", name: "Ohio State" } }, KICK);
  db.run("UPDATE subs SET opts = NULL"); e.pushes.length = 0;
  e.status = { period: 2, clock: 555, displayClock: "9:15", type: { state: "in", name: "STATUS_DELAYED" } }; e.scores = { 194: 7, 2294: 3 };
  await tick(db, e, KICK + 30 * 60e3);
  e.status = { period: 2, clock: 555, displayClock: "9:15", type: { state: "post", name: "STATUS_POSTPONED" } };
  await tick(db, e, KICK + 40 * 60e3);
  const got = []; for (const p of e.pushes) got.push(say(await openPush(p.init.body, b.kp, b.sub.keys.auth)));
  eq(got, ["Postponed | Ohio State at Iowa has been postponed."], "a round-1 fan: no in-game delay alert (a new kind starts off), still told of a postponement"); }
{ // Both sides scored between two looks: a my-team fan still hears it (Codex, #116).
  const db = dbOf(), e = alertEnv({}), b = await browserSub();
  await subscribe(db, e, { subscription: b.sub, team: { id: "194", name: "Ohio State" }, options: { scoring: "mine", kickoff: false } }, KICK); e.pushes.length = 0;
  const s = (us, them) => { e.status = { period: 2, clock: 600, displayClock: "10:00", type: { state: "in", name: "STATUS_IN_PROGRESS" } }; e.scores = { 194: us, 2294: them }; };
  s(7, 7); await tick(db, e, KICK + 30 * 60e3);
  s(14, 10); await tick(db, e, KICK + 31 * 60e3); await tick(db, e, KICK + 32 * 60e3);
  const got = []; for (const p of e.pushes) got.push(say(await openPush(p.init.body, b.kp, b.sub.keys.auth)));
  eq(got, ["Score update (10:00 2nd) | Ohio State 14, Iowa 10"], "both scored at once: My team's scores still gets it"); }

{ // A correction goes only to the devices that got the score (Codex, #116).
  const db = dbOf(), e = alertEnv({}), got = await browserSub(), late = await browserSub(), stuck = await browserSub("fcm.googleapis.com");
  for (const [b, o] of [[got, { scoring: "all", kickoff: false }], [late, { scoring: "off" }], [stuck, { scoring: "all", kickoff: false }]])
    await subscribe(db, e, { subscription: b.sub, team: { id: "194", name: "Ohio State" }, options: o }, KICK);
  const s = (us, them) => { e.status = { period: 2, clock: 600, displayClock: "10:00", type: { state: "in", name: "STATUS_IN_PROGRESS" } }; e.scores = { 194: us, 2294: them }; };
  e.push = (url) => url === stuck.sub.endpoint ? 503 : 201;
  s(7, 0); await tick(db, e, KICK + 30 * 60e3);
  s(7, 7); await tick(db, e, KICK + 31 * 60e3); await tick(db, e, KICK + 32 * 60e3);     // Iowa TD announced; one device's push service is down
  await subscribe(db, e, { subscription: late.sub, team: { id: "194", name: "Ohio State" }, options: { scoring: "all" } }, KICK);   // scores turned on after it
  e.pushes.length = 0; e.push = 201;
  s(7, 0); await tick(db, e, KICK + 33 * 60e3);                                          // overturned
  const to = e.pushes.map((p) => p.url === got.sub.endpoint ? "got" : p.url === late.sub.endpoint ? "late" : "stuck");
  eq(to, ["got"], "the correction reaches only the device that had the touchdown; the one whose touchdown never arrived gets neither, and one that turned scores on since gets nothing to correct");
  eq(validOptions({ outcomes: true, delays: false }).outcomes, true, "a round-1 device's postponement alerts survive its first change (outcomes)"); }

{ // A retried score holds back that device's later alerts, so they arrive in order (Codex, #116).
  const db = dbOf(), e = alertEnv({}), b = await browserSub(), seen = [];
  await subscribe(db, e, { subscription: b.sub, team: { id: "194", name: "Ohio State" }, options: { scoring: "all", quarters: true, kickoff: false } }, KICK);
  const s = (name, us, them) => { e.status = { period: 1, clock: name === "STATUS_END_PERIOD" ? 0 : 30, displayClock: "0:30", type: { state: "in", name } }; e.scores = { 194: us, 2294: them }; };
  s("STATUS_IN_PROGRESS", 0, 0); await tick(db, e, KICK + 19 * 60e3);
  s("STATUS_IN_PROGRESS", 3, 0); await tick(db, e, KICK + 20 * 60e3);
  e.push = 429; e.pushes.length = 0;
  s("STATUS_END_PERIOD", 3, 0); await tick(db, e, KICK + 21 * 60e3);           // the field goal (flushed) fails; the quarter waits behind it
  const firstTry = e.pushes.length;
  e.push = 201; e.pushes.length = 0; await tick(db, e, KICK + 22 * 60e3);
  for (const p of e.pushes) seen.push(say(await openPush(p.init.body, b.kp, b.sub.keys.auth)));
  eq([firstTry, seen], [1, ["Ohio State FG (0:30 1st) | Ohio State 3, Iowa 0", "End of 1st | Ohio State 3, Iowa 0"]],
     "the field goal's push fails: the quarter is held, not sent ahead of it; the next minute both go, in order"); }
{ // A correction follows the score it takes back, side by side (Codex, #116).
  const db = dbOf(), e = alertEnv({}), mine = await browserSub();
  await subscribe(db, e, { subscription: mine.sub, team: { id: "194", name: "Ohio State" }, options: { scoring: "mine", kickoff: false } }, KICK);
  const s = (us, them) => { e.status = { period: 2, clock: 600, displayClock: "10:00", type: { state: "in", name: "STATUS_IN_PROGRESS" } }; e.scores = { 194: us, 2294: them }; };
  s(0, 0); await tick(db, e, KICK + 30 * 60e3);
  s(7, 0); await tick(db, e, KICK + 31 * 60e3); await tick(db, e, KICK + 32 * 60e3);   // our touchdown: this fan gets it
  s(7, 3); await tick(db, e, KICK + 33 * 60e3); await tick(db, e, KICK + 34 * 60e3);   // their field goal: not this fan's
  e.pushes.length = 0;
  s(0, 3); await tick(db, e, KICK + 35 * 60e3);                                          // our touchdown overturned
  const got = []; for (const p of e.pushes) got.push(say(await openPush(p.init.body, mine.kp, mine.sub.keys.auth)));
  eq(got, ["Score corrected (10:00 2nd) | Ohio State 0, Iowa 3"], "our earlier touchdown overturned after their field goal: the fan who got the touchdown gets the correction"); }

{ // A page from before round 2 sends no options: it keeps round 1, and never overwrites a saved choice (Codex, #116).
  const db = dbOf(), e = alertEnv({}), b = await browserSub();
  await subscribe(db, e, { subscription: b.sub, team: { id: "194", name: "Ohio State" } }, KICK);
  ok(db.all("SELECT opts FROM subs")[0].opts === null, "an old page's sign-up: stored as round 1 (no in-game delays)");
  await subscribe(db, e, { subscription: b.sub, team: { id: "194", name: "Ohio State" }, options: { scoring: "all" } }, KICK);
  await subscribe(db, e, { subscription: b.sub, team: { id: "194", name: "Ohio State" } }, KICK);
  ok(JSON.parse(db.all("SELECT opts FROM subs")[0].opts).scoring === "all", "and an old page signing up again keeps the choice already saved"); }
{ // ESPN out of reach for 10 minutes: what changed meanwhile is caught up silently (Codex, #116).
  const db = dbOf(), e = alertEnv({}), b = await browserSub();
  await subscribe(db, e, { subscription: b.sub, team: { id: "194", name: "Ohio State" }, options: { scoring: "all", quarters: true, kickoff: false } }, KICK);
  const s = (period, us, them) => { e.status = { period, clock: 600, displayClock: "10:00", type: { state: "in", name: "STATUS_IN_PROGRESS" } }; e.scores = { 194: us, 2294: them }; };
  s(1, 0, 0); await tick(db, e, KICK + 10 * 60e3);
  e.pushes.length = 0;
  s(2, 14, 3); await tick(db, e, KICK + 21 * 60e3); await tick(db, e, KICK + 22 * 60e3);   // back after 11 minutes, a quarter and 17 points on
  const quiet = e.pushes.length;
  s(2, 21, 3); await tick(db, e, KICK + 23 * 60e3); await tick(db, e, KICK + 24 * 60e3);
  eq([quiet, e.pushes.length], [0, 1], "no stale score or quarter after the gap; the next real score is announced"); }

{ // Two scores taken back at once: everyone who got either is told (Codex, #116).
  const db = dbOf(), e = alertEnv({}), early = await browserSub(), late = await browserSub("fcm.googleapis.com");
  await subscribe(db, e, { subscription: early.sub, team: { id: "194", name: "Ohio State" }, options: { scoring: "all", kickoff: false } }, KICK);
  const s = (us, them) => { e.status = { period: 2, clock: 600, displayClock: "10:00", type: { state: "in", name: "STATUS_IN_PROGRESS" } }; e.scores = { 194: us, 2294: them }; };
  s(0, 0); await tick(db, e, KICK + 30 * 60e3);
  s(7, 0); await tick(db, e, KICK + 31 * 60e3); await tick(db, e, KICK + 32 * 60e3);     // the first touchdown: only "early" is signed up
  await subscribe(db, e, { subscription: late.sub, team: { id: "194", name: "Ohio State" }, options: { scoring: "all", kickoff: false } }, KICK);
  await subscribe(db, e, { subscription: early.sub, team: { id: "194", name: "Ohio State" }, options: { scoring: "off", final: true } }, KICK);   // "early" turns scores off
  s(14, 0); await tick(db, e, KICK + 33 * 60e3); await tick(db, e, KICK + 34 * 60e3);   // the second: only "late"
  e.pushes.length = 0;
  s(0, 0); await tick(db, e, KICK + 35 * 60e3);                                          // both taken back
  eq(e.pushes.map((p) => p.url === early.sub.endpoint ? "early" : "late").sort(), ["early", "late"], "14 to 0: the device that got only the first touchdown is told too"); }
{ // A catch-up after an outage starts a new history: nothing from before it is "corrected" (Codex, #116).
  const db = dbOf(), e = alertEnv({}), b = await browserSub();
  await subscribe(db, e, { subscription: b.sub, team: { id: "194", name: "Ohio State" }, options: { scoring: "all", kickoff: false } }, KICK);
  const s = (us, them) => { e.status = { period: 2, clock: 600, displayClock: "10:00", type: { state: "in", name: "STATUS_IN_PROGRESS" } }; e.scores = { 194: us, 2294: them }; };
  s(0, 0); await tick(db, e, KICK + 30 * 60e3);
  s(7, 0); await tick(db, e, KICK + 31 * 60e3); await tick(db, e, KICK + 32 * 60e3);     // told 7
  s(14, 0); await tick(db, e, KICK + 45 * 60e3);                                         // outage; caught up silently at 14
  e.pushes.length = 0;
  s(7, 0); await tick(db, e, KICK + 46 * 60e3);                                          // 14 taken back to 7
  eq(e.pushes.length, 0, "a fan told 7, never told 14: no correction back to 7"); }

{ // Their touchdown off the board while we kick a field goal, in one minute (Codex, #116).
  const db = dbOf(), e = alertEnv({}), mine = await browserSub(), heard = [];
  await subscribe(db, e, { subscription: mine.sub, team: { id: "194", name: "Ohio State" }, options: { scoring: "mine", kickoff: false } }, KICK); e.pushes.length = 0;
  const s = (us, them) => { e.status = { period: 2, clock: 600, displayClock: "10:00", type: { state: "in", name: "STATUS_IN_PROGRESS" } }; e.scores = { 194: us, 2294: them }; };
  s(0, 0); await tick(db, e, KICK + 30 * 60e3);
  s(0, 7); await tick(db, e, KICK + 31 * 60e3); await tick(db, e, KICK + 32 * 60e3);
  s(3, 0); for (let m = 33; m <= 35; m++) await tick(db, e, KICK + m * 60e3);
  for (const p of e.pushes) heard.push(say(await openPush(p.init.body, mine.kp, mine.sub.keys.auth)));
  eq(heard, ["Ohio State FG (10:00 2nd) | Ohio State 3, Iowa 0"], "a my-team fan still hears the field goal"); }
{ // 14, then 10, then 7: the second correction reaches those told 14 too (Codex, #116).
  const db = dbOf(), e = alertEnv({}), b = await browserSub(), heard = [];
  await subscribe(db, e, { subscription: b.sub, team: { id: "194", name: "Ohio State" }, options: { scoring: "all", kickoff: false } }, KICK);
  const s = (us, them) => { e.status = { period: 2, clock: 600, displayClock: "10:00", type: { state: "in", name: "STATUS_IN_PROGRESS" } }; e.scores = { 194: us, 2294: them }; };
  s(0, 0); await tick(db, e, KICK + 30 * 60e3);
  s(14, 0); await tick(db, e, KICK + 31 * 60e3); await tick(db, e, KICK + 32 * 60e3);
  s(10, 0); await tick(db, e, KICK + 33 * 60e3);
  s(7, 0); await tick(db, e, KICK + 34 * 60e3);
  for (const p of e.pushes) heard.push(say(await openPush(p.init.body, b.kp, b.sub.keys.auth)));
  eq(heard.slice(2), ["Score corrected (10:00 2nd) | Ohio State 10, Iowa 0", "Score corrected (10:00 2nd) | Ohio State 7, Iowa 0"], "both corrections reach the fan"); }

{ // 14, then 10 (its push fails), then 7: the fan still hears the last word (Codex, #116).
  const db = dbOf(), e = alertEnv({}), b = await browserSub(), heard = [];
  await subscribe(db, e, { subscription: b.sub, team: { id: "194", name: "Ohio State" }, options: { scoring: "all", kickoff: false } }, KICK); e.pushes.length = 0;
  const s = (us, them) => { e.status = { period: 2, clock: 600, displayClock: "10:00", type: { state: "in", name: "STATUS_IN_PROGRESS" } }; e.scores = { 194: us, 2294: them }; };
  s(0, 0); await tick(db, e, KICK + 30 * 60e3);
  s(14, 0); await tick(db, e, KICK + 31 * 60e3); await tick(db, e, KICK + 32 * 60e3);
  e.push = 503; s(10, 0); await tick(db, e, KICK + 33 * 60e3);
  e.push = 201; s(7, 0); await tick(db, e, KICK + 34 * 60e3);
  for (const p of e.pushes) { try { heard.push(say(await openPush(p.init.body, b.kp, b.sub.keys.auth))); } catch (x) {} }
  ok(heard[heard.length - 1] === "Score corrected (10:00 2nd) | Ohio State 7, Iowa 0", "the correction that could not go is replaced by the next, to the same fan (" + heard.slice(1).join(" | ") + ")"); }

{ // First look mid-game (the Worker deployed at halftime): no backlog.
  const db = dbOf(), e = alertEnv({}), b = await browserSub();
  await subscribe(db, e, { subscription: b.sub, team: { id: "194", name: "Ohio State" }, options: { scoring: "all", kickoff: false } }, KICK); e.pushes.length = 0;
  e.status = { period: 3, clock: 600, displayClock: "10:00", type: { state: "in", name: "STATUS_IN_PROGRESS" } }; e.scores = { 194: 24, 2294: 10 };
  await tick(db, e, KICK + 100 * 60e3); await tick(db, e, KICK + 101 * 60e3);
  ok(e.pushes.length === 0, "a game first seen at 24-10: nothing for the scores before, only what happens next"); }

{ // Two overlapping minutes: only one moves the score.
  const db = dbOf(), g = { id: "1" }, stt = { period: 1 };
  scoreStep(db, "194", g, stt, { us: 0, them: 0 }, KICK);
  scoreStep(db, "194", g, stt, { us: 7, them: 0 }, KICK + 60e3);
  const stale = db.all("SELECT seq, st FROM live")[0];
  const first = scoreStep(db, "194", g, stt, { us: 7, them: 0 }, KICK + 120e3);
  const racing = scoreStep({ all: () => [stale], run: db.run }, "194", g, stt, { us: 7, them: 0 }, KICK + 120e3);
  ok(first.length === 1 && racing.length === 0, "the minute that loses the race announces nothing (compare-and-set on the score's sequence)"); }

console.log("game alerts: theScore's shape (David, Oct 10), on Stanford at Notre Dame's real scoring plays");
{ const ND = JSON.parse(readFileSync(new URL("./fixtures/espn-summary-nd-stanford-2026-10-10.json", import.meta.url), "utf8"));
  const real = ND.scoringPlays.map((p) => p.text);
  eq(real.map(playText), [
    "N. James Jr. run for 2 yds, for a TD.", "CJ Carr pass to J. Greathouse for 3 yds, for a TD.", "J. Walton run for 97 yds, for a TD.",
    "S. Porath 33 yd FG GOOD.", "N. James Jr. run for 31 yds, for a TD.", "CJ Carr pass to A. Williams for 70 yds, for a TD."
  ], "the play: ESPN's line without its try, ending in a full stop");
  eq(real.map(tryOf), ["xp", "xp", "xpmiss", null, "xp", "xp"], "the try, from its closing parentheses: KICK is good, PAT MISSED is missed, a field goal has none");
  // the other dialect ESPN wrote on Saturday, and the two-point tries
  eq(["LaNorris Sellers 1 Yd Run (Malik Orsan Kick)", "Jadan Baugh 2 Yd Run (Two-Point Pass Conversion Failed)",
      "A. Back run for 3 yds, for a TD (C. Carr pass to D. Moore for Two-Point Conversion)", "A. Back run for 3 yds, for a TD (S. Porath KICK BLOCKED)",
      "A. Back run for 3 yds, for a TD", "A. Back run for 3 yds, for a TD (penalty)"].map(tryOf),
     ["xp", "2ptfail", "2pt", "xpmiss", null, null], "the other dialect, two-point tries, a block; no parentheses or unknown words: nothing (no alert rather than a wrong one)");
  ok(playText("Patrick Durkin 21 Yd Field Goal  ") === "Patrick Durkin 21 Yd Field Goal." && playText("<script>x</script> 9 yd run") === "script x /script 9 yd run." &&
     playText("(KICK)") === null && playText("A".repeat(300)).length <= 121, "plain text only, trimmed, cut short; nothing readable is nothing");
  eq(network(ND.header.competitions[0].broadcasts), "NBC", "the network, from ESPN's broadcasts");
  ok(network([{ media: { shortName: "<b>" } }]) === null && network(null) === null, "a network that is not a plain short name: none");
  const g = { id: "401858257", comp: "401858257", home: true, network: "NBC", opponent: { id: "24", name: "Stanford" } };
  const plays = scoringPlays(ND, "87", g);
  eq(plays.map((p) => [p.side, p.us, p.them, p.type, p.period, p.clock]).slice(0, 4),
     [["us", 7, 0, "TD", 1, "13:06"], ["us", 14, 0, "TD", 1, "2:55"], ["us", 20, 0, "TD", 2, "14:48"], ["us", 23, 0, "FG", 2, "12:27"]],
     "each scoring play as ours and theirs (Notre Dame at home: home score is ours)");
  ok(scoringPlays(null, "87", g) === null && scoringPlays({}, "87", g) === null, "no summary: null, and the alert goes without its play");

  // A game minute by minute through scoreStep, ESPN's summary as it read at
  // each look: before the kick (6-0, no try yet), and as it finally read.
  const team = { id: "87", name: "Notre Dame" }, T0 = Date.parse("2026-10-10T19:37:00Z");
  const sum = (list) => scoringPlays({ scoringPlays: list }, "87", g);
  const pl = (i, text, home) => Object.assign({}, ND.scoringPlays[i], text == null ? {} : { text }, home == null ? {} : { homeScore: home });
  const db = dbOf(), heard = [];
  // The Worker looks every minute: the minutes between two looks here see
  // the game as the last one left it.
  let prev = null;
  function look(m, period, clock, us, them, list) {
    if (prev) for (let k = prev[0] + 1; k < m; k++) step(k, ...prev.slice(1));
    step(m, period, clock, us, them, list); prev = [m, period, clock, us, them, list];
  }
  function step(m, period, clock, us, them, list) {
    const out = scoreStep(db, "87", g, { period, displayClock: clock }, { us, them }, T0 + m * 60e3, false, list === undefined ? null : sum(list));
    for (const e of out) { const w = words(e.event, team, g, e.scores, Object.assign({ period, clock }, e.x)); heard.push(w.title + " | " + w.body); }
  }
  look(0, 1, "15:00", 0, 0);
  look(5, 1, "13:00", 6, 0, [pl(0, "N. James Jr. run for 2 yds, for a TD", 6)]);           // the touchdown, kick still to come
  look(6, 1, "13:06", 7, 0, [pl(0)]);                                                       // the kick is in: the touchdown held
  look(7, 1, "12:50", 7, 0, [pl(0)]);                                                       // the kick held
  look(30, 1, "2:50", 14, 0, [pl(0), pl(1)]);                                               // touchdown and kick first seen together
  look(31, 1, "2:45", 14, 0, [pl(0), pl(1)]);
  look(40, 2, "14:40", 20, 0, [pl(0), pl(1), pl(2, "J. Walton run for 97 yds, for a TD")]);   // touchdown, try unknown
  look(41, 2, "14:40", 20, 0, [pl(0), pl(1), pl(2, "J. Walton run for 97 yds, for a TD")]);   // held: told, PAT pending
  look(42, 2, "14:48", 20, 0, [pl(0), pl(1), pl(2)]);                                       // ESPN: PAT MISSED, the score never moves
  look(43, 2, "14:30", 20, 0, [pl(0), pl(1), pl(2)]);                                       // said once
  look(50, 2, "12:20", 23, 0, [pl(0), pl(1), pl(2), pl(3)]);
  look(51, 2, "12:15", 23, 0, [pl(0), pl(1), pl(2), pl(3)]);
  eq(heard, [
    "Notre Dame TD (13:06 1st) | N. James Jr. run for 2 yds, for a TD. PAT pending.\nNotre Dame 6, Stanford 0",
    "Notre Dame XP good (13:06 1st) | Notre Dame 7, Stanford 0",
    "Notre Dame TD (2:55 1st) | CJ Carr pass to J. Greathouse for 3 yds, for a TD. XP good.\nNotre Dame 14, Stanford 0",
    "End of 1st | Notre Dame 14, Stanford 0",
    "Notre Dame TD (14:48 2nd) | J. Walton run for 97 yds, for a TD. PAT pending.\nNotre Dame 20, Stanford 0",
    "Notre Dame XP missed (14:48 2nd) | Notre Dame 20, Stanford 0",
    "Notre Dame FG (12:27 2nd) | S. Porath 33 yd FG GOOD.\nNotre Dame 23, Stanford 0"
  ], "theScore's shape on the real game: the touchdown and then its kick, each with the play's own clock; a touchdown seen with its kick says so; a missed kick is its own alert, from ESPN's words; a field goal with its line");

  // Already missed when the touchdown is first told: one alert says so, and
  // none follows. A two-point try good, from the score; one failed, from words.
  const db2 = dbOf(), h2 = [];
  let prev2 = null;
  const step2 = (m, us, list) => { for (const e of scoreStep(db2, "87", g, { period: 3, displayClock: "9:00" }, { us, them: 0 }, T0 + m * 60e3, false, list && sum(list)))
                                     { const w = words(e.event, team, g, e.scores, Object.assign({ period: 3, clock: "9:00" }, e.x)); h2.push(w.title + " | " + w.body); } };
  const look2 = (m, us, list) => { if (prev2) for (let k = prev2[0] + 1; k < m; k++) step2(k, prev2[1], prev2[2]); step2(m, us, list); prev2 = [m, us, list]; };
  look2(0, 0, null); look2(1, 6, [pl(2, null, 6)]); look2(2, 6, [pl(2, null, 6)]); look2(3, 6, [pl(2, null, 6)]);
  look2(10, 12, [pl(2, null, 6), pl(4, "N. James Jr. run for 31 yds, for a TD", 12)]); look2(11, 14, [pl(2, null, 6), pl(4, "N. James Jr. run for 31 yds, for a TD (C. Carr pass to D. Moore for Two-Point Conversion)", 14)]);
  look2(12, 14, [pl(2, null, 6), pl(4, "N. James Jr. run for 31 yds, for a TD (C. Carr pass to D. Moore for Two-Point Conversion)", 14)]);
  look2(20, 20, [pl(5, "CJ Carr pass to A. Williams for 70 yds, for a TD", 20)]); look2(21, 20, [pl(5, "CJ Carr pass to A. Williams for 70 yds, for a TD", 20)]);
  look2(22, 20, [pl(5, "CJ Carr pass to A. Williams for 70 yds, for a TD (Two-Point Pass Conversion Failed)", 20)]);
  look2(40, 26, null); look2(41, 26, null); look2(50, 26, null);
  eq(h2, [
    "Notre Dame TD (14:48 2nd) | J. Walton run for 97 yds, for a TD. XP missed.\nNotre Dame 6, Stanford 0",
    "Notre Dame TD (7:05 2nd) | N. James Jr. run for 31 yds, for a TD. PAT pending.\nNotre Dame 12, Stanford 0",
    "Notre Dame 2-pt good (7:05 2nd) | Notre Dame 14, Stanford 0",
    "Notre Dame TD (3:26 2nd) | CJ Carr pass to A. Williams for 70 yds, for a TD. PAT pending.\nNotre Dame 20, Stanford 0",
    "Notre Dame 2-pt failed (3:26 2nd) | Notre Dame 20, Stanford 0",
    "Notre Dame TD (9:00 3rd) | PAT pending.\nNotre Dame 26, Stanford 0"
  ], "a kick already missed: one alert; two-point good from the score, failed from ESPN's words; no summary: the alert without its play, and no try alert guessed from silence");

  { // Two points for Stanford while Notre Dame's try is out: not called a safety.
    const db3 = dbOf(), h3 = [];
    for (const [m, us, them] of [[0, 0, 0], [1, 6, 0], [2, 6, 0], [3, 6, 2], [4, 6, 2]])
      for (const e of scoreStep(db3, "87", g, { period: 2, displayClock: "5:00" }, { us, them }, T0 + m * 60e3, false, null)) h3.push(words(e.event, team, g, e.scores, e.x).title);
    eq(h3, ["Notre Dame TD", "Stanford scores"], "a defensive two-point return is not a safety"); }
  { // ... nor when ESPN shows the failed try in the same look as the return (Codex, #119).
    const dbr = dbOf(), hr = [], fail = [pl(2, "J. Walton run for 97 yds, for a TD (Two-Point Pass Conversion Failed)", 6)];
    for (const [m, us, them, list] of [[0, 0, 0, null], [1, 6, 0, [pl(2, "J. Walton run for 97 yds, for a TD", 6)]], [2, 6, 2, fail], [3, 6, 2, fail]])
      for (const e of scoreStep(dbr, "87", g, { period: 2, displayClock: "5:00" }, { us, them }, T0 + m * 60e3, false, sum(list || []))) hr.push(words(e.event, team, g, e.scores, e.x).title);
    eq(hr, ["Notre Dame TD (14:48 2nd)", "Notre Dame 2-pt failed (14:48 2nd)", "Stanford scores"], "a failed try and its return in one look: the miss, then Stanford's two, not a safety"); }

  { // The miss shows up only once Stanford has run the kickoff back: the miss is still told, first (Codex, #119).
    const db4 = dbOf(), h4 = [], miss = [pl(2, null, 6)];
    const kr = { team: { id: "24" }, homeScore: 6, awayScore: 7, period: { number: 2 }, clock: { displayValue: "14:35" }, scoringType: { abbreviation: "TD" },
                 text: "B. Returner 95 yd kickoff return for a TD (E. Kicker KICK)" };
    const seq = [[0, 0, 0, null], [1, 6, 0, [pl(2, "J. Walton run for 97 yds, for a TD", 6)]], [2, 6, 0, [pl(2, "J. Walton run for 97 yds, for a TD", 6)]],
                 [3, 6, 7, miss.concat([kr])], [4, 6, 7, miss.concat([kr])]];
    for (const [m, us, them, list] of seq)
      for (const e of scoreStep(db4, "87", g, { period: 2, displayClock: "14:30" }, { us, them }, T0 + m * 60e3, false, list && sum(list))) h4.push(words(e.event, team, g, e.scores, e.x).title);
    eq(h4, ["Notre Dame TD (14:48 2nd)", "Notre Dame XP missed (14:48 2nd)", "Stanford TD (14:35 2nd)"], "a miss ESPN shows only after the other side scored again: still told, before that score"); }

  { // ... or after Notre Dame itself scores again, a turnover and a field goal later (Codex, #119).
    const db5 = dbOf(), h5 = [], pend6 = [pl(2, "J. Walton run for 97 yds, for a TD", 6)];
    const fg = { team: { id: "87" }, homeScore: 9, awayScore: 0, period: { number: 2 }, clock: { displayValue: "13:10" }, scoringType: { abbreviation: "FG" }, text: "S. Porath 30 yd FG GOOD" };
    for (const [m, us, list] of [[0, 0, null], [1, 6, pend6], [2, 6, pend6], [3, 9, [pl(2, null, 6), fg]], [4, 9, [pl(2, null, 6), fg]]])
      for (const e of scoreStep(db5, "87", g, { period: 2, displayClock: "13:00" }, { us, them: 0 }, T0 + m * 60e3, false, list && sum(list))) h5.push(words(e.event, team, g, e.scores, e.x).title);
    eq(h5, ["Notre Dame TD (14:48 2nd)", "Notre Dame XP missed (14:48 2nd)", "Notre Dame FG (13:10 2nd)"], "a miss ESPN shows only after the same side scored again: still told, first"); }

  { // A later score settles before ESPN shows the miss: the wait for the try goes on (Codex, #119).
    const db6 = dbOf(), h6 = [], td = pl(2, "J. Walton run for 97 yds, for a TD", 6);
    const sfg = { team: { id: "24" }, homeScore: 6, awayScore: 3, period: { number: 2 }, clock: { displayValue: "13:40" }, scoringType: { abbreviation: "FG" }, text: "E. Kicker 50 yd FG GOOD" };
    for (const [m, us, them, list] of [[0, 0, 0, null], [1, 6, 0, [td]], [2, 6, 0, [td]], [3, 6, 3, [td, sfg]], [4, 6, 3, [td, sfg]], [5, 6, 3, [pl(2, null, 6), sfg]], [6, 6, 3, [pl(2, null, 6), sfg]]])
      for (const e of scoreStep(db6, "87", g, { period: 2, displayClock: "13:00" }, { us, them }, T0 + m * 60e3, false, list && sum(list))) h6.push(words(e.event, team, g, e.scores, e.x).title + " | " + words(e.event, team, g, e.scores, e.x).body.split("\n").pop());
    eq(h6, ["Notre Dame TD (14:48 2nd) | Notre Dame 6, Stanford 0", "Stanford FG (13:40 2nd) | Notre Dame 6, Stanford 3", "Notre Dame XP missed (14:48 2nd) | Notre Dame 6, Stanford 0"],
       "a miss ESPN shows only after a later score was told: still told, once, with the score as the touchdown left it (Codex, #119)"); }
  { // The kick seen as the quarter ends: the touchdown, then its kick, not one combined alert (Codex, #119).
    const db7 = dbOf(), h7 = [];
    for (const [m, us, flush] of [[0, 0, false], [1, 6, false], [2, 7, true]])
      for (const e of scoreStep(db7, "87", g, { period: 1, displayClock: "0:00" }, { us, them: 0 }, T0 + m * 60e3, flush, sum([pl(0, m < 2 ? "N. James Jr. run for 2 yds, for a TD" : null, m < 2 ? 6 : 7)])))
        h7.push(words(e.event, team, g, e.scores, e.x).title + " | " + words(e.event, team, g, e.scores, e.x).body);
    eq(h7, ["Notre Dame TD (13:06 1st) | N. James Jr. run for 2 yds, for a TD. PAT pending.\nNotre Dame 6, Stanford 0", "Notre Dame XP good (13:06 1st) | Notre Dame 7, Stanford 0"],
       "a touchdown and its kick seen across a quarter's end: two alerts, before the quarter's"); }

  { // A touchdown pending its minute, then a field goal by the same side: two alerts, not one "scores" (Codex, #119).
    const db8 = dbOf(), h8 = [];
    for (const [m, us] of [[0, 0], [1, 6], [2, 9], [3, 9]])
      for (const e of scoreStep(db8, "87", g, { period: 2, displayClock: "5:00" }, { us, them: 0 }, T0 + m * 60e3, false, null)) h8.push(words(e.event, team, g, e.scores, e.x).title);
    eq(h8, ["Notre Dame TD", "Notre Dame FG"], "a pending score the game moved on from has held"); }

  { // Stanford's earlier field goal taken back while Notre Dame's try is awaited: the wait goes on (Codex, #119).
    const db9 = dbOf(), h9 = [], td = pl(2, "J. Walton run for 97 yds, for a TD", 6);
    for (const [m, us, them, list] of [[0, 0, 3, null], [1, 6, 3, [td]], [2, 6, 3, [td]], [3, 6, 0, [td]], [4, 6, 0, [pl(2, null, 6)]]])
      for (const e of scoreStep(db9, "87", g, { period: 2, displayClock: "13:00" }, { us, them }, T0 + m * 60e3, false, list && sum(list.map((q) => Object.assign({}, q, { awayScore: them }))))) h9.push(words(e.event, team, g, e.scores, e.x).title);
    eq(h9, ["Notre Dame TD (14:48 2nd)", "Score corrected", "Notre Dame XP missed (14:48 2nd)"], "a correction of the other side's score does not end the wait for our try"); }

  { // The touchdown overturned while ESPN still lists its missed kick: the correction alone (Codex, #119).
    const dbo = dbOf(), ho = [], miss = [pl(2, null, 6)];
    for (const [m, us, list] of [[0, 0, null], [1, 6, [pl(2, "J. Walton run for 97 yds, for a TD", 6)]], [2, 0, miss]])
      for (const e of scoreStep(dbo, "87", g, { period: 2, displayClock: "5:00" }, { us, them: 0 }, T0 + m * 60e3, false, sum(list || []))) ho.push(words(e.event, team, g, e.scores, e.x).title);
    eq(ho, ["Notre Dame TD (14:48 2nd)", "Score corrected"], "a touchdown taken back: no try alert for it, only the correction"); }

  { // A safety for Notre Dame while its try is still out: a safety, not "2-pt good" (Codex, #119).
    const dbs = dbOf(), hs = [], sf = { team: { id: "87" }, homeScore: 8, awayScore: 0, period: { number: 2 }, clock: { displayValue: "12:00" }, scoringType: { abbreviation: "SF" }, text: "Team safety" };
    const td = pl(2, "J. Walton run for 97 yds, for a TD", 6);
    for (const [m, us, list] of [[0, 0, null], [1, 6, [td]], [2, 8, [td, sf]]])
      for (const e of scoreStep(dbs, "87", g, { period: 2, displayClock: "12:00" }, { us, them: 0 }, T0 + m * 60e3, false, sum(list || []))) hs.push(words(e.event, team, g, e.scores, e.x).title);
    eq(hs, ["Notre Dame TD (14:48 2nd)", "Notre Dame Safety (12:00 2nd)"], "ESPN's play says safety: told as one"); }

  { // The score says the kick was good while the summary still says missed: the score wins, one alert (Codex, #119).
    const dbk = dbOf(), hk = [], stale = [pl(2, null, 6)];
    for (const [m, us, list] of [[0, 0, null], [1, 6, [pl(2, "J. Walton run for 97 yds, for a TD", 6)]], [2, 7, stale], [3, 7, stale], [4, 7, stale]])
      for (const e of scoreStep(dbk, "87", g, { period: 2, displayClock: "12:00" }, { us, them: 0 }, T0 + m * 60e3, false, sum(list || []))) hk.push(words(e.event, team, g, e.scores, e.x).title);
    eq(hk, ["Notre Dame TD (14:48 2nd)", "Notre Dame XP good (14:48 2nd)"], "a kick the score shows good: no 'missed' from stale words"); }

  // The other words
  const w = (ev, sc, x, gm) => { const r = words(ev, team, gm || g, sc, x); return r.title + " | " + r.body; };
  eq([w("kickoff", null, {}), w("kickoff", null, {}, Object.assign({}, g, { network: undefined })), w("end:2", { us: 37, them: 0 }, {}), w("end:3", { us: 44, them: 7 }, {}),
      w("final", { us: 49, them: 20 }, {}), w("final", { us: 17, them: 20 }, {}), w("close", { us: 20, them: 14 }, { period: 4, clock: "4:12" }), w("ot", { us: 20, them: 20 }, {}),
      w("score:9", { us: 23, them: 3 }, { period: 2, clock: "4:12", scorer: "them", kind: "fg" })],
     ["Kickoff: Notre Dame vs. Stanford | On NBC", "Kickoff: Notre Dame vs. Stanford | Underway now.", "Halftime | Notre Dame 37, Stanford 0", "End of 3rd | Notre Dame 44, Stanford 7",
      "Final: Notre Dame 49, Stanford 20 | Notre Dame wins.", "Final: Notre Dame 17, Stanford 20 | Stanford wins.", "One-score game (4:12 4th) | Notre Dame 20, Stanford 14",
      "Overtime | Notre Dame 20, Stanford 20", "Stanford FG (4:12 2nd) | Notre Dame 23, Stanford 3"],
     "kickoff with its network, quarters, the final, a close finish, overtime, the other side's field goal");
  eq(w("score:3", { us: 7, them: 0 }, { period: 1, clock: "13:06", scorer: "us", label: "Touchdown" }), "Notre Dame TD (13:06 1st) | Notre Dame 7, Stanford 0",
     "an alert queued before this wording (a label, no kind) still reads right");
  eq(pickGame({ events: [{ id: "1", date: "2026-10-10T19:30Z", competitions: [{ id: "1", status: { type: { state: "pre" } }, broadcasts: [{ media: { shortName: "NBC" } }],
       competitors: [{ homeAway: "home", team: { id: "87" } }, { homeAway: "away", team: { id: "24", location: "Stanford" } }] }] }] }, "87", Date.parse("2026-10-10T19:00Z")).network,
     "NBC", "the watched game keeps its network from the schedule"); }
{ // Through the minute: the summary is read only when the score moved or a try is awaited.
  const db = dbOf(), e = alertEnv({}), b = await browserSub();
  await subscribe(db, e, { subscription: b.sub, team: { id: "194", name: "Ohio State" }, options: { scoring: "all", kickoff: false } }, KICK); e.pushes.length = 0;
  const go = async (m, us) => { e.status = { period: 1, clock: 600, displayClock: "10:00", type: { state: "in", name: "STATUS_IN_PROGRESS" } }; e.scores = { 194: us, 2294: 0 };
                                e.calls.length = 0; await tick(db, e, KICK + m * 60e3); return e.calls.filter((u) => /\/summary\?event=/.test(u)).length; };
  e.summary = { scoringPlays: [{ team: { id: "194" }, homeScore: 0, awayScore: 3, period: { number: 1 }, clock: { displayValue: "10:05" }, scoringType: { abbreviation: "FG" }, text: "J. Kicker 40 yd FG GOOD" }] };
  const reads = [await go(1, 0), await go(2, 0), await go(3, 3), await go(4, 3), await go(5, 3)];
  eq(reads, [0, 0, 1, 0, 0], "the summary: not while nothing changes; read when the score moves; its play confirms the field goal, told at once, and not read again");
  const m = e.pushes.length === 1 ? say(await openPush(e.pushes[0].init.body, b.kp, b.sub.keys.auth)) : e.pushes.length;
  eq(m, "Ohio State FG (10:05 1st) | J. Kicker 40 yd FG GOOD.\nOhio State 3, Iowa 0", "Ohio State away at Iowa: ESPN's away score is ours, the play's clock in the title"); }

{ // The try first seen with the final: told before the final, not left at "PAT pending" (Codex, #119).
  const db = dbOf(), e = alertEnv({}), b = await browserSub();
  await subscribe(db, e, { subscription: b.sub, team: { id: "194", name: "Ohio State" }, options: { scoring: "all", kickoff: false } }, KICK); e.pushes.length = 0;
  const go = async (m, state, us) => { e.status = { period: 4, clock: 0, displayClock: "0:00", type: { state, name: state === "post" ? "STATUS_FINAL" : "STATUS_IN_PROGRESS", completed: state === "post" } };
                                       e.scores = { 194: us, 2294: 3 }; await tick(db, e, KICK + m * 60e3); };
  await go(200, "in", 0); await go(201, "in", 6); await go(202, "in", 6); await go(203, "post", 7);
  const got = []; for (const p of e.pushes) got.push(say(await openPush(p.init.body, b.kp, b.sub.keys.auth)));
  eq(got, ["Ohio State TD (0:00 4th) | PAT pending.\nOhio State 6, Iowa 3", "Ohio State XP good (0:00 4th) | Ohio State 7, Iowa 3", "Final: Ohio State 7, Iowa 3 | Ohio State wins."],
     "a touchdown as time runs out, its kick seen with the final: the kick, then the final"); }

console.log("game alerts: faster (David, Oct 10): told on ESPN's play, three looks a minute");
{ const ND = JSON.parse(readFileSync(new URL("./fixtures/espn-summary-nd-stanford-2026-10-10.json", import.meta.url), "utf8"));
  const g = { id: "401858257", comp: "401858257", home: true, opponent: { id: "24", name: "Stanford" } }, T0 = Date.parse("2026-10-10T19:37:00Z");
  const sum = (list) => scoringPlays({ scoringPlays: list }, "87", g);
  const pl = (text, home) => Object.assign({}, ND.scoringPlays[0], { text, homeScore: home });
  const db = dbOf(), when = [];
  const look = (sec, us, list) => { for (const e of scoreStep(db, "87", g, { period: 1, displayClock: "13:00" }, { us, them: 0 }, T0 + sec * 1000, false, list && sum(list))) when.push(sec + "s " + e.x.kind); };
  look(0, 0, null);
  look(20, 6, [pl("N. James Jr. run for 2 yds, for a TD", 6)]);          // ESPN's play says 6-0: told at once
  look(40, 7, [pl("N. James Jr. run for 2 yds, for a TD (S. Porath KICK)", 7)]);   // and the kick
  look(60, 10, [pl("N. James Jr. run for 2 yds, for a TD (S. Porath KICK)", 7)]);  // no play at 10-0: held ...
  look(80, 10, [pl("N. James Jr. run for 2 yds, for a TD (S. Porath KICK)", 7)]);  // ... a look later
  eq(when, ["20s td", "40s xp", "80s fg"], "a score ESPN's own scoring play confirms is told at the look that sees it; one with no play holds a look"); }
{ // minute(): three looks 20 seconds apart while a game is on; one when none is.
  const db = dbOf(), e = alertEnv({}), b = await browserSub();
  await subscribe(db, e, { subscription: b.sub, team: { id: "194", name: "Ohio State" }, options: { scoring: "all", kickoff: false } }, KICK);
  let t = KICK + 30 * 60e3; const looks = [], slept = [];
  const clock = () => t, sleep = async (ms) => { slept.push(ms); t += ms; };
  const base = e.FETCH; e.FETCH = async (url, init) => { if (/\/status$/.test(url)) looks.push((t - KICK) / 1000); return base(url, init); };
  e.status = { period: 2, clock: 600, displayClock: "10:00", type: { state: "in", name: "STATUS_IN_PROGRESS" } }; e.scores = { 194: 7, 2294: 0 };
  await minute(db, e, clock, sleep);
  eq([looks, slept], [[1800, 1820, 1840], [20000, 20000]], "a game on: three looks in the minute, 20 seconds apart");
  // A push service failing for a while: tried once a minute, not once a look (Codex, #119).
  e.push = 503; e.scores = { 194: 10, 2294: 0 };
  e.FETCH = async (url, init) => { if (/\/status$/.test(url)) looks.push((t - KICK) / 1000); return base(url, init); };
  for (let m = 31; m <= 34; m++) { t = KICK + m * 60e3; await minute(db, e, clock, sleep); }
  const tries = db.all("SELECT event, tries, state FROM deliveries WHERE event LIKE 'score%'").map((r) => r.event + ":" + r.state + ":" + r.tries);
  ok(tries.length === 1 && /:4$/.test(tries[0]), "a failing push service: one try a minute during the game, three looks or not (" + tries.join(",") + ")");
  e.push = 201;
  looks.length = 0; e.status = { period: 4, type: { state: "post", name: "STATUS_FINAL", completed: true } }; t = KICK + 4 * 3600e3;
  await minute(db, e, clock, sleep);
  ok(looks.length === 1 && LIMITS.looks === 3, "no game on: one look"); }

console.log("game alerts: kickoff time set or moved (brief §2b, edge case 12)");
{ const g = (id) => ({ id, comp: id, at: 0, home: true, opponent: { id: "1", name: "BYU" } });
  const k = (id, iso, set, pre) => ({ game: g(id), iso, set, pre: pre !== false });
  const T = Date.parse("2026-10-12T12:00:00Z"), A = "2026-10-17T23:30:00.000Z", B = "2026-10-17T19:30:00.000Z";
  const first = timeChanges(null, [k("1", A, true), k("2", "2026-10-24T04:00:00.000Z", false)], T);
  eq([first.out.length, first.next], [0, { 1: A, 2: null }], "the first look at a team only records: a time already set is not news");
  eq(timeChanges({ 1: A }, [k("1", A, true), k("9", B, true)], T).out.length, 0, "a game seen for the first time is recorded, not announced");
  const set = timeChanges({ 2: null }, [k("2", B, true)], T).out;
  eq(set.map((x) => [x.event, x.x.set, x.x.kickoff]), [["time:" + B, true, B]], "a time-TBA game given its time: one alert, keyed by the new kickoff");
  const moved = timeChanges({ 1: A }, [k("1", B, true)], T).out;
  eq(moved.map((x) => [x.event, x.x.set]), [["time:" + B, false]], "a set time that moves: one alert for the new time");
  eq(timeChanges({ 1: A }, [k("1", B, true)], Date.parse(A) - 2 * 3600e3).out.length, 0, "within 3 hours of the old kickoff it is a delay, not a new time");
  eq(timeChanges({ 1: A }, [k("1", A, true)], T).out.length, 0, "the same time seen again: nothing");
  eq(timeChanges({ 1: A }, [k("1", B, true, false)], T).out.length, 0, "a game under way or final: nothing");
  const tba = timeChanges({ 1: A }, [k("1", "2026-10-17T04:00:00.000Z", false)], T);
  eq([tba.out.length, tba.next[1]], [0, null], "a set time taken back to TBA: nothing sent, and its next time will be news");
  eq(validOptions({}).timeset, false, "off by default");
  eq(validOptions({ kickoff: true, final: true }).timeset, false, "and off for every subscription saved before it existed"); }
{ // The real Ohio State schedule, with one future game's time changed between hourly reads.
  const future = OSU_SCHEDULE.events.filter((ev) => Date.parse(ev.date) > KICK + 7 * 864e5 &&
    ((ev.competitions[0].status || {}).type || {}).state === "pre")[0];
  const sched = JSON.parse(JSON.stringify(OSU_SCHEDULE)), ev = sched.events.filter((x) => x.id === future.id)[0];
  const TBA = "2026-10-17T04:00Z", SET = "2026-10-17T23:30Z", MOVED = "2026-10-17T16:00Z";
  ev.date = TBA; ev.competitions[0].timeValid = false;
  const db = dbOf(), e = alertEnv({}), base = e.FETCH;
  e.FETCH = async (url, init) => /\/teams\/194\/schedule$/.test(url) ? (e.calls.push(url), new Response(JSON.stringify(sched), { status: 200 })) : base(url, init);
  const fans = { on: await browserSub(), off: await browserSub(), old: await browserSub() };
  const T0 = Date.parse("2026-10-11T12:00:00Z");
  await subscribe(db, e, { subscription: fans.on.sub, team: { id: "194", name: "Ohio State" }, options: { kickoff: true, final: true, delays: true, scoring: "all", quarters: true, halftime: true, close: true, timeset: true } }, T0);
  await subscribe(db, e, { subscription: fans.off.sub, team: { id: "194", name: "Ohio State" }, options: { kickoff: true, final: true, delays: true, scoring: "all", quarters: true, halftime: true, close: true } }, T0);
  await subscribe(db, e, { subscription: fans.old.sub, team: { id: "194", name: "Ohio State" } }, T0);
  e.pushes.length = 0;
  await tick(db, e, T0);
  ok(e.pushes.length === 0, "the first read records every kickoff and sends nothing");
  ev.date = SET; ev.competitions[0].timeValid = true;
  await tick(db, e, T0 + 30 * 60e3);
  ok(e.pushes.length === 0, "the schedule is read hourly: nothing new between reads");
  await tick(db, e, T0 + 61 * 60e3);
  const to = (f) => e.pushes.filter((p) => p.url === f.sub.endpoint);
  ok(to(fans.on).length === 1 && to(fans.off).length === 0 && to(fans.old).length === 0,
     "the time is set: one alert, only to the fan who chose it (not to a choice saved without it, not to a round-1 device)");
  const m = await openPush(to(fans.on)[0].init.body, fans.on.kp, fans.on.sub.keys.auth);
  const opp = future.competitions[0].competitors.filter((c) => String(c.team.id) !== "194")[0];
  const home = future.competitions[0].competitors.filter((c) => String(c.team.id) === "194")[0].homeAway === "home";
  eq([m.title, m.body, m.kickoff, m.tag, m.url], ["Ohio State" + (home ? " vs. " : " at ") + (opp.team.location || opp.team.shortDisplayName), "Kickoff time set.",
     new Date(SET).toISOString(), future.id + "-time", APP_URL + "#schedule/" + future.id], "it carries the new kickoff as ISO, opens that game, and has its own card");
  ok(!/\d:\d\d|[AP]M\b/.test(m.title + m.body), "the Worker writes no clock time: the phone does, in its own time zone");
  e.pushes.length = 0; await tick(db, e, T0 + 122 * 60e3);
  ok(e.pushes.length === 0, "the same time read again: nothing");
  ev.date = MOVED; await tick(db, e, T0 + 183 * 60e3);
  const m2 = to(fans.on).length === 1 ? await openPush(to(fans.on)[0].init.body, fans.on.kp, fans.on.sub.keys.auth) : {};
  eq([m2.body, m2.kickoff], ["Kickoff time changed.", new Date(MOVED).toISOString()], "the time moves: one more alert, for the new time");
  e.pushes.length = 0; ev.date = SET; await tick(db, e, T0 + 244 * 60e3);
  const m3 = to(fans.on).length === 1 ? await openPush(to(fans.on)[0].init.body, fans.on.kp, fans.on.sub.keys.auth) : {};
  eq([m3.body, m3.kickoff], ["Kickoff time changed.", new Date(SET).toISOString()], "and back to a time already announced: news again (Codex, #140)");
  e.pushes.length = 0; ev.date = MOVED;
  await tick(db, e, Date.parse(SET) - 2 * 3600e3);
  ok(e.pushes.length === 0, "a move within 3 hours of kickoff is the delay alert's, not this one"); }
{ // No one follows the team for days; the time moves; a fan signs up (Codex, #140).
  const future = OSU_SCHEDULE.events.filter((ev) => Date.parse(ev.date) > KICK + 7 * 864e5 &&
    ((ev.competitions[0].status || {}).type || {}).state === "pre")[0];
  const sched = JSON.parse(JSON.stringify(OSU_SCHEDULE)), ev = sched.events.filter((x) => x.id === future.id)[0];
  ev.date = "2026-10-17T23:30Z"; ev.competitions[0].timeValid = true;
  const db = dbOf(), e = alertEnv({}), base = e.FETCH;
  e.FETCH = async (url, init) => /\/teams\/194\/schedule$/.test(url) ? new Response(JSON.stringify(sched), { status: 200 }) : base(url, init);
  const o = { kickoff: true, final: true, delays: true, scoring: "off", quarters: false, halftime: false, close: false, timeset: true };
  const T = Date.parse("2026-10-08T12:00:00Z"), first = await browserSub(), late = await browserSub();
  await subscribe(db, e, { subscription: first.sub, team: { id: "194", name: "Ohio State" }, options: o }, T);
  await tick(db, e, T);                                             // the kickoff times recorded
  unsubscribe(db, { endpoint: first.sub.endpoint });               // then no one follows Ohio State ...
  ev.date = "2026-10-17T20:00Z";                                    // ... while the time moves
  await subscribe(db, e, { subscription: late.sub, team: { id: "194", name: "Ohio State" }, options: o }, T + 3 * 864e5);
  e.pushes.length = 0; await tick(db, e, T + 3 * 864e5);
  ok(e.pushes.length === 0, "a record left from before an unwatched gap is no baseline: a new follower is not told of an old change");
  ev.date = "2026-10-17T19:00Z"; await tick(db, e, T + 3 * 864e5 + 61 * 60e3);
  ok(e.pushes.length === 1, "and the next real move, read an hour later, is told"); }

console.log("game alerts: one device following both teams in a game (brief §2b, edge case 9)");
{ eq([claimKey("score:3", { home: false }, { us: 3, them: 0 }), claimKey("score:1", { home: true }, { us: 0, them: 3 })], ["score|0-3|0", "score|0-3|0"],
     "a score is the same event whichever team saw it: by the score it made, home first, and the corrections before it");
  ok(claimKey("score:5", { home: true }, { us: 7, them: 0 }, 1) !== claimKey("score:2", { home: true }, { us: 7, them: 0 }, 0),
     "a scoreline that comes back after a correction is a new event (Codex, #140)");
  eq([claimKey("kickoff", { home: true }, null), claimKey("final", { home: true }, null)], ["kickoff", "final"], "kickoff, final and the like by their own name");
  eq([claimKey("time:2026-10-17T23:30:00.000Z#2", { home: true }, null, 2), claimKey("time:2026-10-17T23:30:00.000Z#1", { home: true }, null, 2),
      claimKey("delay:2", { home: true }, null, 2), claimKey("delay:1", { home: true }, null, 2)],
     ["time:2026-10-17T23:30:00.000Z@2", "time:2026-10-17T23:30:00.000Z@2", "delay@2", "delay@2"],
     "a kickoff time or a delay by the game's count, not the number each team gave it (Codex, #140)");
  const db = dbOf(), e = alertEnv({}), base = e.FETCH;
  e.FETCH = async (url, init) => /\/teams\/2294\/schedule$/.test(url) ? new Response(JSON.stringify(OSU_SCHEDULE), { status: 200 }) : base(url, init);
  const both = await browserSub(), osu = await browserSub(), iowa = await browserSub();
  const all = { kickoff: true, final: true, delays: true, scoring: "all", quarters: false, halftime: false, close: false };
  const OSU = { id: "194", name: "Ohio State" }, IOWA = { id: "2294", name: "Iowa" };
  // different choices on the two teams: scores only through Iowa's
  await subscribe(db, e, { subscription: both.sub, team: OSU, options: Object.assign({}, all, { scoring: "off" }) }, KICK - 3600e3);
  await subscribe(db, e, { subscription: both.sub, team: IOWA, options: all }, KICK - 3600e3);
  await subscribe(db, e, { subscription: osu.sub, team: OSU, options: all }, KICK - 3600e3);
  await subscribe(db, e, { subscription: iowa.sub, team: IOWA, options: Object.assign({}, all, { scoring: "mine" }) }, KICK - 3600e3);
  e.pushes.length = 0;
  const heard = new Map([[both, []], [osu, []], [iowa, []]]);
  async function hear() {
    for (const p of e.pushes) {
      if (p.url === both.sub.endpoint && e.refusedOne) { e.refusedOne = false; continue; }   // refused: never reached the phone
      for (const [f, list] of heard) if (f.sub.endpoint === p.url) list.push(say(await openPush(p.init.body, f.kp, f.sub.keys.auth)));
    }
    e.pushes.length = 0;
  }
  let lastMin = null;
  async function at(min, state, name, us, them, twice) {
    // the minutes between are looked at too, nothing changed
    if (lastMin != null) for (let m = lastMin + 1; m < min; m++) { await tick(db, e, KICK + m * 60e3); await hear(); }
    lastMin = min;
    e.status = { period: min < 15 ? 1 : 2, clock: 600, displayClock: "10:00", type: { state, name, completed: state === "post" } };
    e.scores = { 194: us, 2294: them };
    const lg = await tick(db, e, KICK + min * 60e3); if (twice) lg.push(...await tick(db, e, KICK + min * 60e3 + 1000));
    await hear();
  }
  await at(1, "in", "STATUS_IN_PROGRESS", 0, 0, true);      // kickoff; the same minute looked at twice
  // the device's first try at the Ohio State field goal is refused by its push service, then retried
  e.push = (url) => url === both.sub.endpoint && !e.refused ? (e.refused = e.refusedOne = true, 500) : 201;
  await at(20, "in", "STATUS_IN_PROGRESS", 3, 0);
  await at(21, "in", "STATUS_IN_PROGRESS", 3, 0);
  await at(22, "in", "STATUS_IN_PROGRESS", 3, 0);
  // mid-game the device moves its scores to Ohio State's side
  await subscribe(db, e, { subscription: both.sub, team: OSU, options: all }, KICK + 23 * 60e3);
  await subscribe(db, e, { subscription: both.sub, team: IOWA, options: Object.assign({}, all, { scoring: "off" }) }, KICK + 23 * 60e3);
  await at(30, "in", "STATUS_IN_PROGRESS", 3, 7);
  await at(31, "in", "STATUS_IN_PROGRESS", 3, 7);
  await at(90, "post", "STATUS_FINAL", 3, 7);
  const count = (list) => list.reduce((m, x) => (m[x] = (m[x] || 0) + 1, m), {});
  const b = heard.get(both);
  ok(b.filter((x) => /^Kickoff/.test(x)).length === 1 && b.filter((x) => /^Final/.test(x)).length === 1,
     "one kickoff and one final, though two teams it follows saw them, and the minute was looked at twice");
  ok(b.filter((x) => / FG /.test(x)).length === 1, "the field goal once, through its Iowa choice, after a refused first try");
  ok(b.filter((x) => / TD /.test(x)).length === 1, "after changing its choices mid-game, the touchdown once, through Ohio State");
  ok(Object.values(count(b)).every((n) => n === 1), "no alert twice: " + JSON.stringify(b));
  eq(heard.get(osu).length, b.length, "a second device following one team gets the same alerts, separately");
  ok(heard.get(iowa).some((x) => /Iowa TD|Iowa scores/.test(x)) && !heard.get(iowa).some((x) => /Ohio State FG|Ohio State scores/.test(x)),
     "and a third with its own choice (Iowa's scores only) gets just those"); }
{ // 7-0, overturned to 0-0, then 7-0 again (Codex, #140): the second touchdown is news, for one team's
  // follower and for a device following both.
  const db = dbOf(), e = alertEnv({}), base = e.FETCH;
  e.FETCH = async (url, init) => /\/teams\/2294\/schedule$/.test(url) ? new Response(JSON.stringify(OSU_SCHEDULE), { status: 200 }) : base(url, init);
  const one = await browserSub(), both = await browserSub();
  const all = { kickoff: false, final: false, delays: false, scoring: "all", quarters: false, halftime: false, close: false };
  await subscribe(db, e, { subscription: one.sub, team: { id: "194", name: "Ohio State" }, options: all }, KICK - 3600e3);
  await subscribe(db, e, { subscription: both.sub, team: { id: "194", name: "Ohio State" }, options: all }, KICK - 3600e3);
  await subscribe(db, e, { subscription: both.sub, team: { id: "2294", name: "Iowa" }, options: all }, KICK - 3600e3);
  e.pushes.length = 0;
  const heard = { one: [], both: [] };
  for (let m = 1; m <= 40; m++) {
    const sc = m < 10 ? [0, 0] : m < 20 ? [7, 0] : m < 30 ? [0, 0] : [7, 0];
    e.status = { period: 1, clock: 900 - m * 10, displayClock: "1:00", type: { state: "in", name: "STATUS_IN_PROGRESS", completed: false } };
    e.scores = { 194: sc[0], 2294: sc[1] };
    await tick(db, e, KICK + m * 60e3);
    for (const p of e.pushes) for (const [k, f] of [["one", one], ["both", both]]) if (p.url === f.sub.endpoint) heard[k].push(say(await openPush(p.init.body, f.kp, f.sub.keys.auth)));
    e.pushes.length = 0;
  }
  const scored = (l) => l.filter((x) => /Ohio State (TD|scores)/.test(x)).length;
  eq([scored(heard.one), heard.one.filter((x) => /corrected/.test(x)).length], [2, 1], "one team's follower: the touchdown, its correction, and the touchdown again");
  eq([scored(heard.both), heard.both.filter((x) => /corrected/.test(x)).length], [2, 1], "a device following both teams: the same three, once each"); }
{ // A device that starts following the opponent after a correction (Codex, #140): the next score once.
  const db = dbOf(), e = alertEnv({}), base = e.FETCH;
  e.FETCH = async (url, init) => /\/teams\/2294\/schedule$/.test(url) ? new Response(JSON.stringify(OSU_SCHEDULE), { status: 200 }) : base(url, init);
  const d = await browserSub();
  const all = { kickoff: false, final: false, delays: false, scoring: "all", quarters: false, halftime: false, close: false };
  await subscribe(db, e, { subscription: d.sub, team: { id: "194", name: "Ohio State" }, options: all }, KICK - 3600e3);
  e.pushes.length = 0;
  let got = [];
  for (let m = 1; m <= 50; m++) {
    if (m === 32) await subscribe(db, e, { subscription: d.sub, team: { id: "2294", name: "Iowa" }, options: all }, KICK + m * 60e3);
    const sc = m < 10 ? [0, 0] : m < 20 ? [7, 0] : m < 40 ? [0, 0] : [7, 0];
    e.status = { period: 1, clock: 900 - m * 10, displayClock: "1:00", type: { state: "in", name: "STATUS_IN_PROGRESS", completed: false } };
    e.scores = { 194: sc[0], 2294: sc[1] };
    await tick(db, e, KICK + m * 60e3);
    for (const p of e.pushes) if (p.url === d.sub.endpoint) got.push(say(await openPush(p.init.body, d.kp, d.sub.keys.auth)));
    e.pushes.length = 0;
  }
  eq(got.filter((x) => /Ohio State (TD|scores)/.test(x)).length, 2, "following the opponent too after a correction: the next score still comes once: " + JSON.stringify(got)); }
{ // Codex, #140: a kickoff time both teams see change; a delay after a device added the opponent; a close
  // finish already told before the device added the opponent. Each once.
  const future = OSU_SCHEDULE.events.filter((ev) => Date.parse(ev.date) > KICK + 7 * 864e5 &&
    ((ev.competitions[0].status || {}).type || {}).state === "pre")[0];
  const sched = JSON.parse(JSON.stringify(OSU_SCHEDULE)), fe = sched.events.filter((x) => x.id === future.id)[0];
  const oppId = String(future.competitions[0].competitors.filter((c) => String(c.team.id) !== "194")[0].team.id);
  fe.date = "2026-10-17T04:00Z"; fe.competitions[0].timeValid = false;
  const db = dbOf(), e = alertEnv({}), base = e.FETCH;
  e.FETCH = async (url, init) => /\/teams\/(194|2294|\d+)\/schedule$/.test(url) ? new Response(JSON.stringify(sched), { status: 200 }) : base(url, init);
  const d = await browserSub();
  const opts = { kickoff: false, final: false, delays: true, scoring: "off", quarters: false, halftime: false, close: true, timeset: true };
  await subscribe(db, e, { subscription: d.sub, team: { id: "194", name: "Ohio State" }, options: opts }, KICK - 5 * 864e5);
  await subscribe(db, e, { subscription: d.sub, team: { id: oppId, name: "Opponent" }, options: opts }, KICK - 5 * 864e5);
  e.pushes.length = 0;
  await tick(db, e, KICK - 5 * 864e5);
  fe.date = "2026-10-17T23:30Z"; fe.competitions[0].timeValid = true;
  await tick(db, e, KICK - 5 * 864e5 + 61 * 60e3);
  eq(e.pushes.filter((p) => p.url === d.sub.endpoint).length, 1, "a kickoff time both teams it follows see set: one alert, not one per team");
  // The game (Ohio State at Iowa): followed through Ohio State only, a delay and a close finish; then Iowa too.
  const d2 = await browserSub();
  const g2 = { kickoff: false, final: false, delays: true, scoring: "off", quarters: false, halftime: false, close: true };
  await subscribe(db, e, { subscription: d2.sub, team: { id: "194", name: "Ohio State" }, options: g2 }, KICK);
  e.pushes.length = 0;
  const got = [];
  const look = async (m, name, clock, us, them) => {
    e.status = { period: 4, clock, displayClock: "4:00", type: { state: "in", name, completed: false } };
    e.scores = { 194: us, 2294: them };
    await tick(db, e, KICK + m * 60e3);
    for (const p of e.pushes) if (p.url === d2.sub.endpoint) got.push(say(await openPush(p.init.body, d2.kp, d2.sub.keys.auth)));
    e.pushes.length = 0;
  };
  for (let m = 100; m <= 103; m++) await look(m, "STATUS_IN_PROGRESS", 600, 20, 17);
  await look(104, "STATUS_DELAYED", 590, 20, 17);
  await look(105, "STATUS_IN_PROGRESS", 590, 20, 17);              // the first delay clears
  await look(106, "STATUS_IN_PROGRESS", 280, 20, 17);              // a one-score game under 5:00: close finish
  await subscribe(db, e, { subscription: d2.sub, team: { id: "2294", name: "Iowa" }, options: g2 }, KICK + 107 * 60e3);
  await look(107, "STATUS_IN_PROGRESS", 270, 20, 17);              // Iowa's first look: still close
  await look(108, "STATUS_DELAYED", 260, 20, 17);                  // a second delay, seen by both
  await look(109, "STATUS_IN_PROGRESS", 260, 20, 17);
  eq([got.filter((x) => /^One-score/.test(x)).length, got.filter((x) => /^Delay/.test(x)).length], [1, 2],
     "the close finish once, though the device added Iowa during it; each delay once: " + JSON.stringify(got)); }
{ // A kickoff moved earlier, noticed while the game is still "pre" after the new listed time (Codex, #140).
  const future = OSU_SCHEDULE.events.filter((ev) => Date.parse(ev.date) > KICK + 7 * 864e5 &&
    ((ev.competitions[0].status || {}).type || {}).state === "pre")[0];
  const sched = JSON.parse(JSON.stringify(OSU_SCHEDULE)), ev = sched.events.filter((x) => x.id === future.id)[0];
  const OLD = Date.parse("2026-10-17T23:30:00Z"), NEW = Date.parse("2026-10-17T16:00:00Z");
  ev.date = new Date(OLD).toISOString(); ev.competitions[0].timeValid = true;
  const db = dbOf(), e = alertEnv({}), base = e.FETCH;
  e.FETCH = async (url, init) => /\/teams\/194\/schedule$/.test(url) ? new Response(JSON.stringify(sched), { status: 200 }) : base(url, init);
  const f = await browserSub();
  await subscribe(db, e, { subscription: f.sub, team: { id: "194", name: "Ohio State" }, options: { kickoff: true, final: true, delays: true, scoring: "off", quarters: false, halftime: false, close: false, timeset: true } }, NEW - 864e5);
  await tick(db, e, NEW - 864e5); await tick(db, e, NEW - 95 * 60e3); e.pushes.length = 0;   // read hourly, as the Worker does
  ev.date = new Date(NEW).toISOString();
  e.push = 500;                                         // the first try is refused ...
  await tick(db, e, NEW - 30 * 60e3);
  e.push = 201; e.pushes.length = 0;
  await tick(db, e, NEW + 5 * 60e3);                    // ... and retried after the new listed time, the game not yet started
  ok(e.pushes.length === 1, "an alert still due after the listed kickoff goes while the game has not started");
  db.run("INSERT INTO deliveries (team_id, game_id, event, endpoint, state, tries, at, data) VALUES ('194', ?, 'time:2026-10-17T16:30:00.000Z', ?, 'due', 1, ?, ?)",
         future.id, f.sub.endpoint, NEW, JSON.stringify({ game: { id: future.id, home: true, opponent: { name: "X" } }, scores: null, x: { kickoff: "2026-10-17T16:30:00.000Z", set: false } }));
  db.run("INSERT INTO sent (team_id, game_id, event, at) VALUES ('194', ?, 'kickoff', ?)", future.id, NEW + 10 * 60e3);
  e.pushes.length = 0; await tick(db, e, NEW + 11 * 60e3);
  ok(e.pushes.length === 0, "once its kickoff has been seen, a kickoff-time alert still waiting is dropped");
  // A claim cut off mid-send (the object restarted between the claim and its
  // result) is sent again after LIMITS.stuck; a fresh claim is left to its
  // run (code review, 2026-10-25).
  const T = NEW + 20 * 60e3, row = (game, claimed) => db.run(
    "INSERT INTO deliveries (team_id, game_id, event, endpoint, state, tries, at, data, claimed) VALUES ('194', ?, 'time:2026-10-24T16:30:00.000Z', ?, 'sending', 0, ?, ?, ?)",
    game, f.sub.endpoint, T - 60 * 60e3, JSON.stringify({ game: { id: game, home: true, opponent: { name: "X" } }, scores: null, x: { kickoff: "2026-10-24T16:30:00.000Z", set: true } }), claimed);
  row("g-cut", T - 10 * 60e3); row("g-old", null); row("g-now", T - 30e3);
  e.pushes.length = 0; await tick(db, e, T);
  const st = (g) => db.all("SELECT state, tries FROM deliveries WHERE game_id = ?", g)[0];
  eq([st("g-cut").state, st("g-cut").tries, st("g-old").state, st("g-now").state, e.pushes.length], ["done", 2, "done", "sending", 2],
     "a send cut off mid-run is sent again, counted as a try; one claimed just now is left to the run that holds it"); }

console.log("game alerts: the routes and the minute");
{ const calls = [];
  const fakeNs = (env) => ({ idFromName: () => "id", get: () => ({ fetch: (url, init) => {
    calls.push(url); return new Alerts({ storage: { sql: SHARED } }, env).fetch(new Request(url, init)); } }) });
  const SHARED = fakeSql(), base = alertEnv({});
  const env2 = Object.assign({}, base); env2.ALERTS = fakeNs(env2);
  const key = await worker.fetch(new Request("https://suite-api.example/v1/push/key", { headers: { origin: SITE } }), env2, null);
  const kb = await key.json();
  ok(key.status === 200 && /^[A-Za-z0-9_-]{87}$/.test(kb.key) && unb64u(kb.key)[0] === 4, "GET /v1/push/key: the VAPID public key (65 bytes, uncompressed)");
  const b = await browserSub();
  const post = (path, body, origin) => worker.fetch(new Request("https://suite-api.example" + path,
    { method: "POST", headers: Object.assign({ "content-type": "application/json" }, origin ? { origin } : {}), body: JSON.stringify(body) }), env2, null);
  ok((await post("/v1/push/subscribe", { subscription: b.sub, team: { id: "194", name: "Ohio State" } }, "https://evil.example")).status === 403, "a sign-up from anywhere but Suite: 403");
  const sr = await post("/v1/push/subscribe", { subscription: b.sub, team: { id: "194", name: "Ohio State" } }, SITE);
  ok(sr.status === 200 && sr.headers.get("access-control-allow-origin") === SITE, "POST /v1/push/subscribe from Suite: 200");
  ok((await post("/v1/push/unsubscribe", { endpoint: b.sub.endpoint, team: { id: "194" } }, SITE)).status === 200, "POST /v1/push/unsubscribe: 200");
  const big = await worker.fetch(new Request("https://suite-api.example/v1/push/subscribe", { method: "POST", headers: { origin: SITE }, body: "x".repeat(5000) }), env2, null);
  ok(big.status === 413, "an oversized body: 413");
  const pre = await worker.fetch(new Request("https://suite-api.example/v1/push/subscribe", { method: "OPTIONS", headers: { origin: SITE } }), env2, null);
  ok(/POST/.test(pre.headers.get("access-control-allow-methods")) && /content-type/.test(pre.headers.get("access-control-allow-headers")), "the preflight allows Suite's POST");
  ok((await worker.fetch(new Request("https://suite-api.example/v1/push/key"), {}, null)).status === 503, "no Durable Object bound: 503, not a crash");
  const rs = await worker.fetch(new Request("https://suite-api.example/v1/push/status"), env2, null);
  ok(rs.status === 200 && Array.isArray((await rs.json()).subscriptions) && rs.headers.get("cache-control") === "no-store", "GET /v1/push/status: the report, never cached");
  calls.length = 0; let waited;
  await worker.scheduled({ cron: ALERTS_CRON }, env2, { waitUntil: (p) => { waited = p; } }); await waited;
  ok(calls.some((u) => /\/tick$/.test(u)), "the every-minute cron runs the alerts tick");
  calls.length = 0; const refreshEnv = Object.assign({}, env2, { REFRESH_CLOCK_TOKEN: "" });
  await worker.scheduled({ cron: "7,37 * * * *" }, refreshEnv, { waitUntil: (p) => { waited = p; } });
  ok(await waited === "no-token" && calls.length === 0, "the refresh clock's cron still starts the refresh, not alerts"); }

console.log("game alerts: the CFP rankings are out (postseason events, brief §1)");
{ // The real feed on Selection Day 2025 (tools/fixtures/espn-rankings-cfp-20260114.json):
  // the committee's poll dated 2025-12-07, Week 16; Ohio State No. 2, Notre Dame No. 11.
  const FEED = JSON.parse(readFileSync(new URL("./fixtures/espn-rankings-cfp-20260114.json", import.meta.url), "utf8"));
  const SHOW = { season: 2025, n: 6, start: "2025-12-07T12:00:00-05:00", end: "2025-12-07T15:00:00-05:00" };
  const AT = Date.parse(SHOW.start);

  eq(RANKINGS_SHOWS.map((x) => x.start.slice(0, 10)), ["2026-11-03", "2026-11-10", "2026-11-17", "2026-11-24", "2026-12-01"],
     "the Worker knows the five 2026 shows, from the league calendar");
  { const { execFileSync } = await import("node:child_process");
    let inStep = true; try { execFileSync("node", [new URL("./build-worker-calendar.js", import.meta.url).pathname, "--check"], { stdio: "ignore" }); } catch (err) { inStep = false; }
    ok(inStep, "and worker/src/calendar.js is in step with leagues/college-football.js"); }
  const first = Date.parse("2026-11-03T19:00:00-05:00");
  ok(cfpShow(first - 60e3) === null && cfpShow(first + 60e3).n === 1 && cfpShow(first + 11 * 3600e3).n === 1 && cfpShow(first + 13 * 3600e3) === null,
     "it looks only from the show's start to 12 hours after");
  ok(cfpShow(Date.parse("2026-10-20T23:00:00Z")) === null, "and today, in October, not at all");

  const rel = cfpRelease(FEED, SHOW);
  ok(rel && rel.id === "2025-w16" && rel.ranks.length === 25, "the real feed: this show's release, keyed by its season and week (" + (rel && rel.id) + ")");
  eq([rel.ranks.find((r) => r.id === "194").rank, rel.ranks.find((r) => r.id === "87").rank], [2, 11], "Ohio State No. 2, Notre Dame No. 11");
  ok(cfpRelease(FEED, Object.assign({}, SHOW, { start: "2025-12-14T12:00:00-05:00" })) === null,
     "a release dated another day is not this show's: last week's, still in the feed before the show, is never news");
  const short = JSON.parse(JSON.stringify(FEED)); short.rankings.find((r) => r.type === "cfp").ranks.length = 10;
  ok(cfpRelease(short, SHOW) === null, "fewer than 25: not a release");
  const bad = JSON.parse(JSON.stringify(FEED)); bad.rankings.find((r) => r.type === "cfp").ranks[4].current = null;
  ok(cfpRelease(bad, SHOW) === null, "a rank it cannot read: not a release, rather than a wrong number");
  ok(cfpRelease({ rankings: FEED.rankings.filter((r) => r.type !== "cfp") }, SHOW) === null && cfpRelease(null, SHOW) === null, "no committee poll: nothing");
  eq(validOptions({}).cfp, false, "opt-in: off by default");
  eq(validOptions({ kickoff: true, final: true, timeset: true }).cfp, false, "and off for every choice saved before it existed");

  const db = dbOf(), e = alertEnv({}), base = e.FETCH;
  let feed = FEED, looks = 0;
  e.SHOWS = [SHOW];
  e.FETCH = async (url, init) => {
    if (/\/rankings$/.test(url)) { looks++; return new Response(JSON.stringify(feed), { status: 200 }); }
    if (/\/teams\/(87|99)\/schedule$/.test(url)) return new Response("", { status: 503 });
    return base(url, init);
  };
  const on = { kickoff: true, final: true, delays: true, scoring: "off", quarters: false, halftime: false, close: false, timeset: false, cfp: true };
  const off = Object.assign({}, on, { cfp: false });
  const f = { nd: await browserSub(), ndOff: await browserSub(), osu: await browserSub(), both: await browserSub(), lsu: await browserSub(), old: await browserSub() };
  const T0 = AT - 864e5;
  await subscribe(db, e, { subscription: f.nd.sub, team: { id: "87", name: "Notre Dame" }, options: on }, T0);
  await subscribe(db, e, { subscription: f.ndOff.sub, team: { id: "87", name: "Notre Dame" }, options: off }, T0);
  await subscribe(db, e, { subscription: f.osu.sub, team: { id: "194", name: "Ohio State" }, options: on }, T0);
  await subscribe(db, e, { subscription: f.both.sub, team: { id: "87", name: "Notre Dame" }, options: on }, T0);
  await subscribe(db, e, { subscription: f.both.sub, team: { id: "194", name: "Ohio State" }, options: on }, T0);
  await subscribe(db, e, { subscription: f.lsu.sub, team: { id: "99", name: "LSU" }, options: on }, T0);
  await subscribe(db, e, { subscription: f.old.sub, team: { id: "87", name: "Notre Dame" } }, T0);
  e.pushes.length = 0;
  await tick(db, e, AT - 3600e3);
  ok(looks === 0 && e.pushes.length === 0, "before the show: the rankings are not even asked for");

  const before = JSON.parse(JSON.stringify(FEED)); before.rankings.find((r) => r.type === "cfp").date = "2025-11-30T08:00Z";
  feed = before;
  await tick(db, e, AT + 60e3);
  ok(looks === 1 && e.pushes.length === 0, "the show is on, last week's release still in the feed: nothing");
  await tick(db, e, AT + 2 * 60e3);
  ok(looks === 1, "asked again only after " + LIMITS.cfpEvery / 60e3 + " minutes, not every minute");
  feed = FEED;
  await tick(db, e, AT + 7 * 60e3);
  const to = (x) => e.pushes.filter((p) => p.url === x.sub.endpoint);
  const open = async (x, i) => openPush(to(x)[i || 0].init.body, x.kp, x.sub.keys.auth);
  ok(looks === 2 && to(f.nd).length === 1 && to(f.osu).length === 1 && to(f.lsu).length === 1,
     "the release appears: one alert to each fan who chose it");
  ok(to(f.ndOff).length === 0 && to(f.old).length === 0, "none to a choice without it, or to a device from before there were choices");
  const nd = await open(f.nd), osu = await open(f.osu), lsu = await open(f.lsu);
  eq([nd.title, nd.body, nd.url], ["CFP rankings", "The CFP rankings are out: Notre Dame is No. 11.", APP_URL + "#top25/rankings/cfp"],
     "the approved words, opening the CFP rankings");
  eq(osu.body, "The CFP rankings are out: Ohio State is No. 2.", "each team its own rank");
  eq(lsu.body, "The CFP rankings are out: LSU is not in the top 25.", "a team outside the 25 is told so, not left out");
  ok(to(f.both).length === 2, "a device that follows both teams gets two alerts, one per team (" + to(f.both).length + ")");
  const both = to(f.both).length === 2 ? await Promise.all([open(f.both, 0), open(f.both, 1)]) : [];
  eq(both.map((m) => m.body).sort(), ["The CFP rankings are out: Notre Dame is No. 11.", "The CFP rankings are out: Ohio State is No. 2."],
     "a device that follows both teams hears where each stands");

  e.pushes.length = 0;
  const again = JSON.parse(JSON.stringify(FEED)); again.rankings.find((r) => r.type === "cfp").lastUpdated = "2025-12-07T23:59Z";
  feed = again;
  await tick(db, e, AT + 20 * 60e3);
  await tick(db, e, AT + 40 * 60e3);
  ok(looks === 2 && e.pushes.length === 0, "once the release is found, the night is done: no more asking, no repeat when ESPN re-publishes");
  await tick(db, e, AT + 13 * 3600e3);
  ok(looks === 2 && e.pushes.length === 0, "and after the window, nothing");

  { // Codex, #147: a rankings feed that hangs on a Tuesday night with a game on.
    const db3 = dbOf(), e3 = alertEnv({ status: st("in", 1, "STATUS_IN_PROGRESS") }), b3 = e3.FETCH;
    e3.SHOWS = [{ season: 2026, n: 9, start: new Date(KICK - 60e3).toISOString(), end: new Date(KICK + 3600e3).toISOString() }];
    let asked = 0;
    e3.FETCH = (url, init) => /\/rankings$/.test(url)
      ? (asked++, new Promise((res, rej) => { if (init && init.signal) init.signal.addEventListener("abort", () => rej(new Error("aborted"))); }))
      : b3(url, init);
    const fan = await browserSub();
    await subscribe(db3, e3, { subscription: fan.sub, team: { id: "194", name: "Ohio State" }, options: Object.assign({}, on, { cfp: true }) }, KICK - 864e5);
    e3.pushes.length = 0;
    const wait = LIMITS.cfpWait; LIMITS.cfpWait = 200;
    const done = await Promise.race([tick(db3, e3, KICK + 60e3).then(() => true), new Promise((r) => setTimeout(() => r(false), 5000))]);
    LIMITS.cfpWait = wait;
    const kicked = e3.pushes.filter((p) => p.url === fan.sub.endpoint).length;
    ok(asked === 1 && done && kicked === 1, "a rankings feed that hangs: the kickoff alert still goes, and the minute still ends (" + kicked + " sent)");
  }

  const db2 = dbOf(), e2 = alertEnv({ push: 503 });
  e2.SHOWS = [SHOW]; const b2 = e2.FETCH;
  e2.FETCH = async (url, init) => /\/rankings$/.test(url) ? new Response(JSON.stringify(FEED), { status: 200 })
                                 : /\/teams\/87\/schedule$/.test(url) ? new Response("", { status: 503 }) : b2(url, init);
  const late = await browserSub();
  await subscribe(db2, e2, { subscription: late.sub, team: { id: "87", name: "Notre Dame" }, options: on }, T0);
  await tick(db2, e2, AT + 60e3);
  e2.push = 201; e2.pushes.length = 0;
  await tick(db2, e2, AT + 60e3 + LIMITS.cfpFresh + 60e3);
  ok(e2.pushes.length === 0, "a rankings alert still undelivered the next day is dropped: it is no longer news"); }

console.log("game alerts: Selection Day, the postseason set, a game declined, no postseason (brief §1)");
{ // Real payloads: Notre Dame's 2024 postseason (tools/fixtures/espn-schedule-nd-2024-post-notes.json)
  // and the league's 2024 postseason board (espn-scoreboard-postseason-2024.json).
  const fx = (n) => JSON.parse(readFileSync(new URL("./fixtures/" + n, import.meta.url), "utf8"));
  const ND_POST = fx("espn-schedule-nd-2024-post-notes.json"), BOARD = fx("espn-scoreboard-postseason-2024.json");
  // As it stood on Selection Day: every game still to play.
  const pre = (sch) => { const c = JSON.parse(JSON.stringify(sch)); for (const e of c.events) { const cc = e.competitions[0]; cc.status = { type: { state: "pre", name: "STATUS_SCHEDULED" } }; for (const x of cc.competitors) delete x.score; } return c; };
  const SEL = { season: 2024, start: "2024-12-08T12:00:00-05:00", end: "2024-12-08T15:00:00-05:00", on: "ESPN" };
  const S0 = Date.parse(SEL.start), S1 = Date.parse(SEL.end);

  eq(SELECTION_DAYS.map((d) => [d.season, d.start, d.on]), [[2026, "2026-12-06T12:00:00-05:00", "ESPN"]], "Selection Day comes from the league calendar");
  ok(selectionFor(Date.parse("2026-10-20T12:00:00Z")) === null && selectionFor(Date.parse("2026-11-30T12:00:00Z")).season === 2026 &&
     selectionFor(Date.parse("2027-01-31T12:00:00Z")).season === 2026 && selectionFor(Date.parse("2027-02-01T12:00:00Z")) === null,
     "the postseason runs from the week before Selection Day through January; nothing in October");
  eq(stageOf(ND_POST.events[1].competitions[0]), { kind: "playoff", round: "Quarterfinal", bowl: "Allstate Sugar Bowl" }, "a round and its bowl, as ESPN names them, the reschedule note dropped");
  eq(stageOf(BOARD.events.find((e) => e.id === "401677183").competitions[0]).bowl, "Rose Bowl", "a sponsor's 'Presented by' dropped");
  const games = postGames(pre(ND_POST), "87");
  eq(games.map((g) => [g.id, g.stage.round, g.opp, g.usRank, g.oppRank, g.home]),
     [["401677179", "First Round", "Indiana", 7, 10, true], ["401677184", "Quarterfinal", "Georgia", 7, 2, false],
      ["401677189", "Semifinal", "Penn State", 7, 6, false], ["401677192", "National Championship", "Ohio State", 7, 8, true]],
     "Notre Dame 2024: each game's round, opponent and seeds");
  ok(fieldSet(BOARD) === true, "the 2024 board: the field is set (a First Round game with two real teams)");
  const B25 = fx("espn-scoreboard-postboard-2025.json");
  ok(fieldSet(B25) === true && stageOf(B25.events.find((x) => /First Round Game/.test((x.competitions[0].notes[0] || {}).headline)).competitions[0]).round === "First Round",
     "2025: the first round written \"First Round Game\" is still the first round, and the field is set");
  ok(!B25.events.some((x) => x.competitions[0].competitors.some((c) => String(c.team.id) === "87")),
     "and Notre Dame, which declined its bowl, is on no 2025 postseason game: what 'no postseason' reads");
  const tbd = JSON.parse(JSON.stringify(BOARD));
  for (const e of tbd.events) for (const c of e.competitions[0].competitors) if ((e.competitions[0].notes || []).some((n) => /First Round/.test(n.headline))) { c.team.id = "-1"; c.team.displayName = "TBD"; }
  ok(fieldSet(tbd) === false && fieldSet(null) === null && fieldSet({}) === null, "placeholders only: not set; no board: unknown, never 'not set'");

  const fr = games[0], qf = games[1];
  const W = (ev, x, name) => words(ev, { id: "87", name: name || "Notre Dame" }, {}, null, x);
  const fw = W("post:" + fr.id, { stage: fr.stage, opp: fr.opp, oppRank: fr.oppRank, usRank: fr.usRank, home: true, at: fr.iso, timeSet: true, net: "ABC" });
  eq([fw.title, fw.body, fw.kickoff, fw.network], ["College Football Playoff", "Notre Dame is in the College Football Playoff: the No. 7 seed hosts No. 10 Indiana in the First Round.", fr.iso, "ABC"],
     "in the playoff: seed, opponent, round; the time in the title, written by the phone");
  eq(W("post:" + qf.id, { stage: qf.stage, opp: qf.opp, oppRank: 2, home: false, at: qf.iso, timeSet: false }).body,
     "Notre Dame plays No. 2 Georgia in the CFP Quarterfinal at the Allstate Sugar Bowl.", "a later round names the bowl it is played in");
  ok(!W("post:x", { stage: fr.stage, opp: "Indiana", at: fr.iso, timeSet: false }).kickoff, "a time ESPN has not set is never promised");
  const BOWL = { stage: { kind: "bowl", round: null, bowl: "Kinder's Texas Bowl" }, opp: "Baylor", at: "2024-12-31T20:30Z", timeSet: true };
  eq(W("post:1", BOWL, "LSU").body, "LSU will play Baylor in the Kinder's Texas Bowl.", "a bowl: the brief's words, the bowl as ESPN names it");
  eq([W("postoff:1", BOWL, "LSU").title, W("postoff:1", BOWL, "LSU").body], ["Bowl game", "LSU will not play in the Kinder's Texas Bowl."], "a bowl declined or left");
  eq(W("nopost:2024", {}).body, "Notre Dame's season is complete: no bowl this year.", "no postseason");
  const sw = W("sel:2024", { at: new Date(S0).toISOString(), on: "ESPN" });
  eq([sw.title, sw.kickoff, sw.network], ["Selection Day", new Date(S0).toISOString(), "ESPN"], "Selection Day: the show's time and network ride in the title");
  eq([validOptions({}).selection, validOptions({}).postseason, validOptions({}).nopost, validOptions(null).postseason], [false, false, false, false],
     "a choice saved before they existed has all three off (the app turns two on for a fan choosing now)");

  // The Worker, minute by minute, around Selection Day 2024.
  const db = dbOf(), e = alertEnv({}), base = e.FETCH;
  e.SELECTION = [SEL];
  let ndPost = { events: [] }, lsuPost = { events: [] }, board = tbd, boardLooks = 0;
  const LSU_BOWL = pre({ events: [BOARD.events.find((x) => x.id === "401677104")] });
  e.FETCH = async (url, init) => {
    if (/\/teams\/(87|99)\/schedule$/.test(url)) return new Response(JSON.stringify({ events: [] }), { status: 200 });
    if (/\/teams\/87\/schedule\?seasontype=3$/.test(url)) return ndPost === 503 ? new Response("", { status: 503 }) : new Response(JSON.stringify(ndPost), { status: 200 });
    if (/\/teams\/99\/schedule\?seasontype=3$/.test(url)) return new Response(JSON.stringify(lsuPost), { status: 200 });
    if (/\/scoreboard\?.*seasontype=3/.test(url)) { boardLooks++; return new Response(JSON.stringify(board), { status: 200 }); }
    return base(url, init);
  };
  const all = { kickoff: true, final: true, delays: true, scoring: "off", quarters: false, halftime: false, close: false, timeset: false, cfp: false,
                selection: true, postseason: true, nopost: true };
  const f = { nd: await browserSub(), ndOld: await browserSub(), lsu: await browserSub(), lsuLate: await browserSub(), lsuNoNo: await browserSub() };
  const T0 = S0 - 30 * 864e5;
  await subscribe(db, e, { subscription: f.nd.sub, team: { id: "87", name: "Notre Dame" }, options: all }, T0);
  await subscribe(db, e, { subscription: f.ndOld.sub, team: { id: "87", name: "Notre Dame" }, options: { kickoff: true, final: true, delays: true } }, T0);
  await subscribe(db, e, { subscription: f.lsu.sub, team: { id: "99", name: "LSU" }, options: all }, T0);
  await subscribe(db, e, { subscription: f.lsuNoNo.sub, team: { id: "99", name: "LSU" }, options: Object.assign({}, all, { nopost: false }) }, T0);
  e.pushes.length = 0;
  const to = (x) => e.pushes.filter((p) => p.url === x.sub.endpoint);
  const open = async (x, i) => openPush(to(x)[i == null ? to(x).length - 1 : i].init.body, x.kp, x.sub.keys.auth);

  await tick(db, e, S0 - 4 * 3600e3);
  ok(e.pushes.length === 0, "the night before: nothing");
  await tick(db, e, S0 - 2 * 3600e3);
  ok(to(f.nd).length === 1 && to(f.lsu).length === 1 && to(f.ndOld).length === 0, "the morning of: the reminder to each fan who chose it, none to a choice from before it existed");
  const r = await open(f.nd);
  eq([r.title, r.kickoff, r.network, r.url], ["Selection Day", new Date(S0).toISOString(), "ESPN", APP_URL + "#top25/rankings/cfp"], "the reminder: the show's time, opening the CFP rankings");
  await tick(db, e, S0 - 3600e3);
  ok(to(f.nd).length === 1, "once");

  e.pushes.length = 0;
  await tick(db, e, S0 + 30 * 60e3);
  ok(e.pushes.length === 0, "the show is on, nothing listed yet: nothing");
  ndPost = pre(ND_POST); ndPost.events = ndPost.events.slice(0, 1);                 // the First Round, named at selection
  lsuPost = LSU_BOWL;
  await tick(db, e, S0 + 40 * 60e3);
  ok(to(f.nd).length === 1 && to(f.ndOld).length === 0 && to(f.lsu).length === 1, "named minutes later: each team's game, read every few minutes on Selection Day");
  const nm = await open(f.nd), lm = await open(f.lsu);
  eq([nm.body, nm.url], ["Notre Dame is in the College Football Playoff: the No. 7 seed hosts No. 10 Indiana in the First Round.", APP_URL + "#schedule/401677179"],
     "Notre Dame: the First Round, opening that game");
  eq(lm.body, "LSU will play Baylor in the Kinder's Texas Bowl.", "LSU: its bowl");
  await tick(db, e, S0 + 41 * 60e3);
  eq(JSON.parse(db.all("SELECT game FROM games WHERE team_id = '87'")[0].game || "{}").id, "401677179", "and from the next minute the game alerts watch the playoff game");
  await tick(db, e, S0 + 50 * 60e3);
  ok(to(f.nd).length === 1 && to(f.lsu).length === 1, "each game is announced once");
  { // A postseason read that fails at the hourly read: the playoff game stays watched.
    const keep = ndPost; ndPost = 503;
    db.run("UPDATE games SET checked = 0 WHERE team_id = '87'");
    await tick(db, e, S0 + 51 * 60e3);
    eq(JSON.parse(db.all("SELECT game FROM games WHERE team_id = '87'")[0].game || "{}").id, "401677179", "a failed postseason read never drops the game being watched");
    ndPost = keep;
  }

  // Still listed, but ESPN's notes for it gone or worded another way (Codex,
  // #152): the game is not withdrawn, however many reads.
  e.pushes.length = 0;
  lsuPost = JSON.parse(JSON.stringify(LSU_BOWL));
  for (const ev of lsuPost.events) for (const c of ev.competitions || []) c.notes = [];
  for (let i = 0; i < 3; i++) {                                          // three reads, one a minute
    db.run("UPDATE games SET checked = 0 WHERE team_id = '99'");
    await tick(db, e, S0 + 52 * 60e3 + i * 60e3);
  }
  ok(e.pushes.length === 0, "a game still listed without notes it can read: never withdrawn");
  lsuPost = LSU_BOWL;

  // LSU leaves its bowl (David: Notre Dame declined its 2025 bowl). One read
  // without it is not enough; a failed read is never a missing game.
  await subscribe(db, e, { subscription: f.lsuLate.sub, team: { id: "99", name: "LSU" }, options: all }, S0 + 55 * 60e3);
  e.pushes.length = 0;
  lsuPost = { events: [] };
  await tick(db, e, S0 + 60 * 60e3);
  ok(e.pushes.length === 0, "gone from one read: nothing yet");
  await tick(db, e, S0 + 70 * 60e3);
  ok(to(f.lsu).length === 1 && to(f.lsuNoNo).length === 1 && to(f.lsuLate).length === 0,
     "gone on two reads in a row: withdrawn, to each device told it was set - not to one that never heard of it");
  const off = await open(f.lsu);
  eq([off.body, off.url], ["LSU will not play in the Kinder's Texas Bowl.", APP_URL + "#schedule"],
     "in plain words, opening the schedule - not a game no longer on it (Codex, #152)");
  await tick(db, e, S0 + 80 * 60e3);
  ok(to(f.lsu).length === 1, "withdrawn once");

  // No postseason: only once the league's field is set, the team has nothing
  // left to play, and two reads found no game - and never before the evening after.
  e.pushes.length = 0;
  await tick(db, e, S1 + 11 * 3600e3);
  ok(e.pushes.length === 0 && boardLooks === 0, "before the evening after Selection Day: not even asked");
  await tick(db, e, S1 + 13 * 3600e3);
  ok(e.pushes.length === 0 && boardLooks === 1, "the board shows placeholders only: not yet");
  board = BOARD;
  await tick(db, e, S1 + 13 * 3600e3 + 30 * 60e3);
  ok(boardLooks === 1, "the board is asked at most hourly");
  await tick(db, e, S1 + 14 * 3600e3 + 60e3);
  ok(to(f.lsu).length === 1 && to(f.lsuNoNo).length === 0 && to(f.nd).length === 0,
     "the field is set: LSU's fan who chose it hears its season is over; not one who did not, nor Notre Dame's, still playing");
  eq((await open(f.lsu)).body, "LSU's season is complete: no bowl this year.", "the brief's words");
  await tick(db, e, S1 + 16 * 3600e3);
  ok(to(f.lsu).length === 1, "once");

  // The next season (Codex, #152): Notre Dame played its 2024 playoff games;
  // in 2025 it is on no postseason game, and its fan who chose it is told -
  // last year's games never stand in for this year's.
  { const B25 = fx("espn-scoreboard-postboard-2025.json");
    const SEL25 = { season: 2025, start: "2025-12-07T12:00:00-05:00", end: "2025-12-07T15:00:00-05:00", on: "ESPN" };
    const E1 = Date.parse(SEL25.end);
    e.SELECTION = [SEL25]; ndPost = { events: [] }; board = B25; e.pushes.length = 0;
    for (let i = 0; i < 4; i++) await tick(db, e, E1 + 13 * 3600e3 + i * 61 * 60e3);
    ok(to(f.nd).length === 1, "2025: Notre Dame, on no postseason game, is told its season is complete (" + to(f.nd).length + ")");
    eq((await open(f.nd)).body, "Notre Dame's season is complete: no bowl this year.", "the brief's words");
    e.SELECTION = [SEL]; }

  // A failed read never counts as an empty one.
  const db2 = dbOf(), e2 = alertEnv({}); e2.SELECTION = [SEL]; e2.FETCH = e.FETCH;
  const g = await browserSub();
  await subscribe(db2, e2, { subscription: g.sub, team: { id: "87", name: "Notre Dame" }, options: all }, T0);
  ndPost = 503; board = BOARD;
  for (let i = 0; i < 6; i++) await tick(db2, e2, S1 + 13 * 3600e3 + i * 61 * 60e3);
  ok(e2.pushes.filter((p) => p.url === g.sub.endpoint && !/sel/.test(p.init.body)).length === 0, "a postseason schedule that fails to load: never 'no postseason'");
}

console.log("SP+ week by week (David, 2026-10-21): kept in the Worker, never as a file");
{ const sq = fakeSql(), db = { exec: (q) => sq.exec(q), all: (q, ...b) => sq.exec(q, ...b).toArray(), run: (q, ...b) => { sq.exec(q, ...b); } };
  migrateSp(db);
  const D = (iso) => Date.parse(iso), W = (n) => ({ id: "w" + n, label: "Week " + n });
  const ids = schoolIds(fbs(2026)), t1 = pickSp(spRows(2026), ids, 2026);
  const t2 = t1.map((r, i) => i === 0 ? Object.assign({}, r, { rating: r.rating + 1 }) : r);
  const t3 = t1.map((r, i) => i === 1 ? Object.assign({}, r, { rating: r.rating - 1 }) : r);
  const t4 = t1.map((r, i) => i === 2 ? Object.assign({}, r, { rating: r.rating + 2 }) : r);
  eq([weekOf({ season: { year: 2026, type: 2 }, week: { number: 8 } }, 2026), weekOf({ season: { year: 2026, type: 1 } }, 2026),
      weekOf({ season: { year: 2026, type: 3 } }, 2026), weekOf({ season: { year: 2027, type: 1 } }, 2026),
      weekOf({ season: { year: 2025, type: 2 }, week: { number: 3 } }, 2026), weekOf({ season: { year: 2026, type: 2 } }, 2026), weekOf(null, 2026)],
     [W(8), { id: "pre", label: "Preseason" }, { id: "final", label: "Final" }, { id: "final", label: "Final" }, null, null, null],
     "the week is ESPN's: Week N, Preseason, Final (a scoreboard already on next season: Final); anything else unknown");
  eq(keepSp(db, 2026, t1, D("2026-10-20T15:00:00Z"), W(8)), "w8", "the first table is filed under ESPN's week");
  eq(keepSp(db, 2026, t1, D("2026-10-21T03:00:00Z"), W(9)), "w8", "the same table read again is the same edition, whatever the week now");
  eq(spWeeks(db, 2026).length, 1, "and is not kept twice");
  ok(!spDue(db, 2026, D("2026-10-21T03:00:00Z") + SP_DUE - 1) && spDue(db, 2026, D("2026-10-21T03:00:00Z") + SP_DUE), "the clock reads SP+ again only after 12 hours without a read");
  eq(keepSp(db, 2026, t2, D("2026-10-21T04:00:00Z"), W(8)), "w8-2026-10-21", "a different table the next day, ESPN still on that week: a second edition, by its day");
  const sq2 = fakeSql(), db2 = { exec: (q) => sq2.exec(q), all: (q, ...b) => sq2.exec(q, ...b).toArray(), run: (q, ...b) => { sq2.exec(q, ...b); } };
  migrateSp(db2);
  keepSp(db2, 2026, t1, D("2026-10-20T15:00:00Z"), W(8));
  eq(keepSp(db2, 2026, t2, D("2026-10-20T19:00:00Z"), W(8)), "w8", "a different table the same day corrects that day's edition");
  ok(spWeeks(db2, 2026).length === 1 && spWeek(db2, 2026, "w8").ranks[0].rating === t2[0].rating, "in place: one edition, the corrected table");
  eq(keepSp(db2, 2026, t3, D("2026-10-27T15:00:00Z"), W(9)), "w9", "a new table on a later day is the next week's edition");
  eq(keepSp(db2, 2026, t4, D("2026-10-29T15:00:00Z"), W(9)), "w9-2026-10-29", "SP+ moving twice in one week keeps both, the second by its day");
  ok(spWeek(db2, 2026, "w8").ranks[0].rating === t2[0].rating && spWeek(db2, 2026, "w9").ranks[1].rating === t3[1].rating,
     "nothing kept is ever replaced by a later week");
  eq(spWeeks(db2, 2026).map((w) => w.id), ["w8", "w9", "w9-2026-10-29"], "the weeks, oldest first");
  eq(keepSp(db2, 2026, t1, D("2026-11-03T15:00:00Z"), null), null, "ESPN unable to say the week: the table waits, unfiled");
  ok(spWeeks(db2, 2026).length === 3 && spDue(db2, 2026, D("2026-11-03T15:01:00Z")), "nothing filed, and the clock tries again next half hour");
  eq(keepSp(db2, 2026, t1, D("2026-11-03T15:30:00Z"), W(10)), "w10", "the next read files it");
  eq(spIdOf(db2, 2026, t1), "w10", "a table being served is matched to its edition");
  eq(spIdOf(db2, 2026, t2), null, "one that is not the newest is not claimed");
  eq(spWeeks(db2, 2025), [], "each season its own");
  const sq3 = fakeSql(), db3 = { exec: (q) => sq3.exec(q), all: (q, ...b) => sq3.exec(q, ...b).toArray(), run: (q, ...b) => { sq3.exec(q, ...b); } };
  migrateSp(db3);
  for (let i = 0; i < SP_KEEP_MAX + 2; i++) keepSp(db3, 2026, t1.map((r, j) => j ? r : Object.assign({}, r, { rating: i })), D("2026-08-01T12:00:00Z") + i * 864e5, W(i + 1));
  eq(spWeeks(db3, 2026).length, SP_KEEP_MAX, "a feed gone wrong cannot grow the store without end"); }

console.log("SP+ week by week: the routes and the clock");
{ const espnSeen = [];
  function store(boardWeek) {
    const dEnv = { FETCH: async (url) => { espnSeen.push(url);
      if (boardWeek === null) return new Response("no", { status: 503 });
      return new Response(JSON.stringify({ season: { year: 2026, type: 2 }, week: { number: boardWeek } }), { status: 200 }); } };
    const obj = new Ratings({ storage: { sql: fakeSql() } }, dEnv);
    return { idFromName: () => "ratings", get: () => ({ fetch: (u, init) => obj.fetch(new Request(u, init)) }) };
  }
  const e = Object.assign(spEnv(), { RATINGS: store(8) });
  const { r, body } = await get("/v1/cfbd/sp?year=2026", e, SITE);
  ok(r.status === 200 && body.week === "w8" && body.weeks.length === 1 && body.weeks[0].id === "w8" && body.weeks[0].label === "Week 8",
     "the table read is filed under ESPN's week, and the answer says which week it is and which weeks are kept");
  ok(JSON.stringify(Object.keys(body).sort()) === JSON.stringify(["fetchedAt", "ranks", "source", "week", "weeks", "year"]) &&
     JSON.stringify(Object.keys(body.weeks[0])) === JSON.stringify(["id", "label", "seen"]), "nothing more: the kept weeks without their tables");
  ok(espnSeen.length === 1 && /\/scoreboard$/.test(espnSeen[0]), "ESPN's scoreboard is asked the week once, when a new table is filed");
  const again = await get("/v1/cfbd/sp?year=2026", e, SITE);
  ok(again.body.week === "w8" && espnSeen.length === 1 && e.calls.length === 2, "a cached answer is matched to its week, asking neither CFBD nor ESPN");
  const wk = await get("/v1/cfbd/sp/week?year=2026&id=w8", e, SITE);
  ok(wk.r.status === 200 && wk.body.source === "cfbd-sp" && wk.body.week === "w8" && wk.body.label === "Week 8" && wk.body.fetchedAt === body.weeks[0].seen &&
     JSON.stringify(wk.body.ranks) === JSON.stringify(body.ranks), "a kept week: its table as it was shown, and when it was first seen");
  ok(wk.body.ranks.every((x) => JSON.stringify(Object.keys(x)) === JSON.stringify(["rank", "team", "id", "rating"])) && !/offense|defense|conference|nationalAverages/.test(JSON.stringify(wk.body)),
     "kept as shown: rank, school, id and rating - nothing more of CFBD's table");
  ok(wk.r.headers.get("access-control-allow-origin") === SITE, "Suite's origin may read it");
  eq([(await get("/v1/cfbd/sp/week?year=2026&id=w3", e, SITE)).r.status, (await get("/v1/cfbd/sp/week?year=2026&id=../x", e, SITE)).r.status,
      (await get("/v1/cfbd/sp/week?year=2023&id=w8", e, SITE)).r.status, (await get("/v1/cfbd/sp/week?year=2026&id=w8", spEnv(), SITE)).r.status],
     [404, 400, 400, 503], "a week not kept: 404; a malformed week or another season: 400; no store: 503");
  const blind = Object.assign(spEnv(), { RATINGS: store(null) });
  const b = await get("/v1/cfbd/sp?year=2026", blind, SITE);
  ok(b.r.status === 200 && b.body.week === null && b.body.weeks.length === 0 && b.body.ranks.length === 26, "ESPN unable to say the week: the table is served, not yet filed");
  const broken = Object.assign(spEnv(), { RATINGS: { idFromName: () => "x", get: () => ({ fetch: async () => { throw new Error("down"); } }) } });
  const bk = await get("/v1/cfbd/sp?year=2026", broken, SITE);
  ok(bk.r.status === 200 && bk.body.ranks.length === 26 && !("weeks" in bk.body), "the store down: the current table still stands, without weeks");

  // The clock: a read only when no table has been kept for 12 hours.
  const c = Object.assign(spEnv(), { RATINGS: store(8) });
  await spClock(c, null);
  ok(c.calls.filter((x) => /ratings\/sp/.test(x.url)).length === 1, "nothing kept yet: the clock reads SP+ once");
  await spClock(c, null);
  ok(c.calls.filter((x) => /ratings\/sp/.test(x.url)).length === 1, "just kept: the next half hour does not");
  ok((await get("/v1/cfbd/sp/week?year=2026&id=w8", c, SITE)).r.status === 200, "and the week it read is kept, with no fan having opened SP+");
  const nokey = Object.assign(spEnv({ key: "" }), { RATINGS: store(8) });
  await spClock(nokey, null);
  ok(nokey.calls.length === 0, "no CFBD key: the clock asks nothing");
  const jan = Object.assign(spEnv(), { RATINGS: store(8), NOW: () => Date.parse("2027-01-15T12:00:00Z") });
  await spClock(jan, null);
  ok(jan.calls.some((x) => /ratings\/sp\?year=2026$/.test(x.url)), "in January the clock keeps last season's final table"); }

console.log("\n" + (failures ? failures + " check(s) FAILED" : "the edge API answers only what a screen shows"));
process.exit(failures ? 1 : 0);
