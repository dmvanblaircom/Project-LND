#!/usr/bin/env python3
"""Does the beat-news producer read feeds, and find one that has moved?

Usage:  python3 tools/newscheck.py     (exit 1 on any failure)
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "producers"))
import beat_news as bn  # noqa: E402

failures = 0


def ok(cond, what):
    global failures
    print(("  ok   " if cond else "  FAIL ") + what)
    if not cond:
        failures += 1


RSS = b"""<?xml version="1.0"?><rss version="2.0"><channel><title>X</title>
<item><title>Depth chart notes</title><link>https://a.example/1</link><pubDate>Tue, 22 Sep 2026 14:00:00 GMT</pubDate></item>
<item><title>No link here</title></item>
</channel></rss>"""
ATOM = b"""<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Y</title>
<entry><title>Purdue preview</title><link href="https://b.example/2"/><updated>2026-09-24T09:30:00Z</updated></entry>
</feed>"""
PAGE = """<html><head><link rel="stylesheet" href="/a.css">
<link rel="alternate" type="application/rss+xml" href="/news/feed.rss">
<link rel="alternate" type="text/html" href="/amp"></head><body>...</body></html>"""

print("feeds")
rss = bn.parse_feed(RSS, "Site A")
ok([(i["title"], i["published"]) for i in rss] == [("Depth chart notes", "2026-09-22T14:00:00+00:00")],
   "RSS: stories with a title and a link, dated in UTC; the linkless one dropped")
atom = bn.parse_feed(ATOM, "Site B")
ok([(i["title"], i["link"]) for i in atom] == [("Purdue preview", "https://b.example/2")], "Atom entries too")
for bad, what in ((b"<html><body>404 Not Found</body></html>", "an HTML error page"), (b"not xml", "garbage")):
    try:
        bn.parse_feed(bad, "Z")
        ok(False, "%s is refused as a feed" % what)
    except ValueError:
        ok(True, "%s is refused as a feed, never read as zero stories" % what)

sloppy = RSS.replace(b"Depth chart notes", b"Q&A: depth chart &amp; notes")
try:
    amp = [i["title"] for i in bn.parse_feed(sloppy, "Site A")]
except ValueError:
    amp = None
ok(amp == ["Q&A: depth chart & notes"],
   "a bare & in a headline is tolerated, as every feed reader does; a real entity is left alone")

print("finding a feed that moved")
found = bn.discover(PAGE, "https://site.example/")
ok(found[0] == "https://site.example/news/feed.rss", "the page's own <link rel=alternate> is tried first")
ok("https://site.example/amp" not in found, "an alternate that is not a feed is ignored")
ok("https://site.example/feed/" in found and "https://site.example/rss" in found, "then the usual paths")
ok(len(found) == len(set(found)), "each candidate once")

print("merging")
dup = dict(rss[0], source="Site C", published="2026-09-21T00:00:00+00:00")
merged = bn.merge(rss + atom + [dup])
ok([i["title"] for i in merged] == ["Purdue preview", "Depth chart notes"], "newest first, one story per headline")
ok(merged[1]["source"] == "Site A", "the newer copy of a duplicate headline is kept")
busy = [dict(rss[0], title="busy %d" % n, source="Busy", published="2026-09-23T%02d:00:00+00:00" % (n % 24))
        for n in range(40)]
quiet = [dict(rss[0], title="quiet %d" % n, source="Quiet", published="2026-09-20T00:00:00+00:00") for n in range(5)]
mixed = bn.merge(busy + quiet)
ok(sum(1 for i in mixed if i["source"] == "Busy") == bn.PER_SOURCE,
   "one outlet contributes at most %d stories, however much it posts" % bn.PER_SOURCE)
ok(sum(1 for i in mixed if i["source"] == "Quiet") == 5, "so a quieter outlet's older stories still make the list")
many = [dict(rss[0], title="s%d-%d" % (s, n), source="S%d" % s) for s in range(6) for n in range(20)]
ok(len(bn.merge(many)) == bn.KEEP, "capped at %d overall" % bn.KEEP)

print("\n" + ("%d check(s) FAILED" % failures if failures else "the producer reads feeds and finds moved ones"))
sys.exit(1 if failures else 0)
