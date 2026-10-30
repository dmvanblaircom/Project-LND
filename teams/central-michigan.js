/* Central Michigan - Phase 4b, the Sun Belt, the MAC, Conference USA and
   UConn (David, 2026-10-29). Same shape as teams/indiana.js; nothing else
   changed.

   From GitHub's network on 2026-10-29: ESPN team 2117, its home field as
   ESPN's schedule spells it (Kelly/Shorts Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "central-michigan",
    name:         "Central Michigan",
    abbreviation: "CMU",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "Kelly/Shorts Stadium",
      lat:  43.5776,
      lon: -84.7710
    }
  },

  sources: {
    espn: {
      teamId: "2117",
      broadcastFallback: []
    },

    // The MAC's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://getsomemaction.com/sports/football",
      availabilityReportLabel: "GetSomeMACtion.com",
      availabilityFeed: { provider: "hdintelligence", conference: "MAC", sport: "Football", team: "Central Mich.", aliases: ["Central Michigan"] }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // One source only: CM Life publishes no working feed, On SI has no
    // Central Michigan site (404), and On3's feed carries only national
    // stories.
    beatFeeds: [
      { name: "CMU Athletics", feed: "https://cmuchippewas.com/rss?path=football", site: "https://cmuchippewas.com/sports/football", logo: "https://cmuchippewas.com/favicon.ico" }
    ]
  },

  series: [
    { match: /^western michigan( broncos)?$/i, name: "Victory Cannon", kind: "trophy" }
  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its schedule, where each game's notes are posted.
    gameNotes: { url: "https://cmuchippewas.com/sports/football/schedule", label: "cmuchippewas.com", kind: "schedule" },
    roster: { url: "https://cmuchippewas.com/sports/football/roster", label: "cmuchippewas.com" }
  },

  // Central Michigan inside Suite: Maroon, Gold (ESPN's), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "CENTRAL MICHIGAN FOOTBALL",

    colors: {
      accent:         "#FBAB18",
      accentText:     "#FBAB18",
      accentOnLight:  "#4C0027",
      accentInk:      "#4C0027",
      accentSoft:     "#FDD180",
      accentTint:     "#FEF0D5",
      accentTintSoft: "#FFF8ED",
      focus:          "#FFFFFF",
      surface:        "#4C0027",
      surfaceDeep:    "#37001C",
      surfaceAbyss:   "#200010",
      surfaceRaise:   "#5E1A3D"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Central Michigan, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/central-michigan/availability.json", history: "data/central-michigan/availability-history.json", label: "GetSomeMACtion.com" },
    beatNews:     { file: "data/central-michigan/news.json" },
    recruits:     { file: "data/central-michigan/recruits.json", label: "ESPN recruiting" }
  }
};
