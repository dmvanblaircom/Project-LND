# Project LND Domain Model

The domain model should describe sports concepts, not provider schemas.

## Core Entities

### Sport

Represents a sport such as football, basketball, baseball, hockey, or soccer.

### League

Represents a competition or league such as NCAA/FBS, NFL, NBA, MLB, NHL, MLS, or EPL.

### Team

Represents the core team identity. **Implemented in Phase 2** as `TeamOS.createTeam()` in `teamos/team.js`, which validates the `team` section of a team config and returns a frozen, provider-neutral object.

Fields (all required):

- `id` — stable domain id, e.g. `"notre-dame"`
- `name`
- `abbreviation`
- `sport`
- `league`
- `venue.name`, `venue.lat`, `venue.lon` — the home field

Team is provider-neutral: it carries no ESPN, Kalshi or other provider identifiers. Those live in the team config's `sources` section (see `docs/04_TEAM_CONFIG.md` and `docs/decisions/0003-team-is-provider-neutral.md`).

Not yet modelled, pending a real need: `shortName`, conference/division, history. Identity is a separate object (below); capabilities arrived in Phase 5B as snapshot declarations.

### Team Identity

How a team is presented. **Implemented in Phase 6** as `TeamOS.identity.create()` in
`teamos/identity.js`, which validates the `identity` section of a team config, refuses
one that would render unreadable text, and returns a frozen object.

What it carries is exactly what the Suite renders, and nothing else:

- `productName`, `programLabel` — the product's name for this team, and the label above it
- `title` / `shareTitle`, `description` / `shareDescription` — the document head and the share cards
- `motto` — a team thing, `null` for a team without one
- `newsLabel` — the rule above the News tab
- `manifest` — the team's own web-app manifest
- `colors` — eleven roles, of which `accent` is a **fill** and `accentText` is the
  separately configured colour for accent-coloured **type**; plus optional `text` /
  `textDim` when a team's surface needs a different neutral
- `fonts` — `ui`, `display`, `headline` as CSS stacks
- `assets` — favicon, icons, share image; each optional, and each omitted from the
  document when the team does not have it

Not modelled, because nothing renders them: logos, wordmarks, helmets, imagery,
secondary/tertiary colour scales.

### Venue

Represents a home or game venue and relevant location information.

### Game

A team-perspective representation of a scheduled, live or completed game. **Implemented in Phase 3A**, produced only by the TeamOS ESPN adapter (`TeamOS.espn.schedule()` in `teamos/espn.js`).

Game is provider-neutral: nothing in it names ESPN or carries an ESPN key. It is written from the team's point of view — `home`, `us`/`them`, `won` — because that is what a team's Suite renders. The neutral home/away form for league-wide views is `LeagueGame`, below; the two are kept distinct on purpose.

Fields, in order:

| Field | Meaning |
|---|---|
| `id` | the game's id (currently the provider's event id, used as an opaque key) |
| `date` | kickoff, ISO 8601 |
| `timeSet` | whether the kickoff time is real or a placeholder |
| `home` | the team is the listed home side |
| `neutral` | neutral site, whether flagged by the feed or inferred from the venue |
| `oppName` | opponent's short name |
| `oppRank` | opponent's rank if inside the top 25, else `null` |
| `venue` | venue name |
| `city` | venue city |
| `venueState` | venue's U.S. state code, e.g. `"IN"` |
| `zip` | venue zip |
| `net` | broadcast network(s), or `""`; includes the team config's broadcast fallback when the feed has none |
| `odds` | `{ line, total }` or `null`; may be filled after the fact by `TeamOS.espn.gameOdds()` |
| `series` | trophy/series name from the team config's `series` table, or `null` |
| `state` | **game status**: `"pre"`, `"in"` or `"post"` |
| `detail` | human-readable status text, e.g. `"Final"` or `"9/19 - 7:30 PM EDT"` |
| `us`, `them` | scores as displayed, or `null` before kickoff |
| `won` | `true` when the team won; `false` otherwise, including before kickoff |

`state` and `venueState` are distinct on purpose. Before Phase 3A both meanings were written to one `state` key and the game status won, so the venue's state was never available; `venueState` corrects that (see `docs/decisions/0004-adapters-are-pure.md`).

Games are plain objects and are not frozen; the application patches `odds` onto the next game once the pregame line arrives.

Not yet modelled: season, weather (computed by the application from `venue`/`city`/`zip`).

### LeagueGame

A game in the league, seen from nowhere in particular. **Implemented in Phase 4A**, produced only by `TeamOS.espn.scoreboard()`. It is deliberately distinct from `Game`: `Game` answers "what is my team doing", `LeagueGame` answers "what is happening in the league this week". The two are not merged because every consumer of one would need conditionals to read the other.

