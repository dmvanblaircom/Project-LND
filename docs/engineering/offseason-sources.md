# Offseason sources: NFL draft and recruiting (W16, 2026-10-02)

David's decisions on the offseason proposal (§7):
- **Idea 6, NFL draft prospects:** probe the sources first, then decide.
- **D4, recruiting:** research each site's terms and data, then draft
  permission emails for David to review. Nothing is sent without him.

Every source below was probed from GitHub's network, the production runner's
(`probe-sources.yml`, four rounds on branch `probe/offseason-sources`). The
probes print what a source returns and store nothing.

## What the sources carry

| Source | From the runner | What it carries | Gaps |
|---|---|---|---|
| **ESPN draft API**<br>`sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/<year>/draft` | 200, JSON | **2027 draft:**<ul><li>Status "Scheduled"; start `2027-04-30T00:00Z`, which is the evening of Apr 29 ET; 7 rounds.</li><li>`/draft/athletes`: a 50-player prospect board (2026's grew to 689).</li><li>Each prospect has a college (a `$ref` with ESPN's team id, so a team filter is exact: Ohio State is 194), position, height and weight.</li><li>Attributes include position rank and overall rank.</li><li>After the draft, each prospect also has a `pick` (round and number) and ESPN's analysis text.</li></ul> | <ul><li>**Grade:** no grade appears on 2027 prospects yet. 2026's had one (e.g. Grade 92), but when ESPN fills it in during the cycle has not been observed.</li><li>**"Projected pick":** none appears; the board is a rank, not a mock draft.</li></ul> |
| **ESPN recruiting API**<br>`sports.core.api.espn.com/v2/sports/football/leagues/college-football/recruiting/<year>` | 200, JSON | Classes 2007-2029.<ul><li>The 2027 list holds 2,837 recruits.</li><li>Each recruit has a high school, position, grade (e.g. 93), and national, position, state and region rank.</li><li>Each recruit also has a `status` object.</li></ul> | <ul><li>Which school a recruit committed to was not reached yet (the `status` object's contents).</li><li>Team class rankings (`/rankings`) hold one item.</li></ul> |
| **NFL.com prospects**<br>`nfl.com/draft/tracker/prospects` | 200, HTML (now at `/2026/prospects`) | 2026 prospects with Lance Zierlein's grades (e.g. 7.04, 6.78) and scouting text. | 2026 only today. HTML, not an API. |
| **On3 / Rivals** (one company since 2025)<br>`on3.com/college/<team>/football/<year>/commits/` | 200, HTML | Notre Dame 2027 (updated 07/23/26):<ul><li>23 high-school commits.</li><li>National rank 2nd, industry rank 1st.</li></ul> | HTML, behind a subscriber layer in places. |
| **247Sports** | **406, refused** (never bypassed) | Nothing readable from the runner. Its owner's (CBS Interactive) terms were readable at `legal.paramount.com`. | |
| **ESPN recruiting and draft web pages** | 202, empty (bot check; never bypassed) | | The JSON APIs above answer instead. |

## Terms (read 2026-10-02, quoted from each site)

| Site | Use allowed | Automated access | Who to ask |
|---|---|---|---|
| **ESPN** (Disney Terms of Use) | "personal, noncommercial use"; no "commercial or business-related use or build a business utilizing the Disney Products" | Not to "access, monitor, copy or extract the Disney Products using a robot, spider, script, or other automated means" without "express written permission" | No public data-licensing contact found |
| **NFL.com** | "solely for your own individual non-commercial and informational purposes" | Bars robots, spiders and other agents used to harvest the Services | No public contact found |
| **247Sports** (CBS Interactive terms) | "personal, non-commercial purposes" | Bars "unauthorized spidering, 'scraping,' data mining" | "If you wish to license Content … please contact us" (4.2 Commercial Licenses) |
| **On3 and Rivals** | "personal, non-commercial use"; commercial use needs "On3's prior written consent" | Bars "scrape, crawl, mine, or collect data … by using any automated tool, bot, spider" | `on3.com/contact/` lists two email addresses (on the page; the runner sees them masked) |

**What this means:**
- **ESPN:** an ESPN-sourced draft or recruiting feature stands on the same terms as every score, schedule and roster the app already takes from ESPN. It adds no new kind of exposure, only more of the same reliance. It falls under David's Oct 2 rule: keep the app as is while it is free, and revisit before a public launch or monetization.
- **NFL.com, 247Sports and On3/Rivals:** none of the three allows an app to collect its data without written permission.

## Recommendation

1. **Idea 6 (draft): build it from ESPN's draft API, for the spring.**
   - Show each of the team's players on ESPN's board with position rank and overall rank, plus ESPN's grade once it appears.
   - Credit it as "ESPN draft board". Show the actual pick and round after the draft.
   - Don't call it a projected pick, because ESPN publishes none.
   - Before building:
     - capture the board monthly to learn when grades appear;
     - read one prospect's `status` and `pick` fields.
2. **D4 (recruiting): ESPN's recruiting API covers the core need without a license:** the class, each recruit's grade and ranks, position and high school.
   - The remaining question is the commitment field. One more probe reads the `status` object.
   - 247Sports and On3 would add their composite and industry rankings. Those need permission, so the emails are drafted for David (not sent).
3. **Hold any email to ESPN.** Asking ESPN for permission raises the whole app's use of ESPN, not just recruiting. That is the launch-or-monetization question David has already deferred.
