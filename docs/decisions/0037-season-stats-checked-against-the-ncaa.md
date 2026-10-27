# Decision: Season stats - which source each figure and rank comes from

## Status

Accepted.

## Date

2026-10-27

## Context

David's screenshot of the Matchup card: Notre Dame's turnover margin +8
"Tied-60th", Navy's -7 "Tied-58th". He asked how far ESPN's season stats can
be trusted and whether to move to CollegeFootballData.

On 2026-10-27, every FBS team (CFBD's FBS list, 138 teams) was checked: each
ESPN rank against the FBS rank of ESPN's own values, ESPN's values against
CFBD's, and the turnover margin against the NCAA's own FBS table (through
games of October 24).

- **ESPN's ranks are FBS ranks and right for 13 of the 15 ranked stats**:
  points, total, rushing and passing yards per game, sacks, completion
  percentage, yards per pass and rush, passing and rushing touchdowns,
  tackles for loss, interceptions, takeaways - 100% exact; forced fumbles
  within two places (ties numbered differently).
- **Net passing yards per game:** the rank counts all of Division I (to
  "265th"); 93% of FBS teams are ranked lower than they are.
- **Turnover margin:** the rank does not follow the margin (Notre Dame +8
  "Tied-60th", Ohio State +8 "44th", Oregon -5 "8th"), and the margin
  itself matched the NCAA's for **10%** of teams. CFBD's (takeaways less
  giveaways) matched for **93%**. ESPN's fumble counts are short: Notre Dame
  10 takeaways to the NCAA's 16, so a margin of +8 to the NCAA's +14.
- ESPN's other values agree with CFBD's (points, yards within 2% for 99%,
  touchdowns, interceptions, games). Sacks and tackles for loss are counted
  differently by the two, neither clearly wrong.

The NCAA's figures are official, but NCAA.com (operated by TNT Sports)
forbids reproducing, publishing or redistributing its content, statistics
named, without permission (its terms, updated 2023-02-21), and has no API.
It is not a source for Suite.

## Decision

- **Turnover margin, takeaways and giveaways come from CFBD** through the
  edge API (`turnovers`, `turnoversOpponent`; decision 0030), on the
  Matchup card and the Stats screen. ESPN's are not shown. Without CFBD's
  answer the rows are left out, never filled with ESPN's.
- **No rank for the turnover margin or net passing yards** until Suite
  computes FBS ranks itself (next: from one league-wide CFBD read on the
  edge API). Every other ESPN rank stays.
- **ESPN stays the source for everything else**: it is live, and it answers
  the schedule, scores, box scores and rosters too.

## Consequences

- One more pair of CFBD fields per school; the edge API's cache key carries
  the field list, so no old copy is served for the new one.
- A check of ESPN against CFBD, run on a schedule, is the referee for later
  drift; the NCAA's table is not read by Suite.
