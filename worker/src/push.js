/* Game alerts (W19, notifications brief, approved by David 2026-10-01;
   round 2, §2b, approved 2026-10-09): the fan's own choice of alerts for
   their team, by Web Push to the installed Suite.

     POST /v1/push/subscribe     { subscription, team: { id, name }, options? }
                                 (again with new options: they replace the old)
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

   Correctness (brief §4): one push per event and follower, ever (the
   event is recorded per team before anything is sent, and each follower's
   copy is claimed before it is sent, so overlapping runs cannot both send;
   a push service that fails for a moment is retried the next minute);
   a kickoff first noticed after the first quarter is recorded, not sent;
   the final is sent only on ESPN's final status, and without numbers if
   ESPN gives none; a postponed or canceled game gets one push saying so.

   Round 2 (§2b): each subscription carries its options (OPTIONS below; a
   subscription from before them has the round-1 set). While a game is on
   the team's score is read each minute too:
   - a score is announced once it holds for a minute, so a touchdown and its
     extra point a minute apart are one alert; an extra point or two-point
     try right after the team's own touchdown is folded in silently;
   - a score that goes down is one correction, to the fans who get scores;
   - each quarter's end, halftime, a close finish (within 8 points, 5:00 or
     less in the 4th) and overtime are sent once each;
   - score, quarter and halftime alerts share one lock-screen card per game
     and are dropped when more than 5 minutes late (LIMITS.liveLate).
   The score state moves only by compare-and-set on its sequence number, so
   two overlapping minutes can never both announce the same score.

   The wording uses the name the app sent from its team config and ESPN's
   place name for the opponent - never a provider's sentence. */

const CORE = "https://sports.core.api.espn.com/v2/sports/football/leagues/college-football";
const SITE = "https://site.api.espn.com/apis/site/v2/sports/football/college-football";
export const APP_URL = "https://dmvanblaircom.github.io/Project-LND/";
const MIN = 60 * 1000;
export const LIMITS = { subscriptions: 5000, scheduleEvery: 60 * MIN, before: 20 * MIN, window: 8 * 60 * MIN,
                        tries: 10, kickoffLate: 15 * MIN, liveLate: 5 * MIN, settle: 3 * MIN, fold: 5 * MIN,
                        closeClock: 300, closeMargin: 8 };

// What a fan can choose (brief §2b). A subscription without options - every
// one made before round 2 - has the round-1 set: kickoff, final and delays.
export const DEFAULTS = { kickoff: true, final: true, delays: true, scoring: "off", quarters: false, halftime: false, close: false };
export function validOptions(o) {
  if (o == null) return Object.assign({}, DEFAULTS);
  if (typeof o !== "object") return null;
  const out = {};
  for (const k of ["kickoff", "final", "delays", "quarters", "halftime", "close"]) out[k] = o[k] == null ? DEFAULTS[k] : o[k] === true;
  out.scoring = o.scoring == null ? DEFAULTS.scoring : (["off", "mine", "all"].indexOf(o.scoring) >= 0 ? o.scoring : null);
  return out.scoring == null ? null : out;
}
// A subscription from before round 2 keeps exactly what it had: kickoff,
// final, and a postponed or canceled game. In-game delays are a new kind of
// alert, and a new kind starts off for those already signed up (the noise
// rule, §2; Codex, #116).
export const LEGACY = Object.assign({}, DEFAULTS, { delays: false, outcomes: true });
function anyOn(o) { return o.kickoff || o.final || o.delays || o.quarters || o.halftime || o.close || o.scoring !== "off"; }
// Whether a follower with options `o` gets this event (`d` its details).
export function wants(o, ev, d) {
  if (ev === "kickoff") return o.kickoff;
  if (ev === "final") return o.final;
  if (ev === "postponed" || ev === "canceled") return o.delays || !!o.outcomes;
  if (/^delay/.test(ev)) return o.delays;
  // "mine" is any alert in which the team's own score moved, including one
  // where both sides scored between two looks (Codex, #116)
  if (/^score/.test(ev)) return o.scoring === "all" || (o.scoring === "mine" && !!d && (d.scorer === "us" || !!d.ours));
  if (/^fix/.test(ev)) return o.scoring === "all" || (o.scoring === "mine" && !!d && (d.lost === "us" || !!d.ours));
  if (ev === "end:2") return o.quarters || o.halftime;
  if (/^end:/.test(ev)) return o.quarters;
  if (ev === "close" || ev === "ot") return o.close;
  return false;
}
// Events that are news only for minutes, and share the game's one card.
function live(ev) { return /^(score|fix|end:)/.test(ev); }

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
  else if (/DELAY|SUSPENDED/.test(name) && t.state !== "post") out.push({ event: "delay", transition: true });
  if (t.state === "in") {
    const p = status.period || 0, clock = typeof status.clock === "number" ? status.clock : null;
    if (p >= 5 && !sent.has("ot")) out.push({ event: "ot" });
    if (/END_PERIOD/.test(name) && p >= 1 && p <= 3 && !sent.has("end:" + p)) out.push({ event: "end:" + p, ended: p });
    if (/HALFTIME/.test(name) && !sent.has("end:2")) out.push({ event: "end:2", ended: 2 });
    if (p === 4 && clock != null && clock <= LIMITS.closeClock && !/END_PERIOD/.test(name) && !sent.has("close")) out.push({ event: "close", check: true });
  }
  if (t.state === "in" || t.state === "post") {
    if (!sent.has("kickoff")) out.push({ event: "kickoff", late: !(status.period <= 1) || t.state === "post" });
  }
  if (t.state === "post" && t.completed && !sent.has("final")) out.push({ event: "final" });
  return out;
}

