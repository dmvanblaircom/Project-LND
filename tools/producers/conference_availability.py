#!/usr/bin/env python3
"""Fetch a conference's availability reports for one team, and write them.

The Big Ten publishes every conference game's availability report on
BigTen.org (four a week from 2026: three midweek and a gameday report). The
page embeds HD Intelligence's public report viewer, and what that viewer
reads is two unauthenticated JSON calls - the same two a fan's browser
makes on the page, with no key and no login:

    POST https://app.hdintelligence.com/api/get-publish-public   this week's reports
    POST https://app.hdintelligence.com/api/get-archive-public   the season's archive
         body {"sport": "Football", "organization": "B10", "conference": "B10"}

This file is the adapter: those schemas stop here. It writes the same
availability snapshot the school-notes producer writes (official_depth.py),
so TeamOS and Suite cannot tell which document a report came from.

    python3 tools/producers/conference_availability.py --team ohio-state

It reads the team's declaration in teams/<team>.js:

    sources.official.availabilityFeed   { provider, conference, sport, team }
    sources.official.availabilityReportLabel / availabilityReportIndex
    snapshots.availability              the files it writes

Rules, each tested by tools/conferenceavailcheck.py:

  * A player marked Available, or Exempt (not part of the report), is not
    listed. The conference's own rule: a player not listed is available.
  * The current week's report is the newest one published for the team's
    game; with none published (a bye, early in the week) the latest game in
    the archive stands, so the file never goes back to "no report".
  * A failed fetch changes nothing and exits non-zero: the last good files
    stay in place and the failure is loud.
"""
import argparse
import json
import os
import re
import sys
import urllib.request
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import teamconfig  # noqa: E402
from official_depth import UA, load, log, write_if_changed  # noqa: E402

API = "https://app.hdintelligence.com/api/"
PARSER = 1

# The conference's words -> the snapshot's status keys. "Out" is for the
# game: the Big Ten's long-term list is not a season-ending designation.
STATUSES = [
    (re.compile(r"^out\W*\(?1st half\)?$", re.I), "out-half"),
    (re.compile(r"^out$", re.I), "out-game"),
    (re.compile(r"^doubtful$", re.I), "doubtful"),
    (re.compile(r"^questionable$", re.I), "questionable"),
    (re.compile(r"^probable$", re.I), "probable"),
    (re.compile(r"^game[ -]time decision$", re.I), "gtd"),
]
NOT_LISTED = re.compile(r"^(available|exempt|-|)$", re.I)
ORDER = ["Game Day", "Update 2", "Update 1", "Initial"]      # newest first
NAME = re.compile(r"^\s*(?P<pos>[A-Z/]{1,5})\s+#\s*(?P<no>\d{1,3})\s+(?P<name>.+?)\s*$")


# ---- pure: tools/conferenceavailcheck.py tests these ----------------------

def status_key(text):
    """The conference's status -> the snapshot's key; None if not listed;
    raises on a word no rule reads, so a new status is never dropped quietly."""
    t = re.sub(r"\s+", " ", str(text or "")).strip()
    if NOT_LISTED.match(t):
        return None
    for rx, key in STATUSES:
        if rx.match(t):
            return key
    raise ValueError("unknown availability status: %r" % t)


def player(text):
    """'WR #0 Brandon Inniss' -> {pos, no, name}."""
    m = NAME.match(str(text or ""))
    if not m:
        return {"pos": "", "no": "", "name": str(text or "").strip()}
    return {"pos": m.group("pos"), "no": m.group("no"), "name": m.group("name")}


def _ours(name, names):
    return str(name or "").strip().lower() in names


def published(payload, names):
    """This week's published report for the team, newest first, or None:
    (report, our side, their side)."""
    found = []
    for rid, r in (payload or {}).items():
        games = (r or {}).get("games") or []
        mine = [g for g in games if _ours(g.get("teamName"), names) or _ours(g.get("teamDisplayName"), names)]
        if len(mine) != 1:
            continue
        other = [g for g in games if g is not mine[0]]
        found.append(((r.get("publishDate") or "", r.get("postedTime") or "", str(rid)), r, mine[0], other[0] if other else None))
    if not found:
        return None
    found.sort(key=lambda x: x[0], reverse=True)
    return found[0][1:]


def archive_games(payload, names):
    """The season's archive -> {game date: {"game", "rows"}} for the team."""
    out = {}
    for row in (payload or {}).get("data") or []:
        if not (_ours(row.get("Team"), names) or _ours(row.get("TeamDisplay"), names)):
            continue
        day = _date(row.get("Week"))
        if not day:
            continue
        g = out.setdefault(day, {"game": row.get("OpponentDisplay") or row.get("Opponent") or "", "rows": []})
        g["rows"].append(row)
    return out


def _date(s):
    """'Sat, 10 Oct 2026 00:00:00 GMT' or '2026-10-10' -> '2026-10-10'."""
    s = str(s or "").strip()
    for fmt in ("%a, %d %b %Y %H:%M:%S GMT", "%Y-%m-%d"):
        try:
            return datetime.strptime(s, fmt).strftime("%Y-%m-%d")
        except ValueError:
            pass
    return None


