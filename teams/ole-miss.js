/* Ole Miss - Phase 2, the SEC (David, 2026-10-28). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-28: ESPN team 145, its home field as
   ESPN's schedule spells it (Vaught-Hemingway Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "ole-miss",
    name:         "Ole Miss",
    abbreviation: "MISS",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Chicago",

    venue: {
      name: "Vaught-Hemingway Stadium",
      lat:  34.3619,
      lon: -89.5342
    }
  },

  sources: {
    espn: {
      teamId: "145",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-MISS",
      namePattern:  /ole miss|^mississippi$/i
    },

    // The SEC's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://www.secsports.com/fbreports",
      availabilityReportLabel: "SECsports.com",
      availabilityFeed: { provider: "hdintelligence", conference: "SEC", sport: "Football", team: "Ole Miss" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-28. On3's team feeds carry league-wide
    // stories, so `paths` keeps only Ole Miss's section.
    beatFeeds: [
      { name: "Ole Miss Athletics", feed: "https://olemisssports.com/rss?path=football", site: "https://olemisssports.com/sports/football", logo: "https://olemisssports.com/favicon.ico" },
      { name: "Red Cup Rebellion", feed: "https://www.redcuprebellion.com/rss/current.xml", site: "https://www.redcuprebellion.com/" },
      { name: "Ole Miss On SI", feed: "https://www.si.com/college/olemiss/feed", site: "https://www.si.com/college/olemiss", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "On3", feed: "https://www.on3.com/teams/ole-miss-rebels/feed/", site: "https://www.on3.com/teams/ole-miss-rebels/", paths: ["/teams/ole-miss-rebels/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" },
      { name: "The Daily Mississippian", feed: "https://thedmonline.com/category/sports/feed/", site: "https://thedmonline.com/category/sports/" }
    ]
  },

  series: [
    { match: /^mississippi state( bulldogs)?$/i, name: "Egg Bowl", kind: "trophy" },
    { match: /^lsu( tigers)?$/i, name: "Magnolia Bowl", kind: "trophy" }
  ],

  links: {
    roster: { url: "https://olemisssports.com/sports/football/roster", label: "olemisssports.com" }
  },

  // Ole Miss inside Suite: Oxford Blue PMS 2767, Red PMS 186 (brand.olemiss.edu), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "OLE MISS FOOTBALL",

    colors: {
      accent:         "#CF142B",
      accentText:     "#DB5162",
      accentOnLight:  "#CF142B",
      accentInk:      "#FFFFFF",
      accentSoft:     "#E57E8A",
      accentTint:     "#F6D5D9",
      accentTintSoft: "#FBECEE",
      focus:          "#FFFFFF",
      surface:        "#142142",
      surfaceDeep:    "#0E1830",
      surfaceAbyss:   "#080E1C",
      surfaceRaise:   "#2C3755"
    },

    // Ole Miss sets its text in IBM Plex Sans, free (its Termina headlines
    // are licensed): used as it is.
    fonts: {
      ui:       "'IBM Plex Sans','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'IBM Plex Sans','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Ole Miss, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/ole-miss/availability.json", history: "data/ole-miss/availability-history.json", label: "SECsports.com" },
    oddsHistory:  { file: "data/ole-miss/odds-history.json" },
    beatNews:     { file: "data/ole-miss/news.json" },
    recruits:     { file: "data/ole-miss/recruits.json", label: "ESPN recruiting" }
  }
};
