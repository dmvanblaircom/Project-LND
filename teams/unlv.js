/* UNLV - Phase 4a, the American, the Mountain West and the Pac-12 (David,
   2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 2439, its home field as
   ESPN's schedule spells it (Allegiant Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "unlv",
    name:         "UNLV",
    abbreviation: "UNLV",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Los_Angeles",

    venue: {
      name: "Allegiant Stadium",
      lat:  36.0909,
      lon: -115.1833
    }
  },

  sources: {
    espn: {
      teamId: "2439",
      broadcastFallback: []
    },

    // The Mountain West publishes no availability reports that HD
    // Intelligence carries or that could be found on themw.com (2026-10-29),
    // so none are shown.

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // One source only: UNLV On SI has published nothing since February, the
    // Free Press's address now leads elsewhere, and On3's feed carries only
    // national stories.
    beatFeeds: [
      { name: "UNLV Athletics", feed: "https://unlvrebels.com/rss?path=football", site: "https://unlvrebels.com/sports/football", logo: "https://unlvrebels.com/favicon.ico" }
    ]
  },

  series: [
    { match: /^nevada( wolf pack)?$/i, name: "Fremont Cannon", kind: "trophy" }
  ],

  links: {
    // The Mountain West's availability reports, which Suite cannot read (its
    // viewer answers only a browser): Roster links the page instead
    // (David, 2026-10-30).
    availability: { url: "https://themw.com/sports/2026/8/21/football_reports.aspx", label: "TheMW.com", conference: "Mountain West" },
    roster: { url: "https://unlvrebels.com/sports/football/roster", label: "unlvrebels.com" }
  },

  // UNLV inside Suite: Scarlet (ESPN's), white; ESPN's second colour is gray, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "UNLV FOOTBALL",

    colors: {
      accent:         "#FFFFFF",
      accentText:     "#FFFFFF",
      accentOnLight:  "#CF0A2C",
      accentInk:      "#CF0A2C",
      accentSoft:     "#FFFFFF",
      accentTint:     "#F6D3D9",
      accentTintSoft: "#FBEBEE",
      focus:          "#FFFFFF",
      surface:        "#CF0A2C",
      surfaceDeep:    "#950720",
      surfaceAbyss:   "#570412",
      surfaceRaise:   "#D42241"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for UNLV, each because a
  // source exists for it.
  snapshots: {
    beatNews:     { file: "data/unlv/news.json" },
    recruits:     { file: "data/unlv/recruits.json", label: "ESPN recruiting" }
  }
};
