/* Maryland - Phase 1, the rest of the Big Ten (David, 2026-10-27). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-27: ESPN team 120, its home field as
   ESPN's schedule spells it (SECU Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "maryland",
    name:         "Maryland",
    abbreviation: "MD",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "SECU Stadium",
      lat:  38.9903,
      lon: -76.9474
    }
  },

  sources: {
    espn: {
      teamId: "120",
      broadcastFallback: []
    },

    // The Big Ten's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://bigten.org/sports/2026/9/10/FB_Availability_Reports.aspx",
      availabilityReportLabel: "BigTen.org",
      availabilityFeed: { provider: "hdintelligence", conference: "B10", sport: "Football", team: "Maryland" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-27. On3's team feeds carry league-wide
    // stories, so `paths` keeps only Maryland's section.
    beatFeeds: [
      { name: "Maryland Athletics", feed: "https://umterps.com/rss?path=football", site: "https://umterps.com/sports/football", logo: "https://umterps.com/favicon.ico" },
      { name: "Testudo Times", feed: "https://www.testudotimes.com/rss/current.xml", site: "https://www.testudotimes.com/" },
      { name: "Maryland On SI", feed: "https://www.si.com/college/maryland/feed", site: "https://www.si.com/college/maryland", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "On3", feed: "https://www.on3.com/teams/maryland-terrapins/feed/", site: "https://www.on3.com/teams/maryland-terrapins/", paths: ["/teams/maryland-terrapins/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" },
      { name: "The Diamondback", feed: "https://dbknews.com/category/sports/football/feed/", site: "https://dbknews.com/category/sports/" }
    ]
  },

  series: [

  ],

  links: {
    roster: { url: "https://umterps.com/sports/football/roster", label: "umterps.com" }
  },

  // Maryland inside Suite: Maryland Red, Maryland Gold (brand.umd.edu), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js). surface deepened 4% from #E21833 to carry white text and to read as ink on the page.
  identity: {
    programLabel: "MARYLAND FOOTBALL",

    colors: {
      accent:         "#FFD200",
      accentText:     "#FFD200",
      accentOnLight:  "#D91731",
      accentInk:      "#9C1123",
      accentSoft:     "#FFE673",
      accentTint:     "#FFF7D1",
      accentTintSoft: "#FFFBEB",
      focus:          "#FFFFFF",
      surface:        "#D91731",
      surfaceDeep:    "#9C1123",
      surfaceAbyss:   "#5B0A15",
      surfaceRaise:   "#DD2E46"
    },

    // Maryland sets its marketing in Interstate, which is licensed; Overpass,
    // from the same highway-sign lineage, is the closest free face.
    fonts: {
      ui:       "'Overpass','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Overpass','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Maryland, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/maryland/availability.json", history: "data/maryland/availability-history.json", label: "BigTen.org" },
    beatNews:     { file: "data/maryland/news.json" },
    recruits:     { file: "data/maryland/recruits.json", label: "ESPN recruiting" }
  }
};
