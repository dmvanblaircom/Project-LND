# Proposal: Home (and the app) after the regular season

**Status:** decided by David, 2026-10-02 (§7). Claude's proposal of
2026-09-25; the options were laid out in the "Suite offseason: options to
decide" doc. **Deadline:** before Notre Dame's last
regular-season game, **Nov 28, 2026** (at Syracuse). After that, Home falls
into the interim `season-over` state, which draws no game card at all.

Product direction this follows:
- North Star, "Year-Round Destination"
- `06_SUITE.md`, "Offseason": prioritize news, recruiting, roster movement,
  schedule, history and upcoming events
- `product/fan-journey.md` §7: maintain the connection when games disappear

## 1. What the data actually does (captured 2026-09-25, real ESPN payloads)

Captured on GitHub's runner by `capture-fixture.yml` (branch
`stage/offseason-home`, `tools/fixtures/espn-schedule-nd-2024-*.json` and
`-2027`):

| Question | Answer from the payload | Consequence |
|---|---|---|
| Does the team schedule include bowl/CFP games? | **Only when asked for the postseason** (`seasontype=3`). The default call for Notre Dame 2024 returned 12 regular-season games; the 2024 CFP run (Dec 21 vs IU, Jan 2 vs UGA, Jan 10 vs PSU, Jan 20 vs OSU) came only from the postseason call. | **The app asks for the regular season only, so it would never show a bowl or CFP game.** This is a correctness bug for December and January, whatever the design. |
| What does "Week" read for a postseason game? | `Bowls` for every round | The round name (First Round, Quarterfinal, Final, bowl name) is not in the captured, trimmed fields. Check the untrimmed payload's `competitions[].notes` before designing around it. |
| Is next season's schedule published in September? | **No.** The 2027 request returned nothing. | Home cannot promise the opener until ESPN publishes it; *when* ESPN does is unknown and must be observed, not assumed. |
| Does a later season's postseason exist yet? | The 2025 postseason request returned nothing | Either Notre Dame had none or ESPN answers differently. To verify when designing S4. |
| Does the scoreboard carry postseason games? | Yes: the Jan 20, 2025 scoreboard returns the title game, season type 3 | Top 25 keeps working through January. |
| What "current season" does ESPN report? | `season: 2026, type 2` on every response, whatever was asked | Rolling over to the next season needs our own date rule; ESPN's default is not a signal. |

## 2. The states of a season

Using Notre Dame 2026 as the worked example:

| State | When (ND 2026) | What owns the hero today | Proposed hero |
|---|---|---|---|
| **S1 In season** | now → Nov 28 | the game (live, recent final, upcoming) | unchanged |
| **S2 Regular season done, postseason not yet known** | Nov 29 → selection | nothing (interim) | **Season card:** final regular-season record, current ranking, the last result, and "Postseason: to be announced". No invented date: ESPN gives no selection date. |
| **S3 Postseason game scheduled or under way** | selection → last postseason game | nothing, because the game is invisible (§1) | **The postseason game**, the same game card as S1, with the round or bowl name where the data has it |
| **S4 Season complete** | after the last game → next season's schedule appears | nothing (interim) | **Season in review:** final record, the postseason result line, final ranking if the polls publish one, a link to Results. Plus **"Next season"**: the opener once published, otherwise "The 2027 schedule hasn't been released yet". |
| **S5 Next season published** | when ESPN publishes it → opener | nothing, or last season's games | **Countdown to the opener** (the normal upcoming game card, next season's data) |

S2 and S4 are new designs; S3 and S5 reuse the existing game card with new data.

## 3. Home's other sections, by state

| Section | S1 | S2-S3 | S4-S5 (the long offseason) |
|---|---|---|---|
| Latest News | 2nd | 2nd | **1st, directly under the hero**: news is what fans come for between seasons |
| Schedule (last result + next 3, per B3) | yes | Results + postseason | **Results of the season**; next season's first games once published |
| Season Outlook (Kalshi) | yes | yes | only if next-season markets exist in the team's config, otherwise hidden. Never last season's markets. |
| Roster changes, recruiting, transfers | - | - | **Not proposed: no trustworthy source today.** Named in the product docs; needs a source decision like rivalry context (B5). |

## 4. The rest of the app in the offseason

- **Game tab:** with no game to show, it opens the last game played (its box
  score stays useful) with a clear "Season complete" line. It is never
  raised or live, and it never shows an empty screen.
- **Schedule:** opens on **Results** when nothing is left to play.
- **Top 25:** the final polls and the final CFP ranking; Games shows the
  postseason while it runs, then the last week played. Engineering must
  confirm the polls endpoint still answers in the offseason.
