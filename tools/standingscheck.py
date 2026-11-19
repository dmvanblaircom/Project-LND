#!/usr/bin/env python3
"""The standings producer (tools/producers/standings.py): a complete table
becomes the snapshot; anything else is refused and the last good one stays.
No network: an ESPN-shaped payload (tools/fixtures/espn-standings-shape-2026.json).

    python3 tools/standingscheck.py      (exit 1 on any failure)
"""
import copy
import json
import os
import subprocess
import sys
import tempfile
from datetime import datetime, timedelta, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "producers"))
import standings  # noqa: E402

failures = 0


def ok(cond, what):
    global failures
    print("  %s %s" % ("ok  " if cond else "FAIL", what))
    if not cond:
        failures += 1


def refused(payload, season=2026):
    try:
        standings.normalize(payload, season)
    except standings.Refused as e:
        return str(e)
    return None


REAL = json.load(open(os.path.join(HERE, "fixtures", "espn-standings-shape-2026.json"), encoding="utf-8"))
snap = standings.normalize(REAL, 2026)
print("the table")
ok(len(snap["conferences"]) == 10, "ten conferences: the independents have no race")
ok(not any("Independent" in c["name"] for c in snap["conferences"]), "and none of them is the independents")
ok(sum(len(c["teams"]) for c in snap["conferences"]) == 136, "every conference team, once")
ok(all(c["teams"] == sorted(c["teams"], key=lambda t: (t["conf"]["losses"], -t["conf"]["wins"], t["name"])) for c in snap["conferences"]),
   "each conference by its record, not ESPN's list order")
t = snap["conferences"][0]["teams"][0]
ok(set(t) == {"espnId", "name", "conf", "overall"} and set(t["conf"]) == {"wins", "losses"}, "a row: id, name, conference record, overall")

print("refused, with a reason")
ok(refused(REAL, 2027) == "season 2026, expected 2027", "another season")
bad = copy.deepcopy(REAL)
bad["children"][0]["standings"]["entries"][0]["stats"] = []
ok("without an id or a conference record" in (refused(bad) or ""), "a team with no conference record")
few = copy.deepcopy(REAL)
few["children"] = few["children"][:4]
ok("only" in (refused(few) or ""), "a partial table")
ok(refused({"error": "x"}) == "no conference list", "an error page")
one = copy.deepcopy(REAL)
one["children"] = [g for g in one["children"] if "Independent" in g["name"]] + \
    [g for g in one["children"] if "Independent" not in g["name"]][1:]
ok("only 9 conferences" in (refused(one) or ""), "one conference missing from a table otherwise whole")
prev = standings.normalize(REAL, 2026)
less = copy.deepcopy(prev)
less["conferences"] = less["conferences"][1:]
ok(standings.missing(prev, less) == [prev["conferences"][0]["name"]], "a conference the last snapshot had: named")
ok(standings.missing(dict(prev, season=2025), less) == [], "but a new season starts fresh")
ok(standings.missing(None, less) == [], "and so does the first snapshot")

print("written only when it moved, and once a day")
with tempfile.TemporaryDirectory() as d:
    out, src = os.path.join(d, "s.json"), os.path.join(d, "p.json")
    json.dump(REAL, open(src, "w"))
    run = lambda: subprocess.run([sys.executable, os.path.join(HERE, "producers", "standings.py"), "--season", "2026",
                                  "--from-file", src, "--out", out], capture_output=True, text=True)
    ok(run().returncode == 0 and os.path.exists(out), "the first table is written")
    stamp = json.load(open(out))["fetchedAt"]
    ok("unchanged" in run().stdout and json.load(open(out))["fetchedAt"] == stamp, "the same table again: nothing written")
    json.dump(few, open(src, "w"))
    ok(run().returncode == 1 and len(json.load(open(out))["conferences"]) == 10, "a broken table: the run fails, the last good one stays")
    last = os.path.join(d, "last")
    now = datetime(2026, 11, 19, 12, 0, tzinfo=timezone.utc)
    ok(standings.due(last, now), "no record of a last run: due")
    open(last, "w").write((now - timedelta(hours=2)).strftime("%Y-%m-%dT%H:%M:%SZ"))
    ok(not standings.due(last, now), "two hours ago: not due")
    open(last, "w").write((now - timedelta(hours=21)).strftime("%Y-%m-%dT%H:%M:%SZ"))
    ok(standings.due(last, now), "a day ago: due")

print("\n" + ("%d check(s) FAILED" % failures if failures else "the standings arrive whole and current, or not at all"))
sys.exit(1 if failures else 0)
