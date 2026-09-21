# Engineering Handoff: opponent statistics from a second provider

**Status:** blocked. See *Stop / Escalate If* — two gates must clear before any
code is written.
**Decision:** `docs/decisions/0012-second-stats-provider.md`
**Branch when unblocked:** from `project-lnd-platform`

## Product Brief

No separate brief. The scope is set by the matchup-card work of 2026-09-21
(decision 0011) and one product constraint from David: **the card shows at most
nine rows.**

## Objective

Give the pregame matchup card **rushing defense** and **passing defense** — the
figures ESPN does not carry — by fetching CollegeFootballData.com from the
GitHub Action, committing a derived snapshot, and reading it through the
existing snapshot boundary.

Not "add CFBD." Add the two rows, through the cheapest path that keeps the
boundaries intact.

## Existing Behavior to Preserve

- Irish Watch renders identically for everything not on the matchup card.
- **Ohio State keeps working.** It declares no snapshots; it must declare no
  `stats` snapshot and get an honest unavailable state, not Notre Dame's data
  and not a crash. This is the Phase 5B contract (decision 0008).
- The card still renders when the snapshot is missing, stale or malformed. A row
  null on both sides is dropped, which is already the rule.
- No API key reaches the browser. Ever.
- PWA, offline, accessibility and responsive behaviour unchanged.
- ESPN remains the only provider for anything live. This changes nothing about
  `teamos/live.js` or decision 0010.

## Relevant Areas

| Area | Why |
|---|---|
| `.github/workflows/odds.yml` | the existing Action pattern — `grab()`, the retry loop, and the "refuse to commit anything that is not market data" guard, which is the model to copy |
| `teamos/espn.js` | the adapter shape `teamos/cfbd.js` should mirror: pure, no fetch, provider in, domain out |
| `teamos/snapshots.js` | `get(config, kind)` and `owned(team, data)` — the boundary this rides on |
| `teams/notre-dame.js` | gains `snapshots.stats`; `teams/ohio-state.js` deliberately does not |
| `app.js` — `teamSeasonStats`, `withPointsAllowed`, `loadPreview` | where the two sources are merged into one `SeasonStat[]` |
| `teamos/espn.js` — `PREVIEW_ROWS` | the row list and its stable keys |
| `tools/matchupcheck.js` | the card's regression check; extend, do not replace |
| `sw.js` | `DATA_FILES` — a new snapshot needs precaching, and `VERSION` rolls |

## Architecture Constraints

- Follow `CLAUDE.md`.
- `teamos/cfbd.js` is **pure**: no `fetch`, no DOM, no team name, no product
  name. Same hygiene the adaptercheck already asserts for `espn.js`,
  `snapshots.js`, `live.js` and `season.js` — add the same block for it.
- Provider shapes stay inside the adapter. `SeasonStat` does not gain a field
  naming a provider.
- The merge of two providers' rows happens in **one place**, not per row and not
  in the view.
- No backend. No framework. No new runtime dependency.
- The Action commits a **derived** file, not the raw payload — smaller, and a
  narrower licensing question.

Additional:
- The snapshot carries a `generatedAt` and the team it belongs to, so
  `TeamOS.snapshots.owned()` can do its job. Do not repeat the
  ownership-by-declaration workaround that decision 0008 had to settle for.

## Acceptance Criteria

- [ ] `teamos/cfbd.js` turns a CFBD payload into `SeasonStat[]` rows with stable
      keys, and passes the same source-hygiene checks as the other TeamOS modules.
- [ ] A row whose figure the snapshot lacks comes back `null` and is dropped by
      the view, on both sides — never a `0`, never a fabricated rank.
- [ ] `TEAM_CONFIG.snapshots.stats` declares the file. Notre Dame has one.
      **Ohio State does not, and Buckeye Watch renders with the defensive rows
      absent and nothing else changed.**
- [ ] The card is **nine rows**. Rushing defense and passing defense in; Yards
      per play and Tackles for loss out, unless David says otherwise.
- [ ] Rows sourced from the snapshot show their national rank **only if CFBD
      publishes one**; otherwise no rank and no better-rank marker, exactly as
      the derived points-allowed row behaves today.
- [ ] A missing, empty, stale or malformed snapshot degrades to the ESPN-only
      card. Prove it with a check, not by reasoning about it.
- [ ] The Action refuses to commit a payload that is not what it asked for —
      copy the guard from `odds.yml`, which is the reason a bad Kalshi response
      has never reached the page.
- [ ] `CFBD_API_KEY` is a repository secret and appears nowhere in the committed
      tree, the snapshot, or the client bundle.
- [ ] The card says how old the figures are.

## Validation

Existing, all must pass:

```
node --check app.js && node --check sw.js
for f in teams/*.js teamos/*.js; do node --check "$f"; done
python3 tools/csscheck.py app.css
node tools/adaptercheck.js
node tools/livecheck.js
node tools/matchupcheck.js
```

Feature-specific, to be added:

- `adaptercheck`: `teamos/cfbd.js` hygiene, plus a fixture payload in and
  `SeasonStat[]` out — including a payload **missing** the defensive fields,
  which must yield nulls rather than zeros.
- `matchupcheck`: the nine-row card built from **both** sources; and the
  negative control that matters — **with the snapshot absent, the card must
  still render and must not print a defensive row.** Verify the control fails
  on a deliberately broken build before trusting it. Every check added in this
  repo has been proven to fail on the bug it describes; hold this one to that.
- Both teams rendered end to end: Notre Dame with the snapshot, Ohio State
  without.

## Out of Scope

- CFBD advanced stats (success rate, explosiveness, PPA, havoc). Better
  predictors, same fetch, still out — the card is capped at nine and the basic
  rows have to work first.
- Any other CFBD endpoint: recruiting, betting lines, player stats, play-by-play.
- Replacing ESPN anywhere. This adds a source; it removes none.
- Backfilling history for the defensive figures.
- Team selection, the service worker's one-team shell, or anything else Phase 7
  owns.

## Stop / Escalate If

Beyond the standard list in the template, **this work does not start until:**

1. **CFBD replies about licensing.** Asked 2026-09-21 to
   `admin@collegefootballdata.com`: is an Action-written derived snapshot,
   committed to a public repo and served by GitHub Pages, acceptable, and what
   attribution do they want? A "no" or a narrower "yes" changes the design, not
   just the paperwork.
2. **A real CFBD response has been read.** Every field name in decision 0012
   comes from web-search summaries of third-party docs, not from a response
   body. Fetch `/stats/season?year=2026&team=Notre%20Dame` and confirm the
   opponent fields exist and carry real values. Decision 0011 exists precisely
   because a published field that was always zero nearly reached the card —
   the same trap is available here, and a summary of documentation will not
   catch it.

Also stop and ask if:

- CFBD's team naming cannot be mapped from the existing team config without a
  new provider-specific identifier per team. That is a `sources` change and it
  touches every future team.
- Rushing and passing defense turn out to need more than the one season-stats
  call, which would change the Action's cost and the licensing question.

## Expected Engineering Report

Per the template: changes, files, checks run with results, behaviour
intentionally changed, risks, and decisions to record. In addition:

- The **exact CFBD fields** used, with a real sample value for each, so the next
  person does not have to re-derive them from documentation.
- Confirmation that the negative controls were **observed failing** on a broken
  build, not merely written.
- What CFBD actually said about licensing, recorded in decision 0012 rather than
  left in an inbox.
