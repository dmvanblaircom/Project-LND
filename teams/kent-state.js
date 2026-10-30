/* Kent State - Phase 4b, the Sun Belt, the MAC, Conference USA and UConn
   (David, 2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 2309, its home field as
   ESPN's schedule spells it (Zoeller Field at Dix Stadium), and the beat
   feeds below (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "kent-state",
    name:         "Kent State",
    abbreviation: "KENT",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "Zoeller Field at Dix Stadium",
      lat:  41.1517,
      lon: -81.3165
    }
  },

  sources: {
    espn: {
      teamId: "2309",
      broadcastFallback: []
    },

    // The MAC's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://getsomemaction.com/sports/football",
      availabilityReportLabel: "GetSomeMACtion.com",
      availabilityFeed: { provider: "hdintelligence", conference: "MAC", sport: "Football", team: "Kent St.", aliases: ["Kent State"] }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // One source only: KentWired publishes no working feed, On SI has no Kent
    // State site (404), and On3's feed carries only national stories.
    beatFeeds: [
      { name: "Kent State Athletics", feed: "https://kentstatesports.com/rss?path=football", site: "https://kentstatesports.com/sports/football", logo: "https://kentstatesports.com/favicon.ico" }
    ]
  },

  series: [
    { match: /^akron( zips)?$/i, name: "Wagon Wheel", kind: "trophy" }
  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its schedule, where each game's notes are posted.
    gameNotes: { url: "https://kentstatesports.com/sports/football/schedule", label: "kentstatesports.com", kind: "schedule" },
    roster: { url: "https://kentstatesports.com/sports/football/roster", label: "kentstatesports.com" }
  },

  // Kent State inside Suite: Navy, Gold (ESPN's), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "KENT STATE FOOTBALL",

    colors: {
      accent:         "#EAAB00",
      accentText:     "#EAAB00",
      accentOnLight:  "#002664",
      accentInk:      "#002664",
      accentSoft:     "#F3D173",
      accentTint:     "#FBF0D1",
      accentTintSoft: "#FDF8EB",
      focus:          "#FFFFFF",
      surface:        "#002664",
      surfaceDeep:    "#001B48",
      surfaceAbyss:   "#00102A",
      surfaceRaise:   "#1A3C74"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Kent State, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/kent-state/availability.json", history: "data/kent-state/availability-history.json", label: "GetSomeMACtion.com" },
    beatNews:     { file: "data/kent-state/news.json" },
    recruits:     { file: "data/kent-state/recruits.json", label: "ESPN recruiting" }
  }
};
