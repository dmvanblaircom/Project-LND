# Backlog: everything open, in one place

Started 2026-09-25 so that questions and follow-ups raised in chat do not get
buried. Every open item lives here with an id, whatever its size. An item
leaves this list when it is done or David decides against it, and the entry
says which. The roadmap order comes from David's answers (see "Decisions" at
the end); until an item is scheduled it is only listed.

Detail for the redesign release lives in `suite-redesign-completion.md`; this
file points to it rather than repeating it.

## A. This weekend (the release)

| Id | Item | Owner | Notes |
|---|---|---|---|
| A1 | Saturday live verification, 3:50 PM ET | Claude (scheduled) | Top 25 and Game against real live payloads. The merge waits on it. The same capture also tests something the fixtures cannot: that live polling does not multiply requests. |
| A2 | Sunday merge and production verification | Claude | Bring in the latest `main`, mark PR #4 ready, merge. `verify-production.yml` then checks the site, icons, share image, the service-worker version and that no `TEMPORARY-*` file remains. |
| A3 | Real-phone check after the deploy | David | Open the installed app on your iPhone once after Sunday's deploy, and once more if it still shows Irish Watch. Safari's support for the upgrade reload is unverified: at worst Suite arrives on the second open. Also check the home-screen icon. |
| A4 | Chooser header colour | David decides | Today `#0B1F3A`; the locked Ink is `#111D35`. The same token colours the Top 25 heading inside Team Style. |
| A5 | Check-in cadence | David decides | The hourly PR check-ins add noise to the chat. |

## B. Product decisions (David)

