#!/usr/bin/env python3
"""A conference's availability report is read as the conference wrote it
(tools/producers/conference_availability.py).

The fixture is the Big Ten's public report viewer as it answered on
2026-10-10 (tools/fixtures/b1g-availability-2026-10-09.json): Friday's
Update 2 for Maryland at Ohio State, Iowa's gameday report for its Friday
game, and the season's archive for four teams. The real producer runs on a
copy of the repository with the network stood in for.

    python3 tools/conferenceavailcheck.py     (exit 1 on any failure)
"""
import contextlib
import copy
import io
import json
import os
import shutil
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, ".."))
sys.path.insert(0, os.path.join(HERE, "producers"))
import conference_availability as ca   # noqa: E402
import official_depth as od            # noqa: E402
import teamconfig                      # noqa: E402

FIXTURE = json.load(open(os.path.join(HERE, "fixtures", "b1g-availability-2026-10-09.json"), encoding="utf-8"))
OSU = {"ohio st.", "ohio state"}
failures = 0


def ok(cond, what):
    global failures
    print(("  ok   " if cond else "  FAIL ") + what)
    if not cond:
        failures += 1


def names(report, status=None):
    return [p["name"] for p in report["players"] if status is None or p["status"] == status]


print("the conference's words")
ok([ca.status_key(s) for s in ("Out", "Out - (1st Half)", "Doubtful", "Questionable", "Probable", "Game Time Decision")]
   == ["out-game", "out-half", "doubtful", "questionable", "probable", "gtd"], "every status the Big Ten reports, as the snapshot's keys")
ok([ca.status_key(s) for s in ("Available", "Exempt", "-", "")] == [None] * 4,
   "available, exempt and not-yet-filed are not listed: not listed means available")
try:
    ca.status_key("Suspended")
    ok(False, "a status no rule reads is an error, never dropped quietly")
except ValueError:
    ok(True, "a status no rule reads is an error, never dropped quietly")
ok(ca.player("WR #0 Brandon Inniss") == {"pos": "WR", "no": "0", "name": "Brandon Inniss"}, "position, number and name")
ok(ca.player("RB #21 Anthony “Turbo” Rogers")["name"] == "Anthony “Turbo” Rogers", "a nickname in quotes stays in the name")
ok(ca.player("DB #7 Rashad Godfrey, Jr.")["name"] == "Rashad Godfrey, Jr.", "a suffix after a comma stays too")

print("this week: Friday's update for Maryland at Ohio State")
latest, history = ca.build(FIXTURE["publish"], FIXTURE["archive"], OSU)
ok(latest["game"] == "vs. Maryland" and latest["heading"] == "Update 2", "the newest report for Ohio State's game: %s, %s" % (latest["game"], latest["heading"]))
ok(latest["effectiveAt"] == "2026-10-09" and latest["kickoffDate"] == "2026-10-10", "dated when it was published, for Saturday's game")
ok(sorted(names(latest, "out-game")) == ["Amari Valerio-Hudson", "Jaxon Powell", "Leroy Roker III", "Vasean Washington"], "four out")
ok(sorted(names(latest, "doubtful")) == ["Anthony “Turbo” Rogers", "Brandon Inniss", "Christian Alliegro", "Khary Wilder", "Phillip Daniels"],
   "five doubtful")
ok(sorted(names(latest, "probable")) == ["Braxton Rembert", "Devin McCuin", "Jay Timmons"], "three probable")
ok(len(latest["players"]) == 12 and not any(p["name"].startswith("Jeremiah") for p in latest["players"]),
   "and nobody marked Available: 12 listed of the 119 on the travel list")
ok(not any("Maryland" in json.dumps(p) for p in latest["players"]) and "Zahir Mathis" not in names(latest),
   "only Ohio State's side - Maryland's own report is not ours")
ok(all(p["pos"] and p["no"] for p in latest["players"]), "each with position and number, from the report itself")

print("the season, from the archive")
ok([r["game"] for r in history] == ["vs. Illinois", "at Iowa", "vs. Maryland"], "every conference game so far, in order")
ok([r["heading"] for r in history] == ["Game Day", "Game Day", "Update 2"], "a past game's newest report is its gameday report")
ill = history[0]
ok("Zion Grady" in names(ill, "out-game") and "Kyle Parker" not in names(ill),
   "Illinois: Grady questionable all week, out on game day; Parker questionable, then available - not listed")
