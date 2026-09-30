# Predictive ratings for Top 25 → Rankings: sources (W07, issue #29)

Feasibility, checked 2026-09-30 from GitHub's network (the production
runner) with `tools/probe_sources.py` via `.github/workflows/probe-sources.yml`.

## FPI: supported

- **Source:** ESPN's powerindex API,
  `site.web.api.espn.com/apis/fitt/v3/sports/football/college-football/powerindex?region=us&lang=en&season=<YYYY>&limit=200`.
  JSON, every FBS team (138 on 2026-09-30), ESPN team ids, FPI rating and
  rank, 7-day rank change, record, the season and week it belongs to, and
  ESPN's own `lastUpdated`.
- **Standing:** the same unofficial ESPN API family the app already reads
  (scores, schedules, rosters). No published terms grant reuse; this is on
  the list for the trademark/data consult before any commercial launch.
- **Real payload:** `tools/fixtures/espn-fpi-sep30.json` (captured by
  `capture-fixture.yml`, request `fpi-2026`).
- **Producer:** `tools/producers/fpi.py` → `data/league/fpi.json`. Refuses a
  wrong season, a partial table (<120 teams), a duplicate team, a missing
  rank or rating, or renamed columns, and keeps the previous snapshot.
  Writes only when ESPN publishes a new edition. Tested by
  `tools/fpicheck.py`.
- **Cadence:** ESPN says FPI updates daily. One observation so far:
  `lastUpdated` 2026-09-30T08:00Z (4 AM ET). **Not yet scheduled in the
  refresh:** per issue #29, record several days of observed `lastUpdated`
  here first, then add the producer to `odds.yml`.

## SP+: blocked

- The ESPN SP+ table is an article
  (`espn.com/college-football/story/_/id/49868647/...`). From the runner,
  every espn.com page (the FPI page too) answers **HTTP 202 with an empty
  body**: bot protection. Not bypassed.
- No structured ESPN SP+ endpoint is known.
- The realistic structured alternative is CollegeFootballData's SP+ ratings,
  which falls under CFBD's redistribution terms: Bill (CFBD, 2026-09-29)
  said displaying figures is fine but publishing the underlying data as
  publicly reusable JSON is not. Same open question as W15 / decision 0012.
- **Owner:** David (CFBD's answer, or ship FPI without SP+).
