/* North Texas - Phase 4a, the American, the Mountain West and the Pac-12
   (David, 2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 249, its home field as
   ESPN's schedule spells it (DATCU Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "north-texas",
    name:         "North Texas",
    abbreviation: "UNT",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Chicago",

    venue: {
      name: "DATCU Stadium",
      lat:  33.2036,
      lon: -97.1592
    }
  },

  sources: {
    espn: {
      teamId: "249",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-UNT",
      namePattern:  /\bnorth texas\b|mean green/i
    },

    // The American's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://theamerican.org/sports/football",
      availabilityReportLabel: "TheAmerican.org",
      availabilityFeed: { provider: "hdintelligence", conference: "American", sport: "Football", team: "North Texas" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // One source only: the North Texas Daily turned GitHub's network away
    // twice (429), On SI has no North Texas site (404), and On3's feed
    // carries only national stories.
    beatFeeds: [
      { name: "North Texas Athletics", feed: "https://meangreensports.com/rss?path=football", site: "https://meangreensports.com/sports/football", logo: "https://meangreensports.com/favicon.ico" }
    ]
  },

  series: [

  ],

  links: {
    roster: { url: "https://meangreensports.com/sports/football/roster", label: "meangreensports.com" }
  },

  // North Texas inside Suite: Mean Green (ESPN's), white, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js). surface deepened 12% from #068F33 to carry white text and to read as ink on the page.
  identity: {
    programLabel: "NORTH TEXAS FOOTBALL",

    colors: {
      accent:         "#FFFFFF",
      accentText:     "#FFFFFF",
      accentOnLight:  "#057E2D",
      accentInk:      "#057E2D",
      accentSoft:     "#FFFFFF",
      accentTint:     "#D2E8D9",
      accentTintSoft: "#EBF5EE",
      focus:          "#FFFFFF",
      surface:        "#057E2D",
      surfaceDeep:    "#045B20",
      surfaceAbyss:   "#023513",
      surfaceRaise:   "#0F8335"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for North Texas, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/north-texas/availability.json", history: "data/north-texas/availability-history.json", label: "TheAmerican.org" },
    oddsHistory:  { file: "data/north-texas/odds-history.json" },
    beatNews:     { file: "data/north-texas/news.json" },
    recruits:     { file: "data/north-texas/recruits.json", label: "ESPN recruiting" }
  }
};
