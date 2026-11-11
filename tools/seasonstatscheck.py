#!/usr/bin/env python3
"""The season-figures producer (tools/producers/season_stats.py), against
real ESPN payloads - no network here.

Turnovers are added up from box scores, yards allowed read from the site
API's opponent section, the two FBS ranks computed with ties shared; a team
with a final game whose box score is missing is left out, and a snapshot
with too few teams is refused so the last good one stays.

    python3 tools/seasonstatscheck.py      (exit 1 on any failure)
"""
import json
import os
import sys
import tempfile
from datetime import datetime, timedelta, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "producers"))
import season_stats as ss  # noqa: E402

failures = 0


def ok(cond, what):
    global failures
    print("  %s %s" % ("ok  " if cond else "FAIL", what))
    if not cond:
        failures += 1


def fx(name):
    return json.load(open(os.path.join(HERE, "fixtures", name), encoding="utf-8"))


print("the registry")
teams = ss.registry()
ok(len(teams) == 138 and ("87", "Notre Dame") in teams and ("194", "Ohio State") in teams,
   "every program, by ESPN id (%d)" % len(teams))

print("a box score")
msu = fx("espn-summary-msu-final.json")
us, them = ss.side_stats(msu, "87")
ok(us["turnovers"] == 0 and them["turnovers"] == 2, "Notre Dame gave away none and took two (Michigan State's two interceptions)")
ok(ss.side_stats(msu, "127")[0]["turnovers"] == 2, "the same game from the other side")
ok(ss.side_stats({"boxscore": {"teams": msu["boxscore"]["teams"][:1]}}, "87") is None, "one side only: not a box score")
ok(ss.side_stats(msu, "9999") is None, "a team not in the game: nothing")

print("a season")
sums = {"g1": msu, "g2": msu}
f = ss.team_figures("87", ["g1", "g2"], sums)
ok(f == {"games": 2, "takeaways": 4, "giveaways": 0}, "two games added up: %s" % f)
ok(ss.team_figures("87", ["g1", "g3"], sums) is None, "a final game whose box score never came: the team is left out, not shown short")
broken = json.loads(json.dumps(msu))
for t in broken["boxscore"]["teams"]:
    t["statistics"] = [s for s in t["statistics"] if s["name"] != "turnovers"]
ok(ss.team_figures("87", ["g1"], {"g1": broken}) is None, "a box score without turnovers: the same")
ok(ss.team_figures("87", [], {}) == {"games": 0}, "no game played yet: no figures")

print("which games are final")
sched = fx("espn-schedule-nd-2026-reg.json")
ids = ss.completed_ids([sched, None])
done = [e for e in sched["events"] if ((e["competitions"][0].get("status") or {}).get("type") or {}).get("completed")]
ok(len(ids) == len(done) and len(ids) == len(set(ids)) and ids, "every final game, once (%d)" % len(ids))
ok(ss.completed_ids([sched, sched]) == ids, "a game in both schedules counts once")

print("yards allowed and passing offense")
ok(ss.allowed(fx("espn-sitestats-nd.json")) == (53.8, 145.5), "the opponent section, per game (Notre Dame 2026: 53.8 rushing, 145.5 passing)")
ok(ss.allowed(None) == (None, None), "no answer: nothing")
ok(ss.core_pass_per_game(fx("espn-teamstats-nd-2026-reg.json")) == 275.0, "net passing yards per game, the figure the app shows")
ok(ss.core_pass_per_game({}) is None, "no answer: nothing")

print("FBS ranks")
r = ss.rank({"a": 10, "b": 8, "c": 8, "d": 2})
ok(r == {"a": {"rank": 1, "tied": False}, "b": {"rank": 2, "tied": True}, "c": {"rank": 2, "tied": True}, "d": {"rank": 4, "tied": False}},
   "more is better; a shared value shares the best place and the next one skips: %s" % r)

print("the snapshot")
many = {str(i): {"games": 9, "takeaways": i % 13, "giveaways": 6} for i in range(1, ss.MIN_TEAMS + 5)}
many["87"] = {"games": 9, "takeaways": 16, "giveaways": 2}
many["5"] = None
passing = {k: 200.0 + int(k) % 50 for k in many}
passing["87"] = 275.0
yards = {"87": (53.8, 145.5)}
snap = ss.build(2026, many, passing, yards)
nd = snap["teams"]["87"]
ok(snap["source"] == "espn-box-scores" and snap["season"] == 2026, "names its source and season")
ok(nd["takeaways"] == 16 and nd["giveaways"] == 2 and nd["rushAllowed"] == 53.8 and nd["passAllowed"] == 145.5, "a team's row: %s" % {k: nd[k] for k in nd if k != "ranks"})
ok(nd["ranks"]["turnoverMargin"] == {"rank": 1, "tied": False} and nd["ranks"]["passOffense"]["rank"] == 1, "+14 and 275 yards lead the FBS")
ok("5" not in snap["teams"], "a team left out is not in the file (its rows show a dash)")
ok("rushAllowed" not in snap["teams"]["1"], "no yards-allowed answer: the field is absent, never 0")
try:
    ss.build(2026, dict(list(many.items())[:ss.MIN_TEAMS - 1]), passing)
    ok(False, "too few teams is refused")
except ss.Refused as e:
    ok("fewer than" in str(e), "too few teams is refused: %s" % e)

print("written only when it moved")
with tempfile.TemporaryDirectory() as d:
    out = os.path.join(d, "season-stats.json")
    ok(ss.write(out, snap) is True and json.load(open(out))["builtAt"], "first write, with when it was built")
    ok(ss.write(out, snap) is False, "the same figures again: nothing written")

print("once a day")
now = datetime(2026, 11, 11, 12, tzinfo=timezone.utc)
with tempfile.TemporaryDirectory() as d:
    last = os.path.join(d, "last")
    ok(ss.due(last, now), "never built: due")
    open(last, "w").write((now - timedelta(hours=3)).strftime("%Y-%m-%dT%H:%M:%SZ"))
    ok(not ss.due(last, now), "built three hours ago: not due")
    open(last, "w").write((now - timedelta(hours=21)).strftime("%Y-%m-%dT%H:%M:%SZ"))
    ok(ss.due(last, now), "a day on: due")

print("\n%s" % ("all passed" if not failures else "%d failed" % failures))
sys.exit(1 if failures else 0)
