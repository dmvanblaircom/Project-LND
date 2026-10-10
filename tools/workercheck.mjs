#!/usr/bin/env node
/* Suite's edge API (worker/src/index.js, decision 0030), run in Node with
   a stand-in cache and a stand-in CFBD - no network, no key.

   It answers only what a screen shows, holds the key server-side, speaks
   only to Suite's origin, serves a cached copy (marked stale) when CFBD
   fails, and never passes CFBD's raw payload or errors through.

   Usage: node tools/workercheck.mjs      (exit 1 on any failure) */
import worker, { pickSeason, VERSION, CFBD_FIELDS, startRefresh, CLOCK, probeEspn, PROBE , ALERTS_CRON, Alerts } from "../worker/src/index.js";
import { validSubscription, validTeam, subscribe, unsubscribe, tick, migrate, vapidKey, b64u, unb64u, APP_URL, report, validOptions, scoreStep, DEFAULTS } from "../worker/src/push.js";
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
  eq([k.title, k.body, k.url, k.tag], ["Ohio State", "Ohio State at Iowa has kicked off.", APP_URL + "#game", GAME + "-kickoff"], "kickoff, once, in the team's own words");
  await tick(db, e, KICK + 3 * 60e3); await tick(db, e, KICK + 40 * 60e3);
  ok(e.pushes.length === 1, "never twice, however many minutes pass");
  e.status = st("post", 4, "STATUS_FINAL", true); e.scores = { 194: 31, 2294: 17 };
  await tick(db, e, KICK + 3.4 * 3600e3);
  const f = e.pushes.length === 2 ? await openPush(e.pushes[1].init.body, b.kp, b.sub.keys.auth) : {};
  eq(f.body, "Final: Ohio State 31, Iowa 17.", "the final, with ESPN's score for each side");
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
  eq(f.body, "Final: Ohio State at Iowa.", "a final ESPN gives no score for: no numbers, never 0-0"); }
{ const db = dbOf(), e = alertEnv({ status: st("pre", 0, "STATUS_POSTPONED") }), b = await browserSub();
  await subscribe(db, e, { subscription: b.sub, team: { id: "194", name: "Ohio State" } }, KICK); e.pushes.length = 0;
  await tick(db, e, KICK - 5 * 60e3); await tick(db, e, KICK);
  const p = e.pushes.length === 1 ? await openPush(e.pushes[0].init.body, b.kp, b.sub.keys.auth) : {};
  eq([e.pushes.length, p.body], [1, "Ohio State at Iowa has been postponed."], "postponed: one push saying so, and no kickoff"); }
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
  ok(/status from the schedule/.test(log.join(" ")) && f.body === "Final: Ohio State 38, Iowa 10.", "core API refused: the schedule's status and score stand in = " + f.body);
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
  for (const p of e.pushes) got[p.url === osu.sub.endpoint ? "osu" : "iowa"] = (await openPush(p.init.body, p.url === osu.sub.endpoint ? osu.kp : iowa.kp,
                                                       p.url === osu.sub.endpoint ? osu.sub.keys.auth : iowa.sub.keys.auth)).body;
  eq([got.osu, got.iowa], ["Ohio State at Iowa has kicked off.", "Iowa vs. Ohio State has kicked off."], "Ohio State at Iowa, both followed: each side hears it in its own words"); }
{ // A sign-up cannot put its own words in other followers' alerts.
  const db = dbOf(), e = alertEnv({ status: st("in", 1, "STATUS_IN_PROGRESS") }), fan = await browserSub(), prank = await browserSub("fcm.googleapis.com");
  await subscribe(db, e, { subscription: fan.sub, team: { id: "194", name: "Ohio State" } }, KICK);
  await subscribe(db, e, { subscription: prank.sub, team: { id: "194", name: "AA" } }, KICK); e.pushes.length = 0;
  await tick(db, e, KICK + 60e3);
  const mine = e.pushes.filter((p) => p.url === fan.sub.endpoint)[0];
  const m = mine ? await openPush(mine.init.body, fan.kp, fan.sub.keys.auth) : {};
  eq([m.title, m.body], ["Ohio State", "Ohio State at Iowa has kicked off."], "another sign-up's team name never reaches this fan's alert"); }

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
      heard[who].push(m.body + (m.renotify ? " [card " + m.tag.replace(/^\d+-/, "") + "]" : ""));
    }
  }
  const P = "STATUS_IN_PROGRESS";
  await at(1, 1, P, 900, 0, 0);                 // kickoff
  await at(4, 1, P, 726, 3, 0);                 // field goal (12:06) ...
  await at(5, 1, P, 700, 3, 0);                 // ... held a minute: announced
  await at(14, 1, P, 271, 9, 0);                // touchdown (4:31) ...
  await at(15, 1, P, 260, 10, 0);               // ... and its extra point the next minute
  await at(16, 1, P, 250, 10, 0);               // one alert: Touchdown, 10-0
  await at(24, 1, "STATUS_END_PERIOD", 0, 10, 0);
  await at(30, 2, P, 605, 10, 3);               // Iowa field goal (10:05)
  await at(31, 2, P, 600, 10, 3);
  await at(40, 2, P, 286, 16, 3);               // touchdown (4:46) announced at 16 ...
  await at(41, 2, P, 280, 16, 3);
  await at(43, 2, P, 270, 17, 3);               // ... its extra point two minutes on: folded in
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
    "Ohio State at Iowa has kicked off.",
    "Field goal, Ohio State. Ohio State 3, Iowa 0 · 1st 11:40 [card live]",
    "Touchdown, Ohio State. Ohio State 10, Iowa 0 · 1st 4:10 [card live]",
    "End of 1st: Ohio State 10, Iowa 0 [card live]",
    "Field goal, Iowa. Ohio State 10, Iowa 3 · 2nd 10:00 [card live]",
    "Touchdown, Ohio State. Ohio State 16, Iowa 3 · 2nd 4:40 [card live]",
    "Touchdown, Iowa. Ohio State 17, Iowa 9 · 2nd 3:10 [card live]",
    "Score corrected: Ohio State 17, Iowa 3 · 2nd 2:30 [card live]",
    "Halftime: Ohio State 17, Iowa 3 [card live]",
    "Field goal, Ohio State. Ohio State 20, Iowa 3 · 3rd 0:55 [card live]",
    "End of 3rd: Ohio State 20, Iowa 3 [card live]",
    "Iowa scores. Ohio State 20, Iowa 13 · 4th 4:35 [card live]",
    "One-score game: Ohio State 20, Iowa 13 · 4th 4:35",
    "Touchdown, Iowa. Ohio State 20, Iowa 20 · 4th 0:20 [card live]",
    "Overtime: Ohio State 20, Iowa 20.",
    "Final: Ohio State 27, Iowa 20."
  ], "Everything: every score once, held a minute so a touchdown and its kick are one; the folded kick silent; the overturned score corrected; the quarters, halftime, a close finish only after the score that made it, overtime and the final");
  eq(heard.mine, [
    "Field goal, Ohio State. Ohio State 3, Iowa 0 · 1st 11:40 [card live]",
    "Touchdown, Ohio State. Ohio State 10, Iowa 0 · 1st 4:10 [card live]",
    "Touchdown, Ohio State. Ohio State 16, Iowa 3 · 2nd 4:40 [card live]",
    "Field goal, Ohio State. Ohio State 20, Iowa 3 · 3rd 0:55 [card live]",
    "Final: Ohio State 27, Iowa 20."
  ], "My team's scores (and the final): only Ohio State's, and no correction of Iowa's");
  eq(heard.half, ["Halftime: Ohio State 17, Iowa 3 [card live]"], "Halftime only: one alert at the half, not two");
  eq(heard.old, ["Ohio State at Iowa has kicked off.", "Final: Ohio State 27, Iowa 20."], "a fan from before round 2: kickoff and final, exactly as Saturday's test expects"); }

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
    for (const p of e.pushes) heard.push((await openPush(p.init.body, b.kp, b.sub.keys.auth)).body);
  };
  await go(-5, "pre", 0, "STATUS_DELAYED", 0, 0); await go(-4, "pre", 0, "STATUS_DELAYED", 0, 0);
  await go(1, "in", 1, "STATUS_IN_PROGRESS", 0, 0); await go(30, "in", 2, "STATUS_IN_PROGRESS", 7, 3); await go(31, "in", 2, "STATUS_DELAYED", 7, 3); await go(32, "in", 2, "STATUS_DELAYED", 7, 3);
  await go(50, "in", 2, "STATUS_IN_PROGRESS", 7, 3); await go(55, "in", 2, "STATUS_DELAYED", 7, 3); await go(56, "in", 2, "STATUS_DELAYED", 7, 3);
  eq(heard, ["Ohio State at Iowa is delayed.", "Ohio State at Iowa has kicked off.", "Delay: Ohio State 7, Iowa 3 · 2nd 9:15", "Delay: Ohio State 7, Iowa 3 · 2nd 9:15"],
     "a new sign-up (delays on by default): a delay before kickoff (no kickoff alert until it starts), and each time play stops, even twice in one quarter (Codex, #116)"); }
{ // A row from before round 2: what it had, and no new kind (Codex, #116).
  const db = dbOf(), e = alertEnv({}), b = await browserSub();
  await subscribe(db, e, { subscription: b.sub, team: { id: "194", name: "Ohio State" } }, KICK);
  db.run("UPDATE subs SET opts = NULL"); e.pushes.length = 0;
  e.status = { period: 2, clock: 555, displayClock: "9:15", type: { state: "in", name: "STATUS_DELAYED" } }; e.scores = { 194: 7, 2294: 3 };
  await tick(db, e, KICK + 30 * 60e3);
  e.status = { period: 2, clock: 555, displayClock: "9:15", type: { state: "post", name: "STATUS_POSTPONED" } };
  await tick(db, e, KICK + 40 * 60e3);
  const got = []; for (const p of e.pushes) got.push((await openPush(p.init.body, b.kp, b.sub.keys.auth)).body);
  eq(got, ["Ohio State at Iowa has been postponed."], "a round-1 fan: no in-game delay alert (a new kind starts off), still told of a postponement"); }
{ // Both sides scored between two looks: a my-team fan still hears it (Codex, #116).
  const db = dbOf(), e = alertEnv({}), b = await browserSub();
  await subscribe(db, e, { subscription: b.sub, team: { id: "194", name: "Ohio State" }, options: { scoring: "mine", kickoff: false } }, KICK); e.pushes.length = 0;
  const s = (us, them) => { e.status = { period: 2, clock: 600, displayClock: "10:00", type: { state: "in", name: "STATUS_IN_PROGRESS" } }; e.scores = { 194: us, 2294: them }; };
  s(7, 7); await tick(db, e, KICK + 30 * 60e3);
  s(14, 10); await tick(db, e, KICK + 31 * 60e3); await tick(db, e, KICK + 32 * 60e3);
  const got = []; for (const p of e.pushes) got.push((await openPush(p.init.body, b.kp, b.sub.keys.auth)).body);
  eq(got, ["Score update. Ohio State 14, Iowa 10 · 2nd 10:00 [live]".replace(" [live]", "")], "both scored at once: My team's scores still gets it"); }

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
  for (const p of e.pushes) seen.push((await openPush(p.init.body, b.kp, b.sub.keys.auth)).body);
  eq([firstTry, seen], [1, ["Field goal, Ohio State. Ohio State 3, Iowa 0 · 1st 0:30", "End of 1st: Ohio State 3, Iowa 0"]],
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
  const got = []; for (const p of e.pushes) got.push((await openPush(p.init.body, mine.kp, mine.sub.keys.auth)).body);
  eq(got, ["Score corrected: Ohio State 0, Iowa 3 · 2nd 10:00"], "our earlier touchdown overturned after their field goal: the fan who got the touchdown gets the correction"); }

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
  for (const p of e.pushes) heard.push((await openPush(p.init.body, mine.kp, mine.sub.keys.auth)).body);
  eq(heard, ["Field goal, Ohio State. Ohio State 3, Iowa 0 · 2nd 10:00"], "a my-team fan still hears the field goal"); }
{ // 14, then 10, then 7: the second correction reaches those told 14 too (Codex, #116).
  const db = dbOf(), e = alertEnv({}), b = await browserSub(), heard = [];
  await subscribe(db, e, { subscription: b.sub, team: { id: "194", name: "Ohio State" }, options: { scoring: "all", kickoff: false } }, KICK);
  const s = (us, them) => { e.status = { period: 2, clock: 600, displayClock: "10:00", type: { state: "in", name: "STATUS_IN_PROGRESS" } }; e.scores = { 194: us, 2294: them }; };
  s(0, 0); await tick(db, e, KICK + 30 * 60e3);
  s(14, 0); await tick(db, e, KICK + 31 * 60e3); await tick(db, e, KICK + 32 * 60e3);
  s(10, 0); await tick(db, e, KICK + 33 * 60e3);
  s(7, 0); await tick(db, e, KICK + 34 * 60e3);
  for (const p of e.pushes) heard.push((await openPush(p.init.body, b.kp, b.sub.keys.auth)).body);
  eq(heard.slice(2), ["Score corrected: Ohio State 10, Iowa 0 · 2nd 10:00", "Score corrected: Ohio State 7, Iowa 0 · 2nd 10:00"], "both corrections reach the fan"); }

