#!/usr/bin/env python3
"""ESPN's Football Power Index, every FBS team, as a league snapshot.

    python3 tools/producers/fpi.py [--season 2026] [--from-file payload.json]

Writes data/league/fpi.json (W07, issue #29): one row per team with ESPN's
team id, FPI rank and rating, the 7-day rank change ESPN publishes, and the
record, plus the edition it belongs to (season, week) and when ESPN says it
last updated. FPI is a predictive rating, not a poll: no votes, no blending.

The file changes only when ESPN publishes a new edition (its lastUpdated
moves), so a run that finds the same table commits nothing. A table that
fails validation - wrong season, too few teams, a duplicate, a column ESPN
renamed - is refused with a reason and the previous snapshot stays: a
broken source never replaces good data.
"""
import argparse
import json
import math
import os
import sys
import urllib.request
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(ROOT, "data", "league", "fpi.json")
URL = ("https://site.web.api.espn.com/apis/fitt/v3/sports/football/college-football/powerindex"
       "?region=us&lang=en&season=%d&limit=200")
PAGE = "https://www.espn.com/college-football/fpi"
MIN_TEAMS = 120          # FBS is 130-odd teams; fewer means a partial table


class Refused(ValueError):
    """The payload is not a complete, current FPI table."""


def _num(v):
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return f if math.isfinite(f) else None


def normalize(payload, season=None):
    """ESPN's powerindex payload -> the snapshot, or Refused with the reason."""
    if not isinstance(payload, dict) or not isinstance(payload.get("teams"), list):
        raise Refused("no teams list")
    req = payload.get("requestedSeason") or {}
    year = req.get("year")
    if season is not None and year != season:
        raise Refused("season %s, expected %s" % (year, season))
    cats = {c.get("name"): c for c in payload.get("categories") or [] if isinstance(c, dict)}
    names = (cats.get("fpi") or {}).get("names") or []
    col = {n: i for i, n in enumerate(names)}
    if "fpi" not in col or "fpirank" not in col:
        raise Refused("FPI columns not found (ESPN changed the table?)")

    rows, seen = [], set()
    for t in payload["teams"]:
        team = t.get("team") or {}
        tid = str(team.get("id") or "")
        vals = next((c.get("values") for c in t.get("categories") or [] if c.get("name") == "fpi"), None)
        if not tid or not isinstance(vals, list):
            raise Refused("a row without a team id or FPI values")
        if tid in seen:
            raise Refused("team %s listed twice" % tid)
        seen.add(tid)

        def get(name):
            i = col.get(name)
            return _num(vals[i]) if i is not None and i < len(vals) else None

        rank, rating = get("fpirank"), get("fpi")
        if rank is None or rating is None or rank != int(rank) or rank < 1:
            raise Refused("team %s has no usable rank or rating" % tid)
        w, l, tie = get("numwins"), get("numlosses"), get("numties")
        change = get("rankchange7days")
        rows.append({
            "espnId": tid,
            "name": team.get("nickname") or team.get("shortDisplayName") or team.get("displayName"),
            "abbr": team.get("abbreviation"),
            "rank": int(rank),
            "rating": round(rating, 1),          # as ESPN shows it; negatives and 0 kept
            "rankChange": int(change) if change is not None else None,
            "record": ("%d-%d" % (w, l) + ("-%d" % tie if tie else "")) if w is not None and l is not None else None,
        })
    if len(rows) < MIN_TEAMS:
        raise Refused("only %d teams (a partial table)" % len(rows))
    rows.sort(key=lambda r: (r["rank"], r["espnId"]))

    week = ((req.get("type") or {}).get("week") or {})
    return {
        "schema": 1,
        "source": "fpi",
        "label": "ESPN FPI",
        "kind": "predictive rating",
        "sourceUrl": PAGE,
        "season": year,
        "seasonType": (req.get("type") or {}).get("type"),
        "week": week.get("number"),
        "weekText": week.get("text"),
        "sourceUpdated": payload.get("lastUpdated"),
        "teams": rows,
    }


def changed(previous, snap):
    """A new edition: different season or source update, or different rows."""
    if not previous:
        return True
    keys = ("season", "seasonType", "week", "sourceUpdated", "teams")
    return any(previous.get(k) != snap.get(k) for k in keys)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--season", type=int, default=None, help="default: this year")
    ap.add_argument("--from-file", help="read a saved payload instead of fetching")
    ap.add_argument("--out", default=OUT)
    args = ap.parse_args()
    season = args.season or datetime.now(timezone.utc).year

    if args.from_file:
        payload = json.load(open(args.from_file, encoding="utf-8"))
    else:
        req = urllib.request.Request(URL % season, headers={"accept": "application/json"})
        with urllib.request.urlopen(req, timeout=30) as r:
            payload = json.load(r)
    try:
        snap = normalize(payload, season)
    except Refused as e:
        print("::error::FPI refused, previous snapshot kept: %s" % e)
        sys.exit(1)

    previous = None
    if os.path.exists(args.out):
        try:
            previous = json.load(open(args.out, encoding="utf-8"))
        except ValueError:
            previous = None
    if not changed(previous, snap):
        print("  FPI unchanged (%s, updated %s); snapshot not touched" % (snap["weekText"], snap["sourceUpdated"]))
        return
    snap["fetchedAt"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%MZ")
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(snap, f, indent=1)
        f.write("\n")
    print("  FPI %s %s, updated %s: %d teams, #1 %s" % (snap["season"], snap["weekText"], snap["sourceUpdated"],
                                                         len(snap["teams"]), snap["teams"][0]["name"]))


if __name__ == "__main__":
    main()
