# Project LND: active delivery queue

Reconciled September 28, 2026 (America/New_York). **Start Wednesday, September 30, and continue through the queue.** This is an ordered work program, not a promise that everything finishes Wednesday.

David requested a complete reconciliation and prioritization, removing completed work from the active list. He then requested an explicit Claude/Codex split for implementation and visual parity. **Claude owns data/behavior/reliability; Codex owns design-file parity and production UI implementation.** David remains the product approver. This file replaces the previous weekend/staged roadmap. Completed work is recorded in [the reconciliation record](backlog-reconciliation-2026-09-28.md); the original document is retained in [the archive](backlog-archive-2026-09-28.md). Do not rebuild archived items.

## Claude's next, in David's order (October 2)

1. This reconciliation.
2. **W27 Phase 2:** player season stats.
3. **W20:** Ohio State's sources.
4. **W07:** FPI into the refresh.
5. **W16:** the offseason season model. It is due mid-November, so it starts right after.

Then **W19** (read the edge probe after the October 3 game, then build), **W10/W26** and **W09**. Product calls come first for W22-W24.

## Execution contract for Claude and Codex

**Codex: start with [the review queue](codex-review-queue.md)** - what Claude has built that is waiting on Codex's review or UI (swipe motion, launch screen, W07/W18/W21 presentation).

**David's October 1 correction:** the depth-chart changes section was deliberately reduced because the movement arrows communicate the changes. Preserve that compact presentation, arrows, official OR listings, and Week by week. W06's proposed disclosure is withdrawn; do not restore or enlarge the changes section. This supersedes the earlier W06 / issue #30 presentation direction.

