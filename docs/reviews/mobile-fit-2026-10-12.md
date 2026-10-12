# Mobile layout follow-up, October 12

David authorized Codex to continue the ready work while Claude is unavailable
until Wednesday October 14 at noon America/New_York. This slice changes
presentation only, from main `59911a3` (subsequent main commits are data refreshes).

## Changes

- Top 25 records have a real wrapping opportunity. At 320px the status moves
  below the matchup, preserving whole names, ranks, logos and records.
- Home's schedule preview wraps the venue across the name/network columns on
  phones, instead of truncating it or squeezing it into a narrow column.
- Home's existing name fitter gets a small inner clearance before choosing
  the tighter setting or both abbreviations. It already handled two-digit
  ranks; this is spacing, not a replacement fitting algorithm.
- Game's score and football form one measured group. The football cannot sit
  outside its group's width and collide with HALFTIME at 320px.

Preserve the halftime receiver: David explicitly approved it in PR #23.
October 10 scan item 3 recommends removing approved behavior and is superseded
by that decision. Item 7's collision is fixed without removing the indicator.
No team-specific rendering branches or changes to possession rules.

## Evidence and status

`tools/mobilefitcheck.js` runs the actual components for both teams, both
styles, and 320/375/390/768/1280. It checks painted text containment, complete
venue display, receiver/status separation and page overflow. Controlled
states reproduce the reported narrow layouts and include a two-digit rank.
The original code fails 25 of 100 assertions; the new code passes all 100.
Screenshots and verification are under `artifacts/visual/mobilefit/` and
included in the PR's `suite-visual-smoke` artifact.

Also passed locally: csscheck, livecheck, suitecheck, homegamecheck,
teamfontcheck. The PR runs the full existing CI gate. A passing gate is not
David's visual approval or a physical iPhone certification.

Scan items 1, 2, 5 and the layout part of 7 are addressed in this branch,
pending PR review/merge. Item 6 (unknown drive duration displayed as 0:00)
remains Claude's data/behavior task. Item 4's play wording must be rechecked
against the cleaner already merged in PR #125, not independently rewritten.

## Integration

This is independent of `codex/fpi-rankings-oct12`; both touch different parts
of app.css and suite/top25.js. Both bump sw.js VERSION. On the second merge,
retain both changes and choose a new VERSION, then run versioncheck and the
required CI gate. Do not choose one branch's whole file to resolve a conflict.
