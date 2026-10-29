/* Houston - Phase 3, the Big 12 and the ACC (David, 2026-10-28). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-28: ESPN team 248, its home field as
   ESPN's schedule spells it (TDECU Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "houston",
    name:         "Houston",
    abbreviation: "HOU",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Chicago",

    venue: {
      name: "TDECU Stadium",
      lat:  29.7222,
      lon: -95.3490
    }
  },

  sources: {
    espn: {
      teamId: "248",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-HOU",
      namePattern:  /\bhouston\b(?! christian| baptist)/i
    },

    // The Big 12's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://big12sports.com/sports/football",
      availabilityReportLabel: "Big12Sports.com",
      availabilityFeed: { provider: "hdintelligence", conference: "B12", sport: "Football", team: "Houston" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-28. On3's team feeds carry league-wide
    // stories, so `paths` keeps only Houston's section.
    beatFeeds: [
      { name: "Houston Athletics", feed: "https://uhcougars.com/rss?path=football", site: "https://uhcougars.com/sports/football", logo: "https://uhcougars.com/favicon.ico" },
      { name: "Houston On SI", feed: "https://www.si.com/college/houston/feed", site: "https://www.si.com/college/houston", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "On3", feed: "https://www.on3.com/teams/houston-cougars/feed/", site: "https://www.on3.com/teams/houston-cougars/", paths: ["/teams/houston-cougars/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" },
      { name: "The Daily Cougar", feed: "https://thedailycougar.com/category/sports/feed/", site: "https://thedailycougar.com/category/sports/", sportsSection: true }
    ]
  },

  series: [
    { match: /^rice( owls)?$/i, name: "Bayou Bucket", kind: "trophy" }
  ],

  links: {
    roster: { url: "https://uhcougars.com/sports/football/roster", label: "uhcougars.com" }
  },

  // Houston inside Suite: Houston Red (ESPN's), white, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "HOUSTON FOOTBALL",

    colors: {
      accent:         "#FFFFFF",
      accentText:     "#FFFFFF",
      accentOnLight:  "#C8102E",
      accentInk:      "#C8102E",
      accentSoft:     "#FFFFFF",
      accentTint:     "#F5D4D9",
      accentTintSoft: "#FBECEE",
      focus:          "#FFFFFF",
      surface:        "#C8102E",
      surfaceDeep:    "#900C21",
      surfaceAbyss:   "#540713",
      surfaceRaise:   "#CE2843"
    },

    // Houston's brand pages did not answer; Montserrat stands in. Please
    // confirm.
    fonts: {
      ui:       "'Montserrat','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Montserrat','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Houston, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/houston/availability.json", history: "data/houston/availability-history.json", label: "Big12Sports.com" },
    oddsHistory:  { file: "data/houston/odds-history.json" },
    beatNews:     { file: "data/houston/news.json" },
    recruits:     { file: "data/houston/recruits.json", label: "ESPN recruiting" }
  }
};
