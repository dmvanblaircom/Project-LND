# Game notes: feature inventory

**For:** David (Product Owner). **By:** Claude, 2026-10-07. **Status:** proposal, nothing decided.

David, 2026-10-07: *"that report that is published is an absolute TREASURE TROVE of data and information about ND football. Scan that report and come back to me with a full list of possible features."*

Source read: Notre Dame's official game notes for Game 6 vs Stanford (FightingIrish.com, published Mon Oct 5, 60 pages, [PDF](https://storage.googleapis.com/fightingirish-com/2026/10/05/o7ivmrFxMoPWjqiKc10ZrJpR3Skt3nffwhCFWWib.pdf)). The app already reads two things from this document every week: the depth chart and the availability report (decision 0018). Everything below is the rest of it.

## What's in it

| Pages | Section | Shape |
|---|---|---|
| 1 | Game Day at a Glance, the schedule with TV and times, record and ranking | bullets, list |
| 2 | Media information: Freeman's Monday presser (live on YouTube), Thursday Zoom, the availability-report cadence | prose |
| 3 | Assistant coaches' game-day locations (field or press box); **Inside the Irish: By the Numbers**; university and football facts (all-time record, returning starters) | table, number + note, dotted list |
| 4–6 | Depth chart + availability (already used); **Two-Deep Tidbits**, one note per player | table, bullets |
| 7–8 | Roster with hometown, high school and previous school; **pronunciation guide** | table |
| 9–12 | Head coach file, record vs his predecessors' first seasons, Freeman-era milestone wins, full staff | prose, tables |
| 13–16 | 2026 captains, two-time captains in history, position-group notes, defensive streaks ("held six straight under 100 rushing yards") | bullets |
| 17 | **ND records**, top-5 lists (season rushing yards, attempts, ...) | ranked lists |
| 18 | Special teams under the coordinator (blocked kicks, return TDs) | bullets |
| 19 | NFL Legacy: players whose fathers played in the NFL | list |
| 20 | Opponent notes: series record, record under Freeman, last meeting, the trophy's story, ND vs every ACC school, "From the Archives" | bullets, list |
| 21 | Last Time Out: the previous game's notables | bullets |
| 22–25 | Attendance records at opponents' stadiums; ND in NFL stadiums | tables |
| 23 | Season results with each game's attendance and leading rusher, passer, receiver and tackler | table |
| 26–27 | Honors and award watch lists, per player | list |
| 28 | AP and Coaches polls | table |
| 29 | Irish in the NFL, by NFL team | list |
| 30–34 | Game recaps: scoring summary, by quarter, each scoring play with drive | tables |
| 35–38 | Shields Family Hall (facility and donor features) | prose |
| 39–40 | **Starter history**: 2026 starts, current streak, career starts; game-by-game starters at every position | tables |
| 41–43 | Third/fourth-down conversions by player and game; every 20+ yard play; every scoring drive | tables |
| 44–49 | **"The Last Time..."**: the last time ND (and an opponent) reached each threshold: 300 rushing yards, a 150-yard receiver, a shutout, and so on | threshold lists |
| 50–60 | Official season stats: team, individual, game-by-game, opponents, games played and started | tables (see note 3) |

## Possible features

Effort is relative, not hours. **S** = a list the existing producer can read with a small parser. **M** = a table, or a new screen. **L** = needs live-game logic or a second source.

### A. Game week

