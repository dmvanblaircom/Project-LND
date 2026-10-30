/* Fresno State - Phase 4a, the American, the Mountain West and the Pac-12
   (David, 2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 278, its home field as
   ESPN's schedule spells it (Valley Children's Stadium), and the beat feeds
   below (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "fresno-state",
    name:         "Fresno State",
    abbreviation: "FRES",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Los_Angeles",

    venue: {
      name: "Valley Children's Stadium",
      lat:  36.8136,
      lon: -119.7581
    }
  },

  sources: {
    espn: {
      teamId: "278",
      broadcastFallback: []
    },

    // The Pac-12 posts its availability reports on Pac-12.com, not through HD
    // Intelligence (2026-10-29); there is no reader for that page yet, so
    // none are shown.

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // One source only: On SI has no Fresno State site (404), On3's feed
    // carries only national stories, and no student paper feed.
    beatFeeds: [
      { name: "Fresno State Athletics", feed: "https://gobulldogs.com/rss?path=football", site: "https://gobulldogs.com/sports/football", logo: "https://gobulldogs.com/favicon.ico" }
    ]
  },

  series: [
    { match: /^boise state( broncos)?$/i, name: "Milk Can", kind: "trophy" },
    { match: /^san diego state( aztecs)?$/i, name: "Old Oil Can", kind: "trophy" }
  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its notes page, which carries this season's notes
    // (checked from GitHub's network that day).
    gameNotes: { url: "https://gobulldogs.com/sports/2026/8/31/2026-game-notes", label: "gobulldogs.com", kind: "index" },
    roster: { url: "https://gobulldogs.com/sports/football/roster", label: "gobulldogs.com" }
  },

  // Fresno State inside Suite: Cardinal (ESPN's), white; ESPN's second colour is navy, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "FRESNO STATE FOOTBALL",

    colors: {
      accent:         "#FFFFFF",
      accentText:     "#FFFFFF",
      accentOnLight:  "#B1102B",
      accentInk:      "#B1102B",
      accentSoft:     "#FFFFFF",
      accentTint:     "#F1D4D9",
      accentTintSoft: "#F9ECEE",
      focus:          "#FFFFFF",
      surface:        "#B1102B",
      surfaceDeep:    "#7F0C1F",
      surfaceAbyss:   "#4A0712",
      surfaceRaise:   "#B92840"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Fresno State, each because a
  // source exists for it.
  snapshots: {
    beatNews:     { file: "data/fresno-state/news.json" },
    recruits:     { file: "data/fresno-state/recruits.json", label: "ESPN recruiting" }
  }
};
