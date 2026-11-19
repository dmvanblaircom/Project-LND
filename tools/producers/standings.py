#!/usr/bin/env python3
"""Every FBS conference's standings, as a small league snapshot.

    python3 tools/producers/standings.py [--season 2026] [--from-file payload.json] [--out PATH]
    python3 tools/producers/standings.py due --last .cadence/standings

Writes data/league/standings.json for Around's Conference Race (Games That
Matter, Phase 3; David, 2026-11-19: "Build now"). ESPN's standings for all of
FBS are one read of about 2.6 MB (probed 2026-11-13 and 2026-11-19); the
snapshot keeps only what the race needs, per conference:

  name           the conference as ESPN names it ("Big 12 Conference")
  teams          [{ espnId, name, conf: { wins, losses }, overall,
                    division? }]
                 sorted by conference losses, then wins - ESPN's own list
                 order is not a ranking (audit, 2026-11-13: its order and
                 its summary disagreed)
                 A conference split into divisions (the Sun Belt in 2026)
                 comes from ESPN one level deeper, each division a child
                 group with its own entries; its teams carry the division's
                 name, since each division has its own race to the title game.

The independents are left out: they have no race. Nothing here claims a
clinch, an elimination or a tiebreak; the page reads only the records.
Once a day (it moves when teams play). A table that fails validation -
another season, too few conferences or teams, a record that does not read,
or a conference the last snapshot of the same season had and this one lacks
(Codex, #266) - is refused and the last good snapshot stays.
"""
import argparse
import json
import os
import re
import sys
import urllib.request
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(ROOT, "data", "league", "standings.json")
URL = "https://site.api.espn.com/apis/v2/sports/football/college-football/standings?season=%d"
MIN_CONFERENCES = 10     # every FBS conference in 2026 (ESPN's 11 groups less the independents)
MIN_TEAMS = 110          # FBS less the independents is about 135
EVERY_HOURS = 20         # once a day: these move only when teams play
RECORD = re.compile(r"^(\d+)-(\d+)(?:-(\d+))?$")


class Refused(ValueError):
    """The payload is not a complete, current standings table."""


def _record(s):
    m = RECORD.match(str(s or "").strip())
    if not m:
        return None
    return {"wins": int(m.group(1)), "losses": int(m.group(2))}


def _stat(entry, kind):
    for st in entry.get("stats") or []:
        if isinstance(st, dict) and st.get("type") == kind:
            return st.get("summary") or st.get("displayValue")
    return None


def _entries(group):
    """(entry, division) for every team in a conference: its own entries,
    then each division's (a conference split in two nests them one level
    deeper; division is None when it is not split)."""
    for e in ((group.get("standings") or {}).get("entries")) or []:
        yield e, None
    for child in group.get("children") or []:
        name = (child or {}).get("name") or (child or {}).get("abbreviation") or "division"
        for e in (((child or {}).get("standings") or {}).get("entries")) or []:
            yield e, name


def normalize(payload, season=None):
    if not isinstance(payload, dict) or not isinstance(payload.get("children"), list):
        raise Refused("no conference list")
    year = (payload.get("season") or {}).get("year")
    if season is not None and year != season:
        raise Refused("season %s, expected %s" % (year, season))
    out, seen = [], set()
    for group in payload["children"]:
        name = (group or {}).get("name") or ""
        if re.search(r"independent", name, re.I):
            continue
        teams = []
        for e, division in _entries(group):
            team = e.get("team") or {}
            tid = str(team.get("id") or "")
            conf = _record(_stat(e, "vsconf"))
            if not tid or conf is None:
                raise Refused("%s: a team without an id or a conference record" % name)
            if tid in seen:
                raise Refused("team %s listed twice" % tid)
            seen.add(tid)
            row = {"espnId": tid, "name": team.get("shortDisplayName") or team.get("location") or team.get("displayName"),
                   "conf": conf, "overall": _stat(e, "total")}
            if division:
                row["division"] = division
            teams.append(row)
        if not teams:
            raise Refused("%s has no teams" % name)
        teams.sort(key=lambda t: (t["conf"]["losses"], -t["conf"]["wins"], t["name"] or ""))
        out.append({"name": name, "abbr": group.get("abbreviation"), "teams": teams})
    if len(out) < MIN_CONFERENCES:
        raise Refused("only %d conferences" % len(out))
    if len(seen) < MIN_TEAMS:
        raise Refused("only %d teams (a partial table)" % len(seen))
    out.sort(key=lambda c: c["name"])
    return {"schema": 1, "source": "standings", "label": "ESPN", "season": year, "conferences": out}


def missing(previous, snap):
    """Conferences the last snapshot of the same season had and this one
    lacks. A partial read that still clears the minimums would otherwise
    drop a conference's teams from the race. A new season starts fresh, so
    realignment between seasons is not refused."""
    if not isinstance(previous, dict) or previous.get("season") != snap.get("season"):
        return []
    now = {c.get("name") for c in snap.get("conferences") or []}
    return sorted(c.get("name") for c in previous.get("conferences") or [] if c.get("name") not in now)


def due(last, now):
    """Whether a refresh is due: no record of the last one, an unreadable
    one, or one at least EVERY_HOURS old. When in doubt, refresh."""
    try:
        with open(last, encoding="utf-8") as f:
            then = datetime.strptime(f.read().strip(), "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
    except (OSError, ValueError):
        return True
    return (now - then).total_seconds() >= EVERY_HOURS * 3600


def main():
    if len(sys.argv) > 1 and sys.argv[1] == "due":
        ap = argparse.ArgumentParser()
        ap.add_argument("kind")
        ap.add_argument("--last", required=True)
        args = ap.parse_args()
        is_due = due(args.last, datetime.now(timezone.utc))
        print("  standings %s" % ("due" if is_due else "not due: refreshed within %d hours" % EVERY_HOURS))
        sys.exit(0 if is_due else 3)
    ap = argparse.ArgumentParser()
    ap.add_argument("--season", type=int, default=None, help="default: this year")
    ap.add_argument("--from-file", help="read a saved payload instead of fetching")
    ap.add_argument("--out", default=OUT)
    args = ap.parse_args()
    season = args.season or datetime.now(timezone.utc).year
    if args.from_file:
        payload = json.load(open(args.from_file, encoding="utf-8"))
    else:
        req = urllib.request.Request(URL % season, headers={"accept": "application/json"})
        with urllib.request.urlopen(req, timeout=60) as r:
            payload = json.load(r)
    try:
        snap = normalize(payload, season)
    except Refused as e:
        print("::error::standings refused, previous snapshot kept: %s" % e)
        sys.exit(1)
    previous = None
    if os.path.exists(args.out):
        try:
            previous = json.load(open(args.out, encoding="utf-8"))
        except ValueError:
            previous = None
    gone = missing(previous, snap)
    if gone:
        print("::error::standings refused, previous snapshot kept: missing %s" % ", ".join(gone))
        sys.exit(1)
    if previous and {k: v for k, v in previous.items() if k != "fetchedAt"} == snap:
        print("  standings unchanged; snapshot not touched")
        return
    snap["fetchedAt"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%MZ")
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(snap, f, indent=1)
        f.write("\n")
    print("  standings %s: %d conferences, %d teams" % (snap["season"], len(snap["conferences"]),
                                                      sum(len(c["teams"]) for c in snap["conferences"])))


if __name__ == "__main__":
    main()
