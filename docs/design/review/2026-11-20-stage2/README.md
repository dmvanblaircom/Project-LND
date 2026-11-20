# Stage 2: Home — delivery report

The Home half of the [Home & Game redesign brief](../../../product/suite-home-game-visual-redesign-implementation-brief.md) (§11). Game is Stage 3, a separate pull request.

## 1. What changed

- **Home's hero is now a stage.** It shows a stadium Suite drew itself, with the selected team's light on it, a helmet for each side, both official marks, the scoreboard, and one action into Game. The same stage carries every lifecycle state: pregame, live, halftime, overtime, delayed and suspended, end of game, and final.
- **The light follows the actual kickoff.** Day, dusk or night, at the venue's local time.
- **The countdown grows as kickoff nears** (brief §4.1):
  - several days out: a quiet line;
  - the day before: a figure;
  - game day: the board's second voice;
  - the last two hours: its first voice.

  It is a value at the time of drawing, never a ticking clock.
- **Live context sits under the score:** the possession named in words ("ND ball"), down and distance, and the spot. Each appears only when the source gives it.
  - **Halftime:** "Notre Dame receives to start the 2nd half."
  - **Overtime:** reads OT, 2OT and so on, with no clock.
  - **A score change:** the number that rose lifts briefly, once, and the new score is announced. This happens only between two live looks while the page is visible, never on the first look, and never with reduced motion.
- **End of game is its own state.** With 0:00 in the 4th and the score not tied, the stage shows END OF GAME with the last score, and the postgame stays off until the source says final.
- **New Home sections, in the approved order** (champion, hero, milestone, quick actions, the wire, news, schedule):
  - **Quick actions:** Matchup, and Availability.
  - **The wire:** up to three meaningful updates from the last 72 hours, kept apart from Latest News so no story appears twice.
  - **Schedule:** the next game's row is marked.
- **Desktop (64rem and up):**
  - Home becomes two columns. The supporting column holds two separate panels, Season Context (record, rank, ESPN's projected odds) and Conference Standing (the top five, plus our row when it is lower).
  - The hero spreads into a horizontal matchup.
  - The desktop header navigation from #240 (decision 0042) lands with this PR, as planned.
- **Removed: By the Numbers on Home.** Brief §4.8 excludes it. Game keeps it in full, and that is checked.

## 2. Creative direction and design decisions

- **The point of view: one stadium for every team, lit by the team.** The art belongs to no school. It has no marks, uniforms, end zones or recognisable venue (spec §3.4). Each team arrives through light: the halo, the ribbon board, the crowd's coloured lights and the rim of each helmet resolve from the team's role tokens. Suite Style lights the same stadium in champagne.
- **Day, dusk and night.**
  - Day and night follow decision 0022 #11: before or after 6 PM local.
  - Dusk is new: a kickoff from 4:00 to 5:59 PM local, when a game starts in daylight and finishes under the lights. It has a violet zenith, an ember horizon, a low sun behind the far stands, and the towers coming on.
  - **For David:** dusk is a lighting answer only (`TeamOS.game.light`). Anything that asks day-or-night still gets 0022's answer. The 4 PM line is my call, because the brief asks for dusk and gives no rule.
  - A kickoff time that is not yet announced gets neutral light, with no beams.
- **Our team, our game (§4.1).** Our helmet is larger and leads. The opponent's is smaller, mirrored to face ours, and fully drawn. Both marks are the same size on one line, as are the name and record lines, so the board stays level whatever data is missing. (David's iPhone report of 2026-10-25 was about exactly that.)
- **Helmets are a sculpted form, not each school's helmet.** Real helmets differ in shell, stripe and decal, and Suite has no licensed helmet art. A helmet painted in team colours with a logo on the side would misstate most programs; Notre Dame's, for example, is plain gold. So the helmet is pearl, lit by the stage, with the team's light along its edge, and the official mark beside it names the school. If David wants real helmets, that is a per-team asset or config project, which spec §3.4 and §8 rule out for now.
- **Words never sit on the picture.** Text sits on the team's abyss, in feathered bands (decision 0041), and the art shows through a window above and around them. This is gated for every team, as described in §6.
- **The same treatment for wins and losses.** Final is FINAL with the score. The winner's figure stays full weight and the other's steps down, the same for a win or a loss. There is no celebration.
- **Motion is restrained.** The only animation is the score lift, once. There are no loops, and the art is static.
- **Section order is the approved one.** The champion banner (David, 2026-10-27) stays across the top. I had first moved it under the hero, then put it back because brief §4 says the approved order holds.

## 3. Original assets

- **`suite/stadium.js`, the stadium environment.** An original vector composition (about 10 KB) drawn inline as SVG, with:
  - sky, halo and sun;
  - a two-tier bowl with crowd lights, using a fixed scatter so a redraw never shimmers;
  - a ribbon board;
  - a striped field;
  - four light towers with lamps, blooms and beams.

  Every colour is a CSS class, so time of day and team are restyles, not new art. It needs no download, works offline, and paints with the first frame.
