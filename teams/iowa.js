/* Iowa - Phase 1, the rest of the Big Ten (David, 2026-10-27). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-27: ESPN team 2294, its home field as
   ESPN's schedule spells it (Kinnick Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "iowa",
    name:         "Iowa",
    abbreviation: "IOWA",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Chicago",

    venue: {
      name: "Kinnick Stadium",
      lat:  41.6587,
      lon: -91.5511
    }
  },

  sources: {
    espn: {
      teamId: "2294",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-IOWA",
      namePattern:  /\biowa\b(?! st)|hawkeyes/i
    },

    // The Big Ten's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://bigten.org/sports/2026/9/10/FB_Availability_Reports.aspx",
      availabilityReportLabel: "BigTen.org",
      availabilityFeed: { provider: "hdintelligence", conference: "B10", sport: "Football", team: "Iowa" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-27. On3's team feeds carry league-wide
    // stories, so `paths` keeps only Iowa's section.
    beatFeeds: [
      { name: "Iowa Athletics", feed: "https://hawkeyesports.com/rss?path=football", site: "https://hawkeyesports.com/sports/football", logo: "https://hawkeyesports.com/favicon.ico" },
      { name: "Black Heart Gold Pants", feed: "https://www.blackheartgoldpants.com/rss/current.xml", site: "https://www.blackheartgoldpants.com/" },
      { name: "Iowa On SI", feed: "https://www.si.com/college/iowa/feed", site: "https://www.si.com/college/iowa", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "On3", feed: "https://www.on3.com/teams/iowa-hawkeyes/feed/", site: "https://www.on3.com/teams/iowa-hawkeyes/", paths: ["/teams/iowa-hawkeyes/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" },
      { name: "The Daily Iowan", feed: "https://dailyiowan.com/category/sports/feed/", sportsSection: true, site: "https://dailyiowan.com/category/sports/" }
    ]
  },

  series: [
    { match: /^minnesota( golden gophers)?$/i, name: "Floyd of Rosedale", kind: "trophy" },
    { match: /^wisconsin( badgers)?$/i, name: "Heartland Trophy", kind: "trophy" },
    { match: /^nebraska( cornhuskers)?$/i, name: "Heroes Trophy", kind: "trophy" },
    { match: /^iowa state( cyclones)?$/i, name: "Cy-Hawk Trophy", kind: "trophy" }
  ],

  links: {
    roster: { url: "https://hawkeyesports.com/sports/football/roster", label: "hawkeyesports.com" }
  },

  // Iowa inside Suite: Black, Iowa Gold PMS 116 (brand.uiowa.edu), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "IOWA FOOTBALL",

    colors: {
      accent:         "#FFCD00",
      accentText:     "#FFCD00",
      accentOnLight:  "#000000",
      accentInk:      "#000000",
      accentSoft:     "#FFE473",
      accentTint:     "#FFF6D1",
      accentTintSoft: "#FFFBEB",
      focus:          "#FFFFFF",
      surface:        "#000000",
      surfaceDeep:    "#000000",
      surfaceAbyss:   "#000000",
      surfaceRaise:   "#1A1A1A"
    },

    // Iowa's brand faces are Antonio (display) and Roboto (workhorse), both
    // free: used as they are.
    fonts: {
      ui:       "'Roboto','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Antonio','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Iowa, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/iowa/availability.json", history: "data/iowa/availability-history.json", label: "BigTen.org" },
    oddsHistory:  { file: "data/iowa/odds-history.json" },
    beatNews:     { file: "data/iowa/news.json" },
    recruits:     { file: "data/iowa/recruits.json", label: "ESPN recruiting" }
  }
};
