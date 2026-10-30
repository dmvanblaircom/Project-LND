/* Texas A&M - Phase 2, the SEC (David, 2026-10-28). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-28: ESPN team 245, its home field as
   ESPN's schedule spells it (Kyle Field), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "texas-am",
    name:         "Texas A&M",
    abbreviation: "TA&M",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Chicago",

    venue: {
      name: "Kyle Field",
      lat:  30.6100,
      lon: -96.3403
    }
  },

  sources: {
    espn: {
      teamId: "245",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-TXAM",
      namePattern:  /(?<!east )texas a&m(?!-)/i
    },

    // The SEC's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://www.secsports.com/fbreports",
      availabilityReportLabel: "SECsports.com",
      availabilityFeed: { provider: "hdintelligence", conference: "SEC", sport: "Football", team: "Texas A&M" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-28.
    // Not used: 12thman.com has no feed; no On3 team feed (404).
    beatFeeds: [
      { name: "Good Bull Hunting", feed: "https://www.goodbullhunting.com/rss/current.xml", site: "https://www.goodbullhunting.com/" },
      { name: "Texas A&M On SI", feed: "https://www.si.com/college/tamu/feed", site: "https://www.si.com/college/tamu", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "The Battalion", feed: "https://thebatt.com/category/sports/feed/", sportsSection: true, site: "https://thebatt.com/category/sports/" }
    ]
  },

  series: [
    { match: /^texas( longhorns)?$/i, name: "Lone Star Showdown", kind: "rivalry" },
    { match: /^arkansas( razorbacks)?$/i, name: "Southwest Classic", kind: "rivalry" }
  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its schedule, where each game's notes are posted.
    gameNotes: { url: "https://12thman.com/sports/football/schedule", label: "12thman.com", kind: "schedule" },
    roster: { url: "https://12thman.com/sports/football/roster", label: "12thman.com" }
  },

  // Texas A&M inside Suite: Aggie Maroon (brandguide.tamu.edu), white, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "TEXAS A&M FOOTBALL",

    colors: {
      accent:         "#FFFFFF",
      accentText:     "#FFFFFF",
      accentOnLight:  "#500000",
      accentInk:      "#500000",
      accentSoft:     "#FFFFFF",
      accentTint:     "#E0D1D1",
      accentTintSoft: "#F1EBEB",
      focus:          "#FFFFFF",
      surface:        "#500000",
      surfaceDeep:    "#3A0000",
      surfaceAbyss:   "#220000",
      surfaceRaise:   "#621A1A"
    },

    // Texas A&M's brand faces are Oswald and Work Sans, both free: used as
    // they are.
    fonts: {
      ui:       "'Work Sans','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Oswald','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Texas A&M, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/texas-am/availability.json", history: "data/texas-am/availability-history.json", label: "SECsports.com" },
    oddsHistory:  { file: "data/texas-am/odds-history.json" },
    beatNews:     { file: "data/texas-am/news.json" },
    recruits:     { file: "data/texas-am/recruits.json", label: "ESPN recruiting" }
  }
};
