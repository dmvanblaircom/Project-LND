# Team Configuration

## Principle

**Notre Dame is data, not code.**

Team configuration separates team identity and team-specific capabilities from generic Suite behavior.

## Current Shape

A team is one file in `teams/` that defines `TEAM_CONFIG`. The page's boot script loads the one this browser chose (`?team=`, then the saved choice; decisions 0013, 0016) before TeamOS, the Suite screens and `app.js`. It has six sections, each owned by a different layer:

```js
var TEAM_CONFIG = {
  // The Team domain object. Provider-neutral. TeamOS.createTeam() validates
  // and freezes it; app.js uses the result for every domain read.
  team: {
    id: "notre-dame",
    name: "Notre Dame",
    abbreviation: "ND",
    sport: "football",
    league: "college-football",
    timeZone: "America/New_York",            // the local calendar for team policies
    venue: { name: "Notre Dame Stadium", lat: 41.6984, lon: -86.2339 }
  },

  // How each provider identifies this team, patches for feed gaps, the
  // team's official sources and its beat feeds. Read by the TeamOS adapters
  // (teamos/espn.js, markets.js) and the Action's producers.
  sources: {
    espn:   { teamId: "87", broadcastFallback: [ /* [opponent regex, network] */ ] },
    kalshi: { tickerSuffix: "-ND", namePattern: /notre dame|fighting irish/i },
    official: {
      depthChartIndex: "https://fightingirish.com/news/2022/08/29/ndfbmedia",
      depthChartLabel: "FightingIrish.com",
      availabilityReportIndex: "https://fightingirish.com/news/2022/08/29/ndfbmedia",
      availabilityReportLabel: "FightingIrish.com",
      availabilityUpdates: { timeZone: "America/New_York", daysBeforeKickoff: [5, 2] }
    },
    beatFeeds: [ { name: "One Foot Down", feed: "https://...", site: "https://..." } /* ... */ ]
  },

  // Trophy, rivalry and event names by opponent (W21). kind is "trophy"
  // (played for; Game shows the trophy mark), "rivalry" (a name, nothing to
  // win: The Game) or "event" (a branded game: the Shamrock Series).
  series: [ { match: /purdue/i, name: "Shillelagh Trophy", kind: "trophy" } /* ... */ ],
  history: { record: { season: 2026, wins: 993, losses: 342, ties: 42, source: "Notre Dame game notes", asOf: "2026-10-05" } },

  // The team's own pages.
  links: { roster: { url: "...", label: "..." } },

  // How the team is presented inside Suite: colours, type, tagline, labels.
  // Read through TeamOS.identity (decision 0009). The installed product -
  // its name, icons, manifest and share card - is Suite's, not the team's
  // (decision 0024 section 11).
  identity: {
    programLabel: "NOTRE DAME FOOTBALL",
    tagline: "Leave No Doubt.",               // null for a team without one
    colors: { accent: "#C99700", accentText: "#C99700", accentOnLight: "#876500", /* ...nine more */ },
    fonts:  { ui: "...", display: "..." }
  },

  // The team-data files the Action writes for this team, by kind. A kind
  // the team has no source for is left out, and the Suite shows that
  // surface as unavailable instead of reading another team's file.
  // Read through TeamOS.snapshots (decision 0008).
  snapshots: {
    depth:        { file: "data/notre-dame/depth.json", history: "data/notre-dame/depth-history.json", label: "FightingIrish.com" },
    availability: { file: "data/notre-dame/availability.json", history: "data/notre-dame/availability-history.json", label: "FightingIrish.com" },
    oddsHistory:  { file: "data/notre-dame/odds-history.json" },
    beatNews:     { file: "data/notre-dame/news.json" }
  }
};
```

A team's files live in `data/<team id>/` (league-wide files, such as the Kalshi markets, in `data/league/`), and every producer reads where to write from this declaration: a new team with a source gets its own files by declaring them here, with no change to the workflow (backlog C2, checked by `tools/adaptercheck.js` and `tools/pipelinecheck.py`).

The real files are `teams/notre-dame.js` and `teams/ohio-state.js` (which declares `snapshots: {}`). Values shown here are abbreviated.

## What Belongs in Configuration

- `team` — stable identity: id, name, abbreviation, sport, league, home venue
- `sources` — provider identifiers and source declarations, including the team's beat feeds. For official team data such as depth charts, the official athletics source takes precedence over media/beat sources.
- `series` — trophy, rivalry and event names no public feed carries, each with its kind
- `history.record` — the program's official all-time record entering a season, from its own game notes; `TeamOS.milestones` adds the season's results for the countdown to a round number of wins (the 1,000th). A record for another season shows nothing; it is replaced when the next season's first notes publish
- `links` — the team's official pages
- `snapshots` — which of the Action-written team-data files this team has (the depth chart is a capability; the beat feed is a content source; the odds history is team-scoped) and where they are
- `identity` — how the team is presented inside Suite: colours, type, tagline, program label

`identity.colors` separates the **fill** (`accent`) from accent-coloured **text**
(`accentText`), because a team's crest colour is not always legible on a dark page:
Notre Dame's gold reaches 6.65:1 and Ohio State's scarlet only 2.88:1. TeamOS refuses
a config whose text colours fall below 4.5:1 rather than inventing a lighter tone
(`docs/decisions/0009-identity-is-team-data.md`).

Not yet in configuration, pending a real need: history. Authoritative team data is different: the producer checks `sources.official` first. Notre Dame currently declares official sources for both its weekly two-deep and availability report. When a school does not publish a needed artifact, a reputable media source may be used as a clearly identified fallback; it must never be presented as official or borrowed from another team.

## What Does Not Belong in Configuration

Do not turn configuration into a dumping ground for arbitrary code or UI behavior.

Avoid fields such as:

- HTML templates
- Rendering functions
- Provider response objects
- Large conditional rule sets
- One-off hacks that should actually be fixed in TeamOS

## Ohio State Test

A second team should be addable by supplying a second configuration object and any required provider/source mappings.

The Suite should not need to be duplicated.

Run three times (Phase 5A, 5B, 6 — `docs/engineering/`): every ESPN-fed surface rendered Ohio State from configuration alone; the three surfaces fed by the Action's Notre Dame files show an honest unavailable state because its config declares no snapshots; and in Phase 6 the same Suite rendered Ohio State's own palette, type and section copy from a second `identity` block, with 846 text elements passing contrast and no Notre Dame anywhere in the page. (Phase 6 also gave each team its own product name - "Buckeye Watch" - and install artwork; decision 0024 later made the installed product Suite for every team.) Today Ohio State is `/?team=ohio-state` on the same page, and `tools/adaptercheck.js`, `tools/suitecheck.js` and `tools/visualcheck.js` render both teams on every pull request.

## Exceptions

Real exceptions will exist. The preferred order is:

1. Generic domain behavior
2. Team configuration
3. TeamOS adapter/normalization rule
4. Explicit capability
5. Only then, a narrowly scoped exception

Avoid spreading one-off exceptions through rendering code.

## Keep the Initial Schema Small

Do not design a perfect universal sports schema before a second use case exists. Start with what Irish Watch needs, then validate the model against Ohio State and the next sport.
