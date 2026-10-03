# Codex review queue

What Claude has built that needs Codex's eye or Codex's UI, newest first.
Codex owns presentation and motion; Claude owns the data, behavior and
tests underneath (the split in `backlog.md` and `wednesday-delivery-handoff.md`).
When an item is done, delete its entry and record it in the backlog.

**David's UI order, October 2:** Home/Game → Stats → navigation and motion →
brand/type → FPI → photography → Season Outlook full field → notifications →
offseason. These are the chat's items **2, 3, 4, 1, 5, 7, 6, 9, 8**. This
order supersedes earlier UI sequencing; offseason's mid-November target stays.

**October 3 additions to the first slice:** every comparable Matchup row
shows the better value, including unranked defensive allowances; Outlook
probability tracks align across widths; Home and News prefer article photos
and fall back to publisher logos. See the [Home/Game review](../design/home-game-review-2026-10-03.md).

**October 3 progress:** David approved Home/Game; #100 is deployed and
production-verified. Stats is the next production slice, carrying that
treatment into Claude's Team and Players views; see the
[Stats review](../design/stats-review-2026-10-03.md). Navigation/motion follows.

## 1. Home's schedule rows on phones: the site tag above the name

**Found in the bug hunt, 2026-10-02:** on a phone, Home's three schedule
rows put HOME / AWAY / NEUTRAL beside the opponent and the network pill at
the right, and the name was squeezed between them: "Wiscons / in" at 375,
one letter a line at 320.

**Built (Claude):** at 30rem and below the tag rides above the name, the
rule the full Schedule row already follows at that width (`app.css`, the
"Phones" block). At 22.5rem and below the full Schedule row drops the
opponent's mark, which repeats the name beside it, so the name has the
room ("Michiga / n St" in Ohio State's face at 320).
`tools/visualcheck.js` now fails any name or label that
breaks inside a word, wherever the Suite's typefaces loaded.

**For Codex:** the stacked compact row at 320/375/390, both teams, both
App Styles.

## 2. Stats: the team's season (W27)

**Asked by David, 2026-10-01:** full team season stats, under More. It is
also linked from the Roster tab and Game's Matchup card, with the opponent
beside it during game week (proposal: `docs/product/season-stats-proposal.md`).

**Built (Claude):**
- `TeamOS.espn.teamSeason()` decides which figures exist, what they are
  called and which carry a rank. It is an allowlist over ESPN's real
  payloads.
- `suite/stats.js` draws them; `app.js` `loadStats()` fetches.
- The route is `#stats`, owned by More.
- `tools/adaptercheck.js`, `tools/suitecheck.js` and `tools/visualcheck.js`
  pin the rows, the ranks, the opponent column and the links.

**For Codex to review - the look only (`app.css`, "Stats: the team's season"):**
- The rows (`.ss-row`, `.ss-v`, `.ss-rk`): one column, and two in game week
  (`.ss-row.two`, `.ss-cols`). The team labels (`.ss-cols`) now sit on the
  rows' own grid, under the card title, so each is over its figures (David,
  2026-10-02: they had wrapped under the title, flush left).
  `tools/moreflowcheck.js` holds them centred over their columns at 320 and
  390px; restyle freely within that.
- Long values ("17 of 41 (41.5%)") wrap inside a 5.4rem column at 320px.
  Decide whether they should.
- The season line, the "This week" line and the source note.
- The Roster link (`.ro-stats`, above the view strip) and Matchup's "Full
  season stats" link.
- The More menu's new Stats icon (`suite/more.js` `ICONS.stats`).
- **Players (Phase 2, Oct 2):** the Team | Players strip (`#stats`,
  `#stats/players`) and the four leader tables. They are Box Score's table
  (`.bx`) inside the Stats cards, with every row showing, nothing folded.
  Decide whether a long table (Defense, 25 rows) should start folded like
  Box Score's, and how the unnamed-players note reads.

Check at 320/390/1280, both teams, Team Style and Suite Style, inside and
outside game week.
## 3. Game hero: the weather and the line moved under the game

**Asked by David, 2026-10-01:** the weather and the betting line sat in the
hero's top-right corner and read "off and unbalanced". David approved
moving them and asked that Codex be told.

**Built (Claude):** `suite/game.js` `header()` now draws the conditions
(`tertiary()`, `.gh-extra`) after the team row instead of before it. The
result is one centred row under the countdown (or under the clock while
live), with weather and line as two equal halves either side of a rule.
Which facts show, and when, is unchanged. `tools/suitecheck.js` pins the
order and the halves. The same component draws a game opened from Schedule.

**For Codex to review - the look only (`app.css` `.gh-extra`):**
- Spacing above the row, the halves' width (`flex:0 1 9.5rem`), the rule,
  and type sizes against the countdown.