ok(history[1]["players"] and "Jay Timmons" in names(history[1], "gtd"), "Iowa: Timmons a game-time decision")
ok(all(r["reported"] for r in history), "an archived week is a report, never 'no report'")

print("other teams, and no report at all")
iowa, _ = ca.build(FIXTURE["publish"], FIXTURE["archive"], {"iowa"})
ok(iowa["heading"] == "Game Day" and iowa["kickoffDate"] == "2026-10-09", "Iowa's Friday game: its gameday report")
none, hist = ca.build({}, {"data": []}, OSU)
ok(none is None and hist == [], "nothing published, nothing archived: no report - the producer writes nothing")
only_archive, _ = ca.build({}, FIXTURE["archive"], OSU)
ok(only_archive["game"] == "vs. Maryland" and only_archive["heading"] == "Update 1",
   "this week not published yet (a bye, early in the week): the archive's latest stands")
ok(only_archive["current"] is False and all(r["current"] is False for r in history[:-1]) and latest["current"] is True,
   "only a published report is current: an archived one is that game's, never the next game's (Codex, #118)")


def produce(answers, tmp=None):
    """The real producer on a copy of the repository (or again on `tmp`);
    `answers` stands in for the network (an Exception to raise, or the two
    JSON answers)."""
    if tmp is None:
        tmp = tempfile.mkdtemp()
        shutil.copytree(os.path.join(REPO, "teams"), os.path.join(tmp, "teams"))
    real = (od.ROOT, teamconfig.ROOT, ca.call)
    od.ROOT = teamconfig.ROOT = tmp
    calls = iter(answers)

    def fake(endpoint, body):
        a = next(calls)
        if isinstance(a, Exception):
            raise a
        return a
    ca.call = fake
    code, out = 0, io.StringIO()
    try:
        sys.argv = ["conference_availability.py", "--team", "ohio-state"]
        with contextlib.redirect_stdout(out):
            ca.main()
    except SystemExit as e:
        code = e.code
    finally:
        od.ROOT, teamconfig.ROOT, ca.call = real
    return tmp, code, out.getvalue()


def files(tmp):
    d = os.path.join(tmp, "data", "ohio-state")
    return sorted(os.listdir(d)) if os.path.isdir(d) else []


print("the producer, end to end")
tmp, code, out = produce([FIXTURE["publish"], FIXTURE["archive"]])
ok(code == 0 and files(tmp) == ["availability-history.json", "availability.json"], "writes the team's declared files: %s" % files(tmp))
av = json.load(open(os.path.join(tmp, "data", "ohio-state", "availability.json")))
ok(av["team"] == "ohio-state" and av["capability"] == "availability" and av["tier"] == "official", "stamped as Ohio State's official report")
ok(av["sourceLabel"] == "BigTen.org" and av["sourceUrl"].startswith("https://bigten.org/"), "credited to BigTen.org, linked to its report page")
first = open(os.path.join(tmp, "data", "ohio-state", "availability-history.json")).read()
_, code, again = produce([FIXTURE["publish"], FIXTURE["archive"]], tmp)
ok(open(os.path.join(tmp, "data", "ohio-state", "availability-history.json")).read() == first and "nothing - no change" in again,
   "a second run on the same reports writes nothing, so commits nothing")
shutil.rmtree(tmp)

tmp, code, out = produce([OSError("connection reset")])
ok(code not in (0, None) and files(tmp) == [], "a failed fetch writes nothing and fails loudly: %s" % code)
shutil.rmtree(tmp)
tmp, code, out = produce([FIXTURE["publish"], {"loaded": False, "data": []}])
ok(code not in (0, None) and files(tmp) == [], "an archive that says it did not load is not 'no injuries'")
shutil.rmtree(tmp)

import copy
print("a week that lists nobody survives the archive (Codex, #118)")
clean = copy.deepcopy(FIXTURE["publish"])
r = clean["3130"]
r["footer"]["date"], r["publishDate"] = "2026-10-17", "2026-10-16"
for g in r["games"]:
    for row in g["rows"]:
        row["status"] = "Available"
