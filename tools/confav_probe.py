"""Temporary (2026-10-30): read-only. The American's archive columns, Miami's
unreadable ACC row, and where SJSU's athletics feed went."""
import json, re, sys, collections
sys.path.insert(0, "tools/producers")
import conference_availability as ca
from official_depth import fetch
p = ca.call("get-archive-public", {"sport": "Football", "organization": "American", "conference": "American"})
rows = p.get("data") or []
print("CONF American", len(rows), "rows; keys:", dict(collections.Counter(k for r in rows for k in r)))
pub = ca.call("get-publish-public", {"sport": "Football", "organization": "ACC", "conference": "ACC"})
for rid, r in (pub or {}).items():
    for g in (r or {}).get("games") or []:
        for row in g.get("rows") or []:
            if not ca.NAME.match(str(row.get("name"))):
                print("ACCNAME", g.get("teamDisplayName"), json.dumps(row))
for u in ["https://sjsuspartans.com/rss/", "https://sjsuspartans.com/sports/football", "https://sjsuspartans.com/"]:
    try:
        data, final, _ = fetch(u)
        h = data.decode("utf-8", "replace")
        feeds = sorted(set(re.findall(r'<link[^>]+type="application/(?:rss|atom)\+xml"[^>]*href="([^"]+)"', h) +
                           re.findall(r'href="([^"]*(?:rss|feed)[^"]*)"', h, re.I)))[:15]
        print("SJSU", u, "->", final, len(h), "bytes; head:", h[:120].replace("\n", " "), "; feeds:", feeds)
    except Exception as e:
        print("SJSU", u, "error", str(e)[:120])
