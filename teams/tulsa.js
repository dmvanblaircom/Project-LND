/* Tulsa - Phase 4a, the American, the Mountain West and the Pac-12 (David,
   2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 202, its home field as
   ESPN's schedule spells it (H. A. Chapman Stadium), and the beat feeds
   below (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "tulsa",
    name:         "Tulsa",
    abbreviation: "TLSA",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Chicago",

    venue: {
      name: "H. A. Chapman Stadium",
      lat:  36.1489,
      lon: -95.9440
    }
  },

  sources: {
    espn: {
      teamId: "202",
      broadcastFallback: []
    },

    // The American's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://theamerican.org/sports/football",
      availabilityReportLabel: "TheAmerican.org",
      availabilityFeed: { provider: "hdintelligence", conference: "American", sport: "Football", team: "Tulsa" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // One source only: there is no On3 team feed or On SI site (404), and no
    // student paper feed.
    beatFeeds: [
      { name: "Tulsa Athletics", feed: "https://tulsahurricane.com/rss?path=football", site: "https://tulsahurricane.com/sports/football", logo: "https://tulsahurricane.com/favicon.ico" },
      { name: "Inside Tulsa Sports", feed: "https://www.on3.com/sites/inside-tulsa-sports/feed/", site: "https://www.on3.com/sites/inside-tulsa-sports/", paths: ["/sites/inside-tulsa-sports/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" }
    ]
  },

  series: [

  ],

  links: {
    roster: { url: "https://tulsahurricane.com/sports/football/roster", label: "tulsahurricane.com" }
  },

  // Tulsa inside Suite: Royal Blue, Gold (ESPN's), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "TULSA FOOTBALL",

    colors: {
      accent:         "#D0B787",
      accentText:     "#D0B787",
      accentOnLight:  "#003595",
      accentInk:      "#003595",
      accentSoft:     "#E5D7BD",
      accentTint:     "#F7F2E9",
      accentTintSoft: "#FBF9F5",
      focus:          "#FFFFFF",
      surface:        "#003595",
      surfaceDeep:    "#00266B",
      surfaceAbyss:   "#00163F",
      surfaceRaise:   "#1A49A0"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Tulsa, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/tulsa/availability.json", history: "data/tulsa/availability-history.json", label: "TheAmerican.org" },
    beatNews:     { file: "data/tulsa/news.json" },
    recruits:     { file: "data/tulsa/recruits.json", label: "ESPN recruiting" }
  }
};