1. Start from current main; inspect the tree, open PRs and any changes since the audit baseline before editing. Use short branches and PRs. Do not recreate work already present.
2. Work in the order below. Finish, validate and report each bounded slice. Keep going to the next unblocked item rather than waiting for a new task prompt after every slice.
3. A source/account/permission blocker blocks that item, not the whole queue. Record the evidence, exact dependency and owner, then continue with the next unblocked item. Do not mark a blocked item done.
4. Product/Design gates are concrete deliverables: prepare the source research, prototype, mockups or options first. Codex prepares and implements the visual/UX work against approved references; David decides unresolved product choices and approves new visual direction. Claude checks that UI integration preserves data/behavior. Continue independent engineering while those decisions are pending. Queuing work does not approve unseen UI or invent a push service, participation feature, or data source.
5. Preserve the TeamOS/Suite boundary, truthful data/freshness, team isolation, offline behavior, accessibility and the existing app. No framework rewrite. No automatic deployment or merge is authorized by this planning document; use the established PR/release approval process.
6. Reuse existing tests; add focused regression coverage for behavior changes. Verify negative controls where they prove the regression. For UI, supply before/after captures using the same route, team, state and data. CI success is necessary, not visual acceptance.
7. Update this queue and related issues after each accepted merge: commit/PR, checks, production verification and remaining gates. Move completed rows to the completion record instead of leaving them active.
8. Start FPI/SP+ feasibility, image/source research and offseason review early if they would otherwise stall later work. They do not require speculative production changes.
9. Follow the ownership split below and [the delivery handoff](wednesday-delivery-handoff.md). Codex edits production UI code directly; Claude does not independently reinterpret the visual direction. One owner per change/PR; hand off shared files between slices. Do not both edit app.css, suite/*.js or app.js in competing branches without explicit scope coordination.

## Wave 1: reliability and the committed Wednesday requests

| Order / ID | Implementation owner | Remaining work | Current evidence and scope | Completion requirement |
|---|---|---|---|---|
| 6 / W06 | No remaining presentation work | Preserve compact depth-chart changes | **Withdrawn by David Oct 1:** the arrows already communicate movement. PR #48's comparison model remains available; no disclosure UI is requested. | Preserve the current compact presentation, movement arrows, official OR listings, and Week by week. Do not restore or enlarge the changes section. |
| 7 / W07 | Claude data; Codex UI | FPI and SP+ in Top 25 → Rankings, issue #29 | **Oct 1: TeamOS model merged (PR #53, `teamos/ratings.js`, tested on the real capture for ND and OSU); not loaded until the producer is scheduled after cadence is observed.** **Sep 30:** feasibility done (docs/engineering/rankings-sources.md). FPI supported: ESPN powerindex JSON from the runner; producer + checks merged (PR #35), **not yet in the refresh** until ESPN's update time is observed for several days. SP+ blocked: espn.com returns an empty 202 to the runner (not bypassed); CFBD's SP+: CFBD allows display through our own server (Oct 1); whether SP+ itself carries separate terms is David's open question to Bill (email drafted, not yet sent). Next: TeamOS model, then Codex UI. | Implement the detailed issue contract: authoritative access, TeamOS normalization/snapshots, season/edition validation, attribution, truthful freshness/retry, five-source accessible control and ND/OSU tests. Source restriction blocks only the affected source; report it without bypassing access controls. |
| 9 / W09 | Claude evidence; Codex review; David device | Finish delivery records and release review | PR #25 (scan log + tool) merged Oct 1. All 12 fixes it documents have shipped. Pending-design-review item 4 remains unreviewed. | Review/land #25 through the normal gate; do not redo the 12 fixes. Package current code and outage/upgrade evidence for ChatGPT's item-4 review. Record physical iPhone/Safari/PWA checks with David; no claimed device pass without observation. |

**Wednesday's first session:** Claude starts W01–W05 and W07 source feasibility, then W08's selection rules and the remaining engineering queue. Codex starts W12's reference/token/header work and W13 asset preparation, then Home/Game parity and W07/W08 presentation when their models are ready. W06 presentation was withdrawn by David October 1. The waves express product priority and dependencies, not a requirement for Codex to wait through every engineering task.

## Wave 2: strengthen the application before adding more data flows

| Order / ID | Implementation owner | Remaining work | Scope and dependencies | Completion requirement |
|---|---|---|---|---|
| 10 / W10 | Claude | Simplify app state and refresh coordination (C1) | **Oct 2 bug hunt, small leftovers for this item:**<ul><li>Refresh Data's scoreboard does not reconcile the schedule outside a live game.</li><li>A kickoff that has passed while the schedule still says "pre" refetches every minute during a long delay.</li><li>The ESPN adapters throw, inside a promise, on null array elements. The fan sees "didn't load", never a crash.</li><li>An update installs the same version twice (suggested task).</li></ul> **Oct 1: first slice - the schedule refresh joins a request already out (it was fetched twice when the app woke mid-game), PR #58, with `tools/pollcheck.js` and a negative control.** Current app.js is 1,572 lines and still owns multiple stores/timers. Split bounded responsibilities incrementally, preserving working roster/news retry fixes and new W07 sources. | Clear ownership of source state, in-flight requests and clocks; no duplicated polling or cross-team leakage; existing outage, roster, news, live and upgrade checks remain meaningful. No cosmetic rewrite just to reduce line count. |

## Wave 3: deliver the premium visual direction

**Codex owns design and UI implementation; David approves new visual choices.** Start with actual Home/Game prototypes, then propagate approved components. Claude supplies stable normalized models and reviews integration risks; it does not do a competing CSS redesign. The [September 28 visual audit](../design/suite-visual-audit-2026-09-28.md) contains the detailed findings; its reconciliation addendum overrides stale font and schedule assumptions.

| Order / ID | Implementation owner | Remaining work | Scope and dependencies | Completion requirement |
|---|---|---|---|---|
| 12 / W12 | Codex | Lock and implement Suite brand + team-first header | B1/B8/B9/A4/C6 and audit V02/V03/V04. Font **decision is complete**: self-hosted Instrument Sans + Instrument Serif, not buying Neue Haas/Canela. Current code still loads Barlow/Georgia. Team-first principle is decided; exact header composition and action-token roles still need a reviewed prototype. | Explicit Ink/Pearl/Champagne/Bronze/Slate/Charcoal role map; no cobalt Suite actions; accents used sparingly. Instrument replaces Suite typography and unlicensed team fallbacks; licensed team fonts can override later. Team colors and default Team Style remain. Chooser uses approved Ink; avoid duplicate team identity in header/hero. First paint and live style switch agree, no synthetic serif bold, contrast/fallback checks pass. Record new header decision superseding 0024 where needed. Keep shipping flat icon/wordmark geometry. |
| 13 / W13 | Codex; David asset approval | Approved photographic art for Home/Game (the masthead is gone, decision 0031) | V01. Neither current team declares hero imagery. This is new asset work; watermark fallback was an approved release state. | Approve deployable imagery, focal points and mobile/desktop crops; provide quiet areas for text. ND helmet stays plain gold without an ND overlay. Team-driven art, finished missing-image fallback, no broken images/layout jumps, no copying locked reference images into the public repo as production assets. |
| 14 / W14 | Codex | Apply visual refinement across all screens | V04–V11, after core type/surface/header rules are approved. Includes final-winner emphasis, Home news proportions, rankings stack, roster row hierarchy/status clarity, schedule alignment, stat comparisons, More/utility density and nav optical polish. | Home/Game establish the reference implementation first. Then Roster/Top 25/Schedule/News/More. Winner follows actual valid final scores, including active-team losses; live/tie/incomplete states stay truthful. Avoid repeated elevated cards, align desktop masthead/body, retain hit areas and all data. Review 320/375/390/768/1280, both styles/teams, live/paused/final and failed/offline states. Do not redesign the chooser or add fake player links. |

Brand constants: Ink #111D35; Pearl #F1F2F0; Champagne #D4B896; Bronze #B8845A; Slate #485563; Charcoal #1A1A1A. Champagne/bronze are accents “like jewelry,” not a new main-action system. TeamOS remains outside the fan UI. Its separate brand is not a new consumer-app implementation task.

## Wave 4: complete game information and year-round behavior

Start the existing offseason proposal review while Waves 1–3 run. **Ship the offseason experience by mid-November**, moving W16 ahead of cosmetic work if needed. The proposal already exists; do not commission it again.

| Order / ID | Implementation owner | Remaining work | Scope and dependencies | Completion requirement |
|---|---|---|---|---|
| 16 / W16 | Claude season model; Codex experience | Offseason Home and season rollover | B4, existing proposal in docs/product/offseason-home-proposal.md. **Postseason fetching is already shipped (PR #9)**. **Season model and trustworthy bowl labels built (2026-10-02):** `TeamOS.season.phase` (S1-S5) and `Game.stage`, tested against real 2024/2025 seasons; not yet wired into any screen. **Decided by David (Oct 2), proposal §7:** S2 season-story card, S4 scoreboard card, News up in the offseason, next season's markets when listed, a seasonal nav (Game and Top 25 leave the bar from S4). Remaining: next-season fetching, wiring the state, Codex's S2/S4 and nav designs, David's render review. **Sources researched (Oct 2, docs/engineering/offseason-sources.md):** ESPN's draft and recruiting APIs answer from the runner (draft: position and overall rank, grade later in the cycle, the pick after the draft; recruiting: grade, ranks, and the committed school as the one `schools[]` entry whose status matches the recruit's). NFL.com, 247Sports and On3/Rivals allow personal, non-commercial use only. Permission emails to 247Sports and On3 are drafted in David's Gmail, not sent. **David decided (Oct 3): draft and recruiting from ESPN**, under the same keep-as-is rule as the rest of the app's ESPN data. Next: fixtures and TeamOS adapters (Claude), screens with the S2/S4 designs (Codex). | ChatGPT critiques/designs from the existing proposal; David approves concrete states. Build truthful season-in-review/unknown-next-season/next-opener views. No inference that unknown postseason is confirmed or an empty feed means not published. Fixtures cover rollover, no bowl, postseason and next-season data. January live checks remain a dated verification dependency, not a reason to postpone the whole build. |
| 17 / W17 | Claude normalization; Codex presentation | Broader safe play-text presentation | **Oct 1: plays a fan can read shipped (PR #78): no jersey numbers, spot codes, tacklers, holder or snapper; tags and notes from the play's own words. David approved dropping tacklers and keeping pass direction. The display is Codex's.** **Oct 1: inventory merged (PR #52, `docs/engineering/play-text-inventory.md`): 793 real plays, ESPN team codes in 659. Groups A/B are Claude's next; group C needs Codex/ChatGPT and David.** B6 and V09. **Name/clock/PAT fixes in PRs #18/#26 already shipped**; do not repeat them. | Inventory remaining awkward real examples. Use structured fields for any new transformation; preserve raw text when meaning cannot be safely retained. Group scoring events/drives and time/down-distance consistently. Test real edge cases without a broad free-text rewrite that changes a play. |
| 18 / W18 | Claude market model; Codex board | Season Outlook “View full field” | **Oct 1: market model merged (PR #55, `teamos/markets.js`, production `suite-2026-10-01d`); Kalshi parsing left app.js (Phase 4D Market). Remaining: Codex's board.** Approved post-launch C7; removed legacy board is not the target. League market snapshots already available. | Approved light-theme board, source attribution, season/market identity, stale/missing states and correct Home navigation. Preserve information-only scope; no bet placement. Review labels and probabilities before release. |

## Wave 5: retention and a complete second team

| Order / ID | Implementation owner | Remaining work | Scope and dependencies | Completion requirement |
|---|---|---|---|---|
| 19 / W19 | Claude delivery; Codex controls | Notifications MVP | **Oct 3: kickoff and final built for a live test on the Ohio State game (David).** Phase 0 answered yes: every Saturday run reached ESPN from the Worker, 112 ms. The Worker (PR #102) has Web Push with VAPID and aes128gcm, a SQLite Durable Object instead of D1 (no new token permission), and a minute cron. The app (this PR) has push handlers in the service worker and a provisional Game Alerts section in Settings until Codex's row. Next: Phase 3 on David's iPhone today; then score changes (opt-in) and Codex's design. **Oct 1:** brief approved as proposed (kickoff/final on, scores opt-in, no Live Activities yet). B11: notifications are the first new MVP pillar. | Produce a bounded notification brief (events, opt-in, preferences, quiet behavior, deduplication, corrections and delivery limits) and service proposal first; then build approved scope. Verify real device delivery and permission-denied/unsubscribe behavior. Do not imply unsupported delivery in UI or add bells before capability exists. |
| 20 / W20 | Claude sources; Codex team parity | Finish Ohio State | B12. ESPN-fed experience and **current Kalshi market configuration already exist**. Missing are official depth/availability sources, beat-news snapshots and odds-history snapshots; snapshots is currently empty. | Source feasibility first; add declared producers/snapshots without ND branches or copied application code. Preserve honest unavailable states where OSU publishes no source. Verify no ND data leaks. Add history going forward, not invented backfill. Complete supported OSU capabilities before more teams. |
| 22 / W22 | Codex UX; Claude persistence | Basic personalization / My Teams discovery, then approved MVP | B11 and architecture Phase 8. A selected team, style preference and team switch already work; richer following/preferences do not. My Box is still a hypothesis. | Validate smallest useful scope and present prototype/data model before implementation. Preserve active-team focus; do not silently build mixed feeds, accounts or a large My Box feature. Once approved, build the bounded slice and verify persistence/team isolation. |
| 23 / W23 | Codex UX; Claude service | Lightweight participation discovery, then approved MVP | Product blueprint/MVP: reactions, predictions, polls or threads are alternatives, not four approved features. | Select one demonstrated fan need, define data/storage/abuse and moderation implications, and show prototype. Build only the approved bounded choice. No social network, messaging or speculative engagement platform. |
| 24 / W24 | David/Codex plan; Claude instrumentation | Fan validation plan and measurement decision | MVP validation framework describes outcomes, but does not supply a concrete measurement implementation. This is a planning deliverable, not a newly approved analytics vendor. | Define how to assess repeat use, game-to-game retention, sharing and notification usefulness. Document manual testing versus telemetry options, cost/data implications and decision. Implement instrumentation only after its scope is approved. |
| 27 / W27 | Claude source/model; Codex layout | Season stats (team, then players), then historical | **Oct 2: Phase 1, the Team view, shipped (PR #82, production-verified). Three fixes followed in PR #84: the team labels over their columns (David's screenshot), the opponent on direct entry, and a reload when the connection returns. Phase 2 (players) is next. Codex's #83 fixes the same label alignment as #84 and is superseded; David decides whether to close it.** **Oct 1: Phase 0 captured (real payloads on `feat/season-stats`) and Phase 1, the Team view, built (More → Stats). David asked for full team and individual season stats; proposal `docs/product/season-stats-proposal.md` **approved the same day**: under More, linked from Roster and from Game's Matchup card; Team view first; opponent column in game week. Historical team and player stats are queued behind it, at David's request.** Player-stats source not yet verified (Phase 0 capture). | Phase 0 confirms the player source; each phase merged and verified for both teams. |

## Wave 6: finish maintainability and repository cleanup

| Order / ID | Implementation owner | Remaining work | Scope and dependencies | Completion requirement |
|---|---|---|---|---|
| 25 / W25 | Claude; each owner updates own docs | Current architecture docs and branch cleanup | **Oct 1: `docs/engineering/current-architecture.md` (as built); historical docs marked; build plan data paths and 4D updated (this PR). C12 closed Oct 1: David approved the list, turned on automatic deletion of merged PR branches, and kept the old branches as they are (`branch-cleanup.md`); no destructive cleanup is planned.** C10/C12. Backlog and completion pointers reconciled here; CLAUDE.md/current architecture/team-config/build-plan and old CFBD/superseded design docs still contain stale guidance. The approved old branches still exist. | Correct current-state docs without rewriting historical decisions. Recheck branch containment against current main; archive approved historical tips before deleting. Preserve open #25/#28 branches and unique live captures until landed/retained. Keep main + short work branches. Do not delete merely because a name looks old. |
| 26 / W26 | Claude | Consolidate duplicate browser-test infrastructure (C15) | **Oct 1: one static server for the browser checks (PR #57, `tools/lib/serve.js`); two drifted copies served SVGs as HTML.** Existing checks have separate server/router setup. Lower priority than fan-visible work. | Extract shared harness mechanics only where duplication is real; preserve fixtures, failure injection, isolated workers and negative controls. No drop in behavioral coverage; do not expand testing merely to mirror refactoring. |

W25's small documentation fixes can accompany each earlier PR. C12 is closed: no branches are archived or deleted by hand. No need to delay a valuable fix for a broad cleanup project.

## Also shipped October 1

- **Hero logo flicker (David's report):** sections redraw without reloading logos already shown (`Suite.ui.fill`), Home/Game/Top 25/Schedule; `tools/flickercheck.js`. PR #56, production `suite-2026-10-01f`.
- **Edge API deploy check** waits for the exact deployed version (PR #50); the Worker's refresh clock is deployed and reports `"clock": false` until David's token is set.
- `verify-production.yml` must be run by hand after a deploy: its after-Pages trigger has not fired.
- **Code review fixes A-G** (PRs #66-#70, #73), each production-verified:
  - data correctness: the final summary, the pregame line, a preview retry and the game's views (`tools/controllercheck.js`);
  - availability keeps last week's report when a fetch fails;
  - offline and service-worker resilience: a failed refetch keeps the team, the install needs only the essential shell, and kept data expires after 30 days;
  - TeamOS: neutral venues, weather times across DST, and geocoding behind an adapter;
  - security and accessibility: RSS `javascript:` links are refused and focus returns after More;
  - dead code removed;
  - Share Suite's timer and the Kalshi step's count.
- **Pull to refresh** (David): one refresh with Settings' Refresh Data, with no explanation on screen. `tools/pullcheck.js`, PR #71.
- **Ohio State's Team Style in Nunito Sans** (C19, David): self-hosted and loaded only for that team. `tools/teamfontcheck.js`, PR #74.
- **Scoring drives** (David and a fan): each scoring play opens its drive, which ends on the highlighted score. Every drive stays listed. PR #75.
- **One header on every screen** (decision 0031, David): the SUITE bar with the team as context. The masthead is removed, and the name fits at 320px for both teams. PR #76.

## Shipped October 1-2 (recorded October 2)

- **W02, the refresh clock:** the edge API's cron starts "Refresh team data (clock)" every 30 minutes. Health reports `"clock": true` (David's token is set).
- **W08, Full Schedule links:** on Home and Game. Codex, PR #72.
- **W21, rivalry names and trophies:** each entry is a trophy, rivalry or event. Ohio State has The Game.
- **Launch:** one launch screen across an update's reload, with no nav flash. PR #80.
- **Game hero:** the weather and line moved under the game. PR #81.
- **Stats:** the Team view (PR #82) and its fixes (PR #84). See W27.
- **Five-pass bug hunt (David, Oct 2):** every check, plus a stress run of 688 screen inspections, the controller read, an adapter fuzz, a screen sweep and offline/pipeline/security. It found:
  - **Schedule rows:** a name never breaks mid-word on a phone. visualcheck now fails any name that does. PR #85.
  - **The edge API:** CFBD is answered only for registry schools, this season or last, so no script can spend the key's monthly allowance. FCS opponents show a dash. PR #86, deployed `edge-2026-10-02a`.
- **Share Suite** shares the app, not the fan's team: "Join me on Suite" and the plain link (David). PR #87.
- **The CFP calendar (David, Oct 2):** Top 25 names the next CFP rankings show (day, the fan's time, ESPN) and Selection Day; the schedule's foot says when the team's bowl or playoff game is announced. Dates checked at the source and kept as league data (`leagues/college-football.js`, decision 0033).

## External, conditional and intentionally deferred work

These remain visible but do not halt the runnable queue or get falsely marked completed.

| Item | Next action / owner | Why it is not a normal build task |
|---|---|---|
| Late launch from a shared link in Safari (David, Oct 2) | David re-opens the link in Safari once. If data shows before the launch again, Claude investigates. | Most likely Safari's own copy of the app predated the launch fix (PR #80), so the old page showed and then reloaded into the new one. That copy is current now. |
| Physical iPhone/Safari/installed-PWA checks (A3, V12) | David + ChatGPT/Claude guided checklist after relevant releases: upgrade once, icon, safe areas, text scaling, keyboard/scrolling. | Cannot establish a real-device pass from desktop CI. |
| Official ND/OSU font permissions (C19) | Permission requested 2026-09-29: David confirmed both emails sent (Ohio State brandcenter@osu.edu, Buckeye webfonts; Notre Dame licensing@nd.edu, athletics typography). **Notre Dame replied: not permitted without a license (via Fanatics)**; get an attorney consult before any commercial launch. **Oct 2: asked for the closest public typeface, Notre Dame replied that no marks or logos are publicly available and all are for licensed vendors only - no font named, so Notre Dame keeps Suite's own typeface. David decided (Oct 2): keep the app as is for now** (name, logo from ESPN, Team Style colours) while it is free. The app is already publicly reachable (GitHub Pages, live since Sep 26); the decision covers that deployment as it stands. Revisit before monetization or any wider promotion (an app-store listing, advertising the app): logos to initials (a config switch), a license, or counsel's advice. **Ohio State replied 2026-09-29: the Buckeye fonts are not available for independent use; on 2026-10-01, asked for the closest public alternative, it recommended two Google Fonts: Source Serif 4 and Nunito Sans ("not Nunito").** Both are SIL Open Font License, so they can be self-hosted like Instrument (W12). **David approved (Oct 1): Nunito Sans for Ohio State's text and headings in Team Style**, self-hosted (`assets/fonts/nunito-sans/`, downloaded only on Ohio State's Suite; `tools/teamfontcheck.js`); the Buckeye font names are gone from its config. Source Serif 4 has no team role in Suite today and is not added. | Instrument fallback unblocks the brand pass. Do not send emails or bundle proprietary fonts on an assumed permission. |
| Exceptional game-status payloads (C8) | Capture a real delayed/suspended/postponed/canceled response when one occurs; retain provenance, then add regression fixtures. | Event-dependent. Existing defensive behavior can be tested without claiming synthetic data is a real capture. |
| Offseason live provider verification | Validate actual January polls/markets against the W16 implementation. | Real offseason timing cannot be accelerated; fixtures cover release readiness beforehand. |
| Cloudflare GitHub App removal (C13) | Optional account cleanup by David if the installation still exists. | The old Workers were deleted; no app build required. Not the edge API: Suite's `suite-api` Worker (decision 0030) deploys from Actions with an API token, not the GitHub App. Account state not verified here. |
| Internal iw- names (C16) | Keep until a concrete migration benefit exists; inventory if touched by W10. | Internal branding cleanup adds migration risk with no current fan benefit. Not a required “finish everything” gate. |
| Phase 4D Market/Forecast provider boundaries | Revisit when W11/W18 or another concrete change warrants extraction. | Deliberately deferred architecture, not unfinished mandatory platform work. |
| More teams/sports (Phase 9), recruiting/transfers | Discovery after complete OSU and validated user need; source decisions first. | Directional roadmap, not an unlimited build instruction. |
| NFL draft prospects (David's idea, Oct 2) | Offseason option in the "Suite offseason: options to decide" doc (Idea 6): each draft-eligible player's projected grade and round or pick, credited, then the actual pick. Claude probes ESPN's draft data from the runner first. | **Probed Oct 2:** ESPN's draft API has a 50-player 2027 board with position and overall rank; grades appear later in the cycle and there is no projected pick. NFL.com's grades are personal-use only. **David decided (Oct 3): build it from ESPN's draft board** (proposal §7, decision 6). Next: real fixtures, a TeamOS adapter, then a producer; the screen comes with Codex's offseason designs. |
| Postseason notifications (David, Oct 2) | Queued in `docs/product/notifications-brief.md` §2: CFP rankings released, Selection Day reminder, the team's bowl or playoff game set, no postseason. | Built after W19's kickoff and final alerts are proven. |
| Bronze-halo app-icon option (B10) | Flat default stands; no action unless David requests the alternate. | Existing final icon set is delivered; do not reopen it as a blocker. |

## Settled decisions: do not ask again

- Team first; Suite remains install name, chooser/About identity and app icon. Exact revised header composition is W12.
- Top 25 keeps its primary tab. Schedule access improves through W08.
- Odds remain informational; full-field view is approved. No bet placement.
- Instrument Sans + Instrument Serif is the approved free, self-hosted pair; do not purchase Neue Haas/Canela.
- Flat Suite icon stays. Existing release wordmark/icon assets are completed.
- Refresh Data scope and Feedback origin were adopted and implemented with More corrections; B13 is not an unresolved prerequisite.
- Notifications first among new MVP pillars; finish OSU before adding more teams.
- Notifications: no push without a reason the fan would name; noise makes fans tune out all of them (David, Oct 7). The "Game alerts are on" test push stays for testing. Before any public launch it becomes an on-screen confirmation, or a first-time-only push (notifications-brief.md §3).
- Main + short-lived branches, PR-based delivery. Four-hour silent check-ins unless action is needed remains the recorded preference; actual automation state was not inspected.
- First backend: Cloudflare Workers edge API (`suite-api`, decision 0030); Postgres and FCM only when a feature needs them. CFBD data is shown in the app only, never published as files (Bill at CFBD, Oct 1).
- Pregame availability is posted only on X: Suite does not expect it (W03, Oct 1).
- Battle framing only on preseason / Game 1 charts (W05 option A, Sep 30).
- Consumer experience remains free; monetization, paid tiers and their features are outside this queue.
- Team names, logos and Team Style stay as they are while the app is free (David, Oct 2, after Notre Dame licensing's replies). That covers the current public deployment (GitHub Pages, live since Sep 26). Revisit before monetization or any wider promotion, such as an app-store listing or advertising the app.

## Completion rule

Done means the specific task is implemented (or a research-only task has its concrete decision deliverable), required checks pass, visual/product review is recorded where applicable, and the accepted change is merged and verified through the normal delivery process. “Built on a branch,” “CI green,” “proposal exists” and “no newer report found” are distinct states, not interchangeable with done.
