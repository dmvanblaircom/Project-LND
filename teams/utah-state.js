/* Utah State - Phase 4a, the American, the Mountain West and the Pac-12
   (David, 2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 328, its home field as
   ESPN's schedule spells it (Maverik Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "utah-state",
    name:         "Utah State",
    abbreviation: "USU",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Denver",

    venue: {
      name: "Maverik Stadium",
      lat:  41.7516,
      lon: -111.8115
    }
  },

  sources: {
    espn: {
      teamId: "328",
      broadcastFallback: []
    },

    // The Pac-12 posts its availability reports on Pac-12.com, not through HD
    // Intelligence (2026-10-29); there is no reader for that page yet, so
    // none are shown.

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // Not used: On SI has no Utah State site (404), and On3's feed carries
    // only national stories.
    beatFeeds: [
      { name: "Utah State Athletics", feed: "https://utahstateaggies.com/rss?path=football", site: "https://utahstateaggies.com/sports/football", logo: "https://utahstateaggies.com/favicon.ico" },
      { name: "The Utah Statesman", feed: "https://usustatesman.com/category/sports/feed/", site: "https://usustatesman.com/category/sports/", sportsSection: true }
    ]
  },

  series: [
    { match: /^byu( cougars)?$|^brigham young( cougars)?$/i, name: "Old Wagon Wheel", kind: "trophy" },
    { match: /^utah( utes)?$/i, name: "Battle of the Brothers", kind: "rivalry" }
  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its schedule, where each game's notes are posted.
    gameNotes: { url: "https://utahstateaggies.com/sports/football/schedule", label: "utahstateaggies.com", kind: "schedule" },
    roster: { url: "https://utahstateaggies.com/sports/football/roster", label: "utahstateaggies.com" }
  },

  // Utah State inside Suite: Aggie Blue (ESPN's), white, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "UTAH STATE FOOTBALL",

    colors: {
      accent:         "#FFFFFF",
      accentText:     "#FFFFFF",
      accentOnLight:  "#0F2439",
      accentInk:      "#0F2439",
      accentSoft:     "#FFFFFF",
      accentTint:     "#D4D8DB",
      accentTintSoft: "#ECEDEF",
      focus:          "#FFFFFF",
      surface:        "#0F2439",
      surfaceDeep:    "#0B1A29",
      surfaceAbyss:   "#060F18",
      surfaceRaise:   "#273A4D"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Utah State, each because a
  // source exists for it.
  snapshots: {
    beatNews:     { file: "data/utah-state/news.json" },
    recruits:     { file: "data/utah-state/recruits.json", label: "ESPN recruiting" }
  }
};