| Field | Meaning |
|---|---|
| `id` | the game's id (provider event id, opaque; rows are keyed on it) |
| `date`, `timeSet` | kickoff and whether the time is real |
| `state`, `detail` | `"pre"` / `"in"` / `"post"` and the status text |
| `venue` | venue name |
| `net` | broadcast network(s), or `""` |
| `odds` | `{ line, total, provider }` or `null` (decision 0025) |
| `home`, `away` | `{ name, abbr, providerId, rank, record, score }` — `abbr` the short code or `null`; `providerId` opaque, handed back only to ask for the program's mark; `rank` is `null` outside the top 25; `record` the overall record or `null`; `score` the displayed string or `null` |
| `mine` | the team is one of the two sides |
| `live` | `{ downDistance, lastPlay }` while `state === "in"`, else `null` |

The adapter returns every game the feed lists, oldest first; "ranked games" are the ones where either side has a rank, and "is anything live" is `some(state === "in")` — both derived by the application from the list.

### Poll

One ranking. **Implemented in Phase 4A**, produced by `TeamOS.espn.rankings()`, which also decides which polls matter (CFP, AP, Coaches — FCS and lower divisions dropped), orders them (CFP first) and keeps one per label when the feed publishes a poll twice.

```
{ key, label, name, asOf, updated, ranks: [ { rank, team, abbr, providerId, record, previous, isNew, change, mine } ] }
```

`key` is the label with non-alphanumerics stripped (used for routes and remembered selection); `label` ∈ `"CFP" | "AP" | "Coaches"` or a short name; `asOf` e.g. `"Week 3"`; `updated` when the poll was published (ISO) or `null`. In a rank, `previous` is the prior rank or `null`, and `isNew` is true for a team new to the poll — kept separate because the feed distinguishes "was unranked" from "no history". `change` is places moved since the last poll, up positive, and `null` when there is no earlier rank to measure from; it is never taken from the feed's own trend text, which for a new entry counts from outside the 25.

### GameDetail

Everything the Game Center renders for one game. **Implemented in Phase 4B**, produced only by `TeamOS.espn.gameDetail(summary, team, config)`. It is a composite of small optional sections, each mirroring one block of the Game Center and `null` when the feed has nothing for it, so a missing section drops out rather than blanking the tab. Every field has a current Suite consumer; nothing is carried because the provider happens to send it.

`Game`, `LeagueGame` and `GameDetail` are three distinct objects: my schedule, the league this week, and the one game on screen.

```
{ state, detail,
  home: Side, away: Side,
  lastPlay:  { text, possession, downDistance } | null,
  winProb:   { homePct } | null,
  linescore: { away: string[], home: string[] } | null,
  teamStats: [ { label, away, home, better } ] | null,
  leaders:   { away: [ { category, name, line } ], home: [...] } | null,
  box:       { away: [ { title, labels, rows: [ { name, jersey, stats: string[] } ] } ], home: [...] } | null,
  scoring:   [ { period, clock, teamAbbr, mine, text, awayScore, homeScore } ] | null }
```

| Section | Meaning |
|---|---|
| `state`, `detail` | `"pre"` / `"in"` / `"post"` and the status text (`"Final"`, `"3:23 - 2nd"`, the kickoff line) |
| `home`, `away` | a `Side` each (below) |
| `lastPlay` | the live situation's last play, else the last play of the current drive, else of the last drive; `possession` is the abbreviation of the side with the ball, `downDistance` e.g. `"2nd & 7 at WIS 34"` |
| `winProb` | the latest home win probability, 0–1; the view shows it only while live |
| `linescore` | per-period display values for each side; the view labels periods 1–4 and OT |
| `teamStats` | the eight fixed rows (Total yards … Possession), values as displayed or `null`, and which side is `better` — `"away"`, `"home"` or `null`. Fewer turnovers and penalties win; penalties compare by count; `5-13` compares as a rate and `28:24` as seconds |
| `leaders` | per side, one line per category (`Passing`, `Rushing`, `Receiving`, `Sacks`, `Tackles`, `Int`) |
| `box` | per side, one table per category with its own column `labels` |
| `scoring` | each scoring play in order, with the score after it and whether it was ours |

There is no `id`: the Game Center keys on the `Game` it was opened from. There is no drive list, play-by-play, win-probability history or pregame line here: the line is `TeamOS.espn.gameOdds()` on the same payload, and the rest has no consumer.

### Side

One team in a `GameDetail`: `{ key, name, abbreviation, record, score, mine, colors }`. `colors` is `{ primary, alt }`, the program's published colours as `#RRGGBB` or `null`, so a view can tell the two teams apart (the Drive Tracker draws a drive in the colour of the team with the ball). `key` is an opaque correlation key (today the provider's team id, the same precedent as `Game.id`) whose only consumer is the matchup preview asking for that side's season stats; `score` is the displayed value or `null`; `mine` marks the selected team.