{ // 14, then 10 (its push fails), then 7: the fan still hears the last word (Codex, #116).
  const db = dbOf(), e = alertEnv({}), b = await browserSub(), heard = [];
  await subscribe(db, e, { subscription: b.sub, team: { id: "194", name: "Ohio State" }, options: { scoring: "all", kickoff: false } }, KICK); e.pushes.length = 0;
  const s = (us, them) => { e.status = { period: 2, clock: 600, displayClock: "10:00", type: { state: "in", name: "STATUS_IN_PROGRESS" } }; e.scores = { 194: us, 2294: them }; };
  s(0, 0); await tick(db, e, KICK + 30 * 60e3);
  s(14, 0); await tick(db, e, KICK + 31 * 60e3); await tick(db, e, KICK + 32 * 60e3);
  e.push = 503; s(10, 0); await tick(db, e, KICK + 33 * 60e3);
  e.push = 201; s(7, 0); await tick(db, e, KICK + 34 * 60e3);
  for (const p of e.pushes) { try { heard.push((await openPush(p.init.body, b.kp, b.sub.keys.auth)).body); } catch (x) {} }
  ok(heard[heard.length - 1] === "Score corrected: Ohio State 7, Iowa 0 · 2nd 10:00", "the correction that could not go is replaced by the next, to the same fan (" + heard.slice(1).join(" | ") + ")"); }

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

console.log("\n" + (failures ? failures + " check(s) FAILED" : "the edge API answers only what a screen shows"));
process.exit(failures ? 1 : 0);
