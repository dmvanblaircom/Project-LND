/* Buffalo - Phase 4b, the Sun Belt, the MAC, Conference USA and UConn
   (David, 2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 2084, its home field as
   ESPN's schedule spells it (Broadview Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "buffalo",
    name:         "Buffalo",
    abbreviation: "BUFF",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "Broadview Stadium",
      lat:  43.0009,
      lon: -78.7779
    }
  },

  sources: {
    espn: {
      teamId: "2084",
      broadcastFallback: []
    },

    // The MAC's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://getsomemaction.com/sports/football",
      availabilityReportLabel: "GetSomeMACtion.com",
      availabilityFeed: { provider: "hdintelligence", conference: "MAC", sport: "Football", team: "Buffalo" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // One source only: The Spectrum publishes no working feed, On SI has no
    // Buffalo site (404), and On3's feed carries only national stories.
    beatFeeds: [
      { name: "UB Athletics", feed: "https://ubbulls.com/rss?path=football", site: "https://ubbulls.com/sports/football", logo: "https://ubbulls.com/favicon.ico" }
    ]
  },

  series: [

  ],

  links: {
    roster: { url: "https://ubbulls.com/sports/football/roster", label: "ubbulls.com" }
  },

  // Buffalo inside Suite: UB Blue (ESPN's), white, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "BUFFALO FOOTBALL",

    colors: {
      accent:         "#FFFFFF",
      accentText:     "#FFFFFF",
      accentOnLight:  "#005BBB",
      accentInk:      "#005BBB",
      accentSoft:     "#FFFFFF",
      accentTint:     "#D1E1F3",
      accentTintSoft: "#EBF2FA",
      focus:          "#FFFFFF",
      surface:        "#005BBB",
      surfaceDeep:    "#004287",
      surfaceAbyss:   "#00264F",
      surfaceRaise:   "#1A6BC2"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Buffalo, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/buffalo/availability.json", history: "data/buffalo/availability-history.json", label: "GetSomeMACtion.com" },
    beatNews:     { file: "data/buffalo/news.json" },
    recruits:     { file: "data/buffalo/recruits.json", label: "ESPN recruiting" }
  }
};
