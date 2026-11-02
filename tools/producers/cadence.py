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
  * PUBLISH WINDOW - the hours, local to the team, when its program posts
    availability on the days it does (sources.official.availabilityUpdates:
    daysBeforeKickoff and publishWindow). Inside it, the chart is checked on
    every run too, so a report reaches fans within half an hour of being
    posted rather than up to two hours later (David, 2026-11-02: Notre
    Dame's Monday report was posted between two checks).
  * When in doubt, check. A schedule that cannot be read or a missing
    last-check time means due: a wasted check costs a few small requests; a
    missed one costs a stale injury report.

Usage (in the workflow):
    python3 tools/producers/cadence.py --team notre-dame --last .cadence/depth-checked [--official]
--official also reads the team's publishing window (the official-document
step passes it; beat news does not need it).
Prints the verdict and writes due=true|false to $GITHUB_OUTPUT when set.
"""
import argparse
import json
import os
import re
import sys
import urllib.request
from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

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


def clock(s):
    h, m = str(s).split(":")
    return time(int(h), int(m))


def in_publish_window(kicks, now, policy):
    """Is it a day the team publishes availability (daysBeforeKickoff, by the
    game's local date) and inside its publishWindow ["HH:MM", "HH:MM"], local?
    A policy without a window, or one that cannot be read, never is: the
    two-hour rule still covers the team."""
    try:
        tz = ZoneInfo(policy["timeZone"])
        start, end = (clock(t) for t in policy["publishWindow"])
        days = [int(d) for d in policy.get("daysBeforeKickoff") or []]
    except (TypeError, KeyError, ValueError, AttributeError):
        return False
    local = now.astimezone(tz)
    if not start <= local.time() < end:
        return False
    return any(k.astimezone(tz).date() - timedelta(days=d) == local.date() for k in kicks for d in days)


def due(kicks, last_checked, now, policy=None):
    """-> (due, reason). kicks None means the schedule could not be read;
    policy is the team's availabilityUpdates, when its window counts."""
    if kicks is None:
        return True, "schedule unreadable - checking rather than guessing"
    if in_game_window(kicks, now):
        return True, "game window"
    if policy and in_publish_window(kicks, now, policy):
        return True, "publish window"
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


def publish_policy(team):
    """The team's sources.official.availabilityUpdates, or None. Read only
    when the clock alone cannot decide, so most runs never load the config."""
    sys.path.insert(0, HERE)
    import teamconfig
    try:
        return ((teamconfig.load(team).get("sources") or {}).get("official") or {}).get("availabilityUpdates")
    except Exception as e:                           # noqa: BLE001
        print("  publish window unreadable:", str(e)[:120])
        return None


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
    ap.add_argument("--official", action="store_true",
                    help="also due inside the team's availability publishing window")
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
        verdict, reason = due(schedule(args.team, args.cache), last, now,
                              publish_policy(args.team) if args.official else None)
    print("  %s: %s" % ("due" if verdict else "not due", reason))
    out = os.environ.get("GITHUB_OUTPUT")
    if out:
        with open(out, "a", encoding="utf-8") as f:
            f.write("due=%s\n" % ("true" if verdict else "false"))
    if args.exit_code and not verdict:
        sys.exit(3)


if __name__ == "__main__":
    main()
