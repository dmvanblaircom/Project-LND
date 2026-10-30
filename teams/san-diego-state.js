/* San Diego State - Phase 4a, the American, the Mountain West and the Pac-12
   (David, 2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 21, its home field as
   ESPN's schedule spells it (Snapdragon Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "san-diego-state",
    name:         "San Diego State",
    abbreviation: "SDSU",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Los_Angeles",

    venue: {
      name: "Snapdragon Stadium",
      lat:  32.7831,
      lon: -117.1196
    }
  },

  sources: {
    espn: {
      teamId: "21",
      broadcastFallback: []
    },

    // The Pac-12 posts its availability reports on Pac-12.com, not through HD
    // Intelligence (2026-10-29); there is no reader for that page yet, so
    // none are shown.

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // Not used: goaztecs.com's feed carries every sport, so it is read as a
    // sports section: only stories that say football stay. On3's feed carries
    // only national stories.
    beatFeeds: [
      { name: "San Diego State Athletics", feed: "https://goaztecs.com/rss?path=football", site: "https://goaztecs.com/sports/football", logo: "https://goaztecs.com/favicon.ico", sportsSection: true },
      { name: "San Diego State On SI", feed: "https://www.si.com/college/san-diego-state/feed", site: "https://www.si.com/college/san-diego-state", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "The Daily Aztec", feed: "https://thedailyaztec.com/category/sports/football/feed/", site: "https://thedailyaztec.com/category/sports/football/" }
    ]
  },

  series: [
    { match: /^fresno state( bulldogs)?$/i, name: "Old Oil Can", kind: "trophy" }
  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its schedule, where each game's notes are posted.
    gameNotes: { url: "https://goaztecs.com/sports/football/schedule", label: "goaztecs.com", kind: "schedule" },
    roster: { url: "https://goaztecs.com/sports/football/roster", label: "goaztecs.com" }
  },

  // San Diego State inside Suite: Scarlet (ESPN's), white; ESPN's second colour is black, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "SAN DIEGO STATE FOOTBALL",

    colors: {
      accent:         "#FFFFFF",
      accentText:     "#FFFFFF",
      accentOnLight:  "#A6192E",
      accentInk:      "#A6192E",
      accentSoft:     "#FFFFFF",
      accentTint:     "#EFD6D9",
      accentTintSoft: "#F8EDEE",
      focus:          "#FFFFFF",
      surface:        "#A6192E",
      surfaceDeep:    "#781221",
      surfaceAbyss:   "#460B13",
      surfaceRaise:   "#AF3043"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for San Diego State, each because a
  // source exists for it.
  snapshots: {
    beatNews:     { file: "data/san-diego-state/news.json" },
    recruits:     { file: "data/san-diego-state/recruits.json", label: "ESPN recruiting" }
  }
};
