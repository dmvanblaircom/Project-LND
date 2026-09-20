# Live score consistency — investigation and fix

**Reported:** 2026-09-19, game day, both Suites · **Fixed:** 2026-09-20 · **Branch:** `fix/live-score-consistency` from `project-lnd-platform` · **Decision:** `docs/decisions/0010-one-live-state-per-game.md`

## What was seen

Buckeye Watch, during Ohio State–Kent State: the Game Center showed **Ohio State 49, Kent State 0**, clock `14:27 - 4th`, last play "Timeout Ohio State", win probability 100%. The header bar and the Home hero showed **0-0**.

Irish Watch: Top 25 rows for games that were in progress held stale scores and status.

## Root cause

The same game reaches the Suite from three ESPN endpoints, as three objects, on three timers, and none of them wrote back to the others:

| Surface | Object | Endpoint | Refreshed by |
|---|---|---|---|
| Hero, header bar, schedule rows | `Game` | `teams/<id>/schedule` | `autoTick` → `refreshSchedule` |
| Game Center | `GameDetail` | `summary?event=` | its **own** 25-second timer |
| Top 25 row for the same game | `LeagueGame` | `scoreboard?groups=80` | `autoTick`, only while the tab was visible |

The Game Center's timer started as soon as it rendered a live `GameDetail`. The hero's timer was created by `startAuto()`, which ran **only after a fetch** and **only if something was already live**. Open the app before kickoff and no timer was ever created: the Game Center went live on its own clock while every other surface stayed frozen at the pre-game snapshot. Nothing re-checked for up to thirty minutes.

Five defects, all contributing:

1. **The live loop never started for a session opened before kickoff.** `startAuto()` was reachable only from `refreshSchedule()` and `getScoreboard()`.
2. **`gameToShow()` and `summaryFor()` trusted the stale schedule.** With `S.games` still `pre`, the Game Center asked for its summary with `live=false` and could be served a 60-second-old copy — the stale schedule degrading the one surface that worked.
3. **The pre-game countdown was never cancelled.** `paintHero`'s live branch returned before `clearInterval(S.tick)`, so the old countdown fired once more, saw kickoff had passed, and overwrote the live clock with the word **"Kickoff"**.
4. **The Top 25 never re-fetched once loaded.** `loadAround()` guards on `dataset.loaded`, and only `autoTick` called `patchRanked`.
5. **A score of `0` was indistinguishable from no score.** `us && us.score ? … : null` made a real 0 `null`, which the view printed as `0` by coincidence.

### Ruled out, with evidence

- **ESPN CDN staleness.** Measured: `schedule` `max-age=1`, `teams/<id>` `max-age=7`, `scoreboard` `max-age=3`, `summary` `max-age=6`.
- **Service worker / Cache Storage.** Every ESPN URL is `isData` → network-first; the cached copy is returned only when the network fails, and then with `X-IW-Cached` so the footer says so. The page fetches `no-store`.
- **Score shape.** The schedule endpoint carries `{"value":59,"displayValue":"59"}`; the adapter reads it. The real final was 59-3.
- **Header record.** `record.items[0]` is `type:"total"` for both teams. Hardened anyway (below), since reading by position is how a header could show a split record.

## The fix

| File | Change |
|---|---|
| `teamos/live.js` | **new.** `reconcile(game, leagueGame)` — the scoreboard is the live truth for a game both describe. Pure, provider-neutral, never moves a game backwards, never invents a score, returns the input untouched when there is nothing to take. Plus `reconcileAll`, `isLive`, `anyLive`. |
| `app.js` | `refreshSchedule` reconciles `S.games` against the scoreboard, so every surface fed by it reads one state. `autoTick` refreshes the scoreboard, then the schedule, then the Game tab — **one clock**. `G.poll` deleted. The countdown is cancelled on the live transition. A one-minute heartbeat notices kickoff passing, and notices the league starting to play while the Top 25 is open. `loadGame` takes liveness from the reconciled state. |
| `teamos/espn.js` | `scoreOf()` — a `0` is a score. `teamStatus` finds the overall record by `type:"total"`. |
| `index.html`, `buckeye.html`, `sw.js` | load and precache `teamos/live.js`; `VERSION` → `iw-2026-09-20a` |
| `tools/livecheck.js` | **new**, wired into `check.yml` |