export function ordinal(p) {
  if (p >= 5) return p === 5 ? "OT" : (p - 4) + "OT";
  return ["", "1st", "2nd", "3rd", "4th"][p] || "";
}
export function words(ev, team, game, scores, x) {
  const vs = game.home ? " vs. " : " at ";
  const matchup = team.name + vs + game.opponent.name;
  x = x || {};
  const line = scores && typeof scores.us === "number" && typeof scores.them === "number"
    ? team.name + " " + scores.us + ", " + game.opponent.name + " " + scores.them : null;
  const when = x.period ? " \u00b7 " + ordinal(x.period) + (x.clock && x.period <= 4 ? " " + x.clock : "") : "";
  if (/^score/.test(ev) && line) {
    const who = x.scorer === "us" ? team.name : x.scorer === "them" ? game.opponent.name : null;
    return { title: team.name, body: (who ? (x.label ? x.label + ", " + who + ". " : who + " scores. ") : "Score update. ") + line + when };
  }
  if (/^fix/.test(ev) && line) return { title: team.name, body: "Score corrected: " + line + when };
  if (/^end:/.test(ev) && line) {
    const p = Number(ev.slice(4));
    return { title: team.name, body: (p === 2 ? "Halftime: " : "End of " + ordinal(p) + ": ") + line };
  }
  if (ev === "close" && line) return { title: team.name, body: "One-score game: " + line + when };
  if (ev === "ot") return { title: team.name, body: "Overtime: " + (line || matchup) + "." };
  if (/^delay/.test(ev)) return { title: team.name, body: x.period ? "Delay: " + (line || matchup) + when : matchup + " is delayed." };
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
  // An event noticed for a team's game, once (both teams in a game may have
  // followers, so the team is part of the key - Codex, PR #102).
  db.exec("CREATE TABLE IF NOT EXISTS sent (team_id TEXT NOT NULL, game_id TEXT NOT NULL, event TEXT NOT NULL, at INTEGER NOT NULL," +
          " PRIMARY KEY (team_id, game_id, event))");
  // Each follower's copy of it: due until a push service takes it, retried
  // the next minute after a refusal or an outage, never sent twice.
  db.exec("CREATE TABLE IF NOT EXISTS deliveries (team_id TEXT NOT NULL, game_id TEXT NOT NULL, event TEXT NOT NULL," +
          " endpoint TEXT NOT NULL, state TEXT NOT NULL, tries INTEGER NOT NULL, at INTEGER NOT NULL, data TEXT NOT NULL," +
          " PRIMARY KEY (team_id, game_id, event, endpoint))");
  db.exec("CREATE TABLE IF NOT EXISTS games (team_id TEXT PRIMARY KEY, game TEXT, checked INTEGER NOT NULL)");
  // Round 2: each subscription's options (null: the round-1 set), and each
  // team's game in progress - the last announced score, one waiting to
  // settle, the quarter and its score, the last announcement - moved only
  // by compare-and-set on seq.
  try { db.exec("ALTER TABLE subs ADD COLUMN opts TEXT"); } catch (e) { /* already there */ }
  db.exec("CREATE TABLE IF NOT EXISTS live (team_id TEXT NOT NULL, game_id TEXT NOT NULL, seq INTEGER NOT NULL, st TEXT NOT NULL," +
          " PRIMARY KEY (team_id, game_id))");
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
  const opts = validOptions(body && body.options);
  if (!opts) return { status: 400, body: { error: "options are not valid" } };
  // Nothing chosen is alerts off (§2b): the subscription is not kept.
  if (!anyOn(opts)) { db.run("DELETE FROM subs WHERE endpoint = ? AND team_id = ?", sub.endpoint, team.id); return { status: 200, body: { ok: true, off: true } }; }
  const count = db.all("SELECT COUNT(*) AS n FROM subs")[0].n;
  const had = db.all("SELECT 1 FROM subs WHERE endpoint = ? AND team_id = ?", sub.endpoint, team.id).length > 0;
  if (!had && count >= LIMITS.subscriptions) return { status: 503, body: { error: "alerts are full for now" } };
  db.run("INSERT INTO subs (endpoint, team_id, team_name, p256dh, auth, created, opts) VALUES (?, ?, ?, ?, ?, ?, ?)" +
         " ON CONFLICT (endpoint, team_id) DO UPDATE SET team_name = excluded.team_name, p256dh = excluded.p256dh, auth = excluded.auth, opts = excluded.opts",
         sub.endpoint, team.id, team.name, sub.p256dh, sub.auth, now, JSON.stringify(opts));
  // A confirmation, so the fan knows at once that alerts reach this device -
  // only when they are turned on: changing a choice sends nothing.
  if (had) return { status: 200, body: { ok: true, team: team.id, confirmation: "updated" } };
  const status = await sendPush(env, await vapidKey(db, env), sub,
    { title: team.name, body: "Game alerts are on.", url: APP_URL, tag: "alerts-on-" + team.id }, now);
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
  const teams = db.all("SELECT DISTINCT team_id FROM subs");
  for (const t of teams) {
    const teamId = t.team_id;
    let row = db.all("SELECT game, checked FROM games WHERE team_id = ?", teamId)[0];
    let game = row && row.game ? JSON.parse(row.game) : null;
    const stale = !row || now - row.checked > LIMITS.scheduleEvery || (game && now - game.at > LIMITS.window);
    if (stale) {
      const schedule = await getJson(env, SITE + "/teams/" + teamId + "/schedule");
      if (schedule) {
        game = pickGame(schedule, teamId, now);
        db.run("INSERT INTO games (team_id, game, checked) VALUES (?, ?, ?) ON CONFLICT (team_id) DO UPDATE SET game = excluded.game, checked = excluded.checked",
               teamId, game ? JSON.stringify(game) : null, now);
      }
    }
    if (game && now >= game.at - LIMITS.before) await detect(db, env, teamId, game, now, log);
    else log.push(teamId + ": " + (game ? "waiting for " + new Date(game.at).toISOString() : "no game"));
    await deliver(db, env, teamId, now, log);
  }
  db.run("INSERT INTO meta (k, v) VALUES ('last', ?) ON CONFLICT (k) DO UPDATE SET v = excluded.v",
         JSON.stringify({ at: new Date(now).toISOString(), log }));
  return log;
}

