/* Illinois - Phase 1, the rest of the Big Ten (David, 2026-10-27). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-27: ESPN team 356, its home field as
   ESPN's schedule spells it (Gies Memorial Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "illinois",
    name:         "Illinois",
    abbreviation: "ILL",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Chicago",

    venue: {
      name: "Gies Memorial Stadium",
      lat:  40.0992,
      lon: -88.2360
    }
  },

  sources: {
    espn: {
      teamId: "356",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-ILL",
      namePattern:  /\billinois\b(?! st)|fighting illini/i
    },

    // The Big Ten's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://bigten.org/sports/2026/9/10/FB_Availability_Reports.aspx",
      availabilityReportLabel: "BigTen.org",
      availabilityFeed: { provider: "hdintelligence", conference: "B10", sport: "Football", team: "Illinois" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-27. On3's team feeds carry league-wide
    // stories, so `paths` keeps only Illinois's section.
    // Not used: No On3 team feed (404); the Daily Illini publishes only a
    // whole-paper feed.
    beatFeeds: [
      { name: "Illinois Athletics", feed: "https://fightingillini.com/rss?path=football", site: "https://fightingillini.com/sports/football", logo: "https://fightingillini.com/favicon.ico" },
      { name: "The Champaign Room", feed: "https://www.thechampaignroom.com/rss/current.xml", site: "https://www.thechampaignroom.com/" },
      { name: "Illinois On SI", feed: "https://www.si.com/college/illinois/feed", site: "https://www.si.com/college/illinois", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" }
    ]
  },

  series: [
    { match: /^northwestern( wildcats)?$/i, name: "Land of Lincoln Trophy", kind: "trophy" },
    { match: /^purdue( boilermakers)?$/i, name: "Purdue Cannon", kind: "trophy" },
    { match: /^ohio state( buckeyes)?$/i, name: "Illibuck Trophy", kind: "trophy" }
  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its schedule, where each game's notes are posted.
    gameNotes: { url: "https://fightingillini.com/sports/football/schedule", label: "fightingillini.com", kind: "schedule" },
    roster: { url: "https://fightingillini.com/sports/football/roster", label: "fightingillini.com" }
  },

  // Illinois inside Suite: Illini Blue, Illini Orange (brand.illinois.edu), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "ILLINOIS FOOTBALL",

    colors: {
      accent:         "#E84A27",
      accentText:     "#E95130",
      accentOnLight:  "#13294B",
      accentInk:      "#111111",
      accentSoft:     "#F29B88",
      accentTint:     "#FBDED8",
      accentTintSoft: "#FDF1EE",
      focus:          "#FFFFFF",
      surface:        "#13294B",
      surfaceDeep:    "#0E1E36",
      surfaceAbyss:   "#081120",
      surfaceRaise:   "#2B3E5D"
    },

    // Illinois sets its brand in Montserrat (headlines) and Source Sans
    // (text), both free: used as they are.
    fonts: {
      ui:       "'Source Sans 3','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Montserrat','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Illinois, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/illinois/availability.json", history: "data/illinois/availability-history.json", label: "BigTen.org" },
    oddsHistory:  { file: "data/illinois/odds-history.json" },
    beatNews:     { file: "data/illinois/news.json" },
    recruits:     { file: "data/illinois/recruits.json", label: "ESPN recruiting" }
  }
};
