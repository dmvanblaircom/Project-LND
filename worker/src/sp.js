/* SP+ week by week (David, 2026-10-21, option A).

   CFBD publishes only the current SP+ table, so earlier weeks exist only if
   they are kept as they appear. They are kept here, in the Worker's own
   Durable Object, and never as a file: CFBD's condition is that its data is
   shown, not published as reusable JSON (decision 0012; Bill, 2026-09-29).
   What is kept is exactly what the SP+ route already shows - the top 25,
   each row's rank, school, id and rating (Bill, Oct 1) - one table per
   edition.

   An edition is a table that differs from the one before it. It is filed
   under the football week ESPN's scoreboard names when it is first seen
   (pre, w1..wN, final - the ids the rankings history uses), and a different
   table seen again on the same day replaces that day's (a correction, not a
   new week). Nothing kept is ever dropped. */

const SITE = "https://site.api.espn.com/apis/site/v2/sports/football/college-football";
// A season has about twenty editions; this only stops a broken feed from
// growing the store without end.
export const SP_KEEP_MAX = 40;
// The half-hourly clock reads SP+ itself only when no read has filed a
// table for this long, so a week is kept even when no fan opens SP+.
export const SP_DUE = 12 * 3600e3;

export function migrateSp(db) {
  db.exec("CREATE TABLE IF NOT EXISTS sp_weeks (year INTEGER NOT NULL, id TEXT NOT NULL, label TEXT NOT NULL," +
          " seen TEXT NOT NULL, ranks TEXT NOT NULL, PRIMARY KEY (year, id))");
  // The last table read for a season, when, and the edition it is.
  db.exec("CREATE TABLE IF NOT EXISTS sp_last (year INTEGER PRIMARY KEY, at INTEGER NOT NULL, id TEXT, ranks TEXT NOT NULL)");
}

// ESPN's scoreboard -> the football week it is now, for `year`'s season, or
// null. A scoreboard already on a later season means this one is over.
export function weekOf(board, year) {
  const s = board && board.season, w = board && board.week;
  if (!s || !Number.isInteger(s.year)) return null;
  if (s.year > year) return { id: "final", label: "Final" };
  if (s.year !== year) return null;
  if (s.type === 1) return { id: "pre", label: "Preseason" };
  if (s.type === 3 || s.type === 4) return { id: "final", label: "Final" };
  if (s.type === 2 && w && Number.isInteger(w.number) && w.number > 0) return { id: "w" + w.number, label: "Week " + w.number };
  return null;
}

function day(ms) { return new Date(ms).toISOString().slice(0, 10); }

// The editions kept for a season, oldest first, without their tables.
export function spWeeks(db, year) {
  return db.all("SELECT id, label, seen FROM sp_weeks WHERE year = ? ORDER BY seen", year)
           .map(function (r) { return { id: r.id, label: r.label, seen: r.seen }; });
}

export function spWeek(db, year, id) {
  const r = db.all("SELECT id, label, seen, ranks FROM sp_weeks WHERE year = ? AND id = ?", year, id)[0];
  return r ? { id: r.id, label: r.label, seen: r.seen, ranks: JSON.parse(r.ranks) } : null;
}

