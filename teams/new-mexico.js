/* New Mexico - Phase 4a, the American, the Mountain West and the Pac-12
   (David, 2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 167, its home field as
   ESPN's schedule spells it (University Stadium (NM)), and the beat feeds
   below (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "new-mexico",
    name:         "New Mexico",
    abbreviation: "UNM",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Denver",

    venue: {
      name: "University Stadium (NM)",
      lat:  35.0670,
      lon: -106.6290
    }
  },

  sources: {
    espn: {
      teamId: "167",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-UNM",
      namePattern:  /\bnew mexico\b(?! st)|\blobos\b/i
    },

    // The Mountain West publishes no availability reports that HD
    // Intelligence carries or that could be found on themw.com (2026-10-29),
    // so none are shown.

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // One source only: golobos.com publishes no working feed, On SI has no
    // New Mexico site (404), and On3's feed carries only national stories.
    beatFeeds: [
      { name: "Daily Lobo", feed: "https://www.dailylobo.com/plugin/feeds/section/sports.xml", site: "https://www.dailylobo.com/section/sports", sportsSection: true }
    ]
  },

  series: [
    { match: /^new mexico state( aggies)?$/i, name: "Rio Grande Rivalry", kind: "rivalry" }
  ],

  links: {
    // The Mountain West's availability reports, which Suite cannot read (its
    // viewer answers only a browser): Roster links the page instead
    // (David, 2026-10-30).
    availability: { url: "https://themw.com/sports/2026/8/21/football_reports.aspx", label: "TheMW.com", conference: "Mountain West" },
    roster: { url: "https://golobos.com/sports/football/roster", label: "golobos.com" }
  },

  // New Mexico inside Suite: Cherry (ESPN's), white; ESPN's second colour is silver, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "NEW MEXICO FOOTBALL",

    colors: {
      accent:         "#FFFFFF",
      accentText:     "#FFFFFF",
      accentOnLight:  "#BA0C2F",
      accentInk:      "#BA0C2F",
      accentSoft:     "#FFFFFF",
      accentTint:     "#F3D3DA",
      accentTintSoft: "#F9ECEE",
      focus:          "#FFFFFF",
      surface:        "#BA0C2F",
      surfaceDeep:    "#860922",
      surfaceAbyss:   "#4E0514",
      surfaceRaise:   "#C12444"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for New Mexico, each because a
  // source exists for it.
  snapshots: {
    oddsHistory:  { file: "data/new-mexico/odds-history.json" },
    beatNews:     { file: "data/new-mexico/news.json" },
    recruits:     { file: "data/new-mexico/recruits.json", label: "ESPN recruiting" }
  }
};
