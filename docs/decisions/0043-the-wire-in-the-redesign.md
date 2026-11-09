# Decision: the wire is designed into the Suite redesign

## Status

Accepted. This amends the Phase 2 scope in `docs/design/suite-home-game-approved-spec-v1.md` (v1.2).

## Date

2026-11-09

## Context

David approved the wire's Phase 1 on 2026-11-05 (`docs/product/wire-brief.md`). The wire is a team's status-change news as it breaks: injury, surgery, out, return, suspension, transfer, coaching change and commitment. It is read by TeamOS from the beat feeds and ESPN team news Suite already has.

None of it is built yet. The redesign spec was approved on 2026-11-06 without it. That spec allows no new TeamOS fields and no new features in Phase 2, and the audit listed the wire as "a separate product item that would change this screen".

## Decision

David, 2026-11-09: **make sure the wire is included in the redesign.**

1. **Home (Phase 2, Stage 2).** The Creative Director designs the wire into Home's lifecycle compositions on phone, tablet and desktop. It sits above the news, as the wire brief and the navigation brief place it. This covers in season, game week (the opponent's items, marked as the opponent's) and out of season.
2. **Around (Phase 3).** Out of season, the wire comes first in Around (navigation brief). It is designed when Around is.
3. **Alerts.** The opt-in for wire alerts (the team's, and the opponent's in game week) is designed alongside the existing score-alert opt-in.
4. **One TeamOS exception.** The wire needs one new normalized model, `TeamOS.wire`, built from sources Suite already reads. It is the only new TeamOS model the redesign admits. There is no new source, backend or cost.
5. **Measured before it shows.** As the wire brief requires, the detection rule is measured on kept headlines and reported to David before any wire item reaches a fan. Home's redesign does not wait on it. With no items, the wire section draws nothing, so Home can ship first and the wire appear once the rule passes.

## Not decided

- Whether wire alerts are on by default. The brief recommends off, opt-in per team, like score alerts.
- The wire's Phase 2, a faster paid or partner source.

## Consequences

- Home's Stage 2 review gate includes the wire's states.
- The spec's §5 Home, §8 scope and §1.1 amendments table name the wire.
- The wire brief's Phase 1 build is sequenced with the redesign rather than shipped on today's Home.
