# Codex review queue

What Claude has built that needs Codex's eye or Codex's UI, newest first.
Codex owns presentation and motion; Claude owns the data, behavior and
tests underneath (the split in `backlog.md` and `wednesday-delivery-handoff.md`).
When an item is done, delete its entry and record it in the backlog.

**David's October 1 correction:** preserve the deliberately compact depth-chart changes section and its movement arrows. W06's disclosure is withdrawn; do not restore or enlarge the changes section. See the controlling direction in `backlog.md`.

## 1. Swipe between a screen's views: review the motion

**Asked by David, 2026-10-01:** "Claude builds the navigation, Codex reviews
the animation." Sub-views only, never the primary tabs.

**Built (Claude):** `suite/nav.js` `swipe()`. A sideways swipe on a screen's
content goes to the next or previous peer view, through the same route a tap
uses (Back walks it): Top 25 Games ↔ Rankings, Roster Depth Chart ↔ Roster ↔
Availability, Schedule ↔ Results, and Game's lifecycle views. What counts as
a swipe is behavior and is settled - one finger, ≥ 60px sideways, ≥ 1.5× its
vertical travel, under 800ms, not from within 20px of either edge, not
starting on anything that scrolls sideways or on a form control, not on an
item opened from a list. `tools/swipecheck.js` pins all of it.

**For Codex to review - the motion only (`app.css`, end of file):**
- `.view-in-next` / `.view-in-prev`: the new view slides 1.75rem in from the
  swiped side while fading from 40% opacity, 200ms ease-out. A placeholder:
  tune distance, duration, easing and the fade, or replace it.
- Whether the view's tab underline should travel with the swipe (today the
  tabs simply repaint on the new route).
- `.page-main{overflow-x:clip}` keeps the slide from widening the page;
  confirm nothing intentionally bleeds past the content column.
- Reduced motion: no animation, the view just changes. Keep that.
- Out of scope unless David asks: follow-the-finger dragging.

Check at 320/375/390 on Top 25, Roster and Game (live and final), Team Style
and Suite Style. `node tools/swipecheck.js` must stay green; it asserts the
class is applied and removed, not its look.

## 2. Launch animation: review the motion and look

**Asked by David, 2026-10-01:** "about 3 seconds and clean", like Sleeper's
launch; the first version's wordmark jumped and lifted before data loaded.

**Built (Claude):** `index.html` - the Suite wordmark drawn inline (no image
to load, so it cannot pop in), letters rising in one by one (150ms + 90ms
each, 450ms), then a champagne `#D4B896` rule drawing beneath (from 850ms,
600ms), on Ink `#111D35`; a 350ms crossfade with a 1.04 scale-up on lift.
Styles and clock are inline in the head so they hold on the first paint; an
update's reload resumes the animation instead of restarting it.

**Settled behavior (Claude, `app.js` `liftLaunchWhenReady`, pinned by
`tools/launchcheck.js`):** it lifts after 2.6s (0.6s under reduced motion)
and only onto a complete screen - every first request answered, every image
in view loaded - never after 6s; the inline style lifts it at 7s if the app
never runs.

**For Codex - motion and look only (`#launch-style` in `index.html`):**
timings and easing of the letters and rule, the exit, wordmark size, whether
a team cue belongs on it (team-first vs install identity), and the
reduced-motion state (static wordmark, no animation). Changing the 2.6s
minimum is David's call, not a styling choice.

## 3. UIs waiting on Claude's models

| Item | Model, ready | What Codex builds |
|---|---|---|
| W07 FPI in Rankings (issue #29) | `TeamOS.ratings.fpi()` (PR #53); app loading follows the refresh schedule | The fourth selector option, rating column, "predictive rating" labeling, source/edition line |
| W18 Season Outlook full field | `TeamOS.markets.field()`, `MARKET_FIELD` in app.js (PR #55) | The "View full field" board: light theme, attribution, stale/missing states, Home navigation |
| W21 series card | `seriesKind` (W21 PR) | Review the card without the trophy mark for a rivalry or event (The Game, the Shamrock Series) |