- **`Suite.stadium.helmet()`, the helmet form.** An original profile helmet with shell, specular, rim light, seam, ear hole and facemask, in SVG and mirrored for the opponent.
- **Quick-action icons** are inline SVG strokes in the existing icon style.
- **Nothing was sourced or licensed.** The official team marks are the ones Suite already shows.

## 4. Files and components

- **New:**
  - `suite/stadium.js`
  - `tools/stagereview.js`: the review harness that drew these pictures.
  - `docs/design/review/2026-11-20-stage2/`
- **Rewritten:**
  - `suite/scoreboard.js`: the stage and its board.
  - `suite/home.js`: the hero through the stage, quick actions, the wire, the supporting column.
- **Changed:**
  - `app.js`: the Home model gains the wire split, the actions, the next game, season, standing and the score moment.
  - `app.css`: the stage, stadium, helmet, board, countdown, sections and desktop grid.
  - `teamos/game.js`: `light()` and `endOfGame()`.
  - `suite/schedule.js`: the next-game row.
  - `index.html` and `sw.js`: the new scripts, the wire and moments, and a new VERSION.
- **From #240:** `suite/nav.js` and the desktop header CSS (decision 0042).
- **Checks** moved onto the new markup. Also changed:
  - herocontrastcheck gains dusk;
  - gamecheck and scoreboardcheck gain light and end-of-game cases;
  - wirecheck now asserts the wire **is** loaded, since its gate was met.

## 5. Preserved

- Every lifecycle rule TeamOS already had: the hero choice, the recent-final rule (0022 #10), the postgame transition, the quarter-break final conversion, and the halftime and possession rules.
- The schedule rows (the last result and the next three), Latest News (three stories, opening the source in a new tab), Season Outlook, recruiting and draft in the offseason order, the milestone card, and the champion banner.
- Offline-first loading, the cache and freshness semantics, the one live region, keyboard focus, both App Styles, and team configuration as data. No file names a team.

## 6. Tests and checks

See **Test results** at the end of this report. Both runs listed there were actually executed.

## 7–9. Visual evidence

Rendered by `tools/stagereview.js` from the real app: its renderer, stylesheet and fonts, on the repository's fixtures, with each lifecycle state set on the normalized Game.

**Team marks show as initials here.** This environment cannot reach ESPN's logo host, so these pictures double as the asset-fallback evidence (§11 item 9). The same Home **with real marks** is in this PR's CI artifacts: the `suite-visual-*` uploads of the Visual audit, at every width, with `ALLOW_PROVIDER_IMAGES`.

| Sheet | Shows |
|---|---|
| `lifecycle-notre-dame-team-390.jpg` | Every state, Notre Dame, Team Style, phone |
| `lifecycle-ohio-state-suite-390.jpg` | Every state, Ohio State, Suite Style, phone |
| `widths-notre-dame-live.jpg` | One live state from 320 to 1440 |
| `desktop-1280.jpg` | Desktop Home: pregame, live and final, both styles |
| `light.jpg` | Day, dusk, night and no time announced |
| `teams-390.jpg` | Six programs' colours on the same stage |

## 10. Known limitations and deviations

- **Helmets are a shared form, not team helmets.** See §2.
- **Dusk is a rule I set (4 PM local)**, layered on 0022's day and night. See §2.
- **Opponent wire items are not loaded on Home.** The wire shows our team's updates only. Opponent items need a second beat-feed read per game, which is a data change I did not make here.
- **Availability covers our team only. This does not meet the brief's "both teams in the next game" (§4.5).** It opens our team's official report: Roster → Availability where Suite reads it, otherwise the conference's page. Suite reads no opponent report today. Covering the opponent means reading the opponent team's report for each game. That is a TeamOS data change (the reader exists per team), so I left it out of a visual PR and recommend it as a follow-up.
- **Conference Standing is absent for independents** such as Notre Dame. There is no conference to stand in, and nothing is invented.
- **On phone the supporting column is hidden.** Its content is Around's, one tap away. Spec §5.2 places it on desktop.
- **Weather effects** belong on Game only (§6.2), so they are not in this PR.
- **Real-mark screenshots are not in this folder** (the logo host is blocked here). They are in CI's artifacts.

## 11. Postgame logic and TeamOS contracts

- `TeamOS.game.hero`, `recentFinal`, `lifecycle`, `atmosphere` and the ESPN adapter are unchanged. That is checked by gamecheck, homegamecheck and postseasoncheck, all passing.
- `endOfGame()` and `light()` are additions; no existing contract changed shape.

## 12. Branch

- Branch: `design/stage2-home`.
- The PR waits for David's merge, because this is a new visual direction (decision 0039).
