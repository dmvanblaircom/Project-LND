#!/usr/bin/env python3
"""Pull a team's beat-writer RSS into its beat-news snapshot.

    python3 tools/producers/beat_news.py --team notre-dame

The feeds are the team's declaration (TEAM_CONFIG.sources.beatFeeds), not a
list in the workflow. When a declared feed stops answering - sites move them
- the producer looks for the feed on the site itself (the page's
<link rel="alternate"> and the usual paths), uses what it finds for this run,
and says so as a workflow warning naming the URL to put in the config. A
source that cannot be found is skipped and named; the others still publish.

The file is the team's declaration too (snapshots.beatNews.file, in
data/<team id>/), stamped with the team it belongs to. It is written only when
the stories changed: a fresh timestamp on an identical list made every run
look like news and commit it.
"""
import argparse
import json
import os
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
from urllib.parse import urljoin

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import teamconfig  # noqa: E402

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36")
KEEP = 60
PER_SOURCE = 15     # no one outlet fills the list (David, 2026-09-24)
COMMON_PATHS = ("feed/", "feed", "rss", "rss/", "rss.xml", "feed.xml", "index.xml", "rss/current.xml", "atom.xml")
ATOM = "{http://www.w3.org/2005/Atom}"
FEED_TYPES = ("application/rss+xml", "application/atom+xml", "application/xml", "text/xml")


# ---- pure: text in, data out (tools/newscheck.py tests these) -------------

def when(s):
    if not s:
        return None
    try:
        return parsedate_to_datetime(s).astimezone(timezone.utc)
    except (TypeError, ValueError):
        pass
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00")).astimezone(timezone.utc)
    except ValueError:
        return None


def _text(node):
    return (node.text or "").strip() if node is not None else ""


# An ampersand that does not start an entity. Real feeds ship headlines like
# "Q&A" unescaped; every feed reader tolerates it, and a strict parser would
# drop the whole source over one character.
BARE_AMP = re.compile(rb"&(?!#\d+;|#x[0-9a-fA-F]+;|[A-Za-z][A-Za-z0-9]*;)")


def parse_feed(raw, source):
    """RSS 2.0 or Atom bytes -> stories. Raises ValueError if it is not a feed."""
    try:
        root = ET.fromstring(raw)
    except ET.ParseError:
        try:
            root = ET.fromstring(BARE_AMP.sub(b"&amp;", raw))
        except ET.ParseError as e:
            raise ValueError("not XML: %s" % e)
    if root.tag not in ("rss", ATOM + "feed", "{http://www.w3.org/1999/02/22-rdf-syntax-ns#}RDF"):
        raise ValueError("XML, but not a feed (<%s>)" % root.tag)
    items = []
    for it in root.iter("item"):
        t, link = _text(it.find("title")), _text(it.find("link"))
        d = when(_text(it.find("pubDate")))
        if t and link:
            items.append({"title": t, "link": link, "source": source,
                          "summary": _text(it.find("description"))[:600],
                          "published": d.isoformat() if d else None})
    for en in root.iter(ATOM + "entry"):
        t = _text(en.find(ATOM + "title"))
        ln = en.find(ATOM + "link")
        link = ln.get("href") if ln is not None else ""
        d = when(_text(en.find(ATOM + "updated")) or _text(en.find(ATOM + "published")))
        if t and link:
            items.append({"title": t, "link": link, "source": source,
                          "summary": (_text(en.find(ATOM + "summary")) or _text(en.find(ATOM + "content")))[:600],
                          "published": d.isoformat() if d else None})
    return items


class _Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.found = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "link" and "alternate" in (a.get("rel") or "").lower().split() \
                and (a.get("type") or "").lower() in FEED_TYPES and a.get("href"):
            self.found.append(a["href"])


def discover(html, base):
    """A site's home page -> candidate feed URLs, declared ones first."""
    p = _Links()
    try:
        p.feed(html)
    except Exception:                                   # noqa: BLE001 - a broken page still yields what it parsed
        pass
    out = []
    for u in [urljoin(base, h) for h in p.found] + [urljoin(base, c) for c in COMMON_PATHS]:
        if u not in out:
            out.append(u)
    return out


def merge(items, keep=KEEP, per_source=PER_SOURCE):
    """Newest first, one story per headline, at most `per_source` from any
    one outlet, capped at `keep`. Without the per-source cap the busiest
    outlet filled half the list and a smaller one vanished entirely."""
    items = sorted(items, key=lambda x: x["published"] or "", reverse=True)
    seen, out, count = set(), [], {}
    for it in items:
        k = re.sub(r"\W+", "", it["title"].lower())[:70]
        if k in seen or count.get(it["source"], 0) >= per_source:
            continue
        seen.add(k)
        count[it["source"]] = count.get(it["source"], 0) + 1
        out.append(it)
        if len(out) == keep:
            break
    return out


