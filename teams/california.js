/* California - Phase 3, the Big 12 and the ACC (David, 2026-10-28). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-28: ESPN team 25, its home field as
   ESPN's schedule spells it (California Memorial Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "california",
    name:         "California",
    abbreviation: "CAL",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Los_Angeles",

    venue: {
      name: "California Memorial Stadium",
      lat:  37.8710,
      lon: -122.2508
    }
  },

  sources: {
    espn: {
      teamId: "25",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-CAL",
      namePattern:  /^california$|^cal$|golden bears/i
    },

    // The ACC's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://theacc.com/sports/2025/8/28/availability-reporting-football.aspx",
      availabilityReportLabel: "TheACC.com",
      availabilityFeed: { provider: "hdintelligence", conference: "ACC", sport: "Football", team: "California", aliases: ["Cal"] }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-28.
    // Golden Bear Report is On3's fan site for Cal (the former Rivals site),
    // read through its own section so On3's national stories stay out
    // (2026-10-29). Not used: California Golden Blogs (SB Nation) did not
    // answer, and the Daily Californian turned GitHub's network away (429).
    beatFeeds: [
      { name: "Cal Athletics", feed: "https://calbears.com/rss?path=football", site: "https://calbears.com/sports/football", logo: "https://calbears.com/favicon.ico" },
      { name: "Cal On SI", feed: "https://www.si.com/college/cal/feed", site: "https://www.si.com/college/cal", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "Golden Bear Report", feed: "https://www.on3.com/sites/golden-bear-report/feed/", site: "https://www.on3.com/sites/golden-bear-report/", paths: ["/sites/golden-bear-report/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" }
    ]
  },

  series: [
    { match: /^stanford( cardinal)?$/i, name: "Big Game", kind: "trophy" }
  ],

  links: {
    roster: { url: "https://calbears.com/sports/football/roster", label: "calbears.com" }
  },

  // California inside Suite: Berkeley Blue, California Gold, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "CAL FOOTBALL",

    colors: {
      accent:         "#FDB515",
      accentText:     "#FDB515",
      accentOnLight:  "#002676",
      accentInk:      "#002676",
      accentSoft:     "#FED67E",
      accentTint:     "#FFF2D5",
      accentTintSoft: "#FFF9EC",
      focus:          "#FFFFFF",
      surface:        "#002676",
      surfaceDeep:    "#001B55",
      surfaceAbyss:   "#001032",
      surfaceRaise:   "#1A3C84"
    },

    // Berkeley's brand faces are Inter and Source Serif (brand.berkeley.edu),
    // both free: Inter used as it is.
    fonts: {
      ui:       "'Inter','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Inter','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for California, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/california/availability.json", history: "data/california/availability-history.json", label: "TheACC.com" },
    oddsHistory:  { file: "data/california/odds-history.json" },
    beatNews:     { file: "data/california/news.json" },
    recruits:     { file: "data/california/recruits.json", label: "ESPN recruiting" }
  }
};
