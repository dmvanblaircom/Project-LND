/* Mississippi State - Phase 2, the SEC (David, 2026-10-28). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-28: ESPN team 344, its home field as
   ESPN's schedule spells it (Davis Wade Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "mississippi-state",
    name:         "Mississippi State",
    abbreviation: "MSST",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Chicago",

    venue: {
      name: "Davis Wade Stadium",
      lat:  33.4564,
      lon: -88.7934
    }
  },

  sources: {
    espn: {
      teamId: "344",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-MSST",
      namePattern:  /mississippi st/i
    },

    // The SEC's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://www.secsports.com/fbreports",
      availabilityReportLabel: "SECsports.com",
      availabilityFeed: { provider: "hdintelligence", conference: "SEC", sport: "Football", team: "Mississippi St.", aliases: ["Mississippi State"] }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-28. On3's team feeds carry league-wide
    // stories, so `paths` keeps only Mississippi State's section.
    // Not used: For Whom the Cowbell Tolls (SB Nation) did not answer
    // GitHub's network.
    beatFeeds: [
      { name: "Mississippi State Athletics", feed: "https://hailstate.com/rss?path=football", site: "https://hailstate.com/sports/football", logo: "https://hailstate.com/favicon.ico" },
      { name: "Mississippi State On SI", feed: "https://www.si.com/college/mississippistate/feed", site: "https://www.si.com/college/mississippistate", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "On3", feed: "https://www.on3.com/teams/mississippi-state-bulldogs/feed/", site: "https://www.on3.com/teams/mississippi-state-bulldogs/", paths: ["/teams/mississippi-state-bulldogs/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" },
      { name: "The Reflector", feed: "https://www.reflector-online.com/category/sports/feed/", sportsSection: true, site: "https://www.reflector-online.com/category/sports/" }
    ]
  },

  series: [
    { match: /^ole miss( rebels)?$/i, name: "Egg Bowl", kind: "trophy" }
  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its notes page, which carries this season's notes
    // (checked from GitHub's network that day).
    gameNotes: { url: "https://hailstate.com/sports/2007/8/22/1158174", label: "hailstate.com", kind: "index" },
    roster: { url: "https://hailstate.com/sports/football/roster", label: "hailstate.com" }
  },

  // Mississippi State inside Suite: Maroon PMS 505 (brand.msstate.edu), white, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "MISSISSIPPI STATE FOOTBALL",

    colors: {
      accent:         "#FFFFFF",
      accentText:     "#FFFFFF",
      accentOnLight:  "#5D1725",
      accentInk:      "#5D1725",
      accentSoft:     "#FFFFFF",
      accentTint:     "#E2D5D8",
      accentTintSoft: "#F2ECEE",
      focus:          "#FFFFFF",
      surface:        "#5D1725",
      surfaceDeep:    "#43111B",
      surfaceAbyss:   "#270A10",
      surfaceRaise:   "#6D2E3B"
    },

    // Mississippi State's lettering is Futura-based and its text face is not
    // published; Jost is the closest free match to Futura.
    fonts: {
      ui:       "'Jost','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Jost','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Mississippi State, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/mississippi-state/availability.json", history: "data/mississippi-state/availability-history.json", label: "SECsports.com" },
    oddsHistory:  { file: "data/mississippi-state/odds-history.json" },
    beatNews:     { file: "data/mississippi-state/news.json" },
    recruits:     { file: "data/mississippi-state/recruits.json", label: "ESPN recruiting" }
  }
};