# ---- network ------------------------------------------------------------

def fetch(url):
    """-> (bytes, the URL it ended at after redirects)."""
    req = urllib.request.Request(url, headers={"user-agent": UA,
                                               "accept": "application/rss+xml, application/atom+xml, text/xml, */*"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read(), r.geturl()


def get(url):
    return fetch(url)[0]


def read_source(src):
    """-> (items, url that worked, note). Raises if nothing works."""
    try:
        return parse_feed(get(src["feed"]), src["name"]), src["feed"], None
    except Exception as first:                          # noqa: BLE001
        failed = str(first)[:90]
    site = src.get("site")
    if not site:
        raise RuntimeError(failed)
    try:
        page, landed = fetch(site)
    except Exception as e:                              # noqa: BLE001
        raise RuntimeError("%s; site unreachable too (%s)" % (failed, str(e)[:60]))
    # A site that moved redirects its home page: look for the feed where it
    # landed, and say where that is.
    candidates = discover(page.decode("utf-8", "replace"), landed)
    if landed.rstrip("/") != site.rstrip("/"):
        failed += "; %s now redirects to %s" % (site, landed)
        site = landed
    for url in candidates:
        if url == src["feed"]:
            continue
        try:
            items = parse_feed(get(url), src["name"])
        except Exception:                               # noqa: BLE001
            continue
        if items:
            return items, url, failed
    raise RuntimeError("%s; no working feed found on %s" % (failed, site))


def probe(sites):
    """Try candidate sources without writing anything: for each site (or feed
    URL), whether a feed works, where, how many stories, how recent, and a few
    headlines to judge whether it is really about the team. Run by
    .github/workflows/probe-feeds.yml, which has the open network this
    development environment lacks."""
    for site in sites:
        src = {"name": site, "feed": site, "site": site}
        try:
            got, url, _ = read_source(src)
        except Exception as e:                          # noqa: BLE001
            print("NO FEED  %s\n         %s\n" % (site, str(e)[:200]))
            continue
        dated = sorted((i["published"] for i in got if i["published"]), reverse=True)
        print("FEED     %s\n         %s | %d stories | newest %s" % (site, url, len(got), dated[0] if dated else "undated"))
        for i in got[:5]:
            print("           - " + i["title"][:110])
        print("")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--team")
    ap.add_argument("--out", help="write here instead of the team's declared file (tests)")
    ap.add_argument("--probe", nargs="+", metavar="SITE", help="try candidate sites or feed URLs; writes nothing")
    args = ap.parse_args()
    if args.probe:
        probe(args.probe)
        return
    if not args.team:
        ap.error("--team is required unless probing")

    config = teamconfig.load(args.team)
    feeds = (config.get("sources") or {}).get("beatFeeds") or []
    snap = teamconfig.snapshot(config, "beatNews")
    if not feeds or not (snap or args.out):
        print("  %s declares no beat feeds or no beat-news snapshot" % args.team)
        return
    out = args.out or teamconfig.path(snap["file"])
    items, moved, dead = [], [], []
    for src in feeds:
        try:
            got, url, note = read_source(src)
        except Exception as e:                          # noqa: BLE001
            print("  SKIP %s: %s" % (src["name"], e))
            dead.append(src["name"])
            continue
        if note:
            moved.append(src["name"])
            print("::warning::%s: declared feed failed (%s); found %s - put it in teams/%s.js"
                  % (src["name"], note, url, args.team))
        print("  %s: %d items%s" % (src["name"], len(got), "" if not note else " (from " + url + ")"))
        items += got
    if dead:
        print("::warning::no feed found for %s" % ", ".join(dead))

    keep = merge(items)
    if not keep:
        sys.exit("no feed returned anything - leaving the old %s alone" % out)
    try:
        old = json.load(open(out, encoding="utf-8"))
    except (OSError, ValueError):
        old = {}
    if old.get("items") == keep and old.get("team") == args.team:
        print("  news unchanged (%d items); %s not touched" % (len(keep), out))
        return
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump({"team": args.team, "updated": datetime.now(timezone.utc).isoformat(), "items": keep}, f, indent=1)
    print("  wrote %s with %d items from %d sources" % (out, len(keep), len({i["source"] for i in keep})))


if __name__ == "__main__":
    main()
