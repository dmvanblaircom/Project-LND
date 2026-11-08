# Play-by-play freshness state

**Status:** creative direction from ChatGPT (Creative Director), 2026-11-08, approved directionally by David the same day. He also decided the quarter format and the drive card (below). The revised visual implementation is in for creative review and is not yet approved. No merge is authorized.

## Why

ND–Miami, 2026-11-07: the game clock ran from 15:00 to 12:05 in the 3rd while the play-by-play record held nothing after the kickoff.

- Game showed "Last play: 15:00 kickoff" and "Notre Dame drive, 0 plays, 0 yards" while the scoreboard read 12:05.
- Minutes later nine plays arrived at once, every one stamped 12:05.

The provider's data entry had lagged, and Suite looked broken.

## Governing principle

The game is continuing normally; the play-by-play record is temporarily behind. Suite says so calmly and factually, and never suggests the game or the app is broken.

## The direction, and how it is built

| Direction | Implementation |
|---|---|
| **Placement: Last Play card** is the primary status | `suite/game.js lastPlay()`: a small neutral note above the latest recorded play |
| **Placement: Drive Tracker** is quieter, and nothing of the stale drive is presented as current (David's decision) | `driveCard()`: the title becomes "Latest recorded drive" in the platform's neutral colours and face, never a team's. The supporting line is "Drive details updating". The field drawing and legend are removed, replaced by a quiet inset panel of the same size: "Drive and field position return when the play-by-play catches up." The team's card, field and colours come back when the record catches up |
| **Placement: Home** shows no indicator | Home is untouched |
| **One shared state**, no conflicting indicators | `TeamOS.game.feedState()` is computed once per draw (`app.js feedOf()`); both cards read `m.feed` |
| **Copy:** "Play-by-play is catching up" / "The game clock is ahead of the latest recorded play." / "Drive details updating" | As given; provider-neutral |
| **Keep the latest logged play visible**, with its quarter, clock and team attribution | Shown as "3rd · 15:00 · ND …": the Game screen's own quarter format (David: no "Q3"), and the team the record attributes the play to (a kickoff is the kicking team's). The down and distance from the record are not shown while it is behind, since they describe the situation it has not caught up with |
| **Visual:** small, restrained, neutral; no warning colours, spinner or animation | Inset surface, a neutral rule, ink and secondary ink. The same in both App Styles and for every team: nothing in it takes a team colour |
| **Detection:** existing data only; 90 s threshold; new quarter counts only as its clock runs | Game time elapsed from the scoreboard's clock and quarter against the latest logged play's. A quarter turning over is no gap. Regulation only, since overtime has no clock |
| **Clearing:** when caught up | Behind at 90 s or more; caught up under 60 s, so a gap near the line doesn't flicker |
| **Catch-up:** plays appear normally, with no moments, replays or celebration | The batch renders as ordinary plays. Production has no game-moment animations yet; when Stage 3 wires `TeamOS.moments`, a refresh that ends a behind state must be refused as reconciliation |
| **Accessibility:** announce entry once, politely | `say()` into the existing polite region, only on the change into the state. Silent on later refreshes and on catching up. Nothing moves, so reduced motion has nothing to stop |

## Evidence

- `tools/pbpfreshcheck.js` runs on ESPN's real payload for this game (`tools/fixtures/espn-summary-nd-mia-live-caughtup.json`). The "behind" record is that capture cut back to the kickoff, as David's screenshot shows it.
- The specimen is `tools/specimen/pbp-freshness.html`, with screenshots in `docs/design/review/2026-11-08-pbp-freshness/`. It shows four states: normal, catching up, the batch arriving, and back to normal.

## Decided

David, 2026-11-08, after the first screenshots:

- **Quarter format:** "3rd · 15:00", matching the Game screen.
- **Drive card while behind:** "Latest recorded drive", neutral platform styling, no field or legend, and a neutral placeholder. Restored when the record catches up.

The placeholder's sentence is Claude's wording, from the direction's own intent, and is up for creative review.
