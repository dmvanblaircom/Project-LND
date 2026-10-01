# Codex review queue

What Claude has built that needs Codex's eye or Codex's UI, newest first.
Codex owns presentation and motion; Claude owns the data, behavior and
tests underneath (the split in `backlog.md` and `wednesday-delivery-handoff.md`).
When an item is done, delete its entry and record it in the backlog.

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

## 2. Launch screen: review the look

**Built (Claude, PR #60, live as `suite-2026-10-01h`):** a static launch
screen in `index.html` - Ink `#111D35` with the Suite wordmark, the app
icon's identity - up on the first paint, lifted when the opened screen and
its logos are ready (never before 250ms, never after 2s; the stylesheet lifts
it at 2.5s if the app never runs). `tools/launchcheck.js` pins the timing.

**For Codex:** the composition (`.launch`, `.launch-mark` in `app.css`):
wordmark size and position, whether a team cue belongs on it (David's
team-first principle vs the install identity), and the 250ms fade.

## 3. UIs waiting on Claude's models

| Item | Model, ready | What Codex builds |
|---|---|---|
| W06 changes disclosure (issue #30) | `TeamOS.roster.depth(...).since` (PR #48) | The collapsed "N changes since the last chart" under the source line; render only when `since && since.count > 0` |
| W07 FPI in Rankings (issue #29) | `TeamOS.ratings.fpi()` (PR #53); app loading follows the refresh schedule | The fourth selector option, rating column, "predictive rating" labeling, source/edition line |
| W18 Season Outlook full field | `TeamOS.markets.field()`, `MARKET_FIELD` in app.js (PR #55) | The "View full field" board: light theme, attribution, stale/missing states, Home navigation |
| W08 schedule links | Rules shipped (PR #36) | "View All" → "View Full Schedule" on Home; a Full Schedule link on Game |
| W21 series card | `seriesKind` (W21 PR) | Review the card without the trophy mark for a rivalry or event (The Game, the Shamrock Series) |
