# W16: staged S2/S4 Home presentation component (October 12)

**Status:** Code staged for integration review, **not live or wired into Home**.
David approved the original and v2 rendered references on October 12.
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
- `.github/workflows/check.yml`: CI for the two test suites.

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
- S4 news moves immediately under the hero. The actual Home controller
  still needs to render news, recruiting/draft and season-matched markets
  from the approved sources. This component does not implement those sections.
- Seasonal nav is still separate: keep Top 25 through the title game,
  restore preseason tabs at the approved triggers and keep saved routes.

**Required integration step:** load the module in `index.html`, include it
in `sw.js` shell assets, add an explicit `m.offseason` to `Suite.home.paint`,
and have `app.js` prepare that model after Claude lands the W16 source
and state contracts. No live screen is changed by adding a standalone
renderer file. `sw.js` VERSION is bumped because `app.css` has changed.

**Do not merge as a finished offseason feature.** Before a production
feature merge run both new checks and the full suite, verify actual
component screenshots for ND/OSU, and exercise postseason advance/loss,
no-postseason, unknown time, retries, offline, and January rollover. A physical
iPhone test is still a separate gate.