// What ESPN says of the team's game, and a delivery for each follower who
// wants it of every event newly due.
async function detect(db, env, teamId, game, now, log) {
  const sent = new Set(db.all("SELECT event FROM sent WHERE team_id = ? AND game_id = ?", teamId, game.id).map(function (r) { return r.event; }));
  if (sent.has("final") || sent.has("canceled")) { log.push(teamId + ": done"); return; }
  // ESPN's core API first (a few hundred bytes); if it does not answer this
  // network, the same status from the team's schedule on the site API,
  // which the Phase 0 probe showed does.
  let status = await getJson(env, CORE + "/events/" + game.id + "/competitions/" + game.comp + "/status"), fromSchedule = null;
  if (!status) {
    fromSchedule = scheduleGame(await getJson(env, SITE + "/teams/" + teamId + "/schedule"), game.id);
    status = fromSchedule && fromSchedule.status;
    if (status) log.push(teamId + ": status from the schedule");
  }
  if (!status) { log.push(teamId + ": status unavailable"); return; }
  const t = status.type || {}, x0 = { period: status.period || 0, clock: status.displayClock || null };
  // While the game is on, its score each minute (round 2): announced first,
  // so a quarter's alert never shows a score the fan has not had (§2b, 3).
  let cur = null, told = null;
  if (t.state === "in") {
    cur = await liveScores(env, teamId, game, fromSchedule);
    if (cur) for (const e of scoreStep(db, teamId, game, status, cur, now, /END_PERIOD|HALFTIME/.test(t.name || "")))
      emit(db, teamId, game, e.event, e.scores, Object.assign({}, x0, e.x), now, log, false);
    // The score the fans have been told: a close finish is judged on it, so
    // it never arrives before the score that made the game close.
    const row = db.all("SELECT st FROM live WHERE team_id = ? AND game_id = ?", teamId, game.id)[0];
    told = row ? JSON.parse(row.st).base : null;
  }
  // A delay is an alert each time play stops, not once a game or a quarter
  // (Codex, #116): the game's "delayed now" mark, moved by compare-and-set,
  // numbers each one.
  const dk = "dly:" + teamId + ":" + game.id, dw = db.all("SELECT v FROM meta WHERE k = ?", dk)[0];
  const dly = dw ? JSON.parse(dw.v) : { on: false, n: 0 }, delayed = /DELAY|SUSPENDED/.test(t.name || "") && t.state !== "post";
  if (dly.on !== delayed) {
    const nv = JSON.stringify({ on: delayed, n: dly.n + (delayed ? 1 : 0) });
    const moved = dw ? db.run("UPDATE meta SET v = ? WHERE k = ? AND v = ?", nv, dk, dw.v).changes
                     : db.run("INSERT OR IGNORE INTO meta (k, v) VALUES (?, ?)", dk, nv).changes;
    if (moved && delayed) emit(db, teamId, game, "delay:" + (dly.n + 1), cur, x0, now, log, false);
  }
  for (const d of due(game, status, sent)) {
    if (d.transition) continue;                          // handled just above
    if (d.check && !(told && Math.abs(told.us - told.them) <= LIMITS.closeMargin)) continue;   // not close (yet)
    let scores = cur;
    if (d.event === "final") scores = await finalScores(env, teamId, game, fromSchedule);
    else if (d.check) scores = told;
    emit(db, teamId, game, d.event, scores, d.ended ? {} : x0, now, log, d.late);
  }
}

