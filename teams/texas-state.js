/* Texas State - Phase 4a, the American, the Mountain West and the Pac-12
   (David, 2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 326, its home field as
   ESPN's schedule spells it (UFCU Stadium), and the beat feeds below (probe-
   feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "texas-state",
    name:         "Texas State",
    abbreviation: "TXST",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Chicago",

    venue: {
      name: "UFCU Stadium",
      lat:  29.8907,
      lon: -97.9258
    }
  },

  sources: {
    // The Pac-12's availability reports, read from the public file its report
    // page draws (tools/producers/conference_availability.py; David,
    // 2026-10-30). The team as the file names it, seen there on 2026-10-30.
    official: {
      availabilityReportIndex: "https://pac-12.com/news/2026/9/11/2026-football-reports.aspx",
      availabilityReportLabel: "Pac-12.com",
      availabilityFeed: { provider: "reportjson", url: "https://sbcautostorage.blob.core.windows.net/availability-reports/pac12-football/prod/report.json", team: "Texas State" }
    },

    espn: {
      teamId: "326",
      broadcastFallback: []
    },

    // The Pac-12 posts its availability reports on Pac-12.com, not through HD
    // Intelligence (2026-10-29); there is no reader for that page yet, so
    // none are shown.

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // Not used: On SI has no Texas State site (404), and On3's feed carries
    // only national stories.
    beatFeeds: [
      { name: "Texas State Athletics", feed: "https://txst.com/rss?path=football", site: "https://txst.com/sports/football", logo: "https://txst.com/favicon.ico" },
      { name: "The University Star", feed: "https://universitystar.com/category/sports/football/feed/", site: "https://universitystar.com/category/sports/football/" }
    ]
  },

  series: [
    { match: /^utsa( roadrunners)?$/i, name: "I-35 Rivalry", kind: "rivalry" }
  ],

  links: {
    roster: { url: "https://txst.com/sports/football/roster", label: "txst.com" }
  },

  // Texas State inside Suite: Maroon (ESPN's), white; ESPN's gold is too dark to read on maroon, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "TEXAS STATE FOOTBALL",

    colors: {
      accent:         "#FFFFFF",
      accentText:     "#FFFFFF",
      accentOnLight:  "#501214",
      accentInk:      "#501214",
      accentSoft:     "#FFFFFF",
      accentTint:     "#E0D4D5",
      accentTintSoft: "#F1ECEC",
      focus:          "#FFFFFF",
      surface:        "#501214",
      surfaceDeep:    "#3A0D0E",
      surfaceAbyss:   "#220808",
      surfaceRaise:   "#622A2C"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Texas State, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/texas-state/availability.json", history: "data/texas-state/availability-history.json", label: "Pac-12.com" },
    beatNews:     { file: "data/texas-state/news.json" },
    recruits:     { file: "data/texas-state/recruits.json", label: "ESPN recruiting" }
  }
};
