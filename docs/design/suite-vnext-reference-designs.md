# Suite vNext Reference Designs

Status: DESIGN SPEC
Depends on: Suite Visual System v1
Reference teams: Irish Watch, Buckeye Watch

## Shared screen grammar

Both reference themes use the current five-destination Suite:
Home / Top 25 / Game / Depth / News.

The design target is the same information architecture with a stronger visual hierarchy. No screen below implies a new navigation destination.

### Global hierarchy

1. Sticky product/team header
2. Context strip or primary game state
3. Screen-specific primary content
4. Supporting content
5. Raised center Game action in bottom navigation

Mobile is the primary composition. Wider screens gain breathing room and media density, not a different product.

## Component 01: Cinematic Matchup Hero

### Purpose
Make the current or next game the emotional and informational anchor of Home.

### Shared anatomy
- eyebrow: NEXT GAME / PREGAME / LIVE / FINAL
- opponent
- active-team ranking/record where useful
- date and kickoff or game clock
- venue
- network
- spread/forecast only when data exists
- optional approved media layer
- optional texture layer
- action into Game Center

### Upcoming
Opponent is largest text. Kickoff is secondary. Media/texture may carry more visual weight.

### Pregame
Kickoff/countdown gains prominence. Forecast/network remain visible. Avoid fake urgency before game state warrants it.

### Live
Score and clock become dominant. Decorative media recedes behind a stronger scrim. Live state is semantic red/white and cannot be inferred from team accent.

### Final
Final score dominates. Result state uses Suite win/loss semantics, not team color alone. Key Moments/recap becomes the primary next action.

### Media fallback
If no rights-cleared image exists, render the full hero using surfaceHero + glow + texture. Never show a broken image or generic stock football photo.

## Component 02: Game Status

Shared pills:
- LIVE: semantic live color + dot + text
- FINAL: neutral
- UPCOMING: neutral
- RANKED: trophy/ranking treatment using accessible team emphasis
- DELAYED/POSTPONED: explicit text and semantic warning treatment

Team accent may frame a pill but does not redefine its meaning.

## Component 03: Game Flow / Key Moments

### Layout
Vertical event rail on mobile. Time/quarter left, event marker on rail, event copy right.

Events for active team receive team emphasis. Opponent events remain readable and neutral. Scoring value and running score remain tabular.

Initial event types:
- touchdown
- field goal
- safety
- interception/turnover
- final

Do not invent event importance. Render only normalized game data TeamOS can support.

## Component 04: Season Journey

Keep the schedule's existing row usability and expansion behavior, but establish a visual season axis.

Each game supports:
- month/day
- home / away / neutral
- opponent
- opponent rank
- network/time
- final score + W/L
- live state
- trophy/series
- current/next marker

Past games recede slightly. Next/current game receives the strongest team emphasis. The treatment must remain a list semantically for accessibility.

## Component 05: Team Focus

Used in Top 25 and other national contexts.

The active team row gets:
- team-accent edge
- subtle team-surface tint
- slightly stronger type
- accessible focus treatment

Do not enlarge it enough to distort rankings or imply a different rank.

## Component 06: Team Texture

Decorative only. Pointer-events none. Hidden or reduced when media makes it noisy.

Texture must be original or rights-cleared.

Irish Watch:
- abstract collegiate-Gothic arches/tracery
- fine vertical architectural rhythm
- warm gold illumination
- never trace the Golden Dome or protected Notre Dame artwork

Buckeye Watch:
- bold rectilinear/geometric rhythm
- athletic striping/grid influence
- cooler neutral illumination with scarlet energy
- no Block O reconstruction or protected Ohio State artwork

## Irish Watch vNext

### Emotional target
A Saturday-night Notre Dame editorial experience: historic, atmospheric, confident, premium.

### Existing identity mapping
Current deep navy surface scale remains the foundation. Existing gold remains accent. Warm paper/ivory is preferred over clinical white where Suite neutrals allow it.

### Hero
Deep navy cinematic surface with warm radial gold light. Original Gothic geometry appears at very low opacity. Media, when rights-cleared, uses a dark navy scrim so game information remains primary.

### Header
Product name stays crisp and restrained. Do not use an unofficial pseudo-ND mark. When approved official identity becomes available, the asset slot can accept it without moving the header.

