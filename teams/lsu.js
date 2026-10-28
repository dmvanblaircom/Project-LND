/* LSU - Phase 2, the SEC (David, 2026-10-28). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-28: ESPN team 99, its home field as
   ESPN's schedule spells it (Tiger Stadium (LA)), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "lsu",
    name:         "LSU",
    abbreviation: "LSU",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Chicago",

    venue: {
      name: "Tiger Stadium (LA)",
      lat:  30.4120,
      lon: -91.1838
    }
  },

  sources: {
    espn: {
      teamId: "99",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-LSU",
      namePattern:  /\blsu\b|louisiana st/i
    },

    // The SEC's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://www.secsports.com/fbreports",
      availabilityReportLabel: "SECsports.com",
      availabilityFeed: { provider: "hdintelligence", conference: "SEC", sport: "Football", team: "LSU" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-28. On3's team feeds carry league-wide
    // stories, so `paths` keeps only LSU's section.
    // Not used: lsusports.net's feed is every sport.
    beatFeeds: [
      { name: "And The Valley Shook", feed: "https://www.andthevalleyshook.com/rss/current.xml", site: "https://www.andthevalleyshook.com/" },
      { name: "LSU On SI", feed: "https://www.si.com/college/lsu/feed", site: "https://www.si.com/college/lsu", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "On3", feed: "https://www.on3.com/teams/lsu-tigers/feed/", site: "https://www.on3.com/teams/lsu-tigers/", paths: ["/teams/lsu-tigers/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" },
      { name: "The Reveille", feed: "https://www.lsureveille.com/category/sports/feed/", sportsSection: true, site: "https://www.lsureveille.com/category/sports/" }
    ]
  },

  series: [
    { match: /^arkansas( razorbacks)?$/i, name: "Golden Boot", kind: "trophy" },
    { match: /^ole miss( rebels)?$/i, name: "Magnolia Bowl", kind: "trophy" }
  ],

  links: {
    roster: { url: "https://lsusports.net/sports/fb/roster", label: "lsusports.net" }
  },

  // LSU inside Suite: Purple PMS 268, Gold PMS 123, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "LSU FOOTBALL",

    colors: {
      accent:         "#FDD023",
      accentText:     "#FDD023",
      accentOnLight:  "#461D7C",
      accentInk:      "#461D7C",
      accentSoft:     "#FEE586",
      accentTint:     "#FFF7D7",
      accentTintSoft: "#FFFBED",
      focus:          "#FFFFFF",
      surface:        "#461D7C",
      surfaceDeep:    "#321559",
      surfaceAbyss:   "#1D0C34",
      surfaceRaise:   "#583489"
    },

    // LSU's brand kit is private; Barlow is matched to its athletics
    // lettering.
    fonts: {
      ui:       "'Barlow','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Barlow','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for LSU, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/lsu/availability.json", history: "data/lsu/availability-history.json", label: "SECsports.com" },
    oddsHistory:  { file: "data/lsu/odds-history.json" },
    beatNews:     { file: "data/lsu/news.json" },
    recruits:     { file: "data/lsu/recruits.json", label: "ESPN recruiting" }
  }
};