nobody, seen = ca.build(clean, FIXTURE["archive"], OSU)
ok(nobody["kickoffDate"] == "2026-10-17" and nobody["players"] == [] and nobody["current"] is True,
   "published, listing nobody: a report that everyone is available")
later, hist2 = ca.build({}, FIXTURE["archive"], OSU, seen)
ok(later["kickoffDate"] == "2026-10-17" and later["players"] == [],
   "once it is no longer published, it stays the latest - the archive, which has no row for it, does not erase it")
ok([x["kickoffDate"] for x in hist2] == ["2026-09-26", "2026-10-03", "2026-10-10", "2026-10-17"], "and the season keeps every game")
ok(hist2[2]["heading"] == "Update 1" and hist2[2]["current"] is False,
   "a game the archive covers, with nothing newer on file, is the archive's reading")

print("the archive lags the published report (Codex, #118)")
gap, gaphist = ca.build({}, FIXTURE["archive"], OSU, history)
ok(gap["heading"] == "Update 2" and gap["current"] is True and gap["players"] == latest["players"],
   "publish empty for a run before kickoff: Friday's Update 2 on file stays - not the archive's older Update 1")
ok(gaphist[0]["heading"] == "Game Day" and gaphist[1]["heading"] == "Game Day", "past games are unchanged")
caught = copy.deepcopy(FIXTURE["archive"])
for row in caught["data"]:
    if row["Team"] == "Ohio St." and row["Week"].startswith("Sat, 10 Oct"):
        row["Update 2"], row["Game Day"] = row["Update 1"], "Out" if row["Update 1"] == "Out" else "Available"
after, _ = ca.build({}, caught, OSU, history)
ok(after["heading"] == "Game Day", "once the archive has the newer gameday report, it replaces the copy on file")

for what, rows in (("missing", None), ("empty", []), ("cut short", "short")):
    partial = copy.deepcopy(FIXTURE["publish"])
    side = [g for g in partial["3130"]["games"] if g["teamName"] == "Ohio St."][0]
    if rows is None:
        del side["rows"]
    else:
        side["rows"] = side["rows"][:5] if rows == "short" else rows
    tmp, code, out = produce([partial, FIXTURE["archive"]])
    ok(code not in (0, None) and files(tmp) == [],
       "a report whose player rows are %s is a partial answer, not 'nobody listed': nothing written (Codex, #118)" % what)
    shutil.rmtree(tmp)

for what in ("removed", "blank"):
    noname = copy.deepcopy(FIXTURE["publish"])
    for g in noname["3130"]["games"]:
        for row in g["rows"]:
            if what == "removed":
                del row["name"]
            else:
                row["name"] = " "
    tmp, code, out = produce([noname, FIXTURE["archive"]])
    ok(code not in (0, None) and files(tmp) == [], "rows whose player name is %s are refused (Codex, #118)" % what)
    shutil.rmtree(tmp)
anon = copy.deepcopy(FIXTURE["archive"])
for row in anon["data"]:
    row.pop("Player", None)
tmp, code, out = produce([{}, anon])
ok(code not in (0, None) and files(tmp) == [], "an archive whose listed players have no names is refused too")
shutil.rmtree(tmp)

for what, field in (("removed", None), ("renamed", "availability"), ("blank", "")):
    nostatus = copy.deepcopy(FIXTURE["publish"])
    for g in nostatus["3130"]["games"]:
        for row in g["rows"]:
            st = row.pop("status")
            if field is not None:
                row[field or "status"] = st if field else ""
    tmp, code, out = produce([nostatus, FIXTURE["archive"]])
    ok(code not in (0, None) and files(tmp) == [],
       "rows whose status is %s are refused, never read as everyone available (Codex, #118)" % what)
    shutil.rmtree(tmp)

for what, date in (("missing", None), ("unreadable", "Oct 10")):
    nodate = copy.deepcopy(FIXTURE["publish"])
    if date is None:
        del nodate["3130"]["footer"]["date"]
    else:
        nodate["3130"]["footer"]["date"] = date
    tmp, code, out = produce([nodate, FIXTURE["archive"]])
    ok(code not in (0, None) and files(tmp) == [],
       "a report whose game date is %s is refused: nothing could retire it after the game (Codex, #118)" % what)
    shutil.rmtree(tmp)

print("\n%s" % ("all passed" if not failures else "%d FAILED" % failures))
sys.exit(1 if failures else 0)
