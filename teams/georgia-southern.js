/* Georgia Southern - Phase 4b, the Sun Belt, the MAC, Conference USA and
   UConn (David, 2026-10-29). Same shape as teams/indiana.js; nothing else
   changed.

   From GitHub's network on 2026-10-29: ESPN team 290, its home field as
   ESPN's schedule spells it (Allen E. Paulson Stadium), and the beat feeds
   below (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "georgia-southern",
    name:         "Georgia Southern",
    abbreviation: "GASO",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "Allen E. Paulson Stadium",
      lat:  32.4114,
      lon: -81.7839
    }
  },

  sources: {
    espn: {
      teamId: "290",
      broadcastFallback: []
    },

    // The Sun Belt publishes no availability reports that HD Intelligence
    // carries or that could be found on sunbeltsports.org (2026-10-29), so
    // none are shown.

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // Not used: On SI has no Georgia Southern site (404), and On3's feed
    // carries only national stories.
    beatFeeds: [
      { name: "Georgia Southern Athletics", feed: "https://gseagles.com/rss?path=football", site: "https://gseagles.com/sports/football", logo: "https://gseagles.com/favicon.ico" },
      { name: "The George-Anne", feed: "https://thegeorgeanne.com/category/sports/feed/", site: "https://thegeorgeanne.com/category/sports/", sportsSection: true }
    ]
  },

  series: [
    { match: /^app(alachian)? state( mountaineers)?$/i, name: "Deeper Than Hate", kind: "rivalry" },
    { match: /^georgia state( panthers)?$/i, name: "Modern Day Hate", kind: "rivalry" }
  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its schedule, where each game's notes are posted.
    gameNotes: { url: "https://gseagles.com/sports/football/schedule", label: "gseagles.com", kind: "schedule" },
    roster: { url: "https://gseagles.com/sports/football/roster", label: "gseagles.com" }
  },

  // Georgia Southern inside Suite: Navy, Silver (ESPN's), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "GEORGIA SOUTHERN FOOTBALL",

    colors: {
      accent:         "#A3AAAE",
      accentText:     "#A3AAAE",
      accentOnLight:  "#041E42",
      accentInk:      "#041E42",
      accentSoft:     "#CCD0D2",
      accentTint:     "#EEF0F0",
      accentTintSoft: "#F8F8F9",
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

  // What .github/workflows/odds.yml commits for Georgia Southern, each because a
  // source exists for it.
  snapshots: {
    beatNews:     { file: "data/georgia-southern/news.json" },
    recruits:     { file: "data/georgia-southern/recruits.json", label: "ESPN recruiting" }
  }
};
