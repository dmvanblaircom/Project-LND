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
| Real-live Top 25 + Game verification | **PASS**, Sat Sep 26, 2026, 2:30 PM ET, against production (David moved the release up to the morning of Sep 26). See Planned verification. |
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

**Removed 2026-09-25.** David confirmed they were an abandoned approach and
deleted both Workers (`irish-watch`, `irish-odds`) in the Cloudflare
dashboard. That ends the builds, the failure emails and any stale
`*.workers.dev` copy of the app. Nothing in this repository referred to
them, so nothing here changed. The app's own service worker (`sw.js`) is
unrelated and stays. The Cloudflare GitHub App may still be installed on
the account (github.com/settings/installations); with no Workers left it
has nothing to build, and removing its access to this repository is
optional cleanup.

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

### First open after the deploy (2026-09-25, David: "optimize that first reload")

**Before:** the shell is served cache-first, so the first open after a deploy showed the old version, and Suite appeared only on the next open.

**Now:** a new worker that replaces an older version reloads the windows it takes over, once, as soon as it is fully active. It never reloads on a first install. The reload itself is made as fast as possible:
- The fan's team config (read from the old version's team mark) and the render-blocking Google Fonts stylesheet named in `index.html` are precached at install.
- The old version's data and font files are carried over instead of deleted. Home paints from the last copy, and an upgrade no longer wipes a fan's offline data.
- A second install of the same version fetches nothing.
- `skipWaiting()` is called at the start of install.

Measured in a local harness: HTTP/1.1 with 6 connections, so install times are pessimistic next to GitHub Pages' HTTP/2. Times are the old page to Suite's header, then Suite's Home.

| Network | Irish Watch → this release (Sunday) | This release → a later one |
|---|---|---|
| Wifi (30 ms, 5 MB/s) | 3.4 s, then Home at +0.07 s | 2.9 s |
| LTE (80 ms, 1.25 MB/s) | 5.5 s, then Home at +0.07 s | 2.8 s |
| Poor signal (250 ms, 150 KB/s) | 10.1 s, then Home at +0.06 s | not measured |

Once the reload starts, Suite's header draws in about 10 ms and Home in about 60 ms.

What remains before the reload, and why:
- **About 2 s: Irish Watch's page does not ask for the update until then.** Its code is already on fans' phones, and the browser's own update check comes at about the same time. This release's page asks at once (`registration.update()`), which is why later releases are faster.
- **About 1 s: Chrome waits after install before activating.**
- **Sometimes a second install of the same version.** It is triggered by the reload and now costs no downloads.

Under 1 s is out of reach for Sunday's upgrade, because those costs belong to the old code and the browser. The part this release controls (the reload to a drawn Suite) is under 0.1 s.

Regression test: `tools/upgradecheck.js`, in CI. It covers one reload on an update, none on a first install, the team precached, data and fonts carried over with their stored time, and only this version's caches left. Three of its checks fail on the previous worker.

## Post-launch follow-ups (explicit; not started in this release)

