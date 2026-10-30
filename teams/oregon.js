/* Oregon - Phase 1, the rest of the Big Ten (David, 2026-10-27). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-27: ESPN team 2483, its home field as
   ESPN's schedule spells it (Autzen Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "oregon",
    name:         "Oregon",
    abbreviation: "ORE",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Los_Angeles",

    venue: {
      name: "Autzen Stadium",
      lat:  44.0583,
      lon: -123.0685
    }
  },

  sources: {
    espn: {
      teamId: "2483",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-ORE",
      namePattern:  /\boregon\b(?! st)|ducks/i
    },

    // The Big Ten's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://bigten.org/sports/2026/9/10/FB_Availability_Reports.aspx",
      availabilityReportLabel: "BigTen.org",
      availabilityFeed: { provider: "hdintelligence", conference: "B10", sport: "Football", team: "Oregon" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-27. On3's team feeds carry league-wide
    // stories, so `paths` keeps only Oregon's section.
    // Not used: The Daily Emerald's feed is not its sports section (spam in
    // the whole-site feed).
    beatFeeds: [
      { name: "Oregon Athletics", feed: "https://goducks.com/rss?path=football", site: "https://goducks.com/sports/football", logo: "https://goducks.com/favicon.ico" },
      { name: "Addicted to Quack", feed: "https://www.addictedtoquack.com/rss/current.xml", site: "https://www.addictedtoquack.com/" },
      { name: "Oregon On SI", feed: "https://www.si.com/college/oregon/feed", site: "https://www.si.com/college/oregon", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "On3", feed: "https://www.on3.com/teams/oregon-ducks/feed/", site: "https://www.on3.com/teams/oregon-ducks/", paths: ["/teams/oregon-ducks/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" }
    ]
  },

  series: [
    { match: /^oregon state( beavers)?$/i, name: "Platypus Trophy", kind: "trophy" }
  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its schedule, where each game's notes are posted.
    gameNotes: { url: "https://goducks.com/sports/football/schedule", label: "goducks.com", kind: "schedule" },
    roster: { url: "https://goducks.com/sports/football/roster", label: "goducks.com" }
  },

  // Oregon inside Suite: UO Green PMS 356, UO Yellow PMS 107, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "OREGON FOOTBALL",

    colors: {
      accent:         "#FEE11A",
      accentText:     "#FEE11A",
      accentOnLight:  "#007030",
      accentInk:      "#007030",
      accentSoft:     "#FEEE81",
      accentTint:     "#FFFAD6",
      accentTintSoft: "#FFFDED",
      focus:          "#FFFFFF",
      surface:        "#007030",
      surfaceDeep:    "#005123",
      surfaceAbyss:   "#002F14",
      surfaceRaise:   "#1A7E45"
    },

    // Oregon's headline face, Agitat, is its own; Oregon's brand names Source
    // Sans as its substitute: used as it is.
    fonts: {
      ui:       "'Source Sans 3','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Source Sans 3','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Oregon, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/oregon/availability.json", history: "data/oregon/availability-history.json", label: "BigTen.org" },
    oddsHistory:  { file: "data/oregon/odds-history.json" },
    beatNews:     { file: "data/oregon/news.json" },
    recruits:     { file: "data/oregon/recruits.json", label: "ESPN recruiting" }
  }
};
