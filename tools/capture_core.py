#!/usr/bin/env python3
"""Capture an ESPN core-API list with each item's record, for a test fixture.

    python3 tools/capture_core.py <list url> <out.json> "<comment>" [max items]

ESPN's core API answers a list (a team's recruits, a draft's prospects) with
`$ref` links, one per item. This follows each link and writes the records
inline, so an adapter is built and tested on real records rather than
invented ones (decision 0023):

    {"_comment": ..., "count": <the list's count>, "items": [<record>, ...]}

A record keeps ESPN's structure and every key except `links` (web page
links no screen reads) and `analysis` (ESPN's written scouting copy: the
Suite shows ranks, grades and picks, never ESPN's prose). An item that does
not answer is noted on stderr and skipped. The run fails only if the list
itself does not answer. Runs on GitHub's network (capture-fixture.yml).
"""
import json
import sys
import urllib.request

DROP = {"links", "analysis"}
UA = "Mozilla/5.0 (compatible; ProjectLND-fixtures/1.0)"


def https(url):
    return "https://" + url[len("http://"):] if url.startswith("http://") else url


def get(url):
    req = urllib.request.Request(https(url), headers={"user-agent": UA, "accept": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def trim(o):
    if isinstance(o, dict):
        return {k: trim(v) for k, v in o.items() if k not in DROP}
    if isinstance(o, list):
        return [trim(v) for v in o]
    return o


def main():
    url, out, comment = sys.argv[1], sys.argv[2], sys.argv[3]
    cap = int(sys.argv[4]) if len(sys.argv) > 4 else 100
    page = get(url)
    items = []
    for it in (page.get("items") or [])[:cap]:
        # A bare {"$ref": ...} is a link to the record; anything else is inline.
        if isinstance(it, dict) and set(it) == {"$ref"}:
            try:
                it = get(it["$ref"])
            except Exception as e:  # noqa: BLE001 - one missing record is a finding
                sys.stderr.write("skipped %s: %s\n" % (it["$ref"], e))
                continue
        items.append(trim(it))
    with open(out, "w", encoding="utf-8") as f:
        json.dump({"_comment": comment, "count": page.get("count"), "items": items}, f, indent=1)
        f.write("\n")
    print("  %s: %d of %s items" % (out, len(items), page.get("count")))


if __name__ == "__main__":
    main()
