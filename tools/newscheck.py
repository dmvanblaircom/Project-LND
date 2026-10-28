#!/usr/bin/env python3
"""Does the beat-news producer read feeds, and find one that has moved?

Usage:  python3 tools/newscheck.py     (exit 1 on any failure)
"""
import os
import re
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

print("only web links")
evil = RSS.replace(b"</channel>", b"<item><title>Click me</title><link>javascript:alert(1)</link></item>"
                                   b"<item><title>Data</title><link>data:text/html,x</link></item>"
                                   b"<item><title>Relative</title><link>/news/1</link></item></channel>")
ok([i["title"] for i in bn.parse_feed(evil, "Site A")] == ["Depth chart notes"],
   "a javascript:, data: or relative link is dropped - it would be written into an href")
evil_atom = ATOM.replace(b"https://b.example/2", b"javascript:alert(1)")
ok(bn.parse_feed(evil_atom, "Site B") == [], "in Atom too")

print("article thumbnails and publisher logos")
media = RSS.replace(b'<rss version="2.0">', b'<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:content="http://purl.org/rss/1.0/modules/content/">')
media = media.replace(b"<title>X</title>", b"<title>X</title><image><url>https://a.example/logo.png</url></image>")
media = media.replace(b"</pubDate>", b'</pubDate><media:thumbnail url="/photo.jpg"/><content:encoded><![CDATA[<img src="https://a.example/inline.jpg">]]></content:encoded>')
pic = bn.parse_feed(media, "Site A")[0]
ok(pic["image"] == "https://a.example/photo.jpg", "explicit thumbnail wins over inline article imagery and resolves a relative URL")
ok(pic["sourceLogo"] == "https://a.example/logo.png", "RSS channel image is a separate publisher fallback")
ok(bn.parse_feed(media, "Site A", "https://a.example/large-logo.png")[0]["sourceLogo"] == "https://a.example/large-logo.png", "a verified configured logo can replace a tiny feed icon")
inline = RSS.replace(b"</pubDate>", b'</pubDate><description><![CDATA[<img width="1" src="https://a.example/pixel"><img src="data:image/gif,stub" data-src="/article.jpg">]]></description>')
ok(bn.parse_feed(inline, "Site A")[0]["image"] == "https://a.example/article.jpg", "HTML description supplies a lazy-loaded photo, not its tracking pixel")
enclosed = RSS.replace(b"</pubDate>", b'</pubDate><enclosure type="audio/mpeg" url="https://a.example/audio.mp3"/><enclosure type="image/jpeg" url="https://a.example/photo.jpg"/>')
ok(bn.parse_feed(enclosed, "Site A")[0]["image"] == "https://a.example/photo.jpg", "only image enclosures are thumbnails")
atom_pic = ATOM.replace(b'<link href="https://b.example/2"/>', b'<link rel="enclosure" type="image/jpeg" href="https://b.example/photo.jpg"/><link rel="alternate" href="https://b.example/2"/>')
ap = bn.parse_feed(atom_pic, "Site B")[0]
ok(ap["link"] == "https://b.example/2" and ap["image"] == "https://b.example/photo.jpg", "Atom keeps its article URL separate from the image enclosure")
unsafe = RSS.replace(b"</pubDate>", b'</pubDate><description><![CDATA[<img src="javascript:alert(1)"><img src="data:text/html,x">]]></description>')
ok(bn.parse_feed(unsafe, "Site A", "javascript:bad")[0]["image"] is None and bn.parse_feed(unsafe, "Site A", "javascript:bad")[0]["sourceLogo"] is None, "non-web photo and logo URLs are rejected")
ok(rss[0]["image"] is None and rss[0]["sourceLogo"] is None, "a text-only feed still produces a usable story")

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

print("only the team's football (David, 2026-10-20)")
ND = "/teams/notre-dame-fighting-irish/"
def story(title, link, cats=None):
    return {"title": title, "link": link, "source": "S", "published": None, "categories": cats or []}
# Real headlines and addresses from the October 20 snapshots.
drop = [
    story("Notre Dame WBB debuts at No. 13 in AP poll with a killer schedule to test that ranking",
          "https://on3.com/teams/notre-dame-fighting-irish/news/notre-dame-wbb-debuts-no-13-ap-poll-with-a-killer-schedule/"),
    story("Ava Watson: Ohio State women’s basketball 2026-27 player preview",
          "https://www.landgrantholyland.com/ohio-state-womens-basketball/12345/ava-watson-preview"),
    story("Ohio State basketball players reveal reasons behind the number they wear",
          "https://on3.com/teams/ohio-state-buckeyes/news/ohio-state-basketball-players-numbers/"),
    story("Irish open the season Friday", "https://a.example/irish-open-the-season", ["Hockey"]),
    # An outlet's "Football" category does not rescue a title that names
    # another sport: this one reached the Oct 20 refresh that way.
    story("Notre Dame WBB debuts at No. 13 in AP poll with a killer schedule to test that ranking",
          "https://on3.com/teams/notre-dame-fighting-irish/news/notre-dame-wbb-debuts-no-13-ap-poll-with-a-killer-schedule/",
          ["Football", "Notre Dame"]),
]
for it in drop:
    ok(bn.off_topic(it, "college-football") is not None, "another sport is left out: " + it["title"][:60])
