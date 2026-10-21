# The after-season Home: season data for Codex's renderer (W16)

**Status (October 21):** the TeamOS side of the after-season Home is built. Codex owns the presentation side: `Suite.offseason.hero`, seasonal navigation, and wiring the model into Home (`docs/engineering/offseason-renderer-handoff-2026-10-12.md`, PR #134). This page is the contract between the two.

## One call

```js
var model = TeamOS.season.offseason({
  phase:  TeamOS.season.phase({ games, next, selected, now }),
  polls:  T25.polls,              // the live rankings feed's Poll[], or null
  league: window.LEAGUE_CALENDAR,
  next:   "loading" | "empty" | "failed" | "retained" | "unknown",
  now:    new Date()
});
// model === null  -> in season, in the postseason, or nothing known: Home shows the Game hero
// model.phase.opener -> S5: the renderer returns nothing; the Game hero shows the opener
```

It returns exactly the shape the renderer handoff asks for:

| Field | Shape | Omitted when |
|---|---|---|
| `phase` | `{ state: "awaiting-postseason" \| "complete", season, nextSeason, opener, ended }` | never: `null` instead of a model |
| `record` | `{ text, season, kind: "regular" \| "final" }` | ESPN printed no record on the last game |
| `ranking` | `{ rank, source: "CFP" \| "AP", season, final }` | the team is unranked, or no poll from this season |
| `last` | the last game played, a normalized Game | no game played |
| `calendar` | `TeamOS.season.calendar(league, season, now)` | never |
| `nextSchedule` | `{ outcome, opener }` | never |

Notes on the fields:

- **`record`** is the team's record as ESPN printed it on its last game. It is never an opponent's record. `kind` is `"final"` once the season is complete.
- **`ranking`** is the committee's (CFP) once it has published this season, else the AP's. It counts only:
  - the team's own row;
  - a poll released inside the season (August to January).
- **`ranking.final`** is true only for the last edition: the committee's Selection Day release, or the AP poll ESPN marks as its last edition (its "Final Rankings", after the title game). A January date alone is never enough. S4 shows a ranking only when `final` is true, as the handoff requires.
- **`ended`** says what ended the season: `lost`, `bowl`, `champion`, `not-selected` or `calendar` (from `phase`). A declined bowl reads as `not-selected`. In Notre Dame 2025, ESPN lists the team on no postseason game, so once selection is known the season is `complete`. It never sits in "awaiting postseason" past Selection Day.

## What the controller loads

All of these are already TeamOS calls.

| Input | Source |
|---|---|
| `games` | This season, regular and postseason joined: `TeamOS.espn.joinSeason(regular, postseason)` from `scheduleUrl` and `postseasonUrl` |
| `next` (phase) | Next season's schedule as Game[] once `phase.askNext` is true; `null` until asked, `[]` when asked and nothing is published |
| `selected` | `TeamOS.espn.postseasonSelected(board)`, with `board` from `TeamOS.espn.postseasonBoardUrl(season)`: ESPN's whole postseason for the season (season type 3, week 1, which ESPN answers; a date range is refused). `null` until read |
| `polls` | `T25.polls`, the live feed Top 25 already reads |
| `next` (offseason) | What happened to the next-season request: `loading`, `empty` (asked, nothing published), `failed`, `retained` (a saved copy drawn), or `unknown` |

Read the board only after `phase` reaches `awaiting-postseason`, and no more than hourly. Until it answers, the phase stays `awaiting-postseason`: an empty postseason feed is never taken as "not selected".

## Tested on real data

`tools/adaptercheck.js` ("TeamOS.season.offseason") covers:

- **Notre Dame 2025:**
  - waiting on the postseason at 10-2, CFP No. 11, not final;
  - after selection, complete, `not-selected` (it declined its bowl), with the Selection Day release as its final ranking.
- **Other cases:**
  - AP before the committee publishes, final only as ESPN's "Final Rankings" (a January poll before the title game is not);
  - a poll from another season never shown;
  - an unranked team and a missing record left out;
  - `null` in season and in the postseason;
  - S5 with its opener.
- **The postseason board:** ESPN wrote the 2025 first round as "College Football Playoff First Round Game". `postseasonSelected` reads it (`tools/fixtures/espn-scoreboard-postboard-2025.json`).
