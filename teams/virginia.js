/* Virginia - Phase 3, the Big 12 and the ACC (David, 2026-10-28). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-28: ESPN team 258, its home field as
   ESPN's schedule spells it (Scott Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "virginia",
    name:         "Virginia",
    abbreviation: "UVA",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "Scott Stadium",
      lat:  38.0311,
      lon: -78.5137
    }
  },

  sources: {
    espn: {
      teamId: "258",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-UVA",
      namePattern:  /(?<!west )\bvirginia\b(?! tech| st| union|-)/i
    },

    // The ACC's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://theacc.com/sports/2025/8/28/availability-reporting-football.aspx",
      availabilityReportLabel: "TheACC.com",
      availabilityFeed: { provider: "hdintelligence", conference: "ACC", sport: "Football", team: "Virginia" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-28.
    // CavsCorner is On3's fan site for Virginia (the former Rivals site), read
    // through its own section so On3's national stories stay out (2026-10-29).
    // Not used: virginiasports.com's feed is every sport, and the Cavalier
    // Daily has no working feed.
    beatFeeds: [
      { name: "Streaking the Lawn", feed: "https://www.streakingthelawn.com/rss/current.xml", site: "https://www.streakingthelawn.com/" },
      { name: "Virginia On SI", feed: "https://www.si.com/college/virginia/feed", site: "https://www.si.com/college/virginia", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "CavsCorner", feed: "https://www.on3.com/sites/cavs-corner/feed/", site: "https://www.on3.com/sites/cavs-corner/", paths: ["/sites/cavs-corner/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" }
    ]
  },

  series: [
    { match: /^virginia tech( hokies)?$/i, name: "Commonwealth Clash", kind: "trophy" },
    { match: /^north carolina( tar heels)?$/i, name: "South’s Oldest Rivalry", kind: "rivalry" }
  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its schedule, where each game's notes are posted.
    gameNotes: { url: "https://virginiasports.com/sports/football/schedule", label: "virginiasports.com", kind: "schedule" },
    roster: { url: "https://virginiasports.com/sports/football/roster", label: "virginiasports.com" }
  },

  // Virginia inside Suite: Jefferson Blue, Rotunda Orange (brand.virginia.edu), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "VIRGINIA FOOTBALL",

    colors: {
      accent:         "#E57200",
      accentText:     "#E57200",
      accentOnLight:  "#232D4B",
      accentInk:      "#192036",
      accentSoft:     "#F1B173",
      accentTint:     "#FAE6D1",
      accentTintSoft: "#FDF4EB",
      focus:          "#FFFFFF",
      surface:        "#232D4B",
      surfaceDeep:    "#192036",
      surfaceAbyss:   "#0F1320",
      surfaceRaise:   "#39425D"
    },

    // Virginia's typography page did not answer; Libre Franklin is matched to
    // its Franklin Gothic. Please confirm.
    fonts: {
      ui:       "'Libre Franklin','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Libre Franklin','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Virginia, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/virginia/availability.json", history: "data/virginia/availability-history.json", label: "TheACC.com" },
    oddsHistory:  { file: "data/virginia/odds-history.json" },
    beatNews:     { file: "data/virginia/news.json" },
    recruits:     { file: "data/virginia/recruits.json", label: "ESPN recruiting" }
  }
};
