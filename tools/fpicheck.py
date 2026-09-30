#!/usr/bin/env python3
"""The FPI producer (tools/producers/fpi.py), against a real ESPN payload.

A complete, current table becomes the snapshot; anything else is refused
with a reason and the previous snapshot stays. Runs the real fixture
captured from GitHub's network (tools/fixtures/espn-fpi-sep30.json) - no
network here.

    python3 tools/fpicheck.py      (exit 1 on any failure)
"""
import copy
import json
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "producers"))
import fpi  # noqa: E402

failures = 0


def ok(cond, what):
    global failures
    print("  %s %s" % ("ok  " if cond else "FAIL", what))
    if not cond:
        failures += 1


def refused(payload, season=2026):
    try:
        fpi.normalize(payload, season)
    except fpi.Refused as e:
        return str(e)
    return None


REAL = json.load(open(os.path.join(HERE, "fixtures", "espn-fpi-sep30.json"), encoding="utf-8"))
snap = fpi.normalize(REAL, 2026)
by = {t["espnId"]: t for t in snap["teams"]}

print("the real table")
ok(len(snap["teams"]) == 138, "every FBS team in ESPN's table: %d" % len(snap["teams"]))
ok((snap["season"], snap["week"], snap["weekText"]) == (2026, 5, "Week 5"), "the edition: 2026, Week 5")
ok(snap["sourceUpdated"] == "2026-09-30T08:00Z", "ESPN's own update time, kept apart from when we fetched")
ok(snap["kind"] == "predictive rating" and snap["source"] == "fpi", "labelled a predictive rating, not a poll")
ok([t["rank"] for t in snap["teams"]] == sorted(t["rank"] for t in snap["teams"]), "in ESPN's rank order")
nd, osu = by.get("87"), by.get("194")
ok(nd and (nd["rank"], nd["rating"], nd["record"]) == (2, 27.8, "4-0"), "Notre Dame by ESPN id: #2, 27.8, 4-0")
ok(osu and (osu["rank"], osu["rating"], osu["record"]) == (3, 27.8, "3-1"), "Ohio State by ESPN id: #3, 27.8, 3-1")
ok(any(t["rating"] < 0 for t in snap["teams"]) and min(t["rating"] for t in snap["teams"]) == -27.6,
   "negative ratings survive: the last team is -27.6")
ok(all("votes" not in t and "points" not in t for t in snap["teams"]), "no poll fields: no votes, no points")

print("a zero, and what the source leaves out")
z = copy.deepcopy(REAL)
z["teams"][5]["categories"][0]["values"][0] = 0.0
ok(fpi.normalize(z, 2026)["teams"][5]["rating"] == 0.0, "a rating of 0 is a rating, not a missing one")
m = copy.deepcopy(REAL)
names = m["categories"][0]["names"]
for t in m["teams"]:
    t["categories"][0]["values"][names.index("rankchange7days")] = None
ok(all(t["rankChange"] is None for t in fpi.normalize(m, 2026)["teams"]), "a missing rank change stays missing, never 0")

print("refused, with the reason")
ok(refused(REAL, 2027) == "season 2026, expected 2027", "the wrong season")
part = copy.deepcopy(REAL); part["teams"] = part["teams"][:60]
ok("partial" in (refused(part) or ""), "a partial table (60 teams)")
dup = copy.deepcopy(REAL); dup["teams"].append(copy.deepcopy(dup["teams"][0]))
ok("twice" in (refused(dup) or ""), "a team listed twice")
ren = copy.deepcopy(REAL); ren["categories"][0]["names"] = [n.replace("fpirank", "rk") for n in ren["categories"][0]["names"]]
ok("columns" in (refused(ren) or ""), "a column ESPN renamed: fails visibly, not silently misread")
bad = copy.deepcopy(REAL); bad["teams"][3]["categories"][0]["values"][names.index("fpirank")] = None
ok("rank" in (refused(bad) or ""), "a row without a rank")
ok(refused({"error": "x"}) == "no teams list", "an error page instead of a table")

print("written only when ESPN publishes a new edition")
with tempfile.TemporaryDirectory() as d:
    out, src = os.path.join(d, "fpi.json"), os.path.join(d, "p.json")
    json.dump(REAL, open(src, "w"))
    run = lambda f: subprocess.run([sys.executable, os.path.join(HERE, "producers", "fpi.py"), "--season", "2026",
                                    "--from-file", f, "--out", out], capture_output=True, text=True)
    first = run(src)
    ok(first.returncode == 0 and os.path.exists(out), "the first edition is written")
    stamp = json.load(open(out))["fetchedAt"]
    again = run(src)
    ok("unchanged" in again.stdout and json.load(open(out))["fetchedAt"] == stamp,
       "the same edition again: nothing written, so nothing committed")
    json.dump(part, open(src, "w"))
    broken = run(src)
    ok(broken.returncode == 1 and len(json.load(open(out))["teams"]) == 138,
       "a broken table: the run fails and the previous snapshot stays")
    nxt = copy.deepcopy(REAL); nxt["lastUpdated"] = "2026-10-01T08:00Z"
    json.dump(nxt, open(src, "w"))
    ok(run(src).returncode == 0 and json.load(open(out))["sourceUpdated"] == "2026-10-01T08:00Z",
       "ESPN's next update replaces it")

print("\n" + ("%d check(s) FAILED" % failures if failures else "FPI arrives whole and current, or not at all"))
sys.exit(1 if failures else 0)
