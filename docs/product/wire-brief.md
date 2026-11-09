# Proposal: the wire - a team's updates as they break

**Status:** Phase 1 approved by David, 2026-11-05 ("Yes approved on phase 1"),
with the Around tab (`docs/product/navigation-brief.md`): out of season the
wire comes first in Around. Phase 2 (a paid or partner source) is not
decided. Nothing is built yet.
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
- A *wire item* is a story whose headline reports a status change, in one
  of the categories below (the taxonomy, David, 2026-11-09), read by TeamOS
  from the beat feeds and ESPN's team news. The rest stay articles.
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

## The taxonomy (David, 2026-11-09)

Seven categories. Each wire item has exactly one.

| Category | Covers |
|---|---|
| **Injury** | Injuries, surgery, rehabilitation and other injury developments. Surgery is a development within an injury story, not its own category. |
| **Availability** | Out, questionable, doubtful, ruled out, game-time decisions, and returns to practice or to play. A return is a status change on the path from injured and out to healthy and back, so it belongs here. |
| **Suspension** | Suspensions and reinstatements. |
| **Transfer** | Entering or withdrawing from the portal, and a transfer committing to a school. |
| **Coaching** | Hires, firings, resignations, departures, coordinator changes, interim appointments and contract extensions. |
| **Commitment** | Recruits' commitments, decommitments and flips. |
| **Drafted** | Picked in the NFL Draft, or signed by an NFL team as an undrafted free agent. Tryouts and minicamp invitations are not. |

Rules:
- **The headline is the claim.** The outlet's headline is shown verbatim with
  its source and is always the primary statement of what happened. The
  category is a label beside it and must never overstate it: a "questionable"
  headline is never labelled as out.
- **One category per headline.** When a headline fits more than one, the more
  specific status wins: Drafted, then Suspension, Coaching, Transfer,
  Commitment, Availability, Injury. "Out for the season after surgery" is
  Availability; "undergoes ankle surgery" is Injury.
- **Analysis is not news.** A headline that discusses a status change ("what
  the injury means for the Irish") is not a wire item; one that reports it is.
- **No timelines.** There is no injury timeline or player progression: Suite
  has no player identity or story-linking fields to support one reliably.

## Decided (David, 2026-11-09, taking Claude's recommendations)

1. **Side:** an item belongs to the team whose feed carried it. The headline
   names the player, so an ND outlet's story on a Miami injury is an ND item
   whose headline says Miami.
2. **Game week:** from the previous game's final (or the season's start)
   until the next game's kickoff. In that window the opponent's items join.
3. **The measurement bar:** at least 90% precision on a hand-graded sample of
   the kept headlines, reported to David before any item reaches a fan. The
   history is shorter than a season (Notre Dame from 2026-09-11, Ohio State
   from 2026-10-02, most teams from late October); it is measured on what
   exists and re-measured as it grows.
4. **Wire alerts are off by default:** opt-in, the team's and the opponent's
   in game week as separate switches, like score alerts.
5. **Former players in the NFL** are not a wire category. They are a
   separate, lower-priority item for Around (my team), not Home, starting
   from the headlines Suite already reads (backlog).

## Open decisions for David

1. ~~Phase 1 as above?~~ Approved 2026-11-05.
2. **Phase 2: which to pursue.** Recommendation: the Bluesky pass first
   (free; it shows which teams it can serve), and quote requests to Sleeper,
   RotoWire and SportsDataIO in parallel - drafted for David to send, never
   sent by Claude.
3. ~~Notifications on by default?~~ Off (2026-11-09, above).

## Not in scope

In-game status (parked, backlog), former players in the NFL (backlog), and any
source read without its owner's permission.
