# Decision: Suite v1 product behavior policies

## Status

Accepted. #2 is amended by decision 0025 (odds are compact media metadata:
values without "Pregame / Live / Closing Line" labels; still never implied
live). The text below is left as it was decided.

## Date

2026-09-23

## Decision

The canonical Suite v1 implementation uses the following product behavior policies. These rules are product decisions, not visual suggestions, and apply anywhere the implementation needs to choose among equivalent states.

1. **Fan-facing times use the user's device-local timezone.** Kickoff and other displayed event times should be converted to the timezone of the device viewing Suite. Team/venue-local time may still be used internally for policies that explicitly depend on local context, such as day/night atmosphere or recent-final expiration.

2. **Betting lines must be labeled by what they actually represent.** Suite must never imply a pregame or closing number is a live line. Use an accurate label such as `Pregame Line`, `Closing Line`, or `Live Line` only when the underlying source actually provides that state. If provenance/state is unclear, do not call the line live.

3. **Missing optional data disappears cleanly; meaningful absence gets an explicit state.** Examples:
   - no weather: omit weather;
   - no spread or O/U: omit betting information;
   - no supported Kalshi market: omit Season Outlook;
   - unranked team: omit rank instead of fabricating a value;
   - missing player or opponent imagery: use a neutral fallback;
   - no official injury/availability report published: state that the report is not yet available;
   - official report published with nobody listed: state that no players are listed on the latest report.

4. **Stale/offline data remains useful when a valid cached value exists.** Do not blank the product merely because the network is unavailable or a source is stale. Continue showing the most recent valid cached data and disclose freshness when it matters with language such as `Updated 42 min ago`, `Offline`, or `Data may be outdated`. Never present stale data as current without disclosure.

5. **Exceptional game states are explicit.**
   - `Delayed`: keep the current-game hero/context and replace clock/kickoff treatment with DELAYED.
   - `Suspended`: preserve score and game context and label SUSPENDED.
   - `Postponed`: preserve the matchup, remove a misleading countdown, label POSTPONED, and show the new date/time when known.
   - `Canceled`: show CANCELED; once the schedule supplies another valid upcoming game, the canceled game no longer owns the current upcoming-game hero.

6. **The Game experience changes by lifecycle.**
   - Pregame: `Game Details | Tickets`.
   - Live: `Drive Tracker | Box Score | Plays | Stats`.
   - Final: `Box Score | Plays | Stats`, with Box Score as the default postgame view.
   Drive Tracker is a live-first experience and is not the default after the game is final.

7. **Change Team uses a contextual chooser when entered from Settings.** Initial onboarding can use the chooser with no bottom navigation and no Back control. An established user entering Change Team from Settings gets a Back/Cancel path that preserves the current team. Selecting a new team switches immediately using the existing team registry/runtime selection model.

8. **Schedule and Results treat exceptional games differently.** Postponed and canceled games remain part of the season chronology. Results contains only genuinely completed games. A canceled game is not a result. A postponed game remains in Schedule and moves to its updated date/time when the normalized schedule provides one.

9. **`Project LND` is never customer-facing.** It is an internal project/repository name only. The application must not expose it in About, Settings, visible metadata, error messages, PWA labels, share text, customer-facing copy, or other UI. The fan-facing product identity is `Suite`; team-specific experiences may use approved team-specific names where intentionally designed.

10. **A recent Final owns the Home hero through the end of the following calendar day in the team's local timezone.** This implements a `today / tonight / yesterday` behavior rather than a rolling 24-hour period. After that local-calendar boundary, Home repaints to the next valid upcoming game. This rule must live behind one named policy/helper rather than duplicated renderer logic.

11. **Game atmosphere uses one deterministic local-kickoff rule.** Before 6:00 PM in the game/venue local timezone is DAY; 6:00 PM or later is NIGHT. The threshold should exist in one named policy/helper and must not be inferred from current weather.

12. **Feedback v1 uses email, not a fake backend.** The approved destination is `suiteappfeedback@gmail.com`. A `mailto:` flow may prefill non-sensitive context such as selected team, current page, and app version. Do not show a fake submitted-success state because the user's mail client owns sending.

13. **Manual Refresh is a Settings utility, not a primary header action.** Preserve automatic refresh behavior. Settings may expose `Refresh Data` and useful freshness information such as `Last updated` when the underlying freshness model supports it.

## Context

The canonical Suite reference screens deliberately do not cover every edge state or subview. During the 2026-09-23 implementation planning pass, Claude Code correctly surfaced several places where engineering would otherwise have to invent product behavior. These rules close those gaps so the implementation can remain deterministic and consistent across Home, Game, Schedule, Roster, Settings, and offline/stale states.

These policies also separate three different concepts that must not be conflated:

- **display context** for the fan, such as device-local kickoff time;
- **team/game local context** used for product policies, such as recent-final expiration and day/night atmosphere;
- **data provenance/state**, such as whether a betting line is pregame, closing, or truly live.

## Rationale

The selected approach favors truthful state representation, graceful degradation, and consistency over placeholder data or invented behavior. Optional content should not create noisy empty states, while absences that carry real meaning must remain explicit. Cached data should remain useful offline without pretending to be fresh. Game lifecycle and exceptional-state rules should be shared domain policies so Home, Game, Schedule, and other surfaces cannot disagree.

## Consequences

- TeamOS/Suite state helpers should expose enough normalized information to distinguish live/final/exceptional game states and line provenance.
- UI renderers should consume shared policy decisions rather than reimplementing them per screen.
- Device-local display time and team/venue-local policy time must remain distinct concepts.
- Availability must preserve the existing `report exists but nobody listed` versus `no report` distinction from decision 0019.
- Cached/stale data needs visible freshness semantics when a fan could otherwise mistake it for current data.
- The Game tab must support different subnavigation before, during, and after games.
- Change Team needs entry-context awareness without creating another team registry.
- Customer-facing strings and metadata should be audited for accidental `Project LND` exposure.
- Feedback implementation can ship without backend infrastructure in v1.

## Owner

David (Product Owner), with ChatGPT documenting the approved product decisions for Claude Code implementation.

## Related Documents

- `docs/decisions/0010-one-live-state-per-game.md`
- `docs/decisions/0019-depth-is-slots-availability-is-its-own.md`
- `docs/decisions/0020-data-freshness-and-isolated-sources.md`
- `docs/decisions/0021-interim-suite-presentation.md`
- `docs/06_SUITE.md`
- `docs/09_AI_OPERATING_SYSTEM.md`
