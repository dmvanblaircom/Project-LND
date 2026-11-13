#!/usr/bin/env python3
"""A team's weekly game notes from its official media index, for a team
whose notes are not carried by its depth-chart index (official_depth.py
reads those): pronunciations, captains, honors, the series and By the
Numbers, into the same notes snapshot (David, 2026-10-26: Ohio State's).

    python3 tools/producers/official_notes.py --team ohio-state

The team's config declares where (sources.official):
    notesIndex  the official media page that links each game's notes
    notesLink   the label of the team's own notes link there ("Ohio State Notes")
and the snapshot (snapshots.notes: file, label).

The newest notes document on the index that is not dated in the future is
the week's. It is read only when it is a different document or a new
reading (gamenotes.PARSER); a reading too thin to use keeps last week's
facts.

A team may declare which sections are read (sources.official.notesReads).
["pronounce"] is the reading for any school's layout (F4, batch 1; David,
2026-11-12): only the pronunciation guide, and only names on the provider's
roster (pronunciations.py). A notes page often files the opponent's notes
under the same label, so the three newest of this season are tried, newest
first, and the first that names at least MIN_SAID of our players is the
week's; one that names none of them is remembered and not downloaded again.
Names no team.
"""
import argparse
import os
import re
import sys
from datetime import datetime, timezone
from urllib.parse import urljoin

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import json  # noqa: E402
import teamconfig  # noqa: E402
import gamenotes  # noqa: E402
import pronunciations  # noqa: E402
from official_depth import ROOT, declared, fetch, load, log, pdf_text, pdf_url, write_if_changed  # noqa: E402

SITE = "https://site.api.espn.com/apis/site/v2/sports/football/college-football"
SAY_PARSER = "say-1"     # bumped when pronunciations.py's reading changes
MIN_SAID = 5             # fewer of our players named: not our notes
TRY = 3                  # documents tried, newest first
# a roster shorter than this is an answer that failed, not a team
MIN_ROSTER = 40

DOC_DATE = re.compile(r"/documents/(\d{4})/(\d{1,2})/(\d{1,2})/")


def notes_links(html, base, label):
    """Every document the index links under the team's own notes label,
    newest first, as (date, url)."""
    out = []
    for href, text in re.findall(r'<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', html, re.S | re.I):
        text = re.sub(r"<[^>]+>|\s+", " ", text).strip()
        m = DOC_DATE.search(href)
        if text.lower() == label.lower() and m:
            day = "%s-%02d-%02d" % (m.group(1), int(m.group(2)), int(m.group(3)))
            url = urljoin(base, href.replace("&amp;", "&"))
            if (day, url) not in out:
                out.append((day, url))
    return sorted(out, reverse=True)


def latest(links, today):
    """The week's notes: the newest not dated after today."""
    return next(((d, u) for d, u in links if d <= today), None)


def this_season(links, today):
    """This season's documents, not dated after today, newest first."""
    year = int(today[:4]) if today[5:7] >= "07" else int(today[:4]) - 1
    return [(d, u) for d, u in links if "%d-07-01" % year <= d <= today]


def roster_names(payload):
    """The provider's roster payload -> every player's name, as the app shows it."""
    out = []
    for group in (payload or {}).get("athletes") or []:
        for a in group.get("items") or []:
            name = a.get("displayName") or a.get("fullName")
            if name:
                out.append(name)
    return out


class NoRoster(Exception):
    """The provider's roster came back too short to referee a reading."""


def choose(candidates, old, skipped, read):
    """Which document is the week's, by reading: -> (day, doc, said, unmatched,
    newly skipped) or None when the kept one still stands or none qualifies.
    `read(doc)` gives (said, unmatched) for one document."""
    new = []
    for day, doc in candidates[:TRY]:
        if old and old.get("sourceUrl") == doc and old.get("parser") == SAY_PARSER:
            return ("kept", new)
        if doc in skipped:
            continue
        said, unmatched = read(doc)
        if len(said) >= MIN_SAID:
            return ("read", new, day, doc, said, unmatched)
        new.append(doc)
    return ("none", new)


