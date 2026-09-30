#!/usr/bin/env python3
"""Print the stat names CollegeFootballData returns - names only, no values.

    CFBD_API_KEY=... TEAM="Notre Dame" YEAR=2026 python3 tools/cfbd_probe.py

For designing the edge API's CFBD_FIELDS (worker/src/index.js) against a real
response (decision 0012), without publishing CFBD data: the Actions log of a
public repository is public, so values never reach it.
"""
import json
import os
import sys
import urllib.parse
import urllib.request

key = os.environ.get("CFBD_API_KEY")
if not key:
    print("::error::CFBD_API_KEY is not set (docs/engineering/edge-api.md)")
    sys.exit(1)
team, year = os.environ.get("TEAM", "Notre Dame"), os.environ.get("YEAR", "2026")
for path in ("/stats/season", "/stats/season/advanced"):
    url = "https://api.collegefootballdata.com%s?%s" % (path, urllib.parse.urlencode({"year": year, "team": team}))
    req = urllib.request.Request(url, headers={"authorization": "Bearer " + key, "accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            rows = json.load(r)
    except Exception as e:  # noqa: BLE001 - a probe reports every failure
        print("== %s: failed (%s)" % (path, e))
        continue
    print("== %s: %s" % (path, type(rows).__name__))
    if isinstance(rows, list) and rows and isinstance(rows[0], dict):
        print("  row keys: %s" % sorted(rows[0].keys()))
        names = {}
        for row in rows:
            n = row.get("statName")
            if n:
                names[n] = names.get(n, 0) + 1
        for n in sorted(names):
            print("  statName %s (%d row%s)" % (n, names[n], "" if names[n] == 1 else "s"))
        if not names:
            def shape(o, depth=0):
                if isinstance(o, dict) and depth < 3:
                    return {k: shape(v, depth + 1) for k, v in o.items()}
                return type(o).__name__
            print("  shape: %s" % json.dumps(shape(rows[0]))[:1500])
