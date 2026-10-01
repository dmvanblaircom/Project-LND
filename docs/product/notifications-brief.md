# Proposal: notifications MVP (W19)

**Status:** Approved by David, 2026-10-01, as proposed (§8): kickoff and
final on by default, score changes opt-in; Cloudflare D1; the Phase 0 probe;
Live Activities out of scope for now. Phase 0 is built (`/v1/probe/espn` on
the edge API, run by each Saturday refresh). Phases 1-3 follow its result. No
notification UI ships until Phase 2, with Codex's opt-in row.

Follows: backlog W19 ("produce a bounded brief and service proposal
first"), the product blueprint (notifications are the first new MVP
pillar), the MVP validation framework ("notifications where the underlying
capability is reliable"), and decision 0030 (the edge API Worker; FCM only
if push grows).

## 1. The recommendation in one paragraph

Start with **web push from the installed Suite app, for one team, with three
events: kickoff, final score, and (opt-in) every score change.** The edge
API Worker watches that team's games and sends the push. Nothing needs an
account: the browser's push subscription is the identity. This is the
smallest version that answers "did my team just score / win?" without
opening the app. It does **not** give the lock-screen live scoreboard Apple
Sports shows: that is a Live Activity, which needs a native iOS app (see §6).

## 2. Events

| Event | Default | Example text | Why |
|---|---|---|---|
| **Kickoff** | On | "Notre Dame vs. [opponent] has kicked off." | Answers "has it started?" without opening the app. |
| **Final** | On | "Final: Notre Dame [score], [opponent] [score]." | Answers "did we win?" |
| **Score change** | Off (opt-in) | "Touchdown, Notre Dame. [score], [quarter] [clock]." | High value to the fan watching on a delay, high volume (every score in the game): off unless asked. |

Deferred until the first three are proven: depth chart / availability report
published, ranking changes, kickoff-time announced, news. Each is a new
source of pushes and a new way to annoy; add one at a time with evidence.

Wording comes from TeamOS's normalized game (team names from the team
config, scores from the same live state every screen uses, decision 0010),
never from a provider's text. No odds in a notification (decision 0025 keeps
odds as media metadata; a push is not the place).

## 3. Opt-in, preferences, and quiet behavior

- **Asked once, at a moment it makes sense:** a quiet "Get game alerts" row
  in More (and, after approval, a one-time offer on Game after a final). Never
  on first open, never a browser prompt without a tap first.
- **Per team, per event:** the three toggles above, for the active team. A
  fan who switches teams is asked about the new team; the old team's alerts
  keep going until turned off.
- **Quiet hours:** none are needed for the MVP events: they happen only
  around games the fan chose. Score changes stop at the final.
- **Off is one tap**, in the same place, and the browser's own setting also
  works: a subscription the browser revokes is deleted on the next send.

## 4. Correctness rules (where notifications go wrong)

- **One push per event, ever:** each event has a key (game id + event +
  score); the Worker records what it sent and never sends a key twice, even
  if the cron runs overlap or ESPN repeats itself.
- **Corrections:** a score that ESPN later revises (a reviewed touchdown
  taken off the board) gets one follow-up ("Correction: [score], the touchdown
  was overturned."), never a silent second "TD" push.
- **Never early, never invented:** final is sent only when ESPN's status is
  final (the same rule as `TeamOS.game.scored`, W04): a final without a
  score sends "Final" with no numbers, not 0-0.
- **Late is better than wrong, but late has a limit:** an event the Worker
  notices more than 15 minutes after it happened is dropped (a kickoff push
  in the 3rd quarter is noise). The final is the exception: it is always sent.
- **Postponed / canceled:** one push saying so, from ESPN's status; no kickoff
  push for a game that did not start.

## 5. Delivery: the service proposal

```
ESPN scoreboard --(Worker cron, every minute in a game window)--> event detection
      --> sent-events store (dedupe) --> subscription store (by team, by event)
      --> Web Push (VAPID) to each browser --> the installed Suite app
```

- **Where it runs:** the existing `suite-api` Worker (decision 0030). A cron
  trigger every minute, doing work only inside a game window (the same
  windows decision 0020 uses), so off-hours cost is a no-op.
- **Storage:** subscriptions and sent-event keys need a small database.
  Cloudflare D1 (SQLite, in the same account, within its free tier at this size) is the
  smallest step; decision 0030's Postgres is for accounts, which this does
  not need. **Decision for David** (§8).
- **Sending:** standard Web Push with VAPID keys, signed and encrypted in the
  Worker. FCM is not needed until fan-out outgrows what a Worker can send in
  one run; the subscription list makes the move to FCM a delivery change, not
  a redesign.
- **The app:** the service worker gains a `push` handler (show the
  notification) and a `notificationclick` handler (open the game). The
  subscription is posted to the Worker with the team and toggles; nothing
  else about the fan is stored.
- **Secrets:** the VAPID private key is a Worker secret, set the same way as
  the CFBD key (repository secret → deploy). Never in a log.

### Risks to check before building

| Risk | How it is checked |
|---|---|
| ESPN may answer Cloudflare's network differently than GitHub's (Kalshi rate-limits Cloudflare: decision 0030) | A probe route on the Worker that fetches the scoreboard during a game and reports status only. If ESPN refuses, detection moves to a GitHub Action, which is too slow for live scores (decision 0020) - that would cut the MVP to kickoff and final. |
| Worker cron limits (one-minute minimum; run time limits) | One minute is the floor: a score push can be up to ~60 seconds behind ESPN. Acceptable for "did we score", not for live play-by-play. |
| iOS delivers web push only to a Suite installed on the Home Screen (iOS 16.4 and later) | The opt-in row says so on iOS when the app is not installed, and links the existing install guidance. |

## 6. What this does not do: the Apple Sports "Live Activity"

The persistent lock-screen scoreboard in Apple Sports is a **Live
Activity** (Apple's ActivityKit). Only a native iOS app can start one; a web
app, installed or not, cannot. Getting it means a native iOS app (or a thin
native wrapper around Suite) plus Apple's push service for Live Activity
updates. That is a separate, larger decision (a second codebase to ship
through the App Store), not part of this MVP. The web-push MVP is the
step that proves fans want game alerts at all.

## 7. Phases and effort

| Phase | What | Rough size |
|---|---|---|
| 0 | ESPN-from-Worker probe during Saturday's game (read-only, no fan impact) | 1 evening |
| 1 | Worker: detection, dedupe, D1 store, VAPID send, tests with recorded game feeds | 2-3 sessions |
| 2 | App: service-worker push handlers, subscribe/unsubscribe, the More row (Codex designs the row) | 1-2 sessions |
| 3 | Real-device check with David: Android Chrome and installed iPhone, permission denied, unsubscribe, a full game | 1 game day |

Cost: inside Cloudflare's free tiers at this size (one team, hundreds of
subscribers). Revisit at thousands.

## 8. Decisions for David

1. **Scope:** the three events above, score change off by default - or a
   different set.
2. **Storage:** Cloudflare D1 for subscriptions and sent events (Claude's
   recommendation), or start with Postgres now.
3. **Phase 0 go-ahead:** a read-only probe of ESPN from the Worker during
   the Oct 3 game. It changes nothing a fan sees.
4. **Native app:** confirm Live Activities are out of scope for now (§6).

## 9. Done means

A fan who opts in on an installed Suite gets kickoff and final for their
team's next game, once each, correct, within about a minute; turning it off
stops them; a fan who never opts in sees no prompt and no change; and a
recorded-game test replays a full game's feed through detection and proves
the exact pushes it would send (including a correction and a postponement).
