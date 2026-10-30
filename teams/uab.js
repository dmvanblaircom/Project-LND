/* UAB - Phase 4a, the American, the Mountain West and the Pac-12 (David,
   2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 5, its home field as ESPN's
   schedule spells it (Protective Stadium), and the beat feeds below (probe-
   feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "uab",
    name:         "UAB",
    abbreviation: "UAB",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Chicago",

    venue: {
      name: "Protective Stadium",
      lat:  33.5276,
      lon: -86.8130
    }
  },

  sources: {
    espn: {
      teamId: "5",
      broadcastFallback: []
    },

    // The American's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://theamerican.org/sports/football",
      availabilityReportLabel: "TheAmerican.org",
      availabilityFeed: { provider: "hdintelligence", conference: "American", sport: "Football", team: "UAB" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // One source only: On SI has no UAB site (404), On3's feed carries only
    // national stories, and no student paper feed.
    beatFeeds: [
      { name: "UAB Athletics", feed: "https://uabsports.com/rss?path=football", site: "https://uabsports.com/sports/football", logo: "https://uabsports.com/favicon.ico" }
    ]
  },

  series: [

  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its schedule, where each game's notes are posted.
    gameNotes: { url: "https://uabsports.com/sports/football/schedule", label: "uabsports.com", kind: "schedule" },
    roster: { url: "https://uabsports.com/sports/football/roster", label: "uabsports.com" }
  },

  // UAB inside Suite: Forest Green, Old Gold (ESPN's), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "UAB FOOTBALL",

    colors: {
      accent:         "#FDB913",
      accentText:     "#FDB913",
      accentOnLight:  "#1A5632",
      accentInk:      "#1A5632",
      accentSoft:     "#FED87D",
      accentTint:     "#FFF2D5",
      accentTintSoft: "#FFF9EC",
      focus:          "#FFFFFF",
      surface:        "#1A5632",
      surfaceDeep:    "#133E24",
      surfaceAbyss:   "#0B2415",
      surfaceRaise:   "#316746"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for UAB, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/uab/availability.json", history: "data/uab/availability-history.json", label: "TheAmerican.org" },
    beatNews:     { file: "data/uab/news.json" },
    recruits:     { file: "data/uab/recruits.json", label: "ESPN recruiting" }
  }
};
