#!/usr/bin/env python3
"""Every week's rankings for a season, kept: the Top 25 week selector's data.

    python3 tools/producers/rankings_history.py [--season 2026]

Writes data/league/rankings-<season>.json and data/league/fpi-history-<season>.json
(David, 2026-10-20: "keep them per week ... don't lose the old ones"). ESPN's
rankings feed answers only the current week, so each released week is read
from ESPN's core API, which keeps them all, and stored:

  polls   AP, Coaches and CFP: every week ESPN has released - preseason
          (season type 1), the regular season's weeks (type 2) and the final
          poll (type 3) - the top 25 of each, with the previous rank, record,
          points and first-place votes ESPN gives. A first run fills the whole
          season so far; later runs read only the weeks not yet kept and the
          latest kept one, which ESPN can still correct.
  fpi     data/league/fpi.json as it stood at each of its weeks, from the week
          this began: FPI publishes no history, so none can be filled in. Its
          own file: a whole table a week, read only for an earlier FPI week.
  teams   the name and abbreviation of every team ranked, by ESPN id, read
          once each from the core API.

A week that fails validation - fewer than 25 ranked, a rank out of order, a
team twice, a team with no id - is refused with a reason and whatever was
kept for it stays. Nothing already kept is ever dropped.
"""
import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
CORE = "https://sports.core.api.espn.com/v2/sports/football/leagues/college-football"
# ESPN's own ids for the three polls Suite shows.
POLLS = {"ap": "1", "coaches": "2", "cfp": "21"}
# Season types: 1 preseason, 2 regular season, 3 postseason.
TYPES = (1, 2, 3)


class Refused(ValueError):
    """One week's poll is not a complete top 25."""


def out_path(season, name="rankings"):
    return os.path.join(ROOT, "data", "league", "%s-%d.json" % (name, season))


def read(path):
    try:
        with open(path) as f:
            return json.load(f)
    except (FileNotFoundError, ValueError):
        return {}


def write(path, data, label):
    """Write `data` if it differs from what is there; say what happened."""
    body = json.dumps(data, indent=1, ensure_ascii=False) + "\n"
    try:
        with open(path) as f:
            if f.read() == body:
                print("%s: nothing new" % label)
                return
    except FileNotFoundError:
        pass
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write(body)
    print("%s: written" % label)


def week_id(stype, n):
    """The week as the route names it: pre, w1..wN, final."""
    return "pre" if stype == 1 else "final" if stype == 3 else "w%d" % n


def week_label(stype, n, payload):
    if stype == 1:
        return "Preseason"
    if stype == 3:
        return "Final"
    occ = payload.get("occurrence") or {}
    return str(occ.get("displayValue") or "Week %d" % n)


def team_id(ref):
    m = re.search(r"/teams/(\d+)", str(ref or ""))
    return m.group(1) if m else None


def normalize(payload, stype, n):
    """One core-API poll -> a kept week, or Refused with the reason."""
    if not isinstance(payload, dict) or not isinstance(payload.get("ranks"), list):
        raise Refused("no ranks")
    rows, seen, last = [], set(), 0
    for r in payload["ranks"]:
        rank = r.get("current")
        tid = team_id((r.get("team") or {}).get("$ref"))
        if not isinstance(rank, int) or rank < 1:
            raise Refused("a rank that is not a number: %r" % (rank,))
        if rank < last:
            raise Refused("ranks out of order at %d" % rank)
        if not tid:
            raise Refused("a ranked team with no id")
        if tid in seen:
            raise Refused("team %s ranked twice" % tid)
        last = rank
        seen.add(tid)
        prev = r.get("previous")
        rows.append({
            "rank": rank,
            # ESPN's previous rank; 0 is new to the poll. The preseason poll
            # has nothing before it, so nothing there is "new".
            "previous": None if stype == 1 or not isinstance(prev, int) or prev < 0 else prev,
            "id": tid,
            "record": str((r.get("record") or {}).get("summary") or ""),
            "points": r.get("points") if isinstance(r.get("points"), (int, float)) else None,
            "firstPlace": r.get("firstPlaceVotes") if isinstance(r.get("firstPlaceVotes"), int) else None,
        })
    if len(rows) < 25:
        raise Refused("%d ranked, not 25" % len(rows))
    return {
        "id": week_id(stype, n),
        "type": stype,
        "week": n,
        "label": week_label(stype, n, payload),
        "name": str(payload.get("name") or ""),
        "date": payload.get("date"),
        "updated": payload.get("lastUpdated") or payload.get("date"),
        "ranks": rows,
    }


def order(weeks):
    return sorted(weeks, key=lambda w: (w["type"], w["week"]))


