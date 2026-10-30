/* TCU - Phase 3, the Big 12 and the ACC (David, 2026-10-28). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-28: ESPN team 2628, its home field as
   ESPN's schedule spells it (Amon G. Carter Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "tcu",
    name:         "TCU",
    abbreviation: "TCU",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Chicago",

    venue: {
      name: "Amon G. Carter Stadium",
      lat:  32.7097,
      lon: -97.3681
    }
  },

  sources: {
    espn: {
      teamId: "2628",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-TCU",
      namePattern:  /\btcu\b|texas christian/i
    },

    // The Big 12's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://big12sports.com/sports/football",
      availabilityReportLabel: "Big12Sports.com",
      availabilityFeed: { provider: "hdintelligence", conference: "B12", sport: "Football", team: "TCU" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-28. On3's team feeds carry league-wide
    // stories, so `paths` keeps only TCU's section.
    beatFeeds: [
      { name: "TCU Athletics", feed: "https://gofrogs.com/rss?path=football", site: "https://gofrogs.com/sports/football", logo: "https://gofrogs.com/favicon.ico" },
      { name: "Frogs O' War", feed: "https://www.frogsowar.com/rss/current.xml", site: "https://www.frogsowar.com/" },
      { name: "TCU On SI", feed: "https://www.si.com/college/tcu/feed", site: "https://www.si.com/college/tcu", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "On3", feed: "https://www.on3.com/teams/tcu-horned-frogs/feed/", site: "https://www.on3.com/teams/tcu-horned-frogs/", paths: ["/teams/tcu-horned-frogs/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" },
      { name: "TCU 360", feed: "https://www.tcu360.com/category/sports/feed/", site: "https://www.tcu360.com/category/sports/", sportsSection: true }
    ]
  },

  series: [
    { match: /^smu( mustangs)?$/i, name: "Iron Skillet", kind: "trophy" },
    { match: /^baylor( bears)?$/i, name: "Revivalry", kind: "rivalry" }
  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its schedule, where each game's notes are posted.
    gameNotes: { url: "https://gofrogs.com/sports/football/schedule", label: "gofrogs.com", kind: "schedule" },
    roster: { url: "https://gofrogs.com/sports/football/roster", label: "gofrogs.com" }
  },

  // TCU inside Suite: TCU Purple (ESPN's), white, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "TCU FOOTBALL",

    colors: {
      accent:         "#FFFFFF",
      accentText:     "#FFFFFF",
      accentOnLight:  "#4D1979",
      accentInk:      "#4D1979",
      accentSoft:     "#FFFFFF",
      accentTint:     "#DFD6E7",
      accentTintSoft: "#F1EDF4",
      focus:          "#FFFFFF",
      surface:        "#4D1979",
      surfaceDeep:    "#371257",
      surfaceAbyss:   "#200B33",
      surfaceRaise:   "#5F3086"
    },

    // TCU's brand pages did not answer; Montserrat stands in. Please confirm.
    fonts: {
      ui:       "'Montserrat','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Montserrat','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for TCU, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/tcu/availability.json", history: "data/tcu/availability-history.json", label: "Big12Sports.com" },
    oddsHistory:  { file: "data/tcu/odds-history.json" },
    beatNews:     { file: "data/tcu/news.json" },
    recruits:     { file: "data/tcu/recruits.json", label: "ESPN recruiting" }
  }
};
