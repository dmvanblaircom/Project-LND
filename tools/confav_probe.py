"""Temporary (2026-10-30): read-only. Which archive rows the producer refuses."""
import json, sys, collections
sys.path.insert(0, "tools/producers")
import conference_availability as ca, teamconfig
for conf in ("MAC", "AAC"):
    p = ca.call("get-archive-public", {"sport": "Football", "organization": conf, "conference": conf})
    rows = p.get("data") or []
    bad = [r for r in rows if not (ca._date(r.get("Week")) and str(r.get("OpponentDisplay") or r.get("Opponent") or "").strip() and all(k in r for k in ca.ORDER))]
    keys = collections.Counter(k for r in rows for k in r)
    print("CONF", conf, len(rows), "rows,", len(bad), "refused; keys:", dict(keys))
    for r in bad[:6]:
        print("BAD", conf, json.dumps(r)[:700])
    print("SAMPLE", conf, json.dumps(rows[0])[:700] if rows else None)
pub = ca.call("get-publish-public", {"sport": "Football", "organization": "ACC", "conference": "ACC"})
for rid, r in (pub or {}).items():
    for g in (r or {}).get("games") or []:
        for row in g.get("rows") or []:
            n = str(row.get("name"))
            if not ca.NAME.match(n): print("ACCNAME", g.get("teamDisplayName"), repr(n), row.get("status"))
