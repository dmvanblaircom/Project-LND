#!/usr/bin/env python3
"""One real game, every Game-screen state: coherent visual-QA fixtures.

A screenshot submitted for visual approval must tell one story: the teams,
score, clock, current drive, plays, line score, team stats and box score all
agree (Game review, 2026-09-24). This builds the pregame, live and final
states of ONE captured game from its real payloads, so they cannot disagree:

  pregame  the real pregame summary; the schedule and scoreboard say "pre"
  live     the real final summary cut at a play: the drives up to it, the
           drive in progress as `current`, the scoring plays, line score and
           win probability before it, and team stats recomputed from those
           plays. Player box scores and leaders are dropped - they cannot be
           recomputed faithfully from play text - so Live Box says so.
  final    the real final summary, with the schedule and scoreboard saying so

Every number in the live state is derived from the plays. The recomputation
is checked against ESPN's own final box score over the whole game first, and
a stat whose method does not reproduce ESPN's final is left out rather than
shown wrong.

    python3 tools/qa/game_states.py OUT_DIR [--drive N --play K]

Default: Notre Dame vs Michigan State (401858453), cut in the 3rd quarter
after the 17-yard run to the MSU 20 (drive 12, play 12). Writes
schedule-, scoreboard- and summary-{pre,live,final}.json to OUT_DIR.
Development tooling only: nothing here ships or is read by the app.
"""
import copy, json, re, sys
from pathlib import Path

FX = Path(__file__).resolve().parent.parent / "fixtures"
EVENT = "401858453"
PRE, FINAL = FX / "espn-summary-pre.json", FX / "espn-summary-msu-final.json"
SCHEDULE = FX / "espn-schedule.json"
# ESPN's play text names teams by these codes; map them to team ids
TEXT_CODE = {"UND": "87", "ND": "87", "MSU": "127"}

NON_SNAPS = {"Timeout", "End Period", "End of Half", "End of Game", "Kickoff", "Penalty",
             "Coin Toss", "Two-minute warning"}


def sec(clock):
    m, s = clock.split(":")
    return int(m) * 60 + int(s)


def team_stats(drives):
    """ESPN's Team-stats rows, recomputed from plays, keyed by team id."""
    t = {}
    def s(tid):
        return t.setdefault(tid, dict(rush=0, pas=0, first=0, third=0, third_ok=0, to=0, pen=0, pen_yds=0, poss=0))
    for dr in drives:
        off = dr["team"]["id"]
        el = dr.get("timeElapsed", {}).get("displayValue")
        if el:
            s(off)["poss"] += sec(el)
        for p in dr["plays"]:
            text, kind = p.get("text", ""), p["type"]["text"]
            y = p.get("statYardage") or 0
            by = (p.get("start") or {}).get("team", {}).get("id")
            for code, what, yds in re.findall(r"PENALTY (\w+) (.+?) (\d+) yards?", text):
                if "declined" in text.lower() or code not in TEXT_CODE:
                    continue
                s(TEXT_CODE[code])["pen"] += 1
                s(TEXT_CODE[code])["pen_yds"] += int(yds)
            if by != off:
                continue
            o = s(off)
            # college football files a sack's loss under rushing, including a
            # sack the passer fumbled and his side recovered
            if kind in ("Rush", "Rushing Touchdown", "Sack") or "sacked" in text:
                o["rush"] += y
            elif kind in ("Pass Reception", "Passing Touchdown"):
                o["pas"] += y
            if kind in ("Interception", "Pass Interception Return", "Interception Return Touchdown",
                        "Fumble Recovery (Opponent)", "Fumble Return Touchdown"):
                o["to"] += 1
            if "1ST DOWN" in text:
                o["first"] += 1
            st, en = p.get("start") or {}, p.get("end") or {}
            if st.get("down") == 3 and kind not in NON_SNAPS and "NO PLAY" not in text:
                o["third"] += 1
                if "Touchdown" in kind or (en.get("down") == 1 and en.get("team", {}).get("id") == off):
                    o["third_ok"] += 1
    out = {}
    for tid, o in t.items():
        out[tid] = {
            "totalYards": str(o["rush"] + o["pas"]), "netPassingYards": str(o["pas"]),
            "rushingYards": str(o["rush"]), "firstDowns": str(o["first"]),
            "thirdDownEff": "%d-%d" % (o["third_ok"], o["third"]), "turnovers": str(o["to"]),
            "totalPenaltiesYards": "%d-%d" % (o["pen"], o["pen_yds"]),
            "possessionTime": "%d:%02d" % divmod(o["poss"], 60)}
    return out


