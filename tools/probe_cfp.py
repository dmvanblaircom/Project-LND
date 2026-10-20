#!/usr/bin/env python3
"""Which ESPN rankings URL returns a filled CFP poll for a past week, and
what it looks like (for the CFP-rankings alert, postseason slice 1)."""
import json, urllib.request
API = "https://site.api.espn.com/apis/site/v2/sports/football/college-football/rankings"
UA = {"user-agent": "Mozilla/5.0"}
best = None
for q in ["?season=2025&week=11", "?season=2025&week=14", "?seasons=2025&weeks=11",
          "?dates=2025&week=11", "?season=2025&seasontype=2&week=11", "?season=2025&week=15&seasontype=2", ""]:
    try:
        d = json.load(urllib.request.urlopen(urllib.request.Request(API + q, headers=UA), timeout=20))
    except Exception as e:
        print("%-40s failed: %s" % (q or "(current)", e)); continue
    rows = []
    for r in d.get("rankings", []):
        rows.append("%s/%s ranks=%d occ=%s date=%s lastUpdated=%s" % (r.get("type"), r.get("shortName"), len(r.get("ranks") or []),
                    (r.get("occurrence") or {}).get("displayValue"), r.get("date"), r.get("lastUpdated")))
    print("%-40s %s" % (q or "(current)", "; ".join(rows)))
    for r in d.get("rankings", []):
        if r.get("type") == "cfp" and r.get("ranks") and q:
            if not best:
                best = (q, d)
                print("   CFP keys: %s; first rank: %s" % (sorted(r.keys()), json.dumps(r["ranks"][0])[:400]))
                print("   occurrence: %s" % json.dumps(r.get("occurrence"))[:300])
                print("   top level keys: %s" % sorted(d.keys()))
if best:
    json.dump(best[1], open("tools/fixtures/espn-rankings-cfp-2025.json", "w"), indent=1)
    print("saved tools/fixtures/espn-rankings-cfp-2025.json from", best[0])
