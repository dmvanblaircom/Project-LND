/* Alabama - Phase 2, the SEC (David, 2026-10-28). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-28: ESPN team 333, its home field as
   ESPN's schedule spells it (Bryant-Denny Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "alabama",
    name:         "Alabama",
    abbreviation: "ALA",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Chicago",

    venue: {
      name: "Bryant-Denny Stadium",
      lat:  33.2083,
      lon: -87.5504
    }
  },

  sources: {
    espn: {
      teamId: "333",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-ALA",
      namePattern:  /\balabama\b(?! a&m| st)|crimson tide/i
    },

    // The SEC's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://www.secsports.com/fbreports",
      availabilityReportLabel: "SECsports.com",
      availabilityFeed: { provider: "hdintelligence", conference: "SEC", sport: "Football", team: "Alabama" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-28. On3's team feeds carry league-wide
    // stories, so `paths` keeps only Alabama's section.
    beatFeeds: [
      { name: "Alabama Athletics", feed: "https://rolltide.com/rss?path=football", site: "https://rolltide.com/sports/football", logo: "https://rolltide.com/favicon.ico" },
      { name: "Roll Bama Roll", feed: "https://www.rollbamaroll.com/rss/current.xml", site: "https://www.rollbamaroll.com/" },
      { name: "Alabama On SI", feed: "https://www.si.com/college/alabama/feed", site: "https://www.si.com/college/alabama", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "On3", feed: "https://www.on3.com/teams/alabama-crimson-tide/feed/", site: "https://www.on3.com/teams/alabama-crimson-tide/", paths: ["/teams/alabama-crimson-tide/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" },
      { name: "The Crimson White", feed: "https://cw.ua.edu/category/sports/feed/", site: "https://cw.ua.edu/category/sports/" }
    ]
  },

  series: [
    { match: /^auburn( tigers)?$/i, name: "Iron Bowl", kind: "rivalry" },
    { match: /^tennessee( volunteers)?$/i, name: "Third Saturday in October", kind: "rivalry" }
  ],

  links: {
    roster: { url: "https://rolltide.com/sports/football/roster", label: "rolltide.com" }
  },

  // Alabama inside Suite: Crimson PMS 201 (brand.ua.edu), white, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "ALABAMA FOOTBALL",

    colors: {
      accent:         "#FFFFFF",
      accentText:     "#FFFFFF",
      accentOnLight:  "#9E1B32",
      accentInk:      "#9E1B32",
      accentSoft:     "#FFFFFF",
      accentTint:     "#EED6DA",
      accentTintSoft: "#F7EDEF",
      focus:          "#FFFFFF",
      surface:        "#9E1B32",
      surfaceDeep:    "#721324",
      surfaceAbyss:   "#420B15",
      surfaceRaise:   "#A83246"
    },

    // Alabama's typefaces, Minion Pro and Trade Gothic, are licensed; Libre
    // Franklin is the closest free match to Trade Gothic.
    fonts: {
      ui:       "'Libre Franklin','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Libre Franklin','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Alabama, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/alabama/availability.json", history: "data/alabama/availability-history.json", label: "SECsports.com" },
    oddsHistory:  { file: "data/alabama/odds-history.json" },
    beatNews:     { file: "data/alabama/news.json" },
    recruits:     { file: "data/alabama/recruits.json", label: "ESPN recruiting" }
  }
};
