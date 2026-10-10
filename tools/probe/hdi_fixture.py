# Probe branch only: a test fixture from the live public JSON - images
# stripped, the current reports that name Ohio State or Iowa, every archive row.
import json
def strip(o):
    if isinstance(o, dict): return {k: strip(v) for k, v in o.items() if not (isinstance(v, str) and (v.startswith("data:") or len(v) > 300))}
    if isinstance(o, list): return [strip(v) for v in o]
    return o
pub = json.load(open("publish.json")); arc = json.load(open("archive.json"))
keep = {k: strip(v) for k, v in pub.items() if any(g.get("teamName") in ("Ohio St.", "Ohio State", "Iowa") or g.get("teamDisplayName") in ("Ohio State",) for g in v.get("games", []))}
print("TEAMS", [[g.get("teamName"), g.get("teamDisplayName")] for v in pub.values() for g in v.get("games", [])])
print("REPORTDAYS", json.dumps(arc.get("report_days")))
out = {"publish": keep, "archive": strip(arc)}
print("FIXTURE " + json.dumps(out, ensure_ascii=False, separators=(",", ":")))
