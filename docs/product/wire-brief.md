# Proposal: the wire - a team's updates as they break

**Status:** Proposed, for David's review (2026-11-05). Nothing is built.
From the backlog item "The wire" (David, 2026-11-05).

## The ask

David, 2026-11-05, showing Sleeper's CFB post on Miami WR Malachi Toney
("expected to undergo surgery ... per @CBSSports"): "This is an example of
something fans want to know asap. If Suite is meant to be a central hub for
your team, it needs these in the moment feed updates, not just media
articles. This stretches beyond live game injury updates and works all year
long, in season and out of season."

It matters twice: to a Miami fan, and to a Notre Dame fan in the week Notre
Dame plays Miami.

## What reached Suite on Nov 4 (measured)

From the committed snapshots (`data/<team>/news.json`), times UTC:

| Published | In Suite | Story | Whose feed |
|---|---|---|---|
| 19:39 | 20:08 | Miami On SI, "Malachi Toney's Status Uncertain for Notre Dame Game" (later retitled to the surgery news) | Miami |
| 20:59-21:04 | 21:09 | Slap the Sign; Notre Dame On SI, the injury and what it means for the Irish | Notre Dame |
| 22:18 | 22:39 | Miami On SI, "Next Man Up" | Miami |
| 00:32 | 00:38 | State of the U, "will have surgery" | Miami |

David's Sleeper alert for the surgery report came at about 7:40 PM ET,
00:40 UTC on Nov 5. Suite had the surgery news at 00:38 (State of the U,
published 00:32): two minutes earlier for a Miami fan. Notre Dame's feed
had its own outlets' surgery stories at 00:51-00:53, and the earlier injury
news at 21:09, three and a half hours before the alert.

So since #221 (beat news every run) an article reaches Suite within about
30 minutes of being published, and here Suite was not slower than Sleeper.
What it lacked was telling the fan. Three gaps remain:

1. **Before the first article.** The news breaks as a reporter's post; the
   articles follow. That lead is what Sleeper's feed relays. Only a wire
   source closes it. On Nov 4 it was minutes at most for Miami's outlets;
   for teams with quieter outlets it is likely longer (not measured).
2. **Buried.** The story is one row in a news list, like any other article:
   no "this matters" mark, no notification. This is the gap that cost David
   the news on Nov 4.
3. **The opponent, by luck.** Notre Dame fans had it because Notre Dame's
   outlets wrote about it. A smaller program's outlets may not cover its
   opponent's news.

## Proposal, in two phases

**Phase 1: the wire from the sources Suite has (no cost).**
- A *wire item* is a story whose headline reports a status change - injury,
  surgery, out, return, suspension, transfer, coaching change, commitment -
  read by TeamOS from the beat feeds and ESPN's team news. The rest stay
  articles.
- Home shows the newest wire items above the news, each with its source and
  how long ago: "Miami WR Malachi Toney to have surgery - Miami On SI, 20 min
  ago".
- In a game week the opponent's wire items join the team's, marked as the
  opponent's. Suite already reads every FBS team's beat feeds, so a Toledo
  fan sees Toledo's opponent's news whatever Toledo's outlets cover.
- A notification for the fan's own team's wire items, and the opponent's in
  game week, through the alerts that exist (opt-in, like score alerts).
- Out of season the same rule catches the portal, coaching and recruiting
  news.
- Risk: reading status from headlines will mis-tag some stories. It is
  measured on a season of kept headlines before it ships, and a mis-tag
  costs a row, never a false claim: the row is the outlet's own headline.

**Phase 2: a wire source, for the minutes before the first article.**

| Source | Speed | College coverage | Cost and access (2026-11-05) |
|---|---|---|---|
| Sleeper's CFB feed | minutes | what David sees: reporters' posts | Not in Sleeper's public API, which serves NFL and fantasy data; the app's feed is its private backend. A partnership or licence, Sleeper's call. |
| Licensed player-news feeds (RotoWire, SportsDataIO, Sportradar and similar) | minutes | college player news and injuries, depth by program unknown | No published prices: RotoWire licenses by agreement; SportsDataIO quotes production access (one buyer survey puts a median deal near $16.5k a year - a secondary source). Quotes needed. |
| Reporters on X | seconds | the best | Pay per use since 2026: about $0.005 a post read (secondary sources; X's own pricing page decides). 138 teams' reporters is many reads. |
| Reporters on Bluesky | seconds | varies widely by team | Free, no key, public endpoints with generous limits. Needs a per-team pass, like the media one, to see who posts there. |

## Open decisions for David

1. **Phase 1 as above?** Recommendation: yes; it is free and closes gaps 2
   and 3, the ones Nov 4 showed. Phase 2 can wait on what Phase 1 leaves.
2. **Phase 2: which to pursue.** Recommendation: the Bluesky pass first
   (free; it shows which teams it can serve), and quote requests to Sleeper,
   RotoWire and SportsDataIO in parallel - drafted for David to send, never
   sent by Claude.
3. **Notifications on by default?** Recommendation: off, opt-in per team
   and for the opponent, like score alerts.

## Not in scope

In-game status (parked, backlog), the NFL alumni card (backlog), and any
source read without its owner's permission.
