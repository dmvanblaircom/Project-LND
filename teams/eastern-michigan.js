/* Eastern Michigan - Phase 4b, the Sun Belt, the MAC, Conference USA and
   UConn (David, 2026-10-29). Same shape as teams/indiana.js; nothing else
   changed.

   From GitHub's network on 2026-10-29: ESPN team 2199, its home field as
   ESPN's schedule spells it (Rynearson Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "eastern-michigan",
    name:         "Eastern Michigan",
    abbreviation: "EMU",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "Rynearson Stadium",
      lat:  42.2583,
      lon: -83.6386
    }
  },

  sources: {
    espn: {
      teamId: "2199",
      broadcastFallback: []
    },

    // The MAC's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://getsomemaction.com/sports/football",
      availabilityReportLabel: "GetSomeMACtion.com",
      availabilityFeed: { provider: "hdintelligence", conference: "MAC", sport: "Football", team: "Eastern Mich.", aliases: ["Eastern Michigan"] }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // One source only: The Eastern Echo publishes no working feed, On SI has
    // no Eastern Michigan site (404), and On3's feed carries only national
    // stories.
    beatFeeds: [
      { name: "EMU Athletics", feed: "https://emueagles.com/rss?path=football", site: "https://emueagles.com/sports/football", logo: "https://emueagles.com/favicon.ico" }
    ]
  },

  series: [

  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its schedule, where each game's notes are posted.
    gameNotes: { url: "https://emueagles.com/sports/football/schedule", label: "emueagles.com", kind: "schedule" },
    roster: { url: "https://emueagles.com/sports/football/roster", label: "emueagles.com" }
  },

  // Eastern Michigan inside Suite: Green (ESPN's), white, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "EASTERN MICHIGAN FOOTBALL",

    colors: {
      accent:         "#FFFFFF",
      accentText:     "#FFFFFF",
      accentOnLight:  "#006938",
      accentInk:      "#006938",
      accentSoft:     "#FFFFFF",
      accentTint:     "#D1E4DB",
      accentTintSoft: "#EBF3EF",
      focus:          "#FFFFFF",
      surface:        "#006938",
      surfaceDeep:    "#004C28",
      surfaceAbyss:   "#002C18",
      surfaceRaise:   "#1A784C"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Eastern Michigan, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/eastern-michigan/availability.json", history: "data/eastern-michigan/availability-history.json", label: "GetSomeMACtion.com" },
    beatNews:     { file: "data/eastern-michigan/news.json" },
    recruits:     { file: "data/eastern-michigan/recruits.json", label: "ESPN recruiting" }
  }
};
