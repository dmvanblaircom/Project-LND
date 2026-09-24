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
| 1 | More rebuild: menu, News, Settings (App Style), Feedback, About Suite | `2fdc6f2`, with `9952362`, `835c2c3`, `1a97dee` (news capture) | David, 2026-09-24 | **No ChatGPT review** |
| 2 | More corrections: provisional Suite Style palette, Independent App statement, copy confirmed | `b566122` | David, 2026-09-24 | **No ChatGPT review** |

For context, not part of David's no-review approval: ChatGPT asked for the
Roster service-worker recovery fix (`0f6008a`) and David accepted it once CI
passed; ChatGPT has not seen the fix itself. It also carried an
engineering-only change to `main` (`69f53cf`, the worker stamps its kept
copies, so offline times are real). The review prompt includes both as
"verify the fix you asked for".

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

## 2. More corrections (`b566122`)

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
