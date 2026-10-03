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
| `neutral` | neutral site, whether flagged by the feed or inferred from the venue (a pro or event venue, or the team listed at home away from its own field; never a stadium a college team plays its home games in) |
| `oppName` | opponent's short name |
| `oppRank` | opponent's rank if inside the top 25, else `null` |
| `oppProviderId` | the opponent's provider id (digits) or `null`; it only ever feeds `TeamOS.espn.mark()` |
| `oppAbbr` | opponent's abbreviation, for the initials fallback when there is no mark |
| `usRank` | the team's rank if inside the top 25, else `null` |
| `usRecord`, `oppRecord` | overall records, `"3-0"`, or `null` when the feed has none |
| `venue` | venue name |
| `city` | venue city |
| `venueState` | venue's U.S. state code, e.g. `"IN"` |
| `zip` | venue zip |
| `net` | broadcast network(s), or `""`; includes the team config's broadcast fallback when the feed has none |
| `odds` | `{ line, total }` or `null`; may be filled after the fact by `TeamOS.espn.gameOdds()` |
| `series` | trophy, rivalry or event name from the team config's `series` table, or `null` |
| `seriesKind` | `"trophy"`, `"rivalry"` or `"event"` (W21), or `null` |
| `state` | **game status**: `"pre"`, `"in"` or `"post"` |
| `detail` | human-readable status text, e.g. `"Final"` or `"9/19 - 7:30 PM EDT"` |
| `status` | the game's finer status, from the provider's documented values: scheduled, live, final, delayed, suspended, postponed, canceled (decision 0022 #5) |
| `hasStarted` | whether play has begun, which decides Game's views |
| `period`, `clock` | the quarter (5 and up is overtime) and the game clock |
| `newDate` | a postponed game's replacement date when a source states one trustworthily; `null` from ESPN, which does not |
| `us`, `them` | scores as displayed, or `null` before kickoff |
| `won` | `true` when the team won; `false` otherwise, including before kickoff |
| `postseason` | `true` for a bowl or playoff game (W16) |
| `stage` | `{ kind, round, bowl, last, text }` from the provider's note on the game, or `null` when it carries none. `kind` is `playoff`, `bowl` or `other` (a conference title game, a series). `round` is the playoff round: First Round, Quarterfinal, Semifinal or National Championship. `bowl` is the bowl's name as published, sponsor included. `last` is `true` when no game can follow it that season: a bowl, or the title game. `text` is the note word for word. |

`state` and `venueState` are distinct on purpose. Before Phase 3A both meanings were written to one `state` key and the game status won, so the venue's state was never available; `venueState` corrects that (see `docs/decisions/0004-adapters-are-pure.md`).

Games are plain objects and are not frozen; the application patches `odds` onto the next game once the pregame line arrives.

Weather is its own shape (below), found from the Game's venue.

### SeasonPhase

`TeamOS.season.phase({ games, next, selected, season, now })`: where a team's season stands (W16, the states S1-S5 of `docs/product/offseason-home-proposal.md` §2). `games` is this season's Games, regular season and postseason joined; `next` is next season's Games (`null` when not known, `[]` when asked and nothing is published); `selected` is whether the league's postseason is set (`TeamOS.espn.postseasonSelected()`, `null` when not known).

| Field | Meaning |
|---|---|
| `state` | `in-season`, `awaiting-postseason`, `postseason`, `complete`, `next-published` or `unknown` |
| `ended` | what ended it: `lost`, `bowl`, `champion`, `not-selected` or `calendar`; `null` while it runs |
| `season`, `nextSeason` | the years |
| `last`, `record` | the last game played, and the record ESPN printed with it |
| `postseason` | `{ games, last, result }`, or `null` with no postseason game |
| `opener` | next season's first game, once published |
| `askNext` | the regular season is done: ask for next season's schedule |

It never infers. An empty postseason means "not selected" only once selection is known to have happened, or from February 1, when no college football postseason game remains. A won playoff game ends the season only when it was the title game. The bracket is fixed, so after any other round win the season stays `postseason`, even before the next game is listed; selection never reopens.

### Weather

`{ tempF, sky, rainPct, windMph, zone, at }`, produced by `TeamOS.weather` from Open-Meteo: the forecast for the kickoff hour at the venue (in the venue's own time zone), or current conditions during a game; `null` when there is no answer (decision 0022 #3). `sky` is plain words; the Suite chooses any glyph.

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
| `live` | `{ downDistance, short, spot, possession, lastPlay, lastPlayAt, lastPlayKind, lastPlaySide }` while `state === "in"`, else `null`. `possession` is the side the source names with the ball (`"home"` / `"away"` / `null`); `lastPlayKind` is `"kickoff"`, `"score"` or `null` and `lastPlaySide` whose play it was, so `TeamOS.live.withBall()` can say who has the ball between plays (after a kickoff the receiver, after a score the scorer, who kicks off next). `TeamOS.live.carryBall(games, previous)` stamps `live.carried`, the side the previous scoreboard had the ball, so a timeout, the end of the 1st or 3rd quarter or a safety keeps the ball where it was; halftime and the end of the 4th clear it. At halftime `TeamOS.live.receives()` names who gets the ball to start the second half: the side that did not receive the opening kickoff (`live.opening`, stamped by `withOpening` from `openingSide(gameDetail)` - the game's first drive), which Home, Game and Top 25 show as "<team> gets the ball". `lastPlay` is the source's words with the snap's clock lifted out into `lastPlayAt` (`"(03:28) ..."` -> `"3:28"`) |

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
  lastPlay:  { text, at, possession, downDistance } | null,
  winProb:   { homePct } | null,
  linescore: { away: string[], home: string[] } | null,
  teamStats: [ { label, away, home, better } ] | null,
  leaders:   { away: [ { category, name, line } ], home: [...] } | null,
  box:       { away: [ { title, labels, rows: [ { name, jersey, stats: string[] } ] } ], home: [...] } | null,
  scoring:   [ { id, period, clock, teamAbbr, mine, text, awayScore, homeScore, driveId } ] | null,
  drives:    { current: Drive | null,
               list: [ { id, side, mine, summary, result,
                         plays: [ { id, text, period, clock, type, yards, scoring, start, end, offense } ] } ] } | null }
```

| Section | Meaning |
|---|---|
| `state`, `detail` | `"pre"` / `"in"` / `"post"` and the status text (`"Final"`, `"3:23 - 2nd"`, the kickoff line) |
| `home`, `away` | a `Side` each (below) |
| `lastPlay` | the live situation's last play, else the last play of the current drive, else of the last drive; `possession` is the abbreviation of the side with the ball, `downDistance` e.g. `"2nd & 7 at WIS 34"`; `at` is the snap's clock lifted out of the text (`"9:56"`, or `""`), and `text` is otherwise the source's own words |
| `winProb` | the latest home win probability, 0–1; the view shows it only while live |
| `linescore` | per-period display values for each side; the view labels periods 1–4 and OT |
| `teamStats` | the eight fixed rows (Total yards … Possession), values as displayed or `null`, and which side is `better` — `"away"`, `"home"` or `null`. Fewer turnovers and penalties win; penalties compare by count; `5-13` compares as a rate and `28:24` as seconds |
| `leaders` | per side, one line per category (`Passing`, `Rushing`, `Receiving`, `Sacks`, `Tackles`, `Int`) |
| `box` | per side, one table per category with its own column `labels` |
| `scoring` | each scoring play in order, with the score after it and whether it was ours. `text` is the source's words; only its shouted conversion is set in lower case, and only where the score confirms it (a touchdown worth 7: `"(S. Porath KICK)"` -> `"(S. Porath kick)"`; a field goal worth 3: `"FG GOOD"` -> `"FG good"`) | `id` is the play's own id; `driveId` names the drive in `drives` that holds that play - the drive the score ended, whoever had the ball - or `null` when the payload carries no such drive (2026-10-01: Plays opens each score's drive).
| `drives` | `{ current, list }` or `null`: each drive's side, `mine`, the source's `summary` (`"10 plays, 27 yards, 4:24"`), its `result` - how it ended in a fan's words (`"Touchdown"`, `"Punt"`, `"Turnover on downs"`), `""` while it goes on - and its plays |

There is no `id`: the Game Center keys on the `Game` it was opened from. There is no win-probability history or pregame line here: the line is `TeamOS.espn.gameOdds()` on the same payload, and the rest has no consumer.

### Side

One team in a `GameDetail`: `{ key, name, abbreviation, record, score, mine, possession, colors }`. `possession` is whether that side has the ball while the game is live (false otherwise). `colors` is `{ primary, alt }`, the program's published colours as `#RRGGBB` or `null`, so a view can tell the two teams apart (the Drive Tracker draws a drive in the colour of the team with the ball). `key` is an opaque correlation key (today the provider's team id, the same precedent as `Game.id`) whose only consumer is the matchup preview asking for that side's season stats; `score` is the displayed value or `null`; `mine` marks the selected team.

### SeasonStat

`{ key, label, value, rank, rankText }` — one row of the pregame matchup card. **Implemented in Phase 4B**, produced by `TeamOS.espn.seasonStats(json)` as a fixed list of nine rows in order:

| `key` | `label` | Source |
|---|---|---|
| `pointsFor` | Points per game | provider |
| `pointsAllowed` | Points allowed | **derived** by `TeamOS.season` from the team's own results |
| `totalOffense` | Total offense | provider |
| `rushOffense` | Rushing offense | provider |
| `passOffense` | Passing offense | provider |
| `rushDefense` | Rushing defense | yards allowed per game from CFBD through the edge API |
| `passDefense` | Passing defense | yards allowed per game from CFBD through the edge API |
| `sacks` | Sacks | provider (`defensive.sacks` — the bare name is ambiguous) |
| `turnoverMargin` | Turnover margin | provider |

`key` is stable and provider-neutral; it is what lets a caller fill a row the provider cannot answer without matching on display copy. `value` is `null` when the feed has the stat under none of the names that row is filed under, and the view skips a row null on both sides. `rank`/`rankText` are `null` for a derived row; no national rank is invented. `TeamOS.espn.matchupBetter(a, b)` returns `us`, `them` or `null` from the displayed values: fewer points/yards allowed is better, while more is better for the other six metrics. Ties and incomplete pairs remain unmarked. Suite uses that result for both the arrow and highlighted stat.

ESPN's unpopulated `pointsAllowed`/`yardsAllowed` stubs remain excluded. Real defensive allowances arrive through the season-results and CFBD models above. See `docs/decisions/0011-derived-season-figures.md`.


### TeamSeason

`{ games, groups: [{ id, label, rows: [{ key, label, value, rank }] }] }`: a team's season for the Stats screen's Team view (W27, `docs/product/season-stats-proposal.md`). It is produced by `TeamOS.espn.teamSeason(core, site)` from two provider payloads:
- `core`: the core API's season statistics, which give the figures and national ranks;
- `site`: the site API's team statistics, whose `opponent` section is what the team allowed.

The four groups are offense, defense, special teams, and turnovers and penalties.
- `value` is the display string.
- `rank` is the provider's rank text, kept only where more of the figure is better. The provider ranks raw values, so the fewest penalties would read last.
- A row whose source is missing is left out, never shown as 0. The provider publishes stubs (a 0 ranked "Tied-1st"), so the rows are an allowlist checked against real payloads for both teams.
- `games` counts the postseason when the payload is the postseason one (`TeamOS.espn.seasonTypeFor()` picks it once a postseason game has been played; its figures are cumulative).

### Player

A roster entry. **Implemented in Phase 3B**, produced only by `TeamOS.espn.roster()`. Provider-neutral; exactly the fields the roster view shows and searches, all strings, empty when the feed has nothing:

| Field | Meaning |
|---|---|
| `id` | the provider's athlete id (digits), or `null`. Opaque: it joins a player across feeds - season leaders, box scores - and later across seasons (W27). Never shown |
| `name` | display name |
| `jersey` | number as printed, e.g. `"75"`; a string, sorted numerically by the view |
| `position` | abbreviation, e.g. `"OL"`, falling back to the full name |
| `positionName` | full position name, e.g. `"Offensive Lineman"` — kept so a search for "quarterback" matches |
| `height`, `weight` | as displayed, e.g. `"6' 7\""`, `"320 lbs"` |
| `classYear` | e.g. `"SR"` |
| `hometown` | `{ city, state }`; `state` is `""` for players from outside the U.S. |

### SeasonLeaders (W27 Phase 2)

The Players view's tables. `TeamOS.espn.seasonLeaders(json)` turns ESPN's core-API season leaders into `[{ key, label, labels, rows: [{ id, stats }] }]`:

- The tables are Passing (with RTG), Rushing, Receiving and Defense (TCK, SACK, INT).
- The columns are the provider's own summary line split by its own labels ("67/95, 963 YDS, 9 TD, 1 INT").
- A figure the feed does not give a player is `"–"`.

`TeamOS.espn.namedLeaders(tables, names)` joins names by `id` and leaves a row without a name out, counting it (`unnamed`). The app's names come from the roster's `Player.id` and from `TeamOS.espn.boxNames(summary)`, every finished game's box score: ESPN's roster leaves some players out. Kicking and punting have no leaders; their season figures are TeamSeason's.

### RosterGroup

`{ key, label, players: Player[] }` — a unit of the roster: `key` is the feed's unit key lowercased (`"offense"`, `"defense"`, `"specialteam"`), `label` is the display label. Empty units are dropped; a feed that sends a flat list yields one group `{ key: "all", label: "Roster" }`. Produced by `TeamOS.espn.roster()`.

### TeamStatus

`{ rank, record }` — the team's current poll rank (`null` outside the top 25) and overall record string (`"2-0"`, or `null`). **Implemented in Phase 3B**, produced by `TeamOS.espn.teamStatus()`; drives the two header chips.

### Depth

Depth chart, availability and sport-specific lineup concepts. `TeamOS.roster` joins the Action-written depth chart (slots by level, week by week) to the roster and the official availability report, and says which roster views a team has (decision 0019). The snapshots are this project's own shapes, written by `tools/producers/official_depth.py`.

### Ranking

See `Poll` above.

### NewsItem

One story in the News tab. **Implemented in Phase 4C**, produced by `TeamOS.espn.news(json)` for ESPN's team feed; the beat-writer snapshot the Action commits as `news.json` carries `title`, `link`, `source`, `published` as ISO text, and optional `image`/`sourceLogo` URLs. The application converts this project's snapshot format into the same model. A story whose link is not a web link (`http`/`https`) is dropped at every step: the producer, the adapter and the page. Image URLs are also restricted to web URLs.

```
{ title, link, image, sourceLogo?, source, publishedAt }
```

| Field | Meaning |
|---|---|
| `title` | headline |
| `link` | the article's web URL |
| `image` | thumbnail URL, or `""` |
| `sourceLogo` | optional publisher-logo URL; used only if the article image is absent or fails |
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