| Item | Source | Notes |
|---|---|---|
| Full Suite Style / Pearl token mapping and broader final brand integration | More rebuild; catch-up review 2026-09-25; **Suite + TeamOS Brand System v1, locked 2026-09-25** (the package is kept outside the repository) | **Locked by Brand System v1:**<br>- Palette: Ink `#111D35`, Pearl `#F1F2F0`, Champagne `#D4B896`, Bronze `#B8845A`, Slate `#485563`, Charcoal `#1A1A1A`. Champagne and Bronze are small accents, never the main action colour, and there is **no cobalt action system**.<br>- Type: Neue Haas Grotesk primary and Canela accent (commercial; web licences to be bought, no font files bundled); **not Barlow** for Suite.<br>- Team Style stays the default and untouched.<br>- The simple wordmark stays in the dense header; the horizon lockup is for spacious brand moments.<br>- The flat Pearl S is the app icon (Bronze halo only if David chooses it).<br>- TeamOS stays out of the consumer UI.<br><br>**Checked against this release on 2026-09-25:** the wordmark glyph paths and the icon's S match what ships. The package's wordmark canvas is 662×150 (18 px of extra bottom padding) against the shipping 662×132, and its flat icon has rounded, transparent corners where the PWA icons are full-bleed. Installed icons need full-bleed because the operating system masks them, so the shipping files stay.<br><br>**What the pass must change:**<br>- `Suite.ui.STYLE` cobalt `#2F5BEA` / `#2A52D6` and champagne `#E4CF9E`<br>- `--s-chrome` `#0B1F3A`<br>- the `--s-*` surface and ink tokens<br>- Barlow under Suite Style The full token mapping is not approved: the provisional ink/cobalt/champagne `Suite.ui.STYLE` stays until a deliberate brand-system pass. That pass is more than the ten colour roles: Pearl belongs to the light surfaces and on-dark text (`--s-page`, `--s-surface`, `--s-on-dark` in `app.css`). Map each approved colour to explicit roles, decide Pearl's placements, update first-paint handling, recheck contrast and keep Team Style untouched; produce the Pearl logo variants in the same pass. *Was release-blocking; moved post-launch 2026-09-25.* |
| Season Outlook "View full field" | Home review, 2026-09-24 | The locked Home references have it and the full-market data exists (the Kalshi markets). Build it as a Suite light-theme experience; do not route the new Home into the removed pre-canonical board. *Was release-blocking; moved post-launch 2026-09-25.* |
| Rivalry names, trophies and concise rivalry context | Game review, 2026-09-24 | Needs a trustworthy, scalable source (parked by Product/Design). Today only the trophy name from team configuration is shown; no generic copy, and no one-team rivalry database in Suite. *Was release-blocking; moved post-launch 2026-09-25.* |
| End-of-season / offseason Home | Open since the Home review | **Resolve by mid-November.** `TeamOS.game.hero` chooses no game (`reason: "season-over"`, `game: null`, `last` reported) and Home draws no game card - an interim safe rendering only. Product/Design define the real state. |
| Safe presentation of play text | Game review, 2026-09-24 | ESPN's raw play text ("(02:51) No Huddle-Shotgun #2 N.James Jr. rush left...") reads awkwardly. Where normalized structured play fields can produce cleaner text safely, they may drive the display; otherwise the source text stays as it is. No free-text parser that could change what a play says. |

## Planned verification

| Check | When | How |
|---|---|---|
| Canonical Game header agrees with every other score surface | Done 2026-09-25 (catch-up review) | `tools/livecheck.js` now draws Game's header at `#game` and from Schedule alongside Home, the schedule row and Top 25, with a negative control that makes only the Game header disagree and must name it. |
| Top 25 Games and Game in a real live state | **PASS - Sat Sep 26, 2026, captured 18:30Z (2:30 PM ET)**, after Suite went live that morning at David's request | Real payloads captured by `capture-fixture.yml` and committed: `espn-scoreboard-sep26-live.json` (sha256 `eebdf3bccda7ea60…`), `espn-summary-pur-live.json` (ND at Purdue, 1st 4:37, 0-0; `ddd18982946edf70…`), `espn-summary-osu-ill-live.json` (Illinois at Ohio State, 3rd 9:35, 13-28; `e76868bfd63eac1b…`). The real app was rendered against them with the clock fixed at the capture time, at 390 and 320: ND Game (header 0-0, 1ST · 4:37, 2nd & 3 at PUR 27, Purdue 1-2, the football on Notre Dame's side, "Notre Dame drive" on the Drive Tracker), ND Home (the same score and clock), Top 25 Games (17 games with a ranked team, live pills, clocks, scores and last plays, no odds). No page errors. The OSU-Illinois summary through the adapter: Illinois has the current drive (drawn in Illinois orange `#FF5F05`), no side flagged with the ball after a kickoff touchback. **Found and fixed during the verification** (`fix/header-football`): the Game header had no possession football; and when the scoreboard is first to say a game is under way, the Game screen's views stayed on the pregame choice (Box Score) until the next schedule poll. Fixed earlier the same day from David's live use: Purdue's record (from the scoreboard), the depth chart "O" and movement arrows, the Drive Tracker in the colour of the team with the ball. |

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
