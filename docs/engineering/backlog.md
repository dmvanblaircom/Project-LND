# Project LND: active delivery queue

Reconciled October 12, 2026 against main after merged PRs #126, #128 and #129; updated October 15 after #137, #139, #140 and #141 merged. David authorized Codex to continue ready work while Claude is unavailable
until **Wednesday October 14, noon America/New_York**. This is the current queue;
the [prior queue](backlog-archive-2026-10-11.md) is historical, not instructions
to rebuild completed work.

Start with [the October 14 handoff](claude-handoff-2026-10-14.md). It records
ready branches, ownership, integration order and concrete acceptance checks.
Main continues receiving data refreshes, so inspect it and open PRs before work.

## Built for review, not yet shipped

| Item | Owner | Evidence | Remaining gate |
|---|---|---|---|
| SP+ in Rankings (rest of W07, #29) | Claude | PR #142: edge route `/v1/cfbd/sp`, `TeamOS.ratings.spPlus`, a fifth rating source with its own load state, no Change column; workercheck, ratingscheck, 99-check ratingsflowcheck; four Codex findings resolved (one declined, with David) | David's visual OK on the 320px selector (SP+ wraps to its own row), merge, Worker deploy, production verification; then close #29 |
| Kickoff time set switch (W19) | Claude | PR #143: fourth Game row in Settings, off by default and for saved choices, Everything pick only; alertscheck | CI and review, merge, production verification |
| Offseason orientation and handoff (W16) | Codex | Base preview merged in #128; v2 last-result refinement and screenshot checks in draft PR #131 | David reviews S2/S4 rendered states; no production season wiring yet |

## Ordered remaining implementation

| Order | Item | Owner / remaining scope |
|---|---|---|
| 3 | Offseason and rollover (W16), due mid-November | Claude: next-season fetch, production state wiring, source outcomes, recruiting/draft refresh and season-matched markets. Codex: approved S2/S4 screens, prospect presentation and seasonal nav. Existing season/prospect models and postseason fetching are built. |
| 5 | Postseason notifications (W19) | Claude: CFP released, Selection Day, team postseason set and authoritative no-postseason outcome. Codex: controls/copy. Advance calendar-sensitive slices before the relevant event. |
| 6 | Photography (W13) and targeted visual finish (W14) | Codex: deployable Home/Game imagery, focal points/crops, responsive fallback; review Outlook, alert Settings and recent notes/badges. No broad brand reset. |
| 7 | Ohio State remainder (W20) | Claude: conference-only availability freshness expectations; depth chart only after Ourlads permission. Codex: team parity. News, history and Big Ten availability already ship. |
| 8 | Historical Stats (W27 phase 3) | Claude: verify past-season sources/caching and athlete identity. Codex: season selection and career pages. Current Team and Players views already ship. |
| 9 | Bounded reliability (W10) | Claude: repeated same-version worker install; simplify source/refresh ownership only where useful. Preserve existing recovery and negative controls. |
| 10 | Release evidence (W09) | Codex/Claude: resolve pending-design-review item 4 against current outage/upgrade evidence. David: physical iPhone/Safari/PWA observations. Do not mark a device pass from desktop CI. |

## Later product-scoped work

- **W22:** smallest useful My Teams/personalization scope and prototype before
  persistence work. Current selected-team/style preferences already work.
- **W23:** choose one participation feature based on a fan need; define the
  service/moderation scope before building. Alternatives are not four approvals.
- **W24:** concrete fan-validation and measurement plan; no analytics vendor
  or telemetry implementation is approved merely by listing the task.
- **W25:** each owner updates current docs with accepted changes. Old branches
  remain by David's decision; no manual branch-deletion campaign.

## Completed implementation: do not rebuild

| Work | Merged evidence |
|---|---|
| Mobile Top 25 / Home / Game narrow-layout fixes | #126 (merged October 12) |
| Core type, Ink/Pearl, Home/Game, Stats presentation and motion | #100, #104, #105, #106 |
| Unified header; Settings gear; Full Schedule links | #76, #120, #72 |
| Team Stats and Players season leaders | #82/#84, #92; presentation #104 |
| Full-field Season Outlook | #109; targeted presentation review remains |
| Game alerts and October 10 live delivery | #102/#103, #116, #119, #121; 34 completed deliveries, relative latency not measured after the speed fix |
| OSU beat news/odds history and conference availability | #89, #118 |
| FPI producer/model/scheduled refresh | #35, #53, #90; UI is draft PR #130, not main yet |
| Season phase model, source-supplied bowl labels, prospects foundations | #9, #94, #101; production offseason integration remains |
| Battle/open-job framing limited to preseason/Game 1; OR retained | #39 |
| Game notes and complete roster fetching | #114, #122 |
| Unknown live-drive duration (Oct 10 scan #6) | #139 |
| Kickoff time set/changed alerts and one delivery per device when it follows both teams | #140 (Worker edge-2026-10-14a); Settings switch is #143 |
| Game Alerts Settings: master switch and unified rows | #137 (Codex) |
| Halftime: no possession football; who gets the ball to start the second half stays | #141 (David, October 14) |
| FPI in Rankings | #130 (Codex; replaced #127) |
| Game team-toggle scroll stability | #123 |
| Safe play text including overturned/no-play fixes | #78, #125; recheck the scan example before any new rewrite |
| Refresh-clock setup, public-relay removal, source recovery fixes | #47, #46 and subsequent fixes including #58/#110 |
| Shared browser-check server (W26) | #57; no repeat consolidation project |
| Typed rivalry/trophy/event records (W21) | #62 |
| Final flat Suite icons/wordmark and Share Suite | Released identity assets; sharing #87 |

## Superseded instructions

- W06's larger depth-change disclosure was withdrawn October 1. Preserve
  compact changes, arrows, official OR and Week by week. Issue #30 was closed as not planned on October 12; do not rebuild it.
- Instrument Sans/Display with **Georgia**, not Instrument Serif (October 4/5).
  OSU Team Style uses Nunito Sans. ND retains Suite type.
- Unified SUITE/team header stands; Settings is the header gear, with no
  selected bottom tab while open (0031, 0034).
- The halftime receiver football approved in #23 is gone: David, October
  14, "Drop the football but keep the 'gets the ball' line" (#141). The
  "X gets the ball to start the second half" text stays on Top 25, the Game
  header and Home.
- The edge API and push service already exist. Do not commission a backend
  proposal or replace SQLite Durable Objects with a new database by default.

## External and conditional follow-ups

- **Ohio State game notes are not published publicly.** Four probes (October
  11–15, `probe/osu-notes`) found no weekly notes on ohiostatebuckeyes.com:
  every Game Center carries only a box score, and the schedule page links
  only season and career stats PDFs, even on the Thursday of Indiana week.
  The notes features (pronunciation, captains, series card, By the Numbers,
  milestone countdown) stay Notre Dame-only unless David names another source.
- Ourlads permission for OSU depth remains external. No projected chart on
  assumed permission; official OR designations stay as supplied.
- January live provider verification for polls/markets remains dated; use
  existing real historical fixtures to build before then.
- Keep capturing real exceptional delayed/suspended/canceled payloads when
  available. Do not label invented fixtures as real captures.
- Before a broader public launch, replace the repeated test push with an
  on-screen confirmation or first-time-only push, as David already decided.
  Preserve current licensing/data decisions; revisit before monetization or
  wider promotion. No new licensing outreach is authorized by this queue.
- Physical iPhone checks, the old shared-link Safari launch observation and
  measured push latency need David's observations; do not assume completion.
- Internal iw- identifiers and optional old Cloudflare GitHub App cleanup
  are not fan-facing build blockers. More teams/sports and transfer sources
  stay discovery, not unlimited implementation scope.

## Delivery contract

One owner per slice, short branch and PR, preserve TeamOS/Suite boundaries.
Codex implements production UI and the narrow runtime wiring required for
already-built models. Claude retains source/service/season/polling ownership.
No concurrent edits to shared app.js/app.css/suite modules without a handoff.
Required checks, concrete visual review and David's release approval precede
merge. A source blocker blocks its item only. Update this queue after accepted
merges; built, tested, approved, merged and production-verified are distinct.
