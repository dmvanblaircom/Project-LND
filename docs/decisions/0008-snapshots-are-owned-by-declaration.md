# Decision: The Action's snapshots are team data, owned by declaration

## Status

Accepted

## Date

2026-09-18

## Decision

The three files `.github/workflows/odds.yml` commits for the team — the depth chart (`depth.json`, `depth-history.json`), the odds price history (`odds-history.json`) and the beat-writer stories (`news.json`) — are **team data**, and a team owns one only by declaring it. A team config gains a `snapshots` section with one entry per kind it has:

```js
snapshots: {
  depth:       { file: "depth.json", history: "depth-history.json", label: "UHND" },
  oddsHistory: { file: "odds-history.json" },
  beatNews:    { file: "news.json" }
}
```

A team with no source for a kind leaves it out (`snapshots: {}` for Ohio State). The Suite asks TeamOS, never a filename:

- `TeamOS.snapshots.get(config, kind)` → the declaration, or `null` — the *capability* question.
- `TeamOS.snapshots.owned(team, json)` → whether a loaded file belongs to this team — the *ownership* question. A file that carries a `team` field must match the Team's id; a file that carries none is trusted on the strength of the declaration.

The three Suite consumers behave the same way for every team: no declaration means nothing is fetched and the surface shows its unavailable state (Depth: the roster fold and "No depth chart. *Team* has no depth chart source in this Suite yet."; odds: the number with no sparkline; News: ESPN alone). A declared file that turns out not to be owned is treated exactly as if it were missing.

## Context

- **FACT.** Phase 5A (`docs/engineering/phase-5a-ohio-state-proof.md`) showed that with only a config swap, Ohio State's page rendered Notre Dame's two-deep, Notre Dame's price history under Ohio State's numbers, and sixty Notre Dame beat stories under "Latest Ohio State stories". Every ESPN-fed surface was correct; the three leaks were all files the Action writes and `app.js` read by fixed name.
- **FACT.** None of the four files carries a team field (`depth.json`: source, title, fetched, groups, battles, availability, date, changes; `odds-history.json`: updated, points; `news.json`: updated, items; `depth-history.json`: updated, snapshots). The Action rewrites them every thirty minutes, so a field added by hand would not survive.
- **FACT.** The Action was out of scope for 5B (`odds.yml` unchanged), as were a team selector, branding and the service worker's team handling.
- **DECISION (David, 5B brief).** Depth is a declared capability with an intentional empty state; odds history must be team-scoped by the smallest client-side guard; beat feeds are a declared content source; no `if (team === "...")` in the Suite.

## Options Considered

### Key the files by team id (`depth.notre-dame.json`)

Honest, but it is an Action change and a change to the service worker's precache list, and the ownership would still live in a filename convention rather than in something the Suite can ask. Deferred, not rejected: when the Action is parametrized by team this is the natural output shape, and `snapshots.*.file` already lets each team name its own file.

### Stamp the files with `team` and gate on it alone

The right long-term check, but the Action does not write the field yet, and without it every file would be refused for every team — including Notre Dame's today. Kept as the second half of `owned()` so that the day the Action stamps files, a stamped file for the wrong team is refused with no Suite change.

### Declare ownership in the team config, verify the stamp when present (chosen)

The declaration is the capability decision (does this team have a depth chart?) and, for now, the ownership assertion (the file it names is its own). A second team that declares nothing borrows nothing. This is the smallest mechanism that makes both questions explicit in configuration without touching the Action.

## Rationale

The Ohio State proof's lesson was that the remaining Notre Dame coupling is in data, not code. The fix belongs where the other team facts already live — the config — and the Suite should consume it the same way it consumes `sources` and `series`: by asking, with no team named in application code. Two functions were enough; a snapshot registry, a loader or a capability framework was not.

## Consequences

