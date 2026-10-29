#!/usr/bin/env python3
"""Append a team's Kalshi price to its season history.

    python3 tools/producers/odds_history.py --team notre-dame

Reads the league-wide market files the workflow just fetched
(data/league/odds-title.json, data/league/odds-playoff.json), picks out the
team's market by its declaration (TEAM_CONFIG.sources.kalshi: the ticker
suffix, then the name pattern - the same rule as the page), and appends the
price to the team's declared history (snapshots.oddsHistory.file), stamped
with the team it belongs to.

Twice an hour is 48 points a day of mostly the same number, so a point is
kept only when either market moved half a point, or six hours passed.
"""
import argparse
import json
import os
import sys
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import teamconfig  # noqa: E402

LEAGUE = {"title": "data/league/odds-title.json", "playoff": "data/league/odds-playoff.json"}
KEEP = 600


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def price(m):
    """Same arithmetic as the page: midpoint of bid and ask, as a percentage."""
    bd, ad = num(m.get("yes_bid_dollars")), num(m.get("yes_ask_dollars"))
    if bd is not None and ad is not None and (bd or ad):
        return (bd + ad) / 2 * 100
    ld = num(m.get("last_price_dollars"))
    if ld:
        return ld * 100
    b, a = num(m.get("yes_bid")), num(m.get("yes_ask"))
    if b is not None and a is not None and (b or a):
        return (b + a) / 2
    return num(m.get("last_price"))


def team_price(markets, kalshi):
    """The team's market in one event: the one with its ticker suffix, and
    only when none has it, the first its name pattern matches (a pattern can
    match a look-alike listed first: "Western Michigan" for Michigan,
    2026-10-29). teamos/markets.js picks the same way."""
    suffix, pattern = kalshi.get("tickerSuffix"), teamconfig.regex(kalshi.get("namePattern"))
    def name(m): return " ".join(str(m.get(k, "")) for k in ("yes_sub_title", "subtitle", "title"))
    own = next((m for m in markets if suffix and str(m.get("ticker", "")).endswith(suffix)), None)
    if own is None and pattern:
        own = next((m for m in markets if pattern.search(name(m))), None)
    if own is None:
        return None
    p = price(own)
    return round(p, 1) if p is not None else None


def append(hist, point, now):
    """-> the new history, or None when the point adds nothing."""
    pts = [p for p in (hist or {}).get("points", []) if isinstance(p, dict) and p.get("t")]
    last = pts[-1] if pts else None

    def moved(k):
        # A market missing from both reads has not moved (Season Outlook
        # hides one between seasons); one appearing or vanishing has.
        if last is None:
            return True
        if last.get(k) is None or point[k] is None:
            return (last.get(k) is None) != (point[k] is None)
        return abs(last[k] - point[k]) >= 0.5
    stale = last is None or (now - datetime.strptime(last["t"], "%Y-%m-%dT%H:%MZ")
                             .replace(tzinfo=timezone.utc)).total_seconds() > 6 * 3600
    switched = last is not None and any(last.get(k + "Event") != point.get(k + "Event")
                                       for k in ("title", "playoff") if k + "Event" in point)
    if not (moved("title") or moved("playoff") or stale or switched):
        return None
    return (pts + [point])[-KEEP:]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--team", required=True)
    args = ap.parse_args()

    config = teamconfig.load(args.team)
    kalshi = (config.get("sources") or {}).get("kalshi") or {}
    snap = teamconfig.snapshot(config, "oddsHistory")
    if not snap or not (kalshi.get("tickerSuffix") or kalshi.get("namePattern")):
        print("  %s declares no Kalshi market or no odds history" % args.team)
        return
    now = datetime.now(timezone.utc)
    point = {"t": now.strftime("%Y-%m-%dT%H:%MZ")}
    for k, f in LEAGUE.items():
        d = json.load(open(teamconfig.path(f)))
        point[k] = team_price(d.get("markets", []), kalshi)
        # Which event the price is from (tools/producers/markets.py): a new
        # season's prices never read as a move in the last one's.
        point[k + "Event"] = d.get("event")
    if point["title"] is None and point["playoff"] is None:
        print("  no %s market found; history unchanged" % args.team)
        return

    out = teamconfig.path(snap["file"])
    try:
        hist = json.load(open(out))
    except (OSError, ValueError):
        hist = {"points": []}
    pts = append(hist, point, now)
    if pts is None and hist.get("team") == args.team:
        print("  unchanged (%s%% / %s%%); history not touched" % (point["title"], point["playoff"]))
        return
    pts = pts if pts is not None else hist.get("points", [])
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump({"team": args.team, "updated": pts[-1]["t"], "points": pts}, open(out, "w"), indent=0)
    print("  %s: %d points on file, latest %s" % (snap["file"], len(pts), pts[-1]))


if __name__ == "__main__":
    main()
