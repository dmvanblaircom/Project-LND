# Decision: how fresh team data is, and one failing source never costs another

## Status

Accepted

## Date

2026-09-23

## Decision

**Freshness (David, 2026-09-23).** Odds and beat news refresh on every run
of the data-refresh workflow. The official depth chart and availability report
refresh on every run inside a **game window** (18 hours before a kickoff to 6
hours after it), and otherwise every **2 hours**.

- The game window covers Notre Dame's ~60-minute pregame availability update.
  It is a span around the kickoff instant, so it needs no timezone.
- Outside it, the chart is checked when the last successful check is two
  hours old. That time is kept in the Actions cache, not the repository, so
  recording it never makes a commit.
- In doubt, check: an unreadable schedule or no record of a last check means
  the chart is due. A wasted check costs a few small requests; a missed one
  costs a stale injury report.

The rule is `tools/producers/cadence.py`, tested by `tools/cadencecheck.py`
in CI.

**Sources are isolated.** Each producer step in `.github/workflows/odds.yml`
has `continue-on-error`, and the commit step adds only files that a step
which **succeeded** produced. The commit message names what moved
(`Refresh team data: odds, availability`). The run still ends red when any
source failed, after everything that worked is saved, so a broken source
stays visible.

**Nothing is written unless it changed.** `news.json` joins the depth and
availability files: an identical story list no longer gets a fresh
timestamp and a commit.

## Context

On 2026-09-23 (run 100) the official site briefly did not return its 2026
section. The inline depth step exited, and the whole job stopped before its
commit, so the odds fetched a minute earlier were thrown away. Every run
also rewrote `news.json` with a new time, so every run committed.

## Known limit: GitHub's scheduler

The workflow asks for a run twice an hour. GitHub runs scheduled workflows
best-effort. For this repository that has meant a run every **2 to 5 hours**.
On game day, 2026-09-19, runs started at 00:05, 04:29, 08:56, 13:01, 16:20,
18:46, 21:23 and 23:25 UTC.

The rules above are correct for any spacing of runs. But they cannot make
runs happen more often. Until something outside GitHub's scheduler triggers
the workflow (a `workflow_dispatch` on a reliable clock), the real game-day
cadence is whatever GitHub delivers. The Suite must not claim fresher data
than that. Whether to add such a trigger is open for the product owner.

## Related

- `docs/decisions/0019-depth-is-slots-availability-is-its-own.md`
- `tools/producers/cadence.py`, `tools/cadencecheck.py`
