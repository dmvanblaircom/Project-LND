# Decision: one header on every screen

## Status

Accepted. Supersedes the header rule of 0023 ("Headers, by destination
rather than by state") and extends 0024 §6 from Top 25 to every screen.

## Date

2026-10-01

## Decision

Every Suite screen wears the header Top 25 introduced (0024 §6):

- the dark SUITE bar, sticky at the top;
- the selected team as quiet context beside the wordmark: its mark and
  name, painted from the team config. Context, not a control: Change Team
  stays in Settings;
- under the bar, a visible page title in neutral Suite ink (`Roster`,
  `More`, `Schedule`, `News`, `Settings`, `Feedback`, `About Suite`,
  `Top 25`), except where a hero already leads the screen: Home, Game, and
  a game opened from Schedule. There the title stays for assistive
  technology only.

The team masthead (art, large mark, name, nickname, tagline and title) is
removed. The team chooser keeps the bar alone, with no team context.

## Context

David, 2026-10-01: "Why does each tab of the app have a different header?"
Three headers by destination (compact bar, team-aware bar, masthead) read as
three apps. The masthead also took about a third of a phone screen on every
team section before any content. David chose the Top 25 header for all and
asked that it scale to Ohio State.

## How it scales to every team

Nothing in the header is team code. The mark and name come from the team
config through `paintIdentity()`, the colours from the team's tokens, the
title from `Suite.nav` SCREENS. `tools/visualcheck.js` asserts the bar, the
team context and the page title on every screen for both Notre Dame and
Ohio State. At 320px neither name truncates.

## Consequences

- The team's nickname and tagline now show only in Home's hero, which
  already carried them. The masthead's art slot is gone; Home's hero art is
  unchanged.
- Roster's sticky Offense | Defense | Special Teams control now sits under
  the sticky bar instead of at the top of the screen.
- Codex reviews the page-title rhythm under the bar (codex-review-queue).

## Owner

David (the decision) / Claude Code (build)

## Related

- `docs/decisions/0023-canonical-suite-implementation.md`: the superseded header rule
- `docs/decisions/0024-suite-v1-design-edge-policies.md` §6: the Top 25 header this generalises
- `suite/nav.js`: SCREENS (`hero`, `itemHero`) and `paint()`
