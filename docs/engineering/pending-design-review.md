# Changes approved without ChatGPT review

The usual loop is: Claude Code builds a phase, ChatGPT (Product, UX and
Architecture Partner) reviews the committed code and CI screenshots, David
approves. While ChatGPT was unavailable, David approved the steps below
directly, with the instruction that they be logged as **No ChatGPT review**.
When ChatGPT is back, Claude Code turns this file into one review prompt
covering every entry, and ChatGPT reviews them together.

An entry leaves this list when ChatGPT has reviewed it and any corrections
are done. Each entry says what changed, which calls engineering made on its
own (the things a reviewer most needs to look at), and where the evidence is.

## Status

| # | Step | Commits (design/suite-canonical-v1) | Approved | ChatGPT review |
|---|---|---|---|---|
| 4 | Release hardening: Home/Game "schedule didn't load" state and retry (`2feed1a`); Schedule row says "Final" for a final without scores (`2feed1a`); the new worker reloads the page it takes over after an update (`c7d8cb1`) | `2feed1a`, `c7d8cb1` | David, 2026-09-25 (regression pass; "optimize that first reload") | **No ChatGPT review.** Review after launch, packaged with the next review (David, 2026-09-25). Details: `suite-redesign-completion.md`, "Release regression pass" and "First open after the deploy". |
| 1 | More rebuild: menu, News, Settings (App Style), Feedback, About Suite | `2fdc6f2`, with `9952362`, `835c2c3`, `1a97dee` (news capture) | David, 2026-09-24 | **Closed 2026-09-25.** Reviewed by ChatGPT at `70613f7`; corrections 1.1-1.6 in `2d85869` (CI green) accepted by David ("good to go") |

## Review of 2026-09-25 (ChatGPT, at `70613f7`)

| # | Decision | Recorded qualification |
|---|---|---|
| 1 | Corrections required | Screen structure and most design calls accepted (routes, menu, News list, Settings groups, native App Style radios, mailto Feedback, About's product card and source lists). Six corrections, below; the entry stays open until they are re-reviewed. |
| 2 | Accepted as provisional - leaves this list | The ink/cobalt/champagne palette is the reviewed *interim* palette, not the brand specification. The independence statement is accepted as product copy, not a legal assessment or a determination of asset/data permissions. David's confirmed copy stands. |
| 3 | Accepted - leaves this list | Accepted at the completed head (`57e0358` alone was broken; `e800299` completes it). The 38/41 pixel comparison was Claude's evidence, not independently regenerated. "View full field" is still required. |
| R | Roster recovery fix `0f6008a` accepted | Rerun of `rosterflowcheck` passed all six scenarios, including the real service worker. The worker's stored-time stamp (`main` `69f53cf`) accepted. No further Roster correction. |

### Corrections to item 1, and where they stand

| # | Finding (reproduced) | Correction | Status |
|---|---|---|---|
| 1.1 | News: one source's success suppressed the other's retry; a half-failed refresh dropped 89 stories to 60; no warning after failures | Each source keeps its own last-good stories, network time, cache/failure state and in-flight request; one merged Home/News list; independent retry on re-entry and reconnect; retained stories called old | Done |
| 1.2 | Refresh Data said "Data refreshed" when everything failed, finished before requests settled, lost focus, counted unparseable JSON | Awaits every step, including ones it joins; reports refreshed / partly refreshed / couldn't refresh; busy until settled; freshness only after a usable answer; focus back on the button | Done |
| 1.3 | Settings stayed "Not yet" and missed going offline; News missed going offline, while open | The open More screen repaints on data and on both connection events, without starting new requests | Done |
| 1.4 | Feedback said "Version: unknown" until About was visited; a direct entry claimed Home | Version asked for as soon as a worker controls the page; a direct entry says so | Done |
| 1.5 | News headlines cramped at 320 (seven lines) | 72px thumbnail and tighter gap at <=24rem; headline ~170px | Done |
| 1.6 | Settings icon read as a sun | A cog: eight square teeth round a hub | Done |

All six accepted by David, 2026-09-25, on the re-review package for `2d85869`.
Item 1 is closed. Item 4 (release hardening) was added after the review closed and waits for the next ChatGPT review.

`tools/moreflowcheck.js` (in CI) covers 1.1-1.4: 22 failures on `70613f7`,
none after the corrections.

### Product clarifications (not bugs)

- **Refresh Data scope** - this team's shared data (status, schedule, news,
  Season Outlook markets) and the data of screens already loaded this visit
  (scoreboard, polls, roster), joining requests already out; never unopened
  games or another team's. ChatGPT's recommendation, adopted 2026-09-25;
  David may change it.
- **Feedback's origin** - the last destination the fan was on, News,
  Settings, About and Schedule included, never the More menu or Feedback
  itself; a direct entry says "opened Feedback directly". ChatGPT's
  recommendation, adopted 2026-09-25; David may change it.

## 1. More rebuild (`2fdc6f2`)

