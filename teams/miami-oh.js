/* Miami (OH) - Phase 4b, the Sun Belt, the MAC, Conference USA and UConn
   (David, 2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 193, its home field as
   ESPN's schedule spells it (Yager Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "miami-oh",
    name:         "Miami (OH)",
    abbreviation: "M-OH",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "Yager Stadium",
      lat:  39.5196,
      lon: -84.7400
    }
  },

  sources: {
    espn: {
      teamId: "193",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-MOH",
      namePattern:  /miami \(oh\)|miami oh\b|redhawks/i
    },

    // The MAC's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://getsomemaction.com/sports/football",
      availabilityReportLabel: "GetSomeMACtion.com",
      availabilityFeed: { provider: "hdintelligence", conference: "MAC", sport: "Football", team: "Miami (OH)" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // One source only: The Miami Student publishes no working feed, On SI has
    // no Miami site (404), and On3's feed carries only national stories.
    beatFeeds: [
      { name: "Miami Athletics", feed: "https://miamiredhawks.com/rss?path=football", site: "https://miamiredhawks.com/sports/football", logo: "https://miamiredhawks.com/favicon.ico" }
    ]
  },

  series: [
    { match: /^cincinnati( bearcats)?$/i, name: "Victory Bell", kind: "trophy" },
    { match: /^ohio( bobcats)?$/i, name: "Battle of the Bricks", kind: "rivalry" }
  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its schedule, where each game's notes are posted.
    gameNotes: { url: "https://miamiredhawks.com/sports/football/schedule", label: "miamiredhawks.com", kind: "schedule" },
    roster: { url: "https://miamiredhawks.com/sports/football/roster", label: "miamiredhawks.com" }
  },

  // Miami (OH) inside Suite: Red (ESPN's), white, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "MIAMI FOOTBALL",

    colors: {
      accent:         "#FFFFFF",
      accentText:     "#FFFFFF",
      accentOnLight:  "#C41230",
      accentInk:      "#C41230",
      accentSoft:     "#FFFFFF",
      accentTint:     "#F4D4DA",
      accentTintSoft: "#FAECEE",
      focus:          "#FFFFFF",
      surface:        "#C41230",
      surfaceDeep:    "#8D0D23",
      surfaceAbyss:   "#520814",
      surfaceRaise:   "#CA2A45"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Miami (OH), each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/miami-oh/availability.json", history: "data/miami-oh/availability-history.json", label: "GetSomeMACtion.com" },
    oddsHistory:  { file: "data/miami-oh/odds-history.json" },
    beatNews:     { file: "data/miami-oh/news.json" },
    recruits:     { file: "data/miami-oh/recruits.json", label: "ESPN recruiting" }
  }
};
