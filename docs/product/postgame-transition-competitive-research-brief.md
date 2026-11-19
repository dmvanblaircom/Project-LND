# Claude Research Assignment: Postgame Home Transitions

**Type:** Product and competitive UX research  
**Priority:** High — inform the Home redesign before implementation  
**Status:** Research only; no implementation authorized  
**Requested:** 2026-11-19  
**Product owner:** David  
**Related:** [Suite Home/Game approved spec](../design/suite-home-game-approved-spec-v1.md), [Suite redesign program](../engineering/backlog.md)

## Objective

Research how leading sports applications handle the transition from a live game to a final result, and from the completed game to the next upcoming matchup.

Define a postgame experience that respects how long fans remain interested in a completed game without allowing yesterday's result to dominate Home indefinitely.

## Applications to study

Prioritize ESPN, theScore, CBS Sports, Yahoo Sports, and official team or league applications. Include other strong examples where relevant.

## Research questions

1. What changes immediately when a game becomes final?
2. How long does the final result remain prominent?
3. When and how does the next matchup become the primary focus?
4. How easily can fans revisit the final score, statistics, play-by-play, and recap?
5. Do transitions depend on elapsed time, game schedule, or competition context?
6. How do apps handle consecutive games, postseason games, and season-ending results?
7. Which patterns work especially well on mobile versus desktop?

## Research standards

- Distinguish directly observed behavior from assumptions.
- Provide dated screenshots or other verifiable evidence where available.
- Do not invent transition timing when it cannot be verified.
- Identify strengths, weaknesses, and opportunities for Suite.
- Preserve Suite's distinction between Home as a gateway and Game as the detailed experience.
- Do not treat competitor conventions as automatically right for Suite.

## Deliverables

1. Competitive comparison matrix.
2. Screenshots or references documenting meaningful patterns.
3. Recommended postgame lifecycle for Suite.
4. Proposed transition rules and edge cases.
5. Mobile and desktop design implications.
6. Open product decisions requiring approval.

## Existing Suite direction

- **Approved:** The selected team remains the emotional center.
- **Approved:** Final results deserve prominent treatment, particularly during the first day.
- **Approved:** Home directs fans into Game for detailed statistics and play-by-play rather than duplicating them.
- **Approved:** The next matchup should become primary through a thoughtful, context-aware transition.
- **Research hypothesis, not an implementation rule:** Approximately 24 hours of final-result prominence; test against fan behavior and schedule context.
- **Design constraint:** No rigid midnight reset or jarring hero replacement.
- **Edge cases:** Short turnarounds, postseason, final game of season, delayed/updated final scores, offline/stale data, no next game scheduled.

## Boundaries

Research and recommendations only. Do not modify code, create commits, open implementation PRs, or change existing product specifications. Return findings and recommendations for David and ChatGPT's product/design review. Claude owns technical feasibility and implementation planning only after product approval.
