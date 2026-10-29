/* Sacramento State - Phase 4b, the Sun Belt, the MAC, Conference USA and
   UConn (David, 2026-10-29). Same shape as teams/indiana.js; nothing else
   changed.

   From GitHub's network on 2026-10-29: ESPN team 16, its home field as
   ESPN's schedule spells it (Hornet Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "sacramento-state",
    name:         "Sacramento State",
    abbreviation: "SAC",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Los_Angeles",

    venue: {
      name: "Hornet Stadium",
      lat:  38.5605,
      lon: -121.4239
    }
  },

  sources: {
    espn: {
      teamId: "16",
      broadcastFallback: []
    },

    // The MAC's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://getsomemaction.com/sports/football",
      availabilityReportLabel: "GetSomeMACtion.com",
      availabilityFeed: { provider: "hdintelligence", conference: "MAC", sport: "Football", team: "Sacramento St.", aliases: ["Sacramento State"] }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // Not used: On SI has no Sac State site (404), and On3's feed carries
    // only national stories.
    beatFeeds: [
      { name: "Sac State Athletics", feed: "https://hornetsports.com/rss?path=football", site: "https://hornetsports.com/sports/football", logo: "https://hornetsports.com/favicon.ico" },
      { name: "The State Hornet", feed: "https://statehornet.com/category/sports/feed/", site: "https://statehornet.com/category/sports/", sportsSection: true }
    ]
  },

  series: [
    { match: /^uc davis( aggies)?$/i, name: "Causeway Classic", kind: "trophy" }
  ],

  links: {
    roster: { url: "https://hornetsports.com/sports/football/roster", label: "hornetsports.com" }
  },

  // Sacramento State inside Suite: Green, Gold (ESPN's), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "SAC STATE FOOTBALL",

    colors: {
      accent:         "#CDB97D",
      accentText:     "#CDB97D",
      accentOnLight:  "#00573C",
      accentInk:      "#003F2B",
      accentSoft:     "#E4D8B8",
      accentTint:     "#F6F2E8",
      accentTintSoft: "#FBF9F5",
      focus:          "#FFFFFF",
      surface:        "#00573C",
      surfaceDeep:    "#003F2B",
      surfaceAbyss:   "#002519",
      surfaceRaise:   "#1A6850"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Sacramento State, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/sacramento-state/availability.json", history: "data/sacramento-state/availability-history.json", label: "GetSomeMACtion.com" },
    beatNews:     { file: "data/sacramento-state/news.json" },
    recruits:     { file: "data/sacramento-state/recruits.json", label: "ESPN recruiting" }
  }
};
