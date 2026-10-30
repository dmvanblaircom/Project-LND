/* Florida - Phase 2, the SEC (David, 2026-10-28). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-28: ESPN team 57, its home field as
   ESPN's schedule spells it (Ben Hill Griffin Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "florida",
    name:         "Florida",
    abbreviation: "FLA",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "Ben Hill Griffin Stadium",
      lat:  29.6499,
      lon: -82.3486
    }
  },

  sources: {
    espn: {
      teamId: "57",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-FLA",
      namePattern:  /(?<!south )\bflorida\b(?! st| atlantic| international| a&m)|gators/i
    },

    // The SEC's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://www.secsports.com/fbreports",
      availabilityReportLabel: "SECsports.com",
      availabilityFeed: { provider: "hdintelligence", conference: "SEC", sport: "Football", team: "Florida" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-28. On3's team feeds carry league-wide
    // stories, so `paths` keeps only Florida's section.
    // Not used: Alligator Army (SB Nation) is gone (404); the Alligator has
    // no working feed.
    beatFeeds: [
      { name: "Florida Athletics", feed: "https://floridagators.com/rss?path=football", site: "https://floridagators.com/sports/football", logo: "https://floridagators.com/favicon.ico" },
      { name: "Florida On SI", feed: "https://www.si.com/college/florida/feed", site: "https://www.si.com/college/florida", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "On3", feed: "https://www.on3.com/teams/florida-gators/feed/", site: "https://www.on3.com/teams/florida-gators/", paths: ["/teams/florida-gators/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" }
    ]
  },

  series: [
    { match: /^georgia( bulldogs)?$/i, name: "Florida–Georgia", kind: "rivalry" }
  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its schedule, where each game's notes are posted.
    gameNotes: { url: "https://floridagators.com/sports/football/schedule", label: "floridagators.com", kind: "schedule" },
    roster: { url: "https://floridagators.com/sports/football/roster", label: "floridagators.com" }
  },

  // Florida inside Suite: Core Blue, Core Orange (brandcenter.ufl.edu), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "FLORIDA FOOTBALL",

    colors: {
      accent:         "#FA4616",
      accentText:     "#FA5529",
      accentOnLight:  "#0021A5",
      accentInk:      "#111111",
      accentSoft:     "#FC997F",
      accentTint:     "#FEDED5",
      accentTintSoft: "#FFF0EC",
      focus:          "#FFFFFF",
      surface:        "#0021A5",
      surfaceDeep:    "#001877",
      surfaceAbyss:   "#000E45",
      surfaceRaise:   "#1A37AE"
    },

    // Florida's brand faces are Anybody (display) and IBM Plex Sans (text),
    // both free: used as they are.
    fonts: {
      ui:       "'IBM Plex Sans','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Anybody','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Florida, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/florida/availability.json", history: "data/florida/availability-history.json", label: "SECsports.com" },
    oddsHistory:  { file: "data/florida/odds-history.json" },
    beatNews:     { file: "data/florida/news.json" },
    recruits:     { file: "data/florida/recruits.json", label: "ESPN recruiting" }
  }
};
