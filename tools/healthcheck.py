#!/usr/bin/env python3
"""Is a broken source told once, for the right teams, for the right reason?
(tools/producers/health.py; David, 2026-11-05: the "Run failed" emails were
constant and said nothing.)

    python3 tools/healthcheck.py     (exit 1 on any failure)
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "producers"))
import health  # noqa: E402

failures = 0


def ok(cond, what):
    global failures
    print(("  ok   " if cond else "  FAIL ") + what)
    if not cond:
        failures += 1


ADV = "conference availability: a report in the file has an unknown name: 'Advance Report' - leaving files alone"
SIX = ["boise-state", "colorado-state", "fresno-state", "oregon-state", "texas-state", "utah-state"]

print("the reason, in the producer's own words")
ok(health.reason_of("  availability: ...\n" + ADV + "\n") == ADV, "sys.exit's message is the reason")
ok(health.reason_of("Traceback (most recent call last):\n  File x\nValueError: no games list") == "ValueError: no games list",
   "an exception's last line is the reason")
ok(health.reason_of("x\n::error::no feed returned anything\n::warning::a feed moved") == "no feed returned anything",
   "Actions' markers are dropped; a trailing warning is not the reason")
ok(health.reason_of("") == "no message", "a silent failure still says so")

print("a blip is not an alert")
s = {}
for i in range(2):
    s = health.update(s, [], [("news", "toledo", "no feed returned anything")], "2026-11-05T0%d:00:00Z" % i)
ok(health.broken(s) == {}, "two runs in a row: not yet")
s = health.update(s, [("news", "toledo")], [], "2026-11-05T02:00:00Z")
ok(s == {}, "the next good run clears it")

print("a real breakage: one issue, only its teams")
s = {}
for i, now in enumerate(["2026-11-05T03:07:00Z", "2026-11-05T03:37:00Z", "2026-11-05T04:07:00Z"]):
    s = health.update(s, [("confav", "ohio-state"), ("confav", "toledo")],
                      [("confav", t, ADV) for t in SIX], now)
b = health.broken(s)
ok(list(b) == ["confav"] and [r[0] for r in b["confav"]] == SIX, "three runs in a row: the six teams, and only them")
ok(all(r[1] == "2026-11-05T03:07:00Z" and r[2] == 3 and r[3] == ADV for r in b["confav"]),
   "each with when it started, how many runs, and why")
ok(health.title("confav", b["confav"]) == "Conference injury reports not updating for 6 teams", "the title names the source and the count")
text = health.body("confav", b["confav"], "https://example/run")
ok("utah-state" in text and "Advance Report" in text and "every other team is updating normally" in text,
   "the body names the teams, the reason, and that everyone else is fine")
ok(health.plan(s, {}) == [("open", "confav")], "no issue yet: open one")
ok(health.plan(s, {"confav": 7}) == [("update", "confav", 7)], "one open: update it in place (no email)")

print("not due is not recovered")
s2 = health.update(s, [], [], "2026-11-05T04:37:00Z")
ok(s2 == s, "a run that did not try the source changes nothing")

print("recovery closes it")
part = health.update(s, [("confav", t) for t in SIX[:5]], [("confav", SIX[5], ADV)], "2026-11-05T04:37:00Z")
ok(health.plan(part, {"confav": 7}) == [("update", "confav", 7)], "five back, one still failing: stays open")
done = health.update(part, [("confav", SIX[5])], [], "2026-11-05T05:07:00Z")
ok(health.plan(done, {"confav": 7}) == [("close", "confav", 7)], "all back: close it")

print("a league-wide source")
s = {}
for i in range(3):
    s = health.update(s, [], [("fpi", "league", "the step failed - see the run's log")], "2026-11-05T0%d:00:00Z" % i)
ok(health.title("fpi", health.broken(s)["fpi"]) == "FPI is not updating", "a league-wide source reads as itself, not '1 team'")

print("a step that skipped itself is not a recovery (Codex, #225)")
lok, lfail = health.league("champion=skipped,prospects=failure,fpi=success,news=")
ok(lok == [("fpi", "league")] and [f[:2] for f in lfail] == [("prospects", "league")],
   "success counts, failure counts, skipped and empty count for nothing")
s = {"champion|league": {"since": "2026-11-05T01:00:00Z", "runs": 4, "reason": "x"}}
ok(health.update(s, lok, lfail, "2026-11-05T03:00:00Z")["champion|league"]["runs"] == 4,
   "a skipped champion step keeps its failure streak, so its issue stays open")

print("\n" + ("%d check(s) FAILED" % failures if failures else "a broken source is told once, for its teams, for its reason"))
sys.exit(1 if failures else 0)
