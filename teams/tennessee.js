/* Tennessee - Phase 2, the SEC (David, 2026-10-28). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-28: ESPN team 2633, its home field as
   ESPN's schedule spells it (Neyland Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "tennessee",
    name:         "Tennessee",
    abbreviation: "TENN",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "Neyland Stadium",
      lat:  35.9550,
      lon: -83.9250
    }
  },

  sources: {
    espn: {
      teamId: "2633",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-TENN",
      namePattern:  /(?<!middle )(?<!east )\btennessee\b(?! st| tech)|volunteers/i
    },

    // The SEC's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://www.secsports.com/fbreports",
      availabilityReportLabel: "SECsports.com",
      availabilityFeed: { provider: "hdintelligence", conference: "SEC", sport: "Football", team: "Tennessee" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-28. On3's team feeds carry league-wide
    // stories, so `paths` keeps only Tennessee's section.
    beatFeeds: [
      { name: "Tennessee Athletics", feed: "https://utsports.com/rss?path=football", site: "https://utsports.com/sports/football", logo: "https://utsports.com/favicon.ico" },
      { name: "Rocky Top Talk", feed: "https://www.rockytoptalk.com/rss/current.xml", site: "https://www.rockytoptalk.com/" },
      { name: "Tennessee On SI", feed: "https://www.si.com/college/tennessee/feed", site: "https://www.si.com/college/tennessee", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "On3", feed: "https://www.on3.com/teams/tennessee-volunteers/feed/", site: "https://www.on3.com/teams/tennessee-volunteers/", paths: ["/teams/tennessee-volunteers/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" },
      { name: "The Daily Beacon", feed: "https://www.utdailybeacon.com/category/sports/feed/", sportsSection: true, site: "https://www.utdailybeacon.com/category/sports/" }
    ]
  },

  series: [
    { match: /^alabama( crimson tide)?$/i, name: "Third Saturday in October", kind: "rivalry" }
  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its schedule, where each game's notes are posted.
    gameNotes: { url: "https://utsports.com/sports/football/schedule", label: "utsports.com", kind: "schedule" },
    roster: { url: "https://utsports.com/sports/football/roster", label: "utsports.com" }
  },

  // Tennessee inside Suite: Smokey, Tennessee Orange PMS 151 (brand.utk.edu), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "TENNESSEE FOOTBALL",

    colors: {
      accent:         "#FF8200",
      accentText:     "#FF8200",
      accentOnLight:  "#4B4B4B",
      accentInk:      "#363636",
      accentSoft:     "#FFBA73",
      accentTint:     "#FFE8D1",
      accentTintSoft: "#FFF5EB",
      focus:          "#FFFFFF",
      surface:        "#4B4B4B",
      surfaceDeep:    "#363636",
      surfaceAbyss:   "#202020",
      surfaceRaise:   "#5D5D5D"
    },

    // Tennessee's primary face, Gotham, is licensed; the university names
    // Montserrat for its websites: used as it is.
    fonts: {
      ui:       "'Montserrat','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Montserrat','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Tennessee, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/tennessee/availability.json", history: "data/tennessee/availability-history.json", label: "SECsports.com" },
    oddsHistory:  { file: "data/tennessee/odds-history.json" },
    beatNews:     { file: "data/tennessee/news.json" },
    recruits:     { file: "data/tennessee/recruits.json", label: "ESPN recruiting" }
  }
};
