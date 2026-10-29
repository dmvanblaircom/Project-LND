/* Ball State - Phase 4b, the Sun Belt, the MAC, Conference USA and UConn
   (David, 2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 2050, its home field as
   ESPN's schedule spells it (Scheumann Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "ball-state",
    name:         "Ball State",
    abbreviation: "BALL",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Indiana/Indianapolis",

    venue: {
      name: "Scheumann Stadium",
      lat:  40.2153,
      lon: -85.4146
    }
  },

  sources: {
    espn: {
      teamId: "2050",
      broadcastFallback: []
    },

    // The MAC's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://getsomemaction.com/sports/football",
      availabilityReportLabel: "GetSomeMACtion.com",
      availabilityFeed: { provider: "hdintelligence", conference: "MAC", sport: "Football", team: "Ball St.", aliases: ["Ball State"] }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // One source only: the Ball State Daily News refused GitHub's network
    // (405), On SI has no Ball State site (404), and On3's feed carries only
    // national stories.
    beatFeeds: [
      { name: "Ball State Athletics", feed: "https://ballstatesports.com/rss?path=football", site: "https://ballstatesports.com/sports/football", logo: "https://ballstatesports.com/favicon.ico" }
    ]
  },

  series: [

  ],

  links: {
    roster: { url: "https://ballstatesports.com/sports/football/roster", label: "ballstatesports.com" }
  },

  // Ball State inside Suite: Cardinal (ESPN's), white, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "BALL STATE FOOTBALL",

    colors: {
      accent:         "#FFFFFF",
      accentText:     "#FFFFFF",
      accentOnLight:  "#BA0C2F",
      accentInk:      "#BA0C2F",
      accentSoft:     "#FFFFFF",
      accentTint:     "#F3D3DA",
      accentTintSoft: "#F9ECEE",
      focus:          "#FFFFFF",
      surface:        "#BA0C2F",
      surfaceDeep:    "#860922",
      surfaceAbyss:   "#4E0514",
      surfaceRaise:   "#C12444"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Ball State, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/ball-state/availability.json", history: "data/ball-state/availability-history.json", label: "GetSomeMACtion.com" },
    beatNews:     { file: "data/ball-state/news.json" },
    recruits:     { file: "data/ball-state/recruits.json", label: "ESPN recruiting" }
  }
};
