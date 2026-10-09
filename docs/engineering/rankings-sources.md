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
- **Cadence:** ESPN says FPI updates daily. Observed `lastUpdated`
  (`probe-sources.yml` from a runner):

  | Read at (UTC) | `lastUpdated` |
  |---|---|
  | 2026-09-30 | 2026-09-30T08:00Z (4 AM ET) |
  | 2026-10-01 14:34 | 2026-10-01T08:00Z (4 AM ET) |
  | 2026-10-02 13:30 | 2026-10-02T08:00Z (4 AM ET) |

  Three days, the same 4 AM ET edition. **Scheduled Oct 2:** the producer
  runs in every `odds.yml` refresh (every 30 minutes). It writes
  `data/league/fpi.json` only when ESPN publishes a new edition, so the file
  moves once a day. A refused table keeps the last good one and never
  blocks the odds.

- **TeamOS model (Oct 1):** `teamos/ratings.js` → `TeamOS.ratings.fpi(snapshot,
  TEAM_CONFIG, season)`, Poll-shaped (`key: "fpi"`, `kind: "rating"`), top 25
  rows plus the active team's row wherever it ranks, rank and rating
  separate, ESPN's 7-day rank change as given (`changeWindow`), `current:
  false` for another season's table, `null` with no usable snapshot.
  Freshness: stale after 3 days without a new edition. Tested on the real
  capture through the real producer for ND and OSU by `tools/ratingscheck.js`.
  Not yet loaded by the app: the file now exists (refreshed above), and
  loading it waits on Codex's selector UI.

## SP+: approved, through CFBD and the edge API (was blocked until Oct 1)

Current state: buildable. The top 25 with ranks and ratings, through the edge API, credited to SP+ and CFBD (Bill, Oct 1; see the last entry). The history below is why ESPN is not the source.


- (History) The ESPN SP+ table is an article
  (`espn.com/college-football/story/_/id/49868647/...`). From the runner,
  every espn.com page (the FPI page too) answers **HTTP 202 with an empty
  body**: bot protection. Not bypassed.
- No structured ESPN SP+ endpoint is known.
- The realistic structured alternative is CollegeFootballData's SP+ ratings,
  which falls under CFBD's redistribution terms: Bill (CFBD, 2026-09-29)
  said displaying figures is fine but publishing the underlying data as
  publicly reusable JSON is not. Same open question as W15 / decision 0012.
- **Oct 1 update:** Suite now has its own server (decision 0030), and Bill
  confirmed display through it is fine; CFBD's SP+ could come through the
  edge API the way W15's yards allowed do. Open: whether SP+ (Bill
  Connelly's rating) carries its own terms - David's email to Bill.
- **Answered (Oct 1, found Oct 9):** Bill: "I have no objection to
  displaying the SP+ top 25 with ranks and ratings as you described,
  credited to SP+ and CFBD." SP+ is buildable: the top 25 with ranks and
  ratings, through the edge API, credited to SP+ and CFBD.
