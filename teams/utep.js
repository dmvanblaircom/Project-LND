/* UTEP - Phase 4a, the American, the Mountain West and the Pac-12 (David,
   2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 2638, its home field as
   ESPN's schedule spells it (Sun Bowl), and the beat feeds below (probe-
   feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "utep",
    name:         "UTEP",
    abbreviation: "UTEP",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Denver",

    venue: {
      name: "Sun Bowl",
      lat:  31.7730,
      lon: -106.5086
    }
  },

  sources: {
    espn: {
      teamId: "2638",
      broadcastFallback: []
    },

    // The Mountain West publishes no availability reports that HD
    // Intelligence carries or that could be found on themw.com (2026-10-29),
    // so none are shown.

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // Not used: On SI has no UTEP site (404), and On3's feed carries only
    // national stories.
    beatFeeds: [
      { name: "UTEP Athletics", feed: "https://utepminers.com/rss?path=football", site: "https://utepminers.com/sports/football", logo: "https://utepminers.com/favicon.ico" },
      { name: "The Prospector", feed: "https://www.theprospectordaily.com/category/sports/football/feed/", site: "https://www.theprospectordaily.com/category/sports/football/" }
    ]
  },

  series: [
    { match: /^new mexico state( aggies)?$/i, name: "Battle of I-10", kind: "rivalry" }
  ],

  links: {
    roster: { url: "https://utepminers.com/sports/football/roster", label: "utepminers.com" }
  },

  // UTEP inside Suite: Navy, Orange (ESPN's); orange is too light to carry white text, so navy is the surface, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "UTEP FOOTBALL",

    colors: {
      accent:         "#FF8200",
      accentText:     "#FF8200",
      accentOnLight:  "#041E42",
      accentInk:      "#041E42",
      accentSoft:     "#FFBA73",
      accentTint:     "#FFE8D1",
      accentTintSoft: "#FFF5EB",
      focus:          "#FFFFFF",
      surface:        "#041E42",
      surfaceDeep:    "#031630",
      surfaceAbyss:   "#020D1C",
      surfaceRaise:   "#1D3455"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for UTEP, each because a
  // source exists for it.
  snapshots: {
    beatNews:     { file: "data/utep/news.json" },
    recruits:     { file: "data/utep/recruits.json", label: "ESPN recruiting" }
  }
};
