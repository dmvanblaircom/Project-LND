/* Ohio - Phase 4b, the Sun Belt, the MAC, Conference USA and UConn (David,
   2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 195, its home field as
   ESPN's schedule spells it (Peden Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "ohio",
    name:         "Ohio",
    abbreviation: "OHIO",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "Peden Stadium",
      lat:  39.3222,
      lon: -82.1041
    }
  },

  sources: {
    espn: {
      teamId: "195",
      broadcastFallback: []
    },

    // The MAC's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://getsomemaction.com/sports/football",
      availabilityReportLabel: "GetSomeMACtion.com",
      availabilityFeed: { provider: "hdintelligence", conference: "MAC", sport: "Football", team: "Ohio" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // One source only: The Post publishes no working feed, On SI has no Ohio
    // site (404), and On3's feed carries only national stories.
    beatFeeds: [
      { name: "Ohio Athletics", feed: "https://ohiobobcats.com/rss?path=football", site: "https://ohiobobcats.com/sports/football", logo: "https://ohiobobcats.com/favicon.ico" }
    ]
  },

  series: [
    { match: /^marshall( thundering herd)?$/i, name: "Battle for the Bell", kind: "trophy" },
    { match: /^miami \(oh\)( redhawks)?$|^miami oh( redhawks)?$/i, name: "Battle of the Bricks", kind: "rivalry" }
  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its schedule, where each game's notes are posted.
    gameNotes: { url: "https://ohiobobcats.com/sports/football/schedule", label: "ohiobobcats.com", kind: "schedule" },
    roster: { url: "https://ohiobobcats.com/sports/football/roster", label: "ohiobobcats.com" }
  },

  // Ohio inside Suite: Green (ESPN's), white, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "OHIO FOOTBALL",

    colors: {
      accent:         "#FFFFFF",
      accentText:     "#FFFFFF",
      accentOnLight:  "#154734",
      accentInk:      "#154734",
      accentSoft:     "#FFFFFF",
      accentTint:     "#D5DEDA",
      accentTintSoft: "#ECF0EF",
      focus:          "#FFFFFF",
      surface:        "#154734",
      surfaceDeep:    "#0F3325",
      surfaceAbyss:   "#091E16",
      surfaceRaise:   "#2C5948"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Ohio, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/ohio/availability.json", history: "data/ohio/availability-history.json", label: "GetSomeMACtion.com" },
    beatNews:     { file: "data/ohio/news.json" },
    recruits:     { file: "data/ohio/recruits.json", label: "ESPN recruiting" }
  }
};
