# Suite Home & Game Experience
## Visual Redesign — Creative and Implementation Brief

**Status:** Product direction approved; implementation authorized  
**Date:** November 19, 2026  
**Product:** Suite / Project LND  
**Initial team implementation:** Irish Watch (Notre Dame)  
**Scope:** Home and Game visual experience  
**Governing principle:** Preserve the foundation. Elevate the experience.

---

# Creative Mandate: Build the Best Possible Suite Experience

This brief defines our product vision, approved decisions, design principles, and essential guardrails. It is not a restrictive pixel-by-pixel implementation specification.

**You have creative freedom and are expected to exercise it.**

Do not interpret approved mockups, examples, or descriptions as the ceiling of what this experience can become. They communicate intent and establish direction. Your responsibility is to turn that direction into the best possible product experience.

Think like an exceptional product designer, creative director, motion designer, visual artist, and frontend engineer working together.

Explore original visual concepts, create premium assets, experiment with composition, develop thoughtful interactions, and push the quality of the experience. Use your judgment to determine what will make Suite distinctive, cohesive, intuitive, and genuinely best in class.

You are encouraged to improve upon our initial ideas when you identify a stronger solution.

The distinction is important:

- **Product requirements are constraints.**
- **Approved business logic is authoritative.**
- **Design principles establish direction.**
- **Mockups communicate intent; they are not pixel-perfect mandates.**
- **Creative execution is yours to own.**

Do not sacrifice product integrity, accessibility, performance, or existing functionality for visual spectacle. Equally, do not allow fear of changing a visual implementation detail to prevent you from creating something exceptional.

We are not looking for the safest interpretation of this brief. We are looking for the strongest experience that fulfills it.

Take ownership. Be ambitious. Explore. Create. Refine. Validate. Make thoughtful creative decisions without stopping for approval on every ordinary detail.

**Preserve the foundation. Elevate the experience.**

Build something we're genuinely excited to show people.

---

# 1. Mission and product intent

Elevate Suite's Home and Game experiences into a premium, immersive college football product without compromising existing architecture, functionality, data integrity, or approved product decisions.

The experience should feel like Saturday night under the lights: confident, cinematic, polished, emotionally resonant, and unmistakably built for college football fans.

The intended balance is approximately 80% polished sports product and 20% spectacle. This is a directional principle, not a formula to apply mechanically.

This is an experience redesign, not a product rewrite.

Claude is authorized to inspect, plan, design, create or source suitable assets, implement, test, and refine the approved direction. Do not pause for product approval on routine creative or implementation decisions. Use judgment within this brief and document significant deviations or unresolved constraints in the final report.

# 2. Authority, source of truth, and guardrails

## 2.1 Authoritative product decisions

The existing approved Home/Game design specification and existing product decisions remain authoritative for product behavior, architecture, and previously approved requirements.

In particular:

- Preserve the existing approved postgame transition logic. Do not introduce a new 24-hour rule, new timing thresholds, or replacement conditions.
- Preserve the existing TeamOS contracts and business logic.
- Preserve existing Game functionality and interactions.
- Treat the decisions in this brief as approved product direction from the November 19, 2026 design review.
- Where a detail is already defined by an approved specification or decision, follow that source rather than reinterpreting it.
- If a genuine conflict cannot be resolved from authoritative sources, document it rather than silently changing approved behavior.

Before implementation, inspect the current repository and review at minimum:
- `docs/design/suite-home-game-approved-spec-v1.md`
- `docs/engineering/current-architecture.md`
- Relevant product decisions, especially decisions 0042 and 0043
- Existing Home, Game, TeamOS, Suite, team configuration, and design-system implementation
- Existing postgame transition logic and related tests

Use the current repository as the source of truth for actual implementation details. Do not rely on this brief as a substitute for inspecting the current code and documentation.

## 2.2 Preserve the foundation

Non-negotiable requirements:

- Preserve existing TeamOS architecture and approved data contracts.
- Preserve existing business logic and lifecycle handling.
- Preserve existing navigation and application functionality.
- Preserve the existing Game experience and its capabilities.
- Preserve offline-first behavior, caching, freshness semantics, and PWA functionality.
- Preserve team configuration architecture and support for all 138 FBS teams.
- Do not introduce unnecessary backend changes or new TeamOS fields.
- Do not hardcode Notre Dame-specific behavior into shared application logic.
- Do not replace working functionality simply to achieve a visual redesign.
- Do not degrade performance, accessibility, reliability, or data correctness to achieve visual effects.

