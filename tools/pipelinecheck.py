#!/usr/bin/env python3
"""Is the data pipeline per team (backlog C2)?

Each team's files are its own declaration, in data/<team id>/; the workflow
loops over the teams that declare a kind of snapshot; the odds history picks
a team's price out of the league-wide markets by that team's own Kalshi
declaration, stamps the file with the team, and writes only when something
moved. No producer or workflow names a team's data file itself.

Real committed data only; no network.

Usage:  python3 tools/pipelinecheck.py     (exit 1 on any failure)
"""
import json
import os
import re
import shutil
import sys
import tempfile
from datetime import datetime, timedelta, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(HERE, "producers"))
import teamconfig  # noqa: E402
import odds_history as oh  # noqa: E402

failures = 0


def ok(cond, what):
    global failures
    print(("  ok   " if cond else "  FAIL ") + what)
    if not cond:
        failures += 1


print("teamconfig: which teams, which files")
ok(teamconfig.teams() == ["notre-dame", "ohio-state"], "every configured team, and not the registry: %s" % teamconfig.teams())
with_kind = {k: [t for t in teamconfig.teams() if teamconfig.snapshot(teamconfig.load(t), k)]
             for k in ("depth", "availability", "oddsHistory", "beatNews")}
ok(all(v == ["notre-dame"] for v in with_kind.values()),
   "the workflow's loops run for the teams that declare each kind - Notre Dame today: %s" % with_kind)
nd, osu = teamconfig.load("notre-dame"), teamconfig.load("ohio-state")
ok(teamconfig.snapshot(nd, "beatNews")["file"] == "data/notre-dame/news.json", "a producer's file is the team's declaration")
ok(teamconfig.snapshot(osu, "depth") is None, "a team without a source has no file to write")
pat = teamconfig.regex(nd["sources"]["kalshi"]["namePattern"])
ok(pat is not None and pat.search("Notre Dame") and pat.search("FIGHTING IRISH") and not pat.search("Ohio State"),
   "a config pattern survives the trip from JavaScript, case-insensitivity and all")

print("odds history: each team's own price, from the same league files")
markets = {k: json.load(open(os.path.join(ROOT, f)))["markets"] for k, f in oh.LEAGUE.items()}
ndp = {k: oh.team_price(m, nd["sources"]["kalshi"]) for k, m in markets.items()}
osup = {k: oh.team_price(m, osu["sources"]["kalshi"]) for k, m in markets.items()}
ok(all(v is not None for v in list(ndp.values()) + list(osup.values())), "both teams have a price in both markets: %s / %s" % (ndp, osup))
ok(ndp != osup, "and they are different prices - each team reads its own market")
ok(oh.team_price([{"ticker": "KXNCAAF-27-OSU", "yes_bid_dollars": "0.10", "yes_ask_dollars": "0.12"},
                  {"ticker": "KXNCAAF-27-ND", "yes_bid_dollars": "0.20", "yes_ask_dollars": "0.22"}],
                 nd["sources"]["kalshi"]) == 21.0, "by ticker suffix, not by order")
ok(oh.team_price([{"ticker": "X-1", "yes_sub_title": "Notre Dame", "last_price_dollars": "0.3"}],
                 nd["sources"]["kalshi"]) == 30.0, "by name when the ticker does not say")

now = datetime(2026, 9, 25, 12, 0, tzinfo=timezone.utc)
last = {"t": "2026-09-25T11:30Z", "title": 11.5, "playoff": 83.5}
ok(oh.append({"points": [last]}, {"t": "2026-09-25T12:00Z", "title": 11.6, "playoff": 83.4}, now) is None,
   "a move under half a point within six hours adds nothing")
ok(len(oh.append({"points": [last]}, {"t": "2026-09-25T12:00Z", "title": 12.0, "playoff": 83.5}, now)) == 2,
   "half a point is a new point")
ok(len(oh.append({"points": [last]}, dict(last, t="x"), now + timedelta(hours=7)) or []) == 2, "so is six hours")

print("odds history: written to the team's folder, stamped, only when it moved")
tmp = tempfile.mkdtemp()
try:
    shutil.copytree(os.path.join(ROOT, "teams"), os.path.join(tmp, "teams"))
    shutil.copytree(os.path.join(ROOT, "data", "league"), os.path.join(tmp, "data", "league"))
    real_root = teamconfig.ROOT
    teamconfig.ROOT = tmp
    out = os.path.join(tmp, "data", "notre-dame", "odds-history.json")
    for team in ("notre-dame", "ohio-state"):
        sys.argv = ["odds_history.py", "--team", team]
        oh.main()
    ok(os.path.exists(out), "Notre Dame's history is created in data/notre-dame/")
    ok(not os.path.exists(os.path.join(tmp, "data", "ohio-state")), "Ohio State declares no history, so nothing is written for it")
    first = json.load(open(out))
    ok(first.get("team") == "notre-dame" and len(first["points"]) == 1, "stamped with its team, one point")
    stamp = os.path.getmtime(out)
    sys.argv = ["odds_history.py", "--team", "notre-dame"]
    oh.main()
    ok(os.path.getmtime(out) == stamp and json.load(open(out)) == first, "a second run with the same prices writes nothing")
    unstamped = dict(first)
    del unstamped["team"]
    json.dump(unstamped, open(out, "w"))
    oh.main()
    ok(json.load(open(out)).get("team") == "notre-dame" and len(json.load(open(out))["points"]) == 1,
       "a file from before stamping is stamped on the next run, with no new point")
finally:
    teamconfig.ROOT = real_root
    shutil.rmtree(tmp)

print("no producer or workflow names a team's data file")
LITERAL = re.compile(r"""["'](?:[\w/-]*/)?(depth|depth-history|availability|availability-history|odds-history|news)\.json["']""")
for f in sorted(os.listdir(os.path.join(HERE, "producers"))) + ["../../.github/workflows/odds.yml"]:
    p = os.path.normpath(os.path.join(HERE, "producers", f))
    if not (p.endswith(".py") or p.endswith(".yml")):
        continue
    hits = [m.group(0) for m in LITERAL.finditer(open(p, encoding="utf-8").read())]
    ok(not hits, "%s: %s" % (os.path.relpath(p, ROOT), ", ".join(hits) if hits else "reads the team's declaration"))

print("\n" + ("%d check(s) FAILED" % failures if failures else "the data pipeline is per team"))
sys.exit(1 if failures else 0)
