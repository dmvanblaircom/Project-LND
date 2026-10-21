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
   - while a game is on the Worker looks three times a minute, 20 seconds
     apart (minute(); David, 2026-10-10). A score is announced at once when
     ESPN's own scoring play at exactly that score confirms it, otherwise
     once it holds for a look; a touchdown that moves
     on by its own try has held, so it is announced then, and the try is its
     own alert (David, 2026-10-10): extra point or two-point good, from the
     score; missed or failed, from ESPN's scoring play, only when its words
     say so;
   - a score that goes down is one correction, to the fans who get scores;
   - each quarter's end, halftime, a close finish (within 8 points, 5:00 or
     less in the 4th) and overtime are sent once each;
   - score, quarter and halftime alerts share one lock-screen card per game
     and are dropped when more than 5 minutes late (LIMITS.liveLate).
   The score state moves only by compare-and-set on its sequence number, so
   two overlapping minutes can never both announce the same score.

   The wording (theScore's shape, David, 2026-10-10): what happened and when
   in the title ("Notre Dame TD (13:06 1st)"), the play and the score in the
   body. The names are the one the app sent from its team config and ESPN's
   place name for the opponent; the play is ESPN's scoring-play line, read
   from the game summary only when the score moves, cleaned to plain text
   and cut short (playText). */

import { RANKINGS_SHOWS, SELECTION_DAYS } from "./calendar.js";

const CORE = "https://sports.core.api.espn.com/v2/sports/football/leagues/college-football";
const SITE = "https://site.api.espn.com/apis/site/v2/sports/football/college-football";
export const APP_URL = "https://dmvanblaircom.github.io/Project-LND/";
const MIN = 60 * 1000;
export const LIMITS = { subscriptions: 5000, scheduleEvery: 60 * MIN, before: 20 * MIN, window: 8 * 60 * MIN,
                        tries: 10, kickoffLate: 15 * MIN, liveLate: 5 * MIN, settle: 3 * MIN, fold: 5 * MIN,
                        looks: 3, lookEvery: 20 * 1000,
                        closeClock: 300, closeMargin: 8, timeMoved: 3 * 60 * MIN,
                        cfpWindow: 12 * 60 * MIN, cfpEvery: 5 * MIN, cfpFresh: 12 * 60 * MIN, cfpWait: 10 * 1000,
                        selRemind: 3 * 60 * MIN, postFrom: 7 * 24 * 60 * MIN, postFast: 12 * 60 * MIN, postEvery: 5 * MIN,
                        noPostAfter: 12 * 60 * MIN, noPostUntil: 7 * 24 * 60 * MIN, boardEvery: 60 * MIN };

// What a fan can choose (brief §2b). A subscription without options - every
// one made before round 2 - has the round-1 set: kickoff, final and delays.
// "timeset" (a game's kickoff time set or moved, §2b 12) is off by default
// and for every subscription saved before it existed: a new kind of alert
// is never switched on for anyone already signed up (the noise rule, §2).
// "cfp" (the CFP rankings are out, brief §1 postseason events) is opt-in too.
// The other postseason events (David, 2026-10-20): "selection" (the Selection
// Day reminder) and "postseason" (the team's playoff or bowl game is set) are
// on in the app's own defaults for a fan choosing now, but a choice saved
// before they existed - which does not name them - has them off, so here
// they default off; "nopost" (no postseason) is opt-in.
export const DEFAULTS = { kickoff: true, final: true, delays: true, scoring: "off", quarters: false, halftime: false, close: false, timeset: false, cfp: false,
                          selection: false, postseason: false, nopost: false };
const SWITCHES = ["kickoff", "final", "delays", "quarters", "halftime", "close", "timeset", "cfp", "selection", "postseason", "nopost"];
export function validOptions(o) {
  if (o == null) return Object.assign({}, DEFAULTS);
  if (typeof o !== "object") return null;
  const out = {};
  for (const k of SWITCHES) out[k] = o[k] == null ? DEFAULTS[k] : o[k] === true;
  out.scoring = o.scoring == null ? DEFAULTS.scoring : (["off", "mine", "all"].indexOf(o.scoring) >= 0 ? o.scoring : null);
  // A round-1 device keeps its postponed/canceled alerts while its new
  // Delays switch starts off (the app sends this; Codex, #116).
  if (o.outcomes === true) out.outcomes = true;
  return out.scoring == null ? null : out;
}
// A subscription from before round 2 keeps exactly what it had: kickoff,
// final, and a postponed or canceled game. In-game delays are a new kind of
// alert, and a new kind starts off for those already signed up (the noise
// rule, §2; Codex, #116).
export const LEGACY = Object.assign({}, DEFAULTS, { delays: false, outcomes: true });
function anyOn(o) { return SWITCHES.some(function (k) { return !!o[k]; }) || o.scoring !== "off"; }
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
  if (/^time:/.test(ev)) return !!o.timeset;
  if (/^cfp:/.test(ev)) return !!o.cfp;
  if (/^sel:/.test(ev)) return !!o.selection;
  if (/^post(off)?:/.test(ev)) return !!o.postseason;
  if (/^nopost:/.test(ev)) return !!o.nopost;
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
    const tv = network(c.broadcasts);
    if (tv) g.network = tv;
    if (!best || at < best.at) best = g;
  }
  return best;
}

// The game's first national TV network, as ESPN's schedule names it: a short
// plain name or nothing.
export function network(list) {
  for (const b of list || []) {
    const n = String(((b && b.media) || {}).shortName || "").trim();
    if (/^[A-Za-z0-9][A-Za-z0-9 +&.!-]{0,23}$/.test(n)) return n;
  }
  return null;
}

// ---- a game's kickoff time, set or moved (brief §2b, edge case 12) --------

