# Play-by-play freshness state

**Status:** creative direction from ChatGPT (Creative Director), 2026-11-08. Implemented for creative review; the visual implementation is not yet approved. David agreed to the improvement on 2026-11-08.

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
| **Placement: Drive Tracker** is quieter, with misleading descriptions and counts suppressed | `driveCard()`: "Drive details updating" in place of the description; the field drawing's label drops the description too |
| **Placement: Home** shows no indicator | Home is untouched |
| **One shared state**, no conflicting indicators | `TeamOS.game.feedState()` is computed once per draw (`app.js feedOf()`); both cards read `m.feed` |
| **Copy:** "Play-by-play is catching up" / "The game clock is ahead of the latest recorded play." / "Drive details updating" | As given; provider-neutral |
| **Keep the latest logged play visible**, with its quarter and clock | Shown as "3rd · 15:00 …". The down and distance from the record are not shown while it is behind, since they describe the situation it has not caught up with |
| **Visual:** small, restrained, neutral; no warning colours, spinner or animation | Inset surface, a neutral rule, ink and secondary ink. The same in both App Styles and for every team: nothing in it takes a team colour |
| **Detection:** existing data only; 90 s threshold; new quarter counts only as its clock runs | Game time elapsed from the scoreboard's clock and quarter against the latest logged play's. A quarter turning over is no gap. Regulation only, since overtime has no clock |
| **Clearing:** when caught up | Behind at 90 s or more; caught up under 60 s, so a gap near the line doesn't flicker |
| **Catch-up:** plays appear normally, with no moments, replays or celebration | The batch renders as ordinary plays. Production has no game-moment animations yet; when Stage 3 wires `TeamOS.moments`, a refresh that ends a behind state must be refused as reconciliation |
| **Accessibility:** announce entry once, politely | `say()` into the existing polite region, only on the change into the state. Silent on later refreshes and on catching up. Nothing moves, so reduced motion has nothing to stop |

## Evidence

- `tools/pbpfreshcheck.js` runs on ESPN's real payload for this game (`tools/fixtures/espn-summary-nd-mia-live-caughtup.json`). The "behind" record is that capture cut back to the kickoff, as David's screenshot shows it.
- The specimen is `tools/specimen/pbp-freshness.html`, with screenshots in `docs/design/review/2026-11-08-pbp-freshness/`. It shows four states: normal, catching up, the batch arriving, and back to normal.

## Open question for creative review

The drive card's **title** comes from the record too. At 12:05 it read "Notre Dame drive" while Miami had the ball, because the record had filed the kickoff under Notre Dame. The direction suppresses descriptions and counts, so the title is kept. Should it read something neutral, such as "Latest recorded drive", while the record is behind?
