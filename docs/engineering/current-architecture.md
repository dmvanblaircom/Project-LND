# Current architecture (as built)

**FACT**, checked against the repository on 2026-10-01. Update this file in
the same PR as any change that makes it wrong. For the target design see
`docs/02_PROJECT_LND_ARCHITECTURE.md`; for the pre-refactor baseline,
`docs/01_CURRENT_IRISH_WATCH_ARCHITECTURE.md` (historical).

Suite is a vanilla HTML/CSS/JavaScript PWA on GitHub Pages
(`https://dmvanblaircom.github.io/Project-LND/`), one codebase for every
team. Notre Dame and Ohio State are configurations, not copies.

```
External sources ──► adapters (teamos/espn.js, cfbd.js, markets.js, weather.js; tools/producers/*.py)
                 ──► TeamOS (teamos/*.js: pure domain rules, no fetch, no DOM, no team names)
                 ──► app.js (network, caching, timers; hands Suite normalized data)
                 ──► Suite (suite/*.js: screens; no provider fields)
                 ──► the fan
```

## The page

| File | Role |
|---|---|
| `index.html` | The shell. Its boot script picks the team (`?team=`, then the saved choice, else the chooser: decisions 0013, 0016) and loads, in order: `teams/<team>.js`, `teams/index.js`, `teamos/*.js`, `suite/*.js`, `app.js`. |
| `teams/<team>.js` | One team's configuration: identity, colors, provider ids, official sources, Kalshi match, beat feeds (`docs/04_TEAM_CONFIG.md`). |
| `teams/index.js` | The program registry, regenerated weekly by `roster.yml` (decisions 0014, 0017). |
| `chooser.js` | The no-team-yet page (decision 0016); never loads `app.js`. |
| `teamos/*.js` | Domain rules every surface shares: game status/lifecycle/hero (`game.js`), live state (`live.js`), roster and depth chart (`roster.js`), Season Outlook (`outlook.js`), freshness (`freshness.js`), identity, registry, snapshots, sources, season figures. `ratings.js` (FPI for Top 25 → Rankings) is tested but not loaded until its snapshot is scheduled. Provider adapters: `espn.js`, `cfbd.js`, `markets.js` (Kalshi), `weather.js` (Open-Meteo forecast and geocoding). |
| `suite/*.js` | Screens: Home, Game, Top 25, Schedule, Roster, More; `nav.js` routes and paints the one header every screen wears (decision 0031), plus the swipe between a screen's views, and pull to refresh; `ui.js` shared pieces. Draw what TeamOS decided. |
| `app.js` | The controller: fetches, cache-first paint, polling, per-source freshness, and the one manual refresh that Refresh Data and a pull down both run. Lifts the launch screen onto a finished first screen. Names no team and reads no provider field. |
| `app.css` | One stylesheet; team color comes from identity tokens. |
| `sw.js` | Service worker. Precaches the essential shell (everything but PNG/SVG artwork: if any of it fails, the install fails and the working version stays; artwork that fails to cache does not block it) and one team's files at a time (decision 0015); stale-while-revalidate for the shell, network-first with cached fallback for data. An update carries the fan's data over, minus copies kept over 30 days. `VERSION` must change with any shell file (`tools/versioncheck.js`; CI runs it only after merge, see `check.yml` below). |

## Where data comes from

Three paths, chosen by how fresh the data must be and what its terms allow:

| Path | Used for | Why |
|---|---|---|
| **Browser → provider** | ESPN scores, schedule, scoreboard, game summary, rankings, news, roster; Open-Meteo weather and geocoding | Must be current; no key; CORS permitted. |
| **GitHub Action → committed snapshot** (`data/<team>/`, `data/league/`) | Kalshi odds and odds history, official depth chart and availability report, beat news; FPI producer ready (`tools/producers/fpi.py`), not yet scheduled | Changes over hours or days; Kalshi sends no CORS header; official PDFs need parsing. Runs from `odds.yml` (decision 0020 cadence). |
| **Browser → Suite's edge API → provider** (`worker/`, `https://suite-api.dmvanblaircom.workers.dev`) | CollegeFootballData season figures (Matchup yards allowed) | Needs a key kept server-side, and CFBD's terms allow display but not publishing its data as files (decision 0030). |

Snapshots are owned by declaration (decision 0008): a team that declares no
source for a kind shows that kind as unavailable, never another team's data.

## Automation (`.github/workflows/`)

| Workflow | When | What |
|---|---|---|
| `check.yml` | Every PR into `main`, and pushes that touch code | Syntax, CSS, every `tools/*check` gate, and the browser checks: visual (both teams, four widths), outage, upgrade, postseason, More, Roster, flicker, launch, swipe, pull, focus. `VERSION` (`tools/versioncheck.js`) runs only on the push to `main` after a merge, not on the PR, so run `node tools/versioncheck.js origin/main` before merging |
| `odds.yml` "Refresh team data" | The Worker's clock at :07/:37 (`source=clock`, live since 2026-10-01) and GitHub's scheduler (best effort) | Odds, news, depth chart, availability, freshness monitor; the ESPN-from-Worker probe on Saturdays (W19 Phase 0) |
| `roster.yml` | Tuesdays | Regenerates `teams/index.js` |
| `worker.yml` | Push to `worker/**` | Tests and deploys the edge API; waits for the new version; smoke-tests CFBD (names only in logs) |
| `verify-production.yml` | By hand after each deploy (its after-Pages trigger has not fired for this site's Pages deployments: every run to date was started by hand) | `tools/prodcheck.js`: the live site serves this release's service-worker `VERSION`, with Suite's identity assets |
| `capture-fixture.yml`, `probe-*.yml`, `cfbd-probe.yml`, `stress.yml` | By hand | Capture real payloads as fixtures; probe sources from a runner; stress tests |

## Delivery

`main` is the product. Every change is a short branch and a PR; merge
commits only, after all checks pass; then Pages deploys and
`verify-production.yml` confirms the new version (CLAUDE.md, Branch
Strategy). Rollback: `docs/engineering/rollback-runbook.md`.

## Known gaps (tracked in `docs/engineering/backlog.md`)

- `app.js` still owns several stores and timers (W10); the schedule now joins a request already out, like the scoreboard.
- Ohio State lacks official depth/availability sources and beat news (W20).
- Internal `iw-` names remain (C16), by decision.
