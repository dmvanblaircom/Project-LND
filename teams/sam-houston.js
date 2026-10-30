/* Sam Houston - Phase 4b, the Sun Belt, the MAC, Conference USA and UConn
   (David, 2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 2534, its home field as
   ESPN's schedule spells it (Elliott T. Bowers Stadium), and the beat feeds
   below (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "sam-houston",
    name:         "Sam Houston",
    abbreviation: "SHSU",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Chicago",

    venue: {
      name: "Elliott T. Bowers Stadium",
      lat:  30.7135,
      lon: -95.5431
    }
  },

  sources: {
    espn: {
      teamId: "2534",
      broadcastFallback: []
    },

    // Conference USA publishes no availability reports that HD Intelligence
    // carries or that could be found on conferenceusa.com (2026-10-29), so
    // none are shown.

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // One source only: The Houstonian's feed now carries unrelated stories,
    // On SI has no Sam Houston site (404), and there is no On3 team feed
    // (404).
    beatFeeds: [
      { name: "Sam Houston Athletics", feed: "https://gobearkats.com/rss?path=football", site: "https://gobearkats.com/sports/football", logo: "https://gobearkats.com/favicon.ico" }
    ]
  },

  series: [

  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its notes page, which carries this season's notes
    // (checked from GitHub's network that day).
    gameNotes: { url: "https://gobearkats.com/sports/2021/1/26/football-game-notes", label: "gobearkats.com", kind: "index" },
    // The Conference USA's availability reports, which Suite cannot read (its
    // viewer answers only a browser): Roster links the page instead
    // (David, 2026-10-30).
    availability: { url: "https://conferenceusa.com/sports/2025/8/23/FB_0823254134.aspx", label: "ConferenceUSA.com", conference: "Conference USA" },
    roster: { url: "https://gobearkats.com/sports/football/roster", label: "gobearkats.com" }
  },

  // Sam Houston inside Suite: Orange (ESPN's), white, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js). surface deepened 24% from #F56423 to carry white text and to read as ink on the page.
  identity: {
    programLabel: "SAM HOUSTON FOOTBALL",

    colors: {
      accent:         "#FFFFFF",
      accentText:     "#FFFFFF",
      accentOnLight:  "#BA4C1B",
      accentInk:      "#BA4C1B",
      accentSoft:     "#FFFFFF",
      accentTint:     "#F3DFD6",
      accentTintSoft: "#F9F1ED",
      focus:          "#FFFFFF",
      surface:        "#BA4C1B",
      surfaceDeep:    "#863713",
      surfaceAbyss:   "#4E200B",
      surfaceRaise:   "#BD5324"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Sam Houston, each because a
  // source exists for it.
  snapshots: {
    beatNews:     { file: "data/sam-houston/news.json" },
    recruits:     { file: "data/sam-houston/recruits.json", label: "ESPN recruiting" }
  }
};
