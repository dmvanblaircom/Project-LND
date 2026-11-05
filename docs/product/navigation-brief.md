# Proposal: one job per tab, in and out of season

**Status:** Proposed, for David's review (2026-11-05). Nothing is built.
Decided so far (David, 2026-11-05): the third tab is **Around**, all year
("Just call it Around for now, not Race or Games"), and it stays in the nav
out of season, where today News takes its place. Its national layer keeps
the name **Top 25**. Follows `docs/product/around-your-team-brief.md`.

## Why

David, 2026-11-05: "Games and Game clash now and I think Top 25 and Home are
clashing a bit too, let's assess what these tabs are really meant for in
season and out of season and make sure we aren't clashing + aren't losing
features or data/info/value for the fan."

## What each tab shows today (read from the code, 2026-11-05)

| Tab | In season | Out of season |
|---|---|---|
| Home | Hero (next, live or last game); program milestone; Latest News (3); Schedule preview (last + next 3); Season Outlook (playoff and title odds, with its own full screen); By the Numbers | Season card; News first; Recruiting; NFL Draft; Results |
| Top 25 | Games: the week's ranked games, each opening a game sheet. Rankings: CFP, AP, Coaches, FPI, SP+, any week | Replaced by **News**, from the final AP poll to the preseason poll |
| Game | The team's one game: Details, Drive, Box Score, Plays, Stats, Matchup, game notes | Replaced by **Schedule**; back 14 days before the opener |
| Roster | Depth Chart, Roster, Availability | Roster only |
| More | News (all), Schedule/Results, Stats, Feedback, About, Share | same |

## Where they clash

1. **"Where do we stand?" is split.** Home's Season Outlook holds the playoff
   and title odds; Top 25 holds the CFP ranking that decides the playoff.
   A fan asking "are we in?" checks two tabs.
2. **Two places open a game.** Game, and Top 25's game sheet - which also
   opens the team's own game.
3. **Out of season, two lenses on recruiting and the draft.** Home's cards
   are the team's; Around's would rank the conference. Without a rule they
   repeat each other.

## Proposal: each tab answers one question

| Tab | Its question | In season | Out of season |
|---|---|---|---|
| **Home** | How is my team right now? | Hero; the wire and news; schedule preview; **one standing line** ("#6 CFP - 71% playoff odds") that opens Around; milestone; By the Numbers | Season card; the wire and news; **our** recruiting class; **our** draft picks |
| **Game** | This game | unchanged | Schedule, unchanged rule |
| **Around** | Where do we stand, and what around us matters? | Our conference: standings and this week's games. Games that matter to us: opponents, rivals, CFP neighbours. **Season Outlook's full odds (moved from Home).** Top 25: the week's ranked games and the rankings | The wire around us (team, rivals, conference). Our conference: standings and bowl results, then Signing Day classes ranked, then the NFL Draft by school, then next season's slate. Next season's opponents, once the schedule is published. Top 25: final polls, then the preseason poll |
| **Roster** | Who | unchanged | unchanged |
| **More** | Everything else | News, Schedule, Stats, settings | same |

Rules that keep them apart:
- **Home is ours; Around is ours among others.** Home never lists another
  team's game or class; Around never repeats Home's hero.
- **One game surface.** A game sheet in Around that would open the team's
  own game opens Game instead.
- **News is never lost:** Home (first out of season) and More, all year.

## Nothing is lost

| Feature today | Where it goes |
|---|---|
| Home hero, milestone, news, schedule preview, By the Numbers | Home, unchanged |
| Season Outlook (full) | Around (proposed); Home keeps one line that opens it |
| Top 25 Games and Rankings, every source and week | Around, as its Top 25 section, unchanged |
| Top 25 game sheet | Around; the team's own game opens Game |
| Out-of-season News tab | Home (first) and More |
| Out-of-season Recruiting, NFL Draft on Home | Home, ours only; the conference view in Around |
| Game, Roster, More, Schedule, Stats | unchanged |

## Around out of season, by month

| | Jan-Feb | Mar-Apr | May-Aug |
|---|---|---|---|
| The wire | coaching, portal, commitments | spring | summer |
| Our conference | final standings, bowls, then Signing Day classes ranked | NFL Draft picks by school | next season's slate |
| Next opponents | - | - | once ESPN publishes the schedule: record, final rank, class, draft losses |
| Top 25 | final polls, final CFP | - | preseason poll (it ends the offseason) |

The wire depends on `docs/product/wire-brief.md` Phase 1. Without it Around
is thin from January to April: coaching and portal news have no structured
source.

## Open decisions for David

1. **Move Season Outlook's full view from Home to Around,** Home keeping a
   one-line standing? Recommendation: yes - it answers "where do we stand",
   Around's question.
2. **Wire first in Around out of season?** Recommendation: yes; it is what
   fans open the app for between seasons.
3. **Approve the wire's Phase 1 with this?** Recommendation: yes; Around
   out of season depends on it.

## Smallest build, in order

1. Rename the tab Around and keep it out of season (News leaves the nav
   slot; it stays on Home and More). Season Outlook moves if decided.
2. Our conference and the games that matter, above Top 25, from the
   scoreboard already read (around-your-team-brief PR 1).
3. Conference standings, after the probe.
4. The out-of-season sections, month by month, from data in hand; the wire
   once Phase 1 is built.
