#!/usr/bin/env python3
"""ESPN's recruiting classes and NFL draft board, as snapshots (W16).

    python3 tools/producers/prospects.py recruits --team-id 87 --out data/notre-dame/recruits.json
    python3 tools/producers/prospects.py draft --out data/league/draft.json [--year 2027]
    ... [--from-file captured.json]   (a capture_core.py fixture instead of fetching)

David chose ESPN for both on 2026-10-03 (offseason proposal §7, rows 4 and
6; docs/engineering/offseason-sources.md). Each is a core-API list of $ref
links; every record is fetched and only the fields the Suite shows are kept.
ESPN's prose (analysis, scouting copy) is never kept.

Recruits: the team's class from `teams/<id>/recruits` (the current class;
that endpoint ignores ?season=). A recruit belongs to the class only if his
committed school - the one `schools[]` entry whose status matches his own,
e.g. "Verbal" - is this team: appearing in his list of candidate schools
means nothing. A recruit whose commitment points elsewhere (a flip ESPN's
list has not caught up with) is left out and counted.

Draft: the board of prospects for one draft year, with each prospect's
college (ESPN team id), position, position rank, overall rank, ESPN's grade
when it has published one, and the actual pick once the draft has made it.
The default year is the next draft: this year's until the end of April,
next year's from May; if that board is empty, last year's results stand.

A payload that is not what it should be is refused with a reason and the
previous snapshot stays: a broken source never replaces good data.
"""
import argparse
import json
import os
import re
import sys
import urllib.request
from datetime import datetime, timezone

CFB = "https://sports.core.api.espn.com/v2/sports/football/leagues/college-football"
NFL = "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl"
NFL_TEAMS = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams"
UA = "Mozilla/5.0 (compatible; ProjectLND/1.0)"


class Refused(ValueError):
    """The payload is not a usable class or board."""