// Record an event for the team's game once, then a delivery for each
// follower whose options want it. Record first: if two runs overlap, only
// the one that recorded goes on.
function emit(db, teamId, game, ev, scores, x, now, log, late) {
  if (!db.run("INSERT OR IGNORE INTO sent (team_id, game_id, event, at) VALUES (?, ?, ?, ?)", teamId, game.id, ev, now).changes) return;
  if (late) { log.push(teamId + ": " + ev + " noticed late, not sent"); return; }
  const data = JSON.stringify({ game, scores, x });
  let n = 0;
  for (const s of db.all("SELECT endpoint, opts FROM subs WHERE team_id = ?", teamId)) {
    let o = null; try { o = s.opts ? validOptions(JSON.parse(s.opts)) : LEGACY; } catch (e) { o = null; }
    if (!wants(o || LEGACY, ev, x)) continue;
    n += db.run("INSERT OR IGNORE INTO deliveries (team_id, game_id, event, endpoint, state, tries, at, data) VALUES (?, ?, ?, ?, 'due', 0, ?, ?)",
                teamId, game.id, ev, s.endpoint, now, data).changes;
  }
  log.push(teamId + ": " + ev + " due for " + n);
}

async function finalScores(env, teamId, game, fromSchedule) {
  const base = CORE + "/events/" + game.id + "/competitions/" + game.comp + "/competitors/";
  let scores = { us: scoreOf(await getJson(env, base + teamId + "/score")), them: scoreOf(await getJson(env, base + game.opponent.id + "/score")) };
  if (scores.us == null || scores.them == null) {
    const sg = fromSchedule || scheduleGame(await getJson(env, SITE + "/teams/" + teamId + "/schedule"), game.id);
    if (sg) scores = { us: scoreOf(sg.scores[teamId]), them: scoreOf(sg.scores[game.opponent.id]) };
  }
  return scores;
}
// The score now, or null when ESPN gives no number for either side: a
// missing score is never read as a change.
async function liveScores(env, teamId, game, fromSchedule) {
  const s = await finalScores(env, teamId, game, fromSchedule);
  return s.us == null || s.them == null ? null : s;
}

