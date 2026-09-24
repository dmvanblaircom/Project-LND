# Decision: Settings → Appearance is one choice, App Style

## Status

Accepted. Amends decision 0024 §18. Not built yet: it is the contract the
More/Settings phase implements.

## Date

2026-09-24

## Decision

Settings gains an **Appearance** group with exactly one control:

**App Style**
- **Team Style** · Recommended (the default)
- **Suite Style**

Nothing else about appearance is exposed: no typography, colour, accent,
light/dark or other appearance controls.

- **Team Style** lets the selected team's supported visual expression lead.
  Over time that may govern team typography, colours, art treatment and
  related styling, as TeamOS identity supplies them.
- **Suite Style** uses Suite's standard visual system for every team.
- The preference belongs to the fan, not the team: it persists across team
  changes.
- Where a team has no style piece of its own, that piece silently falls back
  to Suite. A missing piece is never an error or a visible gap.

## Context

Product decision from the Game visual review, 2026-09-24. 0024 §18 set
Settings v1 to two groups, Team and Data, with no filler settings; App Style
is the one appearance setting Product wants, so Appearance joins them.

## Consequences

- The More/Settings phase adds Appearance with the single App Style choice.
- The choice is a Suite preference stored with the fan's other Suite
  preferences, not in any team's configuration or cache.
- Team style stays data: TeamOS identity (decision 0009, `teamos/identity.js`)
  supplies what a team has; Suite applies it under Team Style and ignores it
  under Suite Style. No team conditionals in Suite.

## Related

- `docs/decisions/0024-suite-v1-design-edge-policies.md` (§18, amended)
- `docs/decisions/0022-suite-v1-product-behavior.md`
- `docs/decisions/0009-identity-is-team-data.md`
