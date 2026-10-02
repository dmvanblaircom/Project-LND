#!/usr/bin/env python3
"""Can the production runner reach a candidate data source, and what is there?

    python3 tools/probe_sources.py tools/probe-urls.txt

Feasibility only (W07, issue #29). For each URL it prints the HTTP status,
final URL, content type and size; for JSON the top-level keys and the length
of the first list it finds; for HTML the page title, the number of table
rows, and whether subscriber or bot-challenge markers appear. It stores and
commits nothing: an article's text is never kept.
"""
import json
import re
import sys
import urllib.error
import urllib.request

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
MARKERS = ["ESPN+", "espn-plus", "Subscribe", "subscriber", "paywall", "captcha", "cf-challenge", "Access Denied"]


def first_list(o, path="$", depth=0):
    if isinstance(o, list):
        return path, len(o)
    if isinstance(o, dict) and depth < 4:
        for k, v in o.items():
            r = first_list(v, path + "." + k, depth + 1)
            if r:
                return r
    return None


def probe(url):
    print("== " + url)
    try:
        req = urllib.request.Request(url, headers={"user-agent": UA, "accept": "*/*"})
        with urllib.request.urlopen(req, timeout=30) as r:
            body, code, final, ctype = r.read(), r.status, r.geturl(), r.headers.get("content-type", "")
    except urllib.error.HTTPError as e:
        print("  HTTP %s" % e.code)
        return
    except Exception as e:  # noqa: BLE001 - a probe reports every failure
        print("  failed: %s" % e)
        return
    print("  HTTP %s, %s, %d bytes%s" % (code, ctype.split(";")[0], len(body), "" if final == url else ", now at " + final))
    text = body.decode("utf-8", "replace")
    if "json" in ctype or text.lstrip().startswith(("{", "[")):
        try:
            d = json.loads(text)
        except ValueError:
            print("  not valid JSON")
            return
        print("  keys: %s" % (list(d)[:12] if isinstance(d, dict) else "list"))
        fl = first_list(d)
        if fl:
            print("  first list: %s (%d items)" % fl)
        for k in ("season", "lastUpdated", "updated", "date"):
            if isinstance(d, dict) and k in d:
                print("  %s: %s" % (k, json.dumps(d[k])[:120]))
        return
    title = re.search(r"<title[^>]*>(.*?)</title>", text, re.S | re.I)
    print("  title: %s" % (title.group(1).strip()[:140] if title else "-"))
    print("  table rows: %d" % len(re.findall(r"<tr[\s>]", text, re.I)))
    found = [m for m in MARKERS if m.lower() in text.lower()]
    print("  markers: %s" % (", ".join(found) or "none"))
    dates = re.findall(r'"(?:dateModified|datePublished|lastModified)"\s*:\s*"([^"]+)"', text)
    if dates:
        print("  dates: %s" % ", ".join(sorted(set(dates))[:4]))
    # Where a page points for the documents a source would be built on
    # (W20: availability reports, depth charts): the links only, never text.
    links = []
    for m in re.finditer(r'<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', text, re.S | re.I):
        href, label = m.group(1), re.sub(r"<[^>]+>|\s+", " ", m.group(2)).strip()
        if re.search(r"availab|depth|injur|two.deep|game.notes", href + " " + label, re.I) and href not in [x[0] for x in links]:
            links.append((href, label[:60]))
    for href, label in links[:15]:
        print("  link: %s  [%s]" % (href[:160], label))
    pdfs = sorted(set(re.findall(r'["\'(]((?:https?:)?[^"\'()\s]*\.pdf[^"\'()\s]*)', text, re.I)))
    if pdfs:
        print("  pdfs: %d" % len(pdfs))
        for p in [x for x in pdfs if re.search(r"report|availab", x, re.I)][:10] or pdfs[:4]:
            print("    %s" % p[:200])


def main():
    for line in open(sys.argv[1], encoding="utf-8"):
        line = line.strip()
        if line and not line.startswith("#"):
            probe(line)


if __name__ == "__main__":
    main()
