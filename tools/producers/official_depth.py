#!/usr/bin/env python3
"""Fetch a team's official two-deep and availability report, and write them.

This is the network half; tools/producers/twodeep.py is the parsing half and
is where the rules live (and what tools/depthcheck.py tests). Run by the
data-refresh workflow:

    python3 tools/producers/official_depth.py --team notre-dame --season 2026

It reads the team's declaration in teams/<team>.js (sources.official) - the
producer owns no URL of its own - and writes four files:

    snapshots.depth.file           the latest chart
    snapshots.depth.history        every chart this season, with week-over-week changes
    snapshots.availability.file    the latest availability report
    snapshots.availability.history every report this season

(the team's declared files, in data/<team id>/)

Two behaviours the previous inline version lacked, both about not hammering
a school's site or the repository:

  * It downloads only what it has not already parsed. A document whose URL
    is already in the history is reused; only the current week's documents
    are checked every run, and even then the large game-notes PDF is fetched
    only if its storage URL has changed.
  * It writes a file only when its content changed. The previous version
    stamped a fresh time on every run, so every run looked like new data.

If the current week's chart cannot be parsed, it changes nothing and exits
non-zero: the last good files stay in place and the failure is loud.
"""
import argparse
import io
import json
import os
import re
import sys
import urllib.request
from datetime import datetime, timezone
from urllib.parse import urljoin

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, HERE)
import teamconfig  # noqa: E402
import twodeep  # noqa: E402

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36")
MIN_PLAYERS = 25            # fewer than this is not a two-deep; refuse it


def log(*a):
    print("  " + " ".join(str(x) for x in a), flush=True)


def declared(config, name):
    m = re.search(r"\b" + re.escape(name) + r'\s*:\s*"([^"]+)"', config)
    if not m:
        sys.exit("TEAM_CONFIG has no %s declaration" % name)
    return m.group(1)


def request(url):
    return urllib.request.Request(url, headers={"user-agent": UA})


def fetch(url, limit=None):
    with urllib.request.urlopen(request(url), timeout=40) as r:
        ctype = r.headers.get_content_type()
        return r.read(limit) if limit else r.read(), r.geturl(), ctype


def chart_links(index_url, season):
    """The season's rows from the official media index: game, depth chart,
    and game notes (which carry the availability report)."""
    from bs4 import BeautifulSoup
    html, _, _ = fetch(index_url)
    soup = BeautifulSoup(html.decode("utf-8", "replace"), "html.parser")
    year = next((h for h in soup.find_all(["h2", "h3"]) if h.get_text(" ", strip=True) == str(season)), None)
    if year is None:
        sys.exit("%s section not found at %s" % (season, index_url))
    table = year.find_next("table")
    if table is None:
        sys.exit("%s media table not found at %s" % (season, index_url))
    out = []
    for tr in table.find_all("tr"):
        cells = tr.find_all(["th", "td"])
        if len(cells) < 3:
            continue
        depth = cells[1].find("a", href=True)
        notes = cells[2].find("a", href=True)
        if not depth:
            continue
        out.append({"game": cells[0].get_text(" ", strip=True),
                    "depth": urljoin(index_url, depth["href"]),
                    "notes": urljoin(index_url, notes["href"]) if notes else None})
    return out


def pdf_url(doc_url):
    """Where the PDF behind an official document link really lives, without
    downloading the PDF. The site's .pdf links are often HTML wrapper pages
    whose Download control points at the file; trust the content type, not
    the extension."""
    from bs4 import BeautifulSoup
    with urllib.request.urlopen(request(doc_url), timeout=40) as r:
        if r.headers.get_content_type() == "application/pdf":
            return r.geturl()
        html = r.read(2_000_000).decode("utf-8", "replace")
        final = r.geturl()
    soup = BeautifulSoup(html, "html.parser")
    link = next((a["href"] for a in soup.find_all("a", href=True)
                 if "download" in a.get_text(" ", strip=True).lower() and
                 (a["href"].lower().endswith(".pdf") or "storage.googleapis.com" in a["href"])), None)
    if not link:
        raise ValueError("no Download link on official document page %s" % doc_url)
    return urljoin(final, link)


def pdf_text(url):
    from pypdf import PdfReader
    data, final, _ = fetch(url)
    if data[:5] != b"%PDF-":
        raise ValueError("not a PDF: %s" % final)
    return "\n".join((p.extract_text() or "") for p in PdfReader(io.BytesIO(data)).pages)


