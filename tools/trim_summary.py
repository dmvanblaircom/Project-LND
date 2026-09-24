#!/usr/bin/env python3
"""Trim an ESPN game summary to the keys TeamOS reads, for a test fixture.

Real payloads are large and mostly irrelevant; the fixtures keep ESPN's own
structure and positions but only the keys teamos/espn.js reads, so a test
fails when ESPN moves something we depend on and not otherwise. Drives and
their plays are kept whole in shape (every drive, every play) because the
Drive Tracker and Plays views are built from them.

Usage:  python3 tools/trim_summary.py raw.json out.json "<comment>"
"""
import json
import sys

KEEP_TOP = ["header", "boxscore", "leaders", "pickcenter", "scoringPlays",
            "winprobability", "situation", "drives"]
PLAY_KEYS = ["id", "text", "type", "clock", "period", "start", "end",
             "statYardage", "scoringPlay", "scoringType"]
SPOT_KEYS = ["down", "distance", "yardLine", "yardsToEndzone", "downDistanceText",
             "shortDownDistanceText", "possessionText", "team"]
DRIVE_KEYS = ["id", "description", "team", "start", "end", "timeElapsed", "yards",
              "isScore", "offensivePlays", "result", "displayResult", "plays"]


def pick(d, keys):
    return {k: d[k] for k in keys if k in d}


def team_ref(t):
    return pick(t or {}, ["id", "abbreviation"]) if isinstance(t, dict) else t


def spot(s):
    out = pick(s or {}, SPOT_KEYS)
    if "team" in out:
        out["team"] = team_ref(out["team"])
    return out


def play(p):
    out = pick(p, PLAY_KEYS)
    for k in ("start", "end"):
        if k in out:
            out[k] = spot(out[k])
    if "type" in out:
        out["type"] = pick(out["type"], ["id", "text", "abbreviation"])
    if "scoringType" in out:
        out["scoringType"] = pick(out["scoringType"], ["name", "abbreviation"])
    return out


def drive(d):
    out = pick(d, DRIVE_KEYS)
    if "team" in out:
        out["team"] = team_ref(out["team"])
    for k in ("start", "end"):
        if k in out and isinstance(out[k], dict):
            out[k] = pick(out[k], ["period", "clock", "yardLine", "text"])
    out["plays"] = [play(p) for p in d.get("plays", [])]
    return out


def main():
    raw, dest, comment = sys.argv[1], sys.argv[2], sys.argv[3]
    d = json.load(open(raw, encoding="utf-8"))
    out = {"_comment": comment}
    for k in KEEP_TOP:
        if k in d:
            out[k] = d[k]
    if "drives" in out:
        dr = out["drives"]
        out["drives"] = {k: ([drive(x) for x in dr[k]] if isinstance(dr[k], list) else drive(dr[k]))
                         for k in ("current", "previous") if k in dr}
    json.dump(out, open(dest, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    n = sum(len(x.get("plays", [])) for x in out.get("drives", {}).get("previous", []))
    print("%s: %d drives, %d plays" % (dest, len(out.get("drives", {}).get("previous", [])), n))


if __name__ == "__main__":
    main()
