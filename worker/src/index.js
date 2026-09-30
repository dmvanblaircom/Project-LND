/* Suite's edge API (decision 0030): our own small API on Cloudflare Workers.

   Suite calls this, never a backend provider directly. It holds provider
   keys as Worker secrets, fetches server-side, caches, and returns only what
   a screen shows - never a provider's raw payload, and nothing published as
   a file (CollegeFootballData's condition, decision 0012).

   Routes
     GET /v1/health                         liveness and version
     GET /v1/cfbd/season?team=&year=        CFBD season stats for one team,
                                            only the fields in CFBD_FIELDS

   Every answer is JSON with `source`, `fetchedAt` and, when it is a cached
   copy served because the provider failed, `stale: true`. Errors say what
   failed without passing the provider's body through.

   No dependencies: Workers' standard fetch, Request, Response and Cache. */

export const VERSION = "edge-2026-09-30a";

const ORIGINS = ["https://dmvanblaircom.github.io"];
const CFBD = "https://api.collegefootballdata.com";
const FRESH_SECONDS = 6 * 3600;        // season stats move once a week
const KEEP_SECONDS = 7 * 24 * 3600;    // a stale copy may stand in for a week

// The CFBD stat names a screen may show. Empty until a real response has
// been read (decision 0012: never design against unverified field names);
// `tools/cfbd_probe.py` prints the names CFBD actually returns.
export const CFBD_FIELDS = [];

const TEAM = /^[A-Za-z0-9 .&'()À-ſ-]{2,40}$/;

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
  if (!env.CFBD_API_KEY) return fail(503, "CFBD is not configured", origin);

  const cache = env.CACHE || caches.default;
  const key = new Request("https://edge.cache/v1/cfbd/season?team=" + encodeURIComponent(team.toLowerCase()) + "&year=" + year);
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
                 stats: pickSeason(rows, team, year, env.FIELDS || CFBD_FIELDS) };
  const put = cache.put(key, new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json", "cache-control": "max-age=" + KEEP_SECONDS } }));
  if (ctx && ctx.waitUntil) ctx.waitUntil(put); else await put;
  return json(body, 200, origin);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url), origin = request.headers.get("origin");
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: Object.assign(cors(origin), {
        "access-control-allow-methods": "GET", "access-control-max-age": "86400" }) });
    }
    if (request.method !== "GET") return fail(405, "GET only", origin);
    if (url.pathname === "/v1/health") return json({ ok: true, version: VERSION }, 200, origin, { "cache-control": "no-store" });
    if (url.pathname === "/v1/cfbd/season") return cfbdSeason(url, env || {}, origin, ctx);
    return fail(404, "no such route", origin);
  }
};