def _get(url):
    if url.startswith("http://"):
        url = "https://" + url[len("http://"):]
    req = urllib.request.Request(url, headers={"user-agent": UA, "accept": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def _follow(list_url, cap=1000):
    """A core-API list with each $ref item fetched: {"count", "items"}."""
    page = _get(list_url)
    items = []
    for it in (page.get("items") or [])[:cap]:
        if isinstance(it, dict) and set(it) == {"$ref"}:
            it = _get(it["$ref"])
        items.append(it)
    return {"count": page.get("count"), "items": items}


def _ref_id(obj, kind):
    """The id in a $ref like .../teams/87?lang=en, or None."""
    m = re.search(r"/%s/(\d+)" % kind, (obj or {}).get("$ref") or "")
    return m.group(1) if m else None


def _attrs(rec):
    return {a.get("name"): a.get("value") for a in rec.get("attributes") or [] if isinstance(a, dict)}


def _int(v):
    return int(v) if isinstance(v, (int, float)) and v == v and v > 0 else None


# --- recruits ---------------------------------------------------------------

def committed_school(rec):
    """The team id of the recruit's committed school, or None."""
    want = ((rec.get("status") or {}).get("description") or "").strip()
    if not want or want.lower() == "undecided":
        return None
    hits = [s for s in rec.get("schools") or []
            if ((s.get("status") or {}).get("description") or "").strip() == want]
    ids = {_ref_id(s.get("team"), "teams") for s in hits} - {None}
    return ids.pop() if len(ids) == 1 else None


def normalize_class(payload, team_id):
    if not isinstance(payload, dict) or not isinstance(payload.get("items"), list):
        raise Refused("no items list")
    team_id = str(team_id)
    rows, years, elsewhere, seen = [], set(), 0, set()
    for rec in payload["items"]:
        a = rec.get("athlete") or {}
        rid = str(a.get("id") or "")
        if not rid or not a.get("fullName"):
            raise Refused("a recruit without an id or a name")
        if rid in seen:
            raise Refused("recruit %s listed twice" % rid)
        seen.add(rid)
        if committed_school(rec) != team_id:
            elsewhere += 1
            continue
        years.add(rec.get("recruitingClass"))
        hs = a.get("highSchool") or {}
        town = a.get("hometown") or (hs.get("address") or {})
        at = _attrs(rec)
        rows.append({
            "id": rid,
            "name": a["fullName"],
            "position": (a.get("position") or {}).get("abbreviation"),
            "highSchool": hs.get("name"),
            "city": town.get("city"),
            "state": town.get("stateAbbreviation"),
            "grade": _int(rec.get("grade")),
            "rank": _int(at.get("rank")),
            "positionRank": _int(at.get("positionRank")),
            "stateRank": _int(at.get("stateRank")),
            "status": (rec.get("status") or {}).get("description"),
        })
    if len(years) > 1:
        raise Refused("recruits from more than one class: %s" % sorted(years))
    # ESPN's order is not a ranking: best grade first, then national rank.
    rows.sort(key=lambda r: (-(r["grade"] or 0), r["rank"] or 10 ** 6, r["name"]))
    return {
        "schema": 1,
        "source": "espn-recruiting",
        "label": "ESPN recruiting",
        "sourceUrl": "https://www.espn.com/college-sports/football/recruiting/",
        "teamId": team_id,
        "classYear": years.pop() if years else None,
        "listed": payload.get("count"),
        "committedElsewhere": elsewhere,
        "recruits": rows,
    }


# --- draft ------------------------------------------------------------------

def default_year(now):
    """The next draft: this year's through April, next year's from May."""
    return now.year if now.month <= 4 else now.year + 1


def normalize_board(payload, year, rounds=None, nfl_teams=None):
    """The board, and with `rounds` (the draft's rounds list) each pick made."""
    if not isinstance(payload, dict) or not isinstance(payload.get("items"), list):
        raise Refused("no items list")
    picks = {}
    for rnd in (rounds or {}).get("items") or []:
        for p in rnd.get("picks") or []:
            aid = _ref_id(p.get("athlete"), "athletes")
            if aid and (p.get("status") or {}).get("name") == "SELECTION_MADE":
                tid = _ref_id(p.get("team"), "teams")
                picks[aid] = {"round": _int(p.get("round")), "pick": _int(p.get("pick")),
                              "overall": _int(p.get("overall")), "nflTeamId": tid,
                              "nflTeam": (nfl_teams or {}).get(tid)}
    rows, seen = [], set()
    for rec in payload["items"]:
        pid = str(rec.get("id") or "")
        if not pid or not rec.get("fullName"):
            raise Refused("a prospect without an id or a name")
        if pid in seen:
            raise Refused("prospect %s listed twice" % pid)
        seen.add(pid)
        at = _attrs(rec)
        rows.append({
            "id": pid,
            "name": rec["fullName"],
            "position": (rec.get("position") or {}).get("abbreviation"),
            "collegeId": _ref_id(rec.get("team"), "teams") or _ref_id(rec.get("college"), "colleges"),
            "grade": _int(at.get("grade")),          # ESPN publishes grades later in the cycle
            "positionRank": _int(at.get("rank")),     # ESPN's "rank" attribute is POS RK
            "overall": _int(at.get("overall")),
            "pick": picks.get(pid),
        })
    if payload["items"] and not any(r["overall"] for r in rows):
        raise Refused("no prospect has an overall rank (ESPN changed the record?)")
    rows.sort(key=lambda r: (r["overall"] or 10 ** 6, r["name"]))
    return {
        "schema": 1,
        "source": "espn-draft",
        "label": "ESPN draft board",
        "sourceUrl": "https://www.espn.com/nfl/draft/",
        "year": year,
        "listed": payload.get("count"),
        "drafted": sum(1 for r in rows if r["pick"]),
        "prospects": rows,
    }


# --- run --------------------------------------------------------------------

def write(out, snap, what):
    previous = None
    if os.path.exists(out):
        try:
            previous = json.load(open(out, encoding="utf-8"))
            previous.pop("fetchedAt", None)
        except ValueError:
            previous = None
    if previous == snap:
        print("  %s unchanged; snapshot not touched" % what)
        return
    snap["fetchedAt"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%MZ")
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(snap, f, indent=1)
        f.write("\n")
    print("  %s written to %s" % (what, out))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("kind", choices=["recruits", "draft"])
    ap.add_argument("--team-id", help="recruits: the team's ESPN id")
    ap.add_argument("--year", type=int, help="draft: default the next draft")
    ap.add_argument("--from-file", help="a capture_core.py fixture instead of fetching")
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    try:
        if args.kind == "recruits":
            if not args.team_id:
                ap.error("recruits needs --team-id")
            payload = (json.load(open(args.from_file, encoding="utf-8")) if args.from_file
                       else _follow("%s/teams/%s/recruits?limit=100" % (CFB, args.team_id)))
            snap = normalize_class(payload, args.team_id)
            what = "%s class of %s: %d recruits" % (args.team_id, snap["classYear"], len(snap["recruits"]))
        else:
            year = args.year or default_year(datetime.now(timezone.utc))
            if args.from_file:
                payload, rounds, names = json.load(open(args.from_file, encoding="utf-8")), None, None
            else:
                payload = _follow("%s/seasons/%d/draft/athletes?limit=1000" % (NFL, year))
                if not payload["items"]:
                    year -= 1           # no board yet: last year's results stand
                    payload = _follow("%s/seasons/%d/draft/athletes?limit=1000" % (NFL, year))
                rounds = _get("%s/seasons/%d/draft/rounds" % (NFL, year))
                names = {str(t["team"]["id"]): t["team"].get("displayName")
                         for s in _get(NFL_TEAMS).get("sports") or [] for lg in s.get("leagues") or []
                         for t in lg.get("teams") or [] if (t.get("team") or {}).get("id")}
            snap = normalize_board(payload, year, rounds, names)
            what = "%d draft board: %d prospects, %d drafted" % (year, len(snap["prospects"]), snap["drafted"])
    except Refused as e:
        print("::error::%s refused, previous snapshot kept: %s" % (args.kind, e))
        sys.exit(1)
    write(args.out, snap, what)


if __name__ == "__main__":
    main()
