# Backlog reconciliation: September 28, 2026

## Scope and evidence

Requested by David: review everything, remove completed work from the active backlog, and prioritize the remaining work for Claude starting Wednesday September 30.

Repository baseline: main at **a8680394fadde6aa49d615182e6956223861cd46**. The local source inspection used main snapshot **42a99453a06af8ff5a78699ea0a9a1ad8697fa4a**; GitHub compare confirmed only snapshots and documentation changed through the baseline, with no application-code delta. This is a code/status reconciliation, not a fresh full runtime certification.

Read: active and archived backlog, release completion, pending design review, architecture build plan, MVP/product documents, offseason proposal, font/header decision inputs, branch cleanup and refresh-clock docs; inspected current Suite/TeamOS/controller/config/workflow code and the September 28 visual audit. Queried all repository PRs plus merged and open filters, open issues and branch inventory. Open alert comments for #5/#15 were empty. PR metadata separately confirmed #25 and #28 open and unmerged.

No application code, workflow configuration, branches, account settings or production deployment changed during this reconciliation. Old completed rows were removed from the active queue, not erased from history.

## Completed: removed from the active build list

| Original item / work | Evidence | Disposition |
|---|---|---|
| Canonical Suite release and final PWA icons/wordmark/share assets | Merged PR #4; current canonical Suite modules, manifest/identity assets; completion record | Done. No second redesign merge or replacement icon set required. Physical-device verification remains separate. |
| Saturday real-live Game/Top 25 verification | Merged PR #14 and captured-payload evidence in completion record | Done for Sep 26. New visual changes still require their own live-state checks. |
| C2 team-namespaced pipeline | Merged PR #10; data/league and data/notre-dame; config-driven producer loop; tools/pipelinecheck.py | Done, not staged. OSU new producers/history remain W20. |
| C17 regular + postseason fetch | Merged PR #9; TeamOS.espn.joinSeason and typed schedule URLs used by app.js; tools/postseasoncheck.js | Done. Offseason UI/rollover remain W16. |
| C3 unknown team no longer silently defaults to ND | Merged PR #8; current boot path | Done. |
| C5 registry refusal warns instead of failing the run | Merged PR #8; roster.yml warning path | Done. Authoritative membership refresh can still be unavailable; do not confuse that provider limit with an unfixed red-job behavior. |
| C9 reusable stress harness | Merged PR #8; tools/stresscheck.js and stress workflow | Done. Do not recreate it from scratchpad. |
| C11 retired ND icon files / stale 7C comment cleanup | Merged PR #8 and current tree | Done. |
| Rollback runbook, font/header input document and cleanup proposal | Merged PR #6; documents present | Documents done. Header/font integration and actual branch cleanup remain. |
| Offseason proposal and initial research fixtures | Merged PR #7; docs/product/offseason-home-proposal.md | Proposal done, not approved UI or implemented offseason. Review existing proposal rather than ask Claude to produce it again. |
| Depth movement arrows and Out indicators | Merged PRs #11/#12; current roster modules | Done. Keep ORs/arrows. Compact current-chart changes disclosure is a new W06 request. |
| Opponent records, possession football and Drive Tracker offense colors | Merged PRs #11/#13/#14/#20 | Done. |
| Saturday scan items 1–12 | Merged PRs #16/#18/#19/#22/#26, mapped in PR #25 | Fixes shipped. PR #25 only holds the record/tool and remains open. |
| Share Suite | Merged PR #17; More action | Done. Do not add it again as a missing MVP item. |
| Between-play possession, timeout/quarter/safety memory, halftime receive indication | Merged PRs #21/#22/#23 | Done as implemented and approved. No new accuracy certification implied by status reconciliation. |
| Logo-settle timing in visual audit harness | Merged PR #24 | Done; distinct from still-open production hero flicker PR #28. |
| 2–7 scoreboard Game nav icon | Merged PR #27 | Done. Keep the selected icon. |
| More corrections, Roster cache/fallback recovery and stored-time fix | Pending-design-review record: More 1.1–1.6 accepted; Roster scenario review accepted; current controller/test code | Done. Release-hardening item 4 is a distinct pending review. |
| Font selection B8 | September 25 Decisions table in old backlog | Decision done: Instrument Sans + Instrument Serif. Implementation remains W12. Do not buy Neue Haas/Canela. |
| B2 odds policy, B3 primary-nav choice, B11 first new MVP pillar, B12 second-team order | Recorded David decisions | Settled: informational odds; nav unchanged; notifications first; complete OSU before more teams. Relevant builds remain queued. |
| B13 Refresh Data scope / Feedback origin | Adopted clarifications and completed More corrections | Settled and implemented. No open decision unless David changes it. |
| Flat Suite icon default B10 | Shipping final identity and recorded default | No task to choose again. Halo remains optional. |
| Cloudflare Workers deletion | Completion record: David confirmed deletion Sep 25 | Done. Optional GitHub App uninstall is separate and externally unverified. |
| Branch model and check-in preference | Recorded decisions: main + short branches; four-hour silent check-ins | Decisions done. Branch removal and actual external automation state are separate. |

