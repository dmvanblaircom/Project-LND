# Suite Visual System v1

Status: DESIGN DIRECTION
Scope: Suite shared visual language and team-theme contract
Reference implementations: Irish Watch and Buckeye Watch

## Purpose

Suite should feel authentically team-specific without becoming a separate application for every program.

The visual model is:

Suite Core -> Team Theme -> Team Media

Suite owns structure, behavior, hierarchy, components, interaction, responsive rules, accessibility, and game-state behavior.

Team identity supplies semantic theme values and approved media. Team-specific identity must remain data, not scattered application code.

## Design principles

1. Siblings, not clones
Irish Watch and Buckeye Watch use the same Suite components, but should not feel like simple color swaps.

2. Team identity is data
Adding Indiana or BYU must not require team-specific selectors or branches in shared Suite CSS/JS.

3. Media is progressive
Every major visual surface must work at three levels:
- Level 1: theme, texture, and data only
- Level 2: rights-cleared editorial imagery
- Level 3: licensed official marks, photography, player imagery, and other approved assets

4. Game state changes the experience
Suite recognizes OFFSEASON, UPCOMING, GAMEDAY, PREGAME, LIVE, FINAL, and POSTGAME. State affects hierarchy and restrained motion, not just labels.

5. Authenticity without imitation
Do not reconstruct protected marks, trace official artwork, or use unlicensed photography as production assets. The architecture must allow approved assets to replace fallbacks without redesigning components.

6. Accessibility is part of identity
Team colors never override contrast, focus, reduced-motion, readable type, or non-color state cues.

## Shared Suite components

### Cinematic Matchup Hero
One component for upcoming, pregame, live, final, and postgame.

It owns:
- information hierarchy
- matchup layout
- score/status placement
- network/time/venue placement
- media overlay behavior
- responsive collapse
- fallback rendering

Team theme owns:
- surface foundation
- accent/light treatment
- texture
- approved media
- approved marks

### Game Status System
Shared semantic states:
- UPCOMING
- RANKED
- LIVE
- FINAL
- DELAYED
- POSTPONED

Live and outcome semantics are Suite-owned. Scarlet, gold, or another team color must never independently mean win/loss/live.

### Game Flow and Key Moments
A shared timeline for scoring and meaningful events. Team accent identifies the user's team; event meaning remains semantic and readable without color.

### Season Journey
Schedule becomes a season narrative rather than a plain list while retaining scannability and accessibility. Past, current/next, home/away, rivalry/trophy, ranked opponent, live, and final are shared states.

### Team Focus
National surfaces such as Top 25 visually anchor the active team using the theme contract. The treatment is shared; the colors and texture are team data.

### Team Texture Layer
Optional, low-opacity, non-interactive visual layer. It must be original or rights-cleared and may never be required to understand content.

## Semantic theme contract

Do not expose dozens of raw CSS choices in each team config. Prefer semantic identity values that Suite maps into its visual system.

Existing Phase 6 identity tokens remain valid. Evolve toward semantic roles such as:

```
identity.visual = {
  personality: "...",
  primary: "...",
  secondary: "...",
  accent: "...",
  accentText: "...",
  surface: "...",
  surfaceRaised: "...",
  surfaceHero: "...",
  glow: "...",
  texture: "...",
  typography: {
    ui: "...",
    display: "...",
    headline: "..."
  }
}
```

Exact schema is an implementation decision after inspection. Do not duplicate values already represented cleanly in the current identity contract.

Suite owns semantic game colors and accessibility behavior.

## Media contract

Design components to accept optional approved assets without depending on them.

Conceptual capability:

```
media = {
  marks: { primary, secondary, wordmark },
  hero,
  stadium,
  players,
  fallback
}
```

Each asset should eventually carry enough provenance/rights metadata for the product to know whether it is an LND-owned fallback, provider-supplied editorial media, or licensed official media.

Do not implement a fake rights system merely to satisfy this document. This is the target architecture.

## Reference theme: Irish Watch

Personality:
Historic, cinematic, architectural, storied, warm.

Visual direction:
- midnight/deep navy foundation
- warm metallic-gold illumination
- restrained ivory/stone neutrals
- collegiate-Gothic-inspired original geometry
- elegant editorial headline character
- atmospheric depth and warm light
- subtle texture rather than decorative logos

The selected visual north star is the cinematic Irish Watch board developed September 2026. Protected Notre Dame marks and unlicensed photography shown in concept imagery are references only, not production assets.

Do not create lookalike ND monograms, shamrocks, leprechauns, helmet marks, Dome illustrations, or reconstructed official marks as substitutes.

## Reference theme: Buckeye Watch

Personality:
Bold, athletic, geometric, modern, confident.

Visual direction:
- dark charcoal foundation
- scarlet energy
- cool gray/white neutrals
- stronger geometric texture
- sharper visual rhythm than Irish Watch
- cooler, higher-contrast illumination
- modern athletic/editorial character

Use the same Suite components as Irish Watch. Do not reproduce Notre Dame's Gothic treatment in scarlet.

Existing approved Project LND Buckeye Watch original assets remain the production-safe fallback until licensed/approved Ohio State assets are available.

## Typography

Typography is semantic and team-aware, but proprietary institutional font files must not be copied, redistributed, or bundled without appropriate rights.

A theme may name an intended family with safe fallbacks. Production must use a font we have rights to load.

## Motion

Motion should communicate state:
- restrained reveal for content
- score/status transitions
- live pulse
- timeline progression
- expansion/collapse feedback

No decorative constant motion.

prefers-reduced-motion must preserve the full experience without animation.

## Responsive behavior

Design mobile first. Current bottom navigation and five destinations remain:
Home / Top 25 / Game / Depth / News.

This design system does not authorize an IA redesign.

Game remains the central navigation action.

Desktop/tablet may increase media presence and density but must use the same component hierarchy.

## Scalability acceptance test

A new configured team such as Indiana or BYU must be able to receive:
- its own palette
- its own surface foundation
- its own typography tokens
- its own texture
- its own approved media/assets

without adding team-name checks or team-specific selectors to shared Suite code.

If a new team requires editing a shared component because of its identity alone, inspect the abstraction before adding the exception.

## Initial implementation sequence

1. Preserve current Phase 7 behavior and team-selection work.
2. Extend the existing semantic token system only where a shared component genuinely needs a new role.
3. Build/refine Cinematic Matchup Hero.
4. Build shared Game Status primitives.
5. Build Game Flow / Key Moments.
6. Evolve Schedule toward Season Journey.
7. Apply Team Focus to Top 25.
8. Add optional Team Texture Layer.
9. Validate Irish Watch and Buckeye Watch side by side at desktop and mobile widths.
10. Run full functional, live-score, cache-isolation, accessibility, and regression checks before merge.

Player-profile expansion and a full photography/media pipeline follow after the first six shared components; they should not block Visual System v1.

## Non-goals

- no new navigation destinations
- no account/My Teams work
- no backend requirement
- no premium features
- no team-specific application forks
- no copied official marks
- no unlicensed photography bundled as production assets
- no proprietary institutional font files
- no changes that compromise live-score consistency

## Definition of success

Irish Watch should feel historic and cinematic.
Buckeye Watch should feel bold and athletic.
Both should unmistakably be Suite.
Neither should feel like the other with different hex values.
Indiana and BYU should be able to join without redesigning Suite.
