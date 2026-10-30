/* Tulane - Phase 4a, the American, the Mountain West and the Pac-12 (David,
   2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 2655, its home field as
   ESPN's schedule spells it (Yulman Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "tulane",
    name:         "Tulane",
    abbreviation: "TULN",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Chicago",

    venue: {
      name: "Yulman Stadium",
      lat:  29.9425,
      lon: -90.1170
    }
  },

  sources: {
    espn: {
      teamId: "2655",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-TULN",
      namePattern:  /\btulane\b/i
    },

    // The American's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://theamerican.org/sports/football",
      availabilityReportLabel: "TheAmerican.org",
      availabilityFeed: { provider: "hdintelligence", conference: "American", sport: "Football", team: "Tulane" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // Not used: On3's feed carries only national stories.
    beatFeeds: [
      { name: "Tulane Athletics", feed: "https://tulanegreenwave.com/rss?path=football", site: "https://tulanegreenwave.com/sports/football", logo: "https://tulanegreenwave.com/favicon.ico" },
      { name: "Tulane On SI", feed: "https://www.si.com/college/tulane/feed", site: "https://www.si.com/college/tulane", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "The Tulane Hullabaloo", feed: "https://tulanehullabaloo.com/category/sports/football/feed/", site: "https://tulanehullabaloo.com/category/sports/football/" }
    ]
  },

  series: [
    { match: /^southern miss(issippi)?( golden eagles)?$/i, name: "Battle for the Bell", kind: "trophy" }
  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its notes page, which carries this season's notes
    // (checked from GitHub's network that day).
    gameNotes: { url: "https://tulanegreenwave.com/sports/2019/5/1/tulane-football-game-notes", label: "tulanegreenwave.com", kind: "index" },
    roster: { url: "https://tulanegreenwave.com/sports/football/roster", label: "tulanegreenwave.com" }
  },

  // Tulane inside Suite: Olive Green, Sky Blue (ESPN's), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "TULANE FOOTBALL",

    colors: {
      accent:         "#418FDE",
      accentText:     "#7AB1E8",
      accentOnLight:  "#006747",
      accentInk:      "#111111",
      accentSoft:     "#96C1ED",
      accentTint:     "#DDEBF9",
      accentTintSoft: "#F0F6FC",
      focus:          "#FFFFFF",
      surface:        "#006747",
      surfaceDeep:    "#004A33",
      surfaceAbyss:   "#002B1E",
      surfaceRaise:   "#1A7659"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Tulane, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/tulane/availability.json", history: "data/tulane/availability-history.json", label: "TheAmerican.org" },
    oddsHistory:  { file: "data/tulane/odds-history.json" },
    beatNews:     { file: "data/tulane/news.json" },
    recruits:     { file: "data/tulane/recruits.json", label: "ESPN recruiting" }
  }
};
