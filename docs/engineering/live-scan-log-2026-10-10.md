# Live scan log - Saturday 2026-10-10

David, 2026-10-07: "a bug scan so we can catch stuff live without me watching
the app constantly" - every 45 minutes from noon to 11:30 PM ET, both teams:
Notre Dame vs Stanford (401858257, 3:30 PM ET) and Ohio State vs Maryland
(401858483, 4:15 PM ET).

Each scan captures real ESPN payloads on GitHub's runner (the day's
scoreboard, both teams' schedules, the polls, each team's game summary once it
has started and up to two other live ranked games), runs the real app from
production `main` against them with the clock fixed at the capture time
(`tools/qa/runscan.sh` -> `tools/qa/livescan.js`), and checks Home, Game (390
and 320, plays, box), Top 25, Schedule, Roster (incl. Availability), Stats,
Outlook and Settings for errors, broken text, overflow, score/clock agreement
with the scoreboard, and the possession football. Screenshots are reviewed by
eye.

**Nothing here is changed without David's go-ahead.** Severity: **Error** -
wrong or broken for a fan now; **Warn** - likely wrong or fragile; **Idea** -
an opportunity, not a defect.

## Open items (rolled up)

| # | First seen | Severity | Where | What | Status |
|---|---|---|---|---|---|
| 1 | 16:02Z | Warn | Top 25 - Games @390, Ohio State's Team Style (Nunito Sans) | The scanner flags "15 Tennessee 4-1": the record is laid out 5.7px past the box of the name line that holds it. On screen it is not clipped and does not touch the column divider - a fan sees nothing wrong (scanner rated it Error; downgraded by eye). Fragile: a longer ranked name could push it into the divider. Proposed: let the name line wrap the record to its own line rather than overflow. | Open |
| 2 | 16:02Z | Warn | Home - schedule preview @390, both teams | Long venue names are cut with an ellipsis on the "time · venue" line: "3:30 PM EDT · Notre Dame Stadium", "7:30 PM EDT · LaVell Edwards Stadium", "Memorial Stadium (Bloomin…", "Los Angeles Memorial Coliseum". Intended truncation, but the venue is the part a fan reads. Proposed: let the venue wrap to a second line. | Open |

## Scans

### 1602Z (12:02 PM ET) - pregame
Both games pregame and agreeing with the scoreboard: Notre Dame 0-0, kickoff
3:30 PM EDT (Game countdown 3h 28m); Ohio State 0-0, 4:15 PM EDT (4h 13m). 17
games with a ranked team on Top 25. Ohio State's new Availability tab (PR #118)
shows Friday's Big Ten Update 2 for Maryland - 4 out, 5 doubtful, 3 probable -
credited to BigTen.org. Findings: #1, #2 (both new, Warn). The Game's Matchup
card reads "Loading the matchup..." in the scan only: pregame summaries are not
captured until kickoff - not an app defect.
