# Decision: one registry, and availability is derived from it

## Status

Accepted

## Date

2026-09-21

## Decision

`teams/index.js` is the **canonical registry** of programs the Suite knows
about. There is exactly one such list, and **a program is selectable because it
names a config** — not because a flag says so:

```text
teams/index.js  ->  TEAM_REGISTRY  ->  TeamOS.registry  ->  the chooser (7C)
                                                         ->  anything asking
                                                             "can we open this?"
```

A row with a `config` is available. A row without one is a program the product
knows about and cannot yet render — a real state, and the one the chooser greys
out rather than hiding.

**Nothing else marks availability.** No `available: true`, no second list of
"teams we support", nothing for the two to disagree about.

The **boot script keeps no list at all.** It runs before the registry has
loaded, so it cannot consult it; it checks that `?team=` is shaped like an id
(`^[a-z0-9-]+$`, because an id becomes a file path) and then tries to load
`teams/<id>.js`. If that 404s it falls back to the default. The file system is
the list.

## Context

- **FACT.** 7A shipped a hard-coded `var TEAMS = ["notre-dame", "ohio-state"]`
  in the boot script, plus `teams/*.js` on disk — two lists, and a check whose
  only job was to police the duplicate.
- **DECISION (David, 2026-09-21).** The registry holds all FBS programs; only
  those with configs are selectable; Notre Dame and Ohio State are selectable
  now; Indiana and BYU exist but are not; and there is to be no second manually
  maintained "available teams" list.
- **FACT.** An id from `?team=` becomes a file path. It has to be shape-checked
  somewhere that runs before anything loads, which is the boot script.

## Options Considered

### A flag on each row

`{ id: "indiana", available: false }`. Rejected: it is a second source of truth
wearing one list's clothes. Someone writes `teams/indiana.js` and forgets the
flag, and the team exists but cannot be chosen — silently, because nothing
contradicts anything.

### The boot script keeps the list of known teams

What 7A did. Rejected under the constraint above, and it was already wrong: the
list sat in markup that the registry could not see and no team could update.

### A build step generating the registry from `teams/*.js`

There is no build step, and `CLAUDE.md` says not to add infrastructure for
architectural convenience. Also loses the point of the registry — the programs
that do *not* have configs are exactly what a chooser needs to show.

### One list, availability derived, 404 as the fallback (chosen)

The registry is authored once per program. Adding a program is a row; making it
selectable is writing its config and naming it. `tools/registrycheck.js` fails
if a named config is missing or a config on disk is unnamed, so the two cannot
drift.

## Rationale

The question "which teams can I pick?" has one honest answer — the ones we can
actually render — and that is a fact about the repository, not an opinion to be
recorded twice. Deriving it means the failure mode is a failing check rather
than a team that exists in one place and not the other.

Letting a missing config 404 rather than gating on a list is the same idea
applied to the boot script: it does not need to know which teams exist, only
what to do when one does not.

## Consequences

- `teams/index.js` (new) and `teamos/registry.js` (new): data and rule, the same
  split as `teams/notre-dame.js` and `teamos/team.js`.
- `TeamOS.registry.create(list)` gives `all`, `available`, `byConference`, `get`,
  `isAvailable`, `configFor`, `isId`. A malformed row is dropped, not thrown on
  — a typo in one program must not take the chooser down.
- The boot script's `TEAMS` array is gone. It shape-checks and falls back.
- **A race this exposed:** a 404 is reported asynchronously, so the fallback
  config is injected *later* than everything else. `app.js` reads `TEAM_CONFIG`
  as it parses, so it can no longer go in at `DOMContentLoaded` — it waits for
  the DOM **and** a loaded team config, in either order.
- `tools/registrycheck.js` (new, in `check.yml`) checks both directions, that no
  row declares availability, and that the registry's id shape is the same one
  the boot script enforces.
- **INCOMPLETE.** The registry is not yet all of FBS — it holds the four
  programs the product has a decision about. Filling it needs the authoritative
  roster (ESPN publishes it in one call at
  `/apis/site/v2/sports/football/college-football/teams?limit=500`), which the
  environment this was built in cannot reach. It is deliberately not typed from
  memory: a wrong name or a stale conference here becomes a wrong name in the
  chooser.

## Owner

David (the product rules above) / Claude Code (the mechanism and the checks)

## Related Documents

- `docs/decisions/0013-the-page-chooses-its-team.md` — the boot script
- `docs/decisions/0015-the-worker-is-told-its-team.md` — the other consumer
- `teams/index.js`, `teamos/registry.js`, `tools/registrycheck.js`
