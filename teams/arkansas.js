/* Arkansas - Phase 2, the SEC (David, 2026-10-28). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-28: ESPN team 8, its home field as
   ESPN's schedule spells it (Donald W. Reynolds Razorback Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "arkansas",
    name:         "Arkansas",
    abbreviation: "ARK",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Chicago",

    venue: {
      name: "Donald W. Reynolds Razorback Stadium",
      lat:  36.0681,
      lon: -94.1789
    }
  },

  sources: {
    espn: {
      teamId: "8",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-ARK",
      namePattern:  /\barkansas\b(?! st|-pine| pine)|razorbacks/i
    },

    // The SEC's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://www.secsports.com/fbreports",
      availabilityReportLabel: "SECsports.com",
      availabilityFeed: { provider: "hdintelligence", conference: "SEC", sport: "Football", team: "Arkansas" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-28.
    // Not used: Two sources only: Arkansas Fight (SB Nation) did not answer
    // GitHub's network, there is no On3 team feed (404), and the Arkansas
    // Traveler has no working feed.
    beatFeeds: [
      { name: "Arkansas Athletics", feed: "https://arkansasrazorbacks.com/rss?path=football", site: "https://arkansasrazorbacks.com/sport/m-footbl/", logo: "https://arkansasrazorbacks.com/favicon.ico" },
      { name: "Arkansas On SI", feed: "https://www.si.com/college/arkansas/feed", site: "https://www.si.com/college/arkansas", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" }
    ]
  },

  series: [
    { match: /^lsu( tigers)?$/i, name: "Golden Boot", kind: "trophy" },
    { match: /^missouri( tigers)?$/i, name: "Battle Line Trophy", kind: "trophy" }
  ],

  links: {
    roster: { url: "https://arkansasrazorbacks.com/sport/m-footbl/roster/", label: "arkansasrazorbacks.com" }
  },

  // Arkansas inside Suite: Cardinal PMS 201 (brand.uark.edu), white, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "ARKANSAS FOOTBALL",

    colors: {
      accent:         "#FFFFFF",
      accentText:     "#FFFFFF",
      accentOnLight:  "#9D2235",
      accentInk:      "#9D2235",
      accentSoft:     "#FFFFFF",
      accentTint:     "#EDD7DB",
      accentTintSoft: "#F7EDEF",
      focus:          "#FFFFFF",
      surface:        "#9D2235",
      surfaceDeep:    "#711826",
      surfaceAbyss:   "#420E16",
      surfaceRaise:   "#A73849"
    },

    // Arkansas sets the web in Lato, free: used as it is.
    fonts: {
      ui:       "'Lato','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Lato','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Arkansas, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/arkansas/availability.json", history: "data/arkansas/availability-history.json", label: "SECsports.com" },
    oddsHistory:  { file: "data/arkansas/odds-history.json" },
    beatNews:     { file: "data/arkansas/news.json" },
    recruits:     { file: "data/arkansas/recruits.json", label: "ESPN recruiting" }
  }
};
