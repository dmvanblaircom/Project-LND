# Decision: Suite v1 design and edge-case policies

## Status

Accepted. §18 is amended by decision 0026 (Settings gains Appearance: one
App Style choice). The text below is left as it was decided.

## Date

2026-09-24

## Decision

Product and Design stress-tested the canonical Suite system for edge cases,
internal inconsistencies and places the reference screens leave open. These
are the approved results. The canonical visual system stands; this makes it
more rigorous.

Decision 0022 remains authoritative wherever this record does not amend it.
Where this record conflicts with an earlier instruction, prompt or
canonical-image artifact, this record wins.

### Supersessions

This record explicitly supersedes:

| Earlier | Now |
|---|---|
| 0022 #6: pregame Game is `Game Details \| Tickets` | Tickets is hidden in v1 (§7) |
| "Injury Report" as the Roster subview label | `Availability` (§9) |
| 0023: Top 25 wears the team masthead | Top 25 wears a compact team-aware header (§6) |
| 0009 and 0022 #9: team-specific install and product-shell identity | The installed product is Suite (§11) |
| The chooser lists every Coming Soon program | The first 12, then expand (§4) |
| Home previews of open length | 3 news stories, 3 schedule rows (§3) |
| One boolean live state on the Game nav | Separate selected, live and paused states (§1, §14) |
| Lifecycle tabs with no rule for a vanished subview | Route correction by history replacement (§15) |

Decision 0009 is superseded **in part** only; see §11.

### 1. The live Game control has two jobs

The raised Game control means "a game is live" and "go to Game". It does not
mean Game is the selected destination.

- Selected-tab state and live-game state are separate concepts.
- The selected destination always has its own unmistakable indicator; the
  raised circle is never the only selected cue.
- Accessibility follows: on Home during a live game, "Home, selected" and
  "Game, live now"; on Game, "Game, selected, live now".

### 2. Home hero hierarchy

The hero keeps an explicit hierarchy rather than shrinking type to fit.

- **Primary**, always protected: matchup identity, game state, score when
  live or final, date and time when upcoming.
- **Secondary**: quarter and clock, possession, down and distance, the CTA.
- **Tertiary**, first to compress, move or drop: weather, spread, O/U and
  lower-priority metadata.

### 3. Home previews

Home is a dashboard. Latest News shows at most **3 stories**; Schedule shows
at most **3 rows**. Each routes to its full screen.

The three schedule rows come from ONE TeamOS helper, over the normalized
schedule, shown chronologically. The current or relevant game never drops out.

| Situation | Rows |
|---|---|
| Preseason / nothing completed | the first 3 scheduled games |
| Upcoming hero, in season | most recent completed or exceptional entry, the hero, the game after it |
| Live, in-game delay, or suspended | the affected game, then the next 2 |
| Recent-final hero | that game, then the next 2 |
| Postponed hero | the postponed game, then the next valid games by normalized chronology |
| After the season / no future games | the last 3 entries |

