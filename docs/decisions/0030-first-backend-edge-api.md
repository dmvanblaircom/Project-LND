# Decision: the first backend is a small edge API on Cloudflare Workers

## Status

Accepted. Not yet built.

## Date

2026-09-30

## Decision

Project LND gets its first backend: **our own small API on Cloudflare
Workers**. Suite talks to that API, never to a backend provider directly,
so any piece behind it can be replaced without touching Suite.

- **Now (first slice):** one Worker, one endpoint. It holds the
  CollegeFootballData API key server-side, fetches CFBD, caches, and
  returns only the figures a screen shows (for example yards allowed for
  the two teams in a matchup). Nothing from CFBD is published as a file.
- **Next, on the same Worker:** a cron trigger that starts the data
  refresh on time, replacing the cron-job.org clock (W02), and the
  notification service (W19).
- **When accounts arrive (W22/W23):** managed Postgres (Supabase or Neon)
  behind the Worker. Chosen for portability: standard Postgres.
- **If notifications grow:** Firebase Cloud Messaging for delivery only. It
  fans out by topic and is the same path a future native app would use.
- **Stays where it is:** Kalshi odds keep coming from GitHub Actions
  (Kalshi rate-limits Cloudflare's shared network: `odds.yml`), and the
  other snapshots keep their current producers until there is a reason to
  move them.

## Context

- **A concrete product need**, which `CLAUDE.md` requires before a backend:
  CollegeFootballData (Bill, 2026-09-29) allows displaying its figures in
  the app but not publishing the underlying data as publicly reusable JSON.
  A static site can only show data it serves as a public file, so CFBD data
  (W15 yards allowed; SP+ for W07, if permitted) needs a server between the
  app and CFBD. Notifications (W19) need one too.
- **Scalability, as it applies to Suite** (David asked for it,
  2026-09-30): game-day read spikes (edge caching), push fan-out to every
  fan of a team within seconds (queues or a fan-out provider), per-user data
  (relational), and more teams (more of the same jobs). Workers answers the
  first two at the edge with no cold starts; Postgres answers the third
  when it is needed.

## Options considered

| Option | Why not first |
|---|---|
| Supabase alone | Strong for accounts and relational data, which nothing near-term needs; its free tier pauses inactive projects, a poor fit for a seasonal app. Kept as the likely database later. |
| Firebase alone | Excellent push fan-out, but a document store rather than relational, and high lock-in. Kept for push delivery if it grows. |
| AWS (Lambda, DynamoDB, SNS) | The most scalable on paper, but many services to wire, secure and pay for: a heavy operating cost for one part-time builder, for headroom Suite will not use for years. |
| No backend: stop committing the file, deploy it with the site | Removes the repository history but still serves a public, reusable file; does not clearly meet CFBD's condition. |

## Consequences

- Needs from David when the first slice starts: a Cloudflare account and a
  CFBD API key (both free tiers), stored as Worker secrets, never in the
  repository.
- A second deployable alongside GitHub Pages, with its own checks in CI and
  its own production verification, and a staleness story for what it
  serves (the source's time, the fetch time, a cached fallback that says
  so).
- The TeamOS/Suite boundary is unchanged: provider shapes are normalized
  before Suite sees them, whether the normalizing runs in a producer or in
  the Worker.

## Owner

David (the decision and the accounts) / Claude Code (build and operation)

## Related

- `docs/decisions/0012-second-stats-provider.md`: CFBD and its licensing
- `docs/engineering/rankings-sources.md`: FPI supported, SP+ blocked
- `docs/engineering/data-refresh-clock.md`: the clock this can replace
- `docs/engineering/backlog.md`: W07, W15, W19, W22, W23
