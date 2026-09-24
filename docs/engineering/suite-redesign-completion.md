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
| Suite Style's final palette | More rebuild, 2026-09-24 (decision 0026) | Suite Style works end to end, but the only Suite colour Design has set is the chrome navy `#0B1F3A`. The surfaces are that navy's scale and the accent a provisional steel blue (`#8FB3E8`, text `#2F5A9E` on light), marked TEMPORARY in `suite/ui.js` (`Suite.ui.STYLE`). They pass the same contrast checks as a team (`tools/suitecheck.js`). Design supplies Suite's own; replacing the values is the whole change. |

## Follow-ups recorded on this list

| Item | Source | Notes |
|---|---|---|
| Remove the legacy panel code | Schedule rebuild, 2026-09-24; More rebuild | Every screen is canonical since the More rebuild, and `#legacy` is always hidden. What remains is dead: `loadGame`, `renderGame`, `#panel-game`, the old hero/strip/odds board (`#hero`, `#strip`, `#oddsboard`, `layoutForTab`, `loadStrip`, `toggleBoard`) and `legacy.css`. Remove them in one pass, checking the Home Season Outlook "View full field" item first, since it will replace the old odds board. |
| Safe presentation of play text | Game review, 2026-09-24 | Not a Top 25 blocker. ESPN's raw play text ("(02:51) No Huddle-Shotgun #2 N.James Jr. rush left...") reads awkwardly. Where normalized structured play fields can produce cleaner text safely, they may drive the display; otherwise the source text stays as it is. No free-text parser that could change what a play says. |

## Planned verification

| Check | When | How |
|---|---|---|
| Top 25 Games and Game in a real live state | Sat Sep 26, 2026, 3:50 PM ET (the 3:30 PM games starting, Notre Dame at Purdue ending) | A one-shot reminder in the Claude session, not a repository schedule: `capture-fixture.yml` has only push and manual triggers. At that time the session pushes `scoreboard-20260926 sep26-live` and `401858467 pur-live` to `tools/fixtures/capture-requests.txt`, which runs the capture; the live renders then come from those payloads. If the reminder does not fire, the capture can be run the same way by hand while games are live. |

## Open product decisions

| Question | State today |
|---|---|
| About Suite: an independence / non-affiliation statement | Not shown. No approved wording exists in the repository, and it is a product and legal statement, not engineering copy. About Suite shows a one-line product description, the version and every data source the team's configuration declares (`TeamOS.sources.list`). |
| More copy for Product to confirm | Written by engineering, factual, easy to change in `suite/more.js`: App Style's two helper lines ("Your team's colors and type lead." / "Suite's standard look, the same for every team."), Feedback's explanation, About's one-line description ("Your team's games, rankings, roster and news, in one place."). The menu subtitles are the reference's. |
| The end-of-season / offseason Home: what owns the hero after the recent-final window when no game is left to play? | `TeamOS.game.hero` chooses no game (`reason: "season-over"`, `game: null`, `last` reported). Home draws no game card - an interim safe rendering only, not the approved design. Product/Design will define the real state; nothing is built on the interim one. |
| A trustworthy, scalable source for rivalry names, trophies and concise rivalry context | Parked by Product/Design (Game review, 2026-09-24) as meaningful fan content. Today only the trophy name from team configuration is shown; no description is shown rather than generic copy, and no one-team rivalry database is built in Suite. Required before the redesign is complete. |

## Known provider limits

| Limit | Effect |
|---|---|
| ESPN gives no trustworthy rescheduled date for a postponed game | `Game.newDate` is null from the ESPN adapter, so a postponed hero says "New date to be announced". The presentation supports date + time and date + "Time TBD" for a source that states one. When ESPN reschedules, the game returns as scheduled on its new date. |
| ESPN's standings page answers GitHub's runners with HTTP 202 | The weekly registry refresh still fills provider ids from the scoreboard but cannot refresh FBS membership, and ends red so that is visible. |
| ESPN gives no CFP release date | Before the committee publishes, Top 25's CFP view says the rankings appear once it does, and names no date (the reference's "published on Tuesday, Nov 4" has no source). |
| Exceptional statuses are mapped from ESPN's documented `STATUS_*` names | No real delayed, suspended, postponed or canceled payload has been captured yet. Capture one on the runner when it happens and add it as a fixture. |

## Review renders

Every Game screenshot submitted for visual approval tells one story: teams,
score, clock, current drive, plays, line score, team stats and box score come
from one real game (Game review, 2026-09-24). `tools/qa/game_states.py`
derives the pregame, live and final states of one captured game from its
real payloads; synthetic live states are cuts of that game, not blends of
several.
