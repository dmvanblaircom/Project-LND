# Suite

## Role

Suite is the fan-facing app, front door, and experience system in Project LND.

If TeamOS is the brains, Suite is the place.

> **The team is the product. The Suite is the place you experience it.**

Irish Watch is the first Suite implementation and product laboratory.

## Persistent Destination

Suite should feel like a place a fan returns to every day, not a page they open only during a game.

Potential experiences include:

- Home / Now
- Game Day
- Team
- News & Media
- History
- Community

A fan can have relationships with multiple teams without flattening those teams into one generic experience.

Use these terms consistently:

- **Primary Team** - the fan's home team and default destination
- **Other Teams I Follow** - additional teams the fan chooses to keep connected to
- **Active Suite** - the team Suite the fan is currently inside

When a fan switches teams, the product should treat that as entering another Suite, not changing a filter. A brief transition may say:

> **Entering your [Team Name] Suite**

Switching the Active Suite does not change the Primary Team unless the fan explicitly chooses to do so.

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

Prioritize news, recruiting, roster movement, spring and fall camp, signing-day moments, history, and upcoming events. The next season schedule should become more prominent when it is timely rather than dominating the entire offseason.

## Team Identity

Suite inherits team identity from TeamOS. **Implemented in Phase 6**: `app.js` reads one
object, `TeamOS.identity.create(TEAM_CONFIG, TEAM)`, and applies it in one place,
`paintIdentity()`, which sets the document head, the header lockup, the motto, the
sr-only headings and the stylesheet's `--t-*` tokens. `app.css` keeps its own rules,
spacing, layout and semantic colours; what it no longer keeps is a team's values.

- Colours - as a **fill** (`accent`) and, separately, as legible **text** (`accentText`)
- Typography - three stacks: body, display, headline
- Terminology - product name, program label, motto, the News tab's rule
- Artwork - favicon, app icons, share image; each optional, each omitted when absent
- Team-specific capabilities - through `TeamOS.snapshots` (Phase 5B)

The team should feel like the product rather than a filter applied to a generic sports
interface. The test is that the Suite contains no team name, no team colour and no
`if (TEAM.id === ...)`; `tools/adaptercheck.js` asserts all three.

## Social Sharing and Presence

The Suite metaphor should work as social language from the first sharing feature through much more immersive future experiences.

The canonical invitation language is:

> **Join [Name] in their Suite.**

For a named example:

> **Join David in his Suite.**

The invitation phrase should not name the team. Team context is communicated by the destination itself.

At first, "join" can simply deep-link a recipient into the inviter's Active Suite. The recipient's Primary Team must remain unchanged unless they explicitly change it.

Later, the same language can support actual presence:

- See that a friend is in their Suite
- Join them in the same team experience
- Shared reactions and game-day participation
- Watch-together experiences
- Presence-aware community moments

## Long-Term Spatial Direction

The same Suite concept can extend much farther into AR, VR, and spatial computing without changing the product vocabulary.

A future fan Suite could become a persistent digital room built around the team, where friends can join one another for live games or major moments and interact with stats, media, history, memorabilia, and other team-specific surfaces.

This is a long-term vision direction, not a current roadmap commitment. The near-term product should preserve the model without prematurely building the spatial technology.

## Future Team Relationships

A user should eventually be able to follow multiple teams while still receiving distinct team experiences.

Example:

- Notre Dame
- Ohio State
- Cleveland Cavaliers
- Cleveland Guardians

The Primary Team remains the default destination. Other Teams I Follow remain available as distinct Suites, and whichever one the fan is currently viewing is the Active Suite.

## Community

Potential future Suite capabilities include:

- Game threads
- Fan posts
- Polls
- Predictions
- Reactions
- Discussion
- Sharing
- Friend invitations
- Presence

These capabilities should be designed around the team destination rather than turning Suite into a general-purpose social network.
