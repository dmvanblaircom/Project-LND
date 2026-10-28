/* Oklahoma - Phase 2, the SEC (David, 2026-10-28). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-28: ESPN team 201, its home field as
   ESPN's schedule spells it (Memorial Stadium (Norman, OK)), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "oklahoma",
    name:         "Oklahoma",
    abbreviation: "OU",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Chicago",

    venue: {
      name: "Memorial Stadium (Norman, OK)",
      lat:  35.2059,
      lon: -97.4423
    }
  },

  sources: {
    espn: {
      teamId: "201",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-OKLA",
      namePattern:  /\boklahoma\b(?! st)|sooners/i
    },

    // The SEC's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://www.secsports.com/fbreports",
      availabilityReportLabel: "SECsports.com",
      availabilityFeed: { provider: "hdintelligence", conference: "SEC", sport: "Football", team: "Oklahoma" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-28. On3's team feeds carry league-wide
    // stories, so `paths` keeps only Oklahoma's section.
    // Not used: Crimson and Cream Machine (SB Nation) did not answer GitHub's
    // network; the OU Daily turned it away (429).
    beatFeeds: [
      { name: "Oklahoma Athletics", feed: "https://soonersports.com/rss?path=football", site: "https://soonersports.com/sports/football", logo: "https://soonersports.com/favicon.ico" },
      { name: "Oklahoma On SI", feed: "https://www.si.com/college/oklahoma/feed", site: "https://www.si.com/college/oklahoma", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "On3", feed: "https://www.on3.com/teams/oklahoma-sooners/feed/", site: "https://www.on3.com/teams/oklahoma-sooners/", paths: ["/teams/oklahoma-sooners/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" }
    ]
  },

  series: [
    { match: /^texas( longhorns)?$/i, name: "Red River Rivalry", kind: "rivalry" }
  ],

  links: {
    roster: { url: "https://soonersports.com/sports/football/roster", label: "soonersports.com" }
  },

  // Oklahoma inside Suite: Oklahoma Crimson (ou.edu design system), white, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "OKLAHOMA FOOTBALL",

    colors: {
      accent:         "#FFFFFF",
      accentText:     "#FFFFFF",
      accentOnLight:  "#841617",
      accentInk:      "#841617",
      accentSoft:     "#FFFFFF",
      accentTint:     "#E9D5D5",
      accentTintSoft: "#F5ECEC",
      focus:          "#FFFFFF",
      surface:        "#841617",
      surfaceDeep:    "#5F1011",
      surfaceAbyss:   "#37090A",
      surfaceRaise:   "#902D2E"
    },

    // Oklahoma's typefaces are not published for outside use; Libre Franklin
    // is matched to its athletics text.
    fonts: {
      ui:       "'Libre Franklin','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Libre Franklin','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Oklahoma, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/oklahoma/availability.json", history: "data/oklahoma/availability-history.json", label: "SECsports.com" },
    oddsHistory:  { file: "data/oklahoma/odds-history.json" },
    beatNews:     { file: "data/oklahoma/news.json" },
    recruits:     { file: "data/oklahoma/recruits.json", label: "ESPN recruiting" }
  }
};
