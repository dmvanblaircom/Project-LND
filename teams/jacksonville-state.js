/* Jacksonville State - Phase 4b, the Sun Belt, the MAC, Conference USA and
   UConn (David, 2026-10-29). Same shape as teams/indiana.js; nothing else
   changed.

   From GitHub's network on 2026-10-29: ESPN team 55, its home field as
   ESPN's schedule spells it (AmFirst Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "jacksonville-state",
    name:         "Jacksonville State",
    abbreviation: "JXST",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Chicago",

    venue: {
      name: "AmFirst Stadium",
      lat:  33.8213,
      lon: -85.7654
    }
  },

  sources: {
    espn: {
      teamId: "55",
      broadcastFallback: []
    },

    // Conference USA publishes no availability reports that HD Intelligence
    // carries or that could be found on conferenceusa.com (2026-10-29), so
    // none are shown.

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // One source only: On SI has no Jax State site (404), On3's feed carries
    // only national stories, and no student paper feed was found.
    beatFeeds: [
      { name: "Jax State Athletics", feed: "https://jaxstatesports.com/rss?path=football", site: "https://jaxstatesports.com/sports/football", logo: "https://jaxstatesports.com/favicon.ico" }
    ]
  },

  series: [

  ],

  links: {
    // The Conference USA's availability reports, which Suite cannot read (its
    // viewer answers only a browser): Roster links the page instead
    // (David, 2026-10-30).
    availability: { url: "https://conferenceusa.com/sports/2025/8/23/FB_0823254134.aspx", label: "ConferenceUSA.com", conference: "Conference USA" },
    roster: { url: "https://jaxstatesports.com/sports/football/roster", label: "jaxstatesports.com" }
  },

  // Jacksonville State inside Suite: Red (ESPN's), white; ESPN's second colour is black, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "JAX STATE FOOTBALL",

    colors: {
      accent:         "#FFFFFF",
      accentText:     "#FFFFFF",
      accentOnLight:  "#CC0000",
      accentInk:      "#CC0000",
      accentSoft:     "#FFFFFF",
      accentTint:     "#F6D1D1",
      accentTintSoft: "#FBEBEB",
      focus:          "#FFFFFF",
      surface:        "#CC0000",
      surfaceDeep:    "#930000",
      surfaceAbyss:   "#560000",
      surfaceRaise:   "#D11A1A"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Jacksonville State, each because a
  // source exists for it.
  snapshots: {
    beatNews:     { file: "data/jacksonville-state/news.json" },
    recruits:     { file: "data/jacksonville-state/recruits.json", label: "ESPN recruiting" }
  }
};