def espn_final_rows(summary):
    return {t["team"]["id"]: {x["name"]: x["displayValue"] for x in t["statistics"]}
            for t in summary["boxscore"]["teams"]}


def trusted_stats(final):
    """The stat names whose recomputation reproduces ESPN's final exactly."""
    mine, theirs = team_stats(final["drives"]["previous"]), espn_final_rows(final)
    ok, bad = [], []
    for name in next(iter(mine.values())):
        (ok if all(mine[tid][name] == theirs[tid].get(name) for tid in mine) else bad).append(name)
    for name in bad:
        print("  left out of live team stats (does not reproduce ESPN's final): %s  %s vs %s"
              % (name, {k: v[name] for k, v in mine.items()}, {k: v.get(name) for k, v in theirs.items()}))
    return ok


def status(state, period=None, clock=None):
    if state == "pre":
        return {"type": {"name": "STATUS_SCHEDULED", "state": "pre", "completed": False,
                         "description": "Scheduled", "detail": "Sat, September 19th at 7:30 PM EDT",
                         "shortDetail": "9/19 - 7:30 PM EDT"}}
    if state == "post":
        return {"type": {"name": "STATUS_FINAL", "state": "post", "completed": True,
                         "description": "Final", "detail": "Final", "shortDetail": "Final"},
                "period": 4, "displayClock": "0:00"}
    nth = {1: "1st", 2: "2nd", 3: "3rd", 4: "4th"}[period]
    return {"type": {"name": "STATUS_IN_PROGRESS", "state": "in", "completed": False,
                     "description": "In Progress", "detail": "%s - %s Quarter" % (clock, nth),
                     "shortDetail": "%s - %s" % (clock, nth)},
            "period": period, "displayClock": clock}


