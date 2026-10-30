"""Temporary (2026-10-30): the real producers on the teams that failed, on
the fixes, against live data. Writes only in this runner's checkout."""
import subprocess, sys, os
cache = "/tmp/confav"
for t in ("akron", "sacramento-state", "army", "memphis", "tulane", "miami", "ohio-state", "byu"):
    r = subprocess.run([sys.executable, "tools/producers/conference_availability.py", "--team", t, "--cache", cache], capture_output=True, text=True)
    print("AVAIL", t, "exit", r.returncode, "|", (r.stdout + r.stderr).strip().replace("\n", " / ")[:300], flush=True)
for t in ("san-jose-state", "new-mexico"):
    r = subprocess.run([sys.executable, "tools/producers/beat_news.py", "--team", t, "--out", "/tmp/%s-news.json" % t], capture_output=True, text=True)
    print("NEWS", t, "exit", r.returncode, "|", (r.stdout + r.stderr).strip().replace("\n", " / ")[:400], flush=True)
