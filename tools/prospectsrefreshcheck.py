#!/usr/bin/env python3
"""The recruiting and draft refresh (tools/producers/prospects.py, W16): a
team's class read through its own config, once a day, and an empty class
never replacing a kept one. Real ESPN fixtures; no network."""
import json
import os
import subprocess
import sys
import tempfile
from datetime import datetime, timedelta, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "producers"))
import prospects as P  # noqa: E402
import teamconfig  # noqa: E402

FIX = os.path.join(HERE, "fixtures")
checks = 0


def ok(cond, label):
    global checks
    if not cond:
        print("FAIL " + label)
        sys.exit(1)
    checks += 1
    print("  ok   " + label)


def fixture(name):
    with open(os.path.join(FIX, name)) as f:
        return json.load(f)


# ---- each team declares its class --------------------------------------------
teams = subprocess.run([sys.executable, os.path.join(HERE, "producers", "teamconfig.py"), "--with", "recruits"],
                       capture_output=True, text=True, check=True).stdout.split()
ok(teams == ["notre-dame", "ohio-state"], "both teams declare a recruiting class, so the workflow loops over both")
for t in teams:
    c = teamconfig.load(t)
    ok(teamconfig.snapshot(c, "recruits")["file"] == "data/%s/recruits.json" % t,
       "%s's class lives in its own folder (decision 0008)" % t)

# ---- once a day --------------------------------------------------------------
now = datetime(2026, 10, 21, 15, 0, tzinfo=timezone.utc)
d = tempfile.mkdtemp()
last = os.path.join(d, "prospects")
ok(P.due(last, now), "never refreshed: due")
with open(last, "w") as f:
    f.write((now - timedelta(hours=3)).strftime("%Y-%m-%dT%H:%M:%SZ"))
ok(not P.due(last, now), "refreshed three hours ago: not due")
with open(last, "w") as f:
    f.write((now - timedelta(hours=P.EVERY_HOURS)).strftime("%Y-%m-%dT%H:%M:%SZ"))
ok(P.due(last, now), "refreshed %d hours ago: due again" % P.EVERY_HOURS)
with open(last, "w") as f:
    f.write("not a time")
ok(P.due(last, now), "an unreadable record: due - when in doubt, refresh")
r = subprocess.run([sys.executable, os.path.join(HERE, "producers", "prospects.py"), "due", "--last", last])
ok(r.returncode == 0, "the workflow's question answers with exit 0 when due")
with open(last, "w") as f:
    f.write(datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))
r = subprocess.run([sys.executable, os.path.join(HERE, "producers", "prospects.py"), "due", "--last", last], capture_output=True)
ok(r.returncode == 3, "and 3 when not")

# ---- a class never vanishes overnight ---------------------------------------
nd = P.normalize_class(fixture("espn-recruits-nd-2027.json"), "87")
ok(nd["recruits"] and nd["classYear"], "Notre Dame's real 2027 class reads (%d recruits)" % len(nd["recruits"]))
empty = dict(nd, recruits=[])
try:
    P.keeps_class(nd, empty)
    refused = False
except P.Refused:
    refused = True
ok(refused, "the same class come back empty is refused: the kept one stays")
P.keeps_class(nd, dict(empty, classYear=(nd["classYear"] or 0) + 1))
ok(True, "a new class year starting empty is believed")
P.keeps_class(None, empty)
ok(True, "with nothing kept, an empty class is written")

# ---- end to end, through the team's own config -------------------------------
out = os.path.join(d, "recruits.json")
r = subprocess.run([sys.executable, os.path.join(HERE, "producers", "prospects.py"), "recruits", "--team", "notre-dame",
                    "--from-file", os.path.join(FIX, "espn-recruits-nd-2027.json"), "--out", out], capture_output=True, text=True)
got = json.load(open(out))
ok(r.returncode == 0 and got["teamId"] == "87" and len(got["recruits"]) == len(nd["recruits"]),
   "--team takes Notre Dame's ESPN id from its config")
hollow = os.path.join(d, "hollow.json")
json.dump(dict(fixture("espn-recruits-nd-2027.json"), items=[]), open(hollow, "w"))
before = open(out).read()
r = subprocess.run([sys.executable, os.path.join(HERE, "producers", "prospects.py"), "recruits", "--team", "notre-dame",
                    "--from-file", hollow, "--out", out], capture_output=True, text=True)
ok(r.returncode == 1 and open(out).read() == before and "refused" in r.stdout,
   "an empty answer from ESPN is refused with a reason, and the kept class stays as it was")

print("\n%d checks: each team's class and the draft board, refreshed once a day; nothing kept is lost" % checks)
