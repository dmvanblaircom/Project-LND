/* Northwestern - Phase 1, the rest of the Big Ten (David, 2026-10-27). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-27: ESPN team 77, its home field as
   ESPN's schedule spells it (Ryan Field), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "northwestern",
    name:         "Northwestern",
    abbreviation: "NU",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Chicago",

    venue: {
      name: "Ryan Field",
      lat:  42.0656,
      lon: -87.6923
    }
  },

  sources: {
    espn: {
      teamId: "77",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-NW",
      namePattern:  /northwestern/i
    },

    // The Big Ten's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://bigten.org/sports/2026/9/10/FB_Availability_Reports.aspx",
      availabilityReportLabel: "BigTen.org",
      availabilityFeed: { provider: "hdintelligence", conference: "B10", sport: "Football", team: "Northwestern" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-27. On3's team feeds carry league-wide
    // stories, so `paths` keeps only Northwestern's section.
    // Not used: No On3 team feed (404).
    beatFeeds: [
      { name: "Northwestern Athletics", feed: "https://nusports.com/rss?path=football", site: "https://nusports.com/sports/football", logo: "https://nusports.com/favicon.ico" },
      { name: "Inside NU", feed: "https://www.insidenu.com/rss/current.xml", site: "https://www.insidenu.com/" },
      { name: "Northwestern On SI", feed: "https://www.si.com/college/northwestern/feed", site: "https://www.si.com/college/northwestern", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "The Daily Northwestern", feed: "https://dailynorthwestern.com/category/sports/feed/", site: "https://dailynorthwestern.com/category/sports/" }
    ]
  },

  series: [
    { match: /^illinois( fighting illini)?$/i, name: "Land of Lincoln Trophy", kind: "trophy" }
  ],

  links: {
    roster: { url: "https://nusports.com/sports/football/roster", label: "nusports.com" }
  },

  // Northwestern inside Suite: Northwestern Purple (northwestern.edu/brand), white, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "NORTHWESTERN FOOTBALL",

    colors: {
      accent:         "#FFFFFF",
      accentText:     "#FFFFFF",
      accentOnLight:  "#4E2A84",
      accentInk:      "#4E2A84",
      accentSoft:     "#FFFFFF",
      accentTint:     "#DFD9E9",
      accentTintSoft: "#F1EEF5",
      focus:          "#FFFFFF",
      surface:        "#4E2A84",
      surfaceDeep:    "#381E5F",
      surfaceAbyss:   "#211237",
      surfaceRaise:   "#603F90"
    },

    // Northwestern's own faces are licensed; its brand names Poppins and IBM
    // Plex Sans as their free substitutes: used as they are.
    fonts: {
      ui:       "'IBM Plex Sans','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Poppins','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Northwestern, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/northwestern/availability.json", history: "data/northwestern/availability-history.json", label: "BigTen.org" },
    oddsHistory:  { file: "data/northwestern/odds-history.json" },
    beatNews:     { file: "data/northwestern/news.json" },
    recruits:     { file: "data/northwestern/recruits.json", label: "ESPN recruiting" }
  }
};