function label(pts) {
  return pts >= 6 && pts <= 8 ? "Touchdown" : pts === 3 ? "Field goal" : pts === 2 ? "Safety" : pts === 1 ? "Extra point" : null;
}

// One minute of the score (round 2). The state moves only by compare-and-
// set on seq; a minute that loses the race announces nothing, and the next
// minute sees the state the winner left.
//   base  the last score announced (or folded in, or first seen)
//   pend  a higher score waiting to hold for a minute (LIMITS.settle at most)
//   per   the quarter last seen, and ps its last score - a quarter that ended
//         between two looks still gets its alert, with its own score
//   last  the last announcement, to fold an extra point into its touchdown
export function scoreStep(db, teamId, game, status, cur, now, flush) {
  const row = db.all("SELECT seq, st FROM live WHERE team_id = ? AND game_id = ?", teamId, game.id)[0];
  const p = status.period || 0;
  if (!row) {
    // First look at this game in progress: what it is now is where alerts start.
    db.run("INSERT OR IGNORE INTO live (team_id, game_id, seq, st) VALUES (?, ?, 0, ?)", teamId, game.id,
           JSON.stringify({ base: cur, pend: null, per: p, ps: cur, last: null }));
    return [];
  }
  const st = JSON.parse(row.st), out = [], next = Object.assign({}, st, { per: Math.max(p, st.per || 0), ps: cur });
  if (st.per && p > st.per && st.per <= 3) out.push({ event: "end:" + st.per, scores: st.ps, x: { period: 0 } });
  const b = st.base, moved = cur.us !== b.us || cur.them !== b.them;
  if (!moved) next.pend = null;
  else if (cur.us < b.us || cur.them < b.them) {
    out.push({ event: "fix:" + (row.seq + 1), scores: cur, x: { lost: cur.us < b.us ? "us" : "them", ours: cur.us !== b.us } });
    next.base = cur; next.pend = null; next.last = null;
  } else {
    const held = st.pend && st.pend.us === cur.us && st.pend.them === cur.them;
    if (!(held || flush || (st.pend && now - st.pend.at >= LIMITS.settle))) {
      next.pend = { us: cur.us, them: cur.them, at: st.pend ? st.pend.at : now };
    } else {
      const du = cur.us - b.us, dt = cur.them - b.them;
      const scorer = du > 0 && dt === 0 ? "us" : dt > 0 && du === 0 ? "them" : "both";
      const pts = scorer === "us" ? du : scorer === "them" ? dt : 0;
      const fold = (pts === 1 || pts === 2) && st.last && st.last.kind === "td" && st.last.scorer === scorer && now - st.last.at <= LIMITS.fold;
      if (fold) next.last = null;
      else {
        out.push({ event: "score:" + (row.seq + 1), scores: cur, x: { scorer, label: label(pts), ours: du > 0 } });
        next.last = { kind: pts >= 6 ? "td" : "other", scorer, at: now };
      }
      next.base = cur; next.pend = null;
    }
  }
  const won = db.run("UPDATE live SET seq = seq + 1, st = ? WHERE team_id = ? AND game_id = ? AND seq = ?",
                     JSON.stringify(next), teamId, game.id, row.seq).changes;
  return won ? out : [];
}

