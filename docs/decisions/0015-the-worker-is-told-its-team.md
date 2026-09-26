# Decision: the worker precaches no team, and is told which one it has

## Status

Accepted. Amended by decision 0024 §11: the manifest and install icons
are Suite's, not a team's, so they are precached with the shared shell and no
longer appear in the page's team message. Everything else here stands.

## Date

2026-09-21

## Decision

The service worker's shell is in **two halves**:

| Half | What | When |
|---|---|---|
| **Shared** | the page, `app.css`, `app.js`, `teamos/*`, `teams/index.js` | precached at install |
| **This team's** | `teams/<id>.js`, its manifest, its artwork, the snapshots it declares | cached when the page says so |

A worker has no `TEAM_CONFIG` and no `localStorage`, so it cannot know which
team a browser chose. The page does. After identity is applied it posts

```js
{ type:"team", team:<id>, manifest:<path>, shell:[...], data:[...] }
```

and the worker caches those and **records whose they are**. Every path is
derived from the team's own configuration — `TeamOS.snapshots.files(config)`
for the data, the identity block for the artwork — so a team that adds a
snapshot or an icon gets it cached with no second list to update. The worker
also reads the manifest it just cached and caches the icons *that* names, so
install artwork needs no separate declaration either.

**A message naming a different team deletes exactly the previous team's
declared files** — by name, not by emptying the data cache. League-wide files
and provider responses in there belong to nobody, and a fan who switches teams
should not lose the Top 25 odds they already had offline.

## Context

- **FACT.** Before 7B, `SHELL_FILES` named `teams/notre-dame.js` and
  `assets/notre-dame/*`, and `DATA_FILES` named Notre Dame's snapshots — the
  default team's, whatever team the page was showing.
- **FACT.** Decision 0008 makes snapshots owned by declaration: a team that
  declares none must show those surfaces as unavailable rather than read
  another team's file. A data cache that survives a team switch breaks that
  rule *offline*, where nobody can see it happening.
- **FACT.** `teams/<id>.js` and team artwork match `isShell`, so they are
  fetched and cached on demand anyway. What install-time precaching adds is the
  **first** visit working offline — which for a second team it never could,
  because the worker had not heard of it.
- **FACT.** A team's identity block names five images. Its manifest names three
  more (install and maskable icons) that identity does not.

## Options Considered

### Precache every known team

Correct offline from the first visit, for everyone. Rejected: it multiplies the
install by the number of programs, and the registry is meant to grow to all of
FBS. A fan downloads 130 teams' artwork to look at one.

### Give each team its own cache bucket

Clean isolation, and switching back is instant. Rejected for now as more
machinery than the problem needs: the shell is shared anyway, and deleting the
previous team's declared files by name gets the same isolation with no new
cache lifecycle to reason about at version bumps.

### Have the worker fetch and parse the team config itself

It could `fetch("teams/" + id + ".js")` — but it would have to *evaluate* JS to
read the config, or parse it by regex. Both are worse than being told.

### The page tells the worker (chosen)

The page already computed all of it. One `postMessage` after `paintIdentity()`,
and the worker's only job is bookkeeping.

## Rationale

This is the same split as decision 0010: the **rule** about what a team owns
stays in TeamOS (`snapshots.files`), and the **orchestration** — when to say it,
what to purge — stays in the Suite and the worker. The worker holds no opinion
about teams; it holds files and a note saying whose they are.

Deleting by name rather than by cache is the part worth keeping. "Empty the data
cache" is the easy version and it is wrong in a way nobody would notice offline:
it throws away league-wide data that no team owns.

## Consequences

- `sw.js`: `SHELL_FILES` is team-neutral, `DATA_FILES` is gone, and a `message`
  handler adopts a team. `VERSION` → `iw-2026-09-21d`.
- `TeamOS.snapshots.files(config)` (new) lists every file a team declares, across
  kinds, file and history together.
- `app.js`: `teamCacheManifest()` and `tellWorkerOurTeam()`, sent on
  `serviceWorker.ready` and again on `controllerchange` — a worker that takes
  control after an update has not been told anything yet.
- **First visit to a team while offline still cannot work.** Nothing can fix
  that; the files have never been fetched. Once a team has been opened online,
  it works offline, and switching between opened teams works offline.
- `tools/swcheck.js` (new, in `check.yml`) runs `sw.js` against a stubbed Cache
  API. Three negative controls were **observed failing**: not clearing the
  previous team on switch, emptying the whole data cache instead of the team's
  files, and precaching the default team's config at install.
- Verified in a browser: Notre Dame → Ohio State → Notre Dame, online and then
  offline, with no Notre Dame text or data appearing on the Ohio State page in
  either state.
- **OPEN QUESTION.** The mark lives in the shell cache under `./__team`, which a
  version bump discards along with the rest — so the first load after an update
  re-caches the current team and purges nothing. Harmless, and cheaper than a
  separate store.

## Owner

David (that a second team must work offline without contaminating the first) /
Claude Code (the mechanism and the checks)

## Related Documents

- `docs/decisions/0008-snapshots-are-owned-by-declaration.md` — the rule this
  enforces where nobody can see it
- `docs/decisions/0013-the-page-chooses-its-team.md` — how the page knows
- `docs/decisions/0014-one-registry.md` — the other consumer of the registry
- `sw.js`, `tools/swcheck.js`
