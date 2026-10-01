# Play text: what still reads badly (W17 inventory)

**FACT**, measured 2026-10-01 over every real ESPN game summary in
`tools/fixtures/` (793 plays: Notre Dame vs. Wisconsin, Michigan State and
Purdue at several moments, Ohio State at Illinois). Counts are plays with at
least one instance. Already fixed, not repeated here: the game clock prefix
on the last-play line, "(C. Talty KICK)" after an extra point, and shouted
"KICK)" / "FG GOOD" in scoring plays (PRs #18, #26).

## Where play text shows

| Surface | Field | Text today |
|---|---|---|
| Game → Last play | `detail.lastPlay` | ESPN text, clock lifted out (`playText`) |
| Game → Plays → Scoring plays | `detail.scoring[].text` | ESPN's scoring summary, kick/FG case quieted (`quietScoring`) |
| Game → Plays → Drives | `drives.list[].plays[].text` | **ESPN's raw play-by-play, unchanged** (its own `(15:00)` clock prefix included) |
| Top 25 → live row | `live.lastPlay` | as Last play |

The drive list carries almost all of the problems below: its source is
ESPN's official play-by-play feed, written for statisticians.

## The inventory

| # | Problem | Plays | Real example |
|---|---|---|---|
| 1 | **Team codes in field spots**: `UND29`, `MSU41`, `OhioSt06`, `Illini00`, `Wis35` - ESPN's internal codes, not the abbreviations Suite shows (ND, MSU, OSU, ILL). `00` is the goal line. | 659 | "pass complete short left to #0 T.Henry caught at UND29, for 17 yards to the UND29, out of bounds at UND29" |
| 2 | Jersey numbers inline and no space after an initial: `#13 C.Carr` | 669 | "Shotgun #13 C.Carr pass complete deep middle to #14 M.Gilbert" |
| 3 | Formation prefix: `Shotgun`, `No Huddle-Shotgun` | 550 | as above |
| 4 | Clock prefix `(15:00)` kept in the drive list, and the clock repeated at the end: `, clock 12:06` | 95 (suffix) | "Timeout Notre Dame, clock 12:09" |
| 5 | Shouted results: `1ST DOWN` | 159 | "... for 61 yards to the MSU14 (#3 T.Bell), 1ST DOWN" |
| 6 | Shouted penalties: `PENALTY MSU Pass Interference ... NO PLAY` | 42 | "punt 40 yards to the MSU11 ... PENALTY UND Holding (#27 K.Viliamu-Asa) 10 yards from UND49 to UND39. NO PLAY" |
| 7 | Holder and long snapper credits on kicks: `(H: #39 J.Scaife, LS: #96 J.Vinci)` | 38 | "field goal attempt from 25 yards GOOD (H: #39 J.Scaife, LS: #96 J.Vinci), clock 12:06" |
| 8 | Replay review sentence appended: `The previous play is under automatic review - ... CALL UPHELD` | 6 | "rush left for 1 yard gain to the MSU00 TOUCHDOWN, clock 04:46. The previous play is under automatic review - ..." |
| 9 | `TURNOVER ON DOWNS` shouted | 6 | "rush left for 11 yards gain to the UND50 (...), TURNOVER ON DOWNS" |
| 10 | Double spaces in scoring summaries | 2 | "R. Browne sacked  by B. Young for -12 yds, D. Bowen fumbled,  return  for 15 yds for a TD" |

## Proposed handling, by risk

The rule from the backlog stands: use structured fields where they exist,
change only what cannot change a play's meaning, keep ESPN's words
otherwise, and test each rule on these real plays.

**A. Safe to normalize in TeamOS (no meaning can change)**
- #4: lift the drive list's `(15:00)` prefix into the play's own time (the
  same `splitAt` the last-play line uses), and drop a trailing `, clock
  m:ss` that repeats it.
- #5, #9, and the `NO PLAY` / `PENALTY` labels in #6: fixed tokens to
  sentence case ("1st down", "Turnover on downs", "No play", "Penalty").
- #10: collapse runs of spaces.

**B. Needs a structured source, then safe**
- #1, team codes: map a code to the team only when it agrees with the play's
  structured spot (`start`/`end` carry the team and yard line ESPN means);
  `XX00` reads as the goal line. A code that cannot be confirmed stays as
  written. This is the largest readability win and the one most worth a
  careful test: 659 of 793 plays.

**C. Presentation choices (Codex / ChatGPT, David approves)**
- #2 jersey numbers and #3 formation: dropping them shortens every play,
  but they are information some fans read. Options: drop both; keep
  jersey numbers only; or show a short form with the full text on expand.
- #7 holder/long snapper and #8 review sentence: drop from the line, or
  move to a secondary line.
- Grouping and consistent time/down-distance across Last play, Scoring
  plays and Drives (backlog V09).

## Next steps

1. Claude builds group A (and B, once the structured spot match is proven
   on these fixtures) in TeamOS with a check that replays all 793 plays and
   fails if any rule changes a number, a name or a yard count.
2. Codex/ChatGPT decide group C with a before/after render of one real
   drive at 320 px.
