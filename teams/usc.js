/* USC - Phase 1, the rest of the Big Ten (David, 2026-10-27). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-27: ESPN team 30, its home field as
   ESPN's schedule spells it (Los Angeles Memorial Coliseum), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "usc",
    name:         "USC",
    abbreviation: "USC",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Los_Angeles",

    venue: {
      name: "Los Angeles Memorial Coliseum",
      lat:  34.0141,
      lon: -118.2879
    }
  },

  sources: {
    espn: {
      teamId: "30",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-USC",
      namePattern:  /\busc\b|trojans/i
    },

    // The Big Ten's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://bigten.org/sports/2026/9/10/FB_Availability_Reports.aspx",
      availabilityReportLabel: "BigTen.org",
      // The Big Ten's reports name USC "Southern California" (HD Intelligence,
      // 2026-10-28), as they name Ohio State "Ohio St.".
      availabilityFeed: { provider: "hdintelligence", conference: "B10", sport: "Football", team: "Southern California", aliases: ["USC"] }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-27. On3's team feeds carry league-wide
    // stories, so `paths` keeps only USC's section.
    // Not used: Conquest Chronicles (SB Nation) did not answer GitHub's
    // network.
    beatFeeds: [
      { name: "USC Athletics", feed: "https://usctrojans.com/rss?path=football", site: "https://usctrojans.com/sports/football", logo: "https://usctrojans.com/favicon.ico" },
      { name: "USC On SI", feed: "https://www.si.com/college/usc/feed", site: "https://www.si.com/college/usc", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "On3", feed: "https://www.on3.com/teams/usc-trojans/feed/", site: "https://www.on3.com/teams/usc-trojans/", paths: ["/teams/usc-trojans/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" },
      { name: "Daily Trojan", feed: "https://dailytrojan.com/category/sports/football/feed/", site: "https://dailytrojan.com/category/sports/" }
    ]
  },

  series: [
    { match: /^ucla( bruins)?$/i, name: "Victory Bell", kind: "trophy" },
    { match: /^notre dame( fighting irish)?$/i, name: "Jeweled Shillelagh", kind: "trophy" }
  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its schedule, where each game's notes are posted.
    gameNotes: { url: "https://usctrojans.com/sports/football/schedule", label: "usctrojans.com", kind: "schedule" },
    roster: { url: "https://usctrojans.com/sports/football/roster", label: "usctrojans.com" }
  },

  // USC inside Suite: Cardinal PMS 201, Gold PMS 123 (identity.usc.edu), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "USC FOOTBALL",

    colors: {
      accent:         "#FFCC00",
      accentText:     "#FFCC00",
      accentOnLight:  "#990000",
      accentInk:      "#990000",
      accentSoft:     "#FFE373",
      accentTint:     "#FFF6D1",
      accentTintSoft: "#FFFBEB",
      focus:          "#FFFFFF",
      surface:        "#990000",
      surfaceDeep:    "#6E0000",
      surfaceAbyss:   "#400000",
      surfaceRaise:   "#A31A1A"
    },

    // USC's National 2 and Adobe Caslon are licensed; Inter is the closest
    // free match to National 2.
    fonts: {
      ui:       "'Inter','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Inter','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for USC, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/usc/availability.json", history: "data/usc/availability-history.json", label: "BigTen.org" },
    oddsHistory:  { file: "data/usc/odds-history.json" },
    beatNews:     { file: "data/usc/news.json" },
    recruits:     { file: "data/usc/recruits.json", label: "ESPN recruiting" }
  }
};
