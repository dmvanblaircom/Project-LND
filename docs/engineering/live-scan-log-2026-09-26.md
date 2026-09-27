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
| 1 | 19:09Z | Warn | Home hero | A ranked team's name is cut with an ellipsis: "#3 NOTRE D…" at 390 (Purdue fits). The Game header's rule is never an ellipsis - it swaps both sides to the abbreviation when either won't fit. Home should follow the same rule. | **Fixed** - PR #18, merged after the final; production verified (suite-2026-09-26m) |
| 2 | 19:09Z | Idea | Game - Last play | The most-read live card shows ESPN's raw play text: "(05:49) Shotgun #13 C.Carr rush left for 1 yard gain to the PUR00 TOUCHDOWN, clock 05:47 #35 S.Porath kick attempt good (H: #39 J.Scaife, LS: #96 J.Vinci)". Already a post-launch item (safe play text); live use says raise its priority. | **Fixed** - PR #18, merged after the final; production verified (suite-2026-09-26m) |
| 3 | 19:09Z | Idea | Game - Drive Tracker | After a score the card still reads "Notre Dame drive" with the drive's summary but not how it ended. Showing the result ("Touchdown", "Punt") on a finished drive would make the moment between possessions read right. | **Fixed** - PR #18, merged after the final; production verified (suite-2026-09-26m) |
| 4 | 19:09Z | Idea | Game - Scoring plays | ESPN's scoring text keeps its shouting: "(S. Porath KICK)". Same family as #2. | **Fixed** - PR #18, merged after the final; production verified (suite-2026-09-26m) |
| 5 | 19:30Z | Warn | Game - Stats tab and the Game stats card on the main Game view | Reported by David live (OSU vs Illinois, then ND at Purdue): once the header scrolls away, the stats cards are two columns of numbers with no team names - you can't tell whose is whose. Both cards come from the same renderer (suite/game.js statRows), so one fix covers both. Screen readers get no names either. Proposed: a header row in the card with each team's abbreviation (in its colour), kept in view while the card scrolls. | **Fixed** - PR #16, merged at halftime; production verified 19:56Z (suite-2026-09-26k) |
| 6 | 19:47Z | Warn | Game header at halftime | The Game header reads "2ND · 0:00" while Home reads "HALF" for the same payload (ESPN status "Halftime"). The Game header should say Halftime too. | **Fixed** - PR #19; production verified (suite-2026-09-26n) |
| 7 | 19:47Z | Warn | Home and Game - down & distance pill at halftime | "2nd & 10 · PUR 28" still shows at halftime - ESPN keeps the last situation, but no one has the ball. Hide the down & distance pill while the game is paused between periods, as the football already is. | **Fixed** - PR #19; production verified (suite-2026-09-26n) |
| 8 | 20:23Z | Idea | Game header at 320 | The down & distance pill wraps "2nd / & / 10" over three lines at 320 (one line at 390). Readable, but cramped; "2nd & 10" could be kept on one line (non-breaking) with the yard line under it. | **Fixed** - PR #19; production verified (suite-2026-09-26n) |
| 9 | 21:17Z | Idea | Game header records | The Game header writes records "4 - 0" / "1 - 3" (spaced) while Home, Top 25 and the schedule write "4-0". One format everywhere. | **Fixed** - PR #19; production verified (suite-2026-09-26n) |
| 10 | 21:34Z | Idea | Top 25 - Games, evening | Games list in kickoff order, so by the evening five finals fill the first screen and every live game (Oklahoma-Georgia, Wisconsin-Penn State, ...) is below the fold. Live games first (then upcoming, then finals), or finals collapsed, would put what is happening now on top. The fan's own game keeps its highlight wherever it sits. | **Fixed** - PR #19; production verified (suite-2026-09-26n) |
| 11 | 00:15Z | Idea | Top 25 / Game - last play after a PAT | Right after an extra point, ESPN's last play is only the conversion: "(C. Talty KICK)" (South Carolina-Alabama). A bare, shouted fragment. #4's case rule could cover it where the play's own type says Extra Point Good; or show the scoring play it belongs to. | Open |
| 12 | 00:51Z | Idea | Possession football during a timeout (Top 25, Home, Game) | ESPN names no side with the ball while a timeout is the last play (40 of 40 today), so the football disappears for the length of every timeout (Texas A&M-LSU, "Timeout LSU, clock 06:27"). The timeout play itself doesn't say who has the ball, but the app polls: it could keep the last side it knew across a timeout. | Open |

