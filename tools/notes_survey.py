#!/usr/bin/env python3
"""What do other schools' game notes look like to the reader we have?

    python3 tools/notes_survey.py [--teams a,b,c] [--kind index]

For each team whose config links a game-notes page (links.gameNotes), from
the production runner's network (F4: readers for every school's notes):

  1. the page: its status, and the links on it that look like game notes;
  2. the newest of them: resolved to its PDF, downloaded, its text read;
  3. that text through tools/producers/gamenotes.py as it stands: how many
     roster rows, pronunciations, captains, honors, glance bullets and By
     the Numbers items it finds, and whether the reading is usable;
  4. the document's own section headings (its short ALL-CAPS lines), so
     layouts can be grouped into families; or, with --sample, the first few
     lines of each section the app shows (pronunciations, By the Numbers,
     the last time, the series, captains, the roster), to write a reader.

A school's page often links its opponents' notes, the conference's and old
seasons' beside its own: only this season's links whose label names the
team, or names no one, are taken as its own.

Prints counts, link labels, headings and those few sample lines - never a
whole document - and stores and commits nothing. Names no team: the list comes from the configs.
"""
import argparse
import html
import os
import re
import sys
import traceback
from collections import Counter
from urllib.parse import urljoin

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "producers"))
import teamconfig  # noqa: E402
import gamenotes  # noqa: E402
from official_depth import fetch, pdf_text, pdf_url  # noqa: E402

DOC_DATE = re.compile(r"/(?:documents|sports|news)/(\d{4})/(\d{1,2})/(\d{1,2})/")
ANCHOR = re.compile(r'<a\b[^>]*\bhref="([^"]+)"[^>]*>(.*?)</a>', re.S | re.I)
RAW_PDF = re.compile(r'https?:\\?/\\?/[^"\'\s<>]+?\.pdf', re.I)
HEADING = re.compile(r"^[A-Z0-9][A-Z0-9 &'’./:,()-]{3,48}$")


def registry():
    """{team id: (name, short, abbr, nick)} from teams/index.js."""
    text = open(os.path.join(HERE, "..", "teams", "index.js"), encoding="utf-8").read()
    return {m[0]: m[1:] for m in re.findall(
        r'id:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*short:\s*"([^"]*)".*?abbr:\s*"([^"]*)",\s*nick:\s*"([^"]*)"', text)}


OTHER = re.compile(r"\b(?:opp(?:onent)?\.?|postgame|post-game|quotes|depth|acc|sec|big ten|big 12|cusa|aac|mac|sun belt|mountain west|conference)\b", re.I)


def own(label, who):
    """Whether a link's label is the team's own notes: it names the team, or
    names no one ("Game Notes", "Notes", "Week 3")."""
    low = label.lower()
    if OTHER.search(low):
        return False
    if any(w and re.search(r"\b" + re.escape(w.lower()) + r"\b", low) for w in who):
        return True
    return bool(re.fullmatch(r"(?:game |football )?notes(?: \(pdf\))?|(?:week|game) \d+.*|(?:vs\.?|at) .*", low))


def sample(text, start, n, stop=None):
    """Up to n lines after the first line matching `start`."""
    rows = gamenotes.lines_of(text)
    for i, x in enumerate(rows):
        if re.match(start, x):
            out = []
            for y in rows[i + 1:i + 1 + n * 3]:
                if stop and re.match(stop, y):
                    break
                out.append(y[:110])
                if len(out) == n:
                    break
            return out
    return None


def note_links(page, base):
    """Links on the page that look like game notes: [(day or "", label, url)]."""
    out, seen = [], set()
    for href, text in ANCHOR.findall(page):
        label = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", text))).strip()
        href = html.unescape(href)
        if not re.search(r"notes", label + " " + href, re.I):
            continue
        if not (re.search(r"\.pdf(?:$|\?)", href, re.I) or "/documents/" in href):
            continue
        url = urljoin(base, href)
        if url in seen:
            continue
        seen.add(url)
        m = DOC_DATE.search(url)
        day = "%s-%02d-%02d" % (m.group(1), int(m.group(2)), int(m.group(3))) if m else ""
        out.append((day, label[:60], url))
    return out


def raw_pdfs(page):
    """PDF addresses anywhere in the page source (a script-rendered page
    carries them in its data, not in anchors)."""
    return sorted({u.replace("\\/", "/") for u in RAW_PDF.findall(page) if re.search(r"note", u, re.I)})


def pick(links):
    """The newest: by the date in its address when it has one, else the last
    listed (a season page adds each game below the one before)."""
    dated = sorted([x for x in links if x[0]], reverse=True)
    return dated[0] if dated else (links[-1] if links else None)


def headings(text):
    c = Counter()
    for line in gamenotes.lines_of(text):
        if HEADING.match(line) and not re.fullmatch(r"[\d ./:,()-]+", line) and len(line.split()) <= 6:
            c[line] += 1
    return c


