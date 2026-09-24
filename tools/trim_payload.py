#!/usr/bin/env python3
"""Trim a real ESPN rankings or scoreboard payload for a test fixture.

Unlike a game summary (tools/trim_summary.py keeps only what TeamOS reads),
these payloads are kept whole in structure and cut only of the bulk that no
Suite screen reads: logo lists, links, ids for other systems, colours,
headline copy, per-player leaders and competitor statistics, and the league
calendar. ESPN's own positions and every other key stay, so a later screen
can read a field without a recapture.

Usage:  python3 tools/trim_payload.py raw.json out.json "<comment>"
"""
import json
import sys

DROP = {"links", "logos", "logo", "uid", "guid", "$ref", "color", "alternateColor",
        "headlines", "leaders", "statistics", "notes", "tickets", "highlights",
        "leagues", "images", "slug", "isActive", "conferenceId"}


def trim(o):
    if isinstance(o, dict):
        return {k: trim(v) for k, v in o.items() if k not in DROP}
    if isinstance(o, list):
        return [trim(v) for v in o]
    return o


if __name__ == "__main__":
    raw, out, comment = sys.argv[1], sys.argv[2], sys.argv[3]
    d = trim(json.load(open(raw)))
    d = {"_comment": comment, **d}
    with open(out, "w") as f:
        json.dump(d, f, separators=(",", ":"))
        f.write("\n")
