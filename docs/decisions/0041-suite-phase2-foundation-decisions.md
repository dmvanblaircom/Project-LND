# Decision: Suite Phase 2 foundation choices (Stage 1b review)

## Status

Accepted.

## Date

2026-11-07

## Context

David reviewed the Stage 1b specimen screenshots (`docs/design/review/2026-11-07-stage1b/`) under decision 0040 and decided the five open questions they rendered.

## Decision

1. **Numeric typography.** Instrument Display at 700 for primary scores and key numerals. A lighter weight (500) is allowed for secondary figures, such as records, where it helps the hierarchy. The numeric system is the same in both App Styles. In code: `--s-font-score`, `--s-num-primary`, `--s-num-secondary`.
2. **Suite Style blue.** `#2B5CFF` is approved, for actions, selected states and meaningful interaction feedback only. It is never used as decoration. On the stage, Suite Style's school line, ranks, countdown figures and the colour in its light are champagne (`--r-stage-mark`, `--r-stage-glow-rgb`).
3. **Desktop navigation: reopened, not decided.** Concept A (a docked navigation aligned to the content grid) was approved, then reopened by David the same day for a side-by-side evaluation on the real app. That evaluation covers a left rail, the docked bottom bar and destinations in the header, and is in `docs/design/desktop-navigation-evaluation.md` on branch `design/nav-evaluation`. Production navigation is unchanged until David decides. Destinations and behaviour stay as they are whatever he chooses.
4. **Final scores stay team-neutral.** The Game review of 2026-09-24 stands: no Win or Loss label. The score, the margin it shows and the records the source gives communicate the outcome. The spec's §5.4 "clear outcome from the followed team's side" is met this way.
5. **Hero contrast.** The accessibility approach is approved, and the 138-team rendered contrast check stays. The finished visual treatment is not approved: the Stage 1b atmosphere was too dark and flat. The text floor (every word on the team's deepest surface or darker) must be kept while the stage gets much more depth, illumination and energy outside the text zones. Day and night must feel meaningfully different.

Also recorded:

- **Field treatment.** The drawn field is described as a geometrically controlled field treatment, a texture, not a complete NCAA field rendering. It has no boundaries, end zones or yard numbers.
- **Stadium art.** ChatGPT owns the creative direction, the reference research and the original compositions (Night Bowl, The Tunnel, Under the Lights). Claude owns the asset pipeline, optimization, responsive delivery, fallback and integration. Claude does not source or create substitute production art.
- **Review process.** The specimen screenshots and the 138-team contrast validation (`tools/herocontrastcheck.js`) remain part of every review.
- **Creative objective.** The objective remains "Saturday Night. Under the Lights.": an energetic, immersive college sports experience, not a dark dashboard. The stadium should feel illuminated, stands and crowd included. Accessibility and atmosphere both matter.
- **Delivery.** Home and Game remain separate, reviewable stages. Neither #238 nor #239 merges without David's explicit authorization.
