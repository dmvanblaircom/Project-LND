# Proposal: notifications MVP (W19)

**Status:** Approved by David, 2026-10-01, as proposed (§8): kickoff and
final on by default, score changes opt-in; Cloudflare D1; the Phase 0 probe;
Live Activities out of scope for now. Phase 0 is built (`/v1/probe/espn` on
the edge API, run by each Saturday refresh). Phases 1-3 follow its result. No
notification UI ships until Phase 2, with Codex's opt-in row.

**Oct 3:** Phase 0 answered yes: every Saturday run reached ESPN from the
Worker (the last in 112 ms, all 59 FBS games). David asked to test live on
the Ohio State game, so Phases 1-2 were built for **kickoff and final**:
- **Storage:** score changes (opt-in) come later. The store is a SQLite
  Durable Object rather than D1, because the deploy creates it and the
  Workers-only token needs no new permission. It is the same SQLite.
- **The app:** a provisional "Game Alerts" section in Settings, until
  Codex's design.

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

**Postseason events (David, 2026-10-02), queued after the first three.** The
dates come from the league's published calendar (`leagues/`, decision 0033),
the outcomes from the same feeds the screens use:

| Event | Default | Example text | When |
|---|---|---|---|
| **CFP rankings released** | Off (opt-in) | "The CFP rankings are out: [team] is No. [n]." / "...: [team] is not in the top 25." | After each Tuesday show, Nov 3 to Dec 1 (2026) |
| **Selection Day reminder** | On, once | "Selection Day is today. The playoff field is revealed at [time] on ESPN." | Morning of Selection Day, Dec 6 (2026) |
| **Team's postseason set** | On | "[Team] is in the College Football Playoff: No. [seed] vs. [opponent], [date]." / "[Team] will play [opponent] in the [bowl], [date]." | When the team's playoff or bowl game appears, Selection Day |
| **No postseason** | Off | "[Team]'s season is complete: no bowl this year." | Only once selection is known (TeamOS.season.phase `not-selected`), never inferred from an empty feed |

**"Default" means the switch's position when a fan first turns alerts on,
never a new kind of push switched on for fans already subscribed** (the
noise rule, §3). A fan who turned on kickoff and final gets nothing else
until they turn it on. When a new kind ships, it starts off for existing
subscribers, and Settings shows it with its own switch.

The last two read the season model (`TeamOS.season.phase`, `Game.stage`), so
a bowl's name is ESPN's own words. No time is promised for a bowl
announcement: bowls name their teams through Selection Day afternoon, after
the playoff field (2025 practice), and the push fires when the game appears.

Wording comes from TeamOS's normalized game (team names from the team
config, scores from the same live state every screen uses, decision 0010),
never from a provider's text. No odds in a notification (decision 0025 keeps
odds as media metadata; a push is not the place).

## 2b. Alert options: round 2 (proposal for David, 2026-10-09)

David, 2026-10-09: *"Make it a toggle where users can pick every score, my
team only, quarter score, halftime score, close finish, and final only + any
others you recommend. Also an easy way for all to be selected. Edge cases
should be considered for UX."* **Status: approved by David, 2026-10-09, as
written, plus "Kickoff time set" (moved up from "Other alerts" below).**
Built after Saturday's live test proves kickoff and final.

### The settings screen (Settings → Game Alerts, for the active team)

```
Game Alerts                                   [ On ]

Quick picks:  ( Everything )  ( Key moments )  ( Final only )

GAME
  Kickoff                                       [on]
  Final score                                   [on]
  Delays & postponements                        [on]
  Kickoff time set                              [off]
     When a TBA game gets its time, or a set time moves

SCORING
  ( ) Off   ( ) My team's scores   (•) Every score

UPDATES
  End of each quarter                           [off]
  Halftime score                                [off]
  Close finish                                  [off]
     One alert when it's a one-score game late in the 4th, and if it goes to OT
```

- **Scoring is one choice, not two switches.** "My team's scores" and "Every
  score" can't both be on, so there's nothing to reconcile.
- **Quick picks set the switches, then step aside.** A pick is a shortcut, not
  a mode: after tapping one, any switch can still be changed. The pick shows
  as selected only while every switch matches it.
  - **Everything:** every switch on, scoring set to Every score.
  - **Key moments:** kickoff, halftime, close finish, final, delays. No
    per-score alerts.
  - **Final only:** final score only. Delays stay on, because a postponed
    game has no final.
- **"Everything" means everything the fan can see today.** When a new kind
  of alert ships later, it starts off for existing subscribers (the noise
  rule, §2), so "Everything" stops showing as selected until they turn it on.
  Nothing new is ever switched on for them.