def build(out, cut_drive, cut_play):
    pre, final = json.loads(PRE.read_text()), json.loads(FINAL.read_text())
    sched = json.loads(SCHEDULE.read_text())
    assert pre["header"]["id"] == final["header"]["id"] == EVENT
    trusted = trusted_stats(final)

    # ---- live: the final, cut after one play ----
    drives = final["drives"]["previous"]
    done = copy.deepcopy(drives[:cut_drive])
    cur = copy.deepcopy(drives[cut_drive])
    cur["plays"] = cur["plays"][:cut_play + 1]
    last = cur["plays"][-1]
    for k in ("end", "timeElapsed", "yards", "isScore", "offensivePlays", "result",
              "displayResult", "shortDisplayResult", "description"):
        cur.pop(k, None)
    snaps = [p for p in cur["plays"] if (p.get("start") or {}).get("team", {}).get("id") == cur["team"]["id"]]
    gained = sum(p.get("statYardage") or 0 for p in snaps)
    used = sec(cur["start"]["clock"]["displayValue"]) - sec(last["clock"]["displayValue"])
    cur["description"] = "%d plays, %d yards, %d:%02d" % ((len(snaps), gained) + divmod(used, 60))
    period, clock = last["period"]["number"], last["clock"]["displayValue"]

    def before(p):  # strictly before the cut, in game order
        n, c = p["period"]["number"], sec(p["clock"]["displayValue"])
        return n < period or (n == period and c >= sec(clock))
    scoring = [p for p in final["scoringPlays"] if before(p)]
    play_ids = {p["id"] for d in done for p in d["plays"]} | {p["id"] for p in cur["plays"]}
    stats = team_stats(done + [cur])

    live = copy.deepcopy(final)
    live["_comment"] = ("Visual-QA state derived by tools/qa/game_states.py from the real final "
                        "summary of event %s, cut at %s in period %d. Not a real live payload." % (EVENT, clock, period))
    comp = live["header"]["competitions"][0]
    comp["status"] = status("in", period, clock)
    home_score = away_score = 0
    if scoring:
        home_score, away_score = scoring[-1]["homeScore"], scoring[-1]["awayScore"]
    for c in comp["competitors"]:
        c.pop("winner", None)
        home = c["homeAway"] == "home"
        c["score"] = str(home_score if home else away_score)
        per = [0] * period
        prev = 0
        for p in scoring:
            v = p["homeScore"] if home else p["awayScore"]
            per[p["period"]["number"] - 1] += v - prev
            prev = v
        c["linescores"] = [{"value": float(v), "displayValue": str(v)} for v in per]
    live["drives"] = {"previous": done, "current": cur}
    live["scoringPlays"] = scoring
    live["winprobability"] = [w for w in final["winprobability"] if w.get("playId") in play_ids]
    for t in live["boxscore"]["teams"]:
        t["statistics"] = [{"name": n, "displayValue": stats[t["team"]["id"]][n], "label": n}
                           for n in trusted]
    live["boxscore"].pop("players", None)
    live.pop("leaders", None)
    ctx = last.get("end") or {}
    situation = {"lastPlay": {"text": last["text"]},
                 "downDistanceText": ctx.get("downDistanceText"),
                 "shortDownDistanceText": ctx.get("shortDownDistanceText"),
                 "possessionText": ctx.get("possessionText"),
                 "possession": (ctx.get("team") or {}).get("id")}

    # ---- the schedule and scoreboard, one per state ----
    scores = {"87": None, "127": None}
    def event(state, sc):
        ev = copy.deepcopy(next(e for e in sched["events"] if e["id"] == EVENT))
        c = ev["competitions"][0]
        c["status"] = status(state, period, clock) if state == "in" else status(state)
        for side in c["competitors"]:
            v = sc.get(side["id"])
            if v is not None:
                side["score"] = {"value": float(v), "displayValue": str(v)}
            if state == "post":
                side["winner"] = sc[side["id"]] > max(x for k, x in sc.items() if k != side["id"])
        if state == "in":
            c["situation"] = situation
        return ev

    fcomp = final["header"]["competitions"][0]["competitors"]
    final_sc = {c["id"]: int(c["score"]) for c in fcomp}
    live_sc = {c["id"]: int(c["score"]) for c in comp["competitors"]}
    out.mkdir(parents=True, exist_ok=True)
    for name, state, sc, summary in (("pre", "pre", scores, pre), ("live", "in", live_sc, live),
                                      ("final", "post", final_sc, final)):
        ev = event(state, sc)
        sch = copy.deepcopy(sched)
        sch["events"] = [ev if e["id"] == EVENT else e for e in sched["events"]]
        # the scoreboard carries the same event in the same state: the flat
        # score strings and names[] broadcast shape the scoreboard uses
        sb_ev = copy.deepcopy(ev)
        for side in sb_ev["competitions"][0]["competitors"]:
            side["score"] = str(sc.get(side["id"]) or 0)
        sb_ev["competitions"][0]["broadcasts"] = [{"market": "national", "names": ["NBC"]}]
        (out / ("schedule-%s.json" % name)).write_text(json.dumps(sch))
        (out / ("scoreboard-%s.json" % name)).write_text(json.dumps({"events": [sb_ev]}))
        (out / ("summary-%s.json" % name)).write_text(json.dumps(summary))
    print("live: %s %d, ND %s MSU %s, %s, drive %d play %d, %d scoring plays"
          % (clock, period, live_sc["87"], live_sc["127"], situation["downDistanceText"],
             cut_drive, cut_play, len(scoring)))
    print("live team stats:", stats)


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a:
        sys.exit(__doc__)
    opt = dict(zip(a[1::2], a[2::2]))
    build(Path(a[0]), int(opt.get("--drive", 12)), int(opt.get("--play", 12)))
