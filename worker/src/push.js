/* Game alerts (W19, notifications brief, approved by David 2026-10-01):
   kickoff and final for the fan's team, by Web Push to the installed Suite.

     POST /v1/push/subscribe     { subscription, team: { id, name } }
     POST /v1/push/unsubscribe   { endpoint, team: { id } }
     GET  /v1/push/key           the VAPID public key the app subscribes with
     GET  /v1/push/status        counts, watched games, events sent, the last
                                 minute's log - nothing about any fan

   Every minute (wrangler.toml) the Worker looks at the games of the teams
   someone follows. Outside a game's window it asks ESPN nothing: the team's
   schedule is read at most hourly, and a game's status and scores (ESPN's
   core API, a few hundred bytes each) only from 20 minutes before kickoff
   until the final is sent.

   Storage is one Durable Object with SQLite (the brief named D1; the same
   SQLite, but created by the deploy itself, so the Workers-only API token
   needs no new permission). It holds the subscriptions, the events already
   sent, each team's watched game, and the VAPID key pair - generated on
   first use and never leaving Cloudflare, unless VAPID_PRIVATE_JWK is set.

   Correctness (brief §4): one push per event, ever (the event's key is
   recorded before anything is sent, so overlapping runs cannot both send);
   a kickoff first noticed after the first quarter is recorded, not sent;
   the final is sent only on ESPN's final status, and without numbers if
   ESPN gives none; a postponed or canceled game gets one push saying so.
   Score changes (opt-in in the brief) are not in this first slice.

   The wording uses the name the app sent from its team config and ESPN's
   place name for the opponent - never a provider's sentence. */

const CORE = "https://sports.core.api.espn.com/v2/sports/football/leagues/college-football";
const SITE = "https://site.api.espn.com/apis/site/v2/sports/football/college-football";
export const APP_URL = "https://dmvanblaircom.github.io/Project-LND/";
const MIN = 60 * 1000;
export const LIMITS = { subscriptions: 5000, scheduleEvery: 60 * MIN, before: 20 * MIN, window: 8 * 60 * MIN };

// Only the browsers' own push services: the Worker is never a relay to an
// arbitrary address.
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /^web\.push\.apple\.com$/,
                    /\.notify\.windows\.com$/, /^android\.googleapis\.com$/];

// ---- small helpers ---------------------------------------------------------

const enc = new TextEncoder();
export function b64u(bytes) {
  let s = ""; const b = new Uint8Array(bytes);
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function unb64u(str) {
  const s = atob(String(str).replace(/-/g, "+").replace(/_/g, "/") + "===".slice((String(str).length + 3) % 4));
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}
function concat() {
  let n = 0; for (const a of arguments) n += a.length;
  const out = new Uint8Array(n); let o = 0;
  for (const a of arguments) { out.set(a, o); o += a.length; }
  return out;
}
async function hkdf(salt, ikm, info, bytes) {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, bytes * 8));
}

// ---- Web Push: RFC 8291 (aes128gcm) and RFC 8292 (VAPID) ---------------------

export async function newVapid() {
  const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  return crypto.subtle.exportKey("jwk", kp.privateKey);
}
export function vapidPublic(jwk) {
  return b64u(concat(new Uint8Array([4]), unb64u(jwk.x), unb64u(jwk.y)));
}

export async function vapidHeader(endpoint, jwk, now) {
  const head = b64u(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const body = b64u(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin,
                                                exp: Math.floor(now / 1000) + 12 * 3600, sub: APP_URL })));
  const key = await crypto.subtle.importKey("jwk", { kty: "EC", crv: "P-256", x: jwk.x, y: jwk.y, d: jwk.d },
                                            { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(head + "." + body));
  return "vapid t=" + head + "." + body + "." + b64u(sig) + ", k=" + vapidPublic(jwk);
}

