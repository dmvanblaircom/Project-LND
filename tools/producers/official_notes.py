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
facts. Names no team.
"""
import argparse
import os
import re
import sys
from datetime import datetime, timezone
from urllib.parse import urljoin

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import teamconfig  # noqa: E402
import gamenotes  # noqa: E402
from official_depth import ROOT, declared, fetch, load, log, pdf_text, pdf_url, write_if_changed  # noqa: E402

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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--team", required=True)
    args = ap.parse_args()

    config = open(os.path.join(ROOT, "teams", args.team + ".js"), encoding="utf-8").read()
    index = declared(config, "notesIndex")
    label = declared(config, "notesLink")
    snap = teamconfig.snapshot(teamconfig.load(args.team), "notes")
    if not snap:
        sys.exit("teams/%s.js declares no notes snapshot" % args.team)
    NOTES = snap["file"]
    old = load(NOTES, None)
    now = datetime.now(timezone.utc)

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
