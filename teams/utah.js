/* Utah - Phase 3, the Big 12 and the ACC (David, 2026-10-28). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-28: ESPN team 254, its home field as
   ESPN's schedule spells it (Rice-Eccles Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "utah",
    name:         "Utah",
    abbreviation: "UTAH",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Denver",

    venue: {
      name: "Rice-Eccles Stadium",
      lat:  40.7600,
      lon: -111.8489
    }
  },

  sources: {
    espn: {
      teamId: "254",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-UTAH",
      namePattern:  /(?<!southern )\butah\b(?! st| tech)/i
    },

    // The Big 12's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://big12sports.com/sports/football",
      availabilityReportLabel: "Big12Sports.com",
      availabilityFeed: { provider: "hdintelligence", conference: "B12", sport: "Football", team: "Utah" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-28. On3's team feeds carry league-wide
    // stories, so `paths` keeps only Utah's section.
    // Not used: Block U (SB Nation) is gone; Utah On SI has published nothing
    // since May.
    beatFeeds: [
      { name: "Utah Athletics", feed: "https://utahutes.com/rss?path=football", site: "https://utahutes.com/sports/football", logo: "https://utahutes.com/favicon.ico" },
      { name: "On3", feed: "https://www.on3.com/teams/utah-utes/feed/", site: "https://www.on3.com/teams/utah-utes/", paths: ["/teams/utah-utes/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" },
      { name: "Deseret News", feed: "https://www.deseret.com/arc/outboundfeeds/rss/category/sports/utah-utes/?outputType=xml", site: "https://www.deseret.com/sports/utah-utes/" },
      { name: "The Daily Utah Chronicle", feed: "https://dailyutahchronicle.com/category/sports/football/feed/", site: "https://dailyutahchronicle.com/category/sports/football/" }
    ]
  },

  series: [
    { match: /^byu( cougars)?$/i, name: "Holy War", kind: "rivalry" },
    { match: /^utah state( aggies)?$/i, name: "Battle of the Brothers", kind: "rivalry" }
  ],

  links: {
    roster: { url: "https://utahutes.com/sports/football/roster", label: "utahutes.com" }
  },

  // Utah inside Suite: Utah Red (brand.utah.edu), white, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "UTAH FOOTBALL",

    colors: {
      accent:         "#FFFFFF",
      accentText:     "#FFFFFF",
      accentOnLight:  "#BE0000",
      accentInk:      "#BE0000",
      accentSoft:     "#FFFFFF",
      accentTint:     "#F3D1D1",
      accentTintSoft: "#FAEBEB",
      focus:          "#FFFFFF",
      surface:        "#BE0000",
      surfaceDeep:    "#890000",
      surfaceAbyss:   "#500000",
      surfaceRaise:   "#C41A1A"
    },

    // Utah's brand pages show its colours but not its typefaces; Inter stands
    // in. Please confirm.
    fonts: {
      ui:       "'Inter','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Inter','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Utah, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/utah/availability.json", history: "data/utah/availability-history.json", label: "Big12Sports.com" },
    oddsHistory:  { file: "data/utah/odds-history.json" },
    beatNews:     { file: "data/utah/news.json" },
    recruits:     { file: "data/utah/recruits.json", label: "ESPN recruiting" }
  }
};
