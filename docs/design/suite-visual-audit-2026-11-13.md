# Suite: fresh full-product visual audit

**2026-11-13.** Audit and capture only, for David and the Creative Director. No application code, token or style was changed, and nothing here is a decision. It replaces the 2026-11-06 screenshot set as the picture of what is built.

**Read this first:**

1. **The build has no Light or Dark mode.** The approved spec (v1.3, 2026-11-11) calls for Light and Dark in both App Styles, following the device. The build has two appearances only, Team Style and Suite Style, and the device's dark setting changes nothing: the same screens rendered with the system set to dark are byte-identical ([proof shot](audit/2026-11-13/nd-x-team-390-os-dark-home-full.jpg)). The four-appearance matrix in the brief is two today.
2. **Around → College Football is not built.** Around is one experience, centred on the selected team.
3. **Desktop is the phone column.** At 1440 px every screen is a 640 px column in the middle of the window. The desktop header navigation (decision 0042) is still PR #240 and not on `main`.
4. **The approved Home (spec §5) is not built.** What is on `main` is the Stage 1 and 1b foundation applied to the earlier Home.
5. **These renders come from the development sandbox**, which cannot reach ESPN's image host. Team logos, player headshots and story photos are their fallbacks here. Everything about layout, type, density and states is real; anything about logos and photos needs the runner pass (section 9).

---

## 1. Current state

