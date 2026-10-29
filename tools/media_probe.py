"""Temporary (2026-10-29): every fan site On3 lists, slug and name. Names only."""
import re, urllib.request, html
def get(u):
    req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=40) as r:
        return r.read().decode("utf-8", "replace")
for u in ("https://www.on3.com/teams/", "https://www.on3.com/teams/?page=2"):
    try:
        h = get(u)
    except Exception as e:
        print(u, "error", e); continue
    seen = {}
    for m in re.finditer(r'href="(?:https://www\.on3\.com)?/sites/([a-z0-9-]+)/"[^>]*>(.{0,300}?)</a>', h, re.S):
        slug, inner = m.group(1), re.sub(r"<[^>]+>", " ", m.group(2))
        seen.setdefault(slug, " ".join(html.unescape(inner).split())[:80])
    for s in sorted(set(re.findall(r'/sites/([a-z0-9-]+)/', h))):
        seen.setdefault(s, "")
    print(u, len(seen))
    for s, n in sorted(seen.items()):
        print("SITE", s, "|", n)
    # the page's own JSON (Next.js) often carries every site
    for s in sorted(set(re.findall(r'"slug":"([a-z0-9-]+)"', h)))[:400]:
        print("SLUG", s)