These constraints protect the product foundation. They do not limit creative expression in the visual and interaction design.

## 2.3 Creative latitude

You have broad discretion over:
- Layout and composition.
- Component design and visual hierarchy.
- Original art direction and visual assets.
- Stadium environment design and lighting.
- Typography choices within established brand constraints.
- Motion design and transitions.
- Interaction details and micro-interactions.
- Responsive composition.
- Visual storytelling and contextual presentation.
- Component architecture and styling approaches when they preserve existing contracts and behavior.

Do not simply reproduce a mockup if you can create a stronger solution. Do not add features or alter product behavior under the guise of creative freedom. When an idea would change approved product behavior, data contracts, or scope, preserve the approved behavior and note the opportunity separately.

# 3. Brand and design foundation

Preserve the distinction between Suite Style and Team Style.

## 3.1 Suite Style

Established direction:
- Midnight navy, bright pearl, and ink.
- Cobalt `#2B5CFF` reserved for actions, selected states, and meaningful feedback.
- Champagne/gold accents for school identity, ranks, countdown figures, and atmospheric lighting where appropriate.
- Instrument Display 700 for scores and primary numerical displays; 500 for secondary numerical information.
- Tabular numerals.
- Remove Georgia from headings and headlines.

Use these as design-system foundations, not a restriction against thoughtful supporting colors, surfaces, textures, or visual treatments.

## 3.2 Team Style

- Continue using each team's established 12 identity color tokens.
- Maintain team-aware identity and lighting.
- Keep Suite Style distinct from Team Style.
- Team identity must never undermine readability or accessibility.
- Team-specific details must remain configuration-driven.

## 3.3 Typography, legibility, and surfaces

- Establish a clear, intentional hierarchy.
- Meet WCAG AA contrast requirements.
- Critical information must remain legible over imagery.
- Use appropriately deep visual surfaces behind hero text.
- Avoid excessive glass effects, blur, generic cards, decorative accent bars, and giant watermark logos behind critical information.

These are guardrails against generic or noisy execution, not a ban on creative surface design.

# 4. Home experience

Home is the gateway to the team and its current football story. It should communicate what matters now and direct fans into the dedicated Game experience when they want more detail.

The five main destinations remain:
1. Home
2. Around
3. Game
4. Roster
5. More

The approved Home section order and content structure remain stable. Content can change based on the team's lifecycle state, but sections must not dynamically reorder.

## 4.1 Pregame hero

**Approved product direction: Our team, our game.**

The selected team owns the emotional center of the matchup. The opponent must remain prominent and recognizable, never reduced to a footnote.

Approved intent:
- Our team's helmet and identity are the primary visual anchor.
- Our official team mark supports the identity.
- The opponent's helmet and official mark are also represented.
- The opponent is visually subordinate but still feels like a legitimate opponent.
- Shared stadium environment art establishes Suite's signature atmosphere.
- Team colors and identity inform lighting and visual treatment.
- The environment reflects actual game time: daylight, dusk, or nighttime.

The hero should feel cinematic, not like a conventional scoreboard or generic card.

Information requirements and hierarchy:
1. Selected team identity and program name.
2. Both teams' helmets/marks, names, rankings, and records when available.
3. Official rivalry or series title when one exists; never invent one.
4. Game date, kickoff time, and timezone.
5. Confirmed broadcast network/channel.
6. Kickoff weather when available.
7. Pregame market odds only when sourced from a reliable market provider; do not present model estimates as market odds.
8. Venue, stadium, and location.
9. Prominent Game Details action into the existing Game experience.

Omit unavailable fields rather than fabricating them. The opponent must have enough visual presence to feel like a real matchup. Avoid long names crowding the visual composition.

Countdown prominence should respond to context:
- Several days away: subtle.
- Day before: more noticeable.
- Game day: prominent.
- Near kickoff: high-impact but restrained.

No fake ticking clock or unnecessary continuous animation.

Weather can be displayed as information on Home, but weather effects do not belong on Home.

**Creative latitude:** The hierarchy and content are requirements; the exact composition, treatment, art direction, and layout are yours to solve. Create a memorable, high-quality matchup experience that improves on the reference concepts where possible.

## 4.2 Live Home hero

**Approved product direction: Cinematic Live Atmosphere.**

The Pregame visual identity carries into Live. Do not switch to a conventional scoreboard.

Approved intent:
- Retain the cinematic stadium environment.
- Keep our team's helmet and identity as the visual anchor.
- Maintain prominent opponent representation.
- Make the current score immediately readable.
- Display a clear, restrained LIVE indicator near the score.
- Provide a prominent entry into the existing Game experience.

