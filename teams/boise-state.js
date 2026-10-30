/* Boise State - Phase 4a, the American, the Mountain West and the Pac-12
   (David, 2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 68, its home field as
   ESPN's schedule spells it (Albertsons Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "boise-state",
    name:         "Boise State",
    abbreviation: "BOIS",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Boise",

    venue: {
      name: "Albertsons Stadium",
      lat:  43.6029,
      lon: -116.1965
    }
  },

  sources: {
    // The Pac-12's availability reports, read from the public file its report
    // page draws (tools/producers/conference_availability.py; David,
    // 2026-10-30). The team as the file names it, seen there on 2026-10-30.
    official: {
      availabilityReportIndex: "https://pac-12.com/news/2026/9/11/2026-football-reports.aspx",
      availabilityReportLabel: "Pac-12.com",
      availabilityFeed: { provider: "reportjson", url: "https://sbcautostorage.blob.core.windows.net/availability-reports/pac12-football/prod/report.json", team: "Boise State" }
    },

    espn: {
      teamId: "68",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-BSU",
      namePattern:  /\bboise st/i
    },

    // The Pac-12 posts its availability reports on Pac-12.com, not through HD
    // Intelligence (2026-10-29); there is no reader for that page yet, so
    // none are shown.

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // Not used: One Bronco Under God (SB Nation) reset the connection twice,
    // and On3's feed carries only national stories.
    beatFeeds: [
      { name: "Boise State Athletics", feed: "https://broncosports.com/rss?path=football", site: "https://broncosports.com/sports/football", logo: "https://broncosports.com/favicon.ico" },
      { name: "Boise State On SI", feed: "https://www.si.com/college/boise-state/feed", site: "https://www.si.com/college/boise-state", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "The Arbiter", feed: "https://arbiteronline.com/category/sports/football/feed/", site: "https://arbiteronline.com/category/sports/football/" }
    ]
  },

  series: [
    { match: /^fresno state( bulldogs)?$/i, name: "Milk Can", kind: "trophy" }
  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its schedule, where each game's notes are posted.
    gameNotes: { url: "https://broncosports.com/sports/football/schedule", label: "broncosports.com", kind: "schedule" },
    roster: { url: "https://broncosports.com/sports/football/roster", label: "broncosports.com" }
  },

  // Boise State inside Suite: Bronco Blue, Orange (ESPN's), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "BOISE STATE FOOTBALL",

    colors: {
      accent:         "#D64309",
      accentText:     "#E1784E",
      accentOnLight:  "#0033A0",
      accentInk:      "#FFFFFF",
      accentSoft:     "#E89878",
      accentTint:     "#F8DDD3",
      accentTintSoft: "#FCF0EB",
      focus:          "#FFFFFF",
      surface:        "#0033A0",
      surfaceDeep:    "#002573",
      surfaceAbyss:   "#001543",
      surfaceRaise:   "#1A47AA"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Boise State, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/boise-state/availability.json", history: "data/boise-state/availability-history.json", label: "Pac-12.com" },
    oddsHistory:  { file: "data/boise-state/odds-history.json" },
    beatNews:     { file: "data/boise-state/news.json" },
    recruits:     { file: "data/boise-state/recruits.json", label: "ESPN recruiting" }
  }
};
