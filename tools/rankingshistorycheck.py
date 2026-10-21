#!/usr/bin/env python3
"""The rankings-history producer (tools/producers/rankings_history.py), on
real ESPN core-API payloads: each kept week is a complete top 25 named as the
route names it, a broken week is refused and never replaces a kept one, a
second run reads only what is new and the latest kept week, and FPI is kept
once per week. No network."""
import copy
import json
import os
import sys
import urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "producers"))
import rankings_history as rh  # noqa: E402

FIX = os.path.join(HERE, "fixtures")
checks = 0


def fixture(name):
    with open(os.path.join(FIX, name)) as f:
        return json.load(f)


def ok(cond, label):
    global checks
    if not cond:
        print("FAIL " + label)
        sys.exit(1)
    checks += 1
    print("  ok   " + label)


AP8, AP2, PRE = fixture("espn-corerank-ap-2026-w8.json"), fixture("espn-corerank-ap-2026-w2.json"), fixture("espn-corerank-ap-2026-pre.json")
COACHES8, FINAL, CFP = fixture("espn-corerank-coaches-2026-w8.json"), fixture("espn-corerank-ap-2025-post.json"), fixture("espn-corerank-cfp-2025-w16.json")
WEEKS, INDEX8, TEAM = fixture("espn-coreweeks-weeks-2026-2.json"), fixture("espn-corerank-polls-2026-w8.json"), fixture("espn-coreteam-miami-2026.json")

# ---- one week -------------------------------------------------------------
w = rh.normalize(AP8, 2, 8)
ok(w["id"] == "w8" and w["label"] == "Week 8" and w["name"] == "AP Top 25" and len(w["ranks"]) == 25,
   "AP week 8: 25 ranked, named w8 / Week 8")
top = w["ranks"][0]
ok(top["rank"] == 1 and top["id"] == "2390" and top["previous"] == 3 and top["record"] == "6-0" and top["firstPlace"] == 40,
   "No. 1 Miami: rank, ESPN id from the team link, previous rank, record, first-place votes")
ok(any(r["previous"] == 0 for r in w["ranks"]) and all(isinstance(r["previous"], int) for r in w["ranks"]),
   "a team new to the poll keeps ESPN's 0 (drawn as New); every other has its previous rank")
p = rh.normalize(PRE, 1, 1)
ok(p["id"] == "pre" and p["label"] == "Preseason" and all(r["previous"] is None for r in p["ranks"]), "the preseason poll: pre / Preseason, no previous ranks")
f = rh.normalize(FINAL, 3, 1)
ok(f["id"] == "final" and f["label"] == "Final" and len(f["ranks"]) >= 25, "the postseason poll: final / Final")
c = rh.normalize(CFP, 2, 16)
ok(c["id"] == "w16" and len(c["ranks"]) == 25 and c["name"], "a CFP release (2025 week 16) keeps 25")
ok(rh.normalize(COACHES8, 2, 8)["ranks"][0]["id"], "Coaches week 8 too")

# ---- refusals ---------------------------------------------------------------
def refused(payload, why):
    try:
        rh.normalize(payload, 2, 8)
    except rh.Refused:
        return True
    return False

short = copy.deepcopy(AP8); short["ranks"] = short["ranks"][:20]
ok(refused(short, "short"), "refused: fewer than 25 ranked")
twice = copy.deepcopy(AP8); twice["ranks"][5]["team"] = twice["ranks"][4]["team"]
ok(refused(twice, "twice"), "refused: a team ranked twice")
swapped = copy.deepcopy(AP8); swapped["ranks"][3]["current"], swapped["ranks"][4]["current"] = 9, 3
ok(refused(swapped, "order"), "refused: ranks out of order")
noid = copy.deepcopy(AP8); noid["ranks"][0]["team"] = {}
ok(refused(noid, "id"), "refused: a ranked team with no id")
ok(refused({"ranks": None}, "none"), "refused: no ranks at all")
ties = copy.deepcopy(AP8); ties["ranks"][11]["current"] = ties["ranks"][10]["current"]
ok(not refused(ties, "tie"), "a tie (two teams sharing a rank) is a real poll, kept")

