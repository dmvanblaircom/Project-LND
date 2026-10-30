/* UL Monroe - Phase 4b, the Sun Belt, the MAC, Conference USA and UConn
   (David, 2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 2433, its home field as
   ESPN's schedule spells it (Malone Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "ul-monroe",
    name:         "UL Monroe",
    abbreviation: "ULM",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Chicago",

    venue: {
      name: "Malone Stadium",
      lat:  32.5296,
      lon: -92.0743
    }
  },

  sources: {
    // The Sun Belt's availability reports, read from the public file its report
    // page draws (tools/producers/conference_availability.py; David,
    // 2026-10-30). The team as the file names it, seen there on 2026-10-30.
    official: {
      availabilityReportIndex: "https://sunbeltsports.org/news/2025/8/11/football-availability-report-new.aspx",
      availabilityReportLabel: "SunBeltSports.org",
      availabilityFeed: { provider: "reportjson", url: "https://sbcautostorage.blob.core.windows.net/availability-reports/sunbelt-football/prod/report.json", team: "ULM", aliases: ["UL Monroe", "Louisiana-Monroe"] }
    },

    espn: {
      teamId: "2433",
      broadcastFallback: []
    },

    // The Sun Belt publishes no availability reports that HD Intelligence
    // carries or that could be found on sunbeltsports.org (2026-10-29), so
    // none are shown.

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // One source only: On SI has no ULM site (404), there is no On3 team feed
    // (404), and no student paper feed was found.
    beatFeeds: [
      { name: "ULM Athletics", feed: "https://ulmwarhawks.com/rss?path=football", site: "https://ulmwarhawks.com/sports/football", logo: "https://ulmwarhawks.com/favicon.ico" }
    ]
  },

  series: [
    { match: /^louisiana( ragin' cajuns)?$/i, name: "Battle on the Bayou", kind: "rivalry" },
    { match: /^louisiana tech( bulldogs)?$/i, name: "I-20 Showdown", kind: "rivalry" }
  ],

  links: {
    roster: { url: "https://ulmwarhawks.com/sports/football/roster", label: "ulmwarhawks.com" }
  },

  // UL Monroe inside Suite: Maroon, Gold (ESPN's), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "ULM FOOTBALL",

    colors: {
      accent:         "#FDB913",
      accentText:     "#FDB913",
      accentOnLight:  "#840029",
      accentInk:      "#840029",
      accentSoft:     "#FED87D",
      accentTint:     "#FFF2D5",
      accentTintSoft: "#FFF9EC",
      focus:          "#FFFFFF",
      surface:        "#840029",
      surfaceDeep:    "#5F001E",
      surfaceAbyss:   "#370011",
      surfaceRaise:   "#901A3E"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for UL Monroe, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/ul-monroe/availability.json", history: "data/ul-monroe/availability-history.json", label: "SunBeltSports.org" },
    beatNews:     { file: "data/ul-monroe/news.json" },
    recruits:     { file: "data/ul-monroe/recruits.json", label: "ESPN recruiting" }
  }
};
