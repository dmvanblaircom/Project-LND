# Phase 7 — Team selection

**Dates:** 7A 2026-09-19, 7B 2026-09-20 · **Branch:** `lnd/phase-7a-team-selection` from `project-lnd-platform` · **Decisions:** `docs/decisions/0011-the-registry-is-not-the-menu.md`

Split in two, the way Phase 5 was: **7A** made the team a run-time choice while keeping the shipped behaviour identical, so nothing regressed before the product question was settled. **7B** added the registry and the chooser that answers it.

## What the phase had to close

The build plan carried three findings into this phase, and they had to be answered together:

1. the service worker precached one team's config and artwork whatever team was configured, because a worker cannot read `TEAM_CONFIG`
2. the static `index.html` head and the `:root` defaults carry the deployed team
3. switching teams required clearing the shell and HTTP caches by hand

Plus the thing Phase 6 left behind: `buckeye.html`, a second page that existed only because the site could deploy one team.

## 7A — the team becomes a choice

The team was a line in `index.html`: one `<script src="teams/notre-dame.js">`, resolved when the site was deployed.

Three facts made run-time selection cheap rather than structural. All four TeamOS modules load with no team config present — verified by loading them into a bare context with nothing defined. Only `app.js` reads `TEAM_CONFIG`, on line 10. And the configs carry live regexes (`series`, `sources.kalshi.namePattern`, `broadcastFallback`), so they cannot become JSON and must arrive as scripts.

So the order is `teamos/*` (static, `defer`) → the team's config → `app.js`, and `boot.js` is the fifteen lines that arrange it.

**The worker.** `isShell()` already matched same-origin `.css/.js/.png/.svg`, so a team's config and artwork were *already* cached stale-while-revalidate on first fetch. Naming them in `SHELL_FILES` bought only the install-time seed. The fix was subtractive: the install list became the application shell and nothing team-specific, and the page tells the worker which files are its team's once identity is applied. Finding 1 closed.

Finding 3 dissolved with it — once the shell is the same for every team, switching teams touches nothing the worker has cached under a shared key.

**One bug caught mid-build.** The first cut put a team's snapshots into the *shell* cache, but the fetch handler looks for `.json` in the *data* cache. The offline copy of a depth chart would have sat where nothing reads. The message handler now routes by kind, and a check asserts it.

`buckeye.html` became a redirect to `?team=ohio-state` rather than a deletion, because links had been shared that morning.

## 7B — the registry, and the chooser

The product question was how a fan expresses the choice. The answer, from the brief: a chooser on a true first visit, with the league visible and only the built teams selectable.

### The registry is not the menu

```text
teams/index.js     138 FBS programs - the league
teams/<id>.js      a TeamOS config - what makes a team selectable
```

A team becomes available by someone writing its configuration. `built` exists in the registry but is **derived** from the contents of `teams/` by `tools/teamindex.js`, and the same tool fails the build when they disagree. There is no second list to maintain. The loop was exercised in both directions before committing: a stub `teams/indiana.js` made the check fail by name, regenerating made Indiana selectable, deleting it reverted.

**Enumerating the FBS was the hard part.** The site API's team list is capped at 500 and silently omits 16 FBS programs; its standings payload was missing an entire conference that day. Walking group 80's conferences in the core API gives all 138. Two ids from the first pass were wrong and are fixed: `Texas A&M` → `texas-am` (ampersand dropped, not spelled), `San José State` → `san-jose-state` (accents folded, kept in the display name). The two Miamis resolve as `miami` and `miami-oh`.

### Resolution, completed

| The visit says | What happens |
|---|---|
| `?team=<id>`, usable | that team, remembered |
| `?team=<id>`, not a usable id | the fallback team, **not** remembered, `LND.rejected` set |
| `?team=<id>`, usable but no config | the fallback team once, and the id is forgotten |
| nothing in the URL, something remembered | the remembered team |
| nothing at all | **the chooser** |

