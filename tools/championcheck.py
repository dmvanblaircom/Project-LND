#!/usr/bin/env python3
"""The defending national champion's producer (tools/producers/champion.py),
against ESPN's postseason scoreboards: the whole 2025 postseason
(tools/fixtures/espn-scoreboard-postboard-2025.json) and the keys read on
2026-10-27 (tools/fixtures/espn-postseason-titles.json). No network.

    python3 tools/championcheck.py      (exit 1 on failure)
"""
import copy
import json
import os
import sys
import tempfile
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "producers"))
import champion  # noqa: E402

failures = 0


def ok(cond, what):
    global failures
    print(("  ok   " if cond else "  FAIL ") + what)
    if not cond:
        failures += 1


FX = json.load(open(os.path.join(HERE, "fixtures", "espn-postseason-titles.json")))

print("the title game, from a postseason scoreboard")
g = champion.title_game(FX["2025"])
ok(g is not None and g["team"] == {"id": "84", "name": "Indiana"}, "2025: the winner of the title game (%s)" % (g and g["team"]))
ok(g and g["opponent"] == {"id": "2390", "name": "Miami"} and g["score"] == {"winner": 27, "loser": 21},
   "who they beat, and the score, the winner's first (%s)" % (g and g["score"]))
ok(g and g["label"] == "College Football Playoff National Championship" and g["game"] == "401769076",
   "the game's own name without its sponsor, and its id (%s)" % (g and g["label"]))
whole = json.load(open(os.path.join(HERE, "fixtures", "espn-scoreboard-postboard-2025.json")))
gw = champion.title_game(whole)
ok(gw == g, "the whole 2025 postseason as ESPN sent it (%d games, every round): the same title game" % len(whole.get("events", [])))
ok(champion.title_game(FX["2026"]) is None, "2026: a title game still to be played names no champion")
semi = {"events": [FX["2025"]["events"][0]]}
ok(champion.title_game(semi) is None, "a semifinal is not the title game, whatever its teams")
ok(champion.title_game({"events": []}) is None and champion.title_game(None) is None, "nothing at all is nothing")
nowin = copy.deepcopy(FX["2025"])
for c in nowin["events"][1]["competitions"][0]["competitors"]:
    c.pop("winner")
g2 = champion.title_game(nowin)
ok(g2 and g2["team"]["id"] == "84", "without a winner flag, the higher score wins")
tie = copy.deepcopy(nowin)
for c in tie["events"][1]["competitions"][0]["competitors"]:
    c["score"] = "21"
ok(champion.title_game(tie) is None, "and a tie names no one")

print("which season is defending")
ok(champion.season_of(datetime(2026, 10, 27, tzinfo=timezone.utc)) == 2026, "October 2026 is the 2026 season")
ok(champion.season_of(datetime(2027, 1, 20, tzinfo=timezone.utc)) == 2026, "January 2027 still is: its title game ends it")
ok(champion.season_of(datetime(2027, 8, 30, tzinfo=timezone.utc)) == 2027, "and from July, the next")


def run(boards, keep=None):
    """main() with ESPN answering from `boards` by season; -> the file written."""
    d = tempfile.mkdtemp()
    out = os.path.join(d, "champion.json")
    if keep is not None:
        json.dump(keep, open(out, "w"))
    asked = []
    real_fetch, real_root, argv = champion.fetch, champion.ROOT, sys.argv
    champion.fetch = lambda url: (asked.append(url), boards[int(url.split("dates=")[1].split("&")[0])])[1]
    champion.ROOT, sys.argv = d, ["champion.py", "--out", "champion.json"]
    try:
        champion.main(now=datetime(2026, 10, 27, 12, tzinfo=timezone.utc))   # a fixed day: no check that expires
    finally:
        champion.fetch, champion.ROOT, sys.argv = real_fetch, real_root, argv
    try:
        return json.load(open(out)), asked
    except (OSError, ValueError):
        return None, asked


print("the file")
written, asked = run({2026: FX["2026"], 2025: FX["2025"]})
ok(written and written["season"] == 2025 and written["team"]["id"] == "84" and written["capability"] == "champion",
   "while this season's title game is to come, last season's champion is written")
ok(len(asked) == 2, "this season was asked first, then last (%d asks)" % len(asked))
done = copy.deepcopy(FX["2025"])
nxt, _ = run({2026: done, 2025: FX["2025"]})
ok(nxt and nxt["season"] == 2026, "once this season's is final, its winner is - the banner moves with no other change")
kept = {"schema": 1, "capability": "champion", "season": 2025, "team": {"id": "84", "name": "Indiana"}}
left, _ = run({2026: {"events": []}, 2025: {"events": []}}, keep=kept)
ok(left == kept, "no final title game found: the file is left as it was")

print("\nchampion: " + ("%d check(s) FAILED" % failures if failures else "the title game's winner, whoever it is"))
sys.exit(1 if failures else 0)
