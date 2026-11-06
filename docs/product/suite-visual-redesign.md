# Suite visual redesign — creative brief

## Purpose

Elevate Suite from a clean, functional sports dashboard into a distinctive, high-energy sports lifestyle experience that fans are excited to open. The product should feel like arriving at the stadium or arena on game day: anticipation, identity, energy and belonging.

This brief sets direction, not permission for an unbounded redesign. Inspect the current implementation and existing contracts before proposing or changing anything.

## Audience and emotional target

The audience is an engaged sports fan with an elevated athletic-lifestyle sensibility: Nike, Lululemon, Vuori and Rhoback. Premium means exceptionally executed sports culture, not formal luxury, elitism or exclusivity.

Desired reaction: "This is a damn cool sports app. I want to use this every Saturday."

## Creative principles

- Immersive stadium atmosphere through purposeful imagery, lighting, depth and team identity.
- Bright, sharp, confident color and expressive team color; avoid a timid or overly muted palette.
- Athletic typography and strong numeric hierarchy, especially for scores, countdowns, rankings and game situations.
- Video-game/broadcast-inspired motion that communicates real game changes and creates emotional moments.
- Clear, fast, approachable information design. Spectacle should never obscure comprehension.
- A shared Suite visual language, with team character supplied through configuration and approved team assets.

## Existing capability inventory — do not rebuild by assumption

The current source includes:
- Home lifecycle hero states (pregame, live, final and seasonal).
- Game Center with Game, Stats, Plays and Drive experiences, including scoreboard and live game information.
- Countdown and live game state.
- News rail and schedule previews.
- Around / Top 25, rankings and Season Outlook.
- Players, roster and depth-chart experiences.
- Navigation, refresh, offline/freshness handling, appearance settings and responsive/PWA behavior.
- Shared art, identity, typography and UI helpers.

This list is a starting point from prior source inspection, not a substitute for a fresh audit of current main. Verify current routes, states, data contracts, and actual rendered UI. Mark each idea as already present, visual-only improvement, interaction refinement, genuine gap, or not feasible/currently unsupported.

## Scope and sequence

### Phase 1 — Creative foundation
Produce an approved design system and screen-level direction:
- Current-state audit with evidence.
- Visual principles and anti-patterns.
- Color strategy, including relationship between Suite Style and Team Style.
- Typography and numeric hierarchy.
- Surface/card/border/shadow treatment.
- Photography and art direction, focal points, crop rules, and robust no-photo fallback.
- Motion principles, durations, easing, state transitions and reduced-motion behavior.
- Shared component inventory and migration strategy.
- Responsive and accessibility constraints.

### Phase 2 — Home and Game
Design existing screens, not new destinations:
- Home: pregame, live, final and offseason states.
- Game: pregame, live and final states; existing subviews and live data.
- Define loading, unavailable, stale/offline, error and no-art fallbacks.
- Use real normalized fields and actual existing TeamOS contracts. Never invent data for a production spec.

### Phase 3 — Propagation
Extend the approved language to Around, Players, News, Schedule and supporting screens. Preserve existing navigation and behavior unless explicitly approved otherwise.

### Phase 4 — Validation
Validate Notre Dame and Ohio State, both appearance modes, relevant lifecycle states, responsive widths, touch targets, keyboard/screen-reader behavior, reduced motion, offline/freshness, image failure, PWA install/update and performance. Include physical iPhone/Safari evidence when available; do not claim device validation from desktop CI.

## Technical constraints

- Keep the vanilla HTML/CSS/JavaScript PWA unless a concrete requirement proves otherwise.
- Preserve TeamOS/Suite separation. Suite consumes normalized TeamOS data; no provider-specific parsing in renderers.
- Team-specific identity and behavior remain in team configuration/data, not generic component conditionals.
- Preserve service worker, caching, offline behavior, install identity, accessibility and responsive behavior.
- Do not add backend services, paid assets, API keys or new data sources as part of a visual redesign without separate approval.
- No arbitrary/unlicensed photography. The no-photo state is a production design and must look intentional.
- Keep animation performant, purposeful, interruptible where appropriate, and respectful of prefers-reduced-motion.
- Do not use mockup text, generated scores, fabricated player information or other illustrative data as production content.

## Deliverables required before implementation

1. Current-state audit and exact file/component map.
2. Approved visual system proposal.
3. Home and Game screen designs for the specified states.
4. Asset plan distinguishing original/generated, licensed, existing and fallback assets.
5. Motion/interaction specification.
6. Engineering feasibility note identifying reuse, risks, unknowns and any backend/data dependencies.
7. Acceptance checklist and screenshot matrix.

After David approves the screen-level designs, Claude may implement the approved scope. Any material design departure returns for review.

## Definition of success

Suite feels immediately more immersive, athletic, distinctive and emotionally engaging while remaining just as usable, fast, accessible, reliable, team-scalable and information-rich as the existing product. Existing functionality is preserved. The result is judged from actual rendered screens and interactions, not code completion or a mood board.