def from_published(report, side, other, game_label):
    players = []
    for row in side.get("rows") or []:
        key = status_key(row.get("status"))
        if key:
            players.append(dict(player(row.get("name")), status=key, detail=""))
    kind = report.get("ReportType") or ""
    return {"reported": True, "effectiveAt": _date(report.get("publishDate")),
            "heading": kind or None, "kickoffDate": _date((report.get("footer") or {}).get("date")),
            "game": game_label or (other or {}).get("teamDisplayName") or "", "players": players}


def from_archive(day, g):
    """A game from the archive: each player's newest status that week."""
    players = []
    kinds = set()
    for row in g["rows"]:
        for kind in ORDER:
            if row.get(kind) in (None, "-", ""):
                continue                      # not filed yet, or not filed at all
            kinds.add(kind)
            key = status_key(row.get(kind))
            if key:
                players.append({"pos": "", "no": str(row.get("Number") or "").lstrip("#"),
                                "name": str(row.get("Player") or "").strip(), "status": key, "detail": ""})
            break
    newest = next((k for k in ORDER if k in kinds), None)
    return {"reported": True, "effectiveAt": day, "heading": newest, "kickoffDate": day,
            "game": g["game"], "players": players}


def build(publish, archive, names):
    """-> (latest report, every report this season, oldest first). Reports
    carry the snapshot's fields; the producer stamps who and when."""
    games = archive_games(archive, names)
    season = {day: from_archive(day, g) for day, g in games.items()}
    pub = published(publish, names)
    if pub:
        report, side, other = pub
        day = _date((report.get("footer") or {}).get("date"))
        label = games.get(day, {}).get("game") if day else None
        season[day or ("~" + (report.get("publishDate") or ""))] = from_published(report, side, other, label)
    history = [season[k] for k in sorted(season)]
    return (history[-1] if history else None), history


# ---- network ----------------------------------------------------------

def call(endpoint, body):
    req = urllib.request.Request(API + endpoint, data=json.dumps(body).encode(), method="POST",
                                 headers={"user-agent": UA, "content-type": "application/json"})
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.loads(r.read())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--team", required=True)
    args = ap.parse_args()

    config = teamconfig.load(args.team)
    off = (config.get("sources") or {}).get("official") or {}
    feed = off.get("availabilityFeed") or {}
    snap = teamconfig.snapshot(config, "availability")
    if feed.get("provider") != "hdintelligence" or not snap:
        sys.exit("teams/%s.js declares no conference availability feed and snapshot" % args.team)
    names = {str(n).strip().lower() for n in ([feed.get("team")] + list(feed.get("aliases") or [])) if n}
    body = {"sport": feed.get("sport") or "Football", "organization": feed["conference"], "conference": feed["conference"]}

    try:
        publish = call("get-publish-public", body)
        archive = call("get-archive-public", body)
    except Exception as e:                                   # noqa: BLE001
        sys.exit("conference availability fetch failed: %s - leaving files alone" % str(e)[:160])
    if not isinstance(publish, dict) or not isinstance(archive, dict) or not archive.get("loaded", True):
        sys.exit("conference availability: an unexpected answer - leaving files alone")

    latest, history = build(publish, archive, names)
    if latest is None:
        log("availability: no report for", feed.get("team"), "yet this season - nothing written")
        return

    now = datetime.now(timezone.utc).isoformat()
    stamp = {"schema": 1, "team": args.team, "capability": "availability", "tier": "official",
             "sourceUrl": off.get("availabilityReportIndex"), "sourceLabel": off.get("availabilityReportLabel"),
             "pdf": None, "parser": PARSER, "fetchedAt": now}
    AV, AHIST = snap["file"], snap.get("history")
    old_av, old_hist = load(AV, None), (load(AHIST, None) if AHIST else None)
    # A report keeps the time it was first seen: a run that reads it again
    # changes nothing, so it commits nothing.
    seen = {(r.get("game"), r.get("heading"), r.get("effectiveAt")): r.get("fetchedAt")
            for r in ((old_hist or {}).get("reports") or [])}
    reports = [dict(stamp, **r, fetchedAt=seen.get((r["game"], r["heading"], r["effectiveAt"])) or now) for r in history]
    wrote = []
    if write_if_changed(AV, reports[-1], old_av):
        wrote.append(AV)
    if AHIST and write_if_changed(AHIST, {"schema": 1, "team": args.team, "updated": now, "reports": reports}, old_hist):
        wrote.append(AHIST)
    log("availability:", reports[-1]["game"], "|", reports[-1]["heading"], reports[-1]["effectiveAt"],
        "|", len(reports[-1]["players"]), "listed |", len(reports), "games this season")
    log("wrote:", ", ".join(wrote) if wrote else "nothing - no change")


if __name__ == "__main__":
    main()
