/* Colorado State - Phase 4a, the American, the Mountain West and the Pac-12
   (David, 2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 36, its home field as
   ESPN's schedule spells it (Canvas Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "colorado-state",
    name:         "Colorado State",
    abbreviation: "CSU",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Denver",

    venue: {
      name: "Canvas Stadium",
      lat:  40.5703,
      lon: -105.0897
    }
  },

  sources: {
    espn: {
      teamId: "36",
      broadcastFallback: []
    },

    // The Pac-12 posts its availability reports on Pac-12.com, not through HD
    // Intelligence (2026-10-29); there is no reader for that page yet, so
    // none are shown.

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // Not used: Mountain West Connection (SB Nation) covers the whole league,
    // On SI has no Colorado State site (404), and On3's feed carries only
    // national stories.
    beatFeeds: [
      { name: "Colorado State Athletics", feed: "https://csurams.com/rss?path=football", site: "https://csurams.com/sports/football", logo: "https://csurams.com/favicon.ico" },
      { name: "The Rocky Mountain Collegian", feed: "https://collegian.com/category/sports/football/feed/", site: "https://collegian.com/category/sports/football/" }
    ]
  },

  series: [
    { match: /^wyoming( cowboys)?$/i, name: "Bronze Boot", kind: "trophy" },
    { match: /^colorado( buffaloes)?$/i, name: "Rocky Mountain Showdown", kind: "trophy" },
    { match: /^air force( falcons)?$/i, name: "Ram-Falcon Trophy", kind: "trophy" }
  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its schedule, where each game's notes are posted.
    gameNotes: { url: "https://csurams.com/sports/football/schedule", label: "csurams.com", kind: "schedule" },
    roster: { url: "https://csurams.com/sports/football/roster", label: "csurams.com" }
  },

  // Colorado State inside Suite: Green, Gold (ESPN's), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "COLORADO STATE FOOTBALL",

    colors: {
      accent:         "#C8C372",
      accentText:     "#C8C372",
      accentOnLight:  "#004C23",
      accentInk:      "#004C23",
      accentSoft:     "#E1DEB1",
      accentTint:     "#F5F4E6",
      accentTintSoft: "#FBFAF4",
      focus:          "#FFFFFF",
      surface:        "#004C23",
      surfaceDeep:    "#003719",
      surfaceAbyss:   "#00200F",
      surfaceRaise:   "#1A5E39"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Colorado State, each because a
  // source exists for it.
  snapshots: {
    beatNews:     { file: "data/colorado-state/news.json" },
    recruits:     { file: "data/colorado-state/recruits.json", label: "ESPN recruiting" }
  }
};
