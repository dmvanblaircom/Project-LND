# Suite offseason Home: visual review v2

**Status:** Prototype for David's visual approval. No production season logic
changes and no approval to deploy. October 12, 2026.

## What changed from the three initial renders

- Keep the approved scoreboard-style, team-first dark season hero, record and
  published ranking; no editorial recap that competes with the scoreboard.
- The **last result now includes the opponent**, result and sourced round/season
  context, with responsive wrapping instead of an unexplained score alone.
  The placeholder **Sample State University** and all numerical figures are
  visibly illustrative and must never be emitted by production.
- Preserve the subdued “what's next” treatment, quiet Results action,
  shipping type and Ink/Pearl tokens, and the team-specific styling contract.
- Distinguish next-schedule failed from successful empty states; don't make a
  missing opener evidence that the season has not been announced.
- Preserve News immediately under the hero in S4 and postseason timing in S2.
  Don't add a splash image that hides record, opponent, or selection details.

## Review URLs

The isolated prototype is `docs/design/offseason-preview-v2.html`.
Use a local static HTTP server, not a `file://` URL, so its shared Suite
assets and team scripts load.

- S2: `?team=notre-dame&style=suite&state=awaiting`
- S4: `?team=notre-dame&style=suite&state=complete`
- S4 network failure: `?team=notre-dame&style=suite&state=failed`
- Ohio State and Team style are available from the review selectors.

GitHub Actions runs `node tools/offseasonpreviewcheck.js` for this branch.
The generated screenshot artifact folder is `artifacts/visual/offseason-v2/`.
Tests cover 2 teams × 2 styles × 3 states × 4 viewport sizes
(320, 375, 390, 1280), recording one full-page 390px screenshot per
team/style/state. The test does **not** certify physical iPhone behavior.

## Boundaries before implementation

1. David approves the visual hierarchy and states from rendered captures.
2. Claude supplies `TeamOS.season.phase`, season-matched last Game with
   actual opponent, score and `Game.stage`, published ranking and current
   league calendar, plus distinct next-schedule request outcomes.
3. Codex renders these with real data and adds acceptance checks for no rank,
   no postseason, playoff advance, unknown kickoff, failed and recovered
   schedules, a confirmed opener and season rollover. S1 unchanged; S3 and
   S5 reuse the already-shipping game and opener hero.
4. This preview does **not** approve the broader photography or prospect
   presentation, which needs a separate visual/source review. News/recruiting
   and draft labels remain review placeholders until supplied by actual data.
5. No production merge without approval, full CI and device checks.

Source of truth: `docs/product/offseason-home-proposal.md` §7 and
`docs/design/offseason-ui-contract-2026-10-12.md`.
