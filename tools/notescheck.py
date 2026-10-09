#!/usr/bin/env python3
"""The week's facts read out of the official game notes (David, 2026-10-09:
pronunciations, captains and honors, the series card, By the Numbers;
tools/producers/gamenotes.py).

Reads an excerpt of Notre Dame's notes for Game 6 vs Stanford (published
2026-10-08) - the first page, By the Numbers, the roster and pronunciation
guide, the captains, the honors up to the AP poll - and holds the parser to
what a fan would read there. The older excerpts, which carry none of these
sections, read as nothing and are not usable: last week's facts stay.

    python3 tools/notescheck.py     (exit 1 on any failure)
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "producers"))
import gamenotes   # noqa: E402

failures = 0


def ok(cond, what):
    global failures
    print(("  ok   " if cond else "  FAIL ") + what)
    if not cond:
        failures += 1


def fixture(name):
    with open(os.path.join(HERE, "fixtures", name), encoding="utf-8") as f:
        return f.read()


g6 = gamenotes.parse(fixture("fi-notes-2026-g6.txt"))

print("the game")
ok(g6["game"] == "Stanford", "the notes are for Stanford: %r" % g6["game"])
ok(gamenotes.opponent("Game 2 | vs Wisconsin (Shamrock Series) | 2") == "Wisconsin",
   "a branded game's name is not the opponent's")
ok(g6["unread"] == [], "every pronunciation row was matched to the roster: %s" % g6["unread"][:3])
ok(gamenotes.usable(g6), "enough read to replace last week's facts")

print("pronunciations (roster rows matched by number, then name)")
ok(len(g6["roster"]) == 111, "the notes' roster: %d players" % len(g6["roster"]))
ok(g6["pronounce"].get("Jordan Faison") == "FAY-zonn", "Jordan Faison: FAY-zonn")
ok(g6["pronounce"].get("Christopher Burgess Jr.") == "BURG-jess",
   "a Jr. the guide leaves off still matches: Christopher Burgess Jr.")
ok(g6["pronounce"].get("Ko’o Kia") == "KOH-oh KEE-ah", "a curly apostrophe in a name: Ko'o Kia")
ok(set(g6["pronounce"]) <= {p["name"] for p in g6["roster"]}, "only roster names")
ok(50 <= len(g6["pronounce"]) <= 60, "about half the roster has a guide: %d" % len(g6["pronounce"]))

print("captains and honors")
ok(g6["captains"] == ["Drayk Bowen", "CJ Carr", "Jordan Faison", "Adon Shuler"], "the four 2026 captains: %s" % g6["captains"])
carr = g6["honors"].get("CJ Carr", [])
ok("Davey O’Brien Award Preseason Watch List" in carr and len(carr) == 11, "CJ Carr's 11 honors: %s" % carr[:2])
ok("Butkus Award Watch List" in g6["honors"].get("Drayk Bowen", []), "Drayk Bowen: Butkus Award Watch List")
everything = [h for hs in g6["honors"].values() for h in hs]
ok(not any(re.match(r"^\d", h) or "AP TOP" in h.upper() for h in everything), "the AP poll after the honors is not an honor")
ok(not any("; " in h for h in everything), "two honors on one line are two")
ok(set(g6["honors"]) <= {p["name"] for p in g6["roster"]}, "players only: the coach's honors are his, not a player's")

print("the series (Game Day at a Glance)")
ok(len(g6["glance"]) == 6, "six facts")
ok("25-14-0" in g6["glance"][0], "the all-time series kept whole with its meeting count: %r" % g6["glance"][0][:80])
ok(any("Legends Trophy" in x for x in g6["glance"]), "the trophy")
ok(all(len(x) <= gamenotes.GLANCE_WHOLE or x == gamenotes.first_sentence(x) for x in g6["glance"]), "a long bullet is cut to its first sentence")

print("By the Numbers")
nums = g6["numbers"]
ok(len(nums) == 15, "15 numbers")
ok(nums[0] == {"n": "2", "text": "Drayk Bowen and Adon Shuler are the 28th and 29th players to be elected captain twice."},
   "a fact, not the paragraph: %r" % nums[0])
fifteen = [x for x in nums if x["n"] == "15"]
ok(fifteen and fifteen[0]["text"] == "Consecutive wins by double digits, dating back to Sept. 20, 2025.",
   "\"Sept. 20\" does not end the sentence")
ok(any(x["text"].startswith("Non-offensive touchdowns") for x in nums), "a word broken across lines is joined")
ok(all(re.match(r"^\d[\d,]*$", x["n"]) and x["text"][-1] in ".!?" for x in nums), "every item is a number and one sentence")

print("an excerpt without the sections")
for name in ("fi-notes-2026-g4.txt", "fi-notes-2026-dashes.txt"):
    d = gamenotes.parse(fixture(name))
    ok(not gamenotes.usable(d) and not d["pronounce"] and not d["numbers"], "%s: nothing read, not usable" % name)
ok(not re.search(r"notre|irish|stanford", open(os.path.join(HERE, "producers", "gamenotes.py")).read().split('"""', 2)[2], re.I),
   "no program named in the parsing code")

print("\n" + ("%d check(s) FAILED" % failures if failures else "the notes' facts are read as written"))
sys.exit(1 if failures else 0)