def survey(team):
    cfg = teamconfig.load(team)
    link = ((cfg.get("links") or {}).get("gameNotes") or {})
    url, kind = link.get("url"), link.get("kind")
    row = {"team": team, "kind": kind, "page": url}
    if not url:
        row["error"] = "no links.gameNotes"
        return row
    data, final, ctype = fetch(url, 3_000_000)
    page = data.decode("utf-8", "replace")
    links = note_links(page, final)
    row["links"] = len(links)
    row["raw"] = len(raw_pdfs(page))
    who = REG.get(team, ())
    season = [x for x in links if not x[0] or SEASON_FROM <= x[0] <= TODAY]
    mine = [x for x in season if own(x[1], who)]
    labels = Counter(x[1] for x in season)
    row["labels"] = "; ".join("%s x%d%s" % (k, n, "" if own(k, who) else " (not ours)") for k, n in labels.most_common(8))
    row["own"] = "%d of %d this season" % (len(mine), len(season))
    best = pick(mine) or pick(season)
    if not best and row["raw"]:
        best = ("", "(from the page source)", raw_pdfs(page)[-1])
    if not best:
        return row
    row["doc"] = best[2].rsplit("/", 1)[-1][:70]
    row["day"] = best[0]
    pdf = best[2] if re.search(r"\.pdf(?:$|\?)", best[2], re.I) else pdf_url(best[2])
    try:
        text = pdf_text(pdf)
    except ValueError:
        text = pdf_text(pdf_url(best[2]))
    row["chars"] = len(text)
    row["pages"] = text.count("\f") + 1 if "\f" in text else None
    p = gamenotes.parse(text)
    row["read"] = {"roster": len(p["roster"]), "pronounce": len(p["pronounce"]), "captains": len(p["captains"]),
                   "honors": len(p["honors"]), "glance": len(p["glance"]), "numbers": len(p["numbers"]),
                   "unread": len(p["unread"]), "game": bool(p["game"]), "usable": bool(gamenotes.usable(p))}
    head = text[:4000].lower()
    row["names us"] = sum(head.count(w.lower()) for w in who[:2] if w)
    if SAMPLE:
        row["s:pronounce"] = sample(text, r"^PRONUNCIATIONS?(?: GUIDE)?\b", 5)
        row["s:numbers"] = sample(text, r"^(?:BY THE NUMBERS|NUMBERS OF NOTE|THE NUMBERS)\b", 5)
        row["s:lasttime"] = sample(text, r"^(?:THE )?LAST TIME\b", 3)
        row["s:series"] = sample(text, r"^(?:SERIES HISTORY|THE SERIES)\b", 3)
        caps = [x[:120] for x in gamenotes.lines_of(text) if re.search(r"\bcaptains?\b", x, re.I)]
        row["s:captain"] = caps[:3] or None
        rost = [x[:90] for x in gamenotes.lines_of(text) if gamenotes.ROSTER_ROW.match(x)]
        row["s:roster"] = rost[:2] or sample(text, r"^(?:NUMERICAL ROSTER|.*\bROSTER\b.*)$", 3)
    else:
        row["headings"] = headings(text)
    return row


REG, SAMPLE, TODAY, SEASON_FROM = {}, False, "", ""


def main():
    global REG, SAMPLE, TODAY, SEASON_FROM
    ap = argparse.ArgumentParser()
    ap.add_argument("--teams", default="")
    ap.add_argument("--kind", default="index")
    ap.add_argument("--sample", action="store_true", help="print a few lines of each section the app shows, not the headings")
    a = ap.parse_args()
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    TODAY = now.strftime("%Y-%m-%d")
    SEASON_FROM = "%d-07-01" % (now.year if now.month >= 7 else now.year - 1)
    REG, SAMPLE = registry(), a.sample
    teams = [t for t in a.teams.split(",") if t] or teamconfig.teams()
    rows, everywhere = [], Counter()
    for t in teams:
        try:
            cfg_kind = ((teamconfig.load(t).get("links") or {}).get("gameNotes") or {}).get("kind")
            if not a.teams and a.kind and cfg_kind != a.kind:
                continue
            r = survey(t)
        except Exception as e:  # noqa: BLE001 - one school's failure is a finding, not a stop
            r = {"team": t, "error": "%s: %s" % (type(e).__name__, str(e)[:160])}
            traceback.print_exc(limit=1)
        rows.append(r)
        print("\n== %s" % t)
        for k in ("error", "links", "labels", "own", "doc", "day", "chars", "names us", "read",
                  "s:pronounce", "s:numbers", "s:lasttime", "s:series", "s:captain", "s:roster"):
            v = r.get(k)
            if v in (None, ""):
                continue
            if isinstance(v, list):
                print("   %s" % k)
                for line in v:
                    print("      | %s" % line)
            elif k == "read":
                print("   read     " + " ".join("%s=%s" % (a, b) for a, b in v.items()))
            else:
                print("   %-8s %s" % (k, v))
        hs = r.get("headings") or Counter()
        for h in hs:
            everywhere[h] += 1
        if hs:
            print("   headings %s" % "; ".join(h for h, _ in hs.most_common(40)))
    read = [r for r in rows if r.get("read")]
    print("\n==== summary: %d teams, %d with a notes document read, %d usable as the reader stands" %
          (len(rows), len(read), sum(1 for r in read if r["read"]["usable"])))
    for k in ("roster", "pronounce", "captains", "honors", "glance", "numbers"):
        print("   %-10s found for %d" % (k, sum(1 for r in read if r["read"][k])))
    print("   no document found: %s" % ", ".join(r["team"] for r in rows if not r.get("read") and not r.get("error")))
    print("   failed: %s" % ", ".join("%s (%s)" % (r["team"], r["error"][:60]) for r in rows if r.get("error")))
    print("\n==== headings seen at three schools or more")
    for h, n in everywhere.most_common(80):
        if n >= 3:
            print("   %2d  %s" % (n, h))


if __name__ == "__main__":
    main()
