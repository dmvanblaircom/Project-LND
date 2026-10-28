/* Kentucky - Phase 2, the SEC (David, 2026-10-28). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-28: ESPN team 96, its home field as
   ESPN's schedule spells it (Kroger Field), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "kentucky",
    name:         "Kentucky",
    abbreviation: "UK",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "Kroger Field",
      lat:  38.0222,
      lon: -84.5053
    }
  },

  sources: {
    espn: {
      teamId: "96",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-UK",
      namePattern:  /(?<!western )(?<!eastern )\bkentucky\b/i
    },

    // The SEC's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://www.secsports.com/fbreports",
      availabilityReportLabel: "SECsports.com",
      availabilityFeed: { provider: "hdintelligence", conference: "SEC", sport: "Football", team: "Kentucky" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-28. On3's team feeds carry league-wide
    // stories, so `paths` keeps only Kentucky's section.
    beatFeeds: [
      { name: "Kentucky Athletics", feed: "https://ukathletics.com/rss?path=football", site: "https://ukathletics.com/sports/football", logo: "https://ukathletics.com/favicon.ico" },
      { name: "A Sea of Blue", feed: "https://www.aseaofblue.com/rss/current.xml", site: "https://www.aseaofblue.com/" },
      { name: "Kentucky On SI", feed: "https://www.si.com/college/kentucky/feed", site: "https://www.si.com/college/kentucky", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "On3", feed: "https://www.on3.com/teams/kentucky-wildcats/feed/", site: "https://www.on3.com/teams/kentucky-wildcats/", paths: ["/teams/kentucky-wildcats/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" },
      { name: "Kentucky Kernel", feed: "https://kykernel.com/category/sports/feed/", sportsSection: true, site: "https://kykernel.com/category/sports/" }
    ]
  },

  series: [
    { match: /^louisville( cardinals)?$/i, name: "Governor’s Cup", kind: "trophy" }
  ],

  links: {
    roster: { url: "https://ukathletics.com/sports/football/roster", label: "ukathletics.com" }
  },

  // Kentucky inside Suite: Wildcat Blue PMS 286 (Kentucky's brand), white, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "KENTUCKY FOOTBALL",

    colors: {
      accent:         "#FFFFFF",
      accentText:     "#FFFFFF",
      accentOnLight:  "#0033A0",
      accentInk:      "#0033A0",
      accentSoft:     "#FFFFFF",
      accentTint:     "#D1DAEE",
      accentTintSoft: "#EBEFF7",
      focus:          "#FFFFFF",
      surface:        "#0033A0",
      surfaceDeep:    "#002573",
      surfaceAbyss:   "#001543",
      surfaceRaise:   "#1A47AA"
    },

    // Kentucky's primary typeface since 2023, Usual, is licensed; Inter is
    // the closest free match.
    fonts: {
      ui:       "'Inter','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Inter','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Kentucky, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/kentucky/availability.json", history: "data/kentucky/availability-history.json", label: "SECsports.com" },
    oddsHistory:  { file: "data/kentucky/odds-history.json" },
    beatNews:     { file: "data/kentucky/news.json" },
    recruits:     { file: "data/kentucky/recruits.json", label: "ESPN recruiting" }
  }
};
