# Suite Visual System v1 — Claude Code Implementation Handoff

Branch with design source: `design/suite-visual-system-v1`

Read first:
1. `docs/design/suite-visual-system-v1.md`
2. `docs/design/suite-vnext-reference-designs.md`
3. existing identity decision docs and live-state decision docs

## Objective

Implement the first production slice of Suite Visual System v1 after the active Phase 7 team-selection work is complete.

This is a shared Suite enhancement. Do not build an Irish-Watch-only redesign and then duplicate it for Ohio State.

The finished slice must make:
- Irish Watch feel historic, cinematic, architectural, warm
- Buckeye Watch feel bold, athletic, geometric, modern

while preserving the same Suite component anatomy and current five-destination IA.

## Integration rule

Do not implement this from the old main snapshot if Phase 7 has landed. Start from the completed/merged Phase 7 platform state, then bring these design docs forward.

Do not change Phase 7 team resolution, chooser, persistence, manifests, service-worker team isolation, or URL behavior unless a visual-system requirement exposes a real defect.

## Current architecture to preserve

The inspected code already has:
- `TEAM_CONFIG.identity`
- `TeamOS.identity.create()`
- semantic `--t-*` tokens
- `paintIdentity()`
- team-neutral shared CSS selectors
- `TeamOS.live` as the single reconciliation rule for live game truth
- current Home / Top 25 / Game / Depth / News navigation
- raised center Game action

Extend these. Do not replace them.

## Slice A — implement now

### A1. Cinematic Matchup Hero

Refactor the existing `#hero` presentation without breaking its data contract.

Keep existing IDs consumed by app.js unless there is a compelling accessibility reason:
- hero
- heroHead
- heroWhen
- heroOpp
- heroLine
- heroVenue
- heroSeries
- heroWx
- heroSpread
- heroClock

Required visual states:
- upcoming
- live
- final-ready styling if/when current render path supplies a final game
- no-media fallback

The hero must look intentional with zero photography and zero official marks.

Do not add stock imagery.

Do not add a Notre Dame or Ohio State logo as decoration.

### A2. Shared Game Status primitive

Create one shared visual language for live/final/upcoming/delayed-like states where the current data supports them.

Rules:
- live remains semantic, not team-colored
- team accent may frame identity but may not mean live/win/loss by itself
- state must be understandable without color
- preserve reduced-motion behavior

Do not invent provider states the normalized model does not currently expose.

### A3. Team Texture hook

Add a decorative team texture capability only if it can stay semantic and team-neutral in shared code.

Preferred implementation:
- Suite exposes a texture layer/hook
- identity supplies an optional texture asset or semantic texture value
- absence produces a clean hero, not a broken/missing state

Production textures must be original LND artwork. Do not trace:
- ND monogram
- shamrock
- leprechaun
- Golden Dome
- Notre Dame helmet marks
- Block O
- Ohio State wordmarks/marks

If no production-safe texture asset exists at implementation time, ship the hook with CSS-generated abstract geometry or leave the optional asset unset. Do not improvise protected artwork.

### A4. Team Focus

Apply the shared active-team focus treatment to Top 25/national rows:
- narrow team-accent edge
- subtle team-surface/accent tint
- slightly stronger hierarchy
- no rank distortion
- keyboard focus remains obvious

Reuse the existing `.mine` concept if appropriate instead of creating duplicate semantics.

### A5. Reference-theme distinction

Use the smallest semantic identity extension required to produce meaningful ND/OSU distinction.

Before adding fields, test whether current:
- accent / RGB
- surface / deep / abyss / raise
- accentText / accentSoft / tints
- font stacks

can derive the desired effect.

Only add new identity roles when genuinely necessary. Candidate roles:
- `surfaceHero`
- `glow`
- `texture`

Do not add a runtime `personality: "historic"` switch and branch CSS on team personality.

Do not add selectors such as:
- `.notre-dame ...`
- `.ohio-state ...`
- `[data-team="..."] ...`

unless the selector is solely attaching a team-owned asset in a way the identity contract cannot reasonably express. Prefer config.

## Slice B — after Slice A is stable