- **Roster:** the depth chart and availability report go quiet (no games);
  Roster shows the roster only, and says so.

## 5. Engineering prerequisites (must land before the design ships)

| # | Work | Why | By |
|---|---|---|---|
| P1 | Fetch the postseason (`seasontype=3`) alongside the regular season and merge the two into one season, keeping round and bowl names | §1: bowl and CFP games are otherwise invisible | before the first selection, early December; independent of the design |
| P2 | Our own season rule: which season a date belongs to, and when to start asking for next season | ESPN's `season` field does not move | with S4/S5 |
| P3 | Confirm the polls and Kalshi markets answer in the offseason (capture in January) | S4, Top 25 | with S4 |
| P4 | Untrimmed postseason capture, to find where the round and bowl names live | S3 labels | before the S3 design |

P1 is correctness work and can start in the hardening block; it needs no design.

### Engineering status (2026-10-02)

- **P1 done** (PR #9): the postseason is fetched and joined to the season.
- **P4 done:** a game's note names its bowl or playoff round, word for word: "College Football Playoff Quarterfinal at the Allstate Sugar Bowl - Rescheduled from Jan 1", or "Art of Sport LA Bowl". Captured whole in `tools/fixtures/espn-*-post-notes.json`. `Game.stage` reads it (`docs/03_DOMAIN_MODEL.md`). The league's postseason scoreboard (`seasontype=3`) returns every bowl and playoff game whatever the date asked, which is how selection is known (`TeamOS.espn.postseasonSelected`).
- **The season model is built:** `TeamOS.season.phase` gives S1-S5 from real data, tested against Notre Dame 2024 and 2025 and Ohio State 2025. Notre Dame 2025 had no postseason; its empty postseason reads "not settled" until selection is known.
- **Not yet wired into the app**, and no screen changes: that waits on the S2/S4 designs (§6).
- **Still open:** P2's fetch side (asking for a given season by year, and next season's schedule), and P3 (January polls and markets, a dated check).

## 6. Questions for ChatGPT and David

1. **S2:** lead with the team's season story (record, ranking, the win that
   defined it) or with what's next (postseason to be announced)?
2. **S4 tone:** a quiet, editorial "season in review", or a scoreboard-style
   summary card?
3. Should **the offseason change Home's order** (News first), or keep one
   order all year for familiarity?
4. **Roster movement and recruiting** are core offseason needs, but have no
   source. Park them (like rivalry context), or look for a source now?
5. **Season Outlook in the offseason:** next-season title odds as soon as
   markets exist, or nothing until the preseason?

## 7. Decisions (David, 2026-10-02)

| # | Question | Decision |
|---|---|---|
| 1 | S2 hero: after the last regular-season game, until Selection Day | **The season's story, then what's next:** final regular-season record, current CFP rank, the last result, then "Bowl and playoff selections" with Selection Day's date and time (leagues/, decision 0033). |
| 2 | S4 hero: once the season is over | **A scoreboard-style season card:** final record, the postseason result line, final ranking when published, a link to Results; then next season's opener, or "the 2027 schedule hasn't been released yet". Not an editorial recap. |
| 3 | Home's order in the offseason | **News moves up** to sit under the hero from S4; the in-season order is unchanged. |
| 4 | Roster movement and recruiting | **Parked for now, and pursued:** 247Sports, On3, Rivals and ESPN are a real option. Claude researches each one's terms and data, then drafts permission or licence emails for David to review before anything is sent. |
| 5 | Season Outlook in the offseason | **Next season's markets as soon as Kalshi lists them**, hidden until then; never last season's. |
| 6 | NFL draft prospects (David's idea) | **Probe the sources first** (ESPN's draft data, NFL.com's terms), then decide. |
| 7 | The bottom nav in the offseason | **Seasonal nav:** from S4 until next season, Home, News, Schedule, Roster, More. Top 25 stays through the title game and returns with the preseason AP poll in August; Game returns in the opener's week. A saved link to Game opens the last game played; one to Top 25, the final polls, also reachable from More. |

§4's "rest of the app" is superseded by decision 7 for Game and Top 25;
Schedule opens on Results, Roster shows the roster only, and Stats stays on
the final season, as proposed. A playoff win never sends the season back to
selection: the bracket is fixed, so the season stays S3 until the team's
last game (TeamOS.season.phase).

Next: Claude wires the season state into the app (next season's schedule,
the league's postseason); Codex designs the S2 and S4 cards and the
seasonal nav from these decisions; David reviews renders of each state
before they ship. Due before Nov 28.
