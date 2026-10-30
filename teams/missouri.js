/* Missouri - Phase 2, the SEC (David, 2026-10-28). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-28: ESPN team 142, its home field as
   ESPN's schedule spells it (Memorial Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "missouri",
    name:         "Missouri",
    abbreviation: "MIZ",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Chicago",

    venue: {
      name: "Memorial Stadium",
      lat:  38.9359,
      lon: -92.3332
    }
  },

  sources: {
    espn: {
      teamId: "142",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-MIZZ",
      namePattern:  /(?<!southeast )\bmissouri\b(?! st)|mizzou/i
    },

    // The SEC's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://www.secsports.com/fbreports",
      availabilityReportLabel: "SECsports.com",
      availabilityFeed: { provider: "hdintelligence", conference: "SEC", sport: "Football", team: "Missouri" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-28.
    // Not used: mutigers.com's feed is every sport; no On3 team feed (404).
    beatFeeds: [
      { name: "Rock M Nation", feed: "https://www.rockmnation.com/rss/current.xml", site: "https://www.rockmnation.com/" },
      { name: "Missouri On SI", feed: "https://www.si.com/college/missouri/feed", site: "https://www.si.com/college/missouri", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "The Maneater", feed: "https://themaneater.com/category/sports/feed/", sportsSection: true, site: "https://themaneater.com/category/sports/" }
    ]
  },

  series: [
    { match: /^arkansas( razorbacks)?$/i, name: "Battle Line Trophy", kind: "trophy" },
    { match: /^kansas( jayhawks)?$/i, name: "Border War", kind: "rivalry" }
  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its schedule, where each game's notes are posted.
    gameNotes: { url: "https://mutigers.com/sports/football/schedule", label: "mutigers.com", kind: "schedule" },
    roster: { url: "https://mutigers.com/sports/football/roster", label: "mutigers.com" }
  },

  // Missouri inside Suite: Tiger Paw Black, Mizzou Gold (brand.missouri.edu), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "MISSOURI FOOTBALL",

    colors: {
      accent:         "#FDB719",
      accentText:     "#FDB719",
      accentOnLight:  "#000000",
      accentInk:      "#000000",
      accentSoft:     "#FED780",
      accentTint:     "#FFF2D6",
      accentTintSoft: "#FFF9ED",
      focus:          "#FFFFFF",
      surface:        "#000000",
      surfaceDeep:    "#000000",
      surfaceAbyss:   "#000000",
      surfaceRaise:   "#1A1A1A"
    },

    // Mizzou's faces (Manuka, Rama Gothic) are licensed; Oswald matches
    // Manuka's condensed headlines and Source Sans 3 carries the text.
    fonts: {
      ui:       "'Source Sans 3','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Oswald','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Missouri, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/missouri/availability.json", history: "data/missouri/availability-history.json", label: "SECsports.com" },
    oddsHistory:  { file: "data/missouri/odds-history.json" },
    beatNews:     { file: "data/missouri/news.json" },
    recruits:     { file: "data/missouri/recruits.json", label: "ESPN recruiting" }
  }
};
