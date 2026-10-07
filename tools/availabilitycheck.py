#!/usr/bin/env python3
"""A failed game-notes fetch never costs a fan the right availability report
(tools/producers/official_depth.py; code review, 2026-10-01).

Runs the real producer against a copy of the committed Notre Dame data, with
the official site stood in for: the index lists the weeks already recorded,
every document resolves to the PDF recorded for it, and chosen game-notes
fetches fail. Before the fix, the current week failing replaced
availability.json with LAST week's report and dropped the week from the
history, and the run passed.

    python3 tools/availabilitycheck.py     (exit 1 on any failure)
"""
import contextlib
import io
import json
import os
import shutil
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, ".."))
sys.path.insert(0, os.path.join(HERE, "producers"))
import official_depth as od   # noqa: E402
import teamconfig            # noqa: E402
import twodeep               # noqa: E402

failures = 0


def ok(cond, what):
    global failures
    print(("  ok   " if cond else "  FAIL ") + what)
    if not cond:
        failures += 1


def run(fail_notes_for):
    """The producer on a fresh copy of the data; `fail_notes_for` is the set of
    games whose game-notes link cannot be resolved this run."""
    root = tempfile.mkdtemp()
    shutil.copytree(os.path.join(REPO, "teams"), os.path.join(root, "teams"))
    shutil.copytree(os.path.join(REPO, "data", "notre-dame"), os.path.join(root, "data", "notre-dame"))
    dh = json.load(open(os.path.join(root, "data/notre-dame/depth-history.json")))
    ah = json.load(open(os.path.join(root, "data/notre-dame/availability-history.json")))
    notes = {r["game"]: r for r in ah["reports"]}
    rows = [{"game": s["game"], "depth": s["sourceUrl"], "notes": notes[s["game"]]["sourceUrl"]} for s in dh["snapshots"]]
    by_notes = {r["sourceUrl"]: r for r in ah["reports"]}
    by_depth = {s["sourceUrl"]: s for s in dh["snapshots"]}

    def pdf_url(doc):
        r = by_notes.get(doc)
        if r is not None:
            if r["game"] in fail_notes_for:
                raise OSError("timed out")
            return r["pdf"]
        return doc                                     # a depth chart: its own address

    saved = (od.ROOT, teamconfig.ROOT, od.chart_links, od.pdf_url, od.pdf_text, twodeep.parse_two_deep)
    od.ROOT = teamconfig.ROOT = root
    od.chart_links = lambda index, season: rows
    od.pdf_url = pdf_url
    od.pdf_text = lambda url: url                      # the parser below is handed the address
    twodeep.parse_two_deep = lambda text: {"title": by_depth[text]["title"], "units": by_depth[text]["units"]}
    try:
        sys.argv = ["official_depth.py", "--team", "notre-dame", "--season", "2026"]
        with contextlib.redirect_stdout(io.StringIO()) as out:
            od.main()
    finally:
        od.ROOT, teamconfig.ROOT, od.chart_links, od.pdf_url, od.pdf_text, twodeep.parse_two_deep = saved
    av = json.load(open(os.path.join(root, "data/notre-dame/availability.json")))
    hist = json.load(open(os.path.join(root, "data/notre-dame/availability-history.json")))
    shutil.rmtree(root)
    return av, [r["game"] for r in hist["reports"]], out.getvalue()


recorded = json.load(open(os.path.join(REPO, "data/notre-dame/availability.json")))
games = [r["game"] for r in json.load(open(os.path.join(REPO, "data/notre-dame/availability-history.json")))["reports"]]
current = games[-1]

print("every link resolves")
av, hist, _ = run(set())
ok(av["game"] == current, "availability.json is this week's report (%s)" % current)
ok(hist == games, "and the history has every week")

print("this week's game notes fail")
av, hist, log = run({current})
ok(av["game"] == current and av == recorded, "availability.json keeps this week's recorded report, not last week's")
ok(hist == games, "the history keeps this week too")
ok("keeping the recorded report" in log, "and the run says what happened")

print("an older week's game notes fail")
av, hist, _ = run({games[1]})
ok(hist == games, "the history keeps %s" % games[1])

print("this week fails and nothing was recorded for it")
real = od.load
def without_current(path, empty):
    d = real(path, empty)
    if isinstance(d, dict) and "reports" in d:
        d = dict(d, reports=[r for r in d["reports"] if r.get("game") != current])
    return d
od.load = without_current
try:
    av, hist, log = run({current})
finally:
    od.load = real
ok(av == recorded, "availability.json is left as it was - never replaced with last week's report")
ok("left as it was" in log, "and the run says so")

print("a report recorded by an older reading is read again")
def older_reading(path, empty):
    d = real(path, empty)
    if isinstance(d, dict) and "reports" in d:
        d = dict(d, reports=[dict(r, parser=None) if r.get("game") == current else r for r in d["reports"]])
    return d
od.load = older_reading
try:
    _, _, log = run(set())
finally:
    od.load = real
reread = [l for l in log.splitlines() if "reading game notes" in l]
ok(len(reread) == 1, "only that week's notes are read again (%d read)" % len(reread))
_, _, log = run(set())
ok("reading game notes" not in log, "and a report from the current reading is reused, not fetched again")

print("\n" + ("%d check(s) FAILED" % failures if failures else "a failed fetch never costs the right report"))
sys.exit(1 if failures else 0)
