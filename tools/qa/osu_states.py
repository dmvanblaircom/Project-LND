"""Ohio State vs Illinois (401858465, Sep 26 2026) in pregame, live and final:
coherent review fixtures for tools/capture.js, from the repository's real
captured live and final summaries and Ohio State's schedule. The pregame
summary is the final with scores, plays and the box score removed.

    python3 tools/qa/osu_states.py tools/fixtures OUT_DIR

Development tooling only: nothing here ships or is read by the app."""
import json, copy, sys
from pathlib import Path
FX = Path(sys.argv[1]); OUT = Path(sys.argv[2]); EV = "401858465"
sched = json.loads((FX/"espn-schedule-osu-2026.json").read_text())
live = json.loads((FX/"espn-summary-osu-ill-live.json").read_text())
final = json.loads((FX/"espn-summary-osu-ill-final.json").read_text())
pre = copy.deepcopy(final)
pc = pre["header"]["competitions"][0]
pc["status"] = {"type": {"name": "STATUS_SCHEDULED", "state": "pre", "completed": False, "description": "Scheduled",
                "detail": "Sat, September 26th at 12:00 PM EDT", "shortDetail": "9/26 - 12:00 PM EDT"}}
for c in pc["competitors"]:
    for k in ("score", "winner", "linescores", "record"): c.pop(k, None)
for k in ("drives", "scoringPlays", "winprobability", "leaders"): pre.pop(k, None)
pre["boxscore"] = {"teams": [{"team": t["team"], "statistics": []} for t in final["boxscore"]["teams"]]}
pre["_comment"] = "Audit-only pregame state derived from the final summary (scores, plays and box removed)."
lc = live["header"]["competitions"][0]
def event(state, summary):
    ev = copy.deepcopy(next(e for e in sched["events"] if e["id"] == EV))
    c = ev["competitions"][0]; sc = summary["header"]["competitions"][0]
    c["status"] = copy.deepcopy(sc["status"])
    sides = {x["id"]: x for x in sc["competitors"]}
    for side in c["competitors"]:
        s = sides.get(side["id"], {})
        if state == "pre": side.pop("score", None); side.pop("winner", None)
        else:
            side["score"] = {"value": float(s["score"]), "displayValue": s["score"]}
            if state == "post": side["winner"] = bool(s.get("winner"))
            else: side.pop("winner", None)
    if state == "in":
        d = summary["drives"].get("current") or {}
        plays = d.get("plays") or []
        last = plays[-1] if plays else {}
        end = last.get("end") or {}
        c["situation"] = {"lastPlay": {"text": last.get("text")}, "downDistanceText": end.get("downDistanceText"),
                          "shortDownDistanceText": end.get("shortDownDistanceText"),
                          "possessionText": end.get("possessionText"), "possession": (end.get("team") or {}).get("id")}
    return ev
OUT.mkdir(parents=True, exist_ok=True)
for name, state, summ in (("pre", "pre", pre), ("live", "in", live), ("final", "post", final)):
    ev = event(state, summ)
    sch = copy.deepcopy(sched)
    # the games after this one have not been played yet; before it, as captured
    sch["events"] = [ev if e["id"] == EV else e for e in sched["events"]]
    sb = copy.deepcopy(ev)
    for side in sb["competitions"][0]["competitors"]:
        side["score"] = str((side.get("score") or {}).get("displayValue") or 0) if isinstance(side.get("score"), dict) else "0"
    (OUT/("schedule-%s.json" % name)).write_text(json.dumps(sch))
    (OUT/("scoreboard-%s.json" % name)).write_text(json.dumps({"events": [sb]}))
    (OUT/("summary-%s.json" % name)).write_text(json.dumps(summ))
print("live:", lc["status"]["type"]["shortDetail"], [(x["team"]["abbreviation"], x["score"]) for x in lc["competitors"]])