def say_only(args, cfg, snap, index, label, now):
    """The reading for any school's layout: the pronunciation guide, checked
    against the provider's roster."""
    NOTES = snap["file"]
    old = load(NOTES, None)
    memo = os.path.join(ROOT, ".cadence", "notes-skipped-%s.json" % args.team)
    kept = load(memo, None) or {}
    skipped = set(kept.get("skipped") or []) if kept.get("parser") == SAY_PARSER else set()

    html, final, _ = fetch(index)
    links = this_season(notes_links(html.decode("utf-8", "replace"), final, label), now.strftime("%Y-%m-%d"))
    if not links:
        log("no %r document from this season on %s; keeping what there was" % (label, index))
        return
    team_id = ((cfg.get("sources") or {}).get("espn") or {}).get("teamId")
    pdfs, roster = {}, []

    def read(doc):
        # the roster is asked for only when there is a document to read: on
        # most runs the week's notes are already read and nothing is fetched
        if not roster:
            data, _, _ = fetch("%s/teams/%s/roster?limit=200" % (SITE, team_id))
            roster.extend(roster_names(json.loads(data)))
            if len(roster) < MIN_ROSTER:
                raise NoRoster(len(roster))
        pdfs[doc] = pdf_url(doc)
        return pronunciations.read(pdf_text(pdfs[doc]), roster)

    try:
        got = choose(links, None if args.dry_run else old, set() if args.dry_run else skipped, read)
    except NoRoster as e:
        # without the referee no document can be judged ours or not: nothing
        # is remembered as skipped, and what there was stays
        log("the provider's roster did not answer (%s names); keeping what there was" % e)
        return
    if got[1] and not args.dry_run:
        os.makedirs(os.path.dirname(memo), exist_ok=True)
        with open(memo, "w", encoding="utf-8") as f:
            json.dump({"parser": SAY_PARSER, "skipped": sorted(skipped | set(got[1]))}, f)
    for doc in got[1]:
        log("not our notes (fewer than %d of our players named):" % MIN_SAID, doc.rsplit("/", 1)[-1])
    if got[0] == "kept":
        log("already read; nothing to do")
        return
    if got[0] == "none":
        log("no document of the newest %d names our players; keeping what there was" % TRY)
        return
    _, _, day, doc, said, unmatched = got
    log("notes:", doc.rsplit("/", 1)[-1], day, "- %d names said, %d lines not on the roster" % (len(said), len(unmatched)))
    out = {"schema": 1, "team": args.team, "capability": "notes", "tier": "official",
           "sourceUrl": doc, "sourceLabel": snap.get("label") or label, "pdf": pdfs[doc],
           "parser": SAY_PARSER, "reads": ["pronounce"], "fetchedAt": now.isoformat(), "publishedAt": day,
           "game": None, "pronounce": said, "captains": [], "honors": {}, "glance": [], "numbers": []}
    if args.dry_run:
        print("SNAPSHOT %s %s" % (args.team, json.dumps(out, ensure_ascii=False, sort_keys=True)))
        for line in unmatched[:12]:
            log("not on the roster:", line)
        return
    log("wrote:", NOTES if write_if_changed(NOTES, out, old) else "nothing - no change")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--team", required=True)
    ap.add_argument("--dry-run", action="store_true", help="the pronunciation reading only: print the snapshot, write nothing")
    args = ap.parse_args()

    config = open(os.path.join(ROOT, "teams", args.team + ".js"), encoding="utf-8").read()
    index = declared(config, "notesIndex")
    label = declared(config, "notesLink")
    cfg = teamconfig.load(args.team)
    snap = teamconfig.snapshot(cfg, "notes")
    if not snap:
        sys.exit("teams/%s.js declares no notes snapshot" % args.team)
    now = datetime.now(timezone.utc)
    reads = ((cfg.get("sources") or {}).get("official") or {}).get("notesReads")
    if reads == ["pronounce"]:
        return say_only(args, cfg, snap, index, label, now)
    if reads:
        sys.exit("teams/%s.js: notesReads %r is not a reading this producer has" % (args.team, reads))
    NOTES = snap["file"]
    old = load(NOTES, None)

    html, final, _ = fetch(index)
    links = notes_links(html.decode("utf-8", "replace"), final, label)
    week = latest(links, now.strftime("%Y-%m-%d"))
    if not week:
        log("no %r document on %s; keeping what there was" % (label, index))
        return
    day, doc = week
    log("notes:", doc.rsplit("/", 1)[-1], day)
    if old and old.get("sourceUrl") == doc and old.get("parser") == gamenotes.PARSER:
        log("already read; nothing to do")
        return
    url = pdf_url(doc)
    facts = gamenotes.parse(pdf_text(url))
    for line in facts.pop("unread", []):
        print("::warning::%s game notes: a line not read: %s" % (args.team, line[:120]))
    if not gamenotes.usable(facts):
        log("too little read; keeping last week's facts")
        return
    facts.pop("roster", None)            # read only to match names; the app has ESPN's
    out = dict({"schema": 1, "team": args.team, "capability": "notes", "tier": "official",
                "sourceUrl": doc, "sourceLabel": snap.get("label") or label, "pdf": url,
                "parser": gamenotes.PARSER, "fetchedAt": now.isoformat(), "publishedAt": day}, **facts)
    log("wrote:", NOTES if write_if_changed(NOTES, out, old) else "nothing - no change")


if __name__ == "__main__":
    main()
