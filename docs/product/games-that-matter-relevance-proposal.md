# Games That Matter: a relevance model for all 138 FBS teams

**Status:** Proposed, for David's review (2026-11-18). This is a solution design only. No code, data contract or deployment is changed by it.

**Responds to:** the problem statement "Games That Matter: Relevance Across 138 FBS Teams" (2026-11-18).

**Evidence labels**, as in the Around data audit:
- **FACT (repo):** read in this repository.
- **FACT (captured):** in a captured payload under `tools/fixtures/` or `data/`.
- **REPORTED:** published elsewhere and not verified by Suite.
- **PROPOSED:** a recommendation.

---

## 0. The answer in one paragraph

A game makes the list only if there is a **stake**: a specific, data-backed way its result changes something about the selected team's season. A connection is not enough. There are five stakes, in a fixed order:

1. Playoff Impact
2. Résumé Impact
3. Conference Race
4. Rivalry
5. Next Opponent

Each stake has an entry condition, which says whether the team is in that race at all. Each also has a matchup test: could this game plausibly go either way? A game that passes both earns one label and one sentence, written only from facts Suite holds. The playoff format (12 teams in 2026, 24 from 2027) is league data, not code. When the field grows, the cutlines move and the same rule produces different lists. When nothing passes, the list is short or empty, and the screen says so plainly.

---

## 1. What is built today, and why it produces weak associations

**FACT (repo):** `teamos/around.js` `layers()`. The "games that matter" layer takes, from the week's FBS scoreboard, every game involving any of the following:

- **every past or future opponent** on the team's schedule (`opp[id]`, no other condition);
- **every rival** in the team's `series` table (trophies and rivalries, not branded events), whatever is at stake;
- **every team within three places** of the team in the leading poll (`NEAR = 3`).

The game's reason is then the connection itself: "Rice played Notre Dame Sep 12".

**What that gives Notre Dame for Week 13 (Nov 21-22).** This uses the CFP rankings of Nov 17 (**FACT (captured)**, `data/league/rankings-2026.json`) and each school's schedule as captured in late October (**FACT (captured)**, `tools/fixtures/espn-schedule-*.json`). At least 16 games make the layer.

They come from three sources:
- **Past and future opponents:** Temple-Rice, Purdue-Wisconsin, Michigan State-Oregon, Virginia-North Carolina, Cal-Stanford, Kansas-BYU, Navy-Memphis, Miami-Virginia Tech and Boston College-Syracuse.
- **Rivals:** USC-Maryland and Minnesota-Northwestern.
- **Poll neighbours (No. 3 to No. 9):** Alabama-Chattanooga, Michigan-UCLA, Texas-Arkansas, Washington-Indiana and Tennessee-LSU.

Roughly half of these change nothing for Notre Dame. Rice was 1-7 at capture. Chattanooga is an FCS team. Purdue-Wisconsin is two past opponents with nothing at stake.

The three rules fail for the same reason: each tests **association**, not **consequence**.

| Rule today | The failure |
|---|---|
| Every opponent | Rice's season cannot move Notre Dame's. The rule cannot tell Rice from Miami |
| Every rival | Purdue-Wisconsin shows for Notre Dame whatever is riding on it |
| Poll ±3 | No. 3 Alabama against an FCS team is listed. A team at No. 10 that can actually pass Notre Dame is not |

Kent State shows the other side. Kent played South Carolina and Ohio State, so Georgia-South Carolina and Nebraska-Ohio State appear in a Kent State fan's list. Neither has anything to do with Kent State's season.

---

## 2. Proposed product behaviour

### 2.1 What the fan sees

- **One list,** ordered by importance, under Around → My Team.
- **Each game shows:**
  - one small context label (Playoff Impact, Résumé Impact, Conference Race, Rivalry, Next Opponent);
  - one sentence saying specifically why it matters to this team now;
  - the normal score or kickoff line.