# ---- a season, read twice ---------------------------------------------------
def fake(released_weeks, calls, broken=()):
    """ESPN's core API, from fixtures: the AP and Coaches polls for each
    released regular-season week (week 8's payloads with the week changed),
    the preseason, no postseason yet."""
    def fetch(url):
        calls.append(url)
        if "/types/2/weeks?" in url:
            return WEEKS
        if "/teams/" in url and "/rankings" not in url:
            t = copy.deepcopy(TEAM); t["id"] = url.rsplit("/", 1)[1]; return t
        for stype, n in [(1, 1)] + [(2, k) for k in released_weeks]:
            base = "/types/%d/weeks/%d/rankings" % (stype, n)
            if url.endswith(base):
                return INDEX8
            for key, pid in (("ap", "1"), ("coaches", "2")):
                if url.endswith(base + "/" + pid):
                    if (key, n) in broken:
                        return short
                    src = copy.deepcopy(PRE if stype == 1 else AP8 if key == "ap" else COACHES8)
                    src["occurrence"] = {"number": n, "displayValue": "Week %d" % n}
                    return src
            if url.endswith(base + "/21"):
                raise urllib.error.HTTPError(url, 404, "no CFP", None, None)
        raise urllib.error.HTTPError(url, 404, "not released", None, None)
    return fetch

calls, logs = [], []
polls, teams = rh.collect(2026, {}, fake(range(1, 9), calls), logs.append)
ok([w["id"] for w in polls["ap"]] == ["pre"] + ["w%d" % n for n in range(1, 9)], "a first run fills the season so far: preseason, weeks 1-8, in order")
ok(len(polls["coaches"]) == 9 and polls["cfp"] == [], "Coaches too; no CFP before the committee's first release")
ok(teams["2390"] == {"name": "Miami", "abbr": "MIA"} and all(r["id"] in teams for w in polls["ap"] for r in w["ranks"]),
   "every ranked team named once, from its core-API record")
team_calls = [u for u in calls if "/teams/" in u and "/rankings" not in u]
ok(len(team_calls) == len(set(team_calls)) == len(teams), "each team looked up once (%d)" % len(teams))

kept = {"polls": polls, "teams": teams}
calls2 = []
polls2, teams2 = rh.collect(2026, kept, fake(range(1, 10), calls2), logs.append)
fetched = sorted(set(u.split("/types/")[1] for u in calls2 if "/rankings/" in u))
ok(fetched == ["2/weeks/8/rankings/1", "2/weeks/8/rankings/2", "2/weeks/9/rankings/1", "2/weeks/9/rankings/2"],
   "a second run reads only the new week and the latest kept one, which ESPN can still correct (%s)" % fetched)
index_calls = sorted(set(u.split("/types/")[1] for u in calls2 if u.endswith("/rankings")))
ok(index_calls == ["2/weeks/10/rankings", "2/weeks/11/rankings", "2/weeks/12/rankings", "2/weeks/13/rankings", "2/weeks/14/rankings", "2/weeks/15/rankings",
                   "2/weeks/6/rankings", "2/weeks/7/rankings", "2/weeks/8/rankings", "2/weeks/9/rankings", "3/weeks/1/rankings"],
   "and asks only about recent and future weeks and the final poll, not the whole season again (%s)" % index_calls)
ok(len(polls2["ap"]) == 10 and polls2["ap"][-1]["id"] == "w9" and not [u for u in calls2 if "/teams/" in u and "/rankings" not in u],
   "week 9 added, and no team looked up again")

calls3, logs3 = [], []
polls3, _ = rh.collect(2026, {"polls": polls2, "teams": teams2}, fake(range(1, 11), calls3, broken={("ap", 10), ("ap", 9)}), logs3.append)
ok(polls3["ap"][-1]["id"] == "w9" and polls3["ap"][-1] == polls2["ap"][-1] and len(polls3["coaches"]) == 11,
   "a broken week is refused: the kept week 9 stands, week 10 waits for a good copy, Coaches moves on")
ok(any("refused ap w10" in l for l in logs3), "and the refusal says which poll and week")

# ---- FPI, once per week --------------------------------------------------
snap = {"season": 2026, "seasonType": 2, "week": 8, "weekText": "Week 8", "sourceUpdated": "2026-10-20T08:00Z", "teams": []}
f1 = rh.keep_fpi({}, snap, 2026)
f2 = rh.keep_fpi({"weeks": f1}, dict(snap, sourceUpdated="2026-10-21T08:00Z"), 2026)
f3 = rh.keep_fpi({"weeks": f2}, dict(snap, week=9, weekText="Week 9"), 2026)
ok(len(f2) == 1 and f2[0]["snapshot"]["sourceUpdated"] == "2026-10-21T08:00Z", "FPI: a week's latest edition replaces its earlier one")
ok([w["id"] for w in f3] == ["w8", "w9"], "a new FPI week is added beside the kept ones")
ok(rh.keep_fpi({"weeks": f3}, dict(snap, season=2025), 2026) == f3, "last season's FPI never lands in this season's history")

