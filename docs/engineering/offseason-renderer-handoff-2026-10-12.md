# W16: Home presentation and seasonal navigation (updated October 20)

**Status (October 21):** The approved presentation from #134 is wired to the
TeamOS after-season model in draft PR #159. The controller now supplies the
normalized current-season games, next-season schedule outcome, postseason
selection result, rankings, and league calendar, and applies seasonal navigation.
The feature is not live until the PR merges. Full visual CI and the final S2/S4
review remain release gates. David approved the original and v2 rendered
references on October 12.
This work translates the approved card into source-agnostic presentation,
without preempting Claude's season logic or hard-coding fictional results.

## Files

- `suite/offseason.js`: `Suite.offseason.hero(model)`, a pure markup renderer.
- `app.css`: scoped `.os-*` responsive production styles.
- `docs/design/offseason-component-review.html`: executable review of the
  production renderer against intentionally illustrative fixtures. Does not
  use its own separate card markup.
- `tools/offseasonrendercheck.js`: no invented season, rank, score or kickoff;
  known scores of zero survive; HTML source fields escaped; S1/S3/S5 untouched.
- `tools/offseasoncomponentcheck.js`: browser captures of both teams, both
  styles, three states at 320/375/390/1280.
- `suite/home.js`: optional `m.offseason`; News immediately after S4/S5 hero.
- `suite/nav.js`: `setSeasonNav({top25, game})` with independent flags.
- `suite/more.js`: Game and Top 25 links when absent from primary nav.
- `docs/design/offseason-home-review.html`: complete production Home/nav
  presentation with clearly labeled illustrative inputs, both teams/styles.
- `tools/offseasonhomecheck.js`: responsive layouts, enlarged text, saved
  routes, section order, focus, contrast and independent seasonal tabs.
- `index.html`, `sw.js`: module loading, offline shell and new cache version.
- `.github/workflows/check.yml`: CI for all three test suites.

## Claude/controller input (do not bypass)

The home controller determines the phase using `TeamOS.season.phase`,
never a calendar guess in this renderer. It supplies:

```js
{
  phase: { state: "awaiting-postseason"|"complete",
           season: 2026, nextSeason: 2027, opener: null },
  record: { text: "11-1", season: 2026, kind: "regular"|"final" },
  ranking: { rank: 6, source: "CFP"|"AP", season: 2026, final: false|true },
  last: { ...normalized Game, oppName, status, us, them, stage },
  calendar: TeamOS.season.calendar(/* ... */),
  nextSchedule: { outcome:"loading"|"empty"|"failed"|"retained"|"unknown",
                  opener: null|normalizedGame }
}
```

The example values above illustrate **field shapes**, never live figures.
All fields are optional except `phase`; missing data is omitted rather than
filled with a fictitious score or ranking.

- Confirm a trustworthy record source with season and finality; never reuse
  the most recent game's opponent record as a team season record.
- S2 includes CFP rank when available. S4 requires a **final** ranking
  edition; otherwise omit it. Rankings must match `phase.season`.
- Last game and its opponent come from the normalized Game.
  Missing scores show only "Final", never 0–0. Show the provider-supplied stage
  only when available. Do not invent a CFP round or bowl.
- The controller distinguishes **loading**, **successful empty**,
  **failed**, **retained** and **confirmed opener** from the next-season
  schedule request. `phase.opener` indicates S5 and the renderer returns
  nothing; the current Game hero is reused for S5.
- S4/S5 news now moves immediately under the hero. Recruiting and NFL Draft
  follow it (October 24): `suite/home.js` draws `TeamOS.prospects` output,
  which app.js reads only once the season is complete. Season-matched
  markets come from the odds producer (#160). This component draws none of them.
- Seasonal nav accepts controller-supplied booleans; keep Top 25 through
  the title game, restore preseason tabs at the approved triggers, and keep
  saved routes. Do not derive navigation solely from the team's phase.

**Controller wiring in PR #159:** `app.js` now prepares `m.offseason` from
`TeamOS.season.phase()` and `TeamOS.season.offseason()`. The next-season schedule
is requested only after the current season ends; the whole postseason board is
read only while selection is pending and retried no more than hourly. An unknown
board response is not treated as a negative selection. The existing Home hero
remains unchanged when the model is null, and S5 reuses the confirmed opener
in `m.hero.game`. The service worker caches the renderer under a fresh version.
Remaining release gates are the full visual CI run, browser review of S2/S4 and
season transitions, offline/retry/rollover verification, and a physical iPhone test.

Call `Suite.nav.setSeasonNav({top25: boolean, game: boolean})` with the
league-calendar result, then repaint `Suite.more.menu` if More is open.
Only explicit `false` replaces a tab; omitted input restores in-season nav.
Home/News/Schedule/Roster/More is the full offseason set. Independent flags
support Top 25 through the title game and Game returning within 14 days of
the opener before preseason AP. The Schedule tab links to Results; the
controller still owns the screen's default view and displayed season.
Game/Top 25 retain all routes and move under More when absent from the bar.
The old `#more/news` and `#more/schedule` aliases remain valid. Settings still
selects no bottom tab. A replaced focused tab transfers focus to its slot's
replacement, while identical refreshes leave DOM and focus alone.

The selection card uses the calendar's `live` flag. S2 accepts CFP only;
S4 still requires a season-matched final edition. A retained opener with
`timeSet:false` shows its date and Time TBD, never a placeholder kickoff.
Source freshness/retry controls continue to come from the controller.

## October 20 verification

- Synced main through `ff0d9514`, including Claude's ranking-week picker/game
  sheets #149, CFP alerts #147 and news fixes #146/#150. No app.js or provider
  changes in this UI diff.
- 25 renderer assertions; 300 standalone component assertions; 608 complete
  Home/navigation assertions with 48 viewport captures. Both teams, both
  styles, 320/375/390/768/1280; 200% text at 320/768; painted text/focus audit.
- Saved routes, More links, Settings selection, independent calendar flags,
  unchanged S1/S3 markup, unknown kickoff and focused News ordering covered.
- All 30 offline gates pass locally. Windows-only runner adapters use the
  bundled Python for `python3` and translate Node's `/C:/` script pathname;
  repository assertions are unchanged. Worker calendar was regenerated to LF
  locally; its committed content has no diff. Linux CI remains authoritative.
- The 200% text check found existing tablet header overflow; minimum gutter
  padding now keeps the Settings gear inside the viewport.
- These are presentation checks. They do not claim production season
  transitions, live provider verification or physical iPhone completion.

**Do not merge as a finished offseason feature.** Before a production
feature merge run both new checks and the full suite, verify actual
component screenshots for ND/OSU, and exercise postseason advance/loss,
no-postseason, unknown time, retries, offline, and January rollover. A physical
iPhone test is still a separate gate.
