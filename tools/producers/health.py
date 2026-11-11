#!/usr/bin/env python3
"""Which sources are broken, for which teams, and why - told once.

Every producer step in the data refresh records each team it ran for:
    $RUNNER_TEMP/health/ok.tsv        source <TAB> team
    $RUNNER_TEMP/health/failed.tsv    source <TAB> team <TAB> the team's log file
(a league-wide source records the team "league"). This keeps, in the Actions
cache, how many runs in a row each source has failed for each team, and:

  * opens ONE GitHub issue per source once any team's failure has lasted
    STREAK runs in a row (about 90 minutes): one-off blips that clear on the
    next run never reach the owner;
  * keeps that issue's body current - which teams, since when, the reason in
    the producer's own words - without commenting (an edit sends no email);
  * closes it, with a comment, when every team has recovered.

The run itself stays green (David, 2026-11-05: the "Run failed" emails were
constant and said nothing). Each source is already isolated per team: a
failed team keeps its last good files and every other team updates.

    python3 tools/producers/health.py --dir "$RUNNER_TEMP/health" \
        --state .cadence/health.json [--steps "odds=success,fpi=failure"] [--open-issues]
"""
import argparse
import json
import os
import re
import sys
import urllib.request
from datetime import datetime, timezone

STREAK = 3                  # runs in a row before a failure is worth an email
LABEL = "data-source"
MARK = "<!-- source-health:%s -->"

# The names a fan-facing owner reads, by the workflow's source key.
NAMES = {
    "news": "Beat news",
    "depth": "Official depth chart and availability",
    "confav": "Conference injury reports",
    "notes": "Game notes",
    "kalshi": "Odds (Kalshi)",
    "odds": "Odds",
    "oddshistory": "Odds history",
    "fpi": "FPI",
    "rankhistory": "Rankings by week",
    "prospects": "Recruiting and draft",
    "champion": "National champion",
    "seasonstats": "Season figures (turnovers, yards allowed)",
}


# ---- pure: tools/healthcheck.py tests these ------------------------------

def reason_of(text):
    """The last line a failing producer printed, minus Actions' markers:
    sys.exit's message, or an exception's last line."""
    lines = [l.strip() for l in str(text or "").splitlines() if l.strip()]
    for l in reversed(lines):
        if l.startswith("::warning::"):
            continue
        for p in ("::error::", "Error: "):
            if l.startswith(p):
                l = l[len(p):]
        return l[:240]
    return "no message"


def update(state, ok, failed, now):
    """state {"source|team": {since, runs, reason}} -> the new state.
    A failure adds a run (since stays the first); a success clears the key;
    a source not run for a team this time (not due) leaves it as it was."""
    out = {k: dict(v) for k, v in (state or {}).items()}
    for source, team in ok:
        out.pop(source + "|" + team, None)
    for source, team, reason in failed:
        k = source + "|" + team
        prev = out.get(k)
        out[k] = {"since": prev["since"] if prev else now, "runs": (prev["runs"] if prev else 0) + 1,
                  "reason": reason}
    return out


def broken(state):
    """-> {source: [(team, since, runs, reason)]} for failures that have
    lasted STREAK runs in a row, teams in order."""
    out = {}
    for k, v in sorted((state or {}).items()):
        source, team = k.split("|", 1)
        if v.get("runs", 0) >= STREAK:
            out.setdefault(source, []).append((team, v["since"], v["runs"], v.get("reason") or ""))
    return out


def failing(state):
    """Sources with any failure at all, whatever its streak."""
    return {k.split("|", 1)[0] for k in (state or {})}


def league(steps):
    """"name=outcome,..." -> (ok, failed) for league-wide steps. Only success
    and failure count: "skipped" (not run, or not due) leaves a streak as it
    was."""
    ok, failed = [], []
    for pair in filter(None, str(steps or "").split(",")):
        name, _, outcome = pair.partition("=")
        if outcome == "success":
            ok.append((name, "league"))
        elif outcome == "failure":
            failed.append((name, "league", "the step failed - see the run's log"))
    return ok, failed


def title(source, rows):
    name = NAMES.get(source, source)
    teams = [r[0] for r in rows]
    if teams == ["league"]:
        return "%s is not updating" % name
    return "%s not updating for %d team%s" % (name, len(teams), "" if len(teams) == 1 else "s")


def body(source, rows, run_url):
    lines = [MARK % source, "",
             "**%s** has failed %d or more refresh runs in a row (about every 30 minutes). "
             "Each team below keeps its last good data; every other team is updating normally."
             % (NAMES.get(source, source), STREAK), "",
             "| Team | Failing since (UTC) | Runs | Why |", "|---|---|---|---|"]
    for team, since, runs, reason in rows:
        lines.append("| %s | %s | %d | %s |" % (team, since[:16].replace("T", " "), runs,
                                               reason.replace("|", "/")))
    lines += ["", "This issue updates itself while the problem lasts and closes when every team "
              "has recovered." + (" Latest run: %s" % run_url if run_url else "")]
    return "\n".join(lines)


