#!/usr/bin/env python3
"""Download the photos a captured news fixture points at, for review renders.

The development environment cannot reach ESPN's image host, so a render of
News there shows every story's fallback tile. GitHub's runner can. This
fetches each of the first N stories' photos through ESPN's own resizer at
400px wide (what a phone draws) and writes a manifest mapping the story's
original image URL to the local file, which the review harnesses serve in
place of the network. Test data only; nothing in the app reads these.

Usage:  python3 tools/capture_images.py fixture.json out_dir [limit]
"""
import hashlib, json, os, sys, urllib.parse, urllib.request

fixture, out = sys.argv[1], sys.argv[2]
limit = int(sys.argv[3]) if len(sys.argv) > 3 else 20
arts = json.load(open(fixture)).get("articles", [])[:limit]
os.makedirs(out, exist_ok=True)
manifest = {}
for a in arts:
    imgs = a.get("images") or []
    url = imgs[0].get("url") if imgs else None
    if not url:
        continue
    path = urllib.parse.urlparse(url).path
    small = "https://a.espncdn.com/combiner/i?img=" + urllib.parse.quote(path) + "&w=400"
    name = hashlib.sha1(url.encode()).hexdigest()[:12] + ".jpg"
    try:
        with urllib.request.urlopen(small, timeout=30) as r, open(os.path.join(out, name), "wb") as f:
            f.write(r.read())
        manifest[url] = name
    except Exception as e:  # one photo missing is fine; the story keeps its fallback
        print("  skipped", url, e)
json.dump(manifest, open(os.path.join(out, "manifest.json"), "w"), indent=1)
print("  %d photos -> %s" % (len(manifest), out))