### SeasonStat

`{ key, label, value, rank, rankText }` — one row of the pregame matchup card. **Implemented in Phase 4B**, produced by `TeamOS.espn.seasonStats(json)` as a fixed list of nine rows in order:

| `key` | `label` | Source |
|---|---|---|
| `pointsFor` | Points per game | provider |
| `pointsAllowed` | Points allowed | **derived** by `TeamOS.season` from the team's own results |
| `totalOffense` | Total offense | provider |
| `rushOffense` | Rushing offense | provider |
| `passOffense` | Passing offense | provider |
| `yardsPerPlay` | Yards per play | provider |
| `sacks` | Sacks | provider (`defensive.sacks` — the bare name is ambiguous) |
| `tacklesForLoss` | Tackles for loss | provider |
| `turnoverMargin` | Turnover margin | provider |

`key` is stable and provider-neutral; it is what lets a caller fill a row the provider cannot answer without matching on display copy. `value` is `null` when the feed has the stat under none of the names that row is filed under, and the view skips a row null on both sides. `rank`/`rankText` are `null` for a derived row — computing a national rank would mean holding every team's season — and the view then omits the rank and the better-rank marker for it.

Rushing and passing *defense* are deliberately absent: ESPN's team statistics endpoint carries no opponent-facing data, and the `pointsAllowed`/`yardsAllowed` fields it does publish are permanently `0` ranked `Tied-1st`. See `docs/decisions/0011-derived-season-figures.md`.

### Player

A roster entry. **Implemented in Phase 3B**, produced only by `TeamOS.espn.roster()`. Provider-neutral; exactly the fields the roster view shows and searches, all strings, empty when the feed has nothing:

| Field | Meaning |
|---|---|
| `name` | display name |
| `jersey` | number as printed, e.g. `"75"`; a string, sorted numerically by the view |
| `position` | abbreviation, e.g. `"OL"`, falling back to the full name |
| `positionName` | full position name, e.g. `"Offensive Lineman"` — kept so a search for "quarterback" matches |
| `height`, `weight` | as displayed, e.g. `"6' 7\""`, `"320 lbs"` |
| `classYear` | e.g. `"SR"` |
| `hometown` | `{ city, state }`; `state` is `""` for players from outside the U.S. |

### RosterGroup

`{ key, label, players: Player[] }` — a unit of the roster: `key` is the feed's unit key lowercased (`"offense"`, `"defense"`, `"specialteam"`), `label` is the display label. Empty units are dropped; a feed that sends a flat list yields one group `{ key: "all", label: "Roster" }`. Produced by `TeamOS.espn.roster()`.

### TeamStatus

`{ rank, record }` — the team's current poll rank (`null` outside the top 25) and overall record string (`"2-0"`, or `null`). **Implemented in Phase 3B**, produced by `TeamOS.espn.teamStatus()`; drives the two header chips.

### Depth

Depth chart, availability and sport-specific lineup concepts. Not yet modelled: the Depth tab consumes the Action-written `depth.json` snapshot directly.

### Ranking

See `Poll` above.

### NewsItem

One story in the News tab. **Implemented in Phase 4C**, produced by `TeamOS.espn.news(json)` for ESPN's team feed; the beat-writer snapshot the Action commits as `news.json` carries the same fields (`title`, `link`, `source`, `published` as ISO text, never an image) and is converted by a three-line helper in the application, because it is this project's own format, not a provider's.

```
{ title, link, image, source, publishedAt }
```

| Field | Meaning |
|---|---|
| `title` | headline |
| `link` | the article's web URL |
| `image` | thumbnail URL, or `""` |
| `source` | the outlet's display name — `"ESPN"`, `"One Foot Down"`, … — which the view also uses to style ESPN stories differently |
| `publishedAt` | epoch milliseconds, or `null` when the feed gave no usable date |

Exactly the fields the News tab shows. Not modelled: id, summary, byline, categories, team/league association. Merging the two sources, dropping duplicate headlines, ordering newest-first and the "show more" fold are presentation and stay in the application; ESPN does not deliver its feed in date order, so that sort is load-bearing.

### Media Item

Represents podcasts, videos, social content, or other media sources.

### History

Represents historical seasons, records, results, rivalries, championships, and related context.

### User

Represents a fan once personalization/account functionality is introduced.

### My Teams

Represents the teams a user follows and the user's preferences around them.

### Event

A generic domain event that can support schedules, notifications, community activity, or future workflows.

## Domain Principles

1. Domain objects should be provider-neutral.
2. Provider-specific IDs can exist as external identifiers but should not become domain identity.
3. Optional fields are preferable to fake universal concepts.
4. Sport-specific concepts should be modeled intentionally.
5. Suite should consume domain objects rather than raw APIs.
