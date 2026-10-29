/* Louisiana - Phase 4b, the Sun Belt, the MAC, Conference USA and UConn
   (David, 2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 309, its home field as
   ESPN's schedule spells it (Our Lady of Lourdes Stadium), and the beat
   feeds below (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "louisiana",
    name:         "Louisiana",
    abbreviation: "UL",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Chicago",

    venue: {
      name: "Our Lady of Lourdes Stadium",
      lat:  30.2016,
      lon: -92.0412
    }
  },

  sources: {
    espn: {
      teamId: "309",
      broadcastFallback: []
    },

    // The Sun Belt publishes no availability reports that HD Intelligence
    // carries or that could be found on sunbeltsports.org (2026-10-29), so
    // none are shown.

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // One source only: On SI has no Louisiana site (404), On3's feed carries
    // only national stories, and no student paper feed was found.
    beatFeeds: [
      { name: "Louisiana Athletics", feed: "https://ragincajuns.com/rss?path=football", site: "https://ragincajuns.com/sports/football", logo: "https://ragincajuns.com/favicon.ico" }
    ]
  },

  series: [
    { match: /^ul monroe( warhawks)?$|^louisiana-monroe( warhawks)?$/i, name: "Battle on the Bayou", kind: "rivalry" }
  ],

  links: {
    roster: { url: "https://ragincajuns.com/sports/football/roster", label: "ragincajuns.com" }
  },

  // Louisiana inside Suite: Vermilion (ESPN's), white; ESPN's second colour is black, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "LOUISIANA FOOTBALL",

    colors: {
      accent:         "#FFFFFF",
      accentText:     "#FFFFFF",
      accentOnLight:  "#CE181E",
      accentInk:      "#CE181E",
      accentSoft:     "#FFFFFF",
      accentTint:     "#F6D5D6",
      accentTintSoft: "#FBEDED",
      focus:          "#FFFFFF",
      surface:        "#CE181E",
      surfaceDeep:    "#941116",
      surfaceAbyss:   "#570A0D",
      surfaceRaise:   "#D32F34"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Louisiana, each because a
  // source exists for it.
  snapshots: {
    beatNews:     { file: "data/louisiana/news.json" },
    recruits:     { file: "data/louisiana/recruits.json", label: "ESPN recruiting" }
  }
};
