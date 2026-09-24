# Decision: implementing the canonical Suite

## Status

Accepted

## Date

2026-09-24

## Decision

David approved the canonical Suite implementation plan on 2026-09-24. These
are the implementation rules. Product behavior policies are decision 0022.

**Visual source of truth.** The ten locked canonical reference screens are
the source of truth.
- They live **outside this public repository**, and are never edited or
  regenerated.
- Screens with no reference use them as direction. They reuse the same type,
  cards, spacing, navigation and team treatment, and no separate visual
  language is invented for them.
- A missing mockup never removes a capability.

**Headers, by destination rather than by state.**
- The compact SUITE header: the Team Chooser, Home (upcoming, live and final
  alike), and Game.
- The team masthead: Top 25, Schedule, Roster and More.
- No Home search icon, no Share, no persistent Game back arrow.

**Primary navigation.**
- Home / Top 25 / Game / Roster / More, with icons: house, bar chart,
  scoreboard, people, ellipsis.
- While the team's game is live, Game becomes the raised circle with a live
  light inside it. The light pulses, and stays still under reduced motion.

**Team data.**
- One configurable `tagline` per team: Notre Dame's is "Leave No Doubt."; a
  team may have none. "PLAY LIKE A CHAMPION TODAY®" is not used.
- Each team declares an `accentOnLight` text color. Its surface colour must
  pass as heading ink on the Suite's light surfaces. TeamOS enforces both.

**Type.**
- Barlow for UI, Barlow Condensed for display.
- News headlines use an editorial serif stack: Georgia, Charter, Times New
  Roman.
- Grenze Gotisch is retired.
- SUITE is a typographic wordmark until a bespoke mark exists.

**Assets.**
- Team logos and player headshots are provider-hosted and normalized
  through TeamOS (`TeamOS.espn.mark`). A logo that fails falls back to the
  program's initials.
- TV networks are shown as text.
- Team art uses an art slot. Its fallback is a finished composition in the
  team's own colours, and nothing is scraped.

**Chooser.**
- Headings "Available Teams" and "Coming Soon".
- Each program shows its nickname; conference stays searchable.
- Coming Soon lists programs only, and is not interactive.
- No program count.

**Engineering structure.**
- `app.css` is rebuilt in layers: Suite tokens, team tokens, base, layout,
  components, screens, responsive, preferences.
- Screens not yet rebuilt are quarantined in `legacy.css`, under `.legacy`.
  Rules are deleted as screens move, never added. The file goes when the
  last screen moves.
- `app.js` splits into plain per-screen scripts under `suite/`, with no
  framework and no build step.
- Routing is by hash (`suite/nav.js`), with one route state, `location.hash`.
  Back and deep links work, and focus moves to the new screen's heading.
- One TeamOS rule decides the hero game, whether upcoming, live or recent
  final.
- Weather moves behind a TeamOS adapter.
- Drives and plays are normalized in TeamOS, from real payloads captured on
  the runner.

**Merging.** The redesign reaches `main` once, after visual review.
Engineering-only changes that leave the fan-facing UI unchanged may merge
earlier.

## Related

- `docs/decisions/0022-suite-v1-product-behavior.md`
- `docs/decisions/0021-interim-suite-presentation.md` (superseded, screen by screen)
