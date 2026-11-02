"""Temporary (2026-11-02): read-only. The structure of ND's media page now."""
import re, sys
sys.path.insert(0, "tools/producers")
from official_depth import fetch
from bs4 import BeautifulSoup
html, final, ctype = fetch("https://fightingirish.com/news/2022/08/29/ndfbmedia")
soup = BeautifulSoup(html.decode("utf-8", "replace"), "html.parser")
for h in soup.find_all(re.compile(r"^h[1-6]$")):
    print("HEAD", h.name, repr(h.get_text(" ", strip=True)[:90]), "classes", h.get("class"))
for el in soup.find_all(string=re.compile(r"^\s*20(26|25)\s*$")):
    p = el.parent
    print("YEARTEXT", p.name, p.get("class"), "parents:", [x.name for x in p.parents][:6])
tables = soup.find_all("table")
print("TABLES", len(tables))
for i, t in enumerate(tables[:3]):
    prev = t.find_previous(re.compile(r"^(h[1-6]|strong|p|button|summary)$"))
    print("TABLE", i, "prev:", prev.name if prev else None, repr(prev.get_text(" ", strip=True)[:60]) if prev else "")
    for tr in t.find_all("tr")[:12]:
        cells = tr.find_all(["th", "td"])
        print("  ROW", [c.get_text(" ", strip=True)[:40] for c in cells], [a["href"][:70] for a in tr.find_all("a", href=True)])
