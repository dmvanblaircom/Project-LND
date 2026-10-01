# Suite

## Role

Suite is the fan-facing destination in Project LND.

If TeamOS is the brains, Suite is the experience.

Irish Watch is the first Suite implementation.

## Persistent Destination

Suite should feel like a place a fan returns to every day, not a page they open only during a game.

Potential experiences include:

- Home / Now
- Game Day
- Team
- News & Media
- History
- Community

## Suite Today

One Suite renders every configured team; Irish Watch is Notre Dame's. Its destinations (decisions 0022, 0023, 0028), each drawn by a file in `suite/`:

- Home - the hero game, Season Outlook, the schedule preview, news
- Top 25 - Games and Rankings (national content, with the team as quiet context)
- Game - the hero game through its lifecycle: preview, live, final
- Roster - Depth Chart, Roster and Availability, as the team has them
- More - News, Schedule and Results, Settings (App Style, Change Team, Refresh Data), Feedback, About Suite

`suite/nav.js` routes them on the page's hash, so Back walks every view. A screen's peer views also change with a sideways swipe, and a pull down from the top of any screen refreshes it - the same refresh as Settings' Refresh Data.

The shell was evolved rather than thrown away: the same page, offline behavior and accessibility, rebuilt screen by screen to the canonical Suite design (`docs/engineering/suite-redesign-completion.md`).

## Contextual Experience

The destination can change based on context:

### Game Day

Prioritize live score, game status, key information, game thread, and relevant context.

### Post-Game

Prioritize final score, recap, key moments, analysis, and reaction.

### Offseason

Prioritize news, recruiting, roster movement, schedule, history, and upcoming events.

## Team Identity

Suite inherits team identity from TeamOS: `app.js` reads one object, `TeamOS.identity.create(TEAM_CONFIG, TEAM)`, and applies it in one place, `paintIdentity()`, which sets the tab title ("Notre Dame · Suite"), the SUITE bar's team context on every screen (mark and name, decision 0031), the nickname Home's hero uses and the stylesheet's `--t-*` tokens. `app.css` keeps its own rules, spacing, layout and semantic colours; what it does not keep is a team's values.

- Colours - as a **fill** (`accent`) and, separately, as legible **text** (`accentText`, `accentOnLight`)
- Typography - the team's UI and display stacks
- Terminology - the program label and the team's tagline (none for a team without one)
- Team-specific capabilities - through `TeamOS.snapshots`

The installed product - its name, icons, manifest and share card - is Suite's and the same for every team (decision 0024 section 11). A fan can choose Suite Style instead of Team Style in Settings (decision 0026): Suite's own colours and type for every team, with the team's name, mark and tagline unchanged.

The team should feel like the product rather than a filter applied to a generic sports interface. The test is that the Suite contains no team name, no team colour and no `if (TEAM.id === ...)`; `tools/adaptercheck.js` asserts all three.

## Future My Teams

A user should eventually be able to follow multiple teams while still receiving distinct team experiences.

Example:

- Notre Dame
- Ohio State
- Cleveland Cavaliers
- Cleveland Guardians

The user's personalized layer can then organize activity across those teams without flattening their identities into one generic UI.

## Community

Potential future Suite capabilities include:

- Game threads
- Fan posts
- Polls
- Predictions
- Reactions
- Discussion

These capabilities should be designed around the team destination.
