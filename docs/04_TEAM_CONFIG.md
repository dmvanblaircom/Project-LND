# Team Configuration

## Principle

**Notre Dame is data, not code.**

Team configuration separates team identity and team-specific capabilities from generic Suite behavior.

## Current Shape (Phase 6)

A team is one file in `teams/` that defines `TEAM_CONFIG`, loaded by `index.html` before `teamos/team.js` and `app.js`. It has six sections, each owned by a different layer:

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
    venue: { name: "Notre Dame Stadium", lat: 41.6984, lon: -86.2339 }
  },

  // How each provider identifies this team, plus patches for feed gaps.
  // Read by app.js for now; moves inside the Phase 3 adapters.
  sources: {
    espn:   { teamId: "87", broadcastFallback: [ /* [opponent regex, network] */ ] },
    kalshi: { tickerSuffix: "-ND", namePattern: /notre dame|fighting irish/i },
    official: {
      depthChartIndex: "https://fightingirish.com/news/2022/08/29/ndfbmedia",
      depthChartLabel: "FightingIrish.com",
      availabilityReportIndex: "https://fightingirish.com/news/2022/08/29/ndfbmedia",
      availabilityReportLabel: "FightingIrish.com"
    }
  },

  // Trophy games by opponent. Schedule data, headed for Game in Phase 3.
  series: [ /* [opponent regex, trophy name] */ ],

  // The team's own pages.
  links: { roster: { url: "...", label: "..." } },

  // The team-data files the Action writes for this team, by kind. A kind
  // the team has no source for is left out, and the Suite shows that
  // surface as unavailable instead of reading another team's file.
  // Read through TeamOS.snapshots (Phase 5B, decision 0008).
  snapshots: {
    depth:       { file: "depth.json", history: "depth-history.json", label: "FightingIrish.com" },
    oddsHistory: { file: "odds-history.json" },
    beatNews:    { file: "news.json" }
  },

  // How the team is presented: the product's name for it, the head copy, its
  // colours, its type and its artwork. Read through TeamOS.identity, applied
  // by paintIdentity() in app.js (Phase 6, decision 0009).
  identity: {
    productName: "Irish Watch", programLabel: "NOTRE DAME FOOTBALL",
    title: "...", description: "...", motto: "Leave No Doubt",
    newsLabel: "LATEST FROM SOUTH BEND",
    manifest: "assets/notre-dame/manifest.json",
    colors: { accent: "#C99700", accentText: "#C99700", /* ...nine more */ },
    fonts:  { ui: "...", display: "...", headline: "..." },
    assets: { favicon: "assets/notre-dame/favicon.svg", /* ...four more */ }
  }
};
```

The real files are `teams/notre-dame.js` and `teams/ohio-state.js` (which declares `snapshots: {}`). Values shown here are abbreviated.

## What Belongs in Configuration

- `team` — stable identity: id, name, abbreviation, sport, league, home venue
- `sources` — provider identifiers and source declarations. For official team data such as depth charts, the official athletics source takes precedence over media/beat sources.
- `series` — team-specific schedule data no public feed carries
- `links` — the team's official pages
- `snapshots` — which of the Action-written team-data files this team has (the depth chart is a capability; the beat feed is a content source; the odds history is team-scoped) and where they are
- `identity` — how the team is presented: product name, head copy, colours, type, artwork

`identity.colors` separates the **fill** (`accent`) from accent-coloured **text**
(`accentText`), because a team's crest colour is not always legible on a dark page:
Notre Dame's gold reaches 6.65:1 and Ohio State's scarlet only 2.88:1. TeamOS refuses
a config whose text colours fall below 4.5:1 rather than inventing a lighter tone
(`docs/decisions/0009-identity-is-team-data.md`).

Not yet in configuration, pending a real need: history. Beat-news feed lists still live in `.github/workflows/odds.yml`. Authoritative team data is different: the producer checks `sources.official` first. Notre Dame currently declares official sources for both its weekly two-deep and availability report. When a school does not publish a needed artifact, a reputable media source may be used as a clearly identified fallback; it must never be presented as official or borrowed from another team.

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

Run three times (Phase 5A, 5B, 6 — `docs/engineering/`): every ESPN-fed surface rendered Ohio State from configuration alone; the three surfaces fed by the Action's Notre Dame files show an honest unavailable state because its config declares no snapshots; and in Phase 6 the same Suite rendered **Buckeye Watch** — its own name, head, palette, type and section copy — from a second `identity` block, with 846 text elements passing contrast and no Notre Dame anywhere in the page.

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
