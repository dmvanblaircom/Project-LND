# Decision: official sources first, then a credited projection

## Status

Accepted. It refines decisions 0008 and 0019 (a team's snapshots are the
team's own documents) for kinds a team does not publish.

## Date

2026-10-02

## Decision

David, 2026-10-02: "If beat-writers are publishing projected depth charts
then that deserves its place. I think the rule should be official sources
FIRST, not official sources ONLY. For the teams that don't publish
officially, you could just say 'Projected depth chart' for that week and
then give credit to the source of the projection."

- **Official first.** Where a team publishes the document (Notre Dame's
  two-deep on FightingIrish.com), that is the source, and nothing else is
  shown.
- **Then a credited projection.** Where it does not, as Ohio State
  publishes no weekly depth chart, a beat writer's or scouting service's
  projection may stand in. It must be:
  - labelled as a projection for that week ("Projected depth chart");
  - credited to its source by name, with a link;
  - never presented as the team's own.
- **Then unavailable.** With neither, the kind stays honestly
  unavailable, as today.

## What it applies to

The depth chart first. The rule is general: any team-document kind
(availability included) follows official → credited projection →
unavailable, declared per team in its config. The source and its kind
(official or projection) are part of the snapshot, so the view says which
it is.

## Conditions

- **Permission, not only credit.** A projection is someone's editorial
  work, so credit alone is not permission to republish it. A source is
  used only where its terms allow it, or with its permission. That is the
  same test CFBD's data passed (decision 0030).
- **The same shape.** A projection is parsed into the depth snapshot the
  official chart uses, so no Suite view branches on the team.
- It is fetched by the same Action, and a failed fetch keeps the last
  good copy, called old.

## Consequences

- W20: Ohio State's Roster can show a projected depth chart, credited,
  once a source passes the permission test
  (`docs/engineering/ohio-state-sources.md`).
- The depth snapshot gains a `kind` ("official" | "projection") and a
  credit. Suite says "Projected depth chart" and names the source.
