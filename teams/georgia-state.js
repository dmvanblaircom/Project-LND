/* Georgia State - Phase 4b, the Sun Belt, the MAC, Conference USA and UConn
   (David, 2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 2247, its home field as
   ESPN's schedule spells it (Center Parc Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "georgia-state",
    name:         "Georgia State",
    abbreviation: "GAST",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "Center Parc Stadium",
      lat:  33.7353,
      lon: -84.3895
    }
  },

  sources: {
    espn: {
      teamId: "2247",
      broadcastFallback: []
    },

    // The Sun Belt publishes no availability reports that HD Intelligence
    // carries or that could be found on sunbeltsports.org (2026-10-29), so
    // none are shown.

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // One source only: The Signal's site refused GitHub's network (TLS), On
    // SI has no Georgia State site (404), and On3's feed carries only
    // national stories.
    beatFeeds: [
      { name: "Georgia State Athletics", feed: "https://georgiastatesports.com/rss?path=football", site: "https://georgiastatesports.com/sports/football", logo: "https://georgiastatesports.com/favicon.ico" }
    ]
  },

  series: [
    { match: /^georgia southern( eagles)?$/i, name: "Modern Day Hate", kind: "rivalry" }
  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its schedule, where each game's notes are posted.
    gameNotes: { url: "https://georgiastatesports.com/sports/football/schedule", label: "georgiastatesports.com", kind: "schedule" },
    roster: { url: "https://georgiastatesports.com/sports/football/roster", label: "georgiastatesports.com" }
  },

  // Georgia State inside Suite: Blue (ESPN's), white, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "GEORGIA STATE FOOTBALL",

    colors: {
      accent:         "#FFFFFF",
      accentText:     "#FFFFFF",
      accentOnLight:  "#0039A6",
      accentInk:      "#0039A6",
      accentSoft:     "#FFFFFF",
      accentTint:     "#D1DBEF",
      accentTintSoft: "#EBEFF8",
      focus:          "#FFFFFF",
      surface:        "#0039A6",
      surfaceDeep:    "#002978",
      surfaceAbyss:   "#001846",
      surfaceRaise:   "#1A4DAF"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Georgia State, each because a
  // source exists for it.
  snapshots: {
    beatNews:     { file: "data/georgia-state/news.json" },
    recruits:     { file: "data/georgia-state/recruits.json", label: "ESPN recruiting" }
  }
};
