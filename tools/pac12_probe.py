"""Temporary (2026-11-05): read-only. Report names, dates and sizes in the
Pac-12's and Sun Belt's report files. No player names are printed."""
import json, urllib.request
for conf in ("pac12", "sunbelt"):
    url = "https://sbcautostorage.blob.core.windows.net/availability-reports/%s-football/prod/report.json" % conf
    with urllib.request.urlopen(urllib.request.Request(url, headers={"user-agent": "Mozilla/5.0"}), timeout=30) as r:
        d = json.load(r)
    print("==", conf, "top keys:", sorted(d.keys()) if isinstance(d, dict) else type(d))
    for k, v in (d.items() if isinstance(d, dict) else []):
        if k != "games":
            print("  ", k, "=", str(v)[:200])
    for g in d.get("games", []):
        h, a = g.get("home") or {}, g.get("away") or {}
        print("  notes=%r date=%s updated=%s | %s (%d rows) vs %s (%d rows) | keys=%s" % (
            g.get("notes"), g.get("dateISO"), g.get("updatedAtUTC"), a.get("name"), len(a.get("players") or []),
            h.get("name"), len(h.get("players") or []), sorted(g.keys())))
        for side in (a, h):
            st = sorted({str(p.get("status")) for p in side.get("players") or []})
            print("      statuses:", st)
