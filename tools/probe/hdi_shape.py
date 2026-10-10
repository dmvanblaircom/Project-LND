# Probe branch only: compact shape of the Big Ten's public availability JSON.
import json, sys
def strip(o):
    if isinstance(o, dict): return {k: strip(v) for k, v in o.items()}
    if isinstance(o, list): return [strip(v) for v in o]
    if isinstance(o, str) and (o.startswith("data:") or len(o) > 200): return "<%d chars>" % len(o)
    return o
pub = strip(json.load(open("publish.json")))
print("publish: %d reports" % len(pub))
for rid, r in pub.items():
    scal = {k: v for k, v in r.items() if not isinstance(v, (list, dict))}
    nest = {k: (type(v).__name__, len(v)) for k, v in r.items() if isinstance(v, (list, dict))}
    print("\nREPORT", rid, json.dumps(scal))
    print("  nested:", json.dumps(nest))
    for k, v in r.items():
        if isinstance(v, list) and v and isinstance(v[0], dict): print("  %s[0] = %s" % (k, json.dumps(v[0])))
        if isinstance(v, dict):
            for kk, vv in list(v.items())[:3]: print("  %s.%s = %s" % (k, kk, json.dumps(vv)[:400]))
osu = [r for r in pub.values() if "ohio st" in json.dumps(r).lower()]
print("\nOSU reports:", len(osu))
for r in osu:
    for k, v in r.items():
        if isinstance(v, list) and v and isinstance(v[0], dict):
            print(" list", k, len(v))
            for p in v:
                if p.get("status") not in ("Available",): print("   ", json.dumps(p))
arc = strip(json.load(open("archive.json")))
print("\narchive keys:", {k: (v if not isinstance(v, (list, dict)) else type(v).__name__ + str(len(v))) for k, v in arc.items()})
rows = arc["data"]
print("rows:", len(rows), "keys:", sorted(rows[0].keys()))
from collections import Counter
print("weeks:", sorted(Counter((r["WeekNum"], r["Week"]) for r in rows).items()))
print("statuses:", Counter(v for r in rows for k, v in r.items() if k in ("Initial", "Update 1", "Update 2", "Game Day")))
print("OSU rows:", sum(1 for r in rows if r["Team"].startswith("Ohio")), "teams:", sorted(set(r["Team"] for r in rows)))
for r in rows:
    if r["Team"].startswith("Ohio"): print("  ", json.dumps(r))
