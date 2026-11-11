#!/usr/bin/env python3
"""Every FBS team's turnovers and yards allowed, added up from ESPN's own box
scores, and the two FBS ranks ESPN gets wrong - a league snapshot.

    python3 tools/producers/season_stats.py [--season 2026] [--out PATH]
    python3 tools/producers/season_stats.py due --last .cadence/season-stats

Writes data/league/season-stats.json (David, 2026-11-10: "only use CFBD's
data if absolutely necessary, otherwise we rely on ESPN's"). For each of the
registry's programs, keyed by ESPN team id:

  games, takeaways, giveaways   from every completed game's box score
                                (`turnovers` of each side), regular season
                                and postseason
  rushAllowed, passAllowed      what opponents gained per game: the site
                                API's `opponent` section, the figures the
                                Stats screen already shows
  ranks.passOffense             the FBS rank of ESPN's own net passing yards
                                per game (the value the app shows; ESPN's
                                rank counts all of Division I)
  ranks.turnoverMargin          the FBS rank of the margin above

Checked against the NCAA's own FBS tables on 2026-11-11, all 138 programs
(docs/engineering/espn-accuracy-2026-11-11.md): the box-score turnover margin
agreed for 136 (99%), ESPN's season totals for 11 (8%), and
CollegeFootballData's for 93% on 2026-10-27; the opponent section's yards
allowed per game for 137 (rushing) and 138 (passing). ESPN asks for no key
and has no quota.

A team whose box scores do not account for every game its schedule calls
final is left out (its rows show a dash) rather than shown short. A snapshot
with fewer than MIN_TEAMS teams is refused and the last good one stays.
"""
import argparse
import json
import os
import re
import sys
import time
import urllib.request
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(ROOT, "data", "league", "season-stats.json")
SITE = "https://site.api.espn.com/apis/site/v2/sports/football/college-football"
CORE = "https://sports.core.api.espn.com/v2/sports/football/leagues/college-football"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
MIN_TEAMS = 120          # FBS is 130-odd programs; fewer means a broken read
EVERY_HOURS = 20         # once a day: these move only when a team plays


class Refused(ValueError):
    """The snapshot is not complete enough to replace the last one."""


def num(v):
    try:
        f = float(str(v).replace(",", ""))
    except (TypeError, ValueError):
        return None
    return f if f == f and abs(f) != float("inf") else None


def get(url, tries=3):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except Exception:  # noqa: BLE001 - a miss is retried, then counted
            time.sleep(2 * (i + 1))
    return None


def registry():
    """The registry's programs: [(ESPN id, name)]."""
    text = open(os.path.join(ROOT, "teams", "index.js"), encoding="utf-8").read()
    return [(pid, name) for name, pid in re.findall(r'name:\s*"([^"]+)".*?providerId:\s*"(\d+)"', text)]


# --- pure: payloads -> figures ----------------------------------------------

def completed_ids(schedules):
    """Schedule payloads (regular season, postseason) -> the ids of the games
    ESPN calls final, in order, once each."""
    out = []
    for sched in schedules:
        for ev in (sched or {}).get("events") or []:
            comp = (ev.get("competitions") or [{}])[0]
            st = (comp.get("status") or {}).get("type") or {}
            if (st.get("completed") is True or st.get("state") == "post") and ev.get("id") not in out:
                out.append(str(ev.get("id")))
    return out


def side_stats(summary, team_id):
    """One game's box score -> (ours, theirs) as {name: number}, or None when
    the box score does not carry both sides."""
    teams = ((summary or {}).get("boxscore") or {}).get("teams") or []
    if len(teams) != 2:
        return None
    def stats(t):
        return {s.get("name"): num(s.get("displayValue")) for s in t.get("statistics") or []}
    us = [t for t in teams if str((t.get("team") or {}).get("id")) == str(team_id)]
    them = [t for t in teams if str((t.get("team") or {}).get("id")) != str(team_id)]
    if len(us) != 1 or len(them) != 1:
        return None
    return stats(us[0]), stats(them[0])


def team_figures(team_id, game_ids, summaries):
    """Every final game's box score -> the team's season figures, or None when
    any final game has no usable box score (a short season is not shown)."""
    games = taken = given = 0
    for gid in game_ids:
        pair = side_stats(summaries.get(gid), team_id)
        if not pair:
            return None
        us, them = pair
        if us.get("turnovers") is None or them.get("turnovers") is None:
            return None
        games += 1
        given += us["turnovers"]
        taken += them["turnovers"]
    if not games:
        return {"games": 0}
    return {"games": games, "takeaways": int(taken), "giveaways": int(given)}


def allowed(site):
    """The site API's team statistics -> (rushing, passing) yards its
    opponents gained per game, to one decimal, or None for either."""
    def per(cat, name):
        for c in ((site or {}).get("results") or {}).get("opponent") or []:
            if c.get("name") == cat:
                for s in c.get("stats") or []:
                    if s.get("name") == name:
                        v = num(s.get("value"))
                        return round(v, 1) if v is not None else None
        return None
    return per("rushing", "rushingYardsPerGame"), per("passing", "netPassingYardsPerGame")