The Home hero is not a second Game screen.

Do not embed:
- Play-by-play.
- Drive Tracker.
- Box score.
- Detailed player or team statistics.

### Live game context

Display the following when reliable and fresh:
- Current score.
- Quarter and game clock.
- Down and distance.
- Possession, explicitly identifying which team has the ball.

This information is secondary to the score and matchup.

If data is unavailable or stale, omit the affected information rather than showing misleading information.

### Score updates

Use a subtle score-change treatment:
- Briefly highlight the updated number.
- Keep the animation restrained.
- No stadium-wide celebrations or dramatic lighting changes.
- Respect reduced-motion settings.
- Do not animate stale or repeated data as if it were new.

### Delayed and suspended games

Retain the cinematic hero and matchup.
- Clearly identify DELAYED or SUSPENDED.
- Keep the last confirmed score visible.
- Never present old data as a current live update.
- Preserve access to Game.

### Halftime

Retain the cinematic hero, score, and matchup.
- Display HALFTIME clearly.
- Show which team receives the ball to start the second half.
- Use explicit wording when appropriate, such as "Notre Dame receives to start the 2nd half."
- Only show possession information when confirmed by reliable data.
- Keep the Game entry point prominent.

Do not add halftime news feeds, stats panels, or competing content.

### Overtime

Retain the cinematic hero and normal live information hierarchy.
- Clearly identify the overtime period (OT, 2OT, etc.).
- Retain the score and matchup.
- Continue showing possession, down, distance, and game context when reliable.
- Keep the LIVE indicator and Game entry point.

### End of Game and Final confirmation

There are two distinct states:

**END OF GAME**
- The game clock indicates the game has ended, but the result has not yet been confirmed.
- Retain the last confirmed score and matchup.
- Do not imply that the final result is official.
- Do not activate the postgame presentation prematurely.

**FINAL**
- Once the data source confirms the final result, transition to FINAL.
- Activate the existing approved postgame experience.

Do not conflate the end of the game with confirmation of its final result.

## 4.3 Postgame hero

**Approved product direction: Cinematic final result, with restraint.**

- Preserve the stadium and matchup identity.
- Make the final score easy to find and understand.
- Keep both teams represented.
- Use the same visual treatment for wins and losses.
- Do not introduce exaggerated celebrations, dramatic loss treatments, or emotional assumptions.
- Provide a prominent, simple VIEW GAME action.

The result should feel important, not theatrical.

**Product principle:** Represent the game with pride, win or lose.

VIEW GAME opens the existing Game experience for the final box score, plays, and statistics. Do not duplicate that functionality on Home.

The next matchup remains in the existing Schedule section while the final result is the primary hero under the existing approved postgame transition logic.

## 4.4 Team Identity & Context

Preserve the approved purpose:
- Concise expression of team identity.
- Relevant program context.
- No second hero.
- No generic statistics collection.

Elevate the presentation without changing the section's purpose.

## 4.5 Quick Actions

Preserve the approved actions:
- Matchup.
- Availability, covering both teams in the next game.
- Contextual shortcuts only when supported by available data.

Keep these actions compact, polished, and immediately recognizable.

Game Info remains removed. The hero already provides the path into Game.

## 4.6 Team Updates

Maintain two distinct sections:

**The Wire**
- Meaningful team-related updates.
- Omit when there are no qualifying items.

**Latest News**
- Relevant published coverage.

Requirements:
- No duplicate stories across sections.
- Maintain the distinction between updates and published news.
- Keep both sections easy to scan.
- Do not turn Home into an endless news feed.

## 4.7 Schedule

Preserve the approved structure:
- Most recent result.
- Next three upcoming games.
- Strongest emphasis on the next matchup.
- Clear distinction between completed, upcoming, and next games.
- Preserve existing schedule functionality and data.

## 4.8 Contextual information

Keep contextual information selective and conditional.

Only show information that is reliable, relevant, and meaningful to the current team or season context.

Explicitly exclude:
- Generic stats strips.
- "By the Numbers."
- Filler content.

If nothing qualifies, show nothing.

# 5. Desktop experience

## 5.1 Navigation

The approved desktop navigation behavior remains:
- At widths of 1024px and above, move Home, Around, Game, Roster, and More into the branded Suite header.
- Wordmark and team identity on the left.
- Settings on the right.
- Bottom navigation remains on phone and tablet.

