# Around: data availability and implementation feasibility audit

**Status:** research only, for David's review. 2026-11-13. Nothing here is approved scope, and nothing was built, changed or added to produce it.

**How to read it.** Every claim carries a label:

- **FACT (repo):** verified in this repository on 2026-11-13 (file path given).
- **FACT (captured):** verified in a real provider payload kept in `tools/fixtures/` or in a committed snapshot under `data/`.
- **REPORTED:** stated by an outside source found by web search. The primary page could not be opened from this session (its network policy blocks those hosts), so the wording comes from search-result extracts. Treat as a strong lead, not as verified.
- **ASSUMPTION** and **RECOMMENDATION** are marked as such.

**Limits of this audit.** The development environment cannot reach ESPN, Kalshi or CollegeFootballData. Endpoints Suite does not already read have not been called. Six ESPN endpoints need one read-only probe from the production runner before anything is designed on them (section 10, item 1).

---

## 1. Executive summary

1. **Around → My Team can be built almost entirely from data Suite already has.** Schedule, conference games, games that matter, rankings context, playoff and title odds, the team's recruiting class, news and the game-notes facts are all in hand for all 138 teams (notes for 9).
2. **Around → College Football is realistic as five sections, not eleven.** Scoreboard, rankings, the playoff field and the national markets are in hand today. Conference standings and a national headline feed are a modest extension, pending the probe. That is a coherent national product.
3. **Three proposed areas have no structured source in hand: the transfer portal, the coaching carousel and recruiting targets.** Today Suite has headlines about them, not data. A structured portal needs a new integration: CollegeFootballData's portal endpoint (cheap, terms and freshness unverified) or a licensed feed such as Sportradar's (contract pricing). A structured coaching carousel does not appear to exist as a feed at any price found.
4. **Awards are seasonal and thin.** ESPN lists winners after the fact (unprobed). In season the only live signal found is Kalshi's Heisman market.
5. **Two licensing risks sit under the whole product, and Around → College Football deepens both.**
   - **ESPN.** Its terms allow "personal, noncommercial use" and bar automated extraction without written permission (**FACT (repo)**: `docs/engineering/offseason-sources.md`). David's rule of 2026-10-02 stands: keep the app as is while it is free, revisit before monetization or wider promotion. A national destination is nearly 100% ESPN data.
   - **Kalshi.** **REPORTED:** Kalshi's Developer Agreement v1.1 limits API use to "facilitating a member's own trading" and bars sharing API data with third parties "without prior written authorization". Suite already publishes Kalshi prices as files in a public repository and on the public site. No review of Kalshi's terms is recorded in the repository. This needs David's attention before any more Kalshi markets are added (section 10, item 2).
6. **Where Suite must not make claims:** clinching and elimination in conference races, a projected playoff bracket before Selection Day, "verified" developments, a national recruiting class ranking of its own, and why a player left a roster.

**Recommended scope in one line each** (sections 8 and 9):

- **My Team:** Season Outlook and standing, our conference (standings after the probe), games that matter, rankings and playoff context, the recruiting class, the wire once it clears its 90% gate.
- **College Football:** Scoreboard, Rankings, Playoff (CFP rankings, seeds and bracket once set, the odds field), Conferences (after the probe), Headlines (after the probe). Transfer portal, coaching carousel, recruiting and awards are not sections yet.

---

## 2. Existing Suite and TeamOS data inventory

All **FACT (repo)** unless marked.

### 2.1 Normalized models

