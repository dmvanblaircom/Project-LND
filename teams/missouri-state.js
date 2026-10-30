/* Missouri State - Phase 4b, the Sun Belt, the MAC, Conference USA and UConn
   (David, 2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 2623, its home field as
   ESPN's schedule spells it (Robert W. Plaster Stadium), and the beat feeds
   below (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "missouri-state",
    name:         "Missouri State",
    abbreviation: "MOST",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Chicago",

    venue: {
      name: "Robert W. Plaster Stadium",
      lat:  37.1997,
      lon: -93.2803
    }
  },

  sources: {
    espn: {
      teamId: "2623",
      broadcastFallback: []
    },

    // Conference USA publishes no availability reports that HD Intelligence
    // carries or that could be found on conferenceusa.com (2026-10-29), so
    // none are shown.

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // One source only: The Standard turned GitHub's network away twice (429),
    // On SI has no Missouri State site (404), and On3's feed carries only
    // national stories.
    beatFeeds: [
      { name: "Missouri State Athletics", feed: "https://missouristatebears.com/rss?path=football", site: "https://missouristatebears.com/sports/football", logo: "https://missouristatebears.com/favicon.ico" }
    ]
  },

  series: [

  ],

  links: {
    // The Conference USA's availability reports, which Suite cannot read (its
    // viewer answers only a browser): Roster links the page instead
    // (David, 2026-10-30).
    availability: { url: "https://conferenceusa.com/sports/2025/8/23/FB_0823254134.aspx", label: "ConferenceUSA.com", conference: "Conference USA" },
    roster: { url: "https://missouristatebears.com/sports/football/roster", label: "missouristatebears.com" }
  },

  // Missouri State inside Suite: Maroon (ESPN's), white, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "MISSOURI STATE FOOTBALL",

    colors: {
      accent:         "#FFFFFF",
      accentText:     "#FFFFFF",
      accentOnLight:  "#5E0009",
      accentInk:      "#5E0009",
      accentSoft:     "#FFFFFF",
      accentTint:     "#E2D1D3",
      accentTintSoft: "#F2EBEB",
      focus:          "#FFFFFF",
      surface:        "#5E0009",
      surfaceDeep:    "#440006",
      surfaceAbyss:   "#270004",
      surfaceRaise:   "#6E1A22"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Missouri State, each because a
  // source exists for it.
  snapshots: {
    beatNews:     { file: "data/missouri-state/news.json" },
    recruits:     { file: "data/missouri-state/recruits.json", label: "ESPN recruiting" }
  }
};
