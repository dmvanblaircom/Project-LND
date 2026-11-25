# Suite Stage 2 v2: visual asset integration (2026-11-21)

Branch `design/stage2-home`. Not merged or deployed (decision 0039: David merges new visual direction).
Visual destination: the boards in `docs/design/reference/2026-11-20-nd-osu-boards/`.

## What changed from Stage 2 v1

- **Photographs replace the drawn SVG stadium.** `suite/stadium.js` is gone. The stage and the Game header show a real photo of the **stadium the game is played in**: ours at home, the opponent's away, a known neutral site's own. One rule covers all three: match the venue the schedule names. Any venue Suite has no photo of gets a blurred, darkened stand-in.
- **Day and night only** (David: dusk was too orange). Light follows the kickoff's local time.
- **Every team is shown by its large official mark, never a helmet** (decision 0046, David 2026-11-21). Commons covers too few teams, and the two helmet photos tried (Notre Dame, Ohio State) were not reliable. The boards' helmets are the one element not built.
- **Home and Game are dark**, as in the boards. The stage keeps the real team colours; quick actions show the icon over the label; section heads and cards are on dark.
- **Game on desktop has two columns**: the tabbed detail on the left, plus a new Game Info card (date, kickoff, venue, TV, series).
- **Stage copy**:
  - status pills by phase: Next game / Game day / Live / Halftime / Overtime / Delayed / End of game / Final;
  - a down-and-distance pill plus "{ABBR} ball";
  - halftime reads "{Team} receives to start the 2nd half";
  - the countdown is in days, then Tomorrow, then the time, then hours and minutes;
  - Final and Halftime are said once, by the pill.
- **Photo credits** are listed in More → About; every photograph carries author, license, source and changes.
- **Offline**: the art data and module are in the shell, and photos are kept once seen.

## Imagery

| Use | File(s) | Source | Author | License |
|---|---|---|---|---|
| Notre Dame Stadium, day | `assets/venues/notre-dame-stadium/day-{800,1280,1920}.webp` | [Commons](https://commons.wikimedia.org/wiki/File:Fans_and_players_gather_for_a_football_game_Sept._6,_2014,_at_Notre_Dame_Stadium_in_South_Bend,_Ind_140906-D-KC128-220.jpg) | MC1 Daniel Hinton, U.S. Navy | Public domain |
| Notre Dame Stadium, night | `assets/venues/notre-dame-stadium/night-{800,1280,1920}.webp` | [Commons](https://commons.wikimedia.org/wiki/File:NotreDameStadiumNight.jpg) | Eccekevin | CC BY-SA 4.0 |
| Ohio Stadium, day (also used at night) | `assets/venues/ohio-stadium/day-{800,1280,1920}.webp` | [Commons](https://commons.wikimedia.org/wiki/File:Ohio_Stadium_(37516165921).jpg) | Dan Keck | CC0 |
| Neutral stand-in, day / night | `assets/venues/neutral/{day,night}-{800,1280,1920}.webp` | Commons [11045855126](https://commons.wikimedia.org/wiki/File:Notre_Dame_Stadium,_University_of_Notre_Dame,_South_Bend,_Indiana_(11045855126).jpg), [11045985644](https://commons.wikimedia.org/wiki/File:Notre_Dame_Stadium,_University_of_Notre_Dame,_South_Bend,_Indiana_(11045985644).jpg) | Ken Lund | CC BY-SA 2.0 (blurred and darkened so the venue cannot be placed) |

- **Total:** 2.1 MB, fetched only for the venue and light in use.
- **Data:** `leagues/college-football-art.js`.
- **Logic:** `teamos/art.js`.
- **Commons helmet coverage survey (all 138 teams):** `docs/design/reference/2026-11-20-nd-osu-boards/helmet-coverage.md`. Six teams have a clean helmet photo, 11 a usable one, and 108 have none. That survey is why decision 0046 shows every team by its official mark.

## Screenshots (`sheets/`)

- **Three-way comparisons:** main (existing) / Stage 2 v1 (3abfdf5) / v2. Same fixtures (`tools/stagereview.js`, fixture clock 2026-10-27), same widths, full pages.
  - Home, Notre Dame (team style) at 390: `notre-dame-team-{pre-far,pre-eve,pre-day,pre-near,pre-night,live,halftime,overtime,delayed,suspended,end,final-win,final-loss}-390.jpg`.
  - Home, Notre Dame at 1280: `notre-dame-team-{pre-far,live-night,final-win}-1280.jpg`.
  - Home, Ohio State (suite style) at 390 and 1280: `ohio-state-suite-{pre-day,live,final-loss}-{390,1280}.jpg`.
  - Game, Notre Dame at 390: `notre-dame-team-game-{pre-far,live,halftime,overtime,delayed,end,final-win}-390.jpg`.
  - Game, Notre Dame at 1280: `notre-dame-team-game-{pre-far,live,final-win}-1280.jpg`.
- **The proof-of-concept matchup, v2 only** (Notre Dame vs Ohio State at the real venues):
  - `ndosu-venues-390.jpg`: home pre, home live at night, away at Ohio Stadium, neutral-site stand-in.
  - `ndosu-osu-390.jpg`: Ohio State's page at Ohio Stadium, plus Notre Dame's halftime and final.
  - `ndosu-desktop.jpg`: Home pre and live, Game live, and Ohio State's Home at 1280.
  - `ndosu-game-390.jpg`: Game pre, live and final.

The fixture's default opponent is Navy at Gillette Stadium, so the three-way sheets show the neutral stand-in and both marks. The matchup sheets show the real venues.

Team marks are refused in this environment, so marks render as initials. CI loads the real logos.

## Validation

See the delivery report in the session for the full results. In brief:

- **`tools/run-checks.js --base origin/main`:** 85 of 85 passed (1,818 s, 2026-11-21).
- **`herocontrastcheck`:** 138 teams, every stage, every word at WCAG AA, including the real venues by day and night.
- **`darkgroundcheck` (new):** no component on dark Home or Game paints the ink as a ground. Added after the drive field's own end zone went white in v2.
- **`artcheck` (new):** venue selection (home, away, neutral, missing), day and night, credits, that every real file exists with its credit, and that no helmet lookup exists.

## Known limitations

- **No Ohio State night photo.** Ohio Stadium uses its day photo for night games.
- **Venue photos exist for two stadiums.** Every other venue gets the neutral stand-in until its photo is added (data only).
- **The bottom nav is dark on every screen**, not only Home and Game.
- **Availability (quick action)** covers our team only, as before.
