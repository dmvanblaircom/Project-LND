/* Vanderbilt - Phase 2, the SEC (David, 2026-10-28). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-28: ESPN team 238, its home field as
   ESPN's schedule spells it (FirstBank Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "vanderbilt",
    name:         "Vanderbilt",
    abbreviation: "VAN",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Chicago",

    venue: {
      name: "FirstBank Stadium",
      lat:  36.1441,
      lon: -86.8090
    }
  },

  sources: {
    espn: {
      teamId: "238",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-VAN",
      namePattern:  /vanderbilt|commodores/i
    },

    // The SEC's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://www.secsports.com/fbreports",
      availabilityReportLabel: "SECsports.com",
      availabilityFeed: { provider: "hdintelligence", conference: "SEC", sport: "Football", team: "Vanderbilt" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-28.
    // Not used: vucommodores.com has no feed; no On3 team feed (404).
    beatFeeds: [
      { name: "Anchor of Gold", feed: "https://www.anchorofgold.com/rss/current.xml", site: "https://www.anchorofgold.com/" },
      { name: "Vanderbilt On SI", feed: "https://www.si.com/college/vanderbilt/feed", site: "https://www.si.com/college/vanderbilt", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "The Vanderbilt Hustler", feed: "https://vanderbilthustler.com/category/sports/feed/", sportsSection: true, site: "https://vanderbilthustler.com/category/sports/" }
    ]
  },

  series: [

  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its schedule, where each game's notes are posted.
    gameNotes: { url: "https://vucommodores.com/sports/football/schedule", label: "vucommodores.com", kind: "schedule" },
    roster: { url: "https://vucommodores.com/sports/football/roster", label: "vucommodores.com" }
  },

  // Vanderbilt inside Suite: Black, Flat Gold (Vanderbilt's style guide), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "VANDERBILT FOOTBALL",

    colors: {
      accent:         "#CFAE70",
      accentText:     "#CFAE70",
      accentOnLight:  "#000000",
      accentInk:      "#000000",
      accentSoft:     "#E5D2B0",
      accentTint:     "#F6F0E5",
      accentTintSoft: "#FBF9F4",
      focus:          "#FFFFFF",
      surface:        "#000000",
      surfaceDeep:    "#000000",
      surfaceAbyss:   "#000000",
      surfaceRaise:   "#1A1A1A"
    },

    // Vanderbilt names Antonio (condensed) and Inter (sans) as the free
    // matches for its brand faces: used as they are.
    fonts: {
      ui:       "'Inter','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Antonio','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Vanderbilt, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/vanderbilt/availability.json", history: "data/vanderbilt/availability-history.json", label: "SECsports.com" },
    oddsHistory:  { file: "data/vanderbilt/odds-history.json" },
    beatNews:     { file: "data/vanderbilt/news.json" },
    recruits:     { file: "data/vanderbilt/recruits.json", label: "ESPN recruiting" }
  }
};
