/* Troy - Phase 4b, the Sun Belt, the MAC, Conference USA and UConn (David,
   2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 2653, its home field as
   ESPN's schedule spells it (Veterans Memorial Stadium (AL)), and the beat
   feeds below (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "troy",
    name:         "Troy",
    abbreviation: "TROY",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Chicago",

    venue: {
      name: "Veterans Memorial Stadium (AL)",
      lat:  31.8013,
      lon: -85.9531
    }
  },

  sources: {
    // The Sun Belt's availability reports, read from the public file its report
    // page draws (tools/producers/conference_availability.py; David,
    // 2026-10-30). The team as the file names it, seen there on 2026-10-30.
    official: {
      availabilityReportIndex: "https://sunbeltsports.org/news/2025/8/11/football-availability-report-new.aspx",
      availabilityReportLabel: "SunBeltSports.org",
      availabilityFeed: { provider: "reportjson", url: "https://sbcautostorage.blob.core.windows.net/availability-reports/sunbelt-football/prod/report.json", team: "Troy" }
    },

    espn: {
      teamId: "2653",
      broadcastFallback: []
    },

    // The Sun Belt publishes no availability reports that HD Intelligence
    // carries or that could be found on sunbeltsports.org (2026-10-29), so
    // none are shown.

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // One source only: On SI has no Troy site (404), On3's feed carries only
    // national stories, and no student paper feed was found.
    beatFeeds: [
      { name: "Troy Athletics", feed: "https://troytrojans.com/rss?path=football", site: "https://troytrojans.com/sports/football", logo: "https://troytrojans.com/favicon.ico" }
    ]
  },

  series: [
    { match: /^south alabama( jaguars)?$/i, name: "Battle for the Belt", kind: "trophy" }
  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its notes page, which carries this season's notes
    // (checked from GitHub's network that day).
    gameNotes: { url: "https://troytrojans.com/sports/2026/8/31/2026-football-game-notes", label: "troytrojans.com", kind: "index" },
    roster: { url: "https://troytrojans.com/sports/football/roster", label: "troytrojans.com" }
  },

  // Troy inside Suite: Cardinal, Silver (ESPN's), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "TROY FOOTBALL",

    colors: {
      accent:         "#B1B1B1",
      accentText:     "#B1B1B1",
      accentOnLight:  "#862633",
      accentInk:      "#601B25",
      accentSoft:     "#D4D4D4",
      accentTint:     "#F1F1F1",
      accentTintSoft: "#F9F9F9",
      // Game Details in white, lettered in the team's colour: its silver
      // read as a disabled button (sweep, 2026-10-29; David, 2026-10-30).
      action:         "#FFFFFF",
      actionInk:      "#862633",
      focus:          "#FFFFFF",
      surface:        "#862633",
      surfaceDeep:    "#601B25",
      surfaceAbyss:   "#381015",
      surfaceRaise:   "#923C47"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Troy, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/troy/availability.json", history: "data/troy/availability-history.json", label: "SunBeltSports.org" },
    beatNews:     { file: "data/troy/news.json" },
    recruits:     { file: "data/troy/recruits.json", label: "ESPN recruiting" }
  }
};
