#!/usr/bin/env python3
"""The defending national champion, from ESPN's postseason scoreboard
(David, 2026-10-27: a banner on Home for whoever won the last title game).

    python3 tools/producers/champion.py [--out data/league/champion.json]

The title game is the postseason game whose note names the national
championship (ESPN, 2025: "College Football Playoff National Championship
Presented by AT&T"; the rounds before it are "... First Round Game",
"... Quarterfinal at ...", "... Semifinal at ..."). This season's is looked
for first, then last season's: the first that is final is the defending
champion's. So the file moves to the new champion on the first run after
the title game, and nothing else has to change.

Written only when the title changed. When no final title game is found the
file is left as it was; when ESPN cannot be read the step fails, and the
file is left as it was. Names no team.
"""
import argparse
import json
import os
import re
import sys
import urllib.request
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = "data/league/champion.json"
BOARD = ("https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard"
         "?seasontype=3&dates=%d&groups=80&limit=300")
TITLE = re.compile(r"national championship", re.I)
ROUND = re.compile(r"first round|quarterfinal|semifinal", re.I)
SPONSOR = re.compile(r"\s+presented by .*$", re.I)


def log(*a):
    print(" ", *a)


def season_of(now):
    """The season under way: January to June still belong to last season's
    (the app's seasonYear() says the same)."""
    return now.year if now.month > 6 else now.year - 1


def title_game(board):
    """-> the final title game on a postseason scoreboard, as the file's
    fields, or None."""
    for ev in (board or {}).get("events") or []:
        comp = (ev.get("competitions") or [{}])[0]
        note = " ".join(str(n.get("headline") or "") for n in comp.get("notes") or [])
        if not TITLE.search(note) or ROUND.search(note):
            continue
        status = ((comp.get("status") or ev.get("status") or {}).get("type") or {})
        if not status.get("completed"):
            return None                      # this season's is still to be played
        sides = comp.get("competitors") or []
        if len(sides) != 2:
            return None
        try:
            pts = [float((s.get("score") or {}).get("value") if isinstance(s.get("score"), dict) else s.get("score")) for s in sides]
        except (TypeError, ValueError):
            return None
        won = [s for s in sides if s.get("winner") is True]
        if len(won) != 1:
            if pts[0] == pts[1]:
                return None
            won = [sides[0] if pts[0] > pts[1] else sides[1]]
        w = won[0]
        l = sides[1] if w is sides[0] else sides[0]
        wp, lp = (pts[0], pts[1]) if w is sides[0] else (pts[1], pts[0])

        def team(s):
            t = s.get("team") or {}
            return {"id": str(t.get("id") or ""), "name": str(t.get("location") or t.get("shortDisplayName") or t.get("displayName") or "")}
        if not team(w)["id"]:
            return None
        return {"game": str(ev.get("id") or ""), "label": SPONSOR.sub("", note.strip()), "date": ev.get("date"),
                "team": team(w), "opponent": team(l), "score": {"winner": int(wp), "loser": int(lp)}}
    return None


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Suite data refresh)"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def write_if_changed(path, out):
    try:
        old = json.load(open(path))
    except (OSError, ValueError):
        old = None
    same = old and {k: v for k, v in old.items() if k != "fetchedAt"} == {k: v for k, v in out.items() if k != "fetchedAt"}
    if same:
        return False
    with open(path, "w") as f:
        json.dump(out, f, indent=1)
        f.write("\n")
    return True


def main(now=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=OUT)
    args = ap.parse_args()
    now = now or datetime.now(timezone.utc)
    season = season_of(now)
    for s in (season, season - 1):
        try:
            board = fetch(BOARD % s)
        except Exception as e:                # the step fails; the file stays
            sys.exit("champion: ESPN's %d postseason could not be read: %s" % (s, e))
        game = title_game(board)
        if not game:
            log("%d: no final title game" % s)
            continue
        out = dict({"schema": 1, "capability": "champion", "season": s, "source": "ESPN",
                    "fetchedAt": now.isoformat()}, **game)
        path = os.path.join(ROOT, args.out)
        log("%d champion: %s, %d-%d over %s" % (s, game["team"]["name"], game["score"]["winner"], game["score"]["loser"], game["opponent"]["name"]))
        log("wrote:", args.out if write_if_changed(path, out) else "nothing - no change")
        return
    log("no final title game this season or last; the file is left as it was")


if __name__ == "__main__":
    main()