- Below 360px the row is still hidden (0024 §2: tertiary goes first). With
  the row under the game instead of beside the title it may now fit at 320;
  showing it there is a product call for David.
- Home's game card keeps its own conditions placement (`.gc-extra`); match
  it if you judge it has the same imbalance.

Check at 320/375/390/1280, both teams, Team Style and Suite Style, pregame
and live.

## 4. One header on every screen: review the page title under the bar

**Asked by David, 2026-10-01:** every screen wears the Top 25 header, and it
scales to Ohio State (decision 0031).

**Built (Claude):** `suite/nav.js` SCREENS (`hero`, `itemHero`) and
`paint()`; the masthead is gone from `index.html`, `app.js` and `app.css`.
Which screens show a visible title, and that the bar carries the team on
every screen, is behavior and is settled; `tools/visualcheck.js` pins it for
Notre Dame and Ohio State.

**For Codex to review - the look only (`app.css` `.app-bar`, `.bar-context`,
`.page-title`):**
- The page title's size and spacing under the bar, now that it heads Roster,
  More, Schedule, News, Settings, Feedback and About Suite as well as Top 25.
- Roster's sticky Offense | Defense | Special Teams control now sticks under
  the bar (`.unit-seg`); check its edge against the bar while scrolling.
- Desktop (1280): the title and the bar's team context against the column.

Check at 320/390/1280 for both teams, Team Style and Suite Style.

## 5. Pull to refresh: review the indicator

**Asked by David, 2026-10-01:** a pull-down refresh that does what
Settings' Refresh Data does, with no explanation on screen.

**Built (Claude):** `suite/nav.js` `pull()` and `app.js` `manualRefresh()`.
What counts as a pull is behavior and is settled - one finger, starting with
the page at its top, at least 64px down and twice as far down as sideways,
not on a form control or inside anything scrolled down itself; a pull while
a refresh runs, or Refresh Data pressed during one, joins it. The pull and
the button are one refresh: Settings shows it under way and reports its
outcome whichever started it. `tools/pullcheck.js` pins all of it.

**For Codex to review - the indicator only (`app.css`, end of file):**
- `.pull` / `.pull-mark`: a white disc with a ring that slides out from under
  the header with the finger (60% of its travel), completes its arc at the
  mark (`.is-armed`), and turns while the refresh runs (`.is-refreshing`).
  A placeholder: size, travel, the ring's colour (`--t-accent-on-light`),
  shadow, whether the content should move with the pull.
- Whether a pull that came back with stale data should show anything beyond
  the screens' existing freshness lines (today it shows nothing, per David).
- Reduced motion: no turning, no slide transition. Keep that.

Check at 320/375/390 on Home, Game, Top 25 and Roster, Team Style and Suite
Style. `node tools/pullcheck.js` must stay green; it asserts the classes, not
their look.

## 6. Swipe between a screen's views: review the motion

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

## 7. Launch animation: review the motion and look

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

## 8. News: the no-photo tile grows to fit its source (2026-10-02)

Ohio State's beat feeds (PR #89) brought stories without photos from "Land-Grant Holy Land". At 320 and 375px the name's first line was clipped off the top of the tile, and the accessibility gate failed. The tile now keeps the photo's 4:3 as its least height and grows for a longer name, so a team's source names never need to fit a fixed box. Review: whether a taller tile in that one row reads well, or whether a long source name should be drawn another way.

## 9. The CFP calendar on Top 25 and Schedule (David, 2026-10-02)

Top 25's notice under the poll selector now names the next CFP rankings show (day, time in the fan's zone, network), or says it is on now, and Selection Day with the playoff field and then the bowls. The schedule's last row says when the team's bowl or playoff game is announced. Both are built from existing tokens (`.rk-note`, the schedule list). Review: the two-line notice's weight above the poll, and the schedule's foot row (`.sched-post`) beside the game rows. Decision 0033.

## 10. UIs waiting on Claude's models

| Item | Model, ready | What Codex builds |
|---|---|---|
| W07 FPI in Rankings (issue #29) | `TeamOS.ratings.fpi()` (PR #53); app loading follows the refresh schedule | The fourth selector option, rating column, "predictive rating" labeling, source/edition line |
| W18 Season Outlook full field | `TeamOS.markets.field()`, `MARKET_FIELD` in app.js (PR #55) | The "View full field" board: light theme, attribution, stale/missing states, Home navigation |
| W21 series card | `seriesKind` (W21 PR) | Review the card without the trophy mark for a rivalry or event (The Game, the Shamrock Series) |

**David's October 1 correction:** preserve the deliberately compact depth-chart changes section and its movement arrows. W06's disclosure is withdrawn; do not restore or enlarge the changes section. See the controlling direction in `backlog.md`.
