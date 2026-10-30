/* Coastal Carolina - Phase 4b, the Sun Belt, the MAC, Conference USA and
   UConn (David, 2026-10-29). Same shape as teams/indiana.js; nothing else
   changed.

   From GitHub's network on 2026-10-29: ESPN team 324, its home field as
   ESPN's schedule spells it (Brooks Stadium (SC)), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "coastal-carolina",
    name:         "Coastal Carolina",
    abbreviation: "CCU",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "Brooks Stadium (SC)",
      lat:  33.7930,
      lon: -79.0168
    }
  },

  sources: {
    espn: {
      teamId: "324",
      broadcastFallback: []
    },

    // The Sun Belt publishes no availability reports that HD Intelligence
    // carries or that could be found on sunbeltsports.org (2026-10-29), so
    // none are shown.

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // One source only: On SI has no Coastal Carolina site (404), On3's feed
    // carries only national stories, and no student paper feed was found.
    beatFeeds: [
      { name: "Coastal Carolina Athletics", feed: "https://goccusports.com/rss?path=football", site: "https://goccusports.com/sports/football", logo: "https://goccusports.com/favicon.ico" }
    ]
  },

  series: [

  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its notes page, which carries this season's notes
    // (checked from GitHub's network that day).
    gameNotes: { url: "https://goccusports.com/sports/2026/9/3/2026-football-game-notes", label: "goccusports.com", kind: "index" },
    roster: { url: "https://goccusports.com/sports/football/roster", label: "goccusports.com" }
  },

  // Coastal Carolina inside Suite: Teal, Bronze (ESPN's), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "COASTAL CAROLINA FOOTBALL",

    colors: {
      accent:         "#A27752",
      accentText:     "#CBB39E",
      accentOnLight:  "#006F71",
      accentInk:      "#111111",
      accentSoft:     "#CCB4A0",
      accentTint:     "#EEE7E0",
      accentTintSoft: "#F8F4F1",
      focus:          "#FFFFFF",
      surface:        "#006F71",
      surfaceDeep:    "#005051",
      surfaceAbyss:   "#002F2F",
      surfaceRaise:   "#1A7D7F"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Coastal Carolina, each because a
  // source exists for it.
  snapshots: {
    beatNews:     { file: "data/coastal-carolina/news.json" },
    recruits:     { file: "data/coastal-carolina/recruits.json", label: "ESPN recruiting" }
  }
};