// The message body, encrypted for one browser (aes128gcm, one record).
export async function encryptFor(sub, text, salt) {
  const uaPublic = unb64u(sub.p256dh), authSecret = unb64u(sub.auth);
  const local = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", local.publicKey));
  const peer = await crypto.subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: peer }, local.privateKey, 256));
  const ikm = await hkdf(authSecret, shared, concat(enc.encode("WebPush: info\0"), uaPublic, asPublic), 32);
  salt = salt || crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);
  const aes = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aes,
                                                            concat(enc.encode(text), new Uint8Array([2]))));
  const rs = new Uint8Array([0, 0, 16, 0]);                 // record size 4096
  return concat(salt, rs, new Uint8Array([asPublic.length]), asPublic, sealed);
}

// One push. Returns the push service's status; 0 when it could not be reached.
export async function sendPush(env, jwk, sub, message, now) {
  try {
    const body = await encryptFor(sub, JSON.stringify(message));
    const r = await (env.FETCH || fetch)(sub.endpoint, { method: "POST", body, headers: {
      "authorization": await vapidHeader(sub.endpoint, jwk, now),
      "content-encoding": "aes128gcm", "content-type": "application/octet-stream",
      "ttl": "3600", "urgency": "high" } });
    return r.status;
  } catch (e) { return 0; }
}

// ---- what a subscription may be --------------------------------------------