## Approved fix list (after the ND game)

David, ~7:55 PM ET: #6-#10 approved ("Approved on 6-10. Build them").

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

### 21:17Z (5:17 PM ET) - FINAL: Notre Dame 49, Purdue 10

- **Automated checks: clean.** Home shows FINAL 49-10 with the Game Recap button and updated records (ND 4-0, Purdue 1-3); Game opens on the Box Score with Plays and Stats; no football, no drive card, no live dot.
- The Home hero at final has room for "#3 NOTRE DAME" in full (#1 is a live-layout issue).
- New item: #9 (record format differs in the Game header).
- **The approved post-game fixes (#1-#4) start now.**

### 21:34Z (5:34 PM ET) - ND final 49-10; evening games live

- **Automated checks: clean** on every screen. Home, Game (Box Score first), Top 25 and Schedule all show the 49-10 final and the new records (ND 4-0, Purdue 1-3).
- Top 25: six live games (Oklahoma-Georgia, Ole Miss-Florida, Utah-Iowa State, Iowa-Michigan, Houston-Georgia Southern, Wisconsin-Penn State) with scores and clocks matching the scoreboard.
- Fixes #1-#4: built and committed on fix/post-game-sep26; full suite running.
- New item: #10 (live games below the fold on Top 25 in the evening).

### Post-game fixes shipped

- PR #18 (#1-#4) merged to main 037bcee; production verified (verify-production.yml, success). Tested on today's real captures, now committed as espn-summary-pur-downs.json and espn-summary-pur-final.json.
- Left as ESPN wrote it, by the no-free-text-rewrite rule: formation words ("No Huddle-Shotgun"), the embedded "clock 05:47", holder and long-snapper credits "(H: ..., LS: ...)".

### 21:52Z (5:52 PM ET) - evening games; scans now on main 037bcee (fixes #1-#4)

- **Automated checks: clean** on every screen at 390 and Game at 320, on production's code with the post-game fixes. Home final card reads "#3 NOTRE DAME 4-0" / "PURDUE 1-3" in full.
- Top 25: Oklahoma-Georgia, Ole Miss-Florida (half), Utah-Iowa State, Iowa-Michigan, Houston-Georgia Southern, Wisconsin-Penn State live; scores match the scoreboard.
- New items: none.

### 22:11Z (6:11 PM ET) - evening games

- **Automated checks: clean.** Schedule row for Purdue reads "W 49-10"; Home keeps the final card with Game Recap.
- Top 25: six live (Oklahoma 31-6 Georgia 3rd, Ole Miss-Florida, Utah-Iowa State, Iowa-Michigan 4th, Houston-Georgia Southern, Wisconsin-Penn State 2nd); five final; six still to kick off (Miami 6:30 through SMU 9:00). Scores match the scoreboard.
- New items: none.

### 22:28Z (6:28 PM ET) - evening games

- **Automated checks: clean.** Home's news has turned over to post-game coverage ("Notre Dame puts it on EASY MODE with a 49-10 win over Purdue", One Foot Down, 1 hour ago).
- Top 25: Oklahoma 38-6 (4th), Ole Miss-Florida, Utah-Iowa State, Iowa-Michigan (4th), Houston-Georgia Southern, Wisconsin-Penn State (2nd) live; scores match.
- New items: none.

### 22:46Z (6:46 PM ET) - evening games

- **Automated checks: clean.** Seven ranked games live (Central Michigan-Miami kicked off; Wisconsin-Penn State at the half); five final; scores match the scoreboard.
- New items: none.

### 23:03Z (7:03 PM ET) - evening games

- **Automated checks: clean.** Oklahoma-Georgia and Iowa-Michigan went final since the last scan; five ranked games live (Ole Miss-Florida, Utah-Iowa State, Houston-Georgia Southern in the 4th; Wisconsin-Penn State 3rd; Central Michigan-Miami 1st). Scores match the scoreboard.
- New items: none.

### 23:21Z (7:21 PM ET) - evening games

- **Automated checks: clean.** Utah-Iowa State final; live: Ole Miss-Florida (4th), Houston-Georgia Southern (end of 4th), Wisconsin-Penn State (3rd), Central Michigan-Miami (2nd), South Carolina-Alabama (1st). Scores match.
- New items: none.

### 23:39Z (7:39 PM ET) - evening games

- **Automated checks: clean.** Ole Miss-Florida and Houston-Georgia Southern final (ten ranked finals today). Live: Wisconsin-Penn State (4th), Central Michigan-Miami (2nd), South Carolina-Alabama (1st), Oregon-USC (1st). Texas A&M-LSU still "Scheduled" in ESPN's feed nine minutes past its 7:30 kickoff - the app shows ESPN's state, which is right.
- New items: none.

### 23:57Z (7:57 PM ET) - evening games

- **Automated checks: clean.** Six ranked games live (Wisconsin-Penn State 4th; Central Michigan-Miami, South Carolina-Alabama 2nd; Texas A&M-LSU, Oregon-USC, Missouri-Mississippi State 1st); ten final; SMU at 9:00. Scores match.
- #6-#10 approved by David; fix branch built, full suite running.
- New items: none.

### #6-#10 shipped

- PR #19 merged to main 0136177; production verified (verify-production.yml, success). #9's root cause: the Game header's state class at final (gh-final) was also the FINAL label's class, so the label's letter-spacing covered the whole header.

### 00:15Z (8:15 PM ET) - evening games; scans on main 0136177 (#6-#10 live)

- **Automated checks: clean.** Top 25 now opens on the six live games (#10 working in production): Wisconsin-Penn State 4th, Central Michigan-Miami at the half ("Halftime"), South Carolina-Alabama, Oregon-USC 2nd, Texas A&M-LSU, Missouri-Mississippi State 1st. Scores match.
- The scan script's newest-capture pick sorted "0015" before "2356" after midnight UTC; fixed to use the newest committed capture.
- New item: #11 (a PAT's last play is a bare "(C. Talty KICK)").

### 00:33Z (8:33 PM ET) - evening games

- **Automated checks: clean.** Wisconsin-Penn State final (eleven ranked finals). Live: Central Michigan-Miami (half), South Carolina-Alabama, Texas A&M-LSU, Oregon-USC (2nd), Missouri-Mississippi State (1st). Scores match.
- Top 25 possession football (David's request) built as PR #20; data check for the gaps: across today's captures ESPN names no side with the ball between a score and the next snap (after a PAT 42 of 42, after a kickoff 18 of 18). Whether to infer the kicking/receiving team there is David's call.
- New items: none.

### 00:51Z (8:51 PM ET) - evening games; Top 25 football live (PR #20)

- **Automated checks: clean.** Top 25's possession football is working in production (Miami, with the ball at the Central Michigan 1). South Carolina-Alabama at the half: no football, as intended. Scores match.
- Between-plays possession (David: "someone has to kick off") built on feat/ball-between-plays; full suite running.
- New item: #12 (the football disappears during every timeout).

### 01:09Z (9:09 PM ET) - evening games; between-plays possession live (PR #21)

- **Automated checks: clean.** Between-plays possession working in production: LSU's touchdown at 1:54 of the 2nd leaves the football on LSU, which kicks off next; Miami keeps it at the end of the 3rd (ESPN names Miami). Five ranked games live; scores match.
- New items: none.

### 01:27Z (9:27 PM ET) - evening games

- **Automated checks: clean.** Six ranked games live (Missouri State-SMU kicked off; Texas A&M-LSU and Oregon-USC at the half); eleven final. Scores match.
- New items: none.
