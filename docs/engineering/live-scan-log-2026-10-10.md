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
| 5 | 20:59Z | Warn | Home - live hero @390, Ohio State | The scanner flags "#5 OHIO STATE" (and the Game header's "MD 49" pill) as drawn past their boxes. On screen neither is clipped or overlapping - not fan-visible (scanner rated Error; downgraded by eye). Fragile on Home: "#5 OHIO STATE" ends a few pixels from the clock; a two-digit rank ("#15 OHIO STATE") would touch it. Home should take the Game header's rule: swap both names to the abbreviation when either won't fit. | Open |
| 6 | 20:59Z | Idea | Game - Drive Tracker, Ohio State | A drive in progress reads "3 plays, 24 yards, 0:00": ESPN has not filled in the drive's time yet. A fan reads 0:00 as no time used. Leave the time out until ESPN gives one. | Open |
| 7 | 21:50Z | Warn | Game header at halftime, Ohio State @320 (and the "gets the ball" pill @390/320) | At halftime the header shows "MD gets the ball" (the second-half receiver) and the possession football beside the score. At 320 the football touches the last letter of "HALFTIME". The scanner also rates the pill's text as spilling its box (Error at 390 and 320); by eye it sits inside the pill, tight at 320 - not fan-visible, downgraded. Proposed: give the football its own space beside the status at 320 (or hide it at halftime, as #3 proposes for Top 25). | Open |

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

### 1920Z (3:20 PM ET) - 10 minutes to Notre Dame's kickoff
Both teams pregame and agreeing with the scoreboard; Notre Dame's Game
countdown reads 0 days 0 hours 10 minutes. The noon ranked games are in the
4th quarter and read right on Top 25. No new findings; #1-#4 as before.

### 2008Z (4:08 PM ET) - Notre Dame live, 14-0, 2:24 1st; Ohio State pregame
The first pass showed Notre Dame's Game screen as "Loading the game..." with no
Drive Tracker: a scan gap, not an app defect - the scan asked for a team's game
summary only when the previous scan's scoreboard said the game had started
(19:20Z was pregame). Fixed in the scan script (it now asks once the kickoff
time has passed), Notre Dame's summary captured and the scan re-run: Home, Game
(390, 320, plays, box) agree with the scoreboard - 14-0, 2:24 1st, possession
Stanford - no new findings. Ohio State pregame, kickoff 4:15 PM EDT. The
kickoff and first touchdown alerts went out and were delivered (status probe,
19:51Z).

### 2059Z (4:59 PM ET) - both teams live
Notre Dame 37-0, 3:15 2nd; Ohio State 14-3, 1:37 1st - Home, Game (390, 320,
plays, box) agree with the scoreboard for both, including possession (Stanford,
Maryland) and down & distance. The scan-script fix worked: both live summaries
captured, Notre Dame's Drive Tracker and last play show. New: #5 (Warn - scanner
said Error, not fan-visible), #6 (Idea).

### 2150Z (5:50 PM ET) - Notre Dame in the 3rd, Ohio State at halftime
Notre Dame 44-0, 3:02 3rd; Ohio State 31-10 at halftime - Home and Game agree
with the scoreboard for both. Ohio State's Game header reads "Halftime" with
"MD gets the ball" for the second half; Drive Tracker shows Maryland's
end-of-half drive. New: #7 (Warn - scanner said Error for the pill text, not
fan-visible). Repeats: #2 venues on Home. No Errors a fan would see.

### 2237Z (6:37 PM ET) - Notre Dame in the 4th, Ohio State in the 3rd
Notre Dame 58-7, 3:00 4th; Ohio State 31-10, 6:23 3rd - Home and Game agree
with the scoreboard for both. Repeats: #5 ("#5 OHIO STATE" a few pixels from
the clock on Home, and the "MD 44" ball-spot pill, both rated Error by the
scanner, neither clipped or overlapping by eye) and #2 (venues). The scanner's
"football shown while the scoreboard names no side" on Notre Dame's Game is
not a bug: the summary has Stanford's drive ("1st & 10, STAN 25") before the
scoreboard fills in possession, and the header follows the summary. No new
items. The faster theScore-style alerts (#119) went live at 22:25Z, during
this scan's window.

### 2323Z (7:23 PM ET) - Notre Dame final; Ohio State 2:00 left
Notre Dame Final 58-7: Home shows the final with the record moved to 6-0 and
Game Recap, then Road to 1,000. Ohio State 45-16, 2:00 4th. First scan with
the Settings gear in production (#120, 22:57Z): it sits at the bar's right
edge on both teams' screens, the team name on one line at 390. Repeats: #5
("#5 OHIO STATE" near the clock, scanner Error, not overlapping) and #2. No
new items.

### 0010Z (8:10 PM ET) - both teams final
Notre Dame Final 58-7 (6-0), Ohio State Final 45-16 (5-1): both Homes show
the final with the record moved on and Game Recap. Ohio State's next game
reads "Time TBA" (ESPN has no time yet). Only repeats of #2 (venues). Game
alerts: both finals sent once, all 34 deliveries done (W19, PR #121). No new
items; the evening scans continue on Top 25 and Home until 11:30 PM ET.

### 0057Z (8:57 PM ET) - both teams final; night ranked games live
- Notre Dame Final 58-7 (6-0), Ohio State Final 45-16 (5-1). Home heroes, Game Recap, Top 25, schedule and roster render cleanly at 390 and 320.
- Top 25 live cards: LSU-Kentucky at halftime, Georgia-Alabama, USC-Penn State and Kansas-Utah in the 2nd. The football still shows at halftime (Kentucky): #3, still open.
- Scanner: only the home schedule venue ellipsis (#2). No new items.

### 0144Z (9:44 PM ET) - both teams final; night ranked games live
- Notre Dame and Ohio State finals unchanged. Game @320 (Ohio State): Final hero and Box Score render; the header's "OHIO STATE" wraps to two lines at 320, the rule decision 0034 records.
- Top 25: LSU-Kentucky and USC-Penn State in the 3rd, Kansas-Utah in the 2nd, Georgia-Alabama at halftime with the football on Georgia (#3, still open). Last-play lines and clocks agree with the scoreboard.
- Scanner: only the home schedule venue ellipsis (#2). No new items.
