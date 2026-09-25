# Suite redesign: release scope and what remains

The canonical Suite redesign merges to `main` once, after visual review
(decision 0023). Screens are approved one phase at a time; this file keeps
the items that were deferred or left open along the way, so none of them
is forgotten at merge. An item leaves this list when it is done or when
Product decides it differently - and says so here when it does.

## Launch scope (David, 2026-09-25)

David locked the release scope with ChatGPT on 2026-09-25, against this
branch, this list, CI and the final identity pack. This **changes the
earlier completion contract**: Season Outlook "View full field", the final
brand integration and rivalry context were listed here as required before
the redesign is complete. They no longer block this release. They are kept
below as explicit post-launch follow-ups, not dropped.

### Launch-critical

| Item | State |
|---|---|
| Final Suite PWA identity set (`icon-192`, `icon-512`, `maskable-512`, `apple-touch-180`, `favicon-32`, `favicon-64`, `favicon.svg`, `og-1200x630`), used exactly as supplied | **Installed 2026-09-25** from the Suite Release Identity Pack v1, byte-identical; every `TEMPORARY-*` file and reference removed; the manifest's theme and background colours are Ink `#111D35` to match the icons. `tools/identitycheck.js --release` passes. |
| Approved Suite wordmark (`suite-wordmark-pearl.svg`) in the dark Suite header instead of typed `SUITE`, at its intrinsic aspect ratio; `suite-wordmark-ink.svg` supplied with it | **Installed 2026-09-25.** 662:132, drawn 1.6rem tall so its glyphs match the typed wordmark's cap height; the team context still fits at 320. The release identity uses Ink `#111D35` and Pearl `#F1F2F0`; Team Style is untouched and the provisional Suite Style tokens stay. `--s-chrome` (the chooser's header, also the Top 25 heading ink inside Team Style) is left at `#0B1F3A` for that reason - part of the post-launch brand pass. |
| Real-live Top 25 + Game verification | Sat Sep 26, 2026, 3:50 PM ET - see Planned verification. The merge waits on it. |
| Final merge, release gate and production verification | One merge to `main` on Sunday Sep 27 if the live verification passes, through a PR to `main` so the release gate that protects `main` is the one tested. After merge: the production site, the installed-PWA identity, favicon and share metadata, the service-worker version pickup, and no `TEMPORARY-*` reference left. |

Closed for this release: the ChatGPT catch-up review (`pending-design-review.md`
is empty; corrections 1.1-1.6 accepted, no re-review required), and the
retired identity fields (`identity.newsLabel`, `colors.text` / `textDim`),
dropped from the schema, the team configs and `applyStyle()` - TeamOS now
refuses them.

### External checks: Cloudflare `Workers Builds: irish-watch` / `irish-odds`

Investigated 2026-09-25 on release PR #4; they are red on `main` too.
**Non-gating for the production path**, and not a redesign regression:

