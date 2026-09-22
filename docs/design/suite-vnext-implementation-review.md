# Suite vNext Implementation Review

Status: BUILD COMPLETE / BROWSER QA PENDING  
Branch: `design/suite-vnext-build`  
Base: `main`

Read first:
1. `docs/design/suite-visual-system-vnext.md`
2. `docs/design/suite-vnext-reference-designs.md`
3. `docs/decisions/0018-official-team-sources.md`

## What changed

Suite vNext was implemented directly on the merged Phase 7 platform rather than on the older design branch.

Primary application files:
- `index.html`
- `app.js`
- `app.css`

Supporting source-contract files:
- `teams/notre-dame.js`
- `.github/workflows/odds.yml`
- `docs/04_TEAM_CONFIG.md`
- `docs/decisions/0018-official-team-sources.md`

## Architecture preserved

The implementation keeps:
- Phase 7 team selection/runtime behavior
- `TEAM_CONFIG.identity`
- `TeamOS.identity`
- existing `--t-*` semantic tokens
- `TeamOS.live` reconciliation as one live-game truth
- current five-destination IA
- existing ESPN normalization
- existing cache/offline architecture
- existing schedule row expansion
- lazy roster loading
- Top 25 in-place live patching
- News aggregation/deduping

No team-specific CSS selector or application rendering branch was added for Notre Dame or Ohio State.

## Home

Implemented:
- cinematic team-surface matchup hero
- CSS-generated original abstract texture
- low-opacity team-name identity treatment
- Record / Ranking / Next season snapshot
- editorial Season / Schedule heading
- stronger next-game row
- light schedule surface
- light expanded game-detail shell

## Top 25

Implemented:
- National picture editorial frame
- Games / Rankings primary control
- compact poll controls
- light ranked-game rows
- light poll rows
- Team Focus treatment through existing `.mine`
- preserved live row patching

## Game

Implemented:
- shared `.game-shell`
- explicit pregame/live/final classes
- dark immersive live scoreboard
- light pregame/final supporting surfaces
- light box score/scoring/stat treatment
- light segmented controls
- inline expanded-game shell

Not added:
- another live poller
- another score cache
- inferred key moments beyond existing game detail

## Depth

Implemented visually:
- Personnel header
- light depth folds
- clearer starters/backups
- position-battle treatment
- availability section
- history
- light roster filter/list

Implemented for source accuracy:
- official source hierarchy decision
- Notre Dame official depth source declaration
- Notre Dame official availability source declaration
- FightingIrish.com depth PDF ingestion
- FightingIrish.com game-note/availability ingestion
- team-stamped new snapshots
- no inference that absence of an availability report means everybody is healthy

Important operational note:
the existing committed `depth.json` remains the previous snapshot until the new workflow runs after this implementation reaches an executable workflow context. Do not claim the checked-in snapshot itself has already been regenerated.

## News

Implemented:
- editorial News header
- light cards
- source/date hierarchy
- beat-source accent edge
- preserved ESPN + declared beat feed merge
- preserved Show More behavior

## Bottom navigation

The previous raised circular Game action is retired.

All five destinations now share one conventional fixed bottom-navigation geometry. Game remains centered by order, not by oversized treatment.

The live dot remains available.

Reduced-motion mode explicitly keeps Game level with the bar.

## Accessibility and contrast work

Preserved:
- ARIA tabs
- keyboard tab navigation
- focus-visible
- screen-reader status messaging
- reduced motion
- semantic live/final labels

Additional vNext correction:
`accentText` is not used as general text on light surfaces. This matters for Ohio State, where its accessible dark-surface accent text is near-white.

Static QA found and fixed light-surface regressions in:
- expanded schedule game details
- odds-board rows
- Game segmented controls
- box scores
- scoring summaries
- schedule accent labels
- mini-hero accent labels
- loading/error states
- footer links

## Static verification completed

Confirmed:
- `app.js` parses
- CSS opening/closing brace counts match
- Home vNext hooks exist
- Top 25 vNext hooks exist
- Game state shell exists
- Depth vNext hooks exist
- News vNext hooks exist
- no Notre Dame/Ohio State CSS selector
- no Notre Dame/Ohio State class-rendering branch in shared JS
- reduced-motion Game transform is `none`
- old UHND depth parser is removed
- official depth and availability declarations are config-driven

## Browser QA still required

This branch should not be described as fully visually approved until actual browser rendering is reviewed.

Required:
- 375px
- 430px
- tablet/wide
- Notre Dame Home
- Ohio State Home
- pregame Game
- live Game
- final Game
- expanded schedule detail
- open odds board
- Top 25 Games
- Top 25 Rankings
- Notre Dame official Depth
- Ohio State unavailable Depth
- News
- reduced motion
- keyboard focus
- offline/cache behavior
- ND -> OSU -> ND switch

Also confirm no console errors.

## Data-source QA after merge/run

After the updated Refresh team data workflow runs, verify:
- `depth.json.team === "notre-dame"`
- `depth.json.source` is FightingIrish.com
- current depth rows match the official current-game PDF
- availability source is FightingIrish.com
- official Out / Questionable categories parse correctly
- no old UHND depth source remains in the generated depth snapshot
- history diffs reflect official chart movement

## Merge recommendation

**Do not merge yet solely on static validation.**

The architecture and static checks are in good shape, but the remaining browser QA is visual/product acceptance, not a code-style check. Once that review passes and the final automated repository checks are green, this branch is appropriate to open as the Suite vNext PR.

Do not automatically merge the PR.
