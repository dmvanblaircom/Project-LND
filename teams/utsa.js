/* UTSA - Phase 4a, the American, the Mountain West and the Pac-12 (David,
   2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 2636, its home field as
   ESPN's schedule spells it (Alamodome), and the beat feeds below (probe-
   feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "utsa",
    name:         "UTSA",
    abbreviation: "UTSA",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Chicago",

    venue: {
      name: "Alamodome",
      lat:  29.4170,
      lon: -98.4789
    }
  },

  sources: {
    espn: {
      teamId: "2636",
      broadcastFallback: []
    },

    // The American's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://theamerican.org/sports/football",
      availabilityReportLabel: "TheAmerican.org",
      availabilityFeed: { provider: "hdintelligence", conference: "American", sport: "Football", team: "UTSA" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // Not used: goutsa.com's feed carries every sport, so it is read as a
    // sports section: only stories that say football stay. On SI has no UTSA
    // site (404), and On3's feed carries only national stories.
    beatFeeds: [
      { name: "UTSA Athletics", feed: "https://goutsa.com/rss?path=football", site: "https://goutsa.com/sports/football", logo: "https://goutsa.com/favicon.ico", sportsSection: true },
      { name: "The Paisano", feed: "https://www.paisano-online.com/category/sports/football/feed/", site: "https://www.paisano-online.com/category/sports/football/" }
    ]
  },

  series: [
    { match: /^texas state( bobcats)?$/i, name: "I-35 Rivalry", kind: "rivalry" }
  ],

  links: {
    roster: { url: "https://goutsa.com/sports/football/roster", label: "goutsa.com" }
  },

  // UTSA inside Suite: Navy, Orange (ESPN's), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "UTSA FOOTBALL",

    colors: {
      accent:         "#F15A22",
      accentText:     "#F15A22",
      accentOnLight:  "#0C2340",
      accentInk:      "#0C2340",
      accentSoft:     "#F7A485",
      accentTint:     "#FCE1D7",
      accentTintSoft: "#FEF2ED",
      focus:          "#FFFFFF",
      surface:        "#0C2340",
      surfaceDeep:    "#09192E",
      surfaceAbyss:   "#050F1B",
      surfaceRaise:   "#243953"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for UTSA, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/utsa/availability.json", history: "data/utsa/availability-history.json", label: "TheAmerican.org" },
    beatNews:     { file: "data/utsa/news.json" },
    recruits:     { file: "data/utsa/recruits.json", label: "ESPN recruiting" }
  }
};
