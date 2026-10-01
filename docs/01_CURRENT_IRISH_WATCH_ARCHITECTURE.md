# Current Irish Watch Architecture

> **Historical baseline.** This describes Irish Watch before the TeamOS /
> Suite refactor (September 2026), and is kept as the starting point the
> architecture was measured from. Several files it lists no longer exist.
> For the application as it is built today, see
> `docs/engineering/current-architecture.md`.

## Current Stack

Irish Watch is a lightweight browser-based PWA built with:

- HTML
- CSS
- Vanilla JavaScript
- Browser APIs
- Service worker / offline caching
- Local JSON snapshots
- ESPN data
- Kalshi data
- RSS/news sources
- GitHub Actions for automated data workflows
- Automated syntax and CSS checks

The existing implementation is a useful foundation for Project LND. A rewrite is not the goal.

## Key Files

- `index.html` - application shell and semantic UI structure
- `app.css` - visual design and responsive styling
- `app.js` - application logic, data fetching, normalization, rendering, and interaction
- `sw.js` - service worker and offline/cache strategy
- `manifest.json` - PWA metadata and icons
- `news.json` - local news snapshot
- `depth.json` / `depth-history.json` - depth data and history
- `odds-title.json` / `odds-playoff.json` / `odds-history.json` - odds data
- `.github/workflows/odds.yml` - automated data ingestion and Notre Dame-specific workflows
- `.github/workflows/check.yml` - automated validation

## Current Application Flow

The application currently combines several responsibilities in a relatively centralized JavaScript file:

1. Fetch external data.
2. Interpret provider-specific response shapes.
3. Apply sports/domain logic.
4. Apply Notre Dame-specific assumptions.
5. Normalize some values.
6. Render UI.
7. Manage loading, stale, and offline states.
8. Handle user interaction.

This works for a single-team proof of concept but creates the main architectural problem for Project LND: team knowledge, provider knowledge, and presentation logic are mixed together.

## Current External Sources

The current app uses ESPN for core college football data and additional sources for odds, news, depth information, and weather. GitHub Actions also maintains local snapshots.

The exact provider set can change. Project LND should avoid making provider schemas part of the Suite contract.

## Current Notre Dame Coupling

Examples of Notre Dame-specific coupling include:

- ESPN team ID `87`
- Notre Dame-specific neutral venue assumptions
- Notre Dame series/trophy mappings
- Notre Dame broadcast fallbacks
- Notre Dame beat-writer RSS sources
- Notre Dame depth-chart parsing
- Notre Dame odds workflows
- Notre Dame branding in HTML, CSS, and manifest metadata

These are not inherently bad. They are expected in a Notre Dame-first product. The issue is that they need to become explicit data/configuration or TeamOS responsibilities as the platform generalizes.

## PWA Architecture

The service worker is an important strength and should be preserved. It provides:

- Versioned shell/data caches
- Stale-while-revalidate behavior for shell assets
- Network-first behavior with cached fallback for data
- Offline support
- Cached-data state signaling

Do not remove this architecture during the TeamOS/Suite refactor unless there is a concrete replacement that preserves the same user experience.

## Existing Strengths

- Small and understandable technology footprint
- Fast browser experience
- PWA support
- Offline resilience
- Responsive design
- Accessibility considerations
- External data integrations
- Automated workflows
- Local snapshots/fallbacks
- Existing normalized game concepts
- Existing Notre Dame product identity

## Main Weakness

The biggest architectural problem is responsibility mixing.

The app currently knows too much about:

- Notre Dame
- ESPN response structures
- Other external providers
- Sports-domain concepts
- UI rendering

The goal is not to make the code abstract for its own sake. The goal is to establish boundaries that allow a second team to reuse the same application.

## Refactoring Question

The key question for every architectural change is:

> What boundary does this create that allows Irish Watch to become the first Suite built on TeamOS?

## Target Direction

Move toward:

External Sources
-> Adapters / Ingestion
-> TeamOS
-> Normalized Domain Model
-> Suite
-> Fan

Keep the existing working application intact while extracting these boundaries incrementally.
