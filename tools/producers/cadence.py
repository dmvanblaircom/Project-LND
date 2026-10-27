#!/usr/bin/env python3
"""Is the official depth chart due for a check on this run?

Decision (David, 2026-09-23): depth and availability every 30 minutes on
game day, otherwise every 2 hours. Odds and news run on every run; this
decides only the official-document step.

  * GAME WINDOW - from 18 hours before a kickoff to 6 hours after it. It
    covers the ~60-minute pregame availability update, and it needs no
    timezone: a window around the kickoff instant is the same everywhere.
    Inside it, the chart is checked on every run.
  * Otherwise, the chart is checked when the last successful check is two
    hours old or more. The data-refresh workflow keeps that time in the
    Actions cache, so the rule holds whatever the runs' real spacing - which
    for GitHub's own scheduler is irregular, often hours apart.
  * When in doubt, check. A schedule that cannot be read or a missing
    last-check time means due: a wasted check costs a few small requests; a
    missed one costs a stale injury report.

Usage (in the workflow):
    python3 tools/producers/cadence.py --team notre-dame --last .cadence/depth-checked
Prints the verdict and writes due=true|false to $GITHUB_OUTPUT when set.
"""
import argparse
import json
import os
import re
import sys
import urllib.request
from datetime import datetime, timedelta, timezone

BEFORE = timedelta(hours=18)
AFTER = timedelta(hours=6)
EVERY = timedelta(hours=2)
SLACK = timedelta(minutes=10)     # a run a few minutes early still counts

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
SCHEDULE = "https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams/%s/schedule"


def parse_time(s):
    try:
        return datetime.fromisoformat(str(s).replace("Z", "+00:00")).astimezone(timezone.utc)
    except (TypeError, ValueError):
        return None


def kickoffs(payload):
    """ESPN team schedule -> kickoff instants (UTC). Unreadable dates are dropped."""
    out = []
    for e in (payload or {}).get("events", []) or []:
        t = parse_time(e.get("date"))
        if t:
            out.append(t)
    return out


def in_game_window(kicks, now):
    return any(k - BEFORE <= now <= k + AFTER for k in kicks)


def due(kicks, last_checked, now):
    """-> (due, reason). kicks None means the schedule could not be read."""
    if kicks is None:
        return True, "schedule unreadable - checking rather than guessing"
    if in_game_window(kicks, now):
        return True, "game window"
    if last_checked is None:
        return True, "no record of a previous check"
    age = now - last_checked
    if age + SLACK >= EVERY:
        return True, "last check %d min ago" % (age.total_seconds() // 60)
    return False, "last check %d min ago, not in a game window" % (age.total_seconds() // 60)


def schedule(team, cache=None):
    """The team's kickoffs, read once a run when a cache is given (the beat
    news and the depth chart ask about the same team); None when unreadable."""
    path = os.path.join(cache, team + ".json") if cache else None
    if path and os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            saved = json.load(f)
        return None if saved is None else [t for t in (parse_time(x) for x in saved) if t]
    try:
        req = urllib.request.Request(SCHEDULE % team_id(team), headers={"accept": "application/json"})
        with urllib.request.urlopen(req, timeout=20) as r:
            kicks = kickoffs(json.load(r))
    except Exception as e:                           # noqa: BLE001
        print("  schedule:", str(e)[:120])
        kicks = None
    if path:
        os.makedirs(cache, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(None if kicks is None else [k.isoformat() for k in kicks], f)
    return kicks


def team_id(team):
    config = open(os.path.join(ROOT, "teams", team + ".js"), encoding="utf-8").read()
    m = re.search(r'\bteamId\s*:\s*"([^"]+)"', config)
    if not m:
        sys.exit("teams/%s.js declares no ESPN teamId" % team)
    return m.group(1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--team", required=True)
    ap.add_argument("--last", required=True, help="file holding the last successful check time")
    ap.add_argument("--exit-code", action="store_true", help="exit 0 when due, 3 when not (for a loop over teams)")
    ap.add_argument("--cache", help="a directory that keeps each team's kickoffs for this run")
    args = ap.parse_args()

    now = datetime.now(timezone.utc)
    try:
        last = parse_time(open(args.last, encoding="utf-8").read().strip())
    except OSError:
        last = None
    # Due on the clock alone needs no schedule (Phase 0, 2026-10-27: 138
    # teams' schedules a run is a request each); the answer is the same.
    if last is None or now - last + SLACK >= EVERY:
        verdict, reason = due([], last, now)
    else:
        verdict, reason = due(schedule(args.team, args.cache), last, now)
    print("  %s: %s" % ("due" if verdict else "not due", reason))
    out = os.environ.get("GITHUB_OUTPUT")
    if out:
        with open(out, "a", encoding="utf-8") as f:
            f.write("due=%s\n" % ("true" if verdict else "false"))
    if args.exit_code and not verdict:
        sys.exit(3)


if __name__ == "__main__":
    main()
