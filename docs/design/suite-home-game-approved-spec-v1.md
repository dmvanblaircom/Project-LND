# Suite visual redesign — approved visual system and Home/Game specification

**Version:** 1.0  
**Status:** Approved design direction; implementation not yet authorized  
**Creative authority:** ChatGPT (Creative Director)  
**Product approval:** David, 2026-11-06  
**Engineering owner:** Claude Code  
**Source audit:** `docs/design/suite-visual-redesign-current-state-audit.md` (2026-11-06)  
**Decision:** `docs/decisions/0040-suite-creative-direction-and-design-partnership.md`

This document records the approved visual direction and the screen-level design boundaries for Phase 2. It is the design authority for Home and Game implementation. It does not authorize changes to TeamOS contracts, new product features, or implementation outside the scope below.

---

## 1. Approved decisions

David approved all eight recommendations:

1. Desktop Home and Game compositions are included in Phase 2.
2. Scores, clocks, ranks and other key numeric information use one Suite-wide numeric face in both App Styles.
3. Suite Style remains and becomes a distinct, finished platform appearance.
4. Georgia is removed from interface section headings and headlines.
5. Shared original/generated stadium environment art is combined with CSS/SVG lighting and atmosphere.
6. Game moments are selective, evidence-based and designed around the 30-second polling cadence.
7. Phase 2 uses existing normalized TeamOS fields only; no new TeamOS fields or backend changes.
8. iOS Safari 16.4 is the oldest supported browser for the design.

These approvals settle design direction. They do not override the product/engineering approval rules in Decision 0040 or Decision 0039.

## 2. Product feeling and design thesis

### Saturday Night. Under the Lights.

Suite should feel like entering a great stadium on game day: anticipation, identity, energy and belonging. It combines:

- stadium atmosphere and the emotional scale of game day;
- the confidence and hierarchy of a high-quality sports broadcast;
- the immersion and responsiveness of a modern sports video game;
- the approachable, polished visual confidence of premium athletic lifestyle brands.

The target is not formal luxury, elitism, a dark-only dashboard, or a betting terminal. It should feel like a sports product fans want to open every Saturday.

### Five design principles

1. **Atmosphere:** purposeful stadium environment, lighting, depth and team identity.
2. **Energy:** vivid team color, crisp contrast, expressive typography and strong numbers.
3. **Confidence:** decisive hierarchy and compositions that make important information unmistakable.
4. **Immersion:** context-aware visual states and motion tied to real changes.
5. **Clarity:** information, readability, accessibility and speed always outrank spectacle.

Target balance: approximately 80% polished sports product and 20% immersive sports spectacle. Spectacle is concentrated in the Home hero, Game scoreboard, Drive Tracker and genuine game moments. Supporting information remains quick to scan.

## 3. Visual system

### 3.1 Color architecture

The system has three surface families.

**A. Stadium surfaces**
- Deep team-colored or Suite-branded surfaces.
- Layered light, depth, subtle texture and atmospheric art.
- Used for Home lifecycle heroes, Game scoreboard and selected high-value moments.
- Must keep scores, state labels and controls legible under every team's tokens.

**B. Everyday surfaces**
- Bright pearl/chalk page backgrounds and clean light surfaces.
- Strong ink, readable body type and deliberate spacing.
- Used for news, schedule, stats, matchup metrics, box scores and supporting information.
- The energy of the hero should continue through typography and section composition, not by turning every card dark.

**C. Signal surfaces**
- High-contrast accents for LIVE, selected controls, primary actions, scores and meaningful state changes.
- Signals must be semantically consistent. Do not use decorative accent color as a substitute for hierarchy.
- Win/loss and status semantics remain distinguishable without color alone.

#### Team Style
- Existing 12 team identity color tokens remain the source of truth.
- Team colors influence hero lighting, atmospheric tints, selected states and action accents.
- Team colors do not automatically color every card or every data visualization.
- Neutral everyday surfaces preserve readability.
- All text, controls, focus indicators and status treatments must pass contrast checks for Notre Dame, Ohio State and the wider team set.

#### Suite Style
- A genuinely distinct Suite house identity, not a minor tint swap from Team Style.
- Foundation: midnight navy, bright pearl and ink.
- Primary accent: a vivid, energetic blue/cobalt family with accessible foreground/background pairings.
- Secondary refinement: restrained champagne/bronze, never the dominant action color.
- Primary CTA must have strong contrast against every surface. The existing navy-on-navy failure is unacceptable.
- Team logos and team identity remain visible where product context requires them, but the surrounding color language remains recognizably Suite.

