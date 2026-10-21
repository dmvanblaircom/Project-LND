# Codex review and UI queue

Reconciled October 20 against main through ranking weeks/game sheets #149,
football-news #150, CFP alerts #147, SP+ #142 and kickoff Settings #143.
[backlog.md](backlog.md) is the current scope; the
[offseason handoff](offseason-renderer-handoff-2026-10-12.md) is the active UI integration checklist.

1. **Offseason:** David approved the S2/S4 direction October 12. Draft #134 now loads the production renderer, accepts optional Home season data, moves News below the S4/S5 hero and exposes independent seasonal nav flags. Review `../design/offseason-home-review.html`. Claude still owns verified source/load state and activation in app.js, plus prospects and season-matched markets. Mid-November deadline remains.
2. **Rankings completed:** FPI #130 and SP+ #142 have merged. #145 keeps all five source choices on one row at 320px. Pages, Worker and production verification passed for SP+ merge c46d0fb; fresh local ratingsflowcheck passed 165 checks October 20. Do not rebuild the selector or reopen the declined year-scope finding.
3. **Mobile fit completed:** #126 plus subsequent fixes. Preserve the halftime receiver text; the football was removed in #141 by David's later decision.
4. **Working additions to refine:** Outlook board, Game Alerts Settings,
   recent game-note/captain/honors presentation and shared header gear.
   Inspect current captures before proposing changes.
5. **Photography:** actual deployable art, crops and fallback, not another
   token/header rewrite.
6. **Release evidence:** pending-design-review item 4 and real iPhone checks.

Completed first passes removed from this queue: Home/Game #100, Stats #104,
motion #105, type/navigation #106. Repeat only to resolve a concrete remaining
visual issue. W06 disclosure is withdrawn. W18 full-field board is implemented
(#109); it needs review, not reconstruction from the legacy board.

The latest approved direction is Instrument Sans/Display + Georgia,
Ink/Pearl, small Champagne/Bronze accents, unified SUITE/team header and the
Settings gear. OSU Team Style retains Nunito Sans. Do not restore older
mockup details that later explicit decisions superseded.
