/* Texas - Phase 2, the SEC (David, 2026-10-28). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-28: ESPN team 251, its home field as
   ESPN's schedule spells it (DKR-Texas Memorial Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "texas",
    name:         "Texas",
    abbreviation: "TEX",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Chicago",

    venue: {
      name: "DKR-Texas Memorial Stadium",
      lat:  30.2837,
      lon: -97.7325
    }
  },

  sources: {
    espn: {
      teamId: "251",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-TEX",
      namePattern:  /(?<!north )(?<!west )(?<!east )\btexas\b(?! a&m| tech| st| southern| el paso| san antonio| christian|-)|longhorns/i
    },

    // The SEC's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://www.secsports.com/fbreports",
      availabilityReportLabel: "SECsports.com",
      availabilityFeed: { provider: "hdintelligence", conference: "SEC", sport: "Football", team: "Texas" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-28. On3's team feeds carry league-wide
    // stories, so `paths` keeps only Texas's section.
    beatFeeds: [
      { name: "Texas Athletics", feed: "https://texaslonghorns.com/rss?path=football", site: "https://texaslonghorns.com/sports/football", logo: "https://texaslonghorns.com/favicon.ico" },
      { name: "Burnt Orange Nation", feed: "https://www.burntorangenation.com/rss/current.xml", site: "https://www.burntorangenation.com/" },
      { name: "Texas On SI", feed: "https://www.si.com/college/texas/feed", site: "https://www.si.com/college/texas", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "On3", feed: "https://www.on3.com/teams/texas-longhorns/feed/", site: "https://www.on3.com/teams/texas-longhorns/", paths: ["/teams/texas-longhorns/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" },
      { name: "The Daily Texan", feed: "https://thedailytexan.com/category/sports/feed/", sportsSection: true, site: "https://thedailytexan.com/category/sports/" }
    ]
  },

  series: [
    { match: /^oklahoma( sooners)?$/i, name: "Red River Rivalry", kind: "rivalry" },
    { match: /^texas a&m( aggies)?$/i, name: "Lone Star Showdown", kind: "rivalry" }
  ],

  links: {
    roster: { url: "https://texaslonghorns.com/sports/football/roster", label: "texaslonghorns.com" }
  },

  // Texas inside Suite: Burnt Orange PMS 159 (brand.utexas.edu), white, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js). surface deepened 6% from #BF5700 to carry white text and to read as ink on the page.
  identity: {
    programLabel: "TEXAS FOOTBALL",

    colors: {
      accent:         "#FFFFFF",
      accentText:     "#FFFFFF",
      accentOnLight:  "#B45200",
      accentInk:      "#B45200",
      accentSoft:     "#FFFFFF",
      accentTint:     "#F2E0D1",
      accentTintSoft: "#F9F1EB",
      focus:          "#FFFFFF",
      surface:        "#B45200",
      surfaceDeep:    "#823B00",
      surfaceAbyss:   "#4C2200",
      surfaceRaise:   "#B7590A"
    },

    // Texas's Benton Sans is licensed; the university's own web replacement
    // is Libre Franklin: used as it is.
    fonts: {
      ui:       "'Libre Franklin','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Libre Franklin','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Texas, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/texas/availability.json", history: "data/texas/availability-history.json", label: "SECsports.com" },
    oddsHistory:  { file: "data/texas/odds-history.json" },
    beatNews:     { file: "data/texas/news.json" },
    recruits:     { file: "data/texas/recruits.json", label: "ESPN recruiting" }
  }
};
