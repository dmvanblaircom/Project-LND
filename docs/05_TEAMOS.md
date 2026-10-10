# TeamOS

## Role

TeamOS is the domain intelligence layer of Project LND. It is the brains between external sports sources and Suite.

```text
External sources -> TeamOS -> Suite
```

## Responsibilities

TeamOS owns:

- Team configuration
- External provider IDs
- Provider adapters
- Data normalization
- Schedule and game data
- Roster/player data
- Rankings
- News and media normalization
- Historical data
- Team capabilities
- Source freshness/status
- Derived team context

## What TeamOS Does Not Own

TeamOS should not own:

- Page layout
- CSS
- Navigation presentation
- Cards and visual components
- Fan interaction design
- Raw provider schemas exposed to the UI

## Example

```text
ESPN response
    |
    v
ESPN adapter
    |
    v
Normalized Game
    |
    v
TeamOS
    |
    v
Suite game card / game page
```

The Suite should not care whether a game came from ESPN, another provider, or a local snapshot.

## Current Implementation

TeamOS is a domain layer inside the existing repository: plain-script files in `teamos/`, loaded by `index.html` before the Suite screens and `app.js`, exposing one global, `TeamOS`. Every file is pure - no `fetch`, no DOM, no browser storage, no team names - and is tested in Node by the `tools/*check` gates. The as-built map of the whole application is `docs/engineering/current-architecture.md`.

| File | Provides |
|---|---|
| `team.js` | `TeamOS.createTeam(config.team)`: validates and freezes the provider-neutral Team (decision 0003) |
| `registry.js` | The program registry the chooser and the Top 25 read (decision 0014) |
| `identity.js` | `TeamOS.identity.create()`: how a team is presented inside Suite; refuses unreadable colours (decision 0009) |
| `snapshots.js` | Which Action-written files a team declares, and whether a loaded one is its own (decision 0008) |
| `sources.js` | Where a team's data comes from, for About Suite |
| `espn.js` | The ESPN adapter: schedule → `Game[]` (with neutral site, series and its kind), roster, team status, scoreboard → `LeagueGame[]`, rankings → `Poll[]`, summary → `GameDetail`, season statistics, news → `NewsItem[]`, logos |
| `cfbd.js` | CollegeFootballData through Suite's edge API: season yards allowed (decisions 0012, 0030) |
| `markets.js` | Kalshi events → this team's markets and the full field (W18) |
| `weather.js` | Open-Meteo forecast and geocoding → the kickoff or current weather at the venue |
| `game.js` | The game rules every surface shares: status, lifecycle and its views, the hero game, the recent final, day or night, the schedule preview |
| `live.js` | One live state per game across ESPN's three endpoints (decision 0010) |
| `season.js` | Season figures a team's own results answer (decision 0011) |
| `roster.js` | Which roster views a team has, the depth chart joined to the roster, availability and its history (decision 0019) |
| `outlook.js` | Which Season Outlook markets a team actually has |
| `milestones.js` | The next round number of all-time wins, from the team's official record plus the season's results |
| `notes.js` | The week's official game notes: a player's pronunciation, captaincy and honors by name; the series facts and By the Numbers only for the game they were written for |
| `freshness.js` | One page-level freshness state from each source's age (decision 0024 section 13) |
| `ratings.js` | FPI for Top 25 → Rankings (W07): tested, not loaded until its snapshot is scheduled |

### What TeamOS does now

- Defines what a Team is and rejects a malformed team config at startup; answers questions about every program in the registry.
- Turns every provider payload the Suite uses - ESPN, Kalshi, Open-Meteo, CollegeFootballData - into provider-neutral shapes (`docs/03_DOMAIN_MODEL.md`), applying the team config's `series` table and `sources` patches along the way. No Suite file reads a provider field.
- Decides the game rules once for every surface: which game is the hero, what state a game is in and which Game views it has, when a final rolls over, and one live state per game.
- Answers which of the Action-written team-data snapshots a team has and whether a loaded snapshot belongs to it.
- Defines how a team is presented and refuses a team whose text would be unreadable on its own surface, naming the measured contrast ratio. It never derives a colour on a team's behalf.
- Decides how fresh a screen's data is, from each source's own age.

### What TeamOS explicitly does not do yet

- **Fetch, cache or time anything.** `app.js` owns requests, the cache-first paint, polling and refresh; the service worker owns the offline copies; the GitHub Actions and the edge API fetch what the browser cannot (W10 tracks moving more of `app.js`'s stores into TeamOS).
- **Produce a snapshot for a second team.** The Action writes Notre Dame's team files only; a team that declares none gets the unavailable states (W20).
- **Lay anything out.** TeamOS says what a team's colours and type *are*; where accent goes, how cards stack and what the spacing is remain the Suite's.
- **Know about the fan.** There is no account, no followed-teams list and no personalization.

TeamOS is not an application framework. It has no `load()` and no adapter interface; each adapter has the shape its provider needs.

The goal is not to create a backend. The goal is to make ownership clear.

## Future Intelligence Layer

TeamOS can eventually provide structured context for AI experiences. For example, an AI preview should be able to consume:

- Upcoming game
- Recent results
- Injuries/availability
- Rankings
- Team trends
- Historical context
- Relevant news
- User's followed teams

That context should come from TeamOS rather than requiring the AI layer to understand every external provider independently.
