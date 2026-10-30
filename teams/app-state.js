/* App State - Phase 4b, the Sun Belt, the MAC, Conference USA and UConn
   (David, 2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 2026, its home field as
   ESPN's schedule spells it (Kidd Brewer Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "app-state",
    name:         "App State",
    abbreviation: "APP",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "Kidd Brewer Stadium",
      lat:  36.2114,
      lon: -81.6854
    }
  },

  sources: {
    espn: {
      teamId: "2026",
      broadcastFallback: []
    },

    // The Sun Belt publishes no availability reports that HD Intelligence
    // carries or that could be found on sunbeltsports.org (2026-10-29), so
    // none are shown.

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // Not used: On SI has no App State site (404), and there is no On3 team
    // feed (404).
    beatFeeds: [
      { name: "App State Athletics", feed: "https://appstatesports.com/rss?path=football", site: "https://appstatesports.com/sports/football", logo: "https://appstatesports.com/favicon.ico" },
      { name: "The Appalachian", feed: "https://theappalachianonline.com/category/sports/football/feed/", site: "https://theappalachianonline.com/category/sports/football/" }
    ]
  },

  series: [
    { match: /^georgia southern( eagles)?$/i, name: "Deeper Than Hate", kind: "rivalry" }
  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its schedule, where each game's notes are posted.
    gameNotes: { url: "https://appstatesports.com/sports/football/schedule", label: "appstatesports.com", kind: "schedule" },
    roster: { url: "https://appstatesports.com/sports/football/roster", label: "appstatesports.com" }
  },

  // App State inside Suite: Black, Gold (ESPN's), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "APP STATE FOOTBALL",

    colors: {
      accent:         "#FFCD00",
      accentText:     "#FFCD00",
      accentOnLight:  "#000000",
      accentInk:      "#000000",
      accentSoft:     "#FFE473",
      accentTint:     "#FFF6D1",
      accentTintSoft: "#FFFBEB",
      focus:          "#FFFFFF",
      surface:        "#000000",
      surfaceDeep:    "#000000",
      surfaceAbyss:   "#000000",
      surfaceRaise:   "#1A1A1A"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for App State, each because a
  // source exists for it.
  snapshots: {
    beatNews:     { file: "data/app-state/news.json" },
    recruits:     { file: "data/app-state/recruits.json", label: "ESPN recruiting" }
  }
};
