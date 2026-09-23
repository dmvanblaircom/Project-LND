#!/usr/bin/env python3
"""Is the team data as fresh as it is supposed to be? Opens an issue if not.

    python3 tools/producers/freshness.py --team notre-dame [--open-issues]

Two promises are checked, each around a real kickoff from ESPN's schedule:

  * AVAILABILITY. The team declares when its program publishes availability
    (TEAM_CONFIG.sources.official.availabilityUpdates - for Notre Dame a
    report Monday, an update Thursday, a final update ~60 minutes before
    kickoff). Once each is due, the report we hold must be at least that
    new. If Notre Dame's Thursday or pregame update never reaches us - it may
    not be linked where the Monday report is - this is what says so.
  * CADENCE (decision 0020). Inside a game window the refresh should run
    every 30 minutes. A gap of more than 45 minutes means the clock that
    triggers it is not working.

A failure is reported once, as a GitHub issue (which emails the owner), not
as a red run every half hour. The run itself stays green: this step is a
monitor, and the data it checks has already been saved.
"""
import argparse
import json
import os
import sys
import urllib.request
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, HERE)
import cadence      # noqa: E402
import teamconfig   # noqa: E402

WEEK = timedelta(days=7)
AFTER = cadence.AFTER                       # the game window closes 6h after kickoff
DAY_GRACE = timedelta(hours=12)             # a dated report is due by noon the day after
PREGAME_GRACE = timedelta(minutes=60)       # the ~60-minute update is due by kickoff
MAX_GAP = timedelta(minutes=45)
LABEL = "data-freshness"


# ---- pure: tools/freshnesscheck.py tests these --------------------------

def local_date(instant, tz):
    return instant.astimezone(ZoneInfo(tz)).date()


def current_game(kicks, now):
    """The kickoff whose game week we are in: from 7 days before to 6h after."""
    live = [k for k in kicks if k - WEEK <= now <= k + AFTER]
    return min(live) if live else None


def expected(kick, policy):
    """-> [(label, due_at, oldest acceptable report date)] for one game."""
    tz = policy["timeZone"]
    game_day = local_date(kick, tz)
    out = []
    for d in policy.get("daysBeforeKickoff") or []:
        day = game_day - timedelta(days=d)
        due = datetime.combine(day + timedelta(days=1), time(0), ZoneInfo(tz)) + DAY_GRACE
        out.append(("%s report" % day.strftime("%A"), due.astimezone(timezone.utc), day))
    if policy.get("minutesBeforeKickoff"):
        out.append(("pregame update", kick - timedelta(minutes=policy["minutesBeforeKickoff"]) + PREGAME_GRACE,
                    game_day))
    return out


def availability_problems(kicks, report, now, policy):
    kick = current_game(kicks, now)
    if kick is None or not policy:
        return []
    have = None
    if report and report.get("reported") and report.get("effectiveAt"):
        have = date.fromisoformat(report["effectiveAt"])
    game_day = local_date(kick, policy["timeZone"])
    out = []
    for label, due, oldest in expected(kick, policy):
        if now < due:
            continue
        if have is None or have < oldest:
            out.append({
                "title": "Availability: no %s captured for the %s game" % (label, game_day.isoformat()),
                "body": ("The %s (dated %s or later) was due by %s UTC. The newest report the "
                         "refresh holds is %s.\n\nEither the program has not published it, or it is "
                         "published somewhere the producer does not read "
                         "(tools/producers/official_depth.py reads the game notes linked from the "
                         "official media table). Check the official site before changing code."
                         % (label, oldest.isoformat(), due.strftime("%Y-%m-%d %H:%M"),
                            ("dated " + have.isoformat()) if have else "no report at all"))})
    return out


def cadence_problems(kicks, previous_run, now):
    """A gap longer than MAX_GAP between runs, inside a game window."""
    if previous_run is None or not cadence.in_game_window(kicks, now):
        return []
    gap = now - previous_run
    if gap <= MAX_GAP:
        return []
    kick = min((k for k in kicks if k - cadence.BEFORE <= now <= k + AFTER), default=now)
    return [{
        "title": "Data refresh: runs too far apart in the %s game window" % kick.date().isoformat(),
        "body": ("This run started %d minutes after the previous one. Inside a game window the "
                 "refresh should run every 30 minutes (decision 0020). GitHub's own scheduler does "
                 "not keep that pace, so the external clock that triggers the workflow is not "
                 "working: check its job history and whether its token has expired "
                 "(docs/engineering/data-refresh-clock.md)." % (gap.total_seconds() // 60))}]


# ---- network ------------------------------------------------------------

def github(path, method="GET", body=None):
    req = urllib.request.Request(
        "https://api.github.com/repos/%s%s" % (os.environ["GITHUB_REPOSITORY"], path), method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"authorization": "Bearer " + os.environ["GITHUB_TOKEN"],
                 "accept": "application/vnd.github+json", "x-github-api-version": "2022-11-28"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r) if r.status != 204 else None


def previous_run_start():
    runs = github("/actions/workflows/odds.yml/runs?per_page=2").get("workflow_runs", [])
    this = os.environ.get("GITHUB_RUN_ID")
    earlier = [r for r in runs if str(r["id"]) != this]
    return cadence.parse_time(earlier[0]["run_started_at"]) if earlier else None


def open_once(problems):
    known = {i["title"] for i in github("/issues?state=all&labels=%s&per_page=100" % LABEL)}
    for p in problems:
        if p["title"] in known:
            print("  already reported: " + p["title"])
            continue
        github("/issues", "POST", {"title": p["title"], "body": p["body"], "labels": [LABEL]})
        print("  opened issue: " + p["title"])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--team", required=True)
    ap.add_argument("--open-issues", action="store_true")
    args = ap.parse_args()

    now = datetime.now(timezone.utc)
    config = teamconfig.load(args.team)
    policy = ((config.get("sources") or {}).get("official") or {}).get("availabilityUpdates")
    with urllib.request.urlopen(cadence.SCHEDULE % config["sources"]["espn"]["teamId"], timeout=20) as r:
        kicks = cadence.kickoffs(json.load(r))
    av_file = ((config.get("snapshots") or {}).get("availability") or {}).get("file")
    report = json.load(open(os.path.join(ROOT, av_file), encoding="utf-8")) if av_file else None

    problems = availability_problems(kicks, report, now, policy)
    if args.open_issues:
        problems += cadence_problems(kicks, previous_run_start(), now)
    for p in problems:
        print("::warning::" + p["title"])
    if not policy:
        print("  %s declares no availability policy; nothing to check" % args.team)
    elif not problems:
        print("  fresh: availability %s, as expected for now" % ((report or {}).get("effectiveAt") or "none"))
    if args.open_issues and problems:
        open_once(problems)


if __name__ == "__main__":
    main()