Do not finalize token hex values by intuition alone. Claude should propose concrete tokens in implementation planning, test them against the contrast gate and both reference teams, and return any material departure for review.

### 3.2 Typography

Reduce the current competing typographic voices to one coherent system.

| Role | Direction |
|---|---|
| Team identity | Team-configured display face, used selectively for school/program identity |
| Scores and key numerals | One Suite-wide athletic numeric face, same in Team Style and Suite Style |
| Section titles | Modern sans-serif with confident weight and compact rhythm |
| Body and metadata | Existing configured UI face, tuned for readability |
| News headlines | Modern sans-serif; no Georgia |
| Labels and status | Compact uppercase or sentence case according to function; never tracked to the point of hurting readability |

Numeric requirements:
- The Suite numeric face is independent of `identity.fonts.display`.
- Use tabular numerals for scores, clock values, period, rank, record and other aligned figures.
- It must render reliably for all 138 teams and both App Styles.
- Test score pairs and longer values at 320px, 375px, 390px and desktop widths.
- Self-host and precache the font if a new family is selected, so a live score does not visibly swap faces after first paint.
- Team display faces may still be used for team names and selected identity moments. Do not let a school's font choice change the visual personality of the score system.

Remove Georgia from interface section headings and headlines. Do not replace it with another editorial serif by default. The design direction is a unified modern sans-serif system.

### 3.3 Shape, surfaces and hierarchy

- Hero compositions should be the screen's dominant experience, not a translucent card nested inside a decorative band.
- Use depth through lighting, tonal layering and restrained elevation—not indiscriminate glass, blur or metallic borders.
- Everyday cards should not all look identical. Vary composition according to content type: editorial story, schedule event, stat comparison, table, milestone.
- Use consistent spacing, type, radius, elevation and motion tokens. Introducing token families is allowed as a visual-system implementation detail; do not turn it into a broad unrelated refactor.
- Keep controls tactile and unmistakable. Selected, pressed, focused, disabled and loading states must be designed.
- Avoid ornamental accent bars on every heading, repeated generic white cards, oversized watermark logos behind critical information, and decorative gradients without a clear role.

### 3.4 Art direction

Use both shared original/generated environment art and CSS/SVG atmosphere.

Shared art direction:
- Original, team-neutral stadium environments; no school marks, logos, identifiable uniforms, trademarked end zones or recognizable licensed stadium photography.
- Motifs may include floodlights, crowd depth/bokeh, turf texture, tunnel entrances, stadium architecture and night sky.
- Create a small art family with purposeful crops/compositions for phone and desktop rather than one stretched image.
- Team color tinting is applied through the existing identity tokens.
- Art should add depth and emotion without competing with scores, team names or controls.

CSS/SVG direction:
- Light beams, field geometry, subtle grain, atmospheric glow, directional highlights and tonal overlays.
- Prefer transform and opacity for animation. Avoid expensive continuous blur, animated filters or large backdrop-filter layers.
- CSS/SVG alone must form a complete, attractive fallback if art does not load.

Asset and performance constraints:
- No provider news/player imagery may be repurposed as hero art.
- No per-team art dependency. The design must work for all 138 teams with shared art and tokens.
- Aim for a phone hero asset below approximately 120 KB, AVIF with WebP fallback where practical.
- Paint the CSS fallback first; never leave a blank hero while art loads.
- Art is non-essential to installation. A failed asset must not block PWA install or first paint.
- Cache shared art appropriately; preserve offline behavior.
- Generated art is a source asset, not a production screen mockup and not a substitute for actual browser screenshots.

### 3.5 Motion principles

Motion communicates meaningful state, not constant activity.

- Short, intentional, interruptible transitions.
- Respect `prefers-reduced-motion`; reduced motion retains all state information without movement.
- Never animate a value in a way that suggests data the app does not possess.
- No interpolated/ticking game clock. The clock is the latest polled provider value.
- No fake play-by-play, no haptics assumption on iOS Safari, no repeated animation on every render.
- A moment must fire once, only when a new change is observed while the app is visible and fresh, not on first/cached paint or after returning from background.
- Since live data refreshes every 30 seconds, a moment may be delayed by up to 30 seconds. Language and motion must communicate an update that has been detected, not a play happening in real time.