keep = [
    story("Block of the Week: Notre Dame vs. BYU", "https://on3.com/teams/notre-dame-fighting-irish/news/block-of-the-week-notre-dame-vs-byu/"),
    story("Notre Dame slides back a bit in both the AP Top 25 and the Coaches Poll",
          "https://www.onefootdown.com/notre-dame-fighting-irish-football/86123/notre-dame-slides-back"),
    story("Four-star two-sport star picks Notre Dame football over basketball offers", "https://a.example/two-sport-commit"),
    story("Irish open the season Friday", "https://a.example/basketball-and-football-weekend", ["Football", "Basketball"]),
    story("Notre Dame's defense is diving into film after BYU", "https://a.example/defense-film"),
    story("Irish back on track after the bye", "https://a.example/back-on-track"),
    story("Irish back on the practice field", "https://a.example/practice", ["Football", "Basketball"]),
]
for it in keep:
    ok(bn.off_topic(it, "college-football") is None, "football stays: " + it["title"][:60])
national = [
    story("Women's College Basketball Rankings: Preseason AP Poll Top 25 released", "https://on3.com/news/womens-college-basketball-rankings-preseason/"),
    story("ESPN shakes up SP+ Top 25 Power Rankings after Week 7 college football slate", "https://on3.com/news/espn-shakes-up-sp-top-25/"),
    story("College Football Rankings: Joel Klatt names Top-10 teams after Week 7", "https://on3.com/news/college-football-rankings-joel-klatt/"),
    story("Intel: Shake-up among the favorites for elite ATH Kamieon Compton-Nero", "https://on3.com/rivals/news/intel-shake-up/"),
]
for it in national:
    ok(bn.off_topic(it, "college-football", [ND]) is not None, "On3 national, outside the team's section, is left out: " + it["title"][:50])
ok(bn.off_topic(keep[0], "college-football", [ND]) is None, "and the team's own On3 story stays")
ok(bn.off_topic(keep[1], "college-football") is None and bn.off_topic(national[1], "college-football") is None,
   "a source without paths is not held to any (only On3 declares them)")
ok(bn.off_topic(drop[0], "some-other-league") is None, "a league without a sport list leaves the sport alone")
bad = story("Irish practice report", "https://[bad")
ok(bn.off_topic(bad, "college-football") is not None and bn.off_topic(bad, "college-football", [ND]) is not None,
   "an address that does not parse is left out, never stops the run (Codex, #146)")
ok(len(bn.keep_football([bad] + keep, "college-football")[0]) == len(keep), "and the rest of the feed still publishes")
kept, dropped = bn.keep_football(drop + keep, "college-football")
ok(len(kept) == len(keep) and len(dropped) == len(drop) and all("categories" not in i for i in kept),
   "keep_football splits them, and categories are not written to the file")
# A student paper's whole sports section (Iowa, 2026-10-27): a professional
# league is another sport, and in a `sportsSection` source a story stays only
# when it says football. Real headlines and addresses from the Daily Iowan
# and the Daily Northwestern.
nhl = story("Point/Counterpoint | Who will win this season\u2019s NHL Playoffs?",
            "https://dailyiowan.com/2026/10/27/point-counterpoint-who-will-win-this-seasons-nhl-playoffs/")
ok(bn.off_topic(nhl, "college-football") is not None, "a professional league is another sport: " + nhl["title"][:50])
alumni = story("Vols in the NFL: Dylan Sampson returns to action", "https://www.utdailybeacon.com/2026/10/27/vols-in-the-nfl/")
ok(bn.off_topic(alumni, "college-football") is None, "but the NFL is football: alumni stories stay")
paper = [
    story("Iowa running back Kamari Moulton out for season with injury",
          "https://dailyiowan.com/2026/10/27/iowa-running-back-kamari-moulton-out-for-season-with-injury/"),
    story("Football: Schaller embraces transition from tight end to starting left tackle",
          "https://dailynorthwestern.com/2026/10/27/sports/football-schaller-embraces-transition/"),
    story("Hawkeyes hold on at Kinnick", "https://dailyiowan.com/2026/10/25/hawkeyes-hold-on/", ["Sports", "Football"]),
]
for it in paper:
    ok(bn.off_topic(it, "college-football", None, True) is None, "a sports section's football stays: " + it["title"][:50])
quiet = [
    story("Hawkeyes sweep weekend series", "https://dailyiowan.com/2026/10/26/hawkeyes-sweep-weekend-series/", ["Sports"]),
    story("Column: What this weekend meant", "https://dailyiowan.com/2026/10/26/column-what-this-weekend-meant/"),
]
for it in quiet:
    ok(bn.off_topic(it, "college-football", None, True) is not None, "a sports section's story that does not say football is left out: " + it["title"][:40])
    ok(bn.off_topic(it, "college-football") is None, "though from a football source it would stay")
