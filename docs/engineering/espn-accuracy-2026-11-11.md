# ESPN against the NCAA: turnovers and yards allowed (2026-11-11)

## Question

David asked on 2026-11-10 whether ESPN alone can give Suite right turnovers and yards allowed, so that CollegeFootballData (CFBD) is used only where nothing else will do. The answer is decision 0044.

## How it was measured

- **Script.** `tools/espn_accuracy_audit.py` ran once from GitHub's network, on the throwaway branch `audit-espn-accuracy`. It is not part of the product.
- **Coverage.** It checked all 138 registry programs against the NCAA's own FBS team tables: turnover margin (table 29), rushing defense (24) and passing yards allowed (695).
- **Fair comparison.** A team was compared only when the NCAA's game count equalled ESPN's. On this run every team's did.
- **Tolerances.** Turnovers had to match exactly. Yards allowed per game had to be within 1%, with a floor of 0.15 yards for rounding.
- **What was published.** The NCAA's terms forbid republishing its statistics. The public log printed agreement rates and team names only, never an NCAA figure.

The ESPN readings compared:

| Reading | What it is |
|---|---|
| core | the core API's season statistics, the reading decision 0037 measured |
| site | the site API's team statistics, its own figures |
| site, opponent section | takeaways from the opponents' figures, giveaways from the team's own |
| box | every completed game's box score (`turnovers` of each side), added up |

## Results

| Figure | Reading | Agrees |
|---|---|---|
| Turnover margin | core | 11 / 138 (8%) |
| Turnover margin | site | 11 / 138 (8%) |
| Turnover margin | site, opponent section | 19 / 138 (14%) |
| Turnover margin | **box** | **136 / 138 (99%)** |
| Takeaways | site, opponent section | 1 / 138 (1%) |
| Takeaways | **box** | **137 / 138 (99%)** |
| Giveaways | site, opponent section | 1 / 138 (1%) |
| Giveaways | **box** | **137 / 138 (99%)** |
| Rushing yards allowed per game | **site, opponent section** | **137 / 138 (99%)** |
| Rushing yards allowed per game | box | 135 / 138 (98%) |
| Passing yards allowed per game | **site, opponent section** | **138 / 138 (100%)** |
| Passing yards allowed per game | box | 138 / 138 (100%) |

### Misses

- **Box-score margin:** Utah, off by one, and Utah State, off by one the other way. It is one turnover the NCAA and ESPN credit differently, very likely in the game between them.
- **Rushing yards allowed, opponent section:** Missouri State, off by 1.8 yards a game.

### Context

- On 2026-10-27, CFBD's turnover margin agreed with the NCAA for 93% of teams (decision 0037).
- ESPN's season totals undercount fumbles. Its box scores do not.

## What Suite uses (decision 0044)

| Figure | Source |
|---|---|
| Turnover margin, takeaways, giveaways | ESPN box scores, added up |
| Yards allowed per game | ESPN site API, opponent section (the figures Stats already showed) |
| FBS ranks for passing offense and the turnover margin | computed by Suite from the above |

All three come from `tools/producers/season_stats.py`, once a day, into `data/league/season-stats.json`.
