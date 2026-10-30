/* Nevada - Phase 4a, the American, the Mountain West and the Pac-12 (David,
   2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 2440, its home field as
   ESPN's schedule spells it (Mackay Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "nevada",
    name:         "Nevada",
    abbreviation: "NEV",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Los_Angeles",

    venue: {
      name: "Mackay Stadium",
      lat:  39.5469,
      lon: -119.8176
    }
  },

  sources: {
    espn: {
      teamId: "2440",
      broadcastFallback: []
    },

    // The Mountain West publishes no availability reports that HD
    // Intelligence carries or that could be found on themw.com (2026-10-29),
    // so none are shown.

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // The Nevada Sagebrush is the student paper; its feed is every topic, so
    // only stories that say football stay (2026-10-29). Not used: On SI has no
    // Nevada site (404), On3's feed carries only national stories, and Nevada
    // Sports Net has no feed.
    beatFeeds: [
      { name: "Nevada Athletics", feed: "https://nevadawolfpack.com/rss?path=football", site: "https://nevadawolfpack.com/sports/football", logo: "https://nevadawolfpack.com/favicon.ico" },
      { name: "The Nevada Sagebrush", feed: "https://nevadasagebrush.com/feed/", site: "https://nevadasagebrush.com/", sportsSection: true }
    ]
  },

  series: [
    { match: /^unlv( rebels)?$/i, name: "Fremont Cannon", kind: "trophy" }
  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its schedule, where each game's notes are posted.
    gameNotes: { url: "https://nevadawolfpack.com/sports/football/schedule", label: "nevadawolfpack.com", kind: "schedule" },
    roster: { url: "https://nevadawolfpack.com/sports/football/roster", label: "nevadawolfpack.com" }
  },

  // Nevada inside Suite: Navy, Silver (ESPN's), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "NEVADA FOOTBALL",

    colors: {
      accent:         "#8A8D8F",
      accentText:     "#8A8D8F",
      accentOnLight:  "#041E42",
      accentInk:      "#041E42",
      accentSoft:     "#BFC0C1",
      accentTint:     "#EAEAEB",
      accentTintSoft: "#F6F6F6",
      // Game Details in white, lettered in the team's colour: its silver
      // read as a disabled button (sweep, 2026-10-29; David, 2026-10-30).
      action:         "#FFFFFF",
      actionInk:      "#041E42",
      focus:          "#FFFFFF",
      surface:        "#041E42",
      surfaceDeep:    "#031630",
      surfaceAbyss:   "#020D1C",
      surfaceRaise:   "#1D3455"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Nevada, each because a
  // source exists for it.
  snapshots: {
    beatNews:     { file: "data/nevada/news.json" },
    recruits:     { file: "data/nevada/recruits.json", label: "ESPN recruiting" }
  }
};
