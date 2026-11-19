#!/usr/bin/env python3
"""ESPN's Football Power Index, every FBS team, as a league snapshot.

    python3 tools/producers/fpi.py [--season 2026] [--from-file payload.json]

Writes data/league/fpi.json (W07, issue #29): one row per team with ESPN's
team id, FPI rank and rating, the 7-day rank change ESPN publishes, and the
record, plus the edition it belongs to (season, week) and when ESPN says it
last updated. FPI is a predictive rating, not a poll: no votes, no blending.

Each row also keeps ESPN's projections from the same table (David,
2026-11-19: Season Outlook moves from Kalshi to ESPN): `odds` holds the
percent chance to make the playoff, win the title, make the title game, win
the conference and win out, and `projected` the projected record. `prev` is
the playoff and title odds of the edition before this one, so the page can
show how far they moved; it is carried, not fetched.

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
# ESPN's projection columns, by the name each row keeps them under.
ODDS = (("playoff", "probmakeplayoffs"), ("title", "probwintitle"), ("titleGame", "probmaketitlegame"),
        ("conference", "probwinconf"), ("winOut", "probwinout"))
CARRIED = ("playoff", "title")    # the odds whose move since the last edition is kept


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
    # Season Outlook reads the playoff and title odds: a table without them
    # would replace good projections with none (Codex, #263).
    lost = [name for key, name in ODDS if key in CARRIED and name not in col]
    if lost:
        raise Refused("projection columns not found: %s (ESPN changed the table?)" % ", ".join(lost))

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
        odds = {}
        for key, name in ODDS:
            v = get(name)
            if v is not None and 0 <= v <= 100:
                odds[key] = round(v, 1)
        pw, pl = get("projectedw"), get("projectedl")
        rows.append({
            "espnId": tid,
            "name": team.get("nickname") or team.get("shortDisplayName") or team.get("displayName"),
            "abbr": team.get("abbreviation"),
            "rank": int(rank),
            "rating": round(rating, 1),          # as ESPN shows it; negatives and 0 kept
            "rankChange": int(change) if change is not None else None,
            "record": ("%d-%d" % (w, l) + ("-%d" % tie if tie else "")) if w is not None and l is not None else None,
            "odds": odds,
            "projected": {"wins": round(pw, 1), "losses": round(pl, 1)} if pw is not None and pl is not None else None,
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


def _rows(snap):
    return [{k: v for k, v in r.items() if k != "prev"} for r in (snap or {}).get("teams") or []]


def changed(previous, snap):
    """A new edition: different season or source update, or different rows.
    The carried `prev` is ours, not ESPN's, and never counts as a change."""
    if not previous:
        return True
    keys = ("season", "seasonType", "week", "sourceUpdated")
    return any(previous.get(k) != snap.get(k) for k in keys) or _rows(previous) != _rows(snap)


def carry(previous, snap):
    """Give each row the playoff and title odds it had before this edition.
    A new ESPN edition carries the last edition's odds; a rewrite of the same
    edition (a new column, say) keeps what it already carried. Another
    season, or a team the last file did not have, carries nothing."""
    if not previous or previous.get("season") != snap.get("season"):
        return
    same = previous.get("sourceUpdated") == snap.get("sourceUpdated")
    before = {r.get("espnId"): r for r in previous.get("teams") or []}
    for r in snap["teams"]:
        old = before.get(r["espnId"])
        if not old:
            continue
        src = (old.get("prev") or {}) if same else (old.get("odds") or {})
        prev = {k: src[k] for k in CARRIED if isinstance(src.get(k), (int, float))}
        if prev:
            r["prev"] = prev


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
    carry(previous, snap)
    snap["fetchedAt"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%MZ")
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(snap, f, indent=1)
        f.write("\n")
    print("  FPI %s %s, updated %s: %d teams, #1 %s" % (snap["season"], snap["weekText"], snap["sourceUpdated"],
                                                         len(snap["teams"]), snap["teams"][0]["name"]))


if __name__ == "__main__":
    main()
