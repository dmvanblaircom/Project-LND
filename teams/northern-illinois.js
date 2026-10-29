/* Northern Illinois - Phase 4a, the American, the Mountain West and the
   Pac-12 (David, 2026-10-29). Same shape as teams/indiana.js; nothing else
   changed.

   From GitHub's network on 2026-10-29: ESPN team 2459, its home field as
   ESPN's schedule spells it (Huskie Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "northern-illinois",
    name:         "Northern Illinois",
    abbreviation: "NIU",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Chicago",

    venue: {
      name: "Huskie Stadium",
      lat:  41.9338,
      lon: -88.7781
    }
  },

  sources: {
    espn: {
      teamId: "2459",
      broadcastFallback: []
    },

    // The Mountain West publishes no availability reports that HD
    // Intelligence carries or that could be found on themw.com (2026-10-29),
    // so none are shown.

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // Not used: On SI has no NIU site (404), and On3's feed carries only
    // national stories.
    beatFeeds: [
      { name: "NIU Athletics", feed: "https://niuhuskies.com/rss?path=football", site: "https://niuhuskies.com/sports/football", logo: "https://niuhuskies.com/favicon.ico" },
      { name: "Northern Star", feed: "https://northernstar.info/category/sports/football/feed/", site: "https://northernstar.info/category/sports/football/" }
    ]
  },

  series: [

  ],

  links: {
    roster: { url: "https://niuhuskies.com/sports/football/roster", label: "niuhuskies.com" }
  },

  // Northern Illinois inside Suite: Huskie Red (ESPN's), white; ESPN's second colour is black, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "NIU FOOTBALL",

    colors: {
      accent:         "#FFFFFF",
      accentText:     "#FFFFFF",
      accentOnLight:  "#C8102E",
      accentInk:      "#C8102E",
      accentSoft:     "#FFFFFF",
      accentTint:     "#F5D4D9",
      accentTintSoft: "#FBECEE",
      focus:          "#FFFFFF",
      surface:        "#C8102E",
      surfaceDeep:    "#900C21",
      surfaceAbyss:   "#540713",
      surfaceRaise:   "#CE2843"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Northern Illinois, each because a
  // source exists for it.
  snapshots: {
    beatNews:     { file: "data/northern-illinois/news.json" },
    recruits:     { file: "data/northern-illinois/recruits.json", label: "ESPN recruiting" }
  }
};