export function validSubscription(s) {
  if (!s || typeof s.endpoint !== "string" || s.endpoint.length > 1000 || !s.keys) return null;
  let u; try { u = new URL(s.endpoint); } catch (e) { return null; }
  if (u.protocol !== "https:" || !PUSH_HOSTS.some(function (re) { return re.test(u.hostname); })) return null;
  const p = String(s.keys.p256dh || ""), a = String(s.keys.auth || "");
  if (!/^[A-Za-z0-9_-]{80,100}$/.test(p) || !/^[A-Za-z0-9_-]{16,32}$/.test(a)) return null;
  return { endpoint: s.endpoint, p256dh: p, auth: a };
}
export function validTeam(t) {
  if (!t || !/^\d{1,6}$/.test(String(t.id || ""))) return null;
  const name = String(t.name || "").trim();
  if (!/^[A-Za-z0-9 .&'()À-ſ-]{2,40}$/.test(name)) return null;
  return { id: String(t.id), name };
}

// ---- the game: what ESPN says, and what is due ------------------------------

// The team's game to watch from its schedule: one still to finish, the
// nearest first; a finished one only within its window (so a final noticed
// late is still sent). null when the season has none left.
export function pickGame(schedule, teamId, now) {
  const events = (schedule && schedule.events) || [];
  let best = null;
  for (const e of events) {
    const c = e && e.competitions && e.competitions[0]; if (!c) continue;
    const at = Date.parse(e.date); if (!isFinite(at)) continue;
    const st = (((c.status || {}).type) || {}).state;
    if (st === "post" && now - at > LIMITS.window) continue;
    if (st !== "post" && now - at > LIMITS.window) continue;     // stuck in "pre" long after: not ours to watch
    const us = (c.competitors || []).filter(function (x) { return String((x.team || {}).id) === teamId; })[0];
    const them = (c.competitors || []).filter(function (x) { return String((x.team || {}).id) !== teamId; })[0];
    if (!us || !them) continue;
    const g = { id: String(e.id), comp: String(c.id || e.id), at, home: us.homeAway === "home",
                opponent: { id: String((them.team || {}).id || ""), name: (them.team || {}).location || (them.team || {}).shortDisplayName || "" } };
    if (!best || at < best.at) best = g;
  }
  return best;
}

// From the game's status (and, when final, the scores) to the events due.
// `sent` is the set of event names already recorded for this game.
export function due(game, status, sent) {
  const t = (status && status.type) || {}, name = t.name || "", out = [];
  if (/POSTPONED/.test(name) && !sent.has("postponed")) out.push({ event: "postponed" });
  else if (/CANCELED|CANCELLED/.test(name) && !sent.has("canceled")) out.push({ event: "canceled" });
  if (t.state === "in" || t.state === "post") {
    if (!sent.has("kickoff")) out.push({ event: "kickoff", late: !(status.period <= 1) || t.state === "post" });
  }
  if (t.state === "post" && t.completed && !sent.has("final")) out.push({ event: "final" });
  return out;
}

export function words(ev, team, game, scores) {
  const vs = game.home ? " vs. " : " at ";
  const matchup = team.name + vs + game.opponent.name;
  if (ev === "kickoff") return { title: team.name, body: matchup + " has kicked off." };
  if (ev === "final") {
    const us = scores && scores.us, them = scores && scores.them;
    const body = typeof us === "number" && typeof them === "number"
      ? "Final: " + team.name + " " + us + ", " + game.opponent.name + " " + them + "."
      : "Final: " + matchup + ".";
    return { title: team.name, body };
  }
  if (ev === "postponed") return { title: team.name, body: matchup + " has been postponed." };
  if (ev === "canceled") return { title: team.name, body: matchup + " has been canceled." };
  return null;
}

// ---- the store (a Durable Object's SQLite; tests pass node:sqlite) ----------

export function migrate(db) {
  db.exec("CREATE TABLE IF NOT EXISTS subs (endpoint TEXT NOT NULL, team_id TEXT NOT NULL, team_name TEXT NOT NULL," +
          " p256dh TEXT NOT NULL, auth TEXT NOT NULL, created INTEGER NOT NULL, PRIMARY KEY (endpoint, team_id))");
  db.exec("CREATE TABLE IF NOT EXISTS sent (game_id TEXT NOT NULL, event TEXT NOT NULL, at INTEGER NOT NULL, PRIMARY KEY (game_id, event))");
  db.exec("CREATE TABLE IF NOT EXISTS games (team_id TEXT PRIMARY KEY, game TEXT, checked INTEGER NOT NULL)");
  db.exec("CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL)");
}

export async function vapidKey(db, env) {
  if (env.VAPID_PRIVATE_JWK) return JSON.parse(env.VAPID_PRIVATE_JWK);
  const row = db.all("SELECT v FROM meta WHERE k = 'vapid'")[0];
  if (row) return JSON.parse(row.v);
  const jwk = await newVapid();
  db.run("INSERT OR IGNORE INTO meta (k, v) VALUES ('vapid', ?)", JSON.stringify(jwk));
  return JSON.parse(db.all("SELECT v FROM meta WHERE k = 'vapid'")[0].v);
}

export async function subscribe(db, env, body, now) {
  const sub = validSubscription(body && body.subscription), team = validTeam(body && body.team);
  if (!sub || !team) return { status: 400, body: { error: "a push subscription and a team are required" } };
  const count = db.all("SELECT COUNT(*) AS n FROM subs")[0].n;
  const had = db.all("SELECT 1 FROM subs WHERE endpoint = ? AND team_id = ?", sub.endpoint, team.id).length > 0;
  if (!had && count >= LIMITS.subscriptions) return { status: 503, body: { error: "alerts are full for now" } };
  db.run("INSERT INTO subs (endpoint, team_id, team_name, p256dh, auth, created) VALUES (?, ?, ?, ?, ?, ?)" +
         " ON CONFLICT (endpoint, team_id) DO UPDATE SET team_name = excluded.team_name, p256dh = excluded.p256dh, auth = excluded.auth",
         sub.endpoint, team.id, team.name, sub.p256dh, sub.auth, now);
  // A confirmation, so the fan knows at once that alerts reach this device.
  const status = await sendPush(env, await vapidKey(db, env), sub,
    { title: team.name, body: "Game alerts are on: kickoff and final.", url: APP_URL, tag: "alerts-on-" + team.id }, now);
  if (status === 404 || status === 410) {
    db.run("DELETE FROM subs WHERE endpoint = ?", sub.endpoint);
    return { status: 410, body: { error: "the push service no longer accepts this subscription" } };
  }
  return { status: 200, body: { ok: true, team: team.id, confirmation: status >= 200 && status < 300 ? "sent" : "failed" } };
}

export function unsubscribe(db, body) {
  const endpoint = body && typeof body.endpoint === "string" ? body.endpoint : "";
  const team = body && body.team && /^\d{1,6}$/.test(String(body.team.id || "")) ? String(body.team.id) : null;
  if (!endpoint) return { status: 400, body: { error: "endpoint is required" } };
  if (team) db.run("DELETE FROM subs WHERE endpoint = ? AND team_id = ?", endpoint, team);
  else db.run("DELETE FROM subs WHERE endpoint = ?", endpoint);
  return { status: 200, body: { ok: true } };
}

// A score as ESPN gives it: {value} from the core API, {value} or a string
// from the site API's schedule. null when there is none.
export function scoreOf(x) {
  const v = x && typeof x === "object" ? x.value : x;
  const n = typeof v === "number" ? v : (typeof v === "string" && /^\d+$/.test(v) ? Number(v) : NaN);
  return isFinite(n) ? Math.round(n) : null;
}

// One game from a team's schedule (site API): its status and each side's score.
export function scheduleGame(schedule, id) {
  const e = ((schedule && schedule.events) || []).filter(function (x) { return String(x.id) === String(id); })[0];
  const c = e && e.competitions && e.competitions[0];
  if (!c || !c.status) return null;
  const scores = {};
  (c.competitors || []).forEach(function (x) { scores[String((x.team || {}).id)] = x.score; });
  return { status: c.status, scores };
}

async function getJson(env, url) {
  try {
    const r = await (env.FETCH || fetch)(url, { headers: { accept: "application/json" } });
    return r.ok ? await r.json() : null;
  } catch (e) { return null; }
}

// One minute's work. Returns what it did, for the log and the tests.
export async function tick(db, env, now) {
  const log = [];
  const teams = db.all("SELECT team_id, MIN(team_name) AS team_name FROM subs GROUP BY team_id");
  for (const t of teams) {
    const team = { id: t.team_id, name: t.team_name };
    let row = db.all("SELECT game, checked FROM games WHERE team_id = ?", team.id)[0];
    let game = row && row.game ? JSON.parse(row.game) : null;
    const stale = !row || now - row.checked > LIMITS.scheduleEvery || (game && now - game.at > LIMITS.window);
    if (stale) {
      const schedule = await getJson(env, SITE + "/teams/" + team.id + "/schedule");
      if (schedule) {
        game = pickGame(schedule, team.id, now);
        db.run("INSERT INTO games (team_id, game, checked) VALUES (?, ?, ?) ON CONFLICT (team_id) DO UPDATE SET game = excluded.game, checked = excluded.checked",
               team.id, game ? JSON.stringify(game) : null, now);
      }
    }
    if (!game) { log.push(team.id + ": no game"); continue; }
    if (now < game.at - LIMITS.before) { log.push(team.id + ": waiting for " + new Date(game.at).toISOString()); continue; }
    const sent = new Set(db.all("SELECT event FROM sent WHERE game_id = ?", game.id).map(function (r) { return r.event; }));
    if (sent.has("final") || sent.has("canceled")) { log.push(team.id + ": done"); continue; }
    // ESPN's core API first (a few hundred bytes); if it does not answer this
    // network, the same status from the team's schedule on the site API,
    // which the Phase 0 probe showed does.
    let status = await getJson(env, CORE + "/events/" + game.id + "/competitions/" + game.comp + "/status"), fromSchedule = null;
    if (!status) {
      fromSchedule = scheduleGame(await getJson(env, SITE + "/teams/" + team.id + "/schedule"), game.id);
      status = fromSchedule && fromSchedule.status;
      if (status) log.push(team.id + ": status from the schedule");
    }
    if (!status) { log.push(team.id + ": status unavailable"); continue; }
    for (const d of due(game, status, sent)) {
      // Record first: if two runs overlap, only the one that recorded sends.
      const got = db.run("INSERT OR IGNORE INTO sent (game_id, event, at) VALUES (?, ?, ?)", game.id, d.event, now);
      if (!got.changes) continue;
      if (d.late) { log.push(team.id + ": " + d.event + " noticed late, not sent"); continue; }
      let scores = null;
      if (d.event === "final") {
        const base = CORE + "/events/" + game.id + "/competitions/" + game.comp + "/competitors/";
        const us = await getJson(env, base + team.id + "/score"), them = await getJson(env, base + game.opponent.id + "/score");
        scores = { us: scoreOf(us), them: scoreOf(them) };
        if (scores.us == null || scores.them == null) {
          const sg = fromSchedule || scheduleGame(await getJson(env, SITE + "/teams/" + team.id + "/schedule"), game.id);
          if (sg) scores = { us: scoreOf(sg.scores[team.id]), them: scoreOf(sg.scores[game.opponent.id]) };
        }
      }
      const w = words(d.event, team, game, scores);
      const message = { title: w.title, body: w.body, url: APP_URL + "#game", tag: game.id + "-" + d.event };
      const subs = db.all("SELECT endpoint, p256dh, auth FROM subs WHERE team_id = ?", team.id);
      const jwk = await vapidKey(db, env);
      let ok = 0, gone = 0;
      for (const s of subs) {
        const code = await sendPush(env, jwk, s, message, now);
        if (code >= 200 && code < 300) ok++;
        else if (code === 404 || code === 410) { gone++; db.run("DELETE FROM subs WHERE endpoint = ?", s.endpoint); }
      }
      log.push(team.id + ": " + d.event + " sent to " + ok + " of " + subs.length + (gone ? ", " + gone + " gone" : ""));
    }
  }
  db.run("INSERT INTO meta (k, v) VALUES ('last', ?) ON CONFLICT (k) DO UPDATE SET v = excluded.v",
         JSON.stringify({ at: new Date(now).toISOString(), log }));
  return log;
}

// What the alerts are doing, for watching a game day from outside: counts,
// the watched games, what was sent and the last minute's log. No push
// address, key or anything else about a fan.
export function report(db) {
  const last = db.all("SELECT v FROM meta WHERE k = 'last'")[0];
  return {
    subscriptions: db.all("SELECT team_id AS team, COUNT(*) AS n FROM subs GROUP BY team_id"),
    games: db.all("SELECT team_id AS team, game FROM games").map(function (r) {
      const g = r.game ? JSON.parse(r.game) : null;
      return { team: r.team, game: g && { id: g.id, at: new Date(g.at).toISOString(), opponent: g.opponent.name, home: g.home } };
    }),
    sent: db.all("SELECT game_id AS game, event, at FROM sent ORDER BY at DESC LIMIT 20")
            .map(function (r) { return { game: r.game, event: r.event, at: new Date(r.at).toISOString() }; }),
    last: last ? JSON.parse(last.v) : null
  };
}

// ---- the Durable Object -----------------------------------------------------

// state.storage.sql (a SQLite-backed Durable Object) as the small interface
// the functions above use, which node:sqlite also provides in the tests.
function sqlite(sql) {
  return {
    exec: function (q) { sql.exec(q); },
    all: function (q) { return sql.exec.apply(sql, arguments).toArray(); },
    run: function () { const c = sql.exec.apply(sql, arguments); c.toArray(); return { changes: c.rowsWritten }; }
  };
}

export class Alerts {
  constructor(state, env) {
    this.env = env || {};
    this.db = sqlite(state.storage.sql);
    migrate(this.db);
  }
  async fetch(request) {
    const op = new URL(request.url).pathname.slice(1), now = Date.now();
    let out;
    if (op === "tick") out = { status: 200, body: { log: await tick(this.db, this.env, now) } };
    else if (op === "status") out = { status: 200, body: report(this.db) };
    else if (op === "key") out = { status: 200, body: { key: vapidPublic(await vapidKey(this.db, this.env)) } };
    else if (op === "subscribe") out = await subscribe(this.db, this.env, await request.json(), now);
    else if (op === "unsubscribe") out = unsubscribe(this.db, await request.json());
    else out = { status: 404, body: { error: "no such operation" } };
    return new Response(JSON.stringify(out.body), { status: out.status, headers: { "content-type": "application/json" } });
  }
}
