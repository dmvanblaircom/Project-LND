/* Oklahoma State - Phase 3, the Big 12 and the ACC (David, 2026-10-28). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-28: ESPN team 197, its home field as
   ESPN's schedule spells it (Boone Pickens Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "oklahoma-state",
    name:         "Oklahoma State",
    abbreviation: "OKST",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Chicago",

    venue: {
      name: "Boone Pickens Stadium",
      lat:  36.1259,
      lon: -97.0665
    }
  },

  sources: {
    espn: {
      teamId: "197",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-OKST",
      namePattern:  /oklahoma st/i
    },

    // The Big 12's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://big12sports.com/sports/football",
      availabilityReportLabel: "Big12Sports.com",
      availabilityFeed: { provider: "hdintelligence", conference: "B12", sport: "Football", team: "Oklahoma St.", aliases: ["Oklahoma State"] }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-28.
    // OState Illustrated is On3's fan site for Oklahoma State (the former
    // Rivals site), read through its own section so On3's national stories
    // stay out (2026-10-29). Not used: Cowboys Ride for Free (SB Nation) did
    // not answer, and the O'Colly turned GitHub's network away (429).
    beatFeeds: [
      { name: "Oklahoma State Athletics", feed: "https://okstate.com/rss?path=football", site: "https://okstate.com/sports/football", logo: "https://okstate.com/favicon.ico" },
      { name: "Oklahoma State On SI", feed: "https://www.si.com/college/oklahomastate/feed", site: "https://www.si.com/college/oklahomastate", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "OState Illustrated", feed: "https://www.on3.com/sites/o-state-illustrated/feed/", site: "https://www.on3.com/sites/o-state-illustrated/", paths: ["/sites/o-state-illustrated/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" }
    ]
  },

  series: [
    { match: /^oklahoma( sooners)?$/i, name: "Bedlam", kind: "rivalry" }
  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its schedule, where each game's notes are posted.
    gameNotes: { url: "https://okstate.com/sports/football/schedule", label: "okstate.com", kind: "schedule" },
    roster: { url: "https://okstate.com/sports/football/roster", label: "okstate.com" }
  },

  // Oklahoma State inside Suite: Black, OSU Orange (ESPN's; Oklahoma State's page refused), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "OKLAHOMA STATE FOOTBALL",

    colors: {
      accent:         "#FE5C00",
      accentText:     "#FE5C00",
      accentOnLight:  "#000000",
      accentInk:      "#000000",
      accentSoft:     "#FEA573",
      accentTint:     "#FFE2D1",
      accentTintSoft: "#FFF2EB",
      focus:          "#FFFFFF",
      surface:        "#000000",
      surfaceDeep:    "#000000",
      surfaceAbyss:   "#000000",
      surfaceRaise:   "#1A1A1A"
    },

    // Oklahoma State's brand pages turned GitHub's network away; Inter stands
    // in. Please confirm.
    fonts: {
      ui:       "'Inter','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Inter','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Oklahoma State, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/oklahoma-state/availability.json", history: "data/oklahoma-state/availability-history.json", label: "Big12Sports.com" },
    oddsHistory:  { file: "data/oklahoma-state/odds-history.json" },
    beatNews:     { file: "data/oklahoma-state/news.json" },
    recruits:     { file: "data/oklahoma-state/recruits.json", label: "ESPN recruiting" }
  }
};
