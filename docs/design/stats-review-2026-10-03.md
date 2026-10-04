# Stats presentation - October 3, 2026

The second slice in David's order follows his approval of Home/Game and its
deployment in #100. This carries the reviewed Stats preview into the real
Team and Players views, preserving Claude's data and all leader rows.

- Team labels and values keep the same grid; values use tabular numbers.
  Narrow cards with enlarged text put each row's label above its two values.
- Player names stay visible during horizontal scrolling. Long names wrap.
  A table that actually overflows shows a scrolling cue and becomes a named,
  keyboard-scrollable region; a table that fits adds no extra focus stop.
- A resize or late font updates that cue. An unchanged background refresh
  keeps the table element, its scroll position and its focus.
- Stats cards use the quiet Home/Game treatment. Fonts, source notes,
  comparisons, loading/offline states and source-provided rows remain.

`tools/statslayoutcheck.js` exercises both teams and styles at
320/375/390/768/1280, normal and doubled text size, using the existing real
team/leader fixtures. It checks alignment, overflow, every leader row,
sticky names, keyboard scrolling/focus, contrast, resize and missing data.
All 84 focused cases passed locally. The full release workflow also applies.

The release run exposed an existing launch-check visibility error after the
new thumbnail feed arrived: a lazy image at x=556px on a 390px viewport was
counted as visible because the test checked only its vertical position.
The check now requires horizontal intersection too, matching the existing
app readiness rule. The original failure was reproduced before correction;
visible images still must settle before the normal launch lifts.

Game Alerts is separate work in Claude's #103. This slice changes neither
its controls nor subscription behavior. Its service-worker version bump
must be combined with any newer alert handlers when merging concurrent work.
