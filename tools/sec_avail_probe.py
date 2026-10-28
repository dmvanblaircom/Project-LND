"""Temporary (2026-10-28): does HD Intelligence publish the SEC's (and the
ACC's, Big 12's) availability reports as it does the Big Ten's? Prints counts
and team names only."""
import json, urllib.request
for conf in ("SEC", "ACC", "B12", "BIG12", "B10"):
    body = json.dumps({"sport": "Football", "organization": conf, "conference": conf}).encode()
    req = urllib.request.Request("https://app.hdintelligence.com/api/get-publish-public", data=body,
                                 headers={"content-type": "application/json", "User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            d = json.load(r)
    except Exception as e:
        print(conf, "error", type(e).__name__, str(e)[:120]); continue
    rows = d if isinstance(d, list) else (d.get("data") or d.get("reports") or d.get("items") or [])
    names = set()
    def walk(o):
        if isinstance(o, dict):
            for k, v in o.items():
                if k.lower() in ("team", "teamname", "school", "name") and isinstance(v, str) and len(v) < 40: names.add(v)
                walk(v)
        elif isinstance(o, list):
            for v in o: walk(v)
    walk(d)
    print(conf, type(d).__name__, "keys", list(d)[:8] if isinstance(d, dict) else len(d), "| names:", sorted(names)[:30])
