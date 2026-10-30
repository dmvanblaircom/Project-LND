/* Western Michigan - Phase 4b, the Sun Belt, the MAC, Conference USA and
   UConn (David, 2026-10-29). Same shape as teams/indiana.js; nothing else
   changed.

   From GitHub's network on 2026-10-29: ESPN team 2711, its home field as
   ESPN's schedule spells it (Waldo Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "western-michigan",
    name:         "Western Michigan",
    abbreviation: "WMU",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "Waldo Stadium",
      lat:  42.2836,
      lon: -85.6116
    }
  },

  sources: {
    espn: {
      teamId: "2711",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-WMU",
      namePattern:  /western mich/i
    },

    // The MAC's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://getsomemaction.com/sports/football",
      availabilityReportLabel: "GetSomeMACtion.com",
      availabilityFeed: { provider: "hdintelligence", conference: "MAC", sport: "Football", team: "Western Mich.", aliases: ["Western Michigan"] }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // One source only: the Western Herald turned GitHub's network away twice
    // (429), On SI has no Western Michigan site (404), and On3's feed carries
    // only national stories.
    beatFeeds: [
      { name: "WMU Athletics", feed: "https://wmubroncos.com/rss?path=football", site: "https://wmubroncos.com/sports/football", logo: "https://wmubroncos.com/favicon.ico" }
    ]
  },

  series: [
    { match: /^central michigan( chippewas)?$/i, name: "Victory Cannon", kind: "trophy" }
  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its schedule, where each game's notes are posted.
    gameNotes: { url: "https://wmubroncos.com/sports/football/schedule", label: "wmubroncos.com", kind: "schedule" },
    roster: { url: "https://wmubroncos.com/sports/football/roster", label: "wmubroncos.com" }
  },

  // Western Michigan inside Suite: Brown, Gold (ESPN's), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "WESTERN MICHIGAN FOOTBALL",

    colors: {
      accent:         "#F1C500",
      accentText:     "#F1C500",
      accentOnLight:  "#532E1F",
      accentInk:      "#532E1F",
      accentSoft:     "#F7DF73",
      accentTint:     "#FCF5D1",
      accentTintSoft: "#FEFAEB",
      focus:          "#FFFFFF",
      surface:        "#532E1F",
      surfaceDeep:    "#3C2116",
      surfaceAbyss:   "#23130D",
      surfaceRaise:   "#644335"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Western Michigan, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/western-michigan/availability.json", history: "data/western-michigan/availability-history.json", label: "GetSomeMACtion.com" },
    oddsHistory:  { file: "data/western-michigan/odds-history.json" },
    beatNews:     { file: "data/western-michigan/news.json" },
    recruits:     { file: "data/western-michigan/recruits.json", label: "ESPN recruiting" }
  }
};
