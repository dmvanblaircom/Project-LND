"""Temporary (2026-10-29): run the news producer for each changed team into /tmp and show what it kept per source."""
import json, subprocess, sys, collections
TEAMS = sys.argv[1:] or open("tools/media_teams.txt").read().split()
for t in TEAMS:
    print("=" * 20, t)
    r = subprocess.run([sys.executable, "tools/producers/beat_news.py", "--team", t, "--out", "/tmp/%s.json" % t], capture_output=True, text=True)
    print(r.stdout[-3500:], r.stderr[-800:])
    try:
        items = json.load(open("/tmp/%s.json" % t))["items"]
    except Exception as e:
        print("no output", e); continue
    by = collections.defaultdict(list)
    for i in items: by[i["source"]].append(i)
    for s, its in by.items():
        print("  KEPT %s: %d, newest %s" % (s, len(its), its[0].get("published")))
        for i in its[:6]: print("     . %s | %s" % (i["title"][:90], i["link"][:110]))
# rerun 2
