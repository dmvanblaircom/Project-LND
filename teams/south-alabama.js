/* South Alabama - Phase 4b, the Sun Belt, the MAC, Conference USA and UConn
   (David, 2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 6, its home field as ESPN's
   schedule spells it (Hancock Whitney Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "south-alabama",
    name:         "South Alabama",
    abbreviation: "USA",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Chicago",

    venue: {
      name: "Hancock Whitney Stadium",
      lat:  30.6967,
      lon: -88.1878
    }
  },

  sources: {
    // The Sun Belt's availability reports, read from the public file its report
    // page draws (tools/producers/conference_availability.py; David,
    // 2026-10-30). The team as the file names it, seen there on 2026-10-30.
    official: {
      availabilityReportIndex: "https://sunbeltsports.org/news/2025/8/11/football-availability-report-new.aspx",
      availabilityReportLabel: "SunBeltSports.org",
      availabilityFeed: { provider: "reportjson", url: "https://sbcautostorage.blob.core.windows.net/availability-reports/sunbelt-football/prod/report.json", team: "South Alabama" }
    },

    espn: {
      teamId: "6",
      broadcastFallback: []
    },

    // The Sun Belt publishes no availability reports that HD Intelligence
    // carries or that could be found on sunbeltsports.org (2026-10-29), so
    // none are shown.

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // One source only: The Vanguard's feed is empty, On SI has no South
    // Alabama site (404), and On3's feed carries only national stories.
    beatFeeds: [
      { name: "South Alabama Athletics", feed: "https://usajaguars.com/rss?path=football", site: "https://usajaguars.com/sports/football", logo: "https://usajaguars.com/favicon.ico" }
    ]
  },

  series: [
    { match: /^troy( trojans)?$/i, name: "Battle for the Belt", kind: "trophy" }
  ],

  links: {
    roster: { url: "https://usajaguars.com/sports/football/roster", label: "usajaguars.com" }
  },

  // South Alabama inside Suite: Navy, Red (ESPN's), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "SOUTH ALABAMA FOOTBALL",

    colors: {
      accent:         "#BF0D3E",
      accentText:     "#D35A7C",
      accentOnLight:  "#BF0D3E",
      accentInk:      "#FFFFFF",
      accentSoft:     "#DC7A95",
      accentTint:     "#F3D3DC",
      accentTintSoft: "#FAECF0",
      focus:          "#FFFFFF",
      surface:        "#00205B",
      surfaceDeep:    "#001742",
      surfaceAbyss:   "#000D26",
      surfaceRaise:   "#1A366B"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for South Alabama, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/south-alabama/availability.json", history: "data/south-alabama/availability-history.json", label: "SunBeltSports.org" },
    beatNews:     { file: "data/south-alabama/news.json" },
    recruits:     { file: "data/south-alabama/recruits.json", label: "ESPN recruiting" }
  }
};
