#!/bin/bash
# One live scan (David, 2026-10-07: every 45 minutes on game day, log-only).
#   tools/qa/runscan.sh [YYYYMMDD]     (default: today in Eastern time)
# Syncs this scan branch with production main, asks the capture workflow for
# the day's scoreboard, both teams' schedules, the rankings, each team's game
# summary once it has started and up to two other live ranked games, waits
# for them, then runs tools/qa/livescan.js for Notre Dame and Ohio State and
# prints the findings. Changes no app code.
set -e
S=${SCAN_OUT:-/tmp/claude-0/-home-user-Project-LND/efd0713b-1c36-58dc-8f70-523006cceba7/scratchpad}
BR=$(git rev-parse --abbrev-ref HEAD)
D=${1:-$(TZ=America/New_York date +%Y%m%d)}
git fetch -q origin
git merge -q --ff-only "origin/$BR" 2>/dev/null || true
git merge-base --is-ancestor origin/main HEAD || git merge -q --no-edit origin/main -m "Scan branch: take production main $(git rev-parse --short origin/main)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PVKWhYGhP11JVh9fWHsJmq"
T=$(date -u +%H%M)
LAST=$(ls -t tools/fixtures/espn-scoreboard-scan-*.json 2>/dev/null | head -1)
WANT=$(python3 - "$LAST" <<'PY'
import json,sys
out,other=[],[]
try: j=json.load(open(sys.argv[1]))
except Exception: print(""); sys.exit()
for e in j.get("events",[]):
    c=e["competitions"][0]; st=c["status"]["type"]["state"]
    ids={str(x.get("id") or x["team"]["id"]) for x in c["competitors"]}
    if ids & {"87","194"}:
        if st in ("in","post"): out.append(e["id"]+" scan-"+("nd" if "87" in ids else "osu"))
    elif st=="in" and any((x.get("curatedRank") or {}).get("current",99)<=25 for x in c["competitors"]):
        other.append(e["id"])
for i,x in enumerate(other[:2]): out.append(x+" scan-x%d"%(i+1))
print("\n".join(out))
PY
)
{ echo "scoreboard-$D scan-$T"; echo "schedule-87 scan-nd-$T"; echo "schedule-194 scan-osu-$T"; echo "rankings scan-$T"
  [ -n "$WANT" ] && echo "$WANT" | sed "s/\$/-$T/"; } >> tools/fixtures/capture-requests.txt
git add tools/fixtures/capture-requests.txt
git commit -qm "Scan $T: capture requests

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PVKWhYGhP11JVh9fWHsJmq"
git push -q origin "$BR"
for i in $(seq 1 40); do git fetch -q origin "$BR"; git cat-file -e "origin/$BR:tools/fixtures/espn-scoreboard-scan-$T.json" 2>/dev/null && break; sleep 15; done
git merge -q --ff-only "origin/$BR"
[ -f "tools/fixtures/espn-scoreboard-scan-$T.json" ] || { echo "SCAN $T: the capture never landed"; exit 3; }
for team in notre-dame ohio-state; do
  mkdir -p "$S/scan-$T/$team"
  PW_CHROMIUM=${PW_CHROMIUM:-/opt/pw-browsers/chromium} NODE_PATH=${NODE_PATH:-$(npm root -g)} \
    node tools/qa/livescan.js "$T" "$S/scan-$T/$team" "$team" > "$S/scan-$T/$team/stdout.json" 2> "$S/scan-$T/$team/stderr.txt" || echo "livescan $team exited $?"
done
python3 - "$S/scan-$T" "tools/fixtures/espn-scoreboard-scan-$T.json" <<'PY'
import json,sys,os
d,b=sys.argv[1],json.load(open(sys.argv[2]))
for team in ("notre-dame","ohio-state"):
    f=os.path.join(d,team,"findings.json")
    if not os.path.exists(f): print(team,": NO FINDINGS FILE (see stderr.txt)"); continue
    j=json.load(open(f)); t=j.get("truth") or {}
    print(team, "at", j["capturedAt"], "game:", t.get("detail"), t.get("us"), "-", t.get("them"))
    for x in j["findings"]: print("  ", x["severity"].upper(), x["where"], "-", x["what"])
    if not j["findings"]: print("   no findings")
for e in b["events"]:
    c=e["competitions"][0]
    if any((x.get("curatedRank") or {}).get("current",99)<=25 for x in c["competitors"]):
        print(" ", e["shortName"], c["status"]["type"]["shortDetail"], "-".join(x["score"] for x in c["competitors"]))
PY
echo "screens: $S/scan-$T/<team>/*.png"
