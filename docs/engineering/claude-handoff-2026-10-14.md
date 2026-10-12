# Claude pickup: Wednesday October 14, noon ET

**Final October 12 pickup status (overrides original preparation notes):**
PR #126 mobile fixes, #128 handoff, #130 FPI, #131 offseason v2 visual prototype (screen review pending) and #132 ledger correction are **merged**. Original FPI PR #127 is closed as superseded; issue #30 is closed as withdrawn. Do not rebuild any of them. FPI post-merge public-site/physical-iPhone verification is still open, and the offseason preview is **not** production season wiring. The original preparation table below is historical where it conflicts with this status.

Prepared October 12 against main `b586ecd` and merged PRs through #125.
David authorized Codex to keep building ready UI and the narrow integration
of existing models while Claude was unavailable. This is a pickup contract,
not a new product brief or authorization to deploy. Inspect current main and
open PRs first: scheduled data updates continue independently.

## What Codex has already built

| Slice | Review location | Evidence / remaining work |
|---|---|---|
| Mobile fit | [PR #126](https://github.com/dmvanblaircom/Project-LND/pull/126), `codex/mobile-fit-oct12` | Top 25 name/record wrapping, Home venue wrapping and team-name clearance, halftime receiver spacing. 100 local layout assertions pass; the original code fails 25. Review record: `docs/reviews/mobile-fit-2026-10-12.md`. |
| FPI Rankings | [PR #127](https://github.com/dmvanblaircom/Project-LND/pull/127), `codex/fpi-rankings-oct12` | Existing FPI producer/model wired into Rankings; source metadata, seven-day movement, truthful freshness and retry. 66 browser assertions pass, including real service-worker fallback/reconnect. Review record: `docs/reviews/fpi-integration-2026-10-12.md`. SP+ remains open. |
| Offseason direction | `docs/design/offseason-preview.html`, `docs/design/offseason-ui-contract-2026-10-12.md` | Interactive S2/S4 orientation using shipping fonts/tokens, both teams/styles and a failed next-schedule state. Illustrative data. Needs David's visual review, then production integration with the season/load model. |
| Queue reconciliation | `backlog.md`, `codex-review-queue.md`, `current-architecture.md` | Completed work removed from the active build list. The October 11 queue is archived, not silently discarded. |

These are built/reviewable, not merged or production-verified at preparation.
Read each PR's current checks; do not interpret the local counts as full CI
or a physical iPhone pass. Claude should not rebuild these changes from the
description or replace them with older mockups.

### Integration order and shared files (updated after approvals)

1. **Already merged, don't rebuild:** mobile #126, handoff #128, FPI UI #130, offseason visual preview #131, and ledger #132.
2. **Release follow-up:** verify the deployed FPI route and real iPhone/PWA behavior. Green PR CI does not establish deployed or physical-device success.
3. **Offseason production:** S2/S4 visual review candidate is `docs/design/offseason-preview-v2.html`. Claude provides `TeamOS.season.phase`, season-matched last Game/opponent and distinct next-schedule load outcomes; Codex wires and tests the view and seasonal navigation. All illustrative sample content must be replaced.
4. **Claude pickup:** start the first uncompleted, unblocked source/controller slice below. SP+ is not built or covered by the FPI merge. Do not touch the same `app.js`, `app.css` or Suite module concurrently with Codex.

Keep short reviewable PRs and all original source, correctness and responsive/device acceptance gates.

## 1. Fix unknown live-drive duration

**Problem:** Oct 10 scan #6 shows `0:00` before ESPN fills an ongoing drive's
duration. This is not permission to remove every real zero duration.

Start at `teamos/espn.js` (`driveOf`, `drivesOf`), `suite/game.js`, the real
Oct 10 summary fixtures and `docs/engineering/live-scan-log-2026-10-10.md`.
Inspect raw `description`, `timeElapsed`, play count/yards and current versus
completed drive evidence before choosing the rule. Normalize a missing
duration in TeamOS; the renderer consumes that result. Do not patch provider
strings in Suite with a blanket `0:00` replacement.

Acceptance: the captured unfilled current drive omits its time while keeping
known plays/yards; a populated current drive shows its time; completed drives
retain genuine times including zero when supported; absent/malformed fields
never manufacture a number. Existing play text, drive outcome and scroll
behavior stay intact. Extend `tools/adaptercheck.js` with a negative control
and inspect a narrow Plays capture. If the real payload cannot distinguish
unknown from zero, report that limitation rather than guessing a clock.

## 2. Finish the two approved notification gaps

Read `docs/product/notifications-brief.md` §2b before editing
`worker/src/push.js`, `worker/src/index.js`, `sw.js`, `app.js` and
`suite/more.js`. The shipped service is Web Push/VAPID plus a SQLite Durable
Object, with three live looks per minute. Do not start another backend/D1/FCM
proposal. The October 10 result already records 34 completed deliveries.

### Kickoff time set / changed

- Unknown/TBA to a confirmed time sends once; a subsequent actual time move
  sends once for its new ISO time. A repeated snapshot sends nothing.
- Suppress for underway/final games and apply the brief's three-hour boundary
  relative to the old kickoff. A first observation of an already timed game
  must not impersonate a newly announced time.
- Carry ISO time to the app's worker for device-local formatting. The edge
  worker must not hard-code Eastern time or a formatted clock string.
- Add the visible preference and quick-pick membership exactly as approved:
  Everything includes it; Key moments and Final only do not. Existing
  subscribers do not acquire a newly enabled alert through migration.

### One device follows both participants

- Dedupe per device/event across both followed teams, including retries and
  overlapping polls. Preserve separate devices and distinct game events.
- Exercise differing preferences on the two teams, score corrections and
  changing an option mid-game. One eligible event produces at most one push.
- Preserve the approved touchdown/try behavior and game notification tags.

Use `node tools/workercheck.mjs` and `node tools/alertscheck.js`, with recorded
feeds for behavior and browser checks for the controls. Publish evidence
without live test messages to fans. The four rare #119 cases David deferred
are not new mandatory scope. Real-device latency measurement remains separate.
Before wider public launch, apply his existing decision to quiet the repeated
confirmation push; it is not a reason to redesign delivery now.

## 3. Wire the approved offseason experience (W16)

Target mid-November, with January provider verification still a follow-up.
Read `docs/product/offseason-home-proposal.md` §7, `offseason-sources.md` and
the new UI contract. Built foundations: `teamos/season.js`,
`teamos/prospects.js`, `tools/producers/prospects.py`, postseason schedule
fetching, source fixtures and their checks. Do not rebuild the phase model.

Claude's remaining scope:

1. Connect current/next-season schedules to `TeamOS.season.phase` and expose
   the next-schedule load outcome separately from a null opener. Loading,
   successful empty, failed and retained-copy states must be distinguishable.
2. Supply season-matched record, ranking, last Game, league calendar and
   freshness. A team finishing does not mean the league postseason is over.
   A playoff win awaiting its next matchup remains postseason.
3. Put the approved ESPN recruiting/draft producers on an appropriate refresh
   path and load their normalized models. Confirm team commitments by the
   matching committed-school entry, not any school in the interest list.
   Draft board rank is never a projected pick; grades/picks only when supplied.
4. Bind markets to the correct season. Do not carry a prior-season price into
   next season or promise an unopened market.
5. Coordinate the S2/S4 UI and seasonal nav with Codex. S1 remains unchanged;
   S3 and S5 reuse the current Game/upcoming-game hero as the approved brief
   specifies. Saved Game and Rankings links remain usable.

Acceptance covers ND/OSU, title-game timing versus team phase, playoff
advance/loss/champion, no postseason with authoritative evidence, missing
rank/score/kickoff, failed and empty next schedules, recovery/offline copies,
January rollover and a missing market. `tools/postseasoncheck.js`,
`tools/prospectscheck.js`, `tools/homegamecheck.js` and the source checks are
the starting gates. Add browser coverage for actual production wiring; the
design preview does not satisfy those gates.

## 4. SP+ through the permitted source (remaining W07)

Read `rankings-sources.md` and issue #29. Bill's October 1 permission (found
October 9) covers the SP+ top 25 with ranks/ratings, credited to SP+ and CFBD.
Use the existing keyed edge API; do not restart ESPN article scraping or
publish a raw CFBD snapshot into the public repository.

- Add a bounded, season-aware endpoint in `worker/src/index.js`, following
  the existing CFBD request/cache/error conventions and permitted fields.
- Add a pure SP+ adapter in `teamos/ratings.js`. Verify the provider's team
  identity mapping explicitly; CFBD school names are not ESPN ids. Prove ND,
  OSU and unfamiliar teams do not acquire false identities.
- Keep edition time separate from retrieval time. Preserve zero/negative
  ratings, omit unavailable movement, and do not invent a seven-day delta.
- Use #127's rating-source interface and `#top25/rankings/sp-plus`. Each
  source owns its load/cache/retry state; SP+ failure must not erase FPI or
  change the AP/CFP default. A source without change history needs the Change
  column omitted, not a claim that all teams were unchanged.
- Codex completes the fifth-source presentation when the model is ready.
  #127 already checks five accessible selector choices at 320px.

Start with `tools/workercheck.mjs`, `tools/ratingscheck.js` and #127's
`tools/ratingsflowcheck.js`. Verify source attribution, old-season data,
failed first load, cached HTTP 200, reconnect, duplicate-request prevention
and one relevant freshness warning. Close #29 only after both sources ship.

## 5. Then work down the reconciled queue

| Slice | Concrete next step |
|---|---|
| Postseason alerts | Use the league calendar and approved event/default table. New kinds remain off for existing subscribers. Move calendar-sensitive work ahead if needed before the first relevant November event. |
| OSU availability | Check conference-only freshness against the actual Big Ten publication cadence; distinguish no report from an empty report. Ourlads depth waits on permission, independently of this fix. |
| Historical Stats | Verify source/caching/athlete identity for past seasons, then hand season selection and career presentation to Codex. Current Team and Players screens already exist. |
| Same-version worker install | Reproduce the reported duplicate install with a bounded upgrade check and negative control; preserve installed-app recovery. Avoid an unrelated controller rewrite. |
| Release evidence | Reconcile pending-design-review item 4 with current outage/upgrade evidence. Desktop CI is not David's physical iPhone/Safari/PWA observation. |

Codex continues deployable photography/crops and targeted presentation review
of Outlook, alert controls and recent notes/badges. Those are follow-ups to
working screens, not authorization to replace the approved brand.

## Decisions to preserve

- Instrument Sans/Display with Georgia; Ink/Pearl; Champagne/Bronze as small
  accents. Ohio State Team Style retains Nunito Sans. No new type reset.
- Unified SUITE/team header and Settings gear (0031/0034).
- Halftime receiver football and explanation stay (#23); #126 fixes spacing.
- Official depth-chart OR stays. Battle/open-job framing already ends after
  Game 1 (#39). W06's expanded disclosure was withdrawn October 1; issue #30
  should be closed as withdrawn, not implemented. That issue action has not
  been performed by this handoff.
- Existing licensing/source decisions stand. Do not send permission emails,
  push messages or other outreach from these implementation instructions.

## Completion and pickup prompt

For every slice: inspect latest main/open work, keep one owner, implement the
smallest complete change, run relevant and required CI checks, publish a
reviewable PR with captures where visual, obtain David's release approval,
merge, verify production, then update `backlog.md`. Shell changes need a new
`sw.js` VERSION and `node tools/versioncheck.js origin/main` after commit.
Report built, tested, approved, merged and verified as separate states.

David can give Claude this pickup instruction:

> Read CLAUDE.md, docs/09_AI_OPERATING_SYSTEM.md and
> docs/engineering/claude-handoff-2026-10-14.md. Inspect current main and merged PRs
> #130/#131 before editing shared files. Continue the first uncompleted,
> unblocked Claude-owned slice in that handoff; preserve Codex's UI and the
> approved decisions. Keep each slice reviewable, finish its checks and hand
> off normalized inputs for Codex. Do not merge or deploy without my release
> approval. Update the active backlog after accepted work so nothing shipped
> is scheduled again.