The rule lives in TeamOS because it is a statement about two domain objects. The cadence stays in the Suite because it is orchestration. `Game`, `LeagueGame` and `GameDetail` keep their shapes and their separate purposes (decision 0005).

## Regression coverage added

**`tools/adaptercheck.js`** — 360 → **382 checks**, including the screenshot as a fixture: a pre-game `Game` reconciled against a scoreboard at `in 0-0 15:00 - 1st`, then `in 49-0 14:27 - 4th`, then `post 59-3 Final`; the away perspective of the same game; a 0 that must survive; a tie; a scoreboard that still says `pre` failing to un-start a live game; every untouched field; a mismatched id; a Top 25 game belonging to nobody configured; and a real schedule payload whose score is `0`.

**`tools/livecheck.js`** — **54 checks**, both teams. It lifts `paintHero`, `paintHeroMini` and `rankedParts` out of `app.js` into a stubbed page and reads back what each surface actually printed:

- before kickoff: hero says "Next up", no score
- kickoff: hero, header bar and Top 25 row all at 0-0, hero clock showing `15:00 - 1st` and **not** "Kickoff"
- the screenshot: all three at **49-0**, both carrying `14:27 - 4th`
- final: 59-3, win recorded
- an unrelated ranked game renders its own live score, clock and LIVE marker without borrowing the configured team's
- the countdown is cancelled and its handle released on the live transition
- **negative control:** an *unreconciled* hero does not show 49-0 while the scoreboard-fed row does — the exact disagreement of 2026-09-19. Without it the check would pass on the broken build and be worth nothing.

## Validation

| Area | Notre Dame | Ohio State | Result |
|---|---|---|---|
| Home / hero | Next up, at Purdue, Sep 26 2:00 PM, Peacock, countdown | Next up, vs Illinois, Sep 26 12:00 PM, FOX | pass |
| Header | #3, record 3-0 | #6, record 2-1 | pass |
| Game Center | ND vs Purdue, matchup preview | Illinois at OSU, matchup preview | pass |
| Top 25 | 72 rows, 3 marked as ours | 72 rows, 3 marked as ours | pass |
| Depth | 6 folds, 3 history reports | "No depth chart" + 100-man roster | pass |
| News | 90 stories, 60 beat, 5 sources | 30 ESPN, 0 beat | pass |
| Odds | both sparklines | none declared, none drawn | pass |
| Live updates | fixtures: kickoff → 49-0 → final, every surface agrees | same | pass |
| Cache / PWA | SW `iw-2026-09-20a`, ND→OSU→ND with no contamination | same | pass |
| Console | zero messages on a fresh tab | zero errors | pass |
| Responsive | 375px, no horizontal scroll, Game Center within the viewport | same | pass |
| Automated | csscheck 352/0/0 · `node --check` ×9 · adaptercheck 382 · livecheck 54 | — | pass |

**Not verifiable today:** no game was in progress while this was written — all 75 college games in the week's window were final and the NFL's first window had not kicked off. The fix is proven against fixtures and against the code paths; watching it on a genuinely live game is the last step, and worth doing on the next game day before this is trusted in production.

## Architectural conclusions

1. **Do all score-bearing surfaces derive from one state?** Yes. The hero, header bar, schedule rows and the Game tab's choice of game all read `S.games`, which is reconciled against the scoreboard on every refresh. The Game Center's *detail* still comes from the summary, which is the only feed that has a box score — but its score, state and clock now agree with everything else because it is refreshed on the same tick.
2. **Can `Game` and `LeagueGame` drift?** Not silently. Where both describe the same game, `reconcile` states which wins. They remain distinct objects by design.
3. **Is live polling centralised?** Yes. One `autoTick`. The Game tab's separate timer is gone.
4. **Can caching produce contradictory state?** No. ESPN URLs are network-first; a cached copy is returned only on network failure and is flagged `X-IW-Cached`. ESPN's own `max-age` is 1–7 seconds.
5. **Do Top 25 live games use the same mechanism?** Yes — the same scoreboard payload on the same tick, plus a heartbeat that notices the league starting to play while the tab is open.
6. **Was the TeamOS/Suite boundary preserved?** Yes. The rule is in TeamOS and is pure; the cadence is in the Suite. No adapter or domain object changed shape.
7. **Did Notre Dame stay stable?** Yes — every surface verified, values unchanged.
8. **Did Ohio State stay isolated?** Yes — no Notre Dame name, snapshot or artwork, before or after switching back and forth.
