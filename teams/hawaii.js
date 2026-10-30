/* Hawai'i - Phase 4a, the American, the Mountain West and the Pac-12 (David,
   2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 62, its home field as
   ESPN's schedule spells it (Clarence T.C. Ching Athletics Complex), and the
   beat feeds below (probe-feeds.yml). Approved with the phase's review
   sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "hawaii",
    name:         "Hawai'i",
    abbreviation: "HAW",
    sport:        "football",
    league:       "college-football",
    timeZone:     "Pacific/Honolulu",

    venue: {
      name: "Clarence T.C. Ching Athletics Complex",
      lat:  21.2960,
      lon: -157.8190
    }
  },

  sources: {
    espn: {
      teamId: "62",
      broadcastFallback: []
    },

    // The Mountain West publishes no availability reports that HD
    // Intelligence carries or that could be found on themw.com (2026-10-29),
    // so none are shown.

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // One source only: Ka Leo turned GitHub's network away twice (429), and
    // there is no On3 team feed or On SI site (404).
    beatFeeds: [
      { name: "Hawai'i Athletics", feed: "https://hawaiiathletics.com/rss?path=football", site: "https://hawaiiathletics.com/sports/football", logo: "https://hawaiiathletics.com/favicon.ico" }
    ]
  },

  series: [
    { match: /^wyoming( cowboys)?$/i, name: "Paniolo Trophy", kind: "trophy" },
    { match: /^san jos[eé] state( spartans)?$/i, name: "Dick Tomey Legacy Trophy", kind: "trophy" }
  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its schedule, where each game's notes are posted.
    gameNotes: { url: "https://hawaiiathletics.com/sports/football/schedule", label: "hawaiiathletics.com", kind: "schedule" },
    // The Mountain West's availability reports, which Suite cannot read (its
    // viewer answers only a browser): Roster links the page instead
    // (David, 2026-10-30).
    availability: { url: "https://themw.com/sports/2026/8/21/football_reports.aspx", label: "TheMW.com", conference: "Mountain West" },
    roster: { url: "https://hawaiiathletics.com/sports/football/roster", label: "hawaiiathletics.com" }
  },

  // Hawai'i inside Suite: Green (ESPN's), white; ESPN's second colour is black, unreadable on the green, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "HAWAI'I FOOTBALL",

    colors: {
      accent:         "#FFFFFF",
      accentText:     "#FFFFFF",
      accentOnLight:  "#005737",
      accentInk:      "#005737",
      accentSoft:     "#FFFFFF",
      accentTint:     "#D1E1DB",
      accentTintSoft: "#EBF2EF",
      focus:          "#FFFFFF",
      surface:        "#005737",
      surfaceDeep:    "#003F28",
      surfaceAbyss:   "#002517",
      surfaceRaise:   "#1A684B"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Hawai'i, each because a
  // source exists for it.
  snapshots: {
    beatNews:     { file: "data/hawaii/news.json" },
    recruits:     { file: "data/hawaii/recruits.json", label: "ESPN recruiting" }
  }
};
