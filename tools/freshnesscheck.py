#!/usr/bin/env python3
"""Does the freshness monitor notice a missed availability update, or a stalled clock?

The worked example is Notre Dame at Purdue, Saturday 2026-09-26, 7:30 PM ET
(23:30 UTC), under Notre Dame's published policy: a report Monday, an update
Thursday, a final update about 60 minutes before kickoff.

Usage:  python3 tools/freshnesscheck.py     (exit 1 on any failure)
"""
import os
import sys
from datetime import datetime, timedelta, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "producers"))
import freshness  # noqa: E402

failures = 0


def ok(cond, what):
    global failures
    print(("  ok   " if cond else "  FAIL ") + what)
    if not cond:
        failures += 1


def at(s):
    return datetime.fromisoformat(s).replace(tzinfo=timezone.utc)


POLICY = {"timeZone": "America/New_York", "daysBeforeKickoff": [5, 2], "minutesBeforeKickoff": 60}
KICK = [at("2026-09-26T23:30:00")]


def report(day):
    return {"reported": True, "effectiveAt": day} if day else {"reported": False, "effectiveAt": None}


def titles(now, day, kicks=KICK, policy=POLICY):
    return [p["title"] for p in freshness.availability_problems(kicks, report(day), at(now), policy)]


print("what is expected, and when")
exp = freshness.expected(KICK[0], POLICY)
ok([(l, d.isoformat()) for l, _, d in exp] ==
   [("Monday report", "2026-09-21"), ("Thursday report", "2026-09-24"), ("pregame update", "2026-09-26")],
   "Monday, Thursday and the game day itself, read from the policy")
ok([due.strftime("%Y-%m-%d %H:%M") for _, due, _ in exp] == ["2026-09-22 16:00", "2026-09-25 16:00", "2026-09-26 23:30"],
   "each due by noon ET the next day; the pregame update by kickoff")

print("a week that goes to plan says nothing")
ok(titles("2026-09-23T15:00:00", "2026-09-21") == [], "Wednesday, holding Monday's report")
ok(titles("2026-09-25T17:00:00", "2026-09-24") == [], "Friday, holding Thursday's update")
ok(titles("2026-09-26T23:45:00", "2026-09-26") == [], "after kickoff, holding the game-day update")
ok(titles("2026-09-22T15:00:00", None) == [], "Tuesday morning, before Monday's report is due, nothing is late")

print("a missed update is named")
ok(titles("2026-09-25T17:00:00", "2026-09-21") == ["Availability: no Thursday report captured for the 2026-09-26 game"],
   "Friday afternoon still holding Monday's report: the Thursday update is missing")
ok(titles("2026-09-26T23:45:00", "2026-09-24") == ["Availability: no pregame update captured for the 2026-09-26 game"],
   "after kickoff still holding Thursday's: the pregame update is missing")
ok(len(titles("2026-09-22T17:00:00", None)) == 1, "no report at all by Tuesday afternoon: Monday's is missing")
ok(len(titles("2026-09-26T23:45:00", None)) == 3, "and with nothing at all by kickoff, all three are")

print("the game day is the program's local day")
late = [at("2026-09-27T00:30:00")]            # 8:30 PM ET Saturday is Sunday in UTC
ok(titles("2026-09-27T00:45:00", "2026-09-26", kicks=late) == [],
   "an 8:30 PM ET kickoff is a Saturday game, not a Sunday one")

print("outside a game week, or without a policy, nothing is checked")
ok(titles("2026-10-12T12:00:00", "2026-09-21") == [], "two weeks after the last kickoff")
ok(titles("2026-09-25T17:00:00", None, policy=None) == [], "a team that declares no availability policy")

print("the refresh clock")
prev = at("2026-09-26T20:00:00")
ok(freshness.cadence_problems(KICK, prev, prev + timedelta(minutes=31)) == [], "31 minutes apart in a game window: fine")
gap = freshness.cadence_problems(KICK, prev, prev + timedelta(minutes=50))
ok(len(gap) == 1 and "50 minutes" in gap[0]["body"], "50 minutes apart in a game window: the clock has stalled")
ok(freshness.cadence_problems(KICK, at("2026-09-29T09:00:00"), at("2026-09-29T14:00:00")) == [],
   "five hours apart on a Tuesday: not a game window, not a problem")
ok(freshness.cadence_problems(KICK, None, prev) == [], "no previous run: nothing to compare")

print("\n" + ("%d check(s) FAILED" % failures if failures else "the monitor notices what it should, and only that"))
sys.exit(1 if failures else 0)