def fetch_json(url):
    req = urllib.request.Request(url.replace("http://", "https://"), headers={"User-Agent": "Suite rankings history"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def weeks_of(fetch, season, stype):
    """The week numbers ESPN lists for a season type (1 for pre and post)."""
    if stype != 2:
        return [1]
    data = fetch("%s/seasons/%d/types/2/weeks?limit=30" % (CORE, season))
    out = []
    for item in data.get("items") or []:
        m = re.search(r"/weeks/(\d+)", str(item.get("$ref", "")))
        if m:
            out.append(int(m.group(1)))
    return sorted(out)


def released(fetch, season, stype, n):
    """The poll ids ESPN has released for one week ({} for a week to come)."""
    try:
        data = fetch("%s/seasons/%d/types/%d/weeks/%d/rankings" % (CORE, season, stype, n))
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return set()
        raise
    ids = set()
    for item in data.get("items") or []:
        m = re.search(r"/rankings/(\d+)", str(item.get("$ref", "")))
        if m:
            ids.add(m.group(1))
    return ids


def collect(season, kept, fetch, log=print):
    """Read what is new since `kept` (the file as it stands, or {})."""
    polls = {k: list((kept.get("polls") or {}).get(k) or []) for k in POLLS}
    teams = dict(kept.get("teams") or {})
    have = {k: {w["id"]: i for i, w in enumerate(polls[k])} for k in POLLS}
    # The latest kept week of each poll is read again: ESPN corrects a poll
    # in the days after it is released.
    again = {k: (order(polls[k])[-1]["id"] if polls[k] else None) for k in POLLS}
    for stype in TYPES:
        # Once a season is filled, a poll still missing for a week well behind
        # the newest kept one is not coming (no CFP release in September):
        # only the last few weeks are asked about again.
        newest = max([w["week"] for k in POLLS for w in polls[k] if w["type"] == stype] or [0])
        for n in weeks_of(fetch, season, stype):
            wid = week_id(stype, n)
            want = [k for k in POLLS if wid == again[k] or (wid not in have[k] and n >= newest - 2)
                    and not (k == "cfp" and stype == 1)]          # the committee has no preseason
            if not want:
                continue
            ids = released(fetch, season, stype, n)
            for key in want:
                if POLLS[key] not in ids:
                    continue
                url = "%s/seasons/%d/types/%d/weeks/%d/rankings/%s" % (CORE, season, stype, n, POLLS[key])
                try:
                    week = normalize(fetch(url), stype, n)
                except Refused as e:
                    log("refused %s %s: %s" % (key, wid, e))
                    continue
                if wid in have[key]:
                    polls[key][have[key][wid]] = week
                else:
                    have[key][wid] = len(polls[key])
                    polls[key].append(week)
                for r in week["ranks"]:
                    if r["id"] not in teams:
                        t = fetch("%s/seasons/%d/teams/%s" % (CORE, season, r["id"]))
                        teams[r["id"]] = {"name": str(t.get("nickname") or t.get("location") or t.get("shortDisplayName") or ""),
                                          "abbr": str(t.get("abbreviation") or "")}
    return {k: order(v) for k, v in polls.items()}, teams


def keep_fpi(kept, snapshot, season):
    """FPI as it stands, kept once per FPI week of this season."""
    fpi = list(kept.get("weeks") or [])
    if not isinstance(snapshot, dict) or snapshot.get("season") != season or not snapshot.get("week"):
        return fpi
    wid = week_id(snapshot.get("seasonType") or 2, snapshot["week"])
    fpi = [w for w in fpi if w.get("id") != wid]          # the week's latest edition wins
    fpi.append({"id": wid, "type": snapshot.get("seasonType") or 2, "week": snapshot["week"],
                "label": snapshot.get("weekText") or "Week %d" % snapshot["week"], "snapshot": snapshot})
    return order(fpi)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--season", type=int, required=True)
    a = ap.parse_args()
    path, fpi_path = out_path(a.season), out_path(a.season, "fpi-history")
    fpi = keep_fpi(read(fpi_path), read(os.path.join(ROOT, "data", "league", "fpi.json")), a.season)
    write(fpi_path, {"schema": 1, "source": "fpi", "season": a.season, "weeks": fpi},
          "fpi history %d (%d weeks)" % (a.season, len(fpi)))
    polls, teams = collect(a.season, read(path), fetch_json)
    # The FPI weeks kept, without their tables: enough for the week list,
    # so the whole history is fetched only when an earlier week is picked.
    index = [{"id": w["id"], "type": w["type"], "week": w["week"], "label": w["label"],
              "updated": w["snapshot"].get("sourceUpdated")} for w in fpi]
    write(path, {"schema": 1, "source": "espn-core", "season": a.season, "polls": polls, "fpi": index,
                 "teams": dict(sorted(teams.items(), key=lambda kv: int(kv[0])))},
          "rankings %d (%s)" % (a.season, ", ".join("%s %d weeks" % (k, len(v)) for k, v in polls.items())))
    return 0


if __name__ == "__main__":
    sys.exit(main())