| Id | Decision | Context |
|---|---|---|
| B1 | Brand hierarchy: team first or Suite first | The North Star says the team is the product, but today the persistent header and installed name are Suite. Decision 0024 chose that; this is the call to confirm or reverse it. |
| B2 | Odds and betting scope | The North Star lists betting as not required. We show the Kalshi Season Outlook, spreads and totals, and "View full field" is queued. |
| B3 | Primary nav: Top 25 or Schedule | Top 25 (national) has a tab; Schedule (MVP #2) sits under More. |
| B4 | End-of-season / offseason Home | **Due by mid-November.** Today only a safe interim renders. Who designs it: David, ChatGPT or Claude. |
| B5 | Rivalry names and context: source | Needs a trustworthy, scalable source. Only the trophy name from team config shows today. |
| B6 | Play-by-play text cleanup | Structured fields only, or leave ESPN's text as is. |
| B7 | A final game with no score | Home and Game would read 0–0; Schedule now says "Final". |
| B8 | Fonts | Free alternatives to Neue Haas Grotesk / Canela, or buy licences. Claude renders a comparison first. |
| B9 | Suite Style action colour | The brand system bans cobalt; what replaces it (Ink, Bronze, contrast only). |
| B10 | App icon: flat or Bronze halo | Default flat, which is what ships. |
| B11 | Order of the missing MVP pillars | Notifications, basic personalization, lightweight participation. None started. |
| B12 | Next teams / Ohio State completeness | Ohio State lacks the depth chart, availability report, beat news and odds. The chooser lists 138 programs, 2 real. |
| B13 | Refresh Data scope and Feedback origin | Adopted from ChatGPT's recommendation; David may change them. |
| B14 | ChatGPT review of the changes made since its review closed | The Home/Game failure state, the Schedule "Final" row and the update reload. All were engineering fixes David asked for. Log them as "No ChatGPT review" or have ChatGPT review them. |

## C. Engineering

| Id | Item | Size | Notes |
|---|---|---|---|
| C1 | Break up `app.js`'s state and refresh clocks | L | 1,482 lines, about 40 pieces of mutable state, several timers. Where this week's bugs came from. |
| C2 | Team-namespaced data pipeline | M | Snapshot files sit at the repo root and `odds.yml` is Notre Dame only; a second team's snapshots would collide. |
| C3 | An unknown team id falls back to Notre Dame | S | `?team=bogus` opens Notre Dame; it should open the chooser (`index.html` `DEFAULT`). |
| C4 | Kalshi through three free public CORS relays | M | Reliability and privacy risk. Options: our own proxy, or the committed snapshots only. Depends on B2. |
| C5 | The weekly registry job fails every Tuesday by design | S | ESPN answers the standings page with 202 on GitHub's runners, so `roster.yml` ends red weekly: a failure email every week. Make it warn instead, or find another membership source. |
| C6 | Brand pass implementation | M | Tokens, fonts and chooser chrome, after B8/B9. The locked values are in `suite-redesign-completion.md`. |
| C7 | Season Outlook "View full field" | M | After B2. |
| C8 | Capture exceptional game-status fixtures | S | When a real delay or postponement happens. |
| C9 | Commit the release stress harness as a tool | S | The route crawl, outage, storage, offline and upgrade scenarios exist only in the session scratchpad; a manual or nightly workflow would keep them. |
| C10 | Stale docs | S | CLAUDE.md "Current State", `01_CURRENT_IRISH_WATCH_ARCHITECTURE.md`, `04_TEAM_CONFIG.md`'s old per-team asset example, the superseded design docs. (`docs/product/` has six product docs; the earlier note that it was empty was wrong.) |
| C11 | Dead files | S | `assets/notre-dame/*` (8 old Irish Watch icons, unused), the stale "7C" comment in `index.html`. |
| C12 | Branch cleanup and branch model | S | 21 branches, most stale (`lnd/phase-*`, `noop-temp`, the duplicate `docs/*`, the abandoned `design/suite-vnext-build`). CLAUDE.md names `project-lnd-platform` for feature work; this release went `design/suite-canonical-v1` → `main`. Where work continues after Sunday. |
| C13 | Uninstall the Cloudflare GitHub App | S (David) | Optional: the Workers are deleted, so the app now does nothing. |
| C14 | Occasional data-refresh failure | S | One scheduled `odds.yml` failure on 9/23; watch for a pattern. |
| C15 | Duplicate browser-test servers | S | Each browser check has its own server and router. |
| C17 | **Fetch the postseason** | M | **Correctness, before early December.** ESPN returns bowl and CFP games only for `seasontype=3`, and the app asks for the regular season only, so Notre Dame's postseason would be invisible (verified on real payloads, 2026-09-25; see the offseason proposal). Fetch both season types and merge them into one season. No design needed. |
| C18 | **Matchup card: yards allowed without CFBD** | M | CFBD declined on 2026-09-25 to allow its figures as public JSON (a short follow-up asking what it *would* allow is drafted in David's Gmail, in Bill's thread). Free route: add up opponents' rushing and passing yards from ESPN's box score for each game already played, computed in the app. ESPN data only; nothing republished from CFBD. Revisit CFBD if Bill's answer opens a path. **Rank policy (decided 2026-09-25):** computed stats show the value only, no national rank. A real rank would mean computing every FBS team's figure, and ESPN's own rank for these fields is the bogus "Tied-1st". Ranks stay only where the provider publishes a real one. No asterisk on the card. One line in About's Data Sources says points and yards allowed are calculated from ESPN game results. The "better" arrow is rank-driven, so these rows show none; if we want it, compare the two values directly (lower is better). Today's points-allowed row already follows this: the adapter maps it with no rank, confirmed in `adaptercheck.js`. |
| C19 | **Official team fonts, pending permission** | S | Notre Dame: Leahy (display) + Gotham (UI), with Factoria available for headlines. Ohio State: Buckeye Sans / Serif. Named in the team configs but **not loaded** until permission and licences exist; Instrument stays the fallback. Permission emails to brandcenter@osu.edu and licensing@nd.edu go out Monday 2026-09-28, after the Suite release. |
| C16 | `iw-` storage and header names | S | Internal only; renaming needs a migration. Low. |

## Staged for after the release (2026-09-25)

Built off PR #4's head; each opens as a PR into `main` after Sunday's merge.

| Branch | What | State |
|---|---|---|
| `stage/hardening-quick-fixes` | C3 bad team link → own team or chooser; C5 registry job warns instead of failing; C9 `tools/stresscheck.js` + `stress.yml`; C11 dead files removed; `VERSION` bumped | All 24 gates pass; stress pass 681 checks, 0 problems |
| `stage/post-launch-docs` | Rollback runbook (rehearsed), branch cleanup list (**for David's approval**), font and team-first header decision inputs | Docs |
| `stage/offseason-home` | Offseason Home proposal (**for David → ChatGPT**), postseason research captures, a season/type option in `capture-fixture.yml` | Docs, fixtures, workflow |

## Accepted limits (no action planned)

In `suite-redesign-completion.md` under Known provider limits:
- ESPN gives no rescheduled date for a postponed game.
- ESPN gives no CFP release date.
- Chrome adds about 1 s before a new version activates.

## Decisions (David, 2026-09-25)

| Id | Decision |
|---|---|
| B1 | **Team first.** Claude recommends **H1 (team mark and name in the header, no SUITE there)**, with Home's duplicate team name resolved in design; Suite stays the install name, the chooser's header, About and the icon. This goes through the ChatGPT design loop. |
| B1 (original answer) | **Team first.** The team leads the header and identity; Suite becomes the quieter platform brand. This reverses decision 0024's Suite-led header, so it needs a design proposal and a new decision record before building. |
| B2 | **Odds stay as they are.** Build "View full field" after launch. "Betting is not MVP" meant *placing bets in Suite*, not showing odds; the North Star is updated to say so. |
| B3 | **Nav stays as is** (Top 25 keeps its tab). Home's schedule preview becomes the **last result plus the next 3 games** (four rows), with a **"View Full Schedule"** link that opens Schedule directly. The **Game screen gets a "Full Schedule" link**. |
| B4 | **Offseason Home:** Claude proposes, ChatGPT reviews and critiques, ChatGPT designs, David approves, Claude implements. Due by mid-November. |
| B7 | A final without a score says **"Final", with no score, on Home and Game too**. |
| B8 | **Fonts decided 2026-09-25: Instrument Sans (with its width axis condensed for the display role) + Instrument Serif**, free under the SIL Open Font License and self-hosted. They become the Suite's own fonts **everywhere**: Suite Style, and the fallback in Team Style for any team without its own licensed font (Notre Dame and Ohio State today). Team colours and identity are untouched, and a team's real brand font (e.g. Ohio State's BuckeyeSans once licensed) still overrides. Neue Haas Grotesk / Canela are not bought. Inputs and renders: `docs/design/fonts-and-team-first-header.md` (on `stage/post-launch-docs`). Built in the brand pass. |
| B11 | **Notifications** are the first MVP pillar. |
| B12 | **Finish Ohio State** as a complete destination before adding more teams. |
| B14 | The release-hardening changes are logged as **No ChatGPT review** (`pending-design-review.md`, item 4) and reviewed after launch. |
| A4 | Chooser header to Ink **in the brand pass**, not before Sunday. |
| A5 | PR check-ins every **4 hours, silent** unless something needs action. |
| C3, C5, C9, C11, C10 | Approved as small fixes in the hardening block. |
| C12 (list) | **Branch cleanup list approved by David, 2026-09-25** (`docs/engineering/branch-cleanup.md`). Runs right after Sunday's merge: 3 archive tags, the rest deleted. |
| C12 | **`main` plus short branches**, a PR into `main` each. Retire `project-lnd-platform` and `project-lnd-foundation` to archive tags; delete stale branches after David approves the list. CLAUDE.md's branch section is updated to match. |

Still open, decided when their block starts:
- B5, rivalry source
- B6, play-by-play text
- B9, the action colour that replaces cobalt (brand pass)
- B10, the icon (the flat default stands until then)
- B13, Refresh scope and Feedback origin

## Roadmap

Sequence, not dates. The only fixed dates are this weekend and the offseason Home's mid-November deadline. A block starts when the one before it is done, except the offseason proposal, which runs alongside hardening so the deadline holds.

| # | Block | Items | Notes |
|---|---|---|---|
| 0 | **Release** (this weekend) | A1 Saturday live check, A2 Sunday merge and production verification, A3 your real-phone check | Nothing else goes into PR #4. |
| 1 | **Engineering hardening** (first after launch) | C1 `app.js` state and refresh clocks, C2 team-namespaced data pipeline, C4 replace the public Kalshi relays, C3 bad team link → chooser, C5 registry job warns instead of failing, C9 stress harness as a tool, C11 dead files, C10 stale docs, C12 branch cleanup, B7 "Final" with no score | C2 is a prerequisite for finishing Ohio State (block 6). C4 keeps odds working (B2) without the free relays; the approach is chosen at the start of the block. |
| 1b | **Offseason Home proposal** (alongside block 1) | B4 | Claude's proposal → ChatGPT critique → ChatGPT design → David → implementation, landing before mid-November. |
| 2 | **Schedule access and the team-first header** | B3 Home preview (last result + next 3, "View Full Schedule"), B3 Game "Full Schedule" link, B1 team-first header | B3 is small and can ship first. B1 goes through a design proposal and ChatGPT review. |
| 3 | **Offseason Home build** | B4 implementation | Must ship before mid-November. |
| 4 | **Brand pass** | B8 font renders + licence research → decision, B9 action colour, A4 chooser Ink, C6 tokens, B10 icon | Team Style stays untouched. |
| 5 | **Notifications** | B11 | Web push for the installed PWA. Needs a small push-sending service, the first real backend; its shape is decided at the start of the block. |
| 6 | **Finish Ohio State** | B12 | Depth chart, availability, beat news and odds on the namespaced pipeline. |
| 7 | **Season Outlook "View full field"** | C7 | Odds as they are, expanded. |
| - | **Parked** | B5, B6, B13, C8 (when it happens), C13 (David, optional), C14 (watch), C15, C16 | Picked up when relevant. |
