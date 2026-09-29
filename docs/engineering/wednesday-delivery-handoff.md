# Wednesday delivery handoff: Claude engineering + Codex UI

Start: Wednesday September 30, 2026, America/New_York.
Requested by David September 28: reconcile completed work, prioritize everything remaining, and separate Claude's work from Codex's UI/design-file parity work.

Read [backlog.md](backlog.md) first. Its W01–W26 rows are the full remaining scope with implementation owners and acceptance requirements. [The reconciliation record](backlog-reconciliation-2026-09-28.md) proves what is already done; do not rebuild it.

## Recommended ownership

- **Claude:** TeamOS/domain rules, source research/ingestion, adapters, snapshots, controller state, caching/retry/polling, service worker, workflows, push backend, behavioral regression tests and release engineering.
- **Codex:** design-file interpretation, mockups and explicit component specs, production HTML/CSS/presentation code, fonts/tokens, responsive composition, image art direction/crops, accessible visual states, screenshot comparisons and final UI parity.
- **David:** product scope and new visual approvals, externally held accounts/permissions and real-device observations.
- Shared features have separate data/behavior and presentation slices. Codex is a UI implementer in this proposed plan, not only a reviewer handing more design prose back to Claude.

This is a plan, not a command to start building or merge now. The September 23 “ChatGPT does not modify production code” rule in docs/09_AI_OPERATING_SYSTEM.md predates this proposed split. When David assigns the Codex implementation work, record the updated role and scope explicitly in the operating-system/decision docs; retain the same review and release controls. Do not silently broaden that assignment into data/platform ownership.

## Claude's execution lane

1. **W01–W05:** finish the existing flicker PR; investigate refresh-clock and availability alerts; fix final-with-missing-score behavior; implement Week 2 battle/open-job policy. Keep official OR designations.
2. **W07 feasibility starts immediately:** confirm FPI/SP+ sources, cadence and permitted access; build independent normalized outputs, producers, retries and fixtures. Hand Codex source options and stable loading/empty/stale/error models.
3. **W06/W08 contracts:** expose the chart comparison/count/list using the arrows' baseline, plus last-result/next-three schedule selection and routes. Codex renders them.
4. **W09–W11:** finish the scan-record PR and review evidence; simplify controller/refresh ownership incrementally; remove unsupported public-relay fallback dependence without losing market data.
5. **W15–W18 data:** completed-game defensive aggregates; season/rollover policies and postseason label research; safe structured play normalization; full-field market model.
6. **W19–W21:** approved push service/event logic; complete supported OSU producers/history; scalable rivalry source/model.
7. **W22–W24:** persistence/service/instrumentation only after concrete product scope is chosen.
8. **W25–W26:** documentation, verified branch cleanup and shared test harness. Keep docs accurate after each earlier task rather than save all documentation for the end.

Do not independently restyle the app during these changes. Minimal UI changes needed for a correctness fix are fine within that slice; coordinate shared files with Codex.

## Codex's execution lane

1. **Wednesday start: W12/W13 reference and asset preparation.** Gather the ten approved canonical references, shipping identity assets, later decisions, current screenshots, font decision and visual audit. Establish an explicit precedence sheet and missing assets. Do not wait for a broad controller refactor to finish before preparing or prototyping UI.
2. **W06 quick roster slice** after Claude's policy/comparison handoff. Implement the quiet changes disclosure from the linked orientation, no current-week battle/open-jobs chrome from Week 2 onward, retained OR rows/arrows, compact report metadata. Do not use the sample names/numbers as data specifications.
3. **W12/W13 Home + Game reference implementation.** Apply Instrument type roles, approved Ink/Pearl mapping, team-first header, imagery/overlays, spacing and surface hierarchy. Show actual browser renders with real content. Resolve new placements with David before broad rollout.
4. **W14 propagate approved components.** Roster → Top 25 → Schedule/News → More/Settings/Feedback/About; preserve the chooser's approved composition. Add clear final-winner emphasis, responsive news proportions, table/roster alignment, stat hierarchy, nav optical consistency and desktop alignment.
5. **W07/W08 UI integration** as Claude's contracts become ready: scalable five-source rankings selector, rating/attribution/freshness display, four-row Home schedule and Full Schedule access.
6. **W15/W17 presentation:** fit defensive metrics honestly; refine play grouping/spacing while preserving the meaning of Claude's normalized data.
7. **W16/W18:** design and implement approved offseason states and the full-field market board. Start offseason design during earlier work; ship by mid-November.
8. **W19–W23:** design and implement approved notification/preferences, OSU-specific visual QA, rivalry placement, personalization and participation UI. No unsupported controls.
9. **W24:** help David make the validation/measurement decision; do not add telemetry merely because code can be instrumented.

## UI parity definition

“Close to the mockup” is not the acceptance standard. Each slice must name the reference file/screen and demonstrate the intended typography, proportions, alignment, spacing, image crop, color roles, corners, depth and icon weight in a real browser.

Authority order:
1. David's later explicit decisions and approved product behavior.
2. Approved canonical reference screens, not the withdrawn vNext designs.
3. Approved brand/typography decisions and shipping identity assets.
4. Approved new component mockups/specs, including the Week 2+ roster orientation.
5. Current app behavior to preserve where references do not define it.

If sources conflict, prepare the concrete choice and document intentional differences. AI-image sample scores/names, unsupported player chevrons, removed Coaches/Tickets, obsolete Suite-led headers or old fonts are not instructions to restore retired behavior.

For each reviewed slice:
- Match route, team, state and data between before/after captures.
- Review 390 first, then 320/375/768/1280; both ND and OSU and Team/Suite styles.
- Check long names/headlines, image failures, slow fonts, missing data, stale/offline, pregame/live/paused/final.
- Preserve text contrast, keyboard/focus behavior, usable touch targets and screen-reader semantics.
- Maintain a short difference list: matched, intentional difference, unresolved.
- Obtain visual approval of the reference implementation before propagating it. CI green alone is not design parity.

## Coordination and delivery

- Each slice has one active code owner and one PR. A shared feature can use a data PR followed by a UI PR, or one designated integration owner.
- Do not both rewrite app.css, app.js or the same suite/*.js component at once. Declare touched files/model shape; hand off at a commit and rebase before the next slice.
- Claude should not flatten Codex's approved UI while refactoring; Codex should not bypass TeamOS with provider parsing or recalculate domain rules in the renderer.
- Existing PR #28 is already built: Claude finishes it and Codex uses the result. PR #25 is records/tooling, not twelve new fixes.
- Independent work can continue when a source, asset or David decision is pending. Report the blocker and move to the next ready task.
- Required checks, user review and release approval still apply. No automatic Claude execution, messages to Claude or deployment is created by this document.