# ---- FPI's earlier weeks, from the core API (probe, 2026-10-21) ----------
OCT20 = fixture("fpi-2026-w8-sample.json")            # fpi.json as kept on Oct 20: "Week 8"
CORE6, CORE7 = fixture("espn-corefpi-2026-w6.json"), fixture("espn-corefpi-2026-w7.json")
NAMES = {t["espnId"]: {"name": t["name"], "abbr": t["abbr"]} for t in OCT20["teams"]}
w8 = rh.core_fpi(CORE7, 2026, 8, NAMES)
def bare(rows):
    return [{k: v for k, v in r.items() if k != "rankChange"} for r in rows]
ok(bare(w8["teams"]) == bare(OCT20["teams"]) and w8["week"] == 8 and w8["weekText"] == "Week 8",
   "core week 7 is the app's Week 8: all 138 rows - rank, rating, record, name - as fpi.json kept them on Oct 20")
# The feed's 7-day change read 0 for every team on Oct 20; the core API keeps
# the week's own (Ohio State up 2): ESPN's figure either way, the core's kept.
ok(all(isinstance(r["rankChange"], int) for r in w8["teams"]) and [r for r in w8["teams"] if r["espnId"] == "194"][0]["rankChange"] == 2,
   "each backfilled row keeps ESPN's 7-day rank change for that week")
w7 = rh.core_fpi(CORE6, 2026, 7, NAMES)
nd = [t for t in w7["teams"] if t["espnId"] == "87"][0]
ok(w7["sourceUpdated"] == "2026-10-11T08:00Z" and nd["rank"] == 1 and nd["record"] == "6-0",
   "core week 6, as Week 7: updated Oct 11, Notre Dame No. 1 at 6-0")
try:
    rh.core_fpi(dict(CORE6, items=CORE6["items"][:100]), 2026, 7, NAMES); short_ok = False
except rh.Refused:
    short_ok = True
ok(short_ok, "a partial FPI table is refused")
try:
    rh.core_fpi(CORE6, 2025, 7, NAMES); season_ok = False
except rh.Refused:
    season_ok = True
ok(season_ok, "another season's table is refused")

asked, flog = [], []
def core_fetch(url):
    asked.append(url)
    if url.endswith("/types/2/weeks/6/powerindex?limit=200"):
        return CORE6
    raise urllib.error.HTTPError(url, 404, "not kept", None, None)
cur = dict(OCT20, sourceUpdated="2026-10-21T08:00Z")
kept8 = rh.keep_fpi({}, cur, 2026)
filled = rh.fill_fpi(kept8, cur, 2026, core_fetch, flog.append)
ok([w["id"] for w in filled] == ["w7", "w8"] and filled[0]["snapshot"]["sourceUpdated"] == "2026-10-11T08:00Z" and filled[1] == kept8[0],
   "the weeks before the current one are filled in; the current week stays fpi.json's own")
ok(sorted(u.split("/weeks/")[1].split("/")[0] for u in asked) == ["1", "2", "3", "4", "5", "6"],
   "Weeks 2 to 7 asked for, as core weeks 1 to 6 - no preseason FPI exists to ask for")
ok(any("fpi w2: ESPN answered 404" in l for l in flog), "a week ESPN does not answer is said, and skipped")
asked2 = []
again = rh.fill_fpi(filled, cur, 2026, lambda u: asked2.append(u) or CORE7, flog.append)
ok([w for w in again if w["id"] == "w7"][0] == filled[0] and [w for w in again if w["id"] == "w8"][0] == filled[1] and
   len([u for u in asked2 if "/weeks/6/" in u or "/weeks/7/" in u]) == 0,
   "a week already kept is never asked for or replaced")
ok(rh.fill_fpi([], dict(cur, season=2025), 2026, core_fetch) == [] and rh.fill_fpi([], dict(cur, seasonType=3), 2026, core_fetch) == [],
   "nothing filled from another season's or a postseason snapshot")
def down(url):
    raise urllib.error.URLError("offline")
ok(rh.fill_fpi(kept8, cur, 2026, down, flog.append) == kept8, "ESPN unreachable: what is kept stands, the rest wait")

print("\n%d checks: every released week kept, complete and named; nothing kept is ever lost" % checks)
