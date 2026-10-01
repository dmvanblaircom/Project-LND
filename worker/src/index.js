/* Suite's edge API (decision 0030): our own small API on Cloudflare Workers.

   Suite calls this, never a backend provider directly. It holds provider
   keys as Worker secrets, fetches server-side, caches, and returns only what
   a screen shows - never a provider's raw payload, and nothing published as
   a file (CollegeFootballData's condition, decision 0012).

   Routes
     GET /v1/health                         liveness and version
     GET /v1/cfbd/season?team=&year=        CFBD season stats for one team,
                                            only the fields in CFBD_FIELDS

   Scheduled (wrangler.toml [triggers]): the data refresh clock. Every 30
   minutes it starts the repository's "Refresh team data" workflow with
   source=clock - the job cron-job.org was meant to do (W02, decision 0030).
   GitHub's own scheduler runs that workflow only every few hours.

   Every answer is JSON with `source`, `fetchedAt` and, when it is a cached
   copy served because the provider failed, `stale: true`. Errors say what
   failed without passing the provider's body through.

   No dependencies: Workers' standard fetch, Request, Response and Cache. */

export const VERSION = "edge-2026-10-01c";

const ORIGINS = ["https://dmvanblaircom.github.io"];
const CFBD = "https://api.collegefootballdata.com";
const FRESH_SECONDS = 6 * 3600;        // season stats move once a week
const KEEP_SECONDS = 7 * 24 * 3600;    // a stale copy may stand in for a week

// The CFBD stat names a screen may show, read from a real response by the
// CFBD probe (2026-10-01, tools/cfbd_probe.py): the Matchup card's rushing
// and passing yards allowed per game (W15) - season totals the opponents
// gained, and the games they came from. Nothing else leaves CFBD.
export const CFBD_FIELDS = ["games", "rushingYardsOpponent", "netPassingYardsOpponent"];

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

export default {
  async scheduled(event, env, ctx) {
    const done = startRefresh(env || {});
    if (ctx && ctx.waitUntil) ctx.waitUntil(done); else await done;
  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url), origin = request.headers.get("origin");
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: Object.assign(cors(origin), {
        "access-control-allow-methods": "GET", "access-control-max-age": "86400" }) });
    }
    if (request.method !== "GET") return fail(405, "GET only", origin);
    // `clock` says only whether the refresh clock has its token - never the token.
    if (url.pathname === "/v1/health") return json({ ok: true, version: VERSION, clock: !!(env && env.REFRESH_CLOCK_TOKEN) },
                                                   200, origin, { "cache-control": "no-store" });
    if (url.pathname === "/v1/cfbd/season") return cfbdSeason(url, env || {}, origin, ctx);
    return fail(404, "no such route", origin);
  }
};
