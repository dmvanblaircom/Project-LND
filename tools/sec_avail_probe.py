"""Temporary (2026-10-28): the SEC team names HD Intelligence uses, from
this week's reports and the season's archive. Prints names only."""
import json, urllib.request
for ep in ("get-publish-public", "get-archive-public"):
    body = json.dumps({"sport": "Football", "organization": "SEC", "conference": "SEC"}).encode()
    req = urllib.request.Request("https://app.hdintelligence.com/api/" + ep, data=body,
                                 headers={"content-type": "application/json", "User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            d = json.load(r)
    except Exception as e:
        print(ep, "error", type(e).__name__, str(e)[:120]); continue
    names = {}
    def walk(o):
        if isinstance(o, dict):
            for k in ("teamName", "teamDisplayName"):
                v = o.get(k)
                if isinstance(v, str) and len(v) < 40: names.setdefault(k, set()).add(v)
            for v in o.values(): walk(v)
        elif isinstance(o, list):
            for v in o: walk(v)
    walk(d)
    for k, v in names.items(): print(ep, k, len(v), "|", sorted(v))