// Send what is due. Each follower's alert uses the team name their own app
// sent, so no subscription can put words in another's (Codex, PR #102). A
// push service that takes it ends it; one that has dropped the subscription
// removes it; anything else - a 429, a 5xx, no answer - is tried again the
// next minute, up to LIMITS.tries, and a kickoff only while it is news.
async function deliver(db, env, teamId, now, log) {
  const due = db.all("SELECT d.game_id, d.event, d.endpoint, d.tries, d.at, d.data, s.team_name, s.p256dh, s.auth" +
                     " FROM deliveries d JOIN subs s ON s.endpoint = d.endpoint AND s.team_id = d.team_id" +
                     " WHERE d.team_id = ? AND d.state = 'due' ORDER BY d.at, d.rowid", teamId);   // in the order they happened
  if (!due.length) return;
  const jwk = await vapidKey(db, env);
  const tally = {};
  for (const d of due) {
    const key = [teamId, d.game_id, d.event, d.endpoint];
    const t = tally[d.event] = tally[d.event] || { sent: 0, retry: 0, gone: 0, dropped: 0 };
    if ((d.event === "kickoff" && now - d.at > LIMITS.kickoffLate) || (live(d.event) && now - d.at > LIMITS.liveLate)) {
      db.run("UPDATE deliveries SET state = 'expired' WHERE team_id = ? AND game_id = ? AND event = ? AND endpoint = ?", ...key);
      t.dropped++; continue;
    }
    // Claim it, so an overlapping run cannot send it too.
    if (!db.run("UPDATE deliveries SET state = 'sending' WHERE team_id = ? AND game_id = ? AND event = ? AND endpoint = ? AND state = 'due'", ...key).changes) continue;
    const x = JSON.parse(d.data), w = words(d.event, { id: teamId, name: d.team_name }, x.game, x.scores, x.x);
    if (!w) { db.run("UPDATE deliveries SET state = 'failed' WHERE team_id = ? AND game_id = ? AND event = ? AND endpoint = ?", ...key); t.dropped++; continue; }
    // Score, quarter and halftime alerts replace one another on the lock
    // screen (one card per game, §2b 4); the phone still sounds each time.
    const tag = live(d.event) ? d.game_id + "-live" : d.game_id + "-" + d.event;
    const code = await sendPush(env, jwk, { endpoint: d.endpoint, p256dh: d.p256dh, auth: d.auth },
                                { title: w.title, body: w.body, url: APP_URL + "#game", tag, renotify: live(d.event) }, now);
    let state;
    if (code >= 200 && code < 300) { state = "done"; t.sent++; }
    else if (code === 404 || code === 410) { state = "gone"; t.gone++; db.run("DELETE FROM subs WHERE endpoint = ?", d.endpoint); }
    else if (d.tries + 1 >= LIMITS.tries) { state = "failed"; t.dropped++; }
    else { state = "due"; t.retry++; }
    db.run("UPDATE deliveries SET state = ?, tries = tries + 1 WHERE team_id = ? AND game_id = ? AND event = ? AND endpoint = ?", state, ...key);
  }
  Object.keys(tally).forEach(function (ev) {
    const t = tally[ev];
    log.push(teamId + ": " + ev + " sent to " + t.sent + (t.retry ? ", " + t.retry + " to retry" : "") +
             (t.gone ? ", " + t.gone + " gone" : "") + (t.dropped ? ", " + t.dropped + " dropped" : ""));
  });
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
    sent: db.all("SELECT team_id AS team, game_id AS game, event, at FROM sent ORDER BY at DESC LIMIT 20")
            .map(function (r) { return { team: r.team, game: r.game, event: r.event, at: new Date(r.at).toISOString() }; }),
    deliveries: db.all("SELECT team_id AS team, game_id AS game, event, state, COUNT(*) AS n FROM deliveries" +
                       " GROUP BY team_id, game_id, event, state ORDER BY game_id, event"),
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
