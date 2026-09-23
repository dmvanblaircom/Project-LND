#!/usr/bin/env python3
"""Does the depth-chart parser read Notre Dame's chart the way Notre Dame wrote it?

Every expectation here was read off the official PDF (Game 4 at Purdue), not
off the parser's own output - a test that agrees with the code it tests
proves nothing. The fixtures are that PDF's extracted text, committed, so
this runs anywhere with no network and no PDF library.

The previous parser keyed positions by label alone, so Notre Dame's two DT
spots became one card with six players and a BATTLE badge pairing two
starters who line up side by side. These checks exist so that cannot come
back.

Usage:  python3 tools/depthcheck.py     (exit 1 on any failure)
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "producers"))
import twodeep  # noqa: E402

failures = 0


def ok(cond, what):
    global failures
    print(("  ok   " if cond else "  FAIL ") + what)
    if not cond:
        failures += 1


def eq(a, b, what):
    ok(a == b, "%s = %s" % (what, json.dumps(b)))


def fixture(name):
    return open(os.path.join(HERE, "fixtures", name), encoding="utf-8").read()


chart = twodeep.parse_two_deep(fixture("fi-depth-2026-g4.txt"))
units = chart["units"]


def unit(name):
    return next(u for u in units if u["unit"] == name)


def slots(unit_name, label):
    return [s for s in unit(unit_name)["slots"] if s["label"] == label]


def names(slot):
    return [[p["name"] for p in lv["players"]] for lv in slot["levels"]]


print("the chart as a whole")
eq([u["unit"] for u in units], ["Defense", "Offense", "Special Teams"], "three units, in the PDF's order")
eq(chart["title"], "DEPTH CHART - GAME 4 AT PURDUE", "the chart's own title")
eq(twodeep.count_players(units), 78, "every listed player is read")

print("a slot has identity: two DTs are two spots, not one")
dt = slots("Defense", "DT")
eq(len(dt), 2, "Notre Dame lists two DT spots")
eq([s["ordinal"] for s in dt], [1, 2], "numbered in chart order")
eq(names(dt[0]), [["Armel Mukam"], ["Francis Brewu"], ["Elijah Hughes"]], "DT 1, three deep")
eq(names(dt[1]), [["Tionne Gray", "Francis Brewu"], ["Sean Sevillano Jr."]], "DT 2: Gray OR Brewu, then Sevillano")
eq(len(slots("Defense", "DE")), 2, "two DE spots")
eq(names(slots("Defense", "DE")[0]), [["Boubacar Traore"], ["Loghan Thomas"], ["Rodney Dunham"]],
   "DE 1 is genuinely three deep - the real chart lists three")
eq(names(slots("Defense", "DE")[1]), [["Bryce Young"], ["Keon Keeley"]], "DE 2")
eq(len(slots("Defense", "CB")), 2, "two CB spots")
eq(len(slots("Offense", "WR")), 3, "three WR spots")

print("OR is a set, at whatever level it appears")
mike = slots("Defense", "MIKE")[0]
eq(names(mike), [["Drayk Bowen"], ["Kyngstonn Viliamu-Asa", "Madden Faraimo"]],
   "MIKE: SECOND TEAM is Viliamu-Asa OR Faraimo")
eq(names(slots("Defense", "NICKEL")[0])[1], ["Dallas Golden", "Jayden Sanders"], "NICKEL second team is an OR too")
ok(all(isinstance(lv["players"], list) for u in units for s in u["slots"] for lv in s["levels"]),
   "every level is a list of players, never a flag on a row")

print("a player listed at two spots appears at both - faithfully, not as a duplicate")
brewu = [(s["label"], s["ordinal"], lv["level"]) for u in units for s in u["slots"]
         for lv in s["levels"] for p in lv["players"] if p["name"] == "Francis Brewu"]
eq(brewu, [("DT", 1, 2), ("DT", 2, 1)], "Brewu: second at DT 1, co-first at DT 2")
sanders = sorted((s["label"], lv["level"]) for u in units for s in u["slots"]
                 for lv in s["levels"] for p in lv["players"] if p["name"] == "Jayden Sanders")
eq(sanders, [("CB", 2), ("NICKEL", 2)], "Sanders: NICKEL and CB, as the chart lists him")

print("battles are scoped to one spot")
bt = twodeep.battles(units)
first_team = [(b["label"], b["ordinal"], b["names"]) for b in bt if b["level"] == 1 and b["unit"] == "Defense"]
eq(first_team, [("DT", 2, ["Tionne Gray", "Francis Brewu"])], "the only open starting job on defense is DT 2")
ok(not any(b["label"] == "DE" for b in bt), "no DE battle: Traore and Young start at different spots")
ok(not any("Armel Mukam" in b["names"] for b in bt),
   "Mukam is in no battle - the old parser paired him with Gray, who plays beside him")
ok(any(b["label"] == "MIKE" and b["level"] == 2 for b in bt), "a second-team OR is a (backup) battle")

print("the previous flat format converts without loss")
old = json.loads(fixture("old-depth-2026-g4.json"))
eq(twodeep.from_flat(old["groups"]), units,
   "converting the old Game 4 file gives exactly what parsing the official PDF gives")

print("week-over-week changes are per spot")
import copy  # noqa: E402
prev = copy.deepcopy(units)
mike_prev = next(s for u in prev for s in u["slots"] if s["label"] == "MIKE")
mike_prev["levels"] = [{"level": 1, "players": [mike_prev["levels"][1]["players"][0]]},
                       {"level": 2, "players": [mike_prev["levels"][0]["players"][0],
                                                mike_prev["levels"][1]["players"][1]]}]
ch = twodeep.diff(units, prev)
eq(sorted(c["text"] for c in ch),
   ["Drayk Bowen moves up to first team at MIKE", "Kyngstonn Viliamu-Asa drops to second team at MIKE"],
   "a swap at MIKE reads as one up and one down")
eq(twodeep.diff(units, units), [], "an unchanged chart has no changes")
eq(twodeep.diff(units, None), [], "the first chart of a season has no week before it")
prev2 = copy.deepcopy(units)
dt2 = next(s for u in prev2 for s in u["slots"] if s["label"] == "DT" and s["ordinal"] == 2)
dt2["levels"][0]["players"] = [dt2["levels"][0]["players"][0]]       # Brewu not yet at DT 2
eq([c["text"] for c in twodeep.diff(units, prev2)], ["Francis Brewu now also listed at DT 2, first team"],
   "a player added at a second spot is named with that spot, not merged with his first")

print("availability: the dated report, not the policy prose")
notes = fixture("fi-notes-2026-g4.txt")
av = twodeep.parse_availability(notes, "2026")
eq(av["reported"], True, "a report exists")
eq(av["effectiveAt"], "2026-09-21", "and it carries its own date, from its heading")
eq(av["heading"], "AVAILABILITY UPDATE (SEPT. 21)", "read from the dated heading")
eq([p["name"] for p in av["players"] if p["status"] == "questionable"], ["Luke Talich"], "one questionable")
eq(len([p for p in av["players"] if p["status"] == "out-game"]), 9, "nine out for the game")
talich = next(p for p in av["players"] if p["name"] == "Luke Talich")
eq((talich["pos"], talich["detail"]), ("S", "left wrist"), "position and ailment split on a spaced hyphen")
johnson = next(p for p in av["players"] if p["name"] == "Brauntae Johnson")
eq(johnson["detail"], "Left Foot", "an em dash separates too")
burgess = next(p for p in av["players"] if p["name"].startswith("Christopher Burgess"))
eq(burgess["name"], "Christopher Burgess Jr.", "an en dash separates, and a suffix stays in the name")
ok(not any("Notre Dame Football will" in p["name"] or "student-athlete" in p["name"] for p in av["players"]),
   "the policy prose is never read as a player")
ok(not any(p["name"] in ("Jordan Faison", "Matt Jeffery") for p in av["players"]),
   "the report stops before the depth rows that follow it")
ok(sorted(p["name"] for p in av["players"]) ==
   sorted(p["name"] for p in old["availability"]["out"] + old["availability"]["questionable"]),
   "the same nine out and one questionable the previous parser found")

print("absence is not health")
none = twodeep.parse_availability("AVAILABILITY UPDATES\n• Notre Dame will provide a report.\n", "2026")
eq((none["reported"], none["players"]), (False, []), "policy prose alone is NO report - unknown, not 'nobody hurt'")
empty = twodeep.parse_availability("AVAILABILITY UPDATE (OCT. 3)\nPronunciation guide on pg. 7.\n", "2026")
eq((empty["reported"], empty["players"], empty["effectiveAt"]), (True, [], "2026-10-03"),
   "a dated report listing nobody IS a report: everyone available")
eq(twodeep.report_date("JAN. 1", "2026"), "2027-01-01", "a January report belongs to the next calendar year")
eq(twodeep.report_date("nonsense", "2026"), None, "an unreadable date is None, never a guess")

print("the parser names no team")
src = open(os.path.join(HERE, "producers", "twodeep.py"), encoding="utf-8").read()
code = "\n".join(l for l in src.splitlines() if not l.strip().startswith("#"))
body = code.split('"""', 2)[-1]     # past the module docstring, which explains the Notre Dame case
ok("NOTRE" not in body.upper().replace("NOTRE DAME DEFENSE", ""), "no program named in the parsing code")

print("\n" + ("%d check(s) FAILED" % failures if failures else "the parser reads the chart the way it was written"))
sys.exit(1 if failures else 0)
