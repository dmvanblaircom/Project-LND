# Proposal: the Top 25 tab becomes your team's world

**Status:** Proposed, for David's review (2026-11-02). Direction agreed by
David the same day: "I agree with the direction". The layer of national
games and polls keeps the name **Top 25** ("That term is common across
all"), never "National". The tab stays in the bottom nav all year; only
Game changes out of season (David: "the bottom nav can stay consistent in
and out of season except for the Game tab"). His leaning for the name:
"Around" plus the team's initials. Nothing is built yet.

**Decided (David, 2026-11-05):** in season the tab is named **Games**; when
the season is over it becomes **Around**, with its out-of-season content
still to be defined (below). Out of season the nav is then Home, Around,
Schedule, Roster, More. Noted with the decision: in season "Games" sits
next to "Game" in the nav (Home, Games, Game, Roster, More); if that reads
as confusing in use, "Scores" is the measured fallback.

## The problem

The Top 25 tab is the same for every fan: this week's games with a ranked
side, and the CFP, AP, Coaches, FPI and SP+ rankings. That suits a Notre
Dame or Ohio State fan. For most of the 138 teams it misses the games that
matter to them:

| Fan | What they check on a Saturday |
|---|---|
| Notre Dame | Top 25 and the CFP; past and future opponents (the résumé); the teams just ahead in the CFP |
| Ohio State | The Big Ten race; Michigan; CFP seeding |
| Toledo, App State | The conference race; rivals; the Group of 5 champion's CFP place. The Top 25 barely touches them. |

Opening the tab to every FBS game would be ESPN's scoreboard: 60 games
with no lens, done better by ESPN. Suite's edge is the lens: the team at
the center (North Star; decision 0038).

## Proposal

One tab, three layers, ordered for the selected team:

1. **Your conference.** Standings, and this week's conference games.
   Shown first for a team in a conference. An independent (Notre Dame) has
   no conference layer.
2. **Your games that matter.** This week's games of the team's past and
   future opponents and of its rivals (the team's `series`), and of the
   teams around it in the CFP rankings when it is ranked.
3. **Top 25.** Today's tab as it is: the week's ranked games and the
   rankings, with the selected team highlighted where it appears.

A game is listed once, in the first layer that claims it.

## Out of season

Today the nav swaps Top 25 for News and Game for Schedule out of season.
Under this proposal only Game changes. The tab keeps its three layers with
the season's other content:

| Layer | Out of season | Source |
|---|---|---|
| Your conference | Final standings and bowl results (December-January); the conference's recruiting classes ranked (February); next season's conference slate (spring-summer) | ESPN standings (probe first); the recruiting classes the refresh already reads daily |
| Your games that matter | Next season's opponents: their recruiting classes, draft losses, last season's record (some of it is already in Outlook) | Already in hand |
| Top 25 | The final polls, then the preseason polls once published | Today's Top 25 layer |

Coaching changes and the transfer portal belong here too, but Suite has no
source for either yet.

Out of season News no longer takes the tab's place. It stays reachable from
Home and More.

## Where it comes from

- **Games:** the app already reads the whole FBS scoreboard for the Top 25
  filter (`groups=80`, up to 400 games), so layers 1 and 2 need no new
  request. They filter it by the team's conference (the registry,
  `teams/index.js`), its schedule, and its `series`.
- **Standings:** ESPN publishes conference standings. Their shape and
  whether the browser can read them are not verified yet (probe first,
  behind an adapter like every ESPN read).
- **No team conditionals:** each team's layers come from its data. The
  order is the same rule for everyone; the content differs.

## Open decisions for David

1. **The tab's name.** David's leaning: "Around" plus the team's initials.
   **Measured 2026-11-02** (each team in its own face, in the real bottom
   nav, the label on one line): "Around" + the registry abbreviation fits
   **5 of 138 teams at 320 px** (GT, ILL, IU, KU, LT; the label has 57.8
   px), 49 at 375 px and 30 at 390 px (the label's type is larger there).
   "Around ND" is 61.8 px at 320 px; "Around OSU" 68.8. "Around" alone is
   at most 45.6 px; "The Field" and "The Race" at most 55.8 px, 2 px spare.

   | Name | In season | Out of season | Independents | At 320 px |
   |---|---|---|---|---|
   | Around ND | strong | fine | fine | 5 of 138 fit |
   | Around (the team in the screen heading) | strong | fine | fine | fits all, 12 px spare |
   | The Field | strong | fair | fine | fits all, 2 px spare |
   | The Race | strongest | weak | fine | fits all, 2 px spare |
   | the conference's name | strong | strong | fails for Notre Dame | "Mountain West" does not fit |
   | League | fair | fair | odd for Notre Dame | fits |

   Recommendation (first round): "Around" in the nav, "Around Notre Dame"
   as the heading. David, 2026-11-05: OK, but "Around" reads like news, and
   the tab is upcoming games and live scores of games that matter to his
   team - not convinced yet. Game words, measured the same way (widest
   team at 320 px, 57.8 px of room):

   | Name | Fits every team | Widest at 320 px |
   |---|---|---|
   | Scores | yes | 40.2 |
   | Slate | yes | 30.2 |
   | Radar | yes | 36.1 |
   | The Race | yes | 55.8 |
   | Saturday | yes | 54.5 |
   | Stakes | yes | 40.1 |
   | Matchups | 13 teams over at 320 px | 60.5 |
   | Scoreboard | no team at 320 px | 69.9 |

   Recommendation (second round): "Scores", the most familiar game word
   across fan bases, with the team in the heading ("Scores · Notre Dame").
   Runner-up: "Slate", which works out of season (next season's slate) but
   is less familiar.

2. **A ranked team's order.** For a team in the CFP race, does Top 25 come
   before the conference? Recommendation: conference first for everyone,
   and the CFP layer leads for an independent.

## Smallest version

- **PR 1:** layers 1 (this week's conference games, no standings) and 2,
  above today's Top 25, all from the scoreboard the app already has.
- **PR 2:** conference standings, after the probe.
- **PR 3:** the name, once decided, and the tab kept out of season (News
  no longer takes its place).
- **PR 4:** the out-of-season content, layer by layer, from data in hand.

## Not in scope

Every FBS game, other sports, and a measurement of what fans use: there is
no usage data (W24). How much non-Top 25 fans use the Top 25 layer is a
guess until there is.
