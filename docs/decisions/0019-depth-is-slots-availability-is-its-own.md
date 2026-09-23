# Decision: a depth chart is spots, and availability is its own report

## Status

Accepted

## Date

2026-09-23

## Decision

**A depth chart is a list of spots, each with levels, each level a set of players.**

```text
units[] -> { unit: "Defense",
             slots[] -> { label: "DT", ordinal: 2,
                          levels[] -> { level: 1, players: [Tionne Gray, Francis Brewu] },
                                      { level: 2, players: [Sean Sevillano Jr.] } } }
```

- A **slot** has identity: label plus ordinal. Notre Dame lists two DTs, two
  DEs, two CBs and three WRs, each under the same label. They are separate
  spots and stay separate.
- A **level** is first team, second team, and so on. It is a number, not a
  fixed pair, because the official chart lists three at some spots (DE 1 and
  DT 1 this week).
- **`players` is the OR relationship.** One player means the spot is his. More
  than one means they are listed "or" at that level. At first team that is an
  open starting job; at second team, a backup battle. This is the product's
  FIRST TEAM / SECOND TEAM with OR, represented directly.
- A player listed at two spots appears at both. Francis Brewu is second at
  DT 1 and co-first at DT 2 on the official chart; that is faithful, not a
  duplicate.

**Availability is its own snapshot** (`availability.json`,
`availability-history.json`), declared separately in `TEAM_CONFIG.snapshots`.
It is a different official document from the depth chart, published on its
own schedule, and it carries its own date:

- `reported` means a report **exists**. A dated report listing nobody means
  everyone is available; no report means unknown. The two are never
  conflated, and the Suite never infers health from silence (decision 0018).
- `effectiveAt` is the report's own date, read from its heading
  ("AVAILABILITY UPDATE (SEPT. 21)" -> 2026-09-21).
- Each player carries a `status`: `out-season`, `out-game`, `doubtful`,
  `questionable` or `probable`.

**The parser is code in `tools/`, tested against the real document.**
`tools/producers/twodeep.py` holds the rules: pure functions, no network, no
team named. `tools/producers/official_depth.py` fetches and writes.
`tools/depthcheck.py` runs in CI against the committed text of the official
Game 4 PDF, and every expectation in it was read off that PDF.

## Context

The previous parser lived as 300 lines of Python inside the data-refresh
workflow. It stored flat rows `{pos, depth, or}` and keyed positions by label
alone. So:

- Two DT spots became one card with six players.
- The BATTLE badge paired Armel Mukam with Tionne Gray, the two starting
  tackles, who line up beside each other. It also flagged DE, where the two
  starters are at different spots.
- "OR" was a flag on a row whose meaning depended on the row above it. Any
  sort or filter would have broken it silently.
- The week-over-week diff flattened by name. For Game 4 it reported only
  "Javian Osborne moves up to 2 at RB" and missed that Nolan James Jr. became
  a co-starter, the biggest move of the week.

Because the parser lived in YAML, it could not be tested or run locally.
Eight "Inspect" and "Diagnose" commits on `main` were how it got debugged.

The recovery review (2026-09-23) said the "duplicate" Brewu and the depth-3
rows were parser artifacts. Reading the official PDF corrected that: both are
real. The actual defect was narrower and worse. Spot identity was missing, so
real data rendered as wrong data.

## Consequences

- `depth.json` / `depth-history.json` are `schema: 2`. The existing Games 1-4
  were converted with `twodeep.from_flat`. `depthcheck` proves that function
  lossless: converting the old Game 4 file gives exactly what parsing the
  official Game 4 PDF gives.
- Game 4's availability was re-read from the full 58-page game notes. It
  agrees with the old parse (10 players, same statuses) and now carries its
  date. Games 1-3 have `effectiveAt: null`. The old parser never captured a
  date, and none is invented.
- The producer downloads a document only if it has not already parsed it,
  and writes a file only when its content changed. The old step fetched about
  80 MB a run, including 20 MB game notes, and stamped a new time on every
  file, so every run looked like new data. Timestamps now record when a
  version was first seen.
- If the current week's chart cannot be parsed, nothing is written and the
  run fails loudly. This was verified against a stand-in site serving a
  corrupt PDF.
- The Suite renders one block per spot. The BATTLE badge appears only where
  one spot lists more than one starter, and each level is announced to
  screen readers ("First team", "Second team, or").
- The week-by-week history renders again. vNext had broken it with an
  undefined variable, and an empty `.catch` hid the error. Failures in it
  are now logged to the console.

### Open, and not an engineering call

- **Three levels.** The approved design shows FIRST TEAM and SECOND TEAM. The
  official chart sometimes lists a third. The data keeps it; the canonical
  screens need to say how it is shown.
- **Which availability reports are captured.** Notre Dame's own policy (game
  notes, "AVAILABILITY UPDATES") publishes a report on Monday, an update
  Thursday, and a final update about 60 minutes before kickoff. The producer
  reads the Monday report linked from the media table. Whether the Thursday
  and pregame updates appear there, or somewhere else, cannot be checked from
  the development environment, which cannot reach fightingirish.com. Until
  that is confirmed, the Suite must not imply that it shows the latest
  game-day status. **Now monitored (decision 0020):** if a Thursday or
  pregame update is due and the refresh does not hold it, an issue is
  opened for that game.

## Related

- `docs/decisions/0018-official-team-sources.md`: official first; absence is
  not health
- `tools/producers/twodeep.py`, `tools/producers/official_depth.py`,
  `tools/depthcheck.py`
