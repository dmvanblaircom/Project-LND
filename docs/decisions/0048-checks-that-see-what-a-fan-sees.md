# 0048: Checks that see what a fan sees

**Status:** Decided by David, 2026-11-25.

## Context

On 2026-11-25 David found the checks were "getting some false fails but missing some obvious visual fails", and asked that they work for all 138 teams.

- **False fails:**
  - the gate reported red on runs that a newer push had cancelled;
  - `launchcheck` raced the page.
- **Missed fails:** each of these was caught by a person, not a check.
  - Matchup highlighted the losing side on the dark theme;
  - Syracuse's photo showed the roof, not the field;
  - the LIVE badge differed between Home and Game.
- **Causes:**
  - many screen checks render on a stand-in page, not the real app;
  - they test rules (contrast, overflow), not meaning (the winner stands out);
  - the body of Home and Game was tested for two teams only;
  - nothing showed a person what a change did to the screen.

## Decision

All four items, in this order (David: "All 4 but we don't need a nightly sweep. That's overkill."):

1. **Stop the false fails.** A superseded run shows cancelled, not failed (#281). A test waits on page state, not the clock, wherever one is found to race (#279 fixed `launchcheck`).
2. **One harness: the real app.** Home and Game checks render the actual app on fixtures, never a stand-in page. Each regression a person finds becomes a check of what it means.
3. **All 138 teams, at a sensible cadence:**
   - **Every pull request** that changes the page checks Home and Game for the twelve colour-extreme teams in `tools/teamsets/extremes.txt`. The list is picked from the configs' colours: silver, near-black, yellow on black, red grounds, the lowest contrast, and so on.
   - **All 138 teams** are checked after a merge that changes the look, and on Thursdays in season. This run reports and does not block.
   - There is no nightly run of the full set.
4. **A picture of what changed.** Every pull request that changes the page gets a comment holding a before/after sheet of only the screens whose pixels changed, for the same twelve teams. Claude reviews it before David sees it.

## Consequences

- **`tools/changesheet.js`:**
  - draws Home in four states and Game in three, for the twelve teams at 390, plus Home at 1280 for Notre Dame and Ohio State;
  - draws both sides with one harness, still (`tools/stagereview.js` with `STAGE_ROOT` and `STAGE_STILL`);
  - diffs the pixels and lays out the changed screens cropped to the change and ringed.
- **`tools/postsheet.js`:** commits the sheets to the `review-sheets` branch, which holds only pictures and is never merged, and keeps one comment per pull request up to date.
- **The `changes` job in `check.yml`:** gates nothing. A failure there does not fail the run.
  - Its "before" is the base the pull request merges onto: the first parent of GitHub's merge commit, which is what the "after" side is built on. It was `pull_request.base.sha`, which can be another commit of the base. On a branch left open while `main` took data refreshes, the two sides drew different news and the sheet called that a change (#289, 2026-11-27).
- **The first sheet found a real bug.** The badge's LIVE dot kept pulsing under reduced motion, because the earlier "preferences last" rule lost to the badge rule added after it in the file. Fixed in the same change.
- **Item 3, `tools/teamcheck.js`:**
  - **Screens:** Home before the game, live and final; Game before the game and live, at 390; and Home live at 1280. All are drawn in the real app by the shared harness `tools/lib/stage.js`, which `stagereview.js` uses too.
  - **What it checks on each screen:**
    - nothing scrolls sideways;
    - no "undefined" or "NaN" reaches the fan;
    - every word meets WCAG AA against the pixels behind it (the photo stage stays `herocontrastcheck`'s job);
    - nothing animates without end under reduced motion;
    - Matchup's better side stands out more than the other.
  - **When it runs:** on every pull request that changes the page, for the twelve colour-extreme teams. `.github/workflows/teams.yml` runs it for all 138, in six shards, after a merge that changes the look and on Thursdays from August to January. That run reports and gates nothing.
- **The auditor now reads SVG text by its fill.** It had read the CSS colour, so the drive field's white yard numbers counted as navy: a false failure on every team.
- **`herocontrastcheck` never loaded a photograph** (found 2026-11-26). The page it draws resolved the photos' paths under `/tools/fixtures/`, so every case was read over the bare scrim. With the paths fixed (a `<base>`) and the check waiting for every photo, 1,788 words on the stage fell under AA, on the live Notre Dame and Ohio Stadium photos too. A soft plate under the scoreboard, the rank in the board's own ink and a near-solid pill ground bring every one to AA. The check also wraps its rows: one row per team grew past the widest screenshot Chromium takes once venues multiplied, and the capture came back white. Every venue is now drawn by day and by night, under the twelve extreme teams and Suite Style, and every other team under its own home stadium.
- **Item 2, landed 2026-11-27.** `homegamecheck` and `mobilefitcheck` now draw in the real app through `tools/lib/stage.js`: the app boots on the fixtures under the team's own look (Team and Suite Style), and each case is painted by the app's own renderers into its own screens. Neither keeps a stand-in page or sets the look's colours by hand. Every case they checked before is still checked; `mobilefitcheck` now also checks overflow on each of its four screens, not once for all four.
  - **The move found a hole in the harness.** The app repaints Home and Game on a resize, and the contrast auditor resizes the viewport to capture the whole page. So a check could measure the words of the state it painted against the pixels of the app's own repaint. `stage.hold(page)` now holds off the app's own repaints once a test paints. `stage.paint` holds by itself, so `teamcheck`, `stagereview` and the change sheet are covered too.
  - **Not moved, on purpose:** `flickercheck`, `scrollkeepcheck`, `focuscheck`, `markfitcheck` and `statslayoutcheck`. Each tests one mechanism (a logo that must not reload, the scroll position kept through a refresh, focus kept through a redraw, mark sizing, the stats tables), not a screen of Home or Game.
