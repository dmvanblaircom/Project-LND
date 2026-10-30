/* San José State - Phase 4a, the American, the Mountain West and the Pac-12
   (David, 2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 23, its home field as
   ESPN's schedule spells it (CEFCU Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "san-jose-state",
    name:         "San José State",
    abbreviation: "SJSU",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Los_Angeles",

    venue: {
      name: "CEFCU Stadium",
      lat:  37.3197,
      lon: -121.8682
    }
  },

  sources: {
    espn: {
      teamId: "23",
      broadcastFallback: []
    },

    // The Mountain West publishes no availability reports that HD
    // Intelligence carries or that could be found on themw.com (2026-10-29),
    // so none are shown.

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // One source only, read as a sports section (sjsuspartans.com's feed
    // carries every sport): the Spartan Daily's feed address now leads to an
    // unrelated site, and there is no On3 team feed or On SI site (404).
    beatFeeds: [
      { name: "SJSU Athletics", feed: "https://sjsuspartans.com/rss/", site: "https://sjsuspartans.com/sports/football", logo: "https://sjsuspartans.com/favicon.ico", sportsSection: true }
    ]
  },

  series: [
    { match: /^hawai'?i( rainbow warriors)?$/i, name: "Dick Tomey Legacy Trophy", kind: "trophy" }
  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its schedule, where each game's notes are posted.
    gameNotes: { url: "https://sjsuspartans.com/sports/football/schedule", label: "sjsuspartans.com", kind: "schedule" },
    roster: { url: "https://sjsuspartans.com/sports/football/roster", label: "sjsuspartans.com" }
  },

  // San José State inside Suite: Spartan Blue, Gold (ESPN's), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "SAN JOSÉ STATE FOOTBALL",

    colors: {
      accent:         "#FFB81A",
      accentText:     "#FFB81A",
      accentOnLight:  "#0038A8",
      accentInk:      "#0038A8",
      accentSoft:     "#FFD881",
      accentTint:     "#FFF2D6",
      accentTintSoft: "#FFF9ED",
      focus:          "#FFFFFF",
      surface:        "#0038A8",
      surfaceDeep:    "#002879",
      surfaceAbyss:   "#001847",
      surfaceRaise:   "#1A4CB1"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for San José State, each because a
  // source exists for it.
  snapshots: {
    beatNews:     { file: "data/san-jose-state/news.json" },
    recruits:     { file: "data/san-jose-state/recruits.json", label: "ESPN recruiting" }
  }
};
