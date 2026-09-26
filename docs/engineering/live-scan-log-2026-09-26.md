# Live scan log - Saturday 2026-09-26

David, 2026-09-26: "Scan the app every 15 minutes today for errors and
opportunities for improvement. Don't just change things - log them."

Each scan captures real ESPN payloads on GitHub's runner (the scoreboard,
Notre Dame's schedule, the polls, and the live game summaries), runs the real
app from `main` against them with the clock fixed at the capture time
(`tools/qa/livescan.js`), and checks Home, Game (four views, 390 and 320),
Top 25 (Games and Rankings), Schedule and Roster for errors, broken text,
overflow, score/clock agreement with the scoreboard, and the possession
football and drive colour. Screenshots are reviewed for improvement ideas.

**Nothing here is changed without David's go-ahead.** Severity: **Error** -
wrong or broken for a fan now; **Warn** - likely wrong or fragile;
**Idea** - an opportunity, not a defect.

## Open items (rolled up)

| # | First seen | Severity | Where | What | Status |
|---|---|---|---|---|---|
| 1 | 19:09Z | Warn | Home hero | A ranked team's name is cut with an ellipsis: "#3 NOTRE D…" at 390 (Purdue fits). The Game header's rule is never an ellipsis - it swaps both sides to the abbreviation when either won't fit. Home should follow the same rule. | **Approved by David - fix after the ND game** |
| 2 | 19:09Z | Idea | Game - Last play | The most-read live card shows ESPN's raw play text: "(05:49) Shotgun #13 C.Carr rush left for 1 yard gain to the PUR00 TOUCHDOWN, clock 05:47 #35 S.Porath kick attempt good (H: #39 J.Scaife, LS: #96 J.Vinci)". Already a post-launch item (safe play text); live use says raise its priority. | **Approved by David - fix after the ND game** |
| 3 | 19:09Z | Idea | Game - Drive Tracker | After a score the card still reads "Notre Dame drive" with the drive's summary but not how it ended. Showing the result ("Touchdown", "Punt") on a finished drive would make the moment between possessions read right. | **Approved by David - fix after the ND game** |
| 4 | 19:09Z | Idea | Game - Scoring plays | ESPN's scoring text keeps its shouting: "(S. Porath KICK)". Same family as #2. | **Approved by David - fix after the ND game** |
| 5 | 19:30Z | Warn | Game - Stats tab and the Game stats card on the main Game view | Reported by David live (OSU vs Illinois, then ND at Purdue): once the header scrolls away, the stats cards are two columns of numbers with no team names - you can't tell whose is whose. Both cards come from the same renderer (suite/game.js statRows), so one fix covers both. Screen readers get no names either. Proposed: a header row in the card with each team's abbreviation (in its colour), kept in view while the card scrolls. | **Fixed** - PR #16, merged at halftime; production verified 19:56Z (suite-2026-09-26k) |
| 6 | 19:47Z | Warn | Game header at halftime | The Game header reads "2ND · 0:00" while Home reads "HALF" for the same payload (ESPN status "Halftime"). The Game header should say Halftime too. | Open |
| 7 | 19:47Z | Warn | Home and Game - down & distance pill at halftime | "2nd & 10 · PUR 28" still shows at halftime - ESPN keeps the last situation, but no one has the ball. Hide the down & distance pill while the game is paused between periods, as the football already is. | Open |
| 8 | 20:23Z | Idea | Game header at 320 | The down & distance pill wraps "2nd / & / 10" over three lines at 320 (one line at 390). Readable, but cramped; "2nd & 10" could be kept on one line (non-breaking) with the yard line under it. | Open |

## Approved fix list (after the ND game)

David, 2026-09-26 ~3:15 PM ET: items #1-#4 approved, to be fixed once Notre Dame at Purdue is final - one PR, the full suite, merged and verified in production like today's fixes. #2 and #4 (play text) keep the standing rule: normalize only what structured fields support safely; no free-text rewrite that could change what a play says.

