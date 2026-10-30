/* Air Force - Phase 4a, the American, the Mountain West and the Pac-12
   (David, 2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 2005, its home field as
   ESPN's schedule spells it (Falcon Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "air-force",
    name:         "Air Force",
    abbreviation: "AFA",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Denver",

    venue: {
      name: "Falcon Stadium",
      lat:  38.9967,
      lon: -104.8434
    }
  },

  sources: {
    espn: {
      teamId: "2005",
      broadcastFallback: []
    },

    // The Mountain West publishes no availability reports that HD
    // Intelligence carries or that could be found on themw.com (2026-10-29),
    // so none are shown.

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // One source only: On SI has no Air Force site (404), and On3's feed
    // carries only national stories.
    beatFeeds: [
      { name: "Air Force Athletics", feed: "https://goairforcefalcons.com/rss?path=football", site: "https://goairforcefalcons.com/sports/football", logo: "https://goairforcefalcons.com/favicon.ico" }
    ]
  },

  series: [
    { match: /^army( black knights| west point)?$|^navy( midshipmen)?$/i, name: "Commander-in-Chief's Trophy", kind: "trophy" },
    { match: /^colorado state( rams)?$/i, name: "Ram-Falcon Trophy", kind: "trophy" }
  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its schedule, where each game's notes are posted.
    gameNotes: { url: "https://goairforcefalcons.com/sports/football/schedule", label: "goairforcefalcons.com", kind: "schedule" },
    // The Mountain West's availability reports, which Suite cannot read (its
    // viewer answers only a browser): Roster links the page instead
    // (David, 2026-10-30).
    availability: { url: "https://themw.com/sports/2026/8/21/football_reports.aspx", label: "TheMW.com", conference: "Mountain West" },
    roster: { url: "https://goairforcefalcons.com/sports/football/roster", label: "goairforcefalcons.com" }
  },

  // Air Force inside Suite: Air Force Blue (ESPN's), white, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "AIR FORCE FOOTBALL",

    colors: {
      accent:         "#FFFFFF",
      accentText:     "#FFFFFF",
      accentOnLight:  "#003594",
      accentInk:      "#003594",
      accentSoft:     "#FFFFFF",
      accentTint:     "#D1DBEC",
      accentTintSoft: "#EBEFF6",
      focus:          "#FFFFFF",
      surface:        "#003594",
      surfaceDeep:    "#00266B",
      surfaceAbyss:   "#00163E",
      surfaceRaise:   "#1A499F"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Air Force, each because a
  // source exists for it.
  snapshots: {
    beatNews:     { file: "data/air-force/news.json" },
    recruits:     { file: "data/air-force/recruits.json", label: "ESPN recruiting" }
  }
};