- **No fixed length.** Expect 0 to about 10 games. When none qualify, an honest empty state: "No other game this week changes Kent State's season. Kent State plays Eastern Michigan on Nov 25." There is no filler.
- **Top 25 moves out of this list.** The week's ranked games become a scoreboard (Around → College Football, once built). Until then, a collapsed "All ranked games" row sits below the list, so nothing a fan uses today disappears. This is a decision for David (section 8).

### 2.2 The relevance model

For the selected team **T** and each game **G** this week (T's own game excluded):

```
for each stake S, in priority order:
    if T qualifies for S (entry condition)
       and G carries S for T (the stake's own condition)
       and G passes the matchup test:
           G is relevant; S is its label; S's sentence is its explanation
           (later stakes that also apply are kept as secondary facts)
           stop
G is not shown
```

The **order** across games is: stake priority first, then the stake's own strength (below), then kickoff time.

**Team mode, worked out from data each refresh:**

| Mode | Who | Entry test (PROPOSED thresholds, tunable) |
|---|---|---|
| Contender | In the national race | Ranked inside `cutline + 6` in the leading poll (2026: inside 18. 2027: inside 30). Phase 2 adds ESPN FPI playoff odds ≥ 5% |
| Conference contender | Out of the national race, in its conference race | Phase 3: within one conference loss of the leader, with enough conference games left. Phase 2 adds ESPN FPI conference odds ≥ 5% |
| Neither | Most of the FBS by November | Only Rivalry and Next Opponent can apply |

The mode changes the order. For a Conference contender, Conference Race comes first. This is how requirement 2 is met: conference matters most when the team is outside the playoff picture.

### 2.3 The five stakes

**1. Playoff Impact.** The team is a Contender.

G involves a **competitor** of T. A competitor is a ranked team that:
- sits within four places of T, or
- sits between T and the nearest **cutline** above or below it.

The cutlines come from the format (section 4):
- **2026** (**REPORTED**, the 12-team format as amended in 2025: straight seeding, top four byes; to be confirmed): the bye line after 4 and the field line after 12, plus the automatic bids for conference champions.
- **2027:** byes after 8, home games after 16, the field after 24.

Strength is the competitor's distance from T, plus the matchup's closeness.

Example sentence: "No. 4 UCLA plays Michigan. A UCLA loss could open a top-four seed, and a first-round bye, for No. 6 Notre Dame."

**2. Résumé Impact.** The team is a Contender.

G involves a team T has **already played** that meets either test:

- **Currently or previously ranked:** in the CFP or AP poll now, or in any poll week Suite has kept this season (`data/league/rankings-2026.json`). That includes a team that was ranked when T played it and has since dropped out. Phase 2 adds: in the FPI top 30. (David, 2026-11-18: "a currently or previously ranked team we already played plays a real game".)
- **Beat T,** ranked or not, in any week of the season. Its results decide whether that loss reads as a good loss or a bad one, which is the strongest résumé link there is. (David, 2026-11-18.)

Prior play alone never qualifies, and neither does recency: last week's opponent counts only if it passes one of the two tests. This is the rule that separates Miami from Rice. The stake applies only while T is a Contender.

Example sentence: "Notre Dame played No. 10 BYU on Oct 17. BYU's finish decides how that result reads on Notre Dame's résumé."

**3. Conference Race.** The team is a Conference contender. Or it is a Contender whose likeliest way into the field is its conference's automatic bid.

G involves another team in T's conference race. It is shown first when the game is between two of them.

Example sentence: "Fresno State and Colorado State are both one Mountain West loss behind Boise State."
- The sentence states standings, which are facts.
- It never states clinching, elimination, tiebreakers or "controls its destiny". The Around data audit (§4.5) already rules these out.

**4. Rivalry.** Uses T's `series` table: trophies and rivalries, not branded events.

A rival's game is shown when **one** of these holds:
- the rival is in its own race;
- the rival plays a team ranked in the leading poll;
- it is the rival's last game before its game with T.

A rival's dead-season game against an unranked team is not shown.

Example sentence: "Michigan plays No. 4 UCLA a week before The Game."

**5. Next Opponent.** Any team.

The game of T's **next** opponent, when that opponent is not playing T this week. Only the next one.

Example sentence: "Syracuse, Notre Dame's opponent on Nov 28, plays Boston College."

### 2.4 The matchup test

A stake is not enough on its own. The game must be able to go either way (requirement 5):

- **Pregame:** ESPN's line is within 17 points (PROPOSED). **FACT (captured):** every pregame game on the Sep 26 scoreboard (65 of 65) carries a DraftKings spread. `TeamOS.espn` already normalises it as `odds`.
- **No line:** use the FPI rating gap. Ratings for all 138 teams are in `data/league/fpi.json`.
- **An FCS opponent:** fails, unless the stake is Next Opponent or Rivalry lead-in, where the point is the team, not the result.
- **Live and final:** the test no longer applies. A live upset of a competitor rises in the order instead (Phase 4).

### 2.5 Explanation rules

- One sentence, at most 120 characters. One label.
- It is built only from fields Suite holds: rank, record, date, result, conference record, the series name, the format's cutlines.
- Every number in the sentence comes from data. Nothing is generated freely.
- **Words that never appear:** clinch, eliminate, control(s) its destiny, guaranteed, lock, "would make the playoff". The committee decides, so the copy says **could**.
- **Where AP and CFP disagree,** the leading poll names itself. Notre Dame is No. 3 in the AP and No. 6 with the committee (**FACT (captured)**, Week 12). Once the committee publishes, its ranking leads (decision 0032's principle, and the #261 fix).

---

## 3. Examples: good and bad inclusion decisions

Week 13 (Nov 21-22). CFP rankings of Nov 17. Matchups as captured in late October.

Two inputs are not available yet: this week's spreads and conference standings. Where a decision depends on either, the table says so. Results Suite does not hold are not stated.

### Notre Dame: No. 6 CFP (No. 3 AP), 9-1, independent. Mode: Contender

| Game | Today | Proposed | Why |
|---|---|---|---|
| UCLA (No. 4) vs Michigan | shown (poll ±3) | **Show:** Playoff Impact | Ahead of ND across the bye line |
| Texas (No. 5) vs Arkansas | shown | **Show if the line is within 17:** Playoff Impact | Same |
| Georgia (No. 1) vs South Carolina (No. 21) | not shown | **Show:** Playoff Impact | A top-four team against a ranked team. The ±3 rule missed it |
| TCU vs Utah (No. 2) | not shown | **Show if the line is within 17** | Same |
| Miami (No. 7) vs Virginia Tech | shown (opponent) | **Show:** Playoff Impact, with Résumé as a secondary fact | One place behind ND, and an opponent ND has played |
| Kansas vs BYU (No. 10) | shown (opponent) | **Show:** Résumé Impact | A ranked past opponent in a real game |
| Boston College vs Syracuse | shown (opponent) | **Show:** Next Opponent (low) | Syracuse visits ND Nov 28 |
| Alabama (No. 3) vs Chattanooga | shown | **Hide** | Fails the matchup test: an FCS opponent |
| Temple vs Rice | shown | **Hide** | Rice was 1-7. No stake |
| Purdue vs Wisconsin | shown | **Hide** | Two past opponents, a trophy rival, unranked, nothing riding |
| Cal vs Stanford, Minnesota vs Northwestern, USC vs Maryland | shown (rival) | **Hide** | Rivals with nothing riding, playing unranked teams |
| Navy vs Memphis | shown | **Depends on standings (Phase 3):** Rivalry if Navy is in the American race, otherwise hidden | The rule needs the standings |

**Result:** about 7 games, all with a reason, against at least 16 today.

### Ohio State: No. 14 CFP, 7-3, Big Ten. Mode: Contender (bubble in 2026)

| Game | Proposed | Why |
|---|---|---|
| Michigan vs UCLA (No. 4) | **Show:** Rivalry | "Michigan plays No. 4 UCLA a week before The Game." The rivalry stays visible with no playoff tie for OSU |
| Teams ranked No. 10 to No. 13 against credible opponents (Kansas-BYU, Baylor-Texas Tech, Michigan State-Oregon, Georgia Tech-Wake Forest) | **Show:** Playoff Impact | OSU sits two places outside a 12-team field |
| Texas (No. 5) vs Arkansas | **Show:** Résumé Impact (low) | Texas beat OSU on Sep 12. A strong Texas finish makes that loss read better |
| Kent State's and Ball State's games | **Hide** | Past opponents with no stake. Today they show |

### Boise State: No. 17 CFP, 9-1, Mountain West. The automatic bid is its path

| Game | Proposed | Why |
|---|---|---|
| Michigan State vs Oregon (No. 13) | **Show:** Résumé Impact | Boise's loss is to Oregon (Sep 5). Oregon's finish shapes that loss |
| Fresno State vs Colorado State, San José State vs UNLV | **Show if those teams are in the Mountain West race:** Conference Race | The automatic bid runs through the conference title. Needs standings (Phase 3) |
| Other contenders for the best conference champion's bid outside the top four conferences (e.g. Tulane, Navy) | **Show:** Playoff Impact | Needs FPI odds (Phase 2): none of them is in the CFP top 25 |
| Memphis's and Western Michigan's games | **Hide** | Past opponents with no stake |

### Purdue: out of the Big Ten race. Mode: Neither

| Game | Proposed | Why |
|---|---|---|
| Washington vs Indiana (No. 8) | **Show:** Rivalry | Indiana's last game before the Old Oaken Bucket on Nov 28 |
| Everything else | **Hide** | Short list, honest |

### Kent State: MAC, out of every race. Mode: Neither

- **Proposed:** the list is the Next Opponent game, if any, or the empty state.
- **Today it shows:** Georgia-South Carolina and Nebraska-Ohio State, only because Kent played South Carolina and Ohio State.
- **Data gap:** Kent State's config has **no** `series` entry. The Wagon Wheel game with Akron is missing (**FACT (repo)**: `teams/kent-state.js`). Without it the Rivalry stake cannot work for Kent.

---

## 4. How it changes through the season

The rule never changes. Its inputs do.

| Moment | What leads | Notes |
|---|---|---|
| Offseason (Feb to Aug) | No games | Around shows next season's opponents (brief of 2026-11-02, out-of-season table) |
| Weeks 1 to 4 | Few stakes | Résumé requires an opponent ranked now or earlier in the season (the preseason poll counts), so lists are short. Conference races are not yet formed. The AP leads |
| Weeks 5 to 9 | Conference races form | Conference Race enters for Conference contenders once standings separate. Résumé grows as past opponents get ranked |
| CFP rankings (from early November) | Playoff Impact | The committee's ranking becomes the reference. The 3- to 4-day gap after each release is covered by #261 |
| Rivalry week | Rivalry | Lead-in games rise |
| Championship week | Conference Race peaks | Title games carry the automatic bids (2026) |
| Selection Day to the final | Next Opponent | Games whose winner T meets ("winner plays Notre Dame Jan 1"). Résumé stops mattering once the field is set |
| During a game | Live order | A competitor trailing late rises (Phase 4) |

### The move to 24 teams (2027)

**REPORTED** (CFP announcement of Nov 9, 2026, as covered by NBC News, Yahoo Sports and Saturday Tradition):
- From 2027 the field is 24 teams.
- There are 5 automatic bids: the ACC, Big Ten, Big 12 and SEC champions, plus the highest-ranked team from the other six conferences.
- There are 19 at-large bids.
- The top 8 get byes. Teams 9 to 16 host teams 17 to 24.
- The top four conferences say their 2026 title games will be their last.
- Notre Dame has no guaranteed place.

**What changes in Suite:** only the format data, e.g. a `playoff` block in `leagues/college-football.js` with the field size, cutlines, bids and seasons.
- The cutlines move from (4, 12) to (8, 16, 24).
- About twice as many teams become Contenders by November.
- For teams in the top four conferences, conference titles mostly stop being the route in. Conference Race stays a stake, but Playoff Impact outranks it more often. That happens through the order of the stakes, not a team rule.

**Not yet known, so not designed:**
- how the top-four conferences' champions are decided without title games;
- whether the sixth bid needs a conference title;
- the exact committee wording.

These are filled in from the official format when it is published.

---

## 5. Data: what supports this, what is missing

| Input | Status | Used by |
|---|---|---|
| The week's FBS scoreboard: teams, top-25 rank, record, state | **In hand** (`TeamOS.espn.scoreboard`) | All |
| Pregame line (spread) | **In hand:** 65 of 65 pregame games on Sep 26 carried one | Matchup test |
| T's schedule and results | **In hand** | Résumé, Next Opponent |
| CFP, AP and Coaches, with kept weeks | **In hand:** the kept weeks answer "previously ranked" | Playoff, Résumé |
| FPI rating and rank, all 138 teams | **In hand** (`data/league/fpi.json`) | Matchup test without a line; résumé-quality floor |
| `series` (rivals) | **Partial:** 27 of 138 teams have no trophy or rivalry entry (Kent State among them). Entries list only current opponents (USC is kept dormant for Notre Dame) | Rivalry |
| ESPN FPI projections: playoff %, conference %, win-out %, all teams | **Extend:** in the payload Suite already downloads. The producer discards them (audit §4.4). Keeping them is a data-contract change | Entry tests for unranked and lower-conference teams |
| Conference standings | **Extend:** probed. ESPN serves them, but at 2.6 MB they need a refresh-side snapshot. Each side's conference record is also on the scoreboard, with gaps when a team has a bye | Conference Race |
| Playoff format (field, cutlines, bids) | **Missing as data.** It needs a small league-config block. The 2027 details are partly unknown | Playoff |
| Kalshi playoff odds | In hand for 61 teams, but permission is pending (institutional@ reply draft). **Not needed:** FPI covers every team | Optional only |
| Tiebreakers, clinching, elimination | **No source.** Never claimed | n/a |
| Matchup win probability (ESPN predictor) | **Not probed** | Optional Phase 4 refinement |
| Bowl tie-ins | **No source** | Out of scope |

**Limits to state openly:**
- The CFP publishes 25 teams. Below 25, Suite needs FPI to know who is in the race.
- In early weeks résumé evidence is thin, so lists are short by design.
- Ranks are opinions, the committee's or the voters'. The copy says whose.
- ESPN is the source of nearly every input. That is the same licensing position as today (audit §1, item 6).

---

## 6. Validation: how we know it is right

1. **A labelled set, before any code.**
   - **Teams:** 12, spanning the archetypes:
     - an independent contender (Notre Dame);
     - top-four-conference leaders and bubble teams (Ohio State, Indiana, Texas Tech);
     - a top-four-conference team out of the race (Purdue);
     - lower-conference contenders (Boise State, Tulane, James Madison);
     - lower-conference teams out of their races (Kent State, Rice);
     - rivalry-heavy teams (Michigan, Alabama).
   - **Moments:** 6 for each team: Week 3, Week 8, the first CFP week, rivalry week, championship week, and Selection Day.
   - **Labels:** David and ChatGPT mark each candidate game "must show", "fine either way" or "must not show". Suite already keeps the inputs: captured scoreboards, kept rankings and FPI history.
2. **Quality gates on that set** (PROPOSED):

   | Measure | Target |
   |---|---|
   | Precision: shown games labelled "must show" or "fine" | ≥ 90% |
   | Recall of "must show" | ≥ 95% |
   | "Must not show" games shown | 0 |
   | Explanations: every number resolved, ≤ 120 characters, banned words absent | 100% |

3. **League-wide sweep, every refresh, all 138 teams.** Run the rule and record:
   - list length (median, maximum, share empty);
   - any team over 12 games, which is flagged for review as likely padding;
   - churn between two refreshes with no new results, which should be zero;
   - a lint of every sentence.
4. **No team conditionals.** The rule reads only data, as `around.js` does today. The existing identity and registry checks still apply.
5. **After the fact (Phase 2 onward).** Once FPI projections are kept daily, compare the games shown with the games whose results actually moved T's ESPN playoff odds that weekend. This is the closest thing to ground truth available, tracked as a hit rate, not as a gate.

---

## 7. Phases and tradeoffs

| Phase | What | Data | Size |
|---|---|---|---|
| 0 | Approve the model. Label the validation set | none new | David and ChatGPT |
| 1 | The relevance core. The five stakes, with Playoff, Résumé, Rivalry and Next Opponent on ranks. The matchup test on spread or FPI. One list, one sentence, honest empty state. Format as league data. Remove the ±3, every-opponent and every-rival rules | **all in hand** | one PR in `teamos/around.js`, its check and the copy |
| 2 | Keep FPI's projections: playoff % and conference % become entry tests for every team | FPI producer field additions (**data contract change, David's approval**) | small |
| 3 | Conference standings snapshot, so Conference Race uses real records | ESPN standings via the refresh | medium |
| 4 | Live ordering (late upsets rise), postseason Next Opponent, the 2027 format values | in hand, plus the official format | small to medium |
| 5 | Rivalry data: fill the 27 teams with no entry, and add rivals not on this season's schedule | team config, one-time | data work |

**Material tradeoffs:**

1. **Explicit rules, not a hidden score.** Every list can be explained line by line and tested. The cost is a handful of tunable thresholds (cutline + 6, ±4 places, a 17-point line, FPI 5%). They are set from the labelled set, not guessed.
2. **Shorter lists.** By November most teams will see 0 to 3 games. That is the honest answer the problem statement asks for, but Around will feel emptier for half the FBS. The empty state carries that.
3. **More ESPN.** FPI projections and standings deepen reliance on ESPN, whose terms are the existing open risk. Kalshi becomes optional.
4. **Rivals gated by stakes.** Some fans want every game of their rival (an Ohio State fan and Michigan). The gate hides a rival's dead-season games. That is a product call (section 8).

---

## 8. Decisions for David

1. **A rival's games:** shown only with a stake, as proposed, or every week? *Recommendation: with a stake, plus the lead-in week.*
2. **Next Opponent:** include it as a label? *Recommendation: yes, the next opponent only.*
3. **Top 25 games:** a collapsed "All ranked games" row under the list until Around → College Football exists? *Recommendation: yes. Nothing fans use today disappears.*
4. **Phase 2:** approve keeping FPI's projections (a data-contract change)?
5. **Labels:** confirm the five label names with ChatGPT (copy is design's).
6. ~~A team that beat us~~ **Decided (David, 2026-11-18):** a team that beat T is a Résumé stake, ranked or not, any week, while T is a Contender. Last week's opponent by recency alone is not.

## Sources (REPORTED items)

- [NBC News: College Football Playoff expanding to 24 teams in 2027](https://www.nbcnews.com/sports/college-football/college-football-playoff-expanding-24-teams-2027-rcna608336)
- [Saturday Tradition: CFP announces 24-team format, details](https://saturdaytradition.com/news/college-football/college-football-playoff-officially-announces-24-team-format-reveals-details/)
- [Yahoo Sports: CFP officially expanding to 24 teams in 2027](https://sports.yahoo.com/articles/college-football-playoff-officially-expanding-170926255.html)
- [Deseret News: ESPN, CFP agree on expansion to 24 teams](https://www.deseret.com/sports/2026/11/09/college-football-playoff-24-team-expansion/)
