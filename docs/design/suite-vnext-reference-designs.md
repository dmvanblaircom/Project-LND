# Suite vNext Reference Screens

Status: IMPLEMENTED REFERENCE / BROWSER QA PENDING  
Depends on: `docs/design/suite-visual-system-vnext.md`

## Reference rule

These references describe the screen hierarchy actually implemented on `design/suite-vnext-build`.

They are not a new IA and they do not authorize features not present in the current Suite.

## Global grammar

Every team uses:

1. Team/product header
2. Full matchup hero on Home
3. Compact matchup mini on secondary tabs where appropriate
4. Screen-specific editorial content
5. Conventional five-item bottom navigation

The five destinations remain Home / Top 25 / Game / Depth / News.

## Home reference

### Header
Dark team-surface header with restrained team/product lockup and icon-only refresh.

### Matchup hero
Full-width on phone. Team surface gradient, accent illumination, abstract geometry and low-opacity team-name treatment.

Hierarchy:
1. game state
2. opponent
3. date/time/network
4. venue/series/weather/odds
5. countdown or live context

### Supporting market cards
White editorial cards for National title and Playoff when the team declares Kalshi capability.

### Season snapshot
Three equal cells:
- Record
- Ranking
- Next

### Season
Editorial heading followed by schedule list.

Next/current game receives the strongest emphasis. Completed and future rows stay compact and scannable.

## Top 25 reference

Header:
- eyebrow: Top 25
- title: National picture
- metadata: Games + polls

Primary control:
- Games
- Rankings

### Games
Ranked matchup rows retain date, ranked team names, network/score and live context.

The active team row receives an accent edge and tint.

### Rankings
Poll selector followed by compact ranked rows.

Rank is the strongest visual anchor. Team name/record follows. Movement is tertiary.

The active team treatment must not distort ordering.

## Game reference

One renderer, state-driven appearance.

### Pregame
Light shell.
- matchup scoreboard
- status
- matchup preview where available
- supporting sections below

### Live
Dark immersive team-surface scoreboard.
- score dominant
- live status explicit
- last play
- win probability when available
- quarter scoring / stats / leaders / box score / scoring summary below

### Final
Light/editorial supporting surface.
- final score remains primary
- quarter scoring and statistical context become the body

### Inline schedule detail
Expanded schedule games reuse GameDetail in a compact light shell and preserve Close behavior.

## Depth reference

Header:
- eyebrow: Personnel
- title: Depth + availability, or Roster when no depth source exists
- metadata: listed-player count or roster context

### Depth chart
Official/source-attributed chart grouped into Offense, Defense and Special Teams.

Each position shows:
- position
- jersey
- player
- class
- depth order
- OR designation
- battle marker where applicable

### Availability
Independent source provenance.

If an official availability report exists, show it as official.  
If no report exists, explicitly state that no report is published.  
Do not infer health from absence.

### History
Week/game-by-game movement remains expandable.

### Roster
Lazy-loaded ESPN roster remains available with:
- unit pills
- search
- player metadata

## News reference

Header:
- eyebrow: News
- title: Latest stories
- source count

Single-column editorial cards on mobile.

Story hierarchy:
1. headline
2. source
3. date
4. optional thumbnail

Beat-source items receive a subtle team-accent edge.

## Notre Dame reference

Identity foundation:
- deep navy
- warm gold
- warm ivory shell
- historic/editorial typography already declared in team identity

Production character comes from:
- navy immersive hero
- gold illumination/accent
- warm light supporting surfaces
- restrained abstract geometry

No pseudo-ND mark is used.

### Current authoritative personnel sources
- Depth chart: FightingIrish.com official football media information
- Availability: FightingIrish.com official Notre Dame game notes/report materials

## Ohio State reference

Identity foundation:
- charcoal/dark gray
- scarlet fill accent
- accessible light `accentText` on dark surfaces
- white/gray editorial identity

Important vNext rule:
scarlet/light identity colors designed for dark surfaces are not reused blindly as text on the light editorial shell. Light surfaces use Suite dark text and semantic team-surface emphasis.

Ohio State currently has no declared Depth snapshot, so its Depth surface must remain honest rather than borrowing Notre Dame data.

## State matrix

| Surface | Upcoming | Live | Final |
| --- | --- | --- | --- |
| Home hero | opponent-led | live game-led | no fabricated final hero when current app has no next game |
| Game | light pregame | immersive team scoreboard | light editorial support |
| Schedule | next highlighted | live row explicit | final row compact |
| Top 25 | network/time | score + live context | score + final context |
| Depth | independent of game state | independent | independent |
| News | independent | independent | independent |

## Responsive reference

### 375–430px
- full-bleed hero
- single-column content
- three-column compact snapshot
- fixed five-item bottom nav
- no raised Game circle
- section metadata compresses but remains visible
- news thumbnails shrink
- score typography reduces without changing hierarchy

### Tablet/wide
- hero becomes contained with rounded corners
- content remains one coherent editorial column
- bottom nav width is constrained
- hierarchy remains identical to mobile

## Visual QA checklist still required

Before merge, capture/review:
- Notre Dame Home at 375 and 430
- Ohio State Home at 375 and 430
- Game pregame/live/final for both teams
- Top 25 Games and Rankings
- Depth official-data state and unavailable state
- News with and without thumbnails
- expanded schedule game detail
- odds board open
- reduced-motion mode
- keyboard focus
- tablet/wide state
