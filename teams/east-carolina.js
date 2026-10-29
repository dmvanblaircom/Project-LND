/* East Carolina - Phase 4a, the American, the Mountain West and the Pac-12
   (David, 2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 151, its home field as
   ESPN's schedule spells it (Dowdy-Ficklen Stadium), and the beat feeds
   below (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "east-carolina",
    name:         "East Carolina",
    abbreviation: "ECU",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "Dowdy-Ficklen Stadium",
      lat:  35.5967,
      lon: -77.3652
    }
  },

  sources: {
    espn: {
      teamId: "151",
      broadcastFallback: []
    },

    // The American's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://theamerican.org/sports/football",
      availabilityReportLabel: "TheAmerican.org",
      availabilityFeed: { provider: "hdintelligence", conference: "American", sport: "Football", team: "East Carolina" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // One source only: The East Carolinian turned GitHub's network away twice
    // (429), On SI has no ECU site (404), and On3's feed carries only
    // national stories.
    beatFeeds: [
      { name: "ECU Athletics", feed: "https://ecupirates.com/rss?path=football", site: "https://ecupirates.com/sports/football", logo: "https://ecupirates.com/favicon.ico" }
    ]
  },

  series: [

  ],

  links: {
    roster: { url: "https://ecupirates.com/sports/football/roster", label: "ecupirates.com" }
  },

  // East Carolina inside Suite: Purple, Gold (ESPN's), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "ECU FOOTBALL",

    colors: {
      accent:         "#FFC72C",
      accentText:     "#FFC72C",
      accentOnLight:  "#582C83",
      accentInk:      "#582C83",
      accentSoft:     "#FFE08B",
      accentTint:     "#FFF5D9",
      accentTintSoft: "#FFFBEE",
      focus:          "#FFFFFF",
      surface:        "#582C83",
      surfaceDeep:    "#3F205E",
      surfaceAbyss:   "#251237",
      surfaceRaise:   "#69418F"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for East Carolina, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/east-carolina/availability.json", history: "data/east-carolina/availability-history.json", label: "TheAmerican.org" },
    beatNews:     { file: "data/east-carolina/news.json" },
    recruits:     { file: "data/east-carolina/recruits.json", label: "ESPN recruiting" }
  }
};