### B1. Game Flow / Key Moments

Use normalized data already available to the current Game Center.

Mobile: vertical event rail.

Required:
- quarter/time
- event description
- team association
- running score where data provides it
- active-team event emphasis via semantic team accent
- opponent event neutral treatment

Do not infer "key" importance beyond the event data currently available. If the current feed only reliably supports scoring plays, call/render the section accordingly rather than pretending we have richer event intelligence.

### B2. Season Journey

Evolve the current schedule list rather than replacing it with inaccessible decorative markup.

Preserve:
- row expansion
- home/away/neutral
- ranking
- network/time
- score/W-L
- live state
- trophy/series
- current/next semantics

Add a subtle season axis/current marker while keeping list semantics and scan speed.

## Irish Watch visual rules

- preserve deep navy foundation
- warm gold acts as illumination as well as accent
- warm paper/ivory neutrals
- original abstract Gothic/architectural geometry only
- restrained cinematic depth
- no pseudo-ND logo
- no protected ND artwork
- no unlicensed team/player/stadium photography

The hero should feel like Notre Dame football through atmosphere and editorial hierarchy, not counterfeit marks.

## Buckeye Watch visual rules

- preserve charcoal foundation
- scarlet is identity/action energy, not general text
- keep current accessible `accentText` behavior
- cooler gray/white neutrals
- sharper rectilinear/geometric rhythm
- stronger athletic visual cadence than Irish Watch
- no Block O substitute
- no protected Ohio State artwork
- no unlicensed team/player/stadium photography

Do not simply recolor the Irish Watch Gothic treatment scarlet.

## Rights-aware media rule

Build media surfaces so approved assets can be added later without component redesign.

Production now may use:
- original LND textures
- original LND UI icons
- fonts we have rights to load
- existing approved product assets

Treat official school marks, institutional artwork, player/team/stadium photography, and broadcast imagery as rights-gated.

Do not interpret a URL returned by ESPN or another provider as blanket permission to bundle/rehost media. Keep current linked editorial imagery behavior separate from LND-owned product assets.

## Accessibility

Do not regress:
- focus-visible
- WCAG contrast checks in TeamOS.identity
- reduced motion
- semantic headings
- tab/tabpanel behavior
- screen-reader game context
- non-color status meaning

Any new normal-size text must meet 4.5:1.

Decorative textures must be ignored by assistive tech and must not reduce text contrast.

## Live-score invariant

The visual work may not create a second game truth.

`TeamOS.live` remains authoritative for reconciliation.

Do not add:
- another polling timer
- a hero-only fetch
- a component-local score cache
- a new game-state derivation that can disagree with reconciled state

All surfaces must consume the same reconciled game state.

## Regression requirements

Before commit/PR, run the repository's existing automated checks, including adapter/platform and live checks.

Browser QA:
- 375px
- 430px
- tablet/wide
- ND upcoming fixture/state
- ND live fixture/state
- ND final fixture/state where supported
- OSU upcoming
- OSU live
- OSU final where supported
- no-media fallback
- reduced motion
- keyboard navigation/focus
- offline/cache behavior
- ND -> OSU -> ND switch without clearing cache

Confirm no console errors.

Confirm live score cannot disagree among hero, schedule, Game Center, and Top 25 for the same event.

## Architecture acceptance test

Before calling this complete, answer:

1. Did shared Suite code gain any team-name conditional?
2. Did shared CSS gain any team-specific selector?
3. Could Indiana receive a distinct theme through identity/config alone?
4. Could BYU receive a distinct theme through identity/config alone?
5. Does the experience still work with all optional imagery removed?
6. Can licensed official media be added later without restructuring the component?

If 1 or 2 is yes, explain why and inspect whether the abstraction is wrong before proceeding.

## Deliverable report

Return:
- branch
- commit SHA(s)
- files changed
- screenshots/visual verification performed
- automated test totals
- ND/OSU side-by-side differences
- accessibility verification
- live-state verification
- any identity-contract changes and why they were unavoidable
- any rights-gated asset slots intentionally left empty
- known limitations
- recommendation to merge or not merge

Do not merge to main automatically.
