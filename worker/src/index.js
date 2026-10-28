/* Suite's edge API (decision 0030): our own small API on Cloudflare Workers.

   Suite calls this, never a backend provider directly. It holds provider
   keys as Worker secrets, fetches server-side, caches, and returns only what
   a screen shows - never a provider's raw payload, and nothing published as
   a file (CollegeFootballData's condition, decision 0012).

   Routes
     GET /v1/health                         liveness and version
     GET /v1/cfbd/season?team=&year=        CFBD season stats for one team,
                                            only the fields in CFBD_FIELDS; a school in
                                            the registry, this season or last
     GET /v1/cfbd/sp?year=                  the SP+ top 25: rank, school, rating
                                            and the school's id - nothing else -
                                            and the weeks kept (./sp.js)
     GET /v1/cfbd/sp/week?year=&id=         one kept week of SP+, the same rows
     GET /v1/probe/espn                     can this Worker reach ESPN's live
                                            scoreboard? Status, time, game
                                            count only (W19 Phase 0)
     GET  /v1/push/key                      game alerts (W19, ./push.js): the
     POST /v1/push/subscribe                VAPID public key; a browser's push
     POST /v1/push/unsubscribe              subscription for a team, and off
     GET  /v1/push/status                   what alerts are doing (counts only)

   Scheduled (wrangler.toml [triggers]): the data refresh clock. Every 30
   minutes it starts the repository's "Refresh team data" workflow with
   source=clock - the job cron-job.org was meant to do (W02, decision 0030).
   GitHub's own scheduler runs that workflow only every few hours. And every
   minute, game alerts look at the followed teams' games (./push.js). The
   half-hourly clock also reads SP+ when no read has kept a table for 12
   hours, so each week is kept even if no fan opens SP+ (./sp.js).

   Every answer is JSON with `source`, `fetchedAt` and, when it is a cached
   copy served because the provider failed, `stale: true`. Errors say what
   failed without passing the provider's body through.

   No dependencies: Workers' standard fetch, Request, Response and Cache. */

import { SCHOOLS } from "./schools.js";
import { Alerts } from "./push.js";
import { Ratings } from "./sp.js";

// The Durable Objects that hold game alerts and SP+'s kept weeks
// (wrangler.toml); exported here because Cloudflare finds them in the main
// module.
export { Alerts, Ratings };

export const VERSION = "edge-2026-10-27fbsranks";
export const ALERTS_CRON = "* * * * *";

const ORIGINS = ["https://dmvanblaircom.github.io"];
const CFBD = "https://api.collegefootballdata.com";
const FRESH_SECONDS = 6 * 3600;        // season stats move once a week
const KEEP_SECONDS = 7 * 24 * 3600;    // a stale copy may stand in for a week

// The CFBD stat names a screen may show, read from a real response by the
// CFBD probe (2026-10-01, tools/cfbd_probe.py): the Matchup card's rushing
// and passing yards allowed per game (W15) - season totals the opponents
// gained, and the games they came from. Nothing else leaves CFBD.
// turnovers / turnoversOpponent: what a team gave away and took away, for its
// turnover margin - ESPN's matched the NCAA's own table for 10% of FBS
// teams, CFBD's for 93% (2026-10-27).
export const CFBD_FIELDS = ["games", "rushingYardsOpponent", "netPassingYardsOpponent", "turnovers", "turnoversOpponent"];

const TEAM = /^[A-Za-z0-9 .&'()À-ſ-]{2,40}$/;
// Only the registry's schools, and only this season or last, ever reach
// CFBD: each new (school, season) spends one call of the key's monthly
// allowance, and a script asking for made-up names or years could spend it
// all and blank Matchup's yards-allowed rows for every fan (bug hunt,
// 2026-10-02). worker/src/schools.js is generated from teams/index.js.
const KNOWN = new Set(SCHOOLS.map(function (s) { return s.toLowerCase(); }));

function cors(origin) {
  const h = { "vary": "Origin" };
  if (origin && ORIGINS.indexOf(origin) > -1) h["access-control-allow-origin"] = origin;
  return h;
}

function json(body, status, origin, extra) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: Object.assign({ "content-type": "application/json; charset=utf-8" }, cors(origin), extra || {})
  });
}

function fail(status, error, origin) {
  return json({ error: error }, status, origin, { "cache-control": "no-store" });
}