Approved event candidates, using only existing normalized fields:
- Score increase: brief numeric transition.
- Explicit touchdown/field goal/safety classification in the scoring data: a more distinctive but restrained score highlight.
- Turnover: brief situation emphasis only when the play classification explicitly identifies it. Possession change alone is not enough to infer a turnover.
- Confirmed pregame-to-live or live-to-final lifecycle change: dedicated state transition.
- Quarter change: no special animation in the initial Phase 2 implementation unless the existing data and diff logic make it unambiguous and David/Creative Director approve the treatment.

The diff must handle multiple scoring plays between refreshes without inventing a precise event time. If the exact latest event cannot be identified, use a generic score update moment. Announce meaningful changes through the existing live region for assistive technology.

---

## 4. Shared shell and responsive composition

### 4.1 Mobile-first, desktop intentional

Phone remains the primary touch experience. Desktop is not a stretched phone column.

**Phone**
- Preserve the existing navigation and screen routes.
- Keep the hero's key matchup/state/score/time information dominant.
- At widths below 360px, tertiary content drops first; no essential score, status, team identity or primary action may disappear.
- No horizontal page overflow, clipped tab labels or inaccessible controls.

**Tablet and desktop**
- At widths of 1024px and above, use a deliberate two-column composition where content permits.
- Home: hero and game/season context as the primary area; news and schedule as supporting content in a second column or lower editorial grid.
- Game: scoreboard across the content width; Drive Tracker/content stage as primary; box score, stats or play context as supporting column.
- Maintain readable line lengths and a clear content maximum. Do not simply expand text and tables across the entire monitor.
- Navigation should remain consistent with the app shell and not float over content in a way that obscures it.

Intermediate widths must transition naturally; avoid a single brittle breakpoint.

### 4.2 Browser floor

Design and implementation target iOS Safari 16.4 and later. Use progressive enhancement for newer APIs. If an effect is unsupported, preserve a complete static or CSS fallback. Do not use scroll-driven animation as a required behavior.

### 4.3 Accessibility and reliability

- Preserve the existing semantic structure and live region.
- Keyboard focus remains visible and not obscured.
- Touch targets remain practical at phone widths.
- Do not communicate state with color alone.
- Maintain contrast for both App Styles and unusual team palettes.
- Respect reduced motion.
- Preserve offline, cached-data and freshness messaging.
- Images and marks are optional enhancements; their failure cannot damage layout or information hierarchy.

---

# 5. Home screen specification

**Purpose:** Home is the emotional front door to a team's season. It should make the fan feel connected to the team and immediately understand what matters now.

Existing model sources, as listed by the audit:
- `TeamOS.game.hero`
- `Game`
- `TeamOS.game.schedulePreview`
- `NewsItem[]`
- `TeamOS.outlook.metrics`
- `TeamOS.milestones.wins`
- `TeamOS.champions.defending`
- `TeamOS.notes.forGame`
- `TeamOS.freshness.summary`
- `TeamOS.season.offseason`
- `TeamOS.prospects`

No new TeamOS fields are permitted in Phase 2.

### 5.1 Shared Home structure

1. Team identity and current lifecycle hero.
2. Existing trophy/rivalry context when available.
3. Existing milestone card when applicable.
4. Existing defending champion context when applicable.
5. By the Numbers from existing game notes.
6. Latest News rail (three existing stories).
7. Schedule preview (last result and next three, per current behavior).
8. Season Outlook summary.

Preserve existing content and navigation. Improve visual rhythm and hierarchy rather than adding duplicate widgets. The content below the hero should retain energy through section typography and varied editorial composition without turning every surface into a stadium graphic.

### 5.2 Pregame

**Emotional goal:** anticipation. The upcoming matchup should feel like an event.

Hero hierarchy:
1. Team identity and program name.
2. Opposing matchup: two sides with meaningful visual presence, facing one another.
3. Kickoff countdown using existing countdown information; do not invent a ticking second-by-second timer.
4. Date, kickoff time, network and venue when present.
5. Clear primary action into the existing Game experience.
6. Shared stadium environment art and team-tinted lighting.

The opponent must have enough visual presence to feel like a real contest. Avoid a tiny opponent logo beside an oversized home-team wordmark. Keep school identity expressive without allowing long names to crowd the matchup.

Below the hero, preserve existing trophy/rivalry, milestone, champion, notes, news, schedule and outlook information.

### 5.3 Live

**Emotional goal:** the stadium is alive; the fan knows exactly where the game stands.

Hero hierarchy:
1. Clear LIVE state.
2. Both team identities and large Suite numeric scores.
3. Period and the actual provider-supplied clock.
4. Possession and down/distance grouped into one readable game-situation area.
5. Network and other available context.
6. Strong CTA into Game Center.

