#!/usr/bin/env python3
"""SP+ through CFBD: shapes, counts and identity joins - never a value.

    CFBD_API_KEY=... YEAR=2026 python3 tools/cfbd_sp_probe.py

For designing the edge API's SP+ route (handoff 2026-10-14, slice 4) against
real responses (decision 0012). The Actions log is public, so it prints key
names, types and counts only, plus OUR registry's names (from ESPN) where a
join fails. No CFBD rating, rank or school string is printed.
"""
import json
import os
import re
import sys
import urllib.parse
import urllib.request

key = os.environ.get("CFBD_API_KEY")
if not key:
    print("::error::CFBD_API_KEY is not set")
    sys.exit(1)
year = os.environ.get("YEAR", "2026")


def get(path, **q):
    url = "https://api.collegefootballdata.com%s?%s" % (path, urllib.parse.urlencode(q))
    req = urllib.request.Request(url, headers={"authorization": "Bearer " + key, "accept": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r), dict(r.headers)


def shape(o, depth=0):
    if isinstance(o, dict) and depth < 3:
        return {k: shape(v, depth + 1) for k, v in o.items()}
    return type(o).__name__


def num(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool)


reg = []
for line in open(os.path.join(os.path.dirname(__file__), "..", "teams", "index.js"), encoding="utf-8"):
    m = re.search(r'name: "([^"]+)".*providerId: "(\d+)"', line)
    if m:
        reg.append((m.group(1), m.group(2)))
print("registry: %d programs with a providerId" % len(reg))

for y in (year, str(int(year) - 1)):
    print("\n== /ratings/sp year=%s" % y)
    try:
        sp, hdr = get("/ratings/sp", year=y)
    except Exception as e:  # noqa: BLE001
        print("  failed (%s)" % e)
        continue
    print("  type %s, %d rows" % (type(sp).__name__, len(sp) if isinstance(sp, list) else -1))
    print("  headers: %s" % sorted(k.lower() for k in hdr))
    if not isinstance(sp, list) or not sp:
        continue
    print("  shape row 0: %s" % json.dumps(shape(sp[0]))[:1500])
    keys = {}
    for r in sp:
        for k in r:
            keys[k] = keys.get(k, 0) + 1
    print("  keys (rows carrying): %s" % keys)
    print("  rows with numeric ranking: %d, numeric rating: %d" %
          (sum(1 for r in sp if num(r.get("ranking"))), sum(1 for r in sp if num(r.get("rating")))))
    rk = [r.get("ranking") for r in sp if num(r.get("ranking"))]
    print("  distinct rankings %d; min..max present: %s; 1..25 all present: %s" %
          (len(set(rk)), bool(rk), all(i in rk for i in range(1, 26))))
    print("  rows with null/absent ranking: %d (their team field is a str: %s)" %
          (sum(1 for r in sp if not num(r.get("ranking"))),
           [isinstance(r.get("team"), str) for r in sp if not num(r.get("ranking"))][:5]))
    print("  rows whose year != requested: %d" % sum(1 for r in sp if str(r.get("year")) != y))
    print("  zero ratings: %d, negative ratings: %d" %
          (sum(1 for r in sp if r.get("rating") == 0), sum(1 for r in sp if num(r.get("rating")) and r["rating"] < 0)))
    print("  ranking ties (same ranking twice): %d" % (len(rk) - len(set(rk))))
    print("  sorted by ranking already: %s" % (rk == sorted(rk)))
    if y != year:
        continue

    print("\n== /teams/fbs year=%s" % y)
    try:
        teams, _ = get("/teams/fbs", year=y)
    except Exception as e:  # noqa: BLE001
        print("  failed (%s)" % e)
        teams = []
    print("  %d rows; shape row 0: %s" % (len(teams), json.dumps(shape(teams[0]))[:1200] if teams else "-"))
    by_school = {}
    for t in teams:
        by_school.setdefault(t.get("school"), []).append(t)
    print("  schools appearing twice: %d" % sum(1 for v in by_school.values() if len(v) > 1))
    ids = {str(t.get("id")): t for t in teams}
    sp_names = [r.get("team") for r in sp if num(r.get("ranking"))]
    hit = [n for n in sp_names if n in by_school]
    print("  ranked SP rows whose team matches a /teams/fbs school exactly: %d of %d" % (len(hit), len(sp_names)))
    top = [r.get("team") for r in sp if num(r.get("ranking")) and r["ranking"] <= 25]
    print("  top-25 SP rows matching a school exactly: %d of %d" % (sum(1 for n in top if n in by_school), len(top)))
    same, diff, absent = 0, [], []
    for name, pid in reg:
        t = ids.get(pid)
        if not t:
            absent.append((name, pid))
        elif t.get("school") == name:
            same += 1
        else:
            diff.append((name, pid))
    print("  registry providerId == CFBD id with the same name: %d; same id, different name: %d; id not in CFBD FBS: %d" %
          (same, len(diff), len(absent)))
    print("  registry names where CFBD's name for that id differs: %s" % diff)
    print("  registry names whose id is not a CFBD FBS id: %s" % absent)
    for name, pid in (("Notre Dame", "87"), ("Ohio State", "194")):
        t = ids.get(pid)
        print("  %s (%s): CFBD id present %s, same name %s, in SP %s" %
              (name, pid, bool(t), bool(t) and t.get("school") == name, bool(t) and t.get("school") in sp_names))
