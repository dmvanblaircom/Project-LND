# Decision: desktop navigation in the branded header

## Status

Accepted. This supersedes item 3 of decision 0041 (Concept A).

## Date

2026-11-08

## Context

Decision 0041 approved Concept A for desktop navigation. David reopened it the same day and asked for a side-by-side evaluation on the real app before deciding. That evaluation is `docs/design/desktop-navigation-evaluation.md`, with screenshots in `docs/design/review/2026-11-07-desktop-nav/`. It compared:

- a left rail;
- the docked bottom bar;
- the destinations in the header.

They were compared on Home and Game at 1024, 1280 and 1440 px, measuring content width, persistent interface and fit for all 138 teams. Claude recommended the header.

## Decision

David, 2026-11-08: **Concept B.** On desktop, the primary navigation sits in the branded SUITE header.

1. **Same five destinations.** Home, Around, Game, Roster and More, in that order, with the same routes and behaviour. Nothing from More is promoted.
2. **Desktop only, from 64rem (1024 px).** Phones and tablets keep the bar at the foot of the screen, unchanged.
3. **Balanced header.** Wordmark and team on the left, the destinations, then Settings on the right. The header is laid out on the wide desktop grid. Destinations are words, not icons. Every team's name must fit on one line at 1024 px; `tools/headerfitcheck.js` checks this for all 138 teams.
4. **A prominent live Game state, from existing data only.** While the team's game is under way:
   - the Game control carries a red **Live** chip with its pulsing light, or a quiet Delayed or Suspended chip;
   - from 80rem it also shows the score as the app already knows it, for example "ND 17–10 MSU";
   - the raised circle stays the phone and tablet treatment;
   - screen readers keep hearing the existing announcement, "Game, live now".
5. **Accessibility and behaviour preserved.** At desktop width the navigation moves into the header in the document, not only on screen, so keyboard and screen-reader order match what is seen. It returns to its place after the content below that width. Selected state, focus rings, reduced motion, routes and Back are unchanged.
6. **It ships with Stage 2.** The header navigation is introduced together with the wide desktop Home and Game layouts. It is not shipped as an isolated change to today's narrow desktop presentation.

## Consequences

- Desktop loses the bottom bar. Persistent interface falls from about 10% of a 1280×900 screen to 6.2%, and the full height below the header is content.
- The header becomes Suite's desktop masthead, and the stage beneath it can grow toward the full width.
- The Live chip and score are drawn only in the desktop header (`navState` and `navScore`, not read aloud). The hero remains where the score is announced.
