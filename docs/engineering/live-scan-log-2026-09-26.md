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
| 5 | 19:30Z | Warn | Game - Stats tab and the Game stats card on the main Game view | Reported by David live (OSU vs Illinois, then ND at Purdue): once the header scrolls away, the stats cards are two columns of numbers with no team names - you can't tell whose is whose. Both cards come from the same renderer (suite/game.js statRows), so one fix covers both. Screen readers get no names either. Proposed: a header row in the card with each team's abbreviation (in its colour), kept in view while the card scrolls. | **Approved by David - fix after the ND game** |

## Approved fix list (after the ND game)

David, 2026-09-26 ~3:15 PM ET: items #1-#4 approved, to be fixed once Notre Dame at Purdue is final - one PR, the full suite, merged and verified in production like today's fixes. #2 and #4 (play text) keep the standing rule: normalize only what structured fields support safely; no free-text rewrite that could change what a play says.

David, ~3:35 PM ET: #5 added to the same list - a team header row (each team's abbreviation, in its colour) on the Stats tab's Team stats card and the Game view's Game stats card, kept in view while the card scrolls.

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