def plan(state, open_issues):
    """-> actions: ("open", source) | ("update", source, number) |
    ("close", source, number). open_issues {source: number}."""
    now_broken, still = broken(state), failing(state)
    acts = []
    for source in sorted(now_broken):
        if source in open_issues:
            acts.append(("update", source, open_issues[source]))
        else:
            acts.append(("open", source))
    for source, number in sorted(open_issues.items()):
        # Closed only when every team has recovered, not merely dropped
        # under the streak: a failure that keeps coming back stays open.
        if source not in still:
            acts.append(("close", source, number))
    return acts


# ---- io --------------------------------------------------------------------

def reason_from(log):
    """A failed team's log file -> its reason; anything else is the reason."""
    try:
        with open(log, encoding="utf-8", errors="replace") as f:
            return reason_of(f.read())
    except OSError:
        return log or "no message"


def read_tsv(path, width):
    try:
        with open(path, encoding="utf-8") as f:
            rows = [l.rstrip("\n").split("\t") for l in f if l.strip()]
    except OSError:
        return []
    return [tuple((r + [""] * width)[:width]) for r in rows]


def github(path, method="GET", data=None):
    req = urllib.request.Request(
        "https://api.github.com/repos/%s%s" % (os.environ["GITHUB_REPOSITORY"], path), method=method,
        data=json.dumps(data).encode() if data is not None else None,
        headers={"authorization": "Bearer " + os.environ["GITHUB_TOKEN"],
                 "accept": "application/vnd.github+json", "x-github-api-version": "2022-11-28"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r) if r.status != 204 else None


# The source an issue is about, read from its own marker - any source, not
# only those NAMES spells out, or a source missing from NAMES opened a new
# issue every run and never closed one (code review, 2026-11-09).
MARK_RE = re.compile(re.escape(MARK).replace(re.escape("%s"), r"([^\s>]+)"))


def sources_in(issues):
    """open issues (GitHub's JSON) -> {source: issue number}."""
    out = {}
    for i in issues or []:
        m = MARK_RE.search(i.get("body") or "")
        if m:
            out[m.group(1)] = i["number"]
    return out


def open_issues():
    return sources_in(github("/issues?state=open&labels=%s&per_page=100" % LABEL))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", required=True)
    ap.add_argument("--state", required=True)
    ap.add_argument("--steps", default="", help="league-wide steps: name=outcome,...")
    ap.add_argument("--open-issues", action="store_true")
    args = ap.parse_args()

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    ok = [(s, t) for s, t in read_tsv(os.path.join(args.dir, "ok.tsv"), 2)]
    failed = [(s, t, reason_from(r)) for s, t, r in read_tsv(os.path.join(args.dir, "failed.tsv"), 3)]
    lok, lfailed = league(args.steps)
    ok += lok
    failed += lfailed
    try:
        state = json.load(open(args.state, encoding="utf-8"))
    except (OSError, ValueError):
        state = {}
    state = update(state, ok, failed, now)
    os.makedirs(os.path.dirname(args.state) or ".", exist_ok=True)
    with open(args.state, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=1, sort_keys=True)

    for s, t, r in failed:
        k = s + "|" + t
        print("  failed: %s / %s (%d in a row): %s" % (NAMES.get(s, s), t, state[k]["runs"], r))
    print("  %d source/team pair(s) ok, %d failing this run" % (len(ok), len(failed)))
    if not args.open_issues:
        return
    run_url = "%s/%s/actions/runs/%s" % (os.environ.get("GITHUB_SERVER_URL", "https://github.com"),
                                        os.environ.get("GITHUB_REPOSITORY", ""), os.environ.get("GITHUB_RUN_ID", ""))
    rows = broken(state)
    try:
        acts = plan(state, open_issues())
    except Exception as e:                           # noqa: BLE001
        print("::warning::source health: GitHub's issues could not be read: %s" % str(e)[:160])
        return
    for act in acts:
        source = act[1]
        if act[0] == "open":
            github("/issues", "POST", {"title": title(source, rows[source]), "body": body(source, rows[source], run_url),
                                        "labels": [LABEL]})
            print("  opened an issue: " + title(source, rows[source]))
        elif act[0] == "update":
            github("/issues/%d" % act[2], "PATCH", {"title": title(source, rows[source]),
                                                    "body": body(source, rows[source], run_url)})
        else:
            github("/issues/%d/comments" % act[2], "POST",
                   {"body": "Recovered: every team is updating again (%s UTC)." % now[:16].replace("T", " ")})
            github("/issues/%d" % act[2], "PATCH", {"state": "closed", "state_reason": "completed"})
            print("  closed issue #%d: %s recovered" % (act[2], NAMES.get(source, source)))


if __name__ == "__main__":
    main()
