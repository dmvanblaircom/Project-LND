# Decision: odds are compact media metadata, not a betting product

## Status

Accepted. Amends decision 0022 #2.

## Date

2026-09-24

## Decision

Suite is a sports information product, not a sportsbook. It follows the
sports-media model ESPN uses: odds are compact, secondary game metadata.

- Show the useful values directly, for example `ND -29.5 · O/U 52.5`, or the
  equivalent layout the canonical designs establish (the Game header stacks
  the spread over the total).
- No prominent semantic labels such as `Pregame Line`, `Live Line` or
  `Closing Line`. This supersedes the labelling instruction in 0022 #2.
- No sportsbook-style UI: no betting controls, moneyline expansion, wagering
  calls to action, bet slips or dedicated betting screens.
- During a live game, a spread and total supplied through the ESPN data path
  are shown as the same secondary metadata. Nothing calls them live unless a
  future normalized source explicitly establishes that meaning. The part of
  0022 #2 that forbids implying a line is live still stands.
- Provenance is data. When the source names who set the odds, TeamOS keeps it
  on the normalized odds (`odds.provider`). Suite may show it subtly where
  appropriate, stays provider-neutral, and never hard-codes a sportsbook name.

Applies to Home and Game alike.

## Context

The first Home and Game builds labelled the numbers "Line" before kickoff
and "Pregame line" after it, following 0022 #2. Product/Design's Game review
(2026-09-24) judged those labels a betting-product treatment the Suite does
not want. The provider behind ESPN's odds has also changed: ESPN BET is no
longer ESPN's sportsbook, and DraftKings became its official odds provider
from December 2025, with broader integration through 2026. That is the case
for keeping provenance in data rather than in code.

## Consequences

- `TeamOS.espn` normalizes odds to `{ line, total, provider }`; `provider`
  is whatever the feed names, or null. Tests cover both.
- Home's hero and the Game header render the values without labels.
- Any later odds surface (the Season Outlook full field is prediction-market
  odds and separate) follows the same rule: values as metadata, no betting UI.

## Related

- `docs/decisions/0022-suite-v1-product-behavior.md` (#2, amended)
- `docs/decisions/0024-suite-v1-design-edge-policies.md`
