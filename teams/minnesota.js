/* Minnesota - added with Indiana, North Dakota State and BYU (David,
   2026-10-27). Same shape as teams/ohio-state.js; nothing else changed.

   Values verified on 2026-10-27 from GitHub's network (probe-sources.yml):
   ESPN team 135 spells the home field "Huntington Bank Stadium". Kalshi
   lists no Minnesota market today; the declaration below picks one up the
   day it is listed. */

var TEAM_CONFIG = {

  team: {
    id:           "minnesota",
    name:         "Minnesota",
    abbreviation: "MINN",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Chicago",

    venue: {
      name: "Huntington Bank Stadium",
      lat:  44.9765,
      lon: -93.2246
    }
  },

  sources: {
    espn: {
      teamId: "135",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-MINN",
      namePattern:  /minnesota|golden gophers/i
    },

    // The Big Ten's availability reports, as for Ohio State
    // (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://bigten.org/sports/2026/9/10/FB_Availability_Reports.aspx",
      availabilityReportLabel: "BigTen.org",
      availabilityFeed: { provider: "hdintelligence", conference: "B10", sport: "Football", team: "Minnesota" }
    },

    // Beat writers, read by the Action server-side. Each was confirmed from
    // GitHub's network on 2026-10-27 (probe-feeds.yml) and approved by David
    // (2026-10-27). Minnesota On SI was left out (its newest story was from
    // July, and not football); On3 has no Minnesota feed (404).
    beatFeeds: [
      { name: "Minnesota Athletics", feed: "https://gophersports.com/rss?path=football",            site: "https://gophersports.com/sports/football", logo: "https://gophersports.com/favicon.ico" },
      { name: "The Daily Gopher",    feed: "https://www.thedailygopher.com/rss/current.xml",       site: "https://www.thedailygopher.com/" },
      { name: "Minnesota Daily",     feed: "https://mndaily.com/category/sports/football/feed/",   site: "https://mndaily.com/category/sports/football/" }
    ]
  },

  // Played for: five trophies in the Big Ten.
  series: [
    { match: /^michigan( wolverines)?$/i,        name: "Little Brown Jug",                kind: "trophy" },
    { match: /^iowa( hawkeyes)?$/i,              name: "Floyd of Rosedale",               kind: "trophy" },
    { match: /^wisconsin( badgers)?$/i,          name: "Paul Bunyan’s Axe",          kind: "trophy" },
    { match: /^penn state( nittany lions)?$/i,   name: "Governor’s Victory Bell",     kind: "trophy" },
    { match: /^nebraska( cornhuskers)?$/i,       name: "$5 Bits of Broken Chair Trophy",  kind: "trophy" }
  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its notes page, which carries this season's notes
    // (checked from GitHub's network that day).
    gameNotes: { url: "https://gophersports.com/sports/2018/5/21/sports-m-footbl-spec-rel-game-notes-html", label: "gophersports.com", kind: "index" },
    roster: { url: "https://gophersports.com/sports/football/roster", label: "gophersports.com" }
  },

  // Minnesota inside Suite, from the University's brand (umarcomm.umn.edu):
  // maroon #7A0019 and gold #FFCC33, with its own dark and light maroons.
  identity: {
    programLabel: "MINNESOTA FOOTBALL",

    colors: {
      accent:         "#FFCC33",   // UMN gold, 7.57:1 on maroon
      accentText:     "#FFCC33",
      accentOnLight:  "#7A0019",   // maroon as text on ivory/white: 10.15:1 / 11.40:1
      accentInk:      "#5B0013",   // UMN dark maroon on a gold fill, 9.58:1
      accentSoft:     "#FFDE7A",   // UMN light gold, 8.68:1 on maroon
      accentTint:     "#FFEFC2",
      accentTintSoft: "#FFF8E0",
      focus:          "#FFDE7A",

      surface:        "#7A0019",   // UMN maroon; white on it 11.40:1
      surfaceDeep:    "#5B0013",   // UMN dark maroon
      surfaceAbyss:   "#3D000D",
      surfaceRaise:   "#900021"    // UMN light maroon
    },

    // UMN's display face is Neutraface, which needs a license from its
    // foundry; its body face is Open Sans, which is free. Josefin Sans is the
    // closest public face to Neutraface, a geometric sans with the same
    // period feel, for headings; Open Sans for text. Both self-hosted under
    // the OFL. Approved by David, 2026-10-27.
    fonts: {
      ui:       "'Open Sans','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Josefin Sans','Instrument Display',sans-serif"
    }
  },

  snapshots: {
    availability: { file: "data/minnesota/availability.json", history: "data/minnesota/availability-history.json", label: "BigTen.org" },
    oddsHistory:  { file: "data/minnesota/odds-history.json" },
    beatNews:     { file: "data/minnesota/news.json" },
    recruits:     { file: "data/minnesota/recruits.json", label: "ESPN recruiting" }
  }
};
