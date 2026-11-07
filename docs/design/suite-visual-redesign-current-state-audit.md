# Suite visual redesign: current-state audit

**Phase 1 discovery, decision 0040.** Engineering assessment by Claude Code, 2026-11-06.
**Status:** facts and options for the Creative Director (ChatGPT) and David. **Nothing in this
document is a design decision**, and no production CSS or JavaScript changed to produce it.

- Audited: `main` at `ba7fb63b`, which includes #232 (Around's conference and games-that-matter
  layers).
- Read with: the draft decision-0040 PR #233 (branch `design/suite-creative-direction-v1`, 4
  commits on base `5c78e001`). That branch is 4 commits behind `main`: #232 and data refreshes.
  None of those touch its four documentation files, and it merges cleanly
  (`git merge-tree`). Its links (`docs/decisions/0040-…`, `docs/product/suite-visual-redesign.md`)
  resolve once #233 merges.

Contents:
1. [How this was done](#1-how-this-was-done)
2. [The system as built](#2-the-system-as-built)
3. [Screen inventory](#3-screen-inventory)
4. [Destination findings](#4-destination-findings) (Home, Game, Around, Players, News, Schedule, More, Settings and the supporting screens)
5. [What fans see versus what the source says](#5-what-fans-see-versus-what-the-source-says)
6. [Engineering feasibility](#6-engineering-feasibility)
7. [Prioritized opportunities](#7-prioritized-opportunities)
8. [Defects found during the audit](#8-defects-found-during-the-audit)
9. [Questions for the Creative Director and David](#9-questions-for-the-creative-director-and-david)

---

## 1. How this was done

**Source.** Every Suite module (`suite/*.js`, about 3,400 lines), the stylesheet (`app.css`, 1,617
lines), the shell (`index.html`), the controller paths that build each screen's model (`app.js`),
the TeamOS modules those models come from, the team configs, and the service worker. The
decisions in the brief (0022, 0024, 0026, 0031, 0035, 0038, 0039), the as-built map
(`docs/engineering/current-architecture.md`), and the earlier design records in `docs/design/`:
- the Oct 3 Home/Game, Stats and navigation reviews;
- the Oct 5 type rollout;
- the offseason UI contract;
- the Sep 28 visual audit.

**Rendering.** The real app, served from this checkout, in Chromium (Playwright). Provider
requests were answered from the repository's own fixtures, with the clock pinned to the moment
each state describes.

**Notre Dame vs Michigan State, Sep 19.** The repository's own state builder
(`tools/qa/game_states.py`) produced pregame, live (3rd quarter, 2:43, ND 17-10, 1st & 10 at the
MSU 20) and final (27-10), all from ESPN's captured payloads.

**Ohio State vs Illinois, Sep 26.**
- Live: ESPN's captured live summary (3rd quarter, 9:35, 28-13).
- Final: the captured final (42-19).
- Pregame: derived from the final with the scores, plays and box score removed. Audit-only.

**Offseason (S4), January.** ND's and OSU's 2025 seasons and ESPN's final-poll feed, as
`tools/offseasonnavcheck.js` uses them.

**Destinations** (Around, Roster, News, Schedule, Stats, More, Settings and the rest) were rendered
in the pregame moment.

**Coverage.**
- Phone: 390×844 at 2× density.
- Desktop: 1280 wide.
- Both appearance modes: Team Style and Suite Style.

**Evidence.**
- Screenshots: [`audit/2026-11-06/`](audit/2026-11-06/), rendered on a GitHub runner so ESPN-hosted
  team marks, headshots and story images load as fans see them.
- Files named `sandbox-*` are the same screens rendered where those hosts were unreachable. They
  are the fallback states a fan sees offline or on a blocked network; §5 compares the two.
- The capture scripts and the full set (about 300 images) are on the temporary branch
  `audit-capture`, for deletion after review.

**What the renders are not.**
- The captures are fixture data, not this week's results.
- Weather was not answered, so it is omitted, as it is for a fan whose forecast fails.
- Market numbers and news are the repository's current snapshots shown under a September clock,
  so news reads "Just now" and Season Outlook shows November's prices.
- Ohio State's pregame Matchup shows the same figures for both teams. That is the fixture (one
  season-stats capture answers for Illinois), not the app.
- On the runner, Ohio State's Nunito Sans showed letter gaps ("MAT CHUP", "MINUT ES"). The same
  page rendered locally does not. Treat it as a runner font-rendering difference, to be checked
  on a device, not a known defect.
- None of this is a physical iPhone or Safari pass (decision 0040 rule 8).

---

## 2. The system as built

### Layers (unchanged by a visual redesign)

```
provider → teamos/espn.js etc. (adapters) → teamos/*.js (rules) → app.js (fetch, cache, timers, models)
        → suite/*.js (draw from a model; no fetch, no provider fields, no team names) → the fan
```

Every Suite renderer takes a **model** and returns markup. The model contracts are written at the
top of each file, for example `suite/home.js:12-30` and `suite/game.js:14-34`. A redesign that
keeps these contracts changes `app.css` and the markup in `suite/*.js`, and nothing in TeamOS.

### Identity: what a team supplies (`teams/<id>.js` → `teamos/identity.js`)

| Piece | Today | Notes |
|---|---|---|
| Colours | 12 tokens per team: `accent`, `accentText`, `accentOnLight`, `accentInk`, `accentSoft`, `accentTint`, `accentTintSoft`, `focus`, `surface`, `surfaceDeep`, `surfaceAbyss`, `surfaceRaise` | Checked for contrast at startup (`teamos/identity.js`): a team that fails throws. Applied as `--t-*` custom properties (`app.css:77-86`). |
| Type | `fonts.ui`, `fonts.display` | 26 self-hosted families in `assets/fonts/` (3.7 MB on disk; a team downloads only its own). **70 of 138 teams use Suite's Instrument Display; 68 declare another display face**, the commonest being Montserrat 14, Inter 11, Libre Franklin 7 and Oswald 5. Ohio State uses Nunito Sans for both. |
| Mark | ESPN-hosted logo by team id (`TeamOS.espn.mark`, `teamos/espn.js:1398`), light or dark variant | Provider-hosted, not ours. Falls back to initials (`suite/ui.js` `mark()`). Logos are cached by the service worker (`sw.js:360-382`, `LOGO_MAX`). |
| Hero art | `identity.art = { src, position }`, validated (`teamos/identity.js:136-168`), drawn by `ui.art()` (`suite/ui.js:49`) | **No team declares art.** Every hero is the fallback composition (decision 0024 §10). |
| Labels | `programLabel`, team name, nickname | The nickname shows only in Home's hero (0031). |
| Series | trophy, rivalry and event names by opponent | Surfaces as gold text (`gc-series`), a trophy card on Game Details, and Around's "why" lines. |

**Appearance modes** (decision 0026). Team Style applies the team's tokens; Suite Style applies
`Suite.ui.STYLE` through the same path (`applyStyle()` in `app.js`). Both are the same layout:
today a style is colour and type only. Suite Style's palette is still marked provisional in 0026.

### Tokens (`app.css:24-86`)

- **Suite neutrals:**
  - page `--s-page #F1F2F0`;
  - surface `#FFF`;
  - ink `#111D35`;
  - muted `#485563`;
  - lines;
  - bronze and champagne.
- **States:** live `#C8102E`, win `#177245`, loss `#B42318`.
- **Radii:** card 14px, control 10px, pill.
- **Shadows:** two, `--s-shadow-card` and `--s-shadow-raise`.
- **Layout:**
  - one content column, `--s-content-max: 40rem` (640px);
  - bar height 3.5rem;
  - nav height 4.1rem.
- **Missing token families:**
  - **No spacing scale.** Spacing is literal rems throughout.
  - **No type scale.** Sizes are literal per rule.
  - **No motion tokens.**
  - **No elevation scale** beyond the two shadows.
  - **Only one dark-surface treatment** (team surfaces).

### Typography in use

Four voices meet on most screens:
1. **Display.** Instrument Display, 80%-width condensed, used for titles, card heads (uppercase
   with a 4px accent bar), scores and tabs. Ohio State's display is Nunito Sans, which is not
   condensed.
2. **UI.** Instrument Sans for body and metadata.
3. **Editorial.** Georgia, for section headings ("Latest News", "Schedule", "Team",
   "Appearance") and headlines (`--s-font-editorial`, kept by David's Oct 4 correction "until
   another editorial face is chosen").
4. **Uppercase tracked display** for the hero eyebrow and labels.

Figures use tabular numerals in 23 rules.

### Motion in use (all in `app.css` and `index.html`, all respecting `prefers-reduced-motion`)

| Motion | Where | Spec |
|---|---|---|
| Launch | `index.html:291-327` | letters rise 8px, staggered 90ms; bronze rule draws; fades out at 0.35s; a short form for returning fans |
| Page swap on update | `index.html` `@view-transition{navigation:auto}` | cross-document view transition |
| View change | `app.css:1436-1440` | 12px slide with a light fade, 180ms (approved Oct 4) |
| Live pulse | `app.css:357-363, 472` | the dot in the LIVE pill and the nav circle, 1.6s scale/opacity |
| Bottom sheet | `app.css:985-999` | Around's game sheet rises 32px, 220ms |
| Pull to refresh | `app.css:1452-1469` | ring follows the pull; spins; turns green on completion |
| Switch | `app.css:1281-1290` | alert toggle |

**What does not exist:**
- No motion responds to a game event: a score, a turnover, possession changing, a quarter ending
  or a game going final.
- Live data repaints in place, every 30 seconds (`AUTO.every`, `app.js:1919`).
- Each Home section is redrawn only when its markup changed (`suite/home.js:31-33`), so a change
  is silent.

### Shared components (`suite/ui.js`, `app.css` §5)

The shared pieces:
- `art()`: the hero art slot;
- `mark()`: logo or initials, with the measured `fitMark` and `lift` hairline for logos lost on
  their surface;
- `freshBanner()`;
- `kickoff()`;
- `ago()`;
- `fitNames()`, `fitText()` and `fitLabels()`: measured text fitting that falls back to
  abbreviations;
- `newsImage()`: photo, then publisher logo, then source-name tile;
- `ball()`: the possession football;
- `playTags()`.

CSS families:
- `.card`, `.gcard` with `.gcard-head`/`.gcard-title`;
- `.seg-light`, `.seg-dark` and `.seg-mini` segmented controls;
- `.game-tabs` and the shared view strip;
- `.btn-primary`;
- `.live-pill` and `.state-pill`;
- `.mark`;
- `.chev` and `.ext`.

There is no component catalogue. Each Suite file builds its own rows (schedule rows, game rows,
roster rows, stat rows) with its own class prefix.

---

## 3. Screen inventory

Routes are hash routes (`suite/nav.js:53-86`). The bottom nav is Home · Around · Game · Roster ·
More in season. Out of season it is Home · Around · Schedule · Roster · More (`setSeasonNav`;
Game returns 14 days before a confirmed opener). Settings is the header gear (0034).

| Destination | Route / views | Lifecycle and states | Renderer | Model built in | Normalized data consumed |
|---|---|---|---|---|---|
| Launch | (none) | first open; short form for returning fans; reduced motion | `index.html` | inline boot | none |
| Chooser | `/`, `?change` | no team; contextual from Settings (Back); search; Your Teams stars; Coming Soon 12 then all | `chooser.js` | itself | `teams/index.js` registry |
| **Home** | `#home` | pregame (`upcoming`), live, paused (delayed or suspended), postponed, canceled, recent final (through the next local day, 0022 #10), no games; offseason S2 "regular season complete", S4 "season complete", S5 next season published (see §8) | `suite/home.js`, `suite/offseason.js`, `suite/prospects.js` | `paintHome()` `app.js:1510` | `TeamOS.game.hero`, `Game`, `TeamOS.game.schedulePreview`, `NewsItem[]`, `TeamOS.outlook.metrics`, `TeamOS.milestones.wins`, `TeamOS.champions.defending`, `TeamOS.notes.forGame`, `TeamOS.freshness.summary`, `TeamOS.season.offseason`, `TeamOS.prospects` |
| **Game** | `#game`; pregame Game Details (no strip); live `drive`, `box`, `plays`, `stats`; final `box`, `plays`, `stats` | the same exceptional states as Home; route correction on lifecycle change (0024 §15) | `suite/game.js` | `paintGame()` `app.js:1678` | `Game`, `GameDetail` (teams, linescore, drives, lastPlay, situation, box, leaders, team stats), season `SeasonStat[]` for Matchup, `Weather`, `TeamOS.notes` |
| Game from Schedule | `#schedule/<id>` | any game, past or future, in the Game layout | `suite/game.js` | the same, with `base` | the same |
| **Around** | `#top25/games`, `#top25/rankings` | in season: Season Outlook, our conference, games that matter (with a reason), Top 25; offseason: the same tab; the game sheet on every row | `suite/top25.js` | `paintTop25()` | `LeagueGame[]` (scoreboard), `Poll[]` (CFP, AP, Coaches), FPI and SP+ ratings, `TeamOS.around.layers`, `LeagueGameDetail` for the sheet (linescore, field, win probability, plays, leaders) |
| Season Outlook | `#outlook/playoff`, `#outlook/title` | each market independent (0024 §12) | `suite/outlook.js` | `app.js` | Kalshi snapshots (`data/<team>/odds*.json`) via `TeamOS.outlook` |
| **Players** (Roster) | `#roster/depth`, `roster`, `availability`, `prospects` (views follow what the team has, `teamos/roster.js:31-44`) | depth chart units; no depth chart (OSU); availability report, none published, nobody listed; link-only conferences | `suite/roster.js`, `suite/prospects.js` | `paintRoster()` | `RosterGroup[]`, depth slots with history and movement, availability, recruits and draft board |
| Players (Stats) | `#stats/team`, `#stats/players` | season to date | `suite/stats.js` | `app.js` | ESPN core team stats with national ranks, season leaders |
| **News** | `#news` | loading; photo, logo or tile; show more | `suite/more.js` `news()` | `app.js` | `NewsItem[]` (ESPN plus beat feeds, `data/<team>/news.json`) |
| **Schedule** | `#schedule/schedule`, `#schedule/results` | postseason section; exceptional games (0022 #8) | `suite/schedule.js` | `app.js` | `Game[]` |
| **More** | `#more` | in season and offseason menus | `suite/more.js` `menu()` | `app.js` | none |
| **Settings** | `#settings` | Team (current, change), Appearance (App Style), Game Alerts (Web Push), Data (last updated, Refresh) | `suite/more.js` `settings()` | `app.js` | preferences, freshness |
| Feedback, About | `#feedback`, `#about` | mailto (0022 #12) | `suite/more.js` | none | none |

Shell-wide states:
- the freshness or offline banner (`ui.freshBanner`, one per page, 0024 §13);
- the live, paused and calm Game nav (0024 §1, §14);
- pull to refresh;
- swipe between a screen's views;
- the update reload (view transition).

---

## 4. Destination findings

Format per destination:
- what exists;
- what works;
- what is visually effective;
- what reads generic, dated or flat;
- what presentation alone could change;
- what needs new interaction logic;
- what needs new data.

"Presentation alone" means CSS and the markup in `suite/*.js`, with the model unchanged.

### Home

Evidence:
- Notre Dame:
  - pregame [phone](audit/2026-11-06/nd-pre-team-390-home-top.jpg) · [full](audit/2026-11-06/nd-pre-team-390-home-full.jpg) · [desktop](audit/2026-11-06/nd-pre-team-1280-home-top.jpg);
  - live [phone](audit/2026-11-06/nd-live-team-390-home-full.jpg);
  - final [phone](audit/2026-11-06/nd-final-team-390-home-top.jpg) · [desktop](audit/2026-11-06/nd-final-team-1280-home-top.jpg).
- Ohio State:
  - pregame [phone](audit/2026-11-06/osu-pre-team-390-home-top.jpg);
  - live [phone](audit/2026-11-06/osu-live-team-390-home-top.jpg) · [desktop](audit/2026-11-06/osu-live-team-1280-home-top.jpg);
  - final [phone](audit/2026-11-06/osu-final-team-390-home-top.jpg).
- Suite Style: [ND pregame](audit/2026-11-06/nd-pre-suite-390-home-top.jpg) · [ND live](audit/2026-11-06/nd-live-suite-390-home-top.jpg) · [OSU pregame](audit/2026-11-06/osu-pre-suite-390-home-top.jpg) · [OSU live](audit/2026-11-06/osu-live-suite-390-home-top.jpg) · [OSU final](audit/2026-11-06/osu-final-suite-390-home-top.jpg).
- Offseason: [ND S4](audit/2026-11-06/nd-off-team-390-home-top.jpg) · [ND S4 Suite Style](audit/2026-11-06/nd-off-suite-390-home-top.jpg) · [OSU S4](audit/2026-11-06/osu-off-team-390-home-top.jpg) · [ND desktop](audit/2026-11-06/nd-off-team-1280-home-top.jpg).

**Exists and works.**
- One hero per moment, chosen by TeamOS.
- An explicit hierarchy (0024 §2):
  - primary: matchup, state, score, time;
  - secondary: period, clock, possession, down and distance, the CTA;
  - tertiary: weather, line.
  - Tertiary items drop first under 360px.
- The live card: LIVE pill, network, both scores, period and clock, possession football, a down
  and distance pill.
- Below the hero, in order:
  - trophy name and line;
  - the milestone card (the 1,000th win);
  - the champion banner;
  - "By the Numbers" from the week's game notes;
  - Latest News (3, as a rail);
  - Schedule (the last result and the next three);
  - Season Outlook as one line.
- Offseason S2 and S4 cards:
  - record;
  - final ranking;
  - last result;
  - next season;
  - in S4, Recruiting and the NFL Draft.
- Freshness banner. Sections are redrawn only when they changed.

**Visually effective.**
- The dark team-coloured hero band with the condensed school and nickname reads as a sports
  product.
- The score numerals in the live and final cards are large and confident.
- The LIVE pill is unambiguous.
- Team Style carries Notre Dame's navy and gold well; the gold CTA is the strongest single
  element on the screen.
- Schedule rows are clear:
  - date block;
  - HOME, AWAY or NEUTRAL as text (0024 §16);
  - result in win or loss colour;
  - trophy line;
  - network pill.

**Generic, dated or flat.**
- **The hero is a card inside a band.** A bordered, translucent `gamecard` sits inside the
  team-colour band. The band's art is a gradient, a fine diagonal grain and a 17%-opacity rotated
  logo watermark (`app.css:370-410`). It is competent, but it is the same composition for all 138
  teams, and nothing changes between a Tuesday and a live Saturday night except the card's
  contents. The day/night atmosphere (0022 #11) is two radial gradients and barely perceptible.
- **The matchup is two logos and "VS".** The marks are about 3–4rem, small beside the score, with
  no sense of two sides meeting. The watermark (the team's own logo at 17% opacity, rotated) is the
  band's main texture. Notre Dame's reads as quiet depth. Ohio State's block-O, red on charcoal,
  is loud enough to compete with the card
  ([OSU](audit/2026-11-06/osu-pre-team-390-home-top.jpg)).
- **Below the hero the page goes flat.** Pearl page, white cards, Georgia section headings: the
  energy stops at the fold.
- **News cards depend on someone else's photo.**
  - With a story photo, the card is the most vivid thing below the fold
    ([phone](audit/2026-11-06/nd-pre-team-390-home-full.jpg)).
  - When the publisher's image fails, the card keeps its photo-shaped layout: a navy tile with the
    source name over a tall, mostly empty white body
    ([sandbox](audit/2026-11-06/sandbox-nd-pre-team-390-home-full.jpg)).
- **Season Outlook's one line looks like a settings row.**
- **Desktop is the phone column centred** (640px max) on an empty pearl field, with a floating
  pill nav ([desktop](audit/2026-11-06/nd-pre-team-1280-home-top.jpg)). Nothing uses the width.
- **Suite Style weakens the primary action.**
  - Its CTA is navy on a navy card ([ND](audit/2026-11-06/nd-pre-suite-390-home-top.jpg),
    [OSU live](audit/2026-11-06/osu-live-suite-390-home-top.jpg)), the lowest-contrast primary
    button in the app.
  - For Notre Dame, Suite Style and Team Style are nearly the same picture (both navy). The mode
    is mostly a gold-to-champagne swap.
- **Ohio State's Team Style** sets everything, scores included, in Nunito Sans. That is rounder
  and wider than the condensed display, so the hero reads softer and less athletic than Notre
  Dame's ([OSU](audit/2026-11-06/osu-pre-team-390-home-top.jpg) vs
  [ND](audit/2026-11-06/nd-pre-team-390-home-top.jpg)). The same will be true of the 68 teams
  with other display faces.
- **Offseason S4** ([ND](audit/2026-11-06/nd-off-team-390-home-top.jpg)) is a list of figures on
  the band. It is clear, but it is the least emotional screen in the app at the moment a season
  ends.

**Presentation alone could:**
- recompose the hero as the screen itself rather than a card in a band: full-bleed art, larger
  marks facing each other, the score as the dominant object;
- give each lifecycle state its own composition from the fields it already has (pregame
  countdown, live situation, final result);
- carry the hero's energy below the fold (section headers, schedule rows, the Outlook line);
- give the no-photo news card a designed state;
- give desktop a layout of its own (two columns at ≥ 1024px: hero and live, then news and
  schedule);
- strengthen Suite Style's primary action;
- adopt a numeric face for scores across all teams (a design choice, §9).

**Needs new interaction logic:**
- animating a change (score, possession, state) needs the renderer to know the previous value.
  Today it only knows the current model; see §6.4.
- A countdown that ticks on Home (Game Details has days, hours and minutes; Home shows the date
  only).

**Needs new data or backend:**
- Hero photography (none approved; licensing, §6.1).
- Nothing else on Home needs a new source.

### Game

Evidence:
- Notre Dame:
  - pregame [phone](audit/2026-11-06/nd-pre-team-390-game-details-full.jpg) · [desktop](audit/2026-11-06/nd-pre-team-1280-game-details-top.jpg);
  - live Drive Tracker [phone](audit/2026-11-06/nd-live-team-390-game-drive-full.jpg) · [desktop](audit/2026-11-06/nd-live-team-1280-game-drive-top.jpg);
  - live Box Score [phone](audit/2026-11-06/nd-live-team-390-game-box-full.jpg), Plays [phone](audit/2026-11-06/nd-live-team-390-game-plays-top.jpg), Stats [phone](audit/2026-11-06/nd-live-team-390-game-stats-full.jpg);
  - final Box Score [phone](audit/2026-11-06/nd-final-team-390-game-box-full.jpg), Plays [phone](audit/2026-11-06/nd-final-team-390-game-plays-top.jpg).
- Ohio State:
  - pregame [phone](audit/2026-11-06/osu-pre-team-390-game-details-full.jpg);
  - live Drive Tracker [phone](audit/2026-11-06/osu-live-team-390-game-drive-top.jpg) · [Suite Style](audit/2026-11-06/osu-live-suite-390-game-drive-top.jpg), Box Score [phone](audit/2026-11-06/osu-live-team-390-game-box-top.jpg);
  - final Box Score [phone](audit/2026-11-06/osu-final-team-390-game-box-top.jpg).

**Exists and works.**
- Lifecycle views per 0022 #6 and 0024 §7, with route correction (0024 §15).
- The hero:
  - team always on the left;
  - marks, scores, records and ranks;
  - LIVE pill, period and clock, down and distance;
  - the line.
- Pregame Game Details:
  - countdown (days, hours, minutes);
  - venue;
  - network;
  - trophy;
  - weather (when it loads);
  - Matchup: season averages, nine metrics with national ranks and an edge marker (`tools/matchupcheck.js`);
  - Leaders with a team toggle;
  - the trophy card;
  - By the Numbers;
  - the game notes link.
- Live:
  - Drive Tracker: an SVG field with the drive's plays, line of scrimmage and first-down marker, in
    the possessing team's colour;
  - Last Play with tags;
  - Score by Quarter;
  - Game Stats bars;
  - Box Score: categories collapse, never truncate, and the fan's choices survive refresh;
  - Plays: scoring drives, expandable;
  - Stats.
- Final:
  - Box Score by default;
  - the loser's score softened.

**Visually effective.**
- The Drive Tracker field is the most "broadcast" element in the app: green turf, yard numbers,
  end zones in team colours.
- The Matchup grid's highlighted edges.
- Game Stats' paired bars.
- Scoring-drive rows with the running score.
- Box Score tables are dense but legible, with tabular figures.

**Generic, dated or flat.**
- The hero is a scaled-down Home card. At 390px the LIVE pill, clock and down-and-distance sit
  directly on the watermark. Ohio State's large block-O runs behind the score and clock
  ([OSU](audit/2026-11-06/osu-live-team-390-game-drive-top.jpg)). Without a logo, the watermark is
  outlined initials crossing the same elements
  ([sandbox](audit/2026-11-06/sandbox-osu-live-team-390-game-drive-top.jpg)).
- The final hero is "FINAL" in tracked display between two numbers, with no sense of result
  (win, loss, the margin, what it means).
- Every view below the hero is the same white card with an uppercase head and accent bar,
  stacked. Live, pregame and final have the same rhythm and surface; only the contents change.
- The view strip at 390px: four `flex:1` tabs with `nowrap` (`app.css:711-714`). "Drive Tracker"
  is wider than its quarter, and its first letter sits about 5px from the screen edge
  ([OSU](audit/2026-11-06/osu-live-team-390-game-drive-top.jpg),
  [ND](audit/2026-11-06/nd-live-team-390-game-plays-top.jpg)).
- "Full Schedule ›" sits alone between the tabs and the first card on every view. It is a
  navigation link in the space where the live state should lead.
- Pregame Game Details at 1280 is a single 640px column.
- The possession football is a 14px brown glyph beside the score: easy to miss.

**Presentation alone could:**
- recompose the Game hero as a scoreboard with real hierarchy, and an end-of-game composition for
  final;
- give live a darker, broadcast surface distinct from pregame and final, from the same tokens;
- enlarge the Drive Tracker and make it the live view's lead;
- fix the tab strip (scroll, measured widths, or shorter labels: a design call);
- move "Full Schedule";
- make possession and down-and-distance a single situation bar;
- give desktop a two-column Game (hero and field, then box and plays).

**Needs new interaction logic:**
- **Game-event moments** (touchdown, field goal, turnover, final): a renderer-side diff of the
  previous and current `GameDetail` (§6.4).
- **A drive that animates play by play:** a known play list per refresh; the tracker today redraws
  whole.
- A clock that counts between refreshes is **not** recommended: ESPN's clock is a polled value,
  and an interpolated clock would be invented state.

**Needs new data:**
- **A win-probability line on the team's Game screen.** ESPN's summary carries the series, but
  `GameDetail` keeps only the last value (`teamos/espn.js:990-991`), and only Around's sheet shows
  it (`suite/top25.js:415`). Keeping the series is a TeamOS normalization change (no new source),
  which decision 0040 rule 7 reserves for David.
- Live player box scores do exist live from ESPN; the QA fixture drops them, and real live games
  have them.

### Around

Evidence:
- Notre Dame:
  - Games [phone](audit/2026-11-06/nd-pre-team-390-around-games-full.jpg) · [desktop](audit/2026-11-06/nd-pre-team-1280-around-games-top.jpg);
  - Rankings [phone](audit/2026-11-06/nd-pre-team-390-around-rankings-top.jpg);
  - Season Outlook full field [phone](audit/2026-11-06/nd-pre-team-390-outlook-top.jpg);
  - offseason [phone](audit/2026-11-06/nd-off-team-390-around-games-top.jpg).
- Ohio State: Games [phone](audit/2026-11-06/osu-pre-team-390-around-games-top.jpg).

**Exists and works.**
- The Season Outlook card: playoff and title probability, weekly change, bars, Kalshi credit,
  linking the full field.
- Our conference (none for an independent).
- Games that matter, each with a gold reason line: opponent, rival or poll neighbour.
- Top 25, with the team's own game highlighted.
- A game sheet on every row: linescore, field, win probability, situation, plays and leaders,
  refreshed every 30 seconds while open.
- Rankings:
  - CFP, AP, Coaches, FPI and SP+;
  - a week picker over every kept week;
  - trend arrows;
  - the CFP calendar note;
  - the team's row highlighted.

**Visually effective.**
- The Outlook card's large percentages with green deltas.
- Rankings' table with the team row in accent tint and the trend arrows.

**Generic, dated or flat.**
- Games is a very long uniform list (the ND pregame render is about 3,700px tall at 390). Every
  row is the same card: two small marks, names, records and scores, with the reason line in
  small gold type.
- Live games in the list are distinguished only by their status text.
- The three layers are separated by headings alone.
- Desktop is again one column.

**Presentation alone could:**
- distinguish live, upcoming and final rows;
- make "our conference" and "games that matter" visibly different from the national list;
- give the reason line more weight;
- compress final rows;
- lay out desktop as a grid of game tiles.

**Needs new interaction logic:**
- Collapsing or paging a layer.
- Sorting live games first.
- Both are product calls about order (decision 0039 territory), not presentation.

**Needs new data:** none.

### Players (Roster and Stats)

Evidence:
- Notre Dame:
  - Depth Chart [phone](audit/2026-11-06/nd-pre-team-390-roster-depth-top.jpg);
  - Roster [phone](audit/2026-11-06/nd-pre-team-390-roster-list-top.jpg);
  - Availability [phone](audit/2026-11-06/nd-pre-team-390-roster-availability-top.jpg);
  - Prospects [phone](audit/2026-11-06/nd-pre-team-390-roster-prospects-top.jpg);
  - Stats Team [phone](audit/2026-11-06/nd-pre-team-390-stats-team-top.jpg);
  - Stats Players [phone](audit/2026-11-06/nd-pre-team-390-stats-players-top.jpg).
- Ohio State:
  - Roster [phone](audit/2026-11-06/osu-pre-team-390-roster-list-top.jpg) (no depth chart view; decision 0032);
  - Availability [phone](audit/2026-11-06/osu-pre-team-390-roster-availability-top.jpg).

**Exists and works.**
- Depth chart:
  - units with a sticky Offense, Defense and Special Teams control;
  - OR designations;
  - third team;
  - movement arrows;
  - the week's history.
- Roster:
  - unit filter and search;
  - headshots with an initials fallback;
  - hometown, size and class;
  - a pronunciation guide (`SAY`);
  - honors as a disclosure.
- Availability:
  - the official report, with its date;
  - the "nobody listed" and "not yet published" states (0019, 0022 #3);
  - link-only conferences.
- Prospects: the recruiting class (ESPN grades and stars, credited) and the draft board.
- Stats:
  - the team's season with national ranks;
  - players by category in scrollable tables.

**Visually effective.**
- The depth chart's position cards with slot, number, headshot and bio are clear and scale to a
  long chart.
- Prospects' large grade numerals.

**Generic, dated or flat.**
- These are utility lists:
  - small circular headshots, initials where ESPN has none
    ([sandbox](audit/2026-11-06/sandbox-nd-pre-team-390-roster-list-top.jpg));
  - the same card per position;
  - the position named twice ("Wide Receiver 1 · WR 1").
- The page title "ROSTER" plus a "Season stats ›" link plus a four-tab strip take about 210px
  before any player at 390px.
- "Prospects" crowds the right edge of the strip (the same `flex:1` tabs as Game).
- Stats tables are spreadsheet-plain; "Scroll for more stats" is the only cue the passing table
  scrolls.

**Presentation alone could:**
- give the starters a stronger treatment than the backups;
- remove the duplicated position label;
- compact the header stack;
- make headshots larger where present;
- give the Stats tables a leader treatment (the leader row emphasised).

**Needs new interaction logic:**
- A player card or sheet: tap a player to see their season line.
- The stats exist (`Stats › Players`), but no per-player view joins them to the roster today.

**Needs new data:**
- Action photography of players: none is licensed.
- Official headshots beyond ESPN's: decision 0029 chose ESPN's.

### News

Evidence:
- Notre Dame [phone](audit/2026-11-06/nd-pre-team-390-news-full.jpg) · [desktop](audit/2026-11-06/nd-pre-team-1280-news-top.jpg).
- Ohio State [phone](audit/2026-11-06/osu-pre-team-390-news-top.jpg).

**Exists and works.**
- About 90 stories: ESPN plus each team's beat feeds, refreshed every run.
- Photo, then publisher logo, then source-name tile.
- Opens the publisher (0024 §17).
- Show more.
- Home's three-story rail.

**Visually effective.**
- Georgia headlines read as editorial, and the list is dense.

**Generic, dated or flat.**
- Every story has the same weight: a thumbnail and three lines.
- No lead story.
- No grouping by day or by source.
- Where the thumbnail fails, the navy name tile repeats down the page
  ([sandbox](audit/2026-11-06/sandbox-nd-pre-team-390-news-top.jpg)).

**Presentation alone could:**
- add a lead-story treatment for the newest story with a photo;
- add day separators;
- design the no-photo state.

**Needs new interaction logic:**
- Filtering by source.
- "New since you last looked": the app already stores per-team data, so this needs only a stored
  timestamp, not a new source.

**Needs new data:**
- None for the redesign.
- The wire (approved Phase 1, `docs/product/wire-brief.md`) is a separate product item that would
  change this screen.

### Schedule

Evidence:
- ND Schedule [phone](audit/2026-11-06/nd-pre-team-390-schedule-top.jpg) · Results [phone](audit/2026-11-06/nd-pre-team-390-schedule-results-top.jpg).
- ND offseason [phone](audit/2026-11-06/nd-off-team-390-schedule-top.jpg).

**Exists and works.**
- The season with the hero game marked by an accent edge.
- Each row:
  - location as a text badge;
  - opponent mark;
  - venue;
  - trophy;
  - time;
  - network;
  - the line on the next game.
- The postseason section.
- Exceptional games kept in chronology (0022 #8).
- Results only for completed games.
- Every row opens that game in the Game layout (0027).

**Visually effective.**
- The date block.
- The accent edge on the current game.

**Generic, dated or flat.**
- The rows are the Home rows at full length: a long uniform list.
- Results look the same as upcoming games except for the W/L figure.
- There is no season-level summary at the top (record, conference record, streak), though
  TeamOS has the record.

**Presentation alone could:**
- add a season strip (W/L chips, one per game);
- give results and upcoming games different weights;
- use rivalry and trophy games as visual moments.

**Needs new interaction logic:** none required.

**Needs new data:** none.

### More

Evidence: [phone](audit/2026-11-06/nd-pre-team-390-more-top.jpg).

**Exists:** six destinations, each with an icon, title and description: News, Schedule, Stats,
Feedback, Share Suite, About.

**Assessment.**
- A standard settings-style menu. Fine for its job, and the least branded screen.
- Presentation alone could make it a team-coloured index.
- No logic or data is needed.

### Settings

Evidence: ND [phone](audit/2026-11-06/nd-pre-team-390-settings-full.jpg) · OSU [phone](audit/2026-11-06/osu-pre-team-390-settings-top.jpg).

**Exists and works.**
- Team: current and Change Team, with Your Teams (decision 0036).
- Appearance: App Style.
- Game Alerts: Web Push with per-event options.
- Data: last updated and Refresh.

**Assessment.**
- Clear and accessible.
- Uses the Georgia group headings, so it is the screen where the four type voices are most
  obvious.
- App Style is a pair of radio cards with no preview of what each style looks like.
- Presentation alone could add a live preview swatch per style (both style token sets are already
  in the page: `Suite.ui.STYLE` and the team's).
- No data is needed.

### Supporting screens

- **Chooser** ([phone](audit/2026-11-06/chooser-390-top.jpg)):
  - white cards with initials or logos, star and chevron, clear and searchable;
  - generic as a first impression: the first screen a new fan sees has none of the energy the
    brief asks for.
- **Launch:** the wordmark letters rise on Suite navy with a bronze rule. Restrained and quick
  (about 0.8s for returning fans). It is the one place motion already sets a tone.
- **About and Feedback:** functional text screens.

---

## 5. What fans see versus what the source says

| # | Observation | Source | Rendered | Consequence for the redesign |
|---|---|---|---|---|
| 1 | Team marks and headshots are provider-hosted (`a.espncdn.com`) | `TeamOS.espn.mark`, `Player.photo` | With the host reachable, the marks are full-colour logos ([runner](audit/2026-11-06/osu-live-team-390-game-drive-top.jpg)). Where it is unreachable (offline first load, a blocked network), every mark is initials in a grey or navy circle, and the hero watermark becomes outlined initials ([sandbox](audit/2026-11-06/sandbox-osu-live-team-390-game-drive-top.jpg)). The service worker keeps logos after first sight; headshots are not cached. | Two finished states, not one. In both, the watermark runs behind the live pill and clock on Game's hero at 390px. |
| 2 | News thumbnails are publisher-hosted | `NewsItem.image` | On the runner every story had its photo ([runner](audit/2026-11-06/nd-pre-team-390-news-top.jpg)). When a publisher's CDN refuses or times out, the card falls to the source tile, and Home's card keeps its photo height with an empty white body ([sandbox](audit/2026-11-06/sandbox-nd-pre-team-390-home-full.jpg)). | The no-photo news card is a production state, as the hero's no-photo state is (0024 §10). |
| 3 | Team display faces | `identity.fonts.display` | Notre Dame's condensed Instrument Display is the design's athletic voice; Ohio State's Nunito Sans is wide and round. The measured name fitting (`fitNames`) then switches Ohio State's hero to abbreviations ("#7 OSU", "ILL") where Notre Dame's shows names. | A score and headline system tuned on Instrument Display will not survive 68 other display faces unless numerals and display headings are protected (§9 Q2). |
| 4 | Team Style versus Suite Style | 0026 | For navy-and-gold teams the two modes are nearly identical; for Ohio State they differ (charcoal and scarlet against navy and champagne). Suite Style's primary button is navy on navy. | Suite Style needs its own finished palette, which 0026 already says is provisional. |
| 5 | Desktop | `--s-content-max: 40rem` | Every screen is a 640px column on a 1280 canvas with a floating nav. | A desktop layout is a new composition, not a CSS tweak. |
| 6 | Hero art | `identity.art` exists and is validated | No team has art; every hero is the gradient fallback. | Any photography direction starts from zero approved assets (§6.1). |
| 7 | Atmosphere (day/night) | 0022 #11, `app.css:396-406` | Barely visible difference. | The hook exists and is policy-backed; it can carry much more. |

---

## 6. Engineering feasibility

### 6.1 Art and imagery

**What exists:**
- A validated `identity.art` slot with focal position (`object-position`).
- A scrim for text on photos (`.art-slot.has-photo::after`).
- A finished fallback.
- The day/night class on the hero.
- `<img decoding="async">`.
- The service worker would precache team art only if it is listed in the team's files. Today it
  precaches the shell, and team files one team at a time (decision 0015).

**Simplest path to more immersive art, in order of cost:**

1. **Generated, original, team-neutral environment art.** Stadium light, turf texture, crowd
   blur, night sky. One set shared by every team and tinted by team tokens with CSS
   (`mix-blend-mode`, gradients over a greyscale image).
   - No licensing exposure if it is original and contains no marks.
   - About 4–6 images at 2 sizes, AVIF/WebP, roughly 60–150 KB each.
   - Precached with the shell or cached on first use.
   - Scales to 138 teams with no per-team work.
2. **SVG and CSS lighting.** Light beams, field lines, glow and grain over team colours. No
   images at all, cheapest to ship, and fully token-driven. The existing art slot is already this
   at a low intensity.
3. **Per-team licensed photography** via `identity.art`. The code path exists, but the assets
   don't:
   - **Licensing:** no stadium or team photograph may be committed without a clear licence
     (0024 §10, 0040 non-goals).
   - **Marks:** university marks in a photo (helmets, end zones) are trademarks.
   - **Operations:** 138 teams makes this an asset-sourcing programme, not engineering.
   - Treat it as additive on top of 1 or 2, never required.
4. **Provider imagery.** ESPN's story and player images are hotlinked from feeds, not licensed to
   us as art. They must not be cropped into heroes.

**Performance:**
- The first screen today has no large images. A full-bleed hero image is the largest-paint
  element on the most important screen.
- Mitigations:
  - `fetchpriority="high"` on the hero image only;
  - AVIF with a WebP fallback;
  - a phone-sized source under about 120 KB;
  - the gradient painted first so the image fades over it, never a blank box.
- The launch screen hides first paint for about 0.8s, which helps.

### 6.2 Team identity and tokens

**What's there:**
- 12 colour tokens per team, contrast-gated at startup.
- 2 font slots.
- First-paint tokens replayed from storage before the stylesheet (`docs/engineering/first-paint-team-tokens.md`).

**What a richer visual system can derive from these, with no config change:**
- tints, shades and alpha ramps through `color-mix()` (Safari 16.2+);
- gradients;
- glows;
- a darker live surface.

**What would need new config fields (decision 0038 says by declaration):**
- a team's secondary colour as a true second hue (today `accent` plus surfaces);
- a pattern or texture reference;
- a preferred numeric face.

Each field must:
- be optional;
- fall back silently to Suite (0026);
- pass the identity contrast gate;
- live in `teamos/identity.js`.

That is a TeamOS identity-schema change (decision 0040 rule 7: David approves).

**Missing token families the redesign will want first:**
- spacing scale;
- type scale;
- radii and elevation scale;
- motion (durations and easings);
- a live-surface set.

Introducing them is a refactor of `app.css` with no visual change, which can land before any new
look and keeps the later diffs small.

### 6.3 Typography

**What's there:**
- Self-hosted woff2 with `font-display: swap`.
- Variable weights for most families.
- Tabular numerals already used.
- Measured text fitting (`ui.fitNames`, `fitText`, `fitLabels`) that falls back to
  abbreviations rather than truncating.

**Changing the display face for scores and headings:**
- Changing the face for all teams is a CSS change.
- Protecting a Suite numeric face under Team Style (§9 Q2) is a one-token change (`--s-font-score`
  or similar).

**Adding a new family:**
- Adds roughly 30–60 KB per weight subset.
- The service worker precaches the two compressed faces today; a new score face should be too, so
  scores never swap on a live update.

**Retiring Georgia** for headings is an approved-later item (Oct 4 correction): a CSS change.

### 6.4 Motion and live game state

**Data cadence:**
- The team's game and summary refresh every 30 seconds while a game is live (`AUTO`,
  `app.js:1919-2016`), and Around's open sheet likewise.
- Everything else refreshes at 10 minutes while visible.

**The game model** already distinguishes:
- `status` and `hasStarted`;
- period and clock;
- possession;
- down and distance;
- last play with tags (touchdown, turnover and the like, `ui.playTags`);
- scoring plays with running score;
- the drive in progress;
- linescore.

**What is missing is memory.** Each paint gets only the current model, and `Suite.home.paint` and
`Suite.game.paint` replace markup when it changed. To animate a moment, the renderer needs to
compare with what it last drew.

**The smallest correct approach:**
1. A pure function in Suite (or TeamOS if Product wants the same moments in alerts): `moment(prev,
   next)` → `null | { kind: "score" | "turnover" | "possession" | "quarter" | "final" | "start",
   side }`, computed from fields that already exist. Unit-testable like `tools/gamecheck.js`.
2. The renderer keeps the last model per screen (it already keeps the last markup per section) and
   applies a one-shot class (`.m-score`, `.m-final`) to the element that changed. CSS owns the
   animation.
3. **Rules:**
   - Never on first paint, a cached paint or a refresh after the app was hidden. A fan who opens
     the app after a touchdown must not see a "new" touchdown 20 minutes late. Moments fire only
     for a change observed while visible and fresh, within one refresh interval.
   - `prefers-reduced-motion`: the state changes, without movement.
   - An announcement through the existing live region (`#live`) for assistive technology.
4. **Number transitions** (a score rolling from 17 to 24) are CSS on two stacked spans. No library
   is needed.
5. **Lifecycle transitions** (pregame to live to final) already re-route the Game views. A
   cross-fade can use the same-document View Transition API where supported (Chromium; Safari
   18+), with no fallback cost.

**Limits to state plainly:**
- **Moments are up to 30 seconds late.** That is the polling interval, and the free ESPN feed has
  no push. Spectacle should read as "just happened", not "happening now".
- **A sequence is not an event.** If two scores land between refreshes, the diff sees one change.
  Scoring plays carry the list, so the moment can name the latest.
- **Play text cannot say who left a game injured** (David's Nov 2 decision, backlog). No injury
  moments.
- **No haptics on iOS web.** `navigator.vibrate` is unsupported in Safari.

### 6.5 SVG and CSS capability

What the production browsers support (iOS Safari 16.4+ assumed as the floor; confirm with David):
- inline SVG (the Drive Tracker and icons are already SVG);
- CSS masks (already used);
- `color-mix()`;
- `:has()` (already used);
- container queries;
- `backdrop-filter`;
- `@property` for animatable custom properties (Safari 16.4+);
- scroll-driven animations: Chromium, and Safari only from version 26, so treat them as enhancement only.

**Performance risks:**
- **`backdrop-filter` over a scrolling list** is the commonest cause of jank on older iPhones. It
  should be limited to small, fixed elements (the bar, the nav).
- **Animating `box-shadow` or `filter`:** prefer `transform` and `opacity`.
- **Large blurred layers over art:** pre-bake blur into images rather than computing it.

### 6.6 Caching and offline

- **What already holds:**
  - The shell is precached and data is network-first with cached fallback.
  - The fan's data carries over updates.
  - The freshness banner is page-level (0024 §13).
- **New art:** shared art should go in the shell precache (essential: no; the shell already treats
  PNG/SVG as non-essential so a failed image never blocks an install). Per-team art should be
  cached on first use with a cap, like logos.
- **A redesign changes every shell file,** so every PR bumps `VERSION` (`tools/versioncheck.js`).
  Expect one per slice.
- **Checks that will move with the redesign:**
  - `tools/visualcheck.js` (contrast measured on rendered pixels, focus rings, overflow, header
    contract, at 375 and 1280);
  - `tools/homegamecheck.js` (320–1280);
  - `tools/a11yaudit.js`;
  - `tools/flickercheck.js`;
  - `tools/mobilefitcheck.js`;
  - `tools/markfitcheck.js`.

  They encode the accessibility and layout floor. Changing a layout means updating their
  expectations in the same PR, never loosening a contrast or overflow rule.

### 6.7 Rough cost by kind of change

| Kind | Example | Cost |
|---|---|---|
| Tokens and CSS only | type scale, spacing, card and surface treatment, Suite Style palette | low; one PR per screen family; visual checks re-baselined |
| Markup and CSS in `suite/*.js` | recomposed hero, situation bar, news lead story, desktop grid | medium; model contracts unchanged |
| Renderer memory and motion | score and final moments | medium; a new pure function with tests, one shared helper |
| Shared art | generated environment set, tinted by tokens | medium; asset production plus precache |
| TeamOS normalization | win-probability series, optional identity fields | medium; needs David's approval (0040 rule 7) |
| Per-team photography | `identity.art` for 138 teams | high, and mostly not engineering (licensing) |

---

## 7. Prioritized opportunities

Ordered by impact on the brief's target ("I want to use this every Saturday") against cost. Each
item is an opportunity for the Creative Director to accept, change or reject.

### 7.1 Presentation-only (CSS and renderer markup; models unchanged)

1. **Home and Game heroes as the screen, not a card in a band.**
   - Full-bleed, larger facing marks, the score dominant.
   - A distinct composition for each lifecycle state from existing fields.
2. **A protected numeric and display face for scores, clocks, ranks and countdowns,** so every
   team keeps the athletic voice under Team Style (§9 Q2).
3. **Live surface.** A darker, broadcast-style treatment for live Game and Home, from team tokens,
   so live is unmistakable before reading a word.
4. **Situation bar.** Possession, down and distance, and field position as one strong element
   (today a pill and a 14px football).
5. **Final composition.** Result, margin and what it means (record, trophy kept or won), from
   existing fields.
6. **Token foundation.** Type scale, spacing, elevation and motion tokens, a refactor with no
   visible change that makes everything after it cheaper.
7. **Suite Style's own palette** (0026 provisional) and a primary action that holds contrast.
8. **No-photo states as designs:** news cards, the hero watermark without a logo, and player
   initials. Also tame the watermark when the logo itself is loud (Ohio State).
9. **Below-the-fold rhythm.** Section headers, schedule rows and the Outlook line carry the hero's
   energy; settle the Georgia question (§9 Q4).
10. **Game view strip and secondary links.** Fix the 390px strip; move "Full Schedule ›" out of the
    lead position.
11. **Desktop layouts** for Home, Game and Around (two columns at ≥ 1024px).
12. **Around's layers** visibly distinct; live rows distinct from final rows.
13. **Offseason S4 card** as a season-end moment.
14. **Chooser** as a first impression.
15. **Smaller items:**
    - Players' duplicated position label and header stack;
    - Stats leader emphasis;
    - Schedule's season strip;
    - More as a team-coloured index;
    - App Style previews.

### 7.2 Interaction and animation refinements

1. **Game moments:** score, turnover, final and kickoff, from a renderer-side diff, with the
   lateness and reduced-motion rules in §6.4.
2. **Score roll** on change, with tabular figures and no layout shift.
3. **Lifecycle transitions** (pregame to live to final) as cross-fades via View Transitions where
   supported.
4. **A ticking countdown** on Home's pregame hero (Game Details has one).
5. **Press and selection feedback:**
   - tab and segment changes;
   - card press states;
   - the existing 180ms view slide extended to the hero.
6. **A Drive Tracker that steps play by play** between refreshes.
7. **Atmosphere** (day/night, decision 0022 #11) made visible: lighting that changes with kickoff
   time.

### 7.3 Genuine functional gaps (would need logic or data, and a product decision)

1. **S5 Home hero** (next season published): no card today; see §8.1. This is a defect against the
   offseason contract, not a design idea. *Fixed in #236.*
2. **Win-probability line on Game.** The series is in ESPN's summary; TeamOS keeps only the last
   value.
3. **Player card.** Roster and season stats exist separately, with no per-player view.
4. **News "new since last visit"** and source filtering.
5. **A season summary on Schedule** (record, conference record, streak). TeamOS has the record; a
   streak is a new derived figure.
6. **Approved hero photography** for any team (licensing, §6.1).
7. **Optional identity fields** (secondary hue, pattern, numeric face) by declaration.

### 7.4 Not currently feasible or not justified

1. **Truly real-time play animation.** The free feed is polled every 30 seconds with no push.
   Animations must not imply live-to-the-second.
2. **An interpolated game clock.** It would be invented state (0022 truthfulness).
3. **Injury or "player down" moments.** Play text cannot tell whether a player returned (David,
   Nov 2).
4. **Video, highlights or broadcast clips.** No licensed source.
5. **Per-team stadium photography at scale without a licensing source.**
6. **Haptics on iPhone web.**
7. **Scroll-driven animation as a requirement.** Older Safari lacks it; use it as enhancement only.
8. **3D or WebGL scenes.** Cost, battery and accessibility outweigh value. Not justified for a
   polled data product.
9. **A framework or animation library.** CSS and a small diff function cover every item in §7.2
   (decision 0040 rule 7).

---

## 8. Defects found during the audit

These are not design items; they are bugs in current behavior. **None was fixed in this
assignment.** Each is small and, under decision 0039, a bug fix Claude may ship once David says
work resumes.

> **Status (2026-11-07):** 1 fixed in #236, 2 fixed in #235. 3 stays open for the redesign.

1. **S5 Home has no hero.** *Fixed in #236:* in S5 the hero is next season's opener, on Home and
   Game.
   - **Trigger:** the season is over (final AP poll published), the postseason is done, and ESPN
     already lists next season's schedule.
   - **What happens:**
     - `TeamOS.season.phase` returns `next-published`.
     - `Suite.offseason.hero` steps aside, as the contract says (`suite/offseason.js:78-81`).
     - `TeamOS.game.hero` sees only this season's games and picks no game.
     - Home draws the team name with no card ([render](audit/2026-11-06/nd-off-team-390-home-top.jpg)).
     - The offseason UI contract says S5 "reuses the existing upcoming-game card with the
       confirmed next-season opener" (`docs/design/offseason-ui-contract-2026-10-12.md:86`), and
       `suite/home.js:243-245` marks the no-card rendering as interim.
   - **Fix:** feed the published opener (`offseason.phase.opener`) to the hero.
   - **When it matters:** fans see this every winter, as soon as ESPN publishes the next schedule.
     A Notre Dame 2027 schedule is already in the fixtures (`espn-schedule-nd-2027.json`).
2. **HTML entities in headlines.** *Fixed in #235:* the producer decodes the second layer; the
   next refresh rewrites every team's headlines.
   - 26 headlines across the current news snapshots show raw entities ("Q&#038;A",
     "&#8211;"), e.g. `data/notre-dame/news.json`.
   - The feeds double-encode (`&amp;#038;`). The XML parser in `tools/producers/beat_news.py` removes one layer, and nothing removes the second.
   - Visible on News ([render](audit/2026-11-06/nd-pre-team-390-news-full.jpg)).
3. **Game view strip at 390px.** *Open, left for the redesign.* "Drive Tracker" overflows its quarter-width tab (`app.css:711-714`)
   and touches the screen edge. It is minor and presentation-only, so it can wait for the
   redesign.

---

## 9. Questions for the Creative Director and David

1. **Scope of the first slice.** Decision 0040 names Home and Game first. Should desktop layouts
   be part of Phase 2, or wait for a later phase?
2. **Team type under Team Style.** Should scores, clocks, ranks and display headings always use a
   Suite numeric face, with the team's faces kept for names and body? That keeps the athletic
   voice for all 138 teams (§5 row 3).
3. **Suite Style.** Is it worth keeping as a mode, given how close it is to Team Style for many
   teams? If yes, it needs its own finished palette (0026 still says provisional).
4. **The editorial face.** Do Georgia section headings and headlines stay? Oct 4 kept them "until
   another editorial face is chosen".
5. **Art direction.** Original generated environment art (shared, tinted by team tokens), CSS and
   SVG lighting only, or both? Per-team photography remains blocked on licensing.
6. **Moments.** Which game events earn a moment, and is the 30-second lateness acceptable for
   each?
7. **New TeamOS fields.** Any of: win-probability series, optional identity fields. Each is
   David's call under 0040 rule 7.
8. **Platform floor.** Is iOS Safari 16.4 the oldest browser we design for? It decides `@property`
   and `color-mix()`.
