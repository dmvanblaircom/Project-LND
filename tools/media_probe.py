"""Temporary (2026-10-29): every fan site On3 lists, slug and name. Names only."""
import re, urllib.request, html, gzip
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
def get(u):
    req = urllib.request.Request(u, headers={"User-Agent": UA, "Accept": "text/html,application/xml;q=0.9,*/*;q=0.8", "Accept-Language": "en-US,en;q=0.9"})
    with urllib.request.urlopen(req, timeout=40) as r:
        b = r.read()
        if b[:2] == b"\x1f\x8b": b = gzip.decompress(b)
        return r.geturl(), b.decode("utf-8", "replace")
for u in ("https://www.on3.com/teams/", "https://www.on3.com/sites/", "https://www.on3.com/sitemap.xml",
          "https://www.on3.com/sitemap_index.xml", "https://www.on3.com/robots.txt"):
    try:
        final, h = get(u)
    except Exception as e:
        print(u, "error", e); continue
    print("==", u, "->", final, len(h))
    if u.endswith("robots.txt") or "sitemap" in u:
        for l in re.findall(r"https://www\.on3\.com/[^\s<]*sitemap[^\s<]*", h)[:80]: print("MAP", l)
    slugs = sorted(set(re.findall(r'/sites/([a-z0-9-]+)/', h)))
    print("slugs", len(slugs))
    for s in slugs: print("SITE", s)
    # names near slugs in embedded JSON
    for m in re.finditer(r'"(?:name|title|siteName|fullName)":"([^"]{3,60})"[^{}]{0,300}?"(?:slug|url|siteSlug)":"(?:https://www\.on3\.com)?/?(?:sites/)?([a-z0-9-]+)', h):
        print("PAIR", m.group(2), "|", html.unescape(m.group(1)))