When one side runs short, fill from the nearest valid games on the other side,
keeping the hero or current game present, returning no more than 3. Canceled
and other exceptional games remain eligible entries (0022 #8).

### 4. Team Chooser at scale

- Available Teams is its own section and is always visible.
- Coming Soon initially shows **12 programs, alphabetical by display name**.
  The order is neutral: it implies no popularity, priority, ranking or
  release order.
- "View all coming soon teams" (or equivalent) exposes the full set.
- Search always covers the full registry, whatever is currently visible.
- Conferences are metadata and search terms, never cards.

### 5. Top 25 opens on Games

Top 25's peer views are `Games | Rankings`. `#top25` opens **Games**. A deep
route into Rankings opens Rankings and is never redirected.

### 6. Top 25 header

Top 25 is national content inside the fan's Suite, not team-owned content. It
uses a compact team-aware header:

- the dark SUITE bar;
- subtle selected-team context, which is context and not navigation, and must
  not look like a Change Team control (Change Team stays in Settings);
- a neutral `Top 25` page heading;
- `Games | Rankings` beneath it.

No locked reference exists for this variant; its first implementation is
reviewed visually before it is propagated.

### 7. Tickets is hidden in v1

No Tickets destination ships until Suite has a real ticket capability. Pregame
Game therefore has one destination, Game Details, rendered as the natural
pregame page with **no one-item tab strip**. Unfinished functionality is not
advertised because it appears in a mockup.

### 8. Depth Chart browsing

The secondary unit control `Offense | Defense | Special Teams` is functional
and stays easy to reach on a long depth chart; a sticky treatment is
appropriate where it works cleanly with the page hierarchy and accessibility.
Spot cards stay compact. Separate slots, level headings, OR relationships and
third-team data are never sacrificed to shorten the page (decision 0019).

### 9. Availability, not Injury Report

The Roster peer views are `Depth Chart | Roster | Availability`, at
`#roster/availability`. The page heading may be "Availability Report".
Official availability covers illness, discipline, personal and other reasons,
so "injury report" is narrower than the domain. The TeamOS domain remains
Availability. Routes, labels, accessible names, tests and documentation follow.

### 10. Hero art fallback is a production state

Many teams will have no approved deployable photography, so the fallback is a
first-class design built from the team's normalized identity: deep team and
neutral gradients, restrained accent, a large mark or watermark, atmospheric
depth, strong foreground contrast and deliberate empty space. Never a broken
image box, an arbitrary internet photo, a blank region or a grey placeholder.

Both states are visually QA'd. The photo state may be tested with a local,
never-committed image. **An approved hero photograph does not block the
redesign from merging**; the fallback must be good enough to ship. No
photograph of unclear licensing is committed to fill the slot.

### 11. The installed product is Suite

The installable PWA is **Suite**, not a per-team product. The selected team
changes the experience inside Suite, never the installed identity.

- One shared manifest, installed name, favicon, icon set, default share image
  and default crawler/static metadata, all team-neutral.
- The manifest's start URL is the neutral root. A persisted team selection
  still restores that team after launch (decision 0016).
- Browser title: `Suite` with no team selected; `<Program> · Suite` with one,
  e.g. "Notre Dame · Suite", "Ohio State · Suite".
- "Irish Watch" and "Buckeye Watch" are not customer-facing brands in v1. They
  may remain internal reference names. "Project LND" never appears in
  customer-facing UI or metadata (0022 #9).

**Decision 0009 is superseded in part.** Superseded: one manifest per team; a
team-specific installed name, installed icons, favicon and default share
image; runtime swapping of install identity; and the assumption that Irish
Watch and Buckeye Watch are separate installed products. **Still in force**:
team identity is data; colours, marks, tagline and visual accents are
configuration or provider-normalized data; contrast requirements are enforced;
in-app team identity is normalized through TeamOS; artwork is optional and
individually fallible; Suite never invents inaccessible team colours.

Suite owns the application shell. Team data owns the selected team's identity
inside it.

**Assets.** No final Suite icon set or neutral share image is approved yet. A
temporary Suite-neutral set may be used on the design branch, named
`assets/suite/TEMPORARY-*`, and an automated gate refuses any TEMPORARY Suite
identity asset on `main`. The final icon set and share image are **merge
blockers** for the redesign.

### 12. Season Outlook markets are independent

Render each supported market that exists; hide only a missing one. No "No
market" card. Zero supported markets hides the section; one shows one metric
cleanly; two show both. A missing companion metric is never fabricated. A
valid cached value follows §13 rather than being replaced by a generic
"Unavailable".

### 13. Freshness and offline messaging

One page-level treatment, never a timestamp under every section.

- The page-level state reflects the sources **the current screen actually
  displays**: current screen → its displayed sources → freshness summary →
  page-level treatment. A stale source the screen does not show never warns
  on that screen. It is not "the stalest source anywhere".
- A real offline state may be shell-wide.
- A stale warning appears when meaningful displayed data is cached or stale,
  e.g. "Offline · Showing last available data", "Data may be outdated · Last
  refreshed 42 min ago".
- An omitted optional source (per policy) does not make the page stale.
- Source-specific timing belongs where it has meaning: Settings, the
  Availability report date, and an "as of" disclosure on stale market data
  actually shown. Fresh content carries no timestamp labels.

### 14. Exceptional game states on the Game nav

The normalized game model distinguishes a status from whether play has begun
(e.g. `status` + `hasStarted`, or an equivalent representation engineering
chooses). A single `delayed` value cannot decide the nav on its own.

| State | Game nav | Pulse | Label |
|---|---|---|---|
| Active live game | raised | yes | live |
| Delayed before kickoff | normal | no | DELAYED in game context |
| Delayed after play began | raised | no | DELAYED |
| Suspended after play began | raised | no | SUSPENDED |
| Postponed | normal | no | POSTPONED |
| Canceled | normal | no | CANCELED |

The source's own status names the state: a delay is shown as DELAYED, a
suspension as SUSPENDED, never one renamed as the other. Score and game
context stay visible while paused. Only an actually active game pulses.

### 15. Game lifecycle route handling

When a lifecycle transition removes the current Game subview:

- a subview that still exists is preserved (live Stats → final Stats);
- one that no longer exists moves to the lifecycle's default (live Drive
  Tracker → final Box Score);
- an invalid Game subroute moves to the current lifecycle's default.

Correction replaces the history entry: no misleading Back entry, no reload,
no trip to Home, no invalid route left active, with an appropriate
accessible announcement.

### 16. Location labels are text

HOME / AWAY / NEUTRAL text is the authoritative cue; colour only reinforces
it. The text (or equivalent accessible text) is always present.

### 17. News opens the source

Stories open the original publisher from both the Home preview and the full
News screen, in a new context with `rel` protections, a visible external-link
cue and a screen-reader disclosure. Suite does not scrape or reconstruct
articles.

### 18. Settings groups

Settings v1 has two headed groups: **Team** (Current Team, Change Team) and
**Data** (Refresh Data, Last Updated / relevant freshness). Notifications stay
deferred. No filler settings.

## Context

The canonical references show ten states; the implementation has to cover
many more. During the 2026-09-24 implementation, Product and Design reviewed
the system for scale (138 programs), edge states (partial markets, delays
mid-game, lifecycle transitions), semantic accuracy (availability,
selected-versus-live) and platform identity (one installable Suite, many
teams). Claude Code's impact assessment of the same date mapped each item to
the implementation; David approved it with the clarifications recorded here.

## Consequences

- TeamOS gains: a normalized game status with enough information to tell a
  pre-kickoff delay from an in-game one; a lifecycle tab set with a default
  per lifecycle; the schedule-preview helper; per-market Season Outlook; and a
  per-screen freshness summary. Each is one rule with unit tests.
- `suite/nav.js` separates the selected destination from game state, and can
  replace a route without adding history.
- The per-team manifests and install artwork leave team configuration; the
  shell carries one Suite manifest. The service worker precaches it with the
  shared shell rather than learning it from the page (amends decision 0015's
  team-file list).
- Team artwork already in the repository stays as team assets but is no
  longer install identity.
- A CI gate blocks `TEMPORARY` Suite identity assets from `main`.

## Owner

David (Product Owner), with ChatGPT (Product, UX and Architecture) documenting
the stress-test decisions and Claude Code recording them for implementation.

## Related Documents

- `docs/decisions/0009-identity-is-team-data.md` (superseded in part)
- `docs/decisions/0015-the-worker-is-told-its-team.md`
- `docs/decisions/0016-no-team-yet-is-a-state.md`
- `docs/decisions/0019-depth-is-slots-availability-is-its-own.md`
- `docs/decisions/0020-data-freshness-and-isolated-sources.md`
- `docs/decisions/0022-suite-v1-product-behavior.md`
- `docs/decisions/0023-canonical-suite-implementation.md`
