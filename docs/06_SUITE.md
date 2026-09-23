# Suite

## Role

Suite is the fan-facing destination in Project LND.

If TeamOS is the brains, Suite is the experience.

Irish Watch is the first Suite implementation.

## Persistent Destination

Suite should feel like a place a fan returns to every day, not a page they open only during a game.

Potential experiences include:

- Home / Now
- Game Day
- Team
- News & Media
- History
- Community

## Current Irish Watch as a Suite

The existing Irish Watch tabs already resemble the beginnings of Suite:

- Home
- Top 25
- Game
- Roster
- More (News, Change team, Refresh)

The goal is to evolve this shell rather than throw it away.

## Contextual Experience

The destination can change based on context:

### Game Day

Prioritize live score, game status, key information, game thread, and relevant context.

### Post-Game

Prioritize final score, recap, key moments, analysis, and reaction.

### Offseason

Prioritize news, recruiting, roster movement, schedule, history, and upcoming events.

## Team Identity

Suite inherits team identity from TeamOS. **Implemented in Phase 6**: `app.js` reads one
object, `TeamOS.identity.create(TEAM_CONFIG, TEAM)`, and applies it in one place,
`paintIdentity()`, which sets the document head, the header lockup, the motto, the
sr-only headings and the stylesheet's `--t-*` tokens. `app.css` keeps its own rules,
spacing, layout and semantic colours; what it no longer keeps is a team's values.

- Colours — as a **fill** (`accent`) and, separately, as legible **text** (`accentText`)
- Typography — three stacks: body, display, headline
- Terminology — product name, program label, motto, the News tab's rule
- Artwork — favicon, app icons, share image; each optional, each omitted when absent
- Team-specific capabilities — through `TeamOS.snapshots` (Phase 5B)

The team should feel like the product rather than a filter applied to a generic sports
interface. The test is that the Suite contains no team name, no team colour and no
`if (TEAM.id === ...)`; `tools/adaptercheck.js` asserts all three.

## Future My Teams

A user should eventually be able to follow multiple teams while still receiving distinct team experiences.

Example:

- Notre Dame
- Ohio State
- Cleveland Cavaliers
- Cleveland Guardians

The user's personalized layer can then organize activity across those teams without flattening their identities into one generic UI.

## Community

Potential future Suite capabilities include:

- Game threads
- Fan posts
- Polls
- Predictions
- Reactions
- Discussion

These capabilities should be designed around the team destination.
