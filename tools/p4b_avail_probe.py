"""Temporary (2026-10-29): which of the American's, Mountain West's and
Pac-12's codes HD Intelligence answers, and the team names it uses. Names only."""
import json, urllib.request
for conf in ("MAC", "SBC", "Sun Belt Conference", "SunBeltConference", "SUNBELT", "SBELT", "Sunbelt", "Conference USA", "ConferenceUSA", "CUSA", "C-USA", "CUSA Football", "Independent", "Independents", "IND", "FBS Independents", "UConn"):
    for ep in ("get-publish-public", "get-archive-public"):
        body = json.dumps({"sport": "Football", "organization": conf, "conference": conf}).encode()
        req = urllib.request.Request("https://app.hdintelligence.com/api/" + ep, data=body,
                                     headers={"content-type": "application/json", "User-Agent": "Mozilla/5.0"})
        try:
            with urllib.request.urlopen(req, timeout=40) as r:
                d = json.load(r)
        except Exception as e:
            print(conf, ep, "error", type(e).__name__, str(e)[:80]); continue
        names = set()
        def walk(o):
            if isinstance(o, dict):
                for k in ("teamName", "Team"):
                    v = o.get(k)
                    if isinstance(v, str) and len(v) < 40: names.add(v)
                for v in o.values(): walk(v)
            elif isinstance(o, list):
                for v in o: walk(v)
        walk(d)
        print(conf, ep, len(names), "|", sorted(names))
