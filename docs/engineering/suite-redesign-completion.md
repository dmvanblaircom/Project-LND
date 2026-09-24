# Suite redesign: what must be true before it is complete

The canonical Suite redesign merges to `main` once, after visual review
(decision 0023). Screens are approved one phase at a time; this file keeps
the items that were deferred or left open along the way, so none of them
is forgotten at merge. An item leaves this list when it is done or when
Product decides it differently.

## Required before the redesign is complete

| Item | Source | Notes |
|---|---|---|
| Final Suite icon set and neutral share image | Decision 0024 §11 | `assets/suite/TEMPORARY-*` are stand-ins. `tools/identitycheck.js --release` refuses them and CI runs it for `main` and PRs into it. Sizes in `assets/suite/README.md`. |
| Season Outlook "View full field" | Home review, 2026-09-24 | The locked Home references have it and the full-market data exists (the Kalshi board). Build it as a Suite light-theme experience; do not route the new Home into the pre-canonical board. |
| Home News "View All" deep-links to the full News experience | Home review, 2026-09-24 | Today it goes to `#more/news`, which shows the More screen. When More/News is rebuilt, `#more/news` must open News itself. |

## Open product decisions

| Question | State today |
|---|---|
| What owns the Home hero after the recent-final window when no game is left to play? | `TeamOS.game.hero` chooses no game (`reason: "season-over"`, `game: null`, `last` reported) and Home shows the team identity alone. Nothing is invented until Product decides. |

## Known provider limits

| Limit | Effect |
|---|---|
| ESPN gives no trustworthy rescheduled date for a postponed game | `Game.newDate` is null from the ESPN adapter, so a postponed hero says "New date to be announced". The presentation supports date + time and date + "Time TBD" for a source that states one. When ESPN reschedules, the game returns as scheduled on its new date. |
| ESPN's standings page answers GitHub's runners with HTTP 202 | The weekly registry refresh still fills provider ids from the scoreboard but cannot refresh FBS membership, and ends red so that is visible. |
| Exceptional statuses are mapped from ESPN's documented `STATUS_*` names | No real delayed, suspended, postponed or canceled payload has been captured yet. Capture one on the runner when it happens and add it as a fixture. |
