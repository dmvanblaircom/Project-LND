# Suite Visual System vNext

Status: IMPLEMENTED ON `design/suite-vnext-build` / BROWSER QA PENDING  
Scope: shared Suite visual language, responsive behavior, and team-theme contract  
Reference implementations: Irish Watch and Buckeye Watch

## Purpose

Suite should feel premium and team-specific while remaining one product.

The production model is:

`Suite structure + semantic team identity + normalized TeamOS data`

Suite owns layout, hierarchy, component anatomy, interaction, accessibility, responsive behavior, and game-state semantics. Team configuration supplies identity values and team-owned source declarations. Shared code does not branch on team name.

## Current visual model

vNext uses two complementary surface modes:

1. **Editorial light shell**  
   Warm ivory/light neutral surfaces for schedules, rankings, personnel, news, supporting statistics, controls, and long-form scanning.

2. **Immersive team surface**  
   Team `surface/deep/abyss` tokens for the primary matchup hero and live-game emphasis.

The contrast between those modes is intentional. Team color is concentrated where identity and game state matter rather than flooding every data surface.

## Shared navigation

The five Suite destinations remain:

- Home
- Top 25
- Game
- Players
- News

This visual system does not authorize a new IA.

The previous oversized raised Game-circle treatment is retired. Game remains the center destination in the five-item bottom navigation, but all five destinations now use one conventional navigation geometry. A live indicator may appear on Game without changing its size or position.

## Design principles

### 1. One component system

Notre Dame, Ohio State, and future teams use the same shared markup and selectors. No team-name CSS selectors or team-specific rendering branches are part of vNext.

### 2. Team identity is semantic data

The existing `TEAM_CONFIG.identity` contract remains authoritative. vNext derives its visual treatment from the existing accent, surface, text, RGB, and typography roles.

No runtime personality switch was introduced.

### 3. Light surfaces use dark semantic text

`accentText` is designed for dark team surfaces and cannot be assumed readable on ivory/white. Light vNext surfaces use dark Suite text and `surface` for accessible team emphasis.

This is especially important for Ohio State, where `accentText` is intentionally near-white.

### 4. Team color identifies, semantic colors explain

Team accent may identify:
- current/next game
- active team in national views
- team-owned scoring/events
- section accents
- decorative texture

Team accent does not independently mean live, win, loss, warning, or availability.

### 5. Media is optional

The production design works with no team photography and no protected official marks.

The hero uses:
- semantic team surfaces
- radial accent illumination
- original CSS-generated abstract geometry
- team name as low-opacity decorative identity

Approved media can be added later without changing component structure.

### 6. Source quality is part of product quality

Visual trust depends on data trust. Official team/athletics sources are preferred for authoritative team-maintained facts such as depth charts and availability reports. See `docs/decisions/0018-official-team-sources.md`.

## Home

Home is the primary editorial composition.

### Matchup hero

The existing reconciled `S.next` remains the single source of game truth.

The hero presents:
- game state
- opponent
- date/time/network
- venue
- series/trophy
- weather when available
- spread/total when available
- countdown or live state
- team-driven atmospheric treatment

No separate hero data model or fetch exists.

### Season snapshot

A compact three-column block shows:
- Record, derived from completed normalized schedule games
- Ranking, from normalized team status
- Next, from the reconciled current/upcoming game

### Season Journey

The schedule remains an accessible expandable list.

vNext adds:
- Season / Schedule editorial heading
- played/remaining context
- stronger next-game treatment
- quieter completed games
- existing expansion behavior for game detail
- current/next marker
- trophy, ranking, network, score and live state where available

## Top 25

Top 25 is one national-picture surface with two modes:
- Games
- Rankings

The selected team uses the shared Team Focus treatment:
- narrow team-accent edge
- subtle accent tint
- stronger hierarchy
- no rank distortion

Live ranked games continue to patch in place from the existing live scoreboard path.

## Game

Game uses one normalized `GameDetail` renderer with three visual states:

### Pregame
Light editorial matchup treatment with matchup preview and available context.

### Live
Team-surface scoreboard becomes the dominant element. Live state, score, last play, win probability and game information remain semantically explicit.