- Production is **GitHub Pages** (`pages-build-deployment`, Jekyll build of
  `main`, served at https://dmvanblaircom.github.io/Project-LND/). It has
  deployed successfully on every `main` commit while these checks were red.
- The repository contains **no Cloudflare Worker project** on any branch (no
  `wrangler` config, no worker source). The two checks come from Cloudflare
  Workers Builds integrations connected to this repository in the
  Cloudflare dashboard; with nothing to build, `irish-odds` fails the second
  it starts and `irish-watch` hangs "in progress". Their logs exist only in
  the Cloudflare dashboard.
- The app calls no Worker: `KALSHI_PROXY` in `app.js` is empty and odds
  come from the snapshots `.github/workflows/odds.yml` commits.
- They are not required status checks: engineering-only pushes to `main`
  went through while they were red.

Open, outside this repository: whether any old `irish-watch` /
`irish-odds` Worker deployment (`*.workers.dev`) is still in use. This
release does not update them. Recommended: disconnect the two Workers
Builds integrations (or delete the Workers) in the Cloudflare dashboard, so
the checks stop reporting and no stale copy of the app stays reachable.

### Release regression pass (2026-09-25)

A pass beyond the CI gates, run on the release head:
- a crawl of every reachable route for both teams, in both styles, at 320, 390, 768 and 1280 (464 renders)
- hostile deep links and query strings
- providers aborting, returning 500s, returning invalid JSON or `{}`, or answering slowly
- 150 random route changes under slow data
- a team switch, checked for leakage from the previous team
- corrupt and legacy `localStorage`
- offline reopen with the real worker
- an upgrade from `main`'s worker to this release on the same origin

Each render was checked for page errors, "undefined"/"NaN" text, overflow, broken images, duplicate ids, unnamed controls and the title. Two defects were found and fixed:

| Defect | Fix | Regression test |
|---|---|---|
| A first visit that could not reach the schedule left Home and Game on "Loading…" indefinitely, and nothing retried the schedule on reconnection. `main` said "The schedule didn't load", so this was a regression. | Home, Game and a game opened from Schedule use the Schedule screen's own failure line. Reconnection, or entering one of those screens, retries once (no duplicate requests). | `tools/outagecheck.js`, in CI: 13 checks, 9 of which fail without the fix |
| A final without both scores drew as a tie ("T –") and was read aloud as "undefined to". | Schedule rows say "Final". | `tools/suitecheck.js`, Schedule rows |

Everything else held:
- **Upgrade:** the first open after the deploy still shows the old page under the new worker. The next open is Suite, only this release's caches remain, and the wordmark loads.
- **Offline reopen:** shows "Offline · Showing last available data" over the last copy.

Known, left as is: Home's hero and Game's header show 0 for a missing score. That is right for a live game before anyone scores, and every score surface is checked to agree on it. A final with no scores at all would read 0–0 there. Changing that is a product call on approved screens.

## Post-launch follow-ups (explicit; not started in this release)

| Item | Source | Notes |
|---|---|---|
| Full Suite Style / Pearl token mapping and broader final brand integration | More rebuild; catch-up review 2026-09-25 | David has selected **Ink `#111D35`**, **Pearl `#F1F2F0`** (over Porcelain) and the approved wide custom **Suite wordmark** (in the header from this release). The full token mapping is not approved: the provisional ink/cobalt/champagne `Suite.ui.STYLE` stays until a deliberate brand-system pass. That pass is more than the ten colour roles: Pearl belongs to the light surfaces and on-dark text (`--s-page`, `--s-surface`, `--s-on-dark` in `app.css`). Map each approved colour to explicit roles, decide Pearl's placements, update first-paint handling, recheck contrast and keep Team Style untouched; produce the Pearl logo variants in the same pass. *Was release-blocking; moved post-launch 2026-09-25.* |
| Season Outlook "View full field" | Home review, 2026-09-24 | The locked Home references have it and the full-market data exists (the Kalshi markets). Build it as a Suite light-theme experience; do not route the new Home into the removed pre-canonical board. *Was release-blocking; moved post-launch 2026-09-25.* |
| Rivalry names, trophies and concise rivalry context | Game review, 2026-09-24 | Needs a trustworthy, scalable source (parked by Product/Design). Today only the trophy name from team configuration is shown; no generic copy, and no one-team rivalry database in Suite. *Was release-blocking; moved post-launch 2026-09-25.* |
| End-of-season / offseason Home | Open since the Home review | **Resolve by mid-November.** `TeamOS.game.hero` chooses no game (`reason: "season-over"`, `game: null`, `last` reported) and Home draws no game card - an interim safe rendering only. Product/Design define the real state. |
| Safe presentation of play text | Game review, 2026-09-24 | ESPN's raw play text ("(02:51) No Huddle-Shotgun #2 N.James Jr. rush left...") reads awkwardly. Where normalized structured play fields can produce cleaner text safely, they may drive the display; otherwise the source text stays as it is. No free-text parser that could change what a play says. |

## Planned verification

| Check | When | How |
|---|---|---|
| Canonical Game header agrees with every other score surface | Done 2026-09-25 (catch-up review) | `tools/livecheck.js` now draws Game's header at `#game` and from Schedule alongside Home, the schedule row and Top 25, with a negative control that makes only the Game header disagree and must name it. |
| Top 25 Games and Game in a real live state - **launch-critical; the merge waits on it** | Sat Sep 26, 2026, 3:50 PM ET (the 3:30 PM games starting, Notre Dame at Purdue ending) | A one-shot reminder in the Claude session, not a repository schedule: `capture-fixture.yml` has only push and manual triggers. At that time the session pushes `scoreboard-20260926 sep26-live` and `401858467 pur-live` to `tools/fixtures/capture-requests.txt`, which runs the capture; the live renders then come from those payloads. If the reminder does not fire, the capture can be run the same way by hand while games are live. |

## Open product decisions

Both previously listed here (the end-of-season Home and the rivalry source)
are now post-launch follow-ups, above.

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