During a live game, the desktop header can display a Live/Delayed/Suspended chip and score from 1280px and above.

## 5.2 Desktop Home layout

Preserve the approved two-column composition.

**Primary column**
- Hero.
- Core team experience.

**Supporting column**
- Season Context.
- Conference Standing.

These remain two distinct panels. Do not merge, rename, or restructure them.

Do not stretch a mobile layout across the desktop viewport.

## 5.3 Desktop hero

Use additional width to create a more expansive horizontal matchup composition.
- Our team leads.
- Opponent remains prominent.
- Score and game status are immediately readable.
- Additional space improves matchup composition and atmosphere rather than simply enlarging every element.
- Preserve the same information hierarchy and visual identity as mobile.

The desktop experience should feel deliberately designed, not like a stretched phone screen.

**Creative latitude:** Horizontal composition is the approved direction, not a prescribed grid or fixed arrangement. Find the strongest responsive composition.

# 6. Atmosphere, motion, and assets

## 6.1 Stadium environment

The shared stadium environment is a signature Suite visual element.
- Adapt naturally to actual game time: daylight, dusk, and night.
- Use team-aware lighting to reinforce identity.
- Keep transitions atmospheric and purposeful.
- Avoid gratuitous animation.
- Preserve CSS/SVG fallback behavior.
- Stadium art must be optional and must not block offline or initial rendering.

Explore original, premium art direction and visual assets. The shared environment should be distinctive and cohesive across teams, while allowing team identity to influence the atmosphere.

## 6.2 Weather

Weather effects belong on the Game screen only.
- Rain, snow, or other effects only when supported by reliable, fresh weather data.
- Effects should be subtle and exceptional.
- Never obscure gameplay information.
- No effects when data is stale or unavailable.
- Respect reduced-motion and performance requirements.

## 6.3 Motion standard

Use purposeful, restrained motion throughout Home and Game.
- Short transitions for meaningful score and game-state changes.
- No continuous decorative animation loops.
- No fake ticking clocks.
- No simulated play-by-play.
- Animations must never delay access to information.
- Respect reduced-motion preferences.

Within those principles, use motion design creatively to improve clarity, responsiveness, and immersion.

## 6.4 Asset quality

Maintain a consistent premium visual standard across all 138 FBS teams.
- High-definition helmets and official team marks.
- Consistent quality, lighting, masking, transparency, and cropping.
- Responsive, high-density assets.
- No pixelated, stretched, blurry, or poorly cropped imagery.
- Use shared stadium environment art with team-aware lighting.
- If a qualifying asset is unavailable, use a deliberate, premium fallback.

No team should receive a noticeably inferior experience because of asset availability.

Claude is encouraged to create or source appropriate original visual assets and explore the strongest asset strategy that fits the architecture, licensing constraints, performance, and offline requirements. Do not use unlicensed or misleading team/stadium imagery. Do not use school marks or trademarked stadium depictions in shared generic stadium art where the approved spec prohibits them.

# 7. Technical and experience guardrails

Preserve the existing architecture and product behavior.

The implementation must maintain:
- Offline-first behavior.
- Existing cache and freshness semantics.
- Existing source isolation and normalized TeamOS model.
- Existing team configuration architecture.
- Existing PWA functionality.
- Accessibility and keyboard behavior.
- Responsive layouts.
- Existing Game interactions and lifecycle states.
- Existing data contracts and business logic.

Browser support floor: iOS Safari 16.4.

Do not add new TeamOS fields or backend requirements simply to support the visual redesign.

Do not fabricate data or create misleading visual states when a data source is unavailable, stale, delayed, or incomplete.

Do not make the application dependent on stadium imagery, remote fonts, or decorative assets to remain functional.

# 8. Implementation approach and autonomy

Claude is authorized to execute the approved design direction without seeking approval for every implementation detail.

Expected workflow:

1. Inspect the current repository and existing implementation.
2. Review the approved Home/Game design specification, relevant architecture documentation, and product decisions.
3. Review the existing visual system and implementation before deciding what to retain, improve, or replace.
4. Identify the smallest safe implementation path that still allows an ambitious design result.
5. Develop a coherent creative direction. Do not settle for incremental styling if a more compelling solution is available within scope.
6. Create, source, or adapt high-quality visual assets as appropriate.
7. Implement the redesign across the appropriate shared components and styles.
8. Preserve existing behavior and team configuration boundaries.
9. Test the implementation at mobile, tablet, and desktop breakpoints.
10. Validate Pregame, Live, Delayed, Suspended, Halftime, Overtime, End of Game, and Final states using appropriate fixtures.
11. Validate Notre Dame and representative teams with different identity colors and asset availability.
12. Run relevant automated tests and checks.
13. Review the actual rendered experience and refine visual issues before reporting completion.