### Schedule
Gold season axis, warm current-game marker, muted completed games.

### Game Center
Score typography is the strongest numeric voice in the product. Key Moments uses warm gold for active-team events. Live semantics remain Suite red/white.

### Top 25
Notre Dame row receives a narrow gold edge and navy/gold tint, not an oversized promotional card.

### News
Editorial feel: stronger headline hierarchy, restrained thumbnails, source/time metadata secondary.

## Buckeye Watch vNext

### Emotional target
A modern Saturday broadcast package: bold, fast, disciplined, athletic, premium.

### Existing identity mapping
Current charcoal scale remains the foundation. Scarlet remains a fill/identity accent. Current accessible light accentText remains essential.

### Hero
Charcoal/black cinematic surface. Scarlet light enters as a controlled edge/radial energy source. Original geometric texture is sharper than Irish Watch and never Gothic.

### Header
Same Suite geometry as Irish Watch, but type and accent treatment feel cleaner and more modern. No unofficial Block O substitute.

### Schedule
Scarlet current-game edge, crisp gray axis, stronger rectangular rhythm.

### Game Center
Same score hierarchy and Key Moments component. Scarlet identifies Ohio State events; live semantics remain Suite red/white and are differentiated by label/icon/state.

### Top 25
Ohio State row receives scarlet edge plus charcoal/gray emphasis. Scarlet text is not used where current contrast rules reject it.

### News
Sharper card geometry and cooler neutral surfaces while retaining the same Suite content structure.

## Side-by-side acceptance matrix

| Trait | Irish Watch | Buckeye Watch | Suite-owned? |
| --- | --- | --- | --- |
| Navigation | same 5 destinations | same 5 destinations | yes |
| Game hero anatomy | same | same | yes |
| Hero personality | historic/cinematic | modern/athletic | no |
| Surface foundation | navy | charcoal | team |
| Illumination | warm gold | cool/scarlet | team |
| Texture | Gothic-inspired geometry | rectilinear athletic geometry | team |
| Live semantics | same | same | yes |
| Game Flow anatomy | same | same | yes |
| Schedule anatomy | same | same | yes |
| Top 25 focus behavior | same | same | yes |
| Official media | optional/rights-gated | optional/rights-gated | contract |
| Responsive behavior | same | same | yes |

## Implementation mapping to current code

The existing Phase 6 architecture already provides:
- identity.colors
- identity.fonts
- identity.assets
- TeamOS.identity validation
- --t-* CSS tokens
- team-neutral shared selectors

Do not replace these.

For Visual System v1, inspect whether only these additional semantic roles are needed:
- surfaceHero
- glow
- texture

Prefer deriving visual effects from existing accent/surface RGB tokens when that preserves each reference design. Add config only when the team genuinely needs to choose a different semantic value.

Do not add personality strings that CSS branches on. Personality is a design description, not runtime logic.

## Production asset rules

Allowed now:
- original LND textures
- original LND interface icons
- rights-cleared fonts
- team data/names used appropriately in editorial context
- existing approved/fallback product artwork

Rights-gated:
- official school logos/marks
- official wordmarks
- institutional artwork
- player/team photography
- stadium/campus photography not owned/licensed by LND
- broadcast imagery/video

A concept mockup may illustrate a future licensed state, but production files must follow the rights-gated rule.

## Phase 1 implementation handoff

Claude should implement only the shared component foundation first:
1. Cinematic Matchup Hero using existing data
2. Game Status primitives
3. optional decorative texture hook/fallback
4. Team Focus treatment
5. visual regression for ND + OSU

Then:
6. Game Flow / Key Moments from data already available
7. Season Journey evolution

Do not combine this with team-selector logic changes. Rebase onto the completed Phase 7 platform before implementation if Phase 7 lands first.

## Visual QA

Test at minimum:
- 375px phone
- 430px phone
- tablet/wide layout
- Notre Dame upcoming
- Notre Dame live fixture
- Notre Dame final fixture
- Ohio State upcoming
- Ohio State live fixture
- Ohio State final fixture
- no-media fallback
- reduced motion
- keyboard focus
- contrast
- cache isolation after switching ND -> OSU -> ND

A successful implementation should make screenshots identifiable as different team experiences even if all protected logos and photography are removed.