- **Turning every switch off turns Game Alerts off,** and the screen says so
  ("No alerts selected, so Game Alerts are off"). A subscription that would
  send nothing is deleted, not kept.
- **Defaults for a first-time sign-up:** kickoff, final and delays on, as
  approved on Oct 1 (§2). Everything else is off.

### What each alert says

| Alert | Example | Sent when |
|---|---|---|
| Score (every / my team) | "Touchdown, Notre Dame. ND 21, STAN 7 · 2nd 4:12" | ESPN's score changes |
| End of quarter | "End of 1st: ND 14, STAN 7" | End of the 1st, 2nd and 3rd quarters (the 2nd is the halftime alert when Halftime is also on, edge case 1) |
| Halftime | "Halftime: ND 21, STAN 10" | ESPN's status reads halftime |
| Close finish | "One-score game: ND 24, STAN 20 · 4th 4:51" | Once, the first time it's within 8 points with 5:00 or less left in the 4th |
| Overtime | "Overtime: ND 27, STAN 27" | When OT starts (part of Close finish) |
| Kickoff time set | "Notre Dame vs. BYU: Sat, Oct 17, 7:30 PM ET on NBC" | A TBA game gets its time, or a set time moves |
| Delay / postponed / canceled | "Weather delay: ND 7, STAN 3 · 2nd 9:15" / "Postponed: Notre Dame vs. Stanford" | ESPN's status changes to it |

### Edge cases, and what happens

1. **"End of each quarter" and "Halftime" both on:** one alert at the half,
   not two. The halftime alert stands in for the end of the 2nd.
2. **The end of the 4th quarter** is the final, or overtime. There is no
   separate "End of 4th" alert.
3. **A score as the quarter ends:** the score alert goes, then the quarter
   alert. They are different things the fan asked for; both carry the same
   score, so nothing contradicts.
4. **One card per game on the lock screen.** Score, quarter and halftime
   alerts share a game tag, so each replaces the last instead of stacking
   eight cards in a 52-0 game. The phone still buzzes each time. Kickoff,
   close finish and the final get their own cards.
5. **An overturned touchdown:** one correction, only to devices that got
   the original ("Correction: the Notre Dame touchdown was overturned. ND 14,
   STAN 7"). Never a silent second alert.
6. **Close finish fires once.** If the lead grows and the game tightens again,
   no second alert. Overtime is its own single alert. A blowout never sends
   one.
7. **Late detection.** A score or quarter alert noticed more than 5 minutes
   late is dropped: a 2nd-quarter score arriving in the 3rd is noise. The
   final is always sent (as today, §4).
8. **Delay before kickoff:** a delay alert, but no kickoff alert until the
   game actually starts. A game postponed before kickoff gets the postponed
   alert and nothing else.
9. **Both teams followed, and they play each other** (ND vs. OSU on one
   device): one alert per event, not one per team.
10. **Changing options mid-game** takes effect from the next event; nothing
    already sent is repeated.
11. **iPhone Focus mode** can hold alerts back (Oct 7). Settings gets one
    line: "If alerts don't arrive, allow Suite in your Focus settings."
12. **Kickoff time set** is about the schedule, not the game: one alert
    when ESPN first gives a TBA game a time, and one each time a set time
    moves. Not within 3 hours of the old kickoff (that is a delay, and the
    delay alert covers it), and never for a game already under way or final.
    It is in Everything, not in Key moments or Final only, and off for a
    first-time sign-up: it fires days before the game.

### Other alerts considered

- **Kickoff time set:** added to this round by David (Oct 9); see the
  table and edge case 12.
- **Not recommended:** upset alerts and other teams' games. Those are
  alerts the fan didn't ask for about games they didn't pick, which is
  exactly what the noise rule rules out.

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
- **No notification without a reason the fan would name** (David, Oct 7).
  The moment fans start getting alerts they don't need, they tune all of them
  out, and then none of them are worth anything. Every push must be one the
  fan asked for and would miss. Each new kind of push is weighed against that
  rule before it ships, and none is ever switched on for fans who already
  subscribed: they turn it on themselves (§2).
- **The "Game alerts are on" test push is for testing, not for launch.**
  Turning alerts on sends one confirmation push, so a broken setup shows up
  before a game rather than during one. On Oct 7 it caught a Focus mode
  holding alerts back. David: keep it for now. **Before any public launch,
  replace it with an on-screen confirmation, or send it only the first time
  a device turns alerts on, so toggling stays silent.**

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