Score is the centerpiece. Stadium art and watermark elements must never compete with the score, clock or game situation. No logo/mark is required for the hero to work.

Below the hero, preserve existing milestone, champion, notes, news, schedule and outlook content. The live game remains dominant; supporting content remains scannable.

### 5.4 Final

**Emotional goal:** the result feels consequential and memorable.

Hero hierarchy:
1. FINAL status.
2. Both team identities and final scores.
3. Clear outcome from the followed team's perspective.
4. Margin and record only when supported by existing data.
5. Visual treatment responds to win/loss without inventing sentiment.
6. CTA into the completed Game Center.

A win may receive a confident celebratory accent. A loss should remain composed and respectful. Do not use fireworks or imply a result beyond the actual data. Existing milestones and season context remain below the hero.

### 5.5 Offseason

Offseason is not an empty state. It is a season transition.

**S2 — regular season complete**
- Existing season record.
- Existing final ranking where available.
- Last result.
- Next-season context.
- Existing relevant outlook/season content.

**S4 — season complete**
- A more substantial season-end composition.
- Existing final record and ranking where available.
- Last result and next season.
- Existing Recruiting and NFL Draft information from `TeamOS.prospects` where available.

**S5 — next season published**
- Reuse the existing upcoming-game hero/card pattern with the confirmed next-season opener from the existing offseason model.
- Treat the previously audited missing/empty hero behavior as a defect fix, not a new data feature.
- Do not synthesize a matchup or infer a date.

### 5.6 Home loading, unavailable and failure states

| Condition | Required design |
|---|---|
| Initial loading | Stable team identity and hero shell; CSS atmosphere paints immediately; no blank hero or large layout jump |
| No upcoming game | Intentional seasonal/no-game composition using existing model data |
| Missing logo | Deliberate initials/mark fallback with controlled scale and contrast; never oversized behind critical text |
| Missing hero art | Complete CSS/SVG stadium atmosphere |
| Missing news photo | Designed editorial source treatment; no empty photo-shaped body or repeated blank tile |
| Stale data | Existing freshness banner remains visible and distinct from LIVE |
| Offline | Cached information remains readable; existing offline/freshness status is clear |
| Failed refresh | Preserve last known content and communicate failure; never replace useful data with fabricated values |

### 5.7 Home acceptance criteria

- Pregame, live, final, S2, S4 and S5 each have an intentional composition.
- Hero is a screen-level experience, not a translucent card inside a band.
- Team identity is clear without relying on a loaded logo or photo.
- Suite Style and Team Style are visually distinct and both pass contrast.
- The score/numeric system is identical across team display fonts.
- The 320px–desktop range has no clipping or horizontal page overflow.
- Desktop uses an intentional content grid.
- Existing Home sections and navigation remain present.
- Loading, stale, offline, missing-image and failed-refresh states are designed.
- No new TeamOS fields or data sources are introduced.

---

# 6. Game Center specification

**Purpose:** Game Center is the broadcast and the field. It should be a more immersive, game-focused experience than Home, not simply a smaller Home hero followed by generic cards.

Existing data sources, as listed by the audit:
- `Game`
- `GameDetail`: teams, linescore, drives, lastPlay, situation, box, leaders and team stats
- season `SeasonStat[]` for Matchup
- `Weather`
- `TeamOS.notes`

No new TeamOS fields are permitted in Phase 2. In particular, do not add a win-probability series to GameDetail as part of this work.

### 6.1 Shared Game structure

Three zones:
1. **Scoreboard:** team identities, scores, lifecycle status and game situation.
2. **Game navigation:** existing Game, Stats, Plays and Drive experiences as applicable to lifecycle.
3. **Content stage:** the selected existing view, with hierarchy appropriate to its content.

The Game tab strip must be redesigned for phone widths. The existing four equal-width, nowrap tabs cause the longer Drive Tracker label to crowd/clip at 390px.

Design constraints:
- Do not force four equal-width tabs when labels do not fit.
- Use measured/scrollable widths or another accessible compact pattern.
- Selected state must be obvious.
- All tabs remain discoverable and operable by touch and keyboard.
- No clipping, hidden first letters or horizontal page overflow.
- Move the standalone Full Schedule link out of the live content lead position; preserve access without letting it interrupt the live experience.

### 6.2 Pregame — Game Details

**Emotional goal:** anticipation and matchup context.

