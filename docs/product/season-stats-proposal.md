# Proposal: full season stats, team and player

**Status:** Claude's proposal, 2026-10-01, for David. David asked for full
team and individual season stats, and for historical stats (per team, per
player) to be queued after them. It is not approved and not scheduled.

**Today:** season figures appear in one place only. That is Game, before
kickoff: the Matchup card (nine season averages with national ranks) and
Leaders (season). Once a game starts, every stat on screen is for that game.
No screen shows a team's or a player's season.

## 1. Recommendation

Build one new destination, **Stats**, owned by More like Schedule (decision
0028). It has two views:

- **Team:** the team's full season, grouped Offense / Defense / Special
  teams / Situational. Each figure shows its per-game value and its
  national rank where the feed ranks it. The current opponent's column
  sits beside it during game week.
- **Players:** season leaders by category (Passing, Rushing, Receiving,
  Defense, Kicking and Punting), each a full table sorted by the category's
  main figure. These are the same tables Box Score draws for one game, so
  the component already exists.

Two links point to it: one from More, and "Full season stats" under
Game's Matchup card.

**Smallest version first:** ship **Team** alone. Its data is already
fetched for the Matchup card, so it needs no new source, no backend and no
new request. **Players** follows once its source is confirmed (§3).
Historical seasons come after both (§5).

## 2. Where it lives: options

| Option | For | Against |
|---|---|---|
| **More → Stats** (recommended) | One home for the season; follows the Schedule pattern; room for Team, Players and later Seasons | One tap deeper than a tab |
| A fourth Roster view (Depth Chart / Roster / Availability / **Stats**) | Players are already there | Four tabs is tight at 320px; team stats are not about the roster |
| Player pages (tap a player on Roster) | The natural home for one player's line and, later, career | Needs a player page that does not exist; it suits the historical phase better than the first |

Player pages are a good second step. They are where career history (§5)
belongs, and Players rows can link to them once they exist.

## 3. What the data supports

| Need | Source | Status |
|---|---|---|
| Team season stats with national ranks | ESPN core API, `seasons/<year>/types/2/teams/<id>/statistics`, fetched by the browser today (`teamSeasonStats()` in app.js, `TeamOS.espn.seasonStats()`) | **Verified for what Matchup reads** (9 rows, in the categories general, passing, rushing, defensive, scoring, miscellaneous). The fixture is trimmed to those, so which other categories the full payload carries (kicking, punting, returns) is Phase 0's first question |
| Points allowed | ESPN publishes `pointsAllowed` as a permanent 0 ranked "Tied-1st" (decision 0011) | **Derived** from the team's own results (`TeamOS.season`), as Matchup does now |
| Yards allowed (rushing, passing, total) | ESPN publishes `yardsAllowed` as a permanent 0 too. CFBD through our edge API (`/v1/cfbd/season`, decision 0030) | **Live** for Matchup. CFBD allows display in the app but not republishing its data as a file, which is why it goes through the Worker |
| Player season stats | ESPN, either a per-team season leaders/statistics call or a per-athlete call, **or** CFBD's player season stats through the Worker | **Not yet verified.** This environment cannot reach ESPN; the first step is to capture real payloads with `capture-fixture.yml`-style workflows on GitHub's runner, as the offseason proposal did |
| Past seasons (team and player) | The same ESPN calls take a season year; CFBD covers past seasons | **Assumed, not verified:** how far back each one goes, and whether ESPN ranks are kept for past seasons |

Traps already known from the Matchup work, which the full view must
handle the same way:
- **sacks** is filed under both passing (allowed) and defensive (made), so
  a bare lookup is ambiguous;
- **thirdDownConvPct** carries a rank ESPN never fills;
- **pointsAllowed** and **yardsAllowed** are placeholders and must never
  reach the screen.

`tools/fixtures/espn-season-stats.json` holds all three.

## 4. How it scales to Ohio State and every team

Every call above is keyed by the provider's team id, which TeamOS already
resolves from the team config. Nothing is per-team code, so Ohio State
gets Stats the day Notre Dame does. A team the Worker has no CFBD figures
for shows the yards-allowed rows as unavailable, never another team's
numbers (decision 0008's rule).

## 5. Queued: historical stats

What David asked to queue:
- a team's past seasons: the same Team view with a season picker;
- a player's career: season by season, on a player page.

Notes for when it is picked up:
- **Data:** past seasons never change. The Worker can cache them for
  good, so history costs one fetch per season per team, ever.
- **Which source:**
  - ESPN, if past seasons answer the same call: free, no new key.
  - Otherwise CFBD, through the Worker, displayed in the app only (its
    condition).
- **Shape:** a season picker on Stats, plus player pages. Player pages
  need the player identity that headshots already established (decision
  0029).
- **Not in scope:** all-time records and program history. Those belong to
  a separate brief, and the offseason proposal's "history" thread may
  cover them.

## 6. Phases and effort

| Phase | What | Effort (Claude) | Needs |
|---|---|---|---|
| 0 | Capture real payloads: full team season stats for ND and OSU, and one player-stats candidate per source | 1 block | A capture workflow run (GitHub's runner can reach ESPN) |
| 1 | **Team** view: every category, ranks, opponent column in game week, link from Matchup | 2-3 blocks | Codex: layout and type |
| 2 | **Players** view: category tables from the confirmed source, reusing Box Score's table | 2-3 blocks | Phase 0's answer; Codex review |
| 3 | Historical (queued): season picker, player pages, Worker caching | Scoped when picked up | A source verified for past seasons |

(A block is 1-2 hours that ends with something shippable.)

## 7. Decisions for David

1. **Where:** More → Stats (recommended), a Roster view, or player pages
   first.
2. **Team only first?** Recommended. It ships with no new data source.
3. **Opponent column in game week:** keep it (recommended) or the team
   alone.
4. **Historical:** confirm it is queued as its own backlog item behind
   Players (done in this PR as W27).

## 8. Done means (phases 1-2)

- Stats is reachable from More and from Matchup.
- It shows ND's and OSU's seasons with the same code.
- Every figure is the provider's, or derived from the team's own results
  and labelled as such.
- The three traps never reach the screen.
- Checks cover both teams and 320 / 390 / 1280.
