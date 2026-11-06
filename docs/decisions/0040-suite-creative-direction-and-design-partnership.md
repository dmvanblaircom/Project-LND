# Decision: Suite creative direction and design partnership

## Status
Accepted by David, 2026-11-06. Supersedes the design-ownership and visual-direction portions of decision 0035 only. All unrelated provisions of 0035 remain in force.

## Decision

Suite will undertake a deliberate visual and experiential redesign. This is a new visual direction, not a small polish pass. Its aim is an elevated, high-energy sports lifestyle experience: immersive, athletic, bright, sharp, emotionally engaging and approachable.

The target feeling is entering a great stadium or arena on game day: anticipation, identity, energy and belonging. The reference space is premium athletic and sports culture (for example Nike, Lululemon, Vuori and Rhoback), combined with the intensity and motion language of high-quality sports broadcasts and video games. "Premium" does not mean formal luxury, exclusivity, restraint for its own sake, or a hotel aesthetic.

Design principles:
1. **Stadium atmosphere:** purposeful photography, lighting, depth and team identity.
2. **Sports energy:** confident contrast, vivid team color, expressive typography and strong numeric hierarchy.
3. **Immersive moments:** motion responds to game and season context; spectacle is concentrated where it adds emotion or comprehension.
4. **Approachable confidence:** elevated, modern and aspirational without feeling elitist, intimidating or betting-oriented.
5. **Clarity first:** readability, information hierarchy, usability and speed always win over decoration.
6. **Distinctive but scalable:** team identity comes from configuration and approved assets; the shared Suite language remains recognizable across teams.

The initial focus is the existing Home and Game experiences. This is a redesign of existing capabilities, not permission to invent duplicate features or expand the data/backend scope.

## Working agreement

### David — Product Owner
- Owns product vision, priorities, scope and final decisions.
- Approves the creative direction, screen specifications, meaningful scope changes and release readiness.
- Does not need to translate design intent into engineering detail.

### ChatGPT — Creative Director and Design Authority
- Leads creative direction, UX, screen composition, visual system, typography, color, imagery direction, motion concepts and interaction specifications.
- Produces implementation-ready design briefs and visual references before major implementation.
- Reviews actual implementation evidence against approved designs and specifies visual corrections.
- Does not modify production code or silently expand engineering scope.
- Prescribes outcomes and design constraints; does not dictate engineering choices where multiple valid approaches exist.

### Claude Code — Lead Engineer and Implementation Owner
- Owns repository inspection, technical planning, production implementation, architecture, code, assets integration, testing, performance, accessibility, responsive behavior and technical documentation.
- Implements approved designs within the existing TeamOS/Suite architecture.
- Has autonomy over routine engineering decisions inside the approved design boundaries.
- Must surface technical constraints, material tradeoffs or proposed visual departures before proceeding.
- Supplies actual screenshots and validation evidence for fan-facing changes.

## Operating rules
1. **Design before development:** no major visual implementation begins until the screen-level design brief and acceptance criteria are approved.
2. **Repository as source of truth:** durable decisions, specifications and handoffs live in the repository.
3. **No guessing at visual intent:** Claude implements approved specifications; material visual departures return to David and ChatGPT.
4. **Preserve existing capability:** inspect the current app and its contracts before proposing changes. Redesign working functionality rather than duplicating or casually removing it.
5. **Evidence over assurances:** automated checks are necessary but not visual approval. Review actual rendered screenshots and interactive states.
6. **One phase at a time:** each phase has explicit acceptance criteria and review before the next phase begins.
7. **Architecture remains protected:** no rewrite, new framework, TeamOS data changes or new service unless a concrete requirement justifies it and David approves the tradeoff.
8. **Quality is cross-device:** preserve PWA/offline behavior, accessibility, reduced-motion support, responsive layouts and performance.

## Phased plan

1. **Creative foundation:** document the visual language, tokens, typography, imagery/art direction, motion principles and shared component treatments. Audit current UI and existing design decisions first.
2. **Hero experiences:** redesign existing Home and Game screens, covering pregame, live, final and offseason states as applicable.
3. **System propagation:** bring Around, Players, News, Schedule and supporting destinations into alignment without changing their underlying capability contracts.
4. **Validation and finish:** test both Notre Dame and Ohio State, all relevant states, responsive widths, loading/error/offline/fallback states, accessibility, reduced motion, PWA behavior and physical-device rendering where available.

The phase plan is sequenced, not blanket authorization to implement every screen. Each substantial phase receives a design and implementation review.

## Non-goals
- No new features merely to make the app look busier.
- No blanket dark-mode mandate.
- No indiscriminate gradients, glass effects, metallic trim or animation.
- No casino, betting terminal or fantasy-gambling visual language.
- No unlicensed or arbitrary team photography.
- No sacrifice of readability, accessibility, performance or team scalability.
- No production implementation based solely on a mood board or generated image.

## Relationship to existing decisions
- Decision 0035 remains authoritative for Claude's engineering ownership, branch/PR workflow and delivery responsibilities, except where this decision explicitly assigns creative direction and design authority to ChatGPT.
- Decisions 0022, 0024 and their amendments remain authoritative for existing product behavior, edge cases and team scalability unless a later approved product decision explicitly changes them.
- Decision 0039 remains authoritative for merge permissions.
- Existing contracts and working features are preserved unless an approved screen specification explicitly changes their presentation or behavior.

## Approval
David approved this working agreement and creative direction on 2026-11-06.
