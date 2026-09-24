# Decision: player headshots are the provider's, with a designed fallback

## Status

Accepted.

## Date

2026-09-24

## Decision

Depth Chart, Roster and Availability rows show each player's headshot as
the data provider's roster feed links it (`Player.photo`, normalized by
TeamOS), loaded from where the provider hosts it - the same posture as team
logos. No headshot is ever copied into the repository.

A player without one, or one whose image fails to load, gets a designed
fallback: the player's initials on the team's colours. Never a broken
image, and never another player's photo: a depth-chart entry gains a photo
only through the strict roster join (`teamos/roster.js` - number AND last
name, or one exact full name).

## Context

Product, Roster phase, 2026-09-24. The Roster reference shows a photo on
every row. The alternatives considered were no photos (a number badge) and
official team photos only (none configured today).

## Related

- `docs/decisions/0019-depth-is-slots-availability-is-its-own.md`
- `docs/decisions/0024-suite-v1-design-edge-policies.md` (§10, art fallback)
