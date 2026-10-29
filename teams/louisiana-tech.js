/* Louisiana Tech - Phase 4b, the Sun Belt, the MAC, Conference USA and UConn
   (David, 2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 2348, its home field as
   ESPN's schedule spells it (Joe Aillet Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "louisiana-tech",
    name:         "Louisiana Tech",
    abbreviation: "LT",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Chicago",

    venue: {
      name: "Joe Aillet Stadium",
      lat:  32.5317,
      lon: -92.6524
    }
  },

  sources: {
    espn: {
      teamId: "2348",
      broadcastFallback: []
    },

    // The Sun Belt publishes no availability reports that HD Intelligence
    // carries or that could be found on sunbeltsports.org (2026-10-29), so
    // none are shown.

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // Bleed Tech Blue is On3's fan site for LA Tech (the former Rivals site),
    // read through its own section so On3's national stories stay out
    // (2026-10-29). Not used: On SI has no LA Tech site (404), and no student
    // paper feed was found.
    beatFeeds: [
      { name: "LA Tech Athletics", feed: "https://latechsports.com/rss?path=football", site: "https://latechsports.com/sports/football", logo: "https://latechsports.com/favicon.ico" },
      { name: "Bleed Tech Blue", feed: "https://www.on3.com/sites/bleed-tech-blue/feed/", site: "https://www.on3.com/sites/bleed-tech-blue/", paths: ["/sites/bleed-tech-blue/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" }
    ]
  },

  series: [
    { match: /^southern miss(issippi)?( golden eagles)?$/i, name: "Rivalry in Dixie", kind: "rivalry" },
    { match: /^ul monroe( warhawks)?$/i, name: "I-20 Showdown", kind: "rivalry" }
  ],

  links: {
    roster: { url: "https://latechsports.com/sports/football/roster", label: "latechsports.com" }
  },

  // Louisiana Tech inside Suite: Blue, Red (ESPN's), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "LA TECH FOOTBALL",

    colors: {
      accent:         "#CB333B",
      accentText:     "#DA6C72",
      accentOnLight:  "#CB333B",
      accentInk:      "#FFFFFF",
      accentSoft:     "#E28F93",
      accentTint:     "#F6DADC",
      accentTintSoft: "#FBEFEF",
      focus:          "#FFFFFF",
      surface:        "#003087",
      surfaceDeep:    "#002361",
      surfaceAbyss:   "#001439",
      surfaceRaise:   "#1A4593"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Louisiana Tech, each because a
  // source exists for it.
  snapshots: {
    beatNews:     { file: "data/louisiana-tech/news.json" },
    recruits:     { file: "data/louisiana-tech/recruits.json", label: "ESPN recruiting" }
  }
};
