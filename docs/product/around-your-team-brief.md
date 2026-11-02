# Proposal: the Top 25 tab becomes your team's world

**Status:** Proposed, for David's review (2026-11-02). Direction agreed by
David the same day: "I agree with the direction". The layer of national
games and polls keeps the name **Top 25** ("That term is common across
all"), never "National". Nothing is built yet.

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

1. **The tab's name.** "Top 25" no longer describes the whole tab. Options:
   keep "Top 25" (familiar, now only the third layer); the conference's name
   per team ("Big Ten", "MAC"; nothing for an independent); or a word that
   covers all three. Recommendation: the conference name, falling back to
   "Top 25" for an independent.
2. **A ranked team's order.** For a team in the CFP race, does Top 25 come
   before the conference? Recommendation: conference first for everyone,
   and the CFP layer leads for an independent.

## Smallest version

- **PR 1:** layers 1 (this week's conference games, no standings) and 2,
  above today's Top 25, all from the scoreboard the app already has.
- **PR 2:** conference standings, after the probe.
- **PR 3:** the name, once decided.

## Not in scope

Every FBS game, other sports, and a measurement of what fans use: there is
no usage data (W24). How much non-Top 25 fans use the Top 25 layer is a
guess until there is.
