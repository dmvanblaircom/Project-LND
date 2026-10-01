#!/usr/bin/env node
/* Suite's edge API (worker/src/index.js, decision 0030), run in Node with
   a stand-in cache and a stand-in CFBD - no network, no key.

   It answers only what a screen shows, holds the key server-side, speaks
   only to Suite's origin, serves a cached copy (marked stale) when CFBD
   fails, and never passes CFBD's raw payload or errors through.

   Usage: node tools/workercheck.mjs      (exit 1 on any failure) */
import worker, { pickSeason, VERSION, CFBD_FIELDS } from "../worker/src/index.js";

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
  return { calls, CACHE: opts.cache || memoryCache(), FIELDS, CFBD_API_KEY: "key" in opts ? opts.key : "test-key",
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
  ok(r.status === 200 && body.ok === true && body.version === VERSION, "answers with its version"); }

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

console.log("bad requests");
{ const e = env();
  ok((await get("/v1/cfbd/season?year=2026", e)).r.status === 400, "no team: 400");
  ok((await get("/v1/cfbd/season?team=%3Cscript%3E&year=2026", e)).r.status === 400, "a team that is not a name: 400");
  ok((await get("/v1/cfbd/season?team=Notre%20Dame", e)).r.status === 400, "no year: 400");
  ok(e.calls.length === 0, "none of them reaches CFBD");
  ok((await get("/v1/cfbd/season?team=Notre%20Dame&year=2026", env({ key: "" }))).r.status === 503, "no key configured: 503, not a crash");
  ok((await get("/nope", e)).r.status === 404, "an unknown route: 404");
  const post = await worker.fetch(new Request("https://suite-api.example/v1/health", { method: "POST" }), e, null);
  ok(post.status === 405, "anything but GET: 405");
  const pre = await worker.fetch(new Request("https://suite-api.example/v1/cfbd/season", { method: "OPTIONS", headers: { origin: SITE } }), e, null);
  ok(pre.status === 204 && pre.headers.get("access-control-allow-origin") === SITE, "the browser's preflight is answered for Suite"); }

console.log("\n" + (failures ? failures + " check(s) FAILED" : "the edge API answers only what a screen shows"));
process.exit(failures ? 1 : 0);
