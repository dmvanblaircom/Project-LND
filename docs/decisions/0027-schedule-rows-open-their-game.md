# Decision: a Schedule row opens its game in the Game layout

## Status

Accepted.

## Date

2026-09-24

## Decision

Tapping a game on Schedule (or on Home's Schedule preview) opens that game:

- the hero game's row opens **Game** itself (`#game`) - the Game tab keeps
  meaning the hero game;
- any other row opens the game in the **already-approved Game layout** -
  its header and its lifecycle views (Game Details before kickoff; Box
  Score, Plays and Stats after) - inside Schedule, at `#schedule/<game id>`
  (`#schedule/<game id>/<view>` for a view), under the compact Suite
  header, with a way back to the list the fan came from;
- coming back returns the fan to where they were in the list.

## Context

Before the redesign, a Schedule row expanded that game's full detail in
place - box score, leaders, the pregame matchup - and Home's schedule rows
deep-linked to it. The canonical references show a chevron on every
Schedule row but no destination, and the approved Game screen is tied to
the hero game. Product chose (2026-09-24) to keep the capability and reuse
the approved Game design rather than expand rows in place or drop per-game
detail.

## Consequences

- `suite/game.js` draws any game; its views hang off `model.base`
  (`#game` or `#schedule/<id>`), and each host keeps its own redraw state.
- `suite/nav.js` lets a screen open items by id (`SCREENS.schedule.item`),
  with the item's own header; a view the game does not have is corrected in
  place (0024 §15).
- `suite/schedule.js` owns the schedule row, shared by Home's preview and
  the Schedule screen.

## Related

- `docs/decisions/0022-suite-v1-product-behavior.md` (#8, Schedule and Results)
- `docs/decisions/0024-suite-v1-design-edge-policies.md` (§3, §15)
