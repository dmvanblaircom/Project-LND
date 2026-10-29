/* New Mexico State - Phase 4b, the Sun Belt, the MAC, Conference USA and
   UConn (David, 2026-10-29). Same shape as teams/indiana.js; nothing else
   changed.

   From GitHub's network on 2026-10-29: ESPN team 166, its home field as
   ESPN's schedule spells it (Aggie Memorial Stadium), and the beat feeds
   below (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "new-mexico-state",
    name:         "New Mexico State",
    abbreviation: "NMSU",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Denver",

    venue: {
      name: "Aggie Memorial Stadium",
      lat:  32.2795,
      lon: -106.7414
    }
  },

  sources: {
    espn: {
      teamId: "166",
      broadcastFallback: []
    },

    // Conference USA publishes no availability reports that HD Intelligence
    // carries or that could be found on conferenceusa.com (2026-10-29), so
    // none are shown.

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // One source only: On SI has no NM State site (404), On3's feed carries
    // only national stories, and no student paper feed was found.
    beatFeeds: [
      { name: "NM State Athletics", feed: "https://nmstatesports.com/rss?path=football", site: "https://nmstatesports.com/sports/football", logo: "https://nmstatesports.com/favicon.ico" }
    ]
  },

  series: [
    { match: /^new mexico( lobos)?$/i, name: "Rio Grande Rivalry", kind: "rivalry" },
    { match: /^utep( miners)?$/i, name: "Battle of I-10", kind: "rivalry" }
  ],

  links: {
    roster: { url: "https://nmstatesports.com/sports/football/roster", label: "nmstatesports.com" }
  },

  // New Mexico State inside Suite: Crimson (ESPN's), white; ESPN's second colour is black, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "NM STATE FOOTBALL",

    colors: {
      accent:         "#FFFFFF",
      accentText:     "#FFFFFF",
      accentOnLight:  "#7E141B",
      accentInk:      "#7E141B",
      accentSoft:     "#FFFFFF",
      accentTint:     "#E8D5D6",
      accentTintSoft: "#F5ECED",
      focus:          "#FFFFFF",
      surface:        "#7E141B",
      surfaceDeep:    "#5B0E13",
      surfaceAbyss:   "#35080B",
      surfaceRaise:   "#8B2C32"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for New Mexico State, each because a
  // source exists for it.
  snapshots: {
    beatNews:     { file: "data/new-mexico-state/news.json" },
    recruits:     { file: "data/new-mexico-state/recruits.json", label: "ESPN recruiting" }
  }
};
