#!/usr/bin/env python3
"""Is the data pipeline per team (backlog C2)?

Each team's files are its own declaration, in data/<team id>/; the workflow
loops over the teams that declare a kind of snapshot. No producer or
workflow names a team's data file itself. (The Kalshi odds history went with
Kalshi's markets on 2026-11-19.)

Real committed data only; no network.

Usage:  python3 tools/pipelinecheck.py     (exit 1 on any failure)
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(HERE, "producers"))
import teamconfig  # noqa: E402

failures = 0


def ok(cond, what):
    global failures
    print(("  ok   " if cond else "  FAIL ") + what)
    if not cond:
        failures += 1


print("teamconfig: which teams, which files")
# Every config on disk (teams/<id>.js), not the registry's 138 programs - so
# the next phase's teams are counted without editing this list.
ALL = sorted(f[:-3] for f in os.listdir(os.path.join(ROOT, "teams")) if f.endswith(".js") and f != "index.js")
ok(teamconfig.teams() == ALL and len(ALL) >= 21, "every configured team, and not the registry: %d - %s" % (len(ALL), teamconfig.teams()))
with_kind = {k: [t for t in teamconfig.teams() if teamconfig.snapshot(teamconfig.load(t), k)]
             for k in ("depth", "availability", "oddsHistory", "beatNews", "notes")}
def declares(t, *keys):
    c = teamconfig.load(t)
    for k in keys:
        c = (c or {}).get(k)
    return bool(c)
# Game notes: the two whole readings, and every team that declares the
# pronunciation-only reading with where its notes are (F4, from batch 1 on).
SAY = [t for t in ALL if (teamconfig.load(t).get("sources", {}).get("official") or {}).get("notesReads") == ["pronounce"]]
ok(with_kind["depth"] == ["notre-dame"] and with_kind["notes"] == sorted(["notre-dame", "ohio-state"] + SAY) and with_kind["beatNews"] == ALL,
   "the workflow's loops run for the teams that declare each kind - every team's beat news, the game notes of the two read whole "
   "and of the %d read for pronunciations, one depth chart: %s" % (len(SAY), with_kind))
ok(len(SAY) >= 7 and all(declares(t, "sources", "official", "notesIndex") and declares(t, "sources", "official", "notesLink") and
                         declares(t, "sources", "espn", "teamId") for t in SAY),
   "each of them declares its notes page, its own link's label and the roster that referees the names: %s" % SAY)
ok(not with_kind["oddsHistory"] and not [t for t in ALL if declares(t, "sources", "kalshi")],
   "no team keeps a Kalshi price history or declares Kalshi markets (removed 2026-11-19)")
ok(with_kind["availability"] == [t for t in ALL if declares(t, "sources", "official", "availabilityReportIndex")] and "byu" in with_kind["availability"],
   "availability for exactly the teams with an official report - the conferences' (BYU's included), and Notre Dame's: %s" % with_kind["availability"])
nd, osu = teamconfig.load("notre-dame"), teamconfig.load("ohio-state")
ok(teamconfig.snapshot(nd, "beatNews")["file"] == "data/notre-dame/news.json", "a producer's file is the team's declaration")
ok(teamconfig.snapshot(osu, "depth") is None, "a team without a source has no file to write")
pat = teamconfig.regex([e for e in nd["series"] if e["name"] == "Jeweled Shillelagh"][0]["match"])
ok(pat is not None and pat.search("USC") and pat.search("TROJANS") and not pat.search("Ohio State"),
   "a config pattern survives the trip from JavaScript, case-insensitivity and all")

print("no producer or workflow names a team's data file")
LITERAL = re.compile(r"""["'](?:[\w/-]*/)?(depth|depth-history|availability|availability-history|news)\.json["']""")
for f in sorted(os.listdir(os.path.join(HERE, "producers"))) + ["../../.github/workflows/odds.yml"]:
    p = os.path.normpath(os.path.join(HERE, "producers", f))
    if not (p.endswith(".py") or p.endswith(".yml")):
        continue
    hits = [m.group(0) for m in LITERAL.finditer(open(p, encoding="utf-8").read())]
    ok(not hits, "%s: %s" % (os.path.relpath(p, ROOT), ", ".join(hits) if hits else "reads the team's declaration"))

print("\n" + ("%d check(s) FAILED" % failures if failures else "the data pipeline is per team"))
sys.exit(1 if failures else 0)
