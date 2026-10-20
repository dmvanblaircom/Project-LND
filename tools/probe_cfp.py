#!/usr/bin/env python3
"""Last season's CFP rankings, as real payloads: ESPN's core API (past weeks)
and archived copies of the site API feed the app and Worker read."""
import gzip, json, urllib.request
UA = {"user-agent": "Mozilla/5.0"}
def get(u):
    raw = urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=30).read()
    if raw[:2] == b"\x1f\x8b":
        raw = gzip.decompress(raw)
    return json.loads(raw)
SITE = "https://site.api.espn.com/apis/site/v2/sports/football/college-football/rankings"
CORE = "https://sports.core.api.espn.com/v2/sports/football/leagues/college-football/seasons/2025/types/2/weeks/%d/rankings"
for wk in ():
    try:
        lst = get(CORE % wk)
        refs = [i.get("$ref") for i in lst.get("items", [])]
        print("core week %d: %d polls: %s" % (wk, len(refs), [r.split("/rankings/")[1].split("?")[0] for r in refs]))
        for r in refs:
            p = get(r)
            if "playoff" in (p.get("name", "") + p.get("shortName", "")).lower() or p.get("type") == "cfp":
                print("   CFP: keys=%s name=%s type=%s occ=%s date=%s lastUpdated=%s ranks=%d" % (sorted(p.keys()), p.get("name"), p.get("type"),
                      json.dumps(p.get("occurrence"))[:200], p.get("date"), p.get("lastUpdated"), len(p.get("ranks") or [])))
                print("   first: %s" % json.dumps((p.get("ranks") or [{}])[0])[:400])
                if wk == 11: json.dump(p, open("tools/fixtures/espn-core-cfp-2025-w11.json", "w"), indent=1)
    except Exception as e:
        print("core week %d failed: %s" % (wk, e))
saved = False
for ts in ("20260114",):
    try:
        a = get("https://archive.org/wayback/available?url=%s&timestamp=%s" % (SITE.replace("https://", ""), ts))
        snap = (a.get("archived_snapshots") or {}).get("closest")
        print("wayback %s: %s" % (ts, snap and (snap.get("timestamp"), snap.get("status"))))
        if snap and snap.get("available"):
            raw = snap["url"].replace("/http", "id_/http", 1)
            d = get(raw)
            for r in d.get("rankings", []):
                print("   %s/%s ranks=%d occ=%s date=%s lastUpdated=%s" % (r.get("type"), r.get("shortName"), len(r.get("ranks") or []),
                      (r.get("occurrence") or {}).get("displayValue"), r.get("date"), r.get("lastUpdated")))
            cfp = [r for r in d.get("rankings", []) if r.get("type") == "cfp" and r.get("ranks")]
            if cfp and not saved:
                print("   CFP keys: %s" % sorted(cfp[0].keys()))
                print("   occurrence: %s" % json.dumps(cfp[0].get("occurrence"))[:300])
                print("   first: %s" % json.dumps(cfp[0]["ranks"][0])[:400])
                json.dump(d, open("tools/fixtures/espn-rankings-cfp-%s.json" % snap["timestamp"][:8], "w"), indent=1)
                saved = True
    except Exception as e:
        print("wayback %s failed: %s" % (ts, e))
