/* Clemson - Phase 3, the Big 12 and the ACC (David, 2026-10-28). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-28: ESPN team 228, its home field as
   ESPN's schedule spells it (Memorial Stadium (Clemson, SC)), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "clemson",
    name:         "Clemson",
    abbreviation: "CLEM",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "Memorial Stadium (Clemson, SC)",
      lat:  34.6788,
      lon: -82.8432
    }
  },

  sources: {
    espn: {
      teamId: "228",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-CLEM",
      namePattern:  /clemson/i
    },

    // The ACC's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://theacc.com/sports/2025/8/28/availability-reporting-football.aspx",
      availabilityReportLabel: "TheACC.com",
      availabilityFeed: { provider: "hdintelligence", conference: "ACC", sport: "Football", team: "Clemson" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-28.
    // Tiger Illustrated is On3's fan site for Clemson (the former Rivals
    // site), read through its own section so On3's national stories stay out
    // (2026-10-29). TigerNet is the independent Clemson fan site; its featured
    // stories are mostly football, and the rest are filtered by sport. Not
    // used: clemsontigers.com's feed is every sport, and Shakin the Southland
    // (SB Nation) is gone.
    beatFeeds: [
      { name: "Clemson On SI", feed: "https://www.si.com/college/clemson/feed", site: "https://www.si.com/college/clemson", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "The Tiger", feed: "https://thetigercu.com/category/sports/football/feed/", site: "https://thetigercu.com/category/sports/football/" },
      { name: "Tiger Illustrated", feed: "https://www.on3.com/sites/tiger-illustrated/feed/", site: "https://www.on3.com/sites/tiger-illustrated/", paths: ["/sites/tiger-illustrated/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" },
      { name: "TigerNet", feed: "https://www.tigernet.com/feeds/news/featured-stories.xml", site: "https://www.tigernet.com/", logo: "https://www.tigernet.com/favicon.ico" }
    ]
  },

  series: [
    { match: /^south carolina( gamecocks)?$/i, name: "Palmetto Bowl", kind: "trophy" },
    { match: /^nc state( wolfpack)?$/i, name: "Textile Bowl", kind: "rivalry" }
  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its schedule, where each game's notes are posted.
    gameNotes: { url: "https://clemsontigers.com/sports/football/schedule", label: "clemsontigers.com", kind: "schedule" },
    roster: { url: "https://clemsontigers.com/sports/football/roster", label: "clemsontigers.com" }
  },

  // Clemson inside Suite: Regalia, Clemson Orange, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "CLEMSON FOOTBALL",

    colors: {
      accent:         "#F56600",
      accentText:     "#F56C0A",
      accentOnLight:  "#522D80",
      accentInk:      "#111111",
      accentSoft:     "#FAAB73",
      accentTint:     "#FDE3D1",
      accentTintSoft: "#FEF3EB",
      focus:          "#FFFFFF",
      surface:        "#522D80",
      surfaceDeep:    "#3B205C",
      surfaceAbyss:   "#221336",
      surfaceRaise:   "#63428D"
    },

    // Clemson's brand pages did not answer; Montserrat stands in. Please
    // confirm.
    fonts: {
      ui:       "'Montserrat','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Montserrat','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Clemson, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/clemson/availability.json", history: "data/clemson/availability-history.json", label: "TheACC.com" },
    oddsHistory:  { file: "data/clemson/odds-history.json" },
    beatNews:     { file: "data/clemson/news.json" },
    recruits:     { file: "data/clemson/recruits.json", label: "ESPN recruiting" }
  }
};