print("pictures: full size, and a page's own when the feed sends none (David, 2026-10-28)")
thumb = "https://gobison.com/common/controls/image_handler.aspx?thumb_prefix=rp_system&image_path=/images/2026/10/21/Kelton_McCaslin_20261017_FB_NEV_ZL154.jpg"
ok(bn.full_image(thumb) == "https://gobison.com/images/2026/10/21/Kelton_McCaslin_20261017_FB_NEV_ZL154.jpg?width=800",
   "a Sidearm thumbnail becomes the same picture at 800 pixels")
ok(bn.full_image("https://cdn.example/a.jpg") == "https://cdn.example/a.jpg" and bn.full_image(None) is None, "any other picture is left as it is")
rss = (b'<rss><channel><item><title>Bison Host UTEP</title><link>https://gobison.com/news/1</link>'
       b'<enclosure url="' + thumb.replace("&", "&amp;").encode() + b'" type="image/jpeg"/></item></channel></rss>')
ok(bn.parse_feed(rss, "NDSU Athletics")[0]["image"].endswith("ZL154.jpg?width=800"), "and the feed's reader asks for it")
head = ('<html><head><meta name="twitter:image" content="https://dailyiowan.com/t.jpg">'
        '<meta property="og:image" content="/wp-content/uploads/2026/10/moulton.jpg"></head><body>')
ok(bn.page_image(head, "https://dailyiowan.com/2026/10/27/x/") == "https://dailyiowan.com/wp-content/uploads/2026/10/moulton.jpg",
   "a page's share image is og:image, resolved against the page")
ok(bn.page_image('<meta name="twitter:image" content="https://a.example/t.jpg">', "https://a.example/") == "https://a.example/t.jpg",
   "then twitter:image")
ok(bn.page_image("<p>no head", "https://a.example/") is None and bn.page_image('<meta property="og:image" content="javascript:x">', "") is None,
   "none, or not a web address: no picture")
asked = []
def reader(url):
    asked.append(url)
    if "dead" in url:
        raise OSError("403")
    return '<meta property="og:image" content="https://p.example/%s.jpg">' % url.rsplit("/", 1)[-1]
items = [{"link": "https://p.example/has", "image": "https://p.example/feed.jpg"},
         {"link": "https://p.example/kept"}, {"link": "https://p.example/dead"}] + [{"link": "https://p.example/n%d" % i} for i in range(10)]
read = bn.fill_images(items, [{"link": "https://p.example/kept", "image": "https://p.example/old.jpg"}], reader, limit=4)
ok(items[0]["image"] == "https://p.example/feed.jpg" and "https://p.example/has" not in asked, "a feed's own picture is kept and its page not read")
ok(items[1]["image"] == "https://p.example/old.jpg" and "https://p.example/kept" not in asked, "a story already pictured last run is not read again")
ok(not items[2].get("image") and items[3]["image"] == "https://p.example/n0.jpg", "a page that does not answer leaves its story as it was; the next is read")
ok(read == 4 and len(asked) == 4 and not items[-1].get("image"), "at most four pages a run here (eight in production)")
import teamconfig  # noqa: E402
# Every config: a feed that is a whole sports section (".../category/sports/
# feed/", ".../sports/feed/") is marked so, or it would bring in every sport
# whose headline does not name it, as the Daily Iowan's did.
SECTION = re.compile(r"/(category/)?sports/feed/?$|/section/sports\.xml$", re.I)
loose = []
for f in sorted(os.listdir(os.path.join(HERE, "..", "teams"))):
    if not f.endswith(".js") or f == "index.js":
        continue
    for src in (teamconfig.load(f[:-3]).get("sources") or {}).get("beatFeeds") or []:
        if SECTION.search(src.get("feed") or "") and not src.get("sportsSection"):
            loose.append(f[:-3] + ": " + src["name"])
ok(not loose, "every newspaper's whole sports section is read as one: football only (%s)" % (", ".join(loose) or "none loose"))
for team in ("notre-dame", "ohio-state"):
    conf = teamconfig.load(team)
    lg = bn.league_of(conf)
    ok(lg in bn.OTHER_SPORTS, "%s's league (%s) has a sport list, so the filter is on in the real run" % (team, lg))
    on3 = [f for f in conf["sources"]["beatFeeds"] if "on3.com" in f["feed"]]
    ok(len(on3) == 1 and on3[0].get("paths") == ["/teams/%s/" % on3[0]["feed"].split("/teams/")[1].split("/")[0]],
       "%s's On3 feed keeps only its own team section" % team)
CATS = RSS.replace(b"</pubDate></item>", b"</pubDate><category>Basketball</category><category><![CDATA[WBB]]></category></item>", 1)
ok(bn.parse_feed(CATS, "Site A")[0]["categories"] == ["Basketball", "WBB"], "RSS categories are read")
ACATS = ATOM.replace(b"<updated>", b'<category term="Hockey"/><updated>')
ok(bn.parse_feed(ACATS, "Site B")[0]["categories"] == ["Hockey"], "Atom category terms too")

print("\n" + ("%d check(s) FAILED" % failures if failures else "the producer reads feeds and finds moved ones"))
sys.exit(1 if failures else 0)