Use judgment on component organization, CSS implementation, asset strategy, and visual details.

Do not ask the product owner to make decisions that are already established in this brief or existing approved documentation.

If an existing implementation detail conflicts with this brief, inspect the existing approved decision and source documentation before changing behavior.

If a genuine conflict cannot be resolved from authoritative sources, document it rather than silently changing approved product logic.

**Creative expectation:** Do not interpret "preserve the foundation" as "make only minimal visual changes." Be ambitious in the experience layer. The goal is a genuinely elevated, best-in-class result while protecting the product's working foundation.

# 9. Explicitly out of scope

Unless already required by the existing approved implementation:
- No new product features.
- No new backend architecture.
- No new TeamOS data contracts or fields.
- No replacement of existing data providers.
- No new game-tracking functionality.
- No duplicate Game experience inside Home.
- No new streaming or Suite Watch functionality.
- No changes to the five primary destinations.
- No new postgame timing rules.
- No changes to approved postgame transition logic.
- No Notre Dame-specific hardcoding in shared behavior.
- No unnecessary redesign of unrelated application screens.

If you identify adjacent opportunities, record them as recommendations for future consideration rather than expanding scope unilaterally.

# 10. Acceptance criteria

The work is not complete simply because the CSS looks different.

## 10.1 Visual quality

- Home and Game feel like a cohesive premium Suite experience.
- Pregame, Live, and Final have consistent visual identity.
- Our team's identity leads without diminishing the opponent.
- Stadium atmosphere feels immersive but restrained.
- Typography, spacing, contrast, and visual hierarchy are polished.
- Mobile and desktop feel intentionally designed.
- The experience demonstrates creative ambition and a recognizable Suite point of view.
- Original assets and design choices feel cohesive rather than assembled from unrelated visual treatments.

## 10.2 Functional correctness

- All existing Home functionality remains operational.
- All existing Game functionality remains operational.
- Lifecycle states display correctly.
- Score, clock, possession, down, and distance use reliable data.
- Stale and unavailable data are handled honestly.
- End of Game and Final are distinct states.
- Existing approved postgame logic remains unchanged.

## 10.3 Responsive behavior

- Phone, tablet, and desktop layouts work.
- No horizontal overflow.
- No stretched mobile composition on desktop.
- Desktop navigation and supporting panels follow the approved design.
- Layouts are deliberately composed at the relevant breakpoints.

## 10.4 Performance and accessibility

- Offline-first behavior remains intact.
- No unnecessary rendering or polling overhead.
- Motion respects reduced-motion preferences.
- Text and controls remain accessible.
- Imagery does not compromise loading or functionality.
- The experience remains usable when optional assets fail to load.

## 10.5 Team scalability

- Shared components work across the 138-team configuration architecture.
- Team colors and identities remain configuration-driven.
- Asset fallbacks are deliberate and visually acceptable.
- No team-specific regression is introduced.

# 11. Final delivery report

When implementation is complete, provide:

1. Summary of what changed.
2. Creative direction and significant design decisions.
3. Key original assets created, sourced, or adapted, and how they are used.
4. Files and components changed.
5. Existing functionality intentionally preserved.
6. Tests and checks executed, with results.
7. Responsive visual evidence for mobile, tablet, and desktop where practical.
8. Lifecycle-state evidence for Pregame, Live, Halftime, Overtime, Delayed/Suspended, End of Game, and Final.
9. Representative team-configuration and asset-fallback validation.
10. Any known limitations or deviations from this brief.
11. Confirmation that existing approved postgame logic and TeamOS contracts were preserved.
12. Branch and commit information, plus any PR created.

Do not claim that something was tested unless it was actually tested. Distinguish completed work from known limitations and future recommendations.

---

# Final product direction

**Preserve the foundation. Elevate the experience.**

Build a premium, cinematic college football experience that feels unmistakably like Suite.

Do not over-design it. Do not over-animate it. Do not add complexity for the sake of spectacle.

Make the important information immediately clear, make the experience beautiful, and preserve everything that already works.

At the same time, do not play it safe creatively. Use your expertise, taste, and judgment to create something distinctive and memorable.

**You have approval to implement this brief. Take ownership of the creative execution, do the work, validate it, and bring back the finished result for product review.**