| | |
|---|---|
| Branch and commit | `main` at `53b11d3c12c97bf5cd55a761ef5fa2d2933e1611` (merge of #259, 2026-11-13) |
| Release | service worker `VERSION` `suite-2026-11-13say`; production confirmed serving it (`verify-production.yml`, run 43446411649) |
| Build | None: a static page. Served from this checkout by `tools/lib/serve.js` |
| Runs | Yes. 400 screens rendered with no page error and no horizontal overflow at 390 or 1440 px (`audit/2026-11-13/capture-log.json`). The full check suite passed on this code (PR #258: 82 of 82) |
| How rendered | The real app in Chromium. Provider requests answered from the repository's own captured ESPN payloads, the clock pinned to each moment (the scenarios are `tools/capture.js`'s, unchanged). Script: [`audit/2026-11-13/capture-audit.js`](audit/2026-11-13/capture-audit.js) |

**The moments rendered**

| State | Notre Dame | Ohio State |
|---|---|---|
| Pregame | vs Michigan State, Sep 19, 5 hours before a night kickoff | vs Illinois, Sep 26, before a noon kickoff |
| Live | 3rd quarter, 2:43, ND 17-10 | 3rd quarter, 9:35, OSU 28-13 (ESPN's captured live summary) |
| Final | ND 27-10 | OSU 42-19 |
| Offseason | January, after the final poll, next season's schedule published | the same |

**What the renders are not** (unchanged from the Nov 6 audit's cautions):

- Fixture data, not this week's results. News and market numbers are November's snapshots under a September clock, so stories read "Just now".
- Ohio State's pregame Matchup shows the same figures for both teams. That is the fixture.
- Notre Dame's live Box Score reads "No box score yet." That is the fixture too: Ohio State's live game, from a real live capture, shows the full box score ([shot](audit/2026-11-13/osu-live-team-390-game-box-full.jpg)).
- Weather was not answered, so no screen shows it.
- SP+ could not be reached, so its view shows its failure state.

---

## 2. Screen inventory and capture matrix

Every route the router has (`suite/nav.js` `SCREENS`, verified in code), and what was captured. **All** means both teams, both App Styles, 390 and 1440 px.

| Destination | Route | Views and states | Captured |
|---|---|---|---|
| Home | `#home` | pregame, live, final, offseason | All, in all four states |
| Around | `#top25` | Games (Season Outlook card, our conference, games that matter, Top 25); a game opened in a sheet | All; sheet ND only |
| Around → Rankings | `#top25/rankings/<source>` | CFP, AP, Coaches, FPI, SP+; a week picker | All, each source |
| Season Outlook | `#outlook` | Playoff, National Title (full field) | All |
| Around → College Football | none | **Not built** | n/a |
| Game | `#game` | pregame: Game Details. live: Drive Tracker, Box Score, Plays, Stats. final: Box Score, Plays, Stats | All, every tab |
| Roster | `#roster` | Depth Chart (ND only: OSU has no source), Roster, Availability, Prospects; search; honors | All; search ND only |
| Player details | none | **Not built**: a roster row opens nothing | n/a |
| More | `#more` | six links | All |
| News | `#news` | list | All |
| Schedule | `#schedule` | Schedule, Results; a past game opened | All; opened game ND only |
| Stats | `#stats` | Team, Players | All |
| Settings | `#settings` | Team, App Style, Game Alerts, Data; offline status | All; offline ND only |
| About, Feedback | `#about`, `#feedback` | | All |
| Team chooser | `/` with no team | list, search, no match | 390 and 1440 |
| Your Teams | header team name | sheet of starred teams | ND, 390 and 1440 |
| Launch | on open | | ND and OSU, 390 and 1440 |
| States | | nothing reachable; loading; offline; system dark | ND, Team Style, 390 and 1440 |

**Counts.** 400 screens captured (200 at 390 px, 200 at 1440 px), 739 images. 105 are in [`audit/2026-11-13/`](audit/2026-11-13/) (14 MB), 91 of them cited below; the rest of the 739 are held back to keep the repository small and can be added on request.

**File names:** `<team>-<state>-<style>-<width>-<screen>-{top,full}.jpg`. `top` is the first screenful, `full` the whole page. `nd-x-...` are the interaction and state shots.

---

## 3. Screen-by-screen assessment

Each screen is assessed on the twelve points the brief lists. A point is left out only where there is nothing to say beyond the product-wide findings in section 4. **V** marks a visual issue, **F** a functional defect, **D** a missing data capability.

### 3.1 Home

Shots: pregame [phone](audit/2026-11-13/nd-pre-team-390-home-full.jpg) · [desktop](audit/2026-11-13/nd-pre-team-1440-home-full.jpg) · live [phone](audit/2026-11-13/nd-live-team-390-home-full.jpg) · [desktop](audit/2026-11-13/nd-live-team-1440-home-top.jpg) · final [phone](audit/2026-11-13/nd-final-team-390-home-full.jpg) · offseason [phone](audit/2026-11-13/nd-off-team-390-home-full.jpg) · [desktop](audit/2026-11-13/nd-off-team-1440-home-full.jpg) · Ohio State [pregame](audit/2026-11-13/osu-pre-team-390-home-full.jpg) · [live](audit/2026-11-13/osu-live-team-390-home-full.jpg) · [final](audit/2026-11-13/osu-final-team-390-home-full.jpg) · [offseason](audit/2026-11-13/osu-off-team-390-home-full.jpg) · Suite Style [ND](audit/2026-11-13/nd-pre-suite-390-home-full.jpg) · [OSU](audit/2026-11-13/osu-pre-suite-390-home-full.jpg)

1. **Purpose.** What is my team doing right now, and what is next. One primary action: open the game.
2. **Preserve.** The hero as a single lifecycle-aware card (Next Game, Live, Final). The live scoreboard: score, quarter, clock, possession, down and distance in one glance. The team-neutral final (no Win or Loss label; the losing score is lighter). The schedule's rule: last result plus the next three, the next game marked.
3. **Hierarchy and density.** The hero leads clearly. Below it the page is three equal-weight blocks (News, Schedule, Season Outlook) with no difference in emphasis. Offseason Home is long: Recruiting and NFL Draft together run about three screens before the Schedule.
4. **Type, spacing, alignment.** Stage 1's numeric face is in place on scores and dates. Section headings ("Latest News", "Schedule") are sentence case in the body face, while every other screen's title is condensed capitals: Home reads as a different product from Around or Roster.
5. **Navigation.** One button in the hero; each section has a "View All" at its right. The news row scrolls sideways with the second card cut off as the cue.
6. **Mobile.** The betting line sits in the hero between the series name and the button, at the same size as the series name. **V:** news cards are tall with a large empty middle when a story has no photo; in this sandbox every card is in that state, so its real frequency needs the runner pass.
7. **Desktop.** **V:** the phone layout in a 640 px column; more than half of a 1440 px window is empty. No supporting column (the spec's Season Context and Conference Standing panels are not built). The bottom nav becomes a floating bar at the foot of the window.
8. **Team Style and Suite Style.** For Notre Dame the two differ by accent only (gold or blue): same navy stage, same type. For Ohio State, Team Style changes the stage to charcoal and the type to its own face. **V:** Ohio State's Team Style stage is near-black with scarlet only on the button and accents. The spec asks that scarlet and gray stay recognisable; today the page reads as black and white with a red button.
9. **Light and Dark.** Not built (see the top of this document).
10. **Data and fallbacks.** A missing mark falls back to a monogram, cleanly. Offline, a quiet banner says "Offline · Showing last available data" ([shot](audit/2026-11-13/nd-x-team-390-offline-home-full.jpg)). **V:** when nothing loads, Home is one line of small grey text on an empty page, with no hero and no way to retry ([shot](audit/2026-11-13/nd-x-team-390-unavailable-home-top.jpg)). Spec §5.6 expects more.
11. **Accessibility and responsive.** No overflow at either width. Contrast and focus are gated in CI (`tools/a11yaudit.js`).
12. **Improvements, by impact.** (a) Build the approved Home: the order, the two quick actions, the wire's place, the desktop supporting column. (b) Give Team Style real team colour beyond the button. (c) A designed unavailable state. (d) One heading system shared with the other screens. (e) Shorten offseason Home: Recruiting and Draft also live under Roster → Prospects.

**Against the approved Home spec (§5.1).** Built: Team Hero; Latest News; Schedule; a one-line Season Outlook that opens Around. Not built: Team Identity and Context as its own block, Quick Actions (Matchup, Availability), the Wire, the desktop supporting column, a ticking countdown, weather in the hero.

### 3.2 Around (My Team)

Shots: Games [ND phone](audit/2026-11-13/nd-pre-team-390-around-games-full.jpg) · [OSU phone](audit/2026-11-13/osu-pre-team-390-around-games-full.jpg) · [ND desktop](audit/2026-11-13/nd-pre-team-1440-around-games-full.jpg) · [OSU desktop](audit/2026-11-13/osu-pre-team-1440-around-games-full.jpg) · [a game opened](audit/2026-11-13/nd-x-team-390-around-game-sheet-full.jpg) · [offseason](audit/2026-11-13/nd-off-team-390-around-games-top.jpg) · Rankings [AP](audit/2026-11-13/nd-pre-team-390-around-rankings-full.jpg) · [FPI](audit/2026-11-13/nd-pre-team-390-around-rankings-fpi-full.jpg) · [SP+ unavailable](audit/2026-11-13/nd-pre-team-390-around-rankings-sp-top.jpg) · [CFP, offseason](audit/2026-11-13/nd-off-team-390-around-rankings-full.jpg) · [desktop](audit/2026-11-13/nd-pre-team-1440-around-rankings-top.jpg) · Season Outlook [full field](audit/2026-11-13/nd-pre-team-390-outlook-playoff-full.jpg)

1. **Purpose.** Where we stand and which other games matter to us. Two views: Games and Rankings.
2. **Preserve.** The layering and its reasons: each game in "Games that matter" says why in one line ("North Carolina plays Notre Dame Oct 3", "Georgia: AP No. 2, near Notre Dame"). The conference layer for a team that has one (Ohio State's Big Ten comes first). The selected team highlighted in a ranking, never moved. Any game opening in a sheet without leaving the list.
3. **Hierarchy and density.** **V:** very long. Notre Dame's Saturday is 26 games in two lists; nothing separates a rival's game from a game listed only because a ranked team is in it. The reason lines are small accent-coloured text under each row and carry the whole idea of the screen.
4. **Type and controls.** **V:** Rankings stacks three controls before any content: the Games/Rankings tabs, the source chips, the week picker, then an information box about the CFP calendar. The table starts below the fold on a phone.
5. **Navigation.** The Season Outlook card opens the full field (61 teams, one long list of bars).
6. **Mobile.** Rows are compact and legible. Ranks, records and scores share one small size, so a final score does not stand out from a record.
7. **Desktop.** **V:** the same single column; a 26-game list is a long scroll on a screen that could show it in two or three columns.
8. **Styles.** Accent only.
10. **Data and fallbacks.** Kalshi's numbers are credited on the card. SP+ says plainly that it did not load and how to retry. **V:** out of season the Games view is the Season Outlook card and one sentence: "No ranked teams play in this window."
12. **Improvements.** (a) Decide what Around → My Team leads with; today Season Outlook, the conference and the Top 25 compete. (b) Give "why this game matters" real visual weight. (c) Collapse the Rankings controls. (d) An offseason Around with content (the data audit lists what is in hand). (e) Standings: the source is confirmed and nothing is built.

**D:** conference standings; Around → College Football as a whole.

### 3.3 Game

Shots: pregame [ND](audit/2026-11-13/nd-pre-team-390-game-details-full.jpg) · [OSU](audit/2026-11-13/osu-pre-team-390-game-details-full.jpg) · [desktop](audit/2026-11-13/nd-pre-team-1440-game-details-top.jpg) · live [Drive Tracker](audit/2026-11-13/nd-live-team-390-game-drive-full.jpg) · [OSU Drive Tracker](audit/2026-11-13/osu-live-team-390-game-drive-full.jpg) · [Box Score](audit/2026-11-13/osu-live-team-390-game-box-full.jpg) · [Plays](audit/2026-11-13/nd-live-team-390-game-plays-full.jpg) · [Stats](audit/2026-11-13/nd-live-team-390-game-stats-full.jpg) · [desktop](audit/2026-11-13/nd-live-team-1440-game-drive-full.jpg) · final [Box Score](audit/2026-11-13/nd-final-team-390-game-box-full.jpg) · [Plays](audit/2026-11-13/nd-final-team-390-game-plays-full.jpg) · [Stats](audit/2026-11-13/nd-final-team-390-game-stats-full.jpg) · [desktop](audit/2026-11-13/nd-final-team-1440-game-box-top.jpg) · [offseason](audit/2026-11-13/nd-off-team-390-game-top.jpg) · Suite Style [ND](audit/2026-11-13/nd-live-suite-390-game-drive-full.jpg) · [OSU](audit/2026-11-13/osu-live-suite-390-game-drive-full.jpg)

1. **Purpose.** Everything about one game, in the tabs that fit its moment.
2. **Preserve.** Tabs that change with the lifecycle (one view before kickoff, four live, three after). The Drive Tracker's field graphic with its legend. Matchup's side-by-side season averages with national ranks and an edge marker. Plays as scoring drives first, then every drive, each one opening. The box score's Hide and Show per category.
3. **Hierarchy.** The scoreboard hero is clear live and final. **V:** pregame, the centre of the hero stacks seven short lines (HOME VS, opponent, date, time and network, stadium, city, series) between the two marks, then a countdown, then the line.
4. **Type and alignment.** **V (defect):** in the pregame hero at 390 px the separators are left hanging at the ends of lines: "Sat, Sep 19 ·", "Notre Dame Stadium ·". Both teams. **V:** "Full Schedule ›" sits alone at the right under the tabs on every view, using a full row.
5. **Navigation.** Tabs plus swipe. The Game button in the nav rises and shows a red dot while live.
6. **Mobile.** Live and final are dense and readable. Score by Quarter appears on three of the four live tabs, and "Schedule and Game Notes" (one link) is a whole card on several.
7. **Desktop.** **V:** one 640 px column; the box score's tables and the field graphic are the content that would gain most from width.
8. **Styles.** The field graphic keeps its green in both styles; the drive's marks take the accent.
10. **Data and fallbacks.** Honest empty states ("No box score yet."). When nothing loads, Game shows the same single grey line as Home ([shot](audit/2026-11-13/nd-x-team-390-unavailable-game-top.jpg)). Out of season `#game` shows next season's opener with a 229-day countdown, and the nav's Game item becomes Schedule.
12. **Improvements.** (a) Recompose the pregame hero so nothing dangles or stacks seven deep. (b) A desktop layout: scoreboard and field with the box score beside them. (c) Remove the repeats (Score by Quarter, the notes card). (d) A designed unavailable state.

### 3.4 Roster

Shots: [Depth Chart](audit/2026-11-13/nd-pre-team-390-roster-depth-full.jpg) · [desktop](audit/2026-11-13/nd-pre-team-1440-roster-depth-top.jpg) · [Roster](audit/2026-11-13/nd-pre-team-390-roster-list-full.jpg) · [desktop](audit/2026-11-13/nd-pre-team-1440-roster-list-top.jpg) · [search](audit/2026-11-13/nd-x-team-390-roster-search-full.jpg) · [no match](audit/2026-11-13/nd-x-team-390-roster-search-none-top.jpg) · [Availability ND](audit/2026-11-13/nd-pre-team-390-roster-availability-full.jpg) · [OSU](audit/2026-11-13/osu-pre-team-390-roster-availability-full.jpg) · [Prospects](audit/2026-11-13/nd-pre-team-390-roster-prospects-full.jpg) · [OSU Roster](audit/2026-11-13/osu-pre-team-390-roster-list-top.jpg)

1. **Purpose.** Who is on the team, who starts, who is out, who is coming.
2. **Preserve.** Views that appear only where the team has a source (Ohio State has no Depth Chart tab, and nothing is faked). Search by name, number, position or hometown. "Say" pronunciations from the school's notes. Out markers on the roster. The official report credited and linked.
3. **Density.** The roster is 100 rows, each three or four lines. The depth chart is a card per position.
4. **Controls.** **V:** Roster view stacks tabs, a "Season stats ›" link on its own row, four filter chips and a search field before the first player.
5. **Navigation.** **F / D:** a player's row opens nothing. There is no player screen; season stats exist but nothing joins them to the roster.
6. **Mobile.** Honors fold under a count ("4 honors"); one honor shows in line.
7. **Desktop.** Better than elsewhere: rows become a table with height, weight and class columns. Still one 640 px column.
10. **Data and fallbacks.** Headshots fall back to initials (all of them here). Loading is a line of text ("Loading the roster…", [shot](audit/2026-11-13/nd-x-team-390-loading-roster-top.jpg)).
12. **Improvements.** (a) A player screen. (b) One control row. (c) A denser roster row on phones. (d) Prospects repeats offseason Home: decide which owns it.

### 3.5 News

Shots: [ND](audit/2026-11-13/nd-pre-team-390-news-full.jpg) · [OSU](audit/2026-11-13/osu-pre-team-390-news-full.jpg) · [desktop](audit/2026-11-13/nd-pre-team-1440-news-top.jpg) · [nothing loads](audit/2026-11-13/nd-x-team-390-unavailable-news-top.jpg)

- **Purpose.** The team's stories, newest first, opening the publisher.
- **Preserve.** Source named on every row; the external-link mark; 20 rows then "Show 69 more".
- **Issues.** **V:** every row has the same weight: no lead story, no grouping by day, no way to tell a video or a recap from a report. A story with no photo shows a dark tile with the source's name (every row here; needs the runner pass). **D:** no filter by source, no "new since you last looked", no wire.
- **Desktop.** **V:** a single column of small rows.
- **Improvements.** A lead story; video marked as video; the wire above it when it ships.

### 3.6 Schedule and Results

Shots: [Schedule](audit/2026-11-13/nd-pre-team-390-schedule-full.jpg) · [Results](audit/2026-11-13/nd-pre-team-390-schedule-results-top.jpg) · [a result opened](audit/2026-11-13/nd-x-team-390-schedule-game-opened-full.jpg) · [OSU](audit/2026-11-13/osu-pre-team-390-schedule-full.jpg) · [offseason](audit/2026-11-13/nd-off-team-390-schedule-full.jpg) · [desktop](audit/2026-11-13/nd-pre-team-1440-schedule-top.jpg)

- **Preserve.** Home, Away and Neutral tags; rivalry and trophy names; "Time TBA" and "Network TBD" said plainly; a row opening its game with a way back.
- **Issues.** **V:** the row's right side stacks day, time, network and line in four small lines. Results early in a season is nearly empty. Schedule sits under More, two taps from anywhere, though Home links to it.
- **Desktop.** **V:** a 12-game season as a long narrow list.

### 3.7 Stats

Shots: [Team](audit/2026-11-13/nd-pre-team-390-stats-team-full.jpg) · [Players](audit/2026-11-13/nd-pre-team-390-stats-players-full.jpg) · [OSU](audit/2026-11-13/osu-pre-team-390-stats-team-full.jpg) · [desktop](audit/2026-11-13/nd-pre-team-1440-stats-team-top.jpg)

- **Preserve.** National ranks beside every figure; this week's opponent side by side; the source and what a rank means stated at the foot.
- **Issues.** **V (defect):** in Players, the Passing table is wider than its card and the last column is cut at the edge ("RT"). A line says "Scroll for more stats", but nothing shows the table moves. **V:** Team is four long tables of small figures with no visual summary; the Game tab's bars are not reused here.
- **Desktop.** **V:** tables built for width, shown in a phone column.

### 3.8 More, Settings, About, Feedback

Shots: [More](audit/2026-11-13/nd-pre-team-390-more-top.jpg) · [desktop](audit/2026-11-13/nd-pre-team-1440-more-top.jpg) · [Settings](audit/2026-11-13/nd-pre-team-390-settings-full.jpg) · [Suite Style](audit/2026-11-13/nd-pre-suite-390-settings-full.jpg) · [offline](audit/2026-11-13/nd-x-team-390-offline-settings-full.jpg) · [desktop](audit/2026-11-13/nd-pre-team-1440-settings-top.jpg) · [About](audit/2026-11-13/nd-pre-team-390-about-full.jpg) · [Feedback](audit/2026-11-13/nd-pre-team-390-feedback-top.jpg)

- **More.** Six links (News, Schedule, Stats, Feedback, Share Suite, About), then an empty page. **V:** three of the product's largest screens are listed here with the same weight as Feedback.
- **Settings.** Team, App Style, Game Alerts, Data. Clear and short. **D:** no Light, Dark or System choice. Offline, "Last Updated" says so with the time.
- **About.** Every data source named and linked, and the independence statement. Preserve.

### 3.9 Team chooser, Your Teams, launch

Shots: [chooser](audit/2026-11-13/chooser-390-top.jpg) · [search](audit/2026-11-13/chooser-390-search-top.jpg) · [no match](audit/2026-11-13/chooser-390-search-none-top.jpg) · [desktop](audit/2026-11-13/chooser-1440-top.jpg) · [Your Teams](audit/2026-11-13/nd-x-team-390-your-teams-sheet-full.jpg) · [desktop](audit/2026-11-13/nd-x-team-1440-your-teams-sheet-top.jpg) · launch [ND](audit/2026-11-13/launch-390-top.jpg) · [OSU](audit/2026-11-13/launch-osu-390-top.jpg)

- **Chooser.** A search field and 138 teams in one alphabetical list, each with a star. Search works on team, conference and mascot. **V:** the first impression of the product is a plain list of monograms; no conference grouping, no sense of the product a fan is about to enter. On desktop it is the same narrow list.
- **Your Teams.** A sheet from the header's team name once a second team is starred. Clear.
- **Launch.** The Suite wordmark on the team's stage. It also covers Home's loading: the launch lifts onto a finished screen, so Home has no visible loading state of its own. The launch shots here were caught mid-fade and are not a fair picture of it.

### 3.10 Empty, loading, unavailable, offline

Shots: nothing reachable [Home](audit/2026-11-13/nd-x-team-390-unavailable-home-top.jpg) · [Game](audit/2026-11-13/nd-x-team-390-unavailable-game-top.jpg) · [Around](audit/2026-11-13/nd-x-team-390-unavailable-around-games-top.jpg) · [Roster](audit/2026-11-13/nd-x-team-390-unavailable-roster-list-top.jpg) · [News](audit/2026-11-13/nd-x-team-390-unavailable-news-top.jpg) · [Stats](audit/2026-11-13/nd-x-team-390-unavailable-stats-team-top.jpg) · [desktop](audit/2026-11-13/nd-x-team-1440-unavailable-home-top.jpg) · loading [Around](audit/2026-11-13/nd-x-team-390-loading-around-top.jpg) · [Roster](audit/2026-11-13/nd-x-team-390-loading-roster-top.jpg) · offline [Home](audit/2026-11-13/nd-x-team-390-offline-home-full.jpg) · [Settings](audit/2026-11-13/nd-x-team-390-offline-settings-full.jpg)

- **What works.** Every screen says something true in plain words when its data is missing. A returning fan offline sees the last good data with a banner.
- **V:** every one of these states is a single line of small grey text at the top of an empty page. On Home and Game there is no hero and no title either.
- **V:** the wording differs screen to screen: "it fills in when the connection returns", "They appear when the connection returns", "Pull down to try again", "Return to this view or use Refresh Data".
- **V:** loading is a sentence, not a shape of what is coming.

---

## 4. The product as one experience

| Theme | What the captures show | Evidence |
|---|---|---|
| **Headings** | Three systems: condensed capitals for page titles (AROUND, ROSTER), sentence-case headings on Home and Settings ("Latest News", "Appearance"), small capitals with an accent bar on cards (MATCHUP, BOX SCORE) | [Home](audit/2026-11-13/nd-pre-team-390-home-full.jpg), [Around](audit/2026-11-13/nd-pre-team-390-around-games-full.jpg), [Game](audit/2026-11-13/nd-pre-team-390-game-details-full.jpg) |
| **Numbers** | The Suite numeric face is on scores, dates and the Outlook percentages. Tables everywhere else use the body face at small sizes | [Stats](audit/2026-11-13/nd-pre-team-390-stats-team-full.jpg) |
| **Controls** | Two kinds of tab (underline, and segmented chips), often stacked, plus a select: three rows of controls on Rankings and Roster | [Rankings](audit/2026-11-13/nd-pre-team-390-around-rankings-full.jpg), [Roster](audit/2026-11-13/nd-pre-team-390-roster-list-full.jpg) |
| **Cards** | One white card on a warm grey page, everywhere. Consistent, and also flat: a rivalry game, a stat table and a link to a PDF all get the same surface | all |
| **Header** | Consistent on every screen: wordmark, team, gear. The team's presence in it is a small mark and small capitals | all |
| **Navigation** | Five destinations hold. News, Schedule and Stats are behind More. Orphan links ("Full Schedule ›", "Season stats ›") take a row each | [Game](audit/2026-11-13/nd-live-team-390-game-drive-full.jpg), [Roster](audit/2026-11-13/nd-pre-team-390-roster-list-full.jpg) |
| **Desktop** | No desktop composition anywhere. A 640 px column, a floating bottom bar | every `1440` shot |
| **Team identity** | Strong in the hero, then gone: below the stage every team is the same white cards with one accent colour. Notre Dame's two styles differ by accent only. Ohio State's Team Style is charcoal, not scarlet | [ND](audit/2026-11-13/nd-pre-team-390-home-full.jpg), [OSU](audit/2026-11-13/osu-pre-team-390-home-full.jpg), [OSU Suite](audit/2026-11-13/osu-pre-suite-390-home-full.jpg) |
| **Light and Dark** | One appearance per style: a dark stage over light pages. No dark pages, no light stage | [system dark](audit/2026-11-13/nd-x-team-390-os-dark-home-full.jpg) |
| **Empty and fallback** | Truthful and bare; wording varies | section 3.10 |
| **Repetition** | Score by Quarter on three live tabs; the notes link card on several; Recruiting and Draft on offseason Home and on Prospects; Season Outlook on Home, Around and its own screen | [Drive](audit/2026-11-13/nd-live-team-390-game-drive-full.jpg), [Stats](audit/2026-11-13/nd-live-team-390-game-stats-full.jpg) |
| **Immersion** | The stage (hero atmosphere, day and night) exists on Home and Game only. Nothing else has a moment | [live](audit/2026-11-13/nd-live-team-390-home-full.jpg) |

**Against the direction** (premium sports experience, strong usability, team identity, restrained immersion): usability is the strongest of the four today. Everything is legible, truthful and reachable. Premium, identity and immersion are concentrated in two heroes; the other twelve screens are competent lists.

---

## 5. Recommended improvements, by user impact

Recommendations only. Each needs the Creative Director's design and David's approval; several are already approved in the spec and simply not built.

| # | Improvement | Why it ranks here | Status |
|---|---|---|---|
| 1 | **Build the approved Home** (spec §5): order, quick actions, the wire's place, the desktop supporting column | The first screen every fan sees, already designed in words | Approved; waiting on the wide composition |
| 2 | **Desktop compositions and the header navigation** | More than half the window is empty on every screen | 0042 approved; #240 open |
| 3 | **Light and Dark, following the device** | Approved, and absent | Approved in v1.3; not started |
| 4 | **Team identity past the hero**, Ohio State first | Team Style is the default, and below the stage teams look alike | Approved direction (v1.3) |
| 5 | **Around: decide the lead, and build the two experiences** | The screen's one idea ("why this game matters") is its smallest text; College Football does not exist | Data audit done; design open |
| 6 | **One system for headings and controls** | Three heading styles and stacked controls make screens feel unrelated | Design |
| 7 | **Designed unavailable and loading states** | The worst moment a fan has is the least designed | Spec §5.6, §6.5 |
| 8 | **Game pregame hero and the desktop Game** | The hanging separators are visible to every fan before every game | Stage 3 |
| 9 | **News with a lead story and video marked** | Twenty identical rows | Phase 3 |
| 10 | **A player screen** | Roster rows look tappable and are not | Parked (backlog §4) |
| 11 | **Promote News, Schedule and Stats out of More**, or make More worth visiting | Three major screens behind a list of six links | Design |
| 12 | **Remove the repeats** | Shorter pages, clearer ownership | Design |

---

## 6. Functional defects and data gaps

Kept apart from the visual recommendations above, as the brief asks.

**Defects** (the app does something wrong today)

| # | Defect | Severity | Evidence |
|---|---|---|---|
| F1 | Game, pregame hero at 390 px: separators hang at line ends ("Sat, Sep 19 ·", "Notre Dame Stadium ·") | Low; visible to all | [ND](audit/2026-11-13/nd-pre-team-390-game-details-full.jpg), [OSU](audit/2026-11-13/osu-pre-team-390-game-details-full.jpg) |
| F2 | Stats → Players: the Passing table is cut at the card's right edge with no visible cue that it scrolls | Low | [shot](audit/2026-11-13/nd-pre-team-390-stats-players-full.jpg) |
| F3 | Around → Rankings: an address naming a source that does not exist shows AP and leaves the address as typed | Trivial | found while capturing (`#top25/rankings/sp`) |

None of these was fixed: the brief excludes code changes. F1 and F2 are small enough to fix as bugs under decision 0039 on David's word.

**Missing capabilities** (not defects: never built)

| # | Gap | Where it is recorded |
|---|---|---|
| G1 | Light and Dark appearance, and the System, Light, Dark preference | Spec v1.3 §3.1 |
| G2 | Around → College Football | `docs/product/around-data-availability-audit.md` |
| G3 | Conference standings | the same; source confirmed 2026-11-13 |
| G4 | Desktop compositions and header navigation | 0042, PR #240 |
| G5 | The wire | 0043; 88.1% against a 90% gate |
| G6 | Player screen | backlog §4 |
| G7 | Home quick actions; weather in the hero; a ticking countdown on Home | Spec §5 |
| G8 | Video marked as video in News | data audit §4.2 |

**Not app faults** (fixture limits; do not act on these): the same Matchup figures for both teams on Ohio State's pregame; "No box score yet." on Notre Dame's live game; every story reading "Just now".

---

## 7. What could not be captured, and why

| Not captured | Why |
|---|---|
| Light and Dark in either style | Not built. The system's dark setting was tried and changes nothing |
| Around → College Football | Not built |
| Player details | Not built |
| Team logos, headshots and story photos | The sandbox cannot reach ESPN's image host; fallbacks are drawn. Needs the runner pass (section 9) |
| Weather in the Game hero | The weather provider was not answered |
| SP+ rankings with data | The edge API is unreachable from the sandbox; its failure state was captured |
| A real offline refresh | The capture answers provider requests itself, so "offline" could not stop them; that shot was discarded. The offline banner and Settings status are real |
| Game alerts turned on | Needs a real device's notification permission |
| Push notifications, the install prompt, the update message | Device and service-worker behaviour, not screens |
| Delayed, postponed, cancelled, overtime and bowl games | No fixture was built for them in this pass; `tools/` holds checks for each |
| The launch, fairly | Caught mid-fade |
| Motion (the Game button's pulse, sheet transitions, pull to refresh) | Still images |
| Tablet widths, 320 px | Outside the brief's two widths. The CI visual audit covers 320, 375, 390 and 1280 on every release |
| A physical iPhone | David's device pass (R5) |

---

## 8. Approved decisions respected

Nothing here reopens a decision. Home is assessed against the approved spec, not redesigned. Five destinations stand. Around's two experiences are treated as decided, with College Football recorded as not built. No recommendation asks for a new framework, provider, backend field or architectural change; where one would need data, it points to the data audit.

---

## 9. One step that would complete the evidence

The same script run on a GitHub runner draws real logos, headshots and story photos, as the Nov 6 set did. It needs a temporary branch and a workflow that commits the images back, which the brief's boundaries exclude, so it was not done. On David's word it is about an hour, and the fallback-art caveats in sections 3 and 7 go away.
