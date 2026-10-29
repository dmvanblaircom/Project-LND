"""Temporary (2026-10-29): where On3's directory points for a few fan sites, and a few candidate feeds."""
import re, urllib.request, gzip
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
def get(u):
    req = urllib.request.Request(u, headers={"User-Agent": UA, "Accept": "text/html,application/xml;q=0.9,*/*;q=0.8", "Accept-Language": "en-US,en;q=0.9"})
    with urllib.request.urlopen(req, timeout=40) as r:
        b = r.read()
        if b[:2] == b"\x1f\x8b": b = gzip.decompress(b)
        return r.geturl(), b.decode("utf-8", "replace")
_, h = get("https://www.on3.com/teams/")
for name in ("AuburnSports", "Fresno State", "Hawaii", "UNLV", "Wyoming", "Cincinnati", "Air Force", "Nevada", "James Madison", "Liberty", "Charlotte", "Toledo", "Fan Sites"):
    for m in list(re.finditer(re.escape('"' + name + '"'), h))[:2]:
        print("CTX", name, "|", h[max(0, m.start() - 250): m.end() + 250].replace("\n", " "))
# every distinct href domain/path prefix
for d in sorted(set(re.findall(r'https?://([a-z0-9.-]+\.(?:com|net))/', h))): print("DOMAIN", d)
