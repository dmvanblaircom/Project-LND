#!/usr/bin/env python3
"""Does the data refresh check the official depth chart when it should?

The rule (tools/producers/cadence.py, decision 0020): every run inside a game
window - 18 hours before kickoff to 6 hours after - and otherwise once the
last successful check is two hours old. When in doubt, check.

Usage:  python3 tools/cadencecheck.py     (exit 1 on any failure)
"""
import os
import sys
from datetime import datetime, timedelta, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "producers"))
import cadence  # noqa: E402

failures = 0


def ok(cond, what):
    global failures
    print(("  ok   " if cond else "  FAIL ") + what)
    if not cond:
        failures += 1


def at(s):
    return datetime.fromisoformat(s).replace(tzinfo=timezone.utc)


# Notre Dame at Purdue, 2026-09-26, 7:30 PM ET = 23:30 UTC.
kick = [at("2026-09-26T23:30:00")]
recent = at("2026-09-26T18:00:00")               # a check at 18:00


def is_due(now, last=recent, kicks=kick):
    return cadence.due(kicks, last, now)[0]


print("the schedule")
eq = cadence.kickoffs({"events": [{"date": "2026-09-26T23:30Z"}, {"date": "TBD"}, {}]})
ok(eq == kick, "ESPN's event dates become kickoff instants; unreadable ones are dropped")
ok(cadence.kickoffs(None) == [] and cadence.kickoffs({}) == [], "no payload means no kickoffs")

print("inside the game window: every run")
ok(is_due(at("2026-09-26T18:05:00")), "five minutes after the last check, on game day")
ok(is_due(at("2026-09-26T22:30:00")), "an hour before kickoff - when the pregame report lands")
ok(is_due(at("2026-09-27T05:00:00")), "five and a half hours after kickoff")
ok(is_due(at("2026-09-26T05:31:00"), last=at("2026-09-26T05:25:00")), "18 hours out, the window opens")

print("outside it: every two hours")
tue = at("2026-09-29T15:00:00")
ok(not is_due(tue, last=tue - timedelta(minutes=30)), "not due 30 minutes after a check on a Tuesday")
ok(not is_due(tue, last=tue - timedelta(minutes=100)), "not due at 100 minutes")
ok(is_due(tue, last=tue - timedelta(minutes=115)), "due a few minutes early - a run that lands at 1h55 still counts")
ok(is_due(tue, last=tue - timedelta(hours=5)), "due when runs are hours apart, as GitHub's scheduler leaves them")
ok(not is_due(at("2026-09-27T05:31:00"), last=at("2026-09-27T05:25:00")), "the window closes 6 hours after kickoff")

print("in doubt, check")
ok(is_due(tue, last=None), "no record of a previous check")
ok(is_due(tue, last=tue, kicks=None), "the schedule could not be read")
ok(is_due(tue, last=tue - timedelta(minutes=5), kicks=[]) is False, "an empty schedule is not doubt: off-season stays every 2 hours")

print("\n" + ("%d check(s) FAILED" % failures if failures else "the depth chart is checked when it should be"))
sys.exit(1 if failures else 0)
