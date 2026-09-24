#!/usr/bin/env python3
"""Trim a real ESPN rankings or scoreboard payload for a test fixture.

Unlike a game summary (tools/trim_summary.py keeps only what TeamOS reads),
these payloads are kept whole in structure and cut only of the bulk that no
Suite screen reads: logo lists, links, ids for other systems, colours,
headline copy, per-player leaders and competitor statistics, and the league
calendar. ESPN's own positions and every other key stay, so a later screen
can read a field without a recapture.

A news feed is the exception: a story IS its headline, link and image, so
`--news` keeps those and drops only other systems' ids.

Usage:  python3 tools/trim_payload.py [--news] raw.json out.json "<comment>"
"""
import json
import sys

DROP = {"links", "logos", "logo", "uid", "guid", "$ref", "color", "alternateColor",
        "headlines", "leaders", "statistics", "notes", "tickets", "highlights",
        "leagues", "images", "slug", "isActive", "conferenceId"}


NEWS_DROP = {"uid", "guid", "$ref"}


def trim(o, drop=DROP):
    if isinstance(o, dict):
        return {k: trim(v, drop) for k, v in o.items() if k not in drop}
    if isinstance(o, list):
        return [trim(v, drop) for v in o]
    return o


if __name__ == "__main__":
    args = sys.argv[1:]
    news = args[:1] == ["--news"]
    raw, out, comment = args[1:] if news else args
    d = trim(json.load(open(raw)), NEWS_DROP if news else DROP)
    d = {"_comment": comment, **d}
    with open(out, "w") as f:
        json.dump(d, f, separators=(",", ":"))
        f.write("\n")