PR links use https://github.com/dmvanblaircom/Project-LND/pull/<number>.

## Confirmed remaining versus unverified external state

- **Built but unmerged:** PR #28 hero watermark flicker fix, PR #25 live-scan record/tool. Reuse them.
- **Open reliability investigations:** #5 refresh cadence and #15 availability publication/ingestion. Open status alone does not prove a still-active defect; close only after evidence.
- **Code-confirmed absent:** missing-final-score handling in Home/Game; #29 ratings; #30 compact disclosure; #31 battle policy; four-row Home preview/normal Game schedule link; Instrument/font/token/header pass; configured hero photography; defensive rushing/passing season aggregation; offseason Home/rollover; full-field board; richer OSU snapshots; notifications.
- **Code-confirmed engineering debt:** public Kalshi relay fallback URLs; controller owns multiple source stores/clocks; duplicated browser-check setups; stale current-state documentation.
- **Branch cleanup not executed:** inventory still includes the approved old lnd/phase-* branches, project-lnd-platform/foundation and obsolete design branches. Protect unique captures and open PR work during cleanup.
- **External state not established:** refresh-job credentials/history, whether a newer official report actually published, physical iPhone pass, font-email sending/replies, Cloudflare GitHub App installation, actual check-in automation.
- **Future product scope:** personalization/My Box, participation and measurement need concrete decisions. Listing their discovery does not approve a large backend or analytics product.

## Corrections to earlier summaries

1. The old current-chart changes list was already removed by PR #12. #30 now explicitly describes adding the compact disclosure, not shrinking a surviving section.
2. Ohio State already has ESPN-fed screens and Kalshi team-market matching. It lacks declared per-team snapshots, including odds history; “OSU has no odds” was too broad.
3. Commercial font purchase advice in the release completion/visual audit was superseded by the September 25 Instrument decision.
4. The Home preview decision is last result + next three (up to four), not the old three-row policy.
5. The original broad play-text task is partially complete: player-name, clock and PAT fixes shipped. W17 addresses only remaining cases.
6. More's review is closed; release-hardening review item 4 remains. Do not say the entire pending-review ledger is empty.
7. Shipping postseason fetching does not finish offseason Home; writing the offseason proposal does not mean its design is approved.
8. Branches surviving after merge do not mean their features are unshipped; actual merged PR/code evidence takes precedence.
9. PR #28 was not merged at this review. The related merged #24 fixes test-harness timing, not the app's flicker.

## Sources and retained evidence

- [Active queue](backlog.md)
- [Archived original backlog and decisions](backlog-archive-2026-09-28.md)
- [Release record](suite-redesign-completion.md)
- [Pending design review](pending-design-review.md)
- [Visual audit with supersession addendum](../design/suite-visual-audit-2026-09-28.md)
- [Architecture roadmap](../08_BUILD_PLAN.md)
- [Offseason proposal](../product/offseason-home-proposal.md)
- [MVP validation](../product/mvp-validation-framework.md)
- [Font/header inputs](../design/fonts-and-team-first-header.md)
- [Refresh clock](data-refresh-clock.md)
- [Branch cleanup](branch-cleanup.md)

Future completion entries should cite the accepted PR, checks and verification. Never reopen a completed item merely because an old proposal still describes it as missing.

## Completed September 30, 2026

| Item | Evidence | Disposition |
|---|---|---|
| W01 hero-logo flicker | PR #28 merged; production verified `suite-2026-09-29a` | Done. The same PR fixed `rostercheck`, which asserted last week's live data, onto a frozen Purdue-week fixture. |
| W04 final with missing scores | PR #34 merged; `TeamOS.game.scored`; production verified `suite-2026-09-30a` | Done. Home and Game read Final with no invented 0-0; a real 0-0 and live zeros unchanged. |
| W02 clock visibility (partial) | PR #33 merged | Run titles and a diagnosing alert shipped. The clock itself stays open in the queue, blocked on David's cron-job.org account. |
| W07 FPI data slice (partial) | PR #35 merged | Producer, checks and source record. Scheduling, TeamOS model and UI remain. |
| W08 schedule rules (partial) | PR #36 merged; production verified `suite-2026-09-30b` | Rules done. The two link changes remain with Codex. |

