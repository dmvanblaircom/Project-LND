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
| 3 | 17:41Z | Warn | Top 25 - Games, live game cards at halftime | The possession football shows during halftime (Indiana, Missouri - the teams that receive to start the second half). Home and the Game header hide the football while play is paused between periods (2026-09-26 log #7). One rule everywhere: hide it on Top 25 at halftime and between quarters too. | Open |
| 4 | 18:30Z | Idea | Top 25 - Games, last-play line | Penalty plays keep ESPN's raw shouting and run three lines: "3:04 A. Simmons pass incomplete short middle to C. Lee thrown to A&M40 PENALTY A&M Pass Interference 10 yards from A&M50 to A&M40. NO PLAY". The safe play-text rule (2026-09-26 #2/#4) could lower-case PENALTY / NO PLAY and shorten penalty plays to the penalty ("Penalty: A&M pass interference, 10 yards - no play"). | Open |

## Scans

### 1602Z (12:02 PM ET) - pregame
Both games pregame and agreeing with the scoreboard: Notre Dame 0-0, kickoff
3:30 PM EDT (Game countdown 3h 28m); Ohio State 0-0, 4:15 PM EDT (4h 13m). 17
games with a ranked team on Top 25. Ohio State's new Availability tab (PR #118)
shows Friday's Big Ten Update 2 for Maryland - 4 out, 5 doubtful, 3 probable -
credited to BigTen.org. Findings: #1, #2 (both new, Warn). The Game's Matchup
card reads "Loading the matchup..." in the scan only: pregame summaries are not
captured until kickoff - not an app defect.

### 1652Z (12:52 PM ET) - pregame; noon games live
Both teams still pregame (Notre Dame 3:30, Ohio State 4:15 PM EDT), agreeing
with the scoreboard. Top 25 now carries five live games and reads them right:
Indiana at Nebraska between quarters shows "15:00 - 2nd" with "End of 1st
quarter." (the PR #117 rule, first time live), scores, clocks, possession and
last plays match the scoreboard. No new findings; #1 and #2 seen again.

### 1741Z (1:41 PM ET) - pregame; noon games at halftime
Both teams still pregame and agreeing with the scoreboard. Four ranked noon
games at halftime all read "Halftime" on Top 25 with ESPN's "gets the ball to
start the second half" line; South Carolina-Florida live in the 2nd. New: #3
(Warn). #1 and #2 seen again.

### 1830Z (2:30 PM ET) - pregame; noon games in the 3rd
Both teams still pregame, agreeing with the scoreboard. The between-quarters
rule held on two live games: UCF-Oklahoma St and North Carolina-Pitt read
"15:00 - 4th" with "End of 3rd quarter." - for North Carolina-Pitt ESPN's own
status line still said "15:00 - 3rd" while its last play was the end of the
3rd, and the app's reading (from the play) is the right one. New: #4 (Idea).
#1-#3 seen again.
