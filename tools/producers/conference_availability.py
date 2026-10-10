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
    the archive stands, so the file never goes back to "no report" - marked
    `current: false`, so it is shown as that game's report but never marks
    a player out on the roster (Codex, #118).
  * A failed fetch, a status no rule reads, or a report missing its player
    rows or its game date changes nothing and exits non-zero: the last good files stay in
    place and the failure is loud.
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
RANK = {kind: len(ORDER) - i for i, kind in enumerate(ORDER)}  # Initial 1 ... Game Day 4
# A published report lists the whole travel squad (about 110-120 players), the
# available ones included. Far fewer rows is a partial or changed answer, not
# a report that lists nobody - refuse it rather than clear every status.
MIN_ROWS = 40
# "WR #0 Brandon Inniss"; now and then a player has no number yet ("S CJ
# Christian", Washington, Oct. 9) - the number is optional, the position is not.
NAME = re.compile(r"^\s*(?P<pos>[A-Z/]{1,5})\s+(?:#\s*(?P<no>\d{1,3})\s+)?(?P<name>[^#\s].*?)\s*$")
NUMBERED = 0.9      # the share of a report's rows that must carry "#N"


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
    return {"pos": m.group("pos"), "no": m.group("no") or "", "name": m.group("name")}


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
    check_published(*found[0][1:])
    return found[0][1:]


def check_published(report, side, other):
    """Every field of this week's report the producer reads, checked before
    anything is written (Codex, #118): a field missing, renamed or in a new
    form is a changed answer, never a report - the last good files stay.
      ReportType   orders the reports (a saved Update 2 outranks the
                   archive's Update 1)
      dates        footer.date retires the report once its game is played
      rows         the whole travel squad, each with a name and a status
      opponent     names the game"""
    if report.get("ReportType") not in RANK:
        raise ValueError("this week's report has an unknown report type: %r" % report.get("ReportType"))
    if not _date((report.get("footer") or {}).get("date")) or not _date(report.get("publishDate")):
        raise ValueError("this week's report has no readable game or publish date")
    rows = side.get("rows")
    if not isinstance(rows, list) or len(rows) < MIN_ROWS:
        raise ValueError("this week's report has %s player rows - not a whole report"
                         % (len(rows) if isinstance(rows, list) else "no"))
    if not all(isinstance(r, dict) and all(str(r.get(k) or "").strip() for k in ("name", "status")) for r in rows):
        raise ValueError("a player row in this week's report has no name or no status")
    # The rows' form is checked too: every one "POS [#N] Name", nearly all
    # numbered. A new form ("WR 0 Brandon Inniss") would read as mangled
    # names that match nobody on the roster (Codex, #118).
    names = [str(r["name"]) for r in rows]
    numbered = sum(1 for n in names if (NAME.match(n) or {}) and NAME.match(n).group("no"))
    if not all(NAME.match(n) for n in names) or numbered < NUMBERED * len(names):
        raise ValueError("this week's player names are not in the form 'POS #N Name' (%d of %d numbered)"
                         % (numbered, len(names)))
    if not other or not str(other.get("teamDisplayName") or other.get("teamName") or "").strip():
        raise ValueError("this week's report names no opponent")


def archive_games(payload, names):
    """The season's archive -> {game date: {"game", "rows"}} for the team."""
    out = {}
    for row in (payload or {}).get("data") or []:
        if not (_ours(row.get("Team"), names) or _ours(row.get("TeamDisplay"), names)):
            continue
        # The fields the producer reads, checked the same way: the game's
        # date, the opponent, and the report columns (Codex, #118).
        day = _date(row.get("Week"))
        game = str(row.get("OpponentDisplay") or row.get("Opponent") or "").strip()
        if not day or not game or not all(k in row for k in ORDER):
            raise ValueError("an archive row for the team has no readable date, opponent or report columns")
        g = out.setdefault(day, {"game": game, "rows": []})
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
            if key and not str(row.get("Player") or "").strip():
                raise ValueError("a listed player in the archive has no name")
            if key:
                players.append({"pos": "", "no": str(row.get("Number") or "").lstrip("#"),
                                "name": str(row.get("Player") or "").strip(), "status": key, "detail": ""})
            break
    newest = next((k for k in ORDER if k in kinds), None)
    return {"reported": True, "effectiveAt": day, "heading": newest, "kickoffDate": day,
            "game": g["game"], "players": players, "current": False}


FIELDS = ("reported", "effectiveAt", "heading", "kickoffDate", "game", "players")


def build(publish, archive, names, previous=None):
    """-> (latest report, every report this season, oldest first). Reports
    carry the snapshot's fields; the producer stamps who and when.

    The archive lists only players who were listed, so a week that listed
    nobody has no row in it. `previous` (the history on file) is the base,
    so such a week, read once while it was published, is never lost when
    the published report moves on (Codex, #118); the archive, then this
    week's published report, replace what they cover."""
    season = {}
    for r in previous or []:
        if isinstance(r, dict) and r.get("kickoffDate"):
            season[r["kickoffDate"]] = dict({k: r.get(k) for k in FIELDS}, current=r.get("current") is True)
    games = archive_games(archive, names)
    for day, g in games.items():
        # The archive lags the published report (it can read Update 1 while
        # Update 2 is out): a report on file at least as new as the
        # archive's for the same game stays (Codex, #118). Once its game day
        # has passed, TeamOS stops it marking the roster whatever `current` says.
        mine, theirs = season.get(day), from_archive(day, g)
        if not (mine and RANK.get(mine.get("heading"), -1) >= RANK.get(theirs["heading"], -1)):
            season[day] = theirs
    pub = published(publish, names)
    if pub:
        report, side, other = pub
        day = _date((report.get("footer") or {}).get("date"))
        label = games.get(day, {}).get("game") if day else None
        season[day] = dict(from_published(report, side, other, label), current=True)
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

    AV, AHIST = snap["file"], snap.get("history")
    old_av, old_hist = load(AV, None), (load(AHIST, None) if AHIST else None)
    try:
        latest, history = build(publish, archive, names, (old_hist or {}).get("reports"))
    except ValueError as e:
        sys.exit("conference availability: %s - leaving files alone" % e)
    if latest is None:
        log("availability: no report for", feed.get("team"), "yet this season - nothing written")
        return

    now = datetime.now(timezone.utc).isoformat()
    stamp = {"schema": 1, "team": args.team, "capability": "availability", "tier": "official",
             "sourceUrl": off.get("availabilityReportIndex"), "sourceLabel": off.get("availabilityReportLabel"),
             "pdf": None, "parser": PARSER, "fetchedAt": now}
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
