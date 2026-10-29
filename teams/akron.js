/* Akron - Phase 4b, the Sun Belt, the MAC, Conference USA and UConn (David,
   2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 2006, its home field as
   ESPN's schedule spells it (InfoCision Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "akron",
    name:         "Akron",
    abbreviation: "AKR",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "InfoCision Stadium",
      lat:  41.0726,
      lon: -81.5083
    }
  },

  sources: {
    espn: {
      teamId: "2006",
      broadcastFallback: []
    },

    // The MAC's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://getsomemaction.com/sports/football",
      availabilityReportLabel: "GetSomeMACtion.com",
      availabilityFeed: { provider: "hdintelligence", conference: "MAC", sport: "Football", team: "Akron" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // One source only: The Buchtelite has published nothing since February,
    // On SI has no Akron site (404), and On3's feed carries only national
    // stories.
    beatFeeds: [
      { name: "Akron Athletics", feed: "https://gozips.com/rss?path=football", site: "https://gozips.com/sports/football", logo: "https://gozips.com/favicon.ico" }
    ]
  },

  series: [
    { match: /^kent state( golden flashes)?$/i, name: "Wagon Wheel", kind: "trophy" }
  ],

  links: {
    roster: { url: "https://gozips.com/sports/football/roster", label: "gozips.com" }
  },

  // Akron inside Suite: Navy, Gold (ESPN's), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "AKRON FOOTBALL",

    colors: {
      accent:         "#C5B783",
      accentText:     "#C5B783",
      accentOnLight:  "#041E42",
      accentInk:      "#041E42",
      accentSoft:     "#DFD7BB",
      accentTint:     "#F5F2E9",
      accentTintSoft: "#FAF9F5",
      focus:          "#FFFFFF",
      surface:        "#041E42",
      surfaceDeep:    "#031630",
      surfaceAbyss:   "#020D1C",
      surfaceRaise:   "#1D3455"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Akron, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/akron/availability.json", history: "data/akron/availability-history.json", label: "GetSomeMACtion.com" },
    beatNews:     { file: "data/akron/news.json" },
    recruits:     { file: "data/akron/recruits.json", label: "ESPN recruiting" }
  }
};
