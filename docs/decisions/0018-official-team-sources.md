# Decision: Official team sources own authoritative team data

## Status

Accepted

## Date

2026-09-22

## Decision

When a team or its athletics department publishes an official source for authoritative team data, TeamOS uses that source as the primary source of truth.

The source hierarchy for team-owned facts is:

1. Official team / athletics source.
2. Official league, conference or competition source when it is the authoritative publisher.
3. Trusted structured data provider when the official source does not expose the needed data reliably.
4. Reputable media/beat reporting as an explicit fallback, never presented as official.

This applies to depth charts, availability/injury reports, rosters, schedules, team statistics and similar team-maintained facts. It does not require replacing a reliable provider merely for branding; it requires checking for and preferring the authoritative publisher when that publisher provides the fact we need.

For the Depth surface specifically:

1. The weekly two-deep comes from the team's official athletics source when one exists.
2. A team config declares that official source under `sources.official`.
3. The ingestion job produces the team's depth snapshot from the declared official source.
4. Beat writers and other media sources may supplement context. If a school does not publish a chart, a reputable fallback may be implemented, but the snapshot must identify that source and the Suite must not call it official.
5. No team may borrow another team's data.
6. Availability follows the same hierarchy independently of the two-deep. Notre Dame publishes an official availability report, so Notre Dame uses it. A team that does not publish one may use reputable media reporting as a clearly identified fallback.
7. Absence of an official availability report must never be turned into "nobody is out."

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
- Notre Dame config declares both its official depth-chart and availability-report sources.
- The Notre Dame producer moves from UHND HTML posts to FightingIrish.com official depth-chart PDFs and official Notre Dame game-note/availability materials.
- Existing beat-news feeds remain useful as News content and as potential fallback context, but they are not Notre Dame's source of truth for the two-deep or availability.
- Ohio State continues to declare no depth snapshot until its source path is deliberately chosen.
- Future team onboarding includes a source audit for official roster, depth, availability, schedule and statistics sources before falling back to media or third-party data.
- The snapshot output remains provider-neutral so the Suite does not gain team-name conditionals.

## Related

- `docs/04_TEAM_CONFIG.md`
- `docs/decisions/0008-snapshots-are-owned-by-declaration.md`
- `teams/notre-dame.js`
- `.github/workflows/odds.yml`
