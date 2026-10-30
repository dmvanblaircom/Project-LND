/* Marshall - Phase 4b, the Sun Belt, the MAC, Conference USA and UConn
   (David, 2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 276, its home field as
   ESPN's schedule spells it (Joan C. Edwards Stadium), and the beat feeds
   below (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "marshall",
    name:         "Marshall",
    abbreviation: "MRSH",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "Joan C. Edwards Stadium",
      lat:  38.4247,
      lon: -82.4210
    }
  },

  sources: {
    // The Sun Belt's availability reports, read from the public file its report
    // page draws (tools/producers/conference_availability.py; David,
    // 2026-10-30). The team as the file names it, seen there on 2026-10-30.
    official: {
      availabilityReportIndex: "https://sunbeltsports.org/news/2025/8/11/football-availability-report-new.aspx",
      availabilityReportLabel: "SunBeltSports.org",
      availabilityFeed: { provider: "reportjson", url: "https://sbcautostorage.blob.core.windows.net/availability-reports/sunbelt-football/prod/report.json", team: "Marshall" }
    },

    espn: {
      teamId: "276",
      broadcastFallback: []
    },

    // The Sun Belt publishes no availability reports that HD Intelligence
    // carries or that could be found on sunbeltsports.org (2026-10-29), so
    // none are shown.

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // Not used: On SI has no Marshall site (404), and On3's feed carries only
    // national stories.
    beatFeeds: [
      { name: "Marshall Athletics", feed: "https://herdzone.com/rss?path=football", site: "https://herdzone.com/sports/football", logo: "https://herdzone.com/favicon.ico" },
      { name: "The Parthenon", feed: "https://marshallparthenon.com/category/sports/football/feed/", site: "https://marshallparthenon.com/category/sports/football/" }
    ]
  },

  series: [
    { match: /^ohio( bobcats)?$/i, name: "Battle for the Bell", kind: "trophy" }
  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its schedule, where each game's notes are posted.
    gameNotes: { url: "https://herdzone.com/sports/football/schedule", label: "herdzone.com", kind: "schedule" },
    roster: { url: "https://herdzone.com/sports/football/roster", label: "herdzone.com" }
  },

  // Marshall inside Suite: Black, Kelly Green (ESPN's); the green is too light to carry white text, so black is the surface, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "MARSHALL FOOTBALL",

    colors: {
      accent:         "#00B140",
      accentText:     "#00B140",
      accentOnLight:  "#000000",
      accentInk:      "#000000",
      accentSoft:     "#73D496",
      accentTint:     "#D1F1DD",
      accentTintSoft: "#EBF9F0",
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

  // What .github/workflows/odds.yml commits for Marshall, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/marshall/availability.json", history: "data/marshall/availability-history.json", label: "SunBeltSports.org" },
    beatNews:     { file: "data/marshall/news.json" },
    recruits:     { file: "data/marshall/recruits.json", label: "ESPN recruiting" }
  }
};