// A whole table just read from CFBD (the route has checked it). `week` is
// ESPN's week now, or null when ESPN could not say: the table is then held
// unfiled and filed on a later read. Returns the edition's id, or null.
export function keepSp(db, year, ranks, now, week) {
  const text = JSON.stringify(ranks);
  const last = db.all("SELECT at, id, ranks FROM sp_last WHERE year = ?", year)[0];
  const save = function (id) {
    db.run("INSERT INTO sp_last (year, at, id, ranks) VALUES (?, ?, ?, ?) ON CONFLICT (year) DO UPDATE SET" +
           " at = excluded.at, id = excluded.id, ranks = excluded.ranks", year, now, id, text);
    return id;
  };
  if (last && last.ranks === text && last.id) return save(last.id);       // the same edition, read again
  if (!week) return save(null);
  // The newest edition: the same day's is corrected in place; any other day
  // starts a new edition - under this week's id, or, when this week already
  // has one (SP+ moved twice in a week), that id with the day.
  const newest = db.all("SELECT id, seen FROM sp_weeks WHERE year = ? ORDER BY seen DESC LIMIT 1", year)[0];
  if (newest && newest.seen.slice(0, 10) === day(now)) {
    db.run("UPDATE sp_weeks SET ranks = ? WHERE year = ? AND id = ?", text, year, newest.id);
    return save(newest.id);
  }
  const count = db.all("SELECT COUNT(*) AS n FROM sp_weeks WHERE year = ?", year)[0].n;
  if (count >= SP_KEEP_MAX) return save(null);
  const taken = db.all("SELECT 1 FROM sp_weeks WHERE year = ? AND id = ?", year, week.id).length > 0;
  const id = taken ? week.id + "-" + day(now) : week.id;
  db.run("INSERT INTO sp_weeks (year, id, label, seen, ranks) VALUES (?, ?, ?, ?, ?)",
         year, id, week.label, new Date(now).toISOString(), text);
  return save(id);
}

// Which kept edition a table is (the one just served), or null.
export function spIdOf(db, year, ranks) {
  const last = db.all("SELECT id, ranks FROM sp_last WHERE year = ?", year)[0];
  return last && last.id && last.ranks === JSON.stringify(ranks) ? last.id : null;
}

// Whether the clock should read SP+ for `year`: no table filed for SP_DUE.
export function spDue(db, year, now) {
  const last = db.all("SELECT at, id FROM sp_last WHERE year = ?", year)[0];
  return !last || !last.id || now - last.at >= SP_DUE;
}

async function espnWeek(env, year) {
  try {
    const r = await (env.FETCH || fetch)(SITE + "/scoreboard", { headers: { accept: "application/json" } });
    return r.ok ? weekOf(await r.json(), year) : null;
  } catch (e) { return null; }
}

// state.storage.sql as the small interface above (node:sqlite in the tests).
function sqlite(sql) {
  return {
    exec: function (q) { sql.exec(q); },
    all: function (q) { return sql.exec.apply(sql, arguments).toArray(); },
    run: function () { sql.exec.apply(sql, arguments).toArray(); }
  };
}

// The store: one Durable Object, asked by the route and the clock.
//   POST /keep  { year, ranks }  file a table just read; -> { id, weeks }
//   POST /which { year, ranks }  -> { id, weeks } for a table being served
//   GET  /week?year=&id=         -> one kept edition, or 404
//   GET  /due?year=              -> { due }
export async function spOp(db, env, op, input, now) {
  const year = Number(input.year);
  if (!Number.isInteger(year)) return { status: 400, body: { error: "year is required" } };
  if (op === "keep") {
    if (!Array.isArray(input.ranks) || !input.ranks.length) return { status: 400, body: { error: "ranks are required" } };
    const last = db.all("SELECT id, ranks FROM sp_last WHERE year = ?", year)[0];
    const same = last && last.id && last.ranks === JSON.stringify(input.ranks);
    const id = keepSp(db, year, input.ranks, now, same ? null : await espnWeek(env, year));
    return { status: 200, body: { id: id, weeks: spWeeks(db, year) } };
  }
  if (op === "which") return { status: 200, body: { id: Array.isArray(input.ranks) ? spIdOf(db, year, input.ranks) : null, weeks: spWeeks(db, year) } };
  if (op === "week") {
    const w = spWeek(db, year, String(input.id || ""));
    return w ? { status: 200, body: w } : { status: 404, body: { error: "no such week" } };
  }
  if (op === "due") return { status: 200, body: { due: spDue(db, year, now) } };
  return { status: 404, body: { error: "no such operation" } };
}

export class Ratings {
  constructor(state, env) {
    this.env = env || {};
    this.db = sqlite(state.storage.sql);
    migrateSp(this.db);
  }
  async fetch(request) {
    const url = new URL(request.url), op = url.pathname.slice(1);
    const input = request.method === "POST" ? await request.json() : Object.fromEntries(url.searchParams);
    const out = await spOp(this.db, this.env, op, input, Date.now());
    return new Response(JSON.stringify(out.body), { status: out.status, headers: { "content-type": "application/json" } });
  }
}
