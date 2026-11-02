#!/usr/bin/env python3
"""Does the data refresh check the official depth chart when it should?

The rule (tools/producers/cadence.py, decision 0020): every run inside a game
window - 18 hours before kickoff to 6 hours after - or the team's declared
publish window, and otherwise once the last successful check is two hours
old. When in doubt, check.

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

print("inside the team's publish window: every run (David, 2026-11-02)")
# Notre Dame vs Miami, Saturday 2026-11-07, 7:30 PM ET = 2026-11-08 00:30 UTC.
# Its game's local date is the 7th, so Monday the 2nd and Thursday the 5th.
nd = {"timeZone": "America/New_York", "daysBeforeKickoff": [5, 2], "publishWindow": ["11:00", "18:00"]}
miami = [at("2026-11-08T00:30:00")]
mon = at("2026-11-02T18:40:00")                  # 1:40 PM ET, Monday
just = mon - timedelta(minutes=30)


def due_with(now, policy=nd, kicks=miami, last=None):
    return cadence.due(kicks, last if last else now - timedelta(minutes=30), now, policy)


ok(due_with(mon) == (True, "publish window"), "Monday 1:40 PM ET, half an hour after a check: due")
ok(due_with(at("2026-11-05T16:05:00"))[0], "Thursday 11:05 AM ET: due")
ok(due_with(at("2026-11-02T16:00:00"))[0], "11:00 AM ET exactly: the window opens")
ok(not due_with(at("2026-11-02T23:00:00"))[0], "6:00 PM ET: the window has closed")
ok(not due_with(at("2026-11-02T15:30:00"))[0], "10:30 AM ET: not yet")
ok(not due_with(at("2026-11-03T18:40:00"))[0], "Tuesday 1:40 PM ET: not a day the team publishes")
ok(not due_with(at("2026-11-04T18:40:00"))[0], "Wednesday: nor that")
ok(not due_with(mon, policy=None)[0], "no policy: the two-hour rule as before")
ok(not due_with(mon, policy={"timeZone": "America/New_York", "daysBeforeKickoff": [5, 2]})[0],
   "a policy without a window: the two-hour rule as before")
ok(not due_with(mon, policy={"timeZone": "America/New_York", "daysBeforeKickoff": [5], "publishWindow": ["noon"]})[0],
   "an unreadable window is never a window, and never an error")
ok(not due_with(mon, policy={"timeZone": "Mars/Base", "daysBeforeKickoff": [5], "publishWindow": ["11:00", "18:00"]})[0],
   "nor is an unknown time zone")
ok(not due_with(mon, kicks=[])[0], "no game ahead (off-season): no window")
# An evening kickoff on the West Coast: the game's own date, in the team's zone.
late = {"timeZone": "America/Los_Angeles", "daysBeforeKickoff": [5], "publishWindow": ["11:00", "18:00"]}
ok(due_with(at("2026-11-02T20:00:00"), policy=late, kicks=[at("2026-11-08T03:30:00")])[0],
   "a 7:30 PM PT Saturday kickoff (03:30 UTC Sunday) counts back from Saturday")

print("a schedule only when the clock cannot decide (Phase 0)")
import io, json, tempfile, contextlib, urllib.request  # noqa: E401,E402
asked = []
real_open = urllib.request.urlopen


class Answer(io.BytesIO):
    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


def fake_open(req, timeout=None):
    asked.append(req.full_url)
    return Answer(json.dumps({"events": [{"date": "2026-10-31T19:30Z"}]}).encode())


def run_main(last, cache=None, official=False):
    d = tempfile.mkdtemp()
    stamp = os.path.join(d, "stamp")
    if last:
        open(stamp, "w").write(last.strftime("%Y-%m-%dT%H:%M:%SZ"))
    argv = ["cadence.py", "--team", "notre-dame", "--last", stamp, "--exit-code"] + (["--cache", cache] if cache else []) + (["--official"] if official else [])
    code, real_argv = 0, sys.argv
    sys.argv = argv
    try:
        with contextlib.redirect_stdout(io.StringIO()):
            cadence.main()
    except SystemExit as e:
        code = e.code or 0
    finally:
        sys.argv = real_argv
    return code


urllib.request.urlopen = fake_open
try:
    now = datetime.now(timezone.utc)
    ok(run_main(None) == 0 and not asked, "no record of a check: due, and no schedule asked for")
    ok(run_main(now - timedelta(hours=3)) == 0 and not asked, "a check three hours old: due, and no schedule asked for")
    run_main(now - timedelta(minutes=20))
    ok(len(asked) == 1, "a check 20 minutes old: only now is the schedule read")
    cache = tempfile.mkdtemp()
    run_main(now - timedelta(minutes=20), cache)
    run_main(now - timedelta(minutes=20), cache)
    ok(len(asked) == 2, "with a cache, the second ask in a run reads the first one's kickoffs (%d reads)" % len(asked))
    kept = cadence.schedule("notre-dame", cache)
    ok(kept and kept[0] == at("2026-10-31T19:30:00"), "the kept kickoffs are the schedule's")
    loads, real_policy = [], cadence.publish_policy
    cadence.publish_policy = lambda team: loads.append(team) or nd
    try:
        run_main(now - timedelta(hours=3), official=True)
        ok(not loads, "--official, due on the clock: the team's config is not loaded")
        run_main(now - timedelta(minutes=20), official=True)
        ok(loads == ["notre-dame"], "--official, not due on the clock: the publish window is read")
        loads.clear()
        run_main(now - timedelta(minutes=20))
        ok(not loads, "without --official (beat news): never read")
    finally:
        cadence.publish_policy = real_policy
finally:
    urllib.request.urlopen = real_open

print("\n" + ("%d check(s) FAILED" % failures if failures else "the depth chart is checked when it should be"))
sys.exit(1 if failures else 0)