**What it is.** Reference 10's More screen and the four destinations it owns,
following decisions 0022 (#9, #12, #13), 0024 (§17, §18), 0026 and 0028.

**Engineering calls to review**

- **Routes.** `#news`, `#settings`, `#feedback`, `#about` are their own screens
  with `owner: "more"` (decision 0028), not views of `#more`. The older
  `#more/news` is corrected in place; Home's "View All" now opens `#news`.
- **News layout.** No reference exists. A single card of rows: a 4:3
  thumbnail (or the outlet's name on the header colours when a story has no
  image), editorial-serif headline, "time · outlet" and the external cue.
  The first 20 stories show; "Show N more stories" reveals the rest and moves
  focus to the first revealed. One page-level freshness warning (0024 §13)
  from ESPN news (required) and the beat feed (optional).
- **One news store.** Home's preview and News read the same list. The beat
  feed now has its own freshness key (`beatNews`), so it no longer
  overwrites ESPN's. A worker's cached copy stays due for a retry, the rule
  from the Roster fix.
- **Settings layout.** Three headed groups in cards. Team: Current Team with
  the mark, then Change Team as a row with a chevron into the chooser's
  change mode (0022 #7). Appearance: App Style as native radios in bordered
  option cards, each with a one-line helper. Data: Last Updated (the newest
  network answer; "Offline · <time>" offline; "Refreshing…" during) and a
  secondary "Refresh Data" button with a note that data refreshes on its own.
- **App Style mechanics (0026).** Stored as `suite-style`, outside every team's
  keys. Suite Style swaps only the stylesheet's colour and type tokens; the
  team's name, mark, tagline and photography stay. First paint follows the
  choice (a Suite boot set under `iw-boot:suite`). Switching is live, with no
  reload, and announced.
- **Feedback.** A card with one primary "Email Feedback" mailto to
  suiteappfeedback@gmail.com. The subject names the team; the body carries
  Team, the screen the fan came from (the last non-More screen) and the
  version. It says the mail app sends, and shows the address for fans with
  no mail app. No sent state (0022 #12).
- **About Suite.** A product card (name, one-line description, version when the
  service worker reports it), then Data Sources from `TeamOS.sources.list` - new, pure,
  config-driven: ESPN, the official site where depth/availability snapshots
  exist, beat outlets where the team declares feeds and their snapshot,
  Kalshi, Open-Meteo. Each links out with the external cue.
- **Legacy region.** Never shown now; its dead code is on the completion list
  for one-pass removal.
- **Menu icons.** Drawn in the nav icons' line style (newspaper, calendar,
  gear, speech bubble, info) - not taken from the reference image.

**Evidence.** `tools/suitecheck.js` (More section) and `tools/visualcheck.js`
(every screen, both teams, 320/375/390/1280; More selected; Suite Style across
a reload; Change Team via Settings; no "Project LND"). Review captures were
sent in chat as `more-review.zip`; CI's `suite-visual-smoke` artifact for
`2fdc6f2` has the gate's own renders.

## 2. More corrections (`b566122`) - closed 2026-09-25, accepted as provisional

**What it is.** David's answers to the three open items from step 1.

**Engineering calls to review**

- **Suite Style palette (provisional).** From David's direction, "blue-led:
  ink for the foundation, cobalt for actions, and champagne or bronze used
  sparingly". Mapped onto the colour roles every team supplies: ink surfaces
  (`#0F1C33` scale), cobalt fill `#2F5BEA` with white on it, cobalt
  `#2A52D6` for text and icons on light, champagne `#E4CF9E` only as accent
  text on the ink header (the nickname, rank and series labels). The same
  contrast checks as a team. Design's final tokens replace these values in
  `suite/ui.js`.
- **Independent App statement (About Suite).** Written from the pattern
  independent sports apps use (Superfan, Sports Alerts, Live Scores & Odds,
  Action Network, an NFL stats app): not affiliated with, endorsed by or
  sponsored by the NCAA, conferences, schools, teams or the listed data
  sources; marks belong to their owners and identify the teams only; data
  may be delayed or incomplete; for information and entertainment; and,
  only where the team shows Kalshi markets, prices are not betting advice.
  Not legal review.
- **Copy.** App Style helper lines, the Feedback explanation and About's
  description stand as written (David, 2026-09-24).

**Evidence.** `tools/suitecheck.js` (palette passes `TeamOS.identity`; the
statement and its conditional betting line), the visual gate's contrast
pass under Suite Style. Captures sent in chat as `more-review-2.zip`.

## 3. Legacy code removal - closed 2026-09-25, accepted

**What it is.** The completion list's "remove the legacy panel code", done
once More made every screen canonical. Engineering only: 38 of the 41 visual
gate screenshots at 390px are pixel-identical before and after, and the other
three differ only in clock text ("8 hours ago" / "9 hours ago", Last Updated).

**Removed.** The pre-canonical Game panel (`loadGame`, `renderGame`,
`patchGame` and their helpers), the old hero and header mini-hero with their
countdown and weather painter, the odds strip's and odds board's drawing, the
offline footer, the dead `#rank` / `#rec` writes, the legacy markup and
`legacy.css` (776 lines of app.js, 355 of CSS).

**Kept, because live screens use it.** The Kalshi fetch and price helpers
(`loadStrip` now only fills `HOME.markets` for Home's Season Outlook), the
season statistics behind the pregame Matchup card, the live loop.

**Tests moved, not dropped.** `tools/livecheck.js` (every score surface
agrees on one live state, with its negative control) now drives Home's hero,
the Schedule row and the Top 25 row; `tools/matchupcheck.js` drives the
canonical Matchup card with the same real season statistics;
`tools/adaptercheck.js` checks the Season Outlook's data path and that
app.js reaches no pre-canonical element. eslint reports no undefined name.

**For the reviewer.** Mostly a sanity check that nothing a fan sees was
lost: the Season Outlook "View full field" board is gone with the old odds
board and is still on the completion list to be built in the Suite design.