- `teamos/snapshots.js` (Phase 5B) exposes `get` and `owned`; `tools/adaptercheck.js` loads it in both the Notre Dame and the Ohio State context and asserts the two teams get different answers from the same calls, plus the stamped-file, malformed-declaration and no-payload cases.
- `app.js`: `loadSparklines`, `loadDepth`, `loadHistory` and `loadNews` read the file names from the declaration and pass every loaded snapshot through `owned()`. The Depth copy no longer says "Notre Dame" or "UHND" — it says `TEAM.name` and the declaration's `label`. For Notre Dame the rendered HTML is byte-identical to Phase 5A.
- `teams/notre-dame.js` declares all three; `teams/ohio-state.js` declares none.
- **ASSUMPTION (documented limitation).** Because the committed files carry no `team` field, ownership today rests entirely on the declaration. A config that wrongly declared another team's file would be believed. The check that would catch that — the stamp — waits on the Action.
- **OPEN QUESTION (deferred to the ingestion work).** When the Action is parametrized by team, should it stamp `team` into each file, key the file names by team, or both? `snapshots.js` accepts either without change.
- **OPEN QUESTION (deferred to Phase 7).** `sw.js` still precaches the six Notre Dame data files (`DATA_FILES`) and the Notre Dame config in its shell for whichever team is loaded. Harmless for a single-team deploy — a team that declares nothing never asks for them — but it is one of the things team selection must decide, together with the cache-pinning finding (5A finding 5).

## Owner

David (decision) / Claude Code (proposal and implementation)

## Related Documents

- `docs/engineering/phase-5a-ohio-state-proof.md` — the findings this resolves
- `docs/engineering/phase-5b-data-ownership.md` — what was done and how it was validated
- `docs/04_TEAM_CONFIG.md` — the `snapshots` section
- `docs/05_TEAMOS.md`, `docs/07_DATA_ARCHITECTURE.md` — the snapshot paths
- `docs/decisions/0007-newsitem-and-the-snapshot-boundary.md` — why the snapshot is not a provider
- `teamos/snapshots.js`, `tools/adaptercheck.js`

---

## Extension, 2026-09-21: a provider source is a capability too

The rule above was written for the files the Action commits. It applies equally
to a **provider that does not cover every team**.

Kalshi prices the championship contenders, not all of FBS. A team it takes no
market on has no number to show, and a card reading "No market" every week is
worse than no card — it occupies the same space to say nothing. So the Kalshi
markets are a declared capability, exactly like a snapshot:

- `TEAM_CONFIG.sources.kalshi` present → the team has the odds surface.
- Absent → `loadStrip()` removes the two cards, the hint that explains tapping
  them, and the board they open. `loadBoard()` and `loadSparklines()` return
  early. Kalshi is never called.
- Present, but the feed carries no market for this team on **either** event →
  the surface goes then too, once both queries have answered.

**The bug this fixed:** `teamMarket()` read `TEAM_CONFIG.sources.kalshi.tickerSuffix`
with no guard, so a config declaring no Kalshi source **threw** rather than
degrading. Notre Dame and Ohio State both declare one, so nothing hit it — the
next team to become selectable would have. Verified with a temporary Indiana
config (ESPN id 84, no Kalshi block): the page rendered as Hoosier Watch with
the whole odds surface absent and no console errors, while Notre Dame kept all
three elements.

Checked by `tools/adaptercheck.js`, which runs the real `loadStrip()` against a
stubbed page and asserts the surface was removed and Kalshi never asked.

**A harness bug found on the way, worth recording because it makes checks lie:**
the `liftFn` helper pulls a function out of `app.js` by matching to a closing
brace in column 1. A one-liner has none, so the match ran on and swallowed the
functions that followed — including a redefinition of the very stub the check
was watching. The check passed on a broken build. `liftFn` now refuses an
over-capture, and one-liners are stubbed instead of lifted.

## Update: per-team folders and stamped files (backlog C2, 2026-09-25)

The limitation above is closed. Every team's snapshots live in
`data/<team id>/`, declared in its config as before, so two teams' files can
no longer collide; the Kalshi markets every team's price is read from are
league-wide, in `data/league/`. Every producer now reads where to write from
the declaration (`tools/producers/teamconfig.py`), the workflow loops over the
teams that declare each kind, and the odds history and beat news are stamped
with their team like the depth chart and availability report already were. A
file written before the stamping is still trusted on its declaration.
Checked by `tools/adaptercheck.js` (every declared file under the team's
folder, no folder holding another team's file) and `tools/pipelinecheck.py`.
