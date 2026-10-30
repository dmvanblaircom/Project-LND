/* Liberty - Phase 4b, the Sun Belt, the MAC, Conference USA and UConn
   (David, 2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 2335, its home field as
   ESPN's schedule spells it (Williams Stadium (VA)), and the beat feeds
   below (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "liberty",
    name:         "Liberty",
    abbreviation: "LIB",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "Williams Stadium (VA)",
      lat:  37.3540,
      lon: -79.1781
    }
  },

  sources: {
    espn: {
      teamId: "2335",
      broadcastFallback: []
    },

    // Conference USA publishes no availability reports that HD Intelligence
    // carries or that could be found on conferenceusa.com (2026-10-29), so
    // none are shown.

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // One source only: On SI has no Liberty site (404), On3's feed carries
    // only national stories, and no student paper feed was found.
    beatFeeds: [
      { name: "Liberty Athletics", feed: "https://libertyflames.com/rss?path=football", site: "https://libertyflames.com/sports/football", logo: "https://libertyflames.com/favicon.ico" }
    ]
  },

  series: [

  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its notes page, which carries this season's notes
    // (checked from GitHub's network that day).
    gameNotes: { url: "https://libertyflames.com/sports/2023/9/2/football-game-notes", label: "libertyflames.com", kind: "index" },
    roster: { url: "https://libertyflames.com/sports/football/roster", label: "libertyflames.com" }
  },

  // Liberty inside Suite: Navy, Red (ESPN's), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "LIBERTY FOOTBALL",

    colors: {
      accent:         "#B72025",
      accentText:     "#CD6366",
      accentOnLight:  "#B72025",
      accentInk:      "#FFFFFF",
      accentSoft:     "#D78487",
      accentTint:     "#F2D7D8",
      accentTintSoft: "#F9EDEE",
      focus:          "#FFFFFF",
      surface:        "#0A254E",
      surfaceDeep:    "#071B38",
      surfaceAbyss:   "#041021",
      surfaceRaise:   "#223B60"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Liberty, each because a
  // source exists for it.
  snapshots: {
    beatNews:     { file: "data/liberty/news.json" },
    recruits:     { file: "data/liberty/recruits.json", label: "ESPN recruiting" }
  }
};
