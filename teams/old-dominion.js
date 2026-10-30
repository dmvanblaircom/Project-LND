/* Old Dominion - Phase 4b, the Sun Belt, the MAC, Conference USA and UConn
   (David, 2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 295, its home field as
   ESPN's schedule spells it (S.B. Ballard Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "old-dominion",
    name:         "Old Dominion",
    abbreviation: "ODU",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "S.B. Ballard Stadium",
      lat:  36.8890,
      lon: -76.3053
    }
  },

  sources: {
    // The Sun Belt's availability reports, read from the public file its report
    // page draws (tools/producers/conference_availability.py; David,
    // 2026-10-30). The team as the file names it, seen there on 2026-10-30.
    official: {
      availabilityReportIndex: "https://sunbeltsports.org/news/2025/8/11/football-availability-report-new.aspx",
      availabilityReportLabel: "SunBeltSports.org",
      availabilityFeed: { provider: "reportjson", url: "https://sbcautostorage.blob.core.windows.net/availability-reports/sunbelt-football/prod/report.json", team: "Old Dominion" }
    },

    espn: {
      teamId: "295",
      broadcastFallback: []
    },

    // The Sun Belt publishes no availability reports that HD Intelligence
    // carries or that could be found on sunbeltsports.org (2026-10-29), so
    // none are shown.

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // One source only, read as a sports section (odusports.com's feed carries
    // every sport): Mace & Crown's feed address now leads to an unrelated
    // site, On SI has no ODU site (404), and On3's feed carries only national
    // stories.
    beatFeeds: [
      { name: "ODU Athletics", feed: "https://odusports.com/rss?path=football", site: "https://odusports.com/sports/football", logo: "https://odusports.com/favicon.ico", sportsSection: true }
    ]
  },

  series: [
    { match: /^james madison( dukes)?$/i, name: "Royal Rivalry", kind: "rivalry" }
  ],

  links: {
    roster: { url: "https://odusports.com/sports/football/roster", label: "odusports.com" }
  },

  // Old Dominion inside Suite: Slate Blue, Light Blue (ESPN's), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "OLD DOMINION FOOTBALL",

    colors: {
      accent:         "#A1D2F1",
      accentText:     "#A1D2F1",
      accentOnLight:  "#003768",
      accentInk:      "#003768",
      accentSoft:     "#CBE6F7",
      accentTint:     "#EEF7FC",
      accentTintSoft: "#F7FBFE",
      focus:          "#FFFFFF",
      surface:        "#003768",
      surfaceDeep:    "#00284B",
      surfaceAbyss:   "#00172C",
      surfaceRaise:   "#1A4B77"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Old Dominion, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/old-dominion/availability.json", history: "data/old-dominion/availability-history.json", label: "SunBeltSports.org" },
    beatNews:     { file: "data/old-dominion/news.json" },
    recruits:     { file: "data/old-dominion/recruits.json", label: "ESPN recruiting" }
  }
};