The distinction between the second row and the last is deliberate and was added during 7B. A visitor who asked to open *something* is given a team; answering them with a question would be a non-sequitur. A visit that asked for nothing is asked.

Falling back never writes anything down — otherwise someone whose link broke once would be quietly pinned to a team they never picked.

### The chooser

The registry is loaded **only when the chooser is shown** (19KB is not something a returning visitor should pay for) and is precached in the shell so it works offline. Its rules sit in `app.css` ahead of the responsive section, so the stylesheet's ordering rule holds. It paints in the deployed team's tokens, because no config has loaded yet — a cosmetic accident of a first visit, not worth a second palette.

## Validation

**Automated:** `node --check` ×14 · csscheck 377 rules, 0 shadowed, 0 dead · `tools/teamindex.js` (registry matches the configs on disk) · `tools/adaptercheck.js` **444** (up from 327 before the phase) · `tools/livecheck.js` 54.

The selection checks run `boot.js` against a stubbed page for every path, including four malformed ids (`../../etc/passwd`, spaces and capitals, empty, sixty characters), a well-formed id with no config, a registry that will not load, and storage that throws.

**Browser, on a fresh tab with no console output at all:**

| | Notre Dame | Ohio State |
|---|---|---|
| Header | #3, 3-0 | 2-1, zero icon tags |
| Schedule / Top 25 | 12 / 72 rows, 3 ours | 12 / 72 rows, 3 ours |
| Game Center | ND vs Purdue | Illinois at OSU |
| Depth | 6 folds, 3 reports | "No depth chart" + 100-man roster |
| News | 90 stories, 60 beat, 5 sources | 30 ESPN, 0 beat |
| Odds | both sparklines | none declared, none drawn |
| Accent | `#C99700` | `#BA0C2F` |
| Notre Dame leakage | — | none |

**The chooser:** 138 in the registry, 2 available, 136 listed and not offered; the filter tells Ohio State from Ohio Bobcats; an unmatched query shows the empty state; picking a team lands on `?team=` and is remembered; a bare URL afterwards goes straight there. 375px: no horizontal scroll, 48px targets, conference labels drop out.

**PWA:** exactly **one** service worker registration at scope `/`; each team's `start_url` is its own `?team=` URL; switching teams and switching back needs no cache clearing; the shell holds the app plus the registry plus only the team actually visited.

## What this phase did not do

No My Teams, no multiple followed teams, no accounts, no notifications, no backend, no new sports, no Suite IA change. The tabs are still Home / Top 25 / Game / Depth / News.

## Findings carried forward

| Finding | Status |
|---|---|
| SW precached one team's config and artwork | **closed** — team-neutral install list, page-declared team files |
| SW seeded one team's snapshots | **closed** — league-wide only; a team's arrive by message, routed to the data cache |
| Switching teams needed cache clearing | **closed** — nothing team-specific is cached under a shared key |
| `buckeye.html` as a second page | **closed** — a redirect to `?team=ohio-state`, removable once the shared links have been followed |
| Static head carries the deployed team | **open, accepted.** A crawler sees `index.html`'s head for every `?team=` link, so shared links preview generically. Pages does no server-side rendering and per-team HTML was explicitly retired (brief, decision 7). Revisit if it becomes a product or SEO requirement. |
| Conference realignment | **open.** Only a human running `--fetch` will notice. Not worth automating until it has happened once. |
| The chooser uses the deployed team's palette | **open, cosmetic.** |

## What it proves

```text
FBS registry  ->  is there a teams/<id>.js?  ->  selectable  ->  ?team=<id>
```

One deployment serves any configured team, the team is a run-time choice rather than a build-time one, and the list of teams a fan can pick is the list of teams that have been built — kept honest by the filesystem rather than by anyone's memory. Adding Indiana or BYU is writing `teams/indiana.js` and regenerating the registry; the chooser is not touched.
