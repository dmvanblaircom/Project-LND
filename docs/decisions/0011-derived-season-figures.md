# Decision: a figure the provider will not give us is derived, not faked

## Status

Accepted

## Date

2026-09-21

## Decision

Where a provider publishes a field but never fills it, TeamOS does **not** map
that field. If the Suite needs the figure and the data to compute it is already
in the domain model, **TeamOS derives it** — in a pure module, over domain
objects, naming no provider. If it cannot be derived, the row is absent and the
view drops it.

The first case is **points allowed per game**:

```text
ESPN teams/<id>/statistics  ->  SeasonStat[]      8 rows the feed answers
                                       +
team's own results (Game[])  ->  TeamOS.season  ->  points allowed  (the 9th)
                                       |
                                       v
                             the matchup card
```

`TeamOS.season.pointsAllowedPerGame(games)` averages the opponent's score over
finished games. It takes anything carrying `{ state, us, them }` — a `Game`, or
the score lines `TeamOS.espn.scoreLines()` reads from a schedule payload, which
is how the preview asks the same question about an opponent it has no team
configuration for.

A derived figure carries **no national rank**, because computing one would mean
holding every team's season. The card shows the number without a rank and
without the better-rank marker, and says so in its stamp.

## Context

- **FACT.** ESPN's college-football team statistics endpoint publishes
  `defensive.pointsAllowed` and `defensive.yardsAllowed`. On 2026-09-21, for
  Notre Dame through three games and 120 points scored, both read
  `value: 0.0, rank: 1, rankDisplayValue: "Tied-1st"`. They are unpopulated
  fields, not data. The same signature appears on `hurries`,
  `passesBattedDown`, `rushingBigPlays`, every `redzone*` field and
  `totalDrives`.
- **FACT.** There is no opponent split. `.../teams/87/statistics/1` returns
  `{"error":{"message":"No stats found.","code":404}}`. Every figure on that
  endpoint is the team's own production. Rushing and passing yards allowed are
  not obtainable from it at any price.
- **FACT.** The matchup card had carried "Scoring defense" and "Total defense"
  rows since Phase 4B. Both were always `null`, and the view's
  "skip a row null on both sides" rule meant nobody ever saw them. The card
  silently showed six rows where the code asked for eight.
- **FACT.** The Suite already holds the configured team's whole season in
  `S.games`, with final scores. The opponent's costs one request for their
  schedule.
- **FACT.** ESPN files `sacks` under **both** `passing` (sacks this offence gave
  up) and `defensive` (sacks this defence made), with different values and
  different ranks. A lookup by bare stat name resolves to whichever category the
  payload happens to list last.

## Options Considered

### Map `pointsAllowed` and `yardsAllowed` and accept what comes

One line, and wrong. The card would print **0.0** next to **#1** for every team
in the country. A confidently-stated wrong number is worse than a missing row,
and the rank makes it look verified.

### Derive yards allowed too, from box scores

Correct in principle and unaffordable in practice: it needs one summary fetch
per completed game per team. The configured team's finals are already cached
forever on the device, but the opponent's are not — `gameById` only knows
`S.games` — so by November this is ten-plus requests to paint one pregame card.
Rejected on cost, not on principle; if the box scores ever become cheap it
becomes possible.

### Derive points allowed from results, leave the rest out (chosen)

Points allowed needs no box score — the final score is on the schedule, which
the page already has for one team and can get in one request for the other. The
rest of the defensive picture is filled by what the feed *does* answer
truthfully: sacks and tackles for loss, which measure disruption rather than
prevention.

## Rationale

A provider's schema is not a statement of fact about football. Phase 3's
adapter boundary exists so the Suite never sees a provider's shape; this
decision extends that to a provider's *silence* — the adapter is also where we
decide a published field is not an answer.

Deriving belongs in TeamOS rather than the Suite for the same reason
`TeamOS.live.reconcile` does (decision 0010): "points allowed is the average of
what opponents scored in finished games" is a statement about domain objects,
true for every team and every sport with a score. The Suite decides when to ask
and how to print it.

## Consequences

- `teamos/season.js` (new): `pointsAllowedPerGame`, `pointsPerGame`,
  `gamesCounted`. Pure, no fetch, no DOM, names no provider and no team.
- `teamos/espn.js`: `PREVIEW_ROWS` is now nine rows carrying a stable `key`, so
  the derived row can be filled by identity rather than by matching a label.
  `SeasonStat` gains `key`. New `scoreLines(json, teamId)` and
  `teamScheduleUrl(teamId)`.
- **Stat names may be qualified by category** — `defensive.sacks`. `flattenStats`
  now keys every stat both ways. Anything ambiguous is looked up qualified; the
  bare-name map keeps its old last-one-wins behaviour for everything else.
- `app.js`: `pointsAllowedFor` (no fetch for the configured team, one for the
  opponent, cached per session, resolving to `null` on failure) and
  `withPointsAllowed` (copies rather than writes, because the rows are cached
  and shared between renders).
- **The card changed shape.** Out: Scoring defense and Total defense (never
  rendered), and Third down — whose *rank* ESPN never populated either, so it
  had been printing `#1` for every team since Phase 4B. In: Points allowed,
  Yards per play, Sacks, Tackles for loss.
- `tools/matchupcheck.js` (new, wired into `check.yml`) lifts the Suite's own
  render functions into a bare scope and reads back the card. Its negative
  controls are the two ways this can regress: filling the row from ESPN's stub,
  and not filling it at all.
- **One request more per pregame Game Center**, for the opponent's schedule, and
  only when the opponent is not the configured team. Cached for the session.
- **OPEN QUESTION.** Rushing and passing defense remain unanswerable from this
  provider. A second provider, or affordable box scores, is what changes that —
  the card is honest about the gap rather than filling it with disruption stats
  dressed up as prevention.
- **OPEN QUESTION.** `passing.sacks` is very likely sacks *allowed* by the
  offence, which would make a true trench pair with `defensive.sacks`. Its rank
  (108th for giving up only 2) does not behave like a rank where fewer is
  better, so it was left out rather than guessed at. Settling it needs a second
  team's payload to compare.

## Owner

David (product: which rows, and the nine-row cap) / Claude Code (the data
finding, the derivation and the checks)

## Related Documents

- `docs/decisions/0010-one-live-state-per-game.md` — the same split: the rule in
  TeamOS, the orchestration in the Suite
- `docs/03_DOMAIN_MODEL.md` — `SeasonStat`
- `teamos/season.js`, `tools/matchupcheck.js`
