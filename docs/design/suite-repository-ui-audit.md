# Suite Repository and UI Audit

Date: 2026-09-22  
Status: REVIEW COMPLETE / APPROVED FOLLOW-UPS IMPLEMENTED

## Scope

This review covered the complete checked-in application path: the static shell,
team chooser, shared Suite renderer, visual system, TeamOS modules, team
configuration, service worker, snapshot producers, automated checks, and the
product/design/architecture records. It evaluates the repository against the
Project LND north star: the team is the destination, Suite is useful every day,
and the same product must feel distinctly team-owned without team-specific UI
branches.

The repository has no configured Git remote and this environment has no
authenticated GitHub session. Consequently, this is a review of the complete
checked-in working tree and history, not a review of unmirrored GitHub Issues,
pull-request comments, or Actions logs.

## What is already strong

- **The platform boundary is real.** Shared Suite code renders Notre Dame and
  Ohio State from configuration, while TeamOS owns normalized provider data.
- **The vNext visual direction is coherent.** A light editorial shell supports
  scanning and reading, while dark team surfaces reserve identity and intensity
  for the matchup and live game.
- **Live data has one truth.** Home, Game, and Top 25 reconcile through the same
  normalized state instead of drifting into conflicting scores.
- **Honest capability fallbacks exist.** A team without a depth source does not
  inherit another team's snapshot.
- **The PWA and accessibility foundations are unusually mature.** The shell is
  cache-aware, tabs implement keyboard behavior, reduced motion is supported,
  and loading/error states remain explicit.

## Findings and proposed fixes

### P0 — Light-shell browser and focus semantics were still dark-surface semantics

**Evidence.** `:root` declares a dark color scheme and every global focus ring
used the team `focus` token. That token is validated for the team's dark
surface; Ohio State deliberately supplies a near-white focus value. The vNext
content and bottom navigation are warm ivory, where that ring can disappear.
Only `body` and `.page` were repainted light, leaving the root canvas dark for
rubber-band scrolling and browser-native control styling.

**Fix applied.** A Suite-owned dark focus token now serves light editorial
surfaces; the dark header refresh control retains the team focus token. Once a
team is selected, the root canvas and native color scheme become light. The
no-team chooser remains dark and continues to use its more-specific team-neutral
focus rules.

**Acceptance check.** Keyboard focus must remain plainly visible on both team
themes across Home, Top 25, Game, Depth, and News. iOS overscroll and native
inputs must not flash or adopt a dark canvas after a team has loaded.

### P1 — The selected-team experience was a dead end — resolved

**Evidence.** The chooser tells fans they can change teams later, and the
architecture supports a URL-selected team, but Suite exposes no way back to the
chooser. The build plan records the same gap. A fan must know to clear storage
or manually edit the URL.

**Implemented direction.** “Change team” is inside an accessible header More
menu, keeping it out of the primary game-day hierarchy while establishing a
quiet home for future destination-level actions. It clears only the selected
team preference and returns to the existing chooser.

### P1 — Market data needed team-outlook framing — resolved

**Evidence.** National-title and playoff probability cards sit immediately
under the hero, before the season snapshot and schedule. The north star centers
connection, context, and earning trust; betting is explicitly outside the
initial MVP. Even when these cards are useful probabilities rather than a wager
flow, their source and meaning can make the destination read as odds-led.

**Implemented direction.** The compact cards are explicitly “Title outlook” and
“Playoff outlook,” and identify themselves as market-implied Kalshi data. They
start hidden and appear only after the feed contains the selected team; a team
outside Kalshi's roughly 50-program field receives no section at all. Betting
remains a possible later product area, not the purpose of this MVP surface.

### P1 — Navigation vocabulary was implementation-led — resolved

**Evidence.** `Depth` is a football artifact, while the Suite north star calls
for the broader Team/Roster destination and eventual multi-sport reuse. Ohio
State already falls back to a roster-oriented screen, but the fixed tab still
says Depth.

**Implemented direction.** The destination is now **Players**: specific enough
to communicate personnel, broader than an inconsistently published depth chart,
and less vague than “Team.” Roster is the universal foundation; depth,
availability, and movement remain additive capabilities. Internal panel/data
contracts remain unchanged.

### P1 — The between-games home experience is still schedule-heavy

**Evidence.** Home is matchup hero, markets, snapshot, and schedule. News,
personnel movement, and “what changed” live behind separate tabs. That is useful
on game week but does not yet satisfy the daily/year-round promise in offseason
or quiet periods.

**Decision.** Hold. The current in-season Home hierarchy fits the present season
and should not be redesigned around an unvalidated offseason abstraction. Revisit
contextual composition deliberately when the product has observed the actual
transition out of season.

### P2 — Static fallback identity could contradict the chosen team — resolved

**Evidence.** The checked-in document body and metadata are Notre Dame-specific,
then `paintIdentity()` replaces them after the selected team configuration and
application load. Stored color tokens solve most repeat-visit paint mismatch,
but a first Ohio State visit can still expose Notre Dame text to slow rendering,
assistive technology, previews that do not execute JavaScript, or a failed
application script.

**Implemented direction.** The checked-in title, metadata, body headings, motto,
and asset links are neutral. Validated identity paints team-owned values. Social
preview specialization remains a deployment concern because crawlers generally
do not execute the runtime selection path.

### P2 — Responsive QA was not reproducible — resolved

**Evidence.** The implementation review records broad browser coverage, but the
Playwright harness and fixtures were temporary and removed. Current checks are
strong on contracts and static CSS, but cannot catch focus contrast, root-canvas
flashes, clipping, or layout overflow.

**Implemented direction.** A Playwright smoke harness uses the repository's
existing deterministic provider fixtures, checks both reference teams at phone
and wide widths, asserts overflow and keyboard focus, exercises More and Players,
and emits screenshots as CI artifacts instead of maintaining fragile golden
images. State-specific live/final expansion remains the next harness increment.

### P2 — Staleness was communicated globally, not at the decision point — improved

**Evidence.** Suite tracks cached responses and reports freshness in the footer,
while individual schedule, depth, news, and market surfaces can mix different
update cadences. Fans care most about freshness beside changing facts,
especially availability and live data.

**Implemented direction.** Outlook identifies Kalshi at the compact-card decision
point, News reports its latest story date beside source count, and personnel
continues to show its source and chart date. The existing cached-response footer
still owns genuinely offline/stale transport state; no freshness is invented and
no new polling path was added.

## Recommended sequence

1. Run the checked-in visual smoke job and review its screenshot artifacts.
2. Expand deterministic browser states to upcoming/live/final without creating
   another data truth.
3. Observe the current in-season Home experience; defer “Now” work until there
   is real offseason behavior to design against.

## Guardrails for every follow-up

- No team-name branches in shared JavaScript or selectors in shared CSS.
- No second live score, schedule, or news truth.
- Light surfaces use Suite-owned readable semantics; team text tokens remain
  scoped to dark team surfaces.
- Missing capabilities remain honest, not visually disguised.
- Preserve offline behavior, keyboard navigation, reduced motion, and the
  conventional five-item mobile navigation until an approved brief changes it.
