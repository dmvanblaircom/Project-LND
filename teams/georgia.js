/* Georgia - Phase 2, the SEC (David, 2026-10-28). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-28: ESPN team 61, its home field as
   ESPN's schedule spells it (Sanford Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "georgia",
    name:         "Georgia",
    abbreviation: "UGA",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "Sanford Stadium",
      lat:  33.9497,
      lon: -83.3734
    }
  },

  sources: {
    espn: {
      teamId: "61",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-UGA",
      namePattern:  /\bgeorgia\b(?! tech| st| southern)/i
    },

    // The SEC's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://www.secsports.com/fbreports",
      availabilityReportLabel: "SECsports.com",
      availabilityFeed: { provider: "hdintelligence", conference: "SEC", sport: "Football", team: "Georgia" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-28. On3's team feeds carry league-wide
    // stories, so `paths` keeps only Georgia's section.
    // Not used: The Red & Black turned GitHub's network away (429).
    beatFeeds: [
      { name: "Georgia Athletics", feed: "https://georgiadogs.com/rss?path=football", site: "https://georgiadogs.com/sports/football", logo: "https://georgiadogs.com/favicon.ico" },
      { name: "Dawg Sports", feed: "https://www.dawgsports.com/rss/current.xml", site: "https://www.dawgsports.com/" },
      { name: "Georgia On SI", feed: "https://www.si.com/college/georgia/feed", site: "https://www.si.com/college/georgia", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "On3", feed: "https://www.on3.com/teams/georgia-bulldogs/feed/", site: "https://www.on3.com/teams/georgia-bulldogs/", paths: ["/teams/georgia-bulldogs/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" }
    ]
  },

  series: [
    { match: /^florida( gators)?$/i, name: "Florida–Georgia", kind: "rivalry" },
    { match: /^auburn( tigers)?$/i, name: "Deep South’s Oldest Rivalry", kind: "rivalry" },
    { match: /^georgia tech( yellow jackets)?$/i, name: "Governor’s Cup", kind: "trophy" }
  ],

  links: {
    roster: { url: "https://georgiadogs.com/sports/football/roster", label: "georgiadogs.com" }
  },

  // Georgia inside Suite: Bulldog Red PMS 200 (brand.uga.edu), white, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "GEORGIA FOOTBALL",

    colors: {
      accent:         "#FFFFFF",
      accentText:     "#FFFFFF",
      accentOnLight:  "#BA0C2F",
      accentInk:      "#BA0C2F",
      accentSoft:     "#FFFFFF",
      accentTint:     "#F3D3DA",
      accentTintSoft: "#F9ECEE",
      focus:          "#FFFFFF",
      surface:        "#BA0C2F",
      surfaceDeep:    "#860922",
      surfaceAbyss:   "#4E0514",
      surfaceRaise:   "#C12444"
    },

    // Georgia's brand faces are Oswald (primary) and Merriweather Sans
    // (secondary), both free: used as they are.
    fonts: {
      ui:       "'Merriweather Sans','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Oswald','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Georgia, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/georgia/availability.json", history: "data/georgia/availability-history.json", label: "SECsports.com" },
    oddsHistory:  { file: "data/georgia/odds-history.json" },
    beatNews:     { file: "data/georgia/news.json" },
    recruits:     { file: "data/georgia/recruits.json", label: "ESPN recruiting" }
  }
};
