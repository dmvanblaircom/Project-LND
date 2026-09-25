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
| C10 | Stale docs | S | CLAUDE.md "Current State", `01_CURRENT_IRISH_WATCH_ARCHITECTURE.md`, the superseded design docs; `docs/product/` is empty. |
| C11 | Dead files | S | `assets/notre-dame/*` (8 old Irish Watch icons, unused), the stale "7C" comment in `index.html`. |
| C12 | Branch cleanup and branch model | S | 21 branches, most stale (`lnd/phase-*`, `noop-temp`, the duplicate `docs/*`, the abandoned `design/suite-vnext-build`). CLAUDE.md names `project-lnd-platform` for feature work; this release went `design/suite-canonical-v1` → `main`. Where work continues after Sunday. |
| C13 | Uninstall the Cloudflare GitHub App | S (David) | Optional: the Workers are deleted, so the app now does nothing. |
| C14 | Occasional data-refresh failure | S | One scheduled `odds.yml` failure on 9/23; watch for a pattern. |
| C15 | Duplicate browser-test servers | S | Each browser check has its own server and router. |
| C16 | `iw-` storage and header names | S | Internal only; renaming needs a migration. Low. |

## Accepted limits (no action planned)

In `suite-redesign-completion.md` under Known provider limits:
- ESPN gives no rescheduled date for a postponed game.
- ESPN gives no CFP release date.
- Chrome adds about 1 s before a new version activates.

## Decisions

Answers and the resulting roadmap are recorded here as David makes them.
