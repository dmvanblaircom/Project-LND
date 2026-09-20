# Decision: one live state per game, and one clock that moves it

## Status

Accepted

## Date

2026-09-20

## Decision

A game that appears on more than one Suite surface has **one** live state. Where the team's schedule and the league scoreboard describe the same game, the **scoreboard is the live truth** for score, state and clock, and `TeamOS.live.reconcile(game, leagueGame)` is the only place that rule is written down.

```text
scoreboard  ->  LeagueGame  ┐
                            ├─ TeamOS.live.reconcile ─>  Game  ->  hero, hero-mini,
schedule    ->  Game        ┘                                      schedule rows,
                                                                   which game the Game tab shows
summary     ->  GameDetail  ------------------------->  Game Center's detail
```

`reconcile` is pure, takes and returns domain objects, names no provider, and returns the original object when there is nothing to take. It never moves a game backwards (a scoreboard still saying `pre` cannot un-start a game in progress), never invents a score, and touches nothing the scoreboard has no opinion about — venue, broadcast, odds, series, weather.

Alongside it, **the Suite runs one live clock**. `autoTick` refreshes the scoreboard, then the schedule (which is reconciled against it), then the Game tab. No surface keeps a timer of its own.

## Context

- **FACT.** On 2026-09-19, during Ohio State–Kent State, the Game Center showed 49-0 in the fourth quarter while the hero, the header bar and the schedule row showed 0-0. Irish Watch showed stale Top 25 rows for games that were live.
- **FACT.** The same game reached the Suite from three ESPN endpoints: `teams/<id>/schedule` → `Game`, `scoreboard?groups=80` → `LeagueGame`, `summary?event=` → `GameDetail`. None of them wrote back to the others.
- **FACT.** The Game Center kept its own 25-second timer (`G.poll`), started the moment it saw a live `GameDetail`. The hero depended on `autoTick`, whose timer only existed if `startAuto()` had been called while something was already live — and `startAuto()` ran only after a fetch. A session opened *before* kickoff therefore never started the loop, while the Game tab polled happily. That is the exact shape of the screenshot.
- **FACT.** Not caching. Measured the same morning: `schedule` `max-age=1`, `teams/<id>` `max-age=7`, `scoreboard` `max-age=3`, `summary` `max-age=6`. The service worker treats every ESPN URL as data (network-first) and the page fetches `no-store`.

## Options Considered

### Refresh the header and hero from the summary too

The smallest patch: have the Game Center's poll also repaint the hero. Rejected — it makes the summary endpoint a second authority for the schedule's data, leaves the Top 25 on its own path, and adds a fourth place that knows how to turn a payload into a score.

### Have the Suite merge the payloads where it renders

Keeps TeamOS untouched, but puts "which feed wins" into the view layer, repeated per surface, which is how the three copies drifted in the first place.

### One reconcile rule in TeamOS, one clock in the Suite (chosen)

The rule is domain logic about two domain objects, so it belongs in TeamOS, stated once. The cadence is application orchestration, so it stays in the Suite — but as one loop rather than three.

## Rationale

`Game`, `LeagueGame` and `GameDetail` remain distinct, for the reasons decision 0005 gives: they answer different questions. What was missing was any statement of what happens when two of them describe the *same* game at the same moment. That is a domain rule, and leaving it unwritten meant each surface answered it by accident, according to whichever timer happened to be running.

## Consequences

- `teamos/live.js` (new) exposes `reconcile`, `reconcileAll`, `isLive`, `anyLive`. No existing object changes shape and no adapter is rewritten.
- `app.js`: `refreshSchedule` reconciles `S.games` against the scoreboard; `autoTick` refreshes both payloads and then the Game tab; `G.poll` is gone; the pre-game countdown is cancelled when a game goes live (it had been overwriting the live clock with the word "Kickoff"); a one-minute heartbeat notices that kickoff has passed, and notices the league starting to play while the Top 25 is open.
- `teamos/espn.js`: a score of `0` is a score. The old truthiness test turned a real 0 into `null`, which the view printed as 0 by coincidence; the model could not tell "0-0 in progress" from "no score yet". The overall record is now found by `type: "total"` rather than by position.
- `tools/livecheck.js` (new) lifts the Suite's own paint functions into a bare Node scope and asserts every score-bearing surface prints the same state, for both teams, from kickoff to final — including a negative control that reproduces the original disagreement, so the check cannot pass on a broken build.
- **One more request per tick while a game is live.** The scoreboard is now fetched every tick rather than only while the Top 25 tab is open, because the hero needs it. That is the price of one authority.
- **OPEN QUESTION.** The header's record is still fetched once per `load()`, so a record that changes when a game goes final is stale until the next full refresh. It is not game state and no surface contradicts another about it, so it was left alone.

## Owner

David (report and decision) / Claude Code (diagnosis and implementation)

## Related Documents

- `docs/engineering/live-score-consistency.md` — the investigation and the regression
- `docs/decisions/0005-game-and-leaguegame-are-distinct.md` — why they are separate objects
- `docs/07_DATA_ARCHITECTURE.md` — the live path
- `teamos/live.js`, `tools/livecheck.js`
