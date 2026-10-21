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

Current state: **built (2026-10-14)**, live once its pull request merges. The top 25 with ranks and ratings, through the edge API, credited to SP+ and CFBD (Bill, Oct 1; see the last entry). The history below is why ESPN is not the source.

- **Route:** `GET <edge>/v1/cfbd/sp?year=` (worker/src/index.js; `edge-api.md`
  has the identity join, cache and failure rules). Only rank, school, id
  and rating, for rows ranked 25 or better.
- **TeamOS model:** `TeamOS.ratings.spPlus(body, TEAM_CONFIG, season,
  TEAM_REGISTRY)`. It is Poll-shaped like FPI (`key: "sp-plus"`). It has no
  record and no change (`changeWindow: null`), and no edition time
  (`updated: null`; `fetchedAt` is only when it was read). `mine` is set
  only within the top 25. An id is kept only when the registry lists it
  under the same school name. Tested by `tools/ratingscheck.js`.
- **Screen:** `#top25/rankings/sp-plus`, a fifth source after FPI. It has
  its own load, saved copy, retry clock and failure in app.js (`RATINGS`).
  There is no Change column, and the source line credits SP+ and
  CollegeFootballData. If this season is not published, last season's
  table is shown and labelled. If neither is published, the screen says
  so. Tested in the browser by `tools/ratingsflowcheck.js`.


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

## Earlier weeks: the week picker (David, 2026-10-20)

Top 25 → Rankings has a week picker for each source. It defaults to the newest week, and every earlier week stays available. The data:

- **AP, Coaches, CFP.** ESPN's site `rankings` endpoint answers only the current week, and it ignores season and week parameters. ESPN's core API keeps every released week:
  - `seasons/<Y>/types/<T>/weeks/<N>/rankings` lists the polls released that week (AP 1, Coaches 2, CFP 21).
  - `.../rankings/<id>` is one poll.
  - Season type 1 is the preseason poll, type 2 the regular season's weeks, type 3 the final poll. The core API answers 404 for regular-season week 1.
  - Ranked teams are links only (`teams/<id>`). Each one's name is read once from its core-API record; the site API's FBS team list is incomplete (Miami, No. 1 in week 8, is missing from it).
- **The producer.** `tools/producers/rankings_history.py`, run by the refresh workflow, keeps `data/league/rankings-<Y>.json`.
  - The first run fills the season so far.
  - Later runs read only the newest weeks, plus the latest kept one, which ESPN can still correct.
  - A week that is not a complete top 25 is refused and never replaces a kept one.
- **FPI.** `fpi.json` is kept once per FPI week in `data/league/fpi-history-<Y>.json`. The rankings file carries only the list of those weeks, so the picker can be drawn without fetching the tables.
  - **Earlier weeks are filled in (David, 2026-10-21)** from ESPN's core API, which keeps FPI by week: `seasons/<Y>/types/2/weeks/<k>/powerindex`.
  - Its week *k* is FPI after week *k*'s games: the table the app's feed calls "Week *k*+1", going into that week. The probe of Oct 21 matched core week 7 to the kept Oct 20 "Week 8" on all 138 teams' rank, rating and record.
  - The 7-day rank change differs: the feed read 0 for every team on Oct 20, and the core API keeps the week's own change. Backfilled weeks keep the core figure.
  - The core API has no preseason FPI (season type 1 answers an empty list), so Week 1 cannot be filled.
  - A week already kept is never replaced; a partial or other-season table is refused. Names and abbreviations come from `fpi.json`'s own rows.
- **SP+ (David, 2026-10-21).** CFBD publishes only the current table, and its data may be shown but not published as a file (decision 0012), so its weeks are kept by the edge API in its own store, not in the repository (`edge-api.md`, *Weeks kept*). The SP+ answer lists the kept weeks; an earlier one is read from `GET /v1/cfbd/sp/week` only once it is picked. Its history starts the week this shipped: no earlier SP+ week can be filled in. Bill's weekly ESPN columns are behind ESPN+ and outside his permission, and are not scraped.
- **The app.** The current week always comes from the live source (the feed's poll, `fpi.json`), never from a kept copy. A kept week is shown only when its address asks for it: `#top25/rankings/<source>/<pre|wN|final>`.

Fixtures: `tools/fixtures/espn-corerank-*.json`, `espn-coreweeks-*.json`, `espn-coreteam-*.json` (real), and `rankings-2026-sample.json`, `fpi-history-2026-sample.json` (built from them), `espn-corefpi-2026-w6.json` and `-w7.json` (real, trimmed to the fields read) and `fpi-2026-w8-sample.json` (`fpi.json` as kept on Oct 20). SP+ in the browser check is made-up figures on the registry's names. Checks: `tools/rankingshistorycheck.py`, `tools/weekscheck.js`, `tools/workercheck.mjs`.
