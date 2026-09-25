# Data Architecture

## Current State

Irish Watch combines live provider data, local snapshots, and GitHub Actions workflows. As of Phase 3A, one data path — the team's schedule — runs through a TeamOS adapter; every other path is still consumed in its provider or snapshot shape by `app.js`.

### The schedule path (Phase 3A)

```text
ESPN schedule JSON
      |
      v
TeamOS ESPN adapter        teamos/espn.js  — pure: (json, team, config) -> Game[]
      |
      v
Game[]                     docs/03_DOMAIN_MODEL.md — provider-neutral, team-perspective
      |
      v
app.js / Suite             S.games, S.next, hero, schedule rows, Game tab selection, prefetch
```

Transport and caching stay in the application layer for now. `app.js` asks the adapter for the URL (`TeamOS.espn.scheduleUrl()`), fetches it with its own `get()`, paints first from the service worker's cached copy (`cachedJSON()`), records staleness from the `X-IW-Cached` header, and polls during live games. The adapter only ever sees the JSON. Because the URL is produced by the adapter but unchanged in shape, the service worker's data cache and the cache-first paint keep matching.

### The roster and team-status paths (Phase 3B)

Same pattern, same file, no new mechanism:

```text
ESPN roster JSON  ->  TeamOS.espn.roster(json)      ->  RosterGroup[] of Player  ->  Depth tab roster fold
ESPN team JSON    ->  TeamOS.espn.teamStatus(json)  ->  { rank, record }         ->  header chips
```

`app.js` fetches `TeamOS.espn.rosterUrl()` / `teamUrl()` — unchanged URLs — and keeps the lazy load on fold open, the group pills, the search box and sorting.

### The league paths (Phase 4A)

```text
ESPN scoreboard JSON  ->  TeamOS.espn.scoreboard(json, config)  ->  LeagueGame[]  ->  Top 25 games list; "is anything live" for the poller
ESPN rankings JSON    ->  TeamOS.espn.rankings(json, config)    ->  Poll[]        ->  Top 25 rankings pills and lists
```

Both payloads reach the Top 25 build raw — from the worker's cache on first paint and from the network after — and cross into TeamOS at the top of the build, so the two paths see identical input. The scoreboard fetch is shared: the same payload feeds the tab and the live-anywhere check, and the application keeps the `LeagueGame[]` beside it for the in-place row patcher. The transitional helper exports from Phase 3A are gone.

### The Game Center path (Phase 4B)

```text
ESPN summary JSON      ->  TeamOS.espn.gameDetail(json, team, config)  ->  GameDetail    ->  renderGame / patchGame / gameShape / boxTables / schedulePoll
ESPN core stats JSON   ->  TeamOS.espn.seasonStats(json)               ->  SeasonStat[]  ->  renderPreview
```

`app.js` still fetches `TeamOS.espn.summaryUrl(id)` through `summaryFor()`, which keeps its in-memory copy, its Cache API store of final summaries (keyed on that unchanged URL) and its in-flight sharing, and converts the payload to `GameDetail` at the three call sites that render. The 25-second live poll, the rebuild-vs-patch decision (`gameShape`) and the in-place DOM patching are unchanged in behavior; they read `GameDetail` instead of the payload.

### The news path (Phase 4C)

```text
ESPN news JSON  ->  TeamOS.espn.news(json)   ->  NewsItem[]                                                                 ->  merge, dedupe, sort newest-first, "show more"  ->  News tab
data/<team>/news.json ->  beatItem() in app.js ->  NewsItem[]  /
```

`data/<team>/news.json` is this project's own snapshot, written by `.github/workflows/odds.yml` from each team's beat-writer RSS feeds; it is already NewsItem-shaped and is converted in the application rather than treated as a provider. Both fetches, the cache-first paint and the cache keys are unchanged.

With 4C every ESPN payload the Suite consumes crosses `teamos/espn.js`, and `app.js` no longer carries the ESPN base URL or the ESPN team id. What remains provider-shaped in `app.js` — Kalshi odds and the Open-Meteo forecast — is the deferred Phase 4D; the depth chart is the project's own snapshot.

### The team-data snapshots (Phase 5B)

Each team's snapshots are in `data/<team id>/`, named by the team's config (`snapshots`); the Kalshi markets every team's price comes from are league-wide, in `data/league/`. The workflow loops over the teams that declare each kind (backlog C2).

```text
TEAM_CONFIG.snapshots  ->  TeamOS.snapshots.get(config, kind)   ->  { file, history?, label? } | null
loaded snapshot JSON   ->  TeamOS.snapshots.owned(team, json)   ->  true | false

depth.json / depth-history.json  ->  Depth Chart (slots by level, week by week)        or the roster + "No depth chart."
availability.json (+ history)    ->  Availability (the official report, dated)         or "not yet available" (decision 0019)
odds-history.json                ->  sparklines under the odds numbers                    or the numbers alone
news.json                        ->  beatItem() -> NewsItem[] merged into the News tab    or ESPN alone
```

The four files `.github/workflows/odds.yml` commits are Notre Dame's data, not the application's. Since 5B the Suite reads their names from the team config's `snapshots` section and asks TeamOS whether a loaded file is the team's; a team that declares no snapshot for a kind fetches nothing for it and shows the unavailable state. The official personnel snapshots now carry `team: "notre-dame"`; the older market-history and beat-news shapes still rest on their declaration. A stamped mismatch is refused without a Suite change. Since Phase 7 the service worker receives the active team's declared files from the page, clears the previous team's snapshot data on a switch, and caches no team-owned file at install time.

## Target Flow

```text
External Sources
      |
      v
Adapters / Ingestion
      |
      v
TeamOS normalized data
      |
      v
Suite
```

## Provider Isolation

Provider-specific schemas should stop at the adapter boundary.

For example:

```text
ESPN API -> ESPN adapter -> normalized Game
```

The Suite should consume the normalized Game.

This makes it possible to change providers or add providers without rewriting presentation logic.

## Local Snapshots

Local JSON snapshots are currently useful for resilience, caching, and offline behavior. They do not need to be eliminated immediately.

They should eventually represent normalized data rather than leaking provider-specific response shapes into the UI.

## GitHub Actions

The current GitHub Actions workflows perform significant Notre Dame-specific ingestion and processing. They can remain initially. As of Phase 5B the Suite no longer assumes their output belongs to whichever team is loaded; the workflows themselves are unchanged.

Over time, move toward configurable pipelines where the team and provider are inputs rather than assumptions embedded in workflow logic.

## Content Model

News and media should be normalized into stable concepts such as `NewsItem` and `MediaItem` with source metadata attached.

## Odds

Odds are optional and capability-driven. Not every sport, league, or team will expose the same betting/market information.

## Weather

Weather should be associated with a game/venue context rather than treated as a generic team property.

## Freshness

TeamOS should eventually expose source freshness/status so Suite can distinguish between:

- Live/current data
- Recently cached data
- Stale data
- Unavailable data

This is especially important for a sports product where timing matters.

## Backend Timing

A dedicated backend becomes justified when product requirements need things such as:

- User accounts
- Persistent preferences
- Community
- Notifications
- Server-side AI workloads
- Shared user-generated content
- Durable analytics or personalization

Until then, avoid infrastructure for infrastructure's sake.
