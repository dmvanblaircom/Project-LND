/* Arkansas State - Phase 4b, the Sun Belt, the MAC, Conference USA and UConn
   (David, 2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 2032, its home field as
   ESPN's schedule spells it (Centennial Bank Stadium), and the beat feeds
   below (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "arkansas-state",
    name:         "Arkansas State",
    abbreviation: "ARST",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Chicago",

    venue: {
      name: "Centennial Bank Stadium",
      lat:  35.8488,
      lon: -90.6672
    }
  },

  sources: {
    espn: {
      teamId: "2032",
      broadcastFallback: []
    },

    // The Sun Belt publishes no availability reports that HD Intelligence
    // carries or that could be found on sunbeltsports.org (2026-10-29), so
    // none are shown.

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // One source only: On SI has no Arkansas State site (404), On3's feed
    // carries only national stories, and no student paper feed was found.
    beatFeeds: [
      { name: "A-State Athletics", feed: "https://astateredwolves.com/rss?path=football", site: "https://astateredwolves.com/sports/football", logo: "https://astateredwolves.com/favicon.ico" }
    ]
  },

  series: [

  ],

  links: {
    roster: { url: "https://astateredwolves.com/sports/football/roster", label: "astateredwolves.com" }
  },

  // Arkansas State inside Suite: Scarlet (ESPN's), white; ESPN's second colour is black, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "ARKANSAS STATE FOOTBALL",

    colors: {
      accent:         "#FFFFFF",
      accentText:     "#FFFFFF",
      accentOnLight:  "#CC092F",
      accentInk:      "#CC092F",
      accentSoft:     "#FFFFFF",
      accentTint:     "#F6D3DA",
      accentTintSoft: "#FBEBEE",
      focus:          "#FFFFFF",
      surface:        "#CC092F",
      surfaceDeep:    "#930622",
      surfaceAbyss:   "#560414",
      surfaceRaise:   "#D12244"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Arkansas State, each because a
  // source exists for it.
  snapshots: {
    beatNews:     { file: "data/arkansas-state/news.json" },
    recruits:     { file: "data/arkansas-state/recruits.json", label: "ESPN recruiting" }
  }
};