| Model | Where | What it holds | Coverage |
|---|---|---|---|
| `Game` | `teamos/espn.js` `schedule()` | One team's game, from its side: us/them, home/away, result, broadcast, odds, series | The selected team, regular season and postseason |
| `LeagueGame` | `teamos/espn.js` `scoreboard()` | A neutral home/away game for league views | The whole FBS week: `scoreboardUrl()` asks for `groups=80&limit=400` |
| `GameDetail` | `teamos/espn.js` `gameDetail()` | Box score, drives, plays, leaders | Any game by event id |
| `Poll` | `teamos/espn.js` `rankings()` | CFP, AP and Coaches, 25 rows each | National |
| Poll history | `data/league/rankings-2026.json`, `tools/producers/rankings_history.py` | Kept weeks: AP 11, Coaches 11, CFP 2, FPI 10 | National, this season |
| `Rating` | `teamos/ratings.js` | FPI (`data/league/fpi.json`, all 138 teams) and SP+ (edge API, top 25) | National |
| Around layers | `teamos/around.js` `layers()` | Our conference's games, games that matter (opponents, rivals, poll neighbours), Top 25 games | Any team, from its own data |
| Season Outlook | `teamos/outlook.js`, `teamos/markets.js` | Playoff % and title % with change; `field()` gives every team an event prices | 59 of 138 teams have a Kalshi match in config; the files hold 61 playoff and 53 title markets |
| `RecruitClass` | `teamos/prospects.js`, `data/<team>/recruits.json` | Committed recruits: name, position, high school, grade, national, position and state rank, status | 138 teams; class of 2027; median 18 recruits; one team has none |
| `DraftClass` | `teamos/prospects.js`, `data/league/draft.json` | ESPN's draft board with each prospect's college; picks after the draft | League-wide, 50 prospects today |
| `NewsItem` | `teamos/espn.js` `news()`, `data/<team>/news.json` | Headline, link, source, summary, image, time | 138 teams; 1 to 6 beat feeds each (median 3); 2 to 60 kept stories (median 25) |
| The wire | `teamos/wire.js` | Classifies a headline into 7 status kinds | Groundwork only: not loaded by the page |
| Notes | `teamos/notes.js`, `data/<team>/notes.json` | Pronunciations, captains, honors, series facts, By the Numbers | 2 teams whole; 7 more for pronunciations (PR #258) |
| Availability | `data/<team>/availability.json` | The official availability report | 117 teams |
| Season figures | `teamos/fbs.js`, `data/league/season-stats.json` | Turnovers, yards allowed, two FBS ranks | 138 teams, daily |
| Champion | `teamos/champions.js`, `data/league/champion.json` | The defending national champion | League |
| Calendar | `teamos/season.js` `calendar()`, `leagues/college-football.js` `LEAGUE_CALENDAR` | Next CFP rankings show, Selection Day, bowls day | League |
| Registry | `teams/index.js`, `LEAGUE_CONFERENCES` | Every program's conference, names, ESPN id | 138 teams, regenerated weekly |

### 2.2 Suite screens and components that Around can reuse

| Piece | File | Reuse |
|---|---|---|
| Around itself (route `#top25`) | `suite/top25.js` | Two views today: Games and Rankings (CFP, AP, Coaches, FPI, SP+, any kept week) |
| Any game in a sheet | `suite/top25.js` (`#top25/games/<event id>`), `suite/game.js` | A national scoreboard row can open the full game without new work |
| Scoreboard component | `suite/scoreboard.js` | Built in Stage 1b for the redesign |
| Season Outlook and its full field | `suite/outlook.js` | The "View full field" list is a national market view already |
| Recruiting and Draft cards | `suite/prospects.js`, `suite/offseason.js` | Live out of season |
| News list | `suite/more.js` (News) | Headline rows with source and time |
| Your Teams | `suite/favorites.js` | A fan's starred teams (decision 0036) could mark rows in national lists |

### 2.3 What is team-only versus national today

| Have nationally | Have per team only | Have for a few teams |
|---|---|---|
| Scoreboard, rankings and their history, FPI, SP+ top 25, Kalshi title and playoff fields, draft board, season figures, calendar, champion | Schedule, roster, news, recruiting class, availability (117), odds history (59) | Game notes (9), depth chart (1) |

### 2.4 Work already in progress that touches Around

- **F2** (backlog): conference standings "after a source probe" and the out-of-season sections. The probe has not been run.
- **F1**: the wire. Measured at 88.1% precision on 2026-11-09; the gate is 90% on headlines published after 2026-11-10. Not shipped.
- **F3**: live refresh on Around's games.
- **Parked for Around** (backlog §4): former players in the NFL; the wire's Phase 2 sources (Bluesky, Sleeper, RotoWire, SportsDataIO quotes).

---

## 3. Provider and integration inventory

All **FACT (repo)**.

| Provider | Path | What Suite reads | Key, cost | Terms on record |
|---|---|---|---|---|
| **ESPN site API** `site.api.espn.com/apis/site/v2/sports/football/college-football` | Browser, and producers | Schedule, scoreboard, summary, rankings, team, roster, team news, team statistics | None, free, unofficial | "personal, noncommercial use"; no automated extraction without written permission (`docs/engineering/offseason-sources.md`) |
| **ESPN core API** `sports.core.api.espn.com/v2/...` | Browser and producers | Season statistics, leaders, recruiting, draft, FPI history | Same | Same |
| **ESPN FPI** `site.web.api.espn.com/apis/fitt/v3/.../powerindex` | Producer (`fpi.py`) | Rating, rank, 7-day change | Same | Same |
| **Kalshi** `api.elections.kalshi.com/trade-api/v2` | Producer (`markets.py`) → committed files | Title (`KXNCAAF`) and playoff (`KXNCAAFPLAYOFF`) events | None used | **None recorded.** See section 5 |
| **CollegeFootballData** | Edge Worker (`worker/src/index.js`) | SP+ only (decision 0044) | Key in the Worker; free tier, about 1,000 calls a month, exhausted until reset | Display allowed, publishing as files not (decision 0030) |
| **Beat feeds (RSS/Atom)** | Producer (`beat_news.py`) | Headlines and links, per team | None | Headline and link only; never article text |
| **School sites** | Producers | Game notes, depth chart, availability PDFs | None | Official publications; facts only |
| **HD Intelligence** (conference availability) | Producer | Conference availability reports | None | The conferences' public report endpoints; no terms review recorded |
| **Open-Meteo** | Browser | Weather | None | Open |
| **NCAA.com** | Never a source | Referee for accuracy checks only | n/a | Terms forbid republishing (decision 0044) |

**Refresh mechanisms:** the browser polls ESPN directly; `odds.yml` runs at :07 and :37 from the Worker's clock and commits snapshots per team; the Worker serves keyed data and push alerts. There is no database and no backend beyond the Worker (CLAUDE.md: none to be added without a concrete product need).

---

## 4. Content-area availability matrix

Categories as the brief defines them: **Now** (available now), **Reuse** (reusable with presentation changes), **Extend** (modest extension), **New** (requires a new integration), **Uncertain**, **Not practical**.

| Content area | My Team | College Football |
|---|---|---|
| Scoreboard and schedules | **Now** | **Reuse** |
| News and editorial | **Now** | **Extend** (probe) |
| The wire | **Extend** (gated at 90%) | **Uncertain** |
| Playoff picture | **Now** / **Reuse** | **Reuse**; a projected bracket is **Not practical** |
| Conference standings and races | **Extend** (probe) | **Extend** (probe) |
| National rankings | **Now** | **Now** |
| Recruiting | **Now** for commits; targets **Not practical** | **Extend** for a national board; class rankings **Uncertain** |
| Transfer portal | Headlines only; structured is **New** | **New** |
| Coaching changes | Headlines only; current coach **Extend** (probe) | **Not practical** as structured data |
| Awards and honors | **Extend** (probe); notes honors for 2 teams | **Extend** (probe), seasonal |
| Kalshi markets | **Now** (59 teams) | **Now**; more markets **Extend**, subject to terms |

### 4.1 Scoreboard and schedules

- **My Team: Now.** The team's schedule is a screen (`suite/schedule.js`); Around already lists the conference's games and the games that matter (`teamos/around.js`).
- **College Football: Reuse.** **FACT (repo):** the app already downloads the whole FBS week (up to 400 games) and throws most of it away, keeping ranked, conference and "matter" games. Showing all of it is a presentation change. Any row can open the full game sheet.
- **What is missing:** other weeks. The scoreboard is fetched for the current week only; week-by-week browsing needs a `week=` or `dates=` request (**Extend**; the postseason board already does this, `postseasonBoardUrl()`). FCS games are not in `groups=80`.
- **Risk:** a 60-game list with no lens is ESPN's scoreboard, done better by ESPN (**FACT (repo)**: the argument in `docs/product/around-your-team-brief.md`). Grouping by conference, with the fan's teams marked, is what Suite adds.

### 4.2 News and editorial

- **My Team: Now.** ESPN team news plus 1 to 6 beat feeds per team, filtered to football.
- **College Football: Extend, after a probe.** **ASSUMPTION:** ESPN's news endpoint without the `team` filter returns national college football headlines; Suite reads it only with `?team=` today (`newsUrl()`), and no national payload has been captured. National RSS feeds can go through the existing producer, but there is no league-level news snapshot: every news file is a team's.
- **Headline versus data:** this is headlines and links out. Suite has no editorial of its own and should not present it as such.

### 4.3 The wire

- **My Team: Extend, gated.** The classifier exists and is tested but not shipped: 88.1% against a 90% gate. Its sources are the team's own stories, so which team a headline is about is never in question.
- **College Football: Uncertain.** Three gaps: no national headline source in hand (4.2); the classifier has never been measured on national headlines; and nothing resolves which team or player a national headline is about, which a national wire needs for filtering and for marking a fan's teams.
- **Claim to avoid:** "verified". The wire labels an outlet's headline; it verifies nothing (`teamos/wire.js`: "the kind is a label beside it, never a claim of its own").

### 4.4 Playoff picture

- **My Team: Now / Reuse.** CFP rank, the teams within three places (`around.js`, `NEAR = 3`), kept weeks of the rankings, playoff % and title % with change, the date of the next rankings show and Selection Day.
- **College Football: Reuse.**
  - CFP Top 25, weekly, with history.
  - **FACT (captured):** the rankings payload carries "College Football Playoff Seedings", 12 entries, once the field is set (`tools/fixtures/espn-rankings-cfp-20260114.json`). There is no normalized seeding or bracket model: the adapter treats any poll named "playoff" as "CFP" (`teamos/espn.js` `pollOrder`).
  - The postseason board gives every bowl and playoff game once set (`postseasonBoardUrl()`).
  - Kalshi's playoff field: 61 teams priced.
- **Not practical: a projected bracket before Selection Day.** "If the season ended today" needs each conference's champion, which nobody publishes as data before the title games. Suite would be making its own projection and presenting it beside the committee's rankings.
- **Uncertain:** ESPN's FPI playoff probabilities. ESPN publishes them on its site; whether the feed Suite reads carries them is unverified (the producer keeps only rating and rank).

### 4.5 Conference standings and races

- **Partly in hand. FACT (captured):** every team on the week's scoreboard carries its conference record (`records[]`, type `vsconf`) and each game says whether it is a conference game (`conferenceCompetition`) (`tools/fixtures/espn-scoreboard-*.json`). The registry knows every team's conference.
- **Why that is not enough:** a team on a bye is not on that week's scoreboard, so a table built from it has holes.
- **The complete source needs the probe.** **REPORTED:** ESPN serves standings at `sports.core.api.espn.com/v2/sports/football/leagues/college-football/seasons/{year}/types/{type}/groups/{group}/standings` (the cfbfastR package documents it, with overall, home, away and conference splits). A second route on the site API is documented for other sports only. Neither has been called by us. Backlog F2 already says "after a source probe".
- **Claims to avoid:** "clinched", "eliminated", "controls its destiny", and tiebreaker order. Each conference has its own tiebreak rules and Suite has no authoritative source for their outcome. Show the table; let the fan read it.
- Independents (Notre Dame, UConn) have no table. That is already handled as a state (`around.js`).

### 4.6 National rankings

- **Now, both.** CFP, AP, Coaches, FPI and SP+ are on screen with kept weeks.
- **Freshness limit:** SP+ is served from the kept table and marked stale until CollegeFootballData's monthly allowance resets (backlog; check scheduled for Dec 2).

### 4.7 Recruiting

- **My Team commits: Now.** All 138 teams, refreshed daily, the Recruiting card is live.
- **My Team targets: Not practical.** **FACT (repo):** on the record probed, ESPN lists 21 of 22 schools as "Undecided", and the producer's own rule is that appearing in a recruit's school list "means nothing" (`tools/producers/prospects.py`). Offers and visits are 247Sports and On3 products.
- **National board: Extend.** **FACT (repo):** ESPN's class of 2027 holds 2,837 recruits, each with a national rank, grade, status and committed school (`docs/engineering/offseason-sources.md`). A national top-100 or top-300 with commitments is the same producer pattern. Cost: each record is fetched on its own.
- **National class rankings: Uncertain.** ESPN's API as read gives no team class rank. Suite could add up ESPN's grades, but that would be Suite's ranking, not ESPN's, and fans know the 247Sports Composite and On3 Industry numbers. Those need permission: requested 2026-10-24, no answer (**FACT (repo)**: backlog §4).
- **Stars:** read off ESPN's published grade scale and credited to ESPN (`teamos/prospects.js`).

### 4.8 Transfer portal

- **In hand: headlines only**, through the wire's "transfer" kind once it ships.
- **Structured data requires a new integration.** Options found:

| Option | What it offers | Access and cost | Open points |
|---|---|---|---|
| **CollegeFootballData** `/player/portal` | **REPORTED:** portal entries by year: player, origin, destination, rating, eligibility | Existing key and Worker. **REPORTED:** free 1,000 calls a month; paid $1 (5,000) to $30 (500,000); commercial use allowed on every tier; redistribution as a standalone dataset, bulk download or substitute API forbidden | Upstream source and update speed unverified. Must be served through the Worker, never as committed files |
| **Sportradar NCAA Football v7** | **REPORTED:** a Transfer Portal endpoint ("all players currently in the NCAA Transfer Portal", 4-hour cache) and a Daily Transactions endpoint (portal moves, commitments, releases, suspensions) | Licensed; trial key; price by contract, not published | Cost unknown. A money and keys decision (David's, decision 0039) |
| **On3, 247Sports** | The trackers fans use | Written permission required; automated access barred (**FACT (repo)**) | Permission requested for recruiting stars, unanswered |
| **ESPN** | No portal endpoint known | | |
| **Roster difference** | Suite could notice a player leaving ESPN's roster | In hand | Cannot say why he left. Suite must not call it a transfer |

- **Freshness matters more here than anywhere.** Portal windows move by the hour. A source that trails by a day is worse than a headline.

### 4.9 Coaching changes

- **My Team: headlines** (the wire's "coaching" kind). **Current head coach: Extend, after a probe.** **FACT (captured):** ESPN's core team record links a `coaches` resource (`tools/fixtures/espn-coreteam-miami-2026.json`); its contents have not been read.
- **National carousel: Not practical as structured data.** **REPORTED:** no API or dataset was found; the trackers are editorial pages (FootballScoop, CBS Sports, ESPN, AP), and their terms bar collection. Comparing ESPN's coach for 138 teams day to day would detect that a head coach changed, late, with no reason, no interim, no coordinators and no candidates. That is not a carousel.
- **RECOMMENDATION:** coaching changes are wire content, not a section.

### 4.10 Awards and honors

- **My Team:** honors and watch lists from the game notes for the 2 teams read whole. **Extend, after a probe:** the core team record links an `awards` resource (**FACT (captured)**, same fixture; contents unread).
- **College Football: Extend, after a probe.** **REPORTED:** ESPN's core API lists a season's awards (about 32, the Heisman among them) with each winner, at `.../seasons/{year}/awards`.
- **Limits:** winners only, after the fact, concentrated in one week of December. No finalists, semifinalists or watch lists as data. In season this section would be empty.
- **In season:** Kalshi lists a Heisman market (**REPORTED:** about 49 priced candidates, series `KXHEISMAN`). Subject to section 5.

### 4.11 Kalshi markets

- **Now:** title and playoff, per team (Season Outlook, with history for 59 teams) and as full fields.
- **Extend:** **REPORTED:** Kalshi also lists conference championship winners (SEC, Big Ten, Big 12 and several Group of Five conferences) and the Heisman. Adding one is a line in `LEAGUE_MARKETS` plus a card; tickers unverified.
- **Not included:** game lines come from ESPN and are treated as media metadata (decision 0025). Suite never links to or prices a bet.
- **Blocked on terms** before any growth: section 5.

### 4.12 Other Suite capabilities that could belong in Around

| Capability | Where it is today | Fit |
|---|---|---|
| Rankings history (a team's line through the weeks) | `data/league/rankings-2026.json` | My Team: rank trend |
| Defending champion | `teamos/champions.js` | College Football: a line in Playoff |
| Draft board by school | `data/league/draft.json` | College Football, spring: picks by school and conference |
| Season figures and FBS ranks | `data/league/season-stats.json` | College Football: two honest leader tables (turnover margin, passing offense). Nothing more without new ranks |
| Next opponents' recruiting classes and records | In hand (brief) | My Team, out of season |
| Your Teams | `suite/favorites.js` | Marks a fan's teams in every national list |

---

## 5. Source references and licensing considerations

| Source | Finding | Label | Reference |
|---|---|---|---|
| ESPN | "personal, noncommercial use"; no automated access without "express written permission". Every ESPN endpoint is unofficial and undocumented by ESPN, and can change without notice | **FACT (repo)** | `docs/engineering/offseason-sources.md`; Disney Terms of Use |
| ESPN standings (core route) | Documented by a community package, with record splits | **REPORTED** | <https://rdrr.io/cran/cfbfastR/man/espn_cfb_standings.html> |
| ESPN awards | Season index of about 32 awards with winners; per-team awards | **REPORTED** | <https://rdrr.io/cran/cfbfastR/man/espn_cfb_awards.html> |
| Kalshi market data | Public REST reads (`/markets`, `/events`, `/series`) need no authentication | **REPORTED** | <https://docs.kalshi.com/getting_started/quick_start_market_data> |
| Kalshi Developer Agreement v1.1 | "Use of Kalshi APIs is expressly limited to facilitating a member's own trading"; no "collecting, caching, aggregating, or storing" API data except for that purpose; no sharing with third parties "without prior written authorization from Kalshi" | **REPORTED** | <https://assets.kalshi.com/Kalshi-Developer-Agreement.pdf> |
| CollegeFootballData terms | Commercial use allowed on all tiers; caching allowed; redistribution of the data itself as a dataset, bulk download, mirror or substitute API forbidden | **REPORTED** (consistent with decision 0030) | <https://collegefootballdata.com/terms> |
| CollegeFootballData tiers | Free 1,000 calls a month; $1 (5,000), $10 (75,000), $15 (125,000), $20 (200,000), $30 (500,000); shared with its basketball API | **REPORTED** | <https://collegefootballdata.com/api-tiers> |
| CollegeFootballData portal, recruiting, coaches | `/player/portal`, `/recruiting/players`, `/recruiting/teams`, `/coaches` | **REPORTED** (third-party client docs) | <https://apinext.collegefootballdata.com/data-availability> |
| Sportradar NCAA Football v7 | Transfer Portal and Daily Transactions endpoints; FBS coverage; trial key | **REPORTED** | <https://developer.sportradar.com/football/reference/ncaafb-transfer-portal>, <https://developer.sportradar.com/football/reference/ncaafb-daily-transactions> |
| SportsDataIO | College football scores, stats, odds, projections, news; licences quoted per client; trial data is scrambled. No standings, rankings or portal feed confirmed | **REPORTED** | <https://sportsdata.io/ncaa-college-football-api>, <https://sportsdata.io/help/data-rights-and-licensing-questions> |
| On3 / Rivals, 247Sports | Personal, non-commercial use; scraping barred; commercial licences by request | **FACT (repo)** | `docs/engineering/offseason-sources.md` |
| NCAA.com | Terms forbid republishing | **FACT (repo)** | decision 0044 |
| Coaching trackers | Editorial pages only; no API or dataset found | **REPORTED** | <https://footballscoop.com/2025/09/24/2025-2026-nfl-and-college-head-coaching-changes-page-fbs-fcs-division-ii-division-iii-naia-head-coaches>, <https://www.cbssports.com/college-football/news/college-football-coaching-carousel-tracker-grades-analysis-on-coach-changes-2025-26-firings-and-hirings> |

**Scraping**, kept separate as asked. Reading a site's HTML where no feed exists carries three distinct risks:

- **Legal:** every commercial site named above bars it in its terms. Suite has never bypassed a refusal (247Sports returned 406 and was left alone).
- **Operational:** pages change without notice. The game-notes readers show the cost even for cooperative PDFs: 5 of 29 surveyed layouts were readable by the existing reader.
- **Reliability:** a tracker page is one editor's running list. It has no timestamps per item, no identifiers and no guarantee of completeness.

**RECOMMENDATION:** no scraping for Around. Headlines by RSS (which sites publish for the purpose) and structured data by API only.

---

## 6. Coverage, freshness and reliability

| Data | Coverage | Updates | History | Reliable enough for a premium product? |
|---|---|---|---|---|
| FBS scoreboard | All FBS games in the week | Live; Suite polls every 30 s while live | Other weeks by request | Yes. It is what the app runs on today |
| Rankings | CFP, AP, Coaches | Weekly | Kept by Suite, this season | Yes |
| FPI | 138 teams | When ESPN publishes an edition | 10 kept weeks | Yes |
| SP+ | Top 25 | Weekly; stale until the allowance resets | Kept weeks | Yes when fresh; one provider, one small allowance |
| Kalshi title and playoff | 53 and 61 teams | Every 30 minutes | Odds history, 59 teams | Data yes; permission unconfirmed |
| Team news | 138 teams | Every 30 minutes | 2 to 60 stories kept | Varies by team: one team has 2 stories |
| Recruiting class | 138 teams | Daily | None kept | Yes for commits. ESPN can trail a flip; the producer leaves a mismatched commitment out |
| Conference record | Teams on this week's scoreboard | Live | No | Incomplete alone (byes) |
| Standings, national news, awards, coaches | Unknown until probed | Unknown | Unknown | Unverified |
| The wire | Per team | With the news | n/a | Not yet: 88.1% against a 90% gate |
| Transfer portal, coaching carousel | None in hand | n/a | n/a | No source |

**Conflicting sources to keep apart:** ESPN's season totals disagree with the NCAA's on turnovers (8% agreement), which is why Suite adds up box scores (decision 0044). Any national leader table must use the figures already proven, not ESPN's season totals. Polls and ratings are never blended (`teamos/ratings.js`).

---

## 7. Implementation complexity and dependencies

Sizes are relative, not estimates. S: a presentation change on data in hand. M: one new read through an existing adapter or producer, with fixtures and a check. L: a new provider, key, or terms decision.

| Capability | Size | Depends on |
|---|---|---|
| National scoreboard, grouped by conference | S | Design (R4); F3 live refresh |
| Scoreboard for other weeks | M | A fixture of a `week=` request |
| Rankings, as today | S | Design |
| Playoff: rankings, odds field, calendar | S | Design; Kalshi terms |
| Playoff: seeds and bracket once set | M | A normalized seeding and bracket model (gap); the December payloads |
| Conference standings | M | **The probe.** Then an adapter, fixtures, a check |
| National headlines | M | **The probe**; a league-level news snapshot (gap) |
| National recruiting board | M | A league-level recruits snapshot (gap); a cap on records fetched |
| More Kalshi markets (conference, Heisman) | M | **Kalshi terms**; tickers verified |
| Awards winners | M | **The probe**; seasonal |
| Current head coach per team | M | **The probe** |
| The wire, My Team | M | The 90% re-measure |
| The wire, national | L | National headlines; a new measurement; team and player resolution (gap) |
| Transfer portal, structured | L | A provider decision (money, keys, terms); served through the Worker |
| Coaching carousel, structured | Not practical | No source |
| Recruiting targets, composite rankings | Not practical now | 247Sports or On3 permission |

**Missing models, named only** (none proposed here, as the brief asks): conference standings; playoff seeding and bracket; league-level news; league-level recruiting; awards; coach; a portal entry.

**New operating cost if everything "Extend" were built:** none in money; more ESPN requests from the browser and the half-hourly refresh. The only items that add cost or a key are a licensed portal feed and a paid CollegeFootballData tier.

**Ongoing maintenance to expect:** the calendar and the markets' season rollover (already handled yearly); conference membership (the registry regenerates weekly); any new ESPN read can change shape without notice, which is why each sits behind the adapter with captured fixtures.

---

## 8. Recommended scope: Around → My Team

**RECOMMENDATION.**

**Include with confidence (in hand):**

1. **Where we stand:** Season Outlook (playoff %, title %), rank and its trend, the next CFP rankings show.
2. **Our conference:** this week's conference games (today), and the standings table once the probe confirms the source. No clinch or elimination language.
3. **Games that matter:** opponents past and future, rivals, the teams around us in the poll (today).
4. **Recruiting:** the class, as the Recruiting card shows it, moved or mirrored here out of season.

**Worth extending:**

5. **The wire**, when it clears 90%. It carries transfer, coaching and commitment news as labelled headlines, which is the honest form of those three areas for one team.
6. **Awards and honors** for the team, only if the probe shows ESPN's team awards are populated.

**Wait:**

- A structured portal list (in and out) until a provider is chosen.
- Recruiting targets and composite rankings until permission arrives.
- Former players in the NFL (already parked).

**Combine rather than separate:** portal, coaching and commitments are one feed (the wire), not three cards. A team with nothing in one of them should not show an empty card.

---

## 9. Recommended scope: Around → College Football

**RECOMMENDATION.** Five sections that are full every week of the season, in this order of confidence:

| Section | Contents | Status |
|---|---|---|
| **Scoreboard** | Every FBS game this week, grouped by conference, the fan's teams marked, each row opening the game | In hand |
| **Rankings** | CFP, AP, Coaches, FPI, SP+, with kept weeks | In hand |
| **Playoff** | The CFP rankings and the next show; the odds field; from Selection Day, the seeds and the bracket; the defending champion | In hand, plus a seeding model in December |
| **Conferences** | Standings for all ten conferences | After the probe |
| **Headlines** | National college football headlines, linked out | After the probe |

**Secondary, inside a section rather than a section of its own:**

- **Markets** belong inside Playoff (title and playoff fields), with conference title markets inside Conferences if Kalshi's terms allow. A separate "Markets" section would duplicate both.
- **Awards** belong in Headlines in season and as a short winners list in December, if the probe supports it.
- **Draft picks by school** in spring, in place of Scoreboard's emptiness.

**Defer:**

- **National recruiting** to the out-of-season build (F2b), as a top-recruits board from ESPN. No class rankings of Suite's own.
- **A national wire** until the team wire has shipped and been measured on national headlines.

**Exclude for now:**

- **Transfer portal** as a section: no source in hand; a decision on a provider comes first.
- **Coaching carousel** as a section: no structured source exists.
- **A projected bracket** and any clinch or elimination claims.

**Out of season** the five sections thin out: no scoreboard from mid-January to late August, rankings frozen at the final poll. That is when portal and coaching news is the story, and it is exactly the data Suite lacks. **RECOMMENDATION:** decide the portal provider question before designing the out-of-season national view, or design it honestly around Headlines, the final rankings, next season's markets and the draft.

---

## 10. Open questions and items requiring further validation

1. **One read-only probe from the production runner** (David's go-ahead needed: it is a push to a probe branch, which the brief's guardrails exclude). It prints what each URL returns and stores nothing, as `probe-sources.yml` has done before. Six ESPN reads:
   - conference standings (both documented routes);
   - national news (the news endpoint without a team);
   - a season's awards, and one team's awards;
   - one team's coaches;
   - the FPI feed's projection fields (playoff and conference odds);
   - the scoreboard for a named week.
   Every "after the probe" in this document turns into a fact, either way, within the hour.
2. **Kalshi's terms** (David's decision; money, keys and services are his under decision 0039). The agreement as reported would not cover what Suite already does with Kalshi's prices. Options: read the agreement in full and ask Kalshi for written permission to display prices with credit; or hold Kalshi at today's two markets until that is answered. **RECOMMENDATION:** ask, and add no Kalshi market until answered.
3. **ESPN and a national destination.** The Oct 2 rule covers the app while it is free. Does a national college football destination change who the app is promoted to? If so, the ESPN question comes forward with it.
4. **Transfer portal provider.** If the portal matters enough to be a section: a CollegeFootballData paid tier ($1 to $30 a month, **REPORTED**) tested for freshness in the December window, or a Sportradar quote. Neither is worth pursuing before the product decision that the portal is a section.
5. **247Sports and On3 permission** (sent 2026-10-24): still unanswered. Targets and composite rankings depend on it.
6. **The wire's 90% gate:** re-measure on headlines published after 2026-11-10 (already planned).
7. **Not verified in this audit:** every **REPORTED** row in section 5. The primary pages should be read by a person, or from an environment that can reach them, before any of them carries a decision.