// Whether ESPN's date is a real kickoff: its timeValid flag, else (a feed
// without it) anything but a midnight-UTC placeholder - as TeamOS reads it.
function timeIsSet(iso, comp) {
  if (comp && typeof comp.timeValid === "boolean") return comp.timeValid;
  const d = new Date(iso); return !(d.getUTCHours() === 0 && d.getUTCMinutes() === 0);
}
// Every game on the team's schedule: the game as pickGame makes it, whether
// its time is set, and whether it is still to be played.
export function kickoffs(schedule, teamId) {
  const out = [];
  for (const e of (schedule && schedule.events) || []) {
    const c = e && e.competitions && e.competitions[0]; if (!c) continue;
    const at = Date.parse(e.date); if (!isFinite(at)) continue;
    const us = (c.competitors || []).filter(function (x) { return String((x.team || {}).id) === teamId; })[0];
    const them = (c.competitors || []).filter(function (x) { return String((x.team || {}).id) !== teamId; })[0];
    if (!us || !them) continue;
    const g = { id: String(e.id), comp: String(c.id || e.id), at, home: us.homeAway === "home",
                opponent: { id: String((them.team || {}).id || ""), name: (them.team || {}).location || (them.team || {}).shortDisplayName || "" } };
    const tv = network(c.broadcasts);
    if (tv) g.network = tv;
    out.push({ game: g, set: timeIsSet(e.date, c), pre: (((c.status || {}).type) || {}).state === "pre",
               iso: new Date(at).toISOString() });
  }
  return out;
}
// From what was last seen of each game's kickoff ({ id: iso | null }, null
// when its time was not set) to what is seen now: the new record, and an
// alert for each game that is still to be played and
//   - had no time and now has one ("set"), or
//   - had a time and now has another, more than LIMITS.timeMoved before the
//     old kickoff (closer than that it is a delay, and the delay alert says
//     it) ("moved").
// A game seen for the first time - or every game, the first time a team is
// looked at - is only recorded: an already set time is not news. The event
// carries the new kickoff (game + "time:" + ISO), so the same time seen
// twice is one alert and a second move is another.
export function timeChanges(prev, list, now) {
  const next = {}, out = [];
  for (const k of list) {
    next[k.game.id] = k.set ? k.iso : null;
    if (!prev || !Object.prototype.hasOwnProperty.call(prev, k.game.id) || !k.pre || !k.set) continue;
    const was = prev[k.game.id];
    if (was === k.iso) continue;
    if (was === null) out.push({ game: k.game, event: "time:" + k.iso, x: { kickoff: k.iso, set: true } });
    else if (now < Date.parse(was) - LIMITS.timeMoved) out.push({ game: k.game, event: "time:" + k.iso, x: { kickoff: k.iso, set: false } });
  }
  return { next, out };
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
// ESPN's scoring-play line as an alert's sentence: plain text, without its
// closing "(... KICK)" (the try is said in our own words), ending in a full
// stop, and never longer than a lock screen shows.
export function playText(t) {
  let s = String(t || "").replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s*\([^()]*\)\s*$/, "").replace(/\s+/g, " ").trim();
  if (!/[A-Za-z]/.test(s)) return null;
  if (s.length > 120) s = s.slice(0, 119).replace(/[\s,;:]+\S*$/, "") + "\u2026";
  return /[.!?\u2026]$/.test(s) ? s : s + ".";
}
// The try, from a scoring play's closing parentheses: "(S. Porath KICK)",
// "(Malik Orsan Kick)", "(S. Porath PAT MISSED)", "(Two-Point Pass
// Conversion Failed)". Anything else is null: no try alert rather than a
// wrong one.
export function tryOf(t) {
  const m = /\(([^()]*)\)\s*$/.exec(String(t || ""));
  if (!m) return null;
  const s = m[1], bad = /\b(miss(ed)?|block(ed)?|fail(ed|s)?|no good|unsuccessful)\b/i.test(s);
  if (/two[- ]?point|\b2[- ]?(pt|point)\b/i.test(s)) return bad ? "2ptfail" : "2pt";
  if (/\b(kick|pat|extra point)\b/i.test(s)) return bad ? "xpmiss" : "xp";
  return null;
}
const KIND = { td: "TD", fg: "FG", safety: "Safety", xp: "XP good", "2pt": "2-pt good", xpmiss: "XP missed", "2ptfail": "2-pt failed" };
const TRY = { xp: "XP good.", "2pt": "2-pt good.", xpmiss: "XP missed.", "2ptfail": "2-pt failed." };
// An alert from before this wording (a delivery still due when it shipped)
// carries a label, not a kind.
const LABEL = { "Touchdown": "td", "Field goal": "fg", "Safety": "safety", "Extra point": "xp" };
export function words(ev, team, game, scores, x) {
  // The committee's rankings: about the season, not a game (brief §1).
  if (/^cfp:/.test(ev)) return { title: "CFP rankings",
    body: "The CFP rankings are out: " + team.name + (x && x.rank ? " is No. " + x.rank + "." : " is not in the top 25.") };
  // The rest of the postseason (brief §1). The time rides in the title,
  // written by the phone in its own time zone (sw.js), and only when ESPN
  // has set it; a bowl's or round's name is ESPN's own words.
  if (/^sel:/.test(ev)) return { title: "Selection Day", kickoff: x && x.at, network: x && x.on,
    body: "The 12-team playoff field is revealed today, then every bowl matchup that afternoon." };
  if (/^nopost:/.test(ev)) return { title: "Season complete", body: team.name + "'s season is complete: no bowl this year." };
  // A game announced, then gone from the team's schedule before it was
  // played: a bowl declined or left (David, 2026-10-20).
  if (/^postoff:/.test(ev)) {
    const st = (x && x.stage) || {};
    const what = st.kind === "playoff" ? "the CFP " + st.round : st.bowl ? "the " + st.bowl : null;
    return what ? { title: st.kind === "playoff" ? "College Football Playoff" : "Bowl game", body: team.name + " will not play in " + what + "." } : null;
  }
  if (/^post:/.test(ev)) {
    if (!x || !x.opp) return null;
    const st = x.stage || {}, opp = (x.oppRank ? "No. " + x.oppRank + " " : "") + x.opp;
    const out = { kickoff: x.timeSet ? x.at : null, network: x.net || null };
    if (st.kind === "playoff") {
      out.title = "College Football Playoff";
      out.body = st.round === "First Round"
        ? team.name + " is in the College Football Playoff: " + (x.usRank ? "the No. " + x.usRank + " seed " : "") +
          (x.home ? "hosts " : "plays ") + opp + " in the First Round."
        : team.name + " plays " + opp + " in the CFP " + st.round + (st.bowl ? " at the " + st.bowl : "") + ".";
    } else if (st.kind === "bowl") {
      out.title = "Bowl game";
      out.body = team.name + " will play " + opp + " in the " + st.bowl + ".";
    } else return null;
    return out;
  }
  const vs = game.home ? " vs. " : " at ";
  const matchup = team.name + vs + game.opponent.name;
  x = x || {};
  const line = scores && typeof scores.us === "number" && typeof scores.them === "number"
    ? team.name + " " + scores.us + ", " + game.opponent.name + " " + scores.them : null;
  // "(13:06 1st)"; overtime has no clock
  const when = x.period ? " (" + (x.clock && x.period <= 4 ? x.clock + " " : "") + ordinal(x.period) + ")" : "";
  if (/^score/.test(ev) && line) {
    const who = x.scorer === "us" ? team.name : x.scorer === "them" ? game.opponent.name : null;
    const kind = x.kind || LABEL[x.label] || null;
    if (!who) return { title: "Score update" + when, body: line };
    if (!KIND[kind]) return { title: who + " scores" + when, body: line };
    // The play, when ESPN's summary had it; a touchdown also says its try:
    // in the score already, missed already, or still to come (its own
    // alert follows).
    const said = [];
    if (kind === "td" || kind === "fg" || kind === "safety") {
      if (x.play) said.push(x.play);
      if (kind === "td" && x.kind) said.push(TRY[x.try] || "PAT pending.");
    }
    return { title: who + " " + KIND[kind] + when, body: (said.length ? said.join(" ") + "\n" : "") + line };
  }
  if (/^fix/.test(ev) && line) return { title: "Score corrected" + when, body: line };
  if (/^end:/.test(ev) && line) {
    const p = Number(ev.slice(4));
    return { title: p === 2 ? "Halftime" : "End of " + ordinal(p), body: line };
  }
  if (ev === "close" && line) return { title: "One-score game" + when, body: line };
  if (ev === "ot") return { title: "Overtime", body: line || matchup };
  if (/^delay/.test(ev)) return x.period ? { title: "Delay" + when, body: line || matchup } : { title: "Delayed", body: matchup + " is delayed." };
  if (ev === "kickoff") return { title: "Kickoff: " + matchup, body: game.network ? "On " + game.network : "Underway now." };
  if (ev === "final") {
    const us = scores && scores.us, them = scores && scores.them;
    if (typeof us !== "number" || typeof them !== "number") return { title: "Final: " + matchup, body: "" };
    return { title: "Final: " + line, body: us > them ? team.name + " wins." : them > us ? game.opponent.name + " wins." : "" };
  }
  // The kickoff goes as ISO, never as a clock time: the app's service
  // worker writes it in the fan's own time zone (decision 0022). An older
  // service worker shows the title and body as they are.
  if (/^time:/.test(ev) && x.kickoff) return { title: matchup, body: x.set ? "Kickoff time set." : "Kickoff time changed.",
                                               kickoff: x.kickoff, network: game.network || null };
  if (ev === "postponed") return { title: "Postponed", body: matchup + " has been postponed." };
  if (ev === "canceled") return { title: "Canceled", body: matchup + " has been canceled." };
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
  // One device, one alert per game event, though it follows both teams in
  // the game (brief §2b, edge case 9): the first team's delivery claims it.
  db.exec("CREATE TABLE IF NOT EXISTS claims (endpoint TEXT NOT NULL, game_id TEXT NOT NULL, ckey TEXT NOT NULL," +
          " PRIMARY KEY (endpoint, game_id, ckey))");
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
  // No options at all is a page from before round 2 (still open, or not yet
  // updated): it keeps the round-1 set, and a row's saved choice is never
  // overwritten by it (Codex, #116).
  const given = body && body.options != null;
  const opts = given ? validOptions(body.options) : LEGACY;
  if (!opts) return { status: 400, body: { error: "options are not valid" } };
  // Nothing chosen is alerts off (§2b): the subscription is not kept.
  if (!anyOn(opts)) { db.run("DELETE FROM subs WHERE endpoint = ? AND team_id = ?", sub.endpoint, team.id); return { status: 200, body: { ok: true, off: true } }; }
  const count = db.all("SELECT COUNT(*) AS n FROM subs")[0].n;
  const had = db.all("SELECT 1 FROM subs WHERE endpoint = ? AND team_id = ?", sub.endpoint, team.id).length > 0;
  if (!had && count >= LIMITS.subscriptions) return { status: 503, body: { error: "alerts are full for now" } };
  db.run("INSERT INTO subs (endpoint, team_id, team_name, p256dh, auth, created, opts) VALUES (?, ?, ?, ?, ?, ?, ?)" +
         " ON CONFLICT (endpoint, team_id) DO UPDATE SET team_name = excluded.team_name, p256dh = excluded.p256dh, auth = excluded.auth, opts = COALESCE(excluded.opts, subs.opts)",
         sub.endpoint, team.id, team.name, sub.p256dh, sub.auth, now, given ? JSON.stringify(opts) : null);
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

async function getJson(env, url, ms) {
  try {
    const init = { headers: { accept: "application/json" } };
    if (ms && typeof AbortSignal !== "undefined" && AbortSignal.timeout) init.signal = AbortSignal.timeout(ms);
    const r = await (env.FETCH || fetch)(url, init);
    return r.ok ? await r.json() : null;
  } catch (e) { return null; }
}

// ---- the CFP rankings (postseason events, brief §1; David, 2026-10-02) ------
// The committee releases its rankings during each Tuesday show the league
// published (worker/src/calendar.js, from leagues/). ESPN's rankings feed -
// the one the app's Top 25 reads - carries them as the poll of type "cfp",
// with the week it belongs to and the day it was released (real capture:
// tools/fixtures/espn-rankings-cfp-20260114.json). So the Worker asks ESPN
// only during a show's window, and only every few minutes, and a release
// counts only when it is dated the show's own day: last week's, still in the
// feed before the show, is never news, and a re-publish of the same week is
// the same release (its id).

// The show whose window `now` is in, or null.
export function cfpShow(now, shows) {
  return (shows || RANKINGS_SHOWS).filter(function (s) {
    const t = Date.parse(s.start);
    return now >= t && now < t + LIMITS.cfpWindow;
  })[0] || null;
}

// ESPN's rankings payload -> this show's CFP release, or null: a whole 25,
// dated the show's day (the start's own date: the calendar writes it in
// Eastern time, the day the show airs). { id, week, ranks: [{ rank, id }] }
export function cfpRelease(feed, show) {
  const p = ((feed && feed.rankings) || []).filter(function (r) { return r && r.type === "cfp"; })[0];
  if (!p || !Array.isArray(p.ranks) || p.ranks.length < 25 || !show) return null;
  const day = String(show.start).slice(0, 10);
  if (String(p.date || "").slice(0, 10) !== day) return null;
  const week = p.occurrence && Number.isInteger(p.occurrence.number) ? p.occurrence.number : null;
  const season = (p.season && Number(p.season.year)) || show.season;
  const ranks = [];
  for (const r of p.ranks) {
    if (!r || !Number.isInteger(r.current) || !r.team || r.team.id == null) return null;
    ranks.push({ rank: r.current, id: String(r.team.id) });
  }
  return { id: season + "-" + (week != null ? "w" + week : day), week: week, ranks: ranks };
}

// At most every LIMITS.cfpEvery, during a show's window, until that show's
// release has been found.
async function cfpLook(db, env, now, log, shows) {
  const show = cfpShow(now, shows);
  if (!show) return null;
  const row = db.all("SELECT v FROM meta WHERE k = 'cfp'")[0];
  let st = null;
  try { st = row ? JSON.parse(row.v) : null; } catch (e) { st = null; }
  if (st && st.show === show.start && (st.found || now - st.at < LIMITS.cfpEvery)) return null;
  const release = cfpRelease(await getJson(env, SITE + "/rankings", LIMITS.cfpWait), show);
  db.run("INSERT INTO meta (k, v) VALUES ('cfp', ?) ON CONFLICT (k) DO UPDATE SET v = excluded.v",
         JSON.stringify({ show: show.start, at: now, found: !!release }));
  log.push("cfp: " + (release ? "release " + release.id : "not out yet"));
  return release;
}

// The release for one team: its rank, or none in the top 25. One "game" per
// team and release, so a device that follows two teams hears about each.
function cfpEmit(db, teamId, release, now, log) {
  const r = release.ranks.filter(function (x) { return x.id === String(teamId); })[0];
  emit(db, teamId, { id: "cfp-" + release.id + "-" + teamId }, "cfp:" + release.id, null,
       { rank: r ? r.rank : null, week: release.week }, now, log, false);
}

// ---- the rest of the postseason (brief §1; David, 2026-10-02 and 10-20) ---
// Selection Day's reminder, the team's playoff or bowl game set, a game it
// will not play after all, and no postseason. Dates are the league's
// published calendar (SELECTION_DAYS, generated from leagues/); outcomes are
// the team's own postseason schedule on ESPN's site API (season type 3) and
// the league's postseason board - the feeds the app reads.

// A game's stage from ESPN's note - the only place a bowl's or a playoff
// round's name is carried. The same reading as TeamOS (teamos/espn.js
// stageOf), which this Worker cannot load: the round, the bowl as ESPN
// names it (sponsor kept), and kind playoff | bowl | other.
// ESPN wrote 2025's first round as "College Football Playoff First Round Game".
const PLAYOFF_ROUND = /^College Football Playoff (First Round|Quarterfinal|Semifinal|National Championship)(?: Game)?(?: at the (.+))?$/i;
const ROUND_NAME = { "first round": "First Round", quarterfinal: "Quarterfinal", semifinal: "Semifinal", "national championship": "National Championship" };
export function stageOf(comp) {
  const h = ((comp && comp.notes) || []).map(function (n) { return n && n.headline ? String(n.headline) : ""; }).filter(Boolean)[0];
  if (!h) return null;
  const t = h.replace(/\s+-\s+Rescheduled\b.*$/i, "").replace(/\s+Presented by\b.*$/i, "").trim();
  const m = PLAYOFF_ROUND.exec(t);
  if (m) return { kind: "playoff", round: ROUND_NAME[m[1].toLowerCase()], bowl: m[2] || null };
  if (/\bBowl\b/i.test(t)) return { kind: "bowl", round: null, bowl: t };
  return { kind: "other", round: null, bowl: null };
}
// A side that is a real team, not a placeholder listed before selection.
function realTeam(c) {
  const t = (c && c.team) || {};
  return /^[0-9]+$/.test(String(t.id || "")) && !/\bTBD\b|to be (determined|announced)/i.test(t.displayName || t.name || t.location || "");
}
// The team's postseason games with a real opponent and a playoff or bowl
// stage, from its season-type-3 schedule: what the "set" alert says. In a
// playoff game ESPN's rank is the seed (Notre Dame 2024: rank 7, seed 7,
// CFP No. 5 - tools/fixtures/espn-schedule-nd-2024-post-notes.json).
export function postGames(schedule, teamId) {
  const out = [];
  for (const e of (schedule && schedule.events) || []) {
    const c = e && e.competitions && e.competitions[0]; if (!c) continue;
    const at = Date.parse(e.date); if (!isFinite(at)) continue;
    const us = (c.competitors || []).filter(function (x) { return String((x.team || {}).id) === String(teamId); })[0];
    const them = (c.competitors || []).filter(function (x) { return String((x.team || {}).id) !== String(teamId); })[0];
    const stage = stageOf(c);
    if (!us || !them || !realTeam(them) || !stage || stage.kind === "other") continue;
    const rank = function (x) { const r = x.curatedRank && x.curatedRank.current; return r && r < 26 ? r : null; };
    out.push({ id: String(e.id), at, iso: new Date(at).toISOString(), timeSet: timeIsSet(e.date, c), home: us.homeAway === "home",
               state: (((c.status || {}).type) || {}).state || "pre", stage,
               opp: (them.team || {}).location || (them.team || {}).shortDisplayName || "",
               oppRank: stage.kind === "playoff" ? rank(them) : null, usRank: stage.kind === "playoff" ? rank(us) : null,
               net: network(c.broadcasts) });
  }
  return out.sort(function (a, b) { return a.at - b.at; });
}
// The league's postseason board -> whether the field is set: a playoff First
// Round game with two real teams (TeamOS.espn.postseasonSelected's rule).
// Bowls are announced the same afternoon. null when the board says nothing.
export function fieldSet(board) {
  const evs = board && board.events;
  if (!Array.isArray(evs)) return null;
  return evs.some(function (e) {
    const c = (e.competitions && e.competitions[0]) || {}, st = stageOf(c), cs = c.competitors || [];
    return !!st && st.round === "First Round" && cs.length === 2 && cs.every(realTeam);
  });
}
// This season's Selection Day, from the league calendar: the one whose
// postseason `now` falls in (a week before it through January), or null.
export function selectionFor(now, days) {
  return (days || SELECTION_DAYS).filter(function (d) {
    const t = Date.parse(d.start);
    return now >= t - LIMITS.postFrom && now < Date.UTC(d.season + 1, 1, 1);
  })[0] || null;
}

// What the Worker has seen of a team's postseason: the games it said were
// set ({ id: { stage, opp, iso } }), how many reads in a row each has been
// missing from, and how many reads in a row found none at all.
function postState(db, teamId) {
  const row = db.all("SELECT v FROM meta WHERE k = ?", "post:" + teamId)[0];
  const st = row ? JSON.parse(row.v) : null;
  return st && st.games ? st : { games: {}, missing: {}, empty: 0, at: 0 };
}
function savePost(db, teamId, st) {
  db.run("INSERT INTO meta (k, v) VALUES (?, ?) ON CONFLICT (k) DO UPDATE SET v = excluded.v", "post:" + teamId, JSON.stringify(st));
}

// One read of the team's postseason schedule (`post`, null when it failed):
// a game newly set is announced; one announced that is no longer listed -
// a bowl the team declined or left, two reads in a row so one bad answer
// never sends it - is withdrawn (David, 2026-10-20: Notre Dame declined its
// 2025 bowl). Nothing is ever inferred from a failed read.
export function postSeen(db, teamId, post, sel, now, log) {
  if (!post || !Array.isArray(post.events)) return 0;
  let added = 0;
  const st = postState(db, teamId), games = postGames(post, teamId);
  st.at = now;
  st.empty = games.length ? 0 : (st.empty || 0) + 1;
  for (const g of games) {
    st.missing[g.id] = 0;
    if (st.games[g.id]) continue;
    st.games[g.id] = { stage: g.stage, opp: g.opp, iso: g.iso };
    added++;
    if (g.state !== "pre") continue;                    // set and already played: not news
    emit(db, teamId, { id: g.id }, "post:" + g.id, null,
         { stage: g.stage, opp: g.opp, oppRank: g.oppRank, usRank: g.usRank, home: g.home, at: g.iso, timeSet: g.timeSet, net: g.net }, now, log, false);
  }
  const listed = new Set(games.map(function (g) { return g.id; }));
  for (const id of Object.keys(st.games)) {
    const g = st.games[id];
    if (listed.has(id) || g.off || Date.parse(g.iso) <= now) continue;
    st.missing[id] = (st.missing[id] || 0) + 1;
    if (st.missing[id] < 2) continue;
    g.off = true;
    emit(db, teamId, { id: id }, "postoff:" + id, null, { stage: g.stage, opp: g.opp }, now, log, false);
  }
  savePost(db, teamId, st);
  return added;
}

// When to read the postseason schedule apart from the hourly read: every few
// minutes from Selection Day's show to the evening after, when the field and
// the bowls are named.
function postFast(now, sel) {
  const start = Date.parse(sel.start), end = Date.parse(sel.end || sel.start);
  return now >= start && now < end + LIMITS.postFast;
}

// Selection Day's reminder: once, in the morning before the show.
function selEmit(db, teamId, sel, now, log) {
  const t = Date.parse(sel.start);
  if (!(now >= t - LIMITS.selRemind && now < t)) return;
  emit(db, teamId, { id: "sel-" + sel.season }, "sel:" + sel.season, null, { at: new Date(t).toISOString(), on: sel.on }, now, log, false);
}

// No postseason: once the league's field is set (its board says so) and the
// team has no game left to play (its caller's rule) and no postseason game
// listed on two reads in a row - never from an empty or failed feed alone. Sent within a
// week of Selection Day, so a Worker started later never sends old news.
async function noPostLook(db, env, teamId, sel, now, log) {
  const end = Date.parse(sel.end || sel.start);
  if (now < end + LIMITS.noPostAfter || now > end + LIMITS.noPostUntil) return;
  if (db.all("SELECT 1 FROM sent WHERE team_id = ? AND event = ?", teamId, "nopost:" + sel.season).length) return;
  const st = postState(db, teamId);
  if (st.empty < 2 || Object.keys(st.games).some(function (id) { return !st.games[id].off; })) return;
  const row = db.all("SELECT v FROM meta WHERE k = 'postboard'")[0], b = row ? JSON.parse(row.v) : null;
  let set = b && b.season === sel.season ? b.set : null;
  if (set !== true && (!b || b.season !== sel.season || now - b.at >= LIMITS.boardEvery)) {
    set = fieldSet(await getJson(env, SITE + "/scoreboard?groups=80&limit=400&seasontype=3&week=1&dates=" + sel.season, LIMITS.cfpWait));
    db.run("INSERT INTO meta (k, v) VALUES ('postboard', ?) ON CONFLICT (k) DO UPDATE SET v = excluded.v",
           JSON.stringify({ season: sel.season, at: now, set: set === true }));
  }
  if (set !== true) return;
  emit(db, teamId, { id: "nopost-" + sel.season + "-" + teamId }, "nopost:" + sel.season, null, {}, now, log, false);
}

// One minute's work. Returns what it did, for the log and the tests.
// `quick`: a look between minutes (minute()) - new alerts go, retries wait
// for the minute, so LIMITS.tries still spans ten minutes (Codex, #119).
export async function tick(db, env, now, quick) {
  const log = [];
  let live = false;
  const teams = db.all("SELECT DISTINCT team_id FROM subs");
  for (const t of teams) {
    const teamId = t.team_id;
    let row = db.all("SELECT game, checked FROM games WHERE team_id = ?", teamId)[0];
    let game = row && row.game ? JSON.parse(row.game) : null;
    const stale = !row || now - row.checked > LIMITS.scheduleEvery || (game && now - game.at > LIMITS.window);
    // In the postseason the team's bowl or playoff games are a separate
    // schedule (season type 3): read with the regular one, so their kickoffs
    // and finals alert like any game's, and every few minutes on Selection
    // Day, when they are named.
    const sel = selectionFor(now, env.SELECTION);
    let readPost = false;
    if (stale) {
      const schedule = await getJson(env, SITE + "/teams/" + teamId + "/schedule");
      if (schedule) {
        const post = sel ? await getJson(env, SITE + "/teams/" + teamId + "/schedule?seasontype=3") : null;
        if (sel) { postSeen(db, teamId, post, sel, now, log); readPost = true; }
        const both = post && Array.isArray(post.events) ? { events: (schedule.events || []).concat(post.events) } : schedule;
        times(db, teamId, both, now, log);
        game = pickGame(both, teamId, now);
        db.run("INSERT INTO games (team_id, game, checked) VALUES (?, ?, ?) ON CONFLICT (team_id) DO UPDATE SET game = excluded.game, checked = excluded.checked",
               teamId, game ? JSON.stringify(game) : null, now);
        row = { game: game ? JSON.stringify(game) : null, checked: now };
      }
    }
    // A game named between the hourly reads: the next minute reads both
    // schedules, so the game alerts watch it from then.
    if (sel && !readPost && postFast(now, sel) && now - postState(db, teamId).at >= LIMITS.postEvery &&
        postSeen(db, teamId, await getJson(env, SITE + "/teams/" + teamId + "/schedule?seasontype=3"), sel, now, log))
      db.run("UPDATE games SET checked = 0 WHERE team_id = ?", teamId);
    if (sel) {
      selEmit(db, teamId, sel, now, log);
      // only from a schedule read: no game left to play, regular or post
      if (row && !game) await noPostLook(db, env, teamId, sel, now, log);
    }
    if (game && now >= game.at - LIMITS.before) { if (await detect(db, env, teamId, game, now, log)) live = true; }
    else log.push(teamId + ": " + (game ? "waiting for " + new Date(game.at).toISOString() : "no game"));
    await deliver(db, env, teamId, now, log, !quick);
  }
  // The rankings come after every game's work, and their request has its
  // own limit: a slow rankings feed on a Tuesday night must never hold up a
  // kickoff or a score (Codex, #147).
  const cfp = teams.length ? await cfpLook(db, env, now, log, env.SHOWS) : null;
  if (cfp) for (const t of teams) { cfpEmit(db, t.team_id, cfp, now, log); await deliver(db, env, t.team_id, now, log, !quick); }
  db.run("INSERT INTO meta (k, v) VALUES ('last', ?) ON CONFLICT (k) DO UPDATE SET v = excluded.v",
         JSON.stringify({ at: new Date(now).toISOString(), log }));
  log.live = live;
  return log;
}

// Each read of the schedule: what changed in its kickoff times since the
// last, recorded by compare-and-set so overlapping runs alert once.
function times(db, teamId, schedule, now, log) {
  // The record carries when it was read: one older than two schedule reads
  // (no one followed the team for a while, or the Worker was down) is no
  // baseline - the next read starts afresh, so a new follower is never told
  // of a change made before they signed up (Codex, #140).
  const k = "ko:" + teamId, row = db.all("SELECT v FROM meta WHERE k = ?", k)[0];
  let last = null;
  try { last = row ? JSON.parse(row.v) : null; } catch (e) { last = null; }
  const fresh = last && last.at && now - last.at <= 2 * LIMITS.scheduleEvery ? last.games : null;
  const r = timeChanges(fresh, kickoffs(schedule, teamId), now), v = JSON.stringify({ at: now, games: r.next });
  const moved = row ? db.run("UPDATE meta SET v = ? WHERE k = ? AND v = ?", v, k, row.v).changes
                    : db.run("INSERT OR IGNORE INTO meta (k, v) VALUES (?, ?)", k, v).changes;
  if (!moved) return;
  // Each change is numbered for its game, so a time that comes back (7:00,
  // 8:00, 7:00 again) is news again (Codex, #140): "time:<ISO>#<n>".
  for (const c of r.out) {
    const n = db.all("SELECT COUNT(*) AS n FROM sent WHERE team_id = ? AND game_id = ? AND event LIKE 'time:%'", teamId, c.game.id)[0].n;
    emit(db, teamId, c.game, c.event + "#" + (n + 1), null, c.x, now, log, false);
  }
}

// The cron's minute. While any followed game is on, it looks LIMITS.looks
// times, LIMITS.lookEvery apart (20 seconds: David, 2026-10-10), since the
// scheduler fires at most once a minute; otherwise once. Each look is a
// whole tick, so the compare-and-set rules hold between them as between
// minutes.
export async function minute(db, env, clock, sleep) {
  const start = clock();
  let log = await tick(db, env, start);
  const all = log.slice();
  for (let i = 1; i < LIMITS.looks && log.live; i++) {
    const wait = start + i * LIMITS.lookEvery - clock();
    if (wait > 0) await sleep(wait);
    log = await tick(db, env, clock(), true);
    all.push.apply(all, log);
  }
  return all;
}

// What ESPN says of the team's game, and a delivery for each follower who
// wants it of every event newly due.
async function detect(db, env, teamId, game, now, log) {
  const sent = new Set(db.all("SELECT event FROM sent WHERE team_id = ? AND game_id = ?", teamId, game.id).map(function (r) { return r.event; }));
  if (sent.has("final") || sent.has("canceled")) { log.push(teamId + ": done"); return false; }
  // ESPN's core API first (a few hundred bytes); if it does not answer this
  // network, the same status from the team's schedule on the site API,
  // which the Phase 0 probe showed does.
  let status = await getJson(env, CORE + "/events/" + game.id + "/competitions/" + game.comp + "/status"), fromSchedule = null;
  if (!status) {
    fromSchedule = scheduleGame(await getJson(env, SITE + "/teams/" + teamId + "/schedule"), game.id);
    status = fromSchedule && fromSchedule.status;
    if (status) log.push(teamId + ": status from the schedule");
  }
  if (!status) { log.push(teamId + ": status unavailable"); return false; }
  const t = status.type || {}, x0 = { period: status.period || 0, clock: status.displayClock || null };
  // While the game is on, its score each minute (round 2): announced first,
  // so a quarter's alert never shows a score the fan has not had (§2b, 3).
  // And once at the final, before it: a score still holding its minute, or
  // a touchdown's try, is told rather than lost (Codex, #119).
  let cur = null, told = null;
  if (t.state === "in" || t.state === "post") {
    cur = await liveScores(env, teamId, game, fromSchedule);
    // ESPN's scoring plays (the game summary, tens of kilobytes) only when
    // the score has moved or a touchdown's try is still to be told.
    let plays = null;
    if (cur) {
      const lr = db.all("SELECT st FROM live WHERE team_id = ? AND game_id = ?", teamId, game.id)[0], ls = lr ? JSON.parse(lr.st) : null;
      if (ls && ls.base && (cur.us !== ls.base.us || cur.them !== ls.base.them || awaitingTry(ls, now)))
        plays = scoringPlays(await getJson(env, SITE + "/summary?event=" + game.id), teamId, game);
    }
    if (cur) for (const e of scoreStep(db, teamId, game, status, cur, now, t.state === "post" || /END_PERIOD|HALFTIME/.test(t.name || ""), plays))
      emit(db, teamId, game, e.event, e.scores, Object.assign({}, x0, e.x), now, log, !!e.late);
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
  return t.state === "in";
}

// The game event an alert is about, the same whichever of the game's two
// teams noticed it: a score by the score it made, home first (with a missed
// try's kind, since the score does not move), a correction by the score it
// leaves - each with the number of corrections so far (`rev`), so a
// scoreline that comes back after a correction (7-0, overturned to 0-0,
// then 7-0 again) is a new event (Codex, #140). A delay or a kickoff time,
// which each team numbers itself, by its kind and the game's count of that
// kind (`rev`, read after the team recorded it), so the two views agree
// even when one began later. Anything else by its own name (kickoff,
// final, end:2, close, ot).
export function claimKey(ev, game, scores, rev) {
  if (/^delay/.test(ev)) return "delay@" + (rev || 0);
  if (/^time:/.test(ev)) return ev.split("#")[0] + "@" + (rev || 0);
  const has = scores && typeof scores.us === "number" && typeof scores.them === "number";
  if (!has || !/^(score|fix)/.test(ev)) return ev;
  const home = game.home ? scores.us : scores.them, away = game.home ? scores.them : scores.us;
  return (/^fix/.test(ev) ? "fix|" : "score|") + home + "-" + away + "|" + (rev || 0);
}
// How many of a kind of event the game has had, by whichever of its teams
// has seen the most: the same for both teams' views, even when a device
// starts following the second team partway through (Codex, #140).
function gameCount(db, gameId, like) {
  const r = db.all("SELECT MAX(n) AS n FROM (SELECT COUNT(*) AS n FROM sent WHERE game_id = ? AND event LIKE ? GROUP BY team_id)", gameId, like)[0];
  return (r && r.n) || 0;
}
function claim(db, endpoint, game, key) {
  return db.run("INSERT OR IGNORE INTO claims (endpoint, game_id, ckey) VALUES (?, ?, ?)", endpoint, game.id, key).changes > 0;
}

// Record an event for the team's game once, then a delivery for each
// follower whose options want it. Record first: if two runs overlap, only
// the one that recorded goes on. A device following both teams in the game
// gets it once: from the first team to queue it (claim()).
function emit(db, teamId, game, ev, scores, x, now, log, late) {
  if (!db.run("INSERT OR IGNORE INTO sent (team_id, game_id, event, at) VALUES (?, ?, ?, ?)", teamId, game.id, ev, now).changes) return;
  if (late) { log.push(teamId + ": " + ev + " noticed late, not sent"); return; }
  const data = JSON.stringify({ game, scores, x });
  // A correction goes only to the devices that got the score it corrects,
  // whatever their choices are now; that score, if still waiting to go
  // anywhere, never goes (brief §2b, 5; Codex, #116).
  let only = null;
  if (/^fix/.test(ev)) {
    only = new Set();
    for (const of of (x && x.of) || []) {
      // an earlier correction still on its way stands for the score it was
      // correcting, which those devices did get: they get this one instead
      // (Codex, #116)
      const states = /^fix/.test(of) ? "('done', 'due', 'sending')" : "('done')";
      for (const r of db.all("SELECT endpoint FROM deliveries WHERE team_id = ? AND game_id = ? AND event = ? AND state IN " + states, teamId, game.id, of)) only.add(r.endpoint);
      db.run("UPDATE deliveries SET state = 'expired' WHERE team_id = ? AND game_id = ? AND event = ? AND state = 'due'", teamId, game.id, of);
    }
  }
  // A game withdrawn goes only to the devices told it was set; if that word
  // has not gone yet, it never goes (David, 2026-10-20).
  if (/^postoff:/.test(ev)) {
    only = new Set();
    const of = "post:" + ev.slice(8);
    for (const r of db.all("SELECT endpoint FROM deliveries WHERE team_id = ? AND game_id = ? AND event = ? AND state = 'done'", teamId, game.id, of)) only.add(r.endpoint);
    db.run("UPDATE deliveries SET state = 'expired' WHERE team_id = ? AND game_id = ? AND event = ? AND state IN ('due', 'sending')", teamId, game.id, of);
  }
  let n = 0, twice = 0;
  const rev = gameCount(db, game.id, /^delay/.test(ev) ? "delay%" : /^time:/.test(ev) ? "time:%" : "fix:%");
  const key = claimKey(ev, game, scores, rev) + (x && (x.kind === "xpmiss" || x.kind === "2ptfail") ? "|" + x.kind : "");
  // Every delivery claims its event, so a device that adds the other team
  // later is not told again what it has already been told (Codex, #140).
  const mine = function (endpoint) { return claim(db, endpoint, game, key); };
  for (const s of db.all("SELECT endpoint, opts FROM subs WHERE team_id = ?", teamId)) {
    if (only) {
      if (!only.has(s.endpoint)) continue;
      if (!mine(s.endpoint)) { twice++; continue; }
      n += db.run("INSERT OR IGNORE INTO deliveries (team_id, game_id, event, endpoint, state, tries, at, data) VALUES (?, ?, ?, ?, 'due', 0, ?, ?)",
                  teamId, game.id, ev, s.endpoint, now, data).changes;
      continue;
    }
    let o = null; try { o = s.opts ? validOptions(JSON.parse(s.opts)) : LEGACY; } catch (e) { o = null; }
    if (!wants(o || LEGACY, ev, x)) continue;
    if (!mine(s.endpoint)) { twice++; continue; }
    n += db.run("INSERT OR IGNORE INTO deliveries (team_id, game_id, event, endpoint, state, tries, at, data) VALUES (?, ?, ?, ?, 'due', 0, ?, ?)",
                teamId, game.id, ev, s.endpoint, now, data).changes;
  }
  log.push(teamId + ": " + ev + " due for " + n + (twice ? " (" + twice + " already had it from the other team)" : ""));
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

// The game summary's scoring plays, each as our side's and theirs: who
// scored, the score after it, when, and its line. Anything unreadable is
// left out; no summary is null.
export function scoringPlays(summary, teamId, game) {
  const list = summary && summary.scoringPlays;
  if (!Array.isArray(list)) return null;
  const out = [];
  for (const p of list) {
    const tid = String(((p && p.team) || {}).id || ""), h = Number(p && p.homeScore), a = Number(p && p.awayScore);
    if (!isFinite(h) || !isFinite(a)) continue;
    const side = tid === String(teamId) ? "us" : tid === game.opponent.id ? "them" : null;
    if (!side) continue;
    const per = Number(((p.period || {}).number)), clock = String(((p.clock || {}).displayValue) || "");
    out.push({ side, us: game.home ? h : a, them: game.home ? a : h,
               type: String(((p.scoringType || p.type || {}).abbreviation) || "").toUpperCase(),
               period: isFinite(per) && per > 0 ? per : 0, clock: /^\d{1,2}:\d{2}$/.test(clock) ? clock : null,
               text: String(p.text || "") });
  }
  return out;
}
// The play behind a side's score now: its last scoring play that put the
// side above `from`, and not past `to` plus a try ESPN may already show.
function playFor(plays, side, from, to) {
  if (!plays) return null;
  let hit = null;
  for (const p of plays) if (p.side === side && p[side] > from && p[side] <= to + 2) hit = p;
  return hit;
}
function playX(p) {
  return p ? { play: playText(p.text), period: p.period || undefined, clock: p.clock || undefined } : {};
}
// A touchdown announced without its try, still waiting to hear it.
// Kept apart from every other score: a later score by either side never
// ends the wait (Codex, #119); only the try told, or LIMITS.fold, does.
function awaitingTry(st, now) {
  return !!(st && st.tryq && now - st.tryq.at <= LIMITS.fold);
}
function kindOf(pts, type) {
  if (type === "TD" && pts >= 6 && pts <= 8) return "td";
  if (type === "FG" && pts === 3) return "fg";
  if (type === "SF" && pts === 2) return "safety";
  return pts >= 6 && pts <= 8 ? "td" : pts === 3 ? "fg" : pts === 2 ? "safety" : pts === 1 ? "xp" : null;
}

// One minute of the score (round 2). The state moves only by compare-and-
// set on seq; a minute that loses the race announces nothing, and the next
// minute sees the state the winner left.
//   base  the last score announced (or first seen)
//   pend  a higher score waiting to hold for a minute (LIMITS.settle at most)
//   per   the quarter last seen, and ps its last score - a quarter that ended
//         between two looks still gets its alert, with its own score
//   tryq  a touchdown told without its try: its side and score, waiting
//         LIMITS.fold at most for the try, its own alert (David, 2026-10-10)
//   hist  each side's announced scores, for a correction to find its fans
// `plays` is the summary's scoring plays when read (scoringPlays), else null:
// the alert is then told without the play.
export function scoreStep(db, teamId, game, status, cur, now, flush, plays) {
  const row = db.all("SELECT seq, st FROM live WHERE team_id = ? AND game_id = ?", teamId, game.id)[0];
  const p = status.period || 0;
  if (!row) {
    // First look at this game in progress: what it is now is where alerts start.
    db.run("INSERT OR IGNORE INTO live (team_id, game_id, seq, st) VALUES (?, ?, 0, ?)", teamId, game.id,
           JSON.stringify({ base: cur, pend: null, per: p, ps: cur, tryq: null, seen: now }));
    return [];
  }
  const st = JSON.parse(row.st), out = [], next = Object.assign({}, st, { per: Math.max(p, st.per || 0), ps: cur, seen: now });
  let n = row.seq;
  const hist = function () { return { us: ((next.hist || {}).us || []).slice(), them: ((next.hist || {}).them || []).slice() }; };
  // ESPN out of reach for longer than a live alert lives: what changed
  // meanwhile is caught up silently, not announced late (Codex, #116).
  const gap = st.seen && now - st.seen > LIMITS.liveLate;
  if (st.per && p > st.per && st.per <= 3) out.push({ event: "end:" + st.per, scores: st.ps, x: { period: 0 } });
  // the touchdown whose try is out, or was just told missed (LIMITS.fold)
  const tryBefore = awaitingTry(st, now) ? st.tryq : st.tried && now - st.tried.at <= LIMITS.fold ? st.tried : null;
  // Announce a score from b to c: who, what, and the play behind it.
  function announce(b, c) {
    const du = c.us - b.us, dt = c.them - b.them;
    const scorer = du > 0 && dt === 0 ? "us" : dt > 0 && du === 0 ? "them" : "both";
    const pts = scorer === "us" ? du : scorer === "them" ? dt : 0;
    const x = { scorer, ours: du > 0 };
    if (scorer !== "both") {
      // the try: one or two points straight onto the awaited touchdown
      // - unless ESPN's own play for the new points is a safety or a field
      // goal (Codex, #119)
      const own = playFor(plays, scorer, b[scorer], c[scorer]);
      const isTry = (pts === 1 || pts === 2) && awaitingTry(next, now) && next.tryq.side === scorer && b[scorer] === next.tryq.score &&
                    !(own && own[scorer] === c[scorer] && (own.type === "SF" || own.type === "FG"));
      if (isTry) {
        x.kind = pts === 1 ? "xp" : "2pt";
        Object.assign(x, playX(playFor(plays, scorer, b[scorer] - 6, b[scorer])), { play: undefined });
      } else {
        const pl = playFor(plays, scorer, b[scorer], c[scorer]);
        x.kind = kindOf(pts, pl && pl.type);
        // two points for the other side while a touchdown's try is out: a
        // defensive return of the try unless ESPN calls it a safety
        // (judged on the try as it stood before this look: one told missed
        // in this same look still counts; Codex, #119)
        if (pts === 2 && tryBefore && tryBefore.side !== scorer && !(pl && pl.type === "SF")) x.kind = null;
        Object.assign(x, playX(pl));
        if (x.kind === "td" && pts > 6) x.try = pts === 7 ? "xp" : "2pt";
        // the summary already says the try missed: the touchdown says so
        else if (x.kind === "td" && pl) { const tr = tryOf(pl.text); if (tr === "xpmiss" || tr === "2ptfail") x.try = tr; }
      }
    }
    n += 1;
    out.push({ event: "score:" + n, scores: c, x });
    if (x.kind === "xp" || x.kind === "2pt") { if (next.tryq && next.tryq.side === scorer) next.tryq = null; }
    if (x.kind === "td" && !x.try) next.tryq = { side: scorer, score: c[scorer], scores: { us: c.us, them: c.them }, at: now };
    const h = hist();
    if (du > 0) h.us.push(["score:" + n, c.us]);
    if (dt > 0) h.them.push(["score:" + n, c.them]);
    next.hist = h;
    next.base = c;
  }
  const b = st.base, moved = cur.us !== b.us || cur.them !== b.them;
  // A touchdown's try that missed moves no score: ESPN's play says so. It is
  // told first, whatever else moved meanwhile - a kickoff returned for a
  // score must not swallow it (Codex, #119).
  // The touchdown's own play is found by its score, so a later score by
  // either side cannot hide it (Codex, #119).
  // Not once the touchdown itself is taken back, and not when the score has
  // just moved by a try's one or two: the score wins over words ESPN has
  // not caught up (Codex, #119).
  const dTry = st.tryq ? cur[st.tryq.side] - st.tryq.score : -1;
  if (!gap && awaitingTry(st, now) && dTry >= 0 && dTry !== 1 && dTry !== 2) {
    const side = st.tryq.side, at = st.tryq.score;
    const pl = (plays || []).filter(function (q) { return q.side === side && q[side] === at && q.type !== "FG"; }).pop();
    const tr = pl ? tryOf(pl.text) : null;
    if (tr === "xpmiss" || tr === "2ptfail") {
      n += 1;
      // the score as the touchdown left it, to match the play's clock (Codex, #119)
      out.push({ event: "score:" + n, scores: st.tryq.scores || b, x: Object.assign({ scorer: side, ours: false, kind: tr }, playX(pl), { play: undefined }) });
      next.tryq = null; next.tried = { side, at: now };
    }
  }
  // start again from what it is now: nothing announced before the gap can
  // be corrected after it (Codex, #116)
  if (gap) { next.base = cur; next.pend = null; next.tryq = null; next.hist = { us: [], them: [] }; }
  else if (!moved) next.pend = null;
  else if (cur.us < b.us || cur.them < b.them) {
    // every announced score on each side that the new score takes back: the
    // devices that got any of them get the correction (Codex, #116)
    const h = hist(), of = [];
    // Only the side that went down is corrected now; a side that went up in
    // the same minute is left for the score rule to announce (Codex, #116).
    const fixed = { us: Math.min(cur.us, b.us), them: Math.min(cur.them, b.them) };
    for (const side of ["us", "them"]) {
      let popped = false;
      while (h[side].length && h[side][h[side].length - 1][1] > fixed[side]) { of.push(h[side].pop()[0]); popped = true; }
      // the correction itself stands in for what it took back, so a second
      // correction of the same score reaches the same devices (Codex, #116)
      if (popped) h[side].push(["fix:" + (n + 1), fixed[side]]);
    }
    next.hist = h;
    n += 1;
    out.push({ event: "fix:" + n, scores: fixed, x: { lost: cur.us < b.us ? "us" : "them", ours: fixed.us !== b.us, of } });
    next.base = fixed; next.pend = null;
    // the wait for a try ends only if this takes back its touchdown (Codex, #119)
    if (next.tryq && fixed[next.tryq.side] < next.tryq.score) next.tryq = null;
  } else {
    const held = st.pend && st.pend.us === cur.us && st.pend.them === cur.them;
    const pd = st.pend;
    // ESPN's own scoring play at exactly this score confirms it: told now,
    // without the minute's hold (David, 2026-10-10).
    const sure = !!(plays && plays.some(function (q) { return q.us === cur.us && q.them === cur.them; }));
    // A pending score that the game moved on from - its touchdown's own try,
    // or anything more - has held: it is told now, and what came after waits
    // its own minute (David, 2026-10-10; Codex, #119) - or, as a quarter
    // ends, is told straight after it.
    if (!held && pd && cur.us >= pd.us && cur.them >= pd.them) {
      announce(b, { us: pd.us, them: pd.them });
      if (flush || sure) { announce({ us: pd.us, them: pd.them }, cur); next.pend = null; }
      else next.pend = { us: cur.us, them: cur.them, at: now };
    } else if (!(held || flush || sure || (st.pend && now - st.pend.at >= LIMITS.settle))) {
      next.pend = { us: cur.us, them: cur.them, at: st.pend ? st.pend.at : now };
    } else {
      announce(b, cur);
      next.pend = null;
    }
  }
  const won = n === row.seq
    ? db.run("UPDATE live SET seq = seq + 1, st = ? WHERE team_id = ? AND game_id = ? AND seq = ?", JSON.stringify(next), teamId, game.id, row.seq).changes
    : db.run("UPDATE live SET seq = ?, st = ? WHERE team_id = ? AND game_id = ? AND seq = ?", n, JSON.stringify(next), teamId, game.id, row.seq).changes;
  if (gap) out.forEach(function (e) { e.late = true; });
  return won ? out : [];
}

// Send what is due. Each follower's alert uses the team name their own app
// sent, so no subscription can put words in another's (Codex, PR #102). A
// push service that takes it ends it; one that has dropped the subscription
// removes it; anything else - a 429, a 5xx, no answer - is tried again the
// next minute, up to LIMITS.tries, and a kickoff only while it is news.
async function deliver(db, env, teamId, now, log, retry) {
  const due = db.all("SELECT d.game_id, d.event, d.endpoint, d.tries, d.at, d.data, s.team_name, s.p256dh, s.auth" +
                     " FROM deliveries d JOIN subs s ON s.endpoint = d.endpoint AND s.team_id = d.team_id" +
                     " WHERE d.team_id = ? AND d.state = 'due' ORDER BY d.at, d.rowid", teamId);   // in the order they happened
  if (!due.length) return;
  const jwk = await vapidKey(db, env);
  const tally = {};
  // A device whose earlier alert is still waiting to be retried gets
  // nothing later until it goes, so a quarter's alert never arrives before
  // the score that it carries (Codex, #116).
  const held = new Set();
  for (const d of due) {
    const key = [teamId, d.game_id, d.event, d.endpoint];
    const t = tally[d.event] = tally[d.event] || { sent: 0, retry: 0, gone: 0, dropped: 0 };
    // A kickoff time is no news once the game is on: once its kickoff has
    // been seen, not at the listed time, which a start can trail (Codex,
    // #140) - and never past LIMITS.window after it.
    const kickoffAt = /^time:/.test(d.event) ? Date.parse(d.event.slice(5).split("#")[0]) : NaN;
    const started = isFinite(kickoffAt) && (now - kickoffAt > LIMITS.window ||
      db.all("SELECT 1 FROM sent WHERE game_id = ? AND event = 'kickoff'", d.game_id).length > 0);
    // The rankings are the night's news; by the next day they are not.
    // Selection Day's reminder is no news once the show has begun, nor a
    // game's being set once it has kicked off.
    const x0 = /^(sel|post):/.test(d.event) ? (JSON.parse(d.data).x || {}) : null;
    const stale = (/^cfp:/.test(d.event) && now - d.at > LIMITS.cfpFresh) ||
                  (!!x0 && isFinite(Date.parse(x0.at)) && now >= Date.parse(x0.at));
    if ((d.event === "kickoff" && now - d.at > LIMITS.kickoffLate) || (live(d.event) && now - d.at > LIMITS.liveLate) || started || stale) {
      db.run("UPDATE deliveries SET state = 'expired' WHERE team_id = ? AND game_id = ? AND event = ? AND endpoint = ?", ...key);
      t.dropped++; continue;
    }
    if (held.has(d.endpoint)) { t.retry++; continue; }
    // a retry only on the minute; this device's later alerts wait behind it
    if (retry === false && d.tries > 0) { held.add(d.endpoint); t.retry++; continue; }
    // Claim it, so an overlapping run cannot send it too.
    if (!db.run("UPDATE deliveries SET state = 'sending' WHERE team_id = ? AND game_id = ? AND event = ? AND endpoint = ? AND state = 'due'", ...key).changes) continue;
    const x = JSON.parse(d.data), w = words(d.event, { id: teamId, name: d.team_name }, x.game, x.scores, x.x);
    if (!w) { db.run("UPDATE deliveries SET state = 'failed' WHERE team_id = ? AND game_id = ? AND event = ? AND endpoint = ?", ...key); t.dropped++; continue; }
    // Score, quarter and halftime alerts replace one another on the lock
    // screen (one card per game, §2b 4); the phone still sounds each time.
    // A new kickoff time replaces the last one's card; it opens that game.
    const tag = live(d.event) ? d.game_id + "-live" : d.game_id + "-" + (isFinite(kickoffAt) ? "time" : d.event);
    const where = isFinite(kickoffAt) || /^post(off)?:/.test(d.event) ? "#schedule/" + d.game_id
                : /^(cfp|sel):/.test(d.event) ? "#top25/rankings/cfp" : /^nopost:/.test(d.event) ? "#home" : "#game";
    const msg = { title: w.title, body: w.body, url: APP_URL + where, tag, renotify: live(d.event) };
    if (w.kickoff) { msg.kickoff = w.kickoff; if (w.network) msg.network = w.network; }
    const code = await sendPush(env, jwk, { endpoint: d.endpoint, p256dh: d.p256dh, auth: d.auth }, msg, now);
    let state;
    if (code >= 200 && code < 300) { state = "done"; t.sent++; }
    else if (code === 404 || code === 410) { state = "gone"; t.gone++; db.run("DELETE FROM subs WHERE endpoint = ?", d.endpoint); }
    else if (d.tries + 1 >= LIMITS.tries) { state = "failed"; t.dropped++; }
    else { state = "due"; t.retry++; held.add(d.endpoint); }
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
    if (op === "tick") out = { status: 200, body: { log: await minute(this.db, this.env, Date.now, function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); }) } };
    else if (op === "status") out = { status: 200, body: report(this.db) };
    else if (op === "key") out = { status: 200, body: { key: vapidPublic(await vapidKey(this.db, this.env)) } };
    else if (op === "subscribe") out = await subscribe(this.db, this.env, await request.json(), now);
    else if (op === "unsubscribe") out = unsubscribe(this.db, await request.json());
    else out = { status: 404, body: { error: "no such operation" } };
    return new Response(JSON.stringify(out.body), { status: out.status, headers: { "content-type": "application/json" } });
  }
}
