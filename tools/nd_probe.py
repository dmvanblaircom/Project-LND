"""Temporary (2026-11-02): read-only. The structure of ND's media page now."""
import re, sys
sys.path.insert(0, "tools/producers")
from official_depth import fetch
from bs4 import BeautifulSoup
html, final, ctype = fetch("https://fightingirish.com/news/2022/08/29/ndfbmedia")
print("FINAL", final, ctype, len(html))
soup = BeautifulSoup(html.decode("utf-8", "replace"), "html.parser")
for h in soup.find_all(["h1", "h2", "h3", "h4", "strong"])[:60]:
    print("HEAD", h.name, repr(h.get_text(" ", strip=True)[:90]))
for a in soup.find_all("a", href=True):
    t = a.get_text(" ", strip=True)
    if re.search(r"availab|depth|notes|pdf|document", t + " " + a["href"], re.I):
        print("LINK", repr(t[:70]), a["href"][:150])
txt = soup.get_text("\n", strip=True)
i = txt.find("2026")
print("TEXT2026", repr(txt[max(0, i - 300): i + 1500]))