| # | Feature | What a fan gets | Pages | Where | Effort |
|---|---|---|---|---|---|
| 1 | **Milestone countdown** | "998 wins. Two from 1,000." Generalizes to any program milestone the notes carry: all-time wins, the coach's 50th win (Freeman is 48-12), a player chasing a record | 3, 9 | Home card in game week | S |
| 2 | **By the Numbers** | The program's own weekly stat nuggets ("15 straight double-digit wins, longest active streak in FBS"), three on Home, all of them on Game's pregame | 3 | Home, Game (pregame) | S–M |
| 3 | **Series history card** | All-time series (25-14-0), record under the current coach, last meeting and score, and the trophy's story (Legends Trophy, Irish crystal and redwood, since 1989). Builds on W21's series names | 1, 20 | Game (pregame), Schedule game | S (or CFBD's matchup API, which we already have, for any team) |
| 4 | **Last Time Out** | Last game's notables in one card until kickoff | 21 | Home after a final | S |
| 5 | **Coach's press conference** | "Freeman's press conference, Monday, live on YouTube" in the week's timeline, and the Thursday Zoom | 2 | Home, News | S |
| 6 | **Assistant coaches' game-day spots** | Who's on the field and who's upstairs | 3 | Game (pregame) | S |
| 7 | **Thursday and pregame availability** | The notes promise a Thursday update and one ~60 minutes before kickoff. We read only Monday's. Adding the other two makes Availability current on game day, and could drive an opt-in alert. Needs the source for those updates, which isn't this PDF | 2 | Roster → Availability | M |

### B. Players

| # | Feature | What a fan gets | Pages | Where | Effort |
|---|---|---|---|---|---|
| 8 | **Pronunciation** | "Boubacar Traore: BOO-bah-car TRAY-or-ree", on the player row and in the depth chart; optionally read aloud by the device | 7–8 | Roster, Depth Chart | S |
| 9 | **Captain badge** | The four captains marked, plus "two-time captain, 28th in program history" | 13 | Roster, Depth Chart | S |
| 10 | **Award watch lists** | A player's honors (Maxwell watch list, preseason All-America teams) on his card | 26–27 | Roster player | S–M |
| 11 | **Player note** | The program's line on each two-deep player ("26 straight games with a catch, matching Claypool's record"), on tap from the depth chart | 5–6, 14–16 | Depth Chart | M |
| 12 | **Starts and streaks** | "32 career starts, 17 straight" per player; the game-by-game starting lineup | 39–40, 59–60 | Roster player, Depth Chart | M |
| 13 | **Hometown, high school, previous school** | Roster detail, with a transfer's previous school (Gray: Oregon; Porter: Ohio State). ESPN has some of this; the notes are official and complete | 7–8 | Roster | S |
| 14 | **NFL Legacy** | "His father played in the NFL" on the player card | 19 | Roster player | S |

### C. Records and history

| # | Feature | What a fan gets | Pages | Where | Effort |
|---|---|---|---|---|---|
| 15 | **Record watch** | Program top-5 lists beside current players' totals: "Carr is three TD passes behind Rick Mirer (40) for 9th on ND's career list". The notes give the lists; the totals come from the stats we already load | 17, 3 | Stats, Game | M |
| 16 | **"The last time..." in the live game** | When ND crosses a threshold mid-game, the Game screen says when it last happened: "First 300-yard rushing game since Syracuse, 2025". Probably the most distinctive item here, and the most work | 44–49 | Game (live), recap | L |
| 17 | **Streak tracker** | Running team streaks: opponents held under 100 rushing yards (6), double-digit wins (15), Faison's catch streak, Porath's PATs (67-for-67) | 3, 15 | Home, Stats | M |
| 18 | **Coach file** | Record, milestone wins, first-three-seasons comparison with past ND coaches, full staff | 9–12 | More → Team | M |

### D. Season and stats

| # | Feature | What a fan gets | Pages | Where | Effort |
|---|---|---|---|---|---|
| 19 | **Big plays** | Every 20+ yard play this season, sortable | 42 | Stats | M |
| 20 | **Money downs** | Third/fourth-down conversions by player, by game | 41 | Stats | M |
| 21 | **Scoring drives** | Every scoring drive with plays-yards-time and the running score | 43 | Stats, Results | M |
| 22 | **Leaders per result** | Each finished game's leading rusher, passer, receiver and tackler on the Results list | 23 | Schedule → Results | S (also in ESPN's box scores) |
| 23 | **Official season stats** | The program's own numbers, games played and started included | 50–60 | Stats | M (note 3) |

### E. Off the field and the offseason

| # | Feature | What a fan gets | Pages | Where | Effort |
|---|---|---|---|---|---|
| 24 | **Irish in the NFL** | Every alum on an NFL roster by team, and on Sundays their lines (ESPN NFL box scores), which keeps the app alive on Sundays and all offseason | 29 | More, offseason Home | M–L |
| 25 | **Stadium and travel facts** | ND in NFL stadiums (18 since 2014), attendance records at the opponent's stadium, on the game's venue | 22–25 | Game venue | S–M |
| 26 | **Program facts** | All-time, home, road and neutral records; years of football; returning starters | 3 | About the team | S |
| 27 | **Shields Hall** | Facility and donor features | 35–38 | — | not recommended: little fan value |

## Recommendation

**First, small and time-sensitive:** #1 milestone countdown. The notes put the official all-time record at 998-342-42, so a win over Stanford makes BYU on Oct 17 the 1,000th. If it ships this week, the app has it when it matters. One caveat: the record carries an asterisk the notes don't explain. It's almost certainly the NCAA-vacated wins, and the countdown should use the program's official count, which is this one.

**Then the cheap, high-delight set, all S, all from lists the producer already downloads:** #8 pronunciation, #9 captains, #3 series card, #2 By the Numbers, #5 press conference.

**Biggest payoff for real work:** #16 "the last time" during live games, and #24 Irish in the NFL for Sundays and the offseason.

**Worth doing because it fixes a real gap:** #7, Thursday and pregame availability. Today's report is Monday's, and by Saturday it can be wrong.

## Notes before building any of it

1. **Notre Dame is data, not code.** Every program publishes weekly game notes (Ohio State does too). Each feature should be a capability a team's config declares, with an official-notes producer per source, like depth and availability (decision 0018). A team whose notes lack a section simply doesn't show that feature.
2. **Facts, not prose.** Records, numbers, names, pronunciations and lists are facts. The notes' sentences (tidbits, recaps, the facility features) are the athletic department's writing. Features 2, 4 and 11 should show short facts with a link to the source, not reprint paragraphs. That's my reading, not legal advice; it's your call.
3. **Pages 50–60 are readable.** They use a font whose text extracts as letters shifted by a fixed amount ("1RWUH 'DPH" is "Notre Dame"). It decodes reliably, so the official stat tables are usable. ESPN's stats remain the fallback.
4. **The notes are hand-typed and drift.** Today's availability bug was exactly that ("Moore- Concussion"). Every parser needs the same guard the availability one now has: a line it can't read is reported, never silently dropped.
5. **Cadence:** the notes publish once a week, on Monday. The weekly refresh already fetches them, so new sections cost parsing, not new fetching.
