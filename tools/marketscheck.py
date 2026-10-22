#!/usr/bin/env python3
"""Season-matched markets (tools/producers/markets.py, W16): one season at a
time, this one's while any market is open, next season's once Kalshi lists
it, never last season's; Kalshi unreachable keeps what is kept; and the odds
history marks which event each price came from. The events are the league's
rule as read from Kalshi on 2026-10-21; the payloads here are made up, in
Kalshi's shape. No network."""
import json
import os
import sys
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "producers"))
import markets as M  # noqa: E402
import odds_history as H  # noqa: E402

checks = 0


def ok(cond, label):
    global checks
    if not cond:
        print("FAIL " + label)
        sys.exit(1)
    checks += 1
    print("  ok   " + label)


RULES = {k: v for k, v in M.league_markets().items() if k in M.OUT}
ok([M.event(RULES["title"], 2026), M.event(RULES["playoff"], 2026), M.event(RULES["title"], 2025), M.event(RULES["playoff"], 2027)] ==
   ["KXNCAAF-27", "KXNCAAFPLAYOFF-26", "KXNCAAF-26", "KXNCAAFPLAYOFF-27"],
   "the league's rule names Kalshi's real events: the 2026 title is KXNCAAF-27, the 2026 field KXNCAAFPLAYOFF-26")
ok([M.season_now(datetime(2026, 10, 21, tzinfo=timezone.utc)), M.season_now(datetime(2027, 1, 25, tzinfo=timezone.utc))] == [2026, 2026],
   "the season being played: October is 2026's, and so is January")


def kalshi(open_events, fail=()):
    """Kalshi as a dict of event -> number of open markets; any event not
    listed answers an empty list, and one in `fail` cannot be read."""
    asked = []

    def get(url):
        ev = url.split("event_ticker=")[1].split("&")[0]
        asked.append(ev)
        if ev in fail:
            raise M.Unavailable("HTTP 503")
        n = open_events.get(ev, 0)
        return {"markets": [{"ticker": "%s-T%d" % (ev, i), "status": "active", "yes_sub_title": "Team %d" % i} for i in range(n)], "cursor": ""}
    get.asked = asked
    return get


def pick(open_events, season=2026, fail=()):
    g = kalshi(open_events, fail)
    got = M.choose(RULES, season, g)
    return {k: (ev, s, len(d["markets"])) for k, (ev, s, d) in got.items()}, g.asked


# October: both of this season's markets are open.
got, asked = pick({"KXNCAAF-27": 30, "KXNCAAFPLAYOFF-26": 40})
ok(got == {"title": ("KXNCAAF-27", 2026, 30), "playoff": ("KXNCAAFPLAYOFF-26", 2026, 40)}, "in season: this season's title and playoff markets")
ok(not any(a in ("KXNCAAF-28", "KXNCAAFPLAYOFF-27") for a in asked), "and next season's are not even asked for")

# Dec 29 - Jan 18: the playoff market has closed, the title's is open; even
# if Kalshi already lists next season's field, the seasons never mix.
got, _ = pick({"KXNCAAF-27": 12, "KXNCAAFPLAYOFF-27": 50})
ok(got == {"title": ("KXNCAAF-27", 2026, 12), "playoff": ("KXNCAAFPLAYOFF-26", 2026, 0)},
   "after the playoff market closes: this season's title stands, and the playoff is hidden - not next season's field beside it")

# After the title game: nothing of 2026 is open; 2027's title is listed.
got, _ = pick({"KXNCAAF-28": 60})
ok(got == {"title": ("KXNCAAF-28", 2027, 60), "playoff": ("KXNCAAFPLAYOFF-27", 2027, 0)},
   "once this season is over: next season's title as soon as Kalshi lists it, its field hidden until it is listed")

# Nothing open in either season.
got, asked = pick({})
ok(got == {"title": (None, None, 0), "playoff": (None, None, 0)}, "nothing listed yet: both hidden")
ok(not any(a in ("KXNCAAF-26", "KXNCAAFPLAYOFF-25") for a in asked), "and last season's events are never asked for")

# Kalshi unreachable: nothing is chosen, so nothing is written.
try:
    pick({"KXNCAAF-27": 30}, fail=("KXNCAAFPLAYOFF-26",))
    unavailable = False
except M.Unavailable:
    unavailable = True
ok(unavailable, "a market that cannot be read stops the run: the last files stand, never half-replaced")

snap = M.snapshot("title", "KXNCAAF-27", 2026, {"markets": [{"ticker": "KXNCAAF-27-ND"}], "cursor": ""})
empty = M.snapshot("playoff", "KXNCAAFPLAYOFF-26", 2026, {"markets": []})
ok(snap["event"] == "KXNCAAF-27" and snap["season"] == 2026 and snap["markets"] and "markets" in empty and empty["event"] is None and empty["season"] is None,
   "each file says its event and season; an empty one names neither")

# The odds history marks each price's event, and a new season is a new point.
now = datetime(2027, 1, 20, 12, tzinfo=timezone.utc)
last = {"t": "2027-01-20T11:30Z", "title": 12.0, "playoff": None, "titleEvent": "KXNCAAF-27", "playoffEvent": None}
same = dict(last, t="2027-01-20T12:00Z")
ok(H.append({"points": [last]}, same, now) is None, "the same price from the same event, half an hour on: not kept")
switched = dict(same, titleEvent="KXNCAAF-28")
ok(H.append({"points": [last]}, switched, now) is not None, "the same price from next season's event: kept, as a new season's first point")

print("\n%d checks: one season's markets at a time, never last season's" % checks)