Scoreboard:
- Team identities and opposing team.
- Records/ranks when present.
- Existing countdown (days/hours/minutes).
- Date, kickoff time and lifecycle state.
- No live-only situation elements or simulated clock.

Preserve the existing Game Details content:
- Venue and network.
- Trophy/rivalry context.
- Weather when available.
- Matchup metrics and national ranks.
- Leaders and team toggle.
- Trophy card.
- By the Numbers.
- Game notes link.

Visual treatment:
- Matchup metrics become easier to compare through hierarchy and restrained visualization.
- Leaders receive clear visual priority using existing player information.
- Do not add player photography, new player profile interactions or betting-style odds.
- Desktop should use a two-column composition where matchup/context and leaders can sit alongside the primary game information without making the page a 640px phone column.

### 6.3 Live — Drive Tracker leads

**Emotional goal:** follow the game as a broadcast, with the field as the central visual anchor.

Scoreboard:
- Large, consistent Suite numeric scores.
- LIVE state.
- Actual period and provider-supplied clock.
- Possession, down and distance grouped into a single situation bar.
- Team identities and marks.
- Network when present.

Drive Tracker:
- Build on the existing SVG field; do not replace it with a new data model.
- Give the field more visual space and broadcast presence.
- Improve contrast among turf, yard lines, end zones and markers.
- Make possession and line of scrimmage clear.
- Make first-down marker clearly distinct.
- Use the possessing team's existing color where appropriate.
- Ensure the field remains understandable without team logos.
- Do not animate an entire play sequence unless a separate approved interaction spec is produced. Phase 2 can add only the approved event moments below.

Preserve all existing live information and views:
- Last Play and tags.
- Score by Quarter.
- Game Stats bars.
- Box Score with collapsible categories and persistent user choices.
- Plays and scoring drives.
- Stats.

Visual roles:
- Drive Tracker: immersive broadcast diagram.
- Plays: chronology and scoring-drive context.
- Box Score: dense, legible table with aligned figures.
- Stats: clear comparisons and paired bars.
- Last Play: concise emphasis without inventing narrative.

Desktop:
- Scoreboard spans the content width.
- Drive Tracker is the primary content area.
- Box Score, stats and play context occupy a supporting column or secondary region.
- Preserve every existing view and control.

### 6.4 Final

**Emotional goal:** a clear, confident result and a useful record of the game.

Scoreboard:
- FINAL status.
- Both teams and final scores.
- Winning side visually emphasized.
- Losing score softened as existing behavior allows.
- Clear result from the followed team's perspective, using available team and score data.

Default content remains Box Score. Plays/scoring drives and Stats remain accessible. Do not create an unsupported editorial recap or infer player performance beyond existing data.

The final hero should feel like a result composition, not the live hero with the LIVE pill replaced by FINAL.

### 6.5 Game loading, unavailable and failure states

| Condition | Required design |
|---|---|
| Initial loading | Stable scoreboard skeleton; reserve dimensions to avoid layout shift |
| Missing logo | Controlled initials/mark fallback; never place large outlined initials behind score/clock |
| Missing field/situation data | Preserve scoreboard and show a clear unavailable state for that region |
| Missing clock/situation | Omit missing values; never substitute a ticking/interpolated clock |
| Missing box score | Distinguish unavailable from zero; preserve other available views |
| Stale data | Existing freshness banner; retain last known values and disclose staleness |
| Offline | Cached game information remains readable; no simulated updates |
| Failed refresh | Preserve last known state and clearly communicate refresh failure |

### 6.6 Game acceptance criteria

- Pregame, live and final are compositionally distinct.
- Drive Tracker is the lead live experience.
- Scoreboard typography is consistent across all teams and App Styles.
- The tab strip is usable at 320px, 375px and 390px.
- The existing Full Schedule route remains accessible but no longer interrupts the live content lead.
- Desktop is an intentional two-column experience.
- Every existing Game view and data capability is preserved.
- All image/mark failure states remain designed.
- No fake clock, unsupported event classification or invented game information.
- No new TeamOS fields, backend services or data sources.

---

## 7. Game moments: approved event policy

The audit's smallest correct approach is a renderer-side comparison between the previous and current normalized game snapshots. The exact engineering implementation is Claude's decision, subject to these design constraints.