// CFBD's /stats/season rows -> the fields a screen may show. Rows for other
// teams or seasons, unknown names and non-numeric values are dropped; a
// field CFBD does not send stays absent, never 0.
export function pickSeason(rows, team, year, fields) {
  const out = {};
  (Array.isArray(rows) ? rows : []).forEach(function (r) {
    if (!r || String(r.team || "").toLowerCase() !== team.toLowerCase() || Number(r.season) !== year) return;
    if (fields.indexOf(r.statName) < 0) return;
    const v = Number(r.statValue);
    if (Number.isFinite(v)) out[r.statName] = v;
  });
  return out;
}

async function cfbdSeason(url, env, origin, ctx) {
  const team = (url.searchParams.get("team") || "").trim();
  const year = Number(url.searchParams.get("year"));
  if (!TEAM.test(team)) return fail(400, "team is required", origin);
  if (!(year >= 2000 && year <= 2100)) return fail(400, "year is required", origin);
  if (!KNOWN.has(team.toLowerCase())) return fail(404, "not a school Suite covers", origin);
  const now = new Date(env.NOW ? env.NOW() : Date.now()).getUTCFullYear();
  if (year !== now && year !== now - 1) return fail(400, "only this season or last", origin);
  if (!env.CFBD_API_KEY) return fail(503, "CFBD is not configured", origin);

  const cache = env.CACHE || caches.default;
  const fields = env.FIELDS || CFBD_FIELDS;
  // The allowed fields are part of the key: after the list changes, a copy
  // saved under the old list is never served as the answer to the new one.
  const key = new Request("https://edge.cache/v1/cfbd/season?team=" + encodeURIComponent(team.toLowerCase()) +
                          "&year=" + year + "&f=" + encodeURIComponent(fields.join(",")));
  const held = await cache.match(key);
  let heldBody = null;
  if (held) {
    heldBody = await held.json();
    if (Date.now() - Date.parse(heldBody.fetchedAt) < FRESH_SECONDS * 1000) return json(heldBody, 200, origin);
  }

  let rows = null;
  try {
    const r = await (env.FETCH || fetch)(CFBD + "/stats/season?year=" + year + "&team=" + encodeURIComponent(team), {
      headers: { "authorization": "Bearer " + env.CFBD_API_KEY, "accept": "application/json" }
    });
    if (r.ok) rows = await r.json();
  } catch (e) { rows = null; }

  if (!Array.isArray(rows)) {
    if (heldBody) return json(Object.assign({}, heldBody, { stale: true }), 200, origin);
    return fail(502, "CFBD could not be reached", origin);
  }
  const body = { source: "cfbd", team: team, year: year, fetchedAt: new Date().toISOString(),
                 stats: pickSeason(rows, team, year, fields) };
  const put = cache.put(key, new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json", "cache-control": "max-age=" + KEEP_SECONDS } }));
  if (ctx && ctx.waitUntil) ctx.waitUntil(put); else await put;
  return json(body, 200, origin);
}

// SP+ (W07, issue #29; handoff 2026-10-14, slice 4). Bill's permission
// (Oct 1): "displaying the SP+ top 25 with ranks and ratings ... credited to
// SP+ and CFBD". So the answer is exactly that: the rows ranked 25 or better
// (a tie can make it a row or two more), each with rank, school, rating and
// the school's id. No offense, defense, conference or the rest of the table.
//
// CFBD's SP+ rows name a school but carry no id. CFBD's FBS team list gives
// each school's id, which is ESPN's: the probe of 2026-10-14
// (tools/cfbd_sp_probe.py) found all 138 registry programs under the same id
// and name, and all 25 top-25 schools in the list. The join is exact; a
// school it cannot place keeps id null, never a guess. The app checks the id
// against the registry again (TeamOS.ratings.spPlus).
//
// CFBD says nothing about when an edition was published, so neither does
// this: `fetchedAt` is when the Worker read it, nothing more.
export const SP_TOP = 25;
const SP_FRESH = 12 * 3600;              // SP+ moves once a week
const TEAMS_FRESH = 7 * 24 * 3600;       // the FBS list moves once a year
const TEAMS_KEEP = 60 * 24 * 3600;

// CFBD's FBS list -> school -> id (a string). A school listed twice names
// no one.
export function schoolIds(teams) {
  const ids = new Map();
  (Array.isArray(teams) ? teams : []).forEach(function (t) {
    if (!t || typeof t.school !== "string" || !Number.isInteger(t.id)) return;
    ids.set(t.school, ids.has(t.school) ? null : String(t.id));
  });
  return ids;
}

// CFBD's /ratings/sp rows -> the permitted rows, by rank. Drops other
// seasons, the unranked national-averages row and anything past 25. A 0 or
// negative rating is a rating. A top-25 row of the season without a school
// or a numeric rating makes the whole table null: dropping it would leave a
// table that looks whole but is missing a team (Codex, #142).
export function pickSp(rows, ids, year) {
  const out = [];
  for (const r of Array.isArray(rows) ? rows : []) {
    if (!r || Number(r.year) !== year) continue;
    if (!Number.isInteger(r.ranking) || r.ranking < 1 || r.ranking > SP_TOP) continue;
    if (typeof r.team !== "string" || !r.team || typeof r.rating !== "number" || !Number.isFinite(r.rating)) return null;
    out.push({ rank: r.ranking, team: r.team, id: (ids && ids.get(r.team)) || null, rating: r.rating });
  }
  return out.sort(function (a, b) { return a.rank - b.rank; });
}

// A whole top 25: at least 25 rows (ties only add rows), each school once,
// and ranks as a tie gives them - 1, 2, 3, 3, 5 - with none skipped.
export function wholeSp(ranks) {
  if (!Array.isArray(ranks) || ranks.length < SP_TOP) return false;
  const seen = new Set();
  return ranks.every(function (r, i) {
    if (seen.has(r.team)) return false;
    seen.add(r.team);
    return r.rank === i + 1 || (i > 0 && r.rank === ranks[i - 1].rank);
  });
}

async function cfbdJson(path, env) {
  try {
    const r = await (env.FETCH || fetch)(CFBD + path, {
      headers: { "authorization": "Bearer " + env.CFBD_API_KEY, "accept": "application/json" }
    });
    return r.ok ? await r.json() : null;
  } catch (e) { return null; }
}

async function held(cache, key) {
  const r = await cache.match(key);
  return r ? r.json() : null;
}

function keep(cache, key, body, seconds, ctx) {
  const put = cache.put(key, new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json", "cache-control": "max-age=" + seconds } }));
  if (ctx && ctx.waitUntil) ctx.waitUntil(put); else return put;
}

async function fbsIds(year, env, cache, ctx) {
  const key = new Request("https://edge.cache/v1/cfbd/teams-fbs?year=" + year);
  const old = await held(cache, key);
  if (old && Date.now() - Date.parse(old.fetchedAt) < TEAMS_FRESH * 1000) return schoolIds(old.teams);
  const teams = await cfbdJson("/teams/fbs?year=" + year, env);
  if (!Array.isArray(teams) || !teams.length) return old ? schoolIds(old.teams) : null;
  // Only what the join needs is kept.
  const slim = teams.map(function (t) { return { id: t && t.id, school: t && t.school }; });
  await keep(cache, key, { fetchedAt: new Date().toISOString(), teams: slim }, TEAMS_KEEP, ctx);
  return schoolIds(slim);
}

// SP+'s kept weeks live in one Durable Object (./sp.js).
function ratingsStore(env) {
  return env && env.RATINGS ? env.RATINGS.get(env.RATINGS.idFromName("ratings")) : null;
}

// The weeks kept, added to an answer: `week` is the kept edition this table
// is (null until it is filed), `weeks` every kept edition without its table.
// A table just read from CFBD is filed first. A store that cannot answer
// leaves both off: the current table still stands.
async function withWeeks(body, env, read) {
  const store = ratingsStore(env);
  if (!store || !Array.isArray(body.ranks) || !body.ranks.length) return body;
  try {
    const r = await store.fetch("https://ratings/" + (read ? "keep" : "which"),
                                { method: "POST", body: JSON.stringify({ year: body.year, ranks: body.ranks }) });
    if (!r.ok) return body;
    const k = await r.json();
    return Object.assign({}, body, { week: k.id || null, weeks: Array.isArray(k.weeks) ? k.weeks : [] });
  } catch (e) { return body; }
}

// This season or the one before it, as the app counts seasons (its
// seasonYear): from January to June the season is last year's, so its "last
// season" is two calendar years back (code review, 2026-10-25).
function spYearOk(year, env) {
  const d = new Date(env.NOW ? env.NOW() : Date.now());
  const season = d.getUTCMonth() < 6 ? d.getUTCFullYear() - 1 : d.getUTCFullYear();
  return year === season || year === season - 1;
}

const WEEK_ID = /^[a-z0-9-]{1,24}$/;

// One kept week: the same four fields a row has, and when it was first seen.
async function cfbdSpWeek(url, env, origin) {
  const year = Number(url.searchParams.get("year")), id = url.searchParams.get("id") || "";
  if (!(year >= 2000 && year <= 2100)) return fail(400, "year is required", origin);
  if (!spYearOk(year, env)) return fail(400, "only this season or last", origin);
  if (!WEEK_ID.test(id)) return fail(400, "week is required", origin);
  const store = ratingsStore(env);
  if (!store) return fail(503, "no weeks are kept", origin);
  try {
    const r = await store.fetch("https://ratings/week?year=" + year + "&id=" + encodeURIComponent(id));
    if (r.status === 404) return fail(404, "that week is not kept", origin);
    if (!r.ok) return fail(502, "the kept weeks could not be read", origin);
    const w = await r.json();
    return json({ source: "cfbd-sp", year: year, fetchedAt: w.seen, week: w.id, label: w.label, ranks: w.ranks }, 200, origin,
                { "cache-control": "max-age=3600" });
  } catch (e) { return fail(502, "the kept weeks could not be read", origin); }
}

// The clock's read (wrangler.toml): only when no table has been kept for
// SP_DUE, and only through the route's own read, so it spends CFBD's
// allowance no faster than a fan would. August to January is the season.
export async function spClock(env, ctx) {
  const store = ratingsStore(env);
  if (!store || !env.CFBD_API_KEY) return;
  const d = new Date(env.NOW ? env.NOW() : Date.now());
  const year = d.getUTCMonth() >= 6 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
  try {
    const r = await store.fetch("https://ratings/due?year=" + year);
    if (!r.ok || !(await r.json()).due) return;
    await cfbdSp(new URL("https://edge/v1/cfbd/sp?year=" + year), env, null, ctx);
  } catch (e) { /* the next half hour tries again */ }
}

async function cfbdSp(url, env, origin, ctx) {
  const year = Number(url.searchParams.get("year"));
  if (!(year >= 2000 && year <= 2100)) return fail(400, "year is required", origin);
  if (!spYearOk(year, env)) return fail(400, "only this season or last", origin);
  if (!env.CFBD_API_KEY) return fail(503, "CFBD is not configured", origin);

  const cache = env.CACHE || caches.default;
  const key = new Request("https://edge.cache/v1/cfbd/sp?year=" + year + "&top=" + SP_TOP);
  const heldBody = await held(cache, key);
  if (heldBody && Date.now() - Date.parse(heldBody.fetchedAt) < SP_FRESH * 1000) return json(await withWeeks(heldBody, env, false), 200, origin);

  // CFBD's empty list is "not published for that season" - an answer. A
  // table that is there but not a whole top 25, or whose schools cannot be
  // placed, is a failure like no answer at all.
  const rows = await cfbdJson("/ratings/sp?year=" + year, env);
  let ranks = null;
  if (Array.isArray(rows) && !rows.length) ranks = [];
  else if (Array.isArray(rows)) {
    const ids = await fbsIds(year, env, cache, ctx);
    const picked = ids ? pickSp(rows, ids, year) : [];
    if (wholeSp(picked)) ranks = picked;
  }
  if (!ranks) {
    if (heldBody) return json(await withWeeks(Object.assign({}, heldBody, { stale: true }), env, false), 200, origin);
    return fail(502, "CFBD could not be reached", origin);
  }
  const body = { source: "cfbd-sp", year: year, fetchedAt: new Date().toISOString(), ranks: ranks };
  await keep(cache, key, body, KEEP_SECONDS, ctx);
  return json(await withWeeks(body, env, true), 200, origin);
}

// FBS ranks Suite computes itself (decision 0037): ESPN ranks net passing
// yards across all of Division I, and its turnover rank does not follow the
// margin. From one league-wide read of CFBD's season totals, each FBS
// school's place in passing yards per game and in turnover margin (taken
// away less given away), more being better, a tie sharing the best place as
// ESPN prints "Tied-". Only places leave the Worker, never CFBD's figures.
// A read that cannot place nine in ten FBS schools is no answer: a table
// missing teams would rank the rest too high.
export const RANKED = ["passOffense", "turnoverMargin"];
export function fbsRanks(rows, ids, year) {
  if (!ids || !ids.size) return null;
  const by = new Map();
  (Array.isArray(rows) ? rows : []).forEach(function (r) {
    if (!r || Number(r.season) !== year || typeof r.team !== "string") return;
    const v = Number(r.statValue);
    if (!Number.isFinite(v)) return;
    if (!by.has(r.team)) by.set(r.team, {});
    by.get(r.team)[r.statName] = v;
  });
  const values = { passOffense: new Map(), turnoverMargin: new Map() };
  ids.forEach(function (id, school) {
    const s = id && by.get(school);
    if (!s || !(s.games > 0)) return;
    if (Number.isFinite(s.netPassingYards)) values.passOffense.set(id, s.netPassingYards / s.games);
    if (Number.isFinite(s.turnovers) && Number.isFinite(s.turnoversOpponent)) values.turnoverMargin.set(id, s.turnoversOpponent - s.turnovers);
  });
  const named = Array.from(ids.values()).filter(Boolean).length;
  const out = {};
  for (const k of RANKED) {
    const m = values[k];
    if (m.size < 0.9 * named) return null;
    const all = Array.from(m.values());
    m.forEach(function (v, id) {
      let better = 0, same = 0;
      all.forEach(function (x) { if (x > v) better++; else if (x === v) same++; });
      (out[id] = out[id] || {})[k] = { rank: better + 1, tied: same > 1 };
    });
  }
  return { teams: named, ranks: out };
}

async function cfbdRanks(url, env, origin, ctx) {
  const year = Number(url.searchParams.get("year"));
  if (!(year >= 2000 && year <= 2100)) return fail(400, "year is required", origin);
  if (!spYearOk(year, env)) return fail(400, "only this season or last", origin);
  if (!env.CFBD_API_KEY) return fail(503, "CFBD is not configured", origin);

  const cache = env.CACHE || caches.default;
  const key = new Request("https://edge.cache/v1/cfbd/ranks?year=" + year + "&r=" + RANKED.join(","));
  const heldBody = await held(cache, key);
  if (heldBody && Date.now() - Date.parse(heldBody.fetchedAt) < FRESH_SECONDS * 1000) return json(heldBody, 200, origin);

  const rows = await cfbdJson("/stats/season?year=" + year, env);
  const ids = Array.isArray(rows) ? await fbsIds(year, env, cache, ctx) : null;
  const ranked = ids ? fbsRanks(rows, ids, year) : null;
  if (!ranked) {
    if (heldBody) return json(Object.assign({}, heldBody, { stale: true }), 200, origin);
    return fail(502, "CFBD could not be reached", origin);
  }
  const body = { source: "cfbd-ranks", year: year, fetchedAt: new Date().toISOString(), teams: ranked.teams, ranks: ranked.ranks };
  await keep(cache, key, body, KEEP_SECONDS, ctx);
  return json(body, 200, origin);
}

// The refresh clock. Starts the data refresh through GitHub's API with a
// fine-grained token that can do only that (REFRESH_CLOCK_TOKEN, Actions
// read/write on this repository). Never throws: a failed start is logged and
// the next tick tries again; the freshness monitor reports a stalled clock.
export const CLOCK = { repo: "dmvanblaircom/Project-LND", workflow: "odds.yml" };

export async function startRefresh(env) {
  if (!env.REFRESH_CLOCK_TOKEN) { console.log("clock: no REFRESH_CLOCK_TOKEN set; nothing started"); return "no-token"; }
  const url = "https://api.github.com/repos/" + CLOCK.repo + "/actions/workflows/" + CLOCK.workflow + "/dispatches";
  try {
    const r = await (env.FETCH || fetch)(url, { method: "POST", headers: {
      "authorization": "Bearer " + env.REFRESH_CLOCK_TOKEN,
      "accept": "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "user-agent": "suite-api refresh clock",          // GitHub refuses requests without one
      "content-type": "application/json"
    }, body: JSON.stringify({ ref: "main", inputs: { source: "clock" } }) });
    if (r.status === 204) { console.log("clock: refresh started"); return "started"; }
    // 401: wrong or expired token; 403/404: a token without Actions write here
    console.log("clock: GitHub answered " + r.status + "; the refresh was not started");
    return "refused-" + r.status;
  } catch (e) {
    console.log("clock: GitHub could not be reached");
    return "unreachable";
  }
}

// W19 Phase 0 (David approved, 2026-10-01): notifications would detect
// scores here, so first find out whether ESPN answers Cloudflare's network
// at all, and how fast - Kalshi rate-limits it (decision 0030). Read-only:
// it reports the HTTP status, the time taken, how many games the scoreboard
// listed and which Cloudflare location asked. No ESPN data passes through,
// nothing is stored, and no fan's request ever reaches it.
export const PROBE = { espn: "https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?groups=80&limit=400" };

export async function probeEspn(env, colo) {
  const t0 = Date.now(), at = new Date().toISOString();
  try {
    const r = await (env.FETCH || fetch)(PROBE.espn, { headers: { accept: "application/json" } });
    let events = null;
    if (r.ok) { try { const d = await r.json(); events = Array.isArray(d && d.events) ? d.events.length : null; } catch (e) { events = null; } }
    return { source: "probe", target: "espn-scoreboard", at, status: r.status, ms: Date.now() - t0, events, colo: colo || null };
  } catch (e) {
    return { source: "probe", target: "espn-scoreboard", at, status: 0, ms: Date.now() - t0, events: null, colo: colo || null,
             error: "unreachable" };
  }
}

// Game alerts live in one Durable Object (./push.js); this asks it.
function alerts(env) {
  return env && env.ALERTS ? env.ALERTS.get(env.ALERTS.idFromName("alerts")) : null;
}

async function pushRoute(op, request, env, origin) {
  const stub = alerts(env);
  if (!stub) return fail(503, "game alerts are not configured", origin);
  let body;
  if (request.method === "POST") {
    // Only the app may sign a browser up, and a subscription is small.
    if (ORIGINS.indexOf(origin) < 0) return fail(403, "not from Suite", origin);
    const text = await request.text();
    if (text.length > 4096) return fail(413, "too large", origin);
    body = text;
  }
  const r = await stub.fetch("https://alerts/" + op, request.method === "POST" ? { method: "POST", body } : {});
  return json(await r.json(), r.status, origin, { "cache-control": "no-store" });
}

export default {
  async scheduled(event, env, ctx) {
    let done;
    if (event && event.cron === ALERTS_CRON) {
      const stub = alerts(env);
      done = stub ? stub.fetch("https://alerts/tick", { method: "POST" })
                      .then(function (r) { return r.json(); })
                      .then(function (b) { if (b.log && b.log.length) console.log("alerts: " + b.log.join("; ")); })
                      .catch(function () { console.log("alerts: the tick failed"); })
                  : Promise.resolve();
    } else done = Promise.all([startRefresh(env || {}), spClock(env || {}, ctx)]).then(function (r) { return r[0]; });
    if (ctx && ctx.waitUntil) ctx.waitUntil(done); else await done;
  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url), origin = request.headers.get("origin");
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: Object.assign(cors(origin), {
        "access-control-allow-methods": "GET, POST", "access-control-allow-headers": "content-type",
        "access-control-max-age": "86400" }) });
    }
    if (url.pathname === "/v1/push/key" && request.method === "GET") return pushRoute("key", request, env, origin);
    if (url.pathname === "/v1/push/status" && request.method === "GET") return pushRoute("status", request, env, origin);
    if (url.pathname === "/v1/push/subscribe" && request.method === "POST") return pushRoute("subscribe", request, env, origin);
    if (url.pathname === "/v1/push/unsubscribe" && request.method === "POST") return pushRoute("unsubscribe", request, env, origin);
    if (request.method !== "GET") return fail(405, "GET only", origin);
    // `clock` says only whether the refresh clock has its token - never the token.
    if (url.pathname === "/v1/health") return json({ ok: true, version: VERSION, clock: !!(env && env.REFRESH_CLOCK_TOKEN) },
                                                   200, origin, { "cache-control": "no-store" });
    if (url.pathname === "/v1/cfbd/season") return cfbdSeason(url, env || {}, origin, ctx);
    if (url.pathname === "/v1/cfbd/sp") return cfbdSp(url, env || {}, origin, ctx);
    if (url.pathname === "/v1/cfbd/ranks") return cfbdRanks(url, env || {}, origin, ctx);
    if (url.pathname === "/v1/cfbd/sp/week") return cfbdSpWeek(url, env || {}, origin);
    if (url.pathname === "/v1/probe/espn") return json(await probeEspn(env || {}, request.cf && request.cf.colo), 200, origin,
                                                       { "cache-control": "no-store" });
    return fail(404, "no such route", origin);
  }
};
