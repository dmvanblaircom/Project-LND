# Decision: Suite Is the Place

## Status

Accepted

## Date

2026-09-25

## Decision

The team remains the product. Suite is the stable app/front door and the place through which a fan experiences a team.

Each team-specific destination is referred to as that team's **Suite**. The fan model keeps **Primary Team** and **Other Teams I Follow** as the relationship terms, while **Active Suite** means the team Suite the fan is currently inside.

Canonical social invitation language is:

> **Join [Name] in their Suite.**

For a named example:

> **Join David in his Suite.**

The invitation phrase does not name the team.

## Context

The Suite brand needs to support multiple teams without making Suite itself feel like the product. A fan may have one Primary Team, follow several other teams, and move between distinct team experiences inside one installed app.

The same concept should also leave room for future social presence and much more immersive experiences without requiring a new vocabulary later.

## Options Considered

### Option A: Call each team experience a Box

Use Suite as the app/container and call each team-specific destination a Box.

Benefits:

- Clean separation between app brand and team destination
- Easy to describe switching between team experiences

Tradeoffs:

- Weakens the Suite metaphor instead of extending it
- Creates a second spatial noun for the fan to learn
- Does not carry as naturally into future social presence language

### Option B: Call each team experience a Suite

Use Suite as the stable app identity while allowing each active team experience to be understood as the fan's Suite for that team.

Benefits:

- Extends the core brand metaphor rather than creating another one
- Keeps the team as the emotional center of the experience
- Makes social language natural: "Join David in his Suite"
- Can evolve from a shared link today into real-time presence later
- Leaves room for spatial AR/VR experiences without renaming the concept

Tradeoffs:

- Requires disciplined product language so Suite the app does not overpower the team experience
- Requires clear state modeling between Primary Team, followed teams, and Active Suite

## Rationale

Option B was accepted because the spatial meaning of Suite becomes more valuable as the product grows.

The intended mental model is:

> **The team is the product. The Suite is the place you experience it.**

Suite can remain the stable installed app identity because the user can change teams. Once inside a team experience, that team owns the emotional and visual experience.

For team switching, a short transition may use:

> **Entering your [Team Name] Suite**

This changes the Active Suite but does not change the Primary Team unless the fan explicitly chooses to do so.

For sharing and referrals, the user-facing language should remain team-neutral:

> **Join [Name] in their Suite.**

The destination link can still carry the Active Suite/team context technically. Opening the link must not silently change the recipient's Primary Team.

## Long-Term Social and Spatial Direction

This language is intentionally durable across multiple levels of future capability:

1. **Share / referral** - "Join David in his Suite" opens the shared Active Suite.
2. **Presence** - fans can see that friends are in their Suite and choose to join.
3. **Shared live experience** - watch-together moments, reactions, participation, and community can become synchronous.
4. **Spatial / AR / VR** - a fan's Suite can become a persistent digital place for experiencing the team with other people, surrounded by live game context, stats, media, history, memorabilia, and interactive surfaces.

The AR/VR direction is a vision, not an MVP or near-term roadmap commitment.

## Consequences

- The Suite app icon and front-door identity can remain stable across teams.
- Product language should use **Primary Team**, **Other Teams I Follow**, and **Active Suite** consistently.
- Team switching should feel like entering another destination, not changing a filter.
- Share/referral language should use **Join [Name] in their Suite** without naming the team in the phrase.
- A shared Suite deep link must preserve the recipient's Primary Team.
- Future social features should build on the Suite-as-place model rather than inventing a separate social metaphor.
- AR/VR and spatial concepts stay out of current MVP scope while remaining part of the long-term product vision.

## Owner

David / ChatGPT

## Related Documents

- `docs/00_PROJECT_LND_NORTH_STAR.md`
- `docs/06_SUITE.md`
- `docs/product/suite-product-blueprint.md`