| Candidate | Approved treatment | Required evidence |
|---|---|---|
| Score increase | Brief numeric transition/highlight | Previous and current score |
| Touchdown | More distinctive score emphasis | Explicit scoring classification in existing data |
| Field goal or safety | Distinct but restrained score emphasis | Explicit scoring classification |
| Turnover | Brief situation/possession emphasis | Explicit play classification; possession change alone is insufficient |
| Pregame → live | Short lifecycle transition | Confirmed lifecycle change |
| Live → final | Dedicated final-state transition | Confirmed final lifecycle |
| Quarter change | No special moment in initial Phase 2 | Defer unless unambiguous and separately approved |

Rules:
- No moment on first paint, cached paint, stale catch-up or return from background.
- Only react to a change observed while visible and fresh.
- A moment fires once, not on every redraw, tab switch or subsequent refresh.
- The 30-second polling delay must not be disguised as instant live action.
- If multiple scores occur between refreshes, do not invent exact timing. Use a generic score update if the latest event cannot be safely identified.
- Respect reduced motion and announce meaningful updates through the existing live region.
- No injury moments, haptic claims or fake play-by-play.
- No interpolated game clock.

---

## 8. Scope boundaries

### Included in Phase 2
- Approved visual token families needed for the Home/Game design.
- Suite Style palette completion.
- Suite-wide numeric face and typography cleanup.
- Removal of Georgia from interface headings/headlines.
- Shared original stadium art family and CSS/SVG fallback atmosphere.
- Home lifecycle redesign: pregame, live, final, S2, S4 and S5.
- Game redesign: pregame, live and final, including existing subviews.
- Responsive phone, tablet and desktop compositions.
- Approved game moments and the minimum renderer-side state comparison needed to support them.
- Loading, missing asset, stale, offline and refresh-failure presentations.
- Necessary tests, screenshot baselines, performance and accessibility validation.

### Not included without separate approval
- New TeamOS fields or changes to normalized contracts.
- Win-probability series on Game.
- New data sources, APIs, backend services or paid assets.
- Per-team photography or identity configuration additions.
- New player profiles or new product destinations.
- New Around, Players, News, Schedule, More or Settings features/redesigns.
- New framework or app rewrite.
- Broad navigation or product information architecture changes.

### Existing behavior to preserve
- TeamOS/Suite separation: renderers consume normalized models and do not parse provider fields.
- Existing Home sections and lifecycle routing.
- Existing Game views and navigation.
- Freshness, offline, caching and service-worker behavior.
- Pull-to-refresh and manual refresh behavior.
- PWA install/update behavior.
- Accessibility, reduced motion and keyboard support.
- All team configuration and the 138-team shared layout.

---

## 9. Implementation sequence and review gates

Claude owns engineering decisions and implementation. This sequence is a boundary, not a request to implement all screens in one unreviewed pass.

1. **Implementation plan:** map each design requirement to current renderer, shared UI helper, CSS and test files. Identify the numeric font candidate, art asset format/cache plan, token families and exact event fields already available. No new TeamOS contract.
2. **Foundation slice:** implement the shared visual tokens, numeric type, Suite Style palette and art/fallback primitives. Provide screenshots of both styles for Notre Dame and Ohio State before proceeding to full screen implementation.
3. **Home slice:** implement Home states and desktop/mobile compositions. Provide screenshots for all lifecycle states and failure/fallback cases.
4. **Game slice:** implement scoreboard, tab strip, pregame/live/final compositions, Drive Tracker hierarchy and approved moments. Provide screenshots and interaction evidence.
5. **Validation:** run the existing automated checks and update visual expectations only where the approved design intentionally changes them. Never loosen contrast, overflow, accessibility or reliability gates to make the redesign pass.

At each review gate, supply:
- actual rendered screenshots, not code-only assurances;
- Notre Dame and Ohio State in Team Style and Suite Style;
- phone at 320px, 375px and 390px, plus 1280px desktop;
- all relevant lifecycle and fallback states;
- test/check results, with failures and deviations explained;
- confirmation that normalized TeamOS contracts and existing product behavior remain intact.

Do not claim physical iPhone/Safari validation from Chromium or desktop CI. Run a real iOS Safari check when a physical device is available.

Any material visual departure, unsupported data requirement, performance tradeoff or change in scope returns to David and the Creative Director before proceeding.

## 10. Definition of done

Phase 2 is not complete when the code compiles. It is complete when actual rendered Home and Game screens demonstrate the approved direction across teams, styles, lifecycle states, screen sizes and failure conditions; existing behavior is preserved; and the acceptance criteria above pass.

**The product should feel unmistakably like Suite, and the score should feel unmistakably like the game.**
