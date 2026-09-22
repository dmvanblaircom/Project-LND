# Decision: Official team sources own authoritative team data

## Status

Accepted

## Date

2026-09-22

## Decision

When a team publishes an official source for authoritative team data, TeamOS uses that source as the primary source of truth.

For the Depth surface specifically:

1. The weekly two-deep comes from the team's official athletics source when one exists.
2. A team config declares that official source under `sources.official`.
3. The ingestion job produces the team's depth snapshot from the declared official source.
4. Beat writers and other media sources may supplement context, but they do not silently replace the official two-deep.
5. If no official source has been implemented for a team, Depth shows its honest unavailable state rather than borrowing another team's data or substituting an unofficial chart.
6. If the official depth source does not publish an availability/injury list, the Suite says so. It must not turn absence of a report into "nobody is out."

Notre Dame's official source is the FightingIrish.com football media-information page, which publishes a Notre Dame Depth Chart PDF for each game. Ohio State remains without a Depth snapshot until an equivalent official Ohio State source is identified and implemented.

## Context

The original Notre Dame depth snapshot was produced by scraping UHND. That was useful for proving the snapshot boundary, but it made a beat-writer site the source of record for a team-maintained artifact.

During Suite vNext QA, a newer Notre Dame depth chart was observed outside the app. FightingIrish.com already had the official current-game chart posted, which exposed the source-priority problem: a structurally valid snapshot can still be stale or wrong if its producer is watching the wrong publisher.

This is not a Notre Dame exception. As Project LND expands, source quality must scale with the team model.

## Rationale

Depth charts are team-issued information. The closest available authoritative source should own them.

This keeps the contract simple:

- TeamOS owns normalized behavior.
- Team configuration declares where team-specific authoritative data comes from.
- Ingestion translates that source into the existing snapshot shape.
- Suite renders the snapshot without knowing which school or website produced it.

The rule also avoids a dangerous fallback pattern where "some data" is treated as better than an explicit unavailable state.

## Consequences

- Notre Dame's depth declaration labels FightingIrish.com, not UHND.
- Notre Dame config declares its official depth-chart index.
- The Notre Dame depth producer moves from UHND HTML posts to FightingIrish.com official depth-chart PDFs.
- Existing beat-news feeds remain useful as News content but are not the two-deep source of truth.
- Ohio State continues to declare no depth snapshot until its official source is implemented.
- Future teams should identify their official roster/depth/media source during onboarding before enabling the Depth capability.
- The snapshot output remains provider-neutral so the Suite does not gain team-name conditionals.

## Related

- `docs/04_TEAM_CONFIG.md`
- `docs/decisions/0008-snapshots-are-owned-by-declaration.md`
- `teams/notre-dame.js`
- `.github/workflows/odds.yml`
