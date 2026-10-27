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

print("the other layout: Ohio State's notes, Game 7 at Indiana (published 2026-10-13)")
# A real excerpt (pages 1, 2, 5, 15, 19, 20, 30-32 of the PDF, read by pypdf
# as official_depth.py reads Notre Dame's): David, 2026-10-26.
g7 = gamenotes.parse(fixture("osu-notes-2026-g7.txt"))
ok(g7["game"] == "Indiana", "the notes are for Indiana, from every page's running header: %r" % g7["game"])
ok(len(g7["roster"]) >= 110 and any(p["name"] == "Jaylen McClain" and p["pos"] == "SAF" for p in g7["roster"]),
   "its roster table, safeties ('SAF') and all: %d players" % len(g7["roster"]))
ok(any(p["name"] == "Brenten Jones" for p in g7["roster"]) and any(p["name"] == "Bo Jackson" for p in g7["roster"]),
   "a nickname in quotes and a letterman's asterisk are not part of the name")
ok(g7["pronounce"].get("Austin Siereveld") == "SIR-uh-veld" and g7["pronounce"].get("Jerquaden Guilford") == "jer-KWAY-den",
   "the pronunciation guide, 'Name  phonetic': %d names" % len(g7["pronounce"]))
ok(g7["pronounce"].get("Leroy Roker III") == "ROH-kur", "a guide name without the roster's suffix still matches")
ok(sorted(g7["captains"]) == sorted(["Brandon Inniss", "Kenyatta Jackson Jr.", "Jaylen McClain", "Payton Pierce",
                                      "Julian Sayin", "Austin Siereveld", "Jeremiah Smith"]),
   "the seven captains, from their '(CAPTAIN)' player pages, named as the roster names them: %r" % g7["captains"])
ok(g7["honors"].get("Austin Siereveld", [])[:3] == ["Outland Watch List", "Lombardi Watch List", "First-team All-American (Walter Camp)"],
   "preseason honors, wrapped lines joined and the commas inside parentheses kept: %r" % g7["honors"].get("Austin Siereveld"))
ok(g7["glance"] == ["This marks just the eighth time that Ohio State has played Indiana in the Day era, winning by a combined 274-97 in the previous seven games.",
                    "The Buckeyes are 30-1-1 in the last 32 matchups against Indiana and hold an all-time record of 80-13-5 against the Hoosiers."],
   "the series card takes the 'First and Ten' bullets about the series only, never the program's trivia: %r" % g7["glance"])
ok([x["n"] for x in g7["numbers"]] == ["99-100", "29", ".870"], "By the Numbers, figures like 99-100 and .870: %r" % [x["n"] for x in g7["numbers"]])
ok(len(g7["numbers"]) > 2 and g7["numbers"][2]["text"].startswith("Coach Ryan Day’s win percentage of .870 (87-13) is No. 1"),
   "a typesetter's hyphen is joined and a figure keeps its space: %r" % (g7["numbers"][2]["text"][:60] if len(g7["numbers"]) > 2 else None))
ok(not any(re.search(r"TELEVISION|Play by Play", x["text"]) for x in g7["numbers"]), "the broadcast box after it is not a number")
ok(not g7["unread"] and gamenotes.usable(g7), "nothing left unread, and usable")

# Week 1 (Ball State, published 2026-09-04, page 1): the heading set after a
# space on the column's last line, and a first meeting with no series yet.
g1 = gamenotes.parse(fixture("osu-notes-2026-g1.txt"))
ok([x["n"] for x in g1["numbers"]] == ["93-94", "61", ".872"], "Ball State week: By the Numbers after \"...per game. BY THE NUMBERS\": %r" % [x["n"] for x in g1["numbers"]])
ok(g1["glance"] == [], "a first meeting: no series facts, and none of the program's trivia in their place: %r" % g1["glance"])

print("where the week's notes are (tools/producers/official_notes.py)")
import official_notes   # noqa: E402
# The Media Center's links, as the 2026-10-26 probe listed them (hrefs and labels as published)
INDEX = ('<a href="/documents/2026/9/4/1_Ball_State.pdf">Ohio State Notes</a>'
         '<a href="/documents/2026/8/31/260905_Gm1_at_Ohio_State.pdf">Ball State Notes</a>'
         '<a href="/documents/2026/9/5/2026_Postgame_Notes_vs_Ball_State.pdf">Postgame Notes</a>'
         '<a href="/documents/2026/9/21/4_Illinois.pdf">Ohio State Notes</a>'
         '<a href="/documents/2026/10/13/7_Indiana.pdf"><span>Ohio State Notes</span></a>'
         '<a href="/documents/2026/10/27/8_USC.pdf">Ohio State Notes</a>')
links = official_notes.notes_links(INDEX, "https://ohiostatebuckeyes.com/sports/2026/5/27/x", "Ohio State Notes")
ok([d for d, _ in links] == ["2026-10-27", "2026-10-13", "2026-09-21", "2026-09-04"],
   "only the team's own notes, newest first, dated from the address: %r" % [d for d, _ in links])
ok(links[1][1] == "https://ohiostatebuckeyes.com/documents/2026/10/13/7_Indiana.pdf", "made absolute against the index")
ok(official_notes.latest(links, "2026-10-26")[0] == "2026-10-13", "the week's notes: the newest not dated after today")
ok(official_notes.latest(links, "2026-08-01") is None, "nothing posted yet: nothing")

print("an excerpt without the sections")
for name in ("fi-notes-2026-g4.txt", "fi-notes-2026-dashes.txt"):
    d = gamenotes.parse(fixture(name))
    ok(not gamenotes.usable(d) and not d["pronounce"] and not d["numbers"], "%s: nothing read, not usable" % name)
ok(not re.search(r"notre|irish|stanford|ohio|buckeye|indiana|hoosier", open(os.path.join(HERE, "producers", "gamenotes.py")).read().split('"""', 2)[2], re.I),
   "no program named in the parsing code")

print("\n" + ("%d check(s) FAILED" % failures if failures else "the notes' facts are read as written"))
sys.exit(1 if failures else 0)
