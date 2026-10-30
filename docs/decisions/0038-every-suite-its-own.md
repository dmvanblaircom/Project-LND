# Decision: Every Suite is its own - parity first, then the team's own

## Status

Accepted.

## Date

2026-10-29

## Decision

David, 2026-10-29, after every FBS program had a config: "I want to shoot for
config parity across all the teams right now, but ultimately, being a fan of
each team is so unique that Suite should really be unique to each team in many
ways too. We're a bit away from really personalizing to each team within the
platform but that should be the goal."

- **Now: parity.** Every team gets every capability its sources allow. That
  covers news from the outlets its fans read, the official availability
  report, depth chart and game notes where the school or conference publishes
  them, and the rest of what Notre Dame and Ohio State have. Where a team
  lacks one, the gap is closed or its config says why it can't be.
- **The goal: each Suite its own.** Each team's Suite should become as
  distinctive as the fandom it serves: its traditions, rivalries, voices,
  language and the rhythm of its week.
- **Unchanged: data, not code.** That distinctiveness is declared in the
  team's configuration and data, and rendered by capabilities any team can
  use. A module built for one program is one the next program can declare.
  This does not relax decision 0001's boundary; it is what the boundary is
  for.

## Consequences

- `docs/00_PROJECT_LND_NORTH_STAR.md` ("Every Suite Is Its Own") and
  `CLAUDE.md` (North Star) say this.
- Source work is measured per team against parity: a team's config names
  what it uses and why anything else is not used.
- Proposals for team-specific features are written as capabilities with a
  config declaration, so the second team to want one gets it by data.
