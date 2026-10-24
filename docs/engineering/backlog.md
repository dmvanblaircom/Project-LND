# Project LND: active delivery queue

Reconciled October 21, 2026 against main after #142–#154 merged and were
production-verified (the last, #153, at 859f8ff); updated October 23 after
#155–#160, and for decision 0035 (Claude owns development and design). This is the current queue;
the [prior queue](backlog-archive-2026-10-11.md) is historical, not instructions
to rebuild completed work.

The ownership split in [the October 14 handoff](claude-handoff-2026-10-14.md)
still holds. Main continues receiving data refreshes, so inspect it and open
PRs before work.

## Built for review, not yet shipped

| Item | Owner | Evidence | Remaining gate |
|---|---|---|---|
| Offseason Home and seasonal navigation (W16) | Claude (from Codex, decision 0035) | PR #161 (draft; replaces #134, closed): the S2/S4 Home cards and seasonal navigation. The season data it needs is merged: `TeamOS.season.offseason` (#153), contract in [offseason-season-data.md](offseason-season-data.md) | David approved the S2/S4 preview on 2026-10-23 ([offseason UI contract](../design/offseason-ui-contract-2026-10-12.md), *Acceptance before production integration*); Claude finishes the wiring on current main; merge, production verification |

## Ordered remaining implementation

| Order | Item | Owner / remaining scope |
|---|---|---|
| 1 | Offseason and rollover (W16), due mid-November | Claude: S2/S4 (#161) and the Recruiting and NFL Draft cards (#163) are live. ESPN's stars, credited to ESPN, on each recruit (#164), and the same two cards all year in Roster's Prospects view (David, 2026-10-24). 247Sports/On3 stars wait on their permission (requests sent 2026-10-24 to their support addresses); a projected NFL team waits on a usable mock-draft source (none today; David's §7 row 6 rule stands until then). |
| 2 | Postseason notifications (W19): first live runs | Claude: watch the first CFP release (November 3, 7 PM ET), the weekly releases through December 1 and Selection Day (December 6, noon ET), and fix from what the real payloads show. Built in #147 and #152. |
| 3 | Photography (W13) and targeted visual finish (W14) | Claude: deployable Home/Game imagery, focal points/crops, responsive fallback; review Outlook, alert Settings and recent notes/badges. No broad brand reset. |
| 4 | Ohio State remainder (W20) | Claude: conference-only availability freshness expectations; depth chart only after Ourlads permission. Claude: team parity. News, history and Big Ten availability already ship. |
| 5 | Historical Stats (W27 phase 3) | Claude: verify past-season sources/caching and athlete identity. Claude: season selection and career pages. Current Team and Players views already ship. |
| 6 | Bounded reliability (W10) | Claude: repeated same-version worker install; simplify source/refresh ownership only where useful. Preserve existing recovery and negative controls. |
| 7 | Release evidence (W09) | Claude: resolve pending-design-review item 4 against current outage/upgrade evidence. David: physical iPhone/Safari/PWA observations. Do not mark a device pass from desktop CI. |

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
| SP+ week by week (kept by the edge API, never a file) and FPI weeks filled in from ESPN's core API | #156, #157 |
| Recruiting classes and the draft board, refreshed daily | #158 |
| Season Outlook: one season's Kalshi markets at a time, never last season's | #160 |
| Postseason alerts: CFP rankings released; Selection Day, postseason game set, withdrawn (a declined bowl), no postseason | #147, #152 (Worker edge-2026-10-21post); kinds added later start off for existing subscribers |
| Offseason season data for the after-season Home | #153: `TeamOS.season.offseason`, ESPN's own final-poll mark for the AP; [contract](offseason-season-data.md) |
| Top 25 week picker (every kept week of AP, Coaches, CFP and FPI) and the game sheet on every row | #149; the visual check reads sample weeks, #154 |
| SP+ in Rankings | #142 (edge `/v1/cfbd/sp`); 320px selector #145 (Codex) |
| Data requests fall back to the kept copy after 8 seconds | #151 |
| News: football only; On3 by team path only | #146, #150 |
| Launch check: no real network for the test browser | #148 |
| Mobile Top 25 / Home / Game narrow-layout fixes | #126 (merged October 12) |
| Core type, Ink/Pearl, Home/Game, Stats presentation and motion | #100, #104, #105, #106 |
| Unified header; Settings gear; Full Schedule links | #76, #120, #72 |
| Team Stats and Players season leaders | #82/#84, #92; presentation #104 |
| Full-field Season Outlook | #109; targeted presentation review remains |
| Game alerts and October 10 live delivery | #102/#103, #116, #119, #121; 34 completed deliveries, relative latency not measured after the speed fix |
| OSU beat news/odds history and conference availability | #89, #118 |
| FPI producer, model, scheduled refresh and Rankings UI | #35, #53, #90; UI #130 (Codex; replaced #127) |
| Season phase model, source-supplied bowl labels, prospects foundations | #9, #94, #101; production offseason integration remains |
| Battle/open-job framing limited to preseason/Game 1; OR retained | #39 |
| Game notes and complete roster fetching | #114, #122 |
| Unknown live-drive duration (Oct 10 scan #6) | #139 |
| Kickoff time set/changed alerts and one delivery per device when it follows both teams | #140 (Worker edge-2026-10-14a); Settings switch #143 |
| Game Alerts Settings: master switch and unified rows | #137 (Codex) |
| Halftime: no possession football; who gets the ball to start the second half stays | #141 (David, October 14) |
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
- CI once reported the Top 25 table 2px wider than its card at Ohio State
  320px on real Week 8 data (#154). It did not reproduce locally; recheck
  only if it recurs.
- Codex's review credits ran out on October 21: the last commits of #152
  and #153 were not re-reviewed by Codex.
- Internal iw- identifiers and optional old Cloudflare GitHub App cleanup
  are not fan-facing build blockers. More teams/sports and transfer sources
  stay discovery, not unlimited implementation scope.

## Delivery contract

One owner per slice, short branch and PR, preserve TeamOS/Suite boundaries.
Claude owns implementation and design, inside the established design
(decision 0035); Codex is consulted ad hoc by David for design questions, and
nothing waits on it.
Required checks, concrete visual review and David's release approval precede
merge. A source blocker blocks its item only. Update this queue after accepted
merges; built, tested, approved, merged and production-verified are distinct.