def core_pass_per_game(core):
    """The core API's season statistics -> net passing yards per game, the
    value the Matchup card and Stats show, or None."""
    for c in ((core or {}).get("splits") or {}).get("categories") or []:
        if c.get("name") == "passing":
            for s in c.get("stats") or []:
                if s.get("name") == "netPassingYardsPerGame":
                    return num(s.get("value"))
    return None


def rank(values):
    """{id: value} -> {id: {rank, tied}}, more is better; a shared value
    shares the best place ("Tied-5th"), as ESPN prints it."""
    order = sorted(values.items(), key=lambda kv: -kv[1])
    count = {}
    for _, v in order:
        count[v] = count.get(v, 0) + 1
    out, place = {}, 0
    for i, (k, v) in enumerate(order):
        if i == 0 or v != order[i - 1][1]:
            place = i + 1
        out[k] = {"rank": place, "tied": count[v] > 1}
    return out


def build(season, figures, passing, yards=None):
    """Per-team figures -> the snapshot, or Refused."""
    have = {tid: f for tid, f in figures.items() if f and f.get("games")}
    if len(have) < MIN_TEAMS:
        raise Refused("%d teams with a whole season of box scores, fewer than %d" % (len(have), MIN_TEAMS))
    margin = {tid: f["takeaways"] - f["giveaways"] for tid, f in have.items()}
    pass_rank = rank({tid: v for tid, v in passing.items() if v is not None and tid in have})
    margin_rank = rank(margin)
    out = {}
    for tid, f in sorted(have.items(), key=lambda kv: int(kv[0])):
        row = dict(f)
        ra, pa = (yards or {}).get(tid, (None, None))
        if ra is not None:
            row["rushAllowed"] = ra
        if pa is not None:
            row["passAllowed"] = pa
        r = {}
        if tid in pass_rank:
            r["passOffense"] = pass_rank[tid]
        r["turnoverMargin"] = margin_rank[tid]
        row["ranks"] = r
        out[tid] = row
    return {"source": "espn-box-scores", "season": season, "teams": out}


# --- run --------------------------------------------------------------------

def due(last, now):
    """Whether a build is due: no record of the last one, an unreadable one,
    or one at least EVERY_HOURS old. When in doubt, build."""
    try:
        with open(last, encoding="utf-8") as f:
            then = datetime.strptime(f.read().strip(), "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
    except (OSError, ValueError):
        return True
    return (now - then).total_seconds() >= EVERY_HOURS * 3600


def fetch(season, teams, log=print):
    summaries, figures, passing, yards, missing = {}, {}, {}, {}, []
    for i, (tid, name) in enumerate(teams):
        scheds = [get("%s/teams/%s/schedule?season=%d&seasontype=%d" % (SITE, tid, season, t)) for t in (2, 3)]
        ids = completed_ids(scheds)
        for gid in ids:
            if gid not in summaries:
                summaries[gid] = get("%s/summary?event=%s" % (SITE, gid))
        f = team_figures(tid, ids, summaries)
        if f is None:
            missing.append(name)
        figures[tid] = f
        passing[tid] = core_pass_per_game(get("%s/seasons/%d/types/2/teams/%s/statistics" % (CORE, season, tid)))
        yards[tid] = allowed(get("%s/teams/%s/statistics?season=%d" % (SITE, tid, season)))
        if i % 25 == 0:
            log("  ... %d/%d" % (i + 1, len(teams)))
    if missing:
        log("left out, a final game without a usable box score: %s" % ", ".join(missing))
    return figures, passing, yards


def write(out, snap):
    previous = None
    if os.path.exists(out):
        try:
            previous = json.load(open(out, encoding="utf-8"))
        except ValueError:
            previous = None
    if previous:
        kept = dict(previous); kept.pop("builtAt", None)
        if kept == snap:
            print("unchanged: nothing written")
            return False
    snap = dict(snap, builtAt=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(snap, f, indent=1, sort_keys=True)
        f.write("\n")
    print("wrote %s: %d teams" % (os.path.relpath(out, ROOT), len(snap["teams"])))
    return True


def main(argv):
    if argv[:1] == ["due"]:
        p = argparse.ArgumentParser()
        p.add_argument("cmd"); p.add_argument("--last", required=True)
        a = p.parse_args(argv)
        if due(a.last, datetime.now(timezone.utc)):
            print("due"); return 0
        print("built within %d hours: not due" % EVERY_HOURS); return 3
    p = argparse.ArgumentParser()
    p.add_argument("--season", type=int)
    p.add_argument("--out", default=OUT)
    a = p.parse_args(argv)
    now = datetime.now(timezone.utc)
    season = a.season or (now.year if now.month >= 7 else now.year - 1)
    teams = registry()
    if not teams:
        print("refused: could not read the registry"); return 1
    figures, passing, yards = fetch(season, teams)
    try:
        snap = build(season, figures, passing, yards)
    except Refused as e:
        print("refused: %s - the last snapshot stays" % e)
        return 1
    write(a.out, snap)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
