# Decision: season figures from ESPN's box scores; CFBD for SP+ only

## Status

Accepted. This amends decision 0037. Decisions 0012 and 0030 stand for SP+.

## Date

2026-11-11

## Context

CollegeFootballData (CFBD) supplied Matchup's yards allowed, the turnover margin, takeaways and giveaways, and the FBS ranks for passing offense and the turnover margin (decision 0037). On 2026-11-06 the key ran out of its monthly allowance, about 1,000 calls. Two things used it up. The edge cache does nothing on a `workers.dev` address, and the daily experience sweep asked CFBD again for every team at every width (`docs/engineering/edge-api.md`, CFBD's allowance). Since then those rows have shown a dash.

David, 2026-11-10: *"I would prefer we only use CFBD's data if absolutely necessary, otherwise we rely on ESPN's data."* On 2026-11-11 he approved the recommendation: test ESPN against the NCAA, switch what passes, and keep SP+ on CFBD.

ESPN was checked against the NCAA's own FBS tables on 2026-11-11, for all 138 programs (`docs/engineering/espn-accuracy-2026-11-11.md`).

| Figure | ESPN reading | Agrees with the NCAA |
|---|---|---|
| Turnover margin | season totals (core or site API) | 11 / 138 (8%) |
| Turnover margin | **every box score, added up** | **136 / 138 (99%)** |
| Takeaways, giveaways | box scores, added up | 137 / 138 (99%) each |
| Rushing yards allowed per game | site API, `opponent` section | 137 / 138 (99%) |
| Passing yards allowed per game | site API, `opponent` section | 138 / 138 (100%) |
| (CFBD's turnover margin, 2026-10-27) | | 93% |

## Decision

1. **Turnovers come from ESPN's box scores, added up.** This covers the turnover margin, takeaways and giveaways on Matchup and Stats. ESPN's season totals are still never shown.
2. **Matchup's yards allowed come from ESPN's opponent figures.** These are the same figures the Stats screen already shows, so the two screens now agree.
3. **Suite computes the FBS ranks for passing offense and the turnover margin from ESPN.** Passing offense uses ESPN's own net passing yards per game, the value the app shows. The turnover margin uses the box-score margin. A shared value shares the best place ("Tied-5th").
4. **One producer does it once a day.** `tools/producers/season_stats.py` runs in the data refresh and writes `data/league/season-stats.json`, keyed by ESPN team id. The app reads one file for every team. A team with a final game whose box score never came is left out, and its rows show a dash rather than a short season. A snapshot with fewer than 120 teams is refused, and the last good one stays. Each rank is published only when every program is in it, so it is always an FBS rank: one missing box score withholds the margin's places that day; the figures still show.
5. **CFBD supplies SP+ only.** That is the top 25 and its kept weeks, through the edge API, about 30 calls a month. Nothing else in the app asks CFBD.

## Consequences

- An FCS opponent is not in the file, so its side shows a dash, as it did with CFBD.
- The figures can trail a game by up to a day.
- The passing-offense rank is computed from regular-season values. During the postseason, Stats shows the whole season's value with that rank. Ranking postseason values is a follow-up (backlog).
- The edge API's `/v1/cfbd/season` and `/v1/cfbd/ranks` routes no longer have a caller. They stay until a cleanup removes them. The deploy no longer smoke-tests them.
- About › Data Sources credits ESPN for the matchup and turnover figures, and CollegeFootballData for SP+.
- The NCAA's tables are the referee, never a source; their terms forbid republishing.