### Final
The scoreboard remains prominent but the page returns to the lighter editorial rhythm for quarter scoring, leaders, team stats, box score and scoring summary.

The same Game renderer is also used for expanded schedule game details through an inline light-shell treatment.

No second polling path or component-local score truth was introduced.

## Players

Players is a unified personnel surface. The fan-facing name stays broader than
a depth chart without becoming the vague “Team”: every program has a roster,
while depth and availability remain capabilities inside the destination.

It contains, when supported:
- official/current two-deep
- position battles
- availability report
- week-by-week movement/history
- lazy-loaded full roster
- roster filtering and unit controls

Source provenance is shown in the UI.

For Notre Dame:
- the two-deep source is FightingIrish.com
- the availability source is FightingIrish.com
- media/beat sources are no longer the source of truth for those artifacts

A team without an implemented source gets an honest unavailable/fallback state.

## News

News is a light editorial feed.

Existing behavior remains:
- ESPN team news
- declared beat-news snapshot when available
- merge/dedupe
- newest-first ordering
- optional imagery
- source/date metadata
- first 15 stories then Show More

Beat-source articles receive a subtle team-accent edge rather than a separate layout.

## Team texture

vNext ships a production-safe CSS-generated texture in the hero.

It is:
- decorative
- pointer-events none
- ignored by assistive technology through surrounding decorative markup
- derived from semantic accent/surface tokens
- not a reconstruction of Notre Dame or Ohio State protected marks

No team-specific texture selector was added.

## Typography

Existing team font stacks remain the contract.

Institutional/proprietary fonts may be named in fallback stacks but are not bundled unless Project LND has appropriate rights.

## Motion

Motion remains restrained:
- existing reveals/transitions where useful
- live pulse
- disclosure feedback

`prefers-reduced-motion` removes nonessential animation and keeps the Game nav level with the rest of the bar.

## Responsive behavior

Mobile remains primary.

The production breakpoints preserve:
- full-width hero on phones
- compact headers at narrow widths
- three-column season snapshot
- readable score sizes
- compact section metadata
- conventional five-item bottom navigation

At 48rem and above, the hero becomes contained/rounded and the navigation width is constrained.

## Accessibility

vNext preserves:
- tab/tabpanel semantics
- keyboard navigation
- focus-visible behavior
- screen-reader status copy
- non-color live/final meaning
- reduced motion
- semantic section headings
- existing TeamOS identity contrast validation

Light-shell overrides explicitly avoid using dark-surface `accentText` where it can fail against white/ivory.

## Team scalability

A new team must be able to use vNext without:
- team-name checks in `app.js`
- team-specific selectors in `app.css`
- duplicated Suite markup
- another live-state path

Identity/config may supply different colors, surfaces, type and approved assets.

## Rights-aware production rules

Production-safe now:
- original LND interface icons
- CSS-generated original texture
- team names in editorial/product context
- fonts Project LND has rights to load
- provider-linked editorial imagery under existing behavior

Rights-gated:
- school logos and marks
- institutional artwork
- player/team photography bundled as product assets
- stadium/campus photography not owned or licensed by LND
- broadcast imagery/video
- proprietary font files

## Non-goals in this implementation

Not added:
- new navigation destinations
- My Teams/account work
- premium features
- protected team marks
- photography-driven hero
- a new game-state model
- a richer play-by-play/key-moments model beyond data already rendered
- a universal media-rights system
- team personality conditionals

## Current acceptance status

Confirmed statically on the build branch:
- shared code has no Notre Dame/Ohio State class logic
- shared CSS has no Notre Dame/Ohio State selectors
- JavaScript parses
- CSS braces balance
- reduced-motion Game-nav regression fixed
- Home / Top 25 / Game / Players / News all have vNext component hooks
- official ND depth and availability source declarations are wired into ingestion

Still required before merge:
- real browser screenshots at 375px and 430px
- tablet/wide visual review
- ND and OSU upcoming/live/final visual review
- keyboard/focus walkthrough
- offline/cache switch test
- repository automated checks on the final PR branch
