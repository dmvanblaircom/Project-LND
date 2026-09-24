# Decision: a secondary destination keeps its owner selected

## Status

Accepted.

## Date

2026-09-24

## Decision

The primary navigation has five destinations: Home, Top 25, Game, Roster,
More. A secondary destination reached through one of them keeps that
primary item selected; it never gets a primary item of its own.

Schedule is owned by **More**, so More is the selected item on every
Schedule route:

- `#schedule`
- `#schedule/results`
- `#schedule/<game id>` and its lifecycle views (`#schedule/<id>/box`, ...)

The one exception is the hero game's row, which routes to `#game`: that is
Game itself, so Game is selected, as always.

The same rule carries into News, Settings, Feedback and About Suite when
they are rebuilt: each is a secondary destination under More and keeps
More selected.

## Context

Product, Schedule visual review, 2026-09-24. Schedule had been shown with no
nav item selected. Schedule is reached from Home's preview and from More,
and the approved IA has no primary Schedule destination.

## Consequences

- `suite/nav.js` declares ownership in `SCREENS` (`owner: "more"` for
  Schedule); the selected nav item is the screen's own, or its owner's.
- `tools/visualcheck.js` checks More is selected on the Schedule list,
  Results and a game opened from Schedule.

## Related

- `docs/decisions/0023-canonical-suite-implementation.md` (the primary nav)
- `docs/decisions/0024-suite-v1-design-edge-policies.md` (§1, selected vs live)
- `docs/decisions/0027-schedule-rows-open-their-game.md`