David, ~3:35 PM ET: #5 added to the same list; at ~3:40 PM ET (halftime) he asked for #5 now rather than after the game - PR #16 - a team header row (each team's abbreviation, in its colour) on the Stats tab's Team stats card and the Game view's Game stats card, kept in view while the card scrolls.

## Scans

### 19:09Z (3:09 PM ET) - ND 21, Purdue 0, 2nd 5:47

- **Automated checks: clean.** No page or console errors, no broken text, no overflow, no duplicate ids on Home, Game (Drive Tracker at 390 and 320, Box Score, Plays), Top 25 (Games, Rankings), Schedule, Roster.
- Score and clock agree with the scoreboard on Home, Game and the schedule row (21-0, 2nd 5:47). Drive Tracker titled "Notre Dame drive" for ND's scoring drive. No side has the ball between the score and the kickoff, and no football shows - correct.
- Top 25 Rankings: AP Week 4, updated Sep 20 (this week's poll comes Sunday); the CFP note shows. Correct.
- New items: #1-#4 above.

### 19:28Z (3:28 PM ET) - ND 28, Purdue 0, 2nd 0:45

- **Automated checks: clean** on every screen at 390 and Game at 320.
- Score and clock agree with the scoreboard (28-0, 2nd 0:45). ND has the ball, 1st & Goal at the PUR 3: Drive Tracker titled "Notre Dame drive" (46 yards, 5 plays), football on Notre Dame's side of the header. Correct.
- Top 25: Texas-Tennessee, Illinois-Ohio State, Wake Forest-Louisville live with scores and clocks matching the scoreboard.
- New item: #5 (David, live).

### 19:47Z (3:47 PM ET) - Halftime, ND 35, Purdue 0

- **Automated checks: clean** on every screen at 390 and Game at 320. Score agrees with the scoreboard; no football shows (no side has the ball) - correct.
- Drive Tracker shows Purdue's last drive (the kneel to end the half); Last play "End of 2nd quarter." Fine; the finished-drive result (#3) would help here too.
- New items: #6 (Game header says "2ND · 0:00" where Home says "HALF"), #7 (down & distance pill stays up at halftime).
- #5 fix in flight at David's request (PR #16).

### 20:06Z (4:06 PM ET) - ND 35, Purdue 0, 3rd 9:48

- Scans now run on production's code (scan/sep26 took main 2a8977d, with #5).
- **Automated checks: clean.** Score, clock and possession (ND, football on our side) agree with the scoreboard.
- Live case for #3: Purdue turned it over on downs at the ND 4. The header already says ND 1st & 10 at the ND 4, but the Drive Tracker still reads "Purdue drive" (10 plays, 27 yards) with no result, until ND's first snap starts a new drive. The finished-drive result (#3) covers it: "Purdue drive - Turnover on downs".
- New items: none.

### 20:23Z (4:23 PM ET) - ND 35, Purdue 3, 3rd 1:45

- Scans now run on main 4563d59 (Share Suite live).
- **Automated checks: clean.** Score, clock and possession (ND, football on our side) agree; Drive Tracker "Notre Dame drive", 5 plays, 41 yards. Top 25 shows ND-Purdue live with the right score; Texas, Ohio State, Texas Tech and Wake Forest finals correct.
- New item: #8 (down & distance pill wraps to three lines at 320).

### 20:40Z (4:40 PM ET) - ND 42, Purdue 3, 4th 12:04

- **Automated checks: clean.** Score, clock and possession (Purdue; football on their side, Drive Tracker "Purdue drive" in Purdue's colour) agree with the scoreboard.
- Scoring plays: ND's defensive touchdown (fumble return, 28-0) is credited to ND - correct. The shouting "(S. Porath KICK)" persists on every TD (#4).
- New items: none.

### 20:58Z (4:58 PM ET) - ND 49, Purdue 3, 4th 4:05

- **Automated checks: clean.** Score and clock agree on Home, Game, Top 25 and the schedule row ("Live · 49-3"). After ND's touchdown no side has the ball: no football and no down & distance pill - correct.
- The touchdown's last-play text is the longest raw ESPN string yet (five lines at 390, ending "(H: #39 J.Scaife, LS: #96 J.Vinci)") - more weight for #2.
- New items: none.