def load(path, empty):
    try:
        with open(os.path.join(ROOT, path), encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return empty


TIMES = ("fetchedAt", "updated")


def _strip(x):
    if isinstance(x, dict):
        return {k: _strip(v) for k, v in x.items() if k not in TIMES}
    if isinstance(x, list):
        return [_strip(v) for v in x]
    return x


def same(a, b):
    """Equal apart from fetch times, at any depth. A time stamped on every
    run would make every run look like new data and commit it - so a file's
    times record when that VERSION was first seen, and change only with it."""
    return json.dumps(_strip(a), sort_keys=True) == json.dumps(_strip(b), sort_keys=True)


def write_if_changed(path, data, previous):
    if previous and same(data, previous):
        return False
    os.makedirs(os.path.dirname(os.path.join(ROOT, path)), exist_ok=True)
    with open(os.path.join(ROOT, path), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=1, ensure_ascii=False)
        f.write("\n")
    return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--team", required=True)
    ap.add_argument("--season", required=True)
    args = ap.parse_args()

    config = open(os.path.join(ROOT, "teams", args.team + ".js"), encoding="utf-8").read()
    index = declared(config, "depthChartIndex")
    label = declared(config, "depthChartLabel")
    av_label = declared(config, "availabilityReportLabel")
    now = datetime.now(timezone.utc).isoformat()

    snaps = teamconfig.load(args.team)
    dsnap, asnap = teamconfig.snapshot(snaps, "depth"), teamconfig.snapshot(snaps, "availability")
    if not dsnap or not dsnap.get("history"):
        sys.exit("teams/%s.js declares no depth-chart snapshot with a history" % args.team)
    DEPTH, DHIST = dsnap["file"], dsnap["history"]
    AV, AHIST = (asnap["file"], asnap.get("history")) if asnap else (None, None)
    old_depth = load(DEPTH, None)
    old_dhist = load(DHIST, {"snapshots": []})
    old_av = load(AV, None) if AV else None
    old_ahist = load(AHIST, {"reports": []}) if AHIST else {"reports": []}
    known_charts = {s.get("sourceUrl"): s for s in old_dhist.get("snapshots", []) if s.get("schema") == 2}
    known_reports = {r.get("pdf"): r for r in old_ahist.get("reports", []) if r.get("schema") == 1}

    rows = chart_links(index, args.season)
    if not rows:
        sys.exit("no %s rows at %s - leaving files alone" % (args.season, index))

    charts, reports = [], []
    for i, row in enumerate(rows):
        latest = i == len(rows) - 1
        log("official depth:", row["game"])

        # ---- the chart. Past weeks never change: reuse them outright. ----
        chart = known_charts.get(row["depth"])
        if chart is None or latest:
            try:
                parsed = twodeep.parse_two_deep(pdf_text(pdf_url(row["depth"])))
                n = twodeep.count_players(parsed["units"])
                if n < MIN_PLAYERS:
                    raise ValueError("only %d players read" % n)
                chart = {"schema": 2, "team": args.team, "capability": "depth", "tier": "official",
                         "sourceUrl": row["depth"], "sourceLabel": label,
                         "title": parsed["title"] or ("Depth chart - " + row["game"]),
                         "game": row["game"], "fetchedAt": now,
                         "units": parsed["units"], "battles": twodeep.battles(parsed["units"])}
            except Exception as e:                       # noqa: BLE001
                if latest:
                    sys.exit("current chart (%s) failed: %s - leaving files alone" % (row["game"], e))
                log("  skip:", str(e)[:140])
                continue
        charts.append(chart)

        # ---- the availability report, from that week's game notes ----
        if not row["notes"]:
            reports.append({"schema": 1, "team": args.team, "capability": "availability", "tier": "official",
                            "game": row["game"], "sourceUrl": None, "sourceLabel": av_label, "pdf": None,
                            "reported": False, "effectiveAt": None, "heading": None, "players": [],
                            "fetchedAt": now})
            continue
        try:
            url = pdf_url(row["notes"])
            report = known_reports.get(url)
            if report is None:                           # a new or replaced document
                log("  reading game notes:", url.rsplit("/", 1)[-1])
                parsed = twodeep.parse_availability(pdf_text(url), args.season)
                report = dict({"schema": 1, "team": args.team, "capability": "availability", "tier": "official",
                               "game": row["game"], "sourceUrl": row["notes"], "sourceLabel": av_label,
                               "pdf": url, "fetchedAt": now}, **parsed)
            reports.append(report)
        except Exception as e:                           # noqa: BLE001
            log("  availability skipped:", str(e)[:140])

    for i, c in enumerate(charts):
        c["changes"] = twodeep.diff(c["units"], charts[i - 1]["units"] if i else None)

    latest_chart, latest_report = charts[-1], (reports[-1] if reports else None)
    wrote = []
    if write_if_changed(DEPTH, latest_chart, old_depth):
        wrote.append(DEPTH)
    if write_if_changed(DHIST,
                        {"schema": 2, "team": args.team, "updated": now, "snapshots": charts}, old_dhist):
        wrote.append(DHIST)
    if latest_report is not None and AV:
        if write_if_changed(AV, latest_report, old_av):
            wrote.append(AV)
        if AHIST and write_if_changed(AHIST,
                                      {"schema": 1, "team": args.team, "updated": now, "reports": reports}, old_ahist):
            wrote.append(AHIST)

    log("charts:", len(charts), "| latest:", latest_chart["title"],
        "|", twodeep.count_players(latest_chart["units"]), "players,",
        len([b for b in latest_chart["battles"] if b["level"] == 1]), "open starting jobs")
    if latest_report:
        log("availability:", latest_report.get("heading") or "no report", "|", len(latest_report["players"]), "listed")
    log("wrote:", ", ".join(wrote) if wrote else "nothing - no change")


if __name__ == "__main__":
    main()
