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
| 1 | 19:09Z | Warn | Home hero | A ranked team's name is cut with an ellipsis: "#3 NOTRE D…" at 390 (Purdue fits). The Game header's rule is never an ellipsis - it swaps both sides to the abbreviation when either won't fit. Home should follow the same rule. | Open |
| 2 | 19:09Z | Idea | Game - Last play | The most-read live card shows ESPN's raw play text: "(05:49) Shotgun #13 C.Carr rush left for 1 yard gain to the PUR00 TOUCHDOWN, clock 05:47 #35 S.Porath kick attempt good (H: #39 J.Scaife, LS: #96 J.Vinci)". Already a post-launch item (safe play text); live use says raise its priority. | Open (post-launch item) |
| 3 | 19:09Z | Idea | Game - Drive Tracker | After a score the card still reads "Notre Dame drive" with the drive's summary but not how it ended. Showing the result ("Touchdown", "Punt") on a finished drive would make the moment between possessions read right. | Open |
| 4 | 19:09Z | Idea | Game - Scoring plays | ESPN's scoring text keeps its shouting: "(S. Porath KICK)". Same family as #2. | Open (post-launch item) |

## Scans

### 19:09Z (3:09 PM ET) - ND 21, Purdue 0, 2nd 5:47

- **Automated checks: clean.** No page or console errors, no broken text, no overflow, no duplicate ids on Home, Game (Drive Tracker at 390 and 320, Box Score, Plays), Top 25 (Games, Rankings), Schedule, Roster.
- Score and clock agree with the scoreboard on Home, Game and the schedule row (21-0, 2nd 5:47). Drive Tracker titled "Notre Dame drive" for ND's scoring drive. No side has the ball between the score and the kickoff, and no football shows - correct.
- Top 25 Rankings: AP Week 4, updated Sep 20 (this week's poll comes Sunday); the CFP note shows. Correct.
- New items: #1-#4 above.
